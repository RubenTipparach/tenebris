import { Inventory, ItemType, ITEM_DATA, halfUp } from './Inventory';
import { PlacedFurnace } from '../planet/Furnace';
import { furnaceFuel, smeltingRecipeFor, SMELTS_PER_COAL } from '../config/SmeltingRecipes';
import { recipeLockedLabel } from './RecipeGate';
import { showToast } from '../utils/toast';
import { getAssetPath } from '../utils/assetPath';
import { MenuManager } from './MenuManager';

export class FurnaceUI {
  private inventory: Inventory;
  private currentFurnace: PlacedFurnace | null = null;
  private furnaceSectionElement: HTMLElement | null = null;
  private isOpen: boolean = false;
  private onCloseCallback: (() => void) | null = null;
  private onSaveCallback: (() => void) | null = null;
  private updateInterval: number | null = null;
  private onOpenInventoryCallback: (() => void) | null = null;
  private onUpdateHotbarCallback: (() => void) | null = null;
  private onUpdateInventoryCallback: (() => void) | null = null;

  // UI Elements
  private fuelSlotElement: HTMLElement | null = null;
  private inputSlotElement: HTMLElement | null = null;
  private outputSlotElement: HTMLElement | null = null;
  private progressBarElement: HTMLElement | null = null;
  private fuelBarElement: HTMLElement | null = null;

  // Fuel constant for UI display and adding fuel
  private readonly FUEL_PER_COAL = SMELTS_PER_COAL; // the gauge counts in coal

  // Slot type identifiers for drag/drop
  private readonly SLOT_FUEL = 'furnace-fuel';
  private readonly SLOT_INPUT = 'furnace-input';
  private readonly SLOT_OUTPUT = 'furnace-output';

  constructor(inventory: Inventory) {
    this.inventory = inventory;
    this.createUI();
    this.setupKeyboardHandler();

    // Register with MenuManager for centralized menu handling
    MenuManager.registerMenu('furnace', {
      isOpen: () => this.isOpen,
      close: () => this.close(),
    });
  }

  private createUI(): void {
    // Create the furnace section to be added to inventory menu
    this.furnaceSectionElement = document.createElement('div');
    this.furnaceSectionElement.id = 'furnace-section';
    this.furnaceSectionElement.className = 'furnace-section';
    this.furnaceSectionElement.innerHTML = `
      <h3>Furnace</h3>

      <div class="furnace-grid">
        <div class="furnace-input-section">
          <div class="slot-label">Input</div>
          <div class="furnace-slot" id="furnace-input-slot">
            <img style="display:none;">
            <span class="slot-count"></span>
          </div>
        </div>

        <div class="furnace-progress-section">
          <div class="furnace-arrow">
            <div class="progress-bar-container">
              <div class="progress-bar" id="furnace-progress-bar"></div>
            </div>
            <span class="arrow-icon">→</span>
          </div>
        </div>

        <div class="furnace-output-section">
          <div class="slot-label">Output</div>
          <div class="furnace-slot" id="furnace-output-slot">
            <img style="display:none;">
            <span class="slot-count"></span>
          </div>
        </div>
      </div>

      <div class="furnace-fuel-section">
        <div class="slot-label">Fuel (Coal)</div>
        <div class="furnace-slot" id="furnace-fuel-slot">
          <img style="display:none;">
          <span class="slot-count"></span>
        </div>
        <div class="fuel-bar-container">
          <div class="fuel-bar" id="furnace-fuel-bar"></div>
        </div>
        <div class="fuel-label" id="fuel-remaining">0 items remaining</div>
      </div>

      <div class="furnace-hint">
        <p>Drag items or Shift+Click to transfer</p>
        <p>Right-click for half stack</p>
      </div>
    `;

    // Insert into inventory menu container (next to crafting section)
    const inventoryContainer = document.querySelector('.inventory-container');
    if (inventoryContainer) {
      // Insert furnace section before inventory section (next to crafting)
      const inventorySection = inventoryContainer.querySelector('.inventory-section');
      if (inventorySection) {
        inventoryContainer.insertBefore(this.furnaceSectionElement, inventorySection);
      } else {
        inventoryContainer.appendChild(this.furnaceSectionElement);
      }
    }

    // Get UI elements
    this.fuelSlotElement = document.getElementById('furnace-fuel-slot');
    this.inputSlotElement = document.getElementById('furnace-input-slot');
    this.outputSlotElement = document.getElementById('furnace-output-slot');
    this.progressBarElement = document.getElementById('furnace-progress-bar');
    this.fuelBarElement = document.getElementById('furnace-fuel-bar');

    // Setup slot interactions
    this.setupSlotInteractions();

    // Add styles
    this.addStyles();

    // Initially hide furnace section
    this.furnaceSectionElement.style.display = 'none';
  }

  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .furnace-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0 15px;
        border-left: 1px solid #444;
        margin-left: 15px;
      }

      .furnace-section h3 {
        font-size: 14px;
        color: #FF6600;
        margin-bottom: 10px;
      }

      .furnace-grid {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 10px;
        margin-bottom: 15px;
      }

      .furnace-input-section,
      .furnace-output-section {
        text-align: center;
      }

      .furnace-section .slot-label {
        font-size: 11px;
        color: #888;
        margin-bottom: 4px;
      }

      .furnace-slot {
        width: 50px;
        height: 50px;
        background: rgba(139, 69, 19, 0.3);
        border: 2px solid #8B4513;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        cursor: pointer;
        transition: border-color 0.2s;
      }

      .furnace-slot:hover {
        border-color: #FF6600;
      }

      .furnace-slot.drag-over {
        border-color: #4CAF50;
        background: rgba(76, 175, 80, 0.3);
      }

      .furnace-slot.dragging {
        opacity: 0.5;
      }

      .furnace-slot img {
        width: 40px;
        height: 40px;
        image-rendering: pixelated;
        pointer-events: none;
      }

      .furnace-slot .slot-count {
        position: absolute;
        bottom: 2px;
        right: 4px;
        font-size: 12px;
        color: white;
        text-shadow: 1px 1px 2px black;
        pointer-events: none;
        background: rgba(0, 0, 0, 0.6);
        padding: 1px 3px;
        border-radius: 2px;
      }

      .furnace-progress-section {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .furnace-arrow {
        position: relative;
        width: 40px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .arrow-icon {
        font-size: 24px;
        color: #666;
      }

      .furnace-section .progress-bar-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
      }

      .furnace-section .progress-bar {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #FF6600, #FF9933);
        border-radius: 2px;
        transition: width 0.1s;
      }

      .furnace-fuel-section {
        text-align: center;
        padding: 10px;
        background: rgba(139, 69, 19, 0.2);
        border-radius: 4px;
        margin-bottom: 10px;
        width: 100%;
      }

      .fuel-bar-container {
        width: 100%;
        height: 6px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 3px;
        margin-top: 8px;
      }

      .fuel-bar {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #FF3300, #FF6600);
        border-radius: 3px;
        transition: width 0.3s;
      }

      .fuel-label {
        margin-top: 4px;
        font-size: 11px;
        color: #888;
      }

      .furnace-hint {
        font-size: 10px;
        color: #666;
        text-align: center;
      }

      .furnace-hint p {
        margin: 2px 0;
      }
    `;
    document.head.appendChild(style);
  }

  private setupSlotInteractions(): void {
    // Fuel slot - accepts coal
    if (this.fuelSlotElement) {
      this.fuelSlotElement.dataset.furnaceSlot = this.SLOT_FUEL;
      this.setupFurnaceSlot(this.fuelSlotElement, this.SLOT_FUEL);
    }

    // Input slot - accepts smeltable ores
    if (this.inputSlotElement) {
      this.inputSlotElement.dataset.furnaceSlot = this.SLOT_INPUT;
      this.setupFurnaceSlot(this.inputSlotElement, this.SLOT_INPUT);
    }

    // Output slot - collect smelted items
    if (this.outputSlotElement) {
      this.outputSlotElement.dataset.furnaceSlot = this.SLOT_OUTPUT;
      this.setupFurnaceSlot(this.outputSlotElement, this.SLOT_OUTPUT);
    }
  }

  private setupFurnaceSlot(element: HTMLElement, slotType: string): void {
    element.draggable = true;

    // Left click - add one item from selected hotbar slot
    element.addEventListener('click', (e) => {
      if (e.shiftKey) {
        this.handleShiftClick(slotType);
      } else {
        this.handleSlotClick(slotType);
      }
    });

    // Right click - pick up half or add half
    element.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.handleRightClick(slotType);
    });

    // Drag start - pick up items from slot
    element.addEventListener('dragstart', (e) => {
      this.handleFurnaceDragStart(e, slotType);
    });

    element.addEventListener('dragend', () => {
      element.classList.remove('dragging');
    });

    // Drop target - accept items from inventory
    element.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
      element.classList.add('drag-over');
    });

    element.addEventListener('dragleave', () => {
      element.classList.remove('drag-over');
    });

    element.addEventListener('drop', (e) => {
      e.preventDefault();
      element.classList.remove('drag-over');
      this.handleDropOnFurnace(e, slotType);
    });
  }

  private handleFurnaceDragStart(e: DragEvent, slotType: string): void {
    if (!this.currentFurnace) {
      e.preventDefault();
      return;
    }

    let hasItem = false;
    let itemType: ItemType | null = null;
    let quantity = 0;

    if (slotType === this.SLOT_OUTPUT) {
      hasItem = this.currentFurnace.outputItem !== null && this.currentFurnace.outputCount > 0;
      if (hasItem) {
        itemType = this.currentFurnace.outputItem as ItemType;
        quantity = this.currentFurnace.outputCount;
      }
    } else if (slotType === this.SLOT_INPUT) {
      hasItem = this.currentFurnace.smeltingItem !== null && this.currentFurnace.inputCount > 0;
      if (hasItem) {
        itemType = this.currentFurnace.smeltingItem as ItemType;
        quantity = this.currentFurnace.inputCount;
      }
    } else if (slotType === this.SLOT_FUEL) {
      hasItem = this.currentFurnace.fuelItem !== null && this.currentFurnace.fuelCount > 0;
      if (hasItem) {
        itemType = this.currentFurnace.fuelItem as ItemType;
        quantity = this.currentFurnace.fuelCount;
      }
    }

    if (!hasItem || itemType === null) {
      e.preventDefault();
      return;
    }

    // Set drag data with furnace slot identifier
    e.dataTransfer?.setData('text/plain', `furnace:${slotType}`);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }

    const target = e.currentTarget as HTMLElement;
    target.classList.add('dragging');

    // Create drag ghost
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    const itemData = ITEM_DATA[itemType];
    ghost.innerHTML = `<img src="${getAssetPath(itemData.texture)}" style="width:40px;height:40px;image-rendering:pixelated;">`;
    if (quantity > 1) {
      ghost.innerHTML += `<span class="ghost-count">${quantity}</span>`;
    }
    ghost.style.position = 'fixed';
    ghost.style.top = '-100px';
    ghost.style.left = '-100px';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '9999';
    ghost.style.background = 'rgba(0,0,0,0.8)';
    ghost.style.border = '2px solid #4CAF50';
    ghost.style.borderRadius = '4px';
    ghost.style.padding = '4px';
    document.body.appendChild(ghost);

    e.dataTransfer?.setDragImage(ghost, 25, 25);

    // Clean up ghost after drag
    setTimeout(() => ghost.remove(), 0);
  }

  private handleDropOnFurnace(e: DragEvent, targetSlotType: string): void {
    if (!this.currentFurnace) return;

    const sourceData = e.dataTransfer?.getData('text/plain');
    if (!sourceData) return;

    // Check if dropping from inventory slot (numeric index)
    const sourceSlotIndex = parseInt(sourceData);
    if (!isNaN(sourceSlotIndex) && sourceSlotIndex >= 0) {
      this.handleDropFromInventory(sourceSlotIndex, targetSlotType, e.shiftKey);
      return;
    }

    // Check if dropping from another furnace slot
    if (sourceData.startsWith('furnace:')) {
      // Can't drop furnace items onto furnace slots (for now)
      return;
    }
  }

  private handleDropFromInventory(sourceSlotIndex: number, targetSlotType: string, _transferAll: boolean = false): void {
    if (!this.currentFurnace) return;

    const slotData = this.inventory.getSlot(sourceSlotIndex);
    if (!slotData || slotData.itemType === ItemType.NONE) return;

    // Always transfer entire stack on drag-and-drop
    const quantity = slotData.quantity;

    if (targetSlotType === this.SLOT_FUEL) {
      if (this.burnFuel(slotData.itemType, quantity)) {
        this.updateUI();
        this.notifyChanges();
      }
    } else if (targetSlotType === this.SLOT_INPUT) {
      // Only accept smeltable ores
      const recipe = this.smeltable(slotData.itemType);
      if (recipe) {
        // Check if output slot has a different item type (would cause conflict)
        if (this.currentFurnace.outputItem !== null && this.currentFurnace.outputItem !== recipe.output) {
          return; // Can't smelt - output slot has different item type
        }
        // Check if input is empty OR same item type
        if (this.currentFurnace.smeltingItem === null || this.currentFurnace.smeltingItem === slotData.itemType) {
          if (this.currentFurnace.smeltingItem === null) {
            this.currentFurnace.smeltingItem = slotData.itemType;
            this.currentFurnace.smeltingProgress = 0;
          }
          this.currentFurnace.inputCount += quantity;
          this.inventory.removeItem(slotData.itemType, quantity);
          this.updateUI();
          this.notifyChanges();
        }
      }
    }
    // Can't drop onto output slot
  }

  private handleSlotClick(slotType: string): void {
    if (!this.currentFurnace) return;

    if (slotType === this.SLOT_FUEL) {
      this.handleFuelSlotClick();
    } else if (slotType === this.SLOT_INPUT) {
      this.handleInputSlotClick();
    } else if (slotType === this.SLOT_OUTPUT) {
      this.handleOutputSlotClick();
    }
  }

  private handleRightClick(slotType: string): void {
    if (!this.currentFurnace) return;

    if (slotType === this.SLOT_OUTPUT) {
      // Right-click output: pick up half
      if (this.currentFurnace.outputItem !== null && this.currentFurnace.outputCount > 0) {
        const itemType = this.currentFurnace.outputItem as ItemType;
        const halfCount = halfUp(this.currentFurnace.outputCount);
        const remaining = this.inventory.addItem(itemType, halfCount);
        const actuallyTaken = halfCount - remaining;

        if (actuallyTaken > 0) {
          this.currentFurnace.outputCount -= actuallyTaken;
          if (this.currentFurnace.outputCount === 0) {
            this.currentFurnace.outputItem = null;
          }
          this.updateUI();
          this.notifyChanges();
        }
      }
    } else if (slotType === this.SLOT_FUEL) {
      // Right-click fuel: add half of the held fuel, else take half the stack back
      const selectedItem = this.inventory.getSelectedItem();
      if (selectedItem.quantity > 0 && furnaceFuel(selectedItem.itemType)) {
        if (this.burnFuel(selectedItem.itemType, halfUp(selectedItem.quantity))) {
          this.updateUI();
          this.notifyChanges();
        }
      } else if (this.takeFuel(halfUp(this.currentFurnace.fuelCount))) {
        this.updateUI();
        this.notifyChanges();
      }
    } else if (slotType === this.SLOT_INPUT) {
      // Right-click input: return item to inventory if there's one
      if (this.currentFurnace.smeltingItem !== null) {
        const itemType = this.currentFurnace.smeltingItem as ItemType;
        const remaining = this.inventory.addItem(itemType, 1);
        if (remaining === 0) {
          this.currentFurnace.smeltingItem = null;
          this.currentFurnace.smeltingProgress = 0;
          this.updateUI();
          this.notifyChanges();
        }
      }
    }
  }

  private handleShiftClick(slotType: string): void {
    if (!this.currentFurnace) return;

    if (slotType === this.SLOT_OUTPUT) {
      // Shift+click output: move all to inventory
      if (this.currentFurnace.outputItem !== null && this.currentFurnace.outputCount > 0) {
        const itemType = this.currentFurnace.outputItem as ItemType;
        const remaining = this.inventory.addItem(itemType, this.currentFurnace.outputCount);

        if (remaining < this.currentFurnace.outputCount) {
          this.currentFurnace.outputCount = remaining;
          if (remaining === 0) {
            this.currentFurnace.outputItem = null;
          }
          this.updateUI();
          this.notifyChanges();
        }
      }
    } else if (slotType === this.SLOT_INPUT) {
      // Shift+click input: return all queued items to inventory OR add all held items
      if (this.currentFurnace.smeltingItem !== null && this.currentFurnace.inputCount > 0) {
        const itemType = this.currentFurnace.smeltingItem as ItemType;
        const remaining = this.inventory.addItem(itemType, this.currentFurnace.inputCount);
        const returned = this.currentFurnace.inputCount - remaining;
        if (returned > 0) {
          this.currentFurnace.inputCount -= returned;
          if (this.currentFurnace.inputCount === 0) {
            this.currentFurnace.smeltingItem = null;
            this.currentFurnace.smeltingProgress = 0;
          }
          this.updateUI();
          this.notifyChanges();
        }
      } else {
        // No items in furnace input - try to add entire stack from selected slot
        const selectedItem = this.inventory.getSelectedItem();
        const recipe = this.smeltable(selectedItem.itemType);
        if (recipe && selectedItem.quantity > 0) {
          if (this.currentFurnace.smeltingItem === null || this.currentFurnace.smeltingItem === selectedItem.itemType) {
            const toTransfer = selectedItem.quantity;
            if (this.currentFurnace.smeltingItem === null) {
              this.currentFurnace.smeltingItem = selectedItem.itemType;
              this.currentFurnace.smeltingProgress = 0;
            }
            this.currentFurnace.inputCount += toTransfer;
            this.inventory.removeItem(selectedItem.itemType, toTransfer);
            this.updateUI();
            this.notifyChanges();
          }
        }
      }
    } else if (slotType === this.SLOT_FUEL) {
      // Shift+click fuel: take the unburnt stack back, else add all the held fuel
      const selectedItem = this.inventory.getSelectedItem();
      if (this.takeFuel(this.currentFurnace.fuelCount) ||
          (selectedItem.quantity > 0 && this.burnFuel(selectedItem.itemType, selectedItem.quantity))) {
        this.updateUI();
        this.notifyChanges();
      }
    }
  }

  /**
   * Feed `count` of a fuel (SmeltingRecipes FURNACE_FUELS) into the open
   * furnace: adds its smelts, takes the items, and gives back any container
   * (a lava bucket's empty bucket). False when the item doesn't burn.
   */
  private burnFuel(itemType: ItemType, count: number): boolean {
    const fuel = furnaceFuel(itemType);
    const furnace = this.currentFurnace;
    if (!furnace || !fuel || count <= 0) return false;
    if (fuel.returns !== undefined) {
      // A container fuel (lava bucket) pours in at once and hands its
      // container back, so it can't sit in the slot as a stack
      const taken = Math.min(count, this.inventory.getItemCount(itemType));
      if (taken <= 0) return false;
      this.inventory.removeItem(itemType, taken);
      furnace.fuelAmount += taken * fuel.smelts;
      this.inventory.addItem(fuel.returns, taken);
      return true;
    }
    // Anything else stacks in the fuel slot unburnt (one kind at a time, one
    // stack's worth) and lights an item at a time as smelts need it
    if (furnace.fuelItem !== null && furnace.fuelItem !== itemType) return false;
    const room = (ITEM_DATA[itemType]?.stackSize ?? 64) - furnace.fuelCount;
    const taken = Math.min(count, room, this.inventory.getItemCount(itemType));
    if (taken <= 0) return false;
    this.inventory.removeItem(itemType, taken);
    furnace.fuelItem = itemType;
    furnace.fuelCount += taken;
    return true;
  }

  /** Move up to `count` of the unburnt fuel stack back to the inventory */
  private takeFuel(count: number): boolean {
    const furnace = this.currentFurnace;
    if (!furnace || furnace.fuelItem === null || furnace.fuelCount <= 0 || count <= 0) return false;
    const want = Math.min(count, furnace.fuelCount);
    const taken = want - this.inventory.addItem(furnace.fuelItem as ItemType, want);
    if (taken <= 0) return false;
    furnace.fuelCount -= taken;
    if (furnace.fuelCount === 0) furnace.fuelItem = null;
    return true;
  }

  private notifyChanges(): void {
    if (this.onSaveCallback) this.onSaveCallback();
    if (this.onUpdateHotbarCallback) this.onUpdateHotbarCallback();
    if (this.onUpdateInventoryCallback) this.onUpdateInventoryCallback();
  }

  private handleFuelSlotClick(): void {
    if (!this.currentFurnace) return;

    const selectedItem = this.inventory.getSelectedItem();

    // Holding fuel adds one; otherwise the click takes the fuel stack back
    const holdingFuel = selectedItem.quantity > 0 && furnaceFuel(selectedItem.itemType) !== undefined;
    if (holdingFuel ? this.burnFuel(selectedItem.itemType, 1) : this.takeFuel(this.currentFurnace.fuelCount)) {
      this.updateUI();
      this.notifyChanges();
    }
  }

  /** The smelt for an input, if a mission has unlocked it; a locked one says which mission. */
  private smeltable(itemType: ItemType) {
    const recipe = smeltingRecipeFor(itemType);
    const locked = recipe ? recipeLockedLabel(recipe.output) : null;
    if (locked) {
      showToast(`${ITEM_DATA[recipe!.output]?.name ?? 'That'} is locked - ${locked}`, { duration: 3000 });
      return undefined;
    }
    return recipe;
  }

  private handleInputSlotClick(): void {
    if (!this.currentFurnace) return;

    const selectedItem = this.inventory.getSelectedItem();

    // Check if holding a smeltable ore
    const recipe = this.smeltable(selectedItem.itemType);
    if (recipe && selectedItem.quantity > 0) {
      // Check if output slot has a different item type (would cause conflict)
      if (this.currentFurnace.outputItem !== null && this.currentFurnace.outputItem !== recipe.output) {
        return; // Can't smelt - output slot has different item type
      }
      // Allow adding if empty OR same item type
      if (this.currentFurnace.smeltingItem === null || this.currentFurnace.smeltingItem === selectedItem.itemType) {
        if (this.currentFurnace.smeltingItem === null) {
          this.currentFurnace.smeltingItem = selectedItem.itemType;
          this.currentFurnace.smeltingProgress = 0;
        }
        // Transfer entire stack
        const toTransfer = selectedItem.quantity;
        this.currentFurnace.inputCount += toTransfer;
        this.inventory.removeItem(selectedItem.itemType, toTransfer);
        this.updateUI();
        this.notifyChanges();
      }
    }
  }

  private handleOutputSlotClick(): void {
    if (!this.currentFurnace) return;

    // Collect all completed items
    if (this.currentFurnace.outputItem !== null && this.currentFurnace.outputCount > 0) {
      const itemType = this.currentFurnace.outputItem as ItemType;
      const remaining = this.inventory.addItem(itemType, this.currentFurnace.outputCount);

      if (remaining < this.currentFurnace.outputCount) {
        // Some or all items collected
        this.currentFurnace.outputCount = remaining;
        if (remaining === 0) {
          this.currentFurnace.outputItem = null;
        }
        this.updateUI();
        this.notifyChanges();
      }
    }
  }

  // Handle drops from furnace to inventory slots (called by CraftingSystem)
  public handleDropToInventory(targetSlotIndex: number, sourceSlotType: string): boolean {
    if (!this.currentFurnace) return false;

    if (sourceSlotType === this.SLOT_OUTPUT) {
      if (this.currentFurnace.outputItem !== null && this.currentFurnace.outputCount > 0) {
        const itemType = this.currentFurnace.outputItem as ItemType;
        const targetSlot = this.inventory.getSlot(targetSlotIndex);

        // Check if target slot is empty or has same item type
        if (targetSlot && (targetSlot.itemType === ItemType.NONE || targetSlot.itemType === itemType)) {
          const maxStack = 64; // Assuming max stack size
          const currentCount = targetSlot.itemType === itemType ? targetSlot.quantity : 0;
          const spaceAvailable = maxStack - currentCount;
          const toTransfer = Math.min(this.currentFurnace.outputCount, spaceAvailable);

          if (toTransfer > 0) {
            this.inventory.setSlot(targetSlotIndex, itemType, currentCount + toTransfer);
            this.currentFurnace.outputCount -= toTransfer;
            if (this.currentFurnace.outputCount === 0) {
              this.currentFurnace.outputItem = null;
            }
            this.updateUI();
            this.notifyChanges();
            return true;
          }
        }
      }
    } else if (sourceSlotType === this.SLOT_INPUT) {
      if (this.currentFurnace.smeltingItem !== null && this.currentFurnace.inputCount > 0) {
        const itemType = this.currentFurnace.smeltingItem as ItemType;
        const targetSlot = this.inventory.getSlot(targetSlotIndex);

        if (targetSlot && (targetSlot.itemType === ItemType.NONE || targetSlot.itemType === itemType)) {
          const maxStack = 64;
          const currentCount = targetSlot.itemType === itemType ? targetSlot.quantity : 0;
          const spaceAvailable = maxStack - currentCount;
          const toTransfer = Math.min(this.currentFurnace.inputCount, spaceAvailable);

          if (toTransfer > 0) {
            this.inventory.setSlot(targetSlotIndex, itemType, currentCount + toTransfer);
            this.currentFurnace.inputCount -= toTransfer;
            if (this.currentFurnace.inputCount === 0) {
              this.currentFurnace.smeltingItem = null;
              this.currentFurnace.smeltingProgress = 0;
            }
            this.updateUI();
            this.notifyChanges();
            return true;
          }
        }
      }
    } else if (sourceSlotType === this.SLOT_FUEL) {
      const furnace = this.currentFurnace;
      if (furnace.fuelItem !== null && furnace.fuelCount > 0) {
        const itemType = furnace.fuelItem as ItemType;
        const targetSlot = this.inventory.getSlot(targetSlotIndex);
        if (targetSlot && (targetSlot.itemType === ItemType.NONE || targetSlot.itemType === itemType)) {
          const currentCount = targetSlot.itemType === itemType ? targetSlot.quantity : 0;
          const toTransfer = Math.min(furnace.fuelCount, (ITEM_DATA[itemType]?.stackSize ?? 64) - currentCount);
          if (toTransfer > 0) {
            this.inventory.setSlot(targetSlotIndex, itemType, currentCount + toTransfer);
            furnace.fuelCount -= toTransfer;
            if (furnace.fuelCount === 0) furnace.fuelItem = null;
            this.updateUI();
            this.notifyChanges();
            return true;
          }
        }
      }
    }
    // (only the burning item's remainder stays put - it's already alight)

    return false;
  }

  private setupKeyboardHandler(): void {
    // Keyboard handling is done through the inventory menu now
    // ESC closes the inventory which will also close the furnace
  }

  public open(furnace: PlacedFurnace): void {
    this.currentFurnace = furnace;
    if (this.furnaceSectionElement) {
      // Show the furnace section in the inventory
      this.furnaceSectionElement.style.display = 'flex';
      this.isOpen = true;
      this.updateUI();

      // Open the inventory menu if it's not already open
      if (this.onOpenInventoryCallback) {
        this.onOpenInventoryCallback();
      }

      // Start update loop
      this.updateInterval = window.setInterval(() => this.update(), 100);
    }
  }

  public close(): void {
    if (this.furnaceSectionElement) {
      this.furnaceSectionElement.style.display = 'none';
      this.isOpen = false;
      this.currentFurnace = null;

      // Stop update loop
      if (this.updateInterval !== null) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }

      if (this.onCloseCallback) {
        this.onCloseCallback();
      }
    }
  }

  /** Redraw the open panel (its object changed under it - another player's record). */
  public refresh(): void {
    if (this.isMenuOpen()) this.updateUI();
  }

  public isMenuOpen(): boolean {
    return this.isOpen;
  }

  public setOnCloseCallback(callback: () => void): void {
    this.onCloseCallback = callback;
  }

  public setOnSaveCallback(callback: () => void): void {
    this.onSaveCallback = callback;
  }

  public setOnOpenInventoryCallback(callback: () => void): void {
    this.onOpenInventoryCallback = callback;
  }

  public setOnUpdateHotbarCallback(callback: () => void): void {
    this.onUpdateHotbarCallback = callback;
  }

  public setOnUpdateInventoryCallback(callback: () => void): void {
    this.onUpdateInventoryCallback = callback;
  }

  public getCurrentFurnace(): PlacedFurnace | null {
    return this.currentFurnace;
  }

  private update(): void {
    if (!this.currentFurnace || !this.isOpen) return;

    // Smelting logic is handled by FurnaceManager.update() which runs every frame
    // regardless of whether the UI is open. This method only updates the UI display.
    this.updateUI();
  }

  private updateUI(): void {
    if (!this.currentFurnace) return;

    const furnace = this.currentFurnace;

    // Update fuel slot display
    if (this.fuelSlotElement) {
      const img = this.fuelSlotElement.querySelector('img') as HTMLImageElement;
      const count = this.fuelSlotElement.querySelector('.slot-count') as HTMLElement;

      // The unburnt fuel stack, as items you can take back
      if (furnace.fuelItem !== null && furnace.fuelCount > 0) {
        img.src = getAssetPath(ITEM_DATA[furnace.fuelItem as ItemType].texture);
        img.style.display = 'block';
        count.textContent = furnace.fuelCount > 1 ? furnace.fuelCount.toString() : '';
      } else {
        img.style.display = 'none';
        count.textContent = '';
      }
    }

    // Update fuel bar
    if (this.fuelBarElement) {
      const fuelPercent = Math.min(100, (furnace.fuelAmount / this.FUEL_PER_COAL) * 100);
      this.fuelBarElement.style.width = `${fuelPercent}%`;
    }

    // Update fuel label
    const fuelLabel = document.getElementById('fuel-remaining');
    if (fuelLabel) {
      const stacked = furnace.fuelItem !== null
        ? furnace.fuelCount * (furnaceFuel(furnace.fuelItem as ItemType)?.smelts ?? 0) : 0;
      fuelLabel.textContent = `${furnace.fuelAmount + stacked} smelts left`;
    }

    // Update input slot
    if (this.inputSlotElement) {
      const img = this.inputSlotElement.querySelector('img') as HTMLImageElement;
      const count = this.inputSlotElement.querySelector('.slot-count') as HTMLElement;

      if (furnace.smeltingItem !== null && furnace.inputCount > 0) {
        const itemData = ITEM_DATA[furnace.smeltingItem as ItemType];
        if (itemData) {
          img.src = getAssetPath(itemData.texture);
          img.style.display = 'block';
        }
        count.textContent = furnace.inputCount > 1 ? furnace.inputCount.toString() : '';
      } else {
        img.style.display = 'none';
        count.textContent = '';
      }
    }

    // Update progress bar
    if (this.progressBarElement) {
      this.progressBarElement.style.width = `${furnace.smeltingProgress * 100}%`;
    }

    // Update output slot
    if (this.outputSlotElement) {
      const img = this.outputSlotElement.querySelector('img') as HTMLImageElement;
      const countEl = this.outputSlotElement.querySelector('.slot-count') as HTMLElement;

      if (furnace.outputItem !== null && furnace.outputCount > 0) {
        const itemData = ITEM_DATA[furnace.outputItem as ItemType];
        if (itemData) {
          img.src = getAssetPath(itemData.texture);
          img.style.display = 'block';
        }
        countEl.textContent = furnace.outputCount > 1 ? furnace.outputCount.toString() : '';
      } else {
        img.style.display = 'none';
        countEl.textContent = '';
      }
    }
  }
}
