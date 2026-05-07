#include "client/hex_mesher.h"
#include "client/torch.h"
#include "core/blocks.h"
#include "core/config.h"
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

static void push_vertex(hex_mesh_t* m, dvec3_t p, dvec3_t n, float u, float v,
                        float sky_light, float torch_light, float wet) {
    hex_vertex_t* vv = &m->vertices[m->vertex_count++];
    vv->pos[0] = (float)p.x; vv->pos[1] = (float)p.y; vv->pos[2] = (float)p.z;
    vv->normal[0] = (float)n.x; vv->normal[1] = (float)n.y; vv->normal[2] = (float)n.z;
    vv->uv[0] = u; vv->uv[1] = v;
    vv->sky_light   = sky_light;
    vv->torch_light = torch_light;
    vv->wet         = wet;
}

/* ----------------------------------------------------------------------- */
/* Sky-light bake. Counts solid voxels stacked above a given depth in
 * the column, returning a 0..1 attenuation: full sun above an open
 * column, decaying exponentially per blocking voxel. With a per-
 * voxel attenuation of ~0.55 the third blocked layer drops below
 * 20%, the fifth below 7% — caves get dark fast, surface stays lit.
 *
 * Uses block_covers_face to skip leaves / wood / partial-width
 * blocks; otherwise a single tree trunk would blot out an entire
 * tile beneath it. */
static float sky_light_at(const world_t* w, int tile, int depth_at_top) {
    int blocked = 0;
    for (int d = depth_at_top; d < WORLD_MAX_DEPTH; ++d) {
        block_t b = (block_t)w->blocks[tile * WORLD_MAX_DEPTH + d];
        if (block_covers_face(b)) ++blocked;
    }
    if (blocked == 0) return 1.0f;
    float att = expf(-(float)blocked * 0.55f);
    return att;
}

/* Sum of inverse-square contributions from all placed torches whose
 * flame is within TORCH_LIGHT_RANGE_M of the world-space vertex
 * position. Clamped to 3 so multiple stacked torches saturate
 * gracefully rather than blowing out.
 *
 * O(N_torches) per vertex — fine for the small placement counts the
 * game uses (tens, not thousands). For a heavy-build scene we'd want
 * a spatial grid; that's a later optimisation. */
static float torch_light_at(vec3_t world_pos) {
    int count = torch_count();
    if (count == 0) return 0.0f;
    const torch_t* list = torch_list();
    const float range  = TORCH_LIGHT_RANGE_M;
    const float range2 = range * range;
    const float decay  = TORCH_LIGHT_DECAY;

    float total = 0.0f;
    for (int i = 0; i < count; ++i) {
        vec3_t flame = torch_flame_pos(&list[i]);
        vec3_t d = vec3_sub(flame, world_pos);
        float d2 = d.x*d.x + d.y*d.y + d.z*d.z;
        if (d2 > range2) continue;
        /* Matches the JS reference's getTorchLightAt formula:
         * 1 / (1 + decay * d² / range²) — smooth inverse-square
         * shape, normalised so contribution = 1 at d = 0. */
        float a = 1.0f / (1.0f + decay * d2 / range2);
        total += a;
    }
    if (total > 3.0f) total = 3.0f;
    return total;
}

static vec3_t dvec3_to_vec3f(dvec3_t v) {
    return (vec3_t){ (float)v.x, (float)v.y, (float)v.z };
}

/* ----------------------------------------------------------------------- */

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
 *
 * Per-vertex sky_light + torch_light are baked here. Sky light depends
 * on what's stacked in the column above (so a top cap with empty sky
 * gets full light, a bottom cap deep inside a column gets none).
 * Torch light depends only on world-space distance to nearby torches.
 * Water vertices skip the bake and pass 0s — water shader doesn't
 * read those attributes. */
static void emit_cap(hex_mesh_t* out,
                     const goldberg_tile_t* t,
                     const world_t* w,
                     int tile_idx,
                     int depth,
                     block_t block,
                     bool is_top,
                     float width,
                     float r_offset_m,
                     bool bake_lighting,
                     float wet) {
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

    /* Sky-light depth lookup point: top cap → column above this
     * block (depth+1 onward). Bottom cap → column above the cap
     * itself (i.e. the block layer at depth and everything above).
     * Both reduce to "what lies between this fragment and the sky";
     * in a normal terrain column the top cap reads sky=1 and the
     * bottom cap of an exposed leaf canopy reads close to the value
     * for its block. */
    float sky_at = bake_lighting
                 ? sky_light_at(w, tile_idx, is_top ? depth + 1 : depth)
                 : 0.0f;

    float center_torch = bake_lighting ? torch_light_at(dvec3_to_vec3f(center_pos)) : 0.0f;
    push_vertex(out, center_pos, normal, uc, vc, sky_at, center_torch, wet);

    for (int k = 0; k < n; ++k) {
        dvec3_t corner_dir = shrink_corner(t, k, width);
        dvec3_t corner     = dvec3_scale(corner_dir, r);
        double angle = (double)k / (double)n * 6.2831853 - 1.5707963;
        float u = uc + (float)cos(angle) * HEX_ATLAS_U_STEP * 0.5f;
        float v = vc + (float)sin(angle) * 0.5f;
        float corner_torch = bake_lighting ? torch_light_at(dvec3_to_vec3f(corner)) : 0.0f;
        push_vertex(out, corner, normal, u, v, sky_at, corner_torch, wet);
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
 * narrower side face.
 *
 * Sky_light is taken at the top of the block (depth + 1) — the column
 * above that depth determines how much sky reaches the side face, and
 * we apply the same value to inner + outer corners since a one-block-
 * tall side doesn't have meaningful vertical variation. Torch light
 * is per-vertex (the world-space corner positions differ enough that
 * the inverse-square sum can split across nearby flames). */
static void emit_side_quad(hex_mesh_t* out,
                           const goldberg_tile_t* t,
                           const world_t* w,
                           int tile_idx,
                           int depth,
                           int k_a, int k_b,
                           double r_bot,
                           double r_top,
                           block_t block,
                           float width,
                           float wet) {
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

    float sky = sky_light_at(w, tile_idx, depth + 1);
    float t_ia = torch_light_at(dvec3_to_vec3f(inner_a));
    float t_ib = torch_light_at(dvec3_to_vec3f(inner_b));
    float t_oa = torch_light_at(dvec3_to_vec3f(outer_a));
    float t_ob = torch_light_at(dvec3_to_vec3f(outer_b));

    push_vertex(out, inner_a, normal, u0, 0.0f, sky, t_ia, wet);
    push_vertex(out, inner_b, normal, u1, 0.0f, sky, t_ib, wet);
    push_vertex(out, outer_b, normal, u1, 1.0f, sky, t_ob, wet);
    push_vertex(out, outer_a, normal, u0, 1.0f, sky, t_oa, wet);

    out->indices[out->index_count++] = base + 0;
    out->indices[out->index_count++] = base + 1;
    out->indices[out->index_count++] = base + 2;
    out->indices[out->index_count++] = base + 0;
    out->indices[out->index_count++] = base + 2;
    out->indices[out->index_count++] = base + 3;
}

/* ----------------------------------------------------------------------- */
/* Water cap — one hexagon/pentagon drawn at sea level above tiles
 * whose voxel column actually has a water cell at sea level. Tile
 * surface stays opaque (sand/stone); water is a separate translucent
 * pass on top.
 *
 * The gate is voxel-local and dynamic: render iff the cell at
 * SEA_LEVEL_DEPTH-1 (the layer whose top face sits at sea level) is
 * BLOCK_WATER. This matches the user's mental model — "water cells
 * are the cells that border a body of water". Consequences:
 *   - inland holes never get a cap (the column has dirt/stone/grass
 *     at depth 63, never water);
 *   - digging out a sea-level water cell removes the cap from that
 *     tile (you punched a void through the ocean);
 *   - sand-topped beach tiles have SAND at depth 63 → no cap on the
 *     beach itself, only on the deeper ocean tiles next door. The
 *     ocean visually terminates at the sand silhouette, which reads
 *     as a beach.
 *
 * world_set already dirties the modified tile + neighbours, so any
 * edit that crosses depth 63 triggers a remesh of this tile next
 * frame. */

#define SEA_LEVEL_DEPTH  64   /* must match world.c's SEA_LEVEL_IDX */

void hex_mesh_build_water(hex_mesh_t* out, const world_t* w, int tile_idx) {
    const goldberg_tile_t* t = goldberg_tile(w->grid, tile_idx);
    if (!t) return;
    if (world_get(w, tile_idx, SEA_LEVEL_DEPTH - 1) != BLOCK_WATER) return;

    /* Drop the water cap below the un-offset sea-level radius so the
     * vertex shader's wave swell can't push crests above neighbour
     * beach sand (which sits exactly at sea level on the shoreline —
     * coplanar with the un-offset cap). The offset has to exceed the
     * swell amplitude or we're back to spillover. Sourced from
     * water.yaml so designers can tune from the YAML alongside the
     * other water knobs.
     *
     * emit_cap renders the TOP face of layer N at radius(N+1), so to
     * land the water surface at sea level (= radius(SEA_LEVEL_DEPTH))
     * we pass depth = SEA_LEVEL_DEPTH - 1.
     *
     * depth_offset_m drops the cap to keep wave crests below beach
     * sand; height_offset_m is the creative sea-level knob layered
     * on top (positive = raise water, negative = lower). */
    const float depth_off  = config_water()->depth_offset_m;
    const float height_off = config_water()->height_offset_m;

    /* Bake the per-vertex sky_light + torch_light for water cap
     * vertices too. Sky-light reads as 1.0 on an unobstructed ocean
     * surface (column above sea level is empty), but drops to the
     * usual exp(-blocked * 0.55) under any roof a player builds over
     * the water — so water in a covered cove dims correctly without
     * a special path. Torch-light is the user-facing reason: a torch
     * placed on a pier or shoreline now spills its warm circle onto
     * the water beside it, exactly like it spills onto the land. */
    emit_cap(out, t, w, tile_idx, SEA_LEVEL_DEPTH - 1, BLOCK_WATER, true, 1.0f,
             -depth_off + height_off, true /* bake sky/torch lighting */,
             1.0f /* the water cap IS water */);
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
    /* "Wet" = face is below sea level AND there's actually a water
     * cap nearby that puts it underwater. Neither pure-voxel-adjacency
     * nor pure-altitude was right: voxel-adjacency missed pit walls
     * dug into the seabed (the inside cells are AIR after digging,
     * so neighbour-is-water reads dry), while pure altitude fogged
     * inland holes that just happen to be below sea altitude with no
     * water anywhere near.
     *
     * The "near water" predicate: this tile or any of its 1-ring
     * neighbours has BLOCK_WATER at SEA_LEVEL_DEPTH-1 (the column
     * cell that drives the water cap). That covers:
     *   - ocean tiles (own cap)            → wet below sea ✓
     *   - beach tiles next to ocean        → wet below sea ✓
     *   - inland tiles past the shoreline  → dry, even if dug deep ✓
     * Closed inland caves dug far from any water no longer fog. The
     * 1-ring approximation can leave a 2nd-ring shore pit slightly
     * dry; bump to a wider ring if that case shows up in screenshots.
     *
     * Computed per-tile (one neighbour scan), not per-face — the
     * water-cap presence doesn't change with depth. */
    const bool body_wet = (w->body != NULL) && w->body->has_water;
    bool near_water = false;
    if (body_wet) {
        if (world_get(w, tile_idx, SEA_LEVEL_DEPTH - 1) == BLOCK_WATER) {
            near_water = true;
        } else {
            for (int i = 0; i < t->num_neighbors; ++i) {
                if (world_get(w, t->neighbors[i], SEA_LEVEL_DEPTH - 1) == BLOCK_WATER) {
                    near_water = true;
                    break;
                }
            }
        }
    }

    for (int d = 0; d < WORLD_MAX_DEPTH; ++d) {
        block_t b = (block_t)col[d];
        if (!block_is_solid(b)) continue;

        float width = block_hex_width(b, tile_idx, d);
        float wet = (near_water && d < SEA_LEVEL_DEPTH) ? 1.0f : 0.0f;

        block_t above = (d + 1 < WORLD_MAX_DEPTH) ? (block_t)col[d + 1] : BLOCK_AIR;
        if (!block_covers_face(above)) {
            emit_cap(out, t, w, tile_idx, d, b, true, width, 0.0f, true, wet);
        }

        if (d > 0) {
            block_t below = (block_t)col[d - 1];
            if (!block_covers_face(below)) {
                emit_cap(out, t, w, tile_idx, d, b, false, width, 0.0f, true, wet);
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
            emit_side_quad(out, t, w, tile_idx, d, k, next, r_bot, r_top, b, width, wet);
        }
    }
}
