//! Crops (client) - planting, growth ticking, the plant/harvest pick, and
//! the immediate-mode rendering for the crops whose growth model lives in
//! `core::farming`.
//!
//! Structure mirrors `animals.rs`: a thread-local list plus a
//! bounding-sphere raycast the plant/harvest handler calls, with rendering
//! through `sokol_gl` (no generated shader) so a crop is a handful of
//! shaded boxes that grow taller + sprout berries as it ripens. Placement
//! reuses the block the player is already aiming at (the `interact` target)
//! so a seed plants on top of the highlighted ground - the same target the
//! torch placement path uses.
//!
//! Unlike animals, crops are player-made world state: they are never
//! auto-spawned and never culled (that would delete the player's farm);
//! they persist same-frame via `persistence::save_crops` (the CLAUDE.md
//! world-edit rule) and reload through `restore`.

use std::cell::{Cell, RefCell};

use sokol::gl as sgl;

use tenebris_core::blocks::Block;
use tenebris_core::farming::{self, Crop, CropKind};
use tenebris_core::math::{
    dvec3_add, dvec3_cross, dvec3_length, dvec3_make, dvec3_normalize, dvec3_scale, dvec3_sub,
    DVec3, Vec3,
};
use tenebris_core::world::{World, WORLD_MAX_DEPTH};

use crate::gfx_math::Mat4;
use crate::interact::InteractState;
use crate::player_ctrl::PlayerCtrl;
use crate::renderer;

/// Reach (metres) for the plant / harvest pick - matches interact::MAX_DIST.
const REACH_M: f32 = 8.0;
/// A new crop must be at least this far from an existing one (no stacking).
const MIN_SPACING_M: f64 = 0.6;
/// Bounding-sphere radius + centre height for the harvest raycast.
const HIT_RADIUS_M: f32 = 0.5;
const HIT_CENTRE_UP_M: f64 = 0.35;

/// What a plant/harvest attempt did, so the caller can update the bag,
/// persist the change, and (in MP) tell the server. The payload is the
/// crop that was planted / removed.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum Outcome {
    /// A seed was consumed and this crop planted.
    Planted(Crop),
    /// This mature crop was harvested and removed.
    Harvested(Crop),
    /// Dirt / grass at (tile, depth) was tilled into farmland with a hoe.
    /// The caller applies the world edit (set the cell to `Farmland`),
    /// persists, and in MP relays it - a normal block edit.
    Tilled(i32, i32),
    /// A crop is under the reticle but not ripe yet.
    NotReady,
    /// Nothing actionable (no ground target / no seeds / out of reach).
    None,
}

struct State {
    list: Vec<Crop>,
    /// WILD fruit plants scattered in fields / jungle. Deterministic per
    /// tile (not player-planted), always ripe, kept only near the player -
    /// so they are NOT persisted (they re-derive on approach). Harvest one
    /// for the fruit + seeds that bootstrap an orchard.
    wild: Vec<Crop>,
    /// Tiles whose wild plant was harvested this session, so it doesn't
    /// instantly respawn while the player lingers (clears on reload).
    wild_harvested: std::collections::HashSet<i32>,
    body_center: DVec3,
    /// Growth (0..1) of the crop under the reticle this frame, for the HUD
    /// hint. `None` when the player isn't looking at a crop.
    reticle_growth: Option<f32>,
}

thread_local! {
    static S: RefCell<State> = RefCell::new(State {
        list: Vec::new(),
        wild: Vec::new(),
        wild_harvested: std::collections::HashSet::new(),
        body_center: DVec3::default(),
        reticle_growth: None,
    });
    static PIP3D: Cell<sgl::Pipeline> = const { Cell::new(sgl::Pipeline { id: 0 }) };
}

pub fn init() {
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        s.list.clear();
        s.wild.clear();
        s.wild_harvested.clear();
        s.reticle_growth = None;
    });
}

pub fn count() -> usize {
    S.with(|c| c.borrow().list.len())
}

/// Growth (0..1) of the crop currently under the reticle, for the HUD.
pub fn reticle_growth() -> Option<f32> {
    S.with(|c| c.borrow().reticle_growth)
}

/// Snapshot of the live list, for the same-frame persistence save.
pub fn list() -> Vec<Crop> {
    S.with(|c| c.borrow().list.clone())
}

/// Replace the list from a loaded snapshot (world load).
pub fn restore(crops: Vec<Crop>) {
    S.with(|c| c.borrow_mut().list = crops);
}

/* ---------------------------------------------------------------------- */
/* Look ray - the eye + forward the player is aiming (mirror interact).    */

fn look_ray(p: &PlayerCtrl) -> (Vec3, Vec3) {
    let b = &p.basis;
    let eye = dvec3_add(p.position, dvec3_scale(b.up, 1.6));
    let (cy, sy) = ((p.yaw as f64).cos(), (p.yaw as f64).sin());
    let (cp, sp) = ((p.pitch as f64).cos(), (p.pitch as f64).sin());
    let fwd = dvec3_add(dvec3_scale(b.fwd, cy), dvec3_scale(b.right, sy));
    let look = dvec3_normalize(dvec3_add(dvec3_scale(fwd, cp), dvec3_scale(b.up, sp)));
    (
        Vec3 { x: eye.x as f32, y: eye.y as f32, z: eye.z as f32 },
        Vec3 { x: look.x as f32, y: look.y as f32, z: look.z as f32 },
    )
}

/* ---------------------------------------------------------------------- */
/* Per-frame: grow every crop + refresh the reticle hint.                  */

/// `block_limit_m`: distance to the terrain block under the reticle (from
/// the interact raycast; `f32::MAX` when none). A crop hit FARTHER than
/// the block is behind a wall - no hint for it (mirrors how the animal
/// attack pick in interact.rs yields to a nearer block hit).
pub fn update(dt: f32, w: &World, p: &PlayerCtrl, block_limit_m: f32) {
    let cfg = farming::config();
    let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
    let (eye, dir) = look_ray(p);
    let time_s = tenebris_core::world_time::seconds();
    /* Dev weather override forces a shower everywhere for screenshots -
     * treat every crop as rained-on so watering reads in a grab. */
    let forced_rain = crate::weather_fx::forced_precip().is_some();
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        s.body_center = center;
        for crop in &mut s.list {
            /* "Or just let it rain": a crop under a precipitating cloud
             * grows at the boosted rate, same as a bucket pour. */
            let rained = forced_rain || {
                let up = dvec3_normalize(dvec3_sub(crop.pos, center));
                tenebris_core::weather::cloud_cell(&w.body, up, time_s).raining
            };
            farming::grow(crop, dt, rained, &cfg);
        }
        /* Reticle hint from whichever crop (planted or wild) is nearer. */
        let (hit, dist) = raycast_list(&s.list, center, eye, dir, REACH_M);
        let (hw, dw) = raycast_list(&s.wild, center, eye, dir, REACH_M);
        s.reticle_growth = if hw >= 0 && dw <= dist && dw <= block_limit_m {
            Some(1.0) /* wild plants are always ripe */
        } else if hit >= 0 && dist <= block_limit_m {
            Some(s.list[hit as usize].growth)
        } else {
            None
        };
    });
}

/// Deterministically populate the WILD fruit plants near the player -
/// scattered ripe fruit trees / vines in fields + jungle to forage. Called
/// each frame (cheap): drops wild plants that drift out of range, then
/// walks a grid of tangent sample points around the player, resolving each
/// to a tile and giving that tile a wild plant iff a per-tile hash passes
/// `wild_fruit_chance` and its biome is a field / jungle. Never persisted -
/// re-derives on approach - so it costs nothing on disk and stays coherent
/// (a given tile always grows the same plant).
pub fn spawn_wild_near(w: &World, p: &PlayerCtrl) {
    let cfg = farming::config();
    if cfg.wild_fruit_chance <= 0.0 {
        return;
    }
    let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
    let local = dvec3_sub(p.position, center);
    let r = dvec3_length(local);
    if r < 1.0 {
        return;
    }
    let up = dvec3_scale(local, 1.0 / r);
    let reference = if up.y.abs() < 0.9 {
        dvec3_make(0.0, 1.0, 0.0)
    } else {
        dvec3_make(1.0, 0.0, 0.0)
    };
    let t1 = dvec3_normalize(dvec3_cross(reference, up));
    let t2 = dvec3_cross(up, t1);

    const RADIUS_M: f64 = 40.0;
    const STEP_M: f64 = 5.0;
    const KEEP_M: f64 = 55.0; /* drop wild plants past this from the player */

    S.with(|c| {
        let s = &mut *c.borrow_mut();
        /* Forget wild plants (and their harvested marks) that drift away, so
         * the lists stay small and re-derive fresh when the player returns. */
        let ppos = p.position;
        s.wild.retain(|cr| dvec3_length(dvec3_sub(cr.pos, ppos)) < KEEP_M);
        s.wild_harvested.retain(|&tile| {
            w.grid.tile(tile).is_some_and(|tt| {
                let d = dvec3_add(center, dvec3_scale(dvec3_normalize(tt.center), r));
                dvec3_length(dvec3_sub(d, ppos)) < KEEP_M
            })
        });
        let present: std::collections::HashSet<i32> = s.wild.iter().map(|cr| cr.tile_idx).collect();

        let mut done: std::collections::HashSet<i32> = std::collections::HashSet::new();
        let n = (RADIUS_M / STEP_M) as i32;
        for iy in -n..=n {
            for ix in -n..=n {
                let (ox, oy) = (ix as f64 * STEP_M, iy as f64 * STEP_M);
                if ox * ox + oy * oy > RADIUS_M * RADIUS_M {
                    continue;
                }
                let point = dvec3_add(local, dvec3_add(dvec3_scale(t1, ox), dvec3_scale(t2, oy)));
                let dir = dvec3_normalize(point);
                let tile = w.grid.find_tile(dir, p.last_tile);
                if tile < 0 || !done.insert(tile) {
                    continue;
                }
                if present.contains(&tile) || s.wild_harvested.contains(&tile) {
                    continue;
                }
                if tenebris_core::rng::hash2(tile, 0x5D_1E) >= cfg.wild_fruit_chance {
                    continue;
                }
                let Some(kind) = wild_kind_for(w, dir, tile) else { continue };
                let floor = w.walkable_floor_near(tile, r, 1.0);
                if floor <= 0.0 {
                    continue;
                }
                let dir_up = dvec3_normalize(w.grid.tile(tile).map(|t| t.center).unwrap_or(dir));
                let pos = dvec3_add(center, dvec3_scale(dir_up, floor));
                s.wild.push(Crop::at(pos, dir_up, tile, 1.0, kind));
            }
        }
    });
}

/// Which wild fruit (if any) grows on this tile: fields grow apples /
/// watermelons, jungle grows oranges / kiwi. A second hash picks between
/// the two so a region isn't a monoculture. Non-field/jungle biomes (and
/// legacy default-seed worlds, which are all Fields) grow nothing extra.
fn wild_kind_for(w: &World, dir: DVec3, tile: i32) -> Option<CropKind> {
    use tenebris_core::planet_gen::Biome;
    let pick = tenebris_core::rng::hash2(tile, 0x0F_17) < 0.5;
    match tenebris_core::planet_gen::biome(&w.body, dir) {
        Biome::Fields => Some(if pick { CropKind::Apple } else { CropKind::Watermelon }),
        Biome::Jungle => Some(if pick { CropKind::Orange } else { CropKind::Kiwi }),
        _ => None,
    }
}

/* ---------------------------------------------------------------------- */
/* Harvest raycast (ray-vs-sphere), mirror of animals::raycast.            */

fn raycast_list(list: &[Crop], center: DVec3, eye: Vec3, dir: Vec3, max_dist: f32) -> (i32, f32) {
    let mut best = -1i32;
    let mut best_t = max_dist;
    for (i, crop) in list.iter().enumerate() {
        let up = dvec3_normalize(dvec3_sub(crop.pos, center));
        let cen = dvec3_add(crop.pos, dvec3_scale(up, HIT_CENTRE_UP_M));
        let oc = Vec3 {
            x: eye.x - cen.x as f32,
            y: eye.y - cen.y as f32,
            z: eye.z - cen.z as f32,
        };
        let b = oc.x * dir.x + oc.y * dir.y + oc.z * dir.z;
        let cc = oc.x * oc.x + oc.y * oc.y + oc.z * oc.z - HIT_RADIUS_M * HIT_RADIUS_M;
        let disc = b * b - cc;
        if disc < 0.0 {
            continue;
        }
        let t = -b - disc.sqrt();
        if t >= 0.0 && t < best_t {
            best_t = t;
            best = i as i32;
        }
    }
    (best, best_t)
}

/* ---------------------------------------------------------------------- */
/* Plant / harvest.                                                        */

/// Resolve one plant-or-harvest attempt. Harvest wins when a mature crop
/// is under the reticle; otherwise a seed plants on top of the block the
/// player is aiming at (the `interact` target). Mutates the crop list;
/// the caller applies the bag change + persistence.
pub fn plant_or_harvest(
    w: &World,
    p: &PlayerCtrl,
    interact: &InteractState,
    seed_kind: Option<CropKind>,
    has_hoe: bool,
) -> Outcome {
    let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
    let (eye, dir) = look_ray(p);

    // Harvest takes precedence: is a crop under the reticle? Check both the
    // planted list and the wild plants; whichever is nearer wins. A crop
    // hit FARTHER than the aimed block is behind a wall - not harvestable
    // (same block-distance gate the animal attack pick uses).
    let (hit, crop_dist, hit_wild, wild_dist) = S.with(|c| {
        let s = c.borrow();
        let (h, d) = raycast_list(&s.list, center, eye, dir, REACH_M);
        let (hw, dw) = raycast_list(&s.wild, center, eye, dir, REACH_M);
        (h, d, hw, dw)
    });
    let nearest = crop_dist.min(wild_dist);
    let crop_blocked = interact.has_target
        && !interact.is_torch_target
        && (interact.distance as f32) < nearest;
    if (hit >= 0 || hit_wild >= 0) && !crop_blocked {
        return S.with(|c| {
            let s = &mut *c.borrow_mut();
            /* Wild plant nearer (or the only) hit: it's always ripe -
             * harvest it, and remember the tile so it doesn't respawn
             * under the player immediately. */
            if hit_wild >= 0 && wild_dist <= crop_dist {
                let idx = hit_wild as usize;
                if idx >= s.wild.len() {
                    return Outcome::None;
                }
                let crop = s.wild.swap_remove(idx);
                s.wild_harvested.insert(crop.tile_idx);
                return Outcome::Harvested(crop);
            }
            let idx = hit as usize;
            if idx >= s.list.len() {
                return Outcome::None;
            }
            if s.list[idx].is_mature() {
                let crop = s.list.swap_remove(idx);
                Outcome::Harvested(crop)
            } else {
                Outcome::NotReady
            }
        });
    }

    // No crop hit -> till the ground, or plant a seed on tilled soil.
    if !interact.has_target || interact.is_torch_target {
        return Outcome::None;
    }
    if interact.hit_depth < 0 || interact.hit_depth + 1 >= WORLD_MAX_DEPTH {
        return Outcome::None;
    }
    let ground = w.get(interact.hit_tile, interact.hit_depth);
    // Seeds go on tilled soil only (till it first with a hoe). If the aimed
    // ground is plain dirt / grass and a hoe is on hand, till it instead.
    if ground != Block::Farmland {
        if has_hoe
            && matches!(
                ground,
                Block::Dirt | Block::Grass | Block::JungleGrass | Block::DryGrass
            )
        {
            return Outcome::Tilled(interact.hit_tile, interact.hit_depth);
        }
        return Outcome::None;
    }
    let Some(kind) = seed_kind else {
        return Outcome::None;
    };
    let Some(tt) = w.grid.tile(interact.hit_tile) else {
        return Outcome::None;
    };
    // Top face of the aimed block, in world space (center + normal * r_top).
    let dir_up = dvec3_normalize(tt.center);
    let r_top = w.depth_to_radius_m(interact.hit_depth + 1);
    let pos = dvec3_add(center, dvec3_scale(dir_up, r_top));

    S.with(|c| {
        let s = &mut *c.borrow_mut();
        // Reject if it would overlap an existing crop (no stacking).
        for crop in &s.list {
            if dvec3_length(dvec3_sub(crop.pos, pos)) < MIN_SPACING_M {
                return Outcome::None;
            }
        }
        let crop = Crop::new(pos, dir_up, interact.hit_tile, kind);
        s.list.push(crop);
        Outcome::Planted(crop)
    })
}

/// What a bucket use did, so the caller can swap the held bucket item and
/// persist / relay any watered crop.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum BucketOutcome {
    /// An empty bucket dipped into water -> fill it (empty -> water bucket).
    Scooped,
    /// A water bucket poured on the crop under the reticle -> empty it. The
    /// payload is the watered crop's anchor tile (for MP relay if needed).
    Watered(i32),
    /// Nothing in reach to act on.
    None,
}

/// Use a bucket on whatever the player is aiming at. An EMPTY bucket
/// (`has_water = false`) dips into a water cell along the look ray to fill
/// it; a WATER bucket pours on the planted crop under the reticle to speed
/// its growth ("water plants"). Wild plants are always ripe, so watering
/// only targets the player's own crops.
pub fn use_bucket(w: &World, p: &PlayerCtrl, has_water: bool) -> BucketOutcome {
    let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
    let (eye, dir) = look_ray(p);

    if has_water {
        // Pour on the crop under the reticle.
        let cfg = farming::config();
        return S.with(|c| {
            let s = &mut *c.borrow_mut();
            let (hit, _d) = raycast_list(&s.list, center, eye, dir, REACH_M);
            if hit < 0 {
                return BucketOutcome::None;
            }
            let idx = hit as usize;
            farming::water(&mut s.list[idx], &cfg);
            BucketOutcome::Watered(s.list[idx].tile_idx)
        });
    }

    // Empty bucket: march the look ray for a water cell within reach.
    const STEP_M: f32 = 0.25;
    let mut t = 0.0f32;
    while t <= REACH_M {
        let here = Vec3 {
            x: eye.x + dir.x * t,
            y: eye.y + dir.y * t,
            z: eye.z + dir.z * t,
        };
        if w.block_at_pos(here, p.last_tile) == Block::Water {
            return BucketOutcome::Scooped;
        }
        t += STEP_M;
    }
    BucketOutcome::None
}

/// Remove any crop planted in world cell (tile, depth) - called when a
/// block is placed there so the crop doesn't end up embedded in terrain
/// (its feet sit on the cell's bottom face, so a crop belongs to the
/// cell its stem grows through). Returns true when something was
/// removed (caller persists).
pub fn clear_cell(w: &World, tile: i32, depth: i32) -> bool {
    let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
    let r_lo = w.depth_to_radius_m(depth);
    let r_hi = w.depth_to_radius_m(depth + 1);
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        let before = s.list.len();
        s.list.retain(|crop| {
            if crop.tile_idx != tile {
                return true;
            }
            let r = dvec3_length(dvec3_sub(crop.pos, center));
            /* Feet sit ON r_lo (the cell's bottom face) - the small
             * epsilon keeps float noise from missing the exact-face
             * case in either direction. */
            !(r >= r_lo - 0.01 && r < r_hi - 0.01)
        });
        s.list.len() != before
    })
}

/// SP same-frame persistence of the crop list after a plant / harvest /
/// clear. Mirrors interact's torch save: gated on GAME_IN_GAME_SP,
/// filters to crops anchored on this body, rewrites the per-body
/// snapshot. (MP crop sync is a follow-up, like the animals.)
pub fn sp_save_after_change(w: &World) {
    if crate::menu::state() != crate::menu::GameState::InGameSp {
        return;
    }
    let name = crate::menu::active_world();
    if name.is_empty() {
        return;
    }
    let list = list();
    let mut buf: Vec<crate::persistence::PersistenceCrop> = Vec::with_capacity(list.len());
    for c in &list {
        if c.tile_idx < 0 || c.tile_idx >= w.tile_count {
            continue;
        }
        buf.push(crate::persistence::PersistenceCrop {
            pos: [c.pos.x as f32, c.pos.y as f32, c.pos.z as f32],
            up: [c.up.x as f32, c.up.y as f32, c.up.z as f32],
            tile_idx: c.tile_idx,
            growth: c.growth,
            kind: c.kind as u8,
        });
    }
    crate::persistence::save_crops(&name, w.body.id as u32, &buf);
}

/// Dev/screenshot aid: plant a short row of crops at staged growth
/// `ahead` metres in front of the player so the farming render is
/// framed immediately.
pub fn dev_spawn(w: &World, p: &PlayerCtrl, ahead: f64) {
    let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
    let fwd = p.basis.fwd;
    let right = p.basis.right;
    let local = dvec3_sub(p.position, center);
    let r = dvec3_length(local);
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        s.body_center = center;
        /* One ripe crop of every kind in a row, so a shot frames them all
         * (berry, wheat, carrot, then the four orchard fruits). */
        for k in 0..7i32 {
            let side = (k - 3) as f64 * 1.4;
            let point = dvec3_add(
                local,
                dvec3_add(dvec3_scale(fwd, ahead), dvec3_scale(right, side)),
            );
            let dir = dvec3_normalize(point);
            let tile = w.grid.find_tile(dir, p.last_tile);
            let floor = w.walkable_floor_near(tile, r, 1.0);
            if floor <= 0.0 {
                continue;
            }
            let pos = dvec3_add(center, dvec3_scale(dir, floor));
            let kind = CropKind::from_u8(k as u8);
            s.list.push(Crop::at(pos, dir, tile, 1.0, kind));
        }
    });
}

/* ---------------------------------------------------------------------- */
/* Rendering (immediate-mode sokol_gl, no shader file).                    */

/// Column-major basis mapping local +Y -> `up`, +Z -> a stable tangent.
fn orient_basis(up: DVec3) -> [f32; 16] {
    let up = dvec3_normalize(up);
    let reference = if up.y.abs() < 0.9 {
        dvec3_make(0.0, 1.0, 0.0)
    } else {
        dvec3_make(1.0, 0.0, 0.0)
    };
    let right = dvec3_normalize(dvec3_cross(reference, up));
    let fwd = dvec3_cross(up, right);
    [
        right.x as f32, right.y as f32, right.z as f32, 0.0,
        up.x as f32, up.y as f32, up.z as f32, 0.0,
        fwd.x as f32, fwd.y as f32, fwd.z as f32, 0.0,
        0.0, 0.0, 0.0, 1.0,
    ]
}

/// One axis-aligned cuboid, per-face shaded (top brightest). Copied from
/// animals::draw_box - kept local so the two entity renderers stay
/// independent.
#[allow(clippy::too_many_arguments)]
fn draw_box(cx: f32, cy: f32, cz: f32, hx: f32, hy: f32, hz: f32, r: f32, g: f32, b: f32, lit: f32) {
    let (x0, x1) = (cx - hx, cx + hx);
    let (y0, y1) = (cy - hy, cy + hy);
    let (z0, z1) = (cz - hz, cz + hz);
    let faces: [([[f32; 3]; 4], f32); 6] = [
        ([[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]], 1.0),
        ([[x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1]], 0.55),
        ([[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]], 0.85),
        ([[x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1]], 0.7),
        ([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], 0.8),
        ([[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0]], 0.75),
    ];
    sgl::begin_triangles();
    for (quad, shade) in faces.iter() {
        sgl::c3f(r * shade * lit, g * shade * lit, b * shade * lit);
        for &i in &[0usize, 1, 2, 0, 2, 3] {
            let v = quad[i];
            sgl::v3f(v[0], v[1], v[2]);
        }
    }
    sgl::end();
}

/// Draw one crop, per kind. Origin at the feet, +Y up. All three share
/// the grow-taller-with-`growth` silhouette so ripeness reads at a
/// glance; kind changes the shape + palette:
/// - Berry: single stem, leaf pair, red berries when mature.
/// - Wheat: a clump of thin stalks that turn golden, seed heads on top.
/// - Carrot: low frond fan; the orange root crowns out of the soil
///   when mature (the "harvest me" cue).
fn draw_crop(pos: DVec3, up: DVec3, growth: f32, kind: CropKind, lit: f32) {
    let basis = orient_basis(up);
    let g = growth.clamp(0.05, 1.0);

    sgl::push_matrix();
    sgl::translate(pos.x as f32, pos.y as f32, pos.z as f32);
    sgl::mult_matrix(&basis[0]);

    match kind {
        CropKind::Berry => {
            // Stem - young sprouts lighter / yellower green; ripe darker.
            let stem_h = 0.12 + 0.42 * g;
            let (sr, sg, sb) = (0.30 + 0.10 * (1.0 - g), 0.55 + 0.15 * g, 0.20);
            draw_box(0.0, stem_h * 0.5, 0.0, 0.035, stem_h * 0.5, 0.035, sr, sg, sb, lit);

            // Leaf pair fanning out near the top, scaled by growth.
            let leaf = 0.06 + 0.12 * g;
            let ly = stem_h * 0.72;
            draw_box(leaf * 0.9, ly, 0.0, leaf, 0.02, leaf * 0.6, 0.28, 0.62, 0.24, lit);
            draw_box(-leaf * 0.9, ly, 0.0, leaf, 0.02, leaf * 0.6, 0.28, 0.62, 0.24, lit);

            // Berries only on a mature crop - the visual "harvest me" cue.
            if growth >= 1.0 {
                draw_box(0.05, stem_h + 0.03, 0.03, 0.03, 0.03, 0.03, 0.85, 0.15, 0.20, lit);
                draw_box(-0.04, stem_h + 0.06, -0.03, 0.03, 0.03, 0.03, 0.90, 0.20, 0.25, lit);
                draw_box(0.0, stem_h + 0.10, 0.0, 0.03, 0.03, 0.03, 0.80, 0.12, 0.18, lit);
            }
        }
        CropKind::Wheat => {
            // Green -> golden as it ripens; taller than the berry bush.
            let stalk_h = 0.10 + 0.55 * g;
            let (sr, sg, sb) = (
                0.30 + 0.45 * g, // toward wheat gold
                0.55 + 0.15 * g,
                0.18 + 0.04 * (1.0 - g),
            );
            // A clump of 5 thin stalks around the planting point.
            const STALKS: [(f32, f32); 5] =
                [(0.0, 0.0), (0.07, 0.04), (-0.06, 0.05), (0.05, -0.06), (-0.05, -0.05)];
            for (i, (ox, oz)) in STALKS.iter().enumerate() {
                let h = stalk_h * (0.85 + 0.05 * (i % 3) as f32);
                draw_box(*ox, h * 0.5, *oz, 0.016, h * 0.5, 0.016, sr, sg, sb, lit);
                // Seed head: a slightly fatter knob on each ripe stalk.
                if growth >= 1.0 {
                    draw_box(*ox, h + 0.035, *oz, 0.028, 0.045, 0.028, 0.82, 0.68, 0.28, lit);
                }
            }
        }
        CropKind::Carrot => {
            // Low, bushy frond fan - carrots stay short.
            let frond_h = 0.08 + 0.16 * g;
            let spread = 0.05 + 0.09 * g;
            let (fr, fg, fb) = (0.18, 0.50 + 0.12 * g, 0.16);
            draw_box(0.0, frond_h * 0.5, 0.0, 0.025, frond_h * 0.5, 0.025, fr, fg, fb, lit);
            draw_box(spread, frond_h * 0.42, 0.0, 0.02, frond_h * 0.42, 0.02, fr, fg * 0.92, fb, lit);
            draw_box(-spread, frond_h * 0.42, 0.0, 0.02, frond_h * 0.42, 0.02, fr, fg * 0.92, fb, lit);
            draw_box(0.0, frond_h * 0.42, spread, 0.02, frond_h * 0.42, 0.02, fr, fg * 0.96, fb, lit);
            draw_box(0.0, frond_h * 0.42, -spread, 0.02, frond_h * 0.42, 0.02, fr, fg * 0.96, fb, lit);

            // The root crowns out of the soil when mature.
            if growth >= 1.0 {
                draw_box(0.0, 0.035, 0.0, 0.045, 0.035, 0.045, 0.88, 0.42, 0.10, lit);
            }
        }
        CropKind::Watermelon => {
            // Sprawling ground vine: a low leafy centre with leaves fanned
            // out, and a striped melon resting on the soil when ripe.
            let spread = 0.09 + 0.16 * g;
            draw_box(0.0, 0.05, 0.0, 0.03, 0.05, 0.03, 0.20, 0.50, 0.18, lit);
            for (dx, dz) in [(spread, 0.0), (-spread, 0.0), (0.0, spread), (0.0, -spread)] {
                draw_box(dx, 0.03, dz, 0.06, 0.02, 0.045, 0.22, 0.54, 0.20, lit);
            }
            if growth >= 1.0 {
                // Dark-green striped rind + a lighter stripe cap.
                draw_box(0.09, 0.10, 0.06, 0.11, 0.10, 0.11, 0.12, 0.40, 0.15, lit);
                draw_box(0.09, 0.185, 0.06, 0.045, 0.02, 0.11, 0.32, 0.62, 0.24, lit);
                draw_box(0.09, 0.10, 0.06, 0.115, 0.055, 0.03, 0.30, 0.58, 0.22, lit);
            }
        }
        CropKind::Kiwi => {
            // Bushy climbing vine: a clump of broad leaves; fuzzy brown
            // kiwifruit hanging under it when ripe.
            let h = 0.10 + 0.30 * g;
            let (lr, lg, lb) = (0.16, 0.44 + 0.14 * g, 0.16);
            draw_box(0.0, h * 0.5, 0.0, 0.04, h * 0.5, 0.04, 0.35, 0.26, 0.14, lit);
            let s = 0.07 + 0.10 * g;
            for (dx, dz) in [(s, s), (-s, s), (s, -s), (-s, -s), (0.0, 0.0)] {
                draw_box(dx, h * 0.82, dz, 0.07, 0.025, 0.06, lr, lg, lb, lit);
            }
            if growth >= 1.0 {
                for (dx, dz) in [(s * 0.6, s * 0.4), (-s * 0.5, -s * 0.3)] {
                    draw_box(dx, h * 0.55, dz, 0.03, 0.045, 0.03, 0.42, 0.30, 0.16, lit);
                }
            }
        }
        CropKind::Apple | CropKind::Orange => {
            // Small fruit tree: a trunk under a rounded canopy, with red
            // apples / orange globes hanging in it when ripe.
            let trunk_h = 0.14 + 0.62 * g;
            draw_box(0.0, trunk_h * 0.5, 0.0, 0.045, trunk_h * 0.5, 0.045, 0.46, 0.29, 0.15, lit);
            let cr = 0.11 + 0.16 * g;
            let (canr, cang, canb) = if kind == CropKind::Apple {
                (0.14, 0.42, 0.16)
            } else {
                (0.18, 0.46, 0.18)
            };
            draw_box(0.0, trunk_h + cr * 0.55, 0.0, cr, cr * 0.85, cr, canr, cang, canb, lit);
            draw_box(0.0, trunk_h + cr * 1.15, 0.0, cr * 0.7, cr * 0.5, cr * 0.7, canr, cang, canb, lit);
            if growth >= 1.0 {
                let (fr, fg, fb) = if kind == CropKind::Apple {
                    (0.88, 0.16, 0.16) // red apple
                } else {
                    (0.98, 0.56, 0.10) // orange
                };
                for (dx, dz) in [(cr * 0.6, cr * 0.3), (-cr * 0.55, -cr * 0.4), (cr * 0.15, -cr * 0.62)] {
                    draw_box(dx, trunk_h + cr * 0.45, dz, 0.038, 0.038, 0.038, fr, fg, fb, lit);
                }
            }
        }
    }

    sgl::pop_matrix();
}

/// Draw every crop (planted + wild). Called in the offscreen opaque pass
/// next to animals.
pub fn draw(view: Mat4, proj: Mat4) {
    let (list, center) = S.with(|c| {
        let s = c.borrow();
        let mut all = s.list.clone();
        all.extend_from_slice(&s.wild);
        (all, s.body_center)
    });
    if list.is_empty() {
        return;
    }

    /* World-space sgl context: flushes inside the offscreen scene pass
     * so crops z-sort against terrain depth and sit under the water +
     * composite post-process (see renderer::sgl_world_begin). */
    renderer::sgl_world_begin();
    sgl::defaults();
    sgl::matrix_mode_projection();
    sgl::load_matrix(&proj.m[0]);
    sgl::matrix_mode_modelview();
    sgl::load_matrix(&view.m[0]);

    let mut pip = PIP3D.with(|p| p.get());
    if pip.id == 0 {
        pip = sgl::make_pipeline(&sokol::gfx::PipelineDesc {
            depth: sokol::gfx::DepthState {
                write_enabled: true,
                compare: sokol::gfx::CompareFunc::Less,
                ..Default::default()
            },
            cull_mode: sokol::gfx::CullMode::None,
            ..Default::default()
        });
        PIP3D.with(|p| p.set(pip));
    }
    sgl::load_pipeline(pip);

    for crop in &list {
        let up = dvec3_normalize(dvec3_sub(crop.pos, center));
        let lit = renderer::entity_sun_brightness(crop.pos);
        draw_crop(crop.pos, up, crop.growth, crop.kind, lit);
    }
    renderer::sgl_world_end();
    /* No sgl_draw here - the world context flushes in
     * compose_to_swapchain, inside the offscreen pass. */
}
