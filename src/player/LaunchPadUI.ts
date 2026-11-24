import { ROCKET_CONFIG } from '../config/RocketConfig';
import { PlacedLaunchPad, PlacedRocketPart } from '../planet/LaunchPad';
import { MenuManager } from './MenuManager';
import { Inventory, ItemType, ITEM_DATA } from './Inventory';
import { getAssetPath } from '../utils/assetPath';
import { showToast } from '../utils/toast';
import { computeRocketStats, cargoMass, deltaVWith, stagedStats, stagedDeltaVWith, stackProblems, surfaceTWR, engineModes, engineModeLabel, validEngineMode, fitEquipment, isEquipment, equipmentLabel, equipmentSummary } from '../rocket/RocketPerformance';

// Rocket validation result
export interface RocketValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * LaunchPadUI - UI for managing launch pad segments and rockets
 *
 * Layout:
 * - Two vertical columns of 8 slots each
 * - Left column: Rocket blocks (must match segment height)
 * - Right column: Launch pad segments (tower height) - bottom slot is permanent base
 * - "Board Rocket" button when rocket is fully assembled
 */
export class LaunchPadUI {
  private currentLaunchPad: PlacedLaunchPad | null = null;
  private launchPadSectionElement: HTMLElement | null = null;
  private isOpen: boolean = false;
  private inventory: Inventory | null = null;

  // Callbacks
  private onCloseCallback: (() => void) | null = null;
  private onOpenInventoryCallback: (() => void) | null = null;
  private onUpdateHotbarCallback: (() => void) | null = null;
  private onUpdateInventoryCallback: (() => void) | null = null;
  private onAddSegmentCallback: ((pad: PlacedLaunchPad) => boolean) | null = null;
  private onRemoveSegmentCallback: ((pad: PlacedLaunchPad) => boolean) | null = null;
  // Legacy callbacks for rocket engine (still used for backwards compatibility)
  private onAddRocketEngineCallback: ((pad: PlacedLaunchPad) => boolean) | null = null;
  private onRemoveRocketEngineCallback: ((pad: PlacedLaunchPad) => boolean) | null = null;
  // New generic rocket part callbacks
  private onAddRocketPartCallback: ((pad: PlacedLaunchPad, itemType: ItemType) => Promise<boolean>) | null = null;
  private onRemoveRocketPartCallback: ((pad: PlacedLaunchPad) => PlacedRocketPart | null) | null = null;
  // Board rocket callback
  private onBoardRocketCallback: ((pad: PlacedLaunchPad) => void) | null = null;
  // Close all menus callback (for boarding rocket - needs to close inventory too)
  private onCloseAllMenusCallback: (() => void) | null = null;

  // UI elements
  private segmentSlots: HTMLElement[] = [];
  private rocketSlots: HTMLElement[] = [];
  private engineSlot: HTMLElement | null = null;
  private boardRocketBtn: HTMLButtonElement | null = null;
  private statusElement: HTMLElement | null = null;
  private validationMessageElement: HTMLElement | null = null;

  private readonly MAX_HEIGHT = 8;

  // The rocket's numbers, refuelling and its cargo hold
  private refuelBtn: HTMLButtonElement | null = null;
  private cargoBtn: HTMLButtonElement | null = null;
  private statsElement: HTMLElement | null = null;
  private onRefuelCallback: ((pad: PlacedLaunchPad) => void) | null = null;
  private onOpenCargoCallback: ((pad: PlacedLaunchPad) => void) | null = null;
  private gravityLookup: ((pad: PlacedLaunchPad) => number) | null = null;

  public setOnRefuelCallback(callback: (pad: PlacedLaunchPad) => void): void {
    this.onRefuelCallback = callback;
  }

  public setOnOpenCargoCallback(callback: (pad: PlacedLaunchPad) => void): void {
    this.onOpenCargoCallback = callback;
  }

  // Told when equipment is fitted or taken out (the pad and the inventory save)
  private onEquipmentChangedCallback: ((pad: PlacedLaunchPad) => void) | null = null;
  private equipRow: HTMLElement | null = null;
  private equipSummary: HTMLElement | null = null;
  public setOnEquipmentChangedCallback(callback: (pad: PlacedLaunchPad) => void): void {
    this.onEquipmentChangedCallback = callback;
  }

  /** Gravity strength (1 = Earth) of the body a pad stands on, for its TWR */
  public setGravityLookup(lookup: (pad: PlacedLaunchPad) => number): void {
    this.gravityLookup = lookup;
  }

  constructor(inventory: Inventory) {
    this.inventory = inventory;
    this.createUI();
    this.addStyles();
    this.setupKeyboardHandler();

    // Register with menu manager
    MenuManager.registerMenu('launchpad', {
      isOpen: () => this.isOpen,
      close: () => this.close(),
    });
  }

  public setInventory(inventory: Inventory): void {
    this.inventory = inventory;
  }

  public setOnAddSegmentCallback(callback: (pad: PlacedLaunchPad) => boolean): void {
    this.onAddSegmentCallback = callback;
  }

  public setOnRemoveSegmentCallback(callback: (pad: PlacedLaunchPad) => boolean): void {
    this.onRemoveSegmentCallback = callback;
  }

  public setOnAddRocketEngineCallback(callback: (pad: PlacedLaunchPad) => boolean): void {
    this.onAddRocketEngineCallback = callback;
  }

  public setOnRemoveRocketEngineCallback(callback: (pad: PlacedLaunchPad) => boolean): void {
    this.onRemoveRocketEngineCallback = callback;
  }

  public setOnAddRocketPartCallback(callback: (pad: PlacedLaunchPad, itemType: ItemType) => Promise<boolean>): void {
    this.onAddRocketPartCallback = callback;
  }

  public setOnRemoveRocketPartCallback(callback: (pad: PlacedLaunchPad) => PlacedRocketPart | null): void {
    this.onRemoveRocketPartCallback = callback;
  }

  public setOnBoardRocketCallback(callback: (pad: PlacedLaunchPad) => void): void {
    this.onBoardRocketCallback = callback;
  }

  public setOnCloseAllMenusCallback(callback: () => void): void {
    this.onCloseAllMenusCallback = callback;
  }

  private createUI(): void {
    this.launchPadSectionElement = document.createElement('div');
    this.launchPadSectionElement.id = 'launchpad-section';
    this.launchPadSectionElement.className = 'launchpad-section';

    // Create slot rows (8 rows, 2 columns)
    // Left column: Rocket parts, Right column: Tower segments
    let slotsHtml = '';
    for (let i = this.MAX_HEIGHT - 1; i >= 0; i--) {
      slotsHtml += `
        <div class="launchpad-slot-row">
          <div class="launchpad-slot rocket-slot" id="launchpad-rocket-${i}" data-slot="${i}" data-type="rocket">
            <img style="display:none;">
          </div>
          <div class="launchpad-slot segment-slot" id="launchpad-segment-${i}" data-slot="${i}" data-type="segment">
            <img style="display:none;">
            <span class="slot-number">${i + 1}</span>
          </div>
        </div>
      `;
    }

    this.launchPadSectionElement.innerHTML = `
      <h3>Launch Pad</h3>

      <div class="launchpad-status" id="launchpad-status">
        <span class="status-text">Tower Height: 0/8</span>
      </div>

      <div class="launchpad-body">
      <!-- Left: the rocket and tower stack -->
      <div class="launchpad-stack-col">
      <div class="launchpad-columns">
        <div class="launchpad-column-header">
          <span class="column-label">Rocket</span>
          <span class="column-label">Tower</span>
        </div>
        <div class="launchpad-slots">
          ${slotsHtml}
        </div>
      </div>

      <div class="launchpad-engine-section">
        <span class="engine-label">Engine:</span>
        <div class="launchpad-slot engine-slot" id="launchpad-engine" data-type="engine">
          <img style="display:none;">
        </div>
      </div>
      </div>

      <!-- Right: the rocket's controls, in their own column beside the stack -->
      <div class="launchpad-control-col">
      <div class="launchpad-equipment">
        <span class="equip-label">Equipment:</span>
        <div class="launchpad-equip-row" id="launchpad-equip-row"></div>
        <div class="launchpad-equip-summary" id="launchpad-equip-summary"></div>
      </div>

      <div class="launchpad-validation" id="launchpad-validation">
        <div class="validation-message"></div>
      </div>

      <div class="launchpad-stats" id="launchpad-stats"></div>

      <div class="launchpad-controls">
        <button class="launchpad-btn small" id="launchpad-refuel-btn">Refuel</button>
        <button class="launchpad-btn small" id="launchpad-cargo-btn">Cargo</button>
      </div>

      <div class="launchpad-controls">
        <button class="launchpad-btn" id="launchpad-board-btn" disabled>Board Rocket</button>
      </div>

      <div class="launchpad-hint">
        <p>Drag rocket parts from inventory to rocket slots</p>
        <p>Drag a parachute, solar array or battery pack to Equipment; click to take it out</p>
        <p>Press E or ESC to close</p>
      </div>
      </div>
      </div>
    `;

    // Insert into inventory container
    const inventoryContainer = document.querySelector('.inventory-container');
    if (inventoryContainer) {
      const inventorySection = inventoryContainer.querySelector('.inventory-section');
      if (inventorySection) {
        inventoryContainer.insertBefore(this.launchPadSectionElement, inventorySection);
      } else {
        inventoryContainer.appendChild(this.launchPadSectionElement);
      }
    }

    // Get references to slot elements
    for (let i = 0; i < this.MAX_HEIGHT; i++) {
      const segmentSlot = document.getElementById(`launchpad-segment-${i}`);
      const rocketSlot = document.getElementById(`launchpad-rocket-${i}`);
      if (segmentSlot) this.segmentSlots[i] = segmentSlot;
      if (rocketSlot) this.rocketSlots[i] = rocketSlot;
    }

    this.boardRocketBtn = document.getElementById('launchpad-board-btn') as HTMLButtonElement;
    this.refuelBtn = document.getElementById('launchpad-refuel-btn') as HTMLButtonElement;
    this.cargoBtn = document.getElementById('launchpad-cargo-btn') as HTMLButtonElement;
    this.statsElement = document.getElementById('launchpad-stats');
    this.equipRow = document.getElementById('launchpad-equip-row');
    this.equipSummary = document.getElementById('launchpad-equip-summary');
    this.statusElement = document.getElementById('launchpad-status');
    this.engineSlot = document.getElementById('launchpad-engine');
    this.validationMessageElement = document.getElementById('launchpad-validation');

    // Setup interactions
    this.setupSlotInteractions();
    this.setupButtonInteractions();

    this.launchPadSectionElement.style.display = 'none';
  }

  private setupSlotInteractions(): void {
    // Segment slots - click to add/remove segments, drag-and-drop support
    for (let i = 0; i < this.MAX_HEIGHT; i++) {
      const slot = this.segmentSlots[i];
      if (slot) {
        slot.addEventListener('click', () => this.handleSegmentSlotClick(i));
        // Drag-and-drop for adding segments from inventory
        slot.addEventListener('dragover', (e) => this.handleDragOver(e, i));
        slot.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        slot.addEventListener('drop', (e) => this.handleSegmentDrop(e, i));
      }

      // Rocket slots - drag-and-drop for rocket parts (both drag-in and drag-out)
      const rocketSlot = this.rocketSlots[i];
      if (rocketSlot) {
        rocketSlot.addEventListener('click', () => this.handleRocketSlotClick(i));
        rocketSlot.addEventListener('dragover', (e) => this.handleRocketSlotDragOver(e, i));
        rocketSlot.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        rocketSlot.addEventListener('drop', (e) => this.handleRocketSlotDrop(e, i));
        // Drag-out support - allow dragging parts out of rocket slots
        rocketSlot.addEventListener('dragstart', (e) => this.handleRocketSlotDragStart(e, i));
        rocketSlot.addEventListener('dragend', (e) => this.handleRocketSlotDragEnd(e, i));
      }
    }

    // Engine slot - drag-and-drop support (legacy, can also use rocket slots now)
    if (this.engineSlot) {
      this.engineSlot.addEventListener('click', () => this.handleEngineSlotClick());
      this.engineSlot.addEventListener('dragover', (e) => this.handleEngineDragOver(e));
      this.engineSlot.addEventListener('dragleave', (e) => this.handleDragLeave(e));
      this.engineSlot.addEventListener('drop', (e) => this.handleEngineDrop(e));
    }
  }

  private handleDragOver(e: DragEvent, slotIndex: number): void {
    if (!this.currentLaunchPad) return;

    // Only allow drop on the next available slot
    const currentHeight = this.currentLaunchPad.segmentCount;
    if (slotIndex !== currentHeight || currentHeight >= this.MAX_HEIGHT) return;

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

  private handleSegmentDrop(e: DragEvent, slotIndex: number): void {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');

    if (!this.currentLaunchPad || !this.inventory) return;

    // Only allow drop on the next available slot
    const currentHeight = this.currentLaunchPad.segmentCount;
    if (slotIndex !== currentHeight || currentHeight >= this.MAX_HEIGHT) return;

    // Get drag data - it should be an inventory slot index
    const dragData = e.dataTransfer?.getData('text/plain');
    if (!dragData) return;

    // Parse the slot index from drag data (inventory slots are just numbers)
    const sourceSlotIndex = parseInt(dragData, 10);
    if (isNaN(sourceSlotIndex)) return;

    // Check if the source slot has a launch pad segment
    const sourceSlot = this.inventory.getSlot(sourceSlotIndex);
    if (!sourceSlot || sourceSlot.itemType !== ItemType.LAUNCH_PAD_SEGMENT || sourceSlot.quantity <= 0) {
      return;
    }

    // Add the segment
    if (this.onAddSegmentCallback && this.onAddSegmentCallback(this.currentLaunchPad)) {
      this.inventory.removeItem(ItemType.LAUNCH_PAD_SEGMENT, 1);
      this.updateUI();
      this.notifyChanges();
    }
  }

  private handleEngineDragOver(e: DragEvent): void {
    if (!this.currentLaunchPad || !this.inventory) return;

    // Need at least 1 segment to place parts
    if (this.currentLaunchPad.segmentCount < 1) return;

    // Get drag data to check if it's a rocket part
    const dragData = e.dataTransfer?.getData('text/plain');
    if (!dragData) {
      // During dragover, we can't always access drag data due to browser security
      // So we'll be permissive and allow the dragover, checking properly on drop
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'move';
      }
      const target = e.currentTarget as HTMLElement;
      target.classList.add('drag-over');
      return;
    }

    const sourceSlotIndex = parseInt(dragData, 10);
    if (isNaN(sourceSlotIndex)) return;

    const sourceSlot = this.inventory.getSlot(sourceSlotIndex);
    if (!sourceSlot || sourceSlot.quantity <= 0) return;

    // Check if the item is a rocket part
    const itemData = ITEM_DATA[sourceSlot.itemType];
    if (!itemData.rocketPart) return;

    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    const target = e.currentTarget as HTMLElement;
    target.classList.add('drag-over');
  }

  private async handleEngineDrop(e: DragEvent): Promise<void> {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');

    if (!this.currentLaunchPad || !this.inventory) return;

    // Need at least 1 segment to place parts
    if (this.currentLaunchPad.segmentCount < 1) return;

    // Get drag data - it should be an inventory slot index
    const dragData = e.dataTransfer?.getData('text/plain');
    if (!dragData) return;

    // Parse the slot index from drag data (inventory slots are just numbers)
    const sourceSlotIndex = parseInt(dragData, 10);
    if (isNaN(sourceSlotIndex)) return;

    // Check if the source slot has a rocket part
    const sourceSlot = this.inventory.getSlot(sourceSlotIndex);
    if (!sourceSlot || sourceSlot.quantity <= 0) return;

    const itemData = ITEM_DATA[sourceSlot.itemType];
    if (!itemData.rocketPart) {
      console.log('Item is not a rocket part:', sourceSlot.itemType);
      return;
    }

    // Try to add the part using the new callback
    if (this.onAddRocketPartCallback) {
      const success = await this.onAddRocketPartCallback(this.currentLaunchPad, sourceSlot.itemType);
      if (success) {
        this.inventory.removeItem(sourceSlot.itemType, 1);
        this.updateUI();
        this.notifyChanges();
      }
    } else if (sourceSlot.itemType === ItemType.ROCKET_ENGINE && this.onAddRocketEngineCallback) {
      // Legacy fallback for rocket engine
      if (this.onAddRocketEngineCallback(this.currentLaunchPad)) {
        this.inventory.removeItem(ItemType.ROCKET_ENGINE, 1);
        this.updateUI();
        this.notifyChanges();
      }
    }
  }

  private handleEngineSlotClick(): void {
    if (!this.currentLaunchPad || !this.inventory) return;

    // If there are rocket parts, clicking removes the top one
    if (this.currentLaunchPad.rocketParts.length > 0) {
      if (this.onRemoveRocketPartCallback) {
        const removedPart = this.onRemoveRocketPartCallback(this.currentLaunchPad);
        if (removedPart) {
          this.inventory.give(removedPart.itemType, 1);
          this.updateUI();
          this.notifyChanges();
        }
      } else if (this.currentLaunchPad.hasRocketEngine && this.onRemoveRocketEngineCallback) {
        // Legacy fallback
        if (this.onRemoveRocketEngineCallback(this.currentLaunchPad)) {
          this.inventory.give(ItemType.ROCKET_ENGINE, 1);
          this.updateUI();
          this.notifyChanges();
        }
      }
    }
  }

  private setupButtonInteractions(): void {
    if (this.boardRocketBtn) {
      this.boardRocketBtn.addEventListener('click', () => this.handleBoardRocket());
    }
    this.refuelBtn?.addEventListener('click', () => {
      if (!this.currentLaunchPad || !this.onRefuelCallback) return;
      this.onRefuelCallback(this.currentLaunchPad);
      this.updateUI();
      this.notifyChanges();
    });
    this.cargoBtn?.addEventListener('click', () => {
      if (!this.currentLaunchPad || !this.onOpenCargoCallback) return;
      this.onOpenCargoCallback(this.currentLaunchPad);
    });
  }

  private handleSegmentSlotClick(slotIndex: number): void {
    if (!this.currentLaunchPad || !this.inventory) return;

    const currentHeight = this.currentLaunchPad.segmentCount;

    if (slotIndex < currentHeight) {
      // Clicking on existing segment - try to remove it (only if it's the top one)
      if (slotIndex === currentHeight - 1) {
        // Cannot remove slot 0 - it's the tower base
        if (slotIndex === 0) return;

        // Can only remove if no rocket at this height
        if (this.currentLaunchPad.rocketBlocks <= slotIndex) {
          if (this.onRemoveSegmentCallback && this.onRemoveSegmentCallback(this.currentLaunchPad)) {
            // Return segment to inventory
            this.inventory.give(ItemType.LAUNCH_PAD_SEGMENT, 1);
            this.updateUI();
            this.notifyChanges();
          }
        }
      }
    } else if (slotIndex === currentHeight) {
      // Clicking on next empty slot - try to add segment
      if (currentHeight < this.MAX_HEIGHT) {
        // Check if player has a segment in inventory
        if (this.inventory.hasItem(ItemType.LAUNCH_PAD_SEGMENT, 1)) {
          if (this.onAddSegmentCallback && this.onAddSegmentCallback(this.currentLaunchPad)) {
            this.inventory.removeItem(ItemType.LAUNCH_PAD_SEGMENT, 1);
            this.updateUI();
            this.notifyChanges();
          }
        }
      }
    }
  }

  private handleRocketSlotClick(_slotIndex: number): void {
    // Clicking on rocket slots no longer removes parts
    // Use drag-out to remove parts instead
    // This handler is kept for potential future click functionality
  }

  // Track if we're currently dragging a rocket part out
  private draggingRocketPart: boolean = false;

  /**
   * Handle starting a drag from a rocket slot (drag-out)
   * Only the top part can be dragged out
   */
  private handleRocketSlotDragStart(e: DragEvent, slotIndex: number): void {
    if (!this.currentLaunchPad || !this.inventory) {
      e.preventDefault();
      return;
    }

    const rocketParts = this.currentLaunchPad.rocketParts;
    if (rocketParts.length === 0) {
      e.preventDefault();
      return;
    }

    // Check if this slot belongs to the top part
    const topPart = rocketParts[rocketParts.length - 1];
    const topPartData = ITEM_DATA[topPart.itemType].rocketPart;
    const topPartHeightUnits = topPartData?.heightUnits ?? 1;
    const topPartStartSlot = this.getNextAvailableHeightSlot() - topPartHeightUnits;

    // Only allow dragging from slots that belong to the top part
    if (slotIndex < topPartStartSlot || slotIndex >= topPartStartSlot + topPartHeightUnits) {
      e.preventDefault();
      return;
    }

    // Set drag data - use a special format to indicate it's from the rocket
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', `rocket:${slotIndex}`);
      e.dataTransfer.effectAllowed = 'move';
    }

    this.draggingRocketPart = true;
    console.log(`Started dragging rocket part from slot ${slotIndex}`);
  }

  /**
   * Handle end of drag from a rocket slot
   * If dropped outside valid target, remove the part and add to inventory
   */
  private handleRocketSlotDragEnd(e: DragEvent, _slotIndex: number): void {
    if (!this.draggingRocketPart || !this.currentLaunchPad || !this.inventory) {
      this.draggingRocketPart = false;
      return;
    }

    // Check if the drop was successful (dropEffect will be 'none' if dropped outside valid target)
    // For drag-out to inventory, we remove the part here
    if (e.dataTransfer?.dropEffect === 'none' || e.dataTransfer?.dropEffect === 'move') {
      // The part was dragged out - remove it and add to inventory
      if (this.onRemoveRocketPartCallback) {
        const removedPart = this.onRemoveRocketPartCallback(this.currentLaunchPad);
        if (removedPart) {
          this.inventory.give(removedPart.itemType, 1);
          console.log(`Removed rocket part via drag: ${ITEM_DATA[removedPart.itemType].name}`);
          this.updateUI();
          this.notifyChanges();
        }
      }
    }

    this.draggingRocketPart = false;
  }

  /**
   * Calculate the next available height slot based on existing parts' heightUnits
   */
  private getNextAvailableHeightSlot(): number {
    if (!this.currentLaunchPad) return 0;

    let nextSlot = 0;
    for (const part of this.currentLaunchPad.rocketParts) {
      const partData = ITEM_DATA[part.itemType].rocketPart;
      if (partData) {
        nextSlot += partData.heightUnits;
      }
    }
    return nextSlot;
  }

  private handleRocketSlotDragOver(e: DragEvent, slotIndex: number): void {
    if (!this.currentLaunchPad || !this.inventory) return;

    // Need at least 1 segment to place parts
    if (this.currentLaunchPad.segmentCount < 1) {
      console.log('DragOver rejected: no segments');
      return;
    }

    // Calculate the next available slot based on heightUnits of existing parts
    const nextSlotIndex = this.getNextAvailableHeightSlot();

    // Can only place at the next available slot index
    if (slotIndex !== nextSlotIndex) {
      console.log(`DragOver rejected: slotIndex ${slotIndex} !== nextSlotIndex ${nextSlotIndex}`);
      return;
    }

    // Can't place above tower height
    if (slotIndex >= this.currentLaunchPad.segmentCount) {
      console.log(`DragOver rejected: slotIndex ${slotIndex} >= segmentCount ${this.currentLaunchPad.segmentCount}`);
      return;
    }

    console.log(`DragOver accepted: slot ${slotIndex}, nextSlot ${nextSlotIndex}, segments ${this.currentLaunchPad.segmentCount}`);
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    const target = e.currentTarget as HTMLElement;
    target.classList.add('drag-over');
  }

  private async handleRocketSlotDrop(e: DragEvent, slotIndex: number): Promise<void> {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');

    console.log(`Drop on slot ${slotIndex}`);

    if (!this.currentLaunchPad || !this.inventory) {
      console.log('Drop rejected: no launch pad or inventory');
      return;
    }

    // Need at least 1 segment to place parts
    if (this.currentLaunchPad.segmentCount < 1) {
      console.log('Drop rejected: no segments');
      return;
    }

    // Calculate the next available slot based on heightUnits of existing parts
    const nextSlotIndex = this.getNextAvailableHeightSlot();

    if (slotIndex !== nextSlotIndex) {
      console.log(`Drop rejected: slot mismatch ${slotIndex} !== ${nextSlotIndex}`);
      return;
    }
    if (slotIndex >= this.currentLaunchPad.segmentCount) {
      console.log(`Drop rejected: above tower height`);
      return;
    }

    // Get drag data - it should be an inventory slot index
    const dragData = e.dataTransfer?.getData('text/plain');
    console.log('Drag data:', dragData);
    if (!dragData) {
      console.log('Drop rejected: no drag data');
      return;
    }

    // Parse the slot index from drag data
    const sourceSlotIndex = parseInt(dragData, 10);
    if (isNaN(sourceSlotIndex)) {
      console.log('Drop rejected: invalid slot index');
      return;
    }

    // Check if the source slot has a rocket part
    const sourceSlot = this.inventory.getSlot(sourceSlotIndex);
    if (!sourceSlot || sourceSlot.quantity <= 0) {
      console.log('Drop rejected: no item in source slot');
      return;
    }

    console.log('Source item:', sourceSlot.itemType, ITEM_DATA[sourceSlot.itemType]?.name);

    const itemData = ITEM_DATA[sourceSlot.itemType];
    if (!itemData.rocketPart) {
      console.log('Item is not a rocket part:', sourceSlot.itemType);
      return;
    }

    // Check if the part would fit within the tower height
    const partHeightUnits = itemData.rocketPart.heightUnits;
    if (nextSlotIndex + partHeightUnits > this.currentLaunchPad.segmentCount) {
      console.log(`Part does not fit - need ${nextSlotIndex + partHeightUnits} segments, have ${this.currentLaunchPad.segmentCount}`);
      return;
    }

    console.log('Attempting to add rocket part...');
    // Try to add the part using the callback
    if (this.onAddRocketPartCallback) {
      const success = await this.onAddRocketPartCallback(this.currentLaunchPad, sourceSlot.itemType);
      console.log('Add rocket part result:', success);
      if (success) {
        this.inventory.removeItem(sourceSlot.itemType, 1);
        this.updateUI();
        this.notifyChanges();
      }
    } else {
      console.log('No onAddRocketPartCallback set!');
    }
  }

  /**
   * Validate the rocket configuration
   * Returns validation result with any errors
   */
  private validateRocket(launchPad: PlacedLaunchPad): RocketValidationResult {
    // One set of stack rules for the pad, docking and refits (rocket-refit)
    const errors = stackProblems(launchPad.rocketParts.map(p => p.itemType));
    return { isValid: errors.length === 0, errors };
  }

  private handleBoardRocket(): void {
    if (!this.currentLaunchPad) return;

    // Validate the rocket configuration
    const validation = this.validateRocket(this.currentLaunchPad);

    if (!validation.isValid) {
      // Show validation errors (they're already displayed in the UI)
      console.log('Cannot board rocket:', validation.errors);
      return;
    }

    // Rocket is valid - proceed with boarding
    console.log('Boarding rocket!');

    // Save reference before closing (close() sets currentLaunchPad to null)
    const launchPadRef = this.currentLaunchPad;

    // Close ALL menus (including inventory/crafting) before boarding
    if (this.onCloseAllMenusCallback) {
      this.onCloseAllMenusCallback();
    } else {
      // Fallback: just close this UI
      this.close();
    }

    // Trigger the board rocket callback
    if (this.onBoardRocketCallback && launchPadRef) {
      this.onBoardRocketCallback(launchPadRef);
    }
  }

  private addStyles(): void {
    const styleId = 'launchpad-ui-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .launchpad-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0 15px;
        border-left: 1px solid #444;
        margin-left: 15px;
        min-width: 200px;
      }

      /* Two columns under the title: the stack, and the rocket's controls */
      .launchpad-body {
        display: flex;
        align-items: flex-start;
        gap: 14px;
      }
      .launchpad-stack-col {
        display: flex;
        flex-direction: column;
        align-items: center;
      }
      .launchpad-control-col {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        width: 200px;
      }

      .launchpad-section h3 {
        font-size: 14px;
        color: #FF6600;
        margin-bottom: 10px;
        font-family: 'Courier New', monospace;
        text-shadow: 0 0 5px rgba(255, 102, 0, 0.3);
      }

      .launchpad-status {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 4px;
        margin-bottom: 10px;
        background: rgba(100, 60, 20, 0.3);
        border: 1px solid #664422;
      }

      .launchpad-status .status-text {
        font-size: 12px;
        color: #FFAA66;
        font-family: 'Courier New', monospace;
      }

      .launchpad-columns {
        background: #0a0a0a;
        border: 2px solid #333;
        border-radius: 8px;
        padding: 10px;
        margin-bottom: 10px;
      }

      .launchpad-column-header {
        display: flex;
        justify-content: space-around;
        margin-bottom: 8px;
        padding-bottom: 5px;
        border-bottom: 1px solid #333;
      }

      .launchpad-column-header .column-label {
        font-size: 11px;
        color: #888;
        font-family: 'Courier New', monospace;
      }

      .launchpad-slots {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .launchpad-slot-row {
        display: flex;
        gap: 10px;
        justify-content: center;
      }

      .launchpad-slot {
        width: 40px;
        height: 40px;
        background: #1a1a1a;
        border: 2px solid #333;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        position: relative;
        transition: all 0.2s;
      }

      .launchpad-slot:hover {
        border-color: #555;
        background: #252525;
      }

      .launchpad-slot.drag-over {
        border-color: #88ff88;
        background: #2a4a2a;
        box-shadow: 0 0 8px rgba(100, 255, 100, 0.4);
      }

      .launchpad-engine-section {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 10px;
        padding: 8px;
        background: #0a0a0a;
        border: 2px solid #333;
        border-radius: 8px;
      }

      .launchpad-engine-section .engine-label {
        font-size: 12px;
        color: #888;
        font-family: 'Courier New', monospace;
      }

      .launchpad-slot.engine-slot {
        width: 48px;
        height: 48px;
      }

      .launchpad-slot.engine-slot.filled {
        background: linear-gradient(180deg, #4a3a2a 0%, #3a2a1a 100%);
        border-color: #AA6644;
      }

      .launchpad-slot.filled {
        background: #2a3a2a;
        border-color: #4a6a4a;
      }

      .launchpad-slot.segment-slot.filled {
        background: linear-gradient(180deg, #3a3a3a 0%, #2a2a2a 100%);
        border-color: #666;
      }

      .launchpad-slot.rocket-slot.filled {
        background: linear-gradient(180deg, #4a3a2a 0%, #3a2a1a 100%);
        border-color: #886644;
      }

      .launchpad-slot.disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      .launchpad-slot img {
        width: 32px;
        height: 32px;
        image-rendering: pixelated;
      }

      .launchpad-equipment {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px 10px;
        margin-bottom: 10px;
        padding: 8px;
        background: rgba(29, 43, 83, 0.6);
        border: 1px solid #29ADFF;
        border-radius: 4px;
      }

      .launchpad-equipment .equip-label {
        color: #aaa;
        font-size: 12px;
      }

      .launchpad-equip-row {
        display: flex;
        gap: 4px;
      }

      .launchpad-equip-summary {
        flex-basis: 100%;
        font-size: 11px;
        color: #3ee0ff;
        font-family: 'Courier New', monospace;
      }

      .launchpad-slot .slot-count {
        position: absolute;
        bottom: 1px;
        right: 3px;
        font-size: 11px;
        color: #FFF1E8;
        text-shadow: 1px 1px 0 #000;
        font-family: 'Courier New', monospace;
      }

      .launchpad-slot .slot-number {
        position: absolute;
        bottom: 2px;
        right: 4px;
        font-size: 10px;
        color: #666;
        font-family: 'Courier New', monospace;
      }

      .launchpad-stats {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 2px 12px;
        margin-bottom: 8px;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        color: #AAA;
      }

      .launchpad-stats .stat {
        display: flex;
        justify-content: space-between;
        gap: 6px;
      }

      .launchpad-stats .stat b {
        color: #3EE0FF;
      }

      .launchpad-stats .stat.warn b,
      .launchpad-stats .stat-note {
        color: #FF004D;
      }

      .launchpad-stats .stat-note {
        grid-column: 1 / 3;
        text-align: center;
      }

      .launchpad-stats .stat-modes {
        grid-column: 1 / 3;
        margin-top: 4px;
        border-top: 1px solid #333;
        padding-top: 4px;
      }
      .launchpad-stats .stat-modes-title { color: #888; margin-bottom: 2px; }
      .launchpad-stats .stat-mode {
        display: grid;
        grid-template-columns: 1fr 1fr;
        column-gap: 8px;
        padding: 2px 4px;
        margin-top: 2px;
        border-radius: 3px;
        cursor: pointer;
      }
      .launchpad-stats .stat-mode:hover { background: #2a2a2a; }
      .launchpad-stats .stat-mode.active { background: #1f3a2a; outline: 1px solid #4CAF50; }
      .launchpad-stats .stat-mode span { grid-column: 1 / 3; }
      .launchpad-stats .stat-mode b { color: #3EE0FF; white-space: nowrap; }
      .launchpad-stats .stat-mode b.warn { color: #FF004D; }

      .launchpad-btn.small {
        padding: 6px 14px;
        font-size: 12px;
      }

      .launchpad-controls {
        display: flex;
        justify-content: center;
        gap: 10px;
        margin-bottom: 10px;
      }

      .launchpad-btn {
        background: linear-gradient(180deg, #444 0%, #333 100%);
        border: 2px solid #555;
        border-radius: 6px;
        color: #DDD;
        padding: 10px 24px;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.2s;
        font-family: 'Courier New', monospace;
        font-weight: bold;
      }

      .launchpad-btn:hover:not(:disabled) {
        background: linear-gradient(180deg, #555 0%, #444 100%);
        border-color: #666;
      }

      .launchpad-btn:active:not(:disabled) {
        transform: translateY(1px);
      }

      .launchpad-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .launchpad-btn.ready {
        background: linear-gradient(180deg, #5a4a2a 0%, #4a3a1a 100%);
        border-color: #8a6a3a;
        color: #FFCC66;
        animation: pulse-glow 2s infinite;
      }

      @keyframes pulse-glow {
        0%, 100% { box-shadow: 0 0 5px rgba(255, 204, 102, 0.3); }
        50% { box-shadow: 0 0 15px rgba(255, 204, 102, 0.6); }
      }

      .launchpad-hint {
        text-align: center;
      }

      .launchpad-hint p {
        font-size: 10px;
        color: #666;
        margin: 3px 0;
      }

      .launchpad-validation {
        width: 100%;
        padding: 8px;
        margin-bottom: 10px;
        border-radius: 4px;
        background: rgba(40, 40, 40, 0.8);
        border: 1px solid #444;
      }

      .launchpad-validation.valid {
        background: rgba(40, 80, 40, 0.8);
        border-color: #4a8a4a;
      }

      .launchpad-validation.invalid {
        background: rgba(80, 40, 40, 0.8);
        border-color: #8a4a4a;
      }

      .launchpad-validation .validation-message {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 11px;
        font-family: 'Courier New', monospace;
      }

      .launchpad-validation .validation-message .valid {
        color: #88ff88;
        text-align: center;
      }

      .launchpad-validation .validation-message .error {
        color: #ff8888;
      }

      .launchpad-validation .validation-message .hint {
        color: #888;
        text-align: center;
        font-style: italic;
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

  public open(launchPad: PlacedLaunchPad): void {
    this.currentLaunchPad = launchPad;
    this.isOpen = true;

    if (this.launchPadSectionElement) {
      this.launchPadSectionElement.style.display = 'flex';
    }

    // Open the full inventory menu
    if (this.onOpenInventoryCallback) {
      this.onOpenInventoryCallback();
    }

    this.updateUI();
  }

  public close(): void {
    this.isOpen = false;
    this.currentLaunchPad = null;

    if (this.launchPadSectionElement) {
      this.launchPadSectionElement.style.display = 'none';
    }

    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }

  public isMenuOpen(): boolean {
    return this.isOpen;
  }

  public getCurrentLaunchPad(): PlacedLaunchPad | null {
    return this.currentLaunchPad;
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

  /** Public so a refuel / cargo change elsewhere can refresh the readout */
  public refresh(): void {
    this.updateUI();
  }

  // Told when the player picks the engine mode the rocket launches in
  private onEngineModeCallback: ((pad: PlacedLaunchPad) => void) | null = null;
  public setOnEngineModeCallback(callback: (pad: PlacedLaunchPad) => void): void {
    this.onEngineModeCallback = callback;
  }

  /**
   * The equipment slots (ROCKET_CONFIG.EQUIPMENT): one cell per slot the
   * stack gives, with the item's icon and count, and what it all gives
   */
  private updateEquipment(): void {
    if (!this.equipRow || !this.currentLaunchPad) return;
    const slots = this.currentLaunchPad.equipment;
    if (this.equipRow.children.length !== slots.length) {
      this.equipRow.innerHTML = '';
      slots.forEach((_, i) => {
        const cell = document.createElement('div');
        cell.className = 'launchpad-slot equip-slot';
        cell.dataset.equipSlot = String(i);
        cell.innerHTML = '<img style="display:none;" draggable="false"><span class="slot-count"></span>';
        cell.addEventListener('click', () => this.takeEquipment(i));
        cell.addEventListener('dragover', (e) => {
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
          cell.classList.add('drag-over');
        });
        cell.addEventListener('dragleave', () => cell.classList.remove('drag-over'));
        cell.addEventListener('drop', (e) => {
          e.preventDefault();
          cell.classList.remove('drag-over');
          const from = parseInt(e.dataTransfer?.getData('text/plain') ?? '', 10);
          if (!isNaN(from)) this.fitFromInventory(from);
        });
        this.equipRow!.appendChild(cell);
      });
    }
    slots.forEach((slot, i) => {
      const cell = this.equipRow!.children[i] as HTMLElement;
      const img = cell.querySelector('img') as HTMLImageElement;
      const count = cell.querySelector('.slot-count') as HTMLElement;
      const filled = slot.itemType !== ItemType.NONE && slot.quantity > 0;
      cell.classList.toggle('filled', filled);
      if (filled) {
        img.src = getAssetPath(ITEM_DATA[slot.itemType].texture);
        img.style.display = 'block';
        count.textContent = slot.quantity > 1 ? String(slot.quantity) : '';
        cell.title = `${ITEM_DATA[slot.itemType].name}: ${equipmentLabel(slot.itemType, slot.quantity)} (click to take out)`;
      } else {
        img.style.display = 'none';
        count.textContent = '';
        cell.title = 'Equipment slot - drop a parachute, solar array or battery pack';
      }
    });
    if (this.equipSummary) {
      this.equipSummary.textContent = slots.length === 0 ? 'Needs a command module' : equipmentSummary(slots);
    }
  }

  /** Fit the equipment in one of the player's slots (hotbar or bag) into the rocket */
  public fitFromInventory(inventorySlot: number): boolean {
    const pad = this.currentLaunchPad;
    const from = this.inventory?.getSlot(inventorySlot);
    if (!pad || !from || from.itemType === ItemType.NONE) return false;
    if (!isEquipment(from.itemType)) {
      showToast('Only a parachute, solar array or battery pack fits there', { duration: 2500 });
      return false;
    }
    if (fitEquipment(pad.equipment, from) <= 0) {
      showToast('The equipment slots are full', { duration: 2000 });
      return false;
    }
    this.afterEquipmentChange(pad);
    return true;
  }

  /** Take an equipment slot's items back to the inventory (hotbar first) */
  public takeEquipment(index: number): boolean {
    const pad = this.currentLaunchPad;
    const slot = pad?.equipment[index];
    if (!pad || !slot || slot.itemType === ItemType.NONE || !this.inventory) return false;
    const left = this.inventory.addItem(slot.itemType, slot.quantity);
    if (left === slot.quantity) return false;
    slot.quantity = left;
    if (left <= 0) slot.itemType = ItemType.NONE;
    this.afterEquipmentChange(pad);
    return true;
  }

  private afterEquipmentChange(pad: PlacedLaunchPad): void {
    this.onEquipmentChangedCallback?.(pad);
    this.updateUI();
    this.notifyChanges();
  }

  /** The rocket's fuel, delta-v, TWR here and cargo space */
  private updateStats(): void {
    if (!this.statsElement || !this.currentLaunchPad) return;
    const pad = this.currentLaunchPad;
    const types = pad.rocketParts.map(p => p.itemType);
    const mode = validEngineMode(types, pad.engineMode ?? null);
    const stats = computeRocketStats(types, cargoMass(pad.cargo), mode, pad.equipment);
    const hasRocket = types.length > 0;
    if (this.refuelBtn) this.refuelBtn.disabled = !hasRocket || stats.fuelCapacity <= 0;
    if (this.cargoBtn) this.cargoBtn.disabled = stats.cargoSlots <= 0;
    if (!hasRocket) {
      this.statsElement.innerHTML = '';
      return;
    }
    const fuel = pad.fuel ?? stats.fuelCapacity;
    const gravity = this.gravityLookup ? this.gravityLookup(pad) : 1;
    // Lift-off: the bottom stage's engines lift the whole rocket (rocket-staging)
    const staged = stagedStats(types, cargoMass(pad.cargo), mode, pad.equipment);
    const twr = surfaceTWR({ ...stats, thrust: staged.stages[0]?.thrust ?? stats.thrust }, gravity, fuel);
    const twrText = Number.isFinite(twr) ? twr.toFixed(2) : '-';
    const used = pad.cargo.filter(sl => sl.itemType !== ItemType.NONE).length;
    const dv = stagedDeltaVWith(types, cargoMass(pad.cargo), mode, pad.equipment, fuel);
    this.statsElement.innerHTML = `
      <div class="stat"><span>Fuel</span><b>${Math.round(fuel)}/${stats.fuelCapacity}</b></div>
      <div class="stat"><span>dV</span><b>${Math.round(dv)} m/s</b></div>
      ${staged.stages.length > 1 ? `<div class="stat"><span>Stages</span><b>${staged.stages.map(st => Math.round(st.deltaV)).join(' + ')}</b></div>` : ''}
      <div class="stat ${twr < 1 ? 'warn' : ''}"><span>TWR</span><b>${twrText}</b></div>
      <div class="stat"><span>Cargo</span><b>${used}/${stats.cargoSlots}</b></div>
      <div class="stat"><span>Power</span><b>${Math.round(stats.batteryWh / 1000)} kWh</b></div>
      ${stats.solarW > 0 ? `<div class="stat"><span>Solar</span><b>${Math.round(stats.solarW / 1000)} kW</b></div>` : ''}
      ${stats.chutes > 0 ? `<div class="stat"><span>Chutes</span><b>${stats.chutes}</b></div>` : ''}
      <div class="stat"><span>Mass</span><b>${Math.round(stats.dryMass)} kg</b></div>
      <div class="stat"><span>Tier</span><b>${stats.tier}</b></div>
      ${twr < 1 && stats.thrust > 0 ? '<div class="stat-note">Too heavy to lift off here</div>' : ''}
      ${stats.problems.map(p => `<div class="stat-note">${p}</div>`).join('')}
      ${this.modeRows(types, pad, fuel, gravity, mode)}
    `;
    // Picking a row sets the mode the rocket launches in
    this.statsElement.querySelectorAll<HTMLElement>('[data-engine-mode]').forEach(row => {
      row.addEventListener('click', () => {
        const v = row.dataset.engineMode!;
        pad.engineMode = v === 'all' ? null : Number(v) as ItemType;
        this.onEngineModeCallback?.(pad);
        this.updateStats();
      });
    });
  }

  /**
   * One row per engine mode (design 6b) when the stack has more than one
   * engine type: its delta-v and TWR here, so a player sees which engine
   * lifts and which cruises. The highlighted row is the launch mode.
   */
  private modeRows(types: ItemType[], pad: PlacedLaunchPad, fuel: number, gravity: number, current: ItemType | null): string {
    const modes = engineModes(types);
    if (modes.length < 2) return '';
    const rows = modes.map(m => {
      const s = computeRocketStats(types, cargoMass(pad.cargo), m, pad.equipment);
      const twr = surfaceTWR(s, gravity, fuel);
      const key = m == null ? 'all' : String(m);
      return `<div class="stat-mode${m === current ? ' active' : ''}" data-engine-mode="${key}" title="Launch in this mode">
        <span>${engineModeLabel(m)}</span><b>${Math.round(deltaVWith(s, fuel))} m/s</b><b class="${twr < 1 ? 'warn' : ''}">TWR ${Number.isFinite(twr) ? twr.toFixed(2) : '-'}</b></div>`;
    }).join('');
    return `<div class="stat-modes"><div class="stat-modes-title">Engine modes (G in flight)</div>${rows}</div>`;
  }

  private updateUI(): void {
    if (!this.launchPadSectionElement || !this.currentLaunchPad) return;

    const segmentCount = this.currentLaunchPad.segmentCount;

    // Update status
    if (this.statusElement) {
      const statusText = this.statusElement.querySelector('.status-text');
      if (statusText) {
        const pad = this.currentLaunchPad;
        statusText.textContent = pad.isComplete
          ? `Tower Height: ${segmentCount}/${this.MAX_HEIGHT}`
          : `Pad: ${pad.hexes.size} block${pad.hexes.size === 1 ? '' : 's'} - needs ${ROCKET_CONFIG.PAD_BLOCKS_PER_TOWER} (a middle hex with a full ring) for a tower and rocket`;
      }
    }

    // Update segment slots
    for (let i = 0; i < this.MAX_HEIGHT; i++) {
      const slot = this.segmentSlots[i];
      if (!slot) continue;

      const img = slot.querySelector('img') as HTMLImageElement;

      if (i < segmentCount) {
        // Filled slot
        slot.classList.add('filled');
        slot.classList.remove('disabled');
        if (img) {
          img.src = getAssetPath(ITEM_DATA[ItemType.LAUNCH_PAD_SEGMENT].texture);
          img.style.display = 'block';
        }
      } else if (i === segmentCount) {
        // Next available slot
        slot.classList.remove('filled', 'disabled');
        if (img) img.style.display = 'none';
      } else {
        // Unavailable slot (above current + 1)
        slot.classList.remove('filled');
        slot.classList.add('disabled');
        if (img) img.style.display = 'none';
      }
    }

    // Update rocket slots based on rocketParts array
    // Parts can span multiple slots based on their heightUnits
    const rocketParts = this.currentLaunchPad.rocketParts;

    // Build a map of which slots are occupied by which parts
    // Also track which slot is the "start" slot for each part (where we show the image)
    const slotToPartMap: Map<number, typeof rocketParts[0]> = new Map();
    const partStartSlots: Set<number> = new Set();
    let currentSlot = 0;
    for (const part of rocketParts) {
      const partData = ITEM_DATA[part.itemType].rocketPart;
      const heightUnits = partData?.heightUnits ?? 1;
      // Mark the start slot (where the image should appear)
      partStartSlots.add(currentSlot);
      // Mark all slots this part occupies
      for (let h = 0; h < heightUnits; h++) {
        slotToPartMap.set(currentSlot + h, part);
      }
      currentSlot += heightUnits;
    }

    // Next available slot is after all occupied slots
    const nextAvailableSlot = this.getNextAvailableHeightSlot();

    for (let i = 0; i < this.MAX_HEIGHT; i++) {
      const slot = this.rocketSlots[i];
      if (!slot) continue;

      const img = slot.querySelector('img') as HTMLImageElement;

      // Check if there's a rocket part occupying this slot
      const partAtSlot = slotToPartMap.get(i);

      // Check if this slot is part of the top part (can be dragged out)
      const topPart = rocketParts.length > 0 ? rocketParts[rocketParts.length - 1] : null;
      let isTopPartSlot = false;
      if (topPart) {
        const topPartData = ITEM_DATA[topPart.itemType].rocketPart;
        const topPartHeightUnits = topPartData?.heightUnits ?? 1;
        const topPartStartSlot = nextAvailableSlot - topPartHeightUnits;
        isTopPartSlot = i >= topPartStartSlot && i < nextAvailableSlot;
      }

      if (partAtSlot) {
        // Filled rocket slot with a part
        slot.classList.add('filled');
        slot.classList.remove('disabled');
        // Make the slot draggable only if it's part of the top part
        slot.draggable = isTopPartSlot;
        if (img) {
          // Only show image in the start slot of the part, not in continuation slots
          if (partStartSlots.has(i)) {
            const partItemData = ITEM_DATA[partAtSlot.itemType];
            img.src = getAssetPath(partItemData.texture);
            img.style.display = 'block';
          } else {
            // Continuation slot - show as filled but no image
            img.style.display = 'none';
          }
        }
      } else if (i < segmentCount && i === nextAvailableSlot) {
        // Available rocket slot (within segment height, next slot to fill)
        slot.classList.remove('filled', 'disabled');
        slot.draggable = false;
        if (img) img.style.display = 'none';
      } else {
        // Unavailable (above segment height or not the next slot)
        slot.classList.remove('filled');
        slot.classList.add('disabled');
        slot.draggable = false;
        if (img) img.style.display = 'none';
      }
    }

    // Update engine/rocket parts slot
    if (this.engineSlot) {
      const img = this.engineSlot.querySelector('img') as HTMLImageElement;
      const rocketParts = this.currentLaunchPad.rocketParts;

      if (rocketParts.length > 0) {
        // Show the top rocket part
        const topPart = rocketParts[rocketParts.length - 1];
        const partItemData = ITEM_DATA[topPart.itemType];
        this.engineSlot.classList.add('filled');
        this.engineSlot.classList.remove('disabled');
        if (img) {
          img.src = getAssetPath(partItemData.texture);
          img.style.display = 'block';
        }
        // Update tooltip/label to show parts count
        const label = this.launchPadSectionElement?.querySelector('.engine-label');
        if (label) {
          label.textContent = `Parts: ${rocketParts.length}`;
        }
      } else if (segmentCount > 0) {
        // Can place parts (has at least 1 segment)
        this.engineSlot.classList.remove('filled', 'disabled');
        if (img) img.style.display = 'none';
        const label = this.launchPadSectionElement?.querySelector('.engine-label');
        if (label) {
          label.textContent = 'Parts:';
        }
      } else {
        // Can't place parts yet (no segments)
        this.engineSlot.classList.remove('filled');
        this.engineSlot.classList.add('disabled');
        if (img) img.style.display = 'none';
        const label = this.launchPadSectionElement?.querySelector('.engine-label');
        if (label) {
          label.textContent = 'Parts:';
        }
      }
    }

    this.updateStats();
    this.updateEquipment();

    // Validate rocket and update UI
    const validation = this.validateRocket(this.currentLaunchPad);

    // Update validation message
    if (this.validationMessageElement) {
      const messageEl = this.validationMessageElement.querySelector('.validation-message');
      if (messageEl) {
        if (validation.isValid) {
          messageEl.innerHTML = '<span class="valid">Rocket ready for launch!</span>';
          this.validationMessageElement.classList.add('valid');
          this.validationMessageElement.classList.remove('invalid');
        } else if (rocketParts.length > 0) {
          // Only show errors if they have at least one part
          messageEl.innerHTML = validation.errors.map(e => `<span class="error">${e}</span>`).join('');
          this.validationMessageElement.classList.add('invalid');
          this.validationMessageElement.classList.remove('valid');
        } else {
          // No parts yet, show hint
          messageEl.innerHTML = '<span class="hint">Add rocket parts to build your rocket</span>';
          this.validationMessageElement.classList.remove('valid', 'invalid');
        }
      }
    }

    // Update board button - only enable when rocket is valid
    if (this.boardRocketBtn) {
      this.boardRocketBtn.disabled = !validation.isValid;
      if (validation.isValid) {
        this.boardRocketBtn.classList.add('ready');
      } else {
        this.boardRocketBtn.classList.remove('ready');
      }
    }
  }
}
