@echo off
REM Build Tenebris for itch.io: a flat, relative-path HTML5 build zipped as
REM tenebris-itch.zip. Upload it as an HTML5 game ("This file will be played
REM in the browser"); index.html is at the zip root.

echo.
echo [1/2] Building with Vite (itch.io config)...
call npm run build:itch
if errorlevel 1 ( echo Build failed! & pause & exit /b 1 )

echo.
echo [2/2] Creating tenebris-itch.zip...
if exist tenebris-itch.zip del tenebris-itch.zip
powershell -NoProfile -Command "Compress-Archive -Path 'dist-itch\*' -DestinationPath 'tenebris-itch.zip' -Force"
if errorlevel 1 ( echo Zip failed! & pause & exit /b 1 )

echo.
echo ========================================
echo Build complete: tenebris-itch.zip
echo ========================================
echo Upload it to itch.io as an HTML5 game, or push with butler:
echo   butler push tenebris-itch.zip ruben-tipparach/tenebris:html5
pause
