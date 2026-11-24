import * as THREE from 'three';
import { planetObjectScene } from '../world/PlanetFrames';
import { RocketController, PlanetGravitySource, RocketInputState } from './RocketController';
import { RocketFlightUI } from './RocketFlightUI';
import { RocketState } from './RocketState';
import { ROCKET_INPUTS, ROCKET_CONFIG } from '../config/RocketConfig';
import { PlacedLaunchPad, LaunchPadManager, stackPartHeights, ROCKET_SEGMENT_HEIGHT } from '../planet/LaunchPad';
import { RocketPart } from '../planet/RocketPart';
import { withMachineLight } from '../planet/MachineLight';
import { RefitOp, planRefit, refitKitIn, stackAfter } from './Refit';
import { InputManager, lockPointer } from '../engine/InputManager';
import { LandedRocket, LandedRocketManager } from './LandedRocket';
import { LandedRocketUI } from './LandedRocketUI';
import { InventorySlot, ItemType, ITEM_DATA } from '../player/Inventory';
import { computeRocketStats, stackItemTypes, addCharge, swapBatteryWh, isEquipment, stackProblems, slotStore, cargoSlotsFor, equipmentSlotsFor, fitSlots, validEngineMode } from './RocketPerformance';
import { emitGameEvent } from '../engine/GameEvents';
import { showToast } from '../utils/toast';

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
  private onOpenCargoCallback: ((slots: InventorySlot[], title?: string, accepts?: (t: ItemType) => boolean) => void) | null = null;

  /** How a landed rocket's Cargo button opens the hold (beside the inventory) */
  public setOnOpenCargoCallback(callback: (slots: InventorySlot[], title?: string, accepts?: (t: ItemType) => boolean) => void): void {
    this.onOpenCargoCallback = callback;
  }

  // Callbacks
  private onExitFlightCallback: ((exitPosition: THREE.Vector3 | null, inSpace?: boolean) => void) | null = null;
  private onRespawnCallback: ((position: THREE.Vector3, pad: PlacedLaunchPad | null) => void) | null = null;
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
    parachute: false,
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
    // Docking and refits away from home (rocket-refit)
    this.landedRocketUI.setRefitHandlers({
      canDock: (r) => this.nearestFreePad(r) !== null,
      dock: (r) => this.dockLanded(r),
      kit: (r) => this.refitKit(r),
      refitting: (r) => this.isRefitting(r),
      start: (r) => this.startRefit(r),
      end: (r) => this.endRefit(r),
      available: (r) => this.refitPartsAvailable(r),
      apply: (r, op) => this.applyRefit(r, op),
    });
    this.landedRocketUI.setOnCargoCallback((rocket) => {
      if (rocket.cargo) this.onOpenCargoCallback?.(rocket.cargo);
    });
    // Its equipment slots: the same panel, taking only equipment items
    this.landedRocketUI.setOnEquipmentCallback((rocket) => {
      if (rocket.equipment) this.onOpenCargoCallback?.(rocket.equipment, 'Rocket Equipment', isEquipment);
    });

    this.landedRocketUI.setOnCloseCallback(() => {
      // Re-lock pointer when closing landed rocket UI
      lockPointer();
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
  public addPlanet(source: PlanetGravitySource): void {
    this.planets.push({ ...source, center: source.center.clone() });
    // Also update landed rocket manager
    this.landedRocketManager.setPlanets(this.planets);
  }

  /** A body moved on its orbit: gravity and landings use its live centre. */
  /** The live sun position, for solar arrays (shared with the controller) */
  private sunPosition = new THREE.Vector3();
  public setSunPosition(sun: THREE.Vector3): void {
    this.sunPosition.copy(sun);
    this.rocketController?.setSunPosition(this.sunPosition);
  }

  /** A body (by id) moved on its orbit: gravity and landings use its live centre. */
  public setPlanetCenter(id: string, center: THREE.Vector3): void {
    for (const p of this.planets) if (p.id === id) p.center.copy(center);
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

  /**
   * A dropped stage is gone for good (rocket-staging): the pad the flight
   * came from keeps only the stages still attached, so a relaunch from it
   * uses what is left. Saved at once (recordActiveRocket).
   */
  private forgetDroppedStage(parts: unknown[]): void {
    if (this.activePad) {
      this.activePad.rocketParts = this.activePad.rocketParts.filter(p => !parts.includes(p));
    }
    this.recordActiveRocket();
  }

  // ---- refits away from home (openspec space-exploration, rocket-refit) ----

  private padManager: LaunchPadManager | null = null;
  private playerItems: { count(t: ItemType): number; take(t: ItemType, n: number): number; give(t: ItemType, n: number): number } | null = null;
  // Parked rockets with a refit under way (the kit is spent when it starts)
  private refitting = new Set<string>();

  /** What docking and refits use: the launch pads, and the player's own items */
  public setRefitSupport(padManager: LaunchPadManager, playerItems: { count(t: ItemType): number; take(t: ItemType, n: number): number; give(t: ItemType, n: number): number }): void {
    this.padManager = padManager;
    this.playerItems = playerItems;
  }

  /** A complete, empty pad with a tower within REFIT.DOCK_RADIUS_M of the rocket (on its body) */
  public nearestFreePad(rocket: LandedRocket): PlacedLaunchPad | null {
    let best: PlacedLaunchPad | null = null;
    let bestD: number = ROCKET_CONFIG.REFIT.DOCK_RADIUS_M;
    for (const pad of this.padManager?.getLaunchPads() ?? []) {
      // The rocket's own pad still lists it (the pad is its record while it
      // is away), so that pad counts as free for it
      const holdsOnlyThis = pad === rocket.pad && pad.rocketParts.every(p => rocket.parts.includes(p));
      if (!pad.isComplete || (pad.rocketParts.length > 0 && !holdsOnlyThis) || pad.segmentCount < 1) continue;
      // pad.position is in the pad's planet frame; the mesh (geometry baked at
      // its origin) carries that frame, so map the point through it
      pad.mesh.updateWorldMatrix(true, false);
      const d = pad.mesh.localToWorld(pad.position.clone()).distanceTo(rocket.pivot.getWorldPosition(new THREE.Vector3()));
      if (d <= bestD) { best = pad; bestD = d; }
    }
    return best;
  }

  /**
   * Dock a parked rocket onto a free pad nearby: its parts, fuel, cargo and
   * equipment move onto the pad, where the pad's own stack editor changes
   * it. Returns why it can't, or null when docked.
   */
  public async dockLanded(rocket: LandedRocket): Promise<string | null> {
    const pad = this.nearestFreePad(rocket);
    if (!pad || !this.padManager) return 'No free launch pad with a tower nearby';
    const types = stackItemTypes(rocket.parts);
    const problems = stackProblems(types);
    if (problems.length) return problems[0];
    const fuelUnits = (rocket.fuelPercent / 100) * computeRocketStats(types).fuelCapacity;
    // Copies: the parked rocket shares its hold arrays with its origin pad,
    // which re-sizes them in place while the parts are stacked again
    const copy = (slots: InventorySlot[] | null | undefined) => (slots ?? []).map(sl => ({ itemType: sl.itemType, quantity: sl.quantity }));
    const cargo = copy(rocket.cargo), equipment = copy(rocket.equipment);
    // The parked rocket leaves; its parts are stacked again on the pad. Its
    // origin pad (this one, or the one it launched from) forgets them, so
    // the rocket is listed once, where it docked
    this.landedRocketManager.removeLandedRocket(rocket.id);
    rocket.pivot.parent?.remove(rocket.pivot);
    const origin = rocket.pad;
    if (origin) {
      origin.rocketParts = origin.rocketParts.filter(p => !rocket.parts.includes(p));
      if (origin !== pad) this.onRocketChangedCallback?.(origin);
    }
    for (const p of rocket.parts) p.dispose();
    for (const t of types) await this.padManager.addRocketPart(pad, t);
    pad.fuel = fuelUnits;
    // Same stack, so the pad's (re-sized) slots match the rocket's hold
    for (const [into, from] of [[pad.cargo, cargo], [pad.equipment, equipment]] as const) {
      into.forEach((sl, i) => { sl.itemType = from[i]?.itemType ?? ItemType.NONE; sl.quantity = from[i]?.quantity ?? 0; });
    }
    pad.engineMode = rocket.engineMode ?? null;
    this.onRocketChangedCallback?.(pad);
    return null;
  }

  /** The refit kit a parked rocket carries ('once', 'reusable', or null) */
  public refitKit(rocket: LandedRocket): 'once' | 'reusable' | null {
    return refitKitIn(rocket.equipment);
  }

  /** Is a refit under way on this rocket (its kit already spent)? */
  public isRefitting(rocket: LandedRocket): boolean {
    return this.refitting.has(rocket.netKey);
  }

  /** Start a refit: it uses one plain kit up (a mk2 is kept). False with no kit. */
  public startRefit(rocket: LandedRocket): boolean {
    if (this.refitting.has(rocket.netKey)) return true;
    const kind = refitKitIn(rocket.equipment);
    if (!kind) return false;
    if (kind === 'once' && rocket.equipment) slotStore(rocket.equipment).removeItem(ItemType.REFIT_KIT, 1);
    this.refitting.add(rocket.netKey);
    return true;
  }

  /** The refit is over (the panel closed): the next one needs a kit again */
  public endRefit(rocket: LandedRocket): void {
    this.refitting.delete(rocket.netKey);
  }

  /** Parts a refit can put on: rocket parts in the cargo hold and the player's items */
  public refitPartsAvailable(rocket: LandedRocket): ItemType[] {
    const out: ItemType[] = [];
    for (const [k, data] of Object.entries(ITEM_DATA)) {
      const t = Number(k) as ItemType;
      if (!data.rocketPart) continue;
      if ((rocket.cargo ? slotStore(rocket.cargo).getItemCount(t) : 0) + (this.playerItems?.count(t) ?? 0) > 0) out.push(t);
    }
    return out;
  }

  /**
   * One change to a parked rocket's stack during a refit: a part taken off
   * goes to the cargo hold (else the player); a part put on comes from the
   * cargo hold (else the player). Refused (with the reason) if the stack
   * would not fly, or the items aren't there or won't fit.
   */
  public async applyRefit(rocket: LandedRocket, op: RefitOp): Promise<string | null> {
    if (!this.refitting.has(rocket.netKey)) return 'Start a refit first';
    const types = stackItemTypes(rocket.parts);
    const plan = planRefit(types, op);
    if (plan.refused) return plan.refused;
    const cargo = rocket.cargo ? slotStore(rocket.cargo) : null;
    const have = (t: ItemType) => (cargo?.getItemCount(t) ?? 0) + (this.playerItems?.count(t) ?? 0);
    if (plan.putOn !== null && have(plan.putOn) <= 0) return 'That part is not in the cargo hold or your inventory';
    const after = stackAfter(types, op);
    // The cargo and equipment must still fit the slots the new stack has
    const used = (slots: InventorySlot[] | null) => (slots ?? []).filter(s => s.itemType !== ItemType.NONE && s.quantity > 0).length;
    if (used(rocket.cargo) > cargoSlotsFor(after) || used(rocket.equipment) > equipmentSlotsFor(after)) return 'Unload the cargo or equipment that would not fit first';
    // Take the part to put on, then put away the one taken off
    if (plan.putOn !== null) {
      const fromCargo = cargo?.removeItem(plan.putOn, 1) ?? 0;
      if (fromCargo === 0) this.playerItems?.take(plan.putOn, 1);
    }
    if (plan.takenOff !== null) {
      const left = cargo ? cargo.addItem(plan.takenOff, 1) : 1;
      if (left > 0) this.playerItems?.give(plan.takenOff, 1);
    }
    await this.rebuildLanded(rocket, after);
    return null;
  }

  /** Rebuild a parked rocket's meshes and numbers for a new stack (the pad's stacking heights) */
  private async rebuildLanded(rocket: LandedRocket, types: ItemType[]): Promise<void> {
    if (!this.padManager) return;
    const oldTypes = stackItemTypes(rocket.parts);
    const oldCap = computeRocketStats(oldTypes).fuelCapacity;
    const fuelUnits = (rocket.fuelPercent / 100) * oldCap;
    // Keep the stack's base where it stands
    const oldHeights = stackPartHeights(oldTypes, ROCKET_SEGMENT_HEIGHT);
    const base = rocket.parts.length ? rocket.parts[0].mesh.position.y - oldHeights[0] : 0;
    for (const p of rocket.parts) { rocket.pivot.remove(p.mesh); p.dispose(); }
    const heights = stackPartHeights(types, ROCKET_SEGMENT_HEIGHT);
    const parts: RocketPart[] = [];
    for (let i = 0; i < types.length; i++) {
      const info = ITEM_DATA[types[i]].rocketPart!;
      const assets = await this.padManager.loadRocketPartAssets(types[i]);
      if (!assets) continue;
      const material = withMachineLight(assets.material.clone());
      const group = new THREE.Group();
      group.add(new THREE.Mesh(assets.geometry, material));
      group.position.set(0, base + heights[i], 0);
      const ms = info.modelScale ?? { x: 1, y: 1, z: 1 };
      group.scale.set(ms.x, ms.y, ms.z);
      rocket.pivot.add(group);
      parts.push(new RocketPart(types[i], info.partType, group, material, i));
    }
    rocket.parts = parts;
    // The rocket's pad is its saved record while it is away: it lists the
    // new stack, so the refit survives a reload
    if (rocket.pad) rocket.pad.rocketParts = parts;
    const cap = computeRocketStats(types).fuelCapacity;
    rocket.fuelPercent = cap > 0 ? (Math.min(fuelUnits, cap) / cap) * 100 : 0;
    if (rocket.pad) rocket.pad.fuel = Math.min(fuelUnits, cap);
    // Its slots follow the new stack (what is aboard already fits: checked above)
    if (rocket.cargo) fitSlots(rocket.cargo, cargoSlotsFor(types));
    if (rocket.equipment) fitSlots(rocket.equipment, equipmentSlotsFor(types));
    rocket.engineMode = validEngineMode(types, rocket.engineMode ?? null);
    this.onRocketChangedCallback?.(rocket.pad);
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
    const stats = computeRocketStats(stackItemTypes(rocket.parts), 0, null, rocket.equipment);
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
   * Swap a battery into a landed rocket (openspec wool-air-and-reentry,
   * design 2): `take` uses up one ROCKET_CONFIG.POWER.SWAP_ITEM from the
   * player and says whether it could. Its stored Wh is added up to the
   * stack's capacity. False (nothing used) when the rocket is already full.
   */
  public rechargeLanded(rocket: LandedRocket, take: () => boolean): boolean {
    const capacity = computeRocketStats(stackItemTypes(rocket.parts), 0, null, rocket.equipment).batteryWh;
    const have = rocket.chargeWh ?? capacity;
    if (have >= capacity) {
      showToast('Battery is full', { duration: 2000 });
      return false;
    }
    if (!take()) return false;
    rocket.chargeWh = addCharge(have, capacity, swapBatteryWh());
    showToast(`Battery swapped in - ${Math.round((rocket.chargeWh / capacity) * 100)}% charge`, { duration: 3000 });
    emitGameEvent('recharged');
    this.onRocketChangedCallback?.(rocket.pad);
    return true;
  }

  /**
   * Set callback for when flight mode ends
   */
  /** `inSpace`: the pilot climbed out in space - `exitPosition` is then where they float, beside the ship */
  public setOnExitFlightCallback(callback: (exitPosition: THREE.Vector3 | null, inSpace?: boolean) => void): void {
    this.onExitFlightCallback = callback;
  }

  /**
   * Set callback for respawning player after crash
   */
  /** `pad`: the launch pad the flight took off from (respawn beside it), null if none */
  public setOnRespawnCallback(callback: (position: THREE.Vector3, pad: PlacedLaunchPad | null) => void): void {
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
    const pad = this.activePad;
    // The pad keeps what the flight burnt (it relaunches with what is left)
    this.recordActiveRocket();

    // Clean up rocket
    this.flightUI.hide();
    this.rocketController.dispose();
    this.rocketController = null;
    this.activePad = null;
    this.isInFlightMode = false;

    // Call respawn callback with position
    if (this.onRespawnCallback) {
      this.onRespawnCallback(respawnPosition, pad);
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
    this.rocketController.setSunPosition(this.sunPosition);

    // Surface normal: away from the centre of the body the pad is on (any
    // body - the Moon's pads launch straight up from the Moon too)
    const surfaceNormal = launchPad.position.clone().sub(launchPad.planetCenter).normalize();

    // Initialize the rocket
    this.rocketController.initialize(
      launchPad.rocketParts,
      launchPad.position,
      surfaceNormal,
      this.planets,
      launchPad.fuel,
      launchPad.cargo,
      launchPad.engineMode ?? null,
      launchPad.equipment
    );
    this.activePad = launchPad;
    this.rocketController.onChanged = () => this.recordActiveRocket();
    this.rocketController.onStageDropped = (parts) => this.forgetDroppedStage(parts);

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
    if (!this.rocketController.canExitNow() && !force) {
      console.log('Cannot exit rocket in current state');
      return;
    }

    // Check if rocket has ever launched - if so, it should persist
    const hasLaunched = this.rocketController.getHasLaunched();

    // Get rocket position BEFORE exiting (for player spawn). In space the
    // player floats out beside the ship, off its side, clear of the hull
    const inSpace = this.rocketController.isInSpace();
    const rocketPosition = !hasLaunched ? null : inSpace
      ? this.rocketController.getStackCenter().clone().add(
          new THREE.Vector3(1, 0, 0).applyQuaternion(this.rocketController.getOrientation()).multiplyScalar(ROCKET_CONFIG.EVA_EXIT_DISTANCE_M))
      : this.rocketController.getPosition().clone();

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
        this.activePad,
        undefined,
        this.rocketController.getChargeWh(),
        this.rocketController.getEquipment()
      ).engineMode = this.rocketController.getEngineMode();

      // Don't dispose - the rocket stays in the world
      // But we need to clean up the controller's resources that aren't part of the visual
      this.rocketController.disposeNonVisual();
      console.log('Rocket persisted in world as landed rocket');
    } else {
      // Never launched: the rocket stays on its launch pad as DOCKED. Its
      // parts go back under the pad's mesh first - boarding moved them onto
      // the flight pivot, and disposing that pivot with them on it left the
      // rocket invisible while the pad still listed it (boardable, unseen).
      if (this.activePad) this.rocketController.returnPartsTo(this.activePad.mesh);
      this.rocketController.dispose();
    }

    this.rocketController = null;
    this.activePad = null;
    this.isInFlightMode = false;

    // Call exit callback with position (null if exiting at launch pad, position if landed elsewhere)
    if (this.onExitFlightCallback) {
      this.onExitFlightCallback(rocketPosition, inSpace);
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
    this.rocketController.setSunPosition(this.sunPosition);

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
      landedRocket.engineMode ?? null,
      landedRocket.chargeWh ?? null,
      landedRocket.equipment
    );
    this.activePad = landedRocket.pad;
    this.rocketController.onChanged = () => this.recordActiveRocket();
    this.rocketController.onStageDropped = (parts) => this.forgetDroppedStage(parts);

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
        landedRocket.pad,
        landedRocket.netKey,
        landedRocket.chargeWh ?? null,
        landedRocket.equipment
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

    // Taking off burns the pad's fuel: keep its record in step with the
    // tanks, so a relaunch from the pad never starts on fuel already burnt
    if (this.activePad) {
      const burnt = (this.activePad.fuel ?? Infinity) - this.rocketController.getFuelUnits();
      if (burnt >= ROCKET_CONFIG.PAD_FUEL_RECORD_STEP) this.recordActiveRocket();
    }

    // Update explosion particles if crashed
    const state = this.rocketController.getState();
    if (state === RocketState.CRASHED) {
      this.rocketController.updateExplosion(deltaTime);
    }

    // Update flight UI (handles crash screen display)
    this.flightUI.update(this.rocketController);

    // Reset edge-triggered inputs
    this.inputState.thrustToggle = false;
    this.inputState.parachute = false;
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

      // Open the parachute (Shift+P is the screenshot key)
      if (e.code === ROCKET_INPUTS.PARACHUTE && !e.shiftKey && !e.repeat) {
        this.inputState.parachute = true;
      }

      // Cycle which engines fire (design 6b)
      if (e.code === ROCKET_INPUTS.ENGINE_MODE) {
        this.rocketController?.cycleEngineMode();
      }

      // Handle exit key - call exitFlightMode directly
      if (e.code === ROCKET_INPUTS.EXIT_ROCKET) {
        this.exitFlightMode();
      }

      // Drop the spent stage (rocket-staging)
      if (e.code === ROCKET_INPUTS.STAGE) {
        this.rocketController?.dropStage();
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
    this.inputState.selfDestruct = this.keysPressed.has(ROCKET_INPUTS.SELF_DESTRUCT);
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
