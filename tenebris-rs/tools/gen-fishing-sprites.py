#!/usr/bin/env python3
"""Generate fishing item sprites (rod + raw / cooked fish).

Baked-asset path (CLAUDE.md static-asset guidelines): deterministic 16x16
RGBA PNGs under assets/textures/items/, sampled by ui_icons. stdlib+zlib.
Run from tenebris-rs/:  python tools/gen-fishing-sprites.py
"""

import struct
import zlib

PAL = {
    ".": (0, 0, 0, 0),
    # rod
    "k": (94, 62, 34, 255),    # dark wood
    "K": (140, 96, 52, 255),   # wood
    "l": (214, 214, 220, 255), # line
    "o": (222, 60, 40, 255),   # bobber red
    "O": (240, 238, 232, 255), # bobber white
    # raw fish
    "s": (96, 124, 158, 255),  # dark scale
    "S": (136, 168, 198, 255), # scale
    "f": (188, 208, 226, 255), # belly
    "e": (24, 24, 28, 255),    # eye
    # cooked fish
    "b": (122, 74, 34, 255),   # dark crust
    "B": (176, 116, 56, 255),  # crust
    "F": (224, 176, 112, 255), # flaky highlight
}

ROD = [
    "..............KK",
    ".............Kk.",
    "............Kk..",
    "...........Kk...",
    "..........Kk..l.",
    ".........Kk...l.",
    "........Kk....l.",
    ".......Kk.....l.",
    "......Kk......l.",
    ".....Kk.......l.",
    "....Kk........l.",
    "...Kk.........l.",
    "..Kk..........o.",
    ".Kk...........oo",
    "Kk............OO",
    "..............OO",
]

RAW = [
    "................",
    "................",
    "................",
    "................",
    ".......ssss.....",
    "...ssSSSSSSss.s.",
    "..sSSeSSSSSSSss.",
    ".sSSSSSSSSSSSss.",
    ".sfffSSSSSSSss..",
    "..sfffffSSss.s..",
    "...ssssssss...s.",
    "................",
    "................",
    "................",
    "................",
    "................",
]

COOKED = [
    "................",
    "................",
    "................",
    "................",
    ".......bbbb.....",
    "...bbBBBBBBbb.b.",
    "..bBBeBBFFBBBbb.",
    ".bBBBBFFFFBBBbb.",
    ".bFFFBBBBBBBbb..",
    "..bFFFFFBBbb.b..",
    "...bbbbbbbb...b.",
    "................",
    "................",
    "................",
    "................",
    "................",
]

SPRITES = {"fishing_rod": ROD, "raw_fish": RAW, "cooked_fish": COOKED}


def write_png(path, rows):
    w = h = 16
    raw = b""
    for row in rows:
        raw += b"\x00"
        for ch in row:
            raw += bytes(PAL[ch])

    def chunk(typ, body):
        c = typ + body
        return struct.pack(">I", len(body)) + c + struct.pack(">I", zlib.crc32(c))

    out = b"\x89PNG\r\n\x1a\n"
    out += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    out += chunk(b"IDAT", zlib.compress(raw, 9))
    out += chunk(b"IEND", b"")
    open(path, "wb").write(out)
    print("wrote", path)


def main():
    for name, rows in SPRITES.items():
        write_png("assets/textures/items/%s.png" % name, rows)


if __name__ == "__main__":
    main()
