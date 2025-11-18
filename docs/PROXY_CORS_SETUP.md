# Proxy & CORS Konfiguration

## Problem
Bei der Spracheingabe traten CORS-Fehler auf, weil Requests an verschiedene Hosts gingen:
- `http://localhost:4301` (Angular Dev Server)
- `http://192.168.178.25:4301` (Backend Express)
- `http://localhost:3001` (NestJS)

## Lösung

### 1. Angular Proxy (`proxy.conf.cjs`)
Der Proxy leitet alle `/api/*` Requests an die richtigen Backend-Server weiter:

| Route | Target | Beschreibung |
|-------|--------|--------------|
| `/api/speech` | NestJS (localhost:3001) | Spracheingabe, STT, TTS |
| `/api/homeassistant` | NestJS (localhost:3001) | Home Assistant Queries |
| `/api/transcripts` | Backend Express (localhost:3000) | Transkripte |
| `/api/intent-logs` | Backend Express (localhost:3000) | Intent-Logs |
| `/users` | NestJS (localhost:3001) | User CRUD |
| `/api` | Home Assistant (homeassistant.local:8123) | HA API (catch-all) |

**Wichtig**: Spezifische Routes müssen VOR dem catch-all `/api` stehen!

### 2. Backend CORS (Express)
```javascript
// backend/server.js
import cors from 'cors';

app.use(cors({
  origin: true, // Erlaubt alle Origins in Entwicklung
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

// Handle preflight globally
app.options('*', cors());
```

### 3. NestJS CORS
```typescript
// backend/nest-app/src/main.ts
if (isProd) {
  // Production: nur konfigurierte Origins
  app.enableCors({ origin: origins, credentials: true });
} else {
  // Development: alle Origins erlaubt
  app.enableCors({ origin: true, credentials: true });
}
```

## Server starten

### Lokale Entwicklung
```bash
npm run start:dev
```
Startet:
- Angular Dev Server (localhost:4200) mit Proxy
- Backend Express (192.168.178.25:4301)
- NestJS (localhost:3001)

### Netzwerk-Entwicklung
```bash
npm run start:network
```
Startet zusätzlich:
- Angular auf 0.0.0.0:4200 (für mobile Geräte)
- MCP-Server

## Umgebungsvariablen (optional)

### Proxy-Targets überschreiben
```bash
# NestJS
NEST_HOST=192.168.1.100 NEST_PORT=3001 npm start

# Backend Express
BACKEND_HOST=192.168.1.100 BACKEND_PORT=3000 npm start

# Home Assistant
HA_BASE_URL=http://192.168.1.50:8123 npm start
```

## Troubleshooting

### CORS Error trotz Proxy?
- Prüfe, ob der Request wirklich durch den Proxy geht (sollte an `localhost:4200/api/...`)
- Prüfe Browser Network Tab: Host sollte `localhost:4200` sein
- Prüfe Backend-Logs auf Preflight-Requests (OPTIONS)

### 404 für `/api/...`?
- Prüfe, ob Backend-Server läuft
- Prüfe Proxy-Logs im Terminal
- Prüfe, ob die Route im Backend existiert

### 400 Bad Request?
- Prüfe Request-Body (muss JSON sein)
- Prüfe Header `Content-Type: application/json`
- Prüfe Backend-Validierung (NestJS: ValidationPipe)

### Preflight (OPTIONS) fehlschlägt?
- Backend muss `OPTIONS *` mit 200 beantworten
- CORS-Header müssen gesetzt sein
- Prüfe `Access-Control-Allow-Methods` und `Access-Control-Allow-Headers`

## Best Practices

1. **Entwicklung**: Nutze den Angular-Proxy (kein CORS-Problem)
2. **Produktion**: Nutze reverse Proxy (nginx/traefik) statt CORS
3. **Relative URLs**: Nutze `/api/...` statt absolute URLs wie `http://192.168.x.x:port/api/...`
4. **Environment Files**: Konfiguriere API-Base-URL zentral (leerer String = relativ)
5. **Logging**: `logLevel: 'debug'` im Proxy für Fehlersuche
6. **Port-Konsistenz**: Angular Dev Server = 4200, Backend = 3000, NestJS = 3001

## Wichtige Änderungen

### Services nutzen relative URLs
Alle Services wurden angepasst, um relative URLs zu verwenden:
- `transcription-validator.service.ts`: `backendApiUrl = ''`
- `admin-speech-assistant.component.ts`: `backendUrl = ''`
- Environment files: `backendApiUrl = ''`

Dadurch gehen alle Requests durch den Angular-Proxy und CORS-Probleme werden vermieden.

