import { emitGameEvent } from '../engine/GameEvents';
import { recipeLockedBy, recipeOpen } from './RecipeGate';
import { Inventory, ItemType, ITEM_DATA, InventorySlot, toolOf, TOOLBOX_START, TOOLBOX_SLOTS, toolboxKindAt } from './Inventory';
import { renderDurability, slotTooltip } from './ToolUI';
import { showToast } from '../utils/toast';
import { TOOLBOX } from '../config/ToolConfig';
import { getAssetPath } from '../utils/assetPath';
import { MenuManager } from './MenuManager';
import { PlayerConfig } from '../config/PlayerConfig';

// Crafting recipe definition
// For shaped recipes, use 'slots' to specify which grid positions (0-8 for 3x3)
// For shapeless recipes, just use 'inputs' (will display in first available slots)
export interface CraftingRecipe {
  inputs: { itemType: ItemType; quantity: number; slot?: number }[];
  output: { itemType: ItemType; quantity: number };
  name: string;
  // An item handed back alongside the output (an emptied bucket)
  returns?: { itemType: ItemType; quantity: number };
}

// Tools (openspec tools-and-toolbox): each tier's material over two sticks
//  MMM      MM.      .M.
//  .S.      MS.      .S.
//  .S.      .S.      .S.
//  pickaxe  axe      shovel
const TOOL_MATERIALS: [string, ItemType][] = [
  ['ROCK', ItemType.STONE],
  ['COPPER', ItemType.INGOT_COPPER],
  ['IRON', ItemType.INGOT_IRON],
  ['STEEL', ItemType.STEEL_INGOT],
  ['TITANIUM', ItemType.INGOT_TITANIUM],
];
const TOOL_HEAD_SLOTS: [string, number[]][] = [['PICKAXE', [0, 1, 2]], ['AXE', [0, 1, 3]], ['SHOVEL', [1]]];
export const TOOL_RECIPES: CraftingRecipe[] = TOOL_MATERIALS.flatMap(([tier, material]) =>
  TOOL_HEAD_SLOTS.map(([kind, head]) => {
    const output = ItemType[`${tier}_${kind}` as keyof typeof ItemType];
    return {
      name: ITEM_DATA[output].name,
      inputs: [
        ...head.map(slot => ({ itemType: material, quantity: 1, slot })),
        { itemType: ItemType.STICK, quantity: 1, slot: 4 },
        { itemType: ItemType.STICK, quantity: 1, slot: 7 },
      ],
      output: { itemType: output, quantity: 1 },
    };
  }));

// All crafting recipes in the game
// Grid layout (3x3):
//   0 1 2
//   3 4 5
//   6 7 8
export const CRAFTING_RECIPES: CraftingRecipe[] = [
  // Wood processing
  {
    name: 'Wood Planks',
    inputs: [{ itemType: ItemType.LOG, quantity: 1, slot: 4 }], // Center
    output: { itemType: ItemType.WOOD, quantity: 4 },
  },
  {
    name: 'Sticks',
    inputs: [
      { itemType: ItemType.WOOD, quantity: 1, slot: 1 }, // Top center
      { itemType: ItemType.WOOD, quantity: 1, slot: 4 }, // Center
    ],
    output: { itemType: ItemType.STICK, quantity: 4 },
  },
  // Coal processing
  {
    name: 'Coal',
    inputs: [{ itemType: ItemType.ORE_COAL, quantity: 1, slot: 4 }], // Center
    output: { itemType: ItemType.COAL, quantity: 8 },
  },
  // Torch crafting (stick with coal on top)
  {
    name: 'Torch',
    inputs: [
      { itemType: ItemType.COAL, quantity: 1, slot: 1 },  // Top center
      { itemType: ItemType.STICK, quantity: 1, slot: 4 }, // Center
    ],
    output: { itemType: ItemType.TORCH, quantity: 4 },
  },
  // Fishing Rod (3 sticks diagonal + 2 string, but for now just 3 sticks vertical)
  {
    name: 'Fishing Rod',
    inputs: [
      { itemType: ItemType.STICK, quantity: 1, slot: 1 }, // Top center
      { itemType: ItemType.STICK, quantity: 1, slot: 4 }, // Center
      { itemType: ItemType.STICK, quantity: 1, slot: 7 }, // Bottom center
    ],
    output: { itemType: ItemType.FISHING_ROD, quantity: 1 },
  },
  // Furnace (8 stones in a ring pattern)
  {
    name: 'Furnace',
    inputs: [
      { itemType: ItemType.STONE, quantity: 1, slot: 0 },
      { itemType: ItemType.STONE, quantity: 1, slot: 1 },
      { itemType: ItemType.STONE, quantity: 1, slot: 2 },
      { itemType: ItemType.STONE, quantity: 1, slot: 3 },
      { itemType: ItemType.STONE, quantity: 1, slot: 5 },
      { itemType: ItemType.STONE, quantity: 1, slot: 6 },
      { itemType: ItemType.STONE, quantity: 1, slot: 7 },
      { itemType: ItemType.STONE, quantity: 1, slot: 8 },
    ],
    output: { itemType: ItemType.FURNACE, quantity: 1 },
  },
  // Storage Chest (8 wood in a ring pattern)
  {
    name: 'Storage Chest',
    inputs: [
      { itemType: ItemType.WOOD, quantity: 1, slot: 0 },
      { itemType: ItemType.WOOD, quantity: 1, slot: 1 },
      { itemType: ItemType.WOOD, quantity: 1, slot: 2 },
      { itemType: ItemType.WOOD, quantity: 1, slot: 3 },
      { itemType: ItemType.WOOD, quantity: 1, slot: 5 },
      { itemType: ItemType.WOOD, quantity: 1, slot: 6 },
      { itemType: ItemType.WOOD, quantity: 1, slot: 7 },
      { itemType: ItemType.WOOD, quantity: 1, slot: 8 },
    ],
    output: { itemType: ItemType.STORAGE_CHEST, quantity: 1 },
  },
  // Cooking stations (src/config/CookingConfig.ts)
  // Campfire: sticks crossed over a ring of stones
  //  .S.
  //  S.S
  //  TTT   (S stick, T stone)
  {
    name: 'Campfire',
    inputs: [
      { itemType: ItemType.STICK, quantity: 1, slot: 1 },
      { itemType: ItemType.STICK, quantity: 1, slot: 3 },
      { itemType: ItemType.STICK, quantity: 1, slot: 5 },
      { itemType: ItemType.STONE, quantity: 1, slot: 6 },
      { itemType: ItemType.STONE, quantity: 1, slot: 7 },
      { itemType: ItemType.STONE, quantity: 1, slot: 8 },
    ],
    output: { itemType: ItemType.CAMPFIRE, quantity: 1 },
  },
  // Kiln: a ring of bricks (bricks are fired clay, from the furnace)
  {
    name: 'Kiln',
    inputs: [
      { itemType: ItemType.BRICK, quantity: 1, slot: 0 },
      { itemType: ItemType.BRICK, quantity: 1, slot: 1 },
      { itemType: ItemType.BRICK, quantity: 1, slot: 2 },
      { itemType: ItemType.BRICK, quantity: 1, slot: 3 },
      { itemType: ItemType.BRICK, quantity: 1, slot: 5 },
      { itemType: ItemType.BRICK, quantity: 1, slot: 6 },
      { itemType: ItemType.BRICK, quantity: 1, slot: 7 },
      { itemType: ItemType.BRICK, quantity: 1, slot: 8 },
    ],
    output: { itemType: ItemType.KILN, quantity: 1 },
  },
  // Oven: bricks round an iron plate
  //  BBB
  //  BIB
  //  BBB
  {
    name: 'Oven',
    inputs: [
      { itemType: ItemType.BRICK, quantity: 1, slot: 0 },
      { itemType: ItemType.BRICK, quantity: 1, slot: 1 },
      { itemType: ItemType.BRICK, quantity: 1, slot: 2 },
      { itemType: ItemType.BRICK, quantity: 1, slot: 3 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 4 },
      { itemType: ItemType.BRICK, quantity: 1, slot: 5 },
      { itemType: ItemType.BRICK, quantity: 1, slot: 6 },
      { itemType: ItemType.BRICK, quantity: 1, slot: 7 },
      { itemType: ItemType.BRICK, quantity: 1, slot: 8 },
    ],
    output: { itemType: ItemType.OVEN, quantity: 1 },
  },
  // Steam Engine (iron frame with copper and aluminum core)
  // III
  // CAC
  // III
  {
    name: 'Steam Engine',
    inputs: [
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 0 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 1 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 2 },
      { itemType: ItemType.INGOT_COPPER, quantity: 1, slot: 3 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 4 },
      { itemType: ItemType.INGOT_COPPER, quantity: 1, slot: 5 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 6 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 7 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 8 },
    ],
    output: { itemType: ItemType.STEAM_ENGINE, quantity: 1 },
  },
  // Hydro Generator (iron frame with aluminum core)
  // III
  // AAA
  // III
  {
    name: 'Hydro Generator',
    inputs: [
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 0 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 1 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 2 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 3 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 4 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 5 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 6 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 7 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 8 },
    ],
    output: { itemType: ItemType.HYDRO_GENERATOR, quantity: 1 },
  },
  // Copper Pipe (1 copper ingot = 4 pipes)
  {
    name: 'Copper Pipe',
    inputs: [
      { itemType: ItemType.INGOT_COPPER, quantity: 1, slot: 4 }, // Center
    ],
    output: { itemType: ItemType.COPPER_PIPE, quantity: 4 },
  },
  // Cable (3 copper ingots in a row = 8 cables)
  // ---
  // CCC
  // ---
  {
    name: 'Cable',
    inputs: [
      { itemType: ItemType.INGOT_COPPER, quantity: 1, slot: 3 }, // Middle left
      { itemType: ItemType.INGOT_COPPER, quantity: 1, slot: 4 }, // Middle center
      { itemType: ItemType.INGOT_COPPER, quantity: 1, slot: 5 }, // Middle right
    ],
    output: { itemType: ItemType.CABLE, quantity: 8 },
  },
  // Electric Furnace (iron frame with aluminum sides and copper center)
  // III
  // ACA
  // III
  {
    name: 'Electric Furnace',
    inputs: [
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 0 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 1 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 2 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 3 },
      { itemType: ItemType.INGOT_COPPER, quantity: 1, slot: 4 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 5 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 6 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 7 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 8 },
    ],
    output: { itemType: ItemType.ELECTRIC_FURNACE, quantity: 1 },
  },
  // Electronics Workbench (aluminum frame with copper sides and cobalt center)
  // AAA
  // CCoC
  // AAA
  {
    name: 'Electronics Workbench',
    inputs: [
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 0 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 1 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 2 },
      { itemType: ItemType.INGOT_COPPER, quantity: 1, slot: 3 },
      { itemType: ItemType.INGOT_COBALT, quantity: 1, slot: 4 },
      { itemType: ItemType.INGOT_COPPER, quantity: 1, slot: 5 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 6 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 7 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 8 },
    ],
    output: { itemType: ItemType.ELECTRONICS_WORKBENCH, quantity: 1 },
  },
  // Glass (9 sand = 8 glass)
  // SSS
  // SSS
  // SSS
  {
    name: 'Glass',
    inputs: [
      { itemType: ItemType.SAND, quantity: 1, slot: 0 },
      { itemType: ItemType.SAND, quantity: 1, slot: 1 },
      { itemType: ItemType.SAND, quantity: 1, slot: 2 },
      { itemType: ItemType.SAND, quantity: 1, slot: 3 },
      { itemType: ItemType.SAND, quantity: 1, slot: 4 },
      { itemType: ItemType.SAND, quantity: 1, slot: 5 },
      { itemType: ItemType.SAND, quantity: 1, slot: 6 },
      { itemType: ItemType.SAND, quantity: 1, slot: 7 },
      { itemType: ItemType.SAND, quantity: 1, slot: 8 },
    ],
    output: { itemType: ItemType.GLASS, quantity: 8 },
  },
  // Rocket fuel: water ice split into hydrogen and oxygen. Ice is found on
  // Earth's poles, the ice caps of the Moon and the other rock worlds, and
  // in their rock; snow (a row of three) works too. Ice also refuels a
  // rocket raw (ROCKET_CONFIG.FUEL_SOURCES: 8 units an Ice); refined, two
  // Ice make one 25-unit Rocket Fuel - more fuel, and far less to carry.
  //  .I.
  //  .I.
  {
    name: 'Rocket Fuel (ice)',
    inputs: [
      { itemType: ItemType.ICE, quantity: 1, slot: 1 },
      { itemType: ItemType.ICE, quantity: 1, slot: 4 },
    ],
    output: { itemType: ItemType.ROCKET_FUEL, quantity: 1 },
  },
  //  SSS
  {
    name: 'Rocket Fuel (snow)',
    inputs: [
      { itemType: ItemType.SNOW, quantity: 1, slot: 3 },
      { itemType: ItemType.SNOW, quantity: 1, slot: 4 },
      { itemType: ItemType.SNOW, quantity: 1, slot: 5 },
    ],
    output: { itemType: ItemType.ROCKET_FUEL, quantity: 1 },
  },
  // Bucket: three iron ingots in a V. Fill it at water, refuel with it
  //  ...
  //  I.I
  //  .I.
  {
    name: 'Bucket',
    inputs: [
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 3 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 5 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 7 },
    ],
    output: { itemType: ItemType.BUCKET, quantity: 1 },
  },
  {
    name: 'Rocket Fuel (Sequoia snow)',
    inputs: [
      { itemType: ItemType.SEQ_SNOW, quantity: 1, slot: 3 },
      { itemType: ItemType.SEQ_SNOW, quantity: 1, slot: 4 },
      { itemType: ItemType.SEQ_SNOW, quantity: 1, slot: 5 },
    ],
    output: { itemType: ItemType.ROCKET_FUEL, quantity: 1 },
  },
  // Building materials
  // Brick Block: four fired bricks in a square
  //  BB.
  //  BB.
  //  ...
  {
    name: 'Brick Block',
    inputs: [
      { itemType: ItemType.BRICK, quantity: 1, slot: 0 },
      { itemType: ItemType.BRICK, quantity: 1, slot: 1 },
      { itemType: ItemType.BRICK, quantity: 1, slot: 3 },
      { itemType: ItemType.BRICK, quantity: 1, slot: 4 },
    ],
    output: { itemType: ItemType.BRICK_BLOCK, quantity: 1 },
  },
  // Concrete: cement mixed with sand, stone and a bucket of water; the
  // empty bucket comes back
  //  .W.
  //  SCS
  //  R.R
  {
    name: 'Concrete',
    inputs: [
      { itemType: ItemType.WATER_BUCKET, quantity: 1, slot: 1 },
      { itemType: ItemType.SAND, quantity: 1, slot: 3 },
      { itemType: ItemType.CEMENT, quantity: 1, slot: 4 },
      { itemType: ItemType.SAND, quantity: 1, slot: 5 },
      { itemType: ItemType.STONE, quantity: 1, slot: 6 },
      { itemType: ItemType.STONE, quantity: 1, slot: 8 },
    ],
    output: { itemType: ItemType.CONCRETE_BLOCK, quantity: 4 },
    returns: { itemType: ItemType.BUCKET, quantity: 1 },
  },
  // Steel Girder: two steel ingots, top and bottom
  //  .S.
  //  ...
  //  .S.
  {
    name: 'Steel Girder',
    inputs: [
      { itemType: ItemType.STEEL_INGOT, quantity: 1, slot: 1 },
      { itemType: ItemType.STEEL_INGOT, quantity: 1, slot: 7 },
    ],
    output: { itemType: ItemType.STEEL_GIRDER, quantity: 4 },
  },
  // Steel Glass: a steel frame between two panes
  //  ...
  //  GSG
  //  ...
  {
    name: 'Steel Glass',
    inputs: [
      { itemType: ItemType.GLASS, quantity: 1, slot: 3 },
      { itemType: ItemType.STEEL_INGOT, quantity: 1, slot: 4 },
      { itemType: ItemType.GLASS, quantity: 1, slot: 5 },
    ],
    output: { itemType: ItemType.STEEL_GLASS, quantity: 2 },
  },
  // ---- Wool, air and re-entry (openspec wool-air-and-reentry) ----
  // Shears: two iron ingots, offset
  //  .I.
  //  I..
  {
    name: 'Shears',
    inputs: [
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 1 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 3 },
    ],
    output: { itemType: ItemType.SHEARS, quantity: 1 },
  },
  // Carpet: 4 wool in a square
  {
    name: 'Carpet',
    inputs: [
      { itemType: ItemType.WOOL, quantity: 1, slot: 0 },
      { itemType: ItemType.WOOL, quantity: 1, slot: 1 },
      { itemType: ItemType.WOOL, quantity: 1, slot: 3 },
      { itemType: ItemType.WOOL, quantity: 1, slot: 4 },
    ],
    output: { itemType: ItemType.CARPET, quantity: 4 },
  },
  // Wool clothing: a shirt
  //  W.W
  //  WWW
  {
    name: 'Wool Clothing',
    inputs: [
      { itemType: ItemType.WOOL, quantity: 1, slot: 0 },
      { itemType: ItemType.WOOL, quantity: 1, slot: 2 },
      { itemType: ItemType.WOOL, quantity: 1, slot: 3 },
      { itemType: ItemType.WOOL, quantity: 1, slot: 4 },
      { itemType: ItemType.WOOL, quantity: 1, slot: 5 },
    ],
    output: { itemType: ItemType.WOOL_CLOTHING, quantity: 1 },
  },
  // Empty tank: iron round a glass gauge
  //  .I.
  //  IGI
  //  .I.
  {
    name: 'Empty Tank',
    inputs: [
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 1 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 3 },
      { itemType: ItemType.GLASS, quantity: 1, slot: 4 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 5 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 7 },
    ],
    output: { itemType: ItemType.EMPTY_TANK, quantity: 2 },
  },
  // Gas collector: an iron box, copper vents, a cable in the middle
  //  ICI
  //  .K.
  //  ICI
  {
    name: 'Gas Collector',
    inputs: [
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 0 },
      { itemType: ItemType.INGOT_COPPER, quantity: 1, slot: 1 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 2 },
      { itemType: ItemType.CABLE, quantity: 1, slot: 4 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 6 },
      { itemType: ItemType.INGOT_COPPER, quantity: 1, slot: 7 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 8 },
    ],
    output: { itemType: ItemType.GAS_COLLECTOR, quantity: 1 },
  },
  // Space suit: clothing under leather, a glass visor, iron fittings
  //  IGI
  //  LCL
  //  L.L
  {
    name: 'Space Suit',
    inputs: [
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 0 },
      { itemType: ItemType.GLASS, quantity: 1, slot: 1 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 2 },
      { itemType: ItemType.LEATHER, quantity: 1, slot: 3 },
      { itemType: ItemType.WOOL_CLOTHING, quantity: 1, slot: 4 },
      { itemType: ItemType.LEATHER, quantity: 1, slot: 5 },
      { itemType: ItemType.LEATHER, quantity: 1, slot: 6 },
      { itemType: ItemType.LEATHER, quantity: 1, slot: 8 },
    ],
    output: { itemType: ItemType.SPACE_SUIT, quantity: 1 },
  },
  ...TOOL_RECIPES,
];

export class CraftingSystem {
  private inventory: Inventory;
  private menuElement: HTMLElement | null = null;
  private recipeSelectElement: HTMLSelectElement | null = null;
  private craftingGridElement: HTMLElement | null = null;
  private craftingOutputElement: HTMLElement | null = null;
  private craftBtnElement: HTMLButtonElement | null = null;
  private inventoryGridElement: HTMLElement | null = null;
  private inventoryHotbarElement: HTMLElement | null = null;
  private inventoryToolboxElement: HTMLElement | null = null;
  // The stack held on the cursor after a right-click split (drawn here, kept on the Inventory)
  private heldEl: HTMLElement | null = null;
  // The suit slot (equipment): whether a suit is worn, and taking it off
  private suitSlotElement: HTMLElement | null = null;
  private suit: { worn: () => boolean; takeOff: () => void } | null = null;
  private isOpen: boolean = false;
  private onCloseCallback: (() => void) | null = null;
  private onUpdateHotbarCallback: (() => void) | null = null;
  private onSaveCallback: (() => void) | null = null;

  // Custom dropdown elements
  private customDropdown: HTMLElement | null = null;
  private dropdownSelected: HTMLElement | null = null;
  private dropdownList: HTMLElement | null = null;
  private isDropdownOpen: boolean = false;

  // Currently selected recipe
  private selectedRecipe: CraftingRecipe | null = null;

  // Drag and drop state
  private draggedSlotIndex: number | null = null;
  private dragGhost: HTMLElement | null = null;

  // Mobile touch drag state
  private touchDragSlotIndex: number | null = null;
  private touchDragGhost: HTMLElement | null = null;

  // Callback for handling furnace drops
  private onFurnaceDropCallback: ((targetSlotIndex: number, sourceSlotType: string) => boolean) | null = null;

  // Callback for handling electric furnace drops
  private onElectricFurnaceDropCallback: ((targetSlotIndex: number, sourceSlotType: string) => boolean) | null = null;

  // Callback for handling storage drops
  private onStorageDropCallback: ((targetSlotIndex: number, sourceSlotType: string) => boolean) | null = null;

  // Callback for handling 3D printer drops
  private onPrinter3DDropCallback: ((targetSlotIndex: number, sourceSlotIndex: number) => boolean) | null = null;

  constructor(inventory: Inventory) {
    this.inventory = inventory;
    this.setupUI();
    this.setupKeyboardHandler();

    // Register with MenuManager for centralized menu handling
    MenuManager.registerMenu('inventory', {
      isOpen: () => this.isOpen,
      close: () => this.close(),
    });
  }

  private setupUI(): void {
    this.menuElement = document.getElementById('inventory-menu');
    this.setupPanelTabs();
    this.recipeSelectElement = document.getElementById('recipe-select') as HTMLSelectElement;
    this.craftingGridElement = document.getElementById('crafting-grid');
    this.craftingOutputElement = document.getElementById('crafting-output');
    this.craftBtnElement = document.getElementById('craft-btn') as HTMLButtonElement;
    this.inventoryGridElement = document.getElementById('inventory-grid');
    this.inventoryHotbarElement = document.getElementById('inventory-hotbar');
    this.inventoryToolboxElement = document.getElementById('inventory-toolbox');
    // The held stack follows the mouse
    document.addEventListener('mousemove', (e) => {
      if (!this.heldEl) return;
      this.heldEl.style.left = `${e.clientX}px`;
      this.heldEl.style.top = `${e.clientY}px`;
    });
    this.suitSlotElement = document.getElementById('suit-slot');
    this.suitSlotElement?.addEventListener('click', () => {
      if (!this.suit?.worn()) return;
      this.suit.takeOff();
      this.updateInventorySlots();
    });

    // Disable browser context menu on inventory
    if (this.menuElement) {
      this.menuElement.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    // Create inventory slots
    this.createInventorySlots();

    // Setup close button with pointer lock restoration via MenuManager
    MenuManager.setupCloseButton('.close-inventory', this.menuElement, () => this.close());

    // Create custom dropdown with thumbnails (replaces native select)
    this.createCustomDropdown();

    // Setup craft button handler
    if (this.craftBtnElement) {
      this.craftBtnElement.addEventListener('click', () => this.craftSelectedRecipe());
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (this.customDropdown && !this.customDropdown.contains(e.target as Node)) {
        this.closeDropdown();
      }
    });
  }

  private createInventorySlots(): void {
    // Create 27 storage slots (slots 9-35)
    if (this.inventoryGridElement) {
      this.inventoryGridElement.innerHTML = '';
      for (let i = 9; i < 36; i++) {
        const slot = this.createSlotElement(i);
        this.inventoryGridElement.appendChild(slot);
      }
    }

    // Create 9 hotbar slots (slots 0-8)
    if (this.inventoryHotbarElement) {
      this.inventoryHotbarElement.innerHTML = '';
      for (let i = 0; i < 9; i++) {
        const slot = this.createSlotElement(i);
        this.inventoryHotbarElement.appendChild(slot);
      }
    }

    // The toolbox: one slot per tool kind (slots 36-39), same handlers
    if (this.inventoryToolboxElement) {
      this.inventoryToolboxElement.innerHTML = '';
      for (let i = 0; i < TOOLBOX_SLOTS; i++) {
        const slot = this.createSlotElement(TOOLBOX_START + i);
        slot.classList.add('toolbox-slot');
        const label = document.createElement('span');
        label.className = 'toolbox-label';
        label.textContent = TOOLBOX.LABELS[TOOLBOX.KINDS[i]];
        slot.appendChild(label);
        this.inventoryToolboxElement.appendChild(slot);
      }
    }
  }

  private createSlotElement(slotIndex: number): HTMLElement {
    const slot = document.createElement('div');
    slot.className = 'inventory-slot';
    slot.dataset.slot = slotIndex.toString();
    slot.draggable = true;

    const img = document.createElement('img');
    img.style.display = 'none';
    img.draggable = false; // Prevent image from being dragged separately
    slot.appendChild(img);

    const count = document.createElement('span');
    count.className = 'slot-count';
    slot.appendChild(count);

    // Desktop drag and drop event handlers
    slot.addEventListener('dragstart', (e) => this.handleDragStart(e, slotIndex));
    slot.addEventListener('dragend', () => this.handleDragEnd());
    slot.addEventListener('dragover', (e) => this.handleDragOver(e));
    slot.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    slot.addEventListener('drop', (e) => this.handleDrop(e, slotIndex));

    // Right click: pick up half the stack (rounded up) onto the cursor, or
    // put the held stack down; left click puts a held stack down
    slot.addEventListener('contextmenu', (e) => { e.preventDefault(); this.handleSlotRightClick(slotIndex); });
    slot.addEventListener('click', () => { if (this.inventory.getHeld()) this.placeHeldOn(slotIndex); });

    // Mobile touch drag handlers
    slot.addEventListener('touchstart', (e) => this.handleTouchStart(e, slotIndex), { passive: false });
    slot.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    slot.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });

    return slot;
  }

  private handleTouchStart(e: TouchEvent, slotIndex: number): void {
    const slotData = this.inventory.getSlot(slotIndex);
    if (!slotData || slotData.itemType === ItemType.NONE) {
      return;
    }

    e.preventDefault();
    this.touchDragSlotIndex = slotIndex;

    const touch = e.touches[0];
    const target = e.currentTarget as HTMLElement;
    target.classList.add('dragging');

    // Create touch ghost element
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    const itemData = ITEM_DATA[slotData.itemType];
    ghost.innerHTML = `<img src="${getAssetPath(itemData.texture)}" style="width:40px;height:40px;image-rendering:pixelated;">`;
    if (slotData.quantity > 1) {
      ghost.innerHTML += `<span class="ghost-count">${slotData.quantity}</span>`;
    }
    ghost.style.position = 'fixed';
    ghost.style.left = `${touch.clientX - 25}px`;
    ghost.style.top = `${touch.clientY - 25}px`;
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '9999';
    ghost.style.background = 'rgba(0,0,0,0.8)';
    ghost.style.border = '2px solid #4CAF50';
    ghost.style.borderRadius = '4px';
    ghost.style.padding = '4px';
    document.body.appendChild(ghost);
    this.touchDragGhost = ghost;
  }

  private handleTouchMove(e: TouchEvent): void {
    if (this.touchDragSlotIndex === null || !this.touchDragGhost) return;

    e.preventDefault();
    const touch = e.touches[0];

    // Move ghost to follow finger
    this.touchDragGhost.style.left = `${touch.clientX - 25}px`;
    this.touchDragGhost.style.top = `${touch.clientY - 25}px`;

    // Find slot under touch and highlight it
    document.querySelectorAll('.inventory-slot.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });

    const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
    const slotUnder = elementUnder?.closest('.inventory-slot') as HTMLElement;
    if (slotUnder) {
      slotUnder.classList.add('drag-over');
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    if (this.touchDragSlotIndex === null) return;

    e.preventDefault();
    const touch = e.changedTouches[0];

    // Find target slot
    const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetSlot = elementUnder?.closest('.inventory-slot') as HTMLElement;

    if (targetSlot) {
      const targetSlotIndex = parseInt(targetSlot.dataset.slot || '-1');
      if (targetSlotIndex >= 0 && targetSlotIndex !== this.touchDragSlotIndex) {
        // Swap slots
        this.inventory.swapSlots(this.touchDragSlotIndex, targetSlotIndex);
        this.updateInventorySlots();
        if (this.onUpdateHotbarCallback) {
          this.onUpdateHotbarCallback();
        }
      }
    }

    // Cleanup
    document.querySelectorAll('.inventory-slot.dragging').forEach(el => {
      el.classList.remove('dragging');
    });
    document.querySelectorAll('.inventory-slot.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });
    if (this.touchDragGhost) {
      this.touchDragGhost.remove();
      this.touchDragGhost = null;
    }
    this.touchDragSlotIndex = null;
  }

  // ---- right-click split (openspec tools-and-toolbox, design 6) ----------

  private handleSlotRightClick(slotIndex: number): void {
    if (this.inventory.getHeld()) {
      this.placeHeldOn(slotIndex);
      return;
    }
    if (!this.inventory.takeHalf(slotIndex)) return;
    this.afterHeldChange();
  }

  private placeHeldOn(slotIndex: number): void {
    if (!this.inventory.placeHeld(slotIndex)) return;
    this.afterHeldChange();
  }

  /** Put a held stack back (the panel closing). */
  private returnHeld(): void {
    if (!this.inventory.getHeld()) return;
    const lost = this.inventory.returnHeld();
    if (lost > 0) showToast(`No room: ${lost} dropped`, { duration: TOOLBOX.TOAST_MS });
    this.afterHeldChange();
  }

  private afterHeldChange(): void {
    this.renderHeld();
    this.updateInventorySlots();
    this.onUpdateHotbarCallback?.();
    this.onSaveCallback?.();
  }

  // The held stack's icon on the cursor
  private renderHeld(): void {
    const held = this.inventory.getHeld();
    if (!held) {
      this.heldEl?.remove();
      this.heldEl = null;
      return;
    }
    if (!this.heldEl) {
      this.heldEl = document.createElement('div');
      this.heldEl.className = 'held-stack';
      this.heldEl.innerHTML = '<img><span></span>';
      document.body.appendChild(this.heldEl);
    }
    (this.heldEl.querySelector('img') as HTMLImageElement).src = getAssetPath(ITEM_DATA[held.itemType].texture);
    (this.heldEl.querySelector('span') as HTMLElement).textContent = held.quantity > 1 ? String(held.quantity) : '';
  }

  private handleDragStart(e: DragEvent, slotIndex: number): void {
    const slotData = this.inventory.getSlot(slotIndex);
    // A stack on the cursor is put down by clicking, not dragged past
    if (this.inventory.getHeld()) {
      e.preventDefault();
      return;
    }
    if (!slotData || slotData.itemType === ItemType.NONE) {
      e.preventDefault();
      return;
    }

    this.draggedSlotIndex = slotIndex;

    // Set drag data
    e.dataTransfer?.setData('text/plain', slotIndex.toString());
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }

    // Create ghost element for drag feedback
    const target = e.target as HTMLElement;
    target.classList.add('dragging');

    // Create custom drag image
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    const itemData = ITEM_DATA[slotData.itemType];
    ghost.innerHTML = `<img src="${getAssetPath(itemData.texture)}" style="width:40px;height:40px;image-rendering:pixelated;">`;
    if (slotData.quantity > 1) {
      ghost.innerHTML += `<span class="ghost-count">${slotData.quantity}</span>`;
    }
    document.body.appendChild(ghost);
    this.dragGhost = ghost;

    // Position ghost off-screen initially (browser will position it during drag)
    ghost.style.position = 'fixed';
    ghost.style.top = '-100px';
    ghost.style.left = '-100px';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '9999';
    ghost.style.background = 'rgba(0,0,0,0.8)';
    ghost.style.border = '2px solid #4CAF50';
    ghost.style.borderRadius = '4px';
    ghost.style.padding = '4px';

    e.dataTransfer?.setDragImage(ghost, 25, 25);
  }

  private handleDragEnd(): void {
    this.draggedSlotIndex = null;

    // Remove dragging class from all slots
    document.querySelectorAll('.inventory-slot.dragging').forEach(el => {
      el.classList.remove('dragging');
    });
    document.querySelectorAll('.inventory-slot.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });

    // Remove ghost element
    if (this.dragGhost) {
      this.dragGhost.remove();
      this.dragGhost = null;
    }
  }

  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    const target = e.currentTarget as HTMLElement;
    target.classList.add('drag-over');
  }

  private handleDragLeave(e: DragEvent): void {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
  }

  private handleDrop(e: DragEvent, targetSlotIndex: number): void {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');

    // Check if this is a drop from a furnace slot
    const dragData = e.dataTransfer?.getData('text/plain');
    // Machine and chest outputs go to the hotbar / bag, never the toolbox
    if (toolboxKindAt(targetSlotIndex) !== null && dragData && dragData.includes(':')) return;
    if (dragData && dragData.startsWith('furnace:')) {
      const sourceSlotType = dragData.substring('furnace:'.length);
      if (this.onFurnaceDropCallback) {
        const success = this.onFurnaceDropCallback(targetSlotIndex, sourceSlotType);
        if (success) {
          this.updateInventorySlots();
          if (this.onUpdateHotbarCallback) {
            this.onUpdateHotbarCallback();
          }
        }
      }
      return;
    }

    // Check if this is a drop from an electric furnace slot
    if (dragData && dragData.startsWith('electric-furnace:')) {
      const sourceSlotType = dragData.substring('electric-furnace:'.length);
      if (this.onElectricFurnaceDropCallback) {
        const success = this.onElectricFurnaceDropCallback(targetSlotIndex, sourceSlotType);
        if (success) {
          this.updateInventorySlots();
          if (this.onUpdateHotbarCallback) {
            this.onUpdateHotbarCallback();
          }
        }
      }
      return;
    }

    // Check if this is a drop from a storage slot
    if (dragData && dragData.startsWith('storage:')) {
      if (this.onStorageDropCallback) {
        // Pass full dragData including 'storage:' prefix as StorageUI expects it
        const success = this.onStorageDropCallback(targetSlotIndex, dragData);
        if (success) {
          this.updateInventorySlots();
          if (this.onUpdateHotbarCallback) {
            this.onUpdateHotbarCallback();
          }
        }
      }
      return;
    }

    // Check if this is a drop from a 3D printer output slot
    if (dragData && dragData.startsWith('printer3d:output:')) {
      const sourceSlotIndex = parseInt(dragData.substring('printer3d:output:'.length));
      if (!isNaN(sourceSlotIndex) && this.onPrinter3DDropCallback) {
        const success = this.onPrinter3DDropCallback(targetSlotIndex, sourceSlotIndex);
        if (success) {
          this.updateInventorySlots();
          if (this.onUpdateHotbarCallback) {
            this.onUpdateHotbarCallback();
          }
        }
      }
      return;
    }

    // Regular inventory to inventory merge/swap
    const sourceSlotIndex = this.draggedSlotIndex;
    if (sourceSlotIndex === null || sourceSlotIndex === targetSlotIndex) {
      return;
    }

    // Merge or swap the slots (combines same items up to 64, leftovers stay in source)
    this.inventory.mergeOrSwapSlots(sourceSlotIndex, targetSlotIndex);

    // Update UI
    this.updateInventorySlots();
    if (this.onUpdateHotbarCallback) {
      this.onUpdateHotbarCallback();
    }
  }

  private setupKeyboardHandler(): void {
    document.addEventListener('keydown', (e) => {
      // M: the same panel on its Map tab (M again, or on the map, closes it)
      if ((e.key === 'm' || e.key === 'M') && !isTypingTarget(e.target)) {
        if (this.isOpen && this.currentPanel === 'map') {
          this.close();
          MenuManager.closeMenuViaKeyboard();
          e.preventDefault();
        } else if (this.isOpen || document.pointerLockElement) {
          this.openPanel('map');
          e.preventDefault();
        }
        return;
      }
      if (e.key === 'e' || e.key === 'E') {
        if (this.isOpen) {
          this.close();
          MenuManager.closeMenuViaKeyboard();
          e.preventDefault();
        } else {
          // Only open if game is active (pointer locked)
          if (document.pointerLockElement) {
            this.open();
            e.preventDefault();
          }
        }
      } else if (e.key === 'Escape' && this.isOpen) {
        this.close();
        MenuManager.closeMenuViaKeyboard();
        e.preventDefault();
      }
    });
  }

  // The E panel's tabs (Inventory / Map / Missions). Other panels register
  // here and draw into their container (#panel-<name>) when shown.
  private panels = new Map<string, { show: (el: HTMLElement) => void; hide?: () => void }>();
  private currentPanel = 'inventory';

  public registerPanel(name: string, panel: { show: (el: HTMLElement) => void; hide?: () => void }): void {
    this.panels.set(name, panel);
  }

  /** Open the E panel on a tab ('inventory', 'map', 'missions'). */
  public openPanel(name: string): void {
    if (!this.isOpen) this.open();
    this.showPanel(name);
  }

  private showPanel(name: string): void {
    if (!this.menuElement) return;
    if (this.currentPanel !== name) this.panels.get(this.currentPanel)?.hide?.();
    this.currentPanel = name;
    this.menuElement.querySelectorAll<HTMLElement>('.inv-tab').forEach(t => t.classList.toggle('active', t.dataset.panel === name));
    const body = this.menuElement.querySelector<HTMLElement>('[data-panel-body="inventory"]');
    if (body) body.style.display = name === 'inventory' ? '' : 'none';
    this.menuElement.querySelectorAll<HTMLElement>('.inv-panel').forEach(p => { p.hidden = p.id !== `panel-${name}`; });
    const title = this.menuElement.querySelector('.inventory-title');
    if (title) title.textContent = name === 'inventory' ? 'Inventory' : name === 'map' ? 'Map' : 'Missions';
    const el = document.getElementById(`panel-${name}`);
    if (el && name !== 'inventory') this.panels.get(name)?.show(el);
  }

  private setupPanelTabs(): void {
    this.menuElement?.querySelectorAll<HTMLElement>('.inv-tab').forEach(tab => {
      tab.addEventListener('click', () => this.showPanel(tab.dataset.panel ?? 'inventory'));
    });
  }

  public open(): void {
    if (this.menuElement) {
      console.log('Inventory opened');
      this.menuElement.classList.add('active');
      this.isOpen = true;
      MenuManager.openMenu();
      this.updateUI();
    }
  }

  public close(): void {
    if (this.menuElement) {
      this.menuElement.classList.remove('active');
      this.isOpen = false;

      // A stack held on the cursor goes back into the inventory
      this.returnHeld();

      // The next open starts on the inventory
      this.panels.get(this.currentPanel)?.hide?.();
      if (this.currentPanel !== 'inventory') this.showPanel('inventory');

      // Cancel any ongoing drag operation to prevent click events after close
      this.cancelDrag();

      if (this.onCloseCallback) {
        this.onCloseCallback();
      }
    }
  }

  private cancelDrag(): void {
    // Reset desktop drag state
    this.draggedSlotIndex = null;
    document.querySelectorAll('.inventory-slot.dragging').forEach(el => {
      el.classList.remove('dragging');
    });
    document.querySelectorAll('.inventory-slot.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });
    if (this.dragGhost) {
      this.dragGhost.remove();
      this.dragGhost = null;
    }

    // Reset touch drag state
    this.touchDragSlotIndex = null;
    if (this.touchDragGhost) {
      this.touchDragGhost.remove();
      this.touchDragGhost = null;
    }
  }

  public isMenuOpen(): boolean {
    return this.isOpen;
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public setOnCloseCallback(callback: () => void): void {
    this.onCloseCallback = callback;
  }

  public setOnUpdateHotbarCallback(callback: () => void): void {
    this.onUpdateHotbarCallback = callback;
  }

  public setOnSaveCallback(callback: () => void): void {
    this.onSaveCallback = callback;
  }

  public setOnFurnaceDropCallback(callback: (targetSlotIndex: number, sourceSlotType: string) => boolean): void {
    this.onFurnaceDropCallback = callback;
  }

  public setOnElectricFurnaceDropCallback(callback: (targetSlotIndex: number, sourceSlotType: string) => boolean): void {
    this.onElectricFurnaceDropCallback = callback;
  }

  public setOnStorageDropCallback(callback: (targetSlotIndex: number, sourceSlotType: string) => boolean): void {
    this.onStorageDropCallback = callback;
  }

  public setOnPrinter3DDropCallback(callback: (targetSlotIndex: number, sourceSlotIndex: number) => boolean): void {
    this.onPrinter3DDropCallback = callback;
  }

  // Public method to update inventory slots (called by FurnaceUI)
  public updateInventorySlotsPublic(): void {
    this.updateInventorySlots();
  }

  private updateUI(): void {
    this.updateInventorySlots();
    this.updateCraftingGrid();
  }

  /** The suit slot reads and takes off the worn suit (src/player/AirSystem.ts). */
  public setSuitSlot(suit: { worn: () => boolean; takeOff: () => void }): void {
    this.suit = suit;
    this.updateInventorySlots();
  }

  public updateInventorySlots(): void {
    const allSlots = this.inventory.getAllSlots();

    // The suit slot: the suit's icon while it is worn
    if (this.suitSlotElement) {
      const worn = this.suit?.worn() ?? false;
      this.updateSlotElement(this.suitSlotElement, { itemType: worn ? ItemType.SPACE_SUIT : ItemType.NONE, quantity: worn ? 1 : 0 });
      this.suitSlotElement.title = worn ? 'Suit - click to take it off' : 'Suit - right click a space suit in hand to put it on';
    }

    // Update storage slots
    const storageSlots = this.inventoryGridElement?.querySelectorAll('.inventory-slot');
    storageSlots?.forEach((slotEl, index) => {
      const slotIndex = 9 + index;
      this.updateSlotElement(slotEl as HTMLElement, allSlots[slotIndex]);
    });

    // Update hotbar slots
    const hotbarSlots = this.inventoryHotbarElement?.querySelectorAll('.inventory-slot');
    hotbarSlots?.forEach((slotEl, index) => {
      this.updateSlotElement(slotEl as HTMLElement, allSlots[index]);
    });

    // Update the toolbox
    const toolSlots = this.inventoryToolboxElement?.querySelectorAll('.inventory-slot');
    toolSlots?.forEach((slotEl, index) => {
      const slot = this.inventory.getSlot(TOOLBOX_START + index)!;
      this.updateSlotElement(slotEl as HTMLElement, slot);
      slotEl.classList.toggle('has-tool', slot.itemType !== ItemType.NONE);
    });
  }

  private updateSlotElement(slotEl: HTMLElement, slot: InventorySlot): void {
    const img = slotEl.querySelector('img') as HTMLImageElement;
    const countEl = slotEl.querySelector('.slot-count') as HTMLElement;
    let tooltipEl = slotEl.querySelector('.item-tooltip') as HTMLElement;

    if (slot.itemType !== ItemType.NONE && slot.quantity > 0) {
      const itemData = ITEM_DATA[slot.itemType];
      if (img) {
        img.src = getAssetPath(itemData.texture);
        img.style.display = 'block';
        // Apply atlas region styling if present
        this.applyAtlasRegionStyle(img, itemData);
      }
      if (countEl) {
        countEl.textContent = slot.quantity > 1 ? slot.quantity.toString() : '';
      }
      // Create or update tooltip
      if (!tooltipEl) {
        tooltipEl = document.createElement('span');
        tooltipEl.className = 'item-tooltip';
        slotEl.appendChild(tooltipEl);
      }
      tooltipEl.textContent = slotTooltip(slot);
    } else {
      if (img) {
        img.style.display = 'none';
        // Reset atlas region styling
        this.resetAtlasRegionStyle(img);
      }
      if (countEl) countEl.textContent = '';
      // Remove tooltip for empty slots
      if (tooltipEl) tooltipEl.remove();
    }
    // A worn tool's durability bar
    renderDurability(slotEl, slot);
  }

  // Apply CSS styling to show only a portion of an atlas texture
  private applyAtlasRegionStyle(img: HTMLImageElement, itemData: typeof ITEM_DATA[ItemType]): void {
    this.applyAtlasRegionStyleWithSize(img, itemData, 40);
  }

  private applyAtlasRegionStyleWithSize(img: HTMLImageElement, itemData: typeof ITEM_DATA[ItemType], displaySize: number): void {
    if (itemData.atlasRegion) {
      const { x, y, width, height, atlasWidth, atlasHeight } = itemData.atlasRegion;
      const scaleX = atlasWidth / width;
      const scaleY = atlasHeight / height;
      img.style.objectFit = 'none';
      img.style.objectPosition = `${-x * (displaySize / width)}px ${-y * (displaySize / height)}px`;
      img.style.width = `${displaySize * scaleX}px`;
      img.style.height = `${displaySize * scaleY}px`;
      img.style.transform = `scale(${1 / scaleX}, ${1 / scaleY})`;
      img.style.transformOrigin = 'top left';
    } else {
      this.resetAtlasRegionStyleWithSize(img, displaySize);
    }
  }

  private resetAtlasRegionStyle(img: HTMLImageElement): void {
    this.resetAtlasRegionStyleWithSize(img, 40);
  }

  private resetAtlasRegionStyleWithSize(img: HTMLImageElement, displaySize: number): void {
    img.style.objectFit = '';
    img.style.objectPosition = '';
    img.style.width = `${displaySize}px`;
    img.style.height = `${displaySize}px`;
    img.style.transform = '';
    img.style.transformOrigin = '';
  }

  private createCustomDropdown(): void {
    // Hide the native select element
    if (this.recipeSelectElement) {
      this.recipeSelectElement.style.display = 'none';
    }

    // Create custom dropdown container
    this.customDropdown = document.createElement('div');
    this.customDropdown.className = 'custom-recipe-dropdown';
    this.customDropdown.style.cssText = `
      position: relative;
      width: 100%;
      font-family: inherit;
      user-select: none;
    `;

    // Create the selected item display
    this.dropdownSelected = document.createElement('div');
    this.dropdownSelected.className = 'dropdown-selected';
    this.dropdownSelected.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #2a2a2a;
      border: 2px solid #444;
      border-radius: 4px;
      cursor: pointer;
      min-height: 40px;
      min-width: 180px;
    `;
    this.dropdownSelected.innerHTML = `
      <span style="color: #888;">Select Recipe</span>
      <span style="margin-left: auto;">▼</span>
    `;
    this.dropdownSelected.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    // Create the dropdown list
    this.dropdownList = document.createElement('div');
    this.dropdownList.className = 'dropdown-list';
    this.dropdownList.style.cssText = `
      position: absolute;
      top: 100%;
      left: 0;
      min-width: 200px;
      max-height: 300px;
      overflow-y: auto;
      overflow-x: hidden;
      background: #2a2a2a;
      border: 2px solid #444;
      border-top: none;
      border-radius: 0 0 4px 4px;
      z-index: 1000;
      display: none;
    `;

    // Populate the dropdown list
    this.populateDropdownList();

    this.customDropdown.appendChild(this.dropdownSelected);
    this.customDropdown.appendChild(this.dropdownList);

    // Insert after the native select
    if (this.recipeSelectElement && this.recipeSelectElement.parentNode) {
      this.recipeSelectElement.parentNode.insertBefore(this.customDropdown, this.recipeSelectElement.nextSibling);
    }
  }

  private populateDropdownList(): void {
    if (!this.dropdownList) return;

    this.dropdownList.innerHTML = '';

    // Add placeholder option
    const placeholder = document.createElement('div');
    placeholder.className = 'dropdown-item';
    placeholder.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      cursor: pointer;
      color: #888;
    `;
    placeholder.innerHTML = '<span>Select Recipe</span>';
    placeholder.addEventListener('click', () => this.selectRecipe(-1));
    placeholder.addEventListener('mouseenter', () => placeholder.style.background = '#3a3a3a');
    placeholder.addEventListener('mouseleave', () => placeholder.style.background = '');
    this.dropdownList.appendChild(placeholder);

    // Add each recipe
    for (let i = 0; i < CRAFTING_RECIPES.length; i++) {
      const recipe = CRAFTING_RECIPES[i];
      const itemData = ITEM_DATA[recipe.output.itemType];

      const item = document.createElement('div');
      item.className = 'dropdown-item';
      item.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        cursor: pointer;
      `;

      const img = document.createElement('img');
      img.src = getAssetPath(itemData.texture);
      img.style.cssText = `
        width: 24px;
        height: 24px;
        image-rendering: pixelated;
      `;

      const name = document.createElement('span');
      // A recipe a mission has not unlocked yet: dimmed, with that mission
      const lockedBy = recipeLockedBy(recipe.output.itemType);
      name.textContent = lockedBy ? `${recipe.name} - Unlocked by: ${lockedBy}` : recipe.name;
      name.style.color = lockedBy ? '#777' : '#fff';
      if (lockedBy) item.style.opacity = '0.55';

      const quantity = document.createElement('span');
      quantity.textContent = `x${recipe.output.quantity}`;
      quantity.style.cssText = `
        margin-left: auto;
        color: #888;
        font-size: 12px;
      `;

      item.appendChild(img);
      item.appendChild(name);
      item.appendChild(quantity);

      item.addEventListener('click', () => this.selectRecipe(i));
      item.addEventListener('mouseenter', () => item.style.background = '#3a3a3a');
      item.addEventListener('mouseleave', () => item.style.background = '');

      this.dropdownList.appendChild(item);
    }
  }

  private toggleDropdown(): void {
    if (this.isDropdownOpen) {
      this.closeDropdown();
    } else {
      this.openDropdown();
    }
  }

  private openDropdown(): void {
    if (this.dropdownList) {
      // Rebuilt on open: which recipes are locked changes as missions finish
      this.populateDropdownList();
      this.dropdownList.style.display = 'block';
      this.isDropdownOpen = true;
    }
  }

  private closeDropdown(): void {
    if (this.dropdownList) {
      this.dropdownList.style.display = 'none';
      this.isDropdownOpen = false;
    }
  }

  private selectRecipe(index: number): void {
    if (index < 0 || index >= CRAFTING_RECIPES.length) {
      this.selectedRecipe = null;
      if (this.dropdownSelected) {
        this.dropdownSelected.innerHTML = `
          <span style="color: #888;">Select Recipe</span>
          <span style="margin-left: auto;">▼</span>
        `;
      }
    } else {
      this.selectedRecipe = CRAFTING_RECIPES[index];
      const itemData = ITEM_DATA[this.selectedRecipe.output.itemType];

      if (this.dropdownSelected) {
        this.dropdownSelected.innerHTML = `
          <img src="${getAssetPath(itemData.texture)}" style="width: 24px; height: 24px; image-rendering: pixelated;">
          <span style="color: #fff;">${this.selectedRecipe.name}</span>
          <span style="margin-left: auto;">▼</span>
        `;
      }
    }

    this.closeDropdown();
    this.updateCraftingGrid();
  }

  private updateCraftingGrid(): void {
    // Clear all crafting slots (now 9 slots for 3x3 grid)
    const craftingSlots = this.craftingGridElement?.querySelectorAll('.crafting-slot');
    craftingSlots?.forEach((slotEl) => {
      const img = slotEl.querySelector('img') as HTMLImageElement;
      const countEl = slotEl.querySelector('.slot-count') as HTMLElement;
      const tooltipEl = slotEl.querySelector('.item-tooltip') as HTMLElement;
      if (img) img.style.display = 'none';
      if (countEl) countEl.textContent = '';
      if (tooltipEl) tooltipEl.remove();
      slotEl.classList.remove('has-item', 'missing-item');
    });

    // Clear output slot
    if (this.craftingOutputElement) {
      const outputImg = this.craftingOutputElement.querySelector('img') as HTMLImageElement;
      const outputCount = this.craftingOutputElement.querySelector('.slot-count') as HTMLElement;
      if (outputImg) outputImg.style.display = 'none';
      if (outputCount) outputCount.textContent = '';
      this.craftingOutputElement.classList.remove('has-item');
    }

    // Disable craft button by default
    if (this.craftBtnElement) {
      this.craftBtnElement.disabled = true;
    }

    // If no recipe selected, we're done
    if (!this.selectedRecipe) return;

    // Calculate total required for each item type (for recipes that use same item in multiple slots)
    const requiredItems = new Map<ItemType, number>();
    for (const input of this.selectedRecipe.inputs) {
      const current = requiredItems.get(input.itemType) || 0;
      requiredItems.set(input.itemType, current + input.quantity);
    }

    // Check if player can craft (has enough of all required items, or bypass mode is enabled)
    let canCraft = recipeOpen(this.selectedRecipe.output.itemType);
    if (canCraft && !PlayerConfig.DEBUG_BYPASS_CRAFTING_INGREDIENTS) {
      for (const [itemType, quantity] of requiredItems) {
        if (!this.inventory.hasItem(itemType, quantity)) {
          canCraft = false;
          break;
        }
      }
    }

    // Populate input slots with recipe requirements using slot positions
    this.selectedRecipe.inputs.forEach((input, index) => {
      // Use specified slot position, or fall back to sequential placement
      const slotIndex = input.slot !== undefined ? input.slot : index;
      if (slotIndex < 9 && craftingSlots && craftingSlots[slotIndex]) {
        const slotEl = craftingSlots[slotIndex] as HTMLElement;
        const img = slotEl.querySelector('img') as HTMLImageElement;
        const countEl = slotEl.querySelector('.slot-count') as HTMLElement;

        const itemData = ITEM_DATA[input.itemType];
        if (img) {
          img.src = getAssetPath(itemData.texture);
          img.style.display = 'block';
          // Apply atlas region styling if present
          this.applyAtlasRegionStyle(img, itemData);
        }
        if (countEl) {
          countEl.textContent = input.quantity > 1 ? input.quantity.toString() : '';
        }

        // Add tooltip showing ingredient name
        let tooltipEl = slotEl.querySelector('.item-tooltip') as HTMLElement;
        if (!tooltipEl) {
          tooltipEl = document.createElement('span');
          tooltipEl.className = 'item-tooltip';
          slotEl.appendChild(tooltipEl);
        }
        tooltipEl.textContent = itemData.name;

        // Color based on whether player has enough
        if (canCraft) {
          slotEl.classList.add('has-item');
        } else {
          // Check if this specific item type is missing
          const totalNeeded = requiredItems.get(input.itemType) || 0;
          const hasEnough = this.inventory.hasItem(input.itemType, totalNeeded);
          if (hasEnough) {
            slotEl.classList.add('has-item');
          } else {
            slotEl.classList.add('missing-item');
          }
        }
      }
    });

    // Populate output slot
    if (this.craftingOutputElement) {
      const outputImg = this.craftingOutputElement.querySelector('img') as HTMLImageElement;
      const outputCount = this.craftingOutputElement.querySelector('.slot-count') as HTMLElement;

      const outputData = ITEM_DATA[this.selectedRecipe.output.itemType];
      if (outputImg) {
        outputImg.src = getAssetPath(outputData.texture);
        outputImg.style.display = 'block';
        // Apply atlas region styling if present (use 48px for output slot)
        this.applyAtlasRegionStyleWithSize(outputImg, outputData, 48);
      }
      if (outputCount) {
        outputCount.textContent = this.selectedRecipe.output.quantity > 1
          ? this.selectedRecipe.output.quantity.toString()
          : '';
      }

      if (canCraft) {
        this.craftingOutputElement.classList.add('has-item');
      }
    }

    // Enable/disable craft button
    if (this.craftBtnElement) {
      this.craftBtnElement.disabled = !canCraft;
    }
  }

  private canCraft(recipe: CraftingRecipe): boolean {
    // Locked until its mission is done (src/player/RecipeGate)
    if (!recipeOpen(recipe.output.itemType)) return false;
    // Debug mode: bypass ingredient requirements
    if (PlayerConfig.DEBUG_BYPASS_CRAFTING_INGREDIENTS) {
      return true;
    }

    for (const input of recipe.inputs) {
      if (!this.inventory.hasItem(input.itemType, input.quantity)) {
        return false;
      }
    }
    return true;
  }

  private craftSelectedRecipe(): void {
    if (!this.selectedRecipe || !this.canCraft(this.selectedRecipe)) return;

    // Remove input items (unless bypass mode is enabled)
    if (!PlayerConfig.DEBUG_BYPASS_CRAFTING_INGREDIENTS) {
      for (const input of this.selectedRecipe.inputs) {
        this.inventory.removeItem(input.itemType, input.quantity);
      }
    }

    // Add output items. A tool equips itself in the toolbox when its slot
    // is free, else joins the inventory (openspec tools-and-toolbox)
    const out = this.selectedRecipe.output;
    if (toolOf(out.itemType)) {
      for (let n = 0; n < out.quantity; n++) {
        const went = this.inventory.giveTool(out.itemType);
        const name = ITEM_DATA[out.itemType].name;
        showToast(went === 'toolbox' ? `${name} equipped in the toolbox`
          : went === 'inventory' ? `${name} added to the inventory` : `No room for the ${name}`, { duration: TOOLBOX.TOAST_MS });
      }
    } else {
      this.inventory.addItem(out.itemType, out.quantity);
    }
    const returned = this.selectedRecipe.returns;
    if (returned) this.inventory.addItem(returned.itemType, returned.quantity);
    emitGameEvent('crafted', this.selectedRecipe.output.itemType, this.selectedRecipe.output.quantity);

    // Update UI
    this.updateUI();

    // Update hotbar in main game
    if (this.onUpdateHotbarCallback) {
      this.onUpdateHotbarCallback();
    }

    // Save inventory after crafting
    if (this.onSaveCallback) {
      this.onSaveCallback();
    }
  }
}

/** A key pressed in a text field (a name, a chat line) is text, not a game key */
function isTypingTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
}
