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

/* Build/update per-tile meshes (dirty tiles only, capped per frame) and
 * draw them all. Goldberg tile count is bounded (~642 at subs=3) so we
 * can keep one GPU buffer per tile without breaking a sweat. */
void renderer_draw_world(mat4_t view, mat4_t proj, world_t* world);
void renderer_end_frame(void);

size_t renderer_triangles_drawn_this_frame(void);
size_t renderer_tiles_drawn_this_frame(void);
size_t renderer_tiles_remeshed_this_frame(void);

#endif
