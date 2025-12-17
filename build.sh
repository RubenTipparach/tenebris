#!/bin/bash

# Build script for Tenebris
# Usage: ./build.sh [option]
# Options:
#   dev     - Start development server
#   build   - Production build (default)
#   preview - Preview production build
#   deploy  - Build and deploy to heavy-photon-site

set -e

# Load configuration if it exists
if [ -f "build.config.sh" ]; then
    source build.config.sh
fi

# Default HEAVY_PHOTON_PATH to parent directory if not set
HEAVY_PHOTON_PATH="${HEAVY_PHOTON_PATH:-../heavy-photon-site}"

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
    ;;
  preview)
    echo "Previewing production build..."
    npm run preview
    ;;
  deploy)
    echo "Building Tenebris..."
    npm run build

    if [ $? -ne 0 ]; then
        echo "Build failed!"
        exit 1
    fi

    echo ""
    echo "Build complete! Output is in the 'dist' folder."
    echo ""

    # Deploy to heavy-photon-site
    if [ -d "$HEAVY_PHOTON_PATH" ]; then
        echo "Deploying to heavy-photon-site..."

        # Create directory if it doesn't exist
        mkdir -p "$HEAVY_PHOTON_PATH/docs/tenebris"

        # Copy entire dist folder contents to docs/tenebris
        cp -r dist/* "$HEAVY_PHOTON_PATH/docs/tenebris/"

        echo ""
        echo "Deployment complete!"
    else
        echo "Error: HEAVY_PHOTON_PATH not found at: $HEAVY_PHOTON_PATH"
        echo "Set HEAVY_PHOTON_PATH in build.config.sh or environment"
        exit 1
    fi
    ;;
  *)
    echo "Usage: ./build.sh [dev|build|preview|deploy]"
    exit 1
    ;;
esac
