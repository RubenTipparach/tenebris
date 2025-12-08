import { Inventory, ItemType, ITEM_DATA } from './Inventory';
import { PlacedStorageChest, CHEST_SLOTS } from '../planet/StorageChest';
import { PlacedGarbagePile, GARBAGE_PILE_SLOTS } from '../planet/GarbagePile';
import { getAssetPath } from '../utils/assetPath';
import { MenuManager } from './MenuManager';

// Union type for storage containers
type StorageContainer = PlacedStorageChest | PlacedGarbagePile;

export class StorageUI {
  private inventory: Inventory;
  private currentStorage: StorageContainer | null = null;
  private storageType: 'chest' | 'garbage' | null = null;
  private storageSectionElement: HTMLElement | null = null;
  private storageGridElement: HTMLElement | null = null;
  private isOpen: boolean = false;
  private onCloseCallback: (() => void) | null = null;
  private onSaveCallback: (() => void) | null = null;
  private onOpenInventoryCallback: (() => void) | null = null;
  private onUpdateHotbarCallback: (() => void) | null = null;
  private onUpdateInventoryCallback: (() => void) | null = null;

  constructor(inventory: Inventory) {
    this.inventory = inventory;
    this.createUI();

    // Register with MenuManager for centralized menu handling
    MenuManager.registerMenu('storage', {
      isOpen: () => this.isOpen,
      close: () => this.close(),
    });
  }

  private createUI(): void {
    this.storageSectionElement = document.createElement('div');
    this.storageSectionElement.id = 'storage-section';
    this.storageSectionElement.className = 'storage-section';
    this.storageSectionElement.innerHTML = `
      <h3 id="storage-title">Storage</h3>
      <div class="storage-grid" id="storage-grid"></div>
      <div class="storage-hint">
        <p>Drag items or Shift+Click to transfer</p>
        <p>Right-click for half stack</p>
      </div>
    `;

    const inventoryContainer = document.querySelector('.inventory-container');
    if (inventoryContainer) {
      const inventorySection = inventoryContainer.querySelector('.inventory-section');
      if (inventorySection) {
        inventoryContainer.insertBefore(this.storageSectionElement, inventorySection);
      } else {
        inventoryContainer.appendChild(this.storageSectionElement);
      }
    }

    this.storageGridElement = document.getElementById('storage-grid');
    this.addStyles();
    this.storageSectionElement.style.display = 'none';
  }

  private addStyles(): void {
    const existingStyle = document.getElementById('storage-ui-styles');
    if (existingStyle) return;

    const style = document.createElement('style');
    style.id = 'storage-ui-styles';
    style.textContent = `
      .storage-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0 15px;
        border-left: 1px solid #444;
        margin-left: 15px;
      }

      .storage-section h3 {
        font-size: 14px;
        color: #8B4513;
        margin-bottom: 10px;
      }

      .storage-section.garbage h3 {
        color: #666;
      }

      .storage-grid {
        display: grid;
        grid-template-columns: repeat(9, 40px);
        grid-template-rows: repeat(3, 40px);
        gap: 4px;
        margin-bottom: 10px;
      }

      .storage-slot {
        width: 40px;
        height: 40px;
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

      .storage-section.garbage .storage-slot {
        background: rgba(100, 100, 100, 0.3);
        border-color: #666;
      }

      .storage-slot:hover {
        border-color: #FF6600;
      }

      .storage-slot.drag-over {
        border-color: #4CAF50;
        background: rgba(76, 175, 80, 0.3);
      }

      .storage-slot.dragging {
        opacity: 0.5;
      }

      .storage-slot img {
        width: 32px;
        height: 32px;
        image-rendering: pixelated;
        pointer-events: none;
      }

      .storage-slot .slot-count {
        position: absolute;
        bottom: 1px;
        right: 3px;
        font-size: 11px;
        color: white;
        text-shadow: 1px 1px 2px black;
        pointer-events: none;
      }

      .storage-hint {
        font-size: 10px;
        color: #666;
        text-align: center;
      }

      .storage-hint p {
        margin: 2px 0;
      }
    `;
    document.head.appendChild(style);
  }

  private createStorageSlots(): void {
    if (!this.storageGridElement) return;
    this.storageGridElement.innerHTML = '';

    const slotCount = this.storageType === 'garbage' ? GARBAGE_PILE_SLOTS : CHEST_SLOTS;

    for (let i = 0; i < slotCount; i++) {
      const slot = document.createElement('div');
      slot.className = 'storage-slot';
      slot.dataset.storageSlot = i.toString();
      slot.draggable = true;

      const img = document.createElement('img');
      img.style.display = 'none';
      img.draggable = false;
      slot.appendChild(img);

      const count = document.createElement('span');
      count.className = 'slot-count';
      slot.appendChild(count);

      this.setupSlotEvents(slot, i);
      this.storageGridElement.appendChild(slot);
    }
  }

  private setupSlotEvents(element: HTMLElement, slotIndex: number): void {
    element.addEventListener('click', (e) => {
      if (e.shiftKey) {
        this.handleShiftClick(slotIndex);
      } else {
        this.handleSlotClick(slotIndex);
      }
    });

    element.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.handleRightClick(slotIndex);
    });

    element.addEventListener('dragstart', (e) => {
      this.handleDragStart(e, slotIndex);
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
      this.handleDrop(e, slotIndex);
    });
  }

  private handleDragStart(e: DragEvent, slotIndex: number): void {
    if (!this.currentStorage) {
      e.preventDefault();
      return;
    }

    const slot = this.currentStorage.slots[slotIndex];
    if (!slot || slot.itemType === ItemType.NONE) {
      e.preventDefault();
      return;
    }

    e.dataTransfer?.setData('text/plain', `storage:${slotIndex}`);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }

    (e.currentTarget as HTMLElement).classList.add('dragging');

    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    const itemData = ITEM_DATA[slot.itemType];
    ghost.innerHTML = `<img src="${getAssetPath(itemData.texture)}" style="width:32px;height:32px;image-rendering:pixelated;">`;
    if (slot.quantity > 1) {
      ghost.innerHTML += `<span class="ghost-count">${slot.quantity}</span>`;
    }
    ghost.style.cssText = 'position:fixed;top:-100px;left:-100px;pointer-events:none;z-index:9999;background:rgba(0,0,0,0.8);border:2px solid #4CAF50;border-radius:4px;padding:4px;';
    document.body.appendChild(ghost);
    e.dataTransfer?.setDragImage(ghost, 20, 20);
    setTimeout(() => ghost.remove(), 0);
  }

  private handleDrop(e: DragEvent, targetSlotIndex: number): void {
    if (!this.currentStorage) return;

    const sourceData = e.dataTransfer?.getData('text/plain');
    if (!sourceData) return;

    // From inventory slot
    const inventorySlotIndex = parseInt(sourceData);
    if (!isNaN(inventorySlotIndex) && inventorySlotIndex >= 0) {
      this.transferFromInventory(inventorySlotIndex, targetSlotIndex);
      return;
    }

    // From another storage slot
    if (sourceData.startsWith('storage:')) {
      const sourceSlotIndex = parseInt(sourceData.replace('storage:', ''));
      this.swapStorageSlots(sourceSlotIndex, targetSlotIndex);
    }
  }

  private transferFromInventory(inventorySlotIndex: number, storageSlotIndex: number): void {
    if (!this.currentStorage) return;

    const invSlot = this.inventory.getSlot(inventorySlotIndex);
    if (!invSlot || invSlot.itemType === ItemType.NONE) return;

    const storageSlot = this.currentStorage.slots[storageSlotIndex];
    const itemData = ITEM_DATA[invSlot.itemType];

    if (storageSlot.itemType === ItemType.NONE) {
      // Empty slot - move entire stack
      storageSlot.itemType = invSlot.itemType;
      storageSlot.quantity = invSlot.quantity;
      this.inventory.setSlot(inventorySlotIndex, ItemType.NONE, 0);
    } else if (storageSlot.itemType === invSlot.itemType) {
      // Same type - stack
      const canAdd = Math.min(invSlot.quantity, itemData.stackSize - storageSlot.quantity);
      storageSlot.quantity += canAdd;
      const remaining = invSlot.quantity - canAdd;
      if (remaining > 0) {
        this.inventory.setSlot(inventorySlotIndex, invSlot.itemType, remaining);
      } else {
        this.inventory.setSlot(inventorySlotIndex, ItemType.NONE, 0);
      }
    } else {
      // Swap
      const tempType = storageSlot.itemType;
      const tempQty = storageSlot.quantity;
      storageSlot.itemType = invSlot.itemType;
      storageSlot.quantity = invSlot.quantity;
      this.inventory.setSlot(inventorySlotIndex, tempType, tempQty);
    }

    this.updateUI();
    this.notifyChanges();
  }

  private swapStorageSlots(fromIndex: number, toIndex: number): void {
    if (!this.currentStorage || fromIndex === toIndex) return;

    const fromSlot = this.currentStorage.slots[fromIndex];
    const toSlot = this.currentStorage.slots[toIndex];

    if (toSlot.itemType === ItemType.NONE) {
      // Move to empty
      toSlot.itemType = fromSlot.itemType;
      toSlot.quantity = fromSlot.quantity;
      fromSlot.itemType = ItemType.NONE;
      fromSlot.quantity = 0;
    } else if (toSlot.itemType === fromSlot.itemType) {
      // Stack same items
      const itemData = ITEM_DATA[fromSlot.itemType];
      const canAdd = Math.min(fromSlot.quantity, itemData.stackSize - toSlot.quantity);
      toSlot.quantity += canAdd;
      fromSlot.quantity -= canAdd;
      if (fromSlot.quantity === 0) {
        fromSlot.itemType = ItemType.NONE;
      }
    } else {
      // Swap different items
      const tempType = toSlot.itemType;
      const tempQty = toSlot.quantity;
      toSlot.itemType = fromSlot.itemType;
      toSlot.quantity = fromSlot.quantity;
      fromSlot.itemType = tempType;
      fromSlot.quantity = tempQty;
    }

    this.updateUI();
    this.notifyChanges();
  }

  private handleSlotClick(slotIndex: number): void {
    if (!this.currentStorage) return;

    const selectedItem = this.inventory.getSelectedItem();
    const storageSlot = this.currentStorage.slots[slotIndex];

    if (selectedItem.itemType !== ItemType.NONE && selectedItem.quantity > 0) {
      // Try to add one item from hotbar
      if (storageSlot.itemType === ItemType.NONE) {
        storageSlot.itemType = selectedItem.itemType;
        storageSlot.quantity = 1;
        this.inventory.removeItem(selectedItem.itemType, 1);
        this.updateUI();
        this.notifyChanges();
      } else if (storageSlot.itemType === selectedItem.itemType) {
        const itemData = ITEM_DATA[selectedItem.itemType];
        if (storageSlot.quantity < itemData.stackSize) {
          storageSlot.quantity++;
          this.inventory.removeItem(selectedItem.itemType, 1);
          this.updateUI();
          this.notifyChanges();
        }
      }
    } else {
      // Take one item
      if (storageSlot.itemType !== ItemType.NONE && storageSlot.quantity > 0) {
        const remaining = this.inventory.addItem(storageSlot.itemType, 1);
        if (remaining === 0) {
          storageSlot.quantity--;
          if (storageSlot.quantity === 0) {
            storageSlot.itemType = ItemType.NONE;
          }
          this.updateUI();
          this.notifyChanges();
        }
      }
    }
  }

  private handleRightClick(slotIndex: number): void {
    if (!this.currentStorage) return;

    const storageSlot = this.currentStorage.slots[slotIndex];
    if (storageSlot.itemType === ItemType.NONE || storageSlot.quantity === 0) return;

    // Take half
    const halfCount = Math.ceil(storageSlot.quantity / 2);
    const remaining = this.inventory.addItem(storageSlot.itemType, halfCount);
    const actuallyTaken = halfCount - remaining;

    if (actuallyTaken > 0) {
      storageSlot.quantity -= actuallyTaken;
      if (storageSlot.quantity === 0) {
        storageSlot.itemType = ItemType.NONE;
      }
      this.updateUI();
      this.notifyChanges();
    }
  }

  private handleShiftClick(slotIndex: number): void {
    if (!this.currentStorage) return;

    const storageSlot = this.currentStorage.slots[slotIndex];
    if (storageSlot.itemType === ItemType.NONE || storageSlot.quantity === 0) return;

    // Move all to inventory
    const remaining = this.inventory.addItem(storageSlot.itemType, storageSlot.quantity);

    if (remaining < storageSlot.quantity) {
      storageSlot.quantity = remaining;
      if (remaining === 0) {
        storageSlot.itemType = ItemType.NONE;
      }
      this.updateUI();
      this.notifyChanges();
    }
  }

  // Handle drops from storage to inventory (called by CraftingSystem)
  public handleDropToInventory(targetSlotIndex: number, sourceData: string): boolean {
    if (!this.currentStorage) return false;
    if (!sourceData.startsWith('storage:')) return false;

    const sourceSlotIndex = parseInt(sourceData.replace('storage:', ''));
    const storageSlot = this.currentStorage.slots[sourceSlotIndex];

    if (!storageSlot || storageSlot.itemType === ItemType.NONE) return false;

    const targetSlot = this.inventory.getSlot(targetSlotIndex);
    if (!targetSlot) return false;

    const itemData = ITEM_DATA[storageSlot.itemType];

    if (targetSlot.itemType === ItemType.NONE) {
      this.inventory.setSlot(targetSlotIndex, storageSlot.itemType, storageSlot.quantity);
      storageSlot.itemType = ItemType.NONE;
      storageSlot.quantity = 0;
    } else if (targetSlot.itemType === storageSlot.itemType) {
      const canAdd = Math.min(storageSlot.quantity, itemData.stackSize - targetSlot.quantity);
      if (canAdd > 0) {
        this.inventory.setSlot(targetSlotIndex, targetSlot.itemType, targetSlot.quantity + canAdd);
        storageSlot.quantity -= canAdd;
        if (storageSlot.quantity === 0) {
          storageSlot.itemType = ItemType.NONE;
        }
      }
    } else {
      // Swap
      const tempType = targetSlot.itemType;
      const tempQty = targetSlot.quantity;
      this.inventory.setSlot(targetSlotIndex, storageSlot.itemType, storageSlot.quantity);
      storageSlot.itemType = tempType;
      storageSlot.quantity = tempQty;
    }

    this.updateUI();
    this.notifyChanges();
    return true;
  }

  private notifyChanges(): void {
    if (this.onSaveCallback) this.onSaveCallback();
    if (this.onUpdateHotbarCallback) this.onUpdateHotbarCallback();
    if (this.onUpdateInventoryCallback) this.onUpdateInventoryCallback();
  }

  // Unified open method that detects storage type
  public open(storage: StorageContainer): void {
    // Detect type by checking for rotation property (chests have it, garbage piles don't)
    if ('rotation' in storage) {
      this.openChest(storage as PlacedStorageChest);
    } else {
      this.openGarbagePile(storage as PlacedGarbagePile);
    }
  }

  public openChest(chest: PlacedStorageChest): void {
    this.currentStorage = chest;
    this.storageType = 'chest';
    this.openStorage('Storage Chest');
  }

  public openGarbagePile(pile: PlacedGarbagePile): void {
    this.currentStorage = pile;
    this.storageType = 'garbage';
    this.openStorage('Garbage Pile');
  }

  private openStorage(title: string): void {
    if (!this.storageSectionElement) return;

    const titleEl = document.getElementById('storage-title');
    if (titleEl) titleEl.textContent = title;

    this.storageSectionElement.classList.toggle('garbage', this.storageType === 'garbage');
    this.createStorageSlots();
    this.storageSectionElement.style.display = 'flex';
    this.isOpen = true;
    this.updateUI();

    if (this.onOpenInventoryCallback) {
      this.onOpenInventoryCallback();
    }
  }

  public close(): void {
    if (this.storageSectionElement) {
      this.storageSectionElement.style.display = 'none';
      this.isOpen = false;
      this.currentStorage = null;
      this.storageType = null;

      if (this.onCloseCallback) {
        this.onCloseCallback();
      }
    }
  }

  public isMenuOpen(): boolean {
    return this.isOpen;
  }

  public getCurrentStorage(): StorageContainer | null {
    return this.currentStorage;
  }

  public getStorageType(): 'chest' | 'garbage' | null {
    return this.storageType;
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

  private updateUI(): void {
    if (!this.currentStorage || !this.storageGridElement) return;

    const slots = this.storageGridElement.querySelectorAll('.storage-slot');
    slots.forEach((slotEl, i) => {
      const slot = this.currentStorage!.slots[i];
      const img = slotEl.querySelector('img') as HTMLImageElement;
      const countEl = slotEl.querySelector('.slot-count') as HTMLElement;

      if (slot && slot.itemType !== ItemType.NONE && slot.quantity > 0) {
        const itemData = ITEM_DATA[slot.itemType];
        if (itemData) {
          img.src = getAssetPath(itemData.texture);
          img.style.display = 'block';
          countEl.textContent = slot.quantity > 1 ? slot.quantity.toString() : '';
        }
      } else {
        img.style.display = 'none';
        countEl.textContent = '';
      }
    });
  }
}
