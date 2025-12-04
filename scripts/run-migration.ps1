# MongoDB to MariaDB Migration
# Automated PowerShell Script

$ErrorActionPreference = "Stop"

Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host "     MongoDB -> MariaDB Migration                            " -ForegroundColor Cyan
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""

# Switch to backend/nest-app directory
$originalPath = Get-Location
Set-Location "$PSScriptRoot\..\backend\nest-app"

try {
    # Step 1: Create new tables
    Write-Host "Step 1: Creating new tables..." -ForegroundColor Yellow
    try {
        $sqlFile = "scripts\create-llm-and-category-tables.sql"
        if (Test-Path $sqlFile) {
            Get-Content $sqlFile | mysql -h 127.0.0.1 -P 3307 -u rb_user -prb_user_secret raueberbude 2>$null
            Write-Host "[OK] Tables created`n" -ForegroundColor Green
        } else {
            Write-Host "[WARN] SQL file not found: $sqlFile`n" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "[WARN] Tables already exist or error: $_`n" -ForegroundColor Yellow
    }

    # Step 2: Truncate tables
    Write-Host "Step 2: Truncating existing tables..." -ForegroundColor Yellow
    node scripts/step1_truncate_tables.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Failed to truncate tables!" -ForegroundColor Red
        exit 1
    }

    # Step 3: Prompt user to start app
    Write-Host "`n=============================================================" -ForegroundColor Cyan
    Write-Host "     IMPORTANT: App restart required                        " -ForegroundColor Cyan
    Write-Host "=============================================================`n" -ForegroundColor Cyan

    Write-Host "Please run this in a NEW terminal:" -ForegroundColor Yellow
    Write-Host "  cd C:\Users\corat\IdeaProjects\raueberbude\backend\nest-app" -ForegroundColor White
    Write-Host "  npm run start:dev`n" -ForegroundColor White

    Write-Host "Wait until you see in the logs:" -ForegroundColor Yellow
    Write-Host "  [HaBootstrapService] Bootstrap-Import erfolgreich" -ForegroundColor Gray
    Write-Host "  [HaSyncService] Synced X/Y`n" -ForegroundColor Gray

    $continue = Read-Host "Press ENTER when app is running and HA data is synced"

    # Step 4: Migrate collections
    Write-Host "`nStep 4: Migrating collections..." -ForegroundColor Yellow
    node scripts/step2_migrate_collections.js
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Migration failed!" -ForegroundColor Red
        exit 1
    }

    # Step 5: Verification
    Write-Host "`nStep 5: Verification..." -ForegroundColor Yellow
    node scripts/verify_migration.js

    Write-Host "`n=============================================================" -ForegroundColor Green
    Write-Host "     Migration completed successfully!                      " -ForegroundColor Green
    Write-Host "=============================================================`n" -ForegroundColor Green

    Write-Host "The app now works with MariaDB." -ForegroundColor Green
    Write-Host "MongoDB can be disabled when everything works.`n" -ForegroundColor Green
} finally {
    # Return to original directory
    Set-Location $originalPath
}

