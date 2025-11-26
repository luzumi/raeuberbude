@echo off
echo ========================================
echo   Starting Backend Express Server
echo ========================================
echo.

cd /d %~dp0..
echo Working directory: %CD%
echo.

echo Starting server on port 3000...
node server.js

pause

