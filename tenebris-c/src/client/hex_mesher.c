#include "client/hex_mesher.h"
#include "client/torch.h"
#include "core/blocks.h"
#include "core/config.h"
#include "core/world_light.h"
#include "core/world_water.h"
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

/* True when the voxel engine is selected. Cached as a single config
 * read per call site to keep the hot mesher path predictable. */
static inline bool use_voxel_engine(void) {
    return config_lighting()->engine == 1;
}

/* Normalised sky for the air voxel adjacent to a face, sampled from
 * the propagated grid. Sky values are 0..voxel_sky_max; we divide so
 * the mesher's downstream shader continues to read a 0..1 range
 * identical to the column-mode output. */
static float sky_light_voxel(const world_t* w, int tile, int depth_at_air) {
    if (!w || !w->light) return 1.0f;
    int max = config_lighting()->voxel_sky_max;
    if (max <= 0) max = 15;
    float v = (float)world_light_sky(w->light, tile, depth_at_air) / (float)max;
    if (v > 1.0f) v = 1.0f;
    return v;
}

/* Smooth-lighting corner sample. Averages the sky + block nibbles
 * across the three voxels that share a hex/pent corner (this tile +
 * the two edge-adjacent neighbours), each sampled at the same depth.
 * Returns 0..1 fractions in *out_sky / *out_block. Caller passes the
 * two flanking edge neighbours (edge_neighbours[k-1], edge_neighbours[k])
 * for corner k. -1 in either slot is skipped (open-edge pentagon
 * boundary, not actually possible for closed-surface goldbergs but
 * the guard keeps the helper safe). */
/* Returns the number of air voxels actually sampled. Caller can use
 * this as a "did the corner have anything to look at?" signal -
 * smooth_corner_sample falls back to *out_sky = 0 when every voxel
 * at the requested depth was solid, which is wrong for a corner
 * standing on a floor (air is right above, not at). */
static int smooth_corner_sample_n(const world_t* w,
                                    int tile, int nbr_a, int nbr_b,
                                    int depth_at_air,
                                    float* out_sky, float* out_block) {
    if (!w || !w->light) { *out_sky = 1.0f; *out_block = 0.0f; return 0; }
    int sky_sum   = 0;
    int block_sum = 0;
    int samples   = 0;
    int max = config_lighting()->voxel_sky_max;
    if (max <= 0) max = 15;

    int tiles[3] = { tile, nbr_a, nbr_b };
    for (int i = 0; i < 3; ++i) {
        int ti = tiles[i];
        if (ti < 0) continue;
        if (depth_at_air >= 0 && depth_at_air < WORLD_MAX_DEPTH) {
            block_t b = (block_t)w->blocks[(size_t)ti * WORLD_MAX_DEPTH + depth_at_air];
            if (block_covers_face(b)) continue;
        }
        sky_sum   += world_light_sky  (w->light, ti, depth_at_air);
        block_sum += world_light_block(w->light, ti, depth_at_air);
        ++samples;
    }
    if (samples == 0) { *out_sky = 0.0f; *out_block = 0.0f; return 0; }
    float s = (float)sky_sum   / (float)(samples * max);
    float b = (float)block_sum / (float)(samples * 15);

    /* Ambient-occlusion darkening at the corner. Counts SIDE-NEIGHBOUR
     * tiles (nbr_a / nbr_b - NOT the meshed tile itself) that are
     * solid at depth_at_air. The "self" tile is excluded because for
     * caps it's always air (the cell above the block) and for sides
     * it's always solid (the block we're meshing); neither tells us
     * anything about how exposed the corner is to surrounding
     * geometry. With the side-neighbour count we get a real measure
     * of "how much corner is wedged into adjacent stone", which is
     * the visual the user circled at the base of a column meeting
     * flat ground - the cap corner touching the column should
     * darken, the cap centre should stay bright, and the GPU
     * interpolates linearly between them. Values cribbed from
     * Notch's classic 3-step ladder. */
    int ao_occluders = 0;
    for (int i = 1; i < 3; ++i) {            /* skip tiles[0] = self */
        int ti = tiles[i];
        if (ti < 0) continue;
        if (depth_at_air < 0 || depth_at_air >= WORLD_MAX_DEPTH) continue;
        block_t nb = (block_t)w->blocks[(size_t)ti * WORLD_MAX_DEPTH + depth_at_air];
        if (block_covers_face(nb)) ++ao_occluders;
    }
    float ao = 1.0f;
    if      (ao_occluders == 1) ao = 0.85f;
    else if (ao_occluders >= 2) ao = 0.70f;
    s *= ao;
    b *= ao;

    if (s > 1.0f) s = 1.0f;
    if (b > 1.0f) b = 1.0f;
    *out_sky   = s;
    *out_block = b;
    return samples;
}

static void smooth_corner_sample(const world_t* w,
                                 int tile, int nbr_a, int nbr_b,
                                 int depth_at_air,
                                 float* out_sky, float* out_block) {
    smooth_corner_sample_n(w, tile, nbr_a, nbr_b, depth_at_air,
                             out_sky, out_block);
}

/* ----------------------------------------------------------------------- */

/* Per-voxel hex-prism width factor along the tangent plane. 1.0 = full
 * tile; smaller shrinks the hex inward toward its center (radial extent
 * unchanged). Wood trunks come out skinny; leaf voxels get a stable
 * hash-driven variable width so the canopy isn't perfectly stamped. */
static float block_hex_width(block_t b, int tile_idx, int depth) {
    if (b == BLOCK_WOOD) return 0.20f;
    if (b == BLOCK_LEAVES || b == BLOCK_SEQ_LEAVES) {
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

    /* Voxel-mode sample depth differs between top and bottom caps:
     *   Top cap    -> depth+1 (the air ABOVE the block - that's the
     *                 cell the face looks up into).
     *   Bottom cap -> depth-1 (the air BELOW the block - that's
     *                 where torch-light + sky propagation actually
     *                 lives). The previous "depth" lookup landed in
     *                 the block's own layer (always solid for the
     *                 face we're meshing) and smooth_corner_sample
     *                 skipped it; for a sealed-room ceiling every
     *                 neighbour at that depth is also solid, so the
     *                 sample collapsed to zero and the ceiling read
     *                 pitch black even with a torch right below it.
     * Column-mode keeps the legacy "what's between this fragment
     * and the sky" semantic (no per-voxel grid) so its inputs
     * stay unchanged. */
    const bool voxel = use_voxel_engine();
    int depth_at_air;
    if (voxel) {
        depth_at_air = is_top ? depth + 1 : depth - 1;
        if (depth_at_air < 0)              depth_at_air = 0;
        if (depth_at_air >= WORLD_MAX_DEPTH) depth_at_air = WORLD_MAX_DEPTH - 1;
    } else {
        depth_at_air = is_top ? depth + 1 : depth;
    }

    /* Cap centre samples just (this_tile, depth_at_air). Each corner
     * vertex samples the three voxels meeting at that corner - the
     * own column plus the two edge-flanking neighbours - and averages,
     * giving per-vertex smooth lighting under the voxel engine.
     *
     * Torch contribution is the per-vertex proximity sum from
     * torch_light_at() regardless of engine: torches are a separate
     * additive layer that doesn't go through the BFS, so removing
     * one is a no-op on the lighting system (the next remesh just
     * sums over the smaller torch list). The smooth_corner_sample
     * call still returns block-light from the BFS grid, but we
     * ignore it - the grid's block channel stays at zero since
     * hex_mesher_relight_if_needed no longer publishes torches. */
    float center_sky   = 0.0f;
    float center_block_unused = 0.0f;
    if (bake_lighting) {
        if (voxel) {
            center_sky = sky_light_voxel(w, tile_idx, depth_at_air);
        } else {
            center_sky = sky_light_at(w, tile_idx, depth_at_air);
        }
    }

    float center_torch = bake_lighting
        ? torch_light_at(dvec3_to_vec3f(center_pos))
        : 0.0f;
    push_vertex(out, center_pos, normal, uc, vc, center_sky, center_torch, wet);

    for (int k = 0; k < n; ++k) {
        dvec3_t corner_dir = shrink_corner(t, k, width);
        dvec3_t corner     = dvec3_scale(corner_dir, r);
        double angle = (double)k / (double)n * 6.2831853 - 1.5707963;
        float u = uc + (float)cos(angle) * HEX_ATLAS_U_STEP * 0.5f;
        float v = vc + (float)sin(angle) * 0.5f;

        float corner_sky = center_sky;
        if (bake_lighting && voxel) {
            int nbr_a = t->edge_neighbours[(k - 1 + n) % n];
            int nbr_b = t->edge_neighbours[k];
            smooth_corner_sample(w, tile_idx, nbr_a, nbr_b, depth_at_air,
                                 &corner_sky, &center_block_unused);
        }

        float corner_torch = bake_lighting
            ? torch_light_at(dvec3_to_vec3f(corner))
            : 0.0f;
        push_vertex(out, corner, normal, u, v, corner_sky, corner_torch, wet);
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

    const bool voxel = use_voxel_engine();
    /* Per-corner sky / torch values. Sky uses the voxel grid (top vs
     * bottom corners sample different depths so a tall side face
     * shows the vertical gradient + AO), torch uses the per-vertex
     * proximity sum from torch_light_at(). Block-light from the BFS
     * grid is discarded (BFS no longer carries torches). */
    float sky_top_a = 0.0f, sky_top_b = 0.0f;
    float sky_bot_a = 0.0f, sky_bot_b = 0.0f;
    float bl_unused = 0.0f;
    if (voxel) {
        const int n = t->num_verts;
        /* Edge k spans corner k_a -> k_b, so the across-face neighbour
         * is edge_neighbours[k_a]. Corner k_a is bounded by edges
         * (k_a-1, k_a); corner k_b by edges (k_a, k_a+1). The shared
         * "across" edge is k_a for both, plus one outboard edge each. */
        const int edge_k = k_a;
        const int nbr_a_outboard = t->edge_neighbours[(k_a - 1 + n) % n];
        const int nbr_b_outboard = t->edge_neighbours[(k_b)         % n];
        const int nbr_across     = t->edge_neighbours[edge_k];
        /* Top corners: air at depth+1 (above this block - either the
         * column air going up, or open sky). */
        smooth_corner_sample(w, tile_idx, nbr_a_outboard, nbr_across,
                             depth + 1, &sky_top_a, &bl_unused);
        smooth_corner_sample(w, tile_idx, nbr_across, nbr_b_outboard,
                             depth + 1, &sky_top_b, &bl_unused);
        /* Bottom corners: try depth first (cells AT the bottom-of-face
         * height - e.g. cave interior air on the side of a tall wall).
         * If every sampled tile at that depth is solid (the wall is
         * sitting on a flat surface where the air above the floor
         * resumes at depth+1), fall back to the top-corner depth so
         * the bottom doesn't read pitch black. This matches the
         * "shadow cells should only be incrementally darker than
         * adjacent cells" rule: a floor-level corner always has SOME
         * adjacent air to derive light from, never a hard 0. */
        int n_bot_a = smooth_corner_sample_n(w, tile_idx,
                                                 nbr_a_outboard, nbr_across,
                                                 depth, &sky_bot_a, &bl_unused);
        if (n_bot_a == 0) sky_bot_a = sky_top_a;
        int n_bot_b = smooth_corner_sample_n(w, tile_idx,
                                                 nbr_across, nbr_b_outboard,
                                                 depth, &sky_bot_b, &bl_unused);
        if (n_bot_b == 0) sky_bot_b = sky_top_b;
    } else {
        /* Legacy column-engine path: sky shared across the quad. */
        float legacy_sky = sky_light_at(w, tile_idx, depth + 1);
        sky_top_a = sky_top_b = sky_bot_a = sky_bot_b = legacy_sky;
    }
    /* Torch contribution is the per-vertex proximity sum on every
     * path - additive layer, no BFS, no occlusion. */
    float t_ia = torch_light_at(dvec3_to_vec3f(inner_a));
    float t_ib = torch_light_at(dvec3_to_vec3f(inner_b));
    float t_oa = torch_light_at(dvec3_to_vec3f(outer_a));
    float t_ob = torch_light_at(dvec3_to_vec3f(outer_b));

    push_vertex(out, inner_a, normal, u0, 0.0f, sky_bot_a, t_ia, wet);
    push_vertex(out, inner_b, normal, u1, 0.0f, sky_bot_b, t_ib, wet);
    push_vertex(out, outer_b, normal, u1, 1.0f, sky_top_b, t_ob, wet);
    push_vertex(out, outer_a, normal, u0, 1.0f, sky_top_a, t_oa, wet);

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
/* Per-voxel water mesher. Walks every BLOCK_WATER cell in the column
 * (except the sea-level row, which the ocean cap above already owns)
 * and emits cap + side faces according to the section 8/9 rules in
 * water.md.
 *
 * Cap height drops with the configured flow level so a level-7 cell
 * renders as a thin film while a source / falling / sleeping ocean
 * cell renders at full height. Side faces follow the table in the
 * .h doc-comment: emit against air, skip against same-or-taller
 * water, emit a partial strip when neighbour water is shorter.
 *
 * Reads world_water_get_state(); cells with state == 0 (the legacy
 * worldgen-filled ocean below sea level, anything the simulator
 * hasn't touched yet) are treated as full sources for the height
 * calc, so the deep ocean stays at full cell height instead of
 * shrinking to film. */

static float water_cap_offset_for_level(int level, int cfg_max_level,
                                         float min_film_fraction) {
    /* Map level (0..cfg_max_level) to a radial offset in metres,
     * relative to the cell's nominal top radius. Level 0 → 0 m
     * (cap at top), level cfg_max_level → -(1 - min_film) m (cap near
     * bottom of the cell, with a min_film slice still visible). */
    if (cfg_max_level <= 0) return 0.0f;
    if (level <= 0) return 0.0f;
    if (level > cfg_max_level) level = cfg_max_level;
    float frac = (float)level / (float)cfg_max_level;
    /* Block height is 1 m (BLOCK_HEIGHT in world.c). The film fraction
     * keeps the thinnest level visible instead of collapsing the cap
     * onto the cell's bottom. */
    return -frac * (1.0f - min_film_fraction);
}

/* True when the (tile, depth) cell is BLOCK_WATER and should render
 * its sides / caps - i.e. it's an actual water voxel. */
static bool water_voxel_at(const world_t* w, int tile, int depth) {
    if (tile < 0 || tile >= w->tile_count) return false;
    if (depth < 0 || depth >= WORLD_MAX_DEPTH) return false;
    return w->blocks[tile * WORLD_MAX_DEPTH + depth] == (uint8_t)BLOCK_WATER;
}

/* Effective render level for a water cell. Source / falling / sleeping
 * cells (state byte 0 or source flag set) render at level 0 (full
 * height); falling water also renders full so a vertical stream looks
 * continuous instead of pinching at every cell boundary. Flowing
 * cells return their stored level, clamped to cfg_max_level. */
static int water_render_level(uint8_t state, int cfg_max_level) {
    if (state == 0u) return 0;
    if (water_state_is_source(state))  return 0;
    if (water_state_is_falling(state)) return 0;
    int level = water_state_level(state);
    if (level < 0) level = 0;
    if (level > cfg_max_level) level = cfg_max_level;
    return level;
}

/* Effective render level taking the column above into account. When the
 * cell directly above is water, the surface lives up there, not within
 * this cell — render us at full height so caps + walls meet the cell
 * above seamlessly. Used for our own cell AND when comparing to a
 * water neighbour, so both sides agree on where the wall strip belongs. */
static int water_render_level_at(const world_t* w, int tile, int depth,
                                 int cfg_max_level) {
    uint8_t state = world_water_get_state(w, tile, depth);
    if (depth + 1 < WORLD_MAX_DEPTH &&
        w->blocks[(size_t)tile * WORLD_MAX_DEPTH + (depth + 1)]
            == (uint8_t)BLOCK_WATER) {
        return 0;
    }
    return water_render_level(state, cfg_max_level);
}

void hex_mesh_build_water_voxels(hex_mesh_t* out, const world_t* w, int tile_idx) {
    const goldberg_tile_t* t = goldberg_tile(w->grid, tile_idx);
    if (!t) return;
    const uint8_t* col = &w->blocks[(size_t)tile_idx * WORLD_MAX_DEPTH];

    const water_flow_config_t* wf = config_water_flow();
    int cfg_max_level = wf->max_level;
    if (cfg_max_level < 1)               cfg_max_level = 1;
    if (cfg_max_level > WATER_LEVEL_MAX) cfg_max_level = WATER_LEVEL_MAX;
    float min_film = wf->min_film_fraction;
    if (min_film < 0.0f) min_film = 0.0f;
    if (min_film > 1.0f) min_film = 1.0f;

    const int n = t->num_verts;

    for (int d = 0; d < WORLD_MAX_DEPTH; ++d) {
        if (col[d] != (uint8_t)BLOCK_WATER) continue;

        int level = water_render_level_at(w, tile_idx, d, cfg_max_level);
        float cap_offset = water_cap_offset_for_level(level, cfg_max_level, min_film);

        /* Sea-level row's TOP cap is owned by the planet-wide ocean
         * cap in hex_mesh_build_water - emitting it here too would
         * Z-fight with the wave-displaced ocean surface. Side faces
         * + bottom cap still come from this loop, otherwise an air
         * pocket adjacent to the ocean at sea level shows no water
         * walls (the bug: dig a tunnel right under the shoreline and
         * the ocean appears to end mid-air against the dirt).
         *
         * The side faces at the sea-level row must end at the SAME
         * radius the ocean cap is drawn at, not at the voxel's
         * nominal top - the ocean cap sits depth_offset_m below sea
         * level to give the swell room, so emitting sides up to the
         * full r_top leaves a visible (~0.5 m) gap between the water
         * wall and the cap surface. Override cap_offset to match
         * the ocean cap's vertical drop. */
        const bool is_sea_level_row = (d == SEA_LEVEL_DEPTH - 1);
        if (is_sea_level_row) {
            const water_config_t* wc = config_water();
            cap_offset = -wc->depth_offset_m + wc->height_offset_m;
        }

        /* ---- Top cap.
         * Skip when the cell above is itself water - the two cells
         * connect through the column and the upper cap is what the
         * player actually sees. Solid above also covers (no cap
         * needed). Anything else (air, leaves) shows the cap. The
         * sea-level row defers its top to the ocean-cap path. */
        block_t above = (d + 1 < WORLD_MAX_DEPTH) ? (block_t)col[d + 1] : BLOCK_AIR;
        if (!is_sea_level_row && above != BLOCK_WATER && !block_covers_face(above)) {
            emit_cap(out, t, w, tile_idx, d, BLOCK_WATER, /*is_top=*/true,
                     /*width=*/1.0f, /*r_offset_m=*/cap_offset,
                     /*bake_lighting=*/true, /*wet=*/1.0f);
        }

        /* ---- Bottom cap.
         * Emit only when the cell below is air - the underside of a
         * suspended pool. Water-on-solid (the common case) hides the
         * bottom; water-on-water connects through the column. */
        if (d > 0) {
            block_t below = (block_t)col[d - 1];
            if (below == BLOCK_AIR) {
                emit_cap(out, t, w, tile_idx, d, BLOCK_WATER, /*is_top=*/false,
                         /*width=*/1.0f, /*r_offset_m=*/0.0f,
                         /*bake_lighting=*/true, /*wet=*/1.0f);
            }
        }

        /* ---- Side faces (section 9 table). */
        double r_bot      = world_depth_to_radius_m(w, d);
        double r_top_full = world_depth_to_radius_m(w, d + 1);
        double r_top_cap  = r_top_full + (double)cap_offset;

        for (int k = 0; k < n; ++k) {
            int next = (k + 1) % n;
            int nb = t->edge_neighbours[k];
            block_t nb_b = (nb >= 0)
                           ? (block_t)w->blocks[(size_t)nb * WORLD_MAX_DEPTH + d]
                           : BLOCK_AIR;

            if (nb_b == BLOCK_WATER) {
                /* Water-to-water: only emit a strip if WE'RE taller
                 * (our level < neighbour's level - lower level number =
                 * higher cap). Equal-or-shorter falls through to the
                 * "neighbour handles it" branch and we skip. */
                int nb_level = water_render_level_at(w, nb, d, cfg_max_level);
                if (level >= nb_level) continue;
                float nb_cap_offset = water_cap_offset_for_level(
                    nb_level, cfg_max_level, min_film);
                double r_strip_bot = r_top_full + (double)nb_cap_offset;
                double r_strip_top = r_top_cap;
                if (r_strip_top - r_strip_bot > 1e-4) {
                    emit_side_quad(out, t, w, tile_idx, d, k, next,
                                   r_strip_bot, r_strip_top,
                                   BLOCK_WATER, /*width=*/1.0f, /*wet=*/1.0f);
                }
                continue;
            }

            if (block_covers_face(nb_b)) {
                /* Solid neighbour hides the side - water is behind it. */
                continue;
            }

            /* Air (or transparent / non-covering): emit the full side
             * face from r_bot up to our cap. */
            emit_side_quad(out, t, w, tile_idx, d, k, next,
                           r_bot, r_top_cap,
                           BLOCK_WATER, /*width=*/1.0f, /*wet=*/1.0f);
        }
    }
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

    /* `near_water` is now used only as a coarse skip hint - the
     * underwater-fog wet flag is computed per FACE below, based on
     * the across-face neighbour. Old code blanket-marked every solid
     * voxel in a near-water tile below sea level as wet on all 6
     * faces, which painted the underwater tint onto faces that
     * actually border AIR (e.g. the walls of a pit dug into the
     * seabed - the player sees them through air, not water, so they
     * should read dry). Per-face fixes that. */
    (void)near_water;

    for (int d = 0; d < WORLD_MAX_DEPTH; ++d) {
        block_t b = (block_t)col[d];
        if (!block_is_solid(b)) continue;

        float width = block_hex_width(b, tile_idx, d);

        block_t above = (d + 1 < WORLD_MAX_DEPTH) ? (block_t)col[d + 1] : BLOCK_AIR;
        if (!block_covers_face(above)) {
            /* Top cap is wet when the cell directly above is water -
             * looking down through that cell hits this face through
             * water, which is exactly what should trigger the
             * Beer-Lambert dimming. */
            float top_wet = (above == BLOCK_WATER) ? 1.0f : 0.0f;
            emit_cap(out, t, w, tile_idx, d, b, true, width, 0.0f, true, top_wet);
        }

        if (d > 0) {
            block_t below = (block_t)col[d - 1];
            if (!block_covers_face(below)) {
                /* Bottom cap rarely matters (most solid blocks sit on
                 * solid), but the same rule applies: wet only when
                 * the cell below is water. */
                float bot_wet = (below == BLOCK_WATER) ? 1.0f : 0.0f;
                emit_cap(out, t, w, tile_idx, d, b, false, width, 0.0f, true, bot_wet);
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
            /* Side face wet: the across-edge neighbour at the same
             * depth. edge_neighbours[k] is the tile across the edge
             * spanning corners k -> k+1, which is exactly the
             * neighbour emit_side_quad samples for AO. Water
             * neighbour -> looking AT this face goes through water,
             * so the underwater dimming fires. Air / solid neighbour
             * -> dry face (the air-pocket-wall case). */
            int nb_tile = t->edge_neighbours[k];
            block_t nb_b = (nb_tile >= 0)
                           ? world_get(w, nb_tile, d)
                           : BLOCK_AIR;
            float side_wet = (nb_b == BLOCK_WATER) ? 1.0f : 0.0f;
            emit_side_quad(out, t, w, tile_idx, d, k, next, r_bot, r_top, b, width, side_wet);
        }
    }
}

/* ----------------------------------------------------------------------- */
/* Voxel-engine relight entry point. Idempotent within a frame: the
 * first chunk-rebuild call after a world edit publishes torches and
 * runs the BFS, subsequent calls find the dirty flag cleared and
 * return immediately. */

void hex_mesher_relight_if_needed(world_t* w) {
    if (!w || !w->light) return;
    const lighting_config_t* cfg = config_lighting();
    if (cfg->engine != 1) return;

    /* Torches are NOT seeded into the voxel BFS. They live as a
     * separate additive proximity-only layer baked per-vertex by
     * torch_light_at() in the mesher (inverse-square sum across
     * every torch within TORCH_LIGHT_RANGE_M, no occlusion test).
     *
     * Rationale: Minecraft's BFS-propagated torch light needs a
     * ripple-radius BFS on every place / remove (~thousand ops + a
     * cascade of cell visits), and any subtle bug in the incremental
     * path silently leaves cells un-lit. The proximity layer is
     * O(N_torches) per vertex - trivially correct, instant on
     * place / remove (the next chunk remesh re-sums the new list),
     * and visually close enough on the small placement counts the
     * game uses. The voxel BFS still runs for SKY light + AO via
     * smooth_corner_sample, which is where the propagation
     * behaviour actually matters (caves go dark, daylight shafts).
     *
     * Therefore: no world_light_set_torches() call here. The grid's
     * block channel stays at zero across the planet; the mesher
     * ignores it when sampling per-vertex torch contribution. */

    /* Sky / AO relight only fires if a block edit landed; torch
     * changes no longer dirty the grid. */
    if (!world_light_is_dirty(w->light)) return;
    world_light_rebuild(w->light, w);
}
