//! Port of `tenebris-c/src/client/inventory.{c,h}`.
//!
//! Renames (per PORTING.md rule 4 - module prefix dropped):
//! - `inventory_init_creative()`         -> `inventory::init_creative()`
//! - `inventory_init_empty()`            -> `inventory::init_empty()`
//! - `inventory_add()`                   -> `inventory::add()`
//! - `inventory_can_place()`             -> `inventory::can_place()`
//! - `inventory_selected()`              -> `inventory::selected()`
//! - `inventory_consume()`               -> `inventory::consume()`
//! - `inventory_select()`                -> `inventory::select()`
//! - `inventory_ensure_reserved_torch()` -> `inventory::ensure_reserved_torch()`
//! - `inventory_ensure_reserved_water()` -> `inventory::ensure_reserved_water()`
//!
//! Struct field rename: `inv_slot_t.type` -> `InvSlot::block_type`
//! (`type` is a Rust keyword). The C functions take `inventory_t*` and
//! NULL-check where the C did; Rust references make the NULL checks
//! structurally impossible, so they are dropped.
//!
//! No module-level globals here - like the C, the inventory struct is
//! owned by the caller (player_ctrl / persistence).

#![allow(dead_code)] // consumed by the interact/persistence waves of the port

use tenebris_core::blocks::Block;

/// Port of `INV_HOTBAR_SLOTS`.
pub const INV_HOTBAR_SLOTS: usize = 9;

/// Port of `CREATIVE_COUNT` (private in the C too).
const CREATIVE_COUNT: i32 = 9999;

/// Port of `inv_slot_t`. `Block::Air` == empty slot.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct InvSlot {
    pub block_type: Block,
    pub count: i32,
}

const EMPTY_SLOT: InvSlot = InvSlot { block_type: Block::Air, count: 0 };

/// Port of `inventory_t`.
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

/// Creative-mode preset: hotbar pre-stocked with the common buildable
/// blocks at "essentially infinite" count. Reset on game start.
pub fn init_creative(inv: &mut Inventory) {
    *inv = Inventory::default();
    /* Hotbar layout: torch is reserved at slot 0 (key "1") so a
     * fresh creative session always has light one keypress away,
     * and the persistence path enforces the same invariant on every
     * restore - see ensure_reserved_torch. The rest is a
     * sensible terrain palette, with water in the rightmost slot
     * so the per-voxel flow simulator is one keypress away without
     * needing the F2 debug toggle. Snow is still placeable via
     * mining (every other slot's block is too). */
    inv.slots[0] = InvSlot { block_type: Block::Torch, count: CREATIVE_COUNT };
    inv.slots[1] = InvSlot { block_type: Block::Stone, count: CREATIVE_COUNT };
    inv.slots[2] = InvSlot { block_type: Block::Dirt, count: CREATIVE_COUNT };
    inv.slots[3] = InvSlot { block_type: Block::Grass, count: CREATIVE_COUNT };
    inv.slots[4] = InvSlot { block_type: Block::Sand, count: CREATIVE_COUNT };
    inv.slots[5] = InvSlot { block_type: Block::Wood, count: CREATIVE_COUNT };
    inv.slots[6] = InvSlot { block_type: Block::Leaves, count: CREATIVE_COUNT };
    inv.slots[7] = InvSlot { block_type: Block::Ice, count: CREATIVE_COUNT };
    inv.slots[8] = InvSlot { block_type: Block::Water, count: CREATIVE_COUNT };
    inv.selected = 0;
}

/// Enforce the "slot 0 is always torches" invariant. Called after
/// boot init (redundant but cheap) and after every server-driven
/// inventory restore so a stale save can never strip the torch slot.
pub fn ensure_reserved_torch(inv: &mut Inventory) {
    if inv.slots[0].block_type != Block::Torch || inv.slots[0].count <= 0 {
        inv.slots[0].block_type = Block::Torch;
        inv.slots[0].count = CREATIVE_COUNT;
    }
}

/// Enforce the "rightmost slot is always the water spawner" invariant.
/// Same reasoning as the torch reservation: water is the fluid-sim
/// placement tool, there's no "mine a water block to add to inventory"
/// path, so a restore that overwrote slot 8 with a picked-up block
/// would leave the player with no way to use the flow simulator.
pub fn ensure_reserved_water(inv: &mut Inventory) {
    let s = &mut inv.slots[INV_HOTBAR_SLOTS - 1];
    if s.block_type != Block::Water || s.count <= 0 {
        s.block_type = Block::Water;
        s.count = CREATIVE_COUNT;
    }
}

/// Survival-mode preset: empty hotbar, pickups go to the first matching
/// slot or the first empty one.
pub fn init_empty(inv: &mut Inventory) {
    *inv = Inventory::default();
    /* Survival starts with an otherwise-empty hotbar so every solid
     * block has to be mined. Two infinite exceptions: torches at
     * slot 0 (no crafting system yet, players need a way to light
     * caves) and water at the rightmost slot (it's a fluid - there's
     * no "mine a water block to add to inventory" path for it, so
     * gating it on creative mode would mean MP players never get
     * to use the flow simulator at all). */
    inv.slots[0] = InvSlot { block_type: Block::Torch, count: CREATIVE_COUNT };
    inv.slots[INV_HOTBAR_SLOTS - 1] = InvSlot { block_type: Block::Water, count: CREATIVE_COUNT };
    inv.selected = 0;
}

/// Add a single broken block to inventory. Stacks on the first slot
/// matching the type, or fills the first empty hotbar slot. Returns
/// true when something was added.
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

/// True if the currently-selected slot can place a block. In creative
/// mode this is always true (counts are huge); in survival it's
/// type != AIR && count > 0.
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
/// to 0.
///
/// Porting note: the C guard is `count > CREATIVE_COUNT` (strict), so
/// a slot at exactly CREATIVE_COUNT (9999) DOES decrement - replicated
/// as-is. The reserved-slot invariants restore the count on the next
/// `ensure_reserved_*` pass once it ever hits 0.
pub fn consume(inv: &mut Inventory) {
    let s = &mut inv.slots[inv.selected as usize];
    if s.count > CREATIVE_COUNT {
        return; /* creative: infinite */
    }
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
    fn creative_layout_matches_c() {
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
            assert_eq!(inv.slots[i].count, 9999, "slot {}", i);
        }
        assert_eq!(inv.selected, 0);
    }

    #[test]
    fn empty_layout_keeps_reserved_torch_and_water() {
        let mut inv = Inventory::default();
        init_empty(&mut inv);
        assert_eq!(inv.slots[0], InvSlot { block_type: Block::Torch, count: 9999 });
        assert_eq!(inv.slots[8], InvSlot { block_type: Block::Water, count: 9999 });
        for i in 1..8 {
            assert_eq!(inv.slots[i], InvSlot { block_type: Block::Air, count: 0 }, "slot {}", i);
        }
        assert_eq!(inv.selected, 0);
    }

    #[test]
    fn ensure_reserved_torch_restores_corrupt_slot0() {
        let mut inv = Inventory::default();
        init_empty(&mut inv);
        // wrong type
        inv.slots[0] = InvSlot { block_type: Block::Stone, count: 12 };
        ensure_reserved_torch(&mut inv);
        assert_eq!(inv.slots[0], InvSlot { block_type: Block::Torch, count: 9999 });
        // right type, drained count
        inv.slots[0].count = 0;
        ensure_reserved_torch(&mut inv);
        assert_eq!(inv.slots[0].count, 9999);
        // right type, positive count: left untouched (no top-up)
        inv.slots[0].count = 5;
        ensure_reserved_torch(&mut inv);
        assert_eq!(inv.slots[0], InvSlot { block_type: Block::Torch, count: 5 });
    }

    #[test]
    fn ensure_reserved_water_restores_corrupt_slot8() {
        let mut inv = Inventory::default();
        init_empty(&mut inv);
        // a restore that overwrote slot 8 with a picked-up block
        inv.slots[8] = InvSlot { block_type: Block::Dirt, count: 3 };
        ensure_reserved_water(&mut inv);
        assert_eq!(inv.slots[8], InvSlot { block_type: Block::Water, count: 9999 });
        // drained water comes back too
        inv.slots[8].count = -1;
        ensure_reserved_water(&mut inv);
        assert_eq!(inv.slots[8].count, 9999);
        // healthy water slot with a low count is preserved
        inv.slots[8].count = 2;
        ensure_reserved_water(&mut inv);
        assert_eq!(inv.slots[8], InvSlot { block_type: Block::Water, count: 2 });
        // only slot 8 is touched
        assert_eq!(inv.slots[7], InvSlot { block_type: Block::Air, count: 0 });
    }

    #[test]
    fn add_rejects_air() {
        let mut inv = Inventory::default();
        init_empty(&mut inv);
        assert!(!add(&mut inv, Block::Air));
        assert_eq!(inv.slots[1], InvSlot { block_type: Block::Air, count: 0 });
    }

    #[test]
    fn add_stacks_then_fills_first_empty() {
        let mut inv = Inventory::default();
        init_empty(&mut inv);
        // new type -> first empty slot (slot 1; 0 is torch)
        assert!(add(&mut inv, Block::Stone));
        assert_eq!(inv.slots[1], InvSlot { block_type: Block::Stone, count: 1 });
        // same type stacks instead of opening a new slot
        assert!(add(&mut inv, Block::Stone));
        assert_eq!(inv.slots[1], InvSlot { block_type: Block::Stone, count: 2 });
        assert_eq!(inv.slots[2], InvSlot { block_type: Block::Air, count: 0 });
        // stacking matches existing reserved slots too (torch at slot 0)
        assert!(add(&mut inv, Block::Torch));
        assert_eq!(inv.slots[0].count, 10000);
    }

    #[test]
    fn add_treats_zero_count_slot_as_empty() {
        let mut inv = Inventory::default();
        init_empty(&mut inv);
        // a drained slot (type set, count 0) is not a stacking target,
        // but IS a fill target for a different type
        inv.slots[1] = InvSlot { block_type: Block::Stone, count: 0 };
        assert!(add(&mut inv, Block::Dirt));
        assert_eq!(inv.slots[1], InvSlot { block_type: Block::Dirt, count: 1 });
    }

    #[test]
    fn add_fails_when_hotbar_full() {
        let mut inv = Inventory::default();
        init_creative(&mut inv); // all 9 slots occupied
        // a type not present anywhere cannot be added
        assert!(!add(&mut inv, Block::Snow));
        // but a present type still stacks
        assert!(add(&mut inv, Block::Stone));
        assert_eq!(inv.slots[1].count, 10000);
    }

    #[test]
    fn can_place_and_selected() {
        let mut inv = Inventory::default();
        init_empty(&mut inv);
        // slot 0: torch, placeable
        assert!(can_place(&inv));
        assert_eq!(selected(&inv), Block::Torch);
        // empty mid slot: not placeable, reads Air
        select(&mut inv, 4);
        assert!(!can_place(&inv));
        assert_eq!(selected(&inv), Block::Air);
        // reserved water slot
        select(&mut inv, 8);
        assert!(can_place(&inv));
        assert_eq!(selected(&inv), Block::Water);
        // type set but count drained -> not placeable
        inv.slots[8].count = 0;
        assert!(!can_place(&inv));
        assert_eq!(selected(&inv), Block::Air);
    }

    #[test]
    fn consume_survival_drains_and_empties() {
        let mut inv = Inventory::default();
        init_empty(&mut inv);
        select(&mut inv, 1);
        inv.slots[1] = InvSlot { block_type: Block::Stone, count: 2 };
        consume(&mut inv);
        assert_eq!(inv.slots[1], InvSlot { block_type: Block::Stone, count: 1 });
        consume(&mut inv);
        assert_eq!(inv.slots[1], InvSlot { block_type: Block::Air, count: 0 });
        // consuming an empty slot is a no-op
        consume(&mut inv);
        assert_eq!(inv.slots[1], InvSlot { block_type: Block::Air, count: 0 });
    }

    #[test]
    fn consume_creative_semantics_match_c_exactly() {
        let mut inv = Inventory::default();
        init_creative(&mut inv);
        select(&mut inv, 1);
        // C guard is strict (count > 9999), so a slot at exactly 9999
        // decrements. Pin that.
        consume(&mut inv);
        assert_eq!(inv.slots[1].count, 9998);
        // a count above the guard really is infinite
        inv.slots[1].count = 10000;
        consume(&mut inv);
        assert_eq!(inv.slots[1].count, 10000);
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
