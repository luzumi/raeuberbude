# LUD28-59 Ticket-Übersicht

**Epic:** DBM-EPIC-SCHEMA  
**Parent Ticket:** [LUD28-59](https://luzumi.youtrack.cloud/issue/LUD28-59) - DBM-SCHEMA-03 – TypeORM-Entities für Kern-Domänenmodelle

---

## 📊 Ticket-Struktur

```
LUD28-59 (Parent)
├── LUD28-106 (LUD28-59.1) ✅ Vorbereitung & Scope
├── LUD28-107 (LUD28-59.2) ✅ Entity- & Relations-Design
├── LUD28-??? (LUD28-59.3) ⏳ Entity Implementation [DIESES TICKET]
├── LUD28-??? (LUD28-59.4) 📅 Migrations
└── LUD28-??? (LUD28-59.5) 📅 Testing
```

---

## ✅ LUD28-106 (LUD28-59.1) - Vorbereitung

**Status:** ✅ Abgeschlossen  
**Dauer:** 2 Tage  
**Datum:** 2025-11-28 bis 2025-11-29

### Deliverables
- ✅ [LUD28-59-prep-checklist.md](./LUD28-59-prep-checklist.md)
- ✅ [database/README.md](../../database/README.md)
- ✅ Scope-Definition (18 Entities)
- ✅ PK-Strategie (UUID als Surrogat-PK)

### Highlights
- **Entscheidung:** UUID für alle Entities (inkl. HA-Tabellen)
- **Strategie:** Natürliche Schlüssel → UNIQUE-Constraints
- **18 Kern-Entities** definiert (PoC-Scope)

---

## ✅ LUD28-107 (LUD28-59.2) - Entity- & Relations-Design

**Status:** ✅ Abgeschlossen  
**Dauer:** 5 Tage  
**Datum:** 2025-11-30 bis 2025-12-03

### Deliverables
- ✅ [database/DBM-SCHEMA-03-TypeORM-Mapping.md](../../database/DBM-SCHEMA-03-TypeORM-Mapping.md) (finalisiert)
- ✅ [database/entities-spec/](../../database/entities-spec/) (4 detaillierte Specs)
  - `auth/user.entity.spec.md`
  - `auth/user-rights.entity.spec.md`
  - `terminals/app-terminal.entity.spec.md`
  - `homeassistant/ha-entity.entity.spec.md`
- ✅ [docs/design-review/erd-diagram-lud28-107.md](../../docs/design-review/erd-diagram-lud28-107.md) (Mermaid ERD)
- ✅ [docs/design-review/LUD28-107-review-notes.md](../../docs/design-review/LUD28-107-review-notes.md) (Review)

### Highlights
- **21 Entities** vollständig spezifiziert
- **FK-Naming-Konvention:** `fk_<from>__<to>__<column>`
- **ERD-Diagramm** erstellt (Mermaid)
- **Design-Review:** ✅ APPROVED für Implementation

### Offene Entscheidungen
- ✅ UUID vs. INT → **UUID gewählt**
- ✅ JSONB vs. EAV → **Hybrid-Ansatz**
- ✅ Natural vs. Surrogate Keys (HA) → **Surrogate + UNIQUE**
- ⚠️ DB-Wahl (PostgreSQL vs. MariaDB) → **Noch offen**

---

## ⏳ LUD28-59.3 - Entity Implementation [AKTUELL]

**Status:** 📋 Ready to Start  
**Estimate:** 8-10 Tage  
**Branch:** `feature/LUD28-59.3-entity-implementation`

### Dokumente
- 📄 [LUD28-59.3-implementation-plan.md](./LUD28-59.3-implementation-plan.md) (Vollständiger Plan)
- 📄 [LUD28-59.3-youtrack-ticket.md](./LUD28-59.3-youtrack-ticket.md) (Ticket-Beschreibung)

### Ziel
Vollständige Implementierung aller **18 TypeORM-Entities** in NestJS.

### Scope
1. **Phase 1a:** Auth-Domäne (User, UserRights, UserAllowedTerminal)
2. **Phase 1b:** Terminals-Domäne (AppTerminal, TerminalRights)
3. **Phase 2:** Speech & Logging (6 Entities)
4. **Phase 3:** HomeAssistant (6 Entities)
5. **Phase 4:** Module-Integration & Validierung

### Deliverables
- [ ] 18 Entity-Dateien (`*.entity.ts`)
- [ ] Enum-Definitionen
- [ ] Module-Registrierungen
- [ ] TypeScript-Compilation erfolgreich
- [ ] Entity-Verification-Script

### Akzeptanzkriterien
- [ ] Alle Entities implementiert
- [ ] FK-Naming-Konvention eingehalten
- [ ] `npm run build` ohne Fehler
- [ ] JSDoc-Dokumentation

---

## 📅 LUD28-59.4 - Migrations (geplant)

**Status:** 🔜 Wartet auf LUD28-59.3  
**Estimate:** 3-5 Tage

### Ziel
TypeORM-Migrations für alle Entities erstellen und ausführen.

### Scope
- [ ] Migration-Scripts generieren (`typeorm migration:generate`)
- [ ] Partitionierung für `ha_entity_states`
- [ ] Index-Optimierung
- [ ] Seed-Daten (Category, HaSnapshot)
- [ ] Migrations-Tests

### Befehle
```bash
npm run migration:generate -- -n InitialSchema
npm run migration:run
npm run migration:revert
```

---

## 📅 LUD28-59.5 - Testing (geplant)

**Status:** 🔜 Wartet auf LUD28-59.4  
**Estimate:** 2-3 Tage

### Ziel
Unit- und Integration-Tests für Entities und Relationen.

### Scope
- [ ] Unit-Tests für Entity-Validierung (class-validator)
- [ ] Integration-Tests für Relations (TypeORM)
- [ ] Performance-Tests für HA-Historie
- [ ] Test-Coverage-Report

---

## 📊 Metriken

### Gesamt-Zeitaufwand

| Ticket | Estimate | Actual | Status |
|--------|----------|--------|--------|
| LUD28-59.1 (Vorbereitung) | 2 Tage | 2 Tage | ✅ Done |
| LUD28-59.2 (Design) | 5 Tage | 5 Tage | ✅ Done |
| LUD28-59.3 (Implementation) | 8-10 Tage | - | ⏳ Pending |
| LUD28-59.4 (Migrations) | 3-5 Tage | - | 📅 Planned |
| LUD28-59.5 (Testing) | 2-3 Tage | - | 📅 Planned |
| **Gesamt** | **20-25 Tage** | **7 Tage** | - |

### Entity-Übersicht (18 Entities)

| Domäne | Entities | Status |
|--------|----------|--------|
| **Auth** | User, UserRights, UserAllowedTerminal | ⏳ Spec ✅, Code ⏳ |
| **Terminals** | AppTerminal, TerminalRights | ⏳ Spec ✅, Code ⏳ |
| **Speech** | SpeechHumanInput, SpeechTestInput | ⏳ Spec ⏳, Code ⏳ |
| **Logging** | Category, IntentLog, SpeechTranscript, EventLog | ⏳ Spec ⏳, Code ⏳ |
| **HomeAssistant** | HaSnapshot, HaArea, HaDevice, HaEntity, HaEntityState, HaEntityAttribute | ⏳ Spec ✅ (1/6), Code ⏳ |

**Legende:**
- ✅ = Abgeschlossen
- ⏳ = In Arbeit / Bereit
- 📅 = Geplant

---

## 🔗 Nächste Schritte

1. **YouTrack-Ticket erstellen** für LUD28-59.3
   - Inhalt: [LUD28-59.3-youtrack-ticket.md](./LUD28-59.3-youtrack-ticket.md)
   - Labels: `backend`, `typeorm`, `database`, `entities`, `implementation`
   - Assignee: TBD

2. **Branch erstellen**
   ```bash
   git checkout -b feature/LUD28-59.3-entity-implementation
   ```

3. **Dependencies installieren**
   ```bash
   cd backend/nest-app
   npm install @nestjs/typeorm typeorm mysql2 class-validator class-transformer
   ```

4. **Phase 1a starten** (Auth-Domäne)
   - Siehe [LUD28-59.3-implementation-plan.md](./LUD28-59.3-implementation-plan.md)

---

## 📚 Referenzen

### Design-Dokumente
- [DBM-SCHEMA-01](../../database/DBM-SCHEMA-01-Relationales-ER-Modell-und-Normalisierung.md) (Relationales Modell)
- [DBM-SCHEMA-02](../../database/DBM-SCHEMA-02-Schluessel-Indizes-Constraints.md) (Schlüssel & Constraints)
- [DBM-SCHEMA-03](../../database/DBM-SCHEMA-03-TypeORM-Mapping.md) (TypeORM-Mapping)

### Specs & Diagramme
- [database/entities-spec/](../../database/entities-spec/) (Entity-Spezifikationen)
- [docs/design-review/erd-diagram-lud28-107.md](../../docs/design-review/erd-diagram-lud28-107.md) (ERD)
- [docs/design-review/LUD28-107-review-notes.md](../../docs/design-review/LUD28-107-review-notes.md) (Review)

### Zusammenfassungen
- [database/LUD28-107-ZUSAMMENFASSUNG.md](../../database/LUD28-107-ZUSAMMENFASSUNG.md) (LUD28-107 Summary)

---

**Erstellt:** 2025-12-03  
**Letzte Aktualisierung:** 2025-12-03  
**Version:** 1.0

