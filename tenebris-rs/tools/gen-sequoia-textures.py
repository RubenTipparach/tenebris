#!/usr/bin/env python3
"""Generate Sequoia's own terrain/flora textures - from scratch.

Baked-asset path (CLAUDE.md static-asset guidelines): deterministic
16x16 RGBA PNGs under assets/textures/planet_seq/. These are ORIGINAL
procedural textures, not tinted/remixed copies of the stock tiles
(the first cut of the Sporewood reused snow.png under a lavender tint,
which read as "you stole my snow texture" - it did):

  planet_seq_mycelium.png    pale lavender fungal mat: mottled lilac
                             base threaded with lighter hyphae veins
                             and dotted with tiny spores
  planet_seq_shroom_cap.png  dusty-rose toadstool cap: domed shading,
                             cream spots, darker rim flecks
  planet_seq_leaves.png      rust-red redwood foliage: layered leaf
                             clumps, dark shadow gaps, warm highlights

Fixed-seed LCG (no random module) so the files are byte-identical
every run. stdlib + zlib only.

Run from tenebris-rs/:  python tools/gen-sequoia-textures.py
"""

import struct
import zlib

TEX = "assets/textures/planet_seq"
SZ = 16

_seed = [0x5E90_1A5E]


def rnd():
    """LCG in [0, 1) - deterministic across runs/platforms."""
    _seed[0] = (_seed[0] * 1103515245 + 12345) & 0x7FFFFFFF
    return _seed[0] / 0x80000000


def write_png(path, px):
    def chunk(typ, data):
        c = struct.pack(">I", len(data)) + typ + data
        return c + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF)

    raw = b"".join(
        b"\x00" + bytes(px[y * SZ * 4 : (y + 1) * SZ * 4]) for y in range(SZ)
    )
    open(path, "wb").write(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", SZ, SZ, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def blank():
    return bytearray(SZ * SZ * 4)


def put(px, x, y, r, g, b):
    i = ((y % SZ) * SZ + (x % SZ)) * 4
    px[i] = max(0, min(255, int(r)))
    px[i + 1] = max(0, min(255, int(g)))
    px[i + 2] = max(0, min(255, int(b)))
    px[i + 3] = 255


def mycelium():
    """Lavender fungal mat: mottled base + hyphae veins + spores."""
    px = blank()
    for y in range(SZ):
        for x in range(SZ):
            m = rnd()
            # Lilac base, gently mottled.
            r, g, b = 168 + m * 26, 152 + m * 24, 196 + m * 30
            put(px, x, y, r, g, b)
    # Hyphae: pale winding threads (random walks).
    for _ in range(5):
        x, y = int(rnd() * SZ), int(rnd() * SZ)
        for _ in range(9):
            put(px, x, y, 214, 206, 234)
            x += 1 if rnd() < 0.5 else 0
            y += 1 if rnd() < 0.35 else (-1 if rnd() < 0.3 else 0)
    # Spores: sparse dark violet dots.
    for _ in range(7):
        put(px, int(rnd() * SZ), int(rnd() * SZ), 118, 96, 152)
    write_png("%s/planet_seq_mycelium.png" % TEX, px)


def shroom_cap():
    """Dusty-rose toadstool cap with cream spots + dark rim flecks."""
    px = blank()
    cx = cy = (SZ - 1) / 2.0
    for y in range(SZ):
        for x in range(SZ):
            # Dome shading: brighter centre, darker toward the edge.
            d = (((x - cx) ** 2 + (y - cy) ** 2) ** 0.5) / (SZ * 0.72)
            k = 1.0 - 0.38 * min(1.0, d)
            m = rnd() * 18
            put(px, x, y, (208 + m) * k, (96 + m * 0.6) * k, (116 + m * 0.7) * k)
    # Classic cream spots, a few clustered pixels each.
    for _ in range(6):
        sx, sy = int(rnd() * SZ), int(rnd() * SZ)
        put(px, sx, sy, 240, 226, 214)
        if rnd() < 0.7:
            put(px, sx + 1, sy, 236, 220, 206)
        if rnd() < 0.5:
            put(px, sx, sy + 1, 232, 216, 202)
    # Dark maroon rim flecks for texture.
    for _ in range(8):
        put(px, int(rnd() * SZ), int(rnd() * SZ), 142, 54, 72)
    write_png("%s/planet_seq_shroom_cap.png" % TEX, px)


def leaves():
    """Rust-red redwood foliage: leaf clumps over shadowed depth."""
    px = blank()
    for y in range(SZ):
        for x in range(SZ):
            m = rnd()
            # Deep red-brown base (the shadowed canopy interior).
            put(px, x, y, 122 + m * 24, 48 + m * 12, 30 + m * 8)
    # Leaf clumps: 2x2-ish blobs of brighter rust, layered.
    for _ in range(22):
        sx, sy = int(rnd() * SZ), int(rnd() * SZ)
        lift = rnd()
        r, g, b = 178 + lift * 44, 72 + lift * 22, 40 + lift * 14
        put(px, sx, sy, r, g, b)
        if rnd() < 0.8:
            put(px, sx + 1, sy, r * 0.92, g * 0.92, b * 0.92)
        if rnd() < 0.6:
            put(px, sx, sy + 1, r * 0.88, g * 0.88, b * 0.88)
    # Warm sunlit highlights on a few leaf tips.
    for _ in range(6):
        put(px, int(rnd() * SZ), int(rnd() * SZ), 232, 128, 62)
    write_png("%s/planet_seq_leaves.png" % TEX, px)


if __name__ == "__main__":
    mycelium()
    shroom_cap()
    leaves()
    print("wrote planet_seq_mycelium / planet_seq_shroom_cap / planet_seq_leaves")
