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

/* Register a celestial body as a static (non-streaming) decorative
 * world — moons, asteroids, anything the player can't land on. The
 * world must already be fully generated (world_gen_complete == true).
 * Meshes it once at registration time and uploads to a dedicated
 * buffer pair. Drawn each frame at body->position by renderer_draw_moons. */
void renderer_register_moon(world_t* w);
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

#endif
