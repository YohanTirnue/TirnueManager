@echo off
title TirnueManager Launcher
echo ========================================
echo  TirnueManager + Minecraft Server
echo ========================================
echo.

:: Find npm path
for /f "delims=" %%i in ('where npm 2^>nul') do set NPM_PATH=%%i
if "%NPM_PATH%"=="" (
    :: Try common Node.js install locations
    if exist "C:\Program Files\nodejs\npm.cmd" set NPM_PATH=C:\Program Files\nodejs\npm.cmd
    if exist "%APPDATA%\npm\npm.cmd" set NPM_PATH=%APPDATA%\npm\npm.cmd
)

if "%NPM_PATH%"=="" (
    echo [ERROR] npm not found! Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

echo [OK] Found npm at: %NPM_PATH%
echo.

set ROOT=%~dp0
set ROOT=%ROOT:~0,-1%

echo [1/3] Starting Daemon (port 24444)...
start "MCSManager Daemon" cmd /k "cd /d "%ROOT%" && npm run daemon"

timeout /t 3 /nobreak >nul

echo [2/3] Starting Panel (port 23333)...
start "MCSManager Panel" cmd /k "cd /d "%ROOT%" && npm run panel"

timeout /t 5 /nobreak >nul

echo [3/3] Starting Frontend (port 5173)...
start "MCSManager Frontend" cmd /k "cd /d "%ROOT%" && npm run frontend"

echo.
echo ========================================
echo  All services started!
echo  Panel UI: http://localhost:5173
echo  Panel API: http://localhost:23333
echo  Daemon:   http://localhost:24444
echo ========================================
echo.
echo Press any key to close this launcher window...
pause >nul
