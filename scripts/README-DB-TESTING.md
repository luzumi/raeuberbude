# Database Testing & Monitoring Scripts

Dieses Verzeichnis enthält Skripte zur Validierung und Überwachung des MariaDB-Schemas.

## 📋 Übersicht

| Script | Zweck | Dauer | Status |
|--------|-------|-------|--------|
| `db-load-test.js` | Load-Tests (1000 req/min) | ~10 min | ✅ Ready |
| `db-explain-queries.sql` | Index-Validierung | ~2 min | ✅ Ready |
| `db-backup-test.ps1` | Backup/Restore-Test | ~5 min | ✅ Ready |
| `db-monitoring-setup.ps1` | Monitoring aktivieren | ~1 min | ✅ Ready |

---

## 🚀 Quick Start

### 1. Load-Tests durchführen

**Ziel:** Simuliere 1000 Requests/Minute für 5 Minuten

```bash
# k6 installieren (falls nicht vorhanden)
npm install -g k6

# Load-Test ausführen
cd scripts
k6 run db-load-test.js

# Mit Custom-Config
k6 run --vus 100 --duration 5m db-load-test.js
```

**Erwartete Ausgabe:**
```
✅ Load Test Complete
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Requests:
  Total:    5000
  Rate:     16.67/s

⏱️  Response Times:
  Avg:      50.23ms
  Median:   45.12ms
  P95:      120.45ms
  P99:      180.23ms
  Max:      250.12ms

✅ Error Rate: 0.02% (OK)
✅ Slow Queries: 5.12% (OK)

🎯 Thresholds:
  ✅ PASS http_req_duration
  ✅ PASS errors
  ✅ PASS slow_queries
```

---

### 2. Index-Validierung (EXPLAIN ANALYZE)

**Ziel:** Prüfe, ob alle kritischen Queries Indizes nutzen

```powershell
# MariaDB muss laufen
docker-compose up -d mariadb

# EXPLAIN Queries ausführen
docker exec -i mariadb mysql -u rb_user -prb_user_secret < scripts\db-explain-queries.sql > explain-results.txt

# Ergebnisse prüfen
notepad explain-results.txt
```

**Was zu prüfen ist:**
- ✅ `type` != `ALL` (keine Full Table Scans)
- ✅ `key` != `NULL` (Index wird genutzt)
- ✅ `rows` < 1000 (effiziente Index-Nutzung)
- ✅ `Extra` != `Using filesort` (für ORDER BY)

**Erwartete Probleme (akzeptiert):**
- ⚠️ Full-Text-Suche in `transcript` → Table Scan (kein FULLTEXT-Index)
- ⚠️ JSON-Feld-Queries → Table Scan (keine JSON-Indizes)
- ⚠️ Large-Offset-Pagination → Langsam (Cursor-based Pagination empfohlen)

---

### 3. Backup/Restore-Test

**Ziel:** Validiere Backup- und Restore-Prozeduren

```powershell
# PowerShell als Administrator
.\scripts\db-backup-test.ps1

# Mit Custom-Parametern
.\scripts\db-backup-test.ps1 -ContainerName "mariadb" -Database "raueberbude" -BackupDir ".\backups"
```

**Was wird getestet:**
1. ✅ Full Backup (Schema + Daten)
2. ✅ Schema-Only Backup
3. ✅ Table-Specific Backup (kritische Tabellen)
4. ✅ Restore in Test-Datenbank
5. ✅ Daten-Validierung (Test-Daten vorhanden?)
6. ✅ Binlog-Konfiguration (Point-in-Time Recovery)

**Erwartete Ausgabe:**
```
✅ Full backup: .\backups\raueberbude_full_2025-12-05_14-30-00.sql
✅ Schema backup: .\backups\raueberbude_schema_2025-12-05_14-30-00.sql
✅ Table backup: .\backups\raueberbude_critical_tables_2025-12-05_14-30-00.sql
✅ Restore test: PASSED

📋 Recommendations:
  1. Schedule daily backups (cron/Task Scheduler)
  2. Rotate backups (keep last 7 daily, 4 weekly)
  3. Test restore quarterly
  4. Store backups off-site (S3, NAS, etc.)
  5. Enable binary logging for PITR
```

---

### 4. Monitoring aktivieren

**Ziel:** Aktiviere Slow Query Log und Performance Monitoring

```powershell
# PowerShell als Administrator
.\scripts\db-monitoring-setup.ps1

# Mit Custom-Threshold (Queries > 2 sec)
.\scripts\db-monitoring-setup.ps1 -SlowQueryThreshold 2
```

**Was wird konfiguriert:**
1. ✅ Slow Query Log aktiviert
2. ✅ Monitoring-Views erstellt (`v_slow_queries`, `v_index_usage`, `v_table_stats`)
3. ✅ Monitoring-Script installiert (`/usr/local/bin/monitor-db.sh`)
4. ✅ Prometheus-Exporter-Config generiert (optional)

**Nach Setup:**
```bash
# Slow Queries anzeigen
docker exec mariadb tail -f /var/log/mysql/slow-query.log

# Monitoring-Script ausführen
docker exec mariadb /usr/local/bin/monitor-db.sh

# Statistiken abfragen
docker exec -i mariadb mysql -u rb_user -prb_user_secret raueberbude -e "SELECT * FROM v_slow_queries;"
```

---

## 📊 Erwartete Ergebnisse

### Load-Test Thresholds

| Metrik | Ziel | Akzeptabel | Kritisch |
|--------|------|------------|----------|
| **P95 Response Time** | < 100ms | < 200ms | > 500ms |
| **P99 Response Time** | < 200ms | < 500ms | > 1000ms |
| **Error Rate** | < 1% | < 5% | > 10% |
| **Slow Queries** | < 5% | < 10% | > 20% |
| **Throughput** | > 1000/min | > 500/min | < 100/min |

### Index-Usage

**Alle kritischen Queries sollten Indizes nutzen:**
- ✅ User Login: `UNIQUE` auf `username`
- ✅ Permissions Lookup: `FK` auf `user_id`
- ✅ Transcript List: Composite `(user_id, created_at)`
- ✅ Entity Lookup: `PRIMARY KEY` auf `entity_id`
- ✅ State History: Composite `(entity_id, snapshot_id)`

### Backup-Size Schätzung

| Datenbestand | Schema | Full Backup | Geschätzt/Jahr |
|--------------|--------|-------------|----------------|
| **PoC/Dev** | ~50 KB | ~500 KB | ~10 MB |
| **Staging** | ~50 KB | ~5 MB | ~100 MB |
| **Production** | ~50 KB | ~50 MB | ~1 GB |

---

## 🔧 Troubleshooting

### Load-Test schlägt fehl

**Problem:** `Connection refused` oder `Timeout`

```bash
# Docker prüfen
docker ps

# API-Server prüfen
curl http://localhost:3000/health

# Logs prüfen
docker logs api
```

### EXPLAIN zeigt Table Scans

**Problem:** `type: ALL` statt Index-Nutzung

```sql
-- Prüfe, ob Index existiert
SHOW INDEX FROM speech_transcripts;

-- Prüfe Cardinality (Index-Qualität)
ANALYZE TABLE speech_transcripts;

-- Prüfe Index-Nutzung
SELECT * FROM v_index_usage WHERE table_name = 'speech_transcripts';
```

### Backup schlägt fehl

**Problem:** `Access denied` oder `Permission denied`

```bash
# Container-Logs prüfen
docker logs mariadb

# Benutzer-Rechte prüfen
docker exec -i mariadb mysql -u root -proot_password -e "SHOW GRANTS FOR 'rb_user'@'%';"

# Backup-Verzeichnis-Rechte prüfen (Windows)
icacls .\backups
```

---

## 📚 Weitere Ressourcen

### MariaDB Performance Tuning

```sql
-- InnoDB Buffer Pool Size (70-80% des RAMs)
SET GLOBAL innodb_buffer_pool_size = 1073741824; -- 1 GB

-- Query Cache (deprecated in MariaDB 10.5+)
-- Nutze Redis/Memcached stattdessen

-- Connection Pool
SET GLOBAL max_connections = 200;
SET GLOBAL thread_cache_size = 8;
```

### Prometheus + Grafana Setup

```yaml
# docker-compose.yml
services:
  mysqld-exporter:
    image: prom/mysqld-exporter
    ports:
      - "9104:9104"
    volumes:
      - ./docker/prometheus-mysqld-exporter.cnf:/etc/.my.cnf
    environment:
      DATA_SOURCE_NAME: "exporter:exporter_password@(mariadb:3306)/"

  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./docker/prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
```

---

## ✅ Checkliste vor Production

- [ ] **Load-Tests bestanden** (P95 < 200ms, Error-Rate < 5%)
- [ ] **EXPLAIN validiert** (Alle Queries nutzen Indizes)
- [ ] **Backup-Test erfolgreich** (Restore in <5 Minuten)
- [ ] **Monitoring aktiviert** (Slow Query Log + Prometheus)
- [ ] **Binlog aktiviert** (Point-in-Time Recovery)
- [ ] **Backup-Schedule erstellt** (Täglich + Wöchentlich)
- [ ] **Rollback-Plan dokumentiert** (in `docs/DBM-STAGING-RUNBOOK.md`)
- [ ] **Smoke-Tests bestanden** (via `run-smoke-tests.ps1`)

---

**Nächster Schritt:** Staging-Deployment gemäß `docs/DBM-STAGING-RUNBOOK.md`

