# DBM-SCHEMA-02 – Schlüssel, Indizes & Constraints

**Ticket:** LUD28-59 – Schlüsselstrategie, Foreign Keys & Indizes

**Bezug:**
- Grundlage: `DBM-SCHEMA-01 – Relationales ER-Modell und Normalisierung`
- Kontext: Migration MongoDB/Mongoose → relationale DB (MariaDB/PostgreSQL) mit TypeORM
- Ergänzende HA-Spezifikation: `backend/nest-app/src/modules/homeassistant/schemas/database-design.md`

Ziel dieses Dokuments ist die **verbindliche Definition** von:
- Primärschlüsseln (PK)
- Unique-Constraints (UNIQUE)
- Fremdschlüsseln (FK) inkl. `ON DELETE` / `ON UPDATE`
- Wesentlichen Indizes (INDEX)

für **alle in DBM-SCHEMA-01 beschriebenen Tabellen**.

> **Hinweis zu Datentypen:**
> Konkrete physische Typen (z.B. `INT` vs. `UUID`, Länge von `VARCHAR`) werden in `DBM-SCHEMA-05` festgelegt. Dieses Dokument arbeitet bewusst auf **Schlüssel- und Beziehungsebene**.

---

## 1. Namenskonventionen

- **Primärschlüssel**: `pk_<table>`
- **Fremdschlüssel**: `fk_<from_table>__<to_table>__<column>`
- **Unique-Constraints**: `uq_<table>__<column1>[_<column2>...]`
- **Indizes**: `ix_<table>__<column1>[_<column2>...]`

Alle Namen sind Vorschläge für die spätere SQL/TypeORM-Implementierung und dienen der **klaren Zuordnung** in Migrations und Entity-Definitionen.

---

## 2. Schlüsselstrategie (Übersicht)

- **Mongo-abgeleitete Tabellen** (`users`, `categories`, `intent_logs`, `llm_instances`, `speech_transcripts`, `event_logs`, `speech_human_inputs`, `speech_test_inputs`, `app_terminals` u.a.)
  - Nutzen konsistent einen Surrogat-Key `id` als PK.
  - Natürliche Schlüssel (z.B. `terminal_id`, `key`) erhalten **UNIQUE-Constraints**.

- **HomeAssistant-Stammdaten**
  - Verwenden, wo möglich, **natürliche Schlüssel als PK**:
    - `ha_entities.entity_id`
    - `ha_areas.area_id`
    - `ha_devices.device_id`
    - `ha_persons.person_id`
    - `ha_zones.entity_id`
    - `ha_media_players.entity_id`
    - `ha_automations.entity_id`
  - Historien-Tabellen (`ha_snapshots`, `ha_entity_states`, `ha_entity_attributes`) verwenden Surrogat-PKs, aber **Unique-Indizes auf natürlichen Kombis** (z.B. `(entity_id, snapshot_id)`).

- **Join-Tabellen (n:m)**
  - Erhalten **zusammengesetzte Primärschlüssel** aus den beiden FK-Spalten.
  - Alle FK-Spalten sind zugleich **Index-Bestandteil**.

- **Referentielle Aktionen (Grundregeln)**
  - Bewegungs-/Logtabellen, die auf Benutzer/Terminals verweisen:
    - `ON DELETE SET NULL`, `ON UPDATE CASCADE` (Pseudonymisierung statt Löschung).
  - Stammdaten-abhängige Tabellen (z.B. `ha_entity_states` → `ha_snapshots`):
    - `ON DELETE CASCADE`, `ON UPDATE CASCADE`.
  - Rechte-/Konfigurations-Tabellen mit 1:1-Beziehung (z.B. `user_rights`):
    - `ON DELETE CASCADE` (Löschen eines Users entfernt seine Rechte).

---

## 3. Tabellen-Details

### 3.1 Benutzer & Authentifizierung

#### 3.1.1 `users`

| Tabelle | Spalten                | Typ     | ON DELETE | ON UPDATE | Kommentar |
|--------|------------------------|---------|-----------|-----------|-----------|
| users  | `id`                   | PK      | –         | –         | Surrogat-PK für User (ersetzt Mongo ObjectId) |
| users  | `username`             | UNIQUE  | –         | –         | Eindeutiger Login-Name |
| users  | `email`                | UNIQUE  | –         | –         | Eindeutige E-Mail, lowercase |
| users  | `id`                   | INDEX   | –         | –         | Impliziter PK-Index |
| users  | `created_at`           | INDEX   | –         | –         | Zeitliche Auswertungen / Auditing |

**Beziehungen (referenziert von):**
- `user_rights.user_id` (1:1)
- `user_allowed_terminals.user_id` (m:n via Join)
- `terminal_allowed_users.user_id` (m:n via Join / alternative Sicht)
- `speech_human_inputs.user_id` (1:n)
- `speech_test_inputs.user_id` (optional 1:n)
- `speech_transcripts.user_id` (1:n)
- `event_logs.user_id` (0..n)
- optional `ha_persons.user_id` (0..1, zukünftig FK)

#### 3.1.2 `user_rights`

| Tabelle      | Spalten    | Typ | ON DELETE       | ON UPDATE       | Kommentar |
|-------------|-----------|-----|-----------------|-----------------|-----------|
| user_rights | `user_id` | PK  | CASCADE         | CASCADE         | PK = FK → `users.id` (1:1) |
| user_rights | `user_id` | FK  | CASCADE         | CASCADE         | `fk_user_rights__users__user_id` |
| user_rights | `role`    | INDEX | –             | –               | Filter auf Rolle (admin/manager/...) |
| user_rights | `status`  | INDEX | –             | –               | Filter auf aktiven/suspendierten Status |

#### 3.1.3 `user_allowed_terminals`

| Tabelle               | Spalten                   | Typ  | ON DELETE       | ON UPDATE       | Kommentar |
|----------------------|---------------------------|------|-----------------|-----------------|-----------|
| user_allowed_terminals | `user_id`, `terminal_id` | PK   | –               | –               | Zusammengesetzter PK (m:n Users ↔ Terminals) |
| user_allowed_terminals | `user_id`               | FK   | CASCADE         | CASCADE         | `fk_user_allowed_terminals__users__user_id` |
| user_allowed_terminals | `terminal_id`           | FK   | CASCADE         | CASCADE         | `fk_user_allowed_terminals__app_terminals__terminal_id` |
| user_allowed_terminals | `user_id`               | INDEX | –              | –               | Selektive Suche aller Terminals pro User |
| user_allowed_terminals | `terminal_id`           | INDEX | –              | –               | Selektive Suche aller User pro Terminal |

> **Hinweis:** `terminal_allowed_users` bildet die gleiche Beziehung aus Terminal-Perspektive ab (siehe unten). In der physischen Implementierung kann eine **einzige Join-Tabelle** verwendet werden; die Namenswahl wird im Entity-Design entschieden.

#### 3.1.4 `user_roles`

| Tabelle     | Spalten     | Typ    | ON DELETE | ON UPDATE | Kommentar |
|------------|-------------|--------|-----------|-----------|-----------|
| user_roles | `id`        | PK     | –         | –         | Surrogat-PK für Rollen |
| user_roles | `role_key`  | UNIQUE | –         | –         | Eindeutiger technischer Rollenschlüssel |
| user_roles | `id`        | INDEX  | –         | –         | Impliziter PK-Index |

#### 3.1.5 `user_permissions`

| Tabelle          | Spalten          | Typ    | ON DELETE | ON UPDATE | Kommentar |
|-----------------|------------------|--------|-----------|-----------|-----------|
| user_permissions | `id`            | PK     | –         | –         | Surrogat-PK |
| user_permissions | `permission_key`| UNIQUE | –         | –         | Eindeutiger Permission-Key |
| user_permissions | `id`            | INDEX  | –         | –         | Impliziter PK-Index |
| user_permissions | `category`      | INDEX  | –         | –         | Schnelle Filterung nach Kategorien |

> Mögliche Join-Tabellen wie `role_permissions` sind **Folgetickets** und werden hier nicht weiter ausgeführt.

---

### 3.2 Speech & Terminals

#### 3.2.1 `app_terminals`

| Tabelle       | Spalten              | Typ     | ON DELETE       | ON UPDATE       | Kommentar |
|--------------|----------------------|---------|-----------------|-----------------|-----------|
| app_terminals| `id`                 | PK      | –               | –               | Surrogat-PK |
| app_terminals| `terminal_id`        | UNIQUE  | –               | –               | Stabile technische ID (z.B. Browser-Client), eindeutiger Login-Schlüssel |
| app_terminals| `assigned_user_id`   | FK      | SET NULL        | CASCADE         | `fk_app_terminals__users__assigned_user_id` – Terminal bleibt bei User-Löschung bestehen |
| app_terminals| `id`                 | INDEX   | –               | –               | Impliziter PK-Index |
| app_terminals| `terminal_id`        | INDEX   | –               | –               | Schnelle Lookups pro Terminal |
| app_terminals| `status`             | INDEX   | –               | –               | Filterung nach aktiv/inaktiv |
| app_terminals| `last_active_at`     | INDEX   | –               | –               | Auswertung „zuletzt aktiv“ |

#### 3.2.2 `terminal_rights`

| Tabelle         | Spalten      | Typ | ON DELETE       | ON UPDATE       | Kommentar |
|----------------|-------------|-----|-----------------|-----------------|-----------|
| terminal_rights| `terminal_id`| PK  | CASCADE         | CASCADE         | PK = FK → `app_terminals.id` (1:1) |
| terminal_rights| `terminal_id`| FK  | CASCADE         | CASCADE         | `fk_terminal_rights__app_terminals__terminal_id` |
| terminal_rights| `status`     | INDEX | –             | –               | Filterung nach aktiv/suspended |
| terminal_rights| `role_key`   | INDEX | –             | –               | Gruppierung nach Terminal-Rollen |

#### 3.2.3 `terminal_allowed_users`

| Tabelle               | Spalten                  | Typ  | ON DELETE       | ON UPDATE       | Kommentar |
|----------------------|--------------------------|------|-----------------|-----------------|-----------|
| terminal_allowed_users | `terminal_id`, `user_id`| PK   | –               | –               | M:n zwischen Terminals und Usern |
| terminal_allowed_users | `terminal_id`          | FK   | CASCADE         | CASCADE         | `fk_terminal_allowed_users__app_terminals__terminal_id` |
| terminal_allowed_users | `user_id`              | FK   | CASCADE         | CASCADE         | `fk_terminal_allowed_users__users__user_id` |
| terminal_allowed_users | `terminal_id`          | INDEX| –               | –               | Lookup aller User eines Terminals |
| terminal_allowed_users | `user_id`              | INDEX| –               | –               | Lookup aller Terminals eines Users |

#### 3.2.4 `speech_human_inputs`

(Aus `human-input.schema.ts` und DBM-SCHEMA-01 abgeleitet.)

| Tabelle             | Spalten          | Typ   | ON DELETE       | ON UPDATE       | Kommentar |
|--------------------|------------------|-------|-----------------|-----------------|-----------|
| speech_human_inputs| `id`             | PK    | –               | –               | Surrogat-PK für einzelne menschliche Eingaben |
| speech_human_inputs| `user_id`        | FK    | SET NULL        | CASCADE         | Optionaler Bezug auf `users.id` (Pseudonymisierung möglich) |
| speech_human_inputs| `terminal_id`    | FK    | SET NULL        | CASCADE         | Optionaler Bezug auf `app_terminals.id` |
| speech_human_inputs| `created_at`     | INDEX | –               | –               | Zeitachsen / Reporting |
| speech_human_inputs| `user_id`        | INDEX | –               | –               | Typische Filter: Eingaben pro User |
| speech_human_inputs| `terminal_id`    | INDEX | –               | –               | Typische Filter: Eingaben pro Terminal |

#### 3.2.5 `speech_test_inputs`

| Tabelle            | Spalten       | Typ   | ON DELETE       | ON UPDATE       | Kommentar |
|-------------------|--------------|-------|-----------------|-----------------|-----------|
| speech_test_inputs| `id`         | PK    | –               | –               | Surrogat-PK für Test-Daten |
| speech_test_inputs| `user_id`    | FK    | SET NULL        | CASCADE         | Optionaler Bezug auf `users.id` (wer hat den Test ausgeführt) |
| speech_test_inputs| `created_at` | INDEX | –               | –               | Zeitbasierte Auswertungen |

---

### 3.3 Logging, LLM & Telemetrie

#### 3.3.1 `categories`

| Tabelle    | Spalten | Typ    | ON DELETE | ON UPDATE | Kommentar |
|-----------|---------|--------|-----------|-----------|-----------|
| categories| `id`    | PK     | –         | –         | Surrogat-PK |
| categories| `key`   | UNIQUE | –         | –         | Technischer Kategorisierungsschlüssel |
| categories| `id`    | INDEX  | –         | –         | Impliziter PK-Index |

**Beziehungen (referenziert von):**
- `intent_logs.category_id`
- `speech_transcripts.category_id`

#### 3.3.2 `intent_logs`

| Tabelle     | Spalten        | Typ   | ON DELETE       | ON UPDATE       | Kommentar |
|------------|----------------|-------|-----------------|-----------------|-----------|
| intent_logs| `id`           | PK    | –               | –               | Surrogat-PK |
| intent_logs| `category_id`  | FK    | SET NULL        | CASCADE         | Optional, `fk_intent_logs__categories__category_id` |
| intent_logs| `terminal_id`  | FK    | SET NULL        | CASCADE         | Optional, `fk_intent_logs__app_terminals__terminal_id` |
| intent_logs| `timestamp`    | INDEX | –               | –               | Zeitachsen / Statistiken |
| intent_logs| `category_id`  | INDEX | –               | –               | Filter nach Kategorie |
| intent_logs| `terminal_id`  | INDEX | –               | –               | Filter nach Terminal |

#### 3.3.3 `llm_instances`

| Tabelle       | Spalten   | Typ    | ON DELETE | ON UPDATE | Kommentar |
|--------------|-----------|--------|-----------|-----------|-----------|
| llm_instances| `id`      | PK     | –         | –         | Surrogat-PK |
| llm_instances| `name`    | UNIQUE | –         | –         | Optional eindeutiger Anzeigename |
| llm_instances| `url`     | UNIQUE | –         | –         | Eindeutiger Endpoint (optional) |
| llm_instances| `id`      | INDEX  | –         | –         | Impliziter PK-Index |
| llm_instances| `enabled` | INDEX  | –         | –         | Filterung aktiver Instanzen |
| llm_instances| `is_active`| INDEX | –         | –         | Bevorzugte aktive Instanz |

> Bezug zu `speech_transcripts` kann später über FK-Spalten wie `llm_instance_id` konkretisiert werden (Folgetickets).

#### 3.3.4 `speech_transcripts`

| Tabelle           | Spalten             | Typ   | ON DELETE       | ON UPDATE       | Kommentar |
|------------------|---------------------|-------|-----------------|-----------------|-----------|
| speech_transcripts| `id`               | PK    | –               | –               | Surrogat-PK für Transcript |
| speech_transcripts| `user_id`          | FK    | SET NULL        | CASCADE         | Optionaler Bezug auf `users.id` |
| speech_transcripts| `terminal_id`      | FK    | SET NULL        | CASCADE         | Optionaler Bezug auf `app_terminals.id` |
| speech_transcripts| `category_id`      | FK    | SET NULL        | CASCADE         | Optionaler Bezug auf `categories.id` |
| speech_transcripts| `assigned_area_id` | FK    | SET NULL        | CASCADE         | Optionaler Bezug auf `ha_areas.area_id` |
| speech_transcripts| `assigned_entity_id`| FK   | SET NULL        | CASCADE         | Optionaler Bezug auf `ha_entities.entity_id` |
| speech_transcripts| `created_at`       | INDEX | –               | –               | Zeitachsen / Reporting |
| speech_transcripts| `user_id`          | INDEX | –               | –               | Filter nach User |
| speech_transcripts| `terminal_id`      | INDEX | –               | –               | Filter nach Terminal |
| speech_transcripts| `category_id`      | INDEX | –               | –               | Filter nach Kategorie |
| speech_transcripts| `assigned_area_id` | INDEX | –               | –               | Typische HA-Analysen nach Area |
| speech_transcripts| `assigned_entity_id`| INDEX| –               | –               | Typische HA-Analysen nach Entity |

#### 3.3.5 `event_logs`

| Tabelle   | Spalten    | Typ   | ON DELETE       | ON UPDATE       | Kommentar |
|----------|------------|-------|-----------------|-----------------|-----------|
| event_logs| `id`      | PK    | –               | –               | Surrogat-PK |
| event_logs| `user_id` | FK    | SET NULL        | CASCADE         | Optionaler Bezug auf `users.id` |
| event_logs| `timestamp`| INDEX | –               | –               | Zeitbasierte Suche |
| event_logs| `type`    | INDEX | –               | –               | Filter auf Typ (websocket/action/...) |

---

### 3.4 HomeAssistant-Datenmodell

Die folgenden Definitionen basieren auf `DBM-SCHEMA-01` und werden gegen das bestehende Dokument `modules/homeassistant/schemas/database-design.md` abgeglichen.

#### 3.4.1 `ha_snapshots`

| Tabelle      | Spalten   | Typ   | ON DELETE | ON UPDATE | Kommentar |
|-------------|-----------|-------|-----------|-----------|-----------|
| ha_snapshots| `id`      | PK    | –         | –         | Surrogat-PK für Snapshots |
| ha_snapshots| `timestamp`| INDEX| –         | –         | Sortierung/Abfragen nach Snapshot-Zeit |
| ha_snapshots| `import_date`| INDEX| –      | –         | Analyse Import-Historie |
| ha_snapshots| `status`  | INDEX | –         | –         | Filter pending/processing/completed |

**Beziehungen (referenziert von):**
- `ha_entity_states.snapshot_id` (1:n, CASCADE)

#### 3.4.2 `ha_entities`

| Tabelle    | Spalten      | Typ    | ON DELETE | ON UPDATE | Kommentar |
|-----------|--------------|--------|-----------|-----------|-----------|
| ha_entities| `entity_id` | PK     | –         | –         | Natürlicher Primärschlüssel (z.B. `sensor.pixel_8_pro_battery_level`) |
| ha_entities| `entity_id` | UNIQUE | –         | –         | PK ist implizit unique |
| ha_entities| `device_id` | FK     | SET NULL  | CASCADE   | Optionaler Bezug auf `ha_devices.device_id` |
| ha_entities| `area_id`   | FK     | SET NULL  | CASCADE   | Optionaler Bezug auf `ha_areas.area_id` |
| ha_entities| `entity_type`| INDEX | –         | –         | Filterung nach Entity-Typ |
| ha_entities| `domain`    | INDEX  | –         | –         | Filterung nach Domain (`sensor`, `light`, ...) |
| ha_entities| `device_id` | INDEX  | –         | –         | Lookups aller Entities eines Geräts |
| ha_entities| `area_id`   | INDEX  | –         | –         | Lookups aller Entities einer Area |

#### 3.4.3 `ha_entity_states`

| Tabelle          | Spalten                   | Typ    | ON DELETE       | ON UPDATE       | Kommentar |
|-----------------|---------------------------|--------|-----------------|-----------------|-----------|
| ha_entity_states| `id`                      | PK     | –               | –               | Surrogat-PK für Zustände |
| ha_entity_states| `entity_id`              | FK     | CASCADE         | CASCADE         | Bezug auf `ha_entities.entity_id` |
| ha_entity_states| `snapshot_id`            | FK     | CASCADE         | CASCADE         | Bezug auf `ha_snapshots.id` |
| ha_entity_states| `entity_id`, `snapshot_id`| UNIQUE| –               | –               | Natürlicher Schlüssel pro Entity+Snapshot |
| ha_entity_states| `entity_id`              | INDEX  | –               | –               | Abfragen aller States einer Entity |
| ha_entity_states| `snapshot_id`            | INDEX  | –               | –               | Abfragen aller States eines Snapshots |
| ha_entity_states| `last_updated`           | INDEX  | –               | –               | Zeitbasierte Filterung |

#### 3.4.4 `ha_entity_attributes`

| Tabelle             | Spalten           | Typ   | ON DELETE       | ON UPDATE       | Kommentar |
|--------------------|-------------------|-------|-----------------|-----------------|-----------|
| ha_entity_attributes| `id`             | PK    | –               | –               | Surrogat-PK |
| ha_entity_attributes| `entity_state_id`| FK    | CASCADE         | CASCADE         | Bezug auf `ha_entity_states.id` |
| ha_entity_attributes| `attribute_key`  | INDEX | –               | –               | Typische Filter: Attribute nach Name |
| ha_entity_attributes| `entity_state_id`| INDEX | –               | –               | Join/Lookups pro State |

Optional (späteres Tuning): zusammengesetzter Index `ix_ha_entity_attributes__state__key (entity_state_id, attribute_key)`.

#### 3.4.5 `ha_areas`

| Tabelle  | Spalten   | Typ    | ON DELETE | ON UPDATE | Kommentar |
|---------|-----------|--------|-----------|-----------|-----------|
| ha_areas| `area_id` | PK     | –         | –         | Natürlicher Schlüssel aus HA |
| ha_areas| `area_id` | UNIQUE | –         | –         | Implizit über PK |
| ha_areas| `name`    | INDEX  | –         | –         | Suche nach Areas nach Name |

**Beziehungen (referenziert von):**
- `ha_devices.area_id`
- `ha_entities.area_id`
- `speech_transcripts.assigned_area_id`

#### 3.4.6 `ha_devices`

| Tabelle   | Spalten       | Typ   | ON DELETE       | ON UPDATE       | Kommentar |
|----------|---------------|-------|-----------------|-----------------|-----------|
| ha_devices| `device_id`  | PK    | –               | –               | Natürlicher Device-Key |
| ha_devices| `device_id`  | UNIQUE| –               | –               | Implizit über PK |
| ha_devices| `area_id`    | FK    | SET NULL        | CASCADE         | Bezug auf `ha_areas.area_id` |
| ha_devices| `via_device_id`| FK  | SET NULL        | CASCADE         | Optionale Selbstreferenz auf anderes Gerät |
| ha_devices| `area_id`    | INDEX | –               | –               | Suche aller Devices einer Area |

**Beziehungen (referenziert von):**
- `ha_entities.device_id`

#### 3.4.7 `ha_persons`

| Tabelle    | Spalten     | Typ   | ON DELETE       | ON UPDATE       | Kommentar |
|-----------|-------------|-------|-----------------|-----------------|-----------|
| ha_persons| `person_id` | PK    | –               | –               | Natürlicher Personen-Key |
| ha_persons| `person_id` | UNIQUE| –               | –               | Implizit über PK |
| ha_persons| `entity_id` | FK    | CASCADE         | CASCADE         | 1:1-Bezug auf `ha_entities.entity_id` |
| ha_persons| `entity_id` | UNIQUE| –               | –               | Sicherstellt 1:1 Entity↔Person |
| ha_persons| `user_id`   | FK    | SET NULL        | CASCADE         | Optional, Bezug auf `users.id` (falls verknüpft) |

#### 3.4.8 `ha_zones`

| Tabelle  | Spalten    | Typ   | ON DELETE       | ON UPDATE       | Kommentar |
|---------|------------|-------|-----------------|-----------------|-----------|
| ha_zones| `entity_id`| PK    | CASCADE         | CASCADE         | PK + FK → `ha_entities.entity_id` |
| ha_zones| `entity_id`| FK    | CASCADE         | CASCADE         | `fk_ha_zones__ha_entities__entity_id` |

#### 3.4.9 `ha_zone_persons`

| Tabelle        | Spalten                    | Typ  | ON DELETE       | ON UPDATE       | Kommentar |
|---------------|----------------------------|------|-----------------|-----------------|-----------|
| ha_zone_persons| `zone_entity_id`, `person_id`| PK | –               | –               | M:n zwischen Zonen und Personen |
| ha_zone_persons| `zone_entity_id`          | FK   | CASCADE         | CASCADE         | Bezug auf `ha_zones.entity_id` |
| ha_zone_persons| `person_id`               | FK   | CASCADE         | CASCADE         | Bezug auf `ha_persons.person_id` |
| ha_zone_persons| `zone_entity_id`          | INDEX| –               | –               | Lookup aller Personen einer Zone |
| ha_zone_persons| `person_id`               | INDEX| –               | –               | Lookup aller Zonen einer Person |

#### 3.4.10 `ha_media_players`

| Tabelle        | Spalten    | Typ   | ON DELETE       | ON UPDATE       | Kommentar |
|---------------|------------|-------|-----------------|-----------------|-----------|
| ha_media_players| `entity_id`| PK  | CASCADE         | CASCADE         | PK + FK → `ha_entities.entity_id` |
| ha_media_players| `entity_id`| FK  | CASCADE         | CASCADE         | `fk_ha_media_players__ha_entities__entity_id` |

#### 3.4.11 `ha_media_player_group_members`

| Tabelle                     | Spalten                               | Typ  | ON DELETE       | ON UPDATE       | Kommentar |
|----------------------------|---------------------------------------|------|-----------------|-----------------|-----------|
| ha_media_player_group_members| `parent_entity_id`, `member_entity_id`| PK | –               | –               | Selbst-m:n zwischen Media Playern |
| ha_media_player_group_members| `parent_entity_id`                  | FK   | CASCADE         | CASCADE         | Bezug auf `ha_media_players.entity_id` |
| ha_media_player_group_members| `member_entity_id`                  | FK   | CASCADE         | CASCADE         | Bezug auf `ha_media_players.entity_id` |
| ha_media_player_group_members| `parent_entity_id`                  | INDEX| –               | –               | Lookup aller Gruppenmitglieder |
| ha_media_player_group_members| `member_entity_id`                  | INDEX| –               | –               | Lookup aller Gruppen, in denen ein Player Mitglied ist |

#### 3.4.12 `ha_services`

| Tabelle     | Spalten       | Typ    | ON DELETE | ON UPDATE | Kommentar |
|------------|---------------|--------|-----------|-----------|-----------|
| ha_services| `id`          | PK     | –         | –         | Surrogat-PK |
| ha_services| `full_name`   | UNIQUE | –         | –         | Kombination aus `domain.service_name` |
| ha_services| `domain`      | INDEX  | –         | –         | Filter nach Service-Domain |
| ha_services| `service_name`| INDEX  | –         | –         | Filter nach Service-Name |

#### 3.4.13 `ha_automations`

| Tabelle       | Spalten        | Typ    | ON DELETE       | ON UPDATE       | Kommentar |
|--------------|----------------|--------|-----------------|-----------------|-----------|
| ha_automations| `entity_id`   | PK     | CASCADE         | CASCADE         | PK + FK → `ha_entities.entity_id` |
| ha_automations| `entity_id`   | FK     | CASCADE         | CASCADE         | `fk_ha_automations__ha_entities__entity_id` |
| ha_automations| `automation_id`| UNIQUE| –               | –               | Zusätzlicher technischer Schlüssel |

---

## 4. Abgleich mit bestehendem HA-TypeORM/DB-Design (AC3)

Das bestehende Dokument `backend/nest-app/src/modules/homeassistant/schemas/database-design.md` beschreibt bereits ein relationales HA-Modell (PostgreSQL-orientiert) mit:
- Surrogat-PKs (`id` als UUID) für fast alle Tabellen
- Natürlichen Schlüsseln (`entity_id`, `area_id`, `device_id`, `person_id`) als **UNIQUE**-Spalten
- Indizes auf `entity_type`, `domain`, `(entity_id, snapshot_id)`, Zeitachsen und Attribut-Key

`DBM-SCHEMA-01` und dieses Dokument (`DBM-SCHEMA-02`) **schärfen die globale Schlüsselstrategie nach**:

- Für HA-Stammdaten werden **natürliche Schlüssel als PK** bevorzugt (`entity_id`, `area_id`, `device_id`, `person_id`, ...).
- Surrogat-PKs (`id`-Spalten) aus `database-design.md` können
  - entweder als technische Key-Spalten **beibehalten** werden (mit zusätzlichem UNIQUE-Constraint auf dem natürlichen Key),
  - oder im Zuge der TypeORM-Migration entfernt werden, sobald keine Fremdschlüssel mehr darauf zeigen.
- Die EAV-Struktur (`ha_entity_attributes`) und die Historisierung (`ha_snapshots`, `ha_entity_states`) bleiben konzeptionell unverändert; lediglich die Schlüsselrichtung wird vereinheitlicht.

Für die spätere Implementierung der TypeORM-Entities (DBM-SCHEMA-03/04) gilt:
- Entweder **Deckungsgleichheit** mit diesem Dokument herstellen (Empfehlung),
- oder Abweichungen (z.B. zusätzliche Surrogat-IDs) explizit als Kommentar in den Entity-Klassen dokumentieren.

---

## 5. Akzeptanzkriterien – Mapping

- **AC1:** Alle Tabellen aus `DBM-SCHEMA-01` besitzen jetzt definierte
  - Primärschlüssel (siehe Abschnitt 3)
  - Unique-Constraints (z.B. `users.username`, `users.email`, `ha_services.full_name`)
  - Fremdschlüssel inkl. Zieltabellen und Lösch-/Update-Verhalten
  - Basis-Indizes auf PKs, FKs und typischen Suchspalten (Zeitachsen, `entity_id`, `device_id`, `area_id`, `role`, `status`).
- **AC2:** Alle n:m-Beziehungen haben explizite Join-Tabellen mit
  - zusammengesetzten Primärschlüsseln
  - Foreign Keys auf beide Seiten
  - dokumentierter Lösch-Semantik (i.d.R. `ON DELETE CASCADE`).
- **AC3:** Für alle `ha_*`-Tabellen ist der Bezug zum bestehenden HA-DB-Design dokumentiert (siehe Abschnitt 4) und die
  - geplante Schlüsselstrategie (natürliche PKs)
  - Behandlung von Surrogat-IDs
  beschrieben.
- **AC4:** Dieses Dokument liegt unter `database/DBM-SCHEMA-02-Schluessel-Indizes-Constraints.md` im Repository und verweist auf `DBM-SCHEMA-01` sowie das HA-DB-Design-Dokument. Es dient als Grundlage für die folgenden Tickets zu TypeORM-Entities und Migrationen.
