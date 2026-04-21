#include "core/math.h"
#include <math.h>

vec3_t vec3_add(vec3_t a, vec3_t b) { return (vec3_t){ a.x+b.x, a.y+b.y, a.z+b.z }; }
vec3_t vec3_sub(vec3_t a, vec3_t b) { return (vec3_t){ a.x-b.x, a.y-b.y, a.z-b.z }; }
vec3_t vec3_scale(vec3_t v, float s) { return (vec3_t){ v.x*s, v.y*s, v.z*s }; }
float  vec3_dot(vec3_t a, vec3_t b) { return a.x*b.x + a.y*b.y + a.z*b.z; }
float  vec3_length(vec3_t v) { return sqrtf(vec3_dot(v, v)); }

vec3_t vec3_normalize(vec3_t v) {
    float len = vec3_length(v);
    if (len == 0.0f) return (vec3_t){ 0, 0, 0 };
    return vec3_scale(v, 1.0f / len);
}
