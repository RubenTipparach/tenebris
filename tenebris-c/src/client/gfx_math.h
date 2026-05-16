#ifndef TENEBRIS_CLIENT_GFX_MATH_H
#define TENEBRIS_CLIENT_GFX_MATH_H

#include "core/math.h"

/*
 * Column-major 4x4 matrices, matching what sokol_gfx + GLSL expect.
 * Client-only — server never touches matrices so they stay out of core/.
 */
typedef struct { float m[16]; } mat4_t;

mat4_t mat4_identity(void);
mat4_t mat4_mul(mat4_t a, mat4_t b);
mat4_t mat4_translate(vec3_t t);
mat4_t mat4_rotate_x(float rad);
mat4_t mat4_rotate_y(float rad);
mat4_t mat4_rotate_z(float rad);
mat4_t mat4_perspective(float fovy_rad, float aspect, float znear, float zfar);
mat4_t mat4_look_at(vec3_t eye, vec3_t target, vec3_t up);
/* Same as mat4_look_at but takes the look DIRECTION directly instead
 * of a target point. Skips the `target - eye` subtraction that
 * loses float precision at large eye magnitudes (planet centres
 * hundreds of metres from world origin). Pass a pre-normalised look
 * vector - computed in doubles by the caller before the cast to
 * float - so the orientation columns don't pick up subtraction noise.
 * The eye position only affects the translation column. */
mat4_t mat4_look_at_dir(vec3_t eye, vec3_t look_dir, vec3_t up);

vec3_t vec3_cross(vec3_t a, vec3_t b);

#endif
