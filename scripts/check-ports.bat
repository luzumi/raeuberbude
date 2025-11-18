@echo off
echo.
echo ============================================
echo   Raeuberbude Server Port Check
echo ============================================
echo.

echo Checking ports...
echo.

netstat -ano | findstr ":3000 :3001 :4200" > nul
if %errorlevel% equ 0 (
    echo Port Status:
    echo.
    netstat -ano | findstr ":3000 :3001 :4200"
    echo.
) else (
    echo No servers running on expected ports!
    echo.
)

echo ============================================
echo   Expected Configuration:
echo ============================================
echo   Backend Express:  http://localhost:3000
echo   NestJS:           http://localhost:3001
echo   Angular Dev:      http://localhost:4200  ^<-- USE THIS!
echo ============================================
echo.
echo IMPORTANT: Open your browser at:
echo   http://localhost:4200
echo.
echo NOT: http://localhost:4301 (wrong port!)
echo.

pause

