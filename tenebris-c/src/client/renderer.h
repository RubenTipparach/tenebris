#ifndef TENEBRIS_CLIENT_RENDERER_H
#define TENEBRIS_CLIENT_RENDERER_H

#include "core/world.h"
#include "client/gfx_math.h"
#include "client/mesher.h"
#include <stdbool.h>

typedef struct {
    vec3_t  sun_dir;     /* world-space direction TO the sun (normalized) */
    vec3_t  sky_top;
    vec3_t  sky_bottom;
    vec3_t  ambient;
} render_env_t;

void renderer_init(void);
void renderer_shutdown(void);

void renderer_begin_frame(int w, int h, render_env_t env);
void renderer_draw_world(mat4_t view, mat4_t proj, world_t* world, int render_radius,
                         int player_cx, int player_cz);
void renderer_draw_outline(mat4_t view, mat4_t proj, ivec3_t block);
void renderer_end_frame(void);

/* Exposed for UI debug counters. */
size_t renderer_chunks_drawn(void);
size_t renderer_chunks_remeshed_this_frame(void);

#endif
