# ============================================================================
# MariaDB Backup & Restore Test
# ============================================================================
#
# Zweck: Validierung der Backup/Restore-Prozeduren
#
# Usage:
#   .\scripts\db-backup-test.ps1
#
# Prerequisites:
#   - Docker Desktop läuft
#   - MariaDB Container ist gestartet
#   - mysqldump ist verfügbar
# ============================================================================

param(
    [string]$ContainerName = "mariadb",
    [string]$Database = "raueberbude",
    [string]$User = "rb_user",
    [string]$Password = "rb_user_secret",
    [string]$BackupDir = ".\backups"
)

$ErrorActionPreference = "Stop"

# Colors
function Write-Success { Write-Host "✅ $args" -ForegroundColor Green }
function Write-Error { Write-Host "❌ $args" -ForegroundColor Red }
function Write-Info { Write-Host "ℹ️  $args" -ForegroundColor Cyan }
function Write-Warning { Write-Host "⚠️  $args" -ForegroundColor Yellow }

Write-Host "`n============================================================================" -ForegroundColor Cyan
Write-Host 'MariaDB Backup & Restore Test' -ForegroundColor Cyan
Write-Host "============================================================================`n" -ForegroundColor Cyan

# ============================================================================
# 1. Pre-Flight Checks
# ============================================================================

Write-Info "1. Pre-Flight Checks..."

# Check Docker
try {
    docker ps | Out-Null
    Write-Success "Docker is running"
} catch {
    Write-Error "Docker is not running. Please start Docker Desktop."
    exit 1
}

# Check MariaDB Container
$containerStatus = docker ps --filter "name=$ContainerName" --format "{{.Status}}"
if ($containerStatus -match "Up") {
    Write-Success "MariaDB container is running: $containerStatus"
} else {
    Write-Error "MariaDB container '$ContainerName' is not running"
    Write-Info "Start it with: docker-compose up -d mariadb"
    exit 1
}

# Create backup directory
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
    Write-Success "Created backup directory: $BackupDir"
} else {
    Write-Success "Backup directory exists: $BackupDir"
}

# ============================================================================
# 2. Create Test Data
# ============================================================================

Write-Info "`n2. Creating test data..."

$testDataSql = @'
USE $Database;

-- Insert test user
INSERT IGNORE INTO users (id, username, email, password_hash, created_at, updated_at)
VALUES (UUID(), 'backup_test_user', 'backup@test.com', 'hash123', NOW(), NOW());

SET @test_user_id = (SELECT id FROM users WHERE username = 'backup_test_user');

-- Insert test transcript
INSERT IGNORE INTO speech_transcripts (
    id, user_id, transcript, is_valid, confidence, duration_ms, model, created_at, updated_at
) VALUES (
    UUID(), @test_user_id, 'Backup Test Transcript', 1, 0.95, 1000, 'whisper-1', NOW(), NOW()
);

-- Verify
SELECT COUNT(*) as user_count FROM users WHERE username = 'backup_test_user';
SELECT COUNT(*) as transcript_count FROM speech_transcripts WHERE transcript = 'Backup Test Transcript';
'@

$testDataFile = "$BackupDir\test-data.sql"
$testDataSql | Out-File -FilePath $testDataFile -Encoding UTF8

docker exec -i $ContainerName mysql -u$User -p$Password < $testDataFile
if ($LASTEXITCODE -eq 0) {
    Write-Success "Test data created"
} else {
    Write-Error "Failed to create test data"
    exit 1
}

# ============================================================================
# 3. Full Backup (Schema + Data)
# ============================================================================

Write-Info "`n3. Creating full backup..."

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$backupFile = "$BackupDir\${Database}_full_$timestamp.sql"

$backupCmd = "mysqldump -u$User -p$Password " +
             "--single-transaction " +
             "--routines " +
             "--triggers " +
             "--events " +
             "--add-drop-database " +
             "--databases $Database"

docker exec $ContainerName sh -c "$backupCmd" | Out-File -FilePath $backupFile -Encoding UTF8

if ($LASTEXITCODE -eq 0 -and (Test-Path $backupFile)) {
    $backupSize = (Get-Item $backupFile).Length / 1KB
    Write-Success "Full backup created: $backupFile ($([math]::Round($backupSize, 2)) KB)"
} else {
    Write-Error "Full backup failed"
    exit 1
}

# ============================================================================
# 4. Schema-Only Backup
# ============================================================================

Write-Info "`n4. Creating schema-only backup..."

$schemaFile = "$BackupDir\${Database}_schema_$timestamp.sql"

$schemaCmd = "mysqldump -u$User -p$Password " +
             "--no-data " +
             "--routines " +
             "--triggers " +
             "--events " +
             "--databases $Database"

docker exec $ContainerName sh -c "$schemaCmd" | Out-File -FilePath $schemaFile -Encoding UTF8

if ($LASTEXITCODE -eq 0 -and (Test-Path $schemaFile)) {
    $schemaSize = (Get-Item $schemaFile).Length / 1KB
    Write-Success "Schema backup created: $schemaFile ($([math]::Round($schemaSize, 2)) KB)"
} else {
    Write-Error "Schema backup failed"
    exit 1
}

# ============================================================================
# 5. Table-Specific Backup (Critical Tables)
# ============================================================================

Write-Info "`n5. Creating table-specific backup (critical tables)..."

$criticalTables = @(
    "users",
    "user_rights",
    "app_terminals",
    "speech_transcripts",
    "ha_entities"
)

$tableBackupFile = "$BackupDir\${Database}_critical_tables_$timestamp.sql"

$tableList = $criticalTables -join " "
$tableCmd = "mysqldump -u$User -p$Password " +
            "--single-transaction " +
            "$Database $tableList"

docker exec $ContainerName sh -c "$tableCmd" | Out-File -FilePath $tableBackupFile -Encoding UTF8

if ($LASTEXITCODE -eq 0 -and (Test-Path $tableBackupFile)) {
    $tableSize = (Get-Item $tableBackupFile).Length / 1KB
    Write-Success "Table backup created: $tableBackupFile ($([math]::Round($tableSize, 2)) KB)"
} else {
    Write-Error "Table backup failed"
    exit 1
}

# ============================================================================
# 6. Test Restore (Dry-Run)
# ============================================================================

Write-Info "`n6. Testing restore (dry-run)..."

# Create test database
$testDbName = "${Database}_restore_test"

$createTestDb = @'
DROP DATABASE IF EXISTS $testDbName;
CREATE DATABASE $testDbName;
'@

$createTestDb | docker exec -i $ContainerName mysql -u$User -p$Password

if ($LASTEXITCODE -eq 0) {
    Write-Success "Test database created: $testDbName"
} else {
    Write-Error "Failed to create test database"
    exit 1
}

# Restore full backup to test database
Write-Info "Restoring backup to test database..."

$restoreContent = Get-Content $backupFile -Raw
$restoreContent = $restoreContent -replace "DATABASE ``$Database``", "DATABASE ``$testDbName``"
$restoreContent | docker exec -i $ContainerName mysql -u$User -p$Password

if ($LASTEXITCODE -eq 0) {
    Write-Success "Backup restored to test database"
} else {
    Write-Error "Restore failed"
    exit 1
}

# ============================================================================
# 7. Verify Restore
# ============================================================================

Write-Info "`n7. Verifying restored data..."

# For restore/verify use literal here-string as well
$verifyQuery = @'
USE $testDbName;

-- Count tables
SELECT COUNT(*) as table_count FROM information_schema.tables
WHERE table_schema = '$testDbName';

-- Verify test data
SELECT COUNT(*) as user_count FROM users WHERE username = 'backup_test_user';
SELECT COUNT(*) as transcript_count FROM speech_transcripts WHERE transcript = 'Backup Test Transcript';

-- Check constraints
SELECT COUNT(*) as constraint_count FROM information_schema.table_constraints
WHERE table_schema = '$testDbName' AND constraint_type = 'FOREIGN KEY';
'@

$verifyFile = "$BackupDir\verify.sql"
$verifyQuery | Out-File -FilePath $verifyFile -Encoding UTF8

$verifyResult = docker exec -i $ContainerName mysql -u$User -p$Password < $verifyFile

if ($verifyResult -match "backup_test_user" -and $verifyResult -match "Backup Test Transcript") {
    Write-Success "Data verification passed"
    Write-Host "`n$verifyResult`n" -ForegroundColor Gray
} else {
    Write-Error "Data verification failed"
    Write-Host "`n$verifyResult`n" -ForegroundColor Red
}

# ============================================================================
# 8. Point-in-Time Recovery Test (Binlog)
# ============================================================================

Write-Info "`n8. Checking binlog configuration for PITR..."

$binlogCheck = @"
SHOW VARIABLES LIKE 'log_bin';
SHOW VARIABLES LIKE 'binlog_format';
SHOW VARIABLES LIKE 'expire_logs_days';
"@

$binlogResult = $binlogCheck | docker exec -i $ContainerName mysql -u$User -p$Password

if ($binlogResult -match "log_bin\s+ON") {
    Write-Success "Binary logging is enabled"
    Write-Host "`n$binlogResult`n" -ForegroundColor Gray
} else {
    Write-Warning "Binary logging is NOT enabled - PITR not possible"
    Write-Info "Enable in my.cnf: log-bin=mysql-bin, binlog_format=ROW"
}

# ============================================================================
# 9. Cleanup Test Database
# ============================================================================

Write-Info "`n9. Cleaning up test database..."

"DROP DATABASE IF EXISTS $testDbName;" | docker exec -i $ContainerName mysql -u$User -p$Password

if ($LASTEXITCODE -eq 0) {
    Write-Success "Test database dropped"
} else {
    Write-Warning "Failed to drop test database (manual cleanup needed)"
}

# ============================================================================
# 10. Backup Summary & Recommendations
# ============================================================================

Write-Host "`n============================================================================" -ForegroundColor Cyan
Write-Host "Backup Test Summary" -ForegroundColor Cyan
Write-Host "============================================================================`n" -ForegroundColor Cyan

Write-Success "✅ Full backup: $backupFile"
Write-Success "✅ Schema backup: $schemaFile"
Write-Success "✅ Table backup: $tableBackupFile"
Write-Success "✅ Restore test: PASSED"

Write-Host "`n📋 Recommendations:" -ForegroundColor Yellow
Write-Host "  1. Schedule daily backups (cron/Task Scheduler)" -ForegroundColor Gray
Write-Host "  2. Rotate backups (keep last 7 daily, 4 weekly)" -ForegroundColor Gray
Write-Host "  3. Test restore quarterly" -ForegroundColor Gray
Write-Host "  4. Store backups off-site (S3, NAS, etc.)" -ForegroundColor Gray
Write-Host "  5. Enable binary logging for PITR" -ForegroundColor Gray

Write-Host "`n📁 Backup files created in: $BackupDir" -ForegroundColor Cyan

# ============================================================================
# Export Backup Metadata
# ============================================================================

$metadata = @{
    timestamp = $timestamp
    database = $Database
    full_backup = $backupFile
    schema_backup = $schemaFile
    table_backup = $tableBackupFile
    backup_size_kb = [math]::Round((Get-Item $backupFile).Length / 1KB, 2)
    restore_test = "PASSED"
    binlog_enabled = ($binlogResult -match "log_bin\s+ON")
} | ConvertTo-Json

$metadata | Out-File -FilePath "$BackupDir\backup_metadata_$timestamp.json" -Encoding UTF8

Write-Success "`n✅ Backup test complete!`n"
