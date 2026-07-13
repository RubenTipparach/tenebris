//! Port of `tenebris-c/src/core/world.{c,h}`.
//!
//! The whole world. Holds the Goldberg tile set + a column of voxels per
//! tile. Matches the src/planet/Planet.ts model: depth 0 = deepest
//! bedrock, depth MAX_DEPTH-1 = sky. Each voxel is a block byte.
//!
//! Planet shell:
//!   layer 0       = BEDROCK (impassable floor; renderer skips its
//!                   inner-facing bottom cap so the hollow shell isn't
//!                   visible from the outside).
//!   layers 1..63  = below sea level - soil + stone + ocean column
//!                   filled with water above the seafloor.
//!   layer  64     = sea-level surface (SEA_LEVEL_IDX).
//!   layers 65..127= above sea level - terrain peaks and player build
//!                   space (~64 m of headroom over the tallest mountain
//!                   for stacking blocks).
//!
//! 128 byte/column x per-body tile count = voxel state per body. The
//! column layout (depth-major `blocks[tile * WORLD_MAX_DEPTH + depth]`)
//! is byte-identical to the C build - it feeds saves and the wire
//! protocol and must never change.
//!
//! Ownership: the C `world_t` is a heap object passed by pointer with
//! no module-level globals, so the Rust port is a plain `World` struct
//! with methods - callers own it (no Mutex-global; nothing in core/
//! needs ambient access to a world).
//!
//! Renames (per PORTING.md rule 4 - module prefix dropped):
//! - `world_t`                      -> `world::World`
//! - `world_create()`               -> `World::create()`
//! - `world_destroy()`              -> `Drop` (implicit)
//! - `world_clone()`                -> `World::clone_world()` (named to
//!                                     avoid colliding with `Clone::clone`;
//!                                     semantics differ from a memberwise
//!                                     clone - see the method docs)
//! - `world_stream_gen()`           -> `World::stream_gen()`
//! - `world_gen_complete()`         -> `World::gen_complete()`
//! - `world_gen_progress_pct()`     -> `World::gen_progress_pct()`
//! - `world_get()` / `world_set()`  -> `World::get()` / `World::set()`
//! - `world_tile_dirty()`           -> `World::tile_dirty()`
//! - `world_tile_clear_dirty()`     -> `World::tile_clear_dirty()`
//! - `world_tile_mark_dirty()`      -> `World::tile_mark_dirty()`
//! - `world_dirty_tiles()`          -> `World::dirty_tiles()` (returns a
//!                                     slice; the C returns count + an
//!                                     out-pointer at the internal array)
//! - `world_dirty_consume()`        -> `World::dirty_consume()`
//! - `world_tile_saved()`           -> `World::tile_saved()`
//! - `world_tile_mark_saved()`      -> `World::tile_mark_saved()`
//! - `world_dirty_in_range()`       -> `World::dirty_in_range()`
//! - `world_block_at_pos()`         -> `World::block_at_pos()`
//! - `world_depth_to_radius_m()`    -> `World::depth_to_radius_m()`
//! - `world_radius_to_depth()`      -> `World::radius_to_depth()`
//! - `world_is_water_at()`          -> `World::is_water_at()`
//! - `world_walkable_floor_near()`  -> `World::walkable_floor_near()`
//! - `world_topmost_solid_floor()`  -> `World::topmost_solid_floor()`
//! - `world_ceiling_above()`        -> `World::ceiling_above()`
//! - `world_safe_spawn_local()`     -> `World::safe_spawn_local()`
//! - `world_light_rebuild(w->light, w)` call shape -> `World::light_rebuild()`
//!   (convenience wrapper that splits the light/blocks/grid borrows)
//! - `world_water_*` call sites keep the C call shape via the
//!   `world_water` free functions (`world_water_enqueue(w, ..)` ->
//!   `world_water::enqueue(self, ..)`, etc.)

use crate::blocks::{self, Block};
use crate::config;
use crate::goldberg::{self, Goldberg};
use crate::math::{dvec3_scale, DVec3, Vec3};
use crate::mining;
use crate::planet::{self, BodyConfig};
use crate::planet_gen;
use crate::world_light::{self, WorldLight};
use crate::world_water::{self, WorldWater};

pub const WORLD_MAX_DEPTH: i32 = 128;

/// Sea-level layer index. The planet shell is laid out so depth 64 is
/// the first cell at-or-above sea level (layers 1..63 = subsurface +
/// ocean column, layer 64 = sea-level surface, layers 65..127 = sky
/// + player build space). Tied to the worldgen profile, not a runtime
/// knob.
pub const WORLD_SEA_LEVEL_DEPTH: i32 = 64;

const BLOCK_HEIGHT: f64 = 1.0;
/* Sea level sits at layer 64 in a 128-deep shell - layers 0..63 are
 * solid planet (bedrock + stone + seabed + water column); 64..127 are
 * usable build space + mountains above sea. */
const SEA_LEVEL_IDX: i32 = WORLD_SEA_LEVEL_DEPTH;

/// `block_covers_face()` applied to a raw voxel byte, replicating the
/// C `block_covers_face((block_t)byte)` cast: any byte outside the
/// palette covers (the C switch-style comparisons only carve out the
/// known non-covering ids). Shared with world_light, which gates its
/// BFS on the same predicate over raw column bytes.
#[inline]
pub(crate) fn covers_face_raw(raw: u8) -> bool {
    match Block::from_raw(raw) {
        Some(b) => blocks::covers_face(b),
        None => true,
    }
}

/// Port of `world_t` / `world_s`. Field names unchanged; the
/// `*_bytes` length fields drop out (Vec carries its length).
pub struct World {
    /// C holds `const body_config_t*` into planet.c's static table;
    /// `planet::get` returns by value so the world owns a copy.
    pub body: BodyConfig,
    pub grid: Goldberg,
    /// Voxel storage as a flat (tile_count * WORLD_MAX_DEPTH) array
    /// indexed by depth major: blocks[tile * WORLD_MAX_DEPTH + depth].
    pub blocks: Vec<u8>,
    pub tile_count: i32,

    /// Per-placed-block state (tech-block facing now; machine state later),
    /// keyed by (tile, depth). Parallel to `blocks`. See `block_entity`.
    pub block_entities: crate::block_entity::BlockEntityStore,

    /// Dirty bitset - one bit per tile. Set by edits, cleared by the
    /// renderer after remeshing.
    pub dirty: Vec<u8>,

    /// Compact FIFO of tiles whose dirty bit transitioned 0->1 since
    /// the last drain. Lets the renderer process only the tiles that
    /// actually changed instead of scanning all tile_count bits every
    /// frame - the difference between "one peer edit costs a full-grid
    /// sweep" and "one peer edit costs one queue push". Deduped via the
    /// dirty bit (a tile is pushed only on the 0->1 edge), so each tile
    /// appears at most once between drains and the queue is bounded by
    /// tile_count - it is sized to tile_count up front and never
    /// overflows. (C: `int* dirty_queue` + `dirty_queue_count`; the Vec
    /// carries the count.)
    pub dirty_queue: Vec<i32>,

    /// "Has a persisted column on disk" bitset - one bit per tile.
    /// Set by saves_load_world (on the server, after reading a tile's
    /// .col file off disk) and by saves_write_tile (when the server
    /// persists a new edit). Used at WELCOME time to enumerate which
    /// tiles need to be replayed to a joining client so the client's
    /// procgen view gets overlaid with the server-authoritative
    /// edits. Sized identically to the dirty bitmap; `None` on builds
    /// that never call the saves API (clients during SP procgen) -
    /// lazily allocated like the C NULL pointer.
    pub saved: Option<Vec<u8>>,

    /// "Column has been edited from the procgen baseline" bitset.
    /// Set the FIRST time any voxel in the column is mutated via
    /// `set`; never cleared. Lets the collision code skip the voxel
    /// scan and trust the analytic procgen surface for any column
    /// that's still pristine - i.e. the 99% case. The dirty bit can't
    /// be reused here because it's cleared on remesh and also gets
    /// set on neighbour-tile mesh-seam invalidations that aren't
    /// actually edits.
    pub edited: Vec<u8>,

    /// Generation progress: how many tiles have had terrain computed so
    /// far. Fill is streamed across frames; tiles past this cursor are
    /// all BLOCK_AIR.
    pub gen_cursor: i32,

    /// Per-voxel propagated light grid (sky + block nibbles). Created
    /// alongside the world; mark-dirty / rebuild semantics live in
    /// `world_light`. The mesher gates on `config::lighting().engine`
    /// to decide between this and the legacy column-based bake.
    pub light: WorldLight,
    /// Per-voxel water flow state + tick scheduler. State byte layout
    /// (source / falling / level) and queue semantics live in
    /// `world_water`. Allocated in `create` alongside `blocks`, cloned
    /// in `clone_world`, freed implicitly on drop.
    pub water: WorldWater,
}

/* ----------------------------------------------------------------------- */
/* Terrain generation. Each tile becomes a column with layers 0..MAX-1
 * filled according to the JS-derived heightmap + biome classifier. */

/* Cheap deterministic 32-bit hash for tile-keyed RNG (tree scatter).
 * Same constants we use elsewhere; just consolidated here so the gen
 * pass doesn't pull in rng's float wrapper. */
fn tile_hash(seed: u64, tile_idx: i32, salt: u32) -> u32 {
    let mut h = (tile_idx as u32)
        .wrapping_mul(374761393)
        .wrapping_add(salt.wrapping_mul(668265263))
        .wrapping_add((seed & 0xFFFF_FFFF) as u32)
        .wrapping_add(((seed >> 32) as u32).wrapping_mul(1376312589));
    h = (h ^ (h >> 13)).wrapping_mul(1274126177);
    h ^ (h >> 16)
}

/// Generate one tile's voxel column into `col` (length `WORLD_MAX_DEPTH`)
/// and return whether the column diverges from the bare analytic surface
/// (a tree was planted) so the caller can set the `edited` bit.
///
/// Free function (no `&self`) so `World::stream_gen` can fan the column
/// build across rayon while holding only a shared borrow of the body /
/// grid and an exclusive borrow of each tile's own `blocks` slice. The
/// logic is the per-column half of the old `gen_tile`; bitset writes are
/// the caller's job (they share bytes across tiles and can't be threaded).
/* Fixed salts for the deterministic per-voxel ore hash. Part of the
 * hash's identity (not designer knobs), so they stay inline per the
 * "no magic numbers" exception. */
const ORE_SALT: u32 = 0x0_0_E_0; // "ore"
const ORE_DEPTH_MIX: u32 = 0x9E3779B1; // golden-ratio odd multiplier

fn gen_column(body: &BodyConfig, grid: &Goldberg, tile_idx: i32, col: &mut [u8]) -> bool {
    let t = match grid.tile(tile_idx) {
        Some(t) => *t,
        None => return false,
    };

    /* Per-column biome profile + surface height (meters above base). */
    let prof = planet_gen::profile(body, t.center);

    /* Map meters -> block depth. */
    let mut surface_idx = (prof.surface_m as f64 / BLOCK_HEIGHT).floor() as i32 + SEA_LEVEL_IDX;
    if surface_idx < 2 {
        surface_idx = 2;
    }
    if surface_idx > WORLD_MAX_DEPTH - 1 {
        surface_idx = WORLD_MAX_DEPTH - 1;
    }

    for d in 0..WORLD_MAX_DEPTH {
        let altitude_m = ((d - SEA_LEVEL_IDX) as f64 * BLOCK_HEIGHT) as f32;
        let b = planet_gen::sample_with_profile(&prof, altitude_m);
        col[d as usize] = b.raw();
    }
    /* Bedrock floor - never overwrite, never mineable, and the renderer
     * skips its bottom cap so we don't see the inside of the planet. */
    col[0] = Block::Bedrock.raw();

    /* ---- Ore scatter -----------------------------------------------
     * Replace some underground stone with ore. Deterministic per
     * (tile, depth) so the same seed regenerates identical deposits;
     * the depth is folded into the hash salt so ore varies down a
     * column, not just between columns. Confined to stone below the
     * dirt layer (>= 4 m under the surface) and above bedrock. */
    let ore_top = (surface_idx - 4).max(1);
    for d in 1..ore_top {
        if col[d as usize] != Block::Stone.raw() {
            continue;
        }
        let salt = ORE_SALT ^ (d as u32).wrapping_mul(ORE_DEPTH_MIX);
        let roll = (tile_hash(body.seed, tile_idx, salt) & 0xFFFF) as f32 / 65535.0;
        if let Some(ore) = mining::ore_for_stone(roll) {
            col[d as usize] = ore.raw();
        }
    }

    /* ---- Tree scatter ----------------------------------------------
     * Plant a small tree on grass-topped land tiles with low slope.
     * Hex-based: trunk = 4 wood blocks stacked above the surface, top
     * 2 layers = leaves block. Probability per qualifying tile ~5 %,
     * gated by a deterministic per-tile + per-body hash so the layout
     * is identical for the same seed. Tropical / Sequoia / barren /
     * icy bodies skip trees entirely. */
    /* Eligibility: dry land between the shoreline (above SEA_LEVEL+1 m)
     * and the alpine snow line (below ~22 m). Mirrors planet_gen's
     * thresholds without re-exposing them as a header constant. */
    if !prof.barren && !prof.icy && prof.surface_m > 1.0 && prof.surface_m < 22.0 {
        let top = col[surface_idx as usize];
        let is_sequoia_grass = top == Block::SeqGrass.raw();
        let is_grass = top == Block::Grass.raw()
            || top == Block::JungleGrass.raw()
            || top == Block::DryGrass.raw()
            || is_sequoia_grass;
        use crate::planet_gen::Biome;
        /* Tundra grows pines straight out of the snow - the only tree
         * on a non-grass top. Snow tops classify Tundra only on
         * custom-seeded worlds, so legacy terrain never grows these. */
        let is_pine = prof.biome == Biome::Tundra
            && (top == Block::Snow.raw() || top == Block::SeqSnow.raw());
        if is_grass || is_pine {
            let h = tile_hash(body.seed, tile_idx, 0xA1B2C3D4);
            /* Per-biome density (of 256): jungles pack in dense tall
             * canopy, swamps grow scattered groves of TALL gnarled
             * trees (long bare trunk, crown way overhead), fields keep
             * the classic ~5%, tundra scatters pines, deserts and
             * mountain rock get none (their tops aren't grass anyway -
             * this is belt + braces). */
            let (density, extra_trunk) = match prof.biome {
                Biome::Jungle => (115u32, 2i32),
                Biome::Swamp => (34, 3),
                Biome::Fields | Biome::Beach => (13, 0),
                /* Pines stand alone on the snow - sparse landmarks,
                 * not a forest - but tall enough to read as conifers. */
                Biome::Tundra => (2, 3),
                Biome::Desert | Biome::Mountains => (0, 0),
                _ => (13, 0),
            };
            if (h & 0xFF) < density {
                /* Vary trunk height by a separate hash bit; jungle
                 * trunks run taller so the canopy closes overhead. */
                let trunk = 3 + ((h >> 8) & 1) as i32 + extra_trunk;
                let trunk_top = surface_idx + trunk;
                /* Pines wear a tall narrow leaf sleeve down most of the
                 * trunk (conifer silhouette); broadleaf trees keep the
                 * crown blob over the top. */
                let leaf_lo = if is_pine { surface_idx + 2 } else { trunk_top - 1 };
                let mut leaf_hi = if is_pine { trunk_top + 3 } else { trunk_top + 2 };
                if leaf_hi >= WORLD_MAX_DEPTH {
                    leaf_hi = WORLD_MAX_DEPTH - 1;
                }
                /* Trunk: stack BLOCK_WOOD above the grass top. Pines
                 * expose a single trunk block - the rest of the column
                 * is the leaf sleeve (voxels are single-column, so wood
                 * and leaves can't share a cell). */
                let trunk_wood_top = if is_pine { surface_idx + 1 } else { trunk_top };
                let mut d = surface_idx + 1;
                while d <= trunk_wood_top && d < WORLD_MAX_DEPTH {
                    col[d as usize] = Block::Wood.raw();
                    d += 1;
                }
                /* Leafy crown spread vertically over the trunk top.
                 * Sequoia uses its own red-tinted leaf block so the
                 * biome reads as alien even before you land. */
                let leaf_block = if is_sequoia_grass {
                    Block::SeqLeaves.raw()
                } else {
                    Block::Leaves.raw()
                };
                for d in leaf_lo..=leaf_hi {
                    if d <= surface_idx {
                        continue;
                    }
                    if col[d as usize] == Block::Air.raw() {
                        col[d as usize] = leaf_block;
                    }
                }
                /* Tree placement diverges this column from the bare
                 * analytic surface - the wood/leaves voxels sit above
                 * where analytic_surface_r predicts the floor is. The
                 * caller marks the column edited so walkable_floor_near
                 * takes the slow voxel-scan path instead of returning
                 * the grass radius (which is BELOW the tree, making the
                 * player fall straight through trunk and canopy). */
                return true;
            }
        }
    }

    false
}

impl World {
    /// Port of `world_create()`.
    pub fn create(body: &BodyConfig, subdivisions: i32) -> World {
        let grid = goldberg::create(subdivisions);
        let tile_count = grid.tile_count();
        let dirty_bytes = ((tile_count + 7) / 8) as usize;
        World {
            body: *body,
            grid,
            blocks: vec![0u8; (tile_count * WORLD_MAX_DEPTH) as usize],
            tile_count,
            block_entities: crate::block_entity::BlockEntityStore::new(),
            dirty: vec![0u8; dirty_bytes],
            /* Dirty queue sized to tile_count: the bit-dedup guarantees
             * at most one entry per tile between drains, so this never
             * overflows. */
            dirty_queue: Vec::with_capacity(tile_count as usize),
            saved: None,
            edited: vec![0u8; dirty_bytes],
            gen_cursor: 0,
            light: WorldLight::create(tile_count),
            /* C: w->water = world_water_create(w); (reads tile_count) */
            water: WorldWater::create(tile_count),
        }
    }

    /* world_destroy(): Drop handles the frees; the C also calls
     * world_light_destroy + world_water_destroy + goldberg_destroy
     * here. */

    /// Port of `world_clone()`. Deep-copy clone. The C builds a fresh
    /// goldberg grid for the clone (re-deriving subdivisions from the
    /// body radius); the block array is copied over wholesale. Used by
    /// the server to fan out a procgen baseline into per-room world
    /// copies without paying for worldgen each time.
    ///
    /// Like the C, this assumes the source world was created at
    /// `planet::subdivisions_for_radius(body.radius_m)` - the C
    /// memcpy reads out of bounds otherwise (UB); here the slice copy
    /// panics, which is the defined-behavior stand-in.
    pub fn clone_world(&self) -> World {
        /* Re-derive subdivisions from the body so we can build a fresh
         * grid for the clone (the grid is owned per-world and would
         * double-free if shared with the source). */
        let subs = planet::subdivisions_for_radius(self.body.radius_m);
        let mut w = World::create(&self.body, subs);
        /* The freshly-created world has empty blocks (calloc'd). Copy the
         * source's filled columns straight over - that's the procgen-
         * plus-edits state we want the clone to inherit. */
        let n = w.blocks.len();
        w.blocks.copy_from_slice(&self.blocks[..n]);
        /* Per-placed-block state travels with the snapshot. */
        w.block_entities = self.block_entities.clone();
        /* Mark gen as complete so callers don't re-run stream_gen. */
        w.gen_cursor = w.tile_count;
        /* Dirty bits start clean - the clone is a snapshot. */
        /* Light grid: copy the source's nibbles so the snapshot keeps its
         * relit state without paying for another BFS. Torches reset; the
         * client that consumes this clone republishes its torch list. */
        world_light::clone_into(&mut w.light, &self.light);
        /* Water flow state: copy the per-voxel byte array; the scheduler
         * queue resets (clones inherit the settled snapshot, not pending
         * ticks). */
        world_water::clone_into(&mut w.water, &self.water);
        w
    }

    /// Port of `world_dirty_enqueue()`. Set a tile's dirty bit and, on
    /// the 0->1 transition only, push it onto the dirty queue. Every
    /// site that dirties a tile routes through here so the renderer's
    /// drain stays in sync with the bitset: the invariant is "every set
    /// dirty bit is present exactly once in the queue (until
    /// consumed)". The bit-dedup keeps the queue bounded by tile_count,
    /// which is how it was sized in `create`.
    fn dirty_enqueue(&mut self, tile: i32) {
        if tile < 0 || tile >= self.tile_count {
            return;
        }
        let byte = (tile >> 3) as usize;
        let bit = 1u8 << (tile & 7);
        if self.dirty[byte] & bit != 0 {
            return; /* already queued */
        }
        self.dirty[byte] |= bit;
        if (self.dirty_queue.len() as i32) < self.tile_count {
            self.dirty_queue.push(tile);
        }
    }

    /// Port of `world_stream_gen()`. Generate terrain for up to
    /// `max_tiles` tiles of the pending pool. Call each frame until
    /// `gen_complete` returns true.
    ///
    /// Each tile's voxel column is generated independently (its own
    /// `blocks` slice, pure per-column noise eval), so the batch fans
    /// out across the rayon pool. Output is identical to the old
    /// sequential fill regardless of completion order - the pinned
    /// worldgen hash (`blocks`/`dirty`/`edited`) still holds. The
    /// dirty/edited bitsets pack 8 tiles per byte, so their writes run
    /// in a single-threaded pass after the parallel column build to
    /// avoid a racing read-modify-write on a shared byte.
    pub fn stream_gen(&mut self, max_tiles: i32) {
        use rayon::prelude::*;

        let start = self.gen_cursor;
        let mut end = start + max_tiles;
        if end > self.tile_count {
            end = self.tile_count;
        }
        if end <= start {
            return;
        }

        let depth = WORLD_MAX_DEPTH as usize;
        /* Disjoint field borrows: &self.body / &self.grid (shared) are a
         * different field than &mut self.blocks (exclusive), so the
         * borrow checker permits them simultaneously. */
        let body = &self.body;
        let grid = &self.grid;
        let sub = &mut self.blocks[(start as usize) * depth..(end as usize) * depth];
        let edited_flags: Vec<bool> = sub
            .par_chunks_mut(depth)
            .enumerate()
            .map(|(k, col)| gen_column(body, grid, start + k as i32, col))
            .collect();

        for i in start..end {
            /* Route through dirty_enqueue (not a raw bit-set) so each
             * generated tile lands on the dirty_queue the renderer drains;
             * the bit-dedup keeps the queue bounded. */
            self.dirty_enqueue(i);
            if edited_flags[(i - start) as usize] {
                self.edited[(i >> 3) as usize] |= 1u8 << (i & 7);
            }
        }
        self.gen_cursor = end;
    }

    /// Port of `world_gen_complete()`.
    pub fn gen_complete(&self) -> bool {
        self.gen_cursor >= self.tile_count
    }

    /// Port of `world_gen_progress_pct()`. 0..100.
    pub fn gen_progress_pct(&self) -> i32 {
        if self.tile_count <= 0 {
            return 100;
        }
        ((self.gen_cursor as i64) * 100 / self.tile_count as i64) as i32
    }

    /* ------------------------------------------------------------------- */

    /// Port of `world_get()`. Single-voxel query; out-of-range tile or
    /// depth returns AIR. (The C casts the raw byte to `block_t`; all
    /// writes go through `set`/worldgen so the byte is always in
    /// palette - an out-of-palette byte would read as AIR here.)
    pub fn get(&self, tile: i32, depth: i32) -> Block {
        if tile < 0 || tile >= self.tile_count {
            return Block::Air;
        }
        if depth < 0 || depth >= WORLD_MAX_DEPTH {
            return Block::Air;
        }
        Block::from_raw(self.blocks[(tile * WORLD_MAX_DEPTH + depth) as usize])
            .unwrap_or(Block::Air)
    }

    /// Cells adjacent to (tile, depth) for the power graph: the hex
    /// edge-neighbours at the same depth, plus the same tile one layer up
    /// and down (mirrors the JS cable connection rules).
    pub fn power_neighbors(&self, tile: i32, depth: i32) -> Vec<(i32, i32)> {
        let mut v = Vec::with_capacity(8);
        if let Some(t) = self.grid.tile(tile) {
            for i in 0..t.num_neighbors as usize {
                let n = t.neighbors[i];
                if n >= 0 {
                    v.push((n, depth));
                }
            }
        }
        if depth + 1 < WORLD_MAX_DEPTH {
            v.push((tile, depth + 1));
        }
        if depth - 1 >= 0 {
            v.push((tile, depth - 1));
        }
        v
    }

    /// Flood-fill from (tile, depth) over a connected run of `link` blocks
    /// (the modular cable / pipe network), returning true if any visited
    /// node - or the start cell itself - satisfies `target`. Direct
    /// adjacency (no link block) also counts.
    fn network_reaches(
        &self,
        tile: i32,
        depth: i32,
        link: Block,
        target: impl Fn(&Self, i32, i32) -> bool,
    ) -> bool {
        if target(self, tile, depth) {
            return true;
        }
        let mut stack: Vec<(i32, i32)> = Vec::new();
        let mut seen: Vec<(i32, i32)> = Vec::new();
        for (nt, nd) in self.power_neighbors(tile, depth) {
            if self.get(nt, nd) == link {
                stack.push((nt, nd));
            }
        }
        while let Some((ct, cd)) = stack.pop() {
            if seen.contains(&(ct, cd)) {
                continue;
            }
            seen.push((ct, cd));
            if target(self, ct, cd) {
                return true;
            }
            for (nt, nd) in self.power_neighbors(ct, cd) {
                if self.get(nt, nd) == link && !seen.contains(&(nt, nd)) {
                    stack.push((nt, nd));
                }
            }
        }
        false
    }

    /// True if a *running* steam engine is adjacent to (tile, depth).
    fn running_engine_adjacent(&self, tile: i32, depth: i32) -> bool {
        for (nt, nd) in self.power_neighbors(tile, depth) {
            if self.get(nt, nd) == Block::SteamEngine {
                if let Some(be) = self.block_entities.get(nt, nd) {
                    if let crate::block_entity::MachineState::SteamEngine(s) = be.state {
                        if s.running() {
                            return true;
                        }
                    }
                }
            }
        }
        false
    }

    /// A hydro generator is active when it sits directly on water (the JS
    /// `waterDepth > 0`): the cell one layer below is water.
    fn hydro_active(&self, tile: i32, depth: i32) -> bool {
        depth - 1 >= 0 && self.get(tile, depth - 1) == Block::Water
    }

    /// Public query for the hydro-generator UI: is it pumping (on water)?
    pub fn hydro_is_active(&self, tile: i32, depth: i32) -> bool {
        self.hydro_active(tile, depth)
    }

    /// True if an active hydro generator is adjacent to (tile, depth).
    fn active_hydro_adjacent(&self, tile: i32, depth: i32) -> bool {
        for (nt, nd) in self.power_neighbors(tile, depth) {
            if self.get(nt, nd) == Block::HydroGenerator && self.hydro_active(nt, nd) {
                return true;
            }
        }
        false
    }

    /// Electric furnace power: cable-network reach to a running steam engine.
    fn electric_powered(&self, tile: i32, depth: i32) -> bool {
        self.network_reaches(tile, depth, Block::Cable, |s, t, d| s.running_engine_adjacent(t, d))
    }

    /// Steam engine water: copper-pipe-network reach to an active hydro
    /// generator.
    fn steam_has_water(&self, tile: i32, depth: i32) -> bool {
        self.network_reaches(tile, depth, Block::CopperPipe, |s, t, d| {
            s.active_hydro_adjacent(t, d)
        })
    }

    /// True if a *powered* computer is adjacent to (tile, depth).
    fn powered_computer_adjacent(&self, tile: i32, depth: i32) -> bool {
        for (nt, nd) in self.power_neighbors(tile, depth) {
            if self.get(nt, nd) == Block::Computer {
                if let Some(be) = self.block_entities.get(nt, nd) {
                    if let crate::block_entity::MachineState::Computer(c) = be.state {
                        if c.powered {
                            return true;
                        }
                    }
                }
            }
        }
        false
    }

    /// 3D printer power: cable-network reach to a powered computer (the JS
    /// printer-needs-a-computer gate).
    fn printer_powered(&self, tile: i32, depth: i32) -> bool {
        self.network_reaches(tile, depth, Block::Cable, |s, t, d| {
            s.powered_computer_adjacent(t, d)
        })
    }

    /// Advance placed-machine behavior by `dt` seconds. Refreshes the two
    /// modular networks first - copper pipes carry water from hydro
    /// generators to steam engines, cables carry power from running steam
    /// engines to electric furnaces - then ticks every machine. Returns true
    /// on a durable change (smelt completed / coal consumed) to persist.
    pub fn tick_machines(&mut self, dt: f32) -> bool {
        /* Phase 1 (water): which steam engines are pipe-fed by an active
         * hydro generator. Apply before computing power, since a steam
         * engine only "runs" with both water and coal. */
        let engines: Vec<(i32, i32)> = self
            .block_entities
            .iter()
            .filter(|(_, _, e)| e.steam_engine().is_some())
            .map(|(t, d, _)| (t, d))
            .collect();
        let watered: Vec<(i32, i32, bool)> =
            engines.iter().map(|&(t, d)| (t, d, self.steam_has_water(t, d))).collect();
        for (t, d, wtr) in watered {
            if let Some(e) = self.block_entities.get_mut(t, d) {
                if let crate::block_entity::MachineState::SteamEngine(s) = &mut e.state {
                    s.has_water = wtr;
                }
            }
        }

        use crate::block_entity::MachineState;

        /* Phase 2 (power): computers light up from the cable network first
         * (a running engine), since printers gate on a powered computer. */
        let computers: Vec<(i32, i32)> = self
            .block_entities
            .iter()
            .filter(|(_, _, e)| matches!(e.state, MachineState::Computer(_)))
            .map(|(t, d, _)| (t, d))
            .collect();
        let comp_pow: Vec<(i32, i32, bool)> =
            computers.iter().map(|&(t, d)| (t, d, self.electric_powered(t, d))).collect();
        for (t, d, p) in comp_pow {
            if let Some(e) = self.block_entities.get_mut(t, d) {
                if let MachineState::Computer(c) = &mut e.state {
                    c.powered = p;
                }
            }
        }

        /* Phase 3: electric furnaces (cable -> running engine) and printers
         * (cable -> powered computer). */
        let consumers: Vec<(i32, i32, bool, bool)> = self
            .block_entities
            .iter()
            .filter_map(|(t, d, e)| match e.state {
                MachineState::ElectricFurnace(_) => Some((t, d, true, false)),
                MachineState::Printer(_) => Some((t, d, false, true)),
                _ => None,
            })
            .collect();
        let resolved: Vec<(i32, i32, bool)> = consumers
            .iter()
            .map(|&(t, d, is_furnace, _)| {
                let p = if is_furnace { self.electric_powered(t, d) } else { self.printer_powered(t, d) };
                (t, d, p)
            })
            .collect();
        for (t, d, p) in resolved {
            if let Some(e) = self.block_entities.get_mut(t, d) {
                match &mut e.state {
                    MachineState::ElectricFurnace(ef) => ef.powered = p,
                    MachineState::Printer(pr) => pr.powered = p,
                    _ => {}
                }
            }
        }

        /* Phase 4: tick every machine. */
        self.block_entities.tick(dt)
    }

    /// Tile-edge index (0..num_verts) whose outward midpoint direction
    /// best points at `target` (a world position), projected into the
    /// tile's tangent plane. Used to record a placed tech block's facing
    /// so its cube front turns toward the player (mirrors the JS
    /// "front faces towards player" placement). Returns
    /// `block_entity::FACING_UNSET` if the tile is invalid.
    pub fn facing_toward(&self, tile: i32, depth: i32, target: DVec3) -> u8 {
        let Some(t) = self.grid.tile(tile) else {
            return crate::block_entity::FACING_UNSET;
        };
        let up = t.center;
        let r = self.depth_to_radius_m(depth);
        let (bx, by, bz) = (up.x * r, up.y * r, up.z * r);
        /* Direction block -> target, flattened into the tangent plane. */
        let (mut tx, mut ty, mut tz) = (target.x - bx, target.y - by, target.z - bz);
        let d = tx * up.x + ty * up.y + tz * up.z;
        tx -= up.x * d;
        ty -= up.y * d;
        tz -= up.z * d;
        let tl = (tx * tx + ty * ty + tz * tz).sqrt();
        if tl < 1e-9 {
            return 0;
        }
        tx /= tl;
        ty /= tl;
        tz /= tl;
        let n = t.num_verts as i32;
        let mut best_k = 0i32;
        let mut best = f64::NEG_INFINITY;
        for k in 0..n {
            let a = t.verts[k as usize];
            let b = t.verts[((k + 1) % n) as usize];
            let (mut mx, mut my, mut mz) = ((a.x + b.x) * 0.5, (a.y + b.y) * 0.5, (a.z + b.z) * 0.5);
            let md = mx * up.x + my * up.y + mz * up.z;
            mx -= up.x * md;
            my -= up.y * md;
            mz -= up.z * md;
            let ml = (mx * mx + my * my + mz * mz).sqrt();
            if ml < 1e-9 {
                continue;
            }
            let dot = (mx * tx + my * ty + mz * tz) / ml;
            if dot > best {
                best = dot;
                best_k = k;
            }
        }
        best_k as u8
    }

    /// Port of `world_set()`.
    pub fn set(&mut self, tile: i32, depth: i32, b: Block) {
        if tile < 0 || tile >= self.tile_count {
            return;
        }
        if depth < 0 || depth >= WORLD_MAX_DEPTH {
            return;
        }
        /* No-op early-return when the new block matches the existing one.
         * The /saves/body fetch on join writes every depth of every
         * persisted tile (3840 calls for a 30-tile body) - the vast
         * majority of those are idempotent because most depths haven't
         * actually changed from procgen. Without this guard each
         * idempotent call would queue a light edit, run a removal +
         * addition BFS through the cell's neighbours, and risk
         * overflowing the BFS's bounded add queue (which silently drops
         * neighbour pushes), leaving correctly-lit surface cells stuck
         * at sky=0. The mesh dirty bitset is also untouched here - no
         * change, no remesh needed. */
        let idx = (tile * WORLD_MAX_DEPTH + depth) as usize;
        if self.blocks[idx] == b.raw() {
            return;
        }
        let old = self.blocks[idx];
        self.blocks[idx] = b.raw();
        self.dirty_enqueue(tile);

        /* The cell's contents changed, so any placed-block state (tech
         * facing, machine state) for the old occupant is stale - drop it.
         * The placement path writes a fresh entity after this set(). */
        if old != b.raw() && !self.block_entities.is_empty() {
            self.block_entities.remove(tile, depth);
        }

        /* Water-sim cleanup on block change.
         *
         * (a) WATER -> anything-else: the state byte still has whatever
         * flags the sim left there (most importantly WATER_FLAG_SOURCE
         * if this was a player-placed source). Adjacent flow cells scan
         * neighbour state bytes when looking for a supplier - a stale
         * SOURCE flag on an AIR cell makes them think the source is
         * still alive, so they never dry up. Clear the state byte and
         * re-enqueue the cell itself plus its column-up / column-down /
         * 6 edge neighbours so the sim revisits them next step.
         *
         * Bug report: "if I kill a spawner block, that should propagate
         * to adjacent chains of flow blocks" - this is the wiring.
         *
         * (b) anything-else -> WATER: a new water cell needs to be
         * scheduled too so the sim ticks it (e.g. a player-placed source
         * starts spreading immediately, or an AIR cell flooded by a
         * world_set wasn't auto-scheduled). Same enqueue list.
         *
         * Both branches enqueue the same way, so collapse the test. */
        if old == Block::Water.raw() || b == Block::Water {
            if old == Block::Water.raw() {
                /* Block leaving water. If this cell was a source, propagate
                 * the death to every downstream flow cell that listed it as
                 * an origin - those cells lose this origin reference and
                 * the standard tick-cell dry-up takes over once they have
                 * zero origins left. Done BEFORE clear_state so we can
                 * still read the SOURCE flag from the old state byte.
                 *
                 * Also drop this cell's own origin entry (if it had one as
                 * a flow cell) since the cell no longer exists. */
                let old_state = world_water::get_state(self, tile, depth);
                if world_water::state_is_source(old_state) {
                    let me = world_water::OriginRef {
                        tile: tile as u32,
                        depth: depth as u8,
                    };
                    world_water::origin_remove_global(self, me);
                }
                world_water::origin_clear(self, tile, depth);
                /* Drop the stale state byte. */
                world_water::clear_state(self, tile, depth);
            }
            world_water::enqueue(self, tile, depth);
            if depth + 1 < WORLD_MAX_DEPTH {
                world_water::enqueue(self, tile, depth + 1);
            }
            if depth - 1 >= 0 {
                world_water::enqueue(self, tile, depth - 1);
            }
            /* NB: the C iterates tn->neighbors here (unordered list),
             * not edge_neighbours - same membership, different order,
             * and order matters for queue semantics. */
            if let Some(tn) = self.grid.tile(tile).copied() {
                for i in 0..tn.num_neighbors as usize {
                    let nb = tn.neighbors[i];
                    if nb >= 0 {
                        world_water::enqueue(self, nb, depth);
                    }
                }
            }
        }
        /* Mark the column as edited from procgen so collision queries
         * fall through to the voxel-scan path. Until set, the
         * walkable-floor query short-circuits to the analytic surface
         * (zero voxel lookup) - which is the right behaviour for the
         * 99% of columns that still match procgen. The edited bit is
         * never cleared; once a tile has been touched, future floor
         * queries always read the voxel data so bridges over voids
         * and dug-out caves stand. */
        self.edited[(tile >> 3) as usize] |= 1u8 << (tile & 7);
        /* Dirty neighbors too so their seam faces rebuild. */
        let t = *self
            .grid
            .tile(tile)
            .expect("tile index validated above");
        for i in 0..t.num_neighbors as usize {
            self.dirty_enqueue(t.neighbors[i]);
        }
        /* Mark the edited cell for incremental relight - but ONLY when
         * the change actually affects light propagation. The lighting BFS
         * gates on block_covers_face: a cell is opaque-to-light iff its
         * block covers its face. Swapping between two non-covering blocks
         * (AIR <-> WATER, AIR <-> LEAVES, etc.) leaves every light path
         * through this cell unchanged, so no relight is needed.
         *
         * This is the dominant path for water-flow ticks - the simulator
         * fires dozens of AIR <-> WATER swaps per frame and they used to
         * queue a light edit each, eventually escalating to a 140 ms
         * full-rebuild that stalled the frame. Skipping the mark drops
         * the per-edit relight cost to zero for fluid motion while still
         * relighting on real block edits (placing stone, breaking dirt,
         * etc. all change covers_face). */
        if covers_face_raw(old) != blocks::covers_face(b) {
            self.light.mark_dirty_at(tile, depth);
        }
        /* Notify the water-flow scheduler about the edit. Wakes the cell
         * + its 5/6 horizontal + (up to) two vertical neighbours so the
         * flow rule re-derives their state next tick. Worldgen writes
         * the column directly without going through world_set, so the
         * legacy seafloor stays "sleeping" - only player / network /
         * simulator-driven edits land here. */
        world_water::notify_edit(self, tile, depth);
    }

    /// Port of `world_tile_mark_dirty()`. Mark a tile dirty without
    /// going through `set`. Used by the net-client path that applies a
    /// server-broadcast water-state diff: the state byte changed but no
    /// BLOCK changed, so we need to wake the renderer's remesh sweep
    /// manually.
    pub fn tile_mark_dirty(&mut self, tile: i32) {
        if tile < 0 || tile >= self.tile_count {
            return;
        }
        self.dirty_enqueue(tile);
    }

    /// Port of `world_tile_dirty()`.
    pub fn tile_dirty(&self, tile: i32) -> bool {
        if tile < 0 || tile >= self.tile_count {
            return false;
        }
        (self.dirty[(tile >> 3) as usize] & (1u8 << (tile & 7))) != 0
    }

    /// Port of `world_tile_clear_dirty()`.
    pub fn tile_clear_dirty(&mut self, tile: i32) {
        if tile < 0 || tile >= self.tile_count {
            return;
        }
        self.dirty[(tile >> 3) as usize] &= !(1u8 << (tile & 7));
    }

    /// Port of `world_dirty_tiles()`. Renderer drain interface for the
    /// dirty-tile queue: returns the tiles dirtied since the last
    /// consume (the C returns a count + an out-pointer at the internal
    /// index array; the slice borrow enforces the same "valid until the
    /// next set / mark / consume" lifetime). The caller maps each tile
    /// to its render chunk, then calls `dirty_consume` once to clear
    /// those tiles' dirty bits and empty the queue in a single pass.
    /// This replaces the per-frame "scan every tile's dirty bit" sweep.
    pub fn dirty_tiles(&self) -> &[i32] {
        &self.dirty_queue
    }

    /// Port of `world_dirty_consume()`.
    pub fn dirty_consume(&mut self) {
        /* Clear the dirty bit for every queued tile, then empty the
         * queue. Because every set bit is queued (the dirty_enqueue
         * invariant), this leaves the bitset fully clean in one pass -
         * no tile_count-wide sweep needed. */
        for k in 0..self.dirty_queue.len() {
            let tile = self.dirty_queue[k];
            self.dirty[(tile >> 3) as usize] &= !(1u8 << (tile & 7));
        }
        self.dirty_queue.clear();
    }

    /// Port of `world_tile_saved()`. "Saved" bitset: tracks which tiles
    /// have a persisted column on disk so the server can replay them to
    /// a joining client.
    pub fn tile_saved(&self, tile: i32) -> bool {
        let saved = match &self.saved {
            Some(s) => s,
            None => return false,
        };
        if tile < 0 || tile >= self.tile_count {
            return false;
        }
        (saved[(tile >> 3) as usize] & (1u8 << (tile & 7))) != 0
    }

    /// Port of `world_tile_mark_saved()`. Lazily allocates the bitmap
    /// on first mark - native server builds touch it via the saves API;
    /// client + SP builds never set anything and the bitmap stays
    /// `None`.
    pub fn tile_mark_saved(&mut self, tile: i32) {
        if tile < 0 || tile >= self.tile_count {
            return;
        }
        let saved_bytes = ((self.tile_count + 7) / 8) as usize;
        let saved = self.saved.get_or_insert_with(|| vec![0u8; saved_bytes]);
        saved[(tile >> 3) as usize] |= 1u8 << (tile & 7);
        /* A column persisted to disk diverges from procgen - otherwise
         * we wouldn't have bothered saving it. Flip edited too so the
         * walkable-floor fast path takes the slow voxel scan instead of
         * returning the analytic surface (which sits below any saved
         * tree, built bridge, or carved overhang). */
        self.edited[(tile >> 3) as usize] |= 1u8 << (tile & 7);
    }

    /// Port of `world_dirty_in_range()`. Mark every tile whose centre
    /// sits within `radius_m` of `world_pos` as dirty, so the
    /// renderer's remesh-on-dirty pass picks them up. Used by torch
    /// place/remove so per-vertex torch_light gets re-baked for
    /// affected tiles. `world_pos` is body-local (matches goldberg tile
    /// centres scaled by body radius).
    pub fn dirty_in_range(&mut self, world_pos: Vec3, radius_m: f32) {
        /* Brute-force tile sweep - cheap (40k tiles ~= 40k float compares
         * per torch event) and avoids needing a spatial index.
         *
         * Project the torch position radially onto the body surface
         * before comparing against tile centres (which sit at radius R).
         * Without the projection, a torch placed on elevated terrain
         * (e.g. a column top at radius R+7m) carries a 7m radial offset
         * the comparison can't see past - a 6m torch range then excludes
         * every tile (radial gap alone exceeds range), no chunk gets
         * dirtied, and the new torch never bakes until something else in
         * the area triggers a remesh. The projection makes the test
         * horizontal-only (great-arc chord), which is conservative -
         * slightly over-dirties on tall terrain, never under-dirties. */
        let r = self.body.radius_m;
        let pos_len =
            (world_pos.x * world_pos.x + world_pos.y * world_pos.y + world_pos.z * world_pos.z)
                .sqrt();
        if pos_len <= 0.0f32 {
            return;
        }
        let scale = r as f32 / pos_len;
        let px = world_pos.x * scale;
        let py = world_pos.y * scale;
        let pz = world_pos.z * scale;
        let r2 = radius_m * radius_m;
        for i in 0..self.tile_count {
            /* (Copy the centre out so the grid borrow ends before the
             * enqueue's &mut self - same math as the C either way.) */
            let center = match self.grid.tile(i) {
                Some(t) => t.center,
                None => continue,
            };
            let cx = (center.x * r) as f32 - px;
            let cy = (center.y * r) as f32 - py;
            let cz = (center.z * r) as f32 - pz;
            if cx * cx + cy * cy + cz * cz <= r2 {
                self.dirty_enqueue(i);
            }
        }
        /* DO NOT mark the light grid full-dirty here. world_light's
         * mark_dirty sets needs_full = true, escalating what should be a
         * tiny ripple around the torch position into a planet-wide BFS -
         * measured at ~1000 ms / 17M ops per torch place on a 160k-tile
         * body, vs the 0.4 ms / few-ops cost of a normal incremental
         * block edit.
         *
         * The torch list change is already picked up by
         * WorldLight::set_torches in hex_mesher_relight_if_needed: it
         * diffs the new list against the cached one and calls
         * mark_dirty_at on both the OLD and NEW torch cells, which routes
         * through the incremental ripple-BFS path bounded by sky_max
         * steps around each cell. The mesh dirty bits above are still
         * needed so the affected chunks remesh and pick up the
         * (newly-propagated) per-vertex torch_light values. */
    }

    /// Port of `world_depth_to_radius_m()`. Radial meters corresponding
    /// to a block depth. Depth index 0 = deepest bedrock. Sea level =
    /// SEA_LEVEL_IDX.
    pub fn depth_to_radius_m(&self, depth: i32) -> f64 {
        /* Convert so radius = body.radius_m - (SEA_LEVEL_IDX - depth) * BLOCK_HEIGHT. */
        self.body.radius_m - (SEA_LEVEL_IDX as f64 - depth as f64) * BLOCK_HEIGHT
    }

    /// Port of `world_radius_to_depth()`. Convert a body-local radius
    /// to the integer depth index of the voxel containing it.
    /// Out-of-range returns < 0 or >= WORLD_MAX_DEPTH respectively so
    /// callers can detect "below bedrock" / "above build cap".
    pub fn radius_to_depth(&self, radius_m: f64) -> i32 {
        /* Inverse of depth_to_radius_m. The voxel at depth d spans
         * radii [depth_to_radius(d), depth_to_radius(d+1)) - so flooring
         * (r - body.radius) / BLOCK_HEIGHT + SEA_LEVEL_IDX gives the
         * containing voxel. */
        let offset = radius_m - self.body.radius_m;
        (offset / BLOCK_HEIGHT).floor() as i32 + SEA_LEVEL_IDX
    }

    /// Port of `world_is_water_at()`. True when the voxel at (tile,
    /// radius) is BLOCK_WATER. Used by the player controller to gate
    /// water physics - eyes, body, feet checks sample at different
    /// radii along basis.up. Returns false for any out-of-range /
    /// ungenerated tile (treat as air).
    pub fn is_water_at(&self, tile: i32, radius_m: f64) -> bool {
        if tile < 0 || tile >= self.tile_count || tile >= self.gen_cursor {
            return false;
        }
        let depth = self.radius_to_depth(radius_m);
        if depth < 0 || depth >= WORLD_MAX_DEPTH {
            return false;
        }
        self.blocks[(tile * WORLD_MAX_DEPTH + depth) as usize] == Block::Water.raw()
    }

    /* Synthetic-surface fallback for tiles that haven't streamed yet.
     * walkable_floor_near hands this back when the requested tile is
     * past gen_cursor instead of returning the "no floor" sentinel,
     * so the player's collision code can carry on as if the analytic
     * proc-noise surface were there - the actual terrain will overwrite
     * it the moment the tile generates a frame or two later.
     *
     * Without this, ungenerated tiles read as bottomless: try_horizontal_step
     * lets the player drift in (per its "ungenerated = let the player
     * drift" branch), the ground snap then can't find a floor, and the
     * player falls all the way through the body until the MINIMUM LINE
     * safety net catches them. The analytic surface keeps them on the
     * presumptive ground while streaming catches up.
     *
     * Out-of-grid tile indices (truly invalid) still return -1e9; this
     * only kicks in for valid-but-not-yet-generated columns. */
    fn analytic_surface_r(&self, tile: i32) -> f64 {
        if tile < 0 || tile >= self.tile_count {
            return -1e9;
        }
        let t = match self.grid.tile(tile) {
            Some(t) => t,
            None => return -1e9,
        };
        let mut surface_m = planet_gen::surface_altitude(&self.body, t.center);
        if self.body.barren {
            surface_m *= 0.3;
        }
        /* Snap to the same block boundary planet_gen writes the topmost
         * solid block on. planet_gen computes:
         *   surface_idx = floor(surface_m / BLOCK_HEIGHT) + SEA_LEVEL_IDX
         *   topmost solid block lives at depth surface_idx
         *   walkable floor radius = depth_to_radius(surface_idx + 1)
         *                        = body.radius + floor(surface_m) + 1
         * Returning body.radius + surface_m (the raw analytic float)
         * left a 0..1 m mismatch with the actual mesh - depending on
         * the fractional part of surface_m, the ground snap landed the
         * player INSIDE the topmost solid block, looked grounded for a
         * frame, then re-dropped because the next physics tick saw
         * "feet in solid, no floor below" and reverted. Aligning here
         * means analytic gr == mesh gr exactly. */
        let floor_blocks = (surface_m as f64).floor() + 1.0;
        self.body.radius_m + floor_blocks
    }

    /// Port of `world_walkable_floor_near()`. Find the walkable-floor
    /// radius closest to `target_radius_m`, where a "walkable floor" is
    /// the top of a solid voxel that has air OR water in the cell above
    /// (so swimming over a flooded floor is still walkable for
    /// ground-snap purposes). Preference: a floor at or below
    /// `target_radius_m` wins over one above it when both exist, so
    /// walking onto a tile with a cave roof above and a real floor
    /// below snaps the player to the lower floor. Returns -1e9 when the
    /// tile is ungenerated or has no walkable floor.
    ///
    /// `body_height_m` is the head-clearance the floor must satisfy:
    /// the column above it must be air/water for body_height_m metres
    /// of radius. Pass <= 0 to skip the headroom check (used by ground
    /// snap after a vertical clamp; horizontal step rejection wants the
    /// headroom).
    pub fn walkable_floor_near(
        &self,
        tile: i32,
        target_radius_m: f64,
        body_height_m: f64,
    ) -> f64 {
        if tile < 0 || tile >= self.tile_count {
            return -1e9;
        }
        if tile >= self.gen_cursor {
            /* Ungenerated tile - return the analytic surface so the
             * player walks on the procgen's predicted ground instead of
             * falling into a bottomless column. Headroom isn't
             * meaningful here (there's nothing above the surface yet),
             * so we ignore body_height_m. The real terrain will replace
             * this value as soon as the tile streams. */
            return self.analytic_surface_r(tile);
        }
        /* Fast path: untouched column. If `set` never modified this
         * tile, the voxel data is bit-identical to what planet_gen wrote
         * from the procgen noise - so we can skip the column scan and
         * return the same answer the analytic surface would give. Zero
         * lookups: one bit test + one noise eval. Edited columns
         * (player-built bridges, dug-out caves) keep using the voxel
         * scan below because their data has diverged from procgen. */
        if (self.edited[(tile >> 3) as usize] >> (tile & 7)) & 1 == 0 {
            return self.analytic_surface_r(tile);
        }
        let col_base = (tile * WORLD_MAX_DEPTH) as usize;
        let col = &self.blocks[col_base..col_base + WORLD_MAX_DEPTH as usize];

        /* Scan every walkable floor in the column. We track the closest
         * floor below the target separately from the closest above, then
         * pick between them:
         *
         *   - A floor close above (within step height) BEATS any floor
         *     below. This is what makes a player-built bridge work:
         *     gravity dips the feet a cm under the bridge top each tick,
         *     and we need to snap back to the bridge instead of the
         *     planet surface tens of metres down.
         *   - Otherwise prefer the closest floor at-or-below the target.
         *     Falling into a cave with a roof a few metres overhead and a
         *     real floor below: the roof's TOP sits far above the
         *     player's feet (more than STEP_HEIGHT), so it's correctly
         *     ignored and the cave floor wins.
         *   - With no below-or-near-above candidate, fall through to the
         *     best above (may still be -1e9 if the column has no floor).
         *
         * Headroom check (body_height_m > 0): the column above the
         * candidate must be passable for body_height_m metres. */
        let mut best_radius_below = -1e9f64;
        let mut best_dist_below = 1e9f64;
        let mut best_radius_above = -1e9f64;
        let mut best_dist_above = 1e9f64;

        for d in 0..WORLD_MAX_DEPTH {
            let cur = col[d as usize];
            /* Treat the cell ABOVE the topmost stored depth as implicit
             * air - it's the open sky above the planet's build cap.
             * Without this, the topmost solid block (d = WORLD_MAX_DEPTH-1)
             * was never recognised as a walkable floor: the previous
             * `d + 1 < WORLD_MAX_DEPTH` loop bound skipped it, so a
             * player standing on a column they'd built all the way to
             * the cap got snapped down to the next floor below any
             * mid-column air pocket. Bug report: "if there's air below
             * a top-cap column, the column loses collision". */
            let up = if d + 1 < WORLD_MAX_DEPTH {
                col[(d + 1) as usize]
            } else {
                Block::Air.raw()
            };
            if block_is_passable(cur) || is_tree_raw(cur) {
                continue; /* not solid (or a tree, which is never a floor) */
            }
            if !block_is_passable(up) && !is_tree_raw(up) {
                continue; /* roofed by solid (a tree above does NOT roof) */
            }
            let floor_r = self.depth_to_radius_m(d + 1);

            if body_height_m > 0.0 {
                /* Number of overhead voxels we need clear, rounded up so
                 * a 1.8 m player needs 2 m of headroom and a 2.0 m
                 * player still only needs 2. Walk the column above and
                 * bail if any of those cells is solid. */
                let rows = (body_height_m / BLOCK_HEIGHT).ceil() as i32;
                let mut top_depth = d + rows;
                if top_depth >= WORLD_MAX_DEPTH {
                    top_depth = WORLD_MAX_DEPTH - 1;
                }
                let mut clear = true;
                for e in (d + 1)..=top_depth {
                    /* Trees don't block headroom - you stand under a canopy. */
                    if !block_is_passable(col[e as usize]) && !is_tree_raw(col[e as usize]) {
                        clear = false;
                        break;
                    }
                }
                if !clear {
                    continue;
                }
            }

            let dist = floor_r - target_radius_m;
            if dist <= 0.0 {
                let ad = -dist;
                if ad < best_dist_below {
                    best_dist_below = ad;
                    best_radius_below = floor_r;
                }
            } else if dist < best_dist_above {
                best_dist_above = dist;
                best_radius_above = floor_r;
            }
        }
        /* Bridge-aware tiebreak. A floor within step-height ABOVE the
         * target beats whatever is far below it, because the player has
         * almost certainly just dipped a hair under it via gravity and
         * needs to snap back. Only relevant when the above candidate is
         * physically close - bigger gaps (cave ceilings, terrain above an
         * overhang) keep the legacy "prefer below" behaviour. */
        let step_h = world_step_height();
        if best_radius_above > -1e8 && best_dist_above <= step_h {
            if best_radius_below < -1e8 || best_dist_above < best_dist_below {
                return best_radius_above;
            }
        }
        if best_radius_below > -1e8 {
            return best_radius_below;
        }
        best_radius_above /* may still be -1e9 if none */
    }

    /// Port of `world_topmost_solid_floor()`. Top-face radius of the
    /// topmost solid voxel in the column. No headroom check, no
    /// "passable cell above" requirement - just "is there a solid voxel
    /// here, and where does its top face sit?". Returns -1e9 when the
    /// column is entirely passable (or ungenerated for a
    /// freshly-spawned body). Used by the player ground-snap as a
    /// safety-net floor when `walkable_floor_near` rejects every solid
    /// voxel - a single-cell-tall column with a solid block directly
    /// above is technically a wall, but a player standing on top of it
    /// shouldn't fall through; this lets ground-snap keep them on the
    /// surface even when no "walkable" floor matches.
    pub fn topmost_solid_floor(&self, tile: i32) -> f64 {
        if tile < 0 || tile >= self.tile_count {
            return -1e9;
        }
        if tile >= self.gen_cursor {
            return -1e9;
        }
        let col_base = (tile * WORLD_MAX_DEPTH) as usize;
        /* Scan top-down for the first non-passable voxel. Its top face
         * sits at radius(d + 1). No "cell above must be passable" check
         * because a player standing on a buried-in-stone block still
         * needs a floor under their feet; the headroom-aware variant
         * (walkable_floor_near) is the one that should reject
         * unwalkable columns, this is the bare safety net. */
        for d in (0..WORLD_MAX_DEPTH).rev() {
            let b = self.blocks[col_base + d as usize];
            /* Trees are transparent to floor detection (see is_tree_raw):
             * skip trunk/canopy so this safety-net floor is the terrain
             * under the tree, never the canopy top. */
            if block_is_passable(b) || is_tree_raw(b) {
                continue;
            }
            return self.depth_to_radius_m(d + 1);
        }
        -1e9
    }

    /// Port of `world_safe_spawn_local()`. Find a safe body-local
    /// position above the topmost walkable floor in the direction
    /// `unit_dir` (must be normalised). Returns a vector pointing FROM
    /// the body centre to a point `headroom_m` above that floor. Used
    /// by the fall-through fail-safe so a player who somehow ended up
    /// beneath the planet's MINIMUM LINE (bedrock floor) gets placed
    /// back at the actual surface ABOVE wherever they fell from - not
    /// teleported across the planet to a prime-meridian spawn point.
    ///
    /// If the tile has no walkable floor at all (ungenerated, or
    /// pathological all-solid / all-air column), returns
    /// body.radius_m + headroom_m along unit_dir as a sane fallback.
    /// Never returns a zero vector.
    pub fn safe_spawn_local(&self, unit_dir: DVec3, headroom_m: f64) -> DVec3 {
        /* Fallback radius if there's no walkable floor to read - drop
         * the player a couple of metres above the body's nominal
         * surface so the next frame's gravity lands them on whatever's
         * generated. */
        let fallback_r = self.body.radius_m + headroom_m;
        if self.tile_count <= 0 {
            return dvec3_scale(unit_dir, fallback_r);
        }
        let tile = self.grid.find_tile(unit_dir, -1);
        if tile < 0 || tile >= self.tile_count || tile >= self.gen_cursor {
            return dvec3_scale(unit_dir, fallback_r);
        }
        /* Scan the column top-down for the topmost walkable floor (solid
         * with passable above). We want the SURFACE, not the closest
         * floor to wherever the player ended up - the caller's r is
         * presumed to be well below the world. */
        let col_base = (tile * WORLD_MAX_DEPTH) as usize;
        let mut top_floor_depth = -1;
        for d in (0..WORLD_MAX_DEPTH).rev() {
            let cur = self.blocks[col_base + d as usize];
            if block_is_passable(cur) {
                continue;
            }
            let up = if d + 1 < WORLD_MAX_DEPTH {
                self.blocks[col_base + (d + 1) as usize]
            } else {
                Block::Air.raw()
            };
            if block_is_passable(up) {
                top_floor_depth = d;
                break;
            }
        }
        if top_floor_depth < 0 {
            return dvec3_scale(unit_dir, fallback_r);
        }
        let floor_r = self.depth_to_radius_m(top_floor_depth + 1);
        dvec3_scale(unit_dir, floor_r + headroom_m)
    }

    /// Port of `world_ceiling_above()`. Bottom radius of the first
    /// solid voxel at or above `head_radius_m` in the column. Returns
    /// +1e30 when no ceiling exists (open sky). Used by the vertical
    /// integrator to clamp upward motion.
    pub fn ceiling_above(&self, tile: i32, head_radius_m: f64) -> f64 {
        if tile < 0 || tile >= self.tile_count || tile >= self.gen_cursor {
            return 1e30;
        }
        let col_base = (tile * WORLD_MAX_DEPTH) as usize;
        let mut head_depth = self.radius_to_depth(head_radius_m);
        if head_depth < 0 {
            head_depth = 0;
        }
        for d in head_depth..WORLD_MAX_DEPTH {
            let b = self.blocks[col_base + d as usize];
            if !block_is_passable(b) {
                /* This voxel is solid; its bottom radius is depth d. */
                return self.depth_to_radius_m(d);
            }
        }
        1e30
    }

    /// Port of `world_block_at_pos()`. Resolve a body-local point to
    /// its containing voxel cell. Returns the block at that (tile,
    /// depth); AIR if the position falls outside the world (above the
    /// build cap, below bedrock, or outside the goldberg grid). The
    /// lookup walks the goldberg adjacency from `tile_hint` (use the
    /// player's last_tile for cheap re-targeting; pass -1 to start
    /// from scratch).
    pub fn block_at_pos(&self, body_local_pos: Vec3, tile_hint: i32) -> Block {
        /* Goldberg grid lives on the unit sphere - normalise the body-
         * local position to look up the tile, then convert the radial
         * length back to a depth index using the same transform
         * depth_to_radius_m inverts. Anything outside the depth window
         * reads as AIR (above the build cap or "below bedrock" which
         * doesn't exist anyway). */
        let r = (body_local_pos.x as f64 * body_local_pos.x as f64
            + body_local_pos.y as f64 * body_local_pos.y as f64
            + body_local_pos.z as f64 * body_local_pos.z as f64)
            .sqrt();
        if r <= 0.0 {
            return Block::Air;
        }
        let inv = 1.0 / r;
        let dir = DVec3 {
            x: body_local_pos.x as f64 * inv,
            y: body_local_pos.y as f64 * inv,
            z: body_local_pos.z as f64 * inv,
        };
        let tile = self.grid.find_tile(dir, tile_hint);
        if tile < 0 {
            return Block::Air;
        }
        let depth = (r - self.body.radius_m).floor() as i32 + SEA_LEVEL_IDX;
        if depth < 0 || depth >= WORLD_MAX_DEPTH {
            return Block::Air;
        }
        Block::from_raw(self.blocks[(tile * WORLD_MAX_DEPTH + depth) as usize])
            .unwrap_or(Block::Air)
    }

    /// Convenience wrapper preserving the C call shape
    /// `world_light_rebuild(w->light, w)` - splits the `light` /
    /// `blocks` / `grid` borrows so callers don't have to.
    pub fn light_rebuild(&mut self) {
        self.light.rebuild(&self.blocks, &self.grid);
    }
}

/* True if a block byte is "passable" from the player's POV (air or
 * water). Walkable floors are solid blocks with a passable cell
 * directly above. */
#[inline]
fn block_is_passable(b: u8) -> bool {
    b == Block::Air.raw() || b == Block::Water.raw()
}

/// A tree voxel (trunk or canopy). Trees are stored as solid voxels in
/// the same column as the terrain, but for FLOOR detection they must be
/// transparent: a trunk is never a floor to stand on and never a roof
/// over the ground beneath it (that ground is the real walkable surface),
/// and the canopy is not a floor either. The trunk is a HORIZONTAL
/// obstacle only, handled by the client's trunk-cylinder collider. Making
/// the floor scans ignore trees is what stops the player sinking through
/// the ground next to / under a tree - the grass beneath a trunk used to
/// read as "roofed" (by the trunk) and get rejected as a floor, leaving
/// only the unreachable canopy top, so the player was never grounded.
fn is_tree_raw(b: u8) -> bool {
    b == Block::Wood.raw() || b == Block::Leaves.raw() || b == Block::SeqLeaves.raw()
}

/* Vertical tolerance for "step me up onto a floor that's slightly
 * above where I asked". Sourced from lod.yaml's step_height_m - the
 * same knob player_ctrl reads, so the two stay in lock-step without
 * a duplicate define. It's the same physical concept: how far the
 * player can be lifted by ground-snap without it feeling like
 * teleport. A bridge whose top sits 1 cm above the player's feet
 * (after one tick of gravity) must be picked over the distant planet
 * ground below, otherwise the player falls through their own builds. */
fn world_step_height() -> f64 {
    config::lod().step_height_m as f64
}

/* ----------------------------------------------------------------------- */

#[cfg(test)]
mod tests {
    use super::*;
    use crate::math::{dvec3_make, vec3_make};
    use crate::planet::BodyId;

    /* All concrete pins below were generated by compiling
     * tenebris-c/src/core/{world,world_light,goldberg,planet,planet_gen,
     * blocks,config,math,rng}.c with gcc 13.2 -O2 plus a no-op
     * world_water stub (every pinned path is water-free) and printing
     * FNV-1a-64 hashes, %.17g doubles (round-trip exact) and raw
     * column bytes from a harness. Compiled-in config defaults are in
     * effect on both sides; the shipped lod.yaml/lighting.yaml values
     * match those defaults for every field these paths read. */

    fn fnv1a64(p: &[u8]) -> u64 {
        let mut h = 14695981039346656037u64;
        for &b in p {
            h ^= b as u64;
            h = h.wrapping_mul(1099511628211);
        }
        h
    }

    fn tenebris_world() -> World {
        let body = planet::get(BodyId::Tenebris);
        let mut w = World::create(&body, 3);
        while !w.gen_complete() {
            w.stream_gen(100);
        }
        w
    }

    /* C: first column containing BLOCK_WOOD / BLOCK_WATER on Tenebris
     * at subdivisions=3 (worldgen order). */
    const TREE_TILE: i32 = 73;
    const WATER_TILE: i32 = 2;

        const COL_0: [u8; 128] = [23, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 27, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 28, 5, 5, 5, 5, 5, 5, 28, 5, 5, 5, 5, 5, 5, 5, 5, 5, 25, 5, 26, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        const COL_100: [u8; 128] = [23, 5, 28, 5, 5, 5, 25, 27, 25, 5, 5, 5, 26, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 27, 5, 5, 5, 5, 5, 5, 26, 5, 5, 5, 5, 5, 5, 5, 5, 25, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        const COL_333: [u8; 128] = [23, 5, 25, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 28, 5, 5, 5, 5, 26, 5, 5, 5, 5, 5, 26, 5, 5, 28, 5, 25, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        const COL_641: [u8; 128] = [23, 5, 5, 25, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 28, 5, 5, 5, 5, 5, 26, 5, 5, 5, 5, 5, 28, 5, 25, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 27, 5, 5, 5, 5, 5, 3, 3, 3, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        const COL_TREE: [u8; 128] = [23, 5, 5, 5, 5, 5, 5, 25, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 25, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 28, 5, 5, 5, 5, 5, 5, 25, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 4, 21, 21, 21, 22, 22, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        const COL_WATER: [u8; 128] = [23, 5, 28, 5, 5, 5, 5, 5, 5, 5, 5, 26, 5, 27, 5, 5, 5, 5, 5, 5, 5, 25, 5, 5, 5, 5, 28, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 28, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 2, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    #[test]
    fn pin_worldgen_tenebris_subdiv3() {
        let body = planet::get(BodyId::Tenebris);
        let mut w = World::create(&body, 3);
        assert_eq!(w.tile_count, 642);
        assert!(!w.gen_complete());
        assert_eq!(w.gen_progress_pct(), 0);

        /* Streamed fill: 100 tiles per call, cursor semantics. */
        w.stream_gen(100);
        assert_eq!(w.gen_progress_pct(), 15);
        assert!(!w.gen_complete());
        assert_eq!(fnv1a64(&w.blocks), 4884556097185618959);
        while !w.gen_complete() {
            w.stream_gen(100);
        }
        assert_eq!(w.gen_progress_pct(), 100);
        assert_eq!(fnv1a64(&w.blocks), 11545374911774499490);
        assert_eq!(fnv1a64(&w.dirty), 13535398748077020770);
        assert_eq!(fnv1a64(&w.edited), 17202780500993738236);

        /* First tree / water columns land where the C put them. */
        let mut tree_tile = -1;
        let mut water_tile = -1;
        for t in 0..w.tile_count {
            for d in 0..WORLD_MAX_DEPTH {
                let b = w.blocks[(t * WORLD_MAX_DEPTH + d) as usize];
                if b == Block::Wood.raw() && tree_tile < 0 {
                    tree_tile = t;
                }
                if b == Block::Water.raw() && water_tile < 0 {
                    water_tile = t;
                }
            }
            if tree_tile >= 0 && water_tile >= 0 {
                break;
            }
        }
        assert_eq!(tree_tile, TREE_TILE);
        assert_eq!(water_tile, WATER_TILE);

        /* Whole-column byte pins (the 128-byte tile column is the
         * save / wire unit - byte-identical or bust). */
        let col = |t: i32| &w.blocks[(t * WORLD_MAX_DEPTH) as usize..((t + 1) * WORLD_MAX_DEPTH) as usize];
        assert_eq!(col(0), &COL_0[..]);
        assert_eq!(col(100), &COL_100[..]);
        assert_eq!(col(333), &COL_333[..]);
        assert_eq!(col(641), &COL_641[..]);
        assert_eq!(col(TREE_TILE), &COL_TREE[..]);
        assert_eq!(col(WATER_TILE), &COL_WATER[..]);
    }

    #[test]
    fn pin_geometry_queries() {
        let w = tenebris_world();
        let r = w.body.radius_m;
        assert_eq!(w.depth_to_radius_m(0), 236.0);
        assert_eq!(w.depth_to_radius_m(64), 300.0);
        assert_eq!(w.depth_to_radius_m(127), 363.0);
        assert_eq!(w.radius_to_depth(r), 64);
        assert_eq!(w.radius_to_depth(r - 0.5), 63);
        assert_eq!(w.radius_to_depth(r + 63.999), 127);
        assert_eq!(w.radius_to_depth(r - 64.0), 0);
        assert_eq!(w.get(100, 64), Block::Air);
        assert_eq!(w.get(-1, 64), Block::Air);
        assert_eq!(w.get(0, 128), Block::Air);
        assert_eq!(w.get(0, 0), Block::Bedrock);
    }

    /// Heavy: generate a world at the REAL game subdivision (7) and verify
    /// the walkable floor under every sampled tree is the terrain ground,
    /// never the canopy - the exact condition the in-game fall-through
    /// depended on (the reported log showed gr=canopy while ground was
    /// metres below). #[ignore]d so CI stays fast; run with
    /// `cargo test -p tenebris-core --lib tree_floor_real_subdiv -- --ignored --nocapture`.
    #[test]
    #[ignore]
    fn tree_floor_real_subdiv() {
        let mut body = planet::get(BodyId::Tenebris);
        body.seed = 0xC0FFEE_D00D; /* seeded = a real SP world (biomes/trees) */
        let mut w = World::create(&body, 7);
        while !w.gen_complete() {
            w.stream_gen(4000);
        }
        let r = w.body.radius_m;
        let mut checked = 0;
        let mut bad = 0;
        for t in 0..w.tile_count {
            let base = (t * WORLD_MAX_DEPTH) as usize;
            let col = &w.blocks[base..base + WORLD_MAX_DEPTH as usize];
            let mut top = -1i32;
            for d in (0..WORLD_MAX_DEPTH).rev() {
                if col[d as usize] != Block::Air.raw() && col[d as usize] != Block::Water.raw() {
                    top = d;
                    break;
                }
            }
            if top < 2 {
                continue;
            }
            if !(1..=top).any(|d| col[d as usize] == Block::Wood.raw()) {
                continue; /* not a tree tile */
            }
            let gd = (1..=top)
                .rev()
                .find(|&d| {
                    let b = col[d as usize];
                    b != Block::Air.raw() && b != Block::Water.raw() && !is_tree_raw(b)
                })
                .unwrap();
            let ground = w.depth_to_radius_m(gd + 1);
            let canopy = w.depth_to_radius_m(top + 1);
            let gr = w.walkable_floor_near(t, r + 40.0, 1.8);
            checked += 1;
            /* The floor must be the terrain ground under the tree, and must
             * be strictly below the canopy top (the old bug returned the
             * canopy, tens of dm above the ground). */
            if (gr - ground).abs() > 1e-6 || (canopy > ground + 0.5 && gr >= canopy) {
                bad += 1;
                if bad <= 5 {
                    eprintln!(
                        "BAD tree tile {t}: floor gr={gr:.2} ground={ground:.2} canopy={canopy:.2}"
                    );
                }
            }
            if checked >= 200 {
                break;
            }
        }
        eprintln!("tree_floor_real_subdiv: checked={checked} bad={bad}");
        assert!(checked > 0, "no trees generated at subdiv 7");
        assert_eq!(bad, 0, "{bad}/{checked} tree tiles had the floor above ground (canopy bug)");
    }

    #[test]
    fn tree_is_transparent_to_floor() {
        /* Regression for the "sink through the ground next to / under a
         * tree" bug: trees must never form the walkable floor and never
         * roof the ground beneath them. The floor under a tree is the
         * terrain surface; the trunk is a horizontal obstacle only. */
        let mut w = tenebris_world();
        let r = w.body.radius_m;

        /* --- Case 2: tree at ground level (walk into a trunk). --- */
        let t = 100;
        for d in 1..WORLD_MAX_DEPTH {
            w.set(t, d, Block::Air);
        }
        w.set(t, 69, Block::Dirt);
        w.set(t, 70, Block::Grass); /* surface: top face = radius(71) */
        w.set(t, 71, Block::Wood); /* trunk sits on the grass */
        w.set(t, 72, Block::Wood);
        w.set(t, 73, Block::Wood);
        w.set(t, 74, Block::Leaves);
        w.set(t, 75, Block::Leaves); /* canopy: top face = radius(76) */
        let ground = w.depth_to_radius_m(71);
        let canopy = w.depth_to_radius_m(76);
        assert_eq!(
            w.walkable_floor_near(t, r + 10.0, 1.8),
            ground,
            "floor under a tree must be the terrain grass, not the canopy"
        );
        assert_eq!(w.walkable_floor_near(t, r + 10.0, 0.0), ground);
        assert_ne!(w.walkable_floor_near(t, r + 10.0, 1.8), canopy);
        assert!(
            w.walkable_floor_near(t, r + 10.0, 1.8) > -1e8,
            "must find a floor, never the void (the fall-through)"
        );
        assert_eq!(w.topmost_solid_floor(t), ground);
        /* Standing on the grass under the trunk: the floor is right at the
         * feet (grounded), not tens of metres up in the leaves. */
        assert!((w.walkable_floor_near(t, ground, 0.0) - ground).abs() < 1e-6);

        /* --- Case 1: tree on a block raised one higher. --- */
        let t2 = 101;
        for d in 1..WORLD_MAX_DEPTH {
            w.set(t2, d, Block::Air);
        }
        w.set(t2, 69, Block::Dirt);
        w.set(t2, 70, Block::Grass); /* lower terrain */
        w.set(t2, 71, Block::Dirt); /* the raised block, one higher */
        w.set(t2, 72, Block::Wood); /* tree planted on the raised block */
        w.set(t2, 73, Block::Wood);
        w.set(t2, 74, Block::Leaves);
        let raised_top = w.depth_to_radius_m(72);
        assert_eq!(
            w.walkable_floor_near(t2, r + 10.0, 1.8),
            raised_top,
            "floor on a raised block with a tree is the block top, not the canopy"
        );
        assert!(w.walkable_floor_near(t2, r + 10.0, 1.8) > -1e8);
    }

    #[test]
    fn pin_floors_ceilings_water() {
        let w = tenebris_world();
        let r = w.body.radius_m;
        /* Tile 100 is pristine -> analytic fast path; the tree tile is
         * marked edited by worldgen -> voxel scan. */
        assert_eq!(w.walkable_floor_near(100, r + 5.0, 1.8), 300.0);
        assert_eq!(w.walkable_floor_near(100, r + 5.0, 0.0), 300.0);
        assert_eq!(w.walkable_floor_near(TREE_TILE, r + 5.0, 1.8), 308.0);
        assert_eq!(w.walkable_floor_near(TREE_TILE, r + 20.0, 0.0), 308.0);
        assert_eq!(w.walkable_floor_near(WATER_TILE, r, 1.8), 297.0);
        assert_eq!(w.walkable_floor_near(-1, r, 1.8), -1e9);
        assert_eq!(w.topmost_solid_floor(100), 300.0);
        assert_eq!(w.topmost_solid_floor(TREE_TILE), 308.0);
        assert_eq!(w.topmost_solid_floor(WATER_TILE), 297.0);
        assert_eq!(w.topmost_solid_floor(-1), -1e9);
        assert_eq!(w.ceiling_above(100, r - 10.0), 290.0);
        assert_eq!(w.ceiling_above(TREE_TILE, r - 10.0), 290.0);
        assert_eq!(w.ceiling_above(100, r + 50.0), 1e30);
        assert!(w.is_water_at(WATER_TILE, r - 0.5));
        assert!(!w.is_water_at(100, r - 0.5));
        assert!(!w.is_water_at(-1, r - 0.5));
    }

    #[test]
    fn pin_safe_spawn_and_block_at_pos() {
        let w = tenebris_world();
        let s = w.safe_spawn_local(dvec3_make(0.0, 1.0, 0.0), 2.0);
        assert_eq!((s.x, s.y, s.z), (0.0, 321.0, 0.0));
        let dir = dvec3_make(
            0.48507125007266594,
            -0.72760687510899891,
            0.48507125007266594,
        );
        let s = w.safe_spawn_local(dir, 1.5);
        assert_eq!(s.x, 152.06983689778076);
        assert_eq!(s.y, -228.10475534667117);
        assert_eq!(s.z, 152.06983689778076);

        let t = w.grid.tile(100).unwrap();
        let r = w.body.radius_m;
        let expected = [Block::Dirt, Block::Air, Block::Air];
        for (i, off) in [-2.0f64, 0.5, 3.0].iter().enumerate() {
            let p = vec3_make(
                (t.center.x * (r + off)) as f32,
                (t.center.y * (r + off)) as f32,
                (t.center.z * (r + off)) as f32,
            );
            assert_eq!(w.block_at_pos(p, -1), expected[i], "off {}", off);
            assert_eq!(w.block_at_pos(p, 100), expected[i], "hinted off {}", off);
        }
        assert_eq!(w.block_at_pos(vec3_make(0.0, 0.0, 0.0), -1), Block::Air);
    }

    #[test]
    fn pin_edits_tenebris_tile100() {
        let mut w = tenebris_world();
        let r = w.body.radius_m;
        let top100 = 63; /* pinned from C: topmost solid depth of tile 100 */

        w.set(100, top100 + 3, Block::Stone);
        w.set(100, top100, Block::Air);
        w.set(100, top100, Block::Air); /* idempotent no-op */
        assert!(w.tile_dirty(100));
        assert_eq!(w.get(100, top100 + 3), Block::Stone);
        assert_eq!(w.get(100, top100), Block::Air);
        assert_eq!(fnv1a64(&w.blocks), 9303898390399885589);
        assert_eq!(fnv1a64(&w.edited), 9693716676437662316);

        /* Tile 100 is edited now -> voxel-scan floor path. */
        assert_eq!(w.walkable_floor_near(100, r + 5.0, 1.8), 303.0);
        /* Bridge tiebreak: a floor 5 mm above the target wins. */
        assert_eq!(
            w.walkable_floor_near(100, w.depth_to_radius_m(top100 + 4) - 0.005, 1.8),
            303.0
        );
        assert_eq!(w.topmost_solid_floor(100), 303.0);
        assert_eq!(w.ceiling_above(100, r - 10.0), 290.0);
    }

    #[test]
    fn pin_dirty_in_range() {
        let mut w = tenebris_world();
        for t in 0..w.tile_count {
            w.tile_clear_dirty(t);
        }
        let t100 = *w.grid.tile(100).unwrap();
        let r = w.body.radius_m;
        let pos = vec3_make(
            (t100.center.x * (r + 7.0)) as f32,
            (t100.center.y * (r + 7.0)) as f32,
            (t100.center.z * (r + 7.0)) as f32,
        );
        w.dirty_in_range(pos, 6.0);
        let n = (0..w.tile_count).filter(|&t| w.tile_dirty(t)).count();
        assert_eq!(n, 1);
        assert_eq!(fnv1a64(&w.dirty), 8198718653145391215);
        /* Degenerate position is a no-op. */
        w.dirty_in_range(vec3_make(0.0, 0.0, 0.0), 6.0);
        let n2 = (0..w.tile_count).filter(|&t| w.tile_dirty(t)).count();
        assert_eq!(n2, 1);
    }

    #[test]
    fn pin_clone_world() {
        /* Body whose tile count survives world_clone's re-derived
         * subdivision count (the only defined-behavior case in C). */
        let body = planet::get(BodyId::Asteroid2);
        let subs = planet::subdivisions_for_radius(body.radius_m);
        assert_eq!(subs, 4);
        let mut a = World::create(&body, subs);
        while !a.gen_complete() {
            a.stream_gen(500);
        }
        let mut top_a = -1;
        for d in (0..WORLD_MAX_DEPTH).rev() {
            let b = a.blocks[(7 * WORLD_MAX_DEPTH + d) as usize];
            if b != Block::Air.raw() && b != Block::Water.raw() {
                top_a = d;
                break;
            }
        }
        a.set(7, top_a + 1, Block::Stone);

        let c = a.clone_world();
        assert_eq!(c.tile_count, 2562);
        assert!(c.gen_complete());
        assert_eq!(fnv1a64(&c.blocks), 16818736218024748198);
        assert_eq!(fnv1a64(&c.blocks), fnv1a64(&a.blocks));
        /* Dirty bits start clean - the clone is a snapshot. */
        assert_eq!(fnv1a64(&c.dirty), 5412308683477963487);
        assert!(!c.tile_dirty(7));
        assert!(c.saved.is_none());
    }

    #[test]
    fn tundra_pines_and_swamp_groves_generate() {
        /* Seeded world (same seed the planet_gen biome tests use):
         * high latitudes must grow pines out of the snow (wood block
         * directly on a snow top) and swamps must grow TALL groves
         * (trunk runs of 6+ wood). Legacy default-seed worlds grow
         * neither - the biome layer is seed-gated. */
        let mut body = planet::get(BodyId::Tenebris);
        body.seed = 0xC0FFEE_D00D;
        /* Subdiv 4 (not 3): after the ice cap shrank (COLD_LATITUDE 0.75 ->
         * 0.875) the Tundra band is narrow, so a coarse subdiv-3 grid can
         * miss every snow-topped tree tile in it. The finer grid samples
         * the smaller band densely enough to catch a pine - the feature is
         * unchanged, only the area it covers. */
        let mut w = World::create(&body, 4);
        while !w.gen_complete() {
            w.stream_gen(4096);
        }
        let mut pine = false;
        let mut grove = false;
        for i in 0..w.tile_count {
            let mut wood_run = 0;
            for d in 1..WORLD_MAX_DEPTH {
                let b = w.get(i, d);
                if b == Block::Wood {
                    if wood_run == 0 && w.get(i, d - 1) == Block::Snow {
                        pine = true;
                    }
                    wood_run += 1;
                } else {
                    if wood_run >= 6 {
                        grove = true;
                    }
                    wood_run = 0;
                }
            }
        }
        assert!(pine, "seeded world grew no snow pines");
        assert!(grove, "seeded world grew no tall swamp groves");
    }

    #[test]
    fn set_get_roundtrip_and_noop() {
        let body = planet::get(BodyId::Tenebris);
        let mut w = World::create(&body, 3);
        w.stream_gen(w.tile_count);

        /* Round-trip every palette block through a voxel. */
        for raw in 0..crate::blocks::BLOCK_COUNT {
            let b = Block::from_raw(raw).unwrap();
            w.set(10, 100, b);
            assert_eq!(w.get(10, 100), b);
        }
        /* Out-of-range writes are dropped. */
        w.set(-1, 0, Block::Stone);
        w.set(w.tile_count, 0, Block::Stone);
        w.set(0, -1, Block::Stone);
        w.set(0, WORLD_MAX_DEPTH, Block::Stone);

        /* No-op set leaves dirty bits untouched. */
        w.tile_clear_dirty(10);
        let before = w.get(10, 100);
        w.set(10, 100, before);
        assert!(!w.tile_dirty(10));
        /* A real set dirties the tile + its neighbours. */
        w.set(10, 100, Block::Sand);
        assert!(w.tile_dirty(10));
        let t = *w.grid.tile(10).unwrap();
        for i in 0..t.num_neighbors as usize {
            assert!(w.tile_dirty(t.neighbors[i]));
        }
        /* tile_mark_dirty / tile_clear_dirty round-trip. */
        w.tile_clear_dirty(10);
        assert!(!w.tile_dirty(10));
        w.tile_mark_dirty(10);
        assert!(w.tile_dirty(10));
        assert!(!w.tile_dirty(-1));
        assert!(!w.tile_dirty(w.tile_count));
    }

    #[test]
    fn saved_bitset_lazy_alloc_and_edited_coupling() {
        let body = planet::get(BodyId::Tenebris);
        let mut w = World::create(&body, 3);
        w.stream_gen(w.tile_count);
        assert!(w.saved.is_none());
        assert!(!w.tile_saved(5));
        w.tile_mark_saved(5);
        assert!(w.tile_saved(5));
        assert!(!w.tile_saved(6));
        /* Marking saved also flips edited (saved columns diverge from
         * procgen by definition). */
        assert_eq!((w.edited[5 >> 3] >> (5 & 7)) & 1, 1);
        /* Out-of-range marks are dropped without allocating. */
        let mut w2 = World::create(&body, 3);
        w2.tile_mark_saved(-1);
        w2.tile_mark_saved(w2.tile_count);
        assert!(w2.saved.is_none());
    }

    #[test]
    fn ungenerated_tiles_read_as_air_and_analytic_floor() {
        let body = planet::get(BodyId::Tenebris);
        let w = World::create(&body, 3); /* gen_cursor = 0, nothing streamed */
        let r = w.body.radius_m;
        /* Ungenerated voxels are AIR (calloc'd), and the collision
         * helpers treat the tile as ungenerated. */
        assert_eq!(w.get(100, 64), Block::Air);
        assert!(!w.is_water_at(WATER_TILE, r - 0.5));
        assert_eq!(w.topmost_solid_floor(100), -1e9);
        assert_eq!(w.ceiling_above(100, r - 10.0), 1e30);
        /* walkable_floor_near falls back to the analytic surface - the
         * same value the generated world's pristine fast path returns. */
        assert_eq!(w.walkable_floor_near(100, r + 5.0, 1.8), 300.0);
        /* safe_spawn falls back to radius + headroom on ungenerated
         * tiles. */
        let s = w.safe_spawn_local(dvec3_make(0.0, 1.0, 0.0), 2.0);
        assert_eq!((s.x, s.y, s.z), (0.0, 302.0, 0.0));
    }

    /* ------------------------------------------------------------------ */
    /* Dirty-tile queue invariants (C: world_dirty_enqueue /
     * world_dirty_tiles / world_dirty_consume). */

    #[test]
    fn dirty_queue_dedup_fifo_and_bounds() {
        let body = planet::get(BodyId::Tenebris);
        let mut w = World::create(&body, 3); /* nothing streamed - queue empty */
        assert!(w.dirty_tiles().is_empty());

        /* FIFO: tiles come back in mark order, not index order. */
        w.tile_mark_dirty(5);
        w.tile_mark_dirty(3);
        w.tile_mark_dirty(9);
        assert_eq!(w.dirty_tiles(), &[5, 3, 9]);

        /* Dedup: re-marking an already-dirty tile is a no-op push
         * (the bit-dedup only queues on the 0->1 edge). */
        w.tile_mark_dirty(5);
        w.tile_mark_dirty(3);
        assert_eq!(w.dirty_tiles(), &[5, 3, 9]);

        /* Bounds guard: out-of-range tiles touch neither bits nor
         * queue. */
        w.tile_mark_dirty(-1);
        w.tile_mark_dirty(w.tile_count);
        assert_eq!(w.dirty_tiles(), &[5, 3, 9]);
        assert!(!w.tile_dirty(-1));
        assert!(!w.tile_dirty(w.tile_count));

        /* Consume clears the queued tiles' bits and empties the queue
         * in one pass. */
        w.dirty_consume();
        assert!(w.dirty_tiles().is_empty());
        assert!(!w.tile_dirty(5));
        assert!(!w.tile_dirty(3));
        assert!(!w.tile_dirty(9));

        /* After a consume the 0->1 edge fires again. */
        w.tile_mark_dirty(3);
        assert_eq!(w.dirty_tiles(), &[3]);
        assert!(w.tile_dirty(3));
    }

    #[test]
    fn dirty_queue_tracks_gen_set_and_consume() {
        let mut w = tenebris_world();
        /* Worldgen dirtied every tile exactly once, in gen order - the
         * queue is full but never overflows its tile_count sizing. */
        assert_eq!(w.dirty_tiles().len(), w.tile_count as usize);
        for (k, &t) in w.dirty_tiles().iter().enumerate() {
            assert_eq!(t, k as i32);
        }
        w.dirty_consume();
        assert!(w.dirty_tiles().is_empty());
        for t in 0..w.tile_count {
            assert!(!w.tile_dirty(t), "tile {} still dirty after consume", t);
        }

        /* world_set queues the edited tile first, then its neighbours
         * (seam rebuilds), each exactly once. */
        w.set(100, 66, Block::Stone);
        let t100 = *w.grid.tile(100).unwrap();
        let q = w.dirty_tiles();
        assert_eq!(q.len(), 1 + t100.num_neighbors as usize);
        assert_eq!(q[0], 100);
        for i in 0..t100.num_neighbors as usize {
            assert_eq!(q[1 + i], t100.neighbors[i]);
        }
        /* Editing the same tile again adds nothing new - every queued
         * tile's bit is already set. */
        w.set(100, 67, Block::Stone);
        assert_eq!(w.dirty_tiles().len(), 1 + t100.num_neighbors as usize);
    }
}
