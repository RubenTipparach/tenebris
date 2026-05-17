#include "core/world_water.h"
#include "core/world.h"
#include "core/blocks.h"
#include "core/config.h"
#include "core/goldberg.h"

#include <limits.h>
#include <stdlib.h>
#include <string.h>

/* Per-tick BFS working-set caps. These bound the stack-allocated search
 * arrays in bfs_distance_to_hole; they're a function of the largest
 * search_radius value the YAML knob could realistically take (a radius-
 * 4 hex search visits ~61 cells worst case, radius-6 visits ~127), so
 * they live as compile-time consts rather than YAML overrides. */
#define BFS_MAX_VISITED             128
#define BFS_MAX_FRONTIER            64

/* ---------------------------------------------------------------------
 * Opaque module state.
 * ------------------------------------------------------------------- */

struct world_water_s {
    /* Per-voxel state byte array, sized to tile_count * WORLD_MAX_DEPTH.
     * Indexed as state[tile * WORLD_MAX_DEPTH + depth]. */
    uint8_t* state;
    int      state_count;

    /* Ring buffer of (tile, depth) cells waiting to tick. Each entry
     * is packed as ((uint32_t)tile << 7) | depth, exploiting the
     * WORLD_MAX_DEPTH = 128 ceiling. */
    uint32_t* queue;
    int       cap;
    int       head;
    int       tail;
    int       count;

    /* "Is this cell already in the queue?" bitset. 1 bit per voxel,
     * sized state_count bits. Prevents the same cell from being
     * enqueued twice (a hot edit area would otherwise queue thousands
     * of duplicates per step). */
    uint8_t* scheduled;
    int      scheduled_bytes;
};

/* ---------------------------------------------------------------------
 * Tiny helpers.
 * ------------------------------------------------------------------- */

static inline uint32_t pack_cell(int tile, int depth) {
    /* WORLD_MAX_DEPTH == 128 fits in 7 bits. Tile count tops out at
     * ~164k at subdivision 7, well under the 25 bits left over. */
    return ((uint32_t)tile << 7) | ((uint32_t)depth & 0x7Fu);
}

static inline void unpack_cell(uint32_t packed, int* tile, int* depth) {
    *tile  = (int)(packed >> 7);
    *depth = (int)(packed & 0x7Fu);
}

static inline bool cell_in_range(const world_t* w, int tile, int depth) {
    if (!w || !w->water) return false;
    if (tile < 0 || tile >= w->tile_count) return false;
    if (depth < 0 || depth >= WORLD_MAX_DEPTH) return false;
    return true;
}

static inline int cell_index(int tile, int depth) {
    return tile * WORLD_MAX_DEPTH + depth;
}

static inline bool sched_bit_get(const world_water_t* ww, int idx) {
    return (ww->scheduled[idx >> 3] >> (idx & 7)) & 1u;
}

static inline void sched_bit_set(world_water_t* ww, int idx) {
    ww->scheduled[idx >> 3] |= (uint8_t)(1u << (idx & 7));
}

static inline void sched_bit_clear(world_water_t* ww, int idx) {
    ww->scheduled[idx >> 3] &= (uint8_t)~(1u << (idx & 7));
}

/* ---------------------------------------------------------------------
 * Lifecycle.
 * ------------------------------------------------------------------- */

world_water_t* world_water_create(const world_t* w) {
    if (!w || w->tile_count <= 0) return NULL;
    world_water_t* ww = (world_water_t*)calloc(1, sizeof(*ww));
    if (!ww) return NULL;
    ww->state_count = w->tile_count * WORLD_MAX_DEPTH;
    ww->state = (uint8_t*)calloc((size_t)ww->state_count, 1);
    /* Queue capacity read at create time. If config_load_water hasn't
     * fired yet the static default applies; runtime YAML reloads are
     * not retroactively resized (the queue lives for the world's
     * lifetime). Floor at 1 so a hostile YAML can't allocate zero
     * bytes. */
    int cap = config_water_flow()->queue_capacity;
    if (cap < 1) cap = 1;
    ww->cap   = cap;
    ww->queue = (uint32_t*)calloc((size_t)ww->cap, sizeof(uint32_t));
    ww->scheduled_bytes = (ww->state_count + 7) / 8;
    ww->scheduled = (uint8_t*)calloc((size_t)ww->scheduled_bytes, 1);
    if (!ww->state || !ww->queue || !ww->scheduled) {
        world_water_destroy(ww);
        return NULL;
    }
    return ww;
}

void world_water_destroy(world_water_t* ww) {
    if (!ww) return;
    free(ww->state);
    free(ww->queue);
    free(ww->scheduled);
    free(ww);
}

void world_water_clone_into(world_water_t* dst, const world_water_t* src) {
    if (!dst || !src) return;
    if (dst->state_count != src->state_count) return;
    memcpy(dst->state, src->state, (size_t)dst->state_count);
    /* Queue is intentionally not cloned: a snapshot inherits the
     * settled state, not pending work. If anything in the clone needs
     * to re-tick (e.g. the new room dirties an edge), the standard
     * mark path will enqueue it from scratch. */
    dst->head = dst->tail = dst->count = 0;
    memset(dst->scheduled, 0, (size_t)dst->scheduled_bytes);
}

/* ---------------------------------------------------------------------
 * Per-cell state accessors.
 * ------------------------------------------------------------------- */

uint8_t world_water_get_state(const world_t* w, int tile, int depth) {
    if (!cell_in_range(w, tile, depth)) return 0u;
    return w->water->state[cell_index(tile, depth)];
}

void world_water_set_state(world_t* w, int tile, int depth, uint8_t state) {
    if (!cell_in_range(w, tile, depth)) return;
    w->water->state[cell_index(tile, depth)] = state;
}

void world_water_clear_state(world_t* w, int tile, int depth) {
    if (!cell_in_range(w, tile, depth)) return;
    w->water->state[cell_index(tile, depth)] = 0u;
}

/* ---------------------------------------------------------------------
 * Scheduler.
 * ------------------------------------------------------------------- */

void world_water_enqueue(world_t* w, int tile, int depth) {
    if (!cell_in_range(w, tile, depth)) return;
    world_water_t* ww = w->water;
    int idx = cell_index(tile, depth);
    if (sched_bit_get(ww, idx)) return;     /* already queued */
    if (ww->count >= ww->cap) return;       /* drop on overflow */
    ww->queue[ww->tail] = pack_cell(tile, depth);
    ww->tail = (ww->tail + 1) % ww->cap;
    ++ww->count;
    sched_bit_set(ww, idx);
}

int world_water_pending(const world_t* w) {
    if (!w || !w->water) return 0;
    return w->water->count;
}

void world_water_notify_edit(world_t* w, int tile, int depth) {
    if (!cell_in_range(w, tile, depth)) return;
    /* The edited cell itself - it may have just become water or just
     * lost water; either way the tick rule needs to re-derive. */
    world_water_enqueue(w, tile, depth);
    /* Vertical neighbours - the cell above may want to start falling
     * through the new gap; the cell below may want to suck up
     * surrounding water now that the supporting block is gone. */
    if (depth + 1 < WORLD_MAX_DEPTH) world_water_enqueue(w, tile, depth + 1);
    if (depth - 1 >= 0)              world_water_enqueue(w, tile, depth - 1);
    /* Horizontal: every 5/6 edge-neighbour at the same depth. Water
     * adjacent to the edit may want to flow into the new opening or
     * re-derive its level after losing a neighbouring source. */
    const goldberg_tile_t* t = goldberg_tile(w->grid, tile);
    if (!t) return;
    for (int k = 0; k < t->num_neighbors; ++k) {
        int nb = t->edge_neighbours[k];
        if (nb >= 0) world_water_enqueue(w, nb, depth);
    }
}

/* ---------------------------------------------------------------------
 * Flow rule helpers. Section numbers refer to tenebris-c/water.md.
 * ------------------------------------------------------------------- */

/* True when (tile, depth) is "passable" for the BFS pathfinder used by
 * choose_horizontal_targets. Mirrors what water can flow through: open
 * air, or non-source / non-falling flowing water. Source and falling
 * cells are walls for the search - the algorithm only follows paths
 * water could realistically use. */
static bool is_passable_for_search(const world_t* w, int tile, int depth) {
    if (!cell_in_range(w, tile, depth)) return false;
    block_t b = world_get(w, tile, depth);
    if (b == BLOCK_AIR) return true;
    if (b != BLOCK_WATER) return false;
    uint8_t s = world_water_get_state(w, tile, depth);
    if (water_state_is_source(s)) return false;
    if (s == 0u) return false;              /* sleeping ocean = wall */
    if (water_state_is_falling(s)) return false;
    return true;
}

/* True if this cell has a "downward hole" — depth-1 is air or non-
 * source water (something falling water could land in / drain through).
 * Used by the BFS to decide when it's reached a target.  */
static bool cell_has_drop(const world_t* w, int tile, int depth) {
    if (depth - 1 < 0) return false;
    block_t below = world_get(w, tile, depth - 1);
    if (below == BLOCK_AIR) return true;
    if (below != BLOCK_WATER) return false;
    uint8_t s = world_water_get_state(w, tile, depth - 1);
    /* Drop into a source / sleeping ocean cell doesn't count: water
     * can't displace it. */
    return !water_state_is_source(s) && s != 0u;
}

/* BFS the hex grid out from (start_tile, depth) up to `max_radius`
 * steps, return the smallest step count at which we find a cell with
 * a downward hole. Returns max_radius+1 if none found.
 *
 * Local arrays bound the search at BFS_MAX_VISITED / BFS_MAX_FRONTIER;
 * a radius-4 hex search visits ~61 cells in the worst case, well
 * inside the cap. Cells past the cap are skipped silently — the result
 * is at worst a slightly conservative direction choice. */
static int bfs_distance_to_hole(const world_t* w, int start_tile, int depth,
                                 int max_radius) {
    if (!is_passable_for_search(w, start_tile, depth)) {
        return max_radius + 1;
    }
    int visited[BFS_MAX_VISITED];
    int visited_n = 0;
    int frontier[BFS_MAX_FRONTIER];
    int frontier_next[BFS_MAX_FRONTIER];
    int fn = 0, fnn = 0;

    visited[visited_n++] = start_tile;
    frontier[fn++] = start_tile;

    for (int step = 1; step <= max_radius; ++step) {
        fnn = 0;
        for (int i = 0; i < fn; ++i) {
            int cur = frontier[i];
            if (cell_has_drop(w, cur, depth)) {
                return step;
            }
            const goldberg_tile_t* t = goldberg_tile(w->grid, cur);
            if (!t) continue;
            for (int k = 0; k < t->num_neighbors; ++k) {
                int nb = t->edge_neighbours[k];
                if (nb < 0) continue;
                if (!is_passable_for_search(w, nb, depth)) continue;
                /* Linear "seen?" check - visited_n is small so this
                 * stays cheap. */
                bool seen = false;
                for (int v = 0; v < visited_n; ++v) {
                    if (visited[v] == nb) { seen = true; break; }
                }
                if (seen) continue;
                if (visited_n >= BFS_MAX_VISITED) continue;
                if (fnn      >= BFS_MAX_FRONTIER) continue;
                visited[visited_n++] = nb;
                frontier_next[fnn++] = nb;
            }
        }
        memcpy(frontier, frontier_next, sizeof(int) * (size_t)fnn);
        fn = fnn;
    }
    return max_radius + 1;
}

/* Pick the set of horizontal neighbours we want to spread into.
 * Section 5 step 3b + the pathfinding tie-break in section 5:
 *
 *   - For each passable neighbour, BFS up to DEFAULT_SEARCH_RADIUS
 *     steps looking for a downward hole. Direction(s) with the
 *     smallest BFS distance win.
 *   - If no direction reaches a hole, spread to all passable
 *     directions (the "trapped puddle" case).
 *
 * Writes up to out_max chosen neighbour tile indices into `out`,
 * returns how many were written. Always returns >= 0 and <= num_neighbors. */
static int choose_horizontal_targets(const world_t* w, int tile, int depth,
                                     int* out, int out_max) {
    const goldberg_tile_t* t = goldberg_tile(w->grid, tile);
    if (!t || out_max <= 0) return 0;
    int n = t->num_neighbors;
    /* search_radius is a runtime knob - clamped down so a pathological
     * YAML value can't blow the stack-allocated BFS arrays. */
    int radius = config_water_flow()->search_radius;
    if (radius < 1) radius = 1;
    if (radius > BFS_MAX_FRONTIER) radius = BFS_MAX_FRONTIER;

    int dist[GOLDBERG_MAX_NEIGHBORS];
    int min_dist = radius + 1;
    for (int k = 0; k < n; ++k) {
        int nb = t->edge_neighbours[k];
        if (nb < 0 || !is_passable_for_search(w, nb, depth)) {
            dist[k] = INT_MAX;
            continue;
        }
        dist[k] = bfs_distance_to_hole(w, nb, depth, radius);
        if (dist[k] < min_dist) min_dist = dist[k];
    }

    int count = 0;
    /* No direction found a hole within range: spread to all passable. */
    if (min_dist > radius) {
        for (int k = 0; k < n && count < out_max; ++k) {
            int nb = t->edge_neighbours[k];
            if (nb >= 0 && is_passable_for_search(w, nb, depth)) {
                out[count++] = nb;
            }
        }
        return count;
    }
    /* Otherwise: ties win. Spread to every direction at min_dist. */
    for (int k = 0; k < n && count < out_max; ++k) {
        if (dist[k] == min_dist) {
            out[count++] = t->edge_neighbours[k];
        }
    }
    return count;
}

/* Wake everything around (tile, depth) - the 6/5 horizontal neighbours
 * at the same depth, plus up and down in the same column. Called when
 * a tick changes a cell's state, so the change can propagate. */
static void schedule_neighbours(world_t* w, int tile, int depth) {
    if (depth + 1 < WORLD_MAX_DEPTH) world_water_enqueue(w, tile, depth + 1);
    if (depth - 1 >= 0)              world_water_enqueue(w, tile, depth - 1);
    const goldberg_tile_t* t = goldberg_tile(w->grid, tile);
    if (!t) return;
    for (int k = 0; k < t->num_neighbors; ++k) {
        int nb = t->edge_neighbours[k];
        if (nb >= 0) world_water_enqueue(w, nb, depth);
    }
}

/* Section 6: a flowing cell promotes to source when it has at least
 * DEFAULT_SOURCE_MIN_NBRS horizontal source-block neighbours at the
 * same depth, AND a solid floor (or another source) directly below. */
static bool should_promote_to_source(const world_t* w, int tile, int depth) {
    /* Floor check first - cheap, and the common case (mid-air flowing
     * water) bails immediately. */
    if (depth - 1 < 0) return false;
    block_t below = world_get(w, tile, depth - 1);
    bool floor_ok = block_covers_face(below);
    if (!floor_ok && below == BLOCK_WATER) {
        uint8_t bs = world_water_get_state(w, tile, depth - 1);
        floor_ok = water_state_is_source(bs) || bs == 0u;
    }
    if (!floor_ok) return false;

    const goldberg_tile_t* t = goldberg_tile(w->grid, tile);
    if (!t) return false;
    /* 2-of-N threshold is a YAML knob. Floor at 1 so a misconfigured
     * value can't make every flowing cell instantly promote. */
    int threshold = config_water_flow()->source_min_nbrs;
    if (threshold < 1) threshold = 1;
    int sources = 0;
    for (int k = 0; k < t->num_neighbors; ++k) {
        int nb = t->edge_neighbours[k];
        if (nb < 0) continue;
        if (world_get(w, nb, depth) != BLOCK_WATER) continue;
        uint8_t ns = world_water_get_state(w, nb, depth);
        if (water_state_is_source(ns) || ns == 0u) {
            ++sources;
            if (sources >= threshold) return true;
        }
    }
    return false;
}

/* Section 5 rule 3a + 3b: try to spread water from (tile, depth) at
 * the given "own" level. Down first; if there's no downward hole,
 * spread horizontally to the chosen neighbours at own_level + 1. */
static void try_propagate(world_t* w, int tile, int depth, int own_level) {
    /* 3a. Down: if depth-1 is air or non-source water, place a falling
     *     cell there. Vertical drain takes priority and we don't spread
     *     horizontally on the same tick. */
    int below = depth - 1;
    if (below >= 0) {
        block_t b = world_get(w, tile, below);
        bool can_fall = false;
        if (b == BLOCK_AIR) {
            can_fall = true;
        } else if (b == BLOCK_WATER) {
            uint8_t bs = world_water_get_state(w, tile, below);
            /* Don't overwrite sources, sleeping ocean, or cells already
             * marked as falling (no change needed). */
            can_fall = !water_state_is_source(bs) && bs != 0u
                    && !water_state_is_falling(bs);
        }
        if (can_fall) {
            uint8_t new_state = water_state_pack(false, true, 0);
            uint8_t old_state = world_water_get_state(w, tile, below);
            if (b != BLOCK_WATER) world_set(w, tile, below, BLOCK_WATER);
            if (new_state != old_state) {
                world_water_set_state(w, tile, below, new_state);
            }
            world_water_enqueue(w, tile, below);
            return;
        }
    }

    /* 3b. Horizontal: only if we have level budget left. Same YAML
     * cap as the drying check in tick_cell - keeps the two sides of
     * the spread / decay rule in agreement. */
    int max_level = config_water_flow()->max_level;
    if (max_level < 0)               max_level = 0;
    if (max_level > WATER_LEVEL_MAX) max_level = WATER_LEVEL_MAX;
    if (own_level >= max_level) return;
    int targets[GOLDBERG_MAX_NEIGHBORS];
    int n = choose_horizontal_targets(w, tile, depth, targets,
                                       GOLDBERG_MAX_NEIGHBORS);
    int new_level = own_level + 1;
    for (int i = 0; i < n; ++i) {
        int nb = targets[i];
        block_t b = world_get(w, nb, depth);
        if (b != BLOCK_AIR && b != BLOCK_WATER) continue;
        if (b == BLOCK_WATER) {
            uint8_t ns = world_water_get_state(w, nb, depth);
            /* Never overwrite source / sleeping / falling, and don't
             * re-write a cell already at-or-better than what we'd
             * give it (avoids a hot-loop of equal-level re-flows). */
            if (water_state_is_source(ns) || ns == 0u) continue;
            if (water_state_is_falling(ns)) continue;
            if (water_state_level(ns) <= new_level) continue;
        } else {
            world_set(w, nb, depth, BLOCK_WATER);
        }
        world_water_set_state(w, nb, depth,
                              water_state_pack(false, false, new_level));
        world_water_enqueue(w, nb, depth);
    }
}

/* The per-cell tick. Section 5 of water.md, end-to-end. */
static void tick_cell(world_t* w, int tile, int depth) {
    if (!cell_in_range(w, tile, depth)) return;

    /* Effective spread-distance cap. YAML can set this lower than the
     * bit-field's hard ceiling (7) to make streams shorter; values
     * outside [0, WATER_LEVEL_MAX] are clamped so a hostile config
     * can't break the state byte invariant. */
    int max_level = config_water_flow()->max_level;
    if (max_level < 0)               max_level = 0;
    if (max_level > WATER_LEVEL_MAX) max_level = WATER_LEVEL_MAX;

    block_t blk = world_get(w, tile, depth);
    if (blk != BLOCK_WATER) {
        /* Cell drained between scheduling and firing - clear any
         * leftover state byte so it doesn't masquerade as something
         * else next tick. */
        world_water_clear_state(w, tile, depth);
        return;
    }

    uint8_t s_before = world_water_get_state(w, tile, depth);

    /* Sources never decay; just try to spread. */
    if (water_state_is_source(s_before)) {
        try_propagate(w, tile, depth, 0);
        return;
    }

    /* Legacy / sleeping ocean cell. Treat the bulk-water default as
     * source-equivalent for propagation purposes - this is the seafloor
     * fill from world_stream_gen. We don't promote it to a real source
     * (preserves the "byte == 0 means sleeping" invariant); we just
     * give the algorithm something to push outward from. */
    if (s_before == 0u) {
        try_propagate(w, tile, depth, 0);
        return;
    }

    /* ---- Rule 2: re-derive own level. */
    int supplier_level = INT_MAX;
    bool falling = false;

    /* Vertical supply: a water cell directly above feeds this one at
     * full strength, with the FALLING flag latched on. */
    if (depth + 1 < WORLD_MAX_DEPTH &&
        world_get(w, tile, depth + 1) == BLOCK_WATER) {
        supplier_level = 0;
        falling = true;
    } else {
        const goldberg_tile_t* t = goldberg_tile(w->grid, tile);
        if (t) {
            for (int k = 0; k < t->num_neighbors; ++k) {
                int nb = t->edge_neighbours[k];
                if (nb < 0) continue;
                if (world_get(w, nb, depth) != BLOCK_WATER) continue;
                uint8_t ns = world_water_get_state(w, nb, depth);
                /* Falling water doesn't feed sideways - it has to land
                 * before it counts as a supplier. */
                if (water_state_is_falling(ns)) continue;
                int n_lvl;
                if (water_state_is_source(ns) || ns == 0u) {
                    n_lvl = 0;
                } else {
                    n_lvl = water_state_level(ns);
                }
                int candidate = n_lvl + 1;
                if (candidate < supplier_level) supplier_level = candidate;
            }
        }
    }

    /* No supplier in range -> dry up. Uses the YAML-configured cap so
     * designers can dial stream length without touching code. */
    if (supplier_level > max_level) {
        world_set(w, tile, depth, BLOCK_AIR);
        world_water_clear_state(w, tile, depth);
        schedule_neighbours(w, tile, depth);
        return;
    }

    /* Promotion check (section 6). Only horizontally-supplied cells can
     * promote - a falling stream is not a source candidate. */
    if (!falling && should_promote_to_source(w, tile, depth)) {
        uint8_t s_after = water_state_pack(true, false, 0);
        if (s_after != s_before) {
            world_water_set_state(w, tile, depth, s_after);
            schedule_neighbours(w, tile, depth);
        }
        try_propagate(w, tile, depth, 0);
        return;
    }

    uint8_t s_after = water_state_pack(false, falling, supplier_level);

    if (s_after == s_before) {
        /* Hot-tile guard: no observable change, no neighbour wakeup.
         * We still try to spread once - a neighbour may have just
         * opened up - but we don't re-schedule the unchanged cell's
         * neighbours. */
        try_propagate(w, tile, depth, supplier_level);
        return;
    }

    world_water_set_state(w, tile, depth, s_after);
    /* Level dropped (more pressure from a closer source) or rose
     * (supplier weakened) - either way, neighbours need to re-derive. */
    schedule_neighbours(w, tile, depth);
    try_propagate(w, tile, depth, supplier_level);
}

int world_water_step(world_t* w, int max_ticks) {
    if (!w || !w->water || max_ticks <= 0) return 0;
    world_water_t* ww = w->water;
    int done = 0;
    while (done < max_ticks && ww->count > 0) {
        uint32_t packed = ww->queue[ww->head];
        ww->head = (ww->head + 1) % ww->cap;
        --ww->count;

        int tile, depth;
        unpack_cell(packed, &tile, &depth);
        int idx = cell_index(tile, depth);
        sched_bit_clear(ww, idx);

        tick_cell(w, tile, depth);
        ++done;
    }
    return done;
}
