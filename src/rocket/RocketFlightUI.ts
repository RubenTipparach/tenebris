import { RocketController } from './RocketController';
import { RocketState, STATE_INFO } from './RocketState';

/**
 * Flight HUD for rocket control
 * Displays altitude, velocity, fuel, throttle, TWR, delta-V, health, etc.
 */
export class RocketFlightUI {
  private container: HTMLElement | null = null;
  private isVisible: boolean = false;

  // UI element references
  private altitudeEl: HTMLElement | null = null;
  private velocityEl: HTMLElement | null = null;
  private verticalVelEl: HTMLElement | null = null;
  private gravityEl: HTMLElement | null = null;
  private fuelBarEl: HTMLElement | null = null;
  private fuelPercentEl: HTMLElement | null = null;
  private throttleBarEl: HTMLElement | null = null;
  private throttlePercentEl: HTMLElement | null = null;
  private twrEl: HTMLElement | null = null;
  private burnTimeEl: HTMLElement | null = null;
  private deltaVEl: HTMLElement | null = null;
  private healthBarEl: HTMLElement | null = null;
  private healthPercentEl: HTMLElement | null = null;
  private stateEl: HTMLElement | null = null;
  private thrustIndicatorEl: HTMLElement | null = null;
  private landingStatusEl: HTMLElement | null = null;

  // Buttons
  private fuelBtn: HTMLButtonElement | null = null;
  private launchBtn: HTMLButtonElement | null = null;
  private exitBtn: HTMLButtonElement | null = null;
  private respawnBtn: HTMLButtonElement | null = null;

  // Crash overlay
  private crashOverlay: HTMLElement | null = null;

  // Callbacks
  private onFuelCallback: (() => void) | null = null;
  private onLaunchCallback: (() => void) | null = null;
  private onExitCallback: (() => void) | null = null;
  private onRespawnCallback: (() => void) | null = null;

  constructor() {
    this.createUI();
    this.addStyles();
  }

  private createUI(): void {
    this.container = document.createElement('div');
    this.container.id = 'rocket-flight-ui';
    this.container.className = 'rocket-flight-ui';

    this.container.innerHTML = `
      <div class="flight-ui-header">
        <div class="flight-state" id="flight-state">DOCKED</div>
        <div class="thrust-indicator" id="thrust-indicator">THRUST OFF</div>
      </div>

      <div class="flight-ui-main">
        <div class="flight-data-panel">
          <div class="data-row">
            <span class="data-label">ALTITUDE</span>
            <span class="data-value" id="flight-altitude">0 m</span>
          </div>
          <div class="data-row">
            <span class="data-label">VELOCITY</span>
            <span class="data-value" id="flight-velocity">0 m/s</span>
          </div>
          <div class="data-row">
            <span class="data-label">VERTICAL</span>
            <span class="data-value" id="flight-vertical">0 m/s</span>
          </div>
          <div class="data-row">
            <span class="data-label">GRAVITY</span>
            <span class="data-value" id="flight-gravity">None</span>
          </div>
        </div>

        <div class="flight-gauges-panel">
          <div class="gauge-row">
            <span class="gauge-label">FUEL</span>
            <div class="gauge-bar-container">
              <div class="gauge-bar fuel-bar" id="flight-fuel-bar"></div>
            </div>
            <span class="gauge-value" id="flight-fuel-percent">100%</span>
          </div>

          <div class="gauge-row">
            <span class="gauge-label">THROTTLE</span>
            <div class="gauge-bar-container">
              <div class="gauge-bar throttle-bar" id="flight-throttle-bar"></div>
            </div>
            <span class="gauge-value" id="flight-throttle-percent">0%</span>
          </div>

          <div class="gauge-row">
            <span class="gauge-label">HEALTH</span>
            <div class="gauge-bar-container">
              <div class="gauge-bar health-bar" id="flight-health-bar"></div>
            </div>
            <span class="gauge-value" id="flight-health-percent">100%</span>
          </div>
        </div>

        <div class="flight-stats-panel">
          <div class="stat-row">
            <span class="stat-label">TWR</span>
            <span class="stat-value" id="flight-twr">0.00</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">BURN TIME</span>
            <span class="stat-value" id="flight-burn-time">--:--</span>
          </div>
          <div class="stat-row">
            <span class="stat-label">DELTA-V</span>
            <span class="stat-value" id="flight-delta-v">0 m/s</span>
          </div>
        </div>
      </div>

      <div class="landing-indicator" id="landing-indicator">
        <span class="landing-label">LANDING:</span>
        <span class="landing-status" id="landing-status">SAFE</span>
      </div>

      <div class="flight-ui-controls">
        <button class="flight-btn" id="flight-fuel-btn">FUEL</button>
        <button class="flight-btn launch-btn" id="flight-launch-btn">THRUST</button>
        <button class="flight-btn" id="flight-exit-btn">EXIT [V]</button>
      </div>

      <div class="flight-ui-hints">
        <span>WASD: Rotate | Q/E: Roll | Arrows: Strafe | Z/X: Throttle | Space: Thrust</span>
      </div>

      <div class="crash-overlay" id="crash-overlay" style="display: none;">
        <div class="crash-message">
          <h1>YOU CRASHED</h1>
          <p>Your rocket was destroyed.</p>
          <button class="respawn-btn" id="respawn-btn">RESPAWN</button>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);

    // Get element references
    this.stateEl = document.getElementById('flight-state');
    this.thrustIndicatorEl = document.getElementById('thrust-indicator');
    this.altitudeEl = document.getElementById('flight-altitude');
    this.velocityEl = document.getElementById('flight-velocity');
    this.verticalVelEl = document.getElementById('flight-vertical');
    this.gravityEl = document.getElementById('flight-gravity');
    this.fuelBarEl = document.getElementById('flight-fuel-bar');
    this.fuelPercentEl = document.getElementById('flight-fuel-percent');
    this.throttleBarEl = document.getElementById('flight-throttle-bar');
    this.throttlePercentEl = document.getElementById('flight-throttle-percent');
    this.healthBarEl = document.getElementById('flight-health-bar');
    this.healthPercentEl = document.getElementById('flight-health-percent');
    this.twrEl = document.getElementById('flight-twr');
    this.burnTimeEl = document.getElementById('flight-burn-time');
    this.deltaVEl = document.getElementById('flight-delta-v');

    this.fuelBtn = document.getElementById('flight-fuel-btn') as HTMLButtonElement;
    this.launchBtn = document.getElementById('flight-launch-btn') as HTMLButtonElement;
    this.exitBtn = document.getElementById('flight-exit-btn') as HTMLButtonElement;
    this.respawnBtn = document.getElementById('respawn-btn') as HTMLButtonElement;
    this.crashOverlay = document.getElementById('crash-overlay');
    this.landingStatusEl = document.getElementById('landing-status');

    // Set up button handlers
    this.setupButtonHandlers();

    // Initially hidden
    this.container.style.display = 'none';
  }

  private setupButtonHandlers(): void {
    if (this.fuelBtn) {
      this.fuelBtn.addEventListener('click', () => {
        if (this.onFuelCallback) this.onFuelCallback();
      });
    }

    if (this.launchBtn) {
      this.launchBtn.addEventListener('click', () => {
        if (this.onLaunchCallback) this.onLaunchCallback();
      });
    }

    if (this.exitBtn) {
      this.exitBtn.addEventListener('click', () => {
        if (this.onExitCallback) this.onExitCallback();
      });
    }

    if (this.respawnBtn) {
      this.respawnBtn.addEventListener('click', () => {
        if (this.onRespawnCallback) this.onRespawnCallback();
      });
    }
  }

  public setOnRespawnCallback(callback: () => void): void {
    this.onRespawnCallback = callback;
  }

  private addStyles(): void {
    const styleId = 'rocket-flight-ui-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .rocket-flight-ui {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(10, 10, 15, 0.9);
        border: 2px solid #444;
        border-radius: 8px;
        padding: 15px;
        font-family: 'Courier New', monospace;
        color: #ddd;
        min-width: 400px;
        z-index: 1000;
        user-select: none;
      }

      .flight-ui-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        padding-bottom: 8px;
        border-bottom: 1px solid #444;
      }

      .flight-state {
        font-size: 14px;
        font-weight: bold;
        color: #88aaff;
        text-transform: uppercase;
      }

      .thrust-indicator {
        font-size: 12px;
        padding: 4px 10px;
        border-radius: 4px;
        background: #333;
        color: #666;
      }

      .thrust-indicator.active {
        background: #553311;
        color: #ffaa44;
        animation: pulse-thrust 0.5s infinite;
      }

      @keyframes pulse-thrust {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      .flight-ui-main {
        display: flex;
        gap: 20px;
        margin-bottom: 15px;
      }

      .flight-data-panel {
        flex: 1;
      }

      .data-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 5px;
      }

      .data-label {
        font-size: 10px;
        color: #888;
      }

      .data-value {
        font-size: 12px;
        color: #ddd;
        font-weight: bold;
      }

      .flight-gauges-panel {
        flex: 1.5;
      }

      .gauge-row {
        display: flex;
        align-items: center;
        margin-bottom: 8px;
        gap: 8px;
      }

      .gauge-label {
        font-size: 10px;
        color: #888;
        width: 60px;
      }

      .gauge-bar-container {
        flex: 1;
        height: 12px;
        background: #222;
        border-radius: 3px;
        overflow: hidden;
        border: 1px solid #444;
      }

      .gauge-bar {
        height: 100%;
        transition: width 0.1s ease-out;
      }

      .fuel-bar {
        background: linear-gradient(90deg, #44aa44, #66cc66);
        width: 100%;
      }

      .throttle-bar {
        background: linear-gradient(90deg, #aa8844, #ccaa66);
        width: 0%;
      }

      .health-bar {
        background: linear-gradient(90deg, #44aa44, #66cc66);
        width: 100%;
      }

      .health-bar.warning {
        background: linear-gradient(90deg, #aa8844, #ccaa66);
      }

      .health-bar.critical {
        background: linear-gradient(90deg, #aa4444, #cc6666);
      }

      .gauge-value {
        font-size: 11px;
        width: 40px;
        text-align: right;
      }

      .flight-stats-panel {
        flex: 0.8;
        border-left: 1px solid #333;
        padding-left: 15px;
      }

      .stat-row {
        display: flex;
        flex-direction: column;
        margin-bottom: 8px;
      }

      .stat-label {
        font-size: 9px;
        color: #666;
      }

      .stat-value {
        font-size: 14px;
        font-weight: bold;
        color: #aaddff;
      }

      .stat-value.good {
        color: #66ff66;
      }

      .stat-value.warning {
        color: #ffaa44;
      }

      .stat-value.bad {
        color: #ff6666;
      }

      .flight-ui-controls {
        display: flex;
        justify-content: center;
        gap: 15px;
        margin-bottom: 10px;
      }

      .flight-btn {
        background: linear-gradient(180deg, #444 0%, #333 100%);
        border: 2px solid #555;
        border-radius: 6px;
        color: #ddd;
        padding: 8px 20px;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s;
        font-family: 'Courier New', monospace;
        font-weight: bold;
      }

      .flight-btn:hover:not(:disabled) {
        background: linear-gradient(180deg, #555 0%, #444 100%);
        border-color: #666;
      }

      .flight-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      .flight-btn.launch-btn {
        background: linear-gradient(180deg, #553322 0%, #442211 100%);
        border-color: #774433;
        color: #ffcc88;
      }

      .flight-btn.launch-btn:hover:not(:disabled) {
        background: linear-gradient(180deg, #664433 0%, #553322 100%);
      }

      .flight-btn.launch-btn.active {
        background: linear-gradient(180deg, #884422 0%, #663311 100%);
        border-color: #aa6644;
        box-shadow: 0 0 10px rgba(255, 150, 50, 0.5);
      }

      .flight-ui-hints {
        text-align: center;
        font-size: 10px;
        color: #555;
        border-top: 1px solid #333;
        padding-top: 8px;
      }

      /* Landing indicator styles */
      .landing-indicator {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 10px;
        padding: 8px 0;
        margin-bottom: 10px;
        border-bottom: 1px solid #333;
      }

      .landing-label {
        font-size: 12px;
        color: #888;
        font-weight: bold;
      }

      .landing-status {
        font-size: 14px;
        font-weight: bold;
        padding: 4px 12px;
        border-radius: 4px;
        text-transform: uppercase;
        letter-spacing: 1px;
      }

      .landing-status.safe {
        background: rgba(68, 170, 68, 0.3);
        color: #66ff66;
        border: 1px solid #44aa44;
      }

      .landing-status.warning {
        background: rgba(170, 136, 68, 0.3);
        color: #ffaa44;
        border: 1px solid #aa8844;
      }

      .landing-status.danger {
        background: rgba(170, 68, 68, 0.3);
        color: #ff6666;
        border: 1px solid #aa4444;
        animation: danger-pulse 0.5s infinite;
      }

      @keyframes danger-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      /* Crash overlay styles */
      .crash-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2000;
        animation: crash-fade-in 0.5s ease-out;
      }

      @keyframes crash-fade-in {
        from { opacity: 0; }
        to { opacity: 1; }
      }

      .crash-message {
        text-align: center;
        color: #fff;
        animation: crash-shake 0.5s ease-out;
      }

      @keyframes crash-shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
      }

      .crash-message h1 {
        font-size: 48px;
        color: #ff4444;
        text-shadow: 0 0 20px rgba(255, 68, 68, 0.8), 0 0 40px rgba(255, 68, 68, 0.4);
        margin-bottom: 10px;
        font-family: 'Courier New', monospace;
        letter-spacing: 4px;
      }

      .crash-message p {
        font-size: 18px;
        color: #aaa;
        margin-bottom: 30px;
        font-family: 'Courier New', monospace;
      }

      .respawn-btn {
        background: linear-gradient(180deg, #553322 0%, #442211 100%);
        border: 2px solid #774433;
        border-radius: 8px;
        color: #ffcc88;
        padding: 15px 40px;
        font-size: 18px;
        cursor: pointer;
        transition: all 0.3s;
        font-family: 'Courier New', monospace;
        font-weight: bold;
        letter-spacing: 2px;
      }

      .respawn-btn:hover {
        background: linear-gradient(180deg, #664433 0%, #553322 100%);
        border-color: #aa6644;
        box-shadow: 0 0 20px rgba(255, 150, 50, 0.5);
        transform: scale(1.05);
      }
    `;

    document.head.appendChild(style);
  }

  /**
   * Update the HUD with current rocket data
   */
  public update(rocket: RocketController): void {
    if (!this.isVisible) return;

    const state = rocket.getState();
    const stateInfo = STATE_INFO[state];

    // Check for crash state and show overlay after delay
    if (state === RocketState.CRASHED) {
      const timeSinceCrash = rocket.getTimeSinceCrash();
      // Show crash overlay after 2 seconds to let player watch explosion
      if (timeSinceCrash > 2.0 && this.crashOverlay) {
        this.crashOverlay.style.display = 'flex';
      }
      return; // Don't update other UI elements when crashed
    } else {
      // Hide crash overlay if not crashed
      if (this.crashOverlay) {
        this.crashOverlay.style.display = 'none';
      }
    }

    // Update state display
    if (this.stateEl) {
      this.stateEl.textContent = stateInfo.displayName.toUpperCase();
    }

    // Update thrust indicator
    if (this.thrustIndicatorEl) {
      const isThrusting = rocket.isThrustOn() && rocket.getThrottle() > 0;
      this.thrustIndicatorEl.textContent = isThrusting ? 'THRUST ON' : 'THRUST OFF';
      this.thrustIndicatorEl.classList.toggle('active', isThrusting);
    }

    // Update altitude
    if (this.altitudeEl) {
      const altitude = rocket.getAltitude();
      this.altitudeEl.textContent = this.formatDistance(altitude);
    }

    // Update velocity
    if (this.velocityEl) {
      const velocity = rocket.getVelocity().length();
      this.velocityEl.textContent = `${velocity.toFixed(1)} m/s`;
    }

    // Update vertical velocity
    if (this.verticalVelEl) {
      const vertVel = rocket.getVerticalVelocity();
      const sign = vertVel >= 0 ? '+' : '';
      this.verticalVelEl.textContent = `${sign}${vertVel.toFixed(1)} m/s`;
      this.verticalVelEl.style.color = vertVel >= 0 ? '#66ff66' : '#ff6666';
    }

    // Update gravity
    if (this.gravityEl) {
      const gravity = rocket.getGravityInfo();
      const gForce = gravity.magnitude / 9.81;
      if (gravity.isInGravityWell) {
        this.gravityEl.textContent = `${gravity.sourceName} (${gForce.toFixed(2)}g)`;
      } else {
        this.gravityEl.textContent = 'None (0g)';
      }
    }

    // Update fuel bar
    const fuelPercent = rocket.getFuelPercent();
    if (this.fuelBarEl) {
      this.fuelBarEl.style.width = `${fuelPercent}%`;
    }
    if (this.fuelPercentEl) {
      this.fuelPercentEl.textContent = `${fuelPercent.toFixed(0)}%`;
    }

    // Update throttle bar
    const throttle = rocket.getThrottle() * 100;
    if (this.throttleBarEl) {
      this.throttleBarEl.style.width = `${throttle}%`;
    }
    if (this.throttlePercentEl) {
      this.throttlePercentEl.textContent = `${throttle.toFixed(0)}%`;
    }

    // Update health bar
    const healthPercent = rocket.getHealthPercent();
    if (this.healthBarEl) {
      this.healthBarEl.style.width = `${healthPercent}%`;
      this.healthBarEl.classList.remove('warning', 'critical');
      if (healthPercent < 25) {
        this.healthBarEl.classList.add('critical');
      } else if (healthPercent < 50) {
        this.healthBarEl.classList.add('warning');
      }
    }
    if (this.healthPercentEl) {
      this.healthPercentEl.textContent = `${healthPercent.toFixed(0)}%`;
    }

    // Update TWR
    if (this.twrEl) {
      const twr = rocket.getThrustToWeightRatio();
      if (twr === Infinity) {
        this.twrEl.textContent = 'N/A';
        this.twrEl.className = 'stat-value';
      } else {
        this.twrEl.textContent = twr.toFixed(2);
        this.twrEl.className = 'stat-value';
        if (twr >= 1.0) {
          this.twrEl.classList.add('good');
        } else if (twr >= 0.5) {
          this.twrEl.classList.add('warning');
        } else {
          this.twrEl.classList.add('bad');
        }
      }
    }

    // Update burn time
    if (this.burnTimeEl) {
      const burnTime = rocket.getBurnTimeRemaining();
      this.burnTimeEl.textContent = this.formatTime(burnTime);
    }

    // Update delta-V
    if (this.deltaVEl) {
      const deltaV = rocket.getRemainingDeltaV();
      this.deltaVEl.textContent = `${deltaV.toFixed(0)} m/s`;
    }

    // Update button states
    if (this.fuelBtn) {
      this.fuelBtn.disabled = !stateInfo.canFuel;
    }
    if (this.launchBtn) {
      this.launchBtn.disabled = !stateInfo.canThrust;
      this.launchBtn.classList.toggle('active', rocket.isThrustOn());
      this.launchBtn.textContent = rocket.isThrustOn() ? 'THRUST ON' : 'THRUST OFF';
    }
    if (this.exitBtn) {
      this.exitBtn.disabled = !stateInfo.canExit;
    }

    // Update landing safety indicator
    if (this.landingStatusEl) {
      const safety = rocket.getLandingSafetyInfo();
      const vertVel = rocket.getVerticalVelocity();

      // Remove all status classes
      this.landingStatusEl.classList.remove('safe', 'warning', 'danger');

      if (!safety.orientationSafe) {
        // Wrong orientation - will crash
        this.landingStatusEl.textContent = 'WRONG ANGLE';
        this.landingStatusEl.classList.add('danger');
      } else if (!safety.velocitySafe) {
        // Too fast - will crash
        this.landingStatusEl.textContent = `TOO FAST (${safety.impactVelocity.toFixed(1)} m/s)`;
        this.landingStatusEl.classList.add('danger');
      } else if (vertVel < -2) {
        // Descending but within safe range - warning
        this.landingStatusEl.textContent = `OK (${safety.impactVelocity.toFixed(1)} m/s)`;
        this.landingStatusEl.classList.add('warning');
      } else {
        // Safe
        this.landingStatusEl.textContent = 'SAFE';
        this.landingStatusEl.classList.add('safe');
      }
    }
  }

  /**
   * Format distance for display
   */
  private formatDistance(meters: number): string {
    if (meters === Infinity) return 'N/A';
    if (meters >= 10000) {
      return `${(meters / 1000).toFixed(1)} km`;
    }
    return `${meters.toFixed(0)} m`;
  }

  /**
   * Format time for display
   */
  private formatTime(seconds: number): string {
    if (seconds === Infinity || isNaN(seconds)) return '--:--';
    if (seconds <= 0) return '0:00';

    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);

    if (mins >= 60) {
      const hours = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return `${hours}h ${remainingMins}m`;
    }

    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Show the flight UI
   */
  public show(): void {
    if (this.container) {
      this.container.style.display = 'block';
      this.isVisible = true;
    }
  }

  /**
   * Hide the flight UI
   */
  public hide(): void {
    if (this.container) {
      this.container.style.display = 'none';
      this.isVisible = false;
    }
  }

  /**
   * Check if UI is visible
   */
  public isShown(): boolean {
    return this.isVisible;
  }

  // Callbacks
  public setOnFuelCallback(callback: () => void): void {
    this.onFuelCallback = callback;
  }

  public setOnLaunchCallback(callback: () => void): void {
    this.onLaunchCallback = callback;
  }

  public setOnExitCallback(callback: () => void): void {
    this.onExitCallback = callback;
  }

  /**
   * Dispose of the UI
   */
  public dispose(): void {
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
    this.container = null;
  }
}
