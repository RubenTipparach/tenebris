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

/// The kind of tool a block wants (its ideal category). `None` = no tool
/// applies (a misc block that breaks at plain speed by hand).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ToolKind {
    None,
    Pick,
    Axe,
    Shovel,
}

/// Which tool category a held item is (or `None`).
pub fn tool_kind(item: ItemId) -> ToolKind {
    match item {
        items::WOOD_PICKAXE => ToolKind::Pick,
        items::WOOD_AXE => ToolKind::Axe,
        items::WOOD_SHOVEL => ToolKind::Shovel,
        _ => ToolKind::None,
    }
}

/// The tool a block is best mined with: pickaxe for rock/ore, axe for
/// wood, shovel for soft ground. Everything else has no ideal tool.
pub fn block_tool(b: Block) -> ToolKind {
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
        | Block::IronOre => ToolKind::Pick,
        Block::Wood => ToolKind::Axe,
        Block::Dirt | Block::Grass | Block::Sand | Block::Snow => ToolKind::Shovel,
        _ => ToolKind::None,
    }
}

/// Seconds to break `b` while holding tool category `held`. Bare-handed (or
/// wrong-tool) breaking of a block that HAS an ideal tool is slow - that's
/// what makes crafting the pickaxe / axe / shovel matter; the right tool
/// speeds it up sharply. Blocks with no ideal tool break at plain speed.
pub fn break_time(cfg: &MiningConfig, b: Block, held: ToolKind) -> f32 {
    let ideal = block_tool(b);
    let base = match ideal {
        ToolKind::Pick => cfg.rock_break_s,
        ToolKind::Axe => cfg.wood_break_s,
        ToolKind::Shovel => cfg.soft_break_s,
        ToolKind::None => cfg.soft_break_s,
    };
    if ideal == ToolKind::None {
        base
    } else if held == ideal {
        base * cfg.tool_speed_mult
    } else {
        base * cfg.hand_penalty_mult
    }
}

/// Items dropped by breaking `b` with `tier`. Empty when the tool tier is
/// too low. Ore blocks drop their raw resource (smelted to ingots via the
/// coal-fuelled recipes in recipes.yaml); everything else drops itself as
/// a placeable.
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
    /// Base break time (seconds) for soft ground (dirt/sand/grass/snow).
    pub soft_break_s: f32,
    /// Base break time for wood.
    pub wood_break_s: f32,
    /// Base break time for rock + ore.
    pub rock_break_s: f32,
    /// Multiplier applied when the correct tool is held (< 1 = faster).
    pub tool_speed_mult: f32,
    /// Multiplier when a tool-wanting block is broken by hand / wrong tool
    /// (> 1 = slower). Makes bare-handed survival mining deliberately hard.
    pub hand_penalty_mult: f32,
}

impl MiningConfig {
    const DEFAULT: MiningConfig = MiningConfig {
        coal_ore_chance: 0.040,
        copper_ore_chance: 0.022,
        tin_ore_chance: 0.018,
        iron_ore_chance: 0.030,
        soft_break_s: 0.70,
        wood_break_s: 0.90,
        rock_break_s: 1.60,
        tool_speed_mult: 0.35,
        hand_penalty_mult: 2.50,
    };

    /// All-zero ore chances: worldgen places no ore. Used by the save
    /// byte-compat harness to match the frozen C reference gen (which
    /// predates ore), isolating save-format parity from ore content.
    pub const ORE_FREE: MiningConfig = MiningConfig {
        coal_ore_chance: 0.0,
        copper_ore_chance: 0.0,
        tin_ore_chance: 0.0,
        iron_ore_chance: 0.0,
        soft_break_s: 0.70,
        wood_break_s: 0.90,
        rock_break_s: 1.60,
        tool_speed_mult: 0.35,
        hand_penalty_mult: 2.50,
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
            "soft_break_s" => cfg.soft_break_s = v,
            "wood_break_s" => cfg.wood_break_s = v,
            "rock_break_s" => cfg.rock_break_s = v,
            "tool_speed_mult" => cfg.tool_speed_mult = v,
            "hand_penalty_mult" => cfg.hand_penalty_mult = v,
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
    use crate::items::{COAL, WOOD_AXE, WOOD_PICKAXE, WOOD_SHOVEL};

    #[test]
    fn tool_kinds_and_block_tools_match() {
        assert_eq!(tool_kind(WOOD_PICKAXE), ToolKind::Pick);
        assert_eq!(tool_kind(WOOD_AXE), ToolKind::Axe);
        assert_eq!(tool_kind(WOOD_SHOVEL), ToolKind::Shovel);
        assert_eq!(tool_kind(COAL), ToolKind::None);
        assert_eq!(block_tool(Block::Stone), ToolKind::Pick);
        assert_eq!(block_tool(Block::CoalOre), ToolKind::Pick);
        assert_eq!(block_tool(Block::Wood), ToolKind::Axe);
        assert_eq!(block_tool(Block::Dirt), ToolKind::Shovel);
        assert_eq!(block_tool(Block::Sand), ToolKind::Shovel);
    }

    #[test]
    fn break_time_rewards_the_right_tool() {
        let cfg = MiningConfig::DEFAULT;
        let hand = break_time(&cfg, Block::Dirt, ToolKind::None);
        let shovel = break_time(&cfg, Block::Dirt, ToolKind::Shovel);
        // Right tool is much faster than bare hands.
        assert!(shovel < hand, "{shovel} !< {hand}");
        assert!((shovel - cfg.soft_break_s * cfg.tool_speed_mult).abs() < 1e-6);
        assert!((hand - cfg.soft_break_s * cfg.hand_penalty_mult).abs() < 1e-6);
        // Wrong tool is no better than hands.
        assert_eq!(break_time(&cfg, Block::Dirt, ToolKind::Pick), hand);
        // Wood wants the axe.
        assert!(
            break_time(&cfg, Block::Wood, ToolKind::Axe)
                < break_time(&cfg, Block::Wood, ToolKind::None)
        );
        // A block with no ideal tool breaks at plain base speed.
        assert!((break_time(&cfg, Block::Torch, ToolKind::None) - cfg.soft_break_s).abs() < 1e-6);
    }

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
