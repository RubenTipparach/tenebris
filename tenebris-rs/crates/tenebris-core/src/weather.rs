//! Planetary weather - the moisture/solar field that drives cloud
//! formation, growth, and precipitation.
//!
//! Design (shared SP + MP so every client agrees from the synced world
//! clock, no per-cloud sync): weather is a DETERMINISTIC field of
//! `(body seed, surface direction, time)`, not a stored entity sim. The
//! visible cloud lifecycle - spawn small + transparent, grow into a large
//! opaque mass, dissipate - emerges because the field drifts over the
//! world: a cell whose density is rising shows a growing cloud, a cell
//! whose density is falling shows a shrinking one. The client
//! (`client::clouds`) samples this field per cloud cell to pick each
//! puff's size, opacity, drift boost, and whether it is raining/snowing;
//! `client::weather_fx` draws the precipitation.
//!
//! The pieces of the user's model, mapped to the field:
//! - **Solar saturation**: a time-advected 3D SIMPLEX field - pockets of
//!   solar energy that pool and drift, warming the atmosphere ([`solar`]).
//! - **Moisture source**: the biome moisture map (`planet_gen::moisture`),
//!   which is high over wet regions and low over deserts by construction.
//! - **Clouds** form where warmth meets moisture (`moisture * heat`); a
//!   gamma curve clears the dry end so **arid regions rarely cloud** (but
//!   can, when solar pools hard - occasional desert rain).
//! - **Rain vs snow** by biome: snow over Tundra / Mountains, rain else.
//!
//! Tunables: `assets/config/weather.yaml`.

use std::sync::Mutex;

use crate::math::DVec3;
use crate::planet::BodyConfig;
use crate::planet_gen;

/* ------------------------------------------------------------------ */
/* Seeded 3D simplex noise. Isolated from the byte-exact worldgen noise
 * (rng.rs) - it has no C counterpart and never feeds terrain, so it is
 * free of the parity constraint. Standard Gustavson-style simplex with
 * gradients hashed from the integer lattice corner + the body seed. */

fn grad3(hash: u32, x: f32, y: f32, z: f32) -> f32 {
    let h = hash & 15;
    let u = if h < 8 { x } else { y };
    let v = if h < 4 {
        y
    } else if h == 12 || h == 14 {
        x
    } else {
        z
    };
    (if h & 1 == 0 { u } else { -u }) + (if h & 2 == 0 { v } else { -v })
}

fn corner_hash(seed: u64, i: i32, j: i32, k: i32) -> u32 {
    let mut h = seed.wrapping_mul(0x9E37_79B9_7F4A_7C15);
    h ^= (i as i64 as u64).wrapping_mul(0xff51_afd7_ed55_8ccd);
    h = h.rotate_left(17) ^ (j as i64 as u64).wrapping_mul(0xc4ce_b9fe_1a85_ec53);
    h = h.rotate_left(23) ^ (k as i64 as u64).wrapping_mul(0x1656_67b1_9e37_79f9);
    h ^= h >> 29;
    h = h.wrapping_mul(0xbf58_476d_1ce4_e5b9);
    h ^= h >> 32;
    (h & 0xFFFF_FFFF) as u32
}

/// Seeded 3D simplex noise, output ~[-1, 1].
pub fn simplex3(seed: u64, xin: f32, yin: f32, zin: f32) -> f32 {
    const F3: f32 = 1.0 / 3.0;
    const G3: f32 = 1.0 / 6.0;
    let s = (xin + yin + zin) * F3;
    let i = (xin + s).floor();
    let j = (yin + s).floor();
    let k = (zin + s).floor();
    let t = (i + j + k) * G3;
    let (x0, y0, z0) = (xin - (i - t), yin - (j - t), zin - (k - t));
    /* Which of the 6 simplices (tetrahedra) are we in? */
    let (i1, j1, k1, i2, j2, k2);
    if x0 >= y0 {
        if y0 >= z0 {
            (i1, j1, k1, i2, j2, k2) = (1, 0, 0, 1, 1, 0);
        } else if x0 >= z0 {
            (i1, j1, k1, i2, j2, k2) = (1, 0, 0, 1, 0, 1);
        } else {
            (i1, j1, k1, i2, j2, k2) = (0, 0, 1, 1, 0, 1);
        }
    } else if y0 < z0 {
        (i1, j1, k1, i2, j2, k2) = (0, 0, 1, 0, 1, 1);
    } else if x0 < z0 {
        (i1, j1, k1, i2, j2, k2) = (0, 1, 0, 0, 1, 1);
    } else {
        (i1, j1, k1, i2, j2, k2) = (0, 1, 0, 1, 1, 0);
    }
    let (x1, y1, z1) = (x0 - i1 as f32 + G3, y0 - j1 as f32 + G3, z0 - k1 as f32 + G3);
    let (x2, y2, z2) =
        (x0 - i2 as f32 + 2.0 * G3, y0 - j2 as f32 + 2.0 * G3, z0 - k2 as f32 + 2.0 * G3);
    let (x3, y3, z3) = (x0 - 1.0 + 3.0 * G3, y0 - 1.0 + 3.0 * G3, z0 - 1.0 + 3.0 * G3);
    let (ii, jj, kk) = (i as i32, j as i32, k as i32);
    let mut n = 0.0f32;
    for (dx, dy, dz, gx, gy, gz) in [
        (x0, y0, z0, 0, 0, 0),
        (x1, y1, z1, i1, j1, k1),
        (x2, y2, z2, i2, j2, k2),
        (x3, y3, z3, 1, 1, 1),
    ] {
        let mut tt = 0.6 - dx * dx - dy * dy - dz * dz;
        if tt > 0.0 {
            tt *= tt;
            n += tt * tt * grad3(corner_hash(seed, ii + gx, jj + gy, kk + gz), dx, dy, dz);
        }
    }
    (32.0 * n).clamp(-1.0, 1.0)
}

/* ------------------------------------------------------------------ */
/* Config. */

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct WeatherConfig {
    /// Spatial frequency of the solar-saturation simplex field on the
    /// unit sphere (higher = smaller, more numerous solar pockets).
    pub solar_scale: f32,
    /// How fast the solar field drifts / evolves (multiplied by seconds).
    pub solar_drift: f32,
    /// Minimum atmospheric warmth even where the solar field is low, so
    /// moist regions still cloud at "night" (0..1).
    pub solar_floor: f32,
    /// Aridity gamma applied to the raw density: > 1 clears the dry end
    /// (deserts) harder while leaving wet regions cloudy.
    pub arid_gamma: f32,
    /// Cloud coverage ramp: density below `cloud_min` shows no cloud,
    /// above `cloud_full` a full opaque mass; between, it grows.
    pub cloud_min: f32,
    pub cloud_full: f32,
    /// Density above which a cloud is a rain/snow cloud.
    pub rain_threshold: f32,
    /// Alpha of the smallest (just-forming) cloud; full clouds reach 1.
    pub min_alpha: f32,
    /// Extra drift speed (m/s) given to the SMALLEST clouds so wisps
    /// scud faster than big masses.
    pub small_extra_drift: f32,
    /// Moisture source used on legacy (default-seed) worlds, which have
    /// no biome moisture map - a flat, still-weathering sky.
    pub default_moisture: f32,
}

impl WeatherConfig {
    pub const DEFAULT: WeatherConfig = WeatherConfig {
        solar_scale: 2.2,
        solar_drift: 0.015,
        solar_floor: 0.55,
        arid_gamma: 1.35,
        cloud_min: 0.22,
        cloud_full: 0.52,
        rain_threshold: 0.55,
        min_alpha: 0.32,
        small_extra_drift: 6.0,
        default_moisture: 0.66,
    };
}

static S_WEATHER: Mutex<WeatherConfig> = Mutex::new(WeatherConfig::DEFAULT);

pub fn config() -> WeatherConfig {
    *S_WEATHER.lock().unwrap()
}

pub fn set_config(cfg: WeatherConfig) {
    *S_WEATHER.lock().unwrap() = cfg;
}

/// Parse weather.yaml (tiny key/value subset; zero keeps the default).
pub fn parse_config(src: &str, _path: &str) -> WeatherConfig {
    let mut cfg = WeatherConfig::DEFAULT;
    for raw in src.split('\n') {
        let line = match raw.find('#') {
            Some(h) => &raw[..h],
            None => raw,
        }
        .trim();
        let Some(colon) = line.find(':') else { continue };
        let key = line[..colon].trim();
        let val = line[colon + 1..].trim();
        let Ok(v) = val.parse::<f32>() else { continue };
        if v == 0.0 {
            continue; /* zero keeps the compiled-in default */
        }
        match key {
            "solar_scale" => cfg.solar_scale = v,
            "solar_drift" => cfg.solar_drift = v,
            "solar_floor" => cfg.solar_floor = v,
            "arid_gamma" => cfg.arid_gamma = v,
            "cloud_min" => cfg.cloud_min = v,
            "cloud_full" => cfg.cloud_full = v,
            "rain_threshold" => cfg.rain_threshold = v,
            "min_alpha" => cfg.min_alpha = v,
            "small_extra_drift" => cfg.small_extra_drift = v,
            "default_moisture" => cfg.default_moisture = v,
            _ => {}
        }
    }
    *S_WEATHER.lock().unwrap() = cfg;
    cfg
}

pub fn load_config(path: &str) -> WeatherConfig {
    match std::fs::read_to_string(path) {
        Ok(src) => parse_config(&src, path),
        Err(_) => {
            println!("[weather] {} not found, using compiled-in defaults", path);
            WeatherConfig::DEFAULT
        }
    }
}

/* ------------------------------------------------------------------ */
/* Field. */

/// What is falling from a cloud cell.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Precip {
    None,
    Rain,
    Snow,
}

fn smoothstep(a: f32, b: f32, x: f32) -> f32 {
    if b <= a {
        return if x >= b { 1.0 } else { 0.0 };
    }
    let t = ((x - a) / (b - a)).clamp(0.0, 1.0);
    t * t * (3.0 - 2.0 * t)
}

/// Solar-energy saturation in [0, 1] at a surface direction and time - a
/// drifting simplex field of warm pockets. Two octaves for shape + detail.
pub fn solar(body: &BodyConfig, dir: DVec3, t_s: f64) -> f32 {
    let cfg = config();
    let f = cfg.solar_scale;
    let d = (t_s * cfg.solar_drift as f64) as f32;
    let seed = body.seed ^ 0x50_1A_12_5EED_u64;
    let (x, y, z) = (dir.x as f32, dir.y as f32, dir.z as f32);
    let a = simplex3(seed, x * f + d, y * f + d * 0.3, z * f - d * 0.5);
    let b = simplex3(seed.rotate_left(1), x * f * 2.3 - d * 0.7, y * f * 2.3, z * f * 2.3 + d * 0.4);
    ((a * 0.68 + b * 0.32) * 0.5 + 0.5).clamp(0.0, 1.0)
}

/// Moisture source in [0, 1] at a surface direction - the biome moisture
/// map (deserts low, wet biomes high) on seeded worlds; a flat value on
/// legacy worlds. This is what solar heat condenses into clouds.
pub fn moisture_source(body: &BodyConfig, dir: DVec3) -> f32 {
    if planet_gen::biomes_active(body) {
        planet_gen::moisture(body, dir)
    } else {
        config().default_moisture
    }
}

/// Cloud density in [0, 1]: warmth (solar) condensing the moisture source,
/// with the dry end cleared by the aridity gamma so deserts rarely cloud.
pub fn cloud_density(body: &BodyConfig, dir: DVec3, t_s: f64) -> f32 {
    let cfg = config();
    let base = moisture_source(body, dir);
    let heat = cfg.solar_floor + (1.0 - cfg.solar_floor) * solar(body, dir, t_s);
    let d = (base * heat).clamp(0.0, 1.0);
    d.powf(cfg.arid_gamma).clamp(0.0, 1.0)
}

/// Precipitation kind under a raining cell: snow over the cold biomes
/// (Tundra / Mountains), rain everywhere else. Legacy worlds rain.
pub fn precip_kind(body: &BodyConfig, dir: DVec3) -> Precip {
    if !planet_gen::biomes_active(body) {
        return Precip::Rain;
    }
    match planet_gen::biome(body, dir) {
        planet_gen::Biome::Tundra | planet_gen::Biome::Mountains => Precip::Snow,
        _ => Precip::Rain,
    }
}

/// Per-cell weather sample for the cloud renderer.
#[derive(Clone, Copy, Debug)]
pub struct CloudCell {
    /// Coverage 0..1 - drives existence + size (0 = clear).
    pub cover: f32,
    /// Opacity 0..1 - small clouds transparent, big clouds opaque.
    pub alpha: f32,
    /// True when this cell is precipitating.
    pub raining: bool,
    /// What falls (only meaningful when `raining`).
    pub precip: Precip,
}

/// Sample the full cloud state for one shell cell.
pub fn cloud_cell(body: &BodyConfig, dir: DVec3, t_s: f64) -> CloudCell {
    let cfg = config();
    let d = cloud_density(body, dir, t_s);
    let cover = smoothstep(cfg.cloud_min, cfg.cloud_full, d);
    let alpha = cfg.min_alpha + (1.0 - cfg.min_alpha) * cover;
    let raining = d >= cfg.rain_threshold;
    let precip = if raining { precip_kind(body, dir) } else { Precip::None };
    CloudCell { cover, alpha, raining, precip }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn simplex_is_bounded_and_varies() {
        let mut min = f32::MAX;
        let mut max = f32::MIN;
        for i in 0..2000 {
            let x = i as f32 * 0.137;
            let v = simplex3(42, x, x * 0.3, -x * 0.7);
            assert!((-1.0..=1.0).contains(&v));
            min = min.min(v);
            max = max.max(v);
        }
        assert!(max - min > 0.6, "simplex should span a decent range");
    }

    #[test]
    fn simplex_deterministic_per_seed() {
        /* Same seed -> identical; different seeds -> a different field
         * (compared over many points, since any single point can coincide
         * or land where all corner contributions vanish). */
        let mut same = true;
        let mut diff = false;
        for i in 0..200 {
            let x = 0.31 + i as f32 * 0.077;
            let (a7, b7) = (simplex3(7, x, x * 0.5, -x), simplex3(7, x, x * 0.5, -x));
            same &= a7 == b7;
            if simplex3(7, x, x * 0.5, -x) != simplex3(8, x, x * 0.5, -x) {
                diff = true;
            }
        }
        assert!(same, "same seed must be deterministic");
        assert!(diff, "different seeds must give a different field");
    }

    #[test]
    fn config_zero_keeps_default() {
        let c = parse_config("solar_scale: 3.0\nrain_threshold: 0.8\n", "t");
        assert_eq!(c.solar_scale, 3.0);
        assert_eq!(c.rain_threshold, 0.8);
        assert_eq!(c.cloud_min, WeatherConfig::DEFAULT.cloud_min);
        set_config(WeatherConfig::DEFAULT);
    }

    #[test]
    fn smoothstep_ramps() {
        assert_eq!(smoothstep(0.3, 0.7, 0.2), 0.0);
        assert_eq!(smoothstep(0.3, 0.7, 0.8), 1.0);
        let mid = smoothstep(0.3, 0.7, 0.5);
        assert!((mid - 0.5).abs() < 1e-6);
    }
}
