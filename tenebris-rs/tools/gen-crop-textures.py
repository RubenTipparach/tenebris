#!/usr/bin/env python3
"""Generate the crop texture atlas (assets/textures/crops.png).

Mirrors tools/gen-animal-textures.py: a horizontal strip of 32x32 RGBA
tiles, one material per column, sampled by the crop renderer's box faces
(client::crops) via real UVs so the procedural plant boxes are TEXTURED
rather than flat-shaded. Baked-asset path (CLAUDE.md static-asset
guidelines); stdlib + zlib only, deterministic.

Columns (see MAT_* in crops.rs):
  0 bark        1 apple-leaf   2 orange-leaf  3 melon-rind
  4 apple-fruit 5 orange-fruit 6 kiwi-fruit   7 vine-leaf
  8 berry       9 wheat       10 carrot-frond 11 carrot-root
 12 stem

Run from tenebris-rs/:  python tools/gen-crop-textures.py
"""

import os
import struct
import zlib

T = 32  # tile edge

_seed = [0x1234567]


def rnd():
    _seed[0] = (_seed[0] * 1103515245 + 12345) & 0x7FFFFFFF
    return _seed[0] / 0x7FFFFFFF


def grain(base, amt):
    n = int((rnd() - 0.5) * amt)
    return tuple(min(max(c + n, 0), 255) for c in base)


def fill(px, col, base, amt, alpha=255):
    for y in range(T):
        for x in range(T):
            r, g, b = grain(base, amt)
            i = ((y) * (T * NCOL) + col * T + x) * 4
            px[i], px[i + 1], px[i + 2], px[i + 3] = r, g, b, alpha


def bark(px, col):
    # Vertical brown grain with a few darker fissure columns.
    for y in range(T):
        for x in range(T):
            base = (96, 62, 34)
            if x % 7 in (0, 1):
                base = (72, 46, 24)
            r, g, b = grain(base, 20)
            i = (y * (T * NCOL) + col * T + x) * 4
            px[i], px[i + 1], px[i + 2], px[i + 3] = r, g, b, 255


def leaf(px, col, base):
    # Leafy: base green with scattered lighter/darker leaf flecks.
    for y in range(T):
        for x in range(T):
            c = base
            k = rnd()
            if k < 0.22:
                c = tuple(min(v + 34, 255) for v in base)
            elif k < 0.40:
                c = tuple(max(v - 28, 0) for v in base)
            r, g, b = grain(c, 12)
            i = (y * (T * NCOL) + col * T + x) * 4
            px[i], px[i + 1], px[i + 2], px[i + 3] = r, g, b, 255


def melon(px, col):
    # Watermelon rind: dark green with lighter vertical wavy stripes.
    for y in range(T):
        for x in range(T):
            wob = int(2.5 * __import__("math").sin(y * 0.6))
            band = ((x + wob) // 4) % 2
            base = (28, 92, 36) if band == 0 else (70, 150, 66)
            r, g, b = grain(base, 12)
            i = (y * (T * NCOL) + col * T + x) * 4
            px[i], px[i + 1], px[i + 2], px[i + 3] = r, g, b, 255


def berry_like(px, col, base, hi):
    # Round fruit: radial shading with a small specular highlight.
    cx, cy = T * 0.5, T * 0.42
    for y in range(T):
        for x in range(T):
            d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 / (T * 0.5)
            shade = max(0.55, 1.15 - d)
            c = tuple(min(int(v * shade), 255) for v in base)
            if (x - cx + 4) ** 2 + (y - cy + 4) ** 2 < 9:
                c = hi
            r, g, b = grain(c, 8)
            i = (y * (T * NCOL) + col * T + x) * 4
            px[i], px[i + 1], px[i + 2], px[i + 3] = r, g, b, 255


def wheat(px, col):
    # Golden vertical stalks with seed-head speckle up top.
    for y in range(T):
        for x in range(T):
            base = (196, 158, 60) if x % 3 else (150, 116, 40)
            if y < 10 and rnd() < 0.5:
                base = (214, 184, 96)
            r, g, b = grain(base, 16)
            i = (y * (T * NCOL) + col * T + x) * 4
            px[i], px[i + 1], px[i + 2], px[i + 3] = r, g, b, 255


NCOL = 13


def main():
    px = bytearray(T * (T * NCOL) * 4)
    bark(px, 0)
    leaf(px, 1, (40, 120, 46))   # apple leaves
    leaf(px, 2, (52, 128, 52))   # orange leaves
    melon(px, 3)
    berry_like(px, 4, (206, 40, 40), (255, 150, 150))   # apple fruit
    berry_like(px, 5, (240, 140, 30), (255, 210, 140))  # orange fruit
    berry_like(px, 6, (120, 82, 46), (170, 140, 100))   # kiwi fruit (fuzzy brown)
    leaf(px, 7, (46, 140, 54))   # vine leaf
    berry_like(px, 8, (200, 40, 56), (255, 150, 160))   # berry
    wheat(px, 9)
    leaf(px, 10, (44, 130, 44))  # carrot frond
    fill(px, 11, (216, 116, 36), 20)  # carrot root (orange)
    fill(px, 12, (74, 150, 54), 16)   # generic stem green

    raw = bytearray()
    stride = T * NCOL * 4
    for y in range(T):
        raw.append(0)
        raw.extend(px[y * stride:(y + 1) * stride])

    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", T * NCOL, T, 8, 6, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )
    out = os.path.join("assets", "textures", "crops.png")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "wb") as f:
        f.write(png)
    print("wrote", out, f"({T*NCOL}x{T}, {NCOL} tiles)")


if __name__ == "__main__":
    main()
