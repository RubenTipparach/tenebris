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
REM   run-rust.bat server             build + run the headless server
REM   run-rust.bat server release     build + run the server (release)
REM   run-rust.bat server -- --port 9001 --seed 42
REM                                   forward everything after -- to the
REM                                   binary
REM
REM Demo shortcuts (boot straight into an SP world showing one feature -
REM most of the recent work is opened/triggered in-game, not visible just
REM standing around, so these set the right dev env vars for you):
REM   run-rust.bat inv               open the new inventory + crafting grid
REM   run-rust.bat craft             open the crafting screen (icon rows)
REM   run-rust.bat chest             place a stocked chest (E -> thumbnail grid)
REM   run-rust.bat furnace           place + open a furnace (smelt GUI)
REM   run-rust.bat power             power network (steam engine + cables)
REM   run-rust.bat wires             modular cable / pipe connectors
REM   run-rust.bat printer           3D printer + computer
REM   run-rust.bat tech              tech-block cube showcase ring
REM   run-rust.bat rocket            rocket-assembly screen, pre-stacked
REM   run-rust.bat rocketworld       the assembled rocket standing on its pad
REM   run-rust.bat pad               drop a launch pad on the spawn
REM   run-rust.bat mine              mining / ore showcase
REM   run-rust.bat showcase          ore + tech showcase ring
REM   run-rust.bat sky               look up at the day/night + orbit sky
REM   run-rust.bat dev               SP world + rocket-build kit in the bag
REM   run-rust.bat kit               stock a rocket-build kit in the bag
REM   run-rust.bat sp                just boot straight into an SP world
REM Time-of-day modifiers (combine with any demo, e.g. "sky dawn"):
REM   dawn | noon | dusk | night     freeze the clock at that time
REM Demos default to a release build for a smooth run; add "debug" to override.
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
REM Tracks whether the caller picked a profile explicitly; if not, a demo
REM shortcut upgrades the default to release for a smooth showcase.
set "PROFILE_SET="
set "DEMO_SET="

:parse
if "%~1"=="" goto defaults
if /I "%~1"=="client"    ( set "BIN=tenebris-client" & shift & goto parse )
if /I "%~1"=="server"    ( set "BIN=tenebris-server" & shift & goto parse )
if /I "%~1"=="release"   ( set "PROFILE=release" & set "PROFILE_FLAG=--release" & set "PROFILE_SET=1" & shift & goto parse )
if /I "%~1"=="--release" ( set "PROFILE=release" & set "PROFILE_FLAG=--release" & set "PROFILE_SET=1" & shift & goto parse )
if /I "%~1"=="debug"     ( set "PROFILE=debug" & set "PROFILE_FLAG=" & set "PROFILE_SET=1" & shift & goto parse )

REM ---- Demo shortcuts: each boots straight into SP and lights up one
REM ---- feature. They set TENEBRIS_DEV_SP so the world auto-starts.
if /I "%~1"=="dev"         ( set "TENEBRIS_DEV_SP=1" & set "TENEBRIS_DEV_KIT=1" & set "DEMO_SET=1" & shift & goto parse )
if /I "%~1"=="inv"         ( set "TENEBRIS_DEV_SP=1" & set "TENEBRIS_DEV_INV=1" & set "DEMO_SET=1" & shift & goto parse )
if /I "%~1"=="sp"          ( set "TENEBRIS_DEV_SP=1" & set "DEMO_SET=1" & shift & goto parse )
if /I "%~1"=="craft"       ( set "TENEBRIS_DEV_SP=1" & set "TENEBRIS_DEV_CRAFT=1"        & set "DEMO_SET=1" & shift & goto parse )
if /I "%~1"=="chest"       ( set "TENEBRIS_DEV_SP=1" & set "TENEBRIS_DEV_CHEST=1"        & set "DEMO_SET=1" & shift & goto parse )
if /I "%~1"=="furnace"     ( set "TENEBRIS_DEV_SP=1" & set "TENEBRIS_DEV_FURNACE=1"      & set "DEMO_SET=1" & shift & goto parse )
if /I "%~1"=="power"       ( set "TENEBRIS_DEV_SP=1" & set "TENEBRIS_DEV_POWER=1"        & set "DEMO_SET=1" & shift & goto parse )
if /I "%~1"=="wires"       ( set "TENEBRIS_DEV_SP=1" & set "TENEBRIS_DEV_WIRES=1"        & set "DEMO_SET=1" & shift & goto parse )
if /I "%~1"=="printer"     ( set "TENEBRIS_DEV_SP=1" & set "TENEBRIS_DEV_PRINTER=1"      & set "DEMO_SET=1" & shift & goto parse )
if /I "%~1"=="tech"        ( set "TENEBRIS_DEV_SP=1" & set "TENEBRIS_DEV_TECH=1"         & set "DEMO_SET=1" & shift & goto parse )
if /I "%~1"=="rocket"      ( set "TENEBRIS_DEV_SP=1" & set "TENEBRIS_DEV_ROCKET=1"       & set "DEMO_SET=1" & shift & goto parse )
if /I "%~1"=="rocketworld" ( set "TENEBRIS_DEV_SP=1" & set "TENEBRIS_DEV_ROCKET_WORLD=1" & set "DEMO_SET=1" & shift & goto parse )
if /I "%~1"=="pad"         ( set "TENEBRIS_DEV_SP=1" & set "TENEBRIS_DEV_PAD=1"          & set "DEMO_SET=1" & shift & goto parse )
if /I "%~1"=="mine"        ( set "TENEBRIS_DEV_SP=1" & set "TENEBRIS_DEV_MINE=1"         & set "DEMO_SET=1" & shift & goto parse )
if /I "%~1"=="showcase"    ( set "TENEBRIS_DEV_SP=1" & set "TENEBRIS_DEV_SHOWCASE=1"     & set "DEMO_SET=1" & shift & goto parse )
if /I "%~1"=="sky"         ( set "TENEBRIS_DEV_SP=1" & set "TENEBRIS_DEV_SKY=1"          & set "DEMO_SET=1" & shift & goto parse )
if /I "%~1"=="kit"         ( set "TENEBRIS_DEV_SP=1" & set "TENEBRIS_DEV_KIT=1"          & set "DEMO_SET=1" & shift & goto parse )

REM ---- Time-of-day modifiers (freeze the day/night clock for a look) ----
if /I "%~1"=="dawn"        ( set "TENEBRIS_DEV_TIME=0.02" & shift & goto parse )
if /I "%~1"=="noon"        ( set "TENEBRIS_DEV_TIME=0.46" & shift & goto parse )
if /I "%~1"=="dusk"        ( set "TENEBRIS_DEV_TIME=0.60" & shift & goto parse )
if /I "%~1"=="night"       ( set "TENEBRIS_DEV_TIME=0.80" & shift & goto parse )

if /I "%~1"=="help"       goto usage
if /I "%~1"=="-h"         goto usage
if /I "%~1"=="--help"     goto usage
if "%~1"=="--"            ( shift & goto collect )
echo [run-rust] unknown argument: %~1
echo.
goto usage

:collect
if "%~1"=="" goto build
set "FORWARD=!FORWARD! %1"
shift
goto collect

:defaults
REM A demo with no explicit profile runs release for a smooth showcase.
if defined DEMO_SET if not defined PROFILE_SET (
    set "PROFILE=release"
    set "PROFILE_FLAG=--release"
)
goto build

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
if defined DEMO_SET (
    echo [run-rust]   demo env: DEV_SP=%TENEBRIS_DEV_SP% INV=%TENEBRIS_DEV_INV% CRAFT=%TENEBRIS_DEV_CRAFT% CHEST=%TENEBRIS_DEV_CHEST% FURNACE=%TENEBRIS_DEV_FURNACE% POWER=%TENEBRIS_DEV_POWER% WIRES=%TENEBRIS_DEV_WIRES% PRINTER=%TENEBRIS_DEV_PRINTER% TECH=%TENEBRIS_DEV_TECH% ROCKET=%TENEBRIS_DEV_ROCKET% ROCKETWORLD=%TENEBRIS_DEV_ROCKET_WORLD% PAD=%TENEBRIS_DEV_PAD% MINE=%TENEBRIS_DEV_MINE% SHOWCASE=%TENEBRIS_DEV_SHOWCASE% SKY=%TENEBRIS_DEV_SKY% KIT=%TENEBRIS_DEV_KIT% TIME=%TENEBRIS_DEV_TIME%
)
REM Run from tenebris-rs\ so the binary finds its bundled assets\ tree.
pushd "%SCRIPT_DIR%"
"%EXE%"!FORWARD!
set "RC=%ERRORLEVEL%"
popd
exit /b %RC%

:usage
echo Usage:
echo   run-rust.bat [client^|server] [release^|debug] [DEMO] [TIME] [-- ARGS...]
echo.
echo   run-rust.bat                    build + run the client (debug)
echo   run-rust.bat release            build + run the client (release)
echo   run-rust.bat server             build + run the headless server
echo   run-rust.bat server release     build + run the server (release)
echo   run-rust.bat server -- --port 9001 --seed 42
echo.
echo Demos (boot straight into a feature; default to a release build):
echo   inv  craft  chest  furnace  power  wires  printer  tech
echo   rocket  rocketworld  pad  mine  showcase  sky  kit  dev  sp
echo Time of day (combine with a demo): dawn  noon  dusk  night
echo   e.g.  run-rust.bat inv          (the new inventory + crafting grid)
echo         run-rust.bat rocket       (open the rocket assembly screen)
echo         run-rust.bat sky dawn     (day/night sky frozen at sunrise)
exit /b 2

:fail
echo [run-rust] build failed.
exit /b 1
