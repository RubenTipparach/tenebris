//! Core item registry: the unified id space for everything that can sit
//! in an inventory slot - the foundation the crafting system and the
//! full tech tree build on.
//!
//! Placeable blocks keep their raw block byte (`0..BLOCK_COUNT`), so an
//! `ItemId` round-trips to a `Block` for the placeable subset with no
//! translation table; non-block items (resources, tools, later
//! components / ingots / rocket parts) get ids from `ITEM_BASE` up.
//!
//! Item *definitions* live here as a small code table. Recipes - the
//! designer-tuned knob - live in `assets/config/recipes.yaml` per the
//! repo's "tunables in YAML" rule. As the tech tree grows this table
//! can migrate to an `items.yaml` the same way without touching callers.

use crate::blocks::{Block, BLOCK_COUNT};

/// Inventory item identity. Superset of the block palette.
pub type ItemId = u16;

/// First id past the block palette; non-block items live here up. Stable
/// wire / save values - append only, never renumber (saved bags and the
/// MP inventory sync key off these).
pub const ITEM_BASE: u16 = 100;

pub const PLANK: ItemId = ITEM_BASE; // 100
pub const STICK: ItemId = ITEM_BASE + 1; // 101
pub const COAL: ItemId = ITEM_BASE + 2; // 102
pub const WOOD_PICKAXE: ItemId = ITEM_BASE + 3; // 103
pub const WOOD_AXE: ItemId = ITEM_BASE + 4; // 104
/* Raw ore chunks dropped by the ore blocks; smelted into ingots. */
pub const COPPER: ItemId = ITEM_BASE + 5; // 105
pub const TIN: ItemId = ITEM_BASE + 6; // 106
pub const IRON: ItemId = ITEM_BASE + 7; // 107
/* Refined metal bars, the output of coal-fuelled smelting. Bronze is the
 * copper + tin alloy - the reason tin isn't a dead-end resource. */
pub const COPPER_INGOT: ItemId = ITEM_BASE + 8; // 108
pub const TIN_INGOT: ItemId = ITEM_BASE + 9; // 109
pub const IRON_INGOT: ItemId = ITEM_BASE + 10; // 110
pub const BRONZE_INGOT: ItemId = ITEM_BASE + 11; // 111
/* Tier 2 - rocket parts. The three parts a rocket needs (engine, fuel
 * tank, command module). Crafted from refined metal; a 3D-printer
 * station will gate these in a later tier (see the JS Printer3D), but
 * for now they hand-craft from ingots so the gather -> smelt -> build
 * chain is playable end to end. */
pub const ROCKET_ENGINE: ItemId = ITEM_BASE + 12; // 112
pub const FUEL_TANK: ItemId = ITEM_BASE + 13; // 113
pub const COMMAND_MODULE: ItemId = ITEM_BASE + 14; // 114
/* Electronics: the control gear the command module needs. A simplified
 * nod to the JS command-module recipe (RAM / CPU / motherboard / power
 * supply), one component chain for now. */
pub const WIRE: ItemId = ITEM_BASE + 15; // 115
pub const CIRCUIT_BOARD: ItemId = ITEM_BASE + 16; // 116

/// What an item *is*, for stacking / placement / tool-gating rules. Grows
/// as the tech tree lands (Component, Ingot, Ammo, ...).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ItemKind {
    /// Placeable terrain block (id is the block byte).
    Block,
    /// Raw / intermediate material (log, plank, ore, ingot).
    Resource,
    /// Held tool with a use action (pickaxe, axe); stacks to 1.
    Tool,
}

#[derive(Clone, Copy, Debug)]
pub struct ItemDef {
    pub id: ItemId,
    pub name: &'static str,
    pub kind: ItemKind,
    pub stack: u16,
}

/// One inventory cell's worth of an item. `count == 0` means empty
/// regardless of `item`, matching the client's `Block::Air`/0 convention.
#[derive(Clone, Copy, Debug, PartialEq, Eq, Default)]
pub struct ItemStack {
    pub item: ItemId,
    pub count: u16,
}

/// Item id for a placeable block (identity: the block's raw byte).
pub fn from_block(b: Block) -> ItemId {
    b.raw() as ItemId
}

/// Block for a placeable item id, or `None` for a non-block item.
pub fn to_block(id: ItemId) -> Option<Block> {
    if id < BLOCK_COUNT as u16 {
        Block::from_raw(id as u8)
    } else {
        None
    }
}

/// True if this id denotes a placeable block.
pub fn is_block(id: ItemId) -> bool {
    id < BLOCK_COUNT as u16
}

/// Non-block item table (Tier 0). Blocks are described on the fly via
/// `def`, so they aren't duplicated here.
const ITEMS: &[ItemDef] = &[
    ItemDef { id: PLANK, name: "plank", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: STICK, name: "stick", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: COAL, name: "coal", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: WOOD_PICKAXE, name: "wood-pickaxe", kind: ItemKind::Tool, stack: 1 },
    ItemDef { id: WOOD_AXE, name: "wood-axe", kind: ItemKind::Tool, stack: 1 },
    ItemDef { id: COPPER, name: "copper", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: TIN, name: "tin", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: IRON, name: "iron", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: COPPER_INGOT, name: "copper-ingot", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: TIN_INGOT, name: "tin-ingot", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: IRON_INGOT, name: "iron-ingot", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: BRONZE_INGOT, name: "bronze-ingot", kind: ItemKind::Resource, stack: 64 },
    /* Rocket parts: placed on the launch pad to assemble a rocket, so
     * they stack small. Kept as Resource for now; a Component kind lands
     * with the launch-pad assembly that needs to tell part types apart. */
    ItemDef { id: ROCKET_ENGINE, name: "rocket-engine", kind: ItemKind::Resource, stack: 8 },
    ItemDef { id: FUEL_TANK, name: "fuel-tank", kind: ItemKind::Resource, stack: 8 },
    ItemDef { id: COMMAND_MODULE, name: "command-module", kind: ItemKind::Resource, stack: 8 },
    ItemDef { id: WIRE, name: "wire", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: CIRCUIT_BOARD, name: "circuit-board", kind: ItemKind::Resource, stack: 64 },
];

/// Names accepted in recipes.yaml for the blocks the recipes reference.
/// "log" is the gameplay name for a Wood block in the bag.
fn block_id_by_name(name: &str) -> Option<ItemId> {
    let b = match name {
        "log" | "wood" => Block::Wood,
        "torch" => Block::Torch,
        "stone" => Block::Stone,
        "dirt" => Block::Dirt,
        "sand" => Block::Sand,
        "grass" => Block::Grass,
        "leaves" => Block::Leaves,
        "launch-pad" => Block::LaunchPad,
        "furnace" => Block::Furnace,
        _ => return None,
    };
    Some(from_block(b))
}

fn block_name(b: Block) -> &'static str {
    match b {
        Block::Wood => "log",
        Block::Torch => "torch",
        Block::Stone => "stone",
        Block::Dirt => "dirt",
        Block::Sand => "sand",
        Block::Grass => "grass",
        Block::Leaves => "leaves",
        Block::LaunchPad => "launch-pad",
        Block::Furnace => "furnace",
        _ => "block",
    }
}

/// Definition for any item id (block or non-block).
pub fn def(id: ItemId) -> Option<ItemDef> {
    if let Some(b) = to_block(id) {
        return Some(ItemDef { id, name: block_name(b), kind: ItemKind::Block, stack: 64 });
    }
    ITEMS.iter().copied().find(|d| d.id == id)
}

/// Resolve a recipe / config name to its item id.
pub fn id_by_name(name: &str) -> Option<ItemId> {
    if let Some(id) = block_id_by_name(name) {
        return Some(id);
    }
    ITEMS.iter().find(|d| d.name == name).map(|d| d.id)
}

/// Max stack for an item (1 for tools, 64 default).
pub fn stack_size(id: ItemId) -> u16 {
    def(id).map(|d| d.stack).unwrap_or(64)
}

/// Item classification (defaults to Resource for unknown ids).
pub fn kind(id: ItemId) -> ItemKind {
    def(id).map(|d| d.kind).unwrap_or(ItemKind::Resource)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn blocks_are_a_clean_subset_of_the_item_space() {
        // Every block id round-trips through the item space.
        for raw in 0..BLOCK_COUNT {
            let b = Block::from_raw(raw).unwrap();
            let id = from_block(b);
            assert!(is_block(id));
            assert_eq!(to_block(id), Some(b));
        }
        // Non-block items are past the palette and don't collide.
        assert!(!is_block(PLANK));
        assert!(to_block(PLANK).is_none());
        assert!(ITEM_BASE >= BLOCK_COUNT as u16);
    }

    #[test]
    fn name_resolution_covers_blocks_and_items() {
        assert_eq!(id_by_name("log"), Some(from_block(Block::Wood)));
        assert_eq!(id_by_name("plank"), Some(PLANK));
        assert_eq!(id_by_name("stick"), Some(STICK));
        assert_eq!(id_by_name("wood-pickaxe"), Some(WOOD_PICKAXE));
        assert_eq!(id_by_name("nonsense"), None);
    }

    #[test]
    fn smelted_ingots_round_trip_names_and_kinds() {
        for (name, id) in [
            ("copper-ingot", COPPER_INGOT),
            ("tin-ingot", TIN_INGOT),
            ("iron-ingot", IRON_INGOT),
            ("bronze-ingot", BRONZE_INGOT),
        ] {
            assert_eq!(id_by_name(name), Some(id), "name {name} resolves");
            assert_eq!(kind(id), ItemKind::Resource, "{name} is a Resource");
            assert_eq!(stack_size(id), 64, "{name} stacks to 64");
            // Ingots live past the block palette and never collide with one.
            assert!(!is_block(id));
        }
    }

    #[test]
    fn electronics_resolve_names() {
        assert_eq!(id_by_name("wire"), Some(WIRE));
        assert_eq!(id_by_name("circuit-board"), Some(CIRCUIT_BOARD));
        assert!(!is_block(WIRE));
        assert!(!is_block(CIRCUIT_BOARD));
    }

    #[test]
    fn rocket_parts_resolve_names_and_stack_small() {
        for (name, id) in [
            ("rocket-engine", ROCKET_ENGINE),
            ("fuel-tank", FUEL_TANK),
            ("command-module", COMMAND_MODULE),
        ] {
            assert_eq!(id_by_name(name), Some(id), "name {name} resolves");
            assert!(!is_block(id), "{name} is not a block");
            assert_eq!(stack_size(id), 8, "{name} stacks to 8");
        }
    }

    #[test]
    fn kinds_and_stacks() {
        assert_eq!(kind(from_block(Block::Stone)), ItemKind::Block);
        assert_eq!(kind(PLANK), ItemKind::Resource);
        assert_eq!(kind(WOOD_PICKAXE), ItemKind::Tool);
        assert_eq!(stack_size(WOOD_PICKAXE), 1);
        assert_eq!(stack_size(PLANK), 64);
    }
}
