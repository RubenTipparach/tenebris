#!/usr/bin/env python3
"""Generate an animated flame flip-book sprite sheet for the bonfire.

Baked-asset path (CLAUDE.md "Static game asset guidelines"): writes a
deterministic RGBA PNG under assets/textures/. The sheet is a horizontal
strip of FRAMES cells, each CELL x CELL px; the bonfire draws a
camera-facing billboard and cycles cells over time for a licking flame.
Emissive colours (orange base -> yellow -> near-white core) with a soft
alpha edge so it composites additively. Stdlib + zlib only; fully
deterministic (sine-based flicker, no RNG).

Run from tenebris-rs/:  python tools/gen-flame-flipbook.py
"""

import math
import os
import struct
import zlib

FRAMES = 6
CELL = 32  # per-frame square

# Flame colour ramp by "heat" t in [0,1]: cool orange -> yellow -> white core.
def heat_color(t):
    t = max(0.0, min(1.0, t))
    if t < 0.5:
        k = t / 0.5
        r = 215 + int(40 * k)   # deep orange -> orange
        g = 55 + int(120 * k)
        b = 15 + int(25 * k)
    else:
        k = (t - 0.5) / 0.5
        r = 255
        g = 175 + int(55 * k)   # orange -> warm yellow (no white blowout)
        b = 40 + int(70 * k)
    return (r, g, b)


def build_frame(fi):
    """Return CELL*CELL list of (r,g,b,a)."""
    px = [(0, 0, 0, 0)] * (CELL * CELL)
    ph = fi / FRAMES * math.tau
    for y in range(CELL):
        # v: 0 at top, 1 at bottom of the cell. Flame rises, so height above
        # the base hb in [0,1] with 0 at the base (bottom).
        hb = 1.0 - (y / (CELL - 1))
        # Tongue height varies per frame (the tip licks up and down).
        tip = 0.86 + 0.12 * math.sin(ph * 1.0)
        if hb > tip:
            continue
        # Half-width narrows toward the tip; a little bulge low down.
        base_w = 0.42 * (1.0 - (hb / tip) ** 1.4) + 0.05
        # Per-frame side-to-side wobble, stronger higher up.
        wob = 0.10 * math.sin(hb * 6.0 + ph * 2.0) * hb
        cx = 0.5 + wob
        for x in range(CELL):
            u = x / (CELL - 1)
            dx = abs(u - cx)
            if dx > base_w:
                continue
            # edge factor: 1 at centre column, 0 at the flame edge.
            edge = 1.0 - dx / base_w
            # heat: hotter (whiter) low + centre, cooler (orange) high + edge.
            heat = edge * (1.0 - hb * 0.7)
            r, g, b = heat_color(heat)
            # Alpha: solid core, soft edges + fade near the tip.
            a = min(1.0, edge * 1.6) * min(1.0, (tip - hb) * 3.0 + 0.2)
            a = max(0.0, min(1.0, a))
            px[y * CELL + x] = (r, g, b, int(a * 255))
    return px


def write_png(path, w, h, pixels):
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        for x in range(w):
            raw.extend(pixels[y * w + x])

    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as f:
        f.write(png)


def main():
    w = CELL * FRAMES
    h = CELL
    sheet = [(0, 0, 0, 0)] * (w * h)
    for fi in range(FRAMES):
        frame = build_frame(fi)
        for y in range(CELL):
            for x in range(CELL):
                sheet[y * w + fi * CELL + x] = frame[y * CELL + x]
    out_dir = os.path.join("assets", "textures")
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, "flame_flipbook.png")
    write_png(path, w, h, sheet)
    print(f"wrote {path} ({w}x{h}, {FRAMES} frames)")


if __name__ == "__main__":
    main()
