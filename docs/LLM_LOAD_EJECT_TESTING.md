# LLM Load/Eject Testing Guide

## Quick Start

### 1. Backend starten

```bash
cd backend/nest-app
npm start
```

Der MCP Server wird automatisch gestartet und sollte folgende Logs zeigen:
```
[LmStudioMcpService] Starting LM Studio MCP Server: .specify/mcp-servers/lm-studio-mcp-server.js
[LmStudioMcpService] LM Studio MCP Server started
```

### 2. Frontend starten

```bash
npm start
```

Öffne Browser: `http://localhost:4200`

### 3. Admin Panel öffnen

1. Navigiere zu **Admin → Sprachassistent**
2. Tab **Modelle & Env**

### 4. Load Test

1. Wähle eine LLM-Instanz die **nicht geladen** ist (Status: "Nicht geladen 🔴")
2. Klicke auf **Load** Button
3. Backend sollte MCP Request senden:
   ```
   [LoggingService] Attempting to load model {model} via MCP...
   [LmStudioMcpService] (MCP Server logs)
   [LoggingService] Successfully loaded model {model} via MCP
   ```
4. UI sollte zeigen:
   - ✅ "✅ {model} geladen!" (wenn erfolgreich)
   - ⚠️ "⚠️ {model} als aktiv markiert (LM Studio load API nicht verfügbar...)" (wenn API nicht unterstützt)
5. Status ändert sich zu: "Geladen ✅"

### 5. Eject Test

1. Wähle eine LLM-Instanz die **geladen** ist (Status: "Geladen ✅")
2. Klicke auf **Eject** Button
3. Bestätige Dialog
4. Backend sollte MCP Request senden:
   ```
   [LoggingService] Attempting to eject model {model} via MCP...
   [LmStudioMcpService] (MCP Server logs)
   [LoggingService] Successfully ejected model {model} via MCP
   ```
5. UI sollte zeigen:
   - ✅ "✅ {model} aus LM Studio entladen!" (wenn erfolgreich)
   - ⚠️ "⚠️ {model} als inaktiv markiert, aber Eject fehlgeschlagen..." (wenn API nicht unterstützt)
6. Status ändert sich zu: "Nicht geladen 🔴"

## Erwartete Logs

### Backend Console

**Load erfolgreich**:
```
[LoggingService] Attempting to load model mistral-7b via MCP...
[LmStudioMcpService] Starting LM Studio MCP Server...
[LoggingService] Successfully loaded model mistral-7b via MCP
[LoggingService] Loaded instance: mistral-7b (health: healthy)
```

**Load fehlgeschlagen (API nicht unterstützt)**:
```
[LoggingService] Attempting to load model mistral-7b via MCP...
[LoggingService] MCP load failed for mistral-7b: LM Studio does not support load API
[LoggingService] Loaded instance: mistral-7b (health: healthy)
```

**Eject erfolgreich**:
```
[LoggingService] Attempting to eject model mistral-7b via MCP...
[LmStudioMcpService] Unload model result for mistral-7b: {success: true}
[LoggingService] Successfully ejected model mistral-7b via MCP
[LoggingService] Ejected instance: mistral-7b via MCP
```

### Frontend Console

```
Loaded LLM instances: 3
Models from instance LM Studio: ['mistral-7b', 'llama-2-7b']
Unique models: ['llama-2-7b', 'mistral-7b']
```

## MCP Server Debugging

### Manuell starten (für Debugging)

```bash
cd .specify/mcp-servers
node lm-studio-mcp-server.js
```

Der Server läuft im stdio-Modus und erwartet JSON-RPC auf stdin.

### Test Load via JSON-RPC

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"load_model","arguments":{"modelId":"mistral-7b"}}}' | node lm-studio-mcp-server.js
```

### Test Unload via JSON-RPC

```bash
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"unload_model","arguments":{"modelId":"mistral-7b"}}}' | node lm-studio-mcp-server.js
```

## Troubleshooting

### Problem: "MCP Server exited with code 1"

**Ursache**: MCP Server konnte nicht gestartet werden

**Häufigste Ursachen**:

**1. Path Problem: "Cannot find module"**
```
Error: Cannot find module 'C:\Users\...\backend\nest-app\.specify\mcp-servers\lm-studio-mcp-server.js'
```
**Lösung**: Der MCP Server muss im Projekt-Root liegen, nicht in `backend/nest-app`:
- Prüfe: `.specify/mcp-servers/lm-studio-mcp-server.js` existiert im **Projekt-Root**
- Der Pfad im Code ist: `../../.specify/mcp-servers/lm-studio-mcp-server.js` (relativ zu `backend/nest-app`)

**2. Dependencies fehlen**
```bash
cd .specify/mcp-servers
npm install
```

**3. Node.js nicht installiert**
```bash
node --version  # sollte v18+ sein
```

### Problem: "Failed to load model via MCP"

**Ursache**: LM Studio nicht erreichbar oder Modell-ID falsch

**Lösung**:
1. Prüfe ob LM Studio läuft: `http://192.168.56.1:1234`
2. Prüfe Modell-ID in der Instanz-Karte
3. Prüfe LM_STUDIO_URL in `.env`: `LM_STUDIO_URL=http://192.168.56.1:1234`

### Problem: "LM Studio does not support load API"

**Ursache**: LM Studio Version unterstützt keine Load/Unload APIs

**Lösung**:
1. Lade Modell **manuell** in LM Studio UI
2. Klicke dann auf "Load" in der App (markiert als aktiv)
3. Oder: Update LM Studio auf neuere Version

### Problem: Model bleibt auf "Nicht geladen" nach Load

**Ursache**: Load war erfolgreich, aber Health-Check schlägt fehl

**Lösung**:
1. Prüfe ob Modell in LM Studio UI tatsächlich geladen ist
2. Klicke auf "Test" Button um Verbindung zu prüfen
3. Prüfe URL der Instanz (muss `/v1/chat/completions` enthalten)

## Network Inspector (Chrome DevTools)

### Load Request

**Request**:
```
POST http://localhost:3001/api/llm-instances/{id}/load
Content-Type: application/json
Body: {}
```

**Response (Success)**:
```json
{
  "_id": "...",
  "name": "LM Studio",
  "model": "mistral-7b",
  "isActive": true,
  "health": "healthy",
  "loadResult": {
    "success": true,
    "message": "Model loaded successfully via MCP",
    "data": {...}
  }
}
```

**Response (API nicht unterstützt)**:
```json
{
  "_id": "...",
  "model": "mistral-7b",
  "isActive": true,
  "health": "healthy",
  "loadResult": {
    "success": false,
    "error": "LM Studio does not support load API"
  }
}
```

### Eject Request

**Request**:
```
POST http://localhost:3001/api/llm-instances/{id}/eject
Content-Type: application/json
Body: {}
```

**Response**:
```json
{
  "_id": "...",
  "model": "mistral-7b",
  "isActive": false,
  "health": "unknown",
  "ejectResult": {
    "success": true,
    "message": "Model ejected successfully via MCP"
  }
}
```

## Next Steps

Nach erfolgreichem Test:
- [ ] Teste mit verschiedenen Modellen
- [ ] Teste Load/Eject mehrmals hintereinander
- [ ] Teste mit mehreren Instanzen parallel
- [ ] Prüfe ob Modell tatsächlich in LM Studio geladen/entladen wird
- [ ] Teste Fallback-Szenario (LM Studio gestoppt während Load/Eject)

## Performance Notes

- Load/Eject dauert je nach Modell-Größe 5-30 Sekunden
- MCP Server hat 30 Sekunden Timeout
- Health-Check hat 5 Sekunden Timeout
- Bei Timeout: Model wird trotzdem als aktiv/inaktiv markiert

