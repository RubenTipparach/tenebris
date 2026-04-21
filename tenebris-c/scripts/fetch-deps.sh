#!/usr/bin/env bash
# Vendor third-party single-header libraries into third_party/.
# Run once after clone, and whenever you bump dependency versions.
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

echo
echo "Done. Headers available under third_party/{sokol,stb,HandmadeMath}/."
