/*
 * Tenebris - Tier 1 (hex-sphere) entry point.
 *
 * Sub-milestone 2: LOD icosphere + 5x5 hex chunk bubble rendering
 * with per-block colored quads and sun/ambient lighting.
 */

#include "sokol_gfx.h"
#include "sokol_app.h"
#include "sokol_glue.h"
#include "sokol_log.h"
#include "sokol_time.h"
#include "sokol_debugtext.h"

#include "core/icosphere.h"
#include "core/planet.h"
#include "core/job_system.h"
#include "core/hex_pool.h"
#include "client/gfx_math.h"
#include "client/input.h"
#include "client/player_ctrl.h"
#include "client/renderer.h"

#include <math.h>
#include <stdint.h>
#include <stdlib.h>

#define BUBBLE_RADIUS_M 500.0

static struct {
    const body_config_t* body;
    lod_tree_t*   lod;
    hex_pool_t    hex_pool;
    player_ctrl_t player;
    dvec3_t       floating_origin;
    uint64_t      last_time;
    uint32_t      tick;
    float         smoothed_fps;
} G;

/* --------------------------------------------------------------------- */

static void init(void) {
    sg_setup(&(sg_desc){
        .environment = sglue_environment(),
        .logger.func = slog_func,
    });
    stm_setup();
    sdtx_setup(&(sdtx_desc_t){
        .fonts[0] = sdtx_font_oric(),
        .logger.func = slog_func,
    });

    input_init();
    job_system_init(LOD_NUM_WORKERS);
    renderer_init();

    G.body = planet_get(BODY_TENEBRIS);
    G.lod  = lod_tree_create(G.body);
    hex_pool_init(&G.hex_pool, G.body);
    player_init(&G.player, G.body);

    dvec3_t start = player_world_pos(&G.player);
    G.floating_origin = start;
    G.last_time = stm_now();
    G.smoothed_fps = 60.0f;

    /* Prime the hex pool so there's terrain under the player on frame 1.
     * The first fill budget flush covers all 81 chunks synchronously
     * here - one-time cost at startup, not a per-frame hitch. */
    hex_pool_update(&G.hex_pool, start);
    for (int i = 0; i < HEX_POOL_COUNT; ++i) hex_pool_update(&G.hex_pool, start);
}

/* --------------------------------------------------------------------- */

static void update_overlay(float dt) {
    const float inst_fps = (dt > 0.0f) ? (1.0f / dt) : 0.0f;
    G.smoothed_fps = G.smoothed_fps * 0.9f + inst_fps * 0.1f;

    sdtx_canvas(sapp_widthf() * 0.5f, sapp_heightf() * 0.5f);
    sdtx_origin(1.0f, 1.0f);
    sdtx_color3b(0xff, 0xff, 0xff);
    sdtx_printf("Tenebris WASM Preview (Tier 1: hex-sphere, sub-milestone 2)\n");
    sdtx_printf("FPS: %.1f\n", G.smoothed_fps);

    dvec3_t pos = player_world_pos(&G.player);
    double r = sqrt(pos.x*pos.x + pos.y*pos.y + pos.z*pos.z);
    double alt = r - G.body->radius_m;
    sdtx_printf("planet: %s  radius: %.1f km\n", G.body->name, G.body->radius_m * 1e-3);
    sdtx_printf("alt: %.1f m  yaw: %.2f  pitch: %.2f\n", alt, G.player.yaw, G.player.pitch);
    sdtx_printf("grounded: %s  fly: %s\n",
                G.player.grounded ? "yes" : "no",
                G.player.fly_mode ? "on" : "off");
    sdtx_printf("LOD nodes visible: %d\n", lod_tree_visible_count(G.lod));
    const int pending = hex_pool_pending_count(&G.hex_pool);
    sdtx_printf("hex chunks: %d active  %d loading  %zu remeshed/frame\n",
                hex_pool_active_count(&G.hex_pool),
                pending,
                renderer_hex_remeshes_this_frame());
    if (pending > 0) {
        sdtx_color3b(0xf0, 0xc0, 0x50);
        sdtx_printf("loading terrain...\n");
        sdtx_color3b(0xff, 0xff, 0xff);
    }
    sdtx_printf("tris: LOD=%zu  hex=%zu  total=%zu\n",
                renderer_triangles_drawn_this_frame() - renderer_hex_triangles_drawn_this_frame(),
                renderer_hex_triangles_drawn_this_frame(),
                renderer_triangles_drawn_this_frame());

    if (!input_state()->pointer_locked) {
        sdtx_color3b(0xf0, 0xc0, 0x50);
        sdtx_printf("\n[click to lock mouse]\n");
        sdtx_color3b(0xff, 0xff, 0xff);
    }
    sdtx_printf("\nWASD walks  SPACE jumps  SHIFT sprints  F fly  mouse looks\n");
}

/* --------------------------------------------------------------------- */

static void frame(void) {
    const double dt_sec = stm_sec(stm_laptime(&G.last_time));
    float dt = (float)dt_sec;
    if (dt > 0.1f) dt = 0.1f;
    G.tick++;

    player_update(&G.player, &G.hex_pool, dt);

    /* Recenter floating origin if the player drifts > 1 km from it. */
    dvec3_t player_pos = player_world_pos(&G.player);
    if (dvec3_length(dvec3_sub(player_pos, G.floating_origin)) > 1000.0) {
        G.floating_origin = player_pos;
    }

    /* Update hex chunk bubble (may re-anchor + regen chunks). */
    hex_pool_update(&G.hex_pool, player_pos);

    /* LOD: tell it where the bubble is so it skips subdividing inside,
     * then run the split/merge pass. The bubble exclusion happens both
     * at the split gate (no deeper CPU work inside bubble) and at the
     * visibility collection (hide any leaves whose center is inside). */
    lod_tree_set_bubble(G.lod, G.hex_pool.anchor_world, BUBBLE_RADIUS_M);
    lod_tree_update(G.lod, player_pos);

    input_consume();

    /* Camera. */
    const float aspect = sapp_widthf() / sapp_heightf();
    mat4_t view = player_view(&G.player, G.floating_origin);
    const float zfar = (float)(G.body->radius_m * 4.0);
    mat4_t proj = mat4_perspective(60.0f * (3.14159265f / 180.0f), aspect, 0.5f, zfar);

    render_env_t env = {
        .sun_dir    = { 0.5f, 0.9f, 0.3f },
        .sky_top    = { 0.02f, 0.04f, 0.10f },
        .sky_bottom = { 0.05f, 0.08f, 0.15f },
        .ambient    = { 0.30f, 0.30f, 0.35f },
    };
    renderer_begin_frame(sapp_width(), sapp_height(), env);
    renderer_draw_lod_tree(view, proj, G.lod, G.floating_origin, G.body->radius_m);
    renderer_draw_hex_pool(view, proj, &G.hex_pool, G.floating_origin);

    update_overlay(dt);
    sdtx_draw();

    renderer_end_frame();
}

/* --------------------------------------------------------------------- */

static void event(const sapp_event* e) {
    input_event(e);
    if (e->type == SAPP_EVENTTYPE_KEY_DOWN && e->key_code == SAPP_KEYCODE_ESCAPE) {
        sapp_lock_mouse(false);
    }
}

static void cleanup(void) {
    renderer_shutdown();
    hex_pool_shutdown(&G.hex_pool);
    lod_tree_destroy(G.lod);  G.lod = NULL;
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
