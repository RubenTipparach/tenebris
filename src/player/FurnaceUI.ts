import { Inventory, ItemType, ITEM_DATA } from './Inventory';
import { PlacedFurnace } from '../planet/Furnace';
import { getAssetPath } from '../utils/assetPath';

// Smelting recipes: ore -> ingot
export interface SmeltingRecipe {
  input: ItemType;
  output: ItemType;
  outputQuantity: number;
}

export const SMELTING_RECIPES: SmeltingRecipe[] = [
  { input: ItemType.ORE_COPPER, output: ItemType.INGOT_COPPER, outputQuantity: 1 },
  { input: ItemType.ORE_IRON, output: ItemType.INGOT_IRON, outputQuantity: 1 },
  { input: ItemType.ORE_GOLD, output: ItemType.INGOT_GOLD, outputQuantity: 1 },
  { input: ItemType.ORE_ALUMINUM, output: ItemType.INGOT_ALUMINUM, outputQuantity: 1 },
  // Note: Lithium and Cobalt require electrical furnace (not implemented yet)
];

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

  // UI Elements
  private fuelSlotElement: HTMLElement | null = null;
  private inputSlotElement: HTMLElement | null = null;
  private outputSlotElement: HTMLElement | null = null;
  private progressBarElement: HTMLElement | null = null;
  private fuelBarElement: HTMLElement | null = null;

  // Smelting state
  private readonly SMELT_TIME = 10; // seconds per item
  private readonly FUEL_PER_COAL = 8; // Each coal smelts 8 items

  // Slot type identifiers for drag/drop
  private readonly SLOT_FUEL = 'furnace-fuel';
  private readonly SLOT_INPUT = 'furnace-input';
  private readonly SLOT_OUTPUT = 'furnace-output';

  constructor(inventory: Inventory) {
    this.inventory = inventory;
    this.createUI();
    this.setupKeyboardHandler();
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
        <p>Click slots to add items from hotbar</p>
        <p>Lithium/Cobalt need Electrical Furnace</p>
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
      }

      .furnace-slot .slot-count {
        position: absolute;
        bottom: 2px;
        right: 4px;
        font-size: 12px;
        color: white;
        text-shadow: 1px 1px 2px black;
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
      this.fuelSlotElement.addEventListener('click', () => this.handleFuelSlotClick());
      this.fuelSlotElement.dataset.furnaceSlot = this.SLOT_FUEL;
      this.setupDropTarget(this.fuelSlotElement, this.SLOT_FUEL);
    }

    // Input slot - accepts smeltable ores
    if (this.inputSlotElement) {
      this.inputSlotElement.addEventListener('click', () => this.handleInputSlotClick());
      this.inputSlotElement.dataset.furnaceSlot = this.SLOT_INPUT;
      this.setupDropTarget(this.inputSlotElement, this.SLOT_INPUT);
    }

    // Output slot - collect smelted items (drag out only)
    if (this.outputSlotElement) {
      this.outputSlotElement.addEventListener('click', () => this.handleOutputSlotClick());
      this.outputSlotElement.dataset.furnaceSlot = this.SLOT_OUTPUT;
      this.setupDragSource(this.outputSlotElement, this.SLOT_OUTPUT);
    }
  }

  private setupDropTarget(element: HTMLElement, slotType: string): void {
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

      const sourceData = e.dataTransfer?.getData('text/plain');
      if (!sourceData) return;

      // Check if dropping from inventory slot
      const sourceSlotIndex = parseInt(sourceData);
      if (!isNaN(sourceSlotIndex) && sourceSlotIndex >= 0) {
        this.handleDropFromInventory(sourceSlotIndex, slotType);
      }
    });
  }

  private setupDragSource(element: HTMLElement, slotType: string): void {
    element.draggable = true;

    element.addEventListener('dragstart', (e) => {
      if (!this.currentFurnace) return;

      // Only allow dragging if there's output
      if (slotType === this.SLOT_OUTPUT && this.currentFurnace.outputItem !== null && this.currentFurnace.outputCount > 0) {
        e.dataTransfer?.setData('text/plain', `furnace:${slotType}`);
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
        }
        element.classList.add('dragging');
      } else {
        e.preventDefault();
      }
    });

    element.addEventListener('dragend', () => {
      element.classList.remove('dragging');
    });
  }

  private handleDropFromInventory(sourceSlotIndex: number, targetSlotType: string): void {
    if (!this.currentFurnace) return;

    const slotData = this.inventory.getSlot(sourceSlotIndex);
    if (!slotData || slotData.itemType === ItemType.NONE) return;

    if (targetSlotType === this.SLOT_FUEL) {
      // Only accept coal for fuel
      if (slotData.itemType === ItemType.COAL) {
        this.currentFurnace.fuelAmount += this.FUEL_PER_COAL;
        this.inventory.removeItem(ItemType.COAL, 1);
        this.updateUI();
        this.notifyChanges();
      }
    } else if (targetSlotType === this.SLOT_INPUT) {
      // Only accept smeltable ores
      const recipe = SMELTING_RECIPES.find(r => r.input === slotData.itemType);
      if (recipe && this.currentFurnace.smeltingItem === null) {
        this.currentFurnace.smeltingItem = slotData.itemType;
        this.currentFurnace.smeltingProgress = 0;
        this.inventory.removeItem(slotData.itemType, 1);
        this.updateUI();
        this.notifyChanges();
      }
    }
  }

  private notifyChanges(): void {
    if (this.onSaveCallback) this.onSaveCallback();
    if (this.onUpdateHotbarCallback) this.onUpdateHotbarCallback();
  }

  private handleFuelSlotClick(): void {
    if (!this.currentFurnace) return;

    const selectedItem = this.inventory.getSelectedItem();

    // If holding coal, add it as fuel
    if (selectedItem.itemType === ItemType.COAL && selectedItem.quantity > 0) {
      // Add fuel to furnace
      this.currentFurnace.fuelAmount += this.FUEL_PER_COAL;
      this.inventory.removeItem(ItemType.COAL, 1);
      this.updateUI();
      this.notifyChanges();
    }
  }

  private handleInputSlotClick(): void {
    if (!this.currentFurnace) return;

    const selectedItem = this.inventory.getSelectedItem();

    // Check if holding a smeltable ore
    const recipe = SMELTING_RECIPES.find(r => r.input === selectedItem.itemType);
    if (recipe && selectedItem.quantity > 0) {
      // Only one item can be smelted at a time for now
      if (this.currentFurnace.smeltingItem === null) {
        this.currentFurnace.smeltingItem = selectedItem.itemType;
        this.currentFurnace.smeltingProgress = 0;
        this.inventory.removeItem(selectedItem.itemType, 1);
        this.updateUI();
        this.notifyChanges();
      }
    }
  }

  private handleOutputSlotClick(): void {
    if (!this.currentFurnace) return;

    // Collect completed items
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

  public getCurrentFurnace(): PlacedFurnace | null {
    return this.currentFurnace;
  }

  private update(): void {
    if (!this.currentFurnace || !this.isOpen) return;

    const furnace = this.currentFurnace;

    // Process smelting if we have fuel and an item
    if (furnace.fuelAmount > 0 && furnace.smeltingItem !== null) {
      // Progress the smelting
      furnace.smeltingProgress += 0.1 / this.SMELT_TIME; // 100ms intervals

      if (furnace.smeltingProgress >= 1) {
        // Smelting complete
        const recipe = SMELTING_RECIPES.find(r => r.input === furnace.smeltingItem);
        if (recipe) {
          // Add to output (or create new output)
          if (furnace.outputItem === null || furnace.outputItem === recipe.output) {
            furnace.outputItem = recipe.output;
            furnace.outputCount += recipe.outputQuantity;
          }
          // Consume fuel
          furnace.fuelAmount--;
        }

        // Reset for next item
        furnace.smeltingItem = null;
        furnace.smeltingProgress = 0;

        if (this.onSaveCallback) this.onSaveCallback();
      }
    }

    this.updateUI();
  }

  private updateUI(): void {
    if (!this.currentFurnace) return;

    const furnace = this.currentFurnace;

    // Update fuel slot display
    if (this.fuelSlotElement) {
      const img = this.fuelSlotElement.querySelector('img') as HTMLImageElement;
      const count = this.fuelSlotElement.querySelector('.slot-count') as HTMLElement;

      // Show coal icon if there's fuel
      if (furnace.fuelAmount > 0) {
        img.src = getAssetPath(ITEM_DATA[ItemType.COAL].texture);
        img.style.display = 'block';
        const fuelItems = Math.ceil(furnace.fuelAmount / this.FUEL_PER_COAL);
        count.textContent = fuelItems > 1 ? fuelItems.toString() : '';
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
      fuelLabel.textContent = `${furnace.fuelAmount} items remaining`;
    }

    // Update input slot
    if (this.inputSlotElement) {
      const img = this.inputSlotElement.querySelector('img') as HTMLImageElement;
      const count = this.inputSlotElement.querySelector('.slot-count') as HTMLElement;

      if (furnace.smeltingItem !== null) {
        const itemData = ITEM_DATA[furnace.smeltingItem as ItemType];
        if (itemData) {
          img.src = getAssetPath(itemData.texture);
          img.style.display = 'block';
        }
        count.textContent = '';
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
