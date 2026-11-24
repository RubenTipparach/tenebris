import { LandedRocket } from './LandedRocket';
import { MenuManager } from '../player/MenuManager';
import { computeRocketStats, stackItemTypes, equipmentLabel, equipmentSummary } from './RocketPerformance';
import { ITEM_DATA, ItemType } from '../player/Inventory';
import { getAssetPath } from '../utils/assetPath';
import { ROCKET_CONFIG } from '../config/RocketConfig';
import type { RefitOp } from './Refit';

/**
 * Simple UI for interacting with a landed rocket
 * Shows fuel level and allows boarding
 */
export class LandedRocketUI {
  private container: HTMLDivElement;
  private fuelDisplay: HTMLDivElement;
  private fuelBar: HTMLDivElement;
  private chargeLine: HTMLDivElement;
  private equipRow: HTMLDivElement;
  private equipSummary: HTMLDivElement;
  private boardButton: HTMLButtonElement;
  private closeButton: HTMLButtonElement;

  private currentRocket: LandedRocket | null = null;
  private isOpen: boolean = false;

  // Callbacks
  private onBoardCallback: ((rocket: LandedRocket) => void) | null = null;
  private onCloseCallback: (() => void) | null = null;
  private onRefuelCallback: ((rocket: LandedRocket) => void) | null = null;
  private onCargoCallback: ((rocket: LandedRocket) => void) | null = null;
  private onEquipmentCallback: ((rocket: LandedRocket) => void) | null = null;

  /** How the Equipment row opens the equipment slots beside the hotbar + bag */
  public setOnEquipmentCallback(callback: (rocket: LandedRocket) => void): void {
    this.onEquipmentCallback = callback;
  }

  public setOnRefuelCallback(callback: (rocket: LandedRocket) => void): void {
    this.onRefuelCallback = callback;
  }

  public setOnCargoCallback(callback: (rocket: LandedRocket) => void): void {
    this.onCargoCallback = callback;
  }

  constructor() {
    this.container = document.createElement('div');
    this.container.id = 'landed-rocket-ui';
    this.container.innerHTML = `
      <div class="landed-rocket-panel">
        <div class="landed-rocket-header">
          <h3>Landed Rocket</h3>
          <button class="close-btn">&times;</button>
        </div>
        <div class="landed-rocket-content">
          <div class="fuel-section">
            <label>Fuel Level</label>
            <div class="fuel-bar-container">
              <div class="fuel-bar"></div>
            </div>
            <span class="fuel-percent">0%</span>
            <div class="charge-line"></div>
          </div>
          <div class="equip-section">
            <label>Equipment</label>
            <div class="equip-row" title="Click to fit or take out equipment"></div>
            <div class="equip-summary"></div>
          </div>
          <div class="button-section">
            <button class="board-btn">Board Rocket</button>
          </div>
          <div class="button-section side-buttons">
            <button class="side-btn refuel-btn">Refuel</button>
            <button class="side-btn cargo-btn">Cargo</button>
          </div>
          <div class="button-section side-buttons">
            <button class="side-btn dock-btn" title="Move this rocket onto the free launch pad nearby">Dock on pad</button>
            <button class="side-btn refit-btn" title="Change the stack here (uses a refit kit; a mk2 is kept)">Refit</button>
          </div>
          <div class="refit-section" hidden>
            <label>Refit - bottom to top</label>
            <div class="refit-stack"></div>
            <button class="side-btn refit-add">Add on top</button>
            <div class="refit-picker" hidden></div>
            <div class="refit-msg"></div>
          </div>
        </div>
      </div>
    `;

    this.addStyles();

    // Get element references
    this.fuelDisplay = this.container.querySelector('.fuel-percent') as HTMLDivElement;
    this.fuelBar = this.container.querySelector('.fuel-bar') as HTMLDivElement;
    this.chargeLine = this.container.querySelector('.charge-line') as HTMLDivElement;
    this.equipRow = this.container.querySelector('.equip-row') as HTMLDivElement;
    this.equipSummary = this.container.querySelector('.equip-summary') as HTMLDivElement;
    this.boardButton = this.container.querySelector('.board-btn') as HTMLButtonElement;
    this.closeButton = this.container.querySelector('.close-btn') as HTMLButtonElement;

    // Set up event listeners
    this.boardButton.addEventListener('click', () => this.handleBoard());
    (this.container.querySelector('.refuel-btn') as HTMLButtonElement).addEventListener('click', () => {
      if (!this.currentRocket || !this.onRefuelCallback) return;
      this.onRefuelCallback(this.currentRocket);
      this.updateDisplay();
    });
    (this.container.querySelector('.cargo-btn') as HTMLButtonElement).addEventListener('click', () => {
      this.handOver(this.onCargoCallback);
    });
    // The equipment row opens the equipment slots beside the hotbar + bag,
    // where items are fitted and taken out (the cargo hold's panel, filtered)
    this.equipRow.addEventListener('click', () => this.handOver(this.onEquipmentCallback));
    // Docking and refits (rocket-refit)
    this.dockButton = this.container.querySelector('.dock-btn') as HTMLButtonElement;
    this.refitButton = this.container.querySelector('.refit-btn') as HTMLButtonElement;
    this.refitSection = this.container.querySelector('.refit-section') as HTMLDivElement;
    this.refitStack = this.container.querySelector('.refit-stack') as HTMLDivElement;
    this.refitPicker = this.container.querySelector('.refit-picker') as HTMLDivElement;
    this.refitMsg = this.container.querySelector('.refit-msg') as HTMLDivElement;
    this.dockButton.addEventListener('click', () => void this.handleDock());
    this.refitButton.addEventListener('click', () => {
      if (!this.currentRocket || !this.refit) return;
      if (!this.refit.start(this.currentRocket)) { this.refitMsg.textContent = 'Fit a refit kit in the equipment first'; return; }
      this.updateDisplay();
    });
    (this.container.querySelector('.refit-add') as HTMLButtonElement).addEventListener('click', () => this.pick({ kind: 'addTop' }));
    this.closeButton.addEventListener('click', () => this.close());

    // Handle keyboard
    document.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;

      if (e.key === 'Escape' || e.key === 'e' || e.key === 'E') {
        e.preventDefault();
        this.close();
      }
    });

    // Add to document
    document.body.appendChild(this.container);

    // Initially hidden
    this.container.style.display = 'none';
  }

  private addStyles(): void {
    const styleId = 'landed-rocket-ui-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      #landed-rocket-ui {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1000;
        pointer-events: auto;
      }

      .landed-rocket-panel {
        background: rgba(20, 20, 30, 0.95);
        border: 2px solid #4a9eff;
        border-radius: 8px;
        min-width: 280px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        font-family: 'Courier New', monospace;
      }

      .landed-rocket-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 16px;
        border-bottom: 1px solid #4a9eff;
        background: rgba(74, 158, 255, 0.1);
      }

      .landed-rocket-header h3 {
        margin: 0;
        color: #4a9eff;
        font-size: 18px;
        text-transform: uppercase;
        letter-spacing: 2px;
      }

      .landed-rocket-header .close-btn {
        background: none;
        border: none;
        color: #888;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        line-height: 1;
        transition: color 0.2s;
      }

      .landed-rocket-header .close-btn:hover {
        color: #ff4a4a;
      }

      .landed-rocket-content {
        padding: 16px;
      }

      .fuel-section {
        margin-bottom: 20px;
      }

      .equip-section {
        margin-bottom: 16px;
      }

      .equip-section label {
        display: block;
        color: #aaa;
        font-size: 12px;
        text-transform: uppercase;
        margin-bottom: 6px;
      }

      .equip-row {
        display: flex;
        gap: 4px;
        cursor: pointer;
      }

      .equip-cell {
        width: 40px;
        height: 40px;
        background: #1a1a1a;
        border: 2px solid #333;
        border-radius: 4px;
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .equip-row:hover .equip-cell {
        border-color: #29ADFF;
      }

      .equip-cell img {
        width: 32px;
        height: 32px;
        image-rendering: pixelated;
      }

      .equip-cell .slot-count {
        position: absolute;
        bottom: 1px;
        right: 3px;
        font-size: 11px;
        color: #FFF1E8;
        text-shadow: 1px 1px 0 #000;
      }

      .equip-summary {
        margin-top: 6px;
        font-size: 12px;
        color: #3ee0ff;
      }

      .fuel-section label {
        display: block;
        color: #aaa;
        font-size: 12px;
        text-transform: uppercase;
        margin-bottom: 8px;
      }

      .fuel-bar-container {
        height: 24px;
        background: rgba(0, 0, 0, 0.5);
        border: 1px solid #444;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 4px;
      }

      .fuel-bar {
        height: 100%;
        background: linear-gradient(90deg, #ff6b35, #ffb347);
        transition: width 0.3s ease;
        width: 0%;
      }

      .fuel-bar.low {
        background: linear-gradient(90deg, #ff3535, #ff6b35);
      }

      .fuel-bar.high {
        background: linear-gradient(90deg, #35ff6b, #6bff35);
      }

      .fuel-percent {
        color: #fff;
        font-size: 14px;
        font-weight: bold;
      }

      .charge-line {
        margin-top: 6px;
        font-size: 12px;
      }

      .button-section {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .board-btn {
        width: 100%;
        padding: 12px 20px;
        background: linear-gradient(180deg, #4a9eff 0%, #2a7edf 100%);
        border: none;
        border-radius: 4px;
        color: white;
        font-size: 16px;
        font-weight: bold;
        text-transform: uppercase;
        letter-spacing: 1px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .side-buttons {
        display: flex;
        gap: 8px;
        margin-top: 8px;
      }

      .side-btn {
        flex: 1;
        padding: 8px;
        background: #1D2B53;
        border: 2px solid #29ADFF;
        border-radius: 4px;
        color: #FFF1E8;
        font-size: 13px;
        cursor: pointer;
      }

      .side-btn:hover {
        background: #29ADFF;
        color: #000000;
      }

      .board-btn:hover {
        background: linear-gradient(180deg, #6ab4ff 0%, #4a9eff 100%);
        transform: translateY(-1px);
      }

      .board-btn:active {
        transform: translateY(1px);
      }

      .landed-rocket-hint {
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid #333;
        color: #666;
        font-size: 11px;
        text-align: center;
      }
    
      /* Refits (rocket-refit): the stack, one row per part, and the part picker */
      .refit-section { margin-top: 8px; }
      .refit-section label { display: block; margin-bottom: 4px; }
      .refit-row { display: flex; align-items: center; gap: 6px; margin: 3px 0; }
      .refit-row span { flex: 1; font-size: 12px; }
      .side-btn.small { padding: 3px 8px; font-size: 11px; }
      .refit-picker { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
      .refit-picker .equip-cell { cursor: pointer; }
      .refit-msg { color: #ff6666; font-size: 12px; min-height: 14px; margin-top: 4px; }
`;
    document.head.appendChild(style);
  }

  /**
   * Open the UI for a specific landed rocket
   */
  // ---- docking and refits (openspec space-exploration, rocket-refit) ----

  private dockButton!: HTMLButtonElement;
  private refitButton!: HTMLButtonElement;
  private refitSection!: HTMLDivElement;
  private refitStack!: HTMLDivElement;
  private refitPicker!: HTMLDivElement;
  private refitMsg!: HTMLDivElement;
  // What the open picker will do with the part chosen: add on top, or swap the part at an index
  private pending: { kind: 'addTop' } | { kind: 'swap'; index: number } | null = null;
  private refit: {
    canDock(r: LandedRocket): boolean;
    dock(r: LandedRocket): Promise<string | null>;
    kit(r: LandedRocket): 'once' | 'reusable' | null;
    refitting(r: LandedRocket): boolean;
    start(r: LandedRocket): boolean;
    end(r: LandedRocket): void;
    available(r: LandedRocket): ItemType[];
    apply(r: LandedRocket, op: RefitOp): Promise<string | null>;
  } | null = null;

  public setRefitHandlers(handlers: NonNullable<LandedRocketUI['refit']>): void {
    this.refit = handlers;
  }

  private async handleDock(): Promise<void> {
    if (!this.currentRocket || !this.refit) return;
    const why = await this.refit.dock(this.currentRocket);
    if (why) { this.refitMsg.textContent = why; return; }
    this.close();
  }

  /** Open the part picker for an add or a swap */
  private pick(action: { kind: 'addTop' } | { kind: 'swap'; index: number }): void {
    this.pending = action;
    this.renderRefit();
  }

  private async applyOp(op: RefitOp): Promise<void> {
    if (!this.currentRocket || !this.refit) return;
    const why = await this.refit.apply(this.currentRocket, op);
    this.refitMsg.textContent = why ?? '';
    this.pending = null;
    this.updateDisplay();
  }

  /** An item icon cell (the slot look the rest of the panel uses) */
  private iconCell(t: ItemType, title: string): HTMLDivElement {
    const cell = document.createElement('div');
    cell.className = 'equip-cell';
    cell.title = title;
    const img = document.createElement('img');
    img.src = getAssetPath(ITEM_DATA[t].texture);
    img.draggable = false;
    cell.appendChild(img);
    return cell;
  }

  /** The dock and refit buttons, and during a refit the stack and the part picker */
  private renderRefit(): void {
    const r = this.currentRocket;
    if (!r || !this.refit) return;
    this.dockButton.disabled = !this.refit.canDock(r);
    const active = this.refit.refitting(r);
    const kit = this.refit.kit(r);
    this.refitButton.disabled = active || !kit;
    this.refitButton.textContent = active ? 'Refitting' : kit === 'reusable' ? 'Refit (mk2 kit)' : 'Refit';
    this.refitSection.hidden = !active;
    if (!active) return;
    this.refitStack.innerHTML = '';
    r.parts.forEach((p, index) => {
      const row = document.createElement('div');
      row.className = 'refit-row';
      row.appendChild(this.iconCell(p.itemType, ITEM_DATA[p.itemType].name));
      const name = document.createElement('span');
      name.textContent = ITEM_DATA[p.itemType].name;
      const swap = document.createElement('button');
      swap.className = 'side-btn small';
      swap.textContent = 'Swap';
      swap.addEventListener('click', () => this.pick({ kind: 'swap', index }));
      const remove = document.createElement('button');
      remove.className = 'side-btn small';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => void this.applyOp({ kind: 'remove', index }));
      row.append(name, swap, remove);
      this.refitStack.appendChild(row);
    });
    // The picker: rocket parts in the cargo hold and the player's inventory, as icons
    this.refitPicker.hidden = !this.pending;
    this.refitPicker.innerHTML = '';
    if (this.pending) {
      const parts = this.refit.available(r);
      if (parts.length === 0) this.refitPicker.textContent = 'No rocket parts in the cargo hold or your inventory';
      for (const t of parts) {
        const cell = this.iconCell(t, `${this.pending.kind === 'addTop' ? 'Add' : 'Swap in'} ${ITEM_DATA[t].name}`);
        const action = this.pending;
        cell.addEventListener('click', () => void this.applyOp(action.kind === 'addTop' ? { kind: 'addTop', itemType: t } : { kind: 'swap', index: action.index, itemType: t }));
        this.refitPicker.appendChild(cell);
      }
    }
  }

  public open(rocket: LandedRocket): void {
    this.currentRocket = rocket;
    this.isOpen = true;
    this.container.style.display = 'block';

    this.updateDisplay();

    // Register with menu manager
    MenuManager.registerMenu('landed-rocket-ui', {
      isOpen: () => this.isOpen,
      close: () => this.close(),
    });
  }

  /**
   * Close the UI
   */
  public close(): void {
    if (!this.isOpen) return;

    // A refit ends when the panel closes (the next one needs a kit again)
    if (this.currentRocket) this.refit?.end(this.currentRocket);
    this.pending = null;
    this.refitMsg.textContent = '';
    this.isOpen = false;
    this.container.style.display = 'none';
    this.currentRocket = null;

    // Unregister from menu manager
    MenuManager.unregisterMenu('landed-rocket-ui');

    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }

  /**
   * Check if UI is open
   */
  public isUIOpen(): boolean {
    return this.isOpen;
  }

  /**
   * Get the current rocket being displayed
   */
  public getCurrentRocket(): LandedRocket | null {
    return this.currentRocket;
  }

  /**
   * Update the display with current rocket data
   */
  private updateDisplay(): void {
    if (!this.currentRocket) return;

    const fuel = this.currentRocket.fuelPercent;

    // Update fuel bar
    this.fuelBar.style.width = `${fuel}%`;
    this.fuelDisplay.textContent = `${Math.round(fuel)}%`;

    // Battery charge (openspec wool-air-and-reentry, design 2): a flat one
    // says how to swap a fresh battery in
    const capacity = computeRocketStats(stackItemTypes(this.currentRocket.parts), 0, null, this.currentRocket.equipment).batteryWh;
    const charge = this.currentRocket.chargeWh ?? capacity;
    const pct = capacity > 0 ? Math.round((charge / capacity) * 100) : 0;
    const swap = ITEM_DATA[ROCKET_CONFIG.POWER.SWAP_ITEM]?.name ?? 'battery';
    this.chargeLine.textContent = charge > 0 ? `Battery ${pct}%` : `Battery flat - use a ${swap} on the rocket`;
    this.chargeLine.style.color = charge > 0 ? '#3ee0ff' : '#ff6666';

    this.updateEquipment();
    this.renderRefit();

    // Update fuel bar color class
    this.fuelBar.classList.remove('low', 'high');
    if (fuel < 25) {
      this.fuelBar.classList.add('low');
    } else if (fuel > 75) {
      this.fuelBar.classList.add('high');
    }
  }

  /** The equipment slots: an icon cell per slot, and what it all gives */
  private updateEquipment(): void {
    const slots = this.currentRocket?.equipment ?? [];
    this.equipRow.innerHTML = '';
    for (const slot of slots) {
      const cell = document.createElement('div');
      cell.className = 'equip-cell';
      if (slot.itemType !== ItemType.NONE && slot.quantity > 0) {
        const data = ITEM_DATA[slot.itemType];
        cell.title = `${data.name}: ${equipmentLabel(slot.itemType, slot.quantity)}`;
        const img = document.createElement('img');
        img.src = getAssetPath(data.texture);
        img.draggable = false;
        cell.appendChild(img);
        if (slot.quantity > 1) {
          const count = document.createElement('span');
          count.className = 'slot-count';
          count.textContent = String(slot.quantity);
          cell.appendChild(count);
        }
      }
      this.equipRow.appendChild(cell);
    }
    this.equipSummary.textContent = slots.length === 0 ? 'No equipment slots' : equipmentSummary(slots);
  }

  /** Close this panel and hand over to the inventory + a slot panel (cargo, equipment) */
  private handOver(callback: ((rocket: LandedRocket) => void) | null): void {
    if (!this.currentRocket || !callback) return;
    const rocket = this.currentRocket;
    this.isOpen = false;
    this.container.style.display = 'none';
    this.currentRocket = null;
    MenuManager.unregisterMenu('landed-rocket-ui');
    callback(rocket);
  }

  /**
   * Handle board button click
   */
  private handleBoard(): void {
    if (!this.currentRocket) return;

    const rocket = this.currentRocket;

    // Close UI without triggering the close callback (which would request pointer lock)
    // since boarding the rocket will handle pointer lock itself
    this.isOpen = false;
    this.container.style.display = 'none';
    this.currentRocket = null;
    MenuManager.unregisterMenu('landed-rocket-ui');

    if (this.onBoardCallback) {
      this.onBoardCallback(rocket);
    }
  }

  /**
   * Set callback for when player boards the rocket
   */
  public setOnBoardCallback(callback: (rocket: LandedRocket) => void): void {
    this.onBoardCallback = callback;
  }

  /**
   * Set callback for when UI closes
   */
  public setOnCloseCallback(callback: () => void): void {
    this.onCloseCallback = callback;
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    if (this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}
