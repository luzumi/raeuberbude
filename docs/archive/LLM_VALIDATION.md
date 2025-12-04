# LLM-Validierung mit Mistral über LM Studio

## Übersicht

Die Sprachvalidierung nutzt jetzt ein **lokales Mistral 7B Instruct Modell** über LM Studio statt Code-Heuristiken. Das LLM versteht natürliche Sprache deutlich besser und erkennt Sinn und Kontext zuverlässiger.

## Setup

### Voraussetzungen

1. **LM Studio** installiert und gestartet
2. **Mistral 7B Instruct v0.3** Modell geladen
3. **Local Server** aktiv auf `http://192.168.56.1:1234`

### LM Studio Konfiguration

1. LM Studio öffnen
2. Modell laden: `mistralai/mistral-7b-instruct-v0.3`
3. Local Server starten (Port 1234)
4. API-Endpoint prüfen: `http://192.168.56.1:1234/v1/chat/completions`

## Funktionsweise

### Validierungs-Flow

```
1. User spricht → STT transkribiert
   ↓
2. Transkript + STT-Confidence → LLM
   ↓
3. LLM analysiert auf Deutsch:
   - Ist es ein sinnvoller Satz?
   - Ist es ein gültiger Befehl?
   - Ist es eine Begrüßung?
   - Ist es unklar/mehrdeutig?
   ↓
4. LLM antwortet mit JSON:
   {
     "isValid": true/false,
     "confidence": 0.0-1.0,
     "hasAmbiguity": true/false,
     "clarificationNeeded": true/false,
     "clarificationQuestion": "...",
     "suggestions": [...]
   }
   ↓
5. App nutzt Ergebnis für UI/TTS
```

### LLM Prompt

**System Prompt:**
```
Du bist ein Sprach-Validator für ein Smart Home System auf Deutsch.
Prüfe ob die Spracheingabe sinnvoll ist und ob sie ein gültiger Befehl 
oder eine gültige Aussage auf Deutsch ist.

Antworte NUR mit JSON (keine Erklärungen).

Kriterien:
- isValid=true: klarer deutscher Satz, Begrüßung, sinnvoller Befehl
- isValid=false: Unsinn, Geräusche, fremde Sprache, unverständlich
- clarificationNeeded=true: unklar, mehrdeutig, zu kurz
- confidence: kombiniere STT-Confidence mit deiner Einschätzung
```

**User Prompt:**
```
STT-Confidence: 85%
Transkript: "Hallo und herzlich willkommen"

Validiere diese Spracheingabe.
```

### Beispiel-Antworten

#### Gültige Begrüßung
```json
{
  "isValid": true,
  "confidence": 0.95,
  "hasAmbiguity": false,
  "clarificationNeeded": false,
  "clarificationQuestion": null,
  "suggestions": null
}
```

#### Unklarer Befehl
```json
{
  "isValid": false,
  "confidence": 0.6,
  "hasAmbiguity": true,
  "clarificationNeeded": true,
  "clarificationQuestion": "Was möchten Sie mit dem Licht machen?",
  "suggestions": ["Schalte das Licht ein", "Schalte das Licht aus"]
}
```

#### Unsinnige Eingabe
```json
{
  "isValid": false,
  "confidence": 0.1,
  "hasAmbiguity": false,
  "clarificationNeeded": true,
  "clarificationQuestion": "Ich konnte Sie nicht verstehen. Bitte wiederholen Sie.",
  "suggestions": null
}
```

## Vorteile gegenüber Code-Heuristiken

### ✅ Besseres Sprachverständnis
- Erkennt **Kontext** und **Bedeutung**
- Versteht **natürliche Sprache** (nicht nur Muster)
- Unterscheidet **Begrüßungen**, **Befehle**, **Fragen**

### ✅ Flexibler
- Lernt aus Beispielen im Prompt
- Kein Hardcoding von Regeln nötig
- Anpassbar durch Prompt-Engineering

### ✅ Robuster bei Fehlern
- Toleriert kleine STT-Fehler
- Versteht trotz Tippfehlern/Aussprachevarianten
- Erkennt Sinn auch bei unvollständigen Sätzen

### ✅ Intelligente Rückfragen
- Generiert **sinnvolle, kontextbezogene** Nachfragen
- Schlägt **Korrekturalternativen** vor
- Freundlicher und natürlicher Dialog

## Fallback-Strategie

Bei LLM-Ausfall (LM Studio offline, Netzwerkfehler):
```typescript
// Fallback: Akzeptiere Eingabe mit reduzierter Confidence
return {
  isValid: true,
  confidence: originalConfidence * 0.7,
  hasAmbiguity: true,
  clarificationNeeded: false,
  issues: ['LLM nicht erreichbar']
};
```

**Verhalten:**
- ⚠️ Eingabe wird akzeptiert (nicht blockiert)
- 📉 Confidence reduziert auf 70% des Originals
- ℹ️ Issue-Hinweis: "LLM nicht erreichbar"
- ✅ User kann weiterarbeiten

## API Details

### Request an LM Studio

```http
POST http://192.168.56.1:1234/v1/chat/completions
Content-Type: application/json

{
  "model": "mistralai/mistral-7b-instruct-v0.3",
  "messages": [
    {
      "role": "system",
      "content": "Du bist ein Sprach-Validator..."
    },
    {
      "role": "user",
      "content": "STT-Confidence: 85%\nTranskript: \"...\"\n\nValidiere diese Spracheingabe."
    }
  ],
  "temperature": 0.3,
  "max_tokens": 500,
  "stream": false
}
```

### Response von LM Studio

```json
{
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "{\"isValid\":true,\"confidence\":0.95,...}"
      },
      "finish_reason": "stop"
    }
  ],
  "model": "mistralai/mistral-7b-instruct-v0.3"
}
```

## Performance

### Antwortzeiten
- **LLM Inferenz**: 200-800ms (abhängig von Hardware)
- **Netzwerk**: < 10ms (lokal)
- **Gesamt**: ~300-900ms

### Optimierung
- `temperature: 0.3` → deterministischere Antworten
- `max_tokens: 500` → ausreichend für JSON-Response
- `stream: false` → einfacheres Handling

## Konfiguration

### Service-Einstellungen

```typescript
// transcription-validator.service.ts
private readonly lmStudioUrl = 'http://192.168.56.1:1234/v1/chat/completions';
private readonly model = 'mistralai/mistral-7b-instruct-v0.3';
```

### Anpassungen

**Andere LM Studio Adresse:**
```typescript
private readonly lmStudioUrl = 'http://localhost:1234/v1/chat/completions';
```

**Anderes Modell:**
```typescript
private readonly model = 'mistralai/mistral-large-latest';
// oder
private readonly model = 'meta-llama/llama-3.1-8b-instruct';
```

**Prompt anpassen:**
```typescript
const systemPrompt = `Du bist ein Sprach-Validator...
// Zusätzliche Beispiele:
"Wie spät ist es?" → isValid=true (Frage)
"Wetter morgen" → clarificationNeeded=true, clarificationQuestion="Möchten Sie das Wetter für morgen wissen?"
`;
```

## Testen

### LM Studio Connection prüfen

```bash
# PowerShell
Invoke-RestMethod -Uri "http://192.168.56.1:1234/v1/models" -Method Get
```

Erwartete Antwort:
```json
{
  "data": [
    {
      "id": "mistralai/mistral-7b-instruct-v0.3",
      ...
    }
  ]
}
```

### Test-Request

```bash
# PowerShell
$body = @{
    model = "mistralai/mistral-7b-instruct-v0.3"
    messages = @(
        @{
            role = "user"
            content = "Sage Hallo"
        }
    )
    temperature = 0.3
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://192.168.56.1:1234/v1/chat/completions" -Method Post -Body $body -ContentType "application/json"
```

### Browser Console Test

```javascript
fetch('http://192.168.56.1:1234/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'mistralai/mistral-7b-instruct-v0.3',
    messages: [
      { role: 'user', content: 'Hallo' }
    ],
    temperature: 0.3,
    max_tokens: 100
  })
})
.then(r => r.json())
.then(console.log);
```

## Troubleshooting

### Problem: LM Studio nicht erreichbar

**Symptom:**
```
LLM validation failed, using simple fallback: Error: Http failure response
```

**Lösung:**
1. LM Studio öffnen
2. Local Server starten (grüner Button)
3. Port 1234 prüfen
4. Firewall-Regeln checken

### Problem: Langsame Antworten

**Symptom:** Validierung dauert > 2 Sekunden

**Lösungen:**
- **Kleineres Modell**: `mistral-7b` statt `mistral-large`
- **GPU nutzen**: In LM Studio GPU aktivieren
- **Prompt kürzen**: Weniger Beispiele im System-Prompt
- **max_tokens reduzieren**: auf 200-300

### Problem: JSON Parse Error

**Symptom:**
```
LLM response not JSON: The validation result is...
```

**Ursache:** LLM antwortet mit Text statt JSON

**Lösung:**
- Prompt präzisieren: "Antworte NUR mit JSON, keine Erklärungen"
- `temperature` senken (0.1-0.3)
- Besseres Modell nutzen (Mistral > Llama für strukturierte Ausgaben)

### Problem: Zu viele Rückfragen

**Symptom:** Fast jede Eingabe wird hinterfragt

**Lösung:**
- Prompt anpassen: "Sei großzügig mit isValid=true"
- Confidence-Schwelle erhöhen
- Mehr positive Beispiele im Prompt

## Migration von Heuristik zu LLM

### Alt (Code-Heuristiken)
```typescript
// 500+ Zeilen Code
// Feste Regeln für Deutsch-Erkennung
// Verb-Listen, Muster, Schwellwerte
const germanScore = this.computeGermanScore(words);
const hasVerb = this.hasLikelyVerb(words);
// ...
```

### Neu (LLM)
```typescript
// ~100 Zeilen Code
// Flexibles Sprachverständnis
const llmResult = await this.validateWithLLM(transcript, confidence);
// LLM versteht Kontext und Bedeutung
```

**Reduktion:** ~80% weniger Code, bessere Ergebnisse

## Nächste Schritte (Optional)

### 1. Context-Awareness
```typescript
const userPrompt = `STT-Confidence: 85%
Transkript: "${transcript}"
Vorherige Befehle: ${context?.previousInputs?.join(', ')}
Aktueller Raum: ${context?.location}

Validiere diese Spracheingabe im Kontext.`;
```

### 2. Adaptive Prompts
```typescript
// Bei Begrüßungen toleranter
if (isSessionStart) {
  systemPrompt += '\nAkzeptiere Begrüßungen großzügig.';
}
```

### 3. Feedback-Loop
```typescript
// User korrigiert → Feedback ans LLM
if (userCorrected) {
  await this.sendCorrectionFeedback(originalTranscript, correctedTranscript);
}
```

### 4. Mehrsprachigkeit
```typescript
const systemPrompt = `Erkenne Sprache automatisch.
Unterstützte Sprachen: Deutsch, Englisch, ...`;
```

## Zusammenfassung

✅ **LLM-Integration erfolgreich**
- Mistral 7B via LM Studio
- OpenAI-kompatible API
- Fallback bei Ausfall

✅ **Verbesserte Validierung**
- Versteht natürliche Sprache
- Kontextbezogene Rückfragen
- Flexible Anpassung

✅ **Production-Ready**
- Error-Handling implementiert
- Performance optimiert
- Getestet und dokumentiert

Die App nutzt jetzt KI-gestützte Sprachvalidierung statt Regex-Heuristiken! 🎉

