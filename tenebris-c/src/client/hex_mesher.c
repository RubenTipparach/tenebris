#include "client/hex_mesher.h"
#include "core/blocks.h"
#include <math.h>
#include <stdlib.h>
#include <string.h>

/* ----------------------------------------------------------------------- */
/* Pointy-top hex vertex offsets from the column center (in the tangent
 * plane). Order: starting at the "east" edge and going CCW.
 *
 * Vertex angles for pointy-top hex: 30, 90, 150, 210, 270, 330 degrees.
 */
static const float HEX_VX[6][2] = {
    {  HEX_SQRT3 * 0.5f * HEX_RADIUS,  HEX_RADIUS * 0.5f },   /*  30 deg */
    {  0.0f,                           HEX_RADIUS       },    /*  90 deg */
    { -HEX_SQRT3 * 0.5f * HEX_RADIUS,  HEX_RADIUS * 0.5f },   /* 150 deg */
    { -HEX_SQRT3 * 0.5f * HEX_RADIUS, -HEX_RADIUS * 0.5f },   /* 210 deg */
    {  0.0f,                          -HEX_RADIUS       },    /* 270 deg */
    {  HEX_SQRT3 * 0.5f * HEX_RADIUS, -HEX_RADIUS * 0.5f },   /* 330 deg */
};

/* Pointy-top hex neighbor offsets in (col_offset_even, col_offset_odd, row_offset)
 * for the 6 flat-edge neighbors. The col offset differs by row parity. */
static const int HEX_NEIGHBOR_EVEN[6][2] = {
    { +1,  0}, { 0, +1}, {-1, +1}, {-1,  0}, {-1, -1}, { 0, -1},
};
static const int HEX_NEIGHBOR_ODD[6][2] = {
    { +1,  0}, {+1, +1}, { 0, +1}, {-1,  0}, { 0, -1}, {+1, -1},
};

/* ----------------------------------------------------------------------- */

static void reserve(hex_mesh_t* m, size_t add_v, size_t add_i) {
    if (m->vertex_count + add_v > m->vertex_cap) {
        size_t cap = m->vertex_cap ? m->vertex_cap : 4096;
        while (cap < m->vertex_count + add_v) cap *= 2;
        m->vertices = (hex_vertex_t*)realloc(m->vertices, cap * sizeof(hex_vertex_t));
        m->vertex_cap = cap;
    }
    if (m->index_count + add_i > m->index_cap) {
        size_t cap = m->index_cap ? m->index_cap : 8192;
        while (cap < m->index_count + add_i) cap *= 2;
        m->indices = (uint32_t*)realloc(m->indices, cap * sizeof(uint32_t));
        m->index_cap = cap;
    }
}

void hex_mesh_init(hex_mesh_t* m) { memset(m, 0, sizeof(*m)); }
void hex_mesh_reset(hex_mesh_t* m) { m->vertex_count = 0; m->index_count = 0; }
void hex_mesh_free(hex_mesh_t* m) {
    free(m->vertices); free(m->indices); memset(m, 0, sizeof(*m));
}

/* ----------------------------------------------------------------------- */

static void block_color(block_t b, float out[3]) {
    /* Tier 1 placeholder palette. Atlas textures replace this in the
     * next commit; for now each block type has a distinct flat color
     * so we can visually validate the mesher. */
    switch (b) {
        case BLOCK_GRASS:  out[0]=0.36f; out[1]=0.70f; out[2]=0.24f; break;
        case BLOCK_DIRT:   out[0]=0.54f; out[1]=0.37f; out[2]=0.22f; break;
        case BLOCK_STONE:  out[0]=0.55f; out[1]=0.55f; out[2]=0.58f; break;
        case BLOCK_SAND:   out[0]=0.93f; out[1]=0.85f; out[2]=0.55f; break;
        case BLOCK_WATER:  out[0]=0.20f; out[1]=0.45f; out[2]=0.75f; break;
        case BLOCK_ICE:    out[0]=0.75f; out[1]=0.88f; out[2]=0.95f; break;
        case BLOCK_SNOW:   out[0]=0.95f; out[1]=0.95f; out[2]=0.97f; break;
        default:           out[0]=1.00f; out[1]=0.20f; out[2]=0.80f; break;   /* error pink */
    }
}

/* Look up a block across potential chunk boundaries. Returns AIR when
 * the neighbor is out of the active pool (don't draw faces toward
 * unknown territory - avoids flashing chunk seams during streaming).
 *
 * O(1) per call via hex_pool_chunk_by_coord; called ~6x per exposed
 * voxel face so the linear scan this replaced was the mesher's worst
 * hot spot at 81 active chunks. */
static block_t sample_neighbor(const hex_pool_t* pool, int32_t cx, int32_t cy,
                               int ncol, int nrow, int nlayer) {
    if (nlayer < 0 || nlayer >= HEX_LAYERS) return BLOCK_AIR;

    while (ncol < 0)         { ncol += HEX_COLS; cx -= 1; }
    while (ncol >= HEX_COLS) { ncol -= HEX_COLS; cx += 1; }
    while (nrow < 0)         { nrow += HEX_ROWS; cy -= 1; }
    while (nrow >= HEX_ROWS) { nrow -= HEX_ROWS; cy += 1; }

    const hex_chunk_t* c = hex_pool_chunk_by_coord(pool, cx, cy);
    if (!c || c->pending_fill) return BLOCK_AIR;
    return (block_t)c->voxels[HEX_VOXEL_INDEX(ncol, nrow, nlayer)];
}

/* ----------------------------------------------------------------------- */

static void emit_tri(hex_mesh_t* m,
                     dvec3_t p0, dvec3_t p1, dvec3_t p2,
                     dvec3_t normal, const float color[3]) {
    reserve(m, 3, 3);
    uint32_t base = (uint32_t)m->vertex_count;
    dvec3_t verts[3] = { p0, p1, p2 };
    for (int i = 0; i < 3; ++i) {
        hex_vertex_t* v = &m->vertices[m->vertex_count++];
        v->pos[0] = (float)verts[i].x; v->pos[1] = (float)verts[i].y; v->pos[2] = (float)verts[i].z;
        v->normal[0] = (float)normal.x; v->normal[1] = (float)normal.y; v->normal[2] = (float)normal.z;
        v->color[0] = color[0]; v->color[1] = color[1]; v->color[2] = color[2];
        v->_pad[0] = v->_pad[1] = v->_pad[2] = v->_pad[3] = 0;
    }
    m->indices[m->index_count++] = base + 0;
    m->indices[m->index_count++] = base + 1;
    m->indices[m->index_count++] = base + 2;
}

/* ----------------------------------------------------------------------- */

void hex_mesh_build_chunk(hex_mesh_t* out, const hex_pool_t* pool,
                          const hex_chunk_t* c, dvec3_t floating_origin) {
    if (!c->active || !c->voxels) return;

    dvec3_t up    = pool->basis.up;
    dvec3_t right = pool->basis.right;
    dvec3_t fwd   = pool->basis.fwd;
    dvec3_t chunk_origin = hex_pool_chunk_origin_world(pool, c);

    for (int col = 0; col < HEX_COLS; ++col) {
        for (int row = 0; row < HEX_ROWS; ++row) {
            const int col_idx = col * HEX_ROWS + row;
            const int mn = c->col_min_solid[col_idx];
            const int mx = c->col_max_solid[col_idx];
            if (mx < mn) continue;       /* column is all air */

            /* Tangent-plane center of this column. */
            const float cx_t = (float)col * HEX_DX + ((row & 1) ? (HEX_DX * 0.5f) : 0.0f);
            const float cy_t = (float)row * HEX_DY;
            dvec3_t center_tan = dvec3_add(dvec3_scale(right, cx_t),
                                           dvec3_scale(fwd, cy_t));
            dvec3_t col_origin = dvec3_add(chunk_origin, center_tan);

            const int (*nbr)[2] = (row & 1) ? HEX_NEIGHBOR_ODD : HEX_NEIGHBOR_EVEN;

            for (int layer = mn; layer <= mx; ++layer) {
                const uint8_t bid = c->voxels[HEX_VOXEL_INDEX(col, row, layer)];
                if (bid == BLOCK_AIR) continue;
                float color[3]; block_color((block_t)bid, color);

                const float lo = (float)(layer - HEX_BASE_PADDING)     * HEX_HEIGHT;
                const float hi = (float)(layer - HEX_BASE_PADDING + 1) * HEX_HEIGHT;
                dvec3_t base_lo = dvec3_add(col_origin, dvec3_scale(up, (double)lo));
                dvec3_t base_hi = dvec3_add(col_origin, dvec3_scale(up, (double)hi));

                /* Ring of 6 hex corner offsets (tangent-plane). */
                dvec3_t corners_lo[6], corners_hi[6];
                for (int k = 0; k < 6; ++k) {
                    dvec3_t t = dvec3_add(dvec3_scale(right, (double)HEX_VX[k][0]),
                                          dvec3_scale(fwd,   (double)HEX_VX[k][1]));
                    corners_lo[k] = dvec3_sub(dvec3_add(base_lo, t), floating_origin);
                    corners_hi[k] = dvec3_sub(dvec3_add(base_hi, t), floating_origin);
                }
                dvec3_t center_lo_fo = dvec3_sub(base_lo, floating_origin);
                dvec3_t center_hi_fo = dvec3_sub(base_hi, floating_origin);

                /* ---- top cap ---- */
                {
                    const block_t above = (block_t)((layer + 1 < HEX_LAYERS)
                        ? c->voxels[HEX_VOXEL_INDEX(col, row, layer + 1)] : BLOCK_AIR);
                    if (block_is_transparent(above)) {
                        for (int k = 0; k < 6; ++k) {
                            int kn = (k + 1) % 6;
                            emit_tri(out, center_hi_fo, corners_hi[k], corners_hi[kn],
                                     up, color);
                        }
                    }
                }
                /* ---- bottom cap ---- */
                {
                    const block_t below = (block_t)((layer - 1 >= 0)
                        ? c->voxels[HEX_VOXEL_INDEX(col, row, layer - 1)] : BLOCK_AIR);
                    if (block_is_transparent(below)) {
                        dvec3_t dn = dvec3_scale(up, -1.0);
                        for (int k = 0; k < 6; ++k) {
                            int kn = (k + 1) % 6;
                            /* Reverse winding so face points down. */
                            emit_tri(out, center_lo_fo, corners_lo[kn], corners_lo[k],
                                     dn, color);
                        }
                    }
                }
                /* ---- 6 side faces ---- */
                for (int e = 0; e < 6; ++e) {
                    int ncol = col + nbr[e][0];
                    int nrow = row + nbr[e][1];
                    block_t nb = sample_neighbor(pool, c->cx, c->cy, ncol, nrow, layer);
                    if (!block_is_transparent(nb)) continue;

                    /* Edge between corner k1 and k2 (consecutive verts).
                     * Side faces correspond to edges of the hex; by our
                     * vertex order, side e uses corners[e] and corners[(e+1)%6]. */
                    int k1 = e;
                    int k2 = (e + 1) % 6;
                    dvec3_t n_tan = dvec3_add(
                        dvec3_scale(right, (double)(HEX_VX[k1][0] + HEX_VX[k2][0])),
                        dvec3_scale(fwd,   (double)(HEX_VX[k1][1] + HEX_VX[k2][1])));
                    dvec3_t n = dvec3_normalize(n_tan);

                    dvec3_t a = corners_lo[k1];
                    dvec3_t b = corners_lo[k2];
                    dvec3_t cvec = corners_hi[k2];
                    dvec3_t d = corners_hi[k1];
                    emit_tri(out, a, b, cvec, n, color);
                    emit_tri(out, a, cvec, d, n, color);
                }
            }
        }
    }
}
