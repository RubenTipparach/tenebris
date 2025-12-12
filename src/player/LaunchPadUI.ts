import { PlacedLaunchPad, PlacedRocketPart } from '../planet/LaunchPad';
import { MenuManager } from './MenuManager';
import { Inventory, ItemType, ITEM_DATA, RocketPartType } from './Inventory';
import { getAssetPath } from '../utils/assetPath';

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

  // UI elements
  private segmentSlots: HTMLElement[] = [];
  private rocketSlots: HTMLElement[] = [];
  private engineSlot: HTMLElement | null = null;
  private boardRocketBtn: HTMLButtonElement | null = null;
  private statusElement: HTMLElement | null = null;
  private validationMessageElement: HTMLElement | null = null;

  private readonly MAX_HEIGHT = 8;

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

      <div class="launchpad-completion" id="launchpad-completion" style="display: none;">
        <div class="completion-status">
          <span class="completion-label">Platform Status:</span>
          <span class="completion-value" id="completion-value">Incomplete</span>
        </div>
        <div class="completion-diagram" id="completion-diagram">
          <!-- 10-hex stadium diagram -->
          <div class="hex-row top-row">
            <div class="hex-cell" data-pos="0"></div>
            <div class="hex-cell" data-pos="1"></div>
          </div>
          <div class="hex-row middle-row">
            <div class="hex-cell" data-pos="2"></div>
            <div class="hex-cell rocket-cell" data-pos="3">R</div>
            <div class="hex-cell" data-pos="4"></div>
          </div>
          <div class="hex-row middle-row">
            <div class="hex-cell" data-pos="5"></div>
            <div class="hex-cell tower-cell" data-pos="6">T</div>
            <div class="hex-cell" data-pos="7"></div>
          </div>
          <div class="hex-row bottom-row">
            <div class="hex-cell" data-pos="8"></div>
            <div class="hex-cell" data-pos="9"></div>
          </div>
        </div>
        <div class="completion-hint" id="completion-hint">
          Place launch pad blocks on all 10 hexes
        </div>
      </div>

      <div class="launchpad-status" id="launchpad-status">
        <span class="status-text">Tower Height: 0/8</span>
      </div>

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

      <div class="launchpad-validation" id="launchpad-validation">
        <div class="validation-message"></div>
      </div>

      <div class="launchpad-controls">
        <button class="launchpad-btn" id="launchpad-board-btn" disabled>Board Rocket</button>
      </div>

      <div class="launchpad-hint">
        <p>Drag rocket parts from inventory to rocket slots</p>
        <p>Press E or ESC to close</p>
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
          this.inventory.addItem(removedPart.itemType, 1);
          this.updateUI();
          this.notifyChanges();
        }
      } else if (this.currentLaunchPad.hasRocketEngine && this.onRemoveRocketEngineCallback) {
        // Legacy fallback
        if (this.onRemoveRocketEngineCallback(this.currentLaunchPad)) {
          this.inventory.addItem(ItemType.ROCKET_ENGINE, 1);
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
            this.inventory.addItem(ItemType.LAUNCH_PAD_SEGMENT, 1);
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
  private draggingFromSlot: number = -1;

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
    this.draggingFromSlot = slotIndex;
    console.log(`Started dragging rocket part from slot ${slotIndex}`);
  }

  /**
   * Handle end of drag from a rocket slot
   * If dropped outside valid target, remove the part and add to inventory
   */
  private handleRocketSlotDragEnd(e: DragEvent, _slotIndex: number): void {
    if (!this.draggingRocketPart || !this.currentLaunchPad || !this.inventory) {
      this.draggingRocketPart = false;
      this.draggingFromSlot = -1;
      return;
    }

    // Check if the drop was successful (dropEffect will be 'none' if dropped outside valid target)
    // For drag-out to inventory, we remove the part here
    if (e.dataTransfer?.dropEffect === 'none' || e.dataTransfer?.dropEffect === 'move') {
      // The part was dragged out - remove it and add to inventory
      if (this.onRemoveRocketPartCallback) {
        const removedPart = this.onRemoveRocketPartCallback(this.currentLaunchPad);
        if (removedPart) {
          this.inventory.addItem(removedPart.itemType, 1);
          console.log(`Removed rocket part via drag: ${ITEM_DATA[removedPart.itemType].name}`);
          this.updateUI();
          this.notifyChanges();
        }
      }
    }

    this.draggingRocketPart = false;
    this.draggingFromSlot = -1;
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
    const errors: string[] = [];
    const parts = launchPad.rocketParts;

    if (parts.length === 0) {
      errors.push('No rocket parts installed');
      return { isValid: false, errors };
    }

    // Count parts by type
    const engines: PlacedRocketPart[] = [];
    const fuelTanks: PlacedRocketPart[] = [];
    const commandModules: PlacedRocketPart[] = [];

    for (const part of parts) {
      const partData = ITEM_DATA[part.itemType].rocketPart;
      if (!partData) continue;

      switch (partData.partType) {
        case RocketPartType.ENGINE:
          engines.push(part);
          break;
        case RocketPartType.FUEL_TANK:
          fuelTanks.push(part);
          break;
        case RocketPartType.CAPSULE:
          commandModules.push(part);
          break;
      }
    }

    // Check basic requirements
    if (engines.length === 0) {
      errors.push('Missing: Engine required');
    }

    if (fuelTanks.length === 0) {
      errors.push('Missing: Fuel Tank required');
    }

    if (commandModules.length === 0) {
      errors.push('Missing: Command Module required');
    }

    // Check that engine is at the bottom of the stack (height index 0)
    if (engines.length > 0) {
      const bottomPart = parts[0];
      const bottomPartData = ITEM_DATA[bottomPart.itemType].rocketPart;
      if (!bottomPartData || bottomPartData.partType !== RocketPartType.ENGINE) {
        errors.push('Engine must be at the bottom of the stack');
      }
    }

    // Check engine-specific requirements
    for (const engine of engines) {
      const engineData = ITEM_DATA[engine.itemType].rocketPart;
      if (engineData?.engineRequirements) {
        const reqs = engineData.engineRequirements;

        if (fuelTanks.length < reqs.minFuelTanks) {
          errors.push(`${ITEM_DATA[engine.itemType].name} requires at least ${reqs.minFuelTanks} fuel tank(s)`);
        }

        if (reqs.requiresCommandModule && commandModules.length === 0) {
          errors.push(`${ITEM_DATA[engine.itemType].name} requires a Command Module`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
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
    console.log('Boarding rocket! (Launch sequence not yet implemented)');
    // TODO: Implement rocket boarding/launch sequence
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

      .launchpad-slot .slot-number {
        position: absolute;
        bottom: 2px;
        right: 4px;
        font-size: 10px;
        color: #666;
        font-family: 'Courier New', monospace;
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

      /* Launch pad completion diagram styles */
      .launchpad-completion {
        background: rgba(60, 40, 20, 0.4);
        border: 2px solid #664422;
        border-radius: 8px;
        padding: 10px;
        margin-bottom: 10px;
        text-align: center;
      }

      .launchpad-completion.complete {
        background: rgba(40, 80, 40, 0.4);
        border-color: #448844;
      }

      .completion-status {
        display: flex;
        justify-content: center;
        gap: 8px;
        margin-bottom: 10px;
      }

      .completion-label {
        font-size: 12px;
        color: #888;
        font-family: 'Courier New', monospace;
      }

      .completion-value {
        font-size: 12px;
        font-family: 'Courier New', monospace;
        font-weight: bold;
      }

      .completion-value.incomplete {
        color: #ff8866;
      }

      .completion-value.complete {
        color: #88ff88;
      }

      .completion-diagram {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
        margin-bottom: 8px;
      }

      .hex-row {
        display: flex;
        gap: 2px;
      }

      .hex-row.top-row,
      .hex-row.bottom-row {
        margin-left: 11px;
      }

      .hex-cell {
        width: 20px;
        height: 20px;
        background: #333;
        border: 2px solid #555;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-family: 'Courier New', monospace;
        color: #666;
        transition: all 0.2s;
      }

      .hex-cell.placed {
        background: #4a6a4a;
        border-color: #6a8a6a;
        color: #aaffaa;
      }

      .hex-cell.missing {
        background: #6a4a4a;
        border-color: #8a6a6a;
        animation: pulse-missing 1s infinite;
      }

      @keyframes pulse-missing {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }

      .hex-cell.rocket-cell {
        color: #ffaa66;
        font-weight: bold;
      }

      .hex-cell.tower-cell {
        color: #66aaff;
        font-weight: bold;
      }

      .completion-hint {
        font-size: 10px;
        color: #888;
        font-family: 'Courier New', monospace;
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

  /**
   * Update the completion diagram showing which hexes have been placed
   */
  private updateCompletionDiagram(): void {
    if (!this.launchPadSectionElement || !this.currentLaunchPad) return;

    const completionSection = document.getElementById('launchpad-completion');
    const completionValue = document.getElementById('completion-value');
    const completionHint = document.getElementById('completion-hint');
    const diagram = document.getElementById('completion-diagram');

    if (!completionSection) return;

    // Always show the completion section
    completionSection.style.display = 'block';

    const isComplete = this.currentLaunchPad.isComplete;
    const placedCount = this.currentLaunchPad.placedTiles.size;
    const totalCount = this.currentLaunchPad.allTileIndices.length;

    // Update status text
    if (completionValue) {
      if (isComplete) {
        completionValue.textContent = 'Complete';
        completionValue.classList.remove('incomplete');
        completionValue.classList.add('complete');
      } else {
        completionValue.textContent = `${placedCount}/${totalCount} hexes`;
        completionValue.classList.add('incomplete');
        completionValue.classList.remove('complete');
      }
    }

    // Update completion section class
    if (isComplete) {
      completionSection.classList.add('complete');
    } else {
      completionSection.classList.remove('complete');
    }

    // Update hint text
    if (completionHint) {
      if (isComplete) {
        completionHint.textContent = 'Platform ready for construction';
      } else {
        const remaining = totalCount - placedCount;
        completionHint.textContent = `Place ${remaining} more launch pad block${remaining !== 1 ? 's' : ''}`;
      }
    }

    // Update diagram cells
    // The diagram positions map to allTileIndices:
    // Position 0-1: top row (2 hexes)
    // Position 2-4: middle row with rocket (3 hexes), pos 3 = rocket
    // Position 5-7: middle row with tower (3 hexes), pos 6 = tower
    // Position 8-9: bottom row (2 hexes)
    if (diagram) {
      const cells = diagram.querySelectorAll('.hex-cell');
      cells.forEach((cell, posIndex) => {
        // Map diagram position to tile index in allTileIndices
        // The mapping depends on how allTileIndices is constructed
        // For now, assume they match in order (this may need adjustment)
        const tileIndex = this.currentLaunchPad!.allTileIndices[posIndex];

        // Check if this tile has a block placed
        const isPlaced = this.currentLaunchPad!.placedTiles.has(tileIndex);

        cell.classList.remove('placed', 'missing');
        if (isPlaced) {
          cell.classList.add('placed');
        } else {
          cell.classList.add('missing');
        }
      });
    }
  }

  private updateUI(): void {
    if (!this.launchPadSectionElement || !this.currentLaunchPad) return;

    const segmentCount = this.currentLaunchPad.segmentCount;

    // Update completion status and diagram
    this.updateCompletionDiagram();

    // Update status
    if (this.statusElement) {
      const statusText = this.statusElement.querySelector('.status-text');
      if (statusText) {
        statusText.textContent = `Tower Height: ${segmentCount}/${this.MAX_HEIGHT}`;
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
        } else if (partCount > 0) {
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
