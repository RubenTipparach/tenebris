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
/* Goldberg @ subs=6 = 40,962 tiles. Per-tile draw calls would cost
 * ~400 ms/frame just in binding overhead. Instead we build a single
 * merged mesh on CPU, upload once to the GPU, and render the whole
 * planet in one sg_draw call.
 *
 * Mesh build is streamed: each frame we mesh up to MESH_BUDGET newly-
 * generated tiles, append to the CPU mesh, and re-upload. Only dirty
 * tiles are meshed — after the initial pass we only rebuild on edits.
 */

#define MESH_BUDGET_PER_FRAME  512
#define MAX_VERTICES           (2u << 20)    /* 2M verts cap (~64 MB)   */
#define MAX_INDICES            (6u << 20)    /* 6M indices (~24 MB)     */

static struct {
    sg_pipeline pip_hex;
    sg_image    atlas_img;
    sg_view     atlas_view;
    sg_sampler  atlas_smp;

    /* Single merged mesh. Rebuilt incrementally as tiles are meshed. */
    sg_buffer   vbuf;
    sg_buffer   ibuf;
    hex_mesh_t  mesh;
    int         mesh_cursor;              /* tiles meshed into the CPU mesh so far */
    int         last_uploaded_cursor;     /* mesh_cursor value at the last GPU upload */
    int         last_uploaded_index_count;/* draw count = last-uploaded index_count */

    sg_pass_action pass_action;
    render_env_t   env;

    size_t tris;
    size_t tiles_remeshed;
} R;

/* Map from tile index to [vertex_offset, vertex_count, index_offset, index_count]
 * so edits can rebuild just that tile's slice. Kept flat; -1 = not meshed yet. */
typedef struct {
    uint32_t vert_offset;
    uint32_t vert_count;
    uint32_t idx_offset;
    uint32_t idx_count;
} tile_slice_t;

static tile_slice_t* SLICES = NULL;

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

    /* Allocate the two big streaming buffers up front at their max size.
     * sg_update_buffer replaces the whole buffer each call; we always
     * submit only the used prefix. */
    R.vbuf = sg_make_buffer(&(sg_buffer_desc){
        .size = (size_t)MAX_VERTICES * sizeof(hex_vertex_t),
        .usage.stream_update = true,
        .label = "world-vbuf",
    });
    R.ibuf = sg_make_buffer(&(sg_buffer_desc){
        .size = (size_t)MAX_INDICES * sizeof(uint32_t),
        .usage.stream_update = true,
        .usage.index_buffer  = true,
        .label = "world-ibuf",
    });

    bake_atlas();
    hex_mesh_init(&R.mesh);
    /* Pre-allocate the CPU mesh at full GPU capacity so the streaming
     * path never realloc()s while meshing 40k tiles — one large malloc
     * is far cheaper than a dozen exponentially-growing ones. */
    R.mesh.vertex_cap = MAX_VERTICES;
    R.mesh.vertices = (hex_vertex_t*)malloc(R.mesh.vertex_cap * sizeof(hex_vertex_t));
    R.mesh.index_cap = MAX_INDICES;
    R.mesh.indices = (uint32_t*)malloc(R.mesh.index_cap * sizeof(uint32_t));
}

void renderer_shutdown(void) {
    hex_mesh_free(&R.mesh);
    free(SLICES); SLICES = NULL;
    sg_destroy_buffer(R.vbuf);
    sg_destroy_buffer(R.ibuf);
    sg_destroy_view(R.atlas_view);
    sg_destroy_image(R.atlas_img);
    sg_destroy_sampler(R.atlas_smp);
    sg_destroy_pipeline(R.pip_hex);
}

void renderer_begin_frame(int w, int h, render_env_t env) {
    (void)w; (void)h;
    R.env = env;
    R.tris = 0;
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

static void ensure_slices(world_t* w) {
    if (!SLICES) {
        SLICES = (tile_slice_t*)calloc((size_t)w->tile_count, sizeof(tile_slice_t));
    }
}

/* Append a single tile's geometry to the running mesh. Records its
 * offset/count so it can be rebuilt later for edits. */
static void append_tile_to_mesh(world_t* w, int tile_idx) {
    /* Remember where this tile starts in the merged buffers. */
    SLICES[tile_idx].vert_offset = (uint32_t)R.mesh.vertex_count;
    SLICES[tile_idx].idx_offset  = (uint32_t)R.mesh.index_count;

    /* Mesher appends relative indices starting from 0; we offset them
     * into the merged buffer by adding the current vertex count. */
    uint32_t base = (uint32_t)R.mesh.vertex_count;
    size_t idx_before = R.mesh.index_count;
    hex_mesh_build_tile(&R.mesh, w, tile_idx);
    /* Offset the indices just appended by `base`. The mesher writes
     * indices relative to its own vertex count delta, not 0, so the
     * vertices it appends are already indexed correctly from 0. */
    (void)base; (void)idx_before;

    SLICES[tile_idx].vert_count = (uint32_t)R.mesh.vertex_count - SLICES[tile_idx].vert_offset;
    SLICES[tile_idx].idx_count  = (uint32_t)R.mesh.index_count  - SLICES[tile_idx].idx_offset;
}

void renderer_draw_world(mat4_t view, mat4_t proj, world_t* world) {
    ensure_slices(world);

    /* Stream mesh: each frame, mesh some newly-generated tiles. Capped
     * so no single frame spends too long in the mesher. Only tiles
     * below gen_cursor have block data — skip the rest. */
    int budget = MESH_BUDGET_PER_FRAME;
    int pending_since_upload = R.mesh_cursor - R.last_uploaded_cursor;
    while (R.mesh_cursor < world->gen_cursor && budget > 0) {
        append_tile_to_mesh(world, R.mesh_cursor);
        R.mesh_cursor++;
        pending_since_upload++;
        budget--;
        R.tiles_remeshed++;
    }

    /* Upload cadence: while streaming, upload every ~4096 meshed tiles
     * so the world progressively appears instead of holding the whole
     * load behind one giant upload. Once streaming is complete, flush
     * once to guarantee the final tiles are visible. */
    const int UPLOAD_EVERY = 4096;
    bool time_to_upload =
        (pending_since_upload >= UPLOAD_EVERY) ||
        (R.mesh_cursor == world->tile_count &&
         R.last_uploaded_cursor < R.mesh_cursor);

    /* Edits: rebuild any dirty tile whose slice exists. For simplicity
     * (and scale — 40k tiles) we do a full rebuild of the merged mesh
     * when any post-init edit happens. Still bounded by the dirty set
     * which is usually small. */
    bool any_dirty_post_init = false;
    if (R.mesh_cursor >= world->tile_count) {
        for (int i = 0; i < world->tile_count; ++i) {
            if (world_tile_dirty(world, i)) { any_dirty_post_init = true; break; }
        }
    }
    if (any_dirty_post_init) {
        hex_mesh_reset(&R.mesh);
        for (int i = 0; i < world->tile_count; ++i) {
            append_tile_to_mesh(world, i);
            world_tile_clear_dirty(world, i);
        }
        time_to_upload = true;
        R.tiles_remeshed = (size_t)world->tile_count;
    }

    if (time_to_upload && R.mesh.vertex_count > 0) {
        sg_update_buffer(R.vbuf, &(sg_range){
            .ptr = R.mesh.vertices,
            .size = R.mesh.vertex_count * sizeof(hex_vertex_t),
        });
        sg_update_buffer(R.ibuf, &(sg_range){
            .ptr = R.mesh.indices,
            .size = R.mesh.index_count * sizeof(uint32_t),
        });
        R.last_uploaded_cursor = R.mesh_cursor;
        R.last_uploaded_index_count = (int)R.mesh.index_count;
    }

    /* Draw: one call for whatever was last uploaded to the GPU. The CPU
     * mesh may be ahead of that (tiles meshed this frame but not yet
     * uploaded); those tiles will appear on the next upload cycle. */
    if (R.last_uploaded_index_count == 0) return;
    sg_apply_pipeline(R.pip_hex);
    mat4_t vp = mat4_mul(proj, view);
    sg_apply_uniforms(0, &(sg_range){ .ptr = vp.m, .size = sizeof(vp.m) });
    float light_ub[8] = {
        R.env.sun_dir.x, R.env.sun_dir.y, R.env.sun_dir.z, 0.0f,
        R.env.ambient.x, R.env.ambient.y, R.env.ambient.z, 0.0f,
    };
    sg_apply_uniforms(1, &(sg_range){ .ptr = light_ub, .size = sizeof(light_ub) });
    sg_apply_bindings(&(sg_bindings){
        .vertex_buffers[0] = R.vbuf,
        .index_buffer      = R.ibuf,
        .views[0]          = R.atlas_view,
        .samplers[0]       = R.atlas_smp,
    });
    sg_draw(0, R.last_uploaded_index_count, 1);
    R.tris = (size_t)R.last_uploaded_index_count / 3;
}

void renderer_end_frame(void) {
    sg_end_pass();
    sg_commit();
}

size_t renderer_triangles_drawn_this_frame(void) { return R.tris; }
size_t renderer_tiles_drawn_this_frame(void)     { return R.tris > 0 ? (size_t)R.mesh_cursor : 0; }
size_t renderer_tiles_remeshed_this_frame(void)  { return R.tiles_remeshed; }
