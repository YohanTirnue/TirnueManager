@echo off
echo ========================================
echo MCSManager Template Version Monitor
echo ========================================
echo.
echo Starting template monitoring service...
echo This will check for new server versions every 6 hours
echo and automatically archive old versions.
echo.
echo Press Ctrl+C to stop the monitor
echo.

node template-version-monitor.js
