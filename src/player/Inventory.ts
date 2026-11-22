import { emitGameEvent } from '../engine/GameEvents';

// Item types in the game
export enum ItemType {
  NONE = 0,
  STONE = 1,
  DIRT = 2,
  GRASS = 3,
  WOOD = 4,
  LEAVES = 5,
  LOG = 6,
  SAND = 7,
  // Mineral ores
  ORE_COAL = 8,
  ORE_COPPER = 9,
  ORE_IRON = 10,
  ORE_GOLD = 11,
  ORE_LITHIUM = 12,
  ORE_ALUMINUM = 13,
  ORE_COBALT = 14,
  // Non-placeable items
  STICK = 15,
  COAL = 16,
  TORCH = 17,
  FISHING_ROD = 18,
  // Snow biome items
  SNOW = 19,
  ICE = 20,
  // Technology items
  FURNACE = 21,
  // Smelted materials (ingots)
  INGOT_COPPER = 22,
  INGOT_IRON = 23,
  INGOT_GOLD = 24,
  INGOT_ALUMINUM = 25,
  // Storage items
  STORAGE_CHEST = 26,
  // Technology items (machines)
  STEAM_ENGINE = 27,
  HYDRO_GENERATOR = 28,
  COPPER_PIPE = 29,
  ELECTRIC_FURNACE = 30,
  CABLE = 31,
  // Smelted materials (advanced ingots - require electric furnace)
  INGOT_LITHIUM = 32,
  INGOT_COBALT = 33,
  // Advanced technology items
  ELECTRONICS_WORKBENCH = 34,
  // Electronic components (crafted at Electronics Workbench)
  CPU_CHIP = 35,
  RAM_MODULE = 36,
  MOTHERBOARD = 37,
  // Glass (crafted from sand)
  GLASS = 38,
  // Advanced electronics components
  POWER_SUPPLY = 39,
  PRINT_NOZZLE = 40,
  // Advanced technology blocks
  COMPUTER = 41,
  PRINTER_3D = 42,
  // Launch pad components
  LAUNCH_PAD_BLOCK = 43,
  LAUNCH_PAD_SEGMENT = 44,
  // Rocket parts
  ROCKET_ENGINE = 45,
  FUEL_TANK = 46,
  COMMAND_MODULE = 47,
  MEDIUM_FUEL_TANK = 48,
  // Moon terrain
  MOON_ROCK = 49,
  // Sequoia terrain (its own blocks; see HexBlockType.SEQ_*)
  SEQ_DIRT = 50,
  SEQ_SAND = 51,
  SEQ_SNOW = 52,
  // Rocket fuel (hydrogen/oxygen from water ice); used when refuelling
  ROCKET_FUEL = 53,
  // Fish (see player/Fishing.ts for which planet each lives on)
  FISH_MINNOW = 54,
  FISH_SILVERFIN = 55,
  FISH_PERCH = 56,
  FISH_RAY = 57,
  FISH_EEL = 58,
  FISH_REEF = 59,
  FISH_DEEPBACK = 60,
  FISH_SERPENT = 61,
  // Rocket tech tier 2 (needs the Moon's titanium) and the cargo hold
  VACUUM_ENGINE = 62,
  LARGE_FUEL_TANK = 63,
  CARGO_BAY = 64,
  // Buckets: an empty one fills at any water, a full one refuels a rocket
  BUCKET = 65,
  WATER_BUCKET = 66,
  // Titanium (ilmenite): only in the Moon's rock
  ORE_TITANIUM = 67,
  INGOT_TITANIUM = 68,
  // Industry and nuclear (openspec industry-and-nuclear). Every item the
  // change needs is declared here at once, so later work adds behaviour
  // without touching the enum
  CLAY = 72,
  BRICK = 73,
  CLAY_POT = 74,
  CRUDE_OIL_BUCKET = 75,
  LAVA_BUCKET = 76,
  KEROSENE = 77,
  PLASTIC = 78,
  ORE_URANIUM = 79,
  ENRICHED_URANIUM = 80,
  FUEL_ROD = 81,
  COOKED_FISH = 82,
  FISH_STEW = 83,
  CAMPFIRE = 84,
  KILN = 85,
  OVEN = 86,
  PUMP_JACK = 87,
  REFINERY = 88,
  CENTRIFUGE = 89,
  REACTOR = 90,
  NUCLEAR_FABRICATOR = 91,
  BATTERY_LEAD_ACID = 92,
  BATTERY_LITHIUM = 93,
  BATTERY_SOLID_STATE = 94,
  NUCLEAR_THERMAL_ENGINE = 95,
  ION_DRIVE = 96,
  REACTOR_CORE = 97,
  BATTERY_PACK = 98,
  // Building materials (industry-and-nuclear task group 8)
  CEMENT = 99,
  STEEL_INGOT = 100,
  BRICK_BLOCK = 101,
  CONCRETE_BLOCK = 102,
  STEEL_GIRDER = 103,
  STEEL_GLASS = 104,
  // Wool, air and re-entry (openspec wool-air-and-reentry)
  WOOL = 105,
  LEATHER = 106,
  SHEARS = 107,
  CARPET = 108,
  WOOL_CLOTHING = 109,
  PARACHUTE = 110,
  EMPTY_TANK = 111,
  OXYGEN_TANK = 112,
  GAS_COLLECTOR = 113,
  SPACE_SUIT = 114,
  // Solar power, after batteries (openspec wool-air-and-reentry, design 6)
  SOLAR_PANEL = 115,
  SOLAR_ARRAY = 116,
  // The moons' and asteroids' own rock (numbered clear of the other item
  // families, beside their block ids 70-89)
  BASALT = 170,
  SULFUR = 171,
}

// Rocket part type for items that can be placed on the launch tower
export enum RocketPartType {
  ENGINE = 'engine',
  FUEL_TANK = 'fuel_tank',
  CAPSULE = 'capsule',
  CARGO = 'cargo',      // a cargo bay: hold slots, no thrust or fuel
  // Add more types as needed
}

// Engine requirements for rocket validation
export interface EngineRequirements {
  minFuelTanks: number;       // Minimum fuel tanks required
  requiresCommandModule: boolean;  // Whether a command module is required
}

// Rocket part metadata for 3D model loading
export interface RocketPartData {
  partType: RocketPartType;
  modelPath: string;     // Path to OBJ model
  texturePath: string;   // Path to texture for the model
  heightUnits: number;   // How many segment heights this part takes
  modelYOffset?: number; // Per-part vertical offset to correct model origin differences (default: 0)
  modelScale?: { x: number; y: number; z: number }; // Stretch the shared model (a two-unit tank is twice as tall)
  // Optional: engine-specific requirements
  engineRequirements?: EngineRequirements;
}

// Item metadata
export interface ItemData {
  name: string;
  stackSize: number;
  texture: string;
  mineTime: number; // Time in seconds to mine this item
  // Optional: for atlas textures, specify which portion to show (in pixels)
  atlasRegion?: { x: number; y: number; width: number; height: number; atlasWidth: number; atlasHeight: number };
  // Optional: rocket part data for items that go on the launch tower
  rocketPart?: RocketPartData;
}

export const ITEM_DATA: Record<ItemType, ItemData> = {
  [ItemType.NONE]: { name: 'Empty', stackSize: 0, texture: '', mineTime: 0 },
  [ItemType.STONE]: { name: 'Stone', stackSize: 64, texture: '/textures/rocks.png', mineTime: 1.5 },
  [ItemType.DIRT]: { name: 'Dirt', stackSize: 64, texture: '/textures/dirt.png', mineTime: 0.5 },
  [ItemType.GRASS]: { name: 'Grass', stackSize: 64, texture: '/textures/grass.png', mineTime: 0.6 },
  [ItemType.WOOD]: { name: 'Wood', stackSize: 64, texture: '/textures/wood.png', mineTime: 1.0 },
  [ItemType.LEAVES]: { name: 'Leaves', stackSize: 64, texture: '/textures/icons/leaves.png', mineTime: 0.3 },
  [ItemType.LOG]: { name: 'Log', stackSize: 64, texture: '/textures/icons/logs.png', mineTime: 1.2 },
  [ItemType.SAND]: { name: 'Sand', stackSize: 64, texture: '/textures/sand.png', mineTime: 0.5 },
  // Mineral ores
  [ItemType.ORE_COAL]: { name: 'Coal Ore', stackSize: 64, texture: '/textures/minerals/earth/rocks_coal.png', mineTime: 2.0 },
  [ItemType.ORE_COPPER]: { name: 'Copper Ore', stackSize: 64, texture: '/textures/minerals/earth/rocks_copper.png', mineTime: 2.0 },
  [ItemType.ORE_IRON]: { name: 'Iron Ore', stackSize: 64, texture: '/textures/minerals/earth/rocks_iron.png', mineTime: 2.5 },
  [ItemType.ORE_GOLD]: { name: 'Gold Ore', stackSize: 64, texture: '/textures/minerals/earth/rocks_gold.png', mineTime: 3.0 },
  [ItemType.ORE_LITHIUM]: { name: 'Lithium Ore', stackSize: 64, texture: '/textures/minerals/earth/rocks_lythium.png', mineTime: 3.0 },
  [ItemType.ORE_ALUMINUM]: { name: 'Aluminum Ore', stackSize: 64, texture: '/textures/minerals/earth/rocks_aluminum.png', mineTime: 2.0 },
  [ItemType.ORE_COBALT]: { name: 'Cobalt Ore', stackSize: 64, texture: '/textures/minerals/earth/rocks_cobalt.png', mineTime: 2.5 },
  // Non-placeable items
  [ItemType.STICK]: { name: 'Stick', stackSize: 64, texture: '/textures/sticks.png', mineTime: 0.3 },
  [ItemType.COAL]: { name: 'Coal', stackSize: 64, texture: '/textures/coal.png', mineTime: 0.3 },
  [ItemType.TORCH]: { name: 'Torch', stackSize: 64, texture: '/textures/torch_sprite.png', mineTime: 0.3 },
  [ItemType.FISHING_ROD]: { name: 'Fishing Rod', stackSize: 1, texture: '/textures/fishing_rod.png', mineTime: 0.3 },
  // Snow biome items (same hardness as dirt)
  [ItemType.SNOW]: { name: 'Snow', stackSize: 64, texture: '/textures/snow.png', mineTime: 0.5 },
  [ItemType.ICE]: { name: 'Ice', stackSize: 64, texture: '/textures/ice.png', mineTime: 0.5 },
  // Technology items
  [ItemType.FURNACE]: { name: 'Furnace', stackSize: 8, texture: '/textures/technology/furnace_face.png', mineTime: 2.0 },
  // Smelted materials (ingots)
  [ItemType.INGOT_COPPER]: { name: 'Copper Ingot', stackSize: 64, texture: '/textures/minerals/earth/copper.png', mineTime: 0.3 },
  [ItemType.INGOT_IRON]: { name: 'Iron Ingot', stackSize: 64, texture: '/textures/minerals/earth/iron.png', mineTime: 0.3 },
  [ItemType.INGOT_GOLD]: { name: 'Gold Ingot', stackSize: 64, texture: '/textures/minerals/earth/gold.png', mineTime: 0.3 },
  [ItemType.INGOT_ALUMINUM]: { name: 'Aluminum Ingot', stackSize: 64, texture: '/textures/minerals/earth/aluminum.png', mineTime: 0.3 },
  // Storage items
  [ItemType.STORAGE_CHEST]: { name: 'Storage Chest', stackSize: 8, texture: '/textures/technology/storage_face.png', mineTime: 1.5 },
  // Technology items (machines)
  [ItemType.STEAM_ENGINE]: { name: 'Steam Engine', stackSize: 8, texture: '/textures/technology/steam_engine_face.png', mineTime: 2.5 },
  [ItemType.HYDRO_GENERATOR]: { name: 'Hydro Generator', stackSize: 8, texture: '/textures/technology/hydro_generator_face.png', mineTime: 2.5 },
  [ItemType.COPPER_PIPE]: { name: 'Copper Pipe', stackSize: 64, texture: '/textures/technology/copper_pipe.png', mineTime: 0.5 },
  [ItemType.ELECTRIC_FURNACE]: { name: 'Electric Furnace', stackSize: 8, texture: '/textures/technology/electric_furnace_face.png', mineTime: 2.5 },
  [ItemType.CABLE]: { name: 'Cable', stackSize: 64, texture: '/textures/technology/cable.png', mineTime: 0.5 },
  // Advanced ingots (require electric furnace)
  [ItemType.INGOT_LITHIUM]: { name: 'Lithium Ingot', stackSize: 64, texture: '/textures/minerals/earth/lythium.png', mineTime: 0.3 },
  [ItemType.INGOT_COBALT]: { name: 'Cobalt Ingot', stackSize: 64, texture: '/textures/minerals/earth/cobalt.png', mineTime: 0.3 },
  // Advanced technology items
  [ItemType.ELECTRONICS_WORKBENCH]: { name: 'Electronics Workbench', stackSize: 8, texture: '/textures/technology/electronics_workbench_face.png', mineTime: 2.5 },
  // Electronic components
  [ItemType.CPU_CHIP]: { name: 'CPU Chip', stackSize: 64, texture: '/textures/technology/micro_chip.png', mineTime: 0.3 },
  [ItemType.RAM_MODULE]: { name: 'RAM Module', stackSize: 64, texture: '/textures/technology/ram_module.png', mineTime: 0.3 },
  [ItemType.MOTHERBOARD]: { name: 'Motherboard', stackSize: 64, texture: '/textures/technology/mother_board.png', mineTime: 0.3 },
  // Glass (crafted, uses ice shader for transparency)
  [ItemType.GLASS]: { name: 'Glass', stackSize: 64, texture: '/textures/glass.png', mineTime: 1.2 },
  // Advanced electronics components
  [ItemType.POWER_SUPPLY]: { name: 'Power Supply', stackSize: 64, texture: '/textures/technology/power_supply.png', mineTime: 0.3 },
  [ItemType.PRINT_NOZZLE]: { name: 'Print Nozzle', stackSize: 64, texture: '/textures/technology/print_nozzle.png', mineTime: 0.3 },
  // Advanced technology blocks
  [ItemType.COMPUTER]: { name: 'Computer', stackSize: 8, texture: '/textures/technology/computer_face.png', mineTime: 2.5 },
  [ItemType.PRINTER_3D]: { name: '3D Printer', stackSize: 8, texture: '/textures/technology/3d_printer_face.png', mineTime: 2.5 },
  // Launch pad components
  [ItemType.LAUNCH_PAD_BLOCK]: { name: 'Launch Pad Block', stackSize: 8, texture: '/textures/technology/launch_pad_face.png', mineTime: 2.5 },
  [ItemType.LAUNCH_PAD_SEGMENT]: { name: 'Launch Pad Segment', stackSize: 8, texture: '/textures/technology/launch_tower_face.png', mineTime: 3.0 },
  // Rocket parts
  [ItemType.ROCKET_ENGINE]: {
    name: 'Rocket Engine',
    stackSize: 8,
    texture: '/textures/rocket_parts/medium_engine_face.png',
    mineTime: 3.0,
    rocketPart: {
      partType: RocketPartType.ENGINE,
      modelPath: '/models/medium_rocket_nozzlel.obj',
      texturePath: '/textures/rocket_parts/medium_engine.png',
      heightUnits: 1,
      engineRequirements: {
        minFuelTanks: 1,
        requiresCommandModule: true,
      },
    },
  },
  // Deprecated: Use MEDIUM_FUEL_TANK instead
  [ItemType.FUEL_TANK]: {
    name: 'Fuel Tank (Legacy)',
    stackSize: 8,
    texture: '/textures/rocket_parts/medium_fuel_tank_face.png',
    mineTime: 3.0,
    rocketPart: {
      partType: RocketPartType.FUEL_TANK,
      modelPath: '/models/medium_fuel_tank.obj',
      texturePath: '/textures/rocket_parts/medium_fuel_tank.png',
      heightUnits: 1,
    },
  },

  [ItemType.COMMAND_MODULE]: {
    name: 'Command Module',
    stackSize: 8,
    texture: '/textures/rocket_parts/command_module_face.png',
    mineTime: 3.0,
    rocketPart: {
      partType: RocketPartType.CAPSULE,
      modelPath: '/models/command_module.obj',
      texturePath: '/textures/rocket_parts/command_module.png',
      heightUnits: 1,
    },
  },
  [ItemType.MEDIUM_FUEL_TANK]: {
    name: 'Medium Fuel Tank',
    stackSize: 8,
    texture: '/textures/rocket_parts/medium_fuel_tank_face.png',
    mineTime: 3.0,
    rocketPart: {
      partType: RocketPartType.FUEL_TANK,
      modelPath: '/models/medium_fuel_tank.obj',
      texturePath: '/textures/rocket_parts/medium_fuel_tank.png',
      heightUnits: 1,
      modelYOffset: 0, // the unit height change to one no longer requires this offset (for now lol)
    },
  },
  // Tier 2 rocket parts: the existing models in their own textures
  // (scripts/gen-rocket-parts.py); stats in ROCKET_CONFIG.PARTS
  [ItemType.VACUUM_ENGINE]: {
    name: 'Vacuum Engine',
    stackSize: 8,
    texture: '/textures/rocket_parts/vacuum_engine_face.png',
    mineTime: 3.0,
    rocketPart: {
      partType: RocketPartType.ENGINE,
      modelPath: '/models/medium_rocket_nozzlel.obj',
      texturePath: '/textures/rocket_parts/vacuum_engine.png',
      heightUnits: 1,
      modelScale: { x: 1.25, y: 1, z: 1.25 },   // a wider bell
      engineRequirements: {
        minFuelTanks: 1,
        requiresCommandModule: true,
      },
    },
  },
  [ItemType.LARGE_FUEL_TANK]: {
    name: 'Large Fuel Tank',
    stackSize: 8,
    texture: '/textures/rocket_parts/large_fuel_tank_face.png',
    mineTime: 3.0,
    rocketPart: {
      partType: RocketPartType.FUEL_TANK,
      modelPath: '/models/medium_fuel_tank.obj',
      texturePath: '/textures/rocket_parts/large_fuel_tank.png',
      heightUnits: 2,
      modelScale: { x: 1, y: 2, z: 1 },
    },
  },
  [ItemType.CARGO_BAY]: {
    name: 'Cargo Bay',
    stackSize: 8,
    texture: '/textures/rocket_parts/cargo_bay_face.png',
    mineTime: 3.0,
    rocketPart: {
      partType: RocketPartType.CARGO,
      modelPath: '/models/medium_fuel_tank.obj',
      texturePath: '/textures/rocket_parts/cargo_bay.png',
      heightUnits: 1,
    },
  },
  [ItemType.BUCKET]: { name: 'Bucket', stackSize: 16, texture: '/textures/icons/bucket.png', mineTime: 0.3 },
  [ItemType.WATER_BUCKET]: { name: 'Water Bucket', stackSize: 16, texture: '/textures/icons/water_bucket.png', mineTime: 0.3 },
  [ItemType.ORE_TITANIUM]: { name: 'Titanium Ore', stackSize: 64, texture: '/textures/moon/ore_titanium.png', mineTime: 2.5 },
  [ItemType.INGOT_TITANIUM]: { name: 'Titanium Ingot', stackSize: 64, texture: '/textures/icons/ingot_titanium.png', mineTime: 0.3 },
  // Moon terrain (same mining time as stone)
  [ItemType.MOON_ROCK]: { name: 'Moon Rock', stackSize: 64, texture: '/textures/moon.png', mineTime: 1.5 },
  // Sequoia terrain
  [ItemType.SEQ_DIRT]: { name: 'Sequoia Soil', stackSize: 64, texture: '/textures/planet_seq/planet_seq_dirt.png', mineTime: 0.5 },
  [ItemType.SEQ_SAND]: { name: 'Sequoia Sand', stackSize: 64, texture: '/textures/planet_seq/planet_seq_sand.png', mineTime: 0.5 },
  [ItemType.SEQ_SNOW]: { name: 'Sequoia Snow', stackSize: 64, texture: '/textures/planet_seq/planet_seq_snow.png', mineTime: 0.5 },
  [ItemType.BASALT]: { name: 'Basalt', stackSize: 64, texture: '/textures/bodies/basalt_side.png', mineTime: 1.5 },
  [ItemType.SULFUR]: { name: 'Sulfur', stackSize: 64, texture: '/textures/bodies/sulfur.png', mineTime: 0.8 },
  [ItemType.ROCKET_FUEL]: { name: 'Rocket Fuel', stackSize: 64, texture: '/textures/icons/rocket_fuel.png', mineTime: 0.3 },
  [ItemType.FISH_MINNOW]: { name: 'Minnow', stackSize: 16, texture: '/textures/fish/minnow.png', mineTime: 0.3 },
  [ItemType.FISH_SILVERFIN]: { name: 'Silverfin', stackSize: 16, texture: '/textures/fish/silverfin.png', mineTime: 0.3 },
  [ItemType.FISH_PERCH]: { name: 'Banded Perch', stackSize: 16, texture: '/textures/fish/perch.png', mineTime: 0.3 },
  [ItemType.FISH_RAY]: { name: 'Ray', stackSize: 16, texture: '/textures/fish/ray.png', mineTime: 0.3 },
  [ItemType.FISH_EEL]: { name: 'Eel', stackSize: 16, texture: '/textures/fish/eel.png', mineTime: 0.3 },
  [ItemType.FISH_REEF]: { name: 'Reef Fish', stackSize: 16, texture: '/textures/fish/reef.png', mineTime: 0.3 },
  [ItemType.FISH_DEEPBACK]: { name: 'Deepback', stackSize: 16, texture: '/textures/fish/deepback.png', mineTime: 0.3 },
  [ItemType.FISH_SERPENT]: { name: 'Sea Serpent', stackSize: 16, texture: '/textures/fish/serpent.png', mineTime: 0.3 },
  // ---- Industry and nuclear (openspec industry-and-nuclear) -------------
  // Raw resources (blocks drop these; icons from scripts/gen-item-icons.py,
  // the ores' icons are their block textures as the other ores' are)
  [ItemType.CLAY]: { name: 'Clay', stackSize: 64, texture: '/textures/resources/clay.png', mineTime: 0.6 },
  [ItemType.ORE_URANIUM]: { name: 'Uranium Ore', stackSize: 64, texture: '/textures/resources/ore_uranium.png', mineTime: 3.5 },
  [ItemType.BRICK]: { name: 'Brick', stackSize: 64, texture: '/textures/icons/brick.png', mineTime: 0.3 },
  [ItemType.CLAY_POT]: { name: 'Clay Pot', stackSize: 16, texture: '/textures/icons/clay_pot.png', mineTime: 0.3 },
  [ItemType.CRUDE_OIL_BUCKET]: { name: 'Crude Oil Bucket', stackSize: 16, texture: '/textures/icons/crude_oil_bucket.png', mineTime: 0.3 },
  [ItemType.LAVA_BUCKET]: { name: 'Lava Bucket', stackSize: 16, texture: '/textures/icons/lava_bucket.png', mineTime: 0.3 },
  [ItemType.KEROSENE]: { name: 'Kerosene', stackSize: 64, texture: '/textures/icons/kerosene.png', mineTime: 0.3 },
  [ItemType.PLASTIC]: { name: 'Plastic', stackSize: 64, texture: '/textures/icons/plastic.png', mineTime: 0.3 },
  [ItemType.ENRICHED_URANIUM]: { name: 'Enriched Uranium', stackSize: 64, texture: '/textures/icons/enriched_uranium.png', mineTime: 0.3 },
  [ItemType.FUEL_ROD]: { name: 'Fuel Rod', stackSize: 16, texture: '/textures/icons/fuel_rod.png', mineTime: 0.3 },
  // Food
  [ItemType.COOKED_FISH]: { name: 'Cooked Fish', stackSize: 16, texture: '/textures/icons/cooked_fish.png', mineTime: 0.3 },
  [ItemType.FISH_STEW]: { name: 'Fish Stew', stackSize: 8, texture: '/textures/icons/fish_stew.png', mineTime: 0.3 },
  // Machines (placed like the furnace and printer; behaviour comes with
  // their own tasks)
  [ItemType.CAMPFIRE]: { name: 'Campfire', stackSize: 8, texture: '/textures/technology/campfire_face.png', mineTime: 1.0 },
  [ItemType.KILN]: { name: 'Kiln', stackSize: 8, texture: '/textures/technology/kiln_face.png', mineTime: 2.0 },
  [ItemType.OVEN]: { name: 'Oven', stackSize: 8, texture: '/textures/technology/oven_face.png', mineTime: 2.0 },
  [ItemType.PUMP_JACK]: { name: 'Pump Jack', stackSize: 8, texture: '/textures/technology/pump_jack_face.png', mineTime: 2.5 },
  [ItemType.REFINERY]: { name: 'Refinery', stackSize: 8, texture: '/textures/technology/refinery_face.png', mineTime: 2.5 },
  [ItemType.CENTRIFUGE]: { name: 'Centrifuge', stackSize: 8, texture: '/textures/technology/centrifuge_face.png', mineTime: 2.5 },
  [ItemType.REACTOR]: { name: 'Fission Reactor', stackSize: 4, texture: '/textures/technology/reactor_face.png', mineTime: 4.0 },
  [ItemType.NUCLEAR_FABRICATOR]: { name: 'Nuclear Fabricator', stackSize: 4, texture: '/textures/technology/nuclear_fabricator_face.png', mineTime: 3.0 },
  // Batteries (placeable; denser by tier)
  [ItemType.BATTERY_LEAD_ACID]: { name: 'Lead-Acid Battery', stackSize: 8, texture: '/textures/technology/battery_lead_acid_face.png', mineTime: 2.0 },
  [ItemType.BATTERY_LITHIUM]: { name: 'Lithium-Ion Battery', stackSize: 8, texture: '/textures/technology/battery_lithium_face.png', mineTime: 2.0 },
  [ItemType.BATTERY_SOLID_STATE]: { name: 'Solid-State Battery', stackSize: 8, texture: '/textures/technology/battery_solid_state_face.png', mineTime: 2.0 },
  // Tier 3-4 rocket parts: the shipped models in their own textures
  // (scripts/gen-item-icons.py); stats come with the rocket-tiers task
  [ItemType.NUCLEAR_THERMAL_ENGINE]: {
    name: 'Nuclear Thermal Engine',
    stackSize: 8,
    texture: '/textures/rocket_parts/nuclear_thermal_engine_face.png',
    mineTime: 3.0,
    rocketPart: {
      partType: RocketPartType.ENGINE,
      modelPath: '/models/medium_rocket_nozzlel.obj',
      texturePath: '/textures/rocket_parts/nuclear_thermal_engine.png',
      heightUnits: 1,
      modelScale: { x: 1.15, y: 1, z: 1.15 },
      engineRequirements: { minFuelTanks: 1, requiresCommandModule: true },
    },
  },
  [ItemType.ION_DRIVE]: {
    name: 'Ion Drive',
    stackSize: 8,
    texture: '/textures/rocket_parts/ion_drive_face.png',
    mineTime: 3.0,
    rocketPart: {
      partType: RocketPartType.ENGINE,
      modelPath: '/models/medium_rocket_nozzlel.obj',
      texturePath: '/textures/rocket_parts/ion_drive.png',
      heightUnits: 1,
      modelScale: { x: 0.85, y: 1, z: 0.85 },
      engineRequirements: { minFuelTanks: 1, requiresCommandModule: true },
    },
  },
  [ItemType.REACTOR_CORE]: {
    name: 'Reactor Core',
    stackSize: 8,
    texture: '/textures/rocket_parts/reactor_core_face.png',
    mineTime: 3.0,
    rocketPart: {
      partType: RocketPartType.CARGO,
      modelPath: '/models/medium_fuel_tank.obj',
      texturePath: '/textures/rocket_parts/reactor_core.png',
      heightUnits: 1,
    },
  },
  [ItemType.BATTERY_PACK]: {
    name: 'Battery Pack',
    stackSize: 8,
    texture: '/textures/rocket_parts/battery_pack_face.png',
    mineTime: 3.0,
    rocketPart: {
      partType: RocketPartType.CARGO,
      modelPath: '/models/medium_fuel_tank.obj',
      texturePath: '/textures/rocket_parts/battery_pack.png',
      heightUnits: 1,
    },
  },
  // Building materials. Mining time rises dirt < clay < brick < glass <
  // concrete = steel glass = steel girder (the block items' own textures
  // are their icons).
  [ItemType.CEMENT]: { name: 'Cement', stackSize: 64, texture: '/textures/icons/cement.png', mineTime: 0.3 },
  [ItemType.STEEL_INGOT]: { name: 'Steel Ingot', stackSize: 64, texture: '/textures/icons/steel_ingot.png', mineTime: 0.3 },
  [ItemType.BRICK_BLOCK]: { name: 'Brick Block', stackSize: 64, texture: '/textures/building/brick_block.png', mineTime: 1.0 },
  [ItemType.CONCRETE_BLOCK]: { name: 'Concrete', stackSize: 64, texture: '/textures/building/concrete.png', mineTime: 2.5 },
  [ItemType.STEEL_GIRDER]: { name: 'Steel Girder', stackSize: 64, texture: '/textures/building/steel_girder.png', mineTime: 2.5 },
  [ItemType.STEEL_GLASS]: { name: 'Steel Glass', stackSize: 64, texture: '/textures/building/steel_glass.png', mineTime: 2.5 },
  // Wool, air and re-entry (openspec wool-air-and-reentry)
  [ItemType.WOOL]: { name: 'Wool', stackSize: 64, texture: '/textures/icons/wool.png', mineTime: 0.5 },
  [ItemType.LEATHER]: { name: 'Leather', stackSize: 64, texture: '/textures/icons/leather.png', mineTime: 0.5 },
  [ItemType.SHEARS]: { name: 'Shears', stackSize: 1, texture: '/textures/icons/shears.png', mineTime: 0.5 },
  [ItemType.CARPET]: { name: 'Carpet', stackSize: 64, texture: '/textures/building/carpet.png', mineTime: 0.4 },
  [ItemType.WOOL_CLOTHING]: { name: 'Wool Clothing', stackSize: 8, texture: '/textures/icons/wool_clothing.png', mineTime: 0.5 },
  [ItemType.PARACHUTE]: {
    name: 'Parachute',
    stackSize: 8,
    texture: '/textures/rocket_parts/parachute_face.png',
    mineTime: 3.0,
    rocketPart: {
      partType: RocketPartType.CARGO,
      modelPath: '/models/medium_fuel_tank.obj',
      texturePath: '/textures/rocket_parts/parachute.png',
      heightUnits: 1,
    },
  },
  [ItemType.EMPTY_TANK]: { name: 'Empty Tank', stackSize: 16, texture: '/textures/icons/empty_tank.png', mineTime: 0.5 },
  [ItemType.OXYGEN_TANK]: { name: 'Oxygen Tank', stackSize: 16, texture: '/textures/icons/oxygen_tank.png', mineTime: 0.5 },
  [ItemType.GAS_COLLECTOR]: { name: 'Gas Collector', stackSize: 8, texture: '/textures/technology/gas_collector_face.png', mineTime: 2.0 },
  [ItemType.SPACE_SUIT]: { name: 'Space Suit', stackSize: 1, texture: '/textures/icons/space_suit.png', mineTime: 0.5 },
  [ItemType.SOLAR_PANEL]: { name: 'Solar Panel', stackSize: 16, texture: '/textures/technology/solar_panel_face.png', mineTime: 1.5 },
  [ItemType.SOLAR_ARRAY]: {
    name: 'Solar Array',
    stackSize: 8,
    texture: '/textures/rocket_parts/solar_array_face.png',
    mineTime: 3.0,
    rocketPart: {
      partType: RocketPartType.CARGO,
      modelPath: '/models/medium_fuel_tank.obj',
      texturePath: '/textures/rocket_parts/solar_array.png',
      heightUnits: 1,
    },
  },
};

// Inventory slot
export interface InventorySlot {
  itemType: ItemType;
  quantity: number;
}

export class Inventory {
  private slots: InventorySlot[];
  private selectedSlot: number = 0;
  private hotbarSize: number = 9;
  private totalSlots: number = 36; // 9 hotbar + 27 inventory

  constructor() {
    this.slots = [];
    for (let i = 0; i < this.totalSlots; i++) {
      this.slots.push({ itemType: ItemType.NONE, quantity: 0 });
    }

    // Inventory starts empty - items are obtained by mining
  }

  // Add item to inventory, returns amount that couldn't be added
  public addItem(itemType: ItemType, quantity: number): number {
    if (itemType === ItemType.NONE) return quantity;

    const itemData = ITEM_DATA[itemType];
    let remaining = quantity;

    // First, try to stack with existing items
    for (let i = 0; i < this.totalSlots && remaining > 0; i++) {
      const slot = this.slots[i];
      if (slot.itemType === itemType && slot.quantity < itemData.stackSize) {
        const canAdd = Math.min(remaining, itemData.stackSize - slot.quantity);
        slot.quantity += canAdd;
        remaining -= canAdd;
      }
    }

    // Then, try to fill empty slots
    for (let i = 0; i < this.totalSlots && remaining > 0; i++) {
      const slot = this.slots[i];
      if (slot.itemType === ItemType.NONE) {
        const canAdd = Math.min(remaining, itemData.stackSize);
        slot.itemType = itemType;
        slot.quantity = canAdd;
        remaining -= canAdd;
      }
    }

    return remaining;
  }

  // Set a specific slot's contents directly
  public setSlot(slotIndex: number, itemType: ItemType, quantity: number): void {
    if (slotIndex < 0 || slotIndex >= this.totalSlots) return;
    this.slots[slotIndex].itemType = itemType;
    this.slots[slotIndex].quantity = quantity;
    if (quantity <= 0) {
      this.slots[slotIndex].itemType = ItemType.NONE;
      this.slots[slotIndex].quantity = 0;
    }
  }

  // Remove item from inventory, returns amount actually removed
  public removeItem(itemType: ItemType, quantity: number): number {
    if (itemType === ItemType.NONE) return 0;

    let remaining = quantity;
    let removed = 0;

    for (let i = this.totalSlots - 1; i >= 0 && remaining > 0; i--) {
      const slot = this.slots[i];
      if (slot.itemType === itemType) {
        const canRemove = Math.min(remaining, slot.quantity);
        slot.quantity -= canRemove;
        remaining -= canRemove;
        removed += canRemove;

        if (slot.quantity === 0) {
          slot.itemType = ItemType.NONE;
        }
      }
    }

    return removed;
  }

  // Check if inventory has at least this many of an item
  public hasItem(itemType: ItemType, quantity: number): boolean {
    let count = 0;
    for (const slot of this.slots) {
      if (slot.itemType === itemType) {
        count += slot.quantity;
        if (count >= quantity) return true;
      }
    }
    return false;
  }

  // Get count of item type
  public getItemCount(itemType: ItemType): number {
    let count = 0;
    for (const slot of this.slots) {
      if (slot.itemType === itemType) {
        count += slot.quantity;
      }
    }
    return count;
  }

  // Get hotbar slots
  public getHotbar(): InventorySlot[] {
    return this.slots.slice(0, this.hotbarSize);
  }

  // Get selected slot index
  public getSelectedSlot(): number {
    return this.selectedSlot;
  }

  // Set selected slot
  public setSelectedSlot(slot: number): void {
    this.selectedSlot = Math.max(0, Math.min(this.hotbarSize - 1, slot));
  }

  // Get selected item
  public getSelectedItem(): InventorySlot {
    return this.slots[this.selectedSlot];
  }

  // Use item from selected slot (for placing blocks)
  // Takes one of the held item: every caller is placing it in the world
  public useSelectedItem(): boolean {
    const slot = this.slots[this.selectedSlot];
    if (slot.itemType !== ItemType.NONE && slot.quantity > 0) {
      emitGameEvent('placed', slot.itemType, 1);
      slot.quantity--;
      if (slot.quantity === 0) {
        slot.itemType = ItemType.NONE;
      }
      return true;
    }
    return false;
  }

  // Get all slots (for inventory UI)
  public getAllSlots(): InventorySlot[] {
    return this.slots;
  }

  // Swap two slots in the inventory
  public swapSlots(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.totalSlots ||
        toIndex < 0 || toIndex >= this.totalSlots ||
        fromIndex === toIndex) {
      return;
    }

    const temp = { ...this.slots[fromIndex] };
    this.slots[fromIndex] = { ...this.slots[toIndex] };
    this.slots[toIndex] = temp;
  }

  // Merge or swap slots - if same item type, combine up to max stack (64), leftovers stay in source
  // If different types, just swap
  public mergeOrSwapSlots(fromIndex: number, toIndex: number): void {
    if (fromIndex < 0 || fromIndex >= this.totalSlots ||
        toIndex < 0 || toIndex >= this.totalSlots ||
        fromIndex === toIndex) {
      return;
    }

    const fromSlot = this.slots[fromIndex];
    const toSlot = this.slots[toIndex];
    const maxStack = 64;

    // If target is empty, just move the item
    if (toSlot.itemType === ItemType.NONE) {
      this.slots[toIndex] = { ...fromSlot };
      this.slots[fromIndex] = { itemType: ItemType.NONE, quantity: 0 };
      return;
    }

    // If source is empty, nothing to do
    if (fromSlot.itemType === ItemType.NONE) {
      return;
    }

    // If same item type, merge stacks
    if (fromSlot.itemType === toSlot.itemType) {
      const totalQuantity = fromSlot.quantity + toSlot.quantity;
      if (totalQuantity <= maxStack) {
        // All items fit in target slot
        this.slots[toIndex].quantity = totalQuantity;
        this.slots[fromIndex] = { itemType: ItemType.NONE, quantity: 0 };
      } else {
        // Target slot fills up, leftovers stay in source
        this.slots[toIndex].quantity = maxStack;
        this.slots[fromIndex].quantity = totalQuantity - maxStack;
      }
      return;
    }

    // Different item types - just swap
    const temp = { ...fromSlot };
    this.slots[fromIndex] = { ...toSlot };
    this.slots[toIndex] = temp;
  }

  // Get a specific slot by index
  public getSlot(index: number): InventorySlot | null {
    if (index < 0 || index >= this.totalSlots) {
      return null;
    }
    return this.slots[index];
  }

  // Export inventory state for saving
  public exportForSave(): { itemType: number; quantity: number }[] {
    return this.slots.map(slot => ({
      itemType: slot.itemType,
      quantity: slot.quantity
    }));
  }

  // Import inventory state from save
  public importFromSave(data: { itemType: number; quantity: number }[]): void {
    for (let i = 0; i < Math.min(data.length, this.totalSlots); i++) {
      this.slots[i] = {
        itemType: data[i].itemType as ItemType,
        quantity: data[i].quantity
      };
    }
  }
}
