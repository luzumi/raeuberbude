# LLM-Validierung mit Mistral über LM Studio

## Übersicht

Die Sprachvalidierung nutzt jetzt ein **lokales Mistral 7B Instruct Modell** über LM Studio statt Code-Heuristiken. Das LLM versteht natürliche Sprache deutlich besser und erkennt Sinn und Kontext zuverlässiger.

**NEU:** Die LLM-Integration läuft jetzt über das **Backend** (NestJS) statt direkt vom Frontend. Dies bietet:
- ✅ Keine CORS-Probleme
- ✅ Server-seitige Secrets (LLM URL kann privat bleiben)
- ✅ Zentrales Logging und Monitoring
- ✅ Timeout- und Retry-Logik
- ✅ Konsistente Error-Handling

## Architektur

```
┌─────────────┐                  ┌─────────────┐                  ┌─────────────┐
│   Angular   │ HTTP POST        │   NestJS    │ HTTP POST        │ LM Studio   │
│  Frontend   │───────────────>│   Backend   │───────────────>│   (Local)   │
│             │ /api/speech/     │             │ :1234/v1/chat/   │             │
│             │ validate-intent  │ LlmService  │ completions      │ Mistral 7B  │
└─────────────┘                  └─────────────┘                  └─────────────┘
       │                                │                                │
       │                                │ ┌────────────────┐            │
       │                                └─│   MongoDB      │            │
       │                                  │ (HumanInput +  │            │
       │                                  │  LLM Metadata) │            │
       └──────────────────────────────────└────────────────┘────────────┘
                     Ergebnis zurück + Intent-Daten gespeichert
```

## Setup

### Voraussetzungen

1. **LM Studio** installiert und gestartet
2. **Mistral 7B Instruct v0.3** Modell geladen
3. **Local Server** aktiv auf `http://127.0.0.1:1234` (oder konfigurierbar)

### LM Studio Konfiguration

1. LM Studio öffnen
2. Modell laden: `mistralai/mistral-7b-instruct-v0.3`
3. Local Server starten (Port 1234)
4. API-Endpoint prüfen: `http://127.0.0.1:1234/v1/chat/completions`

### Backend-Konfiguration (.env)

```bash
# LLM Service Configuration
LLM_ENABLED=true
LLM_URL=http://127.0.0.1:1234/v1/chat/completions
LLM_MODEL=mistralai/mistral-7b-instruct-v0.3
LLM_TIMEOUT_MS=10000

# STT Configuration (existing)
STT_PRIMARY=whisper
STT_SECONDARY=vosk
STT_LANG=de-DE
STT_ENABLED=true
```

## API Endpoints

### 1. POST `/api/speech/validate-intent`

Validiert ein Transkript und erkennt die Benutzerabsicht (Intent).

**Request:**
```json
{
  "transcript": "Schalte das Licht im Wohnzimmer aus",
  "confidence": 0.92,
  "userId": "optional-user-id",
  "location": "/dashboard"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "isValid": true,
    "confidence": 0.95,
    "hasAmbiguity": false,
    "clarificationNeeded": false,
    "intent": {
      "intent": "home_assistant_command",
      "summary": "Licht ausschalten im Wohnzimmer",
      "keywords": ["licht", "wohnzimmer", "aus"],
      "homeAssistant": {
        "action": "turn_off",
        "entityType": "light",
        "location": "wohnzimmer"
      }
    }
  }
}
```

**Response (Validation Failed):**
```json
{
  "success": false,
  "error": "validation_failed",
  "message": "LM Studio not available"
}
```

### 2. GET `/api/speech/llm/status`

Prüft ob LM Studio erreichbar ist.

**Response:**
```json
{
  "success": true,
  "data": {
    "available": true,
    "url": "http://127.0.0.1:1234/v1/chat/completions",
    "model": "mistralai/mistral-7b-instruct-v0.3"
  }
}
```

## Funktionsweise

### Validierungs-Flow (NEU: via Backend)

```
1. User spricht → STT transkribiert (Vosk/Whisper)
   ↓
2. Frontend: Transkript + STT-Confidence → Backend POST /api/speech/validate-intent
   ↓
3. Backend: LlmService ruft LM Studio auf
   ↓
4. LM Studio analysiert auf Deutsch:
   - Ist es ein sinnvoller Satz?
   - Ist es ein gültiger Befehl?
   - Ist es eine Begrüßung?
   - Ist es unklar/mehrdeutig?
   ↓
5. LM Studio antwortet mit JSON:
   {
     "isValid": true/false,
     "confidence": 0.0-1.0,
     "hasAmbiguity": true/false,
     "clarificationNeeded": true/false,
     "clarificationQuestion": "...",
     "intent": { ... }
   }
   ↓
6. Backend: Speichert Ergebnis + Metadaten in MongoDB (HumanInput collection)
   ↓
7. Backend: Gibt ValidationResult an Frontend zurück
   ↓
8. Frontend: Nutzt Ergebnis für UI/TTS/Intent-Ausführung
```

### Backend LLM Service

Der neue `LlmService` (`backend/nest-app/src/modules/llm/llm.service.ts`) übernimmt:

- **LLM-Aufrufe**: Zentrale Verwaltung der LM Studio API-Calls
- **Timeout-Handling**: Configurable timeout (default 10s)
- **Fallback-Logik**: Bei LLM-Ausfall akzeptiert mit reduzierter Confidence
- **Error-Handling**: Unterscheidet zwischen Timeout, Connection Error, JSON Parse Error
- **Health-Check**: Prüft ob LM Studio erreichbar ist

**Code-Beispiel:**
```typescript
// Backend: LlmService
async validateIntent(dto: ValidateIntentDto): Promise<ValidationResult> {
  if (!this.llmEnabled) {
    return this.fallbackValidation(dto.transcript, dto.confidence);
  }
  
  try {
    const result = await this.callLLMForValidation(
      dto.transcript, 
      dto.confidence,
      { location: dto.location, userId: dto.userId }
    );
    return result;
  } catch (error) {
    // Fallback bei Fehler
    return this.fallbackValidation(dto.transcript, dto.confidence);
  }
}
```

### Frontend Integration

Das Frontend (`src/app/core/services/transcription-validator.service.ts`) ruft jetzt das Backend auf:

```typescript
// Frontend: TranscriptionValidatorService
private async validateWithBackend(
  transcript: string,
  originalConfidence: number
): Promise<ValidationResult> {
  const response = await lastValueFrom(
    this.http.post<any>('/api/speech/validate-intent', {
      transcript,
      confidence: originalConfidence,
      location: globalThis.location?.pathname,
    })
  );
  
  if (!response.success) {
    throw new Error(response.message || 'Backend validation failed');
  }
  
  return response.data;
}
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

## MongoDB Persistenz

Alle validierten Transkripte werden mit LLM-Metadaten in MongoDB gespeichert:

**HumanInput Collection Schema:**
```typescript
{
  userId: ObjectId,
  terminalId: ObjectId?,
  inputText: string,
  inputType: 'speech' | 'text' | 'gesture',
  status: 'pending' | 'processing' | 'processed' | 'failed',
  context: {
    confidence: number,
    device: string,
    browser: string,
    sessionId: string,
    location: string
  },
  metadata: {
    // STT Metadata
    provider: 'vosk' | 'whisper' | 'web-speech',
    language: 'de-DE',
    audioDurationMs: number,
    transcriptionDurationMs: number,
    sttMode: 'browser' | 'server',
    
    // LLM Validation Metadata (NEU)
    llmValidated: boolean,
    llmProvider: 'lm-studio',
    llmModel: 'mistralai/mistral-7b-instruct-v0.3',
    llmUrl: string,
    llmConfidence: number,
    llmDurationMs: number,
    intent: {
      type: 'home_assistant_command' | 'navigation' | 'web_search' | ...,
      summary: string,
      keywords: string[],
      homeAssistant: { action, entityType, location },
      navigation: { target },
      webSearch: { query, searchType }
    }
  },
  createdAt: Date,
  updatedAt: Date
}
```

**Beispiel-Dokument:**
```json
{
  "_id": "67a1b2c3d4e5f6g7h8i9j0k1",
  "userId": "60a1b2c3d4e5f6g7h8i9j0k1",
  "inputText": "Schalte das Licht im Wohnzimmer aus",
  "inputType": "speech",
  "status": "processed",
  "context": {
    "confidence": 0.92,
    "sessionId": "sess_1234567890",
    "location": "/dashboard"
  },
  "metadata": {
    "provider": "whisper",
    "language": "de-DE",
    "audioDurationMs": 2340,
    "transcriptionDurationMs": 450,
    "llmValidated": true,
    "llmModel": "mistralai/mistral-7b-instruct-v0.3",
    "llmConfidence": 0.95,
    "llmDurationMs": 320,
    "intent": {
      "type": "home_assistant_command",
      "summary": "Licht ausschalten im Wohnzimmer",
      "keywords": ["licht", "wohnzimmer", "aus"],
      "homeAssistant": {
        "action": "turn_off",
        "entityType": "light",
        "location": "wohnzimmer"
      }
    }
  },
  "createdAt": "2025-01-27T12:30:00.000Z",
  "updatedAt": "2025-01-27T12:30:01.000Z"
}
```

## Vorteile der Backend-Integration

### ✅ Sicherheit & Architektur
- **Keine CORS-Probleme**: Backend → LM Studio ist same-origin
- **Server-seitige Secrets**: LLM URL nicht im Frontend-Code sichtbar
- **Zentrale Konfiguration**: Alle LLM-Settings in Backend .env

### ✅ Monitoring & Logging
- **Strukturiertes Logging**: NestJS Logger für alle LLM-Calls
- **Performance-Tracking**: Timings in MongoDB gespeichert
- **Error-Analytics**: Zentrale Fehlerbehandlung im Backend

### ✅ Bessere Wartbarkeit
- **DRY-Prinzip**: Ein Service für alle LLM-Calls (Frontend + andere Module)
- **Testbarkeit**: Backend-Service isoliert testbar
- **Versionierung**: API-Versionierung möglich

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

