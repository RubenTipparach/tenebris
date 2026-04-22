#include "client/renderer.h"

#include "sokol_gfx.h"
#include "sokol_app.h"
#include "sokol_glue.h"
#include "sokol_log.h"

#include <stdlib.h>
#include <string.h>
#include <math.h>

/*
 * Tier 1 (reset) renderer. One pipeline only — colored LOD patches.
 * Hex prism pipeline lands in the next commit. Per the §10 lessons,
 * the LOD pipeline draws *every* visible icosphere node as a single
 * unlit triangle in a tinted color so we can see the planet shape.
 */

#define MAX_LOD_TRIANGLES 32768   /* well above LOD_MAX_NODES */

typedef struct {
    float pos[3];
    float color[3];
} lod_vertex_t;

static struct {
    sg_pipeline    pip_lod;
    sg_buffer      lod_vbuf_dynamic;
    sg_pass_action pass_action;
    render_env_t   env;
    size_t         triangles_drawn;

    /* Scratch CPU buffer for the LOD vertex stream. Reuploaded each
     * frame via sg_update_buffer — small enough that this is cheaper
     * than per-node static buffers while we're still scaffolding. */
    lod_vertex_t*  lod_scratch;
    size_t         lod_scratch_cap;
} R;

/* ---- shaders (inline GLSL ES 3.00, sokol-shdc migration is Tier 1.x) -- */

static const char* VS_LOD =
    "#version 300 es\n"
    "layout(location=0) in vec3 a_pos;\n"
    "layout(location=1) in vec3 a_color;\n"
    "uniform mat4 u_vp;\n"
    "out vec3 v_color;\n"
    "void main() {\n"
    "  gl_Position = u_vp * vec4(a_pos, 1.0);\n"
    "  v_color = a_color;\n"
    "}\n";

static const char* FS_LOD =
    "#version 300 es\n"
    "precision highp float;\n"
    "in vec3 v_color;\n"
    "out vec4 frag_color;\n"
    "void main() { frag_color = vec4(v_color, 1.0); }\n";

/* ---------------------------------------------------------------------- */

void renderer_init(void) {
    memset(&R, 0, sizeof(R));

    R.lod_scratch_cap = MAX_LOD_TRIANGLES * 3;
    R.lod_scratch = (lod_vertex_t*)malloc(R.lod_scratch_cap * sizeof(lod_vertex_t));

    R.lod_vbuf_dynamic = sg_make_buffer(&(sg_buffer_desc){
        .size = R.lod_scratch_cap * sizeof(lod_vertex_t),
        .usage.stream_update = true,
        .label = "lod-vbuf",
    });

    sg_shader shd_lod = sg_make_shader(&(sg_shader_desc){
        .vertex_func.source   = VS_LOD,
        .fragment_func.source = FS_LOD,
        .attrs = {
            [0].glsl_name = "a_pos",
            [1].glsl_name = "a_color",
        },
        .uniform_blocks[0] = {
            .stage = SG_SHADERSTAGE_VERTEX,
            .size  = 16 * sizeof(float),
            .layout = SG_UNIFORMLAYOUT_STD140,
            .glsl_uniforms[0] = { .glsl_name = "u_vp", .type = SG_UNIFORMTYPE_MAT4 },
        },
        .label = "lod-shader",
    });

    R.pip_lod = sg_make_pipeline(&(sg_pipeline_desc){
        .shader = shd_lod,
        .layout = {
            .attrs = {
                [0] = { .format = SG_VERTEXFORMAT_FLOAT3 },
                [1] = { .format = SG_VERTEXFORMAT_FLOAT3 },
            },
            .buffers[0].stride = sizeof(lod_vertex_t),
        },
        .index_type = SG_INDEXTYPE_NONE,
        .depth = { .write_enabled = true, .compare = SG_COMPAREFUNC_LESS_EQUAL },
        .cull_mode = SG_CULLMODE_BACK,
        .face_winding = SG_FACEWINDING_CCW,
        .label = "lod-pipeline",
    });
}

void renderer_shutdown(void) {
    free(R.lod_scratch);
    sg_destroy_buffer(R.lod_vbuf_dynamic);
    sg_destroy_pipeline(R.pip_lod);
}

void renderer_begin_frame(int w, int h, render_env_t env) {
    (void)w; (void)h;
    R.env = env;
    R.triangles_drawn = 0;
    R.pass_action = (sg_pass_action){
        .colors[0] = {
            .load_action = SG_LOADACTION_CLEAR,
            .clear_value = { env.sky_bottom.x, env.sky_bottom.y, env.sky_bottom.z, 1.0f },
        },
        .depth = { .load_action = SG_LOADACTION_CLEAR, .clear_value = 1.0f },
    };
    sg_begin_pass(&(sg_pass){ .action = R.pass_action, .swapchain = sglue_swapchain() });
}

/* Stable per-face tint so each icosa face is visually distinguishable. */
static void face_tint(int face, float* r, float* g, float* b) {
    /* Cheap deterministic coloring; no need for a real palette yet. */
    *r = 0.30f + 0.60f * (float)((face * 53) % 100) / 100.0f;
    *g = 0.30f + 0.60f * (float)((face * 97) % 100) / 100.0f;
    *b = 0.30f + 0.60f * (float)((face * 31) % 100) / 100.0f;
}

void renderer_draw_lod_tree(mat4_t view, mat4_t proj, const lod_tree_t* tree,
                            dvec3_t floating_origin, double planet_radius_m) {
    int n = lod_tree_visible_count(tree);
    if (n <= 0) return;

    size_t cursor = 0;
    for (int i = 0; i < n && cursor + 3 <= R.lod_scratch_cap; ++i) {
        const lod_node_t* nd = lod_tree_node(tree, i);
        if (!nd) continue;

        /* Sphere coords -> world coords -> floating-origin coords. */
        dvec3_t pa = dvec3_sub(dvec3_scale(nd->a, planet_radius_m), floating_origin);
        dvec3_t pb = dvec3_sub(dvec3_scale(nd->b, planet_radius_m), floating_origin);
        dvec3_t pc = dvec3_sub(dvec3_scale(nd->c, planet_radius_m), floating_origin);

        float r, g, b;
        face_tint(nd->root_face, &r, &g, &b);
        /* Slightly darken deeper LODs so subdivision is visible later. */
        const float darken = 1.0f - 0.05f * (float)nd->depth;
        r *= darken; g *= darken; b *= darken;

        R.lod_scratch[cursor++] = (lod_vertex_t){ { (float)pa.x, (float)pa.y, (float)pa.z }, { r, g, b } };
        R.lod_scratch[cursor++] = (lod_vertex_t){ { (float)pb.x, (float)pb.y, (float)pb.z }, { r, g, b } };
        R.lod_scratch[cursor++] = (lod_vertex_t){ { (float)pc.x, (float)pc.y, (float)pc.z }, { r, g, b } };
    }
    if (cursor == 0) return;

    sg_update_buffer(R.lod_vbuf_dynamic, &(sg_range){ .ptr = R.lod_scratch, .size = cursor * sizeof(lod_vertex_t) });

    sg_apply_pipeline(R.pip_lod);
    mat4_t vp = mat4_mul(proj, view);
    sg_apply_uniforms(0, &(sg_range){ .ptr = vp.m, .size = sizeof(vp.m) });
    sg_apply_bindings(&(sg_bindings){ .vertex_buffers[0] = R.lod_vbuf_dynamic });
    sg_draw(0, (int)cursor, 1);
    R.triangles_drawn = cursor / 3;
}

void renderer_end_frame(void) {
    sg_end_pass();
    sg_commit();
}

size_t renderer_triangles_drawn_this_frame(void) { return R.triangles_drawn; }
