#!/usr/bin/env python3
"""Generate food item sprites (raw + cooked meat).

Baked-asset path (CLAUDE.md static-asset guidelines): deterministic 16x16
RGBA PNGs under assets/textures/items/, sampled by ui_icons. stdlib+zlib.
Run from tenebris-rs/:  python tools/gen-food-sprites.py
"""

import os
import struct
import zlib

PAL = {
    ".": (0, 0, 0, 0),
    # raw meat
    "r": (150, 32, 32, 255),   # dark red edge
    "R": (196, 58, 58, 255),   # red
    "p": (228, 146, 146, 255), # marbling / fat
    # cooked meat
    "b": (108, 64, 30, 255),   # dark brown edge
    "B": (156, 100, 48, 255),  # brown
    "P": (198, 148, 96, 255),  # highlight
    # bone
    "W": (232, 226, 208, 255),
    "w": (198, 190, 170, 255),
}


def steak(edge, fill, marble, bone_hi, bone_lo):
    return [
        "................",
        "................",
        "..........%s%s...." % (bone_hi, bone_hi),
        ".........%s%s%s...." % (bone_lo, bone_hi, bone_hi),
        "....{e}{e}{e}{e}{b}{B}{B}....".format(e=edge, b=bone_lo, B=bone_hi),
        "...{e}{f}{f}{f}{f}{e}{B}.....".format(e=edge, f=fill, B=bone_hi),
        "..{e}{f}{m}{f}{f}{f}{e}......".format(e=edge, f=fill, m=marble),
        "..{e}{f}{f}{f}{m}{f}{e}......".format(e=edge, f=fill, m=marble),
        "..{e}{f}{f}{f}{f}{f}{e}......".format(e=edge, f=fill),
        "..{e}{f}{m}{f}{f}{f}{e}......".format(e=edge, f=fill, m=marble),
        "...{e}{f}{f}{f}{f}{e}.......".format(e=edge, f=fill),
        "....{e}{e}{e}{e}{e}........".format(e=edge),
        "................",
        "................",
        "................",
        "................",
    ]


RAW = steak("r", "R", "p", "W", "w")
COOKED = steak("b", "B", "P", "W", "w")

SPRITES = {"raw_meat": RAW, "cooked_meat": COOKED}


def write_png(path, rows):
    # pad/truncate every row to exactly 16 cells.
    rows = [(r + "." * 16)[:16] for r in rows]
    h, w = 16, 16
    raw = bytearray()
    for r in rows:
        raw.append(0)
        for ch in r:
            raw.extend(PAL[ch])

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
    out = os.path.join("assets", "textures", "items")
    os.makedirs(out, exist_ok=True)
    for name, rows in SPRITES.items():
        path = os.path.join(out, name + ".png")
        write_png(path, rows)
        print("wrote", path)


if __name__ == "__main__":
    main()
