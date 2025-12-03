# LUD28-109 Migrations Checklist

**Ticket:** LUD28-109  
**Status:** ✅ Migration erfolgreich - Testing in Progress  
**Datum:** 2025-12-03

---

## ✅ Phase 1: Setup (abgeschlossen)

- [x] TypeORM CLI DataSource Config erstellt (`src/config/typeorm-cli.config.ts`)
- [x] npm-Scripts ergänzt (migration:run, migration:revert, etc.)
- [x] migrations/ Ordner angelegt
- [x] `npm run migration:show` funktioniert

---

## ✅ Phase 2: Generation (abgeschlossen)

- [x] Migration generiert (`src/migrations/1764775119125-InitialSchema.ts`)
- [x] Alle 18 Entities enthalten
  - [x] users, user_rights, user_allowed_terminals
  - [x] app_terminals, terminal_rights
  - [x] speech_human_inputs, speech_test_inputs
  - [x] speech_transcripts, intent_logs, event_logs, categories
  - [x] ha_areas, ha_devices, ha_entities, ha_entity_states, ha_entity_attributes, ha_snapshots, ha_persons

---

## ✅ Phase 3: Constraint-Anpassungen (abgeschlossen)

### Primary Keys (18)
- [x] pk_users
- [x] pk_user_rights
- [x] pk_user_allowed_terminals
- [x] pk_app_terminals
- [x] pk_terminal_rights
- [x] pk_speech_test_inputs
- [x] pk_speech_human_inputs
- [x] pk_categories
- [x] pk_intent_logs
- [x] pk_speech_transcripts
- [x] pk_event_logs
- [x] pk_ha_snapshots
- [x] pk_ha_persons
- [x] pk_ha_areas
- [x] pk_ha_devices
- [x] pk_ha_entities
- [x] pk_ha_entity_states
- [x] pk_ha_entity_attributes

### Foreign Keys (22) - bereits korrekt generiert!
- [x] fk_user_rights__users__user_id
- [x] fk_user_allowed_terminals__users__user_id
- [x] fk_user_allowed_terminals__app_terminals__terminal_id
- [x] fk_app_terminals__users__assigned_user_id
- [x] fk_terminal_rights__app_terminals__terminal_id
- [x] fk_speech_test_inputs__users__user_id
- [x] fk_speech_human_inputs__users__user_id
- [x] fk_speech_human_inputs__app_terminals__terminal_id
- [x] fk_intent_logs__categories__category_id
- [x] fk_intent_logs__app_terminals__terminal_id
- [x] fk_speech_transcripts__users__user_id
- [x] fk_speech_transcripts__app_terminals__terminal_id
- [x] fk_speech_transcripts__categories__category_id
- [x] fk_event_logs__users__user_id
- [x] fk_ha_persons__users__user_id
- [x] fk_ha_devices__ha_areas__area_id
- [x] fk_ha_devices__ha_devices__via_device_id
- [x] fk_ha_entities__ha_areas__area_id
- [x] fk_ha_entities__ha_devices__device_id
- [x] fk_ha_entity_states__ha_entities__entity_id
- [x] fk_ha_entity_states__ha_snapshots__snapshot_id
- [x] fk_ha_entity_attributes__ha_entities__entity_id

### Unique Constraints (7)
- [x] uq_users__username
- [x] uq_users__email
- [x] uq_app_terminals__terminal_id
- [x] uq_categories__key
- [x] uq_ha_persons__person_id
- [x] uq_ha_areas__area_id
- [x] uq_ha_devices__device_id
- [x] uq_ha_entities__entity_id (Index)

### Indizes (~45) - bereits korrekt generiert!
- [x] ix_user_rights__status, ix_user_rights__role
- [x] ix_users__created_at, ix_users__email, ix_users__username
- [x] ix_app_terminals__last_active_at, ix_app_terminals__status, ix_app_terminals__terminal_id
- [x] ix_terminal_rights__role_key, ix_terminal_rights__status
- [x] ix_speech_test_inputs__user_id, ix_speech_test_inputs__created_at
- [x] ix_speech_human_inputs__terminal_id, ix_speech_human_inputs__user_id, ix_speech_human_inputs__created_at
- [x] ix_intent_logs__terminal_id, ix_intent_logs__category_id, ix_intent_logs__timestamp
- [x] ix_speech_transcripts__* (6 Indizes)
- [x] ix_event_logs__user_id, ix_event_logs__type, ix_event_logs__timestamp
- [x] ix_ha_snapshots__status, ix_ha_snapshots__import_date, ix_ha_snapshots__timestamp
- [x] ix_ha_persons__user_id
- [x] ix_ha_areas__name
- [x] ix_ha_devices__area_id
- [x] ix_ha_entities__device_id, ix_ha_entities__area_id, ix_ha_entities__domain
- [x] ix_ha_entity_states__* (4 Indizes)
- [x] ix_ha_entity_attributes__* (3 Indizes)

---

## 🔄 Phase 4: Testing (in progress)

- [x] Test-DB Setup (Docker: raeuberbude-test-db)
  - Container: raeuberbude-test-db
  - Image: postgres:16-alpine
  - Port: 5433
  - User: test / Password: test
  - Database: raeuberbude_test

- [x] Migration UP erfolgreich
  - ✅ Alle 18 Tabellen erstellt
  - ✅ Alle Constraints gesetzt
  - ✅ Migrations-Tabelle aktualisiert

- [ ] Schema validiert (Tabellen & Constraints)
  - Script: `scripts/validate-schema.sql`
  - TODO: Ausführen und Ergebnisse prüfen

- [ ] Migration DOWN erfolgreich
  - TODO: `npm run migration:revert`
  - Erwartung: Alle Tabellen gelöscht

- [ ] Migration erneut UP
  - TODO: Schema erneut identisch

- [ ] FK-Constraints funktionieren
  - TODO: Smoke-Tests durchführen
  - CASCADE Verhalten prüfen
  - SET NULL Verhalten prüfen

---

## ⏳ Phase 5: Dokumentation (TODO)

- [x] Migrations-Checklist erstellt (dieses Dokument)
- [ ] Constraint-Mapping dokumentiert
- [ ] README aktualisiert
- [ ] `synchronize: false` gesetzt

---

## ⚠️ Known Issues

### Issue 1: Doppelter UNIQUE INDEX für categories (✅ GELÖST)
**Problem:** TypeORM generierte sowohl UNIQUE CONSTRAINT als auch UNIQUE INDEX mit gleichem Namen  
**Symptom:** `error: relation "uq_categories__key" already exists`  
**Lösung:** UNIQUE INDEX entfernt, CONSTRAINT reicht aus

### Issue 2: TypeScript nicht neu kompiliert
**Problem:** Änderungen an Migration-Datei wurden nicht übernommen  
**Ursache:** TypeORM nutzt ts-node, kein Pre-Compile nötig  
**Lösung:** Datei direkt bearbeitet

---

## 📊 Statistiken

| Kategorie | Anzahl |
|-----------|--------|
| **Tabellen** | 18 |
| **Primary Keys** | 18 |
| **Foreign Keys** | 22 |
| **Unique Constraints** | 7 |
| **Indizes** | ~45 |
| **ENUM Types** | 7 |

---

## 🔧 Nützliche Kommandos

### Migration ausführen
```powershell
cd backend/nest-app
$env:NODE_ENV="test"
$env:DB_PORT="5433"
$env:DB_USERNAME="test"
$env:DB_PASSWORD="test"
$env:DB_DATABASE="raeuberbude_test"
npm run migration:run
```

### Migration zurückrollen
```powershell
npm run migration:revert
```

### Migration-Status prüfen
```powershell
npm run migration:show
```

### Schema in DB prüfen
```powershell
psql -h localhost -p 5433 -U test -d raeuberbude_test -f scripts/validate-schema.sql
```

---

## 📋 ON DELETE / ON UPDATE Verhalten

| Beziehungstyp | ON DELETE | ON UPDATE | Beispiel |
|--------------|-----------|-----------|----------|
| Logging → User/Terminal | `SET NULL` | `NO ACTION` | speech_transcripts → users |
| Stammdaten → abhängig | `CASCADE` | `CASCADE` | user_rights → users |
| 1:1 Rechte | `CASCADE` | `CASCADE` | terminal_rights → app_terminals |
| M:N Join | `CASCADE` | `CASCADE` | user_allowed_terminals → users/terminals |
| HA Hierarchie (optional) | `SET NULL` | `NO ACTION` | ha_devices → ha_areas |
| HA Hierarchie (required) | `CASCADE` | `NO ACTION` | ha_entity_states → ha_entities |

---

## 🚀 Next Steps

1. **Schema validieren**
   ```powershell
   psql -h localhost -p 5433 -U test -d raeuberbude_test -f scripts/validate-schema.sql
   ```

2. **Rollback testen**
   ```powershell
   npm run migration:revert
   ```

3. **Smoke-Tests durchführen**
   - User + UserRights anlegen/löschen (CASCADE Test)
   - HaArea + HaDevice anlegen/löschen (SET NULL Test)
   
4. **Dokumentation finalisieren**
   - Constraint-Mapping-Tabelle erstellen
   - README.md aktualisieren
   - synchronize: false setzen

5. **Review & PR**
   - Feature-Branch erstellen
   - Commit
   - PR erstellen

---

**Status:** ✅ Migration erfolgreich, Tests ausstehend  
**Geschätzte verbleibende Zeit:** 0.5d  
**Letzte Aktualisierung:** 2025-12-03 16:45

