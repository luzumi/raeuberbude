# DBM-SCHEMA-01 – Relationales ER-Modell und Normalisierung

**Ticket:** LUD28-57 – DBM-SCHEMA-01 – Relationales ER-Modell und Normalisierung  
**Kontext:** Migration MongoDB → MariaDB/TypeORM  
**Scope dieses Tickets:** Konzeptionelles relationales Modell + sinnvolle Normalisierung, keine konkrete TypeORM/SQL-Implementierung.

---

## 1. Ziel & Scope

- **Ziel:**
  - Ableitung eines relationalen ER-Modells aus dem bestehenden Mongo/Mongoose-Schema.
  - Identifikation von Entitäten, Attributen und Beziehungen (1:1, 1:n, n:m).
  - Beschreibung der zukünftigen Relationen/Tabellen als Grundlage für folgende Tickets (Keys, Entities, Migrations).
- **Nicht in diesem Ticket:**
  - Konkrete Datentypen (z.B. INT vs. UUID) → DBM-SCHEMA-05.
  - Technische TypeORM-Entities, Decorators, Migrations → DBM-SCHEMA-02/03/06.
  - CI/CD-Integration, Migrationstools, Dual-Write → andere DBM-Tickets.

---

## 2. Designprinzipien

- **Relationales Modell als Primärquelle**
  - Klar identifizierbare Entitäten mit stabilen Schlüsseln.
  - Explizite Foreign Keys, wo Referenzen heute nur implizit über Strings/ObjectIds existieren.

- **Sinnvolle Normalisierung (nahe 3NF)**
  - Trennung von Stammdaten (User, HomeAssistant-Entities, Terminals, LLM-Instanzen) und Bewegungsdaten (Input-Events, Logs, Transcripts).
  - Auslagerung wiederverwendbarer Dimensionen (Kategorien, Rollen, Berechtigungen) in eigene Tabellen.
  - EAV-/JSON-Muster nur dort, wo das Schema hochdynamisch ist (HomeAssistant-Attribute, HA-Service-Felder, Debug-RawResponses).

- **Schlüsselstrategie**
  - Für aus Mongo stammende **ObjectIds** wird ein generischer Surrogat-Key `id` vorgesehen (konkreter Typ später).
  - Für natürlich stabile Schlüssel aus HomeAssistant (`entity_id`, `device_id`, `area_id` …) werden diese primär verwendet und über Unique-Constraints abgesichert.
  - Kombination aus Surrogat-Key + natürlichem Schlüssel, wo notwendig (z.B. Snapshots, States).

- **Privatsphäre & Pseudonymisierung**
  - Logging-Tabellen erlauben referenzierte Benutzer **und** pseudonymisierte Kennungen.
  - Vollständige Löschung/Anonymisierung von User-Daten bleibt durch Trennung von Stammdaten und Logs möglich.

---

## 3. Überblick Ziel-Entitäten (Domänen-Sicht)

### 3.1 Benutzer & Authentifizierung

- `users`
- `user_rights` (1:1 zu `users`)
- `user_roles` (Dimensionstabelle für Rollen)
- `user_permissions` (Dimensionstabelle für Berechtigungen)
- `user_allowed_terminals` (m:n zwischen User und Terminal)

### 3.2 Speech & Terminals

- `app_terminals`
- `terminal_rights` (1:1 zu `app_terminals`)
- `terminal_allowed_users` (m:n zwischen Terminal und User)
- `speech_human_inputs`
- `speech_test_inputs`

### 3.3 Logging, LLM & Telemetrie

- `categories`
- `intent_logs`
- `llm_instances`
- `speech_transcripts`
- `event_logs`

### 3.4 HomeAssistant-Datenmodell

- `ha_snapshots`
- `ha_entities`
- `ha_entity_states`
- `ha_entity_attributes`
- `ha_areas`
- `ha_devices`(1:n zu `ha_entities`)
- `ha_persons`
- `ha_zones`
- `ha_zone_persons` (m:n)
- `ha_media_players`(1:n zu `ha_devices`)
- `ha_media_player_group_members` (self m:n)
- `ha_services`
- `ha_automations`

---

## 4. Domänenmodell im Detail

### 4.1 Benutzer & Authentifizierung

**Quelle Mongo-Schema:**
- `backend/nest-app/src/users/schemas/user.schema.ts` (Collection `app_users`)
- `backend/models/User.js`
- `server/models/user.js`

#### 4.1.1 Tabelle `users`

**Zweck:** Zentrales Benutzerkonto für App & Backend. Vereinheitlicht bisher verteilte User-Informationen.

**Attribute (Vorschlag):**
- `id` – PK (Surrogat, ersetzt Mongo ObjectId)
- `username` – eindeutiger Login-Name (Pflicht, UNIQUE)
- `email` – eindeutige E-Mail (Pflicht, UNIQUE, lowercase)
- `password_hash` – gehashter Passwortwert
- `created_at` – Erstellungszeitpunkt
- `updated_at` – Änderungszeitpunkt
- `profile_data` – optionale, nicht-sensitive Zusatzinfos (aus `server/models/user.js.info`, JSON)

**Wichtige Constraints & Beziehungen:**
- `UNIQUE(username)`
- `UNIQUE(email)`
- 1:n zu:
  - `speech_human_inputs` (`user_id`)
  - `speech_transcripts` (`user_id`)
  - `event_logs` (`user_id` optional)
- 1:0..1 zu:
  - `user_rights` (`user_id` ist gleichzeitig PK & FK)
  - `app_terminals` (über `assigned_user_id`)

#### 4.1.2 Tabelle `user_rights`

**Quelle Mongo-Schema:**
- `backend/nest-app/src/modules/speech/schemas/user-rights.schema.ts`

**Zweck:** Rechte- & Rollenmodell pro Benutzer.

**Attribute (Vorschlag):**
- `user_id` – PK, FK → `users.id`
- `role` – ENUM (`admin`, `manager`, `regular`, `guest`, `terminal`)
- `status` – ENUM (`active`, `suspended`, `revoked`)
- `expires_at` – Ablaufdatum der Rechte
- `permissions_json` – abgeleitete/überschriebene Rechte (JSON, spiegelt heutiges `permissions: string[]`)
- Diverse Bool-Flags (aus Schema):
  - `can_use_speech_input`
  - `can_view_own_inputs`
  - `can_view_all_inputs`
  - `can_delete_inputs`
  - `can_manage_terminals`
  - `can_manage_users`
- `metadata` – JSON-Metadaten (z.B. Suspended-Reason)
- `created_at` / `updated_at`

**Beziehungen:**
- 1:1 zu `users` (User besitzt maximal einen Rights-Datensatz).
- m:n zu `app_terminals` über Join-Tabelle `user_allowed_terminals`.

#### 4.1.3 Join-Tabelle `user_allowed_terminals`

**Quelle Mongo-Schema:**
- `UserRights.allowedTerminals: Types.ObjectId[]` (Ref `AppTerminal`)

**Zweck:** Abbildung der erlaubten Terminals pro User.

**Attribute (Vorschlag):**
- `user_id` – FK → `users.id`
- `terminal_id` – FK → `app_terminals.id`

**Schlüssel:**
- PK: `(user_id, terminal_id)`

**Beziehungen:**
- User 1:n `user_allowed_terminals`
- AppTerminal 1:n `user_allowed_terminals`
- Konzeptionell m:n zwischen `users` und `app_terminals`.

#### 4.1.4 Tabelle `user_roles`

**Zweck:** Optionale weitere Normalisierung des Rollenmodells. Hält Metadaten zu Rollen, die heute primär als Enum in `user_rights.role` existieren.

**Attribute (Vorschlag):**
- `id` – PK
- `role_key` – technischer Schlüssel, z.B. `admin`, `manager`, `regular`, `guest`, `terminal` (UNIQUE)
- `label` – Anzeigename (z.B. „Administrator“)
- `description` – optionale Beschreibung der Rolle
- `is_default` – bool, ob Rolle als Default für neue Benutzer verwendet wird
- `created_at` / `updated_at`

**Beziehungen:**
- 1:n (logisch) zu `user_rights` über `role_key` ↔ `user_rights.role`.
- Grundlage für eine spätere Join-Tabelle `role_permissions` (Rolle ↔ Permission).

#### 4.1.5 Tabelle `user_permissions`

**Zweck:** Zentrale Definition einzelner Berechtigungen (z.B. `speech.use`, `user.manage.rights`) als normalisierte Dimension.

**Attribute (Vorschlag):**
- `id` – PK
- `permission_key` – technischer Schlüssel (z.B. `speech.use`, `terminal.edit`), UNIQUE
- `label` – Kurzbeschreibung
- `category` – logische Gruppierung (z.B. `speech`, `terminal`, `user`, `system`)
- `description` – ausführlichere Beschreibung
- `created_at` / `updated_at`

**Beziehungen (geplant für Folgetickets):**
- 1:n zu `role_permissions` (nicht Teil dieses Tickets), das m:n zwischen `user_roles` ↔ `user_permissions` abbildet.
- optional 1:n zu `user_permission_overrides` (m:n User ↔ Permission), falls feingranulare Overrides zu `user_rights.permissions_json` benötigt werden.

---

### 4.2 Speech & Terminals

**Quelle Mongo-Schema:**
- `backend/nest-app/src/modules/speech/schemas/app-terminal.schema.ts`
- `backend/nest-app/src/modules/speech/schemas/human-input.schema.ts`
- `backend/nest-app/src/modules/speech/schemas/test-input.schema.ts`

#### 4.2.1 Tabelle `app_terminals`

**Zweck:** Repräsentiert registrierte Clients/Terminals (Browser, Kiosks, etc.).

**Attribute (Vorschlag):**
- `id` – PK (Surrogat)
- `terminal_id` – stabiler, eindeutiger technischer Schlüssel (aus `terminalId`, UNIQUE)
- `name` – Anzeigename
- `description` – optionale Beschreibung
- `type` – ENUM: `browser`, `mobile`, `tablet`, `kiosk`, `smart-tv`, `other`
- `location` – freier Text
- `capabilities_json` – aus `capabilities` (Booleans für Mic/Camera/Speaker/Display/Speech)
- `status` – ENUM: `active`, `inactive`, `maintenance`
- `last_active_at`
- `assigned_user_id` – FK → `users.id`
- `allowed_actions_json` – aus `allowedActions: string[]`
- `settings_json`, `metadata_json`
- `created_at` / `updated_at`

**Beziehungen:**
- 0..n `speech_human_inputs` pro Terminal
- 0..n `speech_transcripts` pro Terminal
- 0..n `user_allowed_terminals` pro Terminal

#### 4.2.2 Tabelle `terminal_rights`

**Zweck:** Optionales Rechtemodell auf Terminal-Ebene (analog zu `user_rights`). Ermöglicht eigenständige Policy pro Terminal (z.B. Kiosk mit eingeschränkten Aktionen), unabhängig vom Benutzer.

**Attribute (Vorschlag):**
- `terminal_id` – PK, FK → `app_terminals.id`
- `role_key` – optionale Klassifizierung des Terminals (z.B. `kiosk`, `personal_device`)
- `status` – ENUM, z.B. `active`, `suspended`, `maintenance`
- `allowed_actions_json` – Liste erlaubter Aktionen (spiegelt/ersetzt `app_terminals.allowed_actions_json`)
- `restrictions_json` – optionale Einschränkungen (z.B. max. Sessions, Zeitfenster)
- `metadata_json`
- `created_at` / `updated_at`

**Beziehungen:**
- 1:1 zu `app_terminals`.
- Ergänzt `user_rights` um eine Terminal-Perspektive; effektive Rechte ergeben sich aus Kombination von User- und Terminal-Kontext.

#### 4.2.3 Join-Tabelle `terminal_allowed_users`

**Zweck:** Alternative Sicht auf dieselbe Beziehung wie `user_allowed_terminals`, aber mit Terminal-Fokus. Technisch kann dies identisch zur bestehenden Join-Tabelle sein; die Benennung hängt vom späteren Entity-Namen ab.

**Attribute (Vorschlag):**
- `terminal_id` – FK → `app_terminals.id`
- `user_id` – FK → `users.id`

**Schlüssel:**
- PK: `(terminal_id, user_id)`

**Hinweis:**
- In der technischen Umsetzung kann `terminal_allowed_users` entweder als reine View/Synonym auf `user_allowed_terminals` existieren oder als eigenständig benannte Join-Tabelle verwendet werden. Entscheidend ist, dass das relationale Modell die m:n-Beziehung **symmetrisch** beschreibt.

---

### 4.3 Logging, LLM & Telemetrie

**Quelle Mongo-Schema (Auswahl):**
- `backend/models/Category.js`, `backend/nest-app/src/modules/logging/schemas/category.schema.ts`
- `backend/models/IntentLog.js`, `backend/nest-app/src/modules/logging/schemas/intentlog.schema.ts`
- `backend/models/LlmInstance.js`, `backend/nest-app/src/modules/logging/schemas/llminstance.schema.ts`
- `backend/models/Transcript.js`, `backend/nest-app/src/modules/logging/schemas/transcript.schema.ts`
- `backend/models/Log.js`, `server/models/log.js`

#### 4.3.1 Tabelle `categories`

**Zweck:** Zentrale Kategorien für Intents/Transcripts.

**Attribute (Vorschlag):**
- `id` – PK
- `key` – eindeutiger technischer Schlüssel (z.B. `home_assistant_command`), UNIQUE
- `label` – Anzeige-Label
- `created_at`

**Beziehungen:**
- 1:n zu `intent_logs`
- 1:n zu `speech_transcripts` (optional, wenn Mapping auf `category`-Enum erfolgt)

#### 4.3.2 Tabelle `intent_logs`

**Zweck:** Historie der erkannten Intents (stark aggregierte Sicht).

**Attribute (Vorschlag):**
- `id` – PK
- `timestamp` – Zeitpunkt (String oder Date, spätere Typwahl)
- `transcript` – Eingabetext
- `intent_key` – z.B. `turn_on_light`
- `summary` – Kurzbeschreibung
- `keywords_json` – Liste von Keywords
- `confidence`
- `terminal_id` – FK → `app_terminals.id` (optional)
- `category_id` – FK → `categories.id` (optional, ersetzte `intent`-String-Gruppierung)
- `created_at`

**Beziehungen:**
- n:1 zu `categories`
- n:1 zu `app_terminals`

#### 4.3.3 Tabelle `llm_instances`

**Zweck:** Konfiguration und Health-Status der LLM-Backends.

**Attribute (Vorschlag):**
- `id` – PK
- `name` – Anzeigename
- `url` – Endpoint
- `model` – Modellbezeichnung
- `enabled` – bool
- `is_active` – bool
- `system_prompt`
- `health` – ENUM: `healthy`, `unhealthy`, `unknown`
- `last_health_check`
- `config_json` – aus `config` (Sampling, Performance, etc.)
- `created_at`

**Beziehungen:**
- 1:n zu `speech_transcripts` (über `model`/`llm_url` nur logisch; optional FK, falls später normalisiert werden soll)

#### 4.3.4 Tabelle `speech_transcripts`

**Zweck:** Vollständige STT+LLM-Transkriptions-Historie inkl. Metriken und HA-Zuordnung.

**Attribute (Vorschlag, zusammengeführt aus `backend/models/Transcript.js` und Logging-Schema):**
- `id` – PK
- `user_id` – FK → `users.id`
- `terminal_id` – FK → `app_terminals.id`
- `audio_blob_ref` – Referenz auf Audio
- `transcript` – Original-STT-Text
- `stt_confidence`
- `ai_adjusted_text`
- `suggestions_json` – Liste von Vorschlägen
- `suggestion_flag` – bool
- `category_id` – FK → `categories.id` (ersetzt String-Enum)
- `intent_json` – komplettes Intent-Objekt
- Validierung:
  - `is_valid`
  - `confidence`
  - `has_ambiguity`
  - `clarification_needed`
  - `clarification_question`
  - `manually_valid` – manuelle Freigabe
- Performance:
  - `duration_ms`
  - `timings_json` – alle Unterzeiten (sttMs, preProcessMs, llmMs, dbMs, networkMs)
- LLM-Konfiguration:
  - `model`
  - `llm_url`
  - `llm_provider`
  - `temperature`
  - `max_tokens`
- Fehlersicht:
  - `raw_response_json`
  - `error`
  - `fallback_used`
- HomeAssistant-Zuordnung:
  - `assigned_area_id` – FK → `ha_areas.area_id` (optional)
  - `assigned_entity_id` – FK → `ha_entities.entity_id` (optional)
  - `assigned_action_json`
  - `assigned_trigger`
  - `assigned_trigger_at`
- `created_at` / `updated_at`

**Beziehungen:**
- n:1 zu `users`
- n:1 zu `app_terminals`
- n:1 zu `categories`
- n:1 zu `ha_areas` / `ha_entities` (optional)

#### 4.3.5 Tabelle `event_logs`

**Zweck:** Vereinheitlichte Logs aus `backend/models/Log.js` und `server/models/log.js`.

**Attribute (Vorschlag):**
- `id` – PK
- `timestamp` – Zeitpunkt
- `type` – ENUM, z.B. `websocket`, `action`, `user-action`
- `user_id` – FK → `users.id` (optional)
- `anon_user_id` – optionale pseudonymisierte ID (String)
- `message` – Lognachricht
- `metadata_json` – optionale Zusatzinformationen

**Beziehungen:**
- n:0..1 zu `users`
- unterstützt Szenario mit vollständig anonymisierten Logs über `anon_user_id`.

---

### 4.4 HomeAssistant-Datenmodell

**Quelle Mongo-Schema:**
- `backend/nest-app/src/modules/homeassistant/schemas/*.schema.ts`

#### 4.4.1 Tabelle `ha_snapshots`

**Zweck:** Importierte HomeAssistant-Snapshots.

**Attribute (Vorschlag):**
- `id` – PK
- `timestamp` – Zeitpunkt des Snapshots
- `ha_version`
- `status` – ENUM: `pending`, `processing`, `completed`, `failed`
- `error_log`
- `import_date` – entspricht `importDate`

**Beziehungen:**
- 1:n zu `ha_entity_states` (`snapshot_id`)

#### 4.4.2 Tabelle `ha_entities`

**Zweck:** Stammdaten aller HA-Entities.

**Attribute (Vorschlag):**
- `entity_id` – PK (String, z.B. `sensor.pixel_8_pro_battery_level`)
- `entity_type` – freier Typstring (ersetzt früheres Enum)
- `domain` – z.B. `sensor`, `light`, `switch`
- `object_id`
- `friendly_name`
- `device_id` – FK → `ha_devices.device_id` (optional)
- `area_id` – FK → `ha_areas.area_id` (optional)
- `created_at` / `updated_at`

**Beziehungen:**
- 1:n zu `ha_entity_states` (über `entity_id`)
- 1:n zu `ha_media_players`, `ha_automations`, `ha_persons`, `ha_zones` (indirekt über `entity_id`-Felder)

#### 4.4.3 Tabelle `ha_entity_states`

**Zweck:** Historische Zustände pro Entity und Snapshot.

**Attribute (Vorschlag):**
- `id` – PK
- `entity_id` – FK → `ha_entities.entity_id`
- `snapshot_id` – FK → `ha_snapshots.id`
- `state`
- `state_class`
- `last_changed`
- `last_updated`
- `created_at` / `updated_at`

**Natürlicher Schlüssel:**
- Kombination (`entity_id`, `snapshot_id`) – optionaler Unique-Index.

**Beziehungen:**
- 1:n zu `ha_entity_attributes` (`entity_state_id`)

#### 4.4.4 Tabelle `ha_entity_attributes`

**Zweck:** EAV-Modell für flexible Attribut-Mengen einer Entity-State-Kombination.

**Attribute (Vorschlag):**
- `id` – PK
- `entity_state_id` – FK → `ha_entity_states.id`
- `attribute_key` – Attribut-Name
- `attribute_value_json` – beliebiger Wert (JSON)
- `attribute_type` – ENUM: `string`, `number`, `boolean`, `array`, `object`
- `created_at`

**Beziehungen:**
- n:1 zu `ha_entity_states`

#### 4.4.5 Tabelle `ha_areas`

**Zweck:** HomeAssistant-Areas (Räume/Zonen innerhalb des Hauses).

**Attribute (Vorschlag):**
- `area_id` – PK
- `name`
- `aliases_json` – Liste von Alias-Namen
- `floor`
- `icon`
- `created_at` / `updated_at`

**Beziehungen:**
- 1:n zu `ha_devices` (`area_id`)
- 1:n zu `ha_entities` (`area_id`)
- optional 1:n zu `speech_transcripts` (`assigned_area_id`)

#### 4.4.6 Tabelle `ha_devices`

**Zweck:** HA-Geräte-Layer.

**Attribute (Vorschlag):**
- `device_id` – PK
- `name`
- `manufacturer`
- `model`
- `sw_version`
- `configuration_url`
- `connections_json`
- `identifiers_json`
- `via_device_id` – optionale Referenz auf anderes Gerät (z.B. Bridge)
- `area_id` – FK → `ha_areas.area_id`
- `created_at` / `updated_at`

**Beziehungen:**
- 1:n zu `ha_entities` (`device_id`)

#### 4.4.7 Tabelle `ha_persons`

**Zweck:** Repräsentation von Personen.

**Attribute (Vorschlag):**
- `person_id` – PK
- `entity_id` – FK → `ha_entities.entity_id` (unique)
- `name`
- `user_id` – optionaler Fremdschlüssel (String, später evtl. FK → `users.id`)
- `device_trackers_json`
- Position (optional):
  - `latitude`
  - `longitude`
  - `gps_accuracy`
- `created_at` / `updated_at`

**Beziehungen:**
- 1:1 zu `ha_entities` (über `entity_id`)
- m:n zu `ha_zones` über `ha_zone_persons`

#### 4.4.8 Tabelle `ha_zones`

**Zweck:** HomeAssistant-Zonen (Geo-Bereiche).

**Attribute (Vorschlag):**
- `entity_id` – PK, FK → `ha_entities.entity_id`
- `zone_name`
- `latitude`
- `longitude`
- `radius`
- `passive`
- `icon`

**Beziehungen:**
- m:n zu `ha_persons` via `ha_zone_persons`

#### 4.4.9 Join-Tabelle `ha_zone_persons`

**Quelle Mongo-Schema:**
- `HaZone.persons?: string[];` (Referenzen auf Personen)

**Zweck:** M:n-Beziehung zwischen Zonen und Personen.

**Attribute (Vorschlag):**
- `zone_entity_id` – FK → `ha_zones.entity_id`
- `person_id` – FK → `ha_persons.person_id`

**Schlüssel:**
- PK: `(zone_entity_id, person_id)`

#### 4.4.10 Tabelle `ha_media_players`

**Zweck:** Spezialisiertes Modell für MediaPlayer-Entities.

**Attribute (Vorschlag):**
- `entity_id` – PK, FK → `ha_entities.entity_id`
- `volume_level`
- `is_volume_muted`
- `media_content_type`
- `media_title`
- `media_artist`

**Beziehungen:**
- self-m:n zu anderen MediaPlayern via `ha_media_player_group_members`

#### 4.4.11 Join-Tabelle `ha_media_player_group_members`

**Quelle Mongo-Schema:**
- `HaMediaPlayer.groupMembers?: string[];`

**Zweck:** Gruppen- und Verbundbildung von MediaPlayern.

**Attribute (Vorschlag):**
- `parent_entity_id` – FK → `ha_media_players.entity_id`
- `member_entity_id` – FK → `ha_media_players.entity_id`

**Schlüssel:**
- PK: `(parent_entity_id, member_entity_id)`

#### 4.4.12 Tabelle `ha_services`

**Zweck:** Stammdaten der HomeAssistant-Services.

**Attribute (Vorschlag):**
- `id` – PK
- `domain`
- `service_name`
- `full_name` – UNIQUE (`domain.service`)
- `description`
- `fields_json`
- `target_json`
- `response_optional`
- `created_at` / `updated_at`

#### 4.4.13 Tabelle `ha_automations`

**Zweck:** Modellierung der Automationen.

**Attribute (Vorschlag):**
- `entity_id` – PK, FK → `ha_entities.entity_id`
- `automation_id` – eindeutiger Zusatzschlüssel (UNIQUE)
- `alias`
- `description`
- `mode` – ENUM: `single`, `restart`, `queued`, `parallel`
- `current`
- `max`
- `triggers_json`
- `conditions_json`
- `actions_json`
- `created_at` / `updated_at`

---

## 5. Normalisierungsgrad & Begründung

- **3NF-orientiert:**
  - Zentrale Dimensionstabellen (`users`, `categories`, `ha_entities`, `ha_areas`, `ha_devices`).
  - Bewegungsdaten (`speech_human_inputs`, `speech_transcripts`, `intent_logs`, `event_logs`, `ha_entity_states`) referenzieren Stammdaten nur über Keys.

- **EAV/JSON gezielt eingesetzt:**
  - `ha_entity_attributes` kapselt hochvariable Attribute ohne jede Schema-Änderung.
  - `*_json`-Felder (z.B. `capabilities_json`, `timings_json`, `fields_json`) halten komplexe/niedrig strukturierte Daten, die selten gefiltert werden.

- **m:n-Beziehungen explizit modelliert:**
  - `user_allowed_terminals` (Users ↔ Terminals).
  - `terminal_allowed_users` (Terminals ↔ Users, symmetrische Sicht auf dieselbe Beziehung).
  - `ha_zone_persons` (Zonen ↔ Personen).
  - `ha_media_player_group_members` (MediaPlayer-Gruppen).

- **Pseudonymisierung möglich:**
  - `event_logs` können mit `anon_user_id` arbeiten, auch wenn `user_id` leer ist.
  - Löschung eines Users kann wahlweise anonymisieren (Entfernen von FK, Beibehalten der Logs).

---

## 6. Offene Punkte & Übergabe an Folgetickets

- **Schlüssel-/Datentyp-Entscheidung**
  - Wahl zwischen `INT AUTO_INCREMENT` und `UUID` für Surrogat-IDs → DBM-SCHEMA-05.
  - Länge/Typ der HA-Schlüssel (`entity_id`, `device_id`) in MariaDB.

- **Konkrete SQL/TypeORM-Definitionen**
  - Umsetzung dieser Tabellen in TypeORM-Entities → DBM-SCHEMA-03.
  - Join-Tabellen und Many-to-Many-Relationen in Entities → DBM-SCHEMA-04.

- **Migration & Dual-Write**
  - Mapping-Regeln Mongo→MariaDB (inkl. ObjectId-Konvertierung) → DBM-SCHEMA-05, DBM-MIG-03/05.
  - Migrationsstrategie, Staging-Läufe, Validierung → DBM-MIG-* Tickets.

- **Abgleich mit tatsächlicher Nutzung**
  - Feinjustierung nach Analyse realer Query-Pattern (z.B. häufige Filter auf bestimmten HA-Attributen) kann zusätzliche Indizes oder Strukturänderungen erfordern.

Dieses Dokument erfüllt den Auftrag von LUD28-57, indem es ein konsistentes, normalisiertes relationales ER-Modell auf Basis der bestehenden Mongo-Schemata definiert und die erforderlichen Relationen/Join-Tabellen beschreibt.
