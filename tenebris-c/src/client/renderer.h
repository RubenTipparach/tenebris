#ifndef TENEBRIS_CLIENT_RENDERER_H
#define TENEBRIS_CLIENT_RENDERER_H

#include "core/world.h"
#include "client/gfx_math.h"
#include <stddef.h>
#include <stdbool.h>
#include <stdint.h>

typedef struct {
    vec3_t sun_dir;        /* normalised direction from system origin to sun */
    vec3_t sun_pos;        /* world-space sun position                       */
    float  sun_radius;     /* sun sphere radius in world units               */
    vec3_t sky_top;
    vec3_t sky_bottom;
    vec3_t ambient;

    /* Bruneton-style atmospheric scattering (precomputed_atmospheric_
     * scattering / GPUGems2 ch.16). When `atmo_strength` > 0 the skybox
     * pass ray-marches Rayleigh + Mie inscattering through a spherical
     * shell centred at `atmo_planet_center` (world space) with radius
     * `atmo_radius` over a planet of radius `atmo_planet_radius`.
     * `atmo_strength` 0..1 cross-fades between starfield-only space
     * (moons / asteroids) and full atmosphere (Tenebris, Sequoia). */
    vec3_t atmo_planet_center;
    float  atmo_planet_radius;     /* Rp — actual planet ground (planet-clip) */
    float  atmo_radius;            /* Ra — outer atmosphere shell             */
    float  atmo_lower_radius;      /* Rg — density lower bound; 0 → use Rp    */
    float  atmo_strength;
    /* Per-body scattering tuning — comes straight from body_config.
     * Lets us make Tenebris bluer, Sequoia greener, etc., without
     * recompiling the shader. All values are passed verbatim to the
     * fragment shader as uniform floats / vec3s. */
    float  atmo_rayleigh_scale;
    float  atmo_mie_scale;
    float  atmo_sun_intensity;
    float  atmo_sunset_strength;
    vec3_t atmo_wavelengths;     /* (1/λ⁴) RGB ratios for Rayleigh   */
    float  atmo_mie_g;           /* Mie phase asymmetry (-1..1)      */
    float  atmo_scale_height;    /* density falloff (normalised)     */
    vec3_t atmo_sunset_tint;     /* sky multiplier near horizon      */
    vec3_t atmo_sunset_glow;     /* sun-direction glow at sunset     */
    vec3_t atmo_sunset_horizon;  /* horizon-band tint at sunset      */
    vec3_t camera_world;     /* used as ray-march origin for the sky pass */
} render_env_t;

void renderer_init(void);
void renderer_shutdown(void);

/* Perf mode (mobile / low-power). MUST be called before renderer_init.
 * When enabled, renderer_init builds the water_mobile + composite_mobile
 * shader pipelines alongside the desktop pair and the draw paths route
 * through them: the water cap has no vertex swell (flat surface), keeps
 * a cheap two-sine fragment-shader normal bump, and is alpha-blended on
 * top of the swapchain (no offscreen scene-sample for refraction); the
 * composite is a plain depth-forwarding blit with no Beer-Lambert
 * underwater fog or shimmer distortion. Toggling after init does
 * nothing - the matching pipeline wouldn't exist. */
void renderer_set_perf_mode(bool enabled);
bool renderer_perf_mode_enabled(void);

void renderer_begin_frame(int w, int h, render_env_t env);

/* Procedural skybox: fullscreen pass that draws stars + the sun disc.
 * Must run first in the frame (before any world geometry) and doesn't
 * write depth, so later opaque passes paint on top. Pass the world
 * sun direction in `env.sun_dir`. */
void renderer_draw_skybox(mat4_t view, mat4_t proj);

/* Emissive sun sphere at env.sun_pos. Drawn after the skybox but
 * before any opaque world geometry; writes depth so foreground
 * planets correctly occlude it when in front. */
void renderer_draw_sun(mat4_t view, mat4_t proj);

/* Draw the active body's opaque terrain. Water caps used to be
 * drawn here too — now they happen in renderer_draw_water on the
 * swapchain pass after the offscreen scene has been composited, so
 * the water shader can sample the underwater colour + depth.
 * `dt_seconds` still advances the water-wave time accumulator. */
void renderer_draw_world(mat4_t view, mat4_t proj, world_t* world,
                         vec3_t camera_world, float dt_seconds);

/* Phase A.3 transition. Ends the offscreen pass that begin_frame
 * opened, opens the swapchain pass, and draws a fullscreen-quad
 * composite that blits the offscreen colour onto the swapchain.
 * Must be called exactly once per frame, after every opaque draw
 * (skybox, sun, terrain, moons) and before water + UI. */
void renderer_compose_to_swapchain(mat4_t view, mat4_t proj);

/* Water cap pass. Draws every has_water body's translucent water
 * mesh. Called after renderer_compose_to_swapchain so the cap
 * shader can sample the offscreen scene texture for refraction +
 * depth-thickness extinction (Phase B). `view`/`proj` rebuild the
 * MVP per body; `camera_world` feeds the Fresnel + view-direction
 * lighting. */
void renderer_draw_water(mat4_t view, mat4_t proj, vec3_t camera_world);

/* Register a celestial body for chunked rendering. Every body —
 * Tenebris, moons, asteroids — uses the same 32-chunk layout, so block
 * edits on any of them only touch the affected chunk(s) (same fast
 * path on every world). The first body registered becomes the active
 * one (streaming + edit-driven rebuild); subsequent registrations are
 * fully meshed in one shot at register time. The world must already
 * be world_gen_complete. */
void renderer_register_world(world_t* w);
/* Backwards-compat alias for renderer_register_world. */
void renderer_register_moon(world_t* w);
/* Switch which body is currently active (player teleporting). The
 * old active body keeps its mesh data; only streaming / edit handling
 * moves to the new world. */
void renderer_set_active_world(world_t* w);

/* Find a registered world by its body id. Used by net_client to apply
 * incoming CHUNK_DIFF messages to the right planet/moon. Returns NULL
 * if no world for that body has been registered. */
world_t* renderer_world_for_body(uint32_t body_id);

/* True when the body has had its full chunked mesh built. Used by
 * main_web to drive lazy SP-save application: localStorage reads
 * are synchronous in the browser and applying every body's saves
 * up front at SP entry stalls the frame; we wait until the body's
 * mesh has actually been streamed (the player is near enough to
 * see it) before flushing its persisted column data. */
bool     renderer_body_meshed(uint32_t body_id);

/* Debug toggle — when terrain is hidden, the chunked-terrain draw
 * passes are skipped (atmosphere + sky still render, distant body
 * icospheres still render). Useful for verifying the atmosphere
 * shader on its own without geometry obscuring the view. */
void renderer_set_terrain_visible(bool visible);
bool renderer_terrain_visible(void);

/* Companion debug toggle for water. When off, no water cap is
 * drawn on any has_water body — useful for confirming whether a
 * suspicious silhouette is the cap or something else. */
void renderer_set_water_visible(bool visible);
bool renderer_water_visible(void);

/* Same idea for the skybox / atmospheric scattering pass. The
 * atmosphere is a fullscreen ray-march, not geometry, but it
 * produces a sphere-shaped halo around the planet that can look
 * like leftover geometry when the rest of the scene is hidden. */
void renderer_set_skybox_visible(bool visible);
bool renderer_skybox_visible(void);

/* Draw each registered body. `camera_world` is used to compute angular
 * screen size — bodies that subtend less than ~20% of the viewport
 * swap to a flat-shaded 20-face icosphere instead of their detailed
 * Goldberg mesh. */
void renderer_draw_moons(mat4_t view, mat4_t proj, vec3_t camera_world);

/* Draw all placed torches with the current frame's clock. Runs in
 * the offscreen opaque pass alongside terrain + moons so the water
 * cap can sample torch pixels for refraction. Active body assumed
 * to sit at the world origin (Tenebris) — torches are stored in
 * body-local space and drawn directly. */
void renderer_draw_torches(mat4_t view, mat4_t proj);

/* Draw a wireframe outline of the SINGLE face of (tile, depth)
 * that's shared with (nbr_tile, nbr_depth). The neighbour pair
 * tells us which face the raycast hit:
 *   nbr_depth = depth + 1, same tile  -> top cap of (tile, depth)
 *   nbr_depth = depth - 1, same tile  -> bottom cap
 *   nbr_tile != tile, same depth      -> side face on the tile-edge
 *                                        between them
 * No-op for any combination that isn't a valid neighbour. */
void renderer_draw_face_outline(mat4_t view, mat4_t proj,
                                  const world_t* world,
                                  int tile_idx, int depth,
                                  int nbr_tile, int nbr_depth,
                                  float r, float g, float b, float a);

/* F5 water-flow debug overlay. When the flow-debug flag is on, draws a
 * yellow arrow on every water cell whose world_water_flow_direction
 * returns non-zero (i.e., has origins). Cells with no flow get nothing.
 * No-op when the flag is off. Call from the main draw loop after the
 * water cap pass so the arrows render on top of the surface. */
void renderer_draw_water_flow_debug(mat4_t view, mat4_t proj);
void renderer_set_flow_debug(bool v);
bool renderer_flow_debug(void);

int  renderer_moon_count(void);
void renderer_end_frame(void);

size_t renderer_triangles_drawn_this_frame(void);
size_t renderer_tiles_drawn_this_frame(void);
size_t renderer_tiles_remeshed_this_frame(void);

/* Texture-atlas-id accessors so UI modules (hotbar) can sample the
 * same atlas the terrain mesher uses — every block lives in its own
 * column. Returns the raw sg_view / sg_sampler id; the caller wraps
 * it back into the typed handle (`(sg_view){ .id = ... }`) without
 * needing sokol_gfx.h pulled into this header. Both ids are valid
 * for the program lifetime after renderer_init runs. */
unsigned int renderer_atlas_view_id(void);
unsigned int renderer_atlas_sampler_id(void);
/* Chunked-mesh diagnostics for the HUD. `out_chunks` = total chunk
 * count (configured at compile time), `out_tiles_meshed` = number of
 * tiles that have been routed into a chunk so far. */
void   renderer_chunk_count(int* out_chunks, int* out_tiles_meshed);

#endif
