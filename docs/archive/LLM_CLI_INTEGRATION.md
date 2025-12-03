# LM Studio CLI Integration für Load/Eject

## Übersicht

Der MCP Server nutzt die **LM Studio CLI** (`lms`) um Modelle zu laden und zu entladen.

## 🚀 Quick Start (wenn CLI bereits funktioniert)

Wenn `lms load mistralai/mistral-7b-instruct-v0.3` in deinem Terminal funktioniert:

1. **Backend neu starten**:
   ```bash
   cd backend/nest-app
   npm start
   ```

2. **Frontend öffnen**:
   - Admin → Sprachassistent → Modelle & Env
   - Wähle Instanz: `mistralai/mistral-7b-instruct-v0.3`
   - Klicke **Load** oder **Eject**

3. **Logs prüfen**:
   ```
   [LmStudioMcpService] Starting LM Studio MCP Server...
   [LoggingService] Successfully loaded model ... via MCP
   ```

4. **In LM Studio prüfen**: Modell sollte tatsächlich geladen/entladen sein!

---

## Voraussetzungen

### 1. LM Studio CLI aktivieren

1. Öffne **LM Studio**
2. Gehe zu **Settings** → **Developer**
3. Aktiviere **"Enable CLI"`**
4. Installiere CLI falls noch nicht geschehen

### 2. PATH überprüfen

Die `lms` Command muss im PATH verfügbar sein:

```bash
# Windows PowerShell / Git Bash
lms --version

# Sollte anzeigen: lms version x.x.x
```

**Test mit echtem Modell:**
```bash
lms load mistralai/mistral-7b-instruct-v0.3

# Erwartete Ausgabe:
# Loading model "mistralai/mistral-7b-instruct-v0.3"...
# Model loaded successfully in 5.24s. (4.37 GB)
# To use the model in the API/SDK, use the identifier "mistralai/mistral-7b-instruct-v0.3".
```

✅ **Verifiziert**: CLI funktioniert in Git Bash und PowerShell!

**Falls nicht gefunden:**
1. LM Studio öffnen → Settings → Developer
2. "Install CLI to PATH" klicken
3. Terminal neu starten

### 3. Installation im Projekt

```bash
cd .specify/mcp-servers
npm install node-fetch
```

## Konfiguration

### .mcp.json

```json
{
  "mcpServers": {
    "lmStudio": {
      "command": "node",
      "args": [".specify/mcp-servers/lm-studio-mcp-server.js"],
      "cwd": ".",
      "env": {
        "LM_STUDIO_URL": "http://192.168.56.1:1234"
      }
    }
  }
}
```

## MCP Server Tools

Der MCP Server bietet folgende Tools:

### 1. list_models
Liste aller geladenen Modelle

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "list_models",
    "arguments": {}
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [{
      "type": "text",
      "text": "[{\"id\":\"mistralai/mistral-7b-instruct-v0.3\",\"object\":\"model\",\"owned_by\":\"organization-owner\"}]"
    }]
  }
}
```

### 2. load_model
Lädt ein Modell via LM Studio CLI

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "load_model",
    "arguments": {
      "modelId": "mistralai/mistral-7b-instruct-v0.3"
    }
  }
}
```

**Response (Erfolg):**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"success\":true,\"message\":\"Model mistralai/mistral-7b-instruct-v0.3 loaded successfully\",\"command\":\"lms load \\\"mistralai/mistral-7b-instruct-v0.3\\\"\"}"
    }]
  }
}
```

**Response (CLI nicht gefunden):**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"success\":false,\"error\":\"LM Studio CLI (lms) not found. Please ensure:\\n1. LM Studio is installed\\n2. lms command is in PATH\\n3. Or load model manually in LM Studio UI\",\"command\":\"lms load \\\"mistralai/mistral-7b-instruct-v0.3\\\"\"}"
    }]
  }
}
```

### 3. unload_model
Entlädt ein Modell via LM Studio CLI

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "unload_model",
    "arguments": {
      "modelId": "mistralai/mistral-7b-instruct-v0.3"
    }
  }
}
```

**Response (Erfolg):**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [{
      "type": "text",
      "text": "{\"success\":true,\"message\":\"Model mistralai/mistral-7b-instruct-v0.3 unloaded successfully\",\"command\":\"lms unload \\\"mistralai/mistral-7b-instruct-v0.3\\\"\"}"
    }]
  }
}
```

## Testing

### 1. Manueller Test

```bash
# Test list_models
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"list_models","arguments":{}}}' | node .specify/mcp-servers/lm-studio-mcp-server.js

# Test load_model
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"load_model","arguments":{"modelId":"mistralai/mistral-7b-instruct-v0.3"}}}' | node .specify/mcp-servers/lm-studio-mcp-server.js

# Test unload_model
echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"unload_model","arguments":{"modelId":"mistralai/mistral-7b-instruct-v0.3"}}}' | node .specify/mcp-servers/lm-studio-mcp-server.js
```

### 2. Backend Integration Test

1. Backend starten: `cd backend/nest-app && npm start`
2. Frontend starten: `npm start`
3. Admin → Sprachassistent → Modelle & Env
4. Load/Eject Buttons testen

**Erwartete Logs:**
```
[LmStudioMcpService] Starting LM Studio MCP Server: ../../.specify/mcp-servers/lm-studio-mcp-server.js
[LmStudioMcpService] LM Studio MCP Server started
[LoggingService] Attempting to load model mistralai/mistral-7b-instruct-v0.3 via MCP...
[LoggingService] Successfully loaded model mistralai/mistral-7b-instruct-v0.3 via MCP
```

## Troubleshooting

### Problem: "lms command not found"

**Lösung:**
1. LM Studio öffnen
2. Settings → Developer → "Enable CLI"
3. "Install CLI to PATH" klicken
4. Terminal/Backend neu starten

**Alternativ: Manueller PATH**
```powershell
# Windows - LM Studio CLI Path hinzufügen
$env:PATH += ";C:\Users\<USERNAME>\AppData\Local\Programs\LMStudio\resources\cli"
```

### Problem: "Failed to execute lms load"

**Mögliche Ursachen:**
1. Modell-ID ist falsch
   - Prüfe korrekte ID mit: `lms ls`
   - Format: `publisher/model-name`
2. Modell nicht heruntergeladen
   - Lade Modell in LM Studio UI herunter
3. LM Studio läuft nicht
   - Starte LM Studio

### Problem: "Model loaded but not showing in UI"

**Lösung:**
1. Warte 5-10 Sekunden (Load dauert)
2. Prüfe LM Studio UI
3. Backend-Health-Check läuft nach Load

### Problem: MCP Server crashed

**Logs prüfen:**
```
[LmStudioMcpService] MCP Server exited with code 1
```

**Lösung:**
1. Prüfe ob `node-fetch` installiert ist: `cd .specify/mcp-servers && npm install`
2. Prüfe Pfad: `.specify/mcp-servers/lm-studio-mcp-server.js` existiert
3. Teste manuell: `node .specify/mcp-servers/lm-studio-mcp-server.js`

## LM Studio CLI Befehle

Nützliche Commands:

```bash
# Liste aller Modelle
lms ls

# Modell laden
lms load publisher/model-name

# Modell entladen
lms unload publisher/model-name

# Status
lms status

# Hilfe
lms --help
```

## Implementierungsdetails

### CLI Execution Flow

1. Backend ruft `mcpService.loadModel(modelId)` auf
2. MCP Service sendet JSON-RPC Request an MCP Server
3. MCP Server führt Shell-Command aus: `lms load "modelId"`
4. Shell-Output wird parsed
5. Ergebnis zurück an Backend
6. Backend markiert Instanz als aktiv/inaktiv
7. Frontend zeigt Erfolgsmeldung

### Timeouts

- **Load**: 60 Sekunden (große Modelle brauchen Zeit)
- **Unload**: 30 Sekunden
- **MCP Request**: 30 Sekunden (im Service)

### Error Handling

Der MCP Server gibt strukturierte Fehler zurück:

```typescript
{
  success: false,
  error: "Readable error message",
  command: "lms load \"model-id\"" // Für Debugging
}
```

Backend zeigt diese im UI an:
- ✅ Erfolg: "✅ {model} geladen!"
- ⚠️ CLI fehlt: "⚠️ LM Studio CLI nicht gefunden..."
- ❌ Fehler: "❌ Fehler: {error}"

## Best Practices

1. **PATH-Setup überprüfen** vor erstem Test
2. **Backend neu starten** nach MCP Server Änderungen
3. **LM Studio laufen lassen** während Tests
4. **Logs monitoren** bei Problemen
5. **Modell-IDs prüfen** mit `lms ls` bei Fehlern

## Next Steps

- [ ] LM Studio CLI aktivieren und testen
- [ ] Backend neu starten mit neuem MCP Server
- [ ] Load/Eject im Frontend testen
- [ ] Bei Erfolg: Mehrere Modelle testen
- [ ] Dokumentieren welche Modelle funktionieren

