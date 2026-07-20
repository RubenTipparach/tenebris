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
    /// Sea serpent - a LONG undulating deep-water hunter, the ocean's
    /// apex catch.
    SerpentFish,
    /// Large soaring bird of prey - broad slow wings, rides high.
    Raptor,
    /// Tall long-legged wading bird - stalks shorelines on stilts.
    Crane,
    /// Small mascot biped: big ears, spark-tipped tail, quick hopper.
    Sparkit,
    /// Small mascot biped: domed shell on its back, unhurried.
    Shellkin,
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
    /// Stable wire byte (packed into bits 4..11 of the AnimalState
    /// entry's state word - append only, never renumber). Historically a
    /// nibble; widened to a byte when the roster outgrew 16 kinds.
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
            AnimalKind::SerpentFish => 15,
            AnimalKind::Raptor => 16,
            AnimalKind::Crane => 17,
            AnimalKind::Sparkit => 18,
            AnimalKind::Shellkin => 19,
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
            15 => AnimalKind::SerpentFish,
            16 => AnimalKind::Raptor,
            17 => AnimalKind::Crane,
            18 => AnimalKind::Sparkit,
            19 => AnimalKind::Shellkin,
            _ => AnimalKind::Critter,
        }
    }

    pub fn habitat(self) -> Habitat {
        match self {
            AnimalKind::Bird | AnimalKind::Raptor => Habitat::Air,
            AnimalKind::Fish
            | AnimalKind::LargeFish
            | AnimalKind::LongFish
            | AnimalKind::FlatFish
            | AnimalKind::Turtle
            | AnimalKind::SerpentFish => Habitat::Water,
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
            AnimalKind::SerpentFish => 2.2,
            AnimalKind::Raptor => 3.4,
            AnimalKind::Crane => 1.2,
            AnimalKind::Sparkit => 2.0,
            AnimalKind::Shellkin => 0.8,
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
            AnimalKind::Chicken => 1.68,
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
            AnimalKind::SerpentFish => 1.3,
            AnimalKind::Raptor => 1.5,
            AnimalKind::Crane => 1.9,
            AnimalKind::Sparkit => 1.0,
            AnimalKind::Shellkin => 1.0,
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
            AnimalKind::SerpentFish => 4,
            AnimalKind::Sparkit => 1,
            _ => 2,
        }
    }

    /// How far below the sea surface a water animal's ORIGIN must stay
    /// so its drawn body (dorsal fin / shell / beating wings included)
    /// never breaks the surface. Sized per species as
    /// `rendered_top_extent x scale` PLUS the swell trough depth (the
    /// vertex swell drops the cap mesh ~0.18 m below mean sea level in a
    /// wave trough, so a fish clamped to mean level would poke through
    /// the dip) PLUS a small buffer. The deep-bodied reef fish needs
    /// much more headroom than a minnow. Non-water kinds return 0.
    pub fn water_top_clearance(self) -> f64 {
        match self {
            AnimalKind::Fish => 0.72,       // top 0.42 + trough 0.18 + buffer
            AnimalKind::LargeFish => 1.40,  // tall dorsal 1.08 + trough + buffer
            AnimalKind::LongFish => 0.80,   // eel head 0.48 + trough + buffer
            AnimalKind::FlatFish => 0.73,   // ray eyes 0.43 + trough + buffer
            AnimalKind::Turtle => 0.85,     // shell dome 0.54 + trough + buffer
            AnimalKind::SerpentFish => 1.10, // arched coils + trough + buffer
            _ => 0.0,
        }
    }

    /// The live-fish inventory item for this species, or `None` for a
    /// non-water creature. Fishing / netting a fish hands back THIS item,
    /// and it's what an aquarium stores; each has its own sprite.
    pub fn fish_item(self) -> Option<crate::items::ItemId> {
        use crate::items;
        Some(match self {
            AnimalKind::Fish => items::FISH_MINNOW,
            AnimalKind::LargeFish => items::FISH_REEF,
            AnimalKind::LongFish => items::FISH_EEL,
            AnimalKind::FlatFish => items::FISH_RAY,
            AnimalKind::Turtle => items::FISH_TURTLE,
            AnimalKind::SerpentFish => items::FISH_SERPENT,
            _ => return None,
        })
    }

    /// The water species a live-fish item denotes (inverse of
    /// [`fish_item`]), or `None` for a non-fish item. Used to turn a fish
    /// dropped into an aquarium back into the species that swims there.
    pub fn from_fish_item(id: crate::items::ItemId) -> Option<AnimalKind> {
        use crate::items;
        Some(match id {
            _ if id == items::FISH_MINNOW => AnimalKind::Fish,
            _ if id == items::FISH_REEF => AnimalKind::LargeFish,
            _ if id == items::FISH_EEL => AnimalKind::LongFish,
            _ if id == items::FISH_RAY => AnimalKind::FlatFish,
            _ if id == items::FISH_TURTLE => AnimalKind::Turtle,
            _ if id == items::FISH_SERPENT => AnimalKind::SerpentFish,
            _ => return None,
        })
    }

    /// True for the catchable water species (the fishing table). The
    /// swimming turtle rides the water habitat but is NOT a fish - it
    /// isn't on the hook.
    pub fn is_fish(self) -> bool {
        matches!(
            self,
            AnimalKind::Fish
                | AnimalKind::LargeFish
                | AnimalKind::LongFish
                | AnimalKind::FlatFish
                | AnimalKind::SerpentFish
        )
    }

    /// Fishing strength, 1..5. Drives the whole fishing minigame:
    /// stronger fish are RARER on the line, give you a SHORTER window
    /// to react to the bite, and reward MORE raw fish when landed.
    /// 0 for anything that isn't a catchable fish.
    pub fn fish_strength(self) -> u8 {
        match self {
            AnimalKind::Fish => 1,      // minnow - common, easy, 1 fish
            AnimalKind::FlatFish => 2,  // ray
            AnimalKind::LongFish => 3,  // eel
            AnimalKind::Turtle => 4,    // NOT hooked; rated for reference
            AnimalKind::SerpentFish => 4, // sea serpent - RAREST on the line
            AnimalKind::LargeFish => 5, // reef fish - rare, twitchy, 5 fish
            _ => 0,
        }
    }

    /// Compiled-in default relative chance this species is the one that
    /// bites (weights, not probabilities - normalised by the caller).
    /// Stronger fish are rarer. 0 = never on the hook. These are the
    /// defaults `fishing.yaml`'s `weight_*` knobs override, read at roll
    /// time via [`roll_fishing_species`] - so a designer can retune the
    /// per-species odds without recompiling (CLAUDE.md tunables rule).
    pub fn fishing_weight(self) -> u32 {
        match self {
            AnimalKind::Fish => 50,
            AnimalKind::FlatFish => 24,
            AnimalKind::LongFish => 16,
            AnimalKind::LargeFish => 10,
            AnimalKind::SerpentFish => 5,
            _ => 0,
        }
    }

    /// Human-readable name (player-facing HUD / menus). ASCII only.
    pub fn display_name(self) -> &'static str {
        match self {
            AnimalKind::Critter => "critter",
            AnimalKind::Stalker => "stalker",
            AnimalKind::Cat => "cat",
            AnimalKind::Sheep => "sheep",
            AnimalKind::Chicken => "chicken",
            AnimalKind::Cow => "cow",
            AnimalKind::Bird => "bird",
            AnimalKind::Fish => "minnow",
            AnimalKind::Frog => "frog",
            AnimalKind::Lizard => "lizard",
            AnimalKind::Penguin => "penguin",
            AnimalKind::LargeFish => "reef fish",
            AnimalKind::LongFish => "eel",
            AnimalKind::FlatFish => "ray",
            AnimalKind::Turtle => "turtle",
            AnimalKind::SerpentFish => "sea serpent",
            AnimalKind::Raptor => "raptor",
            AnimalKind::Crane => "crane",
            AnimalKind::Sparkit => "sparkit",
            AnimalKind::Shellkin => "shellkin",
        }
    }

    /// The catchable fish species, ordered weakest to strongest -
    /// the fishing roll iterates this table.
    pub const FISHING_TABLE: [AnimalKind; 5] = [
        AnimalKind::Fish,
        AnimalKind::FlatFish,
        AnimalKind::LongFish,
        AnimalKind::SerpentFish,
        AnimalKind::LargeFish,
    ];

    /// Pick which fish bites, weighted by the per-species odds in
    /// `fishing.yaml` (defaulting to [`fishing_weight`] when a knob is
    /// left at 0). `roll` is a uniform [0, 1). Deterministic given the
    /// same config, so SP and MP agree. The sea serpent is Sequoia-only
    /// fauna - off Sequoia its table row is skipped entirely (`sequoia` =
    /// fishing in Sequoia water).
    pub fn roll_fishing_species(roll: f32, sequoia: bool) -> AnimalKind {
        Self::roll_fishing_species_with(&crate::fishing::config(), roll, sequoia)
    }

    /// [`roll_fishing_species`] against an explicit weight config (the
    /// parameterless version reads the global `fishing::config()`). Pure -
    /// no global state - so tests can drive it deterministically.
    pub fn roll_fishing_species_with(
        cfg: &crate::fishing::FishingConfig,
        roll: f32,
        sequoia: bool,
    ) -> AnimalKind {
        let weight = |k: AnimalKind| cfg.weight_for(k);
        let on_line = |k: &AnimalKind| sequoia || *k != AnimalKind::SerpentFish;
        let total: u32 = Self::FISHING_TABLE
            .iter()
            .filter(|k| on_line(k))
            .map(|k| weight(*k))
            .sum();
        /* A zero-weight table (every species knobbed off) can't roll -
         * fall back to the common minnow rather than dividing by zero. */
        if total == 0 {
            return AnimalKind::Fish;
        }
        let mut acc = 0u32;
        let target = (roll.clamp(0.0, 0.9999) * total as f32) as u32;
        for k in Self::FISHING_TABLE {
            if !on_line(&k) {
                continue;
            }
            acc += weight(k);
            if target < acc {
                return k;
            }
        }
        AnimalKind::Fish
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
/// Max rise / dive rate for a fish easing toward its target depth,
/// m/s. Bounded (like the bird's climb rate) so vertical motion is a
/// graceful glide, not a snap to the clamp.
const FISH_CLIMB_MPS: f64 = 1.1;
/// How fast a fish's target depth wanders across the water column
/// (radians of the anim-phase sine). Small = long slow rise/dive
/// cycles that read like real cruising.
const FISH_DEPTH_RATE: f64 = 0.11;
/// A land animal that fell / spawned into water swims with its body this
/// far below the surface (head above the waterline, like a swimming dog).
const SWIM_SUBMERGE_M: f64 = 0.35;
/// Rate a swimming land animal floats up to the surface, m/s (bounded like
/// the fish climb so the bob-up is a glide, not a snap).
const SWIM_FLOAT_MPS: f64 = 2.0;
/// How far around itself a swimmer probes for the nearest shore, metres.
const SHORE_PROBE_M: f64 = 4.0;
/// Directions sampled (around the local up) when hunting the nearest shore.
const SHORE_SAMPLES: usize = 8;

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
                /* Birds never take the grazing pause - a bird frozen
                 * mid-air reads as a bug, so they pick a new heading
                 * and keep flying instead. */
                if a.kind.habitat() != Habitat::Air
                    && rand01(a.id, tick_salt.wrapping_add(7)) < 0.4
                {
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

/// True when `body` hosts wildlife at all. Life is an EARTHLIKE thing:
/// Tenebris and Sequoia have ecosystems; icy Frostbite, barren Crag,
/// the moons and the asteroids are lifeless - a sheep on a glacier
/// world is a bug, not a feature (user direction).
pub fn body_has_fauna(body: &crate::planet::BodyConfig) -> bool {
    !body.barren
        && !body.icy
        && matches!(
            body.tileset,
            crate::planet::Tileset::Earth | crate::planet::Tileset::Sequoia
        )
}

/// Ring-spawn with an AUTO kind: the ring point decides - water tiles
/// spawn fish (lifted into the water column), dry land rolls the
/// grazer table with an occasional bird. Client + server both spawn
/// through this so SP and MP fauna mixes match.
pub fn spawn_near_auto(w: &World, anchor_world: DVec3, id: u32, salt: u32) -> Option<Animal> {
    /* Per-body gate: lifeless worlds spawn nothing. */
    if !body_has_fauna(&w.body) {
        return None;
    }
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
        /* The sea has an ecosystem, not one species: schools of small
         * fish most common, then the big reef fish, eels, rays, and
         * the occasional turtle. Pick the species FIRST so the swim-
         * band check uses ITS surface clearance (the deep reef fish
         * needs far more headroom than a minnow). */
        let wroll = rand01(id, salt.wrapping_add(47));
        /* Sea serpents live ONLY in Sequoia's green water (user
         * direction: the new fauna stays on the new planet). Off
         * Sequoia the serpent slice is empty - turtles take it. */
        let serpent_cut =
            if w.body.tileset == crate::planet::Tileset::Sequoia { 0.72 } else { 1.0 };
        let species = if wroll < 0.36 {
            AnimalKind::Fish
        } else if wroll < 0.52 {
            AnimalKind::LargeFish
        } else if wroll < 0.62 {
            AnimalKind::LongFish
        } else if wroll < 0.70 {
            AnimalKind::FlatFish
        } else if wroll < serpent_cut {
            AnimalKind::Turtle
        } else {
            AnimalKind::SerpentFish
        };
        /* A column that can't hold THIS species inside its swim band
         * (floor pad + its surface margin) never spawns it - a fish
         * born on a one-block shelf had nowhere legal to swim and spun
         * in place. The ring roll just fails this attempt. */
        let top_clear = species.water_top_clearance();
        if r + FISH_PAD_M > sea_r - top_clear {
            return None;
        }
        /* Lift the spawn into the swimmable band; reseat eases depth. */
        let lift = (r + FISH_PAD_M + 0.3).min(sea_r - top_clear).max(r);
        a.pos = dvec3_add(center, dvec3_scale(dvec3_normalize(rel), lift));
        species
    } else {
        /* Each PLANET runs its own biome rosters: Tenebris keeps the
         * classic barnyard mix; Sequoia - the world whose animal line
         * evolved on two feet (see SEQUOIA_PLAN.md) - fields the new
         * bipeds, waders, and raptors instead. Legacy (default-seed)
         * worlds classify Fields everywhere, so their mix is unchanged. */
        let biome = crate::planet_gen::biome(&w.body, dvec3_normalize(rel));
        let sequoia = w.body.tileset == crate::planet::Tileset::Sequoia;
        let roll = rand01(id, salt.wrapping_add(41));
        let table_roll = rand01(id, salt.wrapping_add(43));
        land_spawn_kind(sequoia, biome, roll, table_roll)
    };
    Some(a)
}

/// Which land species a biome spawn resolves to, per planet. Pure so the
/// rosters are testable: `sequoia` selects the new-world tables (bipeds,
/// waders, raptors - SEQUOIA_PLAN.md), otherwise the Tenebris classics.
/// `roll` gates the biome's headline species, `table_roll` indexes the
/// remainder table.
pub fn land_spawn_kind(
    sequoia: bool,
    biome: crate::planet_gen::Biome,
    roll: f32,
    table_roll: f32,
) -> AnimalKind {
    use crate::planet_gen::Biome;
    let pick = |arr: &[AnimalKind]| -> AnimalKind {
        arr[(table_roll * arr.len() as f32) as usize % arr.len()]
    };
    if sequoia {
        /* The two-footed world - a roster with NO overlap onto Tenebris
         * (CLAUDE.md: animal rosters must be UNIQUE per planet). Only
         * Sequoia-native species appear: mascot bipeds everywhere
         * temperate, cranes wading the wet biomes, raptors owning the
         * high ground. No barnyard, and none of Tenebris's generic
         * frog / bird / lizard fill either. */
        return match biome {
            Biome::Swamp => {
                if roll < 0.45 {
                    AnimalKind::Crane
                } else {
                    pick(&[AnimalKind::Shellkin, AnimalKind::Crane])
                }
            }
            Biome::Jungle => {
                if roll < 0.35 {
                    AnimalKind::Sparkit
                } else {
                    pick(&[
                        AnimalKind::Sparkit,
                        AnimalKind::Shellkin,
                        AnimalKind::Raptor,
                        AnimalKind::Crane,
                    ])
                }
            }
            Biome::Desert => {
                if roll < 0.55 {
                    AnimalKind::Sparkit
                } else {
                    pick(&[AnimalKind::Shellkin, AnimalKind::Raptor])
                }
            }
            Biome::Tundra => {
                if roll < 0.50 {
                    AnimalKind::Shellkin
                } else {
                    AnimalKind::Crane
                }
            }
            Biome::Mountains => {
                if roll < 0.45 {
                    AnimalKind::Raptor
                } else {
                    pick(&[AnimalKind::Crane, AnimalKind::Sparkit])
                }
            }
            _ => {
                if roll < 0.10 {
                    AnimalKind::Raptor
                } else {
                    pick(&[
                        AnimalKind::Sparkit,
                        AnimalKind::Shellkin,
                        AnimalKind::Crane,
                        AnimalKind::Sparkit,
                        AnimalKind::Shellkin,
                    ])
                }
            }
        };
    }
    /* Tenebris: the classic rosters, unchanged - the new species live on
     * the new planet. */
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
    /* Sea surface radius on this body (0 offset on unraised worlds). Shared
     * by the water column (fish), the land-animal swim rescue, and the
     * fall-into-water splash-down. */
    let sea_r = w.depth_to_radius_m(WORLD_SEA_LEVEL_DEPTH)
        + crate::planet_gen::sea_raise_m(&w.body) as f64;
    /* Walkable-floor radius (from the body centre) along body-local
     * direction `d`, or 0 if the column has no floor. */
    let floor_r_of = |d: DVec3, hint_r: f64| -> f64 {
        floor_pos(w, d, hint_r, -1)
            .map(|p| dvec3_length(dvec3_sub(p, center)))
            .unwrap_or(0.0)
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
            /* Fish/turtles stay inside the water column between the sea
             * floor and a per-species surface margin (covers the drawn
             * body so nothing pokes above the water), and refuse the
             * beach (shallow / dry columns). Seeded worlds add their
             * raised-sea offset (hoisted `sea_r` above). */
            let top_clear = a.kind.water_top_clearance();
            let swim_band = |floor_r: f64| -> Option<(f64, f64)> {
                let lo = floor_r + FISH_PAD_M;
                let hi = sea_r - top_clear;
                (floor_r > 0.0 && lo <= hi).then_some((lo, hi))
            };
            let floor_r = floor_pos(w, dir, r, -1)
                .map(|p| dvec3_length(dvec3_sub(p, center)))
                .unwrap_or(0.0);
            let Some((lo, hi)) = swim_band(floor_r) else {
                /* This column can't hold this fish. If it just swam in
                 * from a swimmable column, bounce back (undo + turn) -
                 * the normal beach refusal. But if the PREVIOUS spot
                 * was unswimmable too (spawned on a shallow shelf,
                 * terrain edited under it), bouncing would flip it in
                 * place every frame - the "fish spinning forever"
                 * bug. Instead keep the heading and swim on, clamped
                 * SAFELY below the surface, until a swimmable column
                 * turns up. */
                let prev = dvec3_sub(a.pos, dvec3_scale(a.heading, state_speed(a) * dt as f64));
                let prev_rel = dvec3_sub(prev, center);
                let prev_r = dvec3_length(prev_rel);
                let prev_ok = prev_r > 1e-6
                    && floor_pos(w, dvec3_scale(prev_rel, 1.0 / prev_r), prev_r, -1)
                        .map(|p| dvec3_length(dvec3_sub(p, center)))
                        .is_some_and(|fr| swim_band(fr).is_some());
                if !prev_ok && floor_r > 0.0 && floor_r < sea_r {
                    /* Stuck escape: hug mid-water and keep going, but
                     * never above the surface margin (no popping). */
                    let safe_hi = sea_r - top_clear;
                    let mid = ((floor_r + sea_r) * 0.5).clamp(floor_r + 0.1, safe_hi.max(floor_r + 0.1));
                    a.pos = dvec3_add(center, dvec3_scale(dir, mid));
                } else {
                    refuse(a);
                }
                return;
            };
            /* Graceful vertical motion (like the bird's swoop): chase a
             * slowly-wandering target depth at a bounded rate instead
             * of snapping the radius to the clamp. The target eases up
             * and down the water column on a long anim-phase sine, so
             * fish rise and dive smoothly. */
            let mid = (lo + hi) * 0.5;
            let amp = (hi - lo) * 0.4;
            let target = (mid + amp * (a.anim_phase as f64 * FISH_DEPTH_RATE).sin()).clamp(lo, hi);
            let max_dv = FISH_CLIMB_MPS * dt as f64;
            let new_r = (r + (target - r).clamp(-max_dv, max_dv)).clamp(lo, hi);
            let swim_pos = dvec3_add(center, dvec3_scale(dir, new_r));
            if block_at(swim_pos) != Block::Water {
                refuse(a);
                return;
            }
            a.pos = dvec3_add(center, dvec3_scale(dir, new_r));
            return;
        }
        Habitat::Land => {
            /* Grounded land animal + a water body: decide between the
             * shore refusal (don't WALK into the sea) and the swim rescue
             * (you FELL in - get out). */
            if w.body.has_water && !a.airborne {
                let floor_here = floor_r_of(dir, r);
                /* Submerged = standing in a column whose floor is below
                 * the waterline with water over your feet. */
                let submerged = floor_here > 0.0
                    && floor_here < sea_r - STEP_EPS_M
                    && block_at(dvec3_add(center, dvec3_scale(dir, floor_here + 0.5)))
                        == Block::Water;
                if submerged {
                    /* Where were we last frame? If on dry land, this was a
                     * walk INTO the water - refuse and back onto land (the
                     * old shoreline behaviour). If we were already in the
                     * water (fell off a cliff, spawned in), we're trapped:
                     * swim out instead of spinning in place. */
                    let prev =
                        dvec3_sub(a.pos, dvec3_scale(a.heading, state_speed(a) * dt as f64));
                    let prev_rel = dvec3_sub(prev, center);
                    let prev_r = dvec3_length(prev_rel);
                    let prev_submerged = prev_r > 1e-6 && {
                        let pf = floor_r_of(dvec3_scale(prev_rel, 1.0 / prev_r), prev_r);
                        pf > 0.0 && pf < sea_r - STEP_EPS_M
                    };
                    if !prev_submerged {
                        refuse(a);
                        return;
                    }
                    /* --- swim to the nearest shore --- */
                    let up = dir;
                    let base = reproject_tangent(a.heading, up);
                    /* Sample around us; steer toward the direction with the
                     * highest ground (gradient-ascent = uphill = toward
                     * shore, works even across open water). */
                    let mut best_dir = base;
                    let mut best_floor = f64::NEG_INFINITY;
                    for i in 0..SHORE_SAMPLES {
                        let ang = (i as f64) / SHORE_SAMPLES as f64 * TAU;
                        let cand = rotate_about_up(base, up, ang);
                        let probe = dvec3_add(a.pos, dvec3_scale(cand, SHORE_PROBE_M));
                        let prel = dvec3_sub(probe, center);
                        let pr = dvec3_length(prel);
                        let fr = if pr > 1e-6 {
                            floor_r_of(dvec3_scale(prel, 1.0 / pr), pr)
                        } else {
                            0.0
                        };
                        if fr > best_floor {
                            best_floor = fr;
                            best_dir = cand;
                        }
                    }
                    a.heading = best_dir;
                    a.state = AnimalState::Walk; /* keep paddling */
                    /* Float toward the surface (head above the waterline),
                     * bounded like the fish so it's a glide, not a snap. */
                    let target_r = (sea_r - SWIM_SUBMERGE_M).max(floor_here + 0.2);
                    let max_dv = SWIM_FLOAT_MPS * dt as f64;
                    let new_r = r + (target_r - r).clamp(-max_dv, max_dv);
                    a.pos = dvec3_add(center, dvec3_scale(dir, new_r));
                    /* Shore right ahead and climbable? Arm the stop-then-
                     * jump so it leaps OUT of the water onto the land (the
                     * same launch the step logic uses; AIR_CONTROL carries
                     * the arc forward along the shore heading). */
                    let ahead = dvec3_add(
                        a.pos,
                        dvec3_scale(best_dir, WALL_PAD_M * a.kind.scale() as f64 + 0.6),
                    );
                    let arel = dvec3_sub(ahead, center);
                    let ar = dvec3_length(arel);
                    let ahead_floor = if ar > 1e-6 {
                        floor_r_of(dvec3_scale(arel, 1.0 / ar), ar)
                    } else {
                        0.0
                    };
                    if ahead_floor >= sea_r - STEP_EPS_M
                        && ahead_floor - new_r > STEP_EPS_M
                        && ahead_floor - new_r <= STEP_MAX_M
                        && a.jump_pause_t <= 0.0
                        && a.jump_dr <= 0.0
                    {
                        a.jump_dr = ahead_floor - new_r;
                        a.jump_pause_t = JUMP_PAUSE_S * 0.25; /* launch promptly */
                    }
                    return;
                }
                /* Not submerged: the normal shore refusal - a land animal
                 * won't step its feet into a water column. */
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
        /* A land animal that falls into water splashes down at the SURFACE,
         * not the sea floor - then the swim rescue takes over next frame.
         * On dry land (floor at/above the waterline) this is just floor_r. */
        let land_r = if w.body.has_water && floor_r > 0.0 && floor_r < sea_r - STEP_EPS_M {
            (sea_r - SWIM_SUBMERGE_M).max(floor_r)
        } else {
            floor_r
        };
        if a.radial_v <= 0.0 && land_r > 0.0 && new_r <= land_r {
            /* Touch down. */
            a.airborne = false;
            a.radial_v = 0.0;
            a.jump_dr = 0.0;
            a.pos = dvec3_add(center, dvec3_scale(dir, land_r));
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
            AnimalKind::SerpentFish,
            AnimalKind::Raptor,
            AnimalKind::Crane,
            AnimalKind::Sparkit,
            AnimalKind::Shellkin,
        ] {
            assert_eq!(AnimalKind::from_u8(k.to_u8()), k);
            assert!(k.to_u8() <= 0xFF, "kind must fit the wire byte (bits 4..11)");
        }
        assert_eq!(AnimalKind::from_u8(20), AnimalKind::Critter, "unknown -> critter");
    }

    #[test]
    fn planets_field_disjoint_rosters() {
        use crate::planet_gen::Biome;
        let biomes = [
            Biome::Fields,
            Biome::Swamp,
            Biome::Jungle,
            Biome::Desert,
            Biome::Tundra,
            Biome::Mountains,
        ];
        let mut seq_kinds = std::collections::HashSet::new();
        let mut ten_kinds = std::collections::HashSet::new();
        for biome in biomes {
            for i in 0..40 {
                for j in 0..40 {
                    let (roll, tr) = (i as f32 / 40.0, j as f32 / 40.0);
                    seq_kinds.insert(land_spawn_kind(true, biome, roll, tr).to_u8());
                    ten_kinds.insert(land_spawn_kind(false, biome, roll, tr).to_u8());
                }
            }
        }
        /* The new species live on the NEW planet... */
        for k in [AnimalKind::Sparkit, AnimalKind::Shellkin, AnimalKind::Crane, AnimalKind::Raptor]
        {
            assert!(seq_kinds.contains(&k.to_u8()), "{k:?} must spawn on Sequoia");
            assert!(!ten_kinds.contains(&k.to_u8()), "{k:?} must NOT spawn on Tenebris");
        }
        /* ...and the barnyard stays home. */
        for k in [AnimalKind::Cow, AnimalKind::Chicken, AnimalKind::Sheep, AnimalKind::Cat] {
            assert!(ten_kinds.contains(&k.to_u8()), "{k:?} must spawn on Tenebris");
            assert!(!seq_kinds.contains(&k.to_u8()), "{k:?} must NOT spawn on Sequoia");
        }
        /* CLAUDE.md standing rule: the land rosters must be FULLY
         * disjoint - not one shared species between two planets. */
        let shared: Vec<u8> = seq_kinds.intersection(&ten_kinds).copied().collect();
        assert!(
            shared.is_empty(),
            "planet land rosters must be unique per planet; shared kinds: {shared:?}"
        );
    }

    #[test]
    fn only_earthlike_bodies_have_fauna() {
        use crate::planet::{self, BodyId};
        /* Earthlikes host wildlife... */
        for id in [BodyId::Tenebris, BodyId::Sequoia] {
            assert!(
                body_has_fauna(&planet::get(id)),
                "{id:?} must have fauna"
            );
        }
        /* ...icy / barren / moon / asteroid worlds are lifeless (the
         * "sheep on Frostbite" bug). */
        for id in [
            BodyId::Frostbite,
            BodyId::Crag,
            BodyId::Luna,
            BodyId::Asteroid0,
        ] {
            assert!(
                !body_has_fauna(&planet::get(id)),
                "{id:?} must be lifeless"
            );
        }
    }

    #[test]
    fn fishing_table_is_ordered_and_weighted() {
        /* Every table entry is a fish with a strength + weight; the
         * turtle rides the water but is NOT catchable. */
        for k in AnimalKind::FISHING_TABLE {
            assert!(k.is_fish(), "{k:?} must be a fish");
            assert!(k.fish_strength() >= 1 && k.fish_strength() <= 5);
            assert!(k.fishing_weight() > 0);
        }
        assert!(!AnimalKind::Turtle.is_fish());
        assert_eq!(AnimalKind::Turtle.fishing_weight(), 0);
        /* Strength strictly increases across the table (weakest first). */
        let s: Vec<u8> = AnimalKind::FISHING_TABLE.iter().map(|k| k.fish_strength()).collect();
        assert!(s.windows(2).all(|w| w[0] < w[1]), "strength ascends: {s:?}");
        /* Weighted roll (against the compiled-in default weights, so this
         * is independent of any global config another test may set): the
         * low end lands the common minnow, the top the rare reef fish. */
        let def = crate::fishing::FishingConfig::DEFAULT;
        assert_eq!(AnimalKind::roll_fishing_species_with(&def, 0.0, true), AnimalKind::Fish);
        assert_eq!(AnimalKind::roll_fishing_species_with(&def, 0.999, true), AnimalKind::LargeFish);
        /* The sea serpent is Sequoia-only: off Sequoia no roll value
         * can land it. */
        for i in 0..100 {
            let k = AnimalKind::roll_fishing_species_with(&def, i as f32 / 100.0, false);
            assert_ne!(k, AnimalKind::SerpentFish, "serpent hooked off Sequoia");
        }
        assert!(
            (0..100).any(|i| {
                AnimalKind::roll_fishing_species_with(&def, i as f32 / 100.0, true)
                    == AnimalKind::SerpentFish
            }),
            "serpent must be catchable on Sequoia"
        );
    }

    #[test]
    fn fish_items_round_trip_and_only_water_species_have_them() {
        use crate::items;
        /* Every water species maps to its own live-fish item and back. */
        for k in [
            AnimalKind::Fish,
            AnimalKind::LargeFish,
            AnimalKind::LongFish,
            AnimalKind::FlatFish,
            AnimalKind::Turtle,
            AnimalKind::SerpentFish,
        ] {
            let item = k.fish_item().expect("water species has a fish item");
            assert!(items::is_fish_item(item));
            assert_eq!(AnimalKind::from_fish_item(item), Some(k), "{k:?} round-trips");
        }
        /* Land / air species have no fish item. */
        for k in [AnimalKind::Cow, AnimalKind::Bird, AnimalKind::Sparkit] {
            assert_eq!(k.fish_item(), None, "{k:?} is not a fish");
        }
        assert_eq!(AnimalKind::from_fish_item(items::RAW_MEAT), None);
    }

    #[test]
    fn fishing_weights_follow_config() {
        use crate::fishing::FishingConfig;
        /* Zeroing every species but the reef fish forces every roll to
         * land the reef fish - the config drives the odds. Pure (local
         * config), so it can't race the global other tests read. */
        let reef_only = FishingConfig {
            weight_minnow: 0,
            weight_ray: 0,
            weight_eel: 0,
            weight_serpent: 0,
            weight_reef: 100,
            ..FishingConfig::DEFAULT
        };
        for i in 0..50 {
            assert_eq!(
                AnimalKind::roll_fishing_species_with(&reef_only, i as f32 / 50.0, true),
                AnimalKind::LargeFish,
                "reef-only config always lands the reef fish"
            );
        }
        /* All-zero weights fall back to the common minnow, never panic. */
        let none = FishingConfig { weight_reef: 0, ..reef_only };
        assert_eq!(AnimalKind::roll_fishing_species_with(&none, 0.5, true), AnimalKind::Fish);
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
        /* The SHALLOWEST ocean column (fewest water voxels below sea level).
         * Seeded worlds now have steep shores + deep basins, so a literal
         * one-voxel shelf may not exist; the shallowest shelf still
         * exercises the "fish near the floor escapes instead of spinning"
         * reseat behaviour this test guards. */
        let sea = crate::world::WORLD_SEA_LEVEL_DEPTH;
        let water_depth = |t: i32| -> i32 {
            let mut d = sea;
            while d > 0 && w.get(t, d - 1) == Block::Water {
                d -= 1;
            }
            sea - d
        };
        let tile = (0..w.tile_count)
            .filter(|&t| w.get(t, sea) == Block::Water)
            .min_by_key(|&t| water_depth(t))
            .expect("seeded world has ocean water");
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

    /// Regression: a LAND animal that ends up submerged in open water (fell
    /// off a cliff, spawned on a shelf that eroded) must SWIM - float to the
    /// surface and strike out toward shore - not sink to the sea floor and
    /// spin its heading in place forever (the "animals get stuck in water
    /// with nowhere to go" bug). Deterministic: fixed seed + id.
    #[test]
    fn land_animal_trapped_in_water_swims_out_instead_of_stalling() {
        use crate::blocks::Block;
        use crate::planet::{self, BodyId};
        use crate::world::World;

        let mut body = planet::get(BodyId::Tenebris);
        body.seed = 0xC0FFEE; /* biomes_active -> raised sea + deep ocean basins */
        let mut w = World::create(&body, 4);
        while !w.gen_complete() {
            w.stream_gen(10000);
        }
        assert!(w.body.has_water, "seeded Tenebris has oceans");
        let center = DVec3 { x: body.pos_x, y: body.pos_y, z: body.pos_z };
        let sea = crate::world::WORLD_SEA_LEVEL_DEPTH;
        let water_depth = |t: i32| -> i32 {
            let mut d = sea;
            while d > 0 && w.get(t, d - 1) == Block::Water {
                d -= 1;
            }
            sea - d
        };
        /* The DEEPEST ocean column - the worst case for a trapped land
         * animal (furthest to swim up, most surrounded by water). */
        let tile = (0..w.tile_count)
            .filter(|&t| w.get(t, sea) == Block::Water)
            .max_by_key(|&t| water_depth(t))
            .expect("seeded world has ocean water");
        assert!(water_depth(tile) >= 3, "need a genuinely deep column to submerge");
        let t = w.grid.tile(tile).expect("tile");
        let dir = dvec3_normalize(t.center);
        let sea_r = w.depth_to_radius_m(sea) + crate::planet_gen::sea_raise_m(&w.body) as f64;
        /* Drop the cow 3 m under the surface (submerged, above the floor). */
        let start_r = sea_r - 3.0;
        let mut a =
            Animal::new_kind(7, dvec3_add(center, dvec3_scale(dir, start_r)), dir, AnimalKind::Cow);
        a.state = AnimalState::Walk;
        a.timer = 1.0e9; /* keep walking - isolate the reseat behaviour */

        /* Accumulate the HORIZONTAL arc length travelled. A stuck animal
         * (old bug) gets `refuse`d every frame - its per-frame advance is
         * undone, so the path stays ~0 even though it keeps spinning. A
         * swimmer racks up real distance whether it curves toward shore or
         * climbs out and walks. Net displacement is a poor proxy (a quick
         * escape onto a nearby cliff shore barely moves the endpoint). */
        let mut path = 0.0;
        let mut prev = a.pos;
        for i in 0..600 {
            let up = dvec3_normalize(dvec3_sub(a.pos, center));
            tick(&mut a, up, 0.05, i);
            reseat(&w, &mut a, 0.05);
            let d = dvec3_sub(a.pos, prev);
            let horiz = dvec3_sub(d, dvec3_scale(up, dvec3_dot(d, up)));
            path += dvec3_length(horiz);
            prev = a.pos;
        }
        let final_r = dvec3_length(dvec3_sub(a.pos, center));
        /* Floated up to (or past, if it reached shore) the waterline instead
         * of sinking and pinning at the sea floor... */
        assert!(
            final_r >= sea_r - SWIM_SUBMERGE_M - 0.75,
            "swimmer should ride the surface, ended {:.2} m below it",
            sea_r - final_r
        );
        /* ...and actually travelled (swam / climbed out), not spun in place. */
        assert!(
            path > 5.0,
            "trapped land animal should swim out, travelled only {path:.2} m"
        );
    }
}
