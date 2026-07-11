#!/usr/bin/env python3
"""Generate survival-gathering item sprites: flint and charcoal.

Baked-asset path (see CLAUDE.md "Static game asset guidelines"): writes
deterministic 16x16 RGBA PNGs under assets/textures/items/, the source of
truth for the icons the crafting + inventory UI sample via ui_icons.
Hand-authored pixel bitmaps; stdlib + zlib only.

Run from tenebris-rs/:  python tools/gen-survival-sprites.py
"""

import os
import struct
import zlib

PAL = {
    ".": (0, 0, 0, 0),
    # flint - chipped grey-tan stone shard with a sharp facet
    "F": (118, 112, 100, 255),  # flint main
    "f": (158, 150, 134, 255),  # facet highlight
    "g": (78, 74, 66, 255),     # flint shadow
    "e": (54, 50, 44, 255),     # dark edge
    # charcoal - matte black chunk with a faint grey glint
    "C": (44, 42, 44, 255),     # charcoal main
    "c": (72, 70, 74, 255),     # charcoal highlight
    "k": (24, 22, 24, 255),     # charcoal shadow
    "r": (120, 60, 30, 255),    # faint ember tint on an edge
}

# Flint: an angular knapped shard, sharp point upper-right.
FLINT = [
    "................",
    ".........ff.....",
    "........fFfe....",
    ".......fFFFge...",
    "......fFFFFge...",
    ".....fFFFFFge...",
    "....fFFFFFFge...",
    "...fFFFFFFFg....",
    "...eFFFFFFg.....",
    "....eFFFFg......",
    ".....eFFg.......",
    "......eFg.......",
    ".......eg.......",
    "........e.......",
    "................",
    "................",
]

# Charcoal: a rounded lump of charred wood.
CHARCOAL = [
    "................",
    "................",
    ".....kkkk.......",
    "...kkCCCCkk.....",
    "..kCCcCCCCk.....",
    "..kCCCCcCCCk....",
    ".kCCcCCCCCCk....",
    ".kCCCCCCcCCk....",
    ".kCcCCCCCCCk....",
    ".kCCCCCcCCrk....",
    "..kCCcCCCCk.....",
    "..kkCCCCkkk.....",
    "....kkkk........",
    "................",
    "................",
    "................",
]

SPRITES = {
    "flint": FLINT,
    "charcoal": CHARCOAL,
}


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
    out_dir = os.path.join("assets", "textures", "items")
    os.makedirs(out_dir, exist_ok=True)
    for name, rows in SPRITES.items():
        assert all(len(r) == 16 for r in rows) and len(rows) == 16, name
        path = os.path.join(out_dir, name + ".png")
        write_png(path, rows)
        print("wrote", path)


if __name__ == "__main__":
    main()
