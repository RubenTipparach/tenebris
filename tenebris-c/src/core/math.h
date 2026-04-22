#ifndef TENEBRIS_CORE_MATH_H
#define TENEBRIS_CORE_MATH_H

#include <stdint.h>

typedef struct { float x, y, z; } vec3_t;
typedef struct { int32_t x, y, z; } ivec3_t;

/*
 * Double-precision world-space vector. Used for:
 *   - the floating origin (planet-scale positions stay in dvec3, then
 *     get downcast to vec3 after subtracting the origin)
 *   - hex chunk anchor positions on the unit sphere (sub-meter
 *     precision needs more than 24-bit float mantissa at planet radius)
 */
typedef struct { double x, y, z; } dvec3_t;

static inline vec3_t  vec3_make(float x, float y, float z) { return (vec3_t){ x, y, z }; }
static inline dvec3_t dvec3_make(double x, double y, double z) { return (dvec3_t){ x, y, z }; }

vec3_t  vec3_add(vec3_t a, vec3_t b);
vec3_t  vec3_sub(vec3_t a, vec3_t b);
vec3_t  vec3_scale(vec3_t v, float s);
float   vec3_dot(vec3_t a, vec3_t b);
float   vec3_length(vec3_t v);
vec3_t  vec3_normalize(vec3_t v);

dvec3_t dvec3_add(dvec3_t a, dvec3_t b);
dvec3_t dvec3_sub(dvec3_t a, dvec3_t b);
dvec3_t dvec3_scale(dvec3_t v, double s);
double  dvec3_dot(dvec3_t a, dvec3_t b);
double  dvec3_length(dvec3_t v);
dvec3_t dvec3_normalize(dvec3_t v);
dvec3_t dvec3_cross(dvec3_t a, dvec3_t b);

/* Downcast for GPU-side vertex math (after subtracting floating origin). */
static inline vec3_t dvec3_to_vec3(dvec3_t v) {
    return (vec3_t){ (float)v.x, (float)v.y, (float)v.z };
}

#endif
