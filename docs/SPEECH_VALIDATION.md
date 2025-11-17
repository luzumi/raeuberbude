# Sprachvalidierung & Feedback System

## Übersicht

Dieses System erweitert die Spracherkennung um intelligente Validierung und interaktives Feedback durch Text-to-Speech (TTS). Es erkennt automatisch unklare oder fehlerhafte Transkriptionen und fragt bei Bedarf nach.

## Features

### 1. **Transkriptionsvalidierung**
- ✅ Lokale heuristische Validierung (schnell, offline)
- ✅ Erkennung von unsinnigen Mustern
- ✅ Prüfung auf Vollständigkeit und Satzstruktur
- ✅ Konfidenz-basierte Bewertung
- 🔄 Optional: Server-basierte KI-Validierung

### 2. **Text-to-Speech (TTS) Feedback**
- 🔊 Automatische Sprachausgabe bei Unklarheiten
- 🔊 Bestätigungsfragen bei niedriger Konfidenz
- 🔊 Fehler- und Erfolgsrückmeldungen
- 🔊 Konfigurierbare Stimme, Geschwindigkeit und Lautstärke

### 3. **Interaktiver Dialog**
- 💬 Stellt automatisch Rückfragen bei Mehrdeutigkeiten
- 💬 Wartet auf Benutzerklarstellung
- 💬 Neustart der Aufnahme nach Rückfrage

## Verwendung

### Service Integration

```typescript
import { SpeechService } from './core/services/speech.service';
import { TtsService } from './core/services/tts.service';

constructor(
  private speechService: SpeechService,
  private ttsService: TtsService
) {}

ngOnInit() {
  // Validierung aktivieren/deaktivieren
  this.speechService.setValidationEnabled(true);
  
  // TTS aktivieren/deaktivieren
  this.speechService.setTTSEnabled(true);
  
  // Auf Validierungsergebnisse reagieren
  this.speechService.validationResult$.subscribe(result => {
    console.log('Validation:', result);
    if (result.clarificationNeeded) {
      console.log('Clarification question:', result.clarificationQuestion);
    }
  });
}

// Aufnahme starten
async startRecording() {
  await this.speechService.startRecording();
}
```

### Demo-Komponente

Eine vollständige Demo-Komponente ist verfügbar:
```typescript
import { SpeechValidationDemoComponent } from './features/terminal/speech-validation-demo.component';
```

Fügen Sie sie zu Ihrer Route hinzu:
```typescript
{
  path: 'speech-demo',
  component: SpeechValidationDemoComponent
}
```

## API

### SpeechService

#### Validierung & TTS Steuerung

```typescript
// Validierung aktivieren/deaktivieren
setValidationEnabled(enabled: boolean): void

// TTS aktivieren/deaktivieren
setTTSEnabled(enabled: boolean): void

// Status abfragen
isValidationEnabled(): boolean
isTTSEnabled(): boolean

// Letztes Validierungsergebnis
getLastValidationResult(): ValidationResult | null

// Klarstellungsstatus
isAwaitingClarification(): boolean
clearClarification(): void

// TTS manuell verwenden
speak(message: string): Promise<void>
cancelSpeech(): void
```

#### Observables

```typescript
// Validierungsergebnisse
validationResult$: Observable<ValidationResult>

// Weiterhin verfügbar:
isRecording$: Observable<boolean>
lastInput$: Observable<string>
transcript$: Observable<SpeechRecognitionResult>
```

### TtsService

```typescript
// Sprechen
speak(text: string, options?: TTSOptions): Promise<void>

// Steuerung
cancel(): void
pause(): void
resume(): void

// Status
isSpeaking$: Observable<boolean>
isAvailable(): boolean

// Spezielle Methoden
askConfirmation(question: string): Promise<void>
speakError(message: string): Promise<void>
speakNotification(message: string): Promise<void>
```

### TranscriptionValidatorService

```typescript
// Lokale Validierung
validateLocally(transcript: string, confidence: number): Promise<ValidationResult>

// Server-Validierung
validateOnServer(request: TranscriptionValidationRequest): Promise<ValidationResult>

// Kombinierte Validierung
validate(
  transcript: string,
  confidence: number,
  useServer?: boolean,
  context?: any
): Promise<ValidationResult>
```

## Validierungskriterien

### Lokale Heuristiken

1. **Längenprüfung**: Mindestlänge von 3 Zeichen
2. **Konfidenzprüfung**: Warnung unter 60%, Ablehnung unter 50%
3. **Wortanzahl**: Mindestens 2 bedeutungsvolle Wörter
4. **Unsinnige Muster**:
   - Nur Umlaute
   - Mehr als 4 gleiche Zeichen hintereinander
   - 8+ Konsonanten ohne Vokale
   - Sehr lange Zahlenfolgen
5. **Satzstruktur**: Prüfung auf Verb und Vollständigkeit

### ValidationResult Interface

```typescript
interface ValidationResult {
  isValid: boolean;              // Ist die Transkription gültig?
  confidence: number;            // Validierungs-Konfidenz (0-1)
  hasAmbiguity: boolean;         // Gibt es Mehrdeutigkeiten?
  suggestions?: string[];        // Verbesserungsvorschläge
  clarificationNeeded?: boolean; // Muss nachgefragt werden?
  clarificationQuestion?: string;// Die Rückfrage
  issues?: string[];            // Gefundene Probleme
}
```

## Beispielszenarien

### Szenario 1: Klare Transkription
```
Eingabe: "Schalte das Licht im Wohnzimmer ein"
Konfidenz: 0.95
→ Validierung: ✅ Gültig
→ Aktion: Direkt ausführen
```

### Szenario 2: Niedrige Konfidenz
```
Eingabe: "Schalte das Licht"
Konfidenz: 0.65
→ Validierung: ⚠️ Mehrdeutig
→ TTS: "Habe ich Sie richtig verstanden: Schalte das Licht?"
→ Wartet auf Bestätigung
```

### Szenario 3: Unsinnige Transkription
```
Eingabe: "äöü ßßß"
Konfidenz: 0.45
→ Validierung: ❌ Ungültig
→ TTS: "Ich habe 'äöü ßßß' verstanden. Das ergibt für mich keinen Sinn. Was möchten Sie tun?"
→ Wartet auf neue Eingabe
```

### Szenario 4: Unvollständiger Satz
```
Eingabe: "das Licht"
Konfidenz: 0.80
→ Validierung: ⚠️ Kein Verb erkannt
→ TTS: "Sie sagten 'das Licht'. Was möchten Sie damit machen?"
→ Wartet auf Klarstellung
```

## Konfiguration

### LocalStorage Einstellungen

```typescript
// Gespeicherte Einstellungen
localStorage.setItem('speech-validation-enabled', 'true');
localStorage.setItem('speech-tts-enabled', 'true');
localStorage.setItem('stt-mode', 'auto'); // 'auto' | 'browser' | 'server'
```

### TTS Optionen

```typescript
interface TTSOptions {
  lang?: string;    // z.B. 'de-DE'
  rate?: number;    // 0.1 bis 10 (Standard: 1.0)
  pitch?: number;   // 0 bis 2 (Standard: 1.0)
  volume?: number;  // 0 bis 1 (Standard: 1.0)
}

// Beispiel: Schnellere Bestätigung
await ttsService.speak('Verstanden', { rate: 1.2 });

// Beispiel: Langsamere Fehlerausgabe
await ttsService.speak('Fehler', { rate: 0.8, pitch: 0.9 });
```

## Browser-Kompatibilität

### Speech Recognition (STT)
- ✅ Chrome/Edge (Web Speech API)
- ✅ Safari (eingeschränkt)
- ❌ Firefox (nicht unterstützt)
- ✅ Server-STT als Fallback

### Speech Synthesis (TTS)
- ✅ Chrome/Edge
- ✅ Safari
- ✅ Firefox
- ✅ Alle modernen Browser

## Best Practices

1. **Validierung immer aktivieren** für kritische Befehle
2. **TTS optional machen** - nicht alle Nutzer möchten Audio-Feedback
3. **Klarstellungen begrenzen** - nach 2-3 Fehlversuchen alternative Eingabemethode anbieten
4. **UI-Feedback kombinieren** - TTS + visuelle Hinweise
5. **Offline-Fallback** - lokale Validierung funktioniert ohne Server

## Erweiterungsmöglichkeiten

### Server-seitige Validierung

Erstellen Sie einen Backend-Endpoint:

```typescript
// backend/src/modules/speech/speech.controller.ts
@Post('validate')
async validateTranscription(@Body() data: TranscriptionValidationRequest) {
  // NLP/AI-basierte Validierung
  // z.B. mit OpenAI, spaCy, oder eigenes Modell
  return {
    isValid: true,
    confidence: 0.9,
    hasAmbiguity: false,
    clarificationNeeded: false
  };
}
```

### Kontextbewusste Validierung

```typescript
// Validierung mit Kontext
await validatorService.validate(
  transcript,
  confidence,
  true, // Server verwenden
  {
    previousInputs: ['Schalte das Licht an'],
    location: '/dashboard/rooms/living-room',
    userId: 'user123'
  }
);
```

## Troubleshooting

### Problem: TTS funktioniert nicht
**Lösung**: Browser-Kompatibilität prüfen, HTTPS verwenden

### Problem: Zu viele Rückfragen
**Lösung**: Konfidenz-Schwellwerte anpassen in `transcription-validator.service.ts`

### Problem: Validierung zu streng
**Lösung**: `minMeaningfulWords` oder andere Heuristiken lockern

### Problem: Sprache wird nicht erkannt
**Lösung**: Spracheinstellung prüfen (`recognition.lang = 'de-DE'`)

## Performance

- **Lokale Validierung**: < 5ms
- **Server-Validierung**: 100-500ms (abhängig vom Modell)
- **TTS Initialisierung**: 50-200ms
- **TTS Sprachdauer**: Text-abhängig

## Datenschutz

- ✅ Lokale Validierung verarbeitet Daten nur im Browser
- ⚠️ Server-Validierung sendet Transkripte an Backend
- ⚠️ Browser-STT sendet Audio an Google/Apple Server
- ✅ TTS funktioniert komplett lokal im Browser

## Support

Bei Fragen oder Problemen:
1. Demo-Komponente testen (`/speech-demo`)
2. Browser-Console auf Fehler prüfen
3. `SpeechService.getLastValidationResult()` inspizieren

## Changelog

### Version 1.0.0 (2025-01-16)
- ✨ Initiale Implementierung
- ✨ Lokale Validierung mit deutschen Heuristiken
- ✨ TTS-Integration
- ✨ Interaktive Rückfragen
- ✨ Demo-Komponente
- 📝 Dokumentation

