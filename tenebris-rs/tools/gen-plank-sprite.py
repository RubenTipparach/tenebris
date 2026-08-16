#!/usr/bin/env python3
"""Generate the wood-plank item sprite.

Baked-asset path (see CLAUDE.md "Static game asset guidelines"): writes a
deterministic 16x16 RGBA PNG under assets/textures/items/, the source of
truth for the PLANK item icon ui_icons samples. Previously PLANK pointed at
assets/textures/wood.png (the log/wood BLOCK face texture) as a stand-in,
so the inventory showed a copy of the log block instead of a distinct
planks icon - this gives it its own art: two stacked sawn boards with
visible end-grain and long-grain, not a log. Hand-authored pixel bitmap
below; stdlib + zlib only.

Run from tenebris-rs/:  python tools/gen-plank-sprite.py
"""

import os
import struct
import zlib

# Palette. '.' = transparent.
PAL = {
    ".": (0, 0, 0, 0),
    "D": (92, 60, 34, 255),    # outline / shadow seam
    "P": (150, 106, 62, 255),  # plank face, main
    "p": (191, 145, 92, 255),  # plank face, highlight streak
    "g": (120, 84, 48, 255),   # long-grain fleck
    "E": (214, 173, 122, 255), # end-grain face (sawn end, lighter)
    "e": (140, 100, 60, 255),  # end-grain ring line
}

# Two sawn boards stacked with a slight offset, each showing a lighter
# end-grain face on the left (where it was cut) and long-grain streaks
# running the length of the board - reads as "planks", not a log or a
# generic block texture.
PLANK = [
    "................",
    "................",
    ".DDDDDDDDDDDDDD.",
    ".EpPPPPpPPgPPPD.",
    ".EePPgPPPPPPpPD.",
    ".EPPPpPPgPPPPPD.",
    ".EePPPPPpPPgPPD.",
    ".DDDDDDDDDDDDDD.",
    "................",
    "..DDDDDDDDDDDDDD",
    "..EpPPgPPPPpPPPD",
    "..EePPPPpPPgPPPD",
    "..EPPPpPPPPPPgPD",
    "..DDDDDDDDDDDDDD",
    "................",
    "................",
]


def write_png(path, rows):
    h = len(rows)
    w = len(rows[0])
    raw = bytearray()
    for r in rows:
        raw.append(0)  # filter type 0 (none)
        for ch in r:
            raw.extend(PAL[ch])

    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)  # 8-bit RGBA
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as f:
        f.write(png)


def main():
    assert all(len(r) == 16 for r in PLANK) and len(PLANK) == 16
    out_dir = os.path.join("assets", "textures", "items")
    os.makedirs(out_dir, exist_ok=True)
    path = os.path.join(out_dir, "plank.png")
    write_png(path, PLANK)
    print("wrote", path)


if __name__ == "__main__":
    main()
