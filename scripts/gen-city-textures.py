#!/usr/bin/env python3
"""Bake the ecumenopolis blocks: public/textures/city/*.png (16x16).

The city planet (Ferrum, src/shared/cityGen.ts) is built of its own blocks,
drawn the same way as the biome blocks (scripts/gen-biome-textures.py, whose
palette, checker, PNG writer and Tile helpers this reuses):

- Sweaft-64 only (`check()` refuses an off-palette pixel)
- short ramps, a visible step between tones, no AA, alpha 255
- light from the top left: raised things are one tone up on their top-left
  edge and one down on their bottom-right edge
- nothing that must read is 1 px thin; tiles wrap

A wall block is one storey tall, so a facade texture is one band of
windows between floor slabs; stacked, the blocks read as a tower.

Textures:
  road        asphalt with cyan guide studs (street level)
  sidewalk    concrete paving slabs
  curb        side of sidewalk / plaza: a kerb over the undercity concrete
  plaza       warm stone checker paving
  slab        concrete floor slab (top/bottom of wall blocks)
  facade      concrete wall, one storey of windows (lit and dark)
  glass       downtown curtain wall: dark glass, cyan mullions
  roof        tar and gravel roof with a parapet, plant box and vent
  parapet     side of the roof block: the top storey under a coping
  neon        neon band (tower crowns, storefronts)
  deck        diamond-plate metal (top of neon / metal blocks)
  metal       corrugated rusting sheet (industrial sheds)
  park        lawn with hedges and flowers
  park_side   park lawn lip over the concrete planter
  foundation  undercity: dark panels, rivets, a copper pipe
  lamp        street lamp block, side: a steel housing, a warm lantern band
  lamp_top    street lamp block, top: the lantern's lens in a steel ring

Night lights: every block that gives off light also gets `<name>_glow.png`,
its emissive mask - the same pixels as the block where it glows (lit
windows, neon tubes, guide studs, lamp lenses) and palette black elsewhere.
The terrain shader adds it at night (src/config/LightingConfig.ts); the
voxel light flood (src/shared/voxelLight.ts) lights what is near.

Deterministic. Run from the repo root:  python3 scripts/gen-city-textures.py
"""
import importlib.util
import os
import random
import sys

sys.dont_write_bytecode = True   # no __pycache__ for the borrowed module
HERE = os.path.dirname(os.path.abspath(__file__))
_spec = importlib.util.spec_from_file_location('biome', os.path.join(HERE, 'gen-biome-textures.py'))
B = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(B)
N, rgb, check, write_png, Tile, blob, side = B.N, B.rgb, B.check, B.write_png, B.Tile, B.blob, B.side

OUT = os.path.join(HERE, '..', 'public', 'textures', 'city')

R = {k: [rgb(h) for h in v] for k, v in {
    'concrete': ('#3e586e', '#5d778d', '#92a3b2', '#bfcad7'),
    'asphalt': ('#161612', '#2c2c25', '#434137'),
    'cyan': ('#15578a', '#1096c3', '#74effe', '#d2f8ff'),
    'lit': ('#c56d25', '#fb902f', '#faaf5c'),
    'dark': ('#011c34', '#0c2f44', '#204f63', '#53998b'),
    'glass': ('#010e1a', '#191954', '#15578a', '#1096c3'),
    'magenta': ('#4f1d83', '#9e3ba2', '#c34988', '#fa3a64'),
    'rust': ('#2e0d06', '#561c27', '#733126', '#8d4526', '#c56d25'),
    'steel': ('#1f3b52', '#3e586e', '#5d778d', '#92a3b2'),
    'tar': ('#2b1f35', '#3e3551', '#69608b'),
    'stone': ('#725244', '#ab8465', '#cfaa81', '#eab798'),
    'turf': ('#003227', '#05582d', '#297537', '#559642', '#9bb675'),
    'flower': ('#d12d41', '#fa3a64', '#faaf5c'),
    'under': ('#010e1a', '#011c34', '#1f3b52', '#3e586e'),
    'copper': ('#522b2f', '#7d4636', '#a8633e', '#e69d69'),
}.items()}


def bevel(t, x0, y0, w, h, ramp, body):
    """A raised rectangle: body tone, lit top-left rim, dark bottom-right rim."""
    t.clump([(x0 + dx, y0 + dy) for dy in range(h) for dx in range(w)], ramp, body)


def road(rng):
    t = Tile(R['asphalt'], 1)
    t.ground(rng, R['asphalt'], [0, 1, 2], [2, 6, 1])
    for _ in range(2):                                   # tar-filled cracks, 2 px strokes
        x, y = rng.randrange(N), rng.randrange(N)
        for i in range(4):
            t.put(x + i, y + (i // 2), R['asphalt'][0])
            t.put(x + i, y + (i // 2) + 1, R['asphalt'][0])
    bevel(t, 7, 7, 2, 2, R['cyan'], 2)                   # a cyan guide stud
    return t.px


def sidewalk(rng):
    t = Tile(R['concrete'], 0)
    for sy in (0, 8):
        for sx in (0, 8):
            bevel(t, sx + 1, sy + 1, 7, 7, R['concrete'], 1)
            for _ in range(3):                           # wear specks
                t.put(sx + 2 + rng.randrange(5), sy + 2 + rng.randrange(5), R['concrete'][1])
    return t.px


def curb(rng, under):
    px = [row[:] for row in under]
    for x in range(N):
        px[0][x] = R['concrete'][3]
        px[1][x] = R['concrete'][2]
        px[2][x] = R['concrete'][2]
        px[3][x] = R['concrete'][0]
    return px


def plaza(rng):
    t = Tile(R['stone'], 0)
    for sy in range(0, N, 4):
        for sx in range(0, N, 4):
            body = 2 if ((sx + sy) // 4) % 2 == 0 else 1
            bevel(t, sx, sy, 4, 4, R['stone'], body)
    bevel(t, 6, 6, 4, 4, R['magenta'], 2)                # inlaid lamp at the centre
    return t.px


def slab(rng):
    t = Tile(R['concrete'], 1)
    t.ground(rng, R['concrete'], [1, 2], [3, 2])
    for x in range(N):                                   # formwork seam
        t.put(x, 7, R['concrete'][0])
        t.put(x, 8, R['concrete'][3])
    return t.px


def window_band(t, rng, wall, lit_cols):
    """One storey: floor slab at the top, two windows, spandrel below."""
    for y in range(N):
        for x in range(N):
            t.put(x, y, wall[2])
    for x in range(N):                                   # floor slab edge, lit on top
        t.put(x, 0, wall[3])
        t.put(x, 1, wall[2])
        t.put(x, 13, wall[1])
        t.put(x, 14, wall[1])
        t.put(x, 15, wall[0])
    for i, x0 in enumerate((2, 9)):
        lit = i in lit_cols
        ramp = R['lit'] if lit else R['dark']
        for y in range(3, 12):
            for x in range(x0, x0 + 5):
                t.put(x, y, ramp[1])
        for x in range(x0, x0 + 5):                      # lintel shadow
            t.put(x, 3, ramp[0])
        for y in range(4, 7):                            # glint, top left
            t.put(x0 + 1, y, ramp[2])
        t.put(x0 + 2, 4, ramp[2])
        for x in range(x0, x0 + 5):                      # sill, lit
            t.put(x, 12, wall[3])
        if lit:                                          # a blind half drawn
            for x in range(x0, x0 + 5):
                t.put(x, 8, ramp[0])


def facade(rng):
    t = Tile(R['concrete'], 2)
    window_band(t, rng, R['concrete'], lit_cols={0})
    return t.px


def glass(rng):
    t = Tile(R['glass'], 1)
    for y in range(N):
        for x in range(N):
            t.put(x, y, R['glass'][1] if (x + y) % 16 < 12 else R['glass'][2])
    for i in range(5):                                   # reflection streak, 2 wide
        t.put(10 + i, 2 + i * 2, R['glass'][3]); t.put(11 + i, 2 + i * 2, R['glass'][3])
    for y in range(N):                                   # mullions, 2 wide
        t.put(0, y, R['cyan'][1]); t.put(1, y, R['cyan'][0])
        t.put(8, y, R['cyan'][1]); t.put(9, y, R['cyan'][0])
    for x in range(N):                                   # floor line
        t.put(x, 14, R['cyan'][2]); t.put(x, 15, R['cyan'][0])
    return t.px


def roof(rng):
    t = Tile(R['tar'], 1)
    t.ground(rng, R['tar'], [0, 1, 2], [2, 5, 1])
    bevel(t, 4, 4, 5, 4, R['steel'], 2)                  # plant box
    for x in (5, 7):                                     # its grille
        t.put(x, 5, R['steel'][0]); t.put(x, 6, R['steel'][0])
    bevel(t, 11, 10, 2, 2, R['under'], 1)                # vent
    for i in range(N):                                   # parapet ring, 2 px
        for j in (0, 1):
            t.put(i, j, R['concrete'][3 - j])
            t.put(j, i, R['concrete'][3 - j])
            t.put(i, N - 1 - j, R['concrete'][j])
            t.put(N - 1 - j, i, R['concrete'][j])
    return t.px


def parapet(rng, facade_px):
    px = [row[:] for row in facade_px]
    for x in range(N):
        px[0][x] = R['concrete'][3]
        px[1][x] = R['concrete'][3]
        px[2][x] = R['concrete'][2]
        px[3][x] = R['concrete'][0]
    return px


def neon(rng):
    t = Tile(R['tar'], 0)
    for y in range(N):
        for x in range(N):
            t.put(x, y, R['tar'][0])
    for x in range(N):                                   # the tube: 4 rows, bright core
        t.put(x, 6, R['magenta'][1]); t.put(x, 7, R['magenta'][3])
        t.put(x, 8, R['magenta'][2]); t.put(x, 9, R['magenta'][0])
    for x0 in (2, 7, 12):                                # cyan sign glyphs above and below
        bevel(t, x0, 2, 2, 3, R['cyan'], 2)
        bevel(t, x0 + 1, 11, 2, 2, R['cyan'], 1)
    for x in range(N):
        t.put(x, 0, R['steel'][2]); t.put(x, 15, R['steel'][0])
    return t.px


def deck(rng):
    t = Tile(R['steel'], 1)
    for y in range(N):
        for x in range(N):
            t.put(x, y, R['steel'][1])
    for y0 in range(0, N, 4):
        for x0 in range(0, N, 8):
            off = 4 if (y0 // 4) % 2 else 0
            bevel(t, x0 + off + 1, y0 + 1, 3, 2, R['steel'], 2)
    return t.px


def metal(rng):
    t = Tile(R['rust'], 2)
    for x in range(N):                                   # ribs every 4 px: lit, body, body, dark
        tone = [3, 2, 2, 1][x % 4]
        for y in range(N):
            t.put(x, y, R['rust'][tone])
    for _ in range(3):                                   # rust bloom
        t.clump(blob(rng.randrange(N), rng.randrange(N), 3, 3), R['rust'], 4 if rng.random() < 0.5 else 1)
    for x in range(N):                                   # sheet seam
        t.put(x, 15, R['rust'][0])
    return t.px


def park(rng):
    t = Tile(R['turf'], 2)
    t.ground(rng, R['turf'], [1, 2], [2, 5])
    for _ in range(4):                                   # hedge clumps
        t.clump(blob(rng.randrange(N), rng.randrange(N), 3, 3), R['turf'], 3)
    for _ in range(4):                                   # flowers, 2x1
        x, y = rng.randrange(N), rng.randrange(N)
        t.clump([(x, y), (x + 1, y)], R['flower'], rng.choice([1, 2]))
    return t.px


def foundation(rng):
    t = Tile(R['under'], 1)
    for sy in (0, 8):
        for sx in (0, 8):
            bevel(t, sx, sy, 8, 8, R['under'], 2 if (sx + sy) % 16 == 0 else 1)
            t.put(sx + 1, sy + 1, R['steel'][3])         # rivets
            t.put(sx + 6, sy + 1, R['steel'][3])
    for x in range(N):                                   # copper pipe, 3 rows lit on top
        t.put(x, 10, R['copper'][3]); t.put(x, 11, R['copper'][2]); t.put(x, 12, R['copper'][0])
    for x in (3, 11):                                    # its brackets
        t.put(x, 10, R['steel'][1]); t.put(x, 11, R['steel'][1]); t.put(x, 12, R['steel'][0])
    return t.px


def lamp(rng):
    t = Tile(R['steel'], 1)
    for y in range(N):
        for x in range(N):
            t.put(x, y, R['steel'][1])
    for x in range(N):                                   # housing seams, lit on top
        t.put(x, 0, R['steel'][3]); t.put(x, 1, R['steel'][2])
        t.put(x, 14, R['steel'][0]); t.put(x, 15, R['under'][1])
    for y in range(3, 9):                                # the lantern band
        for x in range(1, N - 1):
            t.put(x, y, R['lit'][1])
    for x in range(1, N - 1):
        t.put(x, 3, R['lit'][2]); t.put(x, 8, R['lit'][0])
    for x in (4, 8, 12):                                 # its grille bars
        for y in range(3, 9):
            t.put(x, y, R['steel'][0])
    for x in range(2, N - 2, 4):                         # bolts on the base
        t.put(x, 11, R['steel'][3]); t.put(x, 12, R['steel'][0])
    return t.px


def lamp_top(rng):
    t = Tile(R['steel'], 2)
    for y in range(N):
        for x in range(N):
            t.put(x, y, R['steel'][2])
    lens = [(x, y) for y in range(N) for x in range(N) if (x - 7.5) ** 2 + (y - 7.5) ** 2 <= 22]
    for x, y in lens:
        t.put(x, y, R['lit'][1])
    for x, y in lens:                                    # lit top left, deeper bottom right
        if (x - 6) ** 2 + (y - 6) ** 2 <= 5:
            t.put(x, y, R['lit'][2])
        elif (x - 9) ** 2 + (y - 9) ** 2 <= 4:
            t.put(x, y, R['lit'][0])
    for i in range(N):                                   # steel rim
        t.put(i, 0, R['steel'][3]); t.put(0, i, R['steel'][3])
        t.put(i, N - 1, R['steel'][0]); t.put(N - 1, i, R['steel'][0])
    return t.px


# Which pixels glow, per block: by colour, so the mask follows the art
GLOW = {
    'facade': R['lit'],
    'parapet': R['lit'],
    'neon': R['magenta'] + R['cyan'],
    'road': R['cyan'],
    'plaza': R['magenta'],
    'glass': [R['cyan'][2]],                             # the lit floor line
    'lamp': R['lit'],
    'lamp_top': R['lit'],
}
DARK = rgb('#010000')


def glow_mask(px, tones):
    keep = set(tones)
    return [[p if p in keep else DARK for p in row] for row in px]


def main():
    os.makedirs(OUT, exist_ok=True)
    rng = random.Random(3535)
    out = {}
    out['road'] = road(rng)
    out['sidewalk'] = sidewalk(rng)
    out['foundation'] = foundation(rng)
    out['curb'] = curb(rng, out['foundation'])
    out['plaza'] = plaza(rng)
    out['slab'] = slab(rng)
    out['facade'] = facade(rng)
    out['glass'] = glass(rng)
    out['roof'] = roof(rng)
    out['parapet'] = parapet(rng, out['facade'])
    out['neon'] = neon(rng)
    out['deck'] = deck(rng)
    out['metal'] = metal(rng)
    out['park'] = park(rng)
    out['park_side'], _ = side(rng, out['park'], out['curb'], lip=3)
    out['lamp'] = lamp(rng)
    out['lamp_top'] = lamp_top(rng)
    for name, tones in GLOW.items():
        out[f'{name}_glow'] = glow_mask(out[name], tones)
    for name, px in out.items():
        check(px)
        write_png(os.path.join(OUT, f'{name}.png'), px)
        print('wrote city', name)


if __name__ == '__main__':
    main()
