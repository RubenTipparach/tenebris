#include "client/gfx_math.h"
#include <math.h>
#include <string.h>

mat4_t mat4_identity(void) {
    mat4_t r = {{0}};
    r.m[0] = r.m[5] = r.m[10] = r.m[15] = 1.0f;
    return r;
}

mat4_t mat4_mul(mat4_t a, mat4_t b) {
    mat4_t r = {{0}};
    for (int c = 0; c < 4; ++c)
        for (int rr = 0; rr < 4; ++rr) {
            float s = 0.0f;
            for (int k = 0; k < 4; ++k) s += a.m[k * 4 + rr] * b.m[c * 4 + k];
            r.m[c * 4 + rr] = s;
        }
    return r;
}

mat4_t mat4_translate(vec3_t t) {
    mat4_t r = mat4_identity();
    r.m[12] = t.x; r.m[13] = t.y; r.m[14] = t.z;
    return r;
}

mat4_t mat4_rotate_x(float a) {
    mat4_t r = mat4_identity();
    float c = cosf(a), s = sinf(a);
    r.m[5] =  c; r.m[6]  =  s;
    r.m[9] = -s; r.m[10] =  c;
    return r;
}

mat4_t mat4_rotate_y(float a) {
    mat4_t r = mat4_identity();
    float c = cosf(a), s = sinf(a);
    r.m[0]  =  c; r.m[2]  = -s;
    r.m[8]  =  s; r.m[10] =  c;
    return r;
}

mat4_t mat4_rotate_z(float a) {
    mat4_t r = mat4_identity();
    float c = cosf(a), s = sinf(a);
    r.m[0] =  c; r.m[1] =  s;
    r.m[4] = -s; r.m[5] =  c;
    return r;
}

mat4_t mat4_perspective(float fovy, float aspect, float zn, float zf) {
    mat4_t r = {{0}};
    float f = 1.0f / tanf(fovy * 0.5f);
    r.m[0]  = f / aspect;
    r.m[5]  = f;
    r.m[10] = (zf + zn) / (zn - zf);
    r.m[11] = -1.0f;
    r.m[14] = (2.0f * zf * zn) / (zn - zf);
    return r;
}

vec3_t vec3_cross(vec3_t a, vec3_t b) {
    return (vec3_t){
        a.y * b.z - a.z * b.y,
        a.z * b.x - a.x * b.z,
        a.x * b.y - a.y * b.x,
    };
}

mat4_t mat4_look_at(vec3_t eye, vec3_t target, vec3_t up) {
    vec3_t f = vec3_normalize(vec3_sub(target, eye));
    vec3_t s = vec3_normalize(vec3_cross(f, up));
    vec3_t u = vec3_cross(s, f);
    mat4_t r = mat4_identity();
    r.m[0] = s.x; r.m[4] = s.y; r.m[8]  = s.z;
    r.m[1] = u.x; r.m[5] = u.y; r.m[9]  = u.z;
    r.m[2] = -f.x; r.m[6] = -f.y; r.m[10] = -f.z;
    r.m[12] = -vec3_dot(s, eye);
    r.m[13] = -vec3_dot(u, eye);
    r.m[14] =  vec3_dot(f, eye);
    return r;
}
