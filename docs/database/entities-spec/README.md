# Entity Specifications

**Projekt:** Raeuberbude - TypeORM Entity Specs  
**Ticket:** LUD28-107 (LUD28-59.2 - Design-Phase)  
**Status:** ✅ Finalisiert - Ready for Implementation

---

## 📁 Verzeichnisstruktur

```
database/entities-spec/
├── auth/                   # Authentifizierung & Berechtigungen
│   ├── user.entity.spec.md
│   ├── user-rights.entity.spec.md
│   └── user-allowed-terminal.entity.spec.md
├── terminals/              # Terminal-Management
│   ├── app-terminal.entity.spec.md
│   └── terminal-rights.entity.spec.md
├── speech/                 # Spracheingaben
│   ├── speech-human-input.entity.spec.md
│   └── speech-test-input.entity.spec.md
├── logging/                # Logging & Kategorisierung
│   ├── category.entity.spec.md
│   ├── intent-log.entity.spec.md
│   ├── speech-transcript.entity.spec.md
│   └── event-log.entity.spec.md
├── homeassistant/          # HomeAssistant-Integration
│   ├── ha-snapshot.entity.spec.md
│   ├── ha-area.entity.spec.md
│   ├── ha-device.entity.spec.md
│   ├── ha-entity.entity.spec.md
│   ├── ha-entity-state.entity.spec.md
│   ├── ha-entity-attribute.entity.spec.md
│   ├── ha-service.entity.spec.md          # Phase 2
│   ├── ha-person.entity.spec.md           # Phase 2
│   ├── ha-zone.entity.spec.md             # Phase 2
│   ├── ha-zone-person.entity.spec.md      # Phase 2
│   ├── ha-media-player.entity.spec.md     # Phase 2
│   ├── ha-media-player-group.entity.spec.md  # Phase 2
│   └── ha-automation.entity.spec.md       # Phase 2
└── README.md (diese Datei)
```

---

## 📝 Spec-Template

Jede Entity-Spec folgt diesem Format:

```markdown
# EntityName Entity Specification

**Tabelle:** `table_name`  
**Module:** `backend/nest-app/src/modules/[domain]/entities/[name].entity.ts`  
**Status:** ✅ Final / 🔶 Draft / ⏳ Geplant

---

## 1. Übersicht

**Zweck:** [Kurzbeschreibung der Entity]

**Mongo-Quelle:** [Pfad zum ursprünglichen Mongoose-Schema]

**Dependencies:**
- FK zu: [andere Entities]
- Referenziert von: [andere Entities]

---

## 2. Felder

### Primärschlüssel
| Feld | Typ | Nullable | Default | Beschreibung |
|------|-----|----------|---------|--------------|
| `id` | UUID | Nein | auto | Surrogat-PK |

### Business-Felder
| Feld | Typ | Nullable | Default | Constraint | Beschreibung |
|------|-----|----------|---------|------------|--------------|
| ... | ... | ... | ... | ... | ... |

### Metadaten
| Feld | Typ | Nullable | Default | Beschreibung |
|------|-----|----------|---------|--------------|
| `created_at` | TIMESTAMP | Nein | NOW() | Erstellungszeitpunkt |
| `updated_at` | TIMESTAMP | Nein | NOW() | Änderungszeitpunkt |

---

## 3. Beziehungen

### Foreign Keys
| FK-Spalte | Ziel-Entity | Ziel-Spalte | ON DELETE | ON UPDATE | Constraint-Name |
|-----------|-------------|-------------|-----------|-----------|-----------------|
| ... | ... | ... | ... | ... | `fk_[from]__[to]__[column]` |

### Relations (TypeORM)
```typescript
@ManyToOne(() => TargetEntity, ...)
@JoinColumn({ name: '...', foreignKeyConstraintName: '...' })
targetEntity: TargetEntity;
```

---

## 4. Constraints & Indizes

### Unique-Constraints
| Constraint-Name | Spalte(n) | Beschreibung |
|-----------------|-----------|--------------|
| `uq_[table]__[column]` | ... | ... |

### Indizes
| Index-Name | Spalte(n) | Typ | Beschreibung |
|------------|-----------|-----|--------------|
| `ix_[table]__[column]` | ... | BTREE | ... |

---

## 5. Validierung & Business-Rules

- [Regel 1]
- [Regel 2]

---

## 6. TypeORM-Entity (Draft)

```typescript
@Entity('table_name')
export class EntityName {
  // ... vollständige Definition
}
```

---

## 7. Offene Punkte

- [ ] [Offene Frage 1]
- [ ] [Offene Frage 2]

---

**Erstellt:** [Datum]  
**Letzte Aktualisierung:** [Datum]  
**Status:** [Draft/Final]
```

---

## 🎯 Ziel

Jede Entity erhält eine vollständige Spezifikation, die:
1. Alle Felder mit Typen, Constraints, Defaults dokumentiert
2. Beziehungen zu anderen Entities klar definiert
3. FK-Constraint-Namen gemäß Konventionen festlegt
4. Indizes für Performance-Optimierung vorschlägt
5. Validierungsregeln und Business-Logic beschreibt
6. TypeORM-Entity-Definition bereitstellt

---

## 📊 Status-Übersicht

### Phase 1 (PoC-Scope) - 18 Entities

| Domäne | Entity | Status | Datei |
|--------|--------|--------|-------|
| **Auth** | User | ⏳ TODO | `auth/user.entity.spec.md` |
| **Auth** | UserRights | ⏳ TODO | `auth/user-rights.entity.spec.md` |
| **Auth** | UserAllowedTerminal | ⏳ TODO | `auth/user-allowed-terminal.entity.spec.md` |
| **Terminals** | AppTerminal | ⏳ TODO | `terminals/app-terminal.entity.spec.md` |
| **Terminals** | TerminalRights | ⏳ TODO | `terminals/terminal-rights.entity.spec.md` |
| **Speech** | SpeechHumanInput | ⏳ TODO | `speech/speech-human-input.entity.spec.md` |
| **Speech** | SpeechTestInput | ⏳ TODO | `speech/speech-test-input.entity.spec.md` |
| **Logging** | Category | ⏳ TODO | `logging/category.entity.spec.md` |
| **Logging** | IntentLog | ⏳ TODO | `logging/intent-log.entity.spec.md` |
| **Logging** | SpeechTranscript | ⏳ TODO | `logging/speech-transcript.entity.spec.md` |
| **Logging** | EventLog | ⏳ TODO | `logging/event-log.entity.spec.md` |
| **HA** | HaSnapshot | ⏳ TODO | `homeassistant/ha-snapshot.entity.spec.md` |
| **HA** | HaArea | ⏳ TODO | `homeassistant/ha-area.entity.spec.md` |
| **HA** | HaDevice | ⏳ TODO | `homeassistant/ha-device.entity.spec.md` |
| **HA** | HaEntity | ⏳ TODO | `homeassistant/ha-entity.entity.spec.md` |
| **HA** | HaEntityState | ⏳ TODO | `homeassistant/ha-entity-state.entity.spec.md` |
| **HA** | HaEntityAttribute | ⏳ TODO | `homeassistant/ha-entity-attribute.entity.spec.md` |

**Fortschritt:** 0/18 (0%)

### Phase 2 (Full Scope) - 10+ Entities

| Domäne | Entity | Status | Datei |
|--------|--------|--------|-------|
| **HA** | HaService | ⏳ Geplant | `homeassistant/ha-service.entity.spec.md` |
| **HA** | HaPerson | ⏳ Geplant | `homeassistant/ha-person.entity.spec.md` |
| **HA** | HaZone | ⏳ Geplant | `homeassistant/ha-zone.entity.spec.md` |
| **HA** | HaZonePerson | ⏳ Geplant | `homeassistant/ha-zone-person.entity.spec.md` |
| **HA** | HaMediaPlayer | ⏳ Geplant | `homeassistant/ha-media-player.entity.spec.md` |
| **HA** | HaMediaPlayerGroup | ⏳ Geplant | `homeassistant/ha-media-player-group.entity.spec.md` |
| **HA** | HaAutomation | ⏳ Geplant | `homeassistant/ha-automation.entity.spec.md` |
| **Auth** | UserRole | ⏳ Geplant | `auth/user-role.entity.spec.md` |
| **Auth** | UserPermission | ⏳ Geplant | `auth/user-permission.entity.spec.md` |
| **Logging** | LlmInstance | ⏳ Geplant | `logging/llm-instance.entity.spec.md` |

---

## 🔗 Verwandte Dokumente

- **[DBM-SCHEMA-03](../DBM-SCHEMA-03-TypeORM-Mapping.md)** - Globales TypeORM-Mapping
- **[Entity ER-Diagramm](../entity-relationship-diagram.md)** - Visuelle Übersicht
- **[Prep-Checklist](../../docs/implementation-scope/LUD28-59-prep-checklist.md)** - Vorbereitung

---

**Erstellt:** 2025-12-03  
**Letzte Aktualisierung:** 2025-12-03  
**Ticket:** LUD28-107

