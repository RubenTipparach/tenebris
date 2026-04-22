/*
 * Tenebris - Tier 1 (hex-sphere reset) entry point.
 *
 * Tier 1 sub-milestone 1: render the icosphere LOD tree as colored
 * triangle patches, orbit camera around the planet. Hex chunks +
 * surface walking land in the next commits per conversion.md §4.
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
#include "client/gfx_math.h"
#include "client/input.h"
#include "client/player_ctrl.h"
#include "client/renderer.h"

#include <math.h>
#include <stdint.h>

static struct {
    const body_config_t* body;
    lod_tree_t*    lod;
    player_ctrl_t  player;
    dvec3_t        floating_origin;
    uint64_t       last_time;
    uint32_t       tick;
    float          smoothed_fps;
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
    player_init(&G.player, G.body);

    G.floating_origin = player_world_pos(&G.player);
    G.last_time = stm_now();
    G.smoothed_fps = 60.0f;
}

/* --------------------------------------------------------------------- */

static void update_overlay(float dt) {
    const float inst_fps = (dt > 0.0f) ? (1.0f / dt) : 0.0f;
    G.smoothed_fps = G.smoothed_fps * 0.9f + inst_fps * 0.1f;

    sdtx_canvas(sapp_widthf() * 0.5f, sapp_heightf() * 0.5f);
    sdtx_origin(1.0f, 1.0f);
    sdtx_color3b(0xff, 0xff, 0xff);
    sdtx_printf("Tenebris WASM Preview (Tier 1: hex-sphere, sub-milestone 1)\n");
    sdtx_printf("FPS: %.1f\n", G.smoothed_fps);

    dvec3_t pos = player_world_pos(&G.player);
    double r = sqrt(pos.x*pos.x + pos.y*pos.y + pos.z*pos.z);
    double alt = r - G.body->radius_m;
    sdtx_printf("planet: %s  radius: %.1f km\n", G.body->name, G.body->radius_m * 1e-3);
    sdtx_printf("alt: %.1f km  lon: %.2f  lat: %.2f\n",
                alt * 1e-3, G.player.orbit_lon, G.player.orbit_lat);
    sdtx_printf("LOD nodes visible: %d\n", lod_tree_visible_count(G.lod));
    sdtx_printf("triangles: %zu\n", renderer_triangles_drawn_this_frame());

    if (!input_state()->pointer_locked) {
        sdtx_color3b(0xf0, 0xc0, 0x50);
        sdtx_printf("\n[click to lock mouse]\n");
        sdtx_color3b(0xff, 0xff, 0xff);
    }
    sdtx_printf("\nWASD orbits  SPACE/CTRL altitude  mouse looks\n");
}

/* --------------------------------------------------------------------- */

static void frame(void) {
    const double dt_sec = stm_sec(stm_laptime(&G.last_time));
    float dt = (float)dt_sec;
    if (dt > 0.1f) dt = 0.1f;
    G.tick++;

    player_update(&G.player, NULL, dt);

    /* Recenter the floating origin if the player drifts more than 1 km
     * from it. Cheap; keeps GPU vertex math under ~1 km in single
     * precision regardless of how far we orbit. */
    dvec3_t player_pos = player_world_pos(&G.player);
    dvec3_t delta = dvec3_sub(player_pos, G.floating_origin);
    if (dvec3_length(delta) > 1000.0) G.floating_origin = player_pos;

    /* LOD update — Tier 1 stub returns the 20 root faces, no split yet. */
    lod_tree_update(G.lod, player_pos);

    input_consume();

    /* Build view + proj */
    const float aspect = sapp_widthf() / sapp_heightf();
    mat4_t view = player_view(&G.player, G.floating_origin);
    /* Far plane scaled to body radius so the whole planet fits. */
    const float zfar = (float)(G.body->radius_m * 4.0);
    mat4_t proj = mat4_perspective(60.0f * (3.14159265f / 180.0f), aspect, 1.0f, zfar);

    render_env_t env = {
        .sun_dir    = { 0.5f, 0.9f, 0.3f },
        .sky_top    = { 0.02f, 0.04f, 0.10f },
        .sky_bottom = { 0.05f, 0.08f, 0.15f },
        .ambient    = { 0.25f, 0.25f, 0.30f },
    };
    renderer_begin_frame(sapp_width(), sapp_height(), env);
    renderer_draw_lod_tree(view, proj, G.lod, G.floating_origin, G.body->radius_m);

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
