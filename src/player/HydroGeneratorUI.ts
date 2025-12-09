import { PlacedHydroGenerator } from '../planet/HydroGenerator';
import { MenuManager } from './MenuManager';

export class HydroGeneratorUI {
  private currentHydroGenerator: PlacedHydroGenerator | null = null;
  private hydroGeneratorSectionElement: HTMLElement | null = null;
  private isOpen: boolean = false;
  private onCloseCallback: (() => void) | null = null;
  private onOpenInventoryCallback: (() => void) | null = null;

  // UI Elements
  private waterInElement: HTMLElement | null = null;
  private poweredElement: HTMLElement | null = null;
  private waterOutElement: HTMLElement | null = null;
  private statusIndicatorElement: HTMLElement | null = null;

  // Water animation
  private waterCanvas: HTMLCanvasElement | null = null;
  private waterCtx: CanvasRenderingContext2D | null = null;
  private animationFrameId: number | null = null;
  private waterLevel: number = 0; // 0-1, current fill level
  private targetWaterLevel: number = 0; // Target fill level based on hydro generator state
  private waveOffset: number = 0;
  private turbineRotation: number = 0;
  private lastAnimationTime: number = 0;

  // Connection status callback
  private isConnectedToSteamEngine: ((hydroTileIndex: number) => boolean) | null = null;
  private connectedToSteam: boolean = false;

  constructor() {
    this.createUI();
    this.setupKeyboardHandler();

    // Register with MenuManager for centralized menu handling
    MenuManager.registerMenu('hydro-generator', {
      isOpen: () => this.isOpen,
      close: () => this.close(),
    });
  }

  private createUI(): void {
    // Create the hydro generator section to be added to inventory menu
    this.hydroGeneratorSectionElement = document.createElement('div');
    this.hydroGeneratorSectionElement.id = 'hydro-generator-section';
    this.hydroGeneratorSectionElement.className = 'hydro-generator-section';
    this.hydroGeneratorSectionElement.innerHTML = `
      <h3>Hydro Generator</h3>

      <div class="hydro-status-container">
        <div class="hydro-status-indicator" id="hydro-status-indicator">
          <span class="status-dot"></span>
          <span class="status-text">Inactive</span>
        </div>

        <div class="hydro-water-visual">
          <canvas id="hydro-water-canvas" width="120" height="80"></canvas>
        </div>

        <div class="hydro-stats">
          <div class="hydro-stat">
            <span class="stat-label">Water In:</span>
            <span class="stat-value" id="hydro-water-in">0 units/s</span>
          </div>

          <div class="hydro-stat">
            <span class="stat-label">Turbine:</span>
            <span class="stat-value" id="hydro-powered">Disconnected</span>
          </div>

          <div class="hydro-stat">
            <span class="stat-label">Water Out:</span>
            <span class="stat-value" id="hydro-water-out">0 units/s</span>
          </div>
        </div>

        <div class="hydro-info">
          <p>Water Depth: <span id="hydro-water-depth">0</span> blocks</p>
        </div>
      </div>

      <div class="hydro-hint">
        <p>Must be placed on water to function</p>
      </div>
    `;

    // Insert into inventory menu container (next to crafting section)
    const inventoryContainer = document.querySelector('.inventory-container');
    if (inventoryContainer) {
      const inventorySection = inventoryContainer.querySelector('.inventory-section');
      if (inventorySection) {
        inventoryContainer.insertBefore(this.hydroGeneratorSectionElement, inventorySection);
      } else {
        inventoryContainer.appendChild(this.hydroGeneratorSectionElement);
      }
    }

    // Get UI elements
    this.waterInElement = document.getElementById('hydro-water-in');
    this.poweredElement = document.getElementById('hydro-powered');
    this.waterOutElement = document.getElementById('hydro-water-out');
    this.statusIndicatorElement = document.getElementById('hydro-status-indicator');

    // Get canvas for water animation
    this.waterCanvas = document.getElementById('hydro-water-canvas') as HTMLCanvasElement;
    if (this.waterCanvas) {
      this.waterCtx = this.waterCanvas.getContext('2d');
    }

    // Add styles
    this.addStyles();

    // Initially hide hydro generator section
    this.hydroGeneratorSectionElement.style.display = 'none';
  }

  private addStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .hydro-generator-section {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 0 15px;
        border-left: 1px solid #444;
        margin-left: 15px;
        min-width: 180px;
      }

      .hydro-generator-section h3 {
        font-size: 14px;
        color: #4488FF;
        margin-bottom: 10px;
      }

      .hydro-status-container {
        display: flex;
        flex-direction: column;
        gap: 15px;
        padding: 10px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
        width: 100%;
      }

      .hydro-status-indicator {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: rgba(0, 0, 0, 0.4);
        border-radius: 4px;
        justify-content: center;
      }

      .hydro-status-indicator .status-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #666;
        box-shadow: 0 0 4px rgba(0, 0, 0, 0.5);
      }

      .hydro-status-indicator.active .status-dot {
        background: #44FF44;
        box-shadow: 0 0 8px rgba(68, 255, 68, 0.5);
        animation: pulse 1.5s ease-in-out infinite;
      }

      .hydro-status-indicator.inactive .status-dot {
        background: #FF4444;
        box-shadow: 0 0 4px rgba(255, 68, 68, 0.3);
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }

      .hydro-status-indicator .status-text {
        font-size: 14px;
        font-weight: bold;
        color: #fff;
      }

      .hydro-water-visual {
        display: flex;
        justify-content: center;
        padding: 10px 0;
      }

      .hydro-water-visual canvas {
        border: 2px solid #333;
        border-radius: 4px;
        background: #1a1a2e;
      }

      .hydro-stats {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .hydro-stat {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 4px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .hydro-stat:last-child {
        border-bottom: none;
      }

      .hydro-stat .stat-label {
        color: #888;
        font-size: 12px;
      }

      .hydro-stat .stat-value {
        color: #4488FF;
        font-size: 12px;
        font-weight: bold;
      }

      .hydro-info {
        text-align: center;
        padding-top: 10px;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
      }

      .hydro-info p {
        color: #888;
        font-size: 11px;
        margin: 0;
      }

      .hydro-info span {
        color: #4488FF;
        font-weight: bold;
      }

      .hydro-hint {
        margin-top: 10px;
        padding: 8px;
        background: rgba(0, 0, 0, 0.2);
        border-radius: 4px;
      }

      .hydro-hint p {
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

  public open(hydroGenerator: PlacedHydroGenerator): void {
    this.currentHydroGenerator = hydroGenerator;
    this.isOpen = true;

    // Check if connected to steam engine
    this.connectedToSteam = this.isConnectedToSteamEngine?.(hydroGenerator.tileIndex) ?? false;

    // Reset water level to start filling animation
    this.waterLevel = 0;
    this.targetWaterLevel = hydroGenerator.isActive ? 0.75 : 0;
    this.waveOffset = 0;
    this.turbineRotation = 0;
    this.lastAnimationTime = performance.now();

    // Show hydro generator section
    if (this.hydroGeneratorSectionElement) {
      this.hydroGeneratorSectionElement.style.display = 'flex';
    }

    // Open inventory menu if not already open
    if (this.onOpenInventoryCallback) {
      this.onOpenInventoryCallback();
    }

    this.updateUI();
    this.startWaterAnimation();
  }

  public close(): void {
    this.currentHydroGenerator = null;
    this.isOpen = false;

    // Stop water animation
    this.stopWaterAnimation();

    // Hide hydro generator section
    if (this.hydroGeneratorSectionElement) {
      this.hydroGeneratorSectionElement.style.display = 'none';
    }

    if (this.onCloseCallback) {
      this.onCloseCallback();
    }
  }

  public isMenuOpen(): boolean {
    return this.isOpen;
  }

  public getCurrentHydroGenerator(): PlacedHydroGenerator | null {
    return this.currentHydroGenerator;
  }

  public setOnCloseCallback(callback: () => void): void {
    this.onCloseCallback = callback;
  }

  public setOnOpenInventoryCallback(callback: () => void): void {
    this.onOpenInventoryCallback = callback;
  }

  public setConnectionCallback(callback: (hydroTileIndex: number) => boolean): void {
    this.isConnectedToSteamEngine = callback;
  }

  private updateUI(): void {
    if (!this.currentHydroGenerator) return;

    const hg = this.currentHydroGenerator;

    // Re-check connection status
    this.connectedToSteam = this.isConnectedToSteamEngine?.(hg.tileIndex) ?? false;

    // Determine overall status: needs water AND connection to be fully online
    const isOnline = hg.isActive && this.connectedToSteam;

    // Update status indicator
    if (this.statusIndicatorElement) {
      this.statusIndicatorElement.classList.remove('active', 'inactive');
      this.statusIndicatorElement.classList.add(isOnline ? 'active' : 'inactive');
      const statusText = this.statusIndicatorElement.querySelector('.status-text');
      if (statusText) {
        if (isOnline) {
          statusText.textContent = 'Online';
        } else if (!hg.isActive) {
          statusText.textContent = 'No Water';
        } else {
          statusText.textContent = 'Offline';
        }
      }
    }

    // Update water in
    if (this.waterInElement) {
      this.waterInElement.textContent = `${hg.waterPumpedIn.toFixed(1)} units/s`;
    }

    // Update turbine/powered status - shows connection to steam engine
    if (this.poweredElement) {
      if (this.connectedToSteam) {
        this.poweredElement.textContent = 'Connected';
        this.poweredElement.style.color = '#44FF44';
      } else {
        this.poweredElement.textContent = 'Disconnected';
        this.poweredElement.style.color = '#FF4444';
      }
    }

    // Update water out - only output if connected to steam engine
    if (this.waterOutElement) {
      if (this.connectedToSteam && hg.isActive) {
        this.waterOutElement.textContent = `${hg.waterPumpedOut.toFixed(1)} units/s`;
      } else {
        this.waterOutElement.textContent = '0 units/s';
      }
    }

    // Update water depth
    const depthElement = document.getElementById('hydro-water-depth');
    if (depthElement) {
      depthElement.textContent = Math.round(hg.waterDepth).toString();
    }
  }

  private startWaterAnimation(): void {
    if (this.animationFrameId !== null) return;

    const animate = (currentTime: number) => {
      if (!this.isOpen) return;

      const deltaTime = (currentTime - this.lastAnimationTime) / 1000;
      this.lastAnimationTime = currentTime;

      // Update water level - slowly fill up
      const fillSpeed = 0.15; // Fill rate per second
      if (this.waterLevel < this.targetWaterLevel) {
        this.waterLevel = Math.min(this.targetWaterLevel, this.waterLevel + fillSpeed * deltaTime);
      } else if (this.waterLevel > this.targetWaterLevel) {
        this.waterLevel = Math.max(this.targetWaterLevel, this.waterLevel - fillSpeed * deltaTime);
      }

      // Update wave animation
      this.waveOffset += deltaTime * 2;

      // Update turbine rotation only if connected to steam engine and has water
      if (this.connectedToSteam && this.currentHydroGenerator?.isActive) {
        this.turbineRotation += deltaTime * 3;
      }

      this.drawWaterAnimation();

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  private stopWaterAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private drawWaterAnimation(): void {
    if (!this.waterCanvas || !this.waterCtx) return;

    const ctx = this.waterCtx;
    const width = this.waterCanvas.width;
    const height = this.waterCanvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw background (tank interior)
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, width, height);

    // Calculate water height
    const waterHeight = height * this.waterLevel;
    const waterTop = height - waterHeight;

    if (this.waterLevel > 0.01) {
      // Draw water body with gradient
      const waterGradient = ctx.createLinearGradient(0, waterTop, 0, height);
      waterGradient.addColorStop(0, 'rgba(30, 100, 150, 0.9)');
      waterGradient.addColorStop(0.5, 'rgba(20, 80, 130, 0.95)');
      waterGradient.addColorStop(1, 'rgba(10, 50, 100, 1)');

      ctx.fillStyle = waterGradient;
      ctx.fillRect(0, waterTop, width, waterHeight);

      // Draw animated waves at water surface
      ctx.beginPath();
      ctx.moveTo(0, waterTop);

      for (let x = 0; x <= width; x += 2) {
        const wave1 = Math.sin((x * 0.1) + this.waveOffset) * 2;
        const wave2 = Math.sin((x * 0.15) + this.waveOffset * 1.3) * 1.5;
        const waveY = waterTop + wave1 + wave2;
        ctx.lineTo(x, waveY);
      }

      ctx.lineTo(width, waterTop);
      ctx.lineTo(width, waterTop - 10);
      ctx.lineTo(0, waterTop - 10);
      ctx.closePath();

      // Fill wave top with lighter color
      const waveGradient = ctx.createLinearGradient(0, waterTop - 5, 0, waterTop + 5);
      waveGradient.addColorStop(0, 'rgba(60, 140, 200, 0.3)');
      waveGradient.addColorStop(1, 'rgba(30, 100, 150, 0.9)');
      ctx.fillStyle = waveGradient;
      ctx.fill();

      // Draw some bubble particles
      ctx.fillStyle = 'rgba(150, 200, 255, 0.3)';
      const bubbleCount = Math.floor(this.waterLevel * 5);
      for (let i = 0; i < bubbleCount; i++) {
        const bubbleX = (Math.sin(this.waveOffset * 0.5 + i * 1.7) * 0.5 + 0.5) * width;
        const bubbleY = waterTop + (Math.cos(this.waveOffset + i * 2.3) * 0.5 + 0.5) * waterHeight * 0.7;
        const bubbleRadius = 1 + Math.sin(this.waveOffset + i) * 0.5;
        ctx.beginPath();
        ctx.arc(bubbleX, bubbleY, bubbleRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw turbine in the center
    this.drawTurbine(ctx, width / 2, height / 2);

    // Draw tank frame
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, width - 2, height - 2);

    // Draw inlet/outlet pipes
    ctx.fillStyle = '#555';
    // Left inlet pipe
    ctx.fillRect(0, height * 0.3 - 4, 8, 8);
    ctx.fillStyle = '#333';
    ctx.fillRect(2, height * 0.3 - 2, 4, 4);

    // Right outlet pipe
    ctx.fillStyle = '#555';
    ctx.fillRect(width - 8, height * 0.3 - 4, 8, 8);
    ctx.fillStyle = '#333';
    ctx.fillRect(width - 6, height * 0.3 - 2, 4, 4);
  }

  private drawTurbine(ctx: CanvasRenderingContext2D, cx: number, cy: number): void {
    const bladeCount = 6;
    const bladeLength = 18;
    const bladeWidth = 4;
    const hubRadius = 6;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(this.turbineRotation);

    // Draw blades
    for (let i = 0; i < bladeCount; i++) {
      const angle = (i / bladeCount) * Math.PI * 2;
      ctx.save();
      ctx.rotate(angle);

      // Blade shape
      ctx.fillStyle = '#666';
      ctx.beginPath();
      ctx.moveTo(hubRadius, -bladeWidth / 2);
      ctx.lineTo(hubRadius + bladeLength, -bladeWidth / 3);
      ctx.lineTo(hubRadius + bladeLength, bladeWidth / 3);
      ctx.lineTo(hubRadius, bladeWidth / 2);
      ctx.closePath();
      ctx.fill();

      // Blade highlight
      ctx.fillStyle = '#888';
      ctx.beginPath();
      ctx.moveTo(hubRadius, -bladeWidth / 2);
      ctx.lineTo(hubRadius + bladeLength * 0.7, -bladeWidth / 3);
      ctx.lineTo(hubRadius + bladeLength * 0.7, 0);
      ctx.lineTo(hubRadius, 0);
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }

    // Draw hub
    ctx.beginPath();
    ctx.arc(0, 0, hubRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#555';
    ctx.fill();
    ctx.strokeStyle = '#777';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw center bolt
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#888';
    ctx.fill();

    ctx.restore();
  }
}
