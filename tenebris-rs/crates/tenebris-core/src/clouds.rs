//! Cloud layer tuning - the puffy drifting clouds the client draws on
//! a shell above the surface (see client `clouds.rs`).
//!
//! Placement is a deterministic hash over a lat/long cell grid on the
//! cloud shell, drifted by rotating the sample frame with time, so the
//! sky is stable, repeatable, and free of per-cloud state. This module
//! only owns the designer knobs (per the repo's "tunables in YAML / no
//! magic numbers" rule): `assets/config/clouds.yaml`.

use std::sync::Mutex;

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct CloudsConfig {
    /// Cloud shell height above the planet surface, metres.
    pub altitude_m: f32,
    /// Cell size of the placement grid, metres (one puff max per cell).
    pub cell_m: f32,
    /// Probability (0..1) a cell holds a puff. <= 0 disables clouds.
    pub density: f32,
    /// Draw distance for puffs, metres from the player.
    pub range_m: f32,
    /// Drift speed of the layer, metres/second (rotates about the spin
    /// axis, so clouds cross the sky like weather, not a skybox).
    pub drift_mps: f32,
    /// Base half-width of a puff, metres (hash varies each).
    pub puff_w_m: f32,
    /// Base half-height (thickness) of a puff, metres.
    pub puff_h_m: f32,
    /// Cloud albedo (day). Night scales down with the sun.
    pub color: [f32; 3],
    /// Floor on the night-side brightness so moonlit clouds stay
    /// faintly visible instead of going pitch black.
    pub night_min: f32,
}

impl CloudsConfig {
    pub const DEFAULT: CloudsConfig = CloudsConfig {
        altitude_m: 72.0,
        cell_m: 30.0,
        density: 0.32,
        range_m: 230.0,
        drift_mps: 1.6,
        puff_w_m: 9.0,
        puff_h_m: 2.6,
        color: [0.98, 0.98, 1.0],
        night_min: 0.32,
    };
}

static S_CLOUDS: Mutex<CloudsConfig> = Mutex::new(CloudsConfig::DEFAULT);

/// Current cloud tuning (compiled-in defaults until `load_config`).
pub fn config() -> CloudsConfig {
    *S_CLOUDS.lock().unwrap()
}

/// Install a config directly (bypasses the yaml merge). For tests.
pub fn set_config(cfg: CloudsConfig) {
    *S_CLOUDS.lock().unwrap() = cfg;
}

/// Parse clouds.yaml (tiny key/value subset; `color` is a vec3 list).
/// A field set to / left at zero keeps the compiled-in default; a
/// negative `density` switches clouds off.
pub fn parse_config(src: &str, _path: &str) -> CloudsConfig {
    let mut cfg = CloudsConfig::DEFAULT;
    for raw in src.split('\n') {
        let line = match raw.find('#') {
            Some(h) => &raw[..h],
            None => raw,
        }
        .trim();
        let Some(colon) = line.find(':') else { continue };
        let key = line[..colon].trim();
        let val = line[colon + 1..].trim();
        if key == "color" {
            let inner = val.trim_start_matches('[').trim_end_matches(']');
            let parts: Vec<f32> =
                inner.split(',').filter_map(|s| s.trim().parse().ok()).collect();
            if parts.len() == 3 && parts.iter().any(|v| *v > 0.0) {
                cfg.color = [parts[0], parts[1], parts[2]];
            }
            continue;
        }
        let Ok(v) = val.parse::<f32>() else { continue };
        if v == 0.0 {
            continue;
        }
        let c = v.max(0.0);
        match key {
            "altitude_m" => cfg.altitude_m = c,
            "cell_m" => cfg.cell_m = c,
            "density" => cfg.density = c, /* negative -> 0 = off */
            "range_m" => cfg.range_m = c,
            "drift_mps" => cfg.drift_mps = c,
            "puff_w_m" => cfg.puff_w_m = c,
            "puff_h_m" => cfg.puff_h_m = c,
            "night_min" => cfg.night_min = c,
            _ => {}
        }
    }
    *S_CLOUDS.lock().unwrap() = cfg;
    cfg
}

/// Load + install clouds.yaml from disk (native / emscripten FS).
pub fn load_config(path: &str) -> CloudsConfig {
    match std::fs::read_to_string(path) {
        Ok(src) => parse_config(&src, path),
        Err(_) => {
            println!("[clouds] {} not found, using compiled-in defaults", path);
            CloudsConfig::DEFAULT
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn config_parses_and_zero_keeps_default() {
        let c = parse_config("altitude_m: 80\ncolor: [1.0, 0.9, 0.8]\n", "t");
        assert_eq!(c.altitude_m, 80.0);
        assert_eq!(c.color, [1.0, 0.9, 0.8]);
        assert_eq!(c.cell_m, CloudsConfig::DEFAULT.cell_m);
        let d = parse_config("density: -1\n", "t");
        assert_eq!(d.density, 0.0, "negative density = clouds off");
        set_config(CloudsConfig::DEFAULT);
    }
}
