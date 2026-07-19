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
/// Starter (tier-1) pickaxe. Knapped from flint + a stick - the id is
/// legacy (`WOOD_PICKAXE`) and stays fixed so old saves/bags keep loading,
/// but the tool is now flint-based (name "flint-pickaxe", flint recipe).
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
pub const ROCKET_ENGINE: ItemId = ITEM_BASE + 12; // 112 (atmospheric engine)
pub const FUEL_TANK: ItemId = ITEM_BASE + 13; // 113
pub const COMMAND_MODULE: ItemId = ITEM_BASE + 14; // 114
/// Vacuum engine: lower thrust than the atmospheric engine but burns fuel far
/// more efficiently - the upper-stage engine you stage to for the orbit burn.
pub const VACUUM_ENGINE: ItemId = ITEM_BASE + 49; // 149
/* Electronics: the control gear the command module needs. A simplified
 * nod to the JS command-module recipe (RAM / CPU / motherboard / power
 * supply), one component chain for now. */
pub const WIRE: ItemId = ITEM_BASE + 15; // 115
pub const CIRCUIT_BOARD: ItemId = ITEM_BASE + 16; // 116

/* Electronics components crafted at the workbench / printer (JS
 * src/planet/ElectronicsWorkbench.ts + Printer3D.ts). Ingredients for
 * the computer, 3D printer, and command module. */
pub const CPU_CHIP: ItemId = ITEM_BASE + 17; // 117
pub const RAM_MODULE: ItemId = ITEM_BASE + 18; // 118
pub const MOTHERBOARD: ItemId = ITEM_BASE + 19; // 119
pub const POWER_SUPPLY: ItemId = ITEM_BASE + 20; // 120
pub const PRINT_NOZZLE: ItemId = ITEM_BASE + 21; // 121

/// Wood shovel - the third starter tool (pickaxe / axe / shovel). Speeds
/// digging soft ground (dirt / sand / grass / snow). See core::mining.
pub const WOOD_SHOVEL: ItemId = ITEM_BASE + 22; // 122

/// Raw meat - dropped by hunting animals (core::fauna). Cook it (later
/// tier) into `COOKED_MEAT` to restore more hunger.
pub const RAW_MEAT: ItemId = ITEM_BASE + 23; // 123
pub const COOKED_MEAT: ItemId = ITEM_BASE + 24; // 124

/// Seeds - plant on the ground to grow a crop (see core::farming +
/// client::crops). Dropped when breaking grass; a harvested crop also
/// returns seeds, so farming is self-sustaining once you have one.
pub const SEEDS: ItemId = ITEM_BASE + 25; // 125
/// Berries - a mature crop's edible produce. Eaten (R) to restore hunger.
pub const BERRIES: ItemId = ITEM_BASE + 26; // 126

/// Higher pickaxe tiers. Same access gate as the wood pickaxe (they can
/// mine all rock/ore) but mine faster - see core::mining break times.
pub const STONE_PICKAXE: ItemId = ITEM_BASE + 27; // 127
pub const IRON_PICKAXE: ItemId = ITEM_BASE + 28; // 128
/// Hoe - tills dirt / grass into farmland so seeds can be planted (see
/// client::crops). Not a mining tool; it gates the farming loop.
pub const HOE: ItemId = ITEM_BASE + 29; // 129

/* Farming kinds beyond berries (core::farming::CropKind). Wheat is the
 * slow crop that bakes into bread; the carrot root is food AND its own
 * seed, so it has no separate seed item. */
pub const WHEAT_SEEDS: ItemId = ITEM_BASE + 30; // 130
pub const WHEAT: ItemId = ITEM_BASE + 31; // 131
pub const BREAD: ItemId = ITEM_BASE + 32; // 132
pub const CARROT: ItemId = ITEM_BASE + 33; // 133

/// Fishing rod - casts a bobber onto water; hook a bite and reel it in
/// to land a fish (see client::fishing). Crafted from planks + sticks.
pub const FISHING_ROD: ItemId = ITEM_BASE + 34; // 134
/// Raw fish - the fishing minigame's catch. Eat as-is (R) for a small
/// restore, or cook it into COOKED_FISH for a proper meal.
pub const RAW_FISH: ItemId = ITEM_BASE + 35; // 135
pub const COOKED_FISH: ItemId = ITEM_BASE + 36; // 136

/// Flint - knapped stone chips foraged off rocky ground and dropped when
/// mining stone. The tier-1 tool material (flint pickaxe / axe / shovel /
/// hoe) and the spark that lights a bonfire.
pub const FLINT: ItemId = ITEM_BASE + 37; // 137
/// Charcoal - made by cooking logs down in a bonfire or furnace. A clean
/// fuel (burns like coal) and the successor to the removed wood torch.
pub const CHARCOAL: ItemId = ITEM_BASE + 38; // 138

/* Orchard fruits + their seeds. The fruit is food (eat with R); its seed
 * plants a crop on tilled farmland (see core::farming::CropKind). Wild
 * plants of each grow in fields / jungle - harvest one for the fruit +
 * seeds to start your own orchard. */
pub const APPLE: ItemId = ITEM_BASE + 39; // 139
pub const ORANGE: ItemId = ITEM_BASE + 40; // 140
pub const WATERMELON: ItemId = ITEM_BASE + 41; // 141
pub const KIWI: ItemId = ITEM_BASE + 42; // 142
pub const APPLE_SEEDS: ItemId = ITEM_BASE + 43; // 143
pub const ORANGE_SEEDS: ItemId = ITEM_BASE + 44; // 144
pub const WATERMELON_SEEDS: ItemId = ITEM_BASE + 45; // 145
pub const KIWI_SEEDS: ItemId = ITEM_BASE + 46; // 146

/// Empty bucket - crafted from iron. Use on water to scoop it up
/// (-> WATER_BUCKET); use a water bucket on a crop to water it and speed
/// its growth (or just let it rain). A water bucket also fills an
/// aquarium block (right-click).
pub const BUCKET: ItemId = ITEM_BASE + 47; // 147
pub const WATER_BUCKET: ItemId = ITEM_BASE + 48; // 148

/// Live fish - the catch of fishing / netting, one item per species so
/// each fish carries its OWN sprite. Eat one raw (small restore), cook it
/// into COOKED_FISH, or drop it into a filled aquarium (right-click the
/// tank with the fish equipped) to keep it swimming. Ids append-only past
/// the vacuum engine (149) - never renumber, saved bags key off these.
pub const FISH_MINNOW: ItemId = ITEM_BASE + 50; // 150
pub const FISH_REEF: ItemId = ITEM_BASE + 51; // 151
pub const FISH_EEL: ItemId = ITEM_BASE + 52; // 152
pub const FISH_RAY: ItemId = ITEM_BASE + 53; // 153
pub const FISH_TURTLE: ItemId = ITEM_BASE + 54; // 154
pub const FISH_SERPENT: ItemId = ITEM_BASE + 55; // 155

/// Fishing net - crafted from sticks + plank. Fishing is a random roll;
/// the net lets you pick your prize: swim up to a fish and left-click it
/// to scoop that exact species into the bag.
pub const NET: ItemId = ITEM_BASE + 56; // 156

/// The six live-fish items, ordered to match `fauna::AnimalKind`'s water
/// species. `is_fish_item` gates the raw-eat / aquarium-drop paths.
pub const FISH_ITEMS: [ItemId; 6] =
    [FISH_MINNOW, FISH_REEF, FISH_EEL, FISH_RAY, FISH_TURTLE, FISH_SERPENT];

/// True if `id` is one of the live-fish items (a fishing / net catch).
pub fn is_fish_item(id: ItemId) -> bool {
    FISH_ITEMS.contains(&id)
}

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
    /// Uses left on a tool, where **0 means "fresh / never used"** and
    /// anything else is the remaining budget. Meaningless (and left 0) for
    /// blocks and resources.
    ///
    /// The 0-is-fresh sentinel exists so `Default`-constructed slots and
    /// saves written before durability don't all read as broken tools. A
    /// tool that runs out is destroyed and its slot cleared, so 0 never
    /// means "0 uses left" on a live tool. Interpret it through
    /// `mining::uses_left` / `mining::condition` rather than reading it
    /// raw - only they know the per-material budget.
    pub dur: u16,
}

impl ItemStack {
    /// A fresh (undamaged) stack.
    pub const fn new(item: ItemId, count: u16) -> Self {
        ItemStack { item, count, dur: 0 }
    }
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
    ItemDef { id: WOOD_PICKAXE, name: "flint-pickaxe", kind: ItemKind::Tool, stack: 1 },
    ItemDef { id: WOOD_AXE, name: "flint-axe", kind: ItemKind::Tool, stack: 1 },
    ItemDef { id: WOOD_SHOVEL, name: "flint-shovel", kind: ItemKind::Tool, stack: 1 },
    ItemDef { id: STONE_PICKAXE, name: "stone-pickaxe", kind: ItemKind::Tool, stack: 1 },
    ItemDef { id: IRON_PICKAXE, name: "iron-pickaxe", kind: ItemKind::Tool, stack: 1 },
    ItemDef { id: HOE, name: "hoe", kind: ItemKind::Tool, stack: 1 },
    ItemDef { id: RAW_MEAT, name: "raw-meat", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: COOKED_MEAT, name: "cooked-meat", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: SEEDS, name: "seeds", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: BERRIES, name: "berries", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: WHEAT_SEEDS, name: "wheat-seeds", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: WHEAT, name: "wheat", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: BREAD, name: "bread", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: CARROT, name: "carrot", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: FISHING_ROD, name: "fishing-rod", kind: ItemKind::Tool, stack: 1 },
    ItemDef { id: RAW_FISH, name: "raw-fish", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: COOKED_FISH, name: "cooked-fish", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: FLINT, name: "flint", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: CHARCOAL, name: "charcoal", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: APPLE, name: "apple", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: ORANGE, name: "orange", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: WATERMELON, name: "watermelon", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: KIWI, name: "kiwi", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: APPLE_SEEDS, name: "apple-seeds", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: ORANGE_SEEDS, name: "orange-seeds", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: WATERMELON_SEEDS, name: "watermelon-seeds", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: KIWI_SEEDS, name: "kiwi-seeds", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: BUCKET, name: "bucket", kind: ItemKind::Tool, stack: 1 },
    ItemDef { id: WATER_BUCKET, name: "water-bucket", kind: ItemKind::Tool, stack: 1 },
    /* Live fish - one per catchable / aquarium species (the sprite lives
     * per-item; see client::ui_icons). Resources so they stack. */
    ItemDef { id: FISH_MINNOW, name: "minnow", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: FISH_REEF, name: "reef-fish", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: FISH_EEL, name: "eel", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: FISH_RAY, name: "ray", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: FISH_TURTLE, name: "turtle", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: FISH_SERPENT, name: "sea-serpent", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: NET, name: "net", kind: ItemKind::Tool, stack: 1 },
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
    ItemDef { id: VACUUM_ENGINE, name: "vacuum-engine", kind: ItemKind::Resource, stack: 8 },
    ItemDef { id: WIRE, name: "wire", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: CIRCUIT_BOARD, name: "circuit-board", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: CPU_CHIP, name: "cpu-chip", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: RAM_MODULE, name: "ram-module", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: MOTHERBOARD, name: "motherboard", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: POWER_SUPPLY, name: "power-supply", kind: ItemKind::Resource, stack: 64 },
    ItemDef { id: PRINT_NOZZLE, name: "print-nozzle", kind: ItemKind::Resource, stack: 64 },
];

/// Names accepted in recipes.yaml for the blocks the recipes reference.
/// "log" is the gameplay name for a Wood block in the bag.
fn block_id_by_name(name: &str) -> Option<ItemId> {
    let b = match name {
        "log" | "wood" => Block::Wood,
        "torch" => Block::Torch,
        "bonfire" => Block::Bonfire,
        "stone" => Block::Stone,
        "dirt" => Block::Dirt,
        "sand" => Block::Sand,
        "grass" => Block::Grass,
        "leaves" => Block::Leaves,
        "launch-pad" => Block::LaunchPad,
        "furnace" => Block::Furnace,
        "electric-furnace" => Block::ElectricFurnace,
        "3d-printer" => Block::Printer3D,
        "computer" => Block::Computer,
        "electronics-workbench" => Block::ElectronicsWorkbench,
        "hydro-generator" => Block::HydroGenerator,
        "steam-engine" => Block::SteamEngine,
        "storage-chest" => Block::StorageChest,
        "launch-tower" => Block::LaunchTower,
        "cable" => Block::Cable,
        "copper-pipe" => Block::CopperPipe,
        "station-hull" => Block::StationHull,
        "station-floor" => Block::StationFloor,
        "casino-carpet" => Block::CasinoCarpet,
        "casino-wall" => Block::CasinoWall,
        "neon-trim" => Block::NeonTrim,
        "casino-sign" => Block::CasinoSign,
        "slot-machine" => Block::SlotMachine,
        "card-table" => Block::CardTable,
        "glass" => Block::Glass,
        "aquarium" => Block::Aquarium,
        _ => return None,
    };
    Some(from_block(b))
}

fn block_name(b: Block) -> &'static str {
    match b {
        Block::Wood => "log",
        Block::Torch => "torch",
        Block::Bonfire => "bonfire",
        Block::Stone => "stone",
        Block::Dirt => "dirt",
        Block::Sand => "sand",
        Block::Grass => "grass",
        Block::Leaves => "leaves",
        Block::LaunchPad => "launch-pad",
        Block::Furnace => "furnace",
        Block::ElectricFurnace => "electric-furnace",
        Block::Printer3D => "3d-printer",
        Block::Computer => "computer",
        Block::ElectronicsWorkbench => "electronics-workbench",
        Block::HydroGenerator => "hydro-generator",
        Block::SteamEngine => "steam-engine",
        Block::StorageChest => "storage-chest",
        Block::LaunchTower => "launch-tower",
        Block::Cable => "cable",
        Block::CopperPipe => "copper-pipe",
        Block::StationHull => "station-hull",
        Block::StationFloor => "station-floor",
        Block::CasinoCarpet => "casino-carpet",
        Block::CasinoWall => "casino-wall",
        Block::NeonTrim => "neon-trim",
        Block::CasinoSign => "casino-sign",
        Block::SlotMachine => "slot-machine",
        Block::CardTable => "card-table",
        Block::Glass => "glass",
        Block::Aquarium => "aquarium",
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

/// Human-readable name for any item / block id, for hover tooltips.
/// Blocks get a hand-tuned title-case name (the terse recipe name -
/// "log", "3d-printer" - or the `block_name` "block" fallback both read
/// badly on a tooltip); non-block items title-case their def name.
/// `None` for an id with no icon / definition.
pub fn display_name(id: ItemId) -> Option<String> {
    if let Some(b) = to_block(id) {
        return Some(block_display(b).to_string());
    }
    def(id).map(|d| title_case(d.name))
}

/// Title-case a kebab / snake item name ("wood-pickaxe" -> "Wood
/// Pickaxe"). Leaves already-capitalised words alone.
fn title_case(name: &str) -> String {
    let mut out = String::with_capacity(name.len());
    for (i, word) in name.split(['-', '_']).enumerate() {
        if i > 0 {
            out.push(' ');
        }
        let mut chars = word.chars();
        if let Some(first) = chars.next() {
            out.extend(first.to_uppercase());
            out.push_str(chars.as_str());
        }
    }
    out
}

/// Display name for a placeable block. Complete coverage (unlike
/// `block_name`, whose terse recipe names + "block" fallback are for
/// parsing, not the player).
fn block_display(b: Block) -> &'static str {
    match b {
        Block::Air => "Air",
        Block::Water => "Water",
        Block::Sand | Block::SeqSand => "Sand",
        Block::Dirt | Block::SeqDirt => "Dirt",
        Block::Grass | Block::SeqGrass | Block::JungleGrass => "Grass",
        Block::DryGrass => "Dry Grass",
        Block::Stone => "Stone",
        Block::Ice => "Ice",
        Block::Snow | Block::SeqSnow => "Snow",
        Block::DirtGrass | Block::SeqDirtGrass => "Grassy Dirt",
        Block::DirtSnow | Block::SeqDirtSnow => "Snowy Dirt",
        Block::Torch => "Torch",
        Block::Bonfire => "Bonfire",
        Block::Moon => "Moon Rock",
        Block::CragRock => "Craggy Rock",
        Block::FrostIce => "Frost Ice",
        Block::AsteroidRock => "Asteroid Rock",
        Block::Wood => "Wood Log",
        Block::Leaves | Block::SeqLeaves => "Leaves",
        Block::SeqMycelium => "Mycelium",
        Block::SeqShroomCap => "Shroom Cap",
        Block::Bedrock => "Bedrock",
        Block::CoalOre => "Coal Ore",
        Block::CopperOre => "Copper Ore",
        Block::TinOre => "Tin Ore",
        Block::IronOre => "Iron Ore",
        Block::LaunchPad => "Launch Pad",
        Block::Furnace => "Furnace",
        Block::ElectricFurnace => "Electric Furnace",
        Block::Printer3D => "3D Printer",
        Block::Computer => "Computer",
        Block::ElectronicsWorkbench => "Electronics Workbench",
        Block::HydroGenerator => "Hydro Generator",
        Block::SteamEngine => "Steam Engine",
        Block::StorageChest => "Storage Chest",
        Block::LaunchTower => "Launch Tower",
        Block::Cable => "Cable",
        Block::CopperPipe => "Copper Pipe",
        Block::Farmland => "Farmland",
        Block::StationHull => "Station Hull",
        Block::StationFloor => "Station Floor",
        Block::CasinoCarpet => "Casino Carpet",
        Block::CasinoWall => "Casino Wall",
        Block::NeonTrim => "Neon Trim",
        Block::CasinoSign => "Casino Sign",
        Block::SlotMachine => "Slot Machine",
        Block::CardTable => "Card Table",
        Block::Glass => "Glass",
        Block::Aquarium => "Aquarium",
    }
}

/// Max stack for an item (1 for tools, 64 default).
pub fn stack_size(id: ItemId) -> u16 {
    def(id).map(|d| d.stack).unwrap_or(64)
}

/// Smelting result for a furnace input, or `None` if the item can't be
/// smelted. Mirrors the JS `SMELTING_RECIPES` (raw ore -> ingot). Returns
/// `(output item, output count)`.
pub fn smelt_output(id: ItemId) -> Option<(ItemId, u16)> {
    match id {
        COPPER => Some((COPPER_INGOT, 1)),
        TIN => Some((TIN_INGOT, 1)),
        IRON => Some((IRON_INGOT, 1)),
        /* Cooking reuses the furnace: raw meat -> cooked meat. */
        RAW_MEAT => Some((COOKED_MEAT, 1)),
        RAW_FISH => Some((COOKED_FISH, 1)),
        /* Any live fish cooks down to the same cooked-fish meal, so the
         * catch-and-cook food loop works whichever species you land. */
        FISH_MINNOW | FISH_REEF | FISH_EEL | FISH_RAY | FISH_TURTLE | FISH_SERPENT => {
            Some((COOKED_FISH, 1))
        }
        /* Glassmaking: sand melted in the furnace becomes a glass block -
         * the aquarium's building material. */
        _ if id == from_block(Block::Sand) => Some((from_block(Block::Glass), 1)),
        /* Charring: a wood log cooked in a fire becomes charcoal. Works
         * in the furnace and the bonfire (same smelt map). */
        _ if id == from_block(Block::Wood) => Some((CHARCOAL, 1)),
        _ => None,
    }
}

/// True if `id` can fuel a furnace (coal or charcoal). One unit = 8
/// smelts (JS `FUEL_PER_COAL`); charcoal burns the same as coal.
pub fn is_fuel(id: ItemId) -> bool {
    id == COAL || id == CHARCOAL
}

/// A 3D-printer recipe: timed print of `output` x `qty` from `inputs`.
pub struct PrintRecipe {
    pub name: &'static str,
    pub output: ItemId,
    pub qty: u16,
    pub inputs: Vec<(ItemId, u16)>,
    pub time_s: f32,
}

/// What the 3D printer can print (JS `PRINTER_RECIPES`, simplified - the
/// big structural / rocket parts). Built per call; the set is tiny.
pub fn print_recipes() -> Vec<PrintRecipe> {
    use crate::blocks::Block;
    vec![
        PrintRecipe {
            name: "Launch Pad",
            output: from_block(Block::LaunchPad),
            qty: 1,
            inputs: vec![(IRON_INGOT, 4), (Block::Stone as u16, 4)],
            time_s: 8.0,
        },
        PrintRecipe {
            name: "Launch Tower",
            output: from_block(Block::LaunchTower),
            qty: 1,
            inputs: vec![(IRON_INGOT, 9)],
            time_s: 10.0,
        },
        PrintRecipe {
            name: "Rocket Engine",
            output: ROCKET_ENGINE,
            qty: 1,
            inputs: vec![(BRONZE_INGOT, 4), (IRON_INGOT, 2)],
            time_s: 12.0,
        },
        PrintRecipe {
            name: "Fuel Tank",
            output: FUEL_TANK,
            qty: 1,
            inputs: vec![(IRON_INGOT, 6)],
            time_s: 10.0,
        },
        /* Station / casino structure panels (space era Phase 2 "built
         * look"): printable in batches so hulls are buildable off ingots.
         * The decorative casino pieces are market-bought instead (see
         * economy.yaml [prices]). */
        PrintRecipe {
            name: "Station Hull x4",
            output: from_block(Block::StationHull),
            qty: 4,
            inputs: vec![(IRON_INGOT, 2)],
            time_s: 6.0,
        },
        PrintRecipe {
            name: "Station Floor x4",
            output: from_block(Block::StationFloor),
            qty: 4,
            inputs: vec![(IRON_INGOT, 1), (TIN_INGOT, 1)],
            time_s: 6.0,
        },
        PrintRecipe {
            name: "Neon Trim x2",
            output: from_block(Block::NeonTrim),
            qty: 2,
            inputs: vec![(IRON_INGOT, 1), (WIRE, 2)],
            time_s: 6.0,
        },
    ]
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
        assert_eq!(id_by_name("flint-pickaxe"), Some(WOOD_PICKAXE));
        assert_eq!(id_by_name("flint"), Some(FLINT));
        assert_eq!(id_by_name("charcoal"), Some(CHARCOAL));
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
            ("vacuum-engine", VACUUM_ENGINE),
        ] {
            assert_eq!(id_by_name(name), Some(id), "name {name} resolves");
            assert!(!is_block(id), "{name} is not a block");
            assert_eq!(stack_size(id), 8, "{name} stacks to 8");
        }
    }

    #[test]
    fn fish_items_net_and_glass_resolve() {
        /* Every live-fish item resolves its name, classifies as a
         * Resource, and reads as a fish item. */
        for (name, id) in [
            ("minnow", FISH_MINNOW),
            ("reef-fish", FISH_REEF),
            ("eel", FISH_EEL),
            ("ray", FISH_RAY),
            ("turtle", FISH_TURTLE),
            ("sea-serpent", FISH_SERPENT),
        ] {
            assert_eq!(id_by_name(name), Some(id), "{name} resolves");
            assert_eq!(kind(id), ItemKind::Resource);
            assert!(is_fish_item(id), "{name} is a fish item");
            assert!(!is_block(id));
        }
        assert_eq!(FISH_ITEMS.len(), 6);
        assert!(!is_fish_item(RAW_FISH), "generic raw fish is not a live-fish item");
        /* Net is a stack-1 tool. */
        assert_eq!(id_by_name("net"), Some(NET));
        assert_eq!(kind(NET), ItemKind::Tool);
        assert_eq!(stack_size(NET), 1);
        /* Glass + aquarium are placeable blocks. */
        assert_eq!(id_by_name("glass"), Some(from_block(Block::Glass)));
        assert_eq!(id_by_name("aquarium"), Some(from_block(Block::Aquarium)));
        assert_eq!(display_name(from_block(Block::Aquarium)).as_deref(), Some("Aquarium"));
    }

    #[test]
    fn glassmaking_and_fish_cooking_smelt() {
        /* Sand melts to glass; every live fish cooks to cooked fish. */
        assert_eq!(smelt_output(from_block(Block::Sand)), Some((from_block(Block::Glass), 1)));
        for f in FISH_ITEMS {
            assert_eq!(smelt_output(f), Some((COOKED_FISH, 1)), "fish {f} cooks");
        }
        /* Glass itself doesn't re-smelt into anything. */
        assert_eq!(smelt_output(from_block(Block::Glass)), None);
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
