// Rocket Flight System Configuration
// All constants for rocket physics, controls, and behavior

import { ItemType } from '../player/Inventory';
import { POWER_CONFIG } from './PowerConfig';

// The command module's own cell (openspec wool-air-and-reentry, design 2):
// it runs the cabin for CELL_MINUTES of flight, so its draw is derived from
// the two - change either and the other follows
const CELL_WH = 20000;
const CELL_MINUTES = 15;
// A battery pack is built from one lithium-ion battery (POWER_CONFIG
// fabricator recipe) and holds what that battery holds - one source
const LITHIUM_WH = POWER_CONFIG.BATTERIES[ItemType.BATTERY_LITHIUM].capacityWh;
// The command module's draw, W (its cell over CELL_MINUTES)
const CELL_DRAW_W = CELL_WH * 60 / CELL_MINUTES;

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
  equipmentSlots?: number; // equipment slots this part adds (ROCKET_CONFIG.EQUIPMENT)
  batteryWh?: number;    // charge this part stores (the command module's cell)
  powerDrawW?: number;   // what this part draws while the rocket flies (the command module)
  // Parts that must also be in the stack for this one to work (the ion
  // drive needs a reactor core). Unmet: the part gives no thrust, and the
  // stack's stats carry the reason (RocketStats.problems)
  requires?: ItemType[];
}

/**
 * What one piece of rocket equipment gives, per item (openspec
 * wool-air-and-reentry, design 2/3/6). Equipment is not a part in the stack:
 * it is fitted into the rocket's equipment slots (the command module gives
 * them), and a slot of N items gives N times this.
 */
export interface RocketEquipmentStats {
  mass: number;          // kg each item adds to the rocket
  batteryWh?: number;    // charge each stores (battery pack)
  solarW?: number;       // what each charges in full sun (solar array)
  chutes?: number;       // parachutes each gives (one opens per descent and is used up)
  heatShield?: number;   // heat each heat shield soaks up before it is worn through (REENTRY heat units)
}

export const ROCKET_CONFIG = {
  // === RESPAWN ===
  // After a crash, respawn beside the pad the flight took off from: this far
  // (m) from its middle, on the side away from the tower
  RESPAWN_PAD_OFFSET_M: 6,

  // === SELF DESTRUCT ===
  // Hold ROCKET_INPUTS.SELF_DESTRUCT this long (s) to blow the rocket up; letting
  // go before then cancels. Only once launched (on the pad, just climb out)
  SELF_DESTRUCT_HOLD_S: 2,

  // === EXIT IN SPACE ===
  // Out of every gravity well a pilot may climb out (an EVA): the ship parks
  // where it floats, and the player comes out this far off its side (m), clear
  // of the hull, to float in space mode and re-board it later
  EVA_EXIT_DISTANCE_M: 4,
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
    { itemType: ItemType.KEROSENE, units: 40 },  // refined from crude oil (industry-and-nuclear)
  ] as { itemType: ItemType; units: number; returns?: ItemType }[],
  // A rocket assembled on a NEW launch pad starts with empty tanks (pads from
  // older saves, and the starter rocket, keep launching full)
  NEW_PAD_FUEL: 0,
  // The pad a rocket launched from keeps the fuel it burns: its record is
  // written each time this many more units have burnt (and on any exit,
  // respawn or crash), so a relaunch from the pad starts with what is left
  PAD_FUEL_RECORD_STEP: 5,
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
    // 3 equipment slots: a parachute, a solar array and a battery pack at once
    [ItemType.COMMAND_MODULE]: { tier: 1, dryMass: 200, cargoSlots: 4, equipmentSlots: 3, batteryWh: CELL_WH, powerDrawW: CELL_DRAW_W },
    [ItemType.CARGO_BAY]: { tier: 1, dryMass: 80, cargoSlots: 8 },
    // Tier 3 (uranium, built off-world): the nuclear thermal engine - the
    // same tank fuel at more than twice the vacuum engine's efficiency
    [ItemType.NUCLEAR_THERMAL_ENGINE]: { tier: 3, dryMass: 300, thrust: 30000, specificImpulse: 500 },
    // Tier 4: the ion drive, the most efficient engine and the gentlest -
    // an in-space engine that only fires with a reactor core aboard
    [ItemType.ION_DRIVE]: { tier: 4, dryMass: 120, thrust: 1500, specificImpulse: 3000, requires: [ItemType.REACTOR_CORE] },
    [ItemType.REACTOR_CORE]: { tier: 4, dryMass: 400 },
  } as Partial<Record<ItemType, RocketPartStats>>,

  // === CARGO HOLD ===
  // Carries stuff (fuel for the trip home, ore, anything): each item weighs
  CARGO: {
    massPerItem: 2,               // kg each carried item adds to the rocket
  },

  // === EQUIPMENT (openspec wool-air-and-reentry, design 2/3/6) ===
  // Items fitted into the rocket's equipment slots (PARTS equipmentSlots,
  // the command module's 3) - not parts of the stack. Only these items fit.
  // They stack in a slot (up to the item's stackSize) and every item counts:
  // N battery packs store N x batteryWh, N parachutes open N times (one per
  // descent, used up as it opens or tears), and each adds its mass.
  EQUIPMENT: {
    // the parachute (wool + iron) - ROCKET_CONFIG.PARACHUTE says how it flies
    [ItemType.PARACHUTE]: { mass: 40, chutes: 1 },
    // the solar array (after batteries, design 6): half the command module's
    // draw, so two keep it running in full sun; nothing in a planet's shadow
    [ItemType.SOLAR_ARRAY]: { mass: 50, solarW: CELL_DRAW_W / 2 },
    // the battery pack (tier 3): a lithium-ion battery's charge, twice the
    // command module's own cell - +30 minutes of flight each
    [ItemType.BATTERY_PACK]: { mass: 60, batteryWh: LITHIUM_WH },
    // the heat shield (space-exploration): soaks up REENTRY.shieldShare of
    // the heat gained until `heatShield` units have gone into it, then it is
    // worn through and leaves the equipment
    [ItemType.HEAT_SHIELD]: { mass: 120, heatShield: 400 },
  } as Partial<Record<ItemType, RocketEquipmentStats>>,

  // === GAS GIANTS (space-exploration, design 7) ===
  // A gas giant is a gravity well with air (BODY_ENVIRONMENTS density) and no
  // ground. Dropping below its cloud tops and climbing back out past
  // skimExitMult x its radius is a skim; sinking below (1 - crushDepth) x its
  // radius crushes the rocket.
  GAS_GIANT_FLIGHT: {
    gravityStrength: 1.6,
    crushDepth: 0.06,             // share of the radius below the cloud tops
    skimExitMult: 1.15,
  },

  // === THE SUN (space-exploration, design 7) ===
  // Inside closePassRadii x its radius the Sun heats a rocket, more the
  // closer it is (heatPerS at its surface); getting back out alive is a
  // close pass. Touching it burns the rocket up.
  SUN_PASS: {
    closePassRadii: 1.6,
    heatPerS: 45,
  },

  // === COMMAND MODULE ===
  COMMAND_MODULE: {
    maxSurvivableImpact: 10,      // m/s
  },

  // === POWER (openspec wool-air-and-reentry, design 2) ===
  // A flight's charge is the stack's batteryWh (PARTS) plus its equipped
  // battery packs (EQUIPMENT), drawn at its
  // powerDrawW whenever the rocket flies (launching, in flight, landing - not
  // on the pad or landed). Flat: no thrust, no steering, no cabin air.
  POWER: {
    CELL_MINUTES,                 // the command module's cell alone lasts this long
    LOW_WARN_S: 120,              // toast when this much flight time is left
    // Interact at a landed rocket holding this item swaps it in: it is used
    // up and adds its stored Wh (POWER_CONFIG.BATTERIES), up to the capacity
    SWAP_ITEM: ItemType.BATTERY_LITHIUM,
  },

  // === RE-ENTRY HEAT (openspec wool-air-and-reentry, design 3) ===
  // A flight that has been outside every atmosphere since launch and then
  // enters one is re-entering until it lands. Faster than safeSpeed it heats
  // by (speed - safeSpeed) * heatPerMs per second, else it cools at coolPerS.
  // Above damageFrom heat wears health (damagePerS at maxHeat, scaled
  // linearly from damageFrom); at maxHeat it burns up.
  REENTRY: {
    // Where the air is, for heat and the parachute, as a multiple of the
    // body's radius. NOT PlayerConfig.ATMOSPHERE_RADIUS_MULT (1.1): the sky
    // shell is 10 m thick on Earth, crossed in a fraction of a second at
    // re-entry speeds, so heat could never build. This is the gravity well's
    // edge (GRAVITY_WELL.FALLOFF_RADIUS_MULT), 80 m deep on Earth: the
    // whole descent through a body's pull is "in the air".
    shellRadiusMult: 1.8,
    // A fitted heat shield takes this share of the heat gained (re-entry and the Sun)
    shieldShare: 0.95,
    // Earth's free-fall speed with the flight damping is ~37 m/s, so a
    // passive fall stays cool; only a powered dive heats
    safeSpeed: 40,                // m/s
    heatPerMs: 1.5,               // heat per second per m/s over safeSpeed (80 m/s: maxHeat in under 2 s)
    coolPerS: 25,                 // heat lost per second otherwise
    damageFrom: 50,               // heat above this wears health
    damagePerS: 60,               // health per second at maxHeat
    maxHeat: 100,                 // burns up here
    // The glow: an additive shell round the stack, opacity = heat share * maxOpacity
    glow: {
      color: 0xff7a1a,
      maxOpacity: 0.85,
      radius: 2.5,                // m, past the stack's widest part
      lengthPad: 2,               // m added to the stack's height
    },
  },

  // === PARACHUTE (openspec wool-air-and-reentry, design 3) ===
  // Opens by ROCKET_INPUTS.PARACHUTE or by itself when falling below
  // deployAltitude - only with a PARACHUTE fitted in the equipment slots,
  // only inside an atmosphere (REENTRY.shellRadiusMult) and only below
  // maxOpenSpeed (faster, it tears). Opening or tearing uses one up. Open, the descent's excess over
  // terminalVelocity bleeds at dragRate (1/s) and the chute holds gravity
  // there; sideways motion bleeds at the same rate; it rights the rocket.
  PARACHUTE: {
    deployAltitude: 50,           // m above the surface (auto-open while falling)
    maxOpenSpeed: 45,             // m/s (above a passive fall's ~37 m/s)
    terminalVelocity: 3,          // m/s, under HEALTH.impactDamageThreshold
    dragRate: 1.5,                // 1/s
    uprightRate: 1.5,             // 1/s, how fast it swings the nose up
    // The canopy drawn above the stack (procedural)
    canopy: {
      radius: 3.5,                // m
      height: 2.2,                // m, the dome's depth
      lift: 4,                    // m above the top of the stack
      gores: 12,                  // stripes round the dome
      colors: [0xff4a2a, 0xf2f0e9] as const,
      lineColor: 0xdddddd,
    },
  },

  // === PHYSICS ===
  PHYSICS: {
    dragCoefficient: 0.5,         // Atmospheric drag
    angularDamping: 0.98,         // Rotation kept per reference frame (0.98^60: 30% of a spin left after 1 s; was 0.95, ~5%)
    linearDamping: 0.995,         // Speed kept per reference frame (0.995^60: 74% after 1 s; was 0.99, 55%) - drift still settles.
                                  // Higher and a passive fall back from space passes REENTRY.safeSpeed (0.997: 41.6 m/s)
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

  // === RCS THRUSTER LINES (rocket/RocketRcsVisuals.ts) ===
  // Shown while WASD / Q / E turn the rocket: a pair of jets per turn
  RCS_VISUAL: {
    length: 2.5,                  // m, each jet's line
    flicker: 0.3,                 // share of the length a jet flickers by
    leverShare: 0.85,             // pitch / roll jets sit this far up the half-stack (nose and tail)
    hullRadius: 1.0,              // m, where spin jets leave the hull's side
    color: 0xe8f6ff,
    opacity: 0.9,
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
    // (the parachute's numbers live in PARACHUTE)
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
  PARACHUTE: 'KeyP',              // P - open the parachute (Shift+P stays the screenshot key)
  SELF_DESTRUCT: 'KeyK',          // K - hold to self-destruct (X is throttle up)
};
