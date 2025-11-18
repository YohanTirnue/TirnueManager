@echo off
echo ========================================
echo MCSManager Daemon Only (Development)
echo ========================================
echo.
echo Starting Daemon development server...
echo Daemon will run on: http://localhost:24444
echo.
echo Press Ctrl+C to stop
echo.

cd /d "E:\MINECRAFT\forNyxie\mcsmanager"
npm run daemon
