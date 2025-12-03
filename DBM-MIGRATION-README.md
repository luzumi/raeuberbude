# DBM-Migration: MongoDB → MariaDB

## 📋 Übersicht

Vollständiger Migrations-Plan von MongoDB zu MariaDB/TypeORM, organisiert in 47 YouTrack-Tickets über 7 Epics.

## ✅ Aktueller Status

- **47 Tickets erstellt** (LUD28-57 bis LUD28-103)
- **58 Dependencies verlinkt**
- **Gantt-Diagramm verfügbar** in YouTrack
- **Gesamtaufwand**: ~50 Personentage

## 📂 Projektstruktur

### Dateien

| Datei | Beschreibung |
|-------|-------------|
| `tickets-dbm-migration.json` | Vollständige Ticket-Definitionen mit Dependencies |
| `DBM-TICKETS-FINAL-STATUS.md` | Abschluss-Dokumentation und Status |
| `plan-migrateMongoToMariaDb.prompt.md` | Ursprünglicher Migrations-Plan |

### YouTrack-Zugriff

- **URL**: https://luzumi.youtrack.cloud/issues/LUD28
- **Gantt-Chart**: Reports → Gantt Chart
- **Filter**: `project: LUD28 summary: DBM-`

## 🎯 Epics und Struktur

### 1. DBM-EPIC-SCHEMA (7 Tickets)
Schema-Design, ER-Modell, TypeORM-Entities, Normalisierung

### 2. DBM-EPIC-INFRA (6 Tickets)
MariaDB-Setup, Docker, Connection-Pooling, Security, Backups

### 3. DBM-EPIC-MIG (8 Tickets)
Migrations-Skripte, Export/Import, Daten-Transformation, Validierung

### 4. DBM-EPIC-APP (7 Tickets)
Services, Repositories, DTOs, API-Endpoints, Transaktionen

### 5. DBM-EPIC-TEST (7 Tickets)
Unit-Tests, Integrationstests, E2E-Tests, Performance-Tests

### 6. DBM-EPIC-ROLLOUT (5 Tickets)
Produktions-Cutover, Monitoring, Post-Mortem

### 7. DBM-EPIC-ERASE (7 Tickets)
MongoDB-Code entfernen, Cleanup, Final-Review

## 🔗 Dependencies

Tickets sind über 58 `depends on`-Links miteinander verbunden, was einen klaren Critical Path ermöglicht:

```
LUD28-57 (Schema-Design)
  ↓
LUD28-58, LUD28-59 (Entities)
  ↓
LUD28-64 (MariaDB-Setup)
  ↓
LUD28-70 (Migrations)
  ↓
LUD28-80 (Services)
  ↓
... weitere Abhängigkeiten ...
  ↓
LUD28-103 (Abschluss-Review)
```

## 📊 Gantt-Diagramm nutzen

1. Öffne YouTrack: https://luzumi.youtrack.cloud/issues/LUD28
2. Gehe zu **Reports → Gantt Chart**
3. Das Diagramm zeigt:
   - ✅ Zeitschätzungen (Balken-Länge)
   - ✅ Dependencies (Verbindungen)
   - ✅ Critical Path
   - ✅ Automatische Timeline

## 🛠️ YouTrack MCP

Der YouTrack-MCP-Server ist konfiguriert und ermöglicht:

- ✅ Tickets erstellen/aktualisieren
- ✅ Dependencies verlinken
- ✅ Custom Fields setzen
- ✅ Bulk-Updates

### Konfiguration

```json
{
  "mcpServers": {
    "youtrack": {
      "command": "node",
      "args": [".specify/mcp-servers/youtrack-mcp-server.js"]
    }
  }
}
```

Credentials in `.specify/mcp-servers/youtrack.secrets.json`

## 📝 Nächste Schritte

1. **Review** der Ticket-Reihenfolge im Gantt-Chart
2. **Assignees** zuweisen
3. **Start-Dates** planen (optional)
4. **Ersten Sprint** planen (empfohlen: DBM-SCHEMA-01 bis DBM-SCHEMA-03)

## 🎓 Wichtige Erkenntnisse

### Zeitaufwand vs. Zeitschätzung
- **Zeitaufwand**: Wird automatisch aus Work Items berechnet (nicht manuell setzbar)
- **Zeitschätzung**: Manuell gesetzt, wird für Gantt-Diagramm verwendet ✅

### Ticket-Felder
- **Type**: Task
- **Status**: Open
- **Zeitschätzung**: 2d, 1d, 4h, 0.5d
- **Priority**: Normal
- **Dependencies**: Via "depends on" Links

## 📖 Dokumentation

Siehe `DBM-TICKETS-FINAL-STATUS.md` für vollständige Details und Status.

---

**Erstellt**: Januar 2025  
**Projekt**: Ludde28 (LUD28)  
**Tool**: YouTrack Cloud

