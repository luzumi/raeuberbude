# LUD28-109: TypeORM-Migrations - Dokumentations-Index

**Ticket:** LUD28-109  
**Status:** In Progress  
**Parent:** LUD28-59

---

## Dokumente

### Haupt-Dokumente

| Dokument | Beschreibung | Pfad |
|----------|-------------|------|
| **Migrations-Plan** | Vollständiger 5-Phasen-Implementierungsplan mit allen Details | [`docs/migrations/LUD28-109-migrations-plan.md`](./LUD28-109-migrations-plan.md) |
| **Quick Start** | Schritt-für-Schritt Anleitung zur Implementierung | [`docs/migrations/LUD28-109-quick-start.md`](./LUD28-109-quick-start.md) |
| **Checklist** | Abarbeitbare Checkliste mit Status-Tracking | [`docs/migrations/LUD28-109-migrations-checklist.md`](./LUD28-109-migrations-checklist.md) ⚠️ TODO |
| **Constraint-Mapping** | Mapping von auto-generierten zu konventionellen Namen | [`docs/migrations/constraint-mapping.md`](./constraint-mapping.md) ⚠️ TODO |

### Referenz-Dokumente

| Dokument | Beschreibung | Pfad |
|----------|-------------|------|
| **TypeORM-Mapping** | Entity-Definitionen und Relationen | [`database/DBM-SCHEMA-03-TypeORM-Mapping.md`](../../database/DBM-SCHEMA-03-TypeORM-Mapping.md) |
| **Schlüssel & Constraints** | FK-/Index-Namenskonventionen | [`database/DBM-SCHEMA-02-Schluessel-Indizes-Constraints.md`](../../database/DBM-SCHEMA-02-Schluessel-Indizes-Constraints.md) |
| **ER-Modell** | Relationales Datenmodell | [`database/DBM-SCHEMA-01-Relationales-ER-Modell-und-Normalisierung.md`](../../database/DBM-SCHEMA-01-Relationales-ER-Modell-und-Normalisierung.md) |

---

## Code-Dateien

### Entities (18)

#### Auth-Module
- [`user.entity.ts`](../../backend/nest-app/src/modules/auth/entities/user.entity.ts)
- [`user-rights.entity.ts`](../../backend/nest-app/src/modules/auth/entities/user-rights.entity.ts)
- [`user-allowed-terminal.entity.ts`](../../backend/nest-app/src/modules/auth/entities/user-allowed-terminal.entity.ts)

#### Terminals
- [`app-terminal.entity.ts`](../../backend/nest-app/src/modules/terminals/entities/app-terminal.entity.ts)
- [`terminal-rights.entity.ts`](../../backend/nest-app/src/modules/terminals/entities/terminal-rights.entity.ts)

#### Speech-Inputs
- [`speech-human-input.entity.ts`](../../backend/nest-app/src/modules/speech-inputs/entities/speech-human-input.entity.ts)
- [`speech-test-input.entity.ts`](../../backend/nest-app/src/modules/speech-inputs/entities/speech-test-input.entity.ts)

#### Logging
- [`speech-transcript.entity.ts`](../../backend/nest-app/src/modules/logging/entities/speech-transcript.entity.ts)
- [`intent-log.entity.ts`](../../backend/nest-app/src/modules/logging/entities/intent-log.entity.ts)
- [`event-log.entity.ts`](../../backend/nest-app/src/modules/logging/entities/event-log.entity.ts)
- [`category.entity.ts`](../../backend/nest-app/src/modules/logging/entities/category.entity.ts)

#### HomeAssistant
- [`ha-area.entity.ts`](../../backend/nest-app/src/modules/homeassistant/entities/ha-area.entity.ts)
- [`ha-device.entity.ts`](../../backend/nest-app/src/modules/homeassistant/entities/ha-device.entity.ts)
- [`ha-entity.entity.ts`](../../backend/nest-app/src/modules/homeassistant/entities/ha-entity.entity.ts)
- [`ha-entity-state.entity.ts`](../../backend/nest-app/src/modules/homeassistant/entities/ha-entity-state.entity.ts)
- [`ha-entity-attribute.entity.ts`](../../backend/nest-app/src/modules/homeassistant/entities/ha-entity-attribute.entity.ts)
- [`ha-snapshot.entity.ts`](../../backend/nest-app/src/modules/homeassistant/entities/ha-snapshot.entity.ts)
- [`ha-person.entity.ts`](../../backend/nest-app/src/modules/homeassistant/entities/ha-person.entity.ts)

### Config & Scripts

| Datei | Status | Beschreibung |
|-------|--------|-------------|
| [`typeorm-cli.config.ts`](../../backend/nest-app/src/config/typeorm-cli.config.ts) | ⚠️ TODO | TypeORM CLI DataSource Config |
| [`package.json`](../../backend/nest-app/package.json) | ⚠️ TODO (Update) | Migration-Scripts ergänzen |
| [`database.config.ts`](../../backend/nest-app/src/config/database.config.ts) | ⚠️ TODO (Update) | synchronize: false setzen |

### Migrations

| Datei | Status | Beschreibung |
|-------|--------|-------------|
| `src/migrations/XXXXXXXXXX-InitialSchema.ts` | ⚠️ TODO | Generierte Initial-Migration |

### Test-Infrastruktur

| Datei | Status | Beschreibung |
|-------|--------|-------------|
| [`docker-compose.test.yml`](../../backend/nest-app/docker-compose.test.yml) | ⚠️ TODO | PostgreSQL Test-DB |
| [`test-migrations.sql`](../../backend/nest-app/scripts/test-migrations.sql) | ⚠️ TODO | Smoke-Test SQL |
| [`.env.test`](../../backend/nest-app/.env.test) | ⚠️ TODO | Test-DB Konfiguration |

---

## YouTrack-Links

- **Dieses Ticket:** [LUD28-109](https://luzumi.youtrack.cloud/issue/LUD28-109)
- **Parent:** [LUD28-59](https://luzumi.youtrack.cloud/issue/LUD28-59) - DBM-SCHEMA-03
- **Vorgänger:** [LUD28-108](https://luzumi.youtrack.cloud/issue/LUD28-108) - Entities implementieren
- **Nachfolger:** LUD28-59.5 (Tests & Validierung) - noch nicht angelegt

---

## Namenskonventionen

### Constraint-Namen

| Typ | Pattern | Beispiel |
|-----|---------|----------|
| **Primary Key** | `pk_<table>` | `pk_users` |
| **Foreign Key** | `fk_<from_table>__<to_table>__<column>` | `fk_user_rights__users__user_id` |
| **Unique** | `uq_<table>__<column>` | `uq_users__username` |
| **Index** | `ix_<table>__<column>` | `ix_users__created_at` |

### ON DELETE / ON UPDATE

| Beziehungstyp | ON DELETE | ON UPDATE |
|--------------|-----------|-----------|
| Bewegungs-/Logtabellen → User/Terminal | `SET NULL` | `CASCADE` |
| Stammdaten → abhängige Tabellen | `CASCADE` | `CASCADE` |
| 1:1 Rechte-Tabellen | `CASCADE` | `CASCADE` |
| M:N Join-Tabellen | `CASCADE` | `CASCADE` |

---

## npm-Scripts

Nach Implementierung verfügbar:

```bash
# Migration generieren
npm run migration:generate -- src/migrations/MigrationName

# Migration ausführen
npm run migration:run

# Letzte Migration rückgängig machen
npm run migration:revert

# Status anzeigen
npm run migration:show
```

---

## Zeitplan

| Phase | Aufwand | Status | Beschreibung |
|-------|---------|--------|-------------|
| **Phase 1** | 0.5d | ⏳ Planned | TypeORM CLI Setup |
| **Phase 2** | 0.5d | ⏳ Planned | Migration-Generation |
| **Phase 3** | 0.5d | ⏳ Planned | Constraint-Anpassung |
| **Phase 4** | 0.25d | ⏳ Planned | Testing & Validation |
| **Phase 5** | 0.25d | ⏳ Planned | Dokumentation |
| **GESAMT** | **2d** | | |

---

## Quick Links

- 🚀 **Los geht's:** [Quick Start Guide](./LUD28-109-quick-start.md)
- 📋 **Vollständiger Plan:** [Migrations-Plan](./LUD28-109-migrations-plan.md)
- 📚 **Schema-Dokumentation:** [DBM-SCHEMA-03](../../database/DBM-SCHEMA-03-TypeORM-Mapping.md)
- 🔗 **YouTrack:** [LUD28-109](https://luzumi.youtrack.cloud/issue/LUD28-109)

---

**Erstellt:** 2025-12-03  
**Letztes Update:** 2025-12-03  
**Status:** Ready for Implementation

