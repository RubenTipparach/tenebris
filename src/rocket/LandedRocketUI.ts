import { LandedRocket } from './LandedRocket';
import { MenuManager } from '../player/MenuManager';

/**
 * Simple UI for interacting with a landed rocket
 * Shows fuel level and allows boarding
 */
export class LandedRocketUI {
  private container: HTMLDivElement;
  private fuelDisplay: HTMLDivElement;
  private fuelBar: HTMLDivElement;
  private boardButton: HTMLButtonElement;
  private closeButton: HTMLButtonElement;

  private currentRocket: LandedRocket | null = null;
  private isOpen: boolean = false;

  // Callbacks
  private onBoardCallback: ((rocket: LandedRocket) => void) | null = null;
  private onCloseCallback: (() => void) | null = null;

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
          </div>
          <div class="button-section">
            <button class="board-btn">Board Rocket</button>
          </div>
        </div>
      </div>
    `;

    this.addStyles();

    // Get element references
    this.fuelDisplay = this.container.querySelector('.fuel-percent') as HTMLDivElement;
    this.fuelBar = this.container.querySelector('.fuel-bar') as HTMLDivElement;
    this.boardButton = this.container.querySelector('.board-btn') as HTMLButtonElement;
    this.closeButton = this.container.querySelector('.close-btn') as HTMLButtonElement;

    // Set up event listeners
    this.boardButton.addEventListener('click', () => this.handleBoard());
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
    `;
    document.head.appendChild(style);
  }

  /**
   * Open the UI for a specific landed rocket
   */
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

    // Update fuel bar color class
    this.fuelBar.classList.remove('low', 'high');
    if (fuel < 25) {
      this.fuelBar.classList.add('low');
    } else if (fuel > 75) {
      this.fuelBar.classList.add('high');
    }
  }

  /**
   * Handle board button click
   */
  private handleBoard(): void {
    if (!this.currentRocket) return;

    const rocket = this.currentRocket;
    this.close();

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
