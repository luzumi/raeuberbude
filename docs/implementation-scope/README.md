# Implementation Scope - LUD28-59

**Epic:** DBM-EPIC-SCHEMA  
**Parent Ticket:** [LUD28-59](https://luzumi.youtrack.cloud/issue/LUD28-59) - DBM-SCHEMA-03 – TypeORM-Entities für Kern-Domänenmodelle

---

## 📋 Preparation Checklist

**Dokument:** [LUD28-59-prep-checklist.md](./LUD28-59-prep-checklist.md)  
**Ticket:** [LUD28-106](https://luzumi.youtrack.cloud/issue/LUD28-106) (LUD28-59.1)  
**Status:** ✅ Abgeschlossen

### Inhalt:
1. **Dokumenten-Review**
   - DBM-SCHEMA-01 (Relationales Modell)
   - DBM-SCHEMA-02 (Schlüssel & Constraints)
   - HA database-design.md (Referenz-Implementierung)
   
2. **Identifizierte Abweichungen**
   - PK-Strategie (Natürlich vs. Surrogat)
   - Datentyp-Unterschiede (UUID vs. String)
   
3. **Ziel-Entitäten & Prioritäten**
   - PoC-Scope: 18 Kern-Entities
   - Full-Scope: weitere 10 Entities
   
4. **PK/FK-Strategie**
   - **Entscheidung:** UUID als Surrogat-PK für alle Entities
   - Natürliche Schlüssel → UNIQUE-Constraints
   
5. **Risiken & Offene Punkte**
   - DB-Wahl (PostgreSQL vs. MariaDB)
   - Datenmigration-Strategie
   - CI-Setup für DB-Tests

---

## 🎯 Scope-Definition

### PoC-Scope (Phase 1) - 18 Entities

#### Priorität 1: Auth & Permissions (Woche 1)
1. ✅ `User` - Benutzerkonto
2. ✅ `UserRights` - Rollenbasierte Berechtigungen
3. ✅ `UserAllowedTerminal` - M:N Users ↔ Terminals

#### Priorität 2: Terminals & Speech Input (Woche 1-2)
4. ✅ `AppTerminal` - Client-Registrierung
5. ✅ `TerminalRights` - Terminal-spezifische Rechte
6. ✅ `SpeechHumanInput` - User-Spracheingaben
7. ✅ `SpeechTestInput` - Test-Daten

#### Priorität 3: Logging & Kategorisierung (Woche 2)
8. ✅ `Category` - Zentrale Kategorien
9. ✅ `SpeechTranscript` - Transkriptions-Historie
10. ✅ `IntentLog` - Intent-Erkennungs-Logs
11. ✅ `EventLog` - Allgemeine Event-Logs

#### Priorität 4: HA-Stammdaten (Woche 2-3)
12. ✅ `HaSnapshot` - Import-Snapshots
13. ✅ `HaArea` - Räume/Bereiche
14. ✅ `HaDevice` - Geräte
15. ✅ `HaEntity` - Zentrale Entity-Tabelle
16. ✅ `HaEntityState` - Historisierte Zustände
17. ✅ `HaEntityAttribute` - Flexible Attribute (EAV)

### Full Scope (Phase 2+) - Weitere 10+ Entities

#### HA-Erweiterte Entitäten
18. ⏳ `HaService` - Service-Definitionen
19. ⏳ `HaPerson` - Personen + Device Tracker
20. ⏳ `HaZone` - Zonen
21. ⏳ `HaZonePerson` - M:N Zonen ↔ Personen
22. ⏳ `HaMediaPlayer` - Media Player
23. ⏳ `HaMediaPlayerGroupMember` - Media Player Gruppen (self M:N)
24. ⏳ `HaAutomation` - Automationen

#### Erweiterte Auth & Dimensionen
25. ⏳ `UserRole` - Rollen-Definitionen
26. ⏳ `UserPermission` - Permissions-Definitionen
27. ⏳ `LlmInstance` - LLM-Konfigurationen

---

## 🔑 Wichtige Entscheidungen

### PK-Strategie

**Entscheidung:** UUID als Surrogat-PK für **alle** Entities (inkl. HA-Tabellen)

**Begründung:**
- ✅ Konsistenz über alle Entities
- ✅ Verteilungs-freundlich (kein Zentral-ID-Generator)
- ✅ Kompatibel mit PostgreSQL/MariaDB
- ✅ Einfachere TypeORM-Handhabung
- ✅ Zukunftssicherheit (Soft Deletes, Audit-Trails)

**Implementation:**
```typescript
@PrimaryGeneratedColumn('uuid')
id: string;
```

### HA-Tabellen: Natürliche Schlüssel

**Strategie:** Surrogat-PK + UNIQUE-Constraint auf natürlichen Keys

**Beispiel:**
```typescript
@Entity('ha_entities')
export class HaEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true, length: 255, name: 'entity_id' })
  @Index('uq_ha_entities__entity_id', { unique: true })
  entityId: string; // z.B. 'light.living_room'
  
  // ...
}
```

**Begründung:**
- FKs referenzieren Surrogat-IDs (Performance)
- Business Logic nutzt natürliche Keys
- Index auf `entity_id` für schnelle Lookups

---

## 📦 Deliverables

### LUD28-59.1 (Vorbereitung) ✅
- [x] `LUD28-59-prep-checklist.md` (dieses Verzeichnis)
- [x] `database/DBM-SCHEMA-03-TypeORM-Mapping.md` (Draft)
- [x] `database/README.md` (Übersicht)

### LUD28-59.2 (Design) ✅
- [x] `database/entities-spec/*.md` (Per-Entity Specs)
- [x] `docs/design-review/erd-diagram-lud28-107.md` (Mermaid ERD)
- [x] `database/DBM-SCHEMA-03-TypeORM-Mapping.md` (Final)
- [x] `docs/design-review/LUD28-107-review-notes.md` (Review & Freigabe)

### LUD28-59.3 (Implementation) ⏳
**Dokument:** [LUD28-59.3-implementation-plan.md](./LUD28-59.3-implementation-plan.md)  
**Ticket:** TBD (LUD28-59.3)  
**Status:** 📋 Ready to Start

- [ ] `backend/nest-app/src/modules/*/entities/*.entity.ts` (18 Entities)
- [ ] Enum-Definitionen
- [ ] Module-Registrierungen
- [ ] TypeScript-Kompilierung erfolgreich
- [ ] Entity-Verification-Script

### LUD28-59.4 (Migrations) ⏳
- [ ] `backend/nest-app/src/migrations/*.ts`
- [ ] Migration-Scripts (package.json)

---

## 🚧 Offene Punkte & Risiken

### Kritische Entscheidungen

| # | Thema | Status | Owner | Deadline |
|---|-------|--------|-------|----------|
| 1 | UUID vs. INT für PKs | ✅ Entschieden: UUID | @backend-team | - |
| 2 | Natürliche vs. Surrogat-PKs (HA) | ✅ Entschieden: Surrogat + UNIQUE | @backend-team | - |
| 3 | DB-Wahl (PostgreSQL vs. MariaDB) | ⚠️ Offen | @ops-team | vor 59.3 |
| 4 | Datenmigration-Strategie | 🔴 Offen – Follow-up Ticket | @backend-team | vor 59.7 |
| 5 | CI-Setup für DB-Migrations-Tests | ⚠️ Offen | @devops-team | vor 59.5 |

### Top-3 Risiken

1. **Fehlende Datenmigrationsstrategie**
   - **Risiko:** Bestehende Mongo-Daten können nicht übertragen werden
   - **Mitigation:** Follow-up Ticket LUD28-110 anlegen
   - **Priorität:** High (vor Deployment)

2. **TypeORM-Version & Breaking Changes**
   - **Risiko:** TypeORM 0.3.x hat Breaking Changes zu 0.2.x
   - **Mitigation:** Version in `package.json` festlegen
   - **Priorität:** Medium

3. **Performance HA-Attribute (EAV-Modell)**
   - **Risiko:** `ha_entity_attributes` kann sehr groß werden
   - **Mitigation:** Zusammengesetzte Indizes, JSONB-Alternative evaluieren
   - **Priorität:** Medium (erst ab 59.5 messbar)

---

## 🔗 Verwandte Dokumente

- **[database/README.md](../database/README.md)** - Schema-Dokumentation Übersicht
- **[database/DBM-SCHEMA-01](../database/DBM-SCHEMA-01-Relationales-ER-Modell-und-Normalisierung.md)** - Relationales Modell
- **[database/DBM-SCHEMA-02](../database/DBM-SCHEMA-02-Schluessel-Indizes-Constraints.md)** - Schlüssel & Constraints
- **[database/DBM-SCHEMA-03](../database/DBM-SCHEMA-03-TypeORM-Mapping.md)** - TypeORM-Mapping (Draft)

---

## 📈 Progress Tracking

### Phase 1: Vorbereitung & Design
- [x] **59.1** - Preparation & Scope (0.5d) ✅
- [ ] **59.2** - Entity- & Relations-Design (1d)

### Phase 2: Implementierung
- [ ] **59.3** - TypeORM-Entities erstellen (5d)
- [ ] **59.4** - Migrations erstellen (2d)

### Phase 3: Tests & Deployment
- [ ] **59.5** - Tests & Validierung (2d)
- [ ] **59.6** - Review & PR (1d)
- [ ] **59.7** - Deployment/Staging (1d)

**Fortschritt:** 1/7 Phasen abgeschlossen (14%)

---

**Erstellt:** 2025-12-03  
**Letzte Aktualisierung:** 2025-12-03  
**Autor:** GitHub Copilot (AI Agent)

