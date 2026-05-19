#!/usr/bin/env python3
"""
Bake the default pixel-art UI sprite sheet used by the in-game inventory
and crafting menus. Output: tenebris-c/assets/textures/ui/default.png.

The sheet is consumed by src/client/pixel_ui.c at boot via stb_image; the
sprite rects + nine-slice margins are listed in assets/config/ui.yaml so
a different theme is just "drop in a different PNG with the same layout"
(or, if you change the layout, update the YAML to match).

Layout (128 x 64 atlas):

    ( 0,  0)-( 32,  32)  panel               nine-slice (8, 8, 8, 8)
    (32,  0)-( 56,  16)  button_normal       nine-slice (4, 4, 4, 4)
    (56,  0)-( 80,  16)  button_hover        nine-slice (4, 4, 4, 4)
    (80,  0)-(104,  16)  button_pressed      nine-slice (4, 4, 4, 4)
    (104, 0)-(128,  16)  button_disabled     nine-slice (4, 4, 4, 4)
    (32, 16)-( 56,  32)  title_bar           nine-slice (4, 0, 4, 0)
    (56, 16)-( 68,  28)  close_x             solid sprite (no slice)

    ( 0, 32)-( 18,  50)  slot_normal         nine-slice (3, 3, 3, 3)
    (18, 32)-( 36,  50)  slot_hover          nine-slice (3, 3, 3, 3)
    (36, 32)-( 54,  50)  slot_selected       nine-slice (3, 3, 3, 3)
    (54, 32)-( 72,  50)  slot_disabled       nine-slice (3, 3, 3, 3)

Palette is a warm "wood + bronze + parchment" RPG-survival theme. Every
sprite is built from the same ramp so a future re-tint to a different
mood is one-place: swap the ramp + re-run.

Deterministic, stdlib + zlib only. Run from the repo root:
    python3 tenebris-c/tools/gen-ui-sprites.py
"""

import os
import struct
import zlib

# ---------------------------------------------------------------------------
# Atlas dimensions and the sprite rects above must match assets/config/ui.yaml.

ATLAS_W = 128
ATLAS_H = 64

# RGBA palette. Index 0 is transparent so sprites can have non-rectangular
# silhouettes (close X glyph) without a separate alpha channel logic path.
PAL = [
    (  0,   0,   0,   0),    # 0 transparent
    ( 14,   8,   4, 255),    # 1 very dark frame outline
    ( 43,  26,  20, 255),    # 2 dark wood
    ( 74,  46,  28, 255),    # 3 mid wood
    (107,  74,  43, 255),    # 4 light wood
    (160, 122,  74, 255),    # 5 bronze trim
    (208, 168, 112, 255),    # 6 bronze highlight
    ( 22,  14,   8, 255),    # 7 panel fill (dark)
    ( 36,  24,  16, 255),    # 8 panel fill (mid)
    (245, 212,  71, 255),    # 9 gold accent (selected / focus)
    (180,  60,  40, 255),    # 10 warning red
    (107, 100,  92, 255),    # 11 disabled grey (dark)
    (160, 152, 140, 255),    # 12 disabled grey (light)
    (232, 210, 168, 255),    # 13 parchment / light text accent
]

# ---------------------------------------------------------------------------

def make_canvas(w, h):
    """A list-of-lists palette-index canvas (0 = transparent)."""
    return [[0] * w for _ in range(h)]


def put_pixel(canvas, x, y, idx):
    h = len(canvas)
    if h == 0:
        return
    w = len(canvas[0])
    if 0 <= x < w and 0 <= y < h:
        canvas[y][x] = idx


def fill_rect(canvas, x, y, w, h, idx):
    for j in range(y, y + h):
        for i in range(x, x + w):
            put_pixel(canvas, i, j, idx)


def stroke_rect(canvas, x, y, w, h, idx):
    """1-pixel outline along the border of the (x, y, w, h) rectangle."""
    for i in range(x, x + w):
        put_pixel(canvas, i, y, idx)
        put_pixel(canvas, i, y + h - 1, idx)
    for j in range(y, y + h):
        put_pixel(canvas, x, j, idx)
        put_pixel(canvas, x + w - 1, j, idx)


def blit(dst, sx, sy, src):
    """Copy a sub-canvas into the destination at (sx, sy). Transparent
    pixels (index 0) in src do NOT overwrite dst."""
    h = len(src)
    if h == 0:
        return
    w = len(src[0])
    for j in range(h):
        for i in range(w):
            v = src[j][i]
            if v == 0:
                continue
            put_pixel(dst, sx + i, sy + j, v)


# ---------------------------------------------------------------------------
# Sprite generators. Each returns a freshly built canvas of the sprite's
# native pixel size; the caller blits it into the atlas at the layout
# coordinates documented at the top of this file.

def make_panel(w, h):
    """Dark wood panel with a layered bronze trim. Nine-sliceable
    because the corners are decorative and the middle is flat."""
    c = make_canvas(w, h)
    # Outer frame: layered border, dark to bright as you go inward.
    fill_rect(c, 0, 0, w, h, 1)                  # outermost: hard outline
    fill_rect(c, 1, 1, w - 2, h - 2, 4)          # bronze frame body
    fill_rect(c, 2, 2, w - 4, h - 4, 5)          # bronze trim
    fill_rect(c, 3, 3, w - 6, h - 6, 2)          # inner dark frame edge
    fill_rect(c, 4, 4, w - 8, h - 8, 7)          # panel fill body
    # Subtle inner highlight ring (top-left lighter, bottom-right darker)
    # to give the panel a slight engraved look. Two single pixels long
    # enough to survive nine-slice stretching to any panel size.
    for i in range(3, w - 3):
        put_pixel(c, i, 3, 6)                    # top inner highlight
        put_pixel(c, i, h - 4, 1)                # bottom inner shadow
    for j in range(3, h - 3):
        put_pixel(c, 3, j, 6)                    # left inner highlight
        put_pixel(c, w - 4, j, 1)                # right inner shadow
    # Bronze "rivet" dots at the four corners — purely decorative,
    # sit inside the nine-slice corner so they don't repeat across
    # the stretched edge.
    for cx, cy in ((3, 3), (w - 4, 3), (3, h - 4), (w - 4, h - 4)):
        put_pixel(c, cx, cy, 9)                  # gold rivet centre
    return c


def make_button(w, h, body_idx, top_idx, bot_idx, outline_idx, gloss_idx=None):
    """Generic 3D-look button. Top edge bright, bottom edge dark, body
    a flat mid tone. gloss_idx, if set, paints a single-pixel highlight
    stripe two rows below the top edge."""
    c = make_canvas(w, h)
    fill_rect(c, 0, 0, w, h, outline_idx)
    fill_rect(c, 1, 1, w - 2, h - 2, body_idx)
    # Top bevel (lighter)
    for i in range(1, w - 1):
        put_pixel(c, i, 1, top_idx)
    # Bottom bevel (darker)
    for i in range(1, w - 1):
        put_pixel(c, i, h - 2, bot_idx)
    # Side bevels
    for j in range(2, h - 2):
        put_pixel(c, 1, j, top_idx)
        put_pixel(c, w - 2, j, bot_idx)
    if gloss_idx is not None:
        for i in range(2, w - 2):
            put_pixel(c, i, 2, gloss_idx)
    return c


def make_button_pressed(w, h, body_idx, top_idx, bot_idx, outline_idx):
    """Pressed variant: bevel is inverted (dark on top, light on bottom)
    so the button reads as pushed-in."""
    c = make_canvas(w, h)
    fill_rect(c, 0, 0, w, h, outline_idx)
    fill_rect(c, 1, 1, w - 2, h - 2, body_idx)
    for i in range(1, w - 1):
        put_pixel(c, i, 1, bot_idx)            # inverted
        put_pixel(c, i, h - 2, top_idx)
    for j in range(2, h - 2):
        put_pixel(c, 1, j, bot_idx)
        put_pixel(c, w - 2, j, top_idx)
    return c


def make_slot(w, h, frame_idx, accent_idx=None, inner_dark=7, inner_mid=8):
    """Inventory slot: dark recessed cell with a 1-px bright frame.
    accent_idx, if set, paints an extra inner ring (selected = gold,
    hover = bronze)."""
    c = make_canvas(w, h)
    fill_rect(c, 0, 0, w, h, 1)                 # outermost dark
    fill_rect(c, 1, 1, w - 2, h - 2, frame_idx) # frame body
    fill_rect(c, 2, 2, w - 4, h - 4, inner_dark)
    fill_rect(c, 3, 3, w - 6, h - 6, inner_mid)
    if accent_idx is not None:
        # Inner accent ring just inside the frame body.
        for i in range(1, w - 1):
            put_pixel(c, i, 1, accent_idx)
            put_pixel(c, i, h - 2, accent_idx)
        for j in range(1, h - 1):
            put_pixel(c, 1, j, accent_idx)
            put_pixel(c, w - 2, j, accent_idx)
    return c


def make_title_bar(w, h):
    """Horizontal bar used as a panel title strip. Slightly brighter
    than the panel body so the title text sits on a distinct band."""
    c = make_canvas(w, h)
    fill_rect(c, 0, 0, w, h, 3)
    for i in range(w):
        put_pixel(c, i, 0, 1)
        put_pixel(c, i, h - 1, 1)
    # Top highlight + bottom shadow stripes for definition.
    for i in range(1, w - 1):
        put_pixel(c, i, 1, 5)
        put_pixel(c, i, h - 2, 2)
    return c


def make_close_x(w, h):
    """Stylised X glyph as a standalone sprite. Drawn diagonally on a
    transparent background; the caller paints the underlying button
    behind it."""
    c = make_canvas(w, h)
    for i in range(2, w - 2):
        j = i
        put_pixel(c, i, j, 10)              # main diagonal
        put_pixel(c, i, h - 1 - j, 10)      # counter diagonal
        # 1-px halo so the X reads on any background.
        put_pixel(c, i, j - 1, 1)
        put_pixel(c, i, j + 1, 1)
        put_pixel(c, i, h - 1 - j - 1, 1)
        put_pixel(c, i, h - 1 - j + 1, 1)
    # Re-paint the X over the halo so it stays solid.
    for i in range(2, w - 2):
        j = i
        put_pixel(c, i, j, 10)
        put_pixel(c, i, h - 1 - j, 10)
    return c


# ---------------------------------------------------------------------------

def write_png_paletted(path, w, h, indexed_rows, palette):
    """RGBA-8 PNG writer. Takes a 2D index grid + a palette and expands
    in-place to RGBA bytes — keeps the source-of-truth representation
    palette-friendly without depending on a paletted-PNG decoder on the
    consumer side. Stdlib + zlib only."""
    raw = bytearray()
    stride = w * 4
    for j in range(h):
        raw.append(0)  # filter byte: none
        row = indexed_rows[j]
        for i in range(w):
            r, g, b, a = palette[row[i]]
            raw.extend((r, g, b, a))

    def chunk(tag, data):
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    idat = zlib.compress(bytes(raw), 9)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "wb") as f:
        f.write(sig)
        f.write(chunk(b"IHDR", ihdr))
        f.write(chunk(b"IDAT", idat))
        f.write(chunk(b"IEND", b""))


def main():
    atlas = make_canvas(ATLAS_W, ATLAS_H)

    # Row 0: panel + four button states + title bar + close X.
    blit(atlas,   0,  0, make_panel(32, 32))

    # Button colour ramps:
    #   normal:    body=4 (light wood), top=6 (bronze hi), bot=2 (dark wood)
    #   hover:     body=5 (bronze trim), top=6, bot=3, gloss=13 (parchment)
    #   pressed:   body=3, top=6, bot=1 (inverted bevel)
    #   disabled:  desaturated grey ramp from palette 11/12
    blit(atlas,  32,  0, make_button(24, 16, body_idx=4, top_idx=6,  bot_idx=2, outline_idx=1))
    blit(atlas,  56,  0, make_button(24, 16, body_idx=5, top_idx=6,  bot_idx=3, outline_idx=1, gloss_idx=13))
    blit(atlas,  80,  0, make_button_pressed(24, 16, body_idx=3, top_idx=6, bot_idx=1, outline_idx=1))
    blit(atlas, 104,  0, make_button(24, 16, body_idx=11, top_idx=12, bot_idx=1, outline_idx=1))

    # Row 1 (top half): title bar + close X.
    blit(atlas,  32, 16, make_title_bar(24, 16))
    blit(atlas,  56, 16, make_close_x(12, 12))

    # Row 2: slot states.
    blit(atlas,   0, 32, make_slot(18, 18, frame_idx=4))                 # normal
    blit(atlas,  18, 32, make_slot(18, 18, frame_idx=5, accent_idx=6))   # hover
    blit(atlas,  36, 32, make_slot(18, 18, frame_idx=5, accent_idx=9))   # selected (gold)
    blit(atlas,  54, 32, make_slot(18, 18, frame_idx=11,                 # disabled
                                   inner_dark=11, inner_mid=12))

    here = os.path.dirname(os.path.abspath(__file__))
    out = os.path.normpath(os.path.join(here, "..", "assets", "textures",
                                          "ui", "default.png"))
    write_png_paletted(out, ATLAS_W, ATLAS_H, atlas, PAL)
    print(f"wrote {out} ({ATLAS_W}x{ATLAS_H} RGBA)")


if __name__ == "__main__":
    main()
