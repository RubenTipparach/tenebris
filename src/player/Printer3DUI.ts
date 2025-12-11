import { PlacedPrinter3D } from '../planet/Printer3D';
import { MenuManager } from './MenuManager';
import { Inventory, ItemType, ITEM_DATA } from './Inventory';
import { getAssetPath } from '../utils/assetPath';

// 3D Printer recipe definition (supports both single and multi-input)
export interface PrinterRecipe {
  // Legacy single input (for backwards compatibility)
  input?: { itemType: ItemType; quantity: number };
  // Multi-input grid (3x3 like Electronics Workbench)
  inputs?: { itemType: ItemType; quantity: number; slot: number }[];
  output: ItemType;
  outputQuantity: number;
  printTime: number; // in seconds
  name: string;
}

// Grid layout (3x3):
//   0 1 2
//   3 4 5
//   6 7 8
// Legend: St = Stone, I = Iron Ingot

// Available recipes for the 3D printer
export const PRINTER_RECIPES: PrinterRecipe[] = [
  // Launch Pad Block (Hexagonal base): St St St / I I I / St St St
  {
    name: 'Launch Pad Block',
    inputs: [
      { itemType: ItemType.STONE, quantity: 1, slot: 0 },
      { itemType: ItemType.STONE, quantity: 1, slot: 1 },
      { itemType: ItemType.STONE, quantity: 1, slot: 2 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 3 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 4 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 5 },
      { itemType: ItemType.STONE, quantity: 1, slot: 6 },
      { itemType: ItemType.STONE, quantity: 1, slot: 7 },
      { itemType: ItemType.STONE, quantity: 1, slot: 8 },
    ],
    output: ItemType.LAUNCH_PAD_BLOCK,
    outputQuantity: 7,
    printTime: 30,
  },
  // Launch Pad Segment (Square tower): I I I / I I I / I I I
  {
    name: 'Launch Pad Segment',
    inputs: [
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 0 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 1 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 2 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 3 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 4 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 5 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 6 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 7 },
      { itemType: ItemType.INGOT_IRON, quantity: 1, slot: 8 },
    ],
    output: ItemType.LAUNCH_PAD_SEGMENT,
    outputQuantity: 1,
    printTime: 45,
  },
];

export class Printer3DUI {
  private currentPrinter: PlacedPrinter3D | null = null;
  private printerSectionElement: HTMLElement | null = null;
  private isOpen: boolean = false;
  private onCloseCallback: (() => void) | null = null;
  private onOpenInventoryCallback: (() => void) | null = null;
  private onUpdateHotbarCallback: (() => void) | null = null;
  private onUpdateInventoryCallback: (() => void) | null = null;
  private inventory: Inventory | null = null;
  private onItemCrafted: ((itemType: ItemType, quantity: number) => void) | null = null;
  private onRefundItems: ((ingredients: Map<ItemType, number>) => void) | null = null;
  private onSaveCallback: (() => void) | null = null;

  // UI elements
  private recipeListElement: HTMLElement | null = null;
  private queueListElement: HTMLElement | null = null;
  private outputSlotsElement: HTMLElement | null = null;
  private progressBarElement: HTMLElement | null = null;
  private progressTextElement: HTMLElement | null = null;
  private statusElement: HTMLElement | null = null;
  private cancelCurrentBtn: HTMLButtonElement | null = null;

  constructor(inventory: Inventory) {
    this.inventory = inventory;
    this.createUI();
    this.addStyles();
    this.setupKeyboardHandler();

    // Register with menu manager
    MenuManager.registerMenu('printer3d', {
      isOpen: () => this.isOpen,
      close: () => this.close(),
    });
  }

  public setInventory(inventory: Inventory): void {
    this.inventory = inventory;
  }

  public setOnItemCrafted(callback: (itemType: ItemType, quantity: number) => void): void {
    this.onItemCrafted = callback;
  }

  public setOnRefundItems(callback: (ingredients: Map<ItemType, number>) => void): void {
    this.onRefundItems = callback;
  }

  public setOnSaveCallback(callback: () => void): void {
    this.onSaveCallback = callback;
  }

  private createUI(): void {
    this.printerSectionElement = document.createElement('div');
    this.printerSectionElement.id = 'printer3d-section';
    this.printerSectionElement.className = 'printer3d-section';
    this.printerSectionElement.innerHTML = `
      <h3>3D Printer</h3>

      <div class="printer3d-status">
        <div class="status-label">Status:</div>
        <div class="status-value" id="printer3d-status-value">Idle</div>
      </div>

      <div class="printer3d-progress-container">
        <div class="progress-bar">
          <div class="progress-fill" id="printer3d-progress-fill"></div>
        </div>
        <div class="progress-text" id="printer3d-progress-text">0%</div>
        <button class="cancel-current-btn" id="printer3d-cancel-current" style="display: none;">Cancel</button>
      </div>

      <div class="printer3d-recipes">
        <div class="recipes-header">Available Prints:</div>
        <div class="recipes-list" id="printer3d-recipes-list"></div>
      </div>

      <div class="printer3d-queue">
        <div class="queue-header">Print Queue:</div>
        <div class="queue-list" id="printer3d-queue-list"></div>
      </div>

      <div class="printer3d-output">
        <div class="output-header">Output:</div>
        <div class="output-slots" id="printer3d-output-slots"></div>
      </div>

      <div class="printer3d-hint">
        <p>Press E or ESC to close</p>
      </div>
    `;

    // Get references from the element directly (before adding to DOM)
    this.recipeListElement = this.printerSectionElement.querySelector('#printer3d-recipes-list');
    this.queueListElement = this.printerSectionElement.querySelector('#printer3d-queue-list');
    this.outputSlotsElement = this.printerSectionElement.querySelector('#printer3d-output-slots');
    this.progressBarElement = this.printerSectionElement.querySelector('#printer3d-progress-fill');
    this.progressTextElement = this.printerSectionElement.querySelector('#printer3d-progress-text');
    this.statusElement = this.printerSectionElement.querySelector('#printer3d-status-value');
    this.cancelCurrentBtn = this.printerSectionElement.querySelector('#printer3d-cancel-current');

    // Set up cancel current job button
    if (this.cancelCurrentBtn) {
      this.cancelCurrentBtn.addEventListener('click', () => {
        this.cancelCurrentJob();
      });
    }

    this.printerSectionElement.style.display = 'none';

    // Insert into inventory container
    const inventoryContainer = document.querySelector('.inventory-container');
    if (inventoryContainer) {
      const inventorySection = inventoryContainer.querySelector('.inventory-section');
      if (inventorySection) {
        inventoryContainer.insertBefore(this.printerSectionElement, inventorySection);
      } else {
        inventoryContainer.appendChild(this.printerSectionElement);
      }
    }
  }

  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .printer3d-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0 15px;
        border-left: 1px solid #444;
        margin-left: 15px;
        min-width: 280px;
        pointer-events: auto;
        position: relative;
        z-index: 50;
      }

      .printer3d-section h3 {
        font-size: 14px;
        color: #00AAFF;
        margin-bottom: 10px;
        font-family: 'Courier New', monospace;
        text-shadow: 0 0 5px rgba(0, 170, 255, 0.3);
      }

      .printer3d-status {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
        padding: 8px;
        background: #0a0a0a;
        border-radius: 6px;
        width: 100%;
        box-sizing: border-box;
      }

      .printer3d-status .status-label {
        color: #888;
        font-family: 'Courier New', monospace;
        font-size: 12px;
      }

      .printer3d-status .status-value {
        color: #00AAFF;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        font-weight: bold;
      }

      .printer3d-status .status-value.printing {
        color: #FFAA00;
      }

      .printer3d-progress-container {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 15px;
        width: 100%;
        box-sizing: border-box;
      }

      .printer3d-progress-container .progress-bar {
        flex: 1;
        height: 16px;
        background: #0a0a0a;
        border: 2px solid #333;
        border-radius: 4px;
        overflow: hidden;
      }

      .printer3d-progress-container .progress-fill {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #00AAFF, #00DDFF);
        transition: width 0.1s ease;
      }

      .printer3d-progress-container .progress-text {
        color: #00AAFF;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        min-width: 35px;
        text-align: right;
      }

      .printer3d-progress-container .cancel-current-btn {
        background: #442222;
        border: 1px solid #663333;
        border-radius: 4px;
        color: #FF6666;
        padding: 4px 10px;
        font-size: 11px;
        cursor: pointer;
        font-family: 'Courier New', monospace;
        margin-left: 8px;
      }

      .printer3d-progress-container .cancel-current-btn:hover {
        background: #553333;
        border-color: #884444;
      }

      .printer3d-recipes {
        background: #0a0a0a;
        border: 2px solid #333;
        border-radius: 8px;
        padding: 10px;
        max-height: 120px;
        overflow-y: auto;
        width: 100%;
        box-sizing: border-box;
        margin-bottom: 10px;
      }

      .printer3d-recipes .recipes-header {
        color: #888;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        margin-bottom: 8px;
        padding-bottom: 5px;
        border-bottom: 1px solid #333;
      }

      .printer3d-recipes .recipe-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 6px;
        background: #1a1a1a;
        border-radius: 4px;
        margin-bottom: 4px;
        cursor: pointer;
        transition: background 0.2s;
        pointer-events: auto;
        position: relative;
        z-index: 100;
      }

      .printer3d-recipes .recipe-item:hover {
        background: #2a2a2a;
      }

      .printer3d-recipes .recipe-item.disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .printer3d-recipes .recipe-item.disabled:hover {
        background: #1a1a1a;
      }

      .printer3d-recipes .recipe-output {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .printer3d-recipes .recipe-output img {
        width: 20px;
        height: 20px;
        image-rendering: pixelated;
      }

      .printer3d-recipes .recipe-output-name {
        color: #DDD;
        font-family: 'Courier New', monospace;
        font-size: 11px;
      }

      .printer3d-recipes .recipe-output-qty {
        color: #888;
        font-size: 10px;
      }

      .printer3d-recipes .recipe-inputs {
        display: flex;
        gap: 4px;
      }

      .printer3d-recipes .recipe-input {
        display: flex;
        align-items: center;
        gap: 2px;
        padding: 2px 4px;
        background: #252525;
        border-radius: 3px;
      }

      .printer3d-recipes .recipe-input img {
        width: 14px;
        height: 14px;
        image-rendering: pixelated;
      }

      .printer3d-recipes .recipe-input-qty {
        color: #AAA;
        font-family: 'Courier New', monospace;
        font-size: 9px;
      }

      .printer3d-recipes .recipe-input.has-item .recipe-input-qty {
        color: #44FF44;
      }

      .printer3d-recipes .recipe-input.missing-item .recipe-input-qty {
        color: #FF4444;
      }

      .printer3d-recipes .recipe-time {
        color: #666;
        font-family: 'Courier New', monospace;
        font-size: 9px;
      }

      .printer3d-queue {
        background: #0a0a0a;
        border: 2px solid #333;
        border-radius: 8px;
        padding: 10px;
        max-height: 100px;
        overflow-y: auto;
        width: 100%;
        box-sizing: border-box;
        margin-bottom: 10px;
      }

      .printer3d-queue .queue-header {
        color: #888;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        margin-bottom: 8px;
        padding-bottom: 5px;
        border-bottom: 1px solid #333;
      }

      .printer3d-queue .queue-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 4px 6px;
        background: #1a1a1a;
        border-radius: 4px;
        margin-bottom: 3px;
      }

      .printer3d-queue .queue-item-info {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .printer3d-queue .queue-item img {
        width: 18px;
        height: 18px;
        image-rendering: pixelated;
      }

      .printer3d-queue .queue-item-name {
        color: #DDD;
        font-family: 'Courier New', monospace;
        font-size: 10px;
      }

      .printer3d-queue .queue-cancel-btn {
        background: #442222;
        border: 1px solid #663333;
        border-radius: 3px;
        color: #FF6666;
        padding: 2px 6px;
        font-size: 9px;
        cursor: pointer;
        font-family: 'Courier New', monospace;
      }

      .printer3d-queue .queue-cancel-btn:hover {
        background: #553333;
      }

      .printer3d-queue .queue-empty {
        color: #555;
        font-family: 'Courier New', monospace;
        font-size: 10px;
        text-align: center;
        padding: 8px;
      }

      .printer3d-output {
        background: #0a0a0a;
        border: 2px solid #333;
        border-radius: 8px;
        padding: 10px;
        width: 100%;
        box-sizing: border-box;
        margin-bottom: 10px;
      }

      .printer3d-output .output-header {
        color: #888;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        margin-bottom: 8px;
        padding-bottom: 5px;
        border-bottom: 1px solid #333;
      }

      .printer3d-output .output-slots {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 4px;
      }

      .printer3d-output .output-slot {
        width: 36px;
        height: 36px;
        background: #1a1a1a;
        border: 2px solid #333;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        cursor: pointer;
      }

      .printer3d-output .output-slot:hover {
        border-color: #555;
      }

      .printer3d-output .output-slot.has-item {
        border-color: #444;
      }

      .printer3d-output .output-slot img {
        width: 28px;
        height: 28px;
        image-rendering: pixelated;
      }

      .printer3d-output .output-slot .slot-quantity {
        position: absolute;
        bottom: 1px;
        right: 3px;
        color: #FFF;
        font-family: 'Courier New', monospace;
        font-size: 10px;
        text-shadow: 1px 1px 1px #000;
      }

      .printer3d-hint {
        text-align: center;
      }

      .printer3d-hint p {
        font-size: 11px;
        color: #666;
        margin: 4px 0;
      }
    `;
    document.head.appendChild(style);
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

  public open(printer: PlacedPrinter3D): void {
    console.log('[Printer3DUI] open() called, printer:', printer?.tileIndex);
    this.currentPrinter = printer;
    this.isOpen = true;

    if (this.printerSectionElement) {
      this.printerSectionElement.style.display = 'flex';
      console.log('[Printer3DUI] printerSectionElement displayed');
    } else {
      console.log('[Printer3DUI] ERROR: printerSectionElement is null!');
    }

    // Open the full inventory menu
    if (this.onOpenInventoryCallback) {
      this.onOpenInventoryCallback();
    }

    this.updateUI();
    console.log('[Printer3DUI] open() complete, queue length:', printer?.printQueue?.length);
  }

  public close(): void {
    this.isOpen = false;
    this.currentPrinter = null;

    if (this.printerSectionElement) {
      this.printerSectionElement.style.display = 'none';
    }

    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }

  public isMenuOpen(): boolean {
    return this.isOpen;
  }

  public getCurrentPrinter(): PlacedPrinter3D | null {
    return this.currentPrinter;
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

  public updateProgress(): void {
    this.updateUI();
  }

  private notifyChanges(): void {
    if (this.onUpdateHotbarCallback) {
      this.onUpdateHotbarCallback();
    }
    if (this.onUpdateInventoryCallback) {
      this.onUpdateInventoryCallback();
    }
    if (this.onSaveCallback) {
      this.onSaveCallback();
    }
  }

  private updateUI(): void {
    if (!this.printerSectionElement) return;

    // Update status and progress
    const job = this.currentPrinter?.currentJob;
    if (this.statusElement) {
      if (job) {
        const itemName = ITEM_DATA[job.itemType]?.name || 'Unknown';
        this.statusElement.textContent = `Printing: ${itemName}`;
        this.statusElement.className = 'status-value printing';
      } else if (this.currentPrinter?.printQueue.length) {
        this.statusElement.textContent = 'Queue Ready';
        this.statusElement.className = 'status-value';
      } else {
        this.statusElement.textContent = 'Idle';
        this.statusElement.className = 'status-value';
      }
    }

    // Update progress bar
    const progress = job ? Math.min(job.progress * 100, 100) : 0;
    if (this.progressBarElement) {
      this.progressBarElement.style.width = `${progress}%`;
    }

    if (this.progressTextElement) {
      this.progressTextElement.textContent = `${Math.round(progress)}%`;
    }

    // Show/hide cancel current job button
    if (this.cancelCurrentBtn) {
      this.cancelCurrentBtn.style.display = job ? 'block' : 'none';
    }

    // Update recipe list
    this.updateRecipeList();

    // Update queue list
    this.updateQueueList();

    // Update output slots
    this.updateOutputSlots();
  }

  private updateRecipeList(): void {
    if (!this.recipeListElement || !this.inventory) return;

    this.recipeListElement.innerHTML = '';

    for (const recipe of PRINTER_RECIPES) {
      const canCraft = this.canCraftRecipe(recipe);

      const recipeEl = document.createElement('div');
      recipeEl.className = `recipe-item${!canCraft ? ' disabled' : ''}`;

      // Output section
      const outputData = ITEM_DATA[recipe.output];
      const outputHtml = `
        <div class="recipe-output">
          <img src="${getAssetPath(outputData?.texture || '')}" alt="${outputData?.name || 'Unknown'}">
          <span class="recipe-output-name">${recipe.name}</span>
          <span class="recipe-output-qty">x${recipe.outputQuantity}</span>
        </div>
      `;

      // Input section - handle both single and multi-input recipes
      let inputHtml = '<div class="recipe-inputs">';

      if (recipe.inputs) {
        // Multi-input recipe - group by item type and show totals
        const requiredItems = this.getRequiredItems(recipe);
        for (const [itemType, quantity] of requiredItems) {
          const inputData = ITEM_DATA[itemType];
          const hasItem = this.inventory.hasItem(itemType, quantity);
          inputHtml += `
            <div class="recipe-input ${hasItem ? 'has-item' : 'missing-item'}">
              <img src="${getAssetPath(inputData?.texture || '')}" alt="${inputData?.name || 'Unknown'}">
              <span class="recipe-input-qty">${quantity}</span>
            </div>
          `;
        }
      } else if (recipe.input) {
        // Single input recipe (legacy)
        const inputData = ITEM_DATA[recipe.input.itemType];
        const hasItem = this.inventory.hasItem(recipe.input.itemType, recipe.input.quantity);
        inputHtml += `
          <div class="recipe-input ${hasItem ? 'has-item' : 'missing-item'}">
            <img src="${getAssetPath(inputData?.texture || '')}" alt="${inputData?.name || 'Unknown'}">
            <span class="recipe-input-qty">${recipe.input.quantity}</span>
          </div>
        `;
      }

      inputHtml += `<span class="recipe-time">${recipe.printTime}s</span></div>`;

      recipeEl.innerHTML = outputHtml + inputHtml;

      if (canCraft) {
        recipeEl.style.cursor = 'pointer';
        // Use mousedown instead of click because the game's input system consumes mouseup
        recipeEl.addEventListener('mousedown', (e) => {
          console.log('[Printer3DUI] Recipe mousedown:', recipe.name);
          e.preventDefault();
          e.stopPropagation();
          this.queueRecipe(recipe);
        });
      }

      this.recipeListElement.appendChild(recipeEl);
    }
  }

  private updateQueueList(): void {
    if (!this.queueListElement || !this.currentPrinter) return;

    this.queueListElement.innerHTML = '';

    if (this.currentPrinter.printQueue.length === 0) {
      this.queueListElement.innerHTML = '<div class="queue-empty">Queue is empty</div>';
      return;
    }

    this.currentPrinter.printQueue.forEach((queuedJob, index) => {
      const itemData = ITEM_DATA[queuedJob.itemType];
      const queueEl = document.createElement('div');
      queueEl.className = 'queue-item';
      queueEl.innerHTML = `
        <div class="queue-item-info">
          <img src="${getAssetPath(itemData?.texture || '')}" alt="${itemData?.name || 'Unknown'}">
          <span class="queue-item-name">${itemData?.name || 'Unknown'} x${queuedJob.outputQuantity}</span>
        </div>
        <button class="queue-cancel-btn">Cancel</button>
      `;

      const cancelBtn = queueEl.querySelector('.queue-cancel-btn');
      cancelBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        this.cancelQueuedItem(index);
      });

      this.queueListElement!.appendChild(queueEl);
    });
  }

  private updateOutputSlots(): void {
    if (!this.outputSlotsElement || !this.currentPrinter) return;

    this.outputSlotsElement.innerHTML = '';

    for (let i = 0; i < 6; i++) {
      const slot = this.currentPrinter.outputInventory[i];
      const slotEl = document.createElement('div');
      slotEl.className = `output-slot${slot.itemType !== null ? ' has-item' : ''}`;

      if (slot.itemType !== null && slot.quantity > 0) {
        const itemData = ITEM_DATA[slot.itemType];
        slotEl.innerHTML = `
          <img src="${getAssetPath(itemData?.texture || '')}" alt="${itemData?.name || 'Unknown'}">
          <span class="slot-quantity">${slot.quantity}</span>
        `;

        // Use mousedown instead of click because the game's input system consumes mouseup
        slotEl.addEventListener('mousedown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.collectFromSlot(i);
        });
      }

      this.outputSlotsElement.appendChild(slotEl);
    }
  }

  // Helper to get required items grouped by type
  private getRequiredItems(recipe: PrinterRecipe): Map<ItemType, number> {
    const requiredItems = new Map<ItemType, number>();

    if (recipe.inputs) {
      for (const input of recipe.inputs) {
        const current = requiredItems.get(input.itemType) || 0;
        requiredItems.set(input.itemType, current + input.quantity);
      }
    } else if (recipe.input) {
      requiredItems.set(recipe.input.itemType, recipe.input.quantity);
    }

    return requiredItems;
  }

  private canCraftRecipe(recipe: PrinterRecipe): boolean {
    if (!this.inventory) return false;

    const requiredItems = this.getRequiredItems(recipe);

    for (const [itemType, quantity] of requiredItems) {
      if (!this.inventory.hasItem(itemType, quantity)) {
        return false;
      }
    }

    return true;
  }

  private queueRecipe(recipe: PrinterRecipe): void {
    console.log('[Printer3DUI] queueRecipe called for:', recipe.name);

    if (!this.currentPrinter) {
      console.log('[Printer3DUI] No current printer');
      return;
    }
    if (!this.inventory) {
      console.log('[Printer3DUI] No inventory');
      return;
    }

    // Get required items
    const requiredItems = this.getRequiredItems(recipe);
    console.log('[Printer3DUI] Required items:', Array.from(requiredItems.entries()));

    // Check if we have all items
    for (const [itemType, quantity] of requiredItems) {
      const hasItem = this.inventory.hasItem(itemType, quantity);
      console.log(`[Printer3DUI] Checking ${ItemType[itemType]}: need ${quantity}, has: ${hasItem}`);
      if (!hasItem) {
        console.log('[Printer3DUI] Missing item, aborting');
        return;
      }
    }

    // Remove items from inventory
    console.log('[Printer3DUI] Removing items from inventory...');
    for (const [itemType, quantity] of requiredItems) {
      this.inventory.removeItem(itemType, quantity);
      console.log(`[Printer3DUI] Removed ${quantity}x ${ItemType[itemType]}`);
    }

    // Add to queue
    this.currentPrinter.printQueue.push({
      itemType: recipe.output,
      totalTime: recipe.printTime,
      outputQuantity: recipe.outputQuantity,
      ingredients: new Map(requiredItems),
    });
    console.log('[Printer3DUI] Added to queue, queue length:', this.currentPrinter.printQueue.length);

    this.updateUI();
    this.notifyChanges();
  }

  private cancelQueuedItem(queueIndex: number): void {
    if (!this.currentPrinter) return;

    const queuedJob = this.currentPrinter.printQueue[queueIndex];
    if (!queuedJob) return;

    // Remove from queue
    this.currentPrinter.printQueue.splice(queueIndex, 1);

    // Refund items
    if (this.onRefundItems) {
      this.onRefundItems(queuedJob.ingredients);
    }

    this.updateUI();
    this.notifyChanges();
  }

  private cancelCurrentJob(): void {
    if (!this.currentPrinter || !this.currentPrinter.currentJob) return;

    const job = this.currentPrinter.currentJob;

    // Cancel the current job
    this.currentPrinter.currentJob = null;

    // Refund ingredients
    if (this.onRefundItems && job.ingredients) {
      this.onRefundItems(job.ingredients);
    }

    this.updateUI();
    this.notifyChanges();
  }

  private collectFromSlot(slotIndex: number): void {
    if (!this.currentPrinter) return;

    const slot = this.currentPrinter.outputInventory[slotIndex];
    if (slot.itemType === null || slot.quantity <= 0) return;

    // Give item to player
    if (this.onItemCrafted) {
      this.onItemCrafted(slot.itemType, slot.quantity);
    }

    // Clear slot
    slot.itemType = null;
    slot.quantity = 0;

    this.updateUI();
    this.notifyChanges();
  }

}
