import { ItemType } from '../player/Inventory';

/**
 * The mission tree (openspec navigation-and-orbits, missions; Pale Blue
 * Dot's "Missions are a tree that unlocks the tech"). It walks a player
 * through the tech tree: a trunk to the furnace, then branches that each
 * end in a payoff unlocking the next tier, and every recipe and smelt in
 * the game is unlocked by a mission or asked for by one
 * (scripts/missions.test.ts holds that).
 *
 * Rules:
 * - every mission but the first has exactly ONE parent (the line drawn);
 *   an extra need is a hidden `after` gate (no line);
 * - `unlocks` are recipe outputs: locked until this mission is done; a
 *   recipe no mission names is open from the start;
 * - ids are saved in worlds: never rename or reuse one.
 *
 * Objective kinds (counted only after the mission opens):
 *   gained      hold `count` more of `item` than when it opened
 *   crafted     make `item` at a crafting grid, workbench or printer
 *   placed      place `item` in the world
 *   smelted     a furnace or electric furnace makes `item`
 *   padComplete finish a 7-block launch pad
 *   assembled   put an engine, a tank and a command module on a pad
 *   launched    take off in a rocket
 *   landed      land a rocket on `body` ('*' = any body not in `exclude`)
 *   caught      land a fish (`item` = that species, or any)
 *   caughtOn    land a fish on `body` ('*' = any body not in `exclude`)
 *   reached     reach a waypoint set 200 m or more away
 * `distinct` counts different keys once each (kinds of fish, worlds).
 *
 * Text is shown in game: plain ASCII, short.
 */
export type ObjectiveKind =
  | 'gained' | 'crafted' | 'placed' | 'smelted' | 'padComplete' | 'assembled'
  | 'launched' | 'landed' | 'caught' | 'caughtOn' | 'reached';

export interface MissionObjective {
  kind: ObjectiveKind;
  item?: ItemType;
  body?: string;
  exclude?: string[];
  distinct?: boolean;
  count: number;
  label: string;
}

export type MissionBranch =
  | 'trunk' | 'mining' | 'power' | 'electronics' | 'rocketry' | 'moon'
  | 'light' | 'fishing' | 'about';

export interface Mission {
  id: string;
  branch: MissionBranch;
  icon: ItemType;            // its card's icon: that item's texture
  title: string;
  help: string;
  parent?: string;           // the one line drawn; none for the first
  after?: string[];          // hidden gates: also done before it opens
  objectives: MissionObjective[];
  unlocks: ItemType[];       // recipe outputs
}

/** Branch rows, top to bottom, with their plaque names. */
export const MISSION_BRANCHES: { id: MissionBranch; name: string }[] = [
  { id: 'trunk', name: 'Hands to fire' },
  { id: 'mining', name: 'Mining and smelting' },
  { id: 'power', name: 'Power' },
  { id: 'electronics', name: 'Electronics' },
  { id: 'rocketry', name: 'Rocketry' },
  { id: 'moon', name: 'The Moon and beyond' },
  { id: 'light', name: 'Light and storage' },
  { id: 'fishing', name: 'Fishing' },
  { id: 'about', name: 'Getting about' },
];

const I = ItemType;

// Order matters only for which open mission is "Now": the first open one.
export const MISSIONS: Mission[] = [
  // ---- the trunk: hands to the furnace
  {
    id: 'logs', branch: 'trunk', icon: I.LOG, title: 'Chop a tree', help: 'Hit a tree trunk until it falls.',
    objectives: [{ kind: 'gained', item: I.LOG, count: 4, label: 'Logs' }],
    unlocks: [],
  },
  {
    id: 'planks', branch: 'trunk', icon: I.WOOD, parent: 'logs', title: 'Make planks', help: 'Press E. Craft planks from logs, then sticks.',
    objectives: [
      { kind: 'crafted', item: I.WOOD, count: 4, label: 'Planks' },
      { kind: 'crafted', item: I.STICK, count: 4, label: 'Sticks' },
    ],
    unlocks: [I.FURNACE, I.TORCH, I.STORAGE_CHEST, I.FISHING_ROD],
  },
  {
    id: 'stone', branch: 'trunk', icon: I.STONE, parent: 'planks', title: 'Dig stone', help: 'Dig down through the dirt.',
    objectives: [{ kind: 'gained', item: I.STONE, count: 8, label: 'Stone' }],
    unlocks: [],
  },
  {
    id: 'furnace', branch: 'trunk', icon: I.FURNACE, parent: 'stone', title: 'Build a furnace', help: 'Craft a Furnace from stone and place it.',
    objectives: [
      { kind: 'crafted', item: I.FURNACE, count: 1, label: 'Furnace made' },
      { kind: 'placed', item: I.FURNACE, count: 1, label: 'Furnace placed' },
    ],
    unlocks: [],
  },

  // ---- mining and smelting: the furnace's ores, ending in light metals
  {
    id: 'iron', branch: 'mining', icon: I.ORE_IRON, parent: 'furnace', title: 'Find ore', help: 'Iron and coal sit deeper in the rock. Craft coal from coal ore.',
    objectives: [
      { kind: 'gained', item: I.ORE_IRON, count: 3, label: 'Iron ore' },
      { kind: 'crafted', item: I.COAL, count: 8, label: 'Coal' },
    ],
    unlocks: [],
  },
  {
    id: 'ingots', branch: 'mining', icon: I.INGOT_IRON, parent: 'iron', title: 'Smelt iron', help: 'Put iron ore and coal in the furnace.',
    objectives: [{ kind: 'smelted', item: I.INGOT_IRON, count: 3, label: 'Iron ingots' }],
    unlocks: [I.BUCKET],
  },
  {
    id: 'bucket', branch: 'mining', icon: I.WATER_BUCKET, parent: 'ingots', title: 'Carry water', help: 'Craft a bucket and fill it at water.',
    objectives: [
      { kind: 'crafted', item: I.BUCKET, count: 1, label: 'Bucket' },
      { kind: 'gained', item: I.WATER_BUCKET, count: 1, label: 'Water bucket' },
    ],
    unlocks: [],
  },
  {
    id: 'copper', branch: 'mining', icon: I.INGOT_COPPER, parent: 'ingots', title: 'Smelt copper', help: 'Find copper ore and smelt it.',
    objectives: [{ kind: 'smelted', item: I.INGOT_COPPER, count: 3, label: 'Copper ingots' }],
    unlocks: [I.CABLE, I.COPPER_PIPE],
  },
  {
    id: 'lightmetals', branch: 'mining', icon: I.INGOT_ALUMINUM, parent: 'copper', title: 'Light metals', help: 'Smelt aluminum and gold.',
    objectives: [
      { kind: 'smelted', item: I.INGOT_ALUMINUM, count: 3, label: 'Aluminum ingots' },
      { kind: 'smelted', item: I.INGOT_GOLD, count: 1, label: 'Gold ingot' },
    ],
    unlocks: [I.STEAM_ENGINE],
  },

  // ---- power: steam, cables and the electric furnace, ending in rare metals
  {
    id: 'steam', branch: 'power', icon: I.STEAM_ENGINE, parent: 'lightmetals', title: 'Steam power', help: 'Craft a steam engine and pipe water to it.',
    objectives: [
      { kind: 'placed', item: I.STEAM_ENGINE, count: 1, label: 'Steam engine' },
      { kind: 'placed', item: I.COPPER_PIPE, count: 2, label: 'Copper pipes' },
    ],
    unlocks: [],
  },
  {
    id: 'cables', branch: 'power', icon: I.CABLE, parent: 'steam', title: 'Wire it up', help: 'Run cables from the engine.',
    objectives: [{ kind: 'placed', item: I.CABLE, count: 4, label: 'Cables' }],
    unlocks: [I.ELECTRIC_FURNACE, I.HYDRO_GENERATOR],
  },
  {
    id: 'efurnace', branch: 'power', icon: I.ELECTRIC_FURNACE, parent: 'cables', title: 'Electric furnace', help: 'Place it on the cables.',
    objectives: [{ kind: 'placed', item: I.ELECTRIC_FURNACE, count: 1, label: 'Electric furnace' }],
    unlocks: [],
  },
  {
    id: 'raremetals', branch: 'power', icon: I.INGOT_COBALT, parent: 'efurnace', title: 'Rare metals', help: 'The electric furnace smelts lithium and cobalt.',
    objectives: [
      { kind: 'smelted', item: I.INGOT_LITHIUM, count: 2, label: 'Lithium ingots' },
      { kind: 'smelted', item: I.INGOT_COBALT, count: 2, label: 'Cobalt ingots' },
    ],
    unlocks: [I.ELECTRONICS_WORKBENCH],
  },
  {
    id: 'hydro', branch: 'power', icon: I.HYDRO_GENERATOR, parent: 'cables', title: 'Water power', help: 'Place a hydro generator in water.',
    objectives: [{ kind: 'placed', item: I.HYDRO_GENERATOR, count: 1, label: 'Hydro generator' }],
    unlocks: [],
  },

  // ---- electronics: the workbench's parts, ending in the 3D printer
  {
    id: 'workbench', branch: 'electronics', icon: I.ELECTRONICS_WORKBENCH, parent: 'raremetals', title: 'Electronics workbench', help: 'Craft one and place it on power.',
    objectives: [{ kind: 'placed', item: I.ELECTRONICS_WORKBENCH, count: 1, label: 'Workbench' }],
    unlocks: [I.CPU_CHIP, I.RAM_MODULE, I.MOTHERBOARD, I.POWER_SUPPLY, I.PRINT_NOZZLE],
  },
  {
    id: 'chips', branch: 'electronics', icon: I.CPU_CHIP, parent: 'workbench', title: 'Make chips', help: 'Make the parts at the workbench.',
    objectives: [
      { kind: 'crafted', item: I.CPU_CHIP, count: 1, label: 'CPU chip' },
      { kind: 'crafted', item: I.RAM_MODULE, count: 1, label: 'RAM module' },
      { kind: 'crafted', item: I.MOTHERBOARD, count: 1, label: 'Motherboard' },
      { kind: 'crafted', item: I.POWER_SUPPLY, count: 1, label: 'Power supply' },
    ],
    unlocks: [I.COMPUTER, I.PRINTER_3D],
  },
  {
    id: 'printer', branch: 'electronics', icon: I.PRINTER_3D, parent: 'chips', title: 'Build a 3D printer', help: 'Make a print nozzle, then the printer.',
    objectives: [
      { kind: 'crafted', item: I.PRINT_NOZZLE, count: 1, label: 'Print nozzle' },
      { kind: 'placed', item: I.PRINTER_3D, count: 1, label: '3D printer' },
    ],
    unlocks: [I.LAUNCH_PAD_BLOCK],
  },
  {
    id: 'glass', branch: 'electronics', icon: I.GLASS, parent: 'chips', title: 'Make glass', help: 'Craft glass from sand.',
    objectives: [{ kind: 'crafted', item: I.GLASS, count: 8, label: 'Glass' }],
    unlocks: [],
  },
  {
    id: 'computer', branch: 'electronics', icon: I.COMPUTER, parent: 'glass', title: 'Build a computer', help: 'Make it at the workbench and place it.',
    objectives: [{ kind: 'placed', item: I.COMPUTER, count: 1, label: 'Computer' }],
    unlocks: [],
  },

  // ---- rocketry: the pad and the rocket, ending on the Moon
  {
    id: 'padblocks', branch: 'rocketry', icon: I.LAUNCH_PAD_BLOCK, parent: 'printer', title: 'Print pad blocks', help: 'Print Launch Pad Blocks on the 3D printer.',
    objectives: [{ kind: 'gained', item: I.LAUNCH_PAD_BLOCK, count: 7, label: 'Launch pad blocks' }],
    unlocks: [],
  },
  {
    id: 'pad', branch: 'rocketry', icon: I.LAUNCH_PAD_BLOCK, parent: 'padblocks', title: 'Lay a launch pad', help: 'Place 7 blocks: one in the middle, 6 around it.',
    objectives: [{ kind: 'padComplete', count: 1, label: 'Launch pad' }],
    unlocks: [I.LAUNCH_PAD_SEGMENT],
  },
  {
    id: 'tower', branch: 'rocketry', icon: I.LAUNCH_PAD_SEGMENT, parent: 'pad', title: 'Raise the tower', help: 'Print tower segments.',
    objectives: [{ kind: 'gained', item: I.LAUNCH_PAD_SEGMENT, count: 3, label: 'Tower segments' }],
    unlocks: [I.ROCKET_ENGINE, I.MEDIUM_FUEL_TANK, I.COMMAND_MODULE, I.ROCKET_FUEL],
  },
  {
    id: 'parts', branch: 'rocketry', icon: I.ROCKET_ENGINE, parent: 'tower', title: 'Print rocket parts', help: 'Print them on the 3D printer.',
    objectives: [
      { kind: 'gained', item: I.ROCKET_ENGINE, count: 1, label: 'Rocket engine' },
      { kind: 'gained', item: I.MEDIUM_FUEL_TANK, count: 1, label: 'Fuel tank' },
      { kind: 'gained', item: I.COMMAND_MODULE, count: 1, label: 'Command module' },
    ],
    unlocks: [],
  },
  {
    id: 'assemble', branch: 'rocketry', icon: I.COMMAND_MODULE, parent: 'parts', title: 'Build the rocket', help: 'Open the pad: add the tower, then the parts.',
    objectives: [{ kind: 'assembled', count: 1, label: 'Rocket built' }],
    unlocks: [],
  },
  {
    id: 'launch', branch: 'rocketry', icon: I.ROCKET_FUEL, parent: 'assemble', title: 'Launch', help: 'Fuel the rocket, board it and throttle up.',
    objectives: [{ kind: 'launched', count: 1, label: 'Lift off' }],
    unlocks: [I.CARGO_BAY],
  },
  {
    id: 'moon', branch: 'rocketry', icon: I.MOON_ROCK, parent: 'launch', title: 'Land on the Moon', help: 'Fly to the Moon and land on your engine.',
    objectives: [{ kind: 'landed', body: 'moon', count: 1, label: 'Moon' }],
    unlocks: [I.VACUUM_ENGINE, I.LARGE_FUEL_TANK],
  },
  {
    id: 'cargo', branch: 'rocketry', icon: I.CARGO_BAY, parent: 'launch', title: 'Cargo bay', help: 'Print a cargo bay from a storage chest.',
    objectives: [{ kind: 'gained', item: I.CARGO_BAY, count: 1, label: 'Cargo bay' }],
    unlocks: [],
  },

  // ---- the Moon and beyond: the vacuum tier, then other worlds
  {
    id: 'moonmetal', branch: 'moon', icon: I.ORE_TITANIUM, parent: 'moon', title: 'Moon metal', help: 'Mine titanium ore on the Moon.',
    objectives: [{ kind: 'gained', item: I.ORE_TITANIUM, count: 3, label: 'Titanium ore' }],
    unlocks: [],
  },
  {
    id: 'titanium', branch: 'moon', icon: I.INGOT_TITANIUM, parent: 'moonmetal', title: 'Smelt titanium', help: 'Smelt the ore.',
    objectives: [{ kind: 'smelted', item: I.INGOT_TITANIUM, count: 3, label: 'Titanium ingots' }],
    unlocks: [],
  },
  {
    id: 'vacuum', branch: 'moon', icon: I.VACUUM_ENGINE, parent: 'titanium', title: 'Vacuum engine', help: 'Print a vacuum engine and a large tank.',
    objectives: [
      { kind: 'gained', item: I.VACUUM_ENGINE, count: 1, label: 'Vacuum engine' },
      { kind: 'gained', item: I.LARGE_FUEL_TANK, count: 1, label: 'Large fuel tank' },
    ],
    unlocks: [],
  },
  {
    id: 'icefuel', branch: 'moon', icon: I.ICE, parent: 'vacuum', title: 'Ice fuel', help: 'Craft rocket fuel from ice or snow.',
    objectives: [{ kind: 'crafted', item: I.ROCKET_FUEL, count: 3, label: 'Rocket fuel' }],
    unlocks: [],
  },
  {
    id: 'sequoia', branch: 'moon', icon: I.SEQ_DIRT, parent: 'icefuel', title: 'Another world', help: 'Fly to Sequoia and land.',
    objectives: [{ kind: 'landed', body: 'sequoia', count: 1, label: 'Sequoia' }],
    unlocks: [],
  },
  {
    id: 'explorer', branch: 'moon', icon: I.ROCKET_ENGINE, parent: 'sequoia', title: 'Explorer', help: 'Land on three more worlds.',
    objectives: [{ kind: 'landed', body: '*', exclude: ['earth', 'moon', 'sequoia'], distinct: true, count: 3, label: 'Worlds' }],
    unlocks: [],
  },

  // ---- light and storage: using what the planks unlocked
  {
    id: 'torches', branch: 'light', icon: I.TORCH, parent: 'furnace', title: 'Light the night', help: 'Craft torches and place them.',
    objectives: [{ kind: 'placed', item: I.TORCH, count: 4, label: 'Torches' }],
    unlocks: [],
  },
  {
    id: 'chest', branch: 'light', icon: I.STORAGE_CHEST, parent: 'torches', title: 'Store things', help: 'Craft a storage chest and place it.',
    objectives: [{ kind: 'placed', item: I.STORAGE_CHEST, count: 1, label: 'Storage chest' }],
    unlocks: [],
  },

  // ---- fishing (src/player/Fishing.ts): each world has its own fish
  {
    id: 'rod', branch: 'fishing', icon: I.FISHING_ROD, parent: 'planks', title: 'Make a fishing rod', help: 'Craft a rod from sticks.',
    objectives: [{ kind: 'crafted', item: I.FISHING_ROD, count: 1, label: 'Fishing rod' }],
    unlocks: [],
  },
  {
    id: 'fish', branch: 'fishing', icon: I.FISH_MINNOW, parent: 'rod', title: 'Catch fish', help: 'Hold to cast. Strike when the float goes under, then reel.',
    objectives: [{ kind: 'caught', count: 3, label: 'Fish' }],
    unlocks: [],
  },
  {
    id: 'fishkinds', branch: 'fishing', icon: I.FISH_PERCH, parent: 'fish', title: 'Three kinds of fish', help: 'Deeper water holds other fish.',
    objectives: [{ kind: 'caught', distinct: true, count: 3, label: 'Kinds' }],
    unlocks: [],
  },
  {
    id: 'alienfish', branch: 'fishing', icon: I.FISH_SERPENT, parent: 'fishkinds', after: ['moon'], title: 'Fish another world', help: 'Catch a fish on a world other than Earth.',
    objectives: [{ kind: 'caughtOn', body: '*', exclude: ['earth'], count: 1, label: 'Alien fish' }],
    unlocks: [],
  },

  // ---- getting about
  {
    id: 'map', branch: 'about', icon: I.GRASS, parent: 'furnace', title: 'Read the map', help: 'Press E, open Map, right-click a place 200 m away and walk there.',
    objectives: [{ kind: 'reached', count: 1, label: 'Waypoint' }],
    unlocks: [],
  },
];

// How often (s) held items are read for "gained" objectives
export const MISSION_SAMPLE_S = 0.5;
// A waypoint counts as reached within this distance (m), if it was set at
// least REACH_SET_FAR_M from where the player stood (PBD G3)
export const REACH_RADIUS_M = 8;
export const REACH_SET_FAR_M = 200;

/** The tree panel's designed zoom levels (whole px, never a CSS scale). */
export const MISSION_TREE_UI = {
  LEVELS: [
    { cardW: 24, cardH: 18, gapX: 6, gapY: 5, plaque: 12, font: 8, icon: 12, detail: 0 },    // the whole tree: icons only
    { cardW: 64, cardH: 30, gapX: 18, gapY: 12, plaque: 18, font: 10, icon: 16, detail: 0 },  // frames and icons
    { cardW: 120, cardH: 40, gapX: 24, gapY: 14, plaque: 20, font: 11, icon: 20, detail: 1 }, // icon and title
    { cardW: 170, cardH: 74, gapX: 30, gapY: 18, plaque: 22, font: 12, icon: 24, detail: 2 }, // + objectives
    { cardW: 210, cardH: 104, gapX: 36, gapY: 22, plaque: 22, font: 13, icon: 28, detail: 3 }, // + counts and unlocks
    { cardW: 250, cardH: 128, gapX: 44, gapY: 26, plaque: 24, font: 14, icon: 32, detail: 3 }, // full card
  ],
  START_LEVEL: 4,
  PAD: 24,              // margin round the tree, px
  PLAQUE_CHAR_W: 0.75,  // a branch plaque's width per character, in font sizes (packing)
  SIDE_W: 300,          // side panel width, px
  DRAG_SLOP_PX: 4,      // a click under this much movement opens a card
};
