#!/usr/bin/env bash
# Stage the build-chooser landing page at dist/index.html.
# Runs after build + build:wasm so dist/js and dist/wasm already exist.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cp -f "$ROOT/web/landing/index.html" "$ROOT/dist/index.html"
echo "==> landing page staged at dist/index.html"
