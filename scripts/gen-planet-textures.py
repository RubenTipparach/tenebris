#!/usr/bin/env python3
"""Bake the surface texture of each barren landable planet.

One 16x16 pixel-art tile per planet in public/textures/planets/<id>.png, in
the same style and size as moon.png (a single-texture planet uses it for
every block of its native rock, see SolarSystemConfig texturePath).
Deterministic, stdlib only. Run from the repo root:

    python3 scripts/gen-planet-textures.py
"""
import os
import random
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'textures', 'planets')
N = 16


def write_png(path, px):
    raw = b''.join(b'\x00' + b''.join(bytes(p) for p in row) for row in px)

    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        return c + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', N, N, 8, 6, 0, 0, 0))
    png += chunk(b'IDAT', zlib.compress(raw, 9)) + chunk(b'IEND', b'')
    with open(path, 'wb') as f:
        f.write(png)


def hexc(s):
    s = s.lstrip('#')
    return (int(s[0:2], 16), int(s[2:4], 16), int(s[4:6], 16), 255)


def mottled(rng, ramp, weights):
    """Base noise: each pixel picks a ramp colour, clumped by neighbours."""
    g = [[0] * N for _ in range(N)]
    for y in range(N):
        for x in range(N):
            g[y][x] = rng.choices(range(len(ramp)), weights)[0]
    # one smoothing pass so colours clump into patches (wraps: tiles seamlessly)
    out = [[0] * N for _ in range(N)]
    for y in range(N):
        for x in range(N):
            s = [g[(y + dy) % N][(x + dx) % N] for dy in (-1, 0, 1) for dx in (-1, 0, 1)]
            out[y][x] = max(set(s), key=s.count) if rng.random() < 0.6 else g[y][x]
    return [[ramp[i] for i in row] for row in out]


def crack(rng, px, colour, n, length):
    for _ in range(n):
        x, y = rng.randrange(N), rng.randrange(N)
        for _ in range(length):
            px[y % N][x % N] = colour
            if rng.random() < 0.5:
                x += rng.choice((-1, 1))
            else:
                y += rng.choice((-1, 1))


def crater(rng, px, dark, light, n):
    for _ in range(n):
        cx, cy, r = rng.randrange(N), rng.randrange(N), rng.choice((1, 2, 2, 3))
        for dy in range(-r, r + 1):
            for dx in range(-r, r + 1):
                d = dx * dx + dy * dy
                if d <= r * r:
                    # rim lit from the top left, floor in shadow
                    px[(cy + dy) % N][(cx + dx) % N] = light if (d > (r - 1) * (r - 1) and dx + dy < 0) else dark


def stripes(rng, px, colours, every):
    for y in range(N):
        if y % every == 0:
            c = rng.choice(colours)
            for x in range(N):
                if rng.random() < 0.8:
                    px[(y + (x // 5)) % N][x] = c


PLANETS = {
    # basalt with glowing lava cracks
    'cinder': lambda r: (lambda p: (crack(r, p, hexc('#ff6a1f'), 3, 9), crack(r, p, hexc('#ffc23d'), 2, 3), p)[-1])(
        mottled(r, [hexc('#1c1517'), hexc('#2b2124'), hexc('#3a2e2f'), hexc('#4b3b37')], [3, 4, 3, 1])),
    # wind-rippled dune sand
    'vesper': lambda r: (lambda p: (stripes(r, p, [hexc('#b8834e'), hexc('#e9c48c')], 3), p)[-1])(
        mottled(r, [hexc('#c99a5e'), hexc('#d8ab6e'), hexc('#e4bb80'), hexc('#bd8c54')], [3, 4, 2, 2])),
    # verdigris stone, copper-green with pale veins
    'halcyon': lambda r: (lambda p: (crack(r, p, hexc('#b9e8d8'), 3, 6), p)[-1])(
        mottled(r, [hexc('#2f6b63'), hexc('#3f8577'), hexc('#4f9a86'), hexc('#2a5853')], [3, 4, 2, 2])),
    # rust-red iron oxide with dark metal flecks
    'ferrum': lambda r: (lambda p: (crater(r, p, hexc('#4a1f17'), hexc('#c46a45'), 3), p)[-1])(
        mottled(r, [hexc('#7a2f1f'), hexc('#953b25'), hexc('#a9492c'), hexc('#5e2519')], [3, 4, 2, 2])),
    # blue-white frost with ice fractures
    'tessaly': lambda r: (lambda p: (crack(r, p, hexc('#7fb2d6'), 3, 7), p)[-1])(
        mottled(r, [hexc('#d8ecf7'), hexc('#c3dff0'), hexc('#eaf6fc'), hexc('#a9cde6')], [3, 3, 2, 2])),
    # layered blue-grey slate
    'nerith': lambda r: (lambda p: (stripes(r, p, [hexc('#3a4658'), hexc('#8696ad')], 4), p)[-1])(
        mottled(r, [hexc('#55637a'), hexc('#61708a'), hexc('#4a566b'), hexc('#6e7e97')], [3, 3, 3, 1])),
    # grey-violet regolith, heavily cratered
    'kessel': lambda r: (lambda p: (crater(r, p, hexc('#2f2a38'), hexc('#8f86a1'), 5), p)[-1])(
        mottled(r, [hexc('#59526a'), hexc('#655d77'), hexc('#4d475c'), hexc('#716a84')], [3, 3, 3, 1])),
    # near-black indigo ice with pale frost specks
    'umbra': lambda r: (lambda p: (crack(r, p, hexc('#9fb0e8'), 4, 2), p)[-1])(
        mottled(r, [hexc('#1b1e3a'), hexc('#242a4d'), hexc('#2e3560'), hexc('#161830')], [3, 3, 2, 2])),
}


def main():
    os.makedirs(OUT, exist_ok=True)
    for i, (name, make) in enumerate(sorted(PLANETS.items())):
        rng = random.Random(1000 + i)
        write_png(os.path.join(OUT, f'{name}.png'), make(rng))
        print('wrote', f'public/textures/planets/{name}.png')


if __name__ == '__main__':
    main()
