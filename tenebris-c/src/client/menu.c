#include "client/menu.h"
#include "client/net_client.h"
#include "client/persistence.h"

#include "sokol_gfx.h"
#include "sokol_app.h"
#include "sokol_gl.h"
#include "sokol_log.h"
#include "sokol_debugtext.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#ifdef __EMSCRIPTEN__
#include <emscripten.h>

EM_JS(char*, menu_js_prompt_server_url, (void), {
    var key = 'tenebris-c:last-server';
    var defaultUrl = '';
    try { defaultUrl = window.localStorage.getItem(key) || ''; } catch (e) {}
    if (!defaultUrl) defaultUrl = 'wss://tenebris-c.fly.dev/';
    var url = window.prompt(
        'Server URL\n(e.g. wss://your-app.fly.dev/  or  ws://localhost:8080/)',
        defaultUrl);
    if (!url) return 0;
    try { window.localStorage.setItem(key, url); } catch (e) {}
    var len = lengthBytesUTF8(url) + 1;
    var p = _malloc(len);
    stringToUTF8(url, p, len);
    return p;
});

/* Prompt for a new SP world name. Sanitises out newline / carriage
 * return / colon (storage-format characters) and trims whitespace. */
EM_JS(char*, menu_js_prompt_world_name, (void), {
    var raw = window.prompt('Name your world:', 'world-' + Date.now().toString().slice(-4));
    if (!raw) return 0;
    var n = raw.replace(/[\n\r:]/g, '').trim();
    if (!n) return 0;
    if (n.length > 31) n = n.substring(0, 31);
    var len = lengthBytesUTF8(n) + 1;
    var p = _malloc(len);
    stringToUTF8(n, p, len);
    return p;
});
#else
static char* menu_js_prompt_server_url(void)  { return NULL; }
static char* menu_js_prompt_world_name(void)  { return NULL; }
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
    /* SP world-list buttons. */
    menu_button_t btn_new_world;
    menu_button_t btn_back;
    menu_button_t btn_world[PERSISTENCE_MAX_WORLDS];

    float mouse_x, mouse_y;

    /* Resume pose handed off to main_web on entering IN_GAME_SP. */
    bool               pending_sp_resume;
    persistence_save_t resume;

    /* Cached world directory. Refreshed on entering SP world list. */
    char worlds[PERSISTENCE_MAX_WORLDS][PERSISTENCE_NAME_MAX + 1];
    int  world_count;

    /* Name the SP autosave loop writes back to. Empty in MP / menu. */
    char active_world[PERSISTENCE_NAME_MAX + 1];
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
    hide_button(&M.btn_new_world);
    hide_button(&M.btn_back);
    for (int i = 0; i < PERSISTENCE_MAX_WORLDS; ++i) hide_button(&M.btn_world[i]);
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
}

static void layout(float w, float h) {
    switch (M.state) {
        case GAME_MAIN_MENU:
        case GAME_MP_URL_PROMPT:
            layout_main(w, h); break;
        case GAME_SP_WORLD_LIST:
            layout_world_list(w, h); break;
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
 * canvas char cells (one cell = 8 canvas units regardless of scale). */
static void draw_text_centered(const char* str, float center_x,
                                 float screen_y, float scale,
                                 uint8_t r, uint8_t g, uint8_t b) {
    int n = (int)strlen(str);
    float cell_px = 8.0f * scale;
    float text_w  = cell_px * (float)n;
    float text_x  = center_x - text_w * 0.5f;
    sdtx_canvas(sapp_widthf() / scale, sapp_heightf() / scale);
    sdtx_origin(text_x / cell_px, screen_y / cell_px);
    sdtx_color3b(r, g, b);
    sdtx_home();
    sdtx_printf("%s", str);
}

static void draw_text_left(const char* str, float screen_x,
                             float screen_y, float scale,
                             uint8_t r, uint8_t g, uint8_t b) {
    float cell_px = 8.0f * scale;
    sdtx_canvas(sapp_widthf() / scale, sapp_heightf() / scale);
    sdtx_origin(screen_x / cell_px, screen_y / cell_px);
    sdtx_color3b(r, g, b);
    sdtx_home();
    sdtx_printf("%s", str);
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
    draw_button(&M.btn_new_world);
    for (int i = 0; i < PERSISTENCE_MAX_WORLDS; ++i) draw_button(&M.btn_world[i]);
    draw_button(&M.btn_back);

    if (M.state == GAME_MP_URL_PROMPT) {
        quad(w * 0.5f - 200.0f, h * 0.5f + 160.0f, 400.0f, 40.0f,
             0.20f, 0.20f, 0.22f, 0.90f);
    }

    sgl_draw();

    /* Text. */
    float cx = w * 0.5f;

    switch (M.state) {
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
    /* If the name collides, we just overwrite — same UX as picking
     * the existing world from the list. */
    start_sp_for_world(name);
    free(name);
}

static void start_multiplayer(void) {
    M.state = GAME_MP_URL_PROMPT;
    char* url = menu_js_prompt_server_url();
    if (!url) {
        M.state = GAME_MAIN_MENU;
        return;
    }
    printf("[menu] MP: connecting to %s\n", url);
    net_client_connect(url);
    free(url);
    M.active_world[0] = 0;     /* no SP save target while in MP */
    M.state = GAME_IN_GAME_MP;
}

static void on_click_main(float x, float y) {
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

static void on_click(float x, float y) {
    switch (M.state) {
        case GAME_MAIN_MENU:      on_click_main(x, y);       break;
        case GAME_SP_WORLD_LIST:  on_click_world_list(x, y); break;
        default: break;
    }
}

bool menu_event(const sapp_event* e) {
    if (!menu_is_overlay()) return false;
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
    M.state = GAME_MAIN_MENU;
}

void menu_shutdown(void) { }

game_state_t menu_state(void) { return M.state; }
void         menu_force_state(game_state_t s) { M.state = s; }

bool menu_is_overlay(void) {
    return M.state == GAME_MAIN_MENU
        || M.state == GAME_SP_WORLD_LIST
        || M.state == GAME_MP_URL_PROMPT;
}

bool menu_take_sp_resume(persistence_save_t* out) {
    if (!M.pending_sp_resume) return false;
    *out = M.resume;
    M.pending_sp_resume = false;
    return true;
}

const char* menu_active_world(void) { return M.active_world; }
