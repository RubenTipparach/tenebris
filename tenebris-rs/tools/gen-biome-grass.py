#!/usr/bin/env python3
"""Generate the biome-sod terrain textures (jungle / dry pasture).

Baked-asset path (CLAUDE.md static-asset guidelines): deterministic
16x16 RGBA PNGs under assets/textures/, derived from the stock
grass.png / dirt_grass.png so the sods keep the tuft pattern players
already read as "grass":

  jungle_grass.png       deep dark green top (Biome::Jungle)
  jungle_dirt_grass.png  matching column side (grass lip darkened,
                         dirt left alone)
  dry_grass.png          yellow-green pasture top (Biome::Fields on
                         seeded worlds)
  dry_dirt_grass.png     matching column side

A plain multiply tint (the CragRock / Leaves atlas mechanism) cannot
make pasture YELLOW - grass.png's red channel is mostly zero, and a
multiplier can't add red that isn't there. So the dry variant channel-
mixes instead: red is derived from the green channel, which is where
all the tuft detail lives. stdlib + zlib only; byte-identical output
every run.

Run from tenebris-rs/:  python tools/gen-biome-grass.py
"""

import struct
import zlib

TEX = "assets/textures"


def read_png(path):
    data = open(path, "rb").read()
    pos, idat, w, h, ct = 8, b"", 0, 0, 0
    plte, trns = b"", b""
    while pos < len(data):
        ln = struct.unpack(">I", data[pos : pos + 4])[0]
        typ = data[pos + 4 : pos + 8]
        if typ == b"IHDR":
            w, h, _bd, ct = struct.unpack(">IIBB", data[pos + 8 : pos + 18])
        if typ == b"PLTE":
            plte = data[pos + 8 : pos + 8 + ln]
        if typ == b"tRNS":
            trns = data[pos + 8 : pos + 8 + ln]
        if typ == b"IDAT":
            idat += data[pos + 8 : pos + 8 + ln]
        pos += 12 + ln
    raw = zlib.decompress(idat)
    ch = {0: 1, 2: 3, 3: 1, 4: 2, 6: 4}[ct]
    stride = w * ch
    px, prev, p = [], bytearray(stride), 0
    for _y in range(h):
        f = raw[p]
        p += 1
        line = bytearray(raw[p : p + stride])
        p += stride
        for i in range(stride):
            a = line[i - ch] if i >= ch else 0
            b = prev[i]
            if f == 1:
                line[i] = (line[i] + a) & 255
            elif f == 2:
                line[i] = (line[i] + b) & 255
            elif f == 3:
                line[i] = (line[i] + ((a + b) >> 1)) & 255
            elif f == 4:
                c = prev[i - ch] if i >= ch else 0
                pp = a + b - c
                pa, pb, pc = abs(pp - a), abs(pp - b), abs(pp - c)
                pr = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pr) & 255
        prev = line
        for x in range(w):
            q = line[x * ch : x * ch + ch]
            if ct == 3:  # palette-indexed
                i = q[0]
                r, g, b = plte[i * 3], plte[i * 3 + 1], plte[i * 3 + 2]
                a = trns[i] if i < len(trns) else 255
                px.append((r, g, b, a))
            elif ct == 2:  # RGB
                px.append((q[0], q[1], q[2], 255))
            else:  # RGBA
                px.append((q[0], q[1], q[2], q[3]))
    return w, h, px


def write_png(path, w, h, px):
    raw = b""
    for y in range(h):
        raw += b"\x00"
        for x in range(w):
            raw += bytes(px[y * w + x])
    def chunk(typ, body):
        c = typ + body
        return struct.pack(">I", len(body)) + c + struct.pack(">I", zlib.crc32(c))
    out = b"\x89PNG\r\n\x1a\n"
    out += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    out += chunk(b"IDAT", zlib.compress(raw, 9))
    out += chunk(b"IEND", b"")
    open(path, "wb").write(out)


def clamp(v):
    return 0 if v < 0 else (255 if v > 255 else int(v))


def jungle_mix(r, g, b):
    """Deep dark green: straight per-channel darkening."""
    return clamp(r * 0.45), clamp(g * 0.72), clamp(b * 0.38)


def dry_mix(r, g, b):
    """Yellow-green pasture: red rides the green channel (the tuft
    detail), blue drops away - reads as sun-dried grass."""
    return clamp(g * 0.92 + r * 0.15), clamp(g * 1.00), clamp(b * 0.40)


def is_grassy(r, g, b):
    """Side tiles: only the grass lip gets recolored, dirt stays."""
    return g > r + 20


def bake(src, dst, mix, lip_only):
    w, h, px = read_png("%s/%s" % (TEX, src))
    out = []
    for (r, g, b, a) in px:
        if lip_only and not is_grassy(r, g, b):
            out.append((r, g, b, a))
        else:
            nr, ng, nb = mix(r, g, b)
            out.append((nr, ng, nb, a))
    write_png("%s/%s" % (TEX, dst), w, h, out)
    print("wrote %s/%s" % (TEX, dst))


def main():
    bake("grass.png", "jungle_grass.png", jungle_mix, False)
    bake("dirt_grass.png", "jungle_dirt_grass.png", jungle_mix, True)
    bake("grass.png", "dry_grass.png", dry_mix, False)
    bake("dirt_grass.png", "dry_dirt_grass.png", dry_mix, True)


if __name__ == "__main__":
    main()
