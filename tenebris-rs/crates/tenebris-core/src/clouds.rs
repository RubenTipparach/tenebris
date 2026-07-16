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
    /// Probability (0..1) a cell holds a puff, inside a weather
    /// system (the patch field gates it elsewhere). <= 0 disables
    /// clouds entirely.
    pub density: f32,
    /// Detail range, metres from the player: puffs inside draw their
    /// full lump cluster, puffs beyond LOD down to a single slab. The
    /// layer itself always covers the whole shell (horizon-culled).
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

    /* Weather systems - a low-frequency coverage field clumps the
     * puffs into patches with clear sky between, instead of an even
     * sprinkle over the whole shell. */
    /// Noise frequency of the coverage field on the unit shell
    /// (higher = smaller, more numerous systems).
    pub patch_scale: f32,
    /// Fraction (0..1) of the coverage field held cloud-free. Set
    /// negative in the yaml for a uniform sky (patchiness off).
    pub patch_clear: f32,
    /// Edge softness of a system, in coverage-field units.
    pub patch_soft: f32,

    /* Far LOD - camera altitude gate between the near per-puff shell and
     * the single translucent cloud-texture wrap seen from orbit. Below
     * `lod_alt_m` the detailed puffs draw (they no longer cull with
     * distance until this height); above it they give way to one
     * transparent equirect cloud shell so the planet still wears clouds
     * from far out without thousands of sub-pixel puff boxes. `lod_fade_m`
     * is the crossfade band so the swap doesn't pop. */
    /// Camera altitude (m above the surface) where the per-puff shell
    /// hands over to the far cloud-texture wrap.
    pub lod_alt_m: f32,
    /// Crossfade band (m) around `lod_alt_m`: puffs fade out / the shell
    /// fades in across it so the LOD swap is smooth.
    pub lod_fade_m: f32,
    /// Peak opacity of the far cloud-texture shell (0..1).
    pub shell_alpha: f32,
}

impl CloudsConfig {
    pub const DEFAULT: CloudsConfig = CloudsConfig {
        altitude_m: 72.0,
        cell_m: 30.0,
        density: 0.38,
        range_m: 230.0,
        drift_mps: 1.6,
        puff_w_m: 9.0,
        puff_h_m: 2.6,
        color: [0.98, 0.98, 1.0],
        night_min: 0.32,
        patch_scale: 4.0,
        patch_clear: 0.45,
        patch_soft: 0.18,
        lod_alt_m: 10000.0,
        lod_fade_m: 3000.0,
        shell_alpha: 0.6,
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
            "patch_scale" => cfg.patch_scale = c,
            "patch_clear" => cfg.patch_clear = c, /* negative -> 0 = uniform */
            "patch_soft" => cfg.patch_soft = c,
            "lod_alt_m" => cfg.lod_alt_m = c,
            "lod_fade_m" => cfg.lod_fade_m = c,
            "shell_alpha" => cfg.shell_alpha = c,
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
        let p = parse_config("patch_scale: 6\npatch_clear: -1\n", "t");
        assert_eq!(p.patch_scale, 6.0);
        assert_eq!(p.patch_clear, 0.0, "negative patch_clear = uniform sky");
        assert_eq!(p.patch_soft, CloudsConfig::DEFAULT.patch_soft);
        set_config(CloudsConfig::DEFAULT);
    }

    #[test]
    fn lod_shell_fields_parse() {
        let c = parse_config("lod_alt_m: 8000\nlod_fade_m: 2000\nshell_alpha: 0.5\n", "t");
        assert_eq!(c.lod_alt_m, 8000.0);
        assert_eq!(c.lod_fade_m, 2000.0);
        assert_eq!(c.shell_alpha, 0.5);
        /* Zero keeps the compiled-in default (the merge rule). */
        let d = parse_config("lod_alt_m: 0\n", "t");
        assert_eq!(d.lod_alt_m, CloudsConfig::DEFAULT.lod_alt_m);
        set_config(CloudsConfig::DEFAULT);
    }
}
