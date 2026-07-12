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
    # Four bold tilled rows across the 16 px tile - a 4 px period of
    # groove -> shadow -> crest -> mid so the ploughed ridges read at a
    # glance and farmland never gets mistaken for plain dirt. High
    # contrast between the dark grooves and the lit crests is what makes
    # it look "stripy"; the per-pixel grain stays low so the stripes
    # stay crisp.
    base = (94, 63, 39)     # mid soil (the ridge's shaded flank)
    groove = (52, 34, 20)   # deep recessed furrow bottom (darkest)
    shadow = (70, 46, 28)   # groove wall climbing back up
    crest = (128, 92, 60)   # raised, sunlit ridge top (brightest)
    band_color = [groove, shadow, crest, base]
    for y in range(S):
        c = band_color[y % 4]
        crest_row = (y % 4) == 2
        groove_row = (y % 4) == 0
        for x in range(S):
            # A little horizontal wobble so the furrows read hand-worked
            # rather than machine-perfect: nudge a few columns between the
            # crest and its neighbour bands.
            wob = int((rnd() - 0.5) * 2)
            cc = c
            if crest_row and rnd() < 0.18:
                cc = base   # a broken clod interrupting the ridge top
            elif groove_row and rnd() < 0.18:
                cc = shadow  # a bit of crumbled soil in the furrow
            n = int((rnd() - 0.5) * 12) + wob  # low grain keeps stripes crisp
            r = min(max(cc[0] + n, 0), 255)
            g = min(max(cc[1] + n, 0), 255)
            b = min(max(cc[2] + n, 0), 255)
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
