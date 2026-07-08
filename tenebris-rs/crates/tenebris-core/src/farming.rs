//! Crop growth model - Core, shared by SP and MP so growth + yields are
//! authoritative and identical on both sides.
//!
//! A crop is a placed *entity* (like a torch), not a voxel: the client
//! (`crops.rs`) owns the list, the surface placement glue, and the
//! rendering; this module owns the pure growth sim + the designer-tunable
//! knobs (see `assets/config/farming.yaml`, per the repo's "tunables in
//! YAML / no magic numbers" rule).
//!
//! The loop is: break grass -> seeds; plant a seed on the ground -> a
//! [`Crop`] at `growth = 0`; it ripens over `grow_time_s`; harvesting a
//! mature crop yields berries (edible, restores hunger) plus seeds back.

use crate::math::DVec3;
use std::sync::Mutex;

/// One planted crop. `pos` / `up` are world-space feet position + surface
/// normal, matching the `fauna::Animal` convention so the client's
/// surface-placement + rendering paths are shared. `growth` runs from 0.0
/// (just planted) to 1.0 (mature / harvestable).
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct Crop {
    pub pos: DVec3,
    pub up: DVec3,
    /// Anchor tile in the goldberg grid (for per-body save filtering).
    pub tile_idx: i32,
    pub growth: f32,
}

impl Crop {
    pub fn new(pos: DVec3, up: DVec3, tile_idx: i32) -> Self {
        Self { pos, up, tile_idx, growth: 0.0 }
    }

    /// Restore a crop at a known growth (used on world load).
    pub fn at(pos: DVec3, up: DVec3, tile_idx: i32, growth: f32) -> Self {
        Self { pos, up, tile_idx, growth: growth.clamp(0.0, 1.0) }
    }

    /// Fully grown and ready to harvest.
    pub fn is_mature(&self) -> bool {
        self.growth >= 1.0
    }
}

/// Advance a crop's growth by `dt` seconds toward maturity. Clamps at 1.0
/// so a long absence (or a big world-time catch-up delta) just settles to
/// "mature", never overshoots.
pub fn grow(c: &mut Crop, dt: f32, cfg: &FarmingConfig) {
    if c.growth >= 1.0 {
        return;
    }
    let per_s = 1.0 / cfg.grow_time_s.max(0.001);
    c.growth = (c.growth + dt.max(0.0) * per_s).min(1.0);
}

/* --------------------------- config ----------------------------------- */

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct FarmingConfig {
    /// Seconds a freshly-planted crop takes to reach maturity.
    pub grow_time_s: f32,
    /// Berries dropped when a mature crop is harvested.
    pub produce_yield: f32,
    /// Seeds returned when a mature crop is harvested (>= 1 keeps farming
    /// self-sustaining).
    pub seed_yield: f32,
    /// Probability (0..1) that breaking a grass block drops a seed - the
    /// bootstrap that seeds the whole loop.
    pub grass_seed_chance: f32,
    /// Hunger restored by eating one berry (see the eat path in app.rs).
    pub berry_hunger_restore: f32,
}

impl FarmingConfig {
    pub const DEFAULT: FarmingConfig = FarmingConfig {
        grow_time_s: 45.0,
        produce_yield: 3.0,
        seed_yield: 2.0,
        grass_seed_chance: 0.5,
        berry_hunger_restore: 15.0,
    };

    /// Berries per harvest, as an inventory count.
    pub fn produce_count(&self) -> u16 {
        self.produce_yield.max(0.0).round() as u16
    }

    /// Seeds per harvest, as an inventory count.
    pub fn seed_count(&self) -> u16 {
        self.seed_yield.max(0.0).round() as u16
    }
}

static S_FARMING: Mutex<FarmingConfig> = Mutex::new(FarmingConfig::DEFAULT);

/// Current farming tuning (compiled-in defaults until `load_config`).
pub fn config() -> FarmingConfig {
    *S_FARMING.lock().unwrap()
}

/// Install a config directly (bypasses the yaml "zero keeps default"
/// merge). Handy for tests.
pub fn set_config(cfg: FarmingConfig) {
    *S_FARMING.lock().unwrap() = cfg;
}

/// Parse farming.yaml (tiny key/value subset). A field left at / set to
/// its zero value keeps the compiled-in default, matching the other
/// config parsers.
pub fn parse_config(src: &str, _path: &str) -> FarmingConfig {
    let mut cfg = FarmingConfig::DEFAULT;
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
        if v <= 0.0 {
            continue; /* zero / negative / non-numeric keeps the default */
        }
        match key {
            "grow_time_s" => cfg.grow_time_s = v,
            "produce_yield" => cfg.produce_yield = v,
            "seed_yield" => cfg.seed_yield = v,
            "grass_seed_chance" => cfg.grass_seed_chance = v,
            "berry_hunger_restore" => cfg.berry_hunger_restore = v,
            _ => {}
        }
    }
    *S_FARMING.lock().unwrap() = cfg;
    cfg
}

/// Load + install farming.yaml from disk (native / emscripten FS).
pub fn load_config(path: &str) -> FarmingConfig {
    match std::fs::read_to_string(path) {
        Ok(src) => parse_config(&src, path),
        Err(_) => {
            println!("[farming] {} not found, using compiled-in defaults", path);
            FarmingConfig::DEFAULT
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::math::dvec3_make;

    fn crop() -> Crop {
        Crop::new(dvec3_make(1.0, 0.0, 0.0), dvec3_make(1.0, 0.0, 0.0), 7)
    }

    #[test]
    fn growth_reaches_maturity_after_grow_time() {
        let cfg = FarmingConfig::DEFAULT;
        let mut c = crop();
        assert!(!c.is_mature());
        // Half the grow time -> ~50% grown, still not harvestable.
        grow(&mut c, cfg.grow_time_s * 0.5, &cfg);
        assert!((c.growth - 0.5).abs() < 1e-4, "growth = {}", c.growth);
        assert!(!c.is_mature());
        // Finish it (and then some) -> clamped mature.
        grow(&mut c, cfg.grow_time_s * 2.0, &cfg);
        assert_eq!(c.growth, 1.0);
        assert!(c.is_mature());
    }

    #[test]
    fn negative_dt_and_zero_grow_time_are_safe() {
        let mut c = crop();
        // A silly zero grow_time must not divide-by-zero / NaN out.
        let cfg = FarmingConfig { grow_time_s: 0.0, ..FarmingConfig::DEFAULT };
        grow(&mut c, 1.0, &cfg);
        assert_eq!(c.growth, 1.0);
        // Negative dt clamps to no-op.
        let mut d = crop();
        grow(&mut d, -5.0, &FarmingConfig::DEFAULT);
        assert_eq!(d.growth, 0.0);
    }

    #[test]
    fn config_parses_and_zero_keeps_default() {
        let c = parse_config("grow_time_s: 20.0\nseed_yield: 4\n", "t");
        assert_eq!(c.grow_time_s, 20.0);
        assert_eq!(c.seed_count(), 4);
        // Untouched field keeps the default.
        assert_eq!(c.produce_count(), FarmingConfig::DEFAULT.produce_count());
        // Zero keeps the compiled-in default.
        let d = parse_config("grow_time_s: 0\n", "t");
        assert_eq!(d.grow_time_s, FarmingConfig::DEFAULT.grow_time_s);
        // Restore the global so sibling suites see defaults.
        set_config(FarmingConfig::DEFAULT);
    }

    #[test]
    fn counts_round_from_float_yields() {
        let cfg = FarmingConfig {
            produce_yield: 3.4,
            seed_yield: 1.6,
            ..FarmingConfig::DEFAULT
        };
        assert_eq!(cfg.produce_count(), 3);
        assert_eq!(cfg.seed_count(), 2);
    }
}
