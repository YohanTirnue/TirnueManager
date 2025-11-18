@echo off
echo ========================================
echo MCSManager Local Development Server
echo ========================================
echo.
echo Starting Frontend, Panel, and Daemon...
echo.
echo Frontend will run on: http://localhost:5173
echo Panel will run on: http://localhost:23333
echo Daemon will run on: http://localhost:24444
echo.
echo This will run all 3 servers in one window
echo Press Ctrl+C to stop all servers
echo.

cd /d "E:\MINECRAFT\forNyxie\mcsmanager"
npm run all
