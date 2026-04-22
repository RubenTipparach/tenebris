#include "client/hex_mesher.h"
#include "core/blocks.h"
#include <math.h>
#include <stdlib.h>
#include <string.h>

/* ----------------------------------------------------------------------- */
/* Pointy-top hex vertex offsets from the column center (tangent plane),
 * starting at the "east" edge (30 deg) and going CCW. */
static const float HEX_VX[6][2] = {
    {  HEX_SQRT3 * 0.5f * HEX_RADIUS,  HEX_RADIUS * 0.5f },   /*  30 deg */
    {  0.0f,                           HEX_RADIUS       },    /*  90 deg */
    { -HEX_SQRT3 * 0.5f * HEX_RADIUS,  HEX_RADIUS * 0.5f },   /* 150 deg */
    { -HEX_SQRT3 * 0.5f * HEX_RADIUS, -HEX_RADIUS * 0.5f },   /* 210 deg */
    {  0.0f,                          -HEX_RADIUS       },    /* 270 deg */
    {  HEX_SQRT3 * 0.5f * HEX_RADIUS, -HEX_RADIUS * 0.5f },   /* 330 deg */
};

/* Neighbor offsets for flat-edge hex neighbors. Even/odd rows differ. */
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

/* Look up a block across potential chunk boundaries. Returns AIR when
 * the neighbor chunk is inactive/pending so we don't flash seams during
 * streaming. */
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

/* Emit a single triangle with per-vertex UVs. */
static void emit_tri_uv(hex_mesh_t* m,
                        dvec3_t p0, dvec3_t p1, dvec3_t p2,
                        float u0, float v0, float u1, float v1, float u2, float v2,
                        dvec3_t normal) {
    reserve(m, 3, 3);
    dvec3_t verts[3] = { p0, p1, p2 };
    float   uvs[3][2] = { {u0, v0}, {u1, v1}, {u2, v2} };
    uint32_t base = (uint32_t)m->vertex_count;
    for (int i = 0; i < 3; ++i) {
        hex_vertex_t* v = &m->vertices[m->vertex_count++];
        v->pos[0] = (float)verts[i].x; v->pos[1] = (float)verts[i].y; v->pos[2] = (float)verts[i].z;
        v->normal[0] = (float)normal.x; v->normal[1] = (float)normal.y; v->normal[2] = (float)normal.z;
        v->uv[0] = uvs[i][0];
        v->uv[1] = uvs[i][1];
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
            if (mx < mn) continue;

            const float cx_t = (float)col * HEX_DX + ((row & 1) ? (HEX_DX * 0.5f) : 0.0f);
            const float cy_t = (float)row * HEX_DY;
            dvec3_t center_tan = dvec3_add(dvec3_scale(right, cx_t),
                                           dvec3_scale(fwd, cy_t));
            dvec3_t col_origin = dvec3_add(chunk_origin, center_tan);

            const int (*nbr)[2] = (row & 1) ? HEX_NEIGHBOR_ODD : HEX_NEIGHBOR_EVEN;

            for (int layer = mn; layer <= mx; ++layer) {
                const uint8_t bid = c->voxels[HEX_VOXEL_INDEX(col, row, layer)];
                if (bid == BLOCK_AIR) continue;

                const float lo = (float)(layer - HEX_BASE_PADDING)     * HEX_HEIGHT;
                const float hi = (float)(layer - HEX_BASE_PADDING + 1) * HEX_HEIGHT;
                dvec3_t base_lo = dvec3_add(col_origin, dvec3_scale(up, (double)lo));
                dvec3_t base_hi = dvec3_add(col_origin, dvec3_scale(up, (double)hi));

                dvec3_t corners_lo[6], corners_hi[6];
                for (int k = 0; k < 6; ++k) {
                    dvec3_t t = dvec3_add(dvec3_scale(right, (double)HEX_VX[k][0]),
                                          dvec3_scale(fwd,   (double)HEX_VX[k][1]));
                    corners_lo[k] = dvec3_sub(dvec3_add(base_lo, t), floating_origin);
                    corners_hi[k] = dvec3_sub(dvec3_add(base_hi, t), floating_origin);
                }
                dvec3_t center_lo_fo = dvec3_sub(base_lo, floating_origin);
                dvec3_t center_hi_fo = dvec3_sub(base_hi, floating_origin);

                /* --- top cap ----------------------------------------- */
                {
                    const block_t above = (block_t)((layer + 1 < HEX_LAYERS)
                        ? c->voxels[HEX_VOXEL_INDEX(col, row, layer + 1)] : BLOCK_AIR);
                    if (block_is_transparent(above) && above != (block_t)bid) {
                        const float u0 = (float)block_face_tile((block_t)bid, FACE_CAP_TOP) * HEX_ATLAS_U_STEP;
                        /* Project hex corners into atlas UV space for the
                         * tile column. Center is at (u0 + half_step, 0.5).
                         * Corner k maps scaled by the tile's half-width. */
                        const float uc = u0 + HEX_ATLAS_U_STEP * 0.5f;
                        const float vc = 0.5f;
                        float u_corner[6], v_corner[6];
                        for (int k = 0; k < 6; ++k) {
                            u_corner[k] = uc + HEX_VX[k][0] / HEX_RADIUS * HEX_ATLAS_U_STEP * 0.5f;
                            v_corner[k] = vc + HEX_VX[k][1] / HEX_RADIUS * 0.5f;
                        }
                        for (int k = 0; k < 6; ++k) {
                            int kn = (k + 1) % 6;
                            emit_tri_uv(out,
                                center_hi_fo, corners_hi[k], corners_hi[kn],
                                uc, vc, u_corner[k], v_corner[k], u_corner[kn], v_corner[kn],
                                up);
                        }
                    }
                }
                /* --- bottom cap -------------------------------------- */
                {
                    const block_t below = (block_t)((layer - 1 >= 0)
                        ? c->voxels[HEX_VOXEL_INDEX(col, row, layer - 1)] : BLOCK_AIR);
                    if (block_is_transparent(below) && below != (block_t)bid) {
                        const float u0 = (float)block_face_tile((block_t)bid, FACE_CAP_BOTTOM) * HEX_ATLAS_U_STEP;
                        const float uc = u0 + HEX_ATLAS_U_STEP * 0.5f;
                        const float vc = 0.5f;
                        float u_corner[6], v_corner[6];
                        for (int k = 0; k < 6; ++k) {
                            u_corner[k] = uc + HEX_VX[k][0] / HEX_RADIUS * HEX_ATLAS_U_STEP * 0.5f;
                            v_corner[k] = vc + HEX_VX[k][1] / HEX_RADIUS * 0.5f;
                        }
                        dvec3_t dn = dvec3_scale(up, -1.0);
                        for (int k = 0; k < 6; ++k) {
                            int kn = (k + 1) % 6;
                            /* Reverse winding so face normal points down. */
                            emit_tri_uv(out,
                                center_lo_fo, corners_lo[kn], corners_lo[k],
                                uc, vc, u_corner[kn], v_corner[kn], u_corner[k], v_corner[k],
                                dn);
                        }
                    }
                }
                /* --- 6 side faces ------------------------------------ */
                for (int e = 0; e < 6; ++e) {
                    int ncol = col + nbr[e][0];
                    int nrow = row + nbr[e][1];
                    block_t nb = sample_neighbor(pool, c->cx, c->cy, ncol, nrow, layer);
                    if (!block_is_transparent(nb)) continue;
                    if (nb == (block_t)bid) continue;

                    int k1 = e;
                    int k2 = (e + 1) % 6;
                    dvec3_t n_tan = dvec3_add(
                        dvec3_scale(right, (double)(HEX_VX[k1][0] + HEX_VX[k2][0])),
                        dvec3_scale(fwd,   (double)(HEX_VX[k1][1] + HEX_VX[k2][1])));
                    dvec3_t n = dvec3_normalize(n_tan);

                    dvec3_t a = corners_lo[k1];
                    dvec3_t b = corners_lo[k2];
                    dvec3_t cv = corners_hi[k2];
                    dvec3_t d  = corners_hi[k1];

                    const float u0 = (float)block_face_tile((block_t)bid, FACE_CAP_SIDE) * HEX_ATLAS_U_STEP;
                    const float u1 = u0 + HEX_ATLAS_U_STEP;
                    emit_tri_uv(out, a,  b,  cv,  u0, 0.0f, u1, 0.0f, u1, 1.0f, n);
                    emit_tri_uv(out, a,  cv, d,   u0, 0.0f, u1, 1.0f, u0, 1.0f, n);
                }
            }
        }
    }
}
