#!/bin/bash

# Host script for Tenebris - exposes dev server to local network
# Usage: ./host.sh

set -e

# Get local IP
LOCAL_IP=$(ifconfig | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1)

echo "Starting Tenebris dev server..."
echo ""
echo "Access from your phone at:"
echo "  http://${LOCAL_IP}:3000/"
echo ""
echo "(Make sure your phone is on the same WiFi network)"
echo ""

npm run dev -- --host
