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
}
