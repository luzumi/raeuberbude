@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   Raeuberbude - Start ALL Servers
echo ========================================
echo.

REM Prüfe ob Server bereits laufen
set "RUNNING=0"

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "ABH"') do (
    echo Backend Express already running on port 3000 (PID %%a)
    set "RUNNING=1"
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001" ^| findstr "ABH"') do (
    echo NestJS already running on port 3001 (PID %%a)
    set "RUNNING=1"
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":4200" ^| findstr "ABH"') do (
    echo Angular Dev already running on port 4200 (PID %%a)
    set "RUNNING=1"
)

if "%RUNNING%"=="1" (
    echo.
    echo ========================================
    echo   WARNING: Some servers are running!
    echo ========================================
    echo.
    echo Press Ctrl+C to cancel, or
    pause

    echo Stopping all Node processes...
    taskkill /F /IM node.exe /T >nul 2>&1
    timeout /t 3 >nul
)

echo.
echo ========================================
echo   Starting Backend Express...
echo ========================================
cd /d "%~dp0backend"
start "Backend Express (Port 3000)" cmd /k "npm start"

echo.
echo ========================================
echo   Starting NestJS...
echo ========================================
cd /d "%~dp0backend\nest-app"
start "NestJS (Port 3001)" cmd /k "npm run start:dev"

echo.
echo ========================================
echo   Starting Angular Dev-Server...
echo ========================================
cd /d "%~dp0"
start "Angular Dev (Port 4200)" cmd /k "npm start"

echo.
echo ========================================
echo   All servers starting...
echo ========================================
echo.
echo   Backend Express:  http://localhost:3000
echo   NestJS:           http://localhost:3001
echo   Angular Dev:      http://localhost:4200
echo.
echo Waiting 15 seconds for servers to start...
timeout /t 15 >nul

echo.
echo ========================================
echo   Opening Browser...
echo ========================================
start http://localhost:4200

echo.
echo Done! All servers should be running.
echo Close this window or press any key.
pause >nul

