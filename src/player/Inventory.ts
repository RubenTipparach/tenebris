// Item types in the game
export enum ItemType {
  NONE = 0,
  STONE = 1,
  DIRT = 2,
  GRASS = 3,
  WOOD = 4,
  LEAVES = 5,
}

// Item metadata
export interface ItemData {
  name: string;
  stackSize: number;
  texture: string;
  mineTime: number; // Time in seconds to mine this item
}

export const ITEM_DATA: Record<ItemType, ItemData> = {
  [ItemType.NONE]: { name: 'Empty', stackSize: 0, texture: '', mineTime: 0 },
  [ItemType.STONE]: { name: 'Stone', stackSize: 64, texture: '/textures/rocks.png', mineTime: 1.5 },
  [ItemType.DIRT]: { name: 'Dirt', stackSize: 64, texture: '/textures/dirt.png', mineTime: 0.5 },
  [ItemType.GRASS]: { name: 'Grass', stackSize: 64, texture: '/textures/grass.png', mineTime: 0.6 },
  [ItemType.WOOD]: { name: 'Wood', stackSize: 64, texture: '/textures/wood.png', mineTime: 1.0 },
  [ItemType.LEAVES]: { name: 'Leaves', stackSize: 64, texture: '/textures/leaves.png', mineTime: 0.3 },
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

    // Start with some items for testing
    this.addItem(ItemType.STONE, 10);
    this.addItem(ItemType.DIRT, 10);
    this.addItem(ItemType.GRASS, 10);
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
}
