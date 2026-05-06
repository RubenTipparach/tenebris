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
    free(w->shore_dist_m);
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

double world_depth_to_radius_m(const world_t* w, int depth) {
    /* Depth index 0 = deepest bedrock. Sea level = SEA_LEVEL_IDX.
     * Convert so radius = body.radius_m - (SEA_LEVEL_IDX - depth) * BLOCK_HEIGHT. */
    return w->body->radius_m - ((double)SEA_LEVEL_IDX - (double)depth) * BLOCK_HEIGHT;
}

/* ----------------------------------------------------------------------- */
/* Shoreline distance: per-tile great-arc distance (m) to nearest land.
 *
 * Used by hex_mesher.c → water.glsl as a per-vertex attribute that
 * drives shoreline foam. Replaces the earlier thickness-based proxy
 * (max(0, scene_z - water_z) in the fs), which decorrelated from
 * actual shore proximity at glancing camera angles and pumped with
 * the swell. This metric is view-independent and swell-independent.
 *
 * SPFA (Bellman-Ford with FIFO relaxation): seed every land tile at 0,
 * relax water-tile distances over the goldberg adjacency. Edge weight
 * is the great-arc length on the unit sphere times body->radius_m —
 * adjacent goldberg tiles all sit ≈the same arc apart, but since the
 * cost is identical to chord length for a 6-degree-of-freedom mesh
 * we still pay nothing extra to get the right metric. Settles in a
 * handful of passes for the ~40k-tile case (each pass ≈ tile_count
 * neighbour visits).
 */

static bool tile_is_water(const world_t* w, int tile) {
    /* Mirror of column_top_solid in hex_mesher.c — a column whose
     * topmost solid voxel sits below sea level holds a water column
     * above it. column_top_solid < SEA_LEVEL_IDX. */
    const uint8_t* col = &w->blocks[tile * WORLD_MAX_DEPTH];
    for (int d = WORLD_MAX_DEPTH - 1; d >= 0; --d) {
        if (block_is_solid((block_t)col[d])) return d < SEA_LEVEL_IDX;
    }
    return false;
}

static void compute_shore_dist(world_t* w) {
    int N = w->tile_count;
    w->shore_dist_m = (float*)malloc((size_t)N * sizeof(float));
    bool* in_queue = (bool*)calloc((size_t)N, sizeof(bool));
    /* Circular FIFO. At most N tiles can be in_queue at once (the
     * in_queue flag dedupes), so a buffer of size N suffices. */
    int*  queue    = (int*) malloc((size_t)N * sizeof(int));
    int   q_head = 0, q_count = 0;
    const float INF = 1e30f;
    const double R = w->body->radius_m;

    for (int i = 0; i < N; ++i) {
        if (tile_is_water(w, i)) {
            w->shore_dist_m[i] = INF;
        } else {
            w->shore_dist_m[i] = 0.0f;
            queue[(q_head + q_count++) % N] = i;
            in_queue[i] = true;
        }
    }

    while (q_count > 0) {
        int t = queue[q_head];
        q_head = (q_head + 1) % N;
        --q_count;
        in_queue[t] = false;
        const goldberg_tile_t* tt = goldberg_tile(w->grid, t);
        for (int k = 0; k < tt->num_neighbors; ++k) {
            int nb = tt->neighbors[k];
            if (!tile_is_water(w, nb)) continue;
            const goldberg_tile_t* nt = goldberg_tile(w->grid, nb);
            double cosang = dvec3_dot(tt->center, nt->center);
            if (cosang >  1.0) cosang =  1.0;
            if (cosang < -1.0) cosang = -1.0;
            double arc_m = acos(cosang) * R;
            float cand = w->shore_dist_m[t] + (float)arc_m;
            if (cand < w->shore_dist_m[nb]) {
                w->shore_dist_m[nb] = cand;
                if (!in_queue[nb]) {
                    queue[(q_head + q_count++) % N] = nb;
                    in_queue[nb] = true;
                }
            }
        }
    }

    /* Fully-enclosed water bodies (no land tiles reachable) keep INF.
     * Clamp to a large but finite value so downstream smoothstep math
     * doesn't trip on infinity in the GPU upload. */
    for (int i = 0; i < N; ++i) {
        if (w->shore_dist_m[i] > 1e9f) w->shore_dist_m[i] = 1e9f;
    }

    free(queue);
    free(in_queue);
}

float world_tile_shore_dist(world_t* w, int tile) {
    if (tile < 0 || tile >= w->tile_count) return 0.0f;
    if (!w->shore_dist_m) compute_shore_dist(w);
    return w->shore_dist_m[tile];
}
