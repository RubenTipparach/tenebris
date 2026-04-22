#ifndef TENEBRIS_CLIENT_RENDERER_H
#define TENEBRIS_CLIENT_RENDERER_H

#include "core/icosphere.h"
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
void renderer_draw_lod_tree(mat4_t view, mat4_t proj, const lod_tree_t* tree,
                            dvec3_t floating_origin, double planet_radius_m);
void renderer_end_frame(void);

size_t renderer_triangles_drawn_this_frame(void);

#endif
