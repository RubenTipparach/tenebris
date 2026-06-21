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
/* Raw ore chunks dropped by the ore blocks; smelted into ingots later. */
pub const COPPER: ItemId = ITEM_BASE + 5; // 105
pub const TIN: ItemId = ITEM_BASE + 6; // 106
pub const IRON: ItemId = ITEM_BASE + 7; // 107

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
    fn kinds_and_stacks() {
        assert_eq!(kind(from_block(Block::Stone)), ItemKind::Block);
        assert_eq!(kind(PLANK), ItemKind::Resource);
        assert_eq!(kind(WOOD_PICKAXE), ItemKind::Tool);
        assert_eq!(stack_size(WOOD_PICKAXE), 1);
        assert_eq!(stack_size(PLANK), 64);
    }
}
