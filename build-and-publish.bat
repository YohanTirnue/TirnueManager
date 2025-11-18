@echo off
echo ========================================
echo MCSManager Build and Publish Script
echo ========================================
echo.

REM Step 1: Build Frontend
echo [1/4] Building frontend...
cd /d "E:\MINECRAFT\forNyxie\mcsmanager\frontend"
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Frontend build failed!
    pause
    exit /b %errorlevel%
)
echo Frontend build completed successfully!
echo.

REM Step 2: Publish Frontend to production-code/web
echo [2/4] Publishing frontend to production-code/web...
powershell -Command "if (Test-Path 'E:\MINECRAFT\forNyxie\mcsmanager\production-code\web\*') { Remove-Item -Path 'E:\MINECRAFT\forNyxie\mcsmanager\production-code\web\*' -Recurse -Force }"
powershell -Command "Copy-Item -Path 'E:\MINECRAFT\forNyxie\mcsmanager\frontend\dist\*' -Destination 'E:\MINECRAFT\forNyxie\mcsmanager\production-code\web\' -Recurse -Force"
echo Frontend published successfully!
echo.

REM Step 3: Build Daemon
echo [3/4] Building daemon...
cd /d "E:\MINECRAFT\forNyxie\mcsmanager\daemon"
call npm run build
if %errorlevel% neq 0 (
    echo ERROR: Daemon build failed!
    pause
    exit /b %errorlevel%
)
echo Daemon build completed successfully!
echo.

REM Step 4: Publish Daemon to production-code/daemon
echo [4/4] Publishing daemon to production-code/daemon...
powershell -Command "if (Test-Path 'E:\MINECRAFT\forNyxie\mcsmanager\production-code\daemon\*') { Remove-Item -Path 'E:\MINECRAFT\forNyxie\mcsmanager\production-code\daemon\*' -Recurse -Force }"
powershell -Command "Copy-Item -Path 'E:\MINECRAFT\forNyxie\mcsmanager\daemon\production\*' -Destination 'E:\MINECRAFT\forNyxie\mcsmanager\production-code\daemon\' -Recurse -Force"
echo Daemon published successfully!
echo.

REM Step 5: Delete old yes.zip if exists
echo [5/5] Creating yes.zip archive...
if exist "E:\MINECRAFT\forNyxie\mcsmanager\yes.zip" (
    echo Deleting old yes.zip...
    del /f /q "E:\MINECRAFT\forNyxie\mcsmanager\yes.zip"
)

REM Step 6: Create yes.zip with daemon and web folders
echo Creating new yes.zip...
powershell -Command "Compress-Archive -Path 'E:\MINECRAFT\forNyxie\mcsmanager\production-code\daemon','E:\MINECRAFT\forNyxie\mcsmanager\production-code\web' -DestinationPath 'E:\MINECRAFT\forNyxie\mcsmanager\yes.zip' -Force"
echo yes.zip created successfully!
echo.

echo ========================================
echo Build and Publish Complete!
echo ========================================
echo Frontend: E:\MINECRAFT\forNyxie\mcsmanager\production-code\web
echo Daemon:   E:\MINECRAFT\forNyxie\mcsmanager\production-code\daemon
echo Archive:  E:\MINECRAFT\forNyxie\mcsmanager\yes.zip
echo.
echo Press any key to exit...
pause > nul
