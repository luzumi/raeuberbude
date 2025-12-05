# MongoDB → MariaDB Migration - Anleitung

## Übersicht

Dieses Dokument beschreibt die vollständige Migration von MongoDB nach MariaDB.

## Voraussetzungen

✅ MariaDB läuft (Port 3307)
✅ MongoDB läuft (Port 27018)
✅ Neue Tabellen `categories` und `llm_instances` sind erstellt

## Migrations-Ablauf

### Schritt 1: Neue Tabellen erstellen

```bash
cd backend/nest-app
# ⚠️ Verwenden Sie Umgebungsvariablen für Credentials
mysql -h 127.0.0.1 -P 3307 -u ${MARIADB_USER} -p"${MARIADB_PASSWORD}" raueberbude < scripts/create-llm-and-category-tables.sql
```

### Schritt 2: Migrations-Script ausführen

```bash
cd backend/nest-app
node scripts/migrate_mongo_to_maria.js
```

Das Script führt folgende Schritte aus:

1. **Leert alle Tabellen in MariaDB** (außer `ha_entities` und `migrations`)
   - `app_users`
   - `app_terminals`
   - `categories`
   - `llm_instances`
   - `transcripts`
   - `intent_logs`

2. **Fordert zum App-Neustart auf**
   - Die App muss neu gestartet werden, damit:
     - HA-Daten aus dem JSON-File in MongoDB importiert werden
     - HA-Daten von MongoDB nach MariaDB synchronisiert werden
     - Superadmin-User erstellt wird (falls Seeding aktiviert)

3. **Migriert Collections in FK-Reihenfolge**
   - `users` → `app_users`
   - `app_terminals` → `app_terminals`
   - `categories` → `categories`
   - `llminstances` → `llm_instances`
   - `transcripts` → `transcripts`
   - `intentlogs` → `intent_logs`

### Schritt 3: App neu starten (während Migration)

Wenn das Script dazu auffordert:

```bash
cd backend/nest-app
npm run start:dev
```

Warte, bis die HA-Daten synchronisiert wurden (in den Logs sichtbar):
```
[HaBootstrapService] Starte Bootstrap-Import aus Datei: ...
[HaBootstrapService] Bootstrap-Import erfolgreich abgeschlossen.
[HaBootstrapService] Starte HA Sync nach Import (Mongo -> MariaDB)
[HaSyncService] Synced X/Y
```

Dann im Migrations-Script **ENTER** drücken, um fortzufahren.

### Schritt 4: Verifikation

Nach der Migration:

```bash
# Anzahl Dokumente in MongoDB vs. MariaDB vergleichen
node scripts/compare_collections_counts.js

# Tabellen und Anzahl der Zeilen anzeigen
node scripts/check-db-tables.js
```

## Migrations-Reihenfolge (FK-Dependencies)

Die Migration erfolgt in dieser Reihenfolge, um FK-Constraints zu respektieren:

```
1. app_users          (keine Dependencies)
2. app_terminals      (FK → app_users.id)
3. categories         (keine Dependencies)
4. llm_instances      (keine Dependencies)
5. transcripts        (FK → app_users.id, app_terminals.terminal_id)
6. intent_logs        (FK → app_terminals.terminal_id)
```

## Daten-Transformation

### User Mapping

MongoDB ObjectIds werden auf UUIDs gemappt:
- `_id` (MongoDB) → `id` (MariaDB UUID)
- Mapping wird in einer Map gespeichert für FK-Referenzen

### Terminal Mapping

Analog zu Users:
- `_id` (MongoDB) → `id` (MariaDB UUID)
- `terminalId` bleibt als string erhalten

### Felder-Mapping

| MongoDB             | MariaDB               | Transformation                        |
|---------------------|-----------------------|---------------------------------------|
| `_id`               | `id`                  | ObjectId → UUID                       |
| `createdAt`         | `created_at`          | Date                                  |
| `updatedAt`         | `updated_at`          | Date                                  |
| Arrays              | JSON-Spalte           | Array → JSON.stringify()              |
| Embedded Objects    | JSON-Spalte           | Object → JSON.stringify()             |
| Boolean             | BOOLEAN               | direkt                                |
| Number              | INT / DECIMAL         | direkt                                |
| String              | VARCHAR / TEXT        | direkt                                |
| ObjectId (FK)       | UUID (FK)             | Lookup in ID-Map                      |

## Fehlerbehandlung

Das Script sammelt Fehler, stoppt aber nicht bei einzelnen fehlerhaften Dokumenten:
- Transformations-Fehler werden geloggt
- Batch-Insert-Fehler werden geloggt
- Am Ende wird eine Zusammenfassung angezeigt

## Rollback

Falls die Migration fehlschlägt:

1. App stoppen
2. MariaDB-Tabellen leeren:
   ```sql
   TRUNCATE TABLE app_users;
   TRUNCATE TABLE app_terminals;
   TRUNCATE TABLE categories;
   TRUNCATE TABLE llm_instances;
   TRUNCATE TABLE transcripts;
   TRUNCATE TABLE intent_logs;
   TRUNCATE TABLE ha_entities;
   ```
3. MongoDB-Daten bleiben unverändert erhalten
4. Migration erneut durchführen

## Nach der Migration

### App umstellen

Nach erfolgreicher Migration sollte die App nur noch MariaDB nutzen:

1. MongoDB-Services deaktivieren (z.B. in app.module.ts)
2. Alle Mongoose-Models entfernen oder auskommentieren
3. Nur TypeORM-Repositories verwenden

### MongoDB-Cleanup (später)

Wenn alles läuft:
1. MongoDB-Container stoppen
2. MongoDB-Datenordner löschen
3. MongoDB aus docker-compose.yml entfernen

## Troubleshooting

### Problem: "Cannot connect to MongoDB"
**Lösung**: Prüfe, ob MongoDB läuft: `docker ps | grep mongo`

### Problem: "Cannot connect to MariaDB"
**Lösung**: Prüfe, ob MariaDB läuft: `docker ps | grep maria`

### Problem: "Table doesn't exist"
**Lösung**: Führe zuerst `create-llm-and-category-tables.sql` aus

### Problem: "Duplicate entry"
**Lösung**: Tabellen vorher leeren oder Script erneut ausführen (hat Upsert-Logik)

### Problem: "FK constraint fails"
**Lösung**: Prüfe die Migrations-Reihenfolge im Script

## Weitere Informationen

- **Ticket**: LUD28-59.7 (Deployment Integration - Staging Deployment - Smoke Tests)
- **Dokumentation**: `DBM-MIGRATION-README.md`
- **Migrations-Plan**: `plan-migrateMongoToMariaDb.prompt.md`

