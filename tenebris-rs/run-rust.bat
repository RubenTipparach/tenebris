@echo off
REM Build and run the native (desktop) Tenebris Rust port on Windows.
REM
REM Self-contained: builds the cargo workspace under tenebris-rs\ and
REM runs the binary from tenebris-rs\, which holds its own assets\ tree.
REM This script never references the deprecated C or JS trees.
REM
REM Usage:
REM   run-rust.bat                    build + run the client (debug)
REM   run-rust.bat release            build + run the client (release)
REM   run-rust.bat dev                build + run, boot into an SP world
REM                                   stocked with a rocket-build kit so
REM                                   the new tech/rocket content shows up
REM                                   (normal play never auto-spawns it)
REM   run-rust.bat server             build + run the headless server
REM   run-rust.bat server release     build + run the server (release)
REM   run-rust.bat server -- --port 9001 --seed 42
REM                                   forward everything after -- to the
REM                                   binary
REM
REM Requirements (on PATH):
REM   * a stable Rust toolchain (cargo / rustc) - https://rustup.rs
REM
REM The client loads its assets ("assets\textures\...",
REM "assets\config\...") relative to the current directory, so it is
REM launched from tenebris-rs\, which holds the assets\ tree.

setlocal enabledelayedexpansion

set "SCRIPT_DIR=%~dp0"

set "BIN=tenebris-client"
set "PROFILE=debug"
set "PROFILE_FLAG="
set "FORWARD="

:parse
if "%~1"=="" goto build
if /I "%~1"=="client"    ( set "BIN=tenebris-client" & shift & goto parse )
if /I "%~1"=="server"    ( set "BIN=tenebris-server" & shift & goto parse )
if /I "%~1"=="release"   ( set "PROFILE=release" & set "PROFILE_FLAG=--release" & shift & goto parse )
if /I "%~1"=="--release" ( set "PROFILE=release" & set "PROFILE_FLAG=--release" & shift & goto parse )
if /I "%~1"=="debug"     ( set "PROFILE=debug" & set "PROFILE_FLAG=" & shift & goto parse )
if /I "%~1"=="dev"       ( set "DEVMODE=1" & shift & goto parse )
if "%~1"=="--"           ( shift & goto collect )
echo [run-rust] unknown argument: %~1
echo.
goto usage

:collect
if "%~1"=="" goto build
set "FORWARD=!FORWARD! %1"
shift
goto collect

:build
echo [run-rust] cargo build -p %BIN% %PROFILE_FLAG% ...
pushd "%SCRIPT_DIR%"
cargo build -p %BIN% %PROFILE_FLAG%
if errorlevel 1 (
    popd
    goto fail
)
popd

set "EXE=%SCRIPT_DIR%target\%PROFILE%\%BIN%.exe"
if not exist "%EXE%" (
    echo [run-rust] expected binary not found: %EXE%
    goto fail
)

echo [run-rust] running RUST build: %EXE%
if /I "%PROFILE%"=="debug" echo [run-rust]   NOTE: debug build - pass "release" for a smooth, optimized run.
if defined DEVMODE (
    REM Boot straight into an SP world stocked with a rocket-build kit
    REM (launch pad + parts) so the new tech/rocket content is reachable
    REM immediately - normal play never auto-spawns it. See the other
    REM TENEBRIS_DEV_* showcases in app.rs (PRINTER, POWER, TECH,
    REM SHOWCASE, ROCKET, ...) - set any of those yourself for a specific
    REM scene.
    set "TENEBRIS_DEV_SP=1"
    set "TENEBRIS_DEV_KIT=1"
    echo [run-rust]   DEV mode: TENEBRIS_DEV_SP + TENEBRIS_DEV_KIT set ^(SP world + rocket kit^).
)
REM Run from tenebris-rs\ so the binary finds its bundled assets\ tree.
pushd "%SCRIPT_DIR%"
"%EXE%"!FORWARD!
set "RC=%ERRORLEVEL%"
popd
exit /b %RC%

:usage
echo Usage:
echo   run-rust.bat [client^|server] [release] [dev] [-- ARGS...]
echo.
echo   run-rust.bat                    build + run the client (debug)
echo   run-rust.bat release            build + run the client (release)
echo   run-rust.bat dev                SP world + rocket-build kit (showcase)
echo   run-rust.bat server             build + run the headless server
echo   run-rust.bat server release     build + run the server (release)
echo   run-rust.bat server -- --port 9001 --seed 42
exit /b 2

:fail
echo [run-rust] build failed.
exit /b 1
