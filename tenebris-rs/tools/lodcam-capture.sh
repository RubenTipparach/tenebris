#!/usr/bin/env bash
# lodcam-capture.sh - the RELIABLE way to screenshot the planet from orbit.
#
# Boots the tenebris-rs client with the LOD-camera dev hook
# (TENEBRIS_DEV_LODCAM), which parks the camera a fixed distance beyond the
# planet surface and aims it dead at the planet CENTRE every frame - solving
# yaw/pitch against the live camera basis so the full disk is always framed and
# you never end up staring at empty space. It grabs one PNG per distance, so you
# get a consistent A/B set for verifying from-orbit visual changes (atmosphere
# rim, terrain shading, LOD swap, cloud shell, etc).
#
# Two LOD tiers, two default sweeps:
#   - PRIMARY (near): 200 m increments, 200..1000 m - the detailed chunked
#     terrain + per-puff cloud shell.
#   - SECONDARY (far): 2 km increments, 2000..12000 m - the distant sphere LOD
#     and, past ~10 km, the translucent cloud-texture wrap around the planet.
#
# Usage:
#   tools/lodcam-capture.sh [OUT_DIR] [DISTANCES...]
#   tools/lodcam-capture.sh                       # both sweeps -> /tmp/lodcam
#   tools/lodcam-capture.sh out 400 3000 10000    # custom set
#
# Headless (CI / container): drives an Xvfb + llvmpipe display, same as the repo
# screenshot helpers. On a real desktop with $DISPLAY already set it reuses it.
#
# Requires: cargo (builds the debug client), ImageMagick `import`+`convert`,
# and - when headless - Xvfb + xdpyinfo.
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="${1:-/tmp/lodcam}"; shift || true
# Default: primary sweep at 200 m increments (near/detailed) then the secondary
# sweep at 2 km increments (far LOD + cloud shell). Pass explicit distances to
# override both.
DISTS=("$@")
[ ${#DISTS[@]} -eq 0 ] && DISTS=(200 400 600 800 1000 2000 4000 6000 8000 10000 12000)
BOOT="${LODCAM_BOOT_SECS:-90}"   # seconds to let worldgen + the full-disk remesh settle
mkdir -p "$OUT"

echo "[lodcam] building client..."
( cd "$ROOT" && cargo build -p tenebris-client ) || { echo "[lodcam] build failed"; exit 1; }
BIN="$ROOT/target/debug/tenebris-client"

# Bring up a headless display only if we don't already have one.
OWN_XVFB=0
if [ -z "${DISPLAY:-}" ]; then
    export DISPLAY=:88
    export LIBGL_ALWAYS_SOFTWARE=1 GALLIUM_DRIVER=llvmpipe
    pkill -9 Xvfb 2>/dev/null; rm -f /tmp/.X88-lock /tmp/.X11-unix/X88; sleep 1
    Xvfb :88 -screen 0 1280x800x24 >/tmp/lodcam-xvfb.log 2>&1 &
    OWN_XVFB=1
    for _ in $(seq 1 30); do xdpyinfo >/dev/null 2>&1 && break; sleep 0.5; done
    xdpyinfo >/dev/null 2>&1 || { echo "[lodcam] Xvfb failed to start"; exit 3; }
fi

for d in "${DISTS[@]}"; do
    echo "[lodcam] capturing at ${d} m from the surface..."
    ( cd "$ROOT" && env TENEBRIS_DEV_SP=1 TENEBRIS_DEV_LODCAM="$d" "$BIN" >/tmp/lodcam-client.log 2>&1 ) &
    CPID=$!
    sleep "$BOOT"
    WID=$(xwininfo -root -tree 2>/dev/null | grep -oE '0x[0-9a-f]+ "Tenebris' | head -1 | awk '{print $1}')
    OUTP="$OUT/lodcam_${d}m.png"
    import -window "${WID:-root}" "$OUTP" 2>/dev/null
    convert "$OUTP" -format "  -> %f  %wx%h colors=%k\n" info: 2>/dev/null
    kill "$CPID" 2>/dev/null; wait "$CPID" 2>/dev/null
done

[ "$OWN_XVFB" = 1 ] && pkill -9 Xvfb 2>/dev/null
echo "[lodcam] done -> $OUT"
