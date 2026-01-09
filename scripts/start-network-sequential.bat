@echo off
echo.
echo ========================================
echo   Starting Backend Servers First
echo ========================================
echo.

cd /d %~dp0..

:: Neuer Schritt: Starte MariaDB per docker-compose (Service ist in backend/docker-compose.yml definiert)
echo [0/3] Starting MariaDB (Docker Compose)...
echo Ensure Docker Desktop / docker daemon is running...
rem Versuche, den mariadb-Service aus dem backend/docker-compose.yml zu starten
docker-compose -f backend/docker-compose.yml up -d mariadb
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERROR: Failed to start MariaDB via docker-compose. Please start it manually with:
    echo    docker-compose -f backend/docker-compose.yml up -d mariadb
    echo.
) else (
    echo MariaDB start requested.
)
timeout /t 8 >nul

echo [1/3] Starting NestJS Backend (Port 3001)...
start "NestJS Backend" cmd /k "cd backend\nest-app && npm run start:dev"
timeout /t 5 >nul

echo [2/3] Starting MCP Servers...
start "MCP Servers" cmd /k "cd .specify\mcp-servers && npm run all"
timeout /t 3 >nul


echo.
echo Waiting 15 seconds for backends to start...
timeout /t 15 >nul

echo.
echo ========================================
echo   Starting Angular Dev Server
echo ========================================
echo.

echo Angular will start now...
rem Start Angular CLI inside the workspace (angular.json)
start "Angular Dev" cmd /k "npx ng serve raeuberbude --host=0.0.0.0 --port=4301 --configuration=network --proxy-config proxy.conf.json"

echo.
echo ========================================
echo   All servers starting...
echo ========================================
echo.
echo NestJS Backend:    http://localhost:3001
echo Angular:          http://localhost:4301
echo               or: http://192.168.178.25:4301
echo.
echo Server started! Check the server windows for errors.
echo.
pause
