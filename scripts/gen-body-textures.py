#!/usr/bin/env python3
"""Bake the moon and asteroid crust blocks: public/textures/bodies/*.png (16x16).

The sibling of gen-biome-textures.py, drawn the same way (its palette check,
ramps, top-left-lit clumps and wrap-around tiles are imported from it):
Sweaft-64 only, short ramps, light from the top left, no anti-aliasing.

Blocks:
  basalt       volcano cones: columnar basalt (hex column tops; columns on
               the side)
  magma        crater floors: molten rock with cooling crust plates, drawn
               bright (the game renders it unlit, so it glows at night)
  lava_rock    round the craters: black crust split by glowing cracks
  sulfur       upper volcano slopes: yellow sulfur crust with crystals
  frost        ice moons: a frost crust (side: frost lip over blue ice)
  blue_ice     glacier ice where the crust breaks on the slopes
  iron_nickel  metal-rich bodies: meteoric iron, etched crosshatch and rust

Deterministic. Run from the repo root:  python3 scripts/gen-body-textures.py
"""
import importlib.util
import os
import random

_spec = importlib.util.spec_from_file_location('biome', os.path.join(os.path.dirname(__file__), 'gen-biome-textures.py'))
biome = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(biome)
rgb, check, write_png, Tile, blob, side, N = biome.rgb, biome.check, biome.write_png, biome.Tile, biome.blob, biome.side, biome.N

OUT = os.path.join(biome.ROOT, 'bodies')

RAMPS = {
    'basalt': [rgb(h) for h in ('#010e1a', '#161612', '#2c2c25', '#434137', '#5d778d')],
    'magma': [rgb(h) for h in ('#841c1d', '#d4462b', '#fe6420', '#fb902f', '#faaf5c')],
    'crust': [rgb(h) for h in ('#170916', '#2e0d06', '#41322c', '#522b2f')],
    'glow': [rgb(h) for h in ('#d4462b', '#fe6420', '#fb902f', '#faaf5c')],
    'sulfur': [rgb(h) for h in ('#a8633e', '#c56d25', '#faaf5c', '#eab798')],
    'frost': [rgb(h) for h in ('#5d778d', '#92a3b2', '#bfcad7', '#d2f8ff', '#fffefe')],
    'blueice': [rgb(h) for h in ('#191954', '#15578a', '#1096c3', '#74effe', '#d2f8ff')],
    'iron': [rgb(h) for h in ('#1f3b52', '#3e586e', '#5d778d', '#92a3b2', '#bfcad7')],
    'rust': [rgb(h) for h in ('#522b2f', '#7d4636', '#a8633e')],
}


def basalt_top(rng):
    """Column tops: a staggered grid of 5x5 lit cells with dark joints."""
    r = RAMPS['basalt']
    t = Tile(r, 1)
    for row in range(4):
        for col in range(4):
            cx = col * 4 + (2 if row % 2 else 0)
            cy = row * 4
            t.clump(blob(cx, cy, 4, 3), r, rng.choice([2, 3, 3]))
    return t.px


def basalt_side(rng):
    """Columns: 4 px wide, lit left edge, dark joint on the right, a few
    horizontal breaks."""
    r = RAMPS['basalt']
    px = [[r[2]] * N for _ in range(N)]
    for col in range(4):
        x0 = col * 4
        brk = {rng.randrange(N) for _ in range(2)}
        for y in range(N):
            for dx in range(4):
                c = r[3] if dx == 0 else r[0] if dx == 3 else r[2 + (rng.random() < 0.2)]
                if y in brk and dx < 3:
                    c = r[1]
                px[y][(x0 + dx) % N] = c
    return px


def magma(rng):
    r = RAMPS['magma']
    t = Tile(r, 2)
    t.ground(rng, r, [1, 2, 3], [2, 4, 2])
    for _ in range(6):                                     # hottest upwellings
        t.clump(blob(rng.randrange(N), rng.randrange(N), 3, 3), r, 3)
    for _ in range(4):                                     # cooling crust plates
        w, h = rng.choice([(3, 2), (2, 3), (3, 3)])
        t.clump(blob(rng.randrange(N), rng.randrange(N), w, h), RAMPS['crust'], 2)
    return t.px


def cracks(rng, t, n, length):
    """Glowing cracks, 1 px with a hot core: a random walk, 2 tones."""
    g = RAMPS['glow']
    for _ in range(n):
        x, y = rng.randrange(N), rng.randrange(N)
        for i in range(length):
            t.put(x, y, g[2] if i % 3 else g[3])
            t.put(x + 1, y, g[1])
            if rng.random() < 0.5:
                x += rng.choice((-1, 1))
            else:
                y += 1


def lava_rock(rng):
    r = RAMPS['crust']
    t = Tile(r, 1)
    t.ground(rng, r, [0, 1], [2, 3])
    for _ in range(7):                                     # crust plates
        w, h = rng.choice([(3, 3), (4, 3), (3, 4)])
        t.clump(blob(rng.randrange(N), rng.randrange(N), w, h), r, 2)
    cracks(rng, t, 5, 9)
    return t.px


def sulfur(rng):
    r = RAMPS['sulfur']
    t = Tile(r, 1)
    t.ground(rng, r, [0, 1, 2], [1, 3, 2])
    for _ in range(9):                                     # crystal crusts
        w, h = rng.choice([(2, 2), (3, 2), (2, 3)])
        t.clump(blob(rng.randrange(N), rng.randrange(N), w, h), r, 2)
    for _ in range(3):                                     # a vent stain
        t.clump(blob(rng.randrange(N), rng.randrange(N), 2, 2), RAMPS['crust'], 1)
    return t.px


def frost(rng):
    r = RAMPS['frost']
    t = Tile(r, 2)
    t.ground(rng, r, [1, 2, 3], [1, 4, 3])
    for _ in range(10):                                    # rime drifts
        w, h = rng.choice([(3, 2), (2, 2), (3, 3)])
        t.clump(blob(rng.randrange(N), rng.randrange(N), w, h), r, 3)
    for _ in range(4):                                     # glints
        t.put(rng.randrange(N), rng.randrange(N), r[4])
    return t.px


def blue_ice(rng):
    r = RAMPS['blueice']
    t = Tile(r, 2)
    t.ground(rng, r, [1, 2], [2, 3])
    for _ in range(3):                                     # fracture planes, 2 px
        x, y = rng.randrange(N), rng.randrange(N)
        for i in range(9):
            t.put(x + i, y + i // 2, r[3])
            t.put(x + i, y + i // 2 + 1, r[1])
    for _ in range(5):                                     # trapped bubbles
        t.clump(blob(rng.randrange(N), rng.randrange(N), 2, 2), r, 3)
    return t.px


def iron_nickel(rng):
    """Meteoric iron: Widmanstatten crosshatch (two diagonal sets), rust."""
    r = RAMPS['iron']
    t = Tile(r, 2)
    t.ground(rng, r, [1, 2], [1, 3])
    for k in range(0, N, 4):
        for i in range(N):
            t.put(i + k, i, r[3])                          # one set, lit
            t.put(k - i, i + 2, r[1])                      # the other, shadowed
    for _ in range(3):
        t.clump(blob(rng.randrange(N), rng.randrange(N), 2, 2), RAMPS['rust'], 1)
    return t.px


def main():
    os.makedirs(OUT, exist_ok=True)
    rng = random.Random(7171)
    faces = {}
    for name, draw in [('basalt', basalt_top), ('basalt_side', basalt_side), ('magma', magma),
                       ('lava_rock', lava_rock), ('sulfur', sulfur), ('frost', frost),
                       ('blue_ice', blue_ice), ('iron_nickel', iron_nickel)]:
        faces[name] = draw(rng)
    # Sides: the top's lip over what lies beneath it
    faces['lava_rock_side'], _ = side(rng, faces['lava_rock'], faces['basalt_side'], lip=4)
    faces['sulfur_side'], _ = side(rng, faces['sulfur'], faces['basalt_side'])
    faces['frost_side'], _ = side(rng, faces['frost'], faces['blue_ice'])
    for name, px in faces.items():
        check(px)
        write_png(os.path.join(OUT, f'{name}.png'), px)
        print('wrote', f'public/textures/bodies/{name}.png')


if __name__ == '__main__':
    main()
