@echo off
REM Adapter starter for LM Studio (Windows)
REM Usage: configure LM Studio to run this batch as the MCP tool.

set LOGFILE=%TEMP%\lm-mcp-adapter.log
echo [%DATE% %TIME%] [adapter.bat] starting >> "%LOGFILE%" 2>&1

:: Set LM API URL if not already provided
if "%LM_API_URL%"=="" set LM_API_URL=http://localhost:8080
if "%TCP_PORT%"=="" set TCP_PORT=3002

:: change to script directory to ensure relative paths resolve and drive is available
pushd "%~dp0" >> "%LOGFILE%" 2>&1 || echo [%DATE% %TIME%] [adapter.bat] pushd failed >> "%LOGFILE%" 2>&1

:: Try to find node in PATH and execute adapter.js directly
where node >nul 2>&1
if %ERRORLEVEL%==0 (
  echo [%DATE% %TIME%] [adapter.bat] running node adapter.js >> "%LOGFILE%" 2>&1
  node "%~dp0adapter.js" >> "%LOGFILE%" 2>&1
  set RC=%ERRORLEVEL%
) else (
  echo [adapter.bat] node not found in PATH. Please install Node.js or add it to PATH. 1>&2
  set RC=1
)

popd >> "%LOGFILE%" 2>&1 || echo [%DATE% %TIME%] [adapter.bat] popd failed >> "%LOGFILE%" 2>&1
exit /b %RC%
