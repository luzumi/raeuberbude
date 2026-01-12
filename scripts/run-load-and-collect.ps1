<#
Run a Node load test and collect diagnostics.
Usage examples:
  # quick smoke
  .\scripts\run-load-and-collect.ps1 -Total 20 -Concurrency 5

  # full run
  .\scripts\run-load-and-collect.ps1 -Total 500 -Concurrency 50
#>
param(
  [int]$Total = 500,
  [int]$Concurrency = 50,
  [string]$BaseUrl = 'http://127.0.0.1:3010',
  [string]$ApiKey = 'test-api-key',
  [switch]$VerboseRun
)

Set-StrictMode -Version Latest
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Push-Location $scriptDir

# Prepare artifact folder
$artifacts = Join-Path $scriptDir 'load-artifacts'
if (-Not (Test-Path $artifacts)) { New-Item -ItemType Directory -Path $artifacts | Out-Null }

# Environment for the node script
$env:TOTAL = [string]$Total
$env:CONCURRENCY = [string]$Concurrency
$env:BASE_URL = $BaseUrl
$env:API_KEY = $ApiKey

Write-Host "Starting Node load test -> BASE_URL=$BaseUrl TOTAL=$Total CONCURRENCY=$Concurrency"

# Run node load test and capture output
$runLog = Join-Path $scriptDir 'node-load-test-run.log'
if (Test-Path $runLog) { Remove-Item $runLog -Force -ErrorAction SilentlyContinue }

$nodeExe = (Get-Command node -ErrorAction SilentlyContinue).Path
if (-not $nodeExe) {
  Write-Error "node.exe not found in PATH. Install Node 18+ or ensure node is available."
  Pop-Location; exit 2
}

# Run and stream output to both console and runLog
$startInfo = "Running: $nodeExe $scriptDir\node-load-test-fixed.js"
Write-Host $startInfo
& $nodeExe "$scriptDir\node-load-test-fixed.js" 2>&1 | Tee-Object -FilePath $runLog

# Copy artifacts
$filesToCollect = @(
  'node-load-started-fixed.txt',

  'node-load-test-run.log'
)
foreach ($f in $filesToCollect) {
  $src = Join-Path $scriptDir $f
  if (Test-Path $src) {
    Copy-Item -Path $src -Destination (Join-Path $artifacts $f) -Force
  }
}

# Diagnostics: /api/diag/metrics
Write-Host "`n--- /api/diag/metrics ---"
try {
  $diag = Invoke-RestMethod -Uri "$BaseUrl/api/diag/metrics" -TimeoutSec 5 -ErrorAction Stop
  $diag | ConvertTo-Json -Depth 5 | Out-File -FilePath (Join-Path $artifacts 'diag-metrics.json') -Encoding utf8
  $diag | ConvertTo-Json -Depth 5 | Write-Host
} catch {
  Write-Warning "Failed to fetch /api/diag/metrics: $($_.Exception.Message)"
}

# Mongo count (if docker container exists)
Write-Host "`n--- Mongo count ---"
try {
  $mongoCount = docker exec backend-mongo-1 mongosh -u rb_root -p rb_secret --authenticationDatabase admin raueberbude --quiet --eval "printjson({count: db.transcripts.countDocuments()})" 2>&1
  $mongoCount | Out-File -FilePath (Join-Path $artifacts 'mongo-count.txt') -Encoding utf8
  Write-Host $mongoCount
} catch {
  Write-Warning "Could not query docker mongo: $($_.Exception.Message)"
}

# Tail DIAG lines from backend log (if present)
$legacyLog = Join-Path $scriptDir '..\backend-legacy.log'
if (Test-Path $legacyLog) {
  Write-Host "`n--- last DIAG lines ---"
  Get-Content $legacyLog -Tail 300 | Select-String -Pattern 'DIAG_POST_OK','DIAG_POST_ERR' -SimpleMatch | Select-Object -Last 200 | Tee-Object -FilePath (Join-Path $artifacts 'diag-log-lines.txt')
} else {
  Write-Warning "backend-legacy.log not found at $legacyLog"
}

Write-Host "`nArtifacts collected in: $artifacts"
Pop-Location

# Print simple summary of node-load-results.json if exists
$resFile = Join-Path $artifacts 'node-load-results-fixed.json'
if (Test-Path $resFile) {
  Write-Host "`n--- Summary (node-load-results-fixed.json) ---"
  Get-Content $resFile -Raw | ConvertFrom-Json | Format-List
} else {
  Write-Warning "No node-load-results-fixed.json found in artifacts. Check node-run log: $runLog"
}
