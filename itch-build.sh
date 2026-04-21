#!/bin/bash
#
# DISABLED during WASM port. Re-enable once the WASM preview reaches
# Tier 2+ (save/load working) so we can ship a combined itch build
# that includes both the JS and WASM variants. For now the vite config
# + build pipeline targets GitHub Pages only.
#
echo "itch build is disabled during the Sokol/WASM port - see conversion.md Tier 1."
exit 0

# --- original script preserved below ----------------------------------
# set -e
#
# echo ""
# echo "[1/4] Compiling TypeScript..."
# npx tsc
#
# echo ""
# echo "[2/4] Building with Vite (itch.io config)..."
# npx vite build --config vite.config.itch.ts
#
# echo ""
# echo "[3/4] Preparing zip file..."
# rm -f tenebris-itch.zip
#
# echo ""
# echo "[4/4] Creating tenebris-itch.zip..."
# cd dist-itch && zip -r ../tenebris-itch.zip . && cd ..
#
# echo ""
# echo "========================================"
# echo "Build complete!"
# echo "========================================"
# echo ""
# echo "Output: tenebris-itch.zip"
# echo ""
# echo "Upload this zip file to itch.io"
# echo "Make sure to set \"This file will be played in the browser\""
# echo "and enable \"SharedArrayBuffer support\" if needed."
# echo ""
