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

/* Main inventory grid below the hotbar - shown on the inventory screen
 * (I key). 10 cols x 5 rows so it matches the mockup in crafting.md.
 * Slots are zero-initialised on every inventory init call so a stale
 * save can't smuggle data in via the new range. */
pub const INV_MAIN_COLS: usize = 10;
pub const INV_MAIN_ROWS: usize = 5;
pub const INV_MAIN_SLOTS: usize = INV_MAIN_COLS * INV_MAIN_ROWS;

/* 3x3 personal crafting grid + 1 output preview slot. Lives on the
 * crafting tab of the inventory screen; persistence will copy these
 * fields once the recipe matcher lands so a half-laid-out recipe
 * survives a tab switch / reconnect. */
pub const INV_CRAFT_COLS: usize = 3;
pub const INV_CRAFT_ROWS: usize = 3;
pub const INV_CRAFT_SLOTS: usize = INV_CRAFT_COLS * INV_CRAFT_ROWS;

/// Port of `item_id_t`. Order MUST match the LAYOUT table in
/// tools/gen-item-sprites.py - the icon atlas indexes by (id-1) and
/// splits into rows / cols below the surface, so an off-by-one here
/// lands you on the wrong icon at runtime. Add new icons by extending
/// BOTH the python LAYOUT and this enum in lockstep.
///
/// PartialOrd/Ord derive: inventory_screen's "singleton tool" badge
/// gate compares the enum as a range (`>= ITEM_PICKAXE && <=
/// ITEM_PROSPECTING_AXE`), like the C int comparison.
#[derive(Clone, Copy, Debug, PartialEq, Eq, PartialOrd, Ord)]
pub enum ItemId {
    /// empty slot (or it's a block slot)
    None = 0,
    Pickaxe,
    Axe,
    Shovel,
    ProspectingAxe,
    Log,
    Plank,
    Stick,
    Stone,
    SmallRock,
    GrassClip,
    Flower,
}

/// Port of `ITEM_COUNT`.
pub const ITEM_COUNT: usize = 12;

/// Port of `inv_slot_t`. A slot can hold either a placeable block (the
/// existing hotbar use-case) or a craftable item. `item_id ==
/// ItemId::None` means "this is a block slot, sample the terrain
/// atlas"; `block_type == Block::Air` means "not a block; check
/// item_id".
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct InvSlot {
    pub block_type: Block,
    pub count: i32,
    pub item_id: ItemId,
}

impl InvSlot {
    /// Stand-in for the C positional initialiser `{ type, count }` -
    /// leaves `item_id == ITEM_NONE` like the C two-field form.
    pub const fn block(block_type: Block, count: i32) -> Self {
        InvSlot { block_type, count, item_id: ItemId::None }
    }

    /// Stand-in for the C three-field initialiser
    /// `{ BLOCK_AIR, count, item_id }`.
    pub const fn item(item_id: ItemId, count: i32) -> Self {
        InvSlot { block_type: Block::Air, count, item_id }
    }
}

const EMPTY_SLOT: InvSlot = InvSlot::block(Block::Air, 0);

/// Port of `inventory_t`.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Inventory {
    /* Hotbar - the 9 quick-access slots along the bottom of the
     * screen. Same shape as before; only the slot struct has grown. */
    pub slots: [InvSlot; INV_HOTBAR_SLOTS],
    /// 0..8
    pub selected: i32,

    /* Main inventory grid - 50 slots laid out 10 cols x 5 rows on the
     * inventory tab. Zero-initialised; the survival drop path will
     * fill it once item-drops land. */
    pub main: [InvSlot; INV_MAIN_SLOTS],

    /* 3x3 personal crafting grid + a sticky output slot the recipe
     * matcher writes into. Both live on the crafting tab. */
    pub craft: [InvSlot; INV_CRAFT_SLOTS],
    pub craft_output: InvSlot,

    /* The stack the player is "holding" while dragging between slots on
     * the inventory screen (Minecraft-style cursor item). count == 0
     * means nothing held. Not persisted - reset on every init. */
    pub cursor: InvSlot,
}

impl Default for Inventory {
    /// Mirrors the C pattern of a zeroed `inventory_t` (all slots
    /// `BLOCK_AIR` / count 0 / `ITEM_NONE`, selection 0) before an
    /// init call.
    fn default() -> Self {
        Inventory {
            slots: [EMPTY_SLOT; INV_HOTBAR_SLOTS],
            selected: 0,
            main: [EMPTY_SLOT; INV_MAIN_SLOTS],
            craft: [EMPTY_SLOT; INV_CRAFT_SLOTS],
            craft_output: EMPTY_SLOT,
            cursor: EMPTY_SLOT,
        }
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
    inv.slots[0] = InvSlot::block(Block::Torch, CREATIVE_COUNT);
    inv.slots[1] = InvSlot::block(Block::Stone, CREATIVE_COUNT);
    inv.slots[2] = InvSlot::block(Block::Dirt, CREATIVE_COUNT);
    inv.slots[3] = InvSlot::block(Block::Grass, CREATIVE_COUNT);
    inv.slots[4] = InvSlot::block(Block::Sand, CREATIVE_COUNT);
    inv.slots[5] = InvSlot::block(Block::Wood, CREATIVE_COUNT);
    inv.slots[6] = InvSlot::block(Block::Leaves, CREATIVE_COUNT);
    inv.slots[7] = InvSlot::block(Block::Ice, CREATIVE_COUNT);
    inv.slots[8] = InvSlot::block(Block::Water, CREATIVE_COUNT);
    inv.selected = 0;

    /* Main inventory pre-stock: four starter tools + a small stash of
     * raw / refined resources so the inventory + crafting screens
     * have something visible to render until the survival drop path
     * lands. The hotbar's still block-only (block placement is the
     * only verb wired up today); items show up on the I-screen and
     * inside the 3x3 crafting grid. */
    inv.main[0] = InvSlot::item(ItemId::Pickaxe, 1);
    inv.main[1] = InvSlot::item(ItemId::Axe, 1);
    inv.main[2] = InvSlot::item(ItemId::Shovel, 1);
    inv.main[3] = InvSlot::item(ItemId::ProspectingAxe, 1);
    inv.main[10] = InvSlot::item(ItemId::Log, 8);
    inv.main[11] = InvSlot::item(ItemId::Plank, 32);
    inv.main[12] = InvSlot::item(ItemId::Stick, 16);
    inv.main[13] = InvSlot::item(ItemId::Stone, 12);
    inv.main[20] = InvSlot::item(ItemId::SmallRock, 4);
    inv.main[21] = InvSlot::item(ItemId::GrassClip, 3);
    inv.main[22] = InvSlot::item(ItemId::Flower, 2);
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
    inv.slots[0] = InvSlot::block(Block::Torch, CREATIVE_COUNT);
    inv.slots[INV_HOTBAR_SLOTS - 1] = InvSlot::block(Block::Water, CREATIVE_COUNT);
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
    fn creative_main_prestock_matches_c() {
        let mut inv = Inventory::default();
        init_creative(&mut inv);
        // Tools row.
        assert_eq!(inv.main[0], InvSlot::item(ItemId::Pickaxe, 1));
        assert_eq!(inv.main[1], InvSlot::item(ItemId::Axe, 1));
        assert_eq!(inv.main[2], InvSlot::item(ItemId::Shovel, 1));
        assert_eq!(inv.main[3], InvSlot::item(ItemId::ProspectingAxe, 1));
        // Resources row.
        assert_eq!(inv.main[10], InvSlot::item(ItemId::Log, 8));
        assert_eq!(inv.main[11], InvSlot::item(ItemId::Plank, 32));
        assert_eq!(inv.main[12], InvSlot::item(ItemId::Stick, 16));
        assert_eq!(inv.main[13], InvSlot::item(ItemId::Stone, 12));
        // Clutter row.
        assert_eq!(inv.main[20], InvSlot::item(ItemId::SmallRock, 4));
        assert_eq!(inv.main[21], InvSlot::item(ItemId::GrassClip, 3));
        assert_eq!(inv.main[22], InvSlot::item(ItemId::Flower, 2));
        // Every other main slot is empty, as is the whole craft grid.
        for (i, s) in inv.main.iter().enumerate() {
            if ![0, 1, 2, 3, 10, 11, 12, 13, 20, 21, 22].contains(&i) {
                assert_eq!(*s, InvSlot::block(Block::Air, 0), "main slot {}", i);
            }
        }
        for s in &inv.craft {
            assert_eq!(*s, InvSlot::block(Block::Air, 0));
        }
        assert_eq!(inv.craft_output, InvSlot::block(Block::Air, 0));
        // Item slots are not block slots and vice versa.
        assert_eq!(inv.main[0].block_type, Block::Air);
        assert_eq!(inv.slots[1].item_id, ItemId::None);
    }

    #[test]
    fn item_id_order_matches_c_enum() {
        // The icon atlas indexes by the enum's integer value; pin the
        // full order so an insertion can't silently shift the icons.
        let order = [
            (ItemId::None, 0),
            (ItemId::Pickaxe, 1),
            (ItemId::Axe, 2),
            (ItemId::Shovel, 3),
            (ItemId::ProspectingAxe, 4),
            (ItemId::Log, 5),
            (ItemId::Plank, 6),
            (ItemId::Stick, 7),
            (ItemId::Stone, 8),
            (ItemId::SmallRock, 9),
            (ItemId::GrassClip, 10),
            (ItemId::Flower, 11),
        ];
        for (id, n) in order {
            assert_eq!(id as i32, n, "{:?}", id);
        }
        assert_eq!(ITEM_COUNT, 12);
        // The "singleton tool" range gate used by inventory_screen.
        assert!(ItemId::Axe >= ItemId::Pickaxe && ItemId::Axe <= ItemId::ProspectingAxe);
        assert!(!(ItemId::Log >= ItemId::Pickaxe && ItemId::Log <= ItemId::ProspectingAxe));
    }

    #[test]
    fn empty_layout_keeps_reserved_torch_and_water() {
        let mut inv = Inventory::default();
        init_empty(&mut inv);
        assert_eq!(inv.slots[0], InvSlot::block(Block::Torch, 9999));
        assert_eq!(inv.slots[8], InvSlot::block(Block::Water, 9999));
        for i in 1..8 {
            assert_eq!(inv.slots[i], InvSlot::block(Block::Air, 0), "slot {}", i);
        }
        assert_eq!(inv.selected, 0);
    }

    #[test]
    fn ensure_reserved_torch_restores_corrupt_slot0() {
        let mut inv = Inventory::default();
        init_empty(&mut inv);
        // wrong type
        inv.slots[0] = InvSlot::block(Block::Stone, 12);
        ensure_reserved_torch(&mut inv);
        assert_eq!(inv.slots[0], InvSlot::block(Block::Torch, 9999));
        // right type, drained count
        inv.slots[0].count = 0;
        ensure_reserved_torch(&mut inv);
        assert_eq!(inv.slots[0].count, 9999);
        // right type, positive count: left untouched (no top-up)
        inv.slots[0].count = 5;
        ensure_reserved_torch(&mut inv);
        assert_eq!(inv.slots[0], InvSlot::block(Block::Torch, 5));
    }

    #[test]
    fn ensure_reserved_water_restores_corrupt_slot8() {
        let mut inv = Inventory::default();
        init_empty(&mut inv);
        // a restore that overwrote slot 8 with a picked-up block
        inv.slots[8] = InvSlot::block(Block::Dirt, 3);
        ensure_reserved_water(&mut inv);
        assert_eq!(inv.slots[8], InvSlot::block(Block::Water, 9999));
        // drained water comes back too
        inv.slots[8].count = -1;
        ensure_reserved_water(&mut inv);
        assert_eq!(inv.slots[8].count, 9999);
        // healthy water slot with a low count is preserved
        inv.slots[8].count = 2;
        ensure_reserved_water(&mut inv);
        assert_eq!(inv.slots[8], InvSlot::block(Block::Water, 2));
        // only slot 8 is touched
        assert_eq!(inv.slots[7], InvSlot::block(Block::Air, 0));
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
        // new type -> first empty slot (slot 1; 0 is torch)
        assert!(add(&mut inv, Block::Stone));
        assert_eq!(inv.slots[1], InvSlot::block(Block::Stone, 1));
        // same type stacks instead of opening a new slot
        assert!(add(&mut inv, Block::Stone));
        assert_eq!(inv.slots[1], InvSlot::block(Block::Stone, 2));
        assert_eq!(inv.slots[2], InvSlot::block(Block::Air, 0));
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
        inv.slots[1] = InvSlot::block(Block::Stone, 0);
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
