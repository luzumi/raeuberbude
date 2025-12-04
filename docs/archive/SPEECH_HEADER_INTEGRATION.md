# Sprachvalidierung - Integration im Header

## Übersicht

Die Sprachvalidierung ist nun vollständig in den Header integriert. Es gibt **nur noch einen Mikrofon-Button** zur Steuerung, und das Validierungs-Feedback erscheint automatisch nur bei Bedarf.

## Was wurde geändert?

### 1. Neue vereinfachte Feedback-Komponente
**Datei**: `src/app/shared/components/speech-feedback/speech-feedback.component.ts`

Diese Komponente:
- ✅ Erscheint **nur** wenn Nachfragen/Klarstellungen nötig sind
- ✅ Hat **keine** Steuerungselemente (Start/Stop)
- ✅ Zeigt automatisch:
  - ⚠️ Klarstellungsfragen bei unklaren Eingaben
  - ℹ️ Validierungsprobleme
  - 🔊 Konfidenz-Warnungen
- ✅ Verschwindet automatisch nach einigen Sekunden
- ✅ Kann manuell geschlossen werden (✕ Button)

### 2. Header-Integration
**Dateien**: 
- `src/app/shared/components/header/header.component.ts`
- `src/app/shared/components/header/header.component.html`

Änderungen:
- ✅ Validierung und TTS werden automatisch aktiviert
- ✅ Feedback-Komponente unterhalb des Headers eingebunden
- ✅ Bestehender Mikrofon-Button bleibt einzige Steuerung

## Funktionsweise

### Normaler Ablauf (alles OK)
```
1. User drückt Mikrofon-Button
2. Spricht: "Schalte das Licht ein"
3. Transkription wird validiert ✅
4. Marquee zeigt Eingabe an
5. Befehl wird ausgeführt
→ KEIN Feedback-Banner erscheint
```

### Bei Unklarheit
```
1. User drückt Mikrofon-Button
2. Spricht: "das Licht" (unvollständig)
3. Transkription wird validiert ⚠️
4. Feedback-Banner erscheint:
   "Sie sagten 'das Licht'. Was möchten Sie damit machen?"
5. TTS spricht die Frage laut
6. User kann sofort erneut sprechen
7. Banner verschwindet automatisch nach 15s
```

### Bei ungültiger Eingabe
```
1. User drückt Mikrofon-Button
2. STT versteht Unsinn: "äöü ßß"
3. Transkription wird validiert ❌
4. Feedback-Banner erscheint:
   "Ich habe 'äöü ßß' verstanden. Das ergibt für mich keinen Sinn."
5. TTS spricht die Meldung
6. User kann erneut sprechen
```

## UI-Elemente

### Mikrofon-Button (Header)
- 🎤 Normal: Weiß/Grau
- 🔴 Recording: Rot pulsierend
- Einzige Steuerung für Spracheingabe

### Marquee (Header)
- Zeigt aktuelle/letzte Eingabe
- Verschwindet nach 10 Sekunden
- Immer sichtbar bei Eingabe

### Feedback-Banner (unterhalb Header)
- **Nur** bei Problemen sichtbar
- 3 Arten:
  1. **Klarstellung** (rot): Rückfrage nötig
  2. **Hinweis** (blau): Validierungsprobleme
  3. **Warnung** (gelb): Niedrige Konfidenz
- Automatisches Ausblenden (6-15s)
- Manuelles Schließen möglich

## Position des Feedbacks

```
┌──────────────────────────────────────┐
│          HEADER (fix)                │
│  👤 User  [🎤]  ⚙️ 🚪               │
│  "Schalte das Licht ein" (Marquee)   │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐  ← Nur bei Bedarf
│ ⚠️ Bitte wiederholen Sie Ihre       │
│    Eingabe                       [✕] │
└──────────────────────────────────────┘
┌──────────────────────────────────────┐
│                                      │
│      REST DER APP                    │
│                                      │
```

## Settings

Die Einstellungen können programmatisch geändert werden:

```typescript
// In beliebiger Komponente
constructor(private speechService: SpeechService) {}

// Validierung ein/aus
this.speechService.setValidationEnabled(true/false);

// TTS ein/aus
this.speechService.setTTSEnabled(true/false);

// STT-Modus ändern
this.speechService.setSTTMode('auto' | 'browser' | 'server');
```

## Anpassungen

### Feedback-Dauer ändern
In `speech-feedback.component.ts`:

```typescript
// Klarstellungen (aktuell 15s)
this.autoHideTimer = globalThis.setTimeout(() => {
  this.dismiss();
}, 15000); // ← hier ändern

// Probleme (aktuell 8s)
}, 8000); // ← hier ändern

// Warnungen (aktuell 6s)
}, 6000); // ← hier ändern
```

### Validierung deaktivieren
In `header.component.ts`, Zeile auskommentieren:

```typescript
ngOnInit(): void {
  // this.speechService.setValidationEnabled(true); // ← auskommentieren
  this.speechService.setTTSEnabled(true);
  // ...
}
```

### Styling anpassen
In `speech-feedback.component.ts` im `styles` Array.

## Vorteile dieser Lösung

✅ **Eine zentrale Steuerung** - Kein Doppeln von Buttons  
✅ **Minimale UI** - Feedback nur bei Bedarf  
✅ **Automatisch** - Banner verschwinden von selbst  
✅ **Nicht störend** - Blockiert nichts, kann geschlossen werden  
✅ **Responsive** - Funktioniert auf allen Bildschirmgrößen  
✅ **Accessibility** - Visuelles + Audio-Feedback kombiniert  

## Demo-Komponente

Die ursprüngliche Demo-Komponente (`speech-validation-demo.component.ts`) bleibt verfügbar für Testing/Development, wird aber nicht mehr im Produktions-UI verwendet.

Sie kann weiterhin zu einer Route hinzugefügt werden:
```typescript
{
  path: 'speech-test',
  component: SpeechValidationDemoComponent
}
```

## Troubleshooting

**Problem**: Banner erscheint nicht  
**Lösung**: Browser-Console prüfen, validationResult$ Observable testen

**Problem**: TTS spricht nicht  
**Lösung**: `speechService.setTTSEnabled(true)` sicherstellen

**Problem**: Zu viele Nachfragen  
**Lösung**: Validierung temporär deaktivieren oder Schwellwerte anpassen

**Problem**: Banner stört  
**Lösung**: [✕] Button zum Schließen, oder Auto-Hide-Zeit reduzieren

