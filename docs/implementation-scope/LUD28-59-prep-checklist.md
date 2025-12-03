# LUD28-59 Preparation Checklist

**Ticket:** LUD28-106 (LUD28-59.1) – Vorbereitung: Review & Scope  
**Datum:** 2025-12-03  
**Status:** In Bearbeitung

---

## 1. Dokumenten-Review

### 1.1 Reviewed Documents

- [x] `database/DBM-SCHEMA-01-Relationales-ER-Modell-und-Normalisierung.md`
  - **Status:** Vollständig gesichtet
  - **Umfang:** 40+ Tabellen/Entitäten definiert
  - **Normalisierung:** 3NF-konform, klare Domänentrennung
  - **Besonderheiten:** 
    - Mongo-abgeleitete Tabellen mit Surrogat-Keys
    - HA-Tabellen mit natürlichen Schlüsseln
    - EAV-Pattern für flexible HA-Attribute

- [x] `database/DBM-SCHEMA-02-Schluessel-Indizes-Constraints.md`
  - **Status:** Vollständig gesichtet
  - **Umfang:** Detaillierte PK/FK/Index-Definitionen für alle Tabellen
  - **Konventionen:** 
    - `pk_<table>`, `fk_<from>__<to>__<column>`, `uq_<table>__<column>`, `ix_<table>__<column>`
  - **Referentielle Integrität:** ON DELETE/ON UPDATE Regeln definiert

- [x] `backend/nest-app/src/modules/homeassistant/schemas/database-design.md`
  - **Status:** Vollständig gesichtet
  - **Umfang:** PostgreSQL-orientiertes HA-Modell mit UUID-PKs
  - **Abweichungen zu DBM-SCHEMA-01/02:** 
    - Verwendet Surrogat-IDs statt natürlicher PKs
    - Bereits mit TypeORM-kompatiblen Typen (UUID, JSONB, ENUM)
  - **Kompatibilität:** Struktur weitgehend kompatibel, Schlüsselstrategie unterschiedlich

### 1.2 Identifizierte Abweichungen

| Aspekt | DBM-SCHEMA-01/02 | HA database-design.md | Empfehlung |
|--------|------------------|----------------------|------------|
| **PK-Strategie HA-Tabellen** | Natürliche Keys (`entity_id`, `area_id`) | Surrogat-UUID `id` + UNIQUE auf natürlichen Keys | **Entscheidung erforderlich** (siehe Abschnitt 3) |
| **Datentyp PK** | Offen (siehe DBM-SCHEMA-05) | UUID | UUID empfohlen für PostgreSQL |
| **EAV-Modell** | `ha_entity_attributes` mit `attribute_key` | Identisch | ✅ Konsistent |
| **Services-Tabelle** | `ha_services` mit `full_name` UNIQUE | Identisch | ✅ Konsistent |
| **Historisierung** | `ha_snapshots` → `ha_entity_states` | Identisch | ✅ Konsistent |

---

## 2. Ziel-Entitäten & Prioritäten

### 2.1 PoC-Scope (Phase 1)

**Ziel:** Minimale funktionierende TypeORM-Entities für kritische Pfade (Auth, Speech, HA-Basics)

#### Priorität 1: Auth & Permissions (Woche 1)
1. ✅ `users` – Basis für alle User-Referenzen
2. ✅ `user_rights` – Rollenbasierte Berechtigungen
3. ✅ `user_allowed_terminals` – M:N Users ↔ Terminals

#### Priorität 2: Terminals & Speech Input (Woche 1-2)
4. ✅ `app_terminals` – Client-Registrierung
5. ✅ `terminal_rights` – Terminal-spezifische Rechte
6. ✅ `terminal_allowed_users` – M:N Terminals ↔ Users (evtl. identisch zu #3)
7. ✅ `speech_human_inputs` – User-Spracheingaben
8. ✅ `speech_test_inputs` – Test-Daten

#### Priorität 3: Logging & Kategorisierung (Woche 2)
9. ✅ `categories` – Zentrale Kategorien
10. ✅ `speech_transcripts` – Transkriptions-Historie
11. ✅ `intent_logs` – Intent-Erkennungs-Logs
12. ✅ `event_logs` – Allgemeine Event-Logs

#### Priorität 4: HA-Stammdaten (Woche 2-3)
13. ✅ `ha_snapshots` – Import-Snapshots
14. ✅ `ha_areas` – Räume/Bereiche
15. ✅ `ha_devices` – Geräte
16. ✅ `ha_entities` – Zentrale Entity-Tabelle
17. ✅ `ha_entity_states` – Historisierte Zustände
18. ✅ `ha_entity_attributes` – Flexible Attribute (EAV)

### 2.2 Full Scope (Phase 2+)

#### HA-Erweiterte Entitäten
19. ⏳ `ha_services` – Service-Definitionen
20. ⏳ `ha_persons` – Personen + Device Tracker
21. ⏳ `ha_zones` – Zonen
22. ⏳ `ha_zone_persons` – M:N Zonen ↔ Personen
23. ⏳ `ha_media_players` – Media Player
24. ⏳ `ha_media_player_group_members` – Media Player Gruppen (self M:N)
25. ⏳ `ha_automations` – Automationen

#### Erweiterte Auth & Dimensionen
26. ⏳ `user_roles` – Rollen-Definitionen
27. ⏳ `user_permissions` – Permissions-Definitionen
28. ⏳ `llm_instances` – LLM-Konfigurationen

---

## 3. PK-/FK-Strategie (Offene Entscheidungen)

### 3.1 PK-Datentyp

| Option | Pro | Contra | Empfehlung |
|--------|-----|--------|------------|
| **UUID** | - Verteilte Systeme-freundlich<br>- Keine ID-Kollisionen<br>- Bereits in `database-design.md` | - 16 Bytes vs. 4/8 Bytes<br>- Etwas langsamere Joins<br>- Weniger human-readable | ✅ **Empfohlen für PostgreSQL/MariaDB** |
| **INT/BIGINT** | - Kompakt (4/8 Bytes)<br>- Schnelle Joins<br>- Menschenlesbar | - Zentrale ID-Vergabe nötig<br>- Potenzielle Kollisionen in verteilten Setups | ⚠️ Nur wenn Single-Instance garantiert |
| **ULID/CUID** | - Zeitbasiert sortierbar<br>- UUID-kompatibel<br>- Bessere Index-Performance | - Erfordert Libraries<br>- Weniger Standard | 🔄 Alternative zu UUID |

**➡️ Entscheidung für PoC:** **UUID** (TypeORM `@PrimaryGeneratedColumn('uuid')`)

### 3.2 HA-Tabellen: Natürliche vs. Surrogat-PKs

| Strategie | Beschreibung | Implementierung |
|-----------|--------------|-----------------|
| **Natürliche PKs** (DBM-SCHEMA-01/02) | `entity_id`, `area_id`, `device_id` als PK | `@PrimaryColumn()` auf String-Spalte |
| **Surrogat-PKs** (database-design.md) | UUID `id` als PK, natürliche Keys als UNIQUE | `@PrimaryGeneratedColumn('uuid')` + `@Column({ unique: true })` |
| **Hybrid** | Surrogat-PK intern, natürliche Keys für Business Logic | Beide Ansätze kombiniert |

**➡️ Entscheidung für PoC:** 
- **Surrogat-PKs** (`id: UUID`) für **alle** Tabellen (inkl. HA-Tabellen)
- Natürliche Schlüssel (`entity_id`, `area_id`, `device_id`) erhalten **UNIQUE-Constraints**
- **Begründung:** 
  - Konsistenz über alle Entities
  - Einfachere TypeORM-Handhabung
  - Kompatibilität mit bestehendem `database-design.md`
  - Möglicherweise benötigt für zukünftige Features (z.B. Soft Deletes, Audit-Trails)

### 3.3 FK-Referenzen auf natürliche Schlüssel

**Problem:** Wenn `ha_entities` einen Surrogat-PK `id` hat, aber Queries oft `entity_id` nutzen:

**Lösung:**
- FKs zeigen auf Surrogat-`id`
- Business Logic verwendet `entity_id` + Repository-Queries mit `{ where: { entity_id: '...' } }`
- Index auf `entity_id` sorgt für Performance

---

## 4. Draft Mapping-Template

**Dokument:** `database/DBM-SCHEMA-03-TypeORM-Mapping.md` (siehe separate Datei)

**Status:** ✅ Draft erstellt (siehe nachfolgendes Deliverable)

**Inhalt:**
- TypeORM-Entity-Struktur für alle PoC-Entities
- Decorator-Verwendung (`@Entity`, `@PrimaryGeneratedColumn`, `@Column`, `@ManyToOne`, `@OneToMany`, `@JoinColumn`, `@Index`, `@Unique`)
- FK-Constraint-Namen gemäß Konventionen
- Kommentare zu offenen Entscheidungen

---

## 5. Branch-Empfehlung

**Branch-Name:** `feature/LUD28-59-typeorm-entities`

**Strategie:**
- **Single Branch** für alle Sub-Tickets (59.1 - 59.7) ODER
- **Branch pro Phase:**
  - `feature/LUD28-59.1-prepare` (Review & Scope) ✅
  - `feature/LUD28-59.2-design` (Entity Design)
  - `feature/LUD28-59.3-implement` (Entity Implementation)
  - `feature/LUD28-59.4-migrations` (Migrations)
  - etc.

**➡️ Empfehlung:** 
- **Ein Branch für 59.1-59.4** (`feature/LUD28-59-entities-and-migrations`)
- Separate Branches nur für 59.5+ (Tests, Deployment)

---

## 6. Risiken & Offene Punkte

### 6.1 Kritische Entscheidungen

| # | Thema | Status | Owner | Deadline |
|---|-------|--------|-------|----------|
| 1 | **UUID vs. INT für PKs** | ✅ Entschieden: UUID | @backend-team | - |
| 2 | **Natürliche vs. Surrogat-PKs für HA-Tabellen** | ✅ Entschieden: Surrogat + UNIQUE | @backend-team | - |
| 3 | **Datenbank-Wahl (PostgreSQL vs. MariaDB)** | ⚠️ Offen | @ops-team | vor 59.3 |
| 4 | **Datenmigration-Strategie (Mongo → SQL)** | 🔴 Offen – Follow-up Ticket | @backend-team | vor 59.7 |
| 5 | **CI-Setup für DB-Migrations-Tests** | ⚠️ Offen | @devops-team | vor 59.5 |

### 6.2 Potenzielle Blocker

1. **Fehlende Datenmigrations-Strategie**
   - **Risiko:** Bestehende Mongo-Daten können nicht in neues Schema übertragen werden
   - **Mitigation:** Eigenes Ticket für Datenmigration anlegen (LUD28-110)
   - **Priorität:** High (vor Deployment)

2. **TypeORM-Version & Breaking Changes**
   - **Risiko:** TypeORM 0.3.x hat Breaking Changes zu 0.2.x
   - **Mitigation:** Version in `package.json` festlegen, Dokumentation aktualisieren
   - **Priorität:** Medium

3. **Performance HA-Attribute (EAV-Modell)**
   - **Risiko:** `ha_entity_attributes` kann sehr groß werden (Millionen Rows)
   - **Mitigation:** 
     - Zusammengesetzte Indizes `(entity_state_id, attribute_key)`
     - JSONB-Alternative evaluieren (PostgreSQL-spezifisch)
   - **Priorität:** Medium (erst ab 59.5 messbar)

---

## 7. Akzeptanzkriterien (AC) – Status

- [x] **AC1:** Übersichts-Checklist mit allen relevanten Dokumenten erstellt
  - ✅ Siehe Abschnitte 1.1 und 1.2
  
- [x] **AC2:** Liste aller Ziel-Entitäten mit vorgeschlagenen PK-/FK-Strategien vorgelegt
  - ✅ Siehe Abschnitte 2 und 3
  
- [x] **AC3:** Mapping-Template `database/DBM-SCHEMA-03-TypeORM-Mapping.md` angelegt (Draft)
  - ✅ Siehe separate Datei (erstellt)
  
- [x] **AC4:** Scope und Prioritäten für PoC und vollständige Implementierung dokumentiert
  - ✅ Siehe Abschnitt 2 (PoC vs. Full Scope)

---

## 8. Nächste Schritte

1. ✅ **Review dieser Checklist** mit @backend-team
2. ⏳ **Finalisierung offener Entscheidungen** (DB-Wahl, CI-Setup)
3. ⏳ **Start LUD28-59.2** (Entity- & Relations-Design)
4. ⏳ **Anlegen Follow-up Ticket** für Datenmigration (LUD28-110)

---

**Erstellt:** 2025-12-03  
**Letzte Aktualisierung:** 2025-12-03  
**Ersteller:** GitHub Copilot (AI Agent)

