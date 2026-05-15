#include "client/chat.h"
#include "client/net_client.h"

#include "sokol_gfx.h"
#include "sokol_app.h"
#include "sokol_gl.h"
#include "sokol_log.h"
#include "sokol_time.h"
#include "sokol_debugtext.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define CHAT_NAME_MAX     32
/* Live-chat visibility: a new message stays on screen for 5 minutes
 * after it arrives, then fades over the last 15 seconds and drops off.
 * The compose box being open always shows the full retained scrollback
 * regardless of age. */
#define CHAT_FADE_HOLD_S  (5.0 * 60.0)
#define CHAT_FADE_OUT_S   15.0
/* On a fresh connection the server replays the room's recent chat as
 * a flurry of MSG_CHATs. They reach the client with current-time
 * stamps and would otherwise look like brand-new traffic. Treat any
 * MSG_CHAT received in the first CHAT_JOIN_GRACE_S after
 * chat_begin_session as backlog: stored in scrollback (visible when
 * the compose box opens), suppressed from the floating live panel. */
#define CHAT_JOIN_GRACE_S 1.5

typedef struct {
    char     name[CHAT_NAME_MAX];
    char     text[CHAT_TEXT_MAX + 1];
    double   recv_time_s;
    bool     is_backlog;
} chat_msg_t;

static struct {
    chat_msg_t history[CHAT_HISTORY_MAX];
    int        head;             /* next slot to write (ring buffer) */
    int        count;            /* number of valid entries (<= MAX) */

    bool       active;           /* compose box open */
    char       input_buf[CHAT_TEXT_MAX + 1];
    int        input_len;
    double     input_blink_start_s;

    /* Session-grace bookkeeping for backlog suppression. session_grace_until_s
     * is monotonic-now + grace at chat_begin_session; comparing inside
     * chat_post_recv decides whether the inbound message is backlog. */
    double     session_grace_until_s;
} C;

void chat_init(void) {
    memset(&C, 0, sizeof C);
}

void chat_shutdown(void) { }

bool chat_is_active(void) { return C.active; }

void chat_begin_session(void) {
    C.session_grace_until_s = stm_sec(stm_now()) + CHAT_JOIN_GRACE_S;
}

void chat_post_recv(uint32_t player_id, const char* name, const char* text) {
    (void)player_id;
    if (!text || !*text) return;
    chat_msg_t* m = &C.history[C.head];
    snprintf(m->name, sizeof m->name, "%s", name && *name ? name : "?");
    snprintf(m->text, sizeof m->text, "%s", text);
    m->recv_time_s = stm_sec(stm_now());
    m->is_backlog  = (m->recv_time_s < C.session_grace_until_s);
    C.head = (C.head + 1) % CHAT_HISTORY_MAX;
    if (C.count < CHAT_HISTORY_MAX) ++C.count;
}

/* ----------------------------------------------------------------- */
/* Input                                                              */
/* ----------------------------------------------------------------- */

static void open_compose(void) {
    C.active              = true;
    C.input_len           = 0;
    C.input_buf[0]        = 0;
    C.input_blink_start_s = stm_sec(stm_now());
}

static void close_compose(void) {
    C.active   = false;
    C.input_len = 0;
    C.input_buf[0] = 0;
}

static void submit_compose(void) {
    if (!C.active) return;
    if (C.input_len > 0) {
        net_client_send_chat(C.input_buf);
        /* The server's broadcast comes back via MSG_CHAT and lands
         * in chat_post_recv just like any peer's message — no need
         * to locally echo here. */
    }
    close_compose();
}

static void append_char(uint32_t ch) {
    if (!C.active) return;
    if (C.input_len >= CHAT_TEXT_MAX) return;
    /* Allow printable ASCII only — sokol_debugtext fonts don't have
     * Unicode coverage and the wire is ASCII anyway. Newline / CR
     * would also break the wire framing. */
    if (ch < 0x20 || ch > 0x7e) return;
    C.input_buf[C.input_len++] = (char)ch;
    C.input_buf[C.input_len]   = 0;
    C.input_blink_start_s = stm_sec(stm_now());
}

static void backspace(void) {
    if (!C.active || C.input_len == 0) return;
    C.input_buf[--C.input_len] = 0;
    C.input_blink_start_s = stm_sec(stm_now());
}

bool chat_event(const sapp_event* e) {
    if (C.active) {
        if (e->type == SAPP_EVENTTYPE_CHAR) {
            append_char(e->char_code);
            return true;
        }
        if (e->type == SAPP_EVENTTYPE_KEY_DOWN) {
            if (e->key_code == SAPP_KEYCODE_ENTER)     { submit_compose(); return true; }
            if (e->key_code == SAPP_KEYCODE_ESCAPE)    { close_compose();  return true; }
            if (e->key_code == SAPP_KEYCODE_BACKSPACE) { backspace();      return true; }
        }
        return true;     /* swallow everything while typing */
    }
    /* Idle: Enter opens the compose box. */
    if (e->type == SAPP_EVENTTYPE_KEY_DOWN && e->key_code == SAPP_KEYCODE_ENTER) {
        open_compose();
        return true;
    }
    return false;
}

/* ----------------------------------------------------------------- */
/* Draw                                                               */
/* ----------------------------------------------------------------- */

static sgl_pipeline pip_alpha;

static void ensure_pip(void) {
    if (pip_alpha.id != 0) return;
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

static void quad(float x, float y, float w, float h,
                  float r, float g, float b, float a) {
    sgl_begin_quads();
    sgl_c4f(r, g, b, a);
    sgl_v2f(x,     y);
    sgl_v2f(x + w, y);
    sgl_v2f(x + w, y + h);
    sgl_v2f(x,     y + h);
    sgl_end();
}

static void sdtx_text_at(const char* s, float screen_x, float screen_y,
                            float screen_w, float screen_h, float scale,
                            uint8_t r, uint8_t g, uint8_t b) {
    const float cell = 8.0f * scale;
    sdtx_canvas(screen_w / scale, screen_h / scale);
    sdtx_font(1);
    sdtx_origin(screen_x / cell, screen_y / cell);
    sdtx_color3b(r, g, b);
    sdtx_home();
    sdtx_printf("%s", s);
    sdtx_font(0);
}

void chat_draw(float screen_w, float screen_h) {
    if (C.count == 0 && !C.active) return;
    const double now = stm_sec(stm_now());

    sgl_defaults();
    sgl_matrix_mode_projection();
    sgl_load_identity();
    sgl_ortho(0.0f, screen_w, screen_h, 0.0f, -1.0f, 1.0f);
    sgl_matrix_mode_modelview();
    sgl_load_identity();
    ensure_pip();
    sgl_load_pipeline(pip_alpha);

    /* Compose box parked above the hotbar so the input + caret don't
     * sit on top of the slot row. The hotbar reserves
     * (BOTTOM_MARGIN + SLOT_SIZE) = 66 px from the bottom; lift the
     * input enough to clear it with a small visual gap. Width is
     * half the screen (pinned to the left margin) per the chat-bar
     * sizing rule - the rest of the bottom-row real estate belongs
     * to the hotbar centred on the right. */
    const float input_h    = 32.0f;
    const float pad        = 12.0f;
    const float hotbar_top = 66.0f + 8.0f;   /* hotbar + small gap */
    const float input_y    = screen_h - input_h - hotbar_top;
    const float input_w    = (screen_w - pad * 2.0f) * 0.5f;
    const float input_right = pad + input_w;
    if (C.active) {
        quad(pad, input_y, input_w, input_h,
             0.06f, 0.07f, 0.10f, 0.92f);
        /* Border */
        sgl_begin_quads();
        sgl_c4f(0.55f, 0.65f, 0.85f, 0.85f);
        const float t = 1.5f;
        sgl_v2f(pad,                 input_y);
        sgl_v2f(input_right,         input_y);
        sgl_v2f(input_right,         input_y + t);
        sgl_v2f(pad,                 input_y + t);
        sgl_v2f(pad,                 input_y + input_h - t);
        sgl_v2f(input_right,         input_y + input_h - t);
        sgl_v2f(input_right,         input_y + input_h);
        sgl_v2f(pad,                 input_y + input_h);
        sgl_v2f(pad,                 input_y);
        sgl_v2f(pad + t,             input_y);
        sgl_v2f(pad + t,             input_y + input_h);
        sgl_v2f(pad,                 input_y + input_h);
        sgl_v2f(input_right - t,     input_y);
        sgl_v2f(input_right,         input_y);
        sgl_v2f(input_right,         input_y + input_h);
        sgl_v2f(input_right - t,     input_y + input_h);
        sgl_end();
        /* Blinking caret at end of typed text. */
        double t_since = now - C.input_blink_start_s;
        bool blink_on = (((int)(t_since * 2.0)) & 1) == 0;
        if (blink_on) {
            const float scale = 1.5f;
            const float cell  = 8.0f * scale;
            float caret_x = pad + 28.0f + cell * (float)C.input_len;
            quad(caret_x, input_y + 6.0f, 2.0f, input_h - 12.0f,
                 1.0f, 0.95f, 0.30f, 1.0f);
        }
    }

    /* History panel — semi-opaque backdrop only when there's content
     * so it doesn't permanently darken the corner. When the compose
     * box is open the player is reading back the conversation, so
     * show every retained message regardless of age or backlog flag.
     * Otherwise: only real-time messages received within the live
     * window (5 min + fade tail) make it to the floating panel.
     * Backlog (the server's join-time chat replay) stays in
     * scrollback - visible the moment the player opens the compose
     * box - but doesn't pollute the live HUD with already-seen
     * traffic.
     *
     * Resolved indices land in visible_idx[] so the row-render loop
     * below can walk a dense list without re-deriving the skip
     * conditions (and without subtly diverging on interleaved
     * backlog vs real-time entries, which the previous index-stride
     * approach silently mis-rendered). */
    int visible_idx[CHAT_HISTORY_MAX];
    int visible = 0;
    for (int i = 0; i < C.count; ++i) {
        int idx = (C.head - 1 - i + CHAT_HISTORY_MAX) % CHAT_HISTORY_MAX;
        const chat_msg_t* m = &C.history[idx];
        if (!C.active) {
            if (m->is_backlog) continue;
            double age = now - m->recv_time_s;
            if (age >= CHAT_FADE_HOLD_S + CHAT_FADE_OUT_S) break;
        }
        visible_idx[visible++] = idx;
        if (visible >= CHAT_HISTORY_MAX) break;
    }
    if (visible > 0) {
        const float row_h    = 18.0f;
        const float panel_h  = (float)visible * row_h + 8.0f;
        const float panel_w  = screen_w * 0.45f;
        const float panel_x  = pad;
        const float panel_y  = input_y - panel_h - 6.0f;
        quad(panel_x, panel_y, panel_w, panel_h, 0.05f, 0.06f, 0.10f, 0.55f);
    }
    /* sgl_draw is centralised in main_web's frame end - see comment
     * at that flush site. Calling it here would lock the GPU upload
     * to chat's vertex range and drop every later module's quads. */

    /* Compose-box label + typed text. */
    if (C.active) {
        sdtx_text_at("> ", pad + 12.0f, input_y + 10.0f,
                       screen_w, screen_h, 1.5f, 0xff, 0xff, 0xff);
        if (C.input_len > 0) {
            sdtx_text_at(C.input_buf, pad + 28.0f, input_y + 10.0f,
                           screen_w, screen_h, 1.5f, 0xff, 0xff, 0xff);
        } else {
            sdtx_text_at("(say something - Enter to send, Esc to cancel)",
                           pad + 28.0f, input_y + 10.0f,
                           screen_w, screen_h, 1.0f, 0x55, 0x60, 0x70);
        }
    }
    /* History rows, newest at the bottom (closest to compose box). */
    if (visible > 0) {
        const float row_h   = 18.0f;
        const float panel_h = (float)visible * row_h + 8.0f;
        const float row_x0  = pad + 8.0f;
        const float panel_y = input_y - panel_h - 6.0f;
        for (int i = 0; i < visible; ++i) {
            const chat_msg_t* m = &C.history[visible_idx[i]];
            double age = now - m->recv_time_s;
            float alpha = 1.0f;
            if (!C.active && age > CHAT_FADE_HOLD_S) {
                alpha = (float)((CHAT_FADE_HOLD_S + CHAT_FADE_OUT_S - age)
                                / CHAT_FADE_OUT_S);
                if (alpha < 0.0f) alpha = 0.0f;
            }
            uint8_t name_r = (uint8_t)(0xff * alpha);
            uint8_t name_g = (uint8_t)(0xd8 * alpha);
            uint8_t name_b = (uint8_t)(0x80 * alpha);
            uint8_t txt_r  = (uint8_t)(0xf0 * alpha);
            uint8_t txt_g  = (uint8_t)(0xf0 * alpha);
            uint8_t txt_b  = (uint8_t)(0xf8 * alpha);
            float row_y = panel_y + (float)(visible - 1 - i) * row_h + 4.0f;

            char composed[CHAT_TEXT_MAX + 64];
            snprintf(composed, sizeof composed, "%s:", m->name);
            sdtx_text_at(composed, row_x0, row_y, screen_w, screen_h, 1.0f,
                          name_r, name_g, name_b);
            float text_x = row_x0 + 8.0f * (float)(strlen(m->name) + 1) + 4.0f;
            sdtx_text_at(m->text, text_x, row_y, screen_w, screen_h, 1.0f,
                          txt_r, txt_g, txt_b);
        }
    }
}
