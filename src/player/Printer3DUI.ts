import { PlacedPrinter3D } from '../planet/Printer3D';
import { MenuManager } from './MenuManager';
import { Inventory, ItemType, ITEM_DATA } from './Inventory';
import { getAssetPath } from '../utils/assetPath';
import { PlayerConfig } from '../config/PlayerConfig';

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
  // Rocket Engine: 10x Aluminum + 3x Cobalt + 1x Gold
  // Layout: A2 A2 A2 / Co A2 Co / A2 Go Co (quantities allow more than 9 slots worth)
  {
    name: 'Rocket Engine',
    inputs: [
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 2, slot: 0 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 2, slot: 1 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 2, slot: 2 },
      { itemType: ItemType.INGOT_COBALT, quantity: 1, slot: 3 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 2, slot: 4 },
      { itemType: ItemType.INGOT_COBALT, quantity: 1, slot: 5 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 2, slot: 6 },
      { itemType: ItemType.INGOT_GOLD, quantity: 1, slot: 7 },
      { itemType: ItemType.INGOT_COBALT, quantity: 1, slot: 8 },
    ],
    output: ItemType.ROCKET_ENGINE,
    outputQuantity: 1,
    printTime: 60,
  },
  // Medium Fuel Tank: 10x Aluminum + 1x Cobalt
  // Layout: A1 A1 A1 / A1 Co A1 / A1 A1 A2
  {
    name: 'Medium Fuel Tank',
    inputs: [
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 0 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 1 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 2 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 3 },
      { itemType: ItemType.INGOT_COBALT, quantity: 1, slot: 4 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 5 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 6 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 7 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 2, slot: 8 },
    ],
    output: ItemType.MEDIUM_FUEL_TANK,
    outputQuantity: 1,
    printTime: 45,
  },
  // Command Module: 5x Aluminum + 2x Gold + 2x Cobalt + 2x Copper + 4x RAM + 1x CPU + 1x Motherboard + 1x Power Supply
  // Layout: Al+Go Co+Cu Al+Go / RAM CPU RAM / Al+Co MB+PS Al+Cu
  {
    name: 'Command Module',
    inputs: [
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 0 },
      { itemType: ItemType.INGOT_GOLD, quantity: 1, slot: 0 },
      { itemType: ItemType.INGOT_COBALT, quantity: 1, slot: 1 },
      { itemType: ItemType.INGOT_COPPER, quantity: 1, slot: 1 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 2 },
      { itemType: ItemType.INGOT_GOLD, quantity: 1, slot: 2 },
      { itemType: ItemType.RAM_MODULE, quantity: 2, slot: 3 },
      { itemType: ItemType.CPU_CHIP, quantity: 1, slot: 4 },
      { itemType: ItemType.RAM_MODULE, quantity: 2, slot: 5 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 1, slot: 6 },
      { itemType: ItemType.INGOT_COBALT, quantity: 1, slot: 6 },
      { itemType: ItemType.MOTHERBOARD, quantity: 1, slot: 7 },
      { itemType: ItemType.POWER_SUPPLY, quantity: 1, slot: 7 },
      { itemType: ItemType.INGOT_ALUMINUM, quantity: 2, slot: 8 },
      { itemType: ItemType.INGOT_COPPER, quantity: 1, slot: 8 },
    ],
    output: ItemType.COMMAND_MODULE,
    outputQuantity: 1,
    printTime: 50,
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
  private tooltipElement: HTMLElement | null = null;

  constructor(inventory: Inventory) {
    this.inventory = inventory;
    this.createUI();
    this.addStyles();
    this.setupKeyboardHandler();
    this.createTooltip();

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

      /* Tooltip styles for recipe items */
      .printer3d-tooltip {
        position: fixed;
        background: rgba(10, 10, 15, 0.95);
        border: 2px solid #444;
        border-radius: 6px;
        padding: 8px 12px;
        color: #ddd;
        font-family: 'Courier New', monospace;
        font-size: 12px;
        z-index: 10000;
        pointer-events: none;
        max-width: 250px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
      }

      .printer3d-tooltip .tooltip-title {
        color: #00AAFF;
        font-weight: bold;
        margin-bottom: 4px;
        font-size: 13px;
      }

      .printer3d-tooltip .tooltip-desc {
        color: #aaa;
        font-size: 11px;
        line-height: 1.4;
      }

      .printer3d-tooltip .tooltip-ingredients {
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px solid #333;
      }

      .printer3d-tooltip .tooltip-ingredients-title {
        color: #888;
        font-size: 10px;
        margin-bottom: 4px;
      }

      .printer3d-tooltip .tooltip-ingredient {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 2px 0;
      }

      .printer3d-tooltip .tooltip-ingredient img {
        width: 16px;
        height: 16px;
        image-rendering: pixelated;
      }

      .printer3d-tooltip .tooltip-ingredient span {
        color: #bbb;
        font-size: 11px;
      }

      .printer3d-tooltip .tooltip-time {
        margin-top: 6px;
        color: #666;
        font-size: 10px;
      }

      .printer3d-recipes .recipe-item:hover .recipe-output img,
      .printer3d-recipes .recipe-item:hover .recipe-input img {
        transform: scale(1.1);
        transition: transform 0.1s;
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

  private createTooltip(): void {
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.className = 'printer3d-tooltip';
    this.tooltipElement.style.display = 'none';
    document.body.appendChild(this.tooltipElement);
  }

  private showTooltip(recipe: PrinterRecipe, event: MouseEvent): void {
    if (!this.tooltipElement) return;

    // Build tooltip content
    const outputData = ITEM_DATA[recipe.output];
    const requiredItems = this.getRequiredItems(recipe);

    let ingredientsHtml = '';
    for (const [itemType, quantity] of requiredItems) {
      const itemData = ITEM_DATA[itemType];
      ingredientsHtml += `
        <div class="tooltip-ingredient">
          <img src="${getAssetPath(itemData?.texture || '')}" alt="${itemData?.name || 'Unknown'}">
          <span>${quantity}x ${itemData?.name || 'Unknown'}</span>
        </div>
      `;
    }

    this.tooltipElement.innerHTML = `
      <div class="tooltip-title">${recipe.name}</div>
      <div class="tooltip-desc">Creates ${recipe.outputQuantity}x ${outputData?.name || 'Unknown'}</div>
      <div class="tooltip-ingredients">
        <div class="tooltip-ingredients-title">Required Materials:</div>
        ${ingredientsHtml}
      </div>
      <div class="tooltip-time">Print Time: ${recipe.printTime}s</div>
    `;

    // Position tooltip near cursor
    const x = event.clientX + 15;
    const y = event.clientY + 10;

    // Keep tooltip on screen (using estimated tooltip size)
    const maxX = window.innerWidth - 260;
    const maxY = window.innerHeight - 200;

    this.tooltipElement.style.left = `${Math.min(x, maxX)}px`;
    this.tooltipElement.style.top = `${Math.min(y, maxY)}px`;
    this.tooltipElement.style.display = 'block';
  }

  private hideTooltip(): void {
    if (this.tooltipElement) {
      this.tooltipElement.style.display = 'none';
    }
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

    // Hide tooltip when closing UI
    this.hideTooltip();

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

    // Hide tooltip when rebuilding recipe list (prevents stuck tooltips)
    this.hideTooltip();

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

      // Add hover tooltip events
      recipeEl.addEventListener('mouseenter', (e) => {
        this.showTooltip(recipe, e as MouseEvent);
      });

      recipeEl.addEventListener('mousemove', (e) => {
        this.showTooltip(recipe, e as MouseEvent);
      });

      recipeEl.addEventListener('mouseleave', () => {
        this.hideTooltip();
      });

      if (canCraft) {
        recipeEl.style.cursor = 'pointer';
        // Use mousedown instead of click because the game's input system consumes mouseup
        recipeEl.addEventListener('mousedown', (e) => {
          console.log('[Printer3DUI] Recipe mousedown:', recipe.name);
          e.preventDefault();
          e.stopPropagation();
          this.hideTooltip(); // Hide tooltip when clicking
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
      slotEl.dataset.outputSlot = i.toString();

      if (slot.itemType !== null && slot.quantity > 0) {
        const itemData = ITEM_DATA[slot.itemType];
        const img = document.createElement('img');
        img.src = getAssetPath(itemData?.texture || '');
        img.alt = itemData?.name || 'Unknown';
        img.draggable = false; // Prevent image from being dragged separately
        slotEl.appendChild(img);

        const quantitySpan = document.createElement('span');
        quantitySpan.className = 'slot-quantity';
        quantitySpan.textContent = slot.quantity.toString();
        slotEl.appendChild(quantitySpan);

        // Enable drag for output slots with items
        slotEl.draggable = true;

        // Drag start - set data for inventory drop handler
        slotEl.addEventListener('dragstart', (e) => {
          this.handleOutputDragStart(e, i);
        });

        slotEl.addEventListener('dragend', () => {
          slotEl.classList.remove('dragging');
        });

        // Click to collect (fallback)
        slotEl.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          this.collectFromSlot(i);
        });
      }

      this.outputSlotsElement.appendChild(slotEl);
    }
  }

  private handleOutputDragStart(e: DragEvent, slotIndex: number): void {
    if (!this.currentPrinter) {
      e.preventDefault();
      return;
    }

    const slot = this.currentPrinter.outputInventory[slotIndex];
    if (slot.itemType === null || slot.quantity <= 0) {
      e.preventDefault();
      return;
    }

    // Set drag data with printer3d identifier
    e.dataTransfer?.setData('text/plain', `printer3d:output:${slotIndex}`);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }

    const target = e.currentTarget as HTMLElement;
    target.classList.add('dragging');

    // Create drag ghost
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    const itemData = ITEM_DATA[slot.itemType];
    ghost.innerHTML = `<img src="${getAssetPath(itemData?.texture || '')}" style="width:40px;height:40px;image-rendering:pixelated;">`;
    if (slot.quantity > 1) {
      ghost.innerHTML += `<span class="ghost-count">${slot.quantity}</span>`;
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

  /**
   * Get output slot data for drag-drop handling
   */
  public getOutputSlot(slotIndex: number): { itemType: ItemType | null; quantity: number } | null {
    if (!this.currentPrinter || slotIndex < 0 || slotIndex >= 6) {
      return null;
    }
    return this.currentPrinter.outputInventory[slotIndex];
  }

  /**
   * Clear an output slot after successful drag-drop to inventory
   */
  public clearOutputSlot(slotIndex: number): void {
    if (!this.currentPrinter || slotIndex < 0 || slotIndex >= 6) {
      return;
    }
    const slot = this.currentPrinter.outputInventory[slotIndex];
    slot.itemType = null;
    slot.quantity = 0;
    this.updateUI();
    this.notifyChanges();
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
    // Debug mode: bypass ingredient requirements
    if (PlayerConfig.DEBUG_BYPASS_CRAFTING_INGREDIENTS) {
      return true;
    }

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

    // Check if we have all items (unless bypass mode is enabled)
    if (!PlayerConfig.DEBUG_BYPASS_CRAFTING_INGREDIENTS) {
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
    } else {
      console.log('[Printer3DUI] Bypass mode enabled, skipping ingredient check/removal');
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
