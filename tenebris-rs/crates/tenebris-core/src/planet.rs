//! Port of `tenebris-c/src/core/planet.{c,h}`.
//!
//! Solar system. Tenebris is the main landable planet; everything else
//! renders as a decorative celestial body (pre-meshed at boot) visible
//! in the sky. The teleport menu lets the player snap to any of them.
//!
//! Renames (per PORTING.md rule 4 - module prefix dropped):
//! - `body_id_t`     -> `planet::BodyId`
//! - `tileset_t`     -> `planet::Tileset`
//! - `body_config_t` -> `planet::BodyConfig`
//! - `body_atmo_t`   -> `planet::BodyAtmo` (previously a TODO(port) stub
//!   in `config.rs`; it now lives here and `config.rs` re-exports it)
//! - `planet_get()`  -> `planet::get()`. The C API returns a pointer
//!   into the (mutable) global body table; the table here is a
//!   `Mutex`-protected global, same pattern as `config.rs`, so callers
//!   get a copy. `get()` takes a `BodyId` and is infallible;
//!   `get_by_index()` mirrors the C "NULL on out-of-range id" path for
//!   integer ids off the wire / config glue.
//! - `planet_subdivisions_for_radius()` -> `planet::subdivisions_for_radius()`
//! - `planet_set_atmosphere()`          -> `planet::set_atmosphere()`
//! - `planet_gravity_at()`              -> `planet::gravity_at()`.
//!   `gravity_query_t.body` (a pointer, NULL in deep space) becomes
//!   `Option<BodyConfig>` (a copy).
//! - `config_load_atmosphere()` lived in config.c but is pure planet
//!   glue (body lookup + patch application); its planet half is wired
//!   up here as `planet::load_atmosphere()` / `planet::parse_atmosphere()`
//!   on top of `config::load_atmosphere_with` / `parse_atmosphere_with`.

use crate::config;
use crate::math::{DVec3, Vec3};
use std::sync::Mutex;

/// Port of `body_id_t`.
#[repr(i32)]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum BodyId {
    /* Main planet - the one the player's physics is anchored to. */
    Tenebris = 0,

    /* Tenebris's moons */
    Luna,
    Selene,

    /* Earth-like sister planet + its moons */
    Sequoia,
    Verdant,
    Sprout,

    /* Barren rocky planet + moon */
    Crag,
    Quartz,

    /* Icy outer planet + moon */
    Frostbite,
    Rime,

    /* Asteroid belt */
    Asteroid0,
    Asteroid1,
    Asteroid2,
    Asteroid3,
    Asteroid4,
    Asteroid5,
    Asteroid6,
    Asteroid7,
    Asteroid8,
    Asteroid9,
}

/// Mirrors C's `BODY_COUNT` (the implicit trailing enum member).
pub const BODY_COUNT: usize = 20;

impl BodyId {
    /// Every body in declaration (= C enum) order.
    pub const ALL: [BodyId; BODY_COUNT] = [
        BodyId::Tenebris,
        BodyId::Luna,
        BodyId::Selene,
        BodyId::Sequoia,
        BodyId::Verdant,
        BodyId::Sprout,
        BodyId::Crag,
        BodyId::Quartz,
        BodyId::Frostbite,
        BodyId::Rime,
        BodyId::Asteroid0,
        BodyId::Asteroid1,
        BodyId::Asteroid2,
        BodyId::Asteroid3,
        BodyId::Asteroid4,
        BodyId::Asteroid5,
        BodyId::Asteroid6,
        BodyId::Asteroid7,
        BodyId::Asteroid8,
        BodyId::Asteroid9,
    ];

    /// Fallible conversion from a raw integer id (config glue, wire
    /// data). Mirrors the C `id < 0 || id >= BODY_COUNT` guards.
    pub fn from_index(index: i32) -> Option<BodyId> {
        if index < 0 {
            return None;
        }
        Self::ALL.get(index as usize).copied()
    }
}

/// Port of `tileset_t`.
#[repr(i32)]
#[derive(Clone, Copy, Debug, PartialEq, Eq, Hash)]
pub enum Tileset {
    /// default - grass / dirt / sand / stone / ice / snow
    Earth = 0,
    /// planet_seq_*.png variants (green tall grass look)
    Sequoia,
    /// rusty red barren rock  (tinted moon.png)
    Crag,
    /// deep glacial ice blue  (tinted ice.png)
    Frost,
    /// dim gray carbonaceous  (tinted rocks.png)
    Asteroid,
}

/// Port of `body_config_t`. Field names and widths unchanged.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct BodyConfig {
    pub id: BodyId,
    pub name: &'static str,
    pub radius_m: f64,
    pub seed: u64,
    /// legacy, unused in the merged-mesh pipeline
    pub max_lod_depth: i32,
    /// Goldberg depth
    pub subdivisions: i32,
    pub gravity_g: f32,
    pub pos_x: f64,
    pub pos_y: f64,
    pub pos_z: f64,
    pub has_water: bool,
    /// moon-rock everywhere
    pub barren: bool,
    /// snow / ice everywhere
    pub icy: bool,
    /// skipped from the teleport menu
    pub is_asteroid: bool,
    /// which palette to sample (earth / sequoia)
    pub tileset: Tileset,

    /* ---- Atmosphere tuning (only used when has_water is true; the
     * renderer treats has_water as the "has atmosphere" predicate
     * since both Tenebris and Sequoia happen to be Earth-likes). All
     * fields default to zero meaning "use renderer default" - leave
     * a body's atmo_* zeroed and you get the default sky look. */
    /// shell radius / planet radius; 0 -> 1.3
    pub atmo_radius_mult: f32,
    /// atmosphere lower bound / planet radius; 0 -> 1.0 (atmosphere
    /// starts AT the ground). Raise to thin the shell from the bottom;
    /// lower to extend it below the surface. Also moves the planet-
    /// shadow / planet-clip sphere used by the ray-march.
    pub atmo_lower_radius_mult: f32,
    /// main blue-sky knob, 0 -> 1.0
    pub atmo_rayleigh_scale: f32,
    /// haze / sun glow, 0 -> 0.05
    pub atmo_mie_scale: f32,
    /// overall sky brightness, 0 -> 30
    pub atmo_sun_intensity: f32,
    /// warm-tint multiplier near horizon, 0 -> 0.3 (blue-leaning); set
    /// to 1.0 for the original strong orange sunset look.
    pub atmo_sunset_strength: f32,
    /* Physical constants - usually leave these zero. Override only
     * when modelling a non-Earthlike planet. */
    /// (1/lambda^4) RGB ratios, 0 -> (5.602, 9.473, 19.644)
    pub atmo_wavelengths: Vec3,
    /// Mie asymmetry (-1..1), 0 -> 0.76
    pub atmo_mie_g: f32,
    /// density falloff in normalised height, 0 -> 0.25 (Earth-tuned)
    pub atmo_scale_height: f32,
    /* Sunset tint colours - three vec3s that the warm-horizon pass
     * applies multiplicatively, additively as a sun-direction glow,
     * and additively as a horizon band respectively. Zero -> defaults
     * tuned for an Earth/Tenebris orange-fade. Override for e.g.
     * Mars-like red sunsets or alien chemistry. */
    /// sky multiplier at sunset, 0 -> (1.3, 1.0, 0.6)
    pub atmo_sunset_tint: Vec3,
    /// sun-direction glow, 0 -> (1.0, 0.65, 0.25)
    pub atmo_sunset_glow: Vec3,
    /// horizon-band tint, 0 -> (0.8, 0.4, 0.15)
    pub atmo_sunset_horizon: Vec3,

    /* ---- Atmospheric distance fog (composite pass). Terrain fades
     * toward the sky-at-horizon colour (sampled from the Caelum march
     * each frame) with 1-exp(-dist * density); zero density = no fog
     * (airless bodies stay crisp to the horizon). */
    /// tint multiplier over the sky-matched fog base (zero = untinted);
    /// on airless bodies with fog forced on, the flat fog colour itself
    pub atmo_fog_color: Vec3,
    /// fog density per metre of view distance, 0 -> off
    pub atmo_fog_density: f32,
    /// camera altitude (m above sea level) where fog fades out - climb
    /// above the weather and the vista clears. 0 -> 60.
    pub atmo_fog_height_m: f32,
    /// Cloud-deck ceiling for THIS body: the altitude (m above the surface)
    /// the cloud shell sits at, a per-body override of the global
    /// clouds.yaml `altitude_m`. Lets a thick-atmosphere world fly its
    /// clouds higher (or a thin one hug the ground). 0 -> use the global
    /// cloud altitude. Read live so atmosphere.yaml edits hot-reload.
    pub atmo_cloud_max_height_m: f32,
    /// Atmosphere on/off. `has_water` bodies default to ON; set false
    /// (via atmosphere.yaml `enabled: 0`) to strip the sky + distance
    /// fog entirely - the sea then keeps its own colour with no haze.
    pub atmo_enabled: bool,

    /* ---- Gravity field. Per-body overrides for the lod.yaml-level
     * defaults (gravity_full_mult / gravity_falloff_mult). Below
     * radius * full_mult the player feels 100 % of this body's
     * gravity; from there to radius * falloff_mult it tapers
     * linearly to 0 %. Outside falloff_mult the body exerts no
     * gravitational pull and the player is "in space" w.r.t. this
     * body. Zero -> use lod-config default. */
    pub gravity_full_mult: f32,
    pub gravity_falloff_mult: f32,
}

/// Port of `body_atmo_t` (planet.h). Atmosphere-only patch struct -
/// same fields as `BodyConfig::atmo_*` (matches one-for-one). Pass to
/// `set_atmosphere()` at boot with values from the YAML config to
/// override the in-tree defaults without recompiling. Zero-valued
/// fields are skipped (so an empty patch is a no-op), letting the YAML
/// express partial overrides.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct BodyAtmo {
    /// Atmosphere on/off toggle. -1 = unspecified (keep compiled default,
    /// i.e. on for has_water bodies); 0 = force OFF; >0 = force ON. Lets
    /// atmosphere.yaml write `enabled: 0` to strip a body's sky + fog.
    pub enabled: f32,
    pub radius_mult: f32,
    pub lower_radius_mult: f32,
    pub rayleigh_scale: f32,
    pub mie_scale: f32,
    pub sun_intensity: f32,
    pub sunset_strength: f32,
    pub scale_height: f32,
    pub mie_g: f32,
    pub wavelengths: Vec3,
    pub sunset_tint: Vec3,
    pub sunset_glow: Vec3,
    pub sunset_horizon: Vec3,
    pub fog_color: Vec3,
    pub fog_density: f32,
    pub fog_height_m: f32,
    pub cloud_max_height_m: f32,
}

impl BodyAtmo {
    /// memset(&patch, 0, sizeof(patch)) equivalent.
    pub const ZERO: BodyAtmo = BodyAtmo {
        enabled: -1.0, /* unspecified: keep the compiled default */
        radius_mult: 0.0,
        lower_radius_mult: 0.0,
        rayleigh_scale: 0.0,
        mie_scale: 0.0,
        sun_intensity: 0.0,
        sunset_strength: 0.0,
        scale_height: 0.0,
        mie_g: 0.0,
        wavelengths: VEC3_ZERO,
        sunset_tint: VEC3_ZERO,
        sunset_glow: VEC3_ZERO,
        sunset_horizon: VEC3_ZERO,
        fog_color: VEC3_ZERO,
        fog_density: 0.0,
        fog_height_m: 0.0,
        cloud_max_height_m: 0.0,
    };
}

const VEC3_ZERO: Vec3 = Vec3 { x: 0.0, y: 0.0, z: 0.0 };

/// C designated-initializer zero fill: every field a `BODIES` entry
/// doesn't set explicitly is zero / false / the zero enum value.
const ZERO_BODY: BodyConfig = BodyConfig {
    id: BodyId::Tenebris,
    name: "",
    radius_m: 0.0,
    seed: 0,
    max_lod_depth: 0,
    subdivisions: 0,
    gravity_g: 0.0,
    pos_x: 0.0,
    pos_y: 0.0,
    pos_z: 0.0,
    has_water: false,
    barren: false,
    icy: false,
    is_asteroid: false,
    tileset: Tileset::Earth,
    atmo_radius_mult: 0.0,
    atmo_lower_radius_mult: 0.0,
    atmo_rayleigh_scale: 0.0,
    atmo_mie_scale: 0.0,
    atmo_sun_intensity: 0.0,
    atmo_sunset_strength: 0.0,
    atmo_wavelengths: VEC3_ZERO,
    atmo_mie_g: 0.0,
    atmo_scale_height: 0.0,
    atmo_sunset_tint: VEC3_ZERO,
    atmo_sunset_glow: VEC3_ZERO,
    atmo_sunset_horizon: VEC3_ZERO,
    atmo_fog_color: VEC3_ZERO,
    atmo_fog_density: 0.0,
    atmo_fog_height_m: 0.0,
    atmo_cloud_max_height_m: 0.0,
    /* has_water bodies get an atmosphere by default; atmosphere.yaml
     * `enabled: 0` flips this off per body. */
    atmo_enabled: true,
    gravity_full_mult: 0.0,
    gravity_falloff_mult: 0.0,
};

/* Layout (planets at least 10 km apart, moons at least 5 km from
 * any other body): four planets at axis tips ~20 km from world
 * origin, six moons at 6 km tangent offsets from their parent,
 * ten asteroids scattered in an outer ring at 25-30 km. Pairwise
 * planet distance is 20-28 km, moon-to-anything distance is 6-30
 * km, no two bodies are closer than ~6 km.  Old layout had
 * everything clustered within 3 km of origin which made every
 * gravity well overlap and visually pancaked the system. */
const BODIES_INIT: [BodyConfig; BODY_COUNT] = [
    /* ---- main planet ---- */
    BodyConfig {
        id: BodyId::Tenebris,
        name: "Tenebris",
        radius_m: 300.0,
        seed: 0x7e7e6815,
        subdivisions: 6,
        gravity_g: 1.0,
        has_water: true,
        ..ZERO_BODY
    },
    /* ---- Tenebris moons ---- */
    BodyConfig {
        id: BodyId::Luna,
        name: "Luna",
        radius_m: 80.0,
        seed: 0xCAFEBEEF,
        subdivisions: 4,
        gravity_g: 0.4,
        pos_y: 6000.0,
        barren: true,
        ..ZERO_BODY
    },
    BodyConfig {
        id: BodyId::Selene,
        name: "Selene",
        radius_m: 50.0,
        seed: 0x12345678,
        subdivisions: 4,
        gravity_g: 0.25,
        pos_y: -6000.0,
        barren: true,
        ..ZERO_BODY
    },
    /* ---- Sequoia (green sister planet) + moons ---- */
    BodyConfig {
        id: BodyId::Sequoia,
        name: "Sequoia",
        radius_m: 360.0,
        seed: 0x5E9A01A1,
        subdivisions: 6,
        gravity_g: 1.1,
        pos_x: 20000.0,
        has_water: true,
        tileset: Tileset::Sequoia,
        ..ZERO_BODY
    },
    BodyConfig {
        id: BodyId::Verdant,
        name: "Verdant",
        radius_m: 60.0,
        seed: 0x0FACE001,
        subdivisions: 4,
        gravity_g: 0.3,
        pos_x: 20000.0,
        pos_y: 6000.0,
        barren: true,
        ..ZERO_BODY
    },
    BodyConfig {
        id: BodyId::Sprout,
        name: "Sprout",
        radius_m: 36.0,
        seed: 0x59E0A710,
        subdivisions: 3,
        gravity_g: 0.15,
        pos_x: 20000.0,
        pos_y: -6000.0,
        barren: true,
        ..ZERO_BODY
    },
    /* ---- Crag (barren red planet) + moon ---- */
    BodyConfig {
        id: BodyId::Crag,
        name: "Crag",
        radius_m: 190.0,
        seed: 0xC2A6B10C,
        subdivisions: 5,
        gravity_g: 0.6,
        pos_x: -20000.0,
        barren: true,
        tileset: Tileset::Crag,
        ..ZERO_BODY
    },
    BodyConfig {
        id: BodyId::Quartz,
        name: "Quartz",
        radius_m: 44.0,
        seed: 0xC0BA17ED,
        subdivisions: 4,
        gravity_g: 0.2,
        pos_x: -20000.0,
        pos_y: 6000.0,
        barren: true,
        ..ZERO_BODY
    },
    /* ---- Frostbite (icy outer planet) + moon ---- */
    BodyConfig {
        id: BodyId::Frostbite,
        name: "Frostbite",
        radius_m: 220.0,
        seed: 0xF0057B17,
        subdivisions: 5,
        gravity_g: 0.8,
        pos_z: 20000.0,
        icy: true,
        tileset: Tileset::Frost,
        ..ZERO_BODY
    },
    BodyConfig {
        id: BodyId::Rime,
        name: "Rime",
        radius_m: 40.0,
        seed: 0x21CE5001,
        subdivisions: 4,
        gravity_g: 0.15,
        pos_y: 6000.0,
        pos_z: 20000.0,
        icy: true,
        ..ZERO_BODY
    },
    /* ---- Asteroid belt: scattered in an outer ring 25-30 km from
     * the system origin, well clear of every moon's 5 km exclusion
     * zone. Seeds pulled from arbitrary bytes so each asteroid has
     * its own bumpy shape. */
    BodyConfig {
        id: BodyId::Asteroid0,
        name: "Asteroid A",
        radius_m: 14.0,
        seed: 0xA51E0010,
        subdivisions: 3,
        gravity_g: 0.05,
        pos_x: 28000.0,
        pos_y: 800.0,
        pos_z: -3000.0,
        barren: true,
        is_asteroid: true,
        tileset: Tileset::Asteroid,
        ..ZERO_BODY
    },
    BodyConfig {
        id: BodyId::Asteroid1,
        name: "Asteroid B",
        radius_m: 18.0,
        seed: 0xA51E0011,
        subdivisions: 3,
        gravity_g: 0.05,
        pos_x: -28000.0,
        pos_y: 1200.0,
        pos_z: 5000.0,
        barren: true,
        is_asteroid: true,
        tileset: Tileset::Asteroid,
        ..ZERO_BODY
    },
    BodyConfig {
        id: BodyId::Asteroid2,
        name: "Asteroid C",
        radius_m: 10.0,
        seed: 0xA51E0012,
        subdivisions: 3,
        gravity_g: 0.05,
        pos_x: 5000.0,
        pos_y: 800.0,
        pos_z: 28000.0,
        barren: true,
        is_asteroid: true,
        tileset: Tileset::Asteroid,
        ..ZERO_BODY
    },
    BodyConfig {
        id: BodyId::Asteroid3,
        name: "Asteroid D",
        radius_m: 22.0,
        seed: 0xA51E0013,
        subdivisions: 3,
        gravity_g: 0.05,
        pos_x: -5000.0,
        pos_y: 1600.0,
        pos_z: 28000.0,
        barren: true,
        is_asteroid: true,
        tileset: Tileset::Asteroid,
        ..ZERO_BODY
    },
    BodyConfig {
        id: BodyId::Asteroid4,
        name: "Asteroid E",
        radius_m: 12.0,
        seed: 0xA51E0014,
        subdivisions: 3,
        gravity_g: 0.05,
        pos_x: 22000.0,
        pos_y: -2000.0,
        pos_z: 14000.0,
        barren: true,
        is_asteroid: true,
        tileset: Tileset::Asteroid,
        ..ZERO_BODY
    },
    BodyConfig {
        id: BodyId::Asteroid5,
        name: "Asteroid F",
        radius_m: 16.0,
        seed: 0xA51E0015,
        subdivisions: 3,
        gravity_g: 0.05,
        pos_x: -22000.0,
        pos_y: 1200.0,
        pos_z: 14000.0,
        barren: true,
        is_asteroid: true,
        tileset: Tileset::Asteroid,
        ..ZERO_BODY
    },
    BodyConfig {
        id: BodyId::Asteroid6,
        name: "Asteroid G",
        radius_m: 20.0,
        seed: 0xA51E0016,
        subdivisions: 3,
        gravity_g: 0.05,
        pos_x: 22000.0,
        pos_y: -1800.0,
        pos_z: -14000.0,
        barren: true,
        is_asteroid: true,
        tileset: Tileset::Asteroid,
        ..ZERO_BODY
    },
    BodyConfig {
        id: BodyId::Asteroid7,
        name: "Asteroid H",
        radius_m: 13.0,
        seed: 0xA51E0017,
        subdivisions: 3,
        gravity_g: 0.05,
        pos_x: -22000.0,
        pos_y: 1000.0,
        pos_z: -14000.0,
        barren: true,
        is_asteroid: true,
        tileset: Tileset::Asteroid,
        ..ZERO_BODY
    },
    BodyConfig {
        id: BodyId::Asteroid8,
        name: "Asteroid I",
        radius_m: 19.0,
        seed: 0xA51E0018,
        subdivisions: 3,
        gravity_g: 0.05,
        pos_x: 14000.0,
        pos_y: 8000.0,
        pos_z: 26000.0,
        barren: true,
        is_asteroid: true,
        tileset: Tileset::Asteroid,
        ..ZERO_BODY
    },
    BodyConfig {
        id: BodyId::Asteroid9,
        name: "Asteroid J",
        radius_m: 15.0,
        seed: 0xA51E0019,
        subdivisions: 3,
        gravity_g: 0.05,
        pos_x: -14000.0,
        pos_y: 2000.0,
        pos_z: 26000.0,
        barren: true,
        is_asteroid: true,
        tileset: Tileset::Asteroid,
        ..ZERO_BODY
    },
];

/// Port of the C `static body_config_t BODIES[BODY_COUNT]` global -
/// mutable (atmosphere patches), so Mutex-protected like the config.rs
/// globals.
static BODIES: Mutex<[BodyConfig; BODY_COUNT]> = Mutex::new(BODIES_INIT);

/// Port of `planet_get()` for a typed id (infallible - the enum can't
/// be out of range). Returns a copy; the C API returns a pointer into
/// the global table.
pub fn get(id: BodyId) -> BodyConfig {
    BODIES.lock().unwrap()[id as usize]
}

/// Port of `planet_get()` for a raw integer id - mirrors the C
/// "NULL when id is out of range" behavior.
pub fn get_by_index(index: i32) -> Option<BodyConfig> {
    BodyId::from_index(index).map(get)
}

/// Port of `planet_subdivisions_for_radius()`.
///
/// Pick the Goldberg subdivision count that gives ~1 m hex tile width
/// on a body of the given radius, capped at 7 (~164k tiles per body)
/// for memory sanity on big planets. The `BodyConfig::subdivisions`
/// field is treated as a hint - main_web.c uses this helper at
/// world_create time so radii can change without per-body retuning.
pub fn subdivisions_for_radius(radius_m: f64) -> i32 {
    /* Goldberg(m, 0) on a sphere of radius R has tile width
     * w ~ 1.05 R / m, where m = 2^subdivisions. So for a target
     * width of 1 m: m ~ 1.05 R, subdivisions ~ ceil(log2(1.05 R)).
     *
     * Clamp to [3, 7].
     *   - Lower bound keeps tiny asteroids from collapsing to a
     *     92-tile pentakis dodecahedron silhouette.
     *   - Upper bound is a vertex-shader-bandwidth limit, NOT a
     *     memory limit. Visible vertex count is bounded by the
     *     chunk-level backface cull, whose granularity is the
     *     renderer's mesh_chunk_count knob (lod.yaml). Raising that
     *     (finer chunks, tighter cull) is what would let the
     *     subdivision cap climb past 7 without flooding the VS; until
     *     then, big planets cap at ~2.5 m hex width. */
    if radius_m < 1.0 {
        return 3;
    }
    let m_target = 1.05 * radius_m;
    let mut subdiv = m_target.log2().ceil() as i32;
    if subdiv < 3 {
        subdiv = 3;
    }
    if subdiv > 7 {
        subdiv = 7;
    }
    subdiv
}

/// Rust-port extension: override a body's worldgen seed at runtime.
/// SP worlds each carry their own seed (persisted per world by the
/// client); the app patches the spawn body here before regenerating
/// its `World` so every `planet_gen` / `tile_hash` consumer sees the
/// same value. Same Mutex-patch pattern as `set_atmosphere`.
pub fn set_seed(id: BodyId, seed: u64) {
    BODIES.lock().unwrap()[id as usize].seed = seed;
}

/// The compiled-in default seed for a body, unaffected by any
/// `set_seed` patch. Pre-seed-feature SP saves and MP terrain assume
/// this value - both map "no stored seed" to the default so existing
/// worlds keep their terrain.
pub fn default_seed(id: BodyId) -> u64 {
    BODIES_INIT[id as usize].seed
}

/// Deterministically derive a per-body worldgen seed from a single SP
/// world seed, so EVERY planet in the world - not just the spawn body -
/// runs the biome-active generator (oceans, rivers, biome remap) with a
/// terrain unique to that world.
///
/// - **Identity at the spawn body (Tenebris):** `derive(ws, Tenebris) ==
///   ws`, so the spawn planet's terrain is byte-identical to today and
///   the `w.body.seed == target_seed` regen-guard stays valid.
/// - **Every other body** gets a splitmix64-avalanched, per-id-offset
///   seed that is *guaranteed* to differ from its compiled default (the
///   explicit collision guard), so `planet_gen::biomes_active` is always
///   true for it and its biome layer switches on.
///
/// This is a PERMANENT determinism contract: a world persists only its
/// single seed, and every reload re-derives the sisters from it. Changing
/// this function re-rolls every existing world's sister planets, so don't.
pub fn derive_body_seed(world_seed: u64, id: BodyId) -> u64 {
    if id == BodyId::Tenebris {
        return world_seed;
    }
    /* splitmix64 finalizer, offset per body by the golden-ratio odd
     * constant so two bodies never share a noise stream even for a
     * structured world seed. The constants are the algorithm's identity
     * (the "no magic numbers" hash-constant exception), so they stay
     * inline. */
    let mut z = world_seed.wrapping_add(0x9E37_79B9_7F4A_7C15u64.wrapping_mul(id as u64 + 1));
    z = (z ^ (z >> 30)).wrapping_mul(0xBF58_476D_1CE4_E5B9);
    z = (z ^ (z >> 27)).wrapping_mul(0x94D0_49BB_1331_11EB);
    z ^= z >> 31;
    if z == default_seed(id) {
        z ^= 0x9E37_79B9_7F4A_7C15; /* hard non-collision -> biomes_active */
    }
    z
}

/// Port of `planet_set_atmosphere()`. Apply a YAML-loaded atmosphere
/// patch on top of a body's compiled-in defaults. Each field is only
/// assigned when the patch's value is non-zero, so an empty patch is a
/// no-op and a YAML file can express partial overrides (e.g. "Sequoia:
/// just bump rayleigh_scale to 1.2").
pub fn set_atmosphere(id: BodyId, p: &BodyAtmo) {
    let mut bodies = BODIES.lock().unwrap();
    let b = &mut bodies[id as usize];
    /* enabled: -1 unspecified (keep default), 0 = off, >0 = on. */
    if p.enabled >= 0.0 {
        b.atmo_enabled = p.enabled > 0.5;
    }
    if p.radius_mult > 0.0 {
        b.atmo_radius_mult = p.radius_mult;
    }
    if p.lower_radius_mult > 0.0 {
        b.atmo_lower_radius_mult = p.lower_radius_mult;
    }
    if p.rayleigh_scale > 0.0 {
        b.atmo_rayleigh_scale = p.rayleigh_scale;
    }
    if p.mie_scale > 0.0 {
        b.atmo_mie_scale = p.mie_scale;
    }
    if p.sun_intensity > 0.0 {
        b.atmo_sun_intensity = p.sun_intensity;
    }
    if p.sunset_strength > 0.0 {
        b.atmo_sunset_strength = p.sunset_strength;
    }
    if p.scale_height > 0.0 {
        b.atmo_scale_height = p.scale_height;
    }
    if p.mie_g > 0.0 {
        b.atmo_mie_g = p.mie_g;
    }
    if p.wavelengths.x + p.wavelengths.y + p.wavelengths.z > 0.0 {
        b.atmo_wavelengths = p.wavelengths;
    }
    if p.sunset_tint.x + p.sunset_tint.y + p.sunset_tint.z > 0.0 {
        b.atmo_sunset_tint = p.sunset_tint;
    }
    if p.sunset_glow.x + p.sunset_glow.y + p.sunset_glow.z > 0.0 {
        b.atmo_sunset_glow = p.sunset_glow;
    }
    if p.sunset_horizon.x + p.sunset_horizon.y + p.sunset_horizon.z > 0.0 {
        b.atmo_sunset_horizon = p.sunset_horizon;
    }
    if p.fog_color.x + p.fog_color.y + p.fog_color.z > 0.0 {
        b.atmo_fog_color = p.fog_color;
    }
    if p.fog_density > 0.0 {
        b.atmo_fog_density = p.fog_density;
    }
    if p.fog_height_m > 0.0 {
        b.atmo_fog_height_m = p.fog_height_m;
    }
    if p.cloud_max_height_m > 0.0 {
        b.atmo_cloud_max_height_m = p.cloud_max_height_m;
    }
}

/// Port of `gravity_query_t`. `body` is a copy of the strongest-pull
/// body's config (the C struct holds a pointer), or `None` in deep
/// space.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct GravityQuery {
    /// strongest-pull body, or None in deep space
    pub body: Option<BodyConfig>,
    /// 0..1 - 0 means in space
    pub multiplier: f32,
    /// dist_to_centre - body.radius_m
    pub altitude_m: f64,
}

/// Port of `planet_gravity_at()`. Gravity-influence query. For every
/// body in the system, computes
///   multiplier = clamp01( 1 - (dist - r * full_mult)
///                          / (r * (falloff_mult - full_mult)) )
/// and returns whichever body delivers the largest non-zero multiplier
/// at `world_pos`. When the position is outside every body's falloff
/// radius the player is "in space" - `body` comes back `None` and
/// `multiplier` is 0.
///
/// Drives both (a) the active body the player is anchored to (used
/// for gravity, surface basis, atmosphere shell) and (b) the
/// `is_in_space` flag that flips the player into 6DOF flight.
pub fn gravity_at(world_pos: DVec3, full_default: f32, falloff_default: f32) -> GravityQuery {
    let bodies = BODIES.lock().unwrap();
    let mut q = GravityQuery {
        body: None,
        multiplier: 0.0,
        altitude_m: 0.0,
    };
    /* Walk every body and pick the strongest-pull one. We can't just
     * pick the closest - Crag's gravity well overlaps Quartz's, and
     * the moon you're hovering above should win even when the parent
     * planet's centre is technically further. The multiplier is
     * monotonic in (radius - distance) within the falloff band, so
     * "largest multiplier" is the right tie-break. */
    for b in bodies.iter() {
        let dx = world_pos.x - b.pos_x;
        let dy = world_pos.y - b.pos_y;
        let dz = world_pos.z - b.pos_z;
        let dist = (dx * dx + dy * dy + dz * dz).sqrt();
        let full = if b.gravity_full_mult > 0.0 {
            b.gravity_full_mult
        } else {
            full_default
        };
        let mut fall = if b.gravity_falloff_mult > 0.0 {
            b.gravity_falloff_mult
        } else {
            falloff_default
        };
        if fall <= full {
            fall = full + 0.01; /* guard against bad config */
        }
        let r_full = b.radius_m * full as f64;
        let r_fall = b.radius_m * fall as f64;
        let mult: f32;
        if dist <= r_full {
            mult = 1.0;
        } else if dist >= r_fall {
            continue; /* outside falloff - no pull from this body */
        } else {
            mult = (1.0 - (dist - r_full) / (r_fall - r_full)) as f32;
        }
        if mult > q.multiplier {
            q.body = Some(*b);
            q.multiplier = mult;
            q.altitude_m = dist - b.radius_m;
        }
    }
    q
}

/// Surface gravity in m/s^2 for a body with `gravity_g == 1.0`. The
/// planet-mode walker has always used 25 m/s^2 (arcade-scaled to the ~300 m
/// planets); the orbital field below anchors to the same value so space and
/// surface physics agree at the surface. One shared constant, not two magic
/// numbers.
pub const SURFACE_GRAVITY_MPS2_PER_G: f32 = 25.0;

/// Newtonian orbital gravity: the summed inverse-square acceleration from
/// EVERY body at `world_pos` (m/s^2, world-space vector pointing at the
/// masses). Each body's field is anchored to its surface gravity
/// (`SURFACE_GRAVITY_MPS2_PER_G * gravity_g` at `radius_m`) and falls off as
/// `(R / dist)^2`, so a prograde burn in space raises a real transfer arc and
/// an unpowered coast falls toward the nearest mass - this is what makes
/// orbits (and reaching a moon on a fuel budget) possible.
///
/// Complements [`gravity_at`], which picks the single ANCHOR body inside a
/// falloff band (surface basis, atmosphere, the `is_in_space` flip). This is
/// the long-range force field the space integrator applies every frame.
pub fn orbital_gravity_at(world_pos: DVec3) -> DVec3 {
    let bodies = BODIES.lock().unwrap();
    let mut acc = DVec3 { x: 0.0, y: 0.0, z: 0.0 };
    for b in bodies.iter() {
        let dx = b.pos_x - world_pos.x;
        let dy = b.pos_y - world_pos.y;
        let dz = b.pos_z - world_pos.z;
        let d2 = dx * dx + dy * dy + dz * dz;
        /* Clamp inside half the radius so a query at/near the exact centre
         * can't blow the integrator up (space mode never runs there, but the
         * field function should still be total). */
        let min_d = b.radius_m * 0.5;
        let d2 = d2.max(min_d * min_d);
        let d = d2.sqrt();
        let g_surface = (SURFACE_GRAVITY_MPS2_PER_G * b.gravity_g) as f64;
        let a = g_surface * (b.radius_m * b.radius_m) / d2;
        acc.x += dx / d * a;
        acc.y += dy / d * a;
        acc.z += dz / d * a;
    }
    acc
}

/* ------------------------------------------------------------------------ */
/* Atmosphere YAML glue - the planet half of C's config_load_atmosphere
 * (find_body_by_key + planet_set_atmosphere), wired into the parser
 * entry points exposed by config.rs. */

/// Port of `find_body_by_key` (config.c): find the body whose
/// normalised name (spaces -> underscores, lowercased) matches `key`.
/// Returns -1 if no match - the caller logs + skips; an unknown
/// section is a non-fatal warning so renaming a body in code doesn't
/// brick the loader.
fn find_body_by_key(key: &str) -> i32 {
    let bodies = BODIES.lock().unwrap();
    for (id, b) in bodies.iter().enumerate() {
        if config::normalise_name(b.name) == key {
            return id as i32;
        }
    }
    -1
}

fn apply_patch(id: i32, patch: &BodyAtmo) {
    if let Some(body_id) = BodyId::from_index(id) {
        set_atmosphere(body_id, patch);
    }
}

/// Port of `config_load_atmosphere()` with the planet glue wired in.
pub fn load_atmosphere(path: &str) -> i32 {
    config::load_atmosphere_with(path, find_body_by_key, apply_patch)
}

/// Parse-from-memory variant for the WASM path (preloaded file bytes).
pub fn parse_atmosphere(src: &str, path: &str) -> i32 {
    config::parse_atmosphere_with(src, path, find_body_by_key, apply_patch)
}

/* ------------------------------------------------------------------------ */

#[cfg(test)]
mod tests {
    use super::*;
    use crate::math::dvec3_make;

    /* Pinned values generated from the C source of truth: planet.c
     * compiled with gcc -O2 -fwrapv (x86-64, SSE2) and dumped as bit
     * patterns. Comparisons are bit-exact. */

    /// The body table is process-wide and mutable via set_atmosphere;
    /// tests that read or write it serialise on this lock and restore
    /// pristine state first.
    static TEST_LOCK: Mutex<()> = Mutex::new(());

    fn lock_and_reset() -> std::sync::MutexGuard<'static, ()> {
        let guard = TEST_LOCK.lock().unwrap_or_else(|e| e.into_inner());
        *BODIES.lock().unwrap() = BODIES_INIT;
        guard
    }

    #[test]
    fn orbital_gravity_matches_surface_and_falls_off_inverse_square() {
        let _g = lock_and_reset();
        /* Tenebris: origin, radius 300, gravity_g 1.0. At the surface the
         * field magnitude is the shared surface constant (other bodies sit
         * ~6 km out and contribute only millinewtons). */
        let a_surf = orbital_gravity_at(dvec3_make(300.0, 0.0, 0.0));
        let mag_surf = (a_surf.x * a_surf.x + a_surf.y * a_surf.y + a_surf.z * a_surf.z).sqrt();
        assert!(
            (mag_surf - SURFACE_GRAVITY_MPS2_PER_G as f64).abs() < 0.1,
            "surface field ~{} m/s^2, got {}",
            SURFACE_GRAVITY_MPS2_PER_G,
            mag_surf
        );
        /* Points AT the planet (negative x from +x side). */
        assert!(a_surf.x < 0.0 && a_surf.x.abs() > mag_surf * 0.99);
        /* Inverse square: at 2R the pull is ~1/4 the surface value. */
        let a_2r = orbital_gravity_at(dvec3_make(600.0, 0.0, 0.0));
        let mag_2r = (a_2r.x * a_2r.x + a_2r.y * a_2r.y + a_2r.z * a_2r.z).sqrt();
        assert!(
            (mag_2r - mag_surf / 4.0).abs() < 0.1,
            "2R field ~{}, got {}",
            mag_surf / 4.0,
            mag_2r
        );
        /* Total function: the exact centre doesn't blow up. */
        let a_c = orbital_gravity_at(dvec3_make(0.0, 0.0, 0.0));
        assert!(a_c.x.is_finite() && a_c.y.is_finite() && a_c.z.is_finite());
        /* A circular-orbit speed at 2R exists and is finite: v = sqrt(a*r). */
        let v_orbit = (mag_2r * 600.0).sqrt();
        assert!(v_orbit > 10.0 && v_orbit < 200.0, "orbit speed {}", v_orbit);
    }

    // (radius_bits, seed, subdivisions, gravity_bits, pos_bits[3], flags, tileset)
    const BODY_PINS: [(u64, u64, i32, u32, [u64; 3], u32, u32); 20] = [
        (0x4072c00000000000, 0x000000007e7e6815, 6, 0x3f800000, [0x0000000000000000, 0x0000000000000000, 0x0000000000000000], 1, 0), // Tenebris
        (0x4054000000000000, 0x00000000cafebeef, 4, 0x3ecccccd, [0x0000000000000000, 0x40b7700000000000, 0x0000000000000000], 2, 0), // Luna
        (0x4049000000000000, 0x0000000012345678, 4, 0x3e800000, [0x0000000000000000, 0xc0b7700000000000, 0x0000000000000000], 2, 0), // Selene
        (0x4076800000000000, 0x000000005e9a01a1, 6, 0x3f8ccccd, [0x40d3880000000000, 0x0000000000000000, 0x0000000000000000], 1, 1), // Sequoia
        (0x404e000000000000, 0x000000000face001, 4, 0x3e99999a, [0x40d3880000000000, 0x40b7700000000000, 0x0000000000000000], 2, 0), // Verdant
        (0x4042000000000000, 0x0000000059e0a710, 3, 0x3e19999a, [0x40d3880000000000, 0xc0b7700000000000, 0x0000000000000000], 2, 0), // Sprout
        (0x4067c00000000000, 0x00000000c2a6b10c, 5, 0x3f19999a, [0xc0d3880000000000, 0x0000000000000000, 0x0000000000000000], 2, 2), // Crag
        (0x4046000000000000, 0x00000000c0ba17ed, 4, 0x3e4ccccd, [0xc0d3880000000000, 0x40b7700000000000, 0x0000000000000000], 2, 0), // Quartz
        (0x406b800000000000, 0x00000000f0057b17, 5, 0x3f4ccccd, [0x0000000000000000, 0x0000000000000000, 0x40d3880000000000], 4, 3), // Frostbite
        (0x4044000000000000, 0x0000000021ce5001, 4, 0x3e19999a, [0x0000000000000000, 0x40b7700000000000, 0x40d3880000000000], 4, 0), // Rime
        (0x402c000000000000, 0x00000000a51e0010, 3, 0x3d4ccccd, [0x40db580000000000, 0x4089000000000000, 0xc0a7700000000000], 10, 4), // Asteroid A
        (0x4032000000000000, 0x00000000a51e0011, 3, 0x3d4ccccd, [0xc0db580000000000, 0x4092c00000000000, 0x40b3880000000000], 10, 4), // Asteroid B
        (0x4024000000000000, 0x00000000a51e0012, 3, 0x3d4ccccd, [0x40b3880000000000, 0x4089000000000000, 0x40db580000000000], 10, 4), // Asteroid C
        (0x4036000000000000, 0x00000000a51e0013, 3, 0x3d4ccccd, [0xc0b3880000000000, 0x4099000000000000, 0x40db580000000000], 10, 4), // Asteroid D
        (0x4028000000000000, 0x00000000a51e0014, 3, 0x3d4ccccd, [0x40d57c0000000000, 0xc09f400000000000, 0x40cb580000000000], 10, 4), // Asteroid E
        (0x4030000000000000, 0x00000000a51e0015, 3, 0x3d4ccccd, [0xc0d57c0000000000, 0x4092c00000000000, 0x40cb580000000000], 10, 4), // Asteroid F
        (0x4034000000000000, 0x00000000a51e0016, 3, 0x3d4ccccd, [0x40d57c0000000000, 0xc09c200000000000, 0xc0cb580000000000], 10, 4), // Asteroid G
        (0x402a000000000000, 0x00000000a51e0017, 3, 0x3d4ccccd, [0xc0d57c0000000000, 0x408f400000000000, 0xc0cb580000000000], 10, 4), // Asteroid H
        (0x4033000000000000, 0x00000000a51e0018, 3, 0x3d4ccccd, [0x40cb580000000000, 0x40bf400000000000, 0x40d9640000000000], 10, 4), // Asteroid I
        (0x402e000000000000, 0x00000000a51e0019, 3, 0x3d4ccccd, [0xc0cb580000000000, 0x409f400000000000, 0x40d9640000000000], 10, 4), // Asteroid J
    ];

    const BODY_NAMES: [&str; 20] = [
        "Tenebris", "Luna", "Selene", "Sequoia", "Verdant", "Sprout", "Crag", "Quartz",
        "Frostbite", "Rime", "Asteroid A", "Asteroid B", "Asteroid C", "Asteroid D",
        "Asteroid E", "Asteroid F", "Asteroid G", "Asteroid H", "Asteroid I", "Asteroid J",
    ];

    #[test]
    fn body_table_matches_c() {
        let _g = lock_and_reset();
        for (i, id) in BodyId::ALL.iter().enumerate() {
            let b = get(*id);
            let (radius, seed, subdiv, grav, pos, flags, tileset) = BODY_PINS[i];
            assert_eq!(*id as i32, i as i32);
            assert_eq!(b.id, *id);
            assert_eq!(b.name, BODY_NAMES[i], "body {}", i);
            assert_eq!(b.radius_m.to_bits(), radius, "radius of {}", b.name);
            assert_eq!(b.seed, seed, "seed of {}", b.name);
            assert_eq!(b.subdivisions, subdiv, "subdivisions of {}", b.name);
            assert_eq!(b.max_lod_depth, 0);
            assert_eq!(b.gravity_g.to_bits(), grav, "gravity of {}", b.name);
            assert_eq!(b.pos_x.to_bits(), pos[0], "pos_x of {}", b.name);
            assert_eq!(b.pos_y.to_bits(), pos[1], "pos_y of {}", b.name);
            assert_eq!(b.pos_z.to_bits(), pos[2], "pos_z of {}", b.name);
            let got_flags = (b.has_water as u32)
                | ((b.barren as u32) << 1)
                | ((b.icy as u32) << 2)
                | ((b.is_asteroid as u32) << 3);
            assert_eq!(got_flags, flags, "flags of {}", b.name);
            assert_eq!(b.tileset as u32, tileset, "tileset of {}", b.name);
            /* Atmosphere + gravity overrides ship zeroed. */
            assert_eq!(b.atmo_radius_mult, 0.0);
            assert_eq!(b.atmo_wavelengths, VEC3_ZERO);
            assert_eq!(b.gravity_full_mult, 0.0);
            assert_eq!(b.gravity_falloff_mult, 0.0);
        }
        /* Out-of-range int ids mirror the C NULL path. */
        assert!(get_by_index(-1).is_none());
        assert!(get_by_index(BODY_COUNT as i32).is_none());
        assert_eq!(get_by_index(3).unwrap().name, "Sequoia");
    }

    const SUBDIV_RADII: [f64; 16] = [
        0.5, 1.0, 2.0, 7.9, 10.0, 14.0, 36.0, 44.0, 80.0, 121.0, 122.0, 190.0, 220.0, 300.0,
        360.0, 5000.0,
    ];
    const SUBDIV_PINS: [i32; 16] = [3, 3, 3, 4, 4, 4, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7];

    #[test]
    fn subdivisions_for_radius_matches_c() {
        for (i, r) in SUBDIV_RADII.iter().enumerate() {
            assert_eq!(
                subdivisions_for_radius(*r),
                SUBDIV_PINS[i],
                "radius {}",
                r
            );
        }
    }

    /// (pos, full_default, falloff_default) for GRAVITY_PINS.
    const GRAVITY_QUERIES: [(f64, f64, f64, f32, f32); 10] = [
        (0.0, 350.0, 0.0, 1.4, 1.8),         /* Tenebris, full zone     */
        (0.0, 480.0, 0.0, 1.4, 1.8),         /* Tenebris, falloff band  */
        (0.0, 539.9, 0.0, 1.4, 1.8),         /* just inside falloff     */
        (0.0, 545.0, 0.0, 1.4, 1.8),         /* just outside - space    */
        (0.0, 6130.0, 0.0, 1.4, 1.8),        /* Luna falloff band       */
        (20000.0, 90.0, 350.0, 1.4, 1.8),    /* Sequoia, near surface   */
        (-20000.0, 6050.0, 10.0, 1.4, 1.8),  /* Quartz, full zone       */
        (14000.0, 8020.0, 26010.0, 1.4, 1.8),/* Asteroid I, full zone   */
        (10000.0, 0.0, 0.0, 1.4, 1.8),       /* deep space              */
        (0.0, 450.0, 0.0, 1.0, 2.0),         /* custom defaults: 0.5    */
    ];

    // (body_index_or_-1, multiplier_bits, altitude_bits)
    const GRAVITY_PINS: [(i32, u32, u64); 10] = [
        (0, 0x3f800000, 0x4049000000000000),
        (0, 0x3efffffd, 0x4066800000000000),
        (0, 0x3a5a6c0f, 0x406dfccccccccccc),
        (-1, 0x00000000, 0x0000000000000000),
        (1, 0x3edffffd, 0x4049000000000000),
        (3, 0x3f800000, 0x3ff62df503a11f00),
        (7, 0x3f800000, 0x401bf5f5b6b5dfa0),
        (18, 0x3f800000, 0x400ae2ac13ef8e90),
        (-1, 0x00000000, 0x0000000000000000),
        (0, 0x3f000000, 0x4062c00000000000),
    ];

    #[test]
    fn gravity_at_matches_c() {
        let _g = lock_and_reset();
        for (i, (x, y, z, full, fall)) in GRAVITY_QUERIES.iter().enumerate() {
            let q = gravity_at(dvec3_make(*x, *y, *z), *full, *fall);
            let (want_body, want_mult, want_alt) = GRAVITY_PINS[i];
            let got_body = q.body.map(|b| b.id as i32).unwrap_or(-1);
            assert_eq!(got_body, want_body, "query {}", i);
            assert_eq!(q.multiplier.to_bits(), want_mult, "multiplier, query {}", i);
            assert_eq!(q.altitude_m.to_bits(), want_alt, "altitude, query {}", i);
        }
    }

    #[test]
    fn set_atmosphere_merges_only_nonzero_fields() {
        let _g = lock_and_reset();
        /* Same patch the C pin run applied to Sequoia:
         * rayleigh 1.25, wavelengths (1,2,3); everything else zero.
         * C output: rayleigh 1.25 mie 0 wl (1,2,3) tint (0,0,0). */
        let patch = BodyAtmo {
            rayleigh_scale: 1.25,
            wavelengths: Vec3 { x: 1.0, y: 2.0, z: 3.0 },
            ..BodyAtmo::ZERO
        };
        set_atmosphere(BodyId::Sequoia, &patch);
        let b = get(BodyId::Sequoia);
        assert_eq!(b.atmo_rayleigh_scale, 1.25);
        assert_eq!(b.atmo_mie_scale, 0.0);
        assert_eq!(b.atmo_wavelengths, Vec3 { x: 1.0, y: 2.0, z: 3.0 });
        assert_eq!(b.atmo_sunset_tint, VEC3_ZERO);

        /* An all-zero patch is a no-op (does not clear prior values). */
        set_atmosphere(BodyId::Sequoia, &BodyAtmo::ZERO);
        let b = get(BodyId::Sequoia);
        assert_eq!(b.atmo_rayleigh_scale, 1.25);
        assert_eq!(b.atmo_wavelengths, Vec3 { x: 1.0, y: 2.0, z: 3.0 });

        /* Untouched body unaffected. */
        assert_eq!(get(BodyId::Tenebris).atmo_rayleigh_scale, 0.0);
        *BODIES.lock().unwrap() = BODIES_INIT;
    }

    #[test]
    fn atmosphere_yaml_glue_patches_by_normalised_name() {
        let _g = lock_and_reset();
        let src = "\
tenebris:
  sun_intensity: 9.0
asteroid_a:
  mie_g: 0.5
phantom:
  sun_intensity: 99.0
";
        assert_eq!(parse_atmosphere(src, "atmosphere.yaml"), 0);
        assert_eq!(get(BodyId::Tenebris).atmo_sun_intensity, 9.0);
        assert_eq!(get(BodyId::Asteroid0).atmo_mie_g, 0.5);
        /* Unknown section skipped; nothing else got 99. */
        for id in BodyId::ALL {
            assert_ne!(get(id).atmo_sun_intensity, 99.0);
        }
        *BODIES.lock().unwrap() = BODIES_INIT;
    }

    #[test]
    fn real_atmosphere_yaml_loads_when_present() {
        let _g = lock_and_reset();
        let path = concat!(
            env!("CARGO_MANIFEST_DIR"),
            "/../../assets/config/atmosphere.yaml"
        );
        let rc = load_atmosphere(path);
        assert_ne!(rc, -2, "atmosphere.yaml should parse without errors");
        if rc == 0 {
            /* The shipped file sets Tenebris radius_mult: 1.6. */
            assert!(get(BodyId::Tenebris).atmo_radius_mult > 0.0);
        }
        *BODIES.lock().unwrap() = BODIES_INIT;
    }
}
