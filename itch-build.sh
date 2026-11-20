#!/bin/bash
# Build Tenebris for itch.io: a flat, relative-path HTML5 build zipped as
# tenebris-itch.zip. Upload it as an HTML5 game ("This file will be played
# in the browser"); index.html is at the zip root.
set -e

echo ""
echo "[1/2] Building with Vite (itch.io config)..."
npm run build:itch

echo ""
echo "[2/2] Creating tenebris-itch.zip..."
rm -f tenebris-itch.zip
(cd dist-itch && zip -qr ../tenebris-itch.zip .)

echo ""
echo "========================================"
echo "Build complete: tenebris-itch.zip ($(du -h tenebris-itch.zip | cut -f1))"
echo "========================================"
echo "Upload it to itch.io as an HTML5 game, or push with butler:"
echo "  butler push tenebris-itch.zip <user>/<game>:html5"
