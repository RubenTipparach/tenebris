import { PlacedPrinter3D, PrintJob } from '../planet/Printer3D';
import { MenuManager } from './MenuManager';
import { Inventory, ItemType, ITEM_DATA } from './Inventory';
import { getAssetPath } from '../utils/assetPath';

// 3D Printer recipe definition (single input resource)
export interface PrinterRecipe {
  input: { itemType: ItemType; quantity: number };
  output: ItemType;
  outputQuantity: number;
  printTime: number; // in seconds
}

// Available recipes for the 3D printer (single resource input)
export const PRINTER_RECIPES: PrinterRecipe[] = [
  // Copper pipe from copper ingot
  {
    input: { itemType: ItemType.INGOT_COPPER, quantity: 2 },
    output: ItemType.COPPER_PIPE,
    outputQuantity: 2,
    printTime: 10,
  },
  // Add more single-input recipes as needed
];

export class Printer3DUI {
  private currentPrinter: PlacedPrinter3D | null = null;
  private printerSectionElement: HTMLElement | null = null;
  private isOpen: boolean = false;
  private onCloseCallback: (() => void) | null = null;
  private onOpenInventoryCallback: (() => void) | null = null;
  private onUpdateHotbarCallback: (() => void) | null = null;
  private onUpdateInventoryCallback: (() => void) | null = null;
  private isPowered: boolean = false;
  private isConnectedToComputer: boolean = false;
  private inventory: Inventory | null = null;
  private onItemCrafted: ((itemType: ItemType, quantity: number) => void) | null = null;

  // Power check callback (for steam engine power)
  private isPoweredCallback: ((tileIndex: number) => boolean) | null = null;
  // Computer connection check callback
  private isConnectedToComputerCallback: ((tileIndex: number) => boolean) | null = null;

  // UI elements
  private recipeListElement: HTMLElement | null = null;
  private progressBarElement: HTMLElement | null = null;
  private progressTextElement: HTMLElement | null = null;
  private statusElement: HTMLElement | null = null;
  private powerStatusElement: HTMLElement | null = null;
  private computerStatusElement: HTMLElement | null = null;
  private collectBtn: HTMLButtonElement | null = null;

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

  public setIsPoweredCallback(callback: (tileIndex: number) => boolean): void {
    this.isPoweredCallback = callback;
  }

  public setIsConnectedToComputerCallback(callback: (tileIndex: number) => boolean): void {
    this.isConnectedToComputerCallback = callback;
  }

  public setOnItemCrafted(callback: (itemType: ItemType, quantity: number) => void): void {
    this.onItemCrafted = callback;
  }

  private createUI(): void {
    this.printerSectionElement = document.createElement('div');
    this.printerSectionElement.id = 'printer3d-section';
    this.printerSectionElement.className = 'printer3d-section';
    this.printerSectionElement.innerHTML = `
      <h3>3D Printer</h3>

      <div class="printer3d-connection-status" id="printer3d-computer-status">
        <span class="connection-icon">💻</span>
        <span class="connection-text">No Computer</span>
      </div>

      <div class="printer3d-power-status" id="printer3d-power-status">
        <span class="power-icon">⚡</span>
        <span class="power-text">No Power</span>
      </div>

      <div class="printer3d-status">
        <div class="status-label">Status:</div>
        <div class="status-value" id="printer3d-status-value">Idle</div>
      </div>

      <div class="printer3d-progress-container">
        <div class="progress-bar">
          <div class="progress-fill" id="printer3d-progress-fill"></div>
        </div>
        <div class="progress-text" id="printer3d-progress-text">0%</div>
      </div>

      <div class="printer3d-recipes">
        <div class="recipes-header">Available Prints:</div>
        <div class="recipes-list" id="printer3d-recipes-list"></div>
      </div>

      <div class="printer3d-controls">
        <button class="printer3d-btn" id="printer3d-collect-btn" disabled>Collect</button>
      </div>

      <div class="printer3d-hint">
        <p>Press E or ESC to close</p>
      </div>
    `;

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

    // Get references
    this.recipeListElement = document.getElementById('printer3d-recipes-list');
    this.progressBarElement = document.getElementById('printer3d-progress-fill');
    this.progressTextElement = document.getElementById('printer3d-progress-text');
    this.statusElement = document.getElementById('printer3d-status-value');
    this.powerStatusElement = document.getElementById('printer3d-power-status');
    this.computerStatusElement = document.getElementById('printer3d-computer-status');
    this.collectBtn = document.getElementById('printer3d-collect-btn') as HTMLButtonElement;

    // Setup collect button
    if (this.collectBtn) {
      this.collectBtn.addEventListener('click', () => this.collectItem());
    }

    this.printerSectionElement.style.display = 'none';
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
      }

      .printer3d-section h3 {
        font-size: 14px;
        color: #00AAFF;
        margin-bottom: 10px;
        font-family: 'Courier New', monospace;
        text-shadow: 0 0 5px rgba(0, 170, 255, 0.3);
      }

      .printer3d-connection-status {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 4px;
        margin-bottom: 8px;
        background: rgba(255, 0, 0, 0.2);
        border: 1px solid #ff4444;
      }

      .printer3d-connection-status.connected {
        background: rgba(0, 170, 255, 0.2);
        border: 1px solid #00aaff;
      }

      .printer3d-connection-status .connection-icon {
        font-size: 18px;
      }

      .printer3d-connection-status.connected .connection-icon {
        color: #00aaff;
      }

      .printer3d-connection-status .connection-text {
        font-size: 12px;
        color: #888;
      }

      .printer3d-connection-status.connected .connection-text {
        color: #00aaff;
      }

      .printer3d-power-status {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 4px;
        margin-bottom: 15px;
        background: rgba(255, 0, 0, 0.2);
        border: 1px solid #ff4444;
      }

      .printer3d-power-status.powered {
        background: rgba(0, 255, 0, 0.2);
        border: 1px solid #44ff44;
      }

      .printer3d-power-status .power-icon {
        font-size: 18px;
      }

      .printer3d-power-status.powered .power-icon {
        color: #44ff44;
      }

      .printer3d-power-status .power-text {
        font-size: 12px;
        color: #888;
      }

      .printer3d-power-status.powered .power-text {
        color: #44ff44;
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

      .printer3d-status .status-value.complete {
        color: #00FF00;
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

      .printer3d-progress-container .progress-fill.complete {
        background: linear-gradient(90deg, #00FF00, #44FF44);
      }

      .printer3d-progress-container .progress-text {
        color: #00AAFF;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        min-width: 35px;
        text-align: right;
      }

      .printer3d-recipes {
        background: #0a0a0a;
        border: 2px solid #333;
        border-radius: 8px;
        padding: 10px;
        max-height: 150px;
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

      .printer3d-controls {
        display: flex;
        justify-content: center;
        gap: 10px;
        margin-bottom: 10px;
      }

      .printer3d-btn {
        background: linear-gradient(180deg, #444 0%, #333 100%);
        border: 2px solid #555;
        border-radius: 6px;
        color: #DDD;
        padding: 8px 20px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
        font-family: 'Courier New', monospace;
      }

      .printer3d-btn:hover:not(:disabled) {
        background: linear-gradient(180deg, #555 0%, #444 100%);
        border-color: #666;
      }

      .printer3d-btn:active:not(:disabled) {
        transform: translateY(1px);
      }

      .printer3d-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .printer3d-btn.collect-ready {
        background: linear-gradient(180deg, #2a5a2a 0%, #1a4a1a 100%);
        border-color: #3a6a3a;
        color: #44FF44;
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
    this.currentPrinter = printer;
    this.isOpen = true;

    // Check computer connection status
    if (this.isConnectedToComputerCallback) {
      this.isConnectedToComputer = this.isConnectedToComputerCallback(printer.tileIndex);
    }

    // Check power status (computer needs to be powered for printer to work)
    if (this.isPoweredCallback && this.isConnectedToComputer) {
      this.isPowered = this.isPoweredCallback(printer.tileIndex);
    } else {
      this.isPowered = false;
    }

    if (this.printerSectionElement) {
      this.printerSectionElement.style.display = 'flex';
    }

    // Open the full inventory menu
    if (this.onOpenInventoryCallback) {
      this.onOpenInventoryCallback();
    }

    this.updateUI();
  }

  public close(): void {
    this.isOpen = false;
    this.currentPrinter = null;
    this.isPowered = false;
    this.isConnectedToComputer = false;

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

  public setPowered(isPowered: boolean): void {
    this.isPowered = isPowered;
    this.updateUI();
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
  }

  private updateUI(): void {
    if (!this.printerSectionElement) return;

    // Update computer connection status
    if (this.computerStatusElement) {
      if (this.isConnectedToComputer) {
        this.computerStatusElement.classList.add('connected');
        this.computerStatusElement.querySelector('.connection-text')!.textContent = 'Computer Connected';
      } else {
        this.computerStatusElement.classList.remove('connected');
        this.computerStatusElement.querySelector('.connection-text')!.textContent = 'No Computer';
      }
    }

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

    // Update status and progress
    const job = this.currentPrinter?.currentJob;
    if (this.statusElement) {
      if (!this.isConnectedToComputer) {
        this.statusElement.textContent = 'No Computer';
        this.statusElement.className = 'status-value';
      } else if (!this.isPowered) {
        this.statusElement.textContent = 'No Power';
        this.statusElement.className = 'status-value';
      } else if (job) {
        if (job.progress >= 1) {
          this.statusElement.textContent = 'Complete!';
          this.statusElement.className = 'status-value complete';
        } else {
          const itemName = ITEM_DATA[job.itemType]?.name || 'Unknown';
          this.statusElement.textContent = `Printing: ${itemName}`;
          this.statusElement.className = 'status-value printing';
        }
      } else {
        this.statusElement.textContent = 'Idle';
        this.statusElement.className = 'status-value';
      }
    }

    // Update progress bar
    const progress = job ? Math.min(job.progress * 100, 100) : 0;
    if (this.progressBarElement) {
      this.progressBarElement.style.width = `${progress}%`;
      if (progress >= 100) {
        this.progressBarElement.classList.add('complete');
      } else {
        this.progressBarElement.classList.remove('complete');
      }
    }

    if (this.progressTextElement) {
      this.progressTextElement.textContent = `${Math.round(progress)}%`;
    }

    // Update collect button
    if (this.collectBtn) {
      if (job && job.progress >= 1) {
        this.collectBtn.disabled = false;
        this.collectBtn.classList.add('collect-ready');
      } else {
        this.collectBtn.disabled = true;
        this.collectBtn.classList.remove('collect-ready');
      }
    }

    // Update recipe list
    this.updateRecipeList();
  }

  private updateRecipeList(): void {
    if (!this.recipeListElement || !this.inventory) return;

    this.recipeListElement.innerHTML = '';
    const canOperate = this.isConnectedToComputer && this.isPowered;

    for (const recipe of PRINTER_RECIPES) {
      const canCraft = this.canCraftRecipe(recipe);
      const isPrinting = this.currentPrinter?.currentJob !== null;

      const recipeEl = document.createElement('div');
      recipeEl.className = `recipe-item${(!canCraft || isPrinting || !canOperate) ? ' disabled' : ''}`;

      // Output section
      const outputData = ITEM_DATA[recipe.output];
      const outputHtml = `
        <div class="recipe-output">
          <img src="${getAssetPath(outputData?.texture || '')}" alt="${outputData?.name || 'Unknown'}">
          <span class="recipe-output-name">${outputData?.name || 'Unknown'}</span>
          <span class="recipe-output-qty">x${recipe.outputQuantity}</span>
        </div>
      `;

      // Input section (single input)
      const inputData = ITEM_DATA[recipe.input.itemType];
      const hasItem = this.inventory.hasItem(recipe.input.itemType, recipe.input.quantity);
      const inputHtml = `
        <div class="recipe-inputs">
          <div class="recipe-input ${hasItem ? 'has-item' : 'missing-item'}">
            <img src="${getAssetPath(inputData?.texture || '')}" alt="${inputData?.name || 'Unknown'}">
            <span class="recipe-input-qty">${recipe.input.quantity}</span>
          </div>
          <span class="recipe-time">${recipe.printTime}s</span>
        </div>
      `;

      recipeEl.innerHTML = outputHtml + inputHtml;

      if (canCraft && !isPrinting && canOperate) {
        recipeEl.addEventListener('click', () => this.startPrint(recipe));
      }

      this.recipeListElement.appendChild(recipeEl);
    }
  }

  private canCraftRecipe(recipe: PrinterRecipe): boolean {
    if (!this.inventory) return false;
    return this.inventory.hasItem(recipe.input.itemType, recipe.input.quantity);
  }

  private startPrint(recipe: PrinterRecipe): void {
    if (!this.currentPrinter || !this.inventory) return;
    if (!this.isConnectedToComputer || !this.isPowered) return;
    if (this.currentPrinter.currentJob !== null) return;

    // Use ingredient (single input)
    this.inventory.removeItem(recipe.input.itemType, recipe.input.quantity);

    // Start print job
    this.currentPrinter.currentJob = {
      itemType: recipe.output,
      progress: 0,
      totalTime: recipe.printTime,
      startTime: Date.now()
    };

    // Store output quantity in a property for collection
    (this.currentPrinter.currentJob as PrintJob & { outputQuantity?: number }).outputQuantity = recipe.outputQuantity;

    this.updateUI();
    this.notifyChanges();
  }

  private collectItem(): void {
    if (!this.currentPrinter || !this.currentPrinter.currentJob) return;
    if (this.currentPrinter.currentJob.progress < 1) return;

    const job = this.currentPrinter.currentJob as PrintJob & { outputQuantity?: number };
    const outputQuantity = job.outputQuantity || 1;

    // Give item to player
    if (this.onItemCrafted) {
      this.onItemCrafted(job.itemType, outputQuantity);
    }

    // Clear job
    this.currentPrinter.currentJob = null;

    this.updateUI();
    this.notifyChanges();
  }
}
