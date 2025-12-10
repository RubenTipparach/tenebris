import { Inventory, ItemType, ITEM_DATA, InventorySlot } from './Inventory';
import { PlacedElectronicsWorkbench } from '../planet/ElectronicsWorkbench';
import { getAssetPath } from '../utils/assetPath';
import { MenuManager } from './MenuManager';

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
// Legend: S = Silicon (Stone), C = Copper Ingot, G = Gold Ingot, o = Cobalt Ingot
export const ELECTRONICS_RECIPES: ElectronicsRecipe[] = [
  // CPU Chip: SSS / CoGC / SSS
  {
    name: 'CPU Chip',
    inputs: [
      { itemType: ItemType.STONE, quantity: 1, slot: 0 },
      { itemType: ItemType.STONE, quantity: 1, slot: 1 },
      { itemType: ItemType.STONE, quantity: 1, slot: 2 },
      { itemType: ItemType.INGOT_COPPER, quantity: 1, slot: 3 },
      { itemType: ItemType.INGOT_COBALT, quantity: 1, slot: 4 },
      { itemType: ItemType.INGOT_GOLD, quantity: 1, slot: 5 },
      { itemType: ItemType.INGOT_COPPER, quantity: 1, slot: 6 },
      { itemType: ItemType.STONE, quantity: 1, slot: 7 },
      { itemType: ItemType.STONE, quantity: 1, slot: 8 },
    ],
    output: { itemType: ItemType.CPU_CHIP, quantity: 1 },
  },
  // RAM Module: SSS / CCC / --- (only top two rows)
  {
    name: 'RAM Module',
    inputs: [
      { itemType: ItemType.STONE, quantity: 1, slot: 0 },
      { itemType: ItemType.STONE, quantity: 1, slot: 1 },
      { itemType: ItemType.STONE, quantity: 1, slot: 2 },
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
      { itemType: ItemType.STONE, quantity: 1, slot: 0 },
      { itemType: ItemType.STONE, quantity: 1, slot: 1 },
      { itemType: ItemType.STONE, quantity: 1, slot: 2 },
      { itemType: ItemType.STONE, quantity: 1, slot: 3 },
      { itemType: ItemType.INGOT_GOLD, quantity: 1, slot: 4 },
      { itemType: ItemType.STONE, quantity: 1, slot: 5 },
      { itemType: ItemType.STONE, quantity: 1, slot: 6 },
      { itemType: ItemType.STONE, quantity: 1, slot: 7 },
      { itemType: ItemType.STONE, quantity: 1, slot: 8 },
    ],
    output: { itemType: ItemType.MOTHERBOARD, quantity: 1 },
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

      <div class="electronics-recipe-list">
        <div class="recipe-label">Recipes:</div>
        <div class="recipe-items">
          ${ELECTRONICS_RECIPES.map(r => `<span class="recipe-item">${r.name}</span>`).join('')}
        </div>
      </div>

      <div class="electronics-hint">
        <p>Requires power from Steam Engine or Hydro Generator</p>
        <p>Connect via cables to power</p>
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

    this.setupSlotInteractions();
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
        gap: 4px;
      }

      .electronics-slot {
        width: 48px;
        height: 48px;
        background: rgba(60, 50, 40, 0.9);
        border: 2px solid #5C4033;
        border-radius: 4px;
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
        max-width: 40px;
        max-height: 40px;
        image-rendering: pixelated;
      }

      .electronics-slot .slot-count {
        position: absolute;
        bottom: 2px;
        right: 4px;
        font-size: 12px;
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

    // Update crafting slots
    this.craftingSlotElements.forEach((el, index) => {
      const slot = this.craftingSlots[index];
      const img = el.querySelector('img') as HTMLImageElement;
      const countEl = el.querySelector('.slot-count') as HTMLElement;

      if (slot.itemType !== ItemType.NONE && slot.quantity > 0) {
        const itemData = ITEM_DATA[slot.itemType];
        img.src = getAssetPath(itemData.texture);
        img.style.display = 'block';
        countEl.textContent = slot.quantity > 1 ? slot.quantity.toString() : '';
      } else {
        img.style.display = 'none';
        countEl.textContent = '';
      }

      // Dim slots if not powered
      el.style.opacity = this.isPowered ? '1' : '0.5';
    });

    // Update output slot
    if (this.outputSlotElement) {
      const matchedRecipe = this.isPowered ? this.findMatchingRecipe() : null;
      const img = this.outputSlotElement.querySelector('img') as HTMLImageElement;
      const countEl = this.outputSlotElement.querySelector('.slot-count') as HTMLElement;

      if (matchedRecipe) {
        const itemData = ITEM_DATA[matchedRecipe.output.itemType];
        img.src = getAssetPath(itemData.texture);
        img.style.display = 'block';
        countEl.textContent = matchedRecipe.output.quantity > 1 ? matchedRecipe.output.quantity.toString() : '';
      } else {
        img.style.display = 'none';
        countEl.textContent = '';
      }

      this.outputSlotElement.style.opacity = this.isPowered ? '1' : '0.5';
    }
  }
}
