#include "client/inventory_screen.h"
#include "client/pixel_ui.h"
#include "client/item_atlas.h"
#include "client/mobile_ui.h"      /* mobile_ui_draw_rect for the backdrop */
#include "client/renderer.h"
#include "client/hex_mesher.h"     /* HEX_ATLAS_U_STEP for block icons */
#include "core/blocks.h"

#include "sokol_app.h"
#include "sokol_debugtext.h"
#include "sokol_time.h"

#include <stdbool.h>
#include <stdio.h>
#include <string.h>

/* ----------------------------------------------------------------------- */
/* Layout constants - match the geometry in tools/gen-ui-mockups.py so the
 * shipped screens line up with what was approved in the design pass.
 * The PANEL_* are nominal sizes; the runtime clamps them to fit a small
 * screen (mobile / windowed). */

#define NOM_PANEL_W   1040
#define NOM_PANEL_H    560
#define TITLE_BAR_H     32
#define TAB_W          200
#define TAB_H           36
#define TAB_GAP         12
#define SLOT_PX         36     /* matches gen-ui-mockups.py SLOT_PX */
#define SLOT_GAP         6

/* Tab order. The active tab is rendered with the hover sprite via
 * PIXEL_UI_BUTTON_ACTIVE; disabled tabs show the greyed sprite and
 * swallow clicks. The .enabled flag controls which destinations are
 * reachable today - extend the enabled set as those screens land. */
typedef enum {
    TAB_INVENTORY = 0,
    TAB_CRAFTING,
    TAB_EQUIPMENT,
    TAB_SKILLS,
    TAB_COUNT,
} tab_id_t;

static const struct {
    const char* label;
    bool        enabled;
} TABS[TAB_COUNT] = {
    { "INVENTORY", true  },
    { "CRAFTING",  true  },
    { "EQUIPMENT", false },
    { "SKILLS",    false },
};

/* ----------------------------------------------------------------------- */

static struct {
    bool      open;
    tab_id_t  active;

    /* Stable id strings for pixel_ui's pointer-identity hot/active
     * tracking. Filled at init; passed by pointer to pixel_ui_slot /
     * pixel_ui_button calls each frame. */
    char id_tab    [TAB_COUNT]      [16];
    char id_main   [INV_MAIN_SLOTS] [16];
    char id_hotbar [INV_HOTBAR_SLOTS][16];
    char id_craft  [INV_CRAFT_SLOTS][16];
    char id_craft_output[16];
    char id_craft_button[16];

    /* Shift+E hint state. e_tap_count + e_last_tap_sec measure
     * "tapped E recently in space"; once the count crosses the
     * threshold the toast becomes visible until hint_until_sec, then
     * gets suppressed until hint_suppress_until_sec so we don't
     * re-fire every frame the player keeps mashing. */
    int    e_tap_count;
    double e_last_tap_sec;
    double hint_until_sec;
    double hint_suppress_until_sec;
} G = {0};


void inventory_screen_init(void) {
    G.active = TAB_INVENTORY;
    for (int i = 0; i < TAB_COUNT; ++i) {
        snprintf(G.id_tab[i], sizeof(G.id_tab[i]), "invscr_tab_%d", i);
    }
    for (int i = 0; i < INV_MAIN_SLOTS; ++i) {
        snprintf(G.id_main[i], sizeof(G.id_main[i]), "invscr_main_%d", i);
    }
    for (int i = 0; i < INV_HOTBAR_SLOTS; ++i) {
        snprintf(G.id_hotbar[i], sizeof(G.id_hotbar[i]), "invscr_hb_%d", i);
    }
    for (int i = 0; i < INV_CRAFT_SLOTS; ++i) {
        snprintf(G.id_craft[i], sizeof(G.id_craft[i]), "invscr_cr_%d", i);
    }
    snprintf(G.id_craft_output, sizeof(G.id_craft_output), "invscr_cr_out");
    snprintf(G.id_craft_button, sizeof(G.id_craft_button), "invscr_cr_btn");
}

void inventory_screen_toggle(void) {
    G.open = !G.open;
}

bool inventory_screen_is_open(void) {
    return G.open;
}

bool inventory_screen_event(const sapp_event* e) {
    if (!G.open) return false;
    if (!e) return false;

    /* Escape closes the overlay. */
    if (e->type == SAPP_EVENTTYPE_KEY_DOWN
        && e->key_code == SAPP_KEYCODE_ESCAPE) {
        G.open = false;
        return true;
    }

    /* While open, eat every event so nothing leaks through to the
     * player controller behind the panel (no camera rotation on
     * mouse-move, no block break on click, no movement on WASD).
     * Mouse positions still reach pixel_ui because main_web pumps
     * pixel_ui_event AFTER inventory_screen_event returns true. */
    return true;
}


/* ----------------------------------------------------------------------- */
/* Slot rendering helper. Picks the right atlas + UV for a slot
 * (block icons sample the terrain atlas, item icons sample the item
 * atlas, empty slots paint just the frame). */

static void draw_slot_for(const inv_slot_t* s, const char* id,
                          int x, int y,
                          pixel_ui_slot_state_t state) {
    uint32_t view = 0, samp = 0;
    float u0 = 0.0f, v0 = 0.0f, u1 = 1.0f, v1 = 1.0f;
    int count = 0;

    if (s && s->count > 0) {
        if (s->item_id != ITEM_NONE) {
            /* Item icon - sample the item atlas. */
            if (item_atlas_uv(s->item_id, &u0, &v0, &u1, &v1)) {
                view = item_atlas_view_id();
                samp = item_atlas_sampler_id();
            }
            count = s->count;
        } else if (s->type != BLOCK_AIR) {
            /* Block icon - sample the terrain atlas one column wide. */
            const int col = (int)block_face_tile(s->type, FACE_CAP_TOP);
            u0 = (float)col       * HEX_ATLAS_U_STEP;
            u1 = (float)(col + 1) * HEX_ATLAS_U_STEP;
            v0 = 0.0f;
            v1 = 1.0f;
            view = renderer_atlas_view_id();
            samp = renderer_atlas_sampler_id();
            count = s->count;
        }
    }

    /* Suppress the count badge in two cases the hotbar already
     * handles the same way: creative-mode "infinite" stacks
     * (>9000), and singleton tool items where a "1" badge would
     * just be noise. The badge is useful for stackable resources. */
    int display_count = count;
    if (display_count > 9000) display_count = 0;
    if (count == 1 && s && s->item_id >= ITEM_PICKAXE
                   && s->item_id <= ITEM_PROSPECTING_AXE) {
        display_count = 0;
    }

    pixel_ui_slot(id, x, y, view, samp, u0, v0, u1, v1,
                  display_count, state);
}


/* ----------------------------------------------------------------------- */
/* Tab content draws. */

static void draw_inventory_tab(inventory_t* inv,
                               int panel_x, int panel_y,
                               int panel_w, int panel_h,
                               int content_y) {
    /* Main inventory grid: 10 cols x 5 rows, centred under the tabs. */
    const int cols = INV_MAIN_COLS;
    const int rows = INV_MAIN_ROWS;
    const int grid_w = cols * SLOT_PX + (cols - 1) * SLOT_GAP;
    const int grid_h = rows * SLOT_PX + (rows - 1) * SLOT_GAP;
    const int grid_x = panel_x + (panel_w - grid_w) / 2;
    const int grid_y = content_y + 30;

    for (int r = 0; r < rows; ++r) {
        for (int c = 0; c < cols; ++c) {
            const int idx = r * cols + c;
            const int sx = grid_x + c * (SLOT_PX + SLOT_GAP);
            const int sy = grid_y + r * (SLOT_PX + SLOT_GAP);
            draw_slot_for(&inv->main[idx], G.id_main[idx], sx, sy,
                          PIXEL_UI_SLOT_NORMAL);
        }
    }

    /* HOTBAR label + 9-slot row below the main grid. The selected
     * hotbar slot keeps the gold accent so the player can confirm
     * what's currently in their hand without leaving the screen. */
    const int hb_cols = INV_HOTBAR_SLOTS;
    const int hb_w = hb_cols * SLOT_PX + (hb_cols - 1) * SLOT_GAP;
    const int hb_x = panel_x + (panel_w - hb_w) / 2;
    const int hb_y = grid_y + rows * (SLOT_PX + SLOT_GAP) + 36;
    pixel_ui_label(hb_x, hb_y - 16, "HOTBAR");

    for (int c = 0; c < hb_cols; ++c) {
        const int sx = hb_x + c * (SLOT_PX + SLOT_GAP);
        const pixel_ui_slot_state_t state =
            (c == inv->selected) ? PIXEL_UI_SLOT_SELECTED
                                 : PIXEL_UI_SLOT_NORMAL;
        draw_slot_for(&inv->slots[c], G.id_hotbar[c], sx, hb_y, state);
    }

    pixel_ui_label(panel_x + 20, panel_y + panel_h - 22,
                   "DRAG TO MOVE  /  I CLOSES  /  TAB SWITCHES SCREEN");
}


static void draw_crafting_tab(inventory_t* inv,
                              int panel_x, int panel_y,
                              int panel_w, int panel_h,
                              int content_y) {
    /* Split: left half = compact inventory, right half = 3x3 craft
     * grid + output. Mirrors the layout in the crafting mockup. */
    const int half_w  = (panel_w - 60) / 2;
    const int left_x  = panel_x + 20;
    const int right_x = panel_x + 30 + half_w + 10;
    const int split_y = content_y;

    pixel_ui_label(left_x,  split_y, "INVENTORY");
    pixel_ui_label(right_x, split_y, "CRAFTING");

    /* ---- Left: compact inventory + hotbar. ----
     * 4 cols x 6 rows of the main grid (24 slots) - the rest is
     * reachable via the scroll affordance the design doc calls out
     * (sprites exist; no scroll behaviour yet). Hotbar below uses
     * the same slot size so the eye reads them as one bag. */
    const int cols = 4;
    const int rows = 6;
    const int grid_w = cols * SLOT_PX + (cols - 1) * SLOT_GAP;
    const int grid_h = rows * SLOT_PX + (rows - 1) * SLOT_GAP;
    const int grid_x = left_x + (half_w - grid_w) / 2;
    const int grid_y = split_y + 30;

    for (int r = 0; r < rows; ++r) {
        for (int c = 0; c < cols; ++c) {
            const int idx = r * cols + c;
            if (idx >= INV_MAIN_SLOTS) break;
            const int sx = grid_x + c * (SLOT_PX + SLOT_GAP);
            const int sy = grid_y + r * (SLOT_PX + SLOT_GAP);
            draw_slot_for(&inv->main[idx], G.id_main[idx], sx, sy,
                          PIXEL_UI_SLOT_NORMAL);
        }
    }

    /* Hotbar row below the compact grid, centred under the left
     * half so its 9 slots stay flush. */
    const int hb_cols = INV_HOTBAR_SLOTS;
    const int hb_w = hb_cols * SLOT_PX + (hb_cols - 1) * SLOT_GAP;
    const int hb_x = left_x + (half_w - hb_w) / 2;
    const int hb_y = grid_y + grid_h + 30;
    pixel_ui_label(hb_x, hb_y - 16, "HOTBAR");

    for (int c = 0; c < hb_cols; ++c) {
        const int sx = hb_x + c * (SLOT_PX + SLOT_GAP);
        const pixel_ui_slot_state_t state =
            (c == inv->selected) ? PIXEL_UI_SLOT_SELECTED
                                 : PIXEL_UI_SLOT_NORMAL;
        draw_slot_for(&inv->slots[c], G.id_hotbar[c], sx, hb_y, state);
    }

    /* ---- Right: 3x3 personal crafting grid + output. ----
     * Recipe matching isn't wired up yet; click handling on the
     * craft slots is the next chunk to land. */
    const int cr_cols = INV_CRAFT_COLS;
    const int cr_rows = INV_CRAFT_ROWS;
    const int cr_w = cr_cols * SLOT_PX + (cr_cols - 1) * SLOT_GAP;
    const int cr_h = cr_rows * SLOT_PX + (cr_rows - 1) * SLOT_GAP;
    const int cr_x = right_x + 20;
    const int cr_y = split_y + 50;

    pixel_ui_label(cr_x, cr_y - 18, "PLACE INGREDIENTS");
    for (int r = 0; r < cr_rows; ++r) {
        for (int c = 0; c < cr_cols; ++c) {
            const int idx = r * cr_cols + c;
            const int sx = cr_x + c * (SLOT_PX + SLOT_GAP);
            const int sy = cr_y + r * (SLOT_PX + SLOT_GAP);
            draw_slot_for(&inv->craft[idx], G.id_craft[idx], sx, sy,
                          PIXEL_UI_SLOT_NORMAL);
        }
    }

    /* Arrow + output slot to the right of the grid. */
    const int arrow_x = cr_x + cr_w + 16;
    const int arrow_y = cr_y + (cr_h / 2) - 8;
    pixel_ui_label(arrow_x, arrow_y, ">");

    const int out_x = arrow_x + 24;
    const int out_y = cr_y + (cr_h - SLOT_PX) / 2;
    pixel_ui_label(out_x - 4, out_y - 18, "OUTPUT");
    draw_slot_for(&inv->craft_output, G.id_craft_output, out_x, out_y,
                  PIXEL_UI_SLOT_NORMAL);

    /* CRAFT button under the grid. Disabled today because recipe
     * matching doesn't ship in this commit. */
    const int btn_y = cr_y + cr_h + 40;
    pixel_ui_button(G.id_craft_button, cr_x, btn_y, 160, 36,
                    "CRAFT", PIXEL_UI_BUTTON_DISABLED);

    pixel_ui_label(right_x + 20, panel_y + panel_h - 22,
                   "PLACE ITEMS IN THE 3X3 GRID TO CRAFT");
}


/* ----------------------------------------------------------------------- */

void inventory_screen_draw(inventory_t* inv) {
    if (!G.open || !inv) return;

    const float sw = sapp_widthf();
    const float sh = sapp_heightf();
    if (sw <= 0.0f || sh <= 0.0f) return;

    /* Dim backdrop so the world reads as paused. Drawn first via
     * mobile_ui's untextured rect helper - the pixel_ui begin() below
     * stays on its own sgl pipeline. */
    mobile_ui_draw_rect(0.0f, 0.0f, sw, sh, 0.0f, 0.0f, 0.0f, 0.55f);

    pixel_ui_begin();

    /* Clamp the panel to fit small / windowed screens. */
    int panel_w = NOM_PANEL_W;
    int panel_h = NOM_PANEL_H;
    if (panel_w > (int)sw - 20) panel_w = (int)sw - 20;
    if (panel_h > (int)sh - 20) panel_h = (int)sh - 20;
    const int panel_x = ((int)sw - panel_w) / 2;
    const int panel_y = ((int)sh - panel_h) / 2;

    pixel_ui_panel(panel_x, panel_y, panel_w, panel_h);

    /* Title bar centred along the top of the panel. */
    const int bar_x = panel_x + 20;
    const int bar_y = panel_y + 16;
    const int bar_w = panel_w - 40;
    pixel_ui_title_bar(bar_x, bar_y, bar_w, TITLE_BAR_H);

    /* Title text - uses the active tab's label so the header stays
     * in sync with what's below. */
    const char* title = TABS[G.active].label;
    /* Roughly centre the title text inside the bar. sokol_debugtext
     * glyphs are 8x8 at scale 1; the label is drawn at scale 2 by
     * pixel_ui_button's helper, but pixel_ui_label uses scale 1
     * directly. Place at left + small inset for readability. */
    pixel_ui_label(bar_x + 16, bar_y + 12, title);

    /* Tab bar centred under the title. The active tab uses the
     * hover sprite via PIXEL_UI_BUTTON_ACTIVE; disabled tabs (the
     * not-yet-implemented destinations) show the greyed sprite. */
    const int tab_total = TAB_COUNT * TAB_W + (TAB_COUNT - 1) * TAB_GAP;
    const int tab_x0 = panel_x + (panel_w - tab_total) / 2;
    const int tab_y  = panel_y + 64;
    for (int i = 0; i < TAB_COUNT; ++i) {
        pixel_ui_button_state_t st = PIXEL_UI_BUTTON_NORMAL;
        if (!TABS[i].enabled)        st = PIXEL_UI_BUTTON_DISABLED;
        else if ((tab_id_t)i == G.active) st = PIXEL_UI_BUTTON_ACTIVE;

        const int x = tab_x0 + i * (TAB_W + TAB_GAP);
        if (pixel_ui_button(G.id_tab[i], x, tab_y, TAB_W, TAB_H,
                            TABS[i].label, st)) {
            if (TABS[i].enabled) G.active = (tab_id_t)i;
        }
    }

    const int content_y = tab_y + TAB_H + 16;

    switch (G.active) {
        case TAB_INVENTORY:
            draw_inventory_tab(inv, panel_x, panel_y, panel_w, panel_h,
                               content_y);
            break;
        case TAB_CRAFTING:
            draw_crafting_tab(inv, panel_x, panel_y, panel_w, panel_h,
                              content_y);
            break;
        case TAB_EQUIPMENT:
        case TAB_SKILLS:
        case TAB_COUNT:
            /* Unreachable - disabled tabs swallow clicks - but the
             * compiler likes the case list to be exhaustive. */
            break;
    }

    pixel_ui_end();
}


/* ----------------------------------------------------------------------- */
/* Shift+E hint. */

void inventory_screen_note_e_tap_in_space(void) {
    const double now = stm_sec(stm_now());

    /* Already showing the hint, or inside the cool-down after a
     * previous show - skip the count update so we don't spam the
     * toast while it's already up. */
    if (now < G.hint_suppress_until_sec) return;

    /* Reset the run if the last tap was more than a beat ago - we
     * only want to react to "deliberate repeated mashing". */
    if (now - G.e_last_tap_sec > 1.5) {
        G.e_tap_count = 0;
    }
    G.e_tap_count++;
    G.e_last_tap_sec = now;

    if (G.e_tap_count >= 3) {
        G.hint_until_sec          = now + 4.0;
        /* 4 s of visible toast + 8 s cool-down so the player has a
         * chance to read it and try again without immediate re-fire. */
        G.hint_suppress_until_sec = now + 12.0;
        G.e_tap_count = 0;
    }
}

void inventory_screen_draw_hint(void) {
    const double now = stm_sec(stm_now());
    if (now >= G.hint_until_sec) return;

    static const char* msg = "PRESS SHIFT+E TO OPEN INVENTORY IN SPACE";

    const float w = sapp_widthf();
    const float h = sapp_heightf();
    if (w <= 0.0f || h <= 0.0f) return;

    /* 8 px per glyph at sdtx scale 1. Centre the line horizontally
     * and place it just under the reticle so it doesn't crowd the
     * hotbar. */
    const float char_w  = 8.0f;
    const float text_w  = char_w * (float)strlen(msg);
    const float text_x  = (w - text_w) * 0.5f;
    const float text_y  = h * 0.42f;

    /* Backdrop strip for readability over varied scene colours. */
    mobile_ui_draw_rect(text_x - 12.0f, text_y - 4.0f,
                        text_w + 24.0f, 16.0f,
                        0.0f, 0.0f, 0.0f, 0.75f);

    sdtx_canvas(w, h);
    sdtx_origin(0.0f, 0.0f);
    sdtx_color3b(0xff, 0xe0, 0x40);    /* gold accent from the UI palette */
    sdtx_pos(text_x / 8.0f, text_y / 8.0f);
    sdtx_puts(msg);
}
