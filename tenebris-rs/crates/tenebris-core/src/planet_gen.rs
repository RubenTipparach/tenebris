//! Port of `tenebris-c/src/core/planet_gen.{c,h}`.
//!
//! Deterministic planet surface generator. Given a unit direction on
//! the sphere, returns the surface altitude in meters relative to the
//! body's base radius. Lives in core/ because client and server must
//! agree byte-for-byte.
//!
//! Surface generator: direct port of src/workers/terrainGenerationWorker.ts
//! - same four layers (continental / mountain / hill / detail), same
//! octave counts, same weights. The underlying primitive is 3D gradient
//! (Perlin) noise (`rng::gnoise3d_seed`).
//!
//! Every function must produce bit-identical output to the C build for
//! the same inputs - world content depends on it. All float math stays
//! in f32 with the same order of operations; the two `pow` calls go
//! through f64 exactly like the C `(float)pow((double)x, e)` casts.
//!
//! Renames (per PORTING.md rule 4 - module prefix dropped):
//! - `planet_surface_altitude()`     -> `planet_gen::surface_altitude()`
//! - `planet_profile()`              -> `planet_gen::profile()`
//! - `planet_sample()`               -> `planet_gen::sample()`
//! - `planet_sample_with_profile()`  -> `planet_gen::sample_with_profile()`
//! - `column_profile_t`              -> `planet_gen::ColumnProfile`
//!
//! The tuning constants below are ported verbatim from the C #defines
//! (which in turn mirror the JS reference); they are part of the
//! generator's identity - changing any of them regenerates every world.

use crate::blocks::Block;
use crate::math::DVec3;
use crate::planet::{BodyConfig, Tileset};
use crate::rng::gnoise3d_seed;

/* Scale values are JS literals since we're now matching Tenebris JS
 * planet proportions (radius ~= 150 m with one full Goldberg mesh). */
const CONTINENT_SCALE: f32 = 0.8;
const MOUNTAIN_SCALE: f32 = 2.5;
const HILL_SCALE: f32 = 5.0;
const DETAIL_SCALE: f32 = 12.0;

const CONTINENT_WEIGHT: f32 = 0.7;
const MOUNTAIN_HEIGHT: f32 = 0.8;
const HILL_WEIGHT: f32 = 0.15;
const DETAIL_WEIGHT: f32 = 0.05;
const OCEAN_DEPTH_POWER: f32 = 1.3;

/* Heights in voxel blocks (1 m each). With WORLD_MAX_DEPTH = 128 and
 * SEA_LEVEL_IDX = 64, the column has 64 layers below sea (soil + ocean)
 * and 64 layers above. Tunables fit within those budgets. */
/// tallest peak - 40 m above sea
const MAX_LAND_HEIGHT: f32 = 40.0;
/// deepest trench - 24 m below sea
const MAX_OCEAN_DEPTH: f32 = 24.0;
const LAND_BIAS: f32 = 0.20;

/* Biome thresholds (meters relative to body surface). Snow/stone bands
 * scaled up to match the bigger height range. */
const SEA_LEVEL: f32 = 0.0;
const BEACH_BAND: f32 = 2.0;
const SNOW_ELEV: f32 = 22.0;
const STONE_ELEV: f32 = 32.0;
/* Latitude threshold (|sin(lat)|) above which the surface gets the
 * polar / ice-cap treatment. 0.90 caps at ~64 deg latitude;
 * 0.95 caps at ~72 deg, which halves the spherical-cap area
 * (cap area = 2*pi*(1 - sin(lat)), so going from 0.10 to 0.05
 * is the requested "50% smaller ice cap"). */
const POLAR_LATITUDE: f32 = 0.95;
const COLD_LATITUDE: f32 = 0.75;

/* ----------------------------------------------------------------------- */
/* fBm and ridge noise. Octave structure is the same as the JS reference
 * (terrainGenerationWorker.ts), but the underlying primitive is 3D
 * gradient (Perlin) noise - see gnoise3d_seed in rng.rs. Seed is
 * stirred per-octave so octaves don't correlate. gnoise3d_seed already
 * returns [-1, +1]. */

fn fractal3d(
    seed: u64,
    x: f32,
    y: f32,
    z: f32,
    period: f32,
    octaves: i32,
    persistence: f32,
    lacunarity: f32,
) -> f32 {
    let mut value = 0.0f32;
    let mut max_value = 0.0f32;
    let mut amplitude = 1.0f32;
    let mut frequency = period;
    for i in 0..octaves {
        let n = gnoise3d_seed(
            seed.wrapping_add(i as u64 * 1117),
            x * frequency,
            y * frequency,
            z * frequency,
        );
        value += n * amplitude;
        max_value += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
    }
    value / max_value
}

fn ridge3d(
    seed: u64,
    x: f32,
    y: f32,
    z: f32,
    period: f32,
    octaves: i32,
    persistence: f32,
    lacunarity: f32,
) -> f32 {
    let mut value = 0.0f32;
    let mut max_value = 0.0f32;
    let mut amplitude = 1.0f32;
    let mut frequency = period;
    for i in 0..octaves {
        let n = gnoise3d_seed(
            seed.wrapping_add(i as u64 * 1117),
            x * frequency,
            y * frequency,
            z * frequency,
        );
        /* C: 1.0f - (float)fabs(n) - fabs promotes to double and the
         * absolute value of an exact f32 is exact, so f32 abs is
         * bit-identical. */
        let ridge = 1.0f32 - n.abs();
        value += ridge * ridge * amplitude;
        max_value += amplitude;
        amplitude *= persistence;
        frequency *= lacunarity;
    }
    value / max_value
}

/* ----------------------------------------------------------------------- */

/// Port of `planet_surface_altitude()`. Surface altitude at a given
/// unit direction. Positive = above base radius, negative = below.
pub fn surface_altitude(body: &BodyConfig, unit_dir: DVec3) -> f32 {
    let x = unit_dir.x as f32;
    let y = unit_dir.y as f32;
    let z = unit_dir.z as f32;

    /* Continental base - six octaves. sign(n) * |n|^0.8 pushes values
     * toward the extremes so the land/ocean mask has crisp boundaries. */
    let mut continent = fractal3d(body.seed, x, y, z, CONTINENT_SCALE, 6, 0.5, 2.0);
    continent += LAND_BIAS;
    /* C: (float)pow((double)fabs(continent), 0.8) */
    let continent_value = (if continent >= 0.0 { 1.0f32 } else { -1.0f32 })
        * ((continent as f64).abs().powf(0.8) as f32);

    /* Mountain ridges on top of land. */
    let mountain_noise = ridge3d(body.seed, x, y, z, MOUNTAIN_SCALE, 4, 0.5, 2.2);
    let land_factor = if continent_value > 0.0 {
        continent_value
    } else {
        0.0
    };
    let mountain_height = mountain_noise * land_factor * MOUNTAIN_HEIGHT;

    /* Hills + detail. Hills are dampened outside land. */
    let hill_noise = fractal3d(body.seed, x, y, z, HILL_SCALE, 3, 0.5, 2.0);
    let detail_noise = fractal3d(body.seed, x, y, z, DETAIL_SCALE, 2, 0.5, 2.0);

    let mut height = continent_value * CONTINENT_WEIGHT;
    height += mountain_height;
    height += hill_noise * HILL_WEIGHT * (if land_factor > 0.1 { 1.0f32 } else { 0.3f32 });
    height += detail_noise * DETAIL_WEIGHT;

    /* Convert normalized height in [-1, +1] to meters. Use a power curve
     * on the ocean side so sea floors get naturally deeper offshore. */
    let base = if height >= 0.0 {
        height * MAX_LAND_HEIGHT
    } else {
        /* C: (float)pow((double)fabs(height), (double)OCEAN_DEPTH_POWER) */
        let ocean_factor = (height as f64).abs().powf(OCEAN_DEPTH_POWER as f64) as f32;
        /* Seeded worlds get deeper basins (gated like the uplift). */
        let deepen = if biomes_active(body) { SEEDED_OCEAN_DEEPEN } else { 1.0 };
        -ocean_factor * MAX_OCEAN_DEPTH * deepen
    };

    /* Rocky highlands (Rust extension, custom-seed worlds only - the
     * biomes_active gate keeps every default-seed C-parity pin byte-
     * exact): a low-frequency rockiness field lifts whole land regions
     * into real mountain country, so the Mountains biome has actual
     * peaks rather than just recoloured hills. Shorelines are left
     * alone so beaches / sea level stay coherent. */
    if base > SEA_LEVEL + BEACH_BAND && biomes_active(body) {
        let r = rockiness(body, unit_dir);
        if r > ROCKY_ABOVE {
            let t = ((r - ROCKY_ABOVE) / (1.0 - ROCKY_ABOVE)).clamp(0.0, 1.0);
            let t = t * t * (3.0 - 2.0 * t); /* smoothstep foothill edge */
            return base + t * ROCKY_UPLIFT_M;
        }
    }
    base
}

/// Rockiness in [0, 1] at a unit direction - the region field that
/// drives mountain uplift and the Mountains biome.
pub fn rockiness(body: &BodyConfig, unit_dir: DVec3) -> f32 {
    noise01(body.seed ^ ROCKY_SEED_SALT, unit_dir, ROCKY_SCALE, 3)
}

/* ----------------------------------------------------------------------- */
/* Biomes - a moisture field layered over the existing elevation +
 * latitude bands. DELIBERATE Rust-port extension past the C worldgen:
 * deserts, jungles, swamps, rockier mountains. Classification is pure
 * (seeded noise over the unit sphere), so scatter, fauna tables, and
 * the terrain fill all agree on where a biome is. */

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Biome {
    Ocean,
    Beach,
    /// Temperate grass - the classic look.
    Fields,
    /// Dry: sand ground, cactus scatter, no trees.
    Desert,
    /// Wet + warm: dense tall trees, lush scatter.
    Jungle,
    /// Wet lowland: groves, dark swamp grass, frogs.
    Swamp,
    /// High rock above the tree line.
    Mountains,
    /// Cold high-latitude band (snowy surface).
    Tundra,
}

/// Moisture scale relative to the continent noise (bigger regions
/// than hills, smaller than continents).
const MOISTURE_SCALE: f32 = 1.6;
/// Seed stir so moisture doesn't correlate with elevation octaves.
const MOISTURE_SEED_SALT: u64 = 0xB10E_5EED;
/// Classification thresholds.
const DESERT_BELOW: f32 = 0.36;
const WET_ABOVE: f32 = 0.64;
const SWAMP_MAX_ELEV_M: f32 = 5.0;
const MOUNTAIN_ELEV_M: f32 = 24.0;
/// Fraction of desert tops that break into red rocky outcrops
/// (CragRock), same latitude-dither idiom as the swamp mud patches.
const DESERT_ROCK_FRAC: f32 = 0.14;
/// Rocky-highland region field: scale, activation threshold, and how
/// far a fully rocky region is lifted. Seed stir keeps it decorrelated
/// from moisture and elevation octaves.
const ROCKY_SEED_SALT: u64 = 0x0C0C_5EED;
const ROCKY_SCALE: f32 = 2.0;
const ROCKY_ABOVE: f32 = 0.72;
const ROCKY_UPLIFT_M: f32 = 22.0;
/// Above this altitude a Mountains-biome top wears a snow cap.
const MOUNTAIN_SNOWCAP_ELEV_M: f32 = 40.0;
/// Custom-seed worlds carry their sea one block higher (water laps
/// onto the old shoreline instead of sitting sunken below it) and
/// their ocean floors run deeper. Both are biomes_active-gated so
/// default-seed output stays byte-exact for the C-parity pins.
const SEEDED_SEA_RAISE_M: f32 = 1.0;
/* Deep oceans: seeded basins run ~2.6x the base ocean depth (up to the
 * ~62 m the 64-layer sub-sea budget allows before the floor clamps onto
 * bedrock), so open water is a real dive, not a shallow pool. Seeded
 * worlds only - the biomes_active gate keeps default output byte-exact. */
const SEEDED_OCEAN_DEEPEN: f32 = 2.6;

/// Fractal noise remapped to [0, 1] at a unit direction. Shared field
/// generator: the biome moisture map and the client's cloud-coverage
/// (weather system) map both sample this with their own seed + scale.
pub fn noise01(seed: u64, unit_dir: DVec3, scale: f32, octaves: i32) -> f32 {
    let m = fractal3d(
        seed,
        unit_dir.x as f32,
        unit_dir.y as f32,
        unit_dir.z as f32,
        scale,
        octaves,
        0.5,
        2.0,
    );
    (m * 0.5 + 0.5).clamp(0.0, 1.0)
}

/// Moisture in [0, 1] at a unit direction (0 = bone dry).
pub fn moisture(body: &BodyConfig, unit_dir: DVec3) -> f32 {
    noise01(body.seed ^ MOISTURE_SEED_SALT, unit_dir, MOISTURE_SCALE, 4)
}

/// True when the moisture-biome layer is active for this body. Biomes
/// arrived WITH the per-world random seeds: a body still running its
/// compiled-in default seed generates byte-exact legacy terrain (that
/// keeps every C-parity worldgen pin - and every pre-seed world -
/// untouched); any custom-seeded world gets the full biome treatment.
pub fn biomes_active(body: &BodyConfig) -> bool {
    body.seed != crate::planet::default_seed(body.id)
}

/// How far this body's sea sits above the legacy sea level (metres).
/// 0 on legacy worlds; custom-seed worlds raise it one block. Client
/// water-cap / fog / fauna surface math must add this to the legacy
/// sea radius.
pub fn sea_raise_m(body: &BodyConfig) -> f32 {
    if biomes_active(body) { SEEDED_SEA_RAISE_M } else { 0.0 }
}

/// Classify a surface point. Elevation + latitude bands take priority
/// (ocean / beach / mountain / tundra), then the moisture field splits
/// the temperate middle into desert / fields / jungle / swamp.
pub fn biome(body: &BodyConfig, unit_dir: DVec3) -> Biome {
    if !biomes_active(body) {
        /* Legacy terrain: Fields everywhere the old top-block logic
         * ran - every biome hook is a no-op for Fields. */
        return Biome::Fields;
    }
    if body.barren || body.icy {
        return Biome::Tundra; /* no temperate biomes off-Earthlikes */
    }
    let surface = surface_altitude(body, unit_dir);
    /* Seeded worlds carry a raised sea - classify against it. */
    let sea = SEA_LEVEL + SEEDED_SEA_RAISE_M;
    if surface < sea - 1.0 {
        return Biome::Ocean;
    }
    if surface < sea + BEACH_BAND {
        return Biome::Beach;
    }
    let latitude = unit_dir.y.abs() as f32;
    if latitude > COLD_LATITUDE {
        return Biome::Tundra;
    }
    if surface > MOUNTAIN_ELEV_M {
        return Biome::Mountains;
    }
    let m = moisture(body, unit_dir);
    if m < DESERT_BELOW {
        return Biome::Desert;
    }
    if m > WET_ABOVE {
        return if surface < SWAMP_MAX_ELEV_M { Biome::Swamp } else { Biome::Jungle };
    }
    Biome::Fields
}

/* ----------------------------------------------------------------------- */

/// Port of `column_profile_t`. Precomputed per-column biome info.
/// Build once per column in the fill loop, then call
/// `sample_with_profile` for each layer - avoids repeating the
/// surface-noise lookup per voxel.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ColumnProfile {
    pub surface_m: f32,
    pub latitude: f32,
    pub snow_line: f32,
    pub polar: bool,
    /// moon-like: skip grass/sand/water biomes
    pub barren: bool,
    /// all snow + ice surface, no grass / sand / dirt
    pub icy: bool,
    /// emit SEQ_* tileset variants instead of defaults
    pub sequoia: bool,
    /// emit CRAG_ROCK for barren fills
    pub crag: bool,
    /// emit FROST_ICE + colder snow
    pub frost: bool,
    /// emit ASTEROID_ROCK for barren fills
    pub asteroid: bool,
    /// Moisture-band biome (Rust-port extension; see [`biome`]).
    pub biome: Biome,
    /// Whether the biome layer is live for this body (custom seed).
    /// Gates the Fields -> DryGrass pasture re-skin: legacy worlds
    /// classify Fields everywhere and must keep emitting the classic
    /// Grass block byte-exactly (C-parity worldgen pins).
    pub biomes_on: bool,
}

/// Port of `planet_profile()`.
pub fn profile(body: &BodyConfig, unit_dir: DVec3) -> ColumnProfile {
    let mut surface_m = surface_altitude(body, unit_dir);
    /* Moons + asteroids look flatter - scale the amplitude so they're
     * visibly different from main planets. Icy worlds keep full height. */
    if body.barren {
        surface_m *= 0.3;
    }
    /* C: (float)fabs(unit_dir.y) - f64 abs, then truncate to f32. */
    let latitude = unit_dir.y.abs() as f32;
    let polar = latitude > POLAR_LATITUDE;
    let cold = latitude > COLD_LATITUDE;
    let snow_line = if cold { SNOW_ELEV * 0.5 } else { SNOW_ELEV };
    ColumnProfile {
        surface_m,
        latitude,
        snow_line,
        polar,
        barren: body.barren,
        icy: body.icy,
        sequoia: body.tileset == Tileset::Sequoia,
        crag: body.tileset == Tileset::Crag,
        frost: body.tileset == Tileset::Frost,
        asteroid: body.tileset == Tileset::Asteroid,
        biome: biome(body, unit_dir),
        biomes_on: biomes_active(body),
    }
}

/// Port of `planet_sample_with_profile()`.
pub fn sample_with_profile(prof: &ColumnProfile, altitude_m: f32) -> Block {
    let surface = prof.surface_m;

    /* Barren (moon-like) bodies. Tileset chooses the surface tint so
     * the three kinds of barren body don't all look like Luna. */
    if prof.barren {
        if altitude_m > surface {
            return Block::Air;
        }
        if prof.crag {
            return Block::CragRock;
        }
        if prof.asteroid {
            return Block::AsteroidRock;
        }
        return Block::Moon;
    }

    /* Icy bodies: snow crust on top, ice below. Frostbite swaps the
     * ice layer to a deeper glacial tint via Tileset::Frost. */
    if prof.icy {
        if altitude_m > surface {
            return Block::Air;
        }
        if altitude_m > surface - 1.0 {
            return Block::Snow;
        }
        return if prof.frost {
            Block::FrostIce
        } else {
            Block::Ice
        };
    }

    /* Seeded worlds carry their sea one block higher; legacy worlds
     * keep the exact C sea level (pins). */
    let sea = if prof.biomes_on { SEA_LEVEL + SEEDED_SEA_RAISE_M } else { SEA_LEVEL };

    /* Air/water above the ground. */
    if altitude_m > surface {
        if altitude_m < sea {
            return if prof.polar { Block::Ice } else { Block::Water };
        }
        return Block::Air;
    }

    /* Top voxel - biome decision layer. Tileset::Sequoia bodies emit
     * the SEQ_* variants so they pick different atlas columns. */
    if altitude_m > surface - 1.0 {
        if surface > sea - BEACH_BAND && surface < sea + BEACH_BAND {
            return if prof.sequoia { Block::SeqSand } else { Block::Sand };
        }
        if surface < sea {
            if surface > sea - 4.0 {
                return if prof.sequoia { Block::SeqSand } else { Block::Sand };
            }
            return Block::Stone;
        }
        /* Rocky mountain country (seeded worlds only - biome() returns
         * Mountains only when the biome layer is live): bare stone
         * slopes all the way up, snow saved for the actual peaks.
         * Checked BEFORE the legacy elevation bands so the uplifted
         * ranges read rock, not the snow the 22 m line would paint. */
        if prof.biome == Biome::Mountains {
            return if surface > MOUNTAIN_SNOWCAP_ELEV_M {
                if prof.sequoia { Block::SeqSnow } else { Block::Snow }
            } else {
                Block::Stone
            };
        }
        if prof.biomes_on {
            /* Seeded worlds order the elevation bands naturally: a
             * rocky tree-line band first, snow ON TOP of it - the
             * legacy order painted snow at 22 m with bare stone above
             * 32 m, which read as snow BELOW the peaks. */
            if surface > STONE_ELEV {
                return if prof.sequoia { Block::SeqSnow } else { Block::Snow };
            }
            /* Tundra stays snowy at every elevation - only temperate
             * hills get the rocky tree-line band. */
            if surface > prof.snow_line && prof.biome != Biome::Tundra {
                return Block::Stone;
            }
            if prof.polar || (prof.biome == Biome::Tundra && surface > prof.snow_line) {
                return if prof.sequoia { Block::SeqSnow } else { Block::Snow };
            }
        } else {
            if surface > STONE_ELEV {
                return Block::Stone;
            }
            if surface > prof.snow_line || prof.polar {
                return if prof.sequoia { Block::SeqSnow } else { Block::Snow };
            }
        }
        /* Moisture biomes re-skin the temperate top (Rust extension):
         * deserts run on sand broken by red rocky outcrops, mountains
         * turn rocky above the tree line, swamps get muddy dirt breaks
         * in the sod, jungles go deep green, pasture goes yellow-green,
         * and the low cold band turns snowy - so each biome reads at a
         * glance from orbit, not just underfoot. */
        match prof.biome {
            Biome::Desert => {
                if (prof.latitude * 977.0).fract() < DESERT_ROCK_FRAC {
                    return Block::CragRock;
                }
                return if prof.sequoia { Block::SeqSand } else { Block::Sand };
            }
            Biome::Mountains => return Block::Stone,
            Biome::Swamp => {
                /* Swampland is a broken mix: ~1/3 wet mud, ~1/5
                 * stagnant water pools sunk into the sod (the voxel
                 * below stays dirt, so the pool has a muddy bed), the
                 * rest marsh grass. Same cheap latitude dither idiom
                 * as the desert rocks. */
                let f = (prof.latitude * 977.0).fract();
                if f < 0.35 {
                    return if prof.sequoia { Block::SeqDirt } else { Block::Dirt };
                }
                if f > 0.80 {
                    return Block::Water;
                }
                return if prof.sequoia { Block::SeqGrass } else { Block::Grass };
            }
            Biome::Jungle => return Block::JungleGrass,
            Biome::Tundra => {
                /* Low-elevation cold band: snowy ground (the snow-line
                 * branch above already whitened everything higher). */
                return if prof.sequoia { Block::SeqSnow } else { Block::Snow };
            }
            Biome::Fields if prof.biomes_on => return Block::DryGrass,
            _ => {}
        }
        return if prof.sequoia { Block::SeqGrass } else { Block::Grass };
    }

    if altitude_m > surface - 4.0 {
        if prof.biome == Biome::Desert {
            /* Sand runs deep under a desert. */
            return if prof.sequoia { Block::SeqSand } else { Block::Sand };
        }
        return if prof.sequoia { Block::SeqDirt } else { Block::Dirt };
    }
    Block::Stone
}

/// Port of `planet_sample()`. Block at a world position specified by
/// (unit_dir, altitude_m). altitude_m = 0 is the body's base radius
/// (equal to radius_m).
pub fn sample(body: &BodyConfig, unit_dir: DVec3, altitude_m: f32) -> Block {
    let p = profile(body, unit_dir);
    sample_with_profile(&p, altitude_m)
}

/* ----------------------------------------------------------------------- */

#[cfg(test)]
mod biome_tests {
    use super::*;
    use crate::goldberg;
    use crate::planet::{self, BodyId};

    #[test]
    fn default_seed_stays_legacy_and_custom_seeds_grow_biomes() {
        let legacy = planet::get(BodyId::Tenebris);
        let g = goldberg::create(3);
        /* Default seed: every tile classifies Fields (all biome hooks
         * no-op) - the C-parity worldgen pins depend on this. */
        assert!(!biomes_active(&legacy));
        for i in (0..g.tile_count()).step_by(37) {
            assert_eq!(biome(&legacy, g.tile(i).unwrap().center), Biome::Fields);
        }
        /* A seeded world diversifies: multiple biomes appear across the
         * sphere, including at least one dry and one wet kind. */
        let mut seeded = legacy;
        seeded.seed = 0xC0FFEE_D00D;
        assert!(biomes_active(&seeded));
        let mut kinds = std::collections::HashSet::new();
        for i in 0..g.tile_count() {
            kinds.insert(format!("{:?}", biome(&seeded, g.tile(i).unwrap().center)));
        }
        assert!(kinds.len() >= 5, "seeded world has variety: {kinds:?}");
        assert!(kinds.contains("Desert") || kinds.contains("Swamp") || kinds.contains("Jungle"));
        /* The rocky-uplift field must produce actual mountain country. */
        assert!(kinds.contains("Mountains"), "no rocky ranges: {kinds:?}");
    }

    #[test]
    fn seeded_sea_rides_one_block_higher() {
        use crate::blocks::Block;
        let legacy = crate::planet::get(crate::planet::BodyId::Tenebris);
        let mut seeded = legacy;
        seeded.seed = 0xC0FFEE_D00D;
        /* Same deep-ocean column on both worlds (profile constructed,
         * not scanned): the voxel band just above legacy sea level is
         * air on legacy and water on the seeded world (sea +1 m). */
        let dir = crate::math::dvec3_normalize(crate::math::dvec3_make(1.0, 0.1, 0.3));
        let mut lp = profile(&legacy, dir);
        lp.surface_m = -8.0;
        lp.polar = false;
        let mut sp = profile(&seeded, dir);
        sp.surface_m = -8.0;
        sp.polar = false;
        assert!(!lp.biomes_on && sp.biomes_on);
        assert_eq!(sample_with_profile(&lp, 0.5), Block::Air);
        assert_eq!(sample_with_profile(&sp, 0.5), Block::Water);
        /* Below legacy sea level both are water. */
        assert_eq!(sample_with_profile(&lp, -0.5), Block::Water);
        assert_eq!(sample_with_profile(&sp, -0.5), Block::Water);
    }

    #[test]
    fn biome_sods_only_grow_on_seeded_worlds() {
        use crate::blocks::Block;
        let g = goldberg::create(3);
        let legacy = crate::planet::get(crate::planet::BodyId::Tenebris);
        let mut seeded = legacy;
        seeded.seed = 0xC0FFEE_D00D;

        let tops = |body: &crate::planet::BodyConfig| {
            let mut set = std::collections::HashSet::new();
            for i in 0..g.tile_count() {
                let dir = g.tile(i).unwrap().center;
                let prof = profile(body, dir);
                if prof.surface_m > 0.0 {
                    set.insert(sample_with_profile(&prof, prof.surface_m - 0.5));
                }
            }
            set
        };

        /* Legacy terrain never emits the new sods (C-parity worldgen
         * pins depend on this - the biome layer is seed-gated). */
        let legacy_tops = tops(&legacy);
        assert!(!legacy_tops.contains(&Block::JungleGrass));
        assert!(!legacy_tops.contains(&Block::DryGrass));
        assert!(!legacy_tops.contains(&Block::CragRock));

        /* A seeded world grows the orbit-visible surfaces: yellow-green
         * pasture and deep-green jungle. */
        let seeded_tops = tops(&seeded);
        assert!(seeded_tops.contains(&Block::DryGrass), "{seeded_tops:?}");
        assert!(seeded_tops.contains(&Block::JungleGrass), "{seeded_tops:?}");

        /* Desert red-rock outcrops: too sparse to guarantee at this
         * subdivision, so pin the arm directly - a desert top whose
         * latitude dither lands under DESERT_ROCK_FRAC turns CragRock,
         * one above stays sand. */
        let dir = crate::math::dvec3_normalize(crate::math::dvec3_make(1.0, 0.05, 0.2));
        let mut prof = profile(&seeded, dir);
        prof.biome = Biome::Desert;
        prof.surface_m = 10.0;
        prof.latitude = 0.05 / 977.0; /* fract(lat*977) = 0.05 < frac */
        assert_eq!(sample_with_profile(&prof, 9.6), Block::CragRock);
        prof.latitude = 0.90 / 977.0; /* fract = 0.90: stays sand */
        assert_eq!(sample_with_profile(&prof, 9.6), Block::Sand);
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::goldberg;
    use crate::math::{dvec3_make, dvec3_normalize};
    use crate::planet::{self, BodyId};

    /* Pinned values generated from the C source of truth (planet_gen.c
     * + rng.c + goldberg.c compiled with gcc -O2 -fwrapv, x86-64/SSE2)
     * and dumped as f32 bit patterns / block-id bytes. Comparisons are
     * bit-exact. */

    /// Bodies for the surface / profile pins, in pin-row order.
    const SURF_BODIES: [BodyId; 6] = [
        BodyId::Tenebris,
        BodyId::Sequoia,
        BodyId::Luna,
        BodyId::Crag,
        BodyId::Frostbite,
        BodyId::Asteroid2,
    ];

    /// Raw (pre-normalize) directions for the surface / profile pins.
    const SURF_DIRS: [(f64, f64, f64); 6] = [
        (1.0, 2.0, 3.0),
        (-0.5, 0.8, 0.1),
        (0.1, 5.0, 0.1),
        (0.3, -0.95, 0.2),
        (-1.0, -1.0, -1.0),
        (0.9, 0.05, -0.4),
    ];

    // surface_altitude bits, [body][dir]
    const SURFACE_PINS: [[u32; 6]; 6] = [
        [0xbfb9bf39, 0x419e24af, 0x4193fcb2, 0x415b9536, 0x41872749, 0xbf9b90aa],
        [0x412d6de5, 0x4187ce13, 0x4161c3fe, 0x40f6fb7f, 0x414cf0fa, 0x41b982bd],
        [0x40468054, 0x412ebc62, 0x41450809, 0x41a98596, 0x4199ba41, 0x4160f086],
        [0x41e269ce, 0x3fc899d4, 0x414864cc, 0x4192077e, 0x40f1269d, 0x41b05bdf],
        [0x41a325de, 0x41efd5fc, 0x40a4153b, 0x419604f0, 0x40c4e7f9, 0xc08ce82e],
        [0x416241f5, 0x419492a9, 0x413dd78c, 0xbf0c05e8, 0x41972876, 0x41ddcaa7],
    ];

    #[test]
    fn surface_altitude_matches_c() {
        for (bi, body_id) in SURF_BODIES.iter().enumerate() {
            let body = planet::get(*body_id);
            for (di, (x, y, z)) in SURF_DIRS.iter().enumerate() {
                let dir = dvec3_normalize(dvec3_make(*x, *y, *z));
                let got = surface_altitude(&body, dir);
                assert_eq!(
                    got.to_bits(),
                    SURFACE_PINS[bi][di],
                    "body {:?} dir {} - got {:?} (0x{:08x})",
                    body_id,
                    di,
                    got,
                    got.to_bits()
                );
            }
        }
    }

    // (surface_bits, latitude_bits, snow_line_bits, bool_flags) for
    // body i paired with dir i. flags = polar | barren<<1 | icy<<2 |
    // sequoia<<3 | crag<<4 | frost<<5 | asteroid<<6.
    const PROFILE_PINS: [(u32, u32, u32, u32); 6] = [
        (0xbfb9bf39, 0x3f08d677, 0x41b00000, 0),
        (0x4187ce13, 0x3f57e0cf, 0x41300000, 8),
        (0x406c700b, 0x3f7fe5cd, 0x41300000, 3),
        (0x40af3c31, 0x3f6f5780, 0x41300000, 18),
        (0x40c4e7f9, 0x3f13cd3a, 0x41b00000, 36),
        (0x41051331, 0x3d4facea, 0x41b00000, 66),
    ];

    #[test]
    fn profile_matches_c() {
        for (i, body_id) in SURF_BODIES.iter().enumerate() {
            let body = planet::get(*body_id);
            let (x, y, z) = SURF_DIRS[i];
            let dir = dvec3_normalize(dvec3_make(x, y, z));
            let p = profile(&body, dir);
            let (surface, latitude, snow_line, flags) = PROFILE_PINS[i];
            assert_eq!(p.surface_m.to_bits(), surface, "surface_m, body {:?}", body_id);
            assert_eq!(p.latitude.to_bits(), latitude, "latitude, body {:?}", body_id);
            assert_eq!(p.snow_line.to_bits(), snow_line, "snow_line, body {:?}", body_id);
            let got_flags = (p.polar as u32)
                | ((p.barren as u32) << 1)
                | ((p.icy as u32) << 2)
                | ((p.sequoia as u32) << 3)
                | ((p.crag as u32) << 4)
                | ((p.frost as u32) << 5)
                | ((p.asteroid as u32) << 6);
            assert_eq!(got_flags, flags, "flags, body {:?}", body_id);
        }
    }

    /// (body, goldberg subdivisions, tile index) for COLUMN_PINS.
    const COLUMNS: [(BodyId, i32, i32); 7] = [
        (BodyId::Tenebris, 5, 0),
        (BodyId::Tenebris, 5, 4321),
        (BodyId::Tenebris, 5, 9000),
        (BodyId::Sequoia, 5, 777),
        (BodyId::Frostbite, 4, 100),
        (BodyId::Luna, 4, 2000),
        (BodyId::Asteroid3, 3, 50),
    ];
    const COL_LO: i32 = -32;
    const COL_HI: i32 = 47;

    // block ids for altitude_m = -32..=47 at the given tile center
    const COLUMN_PINS: [[u8; 80]; 7] = [
        [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 13, 13, 13, 12, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 19, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 11, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        [20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    ];

    #[test]
    fn terrain_columns_match_c() {
        for (ci, (body_id, subdiv, tile_idx)) in COLUMNS.iter().enumerate() {
            let body = planet::get(*body_id);
            let g = goldberg::create(*subdiv);
            let tile = g.tile(*tile_idx).expect("pin tile index in range");
            let p = profile(&body, tile.center);
            for (li, lvl) in (COL_LO..=COL_HI).enumerate() {
                let got = sample_with_profile(&p, lvl as f32);
                assert_eq!(
                    got.raw(),
                    COLUMN_PINS[ci][li],
                    "column {} ({:?} tile {}), level {}",
                    ci,
                    body_id,
                    tile_idx,
                    lvl
                );
                /* The convenience wrapper must agree with the profile
                 * fast path (cross-checked in the C pin run too). */
                assert_eq!(got, sample(&body, tile.center, lvl as f32));
            }
        }
    }
}
