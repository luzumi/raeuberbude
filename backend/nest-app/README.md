# Raeuberbude API (NestJS)

Backend-Anwendung für das Raeuberbude-Projekt mit NestJS, TypeORM und PostgreSQL/MariaDB.

---

## Installation

```bash
npm install
```

---

## Entwicklung

```bash
# Development-Modus mit Hot-Reload
npm run start:dev

# Build
npm run build

# Production
npm run start:prod
```

---

## Database Migrations

**⚠️ Wichtig:** Seit LUD28-109 nutzt das Projekt TypeORM Migrations statt `synchronize: true`.

### Migration ausführen
```bash
npm run migration:run
```

### Letzte Migration zurückrollen
```bash
npm run migration:revert
```

### Neue Migration generieren
```bash
npm run migration:generate -- src/migrations/MigrationName
```

### Migration-Status anzeigen
```bash
npm run migration:show
```

### Manuelle Migration erstellen
1. Datei erstellen: `src/migrations/YYYYMMDDHHMMSS-Description.ts`
2. `up()` und `down()` Methoden implementieren
3. Migration ausführen: `npm run migration:run`

---

## Datenbank-Setup

### PostgreSQL (empfohlen für Production)

```bash
# Mit Docker Compose
docker-compose up -d

# Connection String
postgresql://postgres:password@localhost:5432/raeuberbude
```

### Test-Datenbank

```bash
# Test-DB starten
docker-compose -f docker-compose.test.yml up -d

# Migration auf Test-DB
NODE_ENV=test DB_PORT=5433 DB_USERNAME=test DB_PASSWORD=test DB_DATABASE=raeuberbude_test npm run migration:run
```

---

## HomeAssistant Import

```bash
npm run import:ha
```

Importiert Entities, Areas, Devices und Persons aus HomeAssistant in die lokale Datenbank.

---

## Umgebungsvariablen

Erstelle eine `.env` Datei:

```env
# Database
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=password
DB_DATABASE=raeuberbude

# Development
NODE_ENV=development

# Optional: SSL
DATABASE_SSL=false
```

---

## Projekt-Struktur

```
src/
├── config/              # Konfigurationsdateien
│   ├── database.config.ts
│   └── typeorm-cli.config.ts
├── migrations/          # TypeORM Migrations
│   └── XXXXXXXXXX-InitialSchema.ts
├── modules/
│   ├── auth/           # Authentifizierung & User
│   ├── terminals/      # App-Terminals
│   ├── speech-inputs/  # Spracheingaben
│   ├── logging/        # Logging & Transcripts
│   └── homeassistant/  # HomeAssistant Integration
├── main.ts
└── app.module.ts
```

---

## Migrations-Dokumentation

Vollständige Dokumentation zu Migrations findest du hier:
- **Checklist:** `../../docs/migrations/LUD28-109-migrations-checklist.md`
- **Quick Start:** `../../docs/migrations/LUD28-109-quick-start.md`
- **Vollständiger Plan:** `../../docs/migrations/LUD28-109-migrations-plan.md`
- **Constraint-Mapping:** `../../docs/migrations/constraint-mapping.md`

---

## Entwickler-Notizen

### TypeORM Synchronize deaktiviert

⚠️ **Wichtig:** `synchronize: true` ist deaktiviert!

**Warum?**
- Datenverlust-Risiko bei Schema-Änderungen
- Keine Kontrolle über Constraint-Namen
- Produktions-Best-Practice

**Wie erstelle ich Schema-Änderungen?**
1. Entity anpassen
2. Migration generieren: `npm run migration:generate -- src/migrations/AddNewColumn`
3. Migration manuell überprüfen und ggf. anpassen
4. Migration testen: `npm run migration:run` (Test-DB)
5. Rollback testen: `npm run migration:revert`
6. Commit & Deploy

---

## Support & Troubleshooting

### Migration schlägt fehl
```bash
# Prüfe Migration-Status
npm run migration:show

# Rollback zur vorherigen Version
npm run migration:revert

# Logs anzeigen
# (Migrations zeigen SQL-Queries in der Console)
```

### Constraint-Namen zu lang
PostgreSQL hat ein Limit von 63 Zeichen für Identifier. Nutze Abkürzungen:
```
fk_user_allowed_terminals__app_terminals__terminal_id
→ fk_user_allowed_terms__app_terms__term_id
```

### Schema out of sync
```bash
# Schema neu generieren (entwicklung)
npm run migration:generate -- src/migrations/SyncSchema

# Oder: Datenbank neu aufsetzen
docker-compose down -v
docker-compose up -d
npm run migration:run
```

---

## Testing

```bash
# Unit-Tests
npm test

# Integration-Tests mit Test-DB
npm run test:integration
```

---

## Lizenz

MIT

---

**Letzte Aktualisierung:** 2025-12-03  
**Migrations:** LUD28-109 abgeschlossen

