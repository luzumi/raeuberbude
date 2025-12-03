# LUD28-59 Integration Tests Runner
# Führt die Integrations- und Migrationstests aus

param(
    [switch]$SkipSetup = $false,
    [switch]$SkipTeardown = $false,
    [switch]$Verbose = $false
)

$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "🧪 LUD28-59 Integration Tests Runner" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# Change to backend/nest-app directory
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# Step 1: Setup Test Database
if (-not $SkipSetup) {
    Write-Host "📦 Step 1: Starting test database..." -ForegroundColor Yellow
    docker-compose -f docker-compose.test.yml up -d

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to start test database" -ForegroundColor Red
        exit 1
    }

    Write-Host "⏳ Waiting for database to be ready (5 seconds)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5

    # Run migrations
    Write-Host "🔄 Running migrations..." -ForegroundColor Yellow
    $env:NODE_ENV = "test"
    npm run migration:run

    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to run migrations" -ForegroundColor Red
        docker-compose -f docker-compose.test.yml down
        exit 1
    }
} else {
    Write-Host "⏭️  Skipping database setup" -ForegroundColor Gray
}

# Step 2: Run Tests
Write-Host ""
Write-Host "🧪 Step 2: Running integration tests..." -ForegroundColor Yellow

$env:NODE_ENV = "test"

if ($Verbose) {
    npm run test:integration -- --verbose
} else {
    npm run test:integration
}

$testExitCode = $LASTEXITCODE

# Step 3: Teardown Test Database
if (-not $SkipTeardown) {
    Write-Host ""
    Write-Host "🧹 Step 3: Cleaning up test database..." -ForegroundColor Yellow
    docker-compose -f docker-compose.test.yml down -v

    if ($LASTEXITCODE -ne 0) {
        Write-Host "⚠️  Warning: Failed to teardown test database" -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "⏭️  Skipping database teardown" -ForegroundColor Gray
}

# Summary
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
if ($testExitCode -eq 0) {
    Write-Host "✅ All tests passed!" -ForegroundColor Green
} else {
    Write-Host "❌ Tests failed with exit code: $testExitCode" -ForegroundColor Red
}
Write-Host "================================================" -ForegroundColor Cyan

exit $testExitCode

