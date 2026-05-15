#include "client/teleport_menu.h"
#include "client/input.h"
#include "client/mobile_ui.h"
#include "sokol_gfx.h"
#include "sokol_gl.h"
#include "sokol_debugtext.h"
#include "sokol_app.h"
#include "core/planet.h"
#include <stdarg.h>
#include <stdio.h>
#include <string.h>

/* ----------------------------------------------------------------------- */

#define VISIBLE_ROWS  12
#define PANEL_W      380.0f
#define ROW_H         34.0f
#define TITLE_H       48.0f
#define CLOSE_BTN_PX  28.0f
#define ROW_PAD        4.0f

static struct {
    bool open;
    int  selected;       /* index into BODY_COUNT */
    int  scroll;         /* first visible row     */
    player_ctrl_t* player;
    /* Mouse / touch state pumped from teleport_menu_event. The draw
     * pass uses these for hover rendering and the click handler runs
     * the same hit-test against the cached panel rect so a click is
     * always resolved against what the user actually saw. */
    float mouse_x;
    float mouse_y;
    /* Last drawn panel geometry (pixel coords, origin top-left), cached
     * so the mouse-click hit-test can use the exact same rect even when
     * the draw call hasn't run yet on the very first frame. */
    float panel_x;
    float panel_y;
    float panel_w;
    float panel_h;
    bool  layout_valid;
} M;

void teleport_menu_init(void) {
    memset(&M, 0, sizeof(M));
}
void teleport_menu_shutdown(void) {}

bool teleport_menu_is_open(void) { return M.open; }
void teleport_menu_toggle(void)  { M.open = !M.open; }

void teleport_menu_set_player(player_ctrl_t* player) { M.player = player; }

/* ----------------------------------------------------------------------- */

static void clamp_scroll(void) {
    if (M.selected < M.scroll) M.scroll = M.selected;
    if (M.selected >= M.scroll + VISIBLE_ROWS) M.scroll = M.selected - VISIBLE_ROWS + 1;
    if (M.scroll < 0) M.scroll = 0;
    if (M.scroll > BODY_COUNT - VISIBLE_ROWS) M.scroll = BODY_COUNT - VISIBLE_ROWS;
    if (M.scroll < 0) M.scroll = 0;
}

static void action_up(void) {
    if (!M.open) return;
    if (M.selected > 0) M.selected--;
    clamp_scroll();
}
static void action_down(void) {
    if (!M.open) return;
    if (M.selected < BODY_COUNT - 1) M.selected++;
    clamp_scroll();
}
static void action_ok(void) {
    if (!M.open) return;
    if (M.player) {
        const body_config_t* b = planet_get((body_id_t)M.selected);
        if (b) {
            /* player_teleport_to drops the player ~3 m above the
             * destination's surface — comfortably inside its full-
             * gravity radius (default 1.4 × body radius), so the
             * gravity integrator pulls them straight to the ground
             * rather than letting them no-clip through. The roll-
             * slerp timer is armed at the same time so the camera
             * eases into level rather than popping. */
            player_teleport_to(M.player, b);
        }
    }
    M.open = false;
}
static void action_close(void) { M.open = false; }

/* ----------------------------------------------------------------------- */

/* Pixel-rect hit test. Inclusive on the left/top, exclusive on the
 * right/bottom so adjacent rects don't double-count a single click. */
static bool hit_rect(float x, float y, float w, float h,
                       float px, float py) {
    return px >= x && px < x + w && py >= y && py < y + h;
}

/* Reconstruct the geometry the draw pass uses so the click handler
 * can hit-test rows + close-button without depending on the draw
 * call having run yet this frame. Pure function of (open, scroll). */
static void compute_layout(float* out_panel_x, float* out_panel_y,
                             float* out_panel_w, float* out_panel_h) {
    const float w = sapp_widthf();
    const float h = sapp_heightf();
    const float panel_h = TITLE_H + (float)VISIBLE_ROWS * ROW_H + 20.0f;
    *out_panel_w = PANEL_W;
    *out_panel_h = panel_h;
    *out_panel_x = (w - PANEL_W) * 0.5f;
    *out_panel_y = (h - panel_h) * 0.5f;
}

static void close_btn_rect(float panel_x, float panel_y,
                             float* out_x, float* out_y, float* out_s) {
    *out_x = panel_x + PANEL_W - CLOSE_BTN_PX - 8.0f;
    *out_y = panel_y + 10.0f;
    *out_s = CLOSE_BTN_PX;
}

static void row_rect(float panel_x, float panel_y, int row,
                       float* out_x, float* out_y,
                       float* out_w, float* out_h) {
    *out_x = panel_x + 10.0f;
    *out_y = panel_y + TITLE_H + (float)row * ROW_H + ROW_PAD * 0.5f;
    *out_w = PANEL_W - 20.0f;
    *out_h = ROW_H - ROW_PAD;
}

/* Translate a mouse click at (px, py) into a menu action. Returns
 * true when the click landed on the panel - the caller should treat
 * the event as consumed so it doesn't fall through to the game's
 * look-look camera grab. */
static bool handle_click(float px, float py) {
    if (!M.open) return false;
    float panel_x, panel_y, panel_w, panel_h;
    compute_layout(&panel_x, &panel_y, &panel_w, &panel_h);
    /* Close-button: red X in the top-right corner. */
    float cx, cy, cs;
    close_btn_rect(panel_x, panel_y, &cx, &cy, &cs);
    if (hit_rect(cx, cy, cs, cs, px, py)) {
        M.open = false;
        return true;
    }
    /* Body rows. */
    for (int row = 0; row < VISIBLE_ROWS; ++row) {
        int idx = M.scroll + row;
        if (idx >= BODY_COUNT) break;
        float rx, ry, rw, rh;
        row_rect(panel_x, panel_y, row, &rx, &ry, &rw, &rh);
        if (hit_rect(rx, ry, rw, rh, px, py)) {
            M.selected = idx;
            action_ok();
            return true;
        }
    }
    /* Click landed inside the panel rect but not on a button - still
     * consume so the game doesn't capture pointer-look on the same
     * click that the player is using to interact with the menu. */
    if (hit_rect(panel_x, panel_y, panel_w, panel_h, px, py)) return true;
    return false;
}

bool teleport_menu_event(const sapp_event* e, player_ctrl_t* player) {
    M.player = player;

    /* Track mouse / touch position whenever the menu is open so the
     * draw pass can highlight the hovered row. */
    if (M.open) {
        if (e->type == SAPP_EVENTTYPE_MOUSE_MOVE) {
            M.mouse_x = e->mouse_x;
            M.mouse_y = e->mouse_y;
        } else if (e->type == SAPP_EVENTTYPE_TOUCHES_BEGAN
                || e->type == SAPP_EVENTTYPE_TOUCHES_MOVED) {
            if (e->num_touches > 0) {
                M.mouse_x = e->touches[0].pos_x;
                M.mouse_y = e->touches[0].pos_y;
            }
        }
        /* Mouse / touch click -> hit-test against panel buttons. */
        if (e->type == SAPP_EVENTTYPE_MOUSE_DOWN
            && e->mouse_button == SAPP_MOUSEBUTTON_LEFT) {
            return handle_click(e->mouse_x, e->mouse_y);
        }
        if (e->type == SAPP_EVENTTYPE_TOUCHES_BEGAN && e->num_touches > 0) {
            /* Pass the first touch through hit-test. The mobile nav
             * buttons are still handled by input.c -> poll_touches
             * separately; the new row clicks fall through to here. */
            float tx = e->touches[0].pos_x;
            float ty = e->touches[0].pos_y;
            if (handle_click(tx, ty)) return true;
        }
    }

    if (e->type != SAPP_EVENTTYPE_KEY_DOWN) return false;
    switch (e->key_code) {
        case SAPP_KEYCODE_T:
        case SAPP_KEYCODE_M:
            M.open = !M.open;
            return true;
        case SAPP_KEYCODE_ESCAPE:
            if (M.open) { M.open = false; return true; }
            return false;
        case SAPP_KEYCODE_UP:         if (!M.open) return false; action_up();   return true;
        case SAPP_KEYCODE_DOWN:       if (!M.open) return false; action_down(); return true;
        case SAPP_KEYCODE_PAGE_UP:    if (!M.open) return false; for (int i = 0; i < VISIBLE_ROWS; ++i) action_up();   return true;
        case SAPP_KEYCODE_PAGE_DOWN:  if (!M.open) return false; for (int i = 0; i < VISIBLE_ROWS; ++i) action_down(); return true;
        case SAPP_KEYCODE_ENTER:
        case SAPP_KEYCODE_SPACE:      if (!M.open) return false; action_ok();   return true;
        default: return false;
    }
}

void teleport_menu_poll_touches(void) {
    /* TP button in the main HUD always toggles the menu. */
    if (input_consume_tp_tap())   M.open = !M.open;
    /* Menu-nav buttons only get registered when menu is open, so their
     * consume-taps are no-ops otherwise. */
    if (input_consume_menu_up())    action_up();
    if (input_consume_menu_down())  action_down();
    if (input_consume_menu_ok())    action_ok();
    if (input_consume_menu_close()) action_close();
}

/* ----------------------------------------------------------------------- */

/* Register the 4 nav-button hit rects with input.c when the menu is
 * open. Positions sit above the mobile HUD stack on the right side so
 * they don't collide with the main jump/break/place/tp buttons. */
#define MENU_BTN_R   28.0f
#define MENU_BTN_GAP 10.0f

static void register_nav_buttons(void) {
    input_state_t* in = input_state_mut();
    if (!M.open) {
        /* Clear so they're ignored in classify_touch. */
        in->btn_menu_up_r = in->btn_menu_down_r = 0.0f;
        in->btn_menu_ok_r = in->btn_menu_close_r = 0.0f;
        return;
    }
    const float w = sapp_widthf();
    (void)w;
    /* Four buttons in a vertical row on the left side of the menu
     * (mobile-safe; avoids the right-side movement stick + HUD
     * buttons). Center them vertically in the screen. */
    const float cx = 40.0f + MENU_BTN_R;
    const float cy0 = sapp_heightf() * 0.5f - (1.5f * (MENU_BTN_R * 2.0f + MENU_BTN_GAP));
    float cy = cy0;
    in->btn_menu_close_cx = cx; in->btn_menu_close_cy = cy; in->btn_menu_close_r = MENU_BTN_R;
    cy += MENU_BTN_R * 2.0f + MENU_BTN_GAP;
    in->btn_menu_up_cx = cx; in->btn_menu_up_cy = cy; in->btn_menu_up_r = MENU_BTN_R;
    cy += MENU_BTN_R * 2.0f + MENU_BTN_GAP;
    in->btn_menu_down_cx = cx; in->btn_menu_down_cy = cy; in->btn_menu_down_r = MENU_BTN_R;
    cy += MENU_BTN_R * 2.0f + MENU_BTN_GAP;
    in->btn_menu_ok_cx = cx; in->btn_menu_ok_cy = cy; in->btn_menu_ok_r = MENU_BTN_R;
}

void teleport_menu_draw_mobile_buttons(void) {
    if (!M.open) return;
    const input_state_t* in = input_state();
    mobile_ui_draw_button(in->btn_menu_close_cx, in->btn_menu_close_cy, MENU_BTN_R,
                          0.50f, 0.15f, 0.15f, 0.55f, 1.00f, 0.55f, 0.55f, 0.80f, 'X');
    mobile_ui_draw_button(in->btn_menu_up_cx,    in->btn_menu_up_cy,    MENU_BTN_R,
                          0.20f, 0.25f, 0.40f, 0.55f, 0.70f, 0.85f, 1.00f, 0.80f, '^');
    mobile_ui_draw_button(in->btn_menu_down_cx,  in->btn_menu_down_cy,  MENU_BTN_R,
                          0.20f, 0.25f, 0.40f, 0.55f, 0.70f, 0.85f, 1.00f, 0.80f, 'v');
    mobile_ui_draw_button(in->btn_menu_ok_cx,    in->btn_menu_ok_cy,    MENU_BTN_R,
                          0.15f, 0.45f, 0.20f, 0.55f, 0.65f, 1.00f, 0.70f, 0.80f, 'O');
}

/* ----------------------------------------------------------------------- */

/* Helper - left-aligned sdtx_printf at a pixel position. Same trick
 * draw_text_centered in menu.c uses: rescale the sdtx canvas so the
 * 8x8 glyph cell matches the requested scale, then set the origin
 * in cell units. font 1 (c64) keeps the baseline clean at 2-3x scale. */
static void draw_text_at(float x, float y, float scale,
                           uint8_t r, uint8_t g, uint8_t b,
                           const char* fmt, ...) {
    char buf[160];
    va_list ap;
    va_start(ap, fmt);
    vsnprintf(buf, sizeof buf, fmt, ap);
    va_end(ap);
    float cell_px = 8.0f * scale;
    sdtx_canvas(sapp_widthf() / scale, sapp_heightf() / scale);
    sdtx_font(1);
    sdtx_origin(x / cell_px, y / cell_px);
    sdtx_color3b(r, g, b);
    sdtx_home();
    sdtx_printf("%s", buf);
    sdtx_font(0);
}

void teleport_menu_draw(void) {
    register_nav_buttons();

    if (!M.open) {
        /* Hint line in the F2 debug HUD - clicking is for mouse users,
         * T / M is for keyboard, the mobile right-side T button is
         * managed by mobile_ui. */
        sdtx_color3b(0xa0, 0xa0, 0xc0);
        sdtx_printf("[T] teleport\n");
        return;
    }

    /* Set up the same alpha-blended 2D pipeline mobile_ui and the
     * pause overlay use, in screen-pixel ortho coords (origin top
     * left). All geometry goes into sokol_gl; main_web's end-of-frame
     * sgl_draw flushes it. */
    const float w = sapp_widthf();
    const float h = sapp_heightf();
    sgl_defaults();
    sgl_matrix_mode_projection();
    sgl_load_identity();
    sgl_ortho(0.0f, w, h, 0.0f, -1.0f, 1.0f);
    sgl_matrix_mode_modelview();
    sgl_load_identity();
    sgl_pipeline pip = mobile_ui_alpha_pipeline();
    if (pip.id == 0) {
        /* mobile_ui_draw hasn't run yet this frame (rare - normally
         * runs before us). Fall back to the legacy ASCII overlay so
         * the menu still appears even if the shared pipeline isn't
         * ready. */
        sdtx_color3b(0xff, 0xff, 0xff);
        sdtx_printf("[teleport] (drawing pipeline not ready yet)\n");
        return;
    }
    sgl_load_pipeline(pip);

    /* Compute + cache the layout so the click handler can hit-test
     * against the same rects we draw. */
    float panel_x, panel_y, panel_w, panel_h;
    compute_layout(&panel_x, &panel_y, &panel_w, &panel_h);
    M.panel_x = panel_x; M.panel_y = panel_y;
    M.panel_w = panel_w; M.panel_h = panel_h;
    M.layout_valid = true;

    /* Backdrop + panel + border. Same colour palette as menu_pause_draw
     * so the two overlays read as part of the same UI family. */
    mobile_ui_draw_rect(0.0f, 0.0f, w, h, 0.02f, 0.03f, 0.07f, 0.55f);
    mobile_ui_draw_rect(panel_x, panel_y, panel_w, panel_h,
                         0.10f, 0.12f, 0.18f, 0.96f);
    mobile_ui_draw_rect_outline(panel_x, panel_y, panel_w, panel_h,
                                  2.0f, 0.85f, 0.90f, 1.00f, 1.0f);

    /* Title bar separator (darker strip at the bottom of the title). */
    mobile_ui_draw_rect(panel_x, panel_y + TITLE_H - 2.0f, panel_w, 2.0f,
                         0.85f, 0.90f, 1.00f, 0.50f);

    /* Close button (red X) in the top-right of the panel. */
    float cx, cy, cs;
    close_btn_rect(panel_x, panel_y, &cx, &cy, &cs);
    bool close_hovered = hit_rect(cx, cy, cs, cs, M.mouse_x, M.mouse_y);
    mobile_ui_draw_rect(cx, cy, cs, cs,
                         close_hovered ? 0.70f : 0.50f, 0.15f, 0.15f, 0.95f);
    mobile_ui_draw_rect_outline(cx, cy, cs, cs, 1.5f, 1.00f, 0.55f, 0.55f, 0.95f);

    /* Body rows. */
    for (int row = 0; row < VISIBLE_ROWS; ++row) {
        int idx = M.scroll + row;
        if (idx >= BODY_COUNT) break;
        float rx, ry, rw, rh;
        row_rect(panel_x, panel_y, row, &rx, &ry, &rw, &rh);
        bool selected = (idx == M.selected);
        bool hovered  = hit_rect(rx, ry, rw, rh, M.mouse_x, M.mouse_y);
        if (selected) {
            mobile_ui_draw_rect(rx, ry, rw, rh, 0.34f, 0.42f, 0.58f, 0.95f);
        } else if (hovered) {
            mobile_ui_draw_rect(rx, ry, rw, rh, 0.22f, 0.30f, 0.42f, 0.95f);
        } else {
            mobile_ui_draw_rect(rx, ry, rw, rh, 0.14f, 0.16f, 0.22f, 0.85f);
        }
        if (selected) {
            mobile_ui_draw_rect_outline(rx, ry, rw, rh, 1.5f,
                                          0.95f, 0.85f, 0.45f, 0.95f);
        }
    }

    /* Text layer on top of the geometry. */
    draw_text_at(panel_x + 16.0f, panel_y + 12.0f, 3.0f,
                 0xff, 0xff, 0xff, "TELEPORT");
    draw_text_at(panel_x + 16.0f, panel_y + TITLE_H - 18.0f, 1.5f,
                 0xa0, 0xa8, 0xc0,
                 "click a row to go - arrows + enter also work");

    /* X glyph inside the close button. Centered in the 28 px square. */
    draw_text_at(cx + 8.0f, cy + 6.0f, 2.0f, 0xff, 0xff, 0xff, "X");

    for (int row = 0; row < VISIBLE_ROWS; ++row) {
        int idx = M.scroll + row;
        if (idx >= BODY_COUNT) break;
        const body_config_t* b = planet_get((body_id_t)idx);
        if (!b) continue;
        const char* tag = b->is_asteroid ? "ast"
                        : b->icy          ? "ice"
                        : b->barren       ? "rck"
                        : "pla";
        float rx, ry, rw, rh;
        row_rect(panel_x, panel_y, row, &rx, &ry, &rw, &rh);
        (void)rw; (void)rh;
        uint8_t tr = 0xc0, tg = 0xc8, tb = 0xd8;
        if (idx == M.selected) { tr = 0xff; tg = 0xe0; tb = 0x80; }
        draw_text_at(rx + 8.0f, ry + 6.0f, 1.75f, tr, tg, tb,
                     "%-18s %s r=%5.0fm", b->name, tag, b->radius_m);
    }

    /* Nav-button SGL commands are still issued by mobile_ui_draw so
     * they share the same orthographic projection + alpha pipeline
     * state. They remain useful on touchscreens that don't deliver
     * fine-grained mouse events. */
}
