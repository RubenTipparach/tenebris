#!/usr/bin/env python3
"""Generate the block-breaking crack overlay atlas.

Baked-asset path (CLAUDE.md static-asset guidelines): a deterministic
horizontal strip of N 32x32 RGBA stages under assets/textures/, alpha-
blended by the renderer over the mined block's own texture (a decal on
the block's actual prism geometry, so it works for full hexes, skinny
tree trunks, and variable-width leaves alike). Stage 0 is a faint
hairline crack; the last stage is a dense shatter. One master set of
fractures revealed progressively, so it reads as one block cracking
apart the longer you hit it - the Minecraft destroy_stage_0..N pattern.

stdlib + zlib only.  Run from tenebris-rs/:
    python tools/gen-break-stages.py
"""

import math
import os
import struct
import zlib

N = 6   # number of progressive stages
S = 32  # per-stage cell size (px)

# Deterministic LCG so the atlas is byte-identical on every run.
_seed = [0x1A2B3C4D]


def rnd():
    _seed[0] = (_seed[0] * 1103515245 + 12345) & 0x7FFFFFFF
    return _seed[0] / 0x7FFFFFFF


def make_fractures(count):
    """A master set of jagged fracture polylines over one cell."""
    frs = []
    for _ in range(count):
        # Seed each fracture in the central area so cracks radiate from
        # the impact zone rather than the border.
        x = S * (0.30 + 0.4 * rnd())
        y = S * (0.30 + 0.4 * rnd())
        ang = rnd() * 2 * math.pi
        pts = [(x, y)]
        steps = 6 + int(rnd() * 8)
        for _ in range(steps):
            ang += (rnd() - 0.5) * 1.4  # random turn = jaggedness
            ln = 1.5 + rnd() * 2.5
            x = min(max(x + math.cos(ang) * ln, 1.0), S - 2.0)
            y = min(max(y + math.sin(ang) * ln, 1.0), S - 2.0)
            pts.append((x, y))
        frs.append(pts)
    return frs


FRACTURES = make_fractures(14)


def plot(grid, x, y, a):
    xi, yi = int(round(x)), int(round(y))
    if 0 <= xi < S and 0 <= yi < S:
        if a > grid[yi][xi]:
            grid[yi][xi] = a


def line(grid, p0, p1, a, thick):
    x0, y0 = p0
    x1, y1 = p1
    steps = int(max(abs(x1 - x0), abs(y1 - y0))) + 1
    for i in range(steps + 1):
        t = i / steps
        x = x0 + (x1 - x0) * t
        y = y0 + (y1 - y0) * t
        plot(grid, x, y, a)
        if thick:
            # A dimmer halo so late stages read as wide fractures.
            plot(grid, x + 1, y, a * 2 // 3)
            plot(grid, x, y + 1, a * 2 // 3)
            plot(grid, x - 1, y, a // 2)
            plot(grid, x, y - 1, a // 2)


def stage_grid(s):
    """Alpha grid (0..255) for stage s."""
    grid = [[0] * S for _ in range(S)]
    # Reveal a growing prefix of the fractures; darken + thicken with s.
    revealed = max(2, int(round((s + 1) / N * len(FRACTURES))))
    alpha = min(150 + s * 18, 245)
    thick = s >= 2
    for fr in FRACTURES[:revealed]:
        for a, b in zip(fr, fr[1:]):
            line(grid, a, b, alpha, thick)
    return grid


def write_png(path, width, height, rgba):
    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filter: none
        row = y * width * 4
        raw.extend(rgba[row : row + width * 4])

    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as f:
        f.write(png)


def main():
    width = N * S
    height = S
    rgba = bytearray(width * height * 4)  # transparent
    for s in range(N):
        grid = stage_grid(s)
        for y in range(S):
            for x in range(S):
                a = grid[y][x]
                if a == 0:
                    continue
                px = (y * width + s * S + x) * 4
                # Near-black crack; alpha carries the shape.
                rgba[px + 0] = 16
                rgba[px + 1] = 14
                rgba[px + 2] = 13
                rgba[px + 3] = a
    out = os.path.join("assets", "textures")
    os.makedirs(out, exist_ok=True)
    path = os.path.join(out, "break_stages.png")
    write_png(path, width, height, rgba)
    print("wrote", path, "({}x{}, {} stages)".format(width, height, N))


if __name__ == "__main__":
    main()
