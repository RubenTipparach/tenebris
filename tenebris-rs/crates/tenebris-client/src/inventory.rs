//! Port of `tenebris-c/src/client/inventory.{c,h}`.
//!
//! Renames (per PORTING.md rule 4 - module prefix dropped):
//! - `inventory_init_creative()` -> `inventory::init_creative()`
//! - `inventory_init_empty()`    -> `inventory::init_empty()`
//! - `inventory_add()`           -> `inventory::add()`
//! - `inventory_can_place()`     -> `inventory::can_place()`
//! - `inventory_selected()`      -> `inventory::selected()`
//! - `inventory_consume()`       -> `inventory::consume()`
//! - `inventory_select()`        -> `inventory::select()`
//!
//! Struct field rename: `inv_slot_t.type` -> `InvSlot::block_type`
//! (`type` is a Rust keyword). The C functions take `inventory_t*` and
//! NULL-check where the C did; Rust references make the NULL checks
//! structurally impossible, so they are dropped.
//!
//! # Deliberate departure from the C: count-less creative
//!
//! The C stocked creative slots at a 9999 "essentially infinite"
//! sentinel and let `consume` decrement through it. The Rust redesign
//! makes creative a count-less palette instead: a creative slot just
//! names the block assigned to that hotbar key (count 1 = assigned),
//! placement never consumes, and no count badge renders. Survival is
//! the only mode with real counts - `consume` is survival-only and the
//! callers (interact.rs) gate it on `p.survival_mode`.
//!
//! The old main-grid / craft-grid fields and the client-local item enum
//! are gone too: survival items live in the `bag` (core item ids), and
//! the inventory screen renders bag + hotbar only.
//!
//! No module-level globals here - like the C, the inventory struct is
//! owned by the caller (player_ctrl / persistence).

#![allow(dead_code)] // consumed by the interact/persistence waves of the port

use tenebris_core::blocks::Block;

/// Port of `INV_HOTBAR_SLOTS`.
pub const INV_HOTBAR_SLOTS: usize = 9;

/// Port of `inv_slot_t`: the placeable block assigned to a hotbar key
/// plus its stack count (real in survival; 1 = "assigned" in creative).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct InvSlot {
    pub block_type: Block,
    pub count: i32,
}

impl InvSlot {
    /// Stand-in for the C positional initialiser `{ type, count }`.
    pub const fn block(block_type: Block, count: i32) -> Self {
        InvSlot { block_type, count }
    }
}

const EMPTY_SLOT: InvSlot = InvSlot::block(Block::Air, 0);

/// Port of `inventory_t`: the 9 quick-access hotbar slots along the
/// bottom of the screen.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Inventory {
    pub slots: [InvSlot; INV_HOTBAR_SLOTS],
    /// 0..8
    pub selected: i32,
}

impl Default for Inventory {
    /// Mirrors the C pattern of a zeroed `inventory_t` (all slots
    /// `BLOCK_AIR` / count 0, selection 0) before an init call.
    fn default() -> Self {
        Inventory { slots: [EMPTY_SLOT; INV_HOTBAR_SLOTS], selected: 0 }
    }
}

/// Creative-mode preset: hotbar pre-assigned with the common buildable
/// blocks. Counts are 1 ("assigned") - creative placement is free and
/// count-less; the inventory screen's palette reassigns slots.
pub fn init_creative(inv: &mut Inventory) {
    *inv = Inventory::default();
    /* Hotbar layout: torch at slot 0 (key "1") so a fresh creative
     * session always has light one keypress away. The rest is a
     * sensible terrain palette, with water in the rightmost slot so
     * the per-voxel flow simulator is one keypress away without
     * needing the F2 debug toggle. */
    inv.slots[0] = InvSlot::block(Block::Torch, 1);
    inv.slots[1] = InvSlot::block(Block::Stone, 1);
    inv.slots[2] = InvSlot::block(Block::Dirt, 1);
    inv.slots[3] = InvSlot::block(Block::Grass, 1);
    inv.slots[4] = InvSlot::block(Block::Sand, 1);
    inv.slots[5] = InvSlot::block(Block::Wood, 1);
    inv.slots[6] = InvSlot::block(Block::Leaves, 1);
    inv.slots[7] = InvSlot::block(Block::Ice, 1);
    inv.slots[8] = InvSlot::block(Block::Water, 1);
    inv.selected = 0;
}

/// Survival-mode preset: empty hotbar, pickups go to the first matching
/// slot or the first empty one.
pub fn init_empty(inv: &mut Inventory) {
    *inv = Inventory::default();
    /* Survival spawns with a fully empty hotbar - every block has to be
     * mined and every tool / torch crafted (torches have a recipe).
     * Nothing is reserved. */
    inv.selected = 0;
}

/// Add a single broken block to inventory. Stacks on the first slot
/// matching the type, or fills the first empty hotbar slot. Returns
/// true when something was added. Survival-only in practice - the
/// interact call sites gate pickups on `p.survival_mode`.
pub fn add(inv: &mut Inventory, block_type: Block) -> bool {
    if block_type == Block::Air {
        return false;
    }
    /* Stack on first matching slot. */
    for i in 0..INV_HOTBAR_SLOTS {
        if inv.slots[i].block_type == block_type && inv.slots[i].count > 0 {
            inv.slots[i].count += 1;
            return true;
        }
    }
    /* Otherwise drop into first empty slot. */
    for i in 0..INV_HOTBAR_SLOTS {
        if inv.slots[i].block_type == Block::Air || inv.slots[i].count == 0 {
            inv.slots[i].block_type = block_type;
            inv.slots[i].count = 1;
            return true;
        }
    }
    false /* hotbar full */
}

/// True if the currently-selected slot can place a block:
/// type != AIR && count > 0. (A creative slot's count is always 1.)
pub fn can_place(inv: &Inventory) -> bool {
    let s = &inv.slots[inv.selected as usize];
    s.block_type != Block::Air && s.count > 0
}

/// Block type the player will place on right-click. Returns
/// `Block::Air` when the slot is empty.
pub fn selected(inv: &Inventory) -> Block {
    if !can_place(inv) {
        return Block::Air;
    }
    inv.slots[inv.selected as usize].block_type
}

/// Take one off the selected slot. Empties the slot when count drops
/// to 0. Survival-only: creative placement is free, so the interact
/// call sites gate this on `p.survival_mode`.
pub fn consume(inv: &mut Inventory) {
    let s = &mut inv.slots[inv.selected as usize];
    if s.count <= 0 {
        return;
    }
    s.count -= 1;
    if s.count == 0 {
        s.block_type = Block::Air;
    }
}

/// Move selection. Clamps to the hotbar range (the C header says
/// "wraps" but the implementation clamps; the implementation wins).
pub fn select(inv: &mut Inventory, slot: i32) {
    let mut slot = slot;
    if slot < 0 {
        slot = 0;
    }
    if slot >= INV_HOTBAR_SLOTS as i32 {
        slot = INV_HOTBAR_SLOTS as i32 - 1;
    }
    inv.selected = slot;
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn creative_layout_is_countless_palette() {
        let mut inv = Inventory::default();
        init_creative(&mut inv);
        let want = [
            Block::Torch,
            Block::Stone,
            Block::Dirt,
            Block::Grass,
            Block::Sand,
            Block::Wood,
            Block::Leaves,
            Block::Ice,
            Block::Water,
        ];
        for (i, b) in want.iter().enumerate() {
            assert_eq!(inv.slots[i].block_type, *b, "slot {}", i);
            /* Count 1 = "assigned"; no 9999 sentinel stacks anymore. */
            assert_eq!(inv.slots[i].count, 1, "slot {}", i);
        }
        assert_eq!(inv.selected, 0);
    }

    #[test]
    fn empty_layout_is_fully_empty() {
        let mut inv = Inventory::default();
        init_empty(&mut inv);
        for i in 0..INV_HOTBAR_SLOTS {
            assert_eq!(inv.slots[i], InvSlot::block(Block::Air, 0), "slot {}", i);
        }
        assert_eq!(inv.selected, 0);
    }

    #[test]
    fn add_rejects_air() {
        let mut inv = Inventory::default();
        init_empty(&mut inv);
        assert!(!add(&mut inv, Block::Air));
        assert_eq!(inv.slots[1], InvSlot::block(Block::Air, 0));
    }

    #[test]
    fn add_stacks_then_fills_first_empty() {
        let mut inv = Inventory::default();
        init_empty(&mut inv);
        // new type -> first empty slot (the whole hotbar starts empty)
        assert!(add(&mut inv, Block::Stone));
        assert_eq!(inv.slots[0], InvSlot::block(Block::Stone, 1));
        // same type stacks instead of opening a new slot
        assert!(add(&mut inv, Block::Stone));
        assert_eq!(inv.slots[0], InvSlot::block(Block::Stone, 2));
        assert_eq!(inv.slots[1], InvSlot::block(Block::Air, 0));
        // a different type opens the next empty slot
        assert!(add(&mut inv, Block::Dirt));
        assert_eq!(inv.slots[1], InvSlot::block(Block::Dirt, 1));
    }

    #[test]
    fn add_treats_zero_count_slot_as_empty() {
        let mut inv = Inventory::default();
        init_empty(&mut inv);
        // occupy slot 0, drain slot 1 (type set, count 0)
        inv.slots[0] = InvSlot::block(Block::Stone, 2);
        inv.slots[1] = InvSlot::block(Block::Stone, 0);
        // a drained slot is not a stacking target, but IS a fill target
        // for a different type
        assert!(add(&mut inv, Block::Dirt));
        assert_eq!(inv.slots[1], InvSlot::block(Block::Dirt, 1));
    }

    #[test]
    fn add_fails_when_hotbar_full() {
        let mut inv = Inventory::default();
        init_creative(&mut inv); // all 9 slots occupied
        // a type not present anywhere cannot be added
        assert!(!add(&mut inv, Block::Snow));
        // but a present type still stacks
        assert!(add(&mut inv, Block::Stone));
        assert_eq!(inv.slots[1].count, 2);
    }

    #[test]
    fn can_place_and_selected() {
        let mut inv = Inventory::default();
        init_empty(&mut inv);
        // empty spawn: selected slot 0 is empty, nothing to place
        assert!(!can_place(&inv));
        assert_eq!(selected(&inv), Block::Air);
        // put a block in the selected slot -> placeable
        inv.slots[0] = InvSlot::block(Block::Stone, 5);
        assert!(can_place(&inv));
        assert_eq!(selected(&inv), Block::Stone);
        // empty mid slot: not placeable, reads Air
        select(&mut inv, 4);
        assert!(!can_place(&inv));
        assert_eq!(selected(&inv), Block::Air);
        // type set but count drained -> not placeable
        select(&mut inv, 0);
        inv.slots[0].count = 0;
        assert!(!can_place(&inv));
        assert_eq!(selected(&inv), Block::Air);
    }

    #[test]
    fn consume_drains_and_empties() {
        let mut inv = Inventory::default();
        init_empty(&mut inv);
        select(&mut inv, 1);
        inv.slots[1] = InvSlot::block(Block::Stone, 2);
        consume(&mut inv);
        assert_eq!(inv.slots[1], InvSlot::block(Block::Stone, 1));
        consume(&mut inv);
        assert_eq!(inv.slots[1], InvSlot::block(Block::Air, 0));
        // consuming an empty slot is a no-op
        consume(&mut inv);
        assert_eq!(inv.slots[1], InvSlot::block(Block::Air, 0));
    }

    #[test]
    fn select_clamps_both_ends() {
        let mut inv = Inventory::default();
        init_creative(&mut inv);
        select(&mut inv, -5);
        assert_eq!(inv.selected, 0);
        select(&mut inv, 99);
        assert_eq!(inv.selected, 8);
        select(&mut inv, 3);
        assert_eq!(inv.selected, 3);
    }
}
