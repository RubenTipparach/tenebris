#include "client/mobile_ui.h"
#include "client/input.h"
#include "client/teleport_menu.h"

#include "sokol_gfx.h"   /* sokol_gl uses sg_* types — must come first */
#include "sokol_app.h"
#include "sokol_log.h"
#include "sokol_gl.h"

#include <math.h>

/* ----------------------------------------------------------------------- */

/* All dimensions halved from the first pass so both joysticks + three
 * buttons can share the bottom half of the screen without crowding. */
#define BTN_RADIUS     22.0f
#define BTN_MARGIN     14.0f
#define BTN_GAP        10.0f
#define STICK_RADIUS   38.0f
#define STICK_KNOB_R   15.0f

void mobile_ui_init(void) {
    sgl_setup(&(sgl_desc_t){ .logger.func = slog_func });
}
void mobile_ui_shutdown(void) {
    sgl_shutdown();
}

/* ----------------------------------------------------------------------- */

static void draw_circle_fan(float cx, float cy, float r, int seg,
                            float rgb_r, float rgb_g, float rgb_b, float a) {
    sgl_begin_triangles();
    sgl_c4f(rgb_r, rgb_g, rgb_b, a);
    for (int i = 0; i < seg; ++i) {
        float a0 = (float)i       / (float)seg * 6.2831853f;
        float a1 = (float)(i + 1) / (float)seg * 6.2831853f;
        sgl_v2f(cx, cy);
        sgl_v2f(cx + cosf(a0) * r, cy + sinf(a0) * r);
        sgl_v2f(cx + cosf(a1) * r, cy + sinf(a1) * r);
    }
    sgl_end();
}

static void draw_ring(float cx, float cy, float inner, float outer, int seg,
                      float rgb_r, float rgb_g, float rgb_b, float a) {
    sgl_begin_triangles();
    sgl_c4f(rgb_r, rgb_g, rgb_b, a);
    for (int i = 0; i < seg; ++i) {
        float a0 = (float)i       / (float)seg * 6.2831853f;
        float a1 = (float)(i + 1) / (float)seg * 6.2831853f;
        float x0i = cx + cosf(a0) * inner, y0i = cy + sinf(a0) * inner;
        float x1i = cx + cosf(a1) * inner, y1i = cy + sinf(a1) * inner;
        float x0o = cx + cosf(a0) * outer, y0o = cy + sinf(a0) * outer;
        float x1o = cx + cosf(a1) * outer, y1o = cy + sinf(a1) * outer;
        /* Two triangles per segment. */
        sgl_v2f(x0i, y0i); sgl_v2f(x0o, y0o); sgl_v2f(x1o, y1o);
        sgl_v2f(x0i, y0i); sgl_v2f(x1o, y1o); sgl_v2f(x1i, y1i);
    }
    sgl_end();
}

/* Simple 3x5 glyph strokes for the button labels (B, P, J). Drawn as
 * line-list quads — keeps mobile_ui self-contained and readable without
 * another font dependency. */
static void draw_segment(float x0, float y0, float x1, float y1, float thick,
                         float r, float g, float b, float a) {
    float dx = x1 - x0, dy = y1 - y0;
    float len = sqrtf(dx * dx + dy * dy);
    if (len <= 0.0f) return;
    float nx = -dy / len * thick * 0.5f;
    float ny =  dx / len * thick * 0.5f;
    sgl_begin_quads();
    sgl_c4f(r, g, b, a);
    sgl_v2f(x0 - nx, y0 - ny);
    sgl_v2f(x1 - nx, y1 - ny);
    sgl_v2f(x1 + nx, y1 + ny);
    sgl_v2f(x0 + nx, y0 + ny);
    sgl_end();
}

static void draw_glyph(char ch, float cx, float cy, float size, float r, float g, float b) {
    float half = size * 0.5f;
    float top = cy - half, bot = cy + half;
    float left = cx - half * 0.7f, right = cx + half * 0.7f;
    float mid_y = cy;
    float thick = 3.0f;
    switch (ch) {
        case 'B': {
            draw_segment(left, top, left, bot, thick, r, g, b, 1.0f);
            draw_segment(left, top, right, top, thick, r, g, b, 1.0f);
            draw_segment(left, mid_y, right, mid_y, thick, r, g, b, 1.0f);
            draw_segment(left, bot, right, bot, thick, r, g, b, 1.0f);
            draw_segment(right, top, right, mid_y, thick, r, g, b, 1.0f);
            draw_segment(right, mid_y, right, bot, thick, r, g, b, 1.0f);
            break;
        }
        case 'P': {
            draw_segment(left, top, left, bot, thick, r, g, b, 1.0f);
            draw_segment(left, top, right, top, thick, r, g, b, 1.0f);
            draw_segment(left, mid_y, right, mid_y, thick, r, g, b, 1.0f);
            draw_segment(right, top, right, mid_y, thick, r, g, b, 1.0f);
            break;
        }
        case 'J': {
            draw_segment(left, top, right, top, thick, r, g, b, 1.0f);
            draw_segment((left + right) * 0.5f, top, (left + right) * 0.5f, bot - 4, thick, r, g, b, 1.0f);
            draw_segment(left + 2, bot, (left + right) * 0.5f, bot - 4, thick, r, g, b, 1.0f);
            break;
        }
        case 'T': {
            draw_segment(left, top, right, top, thick, r, g, b, 1.0f);
            draw_segment((left + right) * 0.5f, top, (left + right) * 0.5f, bot, thick, r, g, b, 1.0f);
            break;
        }
        case 'X': {
            draw_segment(left, top, right, bot, thick, r, g, b, 1.0f);
            draw_segment(left, bot, right, top, thick, r, g, b, 1.0f);
            break;
        }
        case '^': {
            draw_segment(left, mid_y, (left + right) * 0.5f, top, thick, r, g, b, 1.0f);
            draw_segment((left + right) * 0.5f, top, right, mid_y, thick, r, g, b, 1.0f);
            break;
        }
        case 'v': {
            draw_segment(left, mid_y, (left + right) * 0.5f, bot, thick, r, g, b, 1.0f);
            draw_segment((left + right) * 0.5f, bot, right, mid_y, thick, r, g, b, 1.0f);
            break;
        }
        case 'O': {
            /* Simple checkmark "OK": a tick. */
            draw_segment(left, mid_y, left + size * 0.25f, bot - 2, thick, r, g, b, 1.0f);
            draw_segment(left + size * 0.25f, bot - 2, right, top, thick, r, g, b, 1.0f);
            break;
        }
        default: break;
    }
}

/* Public so teleport_menu can draw its own buttons using the same
 * primitives (matches the look of the other HUD buttons). */
void mobile_ui_draw_button(float cx, float cy, float r,
                           float fill_r, float fill_g, float fill_b, float fill_a,
                           float ring_r, float ring_g, float ring_b, float ring_a,
                           char glyph) {
    draw_circle_fan(cx, cy, r, 32, fill_r, fill_g, fill_b, fill_a);
    draw_ring      (cx, cy, r - 2.0f, r, 32, ring_r, ring_g, ring_b, ring_a);
    draw_glyph(glyph, cx, cy, 16.0f, 1.0f, 1.0f, 1.0f);
}

/* ----------------------------------------------------------------------- */

void mobile_ui_draw(void) {
    const float w = sapp_widthf();
    const float h = sapp_heightf();
    if (w <= 0.0f || h <= 0.0f) return;

    /* Two sticks at bottom corners. */
    const float left_sx  = BTN_MARGIN + STICK_RADIUS;
    const float left_sy  = h - BTN_MARGIN - STICK_RADIUS;
    const float right_sx = w - BTN_MARGIN - STICK_RADIUS;
    const float right_sy = h - BTN_MARGIN - STICK_RADIUS;

    /* Buttons stacked vertically to the left of the right stick. The
     * right thumb can hop between the look stick and the buttons
     * without crossing the screen. Order (top to bottom):
     *   TP / BREAK / PLACE / JUMP — jump at the bottom, closest to the
     *   stick so your thumb rests there. */
    const float bx = right_sx - STICK_RADIUS - BTN_GAP - BTN_RADIUS;
    const float j_y = right_sy + STICK_RADIUS - BTN_RADIUS;            /* bottom-aligned */
    const float p_y = j_y - (BTN_RADIUS * 2.0f + BTN_GAP);
    const float b_y = p_y - (BTN_RADIUS * 2.0f + BTN_GAP);
    const float tp_y = b_y - (BTN_RADIUS * 2.0f + BTN_GAP);

    /* Report hit rects to input.c. TP is its own button in the main
     * HUD; menu-nav buttons are registered by teleport_menu when open. */
    input_register_mobile_buttons(
        bx, b_y, BTN_RADIUS,
        bx, p_y, BTN_RADIUS,
        bx, j_y, BTN_RADIUS);
    {
        input_state_t* in = input_state_mut();
        in->btn_tp_cx = bx;
        in->btn_tp_cy = tp_y;
        in->btn_tp_r  = BTN_RADIUS;
    }

    /* Orthographic projection: (0,0) top-left to (w,h) bottom-right. */
    sgl_defaults();
    sgl_matrix_mode_projection();
    sgl_load_identity();
    sgl_ortho(0.0f, w, h, 0.0f, -1.0f, 1.0f);
    sgl_matrix_mode_modelview();
    sgl_load_identity();

    /* Alpha-blended 2D. sokol_gl defaults don't enable blending; set a
     * pipeline with SRC_ALPHA / ONE_MINUS_SRC_ALPHA below the UI. */
    static sgl_pipeline pip_alpha = (sgl_pipeline){0};
    if (pip_alpha.id == 0) {
        pip_alpha = sgl_make_pipeline(&(sg_pipeline_desc){
            .colors[0].blend = {
                .enabled = true,
                .src_factor_rgb = SG_BLENDFACTOR_SRC_ALPHA,
                .dst_factor_rgb = SG_BLENDFACTOR_ONE_MINUS_SRC_ALPHA,
                .src_factor_alpha = SG_BLENDFACTOR_ONE,
                .dst_factor_alpha = SG_BLENDFACTOR_ONE,
            },
        });
    }
    sgl_load_pipeline(pip_alpha);

    const input_state_t* in = input_state();

    /* ---- left stick (movement) ---- */
    draw_circle_fan(left_sx, left_sy, STICK_RADIUS,       32, 0.20f, 0.20f, 0.25f, 0.40f);
    draw_ring      (left_sx, left_sy, STICK_RADIUS - 2.0f, STICK_RADIUS, 32, 0.95f, 0.95f, 1.0f, 0.55f);
    {
        float kx = left_sx, ky = left_sy;
        if (in->stick_active) {
            kx += in->stick_x * (STICK_RADIUS - STICK_KNOB_R);
            ky -= in->stick_y * (STICK_RADIUS - STICK_KNOB_R);
        }
        draw_circle_fan(kx, ky, STICK_KNOB_R, 24, 0.95f, 0.95f, 1.0f, 0.85f);
    }

    /* ---- right stick (look) ---- */
    draw_circle_fan(right_sx, right_sy, STICK_RADIUS,       32, 0.20f, 0.25f, 0.20f, 0.40f);
    draw_ring      (right_sx, right_sy, STICK_RADIUS - 2.0f, STICK_RADIUS, 32, 0.85f, 1.00f, 0.90f, 0.55f);
    {
        float kx = right_sx, ky = right_sy;
        if (in->look_stick_active) {
            kx += in->look_stick_x * (STICK_RADIUS - STICK_KNOB_R);
            ky -= in->look_stick_y * (STICK_RADIUS - STICK_KNOB_R);
        }
        draw_circle_fan(kx, ky, STICK_KNOB_R, 24, 0.85f, 1.00f, 0.90f, 0.85f);
    }

    /* ---- three round buttons, stacked vertically left of the right stick ---- */
    /* Break (red) */
    draw_circle_fan(bx, b_y, BTN_RADIUS,        32, 0.50f, 0.15f, 0.15f, 0.50f);
    draw_ring      (bx, b_y, BTN_RADIUS - 2.0f, BTN_RADIUS, 32, 1.00f, 0.55f, 0.55f, 0.75f);
    draw_glyph('B', bx, b_y, 16.0f, 1.0f, 0.9f, 0.9f);

    /* Place (green) */
    draw_circle_fan(bx, p_y, BTN_RADIUS,        32, 0.15f, 0.45f, 0.20f, 0.50f);
    draw_ring      (bx, p_y, BTN_RADIUS - 2.0f, BTN_RADIUS, 32, 0.65f, 1.00f, 0.70f, 0.75f);
    draw_glyph('P', bx, p_y, 16.0f, 0.9f, 1.0f, 0.9f);

    /* Jump / jetpack (yellow) — closest to the stick so hold-to-fly is easy */
    draw_circle_fan(bx, j_y, BTN_RADIUS,        32, 0.40f, 0.40f, 0.15f, 0.50f);
    draw_ring      (bx, j_y, BTN_RADIUS - 2.0f, BTN_RADIUS, 32, 1.00f, 0.95f, 0.55f, 0.75f);
    draw_glyph('J', bx, j_y, 16.0f, 1.0f, 1.0f, 0.9f);

    /* Teleport (purple) — top of the stack, out of the way of the
     * combat-relevant buttons. */
    draw_circle_fan(bx, tp_y, BTN_RADIUS,        32, 0.35f, 0.20f, 0.50f, 0.50f);
    draw_ring      (bx, tp_y, BTN_RADIUS - 2.0f, BTN_RADIUS, 32, 0.85f, 0.60f, 1.00f, 0.75f);
    /* Use 'P' for teleport — we don't have a T glyph and it reads as
     * "portal" well enough. */
    draw_glyph('T', bx, tp_y, 16.0f, 1.0f, 0.95f, 1.0f);

    /* Teleport-menu nav buttons piggyback on this state block so they
     * share the same orthographic pipeline + blend. */
    teleport_menu_draw_mobile_buttons();

    sgl_draw();
}
