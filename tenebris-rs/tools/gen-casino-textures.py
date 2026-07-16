#!/usr/bin/env python3
"""Generate the space-station / casino technology hex-prism block textures
(space era Phase 2 "built look" + Phase 5 casino room - see
SPACE_ERA_PLAN.md). The station hull, deck, and casino interior are
assembled from these tiles so the orbital structure reads as *built*
technology, not natural terrain:

  station_hull       - brushed steel wall/ceiling panel with rivets
  station_floor      - dark diamond-plate deck plating
  casino_carpet      - purple casino carpet, gold diamond lattice
  casino_wall        - plum art-deco wall panel with gold banding
  neon_trim          - graphite panel crossed by a cyan neon tube
  neon_trim_pink     - the same panel, hot-pink tube (colour variety)
  neon_trim_gold     - the same panel, warm gold tube (room lights)
  casino_sign        - bulb-bordered marquee with a neon lucky 7
  slot_machine_face  - slot cabinet face (marquee, 3 reels, coin slit)
  card_table_face    - green felt, dealt cards, chips, gold rim
  station_glass      - courtyard / window glazing: clearly visible
                       framed panes (semi-transparent, alpha < 255)

Baked-asset path: deterministic 16x16 RGBA PNGs, stdlib+zlib only.
Run from tenebris-rs/:  python tools/gen-casino-textures.py
"""

import os
import struct
import zlib

OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "assets", "textures", "technology")
SIZE = 16

# One shared palette; each grid uses the subset it needs.
PAL = {
    ".": (0, 0, 0, 0),
    # steel / deck
    "M": (168, 174, 184, 255),  # steel light
    "m": (146, 152, 162, 255),  # steel mid (brush streak)
    "s": (118, 124, 134, 255),  # steel bevel shadow
    "d": (92, 98, 108, 255),    # panel seam dark
    "r": (214, 218, 226, 255),  # rivet bright
    "b": (84, 90, 100, 255),    # deck base
    "t": (108, 116, 128, 255),  # deck tread
    "h": (130, 138, 150, 255),  # deck stud highlight
    "k": (60, 66, 74, 255),     # deck stud shadow / dark slit
    # casino purples / gold
    "p": (58, 32, 84, 255),     # carpet purple
    "q": (46, 24, 68, 255),     # carpet purple dark
    "g": (212, 168, 64, 255),   # gold trim
    "a": (176, 62, 146, 255),   # magenta accent
    "B": (38, 28, 50, 255),     # wall plum base
    "L": (52, 40, 68, 255),     # wall plum light
    # neon
    "D": (34, 37, 44, 255),     # graphite panel
    "E": (44, 48, 56, 255),     # graphite speckle
    "v": (150, 156, 166, 255),  # bracket silver
    "w": (36, 110, 150, 255),   # neon outer glow
    "c": (80, 225, 255, 255),   # neon tube cyan
    "W": (225, 255, 255, 255),  # neon core white
    # sign / slots / table
    "K": (16, 14, 20, 255),     # sign void black
    "Y": (255, 216, 100, 255),  # marquee bulb lit
    "y": (120, 92, 36, 255),    # marquee bulb dim
    "N": (255, 96, 220, 255),   # neon magenta glyph
    "n": (120, 40, 110, 255),   # neon magenta glow
    "R": (200, 40, 56, 255),    # cabinet red
    "i": (240, 100, 110, 255),  # cabinet red highlight
    "A": (32, 36, 60, 255),     # cabinet navy body
    "Z": (20, 22, 36, 255),     # cabinet base dark
    "O": (235, 235, 240, 255),  # reel / card white
    "S": (205, 30, 45, 255),    # symbol / pip / chip red
    "F": (40, 110, 66, 255),    # felt green
    "f": (32, 92, 54, 255),     # felt green dark
    "U": (58, 92, 198, 255),    # chip blue
    "x": (30, 30, 34, 255),     # black pip
    # neon colour variants (same tube layout as w/c/W, recoloured)
    "4": (150, 40, 110, 255),   # pink outer glow
    "5": (255, 80, 200, 255),   # pink tube
    "6": (255, 225, 250, 255),  # pink core
    "7": (150, 105, 30, 255),   # gold outer glow
    "8": (255, 190, 70, 255),   # gold tube
    "9": (255, 240, 205, 255),  # gold core
    # glass (semi-transparent - drawn through the blend pipeline). Alpha
    # is deliberately high and the frame heavy so glazed deck openings
    # read as SOLID glass panes, never as holes.
    "1": (150, 205, 255, 165),  # pane
    "2": (225, 245, 255, 200),  # glint streak
    "3": (105, 150, 210, 190),  # pane edge shade
    "T": (150, 158, 172, 255),  # glazing frame
}

STATION_HULL = [
    "dddddddddddddddd",
    "drMMMMMrdrMMMMMr",
    "dMMMMMmMdMMmMMMM",
    "dMMmMMMMdMMMMMmM",
    "dMmMMMMMdMMMMmMM",
    "dMMMMmMMdMmMMMMM",
    "drMMMMMrdrMMMMMr",
    "dsssssssdsssssss",
    "dddddddddddddddd",
    "drMMMMMrdrMMMMMr",
    "dMMmMMMMdMMMMmMM",
    "dMMMMMmMdMmMMMMM",
    "dMMMMmMMdMMMmMMM",
    "dMmMMMMMdMMMMMmM",
    "drMMMMMrdrMMMMMr",
    "dsssssssdsssssss",
]

CASINO_WALL = [
    "BBBBBBBBBBBBBBBB",
    "LLLLLLLLLLLLLLLL",
    "gggggggggggggggg",
    "BBBBBBBBBBBBBBBB",
    "BBLBBBLBBBLBBBLB",
    "BBLBBBLBBBLBBBLB",
    "BBLBBBLggBLBBBLB",
    "BBLBBBgBBgLBBBLB",
    "BBLBBBgBBgLBBBLB",
    "BBLBBBLggBLBBBLB",
    "BBLBBBLBBBLBBBLB",
    "BBLBBBLBBBLBBBLB",
    "gggggggggggggggg",
    "BBBBBBBBBBBBBBBB",
    "LLLLLLLLLLLLLLLL",
    "BBBBBBBBBBBBBBBB",
]

NEON_TRIM = [
    "DDDEDDDDDDDEDDDD",
    "DEDDDDDEDDDDDDED",
    "DDDDEDDDDDEDDDDD",
    "DDEDDDDDDDDDDEDD",
    "DDDDDDDEDDDDDDDD",
    "DDDvDDDDDDDvDDDD",
    "wwwwwwwwwwwwwwww",
    "cccccccccccccccc",
    "WWWWWWWWWWWWWWWW",
    "cccccccccccccccc",
    "wwwwwwwwwwwwwwww",
    "DDDvDDDDDDDvDDDD",
    "DDDDDEDDDDDDDEDD",
    "DEDDDDDDDEDDDDDD",
    "DDDDDDEDDDDDDDDE",
    "DDEDDDDDDDDEDDDD",
]

CASINO_SIGN = [
    "YyYyYyYyYyYyYyYy",
    "yKKKKKKKKKKKKKKY",
    "YKKKKKKKKKKKKKKy",
    "yKKKKKKKKKKKKKKY",
    "YKKKnNNNNNNnKKKy",
    "yKKKKKKKKnNKKKKY",
    "YKKKKKKKnNnKKKKy",
    "yKKKKKKnNnKKKKKY",
    "YKKKKKKNnKKKKKKy",
    "yKKKKKnNKKKKKKKY",
    "YKKKKKNnKKKKKKKy",
    "yKKKKKNKKKKKKKKY",
    "YKKKKKKKKKKKKKKy",
    "yKKKKKKKKKKKKKKY",
    "YKKKKKKKKKKKKKKy",
    "yYyYyYyYyYyYyYyY",
]

SLOT_MACHINE_FACE = [
    "gggggggggggggggg",
    "gRiRRRRiRRRRiRRg",
    "gRRRRRRRRRRRRRRg",
    "gggggggggggggggg",
    "AAAAAAAAAAAAAAAA",
    "AAOOOAOOOAOOOAAA",
    "AAOSOAOSOAOSOAAA",
    "AAOSOAOSOAOSOAAA",
    "AAOOOAOOOAOOOAAA",
    "AAAAAAAAAAAAAAAA",
    "AAAAAAAAAAAAAAAA",
    "gggggggggggggggg",
    "AAAAAkkkkkkAAAAA",
    "AAAAAAAggAAAAAAA",
    "AAAAAAAAAAAAAAAA",
    "ZZZZZZZZZZZZZZZZ",
]

CARD_TABLE_FACE = [
    "gggggggggggggggg",
    "gFFFFfFFFFFfFFFg",
    "gFfFFFFFfFFFFFfg",
    "gFFFFfFFFFfFFFFg",
    "gFFOOOOFFFFfFFFg",
    "gFfOxOOFFFFFFFFg",
    "gFFOOOOFOOOOFFFg",
    "gFFOOxOFOSOOFfFg",
    "gFfOOOOFOOSOFFFg",
    "gFFFfFFFOOOOFFFg",
    "gFFfFFFFOOOOFfFg",
    "gFSSSfFFFFFFFfFg",
    "gFSOSFFFFFUUUFFg",
    "gFSSSFFFFFUOUFFg",
    "gFfFFFfFFFUUUFfg",
    "gggggggggggggggg",
]


STATION_GLASS = [
    "TTTTTTTTTTTTTTTT",
    "T211111TT111113T",
    "T121111TT111113T",
    "T112111TT111113T",
    "T111211TT111113T",
    "T111121TT111113T",
    "T111112TT111113T",
    "TTTTTTTTTTTTTTTT",
    "TTTTTTTTTTTTTTTT",
    "T211111TT111113T",
    "T121111TT111113T",
    "T112111TT112113T",
    "T111211TT111213T",
    "T111121TT111123T",
    "T333333TT333333T",
    "TTTTTTTTTTTTTTTT",
]


def carpet_rows():
    """Purple casino carpet: gold diamond lattice on an 8-px period with a
    magenta dot in each diamond heart, over a subtly speckled purple."""
    rows = []
    for y in range(SIZE):
        row = ""
        for x in range(SIZE):
            if (x + y) % 8 == 0 or (x - y) % 8 == 0:
                row += "g"
            elif (x % 8 == 4 and y % 8 == 0) or (x % 8 == 0 and y % 8 == 4):
                row += "a"
            elif (x * 7 + y * 13) % 5 == 0:
                row += "q"
            else:
                row += "p"
        rows.append(row)
    return rows


def floor_rows():
    """Dark diamond-plate deck: raised 2x2 studs on a 4-px grid, odd rows
    of studs offset half a cell, highlight up-left / shadow down-right."""
    rows = [["b"] * SIZE for _ in range(SIZE)]
    for cy in range(0, SIZE, 4):
        off = 2 if (cy // 4) % 2 else 0
        for cx in range(0, SIZE, 4):
            x = (cx + off) % SIZE
            y = cy
            rows[(y + 1) % SIZE][(x + 1) % SIZE] = "h"
            rows[(y + 1) % SIZE][(x + 2) % SIZE] = "t"
            rows[(y + 2) % SIZE][(x + 1) % SIZE] = "t"
            rows[(y + 2) % SIZE][(x + 2) % SIZE] = "k"
    return ["".join(r) for r in rows]


def recolor(rows, mapping):
    """Copy a pixel grid with palette chars swapped (neon variants)."""
    table = str.maketrans(mapping)
    return [row.translate(table) for row in rows]


TILES = {
    "station_hull": STATION_HULL,
    "station_floor": floor_rows(),
    "casino_carpet": carpet_rows(),
    "casino_wall": CASINO_WALL,
    "neon_trim": NEON_TRIM,
    "neon_trim_pink": recolor(NEON_TRIM, {"w": "4", "c": "5", "W": "6"}),
    "neon_trim_gold": recolor(NEON_TRIM, {"w": "7", "c": "8", "W": "9"}),
    "casino_sign": CASINO_SIGN,
    "slot_machine_face": SLOT_MACHINE_FACE,
    "card_table_face": CARD_TABLE_FACE,
    "station_glass": STATION_GLASS,
}


def rgba(rows):
    px = bytearray()
    for row in rows:
        assert len(row) == SIZE, f"row width {len(row)} != {SIZE}: {row!r}"
        for ch in row:
            px.extend(PAL[ch])
    return bytes(px)


def write_png(path, pixels, w=SIZE, h=SIZE):
    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    raw = b"".join(b"\x00" + pixels[y * w * 4 : (y + 1) * w * 4] for y in range(h))
    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(png)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, rows in TILES.items():
        assert len(rows) == SIZE, f"{name}: {len(rows)} rows"
        path = os.path.join(OUT_DIR, f"{name}.png")
        write_png(path, rgba(rows))
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
