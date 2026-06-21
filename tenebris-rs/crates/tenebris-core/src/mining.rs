//! Mining rules - Core, shared by SP and MP so tool-gating and drops are
//! authoritative and identical on both sides.
//!
//! Tier 0 of the survival loop: hand-breakable surface blocks (dirt,
//! grass, sand, wood) versus pickaxe-gated rock (stone and its tinted
//! variants). Mining stone with a pickaxe has a tunable chance to also
//! yield coal - "ore embedded in stone", so the torch recipe is reachable
//! before any dedicated ore-vein blocks exist (those land with their own
//! art + worldgen later). The drop chance is a designer knob, so it lives
//! in `assets/config/mining.yaml`, not inline.

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
        | Block::Bedrock => 1,
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

/// Items dropped by breaking `b` with `tier`, given a deterministic
/// per-voxel `roll` in [0,1] (use `rng::hash3(tile, depth, salt)` so a
/// given block always drops the same thing). Empty when the tool tier is
/// too low. Blocks drop themselves; stone has a `coal_chance` of also
/// dropping a lump of coal.
pub fn drops(b: Block, tier: u8, roll: f32) -> Vec<ItemStack> {
    if !can_harvest(b, tier) {
        return Vec::new();
    }
    let mut out = vec![ItemStack { item: items::from_block(b), count: 1 }];
    if b == Block::Stone && roll < config().coal_chance {
        out.push(ItemStack { item: items::COAL, count: 1 });
    }
    out
}

/* --------------------------- config ----------------------------------- */

#[derive(Clone, Copy, Debug, PartialEq)]
pub struct MiningConfig {
    /// P(a stone block mined with a pickaxe also drops a coal lump).
    pub coal_chance: f32,
}

impl MiningConfig {
    const DEFAULT: MiningConfig = MiningConfig { coal_chance: 0.15 };
}

static S_MINING: Mutex<MiningConfig> = Mutex::new(MiningConfig::DEFAULT);

/// Current mining tuning (compiled-in defaults until `load_config`).
pub fn config() -> MiningConfig {
    *S_MINING.lock().unwrap()
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
        if key == "coal_chance" {
            if let Ok(v) = val.parse::<f32>() {
                if v > 0.0 {
                    cfg.coal_chance = v;
                }
            }
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
        let d = drops(Block::Wood, 0, 0.99);
        assert_eq!(d, vec![ItemStack { item: items::from_block(Block::Wood), count: 1 }]);
    }

    #[test]
    fn stone_without_pickaxe_drops_nothing() {
        assert!(drops(Block::Stone, 0, 0.0).is_empty());
    }

    #[test]
    fn stone_with_pickaxe_drops_stone_and_maybe_coal() {
        // default coal_chance 0.15
        parse_config("", "t"); // reset to default
        let lucky = drops(Block::Stone, 1, 0.05);
        assert_eq!(lucky.len(), 2);
        assert_eq!(lucky[0].item, items::from_block(Block::Stone));
        assert_eq!(lucky[1].item, COAL);
        let plain = drops(Block::Stone, 1, 0.9);
        assert_eq!(plain, vec![ItemStack { item: items::from_block(Block::Stone), count: 1 }]);
    }

    #[test]
    fn config_parses_and_zero_keeps_default() {
        let c = parse_config("coal_chance: 0.4\n", "t");
        assert_eq!(c.coal_chance, 0.4);
        // zero / blank keeps the previous (default) - restore for other tests
        let d = parse_config("coal_chance: 0\n", "t");
        assert_eq!(d.coal_chance, MiningConfig::DEFAULT.coal_chance);
    }
}
