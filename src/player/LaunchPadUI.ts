import { PlacedLaunchPad } from '../planet/LaunchPad';
import { MenuManager } from './MenuManager';
import { Inventory, ItemType, ITEM_DATA } from './Inventory';
import { getAssetPath } from '../utils/assetPath';

/**
 * LaunchPadUI - UI for managing launch pad segments and rockets
 *
 * Layout:
 * - Two vertical columns of 8 slots each
 * - Left column: Launch pad segments (tower height)
 * - Right column: Rocket blocks (must match segment height)
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

  // UI elements
  private segmentSlots: HTMLElement[] = [];
  private rocketSlots: HTMLElement[] = [];
  private boardRocketBtn: HTMLButtonElement | null = null;
  private statusElement: HTMLElement | null = null;

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

  private createUI(): void {
    this.launchPadSectionElement = document.createElement('div');
    this.launchPadSectionElement.id = 'launchpad-section';
    this.launchPadSectionElement.className = 'launchpad-section';

    // Create slot rows (8 rows, 2 columns)
    let slotsHtml = '';
    for (let i = this.MAX_HEIGHT - 1; i >= 0; i--) {
      slotsHtml += `
        <div class="launchpad-slot-row">
          <div class="launchpad-slot segment-slot" id="launchpad-segment-${i}" data-slot="${i}" data-type="segment">
            <img style="display:none;">
            <span class="slot-number">${i + 1}</span>
          </div>
          <div class="launchpad-slot rocket-slot" id="launchpad-rocket-${i}" data-slot="${i}" data-type="rocket">
            <img style="display:none;">
          </div>
        </div>
      `;
    }

    this.launchPadSectionElement.innerHTML = `
      <h3>Launch Pad</h3>

      <div class="launchpad-status" id="launchpad-status">
        <span class="status-text">Tower Height: 0/8</span>
      </div>

      <div class="launchpad-columns">
        <div class="launchpad-column-header">
          <span class="column-label">Segments</span>
          <span class="column-label">Rocket</span>
        </div>
        <div class="launchpad-slots">
          ${slotsHtml}
        </div>
      </div>

      <div class="launchpad-controls">
        <button class="launchpad-btn" id="launchpad-board-btn" disabled>Board Rocket</button>
      </div>

      <div class="launchpad-hint">
        <p>Click segment slots to add/remove tower</p>
        <p>Rocket can only be as tall as the tower</p>
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

    // Setup interactions
    this.setupSlotInteractions();
    this.setupButtonInteractions();

    this.launchPadSectionElement.style.display = 'none';
  }

  private setupSlotInteractions(): void {
    // Segment slots - click to add/remove segments
    for (let i = 0; i < this.MAX_HEIGHT; i++) {
      const slot = this.segmentSlots[i];
      if (slot) {
        slot.addEventListener('click', () => this.handleSegmentSlotClick(i));
      }

      const rocketSlot = this.rocketSlots[i];
      if (rocketSlot) {
        rocketSlot.addEventListener('click', () => this.handleRocketSlotClick(i));
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

  private handleRocketSlotClick(slotIndex: number): void {
    if (!this.currentLaunchPad || !this.inventory) return;

    const maxRocketHeight = this.currentLaunchPad.segmentCount;
    const currentRocketHeight = this.currentLaunchPad.rocketBlocks;

    // Can only place/remove rocket blocks up to segment height
    if (slotIndex >= maxRocketHeight) return;

    if (slotIndex < currentRocketHeight) {
      // Clicking on existing rocket block - remove if it's the top
      if (slotIndex === currentRocketHeight - 1) {
        this.currentLaunchPad.rocketBlocks--;
        // Return rocket block to inventory (we'll need a ROCKET_BLOCK item type later)
        // For now, just decrement
        this.updateUI();
        this.notifyChanges();
      }
    } else if (slotIndex === currentRocketHeight) {
      // Clicking on next empty slot - try to add rocket block
      // For now, rocket blocks are free (will need ROCKET_BLOCK item later)
      this.currentLaunchPad.rocketBlocks++;
      this.updateUI();
      this.notifyChanges();
    }
  }

  private handleBoardRocket(): void {
    if (!this.currentLaunchPad) return;

    // Check if rocket is fully assembled
    if (this.currentLaunchPad.segmentCount > 0 &&
        this.currentLaunchPad.rocketBlocks === this.currentLaunchPad.segmentCount) {
      // TODO: Implement rocket boarding/launch sequence
      console.log('Boarding rocket! (Not yet implemented)');
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

  private updateUI(): void {
    if (!this.launchPadSectionElement || !this.currentLaunchPad) return;

    const segmentCount = this.currentLaunchPad.segmentCount;
    const rocketCount = this.currentLaunchPad.rocketBlocks;

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

    // Update rocket slots
    for (let i = 0; i < this.MAX_HEIGHT; i++) {
      const slot = this.rocketSlots[i];
      if (!slot) continue;

      const img = slot.querySelector('img') as HTMLImageElement;

      if (i < rocketCount) {
        // Filled rocket slot
        slot.classList.add('filled');
        slot.classList.remove('disabled');
        if (img) {
          // TODO: Use proper rocket block texture
          img.src = getAssetPath('/textures/technology/launch_pad_segment.png');
          img.style.display = 'block';
        }
      } else if (i < segmentCount && i === rocketCount) {
        // Available rocket slot (within segment height)
        slot.classList.remove('filled', 'disabled');
        if (img) img.style.display = 'none';
      } else {
        // Unavailable (above segment height or above current rocket + 1)
        slot.classList.remove('filled');
        slot.classList.add('disabled');
        if (img) img.style.display = 'none';
      }
    }

    // Update board button
    if (this.boardRocketBtn) {
      const isReady = segmentCount > 0 && rocketCount === segmentCount;
      this.boardRocketBtn.disabled = !isReady;
      if (isReady) {
        this.boardRocketBtn.classList.add('ready');
      } else {
        this.boardRocketBtn.classList.remove('ready');
      }
    }
  }
}
