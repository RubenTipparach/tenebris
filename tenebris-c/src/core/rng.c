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

/* ---------- 3D gradient (Perlin) noise ---------------------------- */
/* Port of Noise3D.Sample / Hash / Grad / Fade from the rts-engine
 * reference (src/RtsEngine.Game/PlanetMesh.cs). Output is in
 * [-1, +1] so the existing `n * 2 - 1` remap inside fractal3d/ridge3d
 * is dropped. */

static float gnoise_fade(float t) {
    return t * t * t * (t * (t * 6.0f - 15.0f) + 10.0f);
}

static int32_t gnoise_hash(int32_t x, int32_t y, int32_t z, int32_t seed) {
    int32_t h = seed ^ (x * 374761393) ^ (y * 668265263) ^ (z * 1274126177);
    h = (h ^ (int32_t)((uint32_t)h >> 13)) * 1103515245;
    h ^= (int32_t)((uint32_t)h >> 16);
    return h;
}

static float gnoise_grad(int32_t hash, float x, float y, float z) {
    int h = (int)(hash & 15);
    float u = (h < 8) ? x : y;
    float v = (h < 4) ? y : ((h == 12 || h == 14) ? x : z);
    return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}

float gnoise3d_seed(uint64_t seed, float x, float y, float z) {
    /* Fold the 64-bit seed into the 32-bit hash space. The two halves
     * are XORed so flipping any bit of `seed` perturbs the entire grid,
     * not just one octant. */
    int32_t s = (int32_t)((uint32_t)(seed & 0xFFFFFFFFu)
                        ^ (uint32_t)((seed >> 32) & 0xFFFFFFFFu));

    int32_t ix = (int32_t)floorf(x);
    int32_t iy = (int32_t)floorf(y);
    int32_t iz = (int32_t)floorf(z);
    float fx = x - (float)ix;
    float fy = y - (float)iy;
    float fz = z - (float)iz;

    float u = gnoise_fade(fx);
    float v = gnoise_fade(fy);
    float w = gnoise_fade(fz);

    float g000 = gnoise_grad(gnoise_hash(ix,     iy,     iz,     s), fx,        fy,        fz       );
    float g100 = gnoise_grad(gnoise_hash(ix + 1, iy,     iz,     s), fx - 1.0f, fy,        fz       );
    float g010 = gnoise_grad(gnoise_hash(ix,     iy + 1, iz,     s), fx,        fy - 1.0f, fz       );
    float g110 = gnoise_grad(gnoise_hash(ix + 1, iy + 1, iz,     s), fx - 1.0f, fy - 1.0f, fz       );
    float g001 = gnoise_grad(gnoise_hash(ix,     iy,     iz + 1, s), fx,        fy,        fz - 1.0f);
    float g101 = gnoise_grad(gnoise_hash(ix + 1, iy,     iz + 1, s), fx - 1.0f, fy,        fz - 1.0f);
    float g011 = gnoise_grad(gnoise_hash(ix,     iy + 1, iz + 1, s), fx,        fy - 1.0f, fz - 1.0f);
    float g111 = gnoise_grad(gnoise_hash(ix + 1, iy + 1, iz + 1, s), fx - 1.0f, fy - 1.0f, fz - 1.0f);

    float a = lerp_f(lerp_f(g000, g100, u), lerp_f(g010, g110, u), v);
    float b = lerp_f(lerp_f(g001, g101, u), lerp_f(g011, g111, u), v);
    return lerp_f(a, b, w);
}
