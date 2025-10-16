# Räuberbude Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-10-16

## Active Technologies
- Angular 20
- WebSocket (Home Assistant API)
- MongoDB
- Node.js (Backend)
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

<!-- MANUAL ADDITIONS START -->
<!-- Weitere Entwicklungsprinzipien, technische Richtlinien, Arbeitsabläufe oder Agentenrollen kannst du hier ergänzen. -->
capabilities:
- use_service: youtrack-service
- use_service: home-assistant-service
- use_service: mqtt-service
<!-- MANUAL ADDITIONS END -->
