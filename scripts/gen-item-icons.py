#!/usr/bin/env python3
"""Generate small item icons for the JS client (stdlib only).

Writes public/textures/icons/rocket_fuel.png: a 16x16 fuel canister.
Deterministic - rerun to regenerate.
"""
import os
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def write_png(path, pixels):
    h = len(pixels)
    w = len(pixels[0])
    raw = b"".join(b"\x00" + b"".join(bytes(px) for px in row) for row in pixels)

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(png)


def rocket_fuel():
    # PICO-8 palette, matching the game's other pixel art
    clear = (0, 0, 0, 0)
    dark = (29, 43, 83, 255)      # outline
    red = (255, 0, 77, 255)       # body
    shade = (126, 37, 83, 255)    # body shadow
    white = (255, 241, 232, 255)  # band / cap
    blue = (41, 173, 255, 255)    # "H2O" drop on the band
    grey = (95, 87, 79, 255)      # cap
    px = [[clear] * 16 for _ in range(16)]
    # cap and nozzle
    for x in range(6, 10):
        px[1][x] = grey
        px[2][x] = grey
    px[0][7] = dark
    px[0][8] = dark
    # body x 3..12, y 3..15
    for y in range(3, 16):
        for x in range(3, 13):
            edge = x in (3, 12) or y in (3, 15)
            px[y][x] = dark if edge else (shade if x >= 10 else red)
    # white band with a blue drop
    for x in range(4, 12):
        for y in (8, 9, 10):
            px[y][x] = white
    px[8][7] = blue
    px[9][6] = blue
    px[9][7] = blue
    px[9][8] = blue
    px[10][7] = blue
    return px


if __name__ == "__main__":
    out = os.path.join(ROOT, "public", "textures", "icons", "rocket_fuel.png")
    write_png(out, rocket_fuel())
    print("wrote", os.path.relpath(out, ROOT))
