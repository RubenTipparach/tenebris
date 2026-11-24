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
  building materials: icons/steel_ingot.png, icons/cement.png (the blocks'
  icons are their own textures, public/textures/building/)
  wool, air and re-entry: icons/ (wool, leather, shears, wool clothing,
  empty and oxygen tanks, space suit), technology/gas_collector(_face),
  rocket_parts/parachute_face (an item icon: the parachute, solar array and
  battery pack are rocket equipment, not stack parts, so they have no part
  texture)
  ocean life: fish/ (the jungle moons' tetra, catfish, leaf pike, peat eel,
  gourami, violet gar; Sequoia's glimmer sprat, underwater-life)
  tools: icons/tools/<tier>_<kind>.png - pickaxe, axe and shovel in the
  rock, copper, iron, steel and titanium tiers
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



def cement():
    """A sack of cement: grey paper sack, tied top, a stencilled band"""
    px, c = _canvas()
    rows = {2: (6, 9), 3: (5, 10), 4: (4, 11)}
    for y in range(5, 14):
        rows[y] = (3, 12)
    for y, (x0, x1) in rows.items():
        for x in range(x0, x1 + 1):
            edge = x in (x0, x1) or y == 13
            lit = (x == x0 + 1 or y == 5) and not edge
            px[y][x] = c["navy"] if edge else c["white"] if lit else c["lgrey"]
    for x in range(6, 10):
        px[1][x] = c["dgrey"]          # the tie
    for x in range(4, 12):
        px[9][x] = c["dgrey"]          # the band
        px[10][x] = c["indigo"]
    return px


# ---- Wool, air and re-entry (openspec wool-air-and-reentry) ---------------

def wool():
    """A tuft of fleece: cream curls lit top-left, shaded under"""
    px, c = _canvas()
    blobs = [(5, 6, 3), (10, 6, 3), (7, 9, 4), (4, 10, 3), (11, 10, 3)]
    for cx, cy, r in blobs:
        for y in range(cy - r, cy + r + 1):
            for x in range(cx - r, cx + r + 1):
                if 0 <= x < 16 and 0 <= y < 16 and (x - cx) ** 2 + (y - cy) ** 2 <= r * r:
                    d = (x - cx) + (y - cy)
                    px[y][x] = c["white"] if d < -1 else c["peach"] if d < 2 else c["lgrey"]
    for y in range(16):
        for x in range(16):
            if px[y][x][3] and any(not (0 <= x + dx < 16 and 0 <= y + dy < 16) or px[y + dy][x + dx][3] == 0
                                   for dx, dy in ((1, 0), (0, 1), (-1, 0), (0, -1))):
                px[y][x] = c["indigo"]
    return px


def leather():
    """A tanned hide: brown, stretched, ragged edge"""
    px, c = _canvas()
    rows = {2: (5, 10), 3: (3, 12), 4: (2, 13), 5: (2, 13), 6: (3, 12), 7: (3, 12), 8: (3, 12),
            9: (3, 12), 10: (2, 13), 11: (2, 13), 12: (3, 12), 13: (5, 10)}
    for y, (x0, x1) in rows.items():
        for x in range(x0, x1 + 1):
            edge = x in (x0, x1) or y in (2, 13)
            lit = (x == x0 + 1 or y == 3) and not edge
            px[y][x] = c["plum"] if edge else c["orange"] if lit else c["brown"]
    for y, x in ((6, 6), (8, 9), (10, 6), (5, 10)):
        px[y][x] = c["plum"]
    return px


def shears():
    """Iron shears: two blades crossed at a rivet, brown grips"""
    px, c = _canvas()
    for i in range(7):
        px[2 + i][3 + i] = c["lgrey"]; px[3 + i][3 + i] = c["dgrey"]
        px[2 + i][12 - i] = c["white"]; px[3 + i][12 - i] = c["lgrey"]
    px[9][7] = px[9][8] = c["navy"]
    for y in range(10, 15):
        for x in (5, 6):
            px[y][x - (y - 10) // 2] = c["brown"]
        for x in (9, 10):
            px[y][x + (y - 10) // 2] = c["plum"]
    return px


def clothing():
    """A wool tunic: sleeves, body, collar"""
    px, c = _canvas()
    for y in range(3, 15):
        x0, x1 = (1, 14) if y < 7 else (4, 11)
        for x in range(x0, x1 + 1):
            edge = x in (x0, x1) or y in (3, 14)
            px[y][x] = c["navy"] if edge else c["peach"] if (x == x0 + 1 or y == 4) else c["white"]
    for x in range(6, 10):
        px[3][x] = c["indigo"]          # collar
    for y in range(8, 14):
        px[y][7] = c["lgrey"]
    return px


def tank(full):
    """An air tank: valve on top, body lit top-left; cyan when full"""
    px, c = _canvas()
    body, lit = (c["blue"], c["white"]) if full else (c["dgrey"], c["lgrey"])
    px[1][7] = px[1][8] = c["dgrey"]
    for x in (6, 7, 8, 9):
        px[2][x] = c["lgrey"]
    for y in range(3, 15):
        x0, x1 = (5, 10) if y in (3, 14) else (4, 11)
        for x in range(x0, x1 + 1):
            edge = x in (x0, x1) or y in (3, 14)
            px[y][x] = c["navy"] if edge else lit if x == x0 + 1 else body
    if full:
        for x in range(6, 10):
            px[8][x] = c["white"]; px[9][x] = c["navy"]
        px[8][6] = c["navy"]
    return px


def space_suit():
    """A suit: white body, orange chest panel, a glass visor helmet"""
    px, c = _canvas()
    for y in range(1, 6):
        for x in range(5, 11):
            edge = x in (5, 10) or y in (1, 5)
            px[y][x] = c["navy"] if edge else c["blue"] if 2 <= y <= 4 and 6 <= x <= 9 else c["lgrey"]
    px[2][7] = c["white"]
    for y in range(6, 15):
        x0, x1 = (2, 13) if y < 10 else (4, 11)
        for x in range(x0, x1 + 1):
            edge = x in (x0, x1) or y == 14
            px[y][x] = c["navy"] if edge else c["lgrey"] if x in (x0 + 1, x1 - 1) else c["white"]
    for y in range(7, 10):
        for x in range(6, 10):
            px[y][x] = c["orange"]
    for y in range(11, 15):
        px[y][7] = px[y][8] = c["navy"]
    return px


def suit_tier(body, trim, chest, plates=False):
    """A suit tier: the space suit's cut in its own colours (space-exploration):
    the thermal suit quilted gold, the hardened suit dark and plated"""
    px, c = _canvas()
    for y in range(1, 6):
        for x in range(5, 11):
            edge = x in (5, 10) or y in (1, 5)
            px[y][x] = c["navy"] if edge else c["blue"] if 2 <= y <= 4 and 6 <= x <= 9 else c[trim]
    px[2][7] = c["white"]
    for y in range(6, 15):
        x0, x1 = (2, 13) if y < 10 else (4, 11)
        for x in range(x0, x1 + 1):
            edge = x in (x0, x1) or y == 14
            px[y][x] = c["navy"] if edge else c[trim] if x in (x0 + 1, x1 - 1) else c[body]
    if plates:                      # plate seams across the torso and legs
        for y in (8, 11):
            for x in range(3, 13):
                if px[y][x] != (0, 0, 0, 0) and px[y][x] != c["navy"]:
                    px[y][x] = c["black"]
    else:                           # quilting: a diamond stitch
        for y in range(7, 14):
            for x in range(3, 13):
                if (x + y) % 3 == 0 and px[y][x] == c[body]:
                    px[y][x] = c[trim]
    for y in range(7, 10):
        for x in range(6, 10):
            px[y][x] = c[chest]
    for y in range(11, 15):
        px[y][7] = px[y][8] = c["navy"]
    return px


def suit_heater(mk2=False):
    """A suit heater: a battery pack with glowing coils"""
    px, c = _canvas()
    for y in range(3, 14):
        for x in range(3, 13):
            edge = x in (3, 12) or y in (3, 13)
            px[y][x] = c["navy"] if edge else c["dgrey"] if y > 10 else c["lgrey"]
    coil = "blue" if mk2 else "orange"
    hot = "white" if mk2 else "yellow"
    for y in (5, 7, 9):
        for x in range(5, 11):
            px[y][x] = c[coil] if x % 2 else c[hot]
    for x in (6, 9):                 # terminals
        px[2][x] = c["dgrey"]
    if mk2:
        px[11][5] = px[11][6] = c["blue"]
    return px


def chute_face():
    """A parachute pack's face: a canopy over its lines"""
    px, c = _canvas()
    for y in range(2, 7):
        half = 2 + (y - 2) * 2 if y < 5 else 7
        for x in range(8 - half, 8 + half):
            if 0 <= x < 16:
                stripe = (x // 3) % 2 == 0
                px[y][x] = c["navy"] if y == 2 and abs(x - 7.5) > half - 1 else c["red"] if stripe else c["white"]
    for x in range(1, 15):
        px[6][x] = c["plum"]
    for k in range(6):
        px[7 + k][2 + k] = c["lgrey"]; px[7 + k][13 - k] = c["lgrey"]; px[7 + k][7] = c["lgrey"]
    for y in range(12, 15):
        for x in range(6, 10):
            px[y][x] = c["dgrey"] if y > 12 else c["lgrey"]
    return px


def solar_face(wings=False):
    """A solar panel: a grid of blue cells in a grey frame, lit top-left;
    the rocket array adds a mast and a second wing"""
    px, c = _canvas()
    boxes = [(1, 3, 6, 12), (9, 3, 14, 12)] if wings else [(2, 2, 13, 13)]
    for x0, y0, x1, y1 in boxes:
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                edge = x in (x0, x1) or y in (y0, y1)
                seam = (x - x0) % 3 == 0 or (y - y0) % 3 == 0
                lit = x - x0 + y - y0 < 4
                px[y][x] = c["lgrey"] if edge else c["navy"] if seam else c["white"] if lit and (x + y) % 2 == 0 else c["blue"]
    if wings:
        for y in range(5, 11):
            px[y][7] = c["dgrey"]; px[y][8] = c["lgrey"]
    return px


def survey_beacon_face():
    """A survey beacon's face (space-exploration): a steel plate with a mast and
    an orange beacon lamp, lit from the top left. Opaque: it faces a machine cube"""
    px, c = _canvas()
    for y in range(16):
        for x in range(16):
            edge = x in (0, 15) or y in (0, 15)
            px[y][x] = c["navy"] if edge else c["lgrey"] if (x == 1 or y == 1) else c["dgrey"]
    for y in range(5, 14):                    # the mast
        px[y][7] = c["lgrey"]
        px[y][8] = c["indigo"]
    for x in range(4, 12):                    # its foot
        px[13][x] = c["indigo"] if x > 7 else c["lgrey"]
    for (x, y, k) in ((6, 2, "orange"), (7, 2, "yellow"), (8, 2, "orange"), (9, 2, "red"),
                      (6, 3, "orange"), (7, 3, "orange"), (8, 3, "red"), (9, 3, "red"),
                      (7, 4, "red"), (8, 4, "red")):
        px[y][x] = c[k]                       # the lamp
    for (x, y) in ((4, 2), (11, 2), (5, 1), (10, 1)):
        px[y][x] = c["yellow"]                # its glow
    return px


def refit_kit(mk2=False):
    """A refit kit (rocket-refit): a tool case with a wrench on its lid, lit
    from the top left; the mk2 in titanium blue with a green status light"""
    px, c = _canvas()
    body, light, dark = ("blue", "lgrey", "navy") if mk2 else ("orange", "yellow", "brown")
    for y in range(5, 14):
        for x in range(1, 15):
            edge = x in (1, 14) or y in (5, 13)
            px[y][x] = c["black"] if edge else c[light] if (y == 6 or x == 2) else c[dark] if (y == 12 or x == 13) else c[body]
    for x in range(5, 11):                      # the handle
        px[3][x] = c["dgrey"]
    px[4][5] = px[4][10] = c["dgrey"]
    for i in range(6):                          # the wrench across the lid
        px[11 - i][4 + i] = c["lgrey"] if i % 2 else c["white"]
    px[6][9] = px[6][11] = px[5][10] = c["lgrey"]
    if mk2:
        px[8][12] = c["lime"]
    return px


def resource_icon(shape, base, light, dark, accent=None):
    """A body resource or part (space-exploration): one of a few shapes in its
    own colours, lit from the top left, outlined black"""
    px, c = _canvas()
    b, l, d = c[base], c[light], c[dark]
    a = c[accent] if accent else l
    if shape == "canister":                 # a gas bottle: helium-3, deuterium, coolant
        for y in range(3, 15):
            for x in range(5, 11):
                px[y][x] = l if x == 6 else d if x == 9 else b
        for x in range(6, 10):
            px[2][x] = c["lgrey"]
        for x in range(5, 11):
            px[7][x] = a                    # its label band
    elif shape == "crystal":                # a crystal cluster
        for (cx, top, h) in ((5, 4, 9), (8, 2, 11), (11, 5, 8)):
            for y in range(top, top + h):
                w = 1 if y < top + 2 else 2
                for x in range(cx - w, cx + w):
                    px[y][x] = l if x < cx - (w - 1) else b if x < cx else d
    elif shape == "lump":                   # an ore or organic lump: resin, fungus, silica, salvage
        for y in range(4, 14):
            for x in range(3, 13):
                if (x - 7.5) ** 2 / 25 + (y - 9) ** 2 / 20 > 1:
                    continue
                px[y][x] = l if (x + y) < 13 else d if (x + y) > 19 else b
        for (x, y) in ((6, 8), (9, 10), (7, 12)):
            px[y][x] = a
    elif shape == "plate":                  # a processed plate: ceramic, aerogel, superconductor, magnet
        for y in range(5, 12):
            for x in range(2, 14):
                px[y][x] = l if y == 5 or x == 2 else d if y == 11 or x == 13 else b
        for x in range(4, 12, 3):
            px[8][x] = a
    elif shape == "chip":                   # a data chip: coronal field data
        for y in range(4, 12):
            for x in range(3, 13):
                px[y][x] = l if y == 4 else d if y == 11 else b
        for x in range(4, 13, 2):
            px[12][x] = c["lgrey"]
            px[3][x] = c["lgrey"]
        px[7][7] = px[7][8] = px[8][7] = px[8][8] = a
    elif shape == "coil":                   # a magnet coil
        for y in range(3, 14):
            for x in range(4, 12):
                ring = (y % 2 == 0)
                px[y][x] = (l if x < 7 else d) if ring else b
        for y in range(3, 14):
            px[y][7] = c["dgrey"]
    elif shape == "bomb":                   # a pulse unit: a squat charge with a trefoil
        for y in range(4, 14):
            for x in range(3, 13):
                if (x - 7.5) ** 2 / 25 + (y - 9) ** 2 / 25 > 1:
                    continue
                px[y][x] = l if (x + y) < 13 else d if (x + y) > 19 else b
        px = trefoil(px, accent or "yellow")
    return _outline(px, c["black"])


RESOURCE_ICONS = [
    # name, shape, base, light, dark, accent
    ("resin", "lump", "orange", "yellow", "brown", "peach"),
    ("salvage", "lump", "dgrey", "lgrey", "navy", "red"),
    ("superconductor", "plate", "indigo", "lgrey", "navy", "blue"),
    ("rare_earth_ore", "crystal", "plum", "pink", "navy", None),
    ("magnet", "plate", "red", "pink", "plum", "lgrey"),
    ("radiotrophic_fungus", "lump", "green", "lime", "black", "white"),
    ("silica", "lump", "peach", "white", "lgrey", "yellow"),
    ("aerogel", "plate", "blue", "white", "indigo", "white"),
    ("crystal", "crystal", "blue", "white", "indigo", None),
    ("laser_crystal", "crystal", "red", "pink", "plum", None),
    ("cryo_coolant", "canister", "blue", "white", "navy", "white"),
    ("coronal_data", "chip", "dgrey", "lgrey", "black", "orange"),
    ("pulse_unit", "bomb", "dgrey", "lgrey", "black", "yellow"),
    ("helium_3", "canister", "yellow", "white", "orange", "navy"),
    ("deuterium", "canister", "indigo", "lgrey", "navy", "blue"),
    ("metallic_hydrogen", "canister", "lgrey", "white", "dgrey", "plum"),
    ("ceramic_plating", "plate", "brown", "peach", "black", "orange"),
    ("magnetic_coil", "coil", "orange", "yellow", "brown", None),
]


def heat_shield_face():
    """A heat shield (space-exploration): a dome of dark ceramic tiles, its
    rim glowing where the heat meets it, lit from the top left"""
    px, c = _canvas()
    for y in range(3, 14):
        for x in range(1, 15):
            dx, dy = (x - 7.5) / 6.5, (y - 13.5) / 10.0
            if dx * dx + dy * dy > 1:
                continue
            edge = dx * dx + dy * dy > 0.78
            tile = (x // 3 + y // 2) % 2
            if edge:
                px[y][x] = c["navy"]
            elif y >= 12:
                px[y][x] = c["orange"] if (x + y) % 2 else c["red"]   # the hot underside
            else:
                px[y][x] = c["dgrey"] if tile else c["black"]
            if not edge and y < 12 and (x < 6 and y < 8):
                px[y][x] = c["lgrey"] if tile else c["dgrey"]     # light on the top left
    return px


def _outline(px, line):
    """Edge every drawn pixel that touches empty space (4-neighbour) in `line`."""
    clear = (0, 0, 0, 0)
    out = [row[:] for row in px]
    for y in range(16):
        for x in range(16):
            if px[y][x] == clear:
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if not (0 <= nx < 16 and 0 <= ny < 16) or px[ny][nx] == clear:
                    out[y][x] = line
                    break
    return out


def fish_icon(shape, body, back, belly, fin, line="black", length=5.5, height=3.0,
              stripe=None, bands=None, barbels=False):
    """A fish side-on, head to the right like the shipped minnow: back on
    top, belly below, a forked tail and fins, outlined; no anti-aliasing.
    Colours are PICO-8 names (they match the swimming model's look in
    src/config/FishRosters.ts). shape 'eel' draws a long wavy body."""
    import math
    px, c = _canvas()
    cy = 7.5
    if shape == "eel":
        # a sine body from tail (left) to head (right), thickening to the head
        for x in range(1, 15):
            yc = cy + 1.6 * math.sin(x * 0.45)
            half = 1.5 + 0.7 * x / 14
            for y in range(16):
                d = y - yc
                if abs(d) <= half:
                    px[y][x] = c[back] if d < -0.35 else c[belly] if d > 0.45 else c[body]
        # the long fin along the back
        for x in range(3, 13, 2):
            yc = cy + 1.6 * math.sin(x * 0.45)
            y = int(round(yc - 1.9))
            if 0 <= y < 16 and px[y][x] == (0, 0, 0, 0):
                px[y][x] = c[fin]
        px = _outline(px, c[line])
        yh = cy + 1.6 * math.sin(14 * 0.45)
        px[int(round(yh - 0.6))][13] = c["black"] if line != "black" else c["white"]
        return px
    cx = 8.5 - length * 0.15
    for y in range(16):
        for x in range(16):
            u, v = (x - cx) / length, (y - cy) / height
            if u * u + v * v <= 1.0:
                px[y][x] = c[back] if v < -0.3 else c[belly] if v > 0.35 else c[body]
    if stripe:
        for x in range(16):
            if px[8][x] != (0, 0, 0, 0) and abs(x - cx) < length - 1.5:
                px[8][x] = c[stripe]
    if bands:
        for k in (-0.35, 0.05, 0.45):
            x = int(round(cx + k * length))
            for y in range(16):
                if px[y][x] != (0, 0, 0, 0):
                    px[y][x] = c[bands]
    # forked tail to the left, dorsal fin on top, a pectoral fin
    tx = int(round(cx - length))
    for k in range(1, 4):
        for y in (int(cy - k + 0.5), int(cy + k - 0.5)):
            if 0 <= tx - k + 1 < 16:
                px[y][tx - k + 1] = c[fin]
        px[int(cy)][tx] = c[fin]
        px[int(cy) + 1][tx] = c[fin]
    top = int(round(cy - height))
    for x in range(int(cx - 1), int(cx + 2)):
        px[top][x] = c[fin]
    px[top - 1][int(cx)] = c[fin]
    px[int(cy) + 1][int(cx + length * 0.35)] = c[fin]
    px = _outline(px, c[line])
    # the eye near the head, the mouth at the tip
    ex = int(round(cx + length * 0.6))
    px[int(cy) - 1][ex] = c["black"] if line != "black" else c["white"]
    if barbels:
        hx = int(round(cx + length))
        for k in range(1, 3):
            if hx + k < 16:
                px[int(cy) + k][hx + k - 1] = c[fin]
    return px


# The jungle moons' fish (openspec ocean-life), drawn to match their swimming
# models: (file, shape, body, back, belly, fin, outline, length, height, extras)
JUNGLE_FISH = [
    # Verdance
    ("tetra", "fish", "green", "navy", "lime", "orange", "black", 5.0, 3.2, {"stripe": "yellow"}),
    ("catfish", "fish", "brown", "plum", "peach", "dgrey", "black", 6.5, 3.0, {"barbels": True}),
    ("leaf_pike", "fish", "lime", "green", "white", "orange", "navy", 7.0, 2.7, {}),
    # Mirewood
    ("peat_eel", "eel", "dgrey", "navy", "lgrey", "indigo", "black", 0, 0, {}),
    ("gourami", "fish", "blue", "navy", "lgrey", "lime", "black", 5.5, 4.4, {}),
    ("violet_gar", "fish", "indigo", "plum", "white", "pink", "black", 7.0, 2.6, {"bands": "plum"}),
    # Sequoia's schooling fish (openspec underwater-life)
    ("sprat", "fish", "lgrey", "blue", "white", "blue", "navy", 5.0, 2.6, {"stripe": "navy"}),
]


# ---- Tools (openspec tools-and-toolbox) -------------------------------------
# Every tool is a wooden handle on the same diagonal (bottom left to top
# right) with its head drawn from a mask, lit from the top left like the
# rest of the item art. `s` runs along the handle, `d` across it (positive
# toward the top left), in diagonal steps.
TOOL_RAMPS = {
    "rock": ("navy", "dgrey", "dgrey", "lgrey"),
    "copper": ("plum", "brown", "orange", "peach"),
    "iron": ("navy", "dgrey", "lgrey", "white"),
    "steel": ("black", "navy", "indigo", "lgrey"),
    "titanium": ("navy", "indigo", "blue", "white"),
}


def _sd(x, y, ox=2, oy=13):
    dx, dy = x - ox, y - oy
    return (dx - dy) / 2, (-dx - dy) / 2


def tool_icon(kind, tier):
    px, c = _canvas()
    handle, head = set(), set()
    for y in range(16):
        for x in range(16):
            s, d = _sd(x, y)
            if kind == "pickaxe":
                if 0 <= s <= 8 and -0.5 <= d <= 0:
                    handle.add((x, y))
            elif kind == "axe":
                if 0 <= s <= 9 and -0.5 <= d <= 0:
                    handle.add((x, y))
                # the blade on the top-left side, flaring toward its edge
                if 0.5 <= d <= 4.5 and 6.5 - 0.45 * d <= s <= 8.5 + 0.45 * d:
                    head.add((x, y))
                if -2 <= d <= -1 and 7.5 <= s <= 8.5:
                    head.add((x, y))     # the poll behind the handle
            elif kind == "shovel":
                if 4 <= s <= 11.5 and -0.5 <= d <= 0:
                    handle.add((x, y))
                if 11.5 <= s <= 12.5 and -1.5 <= d <= 1:
                    handle.add((x, y))   # the grip
                w = 2.0 * min(1.0, (s + 0.5) / 2.0)
                if -0.5 <= s <= 4.5 and -w - 0.5 <= d <= w:
                    head.add((x, y))
    if kind == "pickaxe":
        # a crescent across the top of the handle, its tips curving back
        for y in range(16):
            for x in range(16):
                sp, dp = _sd(x, y)
                if abs(dp) > 5.5:
                    continue
                centre = 8.5 - 0.11 * dp * dp
                half = 1.1 * (1 - (dp / 6.5) ** 2) + 0.25
                if abs(sp - centre) <= half:
                    head.add((x, y))
    dark, shade, mid, light = (c[k] for k in TOOL_RAMPS[tier])
    for (x, y) in handle - head:
        _, d = _sd(x, y)
        px[y][x] = c["plum"] if d < 0 else c["brown"]
    for (x, y) in head:
        lit = (x - 1, y) not in head or (x, y - 1) not in head
        shadow = (x + 1, y) not in head or (x, y + 1) not in head
        px[y][x] = dark if lit and shadow else light if lit else shade if shadow else mid
    if tier == "rock":
        # knapped stone: a few darker flecks
        for (x, y) in sorted(head):
            if (x * 7 + y * 3) % 5 == 0 and px[y][x] == mid:
                px[y][x] = shade
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
                            ("reactor_core", "medium_fuel_tank", core)]:
        write(f"rocket_parts/{name}.png", recolour(read_png(os.path.join(parts, src + ".png")), ramp))
        face = recolour(read_png(os.path.join(parts, src + "_face.png")), ramp)
        write(f"rocket_parts/{name}_face.png", trefoil(face) if name in ("nuclear_thermal_engine", "reactor_core") else face)
    # The battery pack is rocket equipment (an icon only, no part texture)
    write("rocket_parts/battery_pack_face.png", recolour(read_png(os.path.join(parts, "medium_fuel_tank_face.png")), pack))
    # ---- Building materials (openspec industry-and-nuclear, decision 9) ---
    steel = [P8[k] for k in ("black", "navy", "indigo", "lgrey", "white")]
    write("icons/steel_ingot.png", recolour(read_png(os.path.join(tex, "minerals/earth/iron.png")), steel))
    write("icons/cement.png", cement())
    # ---- Wool, air and re-entry (openspec wool-air-and-reentry) ----------
    write("icons/wool.png", wool())
    write("icons/leather.png", leather())
    write("icons/shears.png", shears())
    write("icons/wool_clothing.png", clothing())
    write("icons/empty_tank.png", tank(False))
    write("icons/oxygen_tank.png", tank(True))
    write("icons/space_suit.png", space_suit())
    write("icons/thermal_suit.png", suit_tier("orange", "yellow", "red"))
    write("icons/hardened_suit.png", suit_tier("dgrey", "indigo", "lime", plates=True))
    write("icons/suit_heater.png", suit_heater())
    write("icons/suit_heater_mk2.png", suit_heater(mk2=True))
    gas = [P8[k] for k in ("navy", "dgrey", "blue", "lgrey", "white")]
    write("technology/gas_collector.png", recolour(read_png(os.path.join(techd, "hydro_generator.png")), gas))
    write("technology/gas_collector_face.png", recolour(read_png(os.path.join(techd, "hydro_generator_face.png")), gas))
    write("rocket_parts/parachute_face.png", chute_face())
    # ---- Space exploration (openspec space-exploration) ----
    write("technology/survey_beacon_face.png", survey_beacon_face())
    write("rocket_parts/heat_shield_face.png", heat_shield_face())
    write("icons/refit_kit.png", refit_kit())
    for name, shape, base, light, dark, accent in RESOURCE_ICONS:
        write(f"icons/{name}.png", resource_icon(shape, base, light, dark, accent))
    # The engine ladder: the medium engine redrawn in each engine's colours
    ladder = [
        ("ion_thruster", ("black", "navy", "blue", "lgrey", "white")),
        ("gas_core_engine", ("black", "plum", "red", "orange", "yellow")),
        ("fission_fragment_drive", ("black", "navy", "green", "lime", "white")),
        ("nuclear_pulse_drive", ("black", "dgrey", "lgrey", "yellow", "white")),
        ("fusion_drive", ("black", "indigo", "pink", "peach", "white")),
        ("fusion_torch", ("black", "navy", "indigo", "pink", "white")),
    ]
    for name, keys in ladder:
        ramp = [P8[k] for k in keys]
        write(f"rocket_parts/{name}.png", recolour(read_png(os.path.join(parts, "medium_engine.png")), ramp))
        face = recolour(read_png(os.path.join(parts, "medium_engine_face.png")), ramp)
        write(f"rocket_parts/{name}_face.png", trefoil(face) if name in ("gas_core_engine", "fission_fragment_drive", "nuclear_pulse_drive") else face)
    write("icons/refit_kit_mk2.png", refit_kit(True))
    # ---- Upgrade parts (space-exploration, resources): each base part's own
    # art in the upgrade's ramp, with mark pips (2 = mk2, 3 = mk3) in the
    # top-right corner so the tiers read apart at a glance
    def pips(px, n, colour="white"):
        out = [list(r) for r in px]
        for k in range(n):
            x, y = 14 - k * 2, 1
            out[y][x] = P8[colour] + (255,)
            out[y + 1][x] = P8["black"] + (255,)
        return out

    def variant(src_name, out_name, keys, n=0, face_only=False):
        ramp = [P8[k] for k in keys]
        if not face_only:
            write(f"rocket_parts/{out_name}.png", recolour(read_png(os.path.join(parts, f"{src_name}.png")), ramp))
        face = recolour(read_png(os.path.join(parts, f"{src_name}_face.png")), ramp)
        write(f"rocket_parts/{out_name}_face.png", pips(face, n) if n else face)

    variant("large_fuel_tank", "fuel_tank_mk2", ("black", "navy", "indigo", "lgrey", "white"), 2)
    variant("large_fuel_tank", "fuel_tank_mk3", ("black", "plum", "indigo", "pink", "white"), 3)
    variant("cargo_bay", "cargo_bay_mk2", ("black", "dgrey", "brown", "orange", "peach"), 2)
    variant("cargo_bay", "large_cargo_bay", ("black", "navy", "dgrey", "lgrey", "white"))
    variant("cargo_bay", "cargo_bay_mk3", ("black", "plum", "red", "orange", "yellow"), 3)
    variant("reactor_core", "compact_reactor_core", ("black", "dgrey", "green", "lime", "white"))
    variant("cargo_bay", "cryo_tank", ("navy", "blue", "lgrey", "white", "white"))
    variant("battery_pack", "battery_pack_mk2", ("black", "navy", "blue", "lgrey", "white"), 2, face_only=True)
    variant("battery_pack", "battery_pack_mk3", ("black", "plum", "pink", "peach", "white"), 3, face_only=True)
    variant("solar_array", "solar_array_mk2", ("black", "plum", "indigo", "pink", "white"), 2, face_only=True)
    variant("solar_array", "radiator", ("black", "dgrey", "brown", "orange", "peach"), face_only=True)
    variant("solar_array", "radiator_mk2", ("black", "plum", "red", "orange", "yellow"), 2, face_only=True)
    variant("parachute", "drogue_chute", ("black", "navy", "orange", "yellow", "white"), face_only=True)
    variant("reactor_core", "rtg", ("black", "dgrey", "orange", "yellow", "white"), face_only=True)
    variant("heat_shield", "heat_shield_mk2", ("black", "navy", "indigo", "lgrey", "white"), 2, face_only=True)
    variant("heat_shield", "heat_shield_mk3", ("black", "plum", "red", "pink", "white"), 3, face_only=True)
    drone = recolour(read_png(os.path.join(techd, "survey_beacon_face.png")), [P8[k] for k in ("black", "navy", "blue", "lgrey", "white")])
    write("rocket_parts/survey_drone_face.png", drone)
    write("icons/radiation_lining.png", resource_icon("plate", "green", "lime", "black", "dgrey"))
    write("icons/coolant_loop.png", resource_icon("coil", "blue", "white", "navy", None))
    write("icons/fuel_rod_mk2.png", pips(recolour(read_png(os.path.join(tex, "icons", "fuel_rod.png")), [P8[k] for k in ("black", "navy", "blue", "lime", "white")]), 2))
    # Stage separator (rocket-staging): the tank's shape in hazard yellow,
    # a black-and-yellow stripe band round its middle on the icon
    sep = [P8[k] for k in ("black", "dgrey", "orange", "yellow", "white")]
    write("rocket_parts/stage_separator.png", recolour(read_png(os.path.join(parts, "medium_fuel_tank.png")), sep))
    sep_face = recolour(read_png(os.path.join(parts, "medium_fuel_tank_face.png")), sep)
    for y in range(6, 10):
        for x in range(len(sep_face[y])):
            if sep_face[y][x][3] > 0:
                sep_face[y][x] = P8["black"] + (255,) if ((x + y) // 2) % 2 else P8["yellow"] + (255,)
    write("rocket_parts/stage_separator_face.png", sep_face)
    # ---- Solar power (wool-air-and-reentry, design 6) ----
    sol = [P8[k] for k in ("navy", "dgrey", "blue", "lgrey", "white")]
    write("technology/solar_panel.png", recolour(read_png(os.path.join(techd, "computer.png")), sol))
    write("technology/solar_panel_face.png", solar_face())
    write("rocket_parts/solar_array_face.png", solar_face(True))
    # ---- Ocean life: the jungle moons' fish (openspec ocean-life 1.2) ----
    for name, shape, body, back, belly, fin, line, length, height, extra in JUNGLE_FISH:
        write(f"fish/{name}.png", fish_icon(shape, body, back, belly, fin, line, length, height, **extra))
    # ---- Tools (openspec tools-and-toolbox) ----
    for tier in TOOL_RAMPS:
        for kind in ("pickaxe", "axe", "shovel"):
            write(f"icons/tools/{tier}_{kind}.png", tool_icon(kind, tier))
