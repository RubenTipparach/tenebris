#include "client/hex_mesher.h"
#include "core/blocks.h"
#include <math.h>
#include <stdlib.h>
#include <string.h>

/*
 * Ports the face emission logic from src/workers/geometryWorker.ts
 * (createFaceGeometry) to operate on goldberg_tile_t + world_t.
 *
 * Strategy per tile:
 *   - Find the highest solid depth (top) and lowest solid depth (bottom).
 *   - Emit a hex/pent cap at the top (outward normal = tile.center).
 *   - Emit an inverted cap at the bottom (inward normal).
 *   - For every layer that's exposed to a neighbor's transparent cell,
 *     emit a side quad between the neighbor edge and that layer.
 *
 * The JS implementation draws all 6 sides when any neighbor at that
 * depth is transparent; we mirror that — it's simpler than figuring
 * out which edge of the tile faces which neighbor (tiles aren't
 * axis-aligned so that map isn't obvious), and the per-tile mesh is
 * small enough that the overdraw doesn't hurt.
 */

/* ----------------------------------------------------------------------- */

static void reserve(hex_mesh_t* m, size_t add_v, size_t add_i) {
    if (m->vertex_count + add_v > m->vertex_cap) {
        size_t cap = m->vertex_cap ? m->vertex_cap : 256;
        while (cap < m->vertex_count + add_v) cap *= 2;
        m->vertices = (hex_vertex_t*)realloc(m->vertices, cap * sizeof(hex_vertex_t));
        m->vertex_cap = cap;
    }
    if (m->index_count + add_i > m->index_cap) {
        size_t cap = m->index_cap ? m->index_cap : 512;
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

static void push_vertex(hex_mesh_t* m, dvec3_t p, dvec3_t n, float u, float v) {
    hex_vertex_t* vv = &m->vertices[m->vertex_count++];
    vv->pos[0] = (float)p.x; vv->pos[1] = (float)p.y; vv->pos[2] = (float)p.z;
    vv->normal[0] = (float)n.x; vv->normal[1] = (float)n.y; vv->normal[2] = (float)n.z;
    vv->uv[0] = u; vv->uv[1] = v;
}

/* ----------------------------------------------------------------------- */

/* Find the highest solid block depth in a column (the "top" surface
 * voxel). Returns -1 for an entirely empty column. */
static int column_top_solid(const world_t* w, int tile) {
    for (int d = WORLD_MAX_DEPTH - 1; d >= 0; --d) {
        uint8_t b = w->blocks[tile * WORLD_MAX_DEPTH + d];
        if (block_is_solid((block_t)b)) return d;
    }
    return -1;
}

/* ----------------------------------------------------------------------- */
/* Cap emission: top or bottom of the column at a given depth.
 * is_top chooses outward vs inward normal + radius.
 */
static void emit_cap(hex_mesh_t* out,
                     const goldberg_tile_t* t,
                     const world_t* w,
                     int depth,
                     block_t block,
                     bool is_top) {
    const int n = t->num_verts;
    reserve(out, (size_t)(n + 1), (size_t)n * 3);
    uint32_t center_idx = (uint32_t)out->vertex_count;

    double r_top = world_depth_to_radius_m(w, depth + 1);  /* top surface of this voxel */
    double r_bot = world_depth_to_radius_m(w, depth);      /* bottom surface */
    double r = is_top ? r_top : r_bot;

    dvec3_t normal = is_top ? t->center : dvec3_scale(t->center, -1.0);
    dvec3_t center_pos = dvec3_scale(t->center, r);

    /* Atlas column for this face. */
    face_cap_t cap = is_top ? FACE_CAP_TOP : FACE_CAP_BOTTOM;
    float u0 = (float)block_face_tile(block, cap) * HEX_ATLAS_U_STEP;
    float uc = u0 + HEX_ATLAS_U_STEP * 0.5f;
    float vc = 0.5f;

    push_vertex(out, center_pos, normal, uc, vc);

    for (int k = 0; k < n; ++k) {
        dvec3_t corner = dvec3_scale(t->verts[k], r);
        /* Regular-polygon UV in the atlas tile's cell. */
        double angle = (double)k / (double)n * 6.2831853 - 1.5707963;
        float u = uc + (float)cos(angle) * HEX_ATLAS_U_STEP * 0.5f;
        float v = vc + (float)sin(angle) * 0.5f;
        push_vertex(out, corner, normal, u, v);
    }

    for (int k = 0; k < n; ++k) {
        int next = (k + 1) % n;
        if (is_top) {
            out->indices[out->index_count++] = center_idx;
            out->indices[out->index_count++] = center_idx + 1 + (uint32_t)k;
            out->indices[out->index_count++] = center_idx + 1 + (uint32_t)next;
        } else {
            /* Reverse winding for the bottom cap. */
            out->indices[out->index_count++] = center_idx;
            out->indices[out->index_count++] = center_idx + 1 + (uint32_t)next;
            out->indices[out->index_count++] = center_idx + 1 + (uint32_t)k;
        }
    }
}

/* Side quad between inner and outer radius across two adjacent corners.
 * One quad per tile edge per exposed depth. */
static void emit_side_quad(hex_mesh_t* out,
                           dvec3_t corner_a,
                           dvec3_t corner_b,
                           double r_bot,
                           double r_top,
                           block_t block) {
    dvec3_t inner_a = dvec3_scale(corner_a, r_bot);
    dvec3_t inner_b = dvec3_scale(corner_b, r_bot);
    dvec3_t outer_a = dvec3_scale(corner_a, r_top);
    dvec3_t outer_b = dvec3_scale(corner_b, r_top);

    dvec3_t edge = dvec3_sub(inner_b, inner_a);
    dvec3_t up   = dvec3_sub(outer_a, inner_a);
    dvec3_t normal = dvec3_normalize(dvec3_cross(edge, up));

    reserve(out, 4, 6);
    uint32_t base = (uint32_t)out->vertex_count;

    float u0 = (float)block_face_tile(block, FACE_CAP_SIDE) * HEX_ATLAS_U_STEP;
    float u1 = u0 + HEX_ATLAS_U_STEP;

    push_vertex(out, inner_a, normal, u0, 0.0f);
    push_vertex(out, inner_b, normal, u1, 0.0f);
    push_vertex(out, outer_b, normal, u1, 1.0f);
    push_vertex(out, outer_a, normal, u0, 1.0f);

    out->indices[out->index_count++] = base + 0;
    out->indices[out->index_count++] = base + 1;
    out->indices[out->index_count++] = base + 2;
    out->indices[out->index_count++] = base + 0;
    out->indices[out->index_count++] = base + 2;
    out->indices[out->index_count++] = base + 3;
}

/* True if any neighbor of this tile has a transparent block at the
 * given depth (or no neighbor info). Mirrors JS hasExposedSide. */
static bool any_neighbor_transparent_at(const world_t* w, const goldberg_tile_t* t, int depth) {
    for (int i = 0; i < t->num_neighbors; ++i) {
        int nb = t->neighbors[i];
        block_t b = world_get(w, nb, depth);
        if (block_is_transparent(b)) return true;
    }
    return false;
}

/* ----------------------------------------------------------------------- */

/* ----------------------------------------------------------------------- */
/* Water cap — one hexagon/pentagon drawn at sea level above any tile
 * whose terrain top sits below sea level. Tile surface stays opaque
 * (sand/stone); water is a separate translucent pass on top. */

#define SEA_LEVEL_DEPTH  12   /* must match world.c's SEA_LEVEL_IDX */

void hex_mesh_build_water(hex_mesh_t* out, const world_t* w, int tile_idx) {
    const goldberg_tile_t* t = goldberg_tile(w->grid, tile_idx);
    if (!t) return;
    /* If the top solid block is at or above sea level, no water here. */
    int top = column_top_solid(w, tile_idx);
    if (top < 0 || top >= SEA_LEVEL_DEPTH) return;

    /* Emit a single hex/pent cap at sea-level radius. Uses the
     * BLOCK_WATER tile column of the atlas. */
    emit_cap(out, t, w, SEA_LEVEL_DEPTH, BLOCK_WATER, true);
}

/* ----------------------------------------------------------------------- */

void hex_mesh_build_tile(hex_mesh_t* out, const world_t* w, int tile_idx) {
    const goldberg_tile_t* t = goldberg_tile(w->grid, tile_idx);
    if (!t) return;

    int top = column_top_solid(w, tile_idx);
    if (top < 0) return;           /* empty column (shouldn't happen given bedrock) */
    int bot = 0;                   /* bedrock sits at depth 0 */

    block_t top_block = (block_t)w->blocks[tile_idx * WORLD_MAX_DEPTH + top];
    block_t bot_block = (block_t)w->blocks[tile_idx * WORLD_MAX_DEPTH + bot];

    /* ---- top cap: the voxel at `top` is the surface ---- */
    emit_cap(out, t, w, top, top_block, true);

    /* ---- bottom cap: needed if we have a visible underside. For Tier 1
     * we always emit so digging exposes it cleanly. */
    emit_cap(out, t, w, bot, bot_block, false);

    /* ---- side faces: one quad per edge per exposed depth ---- */
    const int n = t->num_verts;
    for (int d = bot; d <= top; ++d) {
        uint8_t b_id = w->blocks[tile_idx * WORLD_MAX_DEPTH + d];
        if (!block_is_solid((block_t)b_id)) continue;
        if (!any_neighbor_transparent_at(w, t, d)) continue;

        double r_bot = world_depth_to_radius_m(w, d);
        double r_top = world_depth_to_radius_m(w, d + 1);

        for (int k = 0; k < n; ++k) {
            int next = (k + 1) % n;
            emit_side_quad(out, t->verts[k], t->verts[next],
                           r_bot, r_top, (block_t)b_id);
        }
    }
}
