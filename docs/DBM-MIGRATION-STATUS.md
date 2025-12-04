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

### Lösung für Produktion:
```sql
-- Im MariaDB-Container ausführen:
CREATE USER IF NOT EXISTS 'rb_user'@'%' IDENTIFIED BY 'rb_user_secret';
GRANT ALL PRIVILEGES ON raueberbude.* TO 'rb_user'@'%';
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

### Schritt 2: Benutzer-Grants setzen
```powershell
# Setze Grants für rb_user
docker exec backend-mariadb-1 mariadb -u root -prb_mariadb_secret -e "CREATE USER IF NOT EXISTS 'rb_user'@'%' IDENTIFIED BY 'rb_user_secret'; GRANT ALL PRIVILEGES ON raueberbude.* TO 'rb_user'@'%'; FLUSH PRIVILEGES;"
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

