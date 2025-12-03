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

    REM Copy index.html to docs/tenebris folder
    if not exist "%HEAVY_PHOTON_PATH%\docs\tenebris" mkdir "%HEAVY_PHOTON_PATH%\docs\tenebris"
    copy /Y "dist\index.html" "%HEAVY_PHOTON_PATH%\docs\tenebris\index.html"

    REM Copy assets folder to docs/assets
    if exist "dist\assets" (
        xcopy /Y /E /I "dist\assets" "%HEAVY_PHOTON_PATH%\docs\assets"
    )

    REM Copy textures folder to docs/textures
    if exist "dist\textures" (
        xcopy /Y /E /I "dist\textures" "%HEAVY_PHOTON_PATH%\docs\textures"
    )

    echo.
    echo Deployment complete!
) else (
    echo Skipping deployment - HEAVY_PHOTON_PATH not configured
)

pause
