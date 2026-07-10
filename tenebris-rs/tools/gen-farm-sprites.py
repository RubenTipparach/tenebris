#!/usr/bin/env python3
"""Generate farming item sprites (seeds, berries, wheat, bread, carrot).

Baked-asset path (CLAUDE.md static-asset guidelines): deterministic 16x16
RGBA PNGs under assets/textures/items/, sampled by ui_icons. stdlib+zlib.
Run from tenebris-rs/:  python tools/gen-farm-sprites.py
"""

import os
import struct
import zlib

PAL = {
    ".": (0, 0, 0, 0),
    # seeds - tan / brown teardrop pips
    "s": (196, 158, 92, 255),   # seed body
    "S": (224, 194, 132, 255),  # seed highlight
    "d": (140, 104, 56, 255),   # seed shadow / edge
    # berries - red cluster
    "b": (150, 24, 34, 255),    # berry edge / dark
    "B": (206, 44, 54, 255),    # berry body
    "H": (240, 120, 120, 255),  # berry specular highlight
    # leaf / stem
    "g": (46, 120, 44, 255),    # leaf
    "G": (72, 158, 66, 255),    # leaf highlight
    "m": (96, 66, 34, 255),     # stem
    # wheat - golden stalks + grain heads
    "w": (188, 142, 52, 255),   # stalk
    "W": (228, 186, 84, 255),   # grain head
    "y": (246, 214, 128, 255),  # grain highlight
    # bread - baked loaf
    "k": (150, 96, 44, 255),    # crust
    "K": (198, 138, 70, 255),   # crust top
    "c": (238, 204, 148, 255),  # crumb / score marks
    # carrot - orange root
    "o": (206, 96, 20, 255),    # root body
    "O": (240, 138, 48, 255),   # root highlight
    "r": (160, 66, 12, 255),    # root shadow
}


# A scatter of little teardrop seeds on transparent ground.
SEEDS = [
    "................",
    "................",
    "....dS..........",
    "...dSs..........",
    "...dss..........",
    "....d.....dS....",
    ".........dSs....",
    ".........dss....",
    "..dS......d.....",
    ".dSs............",
    ".dss.....dS.....",
    "..d.....dSs.....",
    "........dss.....",
    ".........d......",
    "................",
    "................",
]


# A small cluster of berries hanging under a leaf + stem.
BERRIES = [
    "................",
    ".......m........",
    "......mG........",
    ".....gGGg.......",
    "....gGGGGg......",
    ".....gGGg.......",
    "......bb........",
    ".....bBBb.......",
    "....bBHBBb......",
    "....bBBBBb......",
    ".....bBBb...bb..",
    "......bb...bBBb.",
    "..bb......bBHBb.",
    ".bBBb.....bBBBb.",
    ".bBBb......bBb..",
    "..bb............",
]

# Wheat seeds: the berry-seed scatter recoloured golden reads as "wheat"
# at 16px - same pip shapes, wheat palette.
WHEAT_SEEDS = [
    "................",
    "................",
    "....wy..........",
    "...wyW..........",
    "...wWW..........",
    "....w.....wy....",
    ".........wyW....",
    ".........wWW....",
    "..wy......w.....",
    ".wyW............",
    ".wWW.....wy.....",
    "..w.....wyW.....",
    "........wWW.....",
    ".........w......",
    "................",
    "................",
]


# Wheat: three golden stalks with grain heads, tied at the base.
WHEAT = [
    "................",
    "...y....y...y...",
    "..yWy..yWy.yWy..",
    "..yWy..yWy.yWy..",
    "..WWW..WWW.WWW..",
    "..WWW..WWW.WWW..",
    "..yWy..yWy.yWy..",
    "...W....W...W...",
    "...w....w...w...",
    "...w...w....w...",
    "....w..w...w....",
    "....w..w...w....",
    ".....w.w..w.....",
    ".....www.w......",
    "......mmm.......",
    "................",
]


# Bread: a scored loaf in three-quarter view.
BREAD = [
    "................",
    "................",
    "................",
    "................",
    ".....KKKKKK.....",
    "...KKKKKKKKKK...",
    "..KKcKKcKKcKKk..",
    "..KKKcKKcKKKKk..",
    ".kKKKKKKKKKKKKk.",
    ".kKKKKKKKKKKKKk.",
    ".kkKKKKKKKKKKkk.",
    "..kkkkkkkkkkkk..",
    "...kkkkkkkkkk...",
    "................",
    "................",
    "................",
]


# Carrot: tapered orange root with a leafy top.
CARROT = [
    "................",
    "..........gG....",
    ".........gGG....",
    ".........gGg....",
    "........OGg.....",
    ".......OOo......",
    "......OOor......",
    "......Ooor......",
    ".....OOor.......",
    "....OOoor.......",
    "....Ooor........",
    "...Ooor.........",
    "...oor..........",
    "..oor...........",
    "..rr............",
    "................",
]

SPRITES = {
    "seeds": SEEDS,
    "berries": BERRIES,
    "wheat_seeds": WHEAT_SEEDS,
    "wheat": WHEAT,
    "bread": BREAD,
    "carrot": CARROT,
}


def write_png(path, rows):
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
