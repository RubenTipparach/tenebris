#ifndef TENEBRIS_CORE_RNG_H
#define TENEBRIS_CORE_RNG_H

#include <stdint.h>

/*
 * Deterministic noise. Used by chunk + tile generation. Same code
 * compiles into client and server so they generate identical worlds.
 *
 * 2D noise is the original TS port (Chunk.noise2D in src/world/Chunk.ts).
 * 3D noise is added for hex chunk vertical terrain detail.
 */

float hash2(int32_t x, int32_t z);
float noise2d(float x, float z);

float hash3(int32_t x, int32_t y, int32_t z);
float noise3d(float x, float y, float z);

/* Seedable variant — mixes the 64-bit seed in so different planets
 * produce different worlds. */
float noise3d_seed(uint64_t seed, float x, float y, float z);

/* 3D gradient (Perlin) noise — quintic fade + integer-hash gradient
 * lookup. Returns symmetric output in [-1, +1] (no remap needed at the
 * caller). Direct port of rts-engine Noise3D.Sample. Replaces
 * noise3d_seed in terrain generation: gradient noise has continuous
 * first derivatives so fBm stacks come out smooth instead of the
 * grid-aligned lumps value noise produces. */
float gnoise3d_seed(uint64_t seed, float x, float y, float z);

#endif
