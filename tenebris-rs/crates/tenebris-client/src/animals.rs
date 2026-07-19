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

use tenebris_core::fauna::{self, Animal, AnimalKind, AnimalState};
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
/// How many night stalkers to keep prowling while it's dark.
const STALKER_COUNT: usize = 4;
/// Seconds between stalker spawn attempts at night.
const STALKER_SPAWN_INTERVAL_S: f32 = 4.0;
/// Shadow palette for the stalker (multiplies the critter model).
const STALKER_TINT: [f32; 3] = [0.30, 0.24, 0.40];
/// Red-flash palette while `hurt_t` blinks on.
const HURT_TINT: [f32; 3] = [2.2, 0.25, 0.25];
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
    /* Corpses kept the default critter scale after death - carry the
     * kind so the death clip renders at the animal's living size. */
    kind: fauna::AnimalKind,
}

struct State {
    list: Vec<Animal>,
    corpses: Vec<Corpse>,
    body_center: DVec3,
    next_id: u32,
    spawn_cd: f32,
    stalker_cd: f32,
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
        stalker_cd: 0.0,
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
        s.stalker_cd = 0.0;
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
    entries: &[(u32, u8, u8, DVec3, DVec3)], /* (id, state, kind, pos, heading) */
) {
    use tenebris_core::proto::{
        ANIMAL_STATE_CHASE, ANIMAL_STATE_DEAD, ANIMAL_STATE_FLEE, ANIMAL_STATE_IDLE,
    };
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        s.remote = true;
        s.body_center = body_center;
        let mut next: Vec<Animal> = Vec::with_capacity(entries.len());
        for &(id, st, kind, pos, heading) in entries {
            if st == ANIMAL_STATE_DEAD {
                s.corpses.push(Corpse { pos, heading, age: 0.0, kind: AnimalKind::from_u8(kind) });
                continue;
            }
            let mut a = match s.list.iter().find(|a| a.id == id) {
                Some(prev) => *prev,
                None => Animal::new(id, pos, dvec3_normalize(dvec3_sub(pos, body_center))),
            };
            a.kind = AnimalKind::from_u8(kind);
            a.pos = pos;
            if dvec3_length(heading) > 1e-6 {
                a.heading = heading;
            }
            let new_state = match st {
                x if x == ANIMAL_STATE_IDLE => AnimalState::Idle,
                x if x == ANIMAL_STATE_FLEE => AnimalState::Flee,
                x if x == ANIMAL_STATE_CHASE => AnimalState::Chase,
                _ => AnimalState::Walk,
            };
            /* A wander->flee transition means someone just hit it: play
             * the red flash for everyone nearby (the wire doesn't carry
             * hurt_t; the local hitter flashed immediately via hit()). */
            if new_state == AnimalState::Flee && a.state != AnimalState::Flee {
                a.hurt_t = fauna::HURT_FLASH_S;
            }
            a.state = new_state;
            next.push(a);
        }
        /* Known animals absent from the broadcast (killed by another
         * player, or despawned): give kills a corpse so the death clip
         * plays for everyone nearby. Despawns are far away - a corpse
         * there is invisible anyway, so no need to tell them apart. */
        for old in &s.list {
            if !next.iter().any(|a| a.id == old.id) {
                s.corpses.push(Corpse { pos: old.pos, heading: old.heading, age: 0.0, kind: old.kind });
            }
        }
        s.list = next;
    });
}

pub fn count() -> usize {
    S.with(|c| c.borrow().list.len())
}

/// Live sim populations for the profiler entity readout:
/// (passive animals, stalkers, corpses). Passive = everything the herd
/// cap governs (land + water species); stalkers are the night hostiles.
pub fn sim_counts() -> (usize, usize, usize) {
    S.with(|c| {
        let s = c.borrow();
        let stalkers = s.list.iter().filter(|a| a.kind == fauna::AnimalKind::Stalker).count();
        (s.list.len() - stalkers, stalkers, s.corpses.len())
    })
}

/// Stable id of the animal at raycast index `idx` (for the MP hit
/// message - `hit` swap-removes on kill, so read the id first).
pub fn id_at(idx: i32) -> Option<u32> {
    S.with(|c| c.borrow().list.get(idx as usize).map(|a| a.id))
}

/// Dev/screenshot aid: drop a small herd on the ground in front of the
/// player (along their look forward) so they're framed immediately.
pub fn dev_spawn(w: &World, p: &PlayerCtrl) {
    dev_spawn_roster(w, p, false)
}

/// `new_only` narrows the lineup to the newest species row (serpent,
/// raptor, crane, sparkit, shellkin) placed close in one rank - the
/// clean "meet the new animals" shot.
pub fn dev_spawn_roster(w: &World, p: &PlayerCtrl, new_only: bool) {
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        s.list.clear();
        s.corpses.clear();
        s.frozen = true;
        let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
        s.body_center = center;
        let fwd = p.basis.fwd;
        let right = p.basis.right;
        let n = if new_only { 5i32 } else { 18 };
        for k in 0..n {
            let (ahead, side) = if new_only {
                /* One close rank of five, broadside. */
                (7.0, (k - 2) as f64 * 2.6)
            } else {
                (6.0 + (k / 3) as f64 * 4.0, ((k % 3) - 1) as f64 * 4.0)
            };
            let local = dvec3_sub(p.position, center);
            let point = dvec3_add(
                local,
                dvec3_add(dvec3_scale(fwd, ahead), dvec3_scale(right, side)),
            );
            let dir = dvec3_normalize(point);
            if let Some(pos) = fauna::floor_pos(w, dir, dvec3_length(local), p.last_tile) {
                let id = s.next_id;
                s.next_id = s.next_id.wrapping_add(1).max(1);
                let mut a = Animal::new(id, pos, dir);
                /* Zoo lineup: one of each new kind so a shot frames the
                 * whole menagerie; slot 3 also mid hit-flash. */
                const ZOO: [fauna::AnimalKind; 18] = [
                    fauna::AnimalKind::Lizard,
                    fauna::AnimalKind::Penguin,
                    fauna::AnimalKind::Cat,
                    fauna::AnimalKind::Cow,
                    fauna::AnimalKind::Sheep,
                    fauna::AnimalKind::Chicken,
                    fauna::AnimalKind::Bird,
                    fauna::AnimalKind::Frog,
                    fauna::AnimalKind::Critter,
                    fauna::AnimalKind::Fish,
                    fauna::AnimalKind::LargeFish,
                    fauna::AnimalKind::LongFish,
                    fauna::AnimalKind::Turtle,
                    fauna::AnimalKind::SerpentFish,
                    fauna::AnimalKind::Raptor,
                    fauna::AnimalKind::Crane,
                    fauna::AnimalKind::Sparkit,
                    fauna::AnimalKind::Shellkin,
                ];
                const NEW: [fauna::AnimalKind; 5] = [
                    fauna::AnimalKind::SerpentFish,
                    fauna::AnimalKind::Raptor,
                    fauna::AnimalKind::Crane,
                    fauna::AnimalKind::Sparkit,
                    fauna::AnimalKind::Shellkin,
                ];
                a.kind = if new_only {
                    NEW[k as usize % NEW.len()]
                } else {
                    ZOO[k as usize % ZOO.len()]
                };
                if k == 3 && !new_only {
                    a.hurt_t = 0.3; /* lands on a red blink-on interval */
                }
                s.list.push(a);
            }
        }
        /* Stage one corpse at the end of the death clip so the shot shows
         * the keel-over pose (frozen herd -> it never ages out). */
        if !new_only {
            let local = dvec3_sub(p.position, center);
            let point = dvec3_add(
                local,
                dvec3_add(dvec3_scale(fwd, 5.0), dvec3_scale(right, -4.0)),
            );
            let dir = dvec3_normalize(point);
            if let Some(pos) = fauna::floor_pos(w, dir, dvec3_length(local), p.last_tile) {
                s.corpses.push(Corpse { pos, heading: fwd, age: 0.7, kind: fauna::AnimalKind::Critter });
            }
        }
    });
}

/// Dev screenshot: line up the five water species (minnow, reef fish,
/// eel, ray, turtle) frozen so they hold their pose. TENEBRIS_DEV_FISH=1
/// floats them at eye height for a clean model lineup; =under drops
/// them just below the nearest ocean surface for an underwater shot.
/// Returns the water-anchor direction when the underwater school was
/// placed (so the caller can move the camera above it), else None.
pub fn dev_spawn_fish(w: &World, p: &PlayerCtrl, underwater: bool) -> Option<DVec3> {
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        s.list.clear();
        s.corpses.clear();
        s.frozen = true;
        let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
        s.body_center = center;
        let fwd = p.basis.fwd;
        let right = p.basis.right;
        let up = p.basis.up;
        const FISH: [fauna::AnimalKind; 6] = [
            fauna::AnimalKind::Fish,
            fauna::AnimalKind::FlatFish,
            fauna::AnimalKind::LongFish,
            fauna::AnimalKind::LargeFish,
            fauna::AnimalKind::Turtle,
            fauna::AnimalKind::SerpentFish,
        ];

        /* Underwater mode: find an ocean-surface anchor ahead by
         * marching forward until a column reads water at sea level,
         * then place the school a fixed depth below that surface. */
        let sea_r = w.depth_to_radius_m(tenebris_core::world::WORLD_SEA_LEVEL_DEPTH)
            + tenebris_core::planet_gen::sea_raise_m(&w.body) as f64;
        let water_anchor = if underwater {
            let mut found = None;
            for step in 1..=60 {
                let ahead = dvec3_add(p.position, dvec3_scale(fwd, step as f64 * 1.5));
                let dir = dvec3_normalize(dvec3_sub(ahead, center));
                let probe = dvec3_add(center, dvec3_scale(dir, sea_r - 0.5));
                let pf = tenebris_core::math::dvec3_to_vec3(dvec3_sub(probe, center));
                if w.block_at_pos(pf, p.last_tile) == tenebris_core::blocks::Block::Water {
                    found = Some(dir);
                    break;
                }
            }
            found
        } else {
            None
        };

        for (k, kind) in FISH.iter().enumerate() {
            let side = (k as f64 - 2.0) * 1.9;
            let (pos, heading) = if let Some(adir) = water_anchor {
                /* Submerged row: spread sideways along the surface,
                 * dropped below it by the species clearance so the
                 * whole body sits under the waterline. */
                let t = dvec3_normalize(dvec3_cross(adir, up));
                let depth_r = sea_r - kind.water_top_clearance() - 0.15;
                let surf = dvec3_add(center, dvec3_scale(adir, depth_r));
                (dvec3_add(surf, dvec3_scale(t, side)), t)
            } else {
                let base = dvec3_add(
                    p.position,
                    dvec3_add(dvec3_scale(fwd, 4.5), dvec3_scale(right, side)),
                );
                (dvec3_add(base, dvec3_scale(up, 1.7)), right)
            };
            let dir = dvec3_normalize(dvec3_sub(pos, center));
            let id = s.next_id;
            s.next_id = s.next_id.wrapping_add(1).max(1);
            let mut a = Animal::new(id, pos, dir);
            a.kind = *kind;
            a.heading = heading; /* broadside to the camera */
            s.list.push(a);
        }
        water_anchor
    })
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

/// Stalker lunge check against the LOCAL player - shared by the SP sim
/// and the MP mirror (positions come off the wire, but my knockback +
/// hunger are mine to apply). Returns without touching creative players.
fn stalker_contact(list: &mut [Animal], p: &mut PlayerCtrl, center: DVec3) {
    for a in list.iter_mut() {
        if a.kind != AnimalKind::Stalker || !a.is_alive() || a.attack_cd > 0.0 {
            continue;
        }
        let to_player = dvec3_sub(p.position, a.pos);
        if dvec3_length(to_player) > fauna::CONTACT_M {
            continue;
        }
        a.attack_cd = fauna::ATTACK_CD_S;
        /* Shove: away from the stalker, with a little pop upward. */
        let up = dvec3_normalize(dvec3_sub(p.position, center));
        let away = dvec3_normalize(dvec3_sub(
            to_player,
            dvec3_scale(up, tenebris_core::math::dvec3_dot(to_player, up)),
        ));
        p.velocity = dvec3_add(
            p.velocity,
            dvec3_add(
                dvec3_scale(away, fauna::STALKER_KNOCKBACK_MPS),
                dvec3_scale(up, fauna::STALKER_KNOCKBACK_MPS * 0.4),
            ),
        );
        if p.survival_mode {
            p.hunger = (p.hunger - fauna::STALKER_HIT_HUNGER).max(0.0);
        }
    }
}

/// Per-frame: wander/chase + resolve steps and falls, cull, top up the
/// herd, and prowl in the night stalkers.
pub fn update(dt: f32, w: &World, p: &mut PlayerCtrl) {
    S.with(|c| {
        let s = &mut *c.borrow_mut();
        let center = dvec3_make(w.body.pos_x, w.body.pos_y, w.body.pos_z);
        s.body_center = center;
        if s.frozen {
            return;
        }
        if s.remote {
            /* Server owns movement; locally just swing the legs, decay
             * the flash/lunge timers, age the corpses, and let mirrored
             * stalkers lunge at MY player (my knockback + hunger are
             * client-side). */
            for a in &mut s.list {
                if a.is_moving() {
                    a.anim_phase +=
                        dt * if a.state == AnimalState::Walk { 8.0 } else { 16.0 };
                }
                if a.hurt_t > 0.0 {
                    a.hurt_t = (a.hurt_t - dt).max(0.0);
                }
                if a.attack_cd > 0.0 {
                    a.attack_cd = (a.attack_cd - dt).max(0.0);
                }
            }
            stalker_contact(&mut s.list, p, center);
            for corpse in &mut s.corpses {
                corpse.age += dt;
            }
            s.corpses.retain(|c| c.age < CORPSE_LINGER_S);
            return;
        }
        s.salt = s.salt.wrapping_add(1);
        let salt = s.salt;
        let night = fauna::is_night(w, p.position, tenebris_core::world_time::seconds());

        for a in &mut s.list {
            let up = dvec3_normalize(dvec3_sub(a.pos, center));
            let target = (a.kind == AnimalKind::Stalker).then_some(p.position);
            fauna::tick_with_target(a, up, dt, salt.wrapping_add(a.id), target);
            /* Resolve the move against the real floor: a rise ahead
             * blocks + arms the stop-then-jump, a drop starts a
             * gravity fall (see fauna::reseat). */
            fauna::reseat(w, a, dt);
        }
        stalker_contact(&mut s.list, p, center);

        /* Age out the corpses (baked death clip + linger). */
        for corpse in &mut s.corpses {
            corpse.age += dt;
        }
        s.corpses.retain(|c| c.age < CORPSE_LINGER_S);

        /* Cull the dead + the far-off; dawn burns the stalkers off. */
        let ppos = p.position;
        s.list.retain(|a| {
            a.is_alive()
                && dvec3_length(dvec3_sub(a.pos, ppos)) < DESPAWN_M
                && (a.kind != AnimalKind::Stalker || night)
        });

        /* Top the population back up. The cap counts ALL passive animals
         * (everything that isn't a Stalker), NOT just AnimalKind::Critter:
         * spawn_near_auto returns real species (Sheep / Cow / Sparkit / Fish
         * / ...) and NEVER Critter, so the old `== Critter` filter was
         * always 0 < TARGET_COUNT and the herd spawned one animal every
         * SPAWN_INTERVAL_S forever - bounded only by the 70 m despawn, so a
         * stationary player piled up dozens (the "too many animals / 27 ms
         * animals-sim" bug). Non-Stalker is the passive population; the
         * Stalker cap below is separate and already correct. */
        s.spawn_cd -= dt;
        let passive_count = s.list.iter().filter(|a| a.kind != AnimalKind::Stalker).count();
        if passive_count < TARGET_COUNT && s.spawn_cd <= 0.0 {
            s.spawn_cd = SPAWN_INTERVAL_S;
            let id = s.next_id;
            if let Some(a) = fauna::spawn_near_auto(w, p.position, id, salt) {
                s.list.push(a);
                s.next_id = s.next_id.wrapping_add(1).max(1);
            }
        }

        /* Night: stalkers prowl in on their own cadence (unless the
         * player switched enemy mobs off in Settings). Lifeless worlds
         * (icy / barren / non-earthlike) get no stalkers either. */
        s.stalker_cd -= dt;
        if night
            && fauna::body_has_fauna(&w.body)
            && crate::settings::enemy_mobs()
            && s.list.iter().filter(|a| a.kind == AnimalKind::Stalker).count() < STALKER_COUNT
            && s.stalker_cd <= 0.0
        {
            s.stalker_cd = STALKER_SPAWN_INTERVAL_S;
            let id = s.next_id;
            if let Some(a) =
                fauna::spawn_near_kind(w, p.position, id, salt.wrapping_add(97), AnimalKind::Stalker)
            {
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
        let corpse_kind_meat = a.kind.meat();
        let up = dvec3_normalize(dvec3_sub(a.pos, center));
        let from_d = dvec3_make(from.x as f64, from.y as f64, from.z as f64);
        fauna::hit(a, dmg, from_d, up);
        if !a.is_alive() {
            /* Leave a corpse behind to play the baked death clip. */
            let corpse = Corpse { pos: a.pos, heading: a.heading, age: 0.0, kind: a.kind };
            s.list.swap_remove(idx as usize);
            s.corpses.push(corpse);
            /* Per-kind base meat (cows best) + a 0..2 roll. */
            corpse_kind_meat + (rng::hash2(idx.wrapping_mul(31), 5) * 2.0) as u16
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

/* Animal texture atlas (assets/textures/animals.png, generated by
 * tools/gen-animal-textures.py): 16 columns of 32x32, one per
 * AnimalKind wire id. Each species tile splits into three unwrap
 * regions - BODY (fur / feathers / scales / shell), HEAD (face strip
 * with eyes), LIMB (darker legs / fins). Column 15 is a near-white
 * tile for accent boxes (combs, beaks, horns, eyes) that want a flat
 * colour instead of the species pattern. */
const ANIMAL_ATLAS_COLS: f32 = 24.0;

#[derive(Clone, Copy, PartialEq)]
enum Part {
    Body,
    Head,
    Limb,
}

/// UV rect of a species' unwrap region: (u0, u1, v0, v1). Insets keep
/// linear-ish sampling off the neighbouring column / region seams.
fn part_uv(kid: u8, part: Part) -> (f32, f32, f32, f32) {
    let u0 = kid as f32 / ANIMAL_ATLAS_COLS;
    let u1 = (kid as f32 + 1.0) / ANIMAL_ATLAS_COLS;
    let inset = 1.0 / (ANIMAL_ATLAS_COLS * 32.0);
    let (v0, v1) = match part {
        Part::Body => (0.02, 0.47),
        Part::Head => (0.53, 0.72),
        Part::Limb => (0.78, 0.97),
    };
    (u0 + inset, u1 - inset, v0, v1)
}

/// The flat near-white accent tile (atlas column 23; it moved off 15
/// when the sea serpent took that wire id) - colour comes entirely from
/// the vertex tint.
fn accent_uv() -> (f32, f32, f32, f32) {
    part_uv(23, Part::Body)
}

/// One axis-aligned cuboid, textured + per-face shaded (top brightest,
/// bottom darkest), CCW-from-outside so back-face culling works. The
/// FRONT (-Z) face samples `uv_front`, all other faces `uv_rest` -
/// that's how a head box wears its eyes on the face only.
#[allow(clippy::too_many_arguments)]
fn draw_box(
    cx: f32,
    cy: f32,
    cz: f32,
    hx: f32,
    hy: f32,
    hz: f32,
    uv_front: (f32, f32, f32, f32),
    uv_rest: (f32, f32, f32, f32),
    r: f32,
    g: f32,
    b: f32,
    lit: f32,
) {
    let (x0, x1) = (cx - hx, cx + hx);
    let (y0, y1) = (cy - hy, cy + hy);
    let (z0, z1) = (cz - hz, cz + hz);
    // (face corners CCW from outside, shade, is_front)
    let faces: [([[f32; 3]; 4], f32, bool); 6] = [
        // top +Y (brightest)
        ([[x0, y1, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0]], 1.0, false),
        // bottom -Y (darkest)
        ([[x0, y0, z1], [x0, y0, z0], [x1, y0, z0], [x1, y0, z1]], 0.55, false),
        // front -Z
        ([[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]], 0.85, true),
        // back +Z
        ([[x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [x0, y0, z1]], 0.7, false),
        // right +X
        ([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], 0.8, false),
        // left -X
        ([[x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [x0, y0, z0]], 0.75, false),
    ];
    sgl::begin_triangles();
    for (quad, shade, is_front) in faces.iter() {
        let (u0, u1, v0, v1) = if *is_front { uv_front } else { uv_rest };
        let uv = [(u0, v1), (u0, v0), (u1, v0), (u1, v1)];
        sgl::c3f(r * shade * lit, g * shade * lit, b * shade * lit);
        // two CCW triangles: 0,1,2 and 0,2,3
        for &i in &[0usize, 1, 2, 0, 2, 3] {
            let v = quad[i];
            sgl::v3f_t2f(v[0], v[1], v[2], uv[i].0, uv[i].1);
        }
    }
    sgl::end();
}

/// Draw one animal of any procedural kind (origin at feet, +Y up,
/// faces -Z; sizes scale with kind.scale()). The dog-like base critter
/// keeps the baked model path; the menagerie below is drawn from boxes
/// with per-kind silhouettes and palettes so each species reads at a
/// glance: puffy white sheep, tiny pecking chicken, patched cow, slim
/// grey cat, flapping bird, finned fish, squat green frog.
fn draw_kind(
    kind: AnimalKind,
    pos: DVec3,
    up: DVec3,
    heading: DVec3,
    phase: f32,
    moving: bool,
    lit: f32,
    tint: [f32; 3],
) {
    let basis = orient_basis(up, heading);
    let swing = if moving { phase.sin() * 0.5 } else { 0.0 };
    let sc = kind.scale();

    sgl::push_matrix();
    crate::renderer::sgl_translate_scene(pos);
    sgl::mult_matrix(&basis[0]);
    sgl::scale(sc, sc, sc);

    let kid = kind.to_u8();
    let body_uv = part_uv(kid, Part::Body);
    let head_uv = part_uv(kid, Part::Head);
    let limb_uv = part_uv(kid, Part::Limb);
    let acc = accent_uv();

    /* Textured structural box: the part picks its unwrap region (a
     * head wears its eyes on the front face only, the rest of the box
     * continues the body pattern). Colour is a brightness multiplier
     * over the texture - the species' hue lives in the atlas. */
    let b = |part: Part, cx: f32, cy: f32, cz: f32, hx: f32, hy: f32, hz: f32, m: f32| {
        let (front, rest) = match part {
            Part::Head => (head_uv, body_uv),
            Part::Body => (body_uv, body_uv),
            Part::Limb => (limb_uv, limb_uv),
        };
        draw_box(cx, cy, cz, hx, hy, hz, front, rest, m * tint[0], m * tint[1], m * tint[2], lit);
    };
    /* Flat-coloured accent box (comb / beak / horns / eyes / belly):
     * samples the near-white tile so the colour reads pure. */
    let acc_b = |cx: f32, cy: f32, cz: f32, hx: f32, hy: f32, hz: f32, r: f32, g: f32, bl: f32| {
        draw_box(cx, cy, cz, hx, hy, hz, acc, acc, r * tint[0], g * tint[1], bl * tint[2], lit);
    };
    /* Low-poly sphere primitive (accent tile, vertex-tinted, round top-lit
     * shading). Curved, so no face is ever coplanar with the flat body box
     * or with a second sphere - the source of the old eye z-fighting. */
    let sphere = |cx: f32, cy: f32, cz: f32, rad: f32, r: f32, g: f32, bl: f32| {
        use std::f32::consts::PI;
        const STACKS: usize = 4;
        const SLICES: usize = 7;
        let (u0, u1, v0, v1) = acc;
        let (uu, vv) = ((u0 + u1) * 0.5, (v0 + v1) * 0.5);
        let pt = |phi: f32, th: f32| {
            let sp = phi.sin();
            [cx + rad * sp * th.cos(), cy + rad * phi.cos(), cz + rad * sp * th.sin()]
        };
        sgl::begin_triangles();
        for i in 0..STACKS {
            let phi0 = PI * (i as f32) / STACKS as f32;
            let phi1 = PI * (i as f32 + 1.0) / STACKS as f32;
            for j in 0..SLICES {
                let th0 = 2.0 * PI * (j as f32) / SLICES as f32;
                let th1 = 2.0 * PI * (j as f32 + 1.0) / SLICES as f32;
                let quad = [pt(phi0, th0), pt(phi1, th0), pt(phi1, th1), pt(phi0, th1)];
                for &k in &[0usize, 1, 2, 0, 2, 3] {
                    let p = quad[k];
                    let sh = 0.7 + 0.3 * (0.5 + 0.5 * ((p[1] - cy) / rad.max(1e-4)));
                    sgl::c3f(r * tint[0] * sh * lit, g * tint[1] * sh * lit, bl * tint[2] * sh * lit);
                    sgl::v3f_t2f(p[0], p[1], p[2], uu, vv);
                }
            }
        }
        sgl::end();
    };
    /* Googly eye: a proud spherical white eyeball with a dark pupil sphere
     * riding its front-outer face. Contiguous curved meshes, so there is
     * nothing coplanar to z-fight (the old stacked sclera/pupil CUBES
     * flickered against each other and the body). Every species wears a
     * pair for personality. `s` is the eyeball radius; `cx`'s sign is the
     * side it bulges toward, `-z` is "ahead". */
    let googly_eye = |cx: f32, cy: f32, cz: f32, s: f32| {
        sphere(cx, cy, cz, s, 0.97, 0.97, 1.0); /* white sclera, bulging proud */
        let side = if cx >= 0.0 { 1.0 } else { -1.0 };
        sphere(cx + side * s * 0.28, cy + s * 0.05, cz - s * 0.72, s * 0.5, 0.05, 0.05, 0.08); /* pupil */
    };
    let leg4 = |x: f32, z: f32, sw: f32, len: f32, m: f32| {
        sgl::push_matrix();
        sgl::translate(x, len * 2.0, z);
        sgl::rotate(sw, 1.0, 0.0, 0.0);
        sgl::translate(0.0, -len, 0.0);
        draw_box(
            0.0, 0.0, 0.0, 0.05, len, 0.05, limb_uv, limb_uv,
            m * tint[0], m * tint[1], m * tint[2], lit,
        );
        sgl::pop_matrix();
    };

    match kind {
        AnimalKind::Cat => {
            /* Slim tabby body, tail carried high, pointy ears. */
            b(Part::Body, 0.0, 0.42, 0.0, 0.11, 0.10, 0.28, 1.0);
            b(Part::Head, 0.0, 0.50, -0.34, 0.10, 0.09, 0.09, 1.05);
            googly_eye(-0.05, 0.54, -0.42, 0.045);
            googly_eye(0.05, 0.54, -0.42, 0.045);
            acc_b(-0.06, 0.62, -0.34, 0.025, 0.05, 0.02, 0.30, 0.28, 0.32); /* ears */
            acc_b(0.06, 0.62, -0.34, 0.025, 0.05, 0.02, 0.30, 0.28, 0.32);
            /* Raised tail: two segments angling up. */
            b(Part::Limb, 0.0, 0.52, 0.32, 0.025, 0.025, 0.10, 1.0);
            b(Part::Limb, 0.0, 0.64, 0.40, 0.025, 0.09, 0.025, 1.0);
            for (x, z, sw) in
                [(-0.08, -0.20, swing), (0.08, 0.20, swing), (0.08, -0.20, -swing), (-0.08, 0.20, -swing)]
            {
                leg4(x, z, sw, 0.16, 1.0);
            }
        }
        AnimalKind::Sheep => {
            /* Puffy wool slab over dark legs + face. */
            b(Part::Body, 0.0, 0.52, 0.0, 0.20, 0.17, 0.30, 1.0);
            b(Part::Head, 0.0, 0.58, -0.36, 0.10, 0.10, 0.10, 0.45); /* dark face */
            googly_eye(-0.055, 0.60, -0.45, 0.045);
            googly_eye(0.055, 0.60, -0.45, 0.045);
            b(Part::Body, 0.0, 0.68, -0.30, 0.14, 0.06, 0.10, 1.02); /* wool cap */
            for (x, z, sw) in
                [(-0.11, -0.20, swing), (0.11, 0.20, swing), (0.11, -0.20, -swing), (-0.11, 0.20, -swing)]
            {
                leg4(x, z, sw, 0.17, 0.8);
            }
        }
        AnimalKind::Chicken => {
            /* Small white body, red comb, orange beak, two legs. */
            b(Part::Body, 0.0, 0.55, 0.0, 0.16, 0.15, 0.20, 1.0);
            b(Part::Head, 0.0, 0.80, -0.16, 0.09, 0.11, 0.09, 1.0);
            googly_eye(-0.045, 0.84, -0.24, 0.038);
            googly_eye(0.045, 0.84, -0.24, 0.038);
            acc_b(0.0, 0.94, -0.16, 0.03, 0.04, 0.06, 0.85, 0.15, 0.12); /* comb */
            acc_b(0.0, 0.78, -0.27, 0.03, 0.03, 0.04, 0.95, 0.55, 0.10); /* beak */
            for (x, sw) in [(-0.06, swing), (0.06, -swing)] {
                sgl::push_matrix();
                sgl::translate(x, 0.40, 0.0);
                sgl::rotate(sw, 1.0, 0.0, 0.0);
                sgl::translate(0.0, -0.20, 0.0);
                draw_box(
                    0.0, 0.0, 0.0, 0.03, 0.20, 0.03, acc, acc,
                    0.9 * tint[0], 0.6 * tint[1], 0.15 * tint[2], lit,
                );
                sgl::pop_matrix();
            }
        }
        AnimalKind::Cow => {
            /* Big blotched body, short horns, low head (the white
             * patches live in the texture now). */
            b(Part::Body, 0.0, 0.50, 0.0, 0.19, 0.15, 0.32, 1.0);
            b(Part::Head, 0.0, 0.48, -0.40, 0.11, 0.11, 0.10, 0.95);
            googly_eye(-0.06, 0.53, -0.49, 0.045);
            googly_eye(0.06, 0.53, -0.49, 0.045);
            acc_b(-0.10, 0.60, -0.40, 0.035, 0.035, 0.03, 0.88, 0.86, 0.80); /* horn */
            acc_b(0.10, 0.60, -0.40, 0.035, 0.035, 0.03, 0.88, 0.86, 0.80);
            for (x, z, sw) in
                [(-0.12, -0.22, swing), (0.12, 0.22, swing), (0.12, -0.22, -swing), (-0.12, 0.22, -swing)]
            {
                leg4(x, z, sw, 0.17, 1.0);
            }
        }
        AnimalKind::Bird => {
            /* Small feathered body; wings flap fast while moving. */
            b(Part::Body, 0.0, 0.50, 0.0, 0.10, 0.09, 0.18, 1.0);
            b(Part::Head, 0.0, 0.60, -0.20, 0.06, 0.06, 0.07, 1.05);
            googly_eye(-0.032, 0.63, -0.26, 0.03);
            googly_eye(0.032, 0.63, -0.26, 0.03);
            acc_b(0.0, 0.58, -0.29, 0.02, 0.02, 0.04, 0.95, 0.65, 0.15); /* beak */
            let flap = if moving { (phase * 2.2).sin() * 0.9 } else { 0.25 };
            for side in [-1.0f32, 1.0] {
                sgl::push_matrix();
                sgl::translate(side * 0.10, 0.55, 0.0);
                sgl::rotate(side * flap, 0.0, 0.0, 1.0);
                sgl::translate(side * 0.14, 0.0, 0.0);
                draw_box(
                    0.0, 0.0, 0.0, 0.14, 0.02, 0.12, limb_uv, limb_uv,
                    tint[0], tint[1], tint[2], lit,
                );
                sgl::pop_matrix();
            }
        }
        AnimalKind::Fish => {
            /* Small scaled body at swim height, tail sculling. */
            b(Part::Body, 0.0, 0.50, 0.0, 0.09, 0.13, 0.26, 1.0);
            b(Part::Limb, 0.0, 0.68, 0.02, 0.02, 0.08, 0.10, 1.0); /* dorsal */
            googly_eye(-0.09, 0.55, -0.16, 0.07);
            googly_eye(0.09, 0.55, -0.16, 0.07);
            sgl::push_matrix();
            sgl::translate(0.0, 0.50, 0.28);
            sgl::rotate((phase * 1.6).sin() * 0.6, 0.0, 1.0, 0.0);
            draw_box(
                0.0, 0.0, 0.10, 0.02, 0.11, 0.10, limb_uv, limb_uv,
                tint[0], tint[1], tint[2], lit,
            );
            sgl::pop_matrix();
        }
        AnimalKind::LargeFish => {
            /* Deep-bodied reef fish: tall scaled flank, big dorsal,
             * pectoral fins, slow heavy tail scull. */
            b(Part::Body, 0.0, 0.55, 0.0, 0.13, 0.22, 0.38, 1.0);
            b(Part::Head, 0.0, 0.55, -0.42, 0.10, 0.16, 0.06, 1.0);
            b(Part::Limb, 0.0, 0.86, 0.04, 0.025, 0.12, 0.16, 1.0); /* dorsal */
            acc_b(-0.14, 0.50, -0.14, 0.06, 0.02, 0.09, 0.35, 0.55, 0.55); /* pectorals */
            acc_b(0.14, 0.50, -0.14, 0.06, 0.02, 0.09, 0.35, 0.55, 0.55);
            googly_eye(-0.11, 0.62, -0.36, 0.09);
            googly_eye(0.11, 0.62, -0.36, 0.09);
            sgl::push_matrix();
            sgl::translate(0.0, 0.55, 0.40);
            sgl::rotate((phase * 1.2).sin() * 0.5, 0.0, 1.0, 0.0);
            draw_box(
                0.0, 0.0, 0.14, 0.025, 0.18, 0.14, limb_uv, limb_uv,
                tint[0], tint[1], tint[2], lit,
            );
            sgl::pop_matrix();
        }
        AnimalKind::LongFish => {
            /* Eel: three chained segments undulating side to side, a
             * small banded head leading. */
            let s = |k: f32| {
                if moving { (phase * 2.0 + k).sin() * 0.10 } else { (k * 1.7).sin() * 0.03 }
            };
            b(Part::Head, s(0.0), 0.50, -0.42, 0.05, 0.07, 0.12, 1.05);
            googly_eye(s(0.0) - 0.06, 0.55, -0.46, 0.055);
            googly_eye(s(0.0) + 0.06, 0.55, -0.46, 0.055);
            b(Part::Body, s(1.2), 0.50, -0.14, 0.055, 0.08, 0.18, 1.0);
            b(Part::Body, s(2.4), 0.50, 0.20, 0.05, 0.07, 0.18, 0.95);
            b(Part::Limb, s(3.6), 0.50, 0.48, 0.035, 0.06, 0.14, 0.9); /* tail */
        }
        AnimalKind::FlatFish => {
            /* Ray: flat sandy disc, broad wing fins beating slowly,
             * whip tail. */
            b(Part::Body, 0.0, 0.45, 0.0, 0.15, 0.05, 0.28, 1.0);
            b(Part::Head, 0.0, 0.46, -0.30, 0.08, 0.04, 0.06, 1.0);
            /* Rays wear their eyes on TOP of the head - bulge upward. */
            googly_eye(-0.05, 0.52, -0.26, 0.05);
            googly_eye(0.05, 0.52, -0.26, 0.05);
            let beat = (phase * 0.9).sin() * 0.35;
            for side in [-1.0f32, 1.0] {
                sgl::push_matrix();
                sgl::translate(side * 0.14, 0.45, -0.02);
                sgl::rotate(side * beat, 0.0, 0.0, 1.0);
                sgl::translate(side * 0.16, 0.0, 0.0);
                draw_box(
                    0.0, 0.0, 0.0, 0.17, 0.02, 0.20, limb_uv, limb_uv,
                    tint[0], tint[1], tint[2], lit,
                );
                sgl::pop_matrix();
            }
            b(Part::Limb, 0.0, 0.45, 0.40, 0.015, 0.015, 0.16, 0.9); /* tail */
        }
        AnimalKind::Turtle => {
            /* Sea turtle: plated shell dome, leathery head + flippers
             * paddling front pair. */
            b(Part::Body, 0.0, 0.42, 0.02, 0.20, 0.09, 0.24, 1.0); /* shell base */
            b(Part::Body, 0.0, 0.54, 0.02, 0.14, 0.06, 0.17, 1.05); /* shell dome */
            b(Part::Head, 0.0, 0.40, -0.32, 0.06, 0.05, 0.08, 1.0);
            googly_eye(-0.05, 0.44, -0.37, 0.05);
            googly_eye(0.05, 0.44, -0.37, 0.05);
            let paddle = (phase * 0.9).sin() * 0.5;
            for (side, z, sw) in [
                (-1.0f32, -0.16, paddle),
                (1.0, -0.16, -paddle),
                (-1.0, 0.18, -paddle * 0.5),
                (1.0, 0.18, paddle * 0.5),
            ] {
                sgl::push_matrix();
                sgl::translate(side * 0.20, 0.38, z);
                sgl::rotate(side * (0.25 + sw * 0.3), 0.0, 0.0, 1.0);
                sgl::rotate(sw, 0.0, 1.0, 0.0);
                draw_box(
                    0.0, 0.0, 0.0, 0.11, 0.015, 0.06, limb_uv, limb_uv,
                    tint[0], tint[1], tint[2], lit,
                );
                sgl::pop_matrix();
            }
            b(Part::Limb, 0.0, 0.42, 0.28, 0.02, 0.02, 0.05, 0.9); /* tail nub */
        }
        AnimalKind::Frog => {
            /* Squat mottled body, bulging eyes, folded legs. */
            b(Part::Body, 0.0, 0.30, 0.0, 0.16, 0.13, 0.18, 1.0);
            googly_eye(-0.08, 0.50, -0.12, 0.055); /* bulging frog eyes */
            googly_eye(0.08, 0.50, -0.12, 0.055);
            b(Part::Limb, -0.16, 0.18, 0.10, 0.06, 0.09, 0.10, 1.0); /* haunches */
            b(Part::Limb, 0.16, 0.18, 0.10, 0.06, 0.09, 0.10, 1.0);
        }
        AnimalKind::Lizard => {
            /* Low scaled darter: flat body hugging the ground, long
             * tapering tail that whips side to side on the run. */
            b(Part::Body, 0.0, 0.16, 0.0, 0.11, 0.07, 0.24, 1.0);
            b(Part::Head, 0.0, 0.18, -0.30, 0.07, 0.05, 0.09, 1.05);
            googly_eye(-0.05, 0.24, -0.34, 0.032); /* lizard eyes */
            googly_eye(0.05, 0.24, -0.34, 0.032);
            sgl::push_matrix();
            sgl::translate(0.0, 0.14, 0.24);
            sgl::rotate(if moving { (phase * 1.8).sin() * 0.5 } else { 0.0 }, 0.0, 1.0, 0.0);
            draw_box(
                0.0, 0.0, 0.16, 0.035, 0.035, 0.18, limb_uv, limb_uv,
                tint[0], tint[1], tint[2], lit,
            );
            sgl::pop_matrix();
            for (x, z, sw) in
                [(-0.12, -0.14, swing), (0.12, 0.14, swing), (0.12, -0.14, -swing), (-0.12, 0.14, -swing)]
            {
                leg4(x, z, sw, 0.06, 1.0);
            }
        }
        AnimalKind::Penguin => {
            /* Black back / white belly, stubby flippers, orange beak +
             * feet; the whole body rocks as it waddles. */
            let waddle = if moving { (phase * 1.3).sin() * 0.18 } else { 0.0 };
            sgl::rotate(waddle, 0.0, 0.0, 1.0);
            b(Part::Body, 0.0, 0.55, 0.02, 0.17, 0.42, 0.15, 1.0); /* body */
            acc_b(0.0, 0.50, -0.12, 0.12, 0.30, 0.05, 0.93, 0.92, 0.90); /* belly */
            b(Part::Head, 0.0, 1.02, 0.0, 0.11, 0.10, 0.11, 1.0);
            googly_eye(-0.05, 1.05, -0.10, 0.038);
            googly_eye(0.05, 1.05, -0.10, 0.038);
            acc_b(0.0, 1.00, -0.14, 0.03, 0.025, 0.06, 0.95, 0.55, 0.10); /* beak */
            for side in [-1.0f32, 1.0] {
                sgl::push_matrix();
                sgl::translate(side * 0.19, 0.72, 0.02);
                sgl::rotate(side * (0.25 + waddle), 0.0, 0.0, 1.0);
                draw_box(
                    0.0, -0.14, 0.0, 0.03, 0.16, 0.10, limb_uv, limb_uv,
                    tint[0], tint[1], tint[2], lit,
                );
                sgl::pop_matrix();
            }
            acc_b(-0.07, 0.06, -0.04, 0.06, 0.06, 0.10, 0.95, 0.55, 0.10); /* feet */
            acc_b(0.07, 0.06, -0.04, 0.06, 0.06, 0.10, 0.95, 0.55, 0.10);
        }
        AnimalKind::SerpentFish => {
            /* Sea serpent: a chain of scaled coils sculling with a phase
             * wave down the spine, dorsal ridge fins, big-jawed head with
             * pale fangs. The ocean's trophy silhouette. */
            let wave = |k: f32| (phase * 1.4 - k * 0.9).sin() * if moving { 0.16 } else { 0.05 };
            for k in 0..5 {
                let z = -0.20 + k as f32 * 0.22;
                let x = wave(k as f32);
                let taper = 1.0 - k as f32 * 0.12;
                b(Part::Body, x, 0.52, z, 0.09 * taper, 0.12 * taper, 0.13, 1.0);
                b(Part::Limb, x, 0.68, z, 0.02, 0.07 * taper, 0.05, 1.0); /* ridge fin */
            }
            /* Tail fluke. */
            b(Part::Limb, wave(5.0), 0.52, 0.94, 0.02, 0.13, 0.09, 1.0);
            /* Head: broad jaw ahead of the first coil. */
            let hx = wave(-1.0);
            b(Part::Head, hx, 0.54, -0.38, 0.10, 0.10, 0.14, 1.05);
            googly_eye(hx - 0.08, 0.62, -0.44, 0.05);
            googly_eye(hx + 0.08, 0.62, -0.44, 0.05);
            acc_b(hx - 0.05, 0.45, -0.50, 0.015, 0.035, 0.015, 0.92, 0.94, 0.88); /* fangs */
            acc_b(hx + 0.05, 0.45, -0.50, 0.015, 0.035, 0.015, 0.92, 0.94, 0.88);
        }
        AnimalKind::Raptor => {
            /* Large bird of prey: broad slow wings, fanned tail, hooked
             * beak. Reads as a silhouette riding high. */
            b(Part::Body, 0.0, 0.55, 0.0, 0.14, 0.12, 0.26, 1.0);
            b(Part::Head, 0.0, 0.68, -0.28, 0.08, 0.08, 0.09, 1.05);
            googly_eye(-0.045, 0.72, -0.35, 0.035);
            googly_eye(0.045, 0.72, -0.35, 0.035);
            acc_b(0.0, 0.66, -0.39, 0.025, 0.02, 0.05, 0.95, 0.75, 0.20); /* beak bar */
            acc_b(0.0, 0.62, -0.42, 0.018, 0.025, 0.018, 0.90, 0.65, 0.15); /* hook tip */
            let flap = if moving { (phase * 1.2).sin() * 0.7 } else { 0.15 };
            for side in [-1.0f32, 1.0] {
                sgl::push_matrix();
                sgl::translate(side * 0.14, 0.62, 0.0);
                sgl::rotate(side * flap, 0.0, 0.0, 1.0);
                sgl::translate(side * 0.30, 0.0, 0.0);
                draw_box(
                    0.0, 0.0, 0.02, 0.30, 0.025, 0.16, limb_uv, limb_uv,
                    tint[0], tint[1], tint[2], lit,
                );
                sgl::pop_matrix();
            }
            /* Fanned tail feathers. */
            b(Part::Limb, 0.0, 0.53, 0.32, 0.11, 0.02, 0.12, 1.0);
        }
        AnimalKind::Crane => {
            /* Tall wader: stilt legs, oval body, S-neck up to a small
             * head with a long spear beak, folded wing slabs. */
            b(Part::Body, 0.0, 0.85, 0.04, 0.13, 0.13, 0.22, 1.0);
            for side in [-1.0f32, 1.0] {
                b(Part::Limb, side * 0.13, 0.88, 0.02, 0.015, 0.10, 0.18, 1.0); /* folded wing */
            }
            /* Neck: up and forward. */
            b(Part::Body, 0.0, 1.10, -0.16, 0.035, 0.16, 0.04, 1.05);
            b(Part::Head, 0.0, 1.28, -0.20, 0.055, 0.055, 0.07, 1.05);
            googly_eye(-0.035, 1.31, -0.25, 0.028);
            googly_eye(0.035, 1.31, -0.25, 0.028);
            acc_b(0.0, 1.27, -0.34, 0.012, 0.012, 0.09, 0.95, 0.65, 0.15); /* spear beak */
            /* Stilt legs (long, slow stride). */
            for (x, sw) in [(-0.06f32, swing), (0.06, -swing)] {
                leg4(x, 0.02, sw * 0.6, 0.36, 1.0);
            }
        }
        AnimalKind::Sparkit => {
            /* Mascot biped: big head, tall dark-tipped ears, teal cheek
             * sparks, stubby swinging arms, and a thin tail carrying a
             * glowing star tip. Bounces as it moves. */
            let bounce = if moving { (phase * 2.0).sin().abs() * 0.05 } else { 0.0 };
            sgl::translate(0.0, bounce, 0.0);
            b(Part::Body, 0.0, 0.38, 0.0, 0.13, 0.15, 0.11, 1.0);
            acc_b(0.0, 0.34, -0.10, 0.08, 0.09, 0.02, 0.98, 0.92, 0.72); /* cream belly */
            /* THICC neck: a wide column bridging body and head, so the big
             * mascot head doesn't perch on a scrawny stalk. */
            b(Part::Body, 0.0, 0.555, 0.0, 0.12, 0.08, 0.105, 1.0);
            b(Part::Head, 0.0, 0.72, 0.0, 0.16, 0.14, 0.14, 1.05);
            googly_eye(-0.07, 0.76, -0.13, 0.045);
            googly_eye(0.07, 0.76, -0.13, 0.045);
            /* Teal spark spots on the cheeks. */
            acc_b(-0.14, 0.68, -0.10, 0.025, 0.025, 0.02, 0.20, 0.85, 0.80);
            acc_b(0.14, 0.68, -0.10, 0.025, 0.025, 0.02, 0.20, 0.85, 0.80);
            /* Tall ears, dark tips. */
            for side in [-1.0f32, 1.0] {
                b(Part::Body, side * 0.09, 0.94, 0.0, 0.03, 0.10, 0.03, 1.0);
                acc_b(side * 0.09, 1.06, 0.0, 0.032, 0.035, 0.032, 0.22, 0.20, 0.24);
            }
            /* Stubby arms swing opposite the legs. */
            for (side, sw) in [(-1.0f32, swing), (1.0, -swing)] {
                sgl::push_matrix();
                sgl::translate(side * 0.15, 0.46, 0.0);
                sgl::rotate(sw * 0.8, 1.0, 0.0, 0.0);
                draw_box(
                    0.0, -0.06, 0.0, 0.03, 0.07, 0.03, limb_uv, limb_uv,
                    tint[0], tint[1], tint[2], lit,
                );
                sgl::pop_matrix();
            }
            for (x, sw) in [(-0.06f32, swing), (0.06, -swing)] {
                leg4(x, 0.0, sw, 0.11, 1.0);
            }
            /* Tail: thin rise with a glowing star-tip sphere. */
            b(Part::Limb, 0.0, 0.50, 0.16, 0.02, 0.10, 0.02, 1.0);
            sphere(0.0, 0.64, 0.16, 0.05, 1.0, 0.95, 0.45); /* glow tip */
        }
        AnimalKind::Shellkin => {
            /* Mascot biped: sage-skinned walker carrying a plated shell
             * dome, cream plastron up front, unhurried waddle. */
            let waddle = if moving { (phase * 1.1).sin() * 0.14 } else { 0.0 };
            sgl::rotate(waddle, 0.0, 0.0, 1.0);
            /* Shell rides the back (Part::Body carries the plate grid). */
            b(Part::Body, 0.0, 0.46, 0.10, 0.15, 0.16, 0.09, 1.0);
            b(Part::Body, 0.0, 0.46, 0.16, 0.11, 0.12, 0.05, 1.05); /* dome bulge */
            acc_b(0.0, 0.42, -0.06, 0.11, 0.13, 0.03, 0.94, 0.88, 0.66); /* plastron */
            b(Part::Head, 0.0, 0.74, -0.04, 0.10, 0.09, 0.10, 1.05);
            googly_eye(-0.05, 0.77, -0.13, 0.04);
            googly_eye(0.05, 0.77, -0.13, 0.04);
            /* Stubby arms. */
            for (side, sw) in [(-1.0f32, swing), (1.0, -swing)] {
                sgl::push_matrix();
                sgl::translate(side * 0.16, 0.50, -0.02);
                sgl::rotate(sw * 0.6, 1.0, 0.0, 0.0);
                draw_box(
                    0.0, -0.06, 0.0, 0.035, 0.07, 0.035, limb_uv, limb_uv,
                    tint[0], tint[1], tint[2], lit,
                );
                sgl::pop_matrix();
            }
            for (x, sw) in [(-0.07f32, swing), (0.07, -swing)] {
                leg4(x, 0.0, sw * 0.6, 0.13, 1.0);
            }
            b(Part::Limb, 0.0, 0.36, 0.24, 0.025, 0.025, 0.04, 0.9); /* tail nub */
        }
        _ => {
            /* Critter / stalker: the classic dog silhouette, wearing
             * its species fur tile (stalkers get the dark red-flecked
             * column - no more flat tint). */
            b(Part::Body, 0.0, 0.46, 0.0, 0.16, 0.13, 0.30, 1.0);
            b(Part::Head, 0.0, 0.52, -0.36, 0.12, 0.11, 0.11, 1.05);
            googly_eye(-0.06, 0.56, -0.46, 0.045);
            googly_eye(0.06, 0.56, -0.46, 0.045);
            b(Part::Limb, -0.07, 0.66, -0.36, 0.03, 0.05, 0.02, 1.0); /* ears */
            b(Part::Limb, 0.07, 0.66, -0.36, 0.03, 0.05, 0.02, 1.0);
            b(Part::Limb, 0.0, 0.5, 0.34, 0.03, 0.03, 0.08, 1.0); /* tail */
            for (x, z, sw) in
                [(-0.11, -0.22, swing), (0.11, 0.22, swing), (0.11, -0.22, -swing), (-0.11, 0.22, -swing)]
            {
                leg4(x, z, sw, 0.17, 1.0);
            }
        }
    }

    sgl::pop_matrix();
}

/// Draw every animal + lingering corpse. Called in the offscreen opaque
/// pass next to torches. `time_s` drives the idle clip (the fauna sim
/// only advances `anim_phase` while moving).
/// The brightest per-source reach any light can have, as a multiple of
/// `LIGHT_RANGE_M`. A torch is 1.0; a bonfire publishes 2.0. Used as the
/// gather radius: past this nothing can reach the entity, so it bounds how
/// far an animal ever has to look.
const MAX_LIGHT_REACH_SCALE: f32 = 2.0;

/// Every light that can reach `body_local` - a few blocks around the
/// entity, never a world-wide scan. Backed by the torch spatial grid, so
/// the cost tracks LOCAL light density rather than the planet's total.
fn lights_reaching(body_local: Vec3) -> Vec<crate::torch::Torch> {
    crate::torch::lights_near(body_local, crate::torch::LIGHT_RANGE_M * MAX_LIGHT_REACH_SCALE)
}

/// Entity light level: day/night sun brightness lifted by nearby torches
/// and bonfires, through the same falloff and the same
/// `lighting.yaml torch_intensity` knob as the terrain - so an animal and
/// the ground it stands on warm up together.
///
/// `pos` is absolute; `center` is the body's centre. Both are needed
/// because lights are stored BODY-LOCAL (see `torch::Torch::position`) -
/// comparing an absolute entity position against them only happens to line
/// up on a body sitting at the world origin.
fn entity_lit(pos: DVec3, center: DVec3) -> f32 {
    let sun = renderer::entity_sun_brightness(pos);
    let local = tenebris_core::math::dvec3_to_vec3(dvec3_sub(pos, center));
    let torch = crate::hex_mesher::torch_light_from(&lights_reaching(local), local);
    let l = tenebris_core::config::lighting();
    (sun + torch * l.torch_intensity).min(1.5)
}

pub fn draw(view: Mat4, proj: Mat4, _time_s: f32) {
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

    /* Every living animal draws its textured procedural body - the
     * atlas (assets/textures/animals.png) provides properly unwrapped
     * fur / feathers / scales per species; box faces carry real UVs. */
    sgl::enable_texture();
    sgl::texture(
        sokol::gfx::View { id: renderer::animal_view_id() },
        sokol::gfx::Sampler { id: renderer::animal_sampler_id() },
    );
    let set = model_set();
    for a in &list {
        let up = dvec3_normalize(dvec3_sub(a.pos, center));
        /* Day/night: critters darken with the world (task: animals were
         * fullbright at night), and warm back up next to a fire. */
        let lit = entity_lit(a.pos, center);
        /* Steps and falls are real movement now (fauna::reseat), so the
         * sim pos IS the render pos - jumps and drops just play out. */
        let draw_pos = a.pos;
        /* Tint: a fresh hit blinks the model red (alternating so it
         * reads as a flash). Stalkers no longer need a flat dark tint -
         * their atlas column carries the shadow palette. */
        let blink_on = a.hurt_t > 0.0 && ((a.hurt_t * 8.0) as i32) % 2 == 0;
        let tint = if blink_on { HURT_TINT } else { [1.0, 1.0, 1.0] };
        draw_kind(
            a.kind,
            draw_pos,
            up,
            a.heading,
            a.anim_phase,
            a.state != AnimalState::Idle,
            lit,
            tint,
        );
    }
    sgl::disable_texture();

    /* Corpses play the baked death clip, then hold its final frame (the
     * sampler clamps a non-looping clip past its end). Fallback build:
     * no clip to play, so corpses simply don't draw. */
    if let Some(set) = &set {
        for corpse in &corpses {
            let up = dvec3_normalize(dvec3_sub(corpse.pos, center));
            let lit = entity_lit(corpse.pos, center);
            let basis = orient_basis(up, corpse.heading);
            sgl::push_matrix();
            crate::renderer::sgl_translate_scene(corpse.pos);
            sgl::mult_matrix(&basis[0]);
            let sc = corpse.kind.scale();
            sgl::scale(sc, sc, sc);
            baked_model::draw(&set.model, Some((&set.death, corpse.age)), lit);
            sgl::pop_matrix();
        }
    }
    renderer::sgl_world_end();
    /* No sgl_draw here - the world context flushes in
     * compose_to_swapchain, inside the offscreen pass. */
}

#[cfg(test)]
mod tests {
    use super::*;
    use tenebris_core::planet::{self, BodyId};
    use tenebris_core::world_time;

    fn stalker_count() -> usize {
        S.with(|c| {
            c.borrow().list.iter().filter(|a| a.kind == AnimalKind::Stalker).count()
        })
    }

    #[test]
    fn stalkers_spawn_at_night_and_burn_off_at_dawn() {
        let body = planet::get(BodyId::Tenebris);
        let mut w = World::create(&body, 3);
        while !w.gen_complete() {
            w.stream_gen(4096);
        }
        let pos = fauna::floor_pos(&w, dvec3_make(1.0, 0.0, 0.0), 300.0, -1)
            .expect("surface under the test player");
        let mut p = PlayerCtrl::default();
        p.position = pos;
        p.basis.up = dvec3_make(1.0, 0.0, 0.0);

        /* Find one night and one day sim-time at this longitude (the
         * sun swings with the body's spin, so scan forward). */
        let mut t_night = None;
        let mut t_day = None;
        let mut t = 0.0f64;
        while (t_night.is_none() || t_day.is_none()) && t < 1.0e6 {
            if fauna::is_night(&w, pos, t) {
                t_night.get_or_insert(t);
            } else {
                t_day.get_or_insert(t);
            }
            t += 7.0;
        }
        let (tn, td) = (t_night.expect("night exists"), t_day.expect("day exists"));

        init();
        world_time::set_seconds(tn);
        /* ~60 s of night at 2 Hz ticks: the prowl cadence (one attempt
         * per 4 s) has plenty of room to seat a few stalkers. */
        for _ in 0..120 {
            update(0.5, &w, &mut p);
        }
        assert!(stalker_count() > 0, "night spawned stalkers");

        /* Dawn: the cull retains no stalkers on the first update. */
        world_time::set_seconds(td);
        update(0.5, &w, &mut p);
        assert_eq!(stalker_count(), 0, "dawn burns the stalkers off");

        init();
        world_time::set_seconds(0.0);
    }
}
