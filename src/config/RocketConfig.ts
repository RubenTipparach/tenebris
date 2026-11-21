// Rocket Flight System Configuration
// All constants for rocket physics, controls, and behavior

import { ItemType } from '../player/Inventory';

/**
 * What one rocket part brings to the stack. A rocket's mass, thrust, fuel
 * flow, delta-v and cargo space are all summed from these
 * (rocket/RocketPerformance.ts computeRocketStats) - one table, read by the
 * flight physics, the launch pad readout and the tests alike.
 */
export interface RocketPartStats {
  tier: number;          // tech tier (1 = Earth-built, 2 = needs the Moon's titanium)
  dryMass: number;       // kg, empty
  thrust?: number;       // N, engines only
  specificImpulse?: number; // s, engines only. Fuel flow is DERIVED from it:
                         // mdot = thrust / (Isp * g0), so the delta-v shown is
                         // the delta-v the physics delivers
  fuelCapacity?: number; // fuel units, tanks only (FUEL_KG_PER_UNIT kg each)
  cargoSlots?: number;   // cargo hold slots this part adds
  // Parts that must also be in the stack for this one to work (the ion
  // drive needs a reactor core). Unmet: the part gives no thrust, and the
  // stack's stats carry the reason (RocketStats.problems)
  requires?: ItemType[];
}

export const ROCKET_CONFIG = {
  // === FUEL SYSTEM ===
  // Mass of one fuel unit. A medium tank holds 100 units = 450 kg of propellant
  FUEL_KG_PER_UNIT: 4.5,
  // What refuelling burns, in the order it is drawn (from the rocket's cargo
  // hold first, then the player's hotbar + bag), and the fuel units each item
  // gives. `returns` goes back where the item came from (an emptied bucket).
  FUEL_SOURCES: [
    { itemType: ItemType.ROCKET_FUEL, units: 25 },
    { itemType: ItemType.WATER_BUCKET, units: 15, returns: ItemType.BUCKET },
    { itemType: ItemType.ICE, units: 8 },
  ] as { itemType: ItemType; units: number; returns?: ItemType }[],
  // A rocket assembled on a NEW launch pad starts with empty tanks (pads from
  // older saves, and the starter rocket, keep launching full)
  NEW_PAD_FUEL: 0,
  // Launch pads are built one Launch Pad Block (one hex) at a time. A rocket
  // and its tower need at least PAD_BLOCKS_PER_TOWER blocks laid as a middle
  // hex with the full ring around it; the rocket stands in the middle and
  // its tower on any other pad hex - never the middle, and one tower per pad.
  PAD_BLOCKS_PER_TOWER: 7,
  // A block joins a pad when it touches it, at most this many blocks above
  // or below the pad's level (the ground is levelled / filled under it)
  PAD_MAX_STEP: 1,
  // "Start with a rocket": a full rocket, this much Rocket Fuel in its cargo
  // hold (a full refuel for the trip home) and empty buckets for the player
  STARTER_KIT: {
    cargoRocketFuel: 4,
    buckets: 1,
  },

  // === THE TECH TREE: per-part stats ===
  // Tier 1 (Earth): Rocket Engine + Medium Fuel Tank + Command Module. Enough
  // delta-v to fly Earth -> Moon and land with a good margin (and Earth's
  // near neighbours), not the rock worlds 1.5-4.5 km out.
  // Tier 2 (Moon titanium): the Vacuum Engine - efficient but weak, it can't
  // lift off Earth (TWR < 1) but flies fine off the Moon and in space - and
  // the Large Fuel Tank. Together they reach the other planets.
  // Tier 3 (openspec industry-and-nuclear): the Nuclear Thermal Engine.
  // Tier 4: the Ion Drive, which needs a Reactor Core in the stack.
  // The derived numbers (delta-v, TWR, Earth->Moon cost) are printed by
  // scripts/rocket-tech-report.ts.
  PARTS: {
    [ItemType.ROCKET_ENGINE]: { tier: 1, dryMass: 100, thrust: 39000, specificImpulse: 90 },
    [ItemType.VACUUM_ENGINE]: { tier: 2, dryMass: 150, thrust: 26000, specificImpulse: 200 },
    [ItemType.MEDIUM_FUEL_TANK]: { tier: 1, dryMass: 50, fuelCapacity: 100 },
    [ItemType.FUEL_TANK]: { tier: 1, dryMass: 50, fuelCapacity: 100 },   // legacy tank
    [ItemType.LARGE_FUEL_TANK]: { tier: 2, dryMass: 120, fuelCapacity: 300 },
    [ItemType.COMMAND_MODULE]: { tier: 1, dryMass: 200, cargoSlots: 4 },
    [ItemType.CARGO_BAY]: { tier: 1, dryMass: 80, cargoSlots: 8 },
    // Tier 3 (uranium, built off-world): the nuclear thermal engine - the
    // same tank fuel at more than twice the vacuum engine's efficiency - and
    // the battery pack (cargo space now, ion power later)
    [ItemType.NUCLEAR_THERMAL_ENGINE]: { tier: 3, dryMass: 300, thrust: 30000, specificImpulse: 500 },
    [ItemType.BATTERY_PACK]: { tier: 3, dryMass: 60, cargoSlots: 2 },
    // Tier 4: the ion drive, the most efficient engine and the gentlest -
    // an in-space engine that only fires with a reactor core aboard
    [ItemType.ION_DRIVE]: { tier: 4, dryMass: 120, thrust: 1500, specificImpulse: 3000, requires: [ItemType.REACTOR_CORE] },
    [ItemType.REACTOR_CORE]: { tier: 4, dryMass: 400 },
  } as Partial<Record<ItemType, RocketPartStats>>,

  // === CARGO HOLD ===
  CARGO: {
    massPerItem: 2,               // kg each carried item adds to the rocket
  },

  // === COMMAND MODULE ===
  COMMAND_MODULE: {
    hasParachute: true,
    parachuteDeployAltitude: 50, // meters above surface
    maxSurvivableImpact: 10,      // m/s
  },

  // === PHYSICS ===
  PHYSICS: {
    dragCoefficient: 0.5,         // Atmospheric drag
    angularDamping: 0.95,         // Rotation slowdown per reference frame
    linearDamping: 0.99,          // Linear slowdown per reference frame (noticeable drag to prevent infinite drift)
    dampingReferenceFps: 60,      // the damping above is per frame at this rate; scaled by dt so it is frame-rate independent
    gravityConstant: 9.81,        // m/s^2 for TWR/delta-V calculations
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
    strafeFuelConsumption: 2,     // Fuel units per second when strafing
    throttleStep: 0.1,            // Per shift/ctrl press
    throttleHoldRate: 0.5,        // Throttle change per second when holding
  },

  // === CAMERA ===
  CAMERA: {
    defaultDistance: 20,          // Default distance from rocket center
    minDistance: 8,               // Minimum zoom distance
    maxDistance: 100,             // Maximum zoom distance
    minElevation: -Math.PI / 2 + 0.01,  // Nearly straight down allowed
    maxElevation: Math.PI / 2 - 0.01,   // Nearly straight up allowed
    smoothSpeed: 15.0,            // Camera lerp speed (more responsive)
    mouseSensitivity: 0.005,      // Mouse look sensitivity (more responsive)
    zoomSpeed: 0.1,               // Scroll wheel zoom speed
  },

  // === ROCKET DIMENSIONS ===
  DIMENSIONS: {
    collisionRadius: 1.5,         // Horizontal collision radius
    bottomOffset: 0,              // Bottom of collision relative to pivot
  },

  // === STATE THRESHOLDS ===
  THRESHOLDS: {
    launchAltitude: 5,            // Altitude at which LAUNCHING -> IN_FLIGHT
    landingVelocity: 2,           // Max safe landing velocity (no damage warning)
    groundedCheckDistance: 0.5,   // Distance to check for ground collision
  },

  // === EJECTION ===
  EJECTION: {
    separationVelocity: 20,       // m/s upward impulse when ejecting
    parachuteDrag: 0.95,          // Drag coefficient with parachute deployed
    terminalVelocity: 5,          // m/s with parachute
  },

  // === VISUAL ===
  VISUAL: {
    exhaustParticleCount: 50,     // Number of exhaust particles
    exhaustLength: 3,             // Length of exhaust flame
  },
};

// Gravity well detection thresholds (as multiplier of planet radius)
// When inside gravity well, rocket orientation is locked pointing "up"
export const GRAVITY_WELL = {
  // Use same values as player gravity for consistency
  FULL_RADIUS_MULT: 1.4,          // Full gravity within this radius
  FALLOFF_RADIUS_MULT: 1.8,       // Gravity falls to 0 at this radius
  // Transition zone: between FULL and FALLOFF, controls blend between gravity-locked and free flight
};

// Input action mappings for rocket flight
export const ROCKET_INPUTS = {
  // Rotation (WASD always controls rotation)
  PITCH_DOWN: 'KeyW',             // W - pitch nose down
  PITCH_UP: 'KeyS',               // S - pitch nose up
  YAW_LEFT: 'KeyA',               // A - yaw left
  YAW_RIGHT: 'KeyD',              // D - yaw right
  ROLL_LEFT: 'KeyQ',              // Q - roll left
  ROLL_RIGHT: 'KeyE',             // E - roll right

  // Strafe thrusters (arrow keys + C for descent)
  STRAFE_FORWARD: 'ArrowUp',      // Up arrow - strafe forward
  STRAFE_BACKWARD: 'ArrowDown',   // Down arrow - strafe backward
  STRAFE_LEFT: 'ArrowLeft',       // Left arrow - strafe left
  STRAFE_RIGHT: 'ArrowRight',     // Right arrow - strafe right
  STRAFE_DOWN: 'KeyC',            // C - descend (strafe down relative to rocket)

  // Throttle
  THROTTLE_UP: 'KeyX',            // X - increase throttle
  THROTTLE_DOWN: 'KeyZ',          // Z - decrease throttle
  ENGINE_MODE: 'KeyG',            // G - cycle engine mode: All, then each engine type (design 6b)
  THRUST_TOGGLE: 'Space',         // Space - toggle thrust on/off

  // Actions
  FUEL_ROCKET: 'KeyF',            // F - fuel rocket (when grounded)
  EXIT_ROCKET: 'KeyV',            // V - exit rocket
  EJECT_CAPSULE: 'KeyJ',          // J - emergency eject (hold)
  RESPAWN: 'KeyB',                // B - abandon the rocket and respawn on the nearest planet
};
