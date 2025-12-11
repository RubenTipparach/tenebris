import { Inventory, ItemType, ITEM_DATA, InventorySlot } from './Inventory';
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
}

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
    this.recipeSelectElement = document.getElementById('recipe-select') as HTMLSelectElement;
    this.craftingGridElement = document.getElementById('crafting-grid');
    this.craftingOutputElement = document.getElementById('crafting-output');
    this.craftBtnElement = document.getElementById('craft-btn') as HTMLButtonElement;
    this.inventoryGridElement = document.getElementById('inventory-grid');
    this.inventoryHotbarElement = document.getElementById('inventory-hotbar');

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

  private handleDragStart(e: DragEvent, slotIndex: number): void {
    const slotData = this.inventory.getSlot(slotIndex);
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

  public updateInventorySlots(): void {
    const allSlots = this.inventory.getAllSlots();

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
      tooltipEl.textContent = itemData.name;
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
      name.textContent = recipe.name;
      name.style.color = '#fff';

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
    let canCraft = true;
    if (!PlayerConfig.DEBUG_BYPASS_CRAFTING_INGREDIENTS) {
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

    // Add output items
    this.inventory.addItem(this.selectedRecipe.output.itemType, this.selectedRecipe.output.quantity);

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
