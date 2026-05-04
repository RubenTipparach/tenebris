#!/usr/bin/env bash
# Vendor third-party single-header libraries + sokol-shdc binary into
# third_party/. Idempotent — safe to run repeatedly. build-wasm.sh
# invokes this whenever a required dep is missing.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
mkdir -p "$ROOT/third_party"
cd "$ROOT/third_party"

SOKOL_COMMIT="master"
STB_COMMIT="master"
HMM_COMMIT="master"

fetch() {
  local name="$1" repo="$2" ref="$3"; shift 3
  if [ -d "$name/.git" ]; then
    echo "==> updating $name"
    git -C "$name" fetch --depth=1 origin "$ref"
    git -C "$name" checkout --quiet FETCH_HEAD
  else
    echo "==> cloning $name"
    rm -rf "$name"
    git clone --depth=1 --branch "$ref" "$repo" "$name"
  fi
}

fetch sokol        https://github.com/floooh/sokol.git        "$SOKOL_COMMIT"
fetch stb          https://github.com/nothings/stb.git        "$STB_COMMIT"
fetch HandmadeMath https://github.com/HandmadeMath/HandmadeMath.git "$HMM_COMMIT"

# sokol-shdc — shader cross-compiler. Authored by floooh alongside
# sokol_gfx; consumes a single .glsl source per program and emits
# GLSL/HLSL/MSL/WGSL plus the matching C header with sg_shader_desc
# reflection. Means we don't hand-write `glsl_uniforms[]` tables or
# do offset-math on uniform blocks ourselves. Only downloads the
# binary for the current host platform.
fetch_sokol_shdc() {
  local platform ext url
  case "$(uname -s)" in
    Linux*)  platform="linux";    ext="" ;;
    Darwin*)
      if [ "$(uname -m)" = "arm64" ]; then platform="osx_arm64"; else platform="osx"; fi
      ext=""
      ;;
    MINGW*|MSYS*|CYGWIN*) platform="win32"; ext=".exe" ;;
    *) echo "warning: unknown host OS $(uname -s); skipping sokol-shdc fetch" >&2; return ;;
  esac

  mkdir -p sokol-tools-bin
  local out="sokol-tools-bin/sokol-shdc${ext}"
  if [ -x "$out" ]; then
    echo "==> sokol-shdc already present at third_party/${out}"
    return
  fi

  url="https://github.com/floooh/sokol-tools-bin/raw/master/bin/${platform}/sokol-shdc${ext}"
  echo "==> downloading sokol-shdc from ${url}"
  curl -fsSL -o "$out" "$url"
  chmod +x "$out"
}

fetch_sokol_shdc

echo
echo "Done. Headers + tools available under third_party/{sokol,stb,HandmadeMath,sokol-tools-bin}/."
