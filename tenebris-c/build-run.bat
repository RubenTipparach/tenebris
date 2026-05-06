@echo off
REM Build and run the native (desktop) Tenebris client on Windows.
REM
REM Requirements (all on PATH):
REM   * cmake >= 3.20
REM   * ninja
REM   * a C compiler that accepts GCC-style flags (-Wall, -ffp-contract=off):
REM     clang / clang-cl / mingw gcc work; plain MSVC cl.exe does not.
REM   * git + powershell (only needed first time, to vendor third_party\
REM     deps via install.bat / scripts\fetch-deps.ps1).

setlocal

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%"

if not exist "third_party\sokol-tools-bin\sokol-shdc.exe" (
    echo [build-run] third_party deps missing; running install.bat ...
    call "install.bat"
    if errorlevel 1 goto :fail
)

echo [build-run] cmake configure ^(preset=native^) ...
cmake --preset=native
if errorlevel 1 goto :fail

echo [build-run] cmake build ...
cmake --build build-native
if errorlevel 1 goto :fail

echo [build-run] launching build-native\tenebris.exe ...
"build-native\tenebris.exe"
set "RC=%ERRORLEVEL%"
popd
exit /b %RC%

:fail
popd
exit /b 1
