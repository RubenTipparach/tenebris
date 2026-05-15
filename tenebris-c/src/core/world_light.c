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

struct world_light_s {
    int        tile_count;
    int        depth;            /* always WORLD_MAX_DEPTH; cached     */
    uint8_t*   nibbles;          /* size tile_count * depth            */
    bool       dirty;

    world_light_torch_t* torches;
    int                  torch_count;
    int                  torch_cap;
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
    return l;
}

void world_light_destroy(world_light_t* l) {
    if (!l) return;
    free(l->nibbles);
    free(l->torches);
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
}

void world_light_mark_dirty(world_light_t* l) {
    if (l) l->dirty = true;
}
bool world_light_is_dirty(const world_light_t* l) {
    return l ? l->dirty : false;
}

void world_light_set_torches(world_light_t* l,
                             const world_light_torch_t* sources,
                             int count) {
    if (!l) return;
    if (count < 0) count = 0;
    if (count > l->torch_cap) {
        free(l->torches);
        l->torch_cap = count > 16 ? count : 16;
        l->torches   = (world_light_torch_t*)calloc((size_t)l->torch_cap,
                                                    sizeof(world_light_torch_t));
    }
    if (count > 0 && sources) {
        memcpy(l->torches, sources, (size_t)count * sizeof(world_light_torch_t));
    }
    l->torch_count = count;
    l->dirty = true;
}

/* ----------------------------------------------------------------------- */
/* Queue. Ring buffer of flat voxel indices. Grows on overflow.
 * Allocated per rebuild — keeps the rebuild self-contained and
 * pays a single malloc / free per relight. */

typedef struct {
    uint32_t* buf;
    int       head;     /* next to pop  */
    int       tail;     /* next to push */
    int       cap;
    int       count;
} queue_t;

static void queue_init(queue_t* q, int initial_cap) {
    q->cap   = initial_cap > 64 ? initial_cap : 64;
    q->buf   = (uint32_t*)malloc((size_t)q->cap * sizeof(uint32_t));
    q->head  = 0;
    q->tail  = 0;
    q->count = 0;
}
static void queue_free(queue_t* q) { free(q->buf); q->buf = NULL; }

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

static int voxel_neighbours(const world_t* w, int tile, int depth, int out[MAX_NEIGHBOURS]) {
    int n = 0;
    const goldberg_tile_t* t = goldberg_tile(w->grid, tile);
    if (!t) return 0;
    for (int i = 0; i < t->num_neighbors; ++i) {
        int nb = t->neighbors[i];
        if (nb >= 0 && nb < w->tile_count) {
            out[n++] = voxel_index(nb, depth);
        }
    }
    if (depth + 1 < WORLD_MAX_DEPTH) out[n++] = voxel_index(tile, depth + 1);
    if (depth - 1 >= 0)              out[n++] = voxel_index(tile, depth - 1);
    return n;
}

/* ----------------------------------------------------------------------- */
/* Sky pass.
 *
 * Seeding: from each column's top, walk downward through any voxel
 * whose block does not cover its face (air, water, ice, wood, leaves);
 * seed sky = sky_max at each. The block_covers_face rule matches the
 * mesher's existing column-mode behaviour - a tree trunk over a tile
 * does not blot out the column below.
 *
 * Propagation: BFS with -1 per step in every direction. No special-
 * casing in the BFS itself: the "shafts of daylight" effect is already
 * carried by the seeding pass continuing straight down through air. */

static void sky_seed_and_propagate(world_light_t* l, const world_t* w, int sky_max) {
    if (sky_max <= 0) return;
    queue_t q;
    queue_init(&q, w->tile_count * 4);

    /* Seed pass. */
    for (int tile = 0; tile < w->tile_count; ++tile) {
        const uint8_t* col = &w->blocks[tile * WORLD_MAX_DEPTH];
        for (int d = WORLD_MAX_DEPTH - 1; d >= 0; --d) {
            block_t b = (block_t)col[d];
            if (block_covers_face(b)) break;
            int idx = voxel_index(tile, d);
            set_sky(l, idx, (uint8_t)sky_max);
            queue_push(&q, (uint32_t)idx);
        }
    }

    /* BFS. */
    int nbrs[MAX_NEIGHBOURS];
    while (q.count > 0) {
        uint32_t idx = queue_pop(&q);
        int tile  = (int)idx / WORLD_MAX_DEPTH;
        int depth = (int)idx % WORLD_MAX_DEPTH;
        uint8_t cur = get_sky(l, (int)idx);
        if (cur <= 1) continue;
        uint8_t pass = (uint8_t)(cur - 1);

        int count = voxel_neighbours(w, tile, depth, nbrs);
        for (int k = 0; k < count; ++k) {
            int n_idx = nbrs[k];
            int n_tile  = n_idx / WORLD_MAX_DEPTH;
            int n_depth = n_idx % WORLD_MAX_DEPTH;
            block_t nb = (block_t)w->blocks[n_tile * WORLD_MAX_DEPTH + n_depth];
            if (block_covers_face(nb)) continue;
            if (get_sky(l, n_idx) >= pass) continue;
            set_sky(l, n_idx, pass);
            queue_push(&q, (uint32_t)n_idx);
        }
    }

    queue_free(&q);
}

/* ----------------------------------------------------------------------- */
/* Block pass. Each torch source seeds its anchor voxel; standard BFS
 * with -1 per step through non-face-covering blocks. */

static void block_seed_and_propagate(world_light_t* l, const world_t* w) {
    if (l->torch_count <= 0) return;
    queue_t q;
    queue_init(&q, l->torch_count * 8 + 64);

    for (int i = 0; i < l->torch_count; ++i) {
        const world_light_torch_t* s = &l->torches[i];
        if (s->tile  < 0 || s->tile  >= w->tile_count)  continue;
        if (s->depth < 0 || s->depth >= WORLD_MAX_DEPTH) continue;
        if (s->intensity == 0) continue;
        int idx = voxel_index(s->tile, s->depth);
        uint8_t cur = get_block(l, idx);
        uint8_t v   = s->intensity > 15 ? 15 : s->intensity;
        if (v > cur) {
            set_block(l, idx, v);
            queue_push(&q, (uint32_t)idx);
        }
    }

    int nbrs[MAX_NEIGHBOURS];
    while (q.count > 0) {
        uint32_t idx = queue_pop(&q);
        int tile  = (int)idx / WORLD_MAX_DEPTH;
        int depth = (int)idx % WORLD_MAX_DEPTH;
        uint8_t cur = get_block(l, (int)idx);
        if (cur <= 1) continue;
        uint8_t pass = (uint8_t)(cur - 1);

        int count = voxel_neighbours(w, tile, depth, nbrs);
        for (int k = 0; k < count; ++k) {
            int n_idx = nbrs[k];
            int n_tile  = n_idx / WORLD_MAX_DEPTH;
            int n_depth = n_idx % WORLD_MAX_DEPTH;
            block_t nb = (block_t)w->blocks[n_tile * WORLD_MAX_DEPTH + n_depth];
            if (block_covers_face(nb)) continue;
            if (get_block(l, n_idx) >= pass) continue;
            set_block(l, n_idx, pass);
            queue_push(&q, (uint32_t)n_idx);
        }
    }

    queue_free(&q);
}

/* ----------------------------------------------------------------------- */

void world_light_rebuild(world_light_t* l, const world_t* w) {
    if (!l || !w) return;
    memset(l->nibbles, 0, (size_t)(l->tile_count * l->depth));

    const lighting_config_t* cfg = config_lighting();
    sky_seed_and_propagate(l, w, cfg->voxel_sky_max);
    block_seed_and_propagate(l, w);

    l->dirty = false;
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
