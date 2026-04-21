#include "core/chunkgen.h"
#include "core/rng.h"
#include <math.h>

/*
 * Port of Chunk.getTerrainHeight in src/world/Chunk.ts. Keep these
 * constants identical on both sides — UAT testers byte-compare terrain.
 * Seed is reserved for future use; Tier 1 port does not yet apply it.
 */
int32_t chunkgen_terrain_height(uint64_t seed, int32_t world_x, int32_t world_z) {
    (void)seed;
    const float s1 = 0.02f, s2 = 0.05f, s3 = 0.10f;
    float n1 = noise2d((float)world_x * s1, (float)world_z * s1) * 15.0f;
    float n2 = noise2d((float)world_x * s2, (float)world_z * s2) *  8.0f;
    float n3 = noise2d((float)world_x * s3, (float)world_z * s3) *  4.0f;
    const float base = 10.0f;
    return (int32_t)floorf(base + n1 + n2 + n3);
}

static void set_local(chunk_t* c, int x, int y, int z, block_t b) {
    c->blocks[x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE] = (uint8_t)b;
}

void chunkgen_fill(chunk_t* out, uint64_t seed, int32_t cx, int32_t cz) {
    out->cx = cx;
    out->cz = cz;
    const int32_t wx0 = cx * CHUNK_SIZE;
    const int32_t wz0 = cz * CHUNK_SIZE;
    for (int x = 0; x < CHUNK_SIZE; ++x) {
        for (int z = 0; z < CHUNK_SIZE; ++z) {
            int32_t h = chunkgen_terrain_height(seed, wx0 + x, wz0 + z);
            for (int y = 0; y < CHUNK_HEIGHT; ++y) {
                block_t b = BLOCK_AIR;
                if (y < h - 3)      b = BLOCK_STONE;
                else if (y < h)     b = BLOCK_DIRT;
                else if (y == h)    b = BLOCK_GRASS;
                set_local(out, x, y, z, b);
            }
        }
    }
    out->dirty = true;
}
