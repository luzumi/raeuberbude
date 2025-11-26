@echo off
echo.
echo ========================================
echo   Starting STT Services (Docker)
echo ========================================
echo.
echo This script starts:
echo   - Vosk STT (Port 2700) - German speech recognition
echo   - Whisper STT (Port 9090) - High-quality speech recognition
echo   - MongoDB (Port 27018) - Database
echo.

cd /d "%~dp0.."

echo Checking if Docker is running...
docker ps >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo ERROR: Docker is not running or not installed!
    echo Please start Docker Desktop first.
    echo.
    pause
    exit /b 1
)

echo Docker is running!
echo.

echo Starting STT services via Docker Compose...
cd backend

docker-compose down >nul 2>&1
timeout /t 2 >nul

docker-compose up -d mongo vosk whisper

echo.
echo ========================================
echo   STT Services Starting
echo ========================================
echo.
echo Waiting for services to be healthy...
timeout /t 10 >nul

echo.
echo Services status:
docker-compose ps

echo.
echo ========================================
echo   STT Services Ready
echo ========================================
echo.
echo Vosk:    ws://localhost:2700
echo Whisper: http://localhost:9090
echo MongoDB: mongodb://rb_root:rb_secret@localhost:27018/raueberbude
echo.
echo Start the NestJS backend in another terminal:
echo   cd backend\nest-app
echo   npm run start:dev
echo.
pause


