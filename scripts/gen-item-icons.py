#!/usr/bin/env python3
"""Generate small item icons for the JS client (stdlib only).

Writes, under public/textures/:
  icons/rocket_fuel.png      a 16x16 fuel canister
  icons/bucket.png           an empty iron bucket
  icons/water_bucket.png     the bucket full of water
  icons/ingot_titanium.png   the Moon's titanium, as an ingot (iron ingot's shape)
  rocket_parts/vacuum_engine(.png, _face.png)    tier-2 rocket parts: the
  rocket_parts/large_fuel_tank(.png, _face.png)  shipped part textures (same
  rocket_parts/cargo_bay(.png, _face.png)        UV layout, so the same .obj
                                                 models) redrawn in their own
                                                 colours, shade by shade
Deterministic - rerun to regenerate.
"""
import os
import struct
import zlib

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def write_png(path, pixels):
    h = len(pixels)
    w = len(pixels[0])
    raw = b"".join(b"\x00" + b"".join(bytes(px) for px in row) for row in pixels)

    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(png)


def rocket_fuel():
    # PICO-8 palette, matching the game's other pixel art
    clear = (0, 0, 0, 0)
    dark = (29, 43, 83, 255)      # outline
    red = (255, 0, 77, 255)       # body
    shade = (126, 37, 83, 255)    # body shadow
    white = (255, 241, 232, 255)  # band / cap
    blue = (41, 173, 255, 255)    # "H2O" drop on the band
    grey = (95, 87, 79, 255)      # cap
    px = [[clear] * 16 for _ in range(16)]
    # cap and nozzle
    for x in range(6, 10):
        px[1][x] = grey
        px[2][x] = grey
    px[0][7] = dark
    px[0][8] = dark
    # body x 3..12, y 3..15
    for y in range(3, 16):
        for x in range(3, 13):
            edge = x in (3, 12) or y in (3, 15)
            px[y][x] = dark if edge else (shade if x >= 10 else red)
    # white band with a blue drop
    for x in range(4, 12):
        for y in (8, 9, 10):
            px[y][x] = white
    px[8][7] = blue
    px[9][6] = blue
    px[9][7] = blue
    px[9][8] = blue
    px[10][7] = blue
    return px


# PICO-8 colours (the game's item art palette)
P8 = {
    "black": (0, 0, 0), "navy": (29, 43, 83), "plum": (126, 37, 83), "green": (0, 135, 81),
    "brown": (171, 82, 54), "dgrey": (95, 87, 79), "lgrey": (194, 195, 199), "white": (255, 241, 232),
    "red": (255, 0, 77), "orange": (255, 163, 0), "yellow": (255, 236, 39), "lime": (0, 228, 54),
    "blue": (41, 173, 255), "indigo": (131, 118, 156), "pink": (255, 119, 168), "peach": (255, 204, 170),
}


def read_png(path):
    """Decode an 8-bit PNG (palette, RGB or RGBA) to rows of RGBA tuples."""
    data = open(path, "rb").read()
    pos, idat, plte, trns = 8, b"", None, None
    while pos < len(data):
        n = struct.unpack(">I", data[pos:pos + 4])[0]
        tag, body = data[pos + 4:pos + 8], data[pos + 8:pos + 8 + n]
        pos += 12 + n
        if tag == b"IHDR":
            w, h, depth, ctype = struct.unpack(">IIBB", body[:10])
        elif tag == b"PLTE":
            plte = [tuple(body[i:i + 3]) for i in range(0, len(body), 3)]
        elif tag == b"tRNS":
            trns = body
        elif tag == b"IDAT":
            idat += body
    assert depth == 8, path
    bpp = {3: 1, 2: 3, 6: 4}[ctype]
    raw = zlib.decompress(idat)
    rows, prev, stride = [], bytearray(w * bpp), w * bpp
    for y in range(h):
        f = raw[y * (stride + 1)]
        line = bytearray(raw[y * (stride + 1) + 1:(y + 1) * (stride + 1)])
        for i in range(stride):
            a = line[i - bpp] if i >= bpp else 0
            b = prev[i]
            c = prev[i - bpp] if i >= bpp else 0
            if f == 1: line[i] = (line[i] + a) & 255
            elif f == 2: line[i] = (line[i] + b) & 255
            elif f == 3: line[i] = (line[i] + (a + b) // 2) & 255
            elif f == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[i] = (line[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 255
        prev = line
        row = []
        for x in range(w):
            if ctype == 3:
                k = line[x]
                alpha = trns[k] if trns is not None and k < len(trns) else 255
                row.append(plte[k] + (alpha,))
            elif ctype == 2:
                row.append(tuple(line[x * 3:x * 3 + 3]) + (255,))
            else:
                row.append(tuple(line[x * 4:x * 4 + 4]))
        rows.append(row)
    return rows


def recolour(px, ramp):
    """Redraw a texture in a new ramp: each distinct shade (by brightness)
    keeps its rank, so the art reads the same in its own colours."""
    def lum(c):
        return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
    shades = sorted({p[:3] for row in px for p in row if p[3] > 0}, key=lum)
    lo, hi = lum(shades[0]), lum(shades[-1])
    out = []
    for row in px:
        r = []
        for p in row:
            if p[3] == 0:
                r.append((0, 0, 0, 0))
                continue
            t = (lum(p) - lo) / (hi - lo) if hi > lo else 0
            c = ramp[min(len(ramp) - 1, int(t * len(ramp)))]
            r.append(c + (255,))
        out.append(r)
    return out


def bucket(full):
    clear = (0, 0, 0, 0)
    c = {k: v + (255,) for k, v in P8.items()}
    px = [[clear] * 16 for _ in range(16)]
    # handle: an arc over the rim
    for x in range(4, 12):
        px[2][x] = c["dgrey"]
    px[3][3] = px[4][3] = c["dgrey"]
    px[3][12] = px[4][12] = c["dgrey"]
    # body: tapering pail, rim at y 5, bottom at y 14
    for y in range(5, 15):
        inset = (y - 5) // 4
        x0, x1 = 3 + inset, 12 - inset
        for x in range(x0, x1 + 1):
            edge = x in (x0, x1) or y in (5, 14)
            px[y][x] = c["navy"] if edge else (c["lgrey"] if x < x0 + 3 else c["indigo"] if x > x1 - 3 else c["white"])
    # a band round the middle
    for x in range(4, 12):
        px[9][x] = c["dgrey"] if px[9][x] != clear else clear
    if full:
        for x in range(4, 12):
            px[6][x] = c["blue"]
            px[7][x] = c["navy"] if x in (4, 11) else c["blue"]
        px[6][6] = px[6][7] = c["white"]   # a glint on the water
    else:
        for x in range(4, 12):
            px[6][x] = c["dgrey"]          # the dark inside
    return px


def cargo_face():
    """Cargo bay icon: a crate on hazard stripes"""
    c = {k: v + (255,) for k, v in P8.items()}
    px = [[(0, 0, 0, 0)] * 16 for _ in range(16)]
    for y in range(1, 15):
        for x in range(2, 14):
            edge = x in (2, 13) or y in (1, 14)
            stripe = (x + y) % 6 < 3
            px[y][x] = c["navy"] if edge else (c["yellow"] if stripe else c["black"]) if y in (2, 3, 12, 13) else c["lgrey"]
    for y in range(4, 12):
        for x in range(4, 12):
            edge = x in (4, 11) or y in (4, 11)
            px[y][x] = c["dgrey"] if edge else (c["brown"] if (x + y) % 4 else c["orange"])
    return px


def write(rel, px):
    out = os.path.join(ROOT, "public", "textures", rel)
    write_png(out, px)
    print("wrote", os.path.relpath(out, ROOT))


if __name__ == "__main__":
    tex = os.path.join(ROOT, "public", "textures")
    write("icons/rocket_fuel.png", rocket_fuel())
    write("icons/bucket.png", bucket(False))
    write("icons/water_bucket.png", bucket(True))
    ti = [P8[k] for k in ("navy", "dgrey", "indigo", "lgrey", "white")]
    write("icons/ingot_titanium.png", recolour(read_png(os.path.join(tex, "minerals/earth/iron.png")), ti))
    # Vacuum engine: dark titanium bell, glowing blue throat
    vac = [P8[k] for k in ("black", "navy", "indigo", "blue", "lgrey", "white")]
    # Large fuel tank: white and orange (insulated cryo tank)
    big = [P8[k] for k in ("brown", "orange", "peach", "lgrey", "white")]
    # Cargo bay: grey hull, yellow hazard trim
    bay = [P8[k] for k in ("navy", "dgrey", "lgrey", "yellow", "white")]
    parts = os.path.join(tex, "rocket_parts")
    for name, src, ramp in [("vacuum_engine", "medium_engine", vac),
                            ("large_fuel_tank", "medium_fuel_tank", big),
                            ("cargo_bay", "medium_fuel_tank", bay)]:
        write(f"rocket_parts/{name}.png", recolour(read_png(os.path.join(parts, src + ".png")), ramp))
    write("rocket_parts/vacuum_engine_face.png", recolour(read_png(os.path.join(parts, "medium_engine_face.png")), vac))
    write("rocket_parts/large_fuel_tank_face.png", recolour(read_png(os.path.join(parts, "medium_fuel_tank_face.png")), big))
    write("rocket_parts/cargo_bay_face.png", cargo_face())
