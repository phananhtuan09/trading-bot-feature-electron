@echo off
echo ========================================
echo    Crypto Trading Bot - Build Portable
echo ========================================
echo.

REM Check if running as administrator
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [OK] Running with administrator privileges...
) else (
    echo [ERROR] This script requires administrator privileges.
    echo Please run this batch file as Administrator.
    echo Right-click and select "Run as administrator"
    echo.
    pause
    exit /b 1
)

echo.
echo [INFO] Navigating to project directory...
cd /d "%~dp0.."

echo.
echo [INFO] Clearing electron-builder cache...
if exist "%LOCALAPPDATA%\electron-builder\Cache" (
    rmdir /s /q "%LOCALAPPDATA%\electron-builder\Cache"
    echo [OK] Cache cleared successfully.
) else (
    echo [INFO] No cache found to clear.
)

echo.
echo [INFO] Clearing dist folder...
if exist "dist" (
    rmdir /s /q "dist"
    echo [OK] Dist folder cleared successfully.
) else (
    echo [INFO] No dist folder found to clear.
)

echo.
echo [INFO] Clearing node_modules cache...
if exist "node_modules\.cache" (
    rmdir /s /q "node_modules\.cache"
    echo [OK] Node modules cache cleared.
)

echo.
echo [INFO] Building portable version...
echo [INFO] This may take several minutes...
echo.

REM Force rebuild with clean cache
npx electron-builder --win portable --publish=never

if %errorLevel% == 0 (
    echo.
    echo ========================================
    echo    BUILD COMPLETED SUCCESSFULLY!
    echo ========================================
    echo.
    echo Portable executable created in: dist\
    echo.
) else (
    echo.
    echo ========================================
    echo    BUILD FAILED!
    echo ========================================
    echo.
    echo Please check the error messages above.
    echo.
)

pause
