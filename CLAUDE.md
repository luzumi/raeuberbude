# Räuberbude – Projektleitfaden für Claude

Aktualisiert: 2025-11-14

## Active Technologies
- Frontend: Angular 20 (Standalone), Angular Material, SCSS
- Backend: NestJS 10, Mongoose 8, MongoDB 7, Swagger
- Tests: Playwright (E2E), Karma (Unit)
- MCP: Web MCP (Puppeteer, Port 4200 standard), YouTrack MCP (Port 5180)
- Utilities: Express Logging-Server + WebSocket

## Project Structure
```
src/                         # Angular 20 Frontend (Standalone)
backend/
  nest-app/                  # NestJS 10 API (Mongoose/MongoDB)
  docker-compose.yml         # MongoDB, API, STT (Vosk, Whisper), Logs
  .env.example               # Beispiel-ENV für API/DB/STT
server/                      # Logging-Server (Express + WS)
.specify/mcp-servers/        # web-mcp-server.js, youtrack-mcp-server.js
tests/                       # Playwright E2E
proxy.conf.cjs               # Angular Proxy (-> NestJS, Home Assistant)
```

## Commands
- Frontend (Angular): `npm start` (Port 4200, nutzt `proxy.conf.cjs`)
- Tests (Unit): `npm test`
- Tests (E2E): `npm run test:e2e` | UI: `npm run test:e2e:ui`
- Backend API (NestJS): `cd backend/nest-app && npm install && npm run start:dev` (Port 3001)
- Docker-Stack (DB/API/STT/Logs): `cd backend && docker compose up -d`
- Logging-Server lokal: `MONGO_URI=... npm run serve:logs` (Port 3000)
- MCP Web: `npm run mcp:web:local` | Windows headed: `npm run mcp:web:headed:win`
- MCP YouTrack: `npm run mcp:youtrack:local`

## Code Style
- Angular Standalone-Komponenten, `provideHttpClient`, SCSS, Material
- NestJS: DTOs + ValidationPipe, Mongoose-Modelle, klare Controller/Service-Trennung
- E2E-Tests mit Playwright in `tests/`; Reporter HTML/JSON aktiviert

## Recent Changes
- Speech-Modul inkl. Rechte- und Terminalverwaltung (`/api/speech/*`)
- HomeAssistant Import & Query API (`/api/homeassistant/*`)
- Bootstrap-Seeding für Superadmin via ENV (siehe `BootstrapService`)
- Angular Proxy für NestJS/HA, Playwright-Konfiguration aktualisiert

<!-- MANUAL ADDITIONS START -->
## API Übersicht (wichtig für Claude)

- Speech API (`/api/speech`)
  - POST `/input` – Menschliche Eingaben speichern
  - POST `/transcribe` – Audio zu Text (Vosk/Whisper), multipart Feld `audio`
  - GET `/transcribe/status` – STT-Provider-Status
  - Rights: GET/PUT/POST unter `/rights` sowie `/rights/user/:userId/*`
  - Terminals: CRUD unter `/terminals`, Claim/Unclaim + Cookie `rb_terminal_id`

- HomeAssistant API (`/api/homeassistant`)
  - Entities: `/entities`, `/entities/search`, `/entities/:entityId`, `.../state`, `.../history`
  - Import: POST `/import/file` (multipart JSON), POST `/import/json`, GET `/import/snapshots*`

- Users CRUD (`/users`)
  - POST `/register`, POST `/login`, GET/PATCH/DELETE `/:id`

- Health
  - GET `/health` (API-Status)

## Proxy & Ports

- Angular dev (4200) proxied:
  - `/api/speech`, `/users`, `/api/homeassistant` -> NestJS (Standard: 3001)
  - übriges `/api/*` -> Home Assistant
- Override per ENV beim Start von `npm start`:
  - `HA_BASE_URL` oder `HA_HOST`/`HA_PORT`, `NEST_BASE_URL` oder `NEST_HOST`/`NEST_PORT`
- Standard-Ports:
  - Angular 4200
  - NestJS 3001 (dev) | 3002 (Compose `API_PORT`)
  - MongoDB Host 27018 (Compose-Mapping), Container 27017
  - Logs 3000 (Host via Compose auf 3003)
  - Vosk 2700, Whisper 9090

## ENV-Highlights (`backend/.env.example`)

- Mongo: `MONGO_URI` oder `MONGO_HOST/PORT/DB/USER/PASSWORD/AUTH_SOURCE`
- Server: `NEST_PORT`, `CORS_ORIGINS`
- HomeAssistant Import: `HA_IMPORT_ON_START=always|if_empty|never`, optional `HA_IMPORT_FILE`, `HA_IMPORT_FAIL_ON_ERROR`
- STT: `STT_ENABLED`, `STT_PRIMARY=vosk`, `STT_SECONDARY=whisper`, `STT_LANG=de-DE`, `STT_MAX_DURATION_MS`
- Vosk: `VOSK_WS_URL` (ws://localhost:2700)
- Whisper: `WHISPER_URL` (http://localhost:9090/transcribe), `WHISPER_MODEL`, `WHISPER_LANGUAGE`

## MCP & Automatisierung

- Web MCP (`.specify/mcp-servers/web-mcp-server.js`)
  - Start: `npm run mcp:web:local` (Port 4200 standard, bei Konflikt `MCP_PORT=4210` setzen)
  - Endpunkte: `/health`, `/tools`, `/sessions` (navigate/click/type/evaluate/screenshot/logs)
- YouTrack MCP (`.specify/mcp-servers/youtrack-mcp-server.js`)
  - Start: `npm run mcp:youtrack:local` (Port 5180)
  - Auth: ENV `YOUTRACK_SERVER_URL`, `YOUTRACK_API_TOKEN` ODER `.specify/mcp-servers/youtrack.secrets.json`
  - Funktionen: Issues anlegen, Commands, Comments, Attachments

## Testing

- Playwright: BaseURL `http://localhost:4200`, startet Dev-Server automatisch (`npm start`)
- Reporter: HTML (`test-results/playwright-report`), JSON
- Nützliche Skripte: `npm run test:e2e`, `npm run test:e2e:ui`, `npm run test:e2e:headed`, `npm run test:report`

<!-- MANUAL ADDITIONS END -->


<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

# General Guidelines for working with Nx

- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- You have access to the Nx MCP server and its tools, use them to help the user
- When answering questions about the repository, use the `nx_workspace` tool first to gain an understanding of the workspace architecture where applicable.
- When working in individual projects, use the `nx_project_details` mcp tool to analyze and understand the specific project structure and dependencies
- For questions around nx configuration, best practices or if you're unsure, use the `nx_docs` tool to get relevant, up-to-date docs. Always use this instead of assuming things about nx configuration
- If the user needs help with an Nx configuration or project graph error, use the `nx_workspace` tool to get any errors

<!-- nx configuration end-->
