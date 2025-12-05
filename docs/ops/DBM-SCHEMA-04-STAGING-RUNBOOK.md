# DBM-SCHEMA-04 Staging Runbook

**Ticket:** [LUD28-60](https://luzumi.youtrack.cloud/projects/LUD28/issues/LUD28-60)  
**Datum:** 2025-12-04  
**Autor:** System  
**Version:** 1.0  

---

## 1. Übersicht

Dieses Runbook beschreibt die Schritte zur Durchführung der Many-to-Many Migration auf dem **Staging-System**.

**Ziel:** Migration von MongoDB Arrays (keywords, suggestions) zu normalisierten MariaDB Join-Tabellen.

**Geschätzte Dauer:** 30-60 Minuten (abhängig von Datenvolumen)

**Erforderliche Rechte:** SSH-Zugriff auf Staging-Server, DB-Admin Rechte

---

## 2. Pre-Flight Checklist

### 2.1 Voraussetzungen prüfen

- [ ] Git Branch `feat/dbm-schema-04` ist auf Staging deployed
- [ ] Backend NestJS App läuft und ist erreichbar
- [ ] MongoDB ist erreichbar und enthält Daten
- [ ] MariaDB ist erreichbar und Basis-Schema existiert
- [ ] Node.js v18+ und npm installiert
- [ ] Backup-Speicherplatz verfügbar (min. 2x DB-Größe)

### 2.2 Umgebungsvariablen prüfen

```bash
# .env File prüfen
cat backend/nest-app/.env

# Erforderliche Variablen:
# DB_HOST=localhost
# DB_PORT=3306
# DB_USER=root
# DB_PASSWORD=***
# DB_NAME=raeuberbude
# MONGO_URI=mongodb://rb_root:***@localhost:27018/raueberbude?authSource=admin
```

---

## 3. Backup erstellen

### 3.1 MongoDB Backup

```bash
# Backup Directory erstellen
mkdir -p /backup/staging/$(date +%Y%m%d)
cd /backup/staging/$(date +%Y%m%d)

# MongoDB Dump
mongodump \
  --uri="mongodb://rb_root:rb_secret@localhost:27018/raueberbude?authSource=admin" \
  --out=./mongodb_pre_m2m_migration

# Backup verifizieren
ls -lh ./mongodb_pre_m2m_migration/raueberbude/
# Erwartete Collections: transcripts.bson, intentlogs.bson, etc.

# Komprimieren
tar -czf mongodb_pre_m2m_migration.tar.gz ./mongodb_pre_m2m_migration
```

### 3.2 MariaDB Backup

```bash
# MariaDB Dump
mysqldump \
  -h localhost \
  -P 3306 \
  -u root \
  -p \
  --single-transaction \
  --routines \
  --triggers \
  raueberbude > mariadb_pre_m2m_migration.sql

# Backup verifizieren
head -n 20 mariadb_pre_m2m_migration.sql
wc -l mariadb_pre_m2m_migration.sql

# Komprimieren
gzip mariadb_pre_m2m_migration.sql
```

### 3.3 Backup-Checksums erstellen

```bash
# MD5 Checksums
md5sum mongodb_pre_m2m_migration.tar.gz > checksums.md5
md5sum mariadb_pre_m2m_migration.sql.gz >> checksums.md5

# Checksums prüfen
cat checksums.md5
```

**✅ Checkpoint:** Backups erfolgreich erstellt und verifiziert

---

## 4. Migration durchführen

### 4.1 TypeORM Migration ausführen

```bash
cd /opt/raeuberbude/backend/nest-app

# Migration Status prüfen
npm run migration:show

# Migration ausführen (erstellt neue Tabellen)
npm run migration:run

# Erwartete Output:
# - Migration 1764886700000-AddKeywordsSuggestionsTables is executed

# Tabellen prüfen
mysql -u root -p -e "
  USE raueberbude;
  SHOW TABLES LIKE 'keywords';
  SHOW TABLES LIKE 'suggestions';
  SHOW TABLES LIKE 'transcript_keywords';
  SHOW TABLES LIKE 'transcript_suggestions';
  SHOW TABLES LIKE 'intent_log_keywords';
"
```

**✅ Checkpoint:** Alle 5 Tabellen existieren in MariaDB

### 4.2 Daten-Migration durchführen

```bash
# Migration starten (kann 10-30 Minuten dauern)
npm run migrate:keywords-suggestions

# Erwartete Output:
# 🚀 Starting Keywords & Suggestions Migration...
# 
# 🔌 Connecting to MongoDB...
# ✅ MongoDB connected
# 
# 🔌 Connecting to MariaDB...
# ✅ MariaDB connected
# 
# 📦 Migrating Transcript Keywords...
#    Found X transcripts with keywords
#    ✅ Migrated Y transcript-keyword links
# 
# 📦 Migrating Transcript Suggestions...
#    Found X transcripts with suggestions
#    ✅ Migrated Y transcript-suggestion links
# 
# 📦 Migrating IntentLog Keywords...
#    Found X intent logs with keywords
#    ✅ Migrated Y intent-log-keyword links
# 
# 📊 Updating Usage Counts...
#    ✅ Usage counts updated
# 
# ============================================================
# 📊 MIGRATION STATISTICS
# ============================================================
# Total Transcripts Processed: X
# Total IntentLogs Processed: Y
# Unique Keywords Created: Z
# Unique Suggestions Created: W
# ...
# ============================================================
# 
# 🎉 Migration completed successfully!
```

**Bei Fehlern:**
- Logs in `/var/log/raeuberbude/migration.log` prüfen
- Fehlerhafte Dokumente notieren
- Bei kritischen Fehlern: Migration abbrechen und Rollback durchführen (siehe Abschnitt 6)

**✅ Checkpoint:** Daten-Migration abgeschlossen ohne kritische Fehler

---

## 5. Validierung durchführen

### 5.1 Automatische Validierung

```bash
# Validierungs-Script ausführen
npm run validate:many-to-many-migration

# Erwartete Output:
# 🚀 Starting Many-to-Many Migration Validation...
# 
# ✓ Connected to MariaDB
# 
# 🔍 Validating Row Counts...
# 🔍 Validating Referential Integrity...
# 🔍 Validating Duplicates...
# 🔍 Validating Usage Counts...
# 
# 📊 Migration Statistics:
#   Total Keywords: X
#   Total Suggestions: Y
#   ...
# 
# 🏆 Top 10 Keywords:
#   1. home (150 uses)
#   2. assistant (120 uses)
#   ...
# 
# ============================================================
# 📋 VALIDATION RESULTS SUMMARY
# ============================================================
# 
# ✅ Transcript Keywords Count
#    Found Y keyword associations for X transcripts
# 
# ✅ Orphaned Transcript Keywords
#    ✓ No orphaned transcript keywords
# 
# ✅ Duplicate Keywords
#    ✓ No duplicate keywords
# 
# ...
# 
# ============================================================
# ✅ Passed: 12
# ❌ Failed: 0
# 📊 Total: 12
# ============================================================
# 
# 🎉 ALL VALIDATIONS PASSED!
```

**Bei Fehlern:**
- Details der fehlgeschlagenen Tests prüfen
- Queries manuell ausführen zur Diagnose
- Bei > 5% Failed: Rollback erwägen

**✅ Checkpoint:** Alle Validierungen bestanden (0 Failed)

### 5.2 Manuelle Stichproben

```bash
# MariaDB Console öffnen
mysql -u root -p raueberbude

-- Stichprobe: Transcript mit Keywords
SELECT 
  t.id,
  t.transcript,
  GROUP_CONCAT(k.keyword ORDER BY tk.position) as keywords
FROM transcripts t
LEFT JOIN transcript_keywords tk ON t.id = tk.transcript_id
LEFT JOIN keywords k ON tk.keyword_id = k.id
WHERE t.id IN (
  SELECT id FROM transcripts WHERE category = 'home_assistant_command' LIMIT 5
)
GROUP BY t.id, t.transcript;

-- Stichprobe: Transcript mit Suggestions
SELECT 
  t.id,
  t.ai_adjusted_text,
  GROUP_CONCAT(s.suggestion_text ORDER BY ts.position SEPARATOR ' | ') as suggestions
FROM transcripts t
LEFT JOIN transcript_suggestions ts ON t.id = ts.transcript_id
LEFT JOIN suggestions s ON ts.suggestion_id = s.id
WHERE t.suggestion_flag = TRUE
LIMIT 5;

-- Stichprobe: IntentLog mit Keywords
SELECT 
  il.id,
  il.intent_key,
  GROUP_CONCAT(k.keyword ORDER BY ilk.position) as keywords
FROM intent_logs il
LEFT JOIN intent_log_keywords ilk ON il.id = ilk.intent_log_id
LEFT JOIN keywords k ON ilk.keyword_id = k.id
LIMIT 5;

-- Exit
EXIT;
```

**Erwartung:** Daten sind korrekt verknüpft, Keywords/Suggestions sind lesbar

**✅ Checkpoint:** Manuelle Stichproben erfolgreich

### 5.3 Performance-Check

```bash
# Explain für typische Queries
mysql -u root -p raueberbude -e "
  EXPLAIN SELECT t.*
  FROM transcripts t
  JOIN transcript_keywords tk ON t.id = tk.transcript_id
  JOIN keywords k ON tk.keyword_id = k.id
  WHERE k.normalized = 'home';
"

# Erwartung: Index-Scan auf ix_keywords__normalized
```

**✅ Checkpoint:** Queries verwenden Indizes, keine Full Table Scans

---

## 6. Rollback-Prozedur (falls erforderlich)

### 6.1 Wann Rollback durchführen?

- ✅ > 10% Fehlerrate bei Validierung
- ✅ Kritische Datenintegritäts-Fehler (Orphaned References)
- ✅ Performance-Probleme (Queries > 5s)
- ✅ Anwendung funktioniert nicht korrekt

### 6.2 Rollback Schritte

```bash
cd /opt/raeuberbude/backend/nest-app

# 1. App stoppen
pm2 stop raeuberbude-api

# 2. TypeORM Migration rückgängig machen
npm run migration:revert

# Erwartete Output:
# - Migration 1764886700000-AddKeywordsSuggestionsTables is reverted

# 3. Tabellen manuell prüfen (sollten gelöscht sein)
mysql -u root -p -e "
  USE raueberbude;
  SHOW TABLES LIKE 'keywords';
  SHOW TABLES LIKE 'suggestions';
"
# Erwartete Output: Empty set

# 4. Falls nötig: MariaDB Dump zurückspielen
cd /backup/staging/$(date +%Y%m%d)
gunzip mariadb_pre_m2m_migration.sql.gz
mysql -u root -p raueberbude < mariadb_pre_m2m_migration.sql

# 5. App neu starten
pm2 restart raeuberbude-api

# 6. Health Check
curl http://localhost:3000/health
```

**✅ Checkpoint:** System ist im Vor-Migrations-Zustand

---

## 7. Post-Migration Monitoring

### 7.1 Erste 24h

```bash
# Logs überwachen
tail -f /var/log/raeuberbude/api.log | grep -i keyword

# DB-Queries monitoren
mysql -u root -p -e "
  SHOW FULL PROCESSLIST;
"

# Performance-Metriken
mysql -u root -p -e "
  SELECT 
    TABLE_NAME, 
    TABLE_ROWS, 
    AVG_ROW_LENGTH,
    DATA_LENGTH / 1024 / 1024 AS data_mb,
    INDEX_LENGTH / 1024 / 1024 AS index_mb
  FROM information_schema.TABLES
  WHERE TABLE_SCHEMA = 'raueberbude'
    AND TABLE_NAME IN ('keywords', 'suggestions', 'transcript_keywords', 'transcript_suggestions', 'intent_log_keywords')
  ORDER BY DATA_LENGTH DESC;
"
```

### 7.2 KPIs überwachen

- **Query Performance:** Durchschnittliche Response Time < 100ms
- **Keyword-Usage:** Top 10 Keywords sollten > 50% Coverage haben
- **Error Rate:** < 0.1% bei API-Calls
- **Index Usage:** Alle Queries sollten Indizes verwenden

### 7.3 Feedback sammeln

- [ ] DevOps Team informieren über erfolgreiche Migration
- [ ] Backend-Entwickler über neue Entities informieren
- [ ] Frontend-Team über mögliche neue API-Endpoints informieren

---

## 8. Success Criteria

✅ **Migration erfolgreich, wenn:**

- [ ] Alle 5 Tabellen existieren in MariaDB
- [ ] Validierungs-Script zeigt 0 Failed Tests
- [ ] Manuelle Stichproben zeigen korrekte Daten
- [ ] Performance-Checks zeigen Index-Usage
- [ ] Keine kritischen Fehler in Logs (erste 2h)
- [ ] App funktioniert normal (Health Checks grün)
- [ ] Backups sind vorhanden und verifiziert

---

## 9. Troubleshooting

### Problem: Migration bricht mit "Connection timeout" ab

**Lösung:**
```bash
# MongoDB Connection Timeout erhöhen
export MONGO_CONNECT_TIMEOUT_MS=60000

# MariaDB Pool Size erhöhen
# In .env:
# DB_POOL_SIZE=20
```

### Problem: "Duplicate entry" Fehler

**Ursache:** Migration wurde bereits teilweise durchgeführt

**Lösung:**
```bash
# Join-Tables leeren und neu starten
mysql -u root -p raueberbude -e "
  TRUNCATE TABLE transcript_keywords;
  TRUNCATE TABLE transcript_suggestions;
  TRUNCATE TABLE intent_log_keywords;
"

# Migration erneut durchführen
npm run migrate:keywords-suggestions
```

### Problem: Validierung zeigt "Orphaned References"

**Ursache:** Transcripts/IntentLogs wurden nach MongoDB-Extraktion aber vor Join-Table-Insert gelöscht

**Lösung:**
```bash
# Orphaned Entries manuell löschen
mysql -u root -p raueberbude -e "
  DELETE tk FROM transcript_keywords tk
  LEFT JOIN transcripts t ON tk.transcript_id = t.id
  WHERE t.id IS NULL;
"

# Validierung erneut durchführen
npm run validate:many-to-many-migration
```

---

## 10. Abschluss

Nach erfolgreicher Migration und 24h Monitoring:

- [ ] Dokumentation aktualisieren (Success/Lessons Learned)
- [ ] YouTrack Ticket [LUD28-60](https://luzumi.youtrack.cloud/projects/LUD28/issues/LUD28-60) auf "Resolved" setzen
- [ ] Production Rollout planen (separates Runbook)

---

**Ende des Runbooks**

