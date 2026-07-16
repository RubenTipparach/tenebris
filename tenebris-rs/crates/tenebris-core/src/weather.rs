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

use crate::math::{
    dvec3_add, dvec3_cross, dvec3_dot, dvec3_normalize, dvec3_scale, dvec3_sub, DVec3,
};
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
    /// Density above which a cloud is a rain/snow cloud. (Legacy knob;
    /// `rain_cover_min` now gates precipitation off the visible cloud size
    /// so rain always matches the clouds overhead - this is kept only for
    /// the shower-intensity ramp.)
    pub rain_threshold: f32,
    /// Cloud COVER (0..1 visible size) at/above which the column rains, so
    /// precipitation falls under any cloud big enough to see - not off a
    /// separate density threshold that let visible clouds sit rainless.
    pub rain_cover_min: f32,
    /// Once a column starts raining it keeps raining for at least this many
    /// seconds after the cloud thins (a coarse persistence tail sampled from
    /// the field's recent past), so showers last instead of flickering.
    pub rain_min_s: f32,
    /// Alpha of the smallest (just-forming) cloud; full clouds reach 1.
    pub min_alpha: f32,
    /// Extra drift speed (m/s) given to the SMALLEST clouds so wisps
    /// scud faster than big masses.
    pub small_extra_drift: f32,
    /// Moisture source used on legacy (default-seed) worlds, which have
    /// no biome moisture map - a flat, still-weathering sky.
    pub default_moisture: f32,
    /// Size multiplier applied to a rain/snow cloud so storm clouds tower
    /// into big dark masses.
    pub rain_cloud_scale: f32,
    /// Distance-fog density multiplier while precipitating (thicker,
    /// closer fog in the rain/snow).
    pub rain_fog_mult: f32,
    /// Extra fog density per unit of overcast coverage (cloudy = hazier
    /// even without rain).
    pub cloud_fog_add: f32,
    /// How much full overcast dims the SUN term (0..1) - the region goes
    /// flat and grey under thick cloud.
    pub overcast_sun_dim: f32,
    /// How much full overcast dims the AMBIENT fill (0..1).
    pub overcast_amb_dim: f32,
    /// --- Overcast SKY DOME response (atmosphere shader coeffs). Without
    /// these the terrain darkened under a storm but the sky stayed clear
    /// blue. Each scales an existing scattering coefficient by overcast, so
    /// dragging the weather moisture slider up greys + darkens the sky. ---
    /// How much full overcast cuts the sky's blue (rayleigh) toward neutral
    /// grey (0..1). 1.0 removes the blue entirely at full storm.
    pub overcast_sky_blue_cut: f32,
    /// How much full overcast lifts the white haze (mie) so the sky reads as
    /// a flat overcast sheet rather than deep blue. Additive gain (0 = none).
    pub overcast_sky_haze: f32,
    /// How much full overcast dims the sky's sun-scatter intensity (0..1) so
    /// the whole dome darkens under the storm, matching the terrain.
    pub overcast_sky_dim: f32,

    /* --- Rain streak feel (client weather_fx distant shafts) --- */
    /// Rain fall speed, metres/second (the visible streaks fall this fast).
    pub rain_fall_mps: f32,
    /// Rain streak half-width, metres (smaller = thinner drops).
    pub rain_width_m: f32,
    /// Density multiplier on the streaks drawn per storm cell.
    pub rain_density_mult: f32,
    /// Rain streak length, metres (shorter = drops, not long curtains).
    pub rain_streak_m: f32,
    /* --- Snow emitter (separate from rain so flakes drift slowly) --- */
    /// Snow fall speed, metres/second (much slower than rain - flakes drift).
    pub snow_fall_mps: f32,
    /// Snow flake length, metres (short - flakes, not streaks).
    pub snow_streak_m: f32,
    /// Density multiplier on the flakes drawn per snow cell.
    pub snow_density_mult: f32,
    /// Rain streak RGB tint (0..1). Lower r/g + high b = bluer, moodier
    /// rain. Each channel follows the "0 keeps default" rule, so use a
    /// tiny value (e.g. 0.02) rather than exactly 0 for a near-zero channel.
    pub rain_color_r: f32,
    pub rain_color_g: f32,
    pub rain_color_b: f32,
    /// Rain streak opacity for the NEAREST shafts (0..1). Far shafts fade
    /// toward `rain_alpha_far` with distance so a storm reads as depth,
    /// not a flat wall.
    pub rain_alpha_near: f32,
    /// Rain streak opacity at the far cull range (0..1).
    pub rain_alpha_far: f32,
    /// Fade time-constant (seconds) for camera wet FX (rain-on-glass lens,
    /// terrain wetness sheen, near shower). The wet level eases toward its
    /// target over ~this long instead of snapping when the camera crosses
    /// into / out of a rainy region. 0 = instant (old sharp behaviour).
    pub wet_fade_tau_s: f32,
    /// Camera altitude (m above the surface) above which the rain / snow
    /// streak emitter is skipped entirely - individual streaks are
    /// sub-pixel from a few hundred metres up; the storm still reads via
    /// clouds, overcast dimming, and fog.
    pub rain_lod_alt_m: f32,
    /// Fraction of a cell's streak count that survives at max shaft range
    /// (count LOD, scaled by the same near->far fade as the alpha). The
    /// far curtains sit at rain_alpha_far anyway, so thinning them is
    /// nearly invisible but cuts most of a storm's streak CPU. 1.0 =
    /// old constant density.
    pub rain_lod_far_frac: f32,
    /// Distance (m) out to which cells render INDIVIDUAL streaks. Beyond
    /// it each cell draws one translucent curtain sheet instead - the
    /// far-precipitation impostor - so storms stay visible to the full
    /// shaft range at a fraction of the cost.
    pub rain_detail_range_m: f32,
    /// Opacity multiplier on the far-curtain impostor sheets (applied on
    /// top of the distance-faded streak alpha) so a sheet reads as haze,
    /// never a solid wall.
    pub rain_impostor_alpha: f32,
    /// Far-curtain impostor sheet tint for RAIN (snow sheets keep the snow
    /// colour). Grey by default - a distant rain curtain reads as grey
    /// haze, not the saturated blue of the near streaks.
    pub rain_impostor_r: f32,
    pub rain_impostor_g: f32,
    pub rain_impostor_b: f32,

    /* --- Camera rain-on-glass lens droplets (composite FS Heartfelt FX) --- */
    /// Droplet COUNT / coverage on the lens - independent of drop size (that
    /// is `rain_lens_size`). 1.0 = every grid cell has a drop (stock). Below
    /// 1.0 leaves a fraction of cells empty so the SAME-size drops just get
    /// sparser. Above 1.0 stacks extra same-size drop layers so the count
    /// rises without the drops shrinking. Raise this for "more drops".
    pub rain_lens_density: f32,
    /// Refraction strength of each lens droplet: how far the scene is bent
    /// through a drop. Higher = stronger fisheye per drop. Stock was 1.7.
    pub rain_lens_refract: f32,
    /// Animation speed of the lens droplets (trickle / spawn rate). 1.0 =
    /// stock; higher = faster running drops.
    pub rain_lens_speed: f32,
    /// Droplet SIZE on the lens: the drop-grid frequency. 1.0 = stock size.
    /// Higher = smaller, tighter drops; lower = bigger, coarser drops. This
    /// is the knob that used to be tangled into `rain_lens_density` (raising
    /// density only shrank the drops); size and count are now separate.
    pub rain_lens_size: f32,

    /* --- Wet-surface rain ripples (hex terrain FS, hex_fs_rain block).
     * Raindrop rings + a continuous rippled wet sheet on up-faces, and water
     * trickling down side-faces / tree trunks. --- */
    /// Raindrop impact-ring cells per metre on up-faces (bigger = smaller rings).
    pub rain_ripple_scale: f32,
    /// Normal push from the impact rings.
    pub rain_ripple_strength: f32,
    /// Side drop UV scale U (horizontal, in texture-UV units): drop width /
    /// count across a block side.
    pub rain_flow_across: f32,
    /// Side drop UV scale V (vertical, in texture-UV units): RAISE to shorten
    /// the vertical streak / make the side drops rounder.
    pub rain_flow_down: f32,
    /// Downward trickle scroll speed.
    pub rain_flow_speed: f32,
    /// Normal push from the side-face trickles.
    pub rain_flow_strength: f32,
    /// Continuous wet-sheet ripple frequency (bigger = finer ripples).
    pub rain_wave_scale: f32,
    /// Continuous wet-sheet ripple normal push (the always-wet look).
    pub rain_wave_strength: f32,
    /// Continuous wet-sheet ripple animation speed.
    pub rain_wave_speed: f32,
    /// Wet surfaces darken toward this factor (0.72 = 28% darker).
    pub rain_wet_darken: f32,
    /// Wet sheen from SKY light - visible under the rain's own overcast.
    pub rain_sky_sheen: f32,
    /// Direct-sun glint tightness off the wet normal (only when sun is out).
    pub rain_glint_power: f32,
    /// Direct-sun glint brightness (0 = no sparkle).
    pub rain_glint_strength: f32,

    /* --- Wind (drives grass sway; see client scatter sway) --- */
    /// Calm-day baseline wind (0..1) - grass always breathes a little.
    pub base_wind: f32,
    /// Gust strength added on top of the base, from a drifting noise.
    pub gust_amp: f32,
    /// Spatial frequency of the gust field over the sphere.
    pub gust_scale: f32,
    /// How fast the gust field drifts (multiplied by seconds).
    pub gust_drift: f32,
    /// Extra wind per unit of overcast coverage (cloudy = breezier).
    pub overcast_wind: f32,
    /// Extra wind while a cell is precipitating (storms pick up).
    pub storm_wind: f32,
    /// Hard cap on the wind factor.
    pub wind_max: f32,
    /// How hard the pressure gradient steers the wind DIRECTION away from
    /// the base cloud-drift flow. 0 = wind just follows the global drift;
    /// higher bends it toward low-pressure (cloudy) cells.
    pub wind_dir_pressure: f32,
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
        rain_cover_min: 0.5,
        rain_min_s: 15.0,
        min_alpha: 0.32,
        small_extra_drift: 6.0,
        default_moisture: 0.66,
        rain_cloud_scale: 1.7,
        rain_fog_mult: 3.6,
        cloud_fog_add: 0.8,
        overcast_sun_dim: 0.72,
        overcast_amb_dim: 0.48,
        overcast_sky_blue_cut: 0.75,
        overcast_sky_haze: 0.6,
        overcast_sky_dim: 0.6,
        rain_fall_mps: 50.0,
        rain_width_m: 0.014,
        rain_density_mult: 3.5,
        rain_streak_m: 3.5,
        snow_fall_mps: 3.0,
        snow_streak_m: 0.4,
        snow_density_mult: 2.0,
        rain_color_r: 0.45,
        rain_color_g: 0.62,
        rain_color_b: 1.0,
        rain_alpha_near: 0.38,
        rain_alpha_far: 0.10,
        wet_fade_tau_s: 1.6,
        rain_lod_alt_m: 200.0,
        rain_lod_far_frac: 0.25,
        rain_detail_range_m: 250.0,
        rain_impostor_alpha: 0.5,
        rain_impostor_r: 0.55,
        rain_impostor_g: 0.58,
        rain_impostor_b: 0.62,
        rain_lens_density: 1.0,
        rain_lens_refract: 1.7,
        rain_lens_speed: 1.0,
        rain_lens_size: 1.0,
        rain_ripple_scale: 5.0,
        rain_ripple_strength: 2.0,
        rain_flow_across: 4.0,
        rain_flow_down: 16.0,
        rain_flow_speed: 1.3,
        rain_flow_strength: 3.0,
        rain_wave_scale: 7.0,
        rain_wave_strength: 0.6,
        rain_wave_speed: 1.4,
        rain_wet_darken: 0.72,
        rain_sky_sheen: 0.8,
        rain_glint_power: 24.0,
        rain_glint_strength: 0.5,

        base_wind: 0.35,
        gust_amp: 0.55,
        gust_scale: 3.0,
        gust_drift: 0.08,
        overcast_wind: 0.4,
        storm_wind: 1.1,
        wind_max: 2.2,
        wind_dir_pressure: 8.0,
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
            "rain_cover_min" => cfg.rain_cover_min = v,
            "rain_min_s" => cfg.rain_min_s = v,
            "min_alpha" => cfg.min_alpha = v,
            "small_extra_drift" => cfg.small_extra_drift = v,
            "default_moisture" => cfg.default_moisture = v,
            "rain_cloud_scale" => cfg.rain_cloud_scale = v,
            "rain_fog_mult" => cfg.rain_fog_mult = v,
            "cloud_fog_add" => cfg.cloud_fog_add = v,
            "rain_fall_mps" => cfg.rain_fall_mps = v,
            "rain_width_m" => cfg.rain_width_m = v,
            "rain_density_mult" => cfg.rain_density_mult = v,
            "rain_streak_m" => cfg.rain_streak_m = v,
            "snow_fall_mps" => cfg.snow_fall_mps = v,
            "snow_streak_m" => cfg.snow_streak_m = v,
            "snow_density_mult" => cfg.snow_density_mult = v,
            "rain_color_r" => cfg.rain_color_r = v,
            "rain_color_g" => cfg.rain_color_g = v,
            "rain_color_b" => cfg.rain_color_b = v,
            "rain_alpha_near" => cfg.rain_alpha_near = v,
            "rain_alpha_far" => cfg.rain_alpha_far = v,
            "wet_fade_tau_s" => cfg.wet_fade_tau_s = v,
            "rain_lod_alt_m" => cfg.rain_lod_alt_m = v,
            "rain_lod_far_frac" => cfg.rain_lod_far_frac = v,
            "rain_detail_range_m" => cfg.rain_detail_range_m = v,
            "rain_impostor_alpha" => cfg.rain_impostor_alpha = v,
            "rain_impostor_r" => cfg.rain_impostor_r = v,
            "rain_impostor_g" => cfg.rain_impostor_g = v,
            "rain_impostor_b" => cfg.rain_impostor_b = v,
            "rain_lens_density" => cfg.rain_lens_density = v,
            "rain_lens_refract" => cfg.rain_lens_refract = v,
            "rain_lens_speed" => cfg.rain_lens_speed = v,
            "rain_lens_size" => cfg.rain_lens_size = v,
            "rain_ripple_scale" => cfg.rain_ripple_scale = v,
            "rain_ripple_strength" => cfg.rain_ripple_strength = v,
            "rain_flow_across" => cfg.rain_flow_across = v,
            "rain_flow_down" => cfg.rain_flow_down = v,
            "rain_flow_speed" => cfg.rain_flow_speed = v,
            "rain_flow_strength" => cfg.rain_flow_strength = v,
            "rain_wave_scale" => cfg.rain_wave_scale = v,
            "rain_wave_strength" => cfg.rain_wave_strength = v,
            "rain_wave_speed" => cfg.rain_wave_speed = v,
            "rain_wet_darken" => cfg.rain_wet_darken = v,
            "rain_sky_sheen" => cfg.rain_sky_sheen = v,
            "rain_glint_power" => cfg.rain_glint_power = v,
            "rain_glint_strength" => cfg.rain_glint_strength = v,
            "overcast_sun_dim" => cfg.overcast_sun_dim = v,
            "overcast_amb_dim" => cfg.overcast_amb_dim = v,
            "overcast_sky_blue_cut" => cfg.overcast_sky_blue_cut = v,
            "overcast_sky_haze" => cfg.overcast_sky_haze = v,
            "overcast_sky_dim" => cfg.overcast_sky_dim = v,
            "base_wind" => cfg.base_wind = v,
            "gust_amp" => cfg.gust_amp = v,
            "gust_scale" => cfg.gust_scale = v,
            "gust_drift" => cfg.gust_drift = v,
            "overcast_wind" => cfg.overcast_wind = v,
            "storm_wind" => cfg.storm_wind = v,
            "wind_max" => cfg.wind_max = v,
            "wind_dir_pressure" => cfg.wind_dir_pressure = v,
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

/// Global moisture boost (0..1) - the weather menu's "push moisture to max"
/// knob. It lerps every cell's cloud density toward full saturation, so
/// raising it thickens clouds everywhere and, at 1.0, pushes the whole
/// planet past the rain threshold into a storm. 0 = the natural field.
/// Runtime-only (not a config default); the field stays deterministic per
/// seed+pos+time so a given boost value looks the same on every client.
static S_MOISTURE_BOOST: Mutex<f32> = Mutex::new(0.0);

/// Current global moisture boost (0..1).
pub fn moisture_boost() -> f32 {
    *S_MOISTURE_BOOST.lock().unwrap()
}

/// Set the global moisture boost (0..1); clamped. Drives storm formation
/// from the weather menu without forking a second force-storm path.
pub fn set_moisture_boost(v: f32) {
    *S_MOISTURE_BOOST.lock().unwrap() = v.clamp(0.0, 1.0);
}

/// Cloud density in [0, 1]: warmth (solar) condensing the moisture source,
/// with the dry end cleared by the aridity gamma so deserts rarely cloud.
/// The global [`moisture_boost`] then lerps the result toward full cover.
pub fn cloud_density(body: &BodyConfig, dir: DVec3, t_s: f64) -> f32 {
    let cfg = config();
    let base = moisture_source(body, dir);
    let heat = cfg.solar_floor + (1.0 - cfg.solar_floor) * solar(body, dir, t_s);
    let d = (base * heat).clamp(0.0, 1.0);
    let d = d.powf(cfg.arid_gamma).clamp(0.0, 1.0);
    let boost = moisture_boost();
    (d + boost * (1.0 - d)).clamp(0.0, 1.0)
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
    /* Rain under any cloud big enough to see (cover >= rain_cover_min), and
     * keep raining for at least rain_min_s after it thins: if the column was
     * that cloudy rain_min_s ago it still counts as raining now. Both samples
     * come from the same deterministic field, so it stays stateless and every
     * client agrees. */
    let raining = if cover >= cfg.rain_cover_min {
        true
    } else if cfg.rain_min_s > 0.0 {
        let past = cloud_density(body, dir, t_s - cfg.rain_min_s as f64);
        smoothstep(cfg.cloud_min, cfg.cloud_full, past) >= cfg.rain_cover_min
    } else {
        false
    };
    let precip = if raining { precip_kind(body, dir) } else { Precip::None };
    CloudCell { cover, alpha, raining, precip }
}

/// Wind strength at a surface cell, driven by the atmospheric sim: a
/// calm baseline + drifting gust field, with overcast and (especially)
/// rain picking it up. Returns a 0..`wind_max` factor the client scales
/// grass-sway speed + amplitude by, so grass breathes on a clear day and
/// whips in a storm. Deterministic (seed + position + time), so every
/// client on a body agrees without syncing.
pub fn wind01(body: &BodyConfig, dir: DVec3, t_s: f64) -> f32 {
    let cfg = config();
    /* Drifting gust field: low-frequency simplex over the sphere, scrolled
     * in time so gusts roll across the land. */
    let s = cfg.gust_scale;
    let dt = (t_s * cfg.gust_drift as f64) as f32;
    let g = simplex3(
        body.seed ^ 0x5741_4E44,
        dir.x as f32 * s + dt,
        dir.y as f32 * s,
        dir.z as f32 * s - dt * 0.5,
    ); /* -1..1 */
    let gust = 0.5 + 0.5 * g; /* 0..1 */
    let mut w = cfg.base_wind + gust * cfg.gust_amp;
    /* Weather picks the wind up: overcast is breezier, a storm whips. */
    let d = cloud_density(body, dir, t_s);
    if d >= cfg.rain_threshold {
        w += cfg.storm_wind;
    } else {
        w += smoothstep(cfg.cloud_min, cfg.cloud_full, d) * cfg.overcast_wind;
    }
    w.clamp(0.0, cfg.wind_max)
}

/// Wind FLOW direction at a surface cell, as a unit world-space vector
/// tangent to the sphere. Composes two pieces of the user's model:
/// - **Follows the clouds**: clouds advect by a rigid spin about the body
///   Y axis, so the base flow runs "east" - the direction surface points
///   travel under that spin.
/// - **High -> low pressure**: treating cloud masses as lows (rising, moist
///   air) and clear sky as highs, wind flows down the pressure gradient,
///   i.e. toward rising cloud density. We sample the density gradient on
///   the tangent plane and steer the base flow along it (`wind_dir_pressure`).
///
/// Deterministic (seed + position + time), so every client agrees without
/// syncing. Pair with [`wind01`] for the matching wind STRENGTH.
pub fn wind_dir(body: &BodyConfig, dir: DVec3, t_s: f64) -> DVec3 {
    let cfg = config();
    let n = dvec3_normalize(dir);
    let y = DVec3 { x: 0.0, y: 1.0, z: 0.0 };
    /* East tangent = travel direction under the cloud-drift Y spin;
     * degenerate at the poles, so fall back to the X axis there. */
    let mut east = dvec3_cross(n, y);
    if dvec3_dot(east, east) < 1e-6 {
        east = dvec3_cross(n, DVec3 { x: 1.0, y: 0.0, z: 0.0 });
    }
    let east = dvec3_normalize(east);
    let north = dvec3_cross(east, n); /* completes the tangent basis */
    /* Central-difference the cloud-density (pressure proxy) gradient on the
     * tangent plane; wind flows toward higher density (toward the low). */
    let eps = 0.03f64;
    let cd = |d: DVec3| cloud_density(body, dvec3_normalize(d), t_s) as f64;
    let ge = cd(dvec3_add(n, dvec3_scale(east, eps))) - cd(dvec3_sub(n, dvec3_scale(east, eps)));
    let gn = cd(dvec3_add(n, dvec3_scale(north, eps))) - cd(dvec3_sub(n, dvec3_scale(north, eps)));
    let grad = dvec3_add(dvec3_scale(east, ge), dvec3_scale(north, gn));
    let mut flow = dvec3_add(east, dvec3_scale(grad, cfg.wind_dir_pressure as f64));
    /* Re-project onto the tangent plane (kill any radial component). */
    flow = dvec3_sub(flow, dvec3_scale(n, dvec3_dot(flow, n)));
    if dvec3_dot(flow, flow) < 1e-9 {
        east
    } else {
        dvec3_normalize(flow)
    }
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
    fn wind_dir_is_unit_and_tangent() {
        set_config(WeatherConfig::DEFAULT);
        let body = crate::planet::get(crate::planet::BodyId::Tenebris);
        for (x, y, z) in [(1.0, 0.2, 0.3), (-0.4, 0.9, 0.1), (0.1, -0.3, 0.95)] {
            let d = dvec3_normalize(DVec3 { x, y, z });
            let w = wind_dir(&body, d, 1234.0);
            let len = dvec3_dot(w, w).sqrt();
            assert!((len - 1.0).abs() < 1e-5, "wind dir must be unit, got {}", len);
            /* Perpendicular to the surface normal (tangent to the sphere). */
            assert!(dvec3_dot(w, d).abs() < 1e-4, "wind dir must be tangent");
        }
    }

    #[test]
    fn smoothstep_ramps() {
        assert_eq!(smoothstep(0.3, 0.7, 0.2), 0.0);
        assert_eq!(smoothstep(0.3, 0.7, 0.8), 1.0);
        let mid = smoothstep(0.3, 0.7, 0.5);
        assert!((mid - 0.5).abs() < 1e-6);
    }
}
