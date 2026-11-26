#!/usr/bin/env python3
"""Bake the tree detail atlas: public/textures/trees.png.

32x32 cells side by side. Cells 0-3 are grey detail patterns the tree
shader multiplies into the vertex colour (one atlas textures every alien
species, tinted per species):

  0  bark     vertical grain with dark cracks
  1  leaves   clumped leaves with dark gaps between them
  2  needles  short diagonal strokes (conifer needles, fern fronds)
  3  smooth   soft mottling (pods, pale bark)

Grey 200 is "no change"; the shader scales by 255/200.

Cells 4 and up are full-colour pixel art for the Earth trees, drawn the
Pale Blue Dot way (Sweaft-64 only - checked - short ramps lit from the top
left, no anti-aliasing); the shader shows them as they are, under the
tree's baked light:

  4  oak bark      furrowed brown ridges
  5  pine bark     red-brown plates with dark seams
  6  birch bark    white bark with dark horizontal lenticels
  7  oak leaves    rounded leaves, deep to bright green
  8  birch leaves  small light yellow-green leaves
  9  pine needles  dark blue-green needle tufts

Every cell tiles. Deterministic, stdlib only. Run from the repo root:
  python3 scripts/gen-tree-textures.py
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


# ---- Earth tree colour cells (Sweaft-64) -----------------------------------
# The palette and its check come from the biome texture generator: one copy.
def _biome_gen():
    import importlib.util
    spec = importlib.util.spec_from_file_location("gen_biome", os.path.join(os.path.dirname(__file__), "gen-biome-textures.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_BG = _biome_gen()


def ramp(*hexes):
    """Sweaft-64 tones, dark to light, as RGB."""
    return [_BG.rgb(h) for h in hexes]


def grid(fill):
    return [[fill] * CELL for _ in range(CELL)]


def put(g, x, y, c):
    g[y % CELL][x % CELL] = c


def oak_bark(rng):
    r = ramp('#2e0d06', '#41322c', '#522b2f', '#725244', '#ab8465')
    g = grid(r[3])
    # vertical ridges: each column band its own tone, lit on the left edge
    x = 0
    while x < CELL:
        w = rng.randrange(3, 6)
        for y in range(CELL):
            for i in range(w):
                put(g, x + i, y, r[4] if i == 0 else (r[3] if i < w - 1 else r[2]))
        x += w
    # deep furrows that wander down, with a lit lip on their left
    for _ in range(7):
        fx, fy = rng.randrange(CELL), rng.randrange(CELL)
        for _ in range(rng.randrange(10, 24)):
            put(g, fx, fy, r[0])
            put(g, fx + 1, fy, r[1])
            fy += 1
            if rng.random() < 0.2:
                fx += rng.choice((-1, 1))
    # a few lit knots
    for _ in range(4):
        kx, ky = rng.randrange(CELL), rng.randrange(CELL)
        put(g, kx, ky, r[4]); put(g, kx + 1, ky, r[3]); put(g, kx, ky + 1, r[2])
    return g


def pine_bark(rng):
    r = ramp('#2e0d06', '#561c27', '#733126', '#8d4526', '#a8633e')
    g = grid(r[1])
    # irregular plates, taller than wide, scattered and overlapping, each
    # with a lit top-left edge and a shadowed foot; dark seams between
    for _ in range(46):
        x, y = rng.randrange(CELL), rng.randrange(CELL)
        w, h = rng.randrange(3, 6), rng.randrange(4, 9)
        base = r[3] if rng.random() < 0.6 else r[2]
        for py in range(h):
            for px in range(w):
                if (px == 0 or py == 0) and rng.random() < 0.85:
                    c = r[4]
                elif py == h - 1 or px == w - 1:
                    c = r[0]
                else:
                    c = base
                put(g, x + px, y + py, c)
    return g


def birch_bark(rng):
    r = ramp('#5d778d', '#92a3b2', '#bfcad7', '#fffefe')
    dark = ramp('#161612', '#2c2c25', '#434137')
    g = grid(r[3])
    # soft grey streaks up the bark
    for x in range(CELL):
        if rng.random() < 0.3:
            for y in range(CELL):
                if rng.random() < 0.7:
                    put(g, x, y, r[2])
    for _ in range(18):
        put(g, rng.randrange(CELL), rng.randrange(CELL), r[1])
    # lenticels: short dark horizontal dashes, a lit grey rim under each
    for _ in range(11):
        lx, ly = rng.randrange(CELL), rng.randrange(CELL)
        w = rng.randrange(3, 8)
        for i in range(w):
            put(g, lx + i, ly, dark[0] if 0 < i < w - 1 else dark[1])
            put(g, lx + i, ly + 1, r[0] if 0 < i < w - 1 else r[1])
        if rng.random() < 0.4:
            put(g, lx + w // 2, ly - 1, dark[2])
    return g


def leaf_cell(rng, ramp_hex, n, rmin, rmax):
    r = ramp(*ramp_hex)
    g = grid(r[0])
    for _ in range(n):
        cx, cy = rng.uniform(0, CELL), rng.uniform(0, CELL)
        rad = rng.uniform(rmin, rmax)
        for y in range(int(cy - rad) - 1, int(cy + rad) + 2):
            for x in range(int(cx - rad) - 1, int(cx + rad) + 2):
                dx, dy = x + 0.5 - cx, y + 0.5 - cy
                if dx * dx + dy * dy <= rad * rad:
                    # lit from the top left: the upper-left of a leaf is brightest
                    k = -(dx + dy) / (2 * rad)
                    tone = 3 if k > 0.25 else (2 if k > -0.15 else 1)
                    put(g, x, y, r[min(len(r) - 1, tone + (1 if rng.random() < 0.06 else 0))])
    return g


def oak_leaves(rng):
    return leaf_cell(rng, ('#003227', '#05582d', '#297537', '#559642', '#9bb675'), 60, 1.8, 3.0)


def birch_leaves(rng):
    return leaf_cell(rng, ('#05582d', '#297537', '#559642', '#9bb675', '#c1f1d8'), 90, 1.2, 2.2)


def pine_needles(rng):
    r = ramp('#003227', '#003227', '#204f63', '#05582d', '#297537', '#559642')
    g = grid(r[0])
    for _ in range(26):
        cx, cy = rng.randrange(CELL), rng.randrange(CELL)
        # a tuft: needles fanning down from a twig, lit ones on the left
        for k in range(-3, 4):
            ln = rng.randrange(3, 6)
            for i in range(ln):
                tone = 5 if (k < 0 and i < 2) else (4 if k <= 0 else (3 if i < ln - 1 else 2))
                put(g, cx + k * (i + 1) // 3, cy + i, r[tone])
        put(g, cx, cy, r[1])
    return g


def main():
    rng = random.Random(1234)
    cells = [bark(rng), leaves(rng), needles(rng), smooth(rng)]
    colour = [oak_bark(rng), pine_bark(rng), birch_bark(rng), oak_leaves(rng), birch_leaves(rng), pine_needles(rng)]
    for c in colour:
        _BG.check(c)
    rows = []
    for y in range(CELL):
        row = []
        for c in cells:
            for x in range(CELL):
                v = clamp(c[y][x])
                row += [v, v, v, 255]
        for c in colour:
            for x in range(CELL):
                row += list(c[y][x]) + [255]
        rows.append(row)
    png(OUT, CELL * (len(cells) + len(colour)), CELL, rows)
    print('wrote', os.path.normpath(OUT))


if __name__ == '__main__':
    main()
