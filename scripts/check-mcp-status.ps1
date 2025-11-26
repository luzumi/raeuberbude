# MCP Server Status Check
# Überprüft die Log-Dateien beider MCP-Server

Write-Host "`n=== MCP Server Status Check ===" -ForegroundColor Cyan
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n" -ForegroundColor Gray

# Prüfe Admin-Server Log
$adminLog = "$env:TEMP\lm-mcp-launcher-admin.log"
Write-Host "Admin Server (lmStudio-local):" -ForegroundColor Yellow
if (Test-Path $adminLog) {
    Write-Host "✓ Log-Datei gefunden: $adminLog" -ForegroundColor Green
    Write-Host "`nLetzte 10 Zeilen:" -ForegroundColor Gray
    Get-Content $adminLog -Tail 10 | ForEach-Object { Write-Host "  $_" -ForegroundColor White }
} else {
    Write-Host "✗ Log-Datei nicht gefunden" -ForegroundColor Red
    Write-Host "  Server wurde möglicherweise noch nicht gestartet" -ForegroundColor Gray
}

Write-Host "`n---`n" -ForegroundColor Gray

# Prüfe App-Header Server Log
$appHeaderLog = "$env:TEMP\lm-mcp-launcher-appheader.log"
Write-Host "App-Header Server (lmStudio):" -ForegroundColor Yellow
if (Test-Path $appHeaderLog) {
    Write-Host "✓ Log-Datei gefunden: $appHeaderLog" -ForegroundColor Green
    Write-Host "`nLetzte 10 Zeilen:" -ForegroundColor Gray
    Get-Content $appHeaderLog -Tail 10 | ForEach-Object { Write-Host "  $_" -ForegroundColor White }
} else {
    Write-Host "✗ Log-Datei nicht gefunden" -ForegroundColor Red
    Write-Host "  Server wurde möglicherweise noch nicht gestartet" -ForegroundColor Gray
}

Write-Host "`n---`n" -ForegroundColor Gray

# Prüfe alle MCP-Log-Dateien
$allLogs = Get-ChildItem $env:TEMP -Filter "lm-mcp-launcher*.log" -ErrorAction SilentlyContinue
Write-Host "Alle MCP-Log-Dateien:" -ForegroundColor Yellow
if ($allLogs) {
    $allLogs | Select-Object Name, @{Name="Größe (KB)";Expression={[math]::Round($_.Length/1KB,2)}}, LastWriteTime | Format-Table -AutoSize
} else {
    Write-Host "Keine Log-Dateien gefunden" -ForegroundColor Red
}

# Prüfe, ob die Ports belegt sind
Write-Host "`nPort-Status:" -ForegroundColor Yellow
$port3002 = Get-NetTCPConnection -LocalPort 3002 -ErrorAction SilentlyContinue
$port3003 = Get-NetTCPConnection -LocalPort 3003 -ErrorAction SilentlyContinue

if ($port3002) {
    Write-Host "✓ Port 3002 (Admin): AKTIV" -ForegroundColor Green
    Write-Host "  Prozess: $($port3002.OwningProcess)" -ForegroundColor Gray
} else {
    Write-Host "✗ Port 3002 (Admin): INAKTIV" -ForegroundColor Red
}

if ($port3003) {
    Write-Host "✓ Port 3003 (App-Header): AKTIV" -ForegroundColor Green
    Write-Host "  Prozess: $($port3003.OwningProcess)" -ForegroundColor Gray
} else {
    Write-Host "✗ Port 3003 (App-Header): INAKTIV" -ForegroundColor Red
}

Write-Host "`n=== Ende ===" -ForegroundColor Cyan
Write-Host ""

