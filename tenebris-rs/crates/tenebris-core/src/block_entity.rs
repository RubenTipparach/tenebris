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

/// Placed-state for one cell. `Copy` + small: the store holds these by
/// value. New machine-state fields append here (kept zero-cost for the
/// common tech block that only needs facing).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct BlockEntity {
    /// Tile edge index (0..`num_neighbors`) the block's front faces, or
    /// [`FACING_UNSET`]. Tech-block cubes orient their front to this so a
    /// placed machine faces the player.
    pub facing: u8,
}

impl Default for BlockEntity {
    fn default() -> Self {
        Self { facing: FACING_UNSET }
    }
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

    pub fn set(&mut self, tile: i32, depth: i32, e: BlockEntity) {
        self.map.insert(Self::key(tile, depth), e);
    }

    pub fn remove(&mut self, tile: i32, depth: i32) {
        self.map.remove(&Self::key(tile, depth));
    }

    /// Facing for a cell, or [`FACING_UNSET`] if it has no entity.
    pub fn facing(&self, tile: i32, depth: i32) -> u8 {
        self.get(tile, depth).map(|e| e.facing).unwrap_or(FACING_UNSET)
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

        s.set(5, 3, BlockEntity { facing: 2 });
        assert_eq!(s.len(), 1);
        assert_eq!(s.facing(5, 3), 2);
        assert_eq!(s.get(5, 3), Some(BlockEntity { facing: 2 }));
        // A different cell is independent.
        assert_eq!(s.facing(5, 4), FACING_UNSET);

        s.remove(5, 3);
        assert!(s.is_empty());
        assert_eq!(s.facing(5, 3), FACING_UNSET);
    }

    #[test]
    fn distinct_cells_dont_alias_in_key() {
        let mut s = BlockEntityStore::new();
        // (tile=1, depth=0) and (tile=0, depth=WORLD_MAX_DEPTH-1) must not
        // collide - the key is tile*MAX_DEPTH + depth.
        s.set(1, 0, BlockEntity { facing: 1 });
        s.set(0, WORLD_MAX_DEPTH - 1, BlockEntity { facing: 4 });
        assert_eq!(s.facing(1, 0), 1);
        assert_eq!(s.facing(0, WORLD_MAX_DEPTH - 1), 4);
        assert_eq!(s.len(), 2);
    }

    #[test]
    fn iter_yields_decoded_coords() {
        let mut s = BlockEntityStore::new();
        s.set(7, 2, BlockEntity { facing: 3 });
        let v: Vec<_> = s.iter().collect();
        assert_eq!(v, vec![(7, 2, BlockEntity { facing: 3 })]);
    }
}
