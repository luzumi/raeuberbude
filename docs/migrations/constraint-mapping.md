# Constraint-Mapping: Auto-Generated → Convention

**Migration:** 1764775119125-InitialSchema.ts  
**Datum:** 2025-12-03

---

## Primary Keys

| Tabelle | TypeORM Auto-Generated | Konvention | Status |
|---------|------------------------|------------|--------|
| users | `PK_a3ffb1c0c8416b9fc6f907b7433` | `pk_users` | ✅ |
| user_rights | `PK_812675de1b3b7e694dd0f5e4550` | `pk_user_rights` | ✅ |
| user_allowed_terminals | `PK_5cddf2ee43e0ced9062757e1f2d` | `pk_user_allowed_terminals` | ✅ |
| app_terminals | `PK_5312571257489ffb899f001a0a3` | `pk_app_terminals` | ✅ |
| terminal_rights | `PK_4fd6477a89e3600b6224c6d9037` | `pk_terminal_rights` | ✅ |
| speech_test_inputs | `PK_438c52717143c6461729b5fe2bc` | `pk_speech_test_inputs` | ✅ |
| speech_human_inputs | `PK_d3d3fcec5fd2332b230f07d01a0` | `pk_speech_human_inputs` | ✅ |
| categories | `PK_24dbc6126a28ff948da33e97d3b` | `pk_categories` | ✅ |
| intent_logs | `PK_08a5ea0c1b3726a8cc468a9664a` | `pk_intent_logs` | ✅ |
| speech_transcripts | `PK_8413042b9d9572aae8f2a278445` | `pk_speech_transcripts` | ✅ |
| event_logs | `PK_b09cf1bb58150797d898076b242` | `pk_event_logs` | ✅ |
| ha_snapshots | `PK_8bd728b40dae8945601ca9fa329` | `pk_ha_snapshots` | ✅ |
| ha_persons | `PK_5f341b73e0de892739c128c5b18` | `pk_ha_persons` | ✅ |
| ha_areas | `PK_209177f91feac18ef3e69f42bcf` | `pk_ha_areas` | ✅ |
| ha_devices | `PK_ac30884d105c75520b71de9beb3` | `pk_ha_devices` | ✅ |
| ha_entities | `PK_1ea0706eb5defaadb39b56895dd` | `pk_ha_entities` | ✅ |
| ha_entity_states | `PK_72851f6e2f2c465c3222dedd61d` | `pk_ha_entity_states` | ✅ |
| ha_entity_attributes | `PK_f2fef7c925223f9a1ef83472cb2` | `pk_ha_entity_attributes` | ✅ |

---

## Unique Constraints

| Tabelle | Spalte | TypeORM Auto-Generated | Konvention | Status |
|---------|--------|------------------------|------------|--------|
| users | username | `UQ_fe0bb3f6520ee0469504521e710` | `uq_users__username` | ✅ |
| users | email | `UQ_97672ac88f789774dd47f7c8be3` | `uq_users__email` | ✅ |
| app_terminals | terminal_id | `UQ_d3791ca91cbaf198fc6a072f7fe` | `uq_app_terminals__terminal_id` | ✅ |
| categories | key | `UQ_da6f1e4e0c4683302df95d3ae9c` | `uq_categories__key` | ✅ |
| ha_persons | person_id | `UQ_70e262fa8c63f11b4a8b681e977` | `uq_ha_persons__person_id` | ✅ |
| ha_areas | area_id | `UQ_19c14e3df6906646d0c619e5159` | `uq_ha_areas__area_id` | ✅ |
| ha_devices | device_id | `UQ_103a4aac2364da92fe69c579b34` | `uq_ha_devices__device_id` | ✅ |

---

## Foreign Keys

**✅ Alle Foreign Keys wurden bereits korrekt durch Entity-Decorators benannt!**

Die FK-Namen folgen der Konvention `fk_<from_table>__<to_table>__<column>` und mussten nicht manuell angepasst werden.

### Auth & Users (4)
- `fk_user_rights__users__user_id` - user_rights.user_id → users.id
- `fk_user_allowed_terminals__users__user_id` - user_allowed_terminals.user_id → users.id
- `fk_user_allowed_terminals__app_terminals__terminal_id` - user_allowed_terminals.terminal_id → app_terminals.id
- `fk_app_terminals__users__assigned_user_id` - app_terminals.assigned_user_id → users.id

### Terminals (1)
- `fk_terminal_rights__app_terminals__terminal_id` - terminal_rights.terminal_id → app_terminals.id

### Speech Inputs (3)
- `fk_speech_test_inputs__users__user_id` - speech_test_inputs.user_id → users.id
- `fk_speech_human_inputs__users__user_id` - speech_human_inputs.user_id → users.id
- `fk_speech_human_inputs__app_terminals__terminal_id` - speech_human_inputs.terminal_id → app_terminals.id

### Logging (5)
- `fk_intent_logs__categories__category_id` - intent_logs.category_id → categories.id
- `fk_intent_logs__app_terminals__terminal_id` - intent_logs.terminal_id → app_terminals.id
- `fk_speech_transcripts__users__user_id` - speech_transcripts.user_id → users.id
- `fk_speech_transcripts__app_terminals__terminal_id` - speech_transcripts.terminal_id → app_terminals.id
- `fk_speech_transcripts__categories__category_id` - speech_transcripts.category_id → categories.id
- `fk_event_logs__users__user_id` - event_logs.user_id → users.id

### HomeAssistant (7)
- `fk_ha_persons__users__user_id` - ha_persons.user_id → users.id
- `fk_ha_devices__ha_areas__area_id` - ha_devices.area_id → ha_areas.area_id
- `fk_ha_devices__ha_devices__via_device_id` - ha_devices.via_device_id → ha_devices.device_id (self-reference)
- `fk_ha_entities__ha_areas__area_id` - ha_entities.area_id → ha_areas.area_id
- `fk_ha_entities__ha_devices__device_id` - ha_entities.device_id → ha_devices.device_id
- `fk_ha_entity_states__ha_entities__entity_id` - ha_entity_states.entity_id → ha_entities.entity_id
- `fk_ha_entity_states__ha_snapshots__snapshot_id` - ha_entity_states.snapshot_id → ha_snapshots.id
- `fk_ha_entity_attributes__ha_entities__entity_id` - ha_entity_attributes.entity_id → ha_entities.entity_id

---

## Indizes

**✅ Alle Indizes wurden bereits korrekt generiert!**

Die Index-Namen folgen der Konvention `ix_<table>__<column>` und mussten nicht angepasst werden.

### Gesamt: ~45 Indizes

Beispiele:
- `ix_users__created_at`
- `ix_users__email`
- `ix_users__username`
- `ix_user_rights__status`
- `ix_user_rights__role`
- `ix_app_terminals__terminal_id`
- `ix_speech_transcripts__user_id`
- `ix_ha_entities__domain`
- etc.

---

## Besonderheiten

### 1. Doppelter UNIQUE für categories
**Problem:** TypeORM generierte für `categories.key`:
- UNIQUE CONSTRAINT: `uq_categories__key`
- UNIQUE INDEX: `uq_categories__key`

**Lösung:** UNIQUE INDEX entfernt, da CONSTRAINT ausreichend ist.

### 2. Natural Keys bei HomeAssistant
HomeAssistant-Entities nutzen teilweise Natural Keys:
- `ha_areas.area_id` (VARCHAR, UNIQUE)
- `ha_devices.device_id` (VARCHAR, UNIQUE)
- `ha_entities.entity_id` (VARCHAR, PRIMARY KEY)

Zusätzlich gibt es Surrogate UUIDs als `id` (außer bei ha_entities).

### 3. Composite Primary Key
`user_allowed_terminals` hat einen zusammengesetzten PK:
- `PRIMARY KEY (user_id, terminal_id)`
- Name: `pk_user_allowed_terminals`

---

## Validierung

### Automatische Prüfung
```sql
-- Prüfe alle Constraint-Namen
SELECT 
  con.conname,
  con.contype,
  rel.relname AS table_name
FROM pg_constraint con
JOIN pg_class rel ON con.conrelid = rel.oid
WHERE rel.relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  AND con.conname LIKE 'pk_%'
   OR con.conname LIKE 'fk_%'
   OR con.conname LIKE 'uq_%'
ORDER BY con.contype, rel.relname, con.conname;
```

### Erwartetes Ergebnis
- Alle PKs beginnen mit `pk_`
- Alle FKs beginnen mit `fk_` und folgen Pattern `fk_<from>__<to>__<column>`
- Alle UQ Constraints beginnen mit `uq_`
- Alle Indizes beginnen mit `ix_` oder `uq_` (UNIQUE)

---

## Statistik

| Constraint-Typ | Anzahl | Manuell angepasst | Auto-korrekt |
|----------------|--------|-------------------|--------------|
| Primary Keys | 18 | 18 | 0 |
| Foreign Keys | 22 | 0 | 22 ✅ |
| Unique Constraints | 7 | 7 | 0 |
| Indizes | ~45 | 0 | 45 ✅ |
| **GESAMT** | **~92** | **25** | **67** |

**Erfolgsrate:** 73% der Constraints wurden automatisch korrekt benannt!

---

**Erstellt:** 2025-12-03  
**Letzte Aktualisierung:** 2025-12-03

