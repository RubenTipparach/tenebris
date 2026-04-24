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
#include "client/gfx_math.h"
#include "client/input.h"
#include "client/player_ctrl.h"
#include "client/renderer.h"
#include "client/interact.h"
#include "client/mobile_ui.h"
#include "client/teleport_menu.h"

#include <math.h>
#include <stdint.h>
#include <stdlib.h>

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
    job_system_init(0);
    renderer_init();
    mobile_ui_init();
    teleport_menu_init();
    teleport_menu_set_player(&G.player);

    G.body  = planet_get(BODY_TENEBRIS);
    G.world = world_create(G.body, G.body->subdivisions);
    player_init(&G.player, G.body);

    /* Drain Tenebris gen synchronously at init so the spawn tile has
     * terrain the moment the first frame lands. Rendering still streams
     * mesh uploads so there's no 40 MB upload hitch — gen itself is
     * fast (~200 ms for 40 k tiles of noise). */
    while (!world_gen_complete(G.world)) {
        world_stream_gen(G.world, G.world->tile_count);
    }

    /* Build and register every non-main body — moons, neighbouring
     * planets, the asteroid belt. Each is fully generated + meshed
     * synchronously at boot. Asteroids have subs=3 (642 tiles → tiny
     * mesh), moons have subs=3–4, sister planets up to subs=6 —
     * total init cost ~700 ms but it's a one-off. */
    for (int id = BODY_LUNA; id < BODY_COUNT; ++id) {
        const body_config_t* b = planet_get((body_id_t)id);
        if (!b) continue;
        world_t* body_world = world_create(b, b->subdivisions);
        while (!world_gen_complete(body_world)) world_stream_gen(body_world, body_world->tile_count);
        renderer_register_moon(body_world);
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
    double r = sqrt(pos.x*pos.x + pos.y*pos.y + pos.z*pos.z);
    double alt = r - G.body->radius_m;
    sdtx_printf("planet: %s  radius: %.1f m\n", G.body->name, G.body->radius_m);
    sdtx_printf("alt: %.1f m  tile: %d\n", alt, G.player.last_tile);
    sdtx_printf("yaw: %.2f  pitch: %.2f  fly:%s  grounded:%s\n",
                G.player.yaw, G.player.pitch,
                G.player.fly_mode ? "on" : "off",
                G.player.grounded ? "yes" : "no");
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
        sdtx_printf("target: tile=%d depth=%d dist=%.1fm\n",
                    G.interact.hit_tile, G.interact.hit_depth, G.interact.distance);
    }
    if (!input_state()->pointer_locked && !input_state()->touch_active) {
        sdtx_color3b(0xf0, 0xc0, 0x50);
        sdtx_printf("\n[click to lock mouse]\n");
        sdtx_color3b(0xff, 0xff, 0xff);
    }
}

/* --------------------------------------------------------------------- */

static void frame(void) {
    const double dt_sec = stm_sec(stm_laptime(&G.last_time));
    float dt = (float)dt_sec;
    if (dt > 0.1f) dt = 0.1f;
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

    player_update(&G.player, G.world, dt);
    interact_update(&G.interact, G.world, &G.player);
    input_consume();

    const float aspect = sapp_widthf() / sapp_heightf();
    mat4_t view = player_view(&G.player);
    const float zfar = (float)(G.body->radius_m * 6.0);
    mat4_t proj = mat4_perspective(60.0f * (3.14159265f / 180.0f), aspect, 0.3f, zfar);

    render_env_t env = {
        .sun_dir    = { 0.5f, 0.9f, 0.3f },
        .sky_top    = { 0.02f, 0.04f, 0.10f },
        .sky_bottom = { 0.05f, 0.08f, 0.15f },
        .ambient    = { 0.35f, 0.35f, 0.40f },
    };
    /* Camera world pos for the water-shader fresnel. Uses the player's
     * parallel-transported basis so it stays continuous when the old
     * phys_tangent_basis reference axis would flip. */
    dvec3_t cam_world_d = dvec3_add(G.player.position,
                                    dvec3_scale(G.player.basis.up, 1.6));
    vec3_t cam_world = dvec3_to_vec3(cam_world_d);

    renderer_begin_frame(sapp_width(), sapp_height(), env);
    /* Skybox first — fullscreen stars + sun, no depth write so the
     * rest of the scene paints over it. */
    renderer_draw_skybox(view, proj);
    renderer_draw_world(view, proj, G.world, cam_world, dt);
    renderer_draw_moons(view, proj);

    update_overlay(dt);
    teleport_menu_draw();
    sdtx_draw();
    mobile_ui_draw();

    renderer_end_frame();
}

/* --------------------------------------------------------------------- */

static void event(const sapp_event* e) {
    /* Teleport menu gets first crack — it intercepts T/M/arrows/enter
     * when open so those keys don't also reach the movement layer. */
    if (teleport_menu_event(e, &G.player)) return;
    input_event(e);
    if (e->type == SAPP_EVENTTYPE_KEY_DOWN && e->key_code == SAPP_KEYCODE_ESCAPE) {
        sapp_lock_mouse(false);
    }
}

static void cleanup(void) {
    teleport_menu_shutdown();
    mobile_ui_shutdown();
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
