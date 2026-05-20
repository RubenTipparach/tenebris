#!/usr/bin/env python3
"""
Bake a small pixel-art arrow texture used by the water-flow debug
overlay. Each per-voxel water cell with a non-zero
world_water_flow_direction renders one of these quads on top of its
cap, rotated so the arrow points along the flow direction.

Output: tenebris-c/assets/textures/water_flow_arrow.png

Layout:
  - 32x32 RGBA8.
  - Arrow points in the +U (rightward) direction by default; the
    renderer rotates the quad in world space to align +U with the
    cell's flow vector.
  - Bright cyan fill with a dark navy outline for legibility against
    a blue water surface.
  - Background fully transparent so the unblended pixels of the quad
    don't paint a square halo over the water.

Run from the repo root: `python3 tenebris-c/tools/gen-water-flow-arrow.py`.
Deterministic; stdlib + zlib only (matches the gen-water-normal.py
pattern).
"""

import os
import struct
import zlib

SIZE = 32

# RGBA8 colours.
TRANSPARENT = (0, 0, 0, 0)
OUTLINE     = (10, 30, 60, 255)     # dark navy, ~25% luma vs water
FILL        = (180, 240, 255, 255)  # pale cyan-white, pops on blue


def write_png(path, w, h, pix_rgba):
    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    raw = bytearray()
    stride = w * 4
    for y in range(h):
        raw.append(0)
        raw.extend(pix_rgba[y * stride : (y + 1) * stride])
    idat = zlib.compress(bytes(raw), 9)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(sig)
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", idat))
        f.write(chunk(b"IEND", b""))


def main():
    # Build the arrow as a per-pixel test, then thicken the outline by
    # comparing to neighbours. The arrow points +U (rightward).
    #
    # Geometry (in 32x32):
    #   - Shaft: a horizontal bar from x=4..x=20, centred on y=16, half-
    #     height 3 (so y in 13..19).
    #   - Head: a filled triangle whose tip is at (28, 16) and whose
    #     base spans (20, 8)..(20, 24). Triangle is defined by
    #     |y - 16| <= (28 - x) for x in 20..28.
    fill_mask = [[False] * SIZE for _ in range(SIZE)]
    for y in range(SIZE):
        for x in range(SIZE):
            in_shaft = (4 <= x <= 20) and (13 <= y <= 19)
            head_x   = x - 20
            in_head  = (0 <= head_x <= 8) and (abs(y - 16) <= (8 - head_x))
            fill_mask[y][x] = in_shaft or in_head

    # Outline = any background pixel adjacent (8-neighbour) to a fill
    # pixel. Gives a 1-px dark border that reads cleanly at 32x32.
    def is_fill(x, y):
        if 0 <= x < SIZE and 0 <= y < SIZE:
            return fill_mask[y][x]
        return False

    pix = bytearray()
    for y in range(SIZE):
        for x in range(SIZE):
            if fill_mask[y][x]:
                colour = FILL
            else:
                near = any(
                    is_fill(x + dx, y + dy)
                    for dy in (-1, 0, 1) for dx in (-1, 0, 1)
                    if (dx, dy) != (0, 0)
                )
                colour = OUTLINE if near else TRANSPARENT
            pix += bytes(colour)

    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.normpath(os.path.join(here, "..", "assets", "textures",
                                          "water_flow_arrow.png"))
    write_png(out, SIZE, SIZE, bytes(pix))
    print(f"wrote {out} ({SIZE}x{SIZE} RGBA, {len(pix)} bytes raw)")


if __name__ == "__main__":
    main()
