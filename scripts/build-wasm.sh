#!/usr/bin/env bash
# Build the C/WASM client and drop its output into dist/wasm/.
# Requires Emscripten activated in the current shell (EMSDK env var set).
#
# ARCHIVE-ONLY - NOT part of `npm run build:all` and NOT run in CI.
# tenebris-c/ is a frozen archive (see CLAUDE.md); the live target is the
# native Rust client in tenebris-rs/. This script is kept so the archive
# stays buildable by hand for reference. Known breakage: the
# TENEBRIS_WEBGPU=ON path fails at link ("emdawnwebgpu requires C++" -
# needs em++ / -sDEFAULT_TO_CXX) and is not being fixed.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
C_ROOT="$ROOT/tenebris-c"
OUT="$ROOT/dist/wasm"

if [ -z "${EMSDK:-}" ]; then
  echo "warning: EMSDK is not set. Emscripten may not be on PATH." >&2
  echo "         Activate with:  source \$EMSDK_DIR/emsdk_env.sh"     >&2
fi

# Vendor deps on first run, OR whenever any required tool is missing.
# fetch-deps.sh is idempotent — cheap to skip-call when nothing needs
# updating, but we have to invoke it whenever the sokol headers OR the
# sokol-shdc binary are missing.
if [ ! -d "$C_ROOT/third_party/sokol" ] \
   || [ ! -x "$C_ROOT/third_party/sokol-tools-bin/sokol-shdc" ]; then
  echo "==> fetching third-party headers + tools"
  "$C_ROOT/scripts/fetch-deps.sh"
fi

# Mirror runtime assets the C client expects. Done each build so the
# canonical copies in ../public/textures remain the single source of
# truth — tenebris-c/assets/ is a generated staging directory.
echo "==> staging assets from public/ into tenebris-c/assets/"
mkdir -p "$C_ROOT/assets/textures"
mkdir -p "$C_ROOT/assets/textures/planet_seq"
# Tier 1 atlas: one 16x16 tile per block type, single-row strip. Filenames
# must match the paths hard-coded in renderer.c's bake_atlas block.
for f in water sand dirt grass rocks ice snow dirt_grass dirt_snow torch moon wood; do
  src="$ROOT/public/textures/${f}.png"
  if [ -f "$src" ]; then
    cp -f "$src" "$C_ROOT/assets/textures/${f}.png"
  else
    echo "warning: $src missing — atlas tile will be empty" >&2
  fi
done
# Sequoia tileset variants — columns 12-17 in the atlas.
for f in planet_seq_grass planet_seq_dirt planet_seq_grass_dirt planet_seq_sand planet_seq_snow planet_seq_snow_dirt; do
  src="$ROOT/public/textures/planet_seq/${f}.png"
  if [ -f "$src" ]; then
    cp -f "$src" "$C_ROOT/assets/textures/planet_seq/${f}.png"
  else
    echo "warning: $src missing — Sequoia tile will be empty" >&2
  fi
done

# Backend select (see tenebris-c/plan-webgpu-compute.md). Default is the
# shipping WebGL2 path. Set TENEBRIS_WEBGPU=ON to build the experimental
# WebGPU path (SOKOL_WGPU + WGSL + emdawnwebgpu) instead - needs an
# Emscripten new enough for the emdawnwebgpu port (newer than the 3.1.64
# the WebGL2 deploy build pins). The flag is passed on top of the preset;
# a reconfigure regenerates the sokol-shdc headers for the chosen slang,
# so reusing build-web across backends is safe.
WEBGPU="${TENEBRIS_WEBGPU:-OFF}"
if [ "$WEBGPU" = "ON" ]; then
  echo "==> backend: WebGPU (SOKOL_WGPU + WGSL + emdawnwebgpu)"
else
  echo "==> backend: WebGL2 (SOKOL_GLES3)"
fi

echo "==> configuring (cmake --preset=web, TENEBRIS_WEBGPU=$WEBGPU)"
cmake --preset=web -S "$C_ROOT" -DTENEBRIS_WEBGPU="$WEBGPU"

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
