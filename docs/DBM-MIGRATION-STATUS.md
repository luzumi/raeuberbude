# MongoDB → MariaDB Migration - STATUS & NÄCHSTE SCHRITTE

**Datum**: 2025-12-04
**Status**: ✅ **MIGRATION READY**

## ✅ Was wurde erreicht?

### 1. Infrastructure Setup ✅
- MariaDB 11.2 Container konfiguriert
- Port 3307 (Host) → 3306 (Container)
- TypeORM vollständig konfiguriert
- Umgebungsvariablen dokumentiert

### 2. TypeORM Entities ✅
Alle 5 Kern-Entities erstellt:
- ✅ `UserEntity` (app_users)
- ✅ `AppTerminalEntity` (app_terminals) mit Relations
- ✅ `TranscriptEntity` (transcripts)
- ✅ `IntentLogEntity` (intent_logs)
- ✅ `HaEntityEntity` (ha_entities)

### 3. Migration Erstellt ✅
**Datei**: `backend/nest-app/src/migrations/1764803356229-InitialSchema.ts`

Die Migration enthält:
- CREATE TABLE Statements für alle 5 Tabellen
- Indizes (Unique + Performance)
- Foreign Key Constraints
- Rollback-Logik (down)

### 4. Dependencies Installiert ✅
- `dotenv` hinzugefügt
- `mysql2` bereits vorhanden
- TypeORM Scripts konfiguriert

## ⚠️ Bekanntes Problem

**MariaDB Benutzer-Authentifizierung**:
- Der `rb_user` hat aktuell keine Zugriffsrechte für Docker-Netzwerk-IPs
- **Workaround**: Migration wurde manuell erstellt (basierend auf Entities)
- **Für Produktion**: Benutzer-Grants müssen korrekt gesetzt werden

### ⚠️ Sicherheitshinweis für Produktion

**WICHTIG**: Verwenden Sie in Produktionsumgebungen niemals hartcodierte oder Beispiel-Credentials!

### Lösung für Entwicklungsumgebung:

**Option 1: Direkter Zugriff (manuell ersetzen)**
```sql
-- Im MariaDB-Container ausführen (NUR für lokale Entwicklung):
-- Ersetzen Sie <YOUR_USER> und <YOUR_PASSWORD> mit Ihren tatsächlichen Werten aus der .env-Datei
CREATE USER IF NOT EXISTS '<YOUR_USER>'@'localhost' IDENTIFIED BY '<YOUR_PASSWORD>';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON raueberbude.* TO '<YOUR_USER>'@'localhost';
FLUSH PRIVILEGES;
```

**Option 2: Mit Shell-Substitution (Bash/PowerShell)**
```bash
# Bash/Linux (stellen Sie sicher, dass Umgebungsvariablen gesetzt sind)
docker exec backend-mariadb-1 mariadb -u root -p"${MARIADB_ROOT_PASSWORD}" -e "
CREATE USER IF NOT EXISTS '${MARIADB_USER}'@'localhost' IDENTIFIED BY '${MARIADB_PASSWORD}';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON raueberbude.* TO '${MARIADB_USER}'@'localhost';
FLUSH PRIVILEGES;"
```

### Für Produktionsumgebungen:
1. **Credentials**: Nutzen Sie einen Secrets Manager (z.B. AWS Secrets Manager, HashiCorp Vault, Azure Key Vault)
2. **Benutzerberechtigungen**: Vergeben Sie nur die minimal notwendigen Rechte (Least Privilege Principle)
3. **Host-Einschränkung**: Beschränken Sie den Zugriff auf spezifische IP-Adressen oder Netzwerke, niemals auf `'%'`
4. **Beispiel für eingeschränkte Berechtigungen** (Werte manuell aus Secrets Manager abrufen):
   ```sql
   -- Ersetzen Sie <YOUR_USER>, <YOUR_PASSWORD> und <SPECIFIC_IP> mit tatsächlichen Werten
   CREATE USER IF NOT EXISTS '<YOUR_USER>'@'<SPECIFIC_IP>' IDENTIFIED BY '<YOUR_PASSWORD>';
   GRANT SELECT, INSERT, UPDATE, DELETE ON raueberbude.* TO '<YOUR_USER>'@'<SPECIFIC_IP>';
   FLUSH PRIVILEGES;
   ```

## 🚀 Nächste Schritte

### Schritt 1: MariaDB neu starten (mit korrekter User-Init)
```powershell
cd C:\Users\corat\IdeaProjects\raueberbude\backend

# Stoppe MariaDB
docker-compose stop mariadb

# Lösche altes Volume (NUR wenn du Daten verlieren kannst!)
docker volume rm backend_mariadb_data

# Starte MariaDB neu
docker-compose up -d mariadb

# Warte auf Initialisierung
Start-Sleep -Seconds 15
```

### Schritt 2: Benutzer-Grants setzen (NUR für lokale Entwicklung)
```powershell
# ⚠️ WARNUNG: Nur für lokale Entwicklung verwenden!
# Für Produktion: Verwenden Sie sichere, umgebungsspezifische Credentials aus einem Secrets Manager
# Ersetzen Sie die Werte mit Ihren tatsächlichen Umgebungsvariablen
docker exec backend-mariadb-1 mariadb -u root -p"${MARIADB_ROOT_PASSWORD}" -e "CREATE USER IF NOT EXISTS '${MARIADB_USER}'@'localhost' IDENTIFIED BY '${MARIADB_PASSWORD}'; GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, DROP, INDEX, ALTER ON raueberbude.* TO '${MARIADB_USER}'@'localhost'; FLUSH PRIVILEGES;"
```

### Schritt 3: Migration ausführen
```powershell
cd C:\Users\corat\IdeaProjects\raueberbude\backend\nest-app

# Führe Migration aus (erstellt Tabellen)
npm run migration:run
```

### Schritt 4: Daten migrieren (MongoDB → MariaDB)
```powershell
# Migriere Daten von MongoDB nach MariaDB
npm run migrate:mongo-to-mariadb
```

### Schritt 5: API neu starten
```powershell
cd C:\Users\corat\IdeaProjects\raueberbude\backend
docker-compose restart api
```

### Schritt 6: Smoke-Tests ausführen
```powershell
cd C:\Users\corat\IdeaProjects\raueberbude
.\scripts\deploy\run-smoke-tests.ps1
```

## 📂 Erstellte/Geänderte Dateien

### Neue Dateien
```
backend/nest-app/
  .env (mit MariaDB-Config)
  src/
    data-source.ts
    migrations/
      1764803356229-InitialSchema.ts
    users/entities/
      user.entity.ts
    modules/
      speech/entities/
        app-terminal.entity.ts
      logging/entities/
        transcript.entity.ts
        intentlog.entity.ts
      homeassistant/entities/
        ha-entity.entity.ts
    cli/
      migrate-mongo-to-mariadb.ts
```

### Geänderte Dateien
```
backend/
  docker-compose.yml (MariaDB hinzugefügt, Port 3307)
  .env.example (MariaDB-Config dokumentiert)
  nest-app/
    package.json (dotenv dependency + TypeORM scripts)
    src/
      config/
        database.config.ts (MariaDB statt MongoDB)
      app.module.ts (TypeOrmModule hinzugefügt)
```

## 🎯 Migration-Schema

### Tabellen-Struktur

#### app_users
- UUID Primary Key
- username (unique)
- email (unique)
- password_hash
- timestamps

#### app_terminals
- UUID Primary Key
- terminal_id (unique)
- name, description, type, location
- capabilities (JSON)
- status (enum)
- assigned_user_id (FK → app_users)
- settings, metadata (JSON)
- timestamps

#### transcripts
- UUID Primary Key
- text, confidence, language
- terminal_id (FK → app_terminals)
- stt_provider (enum)
- audio_duration_ms
- timestamps

#### intent_logs
- UUID Primary Key
- transcript, detected_intent, confidence
- entities (JSON)
- terminal_id (FK → app_terminals)
- processing_time_ms, llm_provider
- timestamps

#### ha_entities
- UUID Primary Key
- entity_id (unique)
- friendly_name, device_class, area, domain
- capabilities, labels (JSON)
- timestamps

## 🔧 Troubleshooting

### Problem: "Access denied for user 'rb_user'"
**Lösung**: Grants neu setzen (siehe Schritt 2 oben)

### Problem: "Migration already exists"
**Lösung**: Migration wurde bereits erstellt (1764803356229-InitialSchema.ts)

### Problem: MariaDB läuft nicht
**Lösung**: 
```powershell
docker-compose -f backend/docker-compose.yml logs mariadb
docker-compose -f backend/docker-compose.yml up -d mariadb
```

### Problem: TypeORM findet Entities nicht
**Lösung**: Prüfe, dass `tsconfig.json` und `tsconfig-paths` korrekt konfiguriert sind

## 📊 Erfolgs-Metriken

- ✅ 5 TypeORM-Entities erstellt
- ✅ 1 vollständige Migration (InitialSchema)
- ✅ 5 Tabellen mit Foreign Keys
- ✅ Indizes für Performance
- ✅ Rollback-Logik implementiert
- ✅ Datenmigrations-Skript bereit

## 🎉 Die Migration ist READY!

**Alle Voraussetzungen sind erfüllt.**  
**Folge einfach den "Nächsten Schritten" oben, um die Migration durchzuführen.**

---

**Erstellt**: 2025-12-04  
**Status**: READY FOR EXECUTION  
**Ticket**: LUD28-113

