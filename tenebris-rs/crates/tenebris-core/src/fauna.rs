//! Animals - the first fauna. A wandering critter you can hunt for meat.
//!
//! This module is the pure, shared SIM (SP/MP identical, testable): one
//! `Animal`'s position + health + a tiny wander/flee state machine. It is
//! deliberately planet-agnostic - movement happens in the tangent plane of
//! a surface `up` vector the caller passes in, so `tick` never needs to
//! know about spheres or terrain. The surface glue that DOES need the
//! world - ring-spawning near a player and re-seating feet on the
//! walkable floor - lives here too ([`spawn_near`] / [`reseat`]) so the
//! SP client and the MP server drive the exact same herd behaviour.
//! The client keeps the rendering + the attack raycast that calls
//! `hit`; the server owns MP authority (see server.rs animal_sim).

use crate::math::{
    dvec3_add, dvec3_cross, dvec3_dot, dvec3_length, dvec3_normalize, dvec3_scale, dvec3_sub, DVec3,
};
use crate::rng;
use crate::world::World;
use std::f64::consts::TAU;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AnimalKind {
    Critter,
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
}

/// Full health of a fresh critter.
pub const MAX_HEALTH: f32 = 12.0;

/* Tunables (seconds / metres-per-second / radians). Small enough to keep
 * inline for now; promote to a fauna.yaml if a designer needs to turn
 * them. */
const WALK_SPEED: f64 = 1.4;
const FLEE_SPEED: f64 = 4.8;
const IDLE_TIME: f32 = 1.8;
const WALK_TIME: f32 = 2.4;
const FLEE_TIME: f32 = 4.0;
const TURN_JITTER: f64 = 0.9;

impl Animal {
    pub fn new(id: u32, pos: DVec3, up: DVec3) -> Self {
        let heading = seed_tangent(up, id);
        Animal {
            id,
            kind: AnimalKind::Critter,
            pos,
            heading,
            health: MAX_HEALTH,
            state: AnimalState::Walk,
            timer: WALK_TIME,
            anim_phase: 0.0,
        }
    }

    pub fn is_alive(&self) -> bool {
        self.state != AnimalState::Dead
    }

    /// True while the legs should be swinging (walking / fleeing).
    pub fn is_moving(&self) -> bool {
        matches!(self.state, AnimalState::Walk | AnimalState::Flee)
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

/// Advance one animal by `dt`. `up` is the surface normal at its position;
/// `tick_salt` varies the wander RNG over time. Moves `pos` along the
/// tangent plane; the caller re-snaps `pos` to the surface radius after.
pub fn tick(a: &mut Animal, up: DVec3, dt: f32, tick_salt: u32) {
    if a.state == AnimalState::Dead {
        return;
    }
    let up = dvec3_normalize(up);
    a.heading = reproject_tangent(a.heading, up);
    a.timer -= dt;

    match a.state {
        AnimalState::Idle => {
            if a.timer <= 0.0 {
                a.state = AnimalState::Walk;
                a.timer = WALK_TIME + rand01(a.id, tick_salt) * 2.0;
                a.heading = jitter_heading(a.heading, up, a.id, tick_salt);
            }
        }
        AnimalState::Walk => {
            if a.timer <= 0.0 {
                if rand01(a.id, tick_salt.wrapping_add(7)) < 0.4 {
                    a.state = AnimalState::Idle;
                    a.timer = IDLE_TIME + rand01(a.id, tick_salt) * 2.0;
                } else {
                    a.heading = jitter_heading(a.heading, up, a.id, tick_salt);
                    a.timer = WALK_TIME + rand01(a.id, tick_salt) * 2.0;
                }
            }
            a.pos = dvec3_add(a.pos, dvec3_scale(a.heading, WALK_SPEED * dt as f64));
            a.anim_phase += dt * 8.0;
        }
        AnimalState::Flee => {
            a.pos = dvec3_add(a.pos, dvec3_scale(a.heading, FLEE_SPEED * dt as f64));
            a.anim_phase += dt * 16.0;
            if a.timer <= 0.0 {
                a.state = AnimalState::Walk;
                a.timer = WALK_TIME;
            }
        }
        AnimalState::Dead => {}
    }
}

/// Apply `dmg` from world point `from`. The animal bolts directly away
/// (in the tangent plane) unless the hit kills it.
pub fn hit(a: &mut Animal, dmg: f32, from: DVec3, up: DVec3) {
    if a.state == AnimalState::Dead {
        return;
    }
    a.health -= dmg;
    if a.health <= 0.0 {
        a.health = 0.0;
        a.state = AnimalState::Dead;
        return;
    }
    let away = dvec3_sub(a.pos, from);
    a.heading = reproject_tangent(away, up);
    a.state = AnimalState::Flee;
    a.timer = FLEE_TIME;
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
    Some(Animal::new(id, pos, dir))
}

/// Re-seat the animal's feet on the (possibly edited) floor after a
/// wander step so it hugs the terrain.
pub fn reseat(w: &World, a: &mut Animal) {
    let center = DVec3 { x: w.body.pos_x, y: w.body.pos_y, z: w.body.pos_z };
    let rel = dvec3_sub(a.pos, center);
    let r = dvec3_length(rel);
    if let Some(seated) = floor_pos(w, rel, r, -1) {
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
    fn hit_makes_it_flee_away_then_kills() {
        let mut a = Animal::new(2, DVec3 { x: 0.0, y: 0.0, z: 0.0 }, up());
        let threat = DVec3 { x: -3.0, y: 0.0, z: 0.0 }; // to the -x
        hit(&mut a, 4.0, threat, up());
        assert_eq!(a.state, AnimalState::Flee);
        // runs away from the threat: +x component.
        assert!(a.heading.x > 0.0, "heading {:?}", a.heading);
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
}
