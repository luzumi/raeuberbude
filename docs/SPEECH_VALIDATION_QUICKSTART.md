# Schnellstart: Sprachvalidierung Integration

## In bestehende Komponente integrieren

### 1. Services importieren

```typescript
import { SpeechService } from '../../core/services/speech.service';
import { ValidationResult } from '../../core/services/transcription-validator.service';

constructor(private speechService: SpeechService) {}
```

### 2. Validierung aktivieren

```typescript
ngOnInit() {
  // Validierung einschalten
  this.speechService.setValidationEnabled(true);
  this.speechService.setTTSEnabled(true);
  
  // Auf Eingaben reagieren
  this.speechService.lastInput$.subscribe(input => {
    console.log('User said:', input);
    this.handleUserInput(input);
  });
  
  // Auf Validierungsergebnisse reagieren
  this.speechService.validationResult$.subscribe(validation => {
    if (validation.clarificationNeeded) {
      console.log('Needs clarification:', validation.clarificationQuestion);
      // UI entsprechend anpassen
    }
  });
}
```

### 3. Recording starten/stoppen

```typescript
async startListening() {
  try {
    await this.speechService.startRecording();
  } catch (error) {
    console.error('Failed to start recording:', error);
  }
}

async stopListening() {
  await this.speechService.stopRecording();
}
```

### 4. Manuelle Sprachausgabe

```typescript
async provideFeedback(message: string) {
  await this.speechService.speak(message);
}
```

## Beispiel: Terminal-Komponente erweitern

```typescript
// terminal-setup.component.ts

export class TerminalSetupComponent implements OnInit {
  isRecording$ = this.speechService.isRecording$;
  lastInput$ = this.speechService.lastInput$;
  awaitingClarification = false;
  
  constructor(private speechService: SpeechService) {}
  
  ngOnInit() {
    // Validierung aktivieren
    this.speechService.setValidationEnabled(true);
    this.speechService.setTTSEnabled(true);
    
    // Validierungsergebnisse überwachen
    this.speechService.validationResult$.subscribe(result => {
      this.awaitingClarification = result.clarificationNeeded || false;
      
      if (result.isValid) {
        // Eingabe akzeptiert, Befehl ausführen
        this.executeCommand(result);
      }
    });
  }
  
  toggleRecording() {
    if (this.isRecording$.value) {
      this.speechService.stopRecording();
    } else {
      this.speechService.startRecording();
    }
  }
  
  executeCommand(validation: ValidationResult) {
    // Ihr Command-Handler hier
  }
}
```

## HTML Template Beispiel

```html
<div class="speech-control">
  <button 
    (click)="toggleRecording()"
    [class.recording]="isRecording$ | async"
    [class.awaiting]="awaitingClarification">
    <span *ngIf="!(isRecording$ | async)">🎤 Sprechen</span>
    <span *ngIf="isRecording$ | async">⏹️ Stop</span>
  </button>
  
  <div class="last-input" *ngIf="lastInput$ | async as input">
    {{ input }}
  </div>
  
  <div class="clarification-indicator" *ngIf="awaitingClarification">
    ⚠️ Bitte bestätigen oder wiederholen
  </div>
</div>
```

## Settings UI hinzufügen

```html
<div class="speech-settings">
  <label>
    <input type="checkbox" 
           [checked]="speechService.isValidationEnabled()"
           (change)="toggleValidation($event)">
    Sprachvalidierung
  </label>
  
  <label>
    <input type="checkbox" 
           [checked]="speechService.isTTSEnabled()"
           (change)="toggleTTS($event)">
    Sprachausgabe
  </label>
</div>
```

```typescript
toggleValidation(event: Event) {
  const enabled = (event.target as HTMLInputElement).checked;
  this.speechService.setValidationEnabled(enabled);
}

toggleTTS(event: Event) {
  const enabled = (event.target as HTMLInputElement).checked;
  this.speechService.setTTSEnabled(enabled);
}
```

## Erweiterte Nutzung

### Benutzerdefinierte Validierung

```typescript
this.speechService.validationResult$.subscribe(result => {
  if (!result.isValid) {
    // Eigene Logik für ungültige Eingaben
    this.showErrorMessage('Ungültige Eingabe');
  }
  
  if (result.confidence < 0.7) {
    // Zusätzliche Bestätigung anfordern
    this.requestUserConfirmation(result.clarificationQuestion);
  }
});
```

### Kontext-spezifische Rückmeldungen

```typescript
async handleSpeechInput(input: string) {
  const context = this.getCurrentContext(); // z.B. welcher Raum, welches Gerät
  
  if (context === 'lighting') {
    await this.speechService.speak('Lichter werden gesteuert');
  } else if (context === 'media') {
    await this.speechService.speak('Medien werden gesteuert');
  }
}
```

### Fehlerbehandlung

```typescript
try {
  await this.speechService.startRecording();
} catch (error) {
  if (error.message.includes('INSECURE_CONTEXT')) {
    this.showError('Bitte nutzen Sie HTTPS');
  } else if (error.message.includes('MIC_DENIED')) {
    this.showError('Mikrofon-Zugriff erforderlich');
  } else {
    this.showError('Spracherkennung nicht verfügbar');
  }
}
```

## Tipps

1. **Validierung optional machen**: Nicht alle Nutzer benötigen Validierung
2. **TTS-Lautstärke anpassen**: In lauten Umgebungen kann TTS störend sein
3. **Visuelles Feedback kombinieren**: TTS + UI-Hinweise = beste UX
4. **Klarstellungen begrenzen**: Nach 2-3 Versuchen alternative Eingabe anbieten
5. **Kontext berücksichtigen**: In bestimmten Situationen Validierung überspringen

## Performance

- Validierung ist **extrem schnell** (< 5ms lokal)
- TTS hat **keine Performance-Auswirkungen** auf die App
- Nur bei Server-Validierung (optional) entstehen Netzwerk-Delays

## Barrierefreiheit

Diese Features verbessern die Barrierefreiheit erheblich:
- ✅ Blinde Nutzer erhalten Audio-Feedback
- ✅ Bestätigung für unsichere Nutzer
- ✅ Fehlertoleranz bei Sprachproblemen

## Troubleshooting

**Problem**: Validierung meldet zu viele Fehler  
**Lösung**: Schwellwerte in `transcription-validator.service.ts` anpassen

**Problem**: TTS spricht nicht  
**Lösung**: Browser-Kompatibilität prüfen, `speechSynthesis` im Browser-Console testen

**Problem**: Zu viele Rückfragen  
**Lösung**: `enableValidation` temporär auf `false` setzen oder Schwellwerte erhöhen

