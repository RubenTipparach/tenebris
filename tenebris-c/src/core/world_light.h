#ifndef TENEBRIS_CORE_WORLD_LIGHT_H
#define TENEBRIS_CORE_WORLD_LIGHT_H

#include <stdbool.h>
#include <stdint.h>

/*
 * Per-voxel propagated lighting. Replaces the column-only sky bake
 * + line-of-sight torch bake the mesher does today with a 6-neighbour
 * BFS over the goldberg + depth grid:
 *
 *   - Sky channel:  every air voxel reachable from the build cap by a
 *                   straight downward run of air starts at sky_max;
 *                   light then propagates laterally and downward at
 *                   -1 per step through any non-face-covering block.
 *                   The straight-down-through-air rule preserves the
 *                   "shafts of daylight" effect Minecraft-style
 *                   lighting is known for, without ambient leak.
 *   - Block channel: each torch source is seeded at its anchor voxel
 *                   with the configured emission, then propagates
 *                   -1 per step through any non-face-covering block.
 *
 * Storage is nibble-packed: one uint8_t per voxel holds (sky << 4 |
 * block), each in 0..15. The buffer sits alongside world_t.blocks
 * and is sized identically, so existing tile/depth indexing rules
 * apply unchanged.
 *
 * Phase 1 deliberately runs the BFS from scratch whenever a block or
 * torch change marks the grid dirty: simpler to get right, and the
 * cost is still milliseconds at sub=3. Phase 2 will swap in a bounded
 * incremental queue.
 *
 * Held by world_t as an opaque pointer so core/world.c can call
 * mark_dirty on edits without depending on the BFS implementation.
 */

struct world_s;

typedef struct world_light_s world_light_t;

/* Allocate a light grid sized to `w`. Voxel values are all zero on
 * return; call world_light_rebuild before sampling. */
world_light_t* world_light_create(const struct world_s* w);
void           world_light_destroy(world_light_t* l);

/* Deep-copy the source's nibble buffer + dirty flag into the dst
 * grid. Sizes must already match (caller is responsible for creating
 * dst against a world cloned from the same body / subdivisions). */
void world_light_clone_into(world_light_t* dst, const world_light_t* src);

/* Mark the grid as needing a full relight. Cheap O(1). Used when
 * the world is created / cloned and the entire grid must be rebuilt
 * from scratch. For ongoing block edits, prefer mark_dirty_at so
 * the BFS only touches cells near the change. */
void world_light_mark_dirty(world_light_t* l);
bool world_light_is_dirty(const world_light_t* l);

/* Per-edit dirty: pushes (tile, depth) into the incremental rebuild
 * queue. world_set calls this on each block change so the rebuild
 * only re-propagates light around the affected cell, Minecraft-
 * style, instead of clearing + reseeding the whole planet. If the
 * queue overflows (e.g. a huge multi-tile chunk diff lands at once),
 * the next rebuild silently falls back to a full pass. */
void world_light_mark_dirty_at(world_light_t* l, int tile, int depth);

/* Block-light source description. The mesher (which owns the torch
 * list) publishes these via world_light_set_torches before each
 * rebuild. Storing them on the light grid - rather than threading the
 * torch array through every rebuild call - keeps core/ free of any
 * client/ dependency. */
typedef struct {
    int     tile;
    int     depth;
    uint8_t intensity;       /* 0..15; 0 = effectively no source     */
} world_light_torch_t;

/* Replace the published torch source table. The array is copied;
 * pass NULL/0 to clear. Calling this with a different set of torches
 * (or different intensities) implicitly marks the grid dirty so the
 * next rebuild reflects the change. */
void world_light_set_torches(world_light_t* l,
                             const world_light_torch_t* sources,
                             int count);

/* Run a full sky + block BFS over the current world state. Idempotent;
 * caller should gate on world_light_is_dirty to skip redundant work. */
void world_light_rebuild(world_light_t* l, const struct world_s* w);

/* Per-voxel queries. Out-of-range coordinates return 0. */
uint8_t world_light_sky  (const world_light_t* l, int tile, int depth);
uint8_t world_light_block(const world_light_t* l, int tile, int depth);

/* ---------------------------------------------------------------------
 * Profiling / telemetry.
 *
 * A "rebuild session" spans from the first dirty mark on a previously
 * clean grid to the moment the grid converges back to clean. Multiple
 * world_light_rebuild() calls may participate in a single session if
 * the per-frame BFS budget yields early. The counters below let the
 * caller (renderer) pair op counts with wall-clock to quantify how
 * much the synchronous relight loop is blocking the frame - the
 * "torches cause visible lag" symptom this instrumentation exists
 * to measure.
 * ------------------------------------------------------------------- */

/* What caused the current session to start. OR'd together so a
 * session that began on a torch edit and was extended by a block
 * break reports both. */
#define LIGHT_TRIGGER_TORCH       (1u << 0)
#define LIGHT_TRIGGER_BLOCK_EDIT  (1u << 1)
#define LIGHT_TRIGGER_FULL_MARK   (1u << 2)

typedef struct world_light_session_summary_s {
    int          total_ops;     /* BFS pops + seed touches in the session  */
    int          total_calls;   /* world_light_rebuild() invocations        */
    unsigned int triggers;      /* bitmask of LIGHT_TRIGGER_*               */
    int          edits_seen;    /* mark_dirty_at calls during session       */
    int          torch_count;   /* size of the torch list at session start  */
    bool         was_full_pass; /* a full BFS pass ran (vs incremental)     */
} world_light_session_summary_t;

/* Number of BFS pops the most recent world_light_rebuild() call did.
 * Resets to zero on the next rebuild() call so a 0 reading on an
 * idle frame means "no work done", not "stale value". */
int  world_light_last_call_ops(const world_light_t* l);

/* True while a rebuild is pending or in-flight (dirty flag set or
 * incremental queue non-empty or BFS phase != IDLE). Becomes false
 * the instant the grid is fully converged. */
bool world_light_is_active(const world_light_t* l);

/* If a session just completed (the most recent rebuild() drained the
 * grid back to clean), fill *out with the session totals and return
 * true. Subsequent calls return false until another session
 * completes. The renderer calls this once per frame after running
 * world_light_rebuild() so it can log a one-shot summary of the
 * blocking cost when the session ends. */
bool world_light_consume_session_summary(world_light_t* l,
                                         world_light_session_summary_t* out);

#endif
