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
 * - `unlocks` are recipe outputs: locked until this mission is done. EVERY
 *   recipe (crafting grid, workbench, 3D printer, nuclear fabricator,
 *   campfire, kiln, oven, furnace and electric-furnace smelts) is locked in
 *   a new world until its mission is done, save the short STARTER_RECIPES
 *   list; each is named by exactly one mission (the test holds that);
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
 *   cooked      a campfire, kiln or oven makes `item`
 *   ate         eat `item` (a dish)
 *   pumped      a pump jack fills a tank
 *   refined     a refinery refines a batch of crude
 *   enriched    a centrifuge enriches uranium
 *   reactorBuilt place a fission reactor (off-world only)
 *   onBattery   a network keeps its machines running on battery charge
 *   fueled      refuel a rocket with `item`
 *   launchedWith take off in a rocket whose stack holds `item`
 *   sheared     shear a sheep
 *   chuteLanded land a rocket under an open parachute
 *   bottled     a gas collector fills an oxygen tank
 *   suited      seconds breathed from tank air while exposed
 *   recharged   swap a battery into a landed rocket
 * `distinct` counts different keys once each (kinds of fish, worlds).
 *
 * Text is shown in game: plain ASCII, short.
 */
export type ObjectiveKind =
  | 'gained' | 'crafted' | 'placed' | 'smelted' | 'padComplete' | 'assembled'
  | 'launched' | 'landed' | 'caught' | 'caughtOn' | 'reached'
  | 'cooked' | 'ate' | 'pumped' | 'refined' | 'enriched' | 'reactorBuilt'
  | 'onBattery' | 'fueled' | 'launchedWith'
  | 'sheared' | 'chuteLanded' | 'bottled' | 'suited' | 'recharged';

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
  | 'light' | 'fishing' | 'about'
  | 'cooking' | 'construction' | 'oil' | 'storage' | 'nuclear'
  | 'ranching' | 'air';

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
  { id: 'cooking', name: 'Clay and cooking' },
  { id: 'power', name: 'Power' },
  { id: 'storage', name: 'Power storage' },
  { id: 'electronics', name: 'Electronics' },
  { id: 'oil', name: 'Oil' },
  { id: 'rocketry', name: 'Rocketry' },
  { id: 'moon', name: 'The Moon and beyond' },
  { id: 'nuclear', name: 'Nuclear' },
  { id: 'light', name: 'Light and storage' },
  { id: 'construction', name: 'Construction' },
  { id: 'fishing', name: 'Fishing' },
  { id: 'about', name: 'Getting about' },
  { id: 'ranching', name: 'Wool and leather' },
  { id: 'air', name: 'Air and suits' },
];

const I = ItemType;

/**
 * The only recipes open in a new world: what the trunk's first missions
 * ask for (Make planks). Everything else waits on a mission.
 */
export const STARTER_RECIPES: ItemType[] = [I.WOOD, I.STICK];

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
    unlocks: [I.COAL, I.GLASS],
  },

  // ---- mining and smelting: the furnace's ores, ending in light metals
  {
    id: 'iron', branch: 'mining', icon: I.ORE_IRON, parent: 'furnace', title: 'Find ore', help: 'Iron and coal sit deeper in the rock. Craft coal from coal ore.',
    objectives: [
      { kind: 'gained', item: I.ORE_IRON, count: 3, label: 'Iron ore' },
      { kind: 'crafted', item: I.COAL, count: 8, label: 'Coal' },
    ],
    unlocks: [I.INGOT_IRON],
  },
  {
    id: 'ingots', branch: 'mining', icon: I.INGOT_IRON, parent: 'iron', title: 'Smelt iron', help: 'Put iron ore and coal in the furnace.',
    objectives: [{ kind: 'smelted', item: I.INGOT_IRON, count: 3, label: 'Iron ingots' }],
    unlocks: [I.BUCKET, I.INGOT_COPPER, I.SHEARS],
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
    unlocks: [I.CABLE, I.COPPER_PIPE, I.INGOT_ALUMINUM, I.INGOT_GOLD],
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
    unlocks: [I.ELECTRIC_FURNACE, I.HYDRO_GENERATOR, I.EMPTY_TANK, I.GAS_COLLECTOR],
  },
  {
    id: 'efurnace', branch: 'power', icon: I.ELECTRIC_FURNACE, parent: 'cables', title: 'Electric furnace', help: 'Place it on the cables.',
    objectives: [{ kind: 'placed', item: I.ELECTRIC_FURNACE, count: 1, label: 'Electric furnace' }],
    unlocks: [I.INGOT_LITHIUM, I.INGOT_COBALT],
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
    unlocks: [I.CPU_CHIP, I.RAM_MODULE, I.MOTHERBOARD, I.POWER_SUPPLY, I.PRINT_NOZZLE, I.BATTERY_LEAD_ACID],
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
    unlocks: [I.INGOT_TITANIUM],
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

  // ---- (appended: the ids below came with industry-and-nuclear. Order is
  // the "Now" order, so the main line above leads.)

  // ---- clay and cooking: the furnace fires clay, bricks build the kitchen
  {
    id: 'clay', branch: 'cooking', icon: I.CLAY, parent: 'furnace', title: 'Find clay', help: 'Dig clay on riverbanks and lake shores.',
    objectives: [{ kind: 'gained', item: I.CLAY, count: 4, label: 'Clay' }],
    unlocks: [I.BRICK],
  },
  {
    id: 'bricks', branch: 'cooking', icon: I.BRICK, parent: 'clay', title: 'Fire bricks', help: 'Smelt clay in the furnace.',
    objectives: [{ kind: 'smelted', item: I.BRICK, count: 4, label: 'Bricks' }],
    unlocks: [I.CAMPFIRE],
  },
  {
    id: 'campfire', branch: 'cooking', icon: I.CAMPFIRE, parent: 'bricks', title: 'Light a campfire', help: 'Craft a campfire from sticks and stone.',
    objectives: [{ kind: 'placed', item: I.CAMPFIRE, count: 1, label: 'Campfire' }],
    unlocks: [I.COOKED_FISH],
  },
  {
    id: 'cookfish', branch: 'cooking', icon: I.COOKED_FISH, parent: 'campfire', after: ['fish'], title: 'Cook a fish', help: 'Put a fish on the campfire.',
    objectives: [{ kind: 'cooked', item: I.COOKED_FISH, count: 1, label: 'Cooked fish' }],
    unlocks: [I.KILN],
  },
  {
    id: 'kiln', branch: 'cooking', icon: I.KILN, parent: 'cookfish', title: 'Build a kiln', help: 'Craft a kiln from bricks and place it.',
    objectives: [{ kind: 'placed', item: I.KILN, count: 1, label: 'Kiln' }],
    unlocks: [I.CLAY_POT],
  },
  {
    id: 'pot', branch: 'cooking', icon: I.CLAY_POT, parent: 'kiln', title: 'Make a pot', help: 'Fire clay in the kiln.',
    objectives: [{ kind: 'cooked', item: I.CLAY_POT, count: 1, label: 'Clay pot' }],
    unlocks: [I.OVEN],
  },
  {
    id: 'oven', branch: 'cooking', icon: I.OVEN, parent: 'pot', after: ['ingots'], title: 'Build an oven', help: 'Craft an oven from bricks and iron.',
    objectives: [{ kind: 'placed', item: I.OVEN, count: 1, label: 'Oven' }],
    unlocks: [I.FISH_STEW],
  },
  {
    id: 'stew', branch: 'cooking', icon: I.FISH_STEW, parent: 'oven', after: ['bucket'], title: 'Make fish stew', help: 'A fish, a water bucket and a pot in the oven.',
    objectives: [{ kind: 'cooked', item: I.FISH_STEW, count: 1, label: 'Fish stew' }],
    unlocks: [],
  },
  {
    id: 'eat', branch: 'cooking', icon: I.FISH_STEW, parent: 'stew', title: 'Eat well', help: 'Eat the stew: well fed, you dig faster.',
    objectives: [{ kind: 'ate', item: I.FISH_STEW, count: 1, label: 'Stew eaten' }],
    unlocks: [],
  },

  // ---- construction: clay, brick, concrete, then steel
  {
    id: 'clayblock', branch: 'construction', icon: I.CLAY, parent: 'chest', after: ['clay'], title: 'Build with clay', help: 'Place clay blocks.',
    objectives: [{ kind: 'placed', item: I.CLAY, count: 4, label: 'Clay blocks' }],
    unlocks: [I.BRICK_BLOCK],
  },
  {
    id: 'brickwall', branch: 'construction', icon: I.BRICK_BLOCK, parent: 'clayblock', title: 'Brick wall', help: 'Craft brick blocks from bricks and build a wall.',
    objectives: [{ kind: 'placed', item: I.BRICK_BLOCK, count: 8, label: 'Brick blocks' }],
    unlocks: [I.CEMENT],
  },
  {
    id: 'cement', branch: 'construction', icon: I.CEMENT, parent: 'brickwall', after: ['kiln'], title: 'Make cement', help: 'Burn clay with stone in the kiln.',
    objectives: [{ kind: 'cooked', item: I.CEMENT, count: 2, label: 'Cement' }],
    unlocks: [I.CONCRETE_BLOCK],
  },
  {
    id: 'concrete', branch: 'construction', icon: I.CONCRETE_BLOCK, parent: 'cement', after: ['bucket'], title: 'Pour concrete', help: 'Mix cement, sand, stone and water.',
    objectives: [{ kind: 'placed', item: I.CONCRETE_BLOCK, count: 8, label: 'Concrete blocks' }],
    unlocks: [I.STEEL_INGOT],
  },
  {
    id: 'steel', branch: 'construction', icon: I.STEEL_INGOT, parent: 'concrete', after: ['efurnace'], title: 'Make steel', help: 'Iron ingots with coal in the electric furnace.',
    objectives: [{ kind: 'smelted', item: I.STEEL_INGOT, count: 2, label: 'Steel ingots' }],
    unlocks: [I.STEEL_GIRDER],
  },
  {
    id: 'girders', branch: 'construction', icon: I.STEEL_GIRDER, parent: 'steel', title: 'Steel frame', help: 'Craft girders and raise a frame.',
    objectives: [{ kind: 'placed', item: I.STEEL_GIRDER, count: 4, label: 'Girders' }],
    unlocks: [I.STEEL_GLASS],
  },
  {
    id: 'steelglass', branch: 'construction', icon: I.STEEL_GLASS, parent: 'girders', title: 'Framed glass', help: 'Steel and glass make strong windows.',
    objectives: [{ kind: 'placed', item: I.STEEL_GLASS, count: 4, label: 'Steel glass' }],
    unlocks: [],
  },

  // ---- oil: crude from the deep, refined into kerosene and plastic
  {
    id: 'crude', branch: 'oil', icon: I.CRUDE_OIL_BUCKET, parent: 'chips', after: ['bucket'], title: 'Strike oil', help: 'Dig deep for oil sand and scoop it with a bucket.',
    objectives: [{ kind: 'gained', item: I.CRUDE_OIL_BUCKET, count: 1, label: 'Crude oil' }],
    unlocks: [I.PUMP_JACK],
  },
  {
    id: 'pumpjack', branch: 'oil', icon: I.PUMP_JACK, parent: 'crude', title: 'Pump jack', help: 'Place it on power over oil sand.',
    objectives: [
      { kind: 'placed', item: I.PUMP_JACK, count: 1, label: 'Pump jack' },
      { kind: 'pumped', count: 1, label: 'Oil pumped' },
    ],
    unlocks: [I.REFINERY],
  },
  {
    id: 'refinery', branch: 'oil', icon: I.REFINERY, parent: 'pumpjack', title: 'Refinery', help: 'Place a refinery on power.',
    objectives: [{ kind: 'placed', item: I.REFINERY, count: 1, label: 'Refinery' }],
    unlocks: [],
  },
  {
    id: 'kerosene', branch: 'oil', icon: I.KEROSENE, parent: 'refinery', title: 'Refine crude', help: 'Crude makes kerosene and plastic.',
    objectives: [
      { kind: 'refined', count: 1, label: 'Refined' },
      { kind: 'gained', item: I.PLASTIC, count: 2, label: 'Plastic' },
    ],
    unlocks: [],
  },
  {
    id: 'kerofuel', branch: 'oil', icon: I.KEROSENE, parent: 'kerosene', after: ['assemble'], title: 'Kerosene rocket', help: 'Fuel a rocket with kerosene.',
    objectives: [{ kind: 'fueled', item: I.KEROSENE, count: 1, label: 'Kerosene' }],
    unlocks: [],
  },

  // ---- power storage: denser batteries
  {
    id: 'leadacid', branch: 'storage', icon: I.BATTERY_LEAD_ACID, parent: 'raremetals', after: ['workbench'], title: 'Store power', help: 'Make a lead-acid battery and place it on a network.',
    objectives: [{ kind: 'placed', item: I.BATTERY_LEAD_ACID, count: 1, label: 'Lead-acid battery' }],
    unlocks: [],
  },
  {
    id: 'onbattery', branch: 'storage', icon: I.BATTERY_LEAD_ACID, parent: 'leadacid', title: 'Run on battery', help: 'Keep a machine running when the generators fall short.',
    objectives: [{ kind: 'onBattery', count: 1, label: 'On battery' }],
    unlocks: [I.BATTERY_LITHIUM],
  },
  {
    id: 'lithium', branch: 'storage', icon: I.BATTERY_LITHIUM, parent: 'onbattery', title: 'Lithium-ion', help: 'A denser cell from lithium and cobalt.',
    objectives: [{ kind: 'placed', item: I.BATTERY_LITHIUM, count: 1, label: 'Lithium-ion battery' }],
    unlocks: [I.BATTERY_SOLID_STATE],
  },
  {
    id: 'solidstate', branch: 'storage', icon: I.BATTERY_SOLID_STATE, parent: 'lithium', after: ['kerosene'], title: 'Solid-state', help: 'The densest cell: titanium and plastic.',
    objectives: [{ kind: 'placed', item: I.BATTERY_SOLID_STATE, count: 1, label: 'Solid-state battery' }],
    unlocks: [],
  },

  // ---- nuclear: off-world reactors and the engines they build
  {
    id: 'uranium', branch: 'nuclear', icon: I.ORE_URANIUM, parent: 'vacuum', after: ['lithium'], title: 'Find uranium', help: 'Mine deep on the Moon or Cinder.',
    objectives: [{ kind: 'gained', item: I.ORE_URANIUM, count: 4, label: 'Uranium ore' }],
    unlocks: [I.CENTRIFUGE],
  },
  {
    id: 'centrifuge', branch: 'nuclear', icon: I.CENTRIFUGE, parent: 'uranium', title: 'Enrich uranium', help: 'Spin the ore in a centrifuge on power.',
    objectives: [
      { kind: 'placed', item: I.CENTRIFUGE, count: 1, label: 'Centrifuge' },
      { kind: 'enriched', count: 1, label: 'Enriched' },
    ],
    unlocks: [I.FUEL_ROD],
  },
  {
    id: 'fuelrods', branch: 'nuclear', icon: I.FUEL_ROD, parent: 'centrifuge', title: 'Fuel rods', help: 'Make fuel rods at the workbench.',
    objectives: [{ kind: 'crafted', item: I.FUEL_ROD, count: 2, label: 'Fuel rods' }],
    unlocks: [I.REACTOR],
  },
  {
    id: 'reactor', branch: 'nuclear', icon: I.REACTOR, parent: 'fuelrods', title: 'Reactor off-world', help: 'Build a reactor on an airless world or in orbit.',
    objectives: [{ kind: 'reactorBuilt', count: 1, label: 'Reactor' }],
    unlocks: [I.NUCLEAR_FABRICATOR],
  },
  {
    id: 'fabricator', branch: 'nuclear', icon: I.NUCLEAR_FABRICATOR, parent: 'reactor', title: 'Nuclear fabricator', help: 'Place it on the reactor network.',
    objectives: [{ kind: 'placed', item: I.NUCLEAR_FABRICATOR, count: 1, label: 'Fabricator' }],
    unlocks: [I.NUCLEAR_THERMAL_ENGINE],
  },
  {
    id: 'ntr', branch: 'nuclear', icon: I.NUCLEAR_THERMAL_ENGINE, parent: 'fabricator', title: 'Nuclear engine', help: 'Fabricate a nuclear thermal engine.',
    objectives: [{ kind: 'crafted', item: I.NUCLEAR_THERMAL_ENGINE, count: 1, label: 'Nuclear engine' }],
    unlocks: [],
  },
  {
    id: 'ntrlaunch', branch: 'nuclear', icon: I.NUCLEAR_THERMAL_ENGINE, parent: 'ntr', title: 'Nuclear launch', help: 'Launch with the nuclear engine in the stack.',
    objectives: [{ kind: 'launchedWith', item: I.NUCLEAR_THERMAL_ENGINE, count: 1, label: 'Nuclear launch' }],
    unlocks: [I.REACTOR_CORE, I.ION_DRIVE, I.BATTERY_PACK],
  },
  {
    id: 'ioncore', branch: 'nuclear', icon: I.REACTOR_CORE, parent: 'ntrlaunch', after: ['solidstate'], title: 'Ion drive', help: 'Fabricate a reactor core and an ion drive.',
    objectives: [
      { kind: 'crafted', item: I.REACTOR_CORE, count: 1, label: 'Reactor core' },
      { kind: 'crafted', item: I.ION_DRIVE, count: 1, label: 'Ion drive' },
    ],
    unlocks: [],
  },
  {
    id: 'ionflight', branch: 'nuclear', icon: I.ION_DRIVE, parent: 'ioncore', title: 'Fly the ion drive', help: 'Launch with the ion drive and its reactor core.',
    objectives: [{ kind: 'launchedWith', item: I.ION_DRIVE, count: 1, label: 'Ion flight' }],
    unlocks: [],
  },

  // ---- wool and leather (openspec wool-air-and-reentry): Earth's sheep and cows
  {
    id: 'shear', branch: 'ranching', icon: I.WOOL, parent: 'ingots', title: 'Shear a sheep', help: 'Craft shears. Hold them and press F at a sheep.',
    objectives: [
      { kind: 'sheared', count: 1, label: 'Sheep shorn' },
      { kind: 'gained', item: I.WOOL, count: 4, label: 'Wool' },
    ],
    unlocks: [I.CARPET, I.WOOL_CLOTHING, I.PARACHUTE],
  },
  {
    id: 'carpet', branch: 'ranching', icon: I.CARPET, parent: 'shear', title: 'Lay a carpet', help: 'Craft carpet from wool and lay a floor.',
    objectives: [{ kind: 'placed', item: I.CARPET, count: 4, label: 'Carpet' }],
    unlocks: [],
  },
  {
    id: 'hide', branch: 'ranching', icon: I.LEATHER, parent: 'shear', title: 'Tan a hide', help: 'Hit a cow until it falls.',
    objectives: [{ kind: 'gained', item: I.LEATHER, count: 4, label: 'Leather' }],
    unlocks: [],
  },
  {
    id: 'clothes', branch: 'ranching', icon: I.WOOL_CLOTHING, parent: 'hide', title: 'Make clothes', help: 'Craft wool clothing.',
    objectives: [{ kind: 'crafted', item: I.WOOL_CLOTHING, count: 1, label: 'Wool clothing' }],
    unlocks: [],
  },

  // ---- air and suits: bottle air on Earth, wear it off-world
  {
    id: 'bottle', branch: 'air', icon: I.OXYGEN_TANK, parent: 'cables', title: 'Bottle air', help: 'Place a gas collector on power and fill empty tanks.',
    objectives: [
      { kind: 'placed', item: I.GAS_COLLECTOR, count: 1, label: 'Gas collector' },
      { kind: 'bottled', count: 2, label: 'Oxygen tanks' },
    ],
    unlocks: [I.SPACE_SUIT],
  },
  {
    id: 'suit', branch: 'air', icon: I.SPACE_SUIT, parent: 'bottle', after: ['clothes'], title: 'Suit up', help: 'Craft a space suit and put it on.',
    objectives: [{ kind: 'crafted', item: I.SPACE_SUIT, count: 1, label: 'Space suit' }],
    unlocks: [],
  },
  {
    id: 'spacewalk', branch: 'air', icon: I.MOON_ROCK, parent: 'suit', after: ['moon'], title: 'Walk in space', help: 'Breathe from your tanks on an airless world.',
    objectives: [{ kind: 'suited', count: 60, label: 'Seconds on tank air' }],
    unlocks: [],
  },

  // ---- rocketry, returning: a parachute landing and a fresh battery
  {
    id: 'chute', branch: 'rocketry', icon: I.PARACHUTE, parent: 'launch', after: ['shear'], title: 'Safe return', help: 'Add a parachute to the stack and land under it (P opens it).',
    objectives: [{ kind: 'chuteLanded', count: 1, label: 'Landed under a chute' }],
    unlocks: [],
  },
  {
    id: 'recharge', branch: 'rocketry', icon: I.BATTERY_LITHIUM, parent: 'moon', after: ['lithium'], title: 'Fresh battery', help: 'Right-click a landed rocket holding a lithium-ion battery.',
    objectives: [{ kind: 'recharged', count: 1, label: 'Battery swapped' }],
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
    { cardW: 18, cardH: 14, gapX: 4, gapY: 4, plaque: 11, font: 7, icon: 10, detail: 0 },    // the whole tree, deepest branch (nuclear) included
    { cardW: 24, cardH: 18, gapX: 6, gapY: 5, plaque: 12, font: 8, icon: 12, detail: 0 },    // icons only
    { cardW: 64, cardH: 30, gapX: 18, gapY: 12, plaque: 18, font: 10, icon: 16, detail: 0 },  // frames and icons
    { cardW: 120, cardH: 40, gapX: 24, gapY: 14, plaque: 20, font: 11, icon: 20, detail: 1 }, // icon and title
    { cardW: 170, cardH: 74, gapX: 30, gapY: 18, plaque: 22, font: 12, icon: 24, detail: 2 }, // + objectives
    { cardW: 210, cardH: 104, gapX: 36, gapY: 22, plaque: 22, font: 13, icon: 28, detail: 3 }, // + counts and unlocks
    { cardW: 250, cardH: 128, gapX: 44, gapY: 26, plaque: 24, font: 14, icon: 32, detail: 3 }, // full card
  ],
  START_LEVEL: 5,
  UNLOCK_ICON: 16,      // a card's unlock icons, px
  PAD: 24,              // margin round the tree, px
  PLAQUE_CHAR_W: 0.75,  // a branch plaque's width per character, in font sizes (packing)
  SIDE_W: 300,          // side panel width, px
  DRAG_SLOP_PX: 4,      // a click under this much movement opens a card
};
