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
}

// Rocket part type for items that can be placed on the launch tower
export enum RocketPartType {
  ENGINE = 'engine',
  FUEL_TANK = 'fuel_tank',
  CAPSULE = 'capsule',
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
  [ItemType.LEAVES]: { name: 'Leaves', stackSize: 64, texture: '/textures/leaves.png', mineTime: 0.3 },
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
  [ItemType.GLASS]: { name: 'Glass', stackSize: 64, texture: '/textures/glass.png', mineTime: 0.3 },
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
  // Moon terrain (same mining time as stone)
  [ItemType.MOON_ROCK]: { name: 'Moon Rock', stackSize: 64, texture: '/textures/moon.png', mineTime: 1.5 },
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
  public useSelectedItem(): boolean {
    const slot = this.slots[this.selectedSlot];
    if (slot.itemType !== ItemType.NONE && slot.quantity > 0) {
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
