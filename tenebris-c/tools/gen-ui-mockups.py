#!/usr/bin/env python3
"""
Compose mockup PNGs of the four planned inventory / crafting / equipment /
skill-tree screens using the same sprite atlas + nine-slice logic that
src/client/pixel_ui.c will render at runtime. Output:

    tenebris-c/docs/mockups/inventory.png
    tenebris-c/docs/mockups/crafting.png
    tenebris-c/docs/mockups/equipment.png
    tenebris-c/docs/mockups/skills.png

These are pure design references for tenebris-c/crafting.md - the
implementation that ships the same look will reuse the C pixel_ui
module, not this script.

Stdlib + zlib only. The sprite builders are loaded from the sibling
gen-ui-sprites.py via importlib (the file is hyphenated so a plain
import can't reach it) so the mockups stay in sync with whatever
gen-ui-sprites bakes into the runtime atlas.

Run from the repo root:
    python3 tenebris-c/tools/gen-ui-mockups.py
"""

import importlib.util
import os
import struct
import zlib

HERE = os.path.dirname(os.path.abspath(__file__))


def _load_sprites_module():
    path = os.path.join(HERE, "gen-ui-sprites.py")
    spec = importlib.util.spec_from_file_location("gen_ui_sprites", path)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


S = _load_sprites_module()
PAL = S.PAL

# ---------------------------------------------------------------------------
# Sprite atlas - identical layout to assets/textures/ui/default.png. Built in
# memory so we don't depend on a PNG decoder. Source-rect lookups below pull
# from this atlas just like the C renderer pulls from the GPU texture.

ATLAS_W = S.ATLAS_W
ATLAS_H = S.ATLAS_H

SPRITES = {
    # name -> (x, y, w, h, left, right, top, bottom)
    "panel":           (  0,  0, 32, 32,  8, 8, 8, 8),
    "button_normal":   ( 32,  0, 24, 16,  4, 4, 4, 4),
    "button_hover":    ( 56,  0, 24, 16,  4, 4, 4, 4),
    "button_pressed":  ( 80,  0, 24, 16,  4, 4, 4, 4),
    "button_disabled": (104,  0, 24, 16,  4, 4, 4, 4),
    "title_bar":       ( 32, 16, 24, 16,  4, 4, 4, 4),
    "close_x":         ( 56, 16, 12, 12,  0, 0, 0, 0),
    "slot_normal":     (  0, 32, 18, 18,  3, 3, 3, 3),
    "slot_hover":      ( 18, 32, 18, 18,  3, 3, 3, 3),
    "slot_selected":   ( 36, 32, 18, 18,  3, 3, 3, 3),
    "slot_disabled":   ( 54, 32, 18, 18,  3, 3, 3, 3),
}


def build_atlas():
    """Re-bake the sprite atlas in the same shape gen-ui-sprites.py
    bakes it for assets/textures/ui/default.png. Returned as a 2D
    palette-index grid (rows of column lists)."""
    atlas = S.make_canvas(ATLAS_W, ATLAS_H)
    S.blit(atlas,   0,  0, S.make_panel(32, 32))
    S.blit(atlas,  32,  0, S.make_button(24, 16, body_idx=4, top_idx=6,  bot_idx=2, outline_idx=1))
    S.blit(atlas,  56,  0, S.make_button(24, 16, body_idx=5, top_idx=6,  bot_idx=3, outline_idx=1, gloss_idx=13))
    S.blit(atlas,  80,  0, S.make_button_pressed(24, 16, body_idx=3, top_idx=6, bot_idx=1, outline_idx=1))
    S.blit(atlas, 104,  0, S.make_button(24, 16, body_idx=11, top_idx=12, bot_idx=1, outline_idx=1))
    S.blit(atlas,  32, 16, S.make_title_bar(24, 16))
    S.blit(atlas,  56, 16, S.make_close_x(12, 12))
    S.blit(atlas,   0, 32, S.make_slot(18, 18, frame_idx=4))
    S.blit(atlas,  18, 32, S.make_slot(18, 18, frame_idx=5, accent_idx=6))
    S.blit(atlas,  36, 32, S.make_slot(18, 18, frame_idx=5, accent_idx=9))
    S.blit(atlas,  54, 32, S.make_slot(18, 18, frame_idx=11, inner_dark=11, inner_mid=12))
    return atlas


# ---------------------------------------------------------------------------
# Mockup canvas - RGBA-list-of-lists. Composites everything in palette-
# indexed sprite space, but blends final RGBA so the dim "scene behind"
# backdrop can layer through.

def make_rgba_canvas(w, h, rgba=(0, 0, 0, 0)):
    return [[rgba] * w for _ in range(h)]


def put_rgba(canvas, x, y, rgba):
    h = len(canvas)
    if h == 0:
        return
    w = len(canvas[0])
    if 0 <= x < w and 0 <= y < h:
        canvas[y][x] = rgba


def fill_rgba_rect(canvas, x, y, w, h, rgba):
    for j in range(y, y + h):
        for i in range(x, x + w):
            put_rgba(canvas, i, j, rgba)


def blit_atlas_subrect(canvas, atlas, dst_x, dst_y, dst_w, dst_h,
                       sx, sy, sw, sh):
    """Nearest-neighbour resample a sub-rect of the atlas (a 2D palette-
    index grid) into the RGBA destination. Transparent palette pixels
    (index 0) are skipped so the destination shows through."""
    if dst_w <= 0 or dst_h <= 0:
        return
    for j in range(dst_h):
        # Map dst-y back into the source rect.
        v = sy + (j * sh) // dst_h
        if v < 0 or v >= ATLAS_H:
            continue
        for i in range(dst_w):
            u = sx + (i * sw) // dst_w
            if u < 0 or u >= ATLAS_W:
                continue
            idx = atlas[v][u]
            if idx == 0:
                continue
            r, g, b, a = PAL[idx]
            put_rgba(canvas, dst_x + i, dst_y + j, (r, g, b, a))


def draw_nine_slice(canvas, atlas, sprite_name, dx, dy, dw, dh):
    """Mirror of pixel_ui.c's draw_nine_slice — same nine-quad
    decomposition, same corner-preserving stretch."""
    sx, sy, sw, sh, ml, mr, mt, mb = SPRITES[sprite_name]

    if ml == 0 and mr == 0 and mt == 0 and mb == 0:
        # Non-stretchable: blit at native size, top-left aligned.
        blit_atlas_subrect(canvas, atlas, dx, dy, sw, sh, sx, sy, sw, sh)
        return

    # Clamp margins to the destination.
    if ml + mr > dw:
        k = dw / float(ml + mr)
        ml = int(ml * k)
        mr = int(mr * k)
    if mt + mb > dh:
        k = dh / float(mt + mb)
        mt = int(mt * k)
        mb = int(mb * k)

    u_mid = sw - ml - mr
    v_mid = sh - mt - mb

    x0, w0 = dx,            ml
    x1, w1 = dx + ml,       dw - ml - mr
    x2, w2 = dx + dw - mr,  mr
    y0, h0 = dy,            mt
    y1, h1 = dy + mt,       dh - mt - mb
    y2, h2 = dy + dh - mb,  mb

    sx0, usw0 = sx,            ml
    sx1, usw1 = sx + ml,       u_mid
    sx2, usw2 = sx + sw - mr,  mr
    sy0, ush0 = sy,            mt
    sy1, ush1 = sy + mt,       v_mid
    sy2, ush2 = sy + sh - mb,  mb

    blit_atlas_subrect(canvas, atlas, x0, y0, w0, h0, sx0, sy0, usw0, ush0)
    blit_atlas_subrect(canvas, atlas, x1, y0, w1, h0, sx1, sy0, usw1, ush0)
    blit_atlas_subrect(canvas, atlas, x2, y0, w2, h0, sx2, sy0, usw2, ush0)
    blit_atlas_subrect(canvas, atlas, x0, y1, w0, h1, sx0, sy1, usw0, ush1)
    blit_atlas_subrect(canvas, atlas, x1, y1, w1, h1, sx1, sy1, usw1, ush1)
    blit_atlas_subrect(canvas, atlas, x2, y1, w2, h1, sx2, sy1, usw2, ush1)
    blit_atlas_subrect(canvas, atlas, x0, y2, w0, h2, sx0, sy2, usw0, ush2)
    blit_atlas_subrect(canvas, atlas, x1, y2, w1, h2, sx1, sy2, usw1, ush2)
    blit_atlas_subrect(canvas, atlas, x2, y2, w2, h2, sx2, sy2, usw2, ush2)


# ---------------------------------------------------------------------------
# Compact 5x7 ASCII font. Rows are top-to-bottom strings of '#' (filled)
# and '.' (transparent). One pixel of leading on the right when stringing
# chars together (handled by draw_text below).

FONT_W = 5
FONT_H = 7

FONT = {
    "A": [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    "B": ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
    "C": [".####", "#....", "#....", "#....", "#....", "#....", ".####"],
    "D": ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
    "E": ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
    "F": ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
    "G": [".####", "#....", "#....", "#.###", "#...#", "#...#", ".####"],
    "H": ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    "I": ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
    "J": ["#####", "....#", "....#", "....#", "....#", "#...#", ".###."],
    "K": ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
    "L": ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
    "M": ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
    "N": ["#...#", "##..#", "#.#.#", "#.#.#", "#..##", "#...#", "#...#"],
    "O": [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "P": ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
    "Q": [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..##", ".####"],
    "R": ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
    "S": [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
    "T": ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
    "U": ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "V": ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
    "W": ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
    "X": ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
    "Y": ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
    "Z": ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
    "0": [".###.", "#..##", "#.#.#", "#.#.#", "##..#", "#...#", ".###."],
    "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", "#####"],
    "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
    "3": [".###.", "#...#", "....#", "..##.", "....#", "#...#", ".###."],
    "4": ["#...#", "#...#", "#...#", "#####", "....#", "....#", "....#"],
    "5": ["#####", "#....", "#....", "####.", "....#", "....#", "####."],
    "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
    "7": ["#####", "....#", "....#", "...#.", "..#..", ".#...", "#...."],
    "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
    "9": [".###.", "#...#", "#...#", ".####", "....#", "#...#", ".###."],
    " ": ["..... "] * 7,
    ".": ["...", "...", "...", "...", "...", "...", "..#"],
    ":": ["...", "..#", "..#", "...", "..#", "..#", "..."],
    "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
    "+": ["....", "..#.", "..#.", "####", "..#.", "..#.", "...."],
    "/": ["....#", "...#.", "...#.", "..#..", ".#...", ".#...", "#...."],
    "(": ["..#", ".#.", "#..", "#..", "#..", ".#.", "..#"],
    ")": ["#..", ".#.", "..#", "..#", "..#", ".#.", "#.."],
    "'": ["..#..", "..#..", ".....", ".....", ".....", ".....", "....."],
    ",": ["...", "...", "...", "...", "...", "..#", ".#."],
    "!": ["..#", "..#", "..#", "..#", "..#", "...", "..#"],
    "?": [".###.", "#...#", "...#.", "..#..", "..#..", ".....", "..#.."],
    ">": ["#....", ".#...", "..#..", "...#.", "..#..", ".#...", "#...."],
    "<": ["....#", "...#.", "..#..", ".#...", "..#..", "...#.", "....#"],
}


def draw_text(canvas, x, y, text, rgba=(232, 210, 168, 255), scale=2):
    """Draw text at (x, y) in the given rgba colour. Each glyph is
    FONT_W x FONT_H, drawn at the given integer scale, with one source
    pixel of trailing spacing between glyphs (so the gap also scales)."""
    cx = x
    for ch in text:
        if ch == "\n":
            x_save = x
            y += (FONT_H + 1) * scale
            cx = x_save
            continue
        glyph = FONT.get(ch.upper(), FONT.get("?"))
        gw = max(len(row) for row in glyph)
        for j in range(FONT_H):
            row = glyph[j] if j < len(glyph) else ""
            for i in range(gw):
                if i < len(row) and row[i] == "#":
                    for dy in range(scale):
                        for dx in range(scale):
                            put_rgba(canvas,
                                     cx + i * scale + dx,
                                     y + j * scale + dy,
                                     rgba)
        cx += (gw + 1) * scale


def text_width(text, scale=2):
    if not text:
        return 0
    w = 0
    for ch in text:
        glyph = FONT.get(ch.upper(), FONT.get("?"))
        gw = max(len(row) for row in glyph)
        w += (gw + 1) * scale
    return w - scale  # no trailing spacing on the last char


# ---------------------------------------------------------------------------
# Backdrop. A subtle gradient evokes "game world behind the menu" without
# distracting from the sprite work. Also tints toward the dim panel
# colours so the panel reads as on-top of a coherent scene.

def fill_backdrop(canvas):
    h = len(canvas)
    if h == 0:
        return
    w = len(canvas[0])
    for j in range(h):
        t = j / max(1, h - 1)
        # Top: dark blue-grey night sky; bottom: warm ember tone.
        r = int(round(28 * (1 - t) + 48 * t))
        g = int(round(32 * (1 - t) + 28 * t))
        b = int(round(52 * (1 - t) + 24 * t))
        for i in range(w):
            put_rgba(canvas, i, j, (r, g, b, 255))


def dim_scene_behind(canvas, x, y, w, h, alpha=120):
    """Darken a rect so a panel above it pops. Alpha is over [0, 255]."""
    for j in range(y, y + h):
        for i in range(x, x + w):
            if 0 <= i < len(canvas[0]) and 0 <= j < len(canvas):
                r, g, b, a = canvas[j][i]
                k = (255 - alpha) / 255.0
                canvas[j][i] = (int(r * k), int(g * k), int(b * k), 255)


# ---------------------------------------------------------------------------
# Item-icon stand-ins. Real icons will come through the pixel-art -> 3D
# pipeline later; for the mockup we just draw a recognisable solid colour
# inside each slot so the layout reads. Each entry returns (fill, accent)
# the slot helper paints as an inner cell + small accent stripe.

ITEM_COLOURS = {
    "log":      ((101,  64,  35, 255), (160, 110,  60, 255)),
    "plank":    ((176, 134,  82, 255), (215, 175, 120, 255)),
    "stick":    ((132,  92,  52, 255), (180, 140,  90, 255)),
    "stone":    (( 96,  96,  98, 255), (160, 160, 162, 255)),
    "ore":      ((205, 168,  73, 255), (245, 220, 140, 255)),
    "iron":     ((140, 145, 150, 255), (210, 215, 220, 255)),
    "grass":    (( 68, 130,  58, 255), (140, 195, 100, 255)),
    "fish":     ((110, 150, 180, 255), (190, 220, 235, 255)),
    "axe":      ((196, 198, 200, 255), (132,  92,  52, 255)),
    "rod":      ((150, 110,  72, 255), (220, 220, 220, 255)),
    "pickaxe":  ((200, 200, 210, 255), (132,  92,  52, 255)),
    "helmet":   ((150, 152, 158, 255), (220, 220, 230, 255)),
    "chest":    ((128, 100,  72, 255), (210, 175, 120, 255)),
    "boots":    (( 80,  60,  44, 255), (160, 130,  90, 255)),
    "shield":   ((110, 140, 170, 255), (220, 180,  80, 255)),
    "torch":    ((230, 180,  80, 255), (255, 220, 140, 255)),
    "coal":     (( 22,  22,  24, 255), ( 72,  72,  74, 255)),
}


def draw_item_icon(canvas, slot_x, slot_y, slot_w, slot_h, kind):
    """Paint a colour-coded inner rect to stand in for a baked item
    icon. Sits inside the slot frame's 3-px (= 6-px scaled) inset."""
    if kind not in ITEM_COLOURS:
        return
    fill, accent = ITEM_COLOURS[kind]
    pad = max(3, slot_w // 6)
    fill_rgba_rect(canvas, slot_x + pad, slot_y + pad,
                   slot_w - pad * 2, slot_h - pad * 2, fill)
    # Inner 2-px accent stripe top + left for a tiny 3D feel.
    for i in range(slot_w - pad * 2):
        put_rgba(canvas, slot_x + pad + i, slot_y + pad, accent)
    for j in range(slot_h - pad * 2):
        put_rgba(canvas, slot_x + pad, slot_y + pad + j, accent)


# ---------------------------------------------------------------------------
# Higher-level convenience: a slot at given x, y, with optional item
# fill, count, and state. UI_SCALE blows the native 18-px slot up to
# 36-px display.

UI_SCALE = 2
SLOT_PX = 18 * UI_SCALE


def draw_slot(canvas, atlas, x, y, state="normal", item=None, count=0):
    sprite = {
        "normal":   "slot_normal",
        "hover":    "slot_hover",
        "selected": "slot_selected",
        "disabled": "slot_disabled",
    }[state]
    draw_nine_slice(canvas, atlas, sprite, x, y, SLOT_PX, SLOT_PX)
    if item:
        draw_item_icon(canvas, x, y, SLOT_PX, SLOT_PX, item)
    if count > 0:
        s = str(count)
        # Bottom-right count badge.
        tw = text_width(s, scale=1)
        draw_text(canvas, x + SLOT_PX - tw - 3, y + SLOT_PX - 8,
                  s, rgba=(255, 255, 255, 255), scale=1)


def draw_button(canvas, atlas, x, y, w, h, label, state="normal"):
    sprite = {
        "normal":   "button_normal",
        "hover":    "button_hover",
        "pressed":  "button_pressed",
        "disabled": "button_disabled",
    }[state]
    draw_nine_slice(canvas, atlas, sprite, x, y, w, h)
    if label:
        tw = text_width(label, scale=2)
        tx = x + (w - tw) // 2
        ty = y + (h - FONT_H * 2) // 2
        if state == "pressed":
            ty += 1
        if state == "disabled":
            colour = (107, 96, 88, 255)
        elif state == "hover":
            colour = (255, 255, 255, 255)
        else:
            colour = (232, 210, 168, 255)
        draw_text(canvas, tx, ty, label, rgba=colour, scale=2)


def draw_panel(canvas, atlas, x, y, w, h):
    draw_nine_slice(canvas, atlas, "panel", x, y, w, h)


def draw_title_bar(canvas, atlas, x, y, w, h, title):
    draw_nine_slice(canvas, atlas, "title_bar", x, y, w, h)
    tw = text_width(title, scale=2)
    tx = x + (w - tw) // 2
    ty = y + (h - FONT_H * 2) // 2
    draw_text(canvas, tx, ty, title, rgba=(255, 240, 200, 255), scale=2)


def draw_close_x(canvas, atlas, x, y, scale=2):
    # close_x is non-stretchable; we just upscale by integer nearest-neighbour.
    draw_nine_slice(canvas, atlas, "close_x", x, y, 12 * scale, 12 * scale)


# ---------------------------------------------------------------------------
# Screen 1: Inventory.

def render_inventory(atlas):
    W, H = 800, 500
    c = make_rgba_canvas(W, H)
    fill_backdrop(c)

    # Dim the area where the panel will sit so the panel stands out.
    dim_scene_behind(c, 0, 0, W, H, alpha=80)

    # Panel.
    panel_x, panel_y = 80, 50
    panel_w, panel_h = 640, 400
    draw_panel(c, atlas, panel_x, panel_y, panel_w, panel_h)

    # Title bar inside the panel.
    bar_x = panel_x + 20
    bar_y = panel_y + 16
    bar_w = panel_w - 40
    bar_h = 32
    draw_title_bar(c, atlas, bar_x, bar_y, bar_w, bar_h, "INVENTORY")

    # Close X top-right of the title bar.
    draw_close_x(c, atlas, panel_x + panel_w - 36, panel_y + 22, scale=2)

    # Main inventory grid: 8 cols x 4 rows.
    cols, rows = 8, 4
    gap = 6
    grid_w = cols * SLOT_PX + (cols - 1) * gap
    grid_x = panel_x + (panel_w - grid_w) // 2
    grid_y = panel_y + 76

    # Populate a representative inventory.
    items = [
        ("log", 12),     ("plank", 24),   ("stick", 9),    ("stone", 32),
        ("ore", 4),      ("grass", 1),    None,            None,
        ("fish", 2),     ("coal", 8),     ("iron", 3),     None,
        ("torch", 16),   None,            None,            None,
        None,            None,            None,            None,
        None,            None,            None,            None,
        None,            None,            None,            None,
        None,            None,            None,            None,
    ]
    for r in range(rows):
        for col in range(cols):
            idx = r * cols + col
            x = grid_x + col * (SLOT_PX + gap)
            y = grid_y + r * (SLOT_PX + gap)
            state = "normal"
            if idx == 4:  # hover demo on the ore slot
                state = "hover"
            if idx == 2:  # selected demo on sticks
                state = "selected"
            entry = items[idx] if idx < len(items) else None
            item = entry[0] if entry else None
            count = entry[1] if entry else 0
            draw_slot(c, atlas, x, y, state=state, item=item, count=count)

    # Section label above the hotbar row.
    draw_text(c, grid_x, grid_y + rows * (SLOT_PX + gap) + 8,
              "HOTBAR", rgba=(180, 150, 100, 255), scale=2)

    # Hotbar row: 9 slots, slot 0 is the selected one.
    hb_cols = 9
    hb_w = hb_cols * SLOT_PX + (hb_cols - 1) * gap
    hb_x = panel_x + (panel_w - hb_w) // 2
    hb_y = grid_y + rows * (SLOT_PX + gap) + 36
    hb_items = [
        ("axe", 1), ("pickaxe", 1), ("torch", 8), ("plank", 32),
        None, None, None, None, None,
    ]
    for col in range(hb_cols):
        x = hb_x + col * (SLOT_PX + gap)
        state = "selected" if col == 0 else "normal"
        entry = hb_items[col] if col < len(hb_items) else None
        item = entry[0] if entry else None
        count = entry[1] if entry else 0
        draw_slot(c, atlas, x, hb_y, state=state, item=item, count=count)

    # Hint text bottom-left.
    draw_text(c, panel_x + 20, panel_y + panel_h - 22,
              "DRAG TO MOVE  /  RIGHT CLICK TO SPLIT",
              rgba=(160, 130, 90, 255), scale=1)

    return W, H, c


# ---------------------------------------------------------------------------
# Screen 2: Crafting.

def render_crafting(atlas):
    W, H = 800, 500
    c = make_rgba_canvas(W, H)
    fill_backdrop(c)
    dim_scene_behind(c, 0, 0, W, H, alpha=80)

    panel_x, panel_y = 50, 40
    panel_w, panel_h = 700, 420
    draw_panel(c, atlas, panel_x, panel_y, panel_w, panel_h)
    draw_title_bar(c, atlas, panel_x + 20, panel_y + 16, panel_w - 40, 32,
                   "CRAFTING")
    draw_close_x(c, atlas, panel_x + panel_w - 36, panel_y + 22, scale=2)

    # Left: recipe list (vertical buttons).
    list_x = panel_x + 24
    list_y = panel_y + 72
    list_w = 220
    list_btn_h = 32
    recipes = [
        ("PLANKS",        "normal",   "log"),
        ("STICKS",        "normal",   "stick"),
        ("WOODEN AXE",    "selected", "axe"),
        ("WOODEN PICK",   "normal",   "pickaxe"),
        ("FISHING ROD",   "normal",   "rod"),
        ("TORCH",         "normal",   "torch"),
        ("IRON AXE",      "disabled", "axe"),
        ("STONE SWORD",   "disabled", "stone"),
    ]
    for i, (label, state, _icon) in enumerate(recipes):
        y = list_y + i * (list_btn_h + 4)
        # "selected" isn't a button state; the highlighted recipe uses
        # the hover sprite so the list reads as "this is the current
        # selection" without inventing a new sprite.
        sprite_state = "hover" if state == "selected" else state
        draw_button(c, atlas, list_x, y, list_w, list_btn_h,
                    label, state=sprite_state)

    # Right column: recipe detail for the selected recipe (Wooden Axe).
    detail_x = list_x + list_w + 28
    detail_y = list_y
    detail_w = panel_w - (detail_x - panel_x) - 24

    draw_text(c, detail_x, detail_y,
              "WOODEN AXE", rgba=(255, 240, 200, 255), scale=2)
    draw_text(c, detail_x, detail_y + 22,
              "STARTER TOOL  /  CHOPS WOOD AT 2X SPEED",
              rgba=(180, 150, 100, 255), scale=1)

    # Output slot (large) + inputs.
    out_x = detail_x
    out_y = detail_y + 56
    draw_text(c, out_x, out_y - 12, "OUTPUT", rgba=(160, 130, 90, 255), scale=1)
    draw_slot(c, atlas, out_x, out_y, state="normal", item="axe", count=1)

    # Arrow.
    arrow_x = out_x + SLOT_PX + 14
    arrow_y = out_y + SLOT_PX // 2 - 4
    draw_text(c, arrow_x, arrow_y, "<", rgba=(200, 170, 110, 255), scale=2)

    # Inputs.
    inp_x = arrow_x + 30
    inp_y = out_y
    draw_text(c, inp_x, inp_y - 12,
              "INGREDIENTS", rgba=(160, 130, 90, 255), scale=1)
    inputs = [("plank", 2), ("stick", 1)]
    for i, (item, qty) in enumerate(inputs):
        x = inp_x + i * (SLOT_PX + 12)
        draw_slot(c, atlas, x, inp_y, state="normal", item=item, count=qty)

    # Inventory check status text.
    draw_text(c, detail_x, out_y + SLOT_PX + 14,
              "YOU HAVE 24 PLANKS  9 STICKS",
              rgba=(140, 200, 120, 255), scale=1)

    # Bottom: craft + close buttons.
    btn_y = panel_y + panel_h - 60
    draw_button(c, atlas, detail_x, btn_y, 160, 36, "CRAFT", state="hover")
    draw_button(c, atlas, detail_x + 176, btn_y, 160, 36,
                "CRAFT ALL", state="normal")
    draw_button(c, atlas, detail_x + 352, btn_y, 100, 36,
                "BACK", state="normal")

    # Hint at the bottom of the recipe list.
    draw_text(c, list_x, panel_y + panel_h - 30,
              "GREY ENTRIES NEED A BETTER WORKBENCH",
              rgba=(140, 110, 70, 255), scale=1)

    return W, H, c


# ---------------------------------------------------------------------------
# Screen 3: Equipment.

def draw_character_silhouette(canvas, x, y, w, h):
    """Tiny blocky figure centred in (x, y, w, h). Just colour blocks
    standing in for a baked character mesh - this is a mockup, not the
    real character."""
    cx = x + w // 2
    skin = (210, 175, 130, 255)
    cloth = (90, 70, 50, 255)
    cloth2 = (130, 95, 60, 255)
    boot = (60, 42, 28, 255)
    outline = (20, 14, 8, 255)

    head_w = 36
    head_h = 36
    torso_w = 56
    torso_h = 80
    leg_w = 24
    leg_h = 60
    arm_w = 18
    arm_h = 70

    head_x = cx - head_w // 2
    head_y = y + 30
    torso_x = cx - torso_w // 2
    torso_y = head_y + head_h + 4
    arm_l_x = torso_x - arm_w - 4
    arm_r_x = torso_x + torso_w + 4
    arm_y = torso_y + 6
    leg_l_x = cx - leg_w - 4
    leg_r_x = cx + 4
    leg_y = torso_y + torso_h + 4

    fill_rgba_rect(canvas, head_x, head_y, head_w, head_h, skin)
    fill_rgba_rect(canvas, torso_x, torso_y, torso_w, torso_h, cloth)
    fill_rgba_rect(canvas, torso_x + 4, torso_y + 4, torso_w - 8, 6, cloth2)
    fill_rgba_rect(canvas, arm_l_x, arm_y, arm_w, arm_h, cloth)
    fill_rgba_rect(canvas, arm_r_x, arm_y, arm_w, arm_h, cloth)
    fill_rgba_rect(canvas, leg_l_x, leg_y, leg_w, leg_h, cloth2)
    fill_rgba_rect(canvas, leg_r_x, leg_y, leg_w, leg_h, cloth2)
    fill_rgba_rect(canvas, leg_l_x, leg_y + leg_h, leg_w, 10, boot)
    fill_rgba_rect(canvas, leg_r_x, leg_y + leg_h, leg_w, 10, boot)

    # Outline pass (just edges).
    def out(x0, y0, w0, h0):
        for i in range(x0, x0 + w0):
            put_rgba(canvas, i, y0, outline)
            put_rgba(canvas, i, y0 + h0 - 1, outline)
        for j in range(y0, y0 + h0):
            put_rgba(canvas, x0, j, outline)
            put_rgba(canvas, x0 + w0 - 1, j, outline)

    out(head_x, head_y, head_w, head_h)
    out(torso_x, torso_y, torso_w, torso_h)
    out(arm_l_x, arm_y, arm_w, arm_h)
    out(arm_r_x, arm_y, arm_w, arm_h)
    out(leg_l_x, leg_y, leg_w, leg_h)
    out(leg_r_x, leg_y, leg_w, leg_h)
    out(leg_l_x, leg_y + leg_h, leg_w, 10)
    out(leg_r_x, leg_y + leg_h, leg_w, 10)


def render_equipment(atlas):
    W, H = 800, 500
    c = make_rgba_canvas(W, H)
    fill_backdrop(c)
    dim_scene_behind(c, 0, 0, W, H, alpha=80)

    panel_x, panel_y = 50, 40
    panel_w, panel_h = 700, 420
    draw_panel(c, atlas, panel_x, panel_y, panel_w, panel_h)
    draw_title_bar(c, atlas, panel_x + 20, panel_y + 16, panel_w - 40, 32,
                   "EQUIPMENT")
    draw_close_x(c, atlas, panel_x + panel_w - 36, panel_y + 22, scale=2)

    # Centre: character silhouette inside a sub-panel.
    char_x = panel_x + panel_w // 2 - 110
    char_y = panel_y + 72
    char_w = 220
    char_h = 280
    draw_character_silhouette(c, char_x, char_y, char_w, char_h)

    # Equipment slots around the figure. Each slot is 36 x 36 with a
    # small caption beneath.
    slots = [
        # (label, x, y, item)
        ("HEAD",    char_x - 60, char_y + 30,  "helmet"),
        ("CHEST",   char_x - 60, char_y + 90,  "chest"),
        ("LEGS",    char_x - 60, char_y + 150, None),
        ("BOOTS",   char_x - 60, char_y + 210, "boots"),
        ("WEAPON",  char_x + char_w + 24, char_y + 30,  "axe"),
        ("TOOL",    char_x + char_w + 24, char_y + 90,  "pickaxe"),
        ("OFFHAND", char_x + char_w + 24, char_y + 150, "shield"),
        ("PACK",    char_x + char_w + 24, char_y + 210, None),
    ]
    for label, sx, sy, item in slots:
        draw_slot(c, atlas, sx, sy, state="normal", item=item, count=0)
        tw = text_width(label, scale=1)
        draw_text(c, sx + (SLOT_PX - tw) // 2, sy + SLOT_PX + 4,
                  label, rgba=(160, 130, 90, 255), scale=1)

    # Right-edge stat readouts inside the panel border.
    stats_x = panel_x + panel_w - 180
    stats_y = panel_y + 320
    draw_text(c, stats_x, stats_y, "STATS",
              rgba=(255, 240, 200, 255), scale=2)
    rows = [
        ("ATTACK",  "12"),
        ("DEFENSE", "8"),
        ("MINING",  "3"),
        ("SPEED",   "1.0"),
    ]
    for i, (k, v) in enumerate(rows):
        y = stats_y + 22 + i * 14
        draw_text(c, stats_x, y, k, rgba=(180, 150, 100, 255), scale=1)
        vw = text_width(v, scale=1)
        draw_text(c, stats_x + 160 - vw, y, v,
                  rgba=(232, 210, 168, 255), scale=1)

    # Bottom-left hint.
    draw_text(c, panel_x + 20, panel_y + panel_h - 22,
              "HOVER A SLOT TO COMPARE",
              rgba=(160, 130, 90, 255), scale=1)

    return W, H, c


# ---------------------------------------------------------------------------
# Screen 4: Skill Tree.

def render_skills(atlas):
    W, H = 800, 580
    c = make_rgba_canvas(W, H)
    fill_backdrop(c)
    dim_scene_behind(c, 0, 0, W, H, alpha=80)

    panel_x, panel_y = 40, 40
    panel_w, panel_h = 720, 500
    draw_panel(c, atlas, panel_x, panel_y, panel_w, panel_h)
    draw_title_bar(c, atlas, panel_x + 20, panel_y + 16, panel_w - 40, 32,
                   "SKILL TREE")
    draw_close_x(c, atlas, panel_x + panel_w - 36, panel_y + 22, scale=2)

    # Header text: available points.
    draw_text(c, panel_x + 24, panel_y + 64,
              "3 POINTS AVAILABLE",
              rgba=(255, 240, 200, 255), scale=2)

    # Node layout: three branches (MINING / CRAFTING / EXPLORATION)
    # emanating from a central root node near the top of the work area.
    # Each entry: id, label, x, y, state, links-to-ids.
    nodes = [
        ("root",      "BASICS",       panel_x + panel_w // 2 - SLOT_PX // 2, panel_y + 110, "selected", []),

        # Mining branch (left).
        ("m1", "STONE",     panel_x + 140, panel_y + 200, "selected", ["root"]),
        ("m2", "ORE",       panel_x + 100, panel_y + 280, "normal",   ["m1"]),
        ("m3", "IRON",      panel_x + 180, panel_y + 280, "selected", ["m1"]),
        ("m4", "MASTER",    panel_x + 140, panel_y + 360, "disabled", ["m2", "m3"]),

        # Crafting branch (centre).
        ("c1", "WORKBENCH", panel_x + panel_w // 2 - SLOT_PX // 2, panel_y + 200, "selected", ["root"]),
        ("c2", "TOOLS",     panel_x + panel_w // 2 - SLOT_PX // 2 - 50, panel_y + 280, "normal",   ["c1"]),
        ("c3", "FURNACE",   panel_x + panel_w // 2 - SLOT_PX // 2 + 50, panel_y + 280, "normal",   ["c1"]),
        ("c4", "FORGE",     panel_x + panel_w // 2 - SLOT_PX // 2, panel_y + 360, "disabled", ["c2", "c3"]),

        # Exploration / fishing branch (right).
        ("e1", "FISHING",   panel_x + panel_w - 200, panel_y + 200, "normal",   ["root"]),
        ("e2", "BAITS",     panel_x + panel_w - 240, panel_y + 280, "disabled", ["e1"]),
        ("e3", "NETS",      panel_x + panel_w - 160, panel_y + 280, "disabled", ["e1"]),
        ("e4", "LEGENDS",   panel_x + panel_w - 200, panel_y + 360, "disabled", ["e2", "e3"]),
    ]

    # Index by id for link lookup.
    by_id = {n[0]: n for n in nodes}

    # Draw links first so they sit behind the node sprites.
    for n in nodes:
        _id, _label, nx, ny, state, links = n
        for lid in links:
            ln = by_id[lid]
            ax = ln[2] + SLOT_PX // 2
            ay = ln[3] + SLOT_PX // 2
            bx = nx + SLOT_PX // 2
            by_ = ny + SLOT_PX // 2
            # Bresenham-ish line; colour reflects whether the downstream
            # node is unlocked.
            colour = (180, 150, 90, 255) if state != "disabled" else (90, 78, 60, 255)
            steps = max(abs(bx - ax), abs(by_ - ay), 1)
            for s in range(steps + 1):
                t = s / steps
                px = int(round(ax + (bx - ax) * t))
                py = int(round(ay + (by_ - ay) * t))
                put_rgba(c, px, py, colour)
                put_rgba(c, px + 1, py, colour)

    # Now the nodes themselves.
    for n in nodes:
        _id, label, nx, ny, state, _links = n
        draw_slot(c, atlas, nx, ny, state=state, item=None, count=0)
        # Inner glyph: paint a small coloured square to suggest the
        # skill icon. Same trick as item slots in the inventory.
        glyph_colour = {
            "selected": (245, 212,  71, 255),
            "normal":   (180, 150,  90, 255),
            "disabled": (107, 100,  92, 255),
        }[state]
        pad = SLOT_PX // 4
        fill_rgba_rect(c, nx + pad, ny + pad,
                       SLOT_PX - pad * 2, SLOT_PX - pad * 2, glyph_colour)
        # Label below.
        tw = text_width(label, scale=1)
        lcol = (255, 240, 200, 255) if state == "selected" else (160, 130, 90, 255)
        draw_text(c, nx + (SLOT_PX - tw) // 2, ny + SLOT_PX + 4,
                  label, rgba=lcol, scale=1)

    # Bottom buttons.
    btn_y = panel_y + panel_h - 60
    draw_button(c, atlas, panel_x + 24, btn_y, 160, 36,
                "RESPEC", state="normal")
    draw_button(c, atlas, panel_x + panel_w - 184, btn_y, 160, 36,
                "CONFIRM", state="hover")

    # Branch headers under the root.
    draw_text(c, panel_x + 100, panel_y + 170, "MINING",
              rgba=(160, 130, 90, 255), scale=1)
    draw_text(c, panel_x + panel_w // 2 - 30, panel_y + 170, "CRAFTING",
              rgba=(160, 130, 90, 255), scale=1)
    draw_text(c, panel_x + panel_w - 240, panel_y + 170, "EXPLORATION",
              rgba=(160, 130, 90, 255), scale=1)

    return W, H, c


# ---------------------------------------------------------------------------
# PNG writer (RGBA-8). Same shape as gen-ui-sprites.py's writer; takes a
# 2D RGBA tuple grid this time instead of an indexed grid.

def write_png_rgba(path, w, h, canvas):
    raw = bytearray()
    for j in range(h):
        raw.append(0)  # filter byte: none
        for i in range(w):
            r, g, b, a = canvas[j][i]
            raw.extend((r & 0xff, g & 0xff, b & 0xff, a & 0xff))

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
    atlas = build_atlas()
    out_dir = os.path.normpath(os.path.join(HERE, "..", "docs", "mockups"))

    screens = [
        ("inventory.png", render_inventory),
        ("crafting.png",  render_crafting),
        ("equipment.png", render_equipment),
        ("skills.png",    render_skills),
    ]
    for fname, fn in screens:
        w, h, c = fn(atlas)
        path = os.path.join(out_dir, fname)
        write_png_rgba(path, w, h, c)
        print(f"wrote {path} ({w}x{h})")


if __name__ == "__main__":
    main()
