#!/usr/bin/env python3
"""Generate the animal texture atlas.

Baked-asset path (CLAUDE.md static-asset guidelines): a deterministic
512x32 RGBA PNG under assets/textures/ - 16 columns of 32x32, one per
AnimalKind wire id (core::fauna::AnimalKind::to_u8; column 15 spare).
Each species tile is split into three unwrap regions the client's
animal renderer maps onto its box bodies:

  rows  0..15  BODY  - the fur / feather / scale / shell pattern
  rows 16..23  HEAD  - face strip with two dark eyes
  rows 24..31  LIMB  - darker leg / fin tone

Per-species palettes + patterns are procedural (fixed-seed LCG, no
Math.random) so the file is byte-identical every run. stdlib + zlib
only.

Run from tenebris-rs/:  python tools/gen-animal-textures.py
"""

import struct
import zlib

TILE = 32
COLS = 16
W = TILE * COLS
H = TILE

_seed = [0x0A11_FA0A]


def rnd():
    _seed[0] = (_seed[0] * 1103515245 + 12345) & 0x7FFFFFFF
    return _seed[0] / 0x7FFFFFFF


def clamp(v):
    return 0 if v < 0 else (255 if v > 255 else int(v))


def jitter(c, amt):
    j = int((rnd() - 0.5) * 2 * amt)
    return (clamp(c[0] + j), clamp(c[1] + j), clamp(c[2] + j))


# (base, accent, accent_chance, stripes) per wire id. `stripes` draws
# accent as horizontal bands instead of speckle - used for the eel and
# the cat's tabby coat.
SPECIES = {
    0: ((132, 100, 66), (96, 70, 44), 0.22, False),   # critter - brown fur
    1: ((52, 48, 56), (120, 24, 24), 0.10, False),    # stalker - dark, red flecks
    2: ((150, 148, 158), (110, 108, 120), 0.30, True),  # cat - grey tabby
    3: ((232, 228, 214), (204, 198, 180), 0.35, False), # sheep - wool curls
    4: ((240, 236, 228), (214, 206, 192), 0.20, False), # chicken - feathers
    5: ((122, 76, 48), (230, 224, 210), 0.16, False),   # cow - brown + white blotch
    6: ((70, 90, 160), (48, 64, 120), 0.28, False),     # bird - blue feathers
    7: ((120, 150, 180), (88, 116, 150), 0.35, True),   # fish - silver-blue scales
    8: ((70, 140, 60), (46, 104, 40), 0.30, False),     # frog - green mottle
    9: ((150, 150, 80), (110, 116, 56), 0.30, False),   # lizard - sand-green scale
    10: ((36, 36, 44), (230, 230, 226), 0.0, False),    # penguin - black (belly via LIMB? no: accent none)
    11: ((60, 130, 130), (36, 96, 100), 0.32, True),    # large fish - teal scales
    12: ((110, 120, 70), (76, 86, 46), 0.45, True),     # eel - olive bands
    13: ((180, 160, 120), (140, 122, 88), 0.25, False), # ray - sandy speckle
    14: ((80, 130, 70), (52, 92, 48), 0.0, False),      # turtle - shell plates below
    15: ((236, 236, 236), (222, 222, 222), 0.15, False), # near-white: accent boxes
}


def tile_pixels(kid):
    base, accent, chance, stripes = SPECIES[kid]
    px = [[(0, 0, 0, 255)] * TILE for _ in range(TILE)]
    for y in range(TILE):
        for x in range(TILE):
            if y < 16:
                # BODY
                c = base
                if stripes:
                    if (y // 3) % 2 == 1 and rnd() < chance * 2.0:
                        c = accent
                elif rnd() < chance:
                    c = accent
                # cow blotches: big soft white patches
                if kid == 5:
                    if ((x - 8) ** 2 + (y - 5) ** 2 < 22) or ((x - 24) ** 2 + (y - 12) ** 2 < 16):
                        c = accent
                # turtle shell plates: hex-ish grid lines
                if kid == 14:
                    if (x % 8 in (0, 7)) or (y % 8 in (0, 7)):
                        c = (44, 74, 40)
                c = jitter(c, 10)
            elif y < 24:
                # HEAD: base tone, slightly lighter. No painted eyes - every
                # species now wears proud 3D googly eyeballs (client::animals),
                # so the old dark eye pixels just showed as black smudges.
                c = jitter((clamp(base[0] * 1.12), clamp(base[1] * 1.12), clamp(base[2] * 1.12)), 8)
                # beak hint for bird/chicken/penguin: warm bar centre
                if kid in (4, 6, 10) and y in (22, 23) and 14 <= x <= 17:
                    c = (232, 150, 40)
            else:
                # LIMB: darker
                c = jitter((clamp(base[0] * 0.7), clamp(base[1] * 0.7), clamp(base[2] * 0.7)), 8)
            px[y][x] = (c[0], c[1], c[2], 255)
    return px


def main():
    rows = [bytearray() for _ in range(H)]
    for kid in range(COLS):
        px = tile_pixels(kid)
        for y in range(H):
            for x in range(TILE):
                rows[y] += bytes(px[y][x])
    raw = b""
    for y in range(H):
        raw += b"\x00" + bytes(rows[y])

    def chunk(typ, body):
        c = typ + body
        return struct.pack(">I", len(body)) + c + struct.pack(">I", zlib.crc32(c))

    out = b"\x89PNG\r\n\x1a\n"
    out += chunk(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 6, 0, 0, 0))
    out += chunk(b"IDAT", zlib.compress(raw, 9))
    out += chunk(b"IEND", b"")
    open("assets/textures/animals.png", "wb").write(out)
    print("wrote assets/textures/animals.png (%dx%d)" % (W, H))


if __name__ == "__main__":
    main()
