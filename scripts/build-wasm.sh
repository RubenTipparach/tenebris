#!/usr/bin/env bash
# Build the WASM client and drop its output into dist/wasm/.
# Requires Emscripten activated in the current shell (EMSDK env var set).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
C_ROOT="$ROOT/tenebris-c"
OUT="$ROOT/dist/wasm"

if [ -z "${EMSDK:-}" ]; then
  echo "warning: EMSDK is not set. Emscripten may not be on PATH." >&2
  echo "         Activate with:  source \$EMSDK_DIR/emsdk_env.sh"     >&2
fi

# Vendor deps on first run.
if [ ! -d "$C_ROOT/third_party/sokol" ]; then
  echo "==> fetching third-party headers"
  "$C_ROOT/scripts/fetch-deps.sh"
fi

echo "==> configuring (cmake --preset=web)"
cmake --preset=web -S "$C_ROOT"

echo "==> building"
cmake --build "$C_ROOT/build-web"

echo "==> copying artifacts to $OUT"
mkdir -p "$OUT"
cp -f "$C_ROOT/build-web/tenebris.html" "$OUT/index.html"
cp -f "$C_ROOT/build-web/tenebris.js"   "$OUT/tenebris.js"
cp -f "$C_ROOT/build-web/tenebris.wasm" "$OUT/tenebris.wasm"
if [ -d "$C_ROOT/build-web/assets" ]; then
  rm -rf "$OUT/assets"
  cp -r "$C_ROOT/build-web/assets" "$OUT/assets"
fi

echo "==> done"
