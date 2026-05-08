#include "core/world.h"
#include "core/planet_gen.h"
#include <stdlib.h>
#include <string.h>
#include <math.h>

#define BLOCK_HEIGHT  1.0
/* Sea level sits at layer 64 in a 128-deep shell — layers 0..63 are
 * solid planet (bedrock + stone + seabed + water column); 64..127 are
 * usable build space + mountains above sea. */
#define SEA_LEVEL_IDX 64

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

/* Cheap deterministic 32-bit hash for tile-keyed RNG (tree scatter).
 * Same constants we use elsewhere; just consolidated here so the gen
 * pass doesn't pull in rng.h's float wrapper. */
static uint32_t tile_hash(uint64_t seed, int32_t tile_idx, uint32_t salt) {
    uint32_t h = (uint32_t)tile_idx * 374761393u + salt * 668265263u
               + (uint32_t)(seed & 0xFFFFFFFFu)
               + (uint32_t)(seed >> 32) * 1376312589u;
    h = (h ^ (h >> 13)) * 1274126177u;
    return h ^ (h >> 16);
}

static void gen_tile(world_t* w, int tile_idx) {
    const goldberg_tile_t* t = goldberg_tile(w->grid, tile_idx);
    if (!t) return;

    /* Per-column biome profile + surface height (meters above base). */
    const column_profile_t prof = planet_profile(w->body, t->center);

    /* Map meters -> block depth. */
    int surface_idx = (int)floor((double)prof.surface_m / BLOCK_HEIGHT) + SEA_LEVEL_IDX;
    if (surface_idx < 2)                   surface_idx = 2;
    if (surface_idx > WORLD_MAX_DEPTH - 1) surface_idx = WORLD_MAX_DEPTH - 1;

    uint8_t* column = &w->blocks[tile_idx * WORLD_MAX_DEPTH];
    for (int d = 0; d < WORLD_MAX_DEPTH; ++d) {
        float altitude_m = (float)((d - SEA_LEVEL_IDX) * BLOCK_HEIGHT);
        block_t b = planet_sample_with_profile(&prof, altitude_m);
        column[d] = (uint8_t)b;
    }
    /* Bedrock floor — never overwrite, never mineable, and the renderer
     * skips its bottom cap so we don't see the inside of the planet. */
    column[0] = (uint8_t)BLOCK_BEDROCK;

    /* ---- Tree scatter ----------------------------------------------
     * Plant a small tree on grass-topped land tiles with low slope.
     * Hex-based: trunk = 4 wood blocks stacked above the surface, top
     * 2 layers = leaves block. Probability per qualifying tile ~5 %,
     * gated by a deterministic per-tile + per-body hash so the layout
     * is identical for the same seed. Tropical / Sequoia / barren /
     * icy bodies skip trees entirely. */
    /* Eligibility: dry land between the shoreline (above SEA_LEVEL+1 m)
     * and the alpine snow line (below ~22 m). Mirrors planet_gen.c's
     * thresholds without re-exposing them as a header constant. */
    if (!prof.barren && !prof.icy &&
        prof.surface_m > 1.0f && prof.surface_m < 22.0f)
    {
        block_t top = (block_t)column[surface_idx];
        const bool is_grass = (top == BLOCK_GRASS) || (top == BLOCK_SEQ_GRASS);
        if (is_grass) {
            uint32_t h = tile_hash(w->body->seed, tile_idx, 0xA1B2C3D4u);
            /* ~5% of qualifying tiles get a tree. */
            if ((h & 0xFFu) < 13) {
                /* Vary trunk height 3..5 by a separate hash bit. */
                int trunk = 3 + ((int)(h >> 8) & 1);
                int trunk_top = surface_idx + trunk;
                int leaf_lo  = trunk_top - 1;
                int leaf_hi  = trunk_top + 2;
                if (leaf_hi >= WORLD_MAX_DEPTH) leaf_hi = WORLD_MAX_DEPTH - 1;
                /* Trunk: stack BLOCK_WOOD above the grass top. */
                for (int d = surface_idx + 1; d <= trunk_top && d < WORLD_MAX_DEPTH; ++d) {
                    column[d] = (uint8_t)BLOCK_WOOD;
                }
                /* Leafy crown spread vertically over the trunk top. */
                for (int d = leaf_lo; d <= leaf_hi; ++d) {
                    if (d <= surface_idx) continue;
                    if (column[d] == BLOCK_AIR) column[d] = (uint8_t)BLOCK_LEAVES;
                }
            }
        }
    }

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

void world_dirty_in_range(world_t* w, vec3_t world_pos, float radius_m) {
    /* Brute-force tile sweep — cheap (40k tiles ~= 40k float compares
     * per torch event) and avoids needing a spatial index.
     *
     * Project the torch position radially onto the body surface
     * before comparing against tile centres (which sit at radius R).
     * Without the projection, a torch placed on elevated terrain
     * (e.g. a column top at radius R+7m) carries a 7m radial offset
     * the comparison can't see past — a 6m torch range then excludes
     * every tile (radial gap alone exceeds range), no chunk gets
     * dirtied, and the new torch never bakes until something else in
     * the area triggers a remesh. The projection makes the test
     * horizontal-only (great-arc chord), which is conservative —
     * slightly over-dirties on tall terrain, never under-dirties. */
    const double R = w->body->radius_m;
    const float pos_len = sqrtf(world_pos.x * world_pos.x +
                                world_pos.y * world_pos.y +
                                world_pos.z * world_pos.z);
    if (pos_len <= 0.0f) return;
    const float scale = (float)R / pos_len;
    const float px = world_pos.x * scale;
    const float py = world_pos.y * scale;
    const float pz = world_pos.z * scale;
    const float r2 = radius_m * radius_m;
    for (int i = 0; i < w->tile_count; ++i) {
        const goldberg_tile_t* t = goldberg_tile(w->grid, i);
        if (!t) continue;
        float cx = (float)(t->center.x * R) - px;
        float cy = (float)(t->center.y * R) - py;
        float cz = (float)(t->center.z * R) - pz;
        if (cx*cx + cy*cy + cz*cz <= r2) {
            w->dirty[i >> 3] |= (uint8_t)(1 << (i & 7));
        }
    }
}

double world_depth_to_radius_m(const world_t* w, int depth) {
    /* Depth index 0 = deepest bedrock. Sea level = SEA_LEVEL_IDX.
     * Convert so radius = body.radius_m - (SEA_LEVEL_IDX - depth) * BLOCK_HEIGHT. */
    return w->body->radius_m - ((double)SEA_LEVEL_IDX - (double)depth) * BLOCK_HEIGHT;
}

block_t world_block_at_pos(const world_t* w, vec3_t body_local_pos, int tile_hint) {
    /* Goldberg grid lives on the unit sphere — normalise the body-
     * local position to look up the tile, then convert the radial
     * length back to a depth index using the same transform
     * world_depth_to_radius_m inverts. Anything outside the depth
     * window reads as AIR (above the build cap or "below bedrock"
     * which doesn't exist anyway). */
    double r = sqrt((double)body_local_pos.x * body_local_pos.x +
                    (double)body_local_pos.y * body_local_pos.y +
                    (double)body_local_pos.z * body_local_pos.z);
    if (r <= 0.0) return BLOCK_AIR;
    double inv = 1.0 / r;
    dvec3_t dir = (dvec3_t){
        (double)body_local_pos.x * inv,
        (double)body_local_pos.y * inv,
        (double)body_local_pos.z * inv,
    };
    int tile = goldberg_find_tile(w->grid, dir, tile_hint);
    if (tile < 0) return BLOCK_AIR;
    int depth = (int)floor(r - w->body->radius_m) + SEA_LEVEL_IDX;
    if (depth < 0 || depth >= WORLD_MAX_DEPTH) return BLOCK_AIR;
    return (block_t)w->blocks[tile * WORLD_MAX_DEPTH + depth];
}

