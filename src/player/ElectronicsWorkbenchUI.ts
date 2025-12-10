import { Inventory, ItemType, ITEM_DATA, InventorySlot } from './Inventory';
import { PlacedElectronicsWorkbench } from '../planet/ElectronicsWorkbench';
import { getAssetPath } from '../utils/assetPath';
import { MenuManager } from './MenuManager';
import { PlayerConfig } from '../config/PlayerConfig';

// Electronics crafting recipe definition
export interface ElectronicsRecipe {
  inputs: { itemType: ItemType; quantity: number; slot: number }[];
  output: { itemType: ItemType; quantity: number };
  name: string;
}

// Electronics Workbench recipes
// Grid layout (3x3):
//   0 1 2
//   3 4 5
//   6 7 8
// Legend: S = Sand, C = Copper Ingot, G = Gold Ingot, Co = Cobalt Ingot
export const ELECTRONICS_RECIPES: ElectronicsRecipe[] = [
  // CPU Chip: SSS / CoGC / SSS
  {
    name: 'CPU Chip',
    inputs: [
      { itemType: ItemType.SAND, quantity: 1, slot: 0 },
      { itemType: ItemType.SAND, quantity: 1, slot: 1 },
      { itemType: ItemType.SAND, quantity: 1, slot: 2 },
      { itemType: ItemType.INGOT_COBALT, quantity: 1, slot: 3 },
      { itemType: ItemType.INGOT_GOLD, quantity: 1, slot: 4 },
      { itemType: ItemType.INGOT_COPPER, quantity: 1, slot: 5 },
      { itemType: ItemType.SAND, quantity: 1, slot: 6 },
      { itemType: ItemType.SAND, quantity: 1, slot: 7 },
      { itemType: ItemType.SAND, quantity: 1, slot: 8 },
    ],
    output: { itemType: ItemType.CPU_CHIP, quantity: 1 },
  },
  // RAM Module: SSS / CCC / --- (only top two rows)
  {
    name: 'RAM Module',
    inputs: [
      { itemType: ItemType.SAND, quantity: 1, slot: 0 },
      { itemType: ItemType.SAND, quantity: 1, slot: 1 },
      { itemType: ItemType.SAND, quantity: 1, slot: 2 },
      { itemType: ItemType.INGOT_COPPER, quantity: 1, slot: 3 },
      { itemType: ItemType.INGOT_COPPER, quantity: 1, slot: 4 },
      { itemType: ItemType.INGOT_COPPER, quantity: 1, slot: 5 },
    ],
    output: { itemType: ItemType.RAM_MODULE, quantity: 1 },
  },
  // Motherboard: SSS / SGS / SSS
  {
    name: 'Motherboard',
    inputs: [
      { itemType: ItemType.SAND, quantity: 1, slot: 0 },
      { itemType: ItemType.SAND, quantity: 1, slot: 1 },
      { itemType: ItemType.SAND, quantity: 1, slot: 2 },
      { itemType: ItemType.SAND, quantity: 1, slot: 3 },
      { itemType: ItemType.INGOT_GOLD, quantity: 1, slot: 4 },
      { itemType: ItemType.SAND, quantity: 1, slot: 5 },
      { itemType: ItemType.SAND, quantity: 1, slot: 6 },
      { itemType: ItemType.SAND, quantity: 1, slot: 7 },
      { itemType: ItemType.SAND, quantity: 1, slot: 8 },
    ],
    output: { itemType: ItemType.MOTHERBOARD, quantity: 1 },
  },
  // Power Supply: AAA / Co-Li-Co / AAA
  {
    name: 'Power Supply',
    inputs: [
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 0 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 1 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 2 },
      { itemType: ItemType.INGOT_COBALT, quantity: 1, slot: 3 },
      { itemType: ItemType.INGOT_LITHIUM, quantity: 1, slot: 4 },
      { itemType: ItemType.INGOT_COBALT, quantity: 1, slot: 5 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 6 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 7 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 8 },
    ],
    output: { itemType: ItemType.POWER_SUPPLY, quantity: 1 },
  },
  // Computer: Glass-Glass-Glass / CPU-RAM(x4)-Motherboard / A-PowerSupply-A
  {
    name: 'Computer',
    inputs: [
      { itemType: ItemType.GLASS, quantity: 1, slot: 0 },
      { itemType: ItemType.GLASS, quantity: 1, slot: 1 },
      { itemType: ItemType.GLASS, quantity: 1, slot: 2 },
      { itemType: ItemType.CPU_CHIP, quantity: 1, slot: 3 },
      { itemType: ItemType.RAM_MODULE, quantity: 4, slot: 4 },
      { itemType: ItemType.MOTHERBOARD, quantity: 1, slot: 5 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 6 },
      { itemType: ItemType.POWER_SUPPLY, quantity: 1, slot: 7 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 8 },
    ],
    output: { itemType: ItemType.COMPUTER, quantity: 1 },
  },
  // Print Nozzle: Iron-Iron-Iron / -Copper- / ---
  {
    name: 'Print Nozzle',
    inputs: [
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 0 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 1 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 2 },
      { itemType: ItemType.INGOT_COPPER, quantity: 1, slot: 4 },
    ],
    output: { itemType: ItemType.PRINT_NOZZLE, quantity: 1 },
  },
  // 3D Printer: A-A-A / A-PrintNozzle-A / CPU-Motherboard-PowerSupply
  {
    name: '3D Printer',
    inputs: [
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 0 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 1 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 2 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 3 },
      { itemType: ItemType.PRINT_NOZZLE, quantity: 1, slot: 4 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 5 },
      { itemType: ItemType.CPU_CHIP, quantity: 1, slot: 6 },
      { itemType: ItemType.MOTHERBOARD, quantity: 1, slot: 7 },
      { itemType: ItemType.POWER_SUPPLY, quantity: 1, slot: 8 },
    ],
    output: { itemType: ItemType.PRINTER_3D, quantity: 1 },
  },
];

export class ElectronicsWorkbenchUI {
  private inventory: Inventory;
  private currentWorkbench: PlacedElectronicsWorkbench | null = null;
  private workbenchSectionElement: HTMLElement | null = null;
  private isOpen: boolean = false;
  private onCloseCallback: (() => void) | null = null;
  private onOpenInventoryCallback: (() => void) | null = null;
  private onUpdateHotbarCallback: (() => void) | null = null;
  private onUpdateInventoryCallback: (() => void) | null = null;

  // Crafting grid (3x3 slots for input items)
  private craftingSlots: InventorySlot[] = [];
  private craftingSlotElements: HTMLElement[] = [];
  private outputSlotElement: HTMLElement | null = null;
  private powerStatusElement: HTMLElement | null = null;
  private isPowered: boolean = false;

  // Recipe selection
  private recipeDropdown: HTMLSelectElement | null = null;
  private craftButton: HTMLButtonElement | null = null;
  private selectedRecipeIndex: number = -1;

  // Power check callback
  private isPoweredCallback: ((tileIndex: number) => boolean) | null = null;

  constructor(inventory: Inventory) {
    this.inventory = inventory;
    // Initialize 9 empty slots for 3x3 grid
    for (let i = 0; i < 9; i++) {
      this.craftingSlots.push({ itemType: ItemType.NONE, quantity: 0 });
    }
    this.createUI();
    this.setupKeyboardHandler();

    MenuManager.registerMenu('electronics-workbench', {
      isOpen: () => this.isOpen,
      close: () => this.close(),
    });
  }

  public setIsPoweredCallback(callback: (tileIndex: number) => boolean): void {
    this.isPoweredCallback = callback;
  }

  private createUI(): void {
    this.workbenchSectionElement = document.createElement('div');
    this.workbenchSectionElement.id = 'electronics-workbench-section';
    this.workbenchSectionElement.className = 'electronics-workbench-section';
    this.workbenchSectionElement.innerHTML = `
      <h3>Electronics Workbench</h3>

      <div class="electronics-power-status" id="electronics-power-status">
        <span class="power-icon">⚡</span>
        <span class="power-text">No Power</span>
      </div>

      <div class="electronics-workbench-grid">
        <div class="electronics-crafting-section">
          <div class="electronics-crafting-grid">
            ${[0, 1, 2, 3, 4, 5, 6, 7, 8].map(i => `
              <div class="electronics-slot" id="electronics-slot-${i}" data-slot="${i}">
                <img style="display:none;">
                <span class="slot-count"></span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="electronics-arrow-section">
          <span class="arrow-icon">→</span>
        </div>

        <div class="electronics-output-section">
          <div class="slot-label">Output</div>
          <div class="electronics-slot electronics-output-slot" id="electronics-output-slot">
            <img style="display:none;">
            <span class="slot-count"></span>
          </div>
        </div>
      </div>

      <div class="electronics-recipe-controls">
        <div class="recipe-select-row">
          <label for="electronics-recipe-select">Recipe:</label>
          <select id="electronics-recipe-select" class="electronics-recipe-select">
            <option value="-1">-- Select Recipe --</option>
            ${ELECTRONICS_RECIPES.map((r, i) => `<option value="${i}">${r.name}</option>`).join('')}
          </select>
        </div>
        <button id="electronics-craft-btn" class="electronics-craft-btn" disabled>Craft</button>
      </div>

      <div class="electronics-hint">
        <p>Select a recipe and click Craft</p>
        <p>Requires power from Steam Engine or Hydro Generator</p>
      </div>
    `;

    const inventoryContainer = document.querySelector('.inventory-container');
    if (inventoryContainer) {
      const inventorySection = inventoryContainer.querySelector('.inventory-section');
      if (inventorySection) {
        inventoryContainer.insertBefore(this.workbenchSectionElement, inventorySection);
      } else {
        inventoryContainer.appendChild(this.workbenchSectionElement);
      }
    }

    // Get slot elements
    for (let i = 0; i < 9; i++) {
      const el = document.getElementById(`electronics-slot-${i}`);
      if (el) this.craftingSlotElements.push(el);
    }
    this.outputSlotElement = document.getElementById('electronics-output-slot');
    this.powerStatusElement = document.getElementById('electronics-power-status');
    this.recipeDropdown = document.getElementById('electronics-recipe-select') as HTMLSelectElement;
    this.craftButton = document.getElementById('electronics-craft-btn') as HTMLButtonElement;

    this.setupSlotInteractions();
    this.setupRecipeControls();
    this.addStyles();
  }

  private addStyles(): void {
    const styleId = 'electronics-workbench-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .electronics-workbench-section {
        display: none;
        background: rgba(40, 35, 30, 0.95);
        border: 2px solid #8B7355;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 15px;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
      }

      .electronics-workbench-section.open {
        display: block;
      }

      .electronics-workbench-section h3 {
        margin: 0 0 10px 0;
        color: #FFD700;
        text-align: center;
        font-size: 16px;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
      }

      .electronics-power-status {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 8px;
        margin-bottom: 10px;
        background: rgba(60, 40, 40, 0.8);
        border-radius: 4px;
        font-size: 14px;
      }

      .electronics-power-status.powered {
        background: rgba(40, 80, 40, 0.8);
      }

      .electronics-power-status .power-icon {
        font-size: 18px;
      }

      .electronics-power-status.powered .power-text {
        color: #90EE90;
      }

      .electronics-workbench-grid {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 15px;
        margin-bottom: 10px;
      }

      .electronics-crafting-grid {
        display: grid;
        grid-template-columns: repeat(3, 48px);
        grid-template-rows: repeat(3, 48px);
        gap: 3px;
      }

      .electronics-slot {
        width: 48px;
        height: 48px;
        background: rgba(60, 50, 40, 0.9);
        border: 2px solid #5C4033;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        cursor: pointer;
        transition: border-color 0.2s;
      }

      .electronics-slot:hover {
        border-color: #8B7355;
      }

      .electronics-slot img {
        max-width: 32px;
        max-height: 32px;
        image-rendering: pixelated;
        transform: scale(2);
      }

      .electronics-slot .slot-count {
        position: absolute;
        bottom: 4px;
        right: 6px;
        font-size: 14px;
        color: white;
        text-shadow: 1px 1px 1px black;
        font-weight: bold;
      }

      .electronics-output-slot {
        background: rgba(80, 60, 40, 0.9);
        border-color: #8B7355;
      }

      .electronics-arrow-section {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .electronics-arrow-section .arrow-icon {
        font-size: 32px;
        color: #8B7355;
      }

      .electronics-output-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }

      .electronics-output-section .slot-label {
        font-size: 12px;
        color: #B8A080;
      }

      .electronics-recipe-list {
        background: rgba(50, 40, 35, 0.8);
        border-radius: 4px;
        padding: 8px;
        margin-bottom: 10px;
      }

      .electronics-recipe-list .recipe-label {
        font-size: 12px;
        color: #B8A080;
        margin-bottom: 4px;
      }

      .electronics-recipe-list .recipe-items {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }

      .electronics-recipe-list .recipe-item {
        font-size: 11px;
        color: #90EE90;
        background: rgba(40, 60, 40, 0.6);
        padding: 2px 6px;
        border-radius: 3px;
      }

      .electronics-hint {
        text-align: center;
        font-size: 11px;
        color: #999;
      }

      .electronics-hint p {
        margin: 2px 0;
      }

      .electronics-recipe-controls {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        margin: 15px 0;
        padding: 10px;
        background: rgba(50, 40, 35, 0.8);
        border-radius: 4px;
      }

      .recipe-select-row {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .recipe-select-row label {
        font-size: 13px;
        color: #B8A080;
      }

      .electronics-recipe-select {
        padding: 6px 10px;
        font-size: 13px;
        background: rgba(60, 50, 40, 0.9);
        border: 2px solid #5C4033;
        border-radius: 4px;
        color: #E0D0C0;
        cursor: pointer;
        min-width: 150px;
      }

      .electronics-recipe-select:hover {
        border-color: #8B7355;
      }

      .electronics-recipe-select:focus {
        outline: none;
        border-color: #FFD700;
      }

      .electronics-recipe-select:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .electronics-craft-btn {
        padding: 8px 24px;
        font-size: 14px;
        font-weight: bold;
        background: linear-gradient(180deg, #5C8A5C 0%, #3D5C3D 100%);
        border: 2px solid #7CB97C;
        border-radius: 4px;
        color: #FFFFFF;
        cursor: pointer;
        text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.5);
        transition: all 0.2s;
      }

      .electronics-craft-btn:hover:not(:disabled) {
        background: linear-gradient(180deg, #6CA06C 0%, #4D6C4D 100%);
        border-color: #90EE90;
      }

      .electronics-craft-btn:active:not(:disabled) {
        transform: translateY(1px);
      }

      .electronics-craft-btn:disabled {
        background: linear-gradient(180deg, #5C5C5C 0%, #3D3D3D 100%);
        border-color: #666;
        color: #999;
        cursor: not-allowed;
      }

      /* Resource availability indicators */
      .electronics-slot.has-item {
        border-color: #4CAF50;
      }

      .electronics-slot.missing-item {
        border-color: #c62828;
        background: rgba(198, 40, 40, 0.2);
      }

      /* Item tooltip on hover */
      .electronics-slot .item-tooltip {
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.9);
        color: #fff;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s;
        z-index: 400;
        margin-bottom: 4px;
      }

      .electronics-slot:hover .item-tooltip {
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }

  private setupSlotInteractions(): void {
    // Setup crafting slots
    this.craftingSlotElements.forEach((el, index) => {
      el.addEventListener('click', () => this.handleCraftingSlotClick(index));
      el.addEventListener('dragover', (e) => {
        e.preventDefault();
        el.style.borderColor = '#FFD700';
      });
      el.addEventListener('dragleave', () => {
        el.style.borderColor = '#5C4033';
      });
      el.addEventListener('drop', (e) => {
        e.preventDefault();
        el.style.borderColor = '#5C4033';
        this.handleDrop(e, index);
      });
    });

    // Setup output slot
    if (this.outputSlotElement) {
      this.outputSlotElement.addEventListener('click', () => this.handleOutputClick());
    }
  }

  private setupRecipeControls(): void {
    if (this.recipeDropdown) {
      this.recipeDropdown.addEventListener('change', () => {
        this.selectedRecipeIndex = parseInt(this.recipeDropdown!.value, 10);
        this.updateUI();
      });
    }

    if (this.craftButton) {
      this.craftButton.addEventListener('click', () => {
        this.handleCraftButtonClick();
      });
    }
  }

  private handleCraftButtonClick(): void {
    if (!this.isPowered || this.selectedRecipeIndex < 0) return;

    const recipe = ELECTRONICS_RECIPES[this.selectedRecipeIndex];
    if (!recipe) return;

    // Check if we have all ingredients in inventory
    if (!this.canCraftRecipe(recipe)) return;

    // Remove ingredients from inventory (unless bypass mode is enabled)
    if (!PlayerConfig.DEBUG_BYPASS_CRAFTING_INGREDIENTS) {
      for (const input of recipe.inputs) {
        this.inventory.removeItem(input.itemType, input.quantity);
      }
    }

    // Give output
    this.inventory.addItem(recipe.output.itemType, recipe.output.quantity);

    this.updateUI();
    this.notifyChanges();
  }

  private canCraftRecipe(recipe: ElectronicsRecipe): boolean {
    // Debug mode: bypass ingredient requirements
    if (PlayerConfig.DEBUG_BYPASS_CRAFTING_INGREDIENTS) {
      return true;
    }

    // Group inputs by item type to check total quantities needed
    const requiredItems = new Map<ItemType, number>();
    for (const input of recipe.inputs) {
      const current = requiredItems.get(input.itemType) || 0;
      requiredItems.set(input.itemType, current + input.quantity);
    }

    // Check if inventory has enough of each item
    for (const [itemType, quantity] of requiredItems) {
      if (this.inventory.getItemCount(itemType) < quantity) {
        return false;
      }
    }

    return true;
  }

  private handleCraftingSlotClick(slotIndex: number): void {
    if (!this.isPowered) return;

    const selectedItem = this.inventory.getSelectedItem();
    const craftingSlot = this.craftingSlots[slotIndex];

    if (selectedItem.itemType !== ItemType.NONE && selectedItem.quantity > 0) {
      // Add item to crafting slot
      if (craftingSlot.itemType === ItemType.NONE) {
        this.craftingSlots[slotIndex] = { itemType: selectedItem.itemType, quantity: 1 };
        this.inventory.removeItem(selectedItem.itemType, 1);
      } else if (craftingSlot.itemType === selectedItem.itemType && craftingSlot.quantity < 64) {
        this.craftingSlots[slotIndex].quantity += 1;
        this.inventory.removeItem(selectedItem.itemType, 1);
      }
    } else if (craftingSlot.itemType !== ItemType.NONE) {
      // Return item to inventory
      const remaining = this.inventory.addItem(craftingSlot.itemType, craftingSlot.quantity);
      if (remaining === 0) {
        this.craftingSlots[slotIndex] = { itemType: ItemType.NONE, quantity: 0 };
      } else {
        this.craftingSlots[slotIndex].quantity = remaining;
      }
    }

    this.updateUI();
    this.notifyChanges();
  }

  private handleDrop(e: DragEvent, targetSlotIndex: number): void {
    if (!this.isPowered) return;

    const sourceData = e.dataTransfer?.getData('text/plain');
    if (!sourceData) return;

    // Handle drop from inventory
    if (sourceData.startsWith('inventory:')) {
      const sourceSlotIndex = parseInt(sourceData.replace('inventory:', ''), 10);
      this.handleDropFromInventory(sourceSlotIndex, targetSlotIndex);
    }
  }

  private handleDropFromInventory(sourceSlotIndex: number, targetSlotIndex: number): void {
    const slotData = this.inventory.getSlot(sourceSlotIndex);
    if (!slotData || slotData.itemType === ItemType.NONE) return;

    const craftingSlot = this.craftingSlots[targetSlotIndex];

    // Transfer entire stack
    const quantity = slotData.quantity;

    if (craftingSlot.itemType === ItemType.NONE) {
      this.craftingSlots[targetSlotIndex] = { itemType: slotData.itemType, quantity };
      this.inventory.removeItem(slotData.itemType, quantity);
    } else if (craftingSlot.itemType === slotData.itemType) {
      const canAdd = Math.min(64 - craftingSlot.quantity, quantity);
      this.craftingSlots[targetSlotIndex].quantity += canAdd;
      this.inventory.removeItem(slotData.itemType, canAdd);
    }

    this.updateUI();
    this.notifyChanges();
  }

  private handleOutputClick(): void {
    if (!this.isPowered) return;

    const matchedRecipe = this.findMatchingRecipe();
    if (!matchedRecipe) return;

    // Consume ingredients
    for (const input of matchedRecipe.inputs) {
      const slot = this.craftingSlots[input.slot];
      slot.quantity -= input.quantity;
      if (slot.quantity <= 0) {
        this.craftingSlots[input.slot] = { itemType: ItemType.NONE, quantity: 0 };
      }
    }

    // Give output (addItem returns remaining items that couldn't be added)
    this.inventory.addItem(matchedRecipe.output.itemType, matchedRecipe.output.quantity);

    this.updateUI();
    this.notifyChanges();
  }

  private findMatchingRecipe(): ElectronicsRecipe | null {
    for (const recipe of ELECTRONICS_RECIPES) {
      let matches = true;

      // Check all required inputs are present
      for (const input of recipe.inputs) {
        const slot = this.craftingSlots[input.slot];
        if (slot.itemType !== input.itemType || slot.quantity < input.quantity) {
          matches = false;
          break;
        }
      }

      // Check no extra items in other slots
      if (matches) {
        const requiredSlots = new Set(recipe.inputs.map(i => i.slot));
        for (let i = 0; i < 9; i++) {
          if (!requiredSlots.has(i) && this.craftingSlots[i].itemType !== ItemType.NONE) {
            matches = false;
            break;
          }
        }
      }

      if (matches) return recipe;
    }
    return null;
  }

  public open(workbench: PlacedElectronicsWorkbench): void {
    this.currentWorkbench = workbench;
    this.isOpen = true;

    // Check power status
    if (this.isPoweredCallback) {
      this.isPowered = this.isPoweredCallback(workbench.tileIndex);
    }

    if (this.workbenchSectionElement) {
      this.workbenchSectionElement.style.display = 'block';
    }

    // Open the full inventory menu
    if (this.onOpenInventoryCallback) {
      this.onOpenInventoryCallback();
    }

    this.updateUI();
  }

  public close(): void {
    // Return all items in crafting grid to inventory
    for (let i = 0; i < 9; i++) {
      const slot = this.craftingSlots[i];
      if (slot.itemType !== ItemType.NONE && slot.quantity > 0) {
        this.inventory.addItem(slot.itemType, slot.quantity);
        // If can't add all, items are lost (edge case)
        this.craftingSlots[i] = { itemType: ItemType.NONE, quantity: 0 };
      }
    }

    this.isOpen = false;
    this.currentWorkbench = null;
    this.isPowered = false;

    if (this.workbenchSectionElement) {
      this.workbenchSectionElement.style.display = 'none';
    }

    if (this.onCloseCallback) {
      this.onCloseCallback();
    }

    this.notifyChanges();
  }

  public isMenuOpen(): boolean {
    return this.isOpen;
  }

  private setupKeyboardHandler(): void {
    document.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;

      if (e.key === 'Escape' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        this.close();
      }
    });
  }

  public setOnCloseCallback(callback: () => void): void {
    this.onCloseCallback = callback;
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

  private notifyChanges(): void {
    if (this.onUpdateHotbarCallback) {
      this.onUpdateHotbarCallback();
    }
    if (this.onUpdateInventoryCallback) {
      this.onUpdateInventoryCallback();
    }
  }

  private updateUI(): void {
    if (!this.currentWorkbench) return;

    // Update power status
    if (this.powerStatusElement) {
      if (this.isPowered) {
        this.powerStatusElement.classList.add('powered');
        this.powerStatusElement.querySelector('.power-text')!.textContent = 'Powered';
      } else {
        this.powerStatusElement.classList.remove('powered');
        this.powerStatusElement.querySelector('.power-text')!.textContent = 'No Power';
      }
    }

    // Get selected recipe for preview
    const selectedRecipe = this.selectedRecipeIndex >= 0 ? ELECTRONICS_RECIPES[this.selectedRecipeIndex] : null;

    // Build a map of recipe slot requirements for preview
    const recipeSlotMap = new Map<number, { itemType: ItemType; quantity: number }>();
    if (selectedRecipe) {
      for (const input of selectedRecipe.inputs) {
        recipeSlotMap.set(input.slot, { itemType: input.itemType, quantity: input.quantity });
      }
    }

    // Calculate total required for each item type
    const requiredItems = new Map<ItemType, number>();
    if (selectedRecipe) {
      for (const input of selectedRecipe.inputs) {
        const current = requiredItems.get(input.itemType) || 0;
        requiredItems.set(input.itemType, current + input.quantity);
      }
    }

    // Update crafting slots - show recipe preview
    this.craftingSlotElements.forEach((el, index) => {
      const img = el.querySelector('img') as HTMLImageElement;
      const countEl = el.querySelector('.slot-count') as HTMLElement;
      let tooltipEl = el.querySelector('.item-tooltip') as HTMLElement;

      // Clear previous state
      el.classList.remove('has-item', 'missing-item');
      if (tooltipEl) tooltipEl.remove();

      // Show recipe ingredient preview in this slot
      const recipeSlot = recipeSlotMap.get(index);
      if (recipeSlot && this.isPowered) {
        const itemData = ITEM_DATA[recipeSlot.itemType];
        img.src = getAssetPath(itemData.texture);
        img.style.display = 'block';
        img.style.opacity = '0.7'; // Slightly dimmed to show it's a preview
        countEl.textContent = recipeSlot.quantity > 1 ? recipeSlot.quantity.toString() : '';

        // Add tooltip showing ingredient name
        tooltipEl = document.createElement('span');
        tooltipEl.className = 'item-tooltip';
        tooltipEl.textContent = itemData.name;
        el.appendChild(tooltipEl);

        // Check if player has enough of this item and apply has-item or missing-item
        const totalNeeded = requiredItems.get(recipeSlot.itemType) || 0;
        const hasEnough = PlayerConfig.DEBUG_BYPASS_CRAFTING_INGREDIENTS || this.inventory.hasItem(recipeSlot.itemType, totalNeeded);
        if (hasEnough) {
          el.classList.add('has-item');
        } else {
          el.classList.add('missing-item');
        }
      } else {
        img.style.display = 'none';
        img.style.opacity = '1';
        countEl.textContent = '';
      }

      // Dim slots if not powered
      el.style.opacity = this.isPowered ? '1' : '0.5';
    });

    // Update output slot - show preview of selected recipe output
    if (this.outputSlotElement) {
      const img = this.outputSlotElement.querySelector('img') as HTMLImageElement;
      const countEl = this.outputSlotElement.querySelector('.slot-count') as HTMLElement;
      let outputTooltipEl = this.outputSlotElement.querySelector('.item-tooltip') as HTMLElement;

      // Clear previous tooltip
      if (outputTooltipEl) outputTooltipEl.remove();

      if (selectedRecipe && this.isPowered) {
        const itemData = ITEM_DATA[selectedRecipe.output.itemType];
        img.src = getAssetPath(itemData.texture);
        img.style.display = 'block';
        countEl.textContent = selectedRecipe.output.quantity > 1 ? selectedRecipe.output.quantity.toString() : '';

        // Add tooltip showing output item name
        outputTooltipEl = document.createElement('span');
        outputTooltipEl.className = 'item-tooltip';
        outputTooltipEl.textContent = itemData.name;
        this.outputSlotElement.appendChild(outputTooltipEl);
      } else {
        img.style.display = 'none';
        countEl.textContent = '';
      }

      this.outputSlotElement.style.opacity = this.isPowered ? '1' : '0.5';
    }

    // Update recipe dropdown and craft button
    if (this.recipeDropdown) {
      this.recipeDropdown.disabled = !this.isPowered;
    }

    if (this.craftButton) {
      const canCraft = this.isPowered && selectedRecipe && this.canCraftRecipe(selectedRecipe);
      this.craftButton.disabled = !canCraft;
    }
  }
}
