#!/usr/bin/env python3
"""Bake the biome ground blocks: public/textures/biomes/*.png (16x16).

A biome's look is always its OWN block with its own texture - never a tint
of another block (CLAUDE.md). Drawn the way Pale Blue Dot draws pixel art
(its balatro-pixel-art skill), in stdlib Python:

- every colour drawn comes from one palette, Sweaft-64; `check()` refuses
  to write a texture with a pixel off it (the game's own soil texture,
  reused under each side's lip, is exempt: a texture the game ships is used
  as it is, never redrawn)
- each material is a short ramp (3-5 tones, dark to light) with a visible
  step between tones; no gradients, no anti-aliasing, alpha 0 or 255
- light comes from the top left: every leaf / tuft / needle clump is one
  tone up on its top-left pixels and one or two down on its bottom-right
- a few single bright pixels at most, nothing 1 px thin that must read

Blocks:
  forest_floor  Earth: leaf litter (birch forest)
  dry_grass     Earth: savanna grass
  seq_moss      Sequoia: fern moss (tree-fern lowlands)
  seq_duff      Sequoia: needle duff (redwood forest)

Deterministic. Run from the repo root:  python3 scripts/gen-biome-textures.py
"""
import os
import random
import struct
import zlib

ROOT = os.path.join(os.path.dirname(__file__), '..', 'public', 'textures')
OUT = os.path.join(ROOT, 'biomes')
N = 16

SWEAFT_64 = [
    '#010e1a', '#011c34', '#1f3b52', '#3e586e', '#5d778d', '#92a3b2', '#bfcad7', '#fffefe',
    '#a09f91', '#434137', '#2c2c25', '#161612', '#010000', '#1c020d', '#4a051e', '#841c1d',
    '#d4462b', '#fe6420', '#fb902f', '#faaf5c', '#003227', '#05582d', '#297537', '#559642',
    '#9bb675', '#0c2f44', '#204f63', '#53998b', '#84e3b5', '#c1f1d8', '#191954', '#15578a',
    '#1096c3', '#74effe', '#d2f8ff', '#230c44', '#4f1d83', '#7d2dbd', '#9e3ba2', '#c34988',
    '#dd576d', '#2b1f35', '#3e3551', '#69608b', '#170916', '#2f1525', '#522b2f', '#7d4636',
    '#a8633e', '#e69d69', '#eab798', '#41322c', '#725244', '#ab8465', '#cfaa81', '#561c27',
    '#733126', '#8d4526', '#c56d25', '#2e0d06', '#681712', '#a61e1f', '#d12d41', '#fa3a64',
]


def rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


PALETTE = {rgb(h) for h in SWEAFT_64}

# Ramps, dark to light, every tone from Sweaft-64
RAMPS = {
    'litter': [rgb(h) for h in ('#2f1525', '#522b2f', '#7d4636', '#a8633e', '#c56d25')],
    'leafgreen': [rgb(h) for h in ('#05582d', '#297537', '#559642')],
    'straw': [rgb(h) for h in ('#725244', '#ab8465', '#cfaa81', '#eab798')],
    'drystem': [rgb(h) for h in ('#434137', '#725244', '#a09f91')],
    'moss': [rgb(h) for h in ('#003227', '#05582d', '#297537', '#53998b', '#9bb675')],
    'duff': [rgb(h) for h in ('#2e0d06', '#41322c', '#522b2f', '#725244', '#7d4636')],
}


def check(px, exempt=None):
    """Every drawn pixel on the palette (exempt: a set of (x, y) taken from a shipped texture)."""
    for y, row in enumerate(px):
        for x, p in enumerate(row):
            if exempt and (x, y) in exempt:
                continue
            assert p in PALETTE, f'off-palette pixel {p} at {x},{y}'


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


class Tile:
    """A 16x16 tile that wraps (blocks tile seamlessly), drawn from ramps."""

    def __init__(self, ramp, base):
        self.ramp = ramp
        self.px = [[ramp[base]] * N for _ in range(N)]

    def put(self, x, y, c):
        self.px[y % N][x % N] = c

    def ground(self, rng, ramp, tones, weights):
        """The ground between clumps: a few tones of one ramp, no gradient."""
        for y in range(N):
            for x in range(N):
                self.px[y][x] = ramp[rng.choices(tones, weights)[0]]

    def clump(self, cells, ramp, body):
        """Fill `cells` with ramp[body], one tone up on the top-left edge and
        one down on the bottom-right edge (light from the top left)."""
        s = {(x % N, y % N) for x, y in cells}
        for (x, y) in s:
            lit = ((x - 1) % N, y) not in s or (x, (y - 1) % N) not in s
            dark = ((x + 1) % N, y) not in s or (x, (y + 1) % N) not in s
            t = body + 1 if lit and not dark else body - 1 if dark and not lit else body
            self.put(x, y, ramp[max(0, min(len(ramp) - 1, t))])


def blob(cx, cy, w, h):
    return [(cx + dx, cy + dy) for dy in range(h) for dx in range(w)
            if not (dx in (0, w - 1) and dy in (0, h - 1)) or w < 3 or h < 3]


def forest_floor(rng):
    t = Tile(RAMPS['litter'], 1)
    t.ground(rng, RAMPS['litter'], [0, 1], [2, 3])
    for _ in range(11):                                    # fallen leaves, 3x2 / 2x3
        w, h = rng.choice([(3, 2), (2, 3), (3, 3)])
        t.clump(blob(rng.randrange(N), rng.randrange(N), w, h), RAMPS['litter'], rng.choice([2, 3]))
    for _ in range(3):                                     # a few green leaves still fresh
        t.clump(blob(rng.randrange(N), rng.randrange(N), 2, 2), RAMPS['leafgreen'], 1)
    return t.px


def dry_grass(rng):
    t = Tile(RAMPS['straw'], 1)
    t.ground(rng, RAMPS['straw'], [0, 1], [1, 4])
    for _ in range(14):                                    # tufts: 2 wide, 2-4 tall, leaning
        x, y, h = rng.randrange(N), rng.randrange(N), rng.choice([2, 3, 4])
        lean = rng.choice([-1, 0, 1])
        cells = [(x + (lean if i > h // 2 else 0) + dx, y - i) for i in range(h) for dx in (0, 1)]
        t.clump(cells, RAMPS['straw'], 2)
    for _ in range(4):                                     # dry stems, 2 px
        x, y = rng.randrange(N), rng.randrange(N)
        t.clump([(x, y), (x, y + 1)], RAMPS['drystem'], 1)
    return t.px


def seq_moss(rng):
    t = Tile(RAMPS['moss'], 1)
    t.ground(rng, RAMPS['moss'], [0, 1], [1, 3])
    for _ in range(12):                                    # cushions of moss, rounded
        w, h = rng.choice([(3, 3), (4, 3), (3, 2)])
        t.clump(blob(rng.randrange(N), rng.randrange(N), w, h), RAMPS['moss'], rng.choice([2, 3]))
    for _ in range(3):                                     # single bright spore tips
        t.put(rng.randrange(N), rng.randrange(N), RAMPS['moss'][4])
    return t.px


def seq_duff(rng):
    t = Tile(RAMPS['duff'], 1)
    t.ground(rng, RAMPS['duff'], [0, 1], [2, 3])
    for _ in range(16):                                    # fallen needles, 3-4 px strokes, 2 wide
        x, y = rng.randrange(N), rng.randrange(N)
        d = rng.choice([(1, 0), (0, 1), (1, 1), (1, -1)])
        ln = rng.choice([3, 4])
        cells = [(x + d[0] * i, y + d[1] * i) for i in range(ln)]
        cells += [(cx + (0 if d[0] else 1), cy + (1 if d[0] and not d[1] else 0)) for cx, cy in cells[:2]]
        t.clump(cells, RAMPS['duff'], rng.choice([2, 3]))
    return t.px


def side(rng, top_px, soil, lip=3):
    """The block's side: the game's own soil, under a lip of the top (wavy edge)."""
    px = [list(soil[y % len(soil)][:N]) for y in range(N)]
    drawn = set()
    for x in range(N):
        depth = lip + (1 if rng.random() < 0.4 else 0) - (1 if rng.random() < 0.2 else 0)
        for y in range(depth):
            px[y][x] = top_px[(y + 7) % N][x]
            drawn.add((x, y))
    exempt = {(x, y) for y in range(N) for x in range(N)} - drawn
    return px, exempt


def main():
    os.makedirs(OUT, exist_ok=True)
    rng = random.Random(4242)
    earth_soil = read_png(os.path.join(ROOT, 'dirt.png'))
    seq_soil = read_png(os.path.join(ROOT, 'planet_seq', 'planet_seq_dirt.png'))
    for name, draw, soil in [('forest_floor', forest_floor, earth_soil), ('dry_grass', dry_grass, earth_soil),
                             ('seq_moss', seq_moss, seq_soil), ('seq_duff', seq_duff, seq_soil)]:
        top = draw(rng)
        check(top)
        write_png(os.path.join(OUT, f'{name}.png'), top)
        s, exempt = side(rng, top, soil)
        check(s, exempt)
        write_png(os.path.join(OUT, f'{name}_side.png'), s)
        print('wrote', name)


if __name__ == '__main__':
    main()
