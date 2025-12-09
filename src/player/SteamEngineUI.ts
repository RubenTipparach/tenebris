import { PlacedSteamEngine } from '../planet/SteamEngine';
import { MenuManager } from './MenuManager';
import { Inventory, ItemType } from './Inventory';

export interface SteamEngineState {
  hasFuel: boolean;
  fuelAmount: number;
  isRunning: boolean;
  waterInput: number;
  steamOutput: number;
}

export class SteamEngineUI {
  private currentSteamEngine: PlacedSteamEngine | null = null;
  private steamEngineSectionElement: HTMLElement | null = null;
  private isOpen: boolean = false;
  private onCloseCallback: (() => void) | null = null;
  private onOpenInventoryCallback: (() => void) | null = null;
  private inventory: Inventory | null = null;
  private onSaveCallback: (() => void) | null = null;
  private onUpdateHotbarCallback: (() => void) | null = null;

  // Steam engine states (keyed by tile index)
  private engineStates: Map<number, SteamEngineState> = new Map();

  // UI Elements
  private fuelAmountElement: HTMLElement | null = null;
  private waterInputElement: HTMLElement | null = null;
  private steamOutputElement: HTMLElement | null = null;
  private statusIndicatorElement: HTMLElement | null = null;
  private addFuelBtnElement: HTMLButtonElement | null = null;

  // Animation
  private steamCanvas: HTMLCanvasElement | null = null;
  private steamCtx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private lastAnimationTime: number = 0;
  private steamParticles: Array<{ x: number; y: number; size: number; opacity: number; vx: number; vy: number }> = [];

  // Connection callback
  private getConnectedHydroGenerators: ((steamTileIndex: number) => number[]) | null = null;
  private getHydroGeneratorWaterOutput: ((hydroTileIndex: number) => number) | null = null;

  constructor() {
    this.createUI();
    this.setupKeyboardHandler();

    MenuManager.registerMenu('steam-engine', {
      isOpen: () => this.isOpen,
      close: () => this.close(),
    });
  }

  public setInventory(inventory: Inventory): void {
    this.inventory = inventory;
  }

  public setSaveCallback(callback: () => void): void {
    this.onSaveCallback = callback;
  }

  public setUpdateHotbarCallback(callback: () => void): void {
    this.onUpdateHotbarCallback = callback;
  }

  public setConnectionCallbacks(
    getConnectedHydroGenerators: (steamTileIndex: number) => number[],
    getHydroGeneratorWaterOutput: (hydroTileIndex: number) => number
  ): void {
    this.getConnectedHydroGenerators = getConnectedHydroGenerators;
    this.getHydroGeneratorWaterOutput = getHydroGeneratorWaterOutput;
  }

  private createUI(): void {
    this.steamEngineSectionElement = document.createElement('div');
    this.steamEngineSectionElement.id = 'steam-engine-section';
    this.steamEngineSectionElement.className = 'steam-engine-section';
    this.steamEngineSectionElement.innerHTML = `
      <h3>Steam Engine</h3>

      <div class="steam-status-container">
        <div class="steam-status-indicator" id="steam-status-indicator">
          <span class="status-dot"></span>
          <span class="status-text">Idle</span>
        </div>

        <div class="steam-visual">
          <canvas id="steam-canvas" width="120" height="80"></canvas>
        </div>

        <div class="steam-stats">
          <div class="steam-stat">
            <span class="stat-label">Fuel:</span>
            <span class="stat-value" id="steam-fuel-amount">0</span>
          </div>

          <div class="steam-stat">
            <span class="stat-label">Water In:</span>
            <span class="stat-value" id="steam-water-input">0 units/s</span>
          </div>

          <div class="steam-stat">
            <span class="stat-label">Steam Out:</span>
            <span class="stat-value" id="steam-output">0 units/s</span>
          </div>
        </div>

        <button class="steam-fuel-btn" id="steam-add-fuel">Add Coal</button>
      </div>

      <div class="steam-hint">
        <p>Connect to Hydro Generator with copper pipes</p>
      </div>
    `;

    const inventoryContainer = document.querySelector('.inventory-container');
    if (inventoryContainer) {
      const inventorySection = inventoryContainer.querySelector('.inventory-section');
      if (inventorySection) {
        inventoryContainer.insertBefore(this.steamEngineSectionElement, inventorySection);
      } else {
        inventoryContainer.appendChild(this.steamEngineSectionElement);
      }
    }

    // Get UI elements
    this.fuelAmountElement = document.getElementById('steam-fuel-amount');
    this.waterInputElement = document.getElementById('steam-water-input');
    this.steamOutputElement = document.getElementById('steam-output');
    this.statusIndicatorElement = document.getElementById('steam-status-indicator');
    this.addFuelBtnElement = document.getElementById('steam-add-fuel') as HTMLButtonElement;

    // Get canvas
    this.steamCanvas = document.getElementById('steam-canvas') as HTMLCanvasElement;
    if (this.steamCanvas) {
      this.steamCtx = this.steamCanvas.getContext('2d');
    }

    // Set up fuel button
    if (this.addFuelBtnElement) {
      this.addFuelBtnElement.addEventListener('click', () => this.addFuel());
    }

    this.addStyles();

    this.steamEngineSectionElement.style.display = 'none';
  }

  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .steam-engine-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0 15px;
        border-left: 1px solid #444;
        margin-left: 15px;
        min-width: 180px;
      }

      .steam-engine-section h3 {
        font-size: 14px;
        color: #FF8844;
        margin-bottom: 10px;
      }

      .steam-status-container {
        display: flex;
        flex-direction: column;
        gap: 15px;
        padding: 10px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
        width: 100%;
      }

      .steam-status-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.4);
        border-radius: 4px;
        justify-content: center;
      }

      .steam-status-indicator .status-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #666;
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
      }

      .steam-status-indicator.running .status-dot {
        background: #FF8844;
        box-shadow: 0 0 8px rgba(255, 136, 68, 0.5);
        animation: pulse-steam 1s ease-in-out infinite;
      }

      .steam-status-indicator.idle .status-dot {
        background: #666;
      }

      .steam-status-indicator.no-water .status-dot {
        background: #4488FF;
      }

      @keyframes pulse-steam {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.7; transform: scale(1.1); }
      }

      .steam-status-indicator .status-text {
        font-size: 14px;
        font-weight: bold;
        color: #fff;
      }

      .steam-visual {
        display: flex;
        justify-content: center;
        padding: 10px 0;
      }

      .steam-visual canvas {
        border: 2px solid #333;
        border-radius: 4px;
        background: #1a1a2e;
      }

      .steam-stats {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .steam-stat {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .steam-stat:last-child {
        border-bottom: none;
      }

      .steam-stat .stat-label {
        color: #888;
        font-size: 12px;
      }

      .steam-stat .stat-value {
        color: #FF8844;
        font-size: 12px;
        font-weight: bold;
      }

      .steam-fuel-btn {
        padding: 8px 16px;
        background: linear-gradient(180deg, #5a4030, #3a2820);
        border: 1px solid #6a5040;
        border-radius: 4px;
        color: #fff;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .steam-fuel-btn:hover:not(:disabled) {
        background: linear-gradient(180deg, #7a5040, #4a3830);
        border-color: #8a6050;
      }

      .steam-fuel-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .steam-hint {
        margin-top: 10px;
        padding: 8px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
      }

      .steam-hint p {
        font-size: 10px;
        color: #666;
        margin: 0;
        text-align: center;
      }
    `;
    document.head.appendChild(style);
  }

  private setupKeyboardHandler(): void {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
        e.preventDefault();
      }
    });
  }

  public open(steamEngine: PlacedSteamEngine): void {
    this.currentSteamEngine = steamEngine;
    this.isOpen = true;

    // Ensure state exists for this engine
    if (!this.engineStates.has(steamEngine.tileIndex)) {
      this.engineStates.set(steamEngine.tileIndex, {
        hasFuel: false,
        fuelAmount: 0,
        isRunning: false,
        waterInput: 0,
        steamOutput: 0,
      });
    }

    // Reset animation
    this.steamParticles = [];
    this.lastAnimationTime = performance.now();

    if (this.steamEngineSectionElement) {
      this.steamEngineSectionElement.style.display = 'flex';
    }

    if (this.onOpenInventoryCallback) {
      this.onOpenInventoryCallback();
    }

    this.updateUI();
    this.startAnimation();
  }

  public close(): void {
    this.currentSteamEngine = null;
    this.isOpen = false;

    this.stopAnimation();

    if (this.steamEngineSectionElement) {
      this.steamEngineSectionElement.style.display = 'none';
    }

    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }

  public isMenuOpen(): boolean {
    return this.isOpen;
  }

  public getCurrentSteamEngine(): PlacedSteamEngine | null {
    return this.currentSteamEngine;
  }

  public setOnCloseCallback(callback: () => void): void {
    this.onCloseCallback = callback;
  }

  public setOnOpenInventoryCallback(callback: () => void): void {
    this.onOpenInventoryCallback = callback;
  }

  public getEngineState(tileIndex: number): SteamEngineState | undefined {
    return this.engineStates.get(tileIndex);
  }

  private addFuel(): void {
    if (!this.currentSteamEngine || !this.inventory) return;

    const state = this.engineStates.get(this.currentSteamEngine.tileIndex);
    if (!state) return;

    // Check if player has coal
    if (this.inventory.hasItem(ItemType.COAL, 1)) {
      this.inventory.removeItem(ItemType.COAL, 1);
      state.fuelAmount += 1;
      state.hasFuel = true;

      // Update running state if we have water
      this.updateRunningState(state);

      this.updateUI();

      if (this.onUpdateHotbarCallback) {
        this.onUpdateHotbarCallback();
      }

      if (this.onSaveCallback) {
        this.onSaveCallback();
      }
    }
  }

  private updateRunningState(state: SteamEngineState): void {
    // Calculate water input from connected hydro generators
    let totalWaterInput = 0;

    if (this.currentSteamEngine && this.getConnectedHydroGenerators && this.getHydroGeneratorWaterOutput) {
      const connectedHydros = this.getConnectedHydroGenerators(this.currentSteamEngine.tileIndex);
      for (const hydroTile of connectedHydros) {
        totalWaterInput += this.getHydroGeneratorWaterOutput(hydroTile);
      }
    }

    state.waterInput = totalWaterInput;
    state.isRunning = state.hasFuel && state.fuelAmount > 0 && totalWaterInput > 0;
    state.steamOutput = state.isRunning ? totalWaterInput * 0.8 : 0;
  }

  private updateUI(): void {
    if (!this.currentSteamEngine) return;

    const state = this.engineStates.get(this.currentSteamEngine.tileIndex);
    if (!state) return;

    // Update running state based on current connections
    this.updateRunningState(state);

    // Update status indicator
    if (this.statusIndicatorElement) {
      this.statusIndicatorElement.classList.remove('running', 'idle', 'no-water');
      if (state.isRunning) {
        this.statusIndicatorElement.classList.add('running');
        this.statusIndicatorElement.querySelector('.status-text')!.textContent = 'Running';
      } else if (state.hasFuel && state.waterInput === 0) {
        this.statusIndicatorElement.classList.add('no-water');
        this.statusIndicatorElement.querySelector('.status-text')!.textContent = 'No Water';
      } else {
        this.statusIndicatorElement.classList.add('idle');
        this.statusIndicatorElement.querySelector('.status-text')!.textContent = 'Idle';
      }
    }

    // Update fuel amount
    if (this.fuelAmountElement) {
      this.fuelAmountElement.textContent = state.fuelAmount.toString();
    }

    // Update water input
    if (this.waterInputElement) {
      this.waterInputElement.textContent = `${state.waterInput.toFixed(1)} units/s`;
    }

    // Update steam output
    if (this.steamOutputElement) {
      this.steamOutputElement.textContent = `${state.steamOutput.toFixed(1)} units/s`;
    }

    // Update fuel button
    if (this.addFuelBtnElement && this.inventory) {
      const hasCoal = this.inventory.hasItem(ItemType.COAL, 1);
      this.addFuelBtnElement.disabled = !hasCoal;
      this.addFuelBtnElement.textContent = hasCoal ? 'Add Coal' : 'No Coal';
    }
  }

  private startAnimation(): void {
    if (this.animationFrameId !== null) return;

    const animate = (currentTime: number) => {
      if (!this.isOpen) return;

      const deltaTime = (currentTime - this.lastAnimationTime) / 1000;
      this.lastAnimationTime = currentTime;

      this.updateSteamParticles(deltaTime);
      this.drawSteamAnimation();

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  private stopAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private updateSteamParticles(deltaTime: number): void {
    const state = this.currentSteamEngine ? this.engineStates.get(this.currentSteamEngine.tileIndex) : null;
    const isRunning = state?.isRunning ?? false;

    // Spawn new particles if running
    if (isRunning && Math.random() < deltaTime * 10) {
      this.steamParticles.push({
        x: 60 + (Math.random() - 0.5) * 20,
        y: 70,
        size: 3 + Math.random() * 4,
        opacity: 0.6 + Math.random() * 0.3,
        vx: (Math.random() - 0.5) * 10,
        vy: -20 - Math.random() * 15,
      });
    }

    // Update particles
    for (let i = this.steamParticles.length - 1; i >= 0; i--) {
      const p = this.steamParticles[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.size += deltaTime * 8;
      p.opacity -= deltaTime * 0.5;

      if (p.opacity <= 0 || p.y < -10) {
        this.steamParticles.splice(i, 1);
      }
    }
  }

  private drawSteamAnimation(): void {
    if (!this.steamCanvas || !this.steamCtx) return;

    const ctx = this.steamCtx;
    const width = this.steamCanvas.width;
    const height = this.steamCanvas.height;

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    const state = this.currentSteamEngine ? this.engineStates.get(this.currentSteamEngine.tileIndex) : null;

    // Draw steam engine body
    ctx.fillStyle = '#444';
    ctx.fillRect(35, 45, 50, 30); // Main body

    // Draw smokestack
    ctx.fillStyle = '#555';
    ctx.fillRect(50, 25, 20, 25);

    // Draw smokestack top
    ctx.fillStyle = '#666';
    ctx.fillRect(47, 20, 26, 8);

    // Draw boiler (glows when running)
    if (state?.isRunning) {
      ctx.fillStyle = '#a55';
      ctx.fillRect(40, 50, 40, 20);

      // Fire glow
      const gradient = ctx.createRadialGradient(60, 60, 0, 60, 60, 25);
      gradient.addColorStop(0, 'rgba(255, 100, 50, 0.3)');
      gradient.addColorStop(1, 'rgba(255, 100, 50, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(35, 45, 50, 30);
    } else {
      ctx.fillStyle = '#444';
      ctx.fillRect(40, 50, 40, 20);
    }

    // Draw steam particles
    for (const p of this.steamParticles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 200, 220, ${p.opacity})`;
      ctx.fill();
    }

    // Draw frame
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);
  }

  // Export state for saving
  public exportStatesForSave(): Array<{ tileIndex: number; state: SteamEngineState }> {
    return Array.from(this.engineStates.entries()).map(([tileIndex, state]) => ({
      tileIndex,
      state,
    }));
  }

  // Restore state from save
  public restoreState(tileIndex: number, state: SteamEngineState): void {
    this.engineStates.set(tileIndex, state);
  }
}
