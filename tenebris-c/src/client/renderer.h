#ifndef TENEBRIS_CLIENT_RENDERER_H
#define TENEBRIS_CLIENT_RENDERER_H

#include "core/world.h"
#include "client/gfx_math.h"
#include <stddef.h>
#include <stdbool.h>
#include <stdint.h>

typedef struct {
    vec3_t sun_dir;
    vec3_t sky_top;
    vec3_t sky_bottom;
    vec3_t ambient;
} render_env_t;

void renderer_init(void);
void renderer_shutdown(void);

void renderer_begin_frame(int w, int h, render_env_t env);

/* Draw the planet: opaque terrain in one merged pass, then water caps
 * in a blended pass. `dt_seconds` advances the water-wave time
 * uniform; `camera_world` is used by the water fresnel term. */
void renderer_draw_world(mat4_t view, mat4_t proj, world_t* world,
                         vec3_t camera_world, float dt_seconds);
void renderer_end_frame(void);

size_t renderer_triangles_drawn_this_frame(void);
size_t renderer_tiles_drawn_this_frame(void);
size_t renderer_tiles_remeshed_this_frame(void);

#endif
