//! Animals (client) - spawning, surface-keeping, rendering, and the hunt
//! raycast for the critters whose sim lives in `core::fauna`.
//!
//! Structure mirrors `torch.rs` (a thread-local list + a bounding-sphere
//! raycast the interact code already knows how to call); rendering draws
//! the baked critter model (`assets/models/critter.obj`, authored by
//! `tools/gen-critter-model.py`) posed by the baked walk / idle keyframe
//! clips under `assets/animations/`, via `baked_model` + immediate-mode
//! `sokol_gl`. A kill leaves a short-lived corpse that plays the baked
//! death clip (keel over sideways) before despawning. If the model assets
//! are missing the old procedural box critter draws as a fallback so the
//! herd never turns invisible.
//!
//! The core sim is planet-agnostic; here we own the planet glue: spawn a
//! few animals on the ground near the player, re-seat each on the walkable
//! floor after it wanders, cull the dead / distant, and top the population
//! back up.

use std::cell::{Cell, RefCell};

use sokol::gl as sgl;

use tenebris_core::fauna::{self, Animal, AnimalState};
use tenebris_core::math::{
    dvec3_add, dvec3_cross, dvec3_length, dvec3_make, dvec3_normalize, dvec3_scale, dvec3_sub,
    DVec3, Vec3,
};
use tenebris_core::rng;
use tenebris_core::world::World;

use crate::baked_model::{self, Clip, Model};
use crate::gfx_math::Mat4;
use crate::player_ctrl::PlayerCtrl;
use crate::renderer;

/// How many animals to keep alive within range of the player.
const TARGET_COUNT: usize = 8;
/// Beyond this the animal despawns (out of sight, keeps the list small).
const DESPAWN_M: f64 = 70.0;
/// Seconds between spawn attempts while under population.
const SPAWN_INTERVAL_S: f32 = 1.5;
/// Bounding-sphere radius for the attack raycast + its centre height.
const HIT_RADIUS_M: f32 = 0.7;
const HIT_CENTRE_UP_M: f64 = 0.45;
/// A corpse lingers on the ground this long: the baked death clip
/// (~0.7 s) plus a beat holding the final on-its-side pose.
const CORPSE_LINGER_S: f32 = 2.4;

/// A killed critter playing out the baked death clip before despawning.
#[derive(Clone, Copy, Debug)]
struct Corpse {
    pos: DVec3,
    heading: DVec3,
    age: f32,
}

struct State {
    list: Vec<Animal>,
    corpses: Vec<Corpse>,
    body_center: DVec3,
    next_id: u32,
    spawn_cd: f32,
    salt: u32,
    /// Dev screenshot aid: freeze the herd (no wander / spawn / cull).
    frozen: bool,
    /// MP: the herd mirrors the server's AnimalState broadcasts - no
    /// local wander / spawn / cull; positions come off the wire and the
    /// local sim only advances anim phases + corpse ages.
    remote: bool,
}

/// Baked critter model + its animation clips, lazy-loaded on first draw.
/// `None` after a failed load (assets missing) -> box-critter fallback.
struct ModelSet {
    model: Model,
    walk: Clip,
    idle: Clip,
    death: Clip,
}

thread_local! {
    static S: RefCell<State> = RefCell::new(State {
        list: Vec::new(),
        corpses: Vec::new(),
        body_center: DVec3::default(),
        next_id: 1,
        spawn_cd: 0.0,
        salt: 1,
        frozen: false,
        remote: false,
    });
    static PIP3D: Cell<sgl::Pipeline> = const { Cell::new(sgl::Pipeline { id: 0 }) };
    /// Outer None = not tried yet; inner None = load failed (logged once).
    static MODEL: RefCell<Option<Option<std::rc::Rc<ModelSet>>>> = const { RefCell::new(None) };
}

fn model_set() -> Option<std::rc::Rc<ModelSet>> {
    MODEL.with(|m| {
        let mut m = m.borrow_mut();
        if m.is_none() {
            let loaded = (|| {
                Some(std::rc::Rc::new(ModelSet {
                    model: baked_model::load_model("assets/models/critter.obj")?,
                    walk: Clip::load("assets/animations/critter_walk.anim.json")?,
                    idle: Clip::load("assets/animations/critter_idle.anim.json")?,
                    death: Clip::load("assets/animations/critter_death.anim.json")?,
                }))
            })();
            if loaded.is_none() {
                println!(
                    "[animals] baked critter model/clips missing - using the \
                     procedural box critter fallback"
                );
            }
            *m = Some(loaded);
        }
        m.as_ref().unwrap().clone()
    })
}

pub fn init() {
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        s.list.clear();
        s.corpses.clear();
        s.next_id = 1;
        s.spawn_cd = 0.0;
        s.salt = 1;
        s.remote = false;
    });
}

/// MP: hand the herd to (or take it back from) the server. Entering
/// remote mode clears the locally-simulated herd; leaving it clears the
/// mirrored one so SP respawns fresh.
pub fn set_remote(remote: bool) {
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        if s.remote != remote {
            s.list.clear();
            s.corpses.clear();
        }
        s.remote = remote;
    });
}

/// MP: apply a replace-all AnimalState broadcast for the active body.
/// Animals are matched by id so walk phases persist across updates; a
/// previously-known animal missing from the list died or despawned -
/// dead ones leave a corpse playing the baked death clip.
pub fn apply_remote(
    body_center: DVec3,
    entries: &[(u32, u8, DVec3, DVec3)], /* (id, state, pos, heading) */
) {
    use tenebris_core::proto::{ANIMAL_STATE_DEAD, ANIMAL_STATE_FLEE, ANIMAL_STATE_IDLE};
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        s.remote = true;
        s.body_center = body_center;
        let mut next: Vec<Animal> = Vec::with_capacity(entries.len());
        for &(id, st, pos, heading) in entries {
            if st == ANIMAL_STATE_DEAD {
                s.corpses.push(Corpse { pos, heading, age: 0.0 });
                continue;
            }
            let mut a = match s.list.iter().find(|a| a.id == id) {
                Some(prev) => *prev,
                None => Animal::new(id, pos, dvec3_normalize(dvec3_sub(pos, body_center))),
            };
            a.pos = pos;
            if dvec3_length(heading) > 1e-6 {
                a.heading = heading;
            }
            a.state = match st {
                x if x == ANIMAL_STATE_IDLE => AnimalState::Idle,
                x if x == ANIMAL_STATE_FLEE => AnimalState::Flee,
                _ => AnimalState::Walk,
            };
            next.push(a);
        }
        /* Known animals absent from the broadcast (killed by another
         * player, or despawned): give kills a corpse so the death clip
         * plays for everyone nearby. Despawns are far away - a corpse
         * there is invisible anyway, so no need to tell them apart. */
        for old in &s.list {
            if !next.iter().any(|a| a.id == old.id) {
                s.corpses.push(Corpse { pos: old.pos, heading: old.heading, age: 0.0 });
            }
        }
        s.list = next;
    });
}

pub fn count() -> usize {
    S.with(|c| c.borrow().list.len())
}

/// Stable id of the animal at raycast index `idx` (for the MP hit
/// message - `hit` swap-removes on kill, so read the id first).
pub fn id_at(idx: i32) -> Option<u32> {
    S.with(|c| c.borrow().list.get(idx as usize).map(|a| a.id))
}

/// Dev/screenshot aid: drop a small herd on the ground in front of the
/// player (along their look forward) so they're framed immediately.
pub fn dev_spawn(w: &World, p: &PlayerCtrl) {
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        s.list.clear();
        s.corpses.clear();
        s.frozen = true;
        let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
        s.body_center = center;
        let fwd = p.basis.fwd;
        let right = p.basis.right;
        for k in 0..6i32 {
            let ahead = 6.0 + (k / 2) as f64 * 4.0;
            let side = ((k % 3) - 1) as f64 * 3.0;
            let local = dvec3_sub(p.position, center);
            let point = dvec3_add(
                local,
                dvec3_add(dvec3_scale(fwd, ahead), dvec3_scale(right, side)),
            );
            let dir = dvec3_normalize(point);
            if let Some(pos) = fauna::floor_pos(w, dir, dvec3_length(local), p.last_tile) {
                let id = s.next_id;
                s.next_id = s.next_id.wrapping_add(1).max(1);
                s.list.push(Animal::new(id, pos, dir));
            }
        }
        /* Stage one corpse at the end of the death clip so the shot shows
         * the keel-over pose (frozen herd -> it never ages out). */
        {
            let local = dvec3_sub(p.position, center);
            let point = dvec3_add(
                local,
                dvec3_add(dvec3_scale(fwd, 5.0), dvec3_scale(right, -4.0)),
            );
            let dir = dvec3_normalize(point);
            if let Some(pos) = fauna::floor_pos(w, dir, dvec3_length(local), p.last_tile) {
                s.corpses.push(Corpse { pos, heading: fwd, age: 0.7 });
            }
        }
    });
}

/// Average position of the current herd (for the dev camera aim).
pub fn herd_center() -> Option<DVec3> {
    S.with(|c| {
        let s = c.borrow();
        if s.list.is_empty() {
            return None;
        }
        let mut acc = DVec3::default();
        for a in &s.list {
            acc = dvec3_add(acc, a.pos);
        }
        Some(dvec3_scale(acc, 1.0 / s.list.len() as f64))
    })
}

/* Ring-spawning + floor-seating live in core::fauna (spawn_near /
 * floor_pos / reseat) - the MP server drives its herds through the
 * same helpers, so SP and MP animals behave identically. */

/// Per-frame: wander + re-seat on the surface, cull, and top up the herd.
pub fn update(dt: f32, w: &World, p: &PlayerCtrl) {
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
        s.body_center = center;
        if s.frozen {
            return;
        }
        if s.remote {
            /* Server owns movement; locally just swing the legs and age
             * the corpses so the render stays alive between broadcasts. */
            for a in &mut s.list {
                if a.is_moving() {
                    a.anim_phase +=
                        dt * if a.state == AnimalState::Flee { 16.0 } else { 8.0 };
                }
            }
            for corpse in &mut s.corpses {
                corpse.age += dt;
            }
            s.corpses.retain(|c| c.age < CORPSE_LINGER_S);
            return;
        }
        s.salt = s.salt.wrapping_add(1);
        let salt = s.salt;

        for a in &mut s.list {
            let up = dvec3_normalize(dvec3_sub(a.pos, center));
            fauna::tick(a, up, dt, salt.wrapping_add(a.id));
            /* Re-seat feet on the (possibly edited) floor at the new
             * direction so the critter hugs the terrain. */
            fauna::reseat(w, a);
        }

        /* Age out the corpses (baked death clip + linger). */
        for corpse in &mut s.corpses {
            corpse.age += dt;
        }
        s.corpses.retain(|c| c.age < CORPSE_LINGER_S);

        /* Cull the dead + the far-off. */
        let ppos = p.position;
        s.list
            .retain(|a| a.is_alive() && dvec3_length(dvec3_sub(a.pos, ppos)) < DESPAWN_M);

        /* Top the population back up. */
        s.spawn_cd -= dt;
        if s.list.len() < TARGET_COUNT && s.spawn_cd <= 0.0 {
            s.spawn_cd = SPAWN_INTERVAL_S;
            let id = s.next_id;
            if let Some(a) = fauna::spawn_near(w, p.position, id, salt) {
                s.list.push(a);
                s.next_id = s.next_id.wrapping_add(1).max(1);
            }
        }
    });
}

/* ---------------------------------------------------------------------- */
/* Hunt: ray-vs-sphere pick + damage.                                      */

/// Nearest animal the ray (eye + dir) hits within `max_dist`, as
/// `(index, dist)`; index -1 = miss. Mirrors `torch::raycast`.
pub fn raycast(eye: Vec3, dir: Vec3, max_dist: f32) -> (i32, f32) {
    S.with(|c| {
        let s = c.borrow();
        let mut best = -1i32;
        let mut best_t = max_dist;
        for (i, a) in s.list.iter().enumerate() {
            let up = dvec3_normalize(dvec3_sub(a.pos, s.body_center));
            let cen = dvec3_add(a.pos, dvec3_scale(up, HIT_CENTRE_UP_M));
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
    })
}

/// Damage the animal at `idx` from world point `from`. Returns the meat
/// count to award when it dies this hit (0 while it's still alive), and
/// removes the corpse.
pub fn hit(idx: i32, dmg: f32, from: Vec3) -> u16 {
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        if idx < 0 || idx as usize >= s.list.len() {
            return 0;
        }
        let center = s.body_center;
        let a = &mut s.list[idx as usize];
        let up = dvec3_normalize(dvec3_sub(a.pos, center));
        let from_d = dvec3_make(from.x as f64, from.y as f64, from.z as f64);
        fauna::hit(a, dmg, from_d, up);
        if !a.is_alive() {
            /* Leave a corpse behind to play the baked death clip. */
            let corpse = Corpse { pos: a.pos, heading: a.heading, age: 0.0 };
            s.list.swap_remove(idx as usize);
            s.corpses.push(corpse);
            /* Two to three meat per critter. */
            2 + (rng::hash2(idx.wrapping_mul(31), 5) * 2.0) as u16
        } else {
            0
        }
    })
}

/* ---------------------------------------------------------------------- */
/* Rendering (immediate-mode sokol_gl, no shader file).                    */

/// Column-major basis mapping local +Y -> `up` and the model's facing
/// (local -Z) -> `heading`. Right-handed so back-face culling keeps the
/// solid faces.
fn orient_basis(up: DVec3, heading: DVec3) -> [f32; 16] {
    let up = dvec3_normalize(up);
    let neg_fwd = dvec3_scale(dvec3_normalize(heading), -1.0); // local +Z
    let right = dvec3_normalize(dvec3_cross(up, neg_fwd)); // col0 = up x (+Z)
    [
        right.x as f32, right.y as f32, right.z as f32, 0.0,
        up.x as f32, up.y as f32, up.z as f32, 0.0,
        neg_fwd.x as f32, neg_fwd.y as f32, neg_fwd.z as f32, 0.0,
        0.0, 0.0, 0.0, 1.0,
    ]
}

/// One axis-aligned cuboid, per-face shaded (top brightest, bottom
/// darkest), CCW-from-outside so back-face culling works.
fn draw_box(cx: f32, cy: f32, cz: f32, hx: f32, hy: f32, hz: f32, r: f32, g: f32, b: f32) {
    let (x0, x1) = (cx - hx, cx + hx);
    let (y0, y1) = (cy - hy, cy + hy);
    let (z0, z1) = (cz - hz, cz + hz);
    // (face corners CCW from outside, shade)
    let faces: [([[f32; 3]; 4], f32); 6] = [
        // top +Y (brightest)
        ([[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]], 1.0),
        // bottom -Y (darkest)
        ([[x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1]], 0.55),
        // front -Z
        ([[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]], 0.85),
        // back +Z
        ([[x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1]], 0.7),
        // right +X
        ([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], 0.8),
        // left -X
        ([[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0]], 0.75),
    ];
    sgl::begin_triangles();
    for (quad, shade) in faces.iter() {
        sgl::c3f(r * shade, g * shade, b * shade);
        // two CCW triangles: 0,1,2 and 0,2,3
        for &i in &[0usize, 1, 2, 0, 2, 3] {
            let v = quad[i];
            sgl::v3f(v[0], v[1], v[2]);
        }
    }
    sgl::end();
}

/// Draw one quadruped critter (origin at feet, +Y up, faces -Z).
fn draw_critter(pos: DVec3, up: DVec3, heading: DVec3, phase: f32, moving: bool) {
    let basis = orient_basis(up, heading);
    let swing = if moving { (phase.sin()) * 0.5 } else { 0.0 };

    sgl::push_matrix();
    sgl::translate(pos.x as f32, pos.y as f32, pos.z as f32);
    sgl::mult_matrix(&basis[0]);

    // Body (long along Z), sitting on the legs.
    let (br, bg, bb) = (0.52, 0.40, 0.28);
    draw_box(0.0, 0.46, 0.0, 0.16, 0.13, 0.30, br, bg, bb);
    // Head at the front (-Z).
    draw_box(0.0, 0.52, -0.36, 0.12, 0.11, 0.11, 0.58, 0.45, 0.31);
    // Ears.
    draw_box(-0.07, 0.66, -0.36, 0.03, 0.05, 0.02, 0.42, 0.32, 0.22);
    draw_box(0.07, 0.66, -0.36, 0.03, 0.05, 0.02, 0.42, 0.32, 0.22);
    // Tail at the back (+Z).
    draw_box(0.0, 0.5, 0.34, 0.03, 0.03, 0.08, 0.44, 0.33, 0.24);

    // Four legs. Diagonal gait: FL + BR in phase, FR + BL opposite.
    let leg = |x: f32, z: f32, sw: f32| {
        sgl::push_matrix();
        sgl::translate(x, 0.34, z);
        sgl::rotate(sw, 1.0, 0.0, 0.0);
        sgl::translate(0.0, -0.17, 0.0);
        draw_box(0.0, 0.0, 0.0, 0.05, 0.17, 0.05, 0.40, 0.30, 0.22);
        sgl::pop_matrix();
    };
    leg(-0.11, -0.22, swing); // front-left
    leg(0.11, 0.22, swing); // back-right
    leg(0.11, -0.22, -swing); // front-right
    leg(-0.11, 0.22, -swing); // back-left

    sgl::pop_matrix();
}

/// Draw every animal + lingering corpse. Called in the offscreen opaque
/// pass next to torches. `time_s` drives the idle clip (the fauna sim
/// only advances `anim_phase` while moving).
pub fn draw(view: Mat4, proj: Mat4, time_s: f32) {
    let (list, corpses, center) = S.with(|c| {
        let s = c.borrow();
        (s.list.clone(), s.corpses.clone(), s.body_center)
    });
    if list.is_empty() && corpses.is_empty() {
        return;
    }

    /* Record into the renderer's world-space sgl context so this
     * geometry flushes inside the offscreen scene pass: z-sorted
     * against terrain depth and drawn UNDER the water pass + composite
     * post-process (see renderer::sgl_world_begin). */
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
            /* No back-face cull: the box winding + per-critter basis
             * handedness aren't worth fighting for a handful of tiny
             * quads, and double-sided keeps them visible regardless. */
            cull_mode: sokol::gfx::CullMode::None,
            ..Default::default()
        });
        PIP3D.with(|p| p.set(pip));
    }
    sgl::load_pipeline(pip);

    let set = model_set();
    for a in &list {
        let up = dvec3_normalize(dvec3_sub(a.pos, center));
        match &set {
            Some(set) => {
                /* Walk/flee sample the baked walk clip on the sim's
                 * anim_phase (flee accumulates 2x faster -> faster gait);
                 * idle samples the grazing clip on the wall clock, offset
                 * per animal so the herd doesn't nod in lockstep. */
                let (clip, t) = if a.state == AnimalState::Idle {
                    (&set.idle, time_s + a.id as f32 * 0.73)
                } else {
                    (&set.walk, a.anim_phase * (set.walk.duration_s / std::f32::consts::TAU))
                };
                let basis = orient_basis(up, a.heading);
                sgl::push_matrix();
                sgl::translate(a.pos.x as f32, a.pos.y as f32, a.pos.z as f32);
                sgl::mult_matrix(&basis[0]);
                baked_model::draw(&set.model, Some((clip, t)));
                sgl::pop_matrix();
            }
            None => {
                draw_critter(a.pos, up, a.heading, a.anim_phase, a.state != AnimalState::Idle);
            }
        }
    }

    /* Corpses play the baked death clip, then hold its final frame (the
     * sampler clamps a non-looping clip past its end). Fallback build:
     * no clip to play, so corpses simply don't draw. */
    if let Some(set) = &set {
        for corpse in &corpses {
            let up = dvec3_normalize(dvec3_sub(corpse.pos, center));
            let basis = orient_basis(up, corpse.heading);
            sgl::push_matrix();
            sgl::translate(corpse.pos.x as f32, corpse.pos.y as f32, corpse.pos.z as f32);
            sgl::mult_matrix(&basis[0]);
            baked_model::draw(&set.model, Some((&set.death, corpse.age)));
            sgl::pop_matrix();
        }
    }
    renderer::sgl_world_end();
    /* No sgl_draw here - the world context flushes in
     * compose_to_swapchain, inside the offscreen pass. */
}
