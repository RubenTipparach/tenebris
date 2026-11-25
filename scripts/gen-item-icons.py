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
  art pieces: icons/art/art_<world>.png, one per inhabited world (Sweaft-64)
  ocean life: fish/ (the jungle moons' tetra, catfish, leaf pike, peat eel,
  gourami, violet gar; Sequoia's glimmer sprat, underwater-life)
  technology/sack.png: the overflow sack a full inventory drops (Sweaft-64)
  technology/campfire.png: the campfire model's atlas - bark, log end,
  hearth stone, flame (Sweaft-64)
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


def submarine(hull, light, dark, window, deep=False):
    """A submarine (space-exploration, submarines), side on, nose right: a
    rounded hull lit from the top left, a conning tower, portholes and a
    screw at the stern; the deep hull wears ribs"""
    px, c = _canvas()
    b, l, d, w = c[hull], c[light], c[dark], c[window]
    out = c["black"]
    for y in range(6, 13):
        for x in range(1, 15):
            if ((x - 7.5) / 6.8) ** 2 + ((y - 9.2) / 3.4) ** 2 > 1:
                continue
            px[y][x] = l if y <= 7 else d if y >= 11 else b
    for y in range(3, 7):                       # the conning tower
        for x in range(6, 10):
            px[y][x] = l if x == 6 or y == 3 else d if x == 9 else b
    px[2][7] = c["lgrey"]                        # periscope
    px[1][7] = px[1][8] = c["lgrey"]
    for x in (8, 11):                            # portholes
        px[9][x] = w
    px[9][13] = out                              # the nose cap
    for y in (8, 9, 10):                         # the screw at the stern
        px[y][0] = c["lgrey"] if y != 9 else out
    if deep:
        for x in (4, 7, 10):
            for y in range(7, 12):
                if px[y][x][3] and px[y][x] != w:
                    px[y][x] = d
    return px


def diver(hull, light, dark, window, deep=False):
    """A gas-giant diver: a pressure sphere with a big round window, fins
    and a lifting ring on top; the deep diver has a double ring"""
    px, c = _canvas()
    b, l, d, w = c[hull], c[light], c[dark], c[window]
    for y in range(3, 14):
        for x in range(2, 14):
            r = ((x - 7.5) / 5.5) ** 2 + ((y - 8.5) / 5.5) ** 2
            if r > 1:
                continue
            px[y][x] = l if (x + y) < 12 else d if (x + y) > 19 else b
    for y in range(7, 11):                       # the window
        for x in range(6, 10):
            px[y][x] = w if (x, y) != (6, 7) else c["white"]
    for x in range(6, 10):                       # the lifting ring
        px[1][x] = c["lgrey"]
    px[2][6] = px[2][9] = c["lgrey"]
    if deep:
        for x in range(5, 11):
            px[0][x] = c["lgrey"]
    for (x, y) in ((1, 12), (1, 13), (14, 12), (14, 13)):   # fins
        px[y][x] = d
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
    # Thalassa (openspec space-exploration, ocean-world)
    ("pearl_mullet", "fish", "white", "indigo", "peach", "pink", "navy", 5.5, 2.8, {"stripe": "lgrey"}),
    ("kelp_eel", "eel", "green", "navy", "lime", "plum", "black", 0, 0, {}),
    ("abyss_grouper", "fish", "plum", "navy", "pink", "indigo", "black", 7.0, 4.2, {"bands": "navy"}),
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


# ---- Props drawn the Pale Blue Dot way (the block-textures skill) ---------
# Sweaft-64 only (checked), short ramps lit from the top left, no AA. The
# palette and the check come from the biome generator - one copy of each.
def _biome_gen():
    import importlib.util
    spec = importlib.util.spec_from_file_location("gen_biome", os.path.join(ROOT, "scripts", "gen-biome-textures.py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_BG = _biome_gen()


def _sw(*hexes):
    """A ramp of Sweaft-64 tones (dark to light) as RGBA."""
    return [_BG.rgb(h) + (255,) for h in hexes]


def _checked(px):
    _BG.check_rgba([[None if p[3] == 0 else p[:3] for p in row] for row in px])
    return px


def sack():
    """The overflow sack, 16x16, wrapped round its lathe: u goes round the
    sack (tiles left-right), v is height (row 0 = the top). Rows 0-1 the
    gathered neck, 2-3 the rope tie, 4-14 a basket-weave burlap, 15 the
    bottom seam. Each 2x2 weave cell is one thread: a flat one lit on its
    top row, an upright one lit on its left column and shaded on its right."""
    dark, base, light, hi = _sw("#41322c", "#725244", "#ab8465", "#cfaa81")
    rope = _sw("#2e0d06", "#522b2f", "#7d4636", "#a8633e")
    px = [[base] * 16 for _ in range(16)]
    for y in range(16):
        for x in range(16):
            if y <= 1:
                # gathered folds, 4 px apart: lit left, shaded right
                px[y][x] = (light, base, base, dark)[x % 4]
            elif y <= 3:
                # twisted rope: a lit strand running down-right
                k = (x + (3 - y)) % 4
                px[y][x] = (rope[3], rope[2], rope[1], rope[0])[k] if y == 2 else (rope[2], rope[1], rope[0], rope[1])[k]
            elif y == 15:
                px[y][x] = dark
            else:
                cx, cy = x % 2, y % 2
                flat = ((x // 2) + (y // 2)) % 2 == 0
                if flat:
                    px[y][x] = light if cy == 0 else base
                else:
                    px[y][x] = light if cx == 0 else dark
    # the folds of the neck carry on a little into the body: creases
    for x in range(3, 16, 4):
        px[4][x] = dark
    # a few bright fibres (single pixels, sparingly)
    for x, y in ((2, 6), (9, 9), (13, 12), (5, 13)):
        px[y][x] = hi
    return _checked(px)


def campfire_atlas():
    """The campfire model's atlas, 32x32 in four 16x16 cells:
    (0,0) bark down a log's length, (1,0) a log's cut end, (0,1) a hearth
    stone, (1,1) the flame (alpha-cut, drawn unlit so it glows)."""
    clear = (0, 0, 0, 0)
    px = [[clear] * 32 for _ in range(32)]
    bark = _sw("#2e0d06", "#41322c", "#522b2f", "#7d4636")
    # bark: horizontal ridges 3 px tall (lit top, shaded bottom), cracks
    for y in range(16):
        for x in range(16):
            px[y][x] = (bark[3], bark[2], bark[1])[y % 3]
    for x, y0 in ((3, 0), (10, 4), (6, 9), (13, 12)):
        for d in range(3):
            px[(y0 + d) % 16][x] = bark[0]
    # cut end: rings round the pith, bark rim, lit top-left
    ring = _sw("#725244", "#ab8465", "#cfaa81", "#eab798")
    for y in range(16):
        for x in range(16):
            dx, dy = x - 7.5, y - 7.5
            r = (dx * dx + dy * dy) ** 0.5
            if r > 7.2 or x in (0, 15) or y in (0, 15):
                c = bark[2] if (x + y) < 15 else bark[0]
            elif r > 6:
                c = bark[3] if (x + y) < 15 else bark[1]
            else:
                c = ring[2] if int(r) % 3 else ring[1]
                if int(r) % 3 and dx + dy < -4:
                    c = ring[3]
                if r < 1.5:
                    c = ring[0]
            px[y][16 + x] = c
    # hearth stone: one cobble lit top-left - pale rim top-left, dark rim
    # bottom-right, a few lit 2x2 blotches and dark 2x1 pits (seeded)
    import random
    rng = random.Random(7)
    st = _sw("#1f3b52", "#3e586e", "#5d778d", "#92a3b2")
    for y in range(16):
        for x in range(16):
            c = st[2]
            if x == 0 or y == 0:
                c = st[3]
            elif x == 15 or y == 15:
                c = st[0]
            elif x == 14 or y == 14:
                c = st[1]
            px[16 + y][x] = c
    for _ in range(4):
        x, y = rng.randrange(2, 11), rng.randrange(2, 11)
        for dx, dy in ((0, 0), (1, 0), (0, 1), (1, 1)):
            px[16 + y + dy][x + dx] = st[3]
        px[16 + y + 1][x + 2] = st[1]          # its shadow, bottom-right
    for _ in range(5):
        x, y = rng.randrange(2, 12), rng.randrange(3, 13)
        px[16 + y][x] = px[16 + y][x + 1] = st[1]
    # flame, drawn by hand: R rim, O body, o bright, y heart, e embers
    flame = [
        "................",
        ".......R........",
        "......RR....R...",
        "......ROR...R...",
        ".....ROOR..RR...",
        "..R..ROoOR.ROR..",
        "..RR.ROooOROOR..",
        ".ROR.ROoyoOOoR..",
        ".ROORRooyyoOoOR.",
        ".ROoOOoyyyyoooR.",
        "RROooOoyyyyooOR.",
        "ROOoooyyyyyyoOOR",
        "ROoooyyyyyyyooOR",
        ".ROoooyyyyyoooR.",
        "..RROOoooooORR..",
        "..eReeReeReeRe..",
    ]
    fl = dict(zip("eROoy", _sw("#a61e1f", "#d4462b", "#fe6420", "#fb902f", "#faaf5c")))
    for y, row in enumerate(flame):
        for x, ch in enumerate(row):
            if ch != ".":
                px[16 + y][16 + x] = fl[ch]
    return _checked(px)



# ---- Art pieces (openspec friendship-npcs 4.4) -----------------------------
# One per inhabited world, given only by that world's elders. Drawn pixel by
# pixel the Pale Blue Dot way: Sweaft-64 only (checked), lit from the top
# left, outlined in each piece's darkest tone.
ART_ICONS = {
    # Ferrum: a circuit mosaic tile - traces and gold pads on a dark board
    "art_ferrum": ({"o": "#010e1a", "w": "#92a3b2", "l": "#5d778d", "m": "#3e586e", "d": "#011c34",
                    "t": "#74effe", "g": "#faaf5c"}, [
        "................",
        ".oooooooooooooo.",
        ".owwwwwwwwwwwlo.",
        ".owddddddddddmo.",
        ".owdttttdggddmo.",
        ".owdtddtdggddmo.",
        ".owdtddttttddmo.",
        ".owdtddddddtdmo.",
        ".owdgdtttddtdmo.",
        ".owdgdtdtttddmo.",
        ".owdddtdddddgmo.",
        ".owdttttttdddmo.",
        ".owddddddddddmo.",
        ".olmmmmmmmmmmmo.",
        ".oooooooooooooo.",
        "................",
    ]),
    # Sequoia: an amber totem - an amber drop on two carved faces
    "art_sequoia": ({"o": "#2e0d06", "d": "#522b2f", "m": "#7d4636", "l": "#a8633e", "h": "#cfaa81",
                     "a": "#fb902f", "y": "#faaf5c", "e": "#010000"}, [
        "......oooo......",
        ".....oyyaao.....",
        ".....oyaaado....",
        "......oado......",
        "....oooooooo....",
        "....ohllllmo....",
        "....oleelemo....",
        "....ollllmdo....",
        "....olmoomdo....",
        "...oohllllmoo...",
        "...ohlleelemo...",
        "....ollllmdo....",
        "....olmoomdo....",
        "....ohllllmo....",
        "...oommmmmddo...",
        "...oooooooooo...",
    ]),
    # Cinder: an obsidian mask with ember eyes
    "art_cinder": ({"o": "#010000", "d": "#161612", "m": "#2c2c25", "l": "#434137", "h": "#a09f91",
                    "r": "#d4462b", "y": "#fb902f"}, [
        "................",
        "....oooooooo....",
        "...ohhlllllmo...",
        "..ohllllllllmo..",
        "..ohlllllllmmo..",
        "..olrrylmrrymo..",
        "..olroolmroomo..",
        "..ollllmlllmmo..",
        "..olllllmllmdo..",
        "...ollllmllmo...",
        "...olmoooomdo...",
        "....olmmmmdo....",
        "....olmmmmdo....",
        ".....olmmdo.....",
        "......oooo......",
        "................",
    ]),
    # Vesper: a glass lantern - a cage of clay round a lit glass pane
    "art_vesper": ({"o": "#2e0d06", "c": "#725244", "k": "#ab8465", "g": "#c1f1d8", "b": "#84e3b5",
                    "s": "#53998b", "y": "#faaf5c", "w": "#fffefe"}, [
        "......oooo......",
        ".......kc.......",
        "......oooo......",
        ".....okkkco.....",
        "....okkkkkco....",
        "....okggbbco....",
        "....okgwybco....",
        "....okgyybso....",
        "....okgyybso....",
        "....okbbbsso....",
        "....okbbsssco...",
        "....okkkkkcco...",
        "...okkkkkkcco...",
        "...ooooooooo....",
        "................",
        "................",
    ]),
    # Halcyon: a prism idol - a cut crystal on a stone foot
    "art_halcyon": ({"o": "#191954", "d": "#4f1d83", "m": "#7d2dbd", "l": "#9e3ba2", "c": "#74effe",
                     "w": "#d2f8ff", "s": "#3e3551", "t": "#69608b"}, [
        ".......oo.......",
        "......owco......",
        ".....owwcmo.....",
        ".....owclmo.....",
        "....owcclmdo....",
        "....owcllmdo....",
        "...owcclmmddo...",
        "...owcllmmddo...",
        "...oclllmmddo...",
        "....ollmmddo....",
        ".....olmmdo.....",
        "......oddo......",
        ".....otttso.....",
        "....otttttso....",
        "....oooooooo....",
        "................",
    ]),
    # Tessaly: a frost chime - icicle rods hung from a bar
    "art_tessaly": ({"o": "#011c34", "b": "#3e586e", "l": "#92a3b2", "i": "#d2f8ff", "c": "#74effe",
                     "m": "#1096c3"}, [
        "......oo........",
        "......ob........",
        "..oooooooooooo..",
        "..olllllllllbo..",
        "..oooooooooooo..",
        "...o..o..o..o...",
        "..oio.oio.oio.o.",
        "..oico.ic.oic.o.",
        "..oico.icooic.c.",
        "..oico.icmoicmo.",
        "..oicmoicmoicmo.",
        "...omo.icmooco..",
        "...oo..icmo.oo..",
        ".......omo......",
        ".......oo.......",
        "................",
    ]),
    # Umbra: a glowcap lamp - a glowing mushroom cap on a dark stalk
    "art_umbra": ({"o": "#170916", "d": "#2f1525", "s": "#522b2f", "k": "#7d4636", "g": "#53998b",
                   "c": "#84e3b5", "w": "#c1f1d8", "p": "#297537"}, [
        "................",
        ".....oooooo.....",
        "...oowwccccoo...",
        "..owwcccccccgo..",
        ".owccccccccggpo.",
        ".occcwcccccggpo.",
        ".ooggggggggppoo.",
        "...oooookdooo...",
        "......oksdo.....",
        "......oksdo.....",
        "......oksdo.....",
        ".....okksddo....",
        "....okkksdddo...",
        "....oooooooo....",
        "................",
        "................",
    ]),
    # Verdance: a woven fan - leaf strips spread from a handle
    "art_verdance": ({"o": "#003227", "d": "#05582d", "m": "#297537", "l": "#559642", "h": "#9bb675",
                      "k": "#725244", "b": "#ab8465"}, [
        "................",
        "....oooooooo....",
        "..oohlhlhlhmoo..",
        ".ohlhlhlhlmlmdo.",
        ".olhlhlhlmlmdmo.",
        "..olhlhlmlmdmo..",
        "..ohlhlmlmdmdo..",
        "...olhlmlmdmo...",
        "...ohlmlmdmdo...",
        "....olmlmdmo....",
        ".....olmdmo.....",
        "......obko......",
        "......obko......",
        "......obko......",
        "......oooo......",
        "................",
    ]),
    # Mirewood: a peat carving - a squat figure cut from dark peat
    "art_mirewood": ({"o": "#161612", "d": "#2c2c25", "m": "#41322c", "l": "#725244", "h": "#ab8465",
                      "e": "#559642"}, [
        "................",
        ".....oooooo.....",
        "....ohlllllo....",
        "....oleelemo....",
        "....ollllmmo....",
        "....olmoomdo....",
        "...oohllllmoo...",
        "..ohllolllmmdo..",
        "..olllollmmmdo..",
        "..olmlollmmddo..",
        "...oolllmmdoo...",
        "....olllmmdo....",
        "....ollmo.mdo...",
        "....ohlmo.mdo...",
        "...ooooo.oooo...",
        "................",
    ]),
    # Thalassa: a pearl crown - a coral band set with pearls
    "art_thalassa": ({"o": "#0c2f44", "d": "#204f63", "m": "#15578a", "l": "#1096c3", "p": "#bfcad7",
                      "w": "#fffefe", "c": "#dd576d", "r": "#c34988"}, [
        "................",
        "................",
        "...o...oo...o...",
        "..owo.owpo.owo..",
        "..opo.oppo.opo..",
        "..olo.olmo.olo..",
        "..olo.olmo.olmo.",
        "..ollolllmolmmo.",
        "..olllllllmmmdo.",
        "..owcwpwcwpwcdo.",
        "..orccrccrccrdo.",
        "..ollllllllmmdo.",
        "..ooooooooooooo.",
        "................",
        "................",
        "................",
    ]),
}


def art_icon(art_id):
    key, rows = ART_ICONS[art_id]
    clear = (0, 0, 0, 0)
    tone = {ch: _sw(h)[0] for ch, h in key.items()}
    return _checked([[clear if ch == "." else tone[ch] for ch in row] for row in rows])

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
    write("technology/campfire.png", campfire_atlas())
    # Overflow sack: what a full inventory drops on the ground
    write("technology/sack.png", sack())
    for art_id in ART_ICONS:
        write(f"icons/art/{art_id}.png", art_icon(art_id))
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
    # Submarines and divers (space-exploration, submarines): their hull colours
    write("icons/submarine.png", submarine("yellow", "white", "orange", "blue"))
    write("icons/deep_submarine.png", submarine("indigo", "lgrey", "navy", "yellow", deep=True))
    write("icons/gas_giant_diver.png", diver("orange", "yellow", "plum", "blue"))
    write("icons/deep_diver.png", diver("red", "pink", "navy", "lime", deep=True))
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
