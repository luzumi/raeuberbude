@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   Raeuberbude - Universal Starter
echo   Alle Server in eigenen Tabs
echo ========================================
echo.

REM Wechsle zum Projektverzeichnis
cd /d "%~dp0.."

REM Prüfe ob Docker läuft (für optionale Services)
set "DOCKER_AVAILABLE=0"
docker ps >nul 2>&1
if %errorlevel% equ 0 (
    set "DOCKER_AVAILABLE=1"
    echo [✓] Docker ist verfügbar
) else (
    echo [!] Docker ist nicht verfügbar - STT Services werden übersprungen
)

echo.
echo ========================================
echo   Wähle Start-Modus:
echo ========================================
echo.
echo   [1] Komplett-Setup (mit Docker STT Services)
echo   [2] Development-Setup (nur Backend + Frontend + MCP)
echo   [3] Minimal-Setup (nur Backend + Frontend)
echo   [4] Nur Frontend
echo   [5] Nur Backend
echo   [6] Nur MCP Server
echo   [7] Nur Docker STT Services
echo   [8] Beenden
echo.

set /p choice="Deine Wahl (1-8): "

if "%choice%"=="1" goto START_COMPLETE
if "%choice%"=="2" goto START_DEVELOPMENT
if "%choice%"=="3" goto START_MINIMAL
if "%choice%"=="4" goto START_FRONTEND_ONLY
if "%choice%"=="5" goto START_BACKEND_ONLY
if "%choice%"=="6" goto START_MCP_ONLY
if "%choice%"=="7" goto START_DOCKER_ONLY
if "%choice%"=="8" goto END

echo Ungültige Wahl!
goto END

:START_COMPLETE
echo.
echo ========================================
echo   Starte Komplett-Setup...
echo ========================================

if "%DOCKER_AVAILABLE%"=="1" (
    echo [1/5] Starte Docker STT Services...
    cd backend
    docker-compose down >nul 2>&1
    docker-compose up -d mongo vosk whisper
    cd ..
    timeout /t 5 >nul
)

echo [2/5] Starte NestJS Backend...
start "NestJS Backend (Port 3001)" cmd /k "cd backend\nest-app && npm run start:dev"
timeout /t 5 >nul

echo [3/5] Starte MCP Server...
start "MCP Server" cmd /k "cd .specify\mcp-servers && npm run all"
timeout /t 3 >nul

echo [4/5] Starte Angular Dev Server...
start "Angular Dev (Port 4200)" cmd /k "ng serve --host 0.0.0.0 --port 4200 --proxy-config proxy.conf.json"

echo [5/5] Warte auf Start...
timeout /t 15 >nul

goto SHOW_STATUS

:START_DEVELOPMENT
echo.
echo ========================================
echo   Starte Development-Setup...
echo ========================================

echo [1/3] Starte NestJS Backend...
start "NestJS Backend (Port 3001)" cmd /k "cd backend\nest-app && npm run start:dev"
timeout /t 5 >nul

echo [2/3] Starte MCP Server...
start "MCP Server" cmd /k "cd .specify\mcp-servers && npm run all"
timeout /t 3 >nul

echo [3/3] Starte Angular Dev Server...
start "Angular Dev (Port 4200)" cmd /k "ng serve --host 0.0.0.0 --port 4200 --proxy-config proxy.conf.json"

echo Warte auf Start...
timeout /t 15 >nul

goto SHOW_STATUS

:START_MINIMAL
echo.
echo ========================================
echo   Starte Minimal-Setup...
echo ========================================

echo [1/2] Starte NestJS Backend...
start "NestJS Backend (Port 3001)" cmd /k "cd backend\nest-app && npm run start:dev"
timeout /t 5 >nul

echo [2/2] Starte Angular Dev Server...
start "Angular Dev (Port 4200)" cmd /k "ng serve --host 0.0.0.0 --port 4200"

echo Warte auf Start...
timeout /t 15 >nul

goto SHOW_STATUS

:START_FRONTEND_ONLY
echo.
echo ========================================
echo   Starte nur Frontend...
echo ========================================

start "Angular Dev (Port 4200)" cmd /k "ng serve --host 0.0.0.0 --port 4200 --proxy-config proxy.conf.json"
timeout /t 10 >nul
goto SHOW_STATUS

:START_BACKEND_ONLY
echo.
echo ========================================
echo   Starte nur Backend...
echo ========================================

start "NestJS Backend (Port 3001)" cmd /k "cd backend\nest-app && npm run start:dev"
timeout /t 10 >nul
goto SHOW_STATUS

:START_MCP_ONLY
echo.
echo ========================================
echo   Starte nur MCP Server...
echo ========================================

start "MCP Server" cmd /k "cd .specify\mcp-servers && npm run all"
timeout /t 5 >nul
goto SHOW_STATUS

:START_DOCKER_ONLY
if "%DOCKER_AVAILABLE%"=="0" (
    echo Docker ist nicht verfügbar!
    goto END
)

echo.
echo ========================================
echo   Starte nur Docker STT Services...
echo ========================================

cd backend
docker-compose down >nul 2>&1
docker-compose up -d mongo vosk whisper
cd ..
timeout /t 10 >nul
goto SHOW_STATUS

:SHOW_STATUS
echo.
echo ========================================
echo   Server-Status:
echo ========================================
echo.

if "%choice%"=="1" (
    if "%DOCKER_AVAILABLE%"=="1" (
        echo [✓] STT Services:     MongoDB (27018), Vosk (2700), Whisper (9090)
    )
)

if "%choice%"=="1" goto SHOW_BACKEND_FRONTEND
if "%choice%"=="2" goto SHOW_BACKEND_FRONTEND
if "%choice%"=="3" goto SHOW_BACKEND_FRONTEND

if "%choice%"=="4" (
    echo [✓] Angular Frontend:  http://localhost:4200
    goto OPEN_BROWSER
)

if "%choice%"=="5" (
    echo [✓] NestJS Backend:    http://localhost:3001
    goto OPEN_BROWSER
)

if "%choice%"=="6" (
    echo [✓] MCP Server:        Lokal gestartet
    goto END
)

if "%choice%"=="7" (
    if "%DOCKER_AVAILABLE%"=="1" (
        echo [✓] STT Services:     MongoDB (27018), Vosk (2700), Whisper (9090)
    )
    goto END
)

:SHOW_BACKEND_FRONTEND
echo [✓] NestJS Backend:    http://localhost:3001
echo [✓] Angular Frontend:  http://localhost:4200
echo [✓] MCP Server:        Lokal gestartet

:OPEN_BROWSER
echo.
echo Öffne Browser...
timeout /t 5 >nul

if "%choice%"=="1" start http://localhost:4200
if "%choice%"=="2" start http://localhost:4200
if "%choice%"=="3" start http://localhost:4200
if "%choice%"=="4" start http://localhost:4200

echo.
echo ========================================
echo   Fertig! Alle Server laufen.
echo ========================================
echo.
echo TIPS:
echo - Jeder Server läuft in eigenem Tab/Fenster
echo - Schließe einzelne Tabs mit Ctrl+C
echo - Für Neustart dieses Skript erneut ausführen
echo.

:END
pause
