/*
 * tenebris - Tier 0 hello triangle.
 *
 * Proves the sokol + emscripten + WebGL2 pipeline end-to-end.
 * Draws a single colored triangle and renders FPS via sokol_debugtext.
 *
 * Tier 1 will split this file into renderer.c / input.c / player_ctrl.c
 * and start drawing voxels.
 */

#define SOKOL_IMPL
#include "sokol_gfx.h"
#include "sokol_app.h"
#include "sokol_glue.h"
#include "sokol_log.h"
#include "sokol_time.h"
#include "sokol_debugtext.h"

#include "core/blocks.h"
#include "core/world.h"

#include <stdint.h>

/* --------------------------------------------------------------------- */
/* Shaders. Inline for Tier 0 so we don't need sokol-shdc in the toolchain
 * yet. Tier 1 moves to sokol-shdc-generated headers for cross-backend.
 * GLES3 source works for WebGL2 and is what emscripten builds use.
 */
static const char* VS_SRC =
    "#version 300 es\n"
    "layout(location=0) in vec3 a_pos;\n"
    "layout(location=1) in vec4 a_color;\n"
    "out vec4 v_color;\n"
    "void main() {\n"
    "  gl_Position = vec4(a_pos, 1.0);\n"
    "  v_color = a_color;\n"
    "}\n";

static const char* FS_SRC =
    "#version 300 es\n"
    "precision highp float;\n"
    "in vec4 v_color;\n"
    "out vec4 frag_color;\n"
    "void main() { frag_color = v_color; }\n";

/* --------------------------------------------------------------------- */

static struct {
    sg_pass_action pass_action;
    sg_pipeline    pip;
    sg_bindings    bind;
    uint64_t       last_time;
    float          smoothed_fps;
    world_t*       world;
} state;

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

    /* Wire up core — proves the static lib links. */
    state.world = world_create(/*seed=*/1337ULL);

    /* Clip-space triangle with per-vertex color. */
    const float vertices[] = {
        /*  x     y     z       r  g  b  a  */
         0.0f,  0.6f, 0.0f,   1, 0, 0, 1,
         0.6f, -0.5f, 0.0f,   0, 1, 0, 1,
        -0.6f, -0.5f, 0.0f,   0, 0, 1, 1,
    };
    state.bind.vertex_buffers[0] = sg_make_buffer(&(sg_buffer_desc){
        .data = SG_RANGE(vertices),
        .label = "triangle-vertices",
    });

    sg_shader shd = sg_make_shader(&(sg_shader_desc){
        .vertex_func.source   = VS_SRC,
        .fragment_func.source = FS_SRC,
        .attrs = {
            [0].glsl_name = "a_pos",
            [1].glsl_name = "a_color",
        },
        .label = "tri-shader",
    });

    state.pip = sg_make_pipeline(&(sg_pipeline_desc){
        .shader = shd,
        .layout = {
            .attrs = {
                [0].format = SG_VERTEXFORMAT_FLOAT3,
                [1].format = SG_VERTEXFORMAT_FLOAT4,
            },
        },
        .label = "tri-pipeline",
    });

    state.pass_action = (sg_pass_action){
        .colors[0] = {
            .load_action = SG_LOADACTION_CLEAR,
            .clear_value = { 0.05f, 0.07f, 0.12f, 1.0f },
        },
    };

    state.last_time = stm_now();
    state.smoothed_fps = 60.0f;
}

static void frame(void) {
    const uint64_t now = stm_now();
    const double   dt_sec = stm_sec(stm_laptime(&state.last_time));
    const float    inst_fps = (dt_sec > 0.0) ? (float)(1.0 / dt_sec) : 0.0f;
    state.smoothed_fps = state.smoothed_fps * 0.9f + inst_fps * 0.1f;
    (void)now;

    /* Debug text overlay. */
    sdtx_canvas(sapp_widthf() * 0.5f, sapp_heightf() * 0.5f);
    sdtx_origin(1.0f, 1.0f);
    sdtx_color3b(0xf0, 0xf0, 0xf0);
    sdtx_printf("Tenebris - WASM Preview (Tier 0)\n");
    sdtx_printf("FPS: %.1f\n", state.smoothed_fps);
    sdtx_printf("%dx%d  canvas\n", sapp_width(), sapp_height());

    sg_begin_pass(&(sg_pass){
        .action = state.pass_action,
        .swapchain = sglue_swapchain(),
    });
    sg_apply_pipeline(state.pip);
    sg_apply_bindings(&state.bind);
    sg_draw(0, 3, 1);
    sdtx_draw();
    sg_end_pass();
    sg_commit();
}

static void event(const sapp_event* e) {
    if (e->type == SAPP_EVENTTYPE_KEY_DOWN && e->key_code == SAPP_KEYCODE_ESCAPE) {
        sapp_quit();
    }
}

static void cleanup(void) {
    if (state.world) { world_destroy(state.world); state.world = NULL; }
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
