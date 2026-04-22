#ifndef TENEBRIS_CORE_HEX_CHUNK_H
#define TENEBRIS_CORE_HEX_CHUNK_H

#include "core/blocks.h"
#include "core/math.h"
#include <stdbool.h>
#include <stdint.h>

/*
 * Hex chunk: 32 cols x 32 rows x 256 vertical layers, byte-per-voxel.
 * Voxel coordinates are local to a *shared tangent frame* anchored at
 * the camera's ground projection (see player_ctrl + main_web). Chunks
 * never reposition once active — the tangent frame is what moves.
 */

#define HEX_COLS         32
#define HEX_ROWS         32
#define HEX_LAYERS       256
#define HEX_BASE_PADDING 128       /* layers below "ground" reserved for digging */
#define HEX_BEDROCK      3
#define HEX_RADIUS       1.0f      /* hexagon circumradius in meters */
#define HEX_HEIGHT       1.0f      /* voxel layer height in meters */

#define HEX_VOXEL_INDEX(col, row, layer) \
    ((size_t)(col) * HEX_ROWS * HEX_LAYERS + (size_t)(row) * HEX_LAYERS + (size_t)(layer))

typedef struct {
    int32_t cx, cy;            /* chunk grid coords inside the bubble */

    /* Voxel column. Heap-allocated only on activation to keep the
     * inactive-chunk pool small. */
    uint8_t* voxels;           /* HEX_COLS * HEX_ROWS * HEX_LAYERS bytes */

    /* Per-column caches that the mesher reads to skip dead layers. */
    int16_t  col_min_solid[HEX_COLS * HEX_ROWS];
    int16_t  col_max_solid[HEX_COLS * HEX_ROWS];

    bool     active;
    bool     dirty;            /* needs remesh */
} hex_chunk_t;

void hex_chunk_init(hex_chunk_t* c);
void hex_chunk_activate(hex_chunk_t* c, int32_t cx, int32_t cy);
void hex_chunk_deactivate(hex_chunk_t* c);

/* Recompute col_min_solid / col_max_solid from voxel data. */
void hex_chunk_rebuild_caches(hex_chunk_t* c);

/* Bubble: fixed-size pool of chunks centered on the player. Tier 1
 * uses a 32x32 grid (~1024 cells) covering the ~500 m suppression
 * radius — still well under HEX_MAX_CHUNKS. Implemented next commit
 * once the renderer is online. */
#define HEX_MAX_CHUNKS   512

#endif
