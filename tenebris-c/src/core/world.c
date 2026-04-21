#include "core/world.h"
#include "core/chunkgen.h"
#include <stdlib.h>
#include <string.h>
#include <math.h>

/* ----------------------------------------------------------------------- */
/* Chunk storage: dynamic array of chunk pointers, linear lookup. Good
 * enough for Tier 1 (render radius 4 keeps ~81 live chunks). Swap for a
 * real hashmap when it shows up in a profile.
 */

struct world_s {
    uint64_t  seed;
    chunk_t** chunks;
    size_t    chunk_count;
    size_t    chunk_cap;
};

static size_t block_index(int32_t lx, int32_t ly, int32_t lz) {
    return (size_t)lx + (size_t)lz * CHUNK_SIZE + (size_t)ly * CHUNK_SIZE * CHUNK_SIZE;
}

/* Canonical JS-style floor-mod so negatives behave like the TS source. */
static int32_t fmod_pos(int32_t a, int32_t m) {
    int32_t r = a % m;
    if (r < 0) r += m;
    return r;
}

static void ensure_capacity(world_t* w, size_t need) {
    if (need <= w->chunk_cap) return;
    size_t cap = w->chunk_cap ? w->chunk_cap : 32;
    while (cap < need) cap *= 2;
    w->chunks = (chunk_t**)realloc(w->chunks, cap * sizeof(chunk_t*));
    w->chunk_cap = cap;
}

world_t* world_create(uint64_t seed) {
    world_t* w = (world_t*)calloc(1, sizeof(world_t));
    w->seed = seed;
    return w;
}

void world_destroy(world_t* w) {
    if (!w) return;
    for (size_t i = 0; i < w->chunk_count; ++i) free(w->chunks[i]);
    free(w->chunks);
    free(w);
}

chunk_t* world_get_chunk(world_t* w, int32_t cx, int32_t cz) {
    for (size_t i = 0; i < w->chunk_count; ++i) {
        chunk_t* c = w->chunks[i];
        if (c->cx == cx && c->cz == cz) return c;
    }
    return NULL;
}

chunk_t* world_ensure_chunk(world_t* w, int32_t cx, int32_t cz) {
    chunk_t* c = world_get_chunk(w, cx, cz);
    if (c) return c;

    c = (chunk_t*)calloc(1, sizeof(chunk_t));
    chunkgen_fill(c, w->seed, cx, cz);

    ensure_capacity(w, w->chunk_count + 1);
    w->chunks[w->chunk_count++] = c;
    return c;
}

bool world_remove_chunk(world_t* w, int32_t cx, int32_t cz) {
    for (size_t i = 0; i < w->chunk_count; ++i) {
        chunk_t* c = w->chunks[i];
        if (c->cx == cx && c->cz == cz) {
            free(c);
            w->chunks[i] = w->chunks[--w->chunk_count];
            return true;
        }
    }
    return false;
}

size_t world_chunk_count(const world_t* w) { return w->chunk_count; }

chunk_t* world_chunk_at(const world_t* w, size_t i) {
    return (i < w->chunk_count) ? w->chunks[i] : NULL;
}

block_t world_get_block(const world_t* w, int32_t wx, int32_t wy, int32_t wz) {
    if (wy < 0 || wy >= CHUNK_HEIGHT) return BLOCK_AIR;
    int32_t cx = (int32_t)floorf((float)wx / (float)CHUNK_SIZE);
    int32_t cz = (int32_t)floorf((float)wz / (float)CHUNK_SIZE);
    chunk_t* c = world_get_chunk((world_t*)w, cx, cz);
    if (!c) return BLOCK_AIR;
    int32_t lx = fmod_pos(wx, CHUNK_SIZE);
    int32_t lz = fmod_pos(wz, CHUNK_SIZE);
    return (block_t)c->blocks[block_index(lx, wy, lz)];
}

static void mark_neighbor_dirty(world_t* w, int32_t cx, int32_t cz) {
    chunk_t* c = world_get_chunk(w, cx, cz);
    if (c) c->dirty = true;
}

void world_set_block(world_t* w, int32_t wx, int32_t wy, int32_t wz, block_t b) {
    if (wy < 0 || wy >= CHUNK_HEIGHT) return;
    int32_t cx = (int32_t)floorf((float)wx / (float)CHUNK_SIZE);
    int32_t cz = (int32_t)floorf((float)wz / (float)CHUNK_SIZE);
    chunk_t* c = world_get_chunk(w, cx, cz);
    if (!c) return;
    int32_t lx = fmod_pos(wx, CHUNK_SIZE);
    int32_t lz = fmod_pos(wz, CHUNK_SIZE);
    c->blocks[block_index(lx, wy, lz)] = (uint8_t)b;
    c->dirty = true;
    if (lx == 0)                  mark_neighbor_dirty(w, cx - 1, cz);
    if (lx == CHUNK_SIZE - 1)     mark_neighbor_dirty(w, cx + 1, cz);
    if (lz == 0)                  mark_neighbor_dirty(w, cx, cz - 1);
    if (lz == CHUNK_SIZE - 1)     mark_neighbor_dirty(w, cx, cz + 1);
}

void world_apply_cmd(world_t* w, const world_cmd_t* c) {
    switch (c->kind) {
        case CMD_BREAK_BLOCK: world_set_block(w, c->x, c->y, c->z, BLOCK_AIR); break;
        case CMD_PLACE_BLOCK: world_set_block(w, c->x, c->y, c->z, (block_t)c->block); break;
        default: break;
    }
}

bool world_is_block_solid(const world_t* w, int32_t wx, int32_t wy, int32_t wz) {
    return block_is_solid(world_get_block(w, wx, wy, wz));
}

/* ----------------------------------------------------------------------- */
/* DDA voxel raycast — port of World.raycast in src/world/World.ts.
 */
world_ray_hit_t world_raycast(const world_t* w, vec3_t origin, vec3_t dir, float max_dist) {
    world_ray_hit_t hit = (world_ray_hit_t){ .hit = false };

    ivec3_t step = { dir.x >= 0 ? 1 : -1, dir.y >= 0 ? 1 : -1, dir.z >= 0 ? 1 : -1 };
    ivec3_t bp   = { (int32_t)floorf(origin.x), (int32_t)floorf(origin.y), (int32_t)floorf(origin.z) };

    vec3_t delta = {
        dir.x != 0.0f ? fabsf(1.0f / dir.x) : 1e30f,
        dir.y != 0.0f ? fabsf(1.0f / dir.y) : 1e30f,
        dir.z != 0.0f ? fabsf(1.0f / dir.z) : 1e30f,
    };

    vec3_t side = {
        dir.x >= 0 ? ((float)(bp.x + 1) - origin.x) * delta.x : (origin.x - (float)bp.x) * delta.x,
        dir.y >= 0 ? ((float)(bp.y + 1) - origin.y) * delta.y : (origin.y - (float)bp.y) * delta.y,
        dir.z >= 0 ? ((float)(bp.z + 1) - origin.z) * delta.z : (origin.z - (float)bp.z) * delta.z,
    };

    int axis = 0;
    float dist = 0.0f;

    while (dist < max_dist) {
        if (side.x < side.y && side.x < side.z) {
            dist    = side.x;
            side.x += delta.x;
            bp.x   += step.x;
            axis    = 0;
        } else if (side.y < side.z) {
            dist    = side.y;
            side.y += delta.y;
            bp.y   += step.y;
            axis    = 1;
        } else {
            dist    = side.z;
            side.z += delta.z;
            bp.z   += step.z;
            axis    = 2;
        }

        if (world_is_block_solid(w, bp.x, bp.y, bp.z)) {
            hit.hit      = true;
            hit.block    = bp;
            hit.distance = dist;
            hit.normal   = (ivec3_t){ 0, 0, 0 };
            if      (axis == 0) hit.normal.x = -step.x;
            else if (axis == 1) hit.normal.y = -step.y;
            else                hit.normal.z = -step.z;
            return hit;
        }
    }
    return hit;
}

int32_t world_height_at(const world_t* w, int32_t wx, int32_t wz) {
    for (int32_t y = CHUNK_HEIGHT - 1; y >= 0; --y) {
        if (world_is_block_solid(w, wx, y, wz)) return y + 1;
    }
    return 0;
}
