#!/usr/bin/env sh
# Build the WASM (Emscripten) Tenebris Rust client - POSIX twin of
# build-web.bat (CI / Linux / macOS). See that file for the full
# commentary; flags mirror tenebris-c/CMakeLists.txt EMCC_LINK_FLAGS.
#
# Requirements:
#   * emsdk - either already activated (emcc on PATH) or the EMSDK env
#     var pointing at the install (this script sources emsdk_env.sh).
#   * rust target: rustup target add wasm32-unknown-emscripten
#     (auto-installed below if rustup is available).
#
# Output: web-dist/index.html (+ tenebris-client.js / .wasm / .data).

set -e

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR"

if ! command -v emcc >/dev/null 2>&1; then
    if [ -z "$EMSDK" ]; then
        echo "[build-web] emcc not on PATH and EMSDK not set. Activate emsdk first:"
        echo "             . path/to/emsdk/emsdk_env.sh"
        exit 1
    fi
    echo "[build-web] activating emsdk from $EMSDK ..."
    # shellcheck disable=SC1091
    . "$EMSDK/emsdk_env.sh"
fi
emcc --version | head -1

if command -v rustup >/dev/null 2>&1; then
    if ! rustup target list --installed | grep -q wasm32-unknown-emscripten; then
        echo "[build-web] installing rust target wasm32-unknown-emscripten ..."
        rustup target add wasm32-unknown-emscripten
    fi
fi

WEB_DIR="$SCRIPT_DIR/crates/tenebris-client/web"
# Shared asset tree - the same tenebris-c/assets the C build preloads,
# mounted at the same virtual path /assets so the config loaders
# ("assets/config/*.yaml") and texture loads resolve identically.
ASSETS_DIR="$SCRIPT_DIR/../tenebris-c/assets"
[ -d "$ASSETS_DIR" ] || { echo "[build-web] assets dir not found: $ASSETS_DIR"; exit 1; }

EXPORTS="_main,_malloc,_free,_tenebris_js_pause_pressed,_tenebris_js_set_move_stick,_tenebris_js_set_look_stick,_tenebris_js_set_break,_tenebris_js_set_place,_tenebris_js_set_jump,_tenebris_js_input_char,_tenebris_js_input_backspace,_tenebris_js_input_submit,_tenebris_js_input_cancel,_tenebris_js_in_input_state,_net_client_saves_audit_cb,_net_client_body_blob_cb"

RUSTFLAGS="\
 -C link-arg=-sUSE_WEBGL2=1\
 -C link-arg=-sFULL_ES3=1\
 -C link-arg=-sALLOW_MEMORY_GROWTH=1\
 -C link-arg=-sSTACK_SIZE=1mb\
 -C link-arg=-sEXPORTED_RUNTIME_METHODS=ccall,cwrap,UTF8ToString,stringToUTF8,lengthBytesUTF8\
 -C link-arg=-sEXPORTED_FUNCTIONS=$EXPORTS\
 -C link-arg=-lwebsocket.js\
 -C link-arg=--js-library=$WEB_DIR/library_tenebris.js\
 -C link-arg=--preload-file\
 -C link-arg=$ASSETS_DIR@/assets"
export RUSTFLAGS

# Override the workspace-level [env] SOKOL_BACKEND=GL pin (native
# desktop only); the web build is GLES3/WebGL2, matching the C build's
# SOKOL_GLES3 define.
export SOKOL_BACKEND=GLES3

echo "[build-web] cargo build (wasm32-unknown-emscripten, release) ..."
cargo build -p tenebris-client --target wasm32-unknown-emscripten --release

OUT="$SCRIPT_DIR/target/wasm32-unknown-emscripten/release"
DIST="$SCRIPT_DIR/web-dist"
mkdir -p "$DIST"

cp "$WEB_DIR/shell.html" "$DIST/index.html"
cp "$OUT/tenebris-client.js" "$DIST/"
# rustc keeps the wasm next to the .js; older toolchains emit the
# underscore spelling - copy whichever exists.
[ -f "$OUT/tenebris-client.wasm" ] && cp "$OUT/tenebris-client.wasm" "$DIST/"
[ -f "$OUT/tenebris_client.wasm" ] && cp "$OUT/tenebris_client.wasm" "$DIST/"
# --preload-file bundle: emcc emits it next to the deps-dir link
# output as tenebris_client.data and the loader references that
# basename - copy without renaming.
[ -f "$OUT/deps/tenebris_client.data" ] && cp "$OUT/deps/tenebris_client.data" "$DIST/"
[ -f "$OUT/tenebris_client.data" ] && cp "$OUT/tenebris_client.data" "$DIST/"
for f in "$OUT"/deps/tenebris_client-*.data; do
    [ -f "$f" ] && cp "$f" "$DIST/"
done

echo "[build-web] done. Serve with:  npx serve -l 3000 \"$DIST\""
echo "[build-web] then open http://localhost:3000/"
