#!/usr/bin/env python3
"""Generate the starter-tool item sprites (wood pickaxe / axe / shovel).

Baked-asset path (see CLAUDE.md "Static game asset guidelines"): this
writes deterministic 16x16 RGBA PNGs under assets/textures/items/, the
source of truth for the tool icons the crafting + inventory UI sample via
ui_icons. Hand-authored pixel bitmaps below; stdlib + zlib only.

Run from tenebris-rs/:  python tools/gen-tool-sprites.py
"""

import os
import struct
import zlib

# Palette. '.' = transparent.
PAL = {
    ".": (0, 0, 0, 0),
    "H": (120, 78, 40, 255),    # handle wood
    "h": (158, 108, 62, 255),   # handle highlight
    "d": (86, 56, 30, 255),     # handle shadow
    # Tier-1 head = knapped flint (chipped grey-tan stone, not metal). The
    # base pickaxe/axe/shovel/hoe use these; stone/iron pickaxes remap the
    # M/m/D chars to their own palettes below, so they're unaffected.
    "M": (112, 106, 94, 255),   # flint main
    "m": (152, 146, 130, 255),  # flint highlight (chipped facet)
    "D": (70, 66, 58, 255),     # flint shadow
    # stone-tier head (bluish grey rock)
    "S": (116, 118, 126, 255),
    "s": (150, 152, 160, 255),
    "T": (84, 86, 94, 255),
    # iron-tier head (bright steel)
    "I": (200, 204, 214, 255),
    "i": (232, 236, 244, 255),
    "J": (150, 154, 166, 255),
}

# 16x16 hand-drawn bitmaps.
# Pickaxe head arches OVER the handle with the tips pointing DOWN (it
# was drawn V-up originally, which read as an upside-down pick).
PICKAXE = [
    "....mMMMMMM.....",
    "..MMm......MM...",
    ".DMm........mM..",
    ".DM..........M..",
    ".D....hHh.....D.",
    "......hHhd......",
    ".....hHhd.......",
    ".....HHd........",
    "....hHhd........",
    "....HHd.........",
    "...hHhd.........",
    "...HHd..........",
    "..hHhd..........",
    "..HHd...........",
    "................",
    "................",
]

AXE = [
    "................",
    "...MMMD.........",
    "..MMMMMD........",
    ".MMMMMMMd.......",
    ".MMMMMMhHh......",
    ".mMMMMdHHh......",
    ".DMMMdhHhd......",
    "..DMd.HHd.......",
    ".....hHhd.......",
    ".....HHd........",
    ".....hHd........",
    ".....HHd........",
    ".....hHd........",
    ".....HHd........",
    ".....HHd........",
    "................",
]

SHOVEL = [
    ".....hHh........",
    ".....HHd........",
    ".....hHd........",
    ".....HHd........",
    ".....hHd........",
    ".....HHd........",
    ".....hHd........",
    ".....HHd........",
    "....MMMMd.......",
    "...MMMMMMd......",
    "...mMMMMMd......",
    "...MMMMMMd......",
    "...DMMMMMd......",
    "....DMMMd.......",
    ".....DMd........",
    "................",
]

# Hoe: a flat blade set perpendicular at the head of a diagonal handle.
HOE = [
    "...MMMM.........",
    "..MmmmMD........",
    "..MMMMMD........",
    "....DDHh........",
    ".....hHd........",
    ".....HHd........",
    "....hHhd........",
    "....HHd.........",
    "...hHhd.........",
    "...HHd..........",
    "..hHhd..........",
    "..HHd...........",
    ".hHhd...........",
    ".HHd............",
    "hHd.............",
    "................",
]


def recolor(rows, mapping):
    """Re-skin a bitmap's head metal to a different tier palette."""
    return ["".join(mapping.get(ch, ch) for ch in r) for r in rows]


# Higher tool tiers reuse the flint silhouette with a re-skinned head so
# each tier reads as one family (pickaxe/axe/shovel) at a glance. Stone
# uses the S/s/T palette, iron the I/i/J palette.
STONE_MAP = {"M": "S", "m": "s", "D": "T"}
IRON_MAP = {"M": "I", "m": "i", "D": "J"}
STONE_PICKAXE = recolor(PICKAXE, STONE_MAP)
IRON_PICKAXE = recolor(PICKAXE, IRON_MAP)
STONE_AXE = recolor(AXE, STONE_MAP)
IRON_AXE = recolor(AXE, IRON_MAP)
STONE_SHOVEL = recolor(SHOVEL, STONE_MAP)
IRON_SHOVEL = recolor(SHOVEL, IRON_MAP)

TOOLS = {
    "wood_pickaxe": PICKAXE,
    "wood_axe": AXE,
    "wood_shovel": SHOVEL,
    "stone_pickaxe": STONE_PICKAXE,
    "iron_pickaxe": IRON_PICKAXE,
    "stone_axe": STONE_AXE,
    "iron_axe": IRON_AXE,
    "stone_shovel": STONE_SHOVEL,
    "iron_shovel": IRON_SHOVEL,
    "hoe": HOE,
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
    for name, rows in TOOLS.items():
        assert all(len(r) == 16 for r in rows) and len(rows) == 16, name
        path = os.path.join(out_dir, name + ".png")
        write_png(path, rows)
        print("wrote", path)


if __name__ == "__main__":
    main()
