@echo off
echo.
echo ========================================
echo   Starting Backend Servers First
echo ========================================
echo.

cd /d %~dp0..

echo [1/3] Starting Backend Express...
start "Backend Express" cmd /k "cd backend && npm start"
timeout /t 3 >nul

echo [2/3] Starting NestJS...
start "NestJS" cmd /k "cd backend\nest-app && npm run start:dev"
timeout /t 3 >nul

echo [3/3] Starting MCP Servers...
start "MCP Servers" cmd /k "cd .specify\mcp-servers && npm run all"

echo.
echo Waiting 15 seconds for backends to start...
timeout /t 15 >nul

echo.
echo ========================================
echo   Starting Angular Dev Server
echo ========================================
echo.

echo Angular will start now...
start "Angular Dev" cmd /k "ng serve --host 0.0.0.0 --port 4200 --proxy-config proxy.conf.cjs"

echo.
echo ========================================
echo   All servers starting...
echo ========================================
echo.
echo Backend Express:  http://localhost:3000
echo NestJS:           http://localhost:3001
echo Angular:          http://localhost:4200
echo               or: http://192.168.178.25:4200
echo.
echo Wait ~15 more seconds, then open browser.
echo.

timeout /t 15 >nul
start http://localhost:4200

echo.
echo Browser opened! Check the server windows for errors.
pause

