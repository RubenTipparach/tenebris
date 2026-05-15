#ifndef TENEBRIS_CORE_WORLD_H
#define TENEBRIS_CORE_WORLD_H

#include "core/blocks.h"
#include "core/goldberg.h"
#include "core/math.h"
#include "core/planet.h"
#include <stdbool.h>
#include <stdint.h>

/* Forward decl - world_light owns a parallel per-voxel light grid,
 * lifecycle-tied to the world. The mesher reads it through the
 * core/world_light.h API. Defined as an opaque pointer here to avoid
 * pulling the BFS header into every world.h consumer. */
struct world_light_s;

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

    /* "Has a persisted column on disk" bitset — one bit per tile.
     * Set by saves_load_world (on the server, after reading a tile's
     * .col file off disk) and by saves_write_tile (when the server
     * persists a new edit). Used at WELCOME time to enumerate which
     * tiles need to be replayed to a joining client so the client's
     * procgen view gets overlaid with the server-authoritative
     * edits. Sized identically to the dirty bitmap; null on builds
     * that never call the saves API (clients during SP procgen). */
    uint8_t*             saved;
    int                  saved_bytes;

    /* Generation progress: how many tiles have had terrain computed so
     * far. Fill is streamed across frames; tiles past this cursor are
     * all BLOCK_AIR. */
    int                  gen_cursor;

    /* Per-voxel propagated light grid (sky + block nibbles). Created
     * alongside the world; mark-dirty / rebuild semantics live in
     * core/world_light. The mesher gates on config_lighting()->engine
     * to decide between this and the legacy column-based bake. */
    struct world_light_s* light;
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

/* "Saved" bitset: tracks which tiles have a persisted column on
 * disk so the server can replay them to a joining client. Lazily
 * allocated on first mark - native server builds touch it via the
 * saves API; client + SP builds never set anything and the bitmap
 * stays null. */
bool     world_tile_saved(const world_t* w, int tile);
void     world_tile_mark_saved(world_t* w, int tile);

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

/* Convert a body-local radius to the integer depth index of the voxel
 * containing it. Out-of-range returns -1 or WORLD_MAX_DEPTH respectively
 * so callers can detect "below bedrock" / "above build cap". */
int      world_radius_to_depth(const world_t* w, double radius_m);

/* True when the voxel at (tile, radius) is BLOCK_WATER. Used by the
 * player controller to gate water physics — eyes, body, feet checks
 * sample at different radii along basis.up. Returns false for any
 * out-of-range / ungenerated tile (treat as air). */
bool     world_is_water_at(const world_t* w, int tile, double radius_m);

/* Find the walkable-floor radius closest to `target_radius_m`, where
 * a "walkable floor" is the top of a solid voxel that has air OR
 * water in the cell above (so swimming over a flooded floor is still
 * walkable for ground-snap purposes). Preference: a floor at or
 * below `target_radius_m` wins over one above it when both exist, so
 * walking onto a tile with a cave roof above and a real floor below
 * snaps the player to the lower floor. Returns -1e9 when the tile is
 * ungenerated or has no walkable floor.
 *
 * `body_height_m` is the head-clearance the floor must satisfy: the
 * column above it must be air/water for body_height_m metres of
 * radius. Pass <= 0 to skip the headroom check (used by ground snap
 * after a vertical clamp; horizontal step rejection wants the
 * headroom). */
double   world_walkable_floor_near(const world_t* w, int tile,
                                   double target_radius_m,
                                   double body_height_m);

/* Bottom radius of the first solid voxel at or above `head_radius_m`
 * in the column. Returns +1e30 when no ceiling exists (open sky).
 * Used by the vertical integrator to clamp upward motion. */
double   world_ceiling_above(const world_t* w, int tile, double head_radius_m);

/* Find a safe body-local position above the nearest walkable floor
 * in the direction `unit_dir` (must be normalised). Returns a vector
 * pointing FROM the body centre to a point `headroom_m` above the
 * topmost walkable floor of the tile under `unit_dir`. Used by the
 * fall-through fail-safe so a player who's somehow ended up inside
 * the body gets placed back at the actual surface ABOVE wherever
 * they fell from - not teleported across the planet to a prime-
 * meridian spawn point.
 *
 * If the tile has no walkable floor (ungenerated, or all-solid /
 * all-air column), returns body.radius_m + headroom_m along
 * unit_dir as a sane fallback. Never returns a zero vector. */
dvec3_t  world_safe_spawn_local(const world_t* w, dvec3_t unit_dir,
                                double headroom_m);

#endif
