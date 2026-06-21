//! Rocket assembly + validation - Core, shared by SP and MP so a rocket
//! is "flyable" by the same rules everywhere.
//!
//! New feature ported from the deprecated JS reference (the C port has no
//! rocket system yet): `validateRocket()` in
//! `src/player/LaunchPadUI.ts`. A rocket is an ordered vertical stack of
//! rocket-part item ids, bottom -> top (the launch pad stacks parts by
//! height index, engine at index 0). This module owns only the STRUCTURE
//! rules - whether a stack is a valid rocket. The flight model
//! (thrust / fuel / mass) lands with the flight port and its
//! `rocket.yaml`; those are tunables, not hard-coded here.

use crate::items::{ItemId, COMMAND_MODULE, FUEL_TANK, ROCKET_ENGINE};
use std::sync::Mutex;

/// What a part does in an assembly. Mirrors the JS `RocketPartType`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PartRole {
    Engine,
    FuelTank,
    Capsule,
}

/// Role of an item id, or `None` if it isn't a rocket part.
pub fn part_role(id: ItemId) -> Option<PartRole> {
    if id == ROCKET_ENGINE {
        Some(PartRole::Engine)
    } else if id == FUEL_TANK {
        Some(PartRole::FuelTank)
    } else if id == COMMAND_MODULE {
        Some(PartRole::Capsule)
    } else {
        None
    }
}

/// True if this item id is any rocket part (placeable on the launch pad).
pub fn is_rocket_part(id: ItemId) -> bool {
    part_role(id).is_some()
}

/// Why a stack isn't a flyable rocket. An empty fault list == valid.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum RocketFault {
    /// No parts placed at all.
    Empty,
    /// A stack entry isn't a rocket part.
    UnknownPart,
    /// No engine anywhere in the stack.
    NoEngine,
    /// There is an engine, but the bottom part (index 0) isn't it.
    EngineNotAtBottom,
    /// No fuel tank.
    NoFuelTank,
    /// No command module / capsule.
    NoCommandModule,
}

impl RocketFault {
    /// ASCII, player-facing reason (7-bit, no underscores/em-dashes per
    /// the in-game text rules), for the launch-pad UI.
    pub fn message(self) -> &'static str {
        match self {
            RocketFault::Empty => "add parts to build a rocket",
            RocketFault::UnknownPart => "stack has a non-rocket part",
            RocketFault::NoEngine => "needs a rocket engine",
            RocketFault::EngineNotAtBottom => "engine must be at the bottom",
            RocketFault::NoFuelTank => "needs a fuel tank",
            RocketFault::NoCommandModule => "needs a command module",
        }
    }
}

/// Validate a bottom -> top stack of part item ids and return the faults
/// (empty == a flyable rocket). Ports the JS `validateRocket` checks:
/// at least one engine and it sits at the bottom, at least one fuel
/// tank, at least one command module.
pub fn validate(stack: &[ItemId]) -> Vec<RocketFault> {
    let mut faults = Vec::new();
    if stack.is_empty() {
        faults.push(RocketFault::Empty);
        return faults;
    }
    if stack.iter().any(|&id| part_role(id).is_none()) {
        faults.push(RocketFault::UnknownPart);
    }

    let count = |role: PartRole| stack.iter().filter(|&&id| part_role(id) == Some(role)).count();
    let engines = count(PartRole::Engine);

    if engines == 0 {
        faults.push(RocketFault::NoEngine);
    } else if part_role(stack[0]) != Some(PartRole::Engine) {
        faults.push(RocketFault::EngineNotAtBottom);
    }
    if count(PartRole::FuelTank) == 0 {
        faults.push(RocketFault::NoFuelTank);
    }
    if count(PartRole::Capsule) == 0 {
        faults.push(RocketFault::NoCommandModule);
    }
    faults
}

/// Convenience: is this stack a flyable rocket?
pub fn is_flyable(stack: &[ItemId]) -> bool {
    validate(stack).is_empty()
}

/* ------------------------------------------------------------------ */
/* Flight spec: per-part stats + the totals an assembled stack yields. */
/* Ported from the JS RocketConfig (src/config/RocketConfig.ts). The   */
/* numbers are tunables, so they live in assets/config/rocket.yaml,    */
/* parsed below; the compiled-in defaults mirror the JS so a missing   */
/* or partial yaml still flies (the config-merge convention).          */

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct EngineStats {
    pub thrust_n: f32,
    pub fuel_per_sec: f32,
    pub mass_kg: f32,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct FuelTankStats {
    pub capacity: f32,
    pub wet_mass_kg: f32,
    pub dry_mass_kg: f32,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct CommandModuleStats {
    pub mass_kg: f32,
    pub parachute_alt_m: f32,
    pub max_impact_mps: f32,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct FlightConstants {
    pub gravity_mps2: f32,
    pub launch_alt_m: f32,
    pub safe_landing_mps: f32,
    pub drag_coef: f32,
    pub parachute_drag: f32,
}

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct RocketConfig {
    pub engine: EngineStats,
    pub fuel_tank: FuelTankStats,
    pub command_module: CommandModuleStats,
    pub flight: FlightConstants,
}

/// Compiled-in defaults = the JS RocketConfig (MEDIUM_* parts).
pub const DEFAULT_ROCKET_CONFIG: RocketConfig = RocketConfig {
    engine: EngineStats { thrust_n: 39000.0, fuel_per_sec: 10.0, mass_kg: 100.0 },
    fuel_tank: FuelTankStats { capacity: 100.0, wet_mass_kg: 500.0, dry_mass_kg: 50.0 },
    command_module: CommandModuleStats { mass_kg: 200.0, parachute_alt_m: 50.0, max_impact_mps: 10.0 },
    flight: FlightConstants {
        gravity_mps2: 9.81,
        launch_alt_m: 5.0,
        safe_landing_mps: 2.0,
        drag_coef: 0.5,
        parachute_drag: 0.95,
    },
};

impl Default for RocketConfig {
    fn default() -> Self {
        DEFAULT_ROCKET_CONFIG
    }
}

static S_ROCKET_CONFIG: Mutex<RocketConfig> = Mutex::new(DEFAULT_ROCKET_CONFIG);

/// The installed rocket config (a cheap Copy).
pub fn config() -> RocketConfig {
    *S_ROCKET_CONFIG.lock().unwrap()
}

/// Install the global rocket config (call once after `load_rocket_config`).
pub fn set_config(c: RocketConfig) {
    *S_ROCKET_CONFIG.lock().unwrap() = c;
}

/// Parse rocket.yaml: `[section]` headers + `key: value` floats, `#`
/// comments. Unknown sections/keys are ignored; a field that doesn't
/// parse keeps its compiled-in default (overwrite only on a clean parse).
pub fn parse_rocket_config(src: &str) -> RocketConfig {
    let mut c = RocketConfig::default();
    let mut section = String::new();
    for raw in src.split('\n') {
        let line = match raw.find('#') {
            Some(h) => &raw[..h],
            None => raw,
        }
        .trim();
        if line.is_empty() {
            continue;
        }
        if let Some(name) = line.strip_prefix('[').and_then(|s| s.strip_suffix(']')) {
            section = name.trim().to_string();
            continue;
        }
        let Some(colon) = line.find(':') else { continue };
        let key = line[..colon].trim();
        let Ok(val) = line[colon + 1..].trim().parse::<f32>() else { continue };
        match (section.as_str(), key) {
            ("engine", "thrust_n") => c.engine.thrust_n = val,
            ("engine", "fuel_per_sec") => c.engine.fuel_per_sec = val,
            ("engine", "mass_kg") => c.engine.mass_kg = val,
            ("fuel_tank", "capacity") => c.fuel_tank.capacity = val,
            ("fuel_tank", "wet_mass_kg") => c.fuel_tank.wet_mass_kg = val,
            ("fuel_tank", "dry_mass_kg") => c.fuel_tank.dry_mass_kg = val,
            ("command_module", "mass_kg") => c.command_module.mass_kg = val,
            ("command_module", "parachute_alt_m") => c.command_module.parachute_alt_m = val,
            ("command_module", "max_impact_mps") => c.command_module.max_impact_mps = val,
            ("flight", "gravity_mps2") => c.flight.gravity_mps2 = val,
            ("flight", "launch_alt_m") => c.flight.launch_alt_m = val,
            ("flight", "safe_landing_mps") => c.flight.safe_landing_mps = val,
            ("flight", "drag_coef") => c.flight.drag_coef = val,
            ("flight", "parachute_drag") => c.flight.parachute_drag = val,
            _ => {}
        }
    }
    c
}

/// Load + parse rocket.yaml from disk (native), defaults if missing.
pub fn load_rocket_config(path: &str) -> RocketConfig {
    match std::fs::read_to_string(path) {
        Ok(src) => parse_rocket_config(&src),
        Err(_) => {
            println!("[rocket] {} not found, using compiled defaults", path);
            RocketConfig::default()
        }
    }
}

/// The aggregate flight characteristics of an assembled part stack -
/// what the flight controller integrates over. Summed from the per-part
/// stats in [`RocketConfig`].
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct RocketSpec {
    pub engines: u32,
    pub tanks: u32,
    pub capsules: u32,
    pub total_thrust_n: f32,
    pub fuel_per_sec: f32,
    pub fuel_capacity: f32,
    /// Mass with empty tanks.
    pub dry_mass_kg: f32,
    /// Mass with full tanks (dry + fuel).
    pub wet_mass_kg: f32,
}

impl RocketSpec {
    /// Sum a bottom -> top part stack into its flight spec. Non-part
    /// entries are ignored (validation rejects them separately).
    pub fn from_parts(stack: &[ItemId], cfg: &RocketConfig) -> RocketSpec {
        let mut s = RocketSpec::default();
        for &id in stack {
            match part_role(id) {
                Some(PartRole::Engine) => {
                    s.engines += 1;
                    s.total_thrust_n += cfg.engine.thrust_n;
                    s.fuel_per_sec += cfg.engine.fuel_per_sec;
                    s.dry_mass_kg += cfg.engine.mass_kg;
                    s.wet_mass_kg += cfg.engine.mass_kg;
                }
                Some(PartRole::FuelTank) => {
                    s.tanks += 1;
                    s.fuel_capacity += cfg.fuel_tank.capacity;
                    s.dry_mass_kg += cfg.fuel_tank.dry_mass_kg;
                    s.wet_mass_kg += cfg.fuel_tank.wet_mass_kg;
                }
                Some(PartRole::Capsule) => {
                    s.capsules += 1;
                    s.dry_mass_kg += cfg.command_module.mass_kg;
                    s.wet_mass_kg += cfg.command_module.mass_kg;
                }
                None => {}
            }
        }
        s
    }

    /// Thrust-to-weight ratio at full fuel (wet mass). > 1 can lift off
    /// against `gravity_mps2`. 0 when the rocket has no mass.
    pub fn twr(&self, gravity_mps2: f32) -> f32 {
        let weight = self.wet_mass_kg * gravity_mps2;
        if weight > 0.0 {
            self.total_thrust_n / weight
        } else {
            0.0
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::blocks::Block;
    use crate::items::from_block;

    /// A minimal valid rocket, bottom -> top: engine, tank, capsule.
    const MIN_ROCKET: [ItemId; 3] = [ROCKET_ENGINE, FUEL_TANK, COMMAND_MODULE];

    #[test]
    fn part_roles_map_only_the_three_parts() {
        assert_eq!(part_role(ROCKET_ENGINE), Some(PartRole::Engine));
        assert_eq!(part_role(FUEL_TANK), Some(PartRole::FuelTank));
        assert_eq!(part_role(COMMAND_MODULE), Some(PartRole::Capsule));
        // A block is not a rocket part.
        assert_eq!(part_role(from_block(Block::Stone)), None);
        assert!(!is_rocket_part(from_block(Block::Stone)));
        assert!(is_rocket_part(ROCKET_ENGINE));
    }

    #[test]
    fn minimal_stack_is_flyable() {
        assert!(validate(&MIN_ROCKET).is_empty());
        assert!(is_flyable(&MIN_ROCKET));
    }

    #[test]
    fn extra_tanks_are_fine() {
        let stack = [ROCKET_ENGINE, FUEL_TANK, FUEL_TANK, COMMAND_MODULE];
        assert!(is_flyable(&stack));
    }

    #[test]
    fn empty_stack_reports_empty() {
        assert_eq!(validate(&[]), vec![RocketFault::Empty]);
        assert!(!is_flyable(&[]));
    }

    #[test]
    fn missing_each_part_is_reported() {
        // no engine
        assert!(validate(&[FUEL_TANK, COMMAND_MODULE]).contains(&RocketFault::NoEngine));
        // no fuel tank
        assert!(validate(&[ROCKET_ENGINE, COMMAND_MODULE]).contains(&RocketFault::NoFuelTank));
        // no command module
        assert!(validate(&[ROCKET_ENGINE, FUEL_TANK]).contains(&RocketFault::NoCommandModule));
    }

    #[test]
    fn engine_must_be_at_the_bottom() {
        // engine present but not at index 0
        let stack = [FUEL_TANK, ROCKET_ENGINE, COMMAND_MODULE];
        let faults = validate(&stack);
        assert!(faults.contains(&RocketFault::EngineNotAtBottom));
        assert!(!faults.contains(&RocketFault::NoEngine));
        assert!(!is_flyable(&stack));
    }

    #[test]
    fn non_part_in_stack_is_rejected() {
        let stack = [ROCKET_ENGINE, from_block(Block::Stone), FUEL_TANK, COMMAND_MODULE];
        assert!(validate(&stack).contains(&RocketFault::UnknownPart));
    }

    #[test]
    fn fault_messages_are_ascii() {
        for f in [
            RocketFault::Empty,
            RocketFault::UnknownPart,
            RocketFault::NoEngine,
            RocketFault::EngineNotAtBottom,
            RocketFault::NoFuelTank,
            RocketFault::NoCommandModule,
        ] {
            assert!(f.message().is_ascii(), "{:?} message must be 7-bit ASCII", f);
            assert!(!f.message().contains('_'), "{:?} message must not use underscores", f);
        }
    }

    #[test]
    fn config_parses_sections_and_keeps_defaults() {
        let src = "\
# tweak two values, leave the rest default
[engine]
thrust_n: 50000
[flight]
gravity_mps2: 3.7
";
        let c = parse_rocket_config(src);
        assert_eq!(c.engine.thrust_n, 50000.0); // overridden
        assert_eq!(c.engine.fuel_per_sec, 10.0); // default kept
        assert_eq!(c.flight.gravity_mps2, 3.7); // overridden
        assert_eq!(c.fuel_tank.capacity, 100.0); // default kept
    }

    #[test]
    fn spec_sums_an_assembled_stack() {
        let cfg = RocketConfig::default();
        let spec = RocketSpec::from_parts(&MIN_ROCKET, &cfg);
        assert_eq!(spec.engines, 1);
        assert_eq!(spec.tanks, 1);
        assert_eq!(spec.capsules, 1);
        assert_eq!(spec.total_thrust_n, 39000.0);
        assert_eq!(spec.fuel_capacity, 100.0);
        assert_eq!(spec.fuel_per_sec, 10.0);
        // dry = engine 100 + tank 50 + capsule 200
        assert_eq!(spec.dry_mass_kg, 350.0);
        // wet = engine 100 + tank 500 + capsule 200
        assert_eq!(spec.wet_mass_kg, 800.0);
    }

    #[test]
    fn twr_is_above_one_for_the_minimal_rocket() {
        let cfg = RocketConfig::default();
        let spec = RocketSpec::from_parts(&MIN_ROCKET, &cfg);
        // 39000 N vs 800 kg * 9.81 ~= 7848 N -> TWR ~5.
        assert!(spec.twr(cfg.flight.gravity_mps2) > 1.0);
        // An empty spec has no weight and a 0 TWR (no divide-by-zero).
        assert_eq!(RocketSpec::default().twr(9.81), 0.0);
    }

    #[test]
    fn shipped_rocket_yaml_parses_when_present() {
        let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../assets/config/rocket.yaml");
        if std::fs::read_to_string(path).is_err() {
            return; // asset tree not in this checkout layout
        }
        let c = load_rocket_config(path);
        assert!(c.engine.thrust_n > 0.0);
        assert!(c.fuel_tank.capacity > 0.0);
        assert!(c.flight.gravity_mps2 > 0.0);
    }
}
