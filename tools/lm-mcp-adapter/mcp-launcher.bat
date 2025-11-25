@echo off
REM MCP Launcher: Prefer LMStudio-MCP Python bridge if available, otherwise fall back to node adapter

set LOGFILE=%TEMP%\lm-mcp-launcher.log
echo [%DATE% %TIME%] [mcp-launcher] Starting MCP launcher... >> "%LOGFILE%" 2>&1
echo [%DATE% %TIME%] [mcp-launcher] LM_API_URL=%LM_API_URL% TCP_PORT=%TCP_PORT% >> "%LOGFILE%" 2>&1

rem Configure defaults if not set
if "%LM_STUDIO_BASE%"=="" set LM_STUDIO_BASE=http://192.168.56.1:1234
if "%LM_API_URL%"=="" set LM_API_URL=%LM_STUDIO_BASE%
if "%TCP_PORT%"=="" set TCP_PORT=3002
if "%USE_CLI%"=="" set USE_CLI=false


set PY_BRIDGE_PATH=C:\Users\corat\IdeaProjects\LMStudio-MCP\lmstudio_bridge.py
set VENV_ACTIVATE=C:\Users\corat\IdeaProjects\LMStudio-MCP\.venv\Scripts\Activate.ps1
set ADAPTER_DIR=%~dp0
set ADAPTER_BAT=%ADAPTER_DIR%adapter.bat


:: change drive/dir to the adapter directory so relative calls work (and avoid drive-not-found errors)
echo [%DATE% %TIME%] [mcp-launcher] pushd %ADAPTER_DIR% >> "%LOGFILE%" 2>&1
pushd %ADAPTER_DIR% >> "%LOGFILE%" 2>&1 || (echo [%DATE% %TIME%] [mcp-launcher] pushd failed >> "%LOGFILE%" 2>&1)

if exist "%PY_BRIDGE_PATH%" (
  where python >nul 2>&1
  if %ERRORLEVEL% ==0 (
    echo [%DATE% %TIME%] [mcp-launcher] Found Python bridge, starting with system python... >> "%LOGFILE%" 2>&1
    echo [%DATE% %TIME%] [mcp-launcher] Running: python "%PY_BRIDGE_PATH%" >> "%LOGFILE%" 2>&1
    REM Start python bridge and redirect its stdout/stderr to log file
    python "%PY_BRIDGE_PATH%" >> "%LOGFILE%" 2>&1
    echo [%DATE% %TIME%] [mcp-launcher] Python bridge exited with code %ERRORLEVEL% >> "%LOGFILE%" 2>&1
    popd >> "%LOGFILE%" 2>&1
    exit /b %ERRORLEVEL%
  ) else (
    echo [%DATE% %TIME%] [mcp-launcher] Python not in PATH, falling back to node adapter... >> "%LOGFILE%" 2>&1
  )
) else (
  echo [%DATE% %TIME%] [mcp-launcher] No Python bridge found at %PY_BRIDGE_PATH%, falling back to node adapter... >> "%LOGFILE%" 2>&1
)

:: Fallback to node adapter
echo [%DATE% %TIME%] [mcp-launcher] Starting node adapter: %ADAPTER_BAT% >> "%LOGFILE%" 2>&1
if exist "%ADAPTER_BAT%" (
  call "%ADAPTER_BAT%" >> "%LOGFILE%" 2>&1
) else (
  echo [%DATE% %TIME%] [mcp-launcher] adapter.bat not found at %ADAPTER_BAT% >> "%LOGFILE%" 2>&1
)
popd >> "%LOGFILE%" 2>&1
exit /b %ERRORLEVEL%
