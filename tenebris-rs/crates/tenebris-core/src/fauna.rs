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
use crate::blocks::Block;
use crate::math::Vec3;
use crate::rng;
use crate::world::{World, WORLD_SEA_LEVEL_DEPTH};
use std::f64::consts::TAU;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AnimalKind {
    /// Passive quadruped (the dog-like original), hunted for meat.
    Critter,
    /// Night-spawned hostile: chases players, lunges on contact, gone
    /// by day.
    Stalker,
    /// Small, quick, skittish.
    Cat,
    /// Slow woolly grazer.
    Sheep,
    /// Tiny two-legged pecker.
    Chicken,
    /// Big slow grazer, best meat.
    Cow,
    /// Flies a couple of metres above the ground, crosses water.
    Bird,
    /// Water-only: swims below the surface, beaches nowhere.
    Fish,
    /// Swamp hopper - moves in little jumps even on flat ground.
    Frog,
    /// Desert darter - low, quick, sand-green.
    Lizard,
    /// Tundra waddler - upright on the snow.
    Penguin,
    /// Big deep-bodied reef fish, best fishing prize.
    LargeFish,
    /// Eel - long, thin, undulating.
    LongFish,
    /// Ray - wide flat wings gliding over the sea floor.
    FlatFish,
    /// Sea turtle - domed shell, flippers.
    Turtle,
}

/// Where an animal is allowed to be (drives the reseat rules).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Habitat {
    /// Walks the ground, REFUSES to enter water (turns away at shores).
    Land,
    /// Lives in the water column; refuses to leave it.
    Water,
    /// Flies above the floor; terrain and water both pass underneath.
    Air,
}

impl AnimalKind {
    /// Stable wire byte (packed into the AnimalState entry's state
    /// byte's high nibble, 0..15 - append only, never renumber).
    pub fn to_u8(self) -> u8 {
        match self {
            AnimalKind::Critter => 0,
            AnimalKind::Stalker => 1,
            AnimalKind::Cat => 2,
            AnimalKind::Sheep => 3,
            AnimalKind::Chicken => 4,
            AnimalKind::Cow => 5,
            AnimalKind::Bird => 6,
            AnimalKind::Fish => 7,
            AnimalKind::Frog => 8,
            AnimalKind::Lizard => 9,
            AnimalKind::Penguin => 10,
            AnimalKind::LargeFish => 11,
            AnimalKind::LongFish => 12,
            AnimalKind::FlatFish => 13,
            AnimalKind::Turtle => 14,
        }
    }

    pub fn from_u8(v: u8) -> AnimalKind {
        match v {
            1 => AnimalKind::Stalker,
            2 => AnimalKind::Cat,
            3 => AnimalKind::Sheep,
            4 => AnimalKind::Chicken,
            5 => AnimalKind::Cow,
            6 => AnimalKind::Bird,
            7 => AnimalKind::Fish,
            8 => AnimalKind::Frog,
            9 => AnimalKind::Lizard,
            10 => AnimalKind::Penguin,
            11 => AnimalKind::LargeFish,
            12 => AnimalKind::LongFish,
            13 => AnimalKind::FlatFish,
            14 => AnimalKind::Turtle,
            _ => AnimalKind::Critter,
        }
    }

    pub fn habitat(self) -> Habitat {
        match self {
            AnimalKind::Bird => Habitat::Air,
            AnimalKind::Fish
            | AnimalKind::LargeFish
            | AnimalKind::LongFish
            | AnimalKind::FlatFish
            | AnimalKind::Turtle => Habitat::Water,
            _ => Habitat::Land,
        }
    }

    /// Ambling speed, m/s (flee is a multiple of this).
    pub fn walk_speed(self) -> f64 {
        match self {
            AnimalKind::Critter => 1.4,
            AnimalKind::Stalker => 1.4,
            AnimalKind::Cat => 1.8,
            AnimalKind::Sheep => 0.9,
            AnimalKind::Chicken => 1.1,
            AnimalKind::Cow => 0.8,
            AnimalKind::Bird => 2.6,
            AnimalKind::Fish => 1.6,
            AnimalKind::Frog => 1.0,
            AnimalKind::Lizard => 2.2,
            AnimalKind::Penguin => 0.7,
            AnimalKind::LargeFish => 1.2,
            AnimalKind::LongFish => 1.9,
            AnimalKind::FlatFish => 1.0,
            AnimalKind::Turtle => 0.6,
        }
    }

    /// Visual scale relative to the base critter body. Land + air
    /// animals render at 2x their original size (playtest feedback -
    /// they read too small in the open terrain); the water family
    /// keeps its scale so fish stay believable next to the player.
    pub fn scale(self) -> f32 {
        match self {
            AnimalKind::Critter | AnimalKind::Stalker => 2.0,
            AnimalKind::Cat => 1.1,
            AnimalKind::Sheep => 2.1,
            AnimalKind::Chicken => 0.84,
            AnimalKind::Cow => 2.9,
            AnimalKind::Bird => 0.60,
            AnimalKind::Frog => 0.70,
            AnimalKind::Lizard => 0.80,
            AnimalKind::Penguin => 1.2,
            AnimalKind::Fish => 0.55,
            AnimalKind::LargeFish => 1.1,
            AnimalKind::LongFish => 0.8,
            AnimalKind::FlatFish => 0.75,
            AnimalKind::Turtle => 0.9,
        }
    }

    /// Base meat awarded on a kill (before the +0..2 roll).
    pub fn meat(self) -> u16 {
        match self {
            AnimalKind::Cow => 4,
            AnimalKind::Sheep => 3,
            AnimalKind::Chicken => 1,
            AnimalKind::Bird => 1,
            AnimalKind::Fish => 1,
            AnimalKind::Frog => 1,
            AnimalKind::Cat => 1,
            AnimalKind::Lizard => 1,
            AnimalKind::LargeFish => 3,
            _ => 2,
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

/// Ground speed for the current state, m/s (per-kind base speed;
/// fleeing and chasing scale it the way the original constants did).
fn state_speed(a: &Animal) -> f64 {
    let base = a.kind.walk_speed();
    match a.state {
        AnimalState::Walk => base,
        AnimalState::Flee => base * (FLEE_SPEED / WALK_SPEED),
        AnimalState::Chase => CHASE_SPEED,
        _ => 0.0,
    }
}

/// Frogs travel in little hops: the grounded "sit" between jumps, and
/// the virtual step height that sets the hop's launch speed (via the
/// same sqrt(2g(dr+clear)) the step-jump uses).
const FROG_HOP_EVERY_S: f32 = 0.9;
const FROG_HOP_DR_M: f64 = 0.35;
/// Cruising height of a bird above the walkable floor, metres.
const BIRD_FLY_M: f64 = 2.6;
/// Max climb / dive rate chasing that cruise height, m/s (bounded so a
/// floor jump under the bird becomes a swoop, not a teleport).
const BIRD_CLIMB_MPS: f64 = 6.0;
/// Wall look-ahead distance per unit of kind scale: how far in front of
/// the centre the grounded step check probes for a rise.
const WALL_PAD_M: f64 = 0.45;
/// Vertical bob amplitude of a flying bird / swimming fish, metres.
const FLY_BOB_M: f64 = 0.35;
/// Water clearance for fish: min above the sea floor.
const FISH_PAD_M: f64 = 0.4;
/// Surface clearance for fish: the animal ORIGIN stays this far under
/// the sea surface, covering the drawn body + dorsal fin + bob so no
/// part of a fish ever pokes out of the water.
const FISH_SURFACE_PAD_M: f64 = 1.0;

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

    /* Frogs travel in hops: whenever one is grounded and wants to
     * move, arm the same stop-then-jump machinery the step logic uses
     * (the pause is the "sit" between hops). */
    if a.kind == AnimalKind::Frog
        && !a.airborne
        && a.is_moving()
        && a.jump_pause_t <= 0.0
        && a.jump_dr <= 0.0
    {
        a.jump_pause_t = FROG_HOP_EVERY_S * (0.7 + 0.6 * rand01(a.id, tick_salt));
        a.jump_dr = FROG_HOP_DR_M;
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

/// Ring-spawn with an AUTO kind: the ring point decides - water tiles
/// spawn fish (lifted into the water column), dry land rolls the
/// grazer table with an occasional bird. Client + server both spawn
/// through this so SP and MP fauna mixes match.
pub fn spawn_near_auto(w: &World, anchor_world: DVec3, id: u32, salt: u32) -> Option<Animal> {
    let mut a = spawn_near(w, anchor_world, id, salt)?;
    let center = DVec3 { x: w.body.pos_x, y: w.body.pos_y, z: w.body.pos_z };
    let rel = dvec3_sub(a.pos, center);
    let probe = dvec3_add(a.pos, dvec3_scale(dvec3_normalize(rel), 0.4));
    let lp = dvec3_sub(probe, center);
    let in_water = w.body.has_water
        && w.block_at_pos(Vec3 { x: lp.x as f32, y: lp.y as f32, z: lp.z as f32 }, -1)
            == Block::Water;
    a.kind = if in_water {
        let r = dvec3_length(rel);
        let sea_r = w.depth_to_radius_m(crate::world::WORLD_SEA_LEVEL_DEPTH)
            + crate::planet_gen::sea_raise_m(&w.body) as f64;
        /* A column that can't hold a fish inside its swim band (floor
         * pad + surface margin) never spawns one - a fish born on a
         * one-block shallow shelf had nowhere legal to swim and spun
         * in place. The ring roll just fails this attempt. */
        if r + FISH_PAD_M > sea_r - FISH_SURFACE_PAD_M {
            return None;
        }
        /* Lift the spawn into the swimmable band; reseat clamps. */
        let lift = (r + FISH_PAD_M + 0.3).min(sea_r - FISH_SURFACE_PAD_M).max(r);
        a.pos = dvec3_add(center, dvec3_scale(dvec3_normalize(rel), lift));
        /* The sea has an ecosystem, not one species: schools of small
         * fish most common, then the big reef fish, eels, rays, and
         * the occasional turtle. */
        let wroll = rand01(id, salt.wrapping_add(47));
        if wroll < 0.40 {
            AnimalKind::Fish
        } else if wroll < 0.60 {
            AnimalKind::LargeFish
        } else if wroll < 0.75 {
            AnimalKind::LongFish
        } else if wroll < 0.88 {
            AnimalKind::FlatFish
        } else {
            AnimalKind::Turtle
        }
    } else {
        /* Each biome runs its own roster: swamps croak with frogs,
         * jungles flutter with birds and prowl with cats, deserts dart
         * with lizards, tundra waddles with penguins, mountains keep
         * hardy sheep under circling birds, and the temperate fields
         * graze the classic barnyard mix. Legacy (default-seed) worlds
         * classify Fields everywhere, so their mix is unchanged. */
        use crate::planet_gen::Biome;
        let biome = crate::planet_gen::biome(&w.body, dvec3_normalize(rel));
        let roll = rand01(id, salt.wrapping_add(41));
        let table_roll = rand01(id, salt.wrapping_add(43));
        let pick = |arr: &[AnimalKind]| -> AnimalKind {
            arr[(table_roll * arr.len() as f32) as usize % arr.len()]
        };
        match biome {
            Biome::Swamp => {
                if roll < 0.55 {
                    AnimalKind::Frog
                } else {
                    pick(&[AnimalKind::Bird, AnimalKind::Critter])
                }
            }
            Biome::Jungle => {
                if roll < 0.35 {
                    AnimalKind::Bird
                } else {
                    pick(&[AnimalKind::Cat, AnimalKind::Critter, AnimalKind::Bird])
                }
            }
            Biome::Desert => {
                if roll < 0.75 {
                    AnimalKind::Lizard
                } else {
                    AnimalKind::Critter
                }
            }
            Biome::Tundra => {
                if roll < 0.70 {
                    AnimalKind::Penguin
                } else {
                    AnimalKind::Critter
                }
            }
            Biome::Mountains => {
                if roll < 0.30 {
                    AnimalKind::Bird
                } else {
                    AnimalKind::Sheep
                }
            }
            _ => {
                if roll < 0.12 {
                    AnimalKind::Bird
                } else {
                    pick(&[
                        AnimalKind::Critter,
                        AnimalKind::Cat,
                        AnimalKind::Sheep,
                        AnimalKind::Chicken,
                        AnimalKind::Cow,
                    ])
                }
            }
        }
    };
    Some(a)
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

    /* Body-local block probe (world_pos here is already body-local
     * plus centre; block_at_pos wants the body-local part). */
    let block_at = |p: DVec3| -> Block {
        let lp = dvec3_sub(p, center);
        w.block_at_pos(Vec3 { x: lp.x as f32, y: lp.y as f32, z: lp.z as f32 }, -1)
    };
    /* Refuse a move: undo this frame's horizontal advance and turn the
     * animal around (with a per-id jitter so shorelines don't ping-pong
     * it on a perfect back-and-forth line). */
    let refuse = |a: &mut Animal| {
        let speed = state_speed(a);
        a.pos = dvec3_sub(a.pos, dvec3_scale(a.heading, speed * dt as f64));
        let up = dvec3_normalize(dvec3_sub(a.pos, center));
        let flipped = dvec3_scale(a.heading, -1.0);
        a.heading = rotate_about_up(
            reproject_tangent(flipped, up),
            up,
            (rand01(a.id, a.anim_phase as u32) as f64 - 0.5) * TURN_JITTER,
        );
    };

    match a.kind.habitat() {
        Habitat::Air => {
            /* Birds cruise above the floor (water included) with a
             * gentle bob - no step / fall physics at all. The cruise
             * altitude is CHASED at a bounded climb/dive rate: snapping
             * straight to floor + BIRD_FLY_M teleported the bird
             * vertically every time the floor jumped underneath it
             * (cliff edges, tree canopies) - the "birds hit a border
             * and teleport" bug. */
            if let Some(seated) = floor_pos(w, dir, r, -1) {
                let floor_r = dvec3_length(dvec3_sub(seated, center));
                let bob = (a.anim_phase as f64 * 0.35).sin() * FLY_BOB_M;
                let target_r = floor_r + BIRD_FLY_M + bob;
                let max_dv = BIRD_CLIMB_MPS * dt as f64;
                let new_r = r + (target_r - r).clamp(-max_dv, max_dv);
                a.pos = dvec3_add(center, dvec3_scale(dir, new_r));
            }
            return;
        }
        Habitat::Water => {
            /* Fish stay inside the water column: clamp between the sea
             * floor and the surface, and refuse to swim anywhere the
             * column is too shallow / dry (that's the beach). The
             * surface margin covers the drawn BODY (dorsal fin included)
             * plus the bob, so no part of a fish ever breaks the
             * surface; seeded worlds add their raised-sea offset. */
            let sea_r = w.depth_to_radius_m(WORLD_SEA_LEVEL_DEPTH)
                + crate::planet_gen::sea_raise_m(&w.body) as f64;
            let swim_band = |floor_r: f64| -> Option<(f64, f64)> {
                let lo = floor_r + FISH_PAD_M;
                let hi = sea_r - FISH_SURFACE_PAD_M;
                (floor_r > 0.0 && lo <= hi).then_some((lo, hi))
            };
            let floor_r = floor_pos(w, dir, r, -1)
                .map(|p| dvec3_length(dvec3_sub(p, center)))
                .unwrap_or(0.0);
            let Some((lo, hi)) = swim_band(floor_r) else {
                /* This column can't hold a fish. If it just swam in
                 * from a swimmable column, bounce back (undo + turn) -
                 * the normal beach refusal. But if the PREVIOUS spot
                 * was unswimmable too (spawned on a shallow shelf,
                 * terrain edited under it), bouncing would flip it in
                 * place every frame - the "fish spinning forever"
                 * bug. Instead keep the heading and swim on at mid
                 * water-column until a swimmable column turns up. */
                let prev = dvec3_sub(a.pos, dvec3_scale(a.heading, state_speed(a) * dt as f64));
                let prev_rel = dvec3_sub(prev, center);
                let prev_r = dvec3_length(prev_rel);
                let prev_ok = prev_r > 1e-6
                    && floor_pos(w, dvec3_scale(prev_rel, 1.0 / prev_r), prev_r, -1)
                        .map(|p| dvec3_length(dvec3_sub(p, center)))
                        .is_some_and(|fr| swim_band(fr).is_some());
                if !prev_ok && floor_r > 0.0 && floor_r < sea_r {
                    /* Stuck escape: hug the middle of whatever water
                     * is here and keep going. (The dorsal fin may
                     * graze the surface while crossing a one-block
                     * shelf - transient, and far better than a fish
                     * pirouetting on the spot.) */
                    let mid = ((floor_r + sea_r) * 0.5).max(floor_r + 0.1);
                    a.pos = dvec3_add(center, dvec3_scale(dir, mid));
                } else {
                    refuse(a);
                }
                return;
            };
            let bob = (a.anim_phase as f64 * 0.35).sin() * FLY_BOB_M * 0.5;
            let swim_r = (r + bob * 0.0).clamp(lo, hi); /* keep depth, clamp */
            let swim_pos = dvec3_add(center, dvec3_scale(dir, swim_r + bob));
            if block_at(swim_pos) != Block::Water {
                refuse(a);
                return;
            }
            a.pos = dvec3_add(center, dvec3_scale(dir, (swim_r + bob).clamp(lo, hi)));
            return;
        }
        Habitat::Land => {
            /* Land animals REFUSE water: if this frame's move put the
             * feet in (or under) a water column, undo it and turn
             * around. Grounded only - a mid-hop frog clears puddles. */
            if !a.airborne {
                if let Some(seated) = floor_pos(w, dir, r, -1) {
                    let probe = dvec3_add(seated, dvec3_scale(dir, 0.3));
                    if block_at(probe) == Block::Water {
                        refuse(a);
                        return;
                    }
                }
            }
        }
    }

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

    /* Wall look-ahead: also test the floor rise a body-radius ahead of
     * the centre (scaled per kind - a cow's nose reaches further than a
     * chicken's), so the animal stops / jumps with clearance instead of
     * walking its face into the step before reacting. */
    let ahead = dvec3_add(rel, dvec3_scale(a.heading, WALL_PAD_M * a.kind.scale() as f64));
    let dr_rise = floor_pos(w, ahead, r, -1)
        .map(|p| dvec3_length(dvec3_sub(p, center)) - r)
        .unwrap_or(dr)
        .max(dr);

    if dr_rise > STEP_EPS_M {
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
        if dr_rise < STEP_MAX_M && a.jump_pause_t <= 0.0 && a.jump_dr <= 0.0 && a.is_moving() {
            a.jump_pause_t = JUMP_PAUSE_S;
            a.jump_dr = dr_rise;
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
        for k in [
            AnimalKind::Critter,
            AnimalKind::Stalker,
            AnimalKind::Cat,
            AnimalKind::Sheep,
            AnimalKind::Chicken,
            AnimalKind::Cow,
            AnimalKind::Bird,
            AnimalKind::Fish,
            AnimalKind::Frog,
            AnimalKind::Lizard,
            AnimalKind::Penguin,
            AnimalKind::LargeFish,
            AnimalKind::LongFish,
            AnimalKind::FlatFish,
            AnimalKind::Turtle,
        ] {
            assert_eq!(AnimalKind::from_u8(k.to_u8()), k);
            assert!(k.to_u8() <= 0x0F, "kind must fit the wire nibble");
        }
        assert_eq!(AnimalKind::from_u8(15), AnimalKind::Critter, "unknown -> critter");
    }

    #[test]
    fn frogs_hop_and_habitats_are_sane() {
        /* Frog: grounded + moving arms the sit-then-hop cycle. */
        let mut f = Animal::new_kind(5, DVec3::default(), up(), AnimalKind::Frog);
        f.state = AnimalState::Walk;
        f.timer = 30.0;
        tick(&mut f, up(), 0.01, 0);
        assert!(f.jump_pause_t > 0.0 && f.jump_dr > 0.0, "hop armed");
        /* Sit out the pause -> airborne launch. */
        let mut spins = 0;
        while !f.airborne {
            tick(&mut f, up(), 0.1, 1);
            spins += 1;
            assert!(spins < 100, "hop must launch");
        }
        assert!(f.radial_v > 0.0);

        assert_eq!(AnimalKind::Fish.habitat(), Habitat::Water);
        assert_eq!(AnimalKind::Bird.habitat(), Habitat::Air);
        assert_eq!(AnimalKind::Cow.habitat(), Habitat::Land);
        assert!(AnimalKind::Cow.meat() > AnimalKind::Chicken.meat());
    }

    /// Regression: a fish stranded on a raised-sea shallow shelf (one
    /// water voxel - too shallow for the swim band) must swim OUT, not
    /// bounce its heading 180 degrees every frame and pirouette in
    /// place forever (the "fish are stuck swimming in place, turning
    /// around a bunch" bug). Deterministic: fixed seed, fixed id.
    #[test]
    fn shallow_shelf_fish_escapes_instead_of_spinning() {
        use crate::blocks::Block;
        use crate::planet::{self, BodyId};
        use crate::world::World;

        let mut body = planet::get(BodyId::Tenebris);
        body.seed = 0xC0FFEE; /* biomes_active -> raised sea, shallow shelves */
        let mut w = World::create(&body, 4);
        while !w.gen_complete() {
            w.stream_gen(10000);
        }
        let center = DVec3 { x: body.pos_x, y: body.pos_y, z: body.pos_z };
        /* A shelf column: its only water voxel at the raised-sea row. */
        let tile = (0..w.tile_count)
            .find(|&t| {
                w.get(t, crate::world::WORLD_SEA_LEVEL_DEPTH) == Block::Water
                    && w.get(t, crate::world::WORLD_SEA_LEVEL_DEPTH - 1) != Block::Water
            })
            .expect("seeded world has a one-voxel shallow shelf");
        let t = w.grid.tile(tile).expect("tile");
        let dir = dvec3_normalize(t.center);
        let r = w.depth_to_radius_m(crate::world::WORLD_SEA_LEVEL_DEPTH) + 0.5;
        let mut a = Animal::new_kind(1, dvec3_add(center, dvec3_scale(dir, r)), dir, AnimalKind::Fish);
        a.state = AnimalState::Walk;
        a.timer = 1.0e9; /* keep walking - isolate the reseat behaviour */

        let start = a.pos;
        for i in 0..600 {
            let up = dvec3_normalize(dvec3_sub(a.pos, center));
            tick(&mut a, up, 0.05, i);
            reseat(&w, &mut a, 0.05);
        }
        let moved = dvec3_length(dvec3_sub(a.pos, start));
        assert!(
            moved > 3.0,
            "fish should escape the shallow shelf, moved only {moved:.2} m"
        );
    }
}
