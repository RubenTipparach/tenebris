#!/usr/bin/env python3
"""Generate the cactus scatter texture.

Baked-asset path (CLAUDE.md static-asset guidelines): a deterministic
16x16 RGBA PNG under assets/textures/, sampled by the terrain atlas
for the desert cactus scatter prisms (hex_mesher::build_scatter).
Lime green with darker vertical ribs and pale spine flecks, so the
saguaros pop against the sand instead of borrowing the tree-leaf
green. stdlib + zlib only; byte-identical every run.

Run from tenebris-rs/:  python tools/gen-cactus-texture.py
"""

import struct
import zlib

S = 16

# Deterministic value noise via a fixed-seed LCG (no Math.random - the
# texture must be byte-identical every run).
_seed = [0x0CAC_0705]


def rnd():
    _seed[0] = (_seed[0] * 1103515245 + 12345) & 0x7FFFFFFF
    return _seed[0] / 0x7FFFFFFF


def main():
    px = bytearray(S * S * 4)
    base = (142, 214, 66)   # lime flesh
    rib = (96, 168, 44)     # recessed rib shadow
    edge = (170, 232, 96)   # lit rib crest
    spine = (238, 244, 186) # pale spine fleck
    for y in range(S):
        for x in range(S):
            # Vertical ribs every 4 columns: shadow line, lit crest
            # beside it, flesh between.
            band = x % 4
            if band == 0:
                c = rib
            elif band == 1:
                c = edge
            else:
                c = base
            # Slight per-pixel flesh variation so it doesn't band flat.
            j = int((rnd() - 0.5) * 14)
            c = (
                max(0, min(255, c[0] + j)),
                max(0, min(255, c[1] + j)),
                max(0, min(255, c[2] + j // 2)),
            )
            # Sparse spines riding the crests.
            if band == 1 and rnd() < 0.18:
                c = spine
            i = (y * S + x) * 4
            px[i : i + 4] = bytes((c[0], c[1], c[2], 255))

    raw = b""
    for y in range(S):
        raw += b"\x00" + bytes(px[y * S * 4 : (y + 1) * S * 4])

    def chunk(typ, body):
        c = typ + body
        return struct.pack(">I", len(body)) + c + struct.pack(">I", zlib.crc32(c))

    out = b"\x89PNG\r\n\x1a\n"
    out += chunk(b"IHDR", struct.pack(">IIBBBBB", S, S, 8, 6, 0, 0, 0))
    out += chunk(b"IDAT", zlib.compress(raw, 9))
    out += chunk(b"IEND", b"")
    open("assets/textures/cactus.png", "wb").write(out)
    print("wrote assets/textures/cactus.png")


if __name__ == "__main__":
    main()
