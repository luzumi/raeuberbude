# LUD28-109 Quick Start Guide

**Ticket:** LUD28-109 - TypeORM-Migrations erstellen  
**Ziel:** Schritt-für-Schritt Anleitung zur Implementierung

---

## Voraussetzungen

- ✅ LUD28-108 abgeschlossen (Entities implementiert)
- ✅ PostgreSQL installiert (lokal oder Docker)
- ✅ Node.js & npm funktionsfähig
- ✅ Backend-Projekt kompiliert ohne Fehler

---

## Schnellstart (Step-by-Step)

### Step 1: TypeORM CLI Config erstellen

**Datei anlegen:** `backend/nest-app/src/config/typeorm-cli.config.ts`

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

### Step 2: npm-Scripts hinzufügen

**In `backend/nest-app/package.json` ergänzen:**

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

### Step 3: Migrations-Ordner erstellen

```powershell
cd C:\Users\corat\IdeaProjects\raueberbude\backend\nest-app
mkdir src\migrations
```

### Step 4: Test - CLI funktioniert

```powershell
npm run migration:show
```

**Erwartete Ausgabe:**
```
No migrations are pending
```

### Step 5: Migration generieren

```powershell
npm run migration:generate -- src/migrations/InitialSchema
```

**Erwartete Ausgabe:**
```
Migration C:/Users/corat/.../src/migrations/1733241234567-InitialSchema.ts has been generated successfully.
```

### Step 6: Generierte Migration prüfen

**Datei öffnen:** `backend/nest-app/src/migrations/XXXXXXXXXX-InitialSchema.ts`

**Prüfen:**
- ✅ Alle 18 Entities vorhanden (users, user_rights, ha_devices, etc.)
- ✅ CREATE TABLE statements korrekt
- ✅ ALTER TABLE für FK-Constraints vorhanden
- ✅ down() Methode vorhanden (DROP TABLE statements)

### Step 7: Constraint-Namen anpassen

**Beispiel: User-Tabelle**

**Vorher (auto-generiert):**
```typescript
await queryRunner.query(`
  CREATE TABLE "users" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "username" character varying(100) NOT NULL,
    "email" character varying(255) NOT NULL,
    "password_hash" character varying(255) NOT NULL,
    "profile_data" json,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"),
    CONSTRAINT "UQ_fe0bb3f6520ee0469504521e710" UNIQUE ("username"),
    CONSTRAINT "UQ_e12765acbea34341e16b9e4b3a9" UNIQUE ("email")
  )
`);

await queryRunner.query(`
  CREATE INDEX "IDX_0c83d9eae1c0e5c9e9f5e0a1234" ON "users" ("created_at")
`);
```

**Nachher (Konvention):**
```typescript
await queryRunner.query(`
  CREATE TABLE "users" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "username" character varying(100) NOT NULL,
    "email" character varying(255) NOT NULL,
    "password_hash" character varying(255) NOT NULL,
    "profile_data" json,
    "created_at" TIMESTAMP NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT "pk_users" PRIMARY KEY ("id"),
    CONSTRAINT "uq_users__username" UNIQUE ("username"),
    CONSTRAINT "uq_users__email" UNIQUE ("email")
  )
`);

await queryRunner.query(`
  CREATE INDEX "ix_users__created_at" ON "users" ("created_at")
`);
```

**Wiederholen für:**
- Alle Primary Keys → `pk_<table>`
- Alle Unique Constraints → `uq_<table>__<column>`
- Alle Indizes → `ix_<table>__<column>`
- Alle Foreign Keys → `fk_<from_table>__<to_table>__<column>`

**Tipp:** Suchen & Ersetzen mit Regex in VS Code!

### Step 8: Test-Datenbank aufsetzen

**Docker Compose:** `backend/nest-app/docker-compose.test.yml`

```yaml
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
```powershell
docker-compose -f docker-compose.test.yml up -d
```

### Step 9: .env.test erstellen

**Datei:** `backend/nest-app/.env.test`

```env
DB_HOST=localhost
DB_PORT=5433
DB_USERNAME=test
DB_PASSWORD=test
DB_DATABASE=raeuberbude_test
NODE_ENV=test
```

### Step 10: Migration ausführen

```powershell
# .env.test laden
$env:DB_PORT="5433"; $env:DB_USERNAME="test"; $env:DB_PASSWORD="test"; $env:DB_DATABASE="raeuberbude_test"

# Migration starten
npm run migration:run
```

**Erwartete Ausgabe:**
```
query: SELECT * FROM current_schema()
query: SELECT version()
query: SELECT * FROM "information_schema"."tables" WHERE "table_schema" = 'public' AND "table_name" = 'migrations'
query: CREATE TABLE "migrations" (...)
query: SELECT * FROM "migrations" "migrations" ORDER BY "id" DESC
Migration InitialSchema1733241234567 has been executed successfully.
query: INSERT INTO "migrations"...
query: COMMIT
```

### Step 11: Schema validieren

**Mit psql:**
```powershell
psql -h localhost -p 5433 -U test -d raeuberbude_test
```

**Tabellen prüfen:**
```sql
\dt

-- Erwartete Ausgabe:
-- users
-- user_rights
-- user_allowed_terminals
-- app_terminals
-- terminal_rights
-- speech_human_inputs
-- speech_test_inputs
-- speech_transcripts
-- intent_logs
-- event_logs
-- categories
-- ha_areas
-- ha_devices
-- ha_entities
-- ha_entity_states
-- ha_entity_attributes
-- ha_snapshots
-- ha_persons
-- migrations
```

**Constraints prüfen:**
```sql
SELECT 
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  rel.relname AS table_name
FROM pg_constraint con
JOIN pg_class rel ON con.conrelid = rel.oid
WHERE rel.relname IN ('users', 'user_rights', 'ha_devices')
ORDER BY rel.relname, con.contype;
```

**Erwartung:**
- Primary Keys: `pk_users`, `pk_user_rights`, etc.
- Foreign Keys: `fk_user_rights__users__user_id`, etc.
- Unique: `uq_users__username`, etc.

### Step 12: Rollback testen

```powershell
npm run migration:revert
```

**Erwartete Ausgabe:**
```
query: SELECT * FROM "migrations" "migrations" ORDER BY "id" DESC
Migration InitialSchema1733241234567 is going to be reverted.
query: START TRANSACTION
query: DROP TABLE "ha_persons"
query: DROP TABLE "ha_snapshots"
...
query: DROP TABLE "users"
query: DELETE FROM "migrations" WHERE "timestamp" = 1733241234567
query: COMMIT
Migration InitialSchema1733241234567 has been reverted successfully.
```

**Validieren:**
```sql
\dt
-- Nur "migrations" Tabelle sollte übrig sein
```

### Step 13: Erneut hochfahren

```powershell
npm run migration:run
```

**Validieren:**
```sql
\dt
-- Alle 18 Tabellen wieder vorhanden
```

### Step 14: Smoke-Test

**Datei:** `backend/nest-app/scripts/test-migrations.sql`

```sql
-- User anlegen
INSERT INTO users (id, username, email, password_hash)
VALUES (gen_random_uuid(), 'testuser', 'test@example.com', 'hash123');

-- UserRights anlegen (FK-Test)
INSERT INTO user_rights (user_id, role, status)
SELECT id, 'regular', 'active' FROM users WHERE username = 'testuser';

-- FK-Test: ON DELETE CASCADE
DELETE FROM users WHERE username = 'testuser';
-- user_rights sollte auch gelöscht sein (Erwartung: 0 rows)
SELECT * FROM user_rights WHERE user_id IN (
  SELECT id FROM users WHERE username = 'testuser'
);

-- HaArea anlegen
INSERT INTO ha_areas (id, area_id, name)
VALUES (gen_random_uuid(), 'living_room', 'Living Room');

-- HaDevice anlegen (FK-Test)
INSERT INTO ha_devices (id, device_id, name, area_id)
SELECT gen_random_uuid(), 'device_1', 'Test Device', area_id
FROM ha_areas WHERE name = 'Living Room';

-- FK-Test: ON DELETE SET NULL
DELETE FROM ha_areas WHERE name = 'Living Room';
-- area_id sollte NULL sein
SELECT area_id FROM ha_devices WHERE name = 'Test Device';
-- Erwartung: NULL
```

**Ausführen:**
```powershell
psql -h localhost -p 5433 -U test -d raeuberbude_test -f scripts/test-migrations.sql
```

### Step 15: synchronize deaktivieren

**Datei:** `backend/nest-app/src/config/database.config.ts`

**Ändern:**
```typescript
// ⚠️ synchronize deaktiviert - nutze Migrations!
// Siehe: docs/migrations/LUD28-109-migrations-checklist.md
synchronize: false,
```

### Step 16: Dokumentation finalisieren

**Erstellen:**
1. ✅ `docs/migrations/LUD28-109-migrations-checklist.md`
2. ✅ `docs/migrations/constraint-mapping.md`
3. ✅ `backend/nest-app/README.md` (aktualisieren)

### Step 17: Commit & PR

```powershell
git checkout -b feature/LUD28-109-migrations
git add .
git commit -m "feat(db): LUD28-109 - Add TypeORM migrations for all core entities"
git push origin feature/LUD28-109-migrations
```

---

## Troubleshooting

### Problem: `typeorm: command not found`

**Lösung:**
```powershell
npm install -D typeorm ts-node
```

### Problem: Migration generiert keine Änderungen

**Lösung:**
```powershell
# Entities neu kompilieren
npm run build

# Cache löschen
rm -rf dist/

# Erneut generieren
npm run migration:generate -- src/migrations/InitialSchema
```

### Problem: Constraint-Namen zu lang (> 63 Zeichen)

**PostgreSQL Limit:** 63 Zeichen für Identifier

**Lösung:** Kürzen mit Abkürzungen:
```
fk_user_allowed_terminals__app_terminals__terminal_id
→ fk_user_allowed_terms__app_terms__term_id (49 Zeichen)
```

### Problem: down() Migration schlägt fehl

**Häufige Ursache:** FK-Constraints verhindern DROP TABLE

**Lösung:** Reihenfolge in down() umkehren:
```typescript
// up(): Erst Parent, dann Child
CREATE TABLE users ...
CREATE TABLE user_rights ... (FK zu users)

// down(): Erst Child, dann Parent
DROP TABLE user_rights
DROP TABLE users
```

---

## Checkliste

### Setup
- [ ] `typeorm-cli.config.ts` erstellt
- [ ] npm-Scripts ergänzt
- [ ] `src/migrations/` Ordner vorhanden
- [ ] `npm run migration:show` funktioniert

### Migration
- [ ] Migration generiert
- [ ] Alle 18 Entities enthalten
- [ ] Constraint-Namen angepasst (pk_, fk_, uq_, ix_)
- [ ] Migration kompiliert

### Testing
- [ ] Test-DB läuft (Docker)
- [ ] `.env.test` vorhanden
- [ ] Migration up erfolgreich
- [ ] Schema validiert (Tabellen & Constraints)
- [ ] Migration down erfolgreich
- [ ] Smoke-Test erfolgreich

### Dokumentation
- [ ] Migrations-Checklist erstellt
- [ ] Constraint-Mapping dokumentiert
- [ ] README aktualisiert
- [ ] `synchronize: false` gesetzt

### Git
- [ ] Feature-Branch erstellt
- [ ] Commit mit aussagekräftiger Message
- [ ] PR vorbereitet

---

**Status:** Ready for Implementation  
**Nächster Schritt:** Step 1 beginnen

**Support:** Bei Fragen → `docs/migrations/LUD28-109-migrations-plan.md` (vollständiger Plan)

