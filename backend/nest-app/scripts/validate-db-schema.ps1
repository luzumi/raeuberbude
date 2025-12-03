# LUD28-59 Schema Validation Script
# Executes validate-schema.sql against the test database

param(
    [string]$DbHost = "localhost",
    [int]$Port = 5433,
    [string]$Database = "raeuberbude_test",
    [string]$Username = "test",
    [string]$Password = "test"
)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Database Schema Validation" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$sqlFile = Join-Path $scriptPath "validate-schema.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "SQL file not found: $sqlFile" -ForegroundColor Red
    exit 1
}

# Check if psql is available on PATH
$psqlPath = Get-Command psql -ErrorAction SilentlyContinue

if (-not $psqlPath) {
    Write-Host "psql not found in PATH. Attempting to use Docker container 'raeuberbude-test-db'..." -ForegroundColor Yellow

    $env:PGPASSWORD = $Password

    try {
        Get-Content $sqlFile | docker exec -i raeuberbude-test-db psql -U $Username -d $Database
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Schema validation completed successfully (via Docker)." -ForegroundColor Green
            exit 0
        } else {
            Write-Host "Schema validation failed (docker psql returned non-zero)." -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "Failed to execute psql via Docker: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Using local psql to execute SQL file..." -ForegroundColor Yellow
    $env:PGPASSWORD = $Password

    try {
        & psql -h $DbHost -p $Port -U $Username -d $Database -f $sqlFile
        if ($LASTEXITCODE -eq 0) {
            Write-Host "Schema validation completed successfully (via local psql)." -ForegroundColor Green
            exit 0
        } else {
            Write-Host "Schema validation failed (psql returned non-zero)." -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "Failed to execute local psql: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Fallback
Write-Host "================================================" -ForegroundColor Cyan
exit 1
