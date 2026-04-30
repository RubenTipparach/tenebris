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
    float  atmo_planet_radius;
    float  atmo_radius;
    float  atmo_strength;
    /* Per-body scattering tuning — comes straight from body_config.
     * Lets us make Tenebris bluer, Sequoia greener, etc., without
     * recompiling the shader. All four are passed verbatim to the
     * fragment shader as uniform floats. */
    float  atmo_rayleigh_scale;
    float  atmo_mie_scale;
    float  atmo_sun_intensity;
    float  atmo_sunset_strength;
    vec3_t camera_world;     /* used as ray-march origin for the sky pass */
} render_env_t;

void renderer_init(void);
void renderer_shutdown(void);

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

/* Draw the planet: opaque terrain in one merged pass, then water caps
 * in a blended pass. `dt_seconds` advances the water-wave time
 * uniform; `camera_world` is used by the water fresnel term. */
void renderer_draw_world(mat4_t view, mat4_t proj, world_t* world,
                         vec3_t camera_world, float dt_seconds);

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

/* Debug toggle — when terrain is hidden, the chunked-terrain draw
 * passes are skipped (atmosphere + sky still render, distant body
 * icospheres still render). Useful for verifying the atmosphere
 * shader on its own without geometry obscuring the view. */
void renderer_set_terrain_visible(bool visible);
bool renderer_terrain_visible(void);
/* Draw each registered body. `camera_world` is used to compute angular
 * screen size — bodies that subtend less than ~20% of the viewport
 * swap to a flat-shaded 20-face icosphere instead of their detailed
 * Goldberg mesh. */
void renderer_draw_moons(mat4_t view, mat4_t proj, vec3_t camera_world);
int  renderer_moon_count(void);
void renderer_end_frame(void);

size_t renderer_triangles_drawn_this_frame(void);
size_t renderer_tiles_drawn_this_frame(void);
size_t renderer_tiles_remeshed_this_frame(void);
/* Chunked-mesh diagnostics for the HUD. `out_chunks` = total chunk
 * count (configured at compile time), `out_tiles_meshed` = number of
 * tiles that have been routed into a chunk so far. */
void   renderer_chunk_count(int* out_chunks, int* out_tiles_meshed);

#endif
