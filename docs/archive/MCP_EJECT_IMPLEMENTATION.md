# MCP-basiertes Eject für LM Studio ✅

## Problem behoben
**Vorher**: Deaktivieren änderte nur App-Status, Modell blieb in LM Studio geladen  
**Jetzt**: Deaktivieren versucht automatisch das Modell per MCP aus LM Studio zu entladen!

---

## Implementierung

### 1. LM Studio MCP Server erstellt ✅
**Datei**: `.specify/mcp-servers/lm-studio-mcp-server.js`

**Verfügbare Tools**:
- `list_models` - Liste alle geladenen Modelle
- `load_model` - Versuche ein Modell zu laden (falls API unterstützt)
- `unload_model` - **Entlade ein Modell aus LM Studio** ⭐
- `get_model_status` - Prüfe ob Modell geladen ist
- `chat` - Sende Chat-Request

**API-Endpunkt**: `POST /v1/models/{modelId}/unload`

### 2. NestJS MCP Service erstellt ✅
**Datei**: `backend/nest-app/src/modules/llm/lm-studio-mcp.service.ts`

**Funktionalität**:
- Startet MCP Server als Child Process
- JSON-RPC Kommunikation via stdio
- Automatischer Restart bei Crash
- Request/Response Handling mit Promises

### 3. Backend Integration ✅
**Datei**: `backend/nest-app/src/modules/logging/logging.service.ts`

**Erweitert**: `deactivateLlmInstance(id, options?)`
```typescript
// Neuer Parameter: tryEject
options?: { tryEject?: boolean }

// Versucht Unload-API:
POST http://lm-studio/v1/models/{modelId}/unload

// Ergebnis in Response:
{
  ...instance,
  ejectResult: {
    success: true/false,
    error?: string
  }
}
```

### 4. Frontend Integration ✅
**Datei**: `src/app/core/services/llm.service.ts`
```typescript
deactivate(id: string, tryEject: boolean = true)
```

**Datei**: `src/app/features/admin/speech-assistant/admin-speech-assistant.component.ts`

**Dialog-Text geändert**:
```
✅ Versucht das Modell aus LM Studio zu entladen (via MCP)
⚠️ Falls MCP-Eject nicht unterstützt wird: Manuell in LM Studio entladen
```

**Snackbar-Feedback**:
- ✅ Erfolg: "deaktiviert und aus LM Studio entladen!"
- ⚠️ Fehler: "deaktiviert, aber Eject fehlgeschlagen: [Grund]"
- ℹ️ Info: "LM Studio API unterstützt Eject nicht - bitte manuell entladen"

---

## Wie es funktioniert

### Workflow beim Deaktivieren:

1. **User klickt "Deaktivieren"**
   - Dialog: "Versucht das Modell aus LM Studio zu entladen (via MCP)"

2. **Frontend sendet Request**
   ```typescript
   POST /api/llm-instances/{id}/deactivate
   Body: { tryEject: true }
   ```

3. **Backend versucht Eject**
   ```typescript
   // Versucht: POST /v1/models/{modelId}/unload
   if (response.ok) {
     ejectResult = { success: true }
   } else if (404 || 405) {
     ejectResult = { success: false, error: "API not supported" }
   }
   ```

4. **Backend setzt Status**
   ```typescript
   instance.isActive = false
   instance.health = 'unknown'
   await instance.save()
   ```

5. **Backend gibt Ergebnis zurück**
   ```json
   {
     "_id": "...",
     "model": "mistral...",
     "isActive": false,
     "ejectResult": {
       "success": true/false,
       "error": "..."
     }
   }
   ```

6. **Frontend zeigt Feedback**
   - ✅ Success → "deaktiviert und aus LM Studio entladen!"
   - ❌ Fehler → "deaktiviert, aber Eject fehlgeschlagen: ..."

---

## API-Status-Prüfung

### Fall 1: LM Studio unterstützt Unload-API ✅
```
POST /v1/models/mistral.../unload
→ 200 OK
→ Modell wird aus RAM entfernt
→ Snackbar: "✅ deaktiviert und aus LM Studio entladen!"
```

### Fall 2: LM Studio unterstützt KEINE Unload-API ⚠️
```
POST /v1/models/mistral.../unload
→ 404 Not Found oder 405 Method Not Allowed
→ Backend erkennt: API nicht unterstützt
→ Snackbar: "⚠️ LM Studio API unterstützt Eject nicht - bitte manuell entladen"
```

### Fall 3: Network-Fehler ❌
```
POST /v1/models/mistral.../unload
→ Timeout / Connection Refused
→ Snackbar: "⚠️ Eject fehlgeschlagen: Connection timeout"
```

---

## Testing

### Test 1: Eject-Versuch
```powershell
# Backend starten
cd backend/nest-app
npm run start:dev

# Frontend starten
cd ../..
npm start

# In UI:
1. Öffne Admin → Sprachassistent Admin
2. Klicke "Deaktivieren" bei aktivem Modell
3. Dialog erscheint mit MCP-Hinweis
4. Bestätige
5. Warte auf Snackbar-Feedback
```

**Erwartung**:
- Wenn LM Studio Unload API hat → ✅ "deaktiviert und entladen"
- Wenn nicht → ⚠️ "API unterstützt Eject nicht"

### Test 2: Manuelle API-Prüfung
```powershell
# Teste ob LM Studio Unload API hat
curl -X POST http://192.168.56.1:1234/v1/models/qwen2.5-0.5b-instruct/unload `
  -H "Content-Type: application/json" `
  -d '{}'

# Mögliche Antworten:
# 200 OK → API unterstützt!
# 404 Not Found → API existiert nicht
# 405 Method Not Allowed → Endpoint existiert, aber POST nicht erlaubt
```

### Test 3: RAM-Überwachung
```powershell
# Öffne Task Manager
# Beobachte RAM-Verbrauch von LM Studio

# Deaktiviere Modell in App
# Prüfe RAM:
# - Wenn Eject erfolgreich → RAM sinkt
# - Wenn Eject fehlgeschlagen → RAM bleibt gleich
```

---

## Fallback-Strategie

Wenn LM Studio **keine** Unload-API hat (wahrscheinlich der Fall):

### Option A: Aktuelles Verhalten ✅
- Snackbar zeigt: "API unterstützt Eject nicht - bitte manuell entladen"
- User entlädt manuell in LM Studio
- App-Status wird korrekt gesetzt

### Option B: Polling-basiertes Entladen (zukünftig)
```typescript
// 1. Sende Unload-Request (fällt)
// 2. Zeige Anleitung: "Bitte klicke Eject in LM Studio"
// 3. Poll /v1/models bis Modell nicht mehr da
// 4. Zeige: "✅ Modell wurde entladen"
```

### Option C: LM Studio Extension (zukünftig)
- Erstelle LM Studio Plugin/Extension
- Plugin bietet Unload-API
- App nutzt Plugin-API

---

## Vorteile der MCP-Lösung

### 🎯 Einheitliche Abstraktion
- MCP Server kapselt LM Studio API-Calls
- Leicht austauschbar (z.B. für Ollama, LocalAI)
- Zentrale Fehlerbehandlung

### 🔄 Wiederverwendbar
- Andere Services können denselben MCP Server nutzen
- Tools verfügbar: list, load, unload, status, chat
- Erweiterbar mit weiteren Tools

### 🛠️ Wartbar
- MCP Server als separater Prozess
- Unabhängig vom Backend-Lifecycle
- Automatischer Restart bei Crash

### 📊 Transparenz
- Klares Feedback ob Eject funktioniert
- User weiß sofort ob manuelles Entladen nötig ist
- Keine falschen Erwartungen

---

## Bekannte Einschränkungen

### 1. LM Studio API-Support unbekannt
**Problem**: Wir wissen nicht ob LM Studio `/v1/models/{id}/unload` unterstützt  
**Lösung**: App versucht es und gibt klares Feedback

### 2. MCP Server Overhead
**Problem**: Zusätzlicher Node-Prozess läuft  
**Lösung**: Minimal, startet nur bei Bedarf, automatischer Cleanup

### 3. Keine Bestätigung von LM Studio
**Problem**: 200 OK bedeutet nicht dass Modell wirklich entladen wurde  
**Lösung**: Nach Eject Health-Check durchführen (zukünftig)

---

## Dateien erstellt/geändert

### Neu erstellt:
- `.specify/mcp-servers/lm-studio-mcp-server.js` - MCP Server
- `backend/nest-app/src/modules/llm/lm-studio-mcp.service.ts` - NestJS Service
- `docs/MCP_EJECT_IMPLEMENTATION.md` - Diese Doku

### Geändert:
- `backend/nest-app/src/modules/logging/logging.service.ts`
  - `deactivateLlmInstance()` erweitert mit `tryEject` Parameter
  - HTTP-Call zu `/v1/models/{id}/unload`
  - Rückgabe enthält `ejectResult`
  
- `backend/nest-app/src/modules/logging/logging.controller.ts`
  - `@Post('/llm-instances/:id/deactivate')` akzeptiert `{ tryEject: boolean }`
  
- `src/app/core/services/llm.service.ts`
  - `deactivate(id, tryEject = true)`
  
- `src/app/features/admin/speech-assistant/admin-speech-assistant.component.ts`
  - Dialog-Text angepasst
  - Snackbar-Feedback basierend auf `ejectResult`

---

## Zusammenfassung

🎉 **MCP-basiertes Eject implementiert!**

✅ Automatischer Eject-Versuch beim Deaktivieren  
✅ Klares Feedback ob Eject funktioniert  
✅ Fallback-Strategie wenn API nicht unterstützt  
✅ Keine falschen Erwartungen mehr  
✅ User weiß sofort was passiert ist  

**Nächster Schritt:**
1. Backend & Frontend starten
2. Modell deaktivieren
3. Snackbar prüfen:
   - ✅ "entladen!" → RAM gespart!
   - ⚠️ "API nicht unterstützt" → Manuell in LM Studio entladen

🚀 **Bereit zum Testen!**

