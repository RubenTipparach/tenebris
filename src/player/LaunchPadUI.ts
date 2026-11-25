import { ROCKET_CONFIG } from '../config/RocketConfig';
import { PlacedLaunchPad } from '../planet/LaunchPad';
import { MenuManager } from './MenuManager';
import { Inventory, ItemType, ITEM_DATA } from './Inventory';
import { getAssetPath } from '../utils/assetPath';
import { showToast } from '../utils/toast';
import { stashUsed } from '../rocket/CarryRules';
import { RefitOp, dropOp, padEditProblem, partAtSlot, partStartSlots, stackAfter, stackUnits } from '../rocket/Refit';
import { partTooltipLines, stageOfPart, stagesOf, computeRocketStats, cargoMass, deltaVWith, stagedStats, stagedDeltaVWith, stackProblems, surfaceTWR, engineModes, engineModeLabel, validEngineMode, fitEquipment, isEquipment, equipmentLabel, equipmentSummary } from '../rocket/RocketPerformance';

// Drag data of a part picked up off the stack: the prefix and its index
const ROCKET_DRAG_PREFIX = 'rocket:';

/** A slot's hover tooltip (the shared .item-tooltip look), or none */
function setSlotTooltip(slot: HTMLElement, text: string | null): void {
  let tip = slot.querySelector('.item-tooltip') as HTMLElement | null;
  if (!text) {
    tip?.remove();
    return;
  }
  if (!tip) {
    tip = document.createElement('span');
    tip.className = 'item-tooltip';
    slot.appendChild(tip);
  }
  tip.textContent = text;
}

// Rocket validation result
export interface RocketValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * LaunchPadUI - UI for managing launch pad segments and rockets
 *
 * Layout:
 * - Two vertical columns of ROCKET_CONFIG.MAX_STACK_PARTS slots each
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
  // Make the pad's stack this (bottom to top): every add, remove and move
  // goes through it. Resolves with why it can't, or null when done
  private onSetRocketStackCallback: ((pad: PlacedLaunchPad, types: ItemType[]) => Promise<string | null>) | null = null;
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

  // Tower height = most parts a stack holds (one number, ROCKET_CONFIG)
  private readonly MAX_HEIGHT = ROCKET_CONFIG.MAX_STACK_PARTS;

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

  // The pad's stash (openspec pad-stash): what boarders left here
  private stashBtn: HTMLButtonElement | null = null;
  private takeStashBtn: HTMLButtonElement | null = null;
  private onOpenStashCallback: ((pad: PlacedLaunchPad) => void) | null = null;
  private onTakeStashCallback: ((pad: PlacedLaunchPad) => number) | null = null;

  public setOnOpenStashCallback(callback: (pad: PlacedLaunchPad) => void): void {
    this.onOpenStashCallback = callback;
  }

  /** Take all: everything that fits back into the hotbar + bag; returns how many moved */
  public setOnTakeStashCallback(callback: (pad: PlacedLaunchPad) => number): void {
    this.onTakeStashCallback = callback;
  }

  // Told when equipment is fitted or taken out, or a part moves between the
  // stack and the inventory: the pad record and the inventory save
  private onHoldChangedCallback: ((pad: PlacedLaunchPad) => void) | null = null;
  private equipRow: HTMLElement | null = null;
  private equipSummary: HTMLElement | null = null;
  public setOnHoldChangedCallback(callback: (pad: PlacedLaunchPad) => void): void {
    this.onHoldChangedCallback = callback;
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

  public setOnSetRocketStackCallback(callback: (pad: PlacedLaunchPad, types: ItemType[]) => Promise<string | null>): void {
    this.onSetRocketStackCallback = callback;
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
        <button class="launchpad-btn small" id="launchpad-stash-btn" title="What was left here on boarding - only the cargo hold flies">Stash</button>
        <button class="launchpad-btn small" id="launchpad-take-stash-btn" title="Take everything that fits from the stash">Take all</button>
      </div>

      <div class="launchpad-controls">
        <button class="launchpad-btn" id="launchpad-board-btn" disabled>Board Rocket</button>
      </div>

      <div class="launchpad-hint">
        <p>Drag rocket parts from inventory to rocket slots - onto a part to put it in under that one</p>
        <p>Drag a part up or down the stack to move it, or off the stack to take it out</p>
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
    this.stashBtn = document.getElementById('launchpad-stash-btn') as HTMLButtonElement;
    this.takeStashBtn = document.getElementById('launchpad-take-stash-btn') as HTMLButtonElement;
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
    if (!this.currentLaunchPad || this.currentLaunchPad.segmentCount < 1) return;
    // The drag data can't be read during dragover: checked on the drop
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    (e.currentTarget as HTMLElement).classList.add('drag-over');
  }

  /** A part dropped on the Parts slot goes on top of the stack */
  private handleEngineDrop(e: DragEvent): void {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
    const pad = this.currentLaunchPad;
    if (!pad) return;
    const itemType = this.draggedInventoryPart(e);
    if (itemType === null) return;
    void this.applyStackOp({ kind: 'insert', index: pad.rocketParts.length, itemType });
  }

  /** Clicking the Parts slot takes the top part off */
  private handleEngineSlotClick(): void {
    const pad = this.currentLaunchPad;
    if (!pad || pad.rocketParts.length === 0) return;
    void this.applyStackOp({ kind: 'remove', index: pad.rocketParts.length - 1 });
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
    this.stashBtn?.addEventListener('click', () => {
      if (!this.currentLaunchPad || !this.onOpenStashCallback) return;
      this.onOpenStashCallback(this.currentLaunchPad);
    });
    this.takeStashBtn?.addEventListener('click', () => {
      if (!this.currentLaunchPad || !this.onTakeStashCallback) return;
      const left = stashUsed(this.currentLaunchPad.stash);
      const moved = this.onTakeStashCallback(this.currentLaunchPad);
      if (moved === 0 && left > 0) showToast('No room in your inventory', { duration: 2000 });
      this.updateUI();
      this.notifyChanges();
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

        // Can only remove if the rocket's stack doesn't reach this height
        if (stackUnits(this.stackTypes()) > slotIndex) {
          showToast('The rocket stands this high - take a part off first', { duration: 2500 });
        } else {
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
    // Parts are taken out by dragging them off the stack (or clicking the
    // Parts slot for the top one); a click does nothing
  }

  // The stack part being dragged (its index), and whether it was dropped on
  // the stack (a move) rather than off it (taken out)
  private draggingPartIndex: number | null = null;
  private droppedInStack = false;
  // A stack edit is under way (its models load): the next waits for it
  private stackBusy = false;

  private stackTypes(): ItemType[] {
    return this.currentLaunchPad ? this.currentLaunchPad.rocketParts.map(p => p.itemType) : [];
  }

  /** Any part of the stack can be picked up: dropped on the stack it moves, off it it comes out */
  private handleRocketSlotDragStart(e: DragEvent, slotIndex: number): void {
    const index = partAtSlot(this.stackTypes(), slotIndex);
    if (!this.currentLaunchPad || index < 0 || this.stackBusy) {
      e.preventDefault();
      return;
    }
    if (e.dataTransfer) {
      e.dataTransfer.setData('text/plain', `${ROCKET_DRAG_PREFIX}${index}`);
      e.dataTransfer.effectAllowed = 'move';
    }
    this.draggingPartIndex = index;
    this.droppedInStack = false;
  }

  /** A stack part dragged off the stack (anywhere but a rocket slot) comes out into the inventory */
  private handleRocketSlotDragEnd(_e: DragEvent, _slotIndex: number): void {
    const index = this.draggingPartIndex;
    this.draggingPartIndex = null;
    if (index === null || this.droppedInStack) return;
    void this.applyStackOp({ kind: 'remove', index });
  }

  /** The rocket part an inventory drag carries (null: not an inventory slot, or not a part) */
  private draggedInventoryPart(e: DragEvent): ItemType | null {
    const from = parseInt(e.dataTransfer?.getData('text/plain') ?? '', 10);
    const slot = isNaN(from) ? null : this.inventory?.getSlot(from);
    if (!slot || slot.quantity <= 0 || !ITEM_DATA[slot.itemType]?.rocketPart) return null;
    return slot.itemType;
  }

  private handleRocketSlotDragOver(e: DragEvent, slotIndex: number): void {
    const pad = this.currentLaunchPad;
    // Any slot inside the tower: on a part (insert under it / move there) or above the stack (on top)
    if (!pad || pad.segmentCount < 1 || slotIndex >= pad.segmentCount) return;
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    (e.currentTarget as HTMLElement).classList.add('drag-over');
  }

  private handleRocketSlotDrop(e: DragEvent, slotIndex: number): void {
    e.preventDefault();
    (e.currentTarget as HTMLElement).classList.remove('drag-over');
    const pad = this.currentLaunchPad;
    if (!pad || pad.segmentCount < 1) return;
    const data = e.dataTransfer?.getData('text/plain') ?? '';
    const types = this.stackTypes();
    if (data.startsWith(ROCKET_DRAG_PREFIX)) {
      // A part of the stack: it moves (set before any await - dragend follows the drop)
      this.droppedInStack = true;
      const from = parseInt(data.slice(ROCKET_DRAG_PREFIX.length), 10);
      if (isNaN(from)) return;
      void this.applyStackOp(dropOp(types, slotIndex, { from }));
      return;
    }
    const itemType = this.draggedInventoryPart(e);
    if (itemType === null) {
      if (data) showToast('Only rocket parts go in the rocket column', { duration: 2000 });
      return;
    }
    void this.applyStackOp(dropOp(types, slotIndex, { itemType }));
  }

  /**
   * One edit of the stack (openspec rocket-refit's stack ops, the same a
   * refit uses): a part put on comes out of the inventory, one taken off goes
   * back into it, a move only restacks. Refused, with a toast, when the stack
   * would not fit the tower, the cargo / equipment would not fit, or the
   * inventory has no room for a part taken off.
   */
  public async applyStackOp(op: RefitOp): Promise<boolean> {
    const pad = this.currentLaunchPad;
    if (!pad || !this.inventory || !this.onSetRocketStackCallback || this.stackBusy) return false;
    const types = this.stackTypes();
    const problem = padEditProblem(types, op, pad.segmentCount);
    if (problem) {
      showToast(problem, { duration: 2500 });
      return false;
    }
    const putOn = op.kind === 'insert' || op.kind === 'addTop' || op.kind === 'swap' ? op.itemType : null;
    const takenOff = op.kind === 'remove' || op.kind === 'swap' ? types[op.index] : null;
    if (putOn !== null && !this.inventory.hasItem(putOn, 1)) return false;
    if (takenOff !== null && putOn === null && !this.inventory.canAddItem(takenOff, 1)) {
      showToast('No room in your inventory for that part', { duration: 2500 });
      return false;
    }
    this.stackBusy = true;
    try {
      const why = await this.onSetRocketStackCallback(pad, stackAfter(types, op));
      if (why) {
        showToast(why, { duration: 3000 });
        return false;
      }
      if (putOn !== null) this.inventory.removeItem(putOn, 1);
      if (takenOff !== null) this.inventory.addItem(takenOff, 1);
      this.onHoldChangedCallback?.(pad);
      return true;
    } finally {
      this.stackBusy = false;
      if (this.currentLaunchPad === pad) this.updateUI();
      this.notifyChanges();
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

      /* A part of the stack can be picked up; a two-unit part's upper slot
         joins the one below it */
      .launchpad-slot.rocket-slot.filled { cursor: grab; }
      .launchpad-slot.rocket-slot.continuation { border-bottom-style: dashed; }

      /* The shared .item-tooltip (index.html) beside a stack slot: to its
         right, so the column doesn't cover it */
      .launchpad-slot .item-tooltip {
        left: 100%;
        bottom: auto;
        top: 0;
        transform: none;
        margin: 0 0 0 8px;
        z-index: 400;
      }
      .launchpad-slot:hover .item-tooltip { opacity: 1; }

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
    this.onHoldChangedCallback?.(pad);
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
    // The stash is the pad's own, rocket or not
    const stashed = stashUsed(pad.stash);
    if (this.stashBtn) this.stashBtn.textContent = stashed > 0 ? `Stash (${stashed})` : 'Stash';
    if (this.takeStashBtn) this.takeStashBtn.disabled = stashed === 0;
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

    // Rocket slots: one per height unit, a part's icon in its bottom slot.
    // Every part can be dragged (to move it, or off the stack to take it
    // out); a part dropped on a part goes in under it, above the stack on top
    const rocketParts = this.currentLaunchPad.rocketParts;
    const types = rocketParts.map(p => p.itemType);
    const starts = partStartSlots(types);
    const top = stackUnits(types);
    const stages = stagesOf(types, t => t).length;

    for (let i = 0; i < this.MAX_HEIGHT; i++) {
      const slot = this.rocketSlots[i];
      if (!slot) continue;
      const img = slot.querySelector('img') as HTMLImageElement;
      const index = partAtSlot(types, i);
      slot.classList.toggle('continuation', index >= 0 && starts[index] !== i);
      if (index >= 0) {
        const t = types[index];
        slot.classList.add('filled');
        slot.classList.remove('disabled');
        slot.draggable = true;
        if (img) {
          // The icon in the part's bottom slot; the slots above it show it continues
          if (starts[index] === i) {
            img.src = getAssetPath(ITEM_DATA[t].texture);
            img.style.display = 'block';
          } else {
            img.style.display = 'none';
          }
        }
        const stageLine = stages > 1 ? [`Stage ${stageOfPart(types, index)} of ${stages}`] : [];
        setSlotTooltip(slot, [ITEM_DATA[t].name, ...partTooltipLines(t), ...stageLine, 'Drag to move it, or off the stack to take it out'].join('\n'));
      } else if (i < segmentCount && i === top) {
        // The next slot up: a part dropped here goes on top
        slot.classList.remove('filled', 'disabled');
        slot.draggable = false;
        if (img) img.style.display = 'none';
        setSlotTooltip(slot, 'Drop a rocket part here to put it on top,\nor on a part to put it in under that one');
      } else {
        slot.classList.remove('filled');
        slot.classList.add('disabled');
        slot.draggable = false;
        if (img) img.style.display = 'none';
        setSlotTooltip(slot, i >= segmentCount ? 'Add a tower segment to build this high' : null);
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
        setSlotTooltip(this.engineSlot, `Top: ${partItemData.name}\nClick to take it off; drop a part here to put it on top`);
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
