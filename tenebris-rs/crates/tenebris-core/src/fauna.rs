//! Animals - the fauna. Passive critters you can hunt for meat, and the
//! hostile stalkers that come out at night.
//!
//! This module is the pure, shared SIM (SP/MP identical, testable): one
//! `Animal`'s position + health + a tiny wander/flee/chase state machine.
//! It is deliberately planet-agnostic - movement happens in the tangent
//! plane of a surface `up` vector the caller passes in, so `tick` never
//! needs to know about spheres or terrain. The surface glue that DOES
//! need the world - ring-spawning near a player and stepping / falling
//! against the walkable floor - lives here too ([`spawn_near`] /
//! [`reseat`]) so the SP client and the MP server drive the exact same
//! herd behaviour. The client keeps the rendering + the attack raycast
//! that calls `hit`; the server owns MP authority (see server.rs
//! animal_sim).
//!
//! Step traversal is real movement, not a snap: a floor rise ahead
//! BLOCKS the walk (no clipping into the step face), the animal stops
//! for a beat, then launches a jump arc that clears the ledge. A floor
//! drop doesn't teleport it down - the animal walks its feet off the
//! edge and gravity brings it to the lower step.

use crate::math::{
    dvec3_add, dvec3_cross, dvec3_dot, dvec3_length, dvec3_normalize, dvec3_scale, dvec3_sub, DVec3,
};
use crate::rng;
use crate::world::World;
use std::f64::consts::TAU;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AnimalKind {
    /// Passive quadruped, hunted for meat.
    Critter,
    /// Night-spawned hostile: chases players, lunges on contact, gone
    /// by day.
    Stalker,
}

impl AnimalKind {
    /// Stable wire byte (packed into the AnimalState entry's state
    /// byte's high nibble - append only, never renumber).
    pub fn to_u8(self) -> u8 {
        match self {
            AnimalKind::Critter => 0,
            AnimalKind::Stalker => 1,
        }
    }

    pub fn from_u8(v: u8) -> AnimalKind {
        match v {
            1 => AnimalKind::Stalker,
            _ => AnimalKind::Critter,
        }
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AnimalState {
    /// Standing still, grazing.
    Idle,
    /// Ambling in `heading`.
    Walk,
    /// Sprinting away from a threat.
    Flee,
    /// Killed - the client turns it into a meat drop and removes it.
    Dead,
    /// Stalker only: sprinting TOWARD a player.
    Chase,
}

/// One animal. `heading` is a unit vector in the local tangent plane;
/// `anim_phase` accumulates for the walk cycle.
#[derive(Clone, Copy, Debug)]
pub struct Animal {
    pub id: u32,
    pub kind: AnimalKind,
    pub pos: DVec3,
    pub heading: DVec3,
    pub health: f32,
    pub state: AnimalState,
    pub timer: f32,
    pub anim_phase: f32,
    /* Step traversal (see `reseat`): a rise ahead blocks the walk and
     * arms a jump (pause, then launch); a drop starts a gravity fall. */
    /// True while off the ground (jumping up a step / falling off one).
    pub airborne: bool,
    /// Radial (local up) velocity while airborne, m/s.
    pub radial_v: f64,
    /// "Stop before you jump" beat: no horizontal movement while > 0.
    pub jump_pause_t: f32,
    /// Height of the step waiting to be jumped (0 = none armed).
    pub jump_dr: f64,
    /// Red hit-flash timer (client blinks the model while > 0).
    pub hurt_t: f32,
    /// Stalker lunge cooldown so contact damage ticks, not streams.
    pub attack_cd: f32,
}

/// Full health of a fresh critter.
pub const MAX_HEALTH: f32 = 12.0;

/* Tunables (seconds / metres-per-second / radians). Small enough to keep
 * inline for now; promote to a fauna.yaml if a designer needs to turn
 * them. */
const WALK_SPEED: f64 = 1.4;
const FLEE_SPEED: f64 = 4.8;
const CHASE_SPEED: f64 = 3.4;
const IDLE_TIME: f32 = 1.8;
const WALK_TIME: f32 = 2.4;
const FLEE_TIME: f32 = 4.0;
const TURN_JITTER: f64 = 0.9;
/// Floor rises taller than this are cliffs, not climbable steps - the
/// walk stays blocked (the animal turns away on its next wander pick).
const STEP_MAX_M: f64 = 2.5;
/// Floor deltas under this snap silently (gentle slopes / mesh noise).
const STEP_EPS_M: f64 = 0.25;
/// The "stop, then jump" beat before launching up a step.
const JUMP_PAUSE_S: f32 = 0.22;
/// Extra apex clearance above the step lip, metres.
const JUMP_CLEAR_M: f64 = 0.20;
/// Radial gravity for the jump/fall arcs, m/s^2.
const GRAVITY_MPS2: f64 = 16.0;
/// Horizontal speed factor while airborne (carries the arc forward).
const AIR_CONTROL: f64 = 0.75;
/// Seconds the red hit flash lasts.
pub const HURT_FLASH_S: f32 = 0.45;
/// Stalker aggro / lunge ranges + cadence.
pub const AGGRO_M: f64 = 14.0;
pub const CONTACT_M: f64 = 1.15;
pub const ATTACK_CD_S: f32 = 1.2;
/// Hunger a stalker lunge costs the player (survival).
pub const STALKER_HIT_HUNGER: f32 = 6.0;
/// Knockback impulse a lunge gives the player, m/s.
pub const STALKER_KNOCKBACK_MPS: f64 = 6.5;

impl Animal {
    pub fn new(id: u32, pos: DVec3, up: DVec3) -> Self {
        Self::new_kind(id, pos, up, AnimalKind::Critter)
    }

    pub fn new_kind(id: u32, pos: DVec3, up: DVec3, kind: AnimalKind) -> Self {
        let heading = seed_tangent(up, id);
        Animal {
            id,
            kind,
            pos,
            heading,
            health: MAX_HEALTH,
            state: AnimalState::Walk,
            timer: WALK_TIME,
            anim_phase: 0.0,
            airborne: false,
            radial_v: 0.0,
            jump_pause_t: 0.0,
            jump_dr: 0.0,
            hurt_t: 0.0,
            attack_cd: 0.0,
        }
    }

    pub fn is_alive(&self) -> bool {
        self.state != AnimalState::Dead
    }

    /// True while the legs should be swinging (walking / fleeing /
    /// chasing / airborne).
    pub fn is_moving(&self) -> bool {
        self.airborne
            || matches!(self.state, AnimalState::Walk | AnimalState::Flee | AnimalState::Chase)
    }
}

/// Deterministic uniform in [0,1) from an animal id + tick salt.
fn rand01(id: u32, salt: u32) -> f32 {
    rng::hash2(id.wrapping_mul(2654435761).wrapping_add(salt) as i32, salt as i32)
}

/// An orthonormal (tangent, bitangent) basis for the plane perpendicular
/// to `up`.
fn tangent_basis(up: DVec3) -> (DVec3, DVec3) {
    let up = dvec3_normalize(up);
    let reference = if up.y.abs() < 0.9 {
        DVec3 { x: 0.0, y: 1.0, z: 0.0 }
    } else {
        DVec3 { x: 1.0, y: 0.0, z: 0.0 }
    };
    let t = dvec3_normalize(dvec3_cross(reference, up));
    let b = dvec3_cross(up, t);
    (t, b)
}

/// A stable-per-id unit heading in the tangent plane.
fn seed_tangent(up: DVec3, id: u32) -> DVec3 {
    let (t, b) = tangent_basis(up);
    let a = rand01(id, 101) as f64 * TAU;
    dvec3_normalize(dvec3_add(dvec3_scale(t, a.cos()), dvec3_scale(b, a.sin())))
}

/// Project `v` into the tangent plane of `up` and normalise (falls back to
/// a stable tangent if `v` is parallel to `up`).
fn reproject_tangent(v: DVec3, up: DVec3) -> DVec3 {
    let up = dvec3_normalize(up);
    let flat = dvec3_sub(v, dvec3_scale(up, dvec3_dot(v, up)));
    if dvec3_length(flat) > 1e-9 {
        dvec3_normalize(flat)
    } else {
        tangent_basis(up).0
    }
}

/// Rotate a tangent-plane unit vector about `up` by `angle`. Since
/// `h ⟂ up`, Rodrigues collapses to an in-plane rotation.
fn rotate_about_up(h: DVec3, up: DVec3, angle: f64) -> DVec3 {
    let (s, c) = angle.sin_cos();
    dvec3_normalize(dvec3_add(dvec3_scale(h, c), dvec3_scale(dvec3_cross(up, h), s)))
}

fn jitter_heading(h: DVec3, up: DVec3, id: u32, salt: u32) -> DVec3 {
    let a = (rand01(id, salt) as f64 - 0.5) * 2.0 * TURN_JITTER;
    rotate_about_up(h, up, a)
}

/// Ground speed for the current state, m/s.
fn state_speed(a: &Animal) -> f64 {
    match a.state {
        AnimalState::Walk => WALK_SPEED,
        AnimalState::Flee => FLEE_SPEED,
        AnimalState::Chase => CHASE_SPEED,
        _ => 0.0,
    }
}

/// Advance one animal by `dt`. `up` is the surface normal at its position;
/// `tick_salt` varies the wander RNG over time. Moves `pos` along the
/// tangent plane; the caller runs [`reseat`] after to resolve steps /
/// falls against the real floor.
pub fn tick(a: &mut Animal, up: DVec3, dt: f32, tick_salt: u32) {
    tick_with_target(a, up, dt, tick_salt, None)
}

/// [`tick`] plus an optional chase target (the nearest player). Only
/// stalkers act on it: inside [`AGGRO_M`] they lock heading onto the
/// target and sprint; outside it they fall back to the wander machine.
pub fn tick_with_target(
    a: &mut Animal,
    up: DVec3,
    dt: f32,
    tick_salt: u32,
    target: Option<DVec3>,
) {
    if a.state == AnimalState::Dead {
        return;
    }
    let up = dvec3_normalize(up);
    a.heading = reproject_tangent(a.heading, up);
    a.timer -= dt;
    if a.hurt_t > 0.0 {
        a.hurt_t = (a.hurt_t - dt).max(0.0);
    }
    if a.attack_cd > 0.0 {
        a.attack_cd = (a.attack_cd - dt).max(0.0);
    }

    /* Stalker aggro: lock on / drop off by range. */
    if a.kind == AnimalKind::Stalker && a.state != AnimalState::Flee {
        match target {
            Some(t) if dvec3_length(dvec3_sub(t, a.pos)) < AGGRO_M => {
                a.state = AnimalState::Chase;
                a.heading = reproject_tangent(dvec3_sub(t, a.pos), up);
            }
            _ => {
                if a.state == AnimalState::Chase {
                    a.state = AnimalState::Walk;
                    a.timer = WALK_TIME;
                }
            }
        }
    }

    /* The "stop before you jump" beat: stand still, then launch. */
    if a.jump_pause_t > 0.0 {
        a.jump_pause_t -= dt;
        if a.jump_pause_t <= 0.0 && a.jump_dr > 0.0 {
            a.airborne = true;
            a.radial_v = (2.0 * GRAVITY_MPS2 * (a.jump_dr + JUMP_CLEAR_M)).sqrt();
            a.jump_dr = 0.0;
        }
        return; /* feet planted this frame */
    }

    match a.state {
        AnimalState::Idle => {
            if a.timer <= 0.0 {
                a.state = AnimalState::Walk;
                a.timer = WALK_TIME + rand01(a.id, tick_salt) * 2.0;
                a.heading = jitter_heading(a.heading, up, a.id, tick_salt);
            }
        }
        AnimalState::Walk | AnimalState::Flee | AnimalState::Chase => {
            if a.state == AnimalState::Walk && a.timer <= 0.0 {
                if rand01(a.id, tick_salt.wrapping_add(7)) < 0.4 {
                    a.state = AnimalState::Idle;
                    a.timer = IDLE_TIME + rand01(a.id, tick_salt) * 2.0;
                } else {
                    a.heading = jitter_heading(a.heading, up, a.id, tick_salt);
                    a.timer = WALK_TIME + rand01(a.id, tick_salt) * 2.0;
                }
            }
            if a.state == AnimalState::Flee && a.timer <= 0.0 {
                a.state = AnimalState::Walk;
                a.timer = WALK_TIME;
            }
            let mut speed = state_speed(a);
            if a.airborne {
                speed *= AIR_CONTROL; /* the arc carries it forward */
            }
            a.pos = dvec3_add(a.pos, dvec3_scale(a.heading, speed * dt as f64));
            a.anim_phase += dt * if a.state == AnimalState::Walk { 8.0 } else { 16.0 };
        }
        AnimalState::Dead => {}
    }
}

/// Apply `dmg` from world point `from`. Starts the red hit flash; the
/// animal bolts directly away (in the tangent plane) unless the hit
/// kills it. Stalkers don't flee - they keep coming.
pub fn hit(a: &mut Animal, dmg: f32, from: DVec3, up: DVec3) {
    if a.state == AnimalState::Dead {
        return;
    }
    a.health -= dmg;
    a.hurt_t = HURT_FLASH_S;
    if a.health <= 0.0 {
        a.health = 0.0;
        a.state = AnimalState::Dead;
        return;
    }
    if a.kind == AnimalKind::Stalker {
        return; /* undeterred */
    }
    let away = dvec3_sub(a.pos, from);
    a.heading = reproject_tangent(away, up);
    a.state = AnimalState::Flee;
    a.timer = FLEE_TIME;
}

/// Sun-dot (surface normal . sun direction) below which a point on the
/// surface reads as night - just past the terminator band the renderer
/// uses for entity brightness, so stalkers appear as the light dies.
pub const NIGHT_SUN_DOT: f64 = -0.06;

/// True when it is locally night at `pos` on `w`'s body at sim time `t`
/// (`world_time::seconds()` on the SP client, the server's sim clock in
/// MP - both feed the same orbital sun).
pub fn is_night(w: &World, pos: DVec3, t: f64) -> bool {
    let center = DVec3 { x: w.body.pos_x, y: w.body.pos_y, z: w.body.pos_z };
    let rel = dvec3_sub(pos, center);
    if dvec3_length(rel) < 1e-6 {
        return false;
    }
    let dir = dvec3_normalize(rel);
    dvec3_dot(dir, crate::orbit::sun_direction(w.body.id, t)) < NIGHT_SUN_DOT
}

/* ------------------------------------------------------------------ */
/* Surface glue - shared by the SP client (animals.rs) and the MP
 * server so both drive identical herds.                               */

/// Body-height headroom passed to the walkable-floor query.
pub const BODY_HEIGHT_M: f64 = 1.0;
/// Ring (metres from the anchor player) new animals appear in.
pub const SPAWN_MIN_M: f64 = 14.0;
pub const SPAWN_MAX_M: f64 = 32.0;

/// Snap a body-local direction onto the walkable floor and return the
/// feet position in world space, or `None` if the tile has no floor.
pub fn floor_pos(w: &World, dir: DVec3, radius_hint: f64, hint_tile: i32) -> Option<DVec3> {
    let center = DVec3 { x: w.body.pos_x, y: w.body.pos_y, z: w.body.pos_z };
    let dir = dvec3_normalize(dir);
    let tile = w.grid.find_tile(dir, hint_tile);
    let floor = w.walkable_floor_near(tile, radius_hint, BODY_HEIGHT_M);
    if floor <= 0.0 {
        return None;
    }
    Some(dvec3_add(center, dvec3_scale(dir, floor)))
}

/// Try to spawn one animal on the ground in the ring around
/// `anchor_world` (a player position on `w`'s body). Deterministic in
/// `(id, salt)`.
pub fn spawn_near(w: &World, anchor_world: DVec3, id: u32, salt: u32) -> Option<Animal> {
    spawn_near_kind(w, anchor_world, id, salt, AnimalKind::Critter)
}

/// [`spawn_near`] with an explicit kind (stalkers use the same ring).
pub fn spawn_near_kind(
    w: &World,
    anchor_world: DVec3,
    id: u32,
    salt: u32,
    kind: AnimalKind,
) -> Option<Animal> {
    let center = DVec3 { x: w.body.pos_x, y: w.body.pos_y, z: w.body.pos_z };
    let local = dvec3_sub(anchor_world, center);
    let r = dvec3_length(local);
    if r < 1.0 {
        return None;
    }
    let dir0 = dvec3_scale(local, 1.0 / r);
    /* A tangent basis around the anchor's radial, to place off to the
     * side. */
    let reference = if dir0.y.abs() < 0.9 {
        DVec3 { x: 0.0, y: 1.0, z: 0.0 }
    } else {
        DVec3 { x: 1.0, y: 0.0, z: 0.0 }
    };
    let t = dvec3_normalize(dvec3_cross(reference, dir0));
    let b = dvec3_cross(dir0, t);
    let ang = rand01(id, salt) as f64 * TAU;
    let dist = SPAWN_MIN_M + rand01(id, salt.wrapping_add(11)) as f64 * (SPAWN_MAX_M - SPAWN_MIN_M);
    let offset = dvec3_add(dvec3_scale(t, ang.cos() * dist), dvec3_scale(b, ang.sin() * dist));
    let point = dvec3_add(local, offset);
    let dir = dvec3_normalize(point);
    let pos = floor_pos(w, dir, r, -1)?;
    Some(Animal::new_kind(id, pos, dir, kind))
}

/// Resolve the animal against the walkable floor after a tick moved it.
///
/// Grounded rules:
/// - Gentle floor delta (|dr| < [`STEP_EPS_M`]) -> feet snap to the
///   floor (slope following).
/// - Floor RISES ahead -> the move is BLOCKED: the horizontal advance
///   this frame is undone (the collider never clips into the step
///   face), and a jump is armed - the animal stops for
///   [`JUMP_PAUSE_S`], then `tick` launches an arc that clears the lip.
/// - Floor DROPS away -> nothing snaps down; the animal has walked its
///   feet off the edge, goes airborne with zero radial speed, and
///   gravity carries it to the lower step.
///
/// Airborne: integrate radial velocity under gravity; land (feet snap,
/// airborne clears) when descending onto the floor.
pub fn reseat(w: &World, a: &mut Animal, dt: f32) {
    let center = DVec3 { x: w.body.pos_x, y: w.body.pos_y, z: w.body.pos_z };
    let rel = dvec3_sub(a.pos, center);
    let r = dvec3_length(rel);
    if r < 1e-6 {
        return;
    }
    let dir = dvec3_scale(rel, 1.0 / r);

    if a.airborne {
        a.radial_v -= GRAVITY_MPS2 * dt as f64;
        let new_r = r + a.radial_v * dt as f64;
        let floor_r = floor_pos(w, dir, r, -1)
            .map(|p| dvec3_length(dvec3_sub(p, center)))
            .unwrap_or(0.0);
        if a.radial_v <= 0.0 && floor_r > 0.0 && new_r <= floor_r {
            /* Touch down. */
            a.airborne = false;
            a.radial_v = 0.0;
            a.jump_dr = 0.0;
            a.pos = dvec3_add(center, dvec3_scale(dir, floor_r));
        } else {
            a.pos = dvec3_add(center, dvec3_scale(dir, new_r));
        }
        return;
    }

    let Some(seated) = floor_pos(w, dir, r, -1) else {
        return;
    };
    let floor_r = dvec3_length(dvec3_sub(seated, center));
    let dr = floor_r - r;

    if dr > STEP_EPS_M {
        /* Step (or cliff) ahead: undo this frame's horizontal advance so
         * the collider stays out of the step face... */
        let speed = state_speed(a);
        let back = dvec3_sub(a.pos, dvec3_scale(a.heading, speed * dt as f64));
        /* ...and re-seat the reverted feet on the floor they came from. */
        let back_rel = dvec3_sub(back, center);
        a.pos = match floor_pos(w, back_rel, r, -1) {
            Some(p) => p,
            None => back,
        };
        /* Climbable? Arm the stop-then-jump (tick launches it). Taller
         * rises stay blocked - the wander machine turns away later. */
        if dr < STEP_MAX_M && a.jump_pause_t <= 0.0 && a.jump_dr <= 0.0 && a.is_moving() {
            a.jump_pause_t = JUMP_PAUSE_S;
            a.jump_dr = dr;
        }
    } else if dr < -STEP_EPS_M {
        /* Walked off an edge: fall from rest, keep the forward carry. */
        a.airborne = true;
        a.radial_v = 0.0;
    } else {
        /* Gentle slope: hug the terrain. */
        a.pos = seated;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn up() -> DVec3 {
        DVec3 { x: 0.0, y: 1.0, z: 0.0 }
    }

    #[test]
    fn new_animal_is_full_health_and_tangent() {
        let a = Animal::new(3, DVec3 { x: 5.0, y: 0.0, z: 2.0 }, up());
        assert_eq!(a.health, MAX_HEALTH);
        assert!(a.is_alive());
        // heading lies in the tangent plane (perp to up).
        assert!(dvec3_dot(a.heading, up()).abs() < 1e-9);
        assert!((dvec3_length(a.heading) - 1.0).abs() < 1e-6);
    }

    #[test]
    fn walk_moves_in_the_tangent_plane() {
        let mut a = Animal::new(1, DVec3 { x: 0.0, y: 0.0, z: 0.0 }, up());
        a.state = AnimalState::Walk;
        a.timer = 10.0;
        let before = a.pos;
        tick(&mut a, up(), 0.5, 0);
        let moved = dvec3_sub(a.pos, before);
        assert!(dvec3_length(moved) > 0.0);
        // stayed in the plane (no vertical drift).
        assert!(dvec3_dot(moved, up()).abs() < 1e-9);
    }

    #[test]
    fn hit_makes_it_flee_away_flash_red_then_die() {
        let mut a = Animal::new(2, DVec3 { x: 0.0, y: 0.0, z: 0.0 }, up());
        let threat = DVec3 { x: -3.0, y: 0.0, z: 0.0 }; // to the -x
        hit(&mut a, 4.0, threat, up());
        assert_eq!(a.state, AnimalState::Flee);
        assert_eq!(a.hurt_t, HURT_FLASH_S, "hit starts the red flash");
        // runs away from the threat: +x component.
        assert!(a.heading.x > 0.0, "heading {:?}", a.heading);
        // the flash decays as it ticks.
        tick(&mut a, up(), 0.2, 3);
        assert!(a.hurt_t < HURT_FLASH_S && a.hurt_t > 0.0);
        // enough damage kills it.
        hit(&mut a, MAX_HEALTH, threat, up());
        assert_eq!(a.state, AnimalState::Dead);
        assert!(!a.is_alive());
    }

    #[test]
    fn dead_animals_dont_tick() {
        let mut a = Animal::new(9, DVec3 { x: 1.0, y: 0.0, z: 0.0 }, up());
        a.state = AnimalState::Dead;
        let before = a.pos;
        tick(&mut a, up(), 1.0, 5);
        assert_eq!(a.pos, before);
    }

    #[test]
    fn jump_pause_plants_feet_then_launches() {
        let mut a = Animal::new(4, DVec3 { x: 0.0, y: 0.0, z: 0.0 }, up());
        a.state = AnimalState::Walk;
        a.timer = 10.0;
        // Arm a 0.8 m step the way reseat would.
        a.jump_pause_t = JUMP_PAUSE_S;
        a.jump_dr = 0.8;
        let before = a.pos;
        // During the pause: feet planted, no horizontal movement.
        tick(&mut a, up(), JUMP_PAUSE_S * 0.5, 0);
        assert_eq!(a.pos, before, "paused animal must not advance");
        assert!(!a.airborne);
        // Pause expires -> the jump launches with enough speed to clear.
        tick(&mut a, up(), JUMP_PAUSE_S, 0);
        assert!(a.airborne, "jump launched");
        let need = (2.0 * GRAVITY_MPS2 * 0.8).sqrt();
        assert!(a.radial_v > need, "launch v {} clears the step", a.radial_v);
        assert_eq!(a.jump_dr, 0.0);
        // Airborne: horizontal movement continues (the arc carries it).
        let before_air = a.pos;
        tick(&mut a, up(), 0.1, 1);
        assert!(dvec3_length(dvec3_sub(a.pos, before_air)) > 0.0);
    }

    #[test]
    fn stalkers_chase_inside_aggro_and_dont_flee() {
        let mut s = Animal::new_kind(7, DVec3 { x: 0.0, y: 0.0, z: 0.0 }, up(), AnimalKind::Stalker);
        s.timer = 10.0;
        let player = DVec3 { x: 5.0, y: 0.0, z: 0.0 };
        tick_with_target(&mut s, up(), 0.1, 0, Some(player));
        assert_eq!(s.state, AnimalState::Chase);
        assert!(s.heading.x > 0.9, "locked onto the player: {:?}", s.heading);
        let d0 = dvec3_length(dvec3_sub(player, s.pos));
        tick_with_target(&mut s, up(), 0.5, 1, Some(player));
        assert!(dvec3_length(dvec3_sub(player, s.pos)) < d0, "closing in");
        // Hitting a stalker flashes it but does NOT rout it.
        hit(&mut s, 2.0, player, up());
        assert_eq!(s.hurt_t, HURT_FLASH_S);
        assert_ne!(s.state, AnimalState::Flee, "stalkers keep coming");
        // Out of range -> back to wandering.
        let far = DVec3 { x: 500.0, y: 0.0, z: 0.0 };
        tick_with_target(&mut s, up(), 0.1, 2, Some(far));
        assert_eq!(s.state, AnimalState::Walk);
        // Critters ignore the target entirely.
        let mut c = Animal::new(8, DVec3::default(), up());
        c.timer = 10.0;
        tick_with_target(&mut c, up(), 0.1, 0, Some(player));
        assert_ne!(c.state, AnimalState::Chase);
    }

    #[test]
    fn kind_bytes_round_trip() {
        for k in [AnimalKind::Critter, AnimalKind::Stalker] {
            assert_eq!(AnimalKind::from_u8(k.to_u8()), k);
        }
        assert_eq!(AnimalKind::from_u8(9), AnimalKind::Critter, "unknown -> critter");
    }
}
