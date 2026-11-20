#!/bin/bash

# Build script for Tenebris (the JS / Three.js client)
# Usage: ./build.sh [option]
# Options:
#   dev     - Start development server
#   build   - Production build into dist/ (default)
#   preview - Preview production build
#   deploy  - Build for heavyphoton.com (/tenebris/) and copy it into the
#             heavyphoton.github.io checkout's docs/tenebris/
#   itch    - Build the itch.io zip (same as ./itch-build.sh)

set -e

# Load configuration if it exists
if [ -f "build.config.sh" ]; then
    source build.config.sh
fi

# Find the heavyphoton.github.io checkout: the configured path, else a
# sibling directory under either of its usual names.
if [ -z "$HEAVY_PHOTON_PATH" ] || [ ! -d "$HEAVY_PHOTON_PATH" ]; then
    for candidate in ../heavyphoton.github.io ../heavy-photon-site ../heavyphoton; do
        if [ -d "$candidate/docs" ]; then
            HEAVY_PHOTON_PATH="$candidate"
            break
        fi
    done
fi

case "${1:-build}" in
  dev)
    echo "Starting development server..."
    npm run dev
    ;;
  build)
    echo "Building Tenebris..."
    npm run build
    echo ""
    echo "Build complete! Output is in the 'dist' folder."
    echo "Run './build.sh deploy' to publish it to heavyphoton.com."
    ;;
  preview)
    echo "Previewing production build..."
    npm run preview
    ;;
  deploy)
    if [ -z "$HEAVY_PHOTON_PATH" ] || [ ! -d "$HEAVY_PHOTON_PATH/docs" ]; then
        echo "Error: heavyphoton.github.io checkout not found (HEAVY_PHOTON_PATH='$HEAVY_PHOTON_PATH')"
        echo "Set HEAVY_PHOTON_PATH in build.config.sh or the environment"
        exit 1
    fi

    echo "Building Tenebris for heavyphoton.com/tenebris/..."
    npm run build:site

    DEST="$HEAVY_PHOTON_PATH/docs/tenebris"
    echo ""
    echo "Deploying to $DEST ..."
    mkdir -p "$DEST"
    # Old hashed bundles would pile up forever - replace the assets folder.
    rm -rf "$DEST/assets"
    cp -r dist-site/* "$DEST/"

    echo ""
    echo "Deployment complete! Commit docs/tenebris in $HEAVY_PHOTON_PATH."
    ;;
  itch)
    ./itch-build.sh
    ;;
  *)
    echo "Usage: ./build.sh [dev|build|preview|deploy|itch]"
    exit 1
    ;;
esac
