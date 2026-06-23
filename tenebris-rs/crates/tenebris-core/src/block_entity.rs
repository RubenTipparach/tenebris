//! Per-placed-block state, parallel to the voxel byte grid.
//!
//! The block byte (`World::blocks`) says WHAT a cell is; a `BlockEntity`
//! says its placed *state*. Today that is a tech block's facing (which way
//! the cube's front points); machine state - furnace smelt progress, chest
//! inventory, generator power, printer jobs - layers on here as the JS
//! machines are ported, so every machine reads/writes one store keyed by
//! (tile, depth).
//!
//! Lives in `core/` so SP and MP share the exact same code path. The store
//! is owned by `World`; `World::set` drops an entity when its cell changes
//! (the block was mined or replaced), and the placement path writes a fresh
//! one. Persistence is wired at the same call site as `world_set` per the
//! repo's same-frame-save rule.

use std::collections::HashMap;

use crate::world::WORLD_MAX_DEPTH;

/// `facing` sentinel: no facing recorded, use the default cube orientation.
pub const FACING_UNSET: u8 = 0xFF;

/// Storage-chest capacity (matches the JS `CHEST_SLOTS`).
pub const CHEST_SLOTS: usize = 27;

/// One chest slot. `count == 0` means empty (item ignored).
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct ChestSlot {
    pub item: u16,
    pub count: u16,
}

/// A chest's storage grid.
pub type ChestInv = [ChestSlot; CHEST_SLOTS];

/// Seconds to smelt one item (JS `SMELT_TIME`).
pub const FURNACE_SMELT_TIME_S: f32 = 10.0;
/// Smelts produced per unit of fuel (JS `FUEL_PER_COAL`).
pub const FUEL_PER_COAL: u16 = 8;

/// Furnace slots + smelt progress. Mirrors the JS `PlacedFurnace`: an input
/// stack (raw ore), a fuel stack (coal), an output stack (ingots), the
/// 0..1 progress of the current smelt, and how many smelts the currently
/// burning fuel still covers.
#[derive(Clone, Copy, Debug, Default, PartialEq)]
pub struct FurnaceState {
    pub input: ChestSlot,
    pub fuel: ChestSlot,
    pub output: ChestSlot,
    pub progress: f32,
    pub fuel_remaining: u16,
}

/// Machine-specific placed state. `Copy` (every variant is fixed-size) so
/// the whole `BlockEntity` stays cheap to store/return. Generator power,
/// printer jobs append as variants here.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum MachineState {
    /// Plain block - no machine state (most tech blocks until their
    /// behavior lands).
    None,
    /// Storage chest contents.
    Chest(ChestInv),
    /// Furnace input/fuel/output + smelt progress.
    Furnace(FurnaceState),
}

impl Default for MachineState {
    fn default() -> Self {
        MachineState::None
    }
}

/// Placed-state for one cell. `Copy` + small-ish: the store holds these by
/// value.
#[derive(Clone, Copy, Debug, PartialEq)]
pub struct BlockEntity {
    /// Tile edge index (0..`num_neighbors`) the block's front faces, or
    /// [`FACING_UNSET`]. Tech-block cubes orient their front to this so a
    /// placed machine faces the player.
    pub facing: u8,
    /// Machine behavior state (chest contents, etc.).
    pub state: MachineState,
}

impl Default for BlockEntity {
    fn default() -> Self {
        Self { facing: FACING_UNSET, state: MachineState::None }
    }
}

impl BlockEntity {
    /// A facing-only entity (no machine state).
    pub fn with_facing(facing: u8) -> Self {
        Self { facing, state: MachineState::None }
    }

    /// Borrow the chest inventory if this entity is a chest.
    pub fn chest(&self) -> Option<&ChestInv> {
        match &self.state {
            MachineState::Chest(c) => Some(c),
            _ => None,
        }
    }

    /// Promote this entity to a chest (if it isn't already) and return the
    /// inventory for mutation.
    pub fn chest_mut(&mut self) -> &mut ChestInv {
        if !matches!(self.state, MachineState::Chest(_)) {
            self.state = MachineState::Chest([ChestSlot::default(); CHEST_SLOTS]);
        }
        match &mut self.state {
            MachineState::Chest(c) => c,
            _ => unreachable!(),
        }
    }

    /// Borrow the furnace state if this entity is a furnace.
    pub fn furnace(&self) -> Option<&FurnaceState> {
        match &self.state {
            MachineState::Furnace(f) => Some(f),
            _ => None,
        }
    }

    /// Promote this entity to a furnace (if it isn't already) and return
    /// its state for mutation.
    pub fn furnace_mut(&mut self) -> &mut FurnaceState {
        if !matches!(self.state, MachineState::Furnace(_)) {
            self.state = MachineState::Furnace(FurnaceState::default());
        }
        match &mut self.state {
            MachineState::Furnace(f) => f,
            _ => unreachable!(),
        }
    }
}

/// Advance one furnace by `dt` seconds. Burns a unit of fuel when the
/// current charge runs out (and there is something to smelt), advances the
/// smelt, and on completion consumes one input + emits the smelt output.
/// Returns true when a durable change happened (a smelt completed), so the
/// caller can persist. Mirrors the JS `FurnaceManager.update`.
pub fn furnace_tick(f: &mut FurnaceState, dt: f32) -> bool {
    use crate::items;
    // Nothing valid to smelt -> idle, progress resets.
    let Some((out_item, out_qty)) = items::smelt_output(f.input.item) else {
        f.progress = 0.0;
        return false;
    };
    if f.input.count == 0 {
        f.progress = 0.0;
        return false;
    }
    // Output must be empty or the same item with room.
    let out_ok =
        f.output.count == 0 || (f.output.item == out_item && f.output.count < items::stack_size(out_item));
    if !out_ok {
        return false;
    }
    // Light fresh fuel when the current charge is spent.
    if f.fuel_remaining == 0 {
        if f.fuel.count > 0 && items::is_fuel(f.fuel.item) {
            f.fuel.count -= 1;
            if f.fuel.count == 0 {
                f.fuel.item = 0;
            }
            f.fuel_remaining = FUEL_PER_COAL;
        } else {
            f.progress = 0.0;
            return false;
        }
    }
    f.progress += dt / FURNACE_SMELT_TIME_S;
    if f.progress >= 1.0 {
        f.progress = 0.0;
        f.input.count -= 1;
        if f.input.count == 0 {
            f.input.item = 0;
        }
        if f.output.count == 0 {
            f.output.item = out_item;
        }
        f.output.count += out_qty;
        f.fuel_remaining -= 1;
        return true;
    }
    false
}

/// Add `count` of `item` to a chest, topping up matching stacks first then
/// filling empty slots. Returns the leftover that didn't fit.
pub fn chest_add(inv: &mut ChestInv, item: u16, count: u16, stack_max: u16) -> u16 {
    let mut remaining = count;
    let stack_max = stack_max.max(1);
    for s in inv.iter_mut() {
        if remaining == 0 {
            break;
        }
        if s.count > 0 && s.item == item && s.count < stack_max {
            let add = (stack_max - s.count).min(remaining);
            s.count += add;
            remaining -= add;
        }
    }
    for s in inv.iter_mut() {
        if remaining == 0 {
            break;
        }
        if s.count == 0 {
            s.item = item;
            let add = stack_max.min(remaining);
            s.count = add;
            remaining -= add;
        }
    }
    remaining
}

/// Take the whole stack from chest slot `idx`, clearing it. Returns
/// `(item, count)` or `None` if the slot is empty / out of range.
pub fn chest_take(inv: &mut ChestInv, idx: usize) -> Option<(u16, u16)> {
    let s = inv.get_mut(idx)?;
    if s.count == 0 {
        return None;
    }
    let out = (s.item, s.count);
    *s = ChestSlot::default();
    Some(out)
}

/// Sparse map of placed-block state, keyed by `tile * WORLD_MAX_DEPTH +
/// depth` (the same packing the voxel grid uses).
#[derive(Clone, Default)]
pub struct BlockEntityStore {
    map: HashMap<u32, BlockEntity>,
}

impl BlockEntityStore {
    #[inline]
    fn key(tile: i32, depth: i32) -> u32 {
        (tile as u32) * (WORLD_MAX_DEPTH as u32) + depth as u32
    }

    pub fn new() -> Self {
        Self::default()
    }

    pub fn is_empty(&self) -> bool {
        self.map.is_empty()
    }

    pub fn len(&self) -> usize {
        self.map.len()
    }

    pub fn get(&self, tile: i32, depth: i32) -> Option<BlockEntity> {
        self.map.get(&Self::key(tile, depth)).copied()
    }

    /// Mutable borrow of an existing entity.
    pub fn get_mut(&mut self, tile: i32, depth: i32) -> Option<&mut BlockEntity> {
        self.map.get_mut(&Self::key(tile, depth))
    }

    /// Get the entity for a cell, inserting a default one if absent (used
    /// when a machine first needs state, e.g. opening a fresh chest).
    pub fn entry(&mut self, tile: i32, depth: i32) -> &mut BlockEntity {
        self.map.entry(Self::key(tile, depth)).or_default()
    }

    pub fn set(&mut self, tile: i32, depth: i32, e: BlockEntity) {
        self.map.insert(Self::key(tile, depth), e);
    }

    pub fn remove(&mut self, tile: i32, depth: i32) {
        self.map.remove(&Self::key(tile, depth));
    }

    /// Facing for a cell, or [`FACING_UNSET`] if it has no entity.
    pub fn facing(&self, tile: i32, depth: i32) -> u8 {
        self.map.get(&Self::key(tile, depth)).map(|e| e.facing).unwrap_or(FACING_UNSET)
    }

    /// Advance every machine by `dt` seconds (furnace smelt, later
    /// generators / printer). Returns true if any furnace completed a
    /// smelt this tick, so the caller can persist the durable change.
    pub fn tick(&mut self, dt: f32) -> bool {
        let mut changed = false;
        for e in self.map.values_mut() {
            if let MachineState::Furnace(f) = &mut e.state {
                changed |= furnace_tick(f, dt);
            }
        }
        changed
    }

    /// Iterate `(tile, depth, entity)` - used by the save path to
    /// serialise the whole store.
    pub fn iter(&self) -> impl Iterator<Item = (i32, i32, BlockEntity)> + '_ {
        self.map.iter().map(|(&k, &e)| {
            let depth = (k % WORLD_MAX_DEPTH as u32) as i32;
            let tile = (k / WORLD_MAX_DEPTH as u32) as i32;
            (tile, depth, e)
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn set_get_remove_roundtrip() {
        let mut s = BlockEntityStore::new();
        assert!(s.is_empty());
        assert_eq!(s.facing(5, 3), FACING_UNSET);

        s.set(5, 3, BlockEntity::with_facing(2));
        assert_eq!(s.len(), 1);
        assert_eq!(s.facing(5, 3), 2);
        assert_eq!(s.get(5, 3), Some(BlockEntity::with_facing(2)));
        // A different cell is independent.
        assert_eq!(s.facing(5, 4), FACING_UNSET);

        s.remove(5, 3);
        assert!(s.is_empty());
        assert_eq!(s.facing(5, 3), FACING_UNSET);
    }

    #[test]
    fn chest_add_tops_up_then_fills_and_overflows() {
        let mut inv: ChestInv = [ChestSlot::default(); CHEST_SLOTS];
        // First add lands in slot 0.
        assert_eq!(chest_add(&mut inv, 7, 10, 64), 0);
        assert_eq!(inv[0], ChestSlot { item: 7, count: 10 });
        // Same item tops up the existing stack, not a new slot.
        assert_eq!(chest_add(&mut inv, 7, 5, 64), 0);
        assert_eq!(inv[0], ChestSlot { item: 7, count: 15 });
        assert_eq!(inv[1].count, 0);
        // A different item takes the next empty slot.
        assert_eq!(chest_add(&mut inv, 9, 3, 64), 0);
        assert_eq!(inv[1], ChestSlot { item: 9, count: 3 });
    }

    #[test]
    fn chest_add_returns_overflow_when_full() {
        let mut inv: ChestInv = [ChestSlot { item: 1, count: 1 }; CHEST_SLOTS];
        // Every slot holds item 1 at 1/1 stack-max -> no room for item 2.
        assert_eq!(chest_add(&mut inv, 2, 5, 1), 5);
    }

    #[test]
    fn chest_take_clears_slot() {
        let mut inv: ChestInv = [ChestSlot::default(); CHEST_SLOTS];
        inv[4] = ChestSlot { item: 3, count: 12 };
        assert_eq!(chest_take(&mut inv, 4), Some((3, 12)));
        assert_eq!(inv[4].count, 0);
        assert_eq!(chest_take(&mut inv, 4), None);
        assert_eq!(chest_take(&mut inv, 999), None);
    }

    #[test]
    fn furnace_smelts_over_time_consuming_fuel() {
        use crate::items::{COAL, COPPER, COPPER_INGOT};
        let mut f = FurnaceState::default();
        f.input = ChestSlot { item: COPPER, count: 2 };
        f.fuel = ChestSlot { item: COAL, count: 1 };
        // Half the smelt time -> in progress, no output yet, one coal lit.
        assert!(!furnace_tick(&mut f, FURNACE_SMELT_TIME_S * 0.5));
        assert_eq!(f.output.count, 0);
        assert_eq!(f.fuel.count, 0); // coal consumed into the burn charge
        assert_eq!(f.fuel_remaining, FUEL_PER_COAL);
        assert!(f.progress > 0.0);
        // Finish the smelt: one ingot out, one ore consumed, charge -1.
        assert!(furnace_tick(&mut f, FURNACE_SMELT_TIME_S * 0.6));
        assert_eq!(f.output, ChestSlot { item: COPPER_INGOT, count: 1 });
        assert_eq!(f.input.count, 1);
        assert_eq!(f.fuel_remaining, FUEL_PER_COAL - 1);
    }

    #[test]
    fn furnace_idles_without_fuel_or_input() {
        use crate::items::COPPER;
        let mut f = FurnaceState::default();
        // Input but no fuel -> no progress.
        f.input = ChestSlot { item: COPPER, count: 1 };
        assert!(!furnace_tick(&mut f, FURNACE_SMELT_TIME_S));
        assert_eq!(f.output.count, 0);
        assert_eq!(f.progress, 0.0);
        // Non-smeltable input -> idle.
        let mut g = FurnaceState::default();
        g.input = ChestSlot { item: 9999, count: 5 };
        g.fuel = ChestSlot { item: crate::items::COAL, count: 1 };
        assert!(!furnace_tick(&mut g, FURNACE_SMELT_TIME_S));
        assert_eq!(g.fuel.count, 1); // no fuel wasted with nothing to smelt
    }

    #[test]
    fn chest_mut_promotes_none_to_chest() {
        let mut e = BlockEntity::with_facing(2);
        assert!(e.chest().is_none());
        e.chest_mut()[0] = ChestSlot { item: 5, count: 1 };
        assert_eq!(e.facing, 2);
        assert_eq!(e.chest().unwrap()[0], ChestSlot { item: 5, count: 1 });
    }

    #[test]
    fn distinct_cells_dont_alias_in_key() {
        let mut s = BlockEntityStore::new();
        // (tile=1, depth=0) and (tile=0, depth=WORLD_MAX_DEPTH-1) must not
        // collide - the key is tile*MAX_DEPTH + depth.
        s.set(1, 0, BlockEntity::with_facing(1));
        s.set(0, WORLD_MAX_DEPTH - 1, BlockEntity::with_facing(4));
        assert_eq!(s.facing(1, 0), 1);
        assert_eq!(s.facing(0, WORLD_MAX_DEPTH - 1), 4);
        assert_eq!(s.len(), 2);
    }

    #[test]
    fn iter_yields_decoded_coords() {
        let mut s = BlockEntityStore::new();
        s.set(7, 2, BlockEntity::with_facing(3));
        let v: Vec<_> = s.iter().collect();
        assert_eq!(v, vec![(7, 2, BlockEntity::with_facing(3))]);
    }
}
