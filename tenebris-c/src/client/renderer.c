#include "client/renderer.h"
#include "core/blocks.h"

#include "sokol_gfx.h"
#include "sokol_app.h"
#include "sokol_glue.h"
#include "sokol_log.h"

#define STB_IMAGE_IMPLEMENTATION
#include "stb_image.h"

#include <stdlib.h>
#include <string.h>
#include <math.h>

/* ----------------------------------------------------------------------- */

#define MAX_LOD_TRIANGLES  32768
/* Upload budget matches Caelum: enough to keep the hex bubble visually
 * complete within a few frames after a re-anchor, small enough that no
 * single frame uploads more than ~1.5 MB of vertex data. */
#define HEX_REMESH_BUDGET  8

/* LOD vertex format — pos + color, 24 bytes. */
typedef struct {
    float pos[3];
    float color[3];
} lod_vertex_t;

typedef struct {
    int32_t   cx, cy;
    sg_buffer vbuf;
    sg_buffer ibuf;
    int       index_count;
    bool      live;
} hex_gpu_t;

static struct {
    /* LOD pipeline */
    sg_pipeline pip_lod;
    sg_buffer   lod_vbuf_dynamic;

    /* Hex pipeline */
    sg_pipeline pip_hex;
    hex_gpu_t   hex_gpu[HEX_POOL_COUNT];
    hex_mesh_t  hex_scratch;

    /* Texture atlas (1 row x HEX_ATLAS_TILES tiles). */
    sg_image    atlas_img;
    sg_view     atlas_view;
    sg_sampler  atlas_smp;

    sg_pass_action pass_action;
    render_env_t env;

    /* Scratch for LOD triangle stream */
    lod_vertex_t* lod_scratch;
    size_t lod_scratch_cap;

    /* Stats */
    size_t lod_tris;
    size_t hex_tris;
    size_t hex_remeshes;
} R;

/* ----------------------------------------------------------------------- */
/* Shaders (inline GLSL ES 3.00 — sokol-shdc migration follows the first
 * playable hex build).
 */

static const char* VS_LOD =
    "#version 300 es\n"
    "layout(location=0) in vec3 a_pos;\n"
    "layout(location=1) in vec3 a_color;\n"
    "uniform mat4 u_vp;\n"
    "out vec3 v_color;\n"
    "void main() { gl_Position = u_vp * vec4(a_pos, 1.0); v_color = a_color; }\n";

static const char* FS_LOD =
    "#version 300 es\n"
    "precision highp float;\n"
    "in vec3 v_color;\n"
    "out vec4 frag_color;\n"
    "void main() { frag_color = vec4(v_color, 1.0); }\n";

static const char* VS_HEX =
    "#version 300 es\n"
    "layout(location=0) in vec3 a_pos;\n"
    "layout(location=1) in vec3 a_normal;\n"
    "layout(location=2) in vec2 a_uv;\n"
    "uniform mat4 u_vp;\n"
    "uniform vec3 u_sun_dir;\n"
    "uniform vec3 u_ambient;\n"
    "out vec2 v_uv;\n"
    "out float v_light;\n"
    "void main() {\n"
    "  gl_Position = u_vp * vec4(a_pos, 1.0);\n"
    "  vec3 n = normalize(a_normal);\n"
    "  float ndl = max(dot(n, normalize(u_sun_dir)), 0.0);\n"
    "  v_light = clamp(u_ambient.r + ndl, 0.0, 1.5);\n"
    "  v_uv = a_uv;\n"
    "}\n";

static const char* FS_HEX =
    "#version 300 es\n"
    "precision highp float;\n"
    "in vec2 v_uv;\n"
    "in float v_light;\n"
    "uniform sampler2D u_atlas;\n"
    "out vec4 frag_color;\n"
    "void main() {\n"
    "  vec4 tex = texture(u_atlas, v_uv);\n"
    "  frag_color = vec4(tex.rgb * v_light, tex.a);\n"
    "}\n";

/* ----------------------------------------------------------------------- */

void renderer_init(void) {
    memset(&R, 0, sizeof(R));

    /* LOD pipeline + dynamic buffer. */
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
        .depth = { .write_enabled = true, .compare = SG_COMPAREFUNC_LESS_EQUAL },
        .cull_mode = SG_CULLMODE_BACK,
        .face_winding = SG_FACEWINDING_CCW,
        .label = "lod-pipeline",
    });

    /* Hex pipeline — textured, lit. */
    sg_shader shd_hex = sg_make_shader(&(sg_shader_desc){
        .vertex_func.source   = VS_HEX,
        .fragment_func.source = FS_HEX,
        .attrs = {
            [0].glsl_name = "a_pos",
            [1].glsl_name = "a_normal",
            [2].glsl_name = "a_uv",
        },
        .uniform_blocks[0] = {
            .stage = SG_SHADERSTAGE_VERTEX,
            .size  = 16 * sizeof(float),
            .layout = SG_UNIFORMLAYOUT_STD140,
            .glsl_uniforms[0] = { .glsl_name = "u_vp", .type = SG_UNIFORMTYPE_MAT4 },
        },
        .uniform_blocks[1] = {
            .stage = SG_SHADERSTAGE_VERTEX,
            .size  = 8 * sizeof(float),
            .layout = SG_UNIFORMLAYOUT_STD140,
            .glsl_uniforms[0] = { .glsl_name = "u_sun_dir", .type = SG_UNIFORMTYPE_FLOAT3 },
            .glsl_uniforms[1] = { .glsl_name = "u_ambient", .type = SG_UNIFORMTYPE_FLOAT3 },
        },
        .views[0].texture = { .stage = SG_SHADERSTAGE_FRAGMENT,
                              .image_type = SG_IMAGETYPE_2D,
                              .sample_type = SG_IMAGESAMPLETYPE_FLOAT },
        .samplers[0] = { .stage = SG_SHADERSTAGE_FRAGMENT,
                         .sampler_type = SG_SAMPLERTYPE_FILTERING },
        .texture_sampler_pairs[0] = { .stage = SG_SHADERSTAGE_FRAGMENT,
                                      .view_slot = 0, .sampler_slot = 0,
                                      .glsl_name = "u_atlas" },
        .label = "hex-shader",
    });
    R.pip_hex = sg_make_pipeline(&(sg_pipeline_desc){
        .shader = shd_hex,
        .layout = {
            .attrs = {
                [0] = { .format = SG_VERTEXFORMAT_FLOAT3 },
                [1] = { .format = SG_VERTEXFORMAT_FLOAT3 },
                [2] = { .format = SG_VERTEXFORMAT_FLOAT2 },
            },
            .buffers[0].stride = sizeof(hex_vertex_t),
        },
        .index_type = SG_INDEXTYPE_UINT32,
        .depth = { .write_enabled = true, .compare = SG_COMPAREFUNC_LESS_EQUAL },
        .cull_mode = SG_CULLMODE_BACK,
        .face_winding = SG_FACEWINDING_CCW,
        .label = "hex-pipeline",
    });

    /* Bake the texture atlas from PNG sources staged next to the WASM
     * (scripts/build-wasm.sh copies them from public/textures). Tiles
     * are laid out in a single row, indexed by block_t value. */
    {
        const int tile_px = 16;
        const int W = tile_px * HEX_ATLAS_TILES;
        const int H = tile_px;
        unsigned char* atlas = (unsigned char*)calloc((size_t)(W * H * 4), 1);

        /* Column index must match block_t enum values. */
        const char* tile_paths[HEX_ATLAS_TILES] = {
            /* 0  AIR        */ NULL,
            /* 1  WATER      */ "assets/textures/water.png",
            /* 2  SAND       */ "assets/textures/sand.png",
            /* 3  DIRT       */ "assets/textures/dirt.png",
            /* 4  GRASS      */ "assets/textures/grass.png",
            /* 5  STONE      */ "assets/textures/rocks.png",
            /* 6  ICE        */ "assets/textures/ice.png",
            /* 7  SNOW       */ "assets/textures/snow.png",
            /* 8  DIRT_GRASS */ "assets/textures/dirt_grass.png",
            /* 9  DIRT_SNOW  */ "assets/textures/dirt_snow.png",
            /* 10 TORCH      */ "assets/textures/torch.png",
            /* 11 MOON       */ "assets/textures/moon.png",
        };

        for (int col = 0; col < HEX_ATLAS_TILES; ++col) {
            if (!tile_paths[col]) continue;
            int tw, th, tc;
            unsigned char* pix = stbi_load(tile_paths[col], &tw, &th, &tc, 4);
            if (!pix) continue;
            for (int y = 0; y < tile_px; ++y) {
                int sy = y * th / tile_px;
                for (int x = 0; x < tile_px; ++x) {
                    int sx = x * tw / tile_px;
                    int dst_x = col * tile_px + x;
                    int dst_y = y;
                    int src = (sy * tw + sx) * 4;
                    int dst = (dst_y * W + dst_x) * 4;
                    atlas[dst+0] = pix[src+0];
                    atlas[dst+1] = pix[src+1];
                    atlas[dst+2] = pix[src+2];
                    atlas[dst+3] = pix[src+3];
                }
            }
            stbi_image_free(pix);
        }

        R.atlas_img = sg_make_image(&(sg_image_desc){
            .width = W, .height = H,
            .pixel_format = SG_PIXELFORMAT_RGBA8,
            .data.mip_levels[0] = { .ptr = atlas, .size = (size_t)(W * H * 4) },
            .label = "hex-atlas",
        });
        R.atlas_view = sg_make_view(&(sg_view_desc){
            .texture.image = R.atlas_img,
            .label = "hex-atlas-view",
        });
        R.atlas_smp = sg_make_sampler(&(sg_sampler_desc){
            .min_filter = SG_FILTER_NEAREST,
            .mag_filter = SG_FILTER_NEAREST,
            .wrap_u = SG_WRAP_CLAMP_TO_EDGE,
            .wrap_v = SG_WRAP_CLAMP_TO_EDGE,
            .label = "hex-atlas-sampler",
        });
        free(atlas);
    }

    hex_mesh_init(&R.hex_scratch);
}

void renderer_shutdown(void) {
    for (int i = 0; i < HEX_POOL_COUNT; ++i) {
        if (R.hex_gpu[i].live) {
            sg_destroy_buffer(R.hex_gpu[i].vbuf);
            sg_destroy_buffer(R.hex_gpu[i].ibuf);
        }
    }
    hex_mesh_free(&R.hex_scratch);
    free(R.lod_scratch);
    sg_destroy_buffer(R.lod_vbuf_dynamic);
    sg_destroy_view(R.atlas_view);
    sg_destroy_image(R.atlas_img);
    sg_destroy_sampler(R.atlas_smp);
    sg_destroy_pipeline(R.pip_lod);
    sg_destroy_pipeline(R.pip_hex);
}

void renderer_begin_frame(int w, int h, render_env_t env) {
    (void)w; (void)h;
    R.env = env;
    R.lod_tris = 0;
    R.hex_tris = 0;
    R.hex_remeshes = 0;
    R.pass_action = (sg_pass_action){
        .colors[0] = {
            .load_action = SG_LOADACTION_CLEAR,
            .clear_value = { env.sky_bottom.x, env.sky_bottom.y, env.sky_bottom.z, 1.0f },
        },
        .depth = { .load_action = SG_LOADACTION_CLEAR, .clear_value = 1.0f },
    };
    sg_begin_pass(&(sg_pass){ .action = R.pass_action, .swapchain = sglue_swapchain() });
}

/* ---- LOD draw (unchanged except stat bookkeeping) ----------------------- */

static void face_tint(int face, float* r, float* g, float* b) {
    *r = 0.30f + 0.60f * (float)((face * 53) % 100) / 100.0f;
    *g = 0.30f + 0.60f * (float)((face * 97) % 100) / 100.0f;
    *b = 0.30f + 0.60f * (float)((face * 31) % 100) / 100.0f;
}

void renderer_draw_lod_tree(mat4_t view, mat4_t proj, const lod_tree_t* tree,
                            dvec3_t floating_origin, double planet_radius_m) {
    int n = lod_tree_visible_count(tree);
    if (n <= 0) return;
    lod_vertex_t* buf = R.lod_scratch;

    size_t cursor = 0;
    for (int i = 0; i < n && cursor + 3 <= R.lod_scratch_cap; ++i) {
        const lod_node_t* nd = lod_tree_node(tree, i);
        if (!nd) continue;
        dvec3_t pa = dvec3_sub(dvec3_scale(nd->a, planet_radius_m), floating_origin);
        dvec3_t pb = dvec3_sub(dvec3_scale(nd->b, planet_radius_m), floating_origin);
        dvec3_t pc = dvec3_sub(dvec3_scale(nd->c, planet_radius_m), floating_origin);
        float r, g, b;
        face_tint(nd->root_face, &r, &g, &b);
        const float darken = 1.0f - 0.05f * (float)nd->depth;
        r *= darken; g *= darken; b *= darken;

        buf[cursor++] = (lod_vertex_t){ { (float)pa.x, (float)pa.y, (float)pa.z }, { r, g, b } };
        buf[cursor++] = (lod_vertex_t){ { (float)pb.x, (float)pb.y, (float)pb.z }, { r, g, b } };
        buf[cursor++] = (lod_vertex_t){ { (float)pc.x, (float)pc.y, (float)pc.z }, { r, g, b } };
    }
    if (cursor == 0) return;

    sg_update_buffer(R.lod_vbuf_dynamic, &(sg_range){ .ptr = buf, .size = cursor * sizeof(lod_vertex_t) });

    sg_apply_pipeline(R.pip_lod);
    mat4_t vp = mat4_mul(proj, view);
    sg_apply_uniforms(0, &(sg_range){ .ptr = vp.m, .size = sizeof(vp.m) });
    sg_apply_bindings(&(sg_bindings){ .vertex_buffers[0] = R.lod_vbuf_dynamic });
    sg_draw(0, (int)cursor, 1);
    R.lod_tris = cursor / 3;
}

/* ---- hex chunk GPU resource management --------------------------------- */

static hex_gpu_t* find_or_alloc_hex_gpu(int32_t cx, int32_t cy) {
    hex_gpu_t* empty = NULL;
    for (int i = 0; i < HEX_POOL_COUNT; ++i) {
        hex_gpu_t* g = &R.hex_gpu[i];
        if (g->live && g->cx == cx && g->cy == cy) return g;
        if (!g->live && !empty) empty = g;
    }
    return empty;
}

static void destroy_hex_gpu(hex_gpu_t* g) {
    if (!g->live) return;
    sg_destroy_buffer(g->vbuf);
    sg_destroy_buffer(g->ibuf);
    g->live = false;
    g->index_count = 0;
}

static void upload_hex_mesh(hex_gpu_t* g, const hex_mesh_t* m) {
    if (g->live) destroy_hex_gpu(g);
    if (m->vertex_count == 0 || m->index_count == 0) return;
    g->vbuf = sg_make_buffer(&(sg_buffer_desc){
        .data = { .ptr = m->vertices, .size = m->vertex_count * sizeof(hex_vertex_t) },
        .label = "hex-vbuf",
    });
    g->ibuf = sg_make_buffer(&(sg_buffer_desc){
        .usage.index_buffer = true,
        .data = { .ptr = m->indices, .size = m->index_count * sizeof(uint32_t) },
        .label = "hex-ibuf",
    });
    g->index_count = (int)m->index_count;
    g->live = true;
}

/* Evict any GPU chunks whose (cx, cy) is not in the live pool. Called
 * each frame so re-anchors don't leak buffers. */
static void evict_stale_hex_gpus(const hex_pool_t* pool) {
    for (int i = 0; i < HEX_POOL_COUNT; ++i) {
        hex_gpu_t* g = &R.hex_gpu[i];
        if (!g->live) continue;
        bool found = false;
        for (int j = 0; j < HEX_POOL_COUNT; ++j) {
            const hex_chunk_t* c = hex_pool_chunk_at(pool, j);
            if (c && c->active && c->cx == g->cx && c->cy == g->cy) { found = true; break; }
        }
        if (!found) destroy_hex_gpu(g);
    }
}

/* ---- hex pool draw ------------------------------------------------------ */

void renderer_draw_hex_pool(mat4_t view, mat4_t proj, hex_pool_t* pool,
                            dvec3_t floating_origin) {
    evict_stale_hex_gpus(pool);

    /* Remesh budget: rebuild at most HEX_REMESH_BUDGET dirty chunks this
     * frame, picked in pool order. Keeps per-frame cost bounded; the rest
     * wait for the next frame. */
    int remeshes = 0;
    for (int i = 0; i < HEX_POOL_COUNT; ++i) {
        hex_chunk_t* c = (hex_chunk_t*)hex_pool_chunk_at(pool, i);
        if (!c || !c->active) continue;

        hex_gpu_t* g = find_or_alloc_hex_gpu(c->cx, c->cy);
        if (!g) continue;

        const bool needs_mesh = !g->live || c->dirty;
        if (!needs_mesh) continue;
        if (remeshes >= HEX_REMESH_BUDGET && g->live) continue;
        remeshes++;

        hex_mesh_reset(&R.hex_scratch);
        hex_mesh_build_chunk(&R.hex_scratch, pool, c, floating_origin);
        g->cx = c->cx; g->cy = c->cy;
        upload_hex_mesh(g, &R.hex_scratch);
        c->dirty = false;
    }
    R.hex_remeshes = (size_t)remeshes;

    /* Draw every live GPU chunk. */
    sg_apply_pipeline(R.pip_hex);
    mat4_t vp = mat4_mul(proj, view);
    sg_apply_uniforms(0, &(sg_range){ .ptr = vp.m, .size = sizeof(vp.m) });
    float light_ub[8] = {
        R.env.sun_dir.x, R.env.sun_dir.y, R.env.sun_dir.z, 0.0f,
        R.env.ambient.x, R.env.ambient.y, R.env.ambient.z, 0.0f,
    };
    sg_apply_uniforms(1, &(sg_range){ .ptr = light_ub, .size = sizeof(light_ub) });

    for (int i = 0; i < HEX_POOL_COUNT; ++i) {
        hex_gpu_t* g = &R.hex_gpu[i];
        if (!g->live || g->index_count == 0) continue;
        sg_apply_bindings(&(sg_bindings){
            .vertex_buffers[0] = g->vbuf,
            .index_buffer      = g->ibuf,
            .views[0]          = R.atlas_view,
            .samplers[0]       = R.atlas_smp,
        });
        sg_draw(0, g->index_count, 1);
        R.hex_tris += (size_t)(g->index_count / 3);
    }
}

void renderer_end_frame(void) {
    sg_end_pass();
    sg_commit();
}

size_t renderer_triangles_drawn_this_frame(void) { return R.lod_tris + R.hex_tris; }
size_t renderer_hex_triangles_drawn_this_frame(void) { return R.hex_tris; }
size_t renderer_hex_remeshes_this_frame(void) { return R.hex_remeshes; }
