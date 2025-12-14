import * as THREE from 'three';
import { ROCKET_CONFIG, GRAVITY_WELL } from '../config/RocketConfig';
import { RocketState, RocketStateMachine, STATE_INFO } from './RocketState';
import { RocketCamera } from './RocketCamera';
import { RocketExhaust } from './RocketExhaust';
import { RocketPart } from '../planet/RocketPart';
import { ITEM_DATA, RocketPartType } from '../player/Inventory';
import { PlayerConfig } from '../config/PlayerConfig';
import { AudioManager } from '../engine/AudioManager';

/**
 * Planet data needed for gravity calculations
 */
export interface PlanetGravitySource {
  center: THREE.Vector3;
  radius: number;
  gravityStrength: number;  // Multiplier (1.0 = Earth-like)
  name: string;
  getSurfaceHeight?: (direction: THREE.Vector3) => number;  // Optional callback for actual terrain height
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
  private currentFuel: number = 0;
  private totalFuelCapacity: number = 0;

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
  private exhaustVelocity: number = 0;  // For delta-V calculation

  // Ground reference (for grounded states)
  private groundPosition: THREE.Vector3 = new THREE.Vector3();
  private groundNormal: THREE.Vector3 = new THREE.Vector3(0, 1, 0);

  // Stack center offset (local space, for camera targeting)
  private stackCenterOffset: THREE.Vector3 = new THREE.Vector3();

  // Input tracking
  private lastThrustToggle: boolean = false;

  // Respawn tracking
  private lastBoardedPosition: THREE.Vector3 = new THREE.Vector3();
  private lastBoardedOrientation: THREE.Quaternion = new THREE.Quaternion();

  // Crash state
  private crashTime: number = 0;
  private explosionParticles: THREE.Points | null = null;

  // Track if rocket has ever launched (left initial position)
  // Used to determine if rocket should persist when exiting
  private hasLaunched: boolean = false;

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
    planets: PlanetGravitySource[]
  ): void {
    this.parts = [...parts];
    this.planets = planets;

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

    for (const part of this.parts) {
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
   * Calculate mass and propulsion properties from parts
   */
  private calculateMassProperties(): void {
    this.totalWetMass = 0;
    this.totalDryMass = 0;
    this.totalFuelCapacity = 0;
    this.totalThrust = 0;
    this.totalFuelConsumption = 0;
    this.exhaustVelocity = 0;

    for (const part of this.parts) {
      const itemData = ITEM_DATA[part.itemType];
      const partData = itemData.rocketPart;
      if (!partData) continue;

      switch (partData.partType) {
        case RocketPartType.ENGINE:
          this.totalThrust += ROCKET_CONFIG.MEDIUM_ENGINE.thrust;
          this.totalFuelConsumption += ROCKET_CONFIG.MEDIUM_ENGINE.fuelConsumption;
          this.totalDryMass += ROCKET_CONFIG.MEDIUM_ENGINE.mass;
          this.totalWetMass += ROCKET_CONFIG.MEDIUM_ENGINE.mass;
          // Use highest Isp for delta-V calculation
          this.exhaustVelocity = Math.max(
            this.exhaustVelocity,
            ROCKET_CONFIG.MEDIUM_ENGINE.specificImpulse * ROCKET_CONFIG.PHYSICS.gravityConstant
          );
          break;

        case RocketPartType.FUEL_TANK:
          this.totalFuelCapacity += ROCKET_CONFIG.MEDIUM_FUEL_TANK.fuelCapacity;
          this.totalDryMass += ROCKET_CONFIG.MEDIUM_FUEL_TANK.dryMass;
          this.totalWetMass += ROCKET_CONFIG.MEDIUM_FUEL_TANK.wetMass;
          break;

        case RocketPartType.CAPSULE:
          this.totalDryMass += ROCKET_CONFIG.COMMAND_MODULE.mass;
          this.totalWetMass += ROCKET_CONFIG.COMMAND_MODULE.mass;
          break;
      }
    }

    // Start with full fuel
    this.currentFuel = this.totalFuelCapacity;
  }

  /**
   * Get current mass based on fuel level
   */
  public getCurrentMass(): number {
    if (this.totalFuelCapacity === 0) return this.totalDryMass;
    const fuelFraction = this.currentFuel / this.totalFuelCapacity;
    return this.totalDryMass + fuelFraction * (this.totalWetMass - this.totalDryMass);
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

    return (this.totalThrust * this.throttle) / weight;
  }

  /**
   * Calculate remaining delta-V (Tsiolkovsky rocket equation)
   */
  public getRemainingDeltaV(): number {
    if (this.exhaustVelocity === 0) return 0;

    const currentMass = this.getCurrentMass();
    if (currentMass <= this.totalDryMass) return 0;

    return this.exhaustVelocity * Math.log(currentMass / this.totalDryMass);
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
      const normalizedDist = closestDist / closest.radius;

      if (normalizedDist <= GRAVITY_WELL.FULL_RADIUS_MULT) {
        this.isInGravityWell = true;
        this.gravityMultiplier = 1.0;
      } else if (normalizedDist >= GRAVITY_WELL.FALLOFF_RADIUS_MULT) {
        this.isInGravityWell = false;
        this.gravityMultiplier = 0.0;
      } else {
        // Transition zone
        const t = (normalizedDist - GRAVITY_WELL.FULL_RADIUS_MULT) /
                  (GRAVITY_WELL.FALLOFF_RADIUS_MULT - GRAVITY_WELL.FULL_RADIUS_MULT);
        this.gravityMultiplier = 1.0 - t;
        this.isInGravityWell = this.gravityMultiplier > 0.1;  // Small threshold
      }
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
    this.rocketCamera.setRocketTransform(stackCenter, this.groundNormal);
    this.rocketCamera.reset();
    this.rocketCamera.snap();

    // Transition to boarded state
    return this.stateMachine.transitionTo(RocketState.BOARDED_GROUNDED);
  }

  /**
   * Exit the rocket (player leaves)
   */
  public exit(): boolean {
    const stateInfo = this.stateMachine.getStateInfo();
    if (!stateInfo.canExit) {
      return false;
    }

    this.rocketCamera = null;

    // Transition based on current state
    const state = this.stateMachine.getState();
    if (state === RocketState.BOARDED_GROUNDED) {
      return this.stateMachine.transitionTo(RocketState.DOCKED);
    } else if (state === RocketState.LANDED) {
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

    // Run physics if active
    if (stateInfo.physicsActive) {
      this.updatePhysics(deltaTime);
    }

    // Update visual transform
    this.pivot.position.copy(this.position);
    this.pivot.quaternion.copy(this.orientation);

    // Update camera
    if (this.rocketCamera) {
      const upVector = this.getLocalUp();
      const stackCenter = this.getStackCenter();
      this.rocketCamera.setRocketTransform(stackCenter, upVector);
      this.rocketCamera.update(deltaTime);
    }

    // Update exhaust particles
    const exhaustActive = this.isThrustActive && this.throttle > 0 && this.currentFuel > 0;
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

    // Rotation control (WASD + Q/E always controls rotation)
    if (stateInfo.canSteer) {
      const cfg = ROCKET_CONFIG.CONTROLS;

      // Full 6DOF rotation with WASD + Q/E
      if (input.pitchDown) this.applyTorque(this.getLocalRight(), -cfg.pitchSpeed * deltaTime);
      if (input.pitchUp) this.applyTorque(this.getLocalRight(), cfg.pitchSpeed * deltaTime);
      if (input.yawLeft) this.applyTorque(this.getLocalUp(), cfg.yawSpeed * deltaTime);
      if (input.yawRight) this.applyTorque(this.getLocalUp(), -cfg.yawSpeed * deltaTime);
      if (input.rollLeft) this.applyTorque(this.getLocalForward(), -cfg.rollSpeed * deltaTime);
      if (input.rollRight) this.applyTorque(this.getLocalForward(), cfg.rollSpeed * deltaTime);

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

    // Fuel request
    if (input.fuel && stateInfo.canFuel) {
      this.refuel();
    }
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
    if (this.isThrustActive && this.currentFuel > 0 && this.throttle > 0) {
      const thrustMagnitude = this.totalThrust * this.throttle;
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
    this.angularVelocity.multiplyScalar(ROCKET_CONFIG.PHYSICS.angularDamping);

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
    this.velocity.multiplyScalar(ROCKET_CONFIG.PHYSICS.linearDamping);

    // === POSITION UPDATE ===
    this.position.addScaledVector(this.velocity, deltaTime);

    // === GROUND COLLISION ===
    // Prevent rocket from clipping through the planet surface
    if (this.closestPlanet) {
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
        if (this.isThrustActive && this.throttle > 0) {
          const twr = this.getThrustToWeightRatio();
          if (twr > 1.0) {
            this.stateMachine.transitionTo(RocketState.LAUNCHING);
            this.hasLaunched = true;
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
        if (vertVel < 0 && alt < 100 && this.isInGravityWell) {
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
        if (this.isThrustActive && this.throttle > 0) {
          const twr = this.getThrustToWeightRatio();
          if (twr > 1.0) {
            this.stateMachine.transitionTo(RocketState.LAUNCHING);
            this.hasLaunched = true;
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
    } else {
      // Too fast - crash!
      console.log(`Crash! Impact too fast: ${impactVelocity.toFixed(1)} m/s`);
      this.explode();
    }
  }

  /**
   * Explode the rocket
   */
  private explode(): void {
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
   * Refuel the rocket (instant for now)
   */
  public refuel(): void {
    this.currentFuel = this.totalFuelCapacity;
    console.log('Rocket refueled to 100%');
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

  public getVelocity(): THREE.Vector3 {
    return this.velocity.clone();
  }

  public getOrientation(): THREE.Quaternion {
    return this.orientation.clone();
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
    if (this.totalFuelCapacity === 0) return 0;
    return (this.currentFuel / this.totalFuelCapacity) * 100;
  }

  public getHealth(): number {
    return this.health;
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
   * Clean up non-visual resources only (for when rocket becomes a landed rocket)
   * Keeps the pivot and parts intact but cleans up particle systems, camera, etc.
   */
  public disposeNonVisual(): void {
    // Stop engine sound
    AudioManager.stopLoop('rocket_engine');

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
    planets: PlanetGravitySource[]
  ): void {
    // Reuse the existing pivot and parts
    this.pivot = pivot;
    this.parts = parts;
    this.planets = planets;

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

    // Set fuel level from saved state
    this.currentFuel = (fuelPercent / 100) * this.totalFuelCapacity;

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

    // Force state to LANDED (we're resuming from a landed position)
    this.stateMachine.forceState(RocketState.LANDED);

    // Store boarded position for respawn
    this.lastBoardedPosition.copy(this.position);
    this.lastBoardedOrientation.copy(this.orientation);

    // Create camera controller
    this.rocketCamera = new RocketCamera(camera);
    // Use stack center instead of pivot position for camera focus
    const stackCenter = this.getStackCenter();
    this.rocketCamera.setRocketTransform(stackCenter, this.groundNormal);
    this.rocketCamera.reset();
    this.rocketCamera.snap();

    console.log('Boarded landed rocket');
    return true;
  }
}
