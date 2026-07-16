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

#[derive(Clone, Debug, PartialEq)]
pub struct Recipe {
    pub name: String,
    pub inputs: Vec<ItemStack>,
    pub output: ItemStack,
    pub tier: u8,
    /// Station item id that must be present to craft (`None` = hand-craft).
    pub station: Option<ItemId>,
    /// Seconds this craft takes (crafting isn't instant). Set from the
    /// `time:` recipe key; when omitted it defaults to [`default_time`] of
    /// the tier, so higher-tier items take longer to build.
    pub time_s: f32,
}

/// Default craft duration (seconds) for a recipe of `tier` with no
/// explicit `time:` - scales up the tree so tier-3 gear is a real
/// investment. Tier 0 = 1.5 s, +1 s per tier.
pub fn default_time(tier: u8) -> f32 {
    1.5 + tier as f32
}

fn parse_item_count(val: &str) -> Option<ItemStack> {
    let mut it = val.split_whitespace();
    let name = it.next()?;
    let count: u16 = it.next().unwrap_or("1").parse().ok()?;
    let item = items::id_by_name(name)?;
    /* A crafted tool comes off the bench fresh (dur 0 = full budget). */
    Some(ItemStack::new(item, count))
}

/// Parse the recipe table. Unknown item names / malformed lines are
/// skipped with a diagnostic (so a typo drops one recipe, not the file).
pub fn parse_recipes(src: &str, path: &str) -> Vec<Recipe> {
    let mut out: Vec<Recipe> = Vec::new();
    let mut cur: Option<Recipe> = None;

    let flush = |cur: &mut Option<Recipe>, out: &mut Vec<Recipe>| {
        if let Some(mut r) = cur.take() {
            if r.time_s <= 0.0 {
                r.time_s = default_time(r.tier);
            }
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
                /* 0.0 = "use the tier default"; resolved at flush. */
                time_s: 0.0,
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
            "time" => r.time_s = val.parse().unwrap_or(0.0),
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

/// Clone every installed recipe whose `station` matches `station`. The
/// hand bench passes `None`; a placed station (furnace, printer, ...)
/// passes its block/item id, so each surface only offers its own recipes.
pub fn recipes_for_station(station: Option<ItemId>) -> Vec<Recipe> {
    S_RECIPES
        .lock()
        .unwrap()
        .iter()
        .filter(|r| r.station == station)
        .cloned()
        .collect()
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

[flint-pickaxe]
out: flint-pickaxe 1
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
        assert_eq!(planks.output, ItemStack::new(PLANK, 4));
        assert_eq!(planks.inputs.len(), 1);
        let torch = find(&rs, "torch");
        assert_eq!(torch.inputs.len(), 2);
        assert_eq!(torch.inputs[0], ItemStack::new(STICK, 1));
        assert_eq!(torch.inputs[1], ItemStack::new(COAL, 1));
    }

    #[test]
    fn craftable_checks_every_input() {
        let planks = find(&recipes(), "flint-pickaxe");
        let mut bag = vec![ItemStack::default(); 9];
        bag[0] = ItemStack::new(PLANK, 3);
        assert!(!craftable(&bag, &planks)); // missing sticks
        bag[1] = ItemStack::new(STICK, 2);
        assert!(craftable(&bag, &planks));
    }

    #[test]
    fn craft_consumes_inputs_and_adds_output() {
        let planks = find(&recipes(), "planks");
        let mut bag = vec![ItemStack::default(); 9];
        bag[0] = ItemStack::new(items::from_block(crate::blocks::Block::Wood), 5);
        assert!(craft(&mut bag, &planks));
        // 1 log consumed, 4 planks produced
        assert_eq!(bag[0], ItemStack::new(items::from_block(crate::blocks::Block::Wood), 4));
        let planks_total: u16 = bag.iter().filter(|s| s.item == PLANK).map(|s| s.count).sum();
        assert_eq!(planks_total, 4);
    }

    #[test]
    fn craft_fails_atomically_without_inputs() {
        let pick = find(&recipes(), "flint-pickaxe");
        let mut bag = vec![ItemStack::default(); 9];
        bag[0] = ItemStack::new(PLANK, 3); // no sticks
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
            ItemStack::new(PLANK, 2),
            ItemStack::new(COAL, items::stack_size(COAL)),
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
            ItemStack::new(items::from_block(crate::blocks::Block::Wood), 1),
            ItemStack::new(PLANK, 10),
        ];
        assert!(craft(&mut bag, &planks));
        // 4 new planks top up the existing stack of 10 -> 14
        assert_eq!(bag[1], ItemStack::new(PLANK, 14));
    }

    #[test]
    fn shipped_recipes_yaml_parses() {
        // Catch typos in the actual data file shipped under assets/config.
        let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../assets/config/recipes.yaml");
        let rs = load_recipes(path);
        assert!(rs.iter().any(|r| r.name == "planks"), "planks recipe present");
        /* The bonfire is the campsite light + cook station; torches came
         * BACK as the portable light (stick + coal - you can't carry a
         * bonfire down a mineshaft). */
        assert!(rs.iter().any(|r| r.name == "bonfire"), "bonfire recipe present");
        let torches = rs.iter().find(|r| r.name == "torches").expect("torches recipe present");
        assert_eq!(torches.output.count, 4, "one craft lights four torches");
        assert!(
            torches.inputs.iter().any(|i| i.item == COAL),
            "torches take coal (stick + coal)"
        );
        // Every parsed recipe resolved a real output item + >=1 input.
        for r in &rs {
            assert!(r.output.count > 0 && !r.inputs.is_empty(), "recipe {} malformed", r.name);
        }
    }

    #[test]
    fn smelting_recipes_gate_on_the_furnace_station() {
        use crate::blocks::Block;
        let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../assets/config/recipes.yaml");
        let rs = parse_recipes(&std::fs::read_to_string(path).unwrap(), path);
        let furnace = items::from_block(Block::Furnace);

        // The ore-smelt recipes gate on the furnace station (these back the
        // legacy craft() smelt path; the placed furnace also smelts them
        // over time via the machine tick).
        for name in ["copper-ingot", "tin-ingot", "iron-ingot"] {
            let r = rs.iter().find(|r| r.name == name).unwrap();
            assert_eq!(r.station, Some(furnace), "{name} gated on furnace");
        }
        // The furnace block, the tier-0 staples, and bronze (an alloy, not
        // a smelt) hand-craft at the bench (None).
        for name in ["furnace", "planks", "flint-pickaxe", "bronze-ingot"] {
            let r = rs.iter().find(|r| r.name == name).unwrap();
            assert_eq!(r.station, None, "{name} is a hand-bench recipe");
        }
        // recipes_for_station partitions them cleanly via the registry.
        set_recipes(rs);
        let bench = recipes_for_station(None);
        let smelt = recipes_for_station(Some(furnace));
        assert!(bench.iter().any(|r| r.name == "furnace"));
        assert!(!bench.iter().any(|r| r.name == "copper-ingot"));
        assert!(smelt.iter().all(|r| r.station == Some(furnace)));
        assert!(smelt.iter().any(|r| r.name == "iron-ingot"));
    }

    #[test]
    fn smelting_consumes_ore_plus_coal_fuel() {
        use crate::items::{COAL, COPPER, COPPER_INGOT};
        let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../assets/config/recipes.yaml");
        let rs = load_recipes(path);
        let smelt = rs.iter().find(|r| r.name == "copper-ingot").cloned().unwrap();
        // 1 raw copper + 1 coal -> 1 copper ingot.
        assert_eq!(smelt.output, ItemStack::new(COPPER_INGOT, 1));

        let mut bag = vec![ItemStack::default(); 9];
        bag[0] = ItemStack::new(COPPER, 3);
        bag[1] = ItemStack::new(COAL, 1);
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
        use crate::items::{BRONZE_INGOT, COPPER_INGOT, TIN_INGOT};
        let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../assets/config/recipes.yaml");
        let rs = load_recipes(path);
        let bronze = rs.iter().find(|r| r.name == "bronze-ingot").cloned().unwrap();
        // Alloy (hand-crafted): copper ingot + tin ingot -> 2 bronze.
        assert_eq!(bronze.output, ItemStack::new(BRONZE_INGOT, 2));

        let mut bag = vec![ItemStack::default(); 9];
        bag[0] = ItemStack::new(COPPER_INGOT, 1);
        bag[1] = ItemStack::new(TIN_INGOT, 1);
        assert!(craft(&mut bag, &bronze));
        assert_eq!(have(&bag, COPPER_INGOT), 0);
        assert_eq!(have(&bag, TIN_INGOT), 0);
        assert_eq!(have(&bag, BRONZE_INGOT), 2, "alloy yields 2 bars");
    }

    #[test]
    fn rocket_parts_craft_from_ingots() {
        use crate::items::{
            COMMAND_MODULE, COPPER_INGOT, FUEL_TANK, IRON_INGOT, ROCKET_ENGINE,
        };
        let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../assets/config/recipes.yaml");
        let rs = load_recipes(path);

        // Fuel tank: 5 iron ingots -> 1 tank.
        let tank = rs.iter().find(|r| r.name == "fuel-tank").cloned().unwrap();
        assert_eq!(tank.output, ItemStack::new(FUEL_TANK, 1));
        let mut bag = vec![ItemStack::default(); 9];
        bag[0] = ItemStack::new(IRON_INGOT, 5);
        assert!(craft(&mut bag, &tank));
        assert_eq!(have(&bag, FUEL_TANK), 1);
        assert_eq!(have(&bag, IRON_INGOT), 0);

        // Engine + command module exist with the right outputs.
        assert!(rs.iter().any(|r| r.name == "rocket-engine" && r.output.item == ROCKET_ENGINE));
        let cmd = rs.iter().find(|r| r.name == "command-module").cloned().unwrap();
        assert_eq!(cmd.output, ItemStack::new(COMMAND_MODULE, 1));
        assert!(cmd.inputs.iter().any(|i| i.item == COPPER_INGOT));
    }

    #[test]
    fn electronics_chain_crafts_and_gates_the_capsule() {
        use crate::items::{CIRCUIT_BOARD, COPPER_INGOT, IRON_INGOT, WIRE};
        let path = concat!(env!("CARGO_MANIFEST_DIR"), "/../../assets/config/recipes.yaml");
        let rs = load_recipes(path);

        // copper ingot -> 2 wire
        let wire = rs.iter().find(|r| r.name == "wire").cloned().unwrap();
        let mut bag = vec![ItemStack::default(); 9];
        bag[0] = ItemStack::new(COPPER_INGOT, 1);
        assert!(craft(&mut bag, &wire));
        assert_eq!(have(&bag, WIRE), 2);

        // 2 wire + 1 iron -> 1 circuit board
        let board = rs.iter().find(|r| r.name == "circuit-board").cloned().unwrap();
        let mut bag = vec![ItemStack::default(); 9];
        bag[0] = ItemStack::new(WIRE, 2);
        bag[1] = ItemStack::new(IRON_INGOT, 1);
        assert!(craft(&mut bag, &board));
        assert_eq!(have(&bag, CIRCUIT_BOARD), 1);

        // the command module now requires a circuit board
        let cmd = rs.iter().find(|r| r.name == "command-module").cloned().unwrap();
        assert!(
            cmd.inputs.iter().any(|i| i.item == CIRCUIT_BOARD),
            "capsule should require electronics"
        );
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
