#ifndef TENEBRIS_CORE_MATH_H
#define TENEBRIS_CORE_MATH_H

#include <stdint.h>

typedef struct { float x, y, z; } vec3_t;
typedef struct { int32_t x, y, z; } ivec3_t;

static inline vec3_t vec3_make(float x, float y, float z) {
    return (vec3_t){ x, y, z };
}

vec3_t  vec3_add(vec3_t a, vec3_t b);
vec3_t  vec3_sub(vec3_t a, vec3_t b);
vec3_t  vec3_scale(vec3_t v, float s);
float   vec3_dot(vec3_t a, vec3_t b);
float   vec3_length(vec3_t v);
vec3_t  vec3_normalize(vec3_t v);

#endif
