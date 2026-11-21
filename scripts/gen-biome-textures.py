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
  seq_scrub     Sequoia: dry scrub - its beige ground with clumps of dry
                olive grass (tree-fern lowlands). Sequoia's palette is beige
                and dry grass green; it has no lush green grass
  seq_duff      Sequoia: needle duff (redwood forest)

Also the Moon's ore blocks (public/textures/moon/ore_*.png): moon.png with
the mineral drawn into it as lit nodules.

And the living alien worlds' grounds (public/textures/alien/<planet>_<ground>.png),
three per planet, each side the planet's own rock (planets/<id>.png, reused as
shipped) under a lip of the top:
  cinder   embermoss (glowing red-orange cushions on charcoal), ash (grey ash
           plains with ember specks), sulfur (orange-yellow crust, dark cracks)
  vesper   clay (rose clay pans, cracked), dune (orange sand in ripples),
           salt (white salt polygons)
  halcyon  moss (verdigris cushions), geode (amethyst gravel with glints),
           glass (mint glass sand, sparkles)
  tessaly  snowmoss (lilac moss on snow), frost (frost crust with ice stars),
           glaze (blue glaze plates, cracked)
  umbra    moss (indigo moss with glowing specks), mycel (violet mycelium
           threads), shale (black shale plates)

And the jungle moons' blocks (public/textures/alien/<moon>_<block>.png):
  verdance jungle (emerald broad-leaf litter), swamp (olive mangrove mud with
           pools and algae), bank (pale wet sand, pebbles), soil (red
           laterite), rock (grey-blue rock with moss)
  mirewood jungle (lime and teal leaves, magenta blossoms), swamp (black peat
           under duckweed), bank (grey silt), soil (dark peat soil), rock
           (banded violet-grey rock)
  The ground tops' sides are the moon's own soil under a lip.

And the industry resource blocks (public/textures/resources/*.png, all faces):
  clay         Earth's shore clay: grey-brown slabs with drying cracks
  oil_sand     dark tar-soaked sand with glossy tar beads
  ore_uranium  dark rock with green uraninite nodules

And the building blocks (public/textures/building/*.png, all faces):
  brick_block   running-bond brick with mortar joints
  concrete      cast grey with a formwork seam and tie-holes
  steel_girder  an open steel truss (alpha-cut gaps, drawn with the glass shader)
  steel_glass   clear panes in a steel frame with a cross mullion

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
SWEAFT_RGB0 = rgb(SWEAFT_64[0])  # stands in for a transparent pixel when checking

# Ramps, dark to light, every tone from Sweaft-64
RAMPS = {
    'litter': [rgb(h) for h in ('#2f1525', '#522b2f', '#7d4636', '#a8633e', '#c56d25')],
    'leafgreen': [rgb(h) for h in ('#05582d', '#297537', '#559642')],
    'straw': [rgb(h) for h in ('#725244', '#ab8465', '#cfaa81', '#eab798')],
    'drystem': [rgb(h) for h in ('#434137', '#725244', '#a09f91')],
    'seqground': [rgb(h) for h in ('#725244', '#ab8465', '#cfaa81', '#eab798')],
    'dryolive': [rgb(h) for h in ('#434137', '#a09f91', '#9bb675', '#cfaa81')],
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
    """Minimal 8-bit RGBA/RGB/indexed non-interlaced PNG reader -> rows of (r,g,b)."""
    d = open(path, 'rb').read()
    i, idat, plte = 8, b'', None
    while i < len(d):
        ln = struct.unpack('>I', d[i:i + 4])[0]
        t, c = d[i + 4:i + 8], d[i + 8:i + 8 + ln]
        if t == b'IHDR':
            w, h, bd, ct = struct.unpack('>IIBB', c[:10])
        elif t == b'PLTE':
            plte = [tuple(c[k:k + 3]) for k in range(0, len(c), 3)]
        elif t == b'IDAT':
            idat += c
        i += 12 + ln
    assert bd == 8, f'{path}: only 8-bit PNGs'
    bpp = {6: 4, 2: 3, 3: 1}[ct]
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
        if ct == 3:   # palette-indexed
            rows.append([plte[line[x]] for x in range(w)])
        else:
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


def seq_scrub(rng):
    t = Tile(RAMPS['seqground'], 2)
    t.ground(rng, RAMPS['seqground'], [1, 2], [2, 3])      # Sequoia's beige ground
    for _ in range(9):                                     # dry olive scrub clumps
        w, h = rng.choice([(3, 2), (2, 3), (3, 3)])
        t.clump(blob(rng.randrange(N), rng.randrange(N), w, h), RAMPS['dryolive'], rng.choice([1, 2]))
    for _ in range(5):                                     # pale bleached grass blades
        x, y = rng.randrange(N), rng.randrange(N)
        t.clump([(x, y), (x + 1, y), (x, y - 1)], RAMPS['seqground'], 3)
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


# Moon minerals: veins in the Moon's own rock (moon.png, reused as shipped),
# with the mineral drawn in palette ramps as lit nodules
MOON_ORES = {
    'iron': [rgb(h) for h in ('#522b2f', '#7d4636', '#a8633e', '#e69d69')],       # rusty iron oxide
    'aluminum': [rgb(h) for h in ('#92a3b2', '#bfcad7', '#fffefe')],            # bright anorthosite
    'cobalt': [rgb(h) for h in ('#191954', '#15578a', '#1096c3', '#74effe')],
    'lithium': [rgb(h) for h in ('#4f1d83', '#7d2dbd', '#9e3ba2', '#c34988')],
    # ilmenite: black titanium-iron oxide with a steel-violet metallic sheen
    # (last, so the shared rng leaves the ores above unchanged)
    'titanium': [rgb(h) for h in ('#161612', '#2b1f35', '#3e3551', '#69608b', '#bfcad7')],
}


def moon_ore(rng, rock, ramp):
    px = [list(rock[y % len(rock)][:N]) for y in range(N)]
    t = Tile(ramp, 1)
    t.px = px
    drawn = set()
    for _ in range(5):                                     # nodules, 2x2 to 3x3
        w, h = rng.choice([(2, 2), (3, 2), (2, 3), (3, 3)])
        cells = blob(rng.randrange(N), rng.randrange(N), w, h)
        t.clump(cells, ramp, 1)
        drawn |= {(x % N, y % N) for x, y in cells}
    for _ in range(2):                                     # a glint or two
        x, y = rng.choice(sorted(drawn))
        t.put(x, y, ramp[-1])
    exempt = {(x, y) for y in range(N) for x in range(N)} - drawn
    return t.px, exempt


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


# ---- The living alien worlds ------------------------------------------------

def R(*hs):
    return [rgb(h) for h in hs]


ALIEN = {
    'charcoal': R('#010000', '#161612', '#2c2c25', '#434137'),
    'ember': R('#2e0d06', '#681712', '#a61e1f', '#d4462b', '#fe6420', '#fb902f'),
    'ash': R('#2c2c25', '#434137', '#a09f91', '#bfcad7'),
    'sulfur': R('#2e0d06', '#8d4526', '#c56d25', '#fb902f', '#faaf5c'),
    'rose': R('#561c27', '#841c1d', '#c34988', '#dd576d', '#e69d69'),
    'dune': R('#8d4526', '#c56d25', '#fb902f', '#faaf5c', '#eab798'),
    'salt': R('#5d778d', '#92a3b2', '#bfcad7', '#fffefe'),
    'verdigris': R('#0c2f44', '#204f63', '#53998b', '#84e3b5', '#c1f1d8'),
    'amethyst': R('#230c44', '#4f1d83', '#7d2dbd', '#9e3ba2', '#d2f8ff'),
    'mint': R('#53998b', '#84e3b5', '#c1f1d8', '#fffefe'),
    'snow': R('#92a3b2', '#bfcad7', '#d2f8ff', '#fffefe'),
    'lilac': R('#2b1f35', '#3e3551', '#69608b', '#9e3ba2', '#c34988'),
    'frost': R('#3e586e', '#5d778d', '#92a3b2', '#d2f8ff', '#fffefe'),
    'glaze': R('#011c34', '#15578a', '#1096c3', '#74effe', '#d2f8ff'),
    'indigo': R('#010e1a', '#191954', '#2b1f35', '#3e3551', '#69608b'),
    'glow': R('#15578a', '#1096c3', '#74effe', '#d2f8ff'),
    'mycel': R('#170916', '#230c44', '#4f1d83', '#7d2dbd', '#9e3ba2', '#c34988'),
    'shale': R('#010000', '#161612', '#2c2c25', '#1f3b52', '#3e586e'),
}


def cushions(t, rng, ramp, n, bodies, sizes=((3, 2), (2, 3), (3, 3), (4, 3))):
    for _ in range(n):
        w, h = rng.choice(sizes)
        t.clump(blob(rng.randrange(N), rng.randrange(N), w, h), ramp, rng.choice(bodies))


def specks(t, rng, colour, n):
    for _ in range(n):
        t.put(rng.randrange(N), rng.randrange(N), colour)


def cracks(t, rng, colour, n, length):
    for _ in range(n):
        x, y = rng.randrange(N), rng.randrange(N)
        d = rng.choice([(1, 0), (0, 1), (1, 1), (1, -1)])
        for _ in range(length):
            t.put(x, y, colour)
            if rng.random() < 0.35:
                d = rng.choice([(1, 0), (0, 1), (1, 1), (1, -1)])
            x, y = x + d[0], y + d[1]


def plates(t, rng, ramp, cell, line):
    """Polygon plates: a jittered grid of cells, each one tone, edged in `line`."""
    pts = [((gx * cell + rng.randrange(cell)) % N, (gy * cell + rng.randrange(cell)) % N, rng.choice(range(1, len(ramp))))
           for gy in range(N // cell) for gx in range(N // cell)]
    owner = {}
    for y in range(N):
        for x in range(N):
            best = None
            for i, (px, py, _) in enumerate(pts):
                dx = min(abs(x - px), N - abs(x - px)); dy = min(abs(y - py), N - abs(y - py))
                d = dx * dx + dy * dy
                if best is None or d < best[0]:
                    best = (d, i)
            owner[(x, y)] = best[1]
            t.put(x, y, ramp[pts[best[1]][2]])
    for y in range(N):
        for x in range(N):
            if owner[(x, y)] != owner[((x + 1) % N, y)] or owner[(x, y)] != owner[(x, (y + 1) % N)]:
                t.put(x, y, line)
    # light from the top left: the pixel under/right of an edge is one up
    for y in range(N):
        for x in range(N):
            o = owner[(x, y)]
            if t.px[y][x] != line and (owner[((x - 1) % N, y)] != o or owner[(x, (y - 1) % N)] != o):
                k = pts[o][2]
                t.put(x, y, ramp[min(len(ramp) - 1, k + 1)])


def cinder_embermoss(rng):
    t = Tile(ALIEN['charcoal'], 1)
    t.ground(rng, ALIEN['charcoal'], [0, 1, 2], [1, 3, 2])
    cushions(t, rng, ALIEN['ember'], 13, [2, 3, 4], ((3, 3), (4, 3), (3, 4), (4, 4)))
    specks(t, rng, ALIEN['ember'][5], 4)
    return t.px


def cinder_ash(rng):
    t = Tile(ALIEN['ash'], 1)
    t.ground(rng, ALIEN['ash'], [0, 1], [2, 5])
    cushions(t, rng, ALIEN['ash'], 7, [1, 2], ((3, 2), (4, 2), (2, 2)))
    specks(t, rng, ALIEN['ember'][4], 3)
    specks(t, rng, ALIEN['ember'][3], 3)
    return t.px


def cinder_sulfur(rng):
    t = Tile(ALIEN['sulfur'], 3)
    plates(t, rng, ALIEN['sulfur'][1:], 5, ALIEN['sulfur'][0])
    specks(t, rng, ALIEN['sulfur'][4], 3)
    return t.px


def vesper_clay(rng):
    t = Tile(ALIEN['rose'], 2)
    plates(t, rng, ALIEN['rose'][1:], 6, ALIEN['rose'][0])
    return t.px


def vesper_dune(rng):
    t = Tile(ALIEN['dune'], 2)
    t.ground(rng, ALIEN['dune'], [2, 3], [3, 2])
    for k in range(4):                                     # ripples: wavy 2 px bands, lit edge above
        y0 = k * 4
        for x in range(N):
            y = y0 + (1 if (x // 3 + k) % 4 in (1, 2) else 0)
            t.put(x, y, ALIEN['dune'][4])
            t.put(x, y + 1, ALIEN['dune'][1])
            t.put(x, y + 2, ALIEN['dune'][0] if x % 5 == 0 else ALIEN['dune'][1])
    return t.px


def vesper_salt(rng):
    t = Tile(ALIEN['salt'], 2)
    plates(t, rng, ALIEN['salt'][1:], 5, ALIEN['salt'][0])
    return t.px


def halcyon_moss(rng):
    t = Tile(ALIEN['verdigris'], 1)
    t.ground(rng, ALIEN['verdigris'], [0, 1], [1, 3])
    cushions(t, rng, ALIEN['verdigris'], 12, [2, 3])
    specks(t, rng, ALIEN['verdigris'][4], 3)
    return t.px


def halcyon_geode(rng):
    t = Tile(ALIEN['amethyst'], 0)
    t.ground(rng, ALIEN['amethyst'], [0, 1], [3, 2])
    cushions(t, rng, ALIEN['amethyst'], 14, [2], ((2, 2), (3, 2), (2, 3)))
    specks(t, rng, ALIEN['amethyst'][4], 4)
    return t.px


def halcyon_glass(rng):
    t = Tile(ALIEN['mint'], 1)
    t.ground(rng, ALIEN['mint'], [0, 1, 2], [1, 4, 2])
    cushions(t, rng, ALIEN['mint'], 5, [1], ((3, 2), (2, 2)))
    specks(t, rng, ALIEN['mint'][3], 6)
    return t.px


def tessaly_snowmoss(rng):
    t = Tile(ALIEN['snow'], 2)
    t.ground(rng, ALIEN['snow'], [1, 2, 3], [2, 3, 2])
    cushions(t, rng, ALIEN['lilac'], 11, [2, 3], ((3, 3), (4, 3), (3, 2)))
    return t.px


def tessaly_frost(rng):
    t = Tile(ALIEN['frost'], 2)
    t.ground(rng, ALIEN['frost'], [1, 2], [2, 3])
    for _ in range(6):                                     # ice stars: a lit plus with a bright heart
        x, y = rng.randrange(N), rng.randrange(N)
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            t.put(x + dx, y + dy, ALIEN['frost'][3])
        t.put(x + 1, y + 1, ALIEN['frost'][0])
        t.put(x, y, ALIEN['frost'][4])
    return t.px


def tessaly_glaze(rng):
    t = Tile(ALIEN['glaze'], 2)
    plates(t, rng, ALIEN['glaze'][1:], 8, ALIEN['glaze'][0])
    specks(t, rng, ALIEN['glaze'][4], 4)
    return t.px


def umbra_moss(rng):
    t = Tile(ALIEN['indigo'], 1)
    t.ground(rng, ALIEN['indigo'], [0, 1], [2, 3])
    cushions(t, rng, ALIEN['indigo'], 11, [2, 3])
    for _ in range(4):                                     # glowing spore specks, a lit pair
        x, y = rng.randrange(N), rng.randrange(N)
        t.put(x, y, ALIEN['glow'][2])
        t.put(x + 1, y, ALIEN['glow'][1])
    return t.px


def umbra_mycel(rng):
    t = Tile(ALIEN['mycel'], 1)
    t.ground(rng, ALIEN['mycel'], [0, 1], [2, 3])
    for _ in range(9):                                     # threads, 2 wide, lit on top
        x, y = rng.randrange(N), rng.randrange(N)
        d = rng.choice([(1, 0), (1, 1), (1, -1)])
        cells = []
        for i in range(rng.choice([4, 5, 6])):
            cells += [(x, y), (x, y + 1)]
            if rng.random() < 0.3:
                d = rng.choice([(1, 0), (1, 1), (1, -1)])
            x, y = x + d[0], y + d[1]
        t.clump(cells, ALIEN['mycel'], 3)
    specks(t, rng, ALIEN['mycel'][5], 3)
    return t.px


def umbra_shale(rng):
    t = Tile(ALIEN['shale'], 1)
    for y in range(N):                                     # layered plates: bands of one tone
        band = (y // 3) % 3
        for x in range(N):
            t.put(x, y, ALIEN['shale'][1 + band if band < 2 else 1])
    for k in range(N // 3):                                # a lit lip on each layer, broken
        y = k * 3
        for x in range(N):
            if (x + k * 5) % 7 < 5:
                t.put(x, y, ALIEN['shale'][4] if (x + k) % 6 == 0 else ALIEN['shale'][3])
    cracks(t, rng, ALIEN['shale'][0], 3, 3)
    return t.px


ALIEN_GROUNDS = {
    'cinder': [('embermoss', cinder_embermoss), ('ash', cinder_ash), ('sulfur', cinder_sulfur)],
    'vesper': [('clay', vesper_clay), ('dune', vesper_dune), ('salt', vesper_salt)],
    'halcyon': [('moss', halcyon_moss), ('geode', halcyon_geode), ('glass', halcyon_glass)],
    'tessaly': [('snowmoss', tessaly_snowmoss), ('frost', tessaly_frost), ('glaze', tessaly_glaze)],
    'umbra': [('moss', umbra_moss), ('mycel', umbra_mycel), ('shale', umbra_shale)],
}


def alien_grounds():
    out = os.path.join(ROOT, 'alien')
    os.makedirs(out, exist_ok=True)
    arng = random.Random(4545)                             # own rng: the tiles above don't change
    for planet, grounds in ALIEN_GROUNDS.items():
        rock = read_png(os.path.join(ROOT, 'planets', f'{planet}.png'))
        for name, draw in grounds:
            top = draw(arng)
            check(top)
            write_png(os.path.join(out, f'{planet}_{name}.png'), top)
            s, exempt = side(arng, top, rock)
            check(s, exempt)
            write_png(os.path.join(out, f'{planet}_{name}_side.png'), s)
            print('wrote', planet, name)


JUNGLE = {
    'emerald': R('#003227', '#05582d', '#297537', '#559642', '#9bb675'),
    'mud': R('#161612', '#2c2c25', '#434137', '#725244'),
    'pool': R('#0c2f44', '#204f63', '#53998b'),
    'wetsand': R('#725244', '#ab8465', '#cfaa81', '#eab798'),
    'laterite': R('#2e0d06', '#561c27', '#733126', '#8d4526', '#a8633e'),
    'bluerock': R('#011c34', '#1f3b52', '#3e586e', '#5d778d', '#92a3b2'),
    'lime': R('#0c2f44', '#05582d', '#297537', '#53998b', '#9bb675', '#c1f1d8'),
    'peat': R('#010000', '#161612', '#2b1f35', '#41322c'),
    'duckweed': R('#297537', '#559642', '#9bb675'),
    'silt': R('#434137', '#5d778d', '#92a3b2', '#a09f91'),
    'darksoil': R('#170916', '#2f1525', '#41322c', '#522b2f'),
    'band': R('#170916', '#2b1f35', '#3e3551', '#69608b', '#92a3b2'),
}


def leaves(t, rng, ramp, n, bodies):
    """Broad leaves, 3x2 / 2x3 / 4x2, lit from the top left."""
    cushions(t, rng, ramp, n, bodies, ((3, 2), (2, 3), (4, 2), (3, 3)))


def verdance_jungle(rng):
    t = Tile(JUNGLE['emerald'], 1)
    t.ground(rng, JUNGLE['emerald'], [0, 1], [2, 3])
    leaves(t, rng, JUNGLE['emerald'], 14, [2, 3])
    specks(t, rng, rgb('#fe6420'), 2)                      # a fallen fruit or two
    return t.px


def verdance_swamp(rng):
    t = Tile(JUNGLE['mud'], 2)
    t.ground(rng, JUNGLE['mud'], [1, 2], [3, 2])
    for _ in range(3):                                     # dark pools
        t.clump(blob(rng.randrange(N), rng.randrange(N), 4, 3), JUNGLE['pool'], 1)
    cushions(t, rng, JUNGLE['emerald'], 6, [2], ((2, 2), (3, 2)))  # algae and seedlings
    return t.px


def verdance_bank(rng):
    t = Tile(JUNGLE['wetsand'], 1)
    t.ground(rng, JUNGLE['wetsand'], [1, 2], [3, 2])
    cushions(t, rng, JUNGLE['wetsand'], 5, [1], ((2, 2), (3, 2)))
    cushions(t, rng, JUNGLE['bluerock'], 3, [2], ((2, 2),))
    return t.px


def verdance_soil(rng):
    t = Tile(JUNGLE['laterite'], 2)
    t.ground(rng, JUNGLE['laterite'], [1, 2, 3], [2, 4, 2])
    cushions(t, rng, JUNGLE['laterite'], 5, [3], ((2, 2), (3, 2)))
    specks(t, rng, JUNGLE['laterite'][0], 6)
    return t.px


def verdance_rock(rng):
    t = Tile(JUNGLE['bluerock'], 2)
    plates(t, rng, JUNGLE['bluerock'][1:], 6, JUNGLE['bluerock'][0])
    cushions(t, rng, JUNGLE['emerald'], 4, [2], ((3, 2), (2, 2)))   # moss
    return t.px


def mirewood_jungle(rng):
    t = Tile(JUNGLE['lime'], 2)
    t.ground(rng, JUNGLE['lime'], [1, 2], [2, 3])
    leaves(t, rng, JUNGLE['lime'], 12, [3, 4])
    for _ in range(3):                                     # magenta blossoms, a lit pair
        x, y = rng.randrange(N), rng.randrange(N)
        t.put(x, y, rgb('#fa3a64')); t.put(x + 1, y, rgb('#c34988')); t.put(x, y + 1, rgb('#c34988'))
    return t.px


def mirewood_swamp(rng):
    t = Tile(JUNGLE['peat'], 1)
    t.ground(rng, JUNGLE['peat'], [0, 1, 2], [3, 3, 1])
    cushions(t, rng, JUNGLE['duckweed'], 10, [1], ((2, 2), (3, 2), (2, 1)))
    return t.px


def mirewood_bank(rng):
    t = Tile(JUNGLE['silt'], 2)
    t.ground(rng, JUNGLE['silt'], [1, 2], [3, 2])
    for k in range(3):                                     # drying ripples
        y0 = k * 5 + 1
        for x in range(N):
            t.put(x, y0 + (1 if (x // 4 + k) % 2 else 0), JUNGLE['silt'][3])
    cushions(t, rng, JUNGLE['silt'], 3, [1], ((2, 2),))
    return t.px


def mirewood_soil(rng):
    t = Tile(JUNGLE['darksoil'], 2)
    t.ground(rng, JUNGLE['darksoil'], [1, 2], [2, 3])
    cushions(t, rng, JUNGLE['darksoil'], 5, [2], ((2, 2), (3, 2)))
    specks(t, rng, JUNGLE['duckweed'][0], 3)               # roots
    return t.px


def mirewood_rock(rng):
    t = Tile(JUNGLE['band'], 2)
    for y in range(N):                                     # bands, lit top edge of each
        k = [1, 2, 3, 2][(y // 4) % 4]
        for x in range(N):
            t.put(x, y, JUNGLE['band'][k + 1 if y % 4 == 0 else k])
    cracks(t, rng, JUNGLE['band'][0], 4, 4)
    return t.px


JUNGLE_MOONS = {
    'verdance': (verdance_soil, verdance_rock, verdance_bank, [('jungle', verdance_jungle), ('swamp', verdance_swamp)]),
    'mirewood': (mirewood_soil, mirewood_rock, mirewood_bank, [('jungle', mirewood_jungle), ('swamp', mirewood_swamp)]),
}


def jungle_moons():
    out = os.path.join(ROOT, 'alien')
    os.makedirs(out, exist_ok=True)
    jrng = random.Random(6262)
    for moon, (soil_fn, rock_fn, bank_fn, grounds) in JUNGLE_MOONS.items():
        blocks = {'soil': soil_fn(jrng), 'rock': rock_fn(jrng), 'bank': bank_fn(jrng)}
        for name, px in blocks.items():
            check(px)
            write_png(os.path.join(out, f'{moon}_{name}.png'), px)
        for name, draw in grounds:
            top = draw(jrng)
            check(top)
            write_png(os.path.join(out, f'{moon}_{name}.png'), top)
            sd, exempt = side(jrng, top, blocks['soil'])
            check(sd)
            write_png(os.path.join(out, f'{moon}_{name}_side.png'), sd)
        print('wrote', moon)


# ---- Industry resources (openspec industry-and-nuclear) ---------------------

RES = {
    'clay': R('#41322c', '#725244', '#a09f91', '#92a3b2', '#bfcad7'),
    'tarsand': R('#010000', '#161612', '#2c2c25', '#41322c', '#725244'),
    'tar': R('#010000', '#011c34', '#1f3b52'),
    'urock': R('#161612', '#2c2c25', '#434137', '#a09f91'),
    'uraninite': R('#010000', '#003227', '#05582d', '#559642', '#9bb675', '#c1f1d8'),
}


def res_clay(rng):
    """Earth's shore clay: smooth grey-brown slabs, drying cracks, a few wet smears"""
    t = Tile(RES['clay'], 2)
    plates(t, rng, RES['clay'][1:4], 8, RES['clay'][0])
    cushions(t, rng, RES['clay'], 4, [3], ((3, 1), (4, 1), (2, 1)))
    specks(t, rng, RES['clay'][4], 3)
    return t.px


def res_oil_sand(rng):
    """Oil sand: dark sand grains soaked in tar, glossy tar beads with a cold sheen"""
    t = Tile(RES['tarsand'], 2)
    t.ground(rng, RES['tarsand'], [1, 2, 3], [3, 4, 2])
    specks(t, rng, RES['tarsand'][4], 10)
    cushions(t, rng, RES['tar'], 7, [0], ((2, 2), (3, 2), (2, 3)))
    for _ in range(5):                                      # sheen on a bead's top left
        x, y = rng.randrange(N), rng.randrange(N)
        if t.px[y][x] == RES['tar'][1]:
            t.put(x, y, RES['tar'][2])
    return t.px


def res_ore_uranium(rng):
    """Uranium ore: dark rock with uraninite nodules rimmed in yellow-green"""
    t = Tile(RES['urock'], 1)
    t.ground(rng, RES['urock'], [0, 1, 2], [2, 4, 2])
    cushions(t, rng, RES['urock'], 6, [2], ((3, 2), (2, 3), (3, 3)))
    cushions(t, rng, RES['uraninite'], 6, [2, 3], ((2, 2), (3, 2), (2, 3), (3, 3)))
    specks(t, rng, RES['uraninite'][5], 3)
    return t.px


def resources():
    out = os.path.join(ROOT, 'resources')
    os.makedirs(out, exist_ok=True)
    rrng = random.Random(9191)                             # own rng: the tiles above don't change
    for name, draw in [('clay', res_clay), ('oil_sand', res_oil_sand), ('ore_uranium', res_ore_uranium)]:
        px = draw(rrng)
        check(px)
        write_png(os.path.join(out, f'{name}.png'), px)
        print('wrote resource', name)


# ---- Building materials (openspec industry-and-nuclear, decision 9) ---------

BLD = {
    'brick': R('#4a051e', '#841c1d', '#a8633e', '#c56d25'),
    'mortar': R('#69608b', '#a09f91', '#bfcad7'),
    'concrete': R('#3e586e', '#5d778d', '#92a3b2', '#bfcad7'),
    'steel': R('#011c34', '#1f3b52', '#3e586e', '#5d778d', '#92a3b2'),
    'pane': R('#1096c3', '#74effe', '#d2f8ff'),
}


def write_png_rgba(path, px):
    """RGBA: a None pixel is fully transparent (alpha 0); every other alpha 255."""
    raw = b''.join(b'\x00' + bytes(v for p in row for v in ((0, 0, 0, 0) if p is None else (*p, 255))) for row in px)
    def chunk(t, dd):
        return struct.pack('>I', len(dd)) + t + dd + struct.pack('>I', zlib.crc32(t + dd) & 0xffffffff)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', N, N, 8, 6, 0, 0, 0))
                + chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b''))


def check_rgba(px):
    check([[p if p is not None else SWEAFT_RGB0 for p in row] for row in px])


def bld_brick(rng):
    """Brick wall: running bond, 4 courses of 4 px; each brick one tone, lit
    on its top-left edge, shaded bottom-right; mortar joints between"""
    b, m = BLD['brick'], BLD['mortar']
    px = [[m[1]] * N for _ in range(N)]
    for course in range(4):
        y0 = course * 4
        off = 0 if course % 2 == 0 else 4
        for k in range(2):
            x0 = (off + k * 8) % N
            body = rng.choice([1, 1, 2])
            for dy in range(3):              # 3 px tall, 1 px mortar below
                for dx in range(7):          # 7 px long, 1 px mortar after
                    x, y = (x0 + dx) % N, y0 + dy
                    c = b[body]
                    if dy == 0 or dx == 0:
                        c = b[min(body + 1, len(b) - 1)]
                    elif dy == 2 or dx == 6:
                        c = b[body - 1]
                    px[y][x] = c
            # a chip or two of grit
            if rng.random() < 0.6:
                px[y0 + 1][(x0 + rng.randrange(1, 6)) % N] = b[0]
        for x in range(N):                   # mortar shade under each course
            if px[y0 + 3][x] == m[1] and rng.random() < 0.3:
                px[y0 + 3][x] = m[0]
    return px


def bld_concrete(rng):
    """Concrete: cast grey, formwork seam across the middle, tie-holes, aggregate specks"""
    c = BLD['concrete']
    t = Tile(c, 2)
    t.ground(rng, c, [1, 2, 3], [2, 6, 2])
    for x in range(N):                       # formwork seam, lit edge above
        t.put(x, 8, c[0])
        t.put(x, 7, c[3])
    for (x, y) in ((3, 3), (12, 3), (3, 12), (12, 12)):   # tie holes
        t.put(x, y, c[0])
        t.put(x - 1, y - 1, c[3])
    specks(t, rng, c[0], 6)
    return t.px


def bld_girder(rng):
    """Steel girder: an open truss - flanges top and bottom, posts at the
    edges and a diagonal web, lit top-left; the gaps are open (alpha 0)"""
    s = BLD['steel']
    px = [[None] * N for _ in range(N)]
    def put(x, y, c):
        px[y % N][x % N] = c
    for x in range(N):                       # flanges: lit top row, body, shade
        put(x, 0, s[4]); put(x, 1, s[3]); put(x, 2, s[1])
        put(x, 13, s[3]); put(x, 14, s[2]); put(x, 15, s[0])
    for y in range(3, 13):                   # edge posts
        put(0, y, s[3]); put(1, y, s[2])
        put(14, y, s[2]); put(15, y, s[1])
    for i in range(10):                      # diagonal web, two px wide
        put(2 + i + (i // 2), 3 + i, s[3])
        put(3 + i + (i // 2), 3 + i, s[1])
    for (x, y) in ((2, 1), (13, 1), (2, 14), (13, 14)):   # rivets
        put(x, y, s[4])
    return px


def bld_steel_glass(rng):
    """Steel-framed glass: a steel frame round the edge and a cross mullion,
    the panes clear (alpha 0) with a few bright glints like the plain glass"""
    s, g = BLD['steel'], BLD['pane']
    px = [[None] * N for _ in range(N)]
    for i in range(N):
        px[0][i] = s[4]; px[1][i] = s[2]
        px[N - 1][i] = s[0]; px[N - 2][i] = s[1]
        px[i][0] = s[3]; px[i][1] = s[2]
        px[i][N - 1] = s[1]; px[i][N - 2] = s[1]
        px[7][i] = s[3]; px[8][i] = s[1]           # transom
        px[i][7] = s[3]; px[i][8] = s[1]           # mullion
    for (x0, y0) in ((2, 2), (9, 2), (2, 9), (9, 9)):  # a diagonal glint per pane
        for k in range(3):
            px[y0 + k][x0 + 2 - k] = g[2] if k == 1 else g[1]
    return px


def building():
    out = os.path.join(ROOT, 'building')
    os.makedirs(out, exist_ok=True)
    brng = random.Random(6363)                             # own rng: the tiles above don't change
    for name, draw, alpha in [('brick_block', bld_brick, False), ('concrete', bld_concrete, False),
                              ('steel_girder', bld_girder, True), ('steel_glass', bld_steel_glass, True)]:
        px = draw(brng)
        if alpha:
            check_rgba(px)
            write_png_rgba(os.path.join(out, f'{name}.png'), px)
        else:
            check(px)
            write_png(os.path.join(out, f'{name}.png'), px)
        print('wrote building', name)


def main():
    os.makedirs(OUT, exist_ok=True)
    rng = random.Random(4242)
    earth_soil = read_png(os.path.join(ROOT, 'dirt.png'))
    seq_soil = read_png(os.path.join(ROOT, 'planet_seq', 'planet_seq_dirt.png'))
    for name, draw, soil in [('forest_floor', forest_floor, earth_soil), ('dry_grass', dry_grass, earth_soil),
                             ('seq_scrub', seq_scrub, seq_soil), ('seq_duff', seq_duff, seq_soil)]:
        top = draw(rng)
        check(top)
        write_png(os.path.join(OUT, f'{name}.png'), top)
        s, exempt = side(rng, top, soil)
        check(s, exempt)
        write_png(os.path.join(OUT, f'{name}_side.png'), s)
        print('wrote', name)
    # Moon ore blocks (own rng, so the biome tiles above don't change)
    moon_rock = read_png(os.path.join(ROOT, 'moon.png'))
    mrng = random.Random(7070)
    os.makedirs(os.path.join(ROOT, 'moon'), exist_ok=True)
    for name, ramp in MOON_ORES.items():
        px, exempt = moon_ore(mrng, moon_rock, ramp)
        check(px, exempt)
        write_png(os.path.join(ROOT, 'moon', f'ore_{name}.png'), px)
        print('wrote moon ore', name)
    alien_grounds()
    jungle_moons()
    resources()
    building()


if __name__ == '__main__':
    main()
