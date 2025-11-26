# Fix: LM-Studio Sampling-Einstellungen werden nicht gespeichert UND nicht angewendet

**Datum:** 2025-11-24  
**Problem:** Sampling-Einstellungen (topK, topP, repeatPenalty, etc.) werden beim Speichern nicht übernommen und verschwinden nach Refresh. **UPDATE:** Auch nach Schema-Fix werden die Parameter nicht an LM Studio gesendet.

## Ursache 1: MongoDB Schema (✅ BEHOBEN)

Das Mongoose Schema für `LlmInstance.config` definierte nur 3 Felder:
- `temperature`
- `maxTokens`  
- `timeoutMs`

Alle anderen Felder wurden beim Speichern ignoriert, da MongoDB/Mongoose nur explizit im Schema definierte Felder speichert.

## Ursache 2: LLM-Request sendet Parameter nicht (✅ BEHOBEN)

**Kernproblem:** Die erweiterten Sampling-Parameter werden zwar in MongoDB gespeichert, aber **nicht an LM Studio gesendet** wenn ein LLM-Request gemacht wird!

**Detail-Problem:** Die Parameter wurden nur gesendet wenn `!== undefined`, aber wenn die Felder `null` oder fehlten, wurden sie übersprungen.

Aktueller LLM-Request (z.B. in `llm_benchmark.js`):
```javascript
fetch(url, {
  body: JSON.stringify({
    model: CONFIG.model,
    messages: [...],
    temperature: CONFIG.temperature,     // ← NUR DIESE 2 PARAMETER!
    max_tokens: CONFIG.maxTokens,        // ← NUR DIESE 2 PARAMETER!
    stream: false
  })
})
```

**Fehlende Parameter** die an LM Studio gesendet werden müssen:
- `top_k` (topK)
- `top_p` (topP)
- `repeat_penalty` (repeatPenalty)
- `min_p` (minPSampling)
- Weitere LM-Studio spezifische Parameter

## Lösung

### 1. Backend Schema erweitert
**Datei:** `backend/nest-app/src/modules/logging/schemas/llminstance.schema.ts`

Alle LM-Studio spezifischen Felder wurden zum Schema hinzugefügt:

```typescript
config: {
  temperature: { type: Number, default: 0.3 },
  maxTokens: { type: Number, default: 500 },
  timeoutMs: { type: Number, default: 30000 },
  targetLatencyMs: { type: Number, default: 2000 },
  confidenceShortcut: { type: Number, default: 0.85 },
  useGpu: { type: Boolean, default: true },
  heuristicBypass: { type: Boolean, default: false },
  fallbackModel: { type: String, default: '' },
  // LM-Studio specific sampling fields
  topK: { type: Number },
  topP: { type: Number },
  repeatPenalty: { type: Number },
  minPSampling: { type: Number },
  // LM-Studio specific performance fields
  contextLength: { type: Number },
  evalBatchSize: { type: Number },
  cpuThreads: { type: Number },
  gpuOffload: { type: Boolean },
  keepModelInMemory: { type: Boolean },
  flashAttention: { type: Boolean },
  kCacheQuant: { type: Boolean },
  vCacheQuant: { type: Boolean }
}
```

### 2. Frontend Model erweitert
**Datei:** `src/app/core/models/llm-instance.model.ts`

Das TypeScript Interface wurde um die gleichen Felder erweitert.

### 3. Component-Logik verbessert
**Datei:** `src/app/features/admin/speech-assistant/admin-speech-assistant.component.ts`

- `loadConfig()`: Lädt Sampling-Einstellungen aus globaler Config
- `saveConfig()`: Speichert Sampling-Einstellungen in globale Config
- `selectInstance()`: Lädt Sampling-Einstellungen aus Instanz-Config
- `saveInstanceConfig()`: Speichert Sampling-Einstellungen in Instanz-Config
- `applyInstanceToGlobal()`: Überträgt Sampling-Einstellungen zur globalen Config

### 4. Child-Component verbessert
**Datei:** `src/app/features/admin/speech-assistant/admin-llm-config.component.ts`

`ngOnChanges()` wurde verbessert, um alle Sampling-Felder explizit aus dem Input-Config zu laden.

### 5. LLM-Client-Service erstellt (✅ BEHOBEN)
**Datei:** `backend/nest-app/src/modules/llm/llm-client.service.ts`

Zentraler Service für alle LLM-Requests, der automatisch:
- Die aktive (oder spezifische) LLM-Instanz aus der DB lädt
- Alle Sampling-Parameter aus `instance.config` ausliest
- Die Parameter im korrekten Format an LM Studio sendet
- **WICHTIG:** Sendet Parameter IMMER (mit Defaults), nicht nur wenn gesetzt!

**Gesendete Parameter (IMMER):**
```typescript
{
  temperature: config.temperature ?? 0.3,        // Mit Default!
  max_tokens: config.maxTokens ?? 500,           // Mit Default!
  top_k: config.topK ?? 40,                      // ← IMMER gesendet!
  top_p: config.topP ?? 0.95,                    // ← IMMER gesendet!
  repeat_penalty: config.repeatPenalty ?? 1.1,   // ← IMMER gesendet!
  min_p: config.minPSampling ?? 0.05,            // ← IMMER gesendet!
  // Optional (nur wenn explizit gesetzt):
  n_ctx: config.contextLength,                   // Nur wenn !== undefined
  n_batch: config.evalBatchSize,                 // Nur wenn !== undefined
  n_threads: config.cpuThreads,                  // Nur wenn !== undefined
  n_gpu_layers: config.gpuOffload ? -1 : 0,      // Nur wenn !== undefined
  cache_prompt: config.keepModelInMemory,        // Nur wenn !== undefined
  flash_attn: config.flashAttention              // Nur wenn !== undefined
}
```

**Warum der Fix wichtig ist:**
```typescript
// VORHER (FALSCH):
if (config.topK !== undefined) requestBody.top_k = config.topK;
// Problem: Wenn topK null oder fehlt → NICHTS wird gesendet!

// JETZT (RICHTIG):
requestBody.top_k = config.topK ?? 40;
// Lösung: Parameter wird IMMER gesendet (mit Wert oder Default)!
```

### 6. Test-Endpoint hinzugefügt
**Endpoint:** `POST /api/llm-instances/test-request`

Testet LLM-Requests mit vollen Sampling-Parametern:
```bash
curl -X POST http://localhost:3001/api/llm-instances/test-request \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Schalte das Licht ein"}'
```

### 7. Automatisches Neu-Laden nach Config-Änderung (✅ NEU)

**Problem:** Manche Parameter (z.B. Context Length, CPU Threads) werden nur beim Modell-Laden angewendet.

**Lösung:** Nach dem Speichern der Config wird das Modell automatisch neu geladen:

1. User ändert Sampling-Einstellungen im Admin-UI
2. "Konfiguration speichern" klicken
3. Backend:
   - Speichert Config in DB
   - Wenn Instanz aktiv ist:
     - Eject Model via MCP
     - Warte 1 Sekunde
     - Load Model via MCP (mit neuen Parametern)
4. Frontend zeigt: "✅ Konfiguration gespeichert und Modell neu geladen!"

**Code-Änderungen:**
- `LoggingService.updateInstanceConfig()` - Auto-Reload Logik
- `LoggingController` - `autoReload` Parameter
- `AdminSpeechAssistantComponent.saveInstanceConfig()` - UI Feedback

**Optional deaktivieren:**
```typescript
// autoReload: false senden wenn kein Reload gewünscht
instanceConfig.autoReload = false;
```

## Nach dem Fix

### Backend neu starten
```bash
cd backend/nest-app
npm run build
# Dann den laufenden Backend-Prozess stoppen und neu starten
npm run start:dev
```

### Testen

#### 1. Config-Persistenz testen
1. Admin → Speech Assistant öffnen
2. Eine LLM-Instanz auswählen
3. Sampling-Einstellungen ändern (z.B. Top-K auf 50, Top-P auf 0.92)
4. "Konfiguration speichern" klicken
5. Seite refreshen (F5)
6. Prüfen, dass die Werte erhalten bleiben ✅

#### 2. LM Studio Request testen
1. Terminal öffnen
2. Test-Request senden:
```bash
curl -X POST http://localhost:3001/api/llm-instances/test-request \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Schalte das Licht im Wohnzimmer ein"}'
```
3. Backend-Log prüfen:
```
[LlmClientService] Request parameters: {
  temperature: 0.3,
  max_tokens: 600,
  top_k: 50,        ← MUSS GESETZT SEIN!
  top_p: 0.92,      ← MUSS GESETZT SEIN!
  repeat_penalty: 1.1,
  min_p: 0.05
}
```
4. LM Studio Logs prüfen - sollte die Parameter anzeigen ✅

## Betroffene Dateien

**Backend:**
- `backend/nest-app/src/modules/logging/schemas/llminstance.schema.ts` (Schema erweitert)
- `backend/nest-app/src/modules/llm/llm-client.service.ts` (NEU - zentraler LLM-Client)
- `backend/nest-app/src/modules/logging/logging.service.ts` (testLlmRequest hinzugefügt)
- `backend/nest-app/src/modules/logging/logging.controller.ts` (Test-Endpoint hinzugefügt)
- `backend/nest-app/src/modules/logging/logging.module.ts` (LlmClientService registriert)

**Frontend:**
- `src/app/core/models/llm-instance.model.ts` (Interface erweitert)
- `src/app/features/admin/speech-assistant/admin-speech-assistant.component.ts` (Load/Save-Logik verbessert)
- `src/app/features/admin/speech-assistant/admin-llm-config.component.ts` (ngOnChanges verbessert)

## Datenfluss

1. **Beim Laden einer Instanz:**
   - Backend liefert `instance.config` mit allen Feldern
   - `selectInstance()` lädt die Werte in `this.config`
   - Child-Komponente erhält `config` via `@Input()` und zeigt Werte an

2. **Beim Ändern:**
   - User ändert Werte in der Child-Komponente
   - Child-Komponente emittiert `configChange`
   - Parent-Komponente aktualisiert `this.config`

3. **Beim Speichern:**
   - `saveInstanceConfig()` sendet alle Werte an Backend
   - Backend speichert in MongoDB
   - Instance-Liste wird neu geladen

4. **Nach Refresh:**
   - Seite lädt neu
   - `loadLlmInstances()` holt aktuelle Daten
   - Alle gespeicherten Werte werden korrekt angezeigt

## Validierung

Nach dem Backend-Neustart sollten folgende Tests erfolgreich sein:

### Backend-Tests
✅ Backend kompiliert ohne Fehler (`npm run build`)  
✅ Test-Endpoint antwortet: `POST /api/llm-instances/test-request`  
✅ Backend-Log zeigt Sampling-Parameter im Request  
✅ LM Studio erhält die Parameter (in LM Studio Logs prüfen)

### Frontend-Tests  
✅ Sampling-Einstellungen bleiben nach Speichern erhalten  
✅ Refresh zeigt die korrekten Werte  
✅ MongoDB enthält alle Felder im `config`-Objekt  
✅ Keine TypeScript-Fehler im Frontend  
✅ Keine Fehler im Backend-Log beim Speichern

### End-to-End Test
✅ Config in Admin-UI ändern → Speichern → Test-Request → LM Studio verwendet neue Werte

## Nächste Schritte

### Für normale Sprach-Requests
Die bestehenden LLM-Aufrufe (z.B. in `llm_benchmark.js` oder im Frontend) müssen noch angepasst werden, um den neuen `LlmClientService` zu verwenden.

**TODO:**
1. Frontend: `SpeechService` sollte den Backend-Endpoint nutzen statt direkten LLM-Call
2. Tools: `llm_benchmark.js` könnte den Service nutzen (optional)
3. Alle direkten `fetch` Calls zu LM Studio durch Service-Calls ersetzen

### Migration Guide
Alte Code-Stellen, die LM Studio direkt aufrufen:
```javascript
// ALT - Parameter werden nicht angewendet
fetch(url, {
  body: JSON.stringify({
    model: CONFIG.model,
    messages: [...],
    temperature: 0.3,
    max_tokens: 500
  })
})
```

Sollten ersetzt werden durch:
```javascript
// NEU - Verwendet LlmClientService mit vollen Parametern
POST /api/llm-instances/test-request
{
  "prompt": "...",
  "instanceId": "optional"
}
```

Oder für eigene Services im Backend:
```typescript
// In einem NestJS Service
await this.llmClient.request({
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userInput }
  ]
});
```

