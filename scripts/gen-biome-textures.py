#!/usr/bin/env python3
"""Bake the biome ground textures: public/textures/biomes/*.png (16x16).

Four biome surface blocks, each a top and a side (the side is the planet's
own soil, read from its dirt texture, under a lip of the top):

  forest_floor  Earth: leaf litter over damp soil (birch forest)
  dry_grass     Earth: sun-bleached savanna grass
  seq_moss      Sequoia: lush teal fern moss (tree-fern lowlands)
  seq_duff      Sequoia: rust-red needle duff (redwood forest floor)

Deterministic, stdlib only. Run from the repo root:
  python3 scripts/gen-biome-textures.py
"""
import os
import random
import struct
import zlib

ROOT = os.path.join(os.path.dirname(__file__), '..', 'public', 'textures')
OUT = os.path.join(ROOT, 'biomes')
N = 16


def read_png(path):
    """Minimal 8-bit RGBA/RGB non-interlaced PNG reader -> rows of (r,g,b)."""
    d = open(path, 'rb').read()
    i, idat = 8, b''
    while i < len(d):
        ln = struct.unpack('>I', d[i:i + 4])[0]
        t, c = d[i + 4:i + 8], d[i + 8:i + 8 + ln]
        if t == b'IHDR':
            w, h, bd, ct = struct.unpack('>IIBB', c[:10])
        elif t == b'IDAT':
            idat += c
        i += 12 + ln
    bpp = {6: 4, 2: 3}[ct]
    raw = zlib.decompress(idat)
    rows, prev, p = [], bytearray(w * bpp), 0
    for _ in range(h):
        f = raw[p]; p += 1
        line = bytearray(raw[p:p + w * bpp]); p += w * bpp
        for x in range(len(line)):
            a = line[x - bpp] if x >= bpp else 0
            b = prev[x]
            c = prev[x - bpp] if x >= bpp else 0
            if f == 1: line[x] = (line[x] + a) & 255
            elif f == 2: line[x] = (line[x] + b) & 255
            elif f == 3: line[x] = (line[x] + (a + b) // 2) & 255
            elif f == 4:
                pa, pb, pc = abs(b - c), abs(a - c), abs(a + b - 2 * c)
                pr = a if pa <= pb and pa <= pc else (b if pb <= pc else c)
                line[x] = (line[x] + pr) & 255
        rows.append([tuple(line[x * bpp:x * bpp + 3]) for x in range(w)])
        prev = line
    return rows


def write_png(path, px):
    raw = b''.join(b'\x00' + bytes(v for p in row for v in (*p, 255)) for row in px)
    def chunk(t, dd):
        return struct.pack('>I', len(dd)) + t + dd + struct.pack('>I', zlib.crc32(t + dd) & 0xffffffff)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', N, N, 8, 6, 0, 0, 0))
                + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))


def pick(rng, palette, weights):
    return rng.choices(palette, weights)[0]


def top(rng, palette, weights, blobs=None):
    px = [[pick(rng, palette, weights) for _ in range(N)] for _ in range(N)]
    for (col, count, size) in blobs or []:
        for _ in range(count):
            x, y = rng.randrange(N), rng.randrange(N)
            for dy in range(size):
                for dx in range(size - dy):
                    px[(y + dy) % N][(x + dx) % N] = col
    return px


def side(rng, top_px, soil, lip):
    """Soil texture with `lip` rows of the top hanging over the edge."""
    px = [list(soil[y % len(soil)][:N]) for y in range(N)]
    for x in range(N):
        depth = lip + (1 if rng.random() < 0.4 else 0)
        for y in range(depth):
            px[y][x] = top_px[(y * 5 + x) % N][x]
    return px


def main():
    os.makedirs(OUT, exist_ok=True)
    rng = random.Random(4242)
    earth_soil = read_png(os.path.join(ROOT, 'dirt.png'))
    seq_soil = read_png(os.path.join(ROOT, 'planet_seq', 'planet_seq_dirt.png'))
    blocks = {
        # leaf litter: browns and ochres with a few green and dark gaps
        'forest_floor': (earth_soil, top(rng,
            [(92, 62, 40), (112, 76, 46), (72, 50, 34), (132, 92, 54), (74, 96, 46), (150, 104, 52)],
            [5, 5, 4, 3, 2, 1], [((54, 38, 28), 6, 2), ((160, 116, 56), 4, 2)])),
        # savanna: pale straw with darker stems
        'dry_grass': (earth_soil, top(rng,
            [(184, 160, 84), (164, 142, 70), (200, 178, 98), (138, 126, 62), (118, 116, 58)],
            [5, 4, 3, 2, 2], [((104, 98, 50), 8, 1)])),
        # fern moss: teal-green, soft
        'seq_moss': (seq_soil, top(rng,
            [(46, 120, 96), (58, 142, 108), (78, 166, 118), (36, 98, 82), (104, 186, 128)],
            [5, 4, 3, 3, 1], [((30, 80, 70), 6, 2), ((128, 204, 140), 4, 1)])),
        # needle duff: rust and umber
        'seq_duff': (seq_soil, top(rng,
            [(98, 50, 34), (116, 60, 38), (82, 42, 30), (134, 76, 46), (66, 36, 28)],
            [5, 4, 3, 2, 2], [((150, 92, 54), 6, 1), ((52, 28, 24), 5, 2)])),
    }
    for name, (soil, t) in blocks.items():
        write_png(os.path.join(OUT, f'{name}.png'), t)
        write_png(os.path.join(OUT, f'{name}_side.png'), side(rng, t, soil, 3))
        print('wrote', name)


if __name__ == '__main__':
    main()
