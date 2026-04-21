#include "core/world.h"
#include "core/chunkgen.h"
#include <stdlib.h>
#include <string.h>
#include <math.h>

/*
 * Tier 1 placeholder. The real implementation (hashmap of chunks, dirty
 * tracking, neighbor propagation) lands as part of Tier 1 work. For
 * Tier 0 we only need the symbols to link so the core lib compiles.
 */

struct world_s {
    uint64_t seed;
};

world_t* world_create(uint64_t seed) {
    world_t* w = (world_t*)calloc(1, sizeof(world_t));
    w->seed = seed;
    return w;
}

void world_destroy(world_t* w) { free(w); }

block_t world_get_block(const world_t* w, int32_t x, int32_t y, int32_t z) {
    (void)w; (void)x; (void)y; (void)z;
    return BLOCK_AIR;
}

void world_set_block(world_t* w, int32_t x, int32_t y, int32_t z, block_t b) {
    (void)w; (void)x; (void)y; (void)z; (void)b;
}

chunk_t* world_get_chunk(world_t* w, int32_t cx, int32_t cz) {
    (void)w; (void)cx; (void)cz;
    return NULL;
}

chunk_t* world_ensure_chunk(world_t* w, int32_t cx, int32_t cz) {
    (void)w; (void)cx; (void)cz;
    return NULL;
}

void world_apply_cmd(world_t* w, const world_cmd_t* c) {
    switch (c->kind) {
        case CMD_BREAK_BLOCK: world_set_block(w, c->x, c->y, c->z, BLOCK_AIR); break;
        case CMD_PLACE_BLOCK: world_set_block(w, c->x, c->y, c->z, (block_t)c->block); break;
        default: break;
    }
}

world_ray_hit_t world_raycast(const world_t* w, vec3_t origin, vec3_t dir, float max_dist) {
    (void)w; (void)origin; (void)dir; (void)max_dist;
    return (world_ray_hit_t){ .hit = false };
}
