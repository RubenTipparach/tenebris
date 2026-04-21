#ifndef TENEBRIS_CORE_RNG_H
#define TENEBRIS_CORE_RNG_H

#include <stdint.h>

/*
 * Deterministic 2D hash noise.
 * Matches Chunk.noise2D / Chunk.hash in src/world/Chunk.ts so chunks
 * generated on client and server (and eventually on JS vs WASM) agree.
 */

float noise2d(float x, float z);
float hash2(int32_t x, int32_t z);

#endif
