@echo off
echo Building Tenebris...

REM Load configuration
call build.config.bat

REM Run the build
call npm run build

if %ERRORLEVEL% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Build complete! Output is in the 'dist' folder.
echo.

REM Deploy to heavy-photon-site if configured
if defined HEAVY_PHOTON_PATH (
    echo Deploying to heavy-photon-site...

    REM Copy entire dist folder contents to docs/tenebris
    if not exist "%HEAVY_PHOTON_PATH%\docs\tenebris" mkdir "%HEAVY_PHOTON_PATH%\docs\tenebris"
    xcopy /Y /E /I "dist\*" "%HEAVY_PHOTON_PATH%\docs\tenebris"

    echo.
    echo Deployment complete!
) else (
    echo Skipping deployment - HEAVY_PHOTON_PATH not configured
)

pause
