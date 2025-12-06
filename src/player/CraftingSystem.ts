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

    const img = document.createElement('img');
    img.style.display = 'none';
    slot.appendChild(img);

    const count = document.createElement('span');
    count.className = 'slot-count';
    slot.appendChild(count);

    return slot;
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
