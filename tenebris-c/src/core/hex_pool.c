#include "core/hex_pool.h"
#include "core/planet_gen.h"
#include <math.h>
#include <string.h>

/* ----------------------------------------------------------------------- */

void hex_pool_init(hex_pool_t* p, const body_config_t* body) {
    memset(p, 0, sizeof(*p));
    p->body = body;
    for (int i = 0; i < HEX_POOL_COUNT; ++i) hex_chunk_init(&p->chunks[i]);
    for (int i = 0; i < HEX_POOL_SIDE; ++i)
        for (int j = 0; j < HEX_POOL_SIDE; ++j)
            p->chunk_lookup[i][j] = -1;
}

void hex_pool_shutdown(hex_pool_t* p) {
    /* Voxel buffers freed by the hex_chunk API on shutdown — but we
     * didn't add that yet (pool never shrinks in Tier 1). Left as a
     * memory leak on shutdown for now; Tier 2 adds hex_chunk_free. */
    (void)p;
}

/* ----------------------------------------------------------------------- */

dvec3_t hex_pool_chunk_origin_world(const hex_pool_t* p, const hex_chunk_t* c) {
    double tx = (double)c->cx * (double)HEX_CHUNK_WIDTH_M;
    double ty = (double)c->cy * (double)HEX_CHUNK_DEPTH_M;
    dvec3_t offs = dvec3_add(dvec3_scale(p->basis.right, tx),
                             dvec3_scale(p->basis.fwd,   ty));
    return dvec3_add(p->anchor_world, offs);
}

/* Local tangent-plane coords for a hex column inside a chunk. Pointy-top
 * tiling with odd-row horizontal offset. */
static void hex_local_xy(int col, int row, float* out_x, float* out_y) {
    const float rx = (float)col * HEX_DX + ((row & 1) ? (HEX_DX * 0.5f) : 0.0f);
    const float ry = (float)row * HEX_DY;
    *out_x = rx;
    *out_y = ry;
}

dvec3_t hex_pool_voxel_world(const hex_pool_t* p, const hex_chunk_t* c,
                             int col, int row, int layer) {
    float lx, ly;
    hex_local_xy(col, row, &lx, &ly);

    dvec3_t chunk_origin = hex_pool_chunk_origin_world(p, c);
    dvec3_t tangent = dvec3_add(dvec3_scale(p->basis.right, lx),
                                dvec3_scale(p->basis.fwd,   ly));
    /* Layer 0 is HEX_BASE_PADDING meters below the surface. */
    const float altitude = (float)(layer - HEX_BASE_PADDING) * HEX_HEIGHT;
    dvec3_t radial = dvec3_scale(p->basis.up, (double)altitude);
    return dvec3_add(dvec3_add(chunk_origin, tangent), radial);
}

/* ----------------------------------------------------------------------- */

static void fill_chunk(hex_pool_t* p, hex_chunk_t* c) {
    for (int row = 0; row < HEX_ROWS; ++row) {
        for (int col = 0; col < HEX_COLS; ++col) {
            float lx, ly;
            hex_local_xy(col, row, &lx, &ly);

            /* Column position in world space = anchor + chunk offset +
             * in-chunk tangent offset. Normalize to get its direction
             * on the unit sphere; noise is sampled at that direction so
             * terrain is continuous across chunk seams. */
            const double total_x = (double)c->cx * (double)HEX_CHUNK_WIDTH_M + (double)lx;
            const double total_y = (double)c->cy * (double)HEX_CHUNK_DEPTH_M + (double)ly;
            dvec3_t total_tan = dvec3_add(dvec3_scale(p->basis.right, total_x),
                                          dvec3_scale(p->basis.fwd,   total_y));
            dvec3_t col_dir   = dvec3_normalize(dvec3_add(p->anchor_world, total_tan));

            const float surface_m = planet_surface_altitude(p->body, col_dir);

            int col_idx = col * HEX_ROWS + row;
            int min_s = HEX_LAYERS;
            int max_s = -1;

            for (int layer = 0; layer < HEX_LAYERS; ++layer) {
                const float altitude_m = (float)(layer - HEX_BASE_PADDING) * HEX_HEIGHT;
                block_t b;
                if (layer < HEX_BEDROCK)              b = BLOCK_STONE;
                else if (altitude_m > surface_m)      b = BLOCK_AIR;
                else if (altitude_m > surface_m - 1)  b = BLOCK_GRASS;
                else if (altitude_m > surface_m - 4)  b = BLOCK_DIRT;
                else                                   b = BLOCK_STONE;

                c->voxels[HEX_VOXEL_INDEX(col, row, layer)] = (uint8_t)b;
                if (b != BLOCK_AIR) {
                    if (layer < min_s) min_s = layer;
                    if (layer > max_s) max_s = layer;
                }
            }
            c->col_min_solid[col_idx] = (int16_t)min_s;
            c->col_max_solid[col_idx] = (int16_t)max_s;
        }
    }
    c->dirty = true;
}

/* ----------------------------------------------------------------------- */

static void anchor_at(hex_pool_t* p, dvec3_t player_world) {
    p->anchor_dir   = dvec3_normalize(player_world);
    p->anchor_world = dvec3_scale(p->anchor_dir, p->body->radius_m);
    p->basis        = phys_tangent_basis(p->anchor_dir);
    p->anchored     = true;

    /* (Re)activate the grid centered at the new anchor. Chunks are
     * marked pending_fill — actual terrain generation is streamed
     * across subsequent hex_pool_update calls (HEX_POOL_FILL_BUDGET
     * per frame). */
    int idx = 0;
    for (int dy = -HEX_POOL_RADIUS; dy <= HEX_POOL_RADIUS; ++dy) {
        for (int dx = -HEX_POOL_RADIUS; dx <= HEX_POOL_RADIUS; ++dx) {
            hex_chunk_t* c = &p->chunks[idx];
            hex_chunk_deactivate(c);
            hex_chunk_activate(c, dx, dy);
            p->chunk_lookup[dx + HEX_POOL_RADIUS][dy + HEX_POOL_RADIUS] = idx;
            idx++;
        }
    }
}

/* Pick the pending chunk whose center is closest to the player and
 * fill it; do this up to HEX_POOL_FILL_BUDGET times per call. */
static void process_pending_fills(hex_pool_t* p, dvec3_t player_world) {
    for (int n = 0; n < HEX_POOL_FILL_BUDGET; ++n) {
        int best = -1;
        double best_d2 = 1e300;
        for (int i = 0; i < HEX_POOL_COUNT; ++i) {
            hex_chunk_t* c = &p->chunks[i];
            if (!c->active || !c->pending_fill) continue;
            dvec3_t co = hex_pool_chunk_origin_world(p, c);
            dvec3_t d  = dvec3_sub(co, player_world);
            double d2  = dvec3_dot(d, d);
            if (d2 < best_d2) { best_d2 = d2; best = i; }
        }
        if (best < 0) return;
        hex_chunk_t* c = &p->chunks[best];
        fill_chunk(p, c);
        c->pending_fill = false;
    }
}

void hex_pool_update(hex_pool_t* p, dvec3_t player_world) {
    if (!p->anchored) {
        anchor_at(p, player_world);
        process_pending_fills(p, player_world);
        return;
    }
    dvec3_t drift = dvec3_sub(player_world, p->anchor_world);
    double drift_t = dvec3_length(drift);
    if (drift_t > (double)HEX_POOL_REANCHOR_M) anchor_at(p, player_world);
    process_pending_fills(p, player_world);
}

int hex_pool_pending_count(const hex_pool_t* p) {
    int n = 0;
    for (int i = 0; i < HEX_POOL_COUNT; ++i)
        if (p->chunks[i].active && p->chunks[i].pending_fill) ++n;
    return n;
}

int hex_pool_active_count(const hex_pool_t* p) {
    int n = 0;
    for (int i = 0; i < HEX_POOL_COUNT; ++i) if (p->chunks[i].active) ++n;
    return n;
}

const hex_chunk_t* hex_pool_chunk_at(const hex_pool_t* p, int index) {
    if (index < 0 || index >= HEX_POOL_COUNT) return NULL;
    return &p->chunks[index];
}

const hex_chunk_t* hex_pool_chunk_by_coord(const hex_pool_t* p, int32_t cx, int32_t cy) {
    const int ix = cx + HEX_POOL_RADIUS;
    const int iy = cy + HEX_POOL_RADIUS;
    if (ix < 0 || ix >= HEX_POOL_SIDE || iy < 0 || iy >= HEX_POOL_SIDE) return NULL;
    int idx = p->chunk_lookup[ix][iy];
    if (idx < 0) return NULL;
    const hex_chunk_t* c = &p->chunks[idx];
    return c->active ? c : NULL;
}

/* ----------------------------------------------------------------------- */

bool hex_pool_world_to_coords(const hex_pool_t* p, dvec3_t world,
                              int32_t* out_cx, int32_t* out_cy,
                              int* out_col, int* out_row, int* out_layer) {
    dvec3_t delta = dvec3_sub(world, p->anchor_world);
    double tx = dvec3_dot(delta, p->basis.right);
    double ty = dvec3_dot(delta, p->basis.fwd);
    double tu = dvec3_dot(delta, p->basis.up);   /* radial offset */

    int32_t cx = (int32_t)floor(tx / (double)HEX_CHUNK_WIDTH_M);
    int32_t cy = (int32_t)floor(ty / (double)HEX_CHUNK_DEPTH_M);

    double lx = tx - (double)cx * (double)HEX_CHUNK_WIDTH_M;
    double ly = ty - (double)cy * (double)HEX_CHUNK_DEPTH_M;
    int row = (int)floor(ly / (double)HEX_DY + 0.5);
    if (row < 0) row = 0; else if (row >= HEX_ROWS) row = HEX_ROWS - 1;
    double odd_off = (row & 1) ? (HEX_DX * 0.5) : 0.0;
    int col = (int)floor((lx - odd_off) / (double)HEX_DX + 0.5);
    if (col < 0) col = 0; else if (col >= HEX_COLS) col = HEX_COLS - 1;

    int layer = (int)floor(tu / (double)HEX_HEIGHT) + HEX_BASE_PADDING;
    if (layer < 0) layer = 0;
    if (layer >= HEX_LAYERS) layer = HEX_LAYERS - 1;

    const hex_chunk_t* c = hex_pool_chunk_by_coord(p, cx, cy);
    if (!c || c->pending_fill) return false;

    *out_cx = cx; *out_cy = cy;
    *out_col = col; *out_row = row; *out_layer = layer;
    return true;
}

/* Fixed-step DDA on a hex grid is awkward (hex-cell Voronoi boundaries
 * aren't axis-aligned), so Tier 1 uses a small-step sample. Step size is
 * a third of HEX_RADIUS so we don't miss single-voxel walls. Good enough
 * for the short (<20 m) interaction raycast; a proper hex DDA is Tier 2.
 */
#define RAYCAST_STEP (HEX_RADIUS * 0.33f)

hex_ray_hit_t hex_pool_raycast(const hex_pool_t* p, dvec3_t origin,
                               dvec3_t dir_unit, double max_dist) {
    hex_ray_hit_t h = (hex_ray_hit_t){ .has_hit = false };
    int32_t prev_cx = 0, prev_cy = 0;
    int prev_col = 0, prev_row = 0, prev_layer = 0;
    bool prev_valid = false;

    for (double d = 0.0; d <= max_dist; d += (double)RAYCAST_STEP) {
        dvec3_t cur = dvec3_add(origin, dvec3_scale(dir_unit, d));
        int32_t cx, cy; int col, row, layer;
        if (!hex_pool_world_to_coords(p, cur, &cx, &cy, &col, &row, &layer)) continue;

        const hex_chunk_t* c = hex_pool_chunk_by_coord(p, cx, cy);
        if (!c || c->pending_fill) { prev_valid = false; continue; }

        block_t b = (block_t)c->voxels[HEX_VOXEL_INDEX(col, row, layer)];
        if (block_is_solid(b)) {
            if (!prev_valid) return h;   /* started inside solid — ignore */
            h.has_hit     = true;
            h.hit_cx      = cx; h.hit_cy = cy;
            h.hit_col     = col; h.hit_row = row; h.hit_layer = layer;
            h.place_cx    = prev_cx; h.place_cy = prev_cy;
            h.place_col   = prev_col; h.place_row = prev_row; h.place_layer = prev_layer;
            h.distance    = d;
            return h;
        }
        prev_cx = cx; prev_cy = cy;
        prev_col = col; prev_row = row; prev_layer = layer;
        prev_valid = true;
    }
    return h;
}

/* ----------------------------------------------------------------------- */

static void rebuild_chunk_caches_at(hex_chunk_t* c, int col, int row) {
    int mn = HEX_LAYERS, mx = -1;
    for (int layer = 0; layer < HEX_LAYERS; ++layer) {
        uint8_t b = c->voxels[HEX_VOXEL_INDEX(col, row, layer)];
        if (b == BLOCK_AIR) continue;
        if (layer < mn) mn = layer;
        if (layer > mx) mx = layer;
    }
    int idx = col * HEX_ROWS + row;
    c->col_min_solid[idx] = (int16_t)mn;
    c->col_max_solid[idx] = (int16_t)mx;
}

bool hex_pool_set_voxel(hex_pool_t* p, int32_t cx, int32_t cy,
                        int col, int row, int layer, uint8_t block) {
    const int ix = cx + HEX_POOL_RADIUS;
    const int iy = cy + HEX_POOL_RADIUS;
    if (ix < 0 || ix >= HEX_POOL_SIDE || iy < 0 || iy >= HEX_POOL_SIDE) return false;
    int idx = p->chunk_lookup[ix][iy];
    if (idx < 0) return false;
    hex_chunk_t* c = &p->chunks[idx];
    if (!c->active || c->pending_fill) return false;
    if (col < 0 || col >= HEX_COLS || row < 0 || row >= HEX_ROWS) return false;
    if (layer < 0 || layer >= HEX_LAYERS) return false;

    c->voxels[HEX_VOXEL_INDEX(col, row, layer)] = block;
    rebuild_chunk_caches_at(c, col, row);
    c->dirty = true;

    /* Mark neighbor chunks dirty so seam faces redraw if the edit was
     * on an edge cell. */
    if (col == 0) {
        const hex_chunk_t* nb = hex_pool_chunk_by_coord(p, cx - 1, cy);
        if (nb) ((hex_chunk_t*)nb)->dirty = true;
    }
    if (col == HEX_COLS - 1) {
        const hex_chunk_t* nb = hex_pool_chunk_by_coord(p, cx + 1, cy);
        if (nb) ((hex_chunk_t*)nb)->dirty = true;
    }
    if (row == 0) {
        const hex_chunk_t* nb = hex_pool_chunk_by_coord(p, cx, cy - 1);
        if (nb) ((hex_chunk_t*)nb)->dirty = true;
    }
    if (row == HEX_ROWS - 1) {
        const hex_chunk_t* nb = hex_pool_chunk_by_coord(p, cx, cy + 1);
        if (nb) ((hex_chunk_t*)nb)->dirty = true;
    }
    return true;
}
