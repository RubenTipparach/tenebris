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
    /// Descent speed the chute clamps to once deployed.
    pub parachute_terminal_mps: f32,
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
    command_module: CommandModuleStats {
        mass_kg: 200.0,
        parachute_alt_m: 50.0,
        max_impact_mps: 10.0,
        parachute_terminal_mps: 5.0,
    },
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
            ("command_module", "parachute_terminal_mps") => {
                c.command_module.parachute_terminal_mps = val
            }
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

/* ------------------------------------------------------------------ */
/* Flight: a runtime state machine + a simple vertical integrator.     */
/* Ports the JS RocketState (src/rocket/RocketState.ts) and the launch  */
/* -> ascend -> coast -> descend -> land arc of RocketController. This  */
/* is a 1-D (vertical) model: enough to drive the state machine, fuel   */
/* burn, and parachute landing; full 3-D pose/steering lands with the   */
/* client-side controller + camera that consume this core state.       */

/// Flight phase. Mirrors the JS RocketState machine.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum FlightState {
    /// Boarded, sitting on the pad.
    Grounded,
    /// Engine lit, still below the launch altitude.
    Launching,
    /// Above the launch altitude - ascending or coasting.
    InFlight,
    /// Descending under the parachute, below the deploy altitude.
    Landing,
    /// Back on a surface (`crashed` says whether it survived).
    Landed,
}

/// Live flight state of one rocket. Fields are public so the client
/// controller can read them for rendering / HUD and write throttle.
#[derive(Clone, Copy, Debug)]
pub struct RocketFlight {
    pub state: FlightState,
    /// Metres above the launch surface.
    pub altitude_m: f32,
    /// Vertical velocity, up positive.
    pub vel_mps: f32,
    /// Remaining fuel units.
    pub fuel: f32,
    /// Throttle 0..1.
    pub throttle: f32,
    /// Set on a hard (over `max_impact_mps`) landing.
    pub crashed: bool,
    pub spec: RocketSpec,
}

impl RocketFlight {
    /// A freshly-boarded rocket on the pad with full tanks.
    pub fn new(spec: RocketSpec) -> RocketFlight {
        RocketFlight {
            state: FlightState::Grounded,
            altitude_m: 0.0,
            vel_mps: 0.0,
            fuel: spec.fuel_capacity,
            throttle: 0.0,
            crashed: false,
            spec,
        }
    }

    pub fn set_throttle(&mut self, t: f32) {
        self.throttle = t.clamp(0.0, 1.0);
    }

    /// Current mass: dry mass + the mass of the remaining fuel.
    pub fn mass_kg(&self) -> f32 {
        let full_fuel_mass = self.spec.wet_mass_kg - self.spec.dry_mass_kg;
        let per_unit = if self.spec.fuel_capacity > 0.0 {
            full_fuel_mass / self.spec.fuel_capacity
        } else {
            0.0
        };
        self.spec.dry_mass_kg + self.fuel * per_unit
    }

    /// Advance one physics + state-machine step of `dt` seconds.
    pub fn step(&mut self, dt: f32, cfg: &RocketConfig) {
        if self.state == FlightState::Landed || dt <= 0.0 {
            return;
        }
        let g = cfg.flight.gravity_mps2;

        // Throttle ignites the engine: grounded -> launching.
        if self.state == FlightState::Grounded && self.throttle > 0.0 && self.fuel > 0.0 {
            self.state = FlightState::Launching;
        }

        // Thrust only while there's fuel to burn.
        let burning = self.throttle > 0.0 && self.fuel > 0.0;
        let thrust_n = if burning { self.spec.total_thrust_n * self.throttle } else { 0.0 };
        if burning {
            self.fuel = (self.fuel - self.spec.fuel_per_sec * self.throttle * dt).max(0.0);
        }

        let mass = self.mass_kg().max(1.0);
        let accel = thrust_n / mass - g; // thrust up, gravity down
        self.vel_mps += accel * dt;

        // Parachute: once descending below the deploy altitude the chute
        // clamps descent to a survivable terminal speed. (Aerodynamic
        // drag is a later refinement; cfg.flight.drag_coef is reserved
        // for it.)
        let parachute =
            self.vel_mps < 0.0 && self.altitude_m <= cfg.command_module.parachute_alt_m;
        if parachute && self.vel_mps < -cfg.command_module.parachute_terminal_mps {
            self.vel_mps = -cfg.command_module.parachute_terminal_mps;
        }

        self.altitude_m += self.vel_mps * dt;

        // Ground contact.
        if self.altitude_m <= 0.0 {
            self.altitude_m = 0.0;
            if matches!(self.state, FlightState::InFlight | FlightState::Landing) {
                self.crashed = self.vel_mps.abs() > cfg.command_module.max_impact_mps;
                self.state = FlightState::Landed;
            }
            if self.vel_mps < 0.0 {
                self.vel_mps = 0.0;
            }
            return;
        }

        // Altitude-driven transitions.
        match self.state {
            FlightState::Launching if self.altitude_m > cfg.flight.launch_alt_m => {
                self.state = FlightState::InFlight;
            }
            FlightState::InFlight if parachute => {
                self.state = FlightState::Landing;
            }
            _ => {}
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

    fn min_flight() -> RocketFlight {
        let cfg = RocketConfig::default();
        RocketFlight::new(RocketSpec::from_parts(&MIN_ROCKET, &cfg))
    }

    #[test]
    fn new_flight_is_grounded_with_full_fuel() {
        let f = min_flight();
        assert_eq!(f.state, FlightState::Grounded);
        assert_eq!(f.fuel, 100.0);
        assert_eq!(f.altitude_m, 0.0);
    }

    #[test]
    fn full_throttle_launches_and_reaches_flight() {
        let cfg = RocketConfig::default();
        let mut f = min_flight();
        f.set_throttle(1.0);
        // First step ignites -> Launching.
        f.step(0.1, &cfg);
        assert_eq!(f.state, FlightState::Launching);
        // A few seconds of burn climbs past the launch altitude.
        for _ in 0..40 {
            f.step(0.1, &cfg);
        }
        assert_eq!(f.state, FlightState::InFlight);
        assert!(f.altitude_m > cfg.flight.launch_alt_m);
        assert!(f.fuel < 100.0, "fuel was burned");
    }

    #[test]
    fn burns_out_then_parachutes_to_a_safe_landing() {
        let cfg = RocketConfig::default();
        let mut f = min_flight();
        f.set_throttle(1.0);
        // Whole flight: burn, coast, fall, chute, land. Loop is capped so
        // a logic bug can't spin forever.
        let mut steps = 0;
        while f.state != FlightState::Landed && steps < 100_000 {
            f.step(0.05, &cfg);
            steps += 1;
        }
        assert_eq!(f.state, FlightState::Landed);
        assert_eq!(f.altitude_m, 0.0);
        assert!(!f.crashed, "the chute should bring it down survivably");
        assert_eq!(f.fuel, 0.0, "all fuel burned over the flight");
    }

    #[test]
    fn a_hard_impact_crashes() {
        // A config where the chute can't slow the descent below the
        // survivable impact speed -> a hard landing crashes.
        let mut cfg = RocketConfig::default();
        cfg.command_module.parachute_terminal_mps = 100.0;
        cfg.command_module.max_impact_mps = 10.0;
        let mut f = min_flight();
        // Already aloft, low and falling fast, engine off.
        f.state = FlightState::InFlight;
        f.altitude_m = 5.0;
        f.vel_mps = -40.0;
        f.set_throttle(0.0);
        for _ in 0..20 {
            f.step(0.05, &cfg);
            if f.state == FlightState::Landed {
                break;
            }
        }
        assert_eq!(f.state, FlightState::Landed);
        assert!(f.crashed, "a 40 m/s impact exceeds the 10 m/s limit");
    }
}
