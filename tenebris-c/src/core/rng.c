#include "core/rng.h"
#include <math.h>

/*
 * Port of Chunk.hash in src/world/Chunk.ts:
 *   h = x*374761393 + z*668265263
 *   h = (h ^ (h >> 13)) * 1274126177
 *   result = ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff
 *
 * JS bitwise ops are 32-bit signed, so we mirror that with explicit int32_t.
 */
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
