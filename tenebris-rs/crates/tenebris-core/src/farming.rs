//! Crop growth model - Core, shared by SP and MP so growth + yields are
//! authoritative and identical on both sides.
//!
//! A crop is a placed *entity* (like a torch), not a voxel: the client
//! (`crops.rs`) owns the list, the surface placement glue, and the
//! rendering; this module owns the pure growth sim + the designer-tunable
//! knobs (see `assets/config/farming.yaml`, per the repo's "tunables in
//! YAML / no magic numbers" rule).
//!
//! The loop is: break grass -> seeds; plant a seed on tilled ground -> a
//! [`Crop`] at `growth = 0`; it ripens over its kind's grow time;
//! harvesting a mature crop yields its produce plus seeds back.
//!
//! Three kinds today ([`CropKind`]): the berry bush (edible berries),
//! wheat (grind... well, bake into bread) and carrots (the root is both
//! food and its own seed). One state machine, one persistence shape,
//! one wire op - a kind byte selects the parameters + visuals.

use crate::items::{self, ItemId};
use crate::math::DVec3;
use std::sync::Mutex;

/// What's planted. Numeric values are stored in saves + packed into the
/// CropDiff wire op word - append only, never renumber.
#[repr(u8)]
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub enum CropKind {
    #[default]
    Berry = 0,
    Wheat = 1,
    Carrot = 2,
}

impl CropKind {
    pub fn from_u8(v: u8) -> CropKind {
        match v {
            1 => CropKind::Wheat,
            2 => CropKind::Carrot,
            _ => CropKind::Berry,
        }
    }
}

/// The seed item that plants this kind (a carrot IS its own seed).
pub fn seed_item(kind: CropKind) -> ItemId {
    match kind {
        CropKind::Berry => items::SEEDS,
        CropKind::Wheat => items::WHEAT_SEEDS,
        CropKind::Carrot => items::CARROT,
    }
}

/// The produce a mature harvest yields.
pub fn produce_item(kind: CropKind) -> ItemId {
    match kind {
        CropKind::Berry => items::BERRIES,
        CropKind::Wheat => items::WHEAT,
        CropKind::Carrot => items::CARROT,
    }
}

/// The kind a seed item plants, if it is a seed.
pub fn kind_for_seed(item: ItemId) -> Option<CropKind> {
    match item {
        items::SEEDS => Some(CropKind::Berry),
        items::WHEAT_SEEDS => Some(CropKind::Wheat),
        items::CARROT => Some(CropKind::Carrot),
        _ => None,
    }
}

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
    pub kind: CropKind,
}

impl Crop {
    pub fn new(pos: DVec3, up: DVec3, tile_idx: i32, kind: CropKind) -> Self {
        Self { pos, up, tile_idx, growth: 0.0, kind }
    }

    /// Restore a crop at a known growth (used on world load).
    pub fn at(pos: DVec3, up: DVec3, tile_idx: i32, growth: f32, kind: CropKind) -> Self {
        Self { pos, up, tile_idx, growth: growth.clamp(0.0, 1.0), kind }
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
    let per_s = 1.0 / cfg.grow_time(c.kind).max(0.001);
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
    /// Probability (0..1) that breaking a grass block drops a berry
    /// seed - the bootstrap that seeds the whole loop.
    pub grass_seed_chance: f32,
    /// Hunger restored by eating one berry (see the eat path in app.rs).
    pub berry_hunger_restore: f32,

    /* Wheat: slower, bakes into bread (the best plant food). */
    pub wheat_grow_time_s: f32,
    pub wheat_yield: f32,
    pub wheat_seed_yield: f32,
    /// Grass-break chance band for wheat seeds (stacked after berry's).
    pub wheat_seed_chance: f32,
    pub bread_hunger_restore: f32,

    /* Carrots: fast, the root is food AND its own seed. */
    pub carrot_grow_time_s: f32,
    pub carrot_yield: f32,
    /// Grass-break chance band for a wild carrot (stacked after wheat's).
    pub carrot_chance: f32,
    pub carrot_hunger_restore: f32,
}

impl FarmingConfig {
    pub const DEFAULT: FarmingConfig = FarmingConfig {
        grow_time_s: 45.0,
        produce_yield: 3.0,
        seed_yield: 2.0,
        grass_seed_chance: 0.35,
        berry_hunger_restore: 15.0,

        wheat_grow_time_s: 70.0,
        wheat_yield: 2.0,
        wheat_seed_yield: 2.0,
        wheat_seed_chance: 0.18,
        bread_hunger_restore: 32.0,

        carrot_grow_time_s: 35.0,
        carrot_yield: 3.0,
        carrot_chance: 0.08,
        carrot_hunger_restore: 10.0,
    };

    /// Grow time (seconds) for a crop kind.
    pub fn grow_time(&self, kind: CropKind) -> f32 {
        match kind {
            CropKind::Berry => self.grow_time_s,
            CropKind::Wheat => self.wheat_grow_time_s,
            CropKind::Carrot => self.carrot_grow_time_s,
        }
    }

    /// Produce items per harvest for a kind.
    pub fn produce_count_of(&self, kind: CropKind) -> u16 {
        let y = match kind {
            CropKind::Berry => self.produce_yield,
            CropKind::Wheat => self.wheat_yield,
            CropKind::Carrot => self.carrot_yield,
        };
        y.max(0.0).round() as u16
    }

    /// Seeds returned per harvest for a kind. Carrots return theirs as
    /// part of the produce (the root replants), so 0 extra here.
    pub fn seed_count_of(&self, kind: CropKind) -> u16 {
        let y = match kind {
            CropKind::Berry => self.seed_yield,
            CropKind::Wheat => self.wheat_seed_yield,
            CropKind::Carrot => 0.0,
        };
        y.max(0.0).round() as u16
    }

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
            "wheat_grow_time_s" => cfg.wheat_grow_time_s = v,
            "wheat_yield" => cfg.wheat_yield = v,
            "wheat_seed_yield" => cfg.wheat_seed_yield = v,
            "wheat_seed_chance" => cfg.wheat_seed_chance = v,
            "bread_hunger_restore" => cfg.bread_hunger_restore = v,
            "carrot_grow_time_s" => cfg.carrot_grow_time_s = v,
            "carrot_yield" => cfg.carrot_yield = v,
            "carrot_chance" => cfg.carrot_chance = v,
            "carrot_hunger_restore" => cfg.carrot_hunger_restore = v,
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
        Crop::new(dvec3_make(1.0, 0.0, 0.0), dvec3_make(1.0, 0.0, 0.0), 7, CropKind::Berry)
    }

    #[test]
    fn kinds_have_their_own_growth_and_yields() {
        let cfg = FarmingConfig::DEFAULT;
        let mut w = Crop::new(dvec3_make(1.0, 0.0, 0.0), dvec3_make(1.0, 0.0, 0.0), 7, CropKind::Wheat);
        grow(&mut w, cfg.wheat_grow_time_s * 0.5, &cfg);
        assert!((w.growth - 0.5).abs() < 1e-4, "wheat uses its own clock");
        assert_eq!(cfg.produce_count_of(CropKind::Carrot), 3);
        assert_eq!(cfg.seed_count_of(CropKind::Carrot), 0, "carrot IS its seed");
        assert_eq!(seed_item(CropKind::Wheat), crate::items::WHEAT_SEEDS);
        assert_eq!(produce_item(CropKind::Wheat), crate::items::WHEAT);
        assert_eq!(kind_for_seed(crate::items::CARROT), Some(CropKind::Carrot));
        assert_eq!(kind_for_seed(crate::items::COAL), None);
        assert_eq!(CropKind::from_u8(2), CropKind::Carrot);
        assert_eq!(CropKind::from_u8(99), CropKind::Berry, "unknown -> berry");
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
