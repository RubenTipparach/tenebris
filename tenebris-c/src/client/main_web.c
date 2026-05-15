/*
 * Tenebris - Goldberg-sphere entry point.
 *
 * Whole planet = one Goldberg polyhedron, ~642 hex/pentagon tiles at
 * subdivisions=3. Streamed tile terrain gen across frames so the first
 * visible frame draws an empty planet and each subsequent frame fills
 * in a few more tiles until world_gen_complete is true.
 */

#include "sokol_gfx.h"
#include "sokol_app.h"
#include "sokol_glue.h"
#include "sokol_log.h"
#include "sokol_time.h"
#include "sokol_debugtext.h"
#include "sokol_gl.h"   /* draw_desync_popup uses sgl_* for the rect backdrop */

#include "core/planet.h"
#include "core/planet_gen.h"
#include "core/world.h"
#include "core/job_system.h"
#include "core/config.h"
#include "core/proto.h"
#include "client/gfx_math.h"
#include "client/input.h"
#include "client/player_ctrl.h"
#include "client/renderer.h"
#include "client/interact.h"
#include "client/mobile_ui.h"
#include "client/chat.h"
#include "client/menu.h"
#include "client/net_client.h"
#include "client/persistence.h"
#include "client/profile.h"
#include "client/remote_players.h"
#include "client/teleport_menu.h"

#ifdef __EMSCRIPTEN__
#include <emscripten.h>
/* Read the server URL from the page's `?server=` query param. Returns
 * a malloc'd C string the caller must free, or NULL if no param was
 * set (in which case the client stays single-player offline). */
EM_JS(char*, tenebris_get_server_url, (void), {
    try {
        var u = new URL(window.location.href);
        var s = u.searchParams.get('server');
        if (!s) return 0;
        var len = lengthBytesUTF8(s) + 1;
        var p = _malloc(len);
        stringToUTF8(s, p, len);
        return p;
    } catch (_e) { return 0; }
});

/* Returns 1 if the browser is running on a mobile / tablet device
 * (or the URL carries ?perf=lite to force the low-power path on
 * desktop for testing). Read once at boot, fed to
 * renderer_set_perf_mode before renderer_init so the lite water +
 * composite pipelines get built. Detection is a userAgent regex
 * matching the common mobile vendor strings - good enough for the
 * "do we drop heavy fragment shaders" decision; we're not gating
 * anything security-sensitive on it. */
EM_JS(int, tenebris_is_mobile_device, (void), {
    try {
        var u = new URL(window.location.href);
        var force = u.searchParams.get('perf');
        if (force === 'lite' || force === 'mobile') return 1;
        if (force === 'high' || force === 'desktop') return 0;
    } catch (_e) { /* fall through */ }
    try {
        var ua = (navigator.userAgent || '') + ' ' + (navigator.platform || '');
        if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|Tablet/i.test(ua)) {
            return 1;
        }
        if (navigator.maxTouchPoints && navigator.maxTouchPoints > 1
            && Math.min(screen.width, screen.height) <= 900) {
            return 1;
        }
    } catch (_e) { return 0; }
    return 0;
});

/* `?room=ABCD23` (or `?invite=ABCD23`) lets friends jump directly
 * into a self-host room without going through the menu. The `invite`
 * alias exists so share links like `/tenebris/wasm?invite=123456`
 * Just Work against the bundled default server — no `?server=` needed,
 * because main_web.c's boot path falls back to the cloud URL when none
 * is supplied. Returns NULL if neither param is present. */
EM_JS(char*, tenebris_get_room_code, (void), {
    try {
        var u = new URL(window.location.href);
        var s = u.searchParams.get('room');
        if (!s) s = u.searchParams.get('invite');
        if (!s) return 0;
        s = s.toUpperCase().substring(0, 8);
        var len = lengthBytesUTF8(s) + 1;
        var p = _malloc(len);
        stringToUTF8(s, p, len);
        return p;
    } catch (_e) { return 0; }
});

/* HTML overlay pause button. mobile_ui_draw's sokol_gl rendering is
 * unreliable on certain mobile browsers (the joystick + on-canvas
 * buttons don't render even though sdtx text does), so the pause
 * trigger uses a real DOM <button> positioned absolutely over the
 * canvas. CSS keeps it big, opaque, and unmistakable, plus the
 * browser handles touch / hover / focus for us. Click is forwarded
 * into C via Module.ccall onto tenebris_js_pause_pressed. */
EM_JS(void, tenebris_pause_button_install, (void), {
    if (document.getElementById('tenebris-pause-btn')) return;
    var btn = document.createElement('button');
    btn.id = 'tenebris-pause-btn';
    btn.textContent = '∥';   /* "II" pause glyph */
    btn.setAttribute('aria-label', 'Pause');
    btn.style.cssText =
        'position:fixed;top:14px;left:14px;width:60px;height:60px;'
      + 'border-radius:50%;border:3px solid #fff;'
      + 'background:rgba(15,17,26,0.92);color:#fff;'
      + 'font-size:30px;font-weight:bold;'
      + 'display:flex;align-items:center;justify-content:center;'
      + 'cursor:pointer;z-index:10;'
      + 'touch-action:manipulation;'
      + '-webkit-tap-highlight-color:transparent;'
      + 'box-shadow:0 2px 6px rgba(0,0,0,0.5);'
      + 'visibility:hidden;';
    btn.addEventListener('click', function(ev) {
        ev.preventDefault();
        Module.ccall('tenebris_js_pause_pressed', null, [], []);
    });
    btn.addEventListener('touchend', function(ev) {
        ev.preventDefault();
        Module.ccall('tenebris_js_pause_pressed', null, [], []);
    });
    document.body.appendChild(btn);
});

EM_JS(void, tenebris_pause_button_set_visible, (int visible), {
    var b = document.getElementById('tenebris-pause-btn');
    if (b) b.style.visibility = visible ? 'visible' : 'hidden';
});

/* Full mobile control deck as DOM elements (two virtual joysticks +
 * Jump / Break / Place buttons). Same reason as the pause button:
 * sokol_gl on certain mobile browsers fails to render the sticks
 * + buttons, so we side-step it with real DOM overlays. Each
 * control streams its state into C via Module.ccall onto the
 * tenebris_js_set_* hooks below. */
EM_JS(void, tenebris_mobile_controls_install, (void), {
    if (document.getElementById('tenebris-mobile-controls')) return;
    var style = document.createElement('style');
    style.textContent = ''
      + '#tenebris-mobile-controls { position:fixed; inset:0; pointer-events:none; z-index:5; visibility:hidden; }'
      + '.tn-stick { position:absolute; width:70px; height:70px; border-radius:50%; '
      +    'background:rgba(20,22,30,0.45); border:2px solid rgba(255,255,255,0.7); '
      +    'pointer-events:auto; touch-action:none; -webkit-tap-highlight-color:transparent; }'
      + '.tn-stick .knob { position:absolute; left:50%; top:50%; width:28px; height:28px; '
      +    'border-radius:50%; background:rgba(255,255,255,0.85); transform:translate(-50%,-50%); pointer-events:none; }'
      + '#tn-stick-left  { bottom:18px; left:18px; }'
      + '#tn-stick-right { bottom:18px; right:18px; }'
      + '.tn-btn { position:absolute; width:44px; height:44px; border-radius:50%; '
      +    'background:rgba(15,17,26,0.88); color:#fff; border:2px solid rgba(255,255,255,0.85); '
      +    'font:bold 11px sans-serif; display:flex; align-items:center; justify-content:center; '
      +    'pointer-events:auto; touch-action:none; -webkit-tap-highlight-color:transparent; '
      +    'box-shadow:0 2px 6px rgba(0,0,0,0.5); user-select:none; }'
      + '.tn-btn:active { background:rgba(80,90,110,0.95); }'
      /* Action buttons sit in a tight row directly above the right
       * look stick. The stick now shrinks to 70 px so the action row
       * (3 x 44 px = 132 px) overhangs the stick column on the right
       * side - that's fine, they're above the stick footprint, not
       * on top of it. bottom:100 = 18 (margin) + 70 (stick) + 12 (gap). */
      + '#tn-btn-jump  { bottom:100px; right: 18px; }'
      + '#tn-btn-break { bottom:100px; right: 66px; }'
      + '#tn-btn-place { bottom:100px; right:114px; }';
    document.head.appendChild(style);

    function mk(tag, id, cls, text) {
        var e = document.createElement(tag);
        if (id) e.id = id;
        if (cls) e.className = cls;
        if (text) e.textContent = text;
        return e;
    }
    var root = mk('div', 'tenebris-mobile-controls', null, null);
    var ls = mk('div', 'tn-stick-left',  'tn-stick', null);
    var rs = mk('div', 'tn-stick-right', 'tn-stick', null);
    var lk = mk('div', null, 'knob', null);
    var rk = mk('div', null, 'knob', null);
    ls.appendChild(lk); rs.appendChild(rk);
    var bJump  = mk('div', 'tn-btn-jump',  'tn-btn', 'JUMP');
    var bBreak = mk('div', 'tn-btn-break', 'tn-btn', 'BREAK');
    var bPlace = mk('div', 'tn-btn-place', 'tn-btn', 'PLACE');
    root.appendChild(ls); root.appendChild(rs);
    root.appendChild(bJump); root.appendChild(bBreak); root.appendChild(bPlace);
    document.body.appendChild(root);

    function makeStick(elem, knob, fnName) {
        var activeId = -1;
        function reset() {
            knob.style.left = '50%'; knob.style.top = '50%';
            Module.ccall(fnName, null,
                ['number','number','number'], [0, 0, 0]);
        }
        function update(touch) {
            var rect = elem.getBoundingClientRect();
            var cx = rect.left + rect.width * 0.5;
            var cy = rect.top  + rect.height * 0.5;
            var dx = touch.clientX - cx;
            var dy = touch.clientY - cy;
            var max = rect.width * 0.5;
            var len = Math.sqrt(dx*dx + dy*dy);
            if (len > max) { dx = dx * max / len; dy = dy * max / len; }
            knob.style.left = (50 + 100 * dx / rect.width)  + '%';
            knob.style.top  = (50 + 100 * dy / rect.height) + '%';
            var nx =  dx / max;
            var ny = -dy / max;     /* screen y flips */
            Module.ccall(fnName, null,
                ['number','number','number'], [nx, ny, 1]);
        }
        function findTouch(ev) {
            for (var i = 0; i < ev.changedTouches.length; ++i) {
                if (ev.changedTouches[i].identifier === activeId) {
                    return ev.changedTouches[i];
                }
            }
            return null;
        }
        elem.addEventListener('touchstart', function(ev) {
            ev.preventDefault();
            if (activeId !== -1) return;
            var t = ev.changedTouches[0];
            activeId = t.identifier;
            update(t);
        }, { passive: false });
        elem.addEventListener('touchmove', function(ev) {
            ev.preventDefault();
            var t = findTouch(ev);
            if (t) update(t);
        }, { passive: false });
        function end(ev) {
            ev.preventDefault();
            if (findTouch(ev)) {
                activeId = -1;
                reset();
            }
        }
        elem.addEventListener('touchend',    end, { passive: false });
        elem.addEventListener('touchcancel', end, { passive: false });
    }
    makeStick(ls, lk, 'tenebris_js_set_move_stick');
    makeStick(rs, rk, 'tenebris_js_set_look_stick');

    function makeHoldBtn(elem, fnName) {
        function down(ev) {
            ev.preventDefault();
            Module.ccall(fnName, null, ['number'], [1]);
        }
        function up(ev) {
            ev.preventDefault();
            Module.ccall(fnName, null, ['number'], [0]);
        }
        elem.addEventListener('touchstart',  down, { passive: false });
        elem.addEventListener('touchend',    up,   { passive: false });
        elem.addEventListener('touchcancel', up,   { passive: false });
        elem.addEventListener('mousedown',   down);
        elem.addEventListener('mouseup',     up);
        elem.addEventListener('mouseleave',  up);
    }
    makeHoldBtn(bJump,  'tenebris_js_set_jump');
    makeHoldBtn(bBreak, 'tenebris_js_set_break');
    makeHoldBtn(bPlace, 'tenebris_js_set_place');
});

EM_JS(void, tenebris_mobile_controls_set_visible, (int visible), {
    var c = document.getElementById('tenebris-mobile-controls');
    if (c) c.style.visibility = visible ? 'visible' : 'hidden';
});


/* JS calls this when the HTML pause button is tapped. Same effect
 * as pressing Escape on desktop: toggles the pause overlay and
 * releases pointer lock so the player can interact with the
 * canvas panel buttons. */
EMSCRIPTEN_KEEPALIVE
void tenebris_js_pause_pressed(void) {
    menu_pause_toggle();
    if (menu_pause_active()) {
        sapp_lock_mouse(false);
        sapp_show_mouse(true);
    }
}

EMSCRIPTEN_KEEPALIVE
void tenebris_js_set_move_stick(double x, double y, int active) {
    input_state_t* in = input_state_mut();
    if (active) {
        in->stick_x = (float)x;
        in->stick_y = (float)y;
        in->stick_active = true;
        in->phys.forward  = (y >  0.3);
        in->phys.backward = (y < -0.3);
        in->phys.right    = (x >  0.3);
        in->phys.left     = (x < -0.3);
    } else {
        in->stick_x = 0;
        in->stick_y = 0;
        in->stick_active = false;
        in->phys.forward = in->phys.backward = false;
        in->phys.left = in->phys.right = false;
    }
    in->touch_active = true;
}

EMSCRIPTEN_KEEPALIVE
void tenebris_js_set_look_stick(double x, double y, int active) {
    input_state_t* in = input_state_mut();
    in->look_stick_x = (float)x;
    in->look_stick_y = (float)y;
    in->look_stick_active = active != 0;
    in->touch_active = true;
}

EMSCRIPTEN_KEEPALIVE
void tenebris_js_set_break(int held) {
    input_state_t* in = input_state_mut();
    bool was = in->left_held;
    in->left_held = held != 0;
    if (held && !was) in->left_click = true;
    in->touch_active = true;
}

EMSCRIPTEN_KEEPALIVE
void tenebris_js_set_place(int held) {
    input_state_t* in = input_state_mut();
    bool was = in->right_held;
    in->right_held = held != 0;
    if (held && !was) in->right_click = true;
    in->touch_active = true;
}

EMSCRIPTEN_KEEPALIVE
void tenebris_js_set_jump(int held) {
    input_state_t* in = input_state_mut();
    in->phys.jump   = held != 0;
    in->phys.fly_up = held != 0;
    in->touch_active = true;
}
#endif
#include "client/inventory.h"
#include "client/profiler.h"
#include "client/hotbar_ui.h"
#include "client/torch.h"

#include <math.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <stdio.h>

/* On-screen error overlay — captures sokol_gfx / sokol_app log lines
 * (panic/error/warning) into a small ring buffer and displays the
 * most recent ones at the top of the screen. Hooked up via the
 * sg_setup().logger.func callback below. The motivation is mobile
 * debugging: there's no JS console accessible on iOS Safari without
 * remote-debug tooling, so any error has to be visible in-app or
 * we fly blind. */
#define ERR_LOG_LINES   12
#define ERR_LOG_LINE_LEN 128
static struct {
    char     lines[ERR_LOG_LINES][ERR_LOG_LINE_LEN];
    uint32_t total;          /* total messages received (>= ring size) */
} g_err;

static void on_screen_log(const char* tag, uint32_t level, uint32_t item,
                          const char* msg, uint32_t line,
                          const char* file, void* user) {
    /* level: 0 = panic, 1 = error, 2 = warning, 3 = info. We only
     * grab the alarming ones — info-level logs would flood. */
    if (level <= 2 && msg) {
        int slot = (int)(g_err.total % ERR_LOG_LINES);
        const char* lvl = (level == 0) ? "PANIC"
                        : (level == 1) ? "ERROR"
                                       : "WARN";
        snprintf(g_err.lines[slot], ERR_LOG_LINE_LEN,
                 "%s[%s id=%u]: %.80s",
                 lvl, tag ? tag : "?", (unsigned)item, msg);
        g_err.total++;
    }
    /* Forward to the default sokol logger so the JS console / native
     * stderr still gets every message for post-mortem grepping. */
    slog_func(tag, level, item, msg, line, file, user);
}

static void draw_error_overlay(void) {
    if (g_err.total == 0) return;
    sdtx_color3b(255, 80, 80);
    sdtx_printf("\n=== sokol log: %u msgs ===\n", g_err.total);
    int show = (g_err.total < ERR_LOG_LINES) ? (int)g_err.total : ERR_LOG_LINES;
    int start = (int)g_err.total - show;
    for (int i = 0; i < show; ++i) {
        int slot = (start + i) % ERR_LOG_LINES;
        sdtx_printf("%s\n", g_err.lines[slot]);
    }
    sdtx_color3b(255, 255, 255);
}

/* Streaming budget: tiles generated per frame. Tenebris is subs=6 =
 * 40962 tiles total — at 512/frame it's ~80 frames (~1.3 s) to fully
 * populate. Each tile gen is a handful of noise evals, well inside the
 * 16 ms frame budget. Moon subdivisions are pulled from body config. */
#define GEN_TILES_PER_FRAME  512

static struct {
    const body_config_t* body;
    world_t*         world;
    world_t*         moons[32];
    int              moon_count;
    player_ctrl_t    player;
    interact_state_t interact;
    uint64_t         last_time;
    uint32_t         tick;
    float            smoothed_fps;
} G;

/* Accessors for modules that need the live player pose but don't
 * want to pull main_web.h. The /saves audit in net_client.c uses
 * these to score the distance from the camera to each persisted
 * tile. Returning a dvec3 by value keeps the contract minimal. */
dvec3_t tenebris_get_local_player_pos(void) {
    return G.player.position;
}

uint32_t tenebris_get_local_player_body_id(void) {
    /* G.player.body is the live gravitational anchor (NULL when the
     * player is anchorless in deep space). Fall back to BODY_TENEBRIS
     * so the audit's distance calculations have something to anchor
     * to instead of mis-attributing everything to body 0 = error. */
    if (G.player.body) return (uint32_t)G.player.body->id;
    return 0;  /* BODY_TENEBRIS */
}

/* --------------------------------------------------------------------- */

static void init(void) {
    /* Bump sokol's buffer pool way above the default 128 — the
     * chunked-terrain renderer creates 4 buffers per chunk × 32
     * chunks × ~20 bodies = 2560 base buffers, plus extra slots
     * consumed each time chunk_upload's regrow_buffer destroys and
     * re-creates a buffer (sokol marks the old slot for delayed
     * release). Default pool exhaustion was the cause of "massive
     * chunks of the world missing on Tenebris" — once the pool
     * filled, sg_make_buffer returned invalid IDs, sg_update_buffer
     * silently no-op'd on them, and entire chunks rendered nothing.
     *
     * 4 K buffer slots gives ~50 % headroom over the worst-case
     * sustained allocation count. Image / pipeline / shader pools
     * stay at default — we're not creating those en masse. */
    sg_setup(&(sg_desc){
        .environment = sglue_environment(),
        .logger.func = on_screen_log,
        .buffer_pool_size = 4096,
        /* Default pipeline pool of 64 was exhausted by the
         * renderer's hex / water / composite / atmosphere /
         * skybox / per-body pipelines plus the UI ones (hotbar,
         * mobile_ui, menu, chat, profiler, mining bar, players
         * panel, desync popup, remote players, nameplates,
         * teleport menu). Once we hit the limit, sg_make_pipeline
         * silently returns SG_INVALID_ID and any sgl draw using
         * that pipeline ends up flushing into the void - which
         * was why the pause panel + joystick rendered as ghosts
         * (sdtx labels visible, sokol_gl geometry not). */
        .pipeline_pool_size = 256,
    });
    stm_setup();
    /* IMPORTANT: every one of the 8 sdtx font slots gets filled, even
     * the ones we don't actively use. sokol_debugtext stacks all slots
     * vertically in a single texture atlas and memset's the whole
     * atlas to 0xFF (white). At anything above 1x scale, the sampler
     * bleeds ~half a pixel into the slot below the active glyph row,
     * showing the white as a visible underline at the bottom of every
     * character. Filling every slot with a real bitmap kills the
     * white bleed — bleed now reads the top of the next font's
     * glyphs, which is far less noticeable. */
    sdtx_setup(&(sdtx_desc_t){
        .fonts[0] = sdtx_font_oric(),   /* HUD               */
        .fonts[1] = sdtx_font_c64(),    /* menu              */
        .fonts[2] = sdtx_font_c64(),    /* trailing-bleed guards: */
        .fonts[3] = sdtx_font_c64(),
        .fonts[4] = sdtx_font_c64(),
        .fonts[5] = sdtx_font_c64(),
        .fonts[6] = sdtx_font_c64(),
        .fonts[7] = sdtx_font_c64(),
        .logger.func = on_screen_log,
    });

    input_init();
    job_system_init(0);
#ifdef __EMSCRIPTEN__
    /* Mobile / tablet browsers swap in the lite water + composite
     * shaders. Decision happens before renderer_init because the
     * setter gates which pipelines get created. Native desktop
     * builds always run the full path. */
    if (tenebris_is_mobile_device()) {
        renderer_set_perf_mode(true);
        printf("[renderer] perf mode enabled (mobile device detected)\n");
    }
#endif
    renderer_init();
    torch_init();
    mobile_ui_init();
    hotbar_ui_init();
    teleport_menu_init();
    teleport_menu_set_player(&G.player);

#ifdef __EMSCRIPTEN__
    /* DOM overlays are mobile-only scaffolding per CLAUDE.md: the
     * pause button stands in for the Esc key, and the joystick +
     * action deck stand in for keyboard / mouse. The pause panel
     * itself is in-canvas (menu.c) on every platform so it matches
     * the game's visual identity. */
    if (tenebris_is_mobile_device()) {
        tenebris_pause_button_install();
        tenebris_mobile_controls_install();
    }
#endif

    /* Load atmosphere overrides from YAML before creating any
     * worlds — planet_set_atmosphere mutates BODIES[] and the
     * renderer reads body->atmo_* on every frame, so applying the
     * patch up-front means the very first frame already uses the
     * tuned values. */
    config_load_atmosphere("assets/config/atmosphere.yaml");
    config_load_skybox("assets/config/skybox.yaml");
    config_load_lod("assets/config/lod.yaml");
    config_load_water("assets/config/water.yaml");
    config_load_lighting("assets/config/lighting.yaml");
    /* One-shot dump of Tenebris's effective atmosphere values so we
     * can sanity-check that the YAML actually landed (vs. defaults
     * from main_web.c being silently used). Comment out once the
     * config loop is settled. */
    {
        const body_config_t* tb = planet_get(BODY_TENEBRIS);
        printf("[atmo] %s effective: rad_mult=%.3f rayleigh=%.3f mie=%.3f "
               "sun_int=%.2f sunset=%.3f scale_h=%.3f mie_g=%.3f\n"
               "[atmo]   wavelengths=(%.3f, %.3f, %.3f)\n"
               "[atmo]   sunset_tint=(%.3f, %.3f, %.3f) glow=(%.3f, %.3f, %.3f) "
               "horizon=(%.3f, %.3f, %.3f)\n",
               tb->name,
               tb->atmo_radius_mult, tb->atmo_rayleigh_scale, tb->atmo_mie_scale,
               tb->atmo_sun_intensity, tb->atmo_sunset_strength,
               tb->atmo_scale_height, tb->atmo_mie_g,
               tb->atmo_wavelengths.x, tb->atmo_wavelengths.y, tb->atmo_wavelengths.z,
               tb->atmo_sunset_tint.x, tb->atmo_sunset_tint.y, tb->atmo_sunset_tint.z,
               tb->atmo_sunset_glow.x, tb->atmo_sunset_glow.y, tb->atmo_sunset_glow.z,
               tb->atmo_sunset_horizon.x, tb->atmo_sunset_horizon.y, tb->atmo_sunset_horizon.z);
        fflush(stdout);
    }

    G.body  = planet_get(BODY_TENEBRIS);
    G.world = world_create(G.body, planet_subdivisions_for_radius(G.body->radius_m));
    player_init(&G.player, G.body);

    /* Drain Tenebris gen synchronously at init so the spawn tile has
     * terrain the moment the first frame lands. Rendering still streams
     * mesh uploads so there's no 40 MB upload hitch — gen itself is
     * fast (~200 ms for 40 k tiles of noise). */
    while (!world_gen_complete(G.world)) {
        world_stream_gen(G.world, G.world->tile_count);
    }
    /* Register Tenebris first so it becomes the active body — gets
     * streaming + edit handling. Anything registered after will be
     * one-shot meshed at register time, which is what we want for
     * non-active moons / asteroids. */
    renderer_register_world(G.world);

    /* Build and register every non-main body — moons, neighbouring
     * planets, the asteroid belt. Each is fully generated + chunked
     * synchronously at boot, so block edits on any of them go through
     * the same dirty-rebuild path the active body uses. Subdivision
     * count is auto-picked from radius (planet_subdivisions_for_radius)
     * to target ~1 m hex width on every body — small asteroids end up
     * at subs 3-4, moons 5-6, big planets capped at 7 (~163k tiles). */
    for (int id = BODY_LUNA; id < BODY_COUNT; ++id) {
        const body_config_t* b = planet_get((body_id_t)id);
        if (!b) continue;
        world_t* body_world = world_create(b, planet_subdivisions_for_radius(b->radius_m));
        while (!world_gen_complete(body_world)) world_stream_gen(body_world, body_world->tile_count);
        renderer_register_world(body_world);
        if (G.moon_count < (int)(sizeof(G.moons) / sizeof(G.moons[0]))) {
            G.moons[G.moon_count++] = body_world;
        }
    }

    /* Spawn above the surface at (1, 0, 0). Surface altitude sampled
     * directly so we don't depend on any tile being generated yet. */
    {
        dvec3_t dir = dvec3_make(1, 0, 0);
        float surface_m = planet_surface_altitude(G.body, dir);
        if (surface_m < 0.5f) surface_m = 0.5f;
        G.player.position = dvec3_scale(dir, G.body->radius_m + (double)surface_m + 8.0);
    }

    G.last_time = stm_now();
    G.smoothed_fps = 60.0f;

    /* Show the main menu after worldgen finishes. SP / MP buttons
     * drive the transition into gameplay. Backwards-compat with the
     * `?server=URL` query param is preserved — if present, we skip
     * the menu and jump straight into MP (handy for bookmarks). */
    menu_init();
    remote_players_init();
    chat_init();

#ifdef __EMSCRIPTEN__
    /* ?room=ABCD23 / ?invite=ABCD23 - stash the room (and optional
     * ?server= override) on the menu module so the boot flow Just
     * Works for first-time visitors too. menu_set_pending_invite
     * jumps straight to MP when a profile is already active, or
     * parks on the profile picker until the player creates one and
     * then auto-routes - which keeps their nameplate from rendering
     * as the empty string for everyone else in the room. ?server=
     * alone (no room) drops the user on the regular menu; they can
     * pick HOST / JOIN from the cloud submenu manually. */
    char* room = tenebris_get_room_code();
    char* server_url = tenebris_get_server_url();
    if (room) menu_set_pending_invite(room, server_url);
    if (server_url) free(server_url);
    if (room)       free(room);
#endif
}

/* --------------------------------------------------------------------- */

/* Find the world_t backing a given body. G.world holds Tenebris's
 * voxel state; every other body's world lives in G.moons[]. Returns
 * NULL if the body wasn't registered (shouldn't happen for any body
 * planet_get() returns, but a defensive null-check keeps the
 * physics path safe if it ever does). Used by the per-frame update
 * to hand player_update / interact_update the world matching the
 * player's current frame of reference, so gravity and ground snap
 * work on every body — not just on Tenebris. */
static world_t* world_for_body(const body_config_t* body) {
    if (!body) return NULL;
    if (G.world && G.world->body == body) return G.world;
    for (int i = 0; i < G.moon_count; ++i) {
        if (G.moons[i] && G.moons[i]->body == body) return G.moons[i];
    }
    return NULL;
}

/* --------------------------------------------------------------------- */

/* F2 master toggle for ALL debug UI: tile-count + FPS + key hints in
 * update_overlay, the on-screen sokol error overlay, the F1 players
 * panel, the F3/P profiler, the H/J/K render-visibility toggles, and
 * the mobile hamburger menu (which holds those toggles + the
 * profiler). Off by default so casual players never see the
 * scaffolding. Per CLAUDE.md, every debug-only readout / shortcut /
 * panel funnels through this single gate. */
static bool G_debug_ui_visible = false;

/* Always-on bottom-right strip: protocol version + active profile
 * name when in MP. Not gated on the F2 debug toggle - the version
 * is the first thing a player checks when they see a "refresh the
 * page" popup, and the profile name reassures them they're logged
 * in as themselves. */
static void draw_version_strip(void) {
    char line[80];
    int  n = 0;
    if (menu_state() == GAME_IN_GAME_MP) {
        /* Priority: active profile name > server-side cached name
         * for our welcome.player_id > 'guest'. The cache fallback
         * picks up the server's 'guest-N' label when the player
         * really did join without a profile, and the explicit
         * 'guest' string covers the moment between menu transition
         * and WELCOME. */
        profile_t active;
        const char* nm = NULL;
        if (profile_get_active(&active) && active.name[0]) nm = active.name;
        if (!nm) {
            const net_client_welcome_t* w = net_client_welcome();
            if (w) nm = net_client_name_for_id(w->player_id);
        }
        if (!nm || !*nm) nm = "guest";
        n = snprintf(line, sizeof line, "%s  v%u",
                     nm, TENEBRIS_PROTOCOL_VERSION);
    } else {
        n = snprintf(line, sizeof line, "v%u", TENEBRIS_PROTOCOL_VERSION);
    }
    if (n <= 0) return;
    /* sdtx scale 1 = 8 px per glyph. Stick the line one row up from
     * the absolute bottom-right corner. The canvas is the full
     * screen size so origin is in glyph cells (1 cell = 8 px). */
    const float w = sapp_widthf();
    const float h = sapp_heightf();
    if (w < 64.0f || h < 16.0f) return;
    sdtx_canvas(w, h);
    sdtx_font(0);
    /* Place text right-anchored: origin_x = (w - text_w) / 8 cells. */
    float text_w = 8.0f * (float)n;
    float origin_x = (w - text_w - 8.0f) / 8.0f;
    float origin_y = (h - 12.0f) / 8.0f;
    sdtx_origin(origin_x, origin_y);
    sdtx_color3b(0xa0, 0xc0, 0xff);
    sdtx_home();
    sdtx_printf("%s", line);
}

static void update_overlay(float dt) {
    const float inst_fps = (dt > 0.0f) ? (1.0f / dt) : 0.0f;
    G.smoothed_fps = G.smoothed_fps * 0.9f + inst_fps * 0.1f;

    /* Every readout in this function - tile count, FPS, net status,
     * frame / alt / yaw / tile / tris, mode banner, hide-terrain
     * key hints, the loading progress percent, the target row, the
     * F1 / F3 / T key hints - is developer scaffolding. Hide all of
     * it unless the player has explicitly toggled the debug UI on
     * with F2. Gameplay surfaces (hotbar, mining bar, chat, pause
     * menu, connect-error popup, nameplates) live in their own draw
     * functions and stay visible. */
    if (!G_debug_ui_visible) return;

    sdtx_canvas(sapp_widthf() * 0.5f, sapp_heightf() * 0.5f);
    sdtx_origin(1.0f, 1.0f);
    sdtx_color3b(0xff, 0xff, 0xff);
    sdtx_printf("Tenebris WASM Preview (Goldberg %d tiles, %d moons)\n",
                goldberg_tile_count(G.world->grid),
                renderer_moon_count());
    sdtx_printf("FPS: %.1f\n", G.smoothed_fps);
    /* Menu / pause state line for live debugging. Visible alongside
     * the JS-console trace stream so two-screen diagnosis is possible
     * (devtools open + game in-frame). */
    sdtx_color3b(0xff, 0xc0, 0x70);
    sdtx_printf("menu state=%d pause=%d locked=%d overlay=%d\n",
                (int)menu_state(), (int)menu_pause_active(),
                (int)sapp_mouse_locked(), (int)menu_is_overlay());
    sdtx_color3b(0xff, 0xff, 0xff);

    {
        /* Desync banner is its own popup panel — see draw_desync_popup
         * just below in the UI overlay block. No HUD line here so the
         * tiny corner status row doesn't double up with the popup. */
    }
    {
        net_client_state_t ns = net_client_state();
        if (ns != NET_CLIENT_IDLE) {
            const char* label =
                ns == NET_CLIENT_CONNECTING ? "connecting"  :
                ns == NET_CLIENT_HANDSHAKE  ? "handshaking" :
                ns == NET_CLIENT_READY      ? "online"      :
                                              "offline";
            if (ns == NET_CLIENT_READY) {
                const net_client_welcome_t* w = net_client_welcome();
                sdtx_color3b(0x80, 0xff, 0x80);
                const char* room = menu_room_code();
                if (room && room[0]) {
                    sdtx_printf("net: %s (player-id=%u, body=%u, +%d remote) "
                                "room: %s\n",
                                label, w->player_id, w->body_id,
                                remote_players_count(), room);
                } else {
                    sdtx_printf("net: %s (player-id=%u, body=%u, +%d remote) "
                                "room: public\n",
                                label, w->player_id, w->body_id,
                                remote_players_count());
                }
            } else {
                sdtx_color3b(0xff, 0xc0, 0x40);
                sdtx_printf("net: %s\n", label);
            }
            sdtx_color3b(0xff, 0xff, 0xff);
        }
    }

    dvec3_t pos = player_world_pos(&G.player);
    /* Altitude reads against the body the player is currently
     * anchored to (G.player.body), not the spawn-time root planet
     * (G.body) — once the SOI tracker hands the frame off to e.g.
     * Sequoia, "alt" should show metres above Sequoia, not above
     * Tenebris's centre. Same logic for the body name. */
    const body_config_t* frame = G.player.body ? G.player.body : G.body;
    double dx = pos.x - frame->pos_x;
    double dy = pos.y - frame->pos_y;
    double dz = pos.z - frame->pos_z;
    double r = sqrt(dx*dx + dy*dy + dz*dz);
    double alt = r - frame->radius_m;
    /* Per-frame gravity readout — same query the player physics
     * uses, so the % shown here is exactly what the gravity
     * integrator is multiplying base_gravity by this tick. Status
     * tag mirrors PlanetPlayer.updateUI: SPACE FLIGHT / ENTERING
     * GRAVITY / AIRBORNE / GROUNDED. */
    const lod_config_t* L = config_lod();
    gravity_query_t hud_gq = planet_gravity_at(pos,
                                               L->gravity_full_mult,
                                               L->gravity_falloff_mult);
    const char* status =
        G.player.is_in_space               ? "[SPACE FLIGHT]"
      : (G.player.transition_timer_s > 0)  ? "[ENTERING GRAVITY]"
      : G.player.grounded                  ? "[GROUNDED]"
      :                                      "[AIRBORNE]";
    sdtx_printf("frame: %s  radius: %.1f m\n", frame->name, frame->radius_m);
    sdtx_printf("alt: %.1f m  grav: %3.0f%%  %s\n",
                alt, hud_gq.multiplier * 100.0f, status);
    sdtx_printf("yaw: %.2f  pitch: %.2f  tile: %d\n",
                G.player.yaw, G.player.pitch, G.player.last_tile);
    sdtx_printf("tris: %zu  tiles drawn: %zu  remeshed/f: %zu\n",
                renderer_triangles_drawn_this_frame(),
                renderer_tiles_drawn_this_frame(),
                renderer_tiles_remeshed_this_frame());

    if (!world_gen_complete(G.world)) {
        sdtx_color3b(0xf0, 0xc0, 0x50);
        sdtx_printf("loading world... %d%%\n", world_gen_progress_pct(G.world));
        sdtx_color3b(0xff, 0xff, 0xff);
    }
    if (G.interact.has_target) {
        if (G.interact.is_torch_target) {
            sdtx_printf("target: torch #%d  dist=%.1fm  [LMB break]\n",
                        G.interact.torch_idx, G.interact.distance);
        } else {
            sdtx_printf("target: tile=%d depth=%d dist=%.1fm\n",
                        G.interact.hit_tile, G.interact.hit_depth,
                        G.interact.distance);
        }
    }

    /* Mode + hotbar. */
    if (G.player.survival_mode) sdtx_color3b(0xff, 0x90, 0x70);
    else                         sdtx_color3b(0x90, 0xc0, 0xff);
    sdtx_printf("MODE: %s   [G to toggle]\n",
                G.player.survival_mode ? "SURVIVAL" : "CREATIVE");
    sdtx_color3b(0xff, 0xff, 0xff);
    /* Debug terrain visibility — bright cyan when hidden so it's
     * obvious the toggle is on. Tap top-right corner on touch
     * devices, press H on desktop. */
    if (!renderer_terrain_visible()) {
        sdtx_color3b(0x55, 0xff, 0xff);
        sdtx_printf("TERRAIN HIDDEN  [H or top-right tap]\n");
        sdtx_color3b(0xff, 0xff, 0xff);
    } else {
        sdtx_printf("[H] hide terrain\n");
    }
    if (!renderer_water_visible()) {
        sdtx_color3b(0x55, 0xff, 0xff);
        sdtx_printf("WATER HIDDEN    [J or top-left tap]\n");
        sdtx_color3b(0xff, 0xff, 0xff);
    } else {
        sdtx_printf("[J] hide water\n");
    }
    if (!renderer_skybox_visible()) {
        sdtx_color3b(0x55, 0xff, 0xff);
        sdtx_printf("SKY/ATMO HIDDEN [K or top-mid tap]\n");
        sdtx_color3b(0xff, 0xff, 0xff);
    } else {
        sdtx_printf("[K] hide sky/atmo\n");
    }
    /* Always-visible reminders so the player knows the keys exist
     * even if the top-right hamburger menu is hard to spot. */
    sdtx_printf("[T] teleport menu   [F3 / P] profiler   [F1] players\n");
}

/* Centred mining progress bar drawn via sokol_gl. Replaces the older
 * ASCII "[####----] 50%" version that violated CLAUDE.md's no-ASCII-art
 * rule. Visible only while a survival mine is in progress; positioned
 * just above the hotbar so the player's eye line stays near the
 * action. */
static void draw_mining_bar(float screen_w, float screen_h) {
    if (!G.player.survival_mode) return;
    if (G.interact.mining_progress_s <= 0.0f) return;

    float pct = G.interact.mining_progress_s / MINING_TIME_S;
    if (pct < 0.0f) pct = 0.0f;
    if (pct > 1.0f) pct = 1.0f;

    const float bar_w   = 280.0f;
    const float bar_h   = 14.0f;
    const float pad     = 3.0f;
    const float bx      = screen_w * 0.5f - bar_w * 0.5f;
    /* Sit ~96 px above the bottom edge, just above the hotbar
     * (SLOT_SIZE 48 + BOTTOM_MARGIN 18 + breathing room). */
    const float by      = screen_h - 96.0f;
    const float fill_w  = bar_w * pct;

    sgl_defaults();
    sgl_matrix_mode_projection();
    sgl_load_identity();
    sgl_ortho(0.0f, screen_w, screen_h, 0.0f, -1.0f, 1.0f);
    sgl_matrix_mode_modelview();
    sgl_load_identity();

    static sgl_pipeline pip = (sgl_pipeline){0};
    if (pip.id == 0) {
        pip = sgl_make_pipeline(&(sg_pipeline_desc){
            .colors[0].blend = {
                .enabled = true,
                .src_factor_rgb   = SG_BLENDFACTOR_SRC_ALPHA,
                .dst_factor_rgb   = SG_BLENDFACTOR_ONE_MINUS_SRC_ALPHA,
                .src_factor_alpha = SG_BLENDFACTOR_ONE,
                .dst_factor_alpha = SG_BLENDFACTOR_ONE,
            },
        });
    }
    sgl_load_pipeline(pip);

    /* Track (dark backdrop with halo) so the bar reads against any
     * sky / terrain colour. */
    sgl_begin_quads();
    sgl_c4f(0.04f, 0.06f, 0.10f, 0.85f);
    sgl_v2f(bx - pad,         by - pad);
    sgl_v2f(bx + bar_w + pad, by - pad);
    sgl_v2f(bx + bar_w + pad, by + bar_h + pad);
    sgl_v2f(bx - pad,         by + bar_h + pad);
    sgl_end();

    /* Fill - warm orange that matches the old colour scheme but as a
     * real quad rather than glyphs. */
    sgl_begin_quads();
    sgl_c4f(0.95f, 0.62f, 0.22f, 1.0f);
    sgl_v2f(bx,          by);
    sgl_v2f(bx + fill_w, by);
    sgl_v2f(bx + fill_w, by + bar_h);
    sgl_v2f(bx,          by + bar_h);
    sgl_end();

    /* Light border around the bar interior. */
    const float t = 1.0f;
    sgl_begin_quads();
    sgl_c4f(0.85f, 0.90f, 1.0f, 0.95f);
    sgl_v2f(bx,             by);
    sgl_v2f(bx + bar_w,     by);
    sgl_v2f(bx + bar_w,     by + t);
    sgl_v2f(bx,             by + t);
    sgl_v2f(bx,             by + bar_h - t);
    sgl_v2f(bx + bar_w,     by + bar_h - t);
    sgl_v2f(bx + bar_w,     by + bar_h);
    sgl_v2f(bx,             by + bar_h);
    sgl_v2f(bx,             by);
    sgl_v2f(bx + t,         by);
    sgl_v2f(bx + t,         by + bar_h);
    sgl_v2f(bx,             by + bar_h);
    sgl_v2f(bx + bar_w - t, by);
    sgl_v2f(bx + bar_w,     by);
    sgl_v2f(bx + bar_w,     by + bar_h);
    sgl_v2f(bx + bar_w - t, by + bar_h);
    sgl_end();
    /* No sgl_draw - centralised flush at end of frame. */

    /* Percentage label centred just above the bar. */
    char buf[24];
    snprintf(buf, sizeof buf, "MINING %d%%", (int)(pct * 100.0f));
    int n = (int)strlen(buf);
    const float scale = 1.0f;
    const float cell  = 8.0f * scale;
    const float text_w = cell * (float)n;
    const float tx = screen_w * 0.5f - text_w * 0.5f;
    const float ty = by - cell - 4.0f;
    sdtx_canvas(screen_w / scale, screen_h / scale);
    sdtx_font(1);
    sdtx_origin(tx / cell, ty / cell);
    sdtx_color3b(0xff, 0xd0, 0x70);
    sdtx_home();
    sdtx_printf("%s", buf);
    sdtx_font(0);
    sdtx_color3b(0xff, 0xff, 0xff);
    /* sdtx flush is centralised at frame end - see note in
     * hotbar_ui_draw. Premature sdtx_draw here was uploading the
     * vertex buffer before later text (pause / nameplates) had a
     * chance to queue, which made those reads STALE GPU memory
     * and was the root of the menu-UI-bleed-into-gameplay bug. */
}

/* --------------------------------------------------------------------- */

/* One-shot apply of a resume pose when SP transitions in. Reads
 * the menu's queued save and writes it into the player + the camera
 * frame. Called from the top of frame() the first tick we're in
 * GAME_IN_GAME_SP. */
static bool G_sp_resume_applied = false;

/* Tracks which menu state we last primed inventory / survival defaults
 * for, so the per-frame check below only fires on the actual menu
 * transition rather than every frame. -1 = never primed. */
static int G_inv_primed_for_state = -1;

static void maybe_prime_mode_for_state(void) {
    int s = (int)menu_state();
    if (s == G_inv_primed_for_state) return;
    if (s == GAME_IN_GAME_MP) {
        /* MP defaults to survival: blocks have quantity, players only
         * keep what they've mined. Jetpack is unaffected (it isn't
         * gated by survival_mode). Torches still flow in unlimited
         * via inventory_init_empty so caves are lightable without a
         * crafting system. */
        G.player.survival_mode = true;
        inventory_init_empty(&G.player.inventory);
        printf("[main] entered MP - survival mode + empty hotbar (torches granted)\n");
    } else if (s == GAME_IN_GAME_SP) {
        /* SP stays creative by default; the G key still toggles
         * survival mid-session if the player wants the challenge. */
        G.player.survival_mode = false;
        inventory_init_creative(&G.player.inventory);
    }
    G_inv_primed_for_state = s;
}

/* Restore every saved tile column + torch list for an SP world. Runs
 * once when the SP session enters gameplay (procgen has already baked
 * the baseline at boot). Per CLAUDE.md persistence rule, every edit
 * the player made before reload is on disk - this is the read side
 * of that contract. */
static void apply_sp_world_saves(world_t* w) {
    if (!w || !w->body) return;
    const char* world_name = menu_active_world();
    if (!world_name || !*world_name) return;

    /* Tile columns: enumerate every tenebris-c:tile:<world>:<body>:*
     * entry, load it, and apply per-voxel via world_set so dirty
     * marking + light invalidation behave exactly as a live edit
     * would. Cap matches the largest goldberg tile count we ever
     * build (sub=7 = ~164k). */
    static int  s_idx_buf[200000];
    int n = persistence_list_saved_tiles(world_name, (uint32_t)w->body->id,
                                         s_idx_buf,
                                         (int)(sizeof(s_idx_buf) / sizeof(s_idx_buf[0])));
    int tiles_applied = 0;
    int voxels_applied = 0;
    for (int i = 0; i < n; ++i) {
        int tile = s_idx_buf[i];
        if (tile < 0 || tile >= w->tile_count) continue;
        uint8_t column[PERSISTENCE_COLUMN_BYTES];
        if (!persistence_load_tile(world_name, (uint32_t)w->body->id, tile, column))
            continue;
        for (int d = 0; d < PERSISTENCE_COLUMN_BYTES && d < WORLD_MAX_DEPTH; ++d) {
            block_t b = (block_t)column[d];
            if (b != (block_t)w->blocks[tile * WORLD_MAX_DEPTH + d]) {
                world_set(w, tile, d, b);
                ++voxels_applied;
            }
        }
        ++tiles_applied;
    }
    if (tiles_applied > 0) {
        printf("[sp-saves] body=%d: %d tile(s) restored, %d voxel(s) overwrote procgen\n",
               (int)w->body->id, tiles_applied, voxels_applied);
        fflush(stdout);
    }

    /* Torch list: load + replay through torch_place. The runtime
     * list is global, so this body's torches accumulate alongside
     * any others restored earlier in the loop.
     *
     * After placing each, also mark every mesh tile within the
     * torch's light range as dirty so the renderer remeshes those
     * chunks with the loaded torch baked into the per-vertex
     * torch_light sum. Without this, tiles that were already meshed
     * before the load finished (e.g. the streaming mesher got to
     * them first) would keep their pre-load torch_light=0 forever -
     * the user-visible bug: caves stayed dark after a reload even
     * though the torches were physically back in the world. */
    persistence_torch_t torches[TORCH_MAX_COUNT];
    int tn = persistence_load_torches(world_name, (uint32_t)w->body->id,
                                      torches, TORCH_MAX_COUNT);
    int placed = 0;
    for (int i = 0; i < tn; ++i) {
        vec3_t pos = { torches[i].pos[0], torches[i].pos[1], torches[i].pos[2] };
        vec3_t up  = { torches[i].up[0],  torches[i].up[1],  torches[i].up[2]  };
        if (torch_place(pos, up, torches[i].tile_idx)) {
            world_dirty_in_range(w, pos, TORCH_LIGHT_RANGE_M);
            ++placed;
        }
    }
    if (placed > 0) {
        printf("[sp-saves] body=%d: %d torch(es) restored\n",
               (int)w->body->id, placed);
        fflush(stdout);
    }
}

static void maybe_apply_sp_resume(void) {
    if (G_sp_resume_applied) return;
    if (menu_state() != GAME_IN_GAME_SP) return;

    /* Always replay saved tiles + torches when entering SP, even if
     * the menu didn't hand us a one-shot pose resume (e.g. starting
     * fresh on an existing world). World saves are independent of
     * pose - the player wants their builds back regardless. */
    apply_sp_world_saves(G.world);
    for (int i = 0; i < G.moon_count; ++i) {
        apply_sp_world_saves(G.moons[i]);
    }

    persistence_save_t s;
    if (!menu_take_sp_resume(&s)) { G_sp_resume_applied = true; return; }

    G.player.position = (dvec3_t){ .x = s.pos_x, .y = s.pos_y, .z = s.pos_z };
    G.player.yaw      = s.yaw;
    G.player.pitch    = s.pitch;
    /* roll lives in the save struct for forward-compat but the
     * player_ctrl_t doesn't track it — basis re-slerp on body change
     * is what levels the camera. Body resolution stays on Tenebris
     * for now; M4's SOI tracker handles re-anchoring on the fly. */
    (void)s.roll;
    (void)s.body_id;
    G_sp_resume_applied = true;
}

/* Apply the server-side saved pose on the FIRST MP entry only.
 * Reconnects within the same MP session (temporary socket drop ->
 * the client reopens, gets a fresh player_id + WELCOME) skip the
 * snap so the player doesn't get yanked backwards to whatever pose
 * the server last persisted. The next periodic flush brings the
 * server back in line with the client's live position.
 *
 * G_mp_spawn_applied flips back to false the moment we leave MP
 * (back to main menu / SP), so a fresh re-entry to MP picks the
 * server pose up again as expected. */
static bool   G_mp_spawn_applied = false;
static void maybe_apply_mp_spawn(void) {
    int s = (int)menu_state();
    if (s != GAME_IN_GAME_MP) {
        G_mp_spawn_applied = false;
        return;
    }
    if (G_mp_spawn_applied) return;
    if (net_client_state() != NET_CLIENT_READY) return;
    const net_client_welcome_t* w = net_client_welcome();
    if (!w) return;
    /* Sentinel: server always fills spawn with either the default
     * pole spawn or a persisted pose, both of which are non-zero
     * in at least one axis. Zero on all three means the WELCOME
     * arrived without a meaningful spawn - leave the player where
     * the client already placed them. */
    if (w->spawn_x == 0.0 && w->spawn_y == 0.0 && w->spawn_z == 0.0) {
        G_mp_spawn_applied = true;
        return;
    }

    dvec3_t spawn = (dvec3_t){ .x = w->spawn_x, .y = w->spawn_y, .z = w->spawn_z };
    /* Ground-snap: if the saved pose lives above the surface (which
     * happens whenever the periodic 0.5 s save fires mid-jump or
     * during jetpack flight), drop the player straight back down to
     * just over the surface column rather than spawning them at the
     * jump / flight apex.
     *
     * Snap is done in body-local coords against the authoritative
     * procgen surface for the saved body. Bounds:
     *   - Positions AT or BELOW the surface (caves, tunnels,
     *     dug-out areas) are left untouched.
     *   - Positions far above the surface (>= SNAP_MAX_ALT_M above
     *     the surface column) are also left untouched - the player
     *     was probably in space or on a long jetpack hop, and
     *     yanking them onto a planet they were flying past would
     *     be worse than the floating-spawn it solves. */
    /* Minimum delta to trigger the snap. planet_surface_altitude() is a
     * cheap analytic sample of the procedural height field; the actual
     * collision mesh is produced by the chunker and disagrees by up to
     * ~1 m at the same direction. A saved pose that's grounded on the
     * mesh therefore reads as ~0.5-1.0 m "above" the analytic surface
     * here, and the snap used to push it UP into the mesh, after which
     * the physics solver ejected the player 25-30 m radially to escape
     * interpenetration - exactly the floating-spawn we were trying to
     * fix. Only trigger the snap when the saved pose is meaningfully
     * above the surface (mid-jump / jetpack saves), not for sub-metre
     * procgen-vs-mesh noise. */
    const double SNAP_MIN_ALT_M = 3.0;
    const double SNAP_MAX_ALT_M = 100.0;
    /* body_id resolution. Three cases:
     *   - BODY_ID_IN_SPACE: player logged out in deep space. Apply
     *     the absolute pose, no snap, and don't bind the player to
     *     any body. The next planet_gravity_at tick will pick one up
     *     if the saved coords happen to be inside a falloff radius.
     *   - Valid id we know about: snap as before AND explicitly bind
     *     G.player.body so the renderer activates that body the same
     *     frame instead of waiting one gravity-tick of auto-switch.
     *     This is what fixes "logged out on a different planet, came
     *     back to a black screen".
     *   - Unknown / out-of-range id: log and treat like in-space. */
    const body_config_t* spawn_body = NULL;
    const bool spawn_in_space = (w->body_id == BODY_ID_IN_SPACE);
    if (spawn_in_space) {
        printf("[main] MP spawn: body=IN_SPACE, applying absolute pose without ground-snap\n");
    } else {
        spawn_body = planet_get((body_id_t)w->body_id);
        if (!spawn_body) {
            printf("[main] WARN MP spawn: unknown body_id=%u, treating as in-space\n",
                   w->body_id);
        }
    }
    if (spawn_body) {
        dvec3_t center = dvec3_make(spawn_body->pos_x,
                                     spawn_body->pos_y,
                                     spawn_body->pos_z);
        dvec3_t local  = dvec3_sub(spawn, center);
        double  r      = dvec3_length(local);
        if (r > 1e-6) {
            dvec3_t dir   = dvec3_scale(local, 1.0 / r);
            float   surf  = planet_surface_altitude(spawn_body, dir);
            if (surf < 0.5f) surf = 0.5f;
            const double surface_r = spawn_body->radius_m + (double)surf;
            const double ground_r  = surface_r + 1.5;
            const double alt_above_surf = r - surface_r;
            if (alt_above_surf > SNAP_MIN_ALT_M && alt_above_surf < SNAP_MAX_ALT_M) {
                spawn = dvec3_add(center, dvec3_scale(dir, ground_r));
                printf("[main] MP spawn ground-snapped: was alt=%.1fm, snapped to %.1fm\n",
                       r - spawn_body->radius_m,
                       ground_r - spawn_body->radius_m);
            }
        }
    }
    G.player.position = spawn;
    G.player.velocity = (dvec3_t){0};
    G.player.yaw      = w->spawn_yaw;
    G.player.pitch    = w->spawn_pitch;
    /* Force a fresh planet basis at the new position so the saved
     * yaw / pitch read as 'look this way relative to the surface'
     * rather than 'apply on top of the previous body's basis'.
     *
     * The MP spawn intentionally does NOT arm the roll slerp. The
     * player is appearing at this position for the first time of
     * the session - there's no previous orientation to "ease from",
     * so the slerp just shows up as a visible spin-up rolling the
     * camera level over a second. player_rebuild_basis below
     * computes the surface-aligned basis directly, and the next
     * planet-mode tick parallel-transports it forward at no further
     * cost. (player_set_body / player_teleport_to elsewhere arm the
     * slerp on body SWAPS, which IS an "ease from previous up to
     * new up" scenario - that path is unchanged.) */
    G.player.basis_ready = false;
    G.player.last_tile   = -1;
    G.player.transition_timer_s = 0.0f;
    /* Bind the player to the saved body so the renderer's per-frame
     * "world for current body" lookup activates the right one on the
     * very next draw. Without this, a player who logged out near
     * Crag would rejoin with G.player.body still pointing at the
     * boot-time Tenebris (registered first at init), and the renderer
     * would draw an empty frame (Crag not loaded, position too far
     * from Tenebris for it to render) until the gravity tick swapped
     * the anchor several frames later.
     *
     * In-space rejoin keeps the boot-default body as the anchor.
     * The whole engine (sync_basis_to_planet, player_local_pos,
     * renderer atmosphere uniforms, world_for_body fallback) reads
     * p->body without a NULL check - clearing it produces NaN
     * through the basis and a black screen. is_in_space is set
     * separately by the gravity tick once player_update runs, so
     * 6DOF controls activate naturally; we just need *some* valid
     * body so the engine has a coordinate frame to render in. */
    if (spawn_body && G.player.body != spawn_body) {
        player_set_body(&G.player, spawn_body);
    }
    /* Cold-rebuild the basis from the just-applied position. Critical
     * for in-space spawns - the player enters space-mode immediately
     * (gravity tick sees no body in falloff), and space-mode never
     * calls sync_basis_to_planet. Without this the basis stays at
     * the zero vectors player_init left it at, producing a degenerate
     * view matrix (black screen) and zero-length thrust axes (player
     * frozen in place). Cheap; safe on planet-side spawns too since
     * the planet-mode tick re-syncs the basis on its first frame
     * anyway. */
    player_rebuild_basis(&G.player);
    /* Loud diagnostic for the floating-spawn investigation. Reports
     * the WELCOME pose, the body, the final applied position, and
     * the altitude above that body's surface so we can tell exactly
     * how far in the air the spawn ended up. */
    {
        const body_config_t* sb = planet_get((body_id_t)w->body_id);
        double r = 0.0, alt = 0.0;
        if (sb) {
            double dx = spawn.x - sb->pos_x;
            double dy = spawn.y - sb->pos_y;
            double dz = spawn.z - sb->pos_z;
            r = sqrt(dx*dx + dy*dy + dz*dz);
            alt = r - sb->radius_m;
        }
        printf("[main] MP spawn applied: player_id=%u "
               "welcome=(%.2f, %.2f, %.2f) body=%u -> pos=(%.2f, %.2f, %.2f) "
               "r=%.2f alt=%+.2f yaw=%.2f pitch=%.2f\n",
               w->player_id,
               w->spawn_x, w->spawn_y, w->spawn_z, w->body_id,
               spawn.x, spawn.y, spawn.z, r, alt,
               w->spawn_yaw, w->spawn_pitch);
    }
    G_mp_spawn_applied = true;
}

/* Last position the client shipped to the server via
 * net_client_send_player_state. Used by the 10 s position log so
 * we can compare 'where the client thinks it is RIGHT NOW' vs
 * 'where the server last heard from us'. Drift between the two
 * is the signature of the floating-spawn bug: if the saved value
 * on disk doesn't match what we're rendering at, something in
 * the send-or-receive pipeline is mangling the y. */
static dvec3_t G_last_sent_pos = (dvec3_t){0};
static uint32_t G_last_sent_body = 0;
static float   G_last_sent_yaw = 0.0f;
static float   G_last_sent_pitch = 0.0f;
static bool    G_last_sent_valid = false;

/* Diagnostic: every 10 s log G.player.position alongside the most
 * recent pose we sent to the server. The server saves what we
 * sent, so the two should round-trip exactly. A divergence here
 * (or between the spawn line and the first 10 s sample after a
 * fresh join) tells us where the floating-spawn delta is coming
 * from. */
static void   periodic_pos_log(double dt) {
    // Commented out per request: this 1 Hz position log floods the
    // console during normal play and crowds out CHUNK_DIFF / AUDIT
    // lines. Restore from git when the next spawn issue lands. The
    // README's debug-log reference still documents the line shape so
    // reading old captures stays meaningful.
    (void)dt;
    // static double accum_s = 0.0;
    // accum_s += dt;
    // if (accum_s < 1.0) return;
    // accum_s = 0.0;
    // const body_config_t* anchor = G.player.body;
    // const body_config_t* b      = anchor ? anchor : G.body;
    // double r = 0.0, alt = 0.0;
    // if (b) {
    //     double dx = G.player.position.x - b->pos_x;
    //     double dy = G.player.position.y - b->pos_y;
    //     double dz = G.player.position.z - b->pos_z;
    //     r = sqrt(dx*dx + dy*dy + dz*dz);
    //     alt = r - b->radius_m;
    // }
    // const char* mode = (menu_state() == GAME_IN_GAME_MP) ? "MP" :
    //                    (menu_state() == GAME_IN_GAME_SP) ? "SP" : "menu";
    // printf("[main] pos %s anchor=%s%s alt-vs=%s curr=(%.2f, %.2f, %.2f) "
    //        "r=%.2f alt=%+.2f yaw=%.2f pitch=%.2f grounded=%d\n",
    //        mode,
    //        anchor ? anchor->name : "NONE",
    //        G.player.is_in_space ? " (in-space)" : "",
    //        b ? b->name : "?",
    //        G.player.position.x, G.player.position.y, G.player.position.z,
    //        r, alt, G.player.yaw, G.player.pitch, (int)G.player.grounded);
    // if (G_last_sent_valid) {
    //     double sr = 0.0, salt = 0.0;
    //     if (b) {
    //         double dx = G_last_sent_pos.x - b->pos_x;
    //         double dy = G_last_sent_pos.y - b->pos_y;
    //         double dz = G_last_sent_pos.z - b->pos_z;
    //         sr = sqrt(dx*dx + dy*dy + dz*dz);
    //         salt = sr - b->radius_m;
    //     }
    //     double ddx = G.player.position.x - G_last_sent_pos.x;
    //     double ddy = G.player.position.y - G_last_sent_pos.y;
    //     double ddz = G.player.position.z - G_last_sent_pos.z;
    //     double delta = sqrt(ddx*ddx + ddy*ddy + ddz*ddz);
    //     char body_str[32];
    //     if (G_last_sent_body == BODY_ID_IN_SPACE) {
    //         snprintf(body_str, sizeof body_str, "IN_SPACE");
    //     } else {
    //         snprintf(body_str, sizeof body_str, "%u", G_last_sent_body);
    //     }
    //     printf("[main] pos %s     sent=(%.2f, %.2f, %.2f) r=%.2f alt=%+.2f "
    //            "body=%s yaw=%.2f pitch=%.2f  delta_from_curr=%.2fm\n",
    //            mode,
    //            G_last_sent_pos.x, G_last_sent_pos.y, G_last_sent_pos.z,
    //            sr, salt, body_str,
    //            G_last_sent_yaw, G_last_sent_pitch, delta);
    // } else {
    //     printf("[main] pos %s     sent=(none yet)\n", mode);
    // }
}

static double G_sp_save_accum = 0.0;
static void   maybe_autosave_sp(double dt) {
    if (menu_state() != GAME_IN_GAME_SP) return;
    const char* world = menu_active_world();
    if (!world || !*world) return;       /* SP without a world — shouldn't happen */
    G_sp_save_accum += dt;
    if (G_sp_save_accum < 5.0) return;
    G_sp_save_accum = 0.0;
    persistence_save_t s = {
        .pos_x = G.player.position.x,
        .pos_y = G.player.position.y,
        .pos_z = G.player.position.z,
        .yaw   = G.player.yaw,
        .pitch = G.player.pitch,
        .roll  = 0.0f,
        .body_id = 0,
    };
    persistence_save(world, &s);
}

/* ------------------------------------------------------------------ */
/* F1 players panel — toggle a small overlay listing every connected
 * player (local + remote) with their lat/long on the body they're
 * standing on. Useful for debugging position-relay + figuring out
 * where friends are without flying to them. */
/* ------------------------------------------------------------------ */

static bool G_players_panel_visible = false;

static void player_lat_lon_deg(dvec3_t world_pos,
                                 const body_config_t* body,
                                 double* out_lat_deg,
                                 double* out_lon_deg,
                                 double* out_alt_m) {
    double dx = world_pos.x - body->pos_x;
    double dy = world_pos.y - body->pos_y;
    double dz = world_pos.z - body->pos_z;
    double len = sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 1e-9) {
        *out_lat_deg = 0.0;
        *out_lon_deg = 0.0;
        *out_alt_m   = -body->radius_m;
        return;
    }
    const double k = 180.0 / 3.14159265358979323846;
    *out_lat_deg = asin(dy / len) * k;
    *out_lon_deg = atan2(dz, dx) * k;
    *out_alt_m   = len - body->radius_m;
}

static void draw_players_panel(float screen_w, float screen_h) {
    if (!G_players_panel_visible) return;
    (void)screen_h;

    /* Count entries upfront so we can size the panel. */
    int local_count = (net_client_state() == NET_CLIENT_READY) ? 1 : 0;
    int remote_n    = remote_players_count();
    int total       = local_count + remote_n;
    if (total < 1) total = 1;       /* show 'no peers' line at minimum */

    const float row_h    = 14.0f;
    const float pad      = 10.0f;
    const float title_h  = 22.0f;
    const float w        = 460.0f;     /* widened for the name column */
    const float h        = title_h + (float)total * row_h + pad;
    const float x        = screen_w - w - 16.0f;
    const float y        = 16.0f;

    /* Backdrop. */
    sgl_defaults();
    sgl_matrix_mode_projection();
    sgl_load_identity();
    sgl_ortho(0.0f, screen_w, screen_h, 0.0f, -1.0f, 1.0f);
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

    sgl_begin_quads();
    sgl_c4f(0.05f, 0.06f, 0.10f, 0.88f);
    sgl_v2f(x,     y);
    sgl_v2f(x + w, y);
    sgl_v2f(x + w, y + h);
    sgl_v2f(x,     y + h);
    sgl_end();

    const float t = 1.5f;
    sgl_begin_quads();
    sgl_c4f(0.55f, 0.65f, 0.85f, 0.85f);
    sgl_v2f(x,           y);           sgl_v2f(x + w,       y);           sgl_v2f(x + w,       y + t);     sgl_v2f(x,           y + t);
    sgl_v2f(x,           y + h - t);   sgl_v2f(x + w,       y + h - t);   sgl_v2f(x + w,       y + h);     sgl_v2f(x,           y + h);
    sgl_v2f(x,           y);           sgl_v2f(x + t,       y);           sgl_v2f(x + t,       y + h);     sgl_v2f(x,           y + h);
    sgl_v2f(x + w - t,   y);           sgl_v2f(x + w,       y);           sgl_v2f(x + w,       y + h);     sgl_v2f(x + w - t,   y + h);
    sgl_end();

    /* No sgl_draw - centralised flush at end of frame. */

    /* Title + rows via sdtx. Single scale (= 1) for everything in the
     * panel — sdtx batches per-canvas state, and switching scales
     * mid-panel makes the title and rows render against different
     * canvases (title ends up positioned wrong). */
    {
        const char* title = "PLAYERS [F1]";
        sdtx_canvas(screen_w, screen_h);
        sdtx_font(1);
        sdtx_origin((x + 12.0f) / 8.0f, (y + 8.0f) / 8.0f);
        sdtx_color3b(0xff, 0xff, 0xff);
        sdtx_home();
        sdtx_printf("%s", title);
        sdtx_font(0);
    }
    /* One row per player. */
    float row_y = y + title_h;
    char buf[160];

    if (local_count) {
        const net_client_welcome_t* wcm = net_client_welcome();
        const body_config_t* body = planet_get((body_id_t)wcm->body_id);
        if (!body) body = G.body;
        double lat, lon, alt;
        player_lat_lon_deg(G.player.position, body, &lat, &lon, &alt);
        /* Prefer the active profile name for the local row - the
         * net_client cache is also fed from this on WELCOME, but
         * starting from the profile means we never show '(unknown)'
         * to the player about themselves while WELCOME is in flight
         * or if the cache slot raced. */
        profile_t active;
        const char* nm = NULL;
        if (profile_get_active(&active) && active.name[0]) nm = active.name;
        if (!nm) nm = net_client_name_for_id(wcm->player_id);
        char nmbuf[17];
        char fallback[17];
        if (!nm || !*nm) {
            snprintf(fallback, sizeof fallback, "id-%u", wcm->player_id);
            nm = fallback;
        }
        snprintf(nmbuf, sizeof nmbuf, "%-16s", nm);
        snprintf(buf, sizeof buf,
                 "* %s  %s  lat=%+7.2f  lon=%+7.2f  alt=%5.0fm",
                 nmbuf, body->name, lat, lon, alt);
        sdtx_canvas(screen_w, screen_h);
        sdtx_font(1);
        sdtx_origin((x + 12.0f) / 8.0f, row_y / 8.0f);
        sdtx_color3b(0x80, 0xff, 0xa0);
        sdtx_home();
        sdtx_printf("%s", buf);
        sdtx_font(0);
        row_y += row_h;
    }

    for (int i = 0; i < remote_n; ++i) {
        const remote_player_t* rp = remote_players_get(i);
        if (!rp) continue;
        const body_config_t* body = planet_get((body_id_t)rp->body_id);
        if (!body) body = G.body;
        double lat, lon, alt;
        /* F1 shows the freshest known pose (no interp lag); the
         * renderer's lerp is purely cosmetic for smooth motion. */
        player_lat_lon_deg(rp->pos_cur, body, &lat, &lon, &alt);
        const char* nm = net_client_name_for_id(rp->player_id);
        char nmbuf[17];
        char fallback[17];
        if (!nm || !*nm) {
            /* Show id-N rather than '(unknown)' so every row in the
             * roster is identifiable - PLAYER_INFO might still be
             * in flight for a freshly-joined peer. */
            snprintf(fallback, sizeof fallback, "id-%u", rp->player_id);
            nm = fallback;
        }
        snprintf(nmbuf, sizeof nmbuf, "%-16s", nm);
        snprintf(buf, sizeof buf,
                 "  %s  %s  lat=%+7.2f  lon=%+7.2f  alt=%5.0fm",
                 nmbuf, body->name, lat, lon, alt);
        sdtx_canvas(screen_w, screen_h);
        sdtx_font(1);
        sdtx_origin((x + 12.0f) / 8.0f, row_y / 8.0f);
        sdtx_color3b(0xff, 0xc0, 0x70);
        sdtx_home();
        sdtx_printf("%s", buf);
        sdtx_font(0);
        row_y += row_h;
    }

    if (local_count + remote_n == 0) {
        snprintf(buf, sizeof buf, "  (offline - single player)");
        sdtx_canvas(screen_w, screen_h);
        sdtx_font(1);
        sdtx_origin((x + 12.0f) / 8.0f, row_y / 8.0f);
        sdtx_color3b(0x80, 0x90, 0xa8);
        sdtx_home();
        sdtx_printf("%s", buf);
        sdtx_font(0);
    }
}

/* Server-side desync popup. Drawn during the UI overlay pass — shows
 * a centred panel with the reason + block id for 5 s after each
 * notice, then fades. Real drawn rectangles + sdtx labels per the
 * CLAUDE.md UI rule (no ASCII frames). */
static void draw_desync_popup(float screen_w, float screen_h) {
    double  dsec   = -1.0;
    uint32_t dblock = 0;
    net_desync_kind_t dk = net_client_last_desync(&dsec, &dblock);
    if (dk == NET_DESYNC_NONE || dsec < 0.0 || dsec > 5.0) return;

    /* Fade alpha out over the last second of the 5 s window. */
    float fade = (dsec < 4.0f) ? 1.0f : (float)(5.0 - dsec);

    const float w = 480.0f;
    const float h = 96.0f;
    const float x = (screen_w - w) * 0.5f;
    const float y = 64.0f;     /* near top of screen */

    /* sgl 2D pipeline (alpha-blended). Set up an ortho projection for
     * pixel-space coords with (0,0) top-left. */
    sgl_defaults();
    sgl_matrix_mode_projection();
    sgl_load_identity();
    sgl_ortho(0.0f, screen_w, screen_h, 0.0f, -1.0f, 1.0f);
    sgl_matrix_mode_modelview();
    sgl_load_identity();
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

    /* Backdrop. */
    sgl_begin_quads();
    sgl_c4f(0.18f, 0.04f, 0.04f, 0.85f * fade);
    sgl_v2f(x,     y);
    sgl_v2f(x + w, y);
    sgl_v2f(x + w, y + h);
    sgl_v2f(x,     y + h);
    sgl_end();

    /* Red border, 2 px. */
    const float t = 2.0f;
    sgl_begin_quads();
    sgl_c4f(1.0f, 0.40f, 0.40f, fade);
    /* top */    sgl_v2f(x,     y);         sgl_v2f(x + w, y);         sgl_v2f(x + w, y + t);     sgl_v2f(x,     y + t);
    /* bottom */ sgl_v2f(x,     y + h - t); sgl_v2f(x + w, y + h - t); sgl_v2f(x + w, y + h);     sgl_v2f(x,     y + h);
    /* left */   sgl_v2f(x,     y);         sgl_v2f(x + t, y);         sgl_v2f(x + t, y + h);     sgl_v2f(x,     y + h);
    /* right */  sgl_v2f(x + w - t, y);     sgl_v2f(x + w, y);         sgl_v2f(x + w, y + h);     sgl_v2f(x + w - t, y + h);
    sgl_end();

    /* No sgl_draw - centralised flush at end of frame. */

    /* Labels via sdtx. The scaled-canvas trick (same as menu.c): shrink
     * the canvas by `scale` so each 8-px char cell maps to `8 * scale`
     * screen pixels. Title 3x, body 1.5x. */
    {
        const float title_scale = 3.0f;
        const float title_cell  = 8.0f * title_scale;
        const char* title       = "DESYNC";
        float tw = title_cell * (float)strlen(title);
        float tx = x + (w - tw) * 0.5f;
        float ty = y + 14.0f;
        sdtx_canvas(screen_w / title_scale, screen_h / title_scale);
        sdtx_origin(tx / title_cell, ty / title_cell);
        sdtx_color3b(0xff, 0x80, 0x80);
        sdtx_home();
        sdtx_printf("%s", title);
    }
    {
        const float body_scale = 1.5f;
        const float body_cell  = 8.0f * body_scale;
        char buf[96];
        snprintf(buf, sizeof buf,
                 "server says you're inside block %u  (%.1fs ago)",
                 (unsigned)dblock, dsec);
        float tw = body_cell * (float)strlen(buf);
        float tx = x + (w - tw) * 0.5f;
        float ty = y + 60.0f;
        sdtx_canvas(screen_w / body_scale, screen_h / body_scale);
        sdtx_origin(tx / body_cell, ty / body_cell);
        sdtx_color3b(0xff, 0xc0, 0xc0);
        sdtx_home();
        sdtx_printf("%s", buf);
    }
    /* Restore the default-scale canvas so any later sdtx_printf calls
     * land at expected positions. */
    sdtx_canvas(screen_w, screen_h);
}

static void frame(void) {
    /* Pump the network state machine first so any handshake progress
     * is reflected in this frame's HUD. Cheap — no I/O on the C side
     * on the wasm backend, callbacks fire from the JS event loop. */
    net_client_tick();
    /* Let the menu observe the net state and promote a dropped MP
     * socket to the modal error popup. Must run BEFORE the overlay
     * short-circuit below so the transition takes effect on the same
     * frame the popup is rendered. */
    menu_tick();

    /* In the main menu, draw the menu overlay over the last-rendered
     * scene (3D buffer keeps its previous contents — fine since gameplay
     * hasn't started yet). Skip the entire game update path. */
    if (menu_is_overlay()) {
        sg_begin_pass(&(sg_pass){
            .action = { .colors[0] = { .load_action = SG_LOADACTION_CLEAR,
                                          .clear_value = { 0.04f, 0.06f, 0.10f, 1.0f } } },
            .swapchain = sglue_swapchain(),
        });
        sdtx_canvas(sapp_widthf(), sapp_heightf());
        menu_draw((int)sapp_widthf(), (int)sapp_heightf());
        sdtx_draw();
        sg_end_pass();
        sg_commit();
        return;
    }

    maybe_apply_sp_resume();
    maybe_apply_mp_spawn();
    maybe_prime_mode_for_state();

    /* Pointer-lock-loss -> open pause menu. The browser eats the
     * first Escape press to release pointer lock (we never see the
     * KEY_DOWN event). Detecting the lock-state transition is what
     * gets the pause panel up on a SINGLE Esc press. Only fires
     * during gameplay - the menu states don't lock the mouse to
     * begin with. */
    {
        static bool s_was_mouse_locked = false;
        bool now_locked = sapp_mouse_locked();
        game_state_t st = menu_state();
        bool in_gameplay = (st == GAME_IN_GAME_SP || st == GAME_IN_GAME_MP);
        if (in_gameplay && s_was_mouse_locked && !now_locked
            && !menu_pause_active()) {
            menu_pause_toggle();
            sapp_show_mouse(true);
        }
        s_was_mouse_locked = now_locked;
    }

    const double raw_dt_sec = stm_sec(stm_laptime(&G.last_time));
    float dt = (float)raw_dt_sec;
    /* Lag-spike handling. body_load_detail meshes a whole planet in
     * one go (~160k tiles for Crag / Frostbite, multiple seconds of
     * CPU work synchronously inside renderer_draw_world). While that
     * stalls the frame, the browser keeps firing pointer-move events
     * which input.c happily accumulates into mouse_dx / mouse_dy.
     * When the frame finally completes, the next player_update gets
     * a normal-looking dt (clamped below) but a HUGE accumulated
     * mouse delta — yaw_delta = mouse_dx * MOUSE_SENS spins the
     * camera by tens of degrees in one tick. That's the "wild rotate
     * on chunk load" bug. Solution: when raw_dt indicates a stall,
     * discard the mouse + look-stick deltas before clamping dt, so
     * the player resumes from the orientation they had pre-stall
     * rather than wherever the cursor happened to drift. */
    const float LAG_SPIKE_S = 0.1f;
    if (dt > LAG_SPIKE_S) {
        printf("[ERROR] [lag] frame stall %.3fs (clamped to %.3fs); "
               "discarding %d/%d px of accumulated mouse delta\n",
               dt, LAG_SPIKE_S,
               (int)input_state()->mouse_dx, (int)input_state()->mouse_dy);
        fflush(stdout);
        input_state_t* s = input_state_mut();
        s->mouse_dx = 0;
        s->mouse_dy = 0;
        s->look_stick_x = 0;
        s->look_stick_y = 0;
        dt = LAG_SPIKE_S;
    }
    G.tick++;
    profiler_begin_frame();

    /* Stream a few tiles of terrain per frame. The profiler slot
     * names use '-' separators rather than '_' because sokol_debug-
     * text's oric font renders ASCII 0x5F ('_') as a euro-sign glyph
     * — switching the labels keeps the readout legible without
     * swapping fonts or patching the third-party header. */
    profiler_begin("worldgen");
    if (!world_gen_complete(G.world)) {
        world_stream_gen(G.world, GEN_TILES_PER_FRAME);
    }
    profiler_end("worldgen");

    /* Poll touch-button edge events before consuming input - the
     * teleport menu's mobile nav buttons live in input.c and this is
     * the only place to drive them. Also swallows any body-selection
     * click before movement/interact reads the input state. Skipped
     * in survival - no teleport entry points at all. */
    if (G_debug_ui_visible) teleport_menu_poll_touches();

    /* G-key toggles survival mode in SP. Switching modes resets the
     * inventory to the appropriate starter state so creative-bonanza
     * items don't persist into a fresh survival run, and so a
     * survival stockpile doesn't leak back into a creative session.
     *
     * MP is always survival - creative would let any joiner spawn
     * unlimited blocks and edit the shared world, so the toggle is
     * gated to SP only here. Consume the edge either way so a stale
     * press doesn't fire the moment the player exits to the main
     * menu and starts an SP session. */
    if (input_consume_survival_toggle()) {
        if (menu_state() == GAME_IN_GAME_SP) {
            G.player.survival_mode = !G.player.survival_mode;
            if (G.player.survival_mode) inventory_init_empty(&G.player.inventory);
            else                        inventory_init_creative(&G.player.inventory);
        }
    }

    /* Pre-update body selection. Picks whichever body delivers the
     * strongest gravity pull at the player's current position; if
     * that's a different body than p->body, swap (player_set_body
     * arms the roll-slerp on space → planet edges). Doing this
     * before player_update means the world_t we hand in matches
     * p->body even at the exact frame the swap happens — no
     * one-frame "fall through the planet" gap. */
    {
        const lod_config_t* L = config_lod();
        gravity_query_t gq = planet_gravity_at(G.player.position,
                                               L->gravity_full_mult,
                                               L->gravity_falloff_mult);
        if (gq.body && gq.body != G.player.body) {
            player_set_body(&G.player, gq.body);
        }
    }
    /* Route physics through the world that backs the player's
     * current body. player_update will re-query gravity internally
     * for the smooth multiplier; the body has already been pinned
     * by the swap above. Falls back to G.world when the lookup
     * misses so the path is never NULL. */
    world_t* phys_world = world_for_body(G.player.body);
    if (!phys_world) phys_world = G.world;
    profiler_begin("player-update");
    /* Pause keeps physics running so the world stays alive behind the
     * panel - gravity pulls falling players to the ground, mining
     * timers keep ticking, and MP clients don't desync from the
     * server-authoritative simulation. We do zero out the held-key
     * + click state for the duration so the player doesn't slide
     * forward on a W that was held when Esc was pressed; they'll
     * re-press to move on resume. */
    if (menu_pause_active()) {
        input_state_t* mut = input_state_mut();
        mut->phys = (phys_input_t){0};
        mut->left_held = false;
        mut->right_held = false;
        mut->left_click = false;
        mut->right_click = false;
        mut->middle_click = false;
        mut->stick_active = false;
        mut->stick_x = mut->stick_y = 0.0f;
        mut->look_stick_active = false;
        mut->look_stick_x = mut->look_stick_y = 0.0f;
    }
    /* MP join freeze: while the socket is still connecting / handshaking,
     * the server's saved pose hasn't arrived yet. Running physics now
     * would let the player fall from whatever stale pose the client
     * last had, and then snap to the server pose when WELCOME lands -
     * that's the "teleporting" the user sees. Skip the update entirely
     * until net is READY; maybe_apply_mp_spawn applies the pose on the
     * frame the WELCOME arrives, and simulation resumes from there. */
    const bool mp_loading = (menu_state() == GAME_IN_GAME_MP
                             && net_client_state() != NET_CLIENT_READY);
    if (!mp_loading) {
        player_update(&G.player, phys_world, dt);
    }
    profiler_end("player-update");
    /* Throttled SP autosave: writes the player's pose to localStorage
     * every 5 s while in SP. Cheap (~140 byte string), serial to the
     * browser. No-op in MP — server-side persistence lands in M6. */
    maybe_autosave_sp((double)dt);
    periodic_pos_log((double)dt);

    /* M4 position relay: when MP is READY, ship our pose to the server
     * every 3rd frame (~20 Hz at 60 fps capped by the server tick).
     * Server broadcasts the union in SNAPSHOT so other clients see us. */
    {
        static uint32_t G_state_send_ctr = 0;
        if (menu_state() == GAME_IN_GAME_MP && net_client_state() == NET_CLIENT_READY
            && (++G_state_send_ctr % 3) == 0) {
            /* Real body anchor on the wire. G.player.body is non-NULL
             * whenever the player is gravitationally bound; the gravity
             * tracker at the top of frame() clears nothing on transition
             * to deep space, but we treat "no body inside any falloff
             * radius this frame" as in-space by querying planet_gravity_at
             * directly. The server persists whichever value we send, so
             * rejoin reaches maybe_apply_mp_spawn with the right anchor. */
            uint32_t body_id;
            {
                const lod_config_t* Lsend = config_lod();
                gravity_query_t gq_send = planet_gravity_at(G.player.position,
                                                              Lsend->gravity_full_mult,
                                                              Lsend->gravity_falloff_mult);
                if (gq_send.body) {
                    body_id = (uint32_t)gq_send.body->id;
                } else {
                    /* No body in falloff this frame. Player is in deep
                     * space - persist that fact so rejoin doesn't drop
                     * them next to a stale planet they're nowhere near. */
                    body_id = BODY_ID_IN_SPACE;
                }
            }
            net_client_send_player_state(G_state_send_ctr,
                                            body_id,
                                            G.player.position.x,
                                            G.player.position.y,
                                            G.player.position.z,
                                            G.player.yaw,
                                            G.player.pitch);
            /* Mirror what we just put on the wire so periodic_pos_log
             * can compare it against G.player.position later. */
            G_last_sent_pos.x   = G.player.position.x;
            G_last_sent_pos.y   = G.player.position.y;
            G_last_sent_pos.z   = G.player.position.z;
            G_last_sent_body    = body_id;
            G_last_sent_yaw     = G.player.yaw;
            G_last_sent_pitch   = G.player.pitch;
            G_last_sent_valid   = true;
        }
    }
    /* MP inventory persistence.
     *
     * 1) Server pushes the saved hotbar right after WELCOME via
     *    MSG_INVENTORY_STATE. Apply it once when it arrives so the
     *    player picks up the stacks they had at logout. The flag
     *    self-clears on read so an idle session doesn't keep
     *    overwriting in-progress mining.
     * 2) Whenever the local hotbar changes (place / mine / select),
     *    snapshot it and ship to the server so the next save flush
     *    has the latest state. Detection is a cheap memcmp against
     *    the last shipped snapshot - no listening into inventory.c. */
    if (menu_state() == GAME_IN_GAME_MP && net_client_state() == NET_CLIENT_READY) {
        uint16_t pend_type[9];
        int16_t  pend_count[9];
        int      pend_sel = 0;
        if (net_client_take_pending_inventory(pend_type, pend_count, &pend_sel)) {
            for (int i = 0; i < INV_HOTBAR_SLOTS && i < 9; ++i) {
                G.player.inventory.slots[i].type  = (block_t)pend_type[i];
                G.player.inventory.slots[i].count = pend_count[i];
            }
            if (pend_sel >= 0 && pend_sel < INV_HOTBAR_SLOTS) {
                G.player.inventory.selected = pend_sel;
            }
            /* Slot 0 (key "1") is the reserved torch slot - re-stamp
             * it after any restore so a stale save can never leave
             * the player without a light source. */
            inventory_ensure_reserved_torch(&G.player.inventory);
        }
        static uint16_t G_inv_last_type [9];
        static int16_t  G_inv_last_count[9];
        static int      G_inv_last_sel = -1;
        static bool     G_inv_init     = false;
        uint16_t cur_type [9];
        int16_t  cur_count[9];
        for (int i = 0; i < 9; ++i) {
            cur_type [i] = (i < INV_HOTBAR_SLOTS)
                ? (uint16_t)G.player.inventory.slots[i].type  : 0;
            int c = (i < INV_HOTBAR_SLOTS) ? G.player.inventory.slots[i].count : 0;
            /* Clamp the creative-mode "essentially infinite" count
             * (> 9000 per inventory.c) to INT16_MAX so the wire
             * round-trips cleanly. The server preserves whatever we
             * send and the next inventory_init_creative on rejoin
             * restocks naturally. */
            if (c > INT16_MAX) c = INT16_MAX;
            if (c < 0)         c = 0;
            cur_count[i] = (int16_t)c;
        }
        const int cur_sel = G.player.inventory.selected;
        bool changed = !G_inv_init
                     || cur_sel != G_inv_last_sel
                     || memcmp(cur_type,  G_inv_last_type,  sizeof cur_type)  != 0
                     || memcmp(cur_count, G_inv_last_count, sizeof cur_count) != 0;
        if (changed) {
            net_client_send_inventory_state(cur_type, cur_count, cur_sel);
            memcpy(G_inv_last_type,  cur_type,  sizeof G_inv_last_type);
            memcpy(G_inv_last_count, cur_count, sizeof G_inv_last_count);
            G_inv_last_sel = cur_sel;
            G_inv_init     = true;
        }
    }
    profiler_begin("interact");
    /* interact_update keeps running while paused; the input zeroing
     * above already cleared left_held / right_held, so mining +
     * placement naturally stop without a separate gate. Letting the
     * call through means raycast cleanup / tile invalidation still
     * happens behind the panel. Also frozen during MP join until net
     * is READY - mining a block before the server-authoritative pose
     * arrives would target a chunk the player isn't actually standing
     * in. */
    if (!mp_loading) {
        interact_update(&G.interact, phys_world, &G.player, dt);
    }
    profiler_end("interact");
    input_consume();

    const float aspect = sapp_widthf() / sapp_heightf();
    mat4_t view = player_view(&G.player);
    /* zfar = 20 km — covers the sun (8 km) + far asteroids (~3 km)
     * with margin. Linear-z precision at 20 km with a 0.3 m near
     * plane is poor but adequate for now; the planned log-z change
     * in plan.md fixes that. */
    const float zfar = 20000.0f;
    mat4_t proj = mat4_perspective(60.0f * (3.14159265f / 180.0f), aspect, 0.3f, zfar);

    /* Sun lives along the canonical sky-light direction at a far
     * fixed position. Our solar system fits inside ~1500 m of the
     * origin, so 8000 m out keeps per-planet parallax of the sun
     * direction down to a few degrees — close enough that lighting
     * still matches the skybox disc. */
    const float SUN_DIST   = 8000.0f;
    const float SUN_RADIUS = 240.0f;
    vec3_t sun_dir = vec3_normalize((vec3_t){ 0.5f, 0.9f, 0.3f });
    vec3_t sun_pos = (vec3_t){
        sun_dir.x * SUN_DIST, sun_dir.y * SUN_DIST, sun_dir.z * SUN_DIST,
    };
    /* Atmosphere is anchored to whatever body the player is currently
     * standing on (player_teleport_to updates p->body, so the sky
     * follows the player when they jump between planets). Per-body
     * tuning lives in body_config_t.atmo_*; any zeroed field falls
     * back to a sensible default so a planet just has to set
     * .has_water=true to get the default look.
     *
     * Defaults below were tuned for Tenebris's "more blue, less
     * yellow/orange" target — atmosphere shell is 1.3× the planet
     * radius (down from 2× — visibly thinner without losing the
     * analytical scattering signal) and sunset_strength is 0.3 so
     * the warm horizon tint is present but subtle. */
    const body_config_t* active_body = G.player.body ? G.player.body : G.body;
    const bool has_atmo = active_body->has_water;
    const float planet_r = (float)active_body->radius_m;
    const float radius_mult     = active_body->atmo_radius_mult     > 0.0f
                                ? active_body->atmo_radius_mult     : 1.3f;
    const float lower_mult      = active_body->atmo_lower_radius_mult > 0.0f
                                ? active_body->atmo_lower_radius_mult : 1.0f;
    const float rayleigh        = active_body->atmo_rayleigh_scale  > 0.0f
                                ? active_body->atmo_rayleigh_scale  : 1.0f;
    const float mie             = active_body->atmo_mie_scale       > 0.0f
                                ? active_body->atmo_mie_scale       : 0.05f;
    const float sun_int         = active_body->atmo_sun_intensity   > 0.0f
                                ? active_body->atmo_sun_intensity   : 30.0f;
    const float sunset          = active_body->atmo_sunset_strength > 0.0f
                                ? active_body->atmo_sunset_strength : 0.3f;
    const float scale_h         = active_body->atmo_scale_height    > 0.0f
                                ? active_body->atmo_scale_height    : 0.25f;
    const float mie_g           = active_body->atmo_mie_g           > 0.0f
                                ? active_body->atmo_mie_g           : 0.76f;
    /* vec3 zero-test: x+y+z > 0 means at least one channel was set
     * by the body config. Otherwise fall back to the Earth-tuned
     * defaults (matched to the original Caelum constants). */
    const bool has_wavelengths      = (active_body->atmo_wavelengths.x +
                                       active_body->atmo_wavelengths.y +
                                       active_body->atmo_wavelengths.z) > 0.0f;
    const vec3_t wavelengths        = has_wavelengths
                                    ? active_body->atmo_wavelengths
                                    : (vec3_t){ 5.602f, 9.473f, 19.644f };
    const bool has_sunset_tint      = (active_body->atmo_sunset_tint.x +
                                       active_body->atmo_sunset_tint.y +
                                       active_body->atmo_sunset_tint.z) > 0.0f;
    const vec3_t sunset_tint        = has_sunset_tint
                                    ? active_body->atmo_sunset_tint
                                    : (vec3_t){ 1.30f, 1.00f, 0.60f };
    const bool has_sunset_glow      = (active_body->atmo_sunset_glow.x +
                                       active_body->atmo_sunset_glow.y +
                                       active_body->atmo_sunset_glow.z) > 0.0f;
    const vec3_t sunset_glow        = has_sunset_glow
                                    ? active_body->atmo_sunset_glow
                                    : (vec3_t){ 1.00f, 0.65f, 0.25f };
    const bool has_sunset_horizon   = (active_body->atmo_sunset_horizon.x +
                                       active_body->atmo_sunset_horizon.y +
                                       active_body->atmo_sunset_horizon.z) > 0.0f;
    const vec3_t sunset_horizon     = has_sunset_horizon
                                    ? active_body->atmo_sunset_horizon
                                    : (vec3_t){ 0.80f, 0.40f, 0.15f };
    /* atmo_lower is what the shader receives as Rg (atmosphere
     * lower bound + planet-clip sphere). Default 1.0× planet_r =
     * Caelum-style shader uses a single pRadius for both planet-
     * clip and density lower bound. lower_mult < 1.0 sinks the
     * imaginary clip sphere BELOW the actual ground, which lets the
     * atmosphere ray-march continue past the visible horizon and
     * softens the harsh dark band that otherwise appears just below
     * the limb. Real terrain still occludes via depth test, so this
     * only matters in the area beyond the visible terrain horizon. */
    const float clip_radius = planet_r * lower_mult;
    const float atmo_r      = planet_r * radius_mult;
    render_env_t env = {
        .sun_dir    = sun_dir,
        .sun_pos    = sun_pos,
        .sun_radius = SUN_RADIUS,
        .sky_top    = { 0.02f, 0.04f, 0.10f },
        .sky_bottom = { 0.05f, 0.08f, 0.15f },
        .ambient    = { 0.35f, 0.35f, 0.40f },
        .atmo_planet_center = {
            (float)active_body->pos_x,
            (float)active_body->pos_y,
            (float)active_body->pos_z,
        },
        .atmo_planet_radius   = clip_radius, /* Rp — atmosphere lower / planet-clip */
        .atmo_radius          = atmo_r,      /* Ra — outer shell                    */
        .atmo_strength        = has_atmo ? 1.0f : 0.0f,
        .atmo_rayleigh_scale  = rayleigh,
        .atmo_mie_scale       = mie,
        .atmo_sun_intensity   = sun_int,
        .atmo_sunset_strength = sunset,
        .atmo_wavelengths     = wavelengths,
        .atmo_mie_g           = mie_g,
        .atmo_scale_height    = scale_h,
        .atmo_sunset_tint     = sunset_tint,
        .atmo_sunset_glow     = sunset_glow,
        .atmo_sunset_horizon  = sunset_horizon,
    };
    /* Camera world pos for the water-shader fresnel. Uses the player's
     * parallel-transported basis so it stays continuous when the old
     * phys_tangent_basis reference axis would flip. */
    dvec3_t cam_world_d = dvec3_add(G.player.position,
                                    dvec3_scale(G.player.basis.up, 1.6));
    vec3_t cam_world = dvec3_to_vec3(cam_world_d);
    env.camera_world = cam_world;

    renderer_begin_frame(sapp_width(), sapp_height(), env);
    /* Opaque scene → offscreen colour + depth attachments. */
    profiler_begin("draw-skybox");
    renderer_draw_skybox(view, proj);
    profiler_end("draw-skybox");
    profiler_begin("draw-sun");
    renderer_draw_sun(view, proj);
    profiler_end("draw-sun");
    profiler_begin("draw-world");
    renderer_draw_world(view, proj, G.world, cam_world, dt);
    profiler_end("draw-world");
    profiler_begin("draw-moons");
    renderer_draw_moons(view, proj, cam_world);
    profiler_end("draw-moons");
    profiler_begin("draw-torches");
    renderer_draw_torches(view, proj);
    profiler_end("draw-torches");

    /* Remote-player markers — drawn into the same offscreen pass so
     * they get the depth-sorted composite + water refraction for free. */
    remote_players_draw(view, proj);

    /* Target highlight: outline only the SINGLE FACE of the targeted
     * block that the reticle is aimed at (the face shared with the
     * placement candidate cell). Drawn into the world pass so
     * depth-test naturally hides the outline through other geometry. */
    if (G.interact.has_target && !G.interact.is_torch_target
        && !menu_pause_active()) {
        renderer_draw_face_outline(view, proj, G.world,
                                     G.interact.hit_tile,
                                     G.interact.hit_depth,
                                     G.interact.place_tile,
                                     G.interact.place_depth,
                                     1.00f, 1.00f, 1.00f, 0.95f);
    }

    /* Hand off to the swapchain pass — blits the offscreen colour
     * (everything opaque) onto the swapchain. */
    profiler_begin("compose");
    renderer_compose_to_swapchain(view, proj);
    profiler_end("compose");

    /* Water now draws in the swapchain pass on TOP of the composited
     * scene. The water shader samples the offscreen colour + depth
     * textures (the underwater scene we just composited) for
     * screen-space refraction and manual depth-discard. */
    profiler_begin("draw-water");
    renderer_draw_water(view, proj, cam_world);
    profiler_end("draw-water");

    /* UI overlays go on the swapchain on top of the water. */
    profiler_begin("ui");
    update_overlay(dt);
    /* Always-on version + profile readout in the bottom-right corner,
     * outside the F2 debug gate. */
    draw_version_strip();
    /* Teleport overlay is creative-only. Survival players (which
     * includes everyone in MP) shouldn't see the fast-travel list at
     * all - it would break the mining loop. */
    if (G_debug_ui_visible) teleport_menu_draw();
    if (G_debug_ui_visible) {
        draw_error_overlay();
        profiler_draw();
    }
    /* F1 players panel is independent of the F2 debug master so the
     * server roster is reachable in normal play. The function
     * internally early-outs when G_players_panel_visible is false. */
    draw_players_panel(sapp_widthf(), sapp_heightf());
    draw_desync_popup(sapp_widthf(), sapp_heightf());
    chat_draw(sapp_widthf(), sapp_heightf());
    /* Nameplates above remote players. View/proj are still in scope
     * from the 3D pass earlier in frame(). The lookup goes through
     * the net_client name cache (populated by PLAYER_INFO + WELCOME). */
    remote_players_draw_nameplates(view, proj,
                                      sapp_widthf(), sapp_heightf(),
                                      net_client_name_for_id);
    /* No sdtx_draw here - a single flush at the end of the UI block
     * (after pause / mining / hotbar / mobile UI all queue their
     * text) avoids the multi-flush bug where later text reads
     * stale GPU memory because sokol_debugtext only uploads the
     * vertex buffer once per frame. */
    hotbar_ui_draw(&G.player.inventory);
    /* Real (non-ASCII) mining progress bar. Self-gates on
     * survival_mode + mining_progress > 0; per CLAUDE.md the old
     * "[####----] 50%" sdtx-printf bar was a no-go. */
    draw_mining_bar(sapp_widthf(), sapp_heightf());
    /* Sync the hamburger debug-menu visibility with the master F2
     * toggle every frame. mobile_ui owns its own draw state; we
     * just forward the boolean rather than threading it through
     * every call. Same shape for the standalone teleport button -
     * survival hides it because teleport is creative-only. */
    mobile_ui_set_debug_menu_visible(G_debug_ui_visible);
    mobile_ui_set_teleport_visible(G_debug_ui_visible);
    mobile_ui_draw();

    /* Centre-screen reticle dot. Only in gameplay (skip on the menu /
     * profile picker so it doesn't sit over the buttons). mobile_ui_draw
     * just left the alpha pipeline + ortho projection bound for us; if
     * that order ever flips we'd need to set them again here. */
    {
        game_state_t st = menu_state();
        bool in_game = (st == GAME_IN_GAME_SP || st == GAME_IN_GAME_MP);
        if (in_game && !menu_pause_active()) {
            const float sw = sapp_widthf();
            const float sh = sapp_heightf();
            const float dot = 3.0f;
            mobile_ui_draw_rect(sw * 0.5f - dot, sh * 0.5f - dot,
                                  dot * 2.0f, dot * 2.0f,
                                  1.0f, 1.0f, 1.0f, 0.85f);
        }
    }
    /* DOM overlays are mobile-only scaffolding (pause button +
     * joystick deck). The pause panel itself is in-canvas, drawn
     * by menu_pause_draw below. Hide both DOM overlays while the
     * pause panel is up so taps don't pass behind it. */
#ifdef __EMSCRIPTEN__
    {
        game_state_t st = menu_state();
        bool in_game = (st == GAME_IN_GAME_SP || st == GAME_IN_GAME_MP);
        bool show_mobile_dom = in_game && !menu_pause_active();
        static int last_pause_btn = -1, last_mobile = -1;
        if ((int)show_mobile_dom != last_pause_btn) {
            tenebris_pause_button_set_visible(show_mobile_dom ? 1 : 0);
            last_pause_btn = (int)show_mobile_dom;
        }
        if ((int)show_mobile_dom != last_mobile) {
            tenebris_mobile_controls_set_visible(show_mobile_dom ? 1 : 0);
            last_mobile = (int)show_mobile_dom;
        }
    }
#endif
    /* Pause overlay draws last so the dim backdrop + panel sit on
     * top of every HUD element. No-op when not active. */
    menu_pause_draw(sapp_width(), sapp_height());

    /* Connecting overlay: drawn while the MP socket is doing its
     * INITIAL connect / handshake (i.e. the player has never been
     * READY in this session). Once they've been ready, a drop
     * triggers menu_tick to auto-open the pause panel which carries
     * its own reconnect UI - showing both would double up. */
    if (menu_state() == GAME_IN_GAME_MP
        && net_client_state() != NET_CLIENT_READY
        && !menu_pause_active()) {
        net_client_state_t ns = net_client_state();
        const char* status =
            ns == NET_CLIENT_CONNECTING ? "OPENING SOCKET"  :
            ns == NET_CLIENT_HANDSHAKE  ? "WAITING FOR SERVER" :
                                          "RECONNECTING";
        const char* room = menu_room_code();
        char room_buf[64];
        room_buf[0] = 0;
        if (room && room[0]) {
            snprintf(room_buf, sizeof room_buf, "ROOM %s", room);
        }
        menu_connecting_draw(sapp_width(), sapp_height(), status, room_buf);
    }

    /* ONE sgl_draw per frame, at the very end after every UI module
     * has queued its geometry. sokol_gl uploads its vertex buffer to
     * the GPU only on the first sgl_draw of the frame and never
     * re-uploads; any sgl_draw called mid-frame would freeze the
     * GPU's vertex view at that point, and every later module's
     * quads (panel backdrops, hotbar slots, joysticks) would
     * reference un-uploaded memory and render as nothing. This
     * single flush replays every recorded command - 3D players
     * queued in the offscreen pass land here as well, depth-tested
     * against the swapchain depth that compose_to_swapchain wrote. */
    sgl_draw();

    /* ONE sdtx_draw per frame, at the very end after every HUD
     * module has queued its text. Earlier flushes were the root
     * cause of stale-GPU-text bleeding between frames - see
     * hotbar_ui_draw and draw_mining_bar comments. */
    sdtx_draw();
    profiler_end("ui");

    profiler_end_frame();
    renderer_end_frame();
}

/* --------------------------------------------------------------------- */

static void event(const sapp_event* e) {
    /* The main menu owns input while it's up — every event is either
     * a button click or noise to be swallowed. */
    if (menu_is_overlay()) {
        menu_event(e);
        return;
    }
    /* In-game pause overlay. When active, swallow every event so
     * player movement / chat / interact don't fire behind the panel.
     * Escape during gameplay toggles the pause on/off; pause's own
     * event handler swallows Escape while it's open. */
    if (menu_pause_active()) {
        if (menu_pause_event(e)) return;
    }
    /* Escape: do nothing directly here. The browser intercepts Escape
     * to release pointer lock; the per-frame pointer-lock-loss
     * detector earlier in frame() catches the resulting state
     * transition and opens the pause panel on the same gesture.
     * Resume is intentionally NOT bound to Escape - the player has
     * to click RETURN TO GAME so a stray Esc keypress can't dismiss
     * the panel by accident. */
    if (e->type == SAPP_EVENTTYPE_KEY_DOWN
        && e->key_code == SAPP_KEYCODE_ESCAPE) {
        return;
    }
    /* Chat takes Enter (open compose) and every keystroke while
     * composing. Returns true when it owned the event so movement /
     * teleport keys don't double-fire while the player is typing. */
    if (chat_event(e)) return;
    /* Teleport menu gets first crack - it intercepts T/M/arrows/enter
     * when open so those keys don't also reach the movement layer.
     * Gated on the F2 debug UI master so a casual player can't
     * accidentally summon the fast-travel list. */
    if (G_debug_ui_visible) {
        if (teleport_menu_event(e, &G.player)) return;
    }
    /* F2 toggles the master debug-UI visibility. Every other debug
     * key (F1, F3, P, H, J, K) and the mobile hamburger menu are
     * gated on G_debug_ui_visible so first-time players never see
     * the scaffolding. F2 itself stays live always so they can
     * still get back in. */
    if (e->type == SAPP_EVENTTYPE_KEY_DOWN && e->key_code == SAPP_KEYCODE_F2) {
        G_debug_ui_visible = !G_debug_ui_visible;
        return;
    }
    /* The remaining debug shortcuts are no-ops while the debug UI is
     * hidden. The mobile hamburger menu draws / hit-tests only when
     * debug is visible (gated below), so its toggles can't sneak
     * around this either. */
    /* F1 stays available regardless of the F2 debug master - the
     * server roster is a gameplay-facing panel (who's online, where
     * are they) rather than dev scaffolding, and the user wants it
     * one keypress away. */
    if (e->type == SAPP_EVENTTYPE_KEY_DOWN && e->key_code == SAPP_KEYCODE_F1) {
        G_players_panel_visible = !G_players_panel_visible;
        return;
    }
    if (G_debug_ui_visible) {
        if (e->type == SAPP_EVENTTYPE_KEY_DOWN && e->key_code == SAPP_KEYCODE_H) {
            renderer_set_terrain_visible(!renderer_terrain_visible());
            return;
        }
        if (e->type == SAPP_EVENTTYPE_KEY_DOWN && e->key_code == SAPP_KEYCODE_J) {
            renderer_set_water_visible(!renderer_water_visible());
            return;
        }
        if (e->type == SAPP_EVENTTYPE_KEY_DOWN && e->key_code == SAPP_KEYCODE_K) {
            renderer_set_skybox_visible(!renderer_skybox_visible());
            return;
        }
        if (e->type == SAPP_EVENTTYPE_KEY_DOWN &&
            (e->key_code == SAPP_KEYCODE_F3 || e->key_code == SAPP_KEYCODE_P)) {
            profiler_toggle_visible();
            return;
        }
    }

    /* (Mobile pause button is an HTML overlay now - its click
     * handler calls tenebris_js_pause_pressed directly via
     * Module.ccall, so we don't hit-test it on the canvas event
     * stream.) */

    /* Mobile hamburger hit-test. Only active while the debug UI is
     * shown - the dedicated teleport (T) button next to the hamburger
     * still works because it lives in its own draw path. */
    if (G_debug_ui_visible) {
        if (e->type == SAPP_EVENTTYPE_TOUCHES_BEGAN && e->num_touches > 0) {
            if (mobile_ui_handle_touch(e->touches[0].pos_x, e->touches[0].pos_y)) {
                return;
            }
        }
        if (e->type == SAPP_EVENTTYPE_MOUSE_DOWN
            && e->mouse_button == SAPP_MOUSEBUTTON_LEFT) {
            if (mobile_ui_handle_touch(e->mouse_x, e->mouse_y)) {
                return;
            }
        }
    }
    input_event(e);
}

static void cleanup(void) {
    net_client_disconnect();
    chat_shutdown();
    remote_players_shutdown();
    menu_shutdown();
    teleport_menu_shutdown();
    hotbar_ui_shutdown();
    mobile_ui_shutdown();
    torch_shutdown();
    renderer_shutdown();
    for (int i = 0; i < G.moon_count; ++i) world_destroy(G.moons[i]);
    G.moon_count = 0;
    world_destroy(G.world);  G.world = NULL;
    job_system_shutdown();
    sdtx_shutdown();
    sg_shutdown();
}

sapp_desc sokol_main(int argc, char* argv[]) {
    (void)argc; (void)argv;
    return (sapp_desc){
        .init_cb      = init,
        .frame_cb     = frame,
        .event_cb     = event,
        .cleanup_cb   = cleanup,
        .width        = 1280,
        .height       = 720,
        .window_title = "Tenebris (WASM Preview)",
        .icon.sokol_default = true,
        .logger.func  = slog_func,
        .html5.canvas_selector = "#canvas",
    };
}
