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

use tenebris_core::farming::{self, Crop};
use tenebris_core::math::{
    dvec3_add, dvec3_cross, dvec3_length, dvec3_make, dvec3_normalize, dvec3_scale, dvec3_sub,
    DVec3, Vec3,
};
use tenebris_core::world::{World, WORLD_MAX_DEPTH};

use crate::gfx_math::Mat4;
use crate::interact::InteractState;
use crate::player_ctrl::PlayerCtrl;

/// Reach (metres) for the plant / harvest pick - matches interact::MAX_DIST.
const REACH_M: f32 = 8.0;
/// A new crop must be at least this far from an existing one (no stacking).
const MIN_SPACING_M: f64 = 0.6;
/// Bounding-sphere radius + centre height for the harvest raycast.
const HIT_RADIUS_M: f32 = 0.5;
const HIT_CENTRE_UP_M: f64 = 0.35;

/// What a plant/harvest attempt did, so the caller can update the bag +
/// persist the change.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Outcome {
    /// A seed was consumed and a crop planted.
    Planted,
    /// A mature crop was harvested and removed.
    Harvested,
    /// A crop is under the reticle but not ripe yet.
    NotReady,
    /// Nothing actionable (no ground target / no seeds / out of reach).
    None,
}

struct State {
    list: Vec<Crop>,
    body_center: DVec3,
    /// Growth (0..1) of the crop under the reticle this frame, for the HUD
    /// hint. `None` when the player isn't looking at a crop.
    reticle_growth: Option<f32>,
}

thread_local! {
    static S: RefCell<State> = RefCell::new(State {
        list: Vec::new(),
        body_center: DVec3::default(),
        reticle_growth: None,
    });
    static PIP3D: Cell<sgl::Pipeline> = const { Cell::new(sgl::Pipeline { id: 0 }) };
}

pub fn init() {
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        s.list.clear();
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

pub fn update(dt: f32, w: &World, p: &PlayerCtrl) {
    let cfg = farming::config();
    let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
    let (eye, dir) = look_ray(p);
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        s.body_center = center;
        for crop in &mut s.list {
            farming::grow(crop, dt, &cfg);
        }
        let (hit, _) = raycast_list(&s.list, center, eye, dir, REACH_M);
        s.reticle_growth = if hit >= 0 {
            Some(s.list[hit as usize].growth)
        } else {
            None
        };
    });
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
    has_seeds: bool,
) -> Outcome {
    let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
    let (eye, dir) = look_ray(p);

    // Harvest takes precedence: is a crop under the reticle?
    let (hit, _) = S.with(|c| {
        let s = c.borrow();
        raycast_list(&s.list, center, eye, dir, REACH_M)
    });
    if hit >= 0 {
        return S.with(|c| {
            let s = &mut *c.borrow_mut();
            let idx = hit as usize;
            if idx >= s.list.len() {
                return Outcome::None;
            }
            if s.list[idx].is_mature() {
                s.list.swap_remove(idx);
                Outcome::Harvested
            } else {
                Outcome::NotReady
            }
        });
    }

    // No crop hit -> plant a seed on the aimed ground block, if any.
    if !has_seeds || !interact.has_target || interact.is_torch_target {
        return Outcome::None;
    }
    if interact.hit_depth < 0 || interact.hit_depth + 1 >= WORLD_MAX_DEPTH {
        return Outcome::None;
    }
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
        s.list.push(Crop::new(pos, dir_up, interact.hit_tile));
        Outcome::Planted
    })
}

/// Dev/screenshot aid: plant a short row of crops at staged growth in
/// front of the player so the farming render is framed immediately.
pub fn dev_spawn(w: &World, p: &PlayerCtrl) {
    let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
    let fwd = p.basis.fwd;
    let right = p.basis.right;
    let local = dvec3_sub(p.position, center);
    let r = dvec3_length(local);
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        s.body_center = center;
        for k in 0..5i32 {
            let side = (k - 2) as f64 * 1.2;
            let point = dvec3_add(
                local,
                dvec3_add(dvec3_scale(fwd, 4.0), dvec3_scale(right, side)),
            );
            let dir = dvec3_normalize(point);
            let tile = w.grid.find_tile(dir, p.last_tile);
            let floor = w.walkable_floor_near(tile, r, 1.0);
            if floor <= 0.0 {
                continue;
            }
            let pos = dvec3_add(center, dvec3_scale(dir, floor));
            // Growth staged 0.2, 0.4, 0.6, 0.8, 1.0 across the row.
            let g = 0.2 + 0.2 * k as f32;
            s.list.push(Crop::at(pos, dir, tile, g));
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
fn draw_box(cx: f32, cy: f32, cz: f32, hx: f32, hy: f32, hz: f32, r: f32, g: f32, b: f32) {
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
        sgl::c3f(r * shade, g * shade, b * shade);
        for &i in &[0usize, 1, 2, 0, 2, 3] {
            let v = quad[i];
            sgl::v3f(v[0], v[1], v[2]);
        }
    }
    sgl::end();
}

/// Draw one crop: a stem that grows taller with `growth`, a leaf pair, and
/// red berries once mature. Origin at the feet, +Y up.
fn draw_crop(pos: DVec3, up: DVec3, growth: f32) {
    let basis = orient_basis(up);
    let g = growth.clamp(0.05, 1.0);

    sgl::push_matrix();
    sgl::translate(pos.x as f32, pos.y as f32, pos.z as f32);
    sgl::mult_matrix(&basis[0]);

    // Stem - young sprouts are a lighter, yellower green; ripe ones darker.
    let stem_h = 0.12 + 0.42 * g;
    let (sr, sg, sb) = (0.30 + 0.10 * (1.0 - g), 0.55 + 0.15 * g, 0.20);
    draw_box(0.0, stem_h * 0.5, 0.0, 0.035, stem_h * 0.5, 0.035, sr, sg, sb);

    // Leaf pair fanning out near the top, scaled by growth.
    let leaf = 0.06 + 0.12 * g;
    let ly = stem_h * 0.72;
    draw_box(leaf * 0.9, ly, 0.0, leaf, 0.02, leaf * 0.6, 0.28, 0.62, 0.24);
    draw_box(-leaf * 0.9, ly, 0.0, leaf, 0.02, leaf * 0.6, 0.28, 0.62, 0.24);

    // Berries only on a mature crop - the visual "harvest me" cue.
    if growth >= 1.0 {
        draw_box(0.05, stem_h + 0.03, 0.03, 0.03, 0.03, 0.03, 0.85, 0.15, 0.20);
        draw_box(-0.04, stem_h + 0.06, -0.03, 0.03, 0.03, 0.03, 0.90, 0.20, 0.25);
        draw_box(0.0, stem_h + 0.10, 0.0, 0.03, 0.03, 0.03, 0.80, 0.12, 0.18);
    }

    sgl::pop_matrix();
}

/// Draw every crop. Called in the offscreen opaque pass next to animals.
pub fn draw(view: Mat4, proj: Mat4) {
    let (list, center) = S.with(|c| {
        let s = c.borrow();
        (s.list.clone(), s.body_center)
    });
    if list.is_empty() {
        return;
    }

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
        draw_crop(crop.pos, up, crop.growth);
    }
    /* No sgl_draw here - the single end-of-frame flush uploads every
     * queued layer (same rule as torches / animals). */
}
