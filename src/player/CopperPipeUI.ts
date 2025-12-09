import { PlacedCopperPipe, PipeNetwork } from '../planet/CopperPipe';
import { MenuManager } from './MenuManager';

export class CopperPipeUI {
  private currentPipe: PlacedCopperPipe | null = null;
  private currentNetwork: PipeNetwork | null = null;
  private isOpen: boolean = false;
  private pipeInfoElement: HTMLElement | null = null;
  private onCloseCallback: (() => void) | null = null;

  // Callbacks to get machine info
  private getHydroGeneratorInfo: ((tileIndex: number) => { active: boolean; waterDepth: number } | null) | null = null;
  private getSteamEngineInfo: ((tileIndex: number) => { hasFuel: boolean; isRunning: boolean } | null) | null = null;

  constructor() {
    this.createUI();
    this.setupKeyboardHandler();

    MenuManager.registerMenu('copper-pipe', {
      isOpen: () => this.isOpen,
      close: () => this.close(),
    });
  }

  public setMachineInfoCallbacks(
    getHydroGeneratorInfo: (tileIndex: number) => { active: boolean; waterDepth: number } | null,
    getSteamEngineInfo: (tileIndex: number) => { hasFuel: boolean; isRunning: boolean } | null
  ): void {
    this.getHydroGeneratorInfo = getHydroGeneratorInfo;
    this.getSteamEngineInfo = getSteamEngineInfo;
  }

  private createUI(): void {
    // Create pipe info panel
    this.pipeInfoElement = document.createElement('div');
    this.pipeInfoElement.id = 'copper-pipe-info';
    this.pipeInfoElement.innerHTML = `
      <div class="pipe-info-panel">
        <h3>Copper Pipe Network</h3>
        <div class="pipe-status-container">
          <div class="pipe-status-indicator" id="pipe-status-indicator">
            <span class="status-dot"></span>
            <span class="status-text">Not Connected</span>
          </div>

          <div class="pipe-connections">
            <div class="connection-section">
              <span class="connection-label">Hydro Generators:</span>
              <span class="connection-value" id="pipe-hydro-count">0</span>
            </div>
            <div class="connection-section">
              <span class="connection-label">Steam Engines:</span>
              <span class="connection-value" id="pipe-steam-count">0</span>
            </div>
            <div class="connection-section">
              <span class="connection-label">Pipe Segments:</span>
              <span class="connection-value" id="pipe-segment-count">1</span>
            </div>
          </div>

          <div class="pipe-machine-list" id="pipe-machine-list">
            <!-- Machine list populated dynamically -->
          </div>
        </div>
        <p class="pipe-hint">Press E or ESC to close</p>
      </div>
    `;

    // Initially hidden
    this.pipeInfoElement.style.display = 'none';
    document.body.appendChild(this.pipeInfoElement);

    this.addStyles();
  }

  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      #copper-pipe-info {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1002;
      }

      .pipe-info-panel {
        background: rgba(20, 20, 30, 0.95);
        border: 2px solid #b87333;
        border-radius: 8px;
        padding: 20px;
        min-width: 280px;
        color: #fff;
        font-family: monospace;
      }

      .pipe-info-panel h3 {
        margin: 0 0 15px 0;
        text-align: center;
        color: #b87333;
        border-bottom: 1px solid #b87333;
        padding-bottom: 10px;
      }

      .pipe-status-container {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .pipe-status-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
      }

      .pipe-status-indicator .status-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #666;
        transition: background 0.3s;
      }

      .pipe-status-indicator.connected .status-dot {
        background: #4a4;
        box-shadow: 0 0 8px #4a4;
      }

      .pipe-status-indicator.disconnected .status-dot {
        background: #a44;
      }

      .pipe-status-indicator .status-text {
        font-size: 14px;
        font-weight: bold;
      }

      .pipe-connections {
        display: flex;
        flex-direction: column;
        gap: 8px;
        padding: 10px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
      }

      .connection-section {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .connection-label {
        color: #aaa;
      }

      .connection-value {
        color: #b87333;
        font-weight: bold;
      }

      .pipe-machine-list {
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 200px;
        overflow-y: auto;
      }

      .pipe-machine-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 10px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
        border-left: 3px solid #666;
      }

      .pipe-machine-item.hydro {
        border-left-color: #4a9;
      }

      .pipe-machine-item.steam {
        border-left-color: #94a;
      }

      .pipe-machine-item .machine-name {
        font-size: 13px;
      }

      .pipe-machine-item .machine-status {
        font-size: 11px;
        padding: 2px 6px;
        border-radius: 3px;
        background: rgba(0, 0, 0, 0.3);
      }

      .pipe-machine-item .machine-status.active {
        color: #4a4;
      }

      .pipe-machine-item .machine-status.inactive {
        color: #a44;
      }

      .pipe-hint {
        text-align: center;
        color: #666;
        font-size: 12px;
        margin: 15px 0 0 0;
      }
    `;
    document.head.appendChild(style);
  }

  private setupKeyboardHandler(): void {
    document.addEventListener('keydown', (event) => {
      if (!this.isOpen) return;

      if (event.key === 'Escape' || event.key.toLowerCase() === 'e') {
        event.preventDefault();
        this.close();
      }
    });
  }

  public open(pipe: PlacedCopperPipe, network: PipeNetwork | null): void {
    this.currentPipe = pipe;
    this.currentNetwork = network;
    this.isOpen = true;

    if (this.pipeInfoElement) {
      this.pipeInfoElement.style.display = 'block';
    }

    this.updateUI();
  }

  public close(): void {
    this.currentPipe = null;
    this.currentNetwork = null;
    this.isOpen = false;

    if (this.pipeInfoElement) {
      this.pipeInfoElement.style.display = 'none';
    }

    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }

  public setOnCloseCallback(callback: () => void): void {
    this.onCloseCallback = callback;
  }

  public getIsOpen(): boolean {
    return this.isOpen;
  }

  private updateUI(): void {
    if (!this.currentPipe) return;

    const statusIndicator = document.getElementById('pipe-status-indicator');
    const hydroCount = document.getElementById('pipe-hydro-count');
    const steamCount = document.getElementById('pipe-steam-count');
    const segmentCount = document.getElementById('pipe-segment-count');
    const machineList = document.getElementById('pipe-machine-list');

    if (!this.currentNetwork) {
      // Single disconnected pipe
      if (statusIndicator) {
        statusIndicator.className = 'pipe-status-indicator disconnected';
        statusIndicator.querySelector('.status-text')!.textContent = 'Not Connected';
      }
      if (hydroCount) hydroCount.textContent = '0';
      if (steamCount) steamCount.textContent = '0';
      if (segmentCount) segmentCount.textContent = '1';
      if (machineList) machineList.innerHTML = '<p style="color: #666; text-align: center; font-size: 12px;">No machines connected</p>';
      return;
    }

    const hasHydro = this.currentNetwork.connectedHydroGenerators.length > 0;
    const hasSteam = this.currentNetwork.connectedSteamEngines.length > 0;
    const isFullyConnected = hasHydro && hasSteam;

    // Update status
    if (statusIndicator) {
      if (isFullyConnected) {
        statusIndicator.className = 'pipe-status-indicator connected';
        statusIndicator.querySelector('.status-text')!.textContent = 'Network Active';
      } else {
        statusIndicator.className = 'pipe-status-indicator disconnected';
        statusIndicator.querySelector('.status-text')!.textContent = hasHydro || hasSteam ? 'Partial Connection' : 'Not Connected';
      }
    }

    // Update counts
    if (hydroCount) hydroCount.textContent = this.currentNetwork.connectedHydroGenerators.length.toString();
    if (steamCount) steamCount.textContent = this.currentNetwork.connectedSteamEngines.length.toString();
    if (segmentCount) segmentCount.textContent = this.currentNetwork.pipes.length.toString();

    // Update machine list
    if (machineList) {
      machineList.innerHTML = '';

      // Add hydro generators
      for (const hydroTile of this.currentNetwork.connectedHydroGenerators) {
        const info = this.getHydroGeneratorInfo?.(hydroTile);
        const item = document.createElement('div');
        item.className = 'pipe-machine-item hydro';
        item.innerHTML = `
          <span class="machine-name">Hydro Generator (Tile ${hydroTile})</span>
          <span class="machine-status ${info?.active ? 'active' : 'inactive'}">
            ${info?.active ? 'Active' : 'Inactive'}
          </span>
        `;
        machineList.appendChild(item);
      }

      // Add steam engines
      for (const steamTile of this.currentNetwork.connectedSteamEngines) {
        const info = this.getSteamEngineInfo?.(steamTile);
        const item = document.createElement('div');
        item.className = 'pipe-machine-item steam';
        item.innerHTML = `
          <span class="machine-name">Steam Engine (Tile ${steamTile})</span>
          <span class="machine-status ${info?.isRunning ? 'active' : 'inactive'}">
            ${info?.isRunning ? 'Running' : info?.hasFuel ? 'Has Fuel' : 'No Fuel'}
          </span>
        `;
        machineList.appendChild(item);
      }

      if (machineList.children.length === 0) {
        machineList.innerHTML = '<p style="color: #666; text-align: center; font-size: 12px;">No machines connected</p>';
      }
    }
  }
}
