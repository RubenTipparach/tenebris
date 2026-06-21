//! Mining rules - Core, shared by SP and MP so tool-gating and drops are
//! authoritative and identical on both sides.
//!
//! Tier 0 of the survival loop: hand-breakable surface blocks (dirt,
//! grass, sand, wood) versus pickaxe-gated rock (stone and its tinted
//! variants, including the ore blocks). Ore blocks are scattered through
//! underground stone by worldgen (`ore_for_stone`, tuned via
//! `assets/config/mining.yaml`) and drop their raw resource when mined.

use crate::blocks::Block;
use crate::items::{self, ItemId, ItemStack};
use std::sync::Mutex;

/// Tool tier required to harvest a block (0 = bare hands). A block whose
/// required tier exceeds the player's tool yields nothing and (in
/// survival) can't be broken at all - that's what makes the pickaxe
/// matter.
pub fn required_tier(b: Block) -> u8 {
    match b {
        Block::Stone
        | Block::CragRock
        | Block::FrostIce
        | Block::AsteroidRock
        | Block::Moon
        | Block::Bedrock
        | Block::CoalOre
        | Block::CopperOre
        | Block::TinOre
        | Block::IronOre => 1,
        _ => 0,
    }
}

/// Mining tier a held tool provides. Hand = 0; the wooden pickaxe is the
/// first tier-1 tool. (Higher tiers slot in here as their tools land.)
pub fn tool_tier(tool: Option<ItemId>) -> u8 {
    match tool {
        Some(items::WOOD_PICKAXE) => 1,
        _ => 0,
    }
}

/// True if a player with `tier` can harvest `b` (its required tier is met
/// and it isn't truly unbreakable bedrock).
pub fn can_harvest(b: Block, tier: u8) -> bool {
    b != Block::Bedrock && tier >= required_tier(b)
}

/// Items dropped by breaking `b` with `tier`. Empty when the tool tier is
/// too low. Ore blocks drop their raw resource (smelted to ingots later);
/// everything else drops itself as a placeable.
pub fn drops(b: Block, tier: u8) -> Vec<ItemStack> {
    if !can_harvest(b, tier) {
        return Vec::new();
    }
    let item = match b {
        Block::CoalOre => items::COAL,
        Block::CopperOre => items::COPPER,
        Block::TinOre => items::TIN,
        Block::IronOre => items::IRON,
        _ => items::from_block(b),
    };
    vec![ItemStack { item, count: 1 }]
}

/// Worldgen hook: given a deterministic per-voxel `roll` in [0,1] for an
/// underground stone voxel, return the ore block it should become, or
/// `None` to leave it as stone. Independent probability bands per ore
/// (coal first), so the chances don't have to sum to <= 1.
pub fn ore_for_stone(roll: f32) -> Option<Block> {
    let c = config();
    let mut hi = c.coal_ore_chance;
    if roll < hi {
        return Some(Block::CoalOre);
    }
    hi += c.copper_ore_chance;
    if roll < hi {
        return Some(Block::CopperOre);
    }
    hi += c.tin_ore_chance;
    if roll < hi {
        return Some(Block::TinOre);
    }
    hi += c.iron_ore_chance;
    if roll < hi {
        return Some(Block::IronOre);
    }
    None
}

/* --------------------------- config ----------------------------------- */

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct MiningConfig {
    /// Per-voxel probability that an underground stone block is replaced
    /// by each ore during worldgen. Independent rolls, so larger numbers
    /// mean denser deposits.
    pub coal_ore_chance: f32,
    pub copper_ore_chance: f32,
    pub tin_ore_chance: f32,
    pub iron_ore_chance: f32,
}

impl MiningConfig {
    const DEFAULT: MiningConfig = MiningConfig {
        coal_ore_chance: 0.040,
        copper_ore_chance: 0.022,
        tin_ore_chance: 0.018,
        iron_ore_chance: 0.030,
    };

    /// All-zero ore chances: worldgen places no ore. Used by the save
    /// byte-compat harness to match the frozen C reference gen (which
    /// predates ore), isolating save-format parity from ore content.
    pub const ORE_FREE: MiningConfig = MiningConfig {
        coal_ore_chance: 0.0,
        copper_ore_chance: 0.0,
        tin_ore_chance: 0.0,
        iron_ore_chance: 0.0,
    };
}

static S_MINING: Mutex<MiningConfig> = Mutex::new(MiningConfig::DEFAULT);

/// Current mining tuning (compiled-in defaults until `load_config`).
pub fn config() -> MiningConfig {
    *S_MINING.lock().unwrap()
}

/// Install a config directly. Unlike `parse_config`, this bypasses the
/// "zero keeps the default" yaml merge, so callers can force exact values
/// (e.g. `MiningConfig::ORE_FREE` for the save byte-compat harness).
pub fn set_config(cfg: MiningConfig) {
    *S_MINING.lock().unwrap() = cfg;
}

/// Parse mining.yaml (tiny key/value subset). Fields left at / set to
/// their zero value keep the compiled-in default, matching the other
/// config parsers.
pub fn parse_config(src: &str, _path: &str) -> MiningConfig {
    let mut cfg = MiningConfig::DEFAULT;
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
            continue; /* zero / negative keeps the compiled-in default */
        }
        match key {
            "coal_ore_chance" => cfg.coal_ore_chance = v,
            "copper_ore_chance" => cfg.copper_ore_chance = v,
            "tin_ore_chance" => cfg.tin_ore_chance = v,
            "iron_ore_chance" => cfg.iron_ore_chance = v,
            _ => {}
        }
    }
    *S_MINING.lock().unwrap() = cfg;
    cfg
}

/// Load + install mining.yaml from disk (native / emscripten FS).
pub fn load_config(path: &str) -> MiningConfig {
    match std::fs::read_to_string(path) {
        Ok(src) => parse_config(&src, path),
        Err(_) => {
            println!("[mining] {} not found, using compiled-in defaults", path);
            MiningConfig::DEFAULT
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::items::{COAL, WOOD_PICKAXE};

    #[test]
    fn tiers_gate_rock_behind_a_pickaxe() {
        assert_eq!(required_tier(Block::Stone), 1);
        assert_eq!(required_tier(Block::Dirt), 0);
        assert_eq!(required_tier(Block::Wood), 0);
        assert_eq!(tool_tier(None), 0);
        assert_eq!(tool_tier(Some(WOOD_PICKAXE)), 1);
        assert!(!can_harvest(Block::Stone, 0)); // bare hands can't
        assert!(can_harvest(Block::Stone, 1)); // pickaxe can
        assert!(can_harvest(Block::Dirt, 0)); // hand-breakable
        assert!(!can_harvest(Block::Bedrock, 1)); // never
    }

    #[test]
    fn hand_breaks_wood_and_drops_it() {
        let d = drops(Block::Wood, 0);
        assert_eq!(d, vec![ItemStack { item: items::from_block(Block::Wood), count: 1 }]);
    }

    #[test]
    fn stone_without_pickaxe_drops_nothing() {
        assert!(drops(Block::Stone, 0).is_empty());
        assert!(drops(Block::CoalOre, 0).is_empty());
    }

    #[test]
    fn stone_with_pickaxe_drops_just_stone() {
        assert_eq!(
            drops(Block::Stone, 1),
            vec![ItemStack { item: items::from_block(Block::Stone), count: 1 }]
        );
    }

    #[test]
    fn ore_blocks_drop_their_raw_resource() {
        use crate::items::{COPPER, IRON, TIN};
        assert_eq!(drops(Block::CoalOre, 1), vec![ItemStack { item: COAL, count: 1 }]);
        assert_eq!(drops(Block::CopperOre, 1), vec![ItemStack { item: COPPER, count: 1 }]);
        assert_eq!(drops(Block::TinOre, 1), vec![ItemStack { item: TIN, count: 1 }]);
        assert_eq!(drops(Block::IronOre, 1), vec![ItemStack { item: IRON, count: 1 }]);
    }

    #[test]
    fn ore_for_stone_bands_by_roll() {
        // restore defaults (a sibling test may have changed the global)
        parse_config(
            "coal_ore_chance: 0.04\ncopper_ore_chance: 0.022\ntin_ore_chance: 0.018\niron_ore_chance: 0.03\n",
            "t",
        );
        assert_eq!(ore_for_stone(0.01), Some(Block::CoalOre)); // < 0.04
        assert_eq!(ore_for_stone(0.05), Some(Block::CopperOre)); // < 0.062
        assert_eq!(ore_for_stone(0.07), Some(Block::TinOre)); // < 0.08
        assert_eq!(ore_for_stone(0.09), Some(Block::IronOre)); // < 0.11
        assert_eq!(ore_for_stone(0.5), None); // mostly stays stone
    }

    #[test]
    fn config_parses_and_zero_keeps_default() {
        let c = parse_config("coal_ore_chance: 0.4\n", "t");
        assert_eq!(c.coal_ore_chance, 0.4);
        // zero / blank keeps the compiled-in default
        let d = parse_config("coal_ore_chance: 0\n", "t");
        assert_eq!(d.coal_ore_chance, MiningConfig::DEFAULT.coal_ore_chance);
    }
}
