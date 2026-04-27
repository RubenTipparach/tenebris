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
    sg_pipeline pip_sky;       /* fullscreen starfield + sun disc       */
    sg_pipeline pip_distant;   /* flat-shaded unit icosphere (far LOD)  */
    sg_pipeline pip_sun;       /* emissive sun sphere                   */
    sg_pipeline pip_atmosphere; /* additive scattering shell            */
    sg_buffer   distant_vbuf;
    sg_buffer   distant_ibuf;
    int         distant_index_count;
    /* Shared smooth UV sphere — used by both the sun (front-face,
     * emissive) and per-planet atmospheres (back-face, additive
     * scattering). Position-only vertices. */
    sg_buffer   uvsphere_vbuf;
    sg_buffer   uvsphere_ibuf;
    int         uvsphere_index_count;
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
        vec3_t         distant_color;   /* flat colour for the far-LOD sphere */
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

/* Atmospheric scattering — port of src/shaders/atmosphere/atmosphere.frag
 * from the JS Tenebris source. GPU Gems 2 Chapter 16: ray-march from
 * camera through the atmosphere shell, integrating Rayleigh
 * (wavelength^-4) and Mie (Henyey-Greenstein) scattering. The mesh
 * is an inverted sphere of radius * 1.1 — backface culled so it
 * also draws when the camera is inside, since ray-sphere intersection
 * in the fragment shader covers both inside and outside cases. */
static const char* VS_ATMOSPHERE =
    "#version 300 es\n"
    "layout(location=0) in vec3 a_pos;\n"
    "uniform mat4 u_mvp;\n"
    "uniform mat4 u_model;\n"
    "out vec3 v_world_pos;\n"
    "void main() {\n"
    "  vec4 wp = u_model * vec4(a_pos, 1.0);\n"
    "  v_world_pos = wp.xyz;\n"
    "  gl_Position = u_mvp * vec4(a_pos, 1.0);\n"
    "}\n";

static const char* FS_ATMOSPHERE =
    "#version 300 es\n"
    "precision highp float;\n"
    "in vec3 v_world_pos;\n"
    "uniform vec3  u_planet_center;\n"
    "uniform float u_planet_radius;\n"
    "uniform float u_atmosphere_radius;\n"
    "uniform vec3  u_sun_dir;\n"
    "uniform vec3  u_viewer_pos;\n"
    "uniform vec3  u_atmosphere_tint;\n"
    "uniform float u_rayleigh_scale;\n"
    "uniform float u_mie_scale;\n"
    "uniform float u_mie_g;\n"
    "uniform float u_sun_intensity;\n"
    "out vec4 frag_color;\n"
    "const float PI = 3.14159265359;\n"
    "const int   MAX_SAMPLES = 8;\n"
    "const int   MAX_LIGHT_SAMPLES = 4;\n"
    /* Inverse-fourth-power wavelength weights for Rayleigh — blue
     * scatters ~3.5x more than red. */
    "const vec3  WAVELENGTHS_INV4 = vec3(5.602, 9.473, 19.644);\n"
    "const float SCALE_HEIGHT = 0.25;\n"
    "float h21(vec2 p) {\n"
    "  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);\n"
    "}\n"
    "float rayleigh_phase(float ct) { return 0.75 * (1.0 + ct * ct); }\n"
    "float mie_phase(float ct, float g) {\n"
    "  float g2 = g * g;\n"
    "  float d = 1.0 + g2 - 2.0 * g * ct;\n"
    "  return (1.0 - g2) / (4.0 * PI * pow(d, 1.5));\n"
    "}\n"
    "vec2 ray_sphere(vec3 ro, vec3 rd, vec3 c, float r) {\n"
    "  vec3 oc = ro - c;\n"
    "  float b = dot(oc, rd);\n"
    "  float k = dot(oc, oc) - r * r;\n"
    "  float disc = b * b - k;\n"
    "  if (disc < 0.0) return vec2(-1.0);\n"
    "  float s = sqrt(disc);\n"
    "  return vec2(-b - s, -b + s);\n"
    "}\n"
    "float density_at(vec3 p) {\n"
    "  float h = (length(p - u_planet_center) - u_planet_radius)\n"
    "          / (u_atmosphere_radius - u_planet_radius);\n"
    "  return exp(-clamp(h, 0.0, 1.0) / SCALE_HEIGHT);\n"
    "}\n"
    "float optical_depth(vec3 ro, vec3 rd, float len) {\n"
    "  float step = len / float(MAX_LIGHT_SAMPLES);\n"
    "  float d = 0.0;\n"
    "  for (int i = 0; i < MAX_LIGHT_SAMPLES; ++i) {\n"
    "    vec3 p = ro + rd * (step * (float(i) + 0.5));\n"
    "    d += density_at(p) * step;\n"
    "  }\n"
    "  return d;\n"
    "}\n"
    "void main() {\n"
    "  vec3 ro = u_viewer_pos;\n"
    "  vec3 rd = normalize(v_world_pos - u_viewer_pos);\n"
    "  vec2 atmos = ray_sphere(ro, rd, u_planet_center, u_atmosphere_radius);\n"
    "  if (atmos.y < 0.0) { frag_color = vec4(0.0); return; }\n"
    "  float t0 = max(0.0, atmos.x);\n"
    "  float t1 = atmos.y;\n"
    "  vec2 planet = ray_sphere(ro, rd, u_planet_center, u_planet_radius);\n"
    "  if (planet.x > 0.0) t1 = min(t1, planet.x);\n"
    "  if (t0 >= t1) { frag_color = vec4(0.0); return; }\n"
    "  float ray_len = t1 - t0;\n"
    "  float step = ray_len / float(MAX_SAMPLES);\n"
    "  vec3 sun = normalize(u_sun_dir);\n"
    "  float dither = h21(gl_FragCoord.xy) * 0.5;\n"
    "  vec3  rsum = vec3(0.0);\n"
    "  vec3  msum = vec3(0.0);\n"
    "  float od_r = 0.0;\n"
    "  float od_m = 0.0;\n"
    "  for (int i = 0; i < MAX_SAMPLES; ++i) {\n"
    "    vec3 p = ro + rd * (t0 + step * (float(i) + dither));\n"
    "    float h = length(p - u_planet_center);\n"
    "    if (h < u_planet_radius) continue;\n"
    "    float d = density_at(p);\n"
    "    od_r += d * step;\n"
    "    od_m += d * step;\n"
    "    vec2 sun_planet = ray_sphere(p, sun, u_planet_center, u_planet_radius);\n"
    "    if (sun_planet.x > 0.0) continue;\n"
    "    vec2 sun_atmos = ray_sphere(p, sun, u_planet_center, u_atmosphere_radius);\n"
    "    float sun_len = max(0.0, sun_atmos.y);\n"
    "    float sun_od  = optical_depth(p, sun, sun_len);\n"
    "    vec3 tau_r = u_rayleigh_scale * WAVELENGTHS_INV4 * (od_r + sun_od);\n"
    "    vec3 tau_m = vec3(u_mie_scale * (od_m + sun_od));\n"
    "    vec3 atten = exp(-(tau_r + tau_m));\n"
    "    rsum += d * atten * step;\n"
    "    msum += d * atten * step;\n"
    "  }\n"
    "  rsum *= u_rayleigh_scale * WAVELENGTHS_INV4;\n"
    "  msum *= u_mie_scale;\n"
    "  float ct = dot(rd, sun);\n"
    "  vec3 col = u_sun_intensity *\n"
    "             (rsum * rayleigh_phase(ct) + msum * mie_phase(ct, u_mie_g));\n"
    "  col *= u_atmosphere_tint;\n"
    "  col = 1.0 - exp(-col);\n"
    "  float a = clamp(length(col) * 1.5, 0.0, 0.95);\n"
    "  frag_color = vec4(col, a);\n"
    "}\n";

/* Starfield + sun skybox. Fullscreen triangle via gl_VertexID (no
 * vbuf needed). Vertex shader reconstructs the world-space view
 * direction by unprojecting the far-plane clip coordinates. Fragment
 * samples a 3D hash over the direction for procedural stars, and
 * renders the sun disc + soft glow from `dot(dir, sun)`. */
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
    "uniform vec3 u_sun_dir;\n"
    "uniform vec3 u_sun_color;\n"
    "out vec4 frag_color;\n"
    "float h31(vec3 p) {\n"
    "  p = fract(p * vec3(443.897, 441.423, 437.195));\n"
    "  p += dot(p, p.yzx + 19.19);\n"
    "  return fract((p.x + p.y) * p.z);\n"
    "}\n"
    "void main() {\n"
    "  vec3 d = normalize(v_world_dir);\n"
    /* Star field: quantise direction into cells, hash each cell, take
     * only the brightest few percent. Two octaves for mixed sizes. */
    "  vec3  c1 = floor(d * 180.0);\n"
    "  float r1 = h31(c1);\n"
    "  float star = smoothstep(0.9965, 1.0, r1);\n"
    "  vec3  c2 = floor(d * 420.0 + vec3(17.0, 53.0, 91.0));\n"
    "  float r2 = h31(c2);\n"
    "  star = max(star, smoothstep(0.9985, 1.0, r2) * 0.6);\n"

    /* Sun disc + soft glow. Tight threshold on dot(dir, sun). */
    "  float sd = dot(d, normalize(u_sun_dir));\n"
    "  float disc = smoothstep(0.9996, 0.9999, sd);\n"
    "  float glow = smoothstep(0.95, 0.9996, sd) * 0.25;\n"

    /* Space background: near-black with a faint subtle tint so the
     * eye doesn't strain. */
    "  vec3 bg = vec3(0.01, 0.015, 0.035);\n"
    "  vec3 col = bg + vec3(star) * 0.9\n"
    "           + u_sun_color * disc\n"
    "           + u_sun_color * glow;\n"
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

    /* Skybox pipeline — fullscreen triangle via gl_VertexID, no vbuf
     * bound. No depth write (so world geometry lands on top) and no
     * cull (the triangle is in clip-space). */
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
            .size  = 8 * sizeof(float),
            .layout = SG_UNIFORMLAYOUT_STD140,
            .glsl_uniforms[0] = { .glsl_name = "u_sun_dir",   .type = SG_UNIFORMTYPE_FLOAT3 },
            .glsl_uniforms[1] = { .glsl_name = "u_sun_color", .type = SG_UNIFORMTYPE_FLOAT3 },
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

    /* Atmosphere pipeline — back-face culled (so the camera sees the
     * inside of the inverted shell), additive blend, no depth write,
     * alpha test off. Single uniform block packs everything. */
    sg_shader shd_atmosphere = sg_make_shader(&(sg_shader_desc){
        .vertex_func.source   = VS_ATMOSPHERE,
        .fragment_func.source = FS_ATMOSPHERE,
        .attrs = { [0].glsl_name = "a_pos" },
        .uniform_blocks[0] = {
            .stage = SG_SHADERSTAGE_VERTEX,
            .size  = 32 * sizeof(float),    /* mat4 mvp + mat4 model */
            .layout = SG_UNIFORMLAYOUT_STD140,
            .glsl_uniforms[0] = { .glsl_name = "u_mvp",   .type = SG_UNIFORMTYPE_MAT4 },
            .glsl_uniforms[1] = { .glsl_name = "u_model", .type = SG_UNIFORMTYPE_MAT4 },
        },
        .uniform_blocks[1] = {
            .stage = SG_SHADERSTAGE_FRAGMENT,
            /* sokol std140: every member padded to 16 bytes (vec4)
             * regardless of type — same pattern used by the water FS
             * and distant-LOD blocks. 10 members * 4 floats = 40. */
            .size  = 40 * sizeof(float),
            .layout = SG_UNIFORMLAYOUT_STD140,
            .glsl_uniforms[0] = { .glsl_name = "u_planet_center",     .type = SG_UNIFORMTYPE_FLOAT3 },
            .glsl_uniforms[1] = { .glsl_name = "u_planet_radius",     .type = SG_UNIFORMTYPE_FLOAT },
            .glsl_uniforms[2] = { .glsl_name = "u_atmosphere_radius", .type = SG_UNIFORMTYPE_FLOAT },
            .glsl_uniforms[3] = { .glsl_name = "u_sun_dir",           .type = SG_UNIFORMTYPE_FLOAT3 },
            .glsl_uniforms[4] = { .glsl_name = "u_viewer_pos",        .type = SG_UNIFORMTYPE_FLOAT3 },
            .glsl_uniforms[5] = { .glsl_name = "u_atmosphere_tint",   .type = SG_UNIFORMTYPE_FLOAT3 },
            .glsl_uniforms[6] = { .glsl_name = "u_rayleigh_scale",    .type = SG_UNIFORMTYPE_FLOAT },
            .glsl_uniforms[7] = { .glsl_name = "u_mie_scale",         .type = SG_UNIFORMTYPE_FLOAT },
            .glsl_uniforms[8] = { .glsl_name = "u_mie_g",             .type = SG_UNIFORMTYPE_FLOAT },
            .glsl_uniforms[9] = { .glsl_name = "u_sun_intensity",     .type = SG_UNIFORMTYPE_FLOAT },
        },
        .label = "atmosphere-shader",
    });
    R.pip_atmosphere = sg_make_pipeline(&(sg_pipeline_desc){
        .shader = shd_atmosphere,
        .layout = {
            .attrs = { [0] = { .format = SG_VERTEXFORMAT_FLOAT3 } },
            .buffers[0].stride = 3 * sizeof(float),
        },
        .index_type = SG_INDEXTYPE_UINT32,
        .depth = { .write_enabled = false, .compare = SG_COMPAREFUNC_LESS_EQUAL },
        .colors[0].blend = {
            .enabled       = true,
            .src_factor_rgb   = SG_BLENDFACTOR_ONE,
            .dst_factor_rgb   = SG_BLENDFACTOR_ONE,
            .op_rgb           = SG_BLENDOP_ADD,
            .src_factor_alpha = SG_BLENDFACTOR_ONE,
            .dst_factor_alpha = SG_BLENDFACTOR_ONE,
            .op_alpha         = SG_BLENDOP_ADD,
        },
        /* Back-face cull: vertex winding is CCW from outside, so to
         * see the inside of the shell from a camera at any position
         * (inside or outside), cull the FRONT faces. */
        .cull_mode = SG_CULLMODE_FRONT,
        .face_winding = SG_FACEWINDING_CCW,
        .label = "atmosphere-pipeline",
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
    sg_destroy_pipeline(R.pip_sky);
    sg_destroy_pipeline(R.pip_distant);
    sg_destroy_buffer(R.distant_vbuf);
    sg_destroy_buffer(R.distant_ibuf);
    sg_destroy_pipeline(R.pip_sun);
    sg_destroy_pipeline(R.pip_atmosphere);
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
     * camera space, infinitely far away. */
    mat4_t view_rot = view;
    view_rot.m[12] = 0.0f;
    view_rot.m[13] = 0.0f;
    view_rot.m[14] = 0.0f;
    mat4_t vp = mat4_mul(proj, view_rot);
    mat4_t inv_vp = mat4_inverse(vp);
    sg_apply_pipeline(R.pip_sky);
    sg_apply_uniforms(0, &(sg_range){ .ptr = inv_vp.m, .size = sizeof(inv_vp.m) });
    float sun_ub[8] = {
        R.env.sun_dir.x, R.env.sun_dir.y, R.env.sun_dir.z, 0.0f,
        /* Warm sun color. Slightly clipping white for the hot disc. */
        1.40f, 1.25f, 0.90f, 0.0f,
    };
    sg_apply_uniforms(1, &(sg_range){ .ptr = sun_ub, .size = sizeof(sun_ub) });
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
/* Atmospheric scattering — one inverted UV sphere per body whose
 * config has has_atmosphere=true. Reads u_planet_center/_radius and
 * the per-body tint; the GPU Gems 2 ray-march in FS_ATMOSPHERE does
 * the rest. Render order: after world+water+moons, additive on top. */

static void draw_one_atmosphere(mat4_t vp, vec3_t camera_world,
                                vec3_t center, float planet_radius,
                                const float tint[3]) {
    /* Surface offset: terrain heights add ~MAX_LAND_HEIGHT (40) on
     * top of the sphere of `radius_m`, so the "effective surface"
     * for atmosphere math sits a bit inside `radius_m`. */
    const float SURFACE_OFFSET = 4.0f;
    float effective_radius = planet_radius - SURFACE_OFFSET;
    if (effective_radius < 1.0f) effective_radius = 1.0f;
    float atmosphere_radius = planet_radius * 1.10f;

    /* Cull when totally outside the atmosphere shell — saves a
     * full-sphere ray-march per off-screen body. */
    {
        vec3_t d = vec3_sub(camera_world, center);
        float dist = vec3_length(d);
        /* Inside = always render. Outside but within view = render.
         * Far away with a tiny on-screen size = skip via the
         * radius/distance ratio (matches the moon LOD threshold). */
        if (dist > atmosphere_radius * 200.0f) return;
    }

    mat4_t scale = mat4_identity();
    scale.m[0] = scale.m[5] = scale.m[10] = atmosphere_radius;
    mat4_t trans = mat4_translate(center);
    mat4_t model = mat4_mul(trans, scale);
    mat4_t mvp = mat4_mul(vp, model);

    /* VS uniforms: mvp + model. */
    float ub_v[32];
    memcpy(ub_v,      mvp.m,   sizeof(mvp.m));
    memcpy(ub_v + 16, model.m, sizeof(model.m));
    sg_apply_uniforms(0, &(sg_range){ .ptr = ub_v, .size = sizeof(ub_v) });

    /* Sun direction is per-body — toward the sun from the planet's
     * centre so atmospheric scattering reddens at the terminator on
     * each body independently. */
    vec3_t sun_dir = vec3_sub(R.env.sun_pos, center);
    float sd_len = vec3_length(sun_dir);
    if (sd_len > 0.0f) {
        sun_dir.x /= sd_len; sun_dir.y /= sd_len; sun_dir.z /= sd_len;
    } else {
        sun_dir = R.env.sun_dir;
    }

    /* FS uniforms — 10 members, each padded to 16 bytes (vec4). */
    float ub_f[40] = { 0 };
    ub_f[0]  = center.x; ub_f[1]  = center.y; ub_f[2]  = center.z;       /* u_planet_center */
    ub_f[4]  = effective_radius;                                          /* u_planet_radius */
    ub_f[8]  = atmosphere_radius;                                         /* u_atmosphere_radius */
    ub_f[12] = sun_dir.x; ub_f[13] = sun_dir.y; ub_f[14] = sun_dir.z;     /* u_sun_dir */
    ub_f[16] = camera_world.x; ub_f[17] = camera_world.y; ub_f[18] = camera_world.z; /* u_viewer_pos */
    ub_f[20] = tint[0]; ub_f[21] = tint[1]; ub_f[22] = tint[2];           /* u_atmosphere_tint */
    ub_f[24] = 0.015f;     /* u_rayleigh_scale — JS PlayerConfig default */
    ub_f[28] = 0.010f;     /* u_mie_scale */
    ub_f[32] = 0.85f;      /* u_mie_g — Henyey-Greenstein forward bias */
    ub_f[36] = 5.0f;       /* u_sun_intensity */
    sg_apply_uniforms(1, &(sg_range){ .ptr = ub_f, .size = sizeof(ub_f) });

    sg_apply_bindings(&(sg_bindings){
        .vertex_buffers[0] = R.uvsphere_vbuf,
        .index_buffer      = R.uvsphere_ibuf,
    });
    sg_draw(0, R.uvsphere_index_count, 1);
    R.tris += (size_t)R.uvsphere_index_count / 3;
}

void renderer_draw_atmospheres(mat4_t view, mat4_t proj, vec3_t camera_world,
                               world_t* active_world) {
    mat4_t vp = mat4_mul(proj, view);
    sg_apply_pipeline(R.pip_atmosphere);

    /* Active body — Tenebris (or whichever planet the player teleported
     * to). It lives at the world origin in our setup but we still
     * read body->pos_* for correctness if that ever changes. */
    if (active_world && active_world->body && active_world->body->has_atmosphere) {
        vec3_t c = (vec3_t){
            (float)active_world->body->pos_x,
            (float)active_world->body->pos_y,
            (float)active_world->body->pos_z,
        };
        draw_one_atmosphere(vp, camera_world, c,
                            (float)active_world->body->radius_m,
                            active_world->body->atmosphere_tint);
    }

    /* Registered moons / sister planets — Sequoia is the only other
     * has_atmosphere body today, but the loop is body-agnostic. */
    for (int i = 0; i < R.moon_count; ++i) {
        const body_config_t* b = R.moons[i].world->body;
        if (!b || !b->has_atmosphere) continue;
        draw_one_atmosphere(vp, camera_world, R.moons[i].position,
                            (float)b->radius_m, b->atmosphere_tint);
    }
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
