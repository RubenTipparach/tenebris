#ifndef TENEBRIS_CORE_WORLD_WATER_H
#define TENEBRIS_CORE_WORLD_WATER_H

#include <stdbool.h>
#include <stdint.h>

/*
 * Per-voxel water flow state + tick scheduler.
 *
 * Owned as an opaque pointer by world_t::water (forward-declared in
 * world.h). Created in world_create, freed in world_destroy, mirrored
 * in world_clone — same lifecycle pattern as world_light.
 *
 * Two pieces of state per world:
 *
 *   1. A parallel byte array (tile_count * WORLD_MAX_DEPTH) carrying
 *      water-only metadata. A byte of 0 on a BLOCK_WATER voxel means
 *      "legacy / sleeping" — the cell acts as a full source supplier
 *      for neighbour ticks but never wakes the scheduler on its own.
 *      Non-water voxels keep their byte at 0.
 *
 *      Bit layout per byte:
 *        bit 7    : 1 if source ("infinite", drives the flow field)
 *        bit 6    : 1 if falling (supported by the cell above only)
 *        bits 5..3: reserved for a future fluid-type tag (lava, oil)
 *        bits 2..0: flow level, 0..WATER_LEVEL_MAX
 *                   0 = full cell, level_max = thinnest film
 *
 *   2. A bounded ring-buffer scheduler. world_water_enqueue pushes a
 *      (tile, depth) pair; world_water_step pops up to N pairs and
 *      runs the section-5 flow rule from tenebris-c/water.md on each.
 *      A "scheduled" bitset (1 bit per voxel) guarantees a cell can't
 *      sit in the queue twice — re-enqueueing an already-scheduled
 *      cell is a no-op.
 *
 * Step 1 only lays the module down (state + scheduler + tick rule).
 * Step 4/5 wires player-edit and server-tick call sites.
 */

struct world_s;
typedef struct world_water_s world_water_t;

/* ---------------------------------------------------------------------
 * State byte layout + small helpers.
 *
 * These constants encode the algorithm's identity (3-bit level field +
 * two flag bits), not designer-tunable values - the level CAP itself
 * (WATER_LEVEL_MAX) is exposed as a YAML-overridable runtime knob in
 * step 3; the bit positions stay fixed regardless of what the cap is
 * set to.
 * ------------------------------------------------------------------- */

#define WATER_LEVEL_MAX     7      /* 3-bit max; YAML can cap below this */
#define WATER_LEVEL_MASK    0x07u
#define WATER_FLAG_FALLING  0x40u
#define WATER_FLAG_SOURCE   0x80u

static inline bool water_state_is_source(uint8_t s) {
    return (s & WATER_FLAG_SOURCE) != 0u;
}

static inline bool water_state_is_falling(uint8_t s) {
    return (s & WATER_FLAG_FALLING) != 0u;
}

static inline int water_state_level(uint8_t s) {
    return (int)(s & WATER_LEVEL_MASK);
}

static inline uint8_t water_state_pack(bool source, bool falling, int level) {
    uint8_t out = (uint8_t)(level & WATER_LEVEL_MASK);
    if (source)  out |= WATER_FLAG_SOURCE;
    if (falling) out |= WATER_FLAG_FALLING;
    return out;
}

/* ---------------------------------------------------------------------
 * Lifecycle. Called from world.c — clients shouldn't invoke these
 * directly.
 * ------------------------------------------------------------------- */

world_water_t* world_water_create(const struct world_s* w);
void           world_water_destroy(world_water_t* ww);

/* Deep-copy src's state byte array + queue contents into dst. Sizes
 * must match (caller is responsible for cloning against a world built
 * from the same body / subdivisions). */
void world_water_clone_into(world_water_t* dst, const world_water_t* src);

/* ---------------------------------------------------------------------
 * Per-cell state accessors. Out-of-range tile/depth returns 0 / no-op.
 * ------------------------------------------------------------------- */

uint8_t world_water_get_state  (const struct world_s* w, int tile, int depth);
void    world_water_set_state  (struct world_s* w, int tile, int depth, uint8_t state);
void    world_water_clear_state(struct world_s* w, int tile, int depth);

/* ---------------------------------------------------------------------
 * Scheduler.
 *
 * world_water_enqueue: push (tile, depth) for the next world_water_step
 *   call. Silent no-op if the cell is already scheduled. Silent no-op
 *   if the queue is at capacity (the world reconverges as soon as
 *   anything adjacent wakes the cell again - same "tick exhaustion"
 *   behaviour Minecraft falls back to for over-busy redstone).
 *
 * world_water_step: pop up to `max_ticks` cells and run the section-5
 *   flow rule on each. Returns the number of cells actually ticked.
 *   Caller invokes this once per simulation step (server tick loop,
 *   eventually SP frame).
 * ------------------------------------------------------------------- */

void world_water_enqueue(struct world_s* w, int tile, int depth);
int  world_water_step   (struct world_s* w, int max_ticks);

/* Notify the flow scheduler that a voxel at (tile, depth) was just
 * edited. Enqueues the cell itself plus its 5/6 horizontal neighbours
 * and (up to) two vertical neighbours in the same column - the cells
 * whose flow state could be affected by the change.
 *
 * Called automatically from world_set, so every edit path (player
 * input, network-applied PLAYER_CMD, future scripted mutations) wakes
 * the simulator without each call site needing to remember. Worldgen
 * writes the column directly bypassing world_set, which is the right
 * call - the seafloor fill stays "sleeping" until something disturbs
 * it.
 *
 * Pass-through no-op when the cell is out of range or the world has
 * no water module attached. */
void world_water_notify_edit(struct world_s* w, int tile, int depth);

/* Queue depth for diagnostics / tests. */
int  world_water_pending(const struct world_s* w);

/* ---------------------------------------------------------------------
 * Persistence support.
 *
 * Flow ticks mutate the per-voxel state byte (and sometimes the block
 * itself); both need to round-trip to disk so a server stop / page
 * reload restores the same view. The state-byte column is sized
 * identically to the block column (WORLD_MAX_DEPTH bytes per tile),
 * so the on-disk + localStorage layout mirrors the existing block
 * persistence — one file / one key per (body, tile).
 *
 * Per-tick persistence would write a column hundreds of times per
 * second under a busy waterfall, so the module tracks a "persist
 * dirty" bitset (one bit per tile) instead: every state-byte change
 * sets the bit, and the host (main_web.c in SP, server.c in MP)
 * drains the bitset once per frame via world_water_drain_persist_dirty,
 * writes the affected columns, and the cycle repeats. Falling-only
 * cells skip the dirty mark when water.yaml's flow_persist_falling
 * is 0 - they're reconstructible from neighbour state on reload.
 * ------------------------------------------------------------------- */

/* Read-only pointer to the WORLD_MAX_DEPTH-byte water-state column
 * for a tile. Returns NULL when the tile is out of range or no water
 * module is attached. Lifetime: as long as the world. */
const uint8_t* world_water_state_column(const struct world_s* w, int tile);

/* Overwrite the water-state column for a tile from `src` (must be
 * WORLD_MAX_DEPTH bytes). Used by the load path to restore from
 * disk / localStorage. Does NOT mark the column persist-dirty - it
 * just came off disk, no need to write it back. */
void world_water_load_state_column(struct world_s* w, int tile,
                                    const uint8_t* src);

/* Drain the persist-dirty bitset into `out_tiles` (up to `cap`
 * entries). Returns the number of tile indices written. Drained
 * tiles are removed from the bitset, so the next call only returns
 * tiles dirtied since the last drain. The caller is expected to
 * persist each returned column via persistence_save_water_state
 * (SP) or saves_write_water_state (MP). */
int world_water_drain_persist_dirty(struct world_s* w,
                                     int* out_tiles, int cap);

/* ---------------------------------------------------------------------
 * Flow origins.
 *
 * Each flowing (non-source) water cell remembers up to 3 source cells
 * it came from. The origin list is the authoritative liveness signal:
 * if every origin in the list is destroyed (block_set away from
 * BLOCK_WATER, or its SOURCE flag cleared), the flow cell loses all
 * its origins and dries up on the next tick.
 *
 * Sparse storage: most cells in a world are AIR or solid, and only a
 * small minority are actively flowing. A dense (tile_count * depth *
 * 16 bytes) array would dominate memory budget for ~40k-tile bodies.
 * Instead we keep an open-addressed linear-probed hash table keyed on
 * (tile, depth). Cells that aren't flowing have no entry; lookups for
 * those cells return 0 origins.
 *
 * The 4th-origin auto-promote rule: when a sim mutation would push the
 * origin count past 3, the cell flips to a source (SOURCE flag set in
 * its state byte, origin list dropped). Conceptually: any cell that's
 * being fed by enough independent sources is effectively a source
 * itself, so the renderer / current direction logic treats it that way.
 *
 * Flow direction is derived from the origin list at read time:
 *   dir = normalize(cell_world_pos - average(origin_world_pos))
 * No per-cell direction is cached; the small number of active flow
 * cells makes the recomputation cheap relative to disk + network I/O.
 * Returns the zero vector for cells with no entry. */

#define WATER_ORIGIN_MAX 3   /* 4th origin triggers source-promotion */

typedef struct {
    uint32_t tile;
    uint8_t  depth;
} water_origin_ref_t;

/* Record an origin reference for the flow cell at (tile, depth). If
 * the cell already lists this origin, returns true (idempotent). If
 * the cell has fewer than WATER_ORIGIN_MAX origins, appends and
 * returns true. If adding would make WATER_ORIGIN_MAX+1, the cell is
 * promoted to a source: state byte gets SOURCE flag set, the origin
 * entry is cleared, and the function returns true. Returns false only
 * when the hash table is full (rare; cells flow normally but lose the
 * direction-shimmer + auto-death-on-source-removal behaviour). */
bool world_water_origin_add(struct world_s* w, int tile, int depth,
                            water_origin_ref_t origin);

/* Remove `origin` from the flow cell at (tile, depth)'s list, if
 * present. If the list goes to 0 entries, the entry is removed from
 * the table entirely (the caller is expected to dry up the cell on
 * the next tick - we don't touch blocks here, just origin bookkeeping). */
void world_water_origin_remove(struct world_s* w, int tile, int depth,
                               water_origin_ref_t origin);

/* Remove ALL flow-cell entries whose origin list includes `origin`.
 * Used when a source dies (block_set away from WATER, or SOURCE flag
 * cleared) - every downstream flow cell loses this origin. Cells that
 * had this origin as their LAST origin get their entry removed entirely. */
void world_water_origin_remove_global(struct world_s* w,
                                      water_origin_ref_t origin);

/* Drop the flow cell's origin entry. Used when the player explicitly
 * promotes a flow cell to a source (place-water-on-flow override) -
 * the new source's origin list is empty by definition. No-op if the
 * cell has no entry. */
void world_water_origin_clear(struct world_s* w, int tile, int depth);

/* Number of origins recorded for the flow cell. 0 = no entry. */
int  world_water_origin_count(const struct world_s* w, int tile, int depth);

/* Read the origin list. Writes up to WATER_ORIGIN_MAX entries into
 * out[], returns the count actually written (0..WATER_ORIGIN_MAX).
 * out may be NULL to just query the count. */
int  world_water_origin_read(const struct world_s* w, int tile, int depth,
                              water_origin_ref_t* out);

/* World-space flow direction for the cell at (tile, depth). Computed
 * as:
 *
 *   dir = normalize(cell_world_pos - average(origin_world_pos))
 *
 * pointing FROM the average origin position TOWARD the cell. Zero
 * vector when the cell has no origin entry (source, sleeping, or
 * legacy save-loaded cell). out[0..2] receives the unit-length
 * direction; returns true iff a non-zero direction was written. The
 * caller projects the world-space vector onto the cell's local
 * tangent plane (radial = up) when using it for UV pan or current
 * physics. */
bool world_water_flow_direction(const struct world_s* w, int tile, int depth,
                                float out[3]);

/* Network-broadcast support: enumerate every origin entry attached to
 * a single tile. Writes up to `cap` entries into out[]; returns the
 * count actually written (or the count that would have been written
 * if cap was high enough - caller can use that to detect truncation
 * and grow the buffer).
 *
 * Each entry packs:
 *   depth          - 0..WORLD_MAX_DEPTH-1
 *   origin_count   - 1..WATER_ORIGIN_MAX (entries with 0 origins are
 *                    never recorded in the hash, so this is always
 *                    positive)
 *   origin_tile[3] - up to origin_count valid tile indices
 *   origin_depth[3]- corresponding depths
 *
 * The hash table is walked linearly; expect O(table_size) which is
 * 4096 slots regardless of how many origins are actually set.  */
typedef struct {
    uint8_t  depth;
    uint8_t  origin_count;
    uint8_t  _pad[2];
    uint32_t origin_tile [WATER_ORIGIN_MAX];
    uint8_t  origin_depth[WATER_ORIGIN_MAX];
    uint8_t  _pad2;
} water_origin_diff_entry_t;

int world_water_origin_enum_tile(const struct world_s* w, int tile,
                                  water_origin_diff_entry_t* out, int cap);

/* Walk every (tile, depth) cell that has at least one origin entry,
 * invoking the callback once per cell. Cheaper than walking
 * tile_count * WORLD_MAX_DEPTH cells for renderers that only care
 * about flow blocks (which are by definition the cells stored in the
 * origin hashmap). Walks the table linearly - O(origins_cap) - so the
 * cost is bounded regardless of how many cells actually have origins.
 *
 * Used by the F5 water-flow debug overlay to iterate exactly the cells
 * that should display a flow arrow. */
typedef void (*world_water_origin_visit_fn)(int tile, int depth, void* user);
void world_water_origin_visit_all(const struct world_s* w,
                                   world_water_origin_visit_fn cb,
                                   void* user);

/* Apply a single origin entry on the client side. Wraps origin_add
 * but takes the full origin list at once - clears any prior origins
 * on (tile, depth) so the client's view exactly matches the server's
 * snapshot (idempotent re-broadcasts overwrite, not append).
 *
 * Called by the MSG_WATER_ORIGINS_DIFF receive path in net_client. */
void world_water_origin_apply_entry(struct world_s* w, int tile,
                                     const water_origin_diff_entry_t* entry);

#endif
