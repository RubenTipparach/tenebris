#!/usr/bin/env python3
"""Generate orchard-fruit item sprites: apple / orange / watermelon / kiwi,
their seeds, and the empty / water bucket.

Baked-asset path (CLAUDE.md "Static game asset guidelines"): 16x16 RGBA
PNGs under assets/textures/items/, the source of truth for the icons the
crafting + inventory UI sample via ui_icons. Hand-authored pixel bitmaps;
stdlib + zlib only.

Run from tenebris-rs/:  python tools/gen-fruit-sprites.py
"""

import os
import struct
import zlib

PAL = {
    ".": (0, 0, 0, 0),
    # apple
    "R": (210, 40, 40, 255),
    "r": (170, 26, 26, 255),
    "H": (110, 72, 40, 255),   # stem
    "L": (70, 160, 60, 255),   # leaf
    # orange
    "O": (240, 140, 30, 255),
    "o": (205, 110, 20, 255),
    # watermelon slice
    "G": (40, 150, 55, 255),   # rind dark
    "g": (120, 200, 90, 255),  # rind light
    "P": (232, 70, 80, 255),   # pink flesh
    "p": (210, 55, 65, 255),
    "k": (25, 20, 20, 255),    # seeds (black)
    # kiwi slice
    "K": (120, 175, 70, 255),  # green flesh
    "w": (240, 240, 225, 255), # white core
    "B": (110, 78, 45, 255),   # kiwi skin brown
    # bucket
    "M": (150, 156, 164, 255), # metal
    "m": (188, 194, 202, 255),
    "D": (96, 101, 110, 255),
    "W": (60, 130, 220, 255),  # water
    "u": (90, 165, 240, 255),
}

APPLE = [
    "................",
    "..........LL....",
    ".......H.LLL....",
    "......HH.LL.....",
    "....rRRRRRr.....",
    "...rRRRRRRRr....",
    "..rRRRRRRRRRr...",
    "..RRRRRRRRRRR...",
    "..RRRRRRRRRRR...",
    "..RRRRRRRRRRR...",
    "..rRRRRRRRRRr...",
    "...rRRRRRRRr....",
    "....rRRRRRr.....",
    ".....rRRRr......",
    "................",
    "................",
]

ORANGE = [
    "................",
    ".......H........",
    "......LHL.......",
    "....oOOOOo......",
    "...oOOOOOOo.....",
    "..oOOOOOOOOo....",
    "..OOOOOOOOOO....",
    "..OOOOOOOOOO....",
    "..OOOOOOOOOO....",
    "..OOOOOOOOOO....",
    "..oOOOOOOOOo....",
    "...oOOOOOOo.....",
    "....oOOOOo......",
    ".....oooo.......",
    "................",
    "................",
]

# watermelon slice: green rind arc, pink flesh, black seeds
WATERMELON = [
    "................",
    "................",
    "...GGGGGGGGGG...",
    "..GgggggggggG...",
    "..GPPPPPPPPpG...",
    "..GPPkPPPPPPG...",
    "..GPPPPPkPPpG...",
    "...PPPPPPPPP....",
    "...pPkPPPPPp....",
    "....PPPPkPP.....",
    "....pPPPPPp.....",
    ".....pPPPp......",
    "......pPp.......",
    ".......p........",
    "................",
    "................",
]

# kiwi slice: brown skin ring, green flesh, white core + black seeds
KIWI = [
    "................",
    "................",
    "....BBBBBB......",
    "..BBKKKKKKBB....",
    "..BKKkKwKkKB....",
    ".BKKKwwwKKKB....",
    ".BKkKwwwKkKB....",
    ".BKKKwwwKKKB....",
    ".BKkKwwwKkKB....",
    ".BKKKwKwKKKB....",
    "..BKkKKKKkKB....",
    "..BBKKKKKKB.....",
    "....BBBBBB......",
    "................",
    "................",
    "................",
]


def seeds(tint):
    """A small pile of teardrop seeds tinted toward the fruit colour."""
    T, t = tint
    rows = [
        "................",
        "................",
        "................",
        "......TT........",
        ".....TttT.......",
        ".....TttT..TT...",
        "......TT..TttT..",
        "..TT......TttT..",
        ".TttT......TT...",
        ".TttT...TT......",
        "..TT...TttT.....",
        ".......TttT.....",
        "........TT......",
        "................",
        "................",
        "................",
    ]
    return rows, {"T": T, "t": t}


BUCKET = [
    "................",
    "..MmmmmmmmmM....",
    "..M........M....",
    "...M......M.....",
    "...M......M.....",
    "...MD....DM.....",
    "...M......M.....",
    "...M......M.....",
    "....M....M......",
    "....M....M......",
    "....MD..DM......",
    "....M....M......",
    ".....MMMM.......",
    "................",
    "................",
    "................",
]

WATER_BUCKET = [
    "................",
    "..MmmmmmmmmM....",
    "..MWuWuWuWuM....",
    "...MWuWuWuM.....",
    "...MuWuWuWM.....",
    "...MWuWuWuM.....",
    "...MuWuWuWM.....",
    "...MWuWuWuM.....",
    "....MuWuWM......",
    "....MWuWuM......",
    "....MuWuWM......",
    "....MWuWuM......",
    ".....MMMM.......",
    "................",
    "................",
    "................",
]

SPRITES = {
    "apple": (APPLE, {}),
    "orange": (ORANGE, {}),
    "watermelon": (WATERMELON, {}),
    "kiwi": (KIWI, {}),
    "bucket": (BUCKET, {}),
    "water_bucket": (WATER_BUCKET, {}),
}

# Per-fruit seed tints (main, shadow).
for name, (main, shade) in {
    "apple_seeds": ((150, 90, 40, 255), (110, 66, 30, 255)),
    "orange_seeds": ((225, 200, 150, 255), (185, 160, 110, 255)),
    "watermelon_seeds": ((30, 26, 24, 255), (70, 62, 55, 255)),
    "kiwi_seeds": ((40, 36, 32, 255), (90, 82, 72, 255)),
}.items():
    rows, extra = seeds((None, None))
    SPRITES[name] = (rows, {"T": main, "t": shade})


def write_png(path, rows, extra):
    pal = dict(PAL)
    pal.update(extra)
    h = len(rows)
    w = len(rows[0])
    raw = bytearray()
    for r in rows:
        raw.append(0)
        for ch in r:
            raw.extend(pal[ch])

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
    out_dir = os.path.join("assets", "textures", "items")
    os.makedirs(out_dir, exist_ok=True)
    for name, (rows, extra) in SPRITES.items():
        assert all(len(r) == 16 for r in rows) and len(rows) == 16, (
            name,
            [len(r) for r in rows],
        )
        write_png(os.path.join(out_dir, name + ".png"), rows, extra)
        print("wrote", name + ".png")


if __name__ == "__main__":
    main()
