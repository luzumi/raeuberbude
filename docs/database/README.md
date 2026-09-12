# Database Schema Documentation

**Projekt:** Raeuberbude - MongoDB → MariaDB/PostgreSQL Migration  
**Epic:** DBM-EPIC-SCHEMA  
**Status:** 🔶 In Arbeit (Phase 1: Vorbereitung abgeschlossen)

---

## 📚 Dokumentationsstruktur

### Phase 1: Konzeptionelles Modell

| Dokument | Status | Beschreibung | Ticket |
|----------|--------|--------------|--------|
| **[DBM-SCHEMA-01](DBM-SCHEMA-01-Relationales-ER-Modell-und-Normalisierung.md)** | ✅ Fertig | Relationales ER-Modell, Entitäten, Beziehungen, Normalisierung | LUD28-57 |
| **[DBM-SCHEMA-02](DBM-SCHEMA-02-Schluessel-Indizes-Constraints.md)** | ✅ Fertig | Schlüsselstrategie, FK-Definitionen, Constraints, Indizes | LUD28-58 |
| **[DBM-SCHEMA-03](DBM-SCHEMA-03-TypeORM-Mapping.md)** | 🔶 Draft | TypeORM-Entity-Definitionen, Decorators, Migrations-Hinweise | LUD28-59.1 (LUD28-106) |

### Phase 2: Technische Spezifikation (geplant)

| Dokument | Status | Beschreibung | Ticket |
|----------|--------|--------------|--------|
| **DBM-SCHEMA-04** | ⏳ Geplant | Detaillierte Entity-Specs pro Domäne | LUD28-59.2 (LUD28-107) |
| **DBM-SCHEMA-05** | ⏳ Geplant | Datentyp-Definitionen (INT vs UUID, VARCHAR-Längen) | TBD |
| **DBM-SCHEMA-06** | ⏳ Geplant | Migrations-Strategie & Rollback-Pläne | LUD28-59.4 (LUD28-109) |

### Ergänzende Spezifikationen

| Dokument | Beschreibung |
|----------|--------------|
| **[backend/.../homeassistant/schemas/database-design.md](../backend/nest-app/src/modules/homeassistant/schemas/database-design.md)** | PostgreSQL-orientiertes HA-Modell (Referenz) |
| **[docs/implementation-scope/LUD28-59-prep-checklist.md](../implementation-scope/LUD28-59-prep-checklist.md)** | Preparation Checklist für LUD28-59 |

---

## 🎯 Aktuelle Phase: LUD28-59 (TypeORM-Entities)

### ✅ Abgeschlossen: LUD28-59.1 (Vorbereitung)

**Deliverables:**
- ✅ Preparation Checklist (`docs/implementation-scope/LUD28-59-prep-checklist.md`)
- ✅ Draft TypeORM-Mapping (`DBM-SCHEMA-03-TypeORM-Mapping.md`)

**Entscheidungen:**
- **PK-Strategie:** UUID als Surrogat-PK für alle Entities
- **HA-Tabellen:** Surrogat-PK + UNIQUE-Constraints auf natürlichen Keys
- **PoC-Scope:** 18 Kern-Entities definiert

### ⏳ In Arbeit: LUD28-59.2 (Design-Phase)

**Ziele:**
- Finalisierung Entity-Definitionen
- Ergänzung fehlender Entities (HA-erweitert, LLM, Dimensionstabellen)
- Design-Review & Freigabe

---

## 📊 Entity-Übersicht (PoC-Scope)

### 1️⃣ Auth & Permissions (3 Entities)
- `User` - Benutzerkonto
- `UserRights` - Rechte & Rollen (1:1 zu User)
- `UserAllowedTerminal` - M:N User ↔ Terminal

### 2️⃣ Terminals & Speech (4 Entities)
- `AppTerminal` - Client-Registrierung
- `TerminalRights` - Terminal-Rechte (1:1 zu Terminal)
- `SpeechHumanInput` - Spracheingaben
- `SpeechTestInput` - Test-Daten

### 3️⃣ Logging & Kategorisierung (4 Entities)
- `Category` - Kategorien für Intents/Transcripts
- `IntentLog` - Intent-Erkennungs-Historie
- `SpeechTranscript` - Transkriptions-Logs
- `EventLog` - Allgemeine Event-Logs

### 4️⃣ HomeAssistant-Stammdaten (7 Entities)
- `HaSnapshot` - Import-Snapshots
- `HaArea` - Räume/Bereiche
- `HaDevice` - Geräte
- `HaEntity` - Zentrale Entity-Tabelle
- `HaEntityState` - Historisierte Zustände
- `HaEntityAttribute` - Flexible Attribute (EAV)
- *(7 weitere HA-Entities in Full Scope geplant)*

---

## 🔑 Wichtige Konventionen

### Namenskonventionen

```typescript
// Tabellennamen
snake_case: user_allowed_terminals

// Spaltennamen
snake_case: created_at, entity_id

// Constraints
pk_<table>                             // Primary Key
fk_<from>__<to>__<column>              // Foreign Key
uq_<table>__<column>                   // Unique Constraint
ix_<table>__<column>                   // Index
```

### ON DELETE / ON UPDATE Verhalten

| Beziehungstyp | ON DELETE | ON UPDATE |
|--------------|-----------|-----------|
| Logging → User/Terminal | `SET NULL` | `CASCADE` |
| Stammdaten → Abhängige | `CASCADE` | `CASCADE` |
| 1:1 Rechte-Tabellen | `CASCADE` | `CASCADE` |
| M:N Join-Tabellen | `CASCADE` | `CASCADE` |

### TypeORM Base-Pattern

```typescript
@Entity('table_name')
export class EntityName {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // ... columns ...

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // ... relations ...
}
```

---

## 🚀 Roadmap

### Phase 1: Vorbereitung & Design (Wochen 1-2)
- [x] **LUD28-59.1** - Preparation & Scope ✅ (0.5d)
- [ ] **LUD28-59.2** - Entity- & Relations-Design (1d)

### Phase 2: Implementierung (Wochen 2-4)
- [ ] **LUD28-59.3** - TypeORM-Entities erstellen (5d)
- [ ] **LUD28-59.4** - Migrations erstellen (2d)

### Phase 3: Tests & Deployment (Wochen 4-5)
- [ ] **LUD28-59.5** - Tests & Validierung (2d)
- [ ] **LUD28-59.6** - Review & PR (1d)
- [ ] **LUD28-59.7** - Deployment/Staging (1d)

**Gesamt:** ~12.5 Arbeitstage

---

## 🔗 Links

- **YouTrack Epic:** [DBM-EPIC-SCHEMA](https://luzumi.youtrack.cloud/projects/LUD28)
- **Parent Ticket:** [LUD28-59](https://luzumi.youtrack.cloud/issue/LUD28-59) - DBM-SCHEMA-03 – TypeORM-Entities
- **Current Ticket:** [LUD28-106](https://luzumi.youtrack.cloud/issue/LUD28-106) - LUD28-59.1 Vorbereitung

---

## 📝 Changelog

| Datum | Version | Änderung | Autor |
|-------|---------|----------|-------|
| 2025-12-03 | 0.1.0 | Initial Draft, LUD28-59.1 abgeschlossen | GitHub Copilot |
| - | 0.2.0 | Geplant: Finalisierung LUD28-59.2 | TBD |

---

**Hinweis:** Diese Dokumentation ist Teil der Migration von MongoDB zu einer relationalen Datenbank (MariaDB/PostgreSQL) mit TypeORM. Alle Entscheidungen basieren auf den bestehenden Mongo-Schemas und HomeAssistant-Datenmodellen.

