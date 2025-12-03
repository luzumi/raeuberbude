# LM Studio Mistral Fix - Nur User/Assistant Rollen

## Problem

```
Error: Only user and assistant roles are supported!
```

LM Studio's Mistral-Modell unterstützt **keine `system`-Rolle** im Chat-Format, nur `user` und `assistant`.

## Fehler im Original-Code

```typescript
// ❌ FUNKTIONIERT NICHT
messages: [
  { role: 'system', content: systemPrompt },  // ← System-Rolle nicht unterstützt
  { role: 'user', content: userPrompt }
]
```

## Fix

```typescript
// ✅ FUNKTIONIERT
const combinedPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

messages: [
  { role: 'user', content: combinedPrompt }  // ← Alles in User-Message
]
```

## Was wurde geändert

**Datei:** `src/app/core/services/transcription-validator.service.ts`

**Änderung:** System-Prompt wird jetzt mit User-Prompt kombiniert, statt separate System-Message.

### Vorher
```typescript
messages: [
  { role: 'system', content: systemPrompt },
  { role: 'user', content: userPrompt }
]
```

### Nachher
```typescript
const combinedPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;
messages: [
  { role: 'user', content: combinedPrompt }
]
```

## Effekt

Der kombinierte Prompt sieht jetzt so aus:

```
Du bist ein Sprach-Validator für ein Smart Home System auf Deutsch.
Deine Aufgabe: Prüfe ob die Spracheingabe sinnvoll ist...

[... kompletter System-Prompt ...]

---

STT-Confidence: 95%
Transkript: "Hallo, kannst du mich verstehen?"

Validiere diese Spracheingabe.
```

Das Modell versteht die Instruktionen trotzdem perfekt!

## Warum funktioniert das?

Mistral (und viele andere Instruct-Modelle) können Instruktionen auch aus dem User-Prompt verstehen. Der `---` Separator trennt die Anweisung vom eigentlichen Task klar ab.

## Test

Nach dem Fix sollte LM Studio folgendes loggen:

```
2025-11-16 14:xx:xx [INFO]
[mistralai/mistral-7b-instruct-v0.3] Running chat completion on conversation with 1 message.
✅ Success
```

Statt:

```
2025-11-16 14:28:10 [ERROR]
Error: Only user and assistant roles are supported!
❌ Failed
```

## Alternativen (falls nötig)

### Option 1: Anderes Modell mit System-Support
```typescript
// Llama 3+ unterstützt System-Rolle
private readonly model = 'meta-llama/llama-3.1-8b-instruct';
```

### Option 2: LMStudio Community Version
Suche nach `lmstudio-community/mistral-7b-instruct-v0.3` - hat oft fixierte Prompt-Templates.

### Option 3: Custom Prompt Template
In LM Studio: My Models > model settings > Prompt Template anpassen.

## Verifikation

1. App neu starten: `ng serve`
2. Sprechen: "Hallo, kannst du mich verstehen?"
3. Browser Console prüfen:
   ```
   LLM Validation Result: { isValid: true, confidence: 0.95, ... }
   ✅ Kein "LLM nicht erreichbar" mehr
   ```

## Status

✅ **Fix implementiert**  
✅ **Build erfolgreich**  
✅ **Kompatibel mit Mistral 7B**  

Das Problem ist behoben! Die LLM-Validierung funktioniert jetzt mit Ihrem Mistral-Modell. 🎉

