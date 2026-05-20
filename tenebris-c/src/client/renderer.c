#include "client/renderer.h"
#include "client/hex_mesher.h"
#include "client/net_client.h"
#include "client/profiler.h"
#include "client/torch.h"
#include "core/blocks.h"
#include "core/config.h"
#include "core/goldberg.h"
#include "core/planet_gen.h"
#include "core/world_light.h"
#include "core/world_water.h"

#include "sokol_gfx.h"
#include "sokol_app.h"

/* sokol-shdc-generated descriptors for shaders authored under
 * src/shaders/. The cmake/sokol-shdc.cmake module runs the cross-
 * compiler at build time and drops the generated headers into
 * ${CMAKE_BINARY_DIR}/generated/ which is on the include path. Each
 * header exposes <name>_shader_desc(), <name>_<block>_t structs,
 * ATTR_<name>_<attr>, and UB_<block> slot constants. */
#include "water.glsl.h"
#include "water_mobile.glsl.h"
#include "composite.glsl.h"
#include "composite_mobile.glsl.h"
#include "starfield.glsl.h"
#include "atmosphere.glsl.h"
#include "hex.glsl.h"
#include "distant.glsl.h"
#include "sun.glsl.h"
#include "sokol_glue.h"
#include "sokol_gl.h"
#include "sokol_log.h"
#include "sokol_time.h"

#define STB_IMAGE_IMPLEMENTATION
#include "stb_image.h"

#include <stddef.h>
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
    /* Per-body distant LOD textures. Albedo (RGBA8) carries the
     * baked biome colour + height tint + water blend; alpha is the
     * water mask the fragment shader uses to gate the sun-glint
     * specular layer. Normal (RGBA8) carries tangent-space dx/dy
     * derived from the procedural altitude gradient so the distant
     * planet picks up fine terrain shading the icosphere mesh is
     * too coarse to represent geometrically. Built alongside the
     * mesh; reset to {0} until both are populated. */
    sg_image     distant_tex_albedo;
    sg_image     distant_tex_normal;
    sg_view      distant_view_albedo;
    sg_view      distant_view_normal;
} chunked_body_t;

static struct {
    sg_pipeline pip_hex;
    sg_pipeline pip_water;       /* translucent, wave-animated cap layer */
    sg_pipeline pip_water_mobile;/* mobile-mode water: alpha-blended, no FBO sample */
    sg_pipeline pip_composite;   /* fullscreen blit of offscreen colour to swapchain */
    sg_pipeline pip_composite_mobile; /* mobile-mode composite: plain blit, no post-process */
    sg_sampler  smp_offscreen;       /* linear-clamp sampler for offscreen colour sampling */
    sg_sampler  smp_offscreen_depth; /* nearest-clamp sampler for offscreen depth (WebGL2 disallows linear-filtered depth) */
    sg_pipeline pip_starfield;     /* fullscreen stars + nebula              */
    sg_pipeline pip_atmosphere;    /* fullscreen alpha-blended scattering    */
    sg_buffer   fullscreen_tri_vbuf; /* 3-vert vec2 vbuf used by atmosphere  */
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

    /* Tileable water normal map sampled by water_mobile.glsl. Phones
     * burn a lot of fragment budget on the desktop water shader's
     * 3-octave fbm + 4-sample finite-difference gradient (~12 hashes/
     * pixel); on the mobile path we sample this pre-baked normal map
     * twice instead. The asset is baked offline by
     * tools/gen-water-normal.py from the same fbm shape, so the visual
     * character matches without the per-frame cost. */
    sg_image    water_normal_img;
    sg_view     water_normal_view;
    sg_sampler  water_normal_smp;

    /* Per-cell flow-direction arrow texture for the F5 debug overlay.
     * Pixel-art arrow pointing in +U, baked by
     * tools/gen-water-flow-arrow.py. The overlay draws one textured
     * quad per water cell with non-zero flow direction, oriented so
     * +U aligns with the flow vector. */
    sg_image    flow_arrow_img;
    sg_view     flow_arrow_view;
    sg_sampler  flow_arrow_smp;
    sgl_pipeline flow_arrow_pip;

    /* Shared linear-clamp sampler for the per-body distant LOD
     * textures (albedo + normal). One sampler binding satisfies both
     * texture slots; per-body image/view live in chunked_body_t. */
    sg_sampler  distant_lod_smp;

    /* Phase A scaffolding for FBO-based water (see WATER_STAGES.md).
     * Offscreen colour + depth render targets sized to the swapchain.
     * Created lazily in renderer_begin_frame once the window size is
     * known, recreated when the size changes (sokol attachments have
     * no in-place resize), destroyed at shutdown.
     *
     * sokol post-2024 attachment model: each render-target image is
     * paired with an sg_view of the matching attachment type
     * (.color_attachment / .depth_stencil_attachment); a separate
     * texture-view of the colour image lets later passes sample it
     * as a 2D texture. Nothing renders into or samples these yet —
     * A.1 only proves the create / destroy path compiles. */
    sg_image  offscreen_color;
    sg_image  offscreen_depth;
    sg_view   offscreen_color_att;  /* color_attachment view of offscreen_color */
    sg_view   offscreen_depth_att;  /* depth_stencil_attachment view of offscreen_depth */
    sg_view   offscreen_color_tex;  /* texture view of offscreen_color (sampled by water/composite) */
    sg_view   offscreen_depth_tex;  /* texture view of offscreen_depth (sampled by water for thickness/discard) */
    int       offscreen_w;
    int       offscreen_h;

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

    /* Relight-session blocking-cost tracker. Pairs world_light's
     * op-count / call-count session counters with the renderer's
     * wall-clock measurements of the synchronous relight loop
     * (body_chunk_rebuild_full / body_full_mesh), and prints a
     * one-shot console summary when world_light reports the session
     * drained back to clean. This is the measurement the user wants
     * to see for the "torches cause visible lag" symptom: how many
     * milliseconds the lighting rebuild blocked the frame, how many
     * frames it spread across, what triggered it.
     *
     * The tracker is bound to whichever world_t most recently had a
     * relight session active. Multi-body relights would need a
     * per-body version - in practice only the active body sees
     * torch / block edits so a single tracker is fine. */
    struct {
        const world_t* world;      /* which world is being relit       */
        bool     active;           /* a session is in progress         */
        uint64_t started_at;       /* stm_now() at first work frame    */
        double   block_ms_total;   /* sum of relight-loop wall-clock   */
        double   peak_call_ms;     /* worst single rebuild() call      */
        int      frames;           /* frames with relight work         */
        int      peak_iters;       /* worst loop-iter count in 1 frame */
        int      last_frame_iters; /* iters in current frame (resets)  */
    } relight_track;

    /* Per-frame counters reset by renderer_begin_frame. */
    double relight_loop_ms_this_frame;
    int    relight_iters_this_frame;
    double mesh_rebuild_ms_this_frame;
    int    chunks_remeshed_this_frame;
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

/* Same idea for water. Useful for isolating "is the thing I'm
 * seeing the water cap or something else?" debugging questions —
 * e.g. confirming whether the thin band on the planet horizon is
 * the far-side cap (it is) or leftover atmosphere geometry (no
 * such thing). */
static bool R_WATER_VISIBLE = true;

/* Same again for the skybox / atmosphere ray-march. The atmosphere
 * is a fullscreen shader pass, not geometry — but it produces a
 * sphere-shaped halo around the planet body that can be confused
 * for one. The starfield underneath always draws; toggling this
 * off only skips the atmosphere overlay so the space backdrop
 * stays visible. */
static bool R_SKYBOX_VISIBLE = true;

/* Water-flow debug overlay. F5 toggles. When true, after the water
 * cap draws each frame we iterate every water cell in the active body
 * and draw a coloured 3D arrow from the cell centre along the cell's
 * flow direction. Cells with no flow (worldgen ocean, sources, sleeping
 * cells) get nothing - the absence of an arrow IS the diagnostic. Lets
 * the operator see at a glance whether the simulator computed origins
 * for the cell they're staring at. */
static bool R_FLOW_DEBUG = false;

/* Perf mode (mobile / low-power). When true the renderer:
 *   - draws the water cap with the stripped water_mobile shader: no
 *     vertex swell, no screen-space refraction, no fbm-noise normal
 *     perturbation, no Snell-window backface branch. Keeps a cheap
 *     two-sine fragment-shader normal bump and alpha-blends on top
 *     of the swapchain composite.
 *   - blits the offscreen scene with composite_mobile: plain texture
 *     copy + depth forwarded via gl_FragDepth so subsequent water
 *     draws still depth-test against the opaque scene. No Beer-
 *     Lambert underwater fog, no shimmer distortion.
 *
 * Set via renderer_set_perf_mode() BEFORE renderer_init - it gates
 * which pipelines get built. Toggling after init does nothing
 * because the matching pipeline wouldn't exist on the other side.
 * main_web.c reads navigator.userAgent at boot to decide. */
static bool R_PERF_MODE = false;

void renderer_set_perf_mode(bool enabled) { R_PERF_MODE = enabled; }
bool renderer_perf_mode_enabled(void)     { return R_PERF_MODE; }

/* ----------------------------------------------------------------------- */

/* Hex / distant-body / sun shaders are sokol-shdc-managed under
 * src/shaders/{hex,distant,sun}.glsl — see the generated *.glsl.h
 * #includes above for the matching shader_desc functions, ATTR_*
 * slot constants, and *_params_t structs. */

/* Skybox is now two sokol-shdc shaders under src/shaders/:
 * starfield.glsl (stars + nebula, opaque) and atmosphere.glsl
 * (Bruneton scattering ray-march, alpha-blended overlay). The
 * runtime side calls both pipelines back-to-back from
 * renderer_draw_skybox. Generated headers expose
 * starfield_shader_desc / atmosphere_shader_desc plus the
 * matching _params_t structs and UB_*_params slot constants. */

/* Water shader source lives in tenebris-c/src/shaders/water.glsl,
 * cross-compiled at build time by sokol-shdc into water.glsl.h
 * (#included up top). The runtime side just calls
 * water_shader_desc(sg_query_backend()) and uploads vs_params_t /
 * fs_params_t structs — no manual std140 padding. */

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
        "assets/textures/grass.png",  /* 24 SEQ_LEAVES — same source, red-tinted */
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
        [24] = {1.45f, 0.30f, 0.30f},  /* SEQ_LEAVES — Sequoia red foliage */
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

/* Load the pre-baked water normal map. Bound only by the water_mobile
 * pipeline - the desktop water shader generates normals in-shader.
 * Repeat-wrap + bilinear so the texture tiles cleanly across the
 * sphere and the wave pattern stays smooth at oblique angles. */
static void load_water_normal(void) {
    stbi_set_flip_vertically_on_load(0);
    int w = 0, h = 0, c = 0;
    unsigned char* pix = stbi_load("assets/textures/water_normal.png",
                                     &w, &h, &c, 4);
    static const unsigned char fallback[4] = { 128, 128, 255, 255 };
    const unsigned char* upload = pix;
    if (!pix) {
        /* Asset missing: upload a 1x1 flat-blue so the sampler stays
         * valid. Mobile water reads as a glassy slab but doesn't
         * crash. */
        printf("[renderer] WARNING: assets/textures/water_normal.png "
               "missing; mobile water normals will be flat\n");
        upload = fallback;
        w = h = 1;
    } else {
        printf("[renderer] loaded water_normal.png %dx%d (channels=%d)\n",
               w, h, c);
    }
    fflush(stdout);
    R.water_normal_img = sg_make_image(&(sg_image_desc){
        .width = w, .height = h,
        .pixel_format = SG_PIXELFORMAT_RGBA8,
        .data.mip_levels[0] = { .ptr = upload, .size = (size_t)(w * h * 4) },
        .label = "water-normal",
    });
    R.water_normal_view = sg_make_view(&(sg_view_desc){
        .texture.image = R.water_normal_img,
        .label = "water-normal-view",
    });
    R.water_normal_smp = sg_make_sampler(&(sg_sampler_desc){
        .min_filter = SG_FILTER_LINEAR,
        .mag_filter = SG_FILTER_LINEAR,
        .wrap_u = SG_WRAP_REPEAT,
        .wrap_v = SG_WRAP_REPEAT,
        .label = "water-normal-sampler",
    });
    if (pix) stbi_image_free(pix);

    /* Shared sampler for the per-body distant-LOD albedo + normal
     * textures. Equirectangular wraps cleanly in U (longitude wraps
     * 360 deg) but NOT in V (latitude clamps at the poles), so use
     * repeat-clamp accordingly. Linear filtering keeps the noise
     * pattern smooth at the icosphere's tris. */
    R.distant_lod_smp = sg_make_sampler(&(sg_sampler_desc){
        .min_filter = SG_FILTER_LINEAR,
        .mag_filter = SG_FILTER_LINEAR,
        .wrap_u = SG_WRAP_REPEAT,
        .wrap_v = SG_WRAP_CLAMP_TO_EDGE,
        .label = "distant-lod-sampler",
    });
}

/* Load the F5 flow-arrow overlay texture. Same pattern as
 * load_water_normal: read the PNG, upload via sg_make_image, build a
 * NEAREST sampler so the pixel-art arrow stays crisp instead of
 * smearing when the quad is sampled at non-integer pixel ratios. */
static void load_flow_arrow(void) {
    stbi_set_flip_vertically_on_load(0);
    int w = 0, h = 0, c = 0;
    unsigned char* pix = stbi_load("assets/textures/water_flow_arrow.png",
                                     &w, &h, &c, 4);
    static const unsigned char fallback[4] = { 255, 255, 255, 0 };
    const unsigned char* upload = pix;
    if (!pix) {
        printf("[renderer] WARNING: assets/textures/water_flow_arrow.png "
               "missing; F5 flow-debug overlay will be invisible\n");
        upload = fallback;
        w = h = 1;
    }
    fflush(stdout);
    R.flow_arrow_img = sg_make_image(&(sg_image_desc){
        .width = w, .height = h,
        .pixel_format = SG_PIXELFORMAT_RGBA8,
        .data.mip_levels[0] = { .ptr = upload, .size = (size_t)(w * h * 4) },
        .label = "flow-arrow",
    });
    R.flow_arrow_view = sg_make_view(&(sg_view_desc){
        .texture.image = R.flow_arrow_img,
        .label = "flow-arrow-view",
    });
    R.flow_arrow_smp = sg_make_sampler(&(sg_sampler_desc){
        .min_filter = SG_FILTER_NEAREST,
        .mag_filter = SG_FILTER_NEAREST,
        .wrap_u = SG_WRAP_CLAMP_TO_EDGE,
        .wrap_v = SG_WRAP_CLAMP_TO_EDGE,
        .label = "flow-arrow-sampler",
    });
    if (pix) stbi_image_free(pix);
    /* The sgl_pipeline for this texture is lazy-created on first
     * F5 draw via ensure_flow_arrow_pip() - sgl_setup runs later
     * than renderer_init in init_pipelines_and_data, so calling
     * sgl_make_pipeline here would fire against an uninitialised
     * sokol_gl context. */
}

/* Lazy-create the textured-quad pipeline used by the F5 flow-arrow
 * overlay. Mirrors ensure_outline_pip() - only runs after sgl_setup
 * has run (mobile_ui_init in main_web.c init()), so we can't make the
 * pipeline up-front in load_flow_arrow alongside the texture / view /
 * sampler. */
static void ensure_flow_arrow_pip(void) {
    if (R.flow_arrow_pip.id != 0) return;
    R.flow_arrow_pip = sgl_make_pipeline(&(sg_pipeline_desc){
        .depth = {
            .compare       = SG_COMPAREFUNC_LESS_EQUAL,
            .write_enabled = false,
        },
        .colors[0].blend = {
            .enabled         = true,
            .src_factor_rgb  = SG_BLENDFACTOR_SRC_ALPHA,
            .dst_factor_rgb  = SG_BLENDFACTOR_ONE_MINUS_SRC_ALPHA,
            .src_factor_alpha= SG_BLENDFACTOR_ONE,
            .dst_factor_alpha= SG_BLENDFACTOR_ONE,
        },
    });
}

/* ----------------------------------------------------------------------- */

void renderer_init(void) {
    memset(&R, 0, sizeof(R));
    R.active_body_idx = -1;     /* no body registered yet */

    sg_shader shd = sg_make_shader(hex_shader_desc(sg_query_backend()));
    R.pip_hex = sg_make_pipeline(&(sg_pipeline_desc){
        .shader = shd,
        .layout = {
            .attrs = {
                /* Explicit offsets keep the auto-pack walker from
                 * skewing later attrs if any slot order drifts. The
                 * stride is the full hex_vertex_t (44 B) — both the
                 * hex pipeline (all 6 attrs) and the water pipeline
                 * (a_pos only) read from the same shared vbuf. */
                [ATTR_hex_a_pos]         = { .format = SG_VERTEXFORMAT_FLOAT3,
                                             .offset = (int)offsetof(hex_vertex_t, pos) },
                [ATTR_hex_a_normal]      = { .format = SG_VERTEXFORMAT_FLOAT3,
                                             .offset = (int)offsetof(hex_vertex_t, normal) },
                [ATTR_hex_a_uv]          = { .format = SG_VERTEXFORMAT_FLOAT2,
                                             .offset = (int)offsetof(hex_vertex_t, uv) },
                [ATTR_hex_a_sky_light]   = { .format = SG_VERTEXFORMAT_FLOAT,
                                             .offset = (int)offsetof(hex_vertex_t, sky_light) },
                [ATTR_hex_a_torch_light] = { .format = SG_VERTEXFORMAT_FLOAT,
                                             .offset = (int)offsetof(hex_vertex_t, torch_light) },
                [ATTR_hex_a_wet]         = { .format = SG_VERTEXFORMAT_FLOAT,
                                             .offset = (int)offsetof(hex_vertex_t, wet) },
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
    /* Shader descriptor + uniform-block layouts are generated by
     * sokol-shdc from src/shaders/water.glsl. Attribute slots come
     * from the same generated header (ATTR_water_a_*). */
    sg_shader shd_water = sg_make_shader(water_shader_desc(sg_query_backend()));
    R.pip_water = sg_make_pipeline(&(sg_pipeline_desc){
        .shader = shd_water,
        .layout = {
            .attrs = {
                /* a_pos for swell + radial-normal lookup; a_sky_light
                 * + a_torch_light for the per-vertex baked lighting.
                 * Normal + uv bytes between them are silently skipped
                 * via the shared 40-byte stride — explicit offsets
                 * keep the auto-pack walker from skewing later attrs
                 * if any slot order drifts. */
                [ATTR_water_a_pos] = {
                    .format = SG_VERTEXFORMAT_FLOAT3,
                    .offset = (int)offsetof(hex_vertex_t, pos),
                },
                /* a_normal drives the per-voxel water falling-bias.
                 * The ocean cap's faces are radial-out (alignment=1,
                 * bias suppressed); voxel water side quads carry
                 * horizontal normals (alignment=0, bias active). */
                [ATTR_water_a_normal] = {
                    .format = SG_VERTEXFORMAT_FLOAT3,
                    .offset = (int)offsetof(hex_vertex_t, normal),
                },
                /* a_uv carries per-vertex flow direction baked by the
                 * mesher (tile-local 2D, pointing away from the source
                 * cell on a top cap; zero on side walls / bottom caps).
                 * Fragment shader uses it as a horizontal noise-sample
                 * pan offset so the surface pattern visibly streams
                 * along the flow direction. */
                [ATTR_water_a_uv] = {
                    .format = SG_VERTEXFORMAT_FLOAT2,
                    .offset = (int)offsetof(hex_vertex_t, uv),
                },
                [ATTR_water_a_sky_light] = {
                    .format = SG_VERTEXFORMAT_FLOAT,
                    .offset = (int)offsetof(hex_vertex_t, sky_light),
                },
                [ATTR_water_a_torch_light] = {
                    .format = SG_VERTEXFORMAT_FLOAT,
                    .offset = (int)offsetof(hex_vertex_t, torch_light),
                },
            },
            .buffers[0].stride = sizeof(hex_vertex_t),
        },
        .index_type = SG_INDEXTYPE_UINT32,
        /* Water draws in the swapchain pass, AFTER compose blits the
         * offscreen scene onto the swapchain. The swapchain's depth
         * buffer was cleared at the start of that pass; water writes
         * its own depth here and uses LESS_EQUAL to sort fragments
         * against each other (so far-side waves don't pop in front
         * of near-side ones). Terrain-vs-water occlusion is still
         * done manually in the fragment shader by sampling the
         * offscreen depth texture and discarding fragments where
         * the opaque scene is in front of this water pixel. */
        .depth = { .write_enabled = true, .compare = SG_COMPAREFUNC_LESS_EQUAL },
        /* Cull none: when the camera dives below the cap (snorkelling
         * shoreline, hopping into a lake, etc.) the player needs to
         * see the cap from underneath, which is the back face. Doubles
         * the water-cap fill rate but the cap is one hexagon per tile
         * so the cost is negligible vs the render cost of the rest of
         * the scene. */
        .cull_mode = SG_CULLMODE_NONE,
        .face_winding = SG_FACEWINDING_CCW,
        /* Water shader outputs alpha = 1.0 (opaque). Shoreline fade
         * is done in-shader by mixing toward the unrefracted compose
         * sample, not via alpha-blend, so we don't double-count the
         * underwater scene. Blend stays disabled. */
        .colors[0].blend = { .enabled = false },
        .label = "water-pipeline",
    });

    /* Mobile / perf-mode water pipeline. Same vertex layout as the
     * desktop water pipeline (shares the chunk's water_vbuf/water_ibuf
     * via the identical hex_vertex_t feed), but the shader's fragment
     * stage skips every screen-sample + fbm cost and the pipeline runs
     * with src-alpha blending so the cap can sit on top of the
     * swapchain composite without needing an FBO sample. Only built
     * when R_PERF_MODE was set before renderer_init. */
    if (R_PERF_MODE) {
        sg_shader shd_water_mobile = sg_make_shader(water_mobile_shader_desc(sg_query_backend()));
        R.pip_water_mobile = sg_make_pipeline(&(sg_pipeline_desc){
            .shader = shd_water_mobile,
            .layout = {
                .attrs = {
                    [ATTR_water_mobile_a_pos] = {
                        .format = SG_VERTEXFORMAT_FLOAT3,
                        .offset = (int)offsetof(hex_vertex_t, pos),
                    },
                    /* a_normal drives the per-voxel water falling-bias
                     * on mobile, same way as desktop water. */
                    [ATTR_water_mobile_a_normal] = {
                        .format = SG_VERTEXFORMAT_FLOAT3,
                        .offset = (int)offsetof(hex_vertex_t, normal),
                    },
                    [ATTR_water_mobile_a_sky_light] = {
                        .format = SG_VERTEXFORMAT_FLOAT,
                        .offset = (int)offsetof(hex_vertex_t, sky_light),
                    },
                    [ATTR_water_mobile_a_torch_light] = {
                        .format = SG_VERTEXFORMAT_FLOAT,
                        .offset = (int)offsetof(hex_vertex_t, torch_light),
                    },
                },
                .buffers[0].stride = sizeof(hex_vertex_t),
            },
            .index_type = SG_INDEXTYPE_UINT32,
            /* Depth test against the swapchain depth that composite_mobile
             * forwarded from the offscreen pass, but DON'T write depth
             * for the water layer - that keeps transparent water from
             * occluding overlapping water tiles drawn later, same trick
             * Minecraft and friends use for translucent surfaces. */
            .depth = { .write_enabled = false, .compare = SG_COMPAREFUNC_LESS_EQUAL },
            .cull_mode = SG_CULLMODE_NONE,
            .face_winding = SG_FACEWINDING_CCW,
            /* Premultiplied-alpha src-alpha blend so the cap reads as a
             * semi-transparent layer over the seabed (the composite
             * pass already wrote the opaque terrain into the swapchain).
             * Shoreline pixels turn the seabed visible; deeper or
             * grazing-angle pixels stay closer to opaque. */
            .colors[0].blend = {
                .enabled         = true,
                .src_factor_rgb  = SG_BLENDFACTOR_SRC_ALPHA,
                .dst_factor_rgb  = SG_BLENDFACTOR_ONE_MINUS_SRC_ALPHA,
                .op_rgb          = SG_BLENDOP_ADD,
                .src_factor_alpha = SG_BLENDFACTOR_ONE,
                .dst_factor_alpha = SG_BLENDFACTOR_ONE_MINUS_SRC_ALPHA,
                .op_alpha        = SG_BLENDOP_ADD,
            },
            .label = "water-mobile-pipeline",
        });
    }

    /* Composite blit pipeline — Phase A.3. Draws a single fullscreen
     * triangle (gl_VertexIndex-based, no vbuf), samples the offscreen
     * colour image via R.offscreen_color_tex, writes to swapchain.
     * No depth, no blend — fully replaces whatever was on the
     * swapchain target before. */
    sg_shader shd_composite = sg_make_shader(composite_shader_desc(sg_query_backend()));
    R.pip_composite = sg_make_pipeline(&(sg_pipeline_desc){
        .shader = shd_composite,
        .index_type = SG_INDEXTYPE_NONE,
        .cull_mode = SG_CULLMODE_NONE,
        /* write_enabled = true + compare = ALWAYS + the shader writes
         * gl_FragDepth = scene_z_ndc. Forwards the offscreen depth
         * into the swapchain depth buffer so the deferred sokol_gl
         * flush (humanoid markers, etc.) has something real to test
         * against. Without this the swapchain depth stays cleared
         * and remote players draw over walls in front of them. */
        .depth = { .write_enabled = true, .compare = SG_COMPAREFUNC_ALWAYS },
        .label = "composite-pipeline",
    });
    if (R_PERF_MODE) {
        sg_shader shd_composite_mobile = sg_make_shader(composite_mobile_shader_desc(sg_query_backend()));
        R.pip_composite_mobile = sg_make_pipeline(&(sg_pipeline_desc){
            .shader = shd_composite_mobile,
            .index_type = SG_INDEXTYPE_NONE,
            .cull_mode = SG_CULLMODE_NONE,
            /* Depth write is enabled and compare is ALWAYS: we forward
             * the offscreen depth into gl_FragDepth so the swapchain
             * depth buffer ends up with a copy of the opaque scene's
             * depth. The subsequent water_mobile draw then uses normal
             * LESS_EQUAL depth testing against it, so mountains in
             * front of the water cap correctly occlude it. */
            .depth = { .write_enabled = true, .compare = SG_COMPAREFUNC_ALWAYS },
            .label = "composite-mobile-pipeline",
        });
    }
    R.smp_offscreen = sg_make_sampler(&(sg_sampler_desc){
        .min_filter = SG_FILTER_LINEAR,
        .mag_filter = SG_FILTER_LINEAR,
        .wrap_u = SG_WRAP_CLAMP_TO_EDGE,
        .wrap_v = SG_WRAP_CLAMP_TO_EDGE,
        .label = "offscreen-sampler",
    });
    /* Depth needs a separate sampler — WebGL2 disallows linear
     * filtering on depth textures sampled as regular sampler2D
     * (results are undefined / silently zero on most drivers). */
    R.smp_offscreen_depth = sg_make_sampler(&(sg_sampler_desc){
        .min_filter = SG_FILTER_NEAREST,
        .mag_filter = SG_FILTER_NEAREST,
        .wrap_u = SG_WRAP_CLAMP_TO_EDGE,
        .wrap_v = SG_WRAP_CLAMP_TO_EDGE,
        .label = "offscreen-depth-sampler",
    });

    /* Per-body chunk storage is allocated lazily by renderer_register_world
     * once we know the body's tile_count + radius. Nothing to do here. */

    /* Starfield + nebula pipeline (opaque base layer). Fullscreen
     * triangle via gl_VertexIndex, no vbuf, no depth write so world
     * geometry can paint over it. Opaque output — replaces whatever
     * was in the framebuffer. */
    sg_shader shd_starfield = sg_make_shader(starfield_shader_desc(sg_query_backend()));
    R.pip_starfield = sg_make_pipeline(&(sg_pipeline_desc){
        .shader = shd_starfield,
        .index_type = SG_INDEXTYPE_NONE,
        .cull_mode = SG_CULLMODE_NONE,
        .depth = { .write_enabled = false, .compare = SG_COMPAREFUNC_LESS_EQUAL },
        .label = "starfield-pipeline",
    });

    /* Atmospheric scattering pipeline (alpha-blended overlay).
     * Drawn after starfield: the shader outputs vec4(rgb, alpha)
     * where alpha = clamp(length(sky)*1.5, 0, 0.95) * strength, so
     * SRC_ALPHA / ONE_MINUS_SRC_ALPHA leaves bright limbs / sun-side
     * pixels fully replacing the stars while dim back-of-shell
     * pixels leave the starfield visible. Same Caelum-style
     * composition Caelum's own demo uses. */
    sg_shader shd_atmosphere = sg_make_shader(atmosphere_shader_desc(sg_query_backend()));
    R.pip_atmosphere = sg_make_pipeline(&(sg_pipeline_desc){
        .shader = shd_atmosphere,
        .layout = {
            .attrs = {
                [ATTR_atmosphere_a_pos] = { .format = SG_VERTEXFORMAT_FLOAT2 },
            },
            .buffers[0].stride = 2 * sizeof(float),
        },
        .index_type = SG_INDEXTYPE_NONE,
        .cull_mode = SG_CULLMODE_NONE,
        .depth = { .write_enabled = false, .compare = SG_COMPAREFUNC_LESS_EQUAL },
        .colors[0].blend = {
            .enabled = true,
            .src_factor_rgb = SG_BLENDFACTOR_SRC_ALPHA,
            .dst_factor_rgb = SG_BLENDFACTOR_ONE_MINUS_SRC_ALPHA,
            /* Preserve destination alpha — terrain/water/sky pre-write
             * the per-pixel "wet" mask in alpha for composite.glsl,
             * and this overlay must not corrupt it. (zero, one) =
             * keep dst_a, ignore src_a. */
            .src_factor_alpha = SG_BLENDFACTOR_ZERO,
            .dst_factor_alpha = SG_BLENDFACTOR_ONE,
        },
        .label = "atmosphere-pipeline",
    });

    /* Fullscreen-triangle vbuf used by the atmosphere shader (and
     * any future pass that wants to take vec2 a_pos rather than
     * gl_VertexIndex). Three NDC verts: (-1,-1), (3,-1), (-1,3) —
     * the over-large triangle covers the entire viewport including
     * the corners; the unused area gets clipped by the viewport. */
    static const float fullscreen_tri[6] = { -1.0f, -1.0f,  3.0f, -1.0f,  -1.0f,  3.0f };
    R.fullscreen_tri_vbuf = sg_make_buffer(&(sg_buffer_desc){
        .data = SG_RANGE(fullscreen_tri),
        .label = "fullscreen-tri-vbuf",
    });

    /* Distant-LOD pipeline. The mesh itself is per-body and gets
     * built at register time (build_distant_mesh_for_body); each
     * vertex carries a colour sampled from the body's terrain so
     * different planets show different colours from far away. */
    sg_shader shd_distant = sg_make_shader(distant_shader_desc(sg_query_backend()));
    R.pip_distant = sg_make_pipeline(&(sg_pipeline_desc){
        .shader = shd_distant,
        .layout = {
            .attrs = {
                [ATTR_distant_a_pos]    = { .format = SG_VERTEXFORMAT_FLOAT3 },
                [ATTR_distant_a_normal] = { .format = SG_VERTEXFORMAT_FLOAT3 },
            },
            .buffers[0].stride = 6 * sizeof(float),
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
    sg_shader shd_sun = sg_make_shader(sun_shader_desc(sg_query_backend()));
    R.pip_sun = sg_make_pipeline(&(sg_pipeline_desc){
        .shader = shd_sun,
        .layout = {
            .attrs = { [ATTR_sun_a_pos] = { .format = SG_VERTEXFORMAT_FLOAT3 } },
            .buffers[0].stride = 3 * sizeof(float),
        },
        .index_type = SG_INDEXTYPE_UINT32,
        .depth = { .write_enabled = true, .compare = SG_COMPAREFUNC_LESS_EQUAL },
        .cull_mode = SG_CULLMODE_BACK,
        .face_winding = SG_FACEWINDING_CCW,
        .label = "sun-pipeline",
    });

    bake_atlas();
    load_water_normal();
    load_flow_arrow();
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
        if (body->distant_vbuf.id)        sg_destroy_buffer(body->distant_vbuf);
        if (body->distant_ibuf.id)        sg_destroy_buffer(body->distant_ibuf);
        if (body->distant_view_albedo.id) sg_destroy_view(body->distant_view_albedo);
        if (body->distant_view_normal.id) sg_destroy_view(body->distant_view_normal);
        if (body->distant_tex_albedo.id)  sg_destroy_image(body->distant_tex_albedo);
        if (body->distant_tex_normal.id)  sg_destroy_image(body->distant_tex_normal);
        free(body->tile_to_chunk); body->tile_to_chunk = NULL;
    }
    R.body_count = 0;
    R.active_body_idx = -1;
    sg_destroy_view(R.atlas_view);
    sg_destroy_image(R.atlas_img);
    sg_destroy_sampler(R.atlas_smp);
    sg_destroy_view(R.water_normal_view);
    sg_destroy_image(R.water_normal_img);
    sg_destroy_sampler(R.water_normal_smp);
    if (R.distant_lod_smp.id) sg_destroy_sampler(R.distant_lod_smp);
    if (R.offscreen_color_tex.id) sg_destroy_view(R.offscreen_color_tex);
    if (R.offscreen_depth_tex.id) sg_destroy_view(R.offscreen_depth_tex);
    if (R.offscreen_color_att.id) sg_destroy_view(R.offscreen_color_att);
    if (R.offscreen_depth_att.id) sg_destroy_view(R.offscreen_depth_att);
    if (R.offscreen_color.id)     sg_destroy_image(R.offscreen_color);
    if (R.offscreen_depth.id)     sg_destroy_image(R.offscreen_depth);
    sg_destroy_pipeline(R.pip_hex);
    sg_destroy_pipeline(R.pip_water);
    if (R.pip_water_mobile.id) sg_destroy_pipeline(R.pip_water_mobile);
    sg_destroy_pipeline(R.pip_composite);
    if (R.pip_composite_mobile.id) sg_destroy_pipeline(R.pip_composite_mobile);
    sg_destroy_sampler(R.smp_offscreen);
    sg_destroy_sampler(R.smp_offscreen_depth);
    sg_destroy_pipeline(R.pip_starfield);
    sg_destroy_pipeline(R.pip_atmosphere);
    sg_destroy_buffer(R.fullscreen_tri_vbuf);
    sg_destroy_pipeline(R.pip_distant);
    sg_destroy_pipeline(R.pip_sun);
    sg_destroy_buffer(R.uvsphere_vbuf);
    sg_destroy_buffer(R.uvsphere_ibuf);
}

/* ----------------------------------------------------------------------- */

void renderer_draw_skybox(mat4_t view, mat4_t proj) {
    /* Starfield always draws regardless of the K toggle so the
     * space backdrop survives debug-mode atmosphere-off. The
     * K toggle scopes to the atmosphere overlay further down. */

    /* Camera basis from the view matrix (column-major from
     * mat4_look_at):
     *   col 0 row 0..2 = right
     *   col 1 row 0..2 = up
     *   col 2 row 0..2 = -forward
     * Stars are reconstructed from the basis directly, so eye
     * translation (m[12..14]) drops out — stars hold still even if
     * the eye jitters by sub-mm amounts each frame.
     *
     * tan(fovY/2) and aspect come out of the projection matrix:
     *   proj.m[5] = 1/tan(fovY/2)
     *   proj.m[0] = m[5]/aspect
     */
    const float inv_tan_half = proj.m[5];
    const float tan_half     = (inv_tan_half != 0.0f) ? (1.0f / inv_tan_half) : 1.0f;
    const float aspect       = (proj.m[0] != 0.0f) ? (inv_tan_half / proj.m[0]) : 1.0f;

    const float cam_right[3] = {  view.m[0],  view.m[4],  view.m[8]  };
    const float cam_up[3]    = {  view.m[1],  view.m[5],  view.m[9]  };
    const float cam_fwd[3]   = { -view.m[2], -view.m[6], -view.m[10] };

    const skybox_config_t* sky = config_skybox();

    /* bg_atten: starfield brightness multiplier so daytime stars
     * fade as the camera dives into the atmosphere. Uses density at
     * camera altitude as a proxy for "how much air is between camera
     * and space" — high density (deep in atmosphere) → near zero,
     * low density (in space) → 1. */
    float bg_atten = 1.0f;
    if (R.env.atmo_strength > 0.001f && R.env.atmo_radius > R.env.atmo_lower_radius) {
        const float Rg = (R.env.atmo_lower_radius > 0.0f)
                         ? R.env.atmo_lower_radius
                         : R.env.atmo_planet_radius;
        const float thickness = R.env.atmo_radius - Rg;
        const vec3_t cam_local = vec3_sub(R.env.camera_world, R.env.atmo_planet_center);
        const float  cam_r     = vec3_length(cam_local);
        const float  h_norm    = (cam_r - Rg) / thickness;
        const float  clamped   = (h_norm < 0.0f) ? 0.0f : (h_norm > 1.0f ? 1.0f : h_norm);
        const float  scale_h   = (R.env.atmo_scale_height > 0.0f)
                                 ? R.env.atmo_scale_height : 0.25f;
        const float  dens_cam  = expf(-clamped / scale_h);
        bg_atten = 1.0f - dens_cam;
        if (bg_atten < 0.05f) bg_atten = 0.05f;   /* never absolute black */
        if (bg_atten > 1.0f)  bg_atten = 1.0f;
    }

    /* ---- Pass A: starfield + nebula (opaque) ---- */
    sg_apply_pipeline(R.pip_starfield);
    starfield_params_t sp = {
        .u_cam_right       = { cam_right[0], cam_right[1], cam_right[2] },
        .u_cam_up          = { cam_up[0],    cam_up[1],    cam_up[2]    },
        .u_cam_fwd         = { cam_fwd[0],   cam_fwd[1],   cam_fwd[2]   },
        .u_sky_params      = { tan_half, aspect, R.time_seconds, bg_atten },
        .u_star_densities  = { sky->star_densities.x, sky->star_densities.y, sky->star_densities.z, sky->star_sharpness },
        .u_star_intensities= { sky->star_intensities.x, sky->star_intensities.y, sky->star_intensities.z, sky->star_brightness_threshold },
        .u_star_color      = { sky->star_color.x, sky->star_color.y, sky->star_color.z },
        .u_nebula_warm     = { sky->nebula_warm_color.x, sky->nebula_warm_color.y, sky->nebula_warm_color.z },
        .u_nebula_cool     = { sky->nebula_cool_color.x, sky->nebula_cool_color.y, sky->nebula_cool_color.z },
        .u_nebula_params   = { sky->nebula_intensity, sky->nebula_drift_speed, sky->nebula_scale1, sky->nebula_scale2 },
        .u_nebula_smoothstep = { sky->nebula_cloud_lo, sky->nebula_cloud_hi, sky->nebula_warm_blend_lo, sky->nebula_warm_blend_hi },
        .u_space_color     = { sky->space_color.x, sky->space_color.y, sky->space_color.z },
    };
    sg_apply_uniforms(UB_starfield_params, &SG_RANGE(sp));
    /* No sg_apply_bindings: the starfield pipeline has no vertex layout
     * and no textures (the fs gets positions from gl_VertexIndex), so
     * required_bindings == 0 and an empty bindings struct trips sokol's
     * VALIDATE_ABND_EMPTY_BINDINGS check. */
    sg_draw(0, 3, 1);

    /* ---- Pass B: atmospheric scattering (alpha-blended overlay) ---- */
    /* Camera position is passed in PLANET-LOCAL space because the
     * shader's ray-sphere intersect assumes the planet sits at origin
     * (Caelum's convention — see atmosphere.glsl). */
    if (R_SKYBOX_VISIBLE && R.env.atmo_strength > 0.001f) {
        sg_apply_pipeline(R.pip_atmosphere);
        const vec3_t cam_local = vec3_sub(R.env.camera_world, R.env.atmo_planet_center);
        atmosphere_vs_params_t avp = {
            .cam_right   = { cam_right[0], cam_right[1], cam_right[2], tan_half },
            .cam_up      = { cam_up[0],    cam_up[1],    cam_up[2],    aspect   },
            .cam_forward = { cam_fwd[0],   cam_fwd[1],   cam_fwd[2],   0.0f     },
            .camera_pos  = { cam_local.x,  cam_local.y,  cam_local.z,  0.0f     },
        };
        sg_apply_uniforms(UB_atmosphere_vs_params, &SG_RANGE(avp));

        atmosphere_fs_params_t afp = {
            .sun_direction  = { R.env.sun_dir.x, R.env.sun_dir.y, R.env.sun_dir.z, 0.0f },
            .radii          = { R.env.atmo_planet_radius,
                                R.env.atmo_radius,
                                R.env.atmo_scale_height > 0.0f ? R.env.atmo_scale_height : 0.25f,
                                0.0f },
            .scatter_coeffs = { R.env.atmo_rayleigh_scale,
                                R.env.atmo_mie_scale,
                                R.env.atmo_mie_g,
                                R.env.atmo_sun_intensity },
        };
        sg_apply_uniforms(UB_atmosphere_fs_params, &SG_RANGE(afp));

        sg_apply_bindings(&(sg_bindings){
            .vertex_buffers[0] = R.fullscreen_tri_vbuf,
        });
        sg_draw(0, 3, 1);
    }
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
    sun_vs_params_t sun_vs = {0};
    memcpy(sun_vs.u_mvp, mvp.m, sizeof(sun_vs.u_mvp));
    sg_apply_uniforms(UB_sun_vs_params, &SG_RANGE(sun_vs));
    /* Warm white core, slightly clipping. Same colour the skybox
     * disc uses so the two read as one body when both are visible. */
    sun_fs_params_t sun_fs = { .u_color = { 1.40f, 1.25f, 0.90f } };
    sg_apply_uniforms(UB_sun_fs_params, &SG_RANGE(sun_fs));
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

/* (sample_body_top_color removed — the distant LOD now samples a
 * per-body pre-baked albedo texture in the fragment shader rather
 * than computing a per-vertex colour by walking the world. See
 * sample_planet_lod_color + build_distant_textures_for_body below.) */

/* ----------------------------------------------------------------------- */
/* Per-body distant-LOD textures.
 *
 * Builds two equirectangular RGBA8 textures from the body's procgen
 * noise + tileset palette, suitable for direct sampling by the
 * distant fragment shader. Resolution is small (256x128) since the
 * distant LOD only covers ~10% of the viewport at most, and the
 * sampled noise is intrinsically low-frequency at planet scale -
 * higher resolutions cost memory + generation time without adding
 * visible detail.
 *
 *   ALBEDO (RGBA8): RGB = same colour the old per-vertex
 *                   sample_body_top_color used (biome + water blend +
 *                   height shade + tileset tint), evaluated per
 *                   pixel rather than per vertex. A = water mask
 *                   (255 when the column at this direction is
 *                   below sea level on a body that has water, else
 *                   0). The shader gates its specular highlight on
 *                   this alpha so dry terrain stays matte.
 *   NORMAL (RGBA8): RG = (dx, dy) tangent-space slope encoded
 *                   (0,0) = flat, packed as v*0.5+0.5. Built from
 *                   the planet's altitude gradient via central
 *                   differences across one texel in each axis,
 *                   scaled so a 5 m peak-to-trough swing reads as
 *                   a unit slope. B = 1.0 placeholder, A unused. */

#define DISTANT_TEX_W   256
#define DISTANT_TEX_H   128
/* Tangent-space slope encoder: scales raw altitude delta (m / texel)
 * into [-1, +1] so a 5 m vertical change across one texel registers
 * as a full unit slope (still rare in practice; most terrain reads
 * far softer than that, which is fine - the shader's
 * normal_strength uniform tunes the visible bumpiness on top). */
#define DISTANT_NORMAL_SLOPE_SCALE   0.2f

/* Equirectangular pixel index -> body-local unit direction. Keep
 * in lock-step with the dir_to_uv mapping in distant.glsl: U sweeps
 * longitude via atan2(z, x), V sweeps latitude via asin(y). */
static dvec3_t distant_pixel_to_dir(int px, int py) {
    double u = ((double)px + 0.5) / (double)DISTANT_TEX_W;
    double v = ((double)py + 0.5) / (double)DISTANT_TEX_H;
    double lon = (u - 0.5) * 2.0 * 3.14159265358979323846;
    double lat = (0.5 - v) * 3.14159265358979323846;
    double cl  = cos(lat);
    return (dvec3_t){ cl * cos(lon), sin(lat), cl * sin(lon) };
}

/* Same biome-colour pipeline as the removed sample_body_top_color,
 * but driven directly from the procgen noise (planet_profile +
 * planet_sample_with_profile) rather than the world's tile data -
 * so it works for bodies that haven't streamed their voxels yet, and
 * stays in exact sync with the procgen even when local edits drift
 * the live world from the seed. RGB goes in `out_rgb`, water-amount
 * (0..1) goes in `out_water_alpha`. */
static void sample_planet_lod_color(const body_config_t* body,
                                     vec3_t fallback,
                                     dvec3_t unit_dir,
                                     float surface_m,
                                     vec3_t* out_rgb,
                                     float* out_water_alpha) {
    column_profile_t prof = planet_profile(body, unit_dir);
    block_t top = planet_sample_with_profile(&prof, surface_m);
    /* Fallback: if the procgen returned an empty / non-solid cell
     * at the surface (rare - polar caps where surface is below sea
     * level and the top is ice/water), seed with the renderer-side
     * distant fallback so the texture never goes black. */
    if (top == BLOCK_AIR) {
        *out_rgb = fallback;
        *out_water_alpha = 0.0f;
        return;
    }
    int col = (int)block_face_tile(top, FACE_CAP_TOP);
    vec3_t base = (col >= 0 && col < HEX_ATLAS_TILES)
                ? R.atlas_col_avg[col]
                : fallback;

    const lod_config_t* L = config_lod();
    int ts = (int)body->tileset;
    if (ts < 0 || ts > 4) ts = 0;

    /* Water column thickness drives both the visual water blend AND
     * the alpha mask the shader reads for its specular gate. Bodies
     * with no water (barren / icy / asteroid) skip the blend. */
    float water_alpha = 0.0f;
    if (body->has_water && surface_m < 0.0f) {
        float depth_m = -surface_m;
        float full_depth = L->tileset_water_full_depth_m[ts];
        if (full_depth <= 0.0f) full_depth = 4.0f;
        float wf = depth_m / full_depth;
        if (wf > 1.0f) wf = 1.0f;
        vec3_t wc = L->tileset_water_color[ts];
        base.x = base.x * (1.0f - wf) + wc.x * wf;
        base.y = base.y * (1.0f - wf) + wc.y * wf;
        base.z = base.z * (1.0f - wf) + wc.z * wf;
        water_alpha = wf;
    }

    /* Height shade + per-tileset tint. */
    float t = surface_m / L->distant_shade_range_m;
    if (t < -1.0f) t = -1.0f;
    if (t >  1.0f) t =  1.0f;
    float u = t * 0.5f + 0.5f;
    float shade = L->distant_shade_floor
                + (L->distant_shade_ceiling - L->distant_shade_floor) * u;
    vec3_t lo = L->tileset_lowland_tint[ts];
    vec3_t hi = L->tileset_peak_tint   [ts];
    base.x *= shade * (lo.x * (1.0f - u) + hi.x * u);
    base.y *= shade * (lo.y * (1.0f - u) + hi.y * u);
    base.z *= shade * (lo.z * (1.0f - u) + hi.z * u);
    *out_rgb = base;
    *out_water_alpha = water_alpha;
}

static void build_distant_textures_for_body(chunked_body_t* body) {
    /* Discard any previous textures - body_register can be called
     * multiple times for the same slot when a world rebuild is
     * needed (e.g. seed change during dev). */
    if (body->distant_view_albedo.id) {
        sg_destroy_view(body->distant_view_albedo);
        body->distant_view_albedo = (sg_view){0};
    }
    if (body->distant_view_normal.id) {
        sg_destroy_view(body->distant_view_normal);
        body->distant_view_normal = (sg_view){0};
    }
    if (body->distant_tex_albedo.id) {
        sg_destroy_image(body->distant_tex_albedo);
        body->distant_tex_albedo = (sg_image){0};
    }
    if (body->distant_tex_normal.id) {
        sg_destroy_image(body->distant_tex_normal);
        body->distant_tex_normal = (sg_image){0};
    }
    if (!body->world || !body->world->body) return;
    const body_config_t* bcfg = body->world->body;

    const int W = DISTANT_TEX_W;
    const int H = DISTANT_TEX_H;

    /* Single altitude buffer - we use it once to compute the albedo
     * (which depends only on the per-pixel surface_m) and a second
     * time to build the normal map (central differences across
     * neighbouring pixels). Storing the whole grid up front means
     * we don't re-evaluate ~12 noise octaves per neighbour lookup. */
    float* alt = (float*)malloc((size_t)W * (size_t)H * sizeof(float));
    if (!alt) return;
    for (int py = 0; py < H; ++py) {
        for (int px = 0; px < W; ++px) {
            dvec3_t dir = distant_pixel_to_dir(px, py);
            float surface_m = planet_surface_altitude(bcfg, dir);
            if (bcfg->barren) surface_m *= 0.3f;
            alt[py * W + px] = surface_m;
        }
    }

    uint8_t* albedo = (uint8_t*)malloc((size_t)W * (size_t)H * 4u);
    uint8_t* normal = (uint8_t*)malloc((size_t)W * (size_t)H * 4u);
    if (!albedo || !normal) { free(alt); free(albedo); free(normal); return; }

    vec3_t fallback = body->distant_color;
    for (int py = 0; py < H; ++py) {
        for (int px = 0; px < W; ++px) {
            dvec3_t dir = distant_pixel_to_dir(px, py);
            float   surface_m = alt[py * W + px];
            vec3_t  rgb;
            float   water_a;
            sample_planet_lod_color(bcfg, fallback, dir, surface_m, &rgb, &water_a);
            /* Quantise to 8-bit. Clamp covers a couple of edge cases
             * where height-shade x tint can push a channel just over
             * 1.0 before quantisation. */
            float r = rgb.x; if (r < 0) r = 0; if (r > 1) r = 1;
            float g = rgb.y; if (g < 0) g = 0; if (g > 1) g = 1;
            float b = rgb.z; if (b < 0) b = 0; if (b > 1) b = 1;
            float a = water_a;
            int idx = (py * W + px) * 4;
            albedo[idx + 0] = (uint8_t)(r * 255.0f + 0.5f);
            albedo[idx + 1] = (uint8_t)(g * 255.0f + 0.5f);
            albedo[idx + 2] = (uint8_t)(b * 255.0f + 0.5f);
            albedo[idx + 3] = (uint8_t)(a * 255.0f + 0.5f);

            /* Normal map via central differences across the altitude
             * grid. U wraps (longitude), V clamps (latitude). The
             * resulting slope is in metres-per-texel; the scale
             * factor maps a 5 m / texel ridge to a unit slope. */
            int px_l = (px == 0)       ? (W - 1) : (px - 1);
            int px_r = (px == W - 1)   ? 0       : (px + 1);
            int py_d = (py == 0)       ? 0       : (py - 1);
            int py_u = (py == H - 1)   ? (H - 1) : (py + 1);
            float h_l = alt[py    * W + px_l];
            float h_r = alt[py    * W + px_r];
            float h_d = alt[py_d  * W + px ];
            float h_u = alt[py_u  * W + px ];
            float dx = (h_r - h_l) * 0.5f * DISTANT_NORMAL_SLOPE_SCALE;
            float dy = (h_u - h_d) * 0.5f * DISTANT_NORMAL_SLOPE_SCALE;
            if (dx < -1.0f) dx = -1.0f;
            if (dx >  1.0f) dx =  1.0f;
            if (dy < -1.0f) dy = -1.0f;
            if (dy >  1.0f) dy =  1.0f;
            normal[idx + 0] = (uint8_t)((dx * 0.5f + 0.5f) * 255.0f + 0.5f);
            normal[idx + 1] = (uint8_t)((dy * 0.5f + 0.5f) * 255.0f + 0.5f);
            normal[idx + 2] = 255;
            normal[idx + 3] = 255;
        }
    }
    free(alt);

    body->distant_tex_albedo = sg_make_image(&(sg_image_desc){
        .width  = W,
        .height = H,
        .pixel_format = SG_PIXELFORMAT_RGBA8,
        .data.mip_levels[0] = { .ptr = albedo, .size = (size_t)W * H * 4u },
        .label = "distant-lod-albedo",
    });
    body->distant_tex_normal = sg_make_image(&(sg_image_desc){
        .width  = W,
        .height = H,
        .pixel_format = SG_PIXELFORMAT_RGBA8,
        .data.mip_levels[0] = { .ptr = normal, .size = (size_t)W * H * 4u },
        .label = "distant-lod-normal",
    });
    body->distant_view_albedo = sg_make_view(&(sg_view_desc){
        .texture.image = body->distant_tex_albedo,
        .label = "distant-lod-albedo-view",
    });
    body->distant_view_normal = sg_make_view(&(sg_view_desc){
        .texture.image = body->distant_tex_normal,
        .label = "distant-lod-normal-view",
    });
    free(albedo);
    free(normal);
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

    /* Pack: pos (3) + normal (3, radial). Per-pixel colour comes from
     * the distant LOD texture sampled in the fragment shader. */
    static float vbuf[DISTANT_MAX_VERTS * 6];
    for (int i = 0; i < nv; ++i) {
        const float* p = verts[i];
        vbuf[i*6 + 0] = p[0]; vbuf[i*6 + 1] = p[1]; vbuf[i*6 + 2] = p[2];
        vbuf[i*6 + 3] = p[0]; vbuf[i*6 + 4] = p[1]; vbuf[i*6 + 5] = p[2];
    }
    static uint32_t ibuf[DISTANT_MAX_TRIS * 3];
    for (int i = 0; i < nt; ++i) {
        ibuf[i*3 + 0] = tris[i][0];
        ibuf[i*3 + 1] = tris[i][1];
        ibuf[i*3 + 2] = tris[i][2];
    }

    body->distant_vbuf = sg_make_buffer(&(sg_buffer_desc){
        .data = { .ptr = vbuf, .size = (size_t)nv * 6 * sizeof(float) },
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
    /* Build the per-body distant-LOD textures (albedo + normal) from
     * the procedural noise, sized 256x128 each. ~33k pixels x ~12
     * noise octaves x ~20 bodies = a few hundred ms total at boot;
     * one-shot cost, never re-evaluated. */
    build_distant_textures_for_body(body);

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
    /* This path is the prime suspect for "framerate tanks in space" —
     * it's a synchronous mesh of every tile on the body, kicked off
     * the first time the body enters close-LOD range. For a 160k-tile
     * planet (Crag, Frostbite) it's seconds of CPU work blocking the
     * frame. Time it explicitly so the profiler attributes the spike
     * correctly instead of burying it inside draw_world / draw_moons. */
    uint64_t t0 = stm_now();
    /* Kick the lazy-per-body HTTP fetch of persisted .col files for
     * this body. Idempotent within a connection; returns immediately
     * if we've already requested or applied. The response arrives
     * async via JS fetch; it lands on the world's blocks + dirty
     * bits, and the next per-frame remesh sweep picks them up. The
     * initial mesh below proceeds with procgen-only blocks, which is
     * fine - the moment the blob lands the dirty sweep rebuilds the
     * affected chunks and the persisted state overlays cleanly. */
    if (body->world && body->world->body) {
        net_client_fetch_body_saves((uint32_t)body->world->body->id);
    }
    if (!body->chunks_allocated) {
        body_alloc_chunks(body);
        body->chunks_allocated = true;
    }
    body_full_mesh(body);
    for (int ci = 0; ci < CHUNK_COUNT; ++ci) {
        chunk_upload(&body->chunks[ci]);
    }
    body->meshed = true;
    double elapsed_ms = stm_ms(stm_diff(stm_now(), t0));
    /* The mesh built here already reflects every CHUNK_DIFF the
     * client has received for this body so far (world->blocks was
     * mutated as each diff arrived, even while the body was deferred).
     * Compare this body's tile_count against the net-client per-body
     * coverage line to confirm coverage. */
    printf("[renderer] loaded detail for %s (body=%u, %d tiles) in %.1f ms - "
           "compare net-client body-totals for this body to /saves output\n",
           body->world->body->name,
           (unsigned)body->world->body->id,
           body->world->tile_count, elapsed_ms);
    fflush(stdout);
}

/* Inverse of body_load_detail: release the per-chunk CPU mesh
 * arrays + GPU buffers + tile->chunk assignment table so the body
 * goes back to the same state it had at register time. The distant
 * LOD icosphere + albedo/normal textures stay live so the far-LOD
 * draw keeps working. Called from renderer_draw_world when a body
 * the player has just flown 5+ km away from no longer needs its
 * 160k-tile chunked mesh in memory; subsequent re-approach
 * re-meshes via body_load_detail. */
static void body_unload_detail(chunked_body_t* body) {
    if (!body->meshed && !body->chunks_allocated) return;
    for (int i = 0; i < CHUNK_COUNT; ++i) {
        mesh_chunk_t* c = &body->chunks[i];
        if (c->mesh.vertices)       hex_mesh_free(&c->mesh);
        if (c->water_mesh.vertices) hex_mesh_free(&c->water_mesh);
        if (c->vbuf.id)        { sg_destroy_buffer(c->vbuf);        c->vbuf = (sg_buffer){0}; }
        if (c->ibuf.id)        { sg_destroy_buffer(c->ibuf);        c->ibuf = (sg_buffer){0}; }
        if (c->water_vbuf.id)  { sg_destroy_buffer(c->water_vbuf);  c->water_vbuf = (sg_buffer){0}; }
        if (c->water_ibuf.id)  { sg_destroy_buffer(c->water_ibuf);  c->water_ibuf = (sg_buffer){0}; }
        c->last_uploaded_index_count       = 0;
        c->last_uploaded_water_idx_count   = 0;
        c->vbuf_capacity = c->ibuf_capacity = 0;
        c->water_vbuf_capacity = c->water_ibuf_capacity = 0;
    }
    free(body->tile_to_chunk);
    body->tile_to_chunk     = NULL;
    body->chunks_allocated  = false;
    body->meshed            = false;
    printf("[renderer] unloaded detail for %s (body=%u) - far-LOD only now\n",
           body->world && body->world->body ? body->world->body->name : "(unknown)",
           body->world && body->world->body ? (unsigned)body->world->body->id : 0u);
    fflush(stdout);
}

/* Backwards-compat shim — main_web.c still calls renderer_register_moon
 * for non-Tenebris bodies. Same behavior as renderer_register_world. */
void renderer_register_moon(world_t* w) { renderer_register_world(w); }

world_t* renderer_world_for_body(uint32_t body_id) {
    for (int i = 0; i < R.body_count; ++i) {
        world_t* w = R.bodies[i].world;
        if (w && w->body && (uint32_t)w->body->id == body_id) return w;
    }
    return NULL;
}

bool renderer_body_meshed(uint32_t body_id) {
    for (int i = 0; i < R.body_count; ++i) {
        const chunked_body_t* b = &R.bodies[i];
        if (b->world && b->world->body && (uint32_t)b->world->body->id == body_id) {
            return b->meshed;
        }
    }
    return false;
}

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
            if (R.active_body_idx == i) return;   /* already active - no-op */
            const char* old_name = (R.active_body_idx >= 0
                                && R.bodies[R.active_body_idx].world
                                && R.bodies[R.active_body_idx].world->body)
                                ? R.bodies[R.active_body_idx].world->body->name
                                : "(none)";
            const char* new_name = (w->body) ? w->body->name : "(?)";
            if (R.active_body_idx >= 0) R.bodies[R.active_body_idx].is_active = false;
            R.active_body_idx = i;
            R.bodies[i].is_active = true;
            printf("[renderer] active body: %s -> %s (slot %d)\n",
                   old_name, new_name, i);
            fflush(stdout);
            return;
        }
    }
    /* No match - log it. This is the symptom the user reported: code
     * thinks the player is on Crag (F2 readout, server pose) but the
     * renderer never sees that world come through here, so the LOD
     * pass keeps drawing the wrong body as the chunked one. */
    fprintf(stderr,
            "[renderer] WARN: renderer_set_active_world: world=%p body=%s "
            "not found among %d registered bodies\n",
            (void*)w,
            (w && w->body) ? w->body->name : "(null)",
            R.body_count);
    fflush(stderr);
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

    /* renderer_draw_world already drew the player's home body via
     * its chunked mesh. This pass picks up EVERY other body as an
     * icosphere - exactly one body is allowed to draw chunks at
     * a time (the active one), so the angular-size threshold that
     * used to gate close mid-distance non-active bodies is gone:
     * non-active = LOD, always. */

    sg_apply_pipeline(R.pip_distant);
    for (int bi = 0; bi < R.body_count; ++bi) {
        chunked_body_t* body = &R.bodies[bi];
        /* Used to short-circuit on `bi == R.active_body_idx` here -
         * the active body always drew chunks regardless of distance.
         * That broke the LOD for the player's home planet: fly far
         * enough from Tenebris (which is permanently active because
         * main_web hands the renderer G.world) and the chunked draw
         * trivially culled, leaving the planet invisible while
         * Sequoia / Crag still rendered as icospheres. Letting the
         * active body fall through the same distance test means it
         * swaps to the icosphere LOD on the way out and back to
         * chunks on the way in, just like every other body. */
        if (body->distant_index_count <= 0) continue;
        if (!sphere_visible(frustum, body->world_pos, body->radius_m * 1.5f)) continue;
        vec3_t delta = vec3_sub(body->world_pos, camera_world);
        float  dist  = vec3_length(delta);
        if (dist < 1.0f) dist = 1.0f;
        /* Mirror the exact terrain-draw condition (inverted): LOD
         * renders when chunked WOULDN'T. The active body uses ONLY
         * the 5 km hard cutoff (so a player standing on Tenebris
         * doesn't see an icosphere over the world they're walking
         * on). EVERY other body draws LOD here regardless of
         * angular size - exactly one body is allowed to draw chunks
         * at a time, and that's the active one. */
        const float MAX_DETAIL_DIST_M = 5000.0f;
        const bool is_active = (bi == R.active_body_idx);
        const bool chunked_drew = is_active && (dist <= MAX_DETAIL_DIST_M);
        if (chunked_drew) continue;

        mat4_t model = mat4_mul(mat4_translate(body->world_pos),
                                mat4_scale_uniform(body->radius_m));
        mat4_t mvp = mat4_mul(vp_base, model);
        /* Bindings include the per-body distant albedo + normal texture
         * views and the shared linear-clamp sampler. If the textures
         * haven't been built yet (rare race during init) skip this body
         * - the mesh path needs them. */
        if (!body->distant_view_albedo.id || !body->distant_view_normal.id) {
            continue;
        }
        sg_apply_bindings(&(sg_bindings){
            .vertex_buffers[0] = body->distant_vbuf,
            .index_buffer      = body->distant_ibuf,
            .views[VIEW_tex_albedo]    = body->distant_view_albedo,
            .views[VIEW_tex_normal]    = body->distant_view_normal,
            .samplers[SMP_smp_clamp]   = R.distant_lod_smp,
        });
        distant_vs_params_t dvp = { 0 };
        memcpy(dvp.u_mvp, mvp.m, sizeof(dvp.u_mvp));
        sg_apply_uniforms(UB_distant_vs_params, &SG_RANGE(dvp));
        /* Fragment params: sun direction + ambient floor (re-used
         * across other passes), camera world position for the
         * water-specular view ray, plus the water-glint tuning. */
        const water_config_t* WC = config_water();
        distant_fs_params_t dfp = {
            .u_sun_dir    = { R.env.sun_dir.x, R.env.sun_dir.y, R.env.sun_dir.z },
            .u_ambient    = { R.env.ambient.x, R.env.ambient.y, R.env.ambient.z },
            .u_camera_pos = { camera_world.x,  camera_world.y,  camera_world.z  },
            .u_normal_strength            = 0.6f,
            .u_water_specular_tint        = { WC->sun_tint.x,
                                              WC->sun_tint.y,
                                              WC->sun_tint.z },
            .u_water_specular_intensity   = WC->specular_intensity,
            .u_water_specular_power       = WC->specular_power,
        };
        sg_apply_uniforms(UB_distant_fs_params, &SG_RANGE(dfp));
        sg_draw(0, body->distant_index_count, 1);
        R.tris += (size_t)body->distant_index_count / 3;
    }
}

/* ----------------------------------------------------------------------- */

/* Phase A.1 — make sure the offscreen colour + depth attachments
 * (and the texture view of the colour image) exist at the requested
 * size. No-op when they're already correct. Destroys + recreates on
 * size change. Called from renderer_begin_frame so the targets
 * follow the live swapchain dimensions. Targets aren't bound or
 * sampled by anything yet — Phase A.2 will route the opaque pass
 * into them and B.1 will have the water shader sample them.
 *
 * sokol API: sg_image_desc.usage carries .color_attachment /
 * .depth_stencil_attachment booleans (this version of sokol does NOT
 * have render_attachment / sg_attachments_desc — those are an older
 * naming the codebase doesn't use). Each image is paired with an
 * sg_view of matching .color_attachment / .depth_stencil_attachment
 * type, and the colour image gets a third .texture-type view for
 * later sampling. Reference: floooh/sokol header doc-comment lines
 * ~585–720. */
static void ensure_offscreen_targets(int w, int h) {
    if (w <= 0 || h <= 0) return;
    if (R.offscreen_color.id != 0 &&
        R.offscreen_w == w && R.offscreen_h == h) {
        return;
    }
    if (R.offscreen_color_tex.id) sg_destroy_view(R.offscreen_color_tex);
    if (R.offscreen_depth_tex.id) sg_destroy_view(R.offscreen_depth_tex);
    if (R.offscreen_color_att.id) sg_destroy_view(R.offscreen_color_att);
    if (R.offscreen_depth_att.id) sg_destroy_view(R.offscreen_depth_att);
    if (R.offscreen_color.id)     sg_destroy_image(R.offscreen_color);
    if (R.offscreen_depth.id)     sg_destroy_image(R.offscreen_depth);

    R.offscreen_color = sg_make_image(&(sg_image_desc){
        .usage = { .color_attachment = true },
        .width = w, .height = h,
        .pixel_format = SG_PIXELFORMAT_RGBA8,
        .sample_count = 1,
        .label = "offscreen-color",
    });
    R.offscreen_depth = sg_make_image(&(sg_image_desc){
        .usage = { .depth_stencil_attachment = true },
        .width = w, .height = h,
        /* DEPTH_STENCIL (not DEPTH-only) so the offscreen depth attachment
         * matches the default swapchain depth format that pipelines inherit
         * via sapp_depth_format(). Sampling this image as a texture2D in the
         * water shader returns the depth component on both GLES3 (WebGL2)
         * and desktop GL — both treat DEPTH24_STENCIL8 sampling like DEPTH. */
        .pixel_format = SG_PIXELFORMAT_DEPTH_STENCIL,
        .sample_count = 1,
        .label = "offscreen-depth",
    });
    R.offscreen_color_att = sg_make_view(&(sg_view_desc){
        .color_attachment.image = R.offscreen_color,
        .label = "offscreen-color-att",
    });
    R.offscreen_depth_att = sg_make_view(&(sg_view_desc){
        .depth_stencil_attachment.image = R.offscreen_depth,
        .label = "offscreen-depth-att",
    });
    R.offscreen_color_tex = sg_make_view(&(sg_view_desc){
        .texture.image = R.offscreen_color,
        .label = "offscreen-color-tex",
    });
    R.offscreen_depth_tex = sg_make_view(&(sg_view_desc){
        .texture.image = R.offscreen_depth,
        .label = "offscreen-depth-tex",
    });
    R.offscreen_w = w;
    R.offscreen_h = h;
}

void renderer_begin_frame(int w, int h, render_env_t env) {
    ensure_offscreen_targets(w, h);
    R.env = env;
    R.tris = 0;
    R.tiles_remeshed = 0;
    /* Frame-scoped relight cost counters. Accumulated by
     * body_chunk_rebuild_full / body_full_mesh; surfaced via the
     * "relight-loop" and "chunk-remesh" profiler scopes. The session
     * tracker (R.relight_track) spans frames - those counters reset
     * only when a relight session ends. */
    R.relight_loop_ms_this_frame   = 0;
    R.relight_iters_this_frame     = 0;
    R.mesh_rebuild_ms_this_frame   = 0;
    R.chunks_remeshed_this_frame   = 0;
    /* last_frame_iters resets here so per-frame peak tracking in
     * body_chunk_rebuild_full sees a clean accumulator. The session
     * frame count is bumped on the first relight call of each frame
     * (see body_chunk_rebuild_full). */
    if (R.relight_track.active) R.relight_track.last_frame_iters = 0;

    /* Phase A.2 — opaque scene now goes into the offscreen colour +
     * depth attachments instead of straight to the swapchain. The
     * subsequent compose_to_swapchain call ends this pass and starts
     * a swapchain pass that blits the offscreen colour onto the
     * screen, then water + UI draw on top of that. */
    R.pass_action = (sg_pass_action){
        .colors[0] = {
            .load_action = SG_LOADACTION_CLEAR,
            .clear_value = { env.sky_bottom.x, env.sky_bottom.y, env.sky_bottom.z, 1.0f },
        },
        .depth = { .load_action = SG_LOADACTION_CLEAR, .clear_value = 1.0f },
    };
    sg_begin_pass(&(sg_pass){
        .action = R.pass_action,
        .attachments = {
            .colors[0]     = R.offscreen_color_att,
            .depth_stencil = R.offscreen_depth_att,
        },
        .label = "offscreen-scene",
    });
}

void renderer_compose_to_swapchain(mat4_t view, mat4_t proj) {
    /* End the offscreen pass + start the swapchain pass. Composite
     * draws a single fullscreen triangle that samples the offscreen
     * colour + depth images and writes to the swapchain, applying
     * the underwater fog + distortion post-process per pixel based
     * on whether each pixel reconstructs to a world position below
     * sea level. */
    sg_end_pass();

    sg_begin_pass(&(sg_pass){
        .action = {
            /* CLEAR (not DONTCARE) so the swapchain colour is wiped
             * to black before the composite shader writes over it.
             * DONTCARE was allowing prior-frame menu UI (HOST / JOIN
             * / "cloud hosted ...") to bleed through into gameplay
             * on browsers that preserve the back buffer between
             * passes. The composite shader still writes every pixel
             * so the CLEAR is effectively free, just guarantees the
             * buffer starts blank. */
            .colors[0] = { .load_action = SG_LOADACTION_CLEAR,
                             .clear_value = { 0.0f, 0.0f, 0.0f, 1.0f } },
            .depth     = { .load_action = SG_LOADACTION_CLEAR, .clear_value = 1.0f },
        },
        .swapchain = sglue_swapchain(),
        .label = "swapchain-composite",
    });

    /* cam_under is voxel-driven: the camera position is resolved to
     * its containing block and we only flag the camera as
     * "underwater" when that block is actually BLOCK_WATER. A player
     * who dug a cave below sea level on a land tile sits in an AIR
     * cell, so the composite skips fog for them - caves stay crisp.
     * Shared between the desktop and perf-mode composite paths.
     *
     * Hoisted above the perf-mode branch so both pipelines reuse
     * the same flag. */
    const water_config_t* W_cu = config_water();
    /* Composite-pass deep_color + absorption are tinted by the active
     * body's tileset (Sequoia = green, others = global blue) so the
     * underwater fog matches the body the camera is actually in,
     * not whatever the global default is. Falls back to the global
     * water_config when the tileset has no override. */
    vec3_t comp_deep = W_cu->deep_color;
    vec3_t comp_absorb = W_cu->absorption;
    if (R.active_body_idx >= 0 && R.bodies[R.active_body_idx].world
        && R.bodies[R.active_body_idx].world->body) {
        const lod_config_t* LP = config_lod();
        int ts = (int)R.bodies[R.active_body_idx].world->body->tileset;
        if (ts < 0 || ts > 4) ts = 0;
        if (LP->tileset_water_deep_color[ts].x > 0.0f
         || LP->tileset_water_deep_color[ts].y > 0.0f
         || LP->tileset_water_deep_color[ts].z > 0.0f) {
            comp_deep = LP->tileset_water_deep_color[ts];
        }
        if (LP->tileset_water_absorption[ts].x > 0.0f
         || LP->tileset_water_absorption[ts].y > 0.0f
         || LP->tileset_water_absorption[ts].z > 0.0f) {
            comp_absorb = LP->tileset_water_absorption[ts];
        }
    }
    bool cam_under_shared = false;
    if (R.active_body_idx >= 0) {
        chunked_body_t* ab = &R.bodies[R.active_body_idx];
        vec3_t cam_local = vec3_sub(R.env.camera_world, ab->world_pos);
        block_t cam_blk  = world_block_at_pos(ab->world, cam_local, -1);
        cam_under_shared = (cam_blk == BLOCK_WATER);
    }

    /* Perf mode: blit the offscreen colour + forward its depth via
     * gl_FragDepth, then - if the camera is in a water voxel -
     * apply a screen-wide Beer-Lambert fog using view-distance
     * attenuation. No per-pixel altitude reconstruction or wet
     * mask; the desktop composite's fbm-gated path is dropped in
     * favour of "camera in water = fog everything". */
    if (R_PERF_MODE) {
        sg_apply_pipeline(R.pip_composite_mobile);
        composite_mobile_fs_params_t fs_m = {
            .deep_color  = { comp_deep.x,   comp_deep.y,   comp_deep.z,   0.0f },
            .absorption  = { comp_absorb.x, comp_absorb.y, comp_absorb.z, 0.0f },
            .fog_params  = { 0.3f, 20000.0f, cam_under_shared ? 1.0f : 0.0f, 0.0f },
        };
        sg_apply_uniforms(UB_composite_mobile_fs_params, &SG_RANGE(fs_m));
        sg_apply_bindings(&(sg_bindings){
            .views[VIEW_scene_color_mobile]        = R.offscreen_color_tex,
            .views[VIEW_scene_depth_mobile]        = R.offscreen_depth_tex,
            .samplers[SMP_scene_mobile_smp]        = R.smp_offscreen,
            .samplers[SMP_scene_depth_mobile_smp]  = R.smp_offscreen_depth,
        });
        sg_draw(0, 3, 1);
        return;
    }

    sg_apply_pipeline(R.pip_composite);

    /* Camera basis from the view matrix (column-major from
     * mat4_look_at) — same extraction the skybox + atmosphere passes
     * use so the underwater post-process reconstructs world rays
     * with the same convention. tan(fovY/2) and aspect come out of
     * the projection matrix. */
    const float inv_tan_half = proj.m[5];
    const float tan_half     = (inv_tan_half != 0.0f) ? (1.0f / inv_tan_half) : 1.0f;
    const float aspect       = (proj.m[0] != 0.0f) ? (inv_tan_half / proj.m[0]) : 1.0f;
    const float cam_right[3] = {  view.m[0],  view.m[4],  view.m[8]  };
    const float cam_up[3]    = {  view.m[1],  view.m[5],  view.m[9]  };
    const float cam_fwd[3]   = { -view.m[2], -view.m[6], -view.m[10] };

    composite_vs_params_t vs = {
        .cam_right   = { cam_right[0], cam_right[1], cam_right[2], tan_half },
        .cam_up      = { cam_up[0],    cam_up[1],    cam_up[2],    aspect   },
        .cam_forward = { cam_fwd[0],   cam_fwd[1],   cam_fwd[2],   0.0f     },
        .camera_pos  = { R.env.camera_world.x, R.env.camera_world.y, R.env.camera_world.z, 0.0f },
    };
    sg_apply_uniforms(UB_composite_vs_params, &SG_RANGE(vs));

    /* Body parameters for the desktop composite's wet-mask gate
     * (cam_under already computed up top, shared with the perf
     * path). The cap radius is derived the same way hex_mesher.c
     * places the actual cap, so the "below cap" smoothstep stays
     * consistent with what the player sees. */
    const water_config_t* W = W_cu;
    vec3_t  body_center  = (vec3_t){ 0, 0, 0 };
    float   sea_radius   = 0.0f;
    bool    cam_under    = cam_under_shared;
    if (R.active_body_idx >= 0) {
        chunked_body_t* ab = &R.bodies[R.active_body_idx];
        body_center = ab->world_pos;
        sea_radius  = ab->radius_m + W->height_offset_m - W->depth_offset_m;
    }

    composite_fs_params_t fs = {
        .deep_color    = { comp_deep.x,   comp_deep.y,   comp_deep.z,   0.0f },
        .absorption    = { comp_absorb.x, comp_absorb.y, comp_absorb.z, 0.0f },
        /* near_far.z is the wet-fade altitude window (m). The composite
         * gates the wet mask by smoothstep(-band, +band, pixel_alt) so
         * dry geometry above the cap (beach blocks at the depth-cell
         * boundary, whose tops sit above the cap by depth_offset_m)
         * doesn't pick up the distortion shimmer. */
        .near_far      = { 0.3f, 20000.0f, W->wet_fade_band_m, 0.0f },
        .planet_params = { body_center.x, body_center.y, body_center.z, sea_radius },
        .fx_params     = { W->underwater_distortion,
                           R.time_seconds,
                           cam_under ? 1.0f : 0.0f,
                           0.0f },
    };
    sg_apply_uniforms(UB_composite_fs_params, &SG_RANGE(fs));

    sg_apply_bindings(&(sg_bindings){
        .views[VIEW_scene_color]    = R.offscreen_color_tex,
        .views[VIEW_scene_depth]    = R.offscreen_depth_tex,
        .samplers[SMP_scene_smp]       = R.smp_offscreen,
        .samplers[SMP_scene_depth_smp] = R.smp_offscreen_depth,
    });
    sg_draw(0, 3, 1);
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
    /* Voxel-engine relight: drive the BFS to completion BEFORE meshing
     * this chunk so the per-vertex sky/torch values reflect a fully
     * converged grid. The single-call version (one budgeted slice
     * per chunk) baked stale light values into the mesh when the
     * BFS took longer than one slice to converge - dug-out cavities
     * read as pitch black because the BFS hadn't reached them when
     * the chunk got rebuilt. Each subsequent edit-driven chunk
     * rebuild also runs this loop; the typical per-edit BFS work
     * is tiny (incremental ripple-radius), so the loop usually
     * exits after one iteration.
     *
     * Time the loop explicitly so the profiler ("relight-loop") and
     * the per-session console summary (see relight_track below) can
     * surface the blocking cost. After the first chunk in a frame
     * drives the BFS to convergence, subsequent chunks find dirty
     * already clear and the loop is a no-op; only the first one
     * pays the wall-clock cost. */
    uint64_t t_relight_start = stm_now();
    int relight_iters = 0;
    profiler_begin("relight-loop");
    int safety = 200;
    while (world_light_is_dirty(w->light) && safety-- > 0) {
        hex_mesher_relight_if_needed(w);
        ++relight_iters;
    }
    profiler_end("relight-loop");
    double relight_ms = stm_ms(stm_diff(stm_now(), t_relight_start));
    if (relight_iters > 0) {
        bool first_work_this_frame = (R.relight_loop_ms_this_frame == 0.0);
        if (!R.relight_track.active) {
            R.relight_track.active           = true;
            R.relight_track.world            = w;
            R.relight_track.started_at       = t_relight_start;
            R.relight_track.block_ms_total   = 0;
            R.relight_track.peak_call_ms     = 0;
            R.relight_track.frames           = 0;
            R.relight_track.peak_iters       = 0;
            R.relight_track.last_frame_iters = 0;
        }
        if (first_work_this_frame) ++R.relight_track.frames;
        R.relight_track.block_ms_total += relight_ms;
        if (relight_ms > R.relight_track.peak_call_ms) {
            R.relight_track.peak_call_ms = relight_ms;
        }
        R.relight_track.last_frame_iters += relight_iters;
        if (R.relight_track.last_frame_iters > R.relight_track.peak_iters) {
            R.relight_track.peak_iters = R.relight_track.last_frame_iters;
        }
    }
    R.relight_loop_ms_this_frame += relight_ms;
    R.relight_iters_this_frame   += relight_iters;

    uint64_t t_mesh_start = stm_now();
    profiler_begin("chunk-remesh");
    mesh_chunk_t* c = &body->chunks[chunk_idx];
    hex_mesh_reset(&c->mesh);
    hex_mesh_reset(&c->water_mesh);
    for (int i = 0; i < w->tile_count; ++i) {
        if (body->tile_to_chunk[i] != chunk_idx) continue;
        if (i >= w->gen_cursor) continue;        /* not yet generated */
        hex_mesh_build_tile(&c->mesh, w, i);
        hex_mesh_build_water(&c->water_mesh, w, i);
        /* Per-voxel water cells outside the sea-level ocean cap: cave
         * pools, mountain streams, anywhere the flow simulator pushed
         * water. Skipped on bodies with no water configured so we
         * don't pay for an empty-column walk on barren / icy planets. */
        if (body->has_water) hex_mesh_build_water_voxels(&c->water_mesh, w, i);
        R.tiles_remeshed++;
    }
    profiler_end("chunk-remesh");
    R.mesh_rebuild_ms_this_frame += stm_ms(stm_diff(stm_now(), t_mesh_start));
    ++R.chunks_remeshed_this_frame;

    /* If world_light reports that the session drained to clean in
     * one of the relight calls above, log a one-shot summary line so
     * the user can see the actual blocking cost the "lag on torch
     * place" complaint refers to. The summary is consumed exactly
     * once per session (one-shot edge), so back-to-back chunk
     * rebuilds in the same frame won't double-log. */
    world_light_session_summary_t summary;
    if (world_light_consume_session_summary(w->light, &summary)) {
        char trig[64];
        trig[0] = '\0';
        if (summary.triggers & LIGHT_TRIGGER_TORCH)
            strncat(trig, "torch ", sizeof(trig) - strlen(trig) - 1);
        if (summary.triggers & LIGHT_TRIGGER_BLOCK_EDIT)
            strncat(trig, "block-edit ", sizeof(trig) - strlen(trig) - 1);
        if (summary.triggers & LIGHT_TRIGGER_FULL_MARK)
            strncat(trig, "full-mark ", sizeof(trig) - strlen(trig) - 1);
        if (trig[0] == '\0')
            strncat(trig, "(none) ", sizeof(trig) - strlen(trig) - 1);
        double real_elapsed_ms = stm_ms(stm_diff(stm_now(),
                                                  R.relight_track.started_at));
        printf("[light] %srebuild done on %s: blocked %.2f ms cpu over "
               "%d frame(s) (peak %.2f ms / %d iters in 1 frame), "
               "wall %.0f ms, %d ops, %d call(s), %d edit(s), "
               "%d torch(es)%s\n",
               trig,
               (w->body && w->body->name) ? w->body->name : "?",
               R.relight_track.block_ms_total,
               R.relight_track.frames,
               R.relight_track.peak_call_ms,
               R.relight_track.peak_iters,
               real_elapsed_ms,
               summary.total_ops,
               summary.total_calls,
               summary.edits_seen,
               summary.torch_count,
               summary.was_full_pass ? ", FULL pass" : "");
        fflush(stdout);
        R.relight_track.active = false;
    }
}

/* One-shot mesh of every tile in a body into its chunks. Used for
 * non-active bodies at register time — they're already fully gen'd
 * in main_web.c's init loop, so we can mesh them in one pass without
 * a streaming budget. */
static void body_full_mesh(chunked_body_t* body) {
    world_t* w = body->world;
    /* Run the BFS to completion before building the mesh, not just
     * one budgeted slice. The vertex sky / block values get baked
     * into the mesh here and the chunks only rebuild on subsequent
     * frames when a tile's dirty bit fires; if the BFS were still
     * mid-flight at the moment of meshing, every chunk would carry
     * STALE light values forever (BFS catches up in later frames
     * but those frames don't see a dirty bit, so they don't remesh).
     * The user-visible symptom: caves and shadowed cavities read as
     * pitch black because the BFS hadn't reached those cells when
     * the chunk was built.
     *
     * Looping here forces light convergence as a one-shot stall (~50
     * ms worst case on the biggest baseline) so the initial mesh is
     * built from the converged grid. Per-frame edit-driven relights
     * still use the budgeted path - they're cheap enough not to
     * matter. The safety cap prevents an unbounded loop if some
     * future bug leaves dirty stuck on. */
    uint64_t t_relight_start = stm_now();
    int relight_iters = 0;
    profiler_begin("relight-loop");
    int safety = 200;
    while (world_light_is_dirty(w->light) && safety-- > 0) {
        hex_mesher_relight_if_needed(w);
        ++relight_iters;
    }
    profiler_end("relight-loop");
    double relight_ms = stm_ms(stm_diff(stm_now(), t_relight_start));
    R.relight_loop_ms_this_frame += relight_ms;
    R.relight_iters_this_frame   += relight_iters;
    /* body_full_mesh is only called for the initial demand-load /
     * register of an inactive body, where the full BFS pass is
     * expected to be heavy (the comment above documents the ~50 ms
     * worst case). Log it directly so the cost shows even though
     * the per-session console summary mechanism above attributes
     * the bulk to the world_light session rather than the meshing
     * stall. */
    if (relight_ms > 1.0) {
        printf("[light] body_full_mesh relight on %s: %.2f ms in %d call(s)\n",
               (w->body && w->body->name) ? w->body->name : "?",
               relight_ms, relight_iters);
        fflush(stdout);
    }

    uint64_t t_mesh_start = stm_now();
    profiler_begin("chunk-remesh");
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
        if (body->has_water) {
            hex_mesh_build_water(&c->water_mesh, w, i);
            hex_mesh_build_water_voxels(&c->water_mesh, w, i);
        }
        world_tile_clear_dirty(w, i);
    }
    profiler_end("chunk-remesh");
    R.mesh_rebuild_ms_this_frame += stm_ms(stm_diff(stm_now(), t_mesh_start));
    body->streamed_complete = true;
    body->mesh_cursor = w->tile_count;
    /* Consume any session that the full BFS pass completed during
     * this call so the next world_light_consume_session_summary on
     * a different body / chunk path doesn't pick up our session. */
    world_light_session_summary_t summary;
    if (world_light_consume_session_summary(w->light, &summary)) {
        printf("[light] body_full_mesh session done on %s: %d ops, "
               "%d call(s), trig=0x%x%s\n",
               (w->body && w->body->name) ? w->body->name : "?",
               summary.total_ops, summary.total_calls,
               summary.triggers,
               summary.was_full_pass ? ", FULL pass" : "");
        fflush(stdout);
    }
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
 * uniform block; this just sets the per-body model + planet block
 * and issues the chunk draws. */
/* Per-frame chunk-level backface cull. Each of the 32 chunks has a
 * known unit-sphere centroid in CHUNK_ANCHORS; the dot product of
 * that centroid with the camera's direction-from-body-centre tells
 * us how aligned the chunk is with the visible hemisphere. We skip
 * chunks whose alignment is less than cos(theta_horizon + theta_pad),
 * where theta_horizon depends on the camera's altitude (= acos(R/d)
 * for d > R; 90° at/below surface) and theta_pad is a generous
 * angular margin for chunks straddling the horizon.
 *
 * On a 300 m subdiv-8 planet at eye height (1.6 m), theta_horizon ≈
 * 5.9°, so we keep ~10° + 31° pad ≈ 37° around the camera direction,
 * which covers about 4-6 of the 32 chunks. In orbit (camera 1 km
 * up) the cull keeps roughly the visible hemisphere. In deep space
 * (camera much further than R) it relaxes toward "no cull" because
 * theta_horizon → 90° and almost every anchor is within range. */
typedef struct {
    double cux, cuy, cuz;   /* body-local camera direction (unit) */
    double cull_cos;        /* anchor·cam_dir < this → cull */
} chunk_cull_t;

static chunk_cull_t compute_chunk_cull(const chunked_body_t* body,
                                       vec3_t camera_world) {
    chunk_cull_t cc;
    double cx = (double)(camera_world.x - body->world_pos.x);
    double cy = (double)(camera_world.y - body->world_pos.y);
    double cz = (double)(camera_world.z - body->world_pos.z);
    double cd = sqrt(cx * cx + cy * cy + cz * cz);
    if (cd < 1e-9) {
        /* Camera exactly at body centre — pathological. Don't cull. */
        cc.cux = 1.0; cc.cuy = 0.0; cc.cuz = 0.0;
        cc.cull_cos = -2.0;
        return cc;
    }
    cc.cux = cx / cd;
    cc.cuy = cy / cd;
    cc.cuz = cz / cd;
    double cos_h = (cd > body->radius_m) ? (body->radius_m / cd) : 0.0;
    double theta_h = acos(cos_h);
    /* Chunk angular padding. 32 anchors split 4π sr ⇒ each anchor
     * region ≈ π/8 sr, sphere-cap half-angle acos(15/16) ≈ 20°.
     * Voronoi-on-sphere boundaries extend slightly past the cap,
     * so pad to ~31° to keep horizon-straddling chunks visible. */
    const double theta_chunk = 0.55;
    cc.cull_cos = cos(theta_h + theta_chunk);
    return cc;
}

static inline bool chunk_visible(const chunk_cull_t* cc, int ci) {
    dvec3_t a = CHUNK_ANCHORS[ci];
    double dot = a.x * cc->cux + a.y * cc->cuy + a.z * cc->cuz;
    return dot >= cc->cull_cos;
}

static void body_draw_chunks(chunked_body_t* body, mat4_t vp,
                             vec3_t camera_world) {
    /* Translate to body origin. For Tenebris this is identity (body
     * sits at world origin); for the moons it shifts the chunked
     * mesh out to its pos_x/y/z. */
    mat4_t model = mat4_translate(body->world_pos);
    mat4_t mvp   = mat4_mul(vp, model);

    /* Per-body block also carries planet centre (in the same model
     * space the vertex positions are in — that's body-local pre-
     * translate, so origin is (0,0,0)) and the sea-level radius. The
     * shader needs both for the day/night terminator and underwater-
     * dim depth calc. Water level matches the cap mesh: body radius
     * + water height_offset_m, minus depth_offset_m so the geometric
     * sea level matches where the cap actually sits. */
    const water_config_t* W = config_water();
    const float sea_radius = body->radius_m
                           + W->height_offset_m
                           - W->depth_offset_m;
    hex_vs_params_t hvp = {0};
    memcpy(hvp.u_vp, mvp.m, sizeof(hvp.u_vp));
    hvp.u_planet[0] = 0.0f;          /* model-space body centre */
    hvp.u_planet[1] = 0.0f;
    hvp.u_planet[2] = 0.0f;
    hvp.u_planet[3] = body->has_water ? sea_radius : 0.0f;
    sg_apply_uniforms(UB_hex_vs_params, &SG_RANGE(hvp));
    chunk_cull_t cc = compute_chunk_cull(body, camera_world);
    for (int ci = 0; ci < CHUNK_COUNT; ++ci) {
        mesh_chunk_t* c = &body->chunks[ci];
        if (c->last_uploaded_index_count <= 0) continue;
        if (!chunk_visible(&cc, ci)) continue;
        sg_apply_bindings(&(sg_bindings){
            .vertex_buffers[0]         = c->vbuf,
            .index_buffer              = c->ibuf,
            .views[VIEW_hex_atlas]     = R.atlas_view,
            .samplers[SMP_hex_atlas_smp] = R.atlas_smp,
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

    /* All water knobs come from assets/config/water.yaml — see
     * core/config.h water_config_t for field meanings. The shader
     * just reads them as uniforms. Projection near/far still come
     * from main_web.c's mat4_perspective call (kept hardcoded here
     * because they're a renderer-pipeline detail, not a tuning
     * knob). */
    const water_config_t* W = config_water();
    const float t_scaled = R.time_seconds * W->time_scale;
    const lighting_config_t* L = config_lighting();
    /* Per-tileset water tinting. lod_config exposes optional override
     * vectors for deep_color + absorption; a zeroed entry falls back
     * to the global water_config_t. Sequoia tileset overrides both
     * for an alien-green ocean. The .x channel test is enough since
     * a meaningful tint will always have a non-zero red component
     * (zero red would be a pure-cyan / pure-green, both of which we
     * still want to fail back to the global default rather than
     * accept by accident). */
    const lod_config_t* LP = config_lod();
    int ts_idx = (body->world && body->world->body) ? (int)body->world->body->tileset : 0;
    if (ts_idx < 0 || ts_idx > 4) ts_idx = 0;
    vec3_t deep_c = W->deep_color;
    vec3_t absorb = W->absorption;
    if (LP->tileset_water_deep_color[ts_idx].x > 0.0f
     || LP->tileset_water_deep_color[ts_idx].y > 0.0f
     || LP->tileset_water_deep_color[ts_idx].z > 0.0f) {
        deep_c = LP->tileset_water_deep_color[ts_idx];
    }
    if (LP->tileset_water_absorption[ts_idx].x > 0.0f
     || LP->tileset_water_absorption[ts_idx].y > 0.0f
     || LP->tileset_water_absorption[ts_idx].z > 0.0f) {
        absorb = LP->tileset_water_absorption[ts_idx];
    }

    /* Perf mode: feed water_mobile.glsl's smaller uniform blocks +
     * skip the offscreen scene-color/depth bindings entirely. The
     * mobile pipeline is alpha-blended on top of the swapchain
     * composite, so there's no FBO sample. The mobile vertex shader
     * has no swell (waves), so we don't pass swell_* / u_time to vs -
     * the fragment ripple keeps the surface looking like water via
     * normal-bump alone. */
    if (R_PERF_MODE) {
        vs_params_mobile_t vs_mobile = {
            .u_planet     = { 0.0f, 0.0f, 0.0f, 0.0f },
            .u_sun_dir    = { R.env.sun_dir.x, R.env.sun_dir.y, R.env.sun_dir.z, 0.0f },
            .u_terminator = { L->night_ambient_floor, L->terminator_lo,
                              L->terminator_hi, 0.0f },
        };
        memcpy(vs_mobile.u_vp, mvp.m, sizeof(vs_mobile.u_vp));
        sg_apply_uniforms(UB_vs_params_mobile, &SG_RANGE(vs_mobile));

        fs_params_mobile_t fs_mobile = {
            .u_camera_pos     = { camera_world.x, camera_world.y, camera_world.z },
            .u_sun_dir        = { R.env.sun_dir.x, R.env.sun_dir.y, R.env.sun_dir.z },
            .u_time           = t_scaled,
            .u_deep_color     = { deep_c.x, deep_c.y, deep_c.z },
            .u_spec_intensity = W->specular_intensity,
            .u_spec_power     = W->specular_power,
            .u_sun_tint       = { W->sun_tint.x, W->sun_tint.y, W->sun_tint.z },
            .u_sky_horizon    = { W->sky_horizon_color.x, W->sky_horizon_color.y, W->sky_horizon_color.z },
            .u_sky_zenith     = { W->sky_zenith_color.x, W->sky_zenith_color.y, W->sky_zenith_color.z },
            .u_sky_horizon_strength = W->sky_horizon_strength,
            .u_ripple_scale   = W->ripple_scale,
            .u_ripple_speed   = W->ripple_speed,
            .u_wave_steepness = W->wave_steepness,
            .u_night_floor    = L->night_ambient_floor,
            .u_torch_color    = { L->torch_color.x, L->torch_color.y, L->torch_color.z,
                                  L->torch_intensity },
            /* Horizon haze - cheap stand-in for the desktop shader's
             * Beer-Lambert thickness fog. Without it, mobile water
             * reads as a uniform slab where the desktop version softly
             * fades into the atmosphere at distance. Tunable knobs
             * land in water.yaml below; defaults are sized so the
             * effect kicks in at ~300 m and saturates around 800 m. */
            .u_horizon_fade_m        = W->horizon_fade_m,
            .u_horizon_fade_strength = W->horizon_fade_strength,
            /* Per-voxel water falling-bias. Multiplied by the
             * vertical_factor derived from a_normal vs radial, so the
             * ocean cap (alignment ≈ 1) gets zero contribution and the
             * side of a waterfall column (alignment ≈ 0) gets the full
             * scroll. Sourced from water.yaml flow_uv_speed_falling. */
            .u_flow_speed_falling    = config_water_flow()->uv_speed_falling,
        };
        sg_apply_uniforms(UB_fs_params_mobile, &SG_RANGE(fs_mobile));

        chunk_cull_t cc = compute_chunk_cull(body, camera_world);
        for (int ci = 0; ci < CHUNK_COUNT; ++ci) {
            mesh_chunk_t* c = &body->chunks[ci];
            if (c->last_uploaded_water_idx_count <= 0) continue;
            if (!chunk_visible(&cc, ci)) continue;
            sg_apply_bindings(&(sg_bindings){
                .vertex_buffers[0] = c->water_vbuf,
                .index_buffer      = c->water_ibuf,
                /* Mobile water surface samples the pre-baked normal
                 * map - cheaper than the desktop fbm + finite-diff.
                 * No FBO bindings: the mobile surface shader uses a
                 * flat u_deep_color body (no refraction, no thickness
                 * fog). composite_mobile already forwarded opaque
                 * scene depth into the swapchain depth, so the
                 * pipeline's LESS_EQUAL test handles terrain
                 * occlusion. */
                .views[VIEW_water_normal_tex] = R.water_normal_view,
                .samplers[SMP_water_normal_smp] = R.water_normal_smp,
            });
            sg_draw(0, c->last_uploaded_water_idx_count, 1);
            R.tris += (size_t)c->last_uploaded_water_idx_count / 3;
        }
        return;
    }

    /* sokol-shdc emits std140-laid-out structs + slot constants —
     * no manual offset math, no _pad_NN by hand. The water cap
     * shares its day/night terminator inputs with the hex shader —
     * planet centre is body-local origin (model translates to
     * body->world_pos before the vp), sun_dir + terminator come from
     * the shared lighting config. */
    vs_params_t vs_params = {
        .u_planet           = { 0.0f, 0.0f, 0.0f, 0.0f },
        .u_sun_dir          = { R.env.sun_dir.x, R.env.sun_dir.y, R.env.sun_dir.z, 0.0f },
        .u_terminator       = { L->night_ambient_floor, L->terminator_lo,
                                L->terminator_hi, 0.0f },
        .u_time             = t_scaled,
        .u_swell_amplitude  = W->swell_amplitude,
        .u_swell_frequency  = W->swell_frequency,
        .u_swell_speed      = W->swell_speed,
    };
    memcpy(vs_params.u_vp, mvp.m, sizeof(vs_params.u_vp));
    sg_apply_uniforms(UB_vs_params, &SG_RANGE(vs_params));

    fs_params_t fs_params = {
        .u_camera_pos      = { camera_world.x, camera_world.y, camera_world.z },
        .u_sun_dir         = { R.env.sun_dir.x, R.env.sun_dir.y, R.env.sun_dir.z },
        .u_time            = t_scaled,
        .u_refract_amount  = W->refract_amount,
        .u_near            = 0.3f,
        .u_far             = 20000.0f,
        .u_absorption      = { absorb.x, absorb.y, absorb.z },
        .u_deep_color      = { deep_c.x, deep_c.y, deep_c.z },
        .u_spec_intensity  = W->specular_intensity,
        .u_spec_power      = W->specular_power,
        .u_sun_tint        = { W->sun_tint.x, W->sun_tint.y, W->sun_tint.z },
        /* Pack the foam scalars into vec4s so std140 keeps them
         * tightly aligned. crest.w doubles as the overall mix
         * intensity; slope.w is unused (kept aligned). */
        .u_foam_crest      = { W->foam_crest_lo, W->foam_crest_hi, W->foam_crest_weight, W->foam_intensity },
        .u_foam_slope      = { W->foam_slope_lo, W->foam_slope_hi, W->foam_slope_weight, 0.0f },
        .u_foam_color      = { W->foam_color.x, W->foam_color.y, W->foam_color.z },
        .u_sky_horizon     = { W->sky_horizon_color.x, W->sky_horizon_color.y, W->sky_horizon_color.z },
        .u_sky_horizon_strength = W->sky_horizon_strength,
        .u_sky_zenith      = { W->sky_zenith_color.x, W->sky_zenith_color.y, W->sky_zenith_color.z },
        .u_ripple_scale    = W->ripple_scale,
        .u_ripple_speed    = W->ripple_speed,
        .u_wave_steepness  = W->wave_steepness,
        .u_night_floor     = L->night_ambient_floor,
        .u_torch_color     = { L->torch_color.x, L->torch_color.y, L->torch_color.z,
                               L->torch_intensity },
        /* Per-voxel water falling-bias. The water shader multiplies
         * this by the vertical_factor it derives from a_normal vs
         * radial, so the ocean cap (alignment ≈ 1) gets zero shift
         * and the side of a waterfall column (alignment ≈ 0) gets the
         * full scroll. Sourced from water.yaml flow_uv_speed_falling. */
        .u_flow_speed_falling = config_water_flow()->uv_speed_falling,
    };
    sg_apply_uniforms(UB_fs_params, &SG_RANGE(fs_params));

    chunk_cull_t cc = compute_chunk_cull(body, camera_world);
    for (int ci = 0; ci < CHUNK_COUNT; ++ci) {
        mesh_chunk_t* c = &body->chunks[ci];
        if (c->last_uploaded_water_idx_count <= 0) continue;
        if (!chunk_visible(&cc, ci)) continue;
        sg_apply_bindings(&(sg_bindings){
            .vertex_buffers[0] = c->water_vbuf,
            .index_buffer      = c->water_ibuf,
            /* Offscreen colour + depth views (same images the
             * compose blit + scene render populated). Two samplers:
             * LINEAR for colour (smooth refraction), NEAREST for
             * depth (WebGL2 disallows linear depth sampling). */
            .views[VIEW_water_scene_color]    = R.offscreen_color_tex,
            .views[VIEW_water_scene_depth]    = R.offscreen_depth_tex,
            .samplers[SMP_water_scene_smp]       = R.smp_offscreen,
            .samplers[SMP_water_scene_depth_smp] = R.smp_offscreen_depth,
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
        int dirty_tiles = 0;
        for (int i = 0; i < body->world->tile_count; ++i) {
            if (!world_tile_dirty(body->world, i)) continue;
            body->chunks[body->tile_to_chunk[i]].dirty = true;
            world_tile_clear_dirty(body->world, i);
            ++dirty_tiles;
        }
        /* Spread chunk rebuilds across frames. A flow tick that dirties
         * tiles in N chunks would otherwise stall the mainloop for the
         * sum of N body_chunk_rebuild_full calls in a single frame -
         * water flowing across a hillside hits a dozen chunks at once
         * and visibly hitches. Cap to the YAML-configured budget; the
         * remaining chunks keep their dirty flag and are picked up on
         * the next frame's pass. Floor at 1 so a hostile config can't
         * starve the queue. */
        int remesh_budget = config_water_flow()->max_chunks_remesh_per_frame;
        if (remesh_budget < 1) remesh_budget = 1;
        int chunks_rebuilt = 0;
        for (int ci = 0; ci < CHUNK_COUNT; ++ci) {
            if (!body->chunks[ci].dirty) continue;
            if (chunks_rebuilt >= remesh_budget) break;
            body_chunk_rebuild_full(body, ci);
            body->chunks[ci].dirty = false;
            body_grew[ci] = true;
            ++chunks_rebuilt;
            any_grew = true;
        }
        for (int ci = 0; ci < CHUNK_COUNT; ++ci) {
            if (body_grew[ci]) chunk_upload(&body->chunks[ci]);
        }
        /* Loudly trace the per-frame remesh activity on the active +
         * any already-detailed body. This is the difference between
         * "CHUNK_DIFFs arrived but the world stays visually frozen"
         * (silent here = no rebuild = bug) and "CHUNK_DIFFs arrived
         * AND we rebuilt N chunks" (visible change incoming next
         * frame). Skip the silent zero-tile case so idle frames stay
         * quiet. */
        if (dirty_tiles > 0) {
            const char* name = (body->world && body->world->body
                                 && body->world->body->name)
                                 ? body->world->body->name : "?";
            printf("[renderer] remesh %s: %d dirty tile(s), %d chunk(s) rebuilt\n",
                   name, dirty_tiles, chunks_rebuilt);
            fflush(stdout);
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
            /* printf("[renderer] all %d chunks loaded on %s (%d total indices)\n",
             *        CHUNK_COUNT, active->world->body->name, total_idx); */
            (void)total_idx;
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
    /* Per-frame lighting blocks — sun direction (vs + fs both need it
     * so it appears in both blocks), ambient (fs only), and the
     * day/night terminator. .x carries the night-side ambient floor,
     * .yz the smoothstep lo/hi the vs uses to gate v_sun_brightness. */
    const lighting_config_t* L = config_lighting();
    {
        hex_vs_light_t hex_vs_light = {
            .u_sun_dir    = { R.env.sun_dir.x, R.env.sun_dir.y, R.env.sun_dir.z },
            .u_terminator = { L->night_ambient_floor, L->terminator_lo,
                              L->terminator_hi, 0.0f },
        };
        sg_apply_uniforms(UB_hex_vs_light, &SG_RANGE(hex_vs_light));
    }
    {
        hex_fs_light_t hex_fs_light = {
            .u_sun_dir    = { R.env.sun_dir.x, R.env.sun_dir.y, R.env.sun_dir.z },
            .u_ambient    = { R.env.ambient.x, R.env.ambient.y, R.env.ambient.z },
            .u_terminator = { L->night_ambient_floor, L->terminator_lo,
                              L->terminator_hi, 0.0f },
        };
        sg_apply_uniforms(UB_hex_fs_light, &SG_RANGE(hex_fs_light));
    }
    /* Underwater-dim block reuses the water cap's per-channel
     * absorption + deep_color so terrain visible *under* the cap
     * tints with the same colour curve the cap uses, and the
     * boundary where they meet reads as one continuous body of
     * water instead of two stacked layers with different formulas. */
    {
        const water_config_t* W = config_water();
        hex_fs_water_t hex_under = {
            .u_absorption = { W->absorption.x, W->absorption.y, W->absorption.z },
            .u_deep_color = { W->deep_color.x, W->deep_color.y, W->deep_color.z },
        };
        sg_apply_uniforms(UB_hex_fs_water, &SG_RANGE(hex_under));
    }

    /* Torch tint + intensity — additive warm contribution per unit
     * of v_torch_light (which the mesher baked from the placed-torch
     * list at remesh time). Tint matches the JS reference's
     * (1.0, 0.7, 0.3) warm-orange, exposed via lighting.yaml so it
     * can be cooled / brightened without recompiling. */
    {
        hex_fs_torch_t hex_torch = {
            .u_torch_color = { L->torch_color.x, L->torch_color.y, L->torch_color.z,
                               L->torch_intensity },
        };
        sg_apply_uniforms(UB_hex_fs_torch, &SG_RANGE(hex_torch));
    }

    /* Frustum + LOD culling — far bodies drop to a single icosphere
     * draw via renderer_draw_moons. Detailed (chunked) draws happen
     * here for any body that's both visible and close enough.
     * Threshold matches renderer_draw_moons (3.33 × radius cutoff). */
    frustum_plane_t frustum[6];
    extract_frustum(vp, frustum);

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
        /* "Too far for chunked detail" hard cutoff. Applies to EVERY
         * body, including the active one - lets the player fly clear
         * of Tenebris into another body's gravity well (or just into
         * deep space) and the home planet drops to its icosphere LOD
         * the same way moons do. Without this, the active body kept
         * rendering its full 160k-tile chunked mesh at 5+ km, fighting
         * the LOD icosphere for the same pixels and burning CPU on a
         * planet that's a smudge on screen anyway. */
        const float MAX_DETAIL_DIST_M = 5000.0f;
        const bool too_far = (dist > MAX_DETAIL_DIST_M);
        /* Only the ACTIVE body draws chunked terrain. Every other body
         * goes to the icosphere LOD regardless of angular size - so a
         * Sequoia floating a few hundred metres off Crag's surface
         * doesn't keep its full 160k-tile mesh up. Active body still
         * has to be within the 5 km hard cutoff. */
        const bool distant = too_far || !is_active;
        if (distant) {
            /* Release the chunked mesh + GPU buffers once we cross
             * the cutoff so the memory footprint of a body the
             * player has flown 5+ km away from doesn't linger.
             * body_load_detail will rebuild from scratch on re-
             * approach; the cost is the same as the initial mesh. */
            if (body->meshed) body_unload_detail(body);
            continue;
        }
        if (!body->meshed) body_load_detail(body);
        body_draw_chunks(body, vp, R.env.camera_world);
    }

    /* Water no longer drawn here — moved to renderer_draw_water,
     * which runs in the swapchain pass after compose_to_swapchain so
     * the water shader can sample the offscreen colour + depth. */
    }   /* end of if (R_TERRAIN_VISIBLE) */
}

/* Pipeline for the block-outline wireframe. Lazy-created on first use
 * so we don't pay the make_pipeline cost for SP-only / menu-mode
 * sessions that never call into the interact path. Lines + depth test
 * enabled + alpha blend so the outline sits on top of the world but
 * gets occluded by closer geometry. */
static sgl_pipeline G_OUTLINE_PIP = (sgl_pipeline){0};

static void ensure_outline_pip(void) {
    if (G_OUTLINE_PIP.id != 0) return;
    G_OUTLINE_PIP = sgl_make_pipeline(&(sg_pipeline_desc){
        .primitive_type = SG_PRIMITIVETYPE_LINES,
        .depth = {
            .compare       = SG_COMPAREFUNC_LESS_EQUAL,
            .write_enabled = false,
        },
        .colors[0].blend = {
            .enabled         = true,
            .src_factor_rgb  = SG_BLENDFACTOR_SRC_ALPHA,
            .dst_factor_rgb  = SG_BLENDFACTOR_ONE_MINUS_SRC_ALPHA,
            .src_factor_alpha= SG_BLENDFACTOR_ONE,
            .dst_factor_alpha= SG_BLENDFACTOR_ONE,
        },
    });
}

void renderer_draw_face_outline(mat4_t view, mat4_t proj,
                                  const world_t* world,
                                  int tile_idx, int depth,
                                  int nbr_tile, int nbr_depth,
                                  float r, float g, float b, float a) {
    if (!world || !world->body || !world->grid) return;
    if (tile_idx < 0 || tile_idx >= world->tile_count) return;
    if (depth < 0 || depth >= WORLD_MAX_DEPTH) return;
    const goldberg_tile_t* t = goldberg_tile(world->grid, tile_idx);
    if (!t) return;
    const int n = t->num_verts;
    if (n <= 0) return;

    /* Classify which face. Top/bottom caps are aligned with depth+1 /
     * depth-1 on the same tile; side faces are same-depth, neighbour-
     * tile pairs found via the goldberg edge_neighbours table. */
    enum { FACE_NONE, FACE_TOP_CAP, FACE_BOTTOM_CAP, FACE_SIDE } kind = FACE_NONE;
    int side_edge_k = -1;
    if (nbr_tile == tile_idx) {
        if (nbr_depth == depth + 1) kind = FACE_TOP_CAP;
        else if (nbr_depth == depth - 1) kind = FACE_BOTTOM_CAP;
    } else if (nbr_depth == depth) {
        for (int k = 0; k < n; ++k) {
            if (t->edge_neighbours[k] == nbr_tile) { side_edge_k = k; break; }
        }
        if (side_edge_k >= 0) kind = FACE_SIDE;
    }
    if (kind == FACE_NONE) return;

    ensure_outline_pip();
    sgl_defaults();
    sgl_matrix_mode_projection();
    sgl_load_matrix(proj.m);
    sgl_matrix_mode_modelview();
    sgl_load_matrix(view.m);
    sgl_translate((float)world->body->pos_x,
                  (float)world->body->pos_y,
                  (float)world->body->pos_z);
    sgl_load_pipeline(G_OUTLINE_PIP);

    sgl_begin_lines();
    sgl_c4f(r, g, b, a);

    if (kind == FACE_TOP_CAP || kind == FACE_BOTTOM_CAP) {
        /* Cap perimeter at the matching radius. Top cap sits at
         * radius(depth+1) (top of the block). Bottom cap at
         * radius(depth). */
        double ring_r = (kind == FACE_TOP_CAP)
                          ? world_depth_to_radius_m(world, depth + 1)
                          : world_depth_to_radius_m(world, depth);
        for (int k = 0; k < n; ++k) {
            int next = (k + 1) % n;
            dvec3_t a_v = dvec3_scale(t->verts[k],    ring_r);
            dvec3_t b_v = dvec3_scale(t->verts[next], ring_r);
            sgl_v3f((float)a_v.x, (float)a_v.y, (float)a_v.z);
            sgl_v3f((float)b_v.x, (float)b_v.y, (float)b_v.z);
        }
    } else {  /* FACE_SIDE */
        /* Side quad: corners verts[k] and verts[k+1] at the two
         * radii. Trace 4 edges around the rectangle. */
        int k_a = side_edge_k;
        int k_b = (k_a + 1) % n;
        double r_bot = world_depth_to_radius_m(world, depth);
        double r_top = world_depth_to_radius_m(world, depth + 1);
        dvec3_t inner_a = dvec3_scale(t->verts[k_a], r_bot);
        dvec3_t inner_b = dvec3_scale(t->verts[k_b], r_bot);
        dvec3_t outer_a = dvec3_scale(t->verts[k_a], r_top);
        dvec3_t outer_b = dvec3_scale(t->verts[k_b], r_top);
        /* bottom edge */
        sgl_v3f((float)inner_a.x, (float)inner_a.y, (float)inner_a.z);
        sgl_v3f((float)inner_b.x, (float)inner_b.y, (float)inner_b.z);
        /* right edge */
        sgl_v3f((float)inner_b.x, (float)inner_b.y, (float)inner_b.z);
        sgl_v3f((float)outer_b.x, (float)outer_b.y, (float)outer_b.z);
        /* top edge */
        sgl_v3f((float)outer_b.x, (float)outer_b.y, (float)outer_b.z);
        sgl_v3f((float)outer_a.x, (float)outer_a.y, (float)outer_a.z);
        /* left edge */
        sgl_v3f((float)outer_a.x, (float)outer_a.y, (float)outer_a.z);
        sgl_v3f((float)inner_a.x, (float)inner_a.y, (float)inner_a.z);
    }
    sgl_end();
}

/* F5 water-flow debug overlay. Iterates every water cell in the active
 * body's world, asks world_water_flow_direction for the simulator-
 * computed direction, and draws ONE textured arrow quad lying flat on
 * the cell's top cap, oriented so the texture's +U axis (arrow tip)
 * points along the flow direction.
 *
 * Cells with no flow (worldgen ocean, sources, sleeping cells) return
 * false from world_water_flow_direction and we draw nothing - the
 * absence of an arrow IS the diagnostic. Use this to verify the
 * simulator computed origins for the cells you'd expect to flow
 * before assuming the renderer / shader is at fault.
 *
 * Per-quad math:
 *   forward = flow direction projected onto the tile tangent plane.
 *   right   = cross(radial, forward) - the in-plane axis perpendicular
 *             to flow, used as the quad's lateral half-extent.
 *   The four corners (BL, BR, TR, TL) are at center +/- forward*half
 *   +/- right*half, with texture coords mapping +U -> forward, +V ->
 *   right (so the arrow tip lands on the +U=1 edge as designed in
 *   tools/gen-water-flow-arrow.py).
 *
 * Cost: walks tile_count * WORLD_MAX_DEPTH cells. Most are air; the
 * BLOCK_WATER check + the origin-list lookup short-circuit quickly.
 * Only runs while R_FLOW_DEBUG is on. */
/* Visitor callback state for the F5 overlay's flow-cell walk. */
typedef struct {
    const world_t* w;
    float          lift_m;
    int            drawn;   /* incremented per arrow actually emitted */
} flow_arrow_ctx_t;

/* Per-cell line drawing for the F5 wireframe overlay. Emits ONE
 * bright magenta arrow per flow cell: shaft from the hex centre out
 * along the flow direction, plus two short barb lines at the tip.
 *
 * Lines through G_OUTLINE_PIP (depth-tested but write-disabled,
 * alpha-blended). No texture, no quad, no shader compilation. */
static void flow_arrow_visit(int tile, int depth, void* user) {
    flow_arrow_ctx_t* ctx = (flow_arrow_ctx_t*)user;
    const world_t* w = ctx->w;
    const goldberg_tile_t* t = goldberg_tile(w->grid, tile);
    if (!t) return;
    if (w->blocks[(size_t)tile * WORLD_MAX_DEPTH + depth] != (uint8_t)BLOCK_WATER) return;
    float flow_world[3];
    if (!world_water_flow_direction(w, tile, depth, flow_world)) return;

    /* Cap centre, lifted ~1 m along radial so the arrow sits above
     * the wave crests and nearby terrain. */
    double r_cap = world_depth_to_radius_m(w, depth + 1) + (double)ctx->lift_m;
    float cx = (float)(t->center.x * r_cap);
    float cy = (float)(t->center.y * r_cap);
    float cz = (float)(t->center.z * r_cap);

    /* Project flow onto tile tangent plane, normalise. */
    float nx = (float)t->center.x;
    float ny = (float)t->center.y;
    float nz = (float)t->center.z;
    float dn = flow_world[0]*nx + flow_world[1]*ny + flow_world[2]*nz;
    float fx = flow_world[0] - nx * dn;
    float fy = flow_world[1] - ny * dn;
    float fz = flow_world[2] - nz * dn;
    float fl = sqrtf(fx*fx + fy*fy + fz*fz);
    if (fl < 1e-4f) return;
    fx /= fl; fy /= fl; fz /= fl;
    float rx = ny*fz - nz*fy;
    float ry = nz*fx - nx*fz;
    float rz = nx*fy - ny*fx;

    /* Shaft fills most of a hex (~0.6 m). Barbs are 0.22 m each
     * swept ~30 deg back from the tip. */
    const float shaft = 0.60f;
    const float barb  = 0.22f;
    const float cs    = cosf(2.6f);
    const float sn    = sinf(2.6f);

    float tipx = cx + fx * shaft;
    float tipy = cy + fy * shaft;
    float tipz = cz + fz * shaft;

    sgl_c4f(1.0f, 0.2f, 1.0f, 1.0f);  /* bright magenta arrow */
    sgl_v3f(cx, cy, cz);
    sgl_v3f(tipx, tipy, tipz);

    float bax = -fx * cs + rx * sn;
    float bay = -fy * cs + ry * sn;
    float baz = -fz * cs + rz * sn;
    float bbx = -fx * cs - rx * sn;
    float bby = -fy * cs - ry * sn;
    float bbz = -fz * cs - rz * sn;
    sgl_v3f(tipx, tipy, tipz);
    sgl_v3f(tipx + bax * barb, tipy + bay * barb, tipz + baz * barb);
    sgl_v3f(tipx, tipy, tipz);
    sgl_v3f(tipx + bbx * barb, tipy + bby * barb, tipz + bbz * barb);

    ++ctx->drawn;
}

/* Draw a cyan 3D X (three short crossed segments) at the cell centre,
 * marking it as a spawner / ocean block. Same line pipeline as the
 * magenta arrow path. Two perpendicular line segments in the tile
 * tangent plane, plus a small vertical tick for legibility from
 * straight above. */
static void draw_spawn_x(const goldberg_tile_t* t, double r_cap) {
    float cx = (float)(t->center.x * r_cap);
    float cy = (float)(t->center.y * r_cap);
    float cz = (float)(t->center.z * r_cap);
    /* Two arbitrary in-plane axes (same recipe as the water shader's
     * tangent basis). */
    float nx = (float)t->center.x, ny = (float)t->center.y, nz = (float)t->center.z;
    float ux = (fabsf(nx) > 0.9f) ? 0.0f : 1.0f;
    float uy = (fabsf(nx) > 0.9f) ? 1.0f : 0.0f;
    float uz = 0.0f;
    float dn = ux*nx + uy*ny + uz*nz;
    ux -= nx*dn; uy -= ny*dn; uz -= nz*dn;
    float ul = sqrtf(ux*ux + uy*uy + uz*uz);
    if (ul < 1e-4f) return;
    ux /= ul; uy /= ul; uz /= ul;
    float vx = ny*uz - nz*uy;
    float vy = nz*ux - nx*uz;
    float vz = nx*uy - ny*ux;

    /* Diagonal arms = (u + v)/sqrt2 and (u - v)/sqrt2 so the X reads
     * as an X rather than a + sign. Length ~0.45 m (slightly smaller
     * than the arrow shaft so the two glyphs look proportional). */
    const float L = 0.45f * 0.70710678f;
    float a1x = (ux + vx) * L, a1y = (uy + vy) * L, a1z = (uz + vz) * L;
    float a2x = (ux - vx) * L, a2y = (uy - vy) * L, a2z = (uz - vz) * L;

    sgl_c4f(1.0f, 0.2f, 1.0f, 1.0f);  /* bright magenta X for spawn (matches arrow colour) */
    sgl_v3f(cx - a1x, cy - a1y, cz - a1z);
    sgl_v3f(cx + a1x, cy + a1y, cz + a1z);
    sgl_v3f(cx - a2x, cy - a2y, cz - a2z);
    sgl_v3f(cx + a2x, cy + a2y, cz + a2z);
}

void renderer_draw_water_flow_debug(mat4_t view, mat4_t proj) {
    if (!R_FLOW_DEBUG) return;
    if (R.active_body_idx < 0) return;
    chunked_body_t* body = &R.bodies[R.active_body_idx];
    const world_t* w = body->world;
    if (!w || !w->grid) return;

    ensure_outline_pip();
    sgl_defaults();
    sgl_matrix_mode_projection();
    sgl_load_matrix(proj.m);
    sgl_matrix_mode_modelview();
    sgl_load_matrix(view.m);
    sgl_translate((float)w->body->pos_x,
                  (float)w->body->pos_y,
                  (float)w->body->pos_z);
    sgl_load_pipeline(G_OUTLINE_PIP);

    sgl_begin_lines();

    /* Pass 1: magenta arrows on every cell that has an origin entry. */
    flow_arrow_ctx_t ctx = { .w = w, .lift_m = 1.0f, .drawn = 0 };
    world_water_origin_visit_all(w, flow_arrow_visit, &ctx);

    /* Pass 2: cyan X on every spawn block (state==0 OR SOURCE-flagged)
     * within ~80 m of the camera. The full-world walk would be O(tile
     * * depth) = millions of cells per frame and tank perf with
     * nothing to show for it - the camera-distance gate trims the
     * work to the few tiles actually visible. */
    vec3_t cw = R.env.camera_world;
    vec3_t bw = body->world_pos;
    double cam_lx = (double)(cw.x - bw.x);
    double cam_ly = (double)(cw.y - bw.y);
    double cam_lz = (double)(cw.z - bw.z);
    const double max_d = 80.0;          /* metres */
    const double max_d2 = max_d * max_d;
    int x_drawn = 0;
    for (int ti = 0; ti < w->tile_count; ++ti) {
        const goldberg_tile_t* t = goldberg_tile(w->grid, ti);
        if (!t) continue;
        /* Tile centre at the planet's outer radius - cheap distance
         * gate before the per-depth walk. */
        double rs = w->body->radius_m;
        double tx = t->center.x * rs;
        double ty = t->center.y * rs;
        double tz = t->center.z * rs;
        double dx = tx - cam_lx, dy = ty - cam_ly, dz = tz - cam_lz;
        if (dx*dx + dy*dy + dz*dz > max_d2) continue;
        const uint8_t* col = &w->blocks[(size_t)ti * WORLD_MAX_DEPTH];
        for (int d = 0; d < WORLD_MAX_DEPTH; ++d) {
            if (col[d] != (uint8_t)BLOCK_WATER) continue;
            uint8_t st = world_water_get_state(w, ti, d);
            /* "Spawn block" per the user's mental model: state==0
             * (worldgen / auto-promoted ocean) OR explicit SOURCE
             * flag (placed source). Cells with origins are flow
             * blocks and drew arrows above - skip them here. */
            if (st != 0u && !water_state_is_source(st)) continue;
            /* Skip cells covered by water directly above - their
             * "top" is the upper cell's cap, not their own, so an
             * X here would be buried inside the column. */
            if (d + 1 < WORLD_MAX_DEPTH
                && col[d + 1] == (uint8_t)BLOCK_WATER) continue;
            double r_cap = world_depth_to_radius_m(w, d + 1) + 1.0;
            draw_spawn_x(t, r_cap);
            ++x_drawn;
        }
    }

    sgl_end();

    static double s_last_log_s = 0.0;
    if (R.time_seconds - s_last_log_s > 1.0) {
        printf("[flow-debug] drew %d arrow(s) + %d spawn-X this frame\n",
               ctx.drawn, x_drawn);
        fflush(stdout);
        s_last_log_s = R.time_seconds;
    }
}

void renderer_draw_water(mat4_t view, mat4_t proj, vec3_t camera_world) {
    if (!R_TERRAIN_VISIBLE) return;
    if (!R_WATER_VISIBLE)   return;

    mat4_t vp = mat4_mul(proj, view);
    frustum_plane_t frustum[6];
    extract_frustum(vp, frustum);
    /* Only the active body draws its water cap. Non-active bodies
     * show the icosphere LOD only - the cap is invisible at that
     * distance and triples the draw cost. */

    sg_apply_pipeline(R_PERF_MODE ? R.pip_water_mobile : R.pip_water);
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
        /* Mirror the terrain pass's hard 5 km cutoff so a body the
         * player has flown clear of doesn't keep drawing its water
         * cap mesh either - the cap is invisible at that distance
         * and just burns frame time. */
        const float MAX_DETAIL_DIST_M = 5000.0f;
        /* Only the active body draws its water cap. Non-active
         * bodies show their icosphere LOD only (no translucent
         * water mesh) - matches the chunked-terrain rule. */
        const bool distant = (dist > MAX_DETAIL_DIST_M) || !is_active;
        if (distant) continue;
        body_draw_water(body, vp, camera_world);
    }
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
void renderer_set_water_visible(bool v)   { R_WATER_VISIBLE = v;   }
bool renderer_water_visible(void)          { return R_WATER_VISIBLE; }
void renderer_set_skybox_visible(bool v)  { R_SKYBOX_VISIBLE = v;  }
bool renderer_skybox_visible(void)         { return R_SKYBOX_VISIBLE; }
void renderer_set_flow_debug(bool v)      { R_FLOW_DEBUG = v;     }
bool renderer_flow_debug(void)             { return R_FLOW_DEBUG; }

unsigned int renderer_atlas_view_id(void)    { return R.atlas_view.id; }
unsigned int renderer_atlas_sampler_id(void) { return R.atlas_smp.id; }

void renderer_draw_torches(mat4_t view, mat4_t proj) {
    if (!R_TERRAIN_VISIBLE) return;
    mat4_t vp = mat4_mul(proj, view);
    torch_draw(vp, R.time_seconds);
}
