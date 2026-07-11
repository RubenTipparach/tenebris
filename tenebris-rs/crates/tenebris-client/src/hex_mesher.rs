//! Port of `tenebris-c/src/client/hex_mesher.{c,h}`.
//!
//! Per-tile hex/pent prism mesher. Output is a triangle soup in planet-
//! world coordinates (single precision - planet is small enough that a
//! floating origin isn't needed yet). Atlas UVs + shaded in the hex
//! shader.
//!
//! Ports the face emission logic from src/workers/geometryWorker.ts
//! (createFaceGeometry) to operate on goldberg Tile + World.
//!
//! Strategy per tile:
//!   - Find the highest solid depth (top) and lowest solid depth (bottom).
//!   - Emit a hex/pent cap at the top (outward normal = tile.center).
//!   - Emit an inverted cap at the bottom (inward normal).
//!   - For every layer that's exposed to a neighbor's transparent cell,
//!     emit a side quad between the neighbor edge and that layer.
//!
//! The JS implementation draws all 6 sides when any neighbor at that
//! depth is transparent; we mirror that - it's simpler than figuring
//! out which edge of the tile faces which neighbor (tiles aren't
//! axis-aligned so that map isn't obvious), and the per-tile mesh is
//! small enough that the overdraw doesn't hurt.
//!
//! Renames (per PORTING.md rule 4 - module prefix dropped):
//! - `hex_vertex_t`                  -> `hex_mesher::HexVertex`
//! - `hex_mesh_t`                    -> `hex_mesher::HexMesh` (the C
//!   `vertex_count`/`index_count`/`vertex_cap`/`index_cap` fields fold
//!   into the two `Vec`s; `reserve()` keeps the exact C capacity-
//!   doubling math via `reserve_exact` so the buffers never self-grow)
//! - `hex_mesh_init()`               -> `HexMesh::default()` / `HexMesh::new()`
//! - `hex_mesh_reset()`              -> `HexMesh::reset()`
//! - `hex_mesh_free()`               -> `Drop` (implicit)
//! - `hex_mesh_build_tile()`         -> `hex_mesher::build_tile()`
//! - `hex_mesh_build_water()`        -> `hex_mesher::build_water()`
//! - `hex_mesh_build_water_voxels()` -> `hex_mesher::build_water_voxels()`
//! - `hex_mesher_relight_if_needed()`-> `hex_mesher::relight_if_needed()`
//! - `HEX_ATLAS_TILES` / `HEX_ATLAS_U_STEP` keep their names (hotbar_ui
//!   imports them from here, like the C includes hex_mesher.h).

#![allow(dead_code)] // consumed by the renderer wave of the port

use crate::torch;
use tenebris_core::blocks::{self, Block, FaceCap};
use tenebris_core::config;
use tenebris_core::goldberg::Tile;
use tenebris_core::math::{
    dvec3_add, dvec3_cross, dvec3_make, dvec3_normalize, dvec3_scale, dvec3_sub, dvec3_to_vec3,
    vec3_sub, DVec3, Vec3,
};
use tenebris_core::world::{World, WORLD_MAX_DEPTH};
use tenebris_core::world_water;

/* Atlas column count (must match the runtime bake in renderer.c).
 * 12 default + 6 Sequoia + 3 tinted variants + wood + leaves + bedrock
 * + seq-leaves = 25, + 4 ore tints (coal/copper/tin/iron) = 29 total. */
pub const HEX_ATLAS_TILES: i32 = 93;
pub const HEX_ATLAS_U_STEP: f32 = 1.0 / HEX_ATLAS_TILES as f32;

/*
 * Vertex layout: 44 bytes (pos + normal + uv + sky_light + torch_light + wet).
 *
 *   sky_light    - 0..1 fraction of sky reaching this vertex, baked
 *                  from the count of solid voxels stacked above it
 *                  in the same column. Drops exponentially per
 *                  blocking voxel - caves go dark, exposed surface
 *                  stays full-bright. Replaces the implicit "ambient
 *                  is uniform everywhere" assumption with a cheap
 *                  voxel-occlusion approximation.
 *   torch_light  - sum of inverse-square contributions from nearby
 *                  placed torches (clamped to ~3). Drives the warm-
 *                  orange additive light in the hex shader. Baked at
 *                  mesh-build time from the torch.rs list, so a chunk
 *                  must be re-meshed when torches are placed or
 *                  removed within range.
 *   wet          - 1.0 if the voxel on the *other* side of this face
 *                  is BLOCK_WATER, else 0.0. Drives the underwater
 *                  fog mask in composite.glsl and gates hex.glsl's
 *                  water-depth dimming. Voxel-driven, not altitude-
 *                  driven, so a cave wall under sea level (where the
 *                  neighbour cell is air or rock) reads dry and never
 *                  picks up the underwater tint.
 *
 * The hex pipeline binds all six attributes; the water pipeline
 * binds only pos (its normal is derived radially from a_pos in the
 * vs, uv isn't used). The unused bytes are silently skipped via the
 * shared 44-byte stride.
 */
#[repr(C)]
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct HexVertex {
    pub pos: [f32; 3],
    pub normal: [f32; 3],
    pub uv: [f32; 2],
    pub sky_light: f32,
    pub torch_light: f32,
    pub wet: f32,
}

/// Port of `hex_mesh_t`. `vertices.len()` / `indices.len()` stand in
/// for the C `vertex_count` / `index_count`; capacities follow the
/// exact C doubling policy via [`reserve`].
#[derive(Default)]
pub struct HexMesh {
    pub vertices: Vec<HexVertex>,
    pub indices: Vec<u32>,
}

impl HexMesh {
    /// Port of `hex_mesh_init()`.
    pub fn new() -> HexMesh {
        HexMesh::default()
    }

    /// Port of `hex_mesh_reset()` - counts to zero, capacity kept.
    pub fn reset(&mut self) {
        self.vertices.clear();
        self.indices.clear();
    }

    /// Append another mesh's geometry, rebasing its indices onto this
    /// mesh's current vertex count. Used to stitch the partial meshes
    /// produced when a chunk's tiles are meshed in parallel back into a
    /// single chunk mesh: each partial builds with self-relative indices,
    /// so concatenating partials in tile order with this offset yields the
    /// exact buffer a single sequential build would have produced.
    pub fn append(&mut self, other: &HexMesh) {
        let base = self.vertices.len() as u32;
        self.vertices.extend_from_slice(&other.vertices);
        self.indices.extend(other.indices.iter().map(|i| i + base));
    }

    /* hex_mesh_free(): Drop handles the frees. */
}

/* ----------------------------------------------------------------------- */

/// Port of the C `reserve()`. Same buffer-size math: capacities start
/// at 256 verts / 512 indices and double until the pending append
/// fits. `reserve_exact` keeps the Vec at the computed cap so growth
/// stays under this policy (pushes below cap never reallocate).
fn reserve(m: &mut HexMesh, add_v: usize, add_i: usize) {
    if m.vertices.len() + add_v > m.vertices.capacity() {
        let mut cap = if m.vertices.capacity() != 0 {
            m.vertices.capacity()
        } else {
            256
        };
        while cap < m.vertices.len() + add_v {
            cap *= 2;
        }
        m.vertices.reserve_exact(cap - m.vertices.len());
    }
    if m.indices.len() + add_i > m.indices.capacity() {
        let mut cap = if m.indices.capacity() != 0 {
            m.indices.capacity()
        } else {
            512
        };
        while cap < m.indices.len() + add_i {
            cap *= 2;
        }
        m.indices.reserve_exact(cap - m.indices.len());
    }
}

/// Port of `push_vertex()`.
#[allow(clippy::too_many_arguments)]
fn push_vertex(
    m: &mut HexMesh,
    p: DVec3,
    n: DVec3,
    u: f32,
    v: f32,
    sky_light: f32,
    torch_light: f32,
    wet: f32,
) {
    m.vertices.push(HexVertex {
        pos: [p.x as f32, p.y as f32, p.z as f32],
        normal: [n.x as f32, n.y as f32, n.z as f32],
        uv: [u, v],
        sky_light,
        torch_light,
        wet,
    });
}

/* ----------------------------------------------------------------------- */
/* Raw-byte predicates mirroring the C `(block_t)byte` casts. The C
 * comparison chains treat any out-of-palette byte as covering / solid
 * (they only carve out the known non-covering ids); `Block::from_raw`
 * is fallible, so these helpers replicate that fall-through. (Same
 * shape as world.rs's pub(crate) covers_face_raw, which isn't visible
 * from this crate.) */

#[inline]
fn covers_face_raw(raw: u8) -> bool {
    match Block::from_raw(raw) {
        Some(b) => blocks::covers_face(b),
        None => true,
    }
}

#[inline]
fn is_solid_raw(raw: u8) -> bool {
    /* C block_is_solid: b != BLOCK_AIR && b != BLOCK_WATER. */
    raw != Block::Air.raw() && raw != Block::Water.raw()
}

/* ----------------------------------------------------------------------- */
/* Sky-light bake. Counts solid voxels stacked above a given depth in
 * the column, returning a 0..1 attenuation: full sun above an open
 * column, decaying exponentially per blocking voxel. With a per-
 * voxel attenuation of ~0.55 the third blocked layer drops below
 * 20%, the fifth below 7% - caves get dark fast, surface stays lit.
 *
 * Uses block_covers_face to skip leaves / wood / partial-width
 * blocks; otherwise a single tree trunk would blot out an entire
 * tile beneath it. */
fn sky_light_at(w: &World, tile: i32, depth_at_top: i32) -> f32 {
    let mut blocked = 0i32;
    for d in depth_at_top..WORLD_MAX_DEPTH {
        let b = w.blocks[(tile * WORLD_MAX_DEPTH + d) as usize];
        if covers_face_raw(b) {
            blocked += 1;
        }
    }
    if blocked == 0 {
        return 1.0;
    }
    (-(blocked as f32) * 0.55f32).exp()
}

/* Sum of inverse-square contributions from all placed torches whose
 * flame is within torch::LIGHT_RANGE_M of the world-space vertex
 * position. Clamped to 3 so multiple stacked torches saturate
 * gracefully rather than blowing out.
 *
 * O(N_torches) per vertex - fine for the small placement counts the
 * game uses (tens, not thousands). For a heavy-build scene we'd want
 * a spatial grid; that's a later optimisation. */
fn torch_light_at(world_pos: Vec3) -> f32 {
    /* Sample through the cross-thread mirror, NOT torch::list(): chunk
     * builds fan out across the rayon pool, and the torch module's
     * primary state is thread-local - a worker reading it directly
     * sees an empty list and bakes darkness (the "torches don't light
     * the ground" bug on multithreaded builds). */
    torch::with_lights(|list| {
        if list.is_empty() {
            return 0.0;
        }
        let range = torch::LIGHT_RANGE_M;
        let range2 = range * range;
        let decay = torch::LIGHT_DECAY;

        let mut total = 0.0f32;
        for t in list.iter() {
            let flame = torch::flame_pos(t);
            let d = vec3_sub(flame, world_pos);
            let d2 = d.x * d.x + d.y * d.y + d.z * d.z;
            if d2 > range2 {
                continue;
            }
            /* Matches the JS reference's getTorchLightAt formula:
             * 1 / (1 + decay * d^2 / range^2) - smooth inverse-square
             * shape, normalised so contribution = 1 at d = 0. */
            let a = 1.0f32 / (1.0f32 + decay * d2 / range2);
            total += a;
        }
        total.min(3.0)
    })
}

/* C dvec3_to_vec3f: identical float casts; math.rs already ports it
 * as dvec3_to_vec3. */

/* True when the voxel engine is selected. Cached as a single config
 * read per call site to keep the hot mesher path predictable. */
#[inline]
fn use_voxel_engine() -> bool {
    config::lighting().engine == 1
}

/* Normalised sky for the air voxel adjacent to a face, sampled from
 * the propagated grid. Sky values are 0..voxel_sky_max; we divide so
 * the mesher's downstream shader continues to read a 0..1 range
 * identical to the column-mode output. (The C's `!w->light` NULL
 * guard drops out - the Rust World always owns its light grid.) */
fn sky_light_voxel(w: &World, tile: i32, depth_at_air: i32) -> f32 {
    let mut max = config::lighting().voxel_sky_max;
    if max <= 0 {
        max = 15;
    }
    let mut v = w.light.sky(tile, depth_at_air) as f32 / max as f32;
    if v > 1.0 {
        v = 1.0;
    }
    v
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
fn smooth_corner_sample_n(
    w: &World,
    tile: i32,
    nbr_a: i32,
    nbr_b: i32,
    depth_at_air: i32,
    out_sky: &mut f32,
    out_block: &mut f32,
) -> i32 {
    let mut sky_sum = 0i32;
    let mut block_sum = 0i32;
    let mut samples = 0i32;
    let mut max = config::lighting().voxel_sky_max;
    if max <= 0 {
        max = 15;
    }

    let tiles = [tile, nbr_a, nbr_b];
    for &ti in tiles.iter() {
        if ti < 0 {
            continue;
        }
        if depth_at_air >= 0 && depth_at_air < WORLD_MAX_DEPTH {
            let b = w.blocks[(ti as usize) * WORLD_MAX_DEPTH as usize + depth_at_air as usize];
            if covers_face_raw(b) {
                continue;
            }
        }
        sky_sum += w.light.sky(ti, depth_at_air) as i32;
        block_sum += w.light.block(ti, depth_at_air) as i32;
        samples += 1;
    }
    if samples == 0 {
        *out_sky = 0.0;
        *out_block = 0.0;
        return 0;
    }
    let mut s = sky_sum as f32 / (samples * max) as f32;
    let mut b = block_sum as f32 / (samples * 15) as f32;

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
    let mut ao_occluders = 0i32;
    for &ti in tiles.iter().skip(1) {
        /* skip tiles[0] = self */
        if ti < 0 {
            continue;
        }
        if depth_at_air < 0 || depth_at_air >= WORLD_MAX_DEPTH {
            continue;
        }
        let nb = w.blocks[(ti as usize) * WORLD_MAX_DEPTH as usize + depth_at_air as usize];
        if covers_face_raw(nb) {
            ao_occluders += 1;
        }
    }
    let mut ao = 1.0f32;
    if ao_occluders == 1 {
        ao = 0.85;
    } else if ao_occluders >= 2 {
        ao = 0.70;
    }
    s *= ao;
    b *= ao;

    if s > 1.0 {
        s = 1.0;
    }
    if b > 1.0 {
        b = 1.0;
    }
    *out_sky = s;
    *out_block = b;
    samples
}

fn smooth_corner_sample(
    w: &World,
    tile: i32,
    nbr_a: i32,
    nbr_b: i32,
    depth_at_air: i32,
    out_sky: &mut f32,
    out_block: &mut f32,
) {
    smooth_corner_sample_n(w, tile, nbr_a, nbr_b, depth_at_air, out_sky, out_block);
}

/* ----------------------------------------------------------------------- */

/* Per-voxel hex-prism width factor along the tangent plane. 1.0 = full
 * tile; smaller shrinks the hex inward toward its center (radial extent
 * unchanged). Wood trunks come out skinny; leaf voxels get a stable
 * hash-driven variable width so the canopy isn't perfectly stamped. */
pub(crate) fn block_hex_width(b: Block, tile_idx: i32, depth: i32) -> f32 {
    if b == Block::Wood {
        return 0.20;
    }
    if b == Block::Leaves || b == Block::SeqLeaves {
        let mut h = (tile_idx as u32)
            .wrapping_mul(0xDEAD_BEEF)
            .wrapping_add((depth as u32).wrapping_mul(0x0BAD_F00D))
            .wrapping_add(0x1234_5678);
        h ^= h >> 13;
        return 0.65 + ((h & 0xFF) as f32 / 255.0) * 0.35;
    }
    1.00
}

/* Linearly interpolate corner k toward t->center by `width`. At our
 * planet scale the curvature inside a 3 m tile is sub-millimetre, so
 * we don't bother re-projecting onto the unit sphere. */
pub(crate) fn shrink_corner(t: &Tile, k: i32, width: f32) -> DVec3 {
    let offset = dvec3_sub(t.verts[k as usize], t.center);
    dvec3_add(t.center, dvec3_scale(offset, width as f64))
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
 * Water vertices skip the bake and pass 0s - water shader doesn't
 * read those attributes. */
#[allow(clippy::too_many_arguments)]
fn emit_cap(
    out: &mut HexMesh,
    t: &Tile,
    w: &World,
    tile_idx: i32,
    depth: i32,
    block: Block,
    is_top: bool,
    width: f32,
    r_offset_m: f32,
    bake_lighting: bool,
    wet: f32,
) {
    let n = t.num_verts as i32;
    reserve(out, (n + 1) as usize, (n as usize) * 3);
    let center_idx = out.vertices.len() as u32;

    let r_top = w.depth_to_radius_m(depth + 1);
    let r_bot = w.depth_to_radius_m(depth);
    let r = (if is_top { r_top } else { r_bot }) + r_offset_m as f64;

    let normal = if is_top {
        t.center
    } else {
        dvec3_scale(t.center, -1.0)
    };
    let center_pos = dvec3_scale(t.center, r);

    let cap = if is_top { FaceCap::Top } else { FaceCap::Bottom };
    let u0 = blocks::face_tile(block, cap) as f32 * HEX_ATLAS_U_STEP;
    let uc = u0 + HEX_ATLAS_U_STEP * 0.5;
    let vc = 0.5f32;

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
    let voxel = use_voxel_engine();
    let depth_at_air = if voxel {
        let mut d = if is_top { depth + 1 } else { depth - 1 };
        if d < 0 {
            d = 0;
        }
        if d >= WORLD_MAX_DEPTH {
            d = WORLD_MAX_DEPTH - 1;
        }
        d
    } else if is_top {
        depth + 1
    } else {
        depth
    };

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
     * relight_if_needed no longer publishes torches. */
    let mut center_sky = 0.0f32;
    let mut center_block_unused = 0.0f32;
    if bake_lighting {
        if voxel {
            center_sky = sky_light_voxel(w, tile_idx, depth_at_air);
        } else {
            center_sky = sky_light_at(w, tile_idx, depth_at_air);
        }
    }

    let center_torch = if bake_lighting {
        torch_light_at(dvec3_to_vec3(center_pos))
    } else {
        0.0
    };
    push_vertex(out, center_pos, normal, uc, vc, center_sky, center_torch, wet);

    for k in 0..n {
        let corner_dir = shrink_corner(t, k, width);
        let corner = dvec3_scale(corner_dir, r);
        let angle = k as f64 / n as f64 * 6.2831853 - 1.5707963;
        let u = uc + (angle.cos() as f32) * HEX_ATLAS_U_STEP * 0.5;
        let v = vc + (angle.sin() as f32) * 0.5;

        let mut corner_sky = center_sky;
        if bake_lighting && voxel {
            let nbr_a = t.edge_neighbours[((k - 1 + n) % n) as usize];
            let nbr_b = t.edge_neighbours[k as usize];
            smooth_corner_sample(
                w,
                tile_idx,
                nbr_a,
                nbr_b,
                depth_at_air,
                &mut corner_sky,
                &mut center_block_unused,
            );
        }

        let corner_torch = if bake_lighting {
            torch_light_at(dvec3_to_vec3(corner))
        } else {
            0.0
        };
        push_vertex(out, corner, normal, u, v, corner_sky, corner_torch, wet);
    }

    for k in 0..n as u32 {
        let next = (k + 1) % n as u32;
        if is_top {
            out.indices.push(center_idx);
            out.indices.push(center_idx + 1 + k);
            out.indices.push(center_idx + 1 + next);
        } else {
            out.indices.push(center_idx);
            out.indices.push(center_idx + 1 + next);
            out.indices.push(center_idx + 1 + k);
        }
    }
}

/// Atlas columns `[front, left, right, back, top, bottom]` for a tech
/// block drawn as a cube with its ported JS net texture, or `None` for
/// blocks that aren't cube-rendered. Six 16x16 cells sliced from the
/// 48x32 JS net (same cell layout across every machine - verified against
/// the src/planet machine modules). Each machine gets 6 contiguous atlas
/// columns starting at 42.
fn tech_cube_cols(b: Block) -> Option<[u8; 6]> {
    /* Machine order matches the ATLAS_PATHS cube-cell section. */
    let slot = match b {
        Block::Furnace => 0,
        Block::ElectricFurnace => 1,
        Block::Printer3D => 2,
        Block::Computer => 3,
        Block::ElectronicsWorkbench => 4,
        Block::HydroGenerator => 5,
        Block::SteamEngine => 6,
        Block::StorageChest => 7,
        _ => return None,
    };
    let base = 42 + slot * 6;
    Some([base, base + 1, base + 2, base + 3, base + 4, base + 5])
}

/// Emit a cube for a tech block sitting on the hex tile - the JS
/// BoxGeometry look. It is a *true cube* sized to the tile footprint,
/// sitting ON the surface (the JS placed a fixed 0.8 box at
/// `worldPos + up*size/2`), not a slab squashed into the thin voxel layer.
/// Each cube face is UV-mapped to a cell of the ported net texture (front
/// faces a fixed tile tangent for now; player-facing needs stored facing,
/// a later pass). Reuses the terrain vertex format + per-vertex lighting
/// so it draws in the same pass / shader as the world.
fn emit_tech_cube(
    out: &mut HexMesh,
    t: &Tile,
    w: &World,
    tile_idx: i32,
    depth: i32,
    cols: [u8; 6],
    bake_lighting: bool,
) {
    let up = dvec3_normalize(t.center);
    let r_bot = w.depth_to_radius_m(depth);

    /* Cube edge sized from the hex circumradius at the surface (the
     * perpendicular distance from the radial axis to a corner), so the
     * block reads at terrain scale instead of a thin wafer. */
    let c0 = shrink_corner(t, 0, 1.0);
    let d_up = up.x * c0.x + up.y * c0.y + up.z * c0.z;
    let horiz_r = (1.0 - d_up * d_up).max(0.0).sqrt() * r_bot;
    let half = (horiz_r * 0.6).max(0.05);

    /* Tile tangent frame: up = radial; {tangent, bitangent, up} is
     * right-handed (cross(tangent, bitangent) == up). When a facing is
     * stored, the +tangent (front) face points at that tile edge so the
     * machine faces the player who placed it; otherwise a stable default. */
    let nverts = t.num_verts as i32;
    let facing = w.block_entities.facing(tile_idx, depth);
    let tangent = if facing != tenebris_core::block_entity::FACING_UNSET
        && (facing as i32) < nverts
    {
        let k = facing as i32;
        let ca = shrink_corner(t, k, 1.0);
        let cb = shrink_corner(t, (k + 1) % nverts, 1.0);
        let mid = dvec3_scale(dvec3_add(ca, cb), 0.5);
        let d = mid.x * up.x + mid.y * up.y + mid.z * up.z;
        dvec3_normalize(dvec3_sub(mid, dvec3_scale(up, d)))
    } else {
        let reference = if up.y.abs() < 0.9 {
            dvec3_make(0.0, 1.0, 0.0)
        } else {
            dvec3_make(1.0, 0.0, 0.0)
        };
        dvec3_normalize(dvec3_cross(reference, up))
    };
    let bitangent = dvec3_cross(up, tangent);

    /* Cube sits on the tile surface (bottom face at r_bot). */
    let center = dvec3_scale(up, r_bot + half);

    let sky = if bake_lighting {
        let d_air = (depth + 1).min(WORLD_MAX_DEPTH - 1);
        if use_voxel_engine() {
            sky_light_voxel(w, tile_idx, d_air)
        } else {
            sky_light_at(w, tile_idx, d_air)
        }
    } else {
        0.0
    };

    /* One outward quad per face. `a`,`b` span the face with
     * cross(a, b) == normal, so corners wind CCW seen from outside
     * (matches the terrain pipeline's back-cull + CCW front). */
    let quad = |out: &mut HexMesh, normal: DVec3, a: DVec3, b: DVec3, col: u8| {
        let u0 = col as f32 * HEX_ATLAS_U_STEP;
        let u1 = u0 + HEX_ATLAS_U_STEP;
        let fc = dvec3_add(center, dvec3_scale(normal, half));
        let ah = dvec3_scale(a, half);
        let bh = dvec3_scale(b, half);
        let p00 = dvec3_sub(dvec3_sub(fc, ah), bh);
        let p10 = dvec3_sub(dvec3_add(fc, ah), bh);
        let p11 = dvec3_add(dvec3_add(fc, ah), bh);
        let p01 = dvec3_add(dvec3_sub(fc, ah), bh);
        let base = out.vertices.len() as u32;
        for (p, uu, vv) in [(p00, u0, 1.0), (p10, u1, 1.0), (p11, u1, 0.0), (p01, u0, 0.0)] {
            let torch = if bake_lighting { torch_light_at(dvec3_to_vec3(p)) } else { 0.0 };
            push_vertex(out, p, normal, uu, vv, sky, torch, 0.0);
        }
        out.indices.push(base);
        out.indices.push(base + 1);
        out.indices.push(base + 2);
        out.indices.push(base);
        out.indices.push(base + 2);
        out.indices.push(base + 3);
    };

    reserve(out, 24, 36);
    let [c_front, c_left, c_right, c_back, c_top, c_bottom] = cols;
    let neg = |v: DVec3| dvec3_scale(v, -1.0);
    quad(out, tangent, bitangent, up, c_front); /* +tangent front */
    quad(out, neg(tangent), up, bitangent, c_back); /* -tangent back */
    quad(out, bitangent, up, tangent, c_right); /* +bitangent right */
    quad(out, neg(bitangent), tangent, up, c_left); /* -bitangent left */
    quad(out, up, tangent, bitangent, c_top); /* +up top */
    quad(out, neg(up), bitangent, tangent, c_bottom); /* -up bottom */
}

/// Emit a textured box from an orthonormal right-handed frame
/// (`cross(u, v) == ww`) with per-axis half-extents. Every face samples the
/// same atlas column `col`. The building block for the modular wire / pipe
/// connectors: one of these for the central node, one (thin) per arm.
#[allow(clippy::too_many_arguments)]
fn emit_box(
    out: &mut HexMesh,
    center: DVec3,
    u: DVec3,
    v: DVec3,
    ww: DVec3,
    hu: f64,
    hv: f64,
    hw: f64,
    col: u8,
    sky: f32,
    bake_lighting: bool,
) {
    /* `normal` is the outward face axis, `a`,`b` span the face with
     * cross(a, b) == normal (CCW seen from outside, matching the terrain
     * back-cull pipeline). `ext_n` is the half-extent along the normal,
     * `ha`/`hb` the half-extents along a/b. */
    let face =
        |out: &mut HexMesh, normal: DVec3, a: DVec3, b: DVec3, ext_n: f64, ha: f64, hb: f64| {
            let u0 = col as f32 * HEX_ATLAS_U_STEP;
            let u1 = u0 + HEX_ATLAS_U_STEP;
            let fc = dvec3_add(center, dvec3_scale(normal, ext_n));
            let ah = dvec3_scale(a, ha);
            let bh = dvec3_scale(b, hb);
            let p00 = dvec3_sub(dvec3_sub(fc, ah), bh);
            let p10 = dvec3_sub(dvec3_add(fc, ah), bh);
            let p11 = dvec3_add(dvec3_add(fc, ah), bh);
            let p01 = dvec3_add(dvec3_sub(fc, ah), bh);
            let base = out.vertices.len() as u32;
            for (p, uu, vv) in [(p00, u0, 1.0), (p10, u1, 1.0), (p11, u1, 0.0), (p01, u0, 0.0)] {
                let torch = if bake_lighting { torch_light_at(dvec3_to_vec3(p)) } else { 0.0 };
                push_vertex(out, p, normal, uu, vv, sky, torch, 0.0);
            }
            out.indices.push(base);
            out.indices.push(base + 1);
            out.indices.push(base + 2);
            out.indices.push(base);
            out.indices.push(base + 2);
            out.indices.push(base + 3);
        };
    let neg = |x: DVec3| dvec3_scale(x, -1.0);
    reserve(out, 24, 36);
    face(out, u, v, ww, hu, hv, hw); /* +u: cross(v,ww)=u   */
    face(out, neg(u), ww, v, hu, hw, hv); /* -u: cross(ww,v)=-u  */
    face(out, v, ww, u, hv, hw, hu); /* +v: cross(ww,u)=v   */
    face(out, neg(v), u, ww, hv, hu, hw); /* -v: cross(u,ww)=-v  */
    face(out, ww, u, v, hw, hu, hv); /* +ww: cross(u,v)=ww  */
    face(out, neg(ww), v, u, hw, hv, hu); /* -ww: cross(v,u)=-ww */
}

/// Render a modular wire / pipe block (cable or copper pipe) as a small
/// central node plus a thin arm toward every adjacent cell that continues the
/// network - another of the same link block, or any tech machine it abuts.
/// Mirrors the JS `createConnectorMesh` look (node box + connector boxes)
/// rather than a full hex prism, so a run of cables / pipes reads as wiring.
/// `node_frac` scales the node off the tile circumradius (pipes are fatter
/// than cables); each arm reaches the shared face (half the cell gap) so two
/// adjacent connectors meet in the middle without overlapping.
#[allow(clippy::too_many_arguments)]
fn emit_wire(
    out: &mut HexMesh,
    t: &Tile,
    w: &World,
    tile_idx: i32,
    depth: i32,
    link: Block,
    col: u8,
    node_frac: f64,
    bake_lighting: bool,
) {
    let up = dvec3_normalize(t.center);
    let r_bot = w.depth_to_radius_m(depth);

    let c0 = shrink_corner(t, 0, 1.0);
    let d_up = up.x * c0.x + up.y * c0.y + up.z * c0.z;
    let horiz_r = (1.0 - d_up * d_up).max(0.0).sqrt() * r_bot;
    let node = (horiz_r * node_frac).max(0.03);

    /* Node sits on the tile surface, centred a node-height above r_bot so it
     * shares the resting plane with the cube machines it links to. */
    let center = dvec3_scale(up, r_bot + node);

    let sky = if bake_lighting {
        let d_air = (depth + 1).min(WORLD_MAX_DEPTH - 1);
        if use_voxel_engine() {
            sky_light_voxel(w, tile_idx, d_air)
        } else {
            sky_light_at(w, tile_idx, d_air)
        }
    } else {
        0.0
    };

    /* Stable tile-tangent frame for the node cube (wires have no facing). */
    let reference = if up.y.abs() < 0.9 {
        dvec3_make(0.0, 1.0, 0.0)
    } else {
        dvec3_make(1.0, 0.0, 0.0)
    };
    let tangent = dvec3_normalize(dvec3_cross(reference, up));
    let bitangent = dvec3_cross(up, tangent);
    emit_box(out, center, tangent, bitangent, up, node, node, node, col, sky, bake_lighting);

    /* Thin arm to each connected neighbour. */
    let arm_r = node * 0.5;
    for (nt, nd) in w.power_neighbors(tile_idx, depth) {
        let nb = w.get(nt, nd);
        if nb != link && !blocks::is_tech_block(nb) {
            continue;
        }
        /* Neighbour node centre: radial for a depth change (same tile),
         * the neighbour tile-centre direction for a same-depth hex link. */
        let target = if nt == tile_idx {
            let nr = w.depth_to_radius_m(nd);
            dvec3_scale(up, nr + node)
        } else if let Some(ntile) = w.grid.tile(nt) {
            let ndir = dvec3_normalize(ntile.center);
            dvec3_scale(ndir, r_bot + node)
        } else {
            continue;
        };
        let to = dvec3_sub(target, center);
        let len = (to.x * to.x + to.y * to.y + to.z * to.z).sqrt();
        if len < 1e-6 {
            continue;
        }
        let dir = dvec3_scale(to, 1.0 / len);
        /* Reach to the shared face (quarter-gap centre, quarter-gap half). */
        let mid = dvec3_add(center, dvec3_scale(dir, len * 0.25));
        let arm_half = len * 0.25;
        let ref2 = if dir.y.abs() < 0.9 {
            dvec3_make(0.0, 1.0, 0.0)
        } else {
            dvec3_make(1.0, 0.0, 0.0)
        };
        let p1 = dvec3_normalize(dvec3_cross(ref2, dir));
        let p2 = dvec3_cross(dir, p1);
        emit_box(out, mid, dir, p1, p2, arm_half, arm_r, arm_r, col, sky, bake_lighting);
    }
}

/// Atlas column for a rocket part's in-world cube (the part's item icon on
/// every face). Columns 90..92 hold the three part icons.
fn rocket_part_col(id: u16) -> u8 {
    use tenebris_core::rocket::PartRole;
    match tenebris_core::rocket::part_role(id) {
        Some(PartRole::Engine) => 90,
        Some(PartRole::FuelTank) => 91,
        Some(PartRole::Capsule) => 92,
        None => 90,
    }
}

/// Emit the assembled rocket as a column of cubes sitting ON TOP of a launch
/// pad (bottom part first), mirroring the JS stacked BoxGeometry parts. Each
/// part is a cube textured with its item icon; they rise radially from the
/// pad's top surface.
fn emit_rocket_stack(
    out: &mut HexMesh,
    t: &Tile,
    w: &World,
    tile_idx: i32,
    depth: i32,
    parts: &[u16],
    bake_lighting: bool,
) {
    let up = dvec3_normalize(t.center);
    /* Pad top surface = top of the pad voxel. */
    let r_pad_top = w.depth_to_radius_m(depth + 1);

    let c0 = shrink_corner(t, 0, 1.0);
    let d_up = up.x * c0.x + up.y * c0.y + up.z * c0.z;
    let horiz_r = (1.0 - d_up * d_up).max(0.0).sqrt() * r_pad_top;
    let half = (horiz_r * 0.42).max(0.05);

    /* Stable tile-tangent frame (parts have no facing of their own). */
    let reference = if up.y.abs() < 0.9 {
        dvec3_make(0.0, 1.0, 0.0)
    } else {
        dvec3_make(1.0, 0.0, 0.0)
    };
    let tangent = dvec3_normalize(dvec3_cross(reference, up));
    let bitangent = dvec3_cross(up, tangent);

    let sky = if bake_lighting {
        let d_air = (depth + 1).min(WORLD_MAX_DEPTH - 1);
        if use_voxel_engine() {
            sky_light_voxel(w, tile_idx, d_air)
        } else {
            sky_light_at(w, tile_idx, d_air)
        }
    } else {
        0.0
    };

    for (i, &id) in parts.iter().enumerate() {
        let col = rocket_part_col(id);
        /* Stack centre: pad top + half + 2*half per part below this one. */
        let cz = r_pad_top + half + (2.0 * half) * (i as f64);
        let center = dvec3_scale(up, cz);
        emit_box(out, center, tangent, bitangent, up, half, half, half, col, sky, bake_lighting);
    }
}

/* Side quad between inner and outer radius across two adjacent corners.
 * One quad per tile edge per exposed depth. `width` shrinks the corners
 * inward toward t->center so partial-width blocks (trunks) get a
 * narrower side face.
 *
 * Sky_light is taken at the top of the block (depth + 1) - the column
 * above that depth determines how much sky reaches the side face, and
 * we apply the same value to inner + outer corners since a one-block-
 * tall side doesn't have meaningful vertical variation. Torch light
 * is per-vertex (the world-space corner positions differ enough that
 * the inverse-square sum can split across nearby flames). */
#[allow(clippy::too_many_arguments)]
fn emit_side_quad(
    out: &mut HexMesh,
    t: &Tile,
    w: &World,
    tile_idx: i32,
    depth: i32,
    k_a: i32,
    k_b: i32,
    r_bot: f64,
    r_top: f64,
    block: Block,
    width: f32,
    wet: f32,
) {
    let corner_a = shrink_corner(t, k_a, width);
    let corner_b = shrink_corner(t, k_b, width);
    let inner_a = dvec3_scale(corner_a, r_bot);
    let inner_b = dvec3_scale(corner_b, r_bot);
    let outer_a = dvec3_scale(corner_a, r_top);
    let outer_b = dvec3_scale(corner_b, r_top);

    let edge = dvec3_sub(inner_b, inner_a);
    let up = dvec3_sub(outer_a, inner_a);
    let normal = dvec3_normalize(dvec3_cross(edge, up));

    reserve(out, 4, 6);
    let base = out.vertices.len() as u32;

    let u0 = blocks::face_tile(block, FaceCap::Side) as f32 * HEX_ATLAS_U_STEP;
    let u1 = u0 + HEX_ATLAS_U_STEP;

    let voxel = use_voxel_engine();
    /* Per-corner sky / torch values. Sky uses the voxel grid (top vs
     * bottom corners sample different depths so a tall side face
     * shows the vertical gradient + AO), torch uses the per-vertex
     * proximity sum from torch_light_at(). Block-light from the BFS
     * grid is discarded (BFS no longer carries torches). */
    let mut sky_top_a = 0.0f32;
    let mut sky_top_b = 0.0f32;
    let mut sky_bot_a = 0.0f32;
    let mut sky_bot_b = 0.0f32;
    let mut bl_unused = 0.0f32;
    if voxel {
        let n = t.num_verts as i32;
        /* Edge k spans corner k_a -> k_b, so the across-face neighbour
         * is edge_neighbours[k_a]. Corner k_a is bounded by edges
         * (k_a-1, k_a); corner k_b by edges (k_a, k_a+1). The shared
         * "across" edge is k_a for both, plus one outboard edge each. */
        let edge_k = k_a;
        let nbr_a_outboard = t.edge_neighbours[((k_a - 1 + n) % n) as usize];
        let nbr_b_outboard = t.edge_neighbours[(k_b % n) as usize];
        let nbr_across = t.edge_neighbours[edge_k as usize];
        /* Top corners: air at depth+1 (above this block - either the
         * column air going up, or open sky). */
        smooth_corner_sample(
            w,
            tile_idx,
            nbr_a_outboard,
            nbr_across,
            depth + 1,
            &mut sky_top_a,
            &mut bl_unused,
        );
        smooth_corner_sample(
            w,
            tile_idx,
            nbr_across,
            nbr_b_outboard,
            depth + 1,
            &mut sky_top_b,
            &mut bl_unused,
        );
        /* Bottom corners: try depth first (cells AT the bottom-of-face
         * height - e.g. cave interior air on the side of a tall wall).
         * If every sampled tile at that depth is solid (the wall is
         * sitting on a flat surface where the air above the floor
         * resumes at depth+1), fall back to the top-corner depth so
         * the bottom doesn't read pitch black. This matches the
         * "shadow cells should only be incrementally darker than
         * adjacent cells" rule: a floor-level corner always has SOME
         * adjacent air to derive light from, never a hard 0. */
        let n_bot_a = smooth_corner_sample_n(
            w,
            tile_idx,
            nbr_a_outboard,
            nbr_across,
            depth,
            &mut sky_bot_a,
            &mut bl_unused,
        );
        if n_bot_a == 0 {
            sky_bot_a = sky_top_a;
        }
        let n_bot_b = smooth_corner_sample_n(
            w,
            tile_idx,
            nbr_across,
            nbr_b_outboard,
            depth,
            &mut sky_bot_b,
            &mut bl_unused,
        );
        if n_bot_b == 0 {
            sky_bot_b = sky_top_b;
        }
    } else {
        /* Legacy column-engine path: sky shared across the quad. */
        let legacy_sky = sky_light_at(w, tile_idx, depth + 1);
        sky_top_a = legacy_sky;
        sky_top_b = legacy_sky;
        sky_bot_a = legacy_sky;
        sky_bot_b = legacy_sky;
    }
    /* Torch contribution is the per-vertex proximity sum on every
     * path - additive layer, no BFS, no occlusion. */
    let t_ia = torch_light_at(dvec3_to_vec3(inner_a));
    let t_ib = torch_light_at(dvec3_to_vec3(inner_b));
    let t_oa = torch_light_at(dvec3_to_vec3(outer_a));
    let t_ob = torch_light_at(dvec3_to_vec3(outer_b));

    push_vertex(out, inner_a, normal, u0, 0.0, sky_bot_a, t_ia, wet);
    push_vertex(out, inner_b, normal, u1, 0.0, sky_bot_b, t_ib, wet);
    push_vertex(out, outer_b, normal, u1, 1.0, sky_top_b, t_ob, wet);
    push_vertex(out, outer_a, normal, u0, 1.0, sky_top_a, t_oa, wet);

    out.indices.push(base);
    out.indices.push(base + 1);
    out.indices.push(base + 2);
    out.indices.push(base);
    out.indices.push(base + 2);
    out.indices.push(base + 3);
}

/* Overwrite the UV channel of a span of just-emitted water cap vertices
 * with the cell's flow direction projected into the tile's local tangent
 * plane. The water shader reads the UV as a per-vertex flow vector and
 * pans the surface noise along it, so the visible pattern streams away
 * from the source.
 *
 * The projection uses the SAME arbitrary tangent basis the fragment
 * shader builds (any non-parallel axis crossed twice with the face
 * normal), so the 2D coords we bake here match the basis the shader
 * reconstructs in world space. Tile center IS the cap face normal.
 *
 * Cells with no origin entry (worldgen-spawned ocean, player-placed
 * sources, sleeping cells) cause world_water::flow_direction to return
 * false; in that case we bake (0, 0) and the shader's flow_pan term
 * collapses to zero. This is the SPAWN-vs-FLOW distinction the user
 * spec calls out: spawn blocks stay static, flow blocks pan. */
fn bake_water_flow_uv(
    out: &mut HexMesh,
    t: &Tile,
    w: &World,
    tile_idx: i32,
    depth: i32,
    v_begin: u32,
    v_end: u32,
) {
    let mut flow_world = [0.0f32; 3];
    let mut fu = 0.0f32;
    let mut fv = 0.0f32;
    if world_water::flow_direction(w, tile_idx, depth, &mut flow_world) {
        let n_d = t.center;
        let mut tu = if n_d.x.abs() > 0.9 {
            dvec3_make(0.0, 1.0, 0.0)
        } else {
            dvec3_make(1.0, 0.0, 0.0)
        };
        let dot_un = tu.x * n_d.x + tu.y * n_d.y + tu.z * n_d.z;
        tu = dvec3_sub(tu, dvec3_scale(n_d, dot_un));
        tu = dvec3_normalize(tu);
        let tv = dvec3_cross(n_d, tu);
        fu = (flow_world[0] as f64 * tu.x + flow_world[1] as f64 * tu.y
            + flow_world[2] as f64 * tu.z) as f32;
        fv = (flow_world[0] as f64 * tv.x + flow_world[1] as f64 * tv.y
            + flow_world[2] as f64 * tv.z) as f32;
    }
    for vi in v_begin..v_end {
        out.vertices[vi as usize].uv[0] = fu;
        out.vertices[vi as usize].uv[1] = fv;
    }
}

/* ----------------------------------------------------------------------- */
/* Water cap - one hexagon/pentagon drawn at sea level above tiles
 * whose voxel column actually has a water cell at sea level. Tile
 * surface stays opaque (sand/stone); water is a separate translucent
 * pass on top.
 *
 * The gate is voxel-local and dynamic: render iff the cell at
 * SEA_LEVEL_DEPTH-1 (the layer whose top face sits at sea level) is
 * BLOCK_WATER. This matches the user's mental model - "water cells
 * are the cells that border a body of water". Consequences:
 *   - inland holes never get a cap (the column has dirt/stone/grass
 *     at depth 63, never water);
 *   - digging out a sea-level water cell removes the cap from that
 *     tile (you punched a void through the ocean);
 *   - sand-topped beach tiles have SAND at depth 63 -> no cap on the
 *     beach itself, only on the deeper ocean tiles next door. The
 *     ocean visually terminates at the sand silhouette, which reads
 *     as a beach.
 *
 * world::set already dirties the modified tile + neighbours, so any
 * edit that crosses depth 63 triggers a remesh of this tile next
 * frame. */

const SEA_LEVEL_DEPTH: i32 = 64; /* must match world.rs's SEA_LEVEL_IDX */

/// Port of `hex_mesh_build_water()`. Emit ONE hex/pent water cap at
/// sea level if the tile has a water column (surface below sea). The
/// water shader animates this cap with sin-based waves and
/// alpha-blends it.
pub fn build_water(out: &mut HexMesh, w: &World, tile_idx: i32) {
    let t = match w.grid.tile(tile_idx) {
        Some(t) => t,
        None => return,
    };
    if w.get(tile_idx, SEA_LEVEL_DEPTH - 1) != Block::Water {
        return;
    }

    /* Drop the water cap below the un-offset sea-level radius so the
     * vertex shader's wave swell can't push crests above neighbour
     * beach sand (which sits exactly at sea level on the shoreline -
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
    let depth_off = config::water().depth_offset_m;
    let height_off = config::water().height_offset_m;

    /* Bake the per-vertex sky_light + torch_light for water cap
     * vertices too. Sky-light reads as 1.0 on an unobstructed ocean
     * surface (column above sea level is empty), but drops to the
     * usual exp(-blocked * 0.55) under any roof a player builds over
     * the water - so water in a covered cove dims correctly without
     * a special path. Torch-light is the user-facing reason: a torch
     * placed on a pier or shoreline now spills its warm circle onto
     * the water beside it, exactly like it spills onto the land. */
    let v_before = out.vertices.len() as u32;
    emit_cap(
        out,
        t,
        w,
        tile_idx,
        SEA_LEVEL_DEPTH - 1,
        Block::Water,
        true,
        1.0,
        -depth_off + height_off,
        true, /* bake sky/torch lighting */
        1.0,  /* the water cap IS water */
    );
    /* emit_cap writes per-vertex atlas-tile UVs (uc/vc centre + cos/sin
     * displaced corners around the hex), but the water shader reads the
     * UV channel as a per-cell flow direction. Without overwriting, the
     * shader reconstructs a radially varying "flow vector" across each
     * tile centre and the noise pattern visibly stretches outward -
     * the wrong-looking effect the user spec calls out.
     *
     * Bake the cell's actual flow direction here. Worldgen-spawned
     * ocean cells have no origins, so flow_direction returns false and
     * we write (0, 0) - the cap stays static, matching the "spawn
     * blocks don't flow" rule. Cells the simulator marks as flowing
     * (an ocean cap cell next to a player obstacle, water that flowed
     * off a hill and landed at sea level) get a real direction baked
     * and pan correctly. */
    let v_end = out.vertices.len() as u32;
    bake_water_flow_uv(out, t, w, tile_idx, SEA_LEVEL_DEPTH - 1, v_before, v_end);
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
 * Reads world_water::get_state(); cells with state == 0 (the legacy
 * worldgen-filled ocean below sea level, anything the simulator
 * hasn't touched yet) are treated as full sources for the height
 * calc, so the deep ocean stays at full cell height instead of
 * shrinking to film. */

fn water_cap_offset_for_level(
    level: i32,
    cfg_max_level: i32,
    min_film_fraction: f32,
    curve_power: f32,
    surface_off: f32,
) -> f32 {
    /* Map level (0..cfg_max_level) to a radial offset in metres,
     * relative to the cell's nominal top radius.
     *
     * Two stacked offsets:
     *
     *   surface_off       Always applied. Mirrors the planet ocean
     *                     cap's -depth_offset_m + height_offset_m so
     *                     wave-shader swell can't push crests above
     *                     adjacent solid voxel tops. A level-0 source
     *                     therefore renders just below the cell's
     *                     nominal top, exactly like an ocean cell.
     *
     *   curve drop        Level-driven falloff. Linear (power=1) treats
     *                     every step the same and makes near-source
     *                     cells render near full height, which reads as
     *                     a "mountain" piling up at the source. Power
     *                     ~2 (the YAML default) gives each step a
     *                     larger drop than the previous one - distant
     *                     water reaches the thin-film floor quickly and
     *                     visually cascades over edges instead.
     *
     * The film fraction keeps the level=max cap from collapsing to a
     * zero-height quad. Block height is 1 m (BLOCK_HEIGHT in world.rs)
     * so the (1 - min_film) factor is in metres directly. */
    let mut level = level;
    if cfg_max_level <= 0 {
        return surface_off;
    }
    if level <= 0 {
        return surface_off;
    }
    if level > cfg_max_level {
        level = cfg_max_level;
    }
    let frac = level as f32 / cfg_max_level as f32;
    let mut curve_power = curve_power;
    if curve_power < 1.0 {
        curve_power = 1.0;
    }
    let curve = frac.powf(curve_power);
    surface_off - curve * (1.0 - min_film_fraction)
}

/* True when the (tile, depth) cell is BLOCK_WATER and should render
 * its sides / caps - i.e. it's an actual water voxel. (Unused in the
 * C tree too; kept for 1:1 parity.) */
fn water_voxel_at(w: &World, tile: i32, depth: i32) -> bool {
    if tile < 0 || tile >= w.tile_count {
        return false;
    }
    if depth < 0 || depth >= WORLD_MAX_DEPTH {
        return false;
    }
    w.blocks[(tile * WORLD_MAX_DEPTH + depth) as usize] == Block::Water.raw()
}

/* Effective render level for a water cell. Source / falling / sleeping
 * cells (state byte 0 or source flag set) render at level 0 (full
 * height); falling water also renders full so a vertical stream looks
 * continuous instead of pinching at every cell boundary. Flowing
 * cells return their stored level, clamped to cfg_max_level. */
fn water_render_level(state: u8, cfg_max_level: i32) -> i32 {
    if state == 0u8 {
        return 0;
    }
    if world_water::state_is_source(state) {
        return 0;
    }
    if world_water::state_is_falling(state) {
        return 0;
    }
    let mut level = world_water::state_level(state);
    if level < 0 {
        level = 0;
    }
    if level > cfg_max_level {
        level = cfg_max_level;
    }
    level
}

/* Effective render level taking the column above into account. When the
 * cell directly above is water, the surface lives up there, not within
 * this cell - render us at full height so caps + walls meet the cell
 * above seamlessly. Used for our own cell AND when comparing to a
 * water neighbour, so both sides agree on where the wall strip belongs. */
fn water_render_level_at(w: &World, tile: i32, depth: i32, cfg_max_level: i32) -> i32 {
    let state = world_water::get_state(w, tile, depth);
    if depth + 1 < WORLD_MAX_DEPTH
        && w.blocks[(tile as usize) * WORLD_MAX_DEPTH as usize + (depth + 1) as usize]
            == Block::Water.raw()
    {
        return 0;
    }
    water_render_level(state, cfg_max_level)
}

/// Port of `hex_mesh_build_water_voxels()`. Emit per-voxel water
/// geometry for water cells in this tile's column that are NOT covered
/// by the sea-level ocean cap (above-ground streams, cave pools,
/// anywhere flowing water might settle outside the planet-wide ocean).
///
/// Cap height drops with the flow level from world_water's state byte
/// (sources / sleeping ocean / falling render at full height; flowing
/// cells render shorter); side faces follow the section-9 table in
/// water.md:
///   - air neighbour              -> full-height side face
///   - same-level water neighbour -> skip (caps connect)
///   - lower-level water neighbour
///     (this cell taller)         -> emit partial strip from neighbour's
///                                    cap up to ours
///   - higher-level water neighbour
///     (this cell shorter)        -> skip (neighbour emits the strip)
///   - solid neighbour            -> skip (hidden behind solid)
///
/// Emits into the same mesh as `build_water` so the renderer draws
/// both through the water pipeline (translucent / animated).
pub fn build_water_voxels(out: &mut HexMesh, w: &World, tile_idx: i32) {
    let t = match w.grid.tile(tile_idx) {
        Some(t) => t,
        None => return,
    };
    let col_base = (tile_idx as usize) * WORLD_MAX_DEPTH as usize;

    let wf = config::water_flow();
    let mut cfg_max_level = wf.max_level;
    if cfg_max_level < 1 {
        cfg_max_level = 1;
    }
    if cfg_max_level > world_water::WATER_LEVEL_MAX {
        cfg_max_level = world_water::WATER_LEVEL_MAX;
    }
    let mut min_film = wf.min_film_fraction;
    if min_film < 0.0 {
        min_film = 0.0;
    }
    if min_film > 1.0 {
        min_film = 1.0;
    }
    let curve_power = wf.cap_curve_power;

    /* Apply the same surface drop the planet-wide ocean cap uses, so
     * the wave-shader swell can't push per-voxel water crests above
     * adjacent solid voxel tops. depth_offset_m drops the surface;
     * height_offset_m is the creative water-level knob layered on top
     * (positive = raise water, negative = lower). Single read per
     * call - read once outside the per-voxel loop. */
    let wc = config::water();
    let surface_off = -wc.depth_offset_m + wc.height_offset_m;

    let n = t.num_verts as i32;

    for d in 0..WORLD_MAX_DEPTH {
        if w.blocks[col_base + d as usize] != Block::Water.raw() {
            continue;
        }

        let level = water_render_level_at(w, tile_idx, d, cfg_max_level);
        let mut cap_offset =
            water_cap_offset_for_level(level, cfg_max_level, min_film, curve_power, surface_off);

        /* Sea-level row's TOP cap is owned by the planet-wide ocean
         * cap in build_water - emitting it here too would Z-fight
         * with the wave-displaced ocean surface. Side faces + bottom
         * cap still come from this loop, otherwise an air pocket
         * adjacent to the ocean at sea level shows no water walls
         * (the bug: dig a tunnel right under the shoreline and the
         * ocean appears to end mid-air against the dirt).
         *
         * At the sea-level row the side faces must end at the SAME
         * radius the ocean cap is drawn at. The cap helper already
         * bakes surface_off into a level-0 cell, so a sleeping ocean
         * cell here matches the ocean cap automatically; only flowing
         * cells at this depth need the override so a flowing strip
         * meeting the ocean doesn't pinch below the cap. */
        let is_sea_level_row = d == SEA_LEVEL_DEPTH - 1;
        if is_sea_level_row {
            cap_offset = surface_off;
        }

        /* ---- Top cap.
         * Skip when the cell above is itself water - the two cells
         * connect through the column and the upper cap is what the
         * player actually sees. Solid above also covers (no cap
         * needed). Anything else (air, leaves) shows the cap. The
         * sea-level row defers its top to the ocean-cap path. */
        let above = if d + 1 < WORLD_MAX_DEPTH {
            w.blocks[col_base + (d + 1) as usize]
        } else {
            Block::Air.raw()
        };
        if !is_sea_level_row && above != Block::Water.raw() && !covers_face_raw(above) {
            let v_before = out.vertices.len() as u32;
            emit_cap(
                out,
                t,
                w,
                tile_idx,
                d,
                Block::Water,
                /*is_top=*/ true,
                /*width=*/ 1.0,
                /*r_offset_m=*/ cap_offset,
                /*bake_lighting=*/ true,
                /*wet=*/ 1.0,
            );
            let v_end = out.vertices.len() as u32;
            bake_water_flow_uv(out, t, w, tile_idx, d, v_before, v_end);
        }

        /* ---- Bottom cap.
         * Emit only when the cell below is air - the underside of a
         * suspended pool. Water-on-solid (the common case) hides the
         * bottom; water-on-water connects through the column. */
        if d > 0 {
            let below = w.blocks[col_base + (d - 1) as usize];
            if below == Block::Air.raw() {
                emit_cap(
                    out,
                    t,
                    w,
                    tile_idx,
                    d,
                    Block::Water,
                    /*is_top=*/ false,
                    /*width=*/ 1.0,
                    /*r_offset_m=*/ 0.0,
                    /*bake_lighting=*/ true,
                    /*wet=*/ 1.0,
                );
            }
        }

        /* ---- Side faces (section 9 table). */
        let r_bot = w.depth_to_radius_m(d);
        let r_top_full = w.depth_to_radius_m(d + 1);
        let mut r_top_cap = r_top_full + cap_offset as f64;

        /* When the cell directly above us is also water, the visible
         * water surface is up there - not on us. Our side wall must
         * extend all the way to the voxel boundary so it meets the
         * cell above's wall without a gap. Using r_top_cap here
         * (which sits cap_offset BELOW the boundary for any flowing
         * level) leaves a 5-50 cm horizontal band of missing wall
         * between every pair of stacked water cells - the "short
         * wall segments along the column" symptom. The top-cap path
         * already skips drawing a horizontal cap when above is water;
         * the side wall needs the same treatment.
         *
         * The step-strip math below uses r_top_cap to decide how
         * tall our partial wall over a shorter neighbour is. When
         * we're connected upward, that step is owned by whichever
         * cell in our stack is actually at the surface, not by us -
         * we just want a flush wall to the boundary. So promote
         * r_top_cap to r_top_full for the whole side loop when above
         * is water. */
        if above == Block::Water.raw() {
            r_top_cap = r_top_full;
        }

        for k in 0..n {
            let next = (k + 1) % n;
            let nb = t.edge_neighbours[k as usize];
            let nb_b = if nb >= 0 {
                w.blocks[(nb as usize) * WORLD_MAX_DEPTH as usize + d as usize]
            } else {
                Block::Air.raw()
            };

            /* Per-edge wall-top override. Normally our wall on this
             * edge ends at r_top_cap (the dipped water surface). But
             * if the neighbour ONE LAYER UP at this edge is water, its
             * wall on this edge starts at the voxel boundary r_top_full
             * - and our wall stopping below that boundary leaves an
             * exposed band exactly cap_offset metres tall between the
             * two cells. User report (annotated screenshot, two red
             * arrows): "if a water block = flow and borders another
             * water block that is height + 1, then generate that
             * extra wall segment". This is that wall segment.
             *
             * Bridges the same way the above==WATER fix bridges
             * stacked water in the same column - both cases boil down
             * to "if the upper boundary is occupied by water, ride the
             * wall up to the boundary so the joins are flush". */
            let mut r_top_edge = r_top_cap;
            if nb >= 0 && d + 1 < WORLD_MAX_DEPTH {
                let nb_above =
                    w.blocks[(nb as usize) * WORLD_MAX_DEPTH as usize + (d + 1) as usize];
                if nb_above == Block::Water.raw() {
                    r_top_edge = r_top_full;
                }
            }

            if nb_b == Block::Water.raw() {
                /* Sea-level row: every water cell here visually
                 * aligns with the planet-wide ocean cap regardless
                 * of its flow level (cap_offset overridden above to
                 * the ocean-cap drop). The partial-strip math below
                 * recomputes the neighbour's cap from its raw level
                 * WITHOUT that override, so it would emit a phantom
                 * 5-10 cm tall vertical strip floating at the ocean
                 * surface - visible as a dark wall in the middle of
                 * what looks like flat water. Skip strips entirely
                 * at sea level: all water there is one continuous
                 * body, which is what MC does too. */
                if is_sea_level_row {
                    continue;
                }

                /* Water-to-water: emit a strip when WE'RE taller
                 * (our level < neighbour's level - lower level number =
                 * higher cap). Equal-or-shorter normally falls through
                 * to "neighbour handles it" - BUT if neither of us is
                 * taller at depth d, AND the neighbour has water one
                 * layer up (nb_above == WATER), then nb's wall at d+1
                 * starts at the voxel boundary r_top_full while our
                 * cap stops at r_top_cap below the boundary. Nobody
                 * emits anything on either side at depth d and the
                 * resulting cap_offset-tall band is exposed. Emit the
                 * gap-filling strip ourselves before continuing. */
                let nb_level = water_render_level_at(w, nb, d, cfg_max_level);
                if level >= nb_level {
                    if r_top_edge > r_top_cap + 1e-4 {
                        /* Swap k/next so the quad's outward normal
                         * flips - the cross(edge, up) formula in
                         * emit_side_quad reverses when the edge
                         * direction reverses. The gap is in OUR
                         * column's air pocket (above our cap, below
                         * the boundary that nb's d+1 wall starts at),
                         * so the visible water-air interface faces
                         * INTO our column, not OUT toward nb. The
                         * default outward normal (from us toward nb)
                         * would back-face cull from a viewer standing
                         * in our air looking sideways at the step -
                         * exactly the angle the screenshot is taken
                         * from, exactly the "is it backwards?" the
                         * user called out. Inverted winding emits
                         * the wall with normal pointing toward us
                         * instead. */
                        emit_side_quad(
                            out,
                            t,
                            w,
                            tile_idx,
                            d,
                            next,
                            k,
                            r_top_cap,
                            r_top_edge,
                            Block::Water,
                            /*width=*/ 1.0,
                            /*wet=*/ 1.0,
                        );
                    }
                    continue;
                }
                let nb_cap_offset = water_cap_offset_for_level(
                    nb_level,
                    cfg_max_level,
                    min_film,
                    curve_power,
                    surface_off,
                );
                let r_strip_bot = r_top_full + nb_cap_offset as f64;
                let r_strip_top = r_top_edge;
                if r_strip_top - r_strip_bot > 1e-4 {
                    emit_side_quad(
                        out,
                        t,
                        w,
                        tile_idx,
                        d,
                        k,
                        next,
                        r_strip_bot,
                        r_strip_top,
                        Block::Water,
                        /*width=*/ 1.0,
                        /*wet=*/ 1.0,
                    );
                }
                continue;
            }

            if covers_face_raw(nb_b) {
                /* Solid neighbour hides the side - water is behind it. */
                continue;
            }

            /* Air (or transparent / non-covering): emit the full side
             * face from r_bot up to our cap (or up to the voxel
             * boundary if the cell one layer up at this edge has
             * water - r_top_edge folded that case in already). */
            emit_side_quad(
                out,
                t,
                w,
                tile_idx,
                d,
                k,
                next,
                r_bot,
                r_top_edge,
                Block::Water,
                /*width=*/ 1.0,
                /*wet=*/ 1.0,
            );
        }
    }
}

/* ----------------------------------------------------------------------- */

/// Port of `hex_mesh_build_tile()`. Build the opaque geometry for a
/// single tile: top/bottom caps of the solid column and any side faces
/// where a neighbor is shorter.
pub fn build_tile(out: &mut HexMesh, w: &World, tile_idx: i32) {
    let t = match w.grid.tile(tile_idx) {
        Some(t) => t,
        None => return,
    };

    let n = t.num_verts as i32;
    let col_base = (tile_idx * WORLD_MAX_DEPTH) as usize;

    /* Iterate every solid voxel. For each, emit:
     *   - a top cap if the voxel above doesn't fully cover this face
     *     (covers air / water / ice / leaves, and crucially WOOD too -
     *     so the grass under a tree trunk still gets its top drawn)
     *   - a bottom cap when the block below doesn't cover (used by
     *     leaf canopies - air below the lowest leaves) - but never at
     *     d=0, where bedrock must hide the planet's hollow interior
     *   - side quads when any neighbor at the same depth doesn't cover
     *
     * Width comes from block_hex_width: 1.0 default, 0.4 for wood
     * trunks, 0.65-1.0 hash-driven for leaves so the canopy isn't
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
     *   - ocean tiles (own cap)            -> wet below sea (ok)
     *   - beach tiles next to ocean        -> wet below sea (ok)
     *   - inland tiles past the shoreline  -> dry, even if dug deep (ok)
     * Closed inland caves dug far from any water no longer fog. The
     * 1-ring approximation can leave a 2nd-ring shore pit slightly
     * dry; bump to a wider ring if that case shows up in screenshots.
     *
     * Computed per-tile (one neighbour scan), not per-face - the
     * water-cap presence doesn't change with depth. */
    let body_wet = w.body.has_water; /* C also NULL-checks w->body; the
                                      * Rust World owns its body copy. */
    let mut near_water = false;
    if body_wet {
        if w.get(tile_idx, SEA_LEVEL_DEPTH - 1) == Block::Water {
            near_water = true;
        } else {
            for i in 0..t.num_neighbors as usize {
                if w.get(t.neighbors[i], SEA_LEVEL_DEPTH - 1) == Block::Water {
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
    let _ = near_water;

    for d in 0..WORLD_MAX_DEPTH {
        let braw = w.blocks[col_base + d as usize];
        if !is_solid_raw(braw) {
            continue;
        }
        /* In-palette by construction (worldgen / set only write palette
         * bytes); Air fallback mirrors World::get's defined-behavior
         * stand-in for the C's raw enum cast. */
        let b = Block::from_raw(braw).unwrap_or(Block::Air);

        /* Tech blocks render as cubes with their ported JS net texture
         * (the JS placed separate BoxGeometry meshes), not hex prisms. */
        if let Some(cols) = tech_cube_cols(b) {
            emit_tech_cube(out, t, w, tile_idx, d, cols, true);
            continue;
        }

        /* Cables / copper pipes are the modular wiring network: render as a
         * thin node + connector arms toward each linked cell, not a hex
         * prism. Cable is the slimmer of the two; copper pipe is fatter. */
        if b == Block::Cable || b == Block::CopperPipe {
            let col = blocks::face_tile(b, FaceCap::Side);
            let node_frac = if b == Block::CopperPipe { 0.22 } else { 0.16 };
            emit_wire(out, t, w, tile_idx, d, b, col, node_frac, true);
            continue;
        }

        /* A launch pad renders as its normal cell (below); additionally,
         * any assembled rocket parts stack up as cubes ON TOP of it. */
        if b == Block::LaunchPad {
            let stack = w
                .block_entities
                .get(tile_idx, d)
                .and_then(|e| e.launch_pad().map(|p| p.parts().to_vec()));
            if let Some(parts) = stack {
                if !parts.is_empty() {
                    emit_rocket_stack(out, t, w, tile_idx, d, &parts, true);
                }
            }
        }

        let width = block_hex_width(b, tile_idx, d);

        let above = if d + 1 < WORLD_MAX_DEPTH {
            w.blocks[col_base + (d + 1) as usize]
        } else {
            Block::Air.raw()
        };
        if !covers_face_raw(above) {
            /* Top cap is wet when the cell directly above is water -
             * looking down through that cell hits this face through
             * water, which is exactly what should trigger the
             * Beer-Lambert dimming. */
            let top_wet = if above == Block::Water.raw() { 1.0 } else { 0.0 };
            emit_cap(out, t, w, tile_idx, d, b, true, width, 0.0, true, top_wet);
        }

        if d > 0 {
            let below = w.blocks[col_base + (d - 1) as usize];
            if !covers_face_raw(below) {
                /* Bottom cap rarely matters (most solid blocks sit on
                 * solid), but the same rule applies: wet only when
                 * the cell below is water. */
                let bot_wet = if below == Block::Water.raw() { 1.0 } else { 0.0 };
                emit_cap(out, t, w, tile_idx, d, b, false, width, 0.0, true, bot_wet);
            }
        }

        let mut any_exposed = false;
        for i in 0..t.num_neighbors as usize {
            let nb = w.get(t.neighbors[i], d);
            if !blocks::covers_face(nb) {
                any_exposed = true;
                break;
            }
        }
        if !any_exposed {
            continue;
        }

        let r_bot = w.depth_to_radius_m(d);
        let r_top = w.depth_to_radius_m(d + 1);
        for k in 0..n {
            let next = (k + 1) % n;
            /* Side face wet: the across-edge neighbour at the same
             * depth. edge_neighbours[k] is the tile across the edge
             * spanning corners k -> k+1, which is exactly the
             * neighbour emit_side_quad samples for AO. Water
             * neighbour -> looking AT this face goes through water,
             * so the underwater dimming fires. Air / solid neighbour
             * -> dry face (the air-pocket-wall case). */
            let nb_tile = t.edge_neighbours[k as usize];
            let nb_b = if nb_tile >= 0 {
                w.get(nb_tile, d)
            } else {
                Block::Air
            };
            let side_wet = if nb_b == Block::Water { 1.0 } else { 0.0 };
            emit_side_quad(
                out, t, w, tile_idx, d, k, next, r_bot, r_top, b, width, side_wet,
            );
        }
    }
}

/* ----------------------------------------------------------------------- */
/* Voxel-engine relight entry point. Idempotent within a frame: the
 * first chunk-rebuild call after a world edit publishes torches and
 * runs the BFS, subsequent calls find the dirty flag cleared and
 * return immediately. */

/// Port of `hex_mesher_relight_if_needed()`. When
/// `config::lighting().engine == voxel`, relight the world's
/// propagated light grid if it's marked dirty. Idempotent within a
/// frame: multiple chunk rebuilds hit the dirty flag once, run the
/// BFS once, and the rest see is_dirty=false and return. Always safe
/// to call; a no-op under the legacy "column" engine.
pub fn relight_if_needed(w: &mut World) {
    /* (C checks `!w || !w->light`; the Rust World always owns its
     * light grid, so the guard drops out.) */
    let cfg = config::lighting();
    if cfg.engine != 1 {
        return;
    }

    /* Torches are NOT seeded into the voxel BFS. They live as a
     * separate additive proximity-only layer baked per-vertex by
     * torch_light_at() in the mesher (inverse-square sum across
     * every torch within torch::LIGHT_RANGE_M, no occlusion test).
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
     * Therefore: no light.set_torches() call here. The grid's
     * block channel stays at zero across the planet; the mesher
     * ignores it when sampling per-vertex torch contribution. */

    /* Sky / AO relight only fires if a block edit landed; torch
     * changes no longer dirty the grid. */
    if !w.light.is_dirty() {
        return;
    }
    w.light_rebuild();
}

/* ----------------------------------------------------------------------- */
/* Decorative surface scatter - grass tufts, flowers, rocks, bushes on
 * land, kelp + seaweed underwater. Baked into the chunk's opaque mesh
 * right next to build_tile, so thousands of pieces ride the existing
 * chunk draw calls (one bind + draw per chunk - "instanced" in effect
 * without a per-instance pipeline). Placement is a deterministic
 * per-tile hash, so parallel partial builds stitch byte-identically
 * and a chunk rebuild after mining regrows the exact same scatter on
 * the surviving surface. Tuning lives in assets/config/scatter.yaml
 * (core::scatter). Kept OUT of build_tile so the C-pinned mesh hashes
 * above stay valid - the renderer calls it alongside build_tile. */

use tenebris_core::rng::hash2;
use tenebris_core::scatter as scatter_cfg;

/* Hash salts - arbitrary distinct streams per decision, not tunables. */
const SALT_KIND: i32 = 0x51;
const SALT_COUNT: i32 = 0x52;
const SALT_POS_A: i32 = 0x53;
const SALT_POS_B: i32 = 0x54;
const SALT_SIZE: i32 = 0x55;
const SALT_ANGLE: i32 = 0x56;
const SALT_VARIANT: i32 = 0x57;

/// Interior UV rect of an atlas column, inset so linear filtering never
/// bleeds the neighbouring column: (u_lo, u_hi, v_lo, v_hi).
fn tile_uv(block: Block, cap: FaceCap) -> (f32, f32, f32, f32) {
    let u0 = blocks::face_tile(block, cap) as f32 * HEX_ATLAS_U_STEP;
    (
        u0 + HEX_ATLAS_U_STEP * 0.2,
        u0 + HEX_ATLAS_U_STEP * 0.8,
        0.2,
        0.8,
    )
}

/// A narrow vertical slice of an atlas column, positioned by `t` in
/// [0,1). Each grass strip samples its own slice so neighbouring blades
/// pick up different pixels of the source texture - free per-blade
/// shade variation from art that already exists.
fn tile_uv_slice(block: Block, cap: FaceCap, t: f32) -> (f32, f32, f32, f32) {
    let u0 = blocks::face_tile(block, cap) as f32 * HEX_ATLAS_U_STEP;
    let lo = u0 + HEX_ATLAS_U_STEP * (0.15 + 0.45 * t.clamp(0.0, 1.0));
    (lo, lo + HEX_ATLAS_U_STEP * 0.22, 0.15 + 0.5 * t, 0.85)
}

/// One triangle, visible from both sides (3 shared verts, both index
/// windings - the hex pipeline back-face culls). Normal is the surface
/// up so scatter shades like the ground it stands on (no lighting pop
/// against the cap it sits on).
#[allow(clippy::too_many_arguments)]
fn push_tri_2side(
    out: &mut HexMesh,
    p: [DVec3; 3],
    uv: [(f32, f32); 3],
    up: DVec3,
    sky: f32,
    torch: f32,
    wet: f32,
) {
    let base = out.vertices.len() as u32;
    reserve(out, 3, 6);
    for i in 0..3 {
        push_vertex(out, p[i], up, uv[i].0, uv[i].1, sky, torch, wet);
    }
    out.indices.extend_from_slice(&[base, base + 1, base + 2, base, base + 2, base + 1]);
}

/// One quad (two triangles), visible from both sides.
#[allow(clippy::too_many_arguments)]
fn push_quad_2side(
    out: &mut HexMesh,
    p: [DVec3; 4],
    uv: [(f32, f32); 4],
    up: DVec3,
    sky: f32,
    torch: f32,
    wet: f32,
) {
    let base = out.vertices.len() as u32;
    reserve(out, 4, 12);
    for i in 0..4 {
        push_vertex(out, p[i], up, uv[i].0, uv[i].1, sky, torch, wet);
    }
    out.indices.extend_from_slice(&[
        base, base + 1, base + 2, base, base + 2, base + 3, /* front */
        base, base + 2, base + 1, base, base + 3, base + 2, /* back */
    ]);
}

/// A tapered blade: triangle from a base segment up to a leaning tip.
#[allow(clippy::too_many_arguments)]
fn push_blade(
    out: &mut HexMesh,
    base: DVec3,
    up: DVec3,
    side: DVec3,
    lean: DVec3,
    h: f64,
    half_w: f64,
    uvr: (f32, f32, f32, f32),
    sky: f32,
    torch: f32,
    wet: f32,
) {
    let a = dvec3_sub(base, dvec3_scale(side, half_w));
    let b = dvec3_add(base, dvec3_scale(side, half_w));
    let tip = dvec3_add(dvec3_add(base, dvec3_scale(up, h)), lean);
    let (u_lo, u_hi, v_lo, v_hi) = uvr;
    let uc = (u_lo + u_hi) * 0.5;
    push_tri_2side(
        out,
        [a, b, tip],
        [(u_lo, v_hi), (u_hi, v_hi), (uc, v_lo)],
        up,
        sky,
        torch,
        wet,
    );
}

/// A small solid hex prism (rock / bush lump): 6 side quads wound
/// outward + a top cap fan. Single-sided - it's convex.
#[allow(clippy::too_many_arguments)]
fn push_prism(
    out: &mut HexMesh,
    base: DVec3,
    up: DVec3,
    t1: DVec3,
    t2: DVec3,
    radius: f64,
    h: f64,
    phase: f64,
    uvr: (f32, f32, f32, f32),
    sky: f32,
    torch: f32,
    wet: f32,
) {
    let (u_lo, u_hi, v_lo, v_hi) = uvr;
    let top_c = dvec3_add(base, dvec3_scale(up, h));
    let mut rim_bot = [DVec3::default(); 6];
    let mut rim_top = [DVec3::default(); 6];
    for (j, (rb, rt)) in rim_bot.iter_mut().zip(rim_top.iter_mut()).enumerate() {
        let ang = phase + j as f64 / 6.0 * std::f64::consts::TAU;
        let dirt = dvec3_add(dvec3_scale(t1, ang.cos()), dvec3_scale(t2, ang.sin()));
        *rb = dvec3_add(base, dvec3_scale(dirt, radius));
        *rt = dvec3_add(top_c, dvec3_scale(dirt, radius * 0.8));
    }
    /* Sides: CCW rim order + radial-out quads. */
    for j in 0..6 {
        let k = (j + 1) % 6;
        let basev = out.vertices.len() as u32;
        reserve(out, 4, 6);
        push_vertex(out, rim_bot[j], up, u_lo, v_hi, sky, torch, wet);
        push_vertex(out, rim_bot[k], up, u_hi, v_hi, sky, torch, wet);
        push_vertex(out, rim_top[k], up, u_hi, v_lo, sky, torch, wet);
        push_vertex(out, rim_top[j], up, u_lo, v_lo, sky, torch, wet);
        out.indices.extend_from_slice(&[basev, basev + 1, basev + 2, basev, basev + 2, basev + 3]);
    }
    /* Top cap fan. */
    let cap_c = out.vertices.len() as u32;
    reserve(out, 7, 18);
    let uc = (u_lo + u_hi) * 0.5;
    let vc = (v_lo + v_hi) * 0.5;
    push_vertex(out, top_c, up, uc, vc, sky, torch, wet);
    for rt in rim_top.iter() {
        push_vertex(out, *rt, up, uc, v_lo, sky, torch, wet);
    }
    for j in 0..6u32 {
        let k = (j + 1) % 6;
        out.indices.extend_from_slice(&[cap_c, cap_c + 1 + k, cap_c + 1 + j]);
    }
}

/// Build the decorative scatter for one tile into the chunk's opaque
/// mesh. Call alongside [`build_tile`]; safe to skip entirely (it only
/// adds geometry). See the module comment above for the design.
pub fn build_scatter(out: &mut HexMesh, w: &World, tile_idx: i32) {
    let cfg = scatter_cfg::config();
    let t = match w.grid.tile(tile_idx) {
        Some(t) => t,
        None => return,
    };

    /* Topmost solid voxel = the surface this tile presents to the sky
     * (or to the ocean above it). Leaves / wood surfaces get nothing -
     * no grass growing on a canopy. */
    let col_base = (tile_idx * WORLD_MAX_DEPTH) as usize;
    let mut surf = -1i32;
    for d in (0..WORLD_MAX_DEPTH - 1).rev() {
        if is_solid_raw(w.blocks[col_base + d as usize]) {
            surf = d;
            break;
        }
    }
    if surf < 0 || surf + 1 >= WORLD_MAX_DEPTH {
        return;
    }
    let ground = Block::from_raw(w.blocks[col_base + surf as usize]).unwrap_or(Block::Air);
    let above = Block::from_raw(w.blocks[col_base + (surf + 1) as usize]).unwrap_or(Block::Air);

    let grassy = matches!(ground, Block::Grass | Block::SeqGrass);
    let dirty = matches!(ground, Block::Dirt | Block::SeqDirt);
    let bare = matches!(
        ground,
        Block::Dirt
            | Block::Sand
            | Block::Stone
            | Block::Snow
            | Block::SeqDirt
            | Block::SeqSand
            | Block::SeqSnow
            | Block::CragRock
            | Block::AsteroidRock
            | Block::Moon
    );
    let sea_floor = matches!(
        ground,
        Block::Sand | Block::Dirt | Block::Stone | Block::Grass | Block::SeqSand | Block::SeqDirt
    );
    let underwater = above == Block::Water;
    if !underwater && above != Block::Air {
        return; /* torch / tech block / partial occupies the cell */
    }
    if ground == Block::Farmland {
        return; /* crops own tilled ground */
    }

    /* Per-vertex lighting inputs, sampled once at the surface - scatter
     * is small enough that one sample per piece reads fine. */
    let sky = if use_voxel_engine() {
        sky_light_voxel(w, tile_idx, surf + 1)
    } else {
        sky_light_at(w, tile_idx, surf + 1)
    };
    let wet = if underwater { 1.0f32 } else { 0.0f32 };

    let n = t.num_verts as i32;
    let r_surf = w.depth_to_radius_m(surf + 1);
    let up = t.center; /* unit already */
    let t1 = dvec3_normalize(dvec3_sub(t.verts[0], t.center));
    let t2 = dvec3_normalize(dvec3_cross(up, t1));

    /* Hashed point on the surface cap: lerp from centre toward a hashed
     * corner - same plane emit_cap builds, so pieces sit flush. */
    let place = |ha: f32, hb: f32| -> DVec3 {
        let k = ((ha * n as f32) as i32).clamp(0, n - 1);
        let f = (0.15 + 0.60 * hb) as f64;
        let dir = dvec3_add(
            dvec3_scale(t.center, 1.0 - f),
            dvec3_scale(t.verts[k as usize], f),
        );
        dvec3_scale(dir, r_surf)
    };
    let rot = |ang: f64| -> DVec3 {
        dvec3_add(dvec3_scale(t1, ang.cos()), dvec3_scale(t2, ang.sin()))
    };

    if underwater {
        if !sea_floor || !w.body.has_water {
            return;
        }
        let torch = 0.0f32; /* no torches under the sea */
        let leaves_uv = tile_uv(Block::Leaves, FaceCap::Top);

        /* Kelp: a stalk of stacked crossed ribbons zig-zagging upward,
         * capped by how much water is actually above the floor. */
        if hash2(tile_idx, SALT_KIND) < cfg.kelp_chance {
            let water_cells = (SEA_LEVEL_DEPTH - (surf + 1)).max(0);
            let layer_h = w.depth_to_radius_m(surf + 2) - r_surf;
            let max_h = (water_cells as f64 * layer_h - 0.3).max(0.0);
            let segs = (2.0 + hash2(tile_idx, SALT_COUNT) * (cfg.kelp_max_segs - 2.0).max(0.0))
                .round() as i32;
            let seg_h = cfg.kelp_seg_m as f64;
            let segs = segs.min((max_h / seg_h.max(0.01)) as i32);
            if segs >= 1 {
                let base = place(hash2(tile_idx, SALT_POS_A), hash2(tile_idx, SALT_POS_B));
                let ang = hash2(tile_idx, SALT_ANGLE) as f64 * std::f64::consts::TAU;
                let half_w = 0.10 + 0.06 * hash2(tile_idx, SALT_SIZE) as f64;
                for s in 0..segs {
                    let sway = ((s as f64 * 1.7 + ang).sin()) * 0.10;
                    let o_bot = dvec3_scale(rot(ang), (s as f64 * 0.9 + ang).sin() * 0.08);
                    let o_top = dvec3_scale(rot(ang), ((s + 1) as f64 * 0.9 + ang).sin() * 0.08 + sway);
                    let b0 = dvec3_add(dvec3_add(base, dvec3_scale(up, s as f64 * seg_h)), o_bot);
                    let b1 = dvec3_add(dvec3_add(base, dvec3_scale(up, (s + 1) as f64 * seg_h)), o_top);
                    let taper = 1.0 - 0.5 * (s as f64 / segs.max(1) as f64);
                    for fin in 0..2 {
                        let side = rot(ang + fin as f64 * std::f64::consts::FRAC_PI_2);
                        let (u_lo, u_hi, v_lo, v_hi) = leaves_uv;
                        push_quad_2side(
                            out,
                            [
                                dvec3_sub(b0, dvec3_scale(side, half_w * taper)),
                                dvec3_add(b0, dvec3_scale(side, half_w * taper)),
                                dvec3_add(b1, dvec3_scale(side, half_w * taper * 0.8)),
                                dvec3_sub(b1, dvec3_scale(side, half_w * taper * 0.8)),
                            ],
                            [(u_lo, v_hi), (u_hi, v_hi), (u_hi, v_lo), (u_lo, v_lo)],
                            up,
                            sky,
                            torch,
                            wet,
                        );
                    }
                }
            }
        }

        /* Seaweed: short leafy blade tufts on the floor. */
        if hash2(tile_idx, SALT_VARIANT) < cfg.weed_chance {
            let blades = 3 + (hash2(tile_idx, SALT_COUNT + 7) * 2.0) as i32;
            for j in 0..blades {
                let base = place(
                    hash2(tile_idx, SALT_POS_A + 11 + j),
                    hash2(tile_idx, SALT_POS_B + 11 + j),
                );
                let ang = hash2(tile_idx, SALT_ANGLE + j) as f64 * std::f64::consts::TAU;
                let h = cfg.weed_height_m as f64 * (0.7 + 0.6 * hash2(tile_idx, SALT_SIZE + j) as f64);
                let lean = dvec3_scale(rot(ang + 1.3), h * 0.25);
                push_blade(out, base, up, rot(ang), lean, h, 0.05, leaves_uv, sky, torch, wet);
            }
        }
        return;
    }

    /* ------------------------------ land ------------------------------ */
    let torch = torch_light_at(dvec3_to_vec3(dvec3_scale(t.center, r_surf)));

    if grassy {
        /* Grass: Minecraft-scale coverage - thin rectangular strips
         * spread across the whole tile, each about half a block tall.
         * Blades deliberately DON'T sample the ground's own texture:
         * they draw from the tree-leaf greens (plus the sister-planet
         * grass as an accent), each strip cropping its own slice of
         * the source art - the slightly-off shades are what make the
         * blades pop out of the cap they stand on instead of melting
         * into it. */
        if hash2(tile_idx, SALT_KIND) < cfg.grass_chance {
            let max_b = cfg.grass_blades.max(3.0);
            let blades = ((0.6 + 0.4 * hash2(tile_idx, SALT_COUNT)) * max_b) as i32;
            for j in 0..blades {
                let base = place(
                    hash2(tile_idx, SALT_POS_A + j),
                    hash2(tile_idx, SALT_POS_B + j),
                );
                let ang = hash2(tile_idx, SALT_ANGLE + j) as f64 * std::f64::consts::TAU;
                let h = cfg.grass_height_m as f64
                    * (0.65 + 0.7 * hash2(tile_idx, SALT_SIZE + j) as f64);
                /* Off-colour palette: mostly the darker tree-leaf green
                 * (the same shade that makes the canopies pop), with an
                 * occasional blade of the ground's own tint blended in.
                 * On the sister planet the local leaf green swaps in so
                 * biomes keep their identity. */
                let leaf = if ground == Block::SeqGrass { Block::SeqLeaves } else { Block::Leaves };
                let pal = hash2(tile_idx, SALT_VARIANT + j);
                let src = if pal < 0.7 { leaf } else { ground };
                let uvr = tile_uv_slice(src, FaceCap::Top, hash2(tile_idx, SALT_SIZE + 31 + j));
                let (u_lo, u_hi, v_lo, v_hi) = uvr;
                let side = rot(ang);
                let lean = dvec3_scale(rot(ang + 0.9), h * 0.15);
                let hw = cfg.grass_blade_w_m as f64
                    * (0.7 + 0.6 * hash2(tile_idx, SALT_COUNT + 17 + j) as f64);
                let top = dvec3_add(dvec3_add(base, dvec3_scale(up, h)), lean);
                /* Thin rectangular strip, slightly narrower at the top. */
                push_quad_2side(
                    out,
                    [
                        dvec3_sub(base, dvec3_scale(side, hw)),
                        dvec3_add(base, dvec3_scale(side, hw)),
                        dvec3_add(top, dvec3_scale(side, hw * 0.8)),
                        dvec3_sub(top, dvec3_scale(side, hw * 0.8)),
                    ],
                    [(u_lo, v_hi), (u_hi, v_hi), (u_hi, v_lo), (u_lo, v_lo)],
                    up,
                    sky,
                    torch,
                    wet,
                );
            }
        }

        /* Flowers: a stem blade with a bright diamond head. Head colour
         * alternates white (snow tile) / red-orange (crag tile) by hash. */
        if hash2(tile_idx, SALT_KIND + 1) < cfg.flower_chance {
            let base = place(
                hash2(tile_idx, SALT_POS_A + 40),
                hash2(tile_idx, SALT_POS_B + 40),
            );
            let ang = hash2(tile_idx, SALT_ANGLE + 40) as f64 * std::f64::consts::TAU;
            let h = cfg.flower_height_m as f64;
            let stem_uv = tile_uv(ground, FaceCap::Top);
            push_blade(out, base, up, rot(ang), DVec3::default(), h, 0.03, stem_uv, sky, torch, wet);
            let head_block = if hash2(tile_idx, SALT_VARIANT) < 0.5 {
                Block::Snow
            } else {
                Block::CragRock
            };
            let head_uv = tile_uv(head_block, FaceCap::Top);
            let (u_lo, u_hi, v_lo, v_hi) = head_uv;
            let c = dvec3_add(base, dvec3_scale(up, h));
            let hw = 0.07f64;
            /* Diamond: 4 points around the stem tip, slightly domed. */
            let pts = [
                dvec3_add(c, dvec3_scale(rot(ang), hw)),
                dvec3_add(c, dvec3_scale(rot(ang + std::f64::consts::FRAC_PI_2), hw)),
                dvec3_add(c, dvec3_scale(rot(ang + std::f64::consts::PI), hw)),
                dvec3_add(c, dvec3_scale(rot(ang + 3.0 * std::f64::consts::FRAC_PI_2), hw)),
            ];
            let top = dvec3_add(c, dvec3_scale(up, 0.03));
            let uc = (u_lo + u_hi) * 0.5;
            let vc = (v_lo + v_hi) * 0.5;
            for j in 0..4 {
                let k = (j + 1) % 4;
                push_tri_2side(
                    out,
                    [pts[j], pts[k], top],
                    [(u_lo, v_hi), (u_hi, v_hi), (uc, vc)],
                    up,
                    sky,
                    torch,
                    wet,
                );
            }
        }
    }

    /* Bushes: two leafy prism lumps, on grass or dirt. */
    if (grassy || dirty) && hash2(tile_idx, SALT_KIND + 2) < cfg.bush_chance {
        let leaves_uv = tile_uv(Block::Leaves, FaceCap::Side);
        let base = place(
            hash2(tile_idx, SALT_POS_A + 60),
            hash2(tile_idx, SALT_POS_B + 60),
        );
        let s = cfg.bush_size_m as f64 * (0.8 + 0.4 * hash2(tile_idx, SALT_SIZE + 60) as f64);
        let phase = hash2(tile_idx, SALT_ANGLE + 60) as f64 * std::f64::consts::TAU;
        push_prism(out, base, up, t1, t2, s, s * 0.9, phase, leaves_uv, sky, torch, wet);
        let base2 = dvec3_add(base, dvec3_scale(rot(phase), s * 1.1));
        push_prism(
            out, base2, up, t1, t2, s * 0.6, s * 0.55, phase + 0.7, leaves_uv, sky, torch, wet,
        );
    }

    /* Rocks: a small stone prism on bare ground (and sparse on grass). */
    let rock_roll = hash2(tile_idx, SALT_KIND + 3);
    let rock_chance = if bare { cfg.rock_chance } else { cfg.rock_chance * 0.3 };
    if (bare || grassy) && rock_roll < rock_chance {
        let stone_uv = tile_uv(Block::Stone, FaceCap::Side);
        let base = place(
            hash2(tile_idx, SALT_POS_A + 80),
            hash2(tile_idx, SALT_POS_B + 80),
        );
        let s = cfg.rock_size_m as f64 * (0.6 + 0.8 * hash2(tile_idx, SALT_SIZE + 80) as f64);
        let phase = hash2(tile_idx, SALT_ANGLE + 80) as f64 * std::f64::consts::TAU;
        push_prism(
            out,
            base,
            up,
            t1,
            t2,
            s,
            s * (0.4 + 0.5 * hash2(tile_idx, SALT_VARIANT + 80) as f64),
            phase,
            stone_uv,
            sky,
            torch,
            wet,
        );
    }
}

/* ----------------------------------------------------------------------- */

#[cfg(test)]
mod tests {
    use super::*;
    use crate::client_kv::test_support;
    use tenebris_core::math::vec3_make;
    use tenebris_core::planet::{self, BodyId};
    use tenebris_core::world_water::OriginRef;

    /* Pins generated from the C build: target/c-harness/
     * hex_mesher_harness.c + hex_mesher_stub.c compiled with gcc 13.2
     * against the verbatim client/hex_mesher.c + core tree (output:
     * target/c-harness/hex_mesher_pins.txt). The scenario script in
     * `pinned_hex_mesher_suite` runs in LOCKSTEP with the harness
     * main() - same world (Tenebris, subdiv 3, full gen, compiled-in
     * config defaults), same edits, same build order. Vertex/index
     * buffers are pinned as FNV-1a64 hashes over the exact byte
     * layout the C hashed (11 f32 LE per vertex / u32 LE per index)
     * plus several exact vertices as f32 bit patterns. */

    fn fnv1a64(bytes: &[u8]) -> u64 {
        let mut h: u64 = 14695981039346656037;
        for &b in bytes {
            h ^= b as u64;
            h = h.wrapping_mul(1099511628211);
        }
        h
    }

    fn vertex_bytes(m: &HexMesh) -> Vec<u8> {
        let mut out = Vec::with_capacity(m.vertices.len() * 44);
        for v in &m.vertices {
            for f in v.pos {
                out.extend_from_slice(&f.to_le_bytes());
            }
            for f in v.normal {
                out.extend_from_slice(&f.to_le_bytes());
            }
            for f in v.uv {
                out.extend_from_slice(&f.to_le_bytes());
            }
            out.extend_from_slice(&v.sky_light.to_le_bytes());
            out.extend_from_slice(&v.torch_light.to_le_bytes());
            out.extend_from_slice(&v.wet.to_le_bytes());
        }
        out
    }

    fn index_bytes(m: &HexMesh) -> Vec<u8> {
        let mut out = Vec::with_capacity(m.indices.len() * 4);
        for i in &m.indices {
            out.extend_from_slice(&i.to_le_bytes());
        }
        out
    }

    fn vbits(v: &HexVertex) -> [u32; 11] {
        [
            v.pos[0].to_bits(),
            v.pos[1].to_bits(),
            v.pos[2].to_bits(),
            v.normal[0].to_bits(),
            v.normal[1].to_bits(),
            v.normal[2].to_bits(),
            v.uv[0].to_bits(),
            v.uv[1].to_bits(),
            v.sky_light.to_bits(),
            v.torch_light.to_bits(),
            v.wet.to_bits(),
        ]
    }

    #[allow(clippy::too_many_arguments)]
    fn assert_mesh(tag: &str, m: &HexMesh, vcount: usize, icount: usize, vhash: u64, ihash: u64) {
        assert_eq!(m.vertices.len(), vcount, "{tag}: vertex_count");
        assert_eq!(m.indices.len(), icount, "{tag}: index_count");
        let vh = fnv1a64(&vertex_bytes(m));
        assert_eq!(
            vh,
            vhash,
            "{tag}: vertex hash {vh:016x} vs {vhash:016x} (v0 = {:08x?})",
            m.vertices.first().map(vbits)
        );
        let ih = fnv1a64(&index_bytes(m));
        assert_eq!(ih, ihash, "{tag}: index hash {ih:016x} vs {ihash:016x}");
    }

    fn assert_vertex(tag: &str, v: &HexVertex, want: [u32; 11]) {
        let got = vbits(v);
        assert_eq!(got, want, "{tag}: vertex bits {got:08x?} vs {want:08x?}");
    }

    #[test]
    fn append_merge_matches_sequential_build() {
        /* The renderer's parallel chunk mesher splits a chunk's tiles
         * into contiguous ranges, builds a partial mesh per range, then
         * stitches them with HexMesh::append. This pins the invariant
         * that makes that safe: partials built independently and appended
         * in tile order reproduce the exact buffer a single sequential
         * build emits (same vertices, same rebased indices). */
        /* Serialize with the other lighting-config-sensitive tests: the
         * engine setting is global, so a concurrent test flipping it
         * between the sequential and parallel builds would skew the
         * baked per-vertex light and produce a false divergence. */
        let _g = test_support::begin("append_merge");
        config::parse_lighting("engine: column\n", "append-merge");
        let body = planet::get(BodyId::Tenebris);
        let mut w = World::create(&body, 3);
        while !w.gen_complete() {
            w.stream_gen(4096);
        }

        let tiles: Vec<i32> = (0..200).collect();

        let mut seq = HexMesh::new();
        let mut seq_w = HexMesh::new();
        for &i in &tiles {
            build_tile(&mut seq, &w, i);
            build_water(&mut seq_w, &w, i);
        }

        /* Split into 3 uneven contiguous ranges and merge in order. */
        let mut par = HexMesh::new();
        let mut par_w = HexMesh::new();
        for range in tiles.chunks(67) {
            let mut m = HexMesh::new();
            let mut mw = HexMesh::new();
            for &i in range {
                build_tile(&mut m, &w, i);
                build_water(&mut mw, &w, i);
            }
            par.append(&m);
            par_w.append(&mw);
        }

        assert_eq!(seq.vertices, par.vertices, "terrain vertices diverge");
        assert_eq!(seq.indices, par.indices, "terrain indices diverge");
        assert_eq!(seq_w.vertices, par_w.vertices, "water vertices diverge");
        assert_eq!(seq_w.indices, par_w.indices, "water indices diverge");
    }

    #[test]
    fn scatter_is_deterministic_and_surface_aware() {
        let _g = test_support::begin("scatter_build");
        config::parse_lighting("engine: column\n", "scatter-test");
        tenebris_core::scatter::set_config(tenebris_core::scatter::ScatterConfig {
            /* Force every land kind on so one grass tile exercises the
             * full emit path deterministically. */
            grass_chance: 1.1,
            flower_chance: 1.1,
            rock_chance: 1.1,
            bush_chance: 1.1,
            kelp_chance: 1.1,
            weed_chance: 1.1,
            ..tenebris_core::scatter::ScatterConfig::DEFAULT
        });
        let body = planet::get(BodyId::Tenebris);
        let mut w = World::create(&body, 3);
        while !w.gen_complete() {
            w.stream_gen(4096);
        }

        /* Find one grass-surface tile and one underwater tile. */
        let surface_of = |w: &World, i: i32| -> (i32, Block, Block) {
            for d in (0..WORLD_MAX_DEPTH - 1).rev() {
                let b = w.get(i, d);
                if b != Block::Air && b != Block::Water {
                    return (d, b, w.get(i, d + 1));
                }
            }
            (-1, Block::Air, Block::Air)
        };
        let mut grass_tile = -1;
        let mut sea_tile = -1;
        for i in 0..w.tile_count {
            let (_, g, a) = surface_of(&w, i);
            if grass_tile < 0 && g == Block::Grass && a == Block::Air {
                grass_tile = i;
            }
            if sea_tile < 0 && a == Block::Water && matches!(g, Block::Sand | Block::Dirt | Block::Stone) {
                sea_tile = i;
            }
            if grass_tile >= 0 && sea_tile >= 0 {
                break;
            }
        }
        assert!(grass_tile >= 0 && sea_tile >= 0, "world has both surfaces");

        /* Grass tile emits land scatter; two builds are byte-identical
         * (the parallel chunk stitch depends on this). */
        let mut a = HexMesh::new();
        build_scatter(&mut a, &w, grass_tile);
        assert!(!a.vertices.is_empty(), "grass tile grew scatter");
        assert!(a.vertices.iter().all(|v| v.wet == 0.0), "land scatter is dry");
        let mut b = HexMesh::new();
        build_scatter(&mut b, &w, grass_tile);
        assert_eq!(a.vertices, b.vertices);
        assert_eq!(a.indices, b.indices);

        /* Underwater tile emits wet scatter (kelp/weed), flagged wet so
         * the shader's underwater dimming applies. */
        let mut u = HexMesh::new();
        build_scatter(&mut u, &w, sea_tile);
        assert!(!u.vertices.is_empty(), "sea floor grew kelp/weeds");
        assert!(u.vertices.iter().all(|v| v.wet == 1.0), "sea scatter is wet");

        /* Chances at zero -> no geometry at all. */
        tenebris_core::scatter::set_config(tenebris_core::scatter::ScatterConfig {
            grass_chance: 0.0,
            flower_chance: 0.0,
            rock_chance: 0.0,
            bush_chance: 0.0,
            kelp_chance: 0.0,
            weed_chance: 0.0,
            ..tenebris_core::scatter::ScatterConfig::DEFAULT
        });
        let mut z = HexMesh::new();
        build_scatter(&mut z, &w, grass_tile);
        build_scatter(&mut z, &w, sea_tile);
        assert!(z.vertices.is_empty(), "zero chances emit nothing");
        tenebris_core::scatter::set_config(tenebris_core::scatter::ScatterConfig::DEFAULT);
    }

    #[test]
    fn torch_light_bakes_on_worker_threads() {
        /* Chunk meshing fans out across rayon workers; the torch list
         * is thread-local on the main thread. This pins the fix (the
         * cross-thread mirror in torch.rs): a tile built on a WORKER
         * thread must bake the same torch light as one built on the
         * placing thread - the regression was silent darkness. */
        let _g = test_support::begin("torch_worker_bake");
        config::parse_lighting("engine: column\n", "torch-worker");
        torch::shutdown();
        let body = planet::get(BodyId::Tenebris);
        let mut w = World::create(&body, 3);
        while !w.gen_complete() {
            w.stream_gen(4096);
        }
        let t41 = *w.grid.tile(41).unwrap();
        let mut surf = -1;
        for d in (0..WORLD_MAX_DEPTH).rev() {
            let b = w.get(41, d);
            if b != Block::Air && b != Block::Water {
                surf = d;
                break;
            }
        }
        let r_top = w.depth_to_radius_m(surf + 1);
        let up = vec3_make(t41.center.x as f32, t41.center.y as f32, t41.center.z as f32);
        let base = vec3_make(
            (t41.center.x * r_top) as f32,
            (t41.center.y * r_top) as f32,
            (t41.center.z * r_top) as f32,
        );
        assert!(torch::place(base, up, 41));

        let max_torch = |m: &HexMesh| {
            m.vertices.iter().map(|v| v.torch_light).fold(0.0f32, f32::max)
        };
        let mut main_m = HexMesh::new();
        build_tile(&mut main_m, &w, 41);
        let main_max = max_torch(&main_m);
        assert!(main_max > 0.5, "main-thread bake sees the torch");

        let worker_max = std::thread::scope(|s| {
            s.spawn(|| {
                let mut m = HexMesh::new();
                build_tile(&mut m, &w, 41);
                max_torch(&m)
            })
            .join()
            .unwrap()
        });
        assert!(
            (worker_max - main_max).abs() < 1e-6 && worker_max > 0.5,
            "worker-thread bake must match ({} vs {})",
            worker_max,
            main_max
        );
        torch::shutdown();
    }

    #[test]
    fn atlas_consts_pinned() {
        assert_eq!(HEX_ATLAS_TILES, 93);
        /* 1.0 / HEX_ATLAS_TILES (widened to 93: tech-block face tiles at 29..41,
         * tech cube cells at 42..89, rocket-part cube cells at 90..92). */
        assert_eq!(HEX_ATLAS_U_STEP.to_bits(), (1.0f32 / 93.0).to_bits());
        /* Vertex layout: 44-byte stride, field offsets as the
         * pipelines bind them. */
        assert_eq!(std::mem::size_of::<HexVertex>(), 44);
    }

    #[test]
    fn reserve_doubling_matches_c() {
        let mut m = HexMesh::new();
        reserve(&mut m, 1, 1);
        assert_eq!(m.vertices.capacity(), 256);
        assert_eq!(m.indices.capacity(), 512);
        reserve(&mut m, 300, 1100);
        assert_eq!(m.vertices.capacity(), 512);
        assert_eq!(m.indices.capacity(), 2048);
        /* reset keeps capacity (C just zeroes the counts). */
        m.reset();
        assert_eq!(m.vertices.capacity(), 512);
        assert!(m.vertices.is_empty() && m.indices.is_empty());
    }

    /* One sequential test mirroring the C harness running S1..S9 in a
     * single process so world + water + torch + config state evolve
     * identically. Single #[test] on purpose: the voxel-engine section
     * flips the process-global lighting config. */
    #[test]
    fn pinned_hex_mesher_suite() {
        let _g = test_support::begin("hex_mesher_suite");
        torch::shutdown();
        /* Compiled-in defaults on both sides; make sure a previous
         * in-process test didn't leave the engine flipped. */
        config::parse_lighting("engine: column\n", "hex-pin");

        let body = planet::get(BodyId::Tenebris);
        let mut w = World::create(&body, 3);
        while !w.gen_complete() {
            w.stream_gen(4096);
        }

        let mut m = HexMesh::new();

        /* ---- S1: plain surface tile 41 (hexagon, beach-ish) ---- */
        build_tile(&mut m, &w, 41);
        assert_mesh("s1", &m, S1_VC, S1_IC, S1_VH, S1_IH);
        assert_vertex("s1_v0", &m.vertices[0], S1_V0);
        assert_vertex("s1_v1", &m.vertices[1], S1_V1);
        assert_vertex("s1_vmid", &m.vertices[S1_VC / 2], S1_VMID);
        assert_vertex("s1_vlast", &m.vertices[S1_VC - 1], S1_VLAST);

        /* ---- S2: tree tile 73 (wood trunk + hashed leaf widths) ---- */
        m.reset();
        build_tile(&mut m, &w, 73);
        assert_mesh("s2", &m, S2_VC, S2_IC, S2_VH, S2_IH);
        assert_vertex("s2_vmid", &m.vertices[S2_VC / 2], S2_VMID);

        /* ---- S3: pentagon tile 0 ---- */
        m.reset();
        build_tile(&mut m, &w, 0);
        assert_mesh("s3", &m, S3_VC, S3_IC, S3_VH, S3_IH);
        assert_vertex("s3_v0", &m.vertices[0], S3_V0);

        /* ---- S4: ocean cap on tile 2; non-water tile 0 emits none ---- */
        m.reset();
        build_water(&mut m, &w, 2);
        assert_mesh("s4", &m, S4_VC, S4_IC, S4_VH, S4_IH);
        assert_vertex("s4_v0", &m.vertices[0], S4_V0);
        build_water(&mut m, &w, 0); /* no water at sea level: no-op */
        assert_eq!(m.vertices.len(), S4_VC, "s4: dry tile added vertices");

        /* ---- S5: per-voxel ocean column on tile 2 ---- */
        m.reset();
        build_water_voxels(&mut m, &w, 2);
        assert_mesh("s5", &m, S5_VC, S5_IC, S5_VH, S5_IH);

        /* ---- S6: cave dug into tile 41's edge neighbour ---- */
        let cave_nb = w.grid.tile(41).unwrap().edge_neighbours[0];
        assert_eq!(cave_nb, CAVE_NB, "s6: cave neighbour tile");
        w.set(cave_nb, 56, Block::Air);
        w.set(cave_nb, 57, Block::Air);
        m.reset();
        build_tile(&mut m, &w, 41); /* cave side walls (expf sky bake) */
        assert_mesh("s6a", &m, S6A_VC, S6A_IC, S6A_VH, S6A_IH);
        assert_vertex("s6a_vmid", &m.vertices[S6A_VC / 2], S6A_VMID);
        m.reset();
        build_tile(&mut m, &w, cave_nb); /* cave floor + ceiling caps */
        assert_mesh("s6b", &m, S6B_VC, S6B_IC, S6B_VH, S6B_IH);

        /* ---- S7: suspended flowing pool above tile 73 ---- */
        let flow_nb = w.grid.tile(73).unwrap().edge_neighbours[0];
        assert_eq!(flow_nb, FLOW_NB, "s7: flow neighbour tile");
        w.set(73, 90, Block::Water);
        world_water::set_state(&mut w, 73, 90, 0x02); /* flow, level 2 */
        world_water::origin_add(
            &mut w,
            73,
            90,
            OriginRef {
                tile: flow_nb as u32,
                depth: 90,
            },
        );
        w.set(flow_nb, 90, Block::Water);
        world_water::set_state(&mut w, flow_nb, 90, 0x01); /* flow, level 1 */
        w.set(flow_nb, 91, Block::Water);
        world_water::set_state(&mut w, flow_nb, 91, 0x00); /* sleeping/full */
        m.reset();
        build_water_voxels(&mut m, &w, 73);
        assert_mesh("s7a", &m, S7A_VC, S7A_IC, S7A_VH, S7A_IH);
        assert_vertex("s7a_v0", &m.vertices[0], S7A_V0);
        m.reset();
        build_water_voxels(&mut m, &w, flow_nb);
        assert_mesh("s7b", &m, S7B_VC, S7B_IC, S7B_VH, S7B_IH);

        /* ---- S8: torch-lit rebuild of tile 41 ---- */
        let t41 = *w.grid.tile(41).unwrap();
        let r64 = w.depth_to_radius_m(64);
        let r66 = w.depth_to_radius_m(66);
        let up = vec3_make(
            t41.center.x as f32,
            t41.center.y as f32,
            t41.center.z as f32,
        );
        let p0 = vec3_make(
            (t41.center.x * r64) as f32,
            (t41.center.y * r64) as f32,
            (t41.center.z * r64) as f32,
        );
        let p1 = vec3_make(
            (t41.center.x * r66) as f32,
            (t41.center.y * r66) as f32,
            (t41.center.z * r66) as f32,
        );
        assert!(torch::place(p0, up, 41));
        assert!(torch::place(p1, up, 41));
        m.reset();
        build_tile(&mut m, &w, 41);
        assert_mesh("s8", &m, S8_VC, S8_IC, S8_VH, S8_IH);
        assert_vertex("s8_v0", &m.vertices[0], S8_V0);

        /* ---- S9: voxel lighting engine (smooth corners + AO) ---- */
        assert_eq!(config::parse_lighting("engine: voxel\n", "hex-pin"), 0);
        let mut spins = 0;
        while w.light.is_dirty() {
            relight_if_needed(&mut w);
            spins += 1;
            assert!(spins < 100000, "s9: relight never converged");
        }
        m.reset();
        build_tile(&mut m, &w, 41);
        assert_mesh("s9a", &m, S9A_VC, S9A_IC, S9A_VH, S9A_IH);
        assert_vertex("s9a_v0", &m.vertices[0], S9A_V0);
        assert_vertex("s9a_vmid", &m.vertices[S9A_VC / 2], S9A_VMID);
        m.reset();
        build_tile(&mut m, &w, 0);
        assert_mesh("s9b", &m, S9B_VC, S9B_IC, S9B_VH, S9B_IH);
        m.reset();
        build_water_voxels(&mut m, &w, 73);
        assert_mesh("s9c", &m, S9C_VC, S9C_IC, S9C_VH, S9C_IH);
        m.reset();
        build_water(&mut m, &w, 2);
        assert_mesh("s9d", &m, S9D_VC, S9D_IC, S9D_VH, S9D_IH);

        /* Restore the compiled-in default for any other test in this
         * process. */
        config::parse_lighting("engine: column\n", "hex-pin");
        torch::shutdown();
    }

    /* ---- pins from target/c-harness/hex_mesher_pins.txt ----
     * (gcc 13.2 -O2, hex_mesher_harness.c + hex_mesher_stub.c against
     * the verbatim C tree; vertex pins are 11 f32 bit patterns in
     * field order pos/normal/uv/sky/torch/wet.) */

    const S1_VC: usize = 55;
    const S1_IC: usize = 90;
        const S1_VH: u64 = 0x1792b0dead1bb615;
    const S1_IH: u64 = 0x489c92b4ebb0bd85;
        const S1_V0: [u32; 11] = [0x43947274, 0xc15441cf, 0xc1af9cc9, 0xbd9702eb, 0x00000000, 0xbf7f4d99, 0x3d042108, 0x00000000, 0x3f13b2fb, 0x00000000, 0x00000000];
        const S1_V1: [u32; 11] = [0x43947274, 0x415441cf, 0xc1af9cc9, 0xbd9702eb, 0x00000000, 0xbf7f4d99, 0x3d302c0b, 0x00000000, 0x3f13b2fb, 0x00000000, 0x00000000];
        const S1_VMID: [u32; 11] = [0x4395674c, 0x41d5d274, 0x00000000, 0x3f800000, 0x00000000, 0x00000000, 0x3d012dc0, 0x3f400000, 0x3f800000, 0x00000000, 0x00000000];
        const S1_VLAST: [u32; 11] = [0x4395674c, 0xc1d5d274, 0x00000000, 0xbd9c3fd0, 0xbf5a59fd, 0xbf043380, 0x3cb02c0b, 0x3f800000, 0x3f800000, 0x00000000, 0x00000000];

    const S2_VC: usize = 142;
    const S2_IC: usize = 288;
        const S2_VH: u64 = 0xf40aea7957e2094c;
    const S2_IH: u64 = 0x87cd063e4fdf9205;
        const S2_VMID: [u32; 11] = [0xc3927eaf, 0xc14aa9c7, 0xc2d476f9, 0xbf764198, 0x00000000, 0xbe8be997, 0x3e72f961, 0x3f400000, 0x3f800000, 0x00000000, 0x00000000];

    const S3_VC: usize = 66;
    const S3_IC: usize = 105;
        const S3_VH: u64 = 0xeb2d268065c66ffc;
    const S3_IH: u64 = 0xf8c0595555ef4e63;
        const S3_V0: [u32; 11] = [0xc337636b, 0x437c69ed, 0x00000000, 0xbf27b753, 0xbef3b458, 0x3f16329a, 0x3d042108, 0x00000000, 0x3eaa6e14, 0x00000000, 0x00000000];

    const S4_VC: usize = 6;
    const S4_IC: usize = 15;
        const S4_VH: u64 = 0xcaa1045ab8bd3bf2;
    const S4_IH: u64 = 0x7943df7f421941c5;
        const S4_V0: [u32; 11] = [0xc31d74db, 0xc37ec519, 0x00000000, 0xbf069650, 0xbf59c440, 0x00000000, 0x00000000, 0x00000000, 0x3f800000, 0x00000000, 0x3f800000];

    /* The deep-ocean column is fully culled (caps connect through the
     * column, neighbours are water or solid) - zero geometry; hashes
     * are the FNV-1a64 offset basis over empty buffers. */
    const S5_VC: usize = 0;
    const S5_IC: usize = 0;
        const S5_VH: u64 = 0xcbf29ce484222325;
    const S5_IH: u64 = 0xcbf29ce484222325;

    const CAVE_NB: i32 = 539;
    const S6A_VC: usize = 103;
    const S6A_IC: usize = 162;
        const S6A_VH: u64 = 0xaeee9eb4362352d5;
    const S6A_IH: u64 = 0x547c88d534b4f325;
        const S6A_VMID: [u32; 11] = [0x4394f1fa, 0xc154f826, 0xc1b033a5, 0xbd9702eb, 0x00000000, 0xbf7f4d99, 0x3d042108, 0x3f800000, 0x3f13b2fb, 0x00000000, 0x00000000];
    const S6B_VC: usize = 117;
    const S6B_IC: usize = 198;
        const S6B_VH: u64 = 0xfe29836fc011b02c;
    const S6B_IH: u64 = 0xf4c2850a72d89205;

    const FLOW_NB: i32 = 279;
    const S7A_VC: usize = 38;
    const S7A_IC: usize = 72;
        const S7A_VH: u64 = 0xea933bd5b5709bb7;
    const S7A_IH: u64 = 0xf5363b05eb547fdd;
        const S7A_V0: [u32; 11] = [0xc39cd92c, 0x00000000, 0xc2b23ab3, 0xbf764198, 0x00000000, 0xbe8be997, 0x00000000, 0x3f7f632a, 0x3f800000, 0x00000000, 0x3f800000];
    const S7B_VC: usize = 62;
    const S7B_IC: usize = 108;
        const S7B_VH: u64 = 0x58916c60a3a47f0d;
    const S7B_IH: u64 = 0x4eb7dd0a224605ed;

    const S8_VC: usize = 103;
    const S8_IC: usize = 162;
        const S8_VH: u64 = 0x6c427d2f47e41eb3;
    const S8_IH: u64 = 0x547c88d534b4f325;
        const S8_V0: [u32; 11] = [0x4391754d, 0xc14ffbc2, 0xc1ac139d, 0xbd9702eb, 0x00000000, 0xbf7f4d99, 0x3d5c370e, 0x00000000, 0x3cae52d6, 0x00000000, 0x00000000];

    const S9A_VC: usize = 103;
    const S9A_IC: usize = 162;
        const S9A_VH: u64 = 0xbf16b9fad06ea54b;
    const S9A_IH: u64 = 0x547c88d534b4f325;
        const S9A_V0: [u32; 11] = [0x4391754d, 0xc14ffbc2, 0xc1ac139d, 0xbd9702eb, 0x00000000, 0xbf7f4d99, 0x3d5c370e, 0x00000000, 0x00000000, 0x00000000, 0x00000000];
        const S9A_VMID: [u32; 11] = [0x4394f1fa, 0xc154f826, 0xc1b033a5, 0xbd9702eb, 0x00000000, 0xbf7f4d99, 0x3d042108, 0x3f800000, 0x00000000, 0x00000000, 0x00000000];
    const S9B_VC: usize = 66;
    const S9B_IC: usize = 105;
        const S9B_VH: u64 = 0xd1d3f02632a578d9;
    const S9B_IH: u64 = 0xf8c0595555ef4e63;
    const S9C_VC: usize = 38;
    const S9C_IC: usize = 72;
        const S9C_VH: u64 = 0xea933bd5b5709bb7;
    const S9C_IH: u64 = 0xf5363b05eb547fdd;
    const S9D_VC: usize = 6;
    const S9D_IC: usize = 15;
        const S9D_VH: u64 = 0xcaa1045ab8bd3bf2;
    const S9D_IH: u64 = 0x7943df7f421941c5;
}
