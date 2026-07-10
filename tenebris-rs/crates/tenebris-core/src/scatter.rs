//! Decorative surface scatter - tuning for the grass tufts, flowers,
//! rocks, bushes, and underwater kelp / seaweed the client bakes into
//! each terrain chunk mesh (see client `hex_mesher::build_scatter`).
//!
//! Scatter is pure decoration: deterministic per-tile hash placement,
//! no collision, no persistence, rebuilt with the chunk whenever the
//! surface changes. This module only owns the designer knobs (per the
//! repo's "tunables in YAML / no magic numbers" rule) so densities and
//! sizes can be tuned in `assets/config/scatter.yaml` without a
//! recompile.

use std::sync::Mutex;

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct ScatterConfig {
    /* Grass tufts - triangle-blade clumps on grass surface tiles.
     * Minecraft-scale defaults: blades stand ~half a block tall and a
     * covered tile reads ~half full of grass. */
    /// Probability (0..1) a grass surface tile grows a tuft clump.
    pub grass_chance: f32,
    /// Blades per covered tile (upper bound; hash picks ~60%..100%).
    pub grass_blades: f32,
    /// Blade height (metres); per-blade hash varies +-30%.
    pub grass_height_m: f32,
    /// Blade half-width at the base (metres).
    pub grass_blade_w_m: f32,

    /* Flowers - a stem blade with a bright diamond head. */
    /// Probability (0..1) a grass surface tile gets a flower.
    pub flower_chance: f32,
    /// Stem height (metres).
    pub flower_height_m: f32,

    /* Rocks - small stone prisms on bare (dirt/sand/stone) ground. */
    /// Probability (0..1) a bare surface tile gets a rock.
    pub rock_chance: f32,
    /// Rock footprint radius (metres); hash varies size + height.
    pub rock_size_m: f32,

    /* Bushes - leafy lumps on grass / dirt. */
    /// Probability (0..1) a grass/dirt surface tile gets a bush.
    pub bush_chance: f32,
    /// Bush footprint radius (metres).
    pub bush_size_m: f32,

    /* Kelp - tall swaying ribbon stacks on the sea floor. */
    /// Probability (0..1) an underwater surface tile grows kelp.
    pub kelp_chance: f32,
    /// Height of one kelp ribbon segment (metres).
    pub kelp_seg_m: f32,
    /// Max ribbon segments per stalk (water depth also caps it).
    pub kelp_max_segs: f32,

    /* Seaweed - short leafy tufts on the sea floor. */
    /// Probability (0..1) an underwater surface tile grows seaweed.
    pub weed_chance: f32,
    /// Seaweed blade height (metres).
    pub weed_height_m: f32,
}

impl ScatterConfig {
    pub const DEFAULT: ScatterConfig = ScatterConfig {
        grass_chance: 0.8,
        grass_blades: 16.0,
        grass_height_m: 0.55,
        grass_blade_w_m: 0.16,
        flower_chance: 0.12,
        flower_height_m: 0.32,
        rock_chance: 0.10,
        rock_size_m: 0.16,
        bush_chance: 0.05,
        bush_size_m: 0.34,
        kelp_chance: 0.20,
        kelp_seg_m: 0.65,
        kelp_max_segs: 6.0,
        weed_chance: 0.35,
        weed_height_m: 0.30,
    };
}

static S_SCATTER: Mutex<ScatterConfig> = Mutex::new(ScatterConfig::DEFAULT);

/// Current scatter tuning (compiled-in defaults until `load_config`).
pub fn config() -> ScatterConfig {
    *S_SCATTER.lock().unwrap()
}

/// Install a config directly (bypasses the yaml merge). For tests.
pub fn set_config(cfg: ScatterConfig) {
    *S_SCATTER.lock().unwrap() = cfg;
}

/// Parse scatter.yaml (tiny key/value subset). A field left at / set to
/// its zero value keeps the compiled-in default, matching the other
/// config parsers. Setting a *_chance to a negative value is the
/// explicit "off" switch (0 would mean "default").
pub fn parse_config(src: &str, _path: &str) -> ScatterConfig {
    let mut cfg = ScatterConfig::DEFAULT;
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
            continue; /* zero / non-numeric keeps the default */
        }
        /* Negative disables a chance knob (clamped to 0 on read). */
        let c = v.max(0.0);
        match key {
            "grass_chance" => cfg.grass_chance = c,
            "grass_blades" => cfg.grass_blades = c,
            "grass_height_m" => cfg.grass_height_m = c,
            "grass_blade_w_m" => cfg.grass_blade_w_m = c,
            "flower_chance" => cfg.flower_chance = c,
            "flower_height_m" => cfg.flower_height_m = c,
            "rock_chance" => cfg.rock_chance = c,
            "rock_size_m" => cfg.rock_size_m = c,
            "bush_chance" => cfg.bush_chance = c,
            "bush_size_m" => cfg.bush_size_m = c,
            "kelp_chance" => cfg.kelp_chance = c,
            "kelp_seg_m" => cfg.kelp_seg_m = c,
            "kelp_max_segs" => cfg.kelp_max_segs = c,
            "weed_chance" => cfg.weed_chance = c,
            "weed_height_m" => cfg.weed_height_m = c,
            _ => {}
        }
    }
    *S_SCATTER.lock().unwrap() = cfg;
    cfg
}

/// Load + install scatter.yaml from disk (native / emscripten FS).
pub fn load_config(path: &str) -> ScatterConfig {
    match std::fs::read_to_string(path) {
        Ok(src) => parse_config(&src, path),
        Err(_) => {
            println!("[scatter] {} not found, using compiled-in defaults", path);
            ScatterConfig::DEFAULT
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn config_parses_and_zero_keeps_default() {
        let c = parse_config("grass_chance: 0.9\nkelp_max_segs: 3\n", "t");
        assert_eq!(c.grass_chance, 0.9);
        assert_eq!(c.kelp_max_segs, 3.0);
        assert_eq!(c.rock_chance, ScatterConfig::DEFAULT.rock_chance);
        let d = parse_config("grass_chance: 0\n", "t");
        assert_eq!(d.grass_chance, ScatterConfig::DEFAULT.grass_chance);
        /* Negative = explicit off. */
        let e = parse_config("grass_chance: -1\n", "t");
        assert_eq!(e.grass_chance, 0.0);
        set_config(ScatterConfig::DEFAULT);
    }
}
