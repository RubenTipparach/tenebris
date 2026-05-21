#include "client/pixel_ui.h"
#include "core/config.h"

#include "sokol_gfx.h"            /* must come before sokol_gl */
#include "sokol_app.h"
#include "sokol_log.h"
#include "sokol_gl.h"
#include "sokol_debugtext.h"

#include "stb_image.h"

#include <stdbool.h>
#include <stdio.h>
#include <string.h>

/* ----------------------------------------------------------------------- */
/* Module state. Single-instance singleton — the inventory / crafting
 * screens are both consumers of the same atlas + the same hot/active
 * tracking, so a global keeps the API call sites simple and avoids
 * threading a context pointer through every widget call. */

typedef struct {
    bool         ready;          /* init succeeded and atlas is uploaded   */
    bool         atlas_ok;       /* false if the PNG failed to load        */

    sg_image     atlas_img;
    sg_view      atlas_view;
    sg_sampler   atlas_smp;
    float        atlas_w;
    float        atlas_h;

    sgl_pipeline pip_tex;        /* textured + alpha-blended for sprites   */
    sgl_pipeline pip_flat;       /* untextured + alpha-blended for shading */

    /* Hot/active tracking. `hot_id` is the widget under the cursor THIS
     * frame; `active_id` is the widget the user pressed down on (clicks
     * fire when the cursor releases over the active widget). Both are
     * compared by pointer identity, which is why the API contract asks
     * callers to pass stable pointers for the id argument. */
    const char*  hot_id;
    const char*  active_id;

    /* Mouse / touch state pumped by pixel_ui_event. mouse_down tracks
     * the current button-held state; mouse_pressed and mouse_released
     * are the per-frame edges, cleared in pixel_ui_end. */
    float        mouse_x;
    float        mouse_y;
    bool         mouse_down;
    bool         mouse_pressed;
    bool         mouse_released;

    /* Demo screen visibility. Toggled by a debug key in main_web.c so
     * the swatch can be eyeballed live while iterating on art / YAML. */
    bool         demo_visible;
} pixel_ui_t;

static pixel_ui_t G = {0};

/* ----------------------------------------------------------------------- */
/* Init / shutdown. */

int pixel_ui_init(void) {
    if (G.ready) return 0;

    const ui_config_t* ui = config_ui();

    /* Load the atlas PNG. Same path stbi_load uses for the terrain
     * atlas in bake_atlas() — RGBA8, no flip. On WASM the file is
     * preloaded into the emscripten virtual FS by the build's
     * --preload-file directive; on native it's read off disk. */
    stbi_set_flip_vertically_on_load(0);
    int w = 0, h = 0, c = 0;
    unsigned char* pix = stbi_load(ui->atlas_path, &w, &h, &c, 4);
    if (!pix) {
        printf("[pixel_ui] WARNING: %s missing; UI module disabled\n",
               ui->atlas_path);
        G.ready = true;
        G.atlas_ok = false;
        return -1;
    }
    G.atlas_w = (float)w;
    G.atlas_h = (float)h;

    G.atlas_img = sg_make_image(&(sg_image_desc){
        .width = w, .height = h,
        .pixel_format = SG_PIXELFORMAT_RGBA8,
        .data.mip_levels[0] = { .ptr = pix, .size = (size_t)(w * h * 4) },
        .label = "pixel-ui-atlas",
    });
    G.atlas_view = sg_make_view(&(sg_view_desc){
        .texture.image = G.atlas_img,
        .label = "pixel-ui-atlas-view",
    });
    /* Nearest-neighbour sampling is essential — bilinear on pixel art
     * smears the bronze trim into a blurry mess at non-1:1 scale.
     * Clamp wrap so a sub-rect can't bleed neighbour sprite texels. */
    G.atlas_smp = sg_make_sampler(&(sg_sampler_desc){
        .min_filter = SG_FILTER_NEAREST,
        .mag_filter = SG_FILTER_NEAREST,
        .wrap_u = SG_WRAP_CLAMP_TO_EDGE,
        .wrap_v = SG_WRAP_CLAMP_TO_EDGE,
        .label = "pixel-ui-atlas-sampler",
    });
    free(pix);

    /* Two pipelines: textured (sprites) and untextured (text-backdrop
     * dim rectangles). Both share the standard SRC_ALPHA / 1-SRC_ALPHA
     * blend the rest of the UI uses, so the pixel UI composes cleanly
     * over the scene + under sokol_debugtext. */
    sg_pipeline_desc blend_desc = {
        .colors[0].blend = {
            .enabled = true,
            .src_factor_rgb   = SG_BLENDFACTOR_SRC_ALPHA,
            .dst_factor_rgb   = SG_BLENDFACTOR_ONE_MINUS_SRC_ALPHA,
            .src_factor_alpha = SG_BLENDFACTOR_ONE,
            .dst_factor_alpha = SG_BLENDFACTOR_ONE,
        },
    };
    G.pip_tex  = sgl_make_pipeline(&blend_desc);
    G.pip_flat = sgl_make_pipeline(&blend_desc);

    G.atlas_ok = true;
    G.ready = true;
    printf("[pixel_ui] atlas loaded: %s (%dx%d)\n", ui->atlas_path, w, h);
    return 0;
}

void pixel_ui_shutdown(void) {
    /* Pipelines + images get reclaimed when sokol shuts down at app
     * exit; no per-resource destroy needed during normal operation. */
    G.ready = false;
}

/* ----------------------------------------------------------------------- */
/* Event pump. Touch events are mapped to mouse equivalents so the
 * widget hit-tests don't need a second code path. */

bool pixel_ui_event(const sapp_event* e) {
    if (!G.ready || !G.atlas_ok) return false;
    if (!e) return false;

    switch (e->type) {
        case SAPP_EVENTTYPE_MOUSE_MOVE:
            G.mouse_x = e->mouse_x;
            G.mouse_y = e->mouse_y;
            break;
        case SAPP_EVENTTYPE_MOUSE_DOWN:
            G.mouse_x = e->mouse_x;
            G.mouse_y = e->mouse_y;
            G.mouse_down = true;
            G.mouse_pressed = true;
            break;
        case SAPP_EVENTTYPE_MOUSE_UP:
            G.mouse_x = e->mouse_x;
            G.mouse_y = e->mouse_y;
            G.mouse_down = false;
            G.mouse_released = true;
            break;
        case SAPP_EVENTTYPE_TOUCHES_BEGAN:
            if (e->num_touches > 0) {
                G.mouse_x = e->touches[0].pos_x;
                G.mouse_y = e->touches[0].pos_y;
                G.mouse_down = true;
                G.mouse_pressed = true;
            }
            break;
        case SAPP_EVENTTYPE_TOUCHES_MOVED:
            if (e->num_touches > 0) {
                G.mouse_x = e->touches[0].pos_x;
                G.mouse_y = e->touches[0].pos_y;
            }
            break;
        case SAPP_EVENTTYPE_TOUCHES_ENDED:
        case SAPP_EVENTTYPE_TOUCHES_CANCELLED:
            G.mouse_down = false;
            G.mouse_released = true;
            break;
        default:
            break;
    }

    /* The event was only "consumed" if the press / release happened
     * over the demo panel (or, in the future, an open inventory).
     * The hot/active machinery doesn't know widget rects until
     * widgets are drawn — we report non-consumed here and let the
     * widgets themselves block the click-through by way of returning
     * true to their caller. The caller stays in charge of input
     * priority; this just keeps mouse coords + edge flags warm. */
    return false;
}

/* ----------------------------------------------------------------------- */
/* Per-frame begin / end. */

void pixel_ui_begin(void) {
    if (!G.ready || !G.atlas_ok) return;

    G.hot_id = NULL;

    const float w = sapp_widthf();
    const float h = sapp_heightf();
    if (w <= 0.0f || h <= 0.0f) return;

    sgl_defaults();
    sgl_matrix_mode_projection();
    sgl_load_identity();
    sgl_ortho(0.0f, w, h, 0.0f, -1.0f, 1.0f);
    sgl_matrix_mode_modelview();
    sgl_load_identity();
}

void pixel_ui_end(void) {
    if (!G.ready || !G.atlas_ok) return;

    /* Release outside any widget clears active so a future press starts
     * a fresh interaction. The widget functions clear active themselves
     * when they detect the release-over-active case (their click
     * return). */
    if (G.mouse_released && G.active_id != NULL) {
        G.active_id = NULL;
    }

    /* Edge flags are per-frame. */
    G.mouse_pressed = false;
    G.mouse_released = false;
}

/* ----------------------------------------------------------------------- */
/* Internal: nine-slice + flat draws against the sprite atlas. */

static inline bool point_in_rect(float px, float py,
                                 float x, float y, float w, float h) {
    return px >= x && px < x + w && py >= y && py < y + h;
}

/* Emit one textured quad covering screen rect (x..x+w, y..y+h) sampling
 * atlas texels (sx..sx+sw, sy..sy+sh). sokol_gl quad uses CCW winding
 * starting at top-left. */
static void draw_sub(float x, float y, float w, float h,
                     float sx, float sy, float sw, float sh) {
    if (w <= 0.0f || h <= 0.0f || sw <= 0.0f || sh <= 0.0f) return;
    const float u0 = sx / G.atlas_w;
    const float v0 = sy / G.atlas_h;
    const float u1 = (sx + sw) / G.atlas_w;
    const float v1 = (sy + sh) / G.atlas_h;
    sgl_begin_quads();
    sgl_c4f(1.0f, 1.0f, 1.0f, 1.0f);
    sgl_v2f_t2f(x,     y,     u0, v0);
    sgl_v2f_t2f(x + w, y,     u1, v0);
    sgl_v2f_t2f(x + w, y + h, u1, v1);
    sgl_v2f_t2f(x,     y + h, u0, v1);
    sgl_end();
}

/* Decompose a nine-sliced sprite into nine textured quads covering the
 * destination rect. The four corner slices stay at native size; the
 * four edges stretch along one axis; the centre stretches in both. A
 * sprite with all-zero margins degenerates to a single 1:1 blit
 * centred on the rect's top-left — used for non-stretchable glyphs
 * like the close X. */
static void draw_nine_slice(const ui_sprite_t* s,
                            float dx, float dy, float dw, float dh) {
    const float sl = (float)s->left;
    const float sr = (float)s->right;
    const float st = (float)s->top;
    const float sb = (float)s->bottom;

    if (sl == 0.0f && sr == 0.0f && st == 0.0f && sb == 0.0f) {
        /* Non-stretchable: blit at native size, top-left aligned. */
        draw_sub(dx, dy, (float)s->w, (float)s->h,
                 (float)s->x, (float)s->y, (float)s->w, (float)s->h);
        return;
    }

    /* Clamp margins so a small destination rect doesn't end up with
     * overlapping corners. Falls back to a degenerate centre rather
     * than corrupting the bevel. */
    float ml = sl, mr = sr, mt = st, mb = sb;
    if (ml + mr > dw) {
        const float k = dw / (ml + mr);
        ml *= k; mr *= k;
    }
    if (mt + mb > dh) {
        const float k = dh / (mt + mb);
        mt *= k; mb *= k;
    }

    const float sx = (float)s->x, sy = (float)s->y;
    const float sw = (float)s->w, sh = (float)s->h;

    /* Source band widths along U / V. Corners keep their native size
     * so the bevel doesn't smear. */
    const float u_mid = sw - sl - sr;
    const float v_mid = sh - st - sb;

    /* Destination column / row positions and widths. */
    const float x0 = dx,            w0 = ml;
    const float x1 = dx + ml,       w1 = dw - ml - mr;
    const float x2 = dx + dw - mr,  w2 = mr;
    const float y0 = dy,            h0 = mt;
    const float y1 = dy + mt,       h1 = dh - mt - mb;
    const float y2 = dy + dh - mb,  h2 = mb;

    /* Source column / row offsets. Stretchable bands sample the centre
     * texels (u_mid wide etc.) regardless of how wide the destination
     * band ends up. */
    const float sx0 = sx,            usw0 = sl;
    const float sx1 = sx + sl,       usw1 = u_mid;
    const float sx2 = sx + sw - sr,  usw2 = sr;
    const float sy0 = sy,            ush0 = st;
    const float sy1 = sy + st,       ush1 = v_mid;
    const float sy2 = sy + sh - sb,  ush2 = sb;

    /* Nine quads: TL, T, TR, L, C, R, BL, B, BR. */
    draw_sub(x0, y0, w0, h0,  sx0, sy0, usw0, ush0);
    draw_sub(x1, y0, w1, h0,  sx1, sy0, usw1, ush0);
    draw_sub(x2, y0, w2, h0,  sx2, sy0, usw2, ush0);
    draw_sub(x0, y1, w0, h1,  sx0, sy1, usw0, ush1);
    draw_sub(x1, y1, w1, h1,  sx1, sy1, usw1, ush1);
    draw_sub(x2, y1, w2, h1,  sx2, sy1, usw2, ush1);
    draw_sub(x0, y2, w0, h2,  sx0, sy2, usw0, ush2);
    draw_sub(x1, y2, w1, h2,  sx1, sy2, usw1, ush2);
    draw_sub(x2, y2, w2, h2,  sx2, sy2, usw2, ush2);
}

static void draw_sprite(ui_sprite_id_t id, float x, float y, float w, float h) {
    const ui_config_t* ui = config_ui();
    sgl_load_pipeline(G.pip_tex);
    sgl_enable_texture();
    sgl_texture((sg_view){ .id = G.atlas_view.id },
                (sg_sampler){ .id = G.atlas_smp.id });
    draw_nine_slice(&ui->sprites[id], x, y, w, h);
    sgl_disable_texture();
}

/* ----------------------------------------------------------------------- */
/* Public widgets. */

void pixel_ui_panel(int x, int y, int w, int h) {
    if (!G.ready || !G.atlas_ok) return;
    draw_sprite(UI_SPRITE_PANEL, (float)x, (float)y, (float)w, (float)h);
}

void pixel_ui_title_bar(int x, int y, int w, int h) {
    if (!G.ready || !G.atlas_ok) return;
    draw_sprite(UI_SPRITE_TITLE_BAR, (float)x, (float)y, (float)w, (float)h);
}

void pixel_ui_label(int x, int y, const char* label) {
    if (!label) return;
    /* sokol_debugtext glyphs are 8 px tall at scale 1. The pixel art
     * panels are scaled to the screen ortho; the canvas() call below
     * matches the same ortho so positions are in raw pixels. */
    sdtx_canvas(sapp_widthf(), sapp_heightf());
    sdtx_origin(0.0f, 0.0f);
    sdtx_color3b(0xe8, 0xd2, 0xa8);  /* parchment from the UI palette */
    sdtx_pos((float)x / 8.0f, (float)y / 8.0f);
    sdtx_puts(label);
}

bool pixel_ui_button(const char* id, int x, int y, int w, int h,
                     const char* label, pixel_ui_button_state_t state) {
    if (!G.ready || !G.atlas_ok) return false;

    const bool disabled = (state == PIXEL_UI_BUTTON_DISABLED);
    const bool active   = (state == PIXEL_UI_BUTTON_ACTIVE);
    const float fx = (float)x, fy = (float)y, fw = (float)w, fh = (float)h;
    const bool hovered = !disabled
                      && point_in_rect(G.mouse_x, G.mouse_y, fx, fy, fw, fh);

    bool clicked = false;
    if (!disabled) {
        if (hovered) G.hot_id = id;
        if (hovered && G.mouse_pressed) {
            G.active_id = id;
        }
        if (G.mouse_released && G.active_id == id) {
            if (hovered) clicked = true;
            G.active_id = NULL;
        }
    }

    /* Pick the sprite. Pressed wins over hover when the user has
     * mouse-down on this button — including if they drag off and
     * back on, which gives the satisfying "still committed" feel
     * desktop UIs have. ACTIVE forces the hover sprite even without
     * mouse-over, so tabs can read as selected. */
    ui_sprite_id_t sprite = UI_SPRITE_BUTTON_NORMAL;
    if (disabled)                          sprite = UI_SPRITE_BUTTON_DISABLED;
    else if (G.active_id == id && hovered) sprite = UI_SPRITE_BUTTON_PRESSED;
    else if (hovered || active)            sprite = UI_SPRITE_BUTTON_HOVER;

    draw_sprite(sprite, fx, fy, fw, fh);

    if (label) {
        /* Centre the label inside the button. sokol_debugtext glyphs
         * are 8x8 at scale 1, so the label width in pixels is
         * 8 * strlen. */
        const float gw = 8.0f;
        const float gh = 8.0f;
        size_t n = strlen(label);
        const float tx = fx + (fw - gw * (float)n) * 0.5f;
        /* Pressed button: nudge the label down 1 px to reinforce the
         * pushed-in feel. */
        const float ty = fy + (fh - gh) * 0.5f
                       + (sprite == UI_SPRITE_BUTTON_PRESSED ? 1.0f : 0.0f);

        sdtx_canvas(sapp_widthf(), sapp_heightf());
        sdtx_origin(0.0f, 0.0f);
        if (disabled)               sdtx_color3b(0x6b, 0x60, 0x58);
        else if (hovered || active) sdtx_color3b(0xff, 0xff, 0xff);
        else                        sdtx_color3b(0xe8, 0xd2, 0xa8);
        sdtx_pos(tx / 8.0f, ty / 8.0f);
        sdtx_puts(label);
    }

    return clicked;
}

bool pixel_ui_slot(const char* id, int x, int y, int w, int h,
                   uint32_t atlas_view_id, uint32_t atlas_sampler_id,
                   float u0, float v0, float u1, float v1,
                   int count, pixel_ui_slot_state_t state) {
    if (!G.ready || !G.atlas_ok) return false;

    const float fx = (float)x, fy = (float)y;
    const float fw = (float)w, fh = (float)h;
    if (fw <= 0.0f || fh <= 0.0f) return false;

    const bool disabled = (state == PIXEL_UI_SLOT_DISABLED);
    const bool hovered = !disabled
                      && point_in_rect(G.mouse_x, G.mouse_y, fx, fy, fw, fh);

    bool clicked = false;
    if (!disabled) {
        if (hovered) G.hot_id = id;
        if (hovered && G.mouse_pressed) G.active_id = id;
        if (G.mouse_released && G.active_id == id) {
            if (hovered) clicked = true;
            G.active_id = NULL;
        }
    }

    ui_sprite_id_t sprite = UI_SPRITE_SLOT_NORMAL;
    if (disabled)                          sprite = UI_SPRITE_SLOT_DISABLED;
    else if (state == PIXEL_UI_SLOT_SELECTED) sprite = UI_SPRITE_SLOT_SELECTED;
    else if (hovered)                      sprite = UI_SPRITE_SLOT_HOVER;

    draw_sprite(sprite, fx, fy, fw, fh);

    /* Icon: sample the caller-provided atlas (terrain atlas for block
     * icons, item atlas for crafted items) over the slot's inner
     * area. The pad scales with the slot so a 24 px slot keeps the
     * icon proportionally inset; floor at 2 px so tiny slots still
     * leave the frame visible. */
    if (atlas_view_id != 0) {
        float pad = fw / 6.0f;
        if (pad < 2.0f) pad = 2.0f;
        sgl_load_pipeline(G.pip_tex);
        sgl_enable_texture();
        sgl_texture((sg_view){ .id = atlas_view_id },
                    (sg_sampler){ .id = atlas_sampler_id });
        sgl_begin_quads();
        sgl_c4f(1.0f, 1.0f, 1.0f, 1.0f);
        sgl_v2f_t2f(fx + pad,        fy + pad,        u0, v0);
        sgl_v2f_t2f(fx + fw - pad,   fy + pad,        u1, v0);
        sgl_v2f_t2f(fx + fw - pad,   fy + fh - pad,   u1, v1);
        sgl_v2f_t2f(fx + pad,        fy + fh - pad,   u0, v1);
        sgl_end();
        sgl_disable_texture();
    }

    /* Count badge — finite stacks only, matching the hotbar convention
     * (>9000 is the "infinite" sentinel for creative-mode inventories). */
    if (count > 0 && count <= 9000) {
        char buf[16];
        int n = snprintf(buf, sizeof(buf), "%d", count);
        sdtx_canvas(sapp_widthf(), sapp_heightf());
        sdtx_origin(0.0f, 0.0f);
        sdtx_color3b(0xff, 0xff, 0xff);
        sdtx_pos((fx + fw - 8.0f * (float)n - 1.0f) / 8.0f,
                 (fy + fh - 9.0f) / 8.0f);
        sdtx_puts(buf);
    }

    return clicked;
}

/* ----------------------------------------------------------------------- */
/* Demo: a small overlay panel that draws every widget so the look is
 * visible end-to-end without a real inventory screen wired up yet.
 * Toggleable from main_web.c with a debug key. */

bool pixel_ui_demo_visible(void) { return G.demo_visible; }
void pixel_ui_demo_toggle(void)  { G.demo_visible = !G.demo_visible; }

void pixel_ui_demo_draw(void) {
    if (!G.demo_visible) return;
    if (!G.ready || !G.atlas_ok) return;

    pixel_ui_begin();

    /* Panel anchored near the top-left, sized to fit a title strip, a
     * row of 6 slots, and three buttons. */
    const int panel_x = 40;
    const int panel_y = 80;
    const int panel_w = 360;
    const int panel_h = 220;

    pixel_ui_panel(panel_x, panel_y, panel_w, panel_h);

    /* Title strip nested inside the panel. */
    pixel_ui_title_bar(panel_x + 16, panel_y + 12, panel_w - 32, 22);
    pixel_ui_label    (panel_x + 28, panel_y + 17, "pixel-ui demo");

    /* Slot row. Slots draw at 32 x 32 to give the demo something
     * chunky enough to eyeball - the runtime inventory picks its own
     * slot size based on screen width. */
    const int slot_size  = 32;
    const int slot_pitch = 40;
    for (int i = 0; i < 6; ++i) {
        const int sx = panel_x + 24 + i * slot_pitch;
        const int sy = panel_y + 56;
        pixel_ui_slot_state_t st = PIXEL_UI_SLOT_NORMAL;
        if (i == 1) st = PIXEL_UI_SLOT_SELECTED;
        if (i == 5) st = PIXEL_UI_SLOT_DISABLED;
        /* Static id strings — pointer identity is what the module
         * tracks, and string literals deduplicate at compile time. */
        static const char* slot_ids[6] = {
            "demo_slot_0", "demo_slot_1", "demo_slot_2",
            "demo_slot_3", "demo_slot_4", "demo_slot_5",
        };
        pixel_ui_slot(slot_ids[i], sx, sy, slot_size, slot_size,
                      0, 0,      /* no icon atlas in the demo */
                      0, 0, 0, 0,
                      i * 3,     /* a fake stack count */
                      st);
    }

    /* Button row. Click the "OK" button to print to the console so a
     * developer can confirm the hot/active machinery is wiring through
     * to the click return without needing an inventory model. */
    if (pixel_ui_button("demo_btn_ok",
                        panel_x + 24,  panel_y + 110, 96, 28,
                        "OK", PIXEL_UI_BUTTON_NORMAL)) {
        printf("[pixel_ui] demo OK clicked\n");
    }
    pixel_ui_button("demo_btn_cancel",
                    panel_x + 132, panel_y + 110, 96, 28,
                    "Cancel", PIXEL_UI_BUTTON_NORMAL);
    pixel_ui_button("demo_btn_disabled",
                    panel_x + 240, panel_y + 110, 96, 28,
                    "Locked", PIXEL_UI_BUTTON_DISABLED);

    /* Standalone close-X sprite as a small "X" badge top-right of the
     * panel — exercises the non-stretchable code path. */
    pixel_ui_label(panel_x + 24, panel_y + 158,
                   "click OK then check the console");
    pixel_ui_label(panel_x + 24, panel_y + 178,
                   "press F8 to toggle this panel");

    /* Render the close-X glyph in its native 12x12 size at the top-
     * right corner of the panel. Renders 1:1 because nine_slice for
     * close_x is all zeros (non-stretchable). */
    draw_sprite(UI_SPRITE_CLOSE_X,
                (float)(panel_x + panel_w - 22), (float)(panel_y + 10),
                12.0f, 12.0f);

    pixel_ui_end();
}
