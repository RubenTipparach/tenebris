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
    sgl_draw();

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
    sdtx_draw();
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

static void maybe_apply_sp_resume(void) {
    if (G_sp_resume_applied) return;
    if (menu_state() != GAME_IN_GAME_SP) return;
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
    const float w        = 360.0f;
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

    sgl_draw();

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
        snprintf(buf, sizeof buf,
                 "* id=%-3u  %s  lat=%+7.2f  lon=%+7.2f  alt=%5.0fm",
                 wcm->player_id, body->name, lat, lon, alt);
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
        snprintf(buf, sizeof buf,
                 "  id=%-3u  %s  lat=%+7.2f  lon=%+7.2f  alt=%5.0fm",
                 rp->player_id, body->name, lat, lon, alt);
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

    sgl_draw();

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

    /* Heartbeat trace - one line per frame summarising the routing
     * decision the rest of frame() is about to make. Throttled so
     * it doesn't drown the console; only logs when something
     * relevant changed (state / pause / pointer-lock). */
    {
        static game_state_t prev_state = (game_state_t)-1;
        static bool         prev_pause = false;
        static bool         prev_lock  = false;
        game_state_t cur_state = menu_state();
        bool cur_pause = menu_pause_active();
        bool cur_lock  = sapp_mouse_locked();
        if (cur_state != prev_state || cur_pause != prev_pause
            || cur_lock != prev_lock) {
            printf("[frame] state-change: state -> %d, pause=%d, locked=%d, overlay=%d\n",
                   (int)cur_state, (int)cur_pause, (int)cur_lock,
                   (int)menu_is_overlay());
            prev_state = cur_state;
            prev_pause = cur_pause;
            prev_lock  = cur_lock;
        }
    }

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
    maybe_prime_mode_for_state();

    /* Pointer-lock-loss -> open pause menu. The browser eats the
     * first Escape press to release pointer lock (we never see the
     * KEY_DOWN event), so detecting the lock-state transition is
     * how we land the pause panel on a single press. Only fires
     * during gameplay - the menu / pause states don't lock the
     * mouse to begin with. */
    {
        static bool s_was_mouse_locked = false;
        bool now_locked = sapp_mouse_locked();
        game_state_t st = menu_state();
        bool in_gameplay = (st == GAME_IN_GAME_SP || st == GAME_IN_GAME_MP);
        if (in_gameplay && s_was_mouse_locked && !now_locked
            && !menu_pause_active()) {
            printf("[frame] pointer-lock-loss detected -> open pause "
                   "(state=%d locked %d->%d pause_was=%d)\n",
                   (int)st, (int)s_was_mouse_locked, (int)now_locked,
                   (int)menu_pause_active());
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
    if (!G.player.survival_mode) teleport_menu_poll_touches();

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
    player_update(&G.player, phys_world, dt);
    profiler_end("player-update");
    /* Throttled SP autosave: writes the player's pose to localStorage
     * every 5 s while in SP. Cheap (~140 byte string), serial to the
     * browser. No-op in MP — server-side persistence lands in M6. */
    maybe_autosave_sp((double)dt);

    /* M4 position relay: when MP is READY, ship our pose to the server
     * every 3rd frame (~20 Hz at 60 fps capped by the server tick).
     * Server broadcasts the union in SNAPSHOT so other clients see us. */
    {
        static uint32_t G_state_send_ctr = 0;
        if (menu_state() == GAME_IN_GAME_MP && net_client_state() == NET_CLIENT_READY
            && (++G_state_send_ctr % 3) == 0) {
            uint32_t body_id = 0;     /* TODO: thread the active body id once SOI is wired */
            net_client_send_player_state(G_state_send_ctr,
                                            body_id,
                                            G.player.position.x,
                                            G.player.position.y,
                                            G.player.position.z,
                                            G.player.yaw,
                                            G.player.pitch);
        }
    }
    profiler_begin("interact");
    interact_update(&G.interact, phys_world, &G.player, dt);
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
    /* Teleport overlay is creative-only. Survival players (which
     * includes everyone in MP) shouldn't see the fast-travel list at
     * all - it would break the mining loop. */
    if (!G.player.survival_mode) teleport_menu_draw();
    if (G_debug_ui_visible) {
        draw_error_overlay();
        profiler_draw();
        draw_players_panel(sapp_widthf(), sapp_heightf());
    }
    draw_desync_popup(sapp_widthf(), sapp_heightf());
    chat_draw(sapp_widthf(), sapp_heightf());
    /* Nameplates above remote players. View/proj are still in scope
     * from the 3D pass earlier in frame(). The lookup goes through
     * the net_client name cache (populated by PLAYER_INFO + WELCOME). */
    remote_players_draw_nameplates(view, proj,
                                      sapp_widthf(), sapp_heightf(),
                                      net_client_name_for_id);
    sdtx_draw();
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
    mobile_ui_set_teleport_visible(!G.player.survival_mode);
    mobile_ui_draw();
    /* Pause overlay draws last so the dim backdrop + panel sit on
     * top of every HUD element. No-op when not active. */
    menu_pause_draw(sapp_width(), sapp_height());
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
    if (e->type == SAPP_EVENTTYPE_KEY_DOWN
        && e->key_code == SAPP_KEYCODE_ESCAPE) {
        printf("[event] Escape KEY_DOWN seen by event handler "
               "(locked=%d pause_was=%d state=%d)\n",
               (int)sapp_mouse_locked(), (int)menu_pause_active(),
               (int)menu_state());
        menu_pause_toggle();
        if (menu_pause_active()) {
            /* Show the OS cursor + release pointer lock so the player
             * can click the pause buttons. Pointer lock will need to
             * be re-engaged via a click after resume, which is how
             * the browser requires it anyway. */
            sapp_lock_mouse(false);
            sapp_show_mouse(true);
        }
        return;
    }
    /* Chat takes Enter (open compose) and every keystroke while
     * composing. Returns true when it owned the event so movement /
     * teleport keys don't double-fire while the player is typing. */
    if (chat_event(e)) return;
    /* Teleport menu gets first crack - it intercepts T/M/arrows/enter
     * when open so those keys don't also reach the movement layer.
     * Disabled in survival because the whole feature is hidden in
     * that mode. */
    if (!G.player.survival_mode) {
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
        if (e->type == SAPP_EVENTTYPE_KEY_DOWN && e->key_code == SAPP_KEYCODE_F1) {
            G_players_panel_visible = !G_players_panel_visible;
            return;
        }
        if (e->type == SAPP_EVENTTYPE_KEY_DOWN &&
            (e->key_code == SAPP_KEYCODE_F3 || e->key_code == SAPP_KEYCODE_P)) {
            profiler_toggle_visible();
            return;
        }
    }

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
