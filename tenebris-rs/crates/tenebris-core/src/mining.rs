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

/// Mining tier a held tool provides. Hand = 0; the pickaxes are the
/// tier-1+ tools that unlock rock. Stone / iron are higher tiers so they
/// stay valid for any future tier-gated block, but all three already mine
/// today's rock (required_tier 1) - the difference is speed, not access.
pub fn tool_tier(tool: Option<ItemId>) -> u8 {
    match tool {
        Some(items::WOOD_PICKAXE) => 1,
        Some(items::STONE_PICKAXE) => 2,
        Some(items::IRON_PICKAXE) => 3,
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
        items::WOOD_PICKAXE | items::STONE_PICKAXE | items::IRON_PICKAXE => ToolKind::Pick,
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
        Block::Dirt
        | Block::Grass
        | Block::JungleGrass
        | Block::DryGrass
        | Block::Sand
        | Block::Snow
        | Block::Farmland => ToolKind::Shovel,
        _ => ToolKind::None,
    }
}

/// The best (fastest) tool of `block`'s ideal category the player holds,
/// or `None` for bare hands / no matching tool. `has` reports whether a
/// given item id is in the player's bag. Pickaxes prefer iron > stone >
/// wood so a full toolkit always mines at its best speed; axe / shovel /
/// hoe have a single tier today.
pub fn best_tool(block: Block, has: impl Fn(ItemId) -> bool) -> Option<ItemId> {
    match block_tool(block) {
        ToolKind::Pick => [items::IRON_PICKAXE, items::STONE_PICKAXE, items::WOOD_PICKAXE]
            .into_iter()
            .find(|&id| has(id)),
        ToolKind::Axe => has(items::WOOD_AXE).then_some(items::WOOD_AXE),
        ToolKind::Shovel => has(items::WOOD_SHOVEL).then_some(items::WOOD_SHOVEL),
        ToolKind::None => None,
    }
}

/// Per-tool speed multiplier applied to the base break time when the
/// correct tool category is held. Wood-tier tools (and axe / shovel) mine
/// at the base rate (1.0); the higher pickaxe tiers are faster.
fn material_mult(cfg: &MiningConfig, tool: ItemId) -> f32 {
    match tool {
        items::STONE_PICKAXE => cfg.stone_tool_mult,
        items::IRON_PICKAXE => cfg.iron_tool_mult,
        _ => 1.0,
    }
}

/// Seconds to break `b` while holding tool `held` (the specific item, so
/// pickaxe tiers get their own speed). The base times are the *ideal-tool*
/// times (shovel on soft ground, wood pickaxe on rock); a better pickaxe
/// scales that down, and bare-handed / wrong-tool breaking of a
/// tool-wanting block is slow (`hand_penalty_mult`). Blocks with no ideal
/// tool break at plain base speed.
pub fn break_time(cfg: &MiningConfig, b: Block, held: Option<ItemId>) -> f32 {
    let ideal = block_tool(b);
    let base = match ideal {
        ToolKind::Pick => cfg.rock_break_s,
        ToolKind::Axe => cfg.wood_break_s,
        ToolKind::Shovel => cfg.soft_break_s,
        ToolKind::None => cfg.soft_break_s,
    };
    if ideal == ToolKind::None {
        return base;
    }
    match held {
        Some(tool) if tool_kind(tool) == ideal => base * material_mult(cfg, tool),
        _ => base * cfg.hand_penalty_mult,
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
        /* Tilled soil digs back into plain dirt, not a "farmland" item. */
        Block::Farmland => items::from_block(Block::Dirt),
        /* Biome sods yield the ordinary grass block - one grass item in
         * the bag regardless of which biome it was cut from (same
         * one-way collapse the Farmland -> Dirt drop uses). */
        Block::JungleGrass | Block::DryGrass => items::from_block(Block::Grass),
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
    /// Ideal-tool break time (seconds) for soft ground
    /// (dirt/sand/grass/snow/farmland) - i.e. with a shovel.
    pub soft_break_s: f32,
    /// Ideal-tool (axe) break time for wood.
    pub wood_break_s: f32,
    /// Base (wood-pickaxe) break time for rock + ore.
    pub rock_break_s: f32,
    /// Multiplier when a tool-wanting block is broken by hand / wrong tool
    /// (> 1 = slower). Makes bare-handed survival mining deliberately hard.
    pub hand_penalty_mult: f32,
    /// Rock break-time multiplier for the stone pickaxe (< 1 = faster).
    pub stone_tool_mult: f32,
    /// Rock break-time multiplier for the iron pickaxe (< 1 = faster).
    pub iron_tool_mult: f32,
    /// Blend strength of the crack-stage texture painted over a block
    /// being mined (0..1; the hex shader's crack channel).
    pub crack_alpha: f32,
    /// Chance (0..1) that mining a rock/stone block also drops a piece of
    /// flint - the tier-1 tool material. Deterministic per cell, so it
    /// doesn't depend on frame timing.
    pub flint_from_stone_chance: f32,
}

impl MiningConfig {
    const DEFAULT: MiningConfig = MiningConfig {
        coal_ore_chance: 0.040,
        copper_ore_chance: 0.022,
        tin_ore_chance: 0.018,
        iron_ore_chance: 0.030,
        /* Soft ground: 2.5 s with a shovel, 5.0 s bare-handed (x2). */
        soft_break_s: 2.50,
        /* Wood: 1.5 s with an axe, 3.0 s by hand. */
        wood_break_s: 1.50,
        /* Rock: 10 s with a wood pickaxe; 7 s stone (x0.7); 4 s iron
         * (x0.4). Bare hands can't mine rock (tier-gated). */
        rock_break_s: 10.0,
        hand_penalty_mult: 2.0,
        stone_tool_mult: 0.70,
        iron_tool_mult: 0.40,
        crack_alpha: 0.90,
        /* ~1 in 4 mined rocks yields a flint chip. */
        flint_from_stone_chance: 0.25,
    };

    /// All-zero ore chances: worldgen places no ore. Used by the save
    /// byte-compat harness to match the frozen C reference gen (which
    /// predates ore), isolating save-format parity from ore content.
    pub const ORE_FREE: MiningConfig = MiningConfig {
        coal_ore_chance: 0.0,
        copper_ore_chance: 0.0,
        tin_ore_chance: 0.0,
        iron_ore_chance: 0.0,
        soft_break_s: 2.50,
        wood_break_s: 1.50,
        rock_break_s: 10.0,
        hand_penalty_mult: 2.0,
        stone_tool_mult: 0.70,
        iron_tool_mult: 0.40,
        crack_alpha: 0.90,
        flint_from_stone_chance: 0.25,
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
            "hand_penalty_mult" => cfg.hand_penalty_mult = v,
            "stone_tool_mult" => cfg.stone_tool_mult = v,
            "iron_tool_mult" => cfg.iron_tool_mult = v,
            "crack_alpha" => cfg.crack_alpha = v,
            "flint_from_stone_chance" => cfg.flint_from_stone_chance = v,
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
    fn break_time_targets_the_tuned_times() {
        use crate::items::{IRON_PICKAXE, STONE_PICKAXE};
        let cfg = MiningConfig::DEFAULT;
        // Soft ground: 5 s by hand, 2.5 s with a shovel.
        assert!((break_time(&cfg, Block::Dirt, None) - 5.0).abs() < 1e-4);
        assert!((break_time(&cfg, Block::Sand, Some(WOOD_SHOVEL)) - 2.5).abs() < 1e-4);
        // Rock: 10 s wood pickaxe, 7 s stone, 4 s iron.
        assert!((break_time(&cfg, Block::Stone, Some(WOOD_PICKAXE)) - 10.0).abs() < 1e-4);
        assert!((break_time(&cfg, Block::Stone, Some(STONE_PICKAXE)) - 7.0).abs() < 1e-4);
        assert!((break_time(&cfg, Block::Stone, Some(IRON_PICKAXE)) - 4.0).abs() < 1e-4);
        // Wrong tool (a shovel on rock) is no better than bare hands.
        assert_eq!(
            break_time(&cfg, Block::Stone, Some(WOOD_SHOVEL)),
            break_time(&cfg, Block::Stone, None)
        );
        // Wood wants the axe; a block with no ideal tool breaks at base.
        assert!(
            break_time(&cfg, Block::Wood, Some(WOOD_AXE))
                < break_time(&cfg, Block::Wood, None)
        );
        assert!((break_time(&cfg, Block::Torch, None) - cfg.soft_break_s).abs() < 1e-6);
    }

    #[test]
    fn best_tool_picks_the_fastest_pickaxe_held() {
        use crate::items::{IRON_PICKAXE, STONE_PICKAXE};
        fn have(set: &'static [ItemId]) -> impl Fn(ItemId) -> bool {
            move |id| set.contains(&id)
        }
        // Only wood -> wood; add stone -> stone; add iron -> iron.
        assert_eq!(best_tool(Block::Stone, have(&[WOOD_PICKAXE])), Some(WOOD_PICKAXE));
        assert_eq!(
            best_tool(Block::Stone, have(&[WOOD_PICKAXE, STONE_PICKAXE])),
            Some(STONE_PICKAXE)
        );
        assert_eq!(
            best_tool(Block::Stone, have(&[WOOD_PICKAXE, STONE_PICKAXE, IRON_PICKAXE])),
            Some(IRON_PICKAXE)
        );
        // Soft ground wants the shovel; a pickaxe doesn't count.
        assert_eq!(best_tool(Block::Dirt, have(&[WOOD_PICKAXE])), None);
        assert_eq!(best_tool(Block::Dirt, have(&[WOOD_SHOVEL])), Some(WOOD_SHOVEL));
    }

    #[test]
    fn tiers_gate_rock_behind_a_pickaxe() {
        use crate::items::{IRON_PICKAXE, STONE_PICKAXE};
        assert_eq!(required_tier(Block::Stone), 1);
        assert_eq!(required_tier(Block::Dirt), 0);
        assert_eq!(required_tier(Block::Wood), 0);
        assert_eq!(tool_tier(None), 0);
        assert_eq!(tool_tier(Some(WOOD_PICKAXE)), 1);
        assert_eq!(tool_tier(Some(STONE_PICKAXE)), 2);
        assert_eq!(tool_tier(Some(IRON_PICKAXE)), 3);
        assert!(!can_harvest(Block::Stone, 0)); // bare hands can't
        assert!(can_harvest(Block::Stone, 1)); // any pickaxe can
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
