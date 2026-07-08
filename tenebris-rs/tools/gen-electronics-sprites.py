#!/usr/bin/env python3
"""Generate the electronics component item sprites that ui_icons expects
under assets/textures/technology/ (mother_board, micro_chip, ram_module,
power_supply, print_nozzle) - these slots were logging "missing; slot
blank" at boot, and per CLAUDE.md every item must render a real icon.

Baked-asset path: deterministic 16x16 RGBA PNGs, stdlib+zlib.
Run from tenebris-rs/:  python tools/gen-electronics-sprites.py
"""

import os
import struct
import zlib

PAL = {
    ".": (0, 0, 0, 0),
    # PCB
    "g": (24, 92, 44, 255),     # board dark
    "G": (34, 124, 58, 255),    # board
    "t": (208, 176, 80, 255),   # gold trace / edge pins
    # IC package
    "k": (28, 28, 32, 255),     # chip dark
    "K": (52, 52, 58, 255),     # chip body
    "w": (210, 210, 216, 255),  # silk-screen / pin silver
    # PSU / metal
    "m": (120, 124, 130, 255),  # case
    "M": (154, 158, 164, 255),  # case light
    "d": (70, 72, 78, 255),     # vent / recess
    "y": (232, 196, 72, 255),   # warning sticker
    # nozzle
    "o": (236, 120, 40, 255),   # hot filament
    "O": (255, 170, 80, 255),   # glow
}

MOTHER_BOARD = [
    "................",
    ".GGGGGGGGGGGGGG.",
    ".GgggGGGGggggGG.",
    ".GgKKkGGGGttGGG.",
    ".GgKKkGGGGttGGG.",
    ".GGGGGGggGGGGGG.",
    ".GttttGggGkkkkG.",
    ".GGGGGGggGkKKkG.",
    ".GggGGGGGGkKKkG.",
    ".GggGGttttGkkkG.",
    ".GGGGGGGGGGGGGG.",
    ".GgggggGGGkkGGG.",
    ".GGGGGGGGGkkGGG.",
    ".GGttGGttGGttGG.",
    ".tttttttttttttt.",
    "................",
]

MICRO_CHIP = [
    "................",
    "................",
    "...w..w..w..w...",
    "...w..w..w..w...",
    "..kkkkkkkkkkkk..",
    "..kKKKKKKKKKKk..",
    "..kKKwwwwwwKKk..",
    "..kKKwKKKKwKKk..",
    "..kKKwKKKKwKKk..",
    "..kKKwwwwwwKKk..",
    "..kKKKKKKKKKKk..",
    "..kkkkkkkkkkkk..",
    "...w..w..w..w...",
    "...w..w..w..w...",
    "................",
    "................",
]

RAM_MODULE = [
    "................",
    "................",
    "................",
    "..GGGGGGGGGGGG..",
    "..GkkGkkGkkGkG..",
    "..GkkGkkGkkGkG..",
    "..GGGGGGGGGGGG..",
    "..GkkGkkGkkGkG..",
    "..GkkGkkGkkGkG..",
    "..GGGGGGGGGGGG..",
    "..tt.tt.tt.tt...",
    "................",
    "................",
    "................",
    "................",
    "................",
]

POWER_SUPPLY = [
    "................",
    "..mmmmmmmmmmmm..",
    ".mMMMMMMMMMMMMm.",
    ".mMddddddMMyyMm.",
    ".mMdMMMMdMMyyMm.",
    ".mMdMddMdMMMMMm.",
    ".mMdMddMdMddddm.",
    ".mMdMMMMdMddddm.",
    ".mMddddddMddddm.",
    ".mMMMMMMMMMMMMm.",
    ".mMddMddMddMdMm.",
    ".mMMMMMMMMMMMMm.",
    "..mmmmmmmmmmmm..",
    "....kk....kk....",
    "................",
    "................",
]

PRINT_NOZZLE = [
    "................",
    "...mmmmmmmmmm...",
    "...MMMMMMMMMM...",
    "...mmmmmmmmmm...",
    "....MMMMMMMM....",
    "....MMMMMMMM....",
    ".....mMMMMm.....",
    ".....MMMMMM.....",
    "......mMMm......",
    "......MMMM......",
    ".......mm.......",
    ".......MM.......",
    ".......Oo.......",
    ".......oO.......",
    "........o.......",
    "................",
]

SPRITES = {
    "mother_board": MOTHER_BOARD,
    "micro_chip": MICRO_CHIP,
    "ram_module": RAM_MODULE,
    "power_supply": POWER_SUPPLY,
    "print_nozzle": PRINT_NOZZLE,
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
    out = os.path.join("assets", "textures", "technology")
    os.makedirs(out, exist_ok=True)
    for name, rows in SPRITES.items():
        path = os.path.join(out, name + ".png")
        write_png(path, rows)
        print("wrote", path)


if __name__ == "__main__":
    main()
