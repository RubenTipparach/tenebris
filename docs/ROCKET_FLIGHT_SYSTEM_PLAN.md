# Rocket Flight System - Implementation Plan

## Overview

This document outlines the implementation plan for the rocket boarding, flight, and landing system in Tenebris. The system will allow players to board rockets, fly through space between planets, and land on any surface.

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Rocket Configuration & Physics](#2-rocket-configuration--physics)
3. [Camera System](#3-camera-system)
4. [Flight Controls](#4-flight-controls)
5. [UI Systems](#5-ui-systems)
6. [Rocket States & Transitions](#6-rocket-states--transitions)
7. [Landing & Collision](#7-landing--collision)
8. [Ejection & Parachute System](#8-ejection--parachute-system)
9. [Home Planet Return](#9-home-planet-return)
10. [File Structure](#10-file-structure)
11. [Implementation Phases](#11-implementation-phases)
12. [Data Structures](#12-data-structures)

---

## 1. System Architecture

### New Files to Create

```
src/
├── rocket/
│   ├── RocketController.ts      # Main rocket flight controller
│   ├── RocketPhysics.ts         # Physics simulation
│   ├── RocketCamera.ts          # Orbit camera system
│   ├── RocketConfig.ts          # All rocket parameters
│   ├── RocketState.ts           # State machine for rocket modes
│   ├── Parachute.ts             # Parachute geometry & physics
│   └── RocketUI.ts              # Flight HUD overlay
├── player/
│   └── RocketFlightUI.ts        # In-flight HUD (extends BaseModalMenu or standalone)
```

### Modified Files

```
src/planet/LaunchPad.ts          # Add boarding logic, rocket detachment
src/planet/RocketPart.ts         # Add fuel/mass properties
src/player/PlanetPlayer.ts       # Add rocket boarding/exit transitions
src/player/Inventory.ts          # Add parachute item, home teleport
src/config/PlayerConfig.ts       # Add rocket flight constants
src/mainPlanet.ts                # Integrate rocket flight system
```

---

## 2. Rocket Configuration & Physics

### RocketConfig.ts - Core Parameters

```typescript
export const ROCKET_CONFIG = {
  // === FUEL SYSTEM ===
  MEDIUM_FUEL_TANK: {
    fuelCapacity: 1000,           // Units of fuel
    wetMass: 500,                 // kg when full
    dryMass: 50,                  // kg when empty
  },

  // === ENGINE SYSTEM ===
  MEDIUM_ENGINE: {
    thrust: 15000,                // Newtons
    fuelConsumption: 10,          // Units per second at 100% throttle
    specificImpulse: 300,         // Isp in seconds (efficiency)
  },

  // === COMMAND MODULE ===
  COMMAND_MODULE: {
    mass: 200,                    // kg (always dry)
    hasParachute: true,
    parachuteDeployAltitude: 500, // meters above surface
    maxSurvivableImpact: 10,      // m/s
  },

  // === PHYSICS ===
  PHYSICS: {
    dragCoefficient: 0.5,         // Atmospheric drag
    angularDamping: 0.95,         // Rotation slowdown
    linearDamping: 0.99,          // Linear slowdown in space (very slight)
  },

  // === HEALTH SYSTEM ===
  HEALTH: {
    maxHealth: 100,
    impactDamageThreshold: 5,     // m/s - below this, no damage
    impactDamageMultiplier: 10,   // damage = (velocity - threshold) * multiplier
    explosionThreshold: 0,        // Health at which rocket explodes
  },

  // === CONTROLS ===
  CONTROLS: {
    pitchSpeed: 1.0,              // rad/s
    yawSpeed: 1.0,                // rad/s
    rollSpeed: 1.5,               // rad/s
    strafeForce: 5000,            // N (only in gravity well)
    throttleStep: 0.1,            // Per shift/ctrl press
  },
};
```

### Physics Calculations

```typescript
// === MASS CALCULATIONS ===
totalWetMass = commandModule.mass
             + sum(fuelTanks.wetMass)
             + engine.mass;

totalDryMass = commandModule.mass
             + sum(fuelTanks.dryMass)
             + engine.mass;

currentMass = totalDryMass + (currentFuel / totalFuelCapacity) * (totalWetMass - totalDryMass);

// === THRUST-TO-WEIGHT RATIO (TWR) ===
// On a planet with gravity g:
weight = currentMass * gravityAcceleration;
twr = (engine.thrust * throttle) / weight;
// TWR > 1.0 means rocket can lift off

// === DELTA-V (Tsiolkovsky rocket equation) ===
// How much velocity change the rocket can achieve
exhaustVelocity = engine.specificImpulse * 9.81;  // m/s
deltaV = exhaustVelocity * ln(totalWetMass / totalDryMass);

// === BURN TIME ===
// Time until fuel runs out at current throttle
fuelConsumptionRate = engine.fuelConsumption * throttle;
burnTimeRemaining = currentFuel / fuelConsumptionRate;

// === GRAVITY INFLUENCE ===
// Distance-based gravity from each planet
for each planet:
  direction = (planet.center - rocket.position).normalize();
  distance = rocket.position.distanceTo(planet.center);

  if (distance < planet.gravityFalloffRadius):
    if (distance <= planet.gravityFullRadius):
      gravityMult = 1.0;
    else:
      falloff = (distance - gravityFullRadius) / (falloffRadius - fullRadius);
      gravityMult = 1.0 - falloff;

    gravityAccel = planet.gravityStrength * gravityMult * BASE_GRAVITY;
    totalGravity += direction * gravityAccel;
```

---

## 3. Camera System

### RocketCamera.ts - Orbit Camera

The camera orbits around the rocket's center pivot point.

```typescript
export class RocketCamera {
  // Camera parameters
  private distance: number = 20;          // Distance from rocket center
  private minDistance: number = 10;
  private maxDistance: number = 100;

  private azimuth: number = 0;            // Horizontal angle (radians)
  private elevation: number = 0.3;        // Vertical angle (radians)
  private minElevation: number = -Math.PI / 2 + 0.1;
  private maxElevation: number = Math.PI / 2 - 0.1;

  private target: THREE.Vector3;          // Rocket center (updated each frame)
  private camera: THREE.PerspectiveCamera;

  // Smoothing
  private currentDistance: number;
  private currentAzimuth: number;
  private currentElevation: number;
  private smoothSpeed: number = 5.0;

  update(deltaTime: number, rocketCenter: THREE.Vector3, input: InputState) {
    // Mouse look rotates camera around rocket
    this.azimuth -= input.mouseX * MOUSE_SENSITIVITY;
    this.elevation += input.mouseY * MOUSE_SENSITIVITY;
    this.elevation = clamp(this.elevation, this.minElevation, this.maxElevation);

    // Scroll wheel zooms
    this.distance *= (1 - input.scrollDelta * 0.1);
    this.distance = clamp(this.distance, this.minDistance, this.maxDistance);

    // Smooth interpolation
    this.currentDistance = lerp(this.currentDistance, this.distance, this.smoothSpeed * deltaTime);
    this.currentAzimuth = lerpAngle(this.currentAzimuth, this.azimuth, this.smoothSpeed * deltaTime);
    this.currentElevation = lerp(this.currentElevation, this.elevation, this.smoothSpeed * deltaTime);

    // Calculate camera position
    const x = Math.cos(this.currentElevation) * Math.sin(this.currentAzimuth) * this.currentDistance;
    const y = Math.sin(this.currentElevation) * this.currentDistance;
    const z = Math.cos(this.currentElevation) * Math.cos(this.currentAzimuth) * this.currentDistance;

    this.camera.position.set(
      rocketCenter.x + x,
      rocketCenter.y + y,
      rocketCenter.z + z
    );
    this.camera.lookAt(rocketCenter);
  }
}
```

### Rocket Pivot System

When boarding, all rocket parts are reparented under a central pivot:

```typescript
// Create pivot at rocket stack center
const rocketPivot = new THREE.Group();
const stackCenter = calculateStackCenter(rocketParts);
rocketPivot.position.copy(stackCenter);

// Reparent all parts (adjust local positions)
for (const part of rocketParts) {
  const worldPos = part.mesh.getWorldPosition(new THREE.Vector3());
  const worldQuat = part.mesh.getWorldQuaternion(new THREE.Quaternion());

  rocketPivot.add(part.mesh);

  // Convert to local space of pivot
  part.mesh.position.copy(worldPos.sub(stackCenter));
  part.mesh.quaternion.copy(worldQuat);
}

scene.add(rocketPivot);
```

---

## 4. Flight Controls

### Control Mapping

| Input | In Gravity Well | In Space |
|-------|-----------------|----------|
| W | Pitch down | Pitch down |
| S | Pitch up | Pitch up |
| A | Yaw left + Strafe left | Yaw left |
| D | Yaw right + Strafe right | Yaw right |
| Q | Roll left | Roll left |
| E | Roll right | Roll right |
| Shift | Throttle up (+10%) | Throttle up |
| Ctrl | Throttle down (-10%) | Throttle down |
| Space | Toggle thrust on/off | Toggle thrust on/off |
| F | Fuel rocket (when grounded) | - |
| X | Exit rocket | Exit rocket |
| Escape | Open menu | Open menu |

### Control Implementation

```typescript
// In gravity well: rocket always aims upward, WASD strafes
if (isInGravityWell) {
  // Lock rocket orientation to point away from planet
  const upVector = rocket.position.clone().sub(closestPlanet.center).normalize();
  rocket.alignToUp(upVector);

  // WASD applies lateral force
  if (input.left) rocket.applyForce(rocket.localRight.clone().multiplyScalar(-STRAFE_FORCE));
  if (input.right) rocket.applyForce(rocket.localRight.clone().multiplyScalar(STRAFE_FORCE));
  if (input.forward) rocket.applyForce(rocket.localForward.clone().multiplyScalar(STRAFE_FORCE));
  if (input.backward) rocket.applyForce(rocket.localForward.clone().multiplyScalar(-STRAFE_FORCE));

  // Q/E still allows roll for fine adjustment
  if (input.rollLeft) rocket.applyTorque(rocket.localUp, -ROLL_SPEED);
  if (input.rollRight) rocket.applyTorque(rocket.localUp, ROLL_SPEED);
}
// In space: full 6DOF control
else {
  if (input.forward) rocket.applyTorque(rocket.localRight, -PITCH_SPEED);  // Pitch down
  if (input.backward) rocket.applyTorque(rocket.localRight, PITCH_SPEED); // Pitch up
  if (input.left) rocket.applyTorque(rocket.localUp, YAW_SPEED);          // Yaw left
  if (input.right) rocket.applyTorque(rocket.localUp, -YAW_SPEED);        // Yaw right
  if (input.rollLeft) rocket.applyTorque(rocket.localForward, -ROLL_SPEED);
  if (input.rollRight) rocket.applyTorque(rocket.localForward, ROLL_SPEED);
}

// Thrust (always applies forward force when active)
if (isThrustActive && currentFuel > 0) {
  const thrustForce = engine.thrust * throttle;
  rocket.applyForce(rocket.localUp.clone().multiplyScalar(thrustForce));

  // Consume fuel
  currentFuel -= engine.fuelConsumption * throttle * deltaTime;
  currentFuel = Math.max(0, currentFuel);
}
```

---

## 5. UI Systems

### RocketFlightUI.ts - Flight HUD

```
+--------------------------------------------------+
|  ALTITUDE: 1,234 m        VELOCITY: 456 m/s      |
|  GRAVITY: Earth (0.8g)    VERTICAL: +123 m/s     |
+--------------------------------------------------+
|                                                  |
|                    [ROCKET VIEW]                 |
|                                                  |
+--------------------------------------------------+
| FUEL: [████████████░░░░░░░░] 65%                 |
| THROTTLE: [████████░░] 80%     TWR: 1.45         |
+--------------------------------------------------+
| BURN TIME: 2m 34s    DELTA-V: 2,456 m/s          |
+--------------------------------------------------+
|                                                  |
|  [FUEL]  [LAUNCH]  [EXIT]  [EJECT CAPSULE]      |
|                                                  |
| HEALTH: [████████████████░░░░] 85%               |
+--------------------------------------------------+
```

### UI Elements

```typescript
interface RocketHUDElements {
  // Top bar - Flight data
  altitude: HTMLElement;           // Distance from nearest surface
  velocity: HTMLElement;           // Total velocity magnitude
  verticalVelocity: HTMLElement;   // Velocity toward/away from planet
  gravitySource: HTMLElement;      // Which planet is pulling (and strength)

  // Center - Attitude indicator (optional, future)
  attitudeIndicator?: HTMLCanvasElement;

  // Bottom bar - Propulsion
  fuelBar: HTMLElement;            // Visual fuel gauge
  fuelPercent: HTMLElement;        // Numeric percentage
  throttleBar: HTMLElement;        // Current throttle level
  twrDisplay: HTMLElement;         // Thrust-to-weight ratio
  burnTime: HTMLElement;           // Seconds remaining at current throttle
  deltaV: HTMLElement;             // Remaining delta-V

  // Health bar
  healthBar: HTMLElement;
  healthPercent: HTMLElement;

  // Buttons
  fuelButton: HTMLButtonElement;   // Only visible when grounded
  launchButton: HTMLButtonElement; // Toggle thrust
  exitButton: HTMLButtonElement;   // Leave rocket
  ejectButton: HTMLButtonElement;  // Emergency capsule ejection
}
```

### UI Update Loop

```typescript
updateHUD(rocket: RocketController, deltaTime: number) {
  // Altitude (distance from nearest surface)
  const altitude = rocket.getAltitudeAboveSurface();
  this.altitude.textContent = `ALTITUDE: ${formatDistance(altitude)}`;

  // Velocity
  const velocity = rocket.velocity.length();
  const verticalVel = rocket.getVerticalVelocity();
  this.velocity.textContent = `VELOCITY: ${velocity.toFixed(1)} m/s`;
  this.verticalVelocity.textContent = `VERTICAL: ${verticalVel >= 0 ? '+' : ''}${verticalVel.toFixed(1)} m/s`;

  // Gravity
  const gravity = rocket.getCurrentGravity();
  const gForce = gravity.magnitude / 9.81;
  this.gravitySource.textContent = `GRAVITY: ${gravity.sourceName} (${gForce.toFixed(2)}g)`;

  // Fuel
  const fuelPercent = (rocket.currentFuel / rocket.totalFuelCapacity) * 100;
  this.fuelBar.style.width = `${fuelPercent}%`;
  this.fuelPercent.textContent = `${fuelPercent.toFixed(0)}%`;

  // Throttle
  const throttlePercent = rocket.throttle * 100;
  this.throttleBar.style.width = `${throttlePercent}%`;

  // TWR
  const twr = rocket.getThrustToWeightRatio();
  this.twrDisplay.textContent = `TWR: ${twr.toFixed(2)}`;
  this.twrDisplay.style.color = twr >= 1.0 ? '#4CAF50' : '#f44336';

  // Burn time
  const burnTime = rocket.getBurnTimeRemaining();
  this.burnTime.textContent = `BURN TIME: ${formatTime(burnTime)}`;

  // Delta-V
  const deltaV = rocket.getRemainingDeltaV();
  this.deltaV.textContent = `DELTA-V: ${deltaV.toFixed(0)} m/s`;

  // Health
  const healthPercent = (rocket.health / ROCKET_CONFIG.HEALTH.maxHealth) * 100;
  this.healthBar.style.width = `${healthPercent}%`;
  this.healthBar.style.backgroundColor = healthPercent > 50 ? '#4CAF50' : healthPercent > 25 ? '#ff9800' : '#f44336';

  // Button visibility
  this.fuelButton.style.display = rocket.isGrounded() ? 'block' : 'none';
}
```

---

## 6. Rocket States & Transitions

### State Machine

```typescript
enum RocketState {
  DOCKED,           // On launch pad, not boarded
  BOARDED_GROUNDED, // Player in rocket, on ground
  LAUNCHING,        // Actively thrusting upward
  IN_FLIGHT,        // Flying (gravity or space)
  LANDING,          // Descending toward surface
  LANDED,           // On ground after flight (not at launch pad)
  CRASHED,          // Destroyed
  CAPSULE_EJECTED,  // Only capsule remains
}

// State transitions:
DOCKED -> BOARDED_GROUNDED (player boards)
BOARDED_GROUNDED -> DOCKED (player exits)
BOARDED_GROUNDED -> LAUNCHING (thrust activated)
LAUNCHING -> IN_FLIGHT (off the ground)
IN_FLIGHT -> LANDING (descending toward planet)
LANDING -> LANDED (touched down safely)
LANDING -> CRASHED (impact too fast)
IN_FLIGHT -> CRASHED (collision with terrain)
ANY -> CAPSULE_EJECTED (eject button pressed)
LANDED -> BOARDED_GROUNDED (if player re-boards)
```

### State Behaviors

```typescript
switch (rocketState) {
  case RocketState.DOCKED:
    // Rocket attached to launch pad
    // Cannot move, waiting for boarding
    break;

  case RocketState.BOARDED_GROUNDED:
    // Player controlling, but on ground
    // Can fuel, can activate thrust
    // Orientation locked to surface normal
    break;

  case RocketState.LAUNCHING:
    // Thrust active, leaving surface
    // Orientation locked to surface normal
    // Transition to IN_FLIGHT when altitude > threshold
    break;

  case RocketState.IN_FLIGHT:
    // Full flight mode
    // In gravity: locked orientation + strafe
    // In space: full 6DOF
    break;

  case RocketState.LANDING:
    // Descending toward surface
    // Orientation locked in gravity well
    // Monitor impact velocity
    break;

  case RocketState.LANDED:
    // On ground, not at launch pad
    // Player can exit or take off again
    // Simple collision box on terrain
    break;

  case RocketState.CRASHED:
    // Rocket destroyed
    // Spawn explosion effect
    // Drop debris/items
    // Player dies or is ejected
    break;

  case RocketState.CAPSULE_EJECTED:
    // Only command module remains
    // Deploy parachute if in atmosphere
    // Player inside capsule
    break;
}
```

---

## 7. Landing & Collision

### Simplified Collision System

Since rockets always point up in gravity wells, collision is simplified:

```typescript
// Rocket collision is a simple cylinder/capsule shape
const ROCKET_COLLISION = {
  radius: 1.5,                    // Horizontal collision radius
  bottomOffset: 0,                // Bottom of collision relative to pivot
  topOffset: 10,                  // Top of collision (based on stack height)
};

// Ground detection
function checkGroundCollision(rocket: RocketController): boolean {
  const planet = rocket.closestPlanet;
  if (!planet) return false;

  // Cast ray downward from rocket bottom
  const rocketBottom = rocket.getBottomPosition();
  const downDir = planet.center.clone().sub(rocketBottom).normalize();

  // Get terrain height at rocket position
  const tile = planet.getTileAtPoint(rocketBottom);
  if (!tile) return false;

  const surfaceRadius = planet.getSurfaceRadiusAtTile(tile.index);
  const rocketRadius = rocketBottom.distanceTo(planet.center);

  // Check if rocket is at or below surface
  return rocketRadius <= surfaceRadius + LANDING_THRESHOLD;
}

// Impact handling
function handleImpact(rocket: RocketController, impactVelocity: number) {
  if (impactVelocity < ROCKET_CONFIG.HEALTH.impactDamageThreshold) {
    // Safe landing
    rocket.setState(RocketState.LANDED);
    rocket.velocity.set(0, 0, 0);
    rocket.angularVelocity.set(0, 0, 0);
  } else {
    // Damage or crash
    const damage = (impactVelocity - ROCKET_CONFIG.HEALTH.impactDamageThreshold)
                   * ROCKET_CONFIG.HEALTH.impactDamageMultiplier;
    rocket.health -= damage;

    if (rocket.health <= 0) {
      rocket.explode();
    } else {
      // Damaged but survived
      rocket.setState(RocketState.LANDED);
      rocket.velocity.set(0, 0, 0);
    }
  }
}
```

### Explosion Effect

```typescript
function explode(rocket: RocketController) {
  rocket.setState(RocketState.CRASHED);

  // Visual effects
  createExplosionParticles(rocket.position);
  playExplosionSound();

  // Remove rocket meshes
  for (const part of rocket.parts) {
    scene.remove(part.mesh);
    part.dispose();
  }

  // If player was inside and didn't eject
  if (rocket.hasPlayer && !rocket.playerEjected) {
    // Player dies (or respawns)
    player.die();
  }

  // Drop any recoverable items at crash site
  // (optional: drop fuel tanks, parts, etc.)
}
```

---

## 8. Ejection & Parachute System

### Capsule Ejection

```typescript
function ejectCapsule(rocket: RocketController) {
  // Detach command module from rocket
  const capsule = rocket.parts.find(p => p.partType === RocketPartType.CAPSULE);
  if (!capsule) return;

  // Create separate capsule controller
  const capsuleController = new CapsuleController(capsule);
  capsuleController.position.copy(capsule.getWorldPosition());
  capsuleController.velocity.copy(rocket.velocity);

  // Add upward separation impulse
  const separationDir = rocket.localUp.clone();
  capsuleController.velocity.add(separationDir.multiplyScalar(EJECTION_VELOCITY));

  // Remove capsule from rocket
  rocket.parts = rocket.parts.filter(p => p !== capsule);
  rocket.setState(RocketState.CAPSULE_EJECTED);

  // The remaining rocket stack falls/drifts
  // If in gravity: will crash
  // If in space: will drift indefinitely

  // Transfer player to capsule
  player.enterCapsule(capsuleController);
}
```

### Parachute System

```typescript
export class Parachute {
  mesh: THREE.Group;
  isDeployed: boolean = false;
  canopyMesh: THREE.Mesh;
  linesMesh: THREE.LineSegments;

  // Parachute geometry
  private readonly CANOPY_RADIUS = 5;
  private readonly CANOPY_HEIGHT = 3;
  private readonly NUM_LINES = 8;
  private readonly LINE_LENGTH = 6;

  constructor() {
    this.mesh = new THREE.Group();
    this.createCanopy();
    this.createLines();
    this.mesh.visible = false;
  }

  createCanopy() {
    // Half-sphere canopy (double-sided)
    const geometry = new THREE.SphereGeometry(
      this.CANOPY_RADIUS,
      16,
      8,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2
    );

    const material = new THREE.MeshBasicMaterial({
      color: 0xff6600,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });

    this.canopyMesh = new THREE.Mesh(geometry, material);
    this.canopyMesh.position.y = this.LINE_LENGTH;
    this.mesh.add(this.canopyMesh);
  }

  createLines() {
    // Suspension lines from canopy edge to capsule
    const positions: number[] = [];

    for (let i = 0; i < this.NUM_LINES; i++) {
      const angle = (i / this.NUM_LINES) * Math.PI * 2;
      const x = Math.cos(angle) * this.CANOPY_RADIUS;
      const z = Math.sin(angle) * this.CANOPY_RADIUS;

      // Line from canopy edge to origin (capsule attach point)
      positions.push(x, this.LINE_LENGTH, z);
      positions.push(0, 0, 0);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({ color: 0x333333 });
    this.linesMesh = new THREE.LineSegments(geometry, material);
    this.mesh.add(this.linesMesh);
  }

  deploy() {
    this.isDeployed = true;
    this.mesh.visible = true;
    // Animation: scale from 0 to full size
    this.mesh.scale.set(0.1, 0.1, 0.1);
    // Animate over 1 second
  }

  update(deltaTime: number, capsuleVelocity: THREE.Vector3, gravityDir: THREE.Vector3) {
    if (!this.isDeployed) return;

    // Parachute creates drag opposing velocity
    const dragForce = capsuleVelocity.clone().multiplyScalar(-PARACHUTE_DRAG);

    // Parachute aligns opposite to velocity
    if (capsuleVelocity.lengthSq() > 0.1) {
      const targetUp = capsuleVelocity.clone().negate().normalize();
      // Slerp parachute orientation toward target
    }

    // Animate canopy billowing (optional)
  }
}
```

### Auto-Deploy Logic

```typescript
// In CapsuleController.update():
if (!parachute.isDeployed && isInAtmosphere && altitude < PARACHUTE_DEPLOY_ALTITUDE) {
  parachute.deploy();
}

// Apply parachute drag
if (parachute.isDeployed) {
  const drag = velocity.clone().normalize().multiplyScalar(-velocity.lengthSq() * PARACHUTE_DRAG_COEFFICIENT);
  velocity.add(drag.multiplyScalar(deltaTime));

  // Terminal velocity with parachute should be survivable
  // ~5 m/s
}
```

---

## 9. Home Planet Return

### Inventory Menu Addition

Add a "Return Home" button to the inventory menu when player is not on the home planet.

```typescript
// In InventoryUI or a new section:
if (player.currentPlanet !== player.homePlanet) {
  showReturnHomeButton();
}

function returnHome() {
  // Confirmation dialog
  if (!confirm("Return to home planet? Your current position will be lost.")) {
    return;
  }

  // If in rocket, abandon it
  if (player.isInRocket) {
    player.exitRocket();
  }

  // Teleport player to home planet spawn
  const spawnPos = player.homePlanet.getSpawnPosition();
  player.teleportTo(spawnPos);
  player.setCurrentPlanet(player.homePlanet);

  // Update camera/orientation for new planet
  player.alignToSurface();
}
```

---

## 10. File Structure

### Complete New File List

```
src/rocket/
├── RocketController.ts       # ~400 lines - Main flight controller
├── RocketPhysics.ts          # ~200 lines - Physics calculations
├── RocketCamera.ts           # ~150 lines - Orbit camera
├── RocketConfig.ts           # ~100 lines - Configuration constants
├── RocketState.ts            # ~100 lines - State machine
├── Parachute.ts              # ~150 lines - Parachute system
├── CapsuleController.ts      # ~200 lines - Ejected capsule physics
└── index.ts                  # Exports

src/player/
└── RocketFlightUI.ts         # ~300 lines - Flight HUD
```

### Modified Files Summary

| File | Changes |
|------|---------|
| `LaunchPad.ts` | Add `detachRocket()`, `boardRocket()` methods |
| `RocketPart.ts` | Add `mass`, `fuelCapacity`, `currentFuel` properties |
| `PlanetPlayer.ts` | Add `enterRocket()`, `exitRocket()`, rocket mode handling |
| `Inventory.ts` | Add parachute item type |
| `PlayerConfig.ts` | Add rocket flight constants |
| `mainPlanet.ts` | Integrate `RocketController`, update loop |
| `LaunchPadUI.ts` | "Board" button triggers rocket boarding |

---

## 11. Implementation Phases

### Phase 1: Core Rocket Controller (MVP)
**Estimated complexity: Medium**

1. Create `RocketConfig.ts` with all constants
2. Create `RocketController.ts` with basic physics
3. Create `RocketCamera.ts` orbit camera
4. Modify `LaunchPad.ts` to detach rocket on boarding
5. Create basic flight HUD (altitude, velocity, fuel)
6. Implement simple ground collision

**Deliverable:** Player can board rocket, fly up, and land.

### Phase 2: Full Flight Controls
**Estimated complexity: Medium**

1. Implement gravity well detection and transitions
2. Add orientation locking in gravity wells
3. Implement strafe controls in gravity
4. Add full 6DOF in space
5. Add throttle controls

**Deliverable:** Full flight control system with gravity/space modes.

### Phase 3: Fuel & Physics
**Estimated complexity: Medium**

1. Implement fuel consumption
2. Add mass calculations (wet/dry)
3. Implement TWR calculation
4. Add delta-V calculation
5. Add burn time display
6. Implement "Fuel" button functionality

**Deliverable:** Realistic propulsion physics.

### Phase 4: Health & Damage
**Estimated complexity: Low**

1. Add health system
2. Implement impact damage
3. Create explosion effect
4. Add health bar to HUD

**Deliverable:** Rocket can be damaged and destroyed.

### Phase 5: Ejection & Parachute
**Estimated complexity: Medium**

1. Create `Parachute.ts` with geometry
2. Create `CapsuleController.ts`
3. Implement ejection mechanics
4. Add auto-deploy parachute
5. Handle capsule landing

**Deliverable:** Emergency escape system.

### Phase 6: Polish & Integration
**Estimated complexity: Low**

1. Add "Return Home" to inventory
2. Add sound effects (thrust, explosion)
3. Add visual effects (exhaust particles)
4. Test multi-planet travel
5. Balance physics values

**Deliverable:** Complete, polished system.

---

## 12. Data Structures

### RocketController State

```typescript
interface RocketControllerState {
  // Transform
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  orientation: THREE.Quaternion;
  angularVelocity: THREE.Vector3;

  // Parts
  parts: RocketPart[];
  pivot: THREE.Group;

  // Propulsion
  throttle: number;               // 0.0 - 1.0
  isThrustActive: boolean;
  currentFuel: number;
  totalFuelCapacity: number;

  // Status
  state: RocketState;
  health: number;
  closestPlanet: Planet | null;
  gravityMultiplier: number;
  isInGravityWell: boolean;

  // Player
  hasPlayer: boolean;
  playerEjected: boolean;
}
```

### Serialization (for save/load)

```typescript
interface SerializedRocket {
  position: { x: number, y: number, z: number };
  velocity: { x: number, y: number, z: number };
  orientation: { x: number, y: number, z: number, w: number };
  throttle: number;
  currentFuel: number;
  health: number;
  state: RocketState;
  parts: SerializedRocketPart[];
}

interface SerializedRocketPart {
  itemType: ItemType;
  partType: RocketPartType;
  currentFuel?: number;  // For fuel tanks
}
```

---

## Questions to Resolve Before Implementation

1. **Fuel source:** How does player get fuel? Mining? Crafting? For now, assume "Fuel" button fills instantly.

2. **Multiple rockets:** Can player own multiple rockets? For now, assume one at a time.

3. **Rocket persistence:** Does rocket persist when player is away? For now, assume yes (serialized).

4. **Re-boarding landed rockets:** Can player board a rocket that landed elsewhere? Yes, per requirements.

5. **Capsule recovery:** After ejecting, can player recover the capsule? For now, assume capsule is the player's "body" until landing.

---

## Appendix: Useful Formulas

### Tsiolkovsky Rocket Equation
```
Δv = ve * ln(m0 / m1)

Where:
- Δv = change in velocity (delta-v)
- ve = exhaust velocity = Isp * g0 (g0 = 9.81 m/s²)
- m0 = initial mass (wet)
- m1 = final mass (dry)
- ln = natural logarithm
```

### Thrust-to-Weight Ratio
```
TWR = F / (m * g)

Where:
- F = thrust force (Newtons)
- m = current mass (kg)
- g = local gravity acceleration (m/s²)
```

### Orbital Velocity (for future orbital mechanics)
```
v = sqrt(GM / r)

Where:
- G = gravitational constant
- M = planet mass
- r = orbital radius
```

---

*Document created: December 2024*
*Last updated: December 2024*
