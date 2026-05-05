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

/* Per-voxel hex-prism width factor along the tangent plane. 1.0 = full
 * tile; smaller shrinks the hex inward toward its center (radial extent
 * unchanged). Wood trunks come out skinny; leaf voxels get a stable
 * hash-driven variable width so the canopy isn't perfectly stamped. */
static float block_hex_width(block_t b, int tile_idx, int depth) {
    if (b == BLOCK_WOOD) return 0.20f;
    if (b == BLOCK_LEAVES) {
        uint32_t h = (uint32_t)tile_idx * 0xDEADBEEFu
                   + (uint32_t)depth   * 0xBADF00Du
                   + 0x12345678u;
        h ^= h >> 13;
        return 0.65f + ((float)(h & 0xFFu) / 255.0f) * 0.35f;
    }
    return 1.00f;
}

/* Linearly interpolate corner k toward t->center by `width`. At our
 * planet scale the curvature inside a 3 m tile is sub-millimetre, so
 * we don't bother re-projecting onto the unit sphere. */
static dvec3_t shrink_corner(const goldberg_tile_t* t, int k, float width) {
    dvec3_t offset = dvec3_sub(t->verts[k], t->center);
    return dvec3_add(t->center, dvec3_scale(offset, (double)width));
}

/* ----------------------------------------------------------------------- */
/* Cap emission: top or bottom of the column at a given depth.
 * `width` shrinks the hex inward (1.0 = full tile, 0.4 = trunk).
 * `r_offset_m` shifts the cap radius by this many metres. Used by the
 * water cap to drop the surface below sea level so the vertex
 * shader's wave displacement can't spill above coplanar beach sand.
 */
static void emit_cap(hex_mesh_t* out,
                     const goldberg_tile_t* t,
                     const world_t* w,
                     int depth,
                     block_t block,
                     bool is_top,
                     float width,
                     float r_offset_m) {
    const int n = t->num_verts;
    reserve(out, (size_t)(n + 1), (size_t)n * 3);
    uint32_t center_idx = (uint32_t)out->vertex_count;

    double r_top = world_depth_to_radius_m(w, depth + 1);
    double r_bot = world_depth_to_radius_m(w, depth);
    double r = (is_top ? r_top : r_bot) + (double)r_offset_m;

    dvec3_t normal = is_top ? t->center : dvec3_scale(t->center, -1.0);
    dvec3_t center_pos = dvec3_scale(t->center, r);

    face_cap_t cap = is_top ? FACE_CAP_TOP : FACE_CAP_BOTTOM;
    float u0 = (float)block_face_tile(block, cap) * HEX_ATLAS_U_STEP;
    float uc = u0 + HEX_ATLAS_U_STEP * 0.5f;
    float vc = 0.5f;

    push_vertex(out, center_pos, normal, uc, vc);

    for (int k = 0; k < n; ++k) {
        dvec3_t corner_dir = shrink_corner(t, k, width);
        dvec3_t corner     = dvec3_scale(corner_dir, r);
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
            out->indices[out->index_count++] = center_idx;
            out->indices[out->index_count++] = center_idx + 1 + (uint32_t)next;
            out->indices[out->index_count++] = center_idx + 1 + (uint32_t)k;
        }
    }
}

/* Side quad between inner and outer radius across two adjacent corners.
 * One quad per tile edge per exposed depth. `width` shrinks the corners
 * inward toward t->center so partial-width blocks (trunks) get a
 * narrower side face. */
static void emit_side_quad(hex_mesh_t* out,
                           const goldberg_tile_t* t,
                           int k_a, int k_b,
                           double r_bot,
                           double r_top,
                           block_t block,
                           float width) {
    dvec3_t corner_a = shrink_corner(t, k_a, width);
    dvec3_t corner_b = shrink_corner(t, k_b, width);
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

/* ----------------------------------------------------------------------- */
/* Water cap — one hexagon/pentagon drawn at sea level above any tile
 * whose terrain top sits below sea level. Tile surface stays opaque
 * (sand/stone); water is a separate translucent pass on top. */

#define SEA_LEVEL_DEPTH  64   /* must match world.c's SEA_LEVEL_IDX */

void hex_mesh_build_water(hex_mesh_t* out, const world_t* w, int tile_idx) {
    const goldberg_tile_t* t = goldberg_tile(w->grid, tile_idx);
    if (!t) return;
    int top = column_top_solid(w, tile_idx);
    if (top < 0 || top >= SEA_LEVEL_DEPTH) return;

    /* Drop the water cap WATER_DEPTH_OFFSET_M below the un-offset
     * sea-level radius so the vertex shader's wave swell can't push
     * crests above neighbour beach sand (which sits exactly at sea
     * level on the shoreline — coplanar with the un-offset cap). The
     * offset has to exceed the swell amplitude or we're back to
     * spillover. Tuned conservatively for the current shader's
     * 0.08 + 0.06 + 0.03 = 0.17 m max swell. */
    #define WATER_DEPTH_OFFSET_M 0.50f

    /* Water caps span the whole tile — width 1.0. emit_cap renders
     * the TOP face of layer N at radius(N+1), so to land the water
     * surface exactly at sea level (= radius(SEA_LEVEL_DEPTH)) we
     * pass depth = SEA_LEVEL_DEPTH - 1. Otherwise the cap floats
     * 1 m above the shoreline (visible "wobble" between the sand
     * top and the water surface). */
    emit_cap(out, t, w, SEA_LEVEL_DEPTH - 1, BLOCK_WATER, true, 1.0f,
             -WATER_DEPTH_OFFSET_M);
}

/* ----------------------------------------------------------------------- */

void hex_mesh_build_tile(hex_mesh_t* out, const world_t* w, int tile_idx) {
    const goldberg_tile_t* t = goldberg_tile(w->grid, tile_idx);
    if (!t) return;

    const int n = t->num_verts;
    const uint8_t* col = &w->blocks[tile_idx * WORLD_MAX_DEPTH];

    /* Iterate every solid voxel. For each, emit:
     *   - a top cap if the voxel above doesn't fully cover this face
     *     (covers air / water / ice / leaves, and crucially WOOD too —
     *     so the grass under a tree trunk still gets its top drawn)
     *   - a bottom cap when the block below doesn't cover (used by
     *     leaf canopies — air below the lowest leaves) — but never at
     *     d=0, where bedrock must hide the planet's hollow interior
     *   - side quads when any neighbor at the same depth doesn't cover
     *
     * Width comes from block_hex_width: 1.0 default, 0.4 for wood
     * trunks, 0.65–1.0 hash-driven for leaves so the canopy isn't
     * uniformly stamped. */
    for (int d = 0; d < WORLD_MAX_DEPTH; ++d) {
        block_t b = (block_t)col[d];
        if (!block_is_solid(b)) continue;

        float width = block_hex_width(b, tile_idx, d);

        block_t above = (d + 1 < WORLD_MAX_DEPTH) ? (block_t)col[d + 1] : BLOCK_AIR;
        if (!block_covers_face(above)) {
            emit_cap(out, t, w, d, b, true, width, 0.0f);
        }

        if (d > 0) {
            block_t below = (block_t)col[d - 1];
            if (!block_covers_face(below)) {
                emit_cap(out, t, w, d, b, false, width, 0.0f);
            }
        }

        bool any_exposed = false;
        for (int i = 0; i < t->num_neighbors; ++i) {
            block_t nb = world_get(w, t->neighbors[i], d);
            if (!block_covers_face(nb)) { any_exposed = true; break; }
        }
        if (!any_exposed) continue;

        double r_bot = world_depth_to_radius_m(w, d);
        double r_top = world_depth_to_radius_m(w, d + 1);
        for (int k = 0; k < n; ++k) {
            int next = (k + 1) % n;
            emit_side_quad(out, t, k, next, r_bot, r_top, b, width);
        }
    }
}
