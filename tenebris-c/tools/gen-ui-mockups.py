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
    "panel":             (  0,  0, 32, 32,  8, 8, 8, 8),
    "button_normal":     ( 32,  0, 24, 16,  4, 4, 4, 4),
    "button_hover":      ( 56,  0, 24, 16,  4, 4, 4, 4),
    "button_pressed":    ( 80,  0, 24, 16,  4, 4, 4, 4),
    "button_disabled":   (104,  0, 24, 16,  4, 4, 4, 4),
    "title_bar":         ( 32, 16, 24, 16,  4, 4, 4, 4),
    "close_x":           ( 56, 16, 12, 12,  0, 0, 0, 0),
    "slot_normal":       (  0, 32, 18, 18,  3, 3, 3, 3),
    "slot_hover":        ( 18, 32, 18, 18,  3, 3, 3, 3),
    "slot_selected":     ( 36, 32, 18, 18,  3, 3, 3, 3),
    "slot_disabled":     ( 54, 32, 18, 18,  3, 3, 3, 3),
    "scrollbar_track":   (  0, 64,  8, 16,  0, 0, 4, 4),
    "scrollbar_thumb":   (  8, 64,  8, 16,  0, 0, 4, 4),
    "scroll_arrow_up":   ( 16, 64,  8,  8,  0, 0, 0, 0),
    "scroll_arrow_down": ( 24, 64,  8,  8,  0, 0, 0, 0),
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
    S.blit(atlas,   0, 64, S.make_scrollbar_track(8, 16))
    S.blit(atlas,   8, 64, S.make_scrollbar_thumb(8, 16))
    S.blit(atlas,  16, 64, S.make_arrow(8, 8, "up"))
    S.blit(atlas,  24, 64, S.make_arrow(8, 8, "down"))
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
    "log":             ((101,  64,  35, 255), (160, 110,  60, 255)),
    "plank":           ((176, 134,  82, 255), (215, 175, 120, 255)),
    "stick":           ((132,  92,  52, 255), (180, 140,  90, 255)),
    "stone":           (( 96,  96,  98, 255), (160, 160, 162, 255)),
    "ore":             ((205, 168,  73, 255), (245, 220, 140, 255)),
    "iron":            ((140, 145, 150, 255), (210, 215, 220, 255)),
    "grass":           (( 68, 130,  58, 255), (140, 195, 100, 255)),
    "fish":            ((110, 150, 180, 255), (190, 220, 235, 255)),
    "axe":             ((196, 198, 200, 255), (132,  92,  52, 255)),
    "rod":             ((150, 110,  72, 255), (220, 220, 220, 255)),
    "pickaxe":         ((200, 200, 210, 255), (132,  92,  52, 255)),
    "shovel":          ((180, 180, 184, 255), (132,  92,  52, 255)),
    "prospecting_axe": ((180, 180, 184, 255), (245, 212,  71, 255)),
    "helmet":          ((150, 152, 158, 255), (220, 220, 230, 255)),
    "chest":           ((128, 100,  72, 255), (210, 175, 120, 255)),
    "boots":           (( 80,  60,  44, 255), (160, 130,  90, 255)),
    "shield":          ((110, 140, 170, 255), (220, 180,  80, 255)),
    "torch":           ((230, 180,  80, 255), (255, 220, 140, 255)),
    "coal":            (( 22,  22,  24, 255), ( 72,  72,  74, 255)),
    "small_rock":      (( 96,  96,  98, 255), (170, 170, 174, 255)),
    "grass_clip":      (( 68, 130,  58, 255), (140, 195, 100, 255)),
    "flower":          ((220, 140, 200, 255), (240, 210,  80, 255)),
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

# Standard panel + tab geometry used by every screen so the mockups
# read as a coherent UI rather than four unrelated layouts.
MOCKUP_W = 1100
MOCKUP_H = 620
PANEL_X, PANEL_Y = 30, 30
PANEL_W, PANEL_H = 1040, 560
TITLE_BAR_X = PANEL_X + 20
TITLE_BAR_Y = PANEL_Y + 16
TITLE_BAR_W = PANEL_W - 40
TITLE_BAR_H = 32
TAB_Y       = PANEL_Y + 64
TAB_H       = 36
TAB_W       = 200
TAB_GAP     = 12
CONTENT_Y   = TAB_Y + TAB_H + 16

TAB_LABELS = ["INVENTORY", "CRAFTING", "EQUIPMENT", "SKILLS"]
# Which tabs are reachable today. Equipment + Skills are placeholders
# rendered in the disabled sprite so the player can see they're coming
# but can't click them yet. Mirrors the .enabled flag in
# src/client/inventory_screen.c -- update both in lockstep.
TAB_ENABLED = [True, True, False, False]


def draw_tabs(canvas, atlas, active_idx):
    """Four-tab navigation row centred under the title bar. The active
    tab uses the hover sprite, disabled tabs use the greyed sprite, the
    rest use the normal sprite and act as live nav buttons."""
    total = len(TAB_LABELS) * TAB_W + (len(TAB_LABELS) - 1) * TAB_GAP
    start_x = PANEL_X + (PANEL_W - total) // 2
    for i, label in enumerate(TAB_LABELS):
        x = start_x + i * (TAB_W + TAB_GAP)
        if not TAB_ENABLED[i]:
            state = "disabled"
        elif i == active_idx:
            state = "hover"
        else:
            state = "normal"
        draw_button(canvas, atlas, x, TAB_Y, TAB_W, TAB_H, label, state=state)


SCROLLBAR_W = 16
SCROLLBAR_GAP = 6


def draw_scrollbar(canvas, atlas, x, y, w, h,
                   thumb_frac=1.0, thumb_pos=0.0):
    """Vertical scrollbar at (x, y, w, h). The scrollbar reserves
    `w`-tall square buttons at the top and bottom for the up/down
    chevrons; the track and thumb fill the band between them.

    thumb_frac (0..1) is the fraction of the underlying content that's
    currently visible - a smaller value means more rows are scrolled
    out of view and the thumb is shorter. thumb_pos (0..1) is how far
    down we've scrolled, 0 = at the top, 1 = at the bottom. Both args
    are pure visualisation - the runtime will compute them from the
    inventory model."""
    btn_h = w
    # Up arrow (top button).
    draw_nine_slice(canvas, atlas, "scroll_arrow_up", x, y, w, btn_h)
    # Down arrow (bottom button).
    draw_nine_slice(canvas, atlas, "scroll_arrow_down",
                    x, y + h - btn_h, w, btn_h)
    # Track between the arrow buttons.
    track_y = y + btn_h
    track_h = h - 2 * btn_h
    draw_nine_slice(canvas, atlas, "scrollbar_track", x, track_y, w, track_h)
    # Thumb. Clamp the height so a tiny inventory still has a grabbable
    # handle, and clamp the position so the thumb can't drift past the
    # ends of the track.
    thumb_frac = max(0.0, min(1.0, thumb_frac))
    thumb_pos  = max(0.0, min(1.0, thumb_pos))
    thumb_h    = max(int(track_h * thumb_frac), 20)
    thumb_h    = min(thumb_h, track_h)
    max_offset = max(0, track_h - thumb_h)
    thumb_y    = track_y + int(thumb_pos * max_offset)
    draw_nine_slice(canvas, atlas, "scrollbar_thumb", x, thumb_y, w, thumb_h)


def draw_compact_inventory(canvas, atlas, x, y, w, h, hover_idx=None,
                           selected_idx=None):
    """Inventory + hotbar block sized to fit inside the left half of a
    split screen (crafting / equipment). 4-col x 6-row grid + 9-slot
    hotbar below, both made of the same SLOT_PX-sized slots so the
    user reads them as one continuous bag.

    The compact grid shows only the first 24 of the bag's 50 main slots,
    so a vertical scrollbar sits flush to the right edge of the grid -
    same atlas, nine-sliced to whatever height the grid happens to be.

    Returns the list of slot rects (x, y, w, h) so the caller can wire
    up tooltip / drag-source affordances later. Caller-side state
    (selected, hover) drives the highlight; the mockup just paints
    representative values."""
    gap = 6
    cols, rows = 4, 6
    grid_w = cols * SLOT_PX + (cols - 1) * gap
    grid_h = rows * SLOT_PX + (rows - 1) * gap
    # Centre the (grid + scrollbar) pair as one block so the scrollbar
    # always sits flush against the grid, regardless of pane width.
    total_w = grid_w + SCROLLBAR_GAP + SCROLLBAR_W
    grid_x = x + (w - total_w) // 2
    grid_y = y + 20
    # Representative item content - same shapes as the full-screen
    # inventory above so the player reads "this is the same bag".
    items = [
        ("log", 12),  ("plank", 24), ("stick", 9),  ("stone", 32),
        ("ore", 4),   ("grass", 1),  None,          ("fish", 2),
        ("coal", 8),  ("iron", 3),   None,          ("torch", 16),
        None,         None,          None,          None,
        None,         None,          None,          None,
        None,         None,          None,          None,
    ]
    rects = []
    for r in range(rows):
        for col in range(cols):
            idx = r * cols + col
            sx = grid_x + col * (SLOT_PX + gap)
            sy = grid_y + r * (SLOT_PX + gap)
            state = "normal"
            if idx == hover_idx:
                state = "hover"
            elif idx == selected_idx:
                state = "selected"
            entry = items[idx] if idx < len(items) else None
            item = entry[0] if entry else None
            count = entry[1] if entry else 0
            draw_slot(canvas, atlas, sx, sy, state=state, item=item, count=count)
            rects.append((sx, sy, SLOT_PX, SLOT_PX))

    # Scrollbar flush to the right edge of the grid. Same height as the
    # grid itself so the thumb's positions line up with grid rows. With
    # 24 visible / 50 total main slots, the thumb covers ~48 % of the
    # track height; in this mockup the user is at the top of the bag.
    sb_x = grid_x + grid_w + SCROLLBAR_GAP
    draw_scrollbar(canvas, atlas, sb_x, grid_y, SCROLLBAR_W, grid_h,
                   thumb_frac=24.0 / 50.0, thumb_pos=0.0)

    # Hotbar below, same slot size, gap matches the grid so the eye
    # reads them as one continuous bag of slots. Centred under the
    # (grid + scrollbar) block so the alignment reads as deliberate.
    hb_y = grid_y + rows * (SLOT_PX + gap) + 12
    hb_cols = 9
    hb_w = hb_cols * SLOT_PX + (hb_cols - 1) * gap
    hb_x = x + (w - hb_w) // 2
    hb_items = [
        ("axe", 1), ("pickaxe", 1), ("torch", 8), ("plank", 32),
        None, None, None, None, None,
    ]
    draw_text(canvas, hb_x, hb_y - 14, "HOTBAR",
              rgba=(180, 150, 100, 255), scale=1)
    for col in range(hb_cols):
        sx = hb_x + col * (SLOT_PX + gap)
        state = "selected" if col == 0 else "normal"
        entry = hb_items[col] if col < len(hb_items) else None
        item = entry[0] if entry else None
        count = entry[1] if entry else 0
        draw_slot(canvas, atlas, sx, hb_y, state=state, item=item, count=count)
        rects.append((sx, hb_y, SLOT_PX, SLOT_PX))

    return rects


def draw_split_divider(canvas, mid_x, y, h):
    """Thin bronze rule between the inventory half and the function
    half of a split screen. Single-pixel column so it doesn't crowd
    either side."""
    for j in range(y, y + h):
        put_rgba(canvas, mid_x,     j, (107,  74, 43, 255))
        put_rgba(canvas, mid_x + 1, j, ( 36,  24, 16, 255))


def draw_chrome(canvas, atlas, title, active_tab):
    """Backdrop + panel + title bar + tab bar shared by every screen."""
    fill_backdrop(canvas)
    dim_scene_behind(canvas, 0, 0, MOCKUP_W, MOCKUP_H, alpha=80)
    draw_panel(canvas, atlas, PANEL_X, PANEL_Y, PANEL_W, PANEL_H)
    draw_title_bar(canvas, atlas, TITLE_BAR_X, TITLE_BAR_Y,
                   TITLE_BAR_W, TITLE_BAR_H, title)
    draw_close_x(canvas, atlas, PANEL_X + PANEL_W - 36, PANEL_Y + 22, scale=2)
    draw_tabs(canvas, atlas, active_tab)


# ---------------------------------------------------------------------------
# Screen 1: Inventory.

def render_inventory(atlas):
    W, H = MOCKUP_W, MOCKUP_H
    c = make_rgba_canvas(W, H)
    draw_chrome(c, atlas, "INVENTORY", active_tab=0)

    # Main inventory grid: 10 cols x 5 rows = 50 slots. The standalone
    # inventory tab is the only place we show the full bag at full
    # size; the split-screen variants use a compact 4 x 6 layout.
    cols, rows = 10, 5
    gap = 6
    grid_w = cols * SLOT_PX + (cols - 1) * gap
    grid_x = PANEL_X + (PANEL_W - grid_w) // 2
    grid_y = CONTENT_Y + 30

    # First row showcases the new four starter tools; second row is raw
    # / refined resources; third row is the clutter drops that'll land
    # once the world clutter system ships.
    items = [
        ("pickaxe", 1),    ("axe", 1),        ("shovel", 1),     ("prospecting_axe", 1),
        ("torch", 16),     ("fish", 2),       ("ore", 4),        None,                   None,    None,
        ("log", 12),       ("plank", 24),     ("stick", 9),      ("stone", 32),          ("coal", 8), ("iron", 3), None, None, None, None,
        ("small_rock", 4), ("grass_clip", 3), ("flower", 2),     None,                   None,    None, None, None, None, None,
    ] + [None] * (cols * rows)
    for r in range(rows):
        for col in range(cols):
            idx = r * cols + col
            x = grid_x + col * (SLOT_PX + gap)
            y = grid_y + r * (SLOT_PX + gap)
            state = "normal"
            if idx == 4:
                state = "hover"
            if idx == 2:
                state = "selected"
            entry = items[idx] if idx < len(items) else None
            item = entry[0] if entry else None
            count = entry[1] if entry else 0
            draw_slot(c, atlas, x, y, state=state, item=item, count=count)

    # Hotbar label + row, anchored below the main grid.
    hb_cols = 9
    hb_w = hb_cols * SLOT_PX + (hb_cols - 1) * gap
    hb_x = PANEL_X + (PANEL_W - hb_w) // 2
    hb_y = grid_y + rows * (SLOT_PX + gap) + 32
    draw_text(c, hb_x, hb_y - 16, "HOTBAR",
              rgba=(180, 150, 100, 255), scale=2)
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
    draw_text(c, PANEL_X + 20, PANEL_Y + PANEL_H - 22,
              "DRAG TO MOVE  /  RIGHT CLICK TO SPLIT  /  TAB SWITCHES SCREEN",
              rgba=(160, 130, 90, 255), scale=1)

    return W, H, c


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
# Screen 2: Crafting.

def render_crafting(atlas):
    W, H = MOCKUP_W, MOCKUP_H
    c = make_rgba_canvas(W, H)
    draw_chrome(c, atlas, "CRAFTING", active_tab=1)

    # Split: left half = compact inventory (drag source), right half =
    # recipe list + detail. The vertical rule down the middle is the
    # visual cue that you can drag from one side into the other.
    half_w = (PANEL_W - 60) // 2
    left_x  = PANEL_X + 20
    right_x = PANEL_X + 30 + half_w + 10
    split_y = CONTENT_Y
    split_h = PANEL_H - (CONTENT_Y - PANEL_Y) - 30

    draw_text(c, left_x, split_y, "INVENTORY",
              rgba=(255, 240, 200, 255), scale=2)
    draw_text(c, right_x, split_y, "RECIPES",
              rgba=(255, 240, 200, 255), scale=2)

    draw_compact_inventory(c, atlas, left_x, split_y + 20, half_w, split_h - 30,
                           hover_idx=1, selected_idx=2)

    draw_split_divider(c, PANEL_X + 20 + half_w + 14, split_y + 10,
                       split_h - 20)

    # Right side: recipe list column + detail panel.
    list_x = right_x
    list_y = split_y + 30
    list_w = 200
    list_btn_h = 30
    recipes = [
        ("PLANKS",        "normal"),
        ("STICKS",        "normal"),
        ("WOODEN AXE",    "selected"),
        ("WOODEN PICK",   "normal"),
        ("FISHING ROD",   "normal"),
        ("TORCH",         "normal"),
        ("IRON AXE",      "disabled"),
        ("STONE SWORD",   "disabled"),
    ]
    for i, (label, state) in enumerate(recipes):
        y = list_y + i * (list_btn_h + 4)
        # "selected" isn't a button state; the highlighted recipe uses
        # the hover sprite so the list reads as "this is the current
        # selection".
        sprite_state = "hover" if state == "selected" else state
        draw_button(c, atlas, list_x, y, list_w, list_btn_h,
                    label, state=sprite_state)

    # Detail area to the right of the recipe list.
    detail_x = list_x + list_w + 20
    detail_y = list_y
    draw_text(c, detail_x, detail_y, "WOODEN AXE",
              rgba=(255, 240, 200, 255), scale=2)
    draw_text(c, detail_x, detail_y + 22,
              "CHOPS WOOD 2X FASTER",
              rgba=(180, 150, 100, 255), scale=1)

    out_x = detail_x
    out_y = detail_y + 56
    draw_text(c, out_x, out_y - 12, "OUTPUT",
              rgba=(160, 130, 90, 255), scale=1)
    draw_slot(c, atlas, out_x, out_y, state="normal", item="axe", count=1)

    arrow_x = out_x + SLOT_PX + 12
    arrow_y = out_y + SLOT_PX // 2 - 7
    draw_text(c, arrow_x, arrow_y, "<",
              rgba=(200, 170, 110, 255), scale=2)

    inp_x = arrow_x + 26
    inp_y = out_y
    draw_text(c, inp_x, inp_y - 12, "INGREDIENTS",
              rgba=(160, 130, 90, 255), scale=1)
    inputs = [("plank", 2), ("stick", 1)]
    for i, (item, qty) in enumerate(inputs):
        x = inp_x + i * (SLOT_PX + 10)
        draw_slot(c, atlas, x, inp_y, state="normal", item=item, count=qty)

    draw_text(c, detail_x, out_y + SLOT_PX + 14,
              "INGREDIENTS PULLED FROM INVENTORY",
              rgba=(140, 200, 120, 255), scale=1)

    btn_y = PANEL_Y + PANEL_H - 60
    draw_button(c, atlas, detail_x, btn_y, 140, 36,
                "CRAFT", state="hover")
    draw_button(c, atlas, detail_x + 150, btn_y, 140, 36,
                "CRAFT ALL", state="normal")

    draw_text(c, left_x, PANEL_Y + PANEL_H - 22,
              "DRAG ITEMS INTO INGREDIENT SLOTS, OR CLICK CRAFT",
              rgba=(160, 130, 90, 255), scale=1)

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
    W, H = MOCKUP_W, MOCKUP_H
    c = make_rgba_canvas(W, H)
    draw_chrome(c, atlas, "EQUIPMENT", active_tab=2)

    half_w = (PANEL_W - 60) // 2
    left_x  = PANEL_X + 20
    right_x = PANEL_X + 30 + half_w + 10
    split_y = CONTENT_Y
    split_h = PANEL_H - (CONTENT_Y - PANEL_Y) - 30

    draw_text(c, left_x, split_y, "INVENTORY",
              rgba=(255, 240, 200, 255), scale=2)
    draw_text(c, right_x, split_y, "EQUIPPED",
              rgba=(255, 240, 200, 255), scale=2)

    draw_compact_inventory(c, atlas, left_x, split_y + 20, half_w, split_h - 30,
                           hover_idx=0)

    draw_split_divider(c, PANEL_X + 20 + half_w + 14, split_y + 10,
                       split_h - 20)

    # Right side: character + equipment slots. Centre the figure in
    # the right half so the side-slots have room to sit on either edge.
    char_w = 180
    char_h = 240
    char_x = right_x + (half_w - char_w) // 2
    char_y = split_y + 50
    draw_character_silhouette(c, char_x, char_y, char_w, char_h)

    slots = [
        ("HEAD",    char_x - 56, char_y + 10,  "helmet"),
        ("CHEST",   char_x - 56, char_y + 70,  "chest"),
        ("LEGS",    char_x - 56, char_y + 130, None),
        ("BOOTS",   char_x - 56, char_y + 190, "boots"),
        ("WEAPON",  char_x + char_w + 20, char_y + 10,  "axe"),
        ("TOOL",    char_x + char_w + 20, char_y + 70,  "pickaxe"),
        ("OFFHAND", char_x + char_w + 20, char_y + 130, "shield"),
        ("PACK",    char_x + char_w + 20, char_y + 190, None),
    ]
    for label, sx, sy, item in slots:
        draw_slot(c, atlas, sx, sy, state="normal", item=item, count=0)
        tw = text_width(label, scale=1)
        draw_text(c, sx + (SLOT_PX - tw) // 2, sy + SLOT_PX + 4,
                  label, rgba=(160, 130, 90, 255), scale=1)

    # Stats sub-panel under the character figure, inside the right half.
    stats_x = right_x + 20
    stats_y = char_y + char_h + 30
    draw_text(c, stats_x, stats_y, "STATS",
              rgba=(255, 240, 200, 255), scale=2)
    rows = [
        ("ATTACK",  "12"),
        ("DEFENSE", "8"),
        ("MINING",  "3"),
        ("SPEED",   "1.0"),
    ]
    for i, (k, v) in enumerate(rows):
        y = stats_y + 22 + i * 12
        draw_text(c, stats_x, y, k, rgba=(180, 150, 100, 255), scale=1)
        vw = text_width(v, scale=1)
        draw_text(c, stats_x + 200 - vw, y, v,
                  rgba=(232, 210, 168, 255), scale=1)

    draw_text(c, left_x, PANEL_Y + PANEL_H - 22,
              "DRAG ITEMS FROM INVENTORY INTO EQUIPMENT SLOTS",
              rgba=(160, 130, 90, 255), scale=1)

    return W, H, c


# ---------------------------------------------------------------------------
# Screen 4: Skill Tree.

def render_skills(atlas):
    W, H = MOCKUP_W, MOCKUP_H
    c = make_rgba_canvas(W, H)
    draw_chrome(c, atlas, "SKILL TREE", active_tab=3)

    draw_text(c, PANEL_X + 24, CONTENT_Y,
              "3 POINTS AVAILABLE",
              rgba=(255, 240, 200, 255), scale=2)

    tree_top_y = CONTENT_Y + 40
    cx = PANEL_X + PANEL_W // 2 - SLOT_PX // 2

    nodes = [
        ("root", "BASICS", cx, tree_top_y, "selected", []),

        # Mining branch (left).
        ("m1", "STONE",  PANEL_X + 200, tree_top_y + 90,  "selected", ["root"]),
        ("m2", "ORE",    PANEL_X + 150, tree_top_y + 180, "normal",   ["m1"]),
        ("m3", "IRON",   PANEL_X + 250, tree_top_y + 180, "selected", ["m1"]),
        ("m4", "MASTER", PANEL_X + 200, tree_top_y + 270, "disabled", ["m2", "m3"]),

        # Crafting branch (centre).
        ("c1", "WORKBENCH", cx,        tree_top_y + 90,  "selected", ["root"]),
        ("c2", "TOOLS",     cx - 60,   tree_top_y + 180, "normal",   ["c1"]),
        ("c3", "FURNACE",   cx + 60,   tree_top_y + 180, "normal",   ["c1"]),
        ("c4", "FORGE",     cx,        tree_top_y + 270, "disabled", ["c2", "c3"]),

        # Exploration branch (right).
        ("e1", "FISHING", PANEL_X + PANEL_W - 240, tree_top_y + 90,  "normal",   ["root"]),
        ("e2", "BAITS",   PANEL_X + PANEL_W - 290, tree_top_y + 180, "disabled", ["e1"]),
        ("e3", "NETS",    PANEL_X + PANEL_W - 190, tree_top_y + 180, "disabled", ["e1"]),
        ("e4", "LEGENDS", PANEL_X + PANEL_W - 240, tree_top_y + 270, "disabled", ["e2", "e3"]),
    ]
    by_id = {n[0]: n for n in nodes}

    # Branch headers between the root and the first row of branch nodes.
    draw_text(c, PANEL_X + 160, tree_top_y + 60, "MINING",
              rgba=(160, 130, 90, 255), scale=1)
    draw_text(c, cx - 26, tree_top_y + 60, "CRAFTING",
              rgba=(160, 130, 90, 255), scale=1)
    draw_text(c, PANEL_X + PANEL_W - 290, tree_top_y + 60, "EXPLORATION",
              rgba=(160, 130, 90, 255), scale=1)

    # Links first so they sit behind the nodes.
    for n in nodes:
        _id, _label, nx, ny, state, links = n
        for lid in links:
            ln = by_id[lid]
            ax = ln[2] + SLOT_PX // 2
            ay = ln[3] + SLOT_PX // 2
            bx = nx + SLOT_PX // 2
            by_ = ny + SLOT_PX // 2
            colour = (180, 150, 90, 255) if state != "disabled" else (90, 78, 60, 255)
            steps = max(abs(bx - ax), abs(by_ - ay), 1)
            for s in range(steps + 1):
                t = s / steps
                px = int(round(ax + (bx - ax) * t))
                py = int(round(ay + (by_ - ay) * t))
                put_rgba(c, px, py, colour)
                put_rgba(c, px + 1, py, colour)

    # Nodes.
    for n in nodes:
        _id, label, nx, ny, state, _links = n
        draw_slot(c, atlas, nx, ny, state=state, item=None, count=0)
        glyph_colour = {
            "selected": (245, 212,  71, 255),
            "normal":   (180, 150,  90, 255),
            "disabled": (107, 100,  92, 255),
        }[state]
        pad = SLOT_PX // 4
        fill_rgba_rect(c, nx + pad, ny + pad,
                       SLOT_PX - pad * 2, SLOT_PX - pad * 2, glyph_colour)
        tw = text_width(label, scale=1)
        lcol = (255, 240, 200, 255) if state == "selected" else (160, 130, 90, 255)
        draw_text(c, nx + (SLOT_PX - tw) // 2, ny + SLOT_PX + 4,
                  label, rgba=lcol, scale=1)

    btn_y = PANEL_Y + PANEL_H - 60
    draw_button(c, atlas, PANEL_X + 24, btn_y, 160, 36,
                "RESPEC", state="normal")
    draw_button(c, atlas, PANEL_X + PANEL_W - 184, btn_y, 160, 36,
                "CONFIRM", state="hover")

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
