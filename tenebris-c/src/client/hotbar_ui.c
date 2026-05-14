#include "client/hotbar_ui.h"
#include "client/renderer.h"
#include "client/hex_mesher.h"   /* HEX_ATLAS_TILES, HEX_ATLAS_U_STEP */
#include "core/blocks.h"

#include "sokol_gfx.h"           /* must come first — sgl uses sg types */
#include "sokol_app.h"
#include "sokol_log.h"
#include "sokol_gl.h"
#include "sokol_debugtext.h"

#include <stdio.h>

/* Slot geometry (pixels). Slots are square; the bar sits centred
 * along the bottom edge with a small margin so it clears the mobile
 * joysticks at the corners. */
#define SLOT_SIZE       48.0f
#define SLOT_GAP        6.0f
#define BOTTOM_MARGIN   18.0f
#define ICON_PAD        4.0f

static sgl_pipeline P_FRAME;     /* untextured alpha-blended frames + bg */
static sgl_pipeline P_ICON;      /* textured alpha-blended icon quads    */
static bool         P_READY;

void hotbar_ui_init(void) {
    if (P_READY) return;
    /* Both pipelines share the standard SRC_ALPHA / 1-SRC_ALPHA blend
     * mobile_ui already uses, so the hotbar composes cleanly with the
     * underlying scene + overlays. Two separate pipelines because
     * sokol_gl needs a textured-vs-untextured pipeline split (the
     * default pipeline is untextured; binding a texture to it would
     * sample garbage). */
    sg_pipeline_desc blend_desc = {
        .colors[0].blend = {
            .enabled = true,
            .src_factor_rgb   = SG_BLENDFACTOR_SRC_ALPHA,
            .dst_factor_rgb   = SG_BLENDFACTOR_ONE_MINUS_SRC_ALPHA,
            .src_factor_alpha = SG_BLENDFACTOR_ONE,
            .dst_factor_alpha = SG_BLENDFACTOR_ONE,
        },
    };
    P_FRAME = sgl_make_pipeline(&blend_desc);
    P_ICON  = sgl_make_pipeline(&blend_desc);
    P_READY = true;
}

void hotbar_ui_shutdown(void) {
    /* Pipelines are freed by sgl_shutdown when mobile_ui_shutdown
     * tears down the global sgl context — no per-pipeline destroy
     * call needed. */
    P_READY = false;
}

/* ----------------------------------------------------------------------- */
/* Untextured primitives. */

static void filled_quad(float x, float y, float w, float h,
                        float r, float g, float b, float a) {
    sgl_begin_quads();
    sgl_c4f(r, g, b, a);
    sgl_v2f(x,     y    );
    sgl_v2f(x + w, y    );
    sgl_v2f(x + w, y + h);
    sgl_v2f(x,     y + h);
    sgl_end();
}

static void frame_quad(float x, float y, float w, float h, float thick,
                       float r, float g, float b, float a) {
    /* Top + bottom + left + right strips. */
    filled_quad(x,                 y,                 w,     thick, r, g, b, a);
    filled_quad(x,                 y + h - thick,     w,     thick, r, g, b, a);
    filled_quad(x,                 y,                 thick, h,     r, g, b, a);
    filled_quad(x + w - thick,     y,                 thick, h,     r, g, b, a);
}

/* ----------------------------------------------------------------------- */

void hotbar_ui_draw(const inventory_t* inv) {
    if (!P_READY || !inv) return;

    const float w = sapp_widthf();
    const float h = sapp_heightf();
    if (w <= 0.0f || h <= 0.0f) return;

    const int   slots   = INV_HOTBAR_SLOTS;
    const float total_w = (float)slots * SLOT_SIZE
                        + (float)(slots - 1) * SLOT_GAP;
    const float x0 = (w - total_w) * 0.5f;
    const float y0 = h - BOTTOM_MARGIN - SLOT_SIZE;

    /* Open a fresh sgl frame at pixel coordinates: (0,0) top-left,
     * (w,h) bottom-right. mobile_ui_draw uses an identical setup; the
     * two coexist as separate sgl_draw flushes. */
    sgl_defaults();
    sgl_matrix_mode_projection();
    sgl_load_identity();
    sgl_ortho(0.0f, w, h, 0.0f, -1.0f, 1.0f);
    sgl_matrix_mode_modelview();
    sgl_load_identity();

    /* ---- pass 1: untextured slot backgrounds + frames ---- */
    sgl_load_pipeline(P_FRAME);
    for (int i = 0; i < slots; ++i) {
        const float x = x0 + (float)i * (SLOT_SIZE + SLOT_GAP);
        const float y = y0;
        const bool  selected = (i == inv->selected);

        const float bg = selected ? 0.20f : 0.10f;
        filled_quad(x, y, SLOT_SIZE, SLOT_SIZE, bg, bg, bg + 0.02f, 0.80f);

        if (selected) {
            /* Bright outer frame slightly inflated so the active slot
             * pops above the rest of the bar. */
            frame_quad(x - 2.0f, y - 2.0f,
                       SLOT_SIZE + 4.0f, SLOT_SIZE + 4.0f, 2.5f,
                       1.00f, 0.88f, 0.30f, 0.95f);
        } else {
            frame_quad(x, y, SLOT_SIZE, SLOT_SIZE, 1.5f,
                       0.55f, 0.55f, 0.65f, 0.85f);
        }
    }

    /* ---- pass 2: textured icon quads, sampling the terrain atlas ---- */
    sgl_load_pipeline(P_ICON);
    sgl_enable_texture();
    sgl_texture(
        (sg_view)   { .id = renderer_atlas_view_id()    },
        (sg_sampler){ .id = renderer_atlas_sampler_id() });

    for (int i = 0; i < slots; ++i) {
        const inv_slot_t* s = &inv->slots[i];
        if (s->type == BLOCK_AIR || s->count <= 0) continue;

        const int   col = (int)block_face_tile(s->type, FACE_CAP_TOP);
        const float u0  = (float)col           * HEX_ATLAS_U_STEP;
        const float u1  = (float)(col + 1)     * HEX_ATLAS_U_STEP;

        const float ix = x0 + (float)i * (SLOT_SIZE + SLOT_GAP) + ICON_PAD;
        const float iy = y0 + ICON_PAD;
        const float iw = SLOT_SIZE - ICON_PAD * 2.0f;

        sgl_begin_quads();
        sgl_c4f(1.0f, 1.0f, 1.0f, 1.0f);
        sgl_v2f_t2f(ix,      iy,      u0, 0.0f);
        sgl_v2f_t2f(ix + iw, iy,      u1, 0.0f);
        sgl_v2f_t2f(ix + iw, iy + iw, u1, 1.0f);
        sgl_v2f_t2f(ix,      iy + iw, u0, 1.0f);
        sgl_end();
    }
    sgl_disable_texture();

    /* ---- pass 2b: black quantity badge under each finite-count slot ---
     * Sits on top of the textured icon but below the sdtx digits drawn
     * in pass 3, so the count reads clearly even when it overlaps a
     * bright tile colour. Sized to the digit string (8 px per char at
     * scale 1.0) + a 1-px halo. CREATIVE_COUNT (>9000) skips the badge
     * for the same reason pass 3 skips the digits - it's the "infinite"
     * sentinel and a giant number on every slot is just noise. */
    sgl_load_pipeline(P_FRAME);
    for (int i = 0; i < slots; ++i) {
        const inv_slot_t* s = &inv->slots[i];
        const float x = x0 + (float)i * (SLOT_SIZE + SLOT_GAP);
        const float y = y0;
        const float cell = 8.0f;

        /* Slot number badge at the top-left of every slot. The
         * number always renders in pass 3 (selected = bright
         * yellow, others = soft grey) but the underlying scene was
         * making it inconsistent to read - bright sky behind the
         * "1" of slot 1 erased it for the user. A black halo
         * matches the count badge at the bottom-right and gives
         * the digits a consistent surface. */
        {
            const float bx = x + 1.0f;
            const float by = y + 1.0f;
            const float n_w = cell + 2.0f;
            const float n_h = cell + 2.0f;
            filled_quad(bx, by, n_w, n_h, 0.0f, 0.0f, 0.0f, 0.85f);
        }

        /* Count badge (bottom-right). Only for finite-count slots;
         * empty slots have nothing to caption and CREATIVE_COUNT
         * (>9000) is the "infinite" sentinel. */
        if (s->type == BLOCK_AIR || s->count <= 0) continue;
        if (s->count > 9000) continue;
        char digits[16];
        int  n = snprintf(digits, sizeof(digits), "%d", s->count);
        const float text_w = cell * (float)n;
        const float bx = x + SLOT_SIZE - text_w - 3.0f;
        const float by = y + SLOT_SIZE - 11.0f;
        filled_quad(bx, by, text_w + 2.0f, cell + 2.0f,
                    0.0f, 0.0f, 0.0f, 0.85f);
    }

    /* No sgl_draw() here. sokol_gl uploads its vertex buffer only on
     * the FIRST sgl_draw of the frame, then never re-uploads; any
     * vertices queued by later modules would reference un-uploaded
     * GPU memory. main_web does a single sgl_draw at end of frame
     * after every UI module has queued. */

    /* ---- pass 3: slot numbers + finite-count badges via sdtx ---- */
    /* sdtx is fine to drive in a second flush per frame — main_web
     * already called sdtx_draw() before us, so this batch is its own
     * thing. Canvas is set to true pixels (8 px / cell at the oric
     * font) so we can position chars by dividing pixel coords by 8. */
    sdtx_canvas(w, h);
    sdtx_origin(0.0f, 0.0f);
    for (int i = 0; i < slots; ++i) {
        const inv_slot_t* s = &inv->slots[i];
        const float x = x0 + (float)i * (SLOT_SIZE + SLOT_GAP);
        const float y = y0;

        /* Slot number top-left. Bright on the selected slot, dim
         * otherwise — matches the frame highlight. */
        if (i == inv->selected) sdtx_color3b(0xff, 0xe0, 0x40);
        else                    sdtx_color3b(0xc0, 0xc0, 0xd0);
        sdtx_pos((x + 3.0f) / 8.0f, (y + 2.0f) / 8.0f);
        sdtx_printf("%d", i + 1);

        /* Stack count bottom-right. CREATIVE_COUNT (9999) is the
         * "effectively infinite" sentinel inventory.c sets — skip the
         * badge there because a giant number on every slot is just
         * noise. */
        if (s->type == BLOCK_AIR || s->count <= 0) continue;
        if (s->count > 9000) continue;
        char buf[16];
        int  n = snprintf(buf, sizeof(buf), "%d", s->count);
        sdtx_color3b(0xff, 0xff, 0xff);
        sdtx_pos((x + SLOT_SIZE - 8.0f * (float)n - 2.0f) / 8.0f,
                 (y + SLOT_SIZE - 10.0f) / 8.0f);
        sdtx_puts(buf);
    }
    sdtx_color3b(0xff, 0xff, 0xff);
    /* sdtx flush is centralised at the end of main_web's UI block.
     * Calling sdtx_draw here would force an early upload of the
     * vertex buffer, after which any text queued later in the same
     * frame (mining bar, pause overlay, nameplates) would render
     * stale GPU memory because sokol_debugtext guards
     * sg_update_buffer behind a once-per-frame frame_id check. */
}
