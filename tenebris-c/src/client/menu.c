#include "client/menu.h"
#include "client/net_client.h"
#include "client/persistence.h"
#include "client/profile.h"

#include "sokol_gfx.h"
#include "sokol_app.h"
#include "sokol_gl.h"
#include "sokol_log.h"
#include "sokol_time.h"
#include "sokol_debugtext.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>

/* Prompt for a new SP world name. JS just trims and forwards the
 * raw string; C-side strips storage-format characters (newline,
 * carriage return, colon) — keeping any regex out of the EM_JS body
 * so the C preprocessor doesn't choke on the backslash escapes,
 * which sit outside any string literal here. */
/* Generate a 6-char room code from a safe alphabet (no ambiguous
 * 0/O, 1/I). 32^6 = ~1 billion combinations, plenty for v1's small
 * concurrent-room count. */
EM_JS(char*, menu_js_new_room_code, (void), {
    var A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    var b = new Uint8Array(6);
    crypto.getRandomValues(b);
    var code = '';
    for (var i = 0; i < 6; ++i) code += A[b[i] & 31];
    var len = lengthBytesUTF8(code) + 1;
    var p = _malloc(len);
    stringToUTF8(code, p, len);
    return p;
});

/* Prompt for a profile name. Same shape as the world-name prompt —
 * trims, length-clamps, lets C strip control chars. */
EM_JS(char*, menu_js_prompt_profile_name, (void), {
    var raw = window.prompt('Pick a name:', '');
    if (!raw) return 0;
    var n = raw.trim();
    if (!n) return 0;
    if (n.length > 31) n = n.substring(0, 31);
    var len = lengthBytesUTF8(n) + 1;
    var p = _malloc(len);
    stringToUTF8(n, p, len);
    return p;
});

EM_JS(char*, menu_js_prompt_world_name, (void), {
    var raw = window.prompt('Name your world:', 'world-' + Date.now().toString().slice(-4));
    if (!raw) return 0;
    var n = raw.trim();
    if (!n) return 0;
    if (n.length > 31) n = n.substring(0, 31);
    var len = lengthBytesUTF8(n) + 1;
    var p = _malloc(len);
    stringToUTF8(n, p, len);
    return p;
});
#else
static char* menu_js_prompt_world_name(void)   { return NULL; }
static char* menu_js_prompt_profile_name(void) { return NULL; }
static char* menu_js_new_room_code(void)       {
    static char fake[7] = "AAAAAA";
    char* out = (char*)malloc(7);
    if (out) memcpy(out, fake, 7);
    return out;
}
#endif

/* ------------------------------------------------------------------ */
/* State                                                                */
/* ------------------------------------------------------------------ */

typedef struct {
    float x, y, w, h;
    const char* label;
    int  hover;
    int  visible;
} menu_button_t;

#define MAIN_BTN_W   240.0f
#define MAIN_BTN_H    56.0f
#define MAIN_BTN_GAP  16.0f

#define LIST_BTN_W   360.0f
#define LIST_BTN_H    36.0f
#define LIST_BTN_GAP   8.0f

static struct {
    game_state_t state;
    /* Main-menu buttons. */
    menu_button_t btn_sp;
    menu_button_t btn_mp;
    /* Top-right indicator on the main menu — shows the active profile
     * name; clicking it dumps you back to the profile picker. */
    menu_button_t btn_active_profile;
    /* SP world-list buttons. */
    menu_button_t btn_new_world;
    menu_button_t btn_back;
    menu_button_t btn_world[PERSISTENCE_MAX_WORLDS];
    /* Profile-picker buttons. */
    menu_button_t btn_new_profile;
    menu_button_t btn_profile[PROFILE_MAX];
    /* MP submenu buttons. */
    menu_button_t btn_self_host;
    menu_button_t btn_join;
    menu_button_t btn_cloud_host;

    /* In-game text input. Active when state == GAME_MP_JOIN_INPUT
     * (and any future text-input flows we route through it). */
    char input_buf[32];
    int  input_len;
    double input_cursor_blink_start;

    float mouse_x, mouse_y;

    /* Resume pose handed off to main_web on entering IN_GAME_SP. */
    bool               pending_sp_resume;
    persistence_save_t resume;

    /* Cached world directory. Refreshed on entering SP world list. */
    char worlds[PERSISTENCE_MAX_WORLDS][PERSISTENCE_NAME_MAX + 1];
    int  world_count;

    /* Cached profile directory. Refreshed on entering profile-select. */
    profile_t profiles[PROFILE_MAX];
    int       profile_count;

    /* Name the SP autosave loop writes back to. Empty in MP / menu. */
    char active_world[PERSISTENCE_NAME_MAX + 1];

    /* Room code for the active MP session. Empty = public room. */
    char room_code[9];
} M;

/* ------------------------------------------------------------------ */
/* Hit test + layout                                                    */
/* ------------------------------------------------------------------ */

static bool hit(const menu_button_t* b, float x, float y) {
    if (!b->visible) return false;
    return x >= b->x && x <= b->x + b->w && y >= b->y && y <= b->y + b->h;
}

static void set_button(menu_button_t* b, float x, float y, float w, float h,
                         const char* label) {
    b->x = x; b->y = y; b->w = w; b->h = h;
    b->label = label;
    b->visible = 1;
    b->hover = (M.mouse_x >= x && M.mouse_x <= x + w &&
                M.mouse_y >= y && M.mouse_y <= y + h);
}

static void hide_button(menu_button_t* b) {
    b->visible = 0;
    b->hover   = 0;
}

static void layout_main(float w, float h) {
    float cx = w * 0.5f;
    float cy = h * 0.5f;
    set_button(&M.btn_sp,
                 cx - MAIN_BTN_W * 0.5f,
                 cy - MAIN_BTN_H - MAIN_BTN_GAP * 0.5f,
                 MAIN_BTN_W, MAIN_BTN_H, "SINGLE PLAYER");
    set_button(&M.btn_mp,
                 cx - MAIN_BTN_W * 0.5f,
                 cy + MAIN_BTN_GAP * 0.5f,
                 MAIN_BTN_W, MAIN_BTN_H, "MULTIPLAYER");
    /* Active-profile chip top-right. The label gets filled with
     * "as <name>" in menu_draw so the layout doesn't need to read
     * profile state. */
    profile_t active;
    if (profile_get_active(&active)) {
        const float chip_w = 200.0f;
        const float chip_h = 32.0f;
        set_button(&M.btn_active_profile,
                     w - chip_w - 16.0f, 16.0f,
                     chip_w, chip_h, active.name);
    } else {
        hide_button(&M.btn_active_profile);
    }
    /* Hide every button that belongs to other screens — these were
     * positioned by layout_profile_select / layout_world_list and
     * would otherwise draw on top of the main menu. */
    hide_button(&M.btn_new_world);
    hide_button(&M.btn_back);
    for (int i = 0; i < PERSISTENCE_MAX_WORLDS; ++i) hide_button(&M.btn_world[i]);
    hide_button(&M.btn_new_profile);
    for (int i = 0; i < PROFILE_MAX; ++i) hide_button(&M.btn_profile[i]);
    hide_button(&M.btn_self_host);
    hide_button(&M.btn_join);
    hide_button(&M.btn_cloud_host);
}

static void layout_mp_submenu(float w, float h) {
    float cx = w * 0.5f;
    /* Three stacked buttons: SELF HOST / JOIN / CLOUD HOSTED. */
    float total_h = 3.0f * MAIN_BTN_H + 2.0f * MAIN_BTN_GAP;
    float y0 = (h - total_h) * 0.5f;
    set_button(&M.btn_self_host,
                 cx - MAIN_BTN_W * 0.5f, y0,
                 MAIN_BTN_W, MAIN_BTN_H, "SELF HOST");
    set_button(&M.btn_join,
                 cx - MAIN_BTN_W * 0.5f,
                 y0 + MAIN_BTN_H + MAIN_BTN_GAP,
                 MAIN_BTN_W, MAIN_BTN_H, "JOIN");
    set_button(&M.btn_cloud_host,
                 cx - MAIN_BTN_W * 0.5f,
                 y0 + 2.0f * (MAIN_BTN_H + MAIN_BTN_GAP),
                 MAIN_BTN_W, MAIN_BTN_H, "CLOUD HOSTED");
    set_button(&M.btn_back,
                 cx - 120.0f, h * 0.5f + 220.0f, 240.0f, LIST_BTN_H, "BACK");
    hide_button(&M.btn_sp);
    hide_button(&M.btn_mp);
    hide_button(&M.btn_active_profile);
    hide_button(&M.btn_new_world);
    for (int i = 0; i < PERSISTENCE_MAX_WORLDS; ++i) hide_button(&M.btn_world[i]);
    hide_button(&M.btn_new_profile);
    for (int i = 0; i < PROFILE_MAX; ++i) hide_button(&M.btn_profile[i]);
}

static void layout_join_input(float w, float h) {
    /* Just a BACK button — the input itself isn't a button, it's a
     * drawn box with a typed buffer rendered in menu_draw. */
    set_button(&M.btn_back,
                 w * 0.5f - 120.0f, h * 0.5f + 220.0f, 240.0f, LIST_BTN_H, "BACK");
    hide_button(&M.btn_sp);
    hide_button(&M.btn_mp);
    hide_button(&M.btn_self_host);
    hide_button(&M.btn_join);
    hide_button(&M.btn_join);
    hide_button(&M.btn_cloud_host);
    hide_button(&M.btn_active_profile);
    hide_button(&M.btn_new_world);
    for (int i = 0; i < PERSISTENCE_MAX_WORLDS; ++i) hide_button(&M.btn_world[i]);
    hide_button(&M.btn_new_profile);
    for (int i = 0; i < PROFILE_MAX; ++i) hide_button(&M.btn_profile[i]);
}

static void layout_world_list(float w, float h) {
    float cx = w * 0.5f;
    /* Visible vertical space starts ~ h/2 - 140 (just below "SELECT WORLD"
     * heading) and ends ~ h/2 + 220 (above the BACK button). */
    float y0 = h * 0.5f - 120.0f;

    set_button(&M.btn_new_world,
                 cx - LIST_BTN_W * 0.5f, y0,
                 LIST_BTN_W, LIST_BTN_H, "+ NEW WORLD");

    float y = y0 + LIST_BTN_H + LIST_BTN_GAP * 2.0f;
    int max_visible_rows = (int)((h * 0.4f) / (LIST_BTN_H + LIST_BTN_GAP));
    if (max_visible_rows > PERSISTENCE_MAX_WORLDS)
        max_visible_rows = PERSISTENCE_MAX_WORLDS;

    for (int i = 0; i < PERSISTENCE_MAX_WORLDS; ++i) {
        if (i < M.world_count && i < max_visible_rows) {
            set_button(&M.btn_world[i],
                         cx - LIST_BTN_W * 0.5f, y,
                         LIST_BTN_W, LIST_BTN_H, M.worlds[i]);
            y += LIST_BTN_H + LIST_BTN_GAP;
        } else {
            hide_button(&M.btn_world[i]);
        }
    }

    set_button(&M.btn_back,
                 cx - 120.0f, h * 0.5f + 220.0f, 240.0f, LIST_BTN_H, "BACK");
    hide_button(&M.btn_sp);
    hide_button(&M.btn_mp);
    hide_button(&M.btn_active_profile);
    hide_button(&M.btn_new_profile);
    for (int i = 0; i < PROFILE_MAX; ++i) hide_button(&M.btn_profile[i]);
    hide_button(&M.btn_self_host);
    hide_button(&M.btn_join);
    hide_button(&M.btn_cloud_host);
}

static void layout_profile_select(float w, float h) {
    float cx = w * 0.5f;
    float y0 = h * 0.5f - 120.0f;

    set_button(&M.btn_new_profile,
                 cx - LIST_BTN_W * 0.5f, y0,
                 LIST_BTN_W, LIST_BTN_H, "+ NEW PROFILE");

    float y = y0 + LIST_BTN_H + LIST_BTN_GAP * 2.0f;
    int max_rows = (int)((h * 0.4f) / (LIST_BTN_H + LIST_BTN_GAP));
    if (max_rows > PROFILE_MAX) max_rows = PROFILE_MAX;
    for (int i = 0; i < PROFILE_MAX; ++i) {
        if (i < M.profile_count && i < max_rows) {
            set_button(&M.btn_profile[i],
                         cx - LIST_BTN_W * 0.5f, y,
                         LIST_BTN_W, LIST_BTN_H, M.profiles[i].name);
            y += LIST_BTN_H + LIST_BTN_GAP;
        } else {
            hide_button(&M.btn_profile[i]);
        }
    }
    /* No "back" — this is the first screen, nothing to go back to. */
    hide_button(&M.btn_back);
    hide_button(&M.btn_sp);
    hide_button(&M.btn_mp);
    hide_button(&M.btn_active_profile);
    hide_button(&M.btn_new_world);
    for (int i = 0; i < PERSISTENCE_MAX_WORLDS; ++i) hide_button(&M.btn_world[i]);
    hide_button(&M.btn_self_host);
    hide_button(&M.btn_join);
    hide_button(&M.btn_cloud_host);
}

static void layout(float w, float h) {
    switch (M.state) {
        case GAME_PROFILE_SELECT:
            layout_profile_select(w, h); break;
        case GAME_MAIN_MENU:
        case GAME_MP_URL_PROMPT:
            layout_main(w, h); break;
        case GAME_SP_WORLD_LIST:
            layout_world_list(w, h); break;
        case GAME_MP_SUBMENU:
            layout_mp_submenu(w, h); break;
        case GAME_MP_JOIN_INPUT:
            layout_join_input(w, h); break;
        default:
            break;
    }
}

/* ------------------------------------------------------------------ */
/* Drawing                                                              */
/* ------------------------------------------------------------------ */

static void quad(float x, float y, float w, float h,
                  float r, float g, float b, float a) {
    sgl_begin_quads();
    sgl_c4f(r, g, b, a);
    sgl_v2f(x,       y);
    sgl_v2f(x + w,   y);
    sgl_v2f(x + w,   y + h);
    sgl_v2f(x,       y + h);
    sgl_end();
}

static void border(float x, float y, float w, float h, float thick,
                    float r, float g, float b, float a) {
    quad(x,           y,           w,     thick, r, g, b, a);
    quad(x,           y + h-thick, w,     thick, r, g, b, a);
    quad(x,           y,           thick, h,     r, g, b, a);
    quad(x + w-thick, y,           thick, h,     r, g, b, a);
}

/* sokol_debugtext renders 8x8 char cells. Shrink the canvas by `scale`
 * so each cell becomes `8 * scale` screen pixels; place origin in
 * canvas char cells (one cell = 8 canvas units regardless of scale).
 * The menu uses font slot 1 (c64) — its baseline is clean, where
 * Oric's bottom row reads as an underline at 5x scale. */
static void draw_text_centered(const char* str, float center_x,
                                 float screen_y, float scale,
                                 uint8_t r, uint8_t g, uint8_t b) {
    int n = (int)strlen(str);
    float cell_px = 8.0f * scale;
    float text_w  = cell_px * (float)n;
    float text_x  = center_x - text_w * 0.5f;
    sdtx_canvas(sapp_widthf() / scale, sapp_heightf() / scale);
    sdtx_font(1);
    sdtx_origin(text_x / cell_px, screen_y / cell_px);
    sdtx_color3b(r, g, b);
    sdtx_home();
    sdtx_printf("%s", str);
    sdtx_font(0);     /* restore HUD font for any non-menu printers */
}

static void draw_text_left(const char* str, float screen_x,
                             float screen_y, float scale,
                             uint8_t r, uint8_t g, uint8_t b) {
    float cell_px = 8.0f * scale;
    sdtx_canvas(sapp_widthf() / scale, sapp_heightf() / scale);
    sdtx_font(1);
    sdtx_origin(screen_x / cell_px, screen_y / cell_px);
    sdtx_color3b(r, g, b);
    sdtx_home();
    sdtx_printf("%s", str);
    sdtx_font(0);
}

static void draw_button(const menu_button_t* b) {
    if (!b->visible) return;
    if (b->hover) quad(b->x, b->y, b->w, b->h, 0.22f, 0.30f, 0.42f, 0.95f);
    else          quad(b->x, b->y, b->w, b->h, 0.12f, 0.14f, 0.19f, 0.90f);
    border(b->x, b->y, b->w, b->h, 2.0f, 0.85f, 0.90f, 1.0f, 1.0f);
}

void menu_draw(int screen_w, int screen_h) {
    if (!menu_is_overlay()) return;

    float w = (float)screen_w;
    float h = (float)screen_h;
    layout(w, h);

    sgl_defaults();
    sgl_matrix_mode_projection();
    sgl_load_identity();
    sgl_ortho(0.0f, w, h, 0.0f, -1.0f, 1.0f);
    sgl_matrix_mode_modelview();
    sgl_load_identity();

    static sgl_pipeline pip = (sgl_pipeline){0};
    if (pip.id == 0) {
        pip = sgl_make_pipeline(&(sg_pipeline_desc){
            .colors[0].blend = {
                .enabled = true,
                .src_factor_rgb = SG_BLENDFACTOR_SRC_ALPHA,
                .dst_factor_rgb = SG_BLENDFACTOR_ONE_MINUS_SRC_ALPHA,
                .src_factor_alpha = SG_BLENDFACTOR_ONE,
                .dst_factor_alpha = SG_BLENDFACTOR_ONE,
            },
        });
    }
    sgl_load_pipeline(pip);

    /* Backdrop covers the entire screen, dim. */
    quad(0, 0, w, h, 0.03f, 0.05f, 0.10f, 0.85f);

    /* Geometry */
    draw_button(&M.btn_sp);
    draw_button(&M.btn_mp);
    draw_button(&M.btn_self_host);
    draw_button(&M.btn_join);
    draw_button(&M.btn_cloud_host);
    draw_button(&M.btn_active_profile);
    draw_button(&M.btn_new_profile);
    for (int i = 0; i < PROFILE_MAX; ++i) draw_button(&M.btn_profile[i]);
    draw_button(&M.btn_new_world);
    for (int i = 0; i < PERSISTENCE_MAX_WORLDS; ++i) draw_button(&M.btn_world[i]);
    draw_button(&M.btn_back);

    if (M.state == GAME_MP_URL_PROMPT) {
        quad(w * 0.5f - 200.0f, h * 0.5f + 160.0f, 400.0f, 40.0f,
             0.20f, 0.20f, 0.22f, 0.90f);
    }

    /* In-game text-input box for JOIN flow. Real drawn rect, blinking
     * cursor, all driven by SAPP CHAR / KEY_DOWN events. No browser
     * prompt — per CLAUDE.md the canvas owns every input panel. */
    if (M.state == GAME_MP_JOIN_INPUT) {
        const float box_w = 320.0f;
        const float box_h = 48.0f;
        const float bx = w * 0.5f - box_w * 0.5f;
        const float by = h * 0.5f - 24.0f;
        /* Backdrop */
        quad(bx, by, box_w, box_h, 0.12f, 0.14f, 0.19f, 0.95f);
        /* Border */
        border(bx, by, box_w, box_h, 2.0f, 0.85f, 0.90f, 1.0f, 1.0f);
        /* Cursor — blink at 2 Hz. Caret position = end of buffer. */
        double t_since = stm_sec(stm_now()) - M.input_cursor_blink_start;
        bool blink_on = (((int)(t_since * 2.0)) & 1) == 0;
        if (blink_on) {
            const float cell = 8.0f * 3.0f;             /* must match text scale below */
            const float text_w = cell * (float)M.input_len;
            const float text_x = w * 0.5f - text_w * 0.5f;
            const float caret_x = text_x + text_w + 2.0f;
            const float caret_y = by + 8.0f;
            quad(caret_x, caret_y, 3.0f, box_h - 16.0f,
                 1.0f, 0.95f, 0.30f, 1.0f);
        }
    }

    sgl_draw();

    /* Text. */
    float cx = w * 0.5f;

    switch (M.state) {
        case GAME_PROFILE_SELECT:
            draw_text_centered("WHO ARE YOU?", cx, h * 0.5f - 200.0f, 3.0f,
                                 0xff, 0xff, 0xff);
            if (M.profile_count == 0) {
                draw_text_centered("no profiles yet  -  click + new profile",
                                     cx, h * 0.5f + 40.0f, 1.5f,
                                     0xa0, 0xb0, 0xc8);
            }
            break;
        case GAME_MAIN_MENU:
        case GAME_MP_URL_PROMPT:
            draw_text_centered("TENEBRIS", cx, h * 0.5f - 220.0f, 5.0f,
                                 0xff, 0xff, 0xff);
            draw_text_centered("select a mode", cx, h * 0.5f - 160.0f, 2.0f,
                                 0xa0, 0xb0, 0xc8);
            break;
        case GAME_SP_WORLD_LIST:
            draw_text_centered("SELECT WORLD", cx, h * 0.5f - 200.0f, 3.0f,
                                 0xff, 0xff, 0xff);
            if (M.world_count == 0) {
                draw_text_centered("no saves yet  -  click + new world",
                                     cx, h * 0.5f + 40.0f, 1.5f,
                                     0xa0, 0xb0, 0xc8);
            }
            break;
        case GAME_MP_SUBMENU:
            draw_text_centered("MULTIPLAYER", cx, h * 0.5f - 200.0f, 3.0f,
                                 0xff, 0xff, 0xff);
            draw_text_centered("self host = new room you control",
                                 cx, h * 0.5f + 180.0f, 1.0f,
                                 0xa0, 0xb0, 0xc8);
            draw_text_centered("join = enter a friend's 6-char code",
                                 cx, h * 0.5f + 196.0f, 1.0f,
                                 0xa0, 0xb0, 0xc8);
            draw_text_centered("cloud hosted = join the public world",
                                 cx, h * 0.5f + 212.0f, 1.0f,
                                 0xa0, 0xb0, 0xc8);
            break;
        case GAME_MP_JOIN_INPUT:
            draw_text_centered("JOIN ROOM", cx, h * 0.5f - 200.0f, 3.0f,
                                 0xff, 0xff, 0xff);
            draw_text_centered("type the 6-char code  -  Enter to join  -  Esc to cancel",
                                 cx, h * 0.5f + 60.0f, 1.0f,
                                 0xa0, 0xb0, 0xc8);
            /* Typed text — scale 3 fills the input rect nicely. */
            if (M.input_len > 0) {
                draw_text_centered(M.input_buf, cx, h * 0.5f - 12.0f, 3.0f,
                                     0xff, 0xff, 0xff);
            } else {
                draw_text_centered("(type here)", cx, h * 0.5f - 4.0f, 1.5f,
                                     0x55, 0x60, 0x70);
            }
            break;
        default:
            break;
    }

    /* Button labels: scale 2 for main menu / 1.5 for the more dense list. */
    if (M.btn_sp.visible) {
        float bx = M.btn_sp.x + M.btn_sp.w * 0.5f;
        float by = M.btn_sp.y + (M.btn_sp.h - 8.0f * 2.0f) * 0.5f;
        draw_text_centered(M.btn_sp.label, bx, by, 2.0f, 0xff, 0xff, 0xff);
    }
    if (M.btn_mp.visible) {
        float bx = M.btn_mp.x + M.btn_mp.w * 0.5f;
        float by = M.btn_mp.y + (M.btn_mp.h - 8.0f * 2.0f) * 0.5f;
        draw_text_centered(M.btn_mp.label, bx, by, 2.0f, 0xff, 0xff, 0xff);
    }
    if (M.btn_self_host.visible) {
        float bx = M.btn_self_host.x + M.btn_self_host.w * 0.5f;
        float by = M.btn_self_host.y + (M.btn_self_host.h - 8.0f * 2.0f) * 0.5f;
        draw_text_centered(M.btn_self_host.label, bx, by, 2.0f, 0xff, 0xff, 0xff);
    }
    if (M.btn_join.visible) {
        float bx = M.btn_join.x + M.btn_join.w * 0.5f;
        float by = M.btn_join.y + (M.btn_join.h - 8.0f * 2.0f) * 0.5f;
        draw_text_centered(M.btn_join.label, bx, by, 2.0f, 0xff, 0xff, 0xff);
    }
    if (M.btn_cloud_host.visible) {
        float bx = M.btn_cloud_host.x + M.btn_cloud_host.w * 0.5f;
        float by = M.btn_cloud_host.y + (M.btn_cloud_host.h - 8.0f * 2.0f) * 0.5f;
        draw_text_centered(M.btn_cloud_host.label, bx, by, 2.0f, 0xff, 0xff, 0xff);
    }
    if (M.btn_active_profile.visible) {
        char chip[64];
        snprintf(chip, sizeof chip, "as %s", M.btn_active_profile.label);
        float bx = M.btn_active_profile.x + M.btn_active_profile.w * 0.5f;
        float by = M.btn_active_profile.y
                   + (M.btn_active_profile.h - 8.0f * 1.0f) * 0.5f;
        draw_text_centered(chip, bx, by, 1.0f, 0xc0, 0xd0, 0xe8);
    }
    if (M.btn_new_world.visible) {
        float bx = M.btn_new_world.x + 20.0f;
        float by = M.btn_new_world.y + (M.btn_new_world.h - 8.0f * 1.5f) * 0.5f;
        draw_text_left(M.btn_new_world.label, bx, by, 1.5f, 0x90, 0xff, 0xa0);
    }
    for (int i = 0; i < PERSISTENCE_MAX_WORLDS; ++i) {
        const menu_button_t* b = &M.btn_world[i];
        if (!b->visible) continue;
        float bx = b->x + 20.0f;
        float by = b->y + (b->h - 8.0f * 1.5f) * 0.5f;
        draw_text_left(b->label, bx, by, 1.5f, 0xff, 0xff, 0xff);
    }
    if (M.btn_new_profile.visible) {
        float bx = M.btn_new_profile.x + 20.0f;
        float by = M.btn_new_profile.y + (M.btn_new_profile.h - 8.0f * 1.5f) * 0.5f;
        draw_text_left(M.btn_new_profile.label, bx, by, 1.5f, 0x90, 0xff, 0xa0);
    }
    for (int i = 0; i < PROFILE_MAX; ++i) {
        const menu_button_t* b = &M.btn_profile[i];
        if (!b->visible) continue;
        float bx = b->x + 20.0f;
        float by = b->y + (b->h - 8.0f * 1.5f) * 0.5f;
        draw_text_left(b->label, bx, by, 1.5f, 0xff, 0xff, 0xff);
    }
    if (M.btn_back.visible) {
        float bx = M.btn_back.x + M.btn_back.w * 0.5f;
        float by = M.btn_back.y + (M.btn_back.h - 8.0f * 1.5f) * 0.5f;
        draw_text_centered(M.btn_back.label, bx, by, 1.5f, 0xc0, 0xc0, 0xc0);
    }

    if (M.state == GAME_MP_URL_PROMPT) {
        draw_text_centered("ENTER URL IN THE BROWSER PROMPT",
                             cx, h * 0.5f + 170.0f, 2.0f,
                             0xff, 0xd0, 0x60);
    }
}

/* ------------------------------------------------------------------ */
/* State transitions                                                    */
/* ------------------------------------------------------------------ */

static void enter_world_list(void) {
    M.world_count = persistence_list_worlds(M.worlds);
    M.state       = GAME_SP_WORLD_LIST;
    printf("[menu] SP world list: %d saved world(s)\n", M.world_count);
}

static void start_sp_for_world(const char* world_name) {
    snprintf(M.active_world, sizeof M.active_world, "%s", world_name);
    persistence_save_t s;
    if (persistence_load(world_name, &s)) {
        M.pending_sp_resume = true;
        M.resume = s;
        printf("[menu] SP load '%s' at (%.1f, %.1f, %.1f)\n",
               world_name, s.pos_x, s.pos_y, s.pos_z);
    } else {
        M.pending_sp_resume = false;
        printf("[menu] SP new '%s' (no save yet)\n", world_name);
    }
    M.state = GAME_IN_GAME_SP;
}

static void start_sp_new_world(void) {
    char* name = menu_js_prompt_world_name();
    if (!name) {
        printf("[menu] new-world cancelled\n");
        return;     /* stay on world-list screen */
    }
    /* Strip storage-format characters that would corrupt our flat
     * 'tenebris-c:world:<name>' key (newline / CR break the list
     * enumeration; colon collides with the prefix separator). */
    char* w = name;
    for (const char* r = name; *r; ++r) {
        if (*r == '\n' || *r == '\r' || *r == ':') continue;
        *w++ = *r;
    }
    *w = 0;
    if (!*name) { free(name); return; }
    /* If the name collides, we just overwrite — same UX as picking
     * the existing world from the list. */
    start_sp_for_world(name);
    free(name);
}

/* Hardcoded default server. The browser prompt was annoying for every
 * MP session, so the menu just connects straight to this. Power users
 * can still override via the `?server=...` URL query param — see the
 * bypass branch in main_web.c's init(). */
#define DEFAULT_MP_SERVER_URL "wss://tenebris-c.fly.dev/"

static void connect_to_room(const char* room_code) {
    /* Send active profile + chosen room to the server. */
    profile_t active;
    const char* tok  = NULL;
    const char* name = NULL;
    if (profile_get_active(&active)) {
        tok  = active.token;
        name = active.name;
    }
    net_client_set_profile(tok, name, room_code ? room_code : "");
    snprintf(M.room_code, sizeof M.room_code, "%s",
             room_code ? room_code : "");
    printf("[menu] MP: connect to %s (room='%s')\n",
           DEFAULT_MP_SERVER_URL,
           M.room_code[0] ? M.room_code : "(public)");
    net_client_connect(DEFAULT_MP_SERVER_URL);
    M.active_world[0] = 0;     /* no SP save target while in MP */
    M.state = GAME_IN_GAME_MP;
}

static void start_self_host(void) {
    char* code = menu_js_new_room_code();
    if (!code) return;
    connect_to_room(code);
    free(code);
}

static void start_cloud_host(void) {
    connect_to_room("");        /* empty = public room */
}

static void start_multiplayer(void) {
    /* MP button drops to the self-host / cloud-host picker — the
     * actual connect happens after the user picks one. */
    M.state = GAME_MP_SUBMENU;
}

static void enter_main_menu_with(const profile_t* p) {
    profile_set_active(p->token);
    M.state = GAME_MAIN_MENU;
    printf("[menu] active profile = %s (%s)\n", p->name, p->token);
}

static void new_profile_flow(void) {
    char* name = menu_js_prompt_profile_name();
    if (!name) return;
    /* Strip storage-format characters before persisting. */
    char* w = name;
    for (const char* r = name; *r; ++r) {
        if (*r == '\n' || *r == '\r' || *r == ':') continue;
        *w++ = *r;
    }
    *w = 0;
    if (!*name) { free(name); return; }

    profile_t p;
    if (profile_create(name, &p)) enter_main_menu_with(&p);
    free(name);
}

static void on_click_profile_select(float x, float y) {
    if (hit(&M.btn_new_profile, x, y)) { new_profile_flow(); return; }
    for (int i = 0; i < PROFILE_MAX; ++i) {
        if (hit(&M.btn_profile[i], x, y)) {
            enter_main_menu_with(&M.profiles[i]);
            return;
        }
    }
}

static void on_click_main(float x, float y) {
    if (hit(&M.btn_active_profile, x, y)) {
        /* Refresh the cache + drop to picker. */
        M.profile_count = profile_list(M.profiles, PROFILE_MAX);
        M.state = GAME_PROFILE_SELECT;
        return;
    }
    if (hit(&M.btn_sp, x, y)) { enter_world_list(); return; }
    if (hit(&M.btn_mp, x, y)) { start_multiplayer(); return; }
}

static void on_click_world_list(float x, float y) {
    if (hit(&M.btn_back, x, y))      { M.state = GAME_MAIN_MENU; return; }
    if (hit(&M.btn_new_world, x, y)) { start_sp_new_world();     return; }
    for (int i = 0; i < PERSISTENCE_MAX_WORLDS; ++i) {
        if (hit(&M.btn_world[i], x, y)) {
            start_sp_for_world(M.worlds[i]);
            return;
        }
    }
}

static void on_click_mp_submenu(float x, float y) {
    if (hit(&M.btn_back, x, y))       { M.state = GAME_MAIN_MENU; return; }
    if (hit(&M.btn_self_host, x, y))  { start_self_host();        return; }
    if (hit(&M.btn_cloud_host, x, y)) { start_cloud_host();       return; }
    if (hit(&M.btn_join, x, y)) {
        M.input_buf[0] = 0;
        M.input_len    = 0;
        M.input_cursor_blink_start = stm_sec(stm_now());
        M.state = GAME_MP_JOIN_INPUT;
        return;
    }
}

static void on_click_join_input(float x, float y) {
    if (hit(&M.btn_back, x, y)) { M.state = GAME_MP_SUBMENU; return; }
}

static void on_click(float x, float y) {
    switch (M.state) {
        case GAME_PROFILE_SELECT: on_click_profile_select(x, y); break;
        case GAME_MAIN_MENU:      on_click_main(x, y);           break;
        case GAME_SP_WORLD_LIST:  on_click_world_list(x, y);     break;
        case GAME_MP_SUBMENU:     on_click_mp_submenu(x, y);     break;
        case GAME_MP_JOIN_INPUT:  on_click_join_input(x, y);     break;
        default: break;
    }
}

/* Append a typed character to the input buffer, filtering to the
 * room-code alphabet (uppercase letters + digits) since that's the
 * only consumer right now. When we route other inputs through here
 * we'll pass an alphabet hint per active flow. */
static void input_append_char(uint32_t ch) {
    if (M.state != GAME_MP_JOIN_INPUT) return;
    if (M.input_len >= (int)sizeof M.input_buf - 1) return;
    /* Uppercase + digit only — keeps the room-code matching the
     * generator alphabet without making the user worry about case. */
    if (ch >= 'a' && ch <= 'z') ch -= ('a' - 'A');
    if (!((ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9'))) return;
    M.input_buf[M.input_len++] = (char)ch;
    M.input_buf[M.input_len]   = 0;
    M.input_cursor_blink_start = stm_sec(stm_now());
}

static void input_backspace(void) {
    if (M.state != GAME_MP_JOIN_INPUT) return;
    if (M.input_len == 0) return;
    M.input_buf[--M.input_len] = 0;
    M.input_cursor_blink_start = stm_sec(stm_now());
}

static void input_submit(void) {
    if (M.state != GAME_MP_JOIN_INPUT) return;
    if (M.input_len == 0) return;     /* empty submit = no-op, not "public" */
    /* Reuse the same path the SELF HOST button took — connect_to_room
     * stores the code into M.room_code and flips state to IN_GAME_MP. */
    connect_to_room(M.input_buf);
}

bool menu_event(const sapp_event* e) {
    if (!menu_is_overlay()) return false;
    /* Text-input flow gets first crack at keyboard events. */
    if (M.state == GAME_MP_JOIN_INPUT) {
        if (e->type == SAPP_EVENTTYPE_CHAR) {
            input_append_char(e->char_code);
            return true;
        }
        if (e->type == SAPP_EVENTTYPE_KEY_DOWN) {
            if (e->key_code == SAPP_KEYCODE_ENTER)      { input_submit();    return true; }
            if (e->key_code == SAPP_KEYCODE_BACKSPACE)  { input_backspace(); return true; }
            if (e->key_code == SAPP_KEYCODE_ESCAPE)     { M.state = GAME_MP_SUBMENU; return true; }
        }
    }
    switch (e->type) {
        case SAPP_EVENTTYPE_MOUSE_MOVE:
            M.mouse_x = e->mouse_x;
            M.mouse_y = e->mouse_y;
            return true;
        case SAPP_EVENTTYPE_MOUSE_DOWN:
            if (e->mouse_button == SAPP_MOUSEBUTTON_LEFT) {
                on_click(e->mouse_x, e->mouse_y);
                return true;
            }
            return false;
        case SAPP_EVENTTYPE_TOUCHES_BEGAN:
            if (e->num_touches > 0) {
                M.mouse_x = e->touches[0].pos_x;
                M.mouse_y = e->touches[0].pos_y;
                on_click(M.mouse_x, M.mouse_y);
            }
            return true;
        default:
            return true;     /* swallow */
    }
}

/* ------------------------------------------------------------------ */
/* Public                                                               */
/* ------------------------------------------------------------------ */

void menu_init(void) {
    memset(&M, 0, sizeof M);
    profile_module_init();
    /* Cache the profile list for the picker screen up front. If a
     * profile is already active (returning user) we still land on
     * the picker so they can swap accounts — one tap on their name
     * advances to the main menu. */
    M.profile_count = profile_list(M.profiles, PROFILE_MAX);
    M.state = GAME_PROFILE_SELECT;
}

void menu_shutdown(void) { }

game_state_t menu_state(void) { return M.state; }
void         menu_force_state(game_state_t s) { M.state = s; }

bool menu_is_overlay(void) {
    return M.state == GAME_PROFILE_SELECT
        || M.state == GAME_MAIN_MENU
        || M.state == GAME_SP_WORLD_LIST
        || M.state == GAME_MP_SUBMENU
        || M.state == GAME_MP_URL_PROMPT;
}

const char* menu_room_code(void) { return M.room_code; }

bool menu_take_sp_resume(persistence_save_t* out) {
    if (!M.pending_sp_resume) return false;
    *out = M.resume;
    M.pending_sp_resume = false;
    return true;
}

const char* menu_active_world(void) { return M.active_world; }
