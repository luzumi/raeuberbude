# MongoDB zu MariaDB Migration - Schnellstart

## Voraussetzungen

- ✅ MariaDB läuft auf Port 3307
- ✅ MongoDB läuft auf Port 27018
- ✅ Node.js und npm installiert

## Migration durchführen

### Option 1: Automatisches PowerShell-Skript (empfohlen)

```powershell
cd C:\Users\corat\IdeaProjects\raueberbude
.\scripts\run-migration.ps1
```

Das Skript führt automatisch alle Schritte aus.

### Option 2: Manuelle Schritte

#### Schritt 1: Neue Tabellen erstellen

```powershell
cd C:\Users\corat\IdeaProjects\raueberbude\backend\nest-app
mysql -h 127.0.0.1 -P 3307 -u rb_user -prb_user_secret raueberbude < scripts/create-llm-and-category-tables.sql
```

#### Schritt 2: Bestehende Tabellen leeren

```powershell
node scripts/step1_truncate_tables.js
```

#### Schritt 3: App neu starten

```powershell
npm run start:dev
```

⚠️ **Warte, bis in den Logs erscheint:**
```
[HaBootstrapService] Bootstrap-Import erfolgreich abgeschlossen.
[HaSyncService] Synced X/Y
```

#### Schritt 4: Collections migrieren

```powershell
node scripts/step2_migrate_collections.js
```

#### Schritt 5: Verifikation

```powershell
node scripts/verify_migration.js
```

## Was wird migriert?

| MongoDB Collection | MariaDB Tabelle | Anzahl Dokumente |
|--------------------|-----------------|------------------|
| `users`            | `app_users`     | ?                |
| `app_terminals`    | `app_terminals` | ?                |
| `categories`       | `categories`    | ?                |
| `llminstances`     | `llm_instances` | ?                |
| `transcripts`      | `transcripts`   | ?                |
| `intentlogs`       | `intent_logs`   | ?                |

`ha_entities` wird automatisch vom App-Start aus dem JSON-File befüllt.

## Nach der Migration

Die App arbeitet jetzt mit MariaDB. MongoDB kann deaktiviert werden.

## Problemlösung

**Problem**: `mysql: command not found`  
**Lösung**: Verwende `docker exec` oder installiere MySQL Client

**Problem**: Tabellen existieren nicht  
**Lösung**: Führe erst die SQL-Datei aus (Schritt 1)

**Problem**: FK-Constraint-Fehler  
**Lösung**: Stelle sicher, dass Schritt 2 (Truncate) ausgeführt wurde

## Weitere Infos

Siehe `MIGRATION-GUIDE.md` für Details.

## Was wird migriert?

```
node scripts/compare_collections_counts.js
```powershell

#### Schritt 5: Verifikation

```
node scripts/step2_migrate_collections.js
```powershell

#### Schritt 4: Collections migrieren

```
[HaSyncService] Synced X/Y
[HaBootstrapService] Bootstrap-Import erfolgreich abgeschlossen.
```
⚠️ **Warte, bis in den Logs erscheint:**

```
npm run start:dev
```powershell

#### Schritt 3: App neu starten

```
node scripts/step1_truncate_tables.js
```powershell

#### Schritt 2: Bestehende Tabellen leeren

```
mysql -h 127.0.0.1 -P 3307 -u rb_user -prb_user_secret raueberbude < scripts/create-llm-and-category-tables.sql
cd C:\Users\corat\IdeaProjects\raueberbude\backend\nest-app
```powershell

#### Schritt 1: Neue Tabellen erstellen

### Option 2: Manuelle Schritte

Das Skript führt automatisch alle Schritte aus.

```
.\scripts\run-migration.ps1
cd C:\Users\corat\IdeaProjects\raueberbude\backend\nest-app
```powershell

### Option 1: Automatisches PowerShell-Skript (empfohlen)

## Migration durchführen

- ✅ Node.js und npm installiert
- ✅ MongoDB läuft auf Port 27018
- ✅ MariaDB läuft auf Port 3307

## Voraussetzungen


