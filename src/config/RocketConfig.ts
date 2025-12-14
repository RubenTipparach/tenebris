// Rocket Flight System Configuration
// All constants for rocket physics, controls, and behavior

export const ROCKET_CONFIG = {
  // === FUEL SYSTEM ===
  MEDIUM_FUEL_TANK: {
    fuelCapacity: 100,           // Units of fuel
    wetMass: 500,                 // kg when full
    dryMass: 50,                  // kg when empty
  },

  // === ENGINE SYSTEM ===
  MEDIUM_ENGINE: {
    thrust: 39000,                // Newtons
    fuelConsumption: 10,          // Units per second at 100% throttle
    specificImpulse: 300,         // Isp in seconds (efficiency)
    mass: 100,                    // kg
  },

  // === COMMAND MODULE ===
  COMMAND_MODULE: {
    mass: 200,                    // kg (always dry)
    hasParachute: true,
    parachuteDeployAltitude: 50, // meters above surface
    maxSurvivableImpact: 10,      // m/s
  },

  // === PHYSICS ===
  PHYSICS: {
    dragCoefficient: 0.5,         // Atmospheric drag
    angularDamping: 0.95,         // Rotation slowdown per frame
    linearDamping: 0.99,          // Linear slowdown in space (noticeable drag to prevent infinite drift)
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
  THRUST_TOGGLE: 'Space',         // Space - toggle thrust on/off

  // Actions
  FUEL_ROCKET: 'KeyF',            // F - fuel rocket (when grounded)
  EXIT_ROCKET: 'KeyV',            // V - exit rocket
  EJECT_CAPSULE: 'KeyJ',          // J - emergency eject (hold)
};
