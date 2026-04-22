#ifndef TENEBRIS_CORE_HEX_POOL_H
#define TENEBRIS_CORE_HEX_POOL_H

#include "core/hex_chunk.h"
#include "core/math.h"
#include "core/planet.h"
#include "core/physics.h"       /* tangent_basis_t */
#include <stdbool.h>

/*
 * Hex chunk pool + shared tangent frame. Tier 1 uses a small grid
 * (HEX_POOL_RADIUS on each side of the anchor) so we can prove the
 * streaming pipeline end-to-end before ramping to the full 500 m bubble.
 *
 * The anchor is re-set when the player drifts more than HEX_POOL_REANCHOR_M
 * from the current anchor. Chunks outside the grid are deactivated
 * (voxel buffers are kept allocated for fast reactivation; this is a
 * pool, not a churn).
 */

/* Pointy-top hex geometry. Two column centers are sqrt(3)*R apart
 * horizontally; two row centers are 1.5*R apart vertically. Odd rows
 * offset by sqrt(3)/2 * R. */
#define HEX_SQRT3              1.7320508f
#define HEX_DX                 (HEX_SQRT3 * HEX_RADIUS)
#define HEX_DY                 (1.5f * HEX_RADIUS)

/* Chunk footprint in the tangent plane. */
#define HEX_CHUNK_WIDTH_M      (HEX_DX * (float)HEX_COLS)
#define HEX_CHUNK_DEPTH_M      (HEX_DY * (float)HEX_ROWS)

/* Tier 1 target: 9x9 grid (=81 chunks, ~500 m edge-to-edge on the
 * tangent plane), matching the hex-bubble suppression radius. Well
 * under HEX_MAX_CHUNKS so we have headroom to grow later. */
#define HEX_POOL_RADIUS        4
#define HEX_POOL_SIDE          (HEX_POOL_RADIUS * 2 + 1)
#define HEX_POOL_COUNT         (HEX_POOL_SIDE * HEX_POOL_SIDE)
#define HEX_POOL_REANCHOR_M    100.0f    /* re-anchor if drift exceeds this */

/* Streaming budget: fill at most this many pending chunks per frame so
 * a re-anchor doesn't hitch. 81 chunks / 8 per frame = ~10 frames of
 * perceived load, which at 60 FPS is ~170 ms. */
#define HEX_POOL_FILL_BUDGET   8

typedef struct {
    const body_config_t* body;

    /* Shared tangent frame. anchor_world = anchor_dir * radius_m. */
    dvec3_t         anchor_dir;
    dvec3_t         anchor_world;
    tangent_basis_t basis;

    hex_chunk_t     chunks[HEX_POOL_COUNT];
    /* Direct lookup: chunk_lookup[cx+RADIUS][cy+RADIUS] = index into
     * chunks[] (or -1). Avoids an O(n) scan on every neighbor query
     * from the mesher. */
    int             chunk_lookup[HEX_POOL_SIDE][HEX_POOL_SIDE];
    bool            anchored;
} hex_pool_t;

void hex_pool_init(hex_pool_t* p, const body_config_t* body);
void hex_pool_shutdown(hex_pool_t* p);

/* Update the pool given the player's world position. Re-anchors + regens
 * chunks when the player drifts far enough from the current anchor. */
void hex_pool_update(hex_pool_t* p, dvec3_t player_world);

int  hex_pool_active_count(const hex_pool_t* p);
int  hex_pool_pending_count(const hex_pool_t* p);
const hex_chunk_t* hex_pool_chunk_at(const hex_pool_t* p, int index);

/* Fast (cx, cy) → chunk lookup. Returns NULL if the coords are outside
 * the pool grid or the chunk is inactive. */
const hex_chunk_t* hex_pool_chunk_by_coord(const hex_pool_t* p, int32_t cx, int32_t cy);

/* World-space position of a chunk's local (col, row, layer) voxel. */
dvec3_t hex_pool_voxel_world(const hex_pool_t* p, const hex_chunk_t* c,
                             int col, int row, int layer);

/* World-space position of a chunk's tangent-plane (0,0,0) corner. */
dvec3_t hex_pool_chunk_origin_world(const hex_pool_t* p, const hex_chunk_t* c);

#endif
