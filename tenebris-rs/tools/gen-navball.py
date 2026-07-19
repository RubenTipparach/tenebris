#!/usr/bin/env python3
"""Generate the navball equirectangular texture.

Baked-asset path (CLAUDE.md static-asset guidelines): a deterministic
2048x1024 RGBA PNG at assets/textures/navball.png, wrapped onto the
attitude sphere in nav_ui.rs so the pitch ladder, meridians and heading
marks live ON the ball (occluding correctly, wrapping like a real ADI)
instead of being faked in 2-D screen space.

Style (per the KSP-navball reference): NOT a busy full lat/long grid.
- Pitch ladder = SHORT horizontal ticks only at the four cardinal
  meridians (every 90 deg), each spanning ~10-15 deg of longitude, major
  (10 deg) ticks wider than minor (5 deg). Full latitude circles would be
  too busy.
- Longitude meridians every 45 deg (cardinals bolder).
- Numbers: pitch value flanking each major tick, heading value at each
  meridian near the horizon. Every number first ERASES a small patch of
  background (re-painting the gradient) so no line ever crosses a glyph -
  the number always reads cleanly.
- No N/E/S/W letters (numeric headings only).

Equirectangular convention (matches the Rust sampler + dir->uv):
  u = longitude / 360   (x across, wraps)
  v = 0.5 - lat/pi      (y down; v=0 -> lat +90 zenith/sky top,
                         v=0.5 -> horizon, v=1 -> lat -90 nadir/ground)

stdlib + zlib only, no `random`, so the file is byte-identical every run.
Run from tenebris-rs/:  python tools/gen-navball.py
"""

import math
import struct
import zlib

W, H = 2048, 1024
OUT = "assets/textures/navball.png"

# ---- palette -----------------------------------------------------------
SKY_TOP = (24, 84, 122)
SKY_HORIZON = (96, 176, 206)
GROUND_HORIZON = (176, 120, 66)
GROUND_BOTTOM = (86, 50, 24)
HORIZON_BAND = (250, 250, 255)
GRID_MAJOR = (238, 244, 250)
GRID_MINOR = (150, 172, 188)
TEXT = (250, 252, 255)
TEXT_SHADOW = (12, 20, 28)

# tick / number geometry (px). 1 deg lon = W/360 ~= 5.69 px.
TICK_MAJOR_HALF = 40   # ~14 deg total
TICK_MINOR_HALF = 31   # ~11 deg total
PITCH_SCALE = 7        # bitmap-font scale for pitch numbers
HEAD_SCALE = 7         # ... and heading numbers
NUM_MARGIN = 12        # gap from a tick end to its flanking number

px = bytearray(W * H * 4)


def lerp(a, b, t):
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def bg_color(y):
    """The pure background gradient colour at row y (for number erases)."""
    lat = (0.5 - y / H) * math.pi
    if lat >= 0.0:
        return lerp(SKY_HORIZON, SKY_TOP, lat / (math.pi / 2))
    return lerp(GROUND_HORIZON, GROUND_BOTTOM, (-lat) / (math.pi / 2))


def put(x, y, col):
    x %= W
    if y < 0 or y >= H:
        return
    i = (y * W + x) * 4
    px[i], px[i + 1], px[i + 2], px[i + 3] = col[0], col[1], col[2], 255


def row_for_pitch(deg):
    return int(round((0.5 - math.radians(deg) / math.pi) * H))


def col_for_heading(deg):
    return int(round((deg % 360) / 360.0 * W))


# ---- background: sky over ground, split at the horizon -----------------
for y in range(H):
    col = bg_color(y)
    for x in range(W):
        put(x, y, col)

# ---- horizon line (the one full-circle reference) ----------------------
hy = row_for_pitch(0)
for dy in range(-3, 4):
    for x in range(W):
        put(x, hy + dy, HORIZON_BAND)

# ---- latitude lines -----------------------------------------------------
# Full circles ONLY at +-45 (plus the horizon at 0, above); every other
# pitch line is a SHORT tick at the four cardinal meridians, so the ball
# doesn't turn into a busy full grid.
FULL_LAT = {-45, 45}
for deg in range(-85, 86, 5):
    if deg == 0:
        continue
    y0 = row_for_pitch(deg)
    major = deg % 10 == 0
    if deg in FULL_LAT:
        for dy in range(-2, 3):
            for x in range(W):
                put(x, y0 + dy, GRID_MAJOR)
        continue
    half = TICK_MAJOR_HALF if major else TICK_MINOR_HALF
    col = GRID_MAJOR if major else GRID_MINOR
    thick = 2 if major else 1
    for hdg in (0, 90, 180, 270):
        cx = col_for_heading(hdg)
        for dy in range(-thick, thick + 1):
            for dx in range(-half, half + 1):
                put(cx + dx, y0 + dy, col)

# ---- longitude meridians every 45 deg ----------------------------------
for deg in range(0, 360, 45):
    x0 = col_for_heading(deg)
    major = deg % 90 == 0
    col = GRID_MAJOR if major else GRID_MINOR
    thick = 2 if major else 1
    for dx in range(-thick, thick + 1):
        for y in range(H):
            put(x0 + dx, y, col)

# ---- 3x5 bitmap font (digits + minus) ----------------------------------
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
}
GW, GH = 3, 5


def text_width(s, sc):
    sp = sc
    return len(s) * (GW * sc + sp) - sp


def draw_text(cx, cy, s, sc, col):
    """Centre `s` at (cx, cy). First re-paint the background over the glyph
    box so no grid line crosses it (the requested break-in-the-line), then
    a 1px shadow + the glyphs. Columns wrap in x (equirect seam)."""
    sp = sc
    w = text_width(s, sc)
    gh = GH * sc
    pad = sc * 2
    for yy in range(cy - gh // 2 - pad, cy + gh // 2 + pad + 1):
        bg = bg_color(yy)
        for xx in range(cx - w // 2 - pad, cx + w // 2 + pad + 1):
            put(xx, yy, bg)
    x = cx - w // 2
    for ch in s:
        g = FONT.get(ch)
        if g is not None:
            for ry in range(GH):
                for rx in range(GW):
                    if g[ry][rx] == "1":
                        for yy in range(sc):
                            for xx in range(sc):
                                bx = x + rx * sc + xx
                                by = cy - gh // 2 + ry * sc + yy
                                put(bx + 1, by + 1, TEXT_SHADOW)
                                put(bx, by, col)
        x += GW * sc + sp


# ---- pitch numbers flanking each major tick (both ends) ----------------
for deg in list(range(-70, 0, 10)) + list(range(10, 71, 10)):
    y0 = row_for_pitch(deg)
    label = str(deg)
    off = TICK_MAJOR_HALF + NUM_MARGIN + text_width(label, PITCH_SCALE) // 2
    for hdg in (0, 90, 180, 270):
        cx = col_for_heading(hdg)
        draw_text(cx - off, y0, label, PITCH_SCALE, TEXT)
        draw_text(cx + off, y0, label, PITCH_SCALE, TEXT)

# ---- heading numbers at each meridian, near the horizon (no letters) ---
y_head = row_for_pitch(0) - 46
for deg in range(0, 360, 45):
    draw_text(col_for_heading(deg), y_head, str(deg), HEAD_SCALE, TEXT)


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
