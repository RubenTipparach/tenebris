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

# Mirror runtime assets the C client expects. Done each build so the
# canonical copies in ../public/textures remain the single source of
# truth — tenebris-c/assets/ is a generated staging directory.
echo "==> staging assets from public/ into tenebris-c/assets/"
mkdir -p "$C_ROOT/assets/textures"
# Tier 1 block palette maps to the same PNGs used by the planet game. The
# original TS flat-world demo referenced wall/floor/ceiling names that
# don't exist in the repo, so we use the real asset set instead.
cp -f "$ROOT/public/textures/rocks.png"      "$C_ROOT/assets/textures/stone.png"
cp -f "$ROOT/public/textures/dirt.png"       "$C_ROOT/assets/textures/dirt.png"
cp -f "$ROOT/public/textures/grass.png"      "$C_ROOT/assets/textures/grass_top.png"
cp -f "$ROOT/public/textures/dirt_grass.png" "$C_ROOT/assets/textures/grass_side.png"

echo "==> configuring (cmake --preset=web)"
cmake --preset=web -S "$C_ROOT"

echo "==> building"
cmake --build "$C_ROOT/build-web"

echo "==> copying artifacts to $OUT"
mkdir -p "$OUT"
cp -f "$C_ROOT/build-web/tenebris.html" "$OUT/index.html"
cp -f "$C_ROOT/build-web/tenebris.js"   "$OUT/tenebris.js"
cp -f "$C_ROOT/build-web/tenebris.wasm" "$OUT/tenebris.wasm"
# Preloaded asset bundle produced by emcc --preload-file. Required at
# runtime — the HTML loader fetches it before calling main.
if [ -f "$C_ROOT/build-web/tenebris.data" ]; then
  cp -f "$C_ROOT/build-web/tenebris.data" "$OUT/tenebris.data"
fi

echo "==> done"
