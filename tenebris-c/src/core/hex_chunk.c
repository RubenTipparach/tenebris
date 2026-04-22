#include "core/hex_chunk.h"
#include <stdlib.h>
#include <string.h>

void hex_chunk_init(hex_chunk_t* c) {
    memset(c, 0, sizeof(*c));
}

void hex_chunk_activate(hex_chunk_t* c, int32_t cx, int32_t cy) {
    if (c->active) return;
    c->cx = cx;
    c->cy = cy;
    if (!c->voxels) {
        c->voxels = (uint8_t*)calloc((size_t)HEX_COLS * HEX_ROWS * HEX_LAYERS, 1);
    } else {
        memset(c->voxels, 0, (size_t)HEX_COLS * HEX_ROWS * HEX_LAYERS);
    }
    for (int i = 0; i < HEX_COLS * HEX_ROWS; ++i) {
        c->col_min_solid[i] = (int16_t)HEX_LAYERS;
        c->col_max_solid[i] = -1;
    }
    c->active = true;
    c->dirty = false;           /* no mesh yet; dirty is set after fill */
    c->pending_fill = true;
}

void hex_chunk_deactivate(hex_chunk_t* c) {
    if (!c->active) return;
    /* Keep the voxel buffer allocated for fast re-activation; only
     * mark inactive. The pool sets a hard ceiling on resident memory. */
    c->active = false;
    c->dirty = false;
}

void hex_chunk_rebuild_caches(hex_chunk_t* c) {
    if (!c->active || !c->voxels) return;
    for (int col = 0; col < HEX_COLS; ++col) {
        for (int row = 0; row < HEX_ROWS; ++row) {
            int idx = col * HEX_ROWS + row;
            int16_t mn = (int16_t)HEX_LAYERS;
            int16_t mx = -1;
            for (int layer = 0; layer < HEX_LAYERS; ++layer) {
                uint8_t b = c->voxels[HEX_VOXEL_INDEX(col, row, layer)];
                if (b == BLOCK_AIR) continue;
                if (layer < mn) mn = (int16_t)layer;
                if (layer > mx) mx = (int16_t)layer;
            }
            c->col_min_solid[idx] = mn;
            c->col_max_solid[idx] = mx;
        }
    }
}
