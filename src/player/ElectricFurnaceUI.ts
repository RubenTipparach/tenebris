import { Inventory, ItemType, ITEM_DATA } from './Inventory';
import { PlacedElectricFurnace, ELECTRIC_SMELTING_RECIPES } from '../planet/ElectricFurnace';
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
  private outputSlotElement: HTMLElement | null = null;
  private progressBarElement: HTMLElement | null = null;
  private powerStatusElement: HTMLElement | null = null;

  // Slot type identifiers
  private readonly SLOT_INPUT = 'electric-furnace-input';
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
    if (this.inputSlotElement) {
      this.inputSlotElement.dataset.furnaceSlot = this.SLOT_INPUT;
      this.setupFurnaceSlot(this.inputSlotElement, this.SLOT_INPUT);
    }

    if (this.outputSlotElement) {
      this.outputSlotElement.dataset.furnaceSlot = this.SLOT_OUTPUT;
      this.setupFurnaceSlot(this.outputSlotElement, this.SLOT_OUTPUT);
    }
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
    }

    if (!hasItem || itemType === null) {
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
      this.handleDropFromInventory(sourceSlotIndex, targetSlotType, e.shiftKey);
      return;
    }

    if (sourceData.startsWith('electric-furnace:')) {
      return;
    }
  }

  private handleDropFromInventory(sourceSlotIndex: number, targetSlotType: string, transferAll: boolean = false): void {
    if (!this.currentFurnace) return;

    const slotData = this.inventory.getSlot(sourceSlotIndex);
    if (!slotData || slotData.itemType === ItemType.NONE) return;

    const quantity = transferAll ? slotData.quantity : 1;

    if (targetSlotType === this.SLOT_INPUT) {
      // Only accept smeltable ores (electric furnace recipes)
      const recipe = ELECTRIC_SMELTING_RECIPES.find(r => r.input === slotData.itemType);
      if (recipe) {
        if (this.currentFurnace.smeltingItem === null || this.currentFurnace.smeltingItem === slotData.itemType) {
          const toTransfer = Math.min(quantity, slotData.quantity);
          if (this.currentFurnace.smeltingItem === null) {
            this.currentFurnace.smeltingItem = slotData.itemType;
            this.currentFurnace.smeltingProgress = 0;
          }
          this.currentFurnace.inputCount += toTransfer;
          this.inventory.removeItem(slotData.itemType, toTransfer);
          this.updateUI();
          this.notifyChanges();
        }
      }
    }
  }

  private handleSlotClick(slotType: string): void {
    if (!this.currentFurnace) return;

    if (slotType === this.SLOT_INPUT) {
      this.handleInputSlotClick();
    } else if (slotType === this.SLOT_OUTPUT) {
      this.handleOutputSlotClick();
    }
  }

  private handleRightClick(slotType: string): void {
    if (!this.currentFurnace) return;

    if (slotType === this.SLOT_OUTPUT) {
      if (this.currentFurnace.outputItem !== null && this.currentFurnace.outputCount > 0) {
        const itemType = this.currentFurnace.outputItem as ItemType;
        const halfCount = Math.ceil(this.currentFurnace.outputCount / 2);
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
    } else if (slotType === this.SLOT_INPUT) {
      if (this.currentFurnace.smeltingItem !== null) {
        const itemType = this.currentFurnace.smeltingItem as ItemType;
        const remaining = this.inventory.addItem(itemType, 1);
        if (remaining === 0) {
          this.currentFurnace.inputCount--;
          if (this.currentFurnace.inputCount === 0) {
            this.currentFurnace.smeltingItem = null;
            this.currentFurnace.smeltingProgress = 0;
          }
          this.updateUI();
          this.notifyChanges();
        }
      }
    }
  }

  private handleShiftClick(slotType: string): void {
    if (!this.currentFurnace) return;

    if (slotType === this.SLOT_OUTPUT) {
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
        const selectedItem = this.inventory.getSelectedItem();
        const recipe = ELECTRIC_SMELTING_RECIPES.find(r => r.input === selectedItem.itemType);
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
    }
  }

  private notifyChanges(): void {
    if (this.onSaveCallback) this.onSaveCallback();
    if (this.onUpdateHotbarCallback) this.onUpdateHotbarCallback();
    if (this.onUpdateInventoryCallback) this.onUpdateInventoryCallback();
  }

  private handleInputSlotClick(): void {
    if (!this.currentFurnace) return;

    const selectedItem = this.inventory.getSelectedItem();
    const recipe = ELECTRIC_SMELTING_RECIPES.find(r => r.input === selectedItem.itemType);
    if (recipe && selectedItem.quantity > 0) {
      if (this.currentFurnace.smeltingItem === null || this.currentFurnace.smeltingItem === selectedItem.itemType) {
        if (this.currentFurnace.smeltingItem === null) {
          this.currentFurnace.smeltingItem = selectedItem.itemType;
          this.currentFurnace.smeltingProgress = 0;
        }
        this.currentFurnace.inputCount++;
        this.inventory.removeItem(selectedItem.itemType, 1);
        this.updateUI();
        this.notifyChanges();
      }
    }
  }

  private handleOutputSlotClick(): void {
    if (!this.currentFurnace) return;

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
  }

  public handleDropToInventory(targetSlotIndex: number, sourceSlotType: string): boolean {
    if (!this.currentFurnace) return false;

    if (sourceSlotType === this.SLOT_OUTPUT) {
      if (this.currentFurnace.outputItem !== null && this.currentFurnace.outputCount > 0) {
        const itemType = this.currentFurnace.outputItem as ItemType;
        const targetSlot = this.inventory.getSlot(targetSlotIndex);

        if (targetSlot && (targetSlot.itemType === ItemType.NONE || targetSlot.itemType === itemType)) {
          const maxStack = 64;
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
    }

    return false;
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
