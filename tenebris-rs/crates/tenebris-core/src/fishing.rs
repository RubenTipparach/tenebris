//! Fishing minigame tuning - the cast / bite / reel timing knobs the
//! client's fishing rod reads (see client `fishing.rs`).
//!
//! This module only owns the designer knobs (per the repo's "tunables
//! in YAML / no magic numbers" rule): `assets/config/fishing.yaml`.

use std::sync::Mutex;

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct FishingConfig {
    /// Forward speed of a cast bobber, m/s.
    pub cast_speed_mps: f32,
    /// Upward kick of a cast, m/s.
    pub cast_lift_mps: f32,
    /// Gravity pulling the flying bobber down, m/s^2.
    pub cast_gravity_mps2: f32,
    /// Bite wait window: uniform-random seconds between these bounds.
    pub bite_wait_min_s: f32,
    pub bite_wait_max_s: f32,
    /// How long the bobber stays dipped - the click-to-hook window.
    pub bite_window_s: f32,
    /// Seconds the reel-in takes (bobber flies back to the rod).
    pub reel_time_s: f32,
    /// Chance (0..1) a catch lands a second fish.
    pub bonus_catch_chance: f32,
}

impl FishingConfig {
    pub const DEFAULT: FishingConfig = FishingConfig {
        cast_speed_mps: 11.0,
        cast_lift_mps: 3.5,
        cast_gravity_mps2: 16.0,
        bite_wait_min_s: 2.0,
        bite_wait_max_s: 6.0,
        bite_window_s: 0.9,
        reel_time_s: 0.9,
        bonus_catch_chance: 0.15,
    };
}

static S_FISHING: Mutex<FishingConfig> = Mutex::new(FishingConfig::DEFAULT);

/// Current fishing tuning (compiled-in defaults until `load_config`).
pub fn config() -> FishingConfig {
    *S_FISHING.lock().unwrap()
}

/// Install a config directly (bypasses the yaml merge). For tests.
pub fn set_config(cfg: FishingConfig) {
    *S_FISHING.lock().unwrap() = cfg;
}

/// Parse fishing.yaml (tiny key/value subset). Zero / omitted keeps
/// the compiled-in default; negative bonus_catch_chance = off.
pub fn parse_config(src: &str, _path: &str) -> FishingConfig {
    let mut cfg = FishingConfig::DEFAULT;
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
            continue;
        }
        let c = v.max(0.0);
        match key {
            "cast_speed_mps" => cfg.cast_speed_mps = c,
            "cast_lift_mps" => cfg.cast_lift_mps = c,
            "cast_gravity_mps2" => cfg.cast_gravity_mps2 = c,
            "bite_wait_min_s" => cfg.bite_wait_min_s = c,
            "bite_wait_max_s" => cfg.bite_wait_max_s = c,
            "bite_window_s" => cfg.bite_window_s = c,
            "reel_time_s" => cfg.reel_time_s = c,
            "bonus_catch_chance" => cfg.bonus_catch_chance = c,
            _ => {}
        }
    }
    *S_FISHING.lock().unwrap() = cfg;
    cfg
}

/// Load + install fishing.yaml from disk (native / emscripten FS).
pub fn load_config(path: &str) -> FishingConfig {
    match std::fs::read_to_string(path) {
        Ok(src) => parse_config(&src, path),
        Err(_) => {
            println!("[fishing] {} not found, using compiled-in defaults", path);
            FishingConfig::DEFAULT
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn config_parses_and_zero_keeps_default() {
        let c = parse_config("bite_window_s: 1.4\nbonus_catch_chance: -1\n", "t");
        assert_eq!(c.bite_window_s, 1.4);
        assert_eq!(c.bonus_catch_chance, 0.0, "negative = no bonus");
        assert_eq!(c.reel_time_s, FishingConfig::DEFAULT.reel_time_s);
        set_config(FishingConfig::DEFAULT);
    }
}
