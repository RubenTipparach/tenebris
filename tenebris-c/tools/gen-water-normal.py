#!/usr/bin/env python3
"""
Bake a seamless tileable water-surface normal map for the mobile water
shader. The desktop pipeline runs a 3-octave 3D Perlin fbm per fragment
(4 samples for the finite-difference gradient = ~12 hashes/pixel),
which is too expensive on phones. This generator pre-bakes the same
class of pattern into a 128x128 RGBA PNG; the mobile shader just
samples it.

Implementation:
  - 2D Perlin fbm sampled on a TORUS (i.e. with the integer grid mod-
    `period` per octave) so the result tiles cleanly with no seams.
  - 3 octaves, each at double the previous frequency and half amplitude
    (standard fbm) - matches the desktop shader's structure.
  - Central-difference gradient on the torus, packed as
    (nx*0.5+0.5, ny*0.5+0.5, nz*0.5+0.5, 255).

Output: tenebris-c/assets/textures/water_normal.png

Run from the repo root: `python3 tenebris-c/tools/gen-water-normal.py`.
Deterministic - same script, same hash, same bytes. Stdlib + zlib only;
no third-party deps.
"""

import math
import os
import struct
import zlib

# Texture size. 128 px is plenty for a normal map of waves at the
# scales the player sees; bigger would burn phone VRAM without a
# perceptible quality bump.
SIZE = 128

# How many "wave cells" fit across one tile at the base octave. Power
# of two so the torus wraps cleanly through every octave.
BASE_PERIOD = 4

OCTAVES = 3

# Slope multiplier when converting heights to normals. Bigger = choppier
# water surface. 6.0 mirrors the visual feel of the desktop fbm
# wave_steepness setting.
BUMP = 6.0


def fade(t):
    return t * t * t * (t * (t * 6 - 15) + 10)


def hash2(x, y):
    h = (x * 73856093) ^ (y * 19349663)
    h = (h ^ (h >> 13)) * 1103515245
    return (h ^ (h >> 16)) & 0xFFFFFFFF


def gradient(h):
    # 8 unit-circle directions; cheap and sufficient for the bake.
    a = (h & 7) * (math.pi / 4.0)
    return math.cos(a), math.sin(a)


def perlin2_tile(x, y, period):
    """2D Perlin sample whose grid wraps mod `period`, producing a
    seamlessly tileable pattern."""
    ix = int(math.floor(x))
    iy = int(math.floor(y))
    fx = x - ix
    fy = y - iy
    u = fade(fx)
    v = fade(fy)

    def gh(ax, ay):
        return hash2(ax % period, ay % period)

    g00 = gradient(gh(ix,     iy    )); v00 = g00[0] * fx       + g00[1] * fy
    g10 = gradient(gh(ix + 1, iy    )); v10 = g10[0] * (fx - 1) + g10[1] * fy
    g01 = gradient(gh(ix,     iy + 1)); v01 = g01[0] * fx       + g01[1] * (fy - 1)
    g11 = gradient(gh(ix + 1, iy + 1)); v11 = g11[0] * (fx - 1) + g11[1] * (fy - 1)
    a = v00 + u * (v10 - v00)
    b = v01 + u * (v11 - v01)
    return a + v * (b - a)


def fbm_seamless(u, v):
    """u, v in [0, 1). Each octave wraps at its own period."""
    h = 0.0
    amp = 0.5
    period = BASE_PERIOD
    for _ in range(OCTAVES):
        h += perlin2_tile(u * period, v * period, period) * amp
        amp *= 0.5
        period *= 2
    return h


def write_png(path, w, h, pix_rgba):
    """Minimal RGBA-8 PNG writer. Avoids any third-party deps so the
    script slots into the existing tools/ pattern (stdlib + zlib)."""
    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )
    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    raw = bytearray()
    stride = w * 4
    for y in range(h):
        raw.append(0)  # filter byte: none
        raw.extend(pix_rgba[y * stride : (y + 1) * stride])
    idat = zlib.compress(bytes(raw), 9)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(sig)
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", idat))
        f.write(chunk(b"IEND", b""))


def main():
    # 1. Build height field.
    height = [[0.0] * SIZE for _ in range(SIZE)]
    for j in range(SIZE):
        v = j / SIZE
        for i in range(SIZE):
            u = i / SIZE
            height[j][i] = fbm_seamless(u, v)

    # 2. Central-difference normals on a torus, packed into RGBA.
    pix = bytearray()
    for j in range(SIZE):
        for i in range(SIZE):
            hl = height[j][(i - 1) % SIZE]
            hr = height[j][(i + 1) % SIZE]
            hd = height[(j - 1) % SIZE][i]
            hu = height[(j + 1) % SIZE][i]
            dx = (hl - hr) * BUMP
            dy = (hd - hu) * BUMP
            dz = 1.0
            L = math.sqrt(dx * dx + dy * dy + dz * dz)
            nx = dx / L
            ny = dy / L
            nz = dz / L
            r = max(0, min(255, int(round((nx * 0.5 + 0.5) * 255))))
            g = max(0, min(255, int(round((ny * 0.5 + 0.5) * 255))))
            b = max(0, min(255, int(round((nz * 0.5 + 0.5) * 255))))
            pix += bytes((r, g, b, 255))

    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.normpath(os.path.join(here, "..", "assets", "textures",
                                          "water_normal.png"))
    write_png(out, SIZE, SIZE, bytes(pix))
    print(f"wrote {out} ({SIZE}x{SIZE} RGBA, {len(pix)} bytes raw)")


if __name__ == "__main__":
    main()
