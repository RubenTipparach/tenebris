@echo off
REM
REM DISABLED during WASM port. Re-enable once the WASM preview reaches
REM Tier 2+ (save/load working) so we can ship a combined itch build
REM that includes both the JS and WASM variants.
REM
echo itch build is disabled during the Sokol/WASM port - see conversion.md Tier 1.
exit /b 0

REM --- original script preserved below ---------------------------------
REM echo ========================================
REM echo Building Tenebris for itch.io
REM echo ========================================
REM
REM echo.
REM echo [1/4] Compiling TypeScript...
REM call npx tsc
REM if errorlevel 1 ( echo TypeScript compilation failed! & pause & exit /b 1 )
REM
REM echo.
REM echo [2/4] Building with Vite (itch.io config)...
REM call npx vite build --config vite.config.itch.ts
REM if errorlevel 1 ( echo Vite build failed! & pause & exit /b 1 )
REM
REM echo.
REM echo [3/4] Preparing zip file...
REM if exist "tenebris-itch.zip" del "tenebris-itch.zip"
REM
REM echo.
REM echo [4/4] Creating tenebris-itch.zip...
REM powershell -Command "Compress-Archive -Path 'dist-itch\*' -DestinationPath 'tenebris-itch.zip' -Force"
REM if errorlevel 1 ( echo Failed to create zip file! & pause & exit /b 1 )
REM
REM echo.
REM echo ========================================
REM echo Build complete!
REM echo ========================================
REM echo.
REM echo Output: tenebris-itch.zip
REM echo.
REM pause
