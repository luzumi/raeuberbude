# Entity-Relationship-Diagramm (ER-Diagramm)

**Projekt:** Raeuberbude - MongoDB → MariaDB/PostgreSQL Migration  
**Ticket:** LUD28-107 (LUD28-59.2)  
**Stand:** 2025-12-03

---

## Übersicht

Dieses Diagramm zeigt die Beziehungen zwischen allen Entities im finalen relationalen Schema.

**Legende:**
- **PK**: Primary Key (UUID oder Natural Key)
- **FK**: Foreign Key
- **1:1**: Eins-zu-eins Beziehung
- **1:n**: Eins-zu-viele Beziehung
- **m:n**: Viele-zu-viele Beziehung (via Join-Tabelle)

---

## Mermaid ER-Diagramm

```mermaid
erDiagram
    %% ============================================
    %% Auth & User Management
    %% ============================================
    
    USERS ||--|| USER_RIGHTS : "has"
    USERS ||--o{ SPEECH_HUMAN_INPUTS : "creates"
    USERS ||--o{ SPEECH_TEST_INPUTS : "creates"
    USERS ||--o{ SPEECH_TRANSCRIPTS : "owns"
    USERS ||--o{ EVENT_LOGS : "generates"
    USERS }o--o{ APP_TERMINALS : "allowed via user_allowed_terminals"
    USERS ||--o| HA_PERSONS : "linked to"
    USERS ||--o{ APP_TERMINALS : "assigned to (primary user)"
    
    USER_RIGHTS }o--o{ APP_TERMINALS : "allowed via user_allowed_terminals"
    
    %% ============================================
    %% Terminals
    %% ============================================
    
    APP_TERMINALS ||--|| TERMINAL_RIGHTS : "has"
    APP_TERMINALS ||--o{ SPEECH_HUMAN_INPUTS : "receives"
    APP_TERMINALS ||--o{ SPEECH_TRANSCRIPTS : "processes"
    APP_TERMINALS ||--o{ INTENT_LOGS : "logs"
    
    %% ============================================
    %% Speech & Input
    %% ============================================
    
    SPEECH_HUMAN_INPUTS }o--|| USERS : "optional user"
    SPEECH_HUMAN_INPUTS }o--|| APP_TERMINALS : "optional terminal"
    
    SPEECH_TEST_INPUTS }o--|| USERS : "optional user"
    
    %% ============================================
    %% Logging & Categories
    %% ============================================
    
    CATEGORIES ||--o{ INTENT_LOGS : "categorizes"
    CATEGORIES ||--o{ SPEECH_TRANSCRIPTS : "categorizes"
    
    INTENT_LOGS }o--|| CATEGORIES : "belongs to"
    INTENT_LOGS }o--|| APP_TERMINALS : "from terminal"
    
    SPEECH_TRANSCRIPTS }o--|| USERS : "optional user"
    SPEECH_TRANSCRIPTS }o--|| APP_TERMINALS : "optional terminal"
    SPEECH_TRANSCRIPTS }o--|| CATEGORIES : "optional category"
    SPEECH_TRANSCRIPTS }o--|| HA_AREAS : "assigned to area"
    SPEECH_TRANSCRIPTS }o--|| HA_ENTITIES : "assigned to entity"
    
    EVENT_LOGS }o--|| USERS : "optional user"
    
    %% ============================================
    %% HomeAssistant Core
    %% ============================================
    
    HA_SNAPSHOTS ||--o{ HA_ENTITY_STATES : "contains"
    
    HA_AREAS ||--o{ HA_DEVICES : "contains"
    HA_AREAS ||--o{ HA_ENTITIES : "contains"
    
    HA_DEVICES ||--o{ HA_ENTITIES : "contains"
    HA_DEVICES }o--|| HA_AREAS : "belongs to"
    HA_DEVICES }o--o| HA_DEVICES : "via device (self-reference)"
    
    HA_ENTITIES }o--|| HA_AREAS : "belongs to"
    HA_ENTITIES }o--|| HA_DEVICES : "belongs to"
    HA_ENTITIES ||--o{ HA_ENTITY_STATES : "has states"
    
    HA_ENTITY_STATES }o--|| HA_ENTITIES : "of entity"
    HA_ENTITY_STATES }o--|| HA_SNAPSHOTS : "in snapshot"
    HA_ENTITY_STATES ||--o{ HA_ENTITY_ATTRIBUTES : "has attributes"
    
    HA_ENTITY_ATTRIBUTES }o--|| HA_ENTITY_STATES : "belongs to state"
    
    %% ============================================
    %% HomeAssistant Extended
    %% ============================================
    
    HA_PERSONS }o--|| USERS : "optional user"
    HA_PERSONS }o--o{ HA_ZONES : "in zones via ha_zone_persons"
    
    HA_ZONES }o--o{ HA_PERSONS : "contains via ha_zone_persons"
    
    %% ============================================
    %% Entity Definitions
    %% ============================================
    
    USERS {
        uuid id PK
        string username UK "UNIQUE"
        string email UK "UNIQUE"
        string password_hash
        jsonb profile_data
        timestamp created_at
        timestamp updated_at
    }
    
    USER_RIGHTS {
        uuid user_id PK_FK "PK + FK to users"
        enum role "admin, manager, regular, guest, terminal"
        enum status "active, suspended, revoked"
        timestamp expires_at
        jsonb permissions_json
        boolean can_use_speech_input
        boolean can_view_own_inputs
        boolean can_view_all_inputs
        boolean can_delete_inputs
        boolean can_manage_terminals
        boolean can_manage_users
        jsonb metadata
        timestamp created_at
        timestamp updated_at
    }
    
    APP_TERMINALS {
        uuid id PK
        string terminal_id UK "UNIQUE"
        string name
        text description
        enum type "browser, mobile, tablet, kiosk, smart-tv"
        text location
        jsonb capabilities_json
        enum status "active, inactive, maintenance"
        timestamp last_active_at
        uuid assigned_user_id FK
        jsonb allowed_actions_json
        jsonb settings_json
        jsonb metadata_json
        timestamp created_at
        timestamp updated_at
    }
    
    TERMINAL_RIGHTS {
        uuid terminal_id PK_FK "PK + FK to app_terminals"
        string role_key
        enum status "active, suspended, maintenance"
        jsonb allowed_actions_json
        jsonb restrictions_json
        jsonb metadata_json
        timestamp created_at
        timestamp updated_at
    }
    
    SPEECH_HUMAN_INPUTS {
        uuid id PK
        uuid user_id FK
        uuid terminal_id FK
        text text
        string language
        float confidence
        jsonb metadata
        timestamp created_at
        timestamp updated_at
    }
    
    SPEECH_TEST_INPUTS {
        uuid id PK
        uuid user_id FK
        text text
        text expected_intent
        text actual_intent
        boolean passed
        jsonb metadata
        timestamp created_at
        timestamp updated_at
    }
    
    CATEGORIES {
        uuid id PK
        string key UK "UNIQUE"
        string label
        text description
        timestamp created_at
    }
    
    INTENT_LOGS {
        uuid id PK
        timestamp timestamp
        text transcript
        string intent_key
        text summary
        jsonb keywords_json
        float confidence
        uuid terminal_id FK
        uuid category_id FK
        timestamp created_at
    }
    
    SPEECH_TRANSCRIPTS {
        uuid id PK
        uuid user_id FK
        uuid terminal_id FK
        uuid category_id FK
        text transcript
        text recognized_intent
        float confidence
        string assigned_area_id FK
        string assigned_entity_id FK
        jsonb metadata
        timestamp created_at
        timestamp updated_at
    }
    
    EVENT_LOGS {
        uuid id PK
        timestamp timestamp
        enum type "websocket, action, error, info, debug"
        text message
        uuid user_id FK
        jsonb metadata
        timestamp created_at
    }
    
    LLM_INSTANCES {
        uuid id PK
        string name UK "UNIQUE"
        enum provider "openai, anthropic, google, huggingface, ollama, custom"
        string model
        string endpoint_url
        enum status "active, inactive, deprecated"
        jsonb default_parameters
        text description
        timestamp created_at
        timestamp updated_at
    }
    
    HA_SNAPSHOTS {
        uuid id PK
        timestamp timestamp
        string ha_version
        timestamp import_date
        enum status "pending, processing, completed, failed"
        text error_log
        timestamp created_at
    }
    
    HA_AREAS {
        uuid id PK
        string area_id UK "UNIQUE, Natural Key"
        string name
        jsonb aliases
        string floor
        string icon
        timestamp created_at
        timestamp updated_at
    }
    
    HA_DEVICES {
        uuid id PK
        string device_id UK "UNIQUE, Natural Key"
        string name
        string manufacturer
        string model
        string sw_version
        string configuration_url
        jsonb connections
        jsonb identifiers
        string via_device_id FK "Self-reference"
        string area_id FK
        timestamp created_at
        timestamp updated_at
    }
    
    HA_ENTITIES {
        string entity_id PK "Natural Key"
        enum domain "light, switch, sensor, ..."
        string object_id
        string friendly_name
        jsonb aliases
        string icon
        string device_class
        string unit_of_measurement
        string area_id FK
        string device_id FK
        string platform
        boolean disabled
        boolean hidden
        jsonb entity_category
        timestamp created_at
        timestamp updated_at
    }
    
    HA_ENTITY_STATES {
        uuid id PK
        string entity_id FK
        uuid snapshot_id FK
        string state
        timestamp last_changed
        timestamp last_updated
        timestamp created_at
    }
    
    HA_ENTITY_ATTRIBUTES {
        uuid id PK
        uuid state_id FK
        string key
        text value
        enum value_type "string, number, boolean, array, object, null"
        timestamp created_at
    }
    
    HA_PERSONS {
        string person_id PK "Natural Key"
        string name
        string device_trackers
        text picture
        uuid user_id FK
        timestamp created_at
        timestamp updated_at
    }
    
    HA_ZONES {
        string entity_id PK "Natural Key"
        string name
        decimal latitude
        decimal longitude
        integer radius
        string icon
        boolean passive
        timestamp created_at
        timestamp updated_at
    }
```

---

## Domänen-Übersicht

### 1. Auth & User Management (Blau)
- `USERS` - Zentrale Benutzerverwaltung
- `USER_RIGHTS` - Rollen und Berechtigungen
- M:N über `USER_ALLOWED_TERMINALS`

### 2. Terminals (Grün)
- `APP_TERMINALS` - Endgeräte-Verwaltung
- `TERMINAL_RIGHTS` - Terminal-spezifische Rechte

### 3. Speech & Input (Gelb)
- `SPEECH_HUMAN_INPUTS` - Echte Benutzereingaben
- `SPEECH_TEST_INPUTS` - Test-/Validierungseingaben

### 4. Logging (Orange)
- `CATEGORIES` - Kategorisierung
- `INTENT_LOGS` - Intent-Historie
- `SPEECH_TRANSCRIPTS` - Transkriptions-Log
- `EVENT_LOGS` - System-Events

### 5. HomeAssistant Core (Lila)
- `HA_SNAPSHOTS` - Zeitpunkt-Snapshots
- `HA_AREAS` - Räume/Bereiche
- `HA_DEVICES` - Physische Geräte
- `HA_ENTITIES` - HA-Entitäten
- `HA_ENTITY_STATES` - Zeitpunkt-States
- `HA_ENTITY_ATTRIBUTES` - EAV-Pattern für Attribute

### 6. HomeAssistant Extended (Türkis)
- `HA_PERSONS` - Personen in HA
- `HA_ZONES` - Geofencing-Zonen
- M:N über `HA_ZONE_PERSONS`

### 7. LLM (Grau)
- `LLM_INSTANCES` - LLM-Konfiguration

---

## Join-Tabellen (M:N)

### `user_allowed_terminals`
```sql
CREATE TABLE user_allowed_terminals (
  user_id UUID NOT NULL,
  terminal_id UUID NOT NULL,
  granted_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (user_id, terminal_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (terminal_id) REFERENCES app_terminals(id) ON DELETE CASCADE
);
```

### `ha_zone_persons`
```sql
CREATE TABLE ha_zone_persons (
  person_id VARCHAR(255) NOT NULL,
  zone_entity_id VARCHAR(255) NOT NULL,
  PRIMARY KEY (person_id, zone_entity_id),
  FOREIGN KEY (person_id) REFERENCES ha_persons(person_id) ON DELETE CASCADE,
  FOREIGN KEY (zone_entity_id) REFERENCES ha_zones(entity_id) ON DELETE CASCADE
);
```

---

## Referentielle Integrität

### CASCADE-Regeln

| Relation | ON DELETE | ON UPDATE | Rationale |
|----------|-----------|-----------|-----------|
| `users` → `user_rights` | `CASCADE` | `CASCADE` | Rechte gehören zum User |
| `users` → `speech_*` | `SET NULL` | `CASCADE` | Pseudonymisierung (DSGVO) |
| `terminals` → `terminal_rights` | `CASCADE` | `CASCADE` | Rechte gehören zum Terminal |
| `terminals` → `speech_*` | `SET NULL` | `CASCADE` | Pseudonymisierung |
| `snapshots` → `entity_states` | `CASCADE` | `CASCADE` | States ohne Snapshot nutzlos |
| `entity_states` → `attributes` | `CASCADE` | `CASCADE` | Attributes ohne State nutzlos |
| `areas/devices` → `entities` | `SET NULL` | `CASCADE` | Entity bleibt ohne Area/Device |

---

## Indexierungs-Strategie

### Primärschlüssel (automatisch indexiert)
- Alle `id`-Spalten (UUID)
- Natürliche Schlüssel (`entity_id`, `area_id`, `device_id`, etc.)

### Foreign Keys (explizit indexiert)
- Alle FK-Spalten für JOIN-Performance

### Unique Constraints (automatisch indexiert)
- `username`, `email`, `terminal_id`, `area_id`, `device_id`, etc.

### Zeitstempel (explizit indexiert)
- `created_at`, `timestamp`, `last_active_at` für Zeitreihen-Queries

### Status/Enum (explizit indexiert)
- `role`, `status`, `domain` für häufige Filterung

---

## Datenvolumen-Schätzung (Produktiv)

| Tabelle | Zeilen | Wachstum | Speicher |
|---------|--------|----------|----------|
| `users` | ~10 | Langsam | < 1 MB |
| `app_terminals` | ~5 | Langsam | < 1 MB |
| `ha_entities` | ~200 | Mittel | ~100 KB |
| `ha_entity_states` | ~1M/Jahr | Schnell | ~500 MB/Jahr |
| `speech_transcripts` | ~10K/Monat | Schnell | ~10 MB/Monat |
| `intent_logs` | ~5K/Monat | Schnell | ~5 MB/Monat |

**Gesamt (Jahr 1):** ~600 MB  
**Retention-Strategie:** States/Logs > 1 Jahr archivieren

---

**Diagramm erstellt:** 2025-12-03  
**Ticket:** LUD28-107 ✅  
**Tool:** Mermaid.js (https://mermaid.js.org/)

