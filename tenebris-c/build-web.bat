@echo off
REM Build the WASM (Emscripten) Tenebris client and serve it locally so
REM you can verify the build in a browser.
REM
REM Requirements (all on PATH):
REM   * emsdk activated in the current shell (run emsdk_env.bat from
REM     your emsdk install — sets the EMSDK env var that CMake's web
REM     preset reads to find the Emscripten toolchain file).
REM   * cmake >= 3.20
REM   * ninja
REM   * node + npm (for `npx serve` — no local install needed; npx
REM     fetches the package on first run).
REM   * git + powershell (only needed first time, to vendor third_party\
REM     deps via install.bat / scripts\fetch-deps.ps1).
REM
REM Output: build-web\tenebris.html (+ .js / .wasm / .data) served at
REM http://localhost:3000/tenebris.html. Hit Ctrl+C to stop the server.

setlocal

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%"

if "%EMSDK%"=="" (
    echo [build-web] EMSDK env var not set. Activate emsdk first:
    echo              ^> path\to\emsdk\emsdk_env.bat
    goto :fail
)

if not exist "third_party\sokol-tools-bin\sokol-shdc.exe" (
    echo [build-web] third_party deps missing; running install.bat ...
    call "install.bat"
    if errorlevel 1 goto :fail
)

echo [build-web] cmake configure ^(preset=web^) ...
call cmake --preset=web
if errorlevel 1 goto :fail

echo [build-web] cmake build ...
call cmake --build build-web
if errorlevel 1 goto :fail

echo [build-web] serving build-web\ at http://localhost:3000/tenebris.html
echo [build-web] press Ctrl+C to stop.
start "" "http://localhost:3000/tenebris.html"
pushd "build-web"
call npx --yes serve -l 3000 .
set "RC=%ERRORLEVEL%"
popd
popd
exit /b %RC%

:fail
popd
exit /b 1
