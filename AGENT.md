# Räuberbude Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-11-06

## Active Technologies
- Angular 20
- WebSocket (Home Assistant API)
- MongoDB (Users + HomeAssistant Data)
- Node.js (Backend with NestJS)
- TypeScript / JavaScript

## Project Structure

```
.
├── .angular
├── .husky
├── .idea
├── .specify
│   ├── memory
│   ├── scripts
│   └── templates
│       ├── agent-file-template.md
│       ├── checklist-template.md
│       ├── plan-template.md
│       ├── spec-template.md
│       ├── specification.md
│       └── tasks-template.md
├── .vscode
├── .windsurf
├── backend
├── dist
├── node_modules
├── public
├── server
├── src
│   └── [app, components, services, etc.]
├── AGENT.md
├── angular.json
├── docker-compose.yml
├── karma.conf.cjs
├── kreis_animation.png
├── package.json
├── package-lock.json
├── proxy.conf.cjs
├── roles.md
└── .editorconfig
```

## Commands
- Spec Kit CLI: `specify init` und `specify check`
- Spezifikation anpassen: `.specify/templates/specification.md` manuell bearbeiten
- Architektur und Rollen dokumentieren: `AGENT.md` und ggf. weitere Dateien im Hauptverzeichnis

## Code Style
- Angular mit TypeScript (TSLint/ESLint aktiviert)
- Modulare Komponentenstruktur nach Angular Best Practices
- Strikte Trennung von Services, Components, Assets
- Commit-/PR-Richtlinien und Test-Coverage (Jest/Angular Testing Library angestrebt >80%)

## Recent Changes
- **Spec Kit init**: Projektstruktur mit Templates, Spezifikation und Agentendefinition angelegt.
- **Feature: MongoDB Integration**: Speicherung von Nutzer- und Gerätedaten vorbereitet.
- **Feature: WebSocket Steuerung**: Grundfunktion zur Licht- und TV-Steuerung angelegt.
- **Migration: HomeAssistant Data Warehouse**: von PostgreSQL/TypeORM auf MongoDB/Mongoose umgestellt (2025-11-06)

## Database Architecture

### MongoDB (Port 27017)
- **Zweck**: User Management, Session-Daten, HomeAssistant Data Warehouse
- **Collections (HA)**: `ha_entities`, `ha_entity_states`, `ha_entity_attributes`, `ha_devices`, `ha_areas`, `ha_persons`, `ha_zones`, `ha_automations`, `ha_media_players`, `ha_services`, `ha_snapshots`

## API Endpoints (NestJS Backend - Port 3001)

### HomeAssistant Import
- `POST /api/homeassistant/import/file` - Import von JSON-Datei
- `POST /api/homeassistant/import/json` - Import von JSON-Daten
- `GET /api/homeassistant/import/snapshots` - Alle Snapshots
- `GET /api/homeassistant/import/snapshots/:id` - Snapshot Details

### HomeAssistant Queries
- `GET /api/homeassistant/entities` - Alle Entitäten
- `GET /api/homeassistant/entities/search?q=` - Suche
- `GET /api/homeassistant/entities/statistics` - Statistiken
- `GET /api/homeassistant/entities/:entityId` - Entität Details
- `GET /api/homeassistant/entities/:entityId/state` - Aktueller Zustand
- `GET /api/homeassistant/entities/:entityId/history` - Historie
- `GET /api/homeassistant/devices` - Alle Geräte
- `GET /api/homeassistant/areas` - Alle Bereiche
- `GET /api/homeassistant/persons` - Alle Personen
- `GET /api/homeassistant/zones` - Alle Zonen
- `GET /api/homeassistant/automations` - Alle Automationen
- `GET /api/homeassistant/services` - Alle Services

## Import von HomeAssistant-Daten

```bash
# Installation der Abhängigkeiten
cd backend/nest-app
npm install

# MongoDB starten
cd backend
docker-compose up -d mongo

# Daten importieren
cd backend/nest-app
npm run import:ha ../../ha_structure_2025-10-30T11-32-32.058Z.json
```

<!-- MANUAL ADDITIONS START -->
<!-- Weitere Entwicklungsprinzipien, technische Richtlinien, Arbeitsabläufe oder Agentenrollen kannst du hier ergänzen. -->
capabilities:
- use_service: youtrack-service
- use_service: home-assistant-service
- use_service: mqtt-service
- use_service: mongodb-database
<!-- MANUAL ADDITIONS END -->
