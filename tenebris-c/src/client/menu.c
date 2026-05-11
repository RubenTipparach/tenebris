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

/* Browser native prompt for the server URL. Returns a malloc'd C
 * string (caller frees) or NULL if the user cancelled. Remembers the
 * last accepted value in localStorage so it pre-fills on next visit. */
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
#else
static char* menu_js_prompt_server_url(void) { return NULL; }
#endif

/* ------------------------------------------------------------------ */
/* State                                                                */
/* ------------------------------------------------------------------ */

typedef struct {
    float x, y, w, h;
    const char* label;
    int  hover;
} menu_button_t;

#define MENU_BTN_W   240.0f
#define MENU_BTN_H    56.0f
#define MENU_BTN_GAP  16.0f

static struct {
    game_state_t state;
    menu_button_t btn_sp;
    menu_button_t btn_mp;
    float mouse_x, mouse_y;
    bool  pending_sp_resume;
    persistence_save_t resume;
} M;

/* ------------------------------------------------------------------ */
/* Layout / hit test                                                    */
/* ------------------------------------------------------------------ */

static void layout(float w, float h) {
    float cx = w * 0.5f;
    float cy = h * 0.5f;

    M.btn_sp.x = cx - MENU_BTN_W * 0.5f;
    M.btn_sp.y = cy - MENU_BTN_H - MENU_BTN_GAP * 0.5f;
    M.btn_sp.w = MENU_BTN_W;
    M.btn_sp.h = MENU_BTN_H;
    M.btn_sp.label = "SINGLE PLAYER";

    M.btn_mp.x = cx - MENU_BTN_W * 0.5f;
    M.btn_mp.y = cy + MENU_BTN_GAP * 0.5f;
    M.btn_mp.w = MENU_BTN_W;
    M.btn_mp.h = MENU_BTN_H;
    M.btn_mp.label = "MULTIPLAYER";

    M.btn_sp.hover = (M.mouse_x >= M.btn_sp.x && M.mouse_x <= M.btn_sp.x + M.btn_sp.w &&
                        M.mouse_y >= M.btn_sp.y && M.mouse_y <= M.btn_sp.y + M.btn_sp.h);
    M.btn_mp.hover = (M.mouse_x >= M.btn_mp.x && M.mouse_x <= M.btn_mp.x + M.btn_mp.w &&
                        M.mouse_y >= M.btn_mp.y && M.mouse_y <= M.btn_mp.y + M.btn_mp.h);
}

static bool hit(const menu_button_t* b, float x, float y) {
    return x >= b->x && x <= b->x + b->w && y >= b->y && y <= b->y + b->h;
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
    quad(x,         y,         w,    thick, r, g, b, a);
    quad(x,         y + h-thick, w,  thick, r, g, b, a);
    quad(x,         y,         thick, h,   r, g, b, a);
    quad(x + w-thick, y,       thick, h,   r, g, b, a);
}

static void draw_button(const menu_button_t* b) {
    /* Body */
    if (b->hover) quad(b->x, b->y, b->w, b->h, 0.22f, 0.30f, 0.42f, 0.95f);
    else          quad(b->x, b->y, b->w, b->h, 0.12f, 0.14f, 0.19f, 0.90f);
    /* Border */
    border(b->x, b->y, b->w, b->h, 2.0f, 0.85f, 0.90f, 1.0f, 1.0f);
}

/* sdtx draws into its own context — must be set up by main. We assume
 * the caller already invoked sdtx_canvas / sdtx_origin etc. for the
 * frame. Returns the column position where the label was drawn. */
static void draw_button_label(const menu_button_t* b) {
    /* sokol_debugtext draws 8x8 chars by default. Center the label in
     * the button by counting characters. */
    int n = (int)strlen(b->label);
    float scale = 2.0f;
    float char_w = 8.0f * scale;
    float char_h = 8.0f * scale;
    float text_w = char_w * (float)n;
    float tx = b->x + (b->w - text_w) * 0.5f;
    float ty = b->y + (b->h - char_h) * 0.5f;

    sdtx_canvas(sapp_widthf(), sapp_heightf());
    sdtx_origin(tx / char_w, ty / char_h);
    sdtx_color3b(0xff, 0xff, 0xff);
    sdtx_home();
    sdtx_printf("%s", b->label);
}

void menu_draw(int screen_w, int screen_h) {
    if (M.state != GAME_MAIN_MENU && M.state != GAME_MP_URL_PROMPT) return;

    float w = (float)screen_w;
    float h = (float)screen_h;
    layout(w, h);

    sgl_defaults();
    sgl_matrix_mode_projection();
    sgl_load_identity();
    sgl_ortho(0.0f, w, h, 0.0f, -1.0f, 1.0f);
    sgl_matrix_mode_modelview();
    sgl_load_identity();

    /* Alpha-blended pipeline so the backdrop fades the scene rather
     * than blacking it. */
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

    /* Backdrop: dim the scene behind the menu. */
    quad(0, 0, w, h, 0.03f, 0.05f, 0.10f, 0.80f);

    /* Title strip. Just a coloured band; the actual text goes through
     * sdtx_printf below the buttons so the alignment can use sdtx
     * character metrics directly. */
    float strip_y = h * 0.5f - 200.0f;
    quad(w * 0.5f - 220.0f, strip_y, 440.0f, 8.0f, 0.85f, 0.90f, 1.0f, 0.30f);

    draw_button(&M.btn_sp);
    draw_button(&M.btn_mp);

    /* Status message strip near bottom of screen. */
    if (M.state == GAME_MP_URL_PROMPT) {
        quad(w * 0.5f - 200.0f, h * 0.5f + 160.0f, 400.0f, 40.0f,
             0.20f, 0.20f, 0.22f, 0.90f);
    }

    sgl_draw();

    /* Labels last so they sit on top of the rectangles. sdtx canvas
     * coords are in "char cells" (1 cell = 8 px at scale 1). */
    {
        sdtx_canvas(w, h);
        sdtx_origin(0.0f, 0.0f);

        /* TENEBRIS title. */
        const char* title = "TENEBRIS";
        float scale = 4.0f;
        float ch_w = 8.0f * scale;
        float tx = (w - ch_w * (float)strlen(title)) * 0.5f;
        float ty = h * 0.5f - 280.0f;
        sdtx_origin(tx / 8.0f, ty / 8.0f);
        sdtx_color3b(0xff, 0xff, 0xff);
        sdtx_home();
        sdtx_printf("%s", title);

        /* Subtitle under the strip. */
        const char* sub = "select a mode";
        float sub_scale = 1.5f;
        float sub_ch_w = 8.0f * sub_scale;
        float sub_tx = (w - sub_ch_w * (float)strlen(sub)) * 0.5f;
        float sub_ty = strip_y + 24.0f;
        sdtx_origin(sub_tx / 8.0f, sub_ty / 8.0f);
        sdtx_color3b(0xa0, 0xb0, 0xc8);
        sdtx_home();
        sdtx_printf("%s", sub);

        draw_button_label(&M.btn_sp);
        draw_button_label(&M.btn_mp);

        if (M.state == GAME_MP_URL_PROMPT) {
            const char* msg = "ENTER URL IN THE BROWSER PROMPT...";
            float mc_w = 8.0f * 1.5f;
            float mtx = (w - mc_w * (float)strlen(msg)) * 0.5f;
            float mty = h * 0.5f + 170.0f;
            sdtx_origin(mtx / 8.0f, mty / 8.0f);
            sdtx_color3b(0xff, 0xd0, 0x60);
            sdtx_home();
            sdtx_printf("%s", msg);
        }
    }
}

/* ------------------------------------------------------------------ */
/* Click handling                                                       */
/* ------------------------------------------------------------------ */

static void start_single_player(void) {
    persistence_save_t s;
    if (persistence_load(&s)) {
        M.pending_sp_resume = true;
        M.resume = s;
        printf("[menu] SP: resuming saved pose at (%.1f, %.1f, %.1f)\n",
               s.pos_x, s.pos_y, s.pos_z);
    } else {
        M.pending_sp_resume = false;
        printf("[menu] SP: no save found, fresh world\n");
    }
    M.state = GAME_IN_GAME_SP;
}

static void start_multiplayer(void) {
    M.state = GAME_MP_URL_PROMPT;
    /* The prompt is synchronous in the browser — by the time
     * window.prompt returns, the user has entered a URL or cancelled. */
    char* url = menu_js_prompt_server_url();
    if (!url) {
        printf("[menu] MP: cancelled\n");
        M.state = GAME_MAIN_MENU;
        return;
    }
    printf("[menu] MP: connecting to %s\n", url);
    net_client_connect(url);
    free(url);
    M.state = GAME_IN_GAME_MP;
}

static void on_click(float x, float y) {
    if (M.state != GAME_MAIN_MENU) return;
    if (hit(&M.btn_sp, x, y)) { start_single_player(); return; }
    if (hit(&M.btn_mp, x, y)) { start_multiplayer();   return; }
}

bool menu_event(const sapp_event* e) {
    if (M.state != GAME_MAIN_MENU && M.state != GAME_MP_URL_PROMPT) return false;
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
            /* Swallow all other events so they don't reach the game
             * input layer while we're in the menu. */
            return true;
    }
}

/* ------------------------------------------------------------------ */
/* Public                                                               */
/* ------------------------------------------------------------------ */

void menu_init(void) {
    memset(&M, 0, sizeof M);
    M.state = GAME_MAIN_MENU;
}

void menu_shutdown(void) {
}

game_state_t menu_state(void) { return M.state; }

void menu_force_state(game_state_t s) { M.state = s; }

bool menu_is_overlay(void) {
    return M.state == GAME_MAIN_MENU || M.state == GAME_MP_URL_PROMPT;
}

/* Exposed via the header even though SP-pose-loading is an
 * implementation detail of the menu's SP transition — main_web reads
 * this once on entering IN_GAME_SP to apply the resume pose. */
bool menu_take_sp_resume(persistence_save_t* out) {
    if (!M.pending_sp_resume) return false;
    *out = M.resume;
    M.pending_sp_resume = false;
    return true;
}
