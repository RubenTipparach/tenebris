import { Inventory, ItemType, ITEM_DATA } from './Inventory';
import { PlacedElectricFurnace, ELECTRIC_SMELTING_RECIPES } from '../planet/ElectricFurnace';
import { isElectricAdditive } from '../config/SmeltingRecipes';
import { recipeLockedLabel, recipeOpen } from './RecipeGate';
import { showToast } from '../utils/toast';
import { getAssetPath } from '../utils/assetPath';
import { MenuManager } from './MenuManager';

export class ElectricFurnaceUI {
  private inventory: Inventory;
  private currentFurnace: PlacedElectricFurnace | null = null;
  private furnaceSectionElement: HTMLElement | null = null;
  private isOpen: boolean = false;
  private onCloseCallback: (() => void) | null = null;
  private onSaveCallback: (() => void) | null = null;
  private updateInterval: number | null = null;
  private onOpenInventoryCallback: (() => void) | null = null;
  private onUpdateHotbarCallback: (() => void) | null = null;
  private onUpdateInventoryCallback: (() => void) | null = null;

  // UI Elements
  private inputSlotElement: HTMLElement | null = null;
  private additiveSlotElement: HTMLElement | null = null;
  private outputSlotElement: HTMLElement | null = null;
  private progressBarElement: HTMLElement | null = null;
  private powerStatusElement: HTMLElement | null = null;

  // Slot type identifiers
  private readonly SLOT_INPUT = 'electric-furnace-input';
  private readonly SLOT_ADDITIVE = 'electric-furnace-additive';
  private readonly SLOT_OUTPUT = 'electric-furnace-output';

  constructor(inventory: Inventory) {
    this.inventory = inventory;
    this.createUI();
    this.setupKeyboardHandler();

    MenuManager.registerMenu('electric-furnace', {
      isOpen: () => this.isOpen,
      close: () => this.close(),
    });
  }

  private createUI(): void {
    this.furnaceSectionElement = document.createElement('div');
    this.furnaceSectionElement.id = 'electric-furnace-section';
    this.furnaceSectionElement.className = 'electric-furnace-section';
    this.furnaceSectionElement.innerHTML = `
      <h3>Electric Furnace</h3>

      <div class="electric-furnace-power-status" id="electric-furnace-power-status">
        <span class="power-icon">⚡</span>
        <span class="power-text">No Power</span>
      </div>

      <div class="electric-furnace-grid">
        <div class="electric-furnace-input-section">
          <div class="slot-label">Input</div>
          <div class="electric-furnace-slot" id="electric-furnace-input-slot">
            <img style="display:none;">
            <span class="slot-count"></span>
          </div>
          <div class="slot-label">Additive</div>
          <div class="electric-furnace-slot" id="electric-furnace-additive-slot">
            <img style="display:none;">
            <span class="slot-count"></span>
          </div>
        </div>

        <div class="electric-furnace-progress-section">
          <div class="electric-furnace-arrow">
            <div class="progress-bar-container">
              <div class="progress-bar" id="electric-furnace-progress-bar"></div>
            </div>
            <span class="arrow-icon">→</span>
          </div>
        </div>

        <div class="electric-furnace-output-section">
          <div class="slot-label">Output</div>
          <div class="electric-furnace-slot" id="electric-furnace-output-slot">
            <img style="display:none;">
            <span class="slot-count"></span>
          </div>
        </div>
      </div>

      <div class="electric-furnace-hint">
        <p>No fuel needed - uses power from Steam Engine</p>
        <p>Connect via cables to power</p>
        <p>Can smelt Lithium and Cobalt ore</p>
        <p>Steel: 2 iron ingots in, coal as the additive</p>
      </div>
    `;

    const inventoryContainer = document.querySelector('.inventory-container');
    if (inventoryContainer) {
      const inventorySection = inventoryContainer.querySelector('.inventory-section');
      if (inventorySection) {
        inventoryContainer.insertBefore(this.furnaceSectionElement, inventorySection);
      } else {
        inventoryContainer.appendChild(this.furnaceSectionElement);
      }
    }

    this.inputSlotElement = document.getElementById('electric-furnace-input-slot');
    this.additiveSlotElement = document.getElementById('electric-furnace-additive-slot');
    this.outputSlotElement = document.getElementById('electric-furnace-output-slot');
    this.progressBarElement = document.getElementById('electric-furnace-progress-bar');
    this.powerStatusElement = document.getElementById('electric-furnace-power-status');

    this.setupSlotInteractions();
    this.addStyles();

    this.furnaceSectionElement.style.display = 'none';
  }

  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .electric-furnace-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0 15px;
        border-left: 1px solid #444;
        margin-left: 15px;
      }

      .electric-furnace-section h3 {
        font-size: 14px;
        color: #00BFFF;
        margin-bottom: 10px;
      }

      .electric-furnace-power-status {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 4px;
        margin-bottom: 15px;
        background: rgba(255, 0, 0, 0.2);
        border: 1px solid #ff4444;
      }

      .electric-furnace-power-status.powered {
        background: rgba(0, 255, 0, 0.2);
        border: 1px solid #44ff44;
      }

      .power-icon {
        font-size: 18px;
      }

      .electric-furnace-power-status.powered .power-icon {
        color: #44ff44;
      }

      .power-text {
        font-size: 12px;
        color: #888;
      }

      .electric-furnace-power-status.powered .power-text {
        color: #44ff44;
      }

      .electric-furnace-grid {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 10px;
        margin-bottom: 15px;
      }

      .electric-furnace-input-section,
      .electric-furnace-output-section {
        text-align: center;
      }

      .electric-furnace-section .slot-label {
        font-size: 11px;
        color: #888;
        margin-bottom: 4px;
      }

      .electric-furnace-slot {
        width: 50px;
        height: 50px;
        background: rgba(0, 191, 255, 0.2);
        border: 2px solid #00BFFF;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        cursor: pointer;
        transition: border-color 0.2s;
      }

      .electric-furnace-slot:hover {
        border-color: #00FFFF;
      }

      .electric-furnace-slot.drag-over {
        border-color: #4CAF50;
        background: rgba(76, 175, 80, 0.3);
      }

      .electric-furnace-slot.dragging {
        opacity: 0.5;
      }

      .electric-furnace-slot img {
        width: 40px;
        height: 40px;
        image-rendering: pixelated;
        pointer-events: none;
      }

      .electric-furnace-slot .slot-count {
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

      .electric-furnace-progress-section {
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .electric-furnace-arrow {
        position: relative;
        width: 40px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .electric-furnace-section .arrow-icon {
        font-size: 24px;
        color: #666;
      }

      .electric-furnace-section .progress-bar-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 4px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 2px;
      }

      .electric-furnace-section .progress-bar {
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #00BFFF, #00FFFF);
        border-radius: 2px;
        transition: width 0.1s;
      }

      .electric-furnace-hint {
        font-size: 10px;
        color: #666;
        text-align: center;
      }

      .electric-furnace-hint p {
        margin: 2px 0;
      }
    `;
    document.head.appendChild(style);
  }

  private setupSlotInteractions(): void {
    const slots: [HTMLElement | null, string][] = [
      [this.inputSlotElement, this.SLOT_INPUT],
      [this.additiveSlotElement, this.SLOT_ADDITIVE],
      [this.outputSlotElement, this.SLOT_OUTPUT],
    ];
    for (const [element, slotType] of slots) {
      if (!element) continue;
      element.dataset.furnaceSlot = slotType;
      this.setupFurnaceSlot(element, slotType);
    }
  }

  // One furnace slot's contents: input (the ore / ingots), additive (an
  // alloy's second input) or output. Every slot handler reads and writes
  // through these two, so the three slots share one path.
  private getStock(slotType: string): { item: ItemType | null; count: number } {
    const f = this.currentFurnace!;
    if (slotType === this.SLOT_INPUT) return { item: f.smeltingItem as ItemType | null, count: f.inputCount };
    if (slotType === this.SLOT_ADDITIVE) return { item: f.additiveItem as ItemType | null, count: f.additiveCount };
    return { item: f.outputItem as ItemType | null, count: f.outputCount };
  }

  private setStock(slotType: string, item: ItemType | null, count: number): void {
    const f = this.currentFurnace!;
    const kept = count > 0 ? item : null;
    if (slotType === this.SLOT_INPUT) {
      if (kept !== f.smeltingItem) f.smeltingProgress = 0;
      f.smeltingItem = kept;
      f.inputCount = Math.max(0, count);
    } else if (slotType === this.SLOT_ADDITIVE) {
      f.additiveItem = kept;
      f.additiveCount = Math.max(0, count);
    } else {
      f.outputItem = kept;
      f.outputCount = Math.max(0, count);
    }
  }

  // Whether an item may be loaded into a slot (the output only empties)
  private accepts(slotType: string, itemType: ItemType): boolean {
    if (slotType === this.SLOT_ADDITIVE) return isElectricAdditive(itemType);
    if (slotType !== this.SLOT_INPUT) return false;
    // Only smeltable items whose product won't clash with the output slot
    const outputItem = this.currentFurnace!.outputItem;
    const fits = ELECTRIC_SMELTING_RECIPES.filter(r => r.input === itemType && (outputItem === null || outputItem === r.output));
    if (fits.length === 0) return false;
    // Smelts a mission has not unlocked yet: refused, naming the mission
    if (fits.some(r => recipeOpen(r.output))) return true;
    showToast(`${ITEM_DATA[fits[0].output]?.name ?? 'That'} is locked - ${recipeLockedLabel(fits[0].output)}`, { duration: 3000 });
    return false;
  }

  // Load a stack into an input slot; true when it went in
  private load(slotType: string, itemType: ItemType, quantity: number): boolean {
    if (!this.currentFurnace || quantity <= 0 || !this.accepts(slotType, itemType)) return false;
    const stock = this.getStock(slotType);
    if (stock.item !== null && stock.item !== itemType) return false;
    this.setStock(slotType, itemType, stock.count + quantity);
    this.inventory.removeItem(itemType, quantity);
    this.updateUI();
    this.notifyChanges();
    return true;
  }

  // Hand up to `quantity` of a slot back to the inventory
  private takeBack(slotType: string, quantity: number): void {
    if (!this.currentFurnace) return;
    const stock = this.getStock(slotType);
    if (stock.item === null || stock.count <= 0) return;
    const wanted = Math.min(quantity, stock.count);
    const taken = wanted - this.inventory.addItem(stock.item, wanted);
    if (taken <= 0) return;
    this.setStock(slotType, stock.item, stock.count - taken);
    this.updateUI();
    this.notifyChanges();
  }

  private setupFurnaceSlot(element: HTMLElement, slotType: string): void {
    element.draggable = true;

    element.addEventListener('click', (e) => {
      if (e.shiftKey) {
        this.handleShiftClick(slotType);
      } else {
        this.handleSlotClick(slotType);
      }
    });

    element.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.handleRightClick(slotType);
    });

    element.addEventListener('dragstart', (e) => {
      this.handleFurnaceDragStart(e, slotType);
    });

    element.addEventListener('dragend', () => {
      element.classList.remove('dragging');
    });

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

    const { item: itemType, count: quantity } = this.getStock(slotType);
    if (itemType === null || quantity <= 0) {
      e.preventDefault();
      return;
    }

    e.dataTransfer?.setData('text/plain', `electric-furnace:${slotType}`);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }

    const target = e.currentTarget as HTMLElement;
    target.classList.add('dragging');

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

    setTimeout(() => ghost.remove(), 0);
  }

  private handleDropOnFurnace(e: DragEvent, targetSlotType: string): void {
    if (!this.currentFurnace) return;

    const sourceData = e.dataTransfer?.getData('text/plain');
    if (!sourceData) return;

    const sourceSlotIndex = parseInt(sourceData);
    if (!isNaN(sourceSlotIndex) && sourceSlotIndex >= 0) {
      this.handleDropFromInventory(sourceSlotIndex, targetSlotType);
    }
  }

  private handleDropFromInventory(sourceSlotIndex: number, targetSlotType: string): void {
    const slotData = this.inventory.getSlot(sourceSlotIndex);
    if (!slotData || slotData.itemType === ItemType.NONE) return;
    // Always transfer entire stack on drag-and-drop
    this.load(targetSlotType, slotData.itemType, slotData.quantity);
  }

  // Click: an input slot takes the selected stack, the output empties
  private handleSlotClick(slotType: string): void {
    if (!this.currentFurnace) return;
    if (slotType === this.SLOT_OUTPUT) {
      this.takeBack(slotType, this.currentFurnace.outputCount);
    } else {
      const selected = this.inventory.getSelectedItem();
      this.load(slotType, selected.itemType, selected.quantity);
    }
  }

  // Right click: half the output, or one item back from an input slot
  private handleRightClick(slotType: string): void {
    if (!this.currentFurnace) return;
    const { count } = this.getStock(slotType);
    this.takeBack(slotType, slotType === this.SLOT_OUTPUT ? Math.ceil(count / 2) : 1);
  }

  // Shift click: empty the slot, or (an empty input slot) load the selection
  private handleShiftClick(slotType: string): void {
    if (!this.currentFurnace) return;
    const { item, count } = this.getStock(slotType);
    if (item !== null && count > 0) {
      this.takeBack(slotType, count);
    } else if (slotType !== this.SLOT_OUTPUT) {
      const selected = this.inventory.getSelectedItem();
      this.load(slotType, selected.itemType, selected.quantity);
    }
  }

  private notifyChanges(): void {
    if (this.onSaveCallback) this.onSaveCallback();
    if (this.onUpdateHotbarCallback) this.onUpdateHotbarCallback();
    if (this.onUpdateInventoryCallback) this.onUpdateInventoryCallback();
  }

  public handleDropToInventory(targetSlotIndex: number, sourceSlotType: string): boolean {
    if (!this.currentFurnace) return false;

    const { item: itemType, count } = this.getStock(sourceSlotType);
    if (itemType === null || count <= 0) return false;

    const targetSlot = this.inventory.getSlot(targetSlotIndex);
    if (!targetSlot || (targetSlot.itemType !== ItemType.NONE && targetSlot.itemType !== itemType)) return false;

    const maxStack = ITEM_DATA[itemType]?.stackSize ?? 64;
    const currentCount = targetSlot.itemType === itemType ? targetSlot.quantity : 0;
    const toTransfer = Math.min(count, maxStack - currentCount);
    if (toTransfer <= 0) return false;

    this.inventory.setSlot(targetSlotIndex, itemType, currentCount + toTransfer);
    this.setStock(sourceSlotType, itemType, count - toTransfer);
    this.updateUI();
    this.notifyChanges();
    return true;
  }

  private setupKeyboardHandler(): void {
    // Keyboard handling done through inventory menu
  }

  public open(furnace: PlacedElectricFurnace): void {
    this.currentFurnace = furnace;
    if (this.furnaceSectionElement) {
      this.furnaceSectionElement.style.display = 'flex';
      this.isOpen = true;
      this.updateUI();

      if (this.onOpenInventoryCallback) {
        this.onOpenInventoryCallback();
      }

      this.updateInterval = window.setInterval(() => this.update(), 100);
    }
  }

  public close(): void {
    if (this.furnaceSectionElement) {
      this.furnaceSectionElement.style.display = 'none';
      this.isOpen = false;
      this.currentFurnace = null;

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

  public setOnUpdateInventoryCallback(callback: () => void): void {
    this.onUpdateInventoryCallback = callback;
  }

  public getCurrentFurnace(): PlacedElectricFurnace | null {
    return this.currentFurnace;
  }

  private update(): void {
    if (!this.currentFurnace || !this.isOpen) return;
    this.updateUI();
  }

  private updateUI(): void {
    if (!this.currentFurnace) return;

    const furnace = this.currentFurnace;

    // Update power status
    if (this.powerStatusElement) {
      if (furnace.isPowered) {
        this.powerStatusElement.classList.add('powered');
        const powerText = this.powerStatusElement.querySelector('.power-text');
        if (powerText) powerText.textContent = 'Powered';
      } else {
        this.powerStatusElement.classList.remove('powered');
        const powerText = this.powerStatusElement.querySelector('.power-text');
        if (powerText) powerText.textContent = 'No Power';
      }
    }

    // Slots
    this.renderSlot(this.inputSlotElement, this.SLOT_INPUT);
    this.renderSlot(this.additiveSlotElement, this.SLOT_ADDITIVE);
    this.renderSlot(this.outputSlotElement, this.SLOT_OUTPUT);

    // Update progress bar
    if (this.progressBarElement) {
      this.progressBarElement.style.width = `${furnace.smeltingProgress * 100}%`;
    }
  }

  private renderSlot(element: HTMLElement | null, slotType: string): void {
    if (!element) return;
    const img = element.querySelector('img') as HTMLImageElement;
    const count = element.querySelector('.slot-count') as HTMLElement;
    const stock = this.getStock(slotType);
    const itemData = stock.item !== null && stock.count > 0 ? ITEM_DATA[stock.item] : undefined;
    if (itemData) {
      img.src = getAssetPath(itemData.texture);
      img.style.display = 'block';
      count.textContent = stock.count > 1 ? stock.count.toString() : '';
    } else {
      img.style.display = 'none';
      count.textContent = '';
    }
  }
}
