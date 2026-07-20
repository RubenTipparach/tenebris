#!/usr/bin/env python3
"""Generate the moss + rock item icons foraged from the "mossy rock" surface
scatter. 32x32 RGBA PNGs, deterministic, stdlib + zlib only (per the static
asset guidelines). Writes assets/textures/items/{moss,rock}.png."""
import os
import struct
import zlib

T = 32


def h(x, y, salt):
    """Deterministic 0..1 hash (no RNG - reproducible builds)."""
    n = (x * 374761393 + y * 668265263 + salt * 2246822519) & 0xFFFFFFFF
    n = (n ^ (n >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((n ^ (n >> 16)) & 0xFFFF) / 65535.0


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def moss_px(x, y):
    """Soft green moss clump: speckled greens, a fuzzy round-ish blob."""
    cx, cy = 15.5, 16.5
    d = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
    edge = 13.5 + 1.5 * h(x, y, 7)
    if d > edge:
        return (0, 0, 0, 0)
    n = h(x, y, 1)
    dark = (36, 92, 34)
    light = (120, 190, 84)
    c = lerp(dark, light, n * n)
    # a few brighter moss tufts
    if h(x // 2, y // 2, 3) > 0.86:
        c = lerp(c, (170, 220, 120), 0.7)
    a = 255 if d < edge - 1.0 else 150
    return (c[0], c[1], c[2], a)


def rock_px(x, y):
    """Grey pebble with a green moss cap on its top-left shoulder."""
    cx, cy = 16.0, 18.0
    # squat ellipse so it reads as a stone sitting on the ground
    d = (((x - cx) / 14.0) ** 2 + ((y - cy) / 12.0) ** 2) ** 0.5
    if d > 1.0 + 0.05 * h(x, y, 9):
        return (0, 0, 0, 0)
    n = h(x, y, 2)
    # base grey, darker toward the bottom for a lit-from-above look
    shade = 1.0 - (y - 4) / 40.0
    base = lerp((84, 84, 92), (168, 168, 176), n * shade)
    c = base
    # moss cap on the upper-left
    m = h(x, y, 4)
    moss_here = (x < 20 and y < 17) and (m + (17 - y) * 0.03 + (20 - x) * 0.02) > 0.75
    if moss_here:
        c = lerp((48, 120, 44), (120, 190, 84), h(x, y, 5))
    a = 255 if d < 0.92 else 170
    return (c[0], c[1], c[2], a)


def build(fn):
    raw = bytearray()
    for y in range(T):
        raw.append(0)  # filter byte
        for x in range(T):
            raw.extend(fn(x, y))
    return raw


def chunk(tag, data):
    return (
        struct.pack(">I", len(data))
        + tag
        + data
        + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
    )


def save(name, fn):
    raw = build(fn)
    ihdr = struct.pack(">IIBBBBB", T, T, 8, 6, 0, 0, 0)  # 8-bit RGBA
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", zlib.compress(bytes(raw), 9))
        + chunk(b"IEND", b"")
    )
    out = os.path.join("assets", "textures", "items", name)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "wb") as f:
        f.write(png)
    print("wrote", out, f"({T}x{T})")


def main():
    save("moss.png", moss_px)
    save("rock.png", rock_px)


if __name__ == "__main__":
    main()
