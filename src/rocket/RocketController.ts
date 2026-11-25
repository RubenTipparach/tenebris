import { emitGameEvent } from '../engine/GameEvents';
import { SOLAR_SYSTEM } from '../config/SolarSystemConfig';

// Where the sun is until the flight manager hands over the live one (the
// orbits move it in the reference body's frame)
const SUN_CONFIG_POSITION = SOLAR_SYSTEM.bodies.find(b => b.id === 'sun')?.position ?? { x: 0, y: 0, z: 0 };
// The Sun's radius: its surface burns, its close-pass distance is a multiple of it
const SUN_RADIUS = SOLAR_SYSTEM.bodies.find(b => b.id === 'sun')?.radius ?? 0;
import * as THREE from 'three';
import { ROCKET_CONFIG } from '../config/RocketConfig';
import { RocketState, RocketStateMachine, STATE_INFO } from './RocketState';
import { RocketCamera } from './RocketCamera';
import { RocketExhaust } from './RocketExhaust';
import { RocketPart } from '../planet/RocketPart';
import { InventorySlot, ItemType, ITEM_DATA } from '../player/Inventory';
import {
  computeRocketStats, stackItemTypes, cargoMass, gravityWellMultiplier, dampingFactor, EngineMode, engineModes, nextEngineMode, validEngineMode,
  drainCharge, feedCharge, addCharge, droneTarget, equipmentStats, chargeSecondsLeft, inSunlight, solarCharge, poweredThrust, inAtmosphereShell, reentryStep, heatDamage, openChuteFrom, chuteDescentSpeed, chuteSideFactor,
  chuteLandingSpeed, shieldCapacity, shieldsFitted, useShield, solarHeat,
  stagesOf, stagedStats, fillStages, stagedDeltaVWith, engineNeeds, slotStore,
  chutesFitted,
} from './RocketPerformance';
import { showToast } from '../utils/toast';
import { createHeatGlow, setHeatGlow, createCanopy, disposeObject } from './RocketReentryVisuals';
import { rcsJets, createRcsLines, setRcsLines } from './RocketRcsVisuals';
import { PlayerConfig } from '../config/PlayerConfig';
import { AudioManager } from '../engine/AudioManager';

/**
 * Planet data needed for gravity calculations
 */
/** Why a rocket was destroyed (the crash screen's words) */
export type CrashReason = 'impact' | 'burnedUp' | 'selfDestruct' | 'crushed';

export interface PlanetGravitySource {
  /** The body's id (missions, orbit updates) */
  id: string;
  center: THREE.Vector3;
  radius: number;
  gravityStrength: number;  // Multiplier (1.0 = Earth-like)
  name: string;
  getSurfaceHeight?: (direction: THREE.Vector3) => number;  // Optional callback for actual terrain height
  hasAtmosphere?: boolean;  // air for re-entry heat and the parachute (CelestialBodyConfig.hasAtmosphere)
  /** How thick that air is (BODY_ENVIRONMENTS; 1 = Earth's) */
  atmosphereDensity?: number;
  /** A gas giant: air but no ground (ROCKET_CONFIG.GAS_GIANT_FLIGHT) */
  gasGiant?: boolean;
}

/**
 * Current gravity info for UI
 */
export interface GravityInfo {
  totalAcceleration: THREE.Vector3;
  magnitude: number;
  sourceName: string;
  isInGravityWell: boolean;
  gravityMultiplier: number;  // 0-1, how deep in gravity well
}

/**
 * Input state for rocket controls
 */
export interface RocketInputState {
  // Rotation (WASD)
  pitchDown: boolean;     // W
  pitchUp: boolean;       // S
  yawLeft: boolean;       // A
  yawRight: boolean;      // D
  rollLeft: boolean;      // Q
  rollRight: boolean;     // E
  // Strafe thrusters (Arrow keys + C for descent)
  strafeForward: boolean;   // Up arrow
  strafeBackward: boolean;  // Down arrow
  strafeLeft: boolean;      // Left arrow
  strafeRight: boolean;     // Right arrow
  strafeUp: boolean;        // Space (when not thrusting)
  strafeDown: boolean;      // C - descend
  // Throttle
  throttleUp: boolean;    // X
  throttleDown: boolean;  // Z
  thrustToggle: boolean;  // Space (edge triggered)
  // Actions
  fuel: boolean;          // F
  exit: boolean;          // V
  eject: boolean;         // J
  selfDestruct?: boolean; // K (held)
  parachute?: boolean;    // P (edge triggered)
}

/**
 * Main rocket flight controller
 * Handles physics, controls, and state management
 */
export class RocketController {
  // Scene reference for adding/removing objects
  public readonly scene: THREE.Scene;
  private pivot: THREE.Group;         // Root group for all rocket parts
  private parts: RocketPart[] = [];   // Rocket components

  // State machine
  private stateMachine: RocketStateMachine;

  // Camera
  private rocketCamera: RocketCamera | null = null;

  // Exhaust particle system
  private rocketExhaust: RocketExhaust;

  // Side thruster particle system
  private sideThrusterMesh: THREE.Points | null = null;
  private sideThrusterGeometry: THREE.BufferGeometry | null = null;
  private sideThrusterVelocities: THREE.Vector3[] = [];
  private sideThrusterLives: number[] = [];
  private readonly SIDE_THRUSTER_PARTICLES = 100;
  private sideThrusterSpawnAccum = 0;

  // Physics state
  private position: THREE.Vector3 = new THREE.Vector3();
  private velocity: THREE.Vector3 = new THREE.Vector3();
  private orientation: THREE.Quaternion = new THREE.Quaternion();
  private angularVelocity: THREE.Vector3 = new THREE.Vector3();

  // Propulsion
  private throttle: number = 0;       // 0-1
  private isThrustActive: boolean = false;
  // Fuel in the ACTIVE (lowest remaining) stage's tanks, and its capacity:
  // only that stage burns (rocket-staging)
  private currentFuel: number = 0;
  private totalFuelCapacity: number = 0;
  // The stages above the active one: their tanks' fuel and every stage's capacity
  private upperFuel: number[] = [];
  private stageCapacities: number[] = [];
  // Dropped stages falling away (never saved; gone after STAGE_DEBRIS_LIFE_S)
  private debris: Array<{ group: THREE.Group; velocity: THREE.Vector3; age: number }> = [];
  /** A stage was dropped: these parts left the rocket (the pad forgets them) */
  public onStageDropped: ((parts: RocketPart[]) => void) | null = null;

  // Status
  private health: number = ROCKET_CONFIG.HEALTH.maxHealth;
  private closestPlanet: PlanetGravitySource | null = null;
  private planets: PlanetGravitySource[] = [];
  private isInGravityWell: boolean = false;
  private gravityMultiplier: number = 0;

  // Computed properties (cached)
  private totalWetMass: number = 0;
  private totalDryMass: number = 0;
  private totalThrust: number = 0;
  private totalFuelConsumption: number = 0;

  // Ground reference (for grounded states)
  private groundPosition: THREE.Vector3 = new THREE.Vector3();
  private groundNormal: THREE.Vector3 = new THREE.Vector3(0, 1, 0);

  // Stack center offset (local space, for camera targeting)
  private stackCenterOffset: THREE.Vector3 = new THREE.Vector3();
  // The turn WASD / Q / E commanded this frame (sign per local axis: x pitch, y spin, z roll) and its RCS lines
  private rcsCommand = new THREE.Vector3();
  private rcsLines: THREE.LineSegments | null = null;

  // Input tracking
  private lastThrustToggle: boolean = false;
  // starts held: the key that boarded (F is also Interact) must be let go first
  private lastFuelInput: boolean = true;

  // Respawn tracking
  private lastBoardedPosition: THREE.Vector3 = new THREE.Vector3();
  private lastBoardedOrientation: THREE.Quaternion = new THREE.Quaternion();

  // Crash state
  private crashTime: number = 0;
  private explosionParticles: THREE.Points | null = null;

  // Track if rocket has ever launched (left initial position)
  // Used to determine if rocket should persist when exiting
  private hasLaunched: boolean = false;

  // The cargo hold: the launch pad's slots, shared by reference, so it
  // travels with the rocket and saves with the pad
  private cargo: InventorySlot[] | null = null;
  // The equipment slots (parachutes, solar arrays, battery packs), shared
  // the same way: what is fitted is the state (a chute used is gone)
  private equipment: InventorySlot[] | null = null;

  // Power (openspec wool-air-and-reentry, design 2): the flight's charge,
  // the stack's capacity and what it draws while flying
  private chargeWh: number = 0;
  private batteryCapacityWh: number = 0;
  private powerDrawW: number = 0;
  private solarW: number = 0;          // the equipped solar arrays, full sun
  private rtgW: number = 0;            // the equipped RTGs, always
  private cooling: number = 0;         // share of heat its radiators shed
  private chuteBrake: number = 1;      // a drogue's extra braking
  private sunlit: boolean = true;
  private flatWarned: boolean = false;
  private sunPosition: { x: number; y: number; z: number } = SUN_CONFIG_POSITION;
  private lowPowerWarned: boolean = false;

  // Re-entry heat and the parachute (design 3)
  private heat: number = 0;
  private leftAtmosphere: boolean = false;
  private reentering: boolean = false;
  private inAtmosphere: boolean = false;
  private chuteOpen: boolean = false;
  private heatGlow: THREE.Mesh | null = null;
  private canopy: THREE.Group | null = null;
  private crashReason: CrashReason = 'impact';
  // The air's density where the rocket is (0 outside every atmosphere)
  private atmosphereDensity = 0;
  // Heat soaked into the heat shield being worn through (space-exploration)
  private shieldWear = 0;
  // Inside the Sun's close-pass distance / below a gas giant's cloud tops (that giant's id)
  private inSunPass = false;
  private giantDip: string | null = null;
  // How long the self-destruct key has been held (s); 0 when let go
  private selfDestructHeldS = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.pivot = new THREE.Group();
    this.pivot.name = 'RocketPivot';
    this.stateMachine = new RocketStateMachine(RocketState.DOCKED);
    this.rocketExhaust = new RocketExhaust(scene);
  }

  /**
   * Initialize the rocket from launch pad parts
   * @param parts Array of rocket parts from the launch pad
   * @param launchPosition World position of the launch pad
   * @param surfaceNormal Normal vector pointing away from planet surface
   */
  public initialize(
    parts: RocketPart[],
    launchPosition: THREE.Vector3,
    surfaceNormal: THREE.Vector3,
    planets: PlanetGravitySource[],
    fuelUnits: number | null = null,
    cargo: InventorySlot[] | null = null,
    engineMode: EngineMode = null,
    equipment: InventorySlot[] | null = null
  ): void {
    this.engineMode = engineMode;
    this.parts = [...parts];
    this.planets = planets;
    this.cargo = cargo;
    this.equipment = equipment;

    // Calculate rocket stack center (for future offset calculations)
    this.calculateStackCenter();

    // Set initial position and orientation
    this.position.copy(launchPosition);
    this.groundPosition.copy(launchPosition);
    this.groundNormal.copy(surfaceNormal).normalize();

    // Orient rocket to point along surface normal (up from ground)
    const defaultUp = new THREE.Vector3(0, 1, 0);
    this.orientation.setFromUnitVectors(defaultUp, this.groundNormal);

    // Reset physics
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);

    // Calculate mass and propulsion properties
    this.calculateMassProperties();
    // A pad's tanks hold what was fuelled into them (null = full: older saves)
    if (fuelUnits !== null) this.setFuelTotal(Math.max(0, fuelUnits));
    // The pad's crew charges the battery: full every launch
    this.resetFlightState(this.batteryCapacityWh);

    // Set up pivot group
    this.pivot.position.copy(this.position);
    this.pivot.quaternion.copy(this.orientation);

    // Attach all rocket parts to the pivot group so they move together
    for (const part of this.parts) {
      // Get the part's current world position
      const worldPos = part.getWorldPosition();

      // Remove from current parent (launch pad) and add to pivot
      if (part.mesh.parent) {
        part.mesh.parent.remove(part.mesh);
      }
      this.pivot.add(part.mesh);

      // Convert world position to local position relative to pivot
      const localPos = worldPos.clone().sub(this.position);
      const inverseOrientation = this.orientation.clone().invert();
      localPos.applyQuaternion(inverseOrientation);
      part.mesh.position.copy(localPos);

      // Reset rotation to local space (parts were already oriented correctly)
      part.mesh.quaternion.identity();
    }

    // Find closest planet for initial gravity calculation
    this.updateClosestPlanet();

    // Initialize exhaust particle system with engine positions
    this.initializeExhaust();

    console.log(`Rocket initialized: ${this.parts.length} parts, wet mass: ${this.totalWetMass}kg, dry mass: ${this.totalDryMass}kg`);
    console.log(`Fuel capacity: ${this.totalFuelCapacity}, thrust: ${this.totalThrust}N`);
  }

  /**
   * Initialize the exhaust particle system with engine locations
   */
  private initializeExhaust(): void {
    // Find all engine parts and calculate their exhaust positions
    const engineOffsets: THREE.Vector3[] = [];

    // Only the active (lowest) stage's engines fire (rocket-staging)
    for (const part of stagesOf(this.parts, p => p.itemType)[0] ?? []) {
      if (part.isEngine()) {
        // Get the engine's world position
        const engineWorldPos = part.getWorldPosition();

        // Convert to local space relative to pivot
        const localPos = engineWorldPos.clone().sub(this.position);

        // Rotate to local coordinate system
        const inverseOrientation = this.orientation.clone().invert();
        localPos.applyQuaternion(inverseOrientation);

        // Offset to bottom of engine (exhaust point)
        // Engine exhaust comes from bottom, so offset down in local space
        localPos.y -= 0.5;  // Half the engine height approximately

        engineOffsets.push(localPos);
      }
    }

    // If no engines found, add a default exhaust point at bottom
    if (engineOffsets.length === 0) {
      engineOffsets.push(new THREE.Vector3(0, -1, 0));
    }

    this.rocketExhaust.initialize(this.pivot, engineOffsets);

    // Initialize side thruster particle system
    this.initializeSideThrusters();
  }

  /**
   * Initialize the side thruster particle system for strafe visual effects
   */
  private initializeSideThrusters(): void {
    this.sideThrusterGeometry = new THREE.BufferGeometry();

    const positions = new Float32Array(this.SIDE_THRUSTER_PARTICLES * 3);
    const colors = new Float32Array(this.SIDE_THRUSTER_PARTICLES * 3);
    const sizes = new Float32Array(this.SIDE_THRUSTER_PARTICLES);

    // Initialize all particles as dead (off-screen)
    for (let i = 0; i < this.SIDE_THRUSTER_PARTICLES; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -10000; // Off-screen
      positions[i * 3 + 2] = 0;
      colors[i * 3] = 0.4;     // Cyan-ish color for RCS thrusters
      colors[i * 3 + 1] = 0.8;
      colors[i * 3 + 2] = 1.0;
      sizes[i] = 0;
      this.sideThrusterLives.push(1.0); // Dead
      this.sideThrusterVelocities.push(new THREE.Vector3());
    }

    this.sideThrusterGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.sideThrusterGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.sideThrusterGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.sideThrusterMesh = new THREE.Points(this.sideThrusterGeometry, material);
    this.sideThrusterMesh.frustumCulled = false;
    this.sideThrusterMesh.renderOrder = 101;
    this.scene.add(this.sideThrusterMesh);
  }

  /**
   * Update side thruster particles based on strafe input
   */
  public updateSideThrusters(deltaTime: number, input: RocketInputState): void {
    if (!this.sideThrusterGeometry || !this.sideThrusterMesh) return;

    const positions = this.sideThrusterGeometry.attributes.position.array as Float32Array;
    const sizes = this.sideThrusterGeometry.attributes.size.array as Float32Array;

    const stackCenter = this.getStackCenter();
    const cappedDelta = Math.min(deltaTime, 0.05);

    // Determine which thrusters are active based on input
    // Thrusters fire OPPOSITE to movement direction
    const thrusterDirections: THREE.Vector3[] = [];

    if (input.strafeLeft) {
      thrusterDirections.push(this.getLocalRight().clone()); // Fire right to move left
    }
    if (input.strafeRight) {
      thrusterDirections.push(this.getLocalRight().clone().multiplyScalar(-1)); // Fire left to move right
    }
    if (input.strafeForward) {
      thrusterDirections.push(this.getLocalForward().clone().multiplyScalar(-1)); // Fire backward to move forward
    }
    if (input.strafeBackward) {
      thrusterDirections.push(this.getLocalForward().clone()); // Fire forward to move backward
    }
    // Note: strafeUp (Space) is handled by main thrust, not side thrusters
    // strafeDown (C) is handled separately below with particles at top of rocket

    // Find dead particles for spawning
    const deadSlots: number[] = [];

    // Update existing particles
    for (let i = 0; i < this.SIDE_THRUSTER_PARTICLES; i++) {
      if (this.sideThrusterLives[i] < 1.0) {
        // Update living particle
        this.sideThrusterLives[i] += cappedDelta / 0.15; // 0.15 second lifetime

        if (this.sideThrusterLives[i] >= 1.0) {
          this.sideThrusterLives[i] = 1.0;
          sizes[i] = 0;
          positions[i * 3 + 1] = -10000; // Move off-screen
          deadSlots.push(i);
        } else {
          // Move particle along its velocity
          const vel = this.sideThrusterVelocities[i];
          positions[i * 3] += vel.x * cappedDelta;
          positions[i * 3 + 1] += vel.y * cappedDelta;
          positions[i * 3 + 2] += vel.z * cappedDelta;

          // Fade out size
          sizes[i] = (1.0 - this.sideThrusterLives[i]) * 0.4;
        }
      } else {
        deadSlots.push(i);
      }
    }

    // Spawn new particles if thrusters are active
    if (thrusterDirections.length > 0 && deadSlots.length > 0) {
      this.sideThrusterSpawnAccum += cappedDelta;
      const spawnInterval = 1.0 / (80 * thrusterDirections.length); // 80 particles per second per thruster

      let spawned = 0;
      const maxSpawnPerFrame = Math.min(8, deadSlots.length);

      while (this.sideThrusterSpawnAccum >= spawnInterval && spawned < maxSpawnPerFrame) {
        this.sideThrusterSpawnAccum -= spawnInterval;

        const slot = deadSlots[spawned];
        const thrusterDir = thrusterDirections[spawned % thrusterDirections.length];

        // Spawn at stack center with slight random offset
        const spawnPos = stackCenter.clone();
        spawnPos.add(thrusterDir.clone().multiplyScalar(0.3)); // Slight offset toward thruster

        // Add random perpendicular spread
        const spreadAmount = 0.2;
        const up = this.getLocalUp();
        spawnPos.add(up.clone().multiplyScalar((Math.random() - 0.5) * spreadAmount));

        positions[slot * 3] = spawnPos.x;
        positions[slot * 3 + 1] = spawnPos.y;
        positions[slot * 3 + 2] = spawnPos.z;

        // Velocity in thruster direction (exhaust goes opposite to thrust)
        const speed = 8 + Math.random() * 4;
        this.sideThrusterVelocities[slot].copy(thrusterDir).multiplyScalar(speed);

        this.sideThrusterLives[slot] = 0.0;
        sizes[slot] = 0.4;

        spawned++;
      }

      this.sideThrusterSpawnAccum = Math.min(this.sideThrusterSpawnAccum, spawnInterval * 2);
    }

    // Handle descent thrusters separately (particles spawn at top of rocket)
    if (input.strafeDown && deadSlots.length > 0) {
      // Calculate total rocket height
      let totalHeightUnits = 0;
      for (const part of this.parts) {
        totalHeightUnits += part.getHeightUnits();
      }
      const rocketTopHeight = totalHeightUnits * 2 + 1; // Each part is 2 units tall, +1 for above top

      // Spawn particles at top of rocket
      const topSpawnInterval = 1.0 / 80; // 80 particles per second
      this.sideThrusterSpawnAccum += cappedDelta;

      let spawned = 0;
      const maxSpawn = Math.min(4, deadSlots.length);

      while (this.sideThrusterSpawnAccum >= topSpawnInterval && spawned < maxSpawn) {
        this.sideThrusterSpawnAccum -= topSpawnInterval;

        const slot = deadSlots[spawned];

        // Spawn at top of rocket
        const topOffset = new THREE.Vector3(
          PlayerConfig.ROCKET_STACK_OFFSET_X + (Math.random() - 0.5) * 0.4,
          PlayerConfig.ROCKET_STACK_OFFSET_Y + rocketTopHeight,
          PlayerConfig.ROCKET_STACK_OFFSET_Z + (Math.random() - 0.5) * 0.4
        );
        const spawnPos = topOffset.applyQuaternion(this.orientation).add(this.position);

        positions[slot * 3] = spawnPos.x;
        positions[slot * 3 + 1] = spawnPos.y;
        positions[slot * 3 + 2] = spawnPos.z;

        // Velocity fires upward (away from rocket top)
        const upDir = this.getLocalUp();
        const speed = 8 + Math.random() * 4;
        this.sideThrusterVelocities[slot].copy(upDir).multiplyScalar(speed);

        this.sideThrusterLives[slot] = 0.0;
        sizes[slot] = 0.4;

        spawned++;
      }
    }

    this.sideThrusterGeometry.attributes.position.needsUpdate = true;
    this.sideThrusterGeometry.attributes.size.needsUpdate = true;
  }

  /**
   * Calculate the center of the rocket stack and store local offset
   * Uses the rocket stack offset from PlayerConfig plus vertical centering based on stack height
   */
  private calculateStackCenter(): void {
    // Calculate total height of the rocket stack in height units
    let totalHeightUnits = 0;
    for (const part of this.parts) {
      totalHeightUnits += part.getHeightUnits();
    }

    // Center vertically on the stack (half the total height)
    const verticalCenter = totalHeightUnits / 2 * 2; //each part is 2 units tall

    // Use the known offset from PlayerConfig plus vertical centering
    this.stackCenterOffset.set(
      PlayerConfig.ROCKET_STACK_OFFSET_X,
      PlayerConfig.ROCKET_STACK_OFFSET_Y + verticalCenter,
      PlayerConfig.ROCKET_STACK_OFFSET_Z
    );
  }

  /**
   * Get the world-space position of the rocket stack center (for camera targeting)
   */
  public getStackCenter(): THREE.Vector3 {
    // Transform the local stack center offset to world space and add to position
    const worldOffset = this.stackCenterOffset.clone().applyQuaternion(this.orientation);
    return this.position.clone().add(worldOffset);
  }

  /**
   * Calculate mass and propulsion properties from parts (and what the cargo
   * hold carries and the equipment slots hold) - summed in RocketPerformance,
   * the one source of the numbers
   */
  private calculateMassProperties(): void {
    const types = stackItemTypes(this.parts);
    this.engineMode = validEngineMode(types, this.engineMode);
    const stats = computeRocketStats(types, cargoMass(this.cargo), this.engineMode, this.equipment);
    // Only the active (lowest) stage's engines fire, on its own tanks
    const active = stagedStats(types, cargoMass(this.cargo), this.engineMode, this.equipment).stages[0];
    this.stageCapacities = stagesOf(types, t => t).map(g => computeRocketStats(g).fuelCapacity);
    this.totalDryMass = stats.dryMass;
    this.totalWetMass = stats.wetMass;
    this.totalFuelCapacity = active.fuelCapacity;
    this.totalThrust = active.thrust;
    this.totalFuelConsumption = active.fuelFlow;
    this.batteryCapacityWh = stats.batteryWh;
    this.powerDrawW = stats.powerDrawW;
    this.solarW = stats.solarW;
    this.rtgW = stats.rtgW;
    this.cooling = stats.cooling;
    this.chuteBrake = stats.chuteBrake;
    this.chargeWh = Math.min(this.chargeWh, this.batteryCapacityWh);

    // Start with full fuel
    this.setFuelTotal(Infinity);
  }

  /** Every stage's tanks together */
  private allFuelCapacity(): number {
    return this.stageCapacities.reduce((a, b) => a + b, 0);
  }

  /** Set the fuel aboard as one total, filled into the stages bottom first (rocket-staging) */
  private setFuelTotal(total: number): void {
    const fills = fillStages(Math.min(total, this.allFuelCapacity()), this.stageCapacities);
    this.currentFuel = fills[0] ?? 0;
    this.upperFuel = fills.slice(1);
  }

  // Cargo items owed to the engines, carried between frames (whole items leave the hold)
  private consumeOwed = new Map<ItemType, number>();

  /**
   * Feed the active stage's engines for this step (rocket-tiers): the
   * charge an ion thruster draws, and the pulse units / helium-3 /
   * deuterium a drive uses from the cargo hold. False (with a toast) when
   * something has run out - the engines can't fire.
   */
  private feedEngines(deltaTime: number): boolean {
    const active = stagesOf(stackItemTypes(this.parts), t => t)[0] ?? [];
    const needs = engineNeeds(active, this.engineMode);
    const charge = feedCharge(this.chargeWh, needs.drawW, this.throttle, deltaTime);
    this.chargeWh = charge.chargeWh;
    if (!charge.firing) return false;
    if (needs.consumes.size === 0) return true;
    const hold = this.cargo ? slotStore(this.cargo) : null;
    for (const [item, perS] of needs.consumes) {
      const owed = (this.consumeOwed.get(item) ?? 0) + perS * this.throttle * deltaTime;
      const whole = Math.floor(owed);
      if (whole > 0) {
        const got = hold?.removeItem(item, whole) ?? 0;
        if (got < whole) {
          showToast(`Out of ${ITEM_DATA[item]?.name ?? 'engine supplies'} - load more into the cargo hold`, { duration: 3000 });
          this.consumeOwed.set(item, 0);
          this.refreshCargoMass();
          return false;
        }
        this.refreshCargoMass();
      }
      this.consumeOwed.set(item, owed - whole);
      if ((hold?.getItemCount(item) ?? 0) <= 0 && owed - whole > 0) {
        showToast(`Out of ${ITEM_DATA[item]?.name ?? 'engine supplies'} - load more into the cargo hold`, { duration: 3000 });
        return false;
      }
    }
    return true;
  }

  /** Stages left, and the active stage's fuel (the HUD) */
  public getStageInfo(): { count: number; activeFuel: number; activeCapacity: number } {
    return { count: this.stageCapacities.length, activeFuel: this.currentFuel, activeCapacity: this.totalFuelCapacity };
  }

  /**
   * Drop the active stage (rocket-staging): its parts leave the rocket and
   * fall away, the stage above becomes active on its own tanks, and the
   * rocket's base moves up to the new bottom. Refused with one stage left.
   */
  /**
   * Launch a survey drone at the body below (space-exploration upgrade):
   * one leaves the equipment and the body counts as surveyed, as a beacon
   * planted there would. Refused without a drone or a body in reach.
   */
  public launchDrone(): boolean {
    const slot = (this.equipment ?? []).find(s => equipmentStats(s.itemType)?.drone && s.quantity > 0);
    if (!slot) { showToast('No survey drone aboard', { duration: 2000 }); return false; }
    const body = droneTarget(this.position, this.planets);
    if (!body) { showToast('No airless body in drone range', { duration: 2000 }); return false; }
    slot.quantity -= 1;
    if (slot.quantity <= 0) { slot.itemType = ItemType.NONE; slot.quantity = 0; }
    this.refreshCargoMass();
    this.onChanged?.();
    emitGameEvent('surveyed', body.id);
    showToast(`Survey drone: ${body.name} surveyed`, { duration: 3000 });
    return true;
  }

  public dropStage(): boolean {
    const stages = stagesOf(this.parts, p => p.itemType);
    if (stages.length <= 1) {
      showToast('Last stage - nothing to drop', { duration: 2000 });
      return false;
    }
    const dropped = stages[0];
    const kept = this.parts.filter(p => !dropped.includes(p));
    const fuelAbove = this.upperFuel.reduce((a, b) => a + b, 0);
    // The new bottom: the lowest kept part's base, in the pivot's frame
    const base = (p: RocketPart) => p.mesh.position.y;
    const lift = Math.min(...kept.map(base)) - Math.min(...dropped.map(base));
    // The dropped parts become falling debris, where they are now
    const group = new THREE.Group();
    this.scene.add(group);
    this.pivot.updateMatrixWorld(true);
    for (const p of dropped) group.attach(p.mesh);
    this.debris.push({ group, velocity: this.velocity.clone(), age: 0 });
    // The rest: the base moves up to them, so landings and the camera follow
    this.parts = kept;
    for (const p of kept) p.mesh.position.y -= lift;
    this.position.addScaledVector(this.getLocalUp(), lift);
    this.pivot.position.copy(this.position);
    this.calculateStackCenter();
    this.calculateMassProperties();
    this.setFuelTotal(fuelAbove);
    this.rocketExhaust.dispose();
    this.rocketExhaust = new RocketExhaust(this.scene);
    this.initializeExhaust();
    showToast(`Stage dropped - ${stagesOf(this.parts, p => p.itemType).length} left`, { duration: 2500 });
    this.onStageDropped?.(dropped);
    this.onChanged?.();
    return true;
  }

  /** Dropped stages fall under the nearest body's gravity until they land or time out */
  private updateDebris(deltaTime: number): void {
    for (let i = this.debris.length - 1; i >= 0; i--) {
      const d = this.debris[i];
      d.age += deltaTime;
      const pos = d.group.position;
      let landed = false;
      if (this.closestPlanet) {
        const toCentre = this.closestPlanet.center.clone().sub(pos);
        const dist = toCentre.length();
        const g = this.gravityMultiplier * PlayerConfig.BASE_GRAVITY * this.closestPlanet.gravityStrength;
        d.velocity.addScaledVector(toCentre.normalize(), g * deltaTime);
        landed = !this.closestPlanet.gasGiant && dist < this.closestPlanet.radius;
      }
      pos.addScaledVector(d.velocity, deltaTime);
      if (landed || d.age > ROCKET_CONFIG.STAGE_DEBRIS_LIFE_S) {
        disposeObject(d.group);
        this.debris.splice(i, 1);
      }
    }
  }

  // Which engines fire (design 6b): null = all of them
  private engineMode: EngineMode = null;

  public getEngineMode(): EngineMode {
    return this.engineMode;
  }

  /** The modes this rocket can fly in (just All for one engine type) */
  public getEngineModes(): EngineMode[] {
    return engineModes(stackItemTypes(this.parts));
  }

  /** Switch to the next engine mode (fuel kept); false if there is only one */
  public cycleEngineMode(): boolean {
    const types = stackItemTypes(this.parts);
    if (engineModes(types).length < 2) return false;
    this.engineMode = nextEngineMode(types, this.engineMode);
    this.refreshCargoMass();
    this.onChanged?.();
    return true;
  }

  /** Re-weigh the rocket after its cargo or equipment changed (fuel and charge kept) */
  public refreshCargoMass(): void {
    const fuel = this.getFuelUnits();
    this.calculateMassProperties();
    this.setFuelTotal(fuel);
  }

  /**
   * Get current mass based on fuel level
   */
  public getCurrentMass(): number {
    // the dry stack, cargo and equipment, plus the fuel in every stage
    return this.totalDryMass + this.getFuelUnits() * ROCKET_CONFIG.FUEL_KG_PER_UNIT;
  }

  /**
   * Calculate thrust-to-weight ratio at current throttle
   */
  public getThrustToWeightRatio(): number {
    const mass = this.getCurrentMass();
    if (mass === 0) return 0;

    const gravity = this.getGravityInfo();
    const weight = mass * gravity.magnitude;
    if (weight === 0) return Infinity;  // In space

    return (poweredThrust(this.totalThrust, this.chargeWh) * this.throttle) / weight;
  }

  /**
   * Calculate remaining delta-V (Tsiolkovsky rocket equation)
   */
  public getRemainingDeltaV(): number {
    // Each remaining stage burns its own fuel carrying the stages above it
    return stagedDeltaVWith(stackItemTypes(this.parts), cargoMass(this.cargo), this.engineMode, this.equipment, this.getFuelUnits());
  }

  /**
   * Calculate burn time remaining at current throttle
   */
  public getBurnTimeRemaining(): number {
    if (this.throttle === 0 || this.totalFuelConsumption === 0) return Infinity;
    return this.currentFuel / (this.totalFuelConsumption * this.throttle);
  }

  /**
   * Update the closest planet for gravity calculations
   */
  private updateClosestPlanet(): void {
    let closest: PlanetGravitySource | null = null;
    let closestDist = Infinity;

    for (const planet of this.planets) {
      const dist = this.position.distanceTo(planet.center);
      if (dist < closestDist) {
        closestDist = dist;
        closest = planet;
      }
    }

    this.closestPlanet = closest;

    // Calculate gravity well status
    if (closest) {
      this.gravityMultiplier = gravityWellMultiplier(closestDist, closest.radius);
      this.isInGravityWell = this.gravityMultiplier > 0.1;  // Small threshold
    } else {
      this.isInGravityWell = false;
      this.gravityMultiplier = 0;
    }
  }

  /**
   * Get current gravity info
   */
  public getGravityInfo(): GravityInfo {
    const acceleration = new THREE.Vector3();
    let sourceName = 'None';

    if (this.closestPlanet && this.gravityMultiplier > 0) {
      const direction = this.closestPlanet.center.clone().sub(this.position).normalize();
      const magnitude = PlayerConfig.BASE_GRAVITY * this.closestPlanet.gravityStrength * this.gravityMultiplier;
      acceleration.copy(direction).multiplyScalar(magnitude);
      sourceName = this.closestPlanet.name;
    }

    return {
      totalAcceleration: acceleration,
      magnitude: acceleration.length(),
      sourceName,
      isInGravityWell: this.isInGravityWell,
      gravityMultiplier: this.gravityMultiplier,
    };
  }

  /**
   * Get altitude above nearest surface
   */
  public getAltitude(): number {
    if (!this.closestPlanet) return Infinity;

    // Get actual terrain height if callback is available, otherwise use base radius
    const direction = this.position.clone().sub(this.closestPlanet.center).normalize();
    let surfaceRadius = this.closestPlanet.radius;
    if (this.closestPlanet.getSurfaceHeight) {
      surfaceRadius = this.closestPlanet.getSurfaceHeight(direction);
    }

    return this.position.distanceTo(this.closestPlanet.center) - surfaceRadius;
  }

  /**
   * Get vertical velocity (positive = moving away from planet)
   */
  public getVerticalVelocity(): number {
    if (!this.closestPlanet) return this.velocity.length();

    const upDir = this.position.clone().sub(this.closestPlanet.center).normalize();
    return this.velocity.dot(upDir);
  }

  /**
   * Board the rocket (player enters)
   */
  public board(camera: THREE.PerspectiveCamera): boolean {
    if (this.stateMachine.getState() !== RocketState.DOCKED) {
      return false;
    }

    // Store boarded position for respawn
    this.lastBoardedPosition.copy(this.position);
    this.lastBoardedOrientation.copy(this.orientation);

    // Create camera controller
    this.rocketCamera = new RocketCamera(camera);
    // Use stack center instead of pivot position for camera focus
    const stackCenter = this.getStackCenter();
    this.rocketCamera.setRocketTransform(stackCenter, this.orientation);
    this.rocketCamera.reset();
    this.rocketCamera.snap();

    // Transition to boarded state
    return this.stateMachine.transitionTo(RocketState.BOARDED_GROUNDED);
  }

  /**
   * Exit the rocket (player leaves)
   */
  /**
   * Can the pilot climb out right now: wherever the state allows it (on the
   * ground, landed), and in flight once the rocket is out of every gravity
   * well - in space the ship parks where it floats and the player floats
   * out beside it.
   */
  public canExitNow(): boolean {
    if (this.stateMachine.getStateInfo().canExit) return true;
    return this.isInSpace();
  }

  /** In flight with no planet's gravity on the rocket */
  public isInSpace(): boolean {
    return this.stateMachine.getState() === RocketState.IN_FLIGHT && !this.isInGravityWell;
  }

  public exit(): boolean {
    if (!this.canExitNow()) {
      return false;
    }

    this.rocketCamera = null;

    // Transition based on current state
    const state = this.stateMachine.getState();
    if (state === RocketState.BOARDED_GROUNDED) {
      return this.stateMachine.transitionTo(RocketState.DOCKED);
    } else if (state === RocketState.LANDED || state === RocketState.IN_FLIGHT) {
      return this.stateMachine.transitionTo(RocketState.DOCKED);
    }

    return false;
  }

  /**
   * Process input and update rocket state
   */
  public update(deltaTime: number, input: RocketInputState): void {
    // Update planet tracking
    this.updateClosestPlanet();

    // Handle state-specific logic
    const state = this.stateMachine.getState();
    const stateInfo = STATE_INFO[state];

    // Process controls
    this.processControls(deltaTime, input, stateInfo);
    this.updateSelfDestruct(deltaTime, input);

    // Run physics if active
    if (stateInfo.physicsActive) {
      this.updatePhysics(deltaTime);
      this.updatePower(deltaTime);
    }
    if (state !== RocketState.CRASHED) {
      this.updateSolar(deltaTime);
      this.updateParachute(input, stateInfo.physicsActive);
      this.updateReentry(deltaTime, stateInfo.physicsActive);
    }

    // Update visual transform
    this.pivot.position.copy(this.position);
    this.pivot.quaternion.copy(this.orientation);

    // RCS thruster lines for the turn commanded this frame
    this.updateRcsLines();
    // Dropped stages falling away
    this.updateDebris(deltaTime);

    // Update camera
    if (this.rocketCamera) {
      const stackCenter = this.getStackCenter();
      this.rocketCamera.setRocketTransform(stackCenter, this.orientation);
      this.rocketCamera.update(deltaTime);
    }

    // Update exhaust particles
    const exhaustActive = this.isExhaustActive();
    this.rocketExhaust.setActive(exhaustActive);
    this.rocketExhaust.setThrottle(this.throttle);
    this.rocketExhaust.update(deltaTime);

    // Update rocket engine sound
    if (exhaustActive) {
      // Start or update engine loop
      // Pitch varies from 0.8 (low throttle) to 1.2 (full throttle)
      AudioManager.playLoop('rocket_engine', 'rocket_engine', {
        position: this.position.clone(),
        volume: 0.3 + this.throttle * 0.7, // Scale volume with throttle
        playbackRate: 0.8 + this.throttle * 0.4, // Scale pitch with throttle
      });
    } else {
      // Stop engine loop
      AudioManager.stopLoop('rocket_engine');
    }

    // Update side thruster particles (for strafe visual effects)
    this.updateSideThrusters(deltaTime, input);

    // Check state transitions
    this.checkStateTransitions();
  }

  /**
   * Process control inputs
   */
  private processControls(deltaTime: number, input: RocketInputState, stateInfo: typeof STATE_INFO[RocketState]): void {
    // No turn unless the steering below commands one (no power, can't steer: no jets)
    this.rcsCommand.set(0, 0, 0);
    // Throttle control
    if (stateInfo.canThrust) {
      if (input.throttleUp) {
        this.throttle = Math.min(1, this.throttle + ROCKET_CONFIG.CONTROLS.throttleHoldRate * deltaTime);
      }
      if (input.throttleDown) {
        this.throttle = Math.max(0, this.throttle - ROCKET_CONFIG.CONTROLS.throttleHoldRate * deltaTime);
      }

      // Thrust toggle (edge triggered)
      if (input.thrustToggle && !this.lastThrustToggle) {
        this.isThrustActive = !this.isThrustActive;
        console.log(`Thrust ${this.isThrustActive ? 'ON' : 'OFF'}`);
      }
    }
    this.lastThrustToggle = input.thrustToggle;

    // Rotation control (WASD + Q/E always controls rotation); a flat
    // battery runs nothing - no turning, no strafe thrusters
    if (stateInfo.canSteer && this.hasPower()) {
      const cfg = ROCKET_CONFIG.CONTROLS;

      // Full 6DOF rotation with WASD + Q/E
      if (input.pitchDown) this.applyTorque(this.getLocalRight(), -cfg.pitchSpeed * deltaTime);
      if (input.pitchUp) this.applyTorque(this.getLocalRight(), cfg.pitchSpeed * deltaTime);
      if (input.yawLeft) this.applyTorque(this.getLocalUp(), cfg.yawSpeed * deltaTime);
      if (input.yawRight) this.applyTorque(this.getLocalUp(), -cfg.yawSpeed * deltaTime);
      if (input.rollLeft) this.applyTorque(this.getLocalForward(), -cfg.rollSpeed * deltaTime);
      if (input.rollRight) this.applyTorque(this.getLocalForward(), cfg.rollSpeed * deltaTime);
      // The same turn, per local axis, for the RCS thruster lines
      this.rcsCommand.set(
        (input.pitchUp ? 1 : 0) - (input.pitchDown ? 1 : 0),
        (input.yawLeft ? 1 : 0) - (input.yawRight ? 1 : 0),
        (input.rollRight ? 1 : 0) - (input.rollLeft ? 1 : 0),
      );

      // Strafe thrusters (Arrow keys + C for descent - always available)
      const strafeDir = new THREE.Vector3();
      if (input.strafeLeft) strafeDir.add(this.getLocalRight().multiplyScalar(-1));
      if (input.strafeRight) strafeDir.add(this.getLocalRight());
      if (input.strafeForward) strafeDir.add(this.getLocalForward());
      if (input.strafeBackward) strafeDir.add(this.getLocalForward().multiplyScalar(-1));
      if (input.strafeUp) strafeDir.add(this.getLocalUp());
      if (input.strafeDown) strafeDir.add(this.getLocalUp().multiplyScalar(-1));

      if (strafeDir.lengthSq() > 0 && this.currentFuel > 0) {
        strafeDir.normalize();
        const strafeForce = strafeDir.multiplyScalar(cfg.strafeForce);
        this.applyForce(strafeForce, deltaTime);
        // Consume fuel for strafe thrusters
        const strafeFuelUsed = cfg.strafeFuelConsumption * deltaTime;
        this.currentFuel = Math.max(0, this.currentFuel - strafeFuelUsed);
      }
    }

    // Exit request
    if (input.exit && stateInfo.canExit) {
      this.exit();
    }

    // Fuel request: a fresh press (the F that boarded doesn't count), and
    // only standing on a body's ground - never in space
    if (input.fuel && !this.lastFuelInput && stateInfo.canFuel) {
      this.refuel();
    }
    this.lastFuelInput = input.fuel;
  }

  /**
   * Update physics simulation
   */
  private updatePhysics(deltaTime: number): void {
    const mass = this.getCurrentMass();

    // === GRAVITY ===
    const gravity = this.getGravityInfo();
    if (gravity.magnitude > 0) {
      this.velocity.addScaledVector(gravity.totalAcceleration, deltaTime);
    }

    // === THRUST ===
    const thrust = poweredThrust(this.totalThrust, this.chargeWh);
    // What the active stage's engines need besides fuel: charge, cargo items
    if (this.isThrustActive && this.throttle > 0 && thrust > 0 && !this.feedEngines(deltaTime)) {
      this.isThrustActive = false;
    }
    if (this.isThrustActive && this.currentFuel > 0 && this.throttle > 0 && thrust > 0) {
      const thrustMagnitude = thrust * this.throttle;
      const thrustAccel = thrustMagnitude / mass;
      const thrustDir = this.getLocalUp();  // Thrust always along rocket's "up"

      this.velocity.addScaledVector(thrustDir, thrustAccel * deltaTime);

      // Consume fuel
      const fuelUsed = this.totalFuelConsumption * this.throttle * deltaTime;
      this.currentFuel = Math.max(0, this.currentFuel - fuelUsed);

      if (this.currentFuel <= 0) {
        console.log('Fuel depleted!');
        this.isThrustActive = false;
      }
    }

    // === ANGULAR DAMPING ===
    this.angularVelocity.multiplyScalar(dampingFactor(ROCKET_CONFIG.PHYSICS.angularDamping, deltaTime));

    // === ORIENTATION UPDATE ===
    if (this.angularVelocity.lengthSq() > 0.0001) {
      const angle = this.angularVelocity.length() * deltaTime;
      const axis = this.angularVelocity.clone().normalize();
      const deltaQuat = new THREE.Quaternion().setFromAxisAngle(axis, angle);
      this.orientation.premultiply(deltaQuat);
      this.orientation.normalize();
    }

    // === LINEAR DAMPING ===
    // Apply linear damping everywhere (prevents infinite drift)
    this.velocity.multiplyScalar(dampingFactor(ROCKET_CONFIG.PHYSICS.linearDamping, deltaTime));

    // === PARACHUTE ===
    // Open: the descent settles on the chute's terminal velocity, sideways
    // motion bleeds off, and it swings the nose up away from the ground
    if (this.chuteOpen && this.closestPlanet) {
      const up = this.position.clone().sub(this.closestPlanet.center).normalize();
      const fall = -this.velocity.dot(up);
      const density = this.atmosphereDensity || 1;
      const side = this.velocity.clone().addScaledVector(up, fall).multiplyScalar(chuteSideFactor(deltaTime, density));
      const newFall = chuteDescentSpeed(fall, gravity.magnitude, deltaTime, density, this.chuteBrake);
      this.velocity.copy(side).addScaledVector(up, -newFall);
      const rocketUp = this.getLocalUp();
      const axis = new THREE.Vector3().crossVectors(rocketUp, up);
      if (axis.lengthSq() > 1e-8) {
        const angle = Math.acos(Math.max(-1, Math.min(1, rocketUp.dot(up))));
        const turn = angle * (1 - Math.exp(-ROCKET_CONFIG.PARACHUTE.uprightRate * deltaTime));
        this.orientation.premultiply(new THREE.Quaternion().setFromAxisAngle(axis.normalize(), turn)).normalize();
        this.angularVelocity.multiplyScalar(chuteSideFactor(deltaTime));
      }
    }

    // === POSITION UPDATE ===
    this.position.addScaledVector(this.velocity, deltaTime);

    // === GAS GIANTS: no ground - a skim below the cloud tops, crushed deeper ===
    if (this.closestPlanet?.gasGiant) {
      const g = this.closestPlanet;
      const dist = this.position.distanceTo(g.center);
      const cfgG = ROCKET_CONFIG.GAS_GIANT_FLIGHT;
      if (dist < g.radius * (1 - cfgG.crushDepth)) {
        this.explode('crushed');
        return;
      }
      if (dist < g.radius) this.giantDip = g.id;
      else if (this.giantDip === g.id && dist > g.radius * cfgG.skimExitMult) {
        this.giantDip = null;
        emitGameEvent('skimmed', g.id);
        showToast(`Skimmed ${g.name}`, { duration: 3000 });
      }
    }

    // === GROUND COLLISION ===
    // Prevent rocket from clipping through the planet surface (a gas giant has none)
    if (this.closestPlanet && !this.closestPlanet.gasGiant) {
      const surfaceNormal = this.position.clone().sub(this.closestPlanet.center).normalize();
      const distFromCenter = this.position.distanceTo(this.closestPlanet.center);

      // Get actual terrain height if callback is available, otherwise use base radius
      let surfaceRadius = this.closestPlanet.radius;
      if (this.closestPlanet.getSurfaceHeight) {
        surfaceRadius = this.closestPlanet.getSurfaceHeight(surfaceNormal);
      }

      const minDistance = surfaceRadius + ROCKET_CONFIG.THRESHOLDS.groundedCheckDistance;

      if (distFromCenter < minDistance) {
        // Rocket is below or at surface - push it back up
        this.position.copy(this.closestPlanet.center).addScaledVector(surfaceNormal, minDistance);

        // Kill velocity component going into the surface
        const verticalVelocity = this.velocity.dot(surfaceNormal);
        if (verticalVelocity < 0) {
          this.velocity.addScaledVector(surfaceNormal, -verticalVelocity);
        }
      }
    }
  }

  /**
   * Apply a force to the rocket
   */
  private applyForce(force: THREE.Vector3, deltaTime: number): void {
    const mass = this.getCurrentMass();
    const acceleration = force.clone().divideScalar(mass);
    this.velocity.addScaledVector(acceleration, deltaTime);
  }

  /**
   * Apply torque (angular force) around an axis
   */
  private applyTorque(axis: THREE.Vector3, amount: number): void {
    this.angularVelocity.addScaledVector(axis, amount);
  }

  /**
   * Check and perform state transitions
   */
  private checkStateTransitions(): void {
    const state = this.stateMachine.getState();

    switch (state) {
      case RocketState.BOARDED_GROUNDED:
        // Check if we should transition to LAUNCHING
        if (this.isThrustActive && this.throttle > 0 && this.hasPower()) {
          const twr = this.getThrustToWeightRatio();
          if (twr > 1.0) {
            this.stateMachine.transitionTo(RocketState.LAUNCHING);
            this.hasLaunched = true;
            emitGameEvent('launched');
          }
        }
        break;

      case RocketState.LAUNCHING:
        // Check if we've lifted off
        const altitude = this.getAltitude();
        if (altitude > ROCKET_CONFIG.THRESHOLDS.launchAltitude) {
          this.stateMachine.transitionTo(RocketState.IN_FLIGHT);
        }
        // Check if thrust stopped before liftoff
        if (!this.isThrustActive || this.throttle === 0) {
          // Check if still on ground
          if (altitude < 1) {
            this.stateMachine.transitionTo(RocketState.BOARDED_GROUNDED);
          }
        }
        break;

      case RocketState.IN_FLIGHT:
        // Check if descending toward surface
        const vertVel = this.getVerticalVelocity();
        const alt = this.getAltitude();
        if (vertVel < 0 && alt < 100 && this.isInGravityWell && !this.closestPlanet?.gasGiant) {
          this.stateMachine.transitionTo(RocketState.LANDING);
        }
        break;

      case RocketState.LANDING:
        // Check for touchdown or crash
        const landingAlt = this.getAltitude();
        const impactVel = -this.getVerticalVelocity();  // Positive when falling

        if (landingAlt <= ROCKET_CONFIG.THRESHOLDS.groundedCheckDistance) {
          this.handleLanding(impactVel);
        }

        // Check if we're ascending again
        if (this.getVerticalVelocity() > 5) {
          this.stateMachine.transitionTo(RocketState.IN_FLIGHT);
        }
        break;

      case RocketState.LANDED:
        // Check if taking off again
        if (this.isThrustActive && this.throttle > 0 && this.hasPower()) {
          const twr = this.getThrustToWeightRatio();
          if (twr > 1.0) {
            this.stateMachine.transitionTo(RocketState.LAUNCHING);
            this.hasLaunched = true;
            emitGameEvent('launched');
          }
        }
        break;
    }
  }

  /**
   * Handle landing/crash
   * Rocket must land on its engine (pointing up from planet) to survive
   */
  private handleLanding(impactVelocity: number): void {
    // Check if rocket is oriented correctly (engine pointing down toward planet)
    // Rocket's local "up" should align with the surface normal (away from planet)
    const rocketUp = this.getLocalUp();
    let surfaceNormal = new THREE.Vector3(0, 1, 0);
    if (this.closestPlanet) {
      surfaceNormal = this.position.clone().sub(this.closestPlanet.center).normalize();
    }

    // Dot product: 1 = perfectly aligned, 0 = sideways, -1 = upside down
    const alignmentDot = rocketUp.dot(surfaceNormal);
    const isLandingOnEngine = alignmentDot > 0.7; // Allow ~45 degree tolerance

    if (!isLandingOnEngine) {
      // Crashed! Not landing on engine
      console.log(`Crash! Rocket not oriented correctly (alignment: ${alignmentDot.toFixed(2)})`);
      this.explode();
      return;
    }

    if (impactVelocity < ROCKET_CONFIG.HEALTH.impactDamageThreshold) {
      // Safe landing
      this.velocity.set(0, 0, 0);
      this.angularVelocity.set(0, 0, 0);

      // Update ground reference
      if (this.closestPlanet) {
        this.groundNormal.copy(surfaceNormal);
        this.groundPosition.copy(this.position);
      }

      // Snap orientation to surface normal for stable landing
      const currentUp = this.getLocalUp();
      const axis = new THREE.Vector3().crossVectors(currentUp, surfaceNormal);
      if (axis.lengthSq() > 0.0001) {
        axis.normalize();
        const angle = Math.acos(Math.max(-1, Math.min(1, currentUp.dot(surfaceNormal))));
        const rotQuat = new THREE.Quaternion().setFromAxisAngle(axis, angle);
        this.orientation.premultiply(rotQuat);
        this.orientation.normalize();
      }

      this.stateMachine.transitionTo(RocketState.LANDED);
      console.log(`Landed safely at ${impactVelocity.toFixed(1)} m/s`);
      // Down: no longer re-entering, and a chute that brought it down closes
      // (it was used up as it opened)
      this.leftAtmosphere = false;
      this.reentering = false;
      const bodyId = this.closestPlanet?.id;
      if (this.chuteOpen) {
        // keyed by the body, so a visit can ask for a chute landing there
        emitGameEvent('chuteLanded', bodyId);
        this.closeChute();
      }
      if (bodyId !== undefined) emitGameEvent('landed', bodyId);
    } else {
      // Too fast - crash!
      console.log(`Crash! Impact too fast: ${impactVelocity.toFixed(1)} m/s`);
      this.explode();
    }
  }

  /**
   * Explode the rocket
   */
  private explode(reason: CrashReason = 'impact'): void {
    this.crashReason = reason;
    this.closeChute();
    if (this.heatGlow) setHeatGlow(this.heatGlow, 0);
    this.stateMachine.transitionTo(RocketState.CRASHED);
    this.crashTime = performance.now();
    console.log('ROCKET EXPLODED!');

    // Play explosion sound
    AudioManager.play('explosion', { position: this.position.clone() });

    // Stop rocket engine sound if playing
    AudioManager.stopLoop('rocket_engine');

    // Stop all motion
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);

    // Disable thrust and exhaust
    this.isThrustActive = false;
    this.rocketExhaust.setActive(false);

    // Hide side thrusters
    if (this.sideThrusterMesh) {
      this.sideThrusterMesh.visible = false;
    }

    // Hide rocket parts
    this.pivot.visible = false;

    // Create explosion particle effect
    this.createExplosion();
  }

  /**
   * Create explosion particle effect
   */
  private createExplosion(): void {
    const particleCount = 200;
    const positions = new Float32Array(particleCount * 3);
    const velocities: THREE.Vector3[] = [];
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Start at rocket position
      positions[i * 3] = this.position.x;
      positions[i * 3 + 1] = this.position.y;
      positions[i * 3 + 2] = this.position.z;

      // Random velocity in all directions
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 30
      );
      velocities.push(velocity);

      // Orange/red/yellow colors
      const colorChoice = Math.random();
      if (colorChoice < 0.3) {
        // Yellow
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.9;
        colors[i * 3 + 2] = 0.2;
      } else if (colorChoice < 0.7) {
        // Orange
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.5;
        colors[i * 3 + 2] = 0.1;
      } else {
        // Red
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.2;
        colors[i * 3 + 2] = 0.1;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.5,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.explosionParticles = new THREE.Points(geometry, material);
    (this.explosionParticles as unknown as { velocities: THREE.Vector3[] }).velocities = velocities;
    this.scene.add(this.explosionParticles);
  }

  /**
   * Update explosion particles
   */
  public updateExplosion(deltaTime: number): void {
    if (!this.explosionParticles) return;

    const positions = this.explosionParticles.geometry.getAttribute('position') as THREE.BufferAttribute;
    const velocities = (this.explosionParticles as unknown as { velocities: THREE.Vector3[] }).velocities;
    const material = this.explosionParticles.material as THREE.PointsMaterial;

    // Calculate time since crash
    const timeSinceCrash = (performance.now() - this.crashTime) / 1000;

    // Fade out over 3 seconds
    material.opacity = Math.max(0, 1 - timeSinceCrash / 3);

    // Update particle positions
    for (let i = 0; i < velocities.length; i++) {
      positions.array[i * 3] += velocities[i].x * deltaTime;
      positions.array[i * 3 + 1] += velocities[i].y * deltaTime;
      positions.array[i * 3 + 2] += velocities[i].z * deltaTime;

      // Apply gravity toward planet
      if (this.closestPlanet) {
        const particlePos = new THREE.Vector3(
          positions.array[i * 3],
          positions.array[i * 3 + 1],
          positions.array[i * 3 + 2]
        );
        const gravDir = this.closestPlanet.center.clone().sub(particlePos).normalize();
        velocities[i].addScaledVector(gravDir, 10 * deltaTime);
      }

      // Slow down
      velocities[i].multiplyScalar(0.98);
    }

    positions.needsUpdate = true;

    // Remove particles after they fade out
    if (material.opacity <= 0) {
      this.scene.remove(this.explosionParticles);
      this.explosionParticles.geometry.dispose();
      (this.explosionParticles.material as THREE.Material).dispose();
      this.explosionParticles = null;
    }
  }

  /**
   * Get time since crash (for UI delay)
   */
  public getTimeSinceCrash(): number {
    if (this.crashTime === 0) return 0;
    return (performance.now() - this.crashTime) / 1000;
  }

  /**
   * Get last boarded position (for respawn)
   */
  public getLastBoardedPosition(): THREE.Vector3 {
    return this.lastBoardedPosition.clone();
  }

  /**
   * Where refuelling draws fuel from: given the units wanted and the rocket's
   * cargo hold, it burns what it can (ROCKET_CONFIG.FUEL_SOURCES, from the
   * cargo hold and the player's inventory) and returns the units supplied.
   * Unset = free refuel (tests / no inventory).
   */
  public static fuelSource: ((unitsWanted: number, cargo: InventorySlot[] | null) => number) | null = null;

  /** Called after refuelling or cargo use changed the rocket (to save it) */
  public onChanged: (() => void) | null = null;

  /**
   * Refuel the rocket from the fuel source
   */
  public refuel(): void {
    // only standing on a body's ground (the key and the flight panel's button both come here)
    if (this.getAltitude() > ROCKET_CONFIG.REFUEL_MAX_ALTITUDE_M) return;
    const have = this.getFuelUnits();
    const wanted = this.allFuelCapacity() - have;
    if (wanted <= 0) return;
    const supplied = RocketController.fuelSource ? RocketController.fuelSource(wanted, this.cargo) : wanted;
    if (supplied <= 0) return;
    this.setFuelTotal(have + supplied);
    this.refreshCargoMass();
    console.log(`Rocket refuelled: +${supplied.toFixed(0)} (${this.getFuelPercent().toFixed(0)}%)`);
    this.onChanged?.();
  }

  /** The cargo hold (shared with the launch pad the rocket belongs to) */
  public getCargo(): InventorySlot[] | null {
    return this.cargo;
  }

  /** The equipment slots (shared with the launch pad the same way) */
  public getEquipment(): InventorySlot[] | null {
    return this.equipment;
  }

  /** Fuel aboard in every stage (what the pad and saves record) */
  public getFuelUnits(): number {
    return this.currentFuel + this.upperFuel.reduce((a, b) => a + b, 0);
  }

  // === GETTERS ===

  public getLocalUp(): THREE.Vector3 {
    return new THREE.Vector3(0, 1, 0).applyQuaternion(this.orientation);
  }

  public getLocalForward(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, 1).applyQuaternion(this.orientation);
  }

  public getLocalRight(): THREE.Vector3 {
    return new THREE.Vector3(1, 0, 0).applyQuaternion(this.orientation);
  }

  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  /**
   * The reference frame changed under the rocket (it entered another body's
   * sphere of influence): move it by the frames' offset and take the new
   * frame's velocity off its own, at a tick boundary, so nothing jumps
   * (openspec navigation-and-orbits 8.2). Orientation is unchanged - the
   * frames differ by a translation only.
   */
  public rebase(offset: THREE.Vector3, frameVelocity: THREE.Vector3): void {
    this.position.add(offset);
    this.velocity.sub(frameVelocity);
    this.pivot.position.copy(this.position);
  }

  public getVelocity(): THREE.Vector3 {
    return this.velocity.clone();
  }

  public getOrientation(): THREE.Quaternion {
    return this.orientation.clone();
  }

  /** Engines burning (thrust on, throttle open, fuel left) - what the exhaust shows */
  public isExhaustActive(): boolean {
    return this.isThrustActive && this.throttle > 0 && this.currentFuel > 0
      && poweredThrust(this.totalThrust, this.chargeWh) > 0;
  }

  public getThrottle(): number {
    return this.throttle;
  }

  public setThrottle(value: number): void {
    this.throttle = Math.max(0, Math.min(1, value));
  }

  public isThrustOn(): boolean {
    return this.isThrustActive;
  }

  public getFuelPercent(): number {
    const cap = this.allFuelCapacity();
    if (cap === 0) return 0;
    return (this.getFuelUnits() / cap) * 100;
  }

  public getHealth(): number {
    return this.health;
  }

  /**
   * Whether the command module has power (openspec wool-air-and-reentry,
   * design 2): with none, the engines and steering stop and the cabin air
   * fails (the air system reads this).
   */
  public hasPower(): boolean {
    return this.chargeWh > 0;
  }

  /** The flight's charge, Wh */
  public getChargeWh(): number {
    return this.chargeWh;
  }

  /** The stack's battery capacity, Wh */
  public getChargeCapacityWh(): number {
    return this.batteryCapacityWh;
  }

  public getChargePercent(): number {
    return this.batteryCapacityWh > 0 ? (this.chargeWh / this.batteryCapacityWh) * 100 : 0;
  }

  /** Seconds of flight the charge has left */
  public getChargeSecondsLeft(): number {
    return chargeSecondsLeft(this.chargeWh, this.powerDrawW);
  }

  /** Re-entry heat as a share of the burn-up heat, 0-100 */
  public getHeatPercent(): number {
    return (this.heat / ROCKET_CONFIG.REENTRY.maxHeat) * 100;
  }

  public isReentering(): boolean {
    return this.reentering;
  }

  public isChuteOpen(): boolean {
    return this.chuteOpen;
  }

  /** Parachutes fitted in the equipment slots (each opens once) */
  public chutesFitted(): number {
    return chutesFitted(this.equipment);
  }

  /**
   * Self-destruct: holding the key for SELF_DESTRUCT_HOLD_S blows the rocket
   * up through the same crash path as an impact. Letting go cancels. Only
   * once launched - a rocket still on its pad is just left by climbing out.
   */
  private updateSelfDestruct(deltaTime: number, input: RocketInputState): void {
    const armed = !!input.selfDestruct && this.hasLaunched && this.stateMachine.getState() !== RocketState.CRASHED;
    this.selfDestructHeldS = armed ? this.selfDestructHeldS + deltaTime : 0;
    if (this.selfDestructHeldS >= ROCKET_CONFIG.SELF_DESTRUCT_HOLD_S) {
      this.selfDestructHeldS = 0;
      this.explode('selfDestruct');
    }
  }

  /** How far the self-destruct hold has got, 0-1 (0 when not held) */
  public getSelfDestructProgress(): number {
    return Math.min(1, this.selfDestructHeldS / ROCKET_CONFIG.SELF_DESTRUCT_HOLD_S);
  }

  /** Why it crashed: a hard landing, burning up on re-entry, or self-destruct */
  public getCrashReason(): CrashReason {
    return this.crashReason;
  }

  /** A new flight: its charge (clamped to the capacity), cool, chute closed */
  private resetFlightState(chargeWh: number): void {
    this.chargeWh = Math.max(0, Math.min(this.batteryCapacityWh, chargeWh));
    this.lowPowerWarned = this.getChargeSecondsLeft() <= ROCKET_CONFIG.POWER.LOW_WARN_S;
    this.flatWarned = this.chargeWh <= 0;
    this.heat = 0;
    this.leftAtmosphere = false;
    this.reentering = false;
    this.closeChute();
  }

  /** Draw the command module's power while flying; warn when low, and when flat */
  private updatePower(deltaTime: number): void {
    if (this.chargeWh <= 0) return;
    this.chargeWh = drainCharge(this.chargeWh, this.powerDrawW, deltaTime);
    const left = this.getChargeSecondsLeft();
    if (!this.lowPowerWarned && left <= ROCKET_CONFIG.POWER.LOW_WARN_S) {
      this.lowPowerWarned = true;
      showToast(`Battery low - ${Math.ceil(left / 60)} min left`, { duration: 4000 });
    }
    if (this.chargeWh <= 0) {
      this.isThrustActive = false;
      // once until it is charged back past the low mark (solar arrays
      // slower than the draw would flicker it on and off)
      if (!this.flatWarned) {
        this.flatWarned = true;
        showToast('Battery flat', { duration: 4000 });
        console.log('Rocket battery flat');
      }
    }
  }

  /**
   * Solar arrays charge the battery whenever the rocket is in sunlight - in
   * flight or landed (design 6): the line to the sun must miss every body.
   */
  private updateSolar(deltaTime: number): void {
    // An RTG charges sun or not (space-exploration upgrade)
    if (this.rtgW > 0) this.chargeWh = addCharge(this.chargeWh, this.batteryCapacityWh, (this.rtgW * deltaTime) / 3600);
    if (this.solarW <= 0) return;
    this.sunlit = inSunlight(this.position, this.sunPosition, this.planets);
    this.chargeWh = solarCharge(this.chargeWh, this.batteryCapacityWh, this.solarW, this.sunlit, deltaTime);
    if (this.getChargeSecondsLeft() > ROCKET_CONFIG.POWER.LOW_WARN_S) { this.flatWarned = false; this.lowPowerWarned = false; }
  }

  /** The live sun position (the flight manager's, updated as the orbits move) */
  public setSunPosition(sun: { x: number; y: number; z: number }): void {
    this.sunPosition = sun;
  }

  /** Is the stack charging from the sun right now (it has arrays and is sunlit)? */
  public isSolarCharging(): boolean {
    return this.solarW > 0 && this.sunlit && this.chargeWh < this.batteryCapacityWh;
  }

  /** Is the rocket inside any body's air (REENTRY.shellRadiusMult)? */
  private computeInAtmosphere(): boolean {
    let density = 0;
    for (const planet of this.planets) {
      if (inAtmosphereShell(this.position.distanceTo(planet.center), planet.radius, !!planet.hasAtmosphere)) {
        density = Math.max(density, planet.atmosphereDensity ?? 1);
      }
    }
    this.atmosphereDensity = density;
    return density > 0;
  }

  /** The air's density where the rocket is (0 in vacuum) */
  public getAtmosphereDensity(): number {
    return this.atmosphereDensity;
  }

  /** The speed a parachute would land at here (its HUD line; Infinity in vacuum) */
  public getChuteLandingSpeed(): number {
    return this.atmosphereDensity > 0 ? chuteLandingSpeed(this.atmosphereDensity, this.chuteBrake) : Infinity;
  }

  /** Heat shields fitted, and how worn the one in use is (0-1) */
  public getHeatShield(): { fitted: number; wear: number } {
    const cap = shieldCapacity(this.equipment);
    return { fitted: shieldsFitted(this.equipment), wear: cap > 0 ? this.shieldWear / cap : 0 };
  }

  /** Re-entry heat, its damage and burn-up, and the glow */
  private updateReentry(deltaTime: number, flying: boolean): void {
    const cfg = ROCKET_CONFIG.REENTRY;
    const speed = flying ? this.velocity.length() : 0;
    // The Sun up close heats too (a close pass); a fitted heat shield takes its share
    const sunR = SUN_RADIUS;
    const sunDist = this.position.distanceTo(new THREE.Vector3(this.sunPosition.x, this.sunPosition.y, this.sunPosition.z));
    const solar = flying ? solarHeat(sunDist, sunR, deltaTime) : 0;
    const shields = shieldsFitted(this.equipment);
    const step = reentryStep({ heat: this.heat, leftAtmosphere: this.leftAtmosphere }, this.inAtmosphere, speed, deltaTime, {
      density: this.atmosphereDensity || 1,
      extraGain: solar,
      shieldShare: shields > 0 ? cfg.shieldShare : 0,
      cooling: this.cooling,
    });
    this.heat = step.heat;
    if (step.absorbed > 0) this.wearShield(step.absorbed);
    if (flying) this.updateSunPass(sunDist, sunR);
    if (flying) {
      this.leftAtmosphere = step.leftAtmosphere;
      this.reentering = step.reentering;
    }
    const damage = heatDamage(this.heat, deltaTime);
    if (damage > 0) this.health = Math.max(0, this.health - damage);

    if (this.heat > 0 && !this.heatGlow) {
      this.heatGlow = createHeatGlow(this.stackHeight(), this.stackCenterOffset);
      this.pivot.add(this.heatGlow);
    }
    if (this.heatGlow) setHeatGlow(this.heatGlow, this.heat / cfg.maxHeat);

    if (flying && (this.heat >= cfg.maxHeat || this.health <= ROCKET_CONFIG.HEALTH.explosionThreshold)) {
      console.log('Rocket burned up on re-entry');
      showToast('Burned up on re-entry', { duration: 4000 });
      this.explode('burnedUp');
    }
  }

  /** The stack's height in pivot units (each height unit is 2) */
  private stackHeight(): number {
    let heightUnits = 0;
    for (const part of this.parts) heightUnits += part.getHeightUnits();
    return heightUnits * 2;
  }

  /** The parachute: by key, or by itself when falling low inside the air */
  private updateParachute(input: RocketInputState, flying: boolean): void {
    this.inAtmosphere = this.computeInAtmosphere();
    if (!flying || this.chuteOpen) {
      if (input.parachute && !flying) showToast('The chute opens in flight', { duration: 2000 });
      return;
    }
    const ready = this.chutesFitted() > 0;
    // By itself it waits for a speed it survives (it would tear chute after
    // chute otherwise); only the key can tear one
    const auto = ready && this.inAtmosphere && this.getVerticalVelocity() < 0
      && this.getAltitude() < ROCKET_CONFIG.PARACHUTE.deployAltitude
      && this.velocity.length() <= ROCKET_CONFIG.PARACHUTE.maxOpenSpeed;
    if (!input.parachute && !auto) return;
    if (!ready) {
      if (input.parachute) showToast('No parachute fitted', { duration: 2500 });
      return;
    }
    const result = openChuteFrom(this.equipment, this.inAtmosphere, this.velocity.length());
    // Opening or tearing used one up: re-weigh, and save the slot now
    if (result === 'open' || result === 'torn') {
      this.refreshCargoMass();
      this.onChanged?.();
    }
    if (result === 'open') {
      this.chuteOpen = true;
      const top = new THREE.Vector3(
        PlayerConfig.ROCKET_STACK_OFFSET_X,
        PlayerConfig.ROCKET_STACK_OFFSET_Y + this.stackHeight(),
        PlayerConfig.ROCKET_STACK_OFFSET_Z,
      );
      this.canopy = createCanopy(top);
      this.pivot.add(this.canopy);
      showToast('Chute open', { duration: 2000 });
    } else if (result === 'torn') {
      showToast('Chute torn - too fast', { duration: 3000 });
    } else {
      showToast('No air for the chute', { duration: 2500 });
    }
  }

  /** Stow the chute and take its canopy away */
  private closeChute(): void {
    this.chuteOpen = false;
    if (this.canopy) {
      disposeObject(this.canopy);
      this.canopy = null;
    }
  }

  /** Draw the RCS jets of this frame's commanded turn (made the first time one fires) */
  private updateRcsLines(): void {
    if (!this.rcsLines) {
      if (this.rcsCommand.lengthSq() === 0) return;
      this.rcsLines = createRcsLines();
      this.pivot.add(this.rcsLines);
    }
    setRcsLines(this.rcsLines, rcsJets(this.rcsCommand, this.stackHeight(), this.stackCenterOffset));
  }

  /** The heat shield soaks `absorbed`: each time one's capacity is used up it is worn through and leaves the equipment */
  private wearShield(absorbed: number): void {
    const cap = shieldCapacity(this.equipment);
    if (cap <= 0) return;
    this.shieldWear += absorbed;
    while (this.shieldWear >= cap && useShield(this.equipment)) {
      this.shieldWear -= cap;
      showToast('Heat shield worn through', { duration: 2500 });
      this.refreshCargoMass();
      this.onChanged?.();
    }
    if (shieldsFitted(this.equipment) === 0) this.shieldWear = 0;
  }

  /** The Sun: touching it burns the rocket up; leaving its close-pass distance alive is a close pass */
  private updateSunPass(sunDist: number, sunR: number): void {
    if (this.stateMachine.getState() === RocketState.CRASHED) return;
    if (sunDist < sunR) { this.explode('burnedUp'); return; }
    const inside = sunDist < sunR * ROCKET_CONFIG.SUN_PASS.closePassRadii;
    if (inside) this.inSunPass = true;
    else if (this.inSunPass) {
      this.inSunPass = false;
      emitGameEvent('closePass', 'sun');
      // The pass records the Sun's field: data into the hold (what fits)
      const want = ROCKET_CONFIG.SUN_PASS.coronalData;
      const left = this.cargo ? slotStore(this.cargo).addItem(ItemType.CORONAL_DATA, want) : want;
      if (left < want) { this.refreshCargoMass(); this.onChanged?.(); }
      showToast(left < want ? `Close pass of the Sun - ${want - left} coronal field data recorded`
        : 'Close pass of the Sun - no room in the cargo hold for the field data', { duration: 3000 });
    }
  }

  /** Remove the re-entry visuals and the RCS lines (landing, despawn) */
  private disposeReentryVisuals(): void {
    if (this.rcsLines) {
      disposeObject(this.rcsLines);
      this.rcsLines = null;
    }
    this.closeChute();
    if (this.heatGlow) {
      disposeObject(this.heatGlow);
      this.heatGlow = null;
    }
  }

  public getHealthPercent(): number {
    return (this.health / ROCKET_CONFIG.HEALTH.maxHealth) * 100;
  }

  public getState(): RocketState {
    return this.stateMachine.getState();
  }

  /**
   * Check if the rocket has ever launched (left its initial position)
   * Used to determine if rocket should persist when player exits
   */
  public getHasLaunched(): boolean {
    return this.hasLaunched;
  }

  public getStateMachine(): RocketStateMachine {
    return this.stateMachine;
  }

  public getCamera(): RocketCamera | null {
    return this.rocketCamera;
  }

  public getPivot(): THREE.Group {
    return this.pivot;
  }

  public getParts(): RocketPart[] {
    return this.parts;
  }

  public isInGravity(): boolean {
    return this.isInGravityWell;
  }

  /**
   * Get landing alignment (how well rocket is oriented for landing)
   * Returns dot product: 1 = perfect (engine down), 0 = sideways, -1 = upside down
   */
  public getLandingAlignment(): number {
    const rocketUp = this.getLocalUp();
    let surfaceNormal = new THREE.Vector3(0, 1, 0);
    if (this.closestPlanet) {
      surfaceNormal = this.position.clone().sub(this.closestPlanet.center).normalize();
    }
    return rocketUp.dot(surfaceNormal);
  }

  /**
   * Check if current state would result in safe landing
   * Returns: { velocitySafe: boolean, orientationSafe: boolean, impactVelocity: number, alignment: number }
   */
  public getLandingSafetyInfo(): { velocitySafe: boolean; orientationSafe: boolean; impactVelocity: number; alignment: number } {
    const impactVelocity = Math.abs(this.getVerticalVelocity());
    const alignment = this.getLandingAlignment();

    return {
      velocitySafe: impactVelocity < ROCKET_CONFIG.HEALTH.impactDamageThreshold,
      orientationSafe: alignment > 0.7,
      impactVelocity,
      alignment,
    };
  }

  /**
   * Handle camera mouse input
   */
  public handleCameraMouseMove(deltaX: number, deltaY: number): void {
    if (this.rocketCamera) {
      this.rocketCamera.handleMouseMove(deltaX, deltaY);
    }
  }

  /**
   * Handle camera scroll input
   */
  public handleCameraScroll(delta: number): void {
    if (this.rocketCamera) {
      this.rocketCamera.handleScroll(delta);
    }
  }

  /**
   * Clean up resources
   */
  public dispose(): void {
    // Stop engine sound
    AudioManager.stopLoop('rocket_engine');
    for (const d of this.debris) disposeObject(d.group);
    this.debris = [];
    this.disposeReentryVisuals();

    // Remove pivot from scene
    if (this.pivot.parent) {
      this.pivot.parent.remove(this.pivot);
    }

    // Dispose parts
    for (const part of this.parts) {
      part.dispose();
    }
    this.parts = [];

    // Dispose exhaust
    this.rocketExhaust.dispose();

    // Dispose side thrusters
    if (this.sideThrusterMesh) {
      this.scene.remove(this.sideThrusterMesh);
      this.sideThrusterMesh = null;
    }
    if (this.sideThrusterGeometry) {
      this.sideThrusterGeometry.dispose();
      this.sideThrusterGeometry = null;
    }
    this.sideThrusterVelocities = [];
    this.sideThrusterLives = [];

    this.rocketCamera = null;
  }

  /**
   * Hand the parts back to the launch pad they were boarded from (an exit
   * before launch): each keeps its world pose under the pad's mesh, and the
   * controller lets go of them, so a dispose() after this can't remove or
   * dispose the rocket still standing on the pad.
   */
  public returnPartsTo(padMesh: THREE.Object3D): void {
    this.pivot.updateMatrixWorld(true);
    padMesh.updateMatrixWorld(true);
    for (const part of this.parts) padMesh.attach(part.mesh);
    this.parts = [];
  }

  /**
   * Clean up non-visual resources only (for when rocket becomes a landed rocket)
   * Keeps the pivot and parts intact but cleans up particle systems, camera, etc.
   */
  public disposeNonVisual(): void {
    // Stop engine sound
    AudioManager.stopLoop('rocket_engine');
    // The glow and canopy are not part of the rocket left standing
    this.disposeReentryVisuals();

    // Dispose exhaust
    this.rocketExhaust.dispose();

    // Dispose side thrusters
    if (this.sideThrusterMesh) {
      this.scene.remove(this.sideThrusterMesh);
      this.sideThrusterMesh = null;
    }
    if (this.sideThrusterGeometry) {
      this.sideThrusterGeometry.dispose();
      this.sideThrusterGeometry = null;
    }
    this.sideThrusterVelocities = [];
    this.sideThrusterLives = [];

    this.rocketCamera = null;

    // Don't dispose parts or remove pivot - they stay in the world
  }

  /**
   * Initialize the rocket from a landed state (re-boarding a landed rocket)
   */
  public initializeFromLanded(
    pivot: THREE.Group,
    parts: RocketPart[],
    position: THREE.Vector3,
    orientation: THREE.Quaternion,
    groundNormal: THREE.Vector3,
    fuelPercent: number,
    planets: PlanetGravitySource[],
    cargo: InventorySlot[] | null = null,
    engineMode: EngineMode = null,
    chargeWh: number | null = null,
    equipment: InventorySlot[] | null = null
  ): void {
    this.engineMode = engineMode;
    // Reuse the existing pivot and parts
    this.pivot = pivot;
    this.parts = parts;
    this.planets = planets;
    this.cargo = cargo;
    this.equipment = equipment;

    // Calculate rocket stack center
    this.calculateStackCenter();

    // Set position and orientation
    this.position.copy(position);
    this.groundPosition.copy(position);
    this.groundNormal.copy(groundNormal);
    this.orientation.copy(orientation);

    // Reset physics
    this.velocity.set(0, 0, 0);
    this.angularVelocity.set(0, 0, 0);

    // Calculate mass and propulsion properties
    this.calculateMassProperties();

    // Set fuel level from saved state (filled into the stages bottom first)
    this.setFuelTotal((fuelPercent / 100) * this.allFuelCapacity());
    // Its battery as it was left (null = full: older records)
    this.resetFlightState(chargeWh ?? this.batteryCapacityWh);

    // Find closest planet for initial gravity calculation
    this.updateClosestPlanet();

    // Re-initialize exhaust particle system
    this.initializeExhaust();

    // Mark as launched since this rocket was previously flying and landed
    this.hasLaunched = true;

    console.log(`Rocket re-initialized from landed state: ${this.parts.length} parts, ${fuelPercent.toFixed(1)}% fuel`);
  }

  /**
   * Board a landed rocket (player re-enters)
   */
  public boardLanded(camera: THREE.PerspectiveCamera): boolean {
    // Landed rockets start in LANDED state, which can transition to BOARDED_GROUNDED via exit
    // But for re-boarding, we need to go from DOCKED -> LANDED equivalent
    // Actually, we need to force the state to LANDED since that's where we are

    // Resume as it was left: LANDED on a surface, or IN_FLIGHT (at rest)
    // when it was parked in space, out of every gravity well
    this.updateClosestPlanet();
    this.stateMachine.forceState(this.isInGravityWell ? RocketState.LANDED : RocketState.IN_FLIGHT);

    // Store boarded position for respawn
    this.lastBoardedPosition.copy(this.position);
    this.lastBoardedOrientation.copy(this.orientation);

    // Create camera controller
    this.rocketCamera = new RocketCamera(camera);
    // Use stack center instead of pivot position for camera focus
    const stackCenter = this.getStackCenter();
    this.rocketCamera.setRocketTransform(stackCenter, this.orientation);
    this.rocketCamera.reset();
    this.rocketCamera.snap();

    console.log('Boarded landed rocket');
    return true;
  }
}
