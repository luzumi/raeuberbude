@echo off
setlocal enabledelayedexpansion

echo.
echo ========================================
echo   Raeuberbude - Complete Docker Setup
echo ========================================
echo.

REM Check if Docker is running
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Docker is not running! Please start Docker Desktop first.
    pause
    exit /b 1
)

cd /d "%~dp0.."

echo.
echo ========================================
echo   Step 1: Starting Docker Services
echo ========================================
echo.

cd backend
docker-compose down >nul 2>&1
echo Starting: MongoDB, NestJS API, Vosk STT, Whisper STT...
docker-compose up -d
echo Waiting for services to start...
timeout /t 15 >nul

echo.
echo Docker services status:
docker-compose ps

cd ..

echo.
echo ========================================
echo   Step 2: Starting MCP Servers
echo ========================================
echo.

start "MCP Servers" cmd /k "cd .specify\mcp-servers && npm run all"
timeout /t 5 >nul

echo.
echo ========================================
echo   Step 3: Starting Angular Dev Server
echo ========================================
echo.

start "Angular Dev" cmd /k "ng serve --host 0.0.0.0 --port 4301 --configuration=network"

echo.
echo ========================================
echo   All Services Started!
echo ========================================
echo.
echo Backend API:      http://localhost:3001
echo Angular (LAN):    http://0.0.0.0:4301
echo Vosk STT:         ws://localhost:2700
echo Whisper STT:      http://localhost:9090
echo MongoDB:          mongodb://rb_root:rb_secret@localhost:27018/raueberbude
echo.
echo Waiting for services to be ready...
timeout /t 20 >nul

start http://localhost:4301

echo.
echo Done! Open http://localhost:4301 in your browser.
echo Check Docker and terminal windows for any errors.
pause


