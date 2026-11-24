import { emitGameEvent } from '../engine/GameEvents';
import { ToolKind, ToolTier, TOOL_TIERS, ROD_USES, TOOLBOX } from '../config/ToolConfig';

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
  // Tools (openspec tools-and-toolbox): pickaxe / axe / shovel per tier;
  // ToolConfig.ts holds their uses and speed
  ROCK_PICKAXE = 120,
  ROCK_AXE = 121,
  ROCK_SHOVEL = 122,
  COPPER_PICKAXE = 123,
  COPPER_AXE = 124,
  COPPER_SHOVEL = 125,
  IRON_PICKAXE = 126,
  IRON_AXE = 127,
  IRON_SHOVEL = 128,
  STEEL_PICKAXE = 129,
  STEEL_AXE = 130,
  STEEL_SHOVEL = 131,
  TITANIUM_PICKAXE = 132,
  TITANIUM_AXE = 133,
  TITANIUM_SHOVEL = 134,
  // The moons' and asteroids' own rock (numbered clear of the other item
  // families, beside their block ids 70-89)
  BASALT = 170,
  SULFUR = 171,
  // The jungle moons' fish (openspec ocean-life; FishRosters.ts says which moon)
  FISH_TETRA = 190,
  FISH_CATFISH = 191,
  FISH_LEAFPIKE = 192,
  FISH_PEATEEL = 193,
  FISH_GOURAMI = 194,
  FISH_GAR = 195,
  // Sequoia's schooling fish (openspec underwater-life)
  FISH_SPRAT = 196,
  // Oil sand dug out whole, for the refinery (it can also be scooped with a bucket)
  OIL_SAND = 197,
  // Space exploration (openspec space-exploration): planted on a body to survey it
  SURVEY_BEACON = 198,
  // Rocket equipment: soaks up re-entry and solar heat (space-exploration)
  HEAT_SHIELD = 199,
  // A rocket part that splits the stack into stages (space-exploration, rocket-staging)
  STAGE_SEPARATOR = 200,
  // Rocket equipment: lets a parked rocket's stack be changed away from a pad (rocket-refit)
  REFIT_KIT = 201,
  REFIT_KIT_MK2 = 202,
  // The engine ladder (space-exploration, rocket-tiers)
  ION_THRUSTER = 203,
  GAS_CORE_ENGINE = 204,
  FISSION_FRAGMENT_DRIVE = 205,
  NUCLEAR_PULSE_DRIVE = 206,
  FUSION_DRIVE = 207,
  FUSION_TORCH = 208,
  // Body resources and what they make (space-exploration, resources)
  RESIN = 209,
  SALVAGE = 210,
  SUPERCONDUCTOR = 211,
  RARE_EARTH_ORE = 212,
  MAGNET = 213,
  RADIOTROPHIC_FUNGUS = 214,
  SILICA = 215,
  AEROGEL = 216,
  CRYSTAL = 217,
  LASER_CRYSTAL = 218,
  CRYO_COOLANT = 219,
  CORONAL_DATA = 220,
  PULSE_UNIT = 221,
  HELIUM_3 = 222,
  DEUTERIUM = 223,
  METALLIC_HYDROGEN = 224,
  CERAMIC_PLATING = 225,
  MAGNETIC_COIL = 226,
  // Suit tiers and heaters (space-exploration, body-environments)
  THERMAL_SUIT = 227,
  HARDENED_SUIT = 228,
  SUIT_HEATER = 229,
  SUIT_HEATER_MK2 = 230,
}

// Rocket part type for items that can be placed on the launch tower
export enum RocketPartType {
  ENGINE = 'engine',
  FUEL_TANK = 'fuel_tank',
  CAPSULE = 'capsule',
  CARGO = 'cargo',      // a cargo bay: hold slots, no thrust or fuel
  SEPARATOR = 'separator', // a stage separator: splits the stack into stages (it drops with the stage below)
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
  // Optional: a tool's kind and tier (src/config/ToolConfig.ts)
  tool?: { kind: ToolKind; tier: ToolTier };
}

// A tier tool's item data: "<Tier> <Kind>", its icon from scripts/gen-item-icons.py
const KIND_NAMES: Record<ToolKind, string> = { pickaxe: 'Pickaxe', axe: 'Axe', shovel: 'Shovel', rod: 'Rod' };
function toolItem(tier: keyof typeof TOOL_TIERS, kind: Exclude<ToolKind, 'rod'>): ItemData {
  return {
    name: `${TOOL_TIERS[tier].name} ${KIND_NAMES[kind]}`,
    stackSize: 1,
    texture: `/textures/icons/tools/${tier}_${kind}.png`,
    mineTime: 0.3,
    tool: { kind, tier },
  };
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
  [ItemType.FISHING_ROD]: { name: 'Fishing Rod', stackSize: 1, texture: '/textures/fishing_rod.png', mineTime: 0.3, tool: { kind: 'rod', tier: 'wood' } },
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
  [ItemType.STAGE_SEPARATOR]: {
    name: 'Stage Separator',
    stackSize: 8,
    texture: '/textures/rocket_parts/stage_separator_face.png',
    mineTime: 2.0,
    rocketPart: {
      partType: RocketPartType.SEPARATOR,
      modelPath: '/models/medium_fuel_tank.obj',
      texturePath: '/textures/rocket_parts/stage_separator.png',
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
  [ItemType.FISH_TETRA]: { name: 'Emerald Tetra', stackSize: 16, texture: '/textures/fish/tetra.png', mineTime: 0.3 },
  [ItemType.FISH_CATFISH]: { name: 'Laterite Catfish', stackSize: 16, texture: '/textures/fish/catfish.png', mineTime: 0.3 },
  [ItemType.FISH_LEAFPIKE]: { name: 'Leaf Pike', stackSize: 16, texture: '/textures/fish/leaf_pike.png', mineTime: 0.3 },
  [ItemType.FISH_PEATEEL]: { name: 'Peat Eel', stackSize: 16, texture: '/textures/fish/peat_eel.png', mineTime: 0.3 },
  [ItemType.FISH_GOURAMI]: { name: 'Mire Gourami', stackSize: 16, texture: '/textures/fish/gourami.png', mineTime: 0.3 },
  [ItemType.FISH_GAR]: { name: 'Violet Gar', stackSize: 16, texture: '/textures/fish/violet_gar.png', mineTime: 0.3 },
  [ItemType.FISH_SPRAT]: { name: 'Glimmer Sprat', stackSize: 16, texture: '/textures/fish/sprat.png', mineTime: 0.3 },
  // ---- Industry and nuclear (openspec industry-and-nuclear) -------------
  // Raw resources (blocks drop these; icons from scripts/gen-item-icons.py,
  // the ores' icons are their block textures as the other ores' are)
  [ItemType.CLAY]: { name: 'Clay', stackSize: 64, texture: '/textures/resources/clay.png', mineTime: 0.6 },
  [ItemType.OIL_SAND]: { name: 'Oil Sand', stackSize: 64, texture: '/textures/resources/oil_sand.png', mineTime: 0.9 },
  [ItemType.ION_THRUSTER]: {
    name: 'Ion Thruster',
    stackSize: 8,
    texture: '/textures/rocket_parts/ion_thruster_face.png',
    mineTime: 3.0,
    rocketPart: {
      partType: RocketPartType.ENGINE,
      modelPath: '/models/medium_rocket_nozzlel.obj',
      texturePath: '/textures/rocket_parts/ion_thruster.png',
      heightUnits: 1,
      modelScale: { x: 0.7, y: 1, z: 0.7 },
      engineRequirements: { minFuelTanks: 1, requiresCommandModule: true },
    },
  },
  [ItemType.GAS_CORE_ENGINE]: {
    name: 'Gas-Core Engine',
    stackSize: 8,
    texture: '/textures/rocket_parts/gas_core_engine_face.png',
    mineTime: 3.0,
    rocketPart: {
      partType: RocketPartType.ENGINE,
      modelPath: '/models/medium_rocket_nozzlel.obj',
      texturePath: '/textures/rocket_parts/gas_core_engine.png',
      heightUnits: 1,
      modelScale: { x: 1.05, y: 1, z: 1.05 },
      engineRequirements: { minFuelTanks: 1, requiresCommandModule: true },
    },
  },
  [ItemType.FISSION_FRAGMENT_DRIVE]: {
    name: 'Fission-Fragment Drive',
    stackSize: 8,
    texture: '/textures/rocket_parts/fission_fragment_drive_face.png',
    mineTime: 3.0,
    rocketPart: {
      partType: RocketPartType.ENGINE,
      modelPath: '/models/medium_rocket_nozzlel.obj',
      texturePath: '/textures/rocket_parts/fission_fragment_drive.png',
      heightUnits: 1,
      modelScale: { x: 0.9, y: 1, z: 0.9 },
      engineRequirements: { minFuelTanks: 1, requiresCommandModule: true },
    },
  },
  [ItemType.NUCLEAR_PULSE_DRIVE]: {
    name: 'Nuclear Pulse Drive',
    stackSize: 8,
    texture: '/textures/rocket_parts/nuclear_pulse_drive_face.png',
    mineTime: 3.0,
    rocketPart: {
      partType: RocketPartType.ENGINE,
      modelPath: '/models/medium_rocket_nozzlel.obj',
      texturePath: '/textures/rocket_parts/nuclear_pulse_drive.png',
      heightUnits: 1,
      modelScale: { x: 1.25, y: 1, z: 1.25 },
      engineRequirements: { minFuelTanks: 1, requiresCommandModule: true },
    },
  },
  [ItemType.FUSION_DRIVE]: {
    name: 'D-He3 Fusion Drive',
    stackSize: 8,
    texture: '/textures/rocket_parts/fusion_drive_face.png',
    mineTime: 3.0,
    rocketPart: {
      partType: RocketPartType.ENGINE,
      modelPath: '/models/medium_rocket_nozzlel.obj',
      texturePath: '/textures/rocket_parts/fusion_drive.png',
      heightUnits: 1,
      modelScale: { x: 1.0, y: 1, z: 1.0 },
      engineRequirements: { minFuelTanks: 1, requiresCommandModule: true },
    },
  },
  [ItemType.FUSION_TORCH]: {
    name: 'Magnetic Fusion Torch',
    stackSize: 8,
    texture: '/textures/rocket_parts/fusion_torch_face.png',
    mineTime: 3.0,
    rocketPart: {
      partType: RocketPartType.ENGINE,
      modelPath: '/models/medium_rocket_nozzlel.obj',
      texturePath: '/textures/rocket_parts/fusion_torch.png',
      heightUnits: 1,
      modelScale: { x: 1.15, y: 1, z: 1.15 },
      engineRequirements: { minFuelTanks: 1, requiresCommandModule: true },
    },
  },
  [ItemType.RESIN]: { name: 'Resin', stackSize: 64, texture: '/textures/icons/resin.png', mineTime: 0.5 },
  [ItemType.SALVAGE]: { name: 'Salvage', stackSize: 64, texture: '/textures/icons/salvage.png', mineTime: 0.5 },
  [ItemType.SUPERCONDUCTOR]: { name: 'Superconductor', stackSize: 32, texture: '/textures/icons/superconductor.png', mineTime: 0.5 },
  [ItemType.RARE_EARTH_ORE]: { name: 'Rare-Earth Ore', stackSize: 64, texture: '/textures/icons/rare_earth_ore.png', mineTime: 0.5 },
  [ItemType.MAGNET]: { name: 'Magnet', stackSize: 32, texture: '/textures/icons/magnet.png', mineTime: 0.5 },
  [ItemType.RADIOTROPHIC_FUNGUS]: { name: 'Radiotrophic Fungus', stackSize: 64, texture: '/textures/icons/radiotrophic_fungus.png', mineTime: 0.5 },
  [ItemType.SILICA]: { name: 'Silica', stackSize: 64, texture: '/textures/icons/silica.png', mineTime: 0.5 },
  [ItemType.AEROGEL]: { name: 'Aerogel', stackSize: 32, texture: '/textures/icons/aerogel.png', mineTime: 0.5 },
  [ItemType.CRYSTAL]: { name: 'Crystal', stackSize: 64, texture: '/textures/icons/crystal.png', mineTime: 0.5 },
  [ItemType.LASER_CRYSTAL]: { name: 'Laser Crystal', stackSize: 16, texture: '/textures/icons/laser_crystal.png', mineTime: 0.5 },
  [ItemType.CRYO_COOLANT]: { name: 'Cryo Coolant', stackSize: 16, texture: '/textures/icons/cryo_coolant.png', mineTime: 0.5 },
  [ItemType.CORONAL_DATA]: { name: 'Coronal Field Data', stackSize: 8, texture: '/textures/icons/coronal_data.png', mineTime: 0.5 },
  [ItemType.PULSE_UNIT]: { name: 'Pulse Unit', stackSize: 64, texture: '/textures/icons/pulse_unit.png', mineTime: 0.5 },
  [ItemType.HELIUM_3]: { name: 'Helium-3', stackSize: 64, texture: '/textures/icons/helium_3.png', mineTime: 0.5 },
  [ItemType.DEUTERIUM]: { name: 'Deuterium', stackSize: 64, texture: '/textures/icons/deuterium.png', mineTime: 0.5 },
  [ItemType.METALLIC_HYDROGEN]: { name: 'Metallic Hydrogen', stackSize: 16, texture: '/textures/icons/metallic_hydrogen.png', mineTime: 0.5 },
  [ItemType.CERAMIC_PLATING]: { name: 'Ceramic Plating', stackSize: 32, texture: '/textures/icons/ceramic_plating.png', mineTime: 0.5 },
  [ItemType.MAGNETIC_COIL]: { name: 'Magnetic Coil', stackSize: 8, texture: '/textures/icons/magnetic_coil.png', mineTime: 0.5 },
  [ItemType.REFIT_KIT]: { name: 'Refit Kit', stackSize: 4, texture: '/textures/icons/refit_kit.png', mineTime: 0.5 },
  [ItemType.REFIT_KIT_MK2]: { name: 'Refit Kit Mk2', stackSize: 1, texture: '/textures/icons/refit_kit_mk2.png', mineTime: 0.5 },
  [ItemType.HEAT_SHIELD]: { name: 'Heat Shield', stackSize: 4, texture: '/textures/rocket_parts/heat_shield_face.png', mineTime: 0.5 },
  [ItemType.SURVEY_BEACON]: { name: 'Survey Beacon', stackSize: 16, texture: '/textures/technology/survey_beacon_face.png', mineTime: 1.0 },
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
    // rocket equipment (ROCKET_CONFIG.EQUIPMENT), not a part of the stack
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
    // rocket equipment (ROCKET_CONFIG.EQUIPMENT), not a part of the stack
  },
  [ItemType.EMPTY_TANK]: { name: 'Empty Tank', stackSize: 16, texture: '/textures/icons/empty_tank.png', mineTime: 0.5 },
  [ItemType.OXYGEN_TANK]: { name: 'Oxygen Tank', stackSize: 16, texture: '/textures/icons/oxygen_tank.png', mineTime: 0.5 },
  [ItemType.GAS_COLLECTOR]: { name: 'Gas Collector', stackSize: 8, texture: '/textures/technology/gas_collector_face.png', mineTime: 2.0 },
  [ItemType.SPACE_SUIT]: { name: 'Space Suit', stackSize: 1, texture: '/textures/icons/space_suit.png', mineTime: 0.5 },
  [ItemType.THERMAL_SUIT]: { name: 'Thermal Suit', stackSize: 1, texture: '/textures/icons/thermal_suit.png', mineTime: 0.5 },
  [ItemType.HARDENED_SUIT]: { name: 'Hardened Suit', stackSize: 1, texture: '/textures/icons/hardened_suit.png', mineTime: 0.5 },
  [ItemType.SUIT_HEATER]: { name: 'Suit Heater', stackSize: 1, texture: '/textures/icons/suit_heater.png', mineTime: 0.5 },
  [ItemType.SUIT_HEATER_MK2]: { name: 'Suit Heater Mk2', stackSize: 1, texture: '/textures/icons/suit_heater_mk2.png', mineTime: 0.5 },
  [ItemType.SOLAR_PANEL]: { name: 'Solar Panel', stackSize: 16, texture: '/textures/technology/solar_panel_face.png', mineTime: 1.5 },
  [ItemType.SOLAR_ARRAY]: {
    name: 'Solar Array',
    stackSize: 8,
    texture: '/textures/rocket_parts/solar_array_face.png',
    mineTime: 3.0,
    // rocket equipment (ROCKET_CONFIG.EQUIPMENT), not a part of the stack
  },
  // Tools (openspec tools-and-toolbox)
  [ItemType.ROCK_PICKAXE]: toolItem('rock', 'pickaxe'),
  [ItemType.ROCK_AXE]: toolItem('rock', 'axe'),
  [ItemType.ROCK_SHOVEL]: toolItem('rock', 'shovel'),
  [ItemType.COPPER_PICKAXE]: toolItem('copper', 'pickaxe'),
  [ItemType.COPPER_AXE]: toolItem('copper', 'axe'),
  [ItemType.COPPER_SHOVEL]: toolItem('copper', 'shovel'),
  [ItemType.IRON_PICKAXE]: toolItem('iron', 'pickaxe'),
  [ItemType.IRON_AXE]: toolItem('iron', 'axe'),
  [ItemType.IRON_SHOVEL]: toolItem('iron', 'shovel'),
  [ItemType.STEEL_PICKAXE]: toolItem('steel', 'pickaxe'),
  [ItemType.STEEL_AXE]: toolItem('steel', 'axe'),
  [ItemType.STEEL_SHOVEL]: toolItem('steel', 'shovel'),
  [ItemType.TITANIUM_PICKAXE]: toolItem('titanium', 'pickaxe'),
  [ItemType.TITANIUM_AXE]: toolItem('titanium', 'axe'),
  [ItemType.TITANIUM_SHOVEL]: toolItem('titanium', 'shovel'),
};

// Which tool digs a block, read off the item the block drops - the same
// item whose mineTime sets how long the dig takes (openspec
// tools-and-toolbox, design 2). Items not listed have no tool: they break
// at their own time whatever is in hand.
const I = ItemType;
export const DIG_WITH: Partial<Record<ItemType, ToolKind>> = {
  ...Object.fromEntries([
    I.STONE, I.ORE_COAL, I.ORE_COPPER, I.ORE_IRON, I.ORE_GOLD, I.ORE_LITHIUM, I.ORE_ALUMINUM,
    I.ORE_COBALT, I.ORE_TITANIUM, I.ORE_URANIUM, I.MOON_ROCK, I.BASALT, I.SULFUR, I.ICE, I.GLASS,
    I.BRICK_BLOCK, I.CONCRETE_BLOCK, I.STEEL_GIRDER, I.STEEL_GLASS,
  ].map(i => [i, 'pickaxe'])),
  ...Object.fromEntries([
    I.DIRT, I.GRASS, I.SAND, I.SNOW, I.SEQ_DIRT, I.SEQ_SAND, I.SEQ_SNOW, I.CLAY, I.OIL_SAND,
  ].map(i => [i, 'shovel'])),
  ...Object.fromEntries([I.WOOD, I.LOG, I.LEAVES].map(i => [i, 'axe'])),
};

// Inventory slot. `uses` is a tool's uses LEFT; absent means fresh (the
// "0 is fresh" sentinel of tenebris-rs ItemStack::dur), so slots and saves
// from before durability read as fresh tools, never broken ones.
export interface InventorySlot {
  itemType: ItemType;
  quantity: number;
  uses?: number;
}

/** Hotbar 0-8, bag 9-35, then the toolbox (one slot per TOOLBOX.KINDS). */
export const HOTBAR_SIZE = 9;
export const PACK_SLOTS = 36;
export const TOOLBOX_START = PACK_SLOTS;
export const TOOLBOX_SLOTS = TOOLBOX.KINDS.length;

/** Half a stack, rounded up: what a right-click picks up (7 -> 4, 1 -> 1). */
export function halfUp(quantity: number): number {
  return Math.ceil(quantity / 2);
}

/** A tool's kind and tier, or undefined for a non-tool. */
export function toolOf(item: ItemType): { kind: ToolKind; tier: ToolTier } | undefined {
  return ITEM_DATA[item]?.tool;
}

/** Uses a fresh tool has, or null for an item with no budget. */
export function toolMaxUses(item: ItemType): number | null {
  const t = toolOf(item);
  if (!t) return null;
  return t.tier === 'wood' ? ROD_USES : TOOL_TIERS[t.tier].uses;
}

/** Uses left on the tool in a slot, or null if it is not a tool. */
export function usesLeft(slot: InventorySlot): number | null {
  const max = toolMaxUses(slot.itemType);
  if (max === null || slot.quantity <= 0) return null;
  return slot.uses === undefined ? max : Math.max(0, Math.min(slot.uses, max));
}

/** Condition 0..1 (1 = fresh), or null for a non-tool: what the slot bar draws. */
export function toolCondition(slot: InventorySlot): number | null {
  const max = toolMaxUses(slot.itemType);
  const left = usesLeft(slot);
  return max === null || left === null ? null : left / max;
}

/** The toolbox kind a slot index holds, or null for a hotbar / bag slot. */
export function toolboxKindAt(index: number): ToolKind | null {
  const k = index - TOOLBOX_START;
  return k >= 0 && k < TOOLBOX_SLOTS ? TOOLBOX.KINDS[k] : null;
}

/** May `item` sit in slot `index`? Any item in the hotbar / bag; only a tool of the slot's kind in the toolbox. */
export function slotAccepts(index: number, item: ItemType): boolean {
  const kind = toolboxKindAt(index);
  return kind === null || item === ItemType.NONE || toolOf(item)?.kind === kind;
}

const emptySlot = (): InventorySlot => ({ itemType: ItemType.NONE, quantity: 0 });

// Set a slot object's contents in place (references held by the UI stay valid)
function assign(slot: InventorySlot, from: InventorySlot): void {
  slot.itemType = from.quantity > 0 ? from.itemType : ItemType.NONE;
  slot.quantity = from.quantity > 0 ? from.quantity : 0;
  if (from.uses !== undefined && slot.quantity > 0) slot.uses = from.uses;
  else delete slot.uses;
}

/**
 * Put a stack back into `all` (hotbar + bag + toolbox), starting at
 * `origin`: there if it fits, then onto the same item, then empty hotbar /
 * bag slots. Returns how many found no room.
 */
function stow(all: InventorySlot[], stack: InventorySlot, origin: number): number {
  let left = stack.quantity;
  const size = ITEM_DATA[stack.itemType].stackSize;
  const o = all[origin];
  if (o && slotAccepts(origin, stack.itemType) && o.itemType === ItemType.NONE) {
    assign(o, stack);
    return 0;
  }
  if (size > 1) {
    for (const i of [origin, ...Array.from({ length: PACK_SLOTS }, (_, k) => k)]) {
      const s = all[i];
      if (left <= 0 || !s || s.itemType !== stack.itemType) continue;
      const add = Math.min(left, size - s.quantity);
      if (add > 0) { s.quantity += add; left -= add; }
    }
  }
  for (let i = 0; i < PACK_SLOTS && left > 0; i++) {
    if (all[i].itemType !== ItemType.NONE) continue;
    const put = Math.min(left, size);
    assign(all[i], { itemType: stack.itemType, quantity: put, uses: stack.uses });
    left -= put;
  }
  return left;
}

export class Inventory {
  private slots: InventorySlot[];
  private toolbox: InventorySlot[];
  private selectedSlot: number = 0;
  private hotbarSize: number = HOTBAR_SIZE;
  private totalSlots: number = PACK_SLOTS; // 9 hotbar + 27 inventory
  // A stack picked up by a right-click split, waiting to be put down
  private held: { stack: InventorySlot; origin: number } | null = null;
  // The toolbox rod is out (in hand) - toggled by TOOLBOX.ROD_KEY
  private rodOut = false;

  constructor() {
    this.slots = [];
    for (let i = 0; i < this.totalSlots; i++) {
      this.slots.push(emptySlot());
    }
    this.toolbox = TOOLBOX.KINDS.map(emptySlot);

    // Inventory starts empty - items are obtained by mining
  }

  // Any slot by index: hotbar, bag, then toolbox
  private ref(index: number): InventorySlot | null {
    if (index >= 0 && index < this.totalSlots) return this.slots[index];
    const k = index - TOOLBOX_START;
    return k >= 0 && k < TOOLBOX_SLOTS ? this.toolbox[k] : null;
  }

  // Every slot, toolbox last (indices as ref)
  private everySlot(): InventorySlot[] {
    return [...this.slots, ...this.toolbox];
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

    // Then, try to fill empty slots (a new tool is fresh: no wear carried over)
    for (let i = 0; i < this.totalSlots && remaining > 0; i++) {
      const slot = this.slots[i];
      if (slot.itemType === ItemType.NONE) {
        const canAdd = Math.min(remaining, itemData.stackSize);
        assign(slot, { itemType, quantity: canAdd });
        remaining -= canAdd;
      }
    }

    return remaining;
  }

  /**
   * A tool just made: into the toolbox if it has no tool of that kind
   * ('toolbox'), else into the hotbar / bag ('inventory'), or 'full'.
   * A non-tool goes through addItem ('inventory' / 'full').
   */
  public giveTool(itemType: ItemType): 'toolbox' | 'inventory' | 'full' {
    const tool = toolOf(itemType);
    if (tool) {
      const box = this.toolbox[TOOLBOX.KINDS.indexOf(tool.kind)];
      if (box.itemType === ItemType.NONE) {
        assign(box, { itemType, quantity: 1 });
        return 'toolbox';
      }
    }
    return this.addItem(itemType, 1) === 0 ? 'inventory' : 'full';
  }

  // Set a specific slot's contents directly (fresh: no tool wear)
  public setSlot(slotIndex: number, itemType: ItemType, quantity: number): void {
    const slot = this.ref(slotIndex);
    if (!slot || !slotAccepts(slotIndex, itemType)) return;
    assign(slot, { itemType, quantity });
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
          assign(slot, emptySlot());
        }
      }
    }

    return removed;
  }

  // Check if inventory (hotbar + bag) has at least this many of an item
  public hasItem(itemType: ItemType, quantity: number): boolean {
    return this.getItemCount(itemType) >= quantity;
  }

  // Get count of item type (hotbar + bag; the toolbox's tools are in use, not stock)
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

  /** The toolbox's slots, in TOOLBOX.KINDS order (live references). */
  public getToolbox(): InventorySlot[] {
    return this.toolbox;
  }

  /** The slot index of the toolbox slot for a kind. */
  public toolboxIndex(kind: ToolKind): number {
    return TOOLBOX_START + TOOLBOX.KINDS.indexOf(kind);
  }

  // Get selected slot index
  public getSelectedSlot(): number {
    return this.selectedSlot;
  }

  // Set selected slot (picking a hotbar slot puts the toolbox rod away)
  public setSelectedSlot(slot: number): void {
    this.selectedSlot = Math.max(0, Math.min(this.hotbarSize - 1, slot));
    this.rodOut = false;
  }

  /** Take the toolbox rod out, or put it away. Returns whether it is out. */
  public toggleRod(): boolean {
    this.rodOut = !this.rodOut && this.toolbox[TOOLBOX.KINDS.indexOf('rod')].itemType !== ItemType.NONE;
    return this.rodOut;
  }

  /** Is the toolbox rod in hand? */
  public isRodOut(): boolean {
    return this.rodOut && this.toolbox[TOOLBOX.KINDS.indexOf('rod')].itemType !== ItemType.NONE;
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
        assign(slot, emptySlot());
      }
      return true;
    }
    return false;
  }

  /**
   * How many of each item the player has: hotbar, bag, toolbox and a held
   * stack (multiplayer's trade ledger measures a panel action by these -
   * openspec mp-shared-objects).
   */
  public itemCounts(): Map<number, number> {
    const out = new Map<number, number>();
    const add = (s: InventorySlot) => {
      if (s.itemType !== ItemType.NONE && s.quantity > 0) out.set(s.itemType, (out.get(s.itemType) ?? 0) + s.quantity);
    };
    for (const s of this.everySlot()) add(s);
    if (this.held) add(this.held.stack);
    return out;
  }

  /**
   * Undo a trade (itemType -> count the player gained; negative = gave):
   * take back what they gained, give back what they gave (hotbar first, then
   * the bag). Returns what could not be taken back (already used) and what
   * did not fit.
   */
  public undoTrade(gained: Record<number, number>): { missing: number; overflow: number } {
    let missing = 0, overflow = 0;
    for (const [k, n] of Object.entries(gained)) {
      const type = Number(k) as ItemType;
      if (n > 0) missing += n - this.removeItem(type, n);
      else if (n < 0) overflow += this.addItem(type, -n);
    }
    return { missing, overflow };
  }

  // Get all hotbar + bag slots (for inventory UI)
  public getAllSlots(): InventorySlot[] {
    return this.slots;
  }

  // Swap two slots (any index: hotbar, bag, toolbox); refused if a tool
  // would land in the wrong toolbox slot
  public swapSlots(fromIndex: number, toIndex: number): void {
    const from = this.ref(fromIndex);
    const to = this.ref(toIndex);
    if (!from || !to || fromIndex === toIndex) return;
    if (!slotAccepts(toIndex, from.itemType) || !slotAccepts(fromIndex, to.itemType)) return;
    const temp = { ...from };
    assign(from, to);
    assign(to, temp);
  }

  // Merge or swap slots - if same item type, combine up to its stack size,
  // leftovers stay in source. If different types (or unstackable, like
  // tools: two worn tools must never fuse), swap
  public mergeOrSwapSlots(fromIndex: number, toIndex: number): void {
    const fromSlot = this.ref(fromIndex);
    const toSlot = this.ref(toIndex);
    if (!fromSlot || !toSlot || fromIndex === toIndex) return;

    // If source is empty, nothing to do
    if (fromSlot.itemType === ItemType.NONE) {
      return;
    }

    const maxStack = ITEM_DATA[fromSlot.itemType].stackSize;

    // If same item type, merge stacks
    if (fromSlot.itemType === toSlot.itemType && maxStack > 1) {
      const totalQuantity = fromSlot.quantity + toSlot.quantity;
      if (totalQuantity <= maxStack) {
        // All items fit in target slot
        toSlot.quantity = totalQuantity;
        assign(fromSlot, emptySlot());
      } else {
        // Target slot fills up, leftovers stay in source
        toSlot.quantity = maxStack;
        fromSlot.quantity = totalQuantity - maxStack;
      }
      return;
    }

    // Empty target, different types or tools - move / swap
    this.swapSlots(fromIndex, toIndex);
  }

  // Get a specific slot by index (hotbar, bag or toolbox)
  public getSlot(index: number): InventorySlot | null {
    return this.ref(index);
  }

  // ---- right-click split: a stack held on the cursor ----------------------

  /** The stack held on the cursor, if any. */
  public getHeld(): InventorySlot | null {
    return this.held?.stack ?? null;
  }

  /** Pick up half of a slot's stack, rounded up. Returns the held stack, or null. */
  public takeHalf(index: number): InventorySlot | null {
    const slot = this.ref(index);
    if (this.held || !slot || slot.itemType === ItemType.NONE || slot.quantity <= 0) return null;
    const take = halfUp(slot.quantity);
    this.held = { stack: { itemType: slot.itemType, quantity: take, ...(slot.uses !== undefined ? { uses: slot.uses } : {}) }, origin: index };
    slot.quantity -= take;
    if (slot.quantity === 0) assign(slot, emptySlot());
    return this.held.stack;
  }

  /**
   * Put the held stack down on a slot: an empty slot takes it, the same
   * stackable item merges (up to its stack size, the rest stays held),
   * anything else swaps onto the cursor. False if nothing was held or the
   * slot refuses it (a toolbox slot of another kind).
   */
  public placeHeld(index: number): boolean {
    const slot = this.ref(index);
    if (!this.held || !slot || !slotAccepts(index, this.held.stack.itemType)) return false;
    const stack = this.held.stack;
    const size = ITEM_DATA[stack.itemType].stackSize;
    if (slot.itemType === ItemType.NONE) {
      assign(slot, stack);
      this.held = null;
    } else if (slot.itemType === stack.itemType && size > 1) {
      const add = Math.min(stack.quantity, size - slot.quantity);
      slot.quantity += add;
      stack.quantity -= add;
      if (stack.quantity <= 0) this.held = null;
    } else {
      const was = { ...slot };
      assign(slot, stack);
      this.held = { stack: was, origin: index };
    }
    return true;
  }

  /** Put the held stack back (panel closed). Returns how many found no room. */
  public returnHeld(): number {
    if (!this.held) return 0;
    const { stack, origin } = this.held;
    this.held = null;
    return stow(this.everySlot(), stack, origin);
  }

  // Export inventory state for saving: hotbar + bag, then the toolbox; a
  // tool's wear rides as `uses`. A stack held on the cursor is saved as if
  // put back, so closing the tab mid-split never loses it.
  public exportForSave(): { itemType: number; quantity: number; uses?: number }[] {
    const all = this.everySlot().map(s => ({ ...s }));
    if (this.held) stow(all, { ...this.held.stack }, this.held.origin);
    return all.map(slot => ({
      itemType: slot.itemType,
      quantity: slot.quantity,
      ...(slot.uses !== undefined && slot.quantity > 0 ? { uses: slot.uses } : {}),
    }));
  }

  // Import inventory state from save. Saves from before the toolbox have 36
  // slots (the toolbox stays empty) and no `uses` (every tool loads fresh).
  public importFromSave(data: { itemType: number; quantity: number; uses?: number }[]): void {
    this.held = null;
    for (let i = 0; i < Math.min(data.length, TOOLBOX_START + TOOLBOX_SLOTS); i++) {
      const slot = this.ref(i)!;
      const d = data[i];
      if (!slotAccepts(i, d.itemType as ItemType)) continue;
      const uses = typeof d.uses === 'number' && toolMaxUses(d.itemType as ItemType) !== null ? d.uses : undefined;
      assign(slot, { itemType: d.itemType as ItemType, quantity: d.quantity, uses });
    }
  }
}
