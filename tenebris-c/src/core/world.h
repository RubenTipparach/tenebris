#ifndef TENEBRIS_CORE_WORLD_H
#define TENEBRIS_CORE_WORLD_H

#include "core/blocks.h"
#include "core/math.h"
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>

/*
 * Voxel world state. Server-authoritative in Tier 5, single-player in
 * Tier 1. All mutation goes through world_apply_cmd so the same
 * function runs on both sides.
 */

#define CHUNK_SIZE    16
#define CHUNK_HEIGHT  64
#define CHUNK_VOLUME  (CHUNK_SIZE * CHUNK_SIZE * CHUNK_HEIGHT)

typedef struct chunk_s {
    int32_t cx, cz;
    uint8_t blocks[CHUNK_VOLUME];
    bool    dirty;  /* needs remesh */
} chunk_t;

typedef struct world_s world_t;  /* opaque — implementation in world.c */

world_t* world_create(uint64_t seed);
void     world_destroy(world_t* w);

block_t  world_get_block(const world_t* w, int32_t x, int32_t y, int32_t z);
void     world_set_block(world_t* w, int32_t x, int32_t y, int32_t z, block_t b);
chunk_t* world_get_chunk(world_t* w, int32_t cx, int32_t cz);
chunk_t* world_ensure_chunk(world_t* w, int32_t cx, int32_t cz);
bool     world_remove_chunk(world_t* w, int32_t cx, int32_t cz);
size_t   world_chunk_count(const world_t* w);
chunk_t* world_chunk_at(const world_t* w, size_t i);
bool     world_is_block_solid(const world_t* w, int32_t x, int32_t y, int32_t z);
int32_t  world_height_at(const world_t* w, int32_t x, int32_t z);

/*
 * Commands — the single mutation pathway. Tier 1: client calls directly.
 * Tier 5: client sends over the wire, server calls.
 */
typedef enum {
    CMD_NONE        = 0,
    CMD_BREAK_BLOCK = 1,
    CMD_PLACE_BLOCK = 2,
} world_cmd_kind_t;

typedef struct {
    uint32_t         tick;
    world_cmd_kind_t kind;
    int32_t          x, y, z;
    uint8_t          block;
} world_cmd_t;

void world_apply_cmd(world_t* w, const world_cmd_t* c);

/* DDA voxel raycast. Returns true on hit. */
typedef struct {
    bool    hit;
    ivec3_t block;     /* block coordinates */
    ivec3_t normal;    /* face normal from the hit block */
    float   distance;
} world_ray_hit_t;

world_ray_hit_t world_raycast(const world_t* w, vec3_t origin, vec3_t dir, float max_dist);

#endif
