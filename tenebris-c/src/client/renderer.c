#include "client/renderer.h"
#include "client/hex_mesher.h"
#include "core/blocks.h"
#include "core/config.h"
#include "core/goldberg.h"

#include "sokol_gfx.h"
#include "sokol_app.h"
#include "sokol_glue.h"
#include "sokol_log.h"

#define STB_IMAGE_IMPLEMENTATION
#include "stb_image.h"

#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <stdio.h>
#include <limits.h>

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

/* 2048 tiles/frame finishes Tenebris (40 962 tiles) in ~20 frames
 * (~330 ms) — a single beat of "loading…" rather than the previous
 * 1.3 s wait. WASM single-threaded mesh time stays under the 16 ms
 * frame budget at this rate. */
#define MESH_BUDGET_PER_FRAME  2048
/* Per-chunk vertex / index caps. WORLD_MAX_DEPTH=128 means a single
 * mountain column can emit ~30 verts × ~30 exposed layers = ~900 verts
 * for one tile. With 1300 tiles per chunk a hill-heavy region can
 * easily breach the previous 256 K cap → silent sg_update_buffer
 * failure → the chunk's GPU buffer keeps stale contents (or none),
 * which is exactly the "terrain under my feet doesn't render" bug:
 * the chunk under the player overflowed.
 *
 * Now we start with smaller initial caps (32 K verts ≈ 25 verts/tile
 * average) and grow dynamically — chunk_upload_dynamic destroys and
 * re-creates the GPU buffer at 2× when the CPU mesh outgrows it. So
 * memory tracks actual content rather than worst-case. */
#define INIT_VERTICES         (32u  << 10)
#define INIT_INDICES          (96u  << 10)
#define INIT_WATER_VERTICES   (8u   << 10)
#define INIT_WATER_INDICES    (24u  << 10)

/* Number of mesh chunks the planet is split into. Anchors are the 12
 * icosahedron vertices + 20 face centres → 32 well-spread sphere points.
 * Each tile is assigned to its nearest anchor, giving roughly equal
 * partitions of ~1300 tiles per chunk at subs=6 (40 962 tiles total).
 *
 * Block edits dirty only the chunks containing edited tiles, so a single
 * mine/place rebuild touches ≤ 1300 tiles instead of the whole 40 K.
 * With one draw call per chunk we trade ~32 binds per frame for ~30×
 * faster terrain edits — a clear win on modern GPUs. */
#define CHUNK_COUNT  32

/* Per-chunk mesh state. Each chunk owns its own GPU buffer pair so a
 * dirty chunk can be re-uploaded in isolation. The *_capacity fields
 * track the *current* GPU buffer sizes (in element slots) so we can
 * detect when the CPU mesh has outgrown them and re-create the GPU
 * buffer at a larger size. */
typedef struct {
    sg_buffer  vbuf;
    sg_buffer  ibuf;
    sg_buffer  water_vbuf;
    sg_buffer  water_ibuf;
    int        vbuf_capacity;       /* hex_vertex_t slots */
    int        ibuf_capacity;       /* uint32_t slots     */
    int        water_vbuf_capacity;
    int        water_ibuf_capacity;
    hex_mesh_t mesh;
    hex_mesh_t water_mesh;
    int        last_uploaded_index_count;
    int        last_uploaded_water_idx_count;
    bool       dirty;          /* tiles inside this chunk need rebuild */
    bool       streamed;       /* all owned tiles have been meshed once */
} mesh_chunk_t;

/* A whole celestial body (Tenebris, a moon, an asteroid, …). Every
 * body shares the same 32-chunk layout — that's the unification the
 * "all planets must follow the same chunking rules to optimize block
 * voxel modification" requirement asks for. Block edits dirty only
 * the affected chunk(s) regardless of which body the player is on.
 *
 * Difference between active and inactive bodies:
 *   active   = streams in proximity-sorted batches over many frames,
 *              respects edit dirties.
 *   inactive = fully meshed in one shot at register time (these bodies
 *              are typically far away and aren't being edited every
 *              frame; if the player teleports they become active).
 *
 * Either way the rendering path is identical — N chunked draw calls
 * with a model translate to body world_pos. */
typedef struct {
    world_t*     world;
    mesh_chunk_t chunks[CHUNK_COUNT];
    int*         tile_to_chunk;          /* tile_idx -> chunk index */
    int          mesh_cursor;            /* tiles meshed so far     */
    bool         streamed_complete;
    bool         is_active;              /* receives streaming + edit handling */
    bool         has_water;              /* draw the water cap pass */
    /* Lazy-load state. Inactive bodies skip GPU buffer allocation +
     * meshing at register time and only do the work when the player
     * gets within LOD-detail range. The icosphere distant LOD covers
     * everything farther away, so the moon belt doesn't burn buffer
     * slots until you're actually flying near a body. */
    bool         chunks_allocated;       /* GPU buffers exist        */
    bool         meshed;                 /* chunks have content + uploaded */
    vec3_t       world_pos;              /* model-translate origin (body centre) */
    float        radius_m;
    vec3_t       distant_color;          /* fallback when terrain colour sample misses */
    /* Per-body distant LOD: subdivided icosphere with vertex colours
     * sampled from this body's terrain at register time. Replaces the
     * shared 20-tri flat-shaded sphere — that one looked identical for
     * every body so a green sister-planet and a red Mars-like one
     * showed up as the same featureless coloured ball. */
    sg_buffer    distant_vbuf;
    sg_buffer    distant_ibuf;
    int          distant_index_count;
} chunked_body_t;

static struct {
    sg_pipeline pip_hex;
    sg_pipeline pip_water;     /* translucent, wave-animated cap layer */
    sg_pipeline pip_sky;       /* fullscreen atmosphere + starfield     */
    sg_pipeline pip_distant;   /* subdivided icosphere w/ vertex colours (far LOD) */
    sg_pipeline pip_sun;       /* emissive sun sphere                   */
    /* Average RGB of each atlas column, computed once at bake_atlas
     * time. Indexed by the atlas-column number returned by
     * block_face_tile(block, FACE_CAP_TOP) — gives a colour summary
     * of every block's top face that the distant LOD samples per
     * vertex to colour the body to roughly match its surface. */
    vec3_t      atlas_col_avg[HEX_ATLAS_TILES];
    /* Smooth UV sphere — used by the sun (front-face emissive). */
    sg_buffer   uvsphere_vbuf;
    sg_buffer   uvsphere_ibuf;
    int         uvsphere_index_count;
    sg_image    atlas_img;
    sg_view     atlas_view;
    sg_sampler  atlas_smp;

    /* All celestial bodies — Tenebris, every moon, every asteroid.
     * The active body (the one whose world_t backs the player's
     * physics + edits) gets streaming + dirty-rebuild treatment;
     * everyone else is one-shot meshed at register time. The first
     * registered body is the active one by default; can be re-routed
     * via renderer_set_active_world. */
    chunked_body_t bodies[32];
    int            body_count;
    int            active_body_idx;      /* -1 until something is registered */

    float       time_seconds;            /* for water wave animation */

    sg_pass_action pass_action;
    render_env_t   env;

    size_t tris;
    size_t tiles_remeshed;
} R;

/* Forward declarations — body_alloc_chunks / body_full_mesh /
 * chunk_upload sit far below in the file but are called from
 * renderer_register_world / renderer_set_active_world which are
 * declared earlier in the public API order. */
static void body_alloc_chunks(chunked_body_t* body);
static void body_full_mesh(chunked_body_t* body);
static void body_chunk_rebuild_full(chunked_body_t* body, int chunk_idx);
static void chunk_upload(mesh_chunk_t* c);

/* Debug toggle — flipped by the public renderer_set_terrain_visible
 * API. Defined up here because renderer_draw_world (much further
 * down) reads it. Defaults to true so terrain shows on first frame. */
static bool R_TERRAIN_VISIBLE = true;

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

/* Distant-body pipeline — a per-body subdivided icosphere scaled to
 * the body's radius, used when the body subtends less than ~20 % of
 * the viewport. The mesh is built once at register time with smooth
 * radial normals and per-vertex colours sampled from the body's own
 * topmost-block atlas tile, so a distant Sequoia shows mottled green,
 * Crag rusty red, etc., instead of every body looking like the same
 * featureless solid sphere. Lighting is per-vertex Lambert. */
static const char* VS_DISTANT =
    "#version 300 es\n"
    "layout(location=0) in vec3 a_pos;\n"
    "layout(location=1) in vec3 a_normal;\n"
    "layout(location=2) in vec3 a_color;\n"
    "uniform mat4 u_mvp;\n"
    "uniform vec3 u_sun_dir;\n"
    "uniform vec3 u_ambient;\n"
    "out vec3 v_color;\n"
    "void main() {\n"
    "  gl_Position = u_mvp * vec4(a_pos, 1.0);\n"
    "  float ndl = max(dot(normalize(a_normal), normalize(u_sun_dir)), 0.0);\n"
    "  v_color = a_color * (u_ambient + vec3(ndl));\n"
    "}\n";

static const char* FS_DISTANT =
    "#version 300 es\n"
    "precision highp float;\n"
    "in vec3 v_color;\n"
    "out vec4 frag_color;\n"
    "void main() { frag_color = vec4(v_color, 1.0); }\n";

/* Emissive sun. Uniformly bright disc with a soft fresnel-ish rim
 * so the silhouette glows slightly without bloom. This is the only
 * sun in the scene — the previous procedural sun disc / glow drawn
 * inside the skybox shader was removed so we don't render two suns
 * at slightly different positions / sizes. The skybox now draws only
 * stars + atmospheric scattering; this physical sphere fills in the
 * sun itself. */
static const char* VS_SUN =
    "#version 300 es\n"
    "layout(location=0) in vec3 a_pos;\n"
    "uniform mat4 u_mvp;\n"
    "out vec3 v_local;\n"
    "void main() {\n"
    "  v_local = a_pos;\n"
    "  gl_Position = u_mvp * vec4(a_pos, 1.0);\n"
    "}\n";

static const char* FS_SUN =
    "#version 300 es\n"
    "precision highp float;\n"
    "in vec3 v_local;\n"
    "uniform vec3 u_color;\n"
    "out vec4 frag_color;\n"
    "void main() {\n"
    /* Local-space position is on the unit sphere (vbuf is unit). The
     * dot of the normalised position with -view_dir would give true
     * fresnel, but for an isotropic star a radial-from-center power
     * looks the same and is cheaper. */
    "  float r = length(v_local);\n"
    "  float core = 1.0;\n"
    "  float halo = pow(clamp(r, 0.0, 1.0), 8.0);\n"
    "  vec3 col = u_color * (core + halo * 0.4);\n"
    "  frag_color = vec4(col, 1.0);\n"
    "}\n";

/* Atmospheric scattering skybox.
 *
 * Direct port of the sister Caelum project's atmosphere.glsl
 * (https://github.com/RubenTipparach/Caelum/blob/master/shaders/atmosphere.glsl).
 * The previous in-tree shader had subtle math bugs: the ray-sphere
 * "no hit" sentinel returned vec2(1, -1), which the t-clipping logic
 * later interpreted as a planet hit at t=1, collapsing the
 * integration ray to almost zero length whenever the view didn't
 * actually hit the planet. End result: bright atmosphere only when
 * looking at terrain, dark sky everywhere else. Caelum returns
 * vec2(-1) on miss and the whole thing is straightforward — we use
 * its math verbatim.
 *
 * Per-fragment work:
 *   1. Reconstruct world-space view direction from inverse-VP.
 *   2. Translate camera into planet-local space (planet at origin).
 *   3. Intersect view ray with atmosphere shell + planet sphere.
 *   4. Ray-march N samples along the in-atmosphere segment.
 *   5. At each sample, march toward the sun to compute the
 *      sunlight-side optical depth (with planet-shadow check).
 *   6. Accumulate Rayleigh + Mie inscatter, weighted by combined
 *      transmittance and phase functions.
 *   7. Apply sunset warm-tint + horizon-glow approximations.
 *   8. HDR → LDR via 1 - exp(-color), then composite over the
 *      starfield backdrop.
 *
 * Stars stay in this shader. The procedural sun disc + glow used to
 * be drawn here too — it's been removed so the only sun in the
 * scene is the physical UV sphere drawn by renderer_draw_sun. */
static const char* VS_SKY =
    "#version 300 es\n"
    "out vec2 v_ndc;\n"
    "void main() {\n"
    /* Fullscreen triangle from gl_VertexID — the same trick the old
     * shader used, but we now keep NDC.xy as a varying for the FS
     * to reconstruct view rays from a camera basis. NDC z = 0.99999
     * sits just inside the LESS_EQUAL depth test against a buffer
     * cleared to 1.0, so the starfield draws and any later geometry
     * paints over it. */
    "  vec2 pos = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);\n"
    "  pos = pos * 2.0 - 1.0;\n"
    "  gl_Position = vec4(pos, 0.99999, 1.0);\n"
    "  v_ndc = pos;\n"
    "}\n";

static const char* FS_SKY =
    "#version 300 es\n"
    "precision highp float;\n"
    "in vec2 v_ndc;\n"
    "uniform vec3  u_sun_dir;\n"
    "uniform vec3  u_sun_color;\n"
    "uniform vec3  u_planet_center;\n"
    "uniform vec3  u_camera_pos;\n"
    "uniform vec4  u_atmo_params;\n"   /* x=Rg, y=Ra, z=strength, w=unused */
    "uniform vec4  u_atmo_tuning;\n"   /* x=rayleigh, y=mie, z=sun_intensity, w=sunset */
    "uniform vec4  u_atmo_phys;\n"     /* xyz=wavelengths_inv4, w=scale_height          */
    "uniform vec4  u_atmo_mie;\n"      /* x=mie_g, yzw=unused                           */
    "uniform vec4  u_sunset_tint;\n"   /* xyz=multiplicative warm tint, w=unused        */
    "uniform vec4  u_sunset_glow;\n"   /* xyz=sun-direction glow rgb, w=unused          */
    "uniform vec4  u_sunset_horiz;\n"  /* xyz=horizon-band rgb, w=unused                */
    "uniform vec3  u_cam_right;\n"     /* world-space camera basis vectors              */
    "uniform vec3  u_cam_up;\n"
    "uniform vec3  u_cam_fwd;\n"
    "uniform vec4  u_sky_params;\n"    /* x=tan(fovY/2), y=aspect, z=time, w=unused    */
    /* Skybox tuning, loaded from assets/config/skybox.yaml. See
     * skybox_config_t in core/config.h for the field meanings. */
    "uniform vec4  u_star_densities;\n"   /* xyz=3 layer densities, w=sharpness         */
    "uniform vec4  u_star_intensities;\n" /* xyz=3 layer weights,  w=brightness threshold */
    "uniform vec3  u_star_color;\n"
    "uniform vec3  u_nebula_warm;\n"
    "uniform vec3  u_nebula_cool;\n"
    "uniform vec4  u_nebula_params;\n"    /* x=intensity, y=drift, z=scale1, w=scale2  */
    "uniform vec4  u_nebula_smoothstep;\n"/* xy=cloud (lo,hi), zw=warm-blend (lo,hi)   */
    "uniform vec3  u_space_color;\n"
    "out vec4 frag_color;\n"

    "#define PI 3.14159265359\n"
    "#define NUM_SAMPLES 12\n"
    "#define NUM_LIGHT_SAMPLES 4\n"

    /* Hash used by atmosphere ray-march dither (kept). */
    "float h31(vec3 p) {\n"
    "  p = fract(p * vec3(443.897, 441.423, 437.195));\n"
    "  p += dot(p, p.yzx + 19.19);\n"
    "  return fract((p.x + p.y) * p.z);\n"
    "}\n"

    /* Voronoi star + nebula hashes — ported from the rts-engine /
     * Phantom-Nebula starfield. Replaces the previous floor(d*180)
     * threshold-on-hash, which had no smoothing across cell boundaries
     * and so twinkled every time camera rotation crossed a grid plane. */
    "float vh1(float x) {\n"
    "  return fract(x + 1.3215 * 1.8152);\n"
    "}\n"
    "float vh3(vec3 a) {\n"
    "  return fract((vh1(a.z * 42.8883) + vh1(a.y * 36.9125) + vh1(a.x * 65.4321)) * 291.1257);\n"
    "}\n"
    "vec3 rh3(float x) {\n"
    "  return vec3(\n"
    "    vh1(((x + 0.5283) * 59.3829) * 274.3487),\n"
    "    vh1(((x + 0.8192) * 83.6621) * 345.3871),\n"
    "    vh1(((x + 0.2157) * 36.6521) * 458.3971));\n"
    "}\n"

    /* 27-cell 3D Voronoi: each cell scatters one star at a sub-cell
     * position keyed by the cell hash, the fragment finds the squared
     * distance to the nearest star across itself + 26 neighbours.
     * Smooth-falloff over that distance gives stable point lights
     * that don't pop in/out as the camera rotates. */
    "float voronoi_star(vec3 dir, float density, out float cell_id) {\n"
    "  vec3 pos = dir * density;\n"
    "  vec3 base = floor(pos);\n"
    "  float m = 9999.0;\n"
    "  float w = 0.0;\n"
    "  for (int x = -1; x < 2; ++x) {\n"
    "    for (int y = -1; y < 2; ++y) {\n"
    "      for (int z = -1; z < 2; ++z) {\n"
    "        vec3 cell = base + vec3(float(x), float(y), float(z));\n"
    "        float h = vh3(cell);\n"
    "        vec3 pt = rh3(h) + cell;\n"
    "        vec3 diff = pos - pt;\n"
    "        float d2 = dot(diff, diff);\n"
    "        if (d2 < m) { m = d2; w = h; }\n"
    "      }\n"
    "    }\n"
    "  }\n"
    "  cell_id = w;\n"
    "  return m;\n"
    "}\n"
    "float starfield_layer(vec3 dir, float density) {\n"
    "  float cid;\n"
    "  float d2 = voronoi_star(dir, density, cid);\n"
    "  float star = 1.0 - smoothstep(0.0, u_star_densities.w, d2);\n"
    "  float br   = fract(cid * 123.456);\n"
    "  return star * br * step(u_star_intensities.w, br);\n"
    "}\n"

    /* Cheap 5-octave value-noise fbm for nebula clouds. */
    "float vnoise(vec3 p) {\n"
    "  vec3 i = floor(p);\n"
    "  vec3 f = fract(p);\n"
    "  vec3 s = f * f * (3.0 - 2.0 * f);\n"
    "  return mix(\n"
    "    mix(mix(vh3(i),                  vh3(i + vec3(1,0,0)), s.x),\n"
    "        mix(vh3(i + vec3(0,1,0)),    vh3(i + vec3(1,1,0)), s.x), s.y),\n"
    "    mix(mix(vh3(i + vec3(0,0,1)),    vh3(i + vec3(1,0,1)), s.x),\n"
    "        mix(vh3(i + vec3(0,1,1)),    vh3(i + vec3(1,1,1)), s.x), s.y),\n"
    "    s.z);\n"
    "}\n"
    "float fbm5(vec3 p) {\n"
    "  float v = 0.0; float a = 0.5; vec3 q = p;\n"
    "  for (int i = 0; i < 5; ++i) { v += a * vnoise(q); q *= 2.07; a *= 0.5; }\n"
    "  return v;\n"
    "}\n"

    /* Caelum's ray-sphere — sphere at origin, returns vec2(-1) on miss
     * so a downstream `if (hit.x > 0.0) ...` works correctly. The
     * previous shader's vec2(1, -1) sentinel was the source of the
     * "atmosphere only at low elevations" bug. */
    "vec2 raySphereIntersect(vec3 ro, vec3 rd, float radius) {\n"
    "  float b = dot(ro, rd);\n"
    "  float c = dot(ro, ro) - radius * radius;\n"
    "  float disc = b * b - c;\n"
    "  if (disc < 0.0) return vec2(-1.0);\n"
    "  float s = sqrt(disc);\n"
    "  return vec2(-b - s, -b + s);\n"
    "}\n"

    /* All scattering knobs are uniforms — see u_atmo_phys for
     * wavelengths-inv-4 and scale-height, u_atmo_mie.x for the Mie
     * asymmetry, u_atmo_tuning for the four primary scales. */

    "float density(float altitude) {\n"
    "  return exp(-altitude / u_atmo_phys.w);\n"
    "}\n"

    /* Optical depth from a sun-side sample point through the
     * remaining atmosphere — small inner loop, normalised by\n"
     * thickness so values stay scale-independent. */
    "float opticalDepth(vec3 ro, vec3 rd, float rayLen, float Rg, float thickness) {\n"
    "  float step = rayLen / float(NUM_LIGHT_SAMPLES);\n"
    "  float ns = step / thickness;\n"
    "  float depth = 0.0;\n"
    "  for (int i = 0; i < NUM_LIGHT_SAMPLES; ++i) {\n"
    "    vec3  p = ro + rd * (step * (float(i) + 0.5));\n"
    "    float a = clamp((length(p) - Rg) / thickness, 0.0, 1.0);\n"
    "    depth += density(a) * ns;\n"
    "  }\n"
    "  return depth;\n"
    "}\n"

    "void main() {\n"
    /* Reconstruct the world-space view ray from the camera basis +
     * fov instead of inv(VP). The basis vectors come from the C side
     * already orthonormal, so this is numerically clean and makes the
     * resulting `d` depend only on camera rotation — eye position can
     * jitter all it wants and the stars hold still. */
    "  float t  = u_sky_params.x;\n"
    "  float ar = u_sky_params.y;\n"
    "  vec3 d = normalize(u_cam_fwd\n"
    "                   + v_ndc.x * ar * t * u_cam_right\n"
    "                   + v_ndc.y * t       * u_cam_up);\n"

    /* Three-layer Voronoi starfield + soft nebula. No sun disc here —
     * the physical sun sphere is drawn in the pass after this. All
     * tuning lives in u_star_* / u_nebula_* / u_space_color uniforms,
     * sourced from assets/config/skybox.yaml. */
    "  float stars = 0.0;\n"
    "  stars += starfield_layer(d, u_star_densities.x) * u_star_intensities.x;\n"
    "  stars += starfield_layer(d, u_star_densities.y) * u_star_intensities.y;\n"
    "  stars += starfield_layer(d, u_star_densities.z) * u_star_intensities.z;\n"
    "  vec3 starColor = u_star_color * stars;\n"

    "  float drift = u_sky_params.z * u_nebula_params.y;\n"
    "  float n  = fbm5(d * u_nebula_params.z + vec3(drift, 0.0, drift * 0.7));\n"
    "  float n2 = fbm5(d * u_nebula_params.w + vec3(7.3, 2.1, 9.9));\n"
    "  float cloud = smoothstep(u_nebula_smoothstep.x, u_nebula_smoothstep.y, n);\n"
    "  vec3 nebula = mix(u_nebula_cool, u_nebula_warm,\n"
    "                    smoothstep(u_nebula_smoothstep.z, u_nebula_smoothstep.w, n2))\n"
    "                * cloud * u_nebula_params.x;\n"

    "  vec3 space_col = u_space_color + nebula + starColor;\n"

    "  float strength = u_atmo_params.z;\n"
    "  if (strength <= 0.001) {\n"
    "    frag_color = vec4(space_col, 1.0);\n"
    "    return;\n"
    "  }\n"

    "  float Rg = u_atmo_params.x;\n"
    "  float Ra = u_atmo_params.y;\n"
    "  float thickness = max(Ra - Rg, 0.001);\n"

    /* Translate to planet-local space — Caelum's ray_sphere assumes
     * the sphere sits at origin. */
    "  vec3 ro = u_camera_pos - u_planet_center;\n"

    "  vec2 atmoHit = raySphereIntersect(ro, d, Ra);\n"
    "  if (atmoHit.y < 0.0) {\n"
    "    frag_color = vec4(space_col, 1.0);\n"
    "    return;\n"
    "  }\n"

    "  float rayStart = max(0.0, atmoHit.x);\n"
    "  float rayEnd   = atmoHit.y;\n"

    /* Planet occlusion — clip the ray at the surface. With Caelum's
     * vec2(-1) miss sentinel, planetHit.x > 0 only when there's an
     * actual hit, so this conditional is safe. */
    "  vec2 planetHit = raySphereIntersect(ro, d, Rg);\n"
    "  if (planetHit.x > 0.0) {\n"
    "    rayEnd = min(rayEnd, planetHit.x);\n"
    "  }\n"

    "  if (rayStart >= rayEnd) {\n"
    "    frag_color = vec4(space_col, 1.0);\n"
    "    return;\n"
    "  }\n"

    "  float rayLen   = rayEnd - rayStart;\n"
    "  float stepSize = rayLen / float(NUM_SAMPLES);\n"
    "  float normStep = stepSize / thickness;\n"
    "  float dither   = h31(vec3(gl_FragCoord.xy, 0.5)) * 0.5;\n"

    "  vec3 sunDir = normalize(u_sun_dir);\n"

    "  vec3  rSum = vec3(0.0);\n"
    "  vec3  mSum = vec3(0.0);\n"
    "  float odR  = 0.0;\n"
    "  float odM  = 0.0;\n"

    "  for (int i = 0; i < NUM_SAMPLES; ++i) {\n"
    "    vec3  p = ro + d * (rayStart + stepSize * (float(i) + dither));\n"
    "    float h = length(p);\n"
    "    if (h < Rg) continue;\n"
    "    float altitude = clamp((h - Rg) / thickness, 0.0, 1.0);\n"
    "    float dens = density(altitude);\n"
    "    float seg  = dens * normStep;\n"
    "    odR += seg;\n"
    "    odM += seg;\n"

    /* Planet shadow check — if the sun sits behind the planet from
     * this sample's POV, skip it. */
    "    vec2 sunPlanet = raySphereIntersect(p, sunDir, Rg);\n"
    "    if (sunPlanet.x > 0.0) continue;\n"
    "    vec2 sunAtmo   = raySphereIntersect(p, sunDir, Ra);\n"
    "    float sunLen   = max(0.0, sunAtmo.y);\n"
    "    float sunOd    = opticalDepth(p, sunDir, sunLen, Rg, thickness);\n"

    "    vec3 tauR = u_atmo_tuning.x * u_atmo_phys.xyz * (odR + sunOd);\n"
    "    vec3 tauM = vec3(u_atmo_tuning.y * (odM + sunOd));\n"
    "    vec3 atten = exp(-(tauR + tauM));\n"
    "    rSum += dens * atten * normStep;\n"
    "    mSum += dens * atten * normStep;\n"
    "  }\n"

    "  rSum *= u_atmo_tuning.x * u_atmo_phys.xyz;\n"
    "  mSum *= u_atmo_tuning.y;\n"

    "  float cosTheta = dot(d, sunDir);\n"
    "  float phaseR   = 0.75 * (1.0 + cosTheta * cosTheta);\n"
    "  float gg       = u_atmo_mie.x * u_atmo_mie.x;\n"
    "  float phaseM   = (1.0 - gg) /\n"
    "                   (4.0 * PI *\n"
    "                    pow(max(1.0 + gg - 2.0 * u_atmo_mie.x * cosTheta, 0.0001), 1.5));\n"

    "  vec3 sky = u_atmo_tuning.z * (rSum * phaseR + mSum * phaseM);\n"

    /* Sunset warmth — analytical multipliers; numerical integration
     * tends to under-shoot these at the step counts we afford. */
    "  vec3  ro_norm    = normalize(ro);\n"
    "  float sun_height = dot(sunDir, ro_norm);\n"
    "  float sunset     = smoothstep(0.3, -0.05, sun_height);\n"
    "  float view_sun   = max(0.0, cosTheta);\n"
    /* Sunset warmth scaled by u_atmo_tuning.w (sunset_strength). At
     * 1.0 you get the full Caelum orange-on-horizon look; 0.0 strips
     * all warm-tint and the sky stays Rayleigh-blue all the way to
     * the horizon. Tenebris currently uses 0.3 — present but subtle. */
    "  float ws = u_atmo_tuning.w;\n"
    "  sky *= mix(vec3(1.0), u_sunset_tint.xyz, sunset * 0.5 * ws);\n"
    "  sky += u_sunset_glow.xyz * pow(view_sun, 3.0) * sunset * u_atmo_tuning.z * 0.12 * ws;\n"
    "  float horizon = 1.0 - abs(dot(d, ro_norm));\n"
    "  horizon = pow(horizon, 3.0);\n"
    "  sky += u_sunset_horiz.xyz * horizon * sunset * u_atmo_tuning.z * 0.04 * ws;\n"

    /* HDR -> LDR. */
    "  sky = 1.0 - exp(-sky);\n"

    /* Smooth analytical attenuation of the starfield based on the
     * camera altitude. Doesn't depend on the per-fragment ray-march
     * sample positions, so it's stable as the camera moves. */
    "  float h_norm = clamp((length(ro) - Rg) / thickness, 0.0, 1.0);\n"
    "  float dens_cam = density(h_norm);\n"
    "  float bg_atten = clamp(1.0 - dens_cam * 0.85, 0.05, 1.0);\n"

    "  vec3 col = mix(space_col, space_col * bg_atten + sky, strength);\n"
    "  frag_color = vec4(col, 1.0);\n"
    "}\n";

/* Procedural water shader.
 *
 * Surface = fBm of 3D gradient (Perlin) noise — ported from the same
 * Noise3D used by terrain (core/rng.c::gnoise3d_seed, originally from
 * rts-engine PlanetMesh.cs). Value noise gave visible axis-aligned
 * grid stripes on the cap because each cell boundary was a sharp
 * derivative discontinuity; gradient noise is C¹-continuous so the
 * surface flows isotropically with no preferred direction.
 *
 * Normal comes from a three-sample finite-difference gradient of the
 * scalar height, projected onto the tangent plane. Lighting, Fresnel,
 * reflection and specular all react to the real surface slope. Cheap
 * fake-refraction shifts the deep base colour by the same gradient so
 * the water shimmers without a real backbuffer sample. Distance fog
 * fades the colour toward u_water_fog so far-out water reads as a
 * murky horizon line instead of an over-bright mirror. All visual
 * knobs live in assets/config/water.yaml — see water_config_t.
 */
static const char* VS_WATER =
    "#version 300 es\n"
    "layout(location=0) in vec3 a_pos;\n"
    "layout(location=1) in vec3 a_normal;\n"
    "layout(location=2) in vec2 a_uv;\n"       /* unused; keeps vbuf layout compatible */
    "uniform mat4 u_vp;\n"
    "uniform float u_time;\n"
    "uniform float u_swell_amp;\n"
    "out vec3 v_wpos;\n"
    "out vec3 v_normal;\n"
    "void main() {\n"
    "  vec3 n = normalize(a_normal);\n"
    /* Three-octave directional swell. Amplitudes are scaled by the
     * config knob so the cap drop in hex_mesher.c::hex_mesh_build_water
     * can be tuned alongside it — drop has to exceed max swell or
     * crests poke above neighbour sand. */
    "  float t = u_time;\n"
    "  float A = u_swell_amp;\n"
    "  float swell = 0.0;\n"
    "  swell += sin(t * 0.9 + a_pos.x * 1.4 + a_pos.z * 0.6) * A;\n"
    "  swell += sin(t * 1.3 - a_pos.x * 0.7 + a_pos.z * 1.2) * A * 0.75;\n"
    "  swell += sin(t * 1.7 + a_pos.x * 2.3 - a_pos.z * 1.9) * A * 0.4;\n"
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
    "uniform vec3  u_camera_pos;\n"
    "uniform vec3  u_sun_dir;\n"
    "uniform float u_time;\n"
    /* Tunables loaded from assets/config/water.yaml. See
     * water_config_t in core/config.h. Packed into vec4s so std140
     * keeps the cross-driver layout stable. */
    "uniform vec4  u_water_params;\n"   /* x=shine, y=shine_power, z=foam_threshold, w=fog_distance_m */
    "uniform vec4  u_water_params2;\n"  /* x=opacity_low, y=opacity_high, z=refraction_amount, w=unused */
    "uniform vec3  u_water_fog;\n"
    "out vec4 frag_color;\n"

    /* Direct port of core/rng.c::gnoise3d_seed (and rts-engine
     * Noise3D.Sample) into GLSL. Quintic fade, integer-hash gradient
     * lookup, output in [-1, +1]. Replaces the previous value-noise
     * primitive whose grid alignment was visible across the cap. */
    "float gn_fade(float t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }\n"
    /* Hash uses uint to keep wrap-around well-defined under GLSL ES
     * 300 (signed overflow is UB; unsigned is modulo-2^32). */
    "uint gn_hash(int x, int y, int z) {\n"
    "  uint h = uint(x) * 374761393u ^ uint(y) * 668265263u ^ uint(z) * 1274126177u;\n"
    "  h = (h ^ (h >> 13u)) * 1103515245u;\n"
    "  return h ^ (h >> 16u);\n"
    "}\n"
    "float gn_grad(uint hash, float x, float y, float z) {\n"
    "  uint h = hash & 15u;\n"
    "  float u = (h < 8u)  ? x : y;\n"
    "  float v = (h < 4u)  ? y : ((h == 12u || h == 14u) ? x : z);\n"
    "  return ((h & 1u) != 0u ? -u : u) + ((h & 2u) != 0u ? -v : v);\n"
    "}\n"
    "float gnoise3(vec3 p) {\n"
    "  int ix = int(floor(p.x));\n"
    "  int iy = int(floor(p.y));\n"
    "  int iz = int(floor(p.z));\n"
    "  float fx = p.x - float(ix);\n"
    "  float fy = p.y - float(iy);\n"
    "  float fz = p.z - float(iz);\n"
    "  float u = gn_fade(fx);\n"
    "  float v = gn_fade(fy);\n"
    "  float w = gn_fade(fz);\n"
    "  float g000 = gn_grad(gn_hash(ix,   iy,   iz  ), fx,       fy,       fz);\n"
    "  float g100 = gn_grad(gn_hash(ix+1, iy,   iz  ), fx-1.0,   fy,       fz);\n"
    "  float g010 = gn_grad(gn_hash(ix,   iy+1, iz  ), fx,       fy-1.0,   fz);\n"
    "  float g110 = gn_grad(gn_hash(ix+1, iy+1, iz  ), fx-1.0,   fy-1.0,   fz);\n"
    "  float g001 = gn_grad(gn_hash(ix,   iy,   iz+1), fx,       fy,       fz-1.0);\n"
    "  float g101 = gn_grad(gn_hash(ix+1, iy,   iz+1), fx-1.0,   fy,       fz-1.0);\n"
    "  float g011 = gn_grad(gn_hash(ix,   iy+1, iz+1), fx,       fy-1.0,   fz-1.0);\n"
    "  float g111 = gn_grad(gn_hash(ix+1, iy+1, iz+1), fx-1.0,   fy-1.0,   fz-1.0);\n"
    "  float a = mix(mix(g000, g100, u), mix(g010, g110, u), v);\n"
    "  float b = mix(mix(g001, g101, u), mix(g011, g111, u), v);\n"
    "  return mix(a, b, w);\n"
    "}\n"

    /* Three-octave fBm with per-octave time advection along different
     * directions so the surface doesn't look like a single flow. */
    "float fbm3(vec3 p, float t) {\n"
    "  float h = 0.0;\n"
    "  vec3 q = p * 0.9 + vec3(t * 0.35, t * 0.18, -t * 0.42);\n"
    "  h += gnoise3(q) * 0.50;\n"
    "  q = q * 2.1 + vec3(-t * 0.22, t * 0.33, t * 0.17);\n"
    "  h += gnoise3(q) * 0.28;\n"
    "  q = q * 2.3 + vec3(t * 0.19, -t * 0.27, t * 0.11);\n"
    "  h += gnoise3(q) * 0.15;\n"
    "  return h;\n"
    "}\n"

    "void main() {\n"
    "  vec3 radial = normalize(v_normal);\n"

    /* Scalar height + 3-sample finite-difference world-space gradient.
     * Epsilon is ~8 cm at water scale, small enough to stay inside the
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
    /* Cheap fake-refraction: nudge the deep base colour by the
     * tangent-plane gradient. Without a backbuffer sample we can't
     * really refract, but coupling the colour to the same surface
     * derivative the lighting uses gives a believable shimmer. */
    "  vec3 refraction_shift = t_grad * u_water_params2.z;\n"
    "  vec3 base = mix(deep, shallow, vdn) + refraction_shift;\n"

    "  vec3 refl   = reflect(-view, n);\n"
    "  float up_f  = clamp(dot(refl, radial), 0.0, 1.0);\n"
    "  vec3 sky    = mix(vec3(0.85, 0.92, 0.98), vec3(0.35, 0.55, 0.85), up_f);\n"

    "  vec3  halfv = normalize(view + sun);\n"
    "  float spec  = pow(max(dot(n, halfv), 0.0), u_water_params.y);\n"
    "  vec3  sun_highlight = vec3(1.35, 1.25, 1.10) * spec * u_water_params.x;\n"

    /* Foam — only at clear crests, threshold raised from the value-
     * noise era so the cap isn't blanketed in white. Slope foam is
     * scaled down too. */
    "  float steepness = length(t_grad);\n"
    "  float foam_lo   = u_water_params.z;\n"
    "  float crest     = smoothstep(foam_lo, foam_lo + 0.25, h0);\n"
    "  float slope_f   = smoothstep(0.80, 1.60, steepness);\n"
    "  float foam      = max(crest * 0.45, slope_f * 0.30);\n"

    "  vec3 color = mix(base, sky, f) + sun_highlight;\n"
    "  color = mix(color, vec3(0.95, 0.97, 1.0), foam * 0.5);\n"

    /* Distance fog — fade water toward u_water_fog over fog_distance
     * metres. Stops the horizon strip from reading as bright sky. */
    "  float dist = length(u_camera_pos - v_wpos);\n"
    "  float fog  = clamp(dist / u_water_params.w, 0.0, 1.0);\n"
    "  color = mix(color, u_water_fog, fog);\n"

    "  float alpha = mix(u_water_params2.x, u_water_params2.y, f);\n"
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
        /* Columns 0-11 — default (Earth / Tenebris) tileset. */
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
        /* Columns 12-17 — Sequoia tileset variants. */
        "assets/textures/planet_seq/planet_seq_grass.png",       /* 12 SEQ_GRASS */
        "assets/textures/planet_seq/planet_seq_dirt.png",        /* 13 SEQ_DIRT */
        "assets/textures/planet_seq/planet_seq_grass_dirt.png",  /* 14 SEQ_DIRT_GRASS */
        "assets/textures/planet_seq/planet_seq_sand.png",        /* 15 SEQ_SAND */
        "assets/textures/planet_seq/planet_seq_snow.png",        /* 16 SEQ_SNOW */
        "assets/textures/planet_seq/planet_seq_snow_dirt.png",   /* 17 SEQ_DIRT_SNOW */
        /* Columns 18-20 — runtime-tinted variants. Paths here are the
         * SOURCE images; the tint colour comes from the parallel
         * `tints` array below. */
        "assets/textures/moon.png",   /* 18 CRAG_ROCK  */
        "assets/textures/ice.png",    /* 19 FROST_ICE  */
        "assets/textures/rocks.png",  /* 20 ASTEROID_ROCK */
        /* Vegetation + planet core. */
        "assets/textures/wood.png",   /* 21 WOOD     */
        "assets/textures/grass.png",  /* 22 LEAVES   — tinted darker green */
        "assets/textures/rocks.png",  /* 23 BEDROCK  — tinted near-black   */
    };
    /* Per-channel multiplier applied to each loaded tile before it goes
     * into the atlas. {1, 1, 1} = untinted. */
    static const float tints[HEX_ATLAS_TILES][3] = {
        [0]  = {1, 1, 1}, [1]  = {1, 1, 1}, [2]  = {1, 1, 1}, [3]  = {1, 1, 1},
        [4]  = {1, 1, 1}, [5]  = {1, 1, 1}, [6]  = {1, 1, 1}, [7]  = {1, 1, 1},
        [8]  = {1, 1, 1}, [9]  = {1, 1, 1}, [10] = {1, 1, 1}, [11] = {1, 1, 1},
        [12] = {1, 1, 1}, [13] = {1, 1, 1}, [14] = {1, 1, 1}, [15] = {1, 1, 1},
        [16] = {1, 1, 1}, [17] = {1, 1, 1},
        [18] = {1.30f, 0.55f, 0.35f},  /* CRAG_ROCK     — Mars-red rust */
        [19] = {0.55f, 0.80f, 1.25f},  /* FROST_ICE     — glacial blue  */
        [20] = {0.70f, 0.68f, 0.65f},  /* ASTEROID_ROCK — dim gray       */
        [21] = {1.00f, 1.00f, 1.00f},  /* WOOD     — passthrough       */
        [22] = {0.65f, 1.05f, 0.50f},  /* LEAVES   — saturated green   */
        [23] = {0.30f, 0.30f, 0.32f},  /* BEDROCK  — near-black slate  */
    };
    for (int col = 0; col < HEX_ATLAS_TILES; ++col) {
        if (!paths[col]) continue;
        int tw, th, tc;
        unsigned char* pix = stbi_load(paths[col], &tw, &th, &tc, 4);
        if (!pix) continue;
        const float tr = tints[col][0], tg = tints[col][1], tb = tints[col][2];
        for (int y = 0; y < tile_px; ++y) {
            int sy = y * th / tile_px;
            for (int x = 0; x < tile_px; ++x) {
                int sx = x * tw / tile_px;
                int src = (sy * tw + sx) * 4;
                int dst = (y * W + col * tile_px + x) * 4;
                /* Multiply-blend tint clamped to 0..255 so bright tints
                 * (Mars red) don't overflow into the alpha channel. */
                int r = (int)((float)pix[src+0] * tr); if (r > 255) r = 255;
                int g = (int)((float)pix[src+1] * tg); if (g > 255) g = 255;
                int b = (int)((float)pix[src+2] * tb); if (b > 255) b = 255;
                atlas[dst+0] = (unsigned char)r;
                atlas[dst+1] = (unsigned char)g;
                atlas[dst+2] = (unsigned char)b;
                atlas[dst+3] = pix[src+3];
            }
        }
        stbi_image_free(pix);
    }
    /* Per-column average colour, used by the distant-LOD mesh
     * builder to paint each icosphere vertex with the colour of the
     * block whose tile sits under it. Walks the column's already-
     * tinted pixels so the averaged result matches what the surface
     * actually renders. */
    for (int col = 0; col < HEX_ATLAS_TILES; ++col) {
        double sr = 0, sg = 0, sb = 0;
        int n = 0;
        for (int y = 0; y < tile_px; ++y) {
            for (int x = 0; x < tile_px; ++x) {
                int idx = (y * W + col * tile_px + x) * 4;
                if (atlas[idx + 3] < 8) continue;  /* skip near-transparent */
                sr += atlas[idx + 0];
                sg += atlas[idx + 1];
                sb += atlas[idx + 2];
                ++n;
            }
        }
        if (n > 0) {
            R.atlas_col_avg[col] = (vec3_t){
                (float)(sr / (double)n / 255.0),
                (float)(sg / (double)n / 255.0),
                (float)(sb / (double)n / 255.0),
            };
        } else {
            R.atlas_col_avg[col] = (vec3_t){ 0.5f, 0.5f, 0.5f };
        }
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
    R.active_body_idx = -1;     /* no body registered yet */

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
            .size  = 20 * sizeof(float),   /* mat4(16) + float(1) + float(1) + 2 pad */
            .layout = SG_UNIFORMLAYOUT_STD140,
            .glsl_uniforms[0] = { .glsl_name = "u_vp",        .type = SG_UNIFORMTYPE_MAT4  },
            .glsl_uniforms[1] = { .glsl_name = "u_time",      .type = SG_UNIFORMTYPE_FLOAT },
            .glsl_uniforms[2] = { .glsl_name = "u_swell_amp", .type = SG_UNIFORMTYPE_FLOAT },
        },
        .uniform_blocks[1] = {
            .stage = SG_SHADERSTAGE_FRAGMENT,
            .size  = 24 * sizeof(float),
            .layout = SG_UNIFORMLAYOUT_STD140,
            .glsl_uniforms[0] = { .glsl_name = "u_camera_pos",    .type = SG_UNIFORMTYPE_FLOAT3 },
            .glsl_uniforms[1] = { .glsl_name = "u_sun_dir",       .type = SG_UNIFORMTYPE_FLOAT3 },
            .glsl_uniforms[2] = { .glsl_name = "u_time",          .type = SG_UNIFORMTYPE_FLOAT },
            .glsl_uniforms[3] = { .glsl_name = "u_water_params",  .type = SG_UNIFORMTYPE_FLOAT4 },
            .glsl_uniforms[4] = { .glsl_name = "u_water_params2", .type = SG_UNIFORMTYPE_FLOAT4 },
            .glsl_uniforms[5] = { .glsl_name = "u_water_fog",     .type = SG_UNIFORMTYPE_FLOAT3 },
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

    /* Per-body chunk storage is allocated lazily by renderer_register_world
     * once we know the body's tile_count + radius. Nothing to do here. */

    /* Skybox pipeline — fullscreen triangle via gl_VertexID, no vbuf
     * bound. No depth write (so world geometry lands on top) and no
     * cull (the triangle is in clip-space). The fragment shader does
     * Caelum-port atmospheric scattering plus a procedural starfield;
     * the sun itself is drawn separately as a physical sphere via
     * renderer_draw_sun (no procedural disc here, that gave a
     * doubled sun). */
    sg_shader shd_sky = sg_make_shader(&(sg_shader_desc){
        .vertex_func.source   = VS_SKY,
        .fragment_func.source = FS_SKY,
        /* Sokol caps glsl_uniforms at 16 entries per block, so the
         * scene-state uniforms (atmo + camera basis) live in block 0
         * and the YAML-driven sky tuning (stars + nebula + backdrop)
         * lives in block 1. The split is purely a sokol limitation —
         * both blocks are bound at the same draw. */
        .uniform_blocks[0] = {
            .stage = SG_SHADERSTAGE_FRAGMENT,
            /* std140: 15 vec4 slots = 60 floats. */
            .size  = 60 * sizeof(float),
            .layout = SG_UNIFORMLAYOUT_STD140,
            .glsl_uniforms[0]  = { .glsl_name = "u_sun_dir",       .type = SG_UNIFORMTYPE_FLOAT3 },
            .glsl_uniforms[1]  = { .glsl_name = "u_sun_color",     .type = SG_UNIFORMTYPE_FLOAT3 },
            .glsl_uniforms[2]  = { .glsl_name = "u_planet_center", .type = SG_UNIFORMTYPE_FLOAT3 },
            .glsl_uniforms[3]  = { .glsl_name = "u_camera_pos",    .type = SG_UNIFORMTYPE_FLOAT3 },
            .glsl_uniforms[4]  = { .glsl_name = "u_atmo_params",   .type = SG_UNIFORMTYPE_FLOAT4 },
            .glsl_uniforms[5]  = { .glsl_name = "u_atmo_tuning",   .type = SG_UNIFORMTYPE_FLOAT4 },
            .glsl_uniforms[6]  = { .glsl_name = "u_atmo_phys",     .type = SG_UNIFORMTYPE_FLOAT4 },
            .glsl_uniforms[7]  = { .glsl_name = "u_atmo_mie",      .type = SG_UNIFORMTYPE_FLOAT4 },
            .glsl_uniforms[8]  = { .glsl_name = "u_sunset_tint",   .type = SG_UNIFORMTYPE_FLOAT4 },
            .glsl_uniforms[9]  = { .glsl_name = "u_sunset_glow",   .type = SG_UNIFORMTYPE_FLOAT4 },
            .glsl_uniforms[10] = { .glsl_name = "u_sunset_horiz",  .type = SG_UNIFORMTYPE_FLOAT4 },
            .glsl_uniforms[11] = { .glsl_name = "u_cam_right",     .type = SG_UNIFORMTYPE_FLOAT3 },
            .glsl_uniforms[12] = { .glsl_name = "u_cam_up",        .type = SG_UNIFORMTYPE_FLOAT3 },
            .glsl_uniforms[13] = { .glsl_name = "u_cam_fwd",       .type = SG_UNIFORMTYPE_FLOAT3 },
            .glsl_uniforms[14] = { .glsl_name = "u_sky_params",    .type = SG_UNIFORMTYPE_FLOAT4 },
        },
        .uniform_blocks[1] = {
            .stage = SG_SHADERSTAGE_FRAGMENT,
            /* std140: 8 vec4 slots = 32 floats. */
            .size  = 32 * sizeof(float),
            .layout = SG_UNIFORMLAYOUT_STD140,
            .glsl_uniforms[0]  = { .glsl_name = "u_star_densities",     .type = SG_UNIFORMTYPE_FLOAT4 },
            .glsl_uniforms[1]  = { .glsl_name = "u_star_intensities",   .type = SG_UNIFORMTYPE_FLOAT4 },
            .glsl_uniforms[2]  = { .glsl_name = "u_star_color",         .type = SG_UNIFORMTYPE_FLOAT3 },
            .glsl_uniforms[3]  = { .glsl_name = "u_nebula_warm",        .type = SG_UNIFORMTYPE_FLOAT3 },
            .glsl_uniforms[4]  = { .glsl_name = "u_nebula_cool",        .type = SG_UNIFORMTYPE_FLOAT3 },
            .glsl_uniforms[5]  = { .glsl_name = "u_nebula_params",      .type = SG_UNIFORMTYPE_FLOAT4 },
            .glsl_uniforms[6]  = { .glsl_name = "u_nebula_smoothstep",  .type = SG_UNIFORMTYPE_FLOAT4 },
            .glsl_uniforms[7]  = { .glsl_name = "u_space_color",        .type = SG_UNIFORMTYPE_FLOAT3 },
        },
        .label = "sky-shader",
    });
    R.pip_sky = sg_make_pipeline(&(sg_pipeline_desc){
        .shader = shd_sky,
        .depth = { .write_enabled = false, .compare = SG_COMPAREFUNC_LESS_EQUAL },
        .cull_mode = SG_CULLMODE_NONE,
        .label = "sky-pipeline",
    });

    /* Distant-LOD pipeline. The mesh itself is per-body and gets
     * built at register time (build_distant_mesh_for_body); each
     * vertex carries a colour sampled from the body's terrain so
     * different planets show different colours from far away. */
    sg_shader shd_distant = sg_make_shader(&(sg_shader_desc){
        .vertex_func.source   = VS_DISTANT,
        .fragment_func.source = FS_DISTANT,
        .attrs = {
            [0].glsl_name = "a_pos",
            [1].glsl_name = "a_normal",
            [2].glsl_name = "a_color",
        },
        .uniform_blocks[0] = {
            .stage = SG_SHADERSTAGE_VERTEX,
            .size  = (16 + 4 + 4) * sizeof(float),   /* mat4 + 2 vec3+pad */
            .layout = SG_UNIFORMLAYOUT_STD140,
            .glsl_uniforms[0] = { .glsl_name = "u_mvp",     .type = SG_UNIFORMTYPE_MAT4 },
            .glsl_uniforms[1] = { .glsl_name = "u_sun_dir", .type = SG_UNIFORMTYPE_FLOAT3 },
            .glsl_uniforms[2] = { .glsl_name = "u_ambient", .type = SG_UNIFORMTYPE_FLOAT3 },
        },
        .label = "distant-shader",
    });
    R.pip_distant = sg_make_pipeline(&(sg_pipeline_desc){
        .shader = shd_distant,
        .layout = {
            .attrs = {
                [0] = { .format = SG_VERTEXFORMAT_FLOAT3 },   /* pos    */
                [1] = { .format = SG_VERTEXFORMAT_FLOAT3 },   /* normal */
                [2] = { .format = SG_VERTEXFORMAT_FLOAT3 },   /* color  */
            },
            .buffers[0].stride = 9 * sizeof(float),
        },
        .index_type = SG_INDEXTYPE_UINT32,
        .depth = { .write_enabled = true, .compare = SG_COMPAREFUNC_LESS_EQUAL },
        .cull_mode = SG_CULLMODE_BACK,
        .face_winding = SG_FACEWINDING_CCW,
        .label = "distant-pipeline",
    });

    /* Smooth UV sphere — shared by sun + atmosphere shells. 32 lon
     * x 16 lat = 1056 verts, ~3000 tris. Position-only vertices;
     * the sun shader uses the local position for radial falloff and
     * the atmosphere shader projects through u_model to get world
     * pos for ray-marching. */
    {
        const int LON = 32;
        const int LAT = 16;
        const int VCOUNT = (LAT + 1) * (LON + 1);
        const int ICOUNT = LAT * LON * 6;
        float* sv = (float*)malloc((size_t)VCOUNT * 3 * sizeof(float));
        uint32_t* si = (uint32_t*)malloc((size_t)ICOUNT * sizeof(uint32_t));
        int vi = 0;
        for (int y = 0; y <= LAT; ++y) {
            float v = (float)y / (float)LAT;
            float phi = v * 3.14159265f;
            float sp = sinf(phi), cp = cosf(phi);
            for (int x = 0; x <= LON; ++x) {
                float u = (float)x / (float)LON;
                float th = u * 6.2831853f;
                float st = sinf(th), ct = cosf(th);
                sv[vi*3+0] = sp * ct;
                sv[vi*3+1] = cp;
                sv[vi*3+2] = sp * st;
                vi++;
            }
        }
        int ii = 0;
        for (int y = 0; y < LAT; ++y) {
            for (int x = 0; x < LON; ++x) {
                uint32_t a = (uint32_t)(y * (LON + 1) + x);
                uint32_t b = a + (uint32_t)(LON + 1);
                si[ii++] = a;     si[ii++] = b;     si[ii++] = a + 1;
                si[ii++] = a + 1; si[ii++] = b;     si[ii++] = b + 1;
            }
        }
        R.uvsphere_vbuf = sg_make_buffer(&(sg_buffer_desc){
            .data = { .ptr = sv, .size = (size_t)VCOUNT * 3 * sizeof(float) },
            .label = "uvsphere-vbuf",
        });
        R.uvsphere_ibuf = sg_make_buffer(&(sg_buffer_desc){
            .usage.index_buffer = true,
            .data = { .ptr = si, .size = (size_t)ICOUNT * sizeof(uint32_t) },
            .label = "uvsphere-ibuf",
        });
        R.uvsphere_index_count = ICOUNT;
        free(sv);
        free(si);
    }

    /* Sun pipeline — emissive front-face sphere, depth-write so it
     * occludes the skybox disc when the sphere is in view. */
    sg_shader shd_sun = sg_make_shader(&(sg_shader_desc){
        .vertex_func.source   = VS_SUN,
        .fragment_func.source = FS_SUN,
        .attrs = { [0].glsl_name = "a_pos" },
        .uniform_blocks[0] = {
            .stage = SG_SHADERSTAGE_VERTEX,
            .size  = 16 * sizeof(float),
            .layout = SG_UNIFORMLAYOUT_STD140,
            .glsl_uniforms[0] = { .glsl_name = "u_mvp", .type = SG_UNIFORMTYPE_MAT4 },
        },
        .uniform_blocks[1] = {
            .stage = SG_SHADERSTAGE_FRAGMENT,
            .size  = 4 * sizeof(float),
            .layout = SG_UNIFORMLAYOUT_STD140,
            .glsl_uniforms[0] = { .glsl_name = "u_color", .type = SG_UNIFORMTYPE_FLOAT3 },
        },
        .label = "sun-shader",
    });
    R.pip_sun = sg_make_pipeline(&(sg_pipeline_desc){
        .shader = shd_sun,
        .layout = {
            .attrs = { [0] = { .format = SG_VERTEXFORMAT_FLOAT3 } },
            .buffers[0].stride = 3 * sizeof(float),
        },
        .index_type = SG_INDEXTYPE_UINT32,
        .depth = { .write_enabled = true, .compare = SG_COMPAREFUNC_LESS_EQUAL },
        .cull_mode = SG_CULLMODE_BACK,
        .face_winding = SG_FACEWINDING_CCW,
        .label = "sun-pipeline",
    });

    bake_atlas();
    /* Per-chunk meshes are allocated lazily by ensure_chunks() once we
     * see the world tile count — keeps init cheap when there's nothing
     * to mesh yet (Tenebris's first frame). */
}

void renderer_shutdown(void) {
    for (int bi = 0; bi < R.body_count; ++bi) {
        chunked_body_t* body = &R.bodies[bi];
        for (int i = 0; i < CHUNK_COUNT; ++i) {
            mesh_chunk_t* c = &body->chunks[i];
            if (c->mesh.vertices)       hex_mesh_free(&c->mesh);
            if (c->water_mesh.vertices) hex_mesh_free(&c->water_mesh);
            if (c->vbuf.id)        sg_destroy_buffer(c->vbuf);
            if (c->ibuf.id)        sg_destroy_buffer(c->ibuf);
            if (c->water_vbuf.id)  sg_destroy_buffer(c->water_vbuf);
            if (c->water_ibuf.id)  sg_destroy_buffer(c->water_ibuf);
        }
        if (body->distant_vbuf.id) sg_destroy_buffer(body->distant_vbuf);
        if (body->distant_ibuf.id) sg_destroy_buffer(body->distant_ibuf);
        free(body->tile_to_chunk); body->tile_to_chunk = NULL;
    }
    R.body_count = 0;
    R.active_body_idx = -1;
    sg_destroy_view(R.atlas_view);
    sg_destroy_image(R.atlas_img);
    sg_destroy_sampler(R.atlas_smp);
    sg_destroy_pipeline(R.pip_hex);
    sg_destroy_pipeline(R.pip_water);
    sg_destroy_pipeline(R.pip_sky);
    sg_destroy_pipeline(R.pip_distant);
    sg_destroy_pipeline(R.pip_sun);
    sg_destroy_buffer(R.uvsphere_vbuf);
    sg_destroy_buffer(R.uvsphere_ibuf);
}

/* ----------------------------------------------------------------------- */

void renderer_draw_skybox(mat4_t view, mat4_t proj) {
    /* The fragment shader rebuilds view rays from a world-space camera
     * basis + tan(fovY/2) + aspect, so we extract those from the view
     * and projection matrices instead of inverting VP. The view matrix
     * is column-major from mat4_look_at:
     *   col 0 = (s.x, u.x, -f.x, 0)   — right
     *   col 1 = (s.y, u.y, -f.y, 0)   — up
     *   col 2 = (s.z, u.z, -f.z, 0)   — −forward
     * so the camera basis vectors in world space are read off the
     * rows of the 3×3 rotation submatrix.
     *
     * Because the FS uses these basis vectors directly, the eye
     * translation (m[12..14]) drops out completely and stars depend
     * only on camera rotation — they hold still even if the eye
     * jitters by sub-mm amounts each frame. */
    sg_apply_pipeline(R.pip_sky);
    /* Block 0 — std140, 15 vec4 slots = 60 floats (scene state).
     *   [0..3]   u_sun_dir            (vec3 + pad)
     *   [4..7]   u_sun_color          (vec3 + pad)
     *   [8..11]  u_planet_center      (vec3 + pad)
     *   [12..15] u_camera_pos         (vec3 + pad)
     *   [16..19] u_atmo_params        (vec4)
     *   [20..23] u_atmo_tuning        (vec4)
     *   [24..27] u_atmo_phys          (vec3 wavelengths + scale_height)
     *   [28..31] u_atmo_mie           (vec4: x = mie_g, rest unused)
     *   [32..35] u_sunset_tint        (vec3 + pad)
     *   [36..39] u_sunset_glow        (vec3 + pad)
     *   [40..43] u_sunset_horiz       (vec3 + pad)
     *   [44..47] u_cam_right          (vec3 + pad)
     *   [48..51] u_cam_up             (vec3 + pad)
     *   [52..55] u_cam_fwd            (vec3 + pad)
     *   [56..59] u_sky_params         (vec4: tan(fovY/2), aspect, time, _)
     */
    float ub[60] = { 0 };
    ub[0]  = R.env.sun_dir.x; ub[1]  = R.env.sun_dir.y; ub[2]  = R.env.sun_dir.z;
    ub[4]  = 1.40f;           ub[5]  = 1.25f;           ub[6]  = 0.90f;
    ub[8]  = R.env.atmo_planet_center.x;
    ub[9]  = R.env.atmo_planet_center.y;
    ub[10] = R.env.atmo_planet_center.z;
    ub[12] = R.env.camera_world.x;
    ub[13] = R.env.camera_world.y;
    ub[14] = R.env.camera_world.z;
    ub[16] = R.env.atmo_planet_radius;
    ub[17] = R.env.atmo_radius;
    ub[18] = R.env.atmo_strength;
    ub[19] = 0.0f;
    ub[20] = R.env.atmo_rayleigh_scale;
    ub[21] = R.env.atmo_mie_scale;
    ub[22] = R.env.atmo_sun_intensity;
    ub[23] = R.env.atmo_sunset_strength;
    ub[24] = R.env.atmo_wavelengths.x;
    ub[25] = R.env.atmo_wavelengths.y;
    ub[26] = R.env.atmo_wavelengths.z;
    ub[27] = R.env.atmo_scale_height;
    ub[28] = R.env.atmo_mie_g;
    ub[32] = R.env.atmo_sunset_tint.x;
    ub[33] = R.env.atmo_sunset_tint.y;
    ub[34] = R.env.atmo_sunset_tint.z;
    ub[36] = R.env.atmo_sunset_glow.x;
    ub[37] = R.env.atmo_sunset_glow.y;
    ub[38] = R.env.atmo_sunset_glow.z;
    ub[40] = R.env.atmo_sunset_horizon.x;
    ub[41] = R.env.atmo_sunset_horizon.y;
    ub[42] = R.env.atmo_sunset_horizon.z;
    /* Camera basis vectors (world space). */
    ub[44] = view.m[0];      ub[45] = view.m[4];      ub[46] = view.m[8];
    ub[48] = view.m[1];      ub[49] = view.m[5];      ub[50] = view.m[9];
    ub[52] = -view.m[2];     ub[53] = -view.m[6];     ub[54] = -view.m[10];
    /* tan(fovY/2) and aspect from the projection matrix:
     *   proj.m[5] = 1 / tan(fovY/2)   →   tan(fovY/2) = 1 / m[5]
     *   proj.m[0] = m[5] / aspect     →   aspect      = m[5] / m[0] */
    float inv_tan_half = proj.m[5];
    ub[56] = (inv_tan_half != 0.0f) ? (1.0f / inv_tan_half) : 1.0f;
    ub[57] = (proj.m[0]    != 0.0f) ? (inv_tan_half / proj.m[0]) : 1.0f;
    ub[58] = R.time_seconds;
    ub[59] = 0.0f;
    sg_apply_uniforms(0, &(sg_range){ .ptr = ub, .size = sizeof(ub) });

    /* Block 1 — std140, 8 vec4 slots = 32 floats (skybox tuning from
     * assets/config/skybox.yaml).
     *   [0..3]   u_star_densities     (vec4: d1, d2, d3, sharpness)
     *   [4..7]   u_star_intensities   (vec4: i1, i2, i3, threshold)
     *   [8..11]  u_star_color         (vec3 + pad)
     *   [12..15] u_nebula_warm        (vec3 + pad)
     *   [16..19] u_nebula_cool        (vec3 + pad)
     *   [20..23] u_nebula_params      (vec4: intensity, drift, scale1, scale2)
     *   [24..27] u_nebula_smoothstep  (vec4: cloud_lo, cloud_hi, warm_lo, warm_hi)
     *   [28..31] u_space_color        (vec3 + pad)
     */
    const skybox_config_t* sky = config_skybox();
    float sb[32] = { 0 };
    sb[0]  = sky->star_densities.x;
    sb[1]  = sky->star_densities.y;
    sb[2]  = sky->star_densities.z;
    sb[3]  = sky->star_sharpness;
    sb[4]  = sky->star_intensities.x;
    sb[5]  = sky->star_intensities.y;
    sb[6]  = sky->star_intensities.z;
    sb[7]  = sky->star_brightness_threshold;
    sb[8]  = sky->star_color.x;
    sb[9]  = sky->star_color.y;
    sb[10] = sky->star_color.z;
    sb[12] = sky->nebula_warm_color.x;
    sb[13] = sky->nebula_warm_color.y;
    sb[14] = sky->nebula_warm_color.z;
    sb[16] = sky->nebula_cool_color.x;
    sb[17] = sky->nebula_cool_color.y;
    sb[18] = sky->nebula_cool_color.z;
    sb[20] = sky->nebula_intensity;
    sb[21] = sky->nebula_drift_speed;
    sb[22] = sky->nebula_scale1;
    sb[23] = sky->nebula_scale2;
    sb[24] = sky->nebula_cloud_lo;
    sb[25] = sky->nebula_cloud_hi;
    sb[26] = sky->nebula_warm_blend_lo;
    sb[27] = sky->nebula_warm_blend_hi;
    sb[28] = sky->space_color.x;
    sb[29] = sky->space_color.y;
    sb[30] = sky->space_color.z;
    sg_apply_uniforms(1, &(sg_range){ .ptr = sb, .size = sizeof(sb) });
    /* No bindings needed — fullscreen triangle generated from gl_VertexID. */
    sg_apply_bindings(&(sg_bindings){ 0 });
    sg_draw(0, 3, 1);
}

/* ----------------------------------------------------------------------- */
/* Sun sphere — emissive body at env.sun_pos. Uniform-scaled UV
 * sphere; depth-write so foreground geometry occludes it correctly. */

void renderer_draw_sun(mat4_t view, mat4_t proj) {
    if (R.env.sun_radius <= 0.0f) return;
    mat4_t vp = mat4_mul(proj, view);
    mat4_t scale = mat4_identity();
    scale.m[0] = scale.m[5] = scale.m[10] = R.env.sun_radius;
    mat4_t trans = mat4_translate(R.env.sun_pos);
    mat4_t model = mat4_mul(trans, scale);
    mat4_t mvp   = mat4_mul(vp, model);

    sg_apply_pipeline(R.pip_sun);
    sg_apply_uniforms(0, &(sg_range){ .ptr = mvp.m, .size = sizeof(mvp.m) });
    /* Warm white core, slightly clipping. Same colour the skybox
     * disc uses so the two read as one body when both are visible. */
    float color_ub[4] = { 1.40f, 1.25f, 0.90f, 0.0f };
    sg_apply_uniforms(1, &(sg_range){ .ptr = color_ub, .size = sizeof(color_ub) });
    sg_apply_bindings(&(sg_bindings){
        .vertex_buffers[0] = R.uvsphere_vbuf,
        .index_buffer      = R.uvsphere_ibuf,
    });
    sg_draw(0, R.uvsphere_index_count, 1);
    R.tris += (size_t)R.uvsphere_index_count / 3;
}

/* ----------------------------------------------------------------------- */
/* Body registration. Every celestial body (Tenebris and every moon /
 * asteroid) is stored as a chunked_body_t with the same 32-chunk
 * layout. The first body registered becomes the active one — it
 * receives streaming + edit handling. Subsequent registrations are
 * fully meshed in one shot at register time. The active body can be
 * switched at runtime via renderer_set_active_world (e.g. on player
 * teleport). */

/* ----------------------------------------------------------------------- */
/* Distant-body icosphere builder. Generates a unit icosphere
 * subdivided to config_lod()->distant_subdivisions levels (each
 * subdivision splits every triangle into four, so level 2 = 320 tris
 * = 16× the base detail). Vertex normals are radial (the unit
 * direction itself), so shading is smooth across faces. Each vertex
 * also gets a colour sampled from the body's own world: find the
 * Goldberg tile under that direction, walk down to the topmost solid
 * block, look up its top-face atlas tile in R.atlas_col_avg. If the
 * tile isn't generated yet we fall back to the per-tileset
 * distant_color so the body never goes black mid-stream. */

#define DISTANT_MAX_VERTS  1024   /* SUBDIV=3 needs 642 unique verts */
#define DISTANT_MAX_TRIS   1280   /* SUBDIV=3 needs 1280 tris        */

typedef struct { uint32_t a, b, mid; } edge_mid_t;

static uint32_t midpoint_lookup(edge_mid_t* edges, int* nedges,
                                 float (*verts)[3], int* nverts,
                                 uint32_t a, uint32_t b) {
    uint32_t lo = a < b ? a : b;
    uint32_t hi = a < b ? b : a;
    for (int i = 0; i < *nedges; ++i) {
        if (edges[i].a == lo && edges[i].b == hi) return edges[i].mid;
    }
    /* New midpoint — average and re-project to unit sphere. */
    float mx = (verts[a][0] + verts[b][0]) * 0.5f;
    float my = (verts[a][1] + verts[b][1]) * 0.5f;
    float mz = (verts[a][2] + verts[b][2]) * 0.5f;
    float L  = sqrtf(mx*mx + my*my + mz*mz);
    if (L > 0.0f) { mx /= L; my /= L; mz /= L; }
    uint32_t idx = (uint32_t)(*nverts);
    verts[idx][0] = mx;
    verts[idx][1] = my;
    verts[idx][2] = mz;
    ++*nverts;
    edges[*nedges] = (edge_mid_t){ lo, hi, idx };
    ++*nedges;
    return idx;
}

static vec3_t sample_body_top_color(const chunked_body_t* body, const float dir[3]) {
    const world_t* w = body->world;
    if (!w) return body->distant_color;
    dvec3_t d = dvec3_make(dir[0], dir[1], dir[2]);
    int tile = goldberg_find_tile(w->grid, d, -1);
    if (tile < 0 || tile >= w->tile_count || tile >= w->gen_cursor) {
        return body->distant_color;
    }
    block_t top = BLOCK_AIR;
    int     d_top = -1;
    for (int dep = WORLD_MAX_DEPTH - 1; dep >= 0; --dep) {
        block_t b = (block_t)w->blocks[tile * WORLD_MAX_DEPTH + dep];
        if (block_is_solid(b)) { top = b; d_top = dep; break; }
    }
    if (top == BLOCK_AIR) return body->distant_color;
    int col = (int)block_face_tile(top, FACE_CAP_TOP);
    if (col < 0 || col >= HEX_ATLAS_TILES) return body->distant_color;
    vec3_t base = R.atlas_col_avg[col];

    /* Height shade — the topmost-block depth is the planet-gen noise
     * output, so multiplying the base biome colour by an altitude-
     * driven shade carries the actual elevation pattern (not just the
     * biome boundaries) onto the distant LOD. Lowlands darken,
     * highlands lighten, ocean basins read distinctly bluer than
     * coastal grass even when both sample to similar atlas tiles. */
    const lod_config_t* L = config_lod();
    double altitude_m = world_depth_to_radius_m(w, d_top + 1)
                      - w->body->radius_m;
    float t = (float)(altitude_m / (double)L->distant_shade_range_m);
    if (t < -1.0f) t = -1.0f;
    if (t >  1.0f) t =  1.0f;
    float shade = L->distant_shade_floor
                + (L->distant_shade_ceiling - L->distant_shade_floor)
                  * (t * 0.5f + 0.5f);
    base.x *= shade; base.y *= shade; base.z *= shade;
    return base;
}

static void build_distant_mesh_for_body(chunked_body_t* body) {
    const int levels = config_lod()->distant_subdivisions;

    /* Base unit icosahedron. */
    const double tau = (1.0 + sqrt(5.0)) / 2.0;
    const double inv = 1.0 / sqrt(1.0 + tau * tau);
    const float  N   = (float)inv;
    const float  T   = (float)(tau * inv);
    static const int base_tris[20][3] = {
        {0,11,5},{0,5,1},{0,1,7},{0,7,10},{0,10,11},
        {1,5,9},{5,11,4},{11,10,2},{10,7,6},{7,1,8},
        {3,9,4},{3,4,2},{3,2,6},{3,6,8},{3,8,9},
        {4,9,5},{2,4,11},{6,2,10},{8,6,7},{9,8,1},
    };
    float verts[DISTANT_MAX_VERTS][3] = {
        {-N, T, 0}, { N, T, 0}, {-N,-T, 0}, { N,-T, 0},
        { 0,-N, T}, { 0, N, T}, { 0,-N,-T}, { 0, N,-T},
        { T, 0,-N}, { T, 0, N}, {-T, 0,-N}, {-T, 0, N},
    };
    int nv = 12;
    uint32_t tris[DISTANT_MAX_TRIS][3];
    for (int i = 0; i < 20; ++i) {
        tris[i][0] = (uint32_t)base_tris[i][0];
        tris[i][1] = (uint32_t)base_tris[i][1];
        tris[i][2] = (uint32_t)base_tris[i][2];
    }
    int nt = 20;

    /* Subdivide. Each pass splits every tri into 4 by inserting edge
     * midpoints (deduped via the edge cache so adjacent tris share
     * the new vertex). */
    for (int lvl = 0; lvl < levels; ++lvl) {
        edge_mid_t edges[DISTANT_MAX_TRIS * 3]; int ne = 0;
        uint32_t new_tris[DISTANT_MAX_TRIS][3]; int new_nt = 0;
        for (int t = 0; t < nt; ++t) {
            uint32_t a = tris[t][0], b = tris[t][1], c = tris[t][2];
            uint32_t mab = midpoint_lookup(edges, &ne, verts, &nv, a, b);
            uint32_t mbc = midpoint_lookup(edges, &ne, verts, &nv, b, c);
            uint32_t mca = midpoint_lookup(edges, &ne, verts, &nv, c, a);
            new_tris[new_nt  ][0] = a;   new_tris[new_nt  ][1] = mab; new_tris[new_nt  ][2] = mca; ++new_nt;
            new_tris[new_nt  ][0] = b;   new_tris[new_nt  ][1] = mbc; new_tris[new_nt  ][2] = mab; ++new_nt;
            new_tris[new_nt  ][0] = c;   new_tris[new_nt  ][1] = mca; new_tris[new_nt  ][2] = mbc; ++new_nt;
            new_tris[new_nt  ][0] = mab; new_tris[new_nt  ][1] = mbc; new_tris[new_nt  ][2] = mca; ++new_nt;
        }
        memcpy(tris, new_tris, (size_t)new_nt * sizeof(uint32_t) * 3);
        nt = new_nt;
    }

    /* Pack: pos (3) + normal (3, radial) + colour (3, sampled). */
    static float vbuf[DISTANT_MAX_VERTS * 9];
    for (int i = 0; i < nv; ++i) {
        const float* p = verts[i];
        vbuf[i*9 + 0] = p[0]; vbuf[i*9 + 1] = p[1]; vbuf[i*9 + 2] = p[2];
        vbuf[i*9 + 3] = p[0]; vbuf[i*9 + 4] = p[1]; vbuf[i*9 + 5] = p[2];
        vec3_t col = sample_body_top_color(body, p);
        vbuf[i*9 + 6] = col.x; vbuf[i*9 + 7] = col.y; vbuf[i*9 + 8] = col.z;
    }
    static uint32_t ibuf[DISTANT_MAX_TRIS * 3];
    for (int i = 0; i < nt; ++i) {
        ibuf[i*3 + 0] = tris[i][0];
        ibuf[i*3 + 1] = tris[i][1];
        ibuf[i*3 + 2] = tris[i][2];
    }

    body->distant_vbuf = sg_make_buffer(&(sg_buffer_desc){
        .data = { .ptr = vbuf, .size = (size_t)nv * 9 * sizeof(float) },
        .label = "body-distant-vbuf",
    });
    body->distant_ibuf = sg_make_buffer(&(sg_buffer_desc){
        .usage.index_buffer = true,
        .data = { .ptr = ibuf, .size = (size_t)nt * 3 * sizeof(uint32_t) },
        .label = "body-distant-ibuf",
    });
    body->distant_index_count = nt * 3;
}

static vec3_t body_distant_color(const body_config_t* b) {
    vec3_t c;
    switch (b->tileset) {
        case TILESET_SEQUOIA:  c = (vec3_t){ 0.35f, 0.70f, 0.25f }; break;
        case TILESET_CRAG:     c = (vec3_t){ 0.70f, 0.30f, 0.18f }; break;
        case TILESET_FROST:    c = (vec3_t){ 0.55f, 0.75f, 0.95f }; break;
        case TILESET_ASTEROID: c = (vec3_t){ 0.35f, 0.32f, 0.30f }; break;
        default:
            if (b->icy)         c = (vec3_t){ 0.80f, 0.90f, 1.00f };
            else if (b->barren) c = (vec3_t){ 0.55f, 0.55f, 0.55f };
            else                c = (vec3_t){ 0.30f, 0.45f, 0.60f };
            break;
    }
    return c;
}

void renderer_register_world(world_t* w) {
    if (R.body_count >= (int)(sizeof(R.bodies) / sizeof(R.bodies[0]))) return;
    if (!w || !w->body) return;

    int slot = R.body_count++;
    chunked_body_t* body = &R.bodies[slot];
    memset(body, 0, sizeof(*body));
    body->world          = w;
    body->world_pos      = (vec3_t){
        (float)w->body->pos_x, (float)w->body->pos_y, (float)w->body->pos_z
    };
    body->radius_m       = (float)w->body->radius_m;
    body->has_water      = w->body->has_water;
    body->distant_color  = body_distant_color(w->body);
    body->mesh_cursor    = 0;
    /* Build the far-LOD icosphere now while the world is fully
     * generated — main_web.c drains world_stream_gen before calling
     * us, so every tile's topmost block is available to sample for
     * vertex colours. The mesh is small (≤ 1280 tris) so the cost
     * is negligible at register time. */
    build_distant_mesh_for_body(body);

    if (R.active_body_idx < 0) {
        /* First-registered body is the active one — full detail at
         * boot, since the player spawns on it. */
        R.active_body_idx = slot;
        body->is_active   = true;
        body_alloc_chunks(body);
        body_full_mesh(body);
        for (int ci = 0; ci < CHUNK_COUNT; ++ci) {
            chunk_upload(&body->chunks[ci]);
        }
        body->chunks_allocated = true;
        body->meshed           = true;
        printf("[renderer] register %s (active): %d tiles, full mesh now\n",
               w->body->name, w->tile_count);
    } else {
        /* Inactive — deferred. The body draws as a flat-shaded
         * icosphere via renderer_draw_moons until the player flies
         * close enough that the angular size crosses the LOD cutoff;
         * at that moment renderer_draw_world demand-loads the chunked
         * mesh. Saves ~50 MB and ~128 buffer slots per moon we
         * haven't visited. */
        body->is_active        = false;
        body->chunks_allocated = false;
        body->meshed           = false;
        printf("[renderer] register %s (deferred): %d tiles, meshes on approach\n",
               w->body->name, w->tile_count);
    }
    fflush(stdout);
}

/* Demand-load the chunked terrain for a body — called the first frame
 * a previously-distant body's angular size exceeds the LOD cutoff.
 * Allocates GPU buffers, runs body_full_mesh, uploads every chunk.
 * Cost is proportional to the body's tile_count: ~50 ms for a small
 * moon, ~700 ms for a sister-planet-sized body. After this returns
 * the body renders the same way the active body does. */
static void body_load_detail(chunked_body_t* body) {
    if (body->meshed) return;
    if (!body->chunks_allocated) {
        body_alloc_chunks(body);
        body->chunks_allocated = true;
    }
    body_full_mesh(body);
    for (int ci = 0; ci < CHUNK_COUNT; ++ci) {
        chunk_upload(&body->chunks[ci]);
    }
    body->meshed = true;
    printf("[renderer] loaded detail for %s (%d tiles)\n",
           body->world->body->name, body->world->tile_count);
    fflush(stdout);
}

/* Backwards-compat shim — main_web.c still calls renderer_register_moon
 * for non-Tenebris bodies. Same behavior as renderer_register_world. */
void renderer_register_moon(world_t* w) { renderer_register_world(w); }

int renderer_moon_count(void) {
    /* "moon count" historically meant non-active bodies. */
    if (R.body_count == 0) return 0;
    return R.body_count - 1;   /* minus the active body */
}

void renderer_set_active_world(world_t* w) {
    /* Find the body for this world and mark it active. The previously-
     * active body keeps its mesh and just stops receiving streaming /
     * edit handling; if needed it'll get re-meshed on next reactivation. */
    for (int i = 0; i < R.body_count; ++i) {
        if (R.bodies[i].world == w) {
            if (R.active_body_idx >= 0) R.bodies[R.active_body_idx].is_active = false;
            R.active_body_idx = i;
            R.bodies[i].is_active = true;
            return;
        }
    }
}

/* Extract 6 frustum planes from a view-projection matrix (column
 * major). Each plane is ax + by + cz + d >= 0 for "inside". Gribb/
 * Hartmann — row differences of the VP. */
typedef struct { float a, b, c, d; } frustum_plane_t;

static void extract_frustum(mat4_t vp, frustum_plane_t p[6]) {
    const float* m = vp.m;
    /* Left:   row3 + row0 */
    p[0] = (frustum_plane_t){ m[3] + m[0], m[7] + m[4], m[11] + m[8],  m[15] + m[12] };
    /* Right:  row3 - row0 */
    p[1] = (frustum_plane_t){ m[3] - m[0], m[7] - m[4], m[11] - m[8],  m[15] - m[12] };
    /* Bottom: row3 + row1 */
    p[2] = (frustum_plane_t){ m[3] + m[1], m[7] + m[5], m[11] + m[9],  m[15] + m[13] };
    /* Top:    row3 - row1 */
    p[3] = (frustum_plane_t){ m[3] - m[1], m[7] - m[5], m[11] - m[9],  m[15] - m[13] };
    /* Near:   row3 + row2 */
    p[4] = (frustum_plane_t){ m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14] };
    /* Far:    row3 - row2 */
    p[5] = (frustum_plane_t){ m[3] - m[2], m[7] - m[6], m[11] - m[10], m[15] - m[14] };
    /* Normalise so radius comparison is in world units. */
    for (int i = 0; i < 6; ++i) {
        float inv = 1.0f / sqrtf(p[i].a * p[i].a + p[i].b * p[i].b + p[i].c * p[i].c);
        p[i].a *= inv; p[i].b *= inv; p[i].c *= inv; p[i].d *= inv;
    }
}

static bool sphere_visible(const frustum_plane_t p[6], vec3_t c, float r) {
    for (int i = 0; i < 6; ++i) {
        float dist = p[i].a * c.x + p[i].b * c.y + p[i].c * c.z + p[i].d;
        if (dist < -r) return false;
    }
    return true;
}

/* Uniform mat4_scale for the distant sphere: scale Model X/Y/Z by r. */
static mat4_t mat4_scale_uniform(float s) {
    mat4_t m = mat4_identity();
    m.m[0] = m.m[5] = m.m[10] = s;
    return m;
}

void renderer_draw_moons(mat4_t view, mat4_t proj, vec3_t camera_world) {
    if (R.body_count == 0) return;

    mat4_t vp_base = mat4_mul(proj, view);
    frustum_plane_t frustum[6];
    extract_frustum(vp_base, frustum);

    /* renderer_draw_world already drew detailed (close-enough) bodies
     * via their chunked meshes. This pass picks up bodies that are
     * far away enough to swap to a single flat-shaded icosphere — the
     * 0.12 angular-size threshold matches the cull check there. */
    const float LOD_RATIO = 0.12f;

    sg_apply_pipeline(R.pip_distant);
    for (int bi = 0; bi < R.body_count; ++bi) {
        chunked_body_t* body = &R.bodies[bi];
        /* The active body is always drawn detailed in renderer_draw_world;
         * never as an icosphere here. */
        if (bi == R.active_body_idx) continue;
        if (body->distant_index_count <= 0) continue;
        if (!sphere_visible(frustum, body->world_pos, body->radius_m * 1.5f)) continue;
        vec3_t delta = vec3_sub(body->world_pos, camera_world);
        float  dist  = vec3_length(delta);
        if (dist < 1.0f) dist = 1.0f;
        const bool distant = (body->radius_m / dist) < LOD_RATIO;
        if (!distant) continue;     /* close ones drew their chunks already */

        mat4_t model = mat4_mul(mat4_translate(body->world_pos),
                                mat4_scale_uniform(body->radius_m));
        mat4_t mvp = mat4_mul(vp_base, model);
        sg_apply_bindings(&(sg_bindings){
            .vertex_buffers[0] = body->distant_vbuf,
            .index_buffer      = body->distant_ibuf,
        });
        /* Packed std140 uniform block: mat4 + 2x (vec3+pad). Per-vertex
         * colour replaces the old u_color uniform. */
        float ub[16 + 8];
        memcpy(ub, mvp.m, sizeof(mvp.m));
        ub[16] = R.env.sun_dir.x; ub[17] = R.env.sun_dir.y; ub[18] = R.env.sun_dir.z; ub[19] = 0.0f;
        ub[20] = R.env.ambient.x; ub[21] = R.env.ambient.y; ub[22] = R.env.ambient.z; ub[23] = 0.0f;
        sg_apply_uniforms(0, &(sg_range){ .ptr = ub, .size = sizeof(ub) });
        sg_draw(0, body->distant_index_count, 1);
        R.tris += (size_t)body->distant_index_count / 3;
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
/* Chunk assignment + lazy buffer setup. */

/* 32 well-spread sphere anchors: 12 icosahedron vertices + 20 face centres.
 * Filled at first use by build_chunk_anchors(). Tile -> chunk mapping is
 * "nearest anchor by dot product" — equivalent to nearest neighbor on the
 * unit sphere. */
static dvec3_t CHUNK_ANCHORS[CHUNK_COUNT];
static bool    CHUNK_ANCHORS_BUILT = false;

static void build_chunk_anchors(void) {
    /* Icosahedron — same constants used in goldberg.c's seed mesh. */
    const double t = (1.0 + sqrt(5.0)) / 2.0;
    const double n = 1.0 / sqrt(1.0 + t * t);
    const double T = t * n;
    const dvec3_t V[12] = {
        {-n,  T, 0}, { n,  T, 0}, {-n, -T, 0}, { n, -T, 0},
        { 0, -n,  T}, { 0,  n,  T}, { 0, -n, -T}, { 0,  n, -T},
        { T, 0, -n}, { T, 0,  n}, {-T, 0, -n}, {-T, 0,  n},
    };
    static const int F[20][3] = {
        {0,11,5},{0,5,1},{0,1,7},{0,7,10},{0,10,11},
        {1,5,9},{5,11,4},{11,10,2},{10,7,6},{7,1,8},
        {3,9,4},{3,4,2},{3,2,6},{3,6,8},{3,8,9},
        {4,9,5},{2,4,11},{6,2,10},{8,6,7},{9,8,1},
    };
    for (int i = 0; i < 12; ++i) CHUNK_ANCHORS[i] = V[i];
    for (int fi = 0; fi < 20; ++fi) {
        dvec3_t c = dvec3_scale(
            dvec3_add(dvec3_add(V[F[fi][0]], V[F[fi][1]]), V[F[fi][2]]),
            1.0 / 3.0);
        CHUNK_ANCHORS[12 + fi] = dvec3_normalize(c);
    }
    CHUNK_ANCHORS_BUILT = true;
}

static int classify_tile(dvec3_t center) {
    /* Largest dot product = closest anchor on the unit sphere. */
    double best = -1e30;
    int    best_i = 0;
    for (int i = 0; i < CHUNK_COUNT; ++i) {
        double d = dvec3_dot(center, CHUNK_ANCHORS[i]);
        if (d > best) { best = d; best_i = i; }
    }
    return best_i;
}

/* Allocate per-chunk CPU/GPU buffers for a body + classify every tile
 * into its chunk. Idempotent — repeated calls no-op. */
static void body_alloc_chunks(chunked_body_t* body) {
    if (body->tile_to_chunk) return;
    if (!CHUNK_ANCHORS_BUILT) build_chunk_anchors();

    world_t* w = body->world;
    body->tile_to_chunk = (int*)malloc((size_t)w->tile_count * sizeof(int));
    for (int i = 0; i < w->tile_count; ++i) {
        const goldberg_tile_t* t = goldberg_tile(w->grid, i);
        body->tile_to_chunk[i] = classify_tile(t->center);
    }

    char label[48];
    for (int i = 0; i < CHUNK_COUNT; ++i) {
        mesh_chunk_t* c = &body->chunks[i];
        hex_mesh_init(&c->mesh);
        hex_mesh_init(&c->water_mesh);
        c->mesh.vertex_cap = INIT_VERTICES;
        c->mesh.vertices = (hex_vertex_t*)malloc(c->mesh.vertex_cap * sizeof(hex_vertex_t));
        c->mesh.index_cap = INIT_INDICES;
        c->mesh.indices = (uint32_t*)malloc(c->mesh.index_cap * sizeof(uint32_t));
        c->water_mesh.vertex_cap = INIT_WATER_VERTICES;
        c->water_mesh.vertices = (hex_vertex_t*)malloc(c->water_mesh.vertex_cap * sizeof(hex_vertex_t));
        c->water_mesh.index_cap = INIT_WATER_INDICES;
        c->water_mesh.indices = (uint32_t*)malloc(c->water_mesh.index_cap * sizeof(uint32_t));

        c->vbuf_capacity        = INIT_VERTICES;
        c->ibuf_capacity        = INIT_INDICES;
        c->water_vbuf_capacity  = INIT_WATER_VERTICES;
        c->water_ibuf_capacity  = INIT_WATER_INDICES;

        snprintf(label, sizeof(label), "%s-vbuf-%d", w->body->name, i);
        c->vbuf = sg_make_buffer(&(sg_buffer_desc){
            .size = (size_t)c->vbuf_capacity * sizeof(hex_vertex_t),
            .usage.stream_update = true,
            .label = label,
        });
        snprintf(label, sizeof(label), "%s-ibuf-%d", w->body->name, i);
        c->ibuf = sg_make_buffer(&(sg_buffer_desc){
            .size = (size_t)c->ibuf_capacity * sizeof(uint32_t),
            .usage.stream_update = true,
            .usage.index_buffer  = true,
            .label = label,
        });
        snprintf(label, sizeof(label), "%s-water-vbuf-%d", w->body->name, i);
        c->water_vbuf = sg_make_buffer(&(sg_buffer_desc){
            .size = (size_t)c->water_vbuf_capacity * sizeof(hex_vertex_t),
            .usage.stream_update = true,
            .label = label,
        });
        snprintf(label, sizeof(label), "%s-water-ibuf-%d", w->body->name, i);
        c->water_ibuf = sg_make_buffer(&(sg_buffer_desc){
            .size = (size_t)c->water_ibuf_capacity * sizeof(uint32_t),
            .usage.stream_update = true,
            .usage.index_buffer  = true,
            .label = label,
        });
    }
}

/* Recreate one of a chunk's GPU buffers at a larger size. Sokol stream-
 * update buffers are immutable in size, so we destroy and rebuild —
 * each grow doubles capacity until it fits, so the cost amortises to
 * O(1) per uploaded vertex. */
static sg_buffer regrow_buffer(sg_buffer old, int* capacity, int needed,
                               size_t element_size, bool index_buf,
                               const char* label) {
    int new_cap = *capacity;
    while (new_cap < needed) new_cap *= 2;
    if (old.id) sg_destroy_buffer(old);
    sg_buffer b = sg_make_buffer(&(sg_buffer_desc){
        .size = (size_t)new_cap * element_size,
        .usage.stream_update = true,
        .usage.index_buffer  = index_buf,
        .label = label,
    });
    *capacity = new_cap;
    return b;
}

static void body_chunk_rebuild_full(chunked_body_t* body, int chunk_idx) {
    world_t* w = body->world;
    mesh_chunk_t* c = &body->chunks[chunk_idx];
    hex_mesh_reset(&c->mesh);
    hex_mesh_reset(&c->water_mesh);
    for (int i = 0; i < w->tile_count; ++i) {
        if (body->tile_to_chunk[i] != chunk_idx) continue;
        if (i >= w->gen_cursor) continue;        /* not yet generated */
        hex_mesh_build_tile(&c->mesh, w, i);
        hex_mesh_build_water(&c->water_mesh, w, i);
        R.tiles_remeshed++;
    }
}

/* One-shot mesh of every tile in a body into its chunks. Used for
 * non-active bodies at register time — they're already fully gen'd
 * in main_web.c's init loop, so we can mesh them in one pass without
 * a streaming budget. */
static void body_full_mesh(chunked_body_t* body) {
    world_t* w = body->world;
    for (int ci = 0; ci < CHUNK_COUNT; ++ci) {
        mesh_chunk_t* c = &body->chunks[ci];
        hex_mesh_reset(&c->mesh);
        hex_mesh_reset(&c->water_mesh);
    }
    for (int i = 0; i < w->tile_count; ++i) {
        if (i >= w->gen_cursor) continue;
        int ci = body->tile_to_chunk[i];
        mesh_chunk_t* c = &body->chunks[ci];
        hex_mesh_build_tile(&c->mesh, w, i);
        if (body->has_water) hex_mesh_build_water(&c->water_mesh, w, i);
        world_tile_clear_dirty(w, i);
    }
    body->streamed_complete = true;
    body->mesh_cursor = w->tile_count;
}

static void chunk_upload(mesh_chunk_t* c) {
    /* Grow GPU buffers if the CPU mesh outgrew them. Without this the
     * sg_update_buffer calls below silently fail when size > buffer
     * capacity, and the chunk renders garbage / nothing — which was
     * the "terrain under my feet doesn't render" bug for chunks
     * covering mountain regions. */
    if ((int)c->mesh.vertex_count > c->vbuf_capacity) {
        c->vbuf = regrow_buffer(c->vbuf, &c->vbuf_capacity,
                                (int)c->mesh.vertex_count,
                                sizeof(hex_vertex_t), false,
                                "world-vbuf-grow");
    }
    if ((int)c->mesh.index_count > c->ibuf_capacity) {
        c->ibuf = regrow_buffer(c->ibuf, &c->ibuf_capacity,
                                (int)c->mesh.index_count,
                                sizeof(uint32_t), true,
                                "world-ibuf-grow");
    }
    if ((int)c->water_mesh.vertex_count > c->water_vbuf_capacity) {
        c->water_vbuf = regrow_buffer(c->water_vbuf, &c->water_vbuf_capacity,
                                      (int)c->water_mesh.vertex_count,
                                      sizeof(hex_vertex_t), false,
                                      "water-vbuf-grow");
    }
    if ((int)c->water_mesh.index_count > c->water_ibuf_capacity) {
        c->water_ibuf = regrow_buffer(c->water_ibuf, &c->water_ibuf_capacity,
                                      (int)c->water_mesh.index_count,
                                      sizeof(uint32_t), true,
                                      "water-ibuf-grow");
    }

    if (c->mesh.vertex_count > 0) {
        sg_update_buffer(c->vbuf, &(sg_range){
            .ptr  = c->mesh.vertices,
            .size = c->mesh.vertex_count * sizeof(hex_vertex_t),
        });
        sg_update_buffer(c->ibuf, &(sg_range){
            .ptr  = c->mesh.indices,
            .size = c->mesh.index_count * sizeof(uint32_t),
        });
    }
    c->last_uploaded_index_count = (int)c->mesh.index_count;
    if (c->water_mesh.vertex_count > 0) {
        sg_update_buffer(c->water_vbuf, &(sg_range){
            .ptr  = c->water_mesh.vertices,
            .size = c->water_mesh.vertex_count * sizeof(hex_vertex_t),
        });
        sg_update_buffer(c->water_ibuf, &(sg_range){
            .ptr  = c->water_mesh.indices,
            .size = c->water_mesh.index_count * sizeof(uint32_t),
        });
    }
    c->last_uploaded_water_idx_count = (int)c->water_mesh.index_count;
}

/* Draw a body's chunked terrain at its world position with the
 * supplied vp. Caller has already applied pip_hex + the sun/ambient
 * uniform block; this just sets the per-body model matrix uniform
 * and issues the chunk draws. */
static void body_draw_chunks(chunked_body_t* body, mat4_t vp) {
    /* Translate to body origin. For Tenebris this is identity (body
     * sits at world origin); for the moons it shifts the chunked
     * mesh out to its pos_x/y/z. */
    mat4_t model = mat4_translate(body->world_pos);
    mat4_t mvp   = mat4_mul(vp, model);
    sg_apply_uniforms(0, &(sg_range){ .ptr = mvp.m, .size = sizeof(mvp.m) });
    for (int ci = 0; ci < CHUNK_COUNT; ++ci) {
        mesh_chunk_t* c = &body->chunks[ci];
        if (c->last_uploaded_index_count <= 0) continue;
        sg_apply_bindings(&(sg_bindings){
            .vertex_buffers[0] = c->vbuf,
            .index_buffer      = c->ibuf,
            .views[0]          = R.atlas_view,
            .samplers[0]       = R.atlas_smp,
        });
        sg_draw(0, c->last_uploaded_index_count, 1);
        R.tris += (size_t)c->last_uploaded_index_count / 3;
    }
}

static void body_draw_water(chunked_body_t* body, mat4_t vp,
                            vec3_t camera_world) {
    if (!body->has_water) return;
    bool any = false;
    for (int ci = 0; ci < CHUNK_COUNT; ++ci) {
        if (body->chunks[ci].last_uploaded_water_idx_count > 0) { any = true; break; }
    }
    if (!any) return;

    mat4_t model = mat4_translate(body->world_pos);
    mat4_t mvp   = mat4_mul(vp, model);

    const water_config_t* water = config_water();

    float ub_v[20] = { 0 };
    memcpy(ub_v, mvp.m, sizeof(mvp.m));
    ub_v[16] = R.time_seconds;
    ub_v[17] = water->swell_amplitude;
    sg_apply_uniforms(0, &(sg_range){ .ptr = ub_v, .size = sizeof(ub_v) });

    /* Layout (std140, 24 floats):
     *   [0..2]   u_camera_pos    + [3]  pad
     *   [4..6]   u_sun_dir       + [7]  pad
     *   [8]      u_time          + [9..11] pad
     *   [12..15] u_water_params  (shine, shine_power, foam_threshold, fog_distance)
     *   [16..19] u_water_params2 (opacity_low, opacity_high, refraction_amount, _)
     *   [20..22] u_water_fog     + [23] pad
     */
    float ub_f[24] = { 0 };
    ub_f[0] = camera_world.x;  ub_f[1] = camera_world.y;  ub_f[2] = camera_world.z;
    ub_f[4] = R.env.sun_dir.x; ub_f[5] = R.env.sun_dir.y; ub_f[6] = R.env.sun_dir.z;
    ub_f[8]  = R.time_seconds;
    ub_f[12] = water->shine;
    ub_f[13] = water->shine_power;
    ub_f[14] = water->foam_threshold;
    ub_f[15] = water->fog_distance_m;
    ub_f[16] = water->opacity_low;
    ub_f[17] = water->opacity_high;
    ub_f[18] = water->refraction_amount;
    ub_f[20] = water->fog_color.x;
    ub_f[21] = water->fog_color.y;
    ub_f[22] = water->fog_color.z;
    sg_apply_uniforms(1, &(sg_range){ .ptr = ub_f, .size = sizeof(ub_f) });

    for (int ci = 0; ci < CHUNK_COUNT; ++ci) {
        mesh_chunk_t* c = &body->chunks[ci];
        if (c->last_uploaded_water_idx_count <= 0) continue;
        sg_apply_bindings(&(sg_bindings){
            .vertex_buffers[0] = c->water_vbuf,
            .index_buffer      = c->water_ibuf,
        });
        sg_draw(0, c->last_uploaded_water_idx_count, 1);
        R.tris += (size_t)c->last_uploaded_water_idx_count / 3;
    }
}

void renderer_draw_world(mat4_t view, mat4_t proj, world_t* world,
                         vec3_t camera_world, float dt_seconds) {
    R.time_seconds += dt_seconds;
    R.tris = 0;

    /* Auto-discover the active body if main_web hasn't pre-registered
     * it: register the world it's calling us with, and mark active. */
    bool found = false;
    for (int i = 0; i < R.body_count; ++i) {
        if (R.bodies[i].world == world) { found = true; break; }
    }
    if (!found) {
        renderer_register_world(world);
    }
    /* The body whose world matches the world arg is the one editing.
     * If it's not the current active body, switch. */
    int target_active = -1;
    for (int i = 0; i < R.body_count; ++i) {
        if (R.bodies[i].world == world) { target_active = i; break; }
    }
    if (target_active >= 0 && target_active != R.active_body_idx) {
        if (R.active_body_idx >= 0) R.bodies[R.active_body_idx].is_active = false;
        R.active_body_idx = target_active;
        R.bodies[target_active].is_active = true;
    }

    /* Edit handling — every meshed body. world_set on any world
     * (Tenebris or a moon under teleport) marks that body's tiles
     * dirty; we rebuild and re-upload the affected chunks.
     *
     * Bodies that haven't been demand-loaded yet have tile_to_chunk
     * == NULL — skip them. Their dirty bits are still set from
     * gen_tile (cleared by body_full_mesh once it runs), but we
     * can't act on them until allocation, and we don't need to:
     * body_load_detail will mesh from scratch when the body comes
     * into LOD range. */
    bool any_grew = false;
    for (int bi = 0; bi < R.body_count; ++bi) {
        chunked_body_t* body = &R.bodies[bi];
        if (!body->meshed || !body->tile_to_chunk) continue;
        bool body_grew[CHUNK_COUNT] = { 0 };
        for (int i = 0; i < body->world->tile_count; ++i) {
            if (!world_tile_dirty(body->world, i)) continue;
            body->chunks[body->tile_to_chunk[i]].dirty = true;
            world_tile_clear_dirty(body->world, i);
        }
        for (int ci = 0; ci < CHUNK_COUNT; ++ci) {
            if (!body->chunks[ci].dirty) continue;
            body_chunk_rebuild_full(body, ci);
            body->chunks[ci].dirty = false;
            body_grew[ci] = true;
            any_grew = true;
        }
        for (int ci = 0; ci < CHUNK_COUNT; ++ci) {
            if (body_grew[ci]) chunk_upload(&body->chunks[ci]);
        }
    }
    (void)any_grew;

    /* Periodic diagnostic — every ~2 s flag any chunks on the active
     * body that have last_uploaded_index_count == 0, with their
     * distance from the player. Helps narrow down "this chunk under
     * me isn't loading" reports. */
    static double s_log_accum = 0.0;
    s_log_accum += (double)dt_seconds;
    if (s_log_accum > 2.0 && R.active_body_idx >= 0) {
        s_log_accum = 0.0;
        chunked_body_t* active = &R.bodies[R.active_body_idx];
        int missing = 0;
        for (int ci = 0; ci < CHUNK_COUNT; ++ci) {
            mesh_chunk_t* c = &active->chunks[ci];
            if (c->last_uploaded_index_count > 0) continue;
            ++missing;
            vec3_t anchor_local = (vec3_t){
                (float)CHUNK_ANCHORS[ci].x * active->radius_m,
                (float)CHUNK_ANCHORS[ci].y * active->radius_m,
                (float)CHUNK_ANCHORS[ci].z * active->radius_m,
            };
            vec3_t anchor_world = vec3_add(anchor_local, active->world_pos);
            vec3_t delta = vec3_sub(anchor_world, camera_world);
            float dist = vec3_length(delta);
            int tile_count = 0;
            for (int i = 0; i < active->world->tile_count; ++i) {
                if (active->tile_to_chunk[i] == ci) ++tile_count;
            }
            printf("[renderer] MISSING chunk %d on %s: %d tiles, dist=%.1fm, idx_count=%d\n",
                   ci, active->world->body->name, tile_count, dist,
                   c->last_uploaded_index_count);
        }
        if (missing == 0) {
            /* Once-per-2s heartbeat so we can confirm the diagnostic is
             * still running and chunks are still loaded. */
            int total_idx = 0;
            for (int ci = 0; ci < CHUNK_COUNT; ++ci) {
                total_idx += R.bodies[R.active_body_idx].chunks[ci].last_uploaded_index_count;
            }
            printf("[renderer] all %d chunks loaded on %s (%d total indices)\n",
                   CHUNK_COUNT, active->world->body->name, total_idx);
        }
        fflush(stdout);
    }

    /* Draw all bodies' chunked terrain. The active body usually gets
     * drawn first because its world position is at or near the camera;
     * draw order doesn't matter for opaque depth-tested geometry. */
    mat4_t vp = mat4_mul(proj, view);
    /* Skip every chunk draw when the debug toggle is off. Buffers
     * stay populated; flipping the toggle back on shows everything
     * the next frame. The atmosphere + sky / sun / distant-LOD passes
     * still run so we can verify those in isolation. */
    if (R_TERRAIN_VISIBLE) {
    sg_apply_pipeline(R.pip_hex);
    float light_ub[8] = {
        R.env.sun_dir.x, R.env.sun_dir.y, R.env.sun_dir.z, 0.0f,
        R.env.ambient.x, R.env.ambient.y, R.env.ambient.z, 0.0f,
    };
    sg_apply_uniforms(1, &(sg_range){ .ptr = light_ub, .size = sizeof(light_ub) });

    /* Frustum + LOD culling — far bodies drop to a single icosphere
     * draw via renderer_draw_moons. Detailed (chunked) draws happen
     * here for any body that's both visible and close enough. */
    frustum_plane_t frustum[6];
    extract_frustum(vp, frustum);
    const float LOD_RATIO = 0.12f;

    for (int bi = 0; bi < R.body_count; ++bi) {
        chunked_body_t* body = &R.bodies[bi];
        const bool is_active = (bi == R.active_body_idx);

        /* Frustum culling — at body granularity. We DON'T cull the
         * active body: its bounding sphere is mostly behind the
         * camera whenever the player stands on the surface and looks
         * toward the horizon (the sphere centre is r ≈ planet_radius
         * metres behind the near plane), so sphere_visible would
         * erroneously cut all of Tenebris. The active body is also
         * the one the player can be touching mountains on, so we
         * explicitly want every chunk drawn — the user's request:
         * "DONOT cull chunks that I am standing on or that are
         * adjacent to the ones im on". For non-active bodies we
         * still run the cull, but with a 1.5× radius pad to keep
         * tall mountains and the atmosphere shell inside the
         * conservative bounds. */
        if (!is_active &&
            !sphere_visible(frustum, body->world_pos, body->radius_m * 1.5f))
            continue;
        vec3_t delta = vec3_sub(body->world_pos, camera_world);
        float  dist  = vec3_length(delta);
        if (dist < 1.0f) dist = 1.0f;
        /* The active body is by definition close enough to count as
         * detailed. For others, swap to the icosphere LOD when small. */
        const bool distant = !is_active && (body->radius_m / dist) < LOD_RATIO;
        if (distant) continue;
        if (!body->meshed) body_load_detail(body);
        body_draw_chunks(body, vp);
    }

    /* Water pass — blended on top of the opaque terrain. Same
     * "active body bypasses cull" rule as the opaque pass. */
    sg_apply_pipeline(R.pip_water);
    for (int bi = 0; bi < R.body_count; ++bi) {
        chunked_body_t* body = &R.bodies[bi];
        if (!body->has_water) continue;
        const bool is_active = (bi == R.active_body_idx);
        if (!is_active &&
            !sphere_visible(frustum, body->world_pos, body->radius_m * 1.5f))
            continue;
        vec3_t delta = vec3_sub(body->world_pos, camera_world);
        float  dist  = vec3_length(delta);
        if (dist < 1.0f) dist = 1.0f;
        const bool distant = !is_active && (body->radius_m / dist) < LOD_RATIO;
        if (distant) continue;
        body_draw_water(body, vp, camera_world);
    }
    }   /* end of if (R_TERRAIN_VISIBLE) */
}

void renderer_end_frame(void) {
    sg_end_pass();
    sg_commit();
}

size_t renderer_triangles_drawn_this_frame(void) { return R.tris; }
size_t renderer_tiles_drawn_this_frame(void)     {
    if (R.active_body_idx < 0) return 0;
    return (size_t)R.bodies[R.active_body_idx].mesh_cursor;
}
size_t renderer_tiles_remeshed_this_frame(void)  { return R.tiles_remeshed; }

void renderer_chunk_count(int* out_chunks, int* out_tiles_meshed) {
    if (out_chunks) *out_chunks = CHUNK_COUNT;
    if (out_tiles_meshed) {
        *out_tiles_meshed = (R.active_body_idx >= 0)
            ? R.bodies[R.active_body_idx].mesh_cursor : 0;
    }
}

/* Debug: hide/show the chunked terrain draws. Chunks themselves and
 * their GPU buffers stay live — flipping the toggle back on shows
 * everything immediately without re-meshing. The static is declared
 * up near the forward-decl block so renderer_draw_world can read it. */
void renderer_set_terrain_visible(bool v) { R_TERRAIN_VISIBLE = v; }
bool renderer_terrain_visible(void)        { return R_TERRAIN_VISIBLE; }
