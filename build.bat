@echo off
REM Build Tenebris for heavyphoton.com/tenebris/ and copy it into the
REM heavyphoton.github.io checkout's docs\tenebris\ (set in build.config.bat).
echo Building Tenebris for heavyphoton.com...

REM Load configuration
call build.config.bat

call npm run build:site

if %ERRORLEVEL% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Build complete! Output is in the 'dist-site' folder.
echo.

if defined HEAVY_PHOTON_PATH (
    echo Deploying to %HEAVY_PHOTON_PATH%\docs\tenebris ...
    if not exist "%HEAVY_PHOTON_PATH%\docs\tenebris" mkdir "%HEAVY_PHOTON_PATH%\docs\tenebris"
    REM Old hashed bundles would pile up forever - replace the assets folder.
    if exist "%HEAVY_PHOTON_PATH%\docs\tenebris\assets" rmdir /S /Q "%HEAVY_PHOTON_PATH%\docs\tenebris\assets"
    xcopy /Y /E /I "dist-site\*" "%HEAVY_PHOTON_PATH%\docs\tenebris"

    echo.
    echo Deployment complete! Commit docs\tenebris in the site repo.
) else (
    echo Skipping deployment - HEAVY_PHOTON_PATH not configured
)

pause
