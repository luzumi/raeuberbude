@echo off
echo.
echo ============================================
echo   Raeuberbude Dev-Server Restart
echo ============================================
echo.

echo [1/4] Stopping old Node processes...
taskkill /F /FI "IMAGENAME eq node.exe" /FI "WINDOWTITLE eq *raueberbude*" >nul 2>&1
timeout /t 2 >nul

echo [2/4] Clearing port 4200...
FOR /F "tokens=5" %%P IN ('netstat -ano ^| findstr :4200 ^| findstr LISTENING') DO (
    echo   Killing process %%P...
    taskkill /PID %%P /F >nul 2>&1
)
timeout /t 2 >nul

echo [3/4] Starting Angular Dev-Server...
start "Raeuberbude Dev-Server" cmd /k "cd /d %~dp0.. && npm start"

echo [4/4] Waiting for server to start...
timeout /t 10 >nul

echo.
echo ============================================
echo   Server should be ready!
echo ============================================
echo.
echo   Open: http://localhost:4200
echo.
echo   Press Ctrl+C in the server window to stop
echo.

start http://localhost:4200

pause

