#!/bin/bash

echo "========================================"
echo "Building Tenebris for itch.io"
echo "========================================"

set -e

# Run TypeScript compiler
echo ""
echo "[1/4] Compiling TypeScript..."
npx tsc

# Run Vite build with itch.io config
echo ""
echo "[2/4] Building with Vite (itch.io config)..."
npx vite build --config vite.config.itch.ts

# Remove old zip if exists
echo ""
echo "[3/4] Preparing zip file..."
rm -f tenebris-itch.zip

# Create zip file
echo ""
echo "[4/4] Creating tenebris-itch.zip..."
cd dist-itch && zip -r ../tenebris-itch.zip . && cd ..

echo ""
echo "========================================"
echo "Build complete!"
echo "========================================"
echo ""
echo "Output: tenebris-itch.zip"
echo ""
echo "Upload this zip file to itch.io"
echo "Make sure to set \"This file will be played in the browser\""
echo "and enable \"SharedArrayBuffer support\" if needed."
echo ""
