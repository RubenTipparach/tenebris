#include "core/world_water.h"
#include "core/world.h"
#include "core/blocks.h"
#include "core/config.h"
#include "core/goldberg.h"

#include <limits.h>
#include <math.h>     /* sqrt for flow-direction normalization */
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

    /* Per-tile "needs persistence flush" bitset. 1 bit per tile (NOT
     * per voxel - the unit of persistence is the whole 128-byte
     * water-state column). Set when any cell in the column changes
     * state; drained per-frame by the host via
     * world_water_drain_persist_dirty. */
    uint8_t* persist_dirty;
    int      persist_dirty_bytes;

    /* Flow-origin hash table. Open-addressed, linear probing, fixed
     * power-of-2 size. Each slot is a water_origin_slot_t. Empty slot
     * = key_tile + key_depth_plus_one == 0 (depth is stored +1 so
     * depth 0 + tile 0 isn't a false-empty). Lookup walks until
     * matching key or empty slot. Resize is not implemented - on a
     * full table, origin_add returns false and the cell behaves as
     * an "untracked" flow cell (still flows via state byte, just
     * doesn't participate in origin-driven dry-up / current dir).
     *
     * Sized for ~2048 active flow cells with load factor < 0.5. The
     * 24 bytes/slot * 4096 slots = 96 KB resident, regardless of
     * world size. Worst-case waterfall observed during testing was
     * ~300 cells; 4096 is comfortable headroom. */
    struct water_origin_slot_t {
        uint32_t key_tile;            /* 0 + depth+1 == 0 = empty */
        uint8_t  key_depth_plus_one;
        uint8_t  origin_count;        /* 0..WATER_ORIGIN_MAX */
        uint16_t _pad;
        uint32_t origin_tile [WATER_ORIGIN_MAX];
        uint8_t  origin_depth[WATER_ORIGIN_MAX];
        uint8_t  _pad2;
    } *origins;
    int origins_cap;
    int origins_count;
};
#define WATER_ORIGINS_TABLE_SIZE 4096   /* power of 2 */

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
    ww->persist_dirty_bytes = (w->tile_count + 7) / 8;
    ww->persist_dirty = (uint8_t*)calloc((size_t)ww->persist_dirty_bytes, 1);
    ww->origins_cap = WATER_ORIGINS_TABLE_SIZE;
    ww->origins = calloc((size_t)ww->origins_cap, sizeof *ww->origins);
    ww->origins_count = 0;
    if (!ww->state || !ww->queue || !ww->scheduled || !ww->persist_dirty
        || !ww->origins) {
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
    free(ww->persist_dirty);
    free(ww->origins);
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
    /* Persist-dirty also resets: the clone matches the source
     * snapshot on disk - nothing to flush yet. */
    memset(dst->persist_dirty, 0, (size_t)dst->persist_dirty_bytes);
    /* Origins table sizes must match (same world shape on both sides).
     * Direct memcpy preserves the active entries; empty slots stay
     * empty because their key fields are zero. */
    if (dst->origins_cap == src->origins_cap && dst->origins && src->origins) {
        memcpy(dst->origins, src->origins,
               (size_t)dst->origins_cap * sizeof *dst->origins);
        dst->origins_count = src->origins_count;
    }
}

/* ---------------------------------------------------------------------
 * Flow-origin hash table.
 * ------------------------------------------------------------------- */

static inline uint32_t origin_hash(uint32_t tile, int depth) {
    /* xxHash-style multiply-then-mix. Mixes tile + depth into a 32-bit
     * value that distributes evenly across the table. The depth field
     * is shifted up so it has weight comparable to the tile field. */
    uint32_t h = tile * 0x9E3779B1u;
    h ^= ((uint32_t)depth * 0x85EBCA77u);
    h ^= h >> 16;
    return h;
}

/* depth_plus_one == 0 is "never inserted"; == 255 is "tombstone"
 * (deleted, but lookups must continue probing past it). Live entries
 * have depth_plus_one in 1..128 (depth 0..127 + 1). */
#define WATER_ORIGIN_TOMBSTONE 255u

/* Locate the slot for (tile, depth) for LOOKUP. Returns slot index
 * containing the matching entry, or -1 if the key isn't present
 * (table full, or walked past every slot without a match). Skips
 * tombstones during the walk - they don't break the probe chain. */
static int origin_slot_lookup(const world_water_t* ww, uint32_t tile, int depth) {
    if (!ww || !ww->origins || ww->origins_cap <= 0) return -1;
    uint32_t mask = (uint32_t)(ww->origins_cap - 1);
    uint32_t start = origin_hash(tile, depth) & mask;
    for (uint32_t step = 0; step < (uint32_t)ww->origins_cap; ++step) {
        uint32_t idx = (start + step) & mask;
        const struct water_origin_slot_t* s = &ww->origins[idx];
        if (s->key_depth_plus_one == 0u) return -1;  /* never-used = stop */
        if (s->key_depth_plus_one == WATER_ORIGIN_TOMBSTONE) continue;
        if (s->key_tile == tile
            && s->key_depth_plus_one == (uint8_t)(depth + 1)) {
            return (int)idx;
        }
    }
    return -1;
}

/* Locate a slot for INSERT. Returns the matching slot if present, or
 * the first tombstone / never-used slot encountered in the probe
 * chain. Tombstones get reused so the table doesn't fill up with
 * stale markers after many promotions. Returns -1 only on a
 * completely full table with no key match. */
static int origin_slot_insert(const world_water_t* ww, uint32_t tile, int depth) {
    if (!ww || !ww->origins || ww->origins_cap <= 0) return -1;
    uint32_t mask = (uint32_t)(ww->origins_cap - 1);
    uint32_t start = origin_hash(tile, depth) & mask;
    int first_reusable = -1;
    for (uint32_t step = 0; step < (uint32_t)ww->origins_cap; ++step) {
        uint32_t idx = (start + step) & mask;
        const struct water_origin_slot_t* s = &ww->origins[idx];
        if (s->key_depth_plus_one == 0u) {
            /* End of probe chain - key not present. Use this slot
             * unless an earlier tombstone is available (prefer
             * tombstones to keep the live region compact). */
            return (first_reusable >= 0) ? first_reusable : (int)idx;
        }
        if (s->key_depth_plus_one == WATER_ORIGIN_TOMBSTONE) {
            if (first_reusable < 0) first_reusable = (int)idx;
            continue;
        }
        if (s->key_tile == tile
            && s->key_depth_plus_one == (uint8_t)(depth + 1)) {
            return (int)idx;
        }
    }
    return first_reusable;  /* may be -1 if table truly full */
}

/* Mark a slot as deleted (tombstone) instead of zeroing it so the
 * linear-probe chain stays intact for subsequent lookups. */
static inline void origin_slot_clear(struct water_origin_slot_t* s) {
    memset(s, 0, sizeof *s);
    s->key_depth_plus_one = (uint8_t)WATER_ORIGIN_TOMBSTONE;
}

bool world_water_origin_add(world_t* w, int tile, int depth,
                            water_origin_ref_t origin) {
    if (!w || !w->water) return false;
    if (tile < 0 || depth < 0 || depth >= WORLD_MAX_DEPTH) return false;
    int idx = origin_slot_insert(w->water, (uint32_t)tile, depth);
    if (idx < 0) return false;
    struct water_origin_slot_t* s = &w->water->origins[idx];
    /* Slot may be empty (depth_plus_one == 0), tombstoned, or a live
     * entry for the same key. Live = skip the (re)init; the loop
     * below dedupes the origin. Empty / tombstone = (re)init. */
    if (s->key_depth_plus_one == 0u
        || s->key_depth_plus_one == (uint8_t)WATER_ORIGIN_TOMBSTONE) {
        s->key_tile = (uint32_t)tile;
        s->key_depth_plus_one = (uint8_t)(depth + 1);
        s->origin_count = 0;
        ++w->water->origins_count;
    }
    /* Idempotence: already in the list? */
    for (int i = 0; i < s->origin_count; ++i) {
        if (s->origin_tile[i] == origin.tile
            && s->origin_depth[i] == origin.depth) {
            return true;
        }
    }
    if (s->origin_count < WATER_ORIGIN_MAX) {
        s->origin_tile [s->origin_count] = origin.tile;
        s->origin_depth[s->origin_count] = origin.depth;
        ++s->origin_count;
        return true;
    }
    /* List is full. Previously this branch auto-promoted the cell to
     * a source, but that path was a runaway cascade: a single placed
     * ocean cell would spread to neighbour flow cells, each of which
     * might already have origins from several state==0 worldgen
     * ocean neighbours; the 4th add tripped auto-promote and the
     * promoted cell then seeded its own spread, etc.  Per the user
     * spec "if I place 1 ocean block, two adjacent flow blocks
     * should not merge into an ocean block" - the ONLY way a flow
     * cell becomes a spawn block is the per-tick neighbour-count
     * promote (should_promote_to_source). Drop the 4th origin
     * silently: the cell stays flowing, capped at WATER_ORIGIN_MAX
     * lineage entries. */
    return false;
}

void world_water_origin_remove(world_t* w, int tile, int depth,
                               water_origin_ref_t origin) {
    if (!w || !w->water) return;
    if (tile < 0 || depth < 0 || depth >= WORLD_MAX_DEPTH) return;
    int idx = origin_slot_lookup(w->water, (uint32_t)tile, depth);
    if (idx < 0) return;
    struct water_origin_slot_t* s = &w->water->origins[idx];
    if (s->key_depth_plus_one == 0u) return;
    /* Find and compact-remove. */
    for (int i = 0; i < s->origin_count; ++i) {
        if (s->origin_tile[i] == origin.tile
            && s->origin_depth[i] == origin.depth) {
            for (int j = i + 1; j < s->origin_count; ++j) {
                s->origin_tile [j - 1] = s->origin_tile [j];
                s->origin_depth[j - 1] = s->origin_depth[j];
            }
            --s->origin_count;
            break;
        }
    }
    if (s->origin_count == 0) {
        origin_slot_clear(s);
        if (w->water->origins_count > 0) --w->water->origins_count;
    }
}

void world_water_origin_remove_global(world_t* w, water_origin_ref_t origin) {
    if (!w || !w->water || !w->water->origins) return;
    /* Linear scan of the whole table. With 4096 slots and the table
     * usually 10-50% full, this is fast and only fires on source
     * destruction (rare event). */
    for (int idx = 0; idx < w->water->origins_cap; ++idx) {
        struct water_origin_slot_t* s = &w->water->origins[idx];
        if (s->key_depth_plus_one == 0u) continue;
        /* Same compact-remove as the targeted variant. */
        for (int i = 0; i < s->origin_count; ++i) {
            if (s->origin_tile[i] == origin.tile
                && s->origin_depth[i] == origin.depth) {
                for (int j = i + 1; j < s->origin_count; ++j) {
                    s->origin_tile [j - 1] = s->origin_tile [j];
                    s->origin_depth[j - 1] = s->origin_depth[j];
                }
                --s->origin_count;
                break;
            }
        }
        if (s->origin_count == 0) {
            int tile  = (int)s->key_tile;
            int depth = (int)s->key_depth_plus_one - 1;
            origin_slot_clear(s);
            if (w->water->origins_count > 0) --w->water->origins_count;
            /* Wake the cell so the next tick re-evaluates it via the
             * standard supplier scan and dries it up if no neighbour
             * is feeding it any more. */
            world_water_enqueue(w, tile, depth);
        }
    }
}

void world_water_origin_clear(world_t* w, int tile, int depth) {
    if (!w || !w->water) return;
    if (tile < 0 || depth < 0 || depth >= WORLD_MAX_DEPTH) return;
    int idx = origin_slot_lookup(w->water, (uint32_t)tile, depth);
    if (idx < 0) return;
    struct water_origin_slot_t* s = &w->water->origins[idx];
    if (s->key_depth_plus_one == 0u) return;
    origin_slot_clear(s);
    if (w->water->origins_count > 0) --w->water->origins_count;
}

int world_water_origin_count(const world_t* w, int tile, int depth) {
    if (!w || !w->water) return 0;
    if (tile < 0 || depth < 0 || depth >= WORLD_MAX_DEPTH) return 0;
    int idx = origin_slot_lookup(w->water, (uint32_t)tile, depth);
    if (idx < 0) return 0;
    const struct water_origin_slot_t* s = &w->water->origins[idx];
    if (s->key_depth_plus_one == 0u) return 0;
    return (int)s->origin_count;
}

int world_water_origin_read(const world_t* w, int tile, int depth,
                            water_origin_ref_t* out) {
    if (!w || !w->water) return 0;
    if (tile < 0 || depth < 0 || depth >= WORLD_MAX_DEPTH) return 0;
    int idx = origin_slot_lookup(w->water, (uint32_t)tile, depth);
    if (idx < 0) return 0;
    const struct water_origin_slot_t* s = &w->water->origins[idx];
    if (s->key_depth_plus_one == 0u) return 0;
    int n = s->origin_count;
    if (out) {
        for (int i = 0; i < n; ++i) {
            out[i].tile  = s->origin_tile [i];
            out[i].depth = s->origin_depth[i];
        }
    }
    return n;
}

int world_water_origin_enum_tile(const world_t* w, int tile,
                                  water_origin_diff_entry_t* out, int cap) {
    if (!w || !w->water || !w->water->origins) return 0;
    int n = 0;
    /* Linear table walk. The hash key is (tile, depth) so there's no
     * grouping by tile - any slot might or might not match. With the
     * fixed 4096-slot table this is a few microseconds per tile and
     * only fires during broadcast (post-water-step). */
    for (int idx = 0; idx < w->water->origins_cap; ++idx) {
        const struct water_origin_slot_t* s = &w->water->origins[idx];
        if (s->key_depth_plus_one == 0u
            || s->key_depth_plus_one == (uint8_t)WATER_ORIGIN_TOMBSTONE) {
            continue;
        }
        if ((int)s->key_tile != tile) continue;
        if (out && n < cap) {
            water_origin_diff_entry_t* e = &out[n];
            e->depth        = (uint8_t)(s->key_depth_plus_one - 1);
            e->origin_count = s->origin_count;
            for (int i = 0; i < WATER_ORIGIN_MAX; ++i) {
                e->origin_tile [i] = s->origin_tile [i];
                e->origin_depth[i] = s->origin_depth[i];
            }
        }
        ++n;
    }
    return n;
}

void world_water_origin_visit_all(const world_t* w,
                                   world_water_origin_visit_fn cb,
                                   void* user) {
    if (!w || !w->water || !w->water->origins || !cb) return;
    for (int idx = 0; idx < w->water->origins_cap; ++idx) {
        const struct water_origin_slot_t* s = &w->water->origins[idx];
        if (s->key_depth_plus_one == 0u
            || s->key_depth_plus_one == (uint8_t)WATER_ORIGIN_TOMBSTONE) {
            continue;
        }
        cb((int)s->key_tile, (int)(s->key_depth_plus_one - 1u), user);
    }
}

int world_water_repair_missing_origins(world_t* w) {
    if (!w || !w->grid || !w->water) return 0;
    int total_repaired = 0;
    /* BFS-style: keep iterating until a full pass adds no new
     * origins. Each pass walks every water cell once. An upper
     * bound of WORLD_MAX_DEPTH passes catches the worst case (a
     * long thin flow chain with the spawn at one end) without
     * needing an explicit visited set. */
    for (int pass = 0; pass < WORLD_MAX_DEPTH; ++pass) {
        int repaired_this_pass = 0;
        for (int ti = 0; ti < w->tile_count; ++ti) {
            const goldberg_tile_t* t = goldberg_tile(w->grid, ti);
            if (!t) continue;
            const uint8_t* col = &w->blocks[(size_t)ti * WORLD_MAX_DEPTH];
            for (int d = 0; d < WORLD_MAX_DEPTH; ++d) {
                if (col[d] != (uint8_t)BLOCK_WATER) continue;
                uint8_t s = world_water_get_state(w, ti, d);
                /* Skip non-flow cells: state==0 ocean, sources,
                 * falling water - none of these need origins. */
                if (s == 0u) continue;
                if (water_state_is_source(s)) continue;
                if (water_state_is_falling(s)) continue;
                if (water_state_level(s) <= 0) continue;
                if (world_water_origin_count(w, ti, d) > 0) continue;

                /* Look for an in-plane neighbour that's either a
                 * spawn (state==0 OR SOURCE) or a flow cell that
                 * already has its own origins (repaired in an
                 * earlier pass). Same-depth only - the flow
                 * graph travels horizontally; vertical
                 * waterfalls are handled by the falling-flag
                 * branch above. */
                bool found = false;
                for (int k = 0; k < t->num_neighbors && !found; ++k) {
                    int nb = t->edge_neighbours[k];
                    if (nb < 0) continue;
                    if (w->blocks[(size_t)nb * WORLD_MAX_DEPTH + d]
                        != (uint8_t)BLOCK_WATER) continue;
                    uint8_t ns = world_water_get_state(w, nb, d);
                    if (ns == 0u || water_state_is_source(ns)) {
                        /* Spawn neighbour: record IT as our origin. */
                        water_origin_ref_t r = {
                            (uint32_t)nb, (uint8_t)d
                        };
                        world_water_origin_add(w, ti, d, r);
                        found = true;
                    } else if (world_water_origin_count(w, nb, d) > 0) {
                        /* Flow neighbour with origins: inherit. */
                        water_origin_ref_t srcs[WATER_ORIGIN_MAX];
                        int n = world_water_origin_read(w, nb, d, srcs);
                        for (int oi = 0; oi < n; ++oi) {
                            world_water_origin_add(w, ti, d, srcs[oi]);
                        }
                        found = true;
                    }
                }
                if (found) {
                    ++repaired_this_pass;
                    ++total_repaired;
                }
            }
        }
        if (repaired_this_pass == 0) break;
    }
    return total_repaired;
}

void world_water_origin_apply_entry(world_t* w, int tile,
                                     const water_origin_diff_entry_t* entry) {
    if (!w || !w->water || !entry) return;
    if (tile < 0 || entry->depth >= WORLD_MAX_DEPTH) return;
    /* Clear any prior origin entry for this cell so the server's
     * snapshot fully replaces what we had locally. A no-op when no
     * entry exists; idempotent when the entry already matches. */
    world_water_origin_clear(w, tile, (int)entry->depth);
    int n = entry->origin_count;
    if (n > WATER_ORIGIN_MAX) n = WATER_ORIGIN_MAX;
    for (int i = 0; i < n; ++i) {
        water_origin_ref_t r;
        r.tile  = entry->origin_tile [i];
        r.depth = entry->origin_depth[i];
        world_water_origin_add(w, tile, (int)entry->depth, r);
    }
}

bool world_water_flow_direction(const world_t* w, int tile, int depth,
                                float out[3]) {
    if (out) out[0] = out[1] = out[2] = 0.0f;
    if (!w || !w->water) return false;
    water_origin_ref_t origins[WATER_ORIGIN_MAX];
    int n = world_water_origin_read(w, tile, depth, origins);
    if (n <= 0) return false;

    /* Cell world position = tile center * radius_at_depth. */
    const goldberg_tile_t* t = goldberg_tile(w->grid, tile);
    if (!t) return false;
    double r_cell = world_depth_to_radius_m(w, depth);
    double cx = t->center.x * r_cell;
    double cy = t->center.y * r_cell;
    double cz = t->center.z * r_cell;

    /* Average origin position. Equal-weight as per user spec
     * ("lets not worry about weighted averages yet"). */
    double ox = 0.0, oy = 0.0, oz = 0.0;
    int valid = 0;
    for (int i = 0; i < n; ++i) {
        const goldberg_tile_t* ot = goldberg_tile(w->grid, (int)origins[i].tile);
        if (!ot) continue;
        double r_o = world_depth_to_radius_m(w, (int)origins[i].depth);
        ox += ot->center.x * r_o;
        oy += ot->center.y * r_o;
        oz += ot->center.z * r_o;
        ++valid;
    }
    if (valid == 0) return false;
    ox /= (double)valid;
    oy /= (double)valid;
    oz /= (double)valid;

    /* Direction = cell - origin_avg, normalized. */
    double dx = cx - ox;
    double dy = cy - oy;
    double dz = cz - oz;
    double len = sqrt(dx * dx + dy * dy + dz * dz);
    if (len < 1e-6) return false;
    if (out) {
        out[0] = (float)(dx / len);
        out[1] = (float)(dy / len);
        out[2] = (float)(dz / len);
    }
    return true;
}

/* ---------------------------------------------------------------------
 * Per-cell state accessors.
 * ------------------------------------------------------------------- */

uint8_t world_water_get_state(const world_t* w, int tile, int depth) {
    if (!cell_in_range(w, tile, depth)) return 0u;
    return w->water->state[cell_index(tile, depth)];
}

/* Should this state change wake the per-frame persist flush? Falling
 * cells are reconstructible from neighbour state on reload, so the
 * YAML knob flow_persist_falling lets the operator opt out of
 * persisting them - the I/O budget under a busy waterfall drops to
 * the cost of source / horizontal-level transitions only.
 *
 * A change that LEAVES a falling state (transitioning off the
 * falling flag, e.g. landing in a pool and becoming a regular
 * flowing cell) still triggers a flush — the "settled" state needs
 * to round-trip. Only the case "falling stays falling, just the
 * level / supplier shifted" is skipped. */
static bool should_persist_state_change(uint8_t old_state, uint8_t new_state) {
    /* Always persist when leaving / entering the FALLING flag. */
    if ((old_state & WATER_FLAG_FALLING) != (new_state & WATER_FLAG_FALLING)) {
        return true;
    }
    /* Persist when the SOURCE flag toggles (promotion / demotion). */
    if ((old_state & WATER_FLAG_SOURCE) != (new_state & WATER_FLAG_SOURCE)) {
        return true;
    }
    /* Persist when going to/from "empty" (state 0) - the cell drained
     * or just appeared. */
    if ((old_state == 0u) != (new_state == 0u)) return true;
    /* Past this point, both states have the same FALLING + SOURCE
     * flag. If they're falling and the knob says skip falling, no
     * flush. */
    if ((new_state & WATER_FLAG_FALLING) != 0u
        && config_water_flow()->persist_falling == 0) {
        return false;
    }
    /* Same flags, not falling-skipped: persist iff anything changed
     * (level or future reserved bits). */
    return old_state != new_state;
}

void world_water_set_state(world_t* w, int tile, int depth, uint8_t state) {
    if (!cell_in_range(w, tile, depth)) return;
    int idx = cell_index(tile, depth);
    uint8_t old = w->water->state[idx];
    if (old == state) return;
    w->water->state[idx] = state;
    if (should_persist_state_change(old, state)) {
        w->water->persist_dirty[tile >> 3] |= (uint8_t)(1u << (tile & 7));
    }
}

void world_water_clear_state(world_t* w, int tile, int depth) {
    if (!cell_in_range(w, tile, depth)) return;
    int idx = cell_index(tile, depth);
    uint8_t old = w->water->state[idx];
    if (old == 0u) return;
    w->water->state[idx] = 0u;
    /* Clearing always persists - we're saying "this column has a
     * cell that's now empty water-state, the disk copy needs to
     * agree." */
    w->water->persist_dirty[tile >> 3] |= (uint8_t)(1u << (tile & 7));
}

const uint8_t* world_water_state_column(const world_t* w, int tile) {
    if (!w || !w->water) return NULL;
    if (tile < 0 || tile >= w->tile_count) return NULL;
    return &w->water->state[(size_t)tile * WORLD_MAX_DEPTH];
}

void world_water_load_state_column(world_t* w, int tile, const uint8_t* src) {
    if (!w || !w->water || !src) return;
    if (tile < 0 || tile >= w->tile_count) return;
    memcpy(&w->water->state[(size_t)tile * WORLD_MAX_DEPTH], src,
           (size_t)WORLD_MAX_DEPTH);
    /* Load path: the column matches disk, no need to flush. Also
     * clear the persist-dirty bit if it was set incidentally. */
    w->water->persist_dirty[tile >> 3] &= (uint8_t)~(1u << (tile & 7));
}

int world_water_drain_persist_dirty(world_t* w, int* out_tiles, int cap) {
    if (!w || !w->water || !out_tiles || cap <= 0) return 0;
    int count = 0;
    /* Scan byte-by-byte then bit-by-bit. The bitset is small (one bit
     * per tile - at sub=7 that's ~20 KB worst case) so the linear
     * walk is fine; under busy waterfalls only a handful of bits per
     * frame are usually set. */
    for (int byte = 0; byte < w->water->persist_dirty_bytes && count < cap; ++byte) {
        uint8_t b = w->water->persist_dirty[byte];
        if (b == 0u) continue;
        for (int bit = 0; bit < 8 && count < cap; ++bit) {
            if ((b & (1u << bit)) == 0u) continue;
            int tile = byte * 8 + bit;
            if (tile >= w->tile_count) break;
            out_tiles[count++] = tile;
            b &= (uint8_t)~(1u << bit);
        }
        w->water->persist_dirty[byte] = b;
    }
    return count;
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
                                     bool allow_blind_spread,
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
    /* No direction found a hole within range. The "spread to all
     * passable" fallback used to fire here unconditionally, which is
     * what caused a single placed source on flat ground to flood a
     * radius-N puddle around itself. Gate the fallback on the caller
     * - cells with real downhill pressure (falling, supplied from
     * above, flowing with horizontal supply) keep the blind spread so
     * the floor-splash + bell creep chain still chains outward, while
     * sources / sleeping ocean / promoted sources stop unless they
     * actually find a hole to drain into. The flat-ground source is
     * supposed to be a 1-cell water block, period; if the player
     * wanted to flood, they'd dig a channel and the hole search
     * would pick it up. */
    if (min_dist > radius) {
        if (!allow_blind_spread) return 0;
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
        /* "Ocean block" per the user's unified model is anything
         * the simulator currently treats as a spawn: either the
         * SOURCE flag is set explicitly, or state==0 (worldgen ocean
         * / sleeping spawn).  Both count toward the 2-neighbour
         * promote threshold.
         *
         * The previous code excluded state==0 to avoid runaway
         * cascade, but the cascade was actually coming from the
         * 4-origin auto-promote path in world_water_origin_add,
         * which has now been removed. With that gone, the only way
         * a cell promotes is reaching the threshold here - which by
         * default needs 2 distinct ocean neighbours, exactly what
         * the user asked for. */
        if (water_state_is_source(ns) || ns == 0u) {
            ++sources;
            if (sources >= threshold) return true;
        }
    }
    return false;
}

/* Section 5 rule 3a + 3b: try to spread water from (tile, depth) at
 * the given "own" level. Down first; horizontal spread either replaces
 * or complements it depending on the caller:
 *
 *   also_spread = false  (sources, sleeping ocean, flowing cells with
 *                         horizontal supply) — fall-OR-spread. If the
 *                         cell can fall it consumes its tick on the
 *                         fall and leaves horizontal flow to its new
 *                         falling-cell-below. Matches classic MC.
 *
 *   also_spread = true   (falling cells with vertical supply) — fall-
 *                         AND-spread. The cell falls into the column
 *                         below as usual but ALSO pushes a level+1
 *                         flowing ring out to its side air neighbours.
 *                         Each falling cell creeps one hex outward per
 *                         tick this way, and because the side cells
 *                         themselves become falling on the next tick
 *                         (air below), the creep budget accumulates by
 *                         one hex per fall step. The visible result is
 *                         a bell-shape waterfall that widens as it
 *                         descends, capped by max_level.
 *
 *   allow_blind_spread   When the BFS finds no downward hole within
 *                         search_radius, this flag decides whether the
 *                         cell still spreads to all passable neighbours
 *                         (true: keeps the flat-floor splash + bell
 *                         chain working) or stops entirely (false:
 *                         player-placed sources on flat ground stay a
 *                         1-cell water block instead of flooding).
 *                         Callers tied to vertical pressure (falling,
 *                         supplied-from-above, horizontal-flow chain)
 *                         pass true; sources / sleeping-ocean cells
 *                         pass false. */
static void try_propagate(world_t* w, int tile, int depth, int own_level,
                          bool also_spread, bool allow_blind_spread) {
    /* 3a. Down: if depth-1 is air or non-source water, place a falling
     *     cell there. Vertical drain takes priority; with also_spread
     *     false we stop here, with also_spread true we keep going into
     *     the horizontal block below. */
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
            if (!also_spread) return;
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
    int n = choose_horizontal_targets(w, tile, depth, allow_blind_spread,
                                       targets, GOLDBERG_MAX_NEIGHBORS);
    int new_level = own_level + 1;
    for (int i = 0; i < n; ++i) {
        int nb = targets[i];

        /* Cascade: prefer placing one voxel LOWER than us so the bell
         * literally stair-steps down as it spreads outward. Each ring
         * is then at a distinct world depth and the multi-voxel drop
         * the user wants (1 m / 1.5 m / 2.5 m across rings) shows up
         * even on flat ground - source on a plateau radiates outward
         * AND downward instead of pooling flat at the source depth.
         *
         * Hard requirement: cascade ONLY when nb's same-depth cell is
         * also air. Otherwise the water would tunnel through a solid
         * voxel at nb's depth into an air pocket at nb's depth-1
         * (cave under a hill, sand-encased gap, etc.) - which the
         * user reported as "water flow blocks cannot exist in
         * existing blocks". The same-depth passability is the
         * physical "is the path open" check; the below-passability
         * is the "is the cascade target empty" check. Both must
         * hold or we fall back to same-depth placement.
         *
         * The fall back to same-depth ALSO requires the same air
         * check (the cell loop below would skip a solid cell, but
         * being explicit here makes the contract obvious). */
        int target_depth = depth;
        if (depth - 1 >= 0) {
            block_t b_same  = world_get(w, nb, depth);
            block_t b_below = world_get(w, nb, depth - 1);
            bool same_ok  = (b_same  == BLOCK_AIR || b_same  == BLOCK_WATER);
            bool below_ok = (b_below == BLOCK_AIR || b_below == BLOCK_WATER);
            if (same_ok && below_ok) {
                target_depth = depth - 1;
            }
        }

        block_t b = world_get(w, nb, target_depth);
        if (b != BLOCK_AIR && b != BLOCK_WATER) continue;
        if (b == BLOCK_WATER) {
            uint8_t ns = world_water_get_state(w, nb, target_depth);
            /* Never overwrite source / sleeping / falling, and don't
             * re-write a cell already at-or-better than what we'd
             * give it (avoids a hot-loop of equal-level re-flows). */
            if (water_state_is_source(ns) || ns == 0u) continue;
            if (water_state_is_falling(ns)) continue;
            if (water_state_level(ns) <= new_level) continue;
        } else {
            world_set(w, nb, target_depth, BLOCK_WATER);
        }
        world_water_set_state(w, nb, target_depth,
                              water_state_pack(false, false, new_level));
        world_water_enqueue(w, nb, target_depth);

        /* Propagate origin lineage. The spreader is a spawn point if
         * it has the SOURCE flag explicitly OR if its state byte is
         * still the worldgen sentinel (state==0). Per the user's
         * "ocean = spawner, not distinguished" model, both cases are
         * the same thing - record OURSELVES as the origin on the new
         * flow cell.
         *
         * The original code only counted SOURCE-flagged spreaders,
         * which left every flow cell created by worldgen ocean (the
         * COMMON case - shoreline water spreading inland) with empty
         * origins. Downstream effects: world_water_flow_direction
         * returned false, the F5 overlay showed no arrows, the UV
         * pan computed zero, and the player-current force was
         * silently zero on the very flow blocks the user was
         * looking at.
         *
         * Otherwise (we're a flow cell, propagating water further),
         * copy OUR origin list onto the new cell so the lineage
         * chain stays intact. The origin_add path enforces the
         * WATER_ORIGIN_MAX cap and auto-promotes on the 4th add. */
        uint8_t own_state = world_water_get_state(w, tile, depth);
        if (water_state_is_source(own_state) || own_state == 0u) {
            water_origin_ref_t self = { (uint32_t)tile, (uint8_t)depth };
            world_water_origin_add(w, nb, target_depth, self);
        } else {
            water_origin_ref_t srcs[WATER_ORIGIN_MAX];
            int n = world_water_origin_read(w, tile, depth, srcs);
            for (int oi = 0; oi < n; ++oi) {
                world_water_origin_add(w, nb, target_depth, srcs[oi]);
            }
        }
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

    /* Note: origin-based dry-up isn't enforced here. Origin entries
     * aren't persisted yet (every cell loaded from saves starts with
     * 0 origins), and triggering dry-up on count==0 would wipe every
     * pre-existing flow cell on a save reload. Source destruction
     * still propagates correctly through world_water_origin_remove_
     * global - it enqueues affected cells, and the supplier-scan
     * heuristic below dries them up when no neighbour SOURCE / state=0
     * cell remains. The origin list is still the right source-of-
     * truth for flow-direction rendering + future explicit dry-up
     * once origins persist. */

    /* Sources never decay; just try to spread. A source on air falls
     * straight down. On solid ground with no downhill hole nearby it
     * STAYS A 1-CELL BLOCK - the blind "spread to all neighbours"
     * fallback is gated off for sources, so a player-placed source on
     * flat terrain no longer creates a max_level-radius puddle. The
     * bell-shape widening is owned by the falling cells below, not
     * the source itself; the floor splash is owned by the supplied-
     * from-above floor cells, again not the source. Source still
     * spreads toward any hole BFS finds within search_radius (e.g.
     * source placed at a cliff edge flows over the edge). */
    if (water_state_is_source(s_before)) {
        try_propagate(w, tile, depth, 0,
                       /*also_spread=*/false,
                       /*allow_blind_spread=*/false);
        return;
    }

    /* Legacy / sleeping ocean cell. Same pressure rule as sources -
     * the seabed isn't trying to actively flood new ground; only when
     * a tunnel / dug shoreline opens up a hole does the BFS pick it
     * up and the ocean drains in. */
    if (s_before == 0u) {
        try_propagate(w, tile, depth, 0,
                       /*also_spread=*/false,
                       /*allow_blind_spread=*/false);
        return;
    }

    /* ---- Rule 2: re-derive own level. */
    int supplier_level = INT_MAX;
    bool falling = false;

    /* Vertical supply: a water cell directly above feeds this one at
     * full strength. The FALLING flag latches on only if we can
     * actually keep falling — air below, or non-source/non-sleeping
     * flowing water. A solid floor (or source / sleeping ocean below)
     * means we've LANDED; we stay supplied from above but become a
     * non-falling level-0 supplier so the cells around us can pool
     * outward. Without this transition, a falling cell with a solid
     * floor spreads sideways via try_propagate, those level-1 spread
     * cells find no horizontal supplier (the falling cell is skipped
     * below) and dry up — which re-schedules the falling cell, which
     * re-spreads. Result: a stuck waterfall pumps 64+ edits per frame
     * forever, dirtying tiles and forcing per-frame remesh + relight. */
    if (depth + 1 < WORLD_MAX_DEPTH &&
        world_get(w, tile, depth + 1) == BLOCK_WATER) {
        supplier_level = 0;
        bool can_keep_falling = false;
        if (depth - 1 >= 0) {
            block_t b_below = world_get(w, tile, depth - 1);
            if (b_below == BLOCK_AIR) {
                can_keep_falling = true;
            } else if (b_below == BLOCK_WATER) {
                uint8_t bs = world_water_get_state(w, tile, depth - 1);
                /* Air-equivalent below: flowing / falling water that we
                 * can overwrite as we fall through. Source / sleeping
                 * water acts as a floor (we've landed in the pool). */
                can_keep_falling = !water_state_is_source(bs) && bs != 0u;
            }
        }
        falling = can_keep_falling;
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
     * promote - a falling stream is not a source candidate. Promoted
     * sources follow the same no-blind-spread rule as player-placed
     * sources: they only push outward toward an actual hole. */
    if (!falling && should_promote_to_source(w, tile, depth)) {
        uint8_t s_after = water_state_pack(true, false, 0);
        if (s_after != s_before) {
            world_water_set_state(w, tile, depth, s_after);
            schedule_neighbours(w, tile, depth);
        }
        try_propagate(w, tile, depth, 0,
                       /*also_spread=*/false,
                       /*allow_blind_spread=*/false);
        return;
    }

    uint8_t s_after = water_state_pack(false, falling, supplier_level);

    /* Falling cells fall AND creep outward (bell-shape waterfall);
     * non-falling cells stick to the classic fall-OR-spread rule.
     * Both branches keep blind-spread allowed: falling cells need it
     * for the bell creep, supplied flowing cells need it for the
     * floor splash chain. The no-blind-spread gate only fires for
     * sources / sleeping ocean / promoted sources at the top of this
     * function. */
    const bool also_spread = falling;

    if (s_after == s_before) {
        /* Hot-tile guard: no observable change, no neighbour wakeup.
         * We still try to spread once - a neighbour may have just
         * opened up - but we don't re-schedule the unchanged cell's
         * neighbours. */
        try_propagate(w, tile, depth, supplier_level, also_spread,
                       /*allow_blind_spread=*/true);
        return;
    }

    world_water_set_state(w, tile, depth, s_after);
    /* Level dropped (more pressure from a closer source) or rose
     * (supplier weakened) - either way, neighbours need to re-derive. */
    schedule_neighbours(w, tile, depth);
    try_propagate(w, tile, depth, supplier_level, also_spread,
                   /*allow_blind_spread=*/true);
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
