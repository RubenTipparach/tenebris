#!/usr/bin/env python3
"""Bake the tree detail atlas: public/textures/trees.png.

Four 32x32 cells side by side (128x32), each a grey detail pattern that the
tree shader multiplies into the vertex colour (so one atlas textures every
species, tinted per species):

  0  bark     vertical grain with dark cracks
  1  leaves   clumped leaves with dark gaps between them
  2  needles  short diagonal strokes (conifer needles, fern fronds)
  3  smooth   soft mottling (pods, pale bark)

Grey 200 is "no change"; the shader scales by 255/200. Deterministic, stdlib
only. Run from the repo root:  python3 scripts/gen-tree-textures.py
"""
import os
import random
import struct
import zlib

CELL = 32
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'textures', 'trees.png')


def png(path, w, h, rows):
    raw = b''.join(b'\x00' + bytes(r) for r in rows)
    def chunk(t, d):
        c = struct.pack('>I', len(d)) + t + d
        return c + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    data = (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
            + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(data)


def clamp(v):
    return max(0, min(255, int(v)))


def bark(rng):
    g = [[0] * CELL for _ in range(CELL)]
    col = [rng.uniform(-18, 18) for _ in range(CELL)]
    for x in range(CELL):
        for y in range(CELL):
            g[y][x] = 200 + col[x] + rng.uniform(-10, 10)
    # vertical cracks that wander
    for _ in range(6):
        x = rng.randrange(CELL)
        y = rng.randrange(CELL)
        for _ in range(rng.randrange(8, 20)):
            g[y % CELL][x % CELL] = 120
            y += 1
            if rng.random() < 0.25:
                x += rng.choice((-1, 1))
    return g


def leaves(rng):
    g = [[120 + rng.uniform(-10, 10) for _ in range(CELL)] for _ in range(CELL)]
    for _ in range(70):
        cx, cy = rng.uniform(0, CELL), rng.uniform(0, CELL)
        r = rng.uniform(1.5, 3.2)
        shade = rng.uniform(185, 235)
        for y in range(int(cy - r) - 1, int(cy + r) + 2):
            for x in range(int(cx - r) - 1, int(cx + r) + 2):
                d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
                if d <= r:
                    # lit from the top-left inside each leaf
                    g[y % CELL][x % CELL] = shade + 18 * ((cy - y) + (cx - x)) / r
    return g


def needles(rng):
    g = [[150 + rng.uniform(-10, 10) for _ in range(CELL)] for _ in range(CELL)]
    for _ in range(140):
        x, y = rng.randrange(CELL), rng.randrange(CELL)
        d = rng.choice((-1, 1))
        v = rng.uniform(190, 240)
        for i in range(rng.randrange(3, 6)):
            g[(y + i) % CELL][(x + d * i) % CELL] = v - i * 6
    return g


def smooth(rng):
    g = [[200 + rng.uniform(-6, 6) for _ in range(CELL)] for _ in range(CELL)]
    for _ in range(14):
        cx, cy, r = rng.uniform(0, CELL), rng.uniform(0, CELL), rng.uniform(2, 5)
        k = rng.uniform(-25, 15)
        for y in range(int(cy - r), int(cy + r) + 1):
            for x in range(int(cx - r), int(cx + r) + 1):
                if (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                    g[y % CELL][x % CELL] += k
    return g


def main():
    rng = random.Random(1234)
    cells = [bark(rng), leaves(rng), needles(rng), smooth(rng)]
    rows = []
    for y in range(CELL):
        row = []
        for c in cells:
            for x in range(CELL):
                v = clamp(c[y][x])
                row += [v, v, v, 255]
        rows.append(row)
    png(OUT, CELL * len(cells), CELL, rows)
    print('wrote', os.path.normpath(OUT))


if __name__ == '__main__':
    main()
