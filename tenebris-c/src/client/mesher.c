#include "client/mesher.h"
#include "core/blocks.h"
#include <stdlib.h>
#include <string.h>

/* ----------------------------------------------------------------------- */
/* Texture atlas layout (must match the bake in renderer.c).
 *
 *   Atlas is ATLAS_COLS = 4 tiles wide, 3 rows tall.
 *   Row 0 = top face, Row 1 = bottom face, Row 2 = side face.
 *   Column = block type id (0..3). Column 0 (AIR) is unused.
 *
 *   STONE: columns source = wall
 *   DIRT:  columns source = floor
 *   GRASS: top = ceiling, bottom = floor, sides = wall
 */
#define ATLAS_COLS 4
#define ATLAS_ROWS 3
#define U_STEP     (1.0f / (float)ATLAS_COLS)
#define V_STEP     (1.0f / (float)ATLAS_ROWS)

typedef enum {
    ATLAS_ROW_TOP    = 0,
    ATLAS_ROW_BOTTOM = 1,
    ATLAS_ROW_SIDE   = 2,
} atlas_row_t;

static atlas_row_t row_for_face(int face_idx) {
    /* face_idx: 0 +X, 1 -X, 2 +Y, 3 -Y, 4 +Z, 5 -Z */
    if (face_idx == 2) return ATLAS_ROW_TOP;
    if (face_idx == 3) return ATLAS_ROW_BOTTOM;
    return ATLAS_ROW_SIDE;
}

/* ----------------------------------------------------------------------- */

void mesher_init(vox_mesh_t* m) { memset(m, 0, sizeof(*m)); }

void mesher_reset(vox_mesh_t* m) {
    m->vertex_count = 0;
    m->index_count  = 0;
}

void mesher_free(vox_mesh_t* m) {
    free(m->vertices);
    free(m->indices);
    memset(m, 0, sizeof(*m));
}

static void reserve(vox_mesh_t* m, size_t add_verts, size_t add_idxs) {
    if (m->vertex_count + add_verts > m->vertex_cap) {
        size_t cap = m->vertex_cap ? m->vertex_cap : 4096;
        while (cap < m->vertex_count + add_verts) cap *= 2;
        m->vertices = (vox_vertex_t*)realloc(m->vertices, cap * sizeof(vox_vertex_t));
        m->vertex_cap = cap;
    }
    if (m->index_count + add_idxs > m->index_cap) {
        size_t cap = m->index_cap ? m->index_cap : 8192;
        while (cap < m->index_count + add_idxs) cap *= 2;
        m->indices = (uint32_t*)realloc(m->indices, cap * sizeof(uint32_t));
        m->index_cap = cap;
    }
}

/* Vertex orderings per face. Each face has 4 vertices, counter-clockwise
 * when viewed from outside. Coordinates are block-local (0..1).
 */
static const float FACE_VERTS[6][4][3] = {
    /* +X */ {{1,0,0},{1,1,0},{1,1,1},{1,0,1}},
    /* -X */ {{0,0,1},{0,1,1},{0,1,0},{0,0,0}},
    /* +Y */ {{0,1,0},{0,1,1},{1,1,1},{1,1,0}},
    /* -Y */ {{0,0,1},{0,0,0},{1,0,0},{1,0,1}},
    /* +Z */ {{1,0,1},{1,1,1},{0,1,1},{0,0,1}},
    /* -Z */ {{0,0,0},{0,1,0},{1,1,0},{1,0,0}},
};

static const int NEIGHBOR_OFFSET[6][3] = {
    { 1, 0, 0}, {-1, 0, 0}, { 0, 1, 0}, { 0,-1, 0}, { 0, 0, 1}, { 0, 0,-1},
};

/* Per-face UV ordering. Matches Three.js (0,0)=bottom-left convention. */
static const float FACE_UV[6][4][2] = {
    /* +X */ {{1,0},{1,1},{0,1},{0,0}},
    /* -X */ {{0,0},{0,1},{1,1},{1,0}},
    /* +Y */ {{0,0},{0,1},{1,1},{1,0}},
    /* -Y */ {{0,0},{0,1},{1,1},{1,0}},
    /* +Z */ {{0,0},{0,1},{1,1},{1,0}},
    /* -Z */ {{1,0},{1,1},{0,1},{0,0}},
};

static void emit_face(vox_mesh_t* m,
                      float wx, float wy, float wz,
                      int face_idx, block_t block) {
    reserve(m, 4, 6);
    uint32_t base = (uint32_t)m->vertex_count;

    atlas_row_t row = row_for_face(face_idx);
    int col = (int)block;
    if (col < 0 || col >= ATLAS_COLS) col = 1;
    float u0 = (float)col * U_STEP;
    float v0 = (float)row * V_STEP;

    for (int i = 0; i < 4; ++i) {
        const float* fv = FACE_VERTS[face_idx][i];
        const float* fu = FACE_UV[face_idx][i];
        vox_vertex_t* v = &m->vertices[m->vertex_count + (size_t)i];
        v->pos[0] = wx + fv[0];
        v->pos[1] = wy + fv[1];
        v->pos[2] = wz + fv[2];
        v->uv[0]  = u0 + fu[0] * U_STEP;
        v->uv[1]  = v0 + fu[1] * V_STEP;
        v->normal_id = (uint8_t)face_idx;
        v->_pad[0] = v->_pad[1] = v->_pad[2] = 0;
    }
    m->vertex_count += 4;

    m->indices[m->index_count + 0] = base + 0;
    m->indices[m->index_count + 1] = base + 1;
    m->indices[m->index_count + 2] = base + 2;
    m->indices[m->index_count + 3] = base + 0;
    m->indices[m->index_count + 4] = base + 2;
    m->indices[m->index_count + 5] = base + 3;
    m->index_count += 6;
}

void mesher_build_chunk(vox_mesh_t* out, const world_t* w, const chunk_t* c) {
    const int32_t wx0 = c->cx * CHUNK_SIZE;
    const int32_t wz0 = c->cz * CHUNK_SIZE;
    const float fx0 = (float)wx0;
    const float fz0 = (float)wz0;

    for (int y = 0; y < CHUNK_HEIGHT; ++y)
    for (int z = 0; z < CHUNK_SIZE;   ++z)
    for (int x = 0; x < CHUNK_SIZE;   ++x) {
        uint8_t b = c->blocks[(size_t)x + (size_t)z * CHUNK_SIZE +
                              (size_t)y * CHUNK_SIZE * CHUNK_SIZE];
        if (b == BLOCK_AIR) continue;

        const int32_t wx = wx0 + x;
        const int32_t wz = wz0 + z;

        for (int f = 0; f < 6; ++f) {
            const int* o = NEIGHBOR_OFFSET[f];
            if (!world_is_block_solid(w, wx + o[0], y + o[1], wz + o[2])) {
                emit_face(out, fx0 + (float)x, (float)y, fz0 + (float)z,
                          f, (block_t)b);
            }
        }
    }
}
