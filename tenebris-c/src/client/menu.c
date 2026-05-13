#include "client/menu.h"
#include "client/client_kv.h"
#include "client/mobile_ui.h"
#include "client/net_client.h"
#include "client/persistence.h"
#include "client/profile.h"

/* Trace logging. Was used to chase the menu-text-bleed bug (root
 * cause: multiple sdtx_draw calls per frame trip a once-per-frame
 * upload guard inside sokol_debugtext, so later draws read stale
 * GPU memory). Disabled now that the fix landed; flip the flag
 * to 1 to bring the timeline back if a new menu issue appears. */
#define MENU_TRACE_ENABLED 0
#if MENU_TRACE_ENABLED
#  define MENU_TRACE(fmt, ...) printf("[menu] " fmt "\n", ##__VA_ARGS__)
#else
#  define MENU_TRACE(...) ((void)0)
#endif

static const char* state_name(game_state_t s) {
    switch (s) {
        case GAME_PROFILE_SELECT:      return "PROFILE_SELECT";
        case GAME_PROFILE_NAME_INPUT:  return "PROFILE_NAME_INPUT";
        case GAME_MAIN_MENU:           return "MAIN_MENU";
        case GAME_SP_WORLD_LIST:       return "SP_WORLD_LIST";
        case GAME_SP_NEW_WORLD_INPUT:  return "SP_NEW_WORLD_INPUT";
        case GAME_MP_SUBMENU:          return "MP_SUBMENU";
        case GAME_MP_CLOUD_SUBMENU:    return "MP_CLOUD_SUBMENU";
        case GAME_MP_JOIN_INPUT:       return "MP_JOIN_INPUT";
        case GAME_MP_URL_PROMPT:       return "MP_URL_PROMPT";
        case GAME_IN_GAME_SP:          return "IN_GAME_SP";
        case GAME_IN_GAME_MP:          return "IN_GAME_MP";
        case GAME_MP_CONNECT_ERROR:    return "MP_CONNECT_ERROR";
    }
    return "?";
}

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

/* Generate a 6-char room code from a safe alphabet (no ambiguous
 * 0/O, 1/I). 32^6 = ~1 billion combinations, plenty for v1's small
 * concurrent-room count.
 *
 * (Last surviving EM_JS prompt-style helper — every text-input
 * dialog now uses the in-game text box per CLAUDE.md. This one
 * doesn't show a UI; it just generates a random string.) */
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

/* Mobile soft-keyboard shim. The in-canvas text box (drawn with
 * sokol_gl + sdtx) is the actual visible UI - this is purely the
 * plumbing that summons the OS keyboard on phones / tablets, because
 * a WebGL canvas never receives keyboard events on its own. We mount
 * an offscreen <input>, focus it when entering an input state, and
 * forward its 'input' / Enter / Escape events back into C via the
 * EMSCRIPTEN_KEEPALIVE callbacks below. The input element is
 * positioned at 1x1 px with opacity 0 so the player only ever sees
 * the in-canvas box, not an HTML widget.
 *
 * Doesn't violate the CLAUDE.md "no browser alert/prompt/confirm"
 * rule - the UI the user types into stays in the canvas. The hidden
 * <input> only exists because iOS / Android won't open their keyboard
 * unless a real DOM input is focused inside a user-gesture handler. */
EM_JS(void, menu_js_focus_text_input, (void), {
    var inp = document.getElementById('tenebris-text-input-shim');
    if (!inp) {
        inp = document.createElement('input');
        inp.id = 'tenebris-text-input-shim';
        inp.type = 'text';
        inp.autocapitalize = 'off';
        inp.autocomplete   = 'off';
        inp.autocorrect    = 'off';
        inp.spellcheck     = false;
        inp.setAttribute('aria-hidden', 'true');
        /* Visible to focus, invisible to the player. position:fixed
         * + opacity 0 + 1px size keeps it offscreen-ish without the
         * browser deciding to skip it on focus. */
        inp.style.cssText =
            'position:fixed;left:50%;top:50%;width:1px;height:1px;'
            + 'opacity:0;border:0;padding:0;margin:0;background:transparent;'
            + 'color:transparent;caret-color:transparent;z-index:-1;';
        document.body.appendChild(inp);

        var lastVal = '';
        inp.addEventListener('input', function() {
            var cur = inp.value;
            if (cur.length > lastVal.length) {
                for (var i = lastVal.length; i < cur.length; i++) {
                    Module.ccall('tenebris_js_input_char', null,
                                 ['number'], [cur.charCodeAt(i)]);
                }
            } else if (cur.length < lastVal.length) {
                var diff = lastVal.length - cur.length;
                for (var i = 0; i < diff; i++) {
                    Module.ccall('tenebris_js_input_backspace', null, [], []);
                }
            }
            lastVal = cur;
        });
        inp.addEventListener('keydown', function(ev) {
            if (ev.key === 'Enter') {
                Module.ccall('tenebris_js_input_submit', null, [], []);
                ev.preventDefault();
            } else if (ev.key === 'Escape') {
                Module.ccall('tenebris_js_input_cancel', null, [], []);
                ev.preventDefault();
            }
        });
        /* iOS Safari hides the keyboard the instant focus leaves the
         * input, so a tap anywhere else on the canvas would dismiss
         * it. We re-focus on blur if the C side still says we're in
         * an input state. */
        inp.addEventListener('blur', function() {
            if (Module.ccall('tenebris_js_in_input_state', 'number', [], [])) {
                setTimeout(function(){ inp.focus(); }, 0);
            }
        });
        window.__tenebris_input_shim_reset = function() { lastVal = ''; inp.value = ''; };
    }
    if (window.__tenebris_input_shim_reset) window.__tenebris_input_shim_reset();
    /* Synchronous focus inside the gesture - iOS Safari only opens
     * the soft keyboard if focus() is called from within a user
     * gesture handler (touchend / click). Our call chain came in
     * through sokol's touch event, so we're still on that stack. */
    inp.focus();
});

EM_JS(void, menu_js_blur_text_input, (void), {
    var inp = document.getElementById('tenebris-text-input-shim');
    if (inp) inp.blur();
});

/* Builds a share URL from the current page origin + path with the
 * room code in `?invite=`, then dispatches via the Web Share API on
 * mobile / supported browsers, or falls back to writing the URL to
 * the clipboard. Returns 1 = shared, 2 = copied to clipboard,
 * 0 = neither API available. Both navigator.share and
 * navigator.clipboard need user-gesture context; this is always
 * called from a touch / click handler so that's fine. */
EM_JS(int, menu_js_share_invite, (const char* room_code), {
    var c = UTF8ToString(room_code);
    if (!c) c = "";
    try {
        var url = window.location.origin + window.location.pathname
                + '?invite=' + encodeURIComponent(c);
        if (typeof navigator !== 'undefined' && navigator.share) {
            navigator.share({
                title: 'Tenebris',
                text:  'Join my Tenebris room',
                url:   url
            }).catch(function(){});
            return 1;
        }
        if (typeof navigator !== 'undefined'
            && navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).catch(function(){});
            return 2;
        }
    } catch (_e) { }
    return 0;
});
#else
static char* menu_js_new_room_code(void) {
    static char fake[7] = "AAAAAA";
    char* out = (char*)malloc(7);
    if (out) memcpy(out, fake, 7);
    return out;
}
static void menu_js_focus_text_input(void) { }
static void menu_js_blur_text_input(void)  { }
static int  menu_js_share_invite(const char* room_code) { (void)room_code; return 0; }
#endif

/* ------------------------------------------------------------------ */
/* State                                                                */
/* ------------------------------------------------------------------ */

typedef struct {
    float x, y, w, h;
    const char* label;
    int  hover;
    int  visible;
    int  disabled;        /* greyed-out, click does nothing */
} menu_button_t;

#define MAIN_BTN_W   240.0f
#define MAIN_BTN_H    56.0f
#define MAIN_BTN_GAP  16.0f

#define LIST_BTN_W   360.0f
#define LIST_BTN_H    36.0f
#define LIST_BTN_GAP   8.0f

/* Recent-room history shown on the MP cloud submenu. Max stored on
 * disk is generous; the visible window is smaller because the panel
 * has limited vertical space between the JOIN button and BACK. */
#define ROOM_HISTORY_MAX         8
#define ROOM_HISTORY_VISIBLE     4
#define ROOM_CODE_LEN            6
#define ROOM_HISTORY_KV_KEY      "tenebris-c:recent-rooms"

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
    /* MP submenu buttons.
     * MP top: btn_self_host (greyed, future) + btn_cloud_host (active).
     * Cloud submenu: btn_host (generates code) + btn_join (enters code). */
    menu_button_t btn_self_host;
    menu_button_t btn_cloud_host;
    menu_button_t btn_host;
    menu_button_t btn_join;

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

    /* MRU list of rooms the player has hosted / joined. Loaded from
     * client_kv on entering the cloud submenu, updated on every
     * successful connect (menu-driven or URL bypass). */
    char recent_rooms[ROOM_HISTORY_MAX][ROOM_CODE_LEN + 1];
    int  recent_room_count;
    menu_button_t btn_recent_room[ROOM_HISTORY_MAX];

    /* Connection-failure popup. Set on the GAME_IN_GAME_MP ->
     * GAME_MP_CONNECT_ERROR transition by menu_tick; cleared on
     * dismiss. Buffer matches net_client_error_message's max. */
    char error_msg[96];

    /* Pending deep-link invite waiting for a profile to exist before
     * we connect. menu_set_pending_invite fills these from
     * ?invite= / ?room= + ?server= at boot, and the profile-picker
     * exit path drains them via consume_pending_invite. Empty room
     * means no pending invite. */
    char pending_invite_room[9];
    char pending_invite_server[256];

    /* In-game pause overlay (Escape during gameplay). The world keeps
     * rendering underneath - menu_state() stays on the gameplay
     * state - so this is a side-channel visibility flag rather than
     * a new game_state_t entry. */
    bool          pause_visible;
    menu_button_t btn_pause_resume;
    menu_button_t btn_pause_quit;
    menu_button_t btn_pause_invite;
    menu_button_t btn_pause_options;  /* unused but kept to keep the struct symmetric across builds */
    /* Toast under the INVITE FRIENDS button after a successful share.
     * pause_share_msg_until is a sokol_time stamp; the label fades
     * once stm_now() passes it. share_result is 1=shared via Web
     * Share API, 2=copied to clipboard, 3=failure / no API. */
    int           pause_share_result;
    double        pause_share_msg_until;
} M;

/* ------------------------------------------------------------------ */
/* Hit test + layout                                                    */
/* ------------------------------------------------------------------ */

/* Forward decl: input-state membership predicate is used by both
 * menu_draw (early in the file) and menu_event (later). Definition
 * lives near the input handlers. */
static bool state_is_input(game_state_t s);

static bool hit(const menu_button_t* b, float x, float y) {
    if (!b->visible || b->disabled) return false;
    return x >= b->x && x <= b->x + b->w && y >= b->y && y <= b->y + b->h;
}

static void set_button(menu_button_t* b, float x, float y, float w, float h,
                         const char* label) {
    b->x = x; b->y = y; b->w = w; b->h = h;
    b->label = label;
    b->visible = 1;
    b->disabled = 0;
    b->hover = (M.mouse_x >= x && M.mouse_x <= x + w &&
                M.mouse_y >= y && M.mouse_y <= y + h);
}

/* Same as set_button but also marks the button as greyed-out: dimmer
 * fill, no hover state, no click. Used for not-yet-built features
 * (e.g. SELF HOSTED in the MP top-level submenu). */
static void set_button_disabled(menu_button_t* b, float x, float y, float w, float h,
                                  const char* label) {
    set_button(b, x, y, w, h, label);
    b->disabled = 1;
    b->hover    = 0;
}

static void hide_button(menu_button_t* b) {
    b->visible  = 0;
    b->hover    = 0;
    b->disabled = 0;
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
    hide_button(&M.btn_host);
    hide_button(&M.btn_join);
    hide_button(&M.btn_cloud_host);
}

static void layout_mp_submenu(float w, float h) {
    float cx = w * 0.5f;
    float cy = h * 0.5f;
    /* Two buttons: SELF HOSTED (disabled — "coming soon") and
     * CLOUD HOSTED (active — enters the cloud submenu). */
    set_button_disabled(&M.btn_self_host,
                          cx - MAIN_BTN_W * 0.5f,
                          cy - MAIN_BTN_H - MAIN_BTN_GAP * 0.5f,
                          MAIN_BTN_W, MAIN_BTN_H, "SELF HOSTED");
    set_button(&M.btn_cloud_host,
                 cx - MAIN_BTN_W * 0.5f,
                 cy + MAIN_BTN_GAP * 0.5f,
                 MAIN_BTN_W, MAIN_BTN_H, "CLOUD HOSTED");
    set_button(&M.btn_back,
                 cx - 120.0f, h * 0.5f + 220.0f, 240.0f, LIST_BTN_H, "BACK");
    hide_button(&M.btn_sp);
    hide_button(&M.btn_mp);
    hide_button(&M.btn_host);
    hide_button(&M.btn_host);
    hide_button(&M.btn_join);
    hide_button(&M.btn_active_profile);
    hide_button(&M.btn_new_world);
    for (int i = 0; i < PERSISTENCE_MAX_WORLDS; ++i) hide_button(&M.btn_world[i]);
    hide_button(&M.btn_new_profile);
    for (int i = 0; i < PROFILE_MAX; ++i) hide_button(&M.btn_profile[i]);
}

static void layout_mp_cloud_submenu(float w, float h) {
    float cx = w * 0.5f;
    float cy = h * 0.5f;
    set_button(&M.btn_host,
                 cx - MAIN_BTN_W * 0.5f,
                 cy - MAIN_BTN_H - MAIN_BTN_GAP * 0.5f,
                 MAIN_BTN_W, MAIN_BTN_H, "HOST");
    set_button(&M.btn_join,
                 cx - MAIN_BTN_W * 0.5f,
                 cy + MAIN_BTN_GAP * 0.5f,
                 MAIN_BTN_W, MAIN_BTN_H, "JOIN");
    /* Recent-room list under the JOIN button. Leave room above the
     * BACK button at h*0.5+220; with LIST_BTN_H=36 + GAP=8 that's
     * ~4 rows plus a heading line. */
    float ry = cy + MAIN_BTN_H + MAIN_BTN_GAP * 0.5f + 28.0f;
    for (int i = 0; i < ROOM_HISTORY_MAX; ++i) {
        if (i < M.recent_room_count && i < ROOM_HISTORY_VISIBLE) {
            set_button(&M.btn_recent_room[i],
                         cx - LIST_BTN_W * 0.5f, ry,
                         LIST_BTN_W, LIST_BTN_H, M.recent_rooms[i]);
            ry += LIST_BTN_H + LIST_BTN_GAP;
        } else {
            hide_button(&M.btn_recent_room[i]);
        }
    }
    set_button(&M.btn_back,
                 cx - 120.0f, h * 0.5f + 220.0f, 240.0f, LIST_BTN_H, "BACK");
    hide_button(&M.btn_sp);
    hide_button(&M.btn_mp);
    hide_button(&M.btn_self_host);
    hide_button(&M.btn_cloud_host);
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
    hide_button(&M.btn_host);
    hide_button(&M.btn_join);
    hide_button(&M.btn_host);
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
    hide_button(&M.btn_host);
    hide_button(&M.btn_join);
    hide_button(&M.btn_cloud_host);
}

static void layout_connect_error(float w, float h) {
    /* Single centred BACK TO MENU button under the error panel. The
     * panel itself isn't a button — we draw it in menu_draw and only
     * hit-test this one. */
    float cx = w * 0.5f;
    set_button(&M.btn_back,
                 cx - MAIN_BTN_W * 0.5f,
                 h * 0.5f + 40.0f,
                 MAIN_BTN_W, MAIN_BTN_H, "BACK TO MENU");
    hide_button(&M.btn_sp);
    hide_button(&M.btn_mp);
    hide_button(&M.btn_self_host);
    hide_button(&M.btn_cloud_host);
    hide_button(&M.btn_host);
    hide_button(&M.btn_join);
    hide_button(&M.btn_active_profile);
    hide_button(&M.btn_new_world);
    for (int i = 0; i < PERSISTENCE_MAX_WORLDS; ++i) hide_button(&M.btn_world[i]);
    hide_button(&M.btn_new_profile);
    for (int i = 0; i < PROFILE_MAX; ++i) hide_button(&M.btn_profile[i]);
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
    hide_button(&M.btn_host);
    hide_button(&M.btn_join);
    hide_button(&M.btn_cloud_host);
}

static void layout(float w, float h) {
    /* Recent-room buttons only appear on GAME_MP_CLOUD_SUBMENU; default
     * them to hidden so they don't bleed onto any other screen. The
     * cloud-submenu layout re-sets the visible subset after this. */
    for (int i = 0; i < ROOM_HISTORY_MAX; ++i) hide_button(&M.btn_recent_room[i]);

    /* Bulk-hide every named button up front. Each per-state
     * layout_X() function below only has to SET the buttons it
     * actually uses; it never has to remember to hide a stranger
     * from a different screen. This is the single fence keeping
     * "HOST" / "JOIN" / "+ NEW WORLD" / etc. from bleeding through
     * when the state machine transitions - the previous root cause
     * of menu UI surviving into gameplay was a hide_button() that
     * one screen forgot to call. */
    hide_button(&M.btn_sp);
    hide_button(&M.btn_mp);
    hide_button(&M.btn_back);
    hide_button(&M.btn_active_profile);
    hide_button(&M.btn_new_world);
    for (int i = 0; i < PERSISTENCE_MAX_WORLDS; ++i) hide_button(&M.btn_world[i]);
    hide_button(&M.btn_new_profile);
    for (int i = 0; i < PROFILE_MAX; ++i) hide_button(&M.btn_profile[i]);
    hide_button(&M.btn_self_host);
    hide_button(&M.btn_cloud_host);
    hide_button(&M.btn_host);
    hide_button(&M.btn_join);

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
        case GAME_MP_CLOUD_SUBMENU:
            layout_mp_cloud_submenu(w, h); break;
        case GAME_MP_JOIN_INPUT:
        case GAME_PROFILE_NAME_INPUT:
        case GAME_SP_NEW_WORLD_INPUT:
            layout_join_input(w, h); break;     /* same layout: just BACK + box */
        case GAME_MP_CONNECT_ERROR:
            layout_connect_error(w, h); break;
        default:
            /* GAME_IN_GAME_SP / GAME_IN_GAME_MP land here. menu_draw
             * early-returns in those states so geometry never draws,
             * but hide every menu button anyway so any future overlay
             * that re-uses these structs can't render a stale "+ NEW
             * WORLD" / "+ NEW PROFILE" / world-list row. Defense in
             * depth against UI bleed when gameplay starts. */
            hide_button(&M.btn_sp);
            hide_button(&M.btn_mp);
            hide_button(&M.btn_back);
            hide_button(&M.btn_active_profile);
            hide_button(&M.btn_new_world);
            for (int i = 0; i < PERSISTENCE_MAX_WORLDS; ++i) hide_button(&M.btn_world[i]);
            hide_button(&M.btn_new_profile);
            for (int i = 0; i < PROFILE_MAX; ++i) hide_button(&M.btn_profile[i]);
            hide_button(&M.btn_self_host);
            hide_button(&M.btn_cloud_host);
            hide_button(&M.btn_host);
            hide_button(&M.btn_join);
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
    if (b->disabled) {
        /* Dim fill + dim border; matches the "future feature" tone in
         * the rest of the UI. */
        quad(b->x, b->y, b->w, b->h, 0.08f, 0.09f, 0.12f, 0.85f);
        border(b->x, b->y, b->w, b->h, 2.0f, 0.35f, 0.38f, 0.45f, 0.85f);
        return;
    }
    if (b->hover) quad(b->x, b->y, b->w, b->h, 0.22f, 0.30f, 0.42f, 0.95f);
    else          quad(b->x, b->y, b->w, b->h, 0.12f, 0.14f, 0.19f, 0.90f);
    border(b->x, b->y, b->w, b->h, 2.0f, 0.85f, 0.90f, 1.0f, 1.0f);
}

void menu_draw(int screen_w, int screen_h) {
    if (!menu_is_overlay()) return;
    /* Throttle to 1Hz so console isn't flooded. */
    {
        static double s_last_log = 0.0;
        double now = stm_sec(stm_now());
        if (now - s_last_log > 1.0) {
            s_last_log = now;
            MENU_TRACE("menu_draw: state=%s pause=%d w=%d h=%d",
                       state_name(M.state), (int)M.pause_visible,
                       screen_w, screen_h);
        }
    }

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

    /* Container panel behind every menu state's content. Sits the
     * buttons + title + helper text on a single readable surface
     * instead of letting them float on the dim sky - which was the
     * "needs a box behind it" complaint. Sized generously so the
     * world picker / profile picker / cloud submenu all fit. Slight
     * border (matched to draw_button's outline) ties everything
     * together. Drawn before the buttons so it sits underneath. */
    if (M.state != GAME_PROFILE_SELECT
        && M.state != GAME_MP_URL_PROMPT
        && M.state != GAME_MP_CONNECT_ERROR) {
        const float panel_w = 520.0f;
        const float panel_h = 540.0f;
        const float px = w * 0.5f - panel_w * 0.5f;
        const float py = h * 0.5f - panel_h * 0.5f;
        quad(px, py, panel_w, panel_h, 0.10f, 0.12f, 0.18f, 0.95f);
        border(px, py, panel_w, panel_h, 2.0f, 0.85f, 0.90f, 1.0f, 1.0f);
    }

    /* Geometry */
    draw_button(&M.btn_sp);
    draw_button(&M.btn_mp);
    draw_button(&M.btn_self_host);
    draw_button(&M.btn_cloud_host);
    draw_button(&M.btn_host);
    draw_button(&M.btn_join);
    draw_button(&M.btn_active_profile);
    draw_button(&M.btn_new_profile);
    for (int i = 0; i < PROFILE_MAX; ++i) draw_button(&M.btn_profile[i]);
    draw_button(&M.btn_new_world);
    for (int i = 0; i < PERSISTENCE_MAX_WORLDS; ++i) draw_button(&M.btn_world[i]);
    for (int i = 0; i < ROOM_HISTORY_MAX; ++i) draw_button(&M.btn_recent_room[i]);
    draw_button(&M.btn_back);

    if (M.state == GAME_MP_URL_PROMPT) {
        quad(w * 0.5f - 200.0f, h * 0.5f + 160.0f, 400.0f, 40.0f,
             0.20f, 0.20f, 0.22f, 0.90f);
    }

    /* Connection-failed popup panel. Dim red border so the warning
     * reads at a glance; matches the title colour used in the text
     * pass below. */
    if (M.state == GAME_MP_CONNECT_ERROR) {
        const float panel_w = 480.0f;
        const float panel_h = 160.0f;
        const float px = w * 0.5f - panel_w * 0.5f;
        const float py = h * 0.5f - panel_h - 40.0f;
        quad(px, py, panel_w, panel_h, 0.10f, 0.07f, 0.09f, 0.95f);
        border(px, py, panel_w, panel_h, 2.0f, 1.0f, 0.45f, 0.45f, 1.0f);
    }

    /* In-game text-input box for JOIN flow. Real drawn rect, blinking
     * cursor, all driven by SAPP CHAR / KEY_DOWN events. No browser
     * prompt — per CLAUDE.md the canvas owns every input panel. */
    if (state_is_input(M.state)) {
        /* Wider box for the longer name inputs; the room JOIN box
         * stays the same shape it had. */
        bool is_long_input = (M.state == GAME_PROFILE_NAME_INPUT
                              || M.state == GAME_SP_NEW_WORLD_INPUT);
        const float box_w  = is_long_input ? 480.0f : 320.0f;
        const float box_h  = 48.0f;
        const float bx = w * 0.5f - box_w * 0.5f;
        const float by = h * 0.5f - 24.0f;
        const float input_text_scale = is_long_input ? 2.0f : 3.0f;

        quad(bx, by, box_w, box_h, 0.12f, 0.14f, 0.19f, 0.95f);
        border(bx, by, box_w, box_h, 2.0f, 0.85f, 0.90f, 1.0f, 1.0f);

        double t_since = stm_sec(stm_now()) - M.input_cursor_blink_start;
        bool blink_on = (((int)(t_since * 2.0)) & 1) == 0;
        if (blink_on) {
            const float cell = 8.0f * input_text_scale;
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
            /* No empty-state hint: "+ NEW PROFILE" is the first
             * button in the picker. Floating grey text below it
             * reads as junk. */
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
            /* No empty-state hint: "+ NEW WORLD" is the first button
             * in the list and reads as the obvious next click. A
             * floating "click + new world" line above it was
             * confusable as stray UI. */
            break;
        case GAME_MP_SUBMENU:
            draw_text_centered("MULTIPLAYER", cx, h * 0.5f - 200.0f, 3.0f,
                                 0xff, 0xff, 0xff);
            /* Shortened hint lines so they fit on narrow screens.
             * The old "...run the server on your machine (coming
             * soon)" + "...play on the shared fly.io server" pair
             * overflowed past the panel edge on phones and ended up
             * spelling out across multiple frames as the user saw
             * stale fragments. Keep the explanation tight. */
            draw_text_centered("self hosted = your machine (coming soon)",
                                 cx, h * 0.5f + 180.0f, 1.0f,
                                 0x70, 0x78, 0x88);
            draw_text_centered("cloud hosted = shared fly.io server",
                                 cx, h * 0.5f + 196.0f, 1.0f,
                                 0xa0, 0xb0, 0xc8);
            break;
        case GAME_MP_CLOUD_SUBMENU:
            draw_text_centered("CLOUD HOSTED", cx, h * 0.5f - 200.0f, 3.0f,
                                 0xff, 0xff, 0xff);
            if (M.recent_room_count > 0) {
                /* Heading sits just above the first recent-room button.
                 * Y matches the offset used in layout_mp_cloud_submenu. */
                float ry_heading = h * 0.5f
                                 + MAIN_BTN_H + MAIN_BTN_GAP * 0.5f + 8.0f;
                draw_text_centered("RECENT ROOMS", cx, ry_heading, 1.0f,
                                     0xa0, 0xb0, 0xc8);
            }
            /* No empty-state hint when there are no recent rooms - the
             * HOST / JOIN buttons are self-explanatory and a floating
             * line of grey text in the middle of the panel reads as
             * stray junk to first-time players. */
            break;
        case GAME_MP_CONNECT_ERROR: {
            /* Geometry was already flushed above. Just the title /
             * message text here; the BACK button label is rendered by
             * the generic button-label loop further down. Panel
             * coordinates mirror the geometry block — keep in sync. */
            const float panel_h = 160.0f;
            const float py = h * 0.5f - panel_h - 40.0f;
            draw_text_centered("CONNECTION FAILED",
                                 cx, py + 28.0f, 2.5f,
                                 0xff, 0xa0, 0xa0);
            if (M.error_msg[0]) {
                draw_text_centered(M.error_msg,
                                     cx, py + 84.0f, 1.5f,
                                     0xff, 0xff, 0xff);
            }
            break;
        }
        case GAME_MP_JOIN_INPUT:
        case GAME_PROFILE_NAME_INPUT:
        case GAME_SP_NEW_WORLD_INPUT: {
            const char* title = "JOIN ROOM";
            const char* hint  = "type the 6-char code  -  Enter to join  -  Esc to cancel";
            const char* placeholder = "(type here)";
            float text_scale = 3.0f;
            if (M.state == GAME_PROFILE_NAME_INPUT) {
                title       = "NEW PROFILE";
                hint        = "type your name  -  Enter to create  -  Esc to cancel";
                placeholder = "(type your name)";
                text_scale  = 2.0f;       /* names are longer than codes */
            } else if (M.state == GAME_SP_NEW_WORLD_INPUT) {
                title       = "NAME YOUR WORLD";
                hint        = "type a world name  -  Enter to create  -  Esc to cancel";
                placeholder = "(type a world name)";
                text_scale  = 2.0f;
            }
            draw_text_centered(title, cx, h * 0.5f - 200.0f, 3.0f,
                                 0xff, 0xff, 0xff);
            draw_text_centered(hint,  cx, h * 0.5f + 60.0f, 1.0f,
                                 0xa0, 0xb0, 0xc8);
            if (M.input_len > 0) {
                draw_text_centered(M.input_buf, cx, h * 0.5f - 12.0f,
                                     text_scale, 0xff, 0xff, 0xff);
            } else {
                draw_text_centered(placeholder, cx, h * 0.5f - 4.0f, 1.5f,
                                     0x55, 0x60, 0x70);
            }
            break;
        }
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
        /* Disabled buttons get a muted label colour to match their
         * dimmer fill. */
        uint8_t lr = M.btn_self_host.disabled ? 0x70 : 0xff;
        uint8_t lg = M.btn_self_host.disabled ? 0x78 : 0xff;
        uint8_t lb = M.btn_self_host.disabled ? 0x88 : 0xff;
        draw_text_centered(M.btn_self_host.label, bx, by, 2.0f, lr, lg, lb);
    }
    if (M.btn_cloud_host.visible) {
        float bx = M.btn_cloud_host.x + M.btn_cloud_host.w * 0.5f;
        float by = M.btn_cloud_host.y + (M.btn_cloud_host.h - 8.0f * 2.0f) * 0.5f;
        draw_text_centered(M.btn_cloud_host.label, bx, by, 2.0f, 0xff, 0xff, 0xff);
    }
    if (M.btn_host.visible) {
        float bx = M.btn_host.x + M.btn_host.w * 0.5f;
        float by = M.btn_host.y + (M.btn_host.h - 8.0f * 2.0f) * 0.5f;
        draw_text_centered(M.btn_host.label, bx, by, 2.0f, 0xff, 0xff, 0xff);
    }
    if (M.btn_join.visible) {
        float bx = M.btn_join.x + M.btn_join.w * 0.5f;
        float by = M.btn_join.y + (M.btn_join.h - 8.0f * 2.0f) * 0.5f;
        draw_text_centered(M.btn_join.label, bx, by, 2.0f, 0xff, 0xff, 0xff);
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
    for (int i = 0; i < ROOM_HISTORY_MAX; ++i) {
        const menu_button_t* b = &M.btn_recent_room[i];
        if (!b->visible) continue;
        float bx = b->x + b->w * 0.5f;
        float by = b->y + (b->h - 8.0f * 1.5f) * 0.5f;
        draw_text_centered(b->label, bx, by, 1.5f, 0xff, 0xff, 0xff);
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

    /* Single sdtx_draw happens in main_web (gameplay path uses the
     * end-of-frame flush; menu path uses the one right after this
     * call returns). Calling sdtx_draw twice per frame triggers the
     * once-per-frame sg_update_buffer guard inside sokol_debugtext
     * and leaves later text reads pointing at stale GPU memory -
     * which was producing the menu UI bleed into gameplay. */
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
    /* Drops to the in-game text-input flow. submit_world_name routes
     * the typed name back through start_sp_for_world. The old
     * window.prompt path is gone per CLAUDE.md. */
    M.input_buf[0] = 0;
    M.input_len    = 0;
    M.input_cursor_blink_start = stm_sec(stm_now());
    M.state = GAME_SP_NEW_WORLD_INPUT;
    menu_js_focus_text_input();
}

/* Hardcoded default server. The browser prompt was annoying for every
 * MP session, so the menu just connects straight to this. Power users
 * can still override via the `?server=...` URL query param — see the
 * bypass branch in main_web.c's init(). */
#define DEFAULT_MP_SERVER_URL "wss://tenebris-c.fly.dev/"

/* True if `s` is a syntactically valid 6-char uppercase-alphanumeric
 * room code. Mirrors input_accepts_char for GAME_MP_JOIN_INPUT plus
 * the length check. Used to filter stale / garbage entries when
 * reading back the persisted history. */
static bool room_code_is_valid(const char* s) {
    if (!s) return false;
    int len = (int)strlen(s);
    if (len != ROOM_CODE_LEN) return false;
    for (int i = 0; i < len; ++i) {
        char c = s[i];
        bool ok = (c >= 'A' && c <= 'Z') || (c >= '0' && c <= '9');
        if (!ok) return false;
    }
    return true;
}

/* Refresh M.recent_rooms from client_kv. The on-disk format is one
 * code per line, MRU first. Invalid / duplicate / over-long entries
 * are dropped silently so a corrupted localStorage key doesn't break
 * the menu. */
static void recent_rooms_load(void) {
    M.recent_room_count = 0;
    char* csv = client_kv_get(ROOM_HISTORY_KV_KEY);
    if (!csv) return;
    char* p = csv;
    while (*p && M.recent_room_count < ROOM_HISTORY_MAX) {
        char* nl = strchr(p, '\n');
        size_t n = nl ? (size_t)(nl - p) : strlen(p);
        if (n == ROOM_CODE_LEN) {
            char tmp[ROOM_CODE_LEN + 1];
            memcpy(tmp, p, n);
            tmp[n] = 0;
            bool dup = false;
            for (int i = 0; i < M.recent_room_count; ++i) {
                if (strcmp(M.recent_rooms[i], tmp) == 0) { dup = true; break; }
            }
            if (!dup && room_code_is_valid(tmp)) {
                memcpy(M.recent_rooms[M.recent_room_count], tmp, ROOM_CODE_LEN + 1);
                ++M.recent_room_count;
            }
        }
        if (!nl) break;
        p = nl + 1;
    }
    free(csv);
}

/* Write M.recent_rooms back to client_kv in MRU-first order. */
static void recent_rooms_save(void) {
    /* Each line is 6 chars + newline; +1 null. */
    char buf[ROOM_HISTORY_MAX * (ROOM_CODE_LEN + 1) + 1];
    int off = 0;
    for (int i = 0; i < M.recent_room_count; ++i) {
        memcpy(buf + off, M.recent_rooms[i], ROOM_CODE_LEN);
        off += ROOM_CODE_LEN;
        if (i + 1 < M.recent_room_count) buf[off++] = '\n';
    }
    buf[off] = 0;
    if (off == 0) client_kv_remove(ROOM_HISTORY_KV_KEY);
    else          client_kv_set(ROOM_HISTORY_KV_KEY, buf);
}

void menu_record_recent_room(const char* room_code) {
    if (!room_code_is_valid(room_code)) return;
    /* Re-read so a record from main_web's URL-bypass path doesn't
     * stomp a list mutated by a different session / tab. */
    recent_rooms_load();
    /* Drop any existing copy so it moves to the front. */
    int kept = 0;
    for (int i = 0; i < M.recent_room_count; ++i) {
        if (strcmp(M.recent_rooms[i], room_code) == 0) continue;
        if (kept != i) memcpy(M.recent_rooms[kept], M.recent_rooms[i], ROOM_CODE_LEN + 1);
        ++kept;
    }
    M.recent_room_count = kept;
    /* Shift right to make room at index 0. */
    int n = M.recent_room_count;
    if (n > ROOM_HISTORY_MAX - 1) n = ROOM_HISTORY_MAX - 1;
    for (int i = n; i > 0; --i) {
        memcpy(M.recent_rooms[i], M.recent_rooms[i - 1], ROOM_CODE_LEN + 1);
    }
    memcpy(M.recent_rooms[0], room_code, ROOM_CODE_LEN);
    M.recent_rooms[0][ROOM_CODE_LEN] = 0;
    M.recent_room_count = (n < ROOM_HISTORY_MAX - 1) ? n + 1 : ROOM_HISTORY_MAX;
    recent_rooms_save();
}

static void connect_to_room(const char* room_code) {
    MENU_TRACE("connect_to_room: '%s' from state=%s",
               room_code ? room_code : "(null)", state_name(M.state));
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
    if (room_code) menu_record_recent_room(room_code);
    M.active_world[0] = 0;     /* no SP save target while in MP */
    M.state = GAME_IN_GAME_MP;
    MENU_TRACE("state -> IN_GAME_MP (via connect_to_room)");
}

/* Generate a fresh room code, connect to it. Cloud submenu's HOST
 * button. */
static void start_host(void) {
    char* code = menu_js_new_room_code();
    if (!code) return;
    connect_to_room(code);
    free(code);
}

static void start_multiplayer(void) {
    /* MP button drops to the self-host / cloud-host picker — the
     * actual connect happens after the user picks one. */
    M.state = GAME_MP_SUBMENU;
}

/* If a deep-link invite is waiting and we now have an active
 * profile, jump straight into the room. Called from
 * menu_set_pending_invite (boot path - skips the wizard when a
 * profile already exists) and from enter_main_menu_with (after the
 * player picks / creates a profile via the wizard). Idempotent: once
 * consumed, the stored room is cleared so further profile swaps
 * don't reconnect. */
static void consume_pending_invite_if_ready(void) {
    if (M.pending_invite_room[0] == 0) return;
    profile_t active;
    if (!profile_get_active(&active)) return;

    const char* room   = M.pending_invite_room;
    const char* server = M.pending_invite_server[0]
                           ? M.pending_invite_server
                           : DEFAULT_MP_SERVER_URL;

    net_client_set_profile(active.token, active.name, room);
    snprintf(M.room_code, sizeof M.room_code, "%s", room);
    MENU_TRACE("consume_pending_invite: connect to %s (room='%s')", server, room);
    net_client_connect(server);
    menu_record_recent_room(room);
    M.active_world[0] = 0;
    M.state = GAME_IN_GAME_MP;
    MENU_TRACE("state -> IN_GAME_MP (via invite)");

    M.pending_invite_room[0]   = 0;
    M.pending_invite_server[0] = 0;
}

static void enter_main_menu_with(const profile_t* p) {
    profile_set_active(p->token);
    M.state = GAME_MAIN_MENU;
    MENU_TRACE("state -> MAIN_MENU (profile %s / %s)", p->name, p->token);
    /* A first-time visitor following an invite link lands on the
     * profile picker, creates a profile, and gets dropped straight
     * into the invited room here. No-op when no invite is pending. */
    consume_pending_invite_if_ready();
}

void menu_set_pending_invite(const char* room_code, const char* server_url) {
    if (!room_code || !room_code[0]) {
        M.pending_invite_room[0]   = 0;
        M.pending_invite_server[0] = 0;
        return;
    }
    snprintf(M.pending_invite_room, sizeof M.pending_invite_room,
             "%s", room_code);
    if (server_url && server_url[0]) {
        snprintf(M.pending_invite_server, sizeof M.pending_invite_server,
                 "%s", server_url);
    } else {
        M.pending_invite_server[0] = 0;
    }
    /* If a profile is already active (returning user), don't make
     * them re-pick - jump straight to the room. The picker shows up
     * only when there's no active profile yet. */
    consume_pending_invite_if_ready();
}

static void new_profile_flow(void) {
    /* In-game text input — submit_profile_name calls profile_create
     * + enter_main_menu_with on Enter. The character filter in
     * input_accepts_char already drops the storage-format separators
     * (newline, CR, colon, tab), so the typed buffer is safe to pass
     * straight to profile_create. */
    M.input_buf[0] = 0;
    M.input_len    = 0;
    M.input_cursor_blink_start = stm_sec(stm_now());
    M.state = GAME_PROFILE_NAME_INPUT;
    /* Pop the OS soft keyboard on mobile - no-op on desktop. */
    menu_js_focus_text_input();
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

static void enter_mp_cloud_submenu(void) {
    recent_rooms_load();
    M.state = GAME_MP_CLOUD_SUBMENU;
}

static void on_click_mp_submenu(float x, float y) {
    if (hit(&M.btn_back, x, y))       { M.state = GAME_MAIN_MENU; return; }
    /* SELF HOSTED is set_button_disabled -> hit() returns false; click
     * falls through silently. CLOUD HOSTED enters its own submenu. */
    if (hit(&M.btn_cloud_host, x, y)) { enter_mp_cloud_submenu();  return; }
}

static void on_click_mp_cloud_submenu(float x, float y) {
    if (hit(&M.btn_back, x, y)) { M.state = GAME_MP_SUBMENU; return; }
    if (hit(&M.btn_host, x, y)) { start_host();              return; }
    if (hit(&M.btn_join, x, y)) {
        M.input_buf[0] = 0;
        M.input_len    = 0;
        M.input_cursor_blink_start = stm_sec(stm_now());
        M.state = GAME_MP_JOIN_INPUT;
        menu_js_focus_text_input();
        return;
    }
    for (int i = 0; i < ROOM_HISTORY_MAX; ++i) {
        if (hit(&M.btn_recent_room[i], x, y)) {
            connect_to_room(M.recent_rooms[i]);
            return;
        }
    }
}

static void on_click_join_input(float x, float y) {
    if (hit(&M.btn_back, x, y)) {
        M.state = GAME_MP_CLOUD_SUBMENU;
        menu_js_blur_text_input();
        return;
    }
}

static void on_click_profile_name_input(float x, float y) {
    if (hit(&M.btn_back, x, y)) {
        M.state = GAME_PROFILE_SELECT;
        menu_js_blur_text_input();
        return;
    }
}

static void on_click_new_world_input(float x, float y) {
    if (hit(&M.btn_back, x, y)) {
        M.state = GAME_SP_WORLD_LIST;
        menu_js_blur_text_input();
        return;
    }
}

static void on_click_connect_error(float x, float y) {
    if (!hit(&M.btn_back, x, y)) return;
    /* Tear down the dead socket so the next attempt starts clean,
     * then drop the player back to the top of the menu tree. */
    net_client_disconnect();
    M.error_msg[0] = 0;
    M.room_code[0] = 0;
    M.state = GAME_MAIN_MENU;
}

static void on_click(float x, float y) {
    switch (M.state) {
        case GAME_PROFILE_SELECT: on_click_profile_select(x, y); break;
        case GAME_MAIN_MENU:      on_click_main(x, y);           break;
        case GAME_SP_WORLD_LIST:  on_click_world_list(x, y);     break;
        case GAME_MP_SUBMENU:        on_click_mp_submenu(x, y);       break;
        case GAME_MP_CLOUD_SUBMENU:  on_click_mp_cloud_submenu(x, y); break;
        case GAME_MP_JOIN_INPUT:      on_click_join_input(x, y);          break;
        case GAME_PROFILE_NAME_INPUT: on_click_profile_name_input(x, y);  break;
        case GAME_SP_NEW_WORLD_INPUT: on_click_new_world_input(x, y);     break;
        case GAME_MP_CONNECT_ERROR:   on_click_connect_error(x, y);       break;
        default: break;
    }
}

static bool state_is_input(game_state_t s) {
    return s == GAME_MP_JOIN_INPUT
        || s == GAME_PROFILE_NAME_INPUT
        || s == GAME_SP_NEW_WORLD_INPUT;
}

/* Per-input-state: which characters are allowed. JOIN room codes are
 * uppercase + digit only; profile / world names accept printable
 * ASCII minus the storage-format separators (newline, CR, colon,
 * tab) so they can sit in a localStorage key without ambiguity. */
static bool input_accepts_char(game_state_t s, uint32_t ch) {
    if (s == GAME_MP_JOIN_INPUT) {
        if (ch >= 'a' && ch <= 'z') return true;     /* will fold to upper */
        return (ch >= 'A' && ch <= 'Z') || (ch >= '0' && ch <= '9');
    }
    /* Profile + world names: printable ASCII minus separators. */
    if (ch < 0x20 || ch > 0x7e) return false;
    if (ch == ':' || ch == '\t') return false;
    return true;
}

static void input_append_char(uint32_t ch) {
    if (!state_is_input(M.state)) return;
    if (M.input_len >= (int)sizeof M.input_buf - 1) return;
    if (!input_accepts_char(M.state, ch)) return;
    /* Room codes auto-uppercased so users don't need to think
     * about case. */
    if (M.state == GAME_MP_JOIN_INPUT && ch >= 'a' && ch <= 'z') {
        ch -= ('a' - 'A');
    }
    M.input_buf[M.input_len++] = (char)ch;
    M.input_buf[M.input_len]   = 0;
    M.input_cursor_blink_start = stm_sec(stm_now());
}

static void input_backspace(void) {
    if (!state_is_input(M.state)) return;
    if (M.input_len == 0) return;
    M.input_buf[--M.input_len] = 0;
    M.input_cursor_blink_start = stm_sec(stm_now());
}

/* Forward declarations for per-input submit handlers. */
static void enter_main_menu_with(const profile_t* p);
static void start_sp_for_world(const char* world_name);

static void submit_profile_name(const char* name) {
    profile_t p;
    if (!profile_create(name, &p)) return;
    enter_main_menu_with(&p);
}

static void submit_world_name(const char* name) {
    /* Trim any whitespace at the edges. */
    start_sp_for_world(name);
}

static void input_submit(void) {
    if (!state_is_input(M.state)) return;
    if (M.input_len == 0) return;     /* empty submit = no-op */
    switch (M.state) {
        case GAME_MP_JOIN_INPUT:      connect_to_room(M.input_buf);   break;
        case GAME_PROFILE_NAME_INPUT: submit_profile_name(M.input_buf); break;
        case GAME_SP_NEW_WORLD_INPUT: submit_world_name(M.input_buf);   break;
        default: break;
    }
}

static void input_cancel(void) {
    switch (M.state) {
        case GAME_MP_JOIN_INPUT:      M.state = GAME_MP_CLOUD_SUBMENU; break;
        case GAME_PROFILE_NAME_INPUT: M.state = GAME_PROFILE_SELECT;   break;
        case GAME_SP_NEW_WORLD_INPUT: M.state = GAME_SP_WORLD_LIST;    break;
        default: break;
    }
    menu_js_blur_text_input();
}

#ifdef __EMSCRIPTEN__
/* JS-side bridge for the mobile soft-keyboard shim. Each typed char
 * on the hidden <input> ends up here, forwarded to the same handlers
 * the SAPP CHAR / KEY_DOWN events feed on desktop. Marked KEEPALIVE
 * so the emcc linker doesn't dead-strip them; called from JS via
 * Module.ccall in menu_js_focus_text_input's listeners. */
EMSCRIPTEN_KEEPALIVE
void tenebris_js_input_char(int ch) {
    if (ch <= 0) return;
    input_append_char((uint32_t)ch);
}
EMSCRIPTEN_KEEPALIVE
void tenebris_js_input_backspace(void) { input_backspace(); }
EMSCRIPTEN_KEEPALIVE
void tenebris_js_input_submit(void) {
    input_submit();
    menu_js_blur_text_input();
}
EMSCRIPTEN_KEEPALIVE
void tenebris_js_input_cancel(void) { input_cancel(); }
EMSCRIPTEN_KEEPALIVE
int  tenebris_js_in_input_state(void) {
    return state_is_input(M.state) ? 1 : 0;
}
#endif


bool menu_event(const sapp_event* e) {
    if (!menu_is_overlay()) return false;
    /* Text-input flow gets first crack at keyboard events. */
    if (state_is_input(M.state)) {
        if (e->type == SAPP_EVENTTYPE_CHAR) {
            input_append_char(e->char_code);
            return true;
        }
        if (e->type == SAPP_EVENTTYPE_KEY_DOWN) {
            if (e->key_code == SAPP_KEYCODE_ENTER)      { input_submit();    return true; }
            if (e->key_code == SAPP_KEYCODE_BACKSPACE)  { input_backspace(); return true; }
            if (e->key_code == SAPP_KEYCODE_ESCAPE) {
                /* Cancel back to the screen the input was launched
                 * from. input_cancel handles the per-state target
                 * + drops the mobile soft keyboard. */
                input_cancel();
                return true;
            }
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
        || M.state == GAME_PROFILE_NAME_INPUT
        || M.state == GAME_MAIN_MENU
        || M.state == GAME_SP_WORLD_LIST
        || M.state == GAME_SP_NEW_WORLD_INPUT
        || M.state == GAME_MP_SUBMENU
        || M.state == GAME_MP_CLOUD_SUBMENU
        || M.state == GAME_MP_JOIN_INPUT
        || M.state == GAME_MP_URL_PROMPT
        || M.state == GAME_MP_CONNECT_ERROR;
}

void menu_tick(void) {
    /* Promote a dead MP socket into the modal error popup. We only
     * watch from inside the in-game state — checking from menu
     * screens would re-fire the popup the moment the user clicked
     * BACK TO MENU (state is still ERROR until the next connect
     * attempt overwrites it). */
    if (M.state != GAME_IN_GAME_MP) return;
    if (net_client_state() != NET_CLIENT_ERROR) return;
    const char* msg = net_client_error_message();
    snprintf(M.error_msg, sizeof M.error_msg, "%s",
             msg ? msg : "connection failed");
    M.state = GAME_MP_CONNECT_ERROR;
    printf("[menu] MP connect error: %s\n", M.error_msg);
}

const char* menu_room_code(void) { return M.room_code; }

/* ------------------------------------------------------------------ */
/* In-game pause overlay                                                */
/* ------------------------------------------------------------------ */

bool menu_pause_active(void) { return M.pause_visible; }

/* Wrap every pause_visible mutation so we can spot mystery writes -
 * the trace showed pause being on without any pause_toggle log. */
static void set_pause_visible(bool v, const char* who) {
    if (M.pause_visible != v) {
        MENU_TRACE("set_pause_visible: %d -> %d (from %s, state=%s)",
                   (int)M.pause_visible, (int)v, who,
                   state_name(M.state));
    }
    M.pause_visible = v;
}

void menu_pause_toggle(void) {
    bool is_game = (M.state == GAME_IN_GAME_SP || M.state == GAME_IN_GAME_MP);
    if (!is_game) {
        MENU_TRACE("pause_toggle: ignored, state=%s (not in-game)",
                   state_name(M.state));
        set_pause_visible(false, "toggle:not-game");
        return;
    }
    set_pause_visible(!M.pause_visible, "toggle");
}

static void layout_pause(float w, float h) {
    /* Three vertical buttons centred on the screen. Order top-down:
     * RETURN TO GAME, INVITE PLAYERS, QUIT TO MENU. */
    float cx = w * 0.5f;
    float cy = h * 0.5f;
    set_button(&M.btn_pause_resume,
                 cx - MAIN_BTN_W * 0.5f,
                 cy - MAIN_BTN_H * 0.5f - (MAIN_BTN_H + MAIN_BTN_GAP),
                 MAIN_BTN_W, MAIN_BTN_H, "RETURN TO GAME");
    set_button(&M.btn_pause_invite,
                 cx - MAIN_BTN_W * 0.5f,
                 cy - MAIN_BTN_H * 0.5f,
                 MAIN_BTN_W, MAIN_BTN_H, "INVITE PLAYERS");
    set_button(&M.btn_pause_quit,
                 cx - MAIN_BTN_W * 0.5f,
                 cy - MAIN_BTN_H * 0.5f + (MAIN_BTN_H + MAIN_BTN_GAP),
                 MAIN_BTN_W, MAIN_BTN_H, "QUIT TO MENU");
    hide_button(&M.btn_pause_options);
}

/* Pause-panel layout in screen pixels. Computed once per draw and
 * stashed so menu_pause_event can hit-test the same rectangles
 * without recomputing. The sokol_gl draw path of the previous
 * iteration of this panel was silently failing to reach the swap-
 * chain even with the trace log firing, so this version uses ONLY
 * sokol_debugtext - the same primitive the F2 HUD already proves
 * works in the gameplay pass. No geometry, no extra pipeline, no
 * lazy-initialised sgl handles that could fail at first use. */
typedef struct {
    float x, y, w, h;
    const char* label;
} pause_rect_t;
static struct {
    pause_rect_t resume, invite, quit;
    float        panel_x, panel_y, panel_w, panel_h;
} G_pause_layout;

static void pause_compute_layout(float screen_w, float screen_h) {
    const float cell = 16.0f;   /* sdtx scale 2 = 16 px / glyph */
    const float btn_w = 24.0f * cell;   /* 24 chars wide */
    const float btn_h = 3.0f  * cell;   /* 3 lines tall   */
    const float gap   = cell;
    const float panel_pad = 2.0f * cell;
    const float panel_w = btn_w + 2.0f * panel_pad;
    const float panel_h = 4.0f * cell                /* title row */
                        + 2.0f * cell                /* hint row */
                        + 3.0f * (btn_h + gap) + gap
                        + 2.0f * panel_pad;
    const float panel_x = (screen_w - panel_w) * 0.5f;
    const float panel_y = (screen_h - panel_h) * 0.5f;
    const float btn_x = panel_x + panel_pad;
    float btn_y = panel_y + panel_pad
                + 4.0f * cell + 2.0f * cell + gap;
    G_pause_layout.panel_x = panel_x;
    G_pause_layout.panel_y = panel_y;
    G_pause_layout.panel_w = panel_w;
    G_pause_layout.panel_h = panel_h;
    G_pause_layout.resume = (pause_rect_t){ btn_x, btn_y, btn_w, btn_h, "RETURN TO GAME" };
    btn_y += btn_h + gap;
    G_pause_layout.invite = (pause_rect_t){ btn_x, btn_y, btn_w, btn_h, "INVITE PLAYERS" };
    btn_y += btn_h + gap;
    G_pause_layout.quit   = (pause_rect_t){ btn_x, btn_y, btn_w, btn_h, "QUIT TO MENU"   };
}

/* Centred sdtx text at scale `s`, position in screen pixels. */
static void pause_text(float screen_w, float screen_h,
                        const char* str,
                        float center_x, float screen_y,
                        float scale,
                        uint8_t r, uint8_t g, uint8_t b) {
    const float cell_px = 8.0f * scale;
    int n = (int)strlen(str);
    float text_w = cell_px * (float)n;
    float text_x = center_x - text_w * 0.5f;
    sdtx_canvas(screen_w / scale, screen_h / scale);
    sdtx_font(1);
    sdtx_origin(text_x / cell_px, screen_y / cell_px);
    sdtx_color3b(r, g, b);
    sdtx_home();
    sdtx_printf("%s", str);
    sdtx_font(0);
}

/* Same but left-aligned at `screen_x`. */
static void pause_text_left(float screen_w, float screen_h,
                              const char* str,
                              float screen_x, float screen_y,
                              float scale,
                              uint8_t r, uint8_t g, uint8_t b) {
    const float cell_px = 8.0f * scale;
    sdtx_canvas(screen_w / scale, screen_h / scale);
    sdtx_font(1);
    sdtx_origin(screen_x / cell_px, screen_y / cell_px);
    sdtx_color3b(r, g, b);
    sdtx_home();
    sdtx_printf("%s", str);
    sdtx_font(0);
}

/* ------------------------------------------------------------------ */
/* In-game pause overlay (rebuilt as proper sokol_gl geometry)          */
/* ------------------------------------------------------------------ */

/* Pause panel layout in screen pixels. Computed once per draw and
 * stashed so the click handler can hit-test the same rectangles. */
typedef struct { float x, y, w, h; const char* label; } pause_btn_t;
static struct {
    float       panel_x, panel_y, panel_w, panel_h;
    pause_btn_t resume, invite, quit;
} G_pl;

static void pause_layout(float w, float h) {
    bool is_mp = (M.state == GAME_IN_GAME_MP);
    const float btn_w = 320.0f;
    const float btn_h = 64.0f;
    const float gap   = 18.0f;
    const float pad   = 28.0f;
    const int   row_count = is_mp ? 3 : 2;
    const float panel_w = btn_w + 2.0f * pad;
    const float panel_h = 110.0f                       /* title block */
                        + (float)row_count * btn_h
                        + (float)(row_count - 1) * gap
                        + pad;
    const float panel_x = (w - panel_w) * 0.5f;
    const float panel_y = (h - panel_h) * 0.5f;
    const float btn_x = panel_x + pad;
    float       btn_y = panel_y + 110.0f;

    G_pl.panel_x = panel_x;
    G_pl.panel_y = panel_y;
    G_pl.panel_w = panel_w;
    G_pl.panel_h = panel_h;
    G_pl.resume = (pause_btn_t){ btn_x, btn_y, btn_w, btn_h, "RETURN TO GAME" };
    btn_y += btn_h + gap;
    if (is_mp) {
        G_pl.invite = (pause_btn_t){ btn_x, btn_y, btn_w, btn_h, "INVITE PLAYERS" };
        btn_y += btn_h + gap;
    } else {
        /* Hide invite by parking it offscreen so the hit-test never
         * matches. SP doesn't have a room to invite anyone to. */
        G_pl.invite = (pause_btn_t){ -1e9f, -1e9f, 0, 0, NULL };
    }
    G_pl.quit = (pause_btn_t){ btn_x, btn_y, btn_w, btn_h, "QUIT TO MENU" };
}

static bool pause_btn_hit(const pause_btn_t* b, float x, float y) {
    if (!b->label) return false;
    return x >= b->x && x <= b->x + b->w
        && y >= b->y && y <= b->y + b->h;
}

void menu_pause_draw(int screen_w, int screen_h) {
    if (!M.pause_visible) return;

    const float w = (float)screen_w;
    const float h = (float)screen_h;
    pause_layout(w, h);

    /* Use mobile_ui's shared alpha pipeline - it draws the joystick
     * + buttons every frame so we know it lands on the swapchain
     * across browser / driver combos. */
    sgl_defaults();
    sgl_matrix_mode_projection();
    sgl_load_identity();
    sgl_ortho(0.0f, w, h, 0.0f, -1.0f, 1.0f);
    sgl_matrix_mode_modelview();
    sgl_load_identity();
    sgl_load_pipeline(mobile_ui_alpha_pipeline());

    /* Full-screen dim backdrop. */
    mobile_ui_draw_rect(0.0f, 0.0f, w, h, 0.02f, 0.03f, 0.07f, 0.75f);
    /* Panel + border. */
    mobile_ui_draw_rect(G_pl.panel_x, G_pl.panel_y, G_pl.panel_w, G_pl.panel_h,
                         0.10f, 0.12f, 0.18f, 0.96f);
    mobile_ui_draw_rect_outline(G_pl.panel_x, G_pl.panel_y, G_pl.panel_w, G_pl.panel_h,
                                  2.0f, 0.85f, 0.90f, 1.00f, 1.0f);
    /* Buttons - hover-aware. */
    const pause_btn_t* btns[3] = { &G_pl.resume, &G_pl.invite, &G_pl.quit };
    for (int i = 0; i < 3; ++i) {
        const pause_btn_t* b = btns[i];
        if (!b->label) continue;
        bool hovered = pause_btn_hit(b, M.mouse_x, M.mouse_y);
        if (hovered) {
            mobile_ui_draw_rect(b->x, b->y, b->w, b->h, 0.22f, 0.30f, 0.42f, 0.98f);
        } else {
            mobile_ui_draw_rect(b->x, b->y, b->w, b->h, 0.14f, 0.16f, 0.22f, 0.95f);
        }
        mobile_ui_draw_rect_outline(b->x, b->y, b->w, b->h, 2.0f,
                                      0.85f, 0.90f, 1.00f, 1.0f);
    }
    sgl_draw();

    /* Text on top of the geometry. */
    const float cx = w * 0.5f;
    draw_text_centered("PAUSED", cx, G_pl.panel_y + 20.0f, 4.0f,
                         0xff, 0xff, 0xff);
    for (int i = 0; i < 3; ++i) {
        const pause_btn_t* b = btns[i];
        if (!b->label) continue;
        float bx = b->x + b->w * 0.5f;
        float by = b->y + (b->h - 8.0f * 2.0f) * 0.5f;
        draw_text_centered(b->label, bx, by, 2.0f, 0xff, 0xff, 0xff);
    }

    /* Share-result toast under the INVITE button (MP only). */
    double t_now = stm_sec(stm_now());
    if (G_pl.invite.label && M.pause_share_msg_until > t_now) {
        const char* msg = "SHARE FAILED";
        uint8_t r = 0xff, g = 0x80, bl = 0x60;
        if (M.pause_share_result == 1) {
            msg = "SHARED!"; r = 0x80; g = 0xff; bl = 0xa0;
        } else if (M.pause_share_result == 2) {
            msg = "LINK COPIED TO CLIPBOARD";
            r = 0x80; g = 0xff; bl = 0xa0;
        }
        float ty = G_pl.invite.y + G_pl.invite.h + 8.0f;
        draw_text_centered(msg, cx, ty, 1.0f, r, g, bl);
    }
}

bool menu_pause_event(const sapp_event* e) {
    if (!M.pause_visible) return false;

    /* Track mouse for hover. */
    if (e->type == SAPP_EVENTTYPE_MOUSE_MOVE) {
        M.mouse_x = e->mouse_x;
        M.mouse_y = e->mouse_y;
        return true;
    }
    if (e->type == SAPP_EVENTTYPE_TOUCHES_MOVED && e->num_touches > 0) {
        M.mouse_x = e->touches[0].pos_x;
        M.mouse_y = e->touches[0].pos_y;
        return true;
    }

    /* Escape inside the pause overlay is INTENTIONALLY swallowed
     * without closing the panel. The player must click RETURN TO
     * GAME to resume. This keeps the behaviour symmetric: the first
     * Escape opens pause + releases pointer lock (the browser
     * intercepts it for the lock release; main_web's pointer-lock-
     * loss detector turns that into a menu_pause_toggle), and the
     * close action is a deliberate click on the resume button. */
    if (e->type == SAPP_EVENTTYPE_KEY_DOWN
        && e->key_code == SAPP_KEYCODE_ESCAPE) {
        return true;
    }

    /* Click / touch hit-test against the same rects the draw path
     * computed. */
    bool click = false;
    float cx = 0, cy = 0;
    if (e->type == SAPP_EVENTTYPE_MOUSE_DOWN
        && e->mouse_button == SAPP_MOUSEBUTTON_LEFT) {
        click = true; cx = e->mouse_x; cy = e->mouse_y;
    } else if (e->type == SAPP_EVENTTYPE_TOUCHES_BEGAN
               && e->num_touches > 0) {
        click = true; cx = e->touches[0].pos_x; cy = e->touches[0].pos_y;
    }
    if (click) {
        pause_layout(sapp_widthf(), sapp_heightf());
        if (pause_btn_hit(&G_pl.resume, cx, cy)) {
            set_pause_visible(false, "click-resume");
            sapp_show_mouse(true);
            return true;
        }
        if (pause_btn_hit(&G_pl.invite, cx, cy)) {
            const char* room = M.room_code[0] ? M.room_code : "";
            int rc = menu_js_share_invite(room);
            M.pause_share_result    = (rc == 0) ? 3 : rc;
            M.pause_share_msg_until = stm_sec(stm_now()) + 2.5;
            return true;
        }
        if (pause_btn_hit(&G_pl.quit, cx, cy)) {
            if (M.state == GAME_IN_GAME_MP) {
                net_client_disconnect();
                M.room_code[0] = 0;
            }
            M.active_world[0] = 0;
            set_pause_visible(false, "click-quit");
            M.state = GAME_MAIN_MENU;
            return true;
        }
        return true;       /* swallow clicks inside the dim backdrop */
    }

    /* Swallow everything else (keyboard movement, scroll, etc.) so
     * the player doesn't keep walking / mining behind the panel. */
    return true;
}

bool menu_take_sp_resume(persistence_save_t* out) {
    if (!M.pending_sp_resume) return false;
    *out = M.resume;
    M.pending_sp_resume = false;
    return true;
}

const char* menu_active_world(void) { return M.active_world; }
