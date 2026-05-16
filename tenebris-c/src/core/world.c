#include "core/world.h"
#include "core/world_light.h"
#include "core/planet.h"
#include "core/planet_gen.h"
#include "core/config.h"
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
    w->light = world_light_create(w);
    return w;
}

void world_destroy(world_t* w) {
    if (!w) return;
    world_light_destroy(w->light);
    goldberg_destroy(w->grid);
    free(w->blocks);
    free(w->dirty);
    free(w->saved);
    free(w);
}

world_t* world_clone(const world_t* src) {
    if (!src || !src->body) return NULL;
    /* Re-derive subdivisions from the body so we can build a fresh
     * grid for the clone (the grid is owned per-world and would
     * double-free if shared with the source). */
    int subs = planet_subdivisions_for_radius(src->body->radius_m);
    world_t* w = world_create(src->body, subs);
    if (!w) return NULL;
    /* The freshly-created world has empty blocks (calloc'd). Copy the
     * source's filled columns straight over — that's the procgen-
     * plus-edits state we want the clone to inherit. */
    memcpy(w->blocks, src->blocks, (size_t)(w->tile_count * WORLD_MAX_DEPTH));
    /* Mark gen as complete so callers don't re-run world_stream_gen. */
    w->gen_cursor = w->tile_count;
    /* Dirty bits start clean — the clone is a snapshot. */
    /* Light grid: copy the source's nibbles so the snapshot keeps its
     * relit state without paying for another BFS. Torches reset; the
     * client that consumes this clone republishes its torch list. */
    world_light_clone_into(w->light, src->light);
    return w;
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
        const bool is_sequoia_grass = (top == BLOCK_SEQ_GRASS);
        const bool is_grass = (top == BLOCK_GRASS) || is_sequoia_grass;
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
                /* Leafy crown spread vertically over the trunk top.
                 * Sequoia uses its own red-tinted leaf block so the
                 * biome reads as alien even before you land. */
                const uint8_t leaf_block = is_sequoia_grass
                                              ? (uint8_t)BLOCK_SEQ_LEAVES
                                              : (uint8_t)BLOCK_LEAVES;
                for (int d = leaf_lo; d <= leaf_hi; ++d) {
                    if (d <= surface_idx) continue;
                    if (column[d] == BLOCK_AIR) column[d] = leaf_block;
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
    /* No-op early-return when the new block matches the existing one.
     * The /saves/body fetch on join writes every depth of every
     * persisted tile (3840 calls for a 30-tile body) - the vast
     * majority of those are idempotent because most depths haven't
     * actually changed from procgen. Without this guard each
     * idempotent call would queue a light edit, run a removal +
     * addition BFS through the cell's neighbours, and risk
     * overflowing the BFS's bounded add queue (which silently drops
     * neighbour pushes), leaving correctly-lit surface cells stuck
     * at sky=0. The mesh dirty bitset is also untouched here - no
     * change, no remesh needed. */
    int idx = tile * WORLD_MAX_DEPTH + depth;
    if (w->blocks[idx] == (uint8_t)b) return;
    w->blocks[idx] = (uint8_t)b;
    w->dirty[tile >> 3] |= (uint8_t)(1 << (tile & 7));
    /* Dirty neighbors too so their seam faces rebuild. */
    const goldberg_tile_t* t = goldberg_tile(w->grid, tile);
    for (int i = 0; i < t->num_neighbors; ++i) {
        int n = t->neighbors[i];
        w->dirty[n >> 3] |= (uint8_t)(1 << (n & 7));
    }
    /* Mark the edited cell for incremental relight. The light grid
     * runs a Minecraft-style removal-then-addition BFS bounded by
     * sky_max steps, so a single block change only re-propagates the
     * cells within roughly sky_max / lateral_loss tiles - not the
     * whole planet. If the queue overflows the mark layer escalates
     * to a full rebuild automatically. */
    world_light_mark_dirty_at(w->light, tile, depth);
}

bool world_tile_dirty(const world_t* w, int tile) {
    if (tile < 0 || tile >= w->tile_count) return false;
    return (w->dirty[tile >> 3] & (1 << (tile & 7))) != 0;
}

void world_tile_clear_dirty(world_t* w, int tile) {
    if (tile < 0 || tile >= w->tile_count) return;
    w->dirty[tile >> 3] &= (uint8_t)~(1 << (tile & 7));
}

bool world_tile_saved(const world_t* w, int tile) {
    if (!w || !w->saved) return false;
    if (tile < 0 || tile >= w->tile_count) return false;
    return (w->saved[tile >> 3] & (1 << (tile & 7))) != 0;
}

void world_tile_mark_saved(world_t* w, int tile) {
    if (!w || tile < 0 || tile >= w->tile_count) return;
    if (!w->saved) {
        w->saved_bytes = (w->tile_count + 7) / 8;
        w->saved = (uint8_t*)calloc((size_t)w->saved_bytes, 1);
        if (!w->saved) { w->saved_bytes = 0; return; }
    }
    w->saved[tile >> 3] |= (uint8_t)(1 << (tile & 7));
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
    /* DO NOT mark the light grid full-dirty here. world_light_mark_dirty
     * sets needs_full = true, escalating what should be a tiny ripple
     * around the torch position into a planet-wide BFS - measured at
     * ~1000 ms / 17M ops per torch place on a 160k-tile body, vs the
     * 0.4 ms / few-ops cost of a normal incremental block edit.
     *
     * The torch list change is already picked up by
     * world_light_set_torches() in hex_mesher_relight_if_needed: it
     * diffs the new list against the cached one and calls
     * mark_dirty_at on both the OLD and NEW torch cells, which routes
     * through the incremental ripple-BFS path bounded by sky_max
     * steps around each cell. The mesh dirty bits above are still
     * needed so the affected chunks remesh and pick up the
     * (newly-propagated) per-vertex torch_light values. */
}

double world_depth_to_radius_m(const world_t* w, int depth) {
    /* Depth index 0 = deepest bedrock. Sea level = SEA_LEVEL_IDX.
     * Convert so radius = body.radius_m - (SEA_LEVEL_IDX - depth) * BLOCK_HEIGHT. */
    return w->body->radius_m - ((double)SEA_LEVEL_IDX - (double)depth) * BLOCK_HEIGHT;
}

int world_radius_to_depth(const world_t* w, double radius_m) {
    /* Inverse of world_depth_to_radius_m. The voxel at depth d spans
     * radii [depth_to_radius(d), depth_to_radius(d+1)) - so flooring
     * (r - body.radius) / BLOCK_HEIGHT + SEA_LEVEL_IDX gives the
     * containing voxel. */
    double offset = radius_m - w->body->radius_m;
    int depth = (int)floor(offset / BLOCK_HEIGHT) + SEA_LEVEL_IDX;
    return depth;
}

bool world_is_water_at(const world_t* w, int tile, double radius_m) {
    if (!w || tile < 0 || tile >= w->tile_count || tile >= w->gen_cursor) {
        return false;
    }
    int depth = world_radius_to_depth(w, radius_m);
    if (depth < 0 || depth >= WORLD_MAX_DEPTH) return false;
    return w->blocks[tile * WORLD_MAX_DEPTH + depth] == (uint8_t)BLOCK_WATER;
}

/* True if a block_t is "passable" from the player's POV (air or water).
 * Walkable floors are solid blocks with a passable cell directly above. */
static bool block_is_passable(uint8_t b) {
    return b == (uint8_t)BLOCK_AIR || b == (uint8_t)BLOCK_WATER;
}

/* Vertical tolerance for "step me up onto a floor that's slightly
 * above where I asked". Sourced from lod.yaml's step_height_m - the
 * same knob player_ctrl.c reads, so the two stay in lock-step without
 * a duplicate define. It's the same physical concept: how far the
 * player can be lifted by ground-snap without it feeling like
 * teleport. A bridge whose top sits 1 cm above the player's feet
 * (after one tick of gravity) must be picked over the distant planet
 * ground below, otherwise the player falls through their own builds. */
static double world_step_height(void) {
    return (double)config_lod()->step_height_m;
}

double world_walkable_floor_near(const world_t* w, int tile,
                                 double target_radius_m,
                                 double body_height_m) {
    if (!w || tile < 0 || tile >= w->tile_count || tile >= w->gen_cursor) {
        return -1e9;
    }
    const uint8_t* col = &w->blocks[tile * WORLD_MAX_DEPTH];

    /* Scan every walkable floor in the column. We track the closest
     * floor below the target separately from the closest above, then
     * pick between them:
     *
     *   - A floor close above (within WORLD_STEP_HEIGHT) BEATS any
     *     floor below. This is what makes a player-built bridge work:
     *     gravity dips the feet a cm under the bridge top each tick,
     *     and we need to snap back to the bridge instead of the
     *     planet surface tens of metres down.
     *   - Otherwise prefer the closest floor at-or-below the target.
     *     Falling into a cave with a roof a few metres overhead and a
     *     real floor below: the roof's TOP sits far above the
     *     player's feet (more than STEP_HEIGHT), so it's correctly
     *     ignored and the cave floor wins.
     *   - With no below-or-near-above candidate, fall through to the
     *     best above (may still be -1e9 if the column has no floor).
     *
     * Headroom check (body_height_m > 0): the column above the
     * candidate must be passable for body_height_m metres. */
    double best_radius_below = -1e9;
    double best_dist_below   = 1e9;
    double best_radius_above = -1e9;
    double best_dist_above   = 1e9;

    for (int d = 0; d < WORLD_MAX_DEPTH; ++d) {
        uint8_t cur = col[d];
        /* Treat the cell ABOVE the topmost stored depth as implicit
         * air - it's the open sky above the planet's build cap.
         * Without this, the topmost solid block (d = WORLD_MAX_DEPTH-1)
         * was never recognised as a walkable floor: the previous
         * `d + 1 < WORLD_MAX_DEPTH` loop bound skipped it, so a
         * player standing on a column they'd built all the way to
         * the cap got snapped down to the next floor below any
         * mid-column air pocket. Bug report: "if there's air below
         * a top-cap column, the column loses collision". */
        uint8_t up  = (d + 1 < WORLD_MAX_DEPTH) ? col[d + 1] : (uint8_t)BLOCK_AIR;
        if (block_is_passable(cur))     continue;   /* not solid */
        if (!block_is_passable(up))     continue;   /* roofed by solid */
        double floor_r = world_depth_to_radius_m(w, d + 1);

        if (body_height_m > 0.0) {
            /* Number of overhead voxels we need clear, rounded up so
             * a 1.8 m player needs 2 m of headroom and a 2.0 m
             * player still only needs 2. Walk the column above and
             * bail if any of those cells is solid. */
            int rows = (int)ceil(body_height_m / BLOCK_HEIGHT);
            int top_depth = d + rows;
            if (top_depth >= WORLD_MAX_DEPTH) top_depth = WORLD_MAX_DEPTH - 1;
            bool clear = true;
            for (int e = d + 1; e <= top_depth; ++e) {
                if (!block_is_passable(col[e])) { clear = false; break; }
            }
            if (!clear) continue;
        }

        double dist = floor_r - target_radius_m;
        if (dist <= 0.0) {
            double ad = -dist;
            if (ad < best_dist_below) {
                best_dist_below   = ad;
                best_radius_below = floor_r;
            }
        } else {
            if (dist < best_dist_above) {
                best_dist_above   = dist;
                best_radius_above = floor_r;
            }
        }
    }
    /* Bridge-aware tiebreak. A floor within step-height ABOVE the
     * target beats whatever is far below it, because the player has
     * almost certainly just dipped a hair under it via gravity and
     * needs to snap back. Only relevant when the above candidate is
     * physically close - bigger gaps (cave ceilings, terrain above an
     * overhang) keep the legacy "prefer below" behaviour. */
    const double step_h = world_step_height();
    if (best_radius_above > -1e8 && best_dist_above <= step_h) {
        if (best_radius_below < -1e8 || best_dist_above < best_dist_below) {
            return best_radius_above;
        }
    }
    if (best_radius_below > -1e8) return best_radius_below;
    return best_radius_above;   /* may still be -1e9 if none */
}

dvec3_t world_safe_spawn_local(const world_t* w, dvec3_t unit_dir, double headroom_m) {
    /* Fallback radius if there's no walkable floor to read - drop
     * the player a couple of metres above the body's nominal
     * surface so the next frame's gravity lands them on whatever's
     * generated. */
    double fallback_r = w->body->radius_m + headroom_m;
    if (!w || w->tile_count <= 0) {
        return dvec3_scale(unit_dir, fallback_r);
    }
    int tile = goldberg_find_tile(w->grid, unit_dir, -1);
    if (tile < 0 || tile >= w->tile_count || tile >= w->gen_cursor) {
        return dvec3_scale(unit_dir, fallback_r);
    }
    /* Scan the column top-down for the topmost walkable floor (solid
     * with passable above). We want the SURFACE, not the closest
     * floor to wherever the player ended up - the caller's r is
     * presumed to be well below the world. */
    const uint8_t* col = &w->blocks[tile * WORLD_MAX_DEPTH];
    int top_floor_depth = -1;
    for (int d = WORLD_MAX_DEPTH - 1; d >= 0; --d) {
        uint8_t cur = col[d];
        if (block_is_passable(cur)) continue;
        uint8_t up = (d + 1 < WORLD_MAX_DEPTH) ? col[d + 1] : (uint8_t)BLOCK_AIR;
        if (block_is_passable(up)) {
            top_floor_depth = d;
            break;
        }
    }
    if (top_floor_depth < 0) {
        return dvec3_scale(unit_dir, fallback_r);
    }
    double floor_r = world_depth_to_radius_m(w, top_floor_depth + 1);
    return dvec3_scale(unit_dir, floor_r + headroom_m);
}

double world_ceiling_above(const world_t* w, int tile, double head_radius_m) {
    if (!w || tile < 0 || tile >= w->tile_count || tile >= w->gen_cursor) {
        return 1e30;
    }
    const uint8_t* col = &w->blocks[tile * WORLD_MAX_DEPTH];
    int head_depth = world_radius_to_depth(w, head_radius_m);
    if (head_depth < 0) head_depth = 0;
    for (int d = head_depth; d < WORLD_MAX_DEPTH; ++d) {
        uint8_t b = col[d];
        if (!block_is_passable(b)) {
            /* This voxel is solid; its bottom radius is depth d. */
            return world_depth_to_radius_m(w, d);
        }
    }
    return 1e30;
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

