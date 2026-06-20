@echo off
REM Build the WASM (Emscripten) Tenebris Rust client.
REM
REM Mirrors tenebris-c/build-web.bat + the EMCC_LINK_FLAGS block in
REM tenebris-c/CMakeLists.txt, adapted for cargo:
REM   * sokol C sources are compiled by the sokol crate's build.rs
REM     (cc -> emcc) when TARGET=wasm32-unknown-emscripten.
REM   * the EM_JS bodies live in crates/tenebris-client/web/
REM     library_tenebris.js (--js-library) instead of C EM_JS macros.
REM   * EXPORTED_FUNCTIONS replaces EMSCRIPTEN_KEEPALIVE for the
REM     Module.ccall re-entry points (#[no_mangle] exports in app.rs +
REM     menu.rs).
REM
REM Requirements:
REM   * emsdk - either already activated (emcc on PATH) or the EMSDK
REM     env var pointing at the install; this script calls
REM     %EMSDK%\emsdk_env.bat itself in that case. Same contract as
REM     the C build. (This machine: C:\Users\santi\repos\emsdk)
REM   * rust target: rustup target add wasm32-unknown-emscripten
REM     (auto-installed below if rustup is available).
REM
REM Output: web-dist\index.html (+ tenebris-client.js / .wasm / .data).
REM Serve web-dist\ with any static server, e.g.:
REM   npx serve -l 3000 web-dist

setlocal

set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%"

where emcc >nul 2>&1
if not errorlevel 1 goto :have_emcc
if "%EMSDK%"=="" (
    echo [build-web] emcc not on PATH and EMSDK not set. Activate emsdk first:
    echo              ^> path\to\emsdk\emsdk_env.bat
    goto :fail
)
echo [build-web] activating emsdk from %EMSDK% ...
call "%EMSDK%\emsdk_env.bat"
where emcc >nul 2>&1
if errorlevel 1 (
    echo [build-web] emsdk_env.bat did not put emcc on PATH.
    goto :fail
)
:have_emcc

rustup target list --installed 2>nul | findstr /c:"wasm32-unknown-emscripten" >nul
if errorlevel 1 (
    echo [build-web] installing rust target wasm32-unknown-emscripten ...
    rustup target add wasm32-unknown-emscripten
    if errorlevel 1 goto :fail
)

set "WEB_DIR=%SCRIPT_DIR%crates\tenebris-client\web"
REM Shared asset tree - the same tenebris-c/assets the C build
REM preloads, mounted at the same virtual path /assets so the config
REM loaders ("assets/config/*.yaml") and texture loads
REM ("assets/textures/*.png") resolve identically.
set "ASSETS_DIR=%SCRIPT_DIR%..\tenebris-c\assets"
if not exist "%ASSETS_DIR%" (
    echo [build-web] assets dir not found: %ASSETS_DIR%
    goto :fail
)

REM Link flags, 1:1 with tenebris-c/CMakeLists.txt EMCC_LINK_FLAGS.
REM (--shell-file is not used: cargo links to a .js, not a .html; the
REM shell page is copied verbatim into web-dist below instead.)
set "RUSTFLAGS=-C link-arg=-sUSE_WEBGL2=1 -C link-arg=-sFULL_ES3=1 -C link-arg=-sALLOW_MEMORY_GROWTH=1 -C link-arg=-sSTACK_SIZE=1mb -C link-arg=-sEXPORTED_RUNTIME_METHODS=ccall,cwrap,UTF8ToString,stringToUTF8,lengthBytesUTF8 -C link-arg=-sEXPORTED_FUNCTIONS=_main,_malloc,_free,_tenebris_js_pause_pressed,_tenebris_js_inventory_pressed,_tenebris_js_set_move_stick,_tenebris_js_set_look_stick,_tenebris_js_set_break,_tenebris_js_set_place,_tenebris_js_set_jump,_tenebris_js_input_char,_tenebris_js_input_backspace,_tenebris_js_input_submit,_tenebris_js_input_cancel,_tenebris_js_in_input_state,_net_client_saves_audit_cb,_net_client_body_blob_cb -C link-arg=-lwebsocket.js -C link-arg=--js-library=%WEB_DIR%\library_tenebris.js -C link-arg=--preload-file -C link-arg=%ASSETS_DIR%@/assets"

REM Override the workspace-level [env] SOKOL_BACKEND=GL pin (that one
REM is for the native desktop build); the web build is GLES3/WebGL2,
REM matching the C build's SOKOL_GLES3 define.
set "SOKOL_BACKEND=GLES3"

echo [build-web] cargo build (wasm32-unknown-emscripten, release) ...
cargo build -p tenebris-client --target wasm32-unknown-emscripten --release
if errorlevel 1 goto :fail

set "OUT=%SCRIPT_DIR%target\wasm32-unknown-emscripten\release"
set "DIST=%SCRIPT_DIR%web-dist"
if not exist "%DIST%" mkdir "%DIST%"

copy /y "%WEB_DIR%\shell.html" "%DIST%\index.html" >nul
copy /y "%OUT%\tenebris-client.js" "%DIST%\" >nul
if errorlevel 1 goto :fail
REM rustc keeps the wasm next to the .js; older toolchains emit the
REM underscore spelling - copy whichever exists.
if exist "%OUT%\tenebris-client.wasm" copy /y "%OUT%\tenebris-client.wasm" "%DIST%\" >nul
if exist "%OUT%\tenebris_client.wasm" copy /y "%OUT%\tenebris_client.wasm" "%DIST%\" >nul
REM --preload-file bundle. emcc emits it next to the deps-dir link
REM output as tenebris_client.data and the loader JS references that
REM basename - copy without renaming.
if exist "%OUT%\deps\tenebris_client.data" copy /y "%OUT%\deps\tenebris_client.data" "%DIST%\" >nul
if exist "%OUT%\tenebris_client.data" copy /y "%OUT%\tenebris_client.data" "%DIST%\" >nul
for %%f in ("%OUT%\deps\tenebris_client-*.data") do copy /y "%%f" "%DIST%\" >nul

echo [build-web] done. Serve with:  npx serve -l 3000 "%DIST%"
echo [build-web] then open http://localhost:3000/
popd
exit /b 0

:fail
popd
exit /b 1
