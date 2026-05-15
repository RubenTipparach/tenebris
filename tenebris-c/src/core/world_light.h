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

#endif
