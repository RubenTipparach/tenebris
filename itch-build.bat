@echo off
echo ========================================
echo Building Tenebris for itch.io
echo ========================================

:: Run TypeScript compiler
echo.
echo [1/4] Compiling TypeScript...
call npx tsc
if errorlevel 1 (
    echo TypeScript compilation failed!
    pause
    exit /b 1
)

:: Run Vite build with itch.io config
echo.
echo [2/4] Building with Vite (itch.io config)...
call npx vite build --config vite.config.itch.ts
if errorlevel 1 (
    echo Vite build failed!
    pause
    exit /b 1
)

:: Remove old zip if exists
echo.
echo [3/4] Preparing zip file...
if exist "tenebris-itch.zip" del "tenebris-itch.zip"

:: Create zip file using PowerShell (built into Windows)
echo.
echo [4/4] Creating tenebris-itch.zip...
powershell -Command "Compress-Archive -Path 'dist-itch\*' -DestinationPath 'tenebris-itch.zip' -Force"
if errorlevel 1 (
    echo Failed to create zip file!
    pause
    exit /b 1
)

echo.
echo ========================================
echo Build complete!
echo ========================================
echo.
echo Output: tenebris-itch.zip
echo.
echo Upload this zip file to itch.io
echo Make sure to set "This file will be played in the browser"
echo and enable "SharedArrayBuffer support" if needed.
echo.
pause
