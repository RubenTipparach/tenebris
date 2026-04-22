#include "core/hex_pool.h"
#include "core/planet_gen.h"
#include <math.h>
#include <string.h>

/* ----------------------------------------------------------------------- */

void hex_pool_init(hex_pool_t* p, const body_config_t* body) {
    memset(p, 0, sizeof(*p));
    p->body = body;
    for (int i = 0; i < HEX_POOL_COUNT; ++i) hex_chunk_init(&p->chunks[i]);
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

    /* (Re)activate the grid centered at the new anchor. */
    int idx = 0;
    for (int dy = -HEX_POOL_RADIUS; dy <= HEX_POOL_RADIUS; ++dy) {
        for (int dx = -HEX_POOL_RADIUS; dx <= HEX_POOL_RADIUS; ++dx) {
            hex_chunk_t* c = &p->chunks[idx++];
            hex_chunk_deactivate(c);
            hex_chunk_activate(c, dx, dy);
            fill_chunk(p, c);
        }
    }
}

void hex_pool_update(hex_pool_t* p, dvec3_t player_world) {
    if (!p->anchored) { anchor_at(p, player_world); return; }
    dvec3_t drift = dvec3_sub(player_world, p->anchor_world);
    /* Project drift onto the tangent plane. Radial drift shouldn't
     * trigger a re-anchor on its own. */
    double drift_t = dvec3_length(drift);
    if (drift_t > (double)HEX_POOL_REANCHOR_M) anchor_at(p, player_world);
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
