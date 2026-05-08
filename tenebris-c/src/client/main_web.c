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
#include "client/teleport_menu.h"
#include "client/inventory.h"
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
    sdtx_setup(&(sdtx_desc_t){
        .fonts[0] = sdtx_font_oric(),
        .logger.func = on_screen_log,
    });

    input_init();
    job_system_init(0);
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

static void update_overlay(float dt) {
    const float inst_fps = (dt > 0.0f) ? (1.0f / dt) : 0.0f;
    G.smoothed_fps = G.smoothed_fps * 0.9f + inst_fps * 0.1f;

    sdtx_canvas(sapp_widthf() * 0.5f, sapp_heightf() * 0.5f);
    sdtx_origin(1.0f, 1.0f);
    sdtx_color3b(0xff, 0xff, 0xff);
    sdtx_printf("Tenebris WASM Preview (Goldberg %d tiles, %d moons)\n",
                goldberg_tile_count(G.world->grid),
                renderer_moon_count());
    sdtx_printf("FPS: %.1f\n", G.smoothed_fps);

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

    /* Mining progress bar (survival only). */
    if (G.player.survival_mode && G.interact.mining_progress_s > 0.0f) {
        float pct = G.interact.mining_progress_s / MINING_TIME_S;
        if (pct > 1.0f) pct = 1.0f;
        char bar[21];
        int filled = (int)(pct * 20.0f);
        for (int i = 0; i < 20; ++i) bar[i] = (i < filled) ? '#' : '-';
        bar[20] = 0;
        sdtx_color3b(0xf0, 0xa0, 0x40);
        sdtx_printf("mining: [%s] %d%%\n", bar, (int)(pct * 100));
        sdtx_color3b(0xff, 0xff, 0xff);
    }


    if (!input_state()->pointer_locked && !input_state()->touch_active) {
        sdtx_color3b(0xf0, 0xc0, 0x50);
        sdtx_printf("\n[click to lock mouse]\n");
        sdtx_color3b(0xff, 0xff, 0xff);
    }
}

/* --------------------------------------------------------------------- */

static void frame(void) {
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

    /* Stream a few tiles of terrain per frame. */
    if (!world_gen_complete(G.world)) {
        world_stream_gen(G.world, GEN_TILES_PER_FRAME);
    }

    /* Poll touch-button edge events before consuming input — the
     * teleport menu's mobile nav buttons live in input.c and this is
     * the only place to drive them. Also swallows any body-selection
     * click before movement/interact reads the input state. */
    teleport_menu_poll_touches();

    /* G-key toggles survival mode. Switching modes resets inventory
     * to the appropriate starter state so creative-bonanza items
     * don't persist into a fresh survival run, and so a survival
     * stockpile doesn't leak back into a creative session. */
    if (input_consume_survival_toggle()) {
        G.player.survival_mode = !G.player.survival_mode;
        if (G.player.survival_mode) inventory_init_empty(&G.player.inventory);
        else                        inventory_init_creative(&G.player.inventory);
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
    player_update(&G.player, phys_world, dt);
    interact_update(&G.interact, phys_world, &G.player, dt);
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
    renderer_draw_skybox(view, proj);
    renderer_draw_sun(view, proj);
    renderer_draw_world(view, proj, G.world, cam_world, dt);
    renderer_draw_moons(view, proj, cam_world);
    renderer_draw_torches(view, proj);

    /* Hand off to the swapchain pass — blits the offscreen colour
     * (everything opaque) onto the swapchain. */
    renderer_compose_to_swapchain(view, proj);

    /* Water now draws in the swapchain pass on TOP of the composited
     * scene. The water shader samples the offscreen colour + depth
     * textures (the underwater scene we just composited) for
     * screen-space refraction and manual depth-discard. */
    renderer_draw_water(view, proj, cam_world);

    /* UI overlays go on the swapchain on top of the water. */
    update_overlay(dt);
    teleport_menu_draw();
    draw_error_overlay();
    sdtx_draw();
    hotbar_ui_draw(&G.player.inventory);
    mobile_ui_draw();

    renderer_end_frame();
}

/* --------------------------------------------------------------------- */

static void event(const sapp_event* e) {
    /* Teleport menu gets first crack — it intercepts T/M/arrows/enter
     * when open so those keys don't also reach the movement layer. */
    if (teleport_menu_event(e, &G.player)) return;
    /* Debug toggle — H on desktop, tap top-right ~96 px corner on
     * touch devices. Hides the chunked planet terrain so the
     * atmosphere / sky / distant LOD passes can be verified in
     * isolation. State lives in the renderer; we just flip it here. */
    /* Keyboard shortcuts for the debug toggles. Mirror the four
     * buttons in the hamburger drop-down (mobile_ui.c) so a desktop
     * user can flip them without reaching for the mouse. */
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
    /* Note: no F key for the heatmap — F is already bound to fly-mode
     * in input.c. The heatmap is reachable via the menu button only. */

    /* Debug-menu hit-test runs first on both touch + mouse so the
     * hamburger and its popup buttons consume the input before it
     * reaches the movement layer. */
    if (e->type == SAPP_EVENTTYPE_TOUCHES_BEGAN && e->num_touches > 0) {
        if (mobile_ui_handle_touch(e->touches[0].pos_x, e->touches[0].pos_y)) {
            return;
        }
    }
    if (e->type == SAPP_EVENTTYPE_MOUSE_DOWN && e->mouse_button == SAPP_MOUSEBUTTON_LEFT) {
        if (mobile_ui_handle_touch(e->mouse_x, e->mouse_y)) {
            return;
        }
    }
    input_event(e);
    if (e->type == SAPP_EVENTTYPE_KEY_DOWN && e->key_code == SAPP_KEYCODE_ESCAPE) {
        sapp_lock_mouse(false);
    }
}

static void cleanup(void) {
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
