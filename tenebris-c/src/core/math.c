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

dvec3_t dvec3_add(dvec3_t a, dvec3_t b) { return (dvec3_t){ a.x+b.x, a.y+b.y, a.z+b.z }; }
dvec3_t dvec3_sub(dvec3_t a, dvec3_t b) { return (dvec3_t){ a.x-b.x, a.y-b.y, a.z-b.z }; }
dvec3_t dvec3_scale(dvec3_t v, double s) { return (dvec3_t){ v.x*s, v.y*s, v.z*s }; }
double  dvec3_dot(dvec3_t a, dvec3_t b) { return a.x*b.x + a.y*b.y + a.z*b.z; }
double  dvec3_length(dvec3_t v) { return sqrt(dvec3_dot(v, v)); }

dvec3_t dvec3_normalize(dvec3_t v) {
    double len = dvec3_length(v);
    if (len == 0.0) return (dvec3_t){ 0, 0, 0 };
    return dvec3_scale(v, 1.0 / len);
}

dvec3_t dvec3_cross(dvec3_t a, dvec3_t b) {
    return (dvec3_t){
        a.y * b.z - a.z * b.y,
        a.z * b.x - a.x * b.z,
        a.x * b.y - a.y * b.x,
    };
}
