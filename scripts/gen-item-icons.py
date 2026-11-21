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
  industry and nuclear items: icons/ (brick, clay pot, oil and lava buckets,
  kerosene, plastic, enriched uranium, fuel rod, cooked fish, fish stew),
  technology/ machine art and faces (kiln, oven, pump jack, refinery,
  centrifuge, reactor, nuclear fabricator, campfire, batteries), and the
  tier 3-4 rocket parts
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


def rocket_fuel(body=(255, 0, 77, 255), shade=(126, 37, 83, 255), drop=(41, 173, 255, 255)):
    # PICO-8 palette, matching the game's other pixel art
    clear = (0, 0, 0, 0)
    dark = (29, 43, 83, 255)      # outline
    red = body                    # body
    white = (255, 241, 232, 255)  # band / cap
    blue = drop                   # the drop on the band
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


def bucket(full, fill=("blue", "navy", "white")):
    """Empty pail, or full of a liquid drawn as (surface, edge, glint)"""
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
        top, edge, glint = fill
        for x in range(4, 12):
            px[6][x] = c[top]
            px[7][x] = c[edge] if x in (4, 11) else c[top]
        px[6][6] = px[6][7] = c[glint]     # a glint on the liquid
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


def _canvas():
    return [[(0, 0, 0, 0)] * 16 for _ in range(16)], {k: v + (255,) for k, v in P8.items()}


def brick():
    """A fired brick, lit from the top left"""
    px, c = _canvas()
    for y in range(5, 12):
        for x in range(1, 15):
            edge = x in (1, 14) or y in (5, 11)
            top = y == 6 and 1 < x < 14
            px[y][x] = c["navy"] if edge else c["peach"] if top else c["plum"] if y == 10 or x == 13 else c["brown"]
    for x in (4, 9):
        px[8][x] = c["plum"]          # frog marks
    return px


def clay_pot():
    """A fired clay pot"""
    px, c = _canvas()
    rows = {3: (5, 10), 4: (6, 9), 5: (5, 10), 6: (4, 11), 7: (3, 12), 8: (3, 12), 9: (3, 12),
            10: (3, 12), 11: (4, 11), 12: (4, 11), 13: (5, 10)}
    for y, (x0, x1) in rows.items():
        for x in range(x0, x1 + 1):
            edge = x in (x0, x1) or y in (3, 13)
            px[y][x] = c["navy"] if edge else c["peach"] if x < x0 + 2 else c["plum"] if x > x1 - 2 else c["brown"]
    for x in range(4, 12):
        if px[9][x] == c["brown"]:
            px[9][x] = c["orange"]    # a painted band
    return px


def plastic():
    """A stack of plastic sheets"""
    px, c = _canvas()
    for i, (hi, mid, lo) in enumerate([("white", "pink", "plum"), ("white", "blue", "navy"), ("white", "lgrey", "indigo")]):
        y0 = 4 + i * 3
        for y in range(y0, y0 + 3):
            for x in range(2 + i, 14 - (2 - i)):
                edge = y == y0 + 2 or x in (2 + i, 13 - (2 - i))
                px[y][x] = c[lo] if edge else c[hi] if y == y0 else c[mid]
    return px


def fuel_rod():
    """A zirconium fuel rod: a long tube, green pellets at the window"""
    px, c = _canvas()
    for y in range(1, 15):
        for x in range(6, 10):
            edge = x in (6, 9) or y in (1, 14)
            px[y][x] = c["navy"] if edge else c["white"] if x == 7 else c["lgrey"]
    for y in range(5, 11):
        px[y][7] = c["lime"] if y % 2 else c["green"]
        px[y][8] = c["green"]
    return px


def bowl(soup, chunk):
    """A wooden bowl of stew"""
    px, c = _canvas()
    for y in range(7, 14):
        inset = max(0, y - 10)
        x0, x1 = 2 + inset, 13 - inset
        for x in range(x0, x1 + 1):
            edge = x in (x0, x1) or y == 13
            px[y][x] = c["navy"] if edge else c["peach"] if x < x0 + 2 else c["brown"]
    for x in range(3, 13):
        px[7][x] = c[soup]
        px[6][x] = c[soup] if 4 <= x <= 11 else px[6][x]
    for x in (5, 8, 10):
        px[6][x] = c[chunk]
    px[3][6] = px[4][7] = px[2][9] = px[3][10] = c["lgrey"]   # steam
    return px


def campfire():
    """Crossed logs under a flame"""
    px, c = _canvas()
    for i in range(12):
        for d in (0, 1):
            y = 14 - i // 3 + d
            if 0 <= y < 16:
                px[y][2 + i] = c["brown"] if d == 0 else c["plum"]
                px[y][13 - i] = c["brown"] if d == 0 else c["plum"]
    flame = {3: (7, 8), 4: (7, 8), 5: (6, 9), 6: (6, 9), 7: (5, 10), 8: (5, 10), 9: (5, 10), 10: (6, 9)}
    for y, (x0, x1) in flame.items():
        for x in range(x0, x1 + 1):
            core = x0 < x < x1 and y > 5
            px[y][x] = c["yellow"] if core and y > 7 else c["orange"] if core else c["red"]
    return px


def battery(cap, band, mark):
    """A cell battery: terminal cap, coloured band, tier mark"""
    px, c = _canvas()
    for x in (6, 7, 8, 9):
        px[1][x] = c["dgrey"]
        px[2][x] = c["lgrey"]
    for y in range(3, 15):
        for x in range(3, 13):
            edge = x in (3, 12) or y in (3, 14)
            px[y][x] = c["navy"] if edge else c["white"] if x == 4 else c[cap] if y < 6 else c[band] if y < 12 else c["dgrey"]
    for y, x in mark:
        px[y][x] = c["white"]
    return px


def trefoil(px, colour="yellow"):
    """Stamp a small radiation mark in the top-right corner of a face"""
    c = {k: v + (255,) for k, v in P8.items()}
    for y in range(0, 5):
        for x in range(11, 16):
            px[y][x] = c["black"]
    for y, x in [(1, 13), (2, 12), (2, 13), (2, 14), (3, 12), (3, 14), (2, 13)]:
        px[y][x] = c[colour]
    return px


def leaves():
    """A sprig of leaves (the LEAVES item had no icon on disk)"""
    px, c = _canvas()
    stem = [(13, 2), (12, 3), (11, 4), (10, 5), (9, 6), (8, 7), (7, 8), (6, 9), (5, 10), (4, 11), (3, 12), (2, 13)]
    for x, y in stem:
        px[y][x] = c["brown"]
    for cx, cy in [(10, 2), (12, 6), (6, 5), (9, 9), (3, 8), (6, 12)]:
        for dy in range(-1, 2):
            for dx in range(-1, 2):
                if abs(dx) + abs(dy) <= 1 or (dx, dy) == (-1, -1):
                    x, y = cx + dx, cy + dy
                    if 0 <= x < 16 and 0 <= y < 16:
                        px[y][x] = c["lime"] if dx + dy < 0 else c["green"] if dx + dy > 0 else c["green"]
        px[cy][cx] = c["lime"]
        if 0 <= cy + 1 < 16 and cx + 1 < 16:
            px[cy + 1][cx + 1] = c["navy"]
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

    # ---- Industry and nuclear (openspec industry-and-nuclear) ------------
    write("icons/leaves.png", leaves())
    write("icons/brick.png", brick())
    write("icons/clay_pot.png", clay_pot())
    write("icons/crude_oil_bucket.png", bucket(True, ("black", "navy", "indigo")))
    write("icons/lava_bucket.png", bucket(True, ("orange", "red", "yellow")))
    c8 = {k: v + (255,) for k, v in P8.items()}
    write("icons/kerosene.png", rocket_fuel(c8["yellow"], c8["orange"], c8["brown"]))
    write("icons/plastic.png", plastic())
    uran = [P8[k] for k in ("navy", "green", "green", "lime", "lime", "yellow")]
    write("icons/enriched_uranium.png", recolour(read_png(os.path.join(tex, "minerals/earth/iron.png")), uran))
    write("icons/fuel_rod.png", fuel_rod())
    cooked = [P8[k] for k in ("navy", "plum", "brown", "orange", "peach")]
    write("icons/cooked_fish.png", recolour(read_png(os.path.join(tex, "fish/perch.png")), cooked))
    write("icons/fish_stew.png", bowl("orange", "peach"))
    # Machines: the shipped machine art (same layout, so same block UVs)
    # redrawn in each machine's own colours; the face is its item icon
    techd = os.path.join(tex, "technology")
    machines = [
        ("kiln", "furnace", ("plum", "brown", "orange", "peach"), False),
        ("oven", "furnace", ("navy", "dgrey", "lgrey", "red", "white"), False),
        ("pump_jack", "steam_engine", ("black", "dgrey", "yellow", "orange"), False),
        ("refinery", "electric_furnace", ("navy", "dgrey", "lgrey", "orange", "white"), False),
        ("centrifuge", "hydro_generator", ("navy", "indigo", "lgrey", "lime", "white"), True),
        ("reactor", "computer", ("black", "navy", "dgrey", "lgrey", "blue"), True),
        ("nuclear_fabricator", "electronics_workbench", ("navy", "green", "lime", "lgrey", "white"), True),
    ]
    for name, src, keys, nuclear in machines:
        ramp = [P8[k] for k in keys]
        write(f"technology/{name}.png", recolour(read_png(os.path.join(techd, src + ".png")), ramp))
        face = recolour(read_png(os.path.join(techd, src + "_face.png")), ramp)
        write(f"technology/{name}_face.png", trefoil(face) if nuclear else face)
    write("technology/campfire_face.png", campfire())
    # Batteries: one tier mark per tier (I, II, III)
    write("technology/battery_lead_acid_face.png", battery("dgrey", "red", [(8, 7), (9, 7), (10, 7)]))
    write("technology/battery_lithium_face.png", battery("lgrey", "blue", [(8, 6), (9, 6), (10, 6), (8, 8), (9, 8), (10, 8)]))
    write("technology/battery_solid_state_face.png", battery("indigo", "lime", [(8, 5), (9, 5), (10, 5), (8, 7), (9, 7), (10, 7), (8, 9), (9, 9), (10, 9)]))
    # Tier 3-4 rocket parts, redrawn from the shipped part textures
    nte = [P8[k] for k in ("black", "navy", "green", "lime", "lgrey", "white")]
    ion = [P8[k] for k in ("black", "navy", "indigo", "pink", "white")]
    core = [P8[k] for k in ("navy", "dgrey", "lgrey", "lime", "white")]
    pack = [P8[k] for k in ("navy", "dgrey", "blue", "lgrey", "white")]
    for name, src, ramp in [("nuclear_thermal_engine", "medium_engine", nte), ("ion_drive", "medium_engine", ion),
                            ("reactor_core", "medium_fuel_tank", core), ("battery_pack", "medium_fuel_tank", pack)]:
        write(f"rocket_parts/{name}.png", recolour(read_png(os.path.join(parts, src + ".png")), ramp))
        face = recolour(read_png(os.path.join(parts, src + "_face.png")), ramp)
        write(f"rocket_parts/{name}_face.png", trefoil(face) if name in ("nuclear_thermal_engine", "reactor_core") else face)
