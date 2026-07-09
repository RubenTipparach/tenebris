#!/usr/bin/env python3
"""Generate the tilled-soil (farmland) terrain texture.

Baked-asset path (CLAUDE.md static-asset guidelines): a deterministic
16x16 RGBA PNG under assets/textures/, sampled by the terrain atlas as
the top face of Block::Farmland (dirt worked with a hoe). Dark, damp
dirt with horizontal furrow rows so tilled ground reads distinctly from
plain dirt. stdlib + zlib only.

Run from tenebris-rs/:  python tools/gen-farmland-texture.py
"""

import os
import struct
import zlib

S = 16

# Deterministic value noise via a fixed-seed LCG (no Math.random - the
# texture must be byte-identical every run).
_seed = [0x0F1E2D3C]


def rnd():
    _seed[0] = (_seed[0] * 1103515245 + 12345) & 0x7FFFFFFF
    return _seed[0] / 0x7FFFFFFF


def main():
    px = bytearray(S * S * 4)
    # Base damp-earth brown, a touch darker than dirt.png.
    base = (92, 62, 38)
    furrow = (66, 43, 26)   # the recessed grooves between ridges
    ridge = (110, 76, 48)   # the raised, lit crest of each ridge
    for y in range(S):
        # Four furrow rows: every 4th pixel row is a dark groove, the row
        # above it a lit ridge crest, the rest base soil.
        band = y % 4
        for x in range(S):
            if band == 0:
                c = furrow
            elif band == 1:
                c = ridge
            else:
                c = base
            n = int((rnd() - 0.5) * 22)  # per-pixel grain
            r = min(max(c[0] + n, 0), 255)
            g = min(max(c[1] + n, 0), 255)
            b = min(max(c[2] + n, 0), 255)
            i = (y * S + x) * 4
            px[i], px[i + 1], px[i + 2], px[i + 3] = r, g, b, 255

    raw = bytearray()
    for y in range(S):
        raw.append(0)
        raw.extend(px[y * S * 4 : (y + 1) * S * 4])

    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", S, S, 8, 6, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )
    out = os.path.join("assets", "textures", "farmland.png")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "wb") as f:
        f.write(png)
    print("wrote", out)


if __name__ == "__main__":
    main()
