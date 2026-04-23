#include "client/renderer.h"
#include "client/hex_mesher.h"
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
/* One GPU buffer pair per tile. Goldberg at subs=3 has 642 tiles; each
 * tile's mesh is ~8-16 triangles so the per-buffer overhead is the
 * dominant cost, not the vertex throughput. We allocate buffers lazily
 * and cap the number of rebuilds per frame to keep the frame budget.
 */
typedef struct {
    sg_buffer vbuf;
    sg_buffer ibuf;
    int       index_count;
    bool      live;
} tile_gpu_t;

#define REMESH_BUDGET_PER_FRAME  12   /* tiles meshed + uploaded per frame */

static struct {
    sg_pipeline pip_hex;
    sg_image    atlas_img;
    sg_view     atlas_view;
    sg_sampler  atlas_smp;

    tile_gpu_t* gpu_tiles;
    int         gpu_tile_count;
    hex_mesh_t  scratch;

    sg_pass_action pass_action;
    render_env_t   env;

    /* Stats */
    size_t tris;
    size_t tiles_drawn;
    size_t tiles_remeshed;
} R;

/* ----------------------------------------------------------------------- */

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

static void bake_atlas(void) {
    stbi_set_flip_vertically_on_load(1);
    const int tile_px = 16;
    const int W = tile_px * HEX_ATLAS_TILES;
    const int H = tile_px;
    unsigned char* atlas = (unsigned char*)calloc((size_t)(W * H * 4), 1);

    const char* paths[HEX_ATLAS_TILES] = {
        NULL,
        "assets/textures/water.png",
        "assets/textures/sand.png",
        "assets/textures/dirt.png",
        "assets/textures/grass.png",
        "assets/textures/rocks.png",
        "assets/textures/ice.png",
        "assets/textures/snow.png",
        "assets/textures/dirt_grass.png",
        "assets/textures/dirt_snow.png",
        "assets/textures/torch.png",
        "assets/textures/moon.png",
    };
    for (int col = 0; col < HEX_ATLAS_TILES; ++col) {
        if (!paths[col]) continue;
        int tw, th, tc;
        unsigned char* pix = stbi_load(paths[col], &tw, &th, &tc, 4);
        if (!pix) continue;
        for (int y = 0; y < tile_px; ++y) {
            int sy = y * th / tile_px;
            for (int x = 0; x < tile_px; ++x) {
                int sx = x * tw / tile_px;
                int src = (sy * tw + sx) * 4;
                int dst = (y * W + col * tile_px + x) * 4;
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

/* ----------------------------------------------------------------------- */

void renderer_init(void) {
    memset(&R, 0, sizeof(R));

    sg_shader shd = sg_make_shader(&(sg_shader_desc){
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
        .shader = shd,
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
    bake_atlas();
    hex_mesh_init(&R.scratch);
}

void renderer_shutdown(void) {
    if (R.gpu_tiles) {
        for (int i = 0; i < R.gpu_tile_count; ++i) {
            if (R.gpu_tiles[i].live) {
                sg_destroy_buffer(R.gpu_tiles[i].vbuf);
                sg_destroy_buffer(R.gpu_tiles[i].ibuf);
            }
        }
        free(R.gpu_tiles);
    }
    hex_mesh_free(&R.scratch);
    sg_destroy_view(R.atlas_view);
    sg_destroy_image(R.atlas_img);
    sg_destroy_sampler(R.atlas_smp);
    sg_destroy_pipeline(R.pip_hex);
}

void renderer_begin_frame(int w, int h, render_env_t env) {
    (void)w; (void)h;
    R.env = env;
    R.tris = 0;
    R.tiles_drawn = 0;
    R.tiles_remeshed = 0;
    R.pass_action = (sg_pass_action){
        .colors[0] = {
            .load_action = SG_LOADACTION_CLEAR,
            .clear_value = { env.sky_bottom.x, env.sky_bottom.y, env.sky_bottom.z, 1.0f },
        },
        .depth = { .load_action = SG_LOADACTION_CLEAR, .clear_value = 1.0f },
    };
    sg_begin_pass(&(sg_pass){ .action = R.pass_action, .swapchain = sglue_swapchain() });
}

/* ----------------------------------------------------------------------- */

static void ensure_gpu_array(world_t* w) {
    if (R.gpu_tile_count != w->tile_count) {
        /* First call or world resized — allocate the tile GPU pool. */
        if (R.gpu_tiles) {
            for (int i = 0; i < R.gpu_tile_count; ++i) {
                if (R.gpu_tiles[i].live) {
                    sg_destroy_buffer(R.gpu_tiles[i].vbuf);
                    sg_destroy_buffer(R.gpu_tiles[i].ibuf);
                }
            }
            free(R.gpu_tiles);
        }
        R.gpu_tile_count = w->tile_count;
        R.gpu_tiles = (tile_gpu_t*)calloc((size_t)R.gpu_tile_count, sizeof(tile_gpu_t));
    }
}

static void upload_tile(tile_gpu_t* g, const hex_mesh_t* m) {
    if (g->live) {
        sg_destroy_buffer(g->vbuf);
        sg_destroy_buffer(g->ibuf);
        g->live = false;
    }
    if (m->vertex_count == 0 || m->index_count == 0) {
        g->index_count = 0;
        return;
    }
    g->vbuf = sg_make_buffer(&(sg_buffer_desc){
        .data = { .ptr = m->vertices, .size = m->vertex_count * sizeof(hex_vertex_t) },
        .label = "tile-vbuf",
    });
    g->ibuf = sg_make_buffer(&(sg_buffer_desc){
        .usage.index_buffer = true,
        .data = { .ptr = m->indices, .size = m->index_count * sizeof(uint32_t) },
        .label = "tile-ibuf",
    });
    g->index_count = (int)m->index_count;
    g->live = true;
}

void renderer_draw_world(mat4_t view, mat4_t proj, world_t* world) {
    ensure_gpu_array(world);

    /* Remesh dirty tiles, capped per frame. */
    int remeshed = 0;
    for (int i = 0; i < world->tile_count && remeshed < REMESH_BUDGET_PER_FRAME; ++i) {
        /* Skip tiles that haven't been generated yet. */
        if (i >= world->gen_cursor) break;
        if (!world_tile_dirty(world, i)) continue;
        hex_mesh_reset(&R.scratch);
        hex_mesh_build_tile(&R.scratch, world, i);
        upload_tile(&R.gpu_tiles[i], &R.scratch);
        world_tile_clear_dirty(world, i);
        remeshed++;
    }
    R.tiles_remeshed = (size_t)remeshed;

    /* Draw. */
    sg_apply_pipeline(R.pip_hex);
    mat4_t vp = mat4_mul(proj, view);
    sg_apply_uniforms(0, &(sg_range){ .ptr = vp.m, .size = sizeof(vp.m) });
    float light_ub[8] = {
        R.env.sun_dir.x, R.env.sun_dir.y, R.env.sun_dir.z, 0.0f,
        R.env.ambient.x, R.env.ambient.y, R.env.ambient.z, 0.0f,
    };
    sg_apply_uniforms(1, &(sg_range){ .ptr = light_ub, .size = sizeof(light_ub) });

    for (int i = 0; i < R.gpu_tile_count; ++i) {
        tile_gpu_t* g = &R.gpu_tiles[i];
        if (!g->live || g->index_count == 0) continue;
        sg_apply_bindings(&(sg_bindings){
            .vertex_buffers[0] = g->vbuf,
            .index_buffer      = g->ibuf,
            .views[0]          = R.atlas_view,
            .samplers[0]       = R.atlas_smp,
        });
        sg_draw(0, g->index_count, 1);
        R.tris += (size_t)(g->index_count / 3);
        R.tiles_drawn++;
    }
}

void renderer_end_frame(void) {
    sg_end_pass();
    sg_commit();
}

size_t renderer_triangles_drawn_this_frame(void) { return R.tris; }
size_t renderer_tiles_drawn_this_frame(void)     { return R.tiles_drawn; }
size_t renderer_tiles_remeshed_this_frame(void)  { return R.tiles_remeshed; }
