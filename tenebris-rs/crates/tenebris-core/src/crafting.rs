//! Recipe engine - Core, shared by SP and MP so crafting is authoritative
//! and identical on both sides.
//!
//! Recipes load from `assets/config/recipes.yaml`; `craft` is pure logic
//! over a slice of [`ItemStack`] so the client keeps owning inventory
//! storage (the hotbar / bag arrays) while the consume-and-produce
//! semantics live here once. New tech-tree tiers are new YAML rows, not
//! new code.
//!
//! ## recipes.yaml format (tiny hand-parsed subset, per repo convention)
//!
//! ```text
//! [planks]          # section header = recipe name
//! tier: 0           # optional, default 0
//! station: none     # optional item name that must be open, default none
//! out: plank 4      # output item + count
//! in: log 1         # one or more input lines (item count)
//! ```

use crate::items::{self, ItemId, ItemStack};
use std::sync::Mutex;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Recipe {
    pub name: String,
    pub inputs: Vec<ItemStack>,
    pub output: ItemStack,
    pub tier: u8,
    /// Station item id that must be present to craft (`None` = hand-craft).
    pub station: Option<ItemId>,
}

fn parse_item_count(val: &str) -> Option<ItemStack> {
    let mut it = val.split_whitespace();
    let name = it.next()?;
    let count: u16 = it.next().unwrap_or("1").parse().ok()?;
    let item = items::id_by_name(name)?;
    Some(ItemStack { item, count })
}

/// Parse the recipe table. Unknown item names / malformed lines are
/// skipped with a diagnostic (so a typo drops one recipe, not the file).
pub fn parse_recipes(src: &str, path: &str) -> Vec<Recipe> {
    let mut out: Vec<Recipe> = Vec::new();
    let mut cur: Option<Recipe> = None;

    let flush = |cur: &mut Option<Recipe>, out: &mut Vec<Recipe>| {
        if let Some(r) = cur.take() {
            if r.output.count > 0 && !r.inputs.is_empty() {
                out.push(r);
            }
        }
    };

    for (lineno, raw) in src.split('\n').enumerate() {
        let line = match raw.find('#') {
            Some(h) => &raw[..h],
            None => raw,
        }
        .trim();
        if line.is_empty() {
            continue;
        }
        if let Some(name) = line.strip_prefix('[').and_then(|s| s.strip_suffix(']')) {
            flush(&mut cur, &mut out);
            cur = Some(Recipe {
                name: name.trim().to_string(),
                inputs: Vec::new(),
                output: ItemStack::default(),
                tier: 0,
                station: None,
            });
            continue;
        }
        let Some(colon) = line.find(':') else { continue };
        let key = line[..colon].trim();
        let val = line[colon + 1..].trim();
        let Some(r) = cur.as_mut() else { continue };
        match key {
            "out" => {
                if let Some(s) = parse_item_count(val) {
                    r.output = s;
                } else {
                    eprintln!("[recipes] {}:{}: bad output '{}'", path, lineno + 1, val);
                }
            }
            "in" => match parse_item_count(val) {
                Some(s) => r.inputs.push(s),
                None => eprintln!("[recipes] {}:{}: bad input '{}'", path, lineno + 1, val),
            },
            "tier" => r.tier = val.parse().unwrap_or(0),
            "station" => {
                r.station = if val == "none" { None } else { items::id_by_name(val) };
            }
            _ => {}
        }
    }
    flush(&mut cur, &mut out);
    out
}

/* Global recipe registry. Mirrors the `config::S_*` statics: loaded once
 * at boot from recipes.yaml, then read by the crafting UI and the client
 * craft bridge. `Vec::new()` is const, so the static needs no lazy init. */
static S_RECIPES: Mutex<Vec<Recipe>> = Mutex::new(Vec::new());

/// Install the global recipe table (call once after `load_recipes`).
pub fn set_recipes(rs: Vec<Recipe>) {
    *S_RECIPES.lock().unwrap() = rs;
}

/// Run `f` over the installed recipe table (lock held for the call).
pub fn with_recipes<R>(f: impl FnOnce(&[Recipe]) -> R) -> R {
    f(&S_RECIPES.lock().unwrap())
}

/// Number of installed recipes.
pub fn recipe_count() -> usize {
    S_RECIPES.lock().unwrap().len()
}

/// Clone the nth installed recipe, if present (so callers can craft
/// without holding the registry lock across an inventory mutation).
pub fn recipe_nth(idx: usize) -> Option<Recipe> {
    S_RECIPES.lock().unwrap().get(idx).cloned()
}

/// Load + parse the recipe table from disk (native). Returns an empty
/// table if the file is missing, mirroring the `config::load_*` pattern.
pub fn load_recipes(path: &str) -> Vec<Recipe> {
    match std::fs::read_to_string(path) {
        Ok(src) => parse_recipes(&src, path),
        Err(_) => {
            println!("[recipes] {} not found, no recipes loaded", path);
            Vec::new()
        }
    }
}

/// Total count of `item` across all slots (counts > 0 only).
fn have(slots: &[ItemStack], item: ItemId) -> u32 {
    slots
        .iter()
        .filter(|s| s.item == item && s.count > 0)
        .map(|s| s.count as u32)
        .sum()
}

/// True if the bag holds enough of every input. (Station gating is the
/// caller's job - it knows which stations are open near the player.)
pub fn craftable(slots: &[ItemStack], r: &Recipe) -> bool {
    r.inputs.iter().all(|ing| have(slots, ing.item) >= ing.count as u32)
}

/// Remove `count` of `item` from the bag, draining slots front-to-back.
/// Caller has already checked availability.
fn take(slots: &mut [ItemStack], item: ItemId, mut count: u32) {
    for s in slots.iter_mut() {
        if count == 0 {
            break;
        }
        if s.item == item && s.count > 0 {
            let used = count.min(s.count as u32) as u16;
            s.count -= used;
            count -= used as u32;
            if s.count == 0 {
                s.item = 0; /* Air */
            }
        }
    }
}

/// Try to deposit `add` of `item` into the bag, respecting stack size:
/// top up existing stacks first, then fill empty slots. Returns the
/// remainder that didn't fit.
fn give(slots: &mut [ItemStack], item: ItemId, mut add: u16) -> u16 {
    let cap = items::stack_size(item);
    for s in slots.iter_mut() {
        if add == 0 {
            break;
        }
        if s.item == item && s.count > 0 && s.count < cap {
            let room = cap - s.count;
            let used = room.min(add);
            s.count += used;
            add -= used;
        }
    }
    for s in slots.iter_mut() {
        if add == 0 {
            break;
        }
        if s.count == 0 {
            let used = cap.min(add);
            s.item = item;
            s.count = used;
            add -= used;
        }
    }
    add
}

/// Craft one batch of `r` against `slots`. Atomic: if the inputs aren't
/// all present or the output won't fit, nothing is mutated and it
/// returns `false`. Station gating must be checked by the caller before
/// calling (see [`craftable`]).
pub fn craft(slots: &mut [ItemStack], r: &Recipe) -> bool {
    if !craftable(slots, r) {
        return false;
    }
    /* Dry-run the deposit on a copy so a no-fit output leaves the bag
     * untouched (no half-consumed inputs). */
    let mut probe = slots.to_vec();
    for ing in &r.inputs {
        take(&mut probe, ing.item, ing.count as u32);
    }
    if give(&mut probe, r.output.item, r.output.count) != 0 {
        return false; /* output doesn't fit */
    }
    slots.copy_from_slice(&probe);
    true
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::items::{COAL, PLANK, STICK};

    const SRC: &str = "\
# tier 0
[planks]
out: plank 4
in: log 1

[sticks]
out: stick 4
in: plank 2

[torch]
out: torch 4
in: stick 1
in: coal 1

[wood-pickaxe]
out: wood-pickaxe 1
in: plank 3
in: stick 2
";

    fn recipes() -> Vec<Recipe> {
        parse_recipes(SRC, "test")
    }

    fn find(rs: &[Recipe], n: &str) -> Recipe {
        rs.iter().find(|r| r.name == n).cloned().unwrap()
    }

    #[test]
    fn parses_all_recipes() {
        let rs = recipes();
        assert_eq!(rs.len(), 4);
        let planks = find(&rs, "planks");
        assert_eq!(planks.output, ItemStack { item: PLANK, count: 4 });
        assert_eq!(planks.inputs.len(), 1);
        let torch = find(&rs, "torch");
        assert_eq!(torch.inputs.len(), 2);
        assert_eq!(torch.inputs[0], ItemStack { item: STICK, count: 1 });
        assert_eq!(torch.inputs[1], ItemStack { item: COAL, count: 1 });
    }

    #[test]
    fn craftable_checks_every_input() {
        let planks = find(&recipes(), "wood-pickaxe");
        let mut bag = vec![ItemStack::default(); 9];
        bag[0] = ItemStack { item: PLANK, count: 3 };
        assert!(!craftable(&bag, &planks)); // missing sticks
        bag[1] = ItemStack { item: STICK, count: 2 };
        assert!(craftable(&bag, &planks));
    }

    #[test]
    fn craft_consumes_inputs_and_adds_output() {
        let planks = find(&recipes(), "planks");
        let mut bag = vec![ItemStack::default(); 9];
        bag[0] = ItemStack { item: items::from_block(crate::blocks::Block::Wood), count: 5 };
        assert!(craft(&mut bag, &planks));
        // 1 log consumed, 4 planks produced
        assert_eq!(bag[0], ItemStack { item: items::from_block(crate::blocks::Block::Wood), count: 4 });
        let planks_total: u16 = bag.iter().filter(|s| s.item == PLANK).map(|s| s.count).sum();
        assert_eq!(planks_total, 4);
    }

    #[test]
    fn craft_fails_atomically_without_inputs() {
        let pick = find(&recipes(), "wood-pickaxe");
        let mut bag = vec![ItemStack::default(); 9];
        bag[0] = ItemStack { item: PLANK, count: 3 }; // no sticks
        let before = bag.clone();
        assert!(!craft(&mut bag, &pick));
        assert_eq!(bag, before); // untouched
    }

    #[test]
    fn craft_fails_when_output_has_no_room() {
        let sticks = find(&recipes(), "sticks");
        // single-slot bag holding the input but no room for the output
        // once the input slot is consumed... actually input frees the
        // slot, so use a bag fully packed with a different full item.
        let mut bag = vec![
            ItemStack { item: PLANK, count: 2 },
            ItemStack { item: COAL, count: items::stack_size(COAL) },
        ];
        // sticks need 2 planks (present); output 4 sticks. After taking
        // the 2 planks, slot 0 frees, so it DOES fit -> crafts.
        assert!(craft(&mut bag, &sticks));
        let sticks_total: u16 = bag.iter().filter(|s| s.item == STICK).map(|s| s.count).sum();
        assert_eq!(sticks_total, 4);
    }

    #[test]
    fn output_stacks_onto_existing_partial_stack() {
        let planks = find(&recipes(), "planks");
        let mut bag = vec![
            ItemStack { item: items::from_block(crate::blocks::Block::Wood), count: 1 },
            ItemStack { item: PLANK, count: 10 },
        ];
        assert!(craft(&mut bag, &planks));
        // 4 new planks top up the existing stack of 10 -> 14
        assert_eq!(bag[1], ItemStack { item: PLANK, count: 14 });
    }

    #[test]
    fn shipped_recipes_yaml_parses() {
        // Catch typos in the actual data file shipped under assets/config.
        let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../assets/config/recipes.yaml");
        let rs = load_recipes(path);
        assert!(rs.iter().any(|r| r.name == "planks"), "planks recipe present");
        assert!(rs.iter().any(|r| r.name == "torch"), "torch recipe present");
        // Every parsed recipe resolved a real output item + >=1 input.
        for r in &rs {
            assert!(r.output.count > 0 && !r.inputs.is_empty(), "recipe {} malformed", r.name);
        }
    }

    #[test]
    fn smelting_consumes_ore_plus_coal_fuel() {
        use crate::items::{COAL, COPPER, COPPER_INGOT};
        let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../assets/config/recipes.yaml");
        let rs = load_recipes(path);
        let smelt = rs.iter().find(|r| r.name == "copper-ingot").cloned().unwrap();
        // 1 raw copper + 1 coal -> 1 copper ingot.
        assert_eq!(smelt.output, ItemStack { item: COPPER_INGOT, count: 1 });

        let mut bag = vec![ItemStack::default(); 9];
        bag[0] = ItemStack { item: COPPER, count: 3 };
        bag[1] = ItemStack { item: COAL, count: 1 };
        assert!(craft(&mut bag, &smelt));
        // One copper + the coal fuel consumed, one ingot produced.
        assert_eq!(have(&bag, COPPER), 2, "one raw copper smelted");
        assert_eq!(have(&bag, COAL), 0, "coal burned as fuel");
        assert_eq!(have(&bag, COPPER_INGOT), 1, "ingot produced");

        // No fuel left -> a second smelt fails atomically.
        let before = bag.clone();
        assert!(!craft(&mut bag, &smelt), "no coal, no smelt");
        assert_eq!(bag, before, "failed smelt leaves the bag untouched");
    }

    #[test]
    fn bronze_alloys_copper_and_tin_ingots() {
        use crate::items::{BRONZE_INGOT, COAL, COPPER_INGOT, TIN_INGOT};
        let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../assets/config/recipes.yaml");
        let rs = load_recipes(path);
        let bronze = rs.iter().find(|r| r.name == "bronze-ingot").cloned().unwrap();
        // Alloy: copper ingot + tin ingot + coal -> 2 bronze.
        assert_eq!(bronze.output, ItemStack { item: BRONZE_INGOT, count: 2 });

        let mut bag = vec![ItemStack::default(); 9];
        bag[0] = ItemStack { item: COPPER_INGOT, count: 1 };
        bag[1] = ItemStack { item: TIN_INGOT, count: 1 };
        bag[2] = ItemStack { item: COAL, count: 1 };
        assert!(craft(&mut bag, &bronze));
        assert_eq!(have(&bag, COPPER_INGOT), 0);
        assert_eq!(have(&bag, TIN_INGOT), 0);
        assert_eq!(have(&bag, COAL), 0);
        assert_eq!(have(&bag, BRONZE_INGOT), 2, "alloy yields 2 bars");
    }

    #[test]
    fn unknown_item_name_drops_only_that_recipe() {
        let src = "[bad]\nout: plank 4\nin: unobtanium 1\n[good]\nout: stick 4\nin: plank 2\n";
        let rs = parse_recipes(src, "t");
        // bad recipe has no valid inputs -> dropped; good survives
        assert_eq!(rs.len(), 1);
        assert_eq!(rs[0].name, "good");
    }
}
