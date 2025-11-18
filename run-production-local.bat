@echo off
echo ========================================
echo MCSManager Production Build - Local Test
echo ========================================
echo.
echo This runs the BUILT production code locally
echo Make sure you've run build-and-publish.bat first!
echo.
echo Panel will run on: http://localhost:23333
echo Daemon will run on: http://localhost:24444
echo.

REM Check if production files exist
if not exist "E:\MINECRAFT\forNyxie\mcsmanager\production-code\web\index.html" (
    echo ERROR: Production web files not found!
    echo Please run build-and-publish.bat first
    pause
    exit /b 1
)

if not exist "E:\MINECRAFT\forNyxie\mcsmanager\production-code\daemon\app.js" (
    echo ERROR: Production daemon files not found!
    echo Please run build-and-publish.bat first
    pause
    exit /b 1
)

echo Starting production servers...
echo.

REM Start panel (need a simple HTTP server for the web files)
start "MCSManager Panel (Production)" cmd /k "cd /d E:\MINECRAFT\forNyxie\mcsmanager\panel && npm run start"

timeout /t 2 /nobreak > nul

REM Start daemon with production code
start "MCSManager Daemon (Production)" cmd /k "cd /d E:\MINECRAFT\forNyxie\mcsmanager\daemon && node production/app.js"

echo.
echo ========================================
echo Production servers are starting...
echo ========================================
echo.
echo Panel: http://localhost:23333
echo Daemon: http://localhost:24444
echo.
echo Check the new windows for server output
echo.
pause
