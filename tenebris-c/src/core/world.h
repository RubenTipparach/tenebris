#ifndef TENEBRIS_CORE_WORLD_H
#define TENEBRIS_CORE_WORLD_H

#include "core/blocks.h"
#include "core/goldberg.h"
#include "core/math.h"
#include "core/planet.h"
#include <stdbool.h>
#include <stdint.h>

/*
 * The whole world. Holds the Goldberg tile set + a column of voxels per
 * tile. Matches the src/planet/Planet.ts model: depth 0 = deepest
 * bedrock, depth MAX_DEPTH-1 = sky. Each voxel is a block_t byte.
 *
 * At subdivisions=3 we have ~642 tiles. MAX_DEPTH=16 blocks, so the
 * whole world voxel store is 642 * 16 ≈ 10 KB. Trivial.
 */

#define WORLD_MAX_DEPTH   16      /* blocks per column, JS matches this */

typedef struct world_s {
    const body_config_t* body;
    goldberg_t*          grid;
    /* Voxel storage as a flat (tile_count * WORLD_MAX_DEPTH) array
     * indexed by depth major: blocks[tile * WORLD_MAX_DEPTH + depth]. */
    uint8_t*             blocks;
    int                  tile_count;

    /* Dirty bitset — one bit per tile. Set by edits, cleared by the
     * renderer after remeshing. */
    uint8_t*             dirty;
    int                  dirty_bytes;

    /* Generation progress: how many tiles have had terrain computed so
     * far. Fill is streamed across frames; tiles past this cursor are
     * all BLOCK_AIR. */
    int                  gen_cursor;
} world_t;

/* ----------------------------------------------------------------------- */

world_t* world_create(const body_config_t* body, int subdivisions);
void     world_destroy(world_t* w);

/* Generate terrain for up to `max_tiles` tiles of the pending pool.
 * Call each frame until world_gen_complete returns true. */
void     world_stream_gen(world_t* w, int max_tiles);
bool     world_gen_complete(const world_t* w);
int      world_gen_progress_pct(const world_t* w);   /* 0..100 */

/* Single-voxel queries. Out-of-range depth returns AIR. */
block_t  world_get(const world_t* w, int tile, int depth);
void     world_set(world_t* w, int tile, int depth, block_t b);

bool     world_tile_dirty(const world_t* w, int tile);
void     world_tile_clear_dirty(world_t* w, int tile);

/* Radial meters corresponding to a block depth. Surface sits at
 * depth = body->seaLevel relative offset from the top. */
double   world_depth_to_radius_m(const world_t* w, int depth);

#endif
