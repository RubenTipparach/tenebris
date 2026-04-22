#include "client/mobile_ui.h"
#include "client/input.h"

#include "sokol_gfx.h"   /* sokol_gl uses sg_* types — must come first */
#include "sokol_app.h"
#include "sokol_log.h"
#include "sokol_gl.h"

#include <math.h>

/* ----------------------------------------------------------------------- */

#define BTN_RADIUS     44.0f
#define BTN_MARGIN     24.0f
#define BTN_GAP        20.0f
#define STICK_RADIUS   72.0f
#define STICK_KNOB_R   28.0f

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
        default: break;
    }
}

/* ----------------------------------------------------------------------- */

void mobile_ui_draw(void) {
    const float w = sapp_widthf();
    const float h = sapp_heightf();
    if (w <= 0.0f || h <= 0.0f) return;

    /* Button positions, bottom-right corner. Order (from right to left):
     *   BREAK (left-click equivalent, red-ish)
     *   PLACE (right-click equivalent, green-ish)
     * and above them:
     *   JUMP  (centered above the other two). */
    const float by = h - BTN_MARGIN - BTN_RADIUS;
    const float bx_break = w - BTN_MARGIN - BTN_RADIUS;
    const float bx_place = bx_break - (BTN_RADIUS * 2.0f + BTN_GAP);
    const float jy = by - (BTN_RADIUS * 2.0f + BTN_GAP);
    const float jx = (bx_break + bx_place) * 0.5f;

    /* Joystick base: bottom-left corner, slightly inset. */
    const float sx = BTN_MARGIN + STICK_RADIUS;
    const float sy = h - BTN_MARGIN - STICK_RADIUS;

    /* Report hit rects back to input.c so touches can be classified. */
    input_register_mobile_buttons(
        bx_break, by, BTN_RADIUS,
        bx_place, by, BTN_RADIUS,
        jx, jy, BTN_RADIUS);

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

    /* ---- virtual joystick ---- */
    draw_circle_fan(sx, sy, STICK_RADIUS,       48, 0.2f, 0.2f, 0.25f, 0.40f);
    draw_ring      (sx, sy, STICK_RADIUS - 3.0f, STICK_RADIUS, 48, 0.95f, 0.95f, 1.0f, 0.55f);

    const input_state_t* in = input_state();
    float kx = sx, ky = sy;
    if (in->stick_active) {
        kx += in->stick_x * (STICK_RADIUS - STICK_KNOB_R);
        ky -= in->stick_y * (STICK_RADIUS - STICK_KNOB_R);   /* screen Y grows down */
    }
    draw_circle_fan(kx, ky, STICK_KNOB_R, 32, 0.95f, 0.95f, 1.0f, 0.85f);

    /* ---- three round buttons ---- */
    /* Break (red tint) */
    draw_circle_fan(bx_break, by, BTN_RADIUS, 48, 0.50f, 0.15f, 0.15f, 0.50f);
    draw_ring      (bx_break, by, BTN_RADIUS - 3.0f, BTN_RADIUS, 48, 1.0f, 0.55f, 0.55f, 0.75f);
    draw_glyph('B', bx_break, by, 28.0f, 1.0f, 0.9f, 0.9f);

    /* Place (green tint) */
    draw_circle_fan(bx_place, by, BTN_RADIUS, 48, 0.15f, 0.45f, 0.20f, 0.50f);
    draw_ring      (bx_place, by, BTN_RADIUS - 3.0f, BTN_RADIUS, 48, 0.65f, 1.0f, 0.70f, 0.75f);
    draw_glyph('P', bx_place, by, 28.0f, 0.9f, 1.0f, 0.9f);

    /* Jump (neutral / yellow) */
    draw_circle_fan(jx, jy, BTN_RADIUS, 48, 0.40f, 0.40f, 0.15f, 0.50f);
    draw_ring      (jx, jy, BTN_RADIUS - 3.0f, BTN_RADIUS, 48, 1.0f, 0.95f, 0.55f, 0.75f);
    draw_glyph('J', jx, jy, 28.0f, 1.0f, 1.0f, 0.9f);

    sgl_draw();
}
