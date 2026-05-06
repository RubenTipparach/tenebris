@echo off
REM One-time setup for the Windows native build.
REM
REM Vendors sokol / stb / HandmadeMath into third_party\ and downloads
REM the win32 sokol-shdc.exe shader cross-compiler. After this succeeds,
REM run build-run.bat to configure, build, and launch.
REM
REM Requirements (all on PATH):
REM   * git
REM   * powershell (Windows PowerShell 5.1 ships with Win10/11)

setlocal

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%"

where git >nul 2>nul
if errorlevel 1 (
    echo [install] ERROR: 'git' not found on PATH. Install Git for Windows and retry.
    goto :fail
)

where powershell >nul 2>nul
if errorlevel 1 (
    echo [install] ERROR: 'powershell' not found on PATH.
    goto :fail
)

powershell -NoProfile -ExecutionPolicy Bypass -File "scripts\fetch-deps.ps1"
if errorlevel 1 goto :fail

popd
exit /b 0

:fail
popd
exit /b 1
