# LM Studio Admin MCP-Server

Dieses Projekt stellt einen MCP-Server und eine REST-API bereit, um eine lokale LM Studio Instanz (>= 0.3.17) zu verwalten.

## Features (geplant)

- Modelle auflisten / laden / entladen
- LLM-Server-Konfiguration (TTL, Auto-Evict) lesen und schreiben
- Status- und Trainingsinformationen abrufen
- Nutzung der LM Studio HTTP-API, mit optionalem CLI-Fallback (\`lms\`)

## Konfiguration (ENV-Variablen)

- `LMSTUDIO_HTTP_BASE_URL` (Default: `http://127.0.0.1:1234`)
- `LMSTUDIO_HTTP_TIMEOUT_MS` (Default: `10000`)
- `LMSTUDIO_HTTP_API_KEY` (optional, falls LM Studio Auth nutzt)
- `LMSTUDIO_CLI_ENABLED` (`true`/`false`, Default: `false`)
- `LMSTUDIO_CLI_COMMAND` (Default: `lms`)
- `LMSTUDIO_CLI_TIMEOUT_MS` (Default: `15000`)
- `LMSTUDIO_ADMIN_REST_PORT` (Default: `4310`)
- `LMSTUDIO_ADMIN_REST_HOST` (Default: `127.0.0.1`)
- `LMSTUDIO_ADMIN_LOG_LEVEL` (`debug` | `info` | `warn` | `error`, Default: `info`)

## Entwicklung

Installieren der Abhängigkeiten:

```powershell
cd .specify/mcp-servers/lmstudio-admin
npm install
```

Entwicklung mit TypeScript direkt:

```powershell
npm run dev
```

Build & Start (für Produktion/LM Studio):

```powershell
npm run build
npm start
```

Die eigentlichen REST- und MCP-Endpunkte werden schrittweise in `src/` implementiert.

