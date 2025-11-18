# Intent-Logs API Dokumentation

## Problem behoben! ✅

Der Endpunkt `/api/intent-logs` existierte nicht im Backend und führte zu 404-Fehlern.

## Lösung

### 1. Neues Datenmodell erstellt
**Datei:** `backend/models/IntentLog.js`

```javascript
{
  timestamp: String,
  transcript: String,
  intent: String (indexed),
  summary: String,
  keywords: [String],
  confidence: Number,
  terminalId: String (indexed),
  createdAt: Date (indexed)
}
```

### 2. API-Endpunkte hinzugefügt
**Datei:** `backend/server.js`

| Endpoint | Method | Beschreibung |
|----------|--------|--------------|
| `/api/intent-logs` | POST | Erstellt neuen Intent-Log-Eintrag |
| `/api/intent-logs` | GET | Holt Intent-Logs mit Pagination |
| `/api/intent-logs/stats` | GET | Zeigt Statistiken nach Intent-Typ |

### 3. POST `/api/intent-logs`

**Request Body:**
```json
{
  "timestamp": "2025-11-18T10:00:00.000Z",
  "transcript": "wie spät",
  "intent": "general_question",
  "summary": "Frage nach der Uhrzeit",
  "keywords": ["uhrzeit"],
  "confidence": 0.95,
  "terminalId": "terminal-123"
}
```

**Response:** `201 Created`
```json
{
  "_id": "...",
  "timestamp": "2025-11-18T10:00:00.000Z",
  "transcript": "wie spät",
  "intent": "general_question",
  "summary": "Frage nach der Uhrzeit",
  "keywords": ["uhrzeit"],
  "confidence": 0.95,
  "terminalId": "terminal-123",
  "createdAt": "2025-11-18T10:00:05.123Z"
}
```

### 4. GET `/api/intent-logs`

**Query Parameters:**
- `page` (default: 1)
- `limit` (default: 50)
- `intent` (filter by intent type)
- `terminalId` (filter by terminal)
- `startDate` (ISO date)
- `endDate` (ISO date)

**Example:**
```
GET /api/intent-logs?intent=general_question&page=1&limit=20
```

**Response:** `200 OK`
```json
{
  "intentLogs": [...],
  "pagination": {
    "total": 123,
    "page": 1,
    "limit": 20,
    "pages": 7
  }
}
```

### 5. GET `/api/intent-logs/stats`

**Response:** `200 OK`
```json
[
  {
    "_id": "general_question",
    "count": 45,
    "avgConfidence": 0.92
  },
  {
    "_id": "light_control",
    "count": 30,
    "avgConfidence": 0.88
  }
]
```

## Proxy-Konfiguration

Die Proxy-Config leitet `/api/intent-logs` automatisch an den Backend-Server weiter:

```javascript
'/api/intent-logs': {
  target: 'http://localhost:3000',
  secure: false,
  changeOrigin: true,
  logLevel: 'debug'
}
```

## Server-Architektur

```
Browser → http://localhost:4200/api/intent-logs
           ↓ (Angular Proxy)
          http://localhost:3000/api/intent-logs
           ↓ (Backend Express)
          MongoDB → IntentLog Collection
```

## Frontend-Integration

Der `IntentActionService` sendet automatisch Logs:

```typescript
// src/app/core/services/intent-action.service.ts
await this.http.post('/api/intent-logs', logEntry).toPromise();
```

## Testen

### Via Browser (über Proxy):
```
http://localhost:4200/api/intent-logs
```

### Via PowerShell (direkt):
```powershell
# GET
Invoke-RestMethod -Uri "http://localhost:3000/api/intent-logs"

# POST
$body = @{
  timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ")
  transcript = "Test"
  intent = "test"
  summary = "Test Intent"
  keywords = @("test")
  confidence = 0.95
  terminalId = "test"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/intent-logs" `
  -Method POST `
  -Body $body `
  -ContentType "application/json"
```

## Fehlerbehebung

### 404 Not Found
- **Ursache:** Backend-Server läuft nicht
- **Lösung:** `npm --prefix backend start`

### Cannot GET /api/intent-logs
- **Ursache:** Alte Server-Version läuft noch
- **Lösung:** Server neu starten (Prozess beenden und neu starten)

### CORS-Fehler
- **Ursache:** Direkter Zugriff statt über Proxy
- **Lösung:** Nutze `http://localhost:4200/api/intent-logs` statt `http://localhost:3000/api/intent-logs`

## Dateien geändert/erstellt

1. ✅ `backend/models/IntentLog.js` - Neu erstellt
2. ✅ `backend/server.js` - Intent-Logs Endpunkte hinzugefügt
3. ✅ `proxy.conf.cjs` - Bereits korrekt konfiguriert

## Nächste Schritte

Die Intent-Logs werden jetzt automatisch in MongoDB gespeichert und können für Analysen genutzt werden:
- Häufigste Intents
- Confidence-Scores
- Zeitliche Muster
- Terminal-spezifische Nutzung

