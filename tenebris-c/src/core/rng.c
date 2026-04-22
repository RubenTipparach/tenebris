#include "core/rng.h"
#include <math.h>

/* JS 32-bit signed bitwise semantics, matching Chunk.hash in
 * src/world/Chunk.ts so 2D terrain is byte-identical between TS and C. */
float hash2(int32_t x, int32_t z) {
    int32_t h = x * 374761393 + z * 668265263;
    h = (h ^ (int32_t)((uint32_t)h >> 13)) * 1274126177;
    int32_t masked = (h ^ (int32_t)((uint32_t)h >> 16)) & 0x7fffffff;
    return (float)masked / (float)0x7fffffff;
}

static float smoothstep_f(float t) { return t * t * (3.0f - 2.0f * t); }
static float lerp_f(float a, float b, float t) { return a + (b - a) * t; }

float noise2d(float x, float z) {
    int32_t xi = (int32_t)floorf(x);
    int32_t zi = (int32_t)floorf(z);
    float xf = x - (float)xi;
    float zf = z - (float)zi;

    float n00 = hash2(xi,     zi    );
    float n01 = hash2(xi,     zi + 1);
    float n10 = hash2(xi + 1, zi    );
    float n11 = hash2(xi + 1, zi + 1);

    float nx0 = lerp_f(n00, n10, smoothstep_f(xf));
    float nx1 = lerp_f(n01, n11, smoothstep_f(xf));
    return lerp_f(nx0, nx1, smoothstep_f(zf));
}

float hash3(int32_t x, int32_t y, int32_t z) {
    int32_t h = x * 374761393 + y * 1376312589 + z * 668265263;
    h = (h ^ (int32_t)((uint32_t)h >> 13)) * 1274126177;
    return ((h ^ (int32_t)((uint32_t)h >> 16)) & 0x7fffffff) / (float)0x7fffffff;
}

float noise3d(float x, float y, float z) {
    int32_t xi = (int32_t)floorf(x);
    int32_t yi = (int32_t)floorf(y);
    int32_t zi = (int32_t)floorf(z);
    float xf = x - (float)xi;
    float yf = y - (float)yi;
    float zf = z - (float)zi;

    float n000 = hash3(xi,     yi,     zi    );
    float n001 = hash3(xi,     yi,     zi + 1);
    float n010 = hash3(xi,     yi + 1, zi    );
    float n011 = hash3(xi,     yi + 1, zi + 1);
    float n100 = hash3(xi + 1, yi,     zi    );
    float n101 = hash3(xi + 1, yi,     zi + 1);
    float n110 = hash3(xi + 1, yi + 1, zi    );
    float n111 = hash3(xi + 1, yi + 1, zi + 1);

    float u = smoothstep_f(xf), v = smoothstep_f(yf), w = smoothstep_f(zf);
    float a = lerp_f(lerp_f(n000, n100, u), lerp_f(n010, n110, u), v);
    float b = lerp_f(lerp_f(n001, n101, u), lerp_f(n011, n111, u), v);
    return lerp_f(a, b, w);
}

float noise3d_seed(uint64_t seed, float x, float y, float z) {
    /* Mix seed into coordinates so different planets have different
     * terrain. Cheap multiplicative perturbation — good enough for
     * Tier 1; replace with a real seeded permutation table if we need
     * better statistical properties. */
    const float kx = (float)((seed         & 0xFFFF) * 1e-4 + 1.0);
    const float ky = (float)(((seed >> 16) & 0xFFFF) * 1e-4 + 1.0);
    const float kz = (float)(((seed >> 32) & 0xFFFF) * 1e-4 + 1.0);
    return noise3d(x * kx, y * ky, z * kz);
}
