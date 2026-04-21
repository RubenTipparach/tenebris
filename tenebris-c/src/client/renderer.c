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
/* Per-chunk GPU resources. Kept in a small array keyed by (cx, cz).
 */
typedef struct {
    int32_t  cx, cz;
    sg_buffer vbuf;
    sg_buffer ibuf;
    int       index_count;
    bool      live;
} chunk_gpu_t;

#define MAX_CHUNK_GPU  256

/* ----------------------------------------------------------------------- */

static struct {
    sg_pipeline  pip_world;
    sg_pipeline  pip_outline;

    sg_image     atlas_img;
    sg_sampler   atlas_smp;

    sg_pass_action pass_action;

    chunk_gpu_t  chunks[MAX_CHUNK_GPU];

    /* Outline cube mesh (unit cube wireframe, 12 lines). */
    sg_buffer    outline_vbuf;

    render_env_t env;

    size_t chunks_drawn;
    size_t chunks_remeshed_this_frame;
    int    budget_remeshes_per_frame;

    /* Scratch mesher — one instance re-used across chunks. */
    vox_mesh_t mesher;
} R;

/* ----------------------------------------------------------------------- */
/* Shaders. Inline GLSL ES 3.00 for WebGL2 / GLES3.
 */
static const char* VS_WORLD =
    "#version 300 es\n"
    "layout(location=0) in vec3 a_pos;\n"
    "layout(location=1) in vec2 a_uv;\n"
    "layout(location=2) in float a_normal_id;\n"
    "uniform mat4 u_vp;\n"
    "out vec2 v_uv;\n"
    "out float v_light;\n"
    "void main() {\n"
    "  gl_Position = u_vp * vec4(a_pos, 1.0);\n"
    "  v_uv = a_uv;\n"
    /* Baked AO/lighting per face id (0=+X,1=-X,2=+Y,3=-Y,4=+Z,5=-Z). Top is\n"
     * brightest, bottom is darkest, sides are mid. Matches the look of the\n"
     * Three.js MeshLambertMaterial + sun term without shipping real shadows.\n"
     */
    "  float l;\n"
    "  int nid = int(a_normal_id + 0.5);\n"
    "  if      (nid == 2) l = 1.00;\n"
    "  else if (nid == 3) l = 0.45;\n"
    "  else if (nid == 0 || nid == 1) l = 0.78;\n"
    "  else l = 0.90;\n"
    "  v_light = l;\n"
    "}\n";

static const char* FS_WORLD =
    "#version 300 es\n"
    "precision highp float;\n"
    "in vec2 v_uv;\n"
    "in float v_light;\n"
    "uniform sampler2D u_tex;\n"
    "uniform vec3 u_ambient;\n"
    "out vec4 frag_color;\n"
    "void main() {\n"
    "  vec4 c = texture(u_tex, v_uv);\n"
    "  vec3 lit = c.rgb * (vec3(v_light) + u_ambient);\n"
    "  frag_color = vec4(lit, c.a);\n"
    "}\n";

static const char* VS_OUTLINE =
    "#version 300 es\n"
    "layout(location=0) in vec3 a_pos;\n"
    "uniform mat4 u_mvp;\n"
    "void main() { gl_Position = u_mvp * vec4(a_pos, 1.0); }\n";

static const char* FS_OUTLINE =
    "#version 300 es\n"
    "precision highp float;\n"
    "out vec4 frag_color;\n"
    "void main() { frag_color = vec4(0.0, 0.0, 0.0, 1.0); }\n";

/* ----------------------------------------------------------------------- */
/* Atlas construction. Loads public/textures/{wall,floor,ceiling}.png via
 * stb_image, packs them into a 4x3 tile atlas, uploads as one sg_image.
 *
 * Row 0 = top, row 1 = bottom, row 2 = side.
 * Col 0 = AIR (empty), col 1 = STONE, col 2 = DIRT, col 3 = GRASS.
 */
#define TILE_PX 16

static void bake_atlas(void) {
    /* Tier 1 block palette -> PNGs staged by scripts/build-wasm.sh. */
    const char* stone      = "assets/textures/stone.png";
    const char* dirt       = "assets/textures/dirt.png";
    const char* grass_top  = "assets/textures/grass_top.png";
    const char* grass_side = "assets/textures/grass_side.png";

    const int W = TILE_PX * 4;
    const int H = TILE_PX * 3;

    unsigned char* atlas = (unsigned char*)calloc((size_t)(W * H * 4), 1);

    struct slot_s { int col; int row; const char* path; };
    struct slot_s slots[] = {
        { 1, 0, stone      }, { 1, 1, stone }, { 1, 2, stone      },   /* STONE */
        { 2, 0, dirt       }, { 2, 1, dirt  }, { 2, 2, dirt       },   /* DIRT  */
        { 3, 0, grass_top  }, { 3, 1, dirt  }, { 3, 2, grass_side },   /* GRASS */
    };

    for (size_t i = 0; i < sizeof(slots) / sizeof(slots[0]); ++i) {
        int tw, th, tc;
        unsigned char* pix = stbi_load(slots[i].path, &tw, &th, &tc, 4);
        if (!pix) continue;
        /* Nearest-neighbor resample to TILE_PX if needed. */
        for (int y = 0; y < TILE_PX; ++y) {
            int sy = y * th / TILE_PX;
            for (int x = 0; x < TILE_PX; ++x) {
                int sx = x * tw / TILE_PX;
                int dst_x = slots[i].col * TILE_PX + x;
                int dst_y = slots[i].row * TILE_PX + y;
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
        .label = "atlas",
    });

    R.atlas_smp = sg_make_sampler(&(sg_sampler_desc){
        .min_filter = SG_FILTER_NEAREST,
        .mag_filter = SG_FILTER_NEAREST,
        .wrap_u = SG_WRAP_CLAMP_TO_EDGE,
        .wrap_v = SG_WRAP_CLAMP_TO_EDGE,
        .label = "atlas-sampler",
    });

    free(atlas);
}

/* ----------------------------------------------------------------------- */
/* Unit-cube wireframe buffer for the targeted-block outline. 12 edges =
 * 24 vertices in line-list mode. Vertices are in [0, 1] cube space; the
 * uniform translates them to world space.
 */
static void build_outline_mesh(void) {
    static const float E[] = {
        /* bottom */
        0,0,0, 1,0,0,   1,0,0, 1,0,1,   1,0,1, 0,0,1,   0,0,1, 0,0,0,
        /* top */
        0,1,0, 1,1,0,   1,1,0, 1,1,1,   1,1,1, 0,1,1,   0,1,1, 0,1,0,
        /* sides */
        0,0,0, 0,1,0,   1,0,0, 1,1,0,   1,0,1, 1,1,1,   0,0,1, 0,1,1,
    };
    R.outline_vbuf = sg_make_buffer(&(sg_buffer_desc){
        .data = { .ptr = E, .size = sizeof(E) },
        .label = "outline-vbuf",
    });
}

/* ----------------------------------------------------------------------- */

void renderer_init(void) {
    memset(&R, 0, sizeof(R));
    R.budget_remeshes_per_frame = 4;

    mesher_init(&R.mesher);

    /* World pipeline. */
    sg_shader shd_world = sg_make_shader(&(sg_shader_desc){
        .vertex_func.source   = VS_WORLD,
        .fragment_func.source = FS_WORLD,
        .attrs = {
            [0].glsl_name = "a_pos",
            [1].glsl_name = "a_uv",
            [2].glsl_name = "a_normal_id",
        },
        .uniform_blocks[0] = {
            .stage = SG_SHADERSTAGE_VERTEX,
            .size  = 16 * sizeof(float),
            .layout = SG_UNIFORMLAYOUT_STD140,
            .glsl_uniforms[0] = { .glsl_name = "u_vp", .type = SG_UNIFORMTYPE_MAT4 },
        },
        .uniform_blocks[1] = {
            .stage = SG_SHADERSTAGE_FRAGMENT,
            .size  = 4 * sizeof(float),
            .layout = SG_UNIFORMLAYOUT_STD140,
            .glsl_uniforms[0] = { .glsl_name = "u_ambient", .type = SG_UNIFORMTYPE_FLOAT3 },
        },
        .textures[0] = { .stage = SG_SHADERSTAGE_FRAGMENT, .image_type = SG_IMAGETYPE_2D,
                         .sample_type = SG_IMAGESAMPLETYPE_FLOAT },
        .samplers[0] = { .stage = SG_SHADERSTAGE_FRAGMENT, .sampler_type = SG_SAMPLERTYPE_FILTERING },
        .texture_sampler_pairs[0] = { .stage = SG_SHADERSTAGE_FRAGMENT,
                                      .texture_slot = 0, .sampler_slot = 0, .glsl_name = "u_tex" },
        .label = "world-shader",
    });

    R.pip_world = sg_make_pipeline(&(sg_pipeline_desc){
        .shader = shd_world,
        .layout = {
            .attrs = {
                [0] = { .format = SG_VERTEXFORMAT_FLOAT3 },
                [1] = { .format = SG_VERTEXFORMAT_FLOAT2 },
                [2] = { .format = SG_VERTEXFORMAT_UBYTE4N },   /* normal_id in .r */
            },
            .buffers[0].stride = sizeof(vox_vertex_t),
        },
        .index_type = SG_INDEXTYPE_UINT32,
        .depth = { .write_enabled = true, .compare = SG_COMPAREFUNC_LESS_EQUAL },
        .cull_mode = SG_CULLMODE_BACK,
        .face_winding = SG_FACEWINDING_CCW,
        .label = "world-pipeline",
    });

    /* Outline pipeline: line list, no cull, depth test but no depth write. */
    sg_shader shd_outline = sg_make_shader(&(sg_shader_desc){
        .vertex_func.source   = VS_OUTLINE,
        .fragment_func.source = FS_OUTLINE,
        .attrs = { [0].glsl_name = "a_pos" },
        .uniform_blocks[0] = {
            .stage = SG_SHADERSTAGE_VERTEX,
            .size  = 16 * sizeof(float),
            .layout = SG_UNIFORMLAYOUT_STD140,
            .glsl_uniforms[0] = { .glsl_name = "u_mvp", .type = SG_UNIFORMTYPE_MAT4 },
        },
        .label = "outline-shader",
    });
    R.pip_outline = sg_make_pipeline(&(sg_pipeline_desc){
        .shader = shd_outline,
        .primitive_type = SG_PRIMITIVETYPE_LINES,
        .layout = {
            .attrs = { [0] = { .format = SG_VERTEXFORMAT_FLOAT3 } },
            .buffers[0].stride = 3 * sizeof(float),
        },
        /* Outline draws on top of the block face to avoid z-fighting. */
        .depth = { .write_enabled = false, .compare = SG_COMPAREFUNC_ALWAYS },
        .cull_mode = SG_CULLMODE_NONE,
        .label = "outline-pipeline",
    });

    bake_atlas();
    build_outline_mesh();
}

void renderer_shutdown(void) {
    mesher_free(&R.mesher);
    for (int i = 0; i < MAX_CHUNK_GPU; ++i) {
        if (R.chunks[i].live) {
            sg_destroy_buffer(R.chunks[i].vbuf);
            sg_destroy_buffer(R.chunks[i].ibuf);
            R.chunks[i].live = false;
        }
    }
    sg_destroy_buffer(R.outline_vbuf);
    sg_destroy_image(R.atlas_img);
    sg_destroy_sampler(R.atlas_smp);
    sg_destroy_pipeline(R.pip_world);
    sg_destroy_pipeline(R.pip_outline);
}

/* ----------------------------------------------------------------------- */

static chunk_gpu_t* find_or_alloc_gpu(int32_t cx, int32_t cz) {
    chunk_gpu_t* empty = NULL;
    for (int i = 0; i < MAX_CHUNK_GPU; ++i) {
        chunk_gpu_t* g = &R.chunks[i];
        if (g->live && g->cx == cx && g->cz == cz) return g;
        if (!g->live && !empty) empty = g;
    }
    return empty;
}

static void free_gpu(chunk_gpu_t* g) {
    if (!g->live) return;
    sg_destroy_buffer(g->vbuf);
    sg_destroy_buffer(g->ibuf);
    g->live = false;
    g->index_count = 0;
}

static void upload_chunk_mesh(chunk_gpu_t* g, const vox_mesh_t* m) {
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
        .data = { .ptr = m->vertices, .size = m->vertex_count * sizeof(vox_vertex_t) },
        .label = "chunk-vbuf",
    });
    g->ibuf = sg_make_buffer(&(sg_buffer_desc){
        .usage.index_buffer = true,
        .data = { .ptr = m->indices, .size = m->index_count * sizeof(uint32_t) },
        .label = "chunk-ibuf",
    });
    g->index_count = (int)m->index_count;
    g->live = true;
}

/* ----------------------------------------------------------------------- */

void renderer_begin_frame(int w, int h, render_env_t env) {
    (void)w; (void)h;
    R.env = env;
    R.chunks_drawn = 0;
    R.chunks_remeshed_this_frame = 0;

    R.pass_action = (sg_pass_action){
        .colors[0] = {
            .load_action = SG_LOADACTION_CLEAR,
            .clear_value = { env.sky_bottom.x, env.sky_bottom.y, env.sky_bottom.z, 1.0f },
        },
        .depth = { .load_action = SG_LOADACTION_CLEAR, .clear_value = 1.0f },
    };

    sg_begin_pass(&(sg_pass){ .action = R.pass_action, .swapchain = sglue_swapchain() });
}

void renderer_draw_world(mat4_t view, mat4_t proj, world_t* world, int render_radius,
                         int player_cx, int player_cz) {
    /* Stream: evict gpu-resident chunks outside the render radius. */
    for (int i = 0; i < MAX_CHUNK_GPU; ++i) {
        chunk_gpu_t* g = &R.chunks[i];
        if (!g->live) continue;
        int dx = g->cx - player_cx;
        int dz = g->cz - player_cz;
        if (dx < -render_radius - 1 || dx > render_radius + 1 ||
            dz < -render_radius - 1 || dz > render_radius + 1) {
            free_gpu(g);
        }
    }

    /* Ensure nearby chunks exist in the world, and remesh dirty ones. */
    int remeshed = 0;
    for (int dz = -render_radius; dz <= render_radius && remeshed < R.budget_remeshes_per_frame; ++dz) {
        for (int dx = -render_radius; dx <= render_radius && remeshed < R.budget_remeshes_per_frame; ++dx) {
            int32_t cx = player_cx + dx;
            int32_t cz = player_cz + dz;
            chunk_t* c = world_ensure_chunk(world, cx, cz);
            chunk_gpu_t* g = find_or_alloc_gpu(cx, cz);
            if (!g) continue;
            if (g->live && !c->dirty) continue;

            mesher_reset(&R.mesher);
            mesher_build_chunk(&R.mesher, world, c);
            g->cx = cx;
            g->cz = cz;
            upload_chunk_mesh(g, &R.mesher);
            c->dirty = false;
            remeshed++;
        }
    }
    R.chunks_remeshed_this_frame = (size_t)remeshed;

    /* Draw every live GPU chunk. */
    sg_apply_pipeline(R.pip_world);

    mat4_t vp = mat4_mul(proj, view);
    sg_range vp_range = { .ptr = vp.m, .size = sizeof(vp.m) };
    sg_apply_uniforms(0, &vp_range);

    float ambient[4] = { R.env.ambient.x, R.env.ambient.y, R.env.ambient.z, 0.0f };
    sg_range amb_range = { .ptr = ambient, .size = sizeof(ambient) };
    sg_apply_uniforms(1, &amb_range);

    for (int i = 0; i < MAX_CHUNK_GPU; ++i) {
        chunk_gpu_t* g = &R.chunks[i];
        if (!g->live || g->index_count == 0) continue;

        sg_bindings b = {
            .vertex_buffers[0] = g->vbuf,
            .index_buffer      = g->ibuf,
            .textures[0]       = R.atlas_img,
            .samplers[0]       = R.atlas_smp,
        };
        sg_apply_bindings(&b);
        sg_draw(0, g->index_count, 1);
        R.chunks_drawn++;
    }
}

void renderer_draw_outline(mat4_t view, mat4_t proj, ivec3_t block) {
    sg_apply_pipeline(R.pip_outline);
    mat4_t model = mat4_translate((vec3_t){ (float)block.x, (float)block.y, (float)block.z });
    mat4_t mvp   = mat4_mul(mat4_mul(proj, view), model);
    sg_range r = { .ptr = mvp.m, .size = sizeof(mvp.m) };
    sg_apply_uniforms(0, &r);
    sg_bindings b = { .vertex_buffers[0] = R.outline_vbuf };
    sg_apply_bindings(&b);
    sg_draw(0, 24, 1);
}

void renderer_end_frame(void) {
    sg_end_pass();
    sg_commit();
}

size_t renderer_chunks_drawn(void) { return R.chunks_drawn; }
size_t renderer_chunks_remeshed_this_frame(void) { return R.chunks_remeshed_this_frame; }
