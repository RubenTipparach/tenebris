#include "client/teleport_menu.h"
#include "client/input.h"
#include "client/mobile_ui.h"
#include "sokol_gfx.h"
#include "sokol_debugtext.h"
#include "sokol_app.h"
#include "core/planet.h"
#include <string.h>

/* ----------------------------------------------------------------------- */

#define VISIBLE_ROWS 12

static struct {
    bool open;
    int  selected;       /* index into BODY_COUNT */
    int  scroll;         /* first visible row     */
    player_ctrl_t* player;
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
            /* player_teleport_to drops the player 15 m above the
             * target body's surface — well inside that body's
             * sphere of influence (SOI radius is body.radius_m *
             * lod.soi_radius_mult, default 6). The per-frame SOI
             * tracker in main_web.c picks the body up on the very
             * next update tick, so by the time the player sees
             * their post-teleport frame the gravity anchor /
             * camera up / atmosphere shell are already aligned
             * with the destination body. */
            player_teleport_to(M.player, b);
        }
    }
    M.open = false;
}
static void action_close(void) { M.open = false; }

/* ----------------------------------------------------------------------- */

bool teleport_menu_event(const sapp_event* e, player_ctrl_t* player) {
    M.player = player;
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

void teleport_menu_draw(void) {
    register_nav_buttons();

    if (!M.open) {
        sdtx_color3b(0xa0, 0xa0, 0xc0);
        sdtx_printf("[T] teleport\n");
        return;
    }

    /* List overlay — same content as before, slightly narrower so it
     * doesn't overlap the nav-button column on small mobile screens. */
    sdtx_color3b(0xff, 0xff, 0xff);
    sdtx_printf("\n");
    sdtx_printf("     +------------------ TELEPORT ------------------+\n");
    sdtx_printf("     | arrows select  enter go  esc close           |\n");
    sdtx_printf("     +----------------------------------------------+\n");

    for (int row = 0; row < VISIBLE_ROWS; ++row) {
        int idx = M.scroll + row;
        if (idx >= BODY_COUNT) {
            sdtx_printf("     |                                              |\n");
            continue;
        }
        const body_config_t* b = planet_get((body_id_t)idx);
        if (!b) continue;

        const char* tag = b->is_asteroid ? "ast"
                        : b->icy          ? "ice"
                        : b->barren       ? "rck"
                        : "pla";

        if (idx == M.selected) sdtx_color3b(0xff, 0xe0, 0x50);
        else                    sdtx_color3b(0xc0, 0xc0, 0xd0);

        sdtx_printf("     | %c %-18s %s r=%5.0fm         |\n",
                    (idx == M.selected ? '>' : ' '),
                    b->name, tag, b->radius_m);
    }
    sdtx_color3b(0xff, 0xff, 0xff);
    sdtx_printf("     +----------------------------------------------+\n");

    /* Nav-button SGL commands are issued by mobile_ui_draw so they
     * share the same orthographic projection + alpha pipeline state. */
}
