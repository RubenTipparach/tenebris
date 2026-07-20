#!/usr/bin/env python3
"""Generate the live-fish item sprites + net / glass / aquarium icons.

Baked-asset path (CLAUDE.md static-asset guidelines): deterministic 16x16
RGBA PNGs under assets/textures/ (blocks) and assets/textures/items/
(items), sampled by ui_icons. One sprite per catchable / aquarium fish
species so each fish carries its OWN icon. stdlib + zlib only.

Run from tenebris-rs/:  python tools/gen-fish-sprites.py
"""

import struct
import zlib

# Per-species palettes echo the in-world atlas tones (tools/gen-animal-
# textures.py SPECIES) so the item icon reads as the same fish you see
# swimming. Letters: D dark, M mid (base), L belly/light, A accent,
# E eye, . transparent. Species grids remap D/M/L below.
EYE = (20, 22, 26, 255)
CLEAR = (0, 0, 0, 0)

# (dark, mid, light) per species.
SPECIES_COLS = {
    "minnow":  ((84, 105, 126), (120, 150, 180), (188, 208, 228)),
    "reef":    ((36, 96, 100),  (60, 150, 150),  (150, 214, 214)),
    "eel":     ((76, 86, 46),   (120, 130, 72),  (176, 182, 120)),
    "ray":     ((140, 122, 88), (185, 165, 125), (224, 208, 172)),
    "turtle":  ((52, 92, 48),   (90, 140, 70),   (156, 196, 112)),
    "serpent": ((30, 80, 66),   (48, 120, 102),  (182, 208, 178)),
}

# A compact fish silhouette, head to the RIGHT, forked tail to the LEFT.
FISH = [
    "................",
    "................",
    "................",
    ".......DDDD.....",
    "D....DDMMMMDD...",
    "DD..DMMMMMMMED..",
    ".DDMMMMMMMMMMD..",
    "..DMMMMMMMMMMD..",
    ".DDMMMMMMMMMED..",
    "DD..DMMMLLMMDD..",
    "D....DDMMMMDD...",
    ".......DDDD.....",
    "................",
    "................",
    "................",
    "................",
]

# Deep-bodied reef fish: tall flank + big dorsal, head right.
REEF = [
    "................",
    ".......DD.......",
    "......DMMD......",
    "D....DMMMMD.....",
    "DD..DMMMMMMDD...",
    ".DDMMMMMMMMMD...",
    ".DMMMMMMMMMMED..",
    ".DMMMMMMMMMMED..",
    ".DMMMMMMMMMMED..",
    ".DDMMMLLMMMMD...",
    "DD..DMMMMMMDD...",
    "D....DMMMMD.....",
    "......DMMD......",
    ".......DD.......",
    "................",
    "................",
]

# Long thin eel, undulating across the tile.
EEL = [
    "................",
    "................",
    "...........DDD..",
    "..........DMMMD.",
    ".....DDDDDMMMMED",
    "...DDMMMMMMMMDD.",
    "..DMMMMMMDDDD...",
    "..DMMMDDD.......",
    "..DMMMMDDD......",
    "...DDMMMMMMDD...",
    ".....DDDMMMMMDD.",
    "..........DDDD..",
    "................",
    "................",
    "................",
    "................",
]

# Flat ray: wide diamond wings, whip tail trailing left.
RAY = [
    "................",
    "................",
    ".......DD.......",
    "......DMMD......",
    ".....DMMMMD.....",
    "...DDMMMMMMDD...",
    ".DDMMMMMMMMMMDD.",
    "DMMMMMMEEMMMMMMD",
    ".DDMMMMMMMMMMDD.",
    "...DDMMMMMMDD...",
    ".....DDMMDD.....",
    "..DDD..DD.......",
    ".D..............",
    "................",
    "................",
    "................",
]

# Sea turtle: domed shell, head right, four flippers.
TURTLE = [
    "................",
    "................",
    "....D......L....",
    "...DAD...LLLL...",
    "..DAADDDDDDME...",
    ".DAADMLMLMDDD...",
    ".DADMLMLMLMD....",
    ".DDMLMLMLMLD....",
    ".DADMLMLMLMD....",
    ".DAADMLMLMDDD...",
    "..DAADDDDDDD....",
    "...DAD...DDD....",
    "....D......D....",
    "................",
    "................",
    "................",
]

# Sea serpent: long S-curve body, fanged head top-right, pale belly.
SERPENT = [
    "................",
    "...........DDD..",
    "..........DMMMED",
    ".....DDD..DMMMDD",
    "...DDMMMDDMLMD..",
    "..DMLMLMMMMLD...",
    "..DMLDDDDDDD....",
    "..DMLD..........",
    "...DMLDD........",
    "....DMLMDD......",
    ".....DMLMMDD....",
    "......DDMLMMDD..",
    "........DDMLMD..",
    "..........DDDD..",
    "................",
    "................",
]

FISH_SHAPES = {
    "minnow": FISH,
    "reef": REEF,
    "eel": EEL,
    "ray": RAY,
    "turtle": TURTLE,
    "serpent": SERPENT,
}


def fish_pixels(species):
    """Colorize a species silhouette into an RGBA pixel grid."""
    dark, mid, light = SPECIES_COLS[species]
    pal = {
        ".": CLEAR,
        "D": dark + (255,),
        "M": mid + (255,),
        "L": light + (255,),
        "A": dark + (255,),  # flipper/accent = dark tone
        "E": EYE,
    }
    return [[pal[ch] for ch in row] for row in FISH_SHAPES[species]]


# --- Net item: a wooden hoop strung with a diamond mesh. ---
NET_PAL = {
    ".": CLEAR,
    "H": (150, 104, 58, 255),   # hoop / handle wood
    "h": (110, 74, 40, 255),    # hoop shadow
    "m": (206, 212, 220, 255),  # mesh cord
    "s": (150, 156, 166, 255),  # mesh shadow
}
NET = [
    "......HHHH......",
    "....HHmmmmHH....",
    "...Hmsm.msm.H...",
    "..Hm.smsm.s.mH..",
    "..Hsm.msm.ms.h..",
    "..Hm.smsm.s.mH..",
    "..Hsm.msm.ms.h..",
    "...Hm.smsm.mH...",
    "....HHmsmmHH....",
    ".....HhHHhH.....",
    ".......Hh.......",
    "......Hh........",
    ".....Hh.........",
    "....Hh..........",
    "...hh...........",
    "................",
]

# --- Glass block: a pale cyan pane with two bright diagonal glints.
# (The world block is drawn flat-shaded by aquarium_fx; this is the
# inventory icon only.) Built procedurally - cleaner than hand rows. ---
def glass_pixels():
    # Proper item ICON: a framed glass pane on a TRANSPARENT field. The old
    # art tiled edge-to-edge with a uniform translucent teal and NO
    # transparent background, so on a camera-facing item-drop billboard it
    # painted the whole quad teal - the "teal square around the flame" bug.
    # A 2px clear margin + a near-opaque frame make it read as a pane, while
    # the interior stays translucent (it IS glass) with a bright glint.
    frame = (200, 232, 244, 240)   # bright, near-opaque pane edge
    fill = (176, 214, 226, 115)    # translucent glass interior
    shine = (245, 252, 255, 235)   # opaque diagonal glint
    px = []
    for y in range(16):
        row = []
        for x in range(16):
            if x < 2 or y < 2 or x > 13 or y > 13:
                row.append(CLEAR)               # transparent margin frames it
            elif x == 2 or y == 2 or x == 13 or y == 13:
                row.append(frame)               # 1px opaque pane frame
            elif (x - y) in (2, 3) or (x - y) in (-7, -6):
                row.append(shine)               # two diagonal glints
            else:
                row.append(fill)
        px.append(row)
    return px


# --- Aquarium item: a glass tank, blue water, one little fish inside. ---
AQ_PAL = {
    ".": CLEAR,
    "F": (150, 196, 212, 255),  # glass frame
    "w": (70, 150, 210, 244),   # water (near-opaque so the icon reads solid)
    "W": (120, 188, 228, 244),  # water highlight
    "o": (232, 150, 60, 255),   # fish body
    "e": (20, 22, 26, 255),     # fish eye
    "g": (120, 170, 90, 255),   # gravel
}
AQUARIUM = [
    "................",
    "..FFFFFFFFFFFF..",
    "..FWwwwwwwwwWF..",
    "..FwwwwwwwwwwF..",
    "..FwwwwwooowwF..",
    "..FwwwooooowwF..",
    "..FwwooooeowWF..",
    "..FWwwooooowwF..",
    "..FwwwwooowwWF..",
    "..FwwwwwwwwwwF..",
    "..FwWwwwwwWwwF..",
    "..FggggggggggF..",
    "..FFFFFFFFFFFF..",
    "...F........F...",
    "................",
    "................",
]


def grid_pixels(rows, pal):
    return [[pal[ch] for ch in row] for row in rows]


def write_png(path, px):
    h = len(px)
    w = len(px[0])
    raw = b""
    for row in px:
        raw += b"\x00"
        for r, g, b, a in row:
            raw += bytes((r, g, b, a))

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
    for species in FISH_SHAPES:
        write_png("assets/textures/items/fish_%s.png" % species, fish_pixels(species))
    write_png("assets/textures/items/net.png", grid_pixels(NET, NET_PAL))
    write_png("assets/textures/glass.png", glass_pixels())
    write_png("assets/textures/aquarium.png", grid_pixels(AQUARIUM, AQ_PAL))


if __name__ == "__main__":
    main()
