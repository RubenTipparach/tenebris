//! Survival item bag (client).
//!
//! The hotbar (`inventory.rs`) stays the placeable quick-slots; the bag
//! is the general store where crafted resources, tools, and the eventual
//! tech-tree items live - the inventory grid every game has, sized to
//! outgrow the 9-slot hotbar.
//!
//! Crafting reads inputs from the hotbar + bag combined (a "log" is a
//! `Block::Wood` sitting in the hotbar) and deposits outputs into the
//! bag. Hotbar slots are generalised item slots now (tools equip by
//! being SELECTED there), so both stores are keyed by core item ids.
//! The authoritative recipe semantics live in `core::crafting`; this
//! module only adapts the client's split storage to them.

#![allow(dead_code)] // UI + drop wiring land in the next wave

use crate::inventory::Inventory;
use tenebris_core::blocks::Block;
use tenebris_core::crafting::{self, Recipe};
use tenebris_core::items::{self, ItemId, ItemStack};

/// Bag capacity: 3 rows of 9, matching the hotbar's 9 columns so the
/// inventory screen reads as one aligned grid. A fixed array keeps
/// `Bag` (and thus `PlayerCtrl`) `Copy`. Growing this is save- and
/// wire-compatible: `parse` fills what the blob has, and the BagState
/// message carries an explicit slot count both ends tolerate.
pub const BAG_SLOTS: usize = 27;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Bag {
    pub slots: [ItemStack; BAG_SLOTS],
}

impl Bag {
    /// Serialise for the per-world SP save: "item,count;item,count;..."
    /// (one pair per slot, fixed order). Same shape the MP server's bag
    /// blob uses, minus the hunger prefix (SP stores hunger alongside).
    pub fn serialize(&self) -> String {
        self.slots
            .iter()
            .map(|s| format!("{},{}", s.item, s.count))
            .collect::<Vec<_>>()
            .join(";")
    }

    /// Parse [`serialize`]'s output; `None` on malformed input.
    pub fn parse(blob: &str) -> Option<Bag> {
        let mut bag = Bag::default();
        for (i, pair) in blob.split(';').enumerate().take(BAG_SLOTS) {
            let (a, b) = pair.split_once(',')?;
            bag.slots[i] = ItemStack {
                item: a.trim().parse().ok()?,
                count: b.trim().parse().ok()?,
            };
        }
        Some(bag)
    }
}

impl Default for Bag {
    fn default() -> Self {
        Bag { slots: [ItemStack::default(); BAG_SLOTS] }
    }
}

impl Bag {
    /// Total count of `item` held.
    pub fn count_of(&self, item: ItemId) -> u32 {
        self.slots
            .iter()
            .filter(|s| s.item == item && s.count > 0)
            .map(|s| s.count as u32)
            .sum()
    }

    /// Deposit `n` of `item`, topping up existing stacks then filling
    /// empty slots. Returns the remainder that didn't fit.
    pub fn add(&mut self, item: ItemId, mut n: u16) -> u16 {
        let cap = items::stack_size(item);
        for s in self.slots.iter_mut() {
            if n == 0 {
                break;
            }
            if s.item == item && s.count > 0 && s.count < cap {
                let used = (cap - s.count).min(n);
                s.count += used;
                n -= used;
            }
        }
        for s in self.slots.iter_mut() {
            if n == 0 {
                break;
            }
            if s.count == 0 {
                let used = cap.min(n);
                s.item = item;
                s.count = used;
                n -= used;
            }
        }
        n
    }

    /// True if `n` of `item` would fully fit (without mutating).
    pub fn room_for(&self, item: ItemId, n: u16) -> bool {
        let cap = items::stack_size(item);
        let mut need = n as u32;
        for s in &self.slots {
            if need == 0 {
                break;
            }
            if s.count == 0 {
                need = need.saturating_sub(cap as u32);
            } else if s.item == item && s.count < cap {
                need = need.saturating_sub((cap - s.count) as u32);
            }
        }
        need == 0
    }

    /// Remove up to `n` of `item`, draining front-to-back. Returns the
    /// shortfall that couldn't be removed.
    pub fn take(&mut self, item: ItemId, mut n: u32) -> u32 {
        for s in self.slots.iter_mut() {
            if n == 0 {
                break;
            }
            if s.item == item && s.count > 0 {
                let used = n.min(s.count as u32) as u16;
                s.count -= used;
                n -= used as u32;
                if s.count == 0 {
                    s.item = 0; /* Air */
                }
            }
        }
        n
    }
}

/// Count of `item` held across the hotbar (blocks AND tools - hotbar
/// slots are generalised item slots now).
fn hotbar_count(inv: &Inventory, item: ItemId) -> u32 {
    inv.slots
        .iter()
        .filter(|s| s.item == item && s.count > 0)
        .map(|s| s.count.max(0) as u32)
        .sum()
}

/// Remove up to `n` of `item` from the hotbar. Returns the shortfall.
fn hotbar_take(inv: &mut Inventory, item: ItemId, mut n: u32) -> u32 {
    for s in inv.slots.iter_mut() {
        if n == 0 {
            break;
        }
        if s.item == item && s.count > 0 {
            let used = n.min(s.count.max(0) as u32) as i32;
            s.count -= used;
            n -= used as u32;
            if s.count == 0 {
                s.item = Block::Air as u16;
            }
        }
    }
    n
}

/// Available count of `item` across hotbar + bag.
pub fn available(inv: &Inventory, bag: &Bag, item: ItemId) -> u32 {
    hotbar_count(inv, item) + bag.count_of(item)
}

/// True if every input is on hand and the output fits the bag.
pub fn can_craft(inv: &Inventory, bag: &Bag, r: &Recipe) -> bool {
    r.inputs.iter().all(|ing| available(inv, bag, ing.item) >= ing.count as u32)
        && bag.room_for(r.output.item, r.output.count)
}

/// Craft one batch of `r`. Atomic: returns false and mutates nothing if
/// the inputs aren't on hand or the output won't fit. Inputs drain from
/// the bag first, then the hotbar; the output lands in the bag.
pub fn try_craft(inv: &mut Inventory, bag: &mut Bag, r: &Recipe) -> bool {
    if !can_craft(inv, bag, r) {
        return false;
    }
    for ing in &r.inputs {
        let from_bag = bag.take(ing.item, ing.count as u32);
        if from_bag > 0 {
            let rem = hotbar_take(inv, ing.item, from_bag);
            debug_assert_eq!(rem, 0, "can_craft lied about availability");
        }
    }
    let leftover = bag.add(r.output.item, r.output.count);
    debug_assert_eq!(leftover, 0, "can_craft lied about room");
    true
}

/// Consume a recipe's inputs WITHOUT producing the output - the start of
/// a timed craft (the output is deposited later, when the timer finishes,
/// via [`Bag::add`]). Atomic: returns false and mutates nothing if the
/// inputs aren't all on hand. Drains the bag first, then the hotbar.
pub fn consume_inputs(inv: &mut Inventory, bag: &mut Bag, r: &Recipe) -> bool {
    /* Only require the inputs (not output room) - the output lands when
     * the craft completes, and the bag can free up meanwhile. */
    let have = r.inputs.iter().all(|ing| available(inv, bag, ing.item) >= ing.count as u32);
    if !have {
        return false;
    }
    for ing in &r.inputs {
        let from_bag = bag.take(ing.item, ing.count as u32);
        if from_bag > 0 {
            let rem = hotbar_take(inv, ing.item, from_bag);
            debug_assert_eq!(rem, 0, "availability check lied");
        }
    }
    true
}

/// Craft the nth installed recipe (see `core::crafting`). Returns false
/// if the index is out of range or the craft can't proceed.
pub fn try_craft_nth(inv: &mut Inventory, bag: &mut Bag, idx: usize) -> bool {
    match crafting::recipe_nth(idx) {
        Some(r) => try_craft(inv, bag, &r),
        None => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::inventory;
    use tenebris_core::crafting::parse_recipes;
    use tenebris_core::items::{PLANK, STICK, WOOD_PICKAXE};

    const SRC: &str = "\
[planks]
out: plank 4
in: log 1
[sticks]
out: stick 4
in: plank 2
[wood-pickaxe]
out: wood-pickaxe 1
in: plank 3
in: stick 2
";

    fn recipe(name: &str) -> Recipe {
        parse_recipes(SRC, "t").into_iter().find(|r| r.name == name).unwrap()
    }

    fn wood_id() -> ItemId {
        items::from_block(Block::Wood)
    }

    #[test]
    fn bag_add_take_count_room() {
        let mut bag = Bag::default();
        assert_eq!(bag.add(PLANK, 10), 0);
        assert_eq!(bag.count_of(PLANK), 10);
        // stacks beyond cap spill into a second slot
        assert_eq!(bag.add(PLANK, 60), 0);
        assert_eq!(bag.count_of(PLANK), 70);
        // take drains and reports shortfall
        assert_eq!(bag.take(PLANK, 65), 0);
        assert_eq!(bag.count_of(PLANK), 5);
        assert_eq!(bag.take(PLANK, 10), 5); // only 5 left
        assert_eq!(bag.count_of(PLANK), 0);
        assert!(bag.room_for(STICK, 64));
    }

    #[test]
    fn craft_pulls_logs_from_hotbar_into_bag() {
        let mut inv = Inventory::default();
        inventory::init_empty(&mut inv);
        // 5 logs in a hotbar slot (as Wood blocks, like a tree chop)
        inv.slots[1] = crate::inventory::InvSlot::block(Block::Wood, 5);
        let mut bag = Bag::default();

        assert!(try_craft(&mut inv, &mut bag, &recipe("planks")));
        assert_eq!(inv.slots[1].count, 4, "one log consumed from hotbar");
        assert_eq!(bag.count_of(PLANK), 4, "planks land in the bag");
    }

    #[test]
    fn full_wood_line_planks_sticks_pickaxe() {
        let mut inv = Inventory::default();
        inventory::init_empty(&mut inv);
        inv.slots[1] = crate::inventory::InvSlot::block(Block::Wood, 8);
        let mut bag = Bag::default();

        // 2 logs -> 8 planks
        assert!(try_craft(&mut inv, &mut bag, &recipe("planks")));
        assert!(try_craft(&mut inv, &mut bag, &recipe("planks")));
        assert_eq!(bag.count_of(PLANK), 8);
        // 1 batch sticks: 2 planks -> 4 sticks
        assert!(try_craft(&mut inv, &mut bag, &recipe("sticks")));
        assert_eq!(bag.count_of(PLANK), 6);
        assert_eq!(bag.count_of(STICK), 4);
        // pickaxe: 3 planks + 2 sticks -> 1 tool
        assert!(try_craft(&mut inv, &mut bag, &recipe("wood-pickaxe")));
        assert_eq!(bag.count_of(PLANK), 3);
        assert_eq!(bag.count_of(STICK), 2);
        assert_eq!(bag.count_of(WOOD_PICKAXE), 1);
    }

    #[test]
    fn craft_fails_atomically_when_short() {
        let mut inv = Inventory::default();
        inventory::init_empty(&mut inv);
        let mut bag = Bag::default();
        bag.add(PLANK, 3); // have planks but no sticks
        let inv_before = inv;
        let bag_before = bag;
        assert!(!try_craft(&mut inv, &mut bag, &recipe("wood-pickaxe")));
        assert_eq!(inv, inv_before);
        assert_eq!(bag, bag_before);
    }

    #[test]
    fn available_sums_hotbar_and_bag() {
        let mut inv = Inventory::default();
        inventory::init_empty(&mut inv);
        inv.slots[1] = crate::inventory::InvSlot::block(Block::Wood, 3);
        let mut bag = Bag::default();
        bag.add(wood_id(), 2); // a log can also sit in the bag
        assert_eq!(available(&inv, &bag, wood_id()), 5);
    }
}
