# ============================================================================
# MariaDB Monitoring Setup
# ============================================================================
#
# Zweck: Aktivierung von Slow Query Log und Performance Monitoring
#
# Usage:
#   .\scripts\db-monitoring-setup.ps1
#
# Features:
#   - Slow Query Log aktivieren
#   - Performance Schema aktivieren
#   - Query-Statistiken abrufen
#   - Index-Usage analysieren
# ============================================================================

param(
    [string]$ContainerName = "mariadb",
    [string]$User = "root",
    [string]$Password = "root_password",
    [int]$SlowQueryThreshold = 1  # Sekunden
)

$ErrorActionPreference = "Stop"

function Write-Success { Write-Host "✅ $args" -ForegroundColor Green }
function Write-Error { Write-Host "❌ $args" -ForegroundColor Red }
function Write-Info { Write-Host "ℹ️  $args" -ForegroundColor Cyan }

Write-Host "`n============================================================================" -ForegroundColor Cyan
Write-Host "MariaDB Monitoring Setup" -ForegroundColor Cyan
Write-Host "============================================================================`n" -ForegroundColor Cyan

# ============================================================================
# 1. Slow Query Log aktivieren
# ============================================================================

Write-Info "1. Activating Slow Query Log..."

$slowQueryConfig = @"
-- Enable Slow Query Log
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow-query.log';
SET GLOBAL long_query_time = $SlowQueryThreshold;
SET GLOBAL log_queries_not_using_indexes = 'ON';

-- Verify
SHOW VARIABLES LIKE 'slow_query_log%';
SHOW VARIABLES LIKE 'long_query_time';
"@

$result = $slowQueryConfig | docker exec -i $ContainerName mysql -u$User -p$Password

if ($LASTEXITCODE -eq 0) {
    Write-Success "Slow Query Log aktiviert (Threshold: $SlowQueryThreshold sec)"
    Write-Host "`n$result`n" -ForegroundColor Gray
} else {
    Write-Error "Fehler beim Aktivieren des Slow Query Logs"
}

# ============================================================================
# 2. Performance Schema Status
# ============================================================================

Write-Info "`n2. Checking Performance Schema..."

$perfSchemaCheck = @"
SHOW VARIABLES LIKE 'performance_schema';
SELECT COUNT(*) as enabled_instruments FROM performance_schema.setup_instruments WHERE ENABLED = 'YES';
"@

$perfResult = $perfSchemaCheck | docker exec -i $ContainerName mysql -u$User -p$Password

Write-Host "`n$perfResult`n" -ForegroundColor Gray

# ============================================================================
# 3. Create Monitoring Views
# ============================================================================

Write-Info "`n3. Creating monitoring views..."

$monitoringViews = @"
USE raueberbude;

-- View: Top Slow Queries
CREATE OR REPLACE VIEW v_slow_queries AS
SELECT
    DIGEST_TEXT as query,
    COUNT_STAR as exec_count,
    AVG_TIMER_WAIT/1000000000 as avg_time_ms,
    MAX_TIMER_WAIT/1000000000 as max_time_ms,
    SUM_ROWS_EXAMINED as rows_examined
FROM performance_schema.events_statements_summary_by_digest
WHERE SCHEMA_NAME = 'raueberbude'
ORDER BY AVG_TIMER_WAIT DESC
LIMIT 20;

-- View: Index Usage Statistics
CREATE OR REPLACE VIEW v_index_usage AS
SELECT
    object_schema as db,
    object_name as table_name,
    index_name,
    count_star as usage_count,
    count_read as read_count,
    count_write as write_count
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE object_schema = 'raueberbude'
ORDER BY count_star DESC;

-- View: Table Statistics
CREATE OR REPLACE VIEW v_table_stats AS
SELECT
    table_schema,
    table_name,
    table_rows,
    ROUND(data_length / 1024 / 1024, 2) as data_mb,
    ROUND(index_length / 1024 / 1024, 2) as index_mb,
    ROUND((data_length + index_length) / 1024 / 1024, 2) as total_mb
FROM information_schema.tables
WHERE table_schema = 'raueberbude'
ORDER BY (data_length + index_length) DESC;
"@

$monitoringViews | docker exec -i $ContainerName mysql -u$User -p$Password

if ($LASTEXITCODE -eq 0) {
    Write-Success "Monitoring views created"
} else {
    Write-Error "Failed to create monitoring views"
}

# ============================================================================
# 4. Current Query Statistics
# ============================================================================

Write-Info "`n4. Fetching current statistics...`n"

$statsQuery = @"
USE raueberbude;

-- Table sizes
SELECT '=== TABLE SIZES ===' as '';
SELECT * FROM v_table_stats;

-- Index usage
SELECT '=== INDEX USAGE (Top 10) ===' as '';
SELECT * FROM v_index_usage LIMIT 10;

-- Slow queries (if any)
SELECT '=== SLOW QUERIES (Top 5) ===' as '';
SELECT * FROM v_slow_queries LIMIT 5;

-- Connection stats
SELECT '=== CONNECTION STATS ===' as '';
SHOW STATUS LIKE 'Threads_connected';
SHOW STATUS LIKE 'Max_used_connections';
SHOW STATUS LIKE 'Connections';

-- Query cache (if enabled)
SELECT '=== QUERY CACHE ===' as '';
SHOW STATUS LIKE 'Qcache%';
"@

$stats = $statsQuery | docker exec -i $ContainerName mysql -u$User -p$Password

Write-Host $stats -ForegroundColor Gray

# ============================================================================
# 5. Create Monitoring Script
# ============================================================================

Write-Info "`n5. Creating monitoring script..."

$monitorScript = @'
#!/bin/bash
# MariaDB Monitoring Script
# Run with: docker exec mariadb /usr/local/bin/monitor-db.sh

mysql -u root -p$MYSQL_ROOT_PASSWORD raueberbude <<EOF
-- Top 10 slowest queries
SELECT
    LEFT(DIGEST_TEXT, 100) as query,
    COUNT_STAR as count,
    ROUND(AVG_TIMER_WAIT/1000000000, 2) as avg_ms
FROM performance_schema.events_statements_summary_by_digest
WHERE SCHEMA_NAME = 'raueberbude'
ORDER BY AVG_TIMER_WAIT DESC
LIMIT 10;

-- Unused indexes
SELECT
    object_name as table_name,
    index_name
FROM performance_schema.table_io_waits_summary_by_index_usage
WHERE object_schema = 'raueberbude'
  AND index_name IS NOT NULL
  AND index_name != 'PRIMARY'
  AND count_star = 0;

-- Table lock waits
SELECT
    object_name,
    count_read_normal,
    count_read_with_shared_locks,
    count_write_normal
FROM performance_schema.table_lock_waits_summary_by_table
WHERE object_schema = 'raueberbude'
ORDER BY count_write_normal DESC;
EOF
'@

$monitorScript | docker exec -i $ContainerName sh -c 'cat > /usr/local/bin/monitor-db.sh && chmod +x /usr/local/bin/monitor-db.sh'

if ($LASTEXITCODE -eq 0) {
    Write-Success "Monitoring script installed: /usr/local/bin/monitor-db.sh"
} else {
    Write-Error "Failed to install monitoring script"
}

# ============================================================================
# 6. Prometheus Exporter Config (Optional)
# ============================================================================

Write-Info "`n6. Generating Prometheus exporter config..."

$prometheusConfig = @"
# MariaDB Exporter Configuration
# Usage: docker run -d -p 9104:9104 prom/mysqld-exporter --config.my-cnf=/etc/.my.cnf

[client]
host = mariadb
port = 3306
user = exporter
password = exporter_password

# Collector flags
collect.info_schema.innodb_metrics = true
collect.info_schema.processlist = true
collect.info_schema.query_response_time = true
collect.info_schema.tables = true
collect.info_schema.tablestats = true
collect.info_schema.userstats = true
collect.perf_schema.eventsstatements = true
collect.perf_schema.indexiowaits = true
collect.perf_schema.tableiowaits = true
collect.slave_status = true
"@

$prometheusConfig | Out-File -FilePath ".\docker\prometheus-mysqld-exporter.cnf" -Encoding UTF8

Write-Success "Prometheus config created: .\docker\prometheus-mysqld-exporter.cnf"

# ============================================================================
# Summary
# ============================================================================

Write-Host "`n============================================================================" -ForegroundColor Cyan
Write-Host "Monitoring Setup Complete" -ForegroundColor Cyan
Write-Host "============================================================================`n" -ForegroundColor Cyan

Write-Success "✅ Slow Query Log: Enabled (>$SlowQueryThreshold sec)"
Write-Success "✅ Monitoring Views: Created"
Write-Success "✅ Monitoring Script: Installed"
Write-Success "✅ Prometheus Config: Generated"

Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. View slow queries: docker exec mariadb tail -f /var/log/mysql/slow-query.log" -ForegroundColor Gray
Write-Host "  2. Run monitoring: docker exec mariadb /usr/local/bin/monitor-db.sh" -ForegroundColor Gray
Write-Host "  3. Query stats: mysql -u$User -p$Password raueberbude -e 'SELECT * FROM v_slow_queries;'" -ForegroundColor Gray
Write-Host "  4. Setup Prometheus (optional): docker-compose up -d prometheus mysqld-exporter" -ForegroundColor Gray

Write-Host "`n📊 Monitoring Queries:" -ForegroundColor Cyan
Write-Host "  - SELECT * FROM v_slow_queries;" -ForegroundColor Gray
Write-Host "  - SELECT * FROM v_index_usage;" -ForegroundColor Gray
Write-Host "  - SELECT * FROM v_table_stats;" -ForegroundColor Gray

Write-Success "`n✅ Monitoring setup complete!`n"
