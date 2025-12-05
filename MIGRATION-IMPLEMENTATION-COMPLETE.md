# MongoDB → MariaDB Migration - Abschluss-Dokumentation

**Ticket**: LUD28-59.7 - Deployment Integration - Staging Deployment - Smoke Tests  
**Datum**: 2025-12-04  
**Status**: ✅ Vorbereitet, bereit zur Ausführung

## 🎯 Ziel

Vollständige Migration aller Daten von MongoDB nach MariaDB unter Beachtung der Foreign-Key-Beziehungen.

## ✅ Implementierte Komponenten

### 1. TypeORM Entities (Neu)

**Erstellt:**
- `backend/nest-app/src/modules/llm/entities/llm-instance.entity.ts`
- `backend/nest-app/src/modules/categories/entities/category.entity.ts`

**Aktualisiert:**
- `backend/nest-app/src/data-source.ts` - Registrierung der neuen Entities

### 2. Migrations-Scripts

**Erstellt:**
- `backend/nest-app/scripts/create-llm-and-category-tables.sql` - SQL für neue Tabellen
- `backend/nest-app/scripts/step1_truncate_tables.js` - Leert alle Tabellen
- `backend/nest-app/scripts/step2_migrate_collections.js` - Hauptmigration
- `backend/nest-app/scripts/verify_migration.js` - Verifikation
- `backend/nest-app/scripts/run-migration.ps1` - Automatisches PowerShell-Skript

### 3. Dokumentation

**Erstellt:**
- `MIGRATION-GUIDE.md` - Detaillierte technische Anleitung
- `MIGRATION-QUICKSTART.md` - Schnellstart-Anleitung

## 📋 Migrations-Reihenfolge

Die Migration erfolgt in dieser Reihenfolge (FK-Dependencies):

```
1. app_users          ← keine Dependencies
2. app_terminals      ← FK: app_users.id
3. categories         ← keine Dependencies
4. llm_instances      ← keine Dependencies
5. transcripts        ← FK: app_users.id, app_terminals.terminal_id
6. intent_logs        ← FK: app_terminals.terminal_id
7. ha_entities        ← wird automatisch beim App-Start befüllt
```

## 🔄 Migrations-Prozess

### Phase 1: Vorbereitung
1. ✅ Neue Entities erstellen (LlmInstance, Category)
2. ✅ Data Source aktualisieren
3. ✅ SQL-Script für neue Tabellen erstellen

### Phase 2: Daten löschen
1. Alle Tabellen in MariaDB leeren (außer `migrations`)
2. Foreign Key Checks temporär deaktivieren

### Phase 3: App-Bootstrap
1. App neu starten
2. HA-Daten werden aus JSON in MongoDB importiert
3. HA-Daten werden von MongoDB nach MariaDB synchronisiert
4. Superadmin-User wird erstellt (falls Seeding aktiviert)

### Phase 4: Collection-Migration
1. **users** → app_users (MongoDB ObjectId → UUID Mapping)
2. **app_terminals** → app_terminals (FK-Auflösung zu users)
3. **categories** → categories
4. **llminstances** → llm_instances
5. **transcripts** → transcripts (FK-Auflösung zu users und terminals)
6. **intentlogs** → intent_logs (FK-Auflösung zu terminals)

### Phase 5: Verifikation
1. Anzahl Dokumente in MongoDB vs. MariaDB vergleichen
2. Stichproben prüfen
3. App-Tests durchführen

## 🔧 Daten-Transformationen

### ObjectId → UUID Mapping

MongoDB verwendet ObjectIds als Primärschlüssel. MariaDB verwendet UUIDs.

**Mapping-Strategie:**
- Beim Migrieren von `users` wird ein Mapping `oldId → newUUID` erstellt
- Beim Migrieren von `app_terminals` wird ein Mapping `oldId → newUUID` erstellt
- Bei FK-Referenzen wird über diese Mappings aufgelöst

### Felder-Transformationen

| MongoDB Typ        | MariaDB Typ          | Transformation              |
|--------------------|----------------------|-----------------------------|
| ObjectId           | CHAR(36) UUID        | uuidv4()                    |
| Date               | DATETIME(6)          | direkt                      |
| Boolean            | BOOLEAN              | direkt                      |
| Number             | INT / DECIMAL        | direkt                      |
| String             | VARCHAR / TEXT       | direkt                      |
| Array              | JSON                 | JSON.stringify()            |
| Object             | JSON                 | JSON.stringify()            |
| ObjectId (FK)      | CHAR(36) UUID (FK)   | Lookup in ID-Map            |

### Spezielle Fälle

**Transcripts:**
- `userId` kann String oder ObjectId sein → wenn ObjectId, dann Mapping-Lookup
- `terminalId` kann String oder ObjectId sein → wenn ObjectId, dann Mapping-Lookup
- JSON-Felder: `intent`, `timings`, `rawResponse`, `assignedAction`, `suggestions`

**IntentLogs:**
- `keywords` wird als JSON-Array gespeichert

**AppTerminals:**
- `capabilities` wird als JSON gespeichert
- `allowed_actions` wird als JSON-Array gespeichert (Default: `[]`)

## 🚀 Ausführung

### Automatisch (Empfohlen)

```powershell
cd C:\Users\corat\IdeaProjects\raueberbude
.\scripts\run-migration.ps1
```

### Manuell

```powershell
# Schritt 1: Neue Tabellen
# ⚠️ Verwenden Sie Umgebungsvariablen für Credentials
mysql -h 127.0.0.1 -P 3307 -u $env:MARIADB_USER -p"$env:MARIADB_PASSWORD" raueberbude < scripts/create-llm-and-category-tables.sql

# Schritt 2: Tabellen leeren
node scripts/step1_truncate_tables.js

# Schritt 3: App starten (neues Terminal)
npm run start:dev
# Warte auf: [HaSyncService] Synced X/Y

# Schritt 4: Migration
node scripts/step2_migrate_collections.js

# Schritt 5: Verifikation
node scripts/verify_migration.js
```

## 📊 Erwartete Ergebnisse

Nach erfolgreicher Migration sollten alle Collections/Tabellen die gleiche Anzahl an Dokumenten/Zeilen haben:

```
╔════════════════════════════════════════════════════════════╗
║     Verifikation: MongoDB ↔ MariaDB                        ║
╚════════════════════════════════════════════════════════════╝

┌─────────────────┬─────────────┬──────────────┬───────┐
│ Collection      │ MongoDB Docs│ MariaDB Rows │ Match │
├─────────────────┼─────────────┼──────────────┼───────┤
│ users           │ X           │ X            │ ✅    │
│ app_terminals   │ X           │ X            │ ✅    │
│ categories      │ X           │ X            │ ✅    │
│ llminstances    │ X           │ X            │ ✅    │
│ transcripts     │ X           │ X            │ ✅    │
│ intentlogs      │ X           │ X            │ ✅    │
│ ha_entities     │ X           │ X            │ ✅    │
└─────────────────┴─────────────┴──────────────┴───────┘

Status: ✅ ALLE ÜBEREINSTIMMEND
🎉 Migration erfolgreich! Alle Daten übereinstimmen.
```

## 🔍 Fehlerbehandlung

Das Migrations-Script ist robust implementiert:

- **Transformations-Fehler**: Werden geloggt, Migration läuft weiter
- **Batch-Insert-Fehler**: Werden geloggt, Migration läuft weiter
- **Zusammenfassung**: Am Ende wird eine Tabelle mit Erfolgs-/Fehlerrate angezeigt

Bei Fehlern:
1. Logs analysieren
2. Problematische Dokumente in MongoDB identifizieren
3. Daten manuell korrigieren
4. Migration erneut durchführen (Truncate + Migrate)

## 🎯 Nächste Schritte

Nach erfolgreicher Migration:

1. **App testen**
   - Alle Features durchgehen
   - Smoke-Tests ausführen
   - Logs auf Fehler prüfen

2. **MongoDB deaktivieren** (wenn alles funktioniert)
   - Mongoose-Module aus app.module.ts entfernen
   - MongoDB-Container stoppen
   - docker-compose.yml anpassen

3. **Cleanup**
   - MongoDB-Datenordner löschen
   - Mongoose-Models entfernen
   - Backend aufräumen

## 📝 Notizen

- ⚠️ **Backup**: Vor der Migration sollte ein Backup von MongoDB und MariaDB erstellt werden
- ⚠️ **Downtime**: Während der Migration sollte die App nicht produktiv verwendet werden
- ✅ **Rollback**: MongoDB-Daten bleiben unverändert, Rollback durch erneutes Truncate + Re-Import möglich
- ✅ **Idempotent**: Die Migration kann mehrfach ausgeführt werden (Truncate + Migrate)

## 🏁 Status

- [x] Entities erstellt
- [x] Data Source aktualisiert
- [x] SQL-Scripts erstellt
- [x] Migrations-Scripts implementiert
- [x] Verifikations-Script erstellt
- [x] PowerShell-Automatisierung erstellt
- [x] Dokumentation verfasst
- [ ] Migration durchgeführt ← **Nächster Schritt**
- [ ] Verifikation erfolgreich
- [ ] App getestet
- [ ] MongoDB deaktiviert

## 👤 Verantwortlich

- **Implementierung**: Copilot
- **Review**: User
- **Ausführung**: User
- **Verifikation**: User + Copilot

---

**Bereit zur Ausführung!** 🚀

Die Migration kann jetzt mit `.\scripts\run-migration.ps1` gestartet werden.

