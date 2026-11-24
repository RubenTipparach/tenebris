import { ItemType } from '../player/Inventory';

/**
 * Deep resources (openspec space-exploration, submarines / ocean-world):
 * what a craft collects by sitting in a body's deep band - Thalassa's heavy
 * water below its deep shelf, and (with the gas-giant diver) the giants'
 * helium-3 and metallic hydrogen. One table: the submarine, the diver and
 * the tests all read it.
 *
 * Depth is metres below the body's surface: below the sea surface for an
 * ocean, below the cloud tops for a gas giant.
 */
export interface DepthBand {
  item: ItemType;
  /** The band starts this deep (m) and runs to the bottom */
  minDepthM: number;
  /** Items collected per second sitting in it */
  perS: number;
}

export const DEPTH_BANDS: Partial<Record<string, DepthBand[]>> = {
  // Thalassa: heavy water in the deepest sixth of its sea (14 m of water and more)
  thalassa: [{ item: ItemType.DEUTERIUM, minDepthM: 14, perS: 0.2 }],
  // The gas giants, below the cloud tops - deeper than a rocket survives
  // (ROCKET_CONFIG.GAS_GIANT_FLIGHT.crushDepth), so only a diver gets there:
  // helium-3 in Aurelia's upper layers; Brontes has helium-3 too, and
  // metallic hydrogen far below it, where only the deep diver hull holds
  aurelia: [{ item: ItemType.HELIUM_3, minDepthM: 30, perS: 0.25 }],
  brontes: [
    { item: ItemType.HELIUM_3, minDepthM: 35, perS: 0.2 },
    { item: ItemType.METALLIC_HYDROGEN, minDepthM: 180, perS: 0.1 },
  ],
};

/** The band a craft `depthM` below a body's surface collects from, or null (too shallow, or nothing there) */
export function depthBandAt(bodyId: string, depthM: number): DepthBand | null {
  let best: DepthBand | null = null;
  for (const b of DEPTH_BANDS[bodyId] ?? []) if (depthM >= b.minDepthM && (!best || b.minDepthM > best.minDepthM)) best = b;
  return best;
}

/**
 * A submarine or gas-giant diver hull (openspec space-exploration,
 * submarines): one vehicle class (src/vehicles/Submarine.ts), rated by its
 * hull.
 */
export interface HullSpec {
  /** The item that is this hull (placed in water, or carried in a rocket's cargo) */
  item: ItemType;
  /** A gas-giant diver: released from a skimming rocket, docks back into its cargo; never placed in water */
  gas: boolean;
  /** The hull holds to this depth (m); below it, it takes damage */
  crushDepthM: number;
  maxHealth: number;
  /** Health lost per second for each metre below the rating */
  damagePerMPerS: number;
  /** Propeller push at full throttle (m/s^2) */
  thrust: number;
  /** Slots in its hold (what the bands give goes here) */
  holdSlots: number;
  /** Its look: hull, trim and window colours, and its size (m) */
  look: { hull: string; trim: string; window: string; length: number; radius: number };
}

export const SUBMARINE = {
  HULLS: [
    // Metropole Prime: the first submarine - shallow seas (Earth's, Thalassa's shelf)
    { item: ItemType.SUBMARINE, gas: false, crushDepthM: 10, maxHealth: 100, damagePerMPerS: 4, thrust: 5, holdSlots: 6,
      look: { hull: '#ffec27', trim: '#5f574f', window: '#29adff', length: 4.2, radius: 0.8 } },
    // Nerith: the deep hull - Thalassa's deuterium band and below
    { item: ItemType.DEEP_SUBMARINE, gas: false, crushDepthM: 30, maxHealth: 150, damagePerMPerS: 4, thrust: 6, holdSlots: 9,
      look: { hull: '#83769c', trim: '#1d2b53', window: '#ffec27', length: 4.8, radius: 0.9 } },
    // Thalassa: the gas-giant diver - helium-3 in the giants' upper layers
    { item: ItemType.GAS_GIANT_DIVER, gas: true, crushDepthM: 120, maxHealth: 120, damagePerMPerS: 1, thrust: 9, holdSlots: 6,
      look: { hull: '#ffa300', trim: '#7e2553', window: '#29adff', length: 2.6, radius: 1.1 } },
    // Verdance: the deep diver - Brontes's metallic hydrogen
    { item: ItemType.DEEP_DIVER, gas: true, crushDepthM: 400, maxHealth: 160, damagePerMPerS: 1, thrust: 14, holdSlots: 9,
      look: { hull: '#ff004d', trim: '#1d2b53', window: '#00e436', length: 3.0, radius: 1.2 } },
  ] as HullSpec[],

  PHYSICS: {
    // Ballast tanks: 0 = blown dry (rises), 1 = flooded (sinks); NEUTRAL hovers
    ballastRate: 0.35,           // share of the tanks filled / blown per second
    neutralBallast: 0.5,
    // Lift over weight swings by this much across the tanks (1 + span/2 dry,
    // 1 - span/2 flooded): dry, it floats with part of the hull out; under
    // the surface it climbs or settles a few m/s
    buoyancySpan: 0.2,
    // The hull's height (m) over which it goes from out of the fluid to under it
    hullHeightM: 1.4,
    // Water / gas drag (per second, at density 1, growing as density^power:
    // a gas giant's thick air drags more than water, not four times as much);
    // thin air above a sea barely slows it
    drag: 0.9,
    densityDragPower: 0.5,
    airDrag: 0.05,
    // How fast it turns (rad/s) at full stick
    pitchRate: 0.9,
    yawRate: 0.9,
    rollRate: 1.2,
    // Throttle change per second while W / S is held
    throttleRate: 1.2,
    // Clearance kept above the seabed (m)
    floorClearanceM: 1.0,
  },

  PLACE: {
    reachM: 8,                   // how far the view ray looks for water
    stepM: 0.25,
    minDepthM: 1.5,              // water deep enough to hold it
  },
  BOARD_REACH_M: 7,
  // While piloting, the pose is written this often (parking writes it at once)
  SAVE_POSE_EVERY_S: 2,
  // Another client's record says it is piloted; older than this, the pilot is gone
  RIDE_STALE_S: 20,
  // Climbing out: this far above the hull (m)
  EXIT_LIFT_M: 1.8,
  CAMERA: { distanceM: 9, heightM: 2.5, followRate: 6 },

  DIVER: {
    // It docks back within this distance (m) of its rocket
    dockRadiusM: 12,
    // It leaves the rocket this far below it (m), clear of the hull
    releaseDropM: 6,
  },

  // The HUD's hull bar turns amber / red below these shares of full health
  HUD: { warnShare: 0.5, dangerShare: 0.25 },
};

/** The hull an item is, or null */
export function hullOf(item: ItemType): HullSpec | null {
  return SUBMARINE.HULLS.find(h => h.item === item) ?? null;
}

/** Piloting keys (KeyboardEvent.code) - Interact (F) boards, docks and climbs out */
export const SUBMARINE_INPUTS = {
  INTERACT: 'KeyF',             // F - board / climb out / dock the diver
  EXIT: 'KeyV',                 // V - climb out (as from a rocket)
  THROTTLE_UP: 'KeyW',          // W - more forward throttle
  THROTTLE_DOWN: 'KeyS',        // S - less (down to full astern)
  STOP: 'KeyX',                 // X - throttle to zero
  YAW_LEFT: 'KeyA',
  YAW_RIGHT: 'KeyD',
  ROLL_LEFT: 'KeyQ',            // Q / E roll, as in a rocket
  ROLL_RIGHT: 'KeyE',
  PITCH_UP: 'ArrowUp',          // nose up
  PITCH_DOWN: 'ArrowDown',      // nose down
  BLOW: 'Space',                // blow the ballast tanks (rise)
  FLOOD: 'KeyC',                // flood them (sink)
};
