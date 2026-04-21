/*
 * Tenebris - Tier 1 Creative Mode MVP entry point.
 *
 * Glue between:
 *   - sokol_app:   window + input events
 *   - input.c:     event -> InputState
 *   - player_ctrl: FPS controller + camera
 *   - core/world:  chunked voxel storage (shared with server)
 *   - core/physics AABB vs voxels (shared with server)
 *   - renderer.c:  sokol_gfx draw calls
 *   - interact.c:  break/place through world_cmd_t (same code path as MP)
 */

#define SOKOL_IMPL
#include "sokol_gfx.h"
#include "sokol_app.h"
#include "sokol_glue.h"
#include "sokol_log.h"
#include "sokol_time.h"
#include "sokol_debugtext.h"

#include "core/world.h"
#include "client/gfx_math.h"
#include "client/input.h"
#include "client/player_ctrl.h"
#include "client/renderer.h"
#include "client/interact.h"

#include <math.h>
#include <stdint.h>
#include <stdlib.h>

#define RENDER_RADIUS 4

static struct {
    world_t*         world;
    player_ctrl_t    player;
    interact_state_t interact;
    uint64_t         last_time;
    uint32_t         tick;
    float            smoothed_fps;
} G;

/* --------------------------------------------------------------------- */

static vec3_t find_spawn(world_t* w) {
    int32_t h = world_height_at(w, 0, 0);
    return (vec3_t){ 0.5f, (float)h + 0.05f, 0.5f };
}

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
    renderer_init();

    G.world = world_create(/*seed=*/1337ULL);

    /* Generate spawn-area chunks up front so we can land on solid ground. */
    for (int dz = -1; dz <= 1; ++dz)
        for (int dx = -1; dx <= 1; ++dx)
            world_ensure_chunk(G.world, dx, dz);

    vec3_t spawn = find_spawn(G.world);
    player_init(&G.player, spawn);

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

    sdtx_printf("Tenebris WASM Preview (Tier 1)\n");
    sdtx_printf("FPS: %.1f\n", G.smoothed_fps);
    sdtx_printf("pos: %.2f %.2f %.2f  yaw:%.2f pitch:%.2f\n",
                G.player.body.position.x, G.player.body.position.y, G.player.body.position.z,
                G.player.yaw, G.player.pitch);
    sdtx_printf("block: %u  fly:%s  grounded:%s\n",
                (unsigned)G.player.selected_block,
                input_state()->phys.fly_mode ? "on" : "off",
                G.player.body.grounded ? "yes" : "no");
    sdtx_printf("chunks: %zu drawn, %zu remeshed/frame\n",
                renderer_chunks_drawn(),
                renderer_chunks_remeshed_this_frame());
    if (!input_state()->pointer_locked) {
        sdtx_color3b(0xf0, 0xc0, 0x50);
        sdtx_printf("\n[click to lock mouse]\n");
        sdtx_color3b(0xff, 0xff, 0xff);
    }
    sdtx_printf("\nWASD move  SPACE jump  SHIFT sprint  F fly  1-3 block  LMB break  RMB place\n");
}

/* --------------------------------------------------------------------- */

static void frame(void) {
    const double dt_sec = stm_sec(stm_laptime(&G.last_time));
    float dt = (float)dt_sec;
    if (dt > 0.1f) dt = 0.1f;  /* clamp huge deltas on tab resume */

    G.tick++;

    /* Game update */
    player_update(&G.player, G.world, dt);
    interact_update(&G.interact, G.world, &G.player, G.tick);
    input_consume();

    /* Build view/proj */
    const float aspect = sapp_widthf() / sapp_heightf();
    mat4_t view = player_view(&G.player);
    mat4_t proj = mat4_perspective(75.0f * (3.14159265f / 180.0f), aspect, 0.1f, 1024.0f);

    /* Chunk coords of the player — snap floor so negatives behave. */
    int32_t player_cx = (int32_t)floorf(G.player.body.position.x / (float)CHUNK_SIZE);
    int32_t player_cz = (int32_t)floorf(G.player.body.position.z / (float)CHUNK_SIZE);

    render_env_t env = {
        .sun_dir    = { 0.5f, 0.9f, 0.3f },
        .sky_top    = { 0.52f, 0.68f, 0.90f },
        .sky_bottom = { 0.72f, 0.83f, 0.95f },
        .ambient    = { 0.35f, 0.35f, 0.38f },
    };

    renderer_begin_frame(sapp_width(), sapp_height(), env);
    renderer_draw_world(view, proj, G.world, RENDER_RADIUS, player_cx, player_cz);
    if (G.interact.has_target) {
        renderer_draw_outline(view, proj, G.interact.hit.block);
    }

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
    world_destroy(G.world); G.world = NULL;
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
        .html5_canvas_selector = "#canvas",
    };
}
