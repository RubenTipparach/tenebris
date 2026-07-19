#!/usr/bin/env python3
"""Generate the navball equirectangular texture.

Baked-asset path (CLAUDE.md static-asset guidelines): a deterministic
1024x512 RGBA PNG at assets/textures/navball.png, wrapped onto the
attitude sphere in nav_ui.rs so the pitch ladder, meridians and heading
marks live ON the ball (occluding correctly, wrapping like a real ADI)
instead of being faked in 2-D screen space.

Equirectangular convention (matches the Rust sampler + dir->uv):
  u = longitude / 360   (x across, wraps)
  v = 0.5 - lat/pi      (y down; v=0 -> lat +90 zenith/sky top,
                         v=0.5 -> horizon, v=1 -> lat -90 nadir/ground)
So the TOP half of the PNG is sky, the bottom half ground, split at the
horizon row. Latitude rows = pitch; vertical columns = meridians (heading).

stdlib + zlib only, no `random`, so the file is byte-identical every run.
Run from tenebris-rs/:  python tools/gen-navball.py
"""

import math
import struct
import zlib

W, H = 2048, 1024
OUT = "assets/textures/navball.png"

# ---- palette -----------------------------------------------------------
SKY_TOP = (24, 84, 122)        # deep teal-blue at the zenith
SKY_HORIZON = (96, 176, 206)   # pale sky just above the horizon
GROUND_HORIZON = (176, 120, 66)
GROUND_BOTTOM = (86, 50, 24)   # dark earth toward the nadir
HORIZON_BAND = (250, 250, 255)
GRID_MAJOR = (238, 244, 250)   # 10 deg latitude + cardinal meridians
GRID_MINOR = (150, 172, 188)   # 5 deg latitude + 30 deg meridians
TEXT = (250, 252, 255)
TEXT_SHADOW = (10, 18, 26)

px = bytearray(W * H * 4)


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def put(x, y, col, a=1.0):
    x %= W
    if y < 0 or y >= H:
        return
    i = (y * W + x) * 4
    if a >= 1.0:
        px[i], px[i + 1], px[i + 2] = col[0], col[1], col[2]
    else:
        for k in range(3):
            px[i + k] = int(round(px[i + k] * (1 - a) + col[k] * a))
    px[i + 3] = 255


# ---- background: sky over ground, split at the horizon -----------------
for y in range(H):
    lat = (0.5 - y / H) * math.pi  # +pi/2 at the top row
    if lat >= 0.0:
        col = lerp(SKY_HORIZON, SKY_TOP, lat / (math.pi / 2))
    else:
        col = lerp(GROUND_HORIZON, GROUND_BOTTOM, (-lat) / (math.pi / 2))
    for x in range(W):
        put(x, y, col)


def row_for_pitch(deg):
    return int(round((0.5 - math.radians(deg) / math.pi) * H))


def col_for_heading(deg):
    return int(round((deg % 360) / 360.0 * W))


# ---- latitude lines (pitch parallels) ----------------------------------
for deg in range(-85, 86, 5):
    y0 = row_for_pitch(deg)
    if deg == 0:
        col, half = HORIZON_BAND, 4
    elif deg % 10 == 0:
        col, half = GRID_MAJOR, 2
    else:
        col, half = GRID_MINOR, 1
    for dy in range(-half, half + 1):
        for x in range(W):
            put(x, y0 + dy, col)

# ---- longitude lines (meridians) ---------------------------------------
for deg in range(0, 360, 30):
    x0 = col_for_heading(deg)
    major = deg % 90 == 0
    col, half = (GRID_MAJOR, 2) if major else (GRID_MINOR, 1)
    for dx in range(-half, half + 1):
        for y in range(H):
            put(x0 + dx, y, col)

# ---- 3x5 bitmap font (digits, minus, cardinal letters) -----------------
FONT = {
    "0": ["111", "101", "101", "101", "111"],
    "1": ["010", "110", "010", "010", "111"],
    "2": ["111", "001", "111", "100", "111"],
    "3": ["111", "001", "111", "001", "111"],
    "4": ["101", "101", "111", "001", "001"],
    "5": ["111", "100", "111", "001", "111"],
    "6": ["111", "100", "111", "101", "111"],
    "7": ["111", "001", "010", "010", "010"],
    "8": ["111", "101", "111", "101", "111"],
    "9": ["111", "101", "111", "001", "111"],
    "-": ["000", "000", "111", "000", "000"],
    "N": ["101", "111", "111", "111", "101"],
    "E": ["111", "100", "110", "100", "111"],
    "S": ["011", "100", "111", "001", "110"],
    "W": ["101", "101", "101", "111", "101"],
}
GW, GH = 3, 5


def text_width(s, sc, sp):
    return len(s) * (GW * sc + sp) - sp


def draw_text(cx, cy, s, sc, col, shadow=True):
    """Draw `s` centred at (cx, cy). Columns wrap in x (equirect seam)."""
    sp = sc  # gap between glyphs
    w = text_width(s, sc, sp)
    x = cx - w // 2
    for ch in s:
        g = FONT.get(ch)
        if g is not None:
            for ry in range(GH):
                for rx in range(GW):
                    if g[ry][rx] == "1":
                        for yy in range(sc):
                            for xx in range(sc):
                                px_ = x + rx * sc + xx
                                py_ = cy - (GH * sc) // 2 + ry * sc + yy
                                if shadow:
                                    put(px_ + 1, py_ + 1, TEXT_SHADOW)
                                put(px_, py_, col)
        x += GW * sc + sp


# ---- pitch numbers on the four cardinal meridians ----------------------
for deg in list(range(-70, 0, 10)) + list(range(10, 71, 10)):
    y0 = row_for_pitch(deg)
    label = str(deg)
    for hdg in (0, 90, 180, 270):
        cx = col_for_heading(hdg) + 70  # sit just right of the meridian
        draw_text(cx, y0, label, 8, TEXT)

# ---- heading band at the horizon: letters + degree numbers -------------
CARD = {0: "N", 90: "E", 180: "S", 270: "W"}
y_head = row_for_pitch(0) - 46  # a hair above the horizon line
for deg in range(0, 360, 30):
    cx = col_for_heading(deg)
    if deg in CARD:
        draw_text(cx, y_head, CARD[deg], 11, TEXT)
    else:
        draw_text(cx, y_head, str(deg), 7, TEXT)


def write_png(path, buf, w, h):
    def chunk(typ, data):
        c = struct.pack(">I", len(data)) + typ + data
        return c + struct.pack(">I", zlib.crc32(typ + data) & 0xFFFFFFFF)

    raw = b"".join(b"\x00" + bytes(buf[y * w * 4:(y + 1) * w * 4]) for y in range(h))
    with open(path, "wb") as f:
        f.write(
            b"\x89PNG\r\n\x1a\n"
            + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
            + chunk(b"IDAT", zlib.compress(raw, 9))
            + chunk(b"IEND", b"")
        )


write_png(OUT, px, W, H)
print(f"wrote {OUT} ({W}x{H})")
