#!/usr/bin/env bash
# Stage the build-chooser landing page at dist/index.html, plus the
# operator dashboard at dist/dashboard/index.html.
# Runs after build + build:wasm so dist/js and dist/wasm already exist.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cp -f "$ROOT/web/landing/index.html" "$ROOT/dist/index.html"
echo "==> landing page staged at dist/index.html"

mkdir -p "$ROOT/dist/dashboard"
cp -f "$ROOT/web/dashboard/index.html" "$ROOT/dist/dashboard/index.html"
echo "==> dashboard staged at dist/dashboard/index.html"
