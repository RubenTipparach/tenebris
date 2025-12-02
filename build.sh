#!/bin/bash

# Build script for Tenebris
# Usage: ./build.sh [option]
# Options:
#   dev     - Start development server
#   build   - Production build
#   preview - Preview production build

set -e

case "${1:-build}" in
  dev)
    echo "Starting development server..."
    npm run dev
    ;;
  build)
    echo "Building for production..."
    npm run build
    echo "Build complete! Output in ./dist/"
    ;;
  preview)
    echo "Previewing production build..."
    npm run preview
    ;;
  *)
    echo "Usage: ./build.sh [dev|build|preview]"
    exit 1
    ;;
esac
