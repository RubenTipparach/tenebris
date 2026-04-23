#include "core/world.h"
#include "core/planet_gen.h"
#include <stdlib.h>
#include <string.h>
#include <math.h>

#define BLOCK_HEIGHT  1.0
#define SEA_LEVEL_IDX 12     /* depth index where water surface sits (matches JS) */

world_t* world_create(const body_config_t* body, int subdivisions) {
    world_t* w = (world_t*)calloc(1, sizeof(world_t));
    w->body = body;
    w->grid = goldberg_create(subdivisions);
    w->tile_count = goldberg_tile_count(w->grid);
    w->blocks = (uint8_t*)calloc((size_t)(w->tile_count * WORLD_MAX_DEPTH), 1);
    w->dirty_bytes = (w->tile_count + 7) / 8;
    w->dirty = (uint8_t*)calloc((size_t)w->dirty_bytes, 1);
    w->gen_cursor = 0;
    return w;
}

void world_destroy(world_t* w) {
    if (!w) return;
    goldberg_destroy(w->grid);
    free(w->blocks);
    free(w->dirty);
    free(w);
}

/* ----------------------------------------------------------------------- */
/* Terrain generation. Each tile becomes a column with layers 0..MAX-1
 * filled according to the JS-derived heightmap + biome classifier. */

static void gen_tile(world_t* w, int tile_idx) {
    const goldberg_tile_t* t = goldberg_tile(w->grid, tile_idx);
    if (!t) return;

    /* Per-column biome profile + surface height (meters above base). */
    const column_profile_t prof = planet_profile(w->body, t->center);

    /* Map meters -> block depth. SEA_LEVEL_IDX corresponds to altitude 0,
     * higher altitudes are larger depth indices. Clamp to the voxel
     * column. */
    int surface_idx = (int)floor((double)prof.surface_m / BLOCK_HEIGHT) + SEA_LEVEL_IDX;
    if (surface_idx < 1) surface_idx = 1;
    if (surface_idx > WORLD_MAX_DEPTH - 1) surface_idx = WORLD_MAX_DEPTH - 1;

    uint8_t* column = &w->blocks[tile_idx * WORLD_MAX_DEPTH];
    for (int d = 0; d < WORLD_MAX_DEPTH; ++d) {
        float altitude_m = (float)((d - SEA_LEVEL_IDX) * BLOCK_HEIGHT);
        block_t b = planet_sample_with_profile(&prof, altitude_m);
        column[d] = (uint8_t)b;
    }
    /* Always at least one bedrock layer to keep the column from looking
     * floating. */
    column[0] = (uint8_t)BLOCK_STONE;

    /* Mark this tile dirty so the renderer builds its geometry. */
    w->dirty[tile_idx >> 3] |= (uint8_t)(1 << (tile_idx & 7));
}

void world_stream_gen(world_t* w, int max_tiles) {
    int end = w->gen_cursor + max_tiles;
    if (end > w->tile_count) end = w->tile_count;
    for (int i = w->gen_cursor; i < end; ++i) gen_tile(w, i);
    w->gen_cursor = end;
}

bool world_gen_complete(const world_t* w) { return w->gen_cursor >= w->tile_count; }

int world_gen_progress_pct(const world_t* w) {
    if (w->tile_count <= 0) return 100;
    return (int)((int64_t)w->gen_cursor * 100 / w->tile_count);
}

/* ----------------------------------------------------------------------- */

block_t world_get(const world_t* w, int tile, int depth) {
    if (tile < 0 || tile >= w->tile_count) return BLOCK_AIR;
    if (depth < 0 || depth >= WORLD_MAX_DEPTH) return BLOCK_AIR;
    return (block_t)w->blocks[tile * WORLD_MAX_DEPTH + depth];
}

void world_set(world_t* w, int tile, int depth, block_t b) {
    if (tile < 0 || tile >= w->tile_count) return;
    if (depth < 0 || depth >= WORLD_MAX_DEPTH) return;
    w->blocks[tile * WORLD_MAX_DEPTH + depth] = (uint8_t)b;
    w->dirty[tile >> 3] |= (uint8_t)(1 << (tile & 7));
    /* Dirty neighbors too so their seam faces rebuild. */
    const goldberg_tile_t* t = goldberg_tile(w->grid, tile);
    for (int i = 0; i < t->num_neighbors; ++i) {
        int n = t->neighbors[i];
        w->dirty[n >> 3] |= (uint8_t)(1 << (n & 7));
    }
}

bool world_tile_dirty(const world_t* w, int tile) {
    if (tile < 0 || tile >= w->tile_count) return false;
    return (w->dirty[tile >> 3] & (1 << (tile & 7))) != 0;
}

void world_tile_clear_dirty(world_t* w, int tile) {
    if (tile < 0 || tile >= w->tile_count) return;
    w->dirty[tile >> 3] &= (uint8_t)~(1 << (tile & 7));
}

double world_depth_to_radius_m(const world_t* w, int depth) {
    /* Depth index 0 = deepest bedrock. Sea level = SEA_LEVEL_IDX.
     * Convert so radius = body.radius_m - (SEA_LEVEL_IDX - depth) * BLOCK_HEIGHT. */
    return w->body->radius_m - ((double)SEA_LEVEL_IDX - (double)depth) * BLOCK_HEIGHT;
}
