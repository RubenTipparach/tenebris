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

/* 2048 tiles/frame finishes Tenebris (40 962 tiles) in ~20 frames
 * (~330 ms) — a single beat of "loading…" rather than the previous
 * 1.3 s wait. WASM single-threaded mesh time stays under the 16 ms
 * frame budget at this rate. */
#define MESH_BUDGET_PER_FRAME  2048
/* Per-chunk vertex / index caps. With WORLD_MAX_DEPTH=128 a full mountain
 * column emits 6+ side quads per layer, so a single chunk of ~1300 tiles
 * stays well under 256 K vertices. We over-allocate moderately so the
 * GPU buffer never has to grow. */
#define MAX_VERTICES           (256u << 10)  /* 256 K verts / chunk (~8 MB)  */
#define MAX_INDICES            (768u << 10)  /* 768 K idx  / chunk (~3 MB)   */
#define WATER_VERTICES         (32u  << 10)  /* 32 K verts / chunk           */
#define WATER_INDICES          (96u  << 10)  /* 96 K idx   / chunk           */

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
 * dirty chunk can be re-uploaded in isolation. */
typedef struct {
    sg_buffer  vbuf;
    sg_buffer  ibuf;
    sg_buffer  water_vbuf;
    sg_buffer  water_ibuf;
    hex_mesh_t mesh;
    hex_mesh_t water_mesh;
    int        last_uploaded_index_count;
    int        last_uploaded_water_idx_count;
    bool       dirty;          /* tiles inside this chunk need rebuild */
    bool       streamed;       /* all owned tiles have been meshed once */
} mesh_chunk_t;

static struct {
    sg_pipeline pip_hex;
    sg_pipeline pip_water;     /* translucent, wave-animated cap layer */
    sg_pipeline pip_sky;       /* fullscreen atmosphere + starfield     */
    sg_pipeline pip_distant;   /* flat-shaded unit icosphere (far LOD)  */
    sg_pipeline pip_sun;       /* emissive sun sphere                   */
    sg_buffer   distant_vbuf;
    sg_buffer   distant_ibuf;
    int         distant_index_count;
    /* Smooth UV sphere — used by the sun (front-face emissive). */
    sg_buffer   uvsphere_vbuf;
    sg_buffer   uvsphere_ibuf;
    int         uvsphere_index_count;
    sg_image    atlas_img;
    sg_view     atlas_view;
    sg_sampler  atlas_smp;

    /* Per-chunk world meshes. CHUNKS[i] owns a slice of tiles assigned
     * by tile_to_chunk[]. */
    mesh_chunk_t chunks[CHUNK_COUNT];
    int*         tile_to_chunk;          /* tile_idx -> chunk index, NULL until init */
    int          tile_to_chunk_count;    /* size of tile_to_chunk array */
    /* Streaming order: tiles are meshed in this order rather than 0..N
     * so the chunk under the player's feet pops in first. Built once
     * from the spawn camera direction. */
    int*         stream_order;
    int          mesh_cursor;            /* index into stream_order — feeds chunks */

    float       time_seconds;            /* for water wave animation */

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
        vec3_t         distant_color;   /* flat colour for the far-LOD sphere */
    } moons[32];
    int moon_count;
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

/* Distant-body pipeline — a flat-shaded 20-face icosphere scaled to
 * the body's radius, used when the body subtends less than ~20 % of
 * the viewport. No atlas sampling, no wave effects — a single solid
 * colour driven by tileset + body flags. */
static const char* VS_DISTANT =
    "#version 300 es\n"
    "layout(location=0) in vec3 a_pos;\n"
    "layout(location=1) in vec3 a_normal;\n"
    "uniform mat4 u_mvp;\n"
    "uniform vec3 u_color;\n"
    "uniform vec3 u_sun_dir;\n"
    "uniform vec3 u_ambient;\n"
    "out vec3 v_color;\n"
    "void main() {\n"
    "  gl_Position = u_mvp * vec4(a_pos, 1.0);\n"
    "  float ndl = max(dot(normalize(a_normal), normalize(u_sun_dir)), 0.0);\n"
    "  v_color = u_color * (u_ambient + vec3(ndl));\n"
    "}\n";

static const char* FS_DISTANT =
    "#version 300 es\n"
    "precision highp float;\n"
    "in vec3 v_color;\n"
    "out vec4 frag_color;\n"
    "void main() { frag_color = vec4(v_color, 1.0); }\n";

/* Emissive sun. Uniformly bright disc with a soft fresnel-ish rim
 * so the silhouette glows slightly without bloom. The skybox shader
 * also draws a sun disc in pure direction-space — when the sphere
 * body is in front of the camera, this pipeline writes depth so the
 * sphere wins; when it's behind / outside the depth range, the
 * skybox disc is the visible sun. */
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
 * Implements the analytical Rayleigh + Mie ray-march from Bruneton 2008
 * (Precomputed Atmospheric Scattering) and O'Neil 2005 (GPU Gems 2 ch.16).
 * For runtime cost we stay in the analytical regime and skip the
 * precomputed transmittance LUT — the inner sun loop is short enough at
 * planet-scale (< 250 m radius) to afford it per-fragment.
 *
 * Steps for each fragment:
 *   1. Reconstruct world-space view direction from inverted VP.
 *   2. Intersect that ray with the atmosphere shell + planet sphere.
 *   3. Ray-march N samples along the segment inside the atmosphere.
 *   4. At each sample, march toward the sun to accumulate the optical
 *      depth the sunlight has travelled through, and add the local
 *      Rayleigh + Mie inscatter weighted by the combined transmittance.
 *   5. Apply the Rayleigh / Henyey-Greenstein-like Mie phase function
 *      based on cos(view, sun).
 *   6. Blend in stars + the sun disc behind the atmosphere so they
 *      fade out smoothly when scattering brightens the sky (daytime
 *      washout) and pop back in on the night side / above the
 *      atmosphere.
 *
 * `u_atmo_strength` cross-fades the whole atmosphere term to zero on
 * airless bodies (moons, asteroids) so the same shader handles both. */
static const char* VS_SKY =
    "#version 300 es\n"
    "out vec3 v_world_dir;\n"
    "uniform mat4 u_inv_vp;\n"
    "void main() {\n"
    /* Three-vertex fullscreen triangle: (-1,-1), (+3,-1), (-1,+3). */
    "  vec2 pos = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);\n"
    "  pos = pos * 2.0 - 1.0;\n"
    /* z = 1.0 puts us at the far plane so world geometry in front of\n"
     * it still wins the depth test when we keep depth writes off. */
    "  gl_Position = vec4(pos, 1.0, 1.0);\n"
    "  vec4 w = u_inv_vp * vec4(pos, 1.0, 1.0);\n"
    "  v_world_dir = w.xyz / w.w;\n"
    "}\n";

static const char* FS_SKY =
    "#version 300 es\n"
    "precision highp float;\n"
    "in vec3 v_world_dir;\n"
    "uniform vec3  u_sun_dir;\n"
    "uniform vec3  u_sun_color;\n"
    "uniform vec3  u_planet_center;\n"
    "uniform vec3  u_camera_pos;\n"
    "uniform vec4  u_atmo_params;\n"   /* x=planet_r, y=atmo_r, z=strength, w=unused */
    "out vec4 frag_color;\n"

    "float h31(vec3 p) {\n"
    "  p = fract(p * vec3(443.897, 441.423, 437.195));\n"
    "  p += dot(p, p.yzx + 19.19);\n"
    "  return fract((p.x + p.y) * p.z);\n"
    "}\n"

    /* Ray-sphere intersect. Returns vec2(t_near, t_far); t_near<0 means\n"
     * we're inside; t_far<0 means full miss. */
    "vec2 ray_sphere(vec3 ro, vec3 rd, vec3 c, float r) {\n"
    "  vec3 oc = ro - c;\n"
    "  float b = dot(oc, rd);\n"
    "  float k = dot(oc, oc) - r * r;\n"
    "  float disc = b * b - k;\n"
    "  if (disc < 0.0) return vec2(1.0, -1.0);\n"
    "  float s = sqrt(disc);\n"
    "  return vec2(-b - s, -b + s);\n"
    "}\n"

    "void main() {\n"
    "  vec3 d = normalize(v_world_dir);\n"

    /* Procedural stars — same hash scheme as before but kept dim
     * inside the atmosphere so they don't show through daylight. */
    "  vec3  c1 = floor(d * 180.0);\n"
    "  float r1 = h31(c1);\n"
    "  float star = smoothstep(0.9965, 1.0, r1);\n"
    "  vec3  c2 = floor(d * 420.0 + vec3(17.0, 53.0, 91.0));\n"
    "  float r2 = h31(c2);\n"
    "  star = max(star, smoothstep(0.9985, 1.0, r2) * 0.6);\n"

    /* Sun disc + glow (rendered behind the scattering — gets washed
     * by atmosphere transmittance the same as stars). */
    "  vec3 sun_n = normalize(u_sun_dir);\n"
    "  float sd = dot(d, sun_n);\n"
    "  float disc = smoothstep(0.9996, 0.9999, sd);\n"
    "  float glow = smoothstep(0.95, 0.9996, sd) * 0.25;\n"

    "  vec3 bg = vec3(0.01, 0.015, 0.035);\n"
    "  vec3 space_col = bg + vec3(star) * 0.9\n"
    "                  + u_sun_color * disc\n"
    "                  + u_sun_color * glow;\n"

    /* Atmosphere term (skipped entirely when strength is 0). */
    "  float strength = u_atmo_params.z;\n"
    "  if (strength <= 0.001) {\n"
    "    frag_color = vec4(space_col, 1.0);\n"
    "    return;\n"
    "  }\n"

    "  float Rg = u_atmo_params.x;\n"   /* planet radius */
    "  float Ra = u_atmo_params.y;\n"   /* atmosphere radius */
    "  float H  = max(Ra - Rg, 0.001);\n"

    /* Bruneton's standard scale heights (Earth-tuned). We rescale to\n"
     * the local atmosphere thickness H so the same look applies at\n"
     * Tenebris's 30 m shell as on a notional Earth. */
    "  float H_R = 0.250 * H;\n"        /* Rayleigh scale height */
    "  float H_M = 0.040 * H;\n"        /* Mie scale height       */

    /* Wavelength-tuned Rayleigh extinction (same constants Bruneton\n"
     * uses for the precomputed tables) and grey Mie. Magnitudes are\n"
     * scaled by 1/H so the integrated optical depth lands in a\n"
     * useful range at our small planet scale. */
    "  vec3  beta_R = vec3(5.8e-3, 13.5e-3, 33.1e-3) * (50.0 / H);\n"
    "  vec3  beta_M = vec3(4.0e-3) * (50.0 / H);\n"

    /* Phase functions. Rayleigh = 3/16π·(1+μ²); Mie = Henyey-Greenstein\n"
     * with g=0.76, the standard daytime Mie asymmetry. */
    "  float mu = sd;\n"
    "  float phase_R = 0.0596831 * (1.0 + mu * mu);\n"
    "  float g  = 0.76;\n"
    "  float gg = g * g;\n"
    "  float phase_M = (3.0 / (8.0 * 3.14159265)) * ((1.0 - gg) * (1.0 + mu * mu))\n"
    "                / ((2.0 + gg) * pow(1.0 + gg - 2.0 * g * mu, 1.5));\n"

    "  vec3 ro = u_camera_pos;\n"
    "  vec2 atmo_t = ray_sphere(ro, d, u_planet_center, Ra);\n"
    "  if (atmo_t.y < 0.0) {\n"
    /* No atmosphere along this ray — pure space. */
    "    frag_color = vec4(space_col, 1.0);\n"
    "    return;\n"
    "  }\n"

    "  vec2  planet_t = ray_sphere(ro, d, u_planet_center, Rg);\n"
    "  float t0 = max(0.0, atmo_t.x);\n"
    "  float t1 = atmo_t.y;\n"
    /* If the ray hits the planet first, terminate the integration\n"
     * there — those pixels will be covered by terrain anyway, but a\n"
     * correct horizon needs the segment to clip. */
    "  if (planet_t.x > 0.0 && planet_t.x < t1) t1 = planet_t.x;\n"
    "  if (t1 <= t0) {\n"
    "    frag_color = vec4(space_col, 1.0);\n"
    "    return;\n"
    "  }\n"

    /* View ray-march. 12 outer + 4 inner samples is enough for a\n"
     * smooth gradient at the planet scales we run; bumping these up\n"
     * removes banding at the cost of fragment shader time. */
    "  const int N_VIEW = 12;\n"
    "  const int N_LIGHT = 4;\n"
    "  float seg = (t1 - t0) / float(N_VIEW);\n"
    "  vec3  inscatter_R = vec3(0.0);\n"
    "  vec3  inscatter_M = vec3(0.0);\n"
    "  float od_view_R = 0.0;\n"
    "  float od_view_M = 0.0;\n"
    "  for (int i = 0; i < N_VIEW; ++i) {\n"
    "    vec3  p = ro + d * (t0 + (float(i) + 0.5) * seg);\n"
    "    float h = length(p - u_planet_center) - Rg;\n"
    "    if (h < 0.0) h = 0.0;\n"
    "    float dr = exp(-h / H_R) * seg;\n"
    "    float dm = exp(-h / H_M) * seg;\n"
    "    od_view_R += dr;\n"
    "    od_view_M += dm;\n"

    /* March from sample toward the sun to compute light-path optical\n"
     * depth. If we tunnel into the planet, the sun is occluded → drop\n"
     * this sample by setting a huge optical depth. */
    "    vec2  light_t = ray_sphere(p, sun_n, u_planet_center, Ra);\n"
    "    vec2  occ_t   = ray_sphere(p, sun_n, u_planet_center, Rg);\n"
    "    bool  occluded = (occ_t.x > 0.0);\n"
    "    if (!occluded) {\n"
    "      float lseg = light_t.y / float(N_LIGHT);\n"
    "      float od_light_R = 0.0;\n"
    "      float od_light_M = 0.0;\n"
    "      for (int j = 0; j < N_LIGHT; ++j) {\n"
    "        vec3 q = p + sun_n * (float(j) + 0.5) * lseg;\n"
    "        float hl = length(q - u_planet_center) - Rg;\n"
    "        if (hl < 0.0) hl = 0.0;\n"
    "        od_light_R += exp(-hl / H_R) * lseg;\n"
    "        od_light_M += exp(-hl / H_M) * lseg;\n"
    "      }\n"
    "      vec3 tau = beta_R * (od_view_R + od_light_R)\n"
    "               + beta_M * 1.1 * (od_view_M + od_light_M);\n"
    "      vec3 atten = exp(-tau);\n"
    "      inscatter_R += atten * dr;\n"
    "      inscatter_M += atten * dm;\n"
    "    }\n"
    "  }\n"

    /* Sky colour = sun radiance × (β·phase·∫density·T). */
    "  vec3 sun_irr = u_sun_color * 22.0;\n"   /* Bruneton's reference irradiance */
    "  vec3 sky = sun_irr * (inscatter_R * beta_R * phase_R\n"
    "                       + inscatter_M * beta_M * phase_M);\n"

    /* Background attenuation. Earlier versions multiplied `space_col`
     * by the per-pixel transmittance derived from the same N_VIEW
     * samples — but the discrete sum shifts step-wise as the camera
     * translates between samples, so stars visibly flickered. Use a
     * smooth analytical surrogate instead: density at the camera
     * altitude × a fixed effective slab thickness. Result depends
     * continuously on camera position, so stars hold still as the
     * player walks. */
    "  float h_cam = length(ro - u_planet_center) - Rg;\n"
    "  float h_norm = clamp(h_cam / H, 0.0, 1.0);\n"
    "  float density_cam = exp(-h_norm * 4.0);\n"
    "  vec3  bg_tau = (beta_R + beta_M * 1.1) * density_cam * H * 1.5;\n"
    "  vec3  bg_T   = exp(-bg_tau);\n"

    /* Blend the analytical sky over the space backdrop. strength<1\n"
     * smoothly fades to pure space so airless bodies share the\n"
     * shader without a branch. */
    "  vec3 col = mix(space_col, space_col * bg_T + sky, strength);\n"
    "  frag_color = vec4(col, 1.0);\n"
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

    /* Per-chunk GPU buffers are allocated lazily once the world is known
     * (renderer_init runs before world_create). For now just zero them. */
    for (int i = 0; i < CHUNK_COUNT; ++i) {
        memset(&R.chunks[i], 0, sizeof(R.chunks[i]));
    }

    /* Skybox pipeline — fullscreen triangle via gl_VertexID, no vbuf
     * bound. No depth write (so world geometry lands on top) and no
     * cull (the triangle is in clip-space). The fragment shader does
     * Bruneton-style ray-marched atmospheric scattering plus a
     * starfield + sun disc for airless / behind-the-atmosphere views. */
    sg_shader shd_sky = sg_make_shader(&(sg_shader_desc){
        .vertex_func.source   = VS_SKY,
        .fragment_func.source = FS_SKY,
        .uniform_blocks[0] = {
            .stage = SG_SHADERSTAGE_VERTEX,
            .size  = 16 * sizeof(float),
            .layout = SG_UNIFORMLAYOUT_STD140,
            .glsl_uniforms[0] = { .glsl_name = "u_inv_vp", .type = SG_UNIFORMTYPE_MAT4 },
        },
        .uniform_blocks[1] = {
            .stage = SG_SHADERSTAGE_FRAGMENT,
            /* std140: 5 vec4 slots = 20 floats. */
            .size  = 20 * sizeof(float),
            .layout = SG_UNIFORMLAYOUT_STD140,
            .glsl_uniforms[0] = { .glsl_name = "u_sun_dir",       .type = SG_UNIFORMTYPE_FLOAT3 },
            .glsl_uniforms[1] = { .glsl_name = "u_sun_color",     .type = SG_UNIFORMTYPE_FLOAT3 },
            .glsl_uniforms[2] = { .glsl_name = "u_planet_center", .type = SG_UNIFORMTYPE_FLOAT3 },
            .glsl_uniforms[3] = { .glsl_name = "u_camera_pos",    .type = SG_UNIFORMTYPE_FLOAT3 },
            .glsl_uniforms[4] = { .glsl_name = "u_atmo_params",   .type = SG_UNIFORMTYPE_FLOAT4 },
        },
        .label = "sky-shader",
    });
    R.pip_sky = sg_make_pipeline(&(sg_pipeline_desc){
        .shader = shd_sky,
        .depth = { .write_enabled = false, .compare = SG_COMPAREFUNC_LESS_EQUAL },
        .cull_mode = SG_CULLMODE_NONE,
        .label = "sky-pipeline",
    });

    /* Distant-LOD pipeline + shared unit icosphere mesh. 20 flat
     * triangles with per-face normals (duplicated vertices so each
     * face has its own normal = face normal). Vertex = pos+normal,
     * 24 bytes. */
    sg_shader shd_distant = sg_make_shader(&(sg_shader_desc){
        .vertex_func.source   = VS_DISTANT,
        .fragment_func.source = FS_DISTANT,
        .attrs = {
            [0].glsl_name = "a_pos",
            [1].glsl_name = "a_normal",
        },
        .uniform_blocks[0] = {
            .stage = SG_SHADERSTAGE_VERTEX,
            .size  = (16 + 4 + 4 + 4) * sizeof(float),   /* mat4 + 3 vec3+pad */
            .layout = SG_UNIFORMLAYOUT_STD140,
            .glsl_uniforms[0] = { .glsl_name = "u_mvp",     .type = SG_UNIFORMTYPE_MAT4 },
            .glsl_uniforms[1] = { .glsl_name = "u_color",   .type = SG_UNIFORMTYPE_FLOAT3 },
            .glsl_uniforms[2] = { .glsl_name = "u_sun_dir", .type = SG_UNIFORMTYPE_FLOAT3 },
            .glsl_uniforms[3] = { .glsl_name = "u_ambient", .type = SG_UNIFORMTYPE_FLOAT3 },
        },
        .label = "distant-shader",
    });
    R.pip_distant = sg_make_pipeline(&(sg_pipeline_desc){
        .shader = shd_distant,
        .layout = {
            .attrs = {
                [0] = { .format = SG_VERTEXFORMAT_FLOAT3 },
                [1] = { .format = SG_VERTEXFORMAT_FLOAT3 },
            },
            .buffers[0].stride = 6 * sizeof(float),
        },
        .index_type = SG_INDEXTYPE_UINT32,
        .depth = { .write_enabled = true, .compare = SG_COMPAREFUNC_LESS_EQUAL },
        .cull_mode = SG_CULLMODE_BACK,
        .face_winding = SG_FACEWINDING_CCW,
        .label = "distant-pipeline",
    });
    {
        /* Unit icosahedron: 12 vertices, 20 faces. We duplicate each
         * vertex per face so the shader gets flat face normals. */
        const double t = (1.0 + sqrt(5.0)) / 2.0;
        const double n = 1.0 / sqrt(1.0 + t * t);
        const double T = t * n;
        const float v[12][3] = {
            {(float)-n, (float)T, 0}, {(float)n, (float)T, 0},
            {(float)-n, (float)-T, 0}, {(float)n, (float)-T, 0},
            {0, (float)-n, (float)T}, {0, (float)n, (float)T},
            {0, (float)-n, (float)-T}, {0, (float)n, (float)-T},
            {(float)T, 0, (float)-n}, {(float)T, 0, (float)n},
            {(float)-T, 0, (float)-n}, {(float)-T, 0, (float)n},
        };
        static const int F[20][3] = {
            {0,11,5},{0,5,1},{0,1,7},{0,7,10},{0,10,11},
            {1,5,9},{5,11,4},{11,10,2},{10,7,6},{7,1,8},
            {3,9,4},{3,4,2},{3,2,6},{3,6,8},{3,8,9},
            {4,9,5},{2,4,11},{6,2,10},{8,6,7},{9,8,1},
        };
        float verts[20 * 3 * 6];
        uint32_t indices[20 * 3];
        for (int fi = 0; fi < 20; ++fi) {
            const float* a = v[F[fi][0]];
            const float* b = v[F[fi][1]];
            const float* c = v[F[fi][2]];
            float e1[3] = { b[0]-a[0], b[1]-a[1], b[2]-a[2] };
            float e2[3] = { c[0]-a[0], c[1]-a[1], c[2]-a[2] };
            float nrm[3] = {
                e1[1]*e2[2] - e1[2]*e2[1],
                e1[2]*e2[0] - e1[0]*e2[2],
                e1[0]*e2[1] - e1[1]*e2[0],
            };
            float len = sqrtf(nrm[0]*nrm[0] + nrm[1]*nrm[1] + nrm[2]*nrm[2]);
            nrm[0] /= len; nrm[1] /= len; nrm[2] /= len;
            for (int k = 0; k < 3; ++k) {
                const float* vp = (k == 0) ? a : (k == 1 ? b : c);
                float* vw = &verts[(fi * 3 + k) * 6];
                vw[0] = vp[0]; vw[1] = vp[1]; vw[2] = vp[2];
                vw[3] = nrm[0]; vw[4] = nrm[1]; vw[5] = nrm[2];
                indices[fi * 3 + k] = (uint32_t)(fi * 3 + k);
            }
        }
        R.distant_vbuf = sg_make_buffer(&(sg_buffer_desc){
            .data = { .ptr = verts, .size = sizeof(verts) },
            .label = "distant-vbuf",
        });
        R.distant_ibuf = sg_make_buffer(&(sg_buffer_desc){
            .usage.index_buffer = true,
            .data = { .ptr = indices, .size = sizeof(indices) },
            .label = "distant-ibuf",
        });
        R.distant_index_count = 60;
    }

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
    for (int i = 0; i < CHUNK_COUNT; ++i) {
        mesh_chunk_t* c = &R.chunks[i];
        if (c->mesh.vertices)       hex_mesh_free(&c->mesh);
        if (c->water_mesh.vertices) hex_mesh_free(&c->water_mesh);
        if (c->vbuf.id)        sg_destroy_buffer(c->vbuf);
        if (c->ibuf.id)        sg_destroy_buffer(c->ibuf);
        if (c->water_vbuf.id)  sg_destroy_buffer(c->water_vbuf);
        if (c->water_ibuf.id)  sg_destroy_buffer(c->water_ibuf);
    }
    free(R.tile_to_chunk); R.tile_to_chunk = NULL;
    free(R.stream_order);  R.stream_order  = NULL;
    for (int i = 0; i < R.moon_count; ++i) {
        sg_destroy_buffer(R.moons[i].vbuf);
        sg_destroy_buffer(R.moons[i].ibuf);
    }
    sg_destroy_view(R.atlas_view);
    sg_destroy_image(R.atlas_img);
    sg_destroy_sampler(R.atlas_smp);
    sg_destroy_pipeline(R.pip_hex);
    sg_destroy_pipeline(R.pip_water);
    sg_destroy_pipeline(R.pip_sky);
    sg_destroy_pipeline(R.pip_distant);
    sg_destroy_buffer(R.distant_vbuf);
    sg_destroy_buffer(R.distant_ibuf);
    sg_destroy_pipeline(R.pip_sun);
    sg_destroy_buffer(R.uvsphere_vbuf);
    sg_destroy_buffer(R.uvsphere_ibuf);
}

/* ----------------------------------------------------------------------- */
/* Invert a mat4. Generic inverse would be heavy; we use the fact that
 * the view-projection is a stack of translate + rotate + perspective
 * and just call Cramer's rule inline. Only used once per frame. */

static mat4_t mat4_inverse(mat4_t m) {
    /* Standard 4x4 inverse via cofactor expansion. Column-major like
     * our mat4_t.m[16]. Works as long as the matrix is invertible —
     * the view-projection always is. */
    const float* a = m.m;
    mat4_t o = {{0}};
    float* b = o.m;
    b[0]  =  a[5]*a[10]*a[15] - a[5]*a[11]*a[14] - a[9]*a[6]*a[15] + a[9]*a[7]*a[14] + a[13]*a[6]*a[11] - a[13]*a[7]*a[10];
    b[4]  = -a[4]*a[10]*a[15] + a[4]*a[11]*a[14] + a[8]*a[6]*a[15] - a[8]*a[7]*a[14] - a[12]*a[6]*a[11] + a[12]*a[7]*a[10];
    b[8]  =  a[4]*a[9]*a[15]  - a[4]*a[11]*a[13] - a[8]*a[5]*a[15] + a[8]*a[7]*a[13] + a[12]*a[5]*a[11] - a[12]*a[7]*a[9];
    b[12] = -a[4]*a[9]*a[14]  + a[4]*a[10]*a[13] + a[8]*a[5]*a[14] - a[8]*a[6]*a[13] - a[12]*a[5]*a[10] + a[12]*a[6]*a[9];
    b[1]  = -a[1]*a[10]*a[15] + a[1]*a[11]*a[14] + a[9]*a[2]*a[15] - a[9]*a[3]*a[14] - a[13]*a[2]*a[11] + a[13]*a[3]*a[10];
    b[5]  =  a[0]*a[10]*a[15] - a[0]*a[11]*a[14] - a[8]*a[2]*a[15] + a[8]*a[3]*a[14] + a[12]*a[2]*a[11] - a[12]*a[3]*a[10];
    b[9]  = -a[0]*a[9]*a[15]  + a[0]*a[11]*a[13] + a[8]*a[1]*a[15] - a[8]*a[3]*a[13] - a[12]*a[1]*a[11] + a[12]*a[3]*a[9];
    b[13] =  a[0]*a[9]*a[14]  - a[0]*a[10]*a[13] - a[8]*a[1]*a[14] + a[8]*a[2]*a[13] + a[12]*a[1]*a[10] - a[12]*a[2]*a[9];
    b[2]  =  a[1]*a[6]*a[15]  - a[1]*a[7]*a[14]  - a[5]*a[2]*a[15] + a[5]*a[3]*a[14] + a[13]*a[2]*a[7]  - a[13]*a[3]*a[6];
    b[6]  = -a[0]*a[6]*a[15]  + a[0]*a[7]*a[14]  + a[4]*a[2]*a[15] - a[4]*a[3]*a[14] - a[12]*a[2]*a[7]  + a[12]*a[3]*a[6];
    b[10] =  a[0]*a[5]*a[15]  - a[0]*a[7]*a[13]  - a[4]*a[1]*a[15] + a[4]*a[3]*a[13] + a[12]*a[1]*a[7]  - a[12]*a[3]*a[5];
    b[14] = -a[0]*a[5]*a[14]  + a[0]*a[6]*a[13]  + a[4]*a[1]*a[14] - a[4]*a[2]*a[13] - a[12]*a[1]*a[6]  + a[12]*a[2]*a[5];
    b[3]  = -a[1]*a[6]*a[11]  + a[1]*a[7]*a[10]  + a[5]*a[2]*a[11] - a[5]*a[3]*a[10] - a[9]*a[2]*a[7]   + a[9]*a[3]*a[6];
    b[7]  =  a[0]*a[6]*a[11]  - a[0]*a[7]*a[10]  - a[4]*a[2]*a[11] + a[4]*a[3]*a[10] + a[8]*a[2]*a[7]   - a[8]*a[3]*a[6];
    b[11] = -a[0]*a[5]*a[11]  + a[0]*a[7]*a[9]   + a[4]*a[1]*a[11] - a[4]*a[3]*a[9]  - a[8]*a[1]*a[7]   + a[8]*a[3]*a[5];
    b[15] =  a[0]*a[5]*a[10]  - a[0]*a[6]*a[9]   - a[4]*a[1]*a[10] + a[4]*a[2]*a[9]  + a[8]*a[1]*a[6]   - a[8]*a[2]*a[5];
    float det = a[0]*b[0] + a[1]*b[4] + a[2]*b[8] + a[3]*b[12];
    if (det == 0.0f) return mat4_identity();
    float inv_det = 1.0f / det;
    for (int i = 0; i < 16; ++i) b[i] *= inv_det;
    return o;
}

void renderer_draw_skybox(mat4_t view, mat4_t proj) {
    /* Strip the translation from `view` so the reconstructed world
     * direction is purely rotational — otherwise stars and the sun
     * disc parallax with the camera as if they were at finite
     * distance. The skybox should be rendered as a backdrop in
     * camera space, infinitely far away. The camera world position
     * is fed to the atmosphere shader separately as `u_camera_pos`
     * so the ray-march starts at the right point. */
    mat4_t view_rot = view;
    view_rot.m[12] = 0.0f;
    view_rot.m[13] = 0.0f;
    view_rot.m[14] = 0.0f;
    mat4_t vp = mat4_mul(proj, view_rot);
    mat4_t inv_vp = mat4_inverse(vp);
    sg_apply_pipeline(R.pip_sky);
    sg_apply_uniforms(0, &(sg_range){ .ptr = inv_vp.m, .size = sizeof(inv_vp.m) });
    /* std140 frag UB: vec3+pad, vec3+pad, vec3+pad, vec3+pad, vec4. */
    float ub[20] = { 0 };
    ub[0]  = R.env.sun_dir.x; ub[1]  = R.env.sun_dir.y; ub[2]  = R.env.sun_dir.z;
    /* Warm sun color. Slightly clipping white for the hot disc. */
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
    sg_apply_uniforms(1, &(sg_range){ .ptr = ub, .size = sizeof(ub) });
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
    /* Flat color for the distant-LOD sphere — derived from tileset +
     * body flags so each kind reads differently when pixel-sized. */
    vec3_t c;
    switch (w->body->tileset) {
        case TILESET_SEQUOIA:  c = (vec3_t){ 0.35f, 0.70f, 0.25f }; break;
        case TILESET_CRAG:     c = (vec3_t){ 0.70f, 0.30f, 0.18f }; break;
        case TILESET_FROST:    c = (vec3_t){ 0.55f, 0.75f, 0.95f }; break;
        case TILESET_ASTEROID: c = (vec3_t){ 0.35f, 0.32f, 0.30f }; break;
        default:
            if (w->body->icy)    c = (vec3_t){ 0.80f, 0.90f, 1.00f };
            else if (w->body->barren) c = (vec3_t){ 0.55f, 0.55f, 0.55f };
            else                 c = (vec3_t){ 0.30f, 0.45f, 0.60f };
            break;
    }
    R.moons[slot].distant_color = c;
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
    if (R.moon_count == 0) return;

    mat4_t vp_base = mat4_mul(proj, view);
    frustum_plane_t frustum[6];
    extract_frustum(vp_base, frustum);

    float light_ub[8] = {
        R.env.sun_dir.x, R.env.sun_dir.y, R.env.sun_dir.z, 0.0f,
        R.env.ambient.x, R.env.ambient.y, R.env.ambient.z, 0.0f,
    };

    /* Two passes: detailed bodies first (shared pip_hex + atlas),
     * distant-LOD bodies after (pip_distant, per-body color). Keeps
     * the pipeline binding count to one swap regardless of body count. */
    int detailed_idx[64], detailed_count = 0;
    int distant_idx[64],  distant_count  = 0;

    /* 20% of viewport ~= radius/distance < 0.1 for a 60deg FOV. Using
     * 0.12 as the cutoff so we don't swap to LOD exactly at the
     * visual boundary — there's a hysteresis margin in practice
     * because the player moves continuously. */
    const float LOD_RATIO = 0.12f;

    for (int i = 0; i < R.moon_count; ++i) {
        float radius = (float)R.moons[i].world->body->radius_m;
        if (!sphere_visible(frustum, R.moons[i].position, radius)) continue;

        /* angular_size ~= r / distance; distant threshold is r/d < LOD_RATIO. */
        vec3_t delta = vec3_sub(R.moons[i].position, camera_world);
        float  dist  = vec3_length(delta);
        if (dist < 1.0f) dist = 1.0f;
        const bool distant = (radius / dist) < LOD_RATIO;
        if (distant) {
            if (distant_count  < (int)(sizeof(distant_idx)  / sizeof(distant_idx[0])))  distant_idx[distant_count++]   = i;
        } else {
            if (detailed_count < (int)(sizeof(detailed_idx) / sizeof(detailed_idx[0]))) detailed_idx[detailed_count++] = i;
        }
    }

    /* ---- Detailed pass (atlas-textured merged Goldberg mesh). ---- */
    if (detailed_count > 0) {
        sg_apply_pipeline(R.pip_hex);
        for (int j = 0; j < detailed_count; ++j) {
            int i = detailed_idx[j];
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

    /* ---- Distant pass (flat-shaded icosphere). ---- */
    if (distant_count > 0) {
        sg_apply_pipeline(R.pip_distant);
        sg_apply_bindings(&(sg_bindings){
            .vertex_buffers[0] = R.distant_vbuf,
            .index_buffer      = R.distant_ibuf,
        });
        for (int j = 0; j < distant_count; ++j) {
            int i = distant_idx[j];
            float radius = (float)R.moons[i].world->body->radius_m;
            mat4_t model = mat4_mul(mat4_translate(R.moons[i].position),
                                    mat4_scale_uniform(radius));
            mat4_t mvp = mat4_mul(vp_base, model);
            /* Packed std140 uniform block: mat4 + 3x (vec3+pad). */
            float ub[16 + 12];
            memcpy(ub, mvp.m, sizeof(mvp.m));
            ub[16] = R.moons[i].distant_color.x;
            ub[17] = R.moons[i].distant_color.y;
            ub[18] = R.moons[i].distant_color.z;
            ub[19] = 0.0f;
            ub[20] = R.env.sun_dir.x; ub[21] = R.env.sun_dir.y; ub[22] = R.env.sun_dir.z; ub[23] = 0.0f;
            ub[24] = R.env.ambient.x; ub[25] = R.env.ambient.y; ub[26] = R.env.ambient.z; ub[27] = 0.0f;
            sg_apply_uniforms(0, &(sg_range){ .ptr = ub, .size = sizeof(ub) });
            sg_draw(0, R.distant_index_count, 1);
            R.tris += (size_t)R.distant_index_count / 3;
        }
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

/* Build a streaming order that visits tiles in descending dot product
 * with `player_dir` — i.e. nearest-to-camera first. Goldberg tile
 * indices are arbitrary (vertex order from the icosahedron subdivision)
 * so without this sort the chunk under the player loads at random
 * intervals during the streaming pass. With it, the immediate area is
 * meshed in the first few frames. */
static dvec3_t  STREAM_REF_DIR;
static dvec3_t* STREAM_TILE_CENTERS = NULL;
static int stream_compare(const void* a, const void* b) {
    int ia = *(const int*)a;
    int ib = *(const int*)b;
    double da = dvec3_dot(STREAM_TILE_CENTERS[ia], STREAM_REF_DIR);
    double db = dvec3_dot(STREAM_TILE_CENTERS[ib], STREAM_REF_DIR);
    if (da > db) return -1;
    if (da < db) return 1;
    return 0;
}

static void build_stream_order(world_t* w, vec3_t camera_world) {
    if (R.stream_order) return;
    R.stream_order = (int*)malloc((size_t)w->tile_count * sizeof(int));
    /* Reference direction = the camera's outward-radial on the planet.
     * For Tenebris (origin) this is just normalize(camera_world); for
     * a non-origin body the player's local-up does the same thing,
     * but we render Tenebris as the active world so this is fine. */
    dvec3_t ref = dvec3_make((double)camera_world.x,
                             (double)camera_world.y,
                             (double)camera_world.z);
    double rl = dvec3_length(ref);
    STREAM_REF_DIR = (rl > 0.0) ? dvec3_scale(ref, 1.0 / rl)
                                : dvec3_make(1, 0, 0);
    /* Snapshot tile centres for the comparator — qsort doesn't pass a
     * context pointer in C99. */
    STREAM_TILE_CENTERS = (dvec3_t*)malloc((size_t)w->tile_count * sizeof(dvec3_t));
    for (int i = 0; i < w->tile_count; ++i) {
        const goldberg_tile_t* t = goldberg_tile(w->grid, i);
        STREAM_TILE_CENTERS[i] = t->center;
        R.stream_order[i] = i;
    }
    qsort(R.stream_order, (size_t)w->tile_count, sizeof(int), stream_compare);
    free(STREAM_TILE_CENTERS); STREAM_TILE_CENTERS = NULL;
}

/* Allocate per-chunk CPU/GPU buffers + classify every tile into its
 * chunk. Idempotent — no-op once built for this world. */
static void ensure_chunks(world_t* w) {
    if (R.tile_to_chunk && R.tile_to_chunk_count == w->tile_count) return;
    if (!CHUNK_ANCHORS_BUILT) build_chunk_anchors();

    free(R.tile_to_chunk);
    R.tile_to_chunk = (int*)malloc((size_t)w->tile_count * sizeof(int));
    R.tile_to_chunk_count = w->tile_count;
    for (int i = 0; i < w->tile_count; ++i) {
        const goldberg_tile_t* t = goldberg_tile(w->grid, i);
        R.tile_to_chunk[i] = classify_tile(t->center);
    }

    char label[32];
    for (int i = 0; i < CHUNK_COUNT; ++i) {
        mesh_chunk_t* c = &R.chunks[i];
        if (c->mesh.vertices) continue;   /* already initialised */
        hex_mesh_init(&c->mesh);
        hex_mesh_init(&c->water_mesh);
        c->mesh.vertex_cap = MAX_VERTICES;
        c->mesh.vertices = (hex_vertex_t*)malloc(c->mesh.vertex_cap * sizeof(hex_vertex_t));
        c->mesh.index_cap = MAX_INDICES;
        c->mesh.indices = (uint32_t*)malloc(c->mesh.index_cap * sizeof(uint32_t));
        c->water_mesh.vertex_cap = WATER_VERTICES;
        c->water_mesh.vertices = (hex_vertex_t*)malloc(c->water_mesh.vertex_cap * sizeof(hex_vertex_t));
        c->water_mesh.index_cap = WATER_INDICES;
        c->water_mesh.indices = (uint32_t*)malloc(c->water_mesh.index_cap * sizeof(uint32_t));

        snprintf(label, sizeof(label), "world-vbuf-%d", i);
        c->vbuf = sg_make_buffer(&(sg_buffer_desc){
            .size = (size_t)MAX_VERTICES * sizeof(hex_vertex_t),
            .usage.stream_update = true,
            .label = label,
        });
        snprintf(label, sizeof(label), "world-ibuf-%d", i);
        c->ibuf = sg_make_buffer(&(sg_buffer_desc){
            .size = (size_t)MAX_INDICES * sizeof(uint32_t),
            .usage.stream_update = true,
            .usage.index_buffer  = true,
            .label = label,
        });
        snprintf(label, sizeof(label), "water-vbuf-%d", i);
        c->water_vbuf = sg_make_buffer(&(sg_buffer_desc){
            .size = (size_t)WATER_VERTICES * sizeof(hex_vertex_t),
            .usage.stream_update = true,
            .label = label,
        });
        snprintf(label, sizeof(label), "water-ibuf-%d", i);
        c->water_ibuf = sg_make_buffer(&(sg_buffer_desc){
            .size = (size_t)WATER_INDICES * sizeof(uint32_t),
            .usage.stream_update = true,
            .usage.index_buffer  = true,
            .label = label,
        });
    }
}

static void chunk_rebuild_full(world_t* w, int chunk_idx) {
    mesh_chunk_t* c = &R.chunks[chunk_idx];
    hex_mesh_reset(&c->mesh);
    hex_mesh_reset(&c->water_mesh);
    for (int i = 0; i < w->tile_count; ++i) {
        if (R.tile_to_chunk[i] != chunk_idx) continue;
        if (i >= w->gen_cursor) continue;        /* not yet generated */
        hex_mesh_build_tile(&c->mesh, w, i);
        hex_mesh_build_water(&c->water_mesh, w, i);
        R.tiles_remeshed++;
    }
}

static void chunk_upload(mesh_chunk_t* c) {
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

void renderer_draw_world(mat4_t view, mat4_t proj, world_t* world,
                         vec3_t camera_world, float dt_seconds) {
    ensure_chunks(world);
    build_stream_order(world, camera_world);
    R.time_seconds += dt_seconds;

    /* Stream mesh: each frame, mesh some newly-generated tiles into
     * their owning chunk in player-proximity order so the area under
     * the player's feet pops in first. Capped per frame so a single
     * frame doesn't spend too long in the mesher. Only tiles below
     * gen_cursor have block data. Builds both opaque terrain and
     * the water cap. */
    int budget = MESH_BUDGET_PER_FRAME;
    bool any_chunk_grew[CHUNK_COUNT] = { 0 };
    while (R.mesh_cursor < world->tile_count && budget > 0) {
        int idx = R.stream_order[R.mesh_cursor];
        if (idx >= world->gen_cursor) break;     /* not yet generated */
        int ci  = R.tile_to_chunk[idx];
        mesh_chunk_t* c = &R.chunks[ci];
        hex_mesh_build_tile(&c->mesh, world, idx);
        hex_mesh_build_water(&c->water_mesh, world, idx);
        /* Clear the dirty bit set by gen_tile() so the post-stream
         * rebuild loop only fires on real player edits, not every tile
         * that gen marked as needing first-time meshing. */
        world_tile_clear_dirty(world, idx);
        any_chunk_grew[ci] = true;
        R.mesh_cursor++;
        budget--;
        R.tiles_remeshed++;
    }

    /* Edits: any tile dirtied since last frame marks its chunk for
     * full rebuild. world_set already dirties the edited tile and its
     * neighbours so seam faces are fixed up; with chunked meshing
     * we additionally have to dirty the chunks of any cross-chunk
     * neighbours that touch the edit. */
    if (R.mesh_cursor >= world->tile_count) {
        for (int i = 0; i < world->tile_count; ++i) {
            if (!world_tile_dirty(world, i)) continue;
            R.chunks[R.tile_to_chunk[i]].dirty = true;
            world_tile_clear_dirty(world, i);
        }
        for (int ci = 0; ci < CHUNK_COUNT; ++ci) {
            if (!R.chunks[ci].dirty) continue;
            chunk_rebuild_full(world, ci);
            R.chunks[ci].dirty = false;
            any_chunk_grew[ci] = true;
        }
    }

    /* Upload changed chunks. While streaming, upload roughly every 16
     * tiles per chunk to spread GPU traffic; on edits, upload the
     * affected chunks immediately. */
    for (int ci = 0; ci < CHUNK_COUNT; ++ci) {
        if (any_chunk_grew[ci]) chunk_upload(&R.chunks[ci]);
    }

    /* Draw: one call per chunk. Pipeline / atlas binding stays the
     * same across chunks so this is just N vbuf/ibuf swaps. */
    sg_apply_pipeline(R.pip_hex);
    mat4_t vp = mat4_mul(proj, view);
    sg_apply_uniforms(0, &(sg_range){ .ptr = vp.m, .size = sizeof(vp.m) });
    float light_ub[8] = {
        R.env.sun_dir.x, R.env.sun_dir.y, R.env.sun_dir.z, 0.0f,
        R.env.ambient.x, R.env.ambient.y, R.env.ambient.z, 0.0f,
    };
    sg_apply_uniforms(1, &(sg_range){ .ptr = light_ub, .size = sizeof(light_ub) });
    R.tris = 0;
    for (int ci = 0; ci < CHUNK_COUNT; ++ci) {
        mesh_chunk_t* c = &R.chunks[ci];
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

    /* Water pass — blended on top of the opaque terrain. Procedural
     * shader; no atlas binding. Same N draws. */
    bool any_water = false;
    for (int ci = 0; ci < CHUNK_COUNT; ++ci) {
        if (R.chunks[ci].last_uploaded_water_idx_count > 0) { any_water = true; break; }
    }
    if (any_water) {
        sg_apply_pipeline(R.pip_water);
        float ub_v[20];
        memcpy(ub_v, vp.m, sizeof(vp.m));
        ub_v[16] = R.time_seconds;
        ub_v[17] = 0.0f; ub_v[18] = 0.0f; ub_v[19] = 0.0f;
        sg_apply_uniforms(0, &(sg_range){ .ptr = ub_v, .size = sizeof(ub_v) });

        float ub_f[12] = { 0 };
        ub_f[0] = camera_world.x;  ub_f[1] = camera_world.y;  ub_f[2] = camera_world.z;
        ub_f[4] = R.env.sun_dir.x; ub_f[5] = R.env.sun_dir.y; ub_f[6] = R.env.sun_dir.z;
        ub_f[8] = R.time_seconds;
        sg_apply_uniforms(1, &(sg_range){ .ptr = ub_f, .size = sizeof(ub_f) });

        for (int ci = 0; ci < CHUNK_COUNT; ++ci) {
            mesh_chunk_t* c = &R.chunks[ci];
            if (c->last_uploaded_water_idx_count <= 0) continue;
            sg_apply_bindings(&(sg_bindings){
                .vertex_buffers[0] = c->water_vbuf,
                .index_buffer      = c->water_ibuf,
            });
            sg_draw(0, c->last_uploaded_water_idx_count, 1);
            R.tris += (size_t)c->last_uploaded_water_idx_count / 3;
        }
    }
}

void renderer_end_frame(void) {
    sg_end_pass();
    sg_commit();
}

size_t renderer_triangles_drawn_this_frame(void) { return R.tris; }
size_t renderer_tiles_drawn_this_frame(void)     { return R.tris > 0 ? (size_t)R.mesh_cursor : 0; }
size_t renderer_tiles_remeshed_this_frame(void)  { return R.tiles_remeshed; }

void renderer_chunk_count(int* out_chunks, int* out_tiles_meshed) {
    if (out_chunks) *out_chunks = CHUNK_COUNT;
    if (out_tiles_meshed) *out_tiles_meshed = R.mesh_cursor;
}
