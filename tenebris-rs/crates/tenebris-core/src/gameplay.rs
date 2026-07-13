//! Gameplay toggles - difficulty / content switches shared by the SP
//! client and the MP server so both honour the same rules.
//!
//! Knobs live in `assets/config/gameplay.yaml` (per the repo's
//! "tunables in YAML" rule). Boolean-style knobs use the same
//! convention as the chance knobs elsewhere: omitted / 0 keeps the
//! compiled-in default, positive = on, negative = off.

use std::sync::Mutex;

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct GameplayConfig {
    /// Hostile night mobs (stalkers). Off = peaceful nights: no
    /// stalker spawns in SP or MP; existing ones still burn off at
    /// dawn as usual.
    pub enemy_mobs: bool,
}

impl GameplayConfig {
    pub const DEFAULT: GameplayConfig = GameplayConfig { enemy_mobs: true };
}

static S_GAMEPLAY: Mutex<GameplayConfig> = Mutex::new(GameplayConfig::DEFAULT);

/// Current gameplay toggles (compiled-in defaults until `load_config`).
pub fn config() -> GameplayConfig {
    *S_GAMEPLAY.lock().unwrap()
}

/// Install a config directly (bypasses the yaml merge). For tests.
pub fn set_config(cfg: GameplayConfig) {
    *S_GAMEPLAY.lock().unwrap() = cfg;
}

/// Parse gameplay.yaml (tiny key/value subset).
pub fn parse_config(src: &str, _path: &str) -> GameplayConfig {
    let mut cfg = GameplayConfig::DEFAULT;
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
            continue; /* zero / omitted keeps the default */
        }
        match key {
            "enemy_mobs" => cfg.enemy_mobs = v > 0.0,
            _ => {}
        }
    }
    *S_GAMEPLAY.lock().unwrap() = cfg;
    cfg
}

/// Load + install gameplay.yaml from disk (native / emscripten FS).
pub fn load_config(path: &str) -> GameplayConfig {
    match std::fs::read_to_string(path) {
        Ok(src) => parse_config(&src, path),
        Err(_) => {
            println!("[gameplay] {} not found, using compiled-in defaults", path);
            GameplayConfig::DEFAULT
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn enemy_toggle_parses() {
        let c = parse_config("enemy_mobs: -1\n", "t");
        assert!(!c.enemy_mobs, "negative = peaceful");
        let d = parse_config("enemy_mobs: 0\n", "t");
        assert!(d.enemy_mobs, "zero keeps the default (on)");
        let e = parse_config("enemy_mobs: 1\n", "t");
        assert!(e.enemy_mobs);
        set_config(GameplayConfig::DEFAULT);
    }
}
