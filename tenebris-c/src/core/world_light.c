#include "core/world_light.h"
#include "core/world.h"
#include "core/blocks.h"
#include "core/goldberg.h"
#include "core/config.h"

#include <stdlib.h>
#include <string.h>

/* ----------------------------------------------------------------------- */
/* Layout. nibbles[i] = (sky << 4) | block, indexed exactly like
 * world.blocks (tile * WORLD_MAX_DEPTH + depth). torches[] is the
 * snapshot the most recent world_light_set_torches handed us; it
 * lives on the grid (not the world) because torch state is owned
 * by the client and core/ must stay client-free. */

/* Incremental rebuild state. The BFS runs in budgeted slices across
 * frames so a relight after a big chunk edit doesn't stall the main
 * loop. world_light_rebuild() is the single entry: it advances the
 * state machine by `voxel_rebuild_ops_per_frame` BFS pops and returns.
 * The next frame's call resumes from the saved phase + queue. */
typedef enum {
    LR_IDLE       = 0,
    LR_SKY_SEED   = 1,    /* seeding sky=max down each column      */
    LR_SKY_BFS    = 2,    /* draining the sky propagation queue    */
    LR_BLOCK_SEED = 3,    /* seeding torch sources                  */
    LR_BLOCK_BFS  = 4,    /* draining the block propagation queue   */
} light_rebuild_phase_t;

typedef struct {
    uint32_t* buf;
    int       head;     /* next to pop  */
    int       tail;     /* next to push */
    int       cap;
    int       count;
} queue_t;

/* Per-edit ripple queue cap. Larger = more edits batch into the next
 * incremental rebuild before we fall back to a full pass. 8192 is
 * comfortable for hundreds of CHUNK_DIFF entries arriving in one
 * frame; one player placing blocks at human speed never gets near
 * the cap. Each entry is a uint32 voxel index. */
#define LIGHT_EDIT_QUEUE_CAP   8192

struct world_light_s {
    int        tile_count;
    int        depth;            /* always WORLD_MAX_DEPTH; cached     */
    uint8_t*   nibbles;          /* size tile_count * depth            */
    bool       dirty;

    world_light_torch_t* torches;
    int                  torch_count;
    int                  torch_cap;

    /* Rebuild state machine. Lives on the grid so the BFS queue
     * persists across frames. */
    light_rebuild_phase_t phase;
    queue_t               q;
    int                   seed_tile_cursor;   /* sky seed pass progress */
    int                   torch_seed_cursor;
    bool                  restart_pending;     /* edit during rebuild */

    /* Incremental rebuild state. world_set pushes (tile, depth) here
     * via mark_dirty_at; the next rebuild drains the queue with a
     * bounded BFS (removal + addition pass) rather than a full
     * memset + seed. A full rebuild is forced when needs_full = true
     * (initial create / clone, or overflow). */
    uint32_t   edits[LIGHT_EDIT_QUEUE_CAP];
    int        edit_count;
    bool       needs_full;
};

/* ----------------------------------------------------------------------- */

static inline int voxel_index(int tile, int depth) {
    return tile * WORLD_MAX_DEPTH + depth;
}

static inline uint8_t get_sky(const world_light_t* l, int idx) {
    return (uint8_t)(l->nibbles[idx] >> 4);
}
static inline uint8_t get_block(const world_light_t* l, int idx) {
    return (uint8_t)(l->nibbles[idx] & 0x0F);
}
static inline void set_sky(world_light_t* l, int idx, uint8_t v) {
    l->nibbles[idx] = (uint8_t)((v << 4) | (l->nibbles[idx] & 0x0F));
}
static inline void set_block(world_light_t* l, int idx, uint8_t v) {
    l->nibbles[idx] = (uint8_t)((l->nibbles[idx] & 0xF0) | (v & 0x0F));
}

/* ----------------------------------------------------------------------- */

world_light_t* world_light_create(const world_t* w) {
    if (!w) return NULL;
    world_light_t* l = (world_light_t*)calloc(1, sizeof(*l));
    l->tile_count = w->tile_count;
    l->depth      = WORLD_MAX_DEPTH;
    l->nibbles    = (uint8_t*)calloc((size_t)(l->tile_count * l->depth), 1);
    l->dirty      = true;
    /* Fresh grid - the first rebuild has to walk every column to
     * seed sky; subsequent rebuilds run incrementally from the edit
     * queue. */
    l->needs_full = true;
    return l;
}

void world_light_destroy(world_light_t* l) {
    if (!l) return;
    free(l->nibbles);
    free(l->torches);
    free(l->q.buf);
    free(l);
}

void world_light_clone_into(world_light_t* dst, const world_light_t* src) {
    if (!dst || !src) return;
    if (dst->tile_count != src->tile_count) return;
    memcpy(dst->nibbles, src->nibbles, (size_t)(dst->tile_count * dst->depth));
    dst->dirty = src->dirty;
    /* Torches are a client-published snapshot; the cloned world starts
     * with none until the consumer republishes. */
    free(dst->torches);
    dst->torches = NULL;
    dst->torch_count = dst->torch_cap = 0;
    /* Drop any in-progress rebuild state - the clone is a fresh
     * snapshot, the consumer will dirty + rebuild from scratch. */
    free(dst->q.buf);
    dst->q.buf = NULL;
    dst->q.cap = dst->q.head = dst->q.tail = dst->q.count = 0;
    dst->phase = LR_IDLE;
    dst->seed_tile_cursor = 0;
    dst->torch_seed_cursor = 0;
    dst->restart_pending = false;
    dst->edit_count = 0;
    dst->needs_full = true;       /* first rebuild on the clone is full */
}

void world_light_mark_dirty(world_light_t* l) {
    if (!l) return;
    if (l->phase != LR_IDLE) {
        /* Edit landed mid-rebuild. Let the current pass finish so we
         * don't churn the queue, then schedule a fresh rebuild after. */
        l->restart_pending = true;
    }
    l->needs_full = true;
    l->dirty      = true;
}

void world_light_mark_dirty_at(world_light_t* l, int tile, int depth) {
    if (!l) return;
    if (tile < 0 || tile >= l->tile_count) return;
    if (depth < 0 || depth >= WORLD_MAX_DEPTH) return;
    /* Always set dirty + restart_pending. The previous early-return
     * for needs_full silently DROPPED edits that landed mid-rebuild,
     * so saves/body data and live block edits weren't reflected in
     * the lighting after the in-flight full rebuild finished
     * (because the rebuild's seed pass already ran with stale
     * blocks). */
    l->dirty = true;
    if (l->phase != LR_IDLE) l->restart_pending = true;
    if (l->needs_full) {
        /* Full pass already requested. The queue would be discarded
         * anyway, but we need restart_pending so the rebuild kicks
         * again after the current one completes - the current pass
         * may have seeded with the OLD block state for this cell. */
        return;
    }
    if (l->edit_count >= LIGHT_EDIT_QUEUE_CAP) {
        /* Queue overflow - escalate to a full rebuild so we don't
         * silently miss any edits. */
        l->needs_full = true;
        l->edit_count = 0;
        return;
    }
    l->edits[l->edit_count++] = (uint32_t)voxel_index(tile, depth);
}
bool world_light_is_dirty(const world_light_t* l) {
    return l ? l->dirty : false;
}

void world_light_set_torches(world_light_t* l,
                             const world_light_torch_t* sources,
                             int count) {
    if (!l) return;
    if (count < 0) count = 0;

    /* hex_mesher republishes the torch list every frame an edit was
     * detected, but the list usually hasn't actually changed (place /
     * remove are rare events). Diff against the cached copy and bail
     * silently when identical so the incremental rebuild isn't
     * reset on every frame the player is mid-mining a block. */
    bool same = (count == l->torch_count);
    if (same && count > 0 && (!sources || !l->torches)) same = false;
    if (same) {
        for (int i = 0; i < count; ++i) {
            if (l->torches[i].tile      != sources[i].tile
                || l->torches[i].depth     != sources[i].depth
                || l->torches[i].intensity != sources[i].intensity) {
                same = false;
                break;
            }
        }
    }
    if (same) return;

    /* Mark every cell that's changing dirty for an incremental BFS
     * pass. We queue both the OLD positions (so the removal pass
     * cascades from the cell's existing block-light value) and the
     * NEW positions (so the addition pass re-seeds them once the
     * snapshot below is swapped in). Placing a single torch only
     * touches the ~sky_max^3 cells around the edit, so this stays
     * off the frame budget instead of forcing a planet-wide full
     * rebuild on every torch click. */
    for (int i = 0; i < l->torch_count; ++i) {
        world_light_mark_dirty_at(l, l->torches[i].tile, l->torches[i].depth);
    }
    for (int i = 0; i < count; ++i) {
        world_light_mark_dirty_at(l, sources[i].tile, sources[i].depth);
    }

    if (count > l->torch_cap) {
        free(l->torches);
        l->torch_cap = count > 16 ? count : 16;
        l->torches   = (world_light_torch_t*)calloc((size_t)l->torch_cap,
                                                    sizeof(world_light_torch_t));
    }
    if (count > 0 && sources && l->torches) {
        memcpy(l->torches, sources, (size_t)count * sizeof(world_light_torch_t));
    }
    l->torch_count = count;
    l->dirty = true;
}

/* ----------------------------------------------------------------------- */
/* Queue. Ring buffer of flat voxel indices. Grows on overflow.
 * Owned by world_light_s so the incremental BFS can resume across
 * frames - the old per-rebuild malloc/free pair would discard work
 * in progress every time a new edit re-marked the grid dirty. */

static void queue_init(queue_t* q, int initial_cap) {
    q->cap   = initial_cap > 64 ? initial_cap : 64;
    q->buf   = (uint32_t*)malloc((size_t)q->cap * sizeof(uint32_t));
    q->head  = 0;
    q->tail  = 0;
    q->count = 0;
}
/* queue_free retired - the queue buffer's lifetime is now tied to
 * the owning world_light_t (freed in world_light_destroy directly). */

static void queue_grow(queue_t* q) {
    int new_cap = q->cap * 2;
    uint32_t* new_buf = (uint32_t*)malloc((size_t)new_cap * sizeof(uint32_t));
    /* Linearise: copy in oldest-first order to slot 0..count-1. */
    for (int i = 0; i < q->count; ++i) {
        new_buf[i] = q->buf[(q->head + i) % q->cap];
    }
    free(q->buf);
    q->buf  = new_buf;
    q->cap  = new_cap;
    q->head = 0;
    q->tail = q->count;
}

static void queue_push(queue_t* q, uint32_t idx) {
    if (q->count == q->cap) queue_grow(q);
    q->buf[q->tail] = idx;
    q->tail = (q->tail + 1) % q->cap;
    ++q->count;
}

static uint32_t queue_pop(queue_t* q) {
    uint32_t v = q->buf[q->head];
    q->head = (q->head + 1) % q->cap;
    --q->count;
    return v;
}

/* ----------------------------------------------------------------------- */
/* Neighbour iteration. Each voxel has up to 8 neighbours: 5 or 6
 * lateral (one per goldberg tile-edge) plus depth-1 and depth+1. The
 * caller hands us a fixed-size out array; we return how many were
 * actually filled. */

#define MAX_NEIGHBOURS 8

/* voxel_neighbours_with_cost (below) replaces the single-cost helper
 * that used to live here. Vertical neighbours still cost 1; lateral
 * cost is the config-driven voxel_sky_lateral_loss. */

/* ----------------------------------------------------------------------- */
/* Incremental BFS plumbing.
 *
 * sky_seed_step seeds one tile column at a time so the seed pass
 * is also budgeted (a 160k-tile planet's seed alone touches several
 * hundred k voxels). bfs_one_pop processes a single dequeue against
 * either channel. The rebuild driver below interleaves seed work and
 * BFS work within one frame budget so a fresh dirty starts producing
 * visible light immediately instead of waiting for the seed to fully
 * complete before any propagation kicks off. */

/* Per-step attenuation table: lateral neighbours cost
 * voxel_sky_lateral_loss, vertical neighbours always cost 1. The
 * voxel_neighbours order is (lateral first, then depth+1, depth-1)
 * so we know which is which by index. */
static int voxel_neighbours_with_cost(const world_t* w, int tile, int depth,
                                        int out[MAX_NEIGHBOURS],
                                        int cost[MAX_NEIGHBOURS],
                                        int lateral_cost) {
    int n = 0;
    const goldberg_tile_t* t = goldberg_tile(w->grid, tile);
    if (!t) return 0;
    for (int i = 0; i < t->num_neighbors; ++i) {
        int nb = t->neighbors[i];
        if (nb >= 0 && nb < w->tile_count) {
            out[n]  = voxel_index(nb, depth);
            cost[n] = lateral_cost;
            ++n;
        }
    }
    /* Vertical neighbours stay at 1 per step so daylight shafts
     * remain at full strength. */
    if (depth + 1 < WORLD_MAX_DEPTH) { out[n] = voxel_index(tile, depth + 1); cost[n] = 1; ++n; }
    if (depth - 1 >= 0)              { out[n] = voxel_index(tile, depth - 1); cost[n] = 1; ++n; }
    return n;
}

/* Seed one tile column for the sky pass. Walks from the top down,
 * stops at the first face-covering block. Returns the number of
 * voxels touched (so the budget accounting reflects real work). */
static int sky_seed_one_column(world_light_t* l, const world_t* w,
                                  int tile, int sky_max) {
    if (tile < 0 || tile >= w->tile_count) return 0;
    const uint8_t* col = &w->blocks[(size_t)tile * WORLD_MAX_DEPTH];
    int touched = 0;
    for (int d = WORLD_MAX_DEPTH - 1; d >= 0; --d) {
        block_t b = (block_t)col[d];
        if (block_covers_face(b)) break;
        int idx = voxel_index(tile, d);
        set_sky(l, idx, (uint8_t)sky_max);
        queue_push(&l->q, (uint32_t)idx);
        ++touched;
    }
    return touched;
}

/* Pop one entry off the queue and propagate to its neighbours. Used
 * for both the sky and block passes; the channel is selected by
 * the get/set callbacks. Returns the number of neighbour pushes
 * (used purely for budget accounting; one pop always costs the
 * lateral + 2 vertical neighbour visits). */
typedef uint8_t (*get_fn_t)(const world_light_t*, int);
typedef void    (*set_fn_t)(world_light_t*, int, uint8_t);

static void bfs_one_pop(world_light_t* l, const world_t* w,
                          get_fn_t getf, set_fn_t setf,
                          int lateral_cost) {
    if (l->q.count == 0) return;
    uint32_t idx = queue_pop(&l->q);
    int tile  = (int)idx / WORLD_MAX_DEPTH;
    int depth = (int)idx % WORLD_MAX_DEPTH;
    uint8_t cur = getf(l, (int)idx);
    if (cur <= 1) return;

    int nbrs[MAX_NEIGHBOURS];
    int cost[MAX_NEIGHBOURS];
    int count = voxel_neighbours_with_cost(w, tile, depth, nbrs, cost, lateral_cost);
    for (int k = 0; k < count; ++k) {
        int n_idx = nbrs[k];
        int n_tile  = n_idx / WORLD_MAX_DEPTH;
        int n_depth = n_idx % WORLD_MAX_DEPTH;
        block_t nb = (block_t)w->blocks[(size_t)n_tile * WORLD_MAX_DEPTH + n_depth];
        if (block_covers_face(nb)) continue;
        int after = (int)cur - cost[k];
        if (after <= 0) continue;
        if (getf(l, n_idx) >= (uint8_t)after) continue;
        setf(l, n_idx, (uint8_t)after);
        queue_push(&l->q, (uint32_t)n_idx);
    }
}

/* Wrappers so bfs_one_pop's function-pointer signatures line up. */
static uint8_t get_sky_w  (const world_light_t* l, int idx) { return get_sky  (l, idx); }
static uint8_t get_block_w(const world_light_t* l, int idx) { return get_block(l, idx); }
static void    set_sky_w  (world_light_t* l, int idx, uint8_t v) { set_sky  (l, idx, v); }
static void    set_block_w(world_light_t* l, int idx, uint8_t v) { set_block(l, idx, v); }

/* ----------------------------------------------------------------------- */
/* Incremental rebuild (Minecraft-style).
 *
 * For each edited voxel we run a Tomas-Akenine-Mol-style two-pass
 * BFS: a "removal" pass that BFS-clears any light value that was
 * derived from a now-decreased source, then an "addition" pass that
 * re-propagates from remaining sources. This means a single block
 * place / break only touches the cells within at most sky_max steps
 * of the edit, not the whole planet. The full-rebuild path stays as
 * a fallback for the initial world creation and for the queue-
 * overflow case.
 *
 * Queues use the encoding (idx | (old_value << 24)) so the removal
 * pass knows the threshold below which a neighbour was "definitely
 * lit by us"; standard packing matches Minecraft's reference impl. */

static void incremental_pass_for_channel(world_light_t* l, const world_t* w,
                                            const uint32_t* edits, int edit_count,
                                            get_fn_t getf, set_fn_t setf,
                                            int lateral_cost,
                                            int seed_sky_max,
                                            bool channel_is_sky) {
    /* Reuse the persistent queue on the grid. Make sure it's empty
     * so we don't blend with a previous BFS. */
    if (!l->q.buf) queue_init(&l->q, 1024);
    l->q.head = l->q.tail = l->q.count = 0;

    /* Pass 1: removal. Seed with each edited cell's PRIOR value;
     * neighbours strictly less than that prior value were lit BY
     * the edit (they get cleared and queued for further removal),
     * neighbours greater-or-equal are independent sources that get
     * pushed into the addition queue afterwards. */
    int nbrs[MAX_NEIGHBOURS];
    int cost[MAX_NEIGHBOURS];

    for (int i = 0; i < edit_count; ++i) {
        uint32_t idx = edits[i];
        int tile  = (int)idx / WORLD_MAX_DEPTH;
        int depth = (int)idx % WORLD_MAX_DEPTH;
        block_t b = (block_t)w->blocks[(size_t)tile * WORLD_MAX_DEPTH + depth];
        uint8_t old = getf(l, (int)idx);
        /* If the cell is now solid OR was previously a light source
         * and lost its source, its stored value is now stale - clear
         * it. Air-becoming-air is also valid (the BFS will just
         * re-derive the right value during the addition pass). */
        if (block_covers_face(b)) setf(l, (int)idx, 0);
        /* Pack (idx | (old << 24)) for the removal BFS. old <= 15 so
         * the top byte is safe to use. */
        if (old > 0) {
            queue_push(&l->q, idx | ((uint32_t)old << 24));
        } else {
            /* No prior light - go straight to addition with cell +
             * neighbours so light can flow in if the cell opened up. */
            queue_push(&l->q, idx | 0x80000000u);  /* marker bit = "addition" */
        }
    }

    /* Process removal entries. Mixed in with addition markers for
     * cells with no prior light; we route them appropriately.
     *
     * The addition queue lives separately from the BFS queue
     * because Minecraft's algorithm requires the removal frontier
     * fully expand before additions begin. Sizing: a single edit's
     * worst-case cascade visits ~sky_max^3 cells; 1M slots is
     * comfortable for hundreds of simultaneous edits before we'd
     * even consider overflow. The overflow path no longer silently
     * drops pushes - it sets needs_full so the lighting catches up
     * with a full pass instead of leaving cells stuck at sky=0
     * (the user-visible bug: dug-out cells stayed dark forever
     * because the add_q filled before the cell got its post-edit
     * neighbour push). */
    const int add_cap = LIGHT_EDIT_QUEUE_CAP * 128;
    uint32_t* add_q = (uint32_t*)malloc(sizeof(uint32_t) * (size_t)add_cap);
    int       add_head = 0, add_tail = 0;
    if (!add_q) {
        /* OOM is rare on the target but not impossible on a constrained
         * mobile device. Escalate to full rebuild and bail. */
        l->needs_full = true;
        l->dirty      = true;
        return;
    }
    bool overflow = false;
    #define ADD_PUSH(v) do {                                              \
        if (add_tail < add_cap) add_q[add_tail++] = (v);                  \
        else overflow = true;                                             \
    } while (0)

    /* Drain the (mixed) queue into removal work and the addition
     * queue. */
    while (l->q.count > 0) {
        uint32_t packed = queue_pop(&l->q);
        if (packed & 0x80000000u) {
            /* Pre-marked addition entry. Strip marker, push to add_q. */
            ADD_PUSH(packed & 0x7FFFFFFFu);
            continue;
        }
        uint32_t idx = packed & 0x00FFFFFFu;
        uint8_t  old = (uint8_t)((packed >> 24) & 0xFF);
        int tile  = (int)idx / WORLD_MAX_DEPTH;
        int depth = (int)idx % WORLD_MAX_DEPTH;
        int count = voxel_neighbours_with_cost(w, tile, depth, nbrs, cost, lateral_cost);
        for (int k = 0; k < count; ++k) {
            int n_idx = nbrs[k];
            uint8_t n_v = getf(l, n_idx);
            if (n_v == 0) continue;
            if (n_v < old) {
                /* Definitely lit by us - clear + recurse. */
                setf(l, n_idx, 0);
                queue_push(&l->q, (uint32_t)n_idx | ((uint32_t)n_v << 24));
            } else {
                /* Independent source - re-add. */
                ADD_PUSH((uint32_t)n_idx);
            }
        }
        /* Also push the cell itself to addition so it can pull from
         * any neighbour that survived the removal. */
        ADD_PUSH(idx);
    }

    /* Pass 2: addition. For each candidate, compute what its sky
     * SHOULD be from neighbour values + (if applicable) the column-
     * top seed. If the computed value > stored, set it and propagate
     * to neighbours. */
    while (add_head < add_tail) {
        uint32_t idx = add_q[add_head++];
        int tile  = (int)idx / WORLD_MAX_DEPTH;
        int depth = (int)idx % WORLD_MAX_DEPTH;
        block_t b = (block_t)w->blocks[(size_t)tile * WORLD_MAX_DEPTH + depth];
        if (block_covers_face(b)) continue;

        /* Best candidate value: max of neighbour - cost. */
        int count = voxel_neighbours_with_cost(w, tile, depth, nbrs, cost, lateral_cost);
        int best = 0;
        for (int k = 0; k < count; ++k) {
            int n_idx = nbrs[k];
            int v = (int)getf(l, n_idx) - cost[k];
            if (v > best) best = v;
        }
        /* Sky channel only: if this cell sees direct sky (every
         * cell above is non-face-covering), the column-top seed
         * lifts it to sky_max. */
        if (channel_is_sky && seed_sky_max > 0) {
            bool sees_sky = true;
            for (int d = depth + 1; d < WORLD_MAX_DEPTH; ++d) {
                block_t up = (block_t)w->blocks[
                    (size_t)tile * WORLD_MAX_DEPTH + d];
                if (block_covers_face(up)) { sees_sky = false; break; }
            }
            if (sees_sky && best < seed_sky_max) best = seed_sky_max;
        }
        /* Block channel: if this cell hosts a torch, lift `best` to
         * the torch intensity. Without this, a newly-placed torch
         * marked dirty would compute best=0 from its (un-lit)
         * neighbours and stay dark - only the full-rebuild seed
         * phase knew about torches. */
        if (!channel_is_sky && l->torch_count > 0) {
            for (int i = 0; i < l->torch_count; ++i) {
                if (l->torches[i].tile == tile
                    && l->torches[i].depth == depth) {
                    int v = l->torches[i].intensity > 15
                            ? 15 : l->torches[i].intensity;
                    if (v > best) best = v;
                    break;
                }
            }
        }

        if (best > (int)getf(l, (int)idx)) {
            setf(l, (int)idx, (uint8_t)best);
            /* Propagate to neighbours. */
            for (int k = 0; k < count; ++k) {
                int n_idx = nbrs[k];
                block_t nb = (block_t)w->blocks[
                    (size_t)(n_idx / WORLD_MAX_DEPTH) * WORLD_MAX_DEPTH
                    + (n_idx % WORLD_MAX_DEPTH)];
                if (block_covers_face(nb)) continue;
                ADD_PUSH((uint32_t)n_idx);
            }
        }
    }
    free(add_q);
    #undef ADD_PUSH
    if (overflow) {
        /* The incremental pass dropped at least one neighbour push.
         * That cell could now be stuck under-lit, so escalate to a
         * full rebuild next time and let the from-scratch BFS sort
         * it out. */
        l->needs_full = true;
        l->dirty      = true;
    }
}

static void run_incremental_rebuild(world_light_t* l, const world_t* w) {
    if (l->edit_count <= 0) return;
    const lighting_config_t* cfg = config_lighting();
    int lateral_cost = cfg->voxel_sky_lateral_loss;
    if (lateral_cost < 1) lateral_cost = 1;

    /* Snapshot the edit list and clear it - new edits arriving
     * during this pass land in a fresh queue and are processed on
     * the next rebuild call (cheap, the BFS is bounded). */
    int      n = l->edit_count;
    uint32_t edits[LIGHT_EDIT_QUEUE_CAP];
    memcpy(edits, l->edits, (size_t)n * sizeof(uint32_t));
    l->edit_count = 0;

    /* Sky channel. */
    incremental_pass_for_channel(l, w, edits, n,
                                    get_sky_w, set_sky_w,
                                    lateral_cost, cfg->voxel_sky_max,
                                    /* channel_is_sky = */ true);
    /* Block channel - same algorithm with the seed step skipped. */
    incremental_pass_for_channel(l, w, edits, n,
                                    get_block_w, set_block_w,
                                    lateral_cost, /*seed_max=*/0,
                                    /* channel_is_sky = */ false);
}

/* ----------------------------------------------------------------------- */

void world_light_rebuild(world_light_t* l, const world_t* w) {
    if (!l || !w) return;
    if (!l->dirty && l->phase == LR_IDLE) return;

    /* Two distinct paths. The incremental path - the common case
     * once the world has been loaded once - drains the edit queue
     * with a bounded BFS per touched cell. The full path covers
     * the initial create / clone of a world, and the queue-overflow
     * fallback. */
    if (!l->needs_full && l->phase == LR_IDLE && l->edit_count > 0) {
        run_incremental_rebuild(l, w);
        if (l->edit_count == 0 && !l->needs_full) {
            l->dirty = false;
        }
        return;
    }

    const lighting_config_t* cfg = config_lighting();
    int budget = cfg->voxel_rebuild_ops_per_frame;
    if (budget < 1000) budget = 1000;
    int lateral_cost = cfg->voxel_sky_lateral_loss;
    if (lateral_cost < 1) lateral_cost = 1;

    /* Fresh dirty + no in-progress rebuild -> start one. The seed
     * pass runs in this same call (NOT budgeted): a column-seed is
     * a linear walk with at most WORLD_MAX_DEPTH=128 writes, so the
     * whole planet's seed costs roughly tile_count * 128 memory
     * stores which is bounded and fast (~50 ms worst case on the
     * largest baseline). Budgeting the seed turned out worse than
     * the stall it tried to avoid: an in-progress seed left most
     * columns at sky=0 from the memset, which looked like the
     * world had gone dark. The BFS is still budgeted - that's
     * where the real cost lives and where the per-frame yield
     * actually matters.
     *
     * The block-seed phase is also tiny (torch_count entries
     * total) so it runs in one shot alongside the sky seed. */
    if (l->phase == LR_IDLE) {
        memset(l->nibbles, 0, (size_t)(l->tile_count * l->depth));
        if (!l->q.buf) queue_init(&l->q, l->tile_count * 4);
        else { l->q.head = l->q.tail = l->q.count = 0; }
        l->torch_seed_cursor = 0;
        l->restart_pending = false;
        /* One-shot sky seed. Walks every column once; cells above
         * the first face-covering block get sky_max and land in
         * the BFS queue. */
        if (cfg->voxel_sky_max > 0) {
            for (int t = 0; t < w->tile_count; ++t) {
                sky_seed_one_column(l, w, t, cfg->voxel_sky_max);
            }
        }
        l->phase = LR_SKY_BFS;
    }

    while (budget > 0) {
        if (l->phase == LR_SKY_BFS) {
            if (l->q.count == 0) {
                l->phase = LR_BLOCK_SEED;
                continue;
            }
            bfs_one_pop(l, w, get_sky_w, set_sky_w, lateral_cost);
            --budget;
        } else if (l->phase == LR_BLOCK_SEED) {
            if (l->torch_count <= 0
                || l->torch_seed_cursor >= l->torch_count) {
                l->phase = LR_BLOCK_BFS;
                continue;
            }
            const world_light_torch_t* s = &l->torches[l->torch_seed_cursor];
            ++l->torch_seed_cursor;
            if (s->tile < 0 || s->tile >= w->tile_count) continue;
            if (s->depth < 0 || s->depth >= WORLD_MAX_DEPTH) continue;
            if (s->intensity == 0) continue;
            int idx = voxel_index(s->tile, s->depth);
            uint8_t cur = get_block(l, idx);
            uint8_t v   = s->intensity > 15 ? 15 : s->intensity;
            if (v > cur) {
                set_block(l, idx, v);
                queue_push(&l->q, (uint32_t)idx);
            }
            --budget;
        } else if (l->phase == LR_BLOCK_BFS) {
            if (l->q.count == 0) {
                /* Done. The full pass is complete - subsequent edits
                 * route through the incremental path until something
                 * forces another full rebuild (clone, overflow). If
                 * an edit landed mid-rebuild it sets restart_pending
                 * + dirty so the next call kicks again, but uses
                 * incremental (the edits live in the per-cell queue
                 * if needs_full wasn't forced). */
                l->phase      = LR_IDLE;
                /* Only clear needs_full + dirty when nothing else is
                 * pending. If an edit landed mid-rebuild (restart_pending)
                 * OR per-cell edits queued up while we were running,
                 * keep going - the next call resolves them. needs_full
                 * stays true if it was set during the current pass
                 * (overflow case) so the next pass re-seeds with the
                 * latest world state. */
                if (l->restart_pending || l->edit_count > 0) {
                    l->restart_pending = false;
                    l->dirty           = true;
                    /* needs_full preserved if still set - the next
                     * call will run another full pass instead of an
                     * incremental that misses the seed-time
                     * block changes. */
                } else {
                    l->dirty      = false;
                    l->needs_full = false;
                }
                return;
            }
            /* Block-light lateral attenuation matches sky: torches in
             * a deep room shouldn't leak through a single voxel of
             * stone in a way that beats their per-step cost. */
            bfs_one_pop(l, w, get_block_w, set_block_w, lateral_cost);
            --budget;
        } else {
            /* Unreachable - paranoia recover. */
            l->phase = LR_IDLE;
            l->dirty = false;
            return;
        }
    }
    /* Budget ran out mid-pass. Leave the grid + queue in place; the
     * next call to world_light_rebuild picks up where we stopped. The
     * mesher samples the partially-built grid in the meantime, which
     * shows up as light "ripple in" rather than a frame stall. */
}

/* ----------------------------------------------------------------------- */

uint8_t world_light_sky(const world_light_t* l, int tile, int depth) {
    if (!l) return 0;
    if (tile  < 0 || tile  >= l->tile_count)  return 0;
    if (depth < 0 || depth >= WORLD_MAX_DEPTH) return 0;
    return get_sky(l, voxel_index(tile, depth));
}

uint8_t world_light_block(const world_light_t* l, int tile, int depth) {
    if (!l) return 0;
    if (tile  < 0 || tile  >= l->tile_count)  return 0;
    if (depth < 0 || depth >= WORLD_MAX_DEPTH) return 0;
    return get_block(l, voxel_index(tile, depth));
}
