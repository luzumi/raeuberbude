# Staging-Deployment Runbook: MongoDB → MariaDB Migration

## 🎯 Übersicht

Dieses Runbook dokumentiert den vollständigen Prozess für das Staging-Deployment der MongoDB-zu-MariaDB-Migration, einschließlich Smoke-Tests, Monitoring und Rollback-Prozeduren.

**Ticket**: LUD28-112 - Staging-Deployment & Smoke-Tests  
**Datum**: 2025-12-03  
**Verantwortlich**: Backend-Team, DB-Admin, OPS-Team

---

## 📋 Pre-Deployment Checklist

### Vorbereitung (24h vor Deployment)

- [ ] **Kommunikation**: Stakeholder über geplante Downtime informieren
- [ ] **Team-Verfügbarkeit**: Mindestens 2 Team-Mitglieder verfügbar
- [ ] **Backup**: Vollständiges MongoDB-Backup erstellt und validiert
- [ ] **Monitoring**: Monitoring-Dashboards vorbereitet
- [ ] **Rollback-Plan**: Dokumentiert und reviewed

### Technische Voraussetzungen

- [ ] MariaDB-Container läuft in Staging (`docker-compose ps`)
- [ ] TypeORM-Migrations kompiliert (`npm run build`)
- [ ] Umgebungsvariablen in Staging gesetzt
- [ ] Netzwerk-Konnektivität getestet
- [ ] Playwright-Tests lokal erfolgreich

---

## 🚀 Deployment-Schritte

### 1. Backup erstellen (15 Min)

```powershell
# MongoDB Backup
cd backend
docker-compose exec mongo mongodump --authenticationDatabase admin \
  -u rb_root -p rb_secret \
  --db raueberbude \
  --out /data/backup/staging-$(Get-Date -Format "yyyy-MM-dd-HHmm")

# Backup auf Host kopieren
docker cp backend-mongo-1:/data/backup ./backups/
```

**Validation**: Backup-Datei existiert und hat sinnvolle Größe (> 1 KB)

### 2. MariaDB hochfahren (5 Min)

```powershell
cd backend
docker-compose up -d mariadb

# Health-Check warten
docker-compose ps mariadb
# Status sollte "healthy" sein
```

**Validation**: `docker-compose logs mariadb | Select-String "ready for connections"`

### 3. TypeORM-Migrations ausführen (10 Min)

```powershell
cd backend/nest-app

# Migrations ausführen
npm run migration:run

# Validation: Tabellen-Check
docker-compose exec mariadb mysql -u rb_user -prb_user_secret raueberbude -e "SHOW TABLES;"
```

**Erwartete Tabellen**:
- `migrations`
- `app_users`
- `app_terminals`
- `transcripts`
- `intent_logs`
- `ha_entities`

**Validation**: Alle erwarteten Tabellen vorhanden

### 4. Datenmigration durchführen (30-60 Min, abhängig von Datenmenge)

```powershell
cd backend/nest-app

# Migration starten
npm run migrate:mongo-to-mariadb

# Logs beobachten
# Erwartete Ausgabe: Statistiken pro Collection
```

**Validation**: 
- Migrations-Skript endet mit Exit Code 0
- Erfolgsrate > 95%
- Keine kritischen Fehler in Logs

### 5. API-Service neu starten (5 Min)

```powershell
cd backend

# Service neu starten mit MariaDB-Verbindung
docker-compose restart api

# Warten auf Health-Check
Start-Sleep -Seconds 10

# Health-Check
Invoke-RestMethod -Uri http://localhost:3001/health
```

**Validation**: Health-Endpoint gibt `{ "status": "ok" }` zurück

---

## ✅ Smoke-Tests

### Automatisierte Tests (10 Min)

```powershell
cd ..  # zurück zum Root
npx playwright test playwright/tests/migration-smoke.spec.ts --reporter=list
```

**Erwartete Ergebnisse**:
- Alle Tests bestanden (grün)
- Response-Zeiten < 500ms
- Keine Fehler in API-Logs

### Manuelle Checks (15 Min)

#### 1. Datenintegrität validieren

```powershell
# Count-Vergleich MongoDB vs MariaDB
$mongoUsers = docker-compose -f backend/docker-compose.yml exec mongo mongosh \
  -u rb_root -p rb_secret --authenticationDatabase admin \
  --eval "db.app_users.countDocuments()"

$mariaUsers = docker-compose -f backend/docker-compose.yml exec mariadb \
  mysql -u rb_user -prb_user_secret raueberbude \
  -e "SELECT COUNT(*) FROM app_users;"

Write-Host "MongoDB Users: $mongoUsers"
Write-Host "MariaDB Users: $mariaUsers"
```

**Validation**: Counts sollten übereinstimmen (±2% Toleranz für Race Conditions)

#### 2. API-Endpoints testen

```powershell
# Users
Invoke-RestMethod -Uri http://localhost:3001/users | ConvertTo-Json

# Terminals
Invoke-RestMethod -Uri http://localhost:3001/terminals | ConvertTo-Json

# Transcripts (letzte 10)
Invoke-RestMethod -Uri "http://localhost:3001/transcripts?limit=10" | ConvertTo-Json

# HA Entities
Invoke-RestMethod -Uri http://localhost:3001/ha-entities | ConvertTo-Json
```

**Validation**: 
- Alle Endpoints geben JSON zurück
- Daten enthalten UUID-IDs (nicht ObjectIDs)
- Timestamps korrekt formatiert

#### 3. Sample-Daten prüfen

```sql
-- MariaDB Console öffnen
docker-compose -f backend/docker-compose.yml exec mariadb \
  mysql -u rb_user -prb_user_secret raueberbude

-- Sample Queries
SELECT * FROM app_users LIMIT 5;
SELECT * FROM transcripts ORDER BY created_at DESC LIMIT 5;
SELECT * FROM ha_entities LIMIT 5;

-- Foreign Key Validation
SELECT t.*, u.username 
FROM app_terminals t 
LEFT JOIN app_users u ON t.assigned_user_id = u.id 
LIMIT 5;
```

**Validation**: 
- Daten korrekt migriert
- Foreign Keys funktionieren
- Keine NULL-Werte in required-Feldern

---

## 📊 Monitoring

### Logging

**Logs sammeln**:
```powershell
# API Logs
docker-compose -f backend/docker-compose.yml logs api --tail=100 > logs/staging-api-$(Get-Date -Format "yyyy-MM-dd-HHmm").log

# MariaDB Logs
docker-compose -f backend/docker-compose.yml logs mariadb --tail=100 > logs/staging-mariadb-$(Get-Date -Format "yyyy-MM-dd-HHmm").log
```

**Auf folgende Fehler achten**:
- Connection Timeouts
- Deadlocks
- Foreign Key Violations
- Memory Issues

### Performance Monitoring

```powershell
# Container-Ressourcen überwachen
docker stats --no-stream

# CPU/Memory Alert Thresholds:
# - API Container: < 80% CPU, < 2GB Memory
# - MariaDB Container: < 70% CPU, < 4GB Memory
```

### Health-Check Dashboard

URLs für Monitoring:
- **Health**: http://localhost:3001/health
- **DB Health**: http://localhost:3001/health/db
- **Swagger API**: http://localhost:3001/api

---

## 🔙 Rollback-Prozedur

### Wann Rollback?

Rollback durchführen, wenn:
- [ ] Smoke-Tests fehlschlagen (> 20% Fehlerrate)
- [ ] Kritische Dateninkonsistenz festgestellt
- [ ] Performance-Degradation > 50%
- [ ] Applikation nicht erreichbar nach 5 Min
- [ ] Stakeholder-Entscheidung

### Rollback-Schritte (15 Min)

```powershell
cd backend

# 1. API-Service stoppen
docker-compose stop api

# 2. MariaDB-Container stoppen
docker-compose stop mariadb

# 3. Auf MongoDB zurückschalten
# Umgebungsvariable zurücksetzen (MONGO_URI aktiv, MARIADB deaktiviert)

# 4. API-Service mit MongoDB neu starten
docker-compose up -d api

# 5. Health-Check
Invoke-RestMethod -Uri http://localhost:3001/health

# 6. Validieren, dass alte Daten noch da sind
docker-compose exec mongo mongosh -u rb_root -p rb_secret \
  --authenticationDatabase admin \
  --eval "db.app_users.countDocuments()"
```

**Post-Rollback**:
- [ ] Stakeholder informieren
- [ ] Fehlerursache dokumentieren
- [ ] Post-Mortem planen

---

## 📝 Post-Deployment

### Success Criteria

- [ ] Alle Smoke-Tests bestanden
- [ ] Datenintegrität validiert (Counts übereinstimmen)
- [ ] API Response-Zeiten < 500ms
- [ ] Keine kritischen Fehler in Logs
- [ ] Monitoring zeigt stabile Metriken

### Dokumentation

```powershell
# Deployment-Protokoll erstellen
@"
Staging Deployment Report
========================
Datum: $(Get-Date -Format "yyyy-MM-dd HH:mm")
Verantwortlich: [Name]

Migrated Collections:
- app_users: X Dokumente
- app_terminals: X Dokumente
- transcripts: X Dokumente
- intent_logs: X Dokumente
- ha_entities: X Dokumente

Erfolgsrate: XX.XX%
Downtime: XX Min
Smoke-Tests: PASSED / FAILED

Notizen:
[Spezielle Vorkommnisse, Performance-Beobachtungen]
"@ | Out-File docs/deployment/staging-deployment-$(Get-Date -Format "yyyy-MM-dd").md
```

### Follow-Up Tasks

- [ ] Deployment-Ergebnis im Team kommunizieren
- [ ] Monitoring für 24h beobachten
- [ ] Lessons Learned dokumentieren
- [ ] Produktions-Deployment planen (nach 1 Woche Staging)

---

## 👥 Kontakte & Eskalation

| Rolle | Name | Kontakt | Verfügbarkeit |
|-------|------|---------|---------------|
| Backend Lead | [Name] | [Email/Phone] | 24/7 |
| DB Admin | [Name] | [Email/Phone] | Business Hours |
| OPS Lead | [Name] | [Email/Phone] | On-Call |
| Product Owner | [Name] | [Email/Phone] | Business Hours |

**Eskalation-Pfad**:
1. Backend Lead (< 5 Min)
2. OPS Lead (< 15 Min)
3. CTO (> 30 Min kritische Ausfälle)

---

## 🔗 Referenzen

- **Migrations-Plan**: `plan-migrateMongoToMariaDb.prompt.md`
- **Migration-README**: `DBM-MIGRATION-README.md`
- **YouTrack Epic**: https://luzumi.youtrack.cloud/issues/LUD28-59
- **Ticket LUD28-112**: https://luzumi.youtrack.cloud/issues/LUD28-112
- **Docker Compose**: `backend/docker-compose.yml`
- **Smoke-Tests**: `playwright/tests/migration-smoke.spec.ts`

---

## 📅 Changelog

| Datum | Änderung | Autor |
|-------|----------|-------|
| 2025-12-03 | Initial erstellt | AI Assistant |


