# LUD28-109: TypeORM-Migrations erstellen - Implementierungsplan

**Ticket:** LUD28-109 (LUD28-59.4)  
**Status:** In Progress  
**Aufwand:** 2 Tage  
**Parent:** LUD28-59 "DBM-SCHEMA-03 – TypeORM-Entities für Kern-Domänenmodelle"  
**Abhängigkeit:** LUD28-108 (Entities sind implementiert)

---

## Übersicht

Erstelle vollständige TypeORM-Migrations für 18 bereits implementierte Entities mit manueller Constraint-Namen-Anpassung gemäß Namenskonventionen aus DBM-SCHEMA-02.

### Ziele
1. TypeORM CLI Setup und DataSource-Konfiguration
2. Automatische Migration-Generation für alle Entities
3. Manuelle Anpassung der Constraint-Namen gemäß Konvention
4. Testing der up/down Migrations
5. Vollständige Dokumentation und npm-Scripts

---

## Bereits implementierte Entities (18)

### Auth-Module (3)
- `User` - `backend/nest-app/src/modules/auth/entities/user.entity.ts`
- `UserRights` - `backend/nest-app/src/modules/auth/entities/user-rights.entity.ts`
- `UserAllowedTerminal` - `backend/nest-app/src/modules/auth/entities/user-allowed-terminal.entity.ts`

### Terminals (2)
- `AppTerminal` - `backend/nest-app/src/modules/terminals/entities/app-terminal.entity.ts`
- `TerminalRights` - `backend/nest-app/src/modules/terminals/entities/terminal-rights.entity.ts`

### Speech-Inputs (2)
- `SpeechHumanInput` - `backend/nest-app/src/modules/speech-inputs/entities/speech-human-input.entity.ts`
- `SpeechTestInput` - `backend/nest-app/src/modules/speech-inputs/entities/speech-test-input.entity.ts`

### Logging (4)
- `SpeechTranscript` - `backend/nest-app/src/modules/logging/entities/speech-transcript.entity.ts`
- `IntentLog` - `backend/nest-app/src/modules/logging/entities/intent-log.entity.ts`
- `EventLog` - `backend/nest-app/src/modules/logging/entities/event-log.entity.ts`
- `Category` - `backend/nest-app/src/modules/logging/entities/category.entity.ts`

### HomeAssistant (7)
- `HaArea` - `backend/nest-app/src/modules/homeassistant/entities/ha-area.entity.ts`
- `HaDevice` - `backend/nest-app/src/modules/homeassistant/entities/ha-device.entity.ts`
- `HaEntity` - `backend/nest-app/src/modules/homeassistant/entities/ha-entity.entity.ts`
- `HaEntityState` - `backend/nest-app/src/modules/homeassistant/entities/ha-entity-state.entity.ts`
- `HaEntityAttribute` - `backend/nest-app/src/modules/homeassistant/entities/ha-entity-attribute.entity.ts`
- `HaSnapshot` - `backend/nest-app/src/modules/homeassistant/entities/ha-snapshot.entity.ts`
- `HaPerson` - `backend/nest-app/src/modules/homeassistant/entities/ha-person.entity.ts`

---

## Namenskonventionen (DBM-SCHEMA-02)

| Typ | Pattern | Beispiel |
|-----|---------|----------|
| **Primary Key** | `pk_<table>` | `pk_users` |
| **Foreign Key** | `fk_<from_table>__<to_table>__<column>` | `fk_user_rights__users__user_id` |
| **Unique Constraint** | `uq_<table>__<column>` | `uq_users__username` |
| **Index** | `ix_<table>__<column>` | `ix_speech_transcripts__created_at` |

### ON DELETE / ON UPDATE Regeln

| Beziehungstyp | ON DELETE | ON UPDATE |
|--------------|-----------|-----------|
| Bewegungs-/Logtabellen → User/Terminal | `SET NULL` | `CASCADE` |
| Stammdaten → abhängige Tabellen | `CASCADE` | `CASCADE` |
| 1:1 Rechte-Tabellen | `CASCADE` | `CASCADE` |
| M:N Join-Tabellen | `CASCADE` | `CASCADE` |

---

## Implementierungs-Phasen

### Phase 1: Setup (0.5d)

#### 1.1 TypeORM CLI DataSource-Konfiguration erstellen

**Datei:** `backend/nest-app/src/config/typeorm-cli.config.ts`

**Aufgabe:**
- Neue DataSource-Instanz für CLI (getrennt von Runtime-Config)
- Import von bestehender Database-Config
- Explicit entities und migrations Pfade setzen

**Deliverable:**
```typescript
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

// Load .env for CLI
config({ path: '.env' });

const configService = new ConfigService();

export default new DataSource({
  type: 'postgres',
  host: configService.get('DB_HOST', 'localhost'),
  port: configService.get('DB_PORT', 5432),
  username: configService.get('DB_USERNAME', 'postgres'),
  password: configService.get('DB_PASSWORD'),
  database: configService.get('DB_DATABASE', 'raeuberbude'),
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: true,
});
```

#### 1.2 npm-Scripts ergänzen

**Datei:** `backend/nest-app/package.json`

**Neue Scripts:**
```json
{
  "scripts": {
    "typeorm": "typeorm-ts-node-commonjs -d src/config/typeorm-cli.config.ts",
    "migration:generate": "npm run typeorm -- migration:generate",
    "migration:create": "npm run typeorm -- migration:create",
    "migration:run": "npm run typeorm -- migration:run",
    "migration:revert": "npm run typeorm -- migration:revert",
    "migration:show": "npm run typeorm -- migration:show"
  }
}
```

#### 1.3 Migrations-Ordner erstellen

```bash
mkdir -p backend/nest-app/src/migrations
```

**Akzeptanzkriterien Phase 1:**
- ✅ `typeorm-cli.config.ts` existiert und ist lauffähig
- ✅ npm-Scripts funktionieren
- ✅ `src/migrations/` Ordner vorhanden
- ✅ Test: `npm run migration:show` läuft ohne Fehler

---

### Phase 2: Migration-Generation (0.5d)

#### 2.1 Initiale Migration generieren

**Option A: Single Migration (empfohlen für PoC)**
```bash
cd backend/nest-app
npm run migration:generate -- src/migrations/InitialSchema
```

**Option B: Domain-basierte Migrations**
```bash
npm run migration:generate -- src/migrations/AuthModule
npm run migration:generate -- src/migrations/TerminalsModule
npm run migration:generate -- src/migrations/SpeechAndLogging
npm run migration:generate -- src/migrations/HomeAssistantModule
```

#### 2.2 Generierte Dateien prüfen

**Erwartete Struktur:**
```
backend/nest-app/src/migrations/
├── 1733241234567-InitialSchema.ts
```

**Migration-File-Struktur:**
```typescript
import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1733241234567 implements MigrationInterface {
    name = 'InitialSchema1733241234567'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // CREATE TABLE statements
        // ALTER TABLE statements (FK, Constraints)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // DROP TABLE statements
    }
}
```

**Akzeptanzkriterien Phase 2:**
- ✅ Migration-Dateien wurden generiert
- ✅ Alle 18 Entities sind in CREATE TABLE statements enthalten
- ✅ Syntax ist gültig (npm run build schlägt nicht fehl)

---

### Phase 3: Manuelle Constraint-Anpassung (0.5d)

#### 3.1 Primary Keys

**Vor (TypeORM auto-generated):**
```sql
CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
```

**Nach (Konvention):**
```sql
CONSTRAINT "pk_users" PRIMARY KEY ("id")
```

#### 3.2 Foreign Keys

**Vor:**
```sql
CONSTRAINT "FK_4d4f6c8b9e1234567890abcdef" FOREIGN KEY ("user_id") 
  REFERENCES "users"("id") ON DELETE CASCADE
```

**Nach:**
```sql
CONSTRAINT "fk_user_rights__users__user_id" FOREIGN KEY ("user_id") 
  REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
```

#### 3.3 Unique Constraints

**Vor:**
```sql
CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username")
```

**Nach:**
```sql
CONSTRAINT "uq_users__username" UNIQUE ("username")
```

#### 3.4 Indizes

**Vor:**
```sql
CREATE INDEX "IDX_0c83d9eae1c0e5c9e9f5e0a1234" ON "users" ("created_at")
```

**Nach:**
```sql
CREATE INDEX "ix_users__created_at" ON "users" ("created_at")
```

#### 3.5 Constraint-Mapping-Tabelle erstellen

**Dokumentation der Änderungen** in `docs/migrations/constraint-mapping.md`:

| Entity | Constraint-Typ | Original (auto) | Neu (Konvention) |
|--------|----------------|-----------------|-------------------|
| User | PK | PK_a3ffb1c0c84... | pk_users |
| User | UQ (username) | UQ_fe0bb3f6520... | uq_users__username |
| User | UQ (email) | UQ_e12765acb... | uq_users__email |
| User | IX (created_at) | IDX_0c83d9eae... | ix_users__created_at |
| UserRights | PK | PK_... | pk_user_rights |
| UserRights | FK (user_id) | FK_4d4f6c8b9e... | fk_user_rights__users__user_id |
| ... | ... | ... | ... |

**Akzeptanzkriterien Phase 3:**
- ✅ Alle Constraint-Namen folgen der Konvention
- ✅ Mapping-Tabelle dokumentiert alle Änderungen
- ✅ Migration kompiliert ohne Fehler

---

### Phase 4: Testing & Validation (0.25d)

#### 4.1 Test-Datenbank Setup

**Docker Compose für Test-DB:**
```yaml
# backend/nest-app/docker-compose.test.yml
version: '3.8'
services:
  test-db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: raeuberbude_test
      POSTGRES_USER: test
      POSTGRES_PASSWORD: test
    ports:
      - "5433:5432"
    volumes:
      - test-db-data:/var/lib/postgresql/data

volumes:
  test-db-data:
```

**Starten:**
```bash
docker-compose -f docker-compose.test.yml up -d
```

#### 4.2 Migration ausführen (up)

```bash
# .env.test erstellen
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=test
DB_PASSWORD=test
DB_DATABASE=raeuberbude_test

# Migration anwenden
npm run migration:run
```

**Prüfung:**
```sql
-- Verbindung zur Test-DB
psql -h localhost -p 5433 -U test -d raeuberbude_test

-- Tabellen prüfen
\dt

-- Constraints prüfen
SELECT 
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  rel.relname AS table_name
FROM pg_constraint con
JOIN pg_class rel ON con.conrelid = rel.oid
WHERE rel.relname IN ('users', 'user_rights', 'ha_devices', ...)
ORDER BY rel.relname, con.contype;

-- Erwartung: Constraint-Namen folgen Konvention
```

#### 4.3 Rollback testen (down)

```bash
npm run migration:revert
```

**Prüfung:**
```sql
-- Alle Tabellen sollten gelöscht sein
\dt
-- Erwartung: Keine Tabellen (außer migrations)
```

#### 4.4 Erneut hochfahren

```bash
npm run migration:run
```

**Prüfung:**
- Alle Tabellen existieren wieder
- Constraints sind identisch

#### 4.5 Smoke-Test: Daten einfügen

**Test-Script:** `backend/nest-app/scripts/test-migrations.sql`

```sql
-- User anlegen
INSERT INTO users (id, username, email, password_hash)
VALUES (gen_random_uuid(), 'testuser', 'test@example.com', 'hash123');

-- UserRights anlegen (FK-Test)
INSERT INTO user_rights (user_id, role, status)
SELECT id, 'regular', 'active' FROM users WHERE username = 'testuser';

-- HaArea anlegen
INSERT INTO ha_areas (id, area_id, name)
VALUES (gen_random_uuid(), 'living_room', 'Living Room');

-- HaDevice anlegen (FK-Test)
INSERT INTO ha_devices (id, device_id, name, area_id)
SELECT gen_random_uuid(), 'device_1', 'Test Device', area_id
FROM ha_areas WHERE name = 'Living Room';

-- Prüfen: ON DELETE CASCADE
DELETE FROM users WHERE username = 'testuser';
-- user_rights sollte auch gelöscht sein

-- Prüfen: ON DELETE SET NULL
DELETE FROM ha_areas WHERE name = 'Living Room';
SELECT * FROM ha_devices WHERE name = 'Test Device';
-- area_id sollte NULL sein
```

**Akzeptanzkriterien Phase 4:**
- ✅ Migration run erfolgreich
- ✅ Alle Tabellen erstellt, Constraints korrekt benannt
- ✅ Rollback funktioniert vollständig
- ✅ FK-Constraints funktionieren (CASCADE, SET NULL)
- ✅ Smoke-Test erfolgreich

---

### Phase 5: Dokumentation (0.25d)

#### 5.1 Migrations-Checklist erstellen

**Datei:** `docs/migrations/LUD28-109-migrations-checklist.md`

**Inhalt:**
```markdown
# LUD28-109 Migrations Checklist

## ✅ Setup
- [x] TypeORM CLI DataSource Config erstellt
- [x] npm-Scripts ergänzt
- [x] migrations/ Ordner angelegt

## ✅ Generation
- [x] Initiale Migration generiert
- [x] Alle 18 Entities enthalten

## ✅ Constraint-Anpassungen
- [x] Primary Keys: pk_<table>
- [x] Foreign Keys: fk_<from>__<to>__<column>
- [x] Unique Constraints: uq_<table>__<column>
- [x] Indizes: ix_<table>__<column>
- [x] Mapping-Tabelle dokumentiert

## ✅ Testing
- [x] Migration up erfolgreich
- [x] Migration down erfolgreich
- [x] FK-Constraints getestet
- [x] ON DELETE/UPDATE Verhalten geprüft

## ⚠️ Known Issues
- TypeORM generiert automatisch hash-basierte Namen → manuelle Anpassung nötig
- JSONB vs JSON: PostgreSQL nutzt JSONB, MariaDB JSON
- UUID-Generation: PostgreSQL `gen_random_uuid()`, MariaDB `UUID()`

## 🚀 Deployment
### Development
\`\`\`bash
npm run migration:run
\`\`\`

### Production
\`\`\`bash
NODE_ENV=production npm run migration:run
\`\`\`

### Rollback (Notfall)
\`\`\`bash
npm run migration:revert
\`\`\`
```

#### 5.2 README aktualisieren

**Datei:** `backend/nest-app/README.md`

**Neue Sektion:**
```markdown
## Database Migrations

### Run migrations
\`\`\`bash
npm run migration:run
\`\`\`

### Revert last migration
\`\`\`bash
npm run migration:revert
\`\`\`

### Generate new migration
\`\`\`bash
npm run migration:generate -- src/migrations/MigrationName
\`\`\`

### Show migration status
\`\`\`bash
npm run migration:show
\`\`\`

### Manual migration
1. Create file: \`src/migrations/YYYYMMDDHHMMSS-Description.ts\`
2. Implement \`up()\` and \`down()\` methods
3. Run: \`npm run migration:run\`

See: [Migrations Checklist](../../docs/migrations/LUD28-109-migrations-checklist.md)
```

#### 5.3 Config: synchronize deaktivieren

**Datei:** `backend/nest-app/src/config/database.config.ts`

**Änderung:**
```typescript
// VOR
synchronize: process.env['NODE_ENV'] === 'development',

// NACH (mit Kommentar)
// ⚠️ synchronize deaktiviert - nutze Migrations!
// Siehe: docs/migrations/LUD28-109-migrations-checklist.md
synchronize: false,
```

**Akzeptanzkriterien Phase 5:**
- ✅ Checklist-Dokument vollständig
- ✅ README aktualisiert
- ✅ synchronize deaktiviert und dokumentiert
- ✅ Constraint-Mapping-Tabelle vorhanden

---

## Deliverables

### Dateien

1. **Config & Scripts**
   - ✅ `backend/nest-app/src/config/typeorm-cli.config.ts`
   - ✅ `backend/nest-app/package.json` (erweitert)

2. **Migrations**
   - ✅ `backend/nest-app/src/migrations/XXXXXXXXXX-InitialSchema.ts`

3. **Dokumentation**
   - ✅ `docs/migrations/LUD28-109-migrations-checklist.md`
   - ✅ `docs/migrations/LUD28-109-migrations-plan.md` (dieses Dokument)
   - ✅ `docs/migrations/constraint-mapping.md`
   - ✅ `backend/nest-app/README.md` (aktualisiert)

4. **Test-Infrastruktur**
   - ✅ `backend/nest-app/docker-compose.test.yml`
   - ✅ `backend/nest-app/scripts/test-migrations.sql`
   - ✅ `.env.test` Beispiel

---

## Weitere Überlegungen

### 1. Migration-Strategie

**Option A: Single Migration (gewählt)**
- ✅ Einfacher für Initial-Setup
- ✅ Alle Entities in einem Commit
- ❌ Große Datei, schwerer zu reviewen

**Option B: Domain-basierte Migrations**
- ✅ Bessere Übersicht
- ✅ Unabhängige Rollbacks pro Domain
- ❌ Komplexere Reihenfolge bei FK-Dependencies

**Entscheidung:** Option A für PoC, Option B für produktive Weiterentwicklung

### 2. DBMS-Unterschiede

| Feature | PostgreSQL | MariaDB |
|---------|-----------|---------|
| JSON Type | JSONB (binary) | JSON (text) |
| UUID Generation | `gen_random_uuid()` | `UUID()` |
| Array Type | ARRAY[] | JSON Array |
| Enum Type | Native ENUM | ENUM |

**Empfehlung:** Migrations zunächst für PostgreSQL, dann Anpassung für MariaDB wenn nötig

### 3. synchronize-Flag

**Vor Migrations:** `synchronize: true` (Development)
**Nach Migrations:** `synchronize: false` (explizite Migration-Kontrolle)

**Risiko:** Datenverlust wenn synchronize=true und Entity-Schema ändert sich
**Mitigation:** synchronize=false + explizite Migrations

---

## Zeitplan

| Phase | Aufwand | Status |
|-------|---------|--------|
| Phase 1: Setup | 0.5d | ⏳ Planned |
| Phase 2: Generation | 0.5d | ⏳ Planned |
| Phase 3: Anpassung | 0.5d | ⏳ Planned |
| Phase 4: Testing | 0.25d | ⏳ Planned |
| Phase 5: Dokumentation | 0.25d | ⏳ Planned |
| **Gesamt** | **2d** | |

---

## Next Steps

1. ✅ Plan erstellt und dokumentiert
2. ⏳ LUD28-109 Ticket in YouTrack aktualisieren
3. ⏳ Phase 1 starten: TypeORM CLI Setup
4. ⏳ Migration generieren und anpassen
5. ⏳ Testing und Validierung
6. ⏳ Review & PR vorbereiten (LUD28-59.6)

---

**Erstellt:** 2025-12-03  
**Autor:** GitHub Copilot  
**Ticket:** LUD28-109  
**Parent:** LUD28-59

