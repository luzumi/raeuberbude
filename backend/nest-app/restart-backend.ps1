# Restart NestJS Backend Server
# This script restarts the backend after database reset

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Restarting NestJS Backend" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if process is running on port 3000
$port3000 = netstat -ano | findstr ":3000" | findstr "LISTENING"
if ($port3000) {
    Write-Host "Stopping existing NestJS process on port 3000..." -ForegroundColor Yellow
    $pid = ($port3000 -split '\s+')[-1]
    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "Starting NestJS Backend..." -ForegroundColor Green
Write-Host "Port: 3000" -ForegroundColor Gray
Write-Host "Environment: development" -ForegroundColor Gray
Write-Host ""

# Start the backend
Set-Location C:\Users\corat\IdeaProjects\raueberbude\backend\nest-app
npm run start:dev

