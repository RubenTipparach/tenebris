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
/* Taller columns (WORLD_MAX_DEPTH=32) mean more side quads on
 * feature-boundary tiles, so the buffer cap is doubled. */
#define MAX_VERTICES           (4u << 20)    /* 4M verts cap (~128 MB) */
#define MAX_INDICES            (12u << 20)   /* 12M indices (~48 MB)   */

static struct {
    sg_pipeline pip_hex;
    sg_pipeline pip_water;     /* translucent, wave-animated cap layer */
    sg_image    atlas_img;
    sg_view     atlas_view;
    sg_sampler  atlas_smp;

    /* Opaque merged mesh. */
    sg_buffer   vbuf;
    sg_buffer   ibuf;
    hex_mesh_t  mesh;

    /* Water merged mesh (separate draw, blended on top of opaque). */
    sg_buffer   water_vbuf;
    sg_buffer   water_ibuf;
    hex_mesh_t  water_mesh;

    int         mesh_cursor;                 /* tiles meshed into CPU mesh so far */
    int         last_uploaded_cursor;        /* mesh_cursor value at the last GPU upload */
    int         last_uploaded_index_count;   /* opaque draw count */
    int         last_uploaded_water_idx_count;

    float       time_seconds;                /* for water wave animation */

    sg_pass_action pass_action;
    render_env_t   env;

    size_t tris;
    size_t tiles_remeshed;

    /* Static celestial bodies (moons + asteroids). Pre-meshed at
     * registration time, fixed in world space. 32 slots is enough for
     * our 6 moons + 10 asteroids with room for a few more. */
    struct {
        const world_t* world;
        sg_buffer      vbuf;
        sg_buffer      ibuf;
        int            index_count;
        vec3_t         position;
    } moons[32];
    int moon_count;
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

/* Procedural water shader. Uses 3D value-noise fBm so the pattern is
 * ISOTROPIC around the sphere — directional sum-of-sines (the earlier
 * version) gave visible axis-aligned stripes that rotated per tile on
 * curved surfaces. With 3D noise the waves look the same regardless
 * of what direction the water cap's normal points in.
 *
 * Surface normal comes from a three-sample finite-difference gradient
 * of the height field, projected onto the tangent plane. Lighting,
 * Fresnel, reflection and specular all react to the real surface
 * slope. Foam at wave crests + steep slopes.
 */
static const char* VS_WATER =
    "#version 300 es\n"
    "layout(location=0) in vec3 a_pos;\n"
    "layout(location=1) in vec3 a_normal;\n"
    "layout(location=2) in vec2 a_uv;\n"       /* unused; keeps vbuf layout compatible */
    "uniform mat4 u_vp;\n"
    "uniform float u_time;\n"
    "out vec3 v_wpos;\n"
    "out vec3 v_normal;\n"
    "void main() {\n"
    "  vec3 n = normalize(a_normal);\n"
    /* Three-octave swell — the vertex displacement. Keeps amplitude
     * small so water doesn't clip through shorelines. */
    "  float t = u_time;\n"
    "  float swell = 0.0;\n"
    "  swell += sin(t * 0.9 + a_pos.x * 1.4 + a_pos.z * 0.6) * 0.08;\n"
    "  swell += sin(t * 1.3 - a_pos.x * 0.7 + a_pos.z * 1.2) * 0.06;\n"
    "  swell += sin(t * 1.7 + a_pos.x * 2.3 - a_pos.z * 1.9) * 0.03;\n"
    "  vec3 p = a_pos + n * swell;\n"
    "  gl_Position = u_vp * vec4(p, 1.0);\n"
    "  v_wpos = p;\n"
    "  v_normal = n;\n"
    "}\n";

static const char* FS_WATER =
    "#version 300 es\n"
    "precision highp float;\n"
    "in vec3 v_wpos;\n"
    "in vec3 v_normal;\n"
    "uniform vec3 u_camera_pos;\n"
    "uniform vec3 u_sun_dir;\n"
    "uniform float u_time;\n"
    "out vec4 frag_color;\n"

    /* Cheap 3D hash. No textures, no large constants — a Dave_Hoskins-\n"
     * style scramble is good enough for interactive water. */
    "float h31(vec3 p) {\n"
    "  p = fract(p * vec3(443.897, 441.423, 437.195));\n"
    "  p += dot(p, p.yzx + 19.19);\n"
    "  return fract((p.x + p.y) * p.z);\n"
    "}\n"

    /* Trilinear value noise, smoothstep interpolant, [-1, 1]. */
    "float vnoise3(vec3 p) {\n"
    "  vec3 i = floor(p);\n"
    "  vec3 f = fract(p);\n"
    "  f = f * f * (3.0 - 2.0 * f);\n"
    "  float c000 = h31(i);                    float c100 = h31(i + vec3(1,0,0));\n"
    "  float c010 = h31(i + vec3(0,1,0));      float c110 = h31(i + vec3(1,1,0));\n"
    "  float c001 = h31(i + vec3(0,0,1));      float c101 = h31(i + vec3(1,0,1));\n"
    "  float c011 = h31(i + vec3(0,1,1));      float c111 = h31(i + vec3(1,1,1));\n"
    "  float mx0  = mix(mix(c000, c100, f.x), mix(c010, c110, f.x), f.y);\n"
    "  float mx1  = mix(mix(c001, c101, f.x), mix(c011, c111, f.x), f.y);\n"
    "  return mix(mx0, mx1, f.z) * 2.0 - 1.0;\n"
    "}\n"

    /* Three-octave fBm with per-octave time advection along different\n"
     * directions so the surface doesn't look like a single flow. */
    "float fbm3(vec3 p, float t) {\n"
    "  float h = 0.0;\n"
    "  vec3 q = p * 0.9 + vec3(t * 0.35, t * 0.18, -t * 0.42);\n"
    "  h += vnoise3(q) * 0.50;\n"
    "  q = q * 2.1 + vec3(-t * 0.22, t * 0.33, t * 0.17);\n"
    "  h += vnoise3(q) * 0.28;\n"
    "  q = q * 2.3 + vec3(t * 0.19, -t * 0.27, t * 0.11);\n"
    "  h += vnoise3(q) * 0.15;\n"
    "  return h;\n"
    "}\n"

    "void main() {\n"
    "  vec3 radial = normalize(v_normal);\n"

    /* Scalar height + 3-sample finite-difference world-space gradient.\n"
     * Epsilon is ~8 cm at water scale, small enough to stay inside the\n"
     * smallest noise cell and big enough to dodge numeric noise. */
    "  float h0 = fbm3(v_wpos, u_time);\n"
    "  float e  = 0.08;\n"
    "  vec3 grad = vec3(\n"
    "    fbm3(v_wpos + vec3(e,0,0), u_time) - h0,\n"
    "    fbm3(v_wpos + vec3(0,e,0), u_time) - h0,\n"
    "    fbm3(v_wpos + vec3(0,0,e), u_time) - h0) / e;\n"

    /* Tangent-plane gradient tilts the radial normal. */
    "  vec3 t_grad = grad - radial * dot(grad, radial);\n"
    "  vec3 n = normalize(radial - t_grad * 0.65);\n"

    "  vec3 view = normalize(u_camera_pos - v_wpos);\n"
    "  vec3 sun  = normalize(u_sun_dir);\n"

    "  float vdn = max(dot(view, n), 0.0);\n"
    "  float f   = 0.02 + 0.98 * pow(1.0 - vdn, 5.0);\n"

    "  vec3 shallow = vec3(0.28, 0.68, 0.82);\n"
    "  vec3 deep    = vec3(0.02, 0.10, 0.22);\n"
    "  vec3 base    = mix(deep, shallow, vdn);\n"

    "  vec3 refl   = reflect(-view, n);\n"
    "  float up_f  = clamp(dot(refl, radial), 0.0, 1.0);\n"
    "  vec3 sky    = mix(vec3(0.85, 0.92, 0.98), vec3(0.35, 0.55, 0.85), up_f);\n"

    "  vec3  halfv = normalize(view + sun);\n"
    "  float spec  = pow(max(dot(n, halfv), 0.0), 140.0);\n"
    "  vec3  sun_highlight = vec3(1.35, 1.25, 1.10) * spec * 2.0;\n"

    /* Foam from wave crest + slope. Height fBm now goes ~[-1, 1]; tune\n"
     * the smoothstep bands accordingly. */
    "  float steepness = length(t_grad);\n"
    "  float crest     = smoothstep(0.35, 0.60, h0);\n"
    "  float slope_f   = smoothstep(0.50, 1.20, steepness);\n"
    "  float foam      = max(crest * 0.55, slope_f * 0.45);\n"

    "  vec3 color = mix(base, sky, f) + sun_highlight;\n"
    "  color = mix(color, vec3(0.95, 0.97, 1.0), foam * 0.6);\n"
    "  float alpha = mix(0.70, 0.97, f);\n"
    "  frag_color = vec4(color, alpha);\n"
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

    /* Water pipeline — blends on top of opaque terrain. Depth test is
     * kept so underwater terrain doesn't clip through the surface, but
     * depth writes are disabled so overlapping water caps (e.g. at tile
     * seams after the wave displacement) don't punch holes in one
     * another. */
    sg_shader shd_water = sg_make_shader(&(sg_shader_desc){
        .vertex_func.source   = VS_WATER,
        .fragment_func.source = FS_WATER,
        .attrs = {
            [0].glsl_name = "a_pos",
            [1].glsl_name = "a_normal",
            [2].glsl_name = "a_uv",    /* declared for layout parity with the
                                         * shared vbuf; unused by the shader */
        },
        .uniform_blocks[0] = {
            .stage = SG_SHADERSTAGE_VERTEX,
            .size  = 20 * sizeof(float),   /* mat4(16) + float(1) + 3 pad */
            .layout = SG_UNIFORMLAYOUT_STD140,
            .glsl_uniforms[0] = { .glsl_name = "u_vp",   .type = SG_UNIFORMTYPE_MAT4 },
            .glsl_uniforms[1] = { .glsl_name = "u_time", .type = SG_UNIFORMTYPE_FLOAT },
        },
        .uniform_blocks[1] = {
            .stage = SG_SHADERSTAGE_FRAGMENT,
            .size  = 12 * sizeof(float),   /* vec3 + pad + vec3 + pad + float + pad */
            .layout = SG_UNIFORMLAYOUT_STD140,
            .glsl_uniforms[0] = { .glsl_name = "u_camera_pos", .type = SG_UNIFORMTYPE_FLOAT3 },
            .glsl_uniforms[1] = { .glsl_name = "u_sun_dir",    .type = SG_UNIFORMTYPE_FLOAT3 },
            .glsl_uniforms[2] = { .glsl_name = "u_time",       .type = SG_UNIFORMTYPE_FLOAT },
        },
        .label = "water-shader",
    });
    R.pip_water = sg_make_pipeline(&(sg_pipeline_desc){
        .shader = shd_water,
        .layout = {
            .attrs = {
                [0] = { .format = SG_VERTEXFORMAT_FLOAT3 },
                [1] = { .format = SG_VERTEXFORMAT_FLOAT3 },
                [2] = { .format = SG_VERTEXFORMAT_FLOAT2 },
            },
            .buffers[0].stride = sizeof(hex_vertex_t),
        },
        .index_type = SG_INDEXTYPE_UINT32,
        .depth = { .write_enabled = false, .compare = SG_COMPAREFUNC_LESS_EQUAL },
        .cull_mode = SG_CULLMODE_BACK,
        .face_winding = SG_FACEWINDING_CCW,
        .colors[0].blend = {
            .enabled = true,
            .src_factor_rgb = SG_BLENDFACTOR_SRC_ALPHA,
            .dst_factor_rgb = SG_BLENDFACTOR_ONE_MINUS_SRC_ALPHA,
            .src_factor_alpha = SG_BLENDFACTOR_ONE,
            .dst_factor_alpha = SG_BLENDFACTOR_ONE,
        },
        .label = "water-pipeline",
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

    /* Water: one cap per ocean tile, so at most tile_count = 40962
     * caps. Budget 512 K verts / 1.5 M indices — well clear. */
    const size_t WATER_VCAP = 512u << 10;
    const size_t WATER_ICAP = (512u << 10) * 3;
    R.water_vbuf = sg_make_buffer(&(sg_buffer_desc){
        .size = WATER_VCAP * sizeof(hex_vertex_t),
        .usage.stream_update = true,
        .label = "water-vbuf",
    });
    R.water_ibuf = sg_make_buffer(&(sg_buffer_desc){
        .size = WATER_ICAP * sizeof(uint32_t),
        .usage.stream_update = true,
        .usage.index_buffer  = true,
        .label = "water-ibuf",
    });

    bake_atlas();
    hex_mesh_init(&R.mesh);
    hex_mesh_init(&R.water_mesh);
    /* Pre-allocate both CPU meshes so streaming doesn't realloc. */
    R.mesh.vertex_cap = MAX_VERTICES;
    R.mesh.vertices = (hex_vertex_t*)malloc(R.mesh.vertex_cap * sizeof(hex_vertex_t));
    R.mesh.index_cap = MAX_INDICES;
    R.mesh.indices = (uint32_t*)malloc(R.mesh.index_cap * sizeof(uint32_t));
    R.water_mesh.vertex_cap = WATER_VCAP;
    R.water_mesh.vertices = (hex_vertex_t*)malloc(R.water_mesh.vertex_cap * sizeof(hex_vertex_t));
    R.water_mesh.index_cap = WATER_ICAP;
    R.water_mesh.indices = (uint32_t*)malloc(R.water_mesh.index_cap * sizeof(uint32_t));
}

void renderer_shutdown(void) {
    hex_mesh_free(&R.mesh);
    hex_mesh_free(&R.water_mesh);
    free(SLICES); SLICES = NULL;
    for (int i = 0; i < R.moon_count; ++i) {
        sg_destroy_buffer(R.moons[i].vbuf);
        sg_destroy_buffer(R.moons[i].ibuf);
    }
    sg_destroy_buffer(R.vbuf);
    sg_destroy_buffer(R.ibuf);
    sg_destroy_buffer(R.water_vbuf);
    sg_destroy_buffer(R.water_ibuf);
    sg_destroy_view(R.atlas_view);
    sg_destroy_image(R.atlas_img);
    sg_destroy_sampler(R.atlas_smp);
    sg_destroy_pipeline(R.pip_hex);
    sg_destroy_pipeline(R.pip_water);
}

/* ----------------------------------------------------------------------- */
/* Moon registration — one-shot mesh + upload at registration time. */

void renderer_register_moon(world_t* w) {
    if (R.moon_count >= (int)(sizeof(R.moons) / sizeof(R.moons[0]))) return;
    if (!w || !w->body) return;

    /* Build the full merged mesh for this moon into a scratch instance.
     * Moon tile counts are small (≤2562) so this runs in a few ms at
     * init; no streaming is needed. */
    hex_mesh_t m;
    hex_mesh_init(&m);
    /* Reasonable upper bound: 64 verts per tile is conservative for a
     * mostly-flat moon. */
    m.vertex_cap = (size_t)w->tile_count * 64u;
    m.vertices = (hex_vertex_t*)malloc(m.vertex_cap * sizeof(hex_vertex_t));
    m.index_cap = (size_t)w->tile_count * 128u;
    m.indices = (uint32_t*)malloc(m.index_cap * sizeof(uint32_t));

    for (int i = 0; i < w->tile_count; ++i) {
        hex_mesh_build_tile(&m, w, i);
    }

    int slot = R.moon_count++;
    R.moons[slot].world = w;
    R.moons[slot].index_count = (int)m.index_count;
    R.moons[slot].position = (vec3_t){
        (float)w->body->pos_x, (float)w->body->pos_y, (float)w->body->pos_z
    };
    R.moons[slot].vbuf = sg_make_buffer(&(sg_buffer_desc){
        .data = { .ptr = m.vertices, .size = m.vertex_count * sizeof(hex_vertex_t) },
        .label = "moon-vbuf",
    });
    R.moons[slot].ibuf = sg_make_buffer(&(sg_buffer_desc){
        .usage.index_buffer = true,
        .data = { .ptr = m.indices, .size = m.index_count * sizeof(uint32_t) },
        .label = "moon-ibuf",
    });

    hex_mesh_free(&m);
}

int renderer_moon_count(void) { return R.moon_count; }

void renderer_draw_moons(mat4_t view, mat4_t proj) {
    if (R.moon_count == 0) return;
    sg_apply_pipeline(R.pip_hex);

    mat4_t vp_base = mat4_mul(proj, view);
    float light_ub[8] = {
        R.env.sun_dir.x, R.env.sun_dir.y, R.env.sun_dir.z, 0.0f,
        R.env.ambient.x, R.env.ambient.y, R.env.ambient.z, 0.0f,
    };

    for (int i = 0; i < R.moon_count; ++i) {
        /* MVP = vp * translate(moon_position). Moon verts are in their
         * own body-local frame so adding the world offset here places
         * them correctly. */
        mat4_t model = mat4_translate(R.moons[i].position);
        mat4_t mvp   = mat4_mul(vp_base, model);
        sg_apply_uniforms(0, &(sg_range){ .ptr = mvp.m, .size = sizeof(mvp.m) });
        sg_apply_uniforms(1, &(sg_range){ .ptr = light_ub, .size = sizeof(light_ub) });
        sg_apply_bindings(&(sg_bindings){
            .vertex_buffers[0] = R.moons[i].vbuf,
            .index_buffer      = R.moons[i].ibuf,
            .views[0]          = R.atlas_view,
            .samplers[0]       = R.atlas_smp,
        });
        sg_draw(0, R.moons[i].index_count, 1);
        R.tris += (size_t)R.moons[i].index_count / 3;
    }
}

/* ----------------------------------------------------------------------- */

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

void renderer_draw_world(mat4_t view, mat4_t proj, world_t* world,
                         vec3_t camera_world, float dt_seconds) {
    ensure_slices(world);
    R.time_seconds += dt_seconds;

    /* Stream mesh: each frame, mesh some newly-generated tiles. Capped
     * so no single frame spends too long in the mesher. Only tiles
     * below gen_cursor have block data — skip the rest. Builds both
     * opaque terrain and the water cap in one pass. */
    int budget = MESH_BUDGET_PER_FRAME;
    int pending_since_upload = R.mesh_cursor - R.last_uploaded_cursor;
    while (R.mesh_cursor < world->gen_cursor && budget > 0) {
        append_tile_to_mesh(world, R.mesh_cursor);
        hex_mesh_build_water(&R.water_mesh, world, R.mesh_cursor);
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
        hex_mesh_reset(&R.water_mesh);
        for (int i = 0; i < world->tile_count; ++i) {
            append_tile_to_mesh(world, i);
            hex_mesh_build_water(&R.water_mesh, world, i);
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
        if (R.water_mesh.vertex_count > 0) {
            sg_update_buffer(R.water_vbuf, &(sg_range){
                .ptr = R.water_mesh.vertices,
                .size = R.water_mesh.vertex_count * sizeof(hex_vertex_t),
            });
            sg_update_buffer(R.water_ibuf, &(sg_range){
                .ptr = R.water_mesh.indices,
                .size = R.water_mesh.index_count * sizeof(uint32_t),
            });
            R.last_uploaded_water_idx_count = (int)R.water_mesh.index_count;
        } else {
            R.last_uploaded_water_idx_count = 0;
        }
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

    /* Water pass — blended on top of the opaque terrain. Procedural
     * shader; no atlas binding. */
    if (R.last_uploaded_water_idx_count > 0) {
        sg_apply_pipeline(R.pip_water);
        /* Vertex UB: mat4 u_vp (0..63), float u_time (64..67), 3-float pad. */
        float ub_v[20];
        memcpy(ub_v, vp.m, sizeof(vp.m));
        ub_v[16] = R.time_seconds;
        ub_v[17] = 0.0f; ub_v[18] = 0.0f; ub_v[19] = 0.0f;
        sg_apply_uniforms(0, &(sg_range){ .ptr = ub_v, .size = sizeof(ub_v) });

        /* Fragment UB: vec3 u_camera_pos + pad + vec3 u_sun_dir + pad +
         * float u_time + 3-float pad (std140 → 48 bytes / 12 floats). */
        float ub_f[12] = { 0 };
        ub_f[0] = camera_world.x;  ub_f[1] = camera_world.y;  ub_f[2] = camera_world.z;
        ub_f[4] = R.env.sun_dir.x; ub_f[5] = R.env.sun_dir.y; ub_f[6] = R.env.sun_dir.z;
        ub_f[8] = R.time_seconds;
        sg_apply_uniforms(1, &(sg_range){ .ptr = ub_f, .size = sizeof(ub_f) });

        sg_apply_bindings(&(sg_bindings){
            .vertex_buffers[0] = R.water_vbuf,
            .index_buffer      = R.water_ibuf,
        });
        sg_draw(0, R.last_uploaded_water_idx_count, 1);
        R.tris += (size_t)R.last_uploaded_water_idx_count / 3;
    }
}

void renderer_end_frame(void) {
    sg_end_pass();
    sg_commit();
}

size_t renderer_triangles_drawn_this_frame(void) { return R.tris; }
size_t renderer_tiles_drawn_this_frame(void)     { return R.tris > 0 ? (size_t)R.mesh_cursor : 0; }
size_t renderer_tiles_remeshed_this_frame(void)  { return R.tiles_remeshed; }
