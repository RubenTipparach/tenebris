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

/* Planet shell:
 *   layer 0       = BEDROCK (impassable floor; renderer skips its
 *                   inner-facing bottom cap so the hollow shell isn't
 *                   visible from the outside).
 *   layers 1..63  = below sea level — soil + stone + ocean column
 *                   filled with water above the seafloor.
 *   layer  64     = sea-level surface (SEA_LEVEL_IDX in world.c).
 *   layers 65..127= above sea level — terrain peaks and player build
 *                   space (~64 m of headroom over the tallest mountain
 *                   for stacking blocks).
 *
 * 128 byte/column × per-body tile count = voxel state per body. Tile
 * count is picked at world_create time via
 * planet_subdivisions_for_radius() to target ~1 m hex width across
 * bodies; subdivision is capped at 7 (~164k tiles, ~21 MB voxels)
 * for the largest planets to stay within the WASM heap budget.
 */
#define WORLD_MAX_DEPTH   128

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

/* Deep-copy clone. Shares the goldberg grid (read-only) with the
 * source; the block + dirty arrays are freshly allocated. Used by
 * the server to fan out a procgen baseline into per-room world
 * copies without paying for worldgen each time. */
world_t* world_clone(const world_t* src);

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

/* Mark every tile whose centre sits within `radius_m` of `world_pos`
 * as dirty, so the renderer's remesh-on-dirty pass picks them up.
 * Used by torch place/remove so per-vertex torch_light gets re-baked
 * for affected tiles. world_pos is body-local (matches goldberg
 * tile centres scaled by body radius). */
void     world_dirty_in_range(world_t* w, vec3_t world_pos, float radius_m);

/* Resolve a body-local point to its containing voxel cell. Returns
 * the block at that (tile, depth); BLOCK_AIR if the position falls
 * outside the world (above the build cap, below bedrock, or outside
 * the goldberg grid). The lookup walks the goldberg adjacency from
 * `tile_hint` (use the player's last_tile for cheap re-targeting;
 * pass -1 to start from scratch). */
block_t  world_block_at_pos(const world_t* w, vec3_t body_local_pos, int tile_hint);

/* Radial meters corresponding to a block depth. Surface sits at
 * depth = body->seaLevel relative offset from the top. */
double   world_depth_to_radius_m(const world_t* w, int depth);

#endif
