import * as THREE from 'three';
import { planetObjectScene } from '../world/PlanetFrames';
import { RocketController, PlanetGravitySource, RocketInputState } from './RocketController';
import { RocketFlightUI } from './RocketFlightUI';
import { RocketState } from './RocketState';
import { ROCKET_INPUTS } from '../config/RocketConfig';
import { PlacedLaunchPad } from '../planet/LaunchPad';
import { InputManager } from '../engine/InputManager';
import { LandedRocket, LandedRocketManager } from './LandedRocket';
import { LandedRocketUI } from './LandedRocketUI';
import { InventorySlot } from '../player/Inventory';
import { computeRocketStats, stackItemTypes } from './RocketPerformance';

/**
 * Manages the rocket flight mode
 * Integrates RocketController and RocketFlightUI with the game systems
 */
export class RocketFlightManager {
  public readonly scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  public readonly inputManager: InputManager;

  private rocketController: RocketController | null = null;
  private flightUI: RocketFlightUI;
  private isInFlightMode: boolean = false;

  // Landed rocket management
  private landedRocketManager: LandedRocketManager;
  private landedRocketUI: LandedRocketUI;

  // Planet data for gravity
  private planets: PlanetGravitySource[] = [];

  // The pad the active rocket belongs to: it keeps the rocket's fuel and
  // cargo record, saved through onRocketChangedCallback
  private activePad: PlacedLaunchPad | null = null;
  private onRocketChangedCallback: ((pad: PlacedLaunchPad | null) => void) | null = null;
  private onOpenCargoCallback: ((cargo: InventorySlot[]) => void) | null = null;

  /** How a landed rocket's Cargo button opens the hold (beside the inventory) */
  public setOnOpenCargoCallback(callback: (cargo: InventorySlot[]) => void): void {
    this.onOpenCargoCallback = callback;
  }

  // Callbacks
  private onExitFlightCallback: ((exitPosition: THREE.Vector3 | null) => void) | null = null;
  private onRespawnCallback: ((position: THREE.Vector3) => void) | null = null;
  private onBoardRocketCallback: (() => void) | null = null;

  // Input state
  private inputState: RocketInputState = {
    pitchDown: false,
    pitchUp: false,
    yawLeft: false,
    yawRight: false,
    rollLeft: false,
    rollRight: false,
    strafeForward: false,
    strafeBackward: false,
    strafeLeft: false,
    strafeRight: false,
    strafeUp: false,
    strafeDown: false,
    throttleUp: false,
    throttleDown: false,
    thrustToggle: false,
    fuel: false,
    exit: false,
    eject: false,
  };
  private keysPressed: Set<string> = new Set();

  // Mouse drag tracking for camera
  private isMouseDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, inputManager: InputManager) {
    this.scene = scene;
    this.camera = camera;
    this.inputManager = inputManager;

    // Create the flight UI (hidden by default)
    this.flightUI = new RocketFlightUI();

    // Create landed rocket manager and UI
    this.landedRocketManager = new LandedRocketManager(planetObjectScene(scene));
    this.landedRocketUI = new LandedRocketUI();

    // Set up landed rocket UI callbacks
    this.landedRocketUI.setOnBoardCallback((rocket) => {
      this.boardLandedRocket(rocket);
    });

    this.landedRocketUI.setOnRefuelCallback((rocket) => this.refuelLanded(rocket));
    this.landedRocketUI.setOnCargoCallback((rocket) => {
      if (rocket.cargo) this.onOpenCargoCallback?.(rocket.cargo);
    });

    this.landedRocketUI.setOnCloseCallback(() => {
      // Re-lock pointer when closing landed rocket UI
      const container = document.getElementById('game-container');
      if (container) container.requestPointerLock();
    });

    // Set up UI button callbacks
    this.flightUI.setOnFuelCallback(() => {
      if (this.rocketController) {
        this.rocketController.refuel();
      }
    });

    this.flightUI.setOnLaunchCallback(() => {
      // Toggle thrust (same as pressing space)
      this.inputState.thrustToggle = true;
    });

    this.flightUI.setOnExitCallback(() => {
      this.exitFlightMode();
    });

    this.flightUI.setOnRespawnCallback(() => {
      this.respawnAfterCrash();
    });

    // Set up keyboard listeners for flight controls
    this.setupKeyboardListeners();

    // Set up mouse listeners for camera drag
    this.setupMouseListeners();
  }

  /**
   * Register a planet for gravity calculations
   * @param getSurfaceHeight Optional callback to get actual terrain height at a direction
   */
  public addPlanet(
    name: string,
    center: THREE.Vector3,
    radius: number,
    gravityStrength: number = 1.0,
    getSurfaceHeight?: (direction: THREE.Vector3) => number
  ): void {
    this.planets.push({
      name,
      center: center.clone(),
      radius,
      gravityStrength,
      getSurfaceHeight,
    });
    // Also update landed rocket manager
    this.landedRocketManager.setPlanets(this.planets);
  }

  /** A body moved on its orbit: gravity and landings use its live centre. */
  public setPlanetCenter(name: string, center: THREE.Vector3): void {
    for (const p of this.planets) if (p.name === name) p.center.copy(center);
  }

  /**
   * Set callback for when a rocket's fuel or cargo changed (save its pad)
   */
  public setOnRocketChangedCallback(callback: (pad: PlacedLaunchPad | null) => void): void {
    this.onRocketChangedCallback = callback;
  }

  /** Write the active rocket's fuel back to its pad and save */
  private recordActiveRocket(): void {
    if (!this.rocketController) return;
    if (this.activePad) {
      this.activePad.fuel = this.rocketController.getFuelUnits();
      this.activePad.engineMode = this.rocketController.getEngineMode();
    }
    this.onRocketChangedCallback?.(this.activePad);
  }

  /** The cargo hold of the rocket being flown (null when not flying) */
  public getActiveCargo(): InventorySlot[] | null {
    return this.rocketController?.getCargo() ?? null;
  }

  /**
   * Refuel a landed rocket from outside (its panel's Refuel button): the same
   * fuel source as refuelling on board
   */
  public refuelLanded(rocket: LandedRocket): void {
    const stats = computeRocketStats(stackItemTypes(rocket.parts));
    const have = (rocket.fuelPercent / 100) * stats.fuelCapacity;
    const wanted = stats.fuelCapacity - have;
    if (wanted <= 0) return;
    const supplied = RocketController.fuelSource ? RocketController.fuelSource(wanted, rocket.cargo) : wanted;
    if (supplied <= 0) return;
    const fuel = Math.min(stats.fuelCapacity, have + supplied);
    rocket.fuelPercent = stats.fuelCapacity > 0 ? (fuel / stats.fuelCapacity) * 100 : 0;
    if (rocket.pad) rocket.pad.fuel = fuel;
    this.onRocketChangedCallback?.(rocket.pad);
  }

  /**
   * Set callback for when flight mode ends
   */
  public setOnExitFlightCallback(callback: (exitPosition: THREE.Vector3 | null) => void): void {
    this.onExitFlightCallback = callback;
  }

  /**
   * Set callback for respawning player after crash
   */
  public setOnRespawnCallback(callback: (position: THREE.Vector3) => void): void {
    this.onRespawnCallback = callback;
  }

  /**
   * Set callback for when player boards any rocket (launch pad or landed)
   */
  public setOnBoardRocketCallback(callback: () => void): void {
    this.onBoardRocketCallback = callback;
  }

  /**
   * Abandon the rocket and respawn the player - after a crash (UI button) or
   * on demand (ROCKET_INPUTS.RESPAWN) when stranded. The callback gets the
   * rocket's last position so the game can respawn on the nearest planet.
   */
  public respawnAfterCrash(): void {
    if (!this.rocketController) return;

    const respawnPosition = this.rocketController.getPosition().clone();

    // Clean up rocket
    this.flightUI.hide();
    this.rocketController.dispose();
    this.rocketController = null;
    this.activePad = null;
    this.isInFlightMode = false;

    // Call respawn callback with position
    if (this.onRespawnCallback) {
      this.onRespawnCallback(respawnPosition);
    }

    // Also call exit callback (null position since crash = respawn at original location)
    if (this.onExitFlightCallback) {
      this.onExitFlightCallback(null);
    }
  }

  /**
   * Enter flight mode - called when player boards the rocket
   */
  public enterFlightMode(launchPad: PlacedLaunchPad): boolean {
    if (this.isInFlightMode) {
      console.warn('Already in flight mode');
      return false;
    }

    // Validate rocket has parts
    if (launchPad.rocketParts.length === 0) {
      console.error('No rocket parts to control');
      return false;
    }

    // Create rocket controller
    this.rocketController = new RocketController(this.scene);

    // Get surface normal from launch pad position (pointing away from planet center)
    // For simplicity, assume Earth at origin
    const surfaceNormal = launchPad.position.clone().normalize();

    // Initialize the rocket
    this.rocketController.initialize(
      launchPad.rocketParts,
      launchPad.position,
      surfaceNormal,
      this.planets,
      launchPad.fuel,
      launchPad.cargo,
      launchPad.engineMode ?? null
    );
    this.activePad = launchPad;
    this.rocketController.onChanged = () => this.recordActiveRocket();

    // Board the rocket (sets up camera)
    if (!this.rocketController.board(this.camera)) {
      console.error('Failed to board rocket');
      this.rocketController.dispose();
      this.rocketController = null;
      this.activePad = null;
      return false;
    }

    // Add rocket pivot to scene
    this.scene.add(this.rocketController.getPivot());

    // Show flight UI
    this.flightUI.show();

    // Exit pointer lock - rocket uses click+drag for camera
    document.exitPointerLock();

    this.isInFlightMode = true;
    console.log('Entered flight mode');

    return true;
  }

  /**
   * Exit flight mode - returns player to normal play
   * If rocket has launched (left initial position), it persists in the world
   * If rocket never launched (still at launch pad), it returns to docked state
   *
   * `force` leaves the rocket even where the player may not climb out (the
   * pilot ran out of air in a cabin with no power, openspec
   * wool-air-and-reentry design 4): the ship is parked where it is, as on any
   * exit, so it never vanishes.
   */
  public exitFlightMode(force = false): void {
    if (!this.isInFlightMode || !this.rocketController) {
      return;
    }

    // Check if we can exit
    const stateInfo = this.rocketController.getStateMachine().getStateInfo();
    if (!stateInfo.canExit && !force) {
      console.log('Cannot exit rocket in current state');
      return;
    }

    // Check if rocket has ever launched - if so, it should persist
    const hasLaunched = this.rocketController.getHasLaunched();

    // Get rocket position BEFORE exiting (for player spawn)
    const rocketPosition = hasLaunched ? this.rocketController.getPosition().clone() : null;

    // The pad keeps the rocket's fuel record
    this.recordActiveRocket();

    // Exit the rocket
    this.rocketController.exit();

    // Hide flight UI
    this.flightUI.hide();

    if (hasLaunched) {
      // Persist the rocket - it has left its original launch pad
      // Player can explore the world and re-board later
      this.landedRocketManager.createLandedRocket(
        this.rocketController.getPivot(),
        this.rocketController.getParts(),
        this.rocketController.getPosition(),
        this.rocketController.getOrientation(),
        this.rocketController.getPosition().clone().normalize(), // Ground normal (away from origin)
        this.rocketController.getFuelPercent(),
        this.rocketController.getCargo(),
        this.activePad
      ).engineMode = this.rocketController.getEngineMode();

      // Don't dispose - the rocket stays in the world
      // But we need to clean up the controller's resources that aren't part of the visual
      this.rocketController.disposeNonVisual();
      console.log('Rocket persisted in world as landed rocket');
    } else {
      // Never launched - clean up completely (rocket stays on launch pad as DOCKED)
      this.rocketController.dispose();
    }

    this.rocketController = null;
    this.activePad = null;
    this.isInFlightMode = false;

    // Call exit callback with position (null if exiting at launch pad, position if landed elsewhere)
    if (this.onExitFlightCallback) {
      this.onExitFlightCallback(rocketPosition);
    }

    console.log('Exited flight mode');
  }

  /**
   * Board a landed rocket
   */
  public boardLandedRocket(landedRocket: LandedRocket): boolean {
    if (this.isInFlightMode) {
      console.warn('Already in flight mode');
      return false;
    }

    // Remove rocket from landed rockets (it becomes active again)
    this.landedRocketManager.removeLandedRocket(landedRocket.id);

    // Create rocket controller
    this.rocketController = new RocketController(this.scene);

    // Initialize the rocket from the landed state
    this.rocketController.initializeFromLanded(
      landedRocket.pivot,
      landedRocket.parts,
      landedRocket.position,
      landedRocket.orientation,
      landedRocket.groundNormal,
      landedRocket.fuelPercent,
      this.planets,
      landedRocket.cargo,
      landedRocket.engineMode ?? null
    );
    this.activePad = landedRocket.pad;
    this.rocketController.onChanged = () => this.recordActiveRocket();

    // Board the rocket (sets up camera)
    if (!this.rocketController.boardLanded(this.camera)) {
      console.error('Failed to board landed rocket');
      // Return rocket to landed state
      this.landedRocketManager.createLandedRocket(
        landedRocket.pivot,
        landedRocket.parts,
        landedRocket.position,
        landedRocket.orientation,
        landedRocket.groundNormal,
        landedRocket.fuelPercent,
        landedRocket.cargo,
        landedRocket.pad
      );
      this.rocketController = null;
      this.activePad = null;
      return false;
    }

    // Show flight UI
    this.flightUI.show();

    // Exit pointer lock - rocket uses click+drag for camera
    document.exitPointerLock();

    this.isInFlightMode = true;
    console.log('Boarded landed rocket');

    // Call board callback to handle player state (hide player, etc)
    if (this.onBoardRocketCallback) {
      this.onBoardRocketCallback();
    }

    return true;
  }

  /**
   * Open the landed rocket UI for a specific rocket
   */
  public openLandedRocketUI(rocket: LandedRocket): void {
    // Open UI first (registers with MenuManager) to prevent pause menu from showing
    this.landedRocketUI.open(rocket);
    // Then exit pointer lock to show cursor
    document.exitPointerLock();
  }

  /**
   * Get the landed rocket manager
   */
  public getLandedRocketManager(): LandedRocketManager {
    return this.landedRocketManager;
  }

  /**
   * Get the landed rocket UI
   */
  public getLandedRocketUI(): LandedRocketUI {
    return this.landedRocketUI;
  }

  /**
   * Update the rocket flight system
   */
  public update(deltaTime: number): void {
    if (!this.isInFlightMode || !this.rocketController) {
      return;
    }

    // Update input state from pressed keys
    this.updateInputState();

    // Update rocket controller
    this.rocketController.update(deltaTime, this.inputState);

    // Update explosion particles if crashed
    const state = this.rocketController.getState();
    if (state === RocketState.CRASHED) {
      this.rocketController.updateExplosion(deltaTime);
    }

    // Update flight UI (handles crash screen display)
    this.flightUI.update(this.rocketController);

    // Reset edge-triggered inputs
    this.inputState.thrustToggle = false;
  }

  /**
   * Handle mouse movement for camera control
   */
  public handleMouseMove(deltaX: number, deltaY: number): void {
    if (this.isInFlightMode && this.rocketController) {
      this.rocketController.handleCameraMouseMove(deltaX, deltaY);
    }
  }

  /**
   * Handle scroll wheel for camera zoom
   */
  public handleScroll(delta: number): void {
    if (this.isInFlightMode && this.rocketController) {
      this.rocketController.handleCameraScroll(delta);
    }
  }

  /**
   * Set up keyboard listeners for flight controls
   */
  private setupKeyboardListeners(): void {
    document.addEventListener('keydown', (e) => {
      if (!this.isInFlightMode) return;

      this.keysPressed.add(e.code);

      // Handle edge-triggered inputs
      if (e.code === ROCKET_INPUTS.THRUST_TOGGLE) {
        this.inputState.thrustToggle = true;
      }

      // Cycle which engines fire (design 6b)
      if (e.code === ROCKET_INPUTS.ENGINE_MODE) {
        this.rocketController?.cycleEngineMode();
      }

      // Handle exit key - call exitFlightMode directly
      if (e.code === ROCKET_INPUTS.EXIT_ROCKET) {
        this.exitFlightMode();
      }

      // Manual respawn: abandon the rocket (e.g. stranded in space)
      if (e.code === ROCKET_INPUTS.RESPAWN) {
        this.respawnAfterCrash();
      }
    });

    document.addEventListener('keyup', (e) => {
      this.keysPressed.delete(e.code);
    });
  }

  /**
   * Set up mouse listeners for click+drag camera control
   */
  private setupMouseListeners(): void {
    const container = document.getElementById('game-container');
    if (!container) return;

    container.addEventListener('mousedown', (e) => {
      if (!this.isInFlightMode) return;
      if (e.button === 0) {  // Left mouse button
        this.isMouseDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isMouseDragging = false;
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (!this.isInFlightMode || !this.isMouseDragging) return;

      const deltaX = e.clientX - this.lastMouseX;
      const deltaY = e.clientY - this.lastMouseY;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;

      // Send mouse movement to camera
      if (this.rocketController) {
        this.rocketController.handleCameraMouseMove(deltaX, deltaY);
      }
    });

    // Handle scroll for zoom
    container.addEventListener('wheel', (e) => {
      if (!this.isInFlightMode) return;
      e.preventDefault();
      if (this.rocketController) {
        this.rocketController.handleCameraScroll(e.deltaY > 0 ? 1 : -1);
      }
    }, { passive: false });
  }

  /**
   * Update input state from currently pressed keys
   */
  private updateInputState(): void {
    // Rotation (WASD + Q/E)
    this.inputState.pitchDown = this.keysPressed.has(ROCKET_INPUTS.PITCH_DOWN);
    this.inputState.pitchUp = this.keysPressed.has(ROCKET_INPUTS.PITCH_UP);
    this.inputState.yawLeft = this.keysPressed.has(ROCKET_INPUTS.YAW_LEFT);
    this.inputState.yawRight = this.keysPressed.has(ROCKET_INPUTS.YAW_RIGHT);
    this.inputState.rollLeft = this.keysPressed.has(ROCKET_INPUTS.ROLL_LEFT);
    this.inputState.rollRight = this.keysPressed.has(ROCKET_INPUTS.ROLL_RIGHT);
    // Strafe thrusters (Arrow keys + C for descent)
    this.inputState.strafeForward = this.keysPressed.has(ROCKET_INPUTS.STRAFE_FORWARD);
    this.inputState.strafeBackward = this.keysPressed.has(ROCKET_INPUTS.STRAFE_BACKWARD);
    this.inputState.strafeLeft = this.keysPressed.has(ROCKET_INPUTS.STRAFE_LEFT);
    this.inputState.strafeRight = this.keysPressed.has(ROCKET_INPUTS.STRAFE_RIGHT);
    this.inputState.strafeDown = this.keysPressed.has(ROCKET_INPUTS.STRAFE_DOWN);
    // Throttle
    this.inputState.throttleUp = this.keysPressed.has(ROCKET_INPUTS.THROTTLE_UP);
    this.inputState.throttleDown = this.keysPressed.has(ROCKET_INPUTS.THROTTLE_DOWN);
    // Actions
    this.inputState.fuel = this.keysPressed.has(ROCKET_INPUTS.FUEL_ROCKET);
    this.inputState.exit = this.keysPressed.has(ROCKET_INPUTS.EXIT_ROCKET);
    this.inputState.eject = this.keysPressed.has(ROCKET_INPUTS.EJECT_CAPSULE);
  }

  /**
   * Check if currently in flight mode
   */
  public isInFlight(): boolean {
    return this.isInFlightMode;
  }

  /**
   * Get the rocket controller (if in flight)
   */
  public getRocketController(): RocketController | null {
    return this.rocketController;
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    if (this.rocketController) {
      this.rocketController.dispose();
      this.rocketController = null;
    }
    this.flightUI.dispose();
    this.landedRocketUI.dispose();
    this.landedRocketManager.dispose();
    this.isInFlightMode = false;
  }
}
