import { Inventory, ItemType, ITEM_DATA, InventorySlot } from './Inventory';
import { getAssetPath } from '../utils/assetPath';

// Crafting recipe definition
export interface CraftingRecipe {
  inputs: { itemType: ItemType; quantity: number }[];
  output: { itemType: ItemType; quantity: number };
  name: string;
}

// All crafting recipes in the game
export const CRAFTING_RECIPES: CraftingRecipe[] = [
  {
    name: 'Wood Planks',
    inputs: [{ itemType: ItemType.LOG, quantity: 1 }],
    output: { itemType: ItemType.WOOD, quantity: 4 },
  },
];

export class CraftingSystem {
  private inventory: Inventory;
  private menuElement: HTMLElement | null = null;
  private recipeListElement: HTMLElement | null = null;
  private inventoryGridElement: HTMLElement | null = null;
  private inventoryHotbarElement: HTMLElement | null = null;
  private isOpen: boolean = false;
  private onCloseCallback: (() => void) | null = null;
  private onUpdateHotbarCallback: (() => void) | null = null;

  // Drag and drop state
  private draggedSlotIndex: number | null = null;
  private dragGhost: HTMLElement | null = null;

  // Mobile touch drag state
  private touchDragSlotIndex: number | null = null;
  private touchDragGhost: HTMLElement | null = null;

  constructor(inventory: Inventory) {
    this.inventory = inventory;
    this.setupUI();
    this.setupKeyboardHandler();
  }

  private setupUI(): void {
    this.menuElement = document.getElementById('inventory-menu');
    this.recipeListElement = document.getElementById('recipe-list');
    this.inventoryGridElement = document.getElementById('inventory-grid');
    this.inventoryHotbarElement = document.getElementById('inventory-hotbar');

    // Create inventory slots
    this.createInventorySlots();

    // Setup close button
    const closeBtn = this.menuElement?.querySelector('.close-inventory');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Populate recipes
    this.updateRecipeList();
  }

  private createInventorySlots(): void {
    // Create 27 storage slots (slots 9-35)
    if (this.inventoryGridElement) {
      this.inventoryGridElement.innerHTML = '';
      for (let i = 9; i < 36; i++) {
        const slot = this.createSlotElement(i);
        this.inventoryGridElement.appendChild(slot);
      }
    }

    // Create 9 hotbar slots (slots 0-8)
    if (this.inventoryHotbarElement) {
      this.inventoryHotbarElement.innerHTML = '';
      for (let i = 0; i < 9; i++) {
        const slot = this.createSlotElement(i);
        this.inventoryHotbarElement.appendChild(slot);
      }
    }
  }

  private createSlotElement(slotIndex: number): HTMLElement {
    const slot = document.createElement('div');
    slot.className = 'inventory-slot';
    slot.dataset.slot = slotIndex.toString();
    slot.draggable = true;

    const img = document.createElement('img');
    img.style.display = 'none';
    img.draggable = false; // Prevent image from being dragged separately
    slot.appendChild(img);

    const count = document.createElement('span');
    count.className = 'slot-count';
    slot.appendChild(count);

    // Desktop drag and drop event handlers
    slot.addEventListener('dragstart', (e) => this.handleDragStart(e, slotIndex));
    slot.addEventListener('dragend', () => this.handleDragEnd());
    slot.addEventListener('dragover', (e) => this.handleDragOver(e));
    slot.addEventListener('dragleave', (e) => this.handleDragLeave(e));
    slot.addEventListener('drop', (e) => this.handleDrop(e, slotIndex));

    // Mobile touch drag handlers
    slot.addEventListener('touchstart', (e) => this.handleTouchStart(e, slotIndex), { passive: false });
    slot.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    slot.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });

    return slot;
  }

  private handleTouchStart(e: TouchEvent, slotIndex: number): void {
    const slotData = this.inventory.getSlot(slotIndex);
    if (!slotData || slotData.itemType === ItemType.NONE) {
      return;
    }

    e.preventDefault();
    this.touchDragSlotIndex = slotIndex;

    const touch = e.touches[0];
    const target = e.currentTarget as HTMLElement;
    target.classList.add('dragging');

    // Create touch ghost element
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    const itemData = ITEM_DATA[slotData.itemType];
    ghost.innerHTML = `<img src="${getAssetPath(itemData.texture)}" style="width:40px;height:40px;image-rendering:pixelated;">`;
    if (slotData.quantity > 1) {
      ghost.innerHTML += `<span class="ghost-count">${slotData.quantity}</span>`;
    }
    ghost.style.position = 'fixed';
    ghost.style.left = `${touch.clientX - 25}px`;
    ghost.style.top = `${touch.clientY - 25}px`;
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '9999';
    ghost.style.background = 'rgba(0,0,0,0.8)';
    ghost.style.border = '2px solid #4CAF50';
    ghost.style.borderRadius = '4px';
    ghost.style.padding = '4px';
    document.body.appendChild(ghost);
    this.touchDragGhost = ghost;
  }

  private handleTouchMove(e: TouchEvent): void {
    if (this.touchDragSlotIndex === null || !this.touchDragGhost) return;

    e.preventDefault();
    const touch = e.touches[0];

    // Move ghost to follow finger
    this.touchDragGhost.style.left = `${touch.clientX - 25}px`;
    this.touchDragGhost.style.top = `${touch.clientY - 25}px`;

    // Find slot under touch and highlight it
    document.querySelectorAll('.inventory-slot.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });

    const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
    const slotUnder = elementUnder?.closest('.inventory-slot') as HTMLElement;
    if (slotUnder) {
      slotUnder.classList.add('drag-over');
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    if (this.touchDragSlotIndex === null) return;

    e.preventDefault();
    const touch = e.changedTouches[0];

    // Find target slot
    const elementUnder = document.elementFromPoint(touch.clientX, touch.clientY);
    const targetSlot = elementUnder?.closest('.inventory-slot') as HTMLElement;

    if (targetSlot) {
      const targetSlotIndex = parseInt(targetSlot.dataset.slot || '-1');
      if (targetSlotIndex >= 0 && targetSlotIndex !== this.touchDragSlotIndex) {
        // Swap slots
        this.inventory.swapSlots(this.touchDragSlotIndex, targetSlotIndex);
        this.updateInventorySlots();
        if (this.onUpdateHotbarCallback) {
          this.onUpdateHotbarCallback();
        }
      }
    }

    // Cleanup
    document.querySelectorAll('.inventory-slot.dragging').forEach(el => {
      el.classList.remove('dragging');
    });
    document.querySelectorAll('.inventory-slot.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });
    if (this.touchDragGhost) {
      this.touchDragGhost.remove();
      this.touchDragGhost = null;
    }
    this.touchDragSlotIndex = null;
  }

  private handleDragStart(e: DragEvent, slotIndex: number): void {
    const slotData = this.inventory.getSlot(slotIndex);
    if (!slotData || slotData.itemType === ItemType.NONE) {
      e.preventDefault();
      return;
    }

    this.draggedSlotIndex = slotIndex;

    // Set drag data
    e.dataTransfer?.setData('text/plain', slotIndex.toString());
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }

    // Create ghost element for drag feedback
    const target = e.target as HTMLElement;
    target.classList.add('dragging');

    // Create custom drag image
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    const itemData = ITEM_DATA[slotData.itemType];
    ghost.innerHTML = `<img src="${getAssetPath(itemData.texture)}" style="width:40px;height:40px;image-rendering:pixelated;">`;
    if (slotData.quantity > 1) {
      ghost.innerHTML += `<span class="ghost-count">${slotData.quantity}</span>`;
    }
    document.body.appendChild(ghost);
    this.dragGhost = ghost;

    // Position ghost off-screen initially (browser will position it during drag)
    ghost.style.position = 'fixed';
    ghost.style.top = '-100px';
    ghost.style.left = '-100px';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '9999';
    ghost.style.background = 'rgba(0,0,0,0.8)';
    ghost.style.border = '2px solid #4CAF50';
    ghost.style.borderRadius = '4px';
    ghost.style.padding = '4px';

    e.dataTransfer?.setDragImage(ghost, 25, 25);
  }

  private handleDragEnd(): void {
    this.draggedSlotIndex = null;

    // Remove dragging class from all slots
    document.querySelectorAll('.inventory-slot.dragging').forEach(el => {
      el.classList.remove('dragging');
    });
    document.querySelectorAll('.inventory-slot.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });

    // Remove ghost element
    if (this.dragGhost) {
      this.dragGhost.remove();
      this.dragGhost = null;
    }
  }

  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    const target = e.currentTarget as HTMLElement;
    target.classList.add('drag-over');
  }

  private handleDragLeave(e: DragEvent): void {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
  }

  private handleDrop(e: DragEvent, targetSlotIndex: number): void {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');

    const sourceSlotIndex = this.draggedSlotIndex;
    if (sourceSlotIndex === null || sourceSlotIndex === targetSlotIndex) {
      return;
    }

    // Swap the slots
    this.inventory.swapSlots(sourceSlotIndex, targetSlotIndex);

    // Update UI
    this.updateInventorySlots();
    if (this.onUpdateHotbarCallback) {
      this.onUpdateHotbarCallback();
    }
  }

  private setupKeyboardHandler(): void {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'e' || e.key === 'E') {
        if (this.isOpen) {
          this.close();
          e.preventDefault();
        } else {
          // Only open if game is active (pointer locked)
          if (document.pointerLockElement) {
            this.open();
            e.preventDefault();
          }
        }
      } else if (e.key === 'Escape' && this.isOpen) {
        this.close();
        e.preventDefault();
      }
    });
  }

  public open(): void {
    if (this.menuElement) {
      console.log('Inventory opened');
      this.menuElement.classList.add('active');
      this.isOpen = true;
      document.exitPointerLock();
      this.updateUI();
    }
  }

  public close(): void {
    if (this.menuElement) {
      this.menuElement.classList.remove('active');
      this.isOpen = false;
      if (this.onCloseCallback) {
        this.onCloseCallback();
      }
    }
  }

  public isMenuOpen(): boolean {
    return this.isOpen;
  }

  public toggle(): void {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  public setOnCloseCallback(callback: () => void): void {
    this.onCloseCallback = callback;
  }

  public setOnUpdateHotbarCallback(callback: () => void): void {
    this.onUpdateHotbarCallback = callback;
  }

  private updateUI(): void {
    this.updateInventorySlots();
    this.updateRecipeList();
  }

  private updateInventorySlots(): void {
    const allSlots = this.inventory.getAllSlots();

    // Update storage slots
    const storageSlots = this.inventoryGridElement?.querySelectorAll('.inventory-slot');
    storageSlots?.forEach((slotEl, index) => {
      const slotIndex = 9 + index;
      this.updateSlotElement(slotEl as HTMLElement, allSlots[slotIndex]);
    });

    // Update hotbar slots
    const hotbarSlots = this.inventoryHotbarElement?.querySelectorAll('.inventory-slot');
    hotbarSlots?.forEach((slotEl, index) => {
      this.updateSlotElement(slotEl as HTMLElement, allSlots[index]);
    });
  }

  private updateSlotElement(slotEl: HTMLElement, slot: InventorySlot): void {
    const img = slotEl.querySelector('img') as HTMLImageElement;
    const countEl = slotEl.querySelector('.slot-count') as HTMLElement;

    if (slot.itemType !== ItemType.NONE && slot.quantity > 0) {
      const itemData = ITEM_DATA[slot.itemType];
      if (img) {
        img.src = getAssetPath(itemData.texture);
        img.style.display = 'block';
      }
      if (countEl) {
        countEl.textContent = slot.quantity > 1 ? slot.quantity.toString() : '';
      }
    } else {
      if (img) img.style.display = 'none';
      if (countEl) countEl.textContent = '';
    }
  }

  private updateRecipeList(): void {
    if (!this.recipeListElement) return;

    this.recipeListElement.innerHTML = '';

    for (const recipe of CRAFTING_RECIPES) {
      const recipeEl = this.createRecipeElement(recipe);
      this.recipeListElement.appendChild(recipeEl);
    }
  }

  private createRecipeElement(recipe: CraftingRecipe): HTMLElement {
    const recipeEl = document.createElement('div');
    recipeEl.className = 'recipe-item';

    // Check if player can craft this recipe
    const canCraft = this.canCraft(recipe);
    if (!canCraft) {
      recipeEl.classList.add('disabled');
    }

    // Input items
    for (const input of recipe.inputs) {
      const inputImg = document.createElement('img');
      inputImg.src = getAssetPath(ITEM_DATA[input.itemType].texture);
      inputImg.title = `${input.quantity}x ${ITEM_DATA[input.itemType].name}`;
      recipeEl.appendChild(inputImg);

      const inputCount = document.createElement('span');
      inputCount.textContent = `x${input.quantity}`;
      recipeEl.appendChild(inputCount);
    }

    // Arrow
    const arrow = document.createElement('span');
    arrow.className = 'recipe-arrow';
    arrow.textContent = ' → ';
    recipeEl.appendChild(arrow);

    // Output item
    const outputImg = document.createElement('img');
    outputImg.src = getAssetPath(ITEM_DATA[recipe.output.itemType].texture);
    outputImg.title = `${recipe.output.quantity}x ${ITEM_DATA[recipe.output.itemType].name}`;
    recipeEl.appendChild(outputImg);

    const outputCount = document.createElement('span');
    outputCount.textContent = `x${recipe.output.quantity}`;
    recipeEl.appendChild(outputCount);

    // Recipe name
    const nameEl = document.createElement('span');
    nameEl.textContent = ` (${recipe.name})`;
    nameEl.style.color = '#888';
    recipeEl.appendChild(nameEl);

    // Click handler to craft
    if (canCraft) {
      recipeEl.addEventListener('click', () => this.craft(recipe));
    }

    return recipeEl;
  }

  private canCraft(recipe: CraftingRecipe): boolean {
    for (const input of recipe.inputs) {
      if (!this.inventory.hasItem(input.itemType, input.quantity)) {
        return false;
      }
    }
    return true;
  }

  private craft(recipe: CraftingRecipe): void {
    if (!this.canCraft(recipe)) return;

    // Remove input items
    for (const input of recipe.inputs) {
      this.inventory.removeItem(input.itemType, input.quantity);
    }

    // Add output items
    this.inventory.addItem(recipe.output.itemType, recipe.output.quantity);

    // Update UI
    this.updateUI();

    // Update hotbar in main game
    if (this.onUpdateHotbarCallback) {
      this.onUpdateHotbarCallback();
    }
  }
}
