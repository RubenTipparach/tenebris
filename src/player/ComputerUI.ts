import { PlacedComputer } from '../planet/Computer';
import { MenuManager } from './MenuManager';

export class ComputerUI {
  private currentComputer: PlacedComputer | null = null;
  private computerSectionElement: HTMLElement | null = null;
  private isOpen: boolean = false;
  private onCloseCallback: (() => void) | null = null;
  private onOpenInventoryCallback: (() => void) | null = null;
  private isPowered: boolean = false;

  // Power check callback
  private isPoweredCallback: ((tileIndex: number) => boolean) | null = null;

  // Status display elements
  private statusContentElement: HTMLElement | null = null;
  private powerStatusElement: HTMLElement | null = null;
  private screenElement: HTMLElement | null = null;

  constructor() {
    this.createUI();
    this.addStyles();
    this.setupKeyboardHandler();

    // Register with menu manager
    MenuManager.registerMenu('computer', {
      isOpen: () => this.isOpen,
      close: () => this.close(),
    });
  }

  public setIsPoweredCallback(callback: (tileIndex: number) => boolean): void {
    this.isPoweredCallback = callback;
  }

  private createUI(): void {
    this.computerSectionElement = document.createElement('div');
    this.computerSectionElement.id = 'computer-section';
    this.computerSectionElement.className = 'computer-section';
    this.computerSectionElement.innerHTML = `
      <h3>Computer Terminal</h3>

      <div class="computer-power-status" id="computer-power-status">
        <span class="power-icon">⚡</span>
        <span class="power-text">No Power</span>
      </div>

      <div class="computer-screen" id="computer-screen">
        <div class="screen-header">SYSTEM STATUS</div>
        <div class="screen-content" id="computer-screen-content">
          <div class="status-line">> Initializing system...</div>
        </div>
      </div>

      <div class="computer-hint">
        <p>Press E or ESC to close</p>
      </div>
    `;

    // Insert into inventory container
    const inventoryContainer = document.querySelector('.inventory-container');
    if (inventoryContainer) {
      const inventorySection = inventoryContainer.querySelector('.inventory-section');
      if (inventorySection) {
        inventoryContainer.insertBefore(this.computerSectionElement, inventorySection);
      } else {
        inventoryContainer.appendChild(this.computerSectionElement);
      }
    }

    // Get references
    this.statusContentElement = document.getElementById('computer-screen-content');
    this.powerStatusElement = document.getElementById('computer-power-status');
    this.screenElement = document.getElementById('computer-screen');

    this.computerSectionElement.style.display = 'none';
  }

  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .computer-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0 15px;
        border-left: 1px solid #444;
        margin-left: 15px;
      }

      .computer-section h3 {
        font-size: 14px;
        color: #00FF00;
        margin-bottom: 10px;
        font-family: 'Courier New', monospace;
        text-shadow: 0 0 5px rgba(0, 255, 0, 0.3);
      }

      .computer-power-status {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        border-radius: 4px;
        margin-bottom: 15px;
        background: rgba(255, 0, 0, 0.2);
        border: 1px solid #ff4444;
      }

      .computer-power-status.powered {
        background: rgba(0, 255, 0, 0.2);
        border: 1px solid #44ff44;
      }

      .computer-power-status .power-icon {
        font-size: 18px;
      }

      .computer-power-status.powered .power-icon {
        color: #44ff44;
      }

      .computer-power-status .power-text {
        font-size: 12px;
        color: #888;
      }

      .computer-power-status.powered .power-text {
        color: #44ff44;
      }

      .computer-screen {
        background: #0a0a0a;
        border: 2px solid #333;
        border-radius: 8px;
        padding: 15px;
        margin-bottom: 15px;
        min-height: 150px;
        min-width: 280px;
      }

      .computer-screen.unpowered {
        background: #050505;
      }

      .computer-screen .screen-header {
        color: #00FF00;
        font-family: 'Courier New', monospace;
        font-size: 14px;
        font-weight: bold;
        margin-bottom: 10px;
        padding-bottom: 5px;
        border-bottom: 1px solid #333;
        text-shadow: 0 0 5px rgba(0, 255, 0, 0.3);
      }

      .computer-screen.unpowered .screen-header {
        color: #333;
        text-shadow: none;
      }

      .computer-screen .screen-content {
        font-family: 'Courier New', monospace;
        font-size: 11px;
        color: #00DD00;
        line-height: 1.6;
      }

      .computer-screen.unpowered .screen-content {
        color: #333;
      }

      .computer-screen .status-line {
        margin: 2px 0;
      }

      .computer-screen .status-line.blink {
        animation: computer-blink 1s infinite;
      }

      .computer-screen.unpowered .status-line.blink {
        animation: none;
      }

      .computer-screen .status-line.error {
        color: #FF4444;
      }

      .computer-screen .status-line.warning {
        color: #FFAA00;
      }

      .computer-screen .status-line.success {
        color: #44FF44;
      }

      .computer-screen.unpowered .status-line.error,
      .computer-screen.unpowered .status-line.warning,
      .computer-screen.unpowered .status-line.success {
        color: #333;
      }

      @keyframes computer-blink {
        0%, 50% { opacity: 1; }
        51%, 100% { opacity: 0; }
      }

      .computer-hint {
        text-align: center;
      }

      .computer-hint p {
        font-size: 11px;
        color: #666;
        margin: 4px 0;
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

  public open(computer: PlacedComputer): void {
    this.currentComputer = computer;
    this.isOpen = true;

    // Check power status
    if (this.isPoweredCallback) {
      this.isPowered = this.isPoweredCallback(computer.tileIndex);
    }

    if (this.computerSectionElement) {
      this.computerSectionElement.style.display = 'flex';
    }

    // Open the full inventory menu
    if (this.onOpenInventoryCallback) {
      this.onOpenInventoryCallback();
    }

    this.updateUI();
  }

  public close(): void {
    this.isOpen = false;
    this.currentComputer = null;
    this.isPowered = false;

    if (this.computerSectionElement) {
      this.computerSectionElement.style.display = 'none';
    }

    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }

  public isMenuOpen(): boolean {
    return this.isOpen;
  }

  public getCurrentComputer(): PlacedComputer | null {
    return this.currentComputer;
  }

  public setOnCloseCallback(callback: () => void): void {
    this.onCloseCallback = callback;
  }

  public setOnOpenInventoryCallback(callback: () => void): void {
    this.onOpenInventoryCallback = callback;
  }

  public setPowered(isPowered: boolean): void {
    this.isPowered = isPowered;
    this.updateUI();
  }

  private updateUI(): void {
    if (!this.computerSectionElement) return;

    // Update power status
    if (this.powerStatusElement) {
      if (this.isPowered) {
        this.powerStatusElement.classList.add('powered');
        this.powerStatusElement.querySelector('.power-text')!.textContent = 'Powered';
      } else {
        this.powerStatusElement.classList.remove('powered');
        this.powerStatusElement.querySelector('.power-text')!.textContent = 'No Power';
      }
    }

    // Update screen powered state
    if (this.screenElement) {
      if (this.isPowered) {
        this.screenElement.classList.remove('unpowered');
      } else {
        this.screenElement.classList.add('unpowered');
      }
    }

    // Update screen content based on power state
    if (this.statusContentElement) {
      if (this.isPowered) {
        this.statusContentElement.innerHTML = `
          <div class="status-line">> System initialized successfully</div>
          <div class="status-line">> </div>
          <div class="status-line success">> CPU: Online - Operating normally</div>
          <div class="status-line success">> RAM: 4 modules active (16GB total)</div>
          <div class="status-line success">> Motherboard: All systems nominal</div>
          <div class="status-line success">> Power Supply: Stable voltage</div>
          <div class="status-line">> </div>
          <div class="status-line">> Network: Scanning for devices...</div>
          <div class="status-line warning">> Storage: No drives detected</div>
          <div class="status-line">> </div>
          <div class="status-line blink">> Ready for input_</div>
        `;
      } else {
        this.statusContentElement.innerHTML = `
          <div class="status-line">> No signal</div>
          <div class="status-line">> </div>
          <div class="status-line error">> ERROR: Power supply disconnected</div>
          <div class="status-line">> </div>
          <div class="status-line">> Connect to power source to continue...</div>
        `;
      }
    }
  }
}
