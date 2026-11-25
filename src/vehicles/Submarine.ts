import * as THREE from 'three';
import { InventorySlot, ItemType, ITEM_DATA } from '../player/Inventory';
import { SUBMARINE, HullSpec, hullOf, depthBandAt } from '../config/DivingConfig';
import { slotStore } from '../rocket/RocketPerformance';

/**
 * The submarine and the gas-giant diver (openspec space-exploration,
 * submarines): one vehicle class, rated by its hull (DivingConfig
 * SUBMARINE.HULLS). This file is the pure part - the physics step, the hull
 * and the depth bands, the record a parked craft is saved as, and the diver's
 * dock into a rocket's cargo - so the tests run it headless. The runtime
 * (meshes, keys, HUD, camera) is SubmarineManager.ts beside it.
 *
 * A craft lives in its body's frame: `local` is its position relative to the
 * body's centre, so a parked sub rides its planet round its orbit and a diver
 * stays put in its gas giant while the giant moves (the stationary-frame
 * rule). Its attitude is a quaternion (no gimbal: it pitches, yaws and rolls
 * freely); body axes are +Z forward, +Y up (so +X is to its left).
 */

/** The fluid a craft is in: a sea (voxel water) or a gas giant below its cloud tops. One physics path for both. */
export interface FluidMedium {
  /** Which body (the depth bands are per body) */
  bodyId: string;
  /** Metres below the fluid's surface at `local` (negative: above it, out of the fluid) */
  depthAt(local: THREE.Vector3): number;
  /** The solid floor's distance from the centre under `local` (a seabed), or -Infinity (a gas giant has none) */
  floorAt(local: THREE.Vector3): number;
  /** How thick the fluid is (water 1; a gas giant its atmosphere density) - drag scales with it */
  density: number;
  /** Gravity here (m/s^2, toward the centre) */
  gravity: number;
}

export interface Craft {
  /** Its record key (the same on every client) */
  key: string;
  /** The body it is in */
  body: string;
  hull: ItemType;
  /** Position relative to the body's centre */
  local: THREE.Vector3;
  velocity: THREE.Vector3;
  orientation: THREE.Quaternion;
  /** 0 = tanks blown dry (rises), 1 = flooded (sinks) */
  ballast: number;
  /** -1 (full astern) .. 1 (full ahead) */
  throttle: number;
  health: number;
  /** What it has collected */
  hold: InventorySlot[];
  /** Band items owed (whole ones go into the hold) */
  owed: number;
}

/** The stick for one step (each -1..1; ballast: -1 blow, +1 flood) */
export interface CraftInput {
  throttle: number;
  pitch: number;
  yaw: number;
  roll: number;
  ballast: number;
}
export const NO_INPUT: CraftInput = { throttle: 0, pitch: 0, yaw: 0, roll: 0, ballast: 0 };

export interface StepResult {
  depth: number;
  /** Below its rating this step (taking damage) */
  crushing: boolean;
  /** Health reached zero: the craft is lost */
  lost: boolean;
  /** What the band gave this step (whole items, already in the hold) */
  collected: { item: ItemType; count: number } | null;
  /** Items that did not fit (the hold is full) */
  holdFull: boolean;
}

const newKey = (): string => `sub-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
const emptySlots = (n: number): InventorySlot[] => Array.from({ length: n }, () => ({ itemType: ItemType.NONE, quantity: 0 }));

/** A new craft of `hull` at `local` in `body`, level: nose along `forward`, its top along `up` */
export function newCraft(hull: HullSpec, body: string, local: THREE.Vector3, up: THREE.Vector3, forward: THREE.Vector3, key = newKey()): Craft {
  return {
    key, body, hull: hull.item,
    local: local.clone(),
    velocity: new THREE.Vector3(),
    orientation: levelOrientation(up, forward),
    ballast: SUBMARINE.PHYSICS.neutralBallast,
    throttle: 0,
    health: hull.maxHealth,
    hold: emptySlots(hull.holdSlots),
    owed: 0,
  };
}

/** The attitude with +Y along `up` and +Z along `forward` (made perpendicular to up) */
export function levelOrientation(up: THREE.Vector3, forward: THREE.Vector3): THREE.Quaternion {
  const u = up.clone().normalize();
  const f = forward.clone().addScaledVector(u, -forward.dot(u));
  if (f.lengthSq() < 1e-8) f.set(1, 0, 0).addScaledVector(u, -u.x);
  f.normalize();
  const r = new THREE.Vector3().crossVectors(u, f);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(r, u, f));
}

export const craftForward = (c: Craft): THREE.Vector3 => new THREE.Vector3(0, 0, 1).applyQuaternion(c.orientation);
export const craftUp = (c: Craft): THREE.Vector3 => new THREE.Vector3(0, 1, 0).applyQuaternion(c.orientation);

/** How much of the hull is in the fluid at `depth` (0 out .. 1 under) */
export function submergedShare(depth: number): number {
  return Math.max(0, Math.min(1, depth / SUBMARINE.PHYSICS.hullHeightM + 0.5));
}

/** Lift over weight at this ballast, fully under (1 at neutral) */
export function buoyancyRatio(ballast: number): number {
  const P = SUBMARINE.PHYSICS;
  return 1 + P.buoyancySpan * (P.neutralBallast - ballast);
}

const q1 = new THREE.Quaternion();
const AX = new THREE.Vector3(1, 0, 0), AY = new THREE.Vector3(0, 1, 0), AZ = new THREE.Vector3(0, 0, 1);

/**
 * One physics step: attitude (body-frame turns on the quaternion), ballast,
 * buoyancy against gravity, the propeller, drag, the floor, the hull and
 * the depth band. Mutates `c`.
 */
export function stepCraft(c: Craft, input: CraftInput, medium: FluidMedium, dt: number): StepResult {
  const P = SUBMARINE.PHYSICS;
  const hull = hullOf(c.hull)!;
  // Attitude: body-frame turns, then one normalise (no basis rebuild: no
  // gimbal). Signs: +pitch noses up, +yaw turns right, +roll rolls right
  if (input.pitch) c.orientation.multiply(q1.setFromAxisAngle(AX, -input.pitch * P.pitchRate * dt));
  if (input.yaw) c.orientation.multiply(q1.setFromAxisAngle(AY, -input.yaw * P.yawRate * dt));
  if (input.roll) c.orientation.multiply(q1.setFromAxisAngle(AZ, input.roll * P.rollRate * dt));
  c.orientation.normalize();
  c.ballast = Math.max(0, Math.min(1, c.ballast + input.ballast * P.ballastRate * dt));
  c.throttle = Math.max(-1, Math.min(1, input.throttle));

  const depth = medium.depthAt(c.local);
  const s = submergedShare(depth);
  const up = c.local.clone().normalize();
  // Buoyancy against gravity: what is under the surface lifts, the rest weighs
  c.velocity.addScaledVector(up, medium.gravity * (s * buoyancyRatio(c.ballast) - 1) * dt);
  // The screw pushes only in the fluid
  if (s > 0) c.velocity.addScaledVector(craftForward(c), c.throttle * hull.thrust * s * dt);
  // Drag: the fluid's (by its density) where it is under, thin air above
  const drag = P.drag * Math.pow(medium.density, P.densityDragPower) * s + P.airDrag * (1 - s);
  c.velocity.multiplyScalar(Math.exp(-drag * dt));
  c.local.addScaledVector(c.velocity, dt);
  // The seabed: kept a hull's clearance above it, no motion into it
  const floor = medium.floorAt(c.local) + P.floorClearanceM;
  const r = c.local.length();
  if (r < floor) {
    c.local.setLength(floor);
    const into = c.velocity.dot(up);
    if (into < 0) c.velocity.addScaledVector(up, -into);
  }

  const after = medium.depthAt(c.local);
  const crush = hullStep(c, hull, after, dt);
  const band = collectStep(c, medium.bodyId, after, dt);
  return { depth: after, crushing: crush.crushing, lost: crush.lost, collected: band.collected, holdFull: band.full };
}

/** The hull below its rating loses health for every metre over (DivingConfig); at zero the craft is lost */
export function hullStep(c: Craft, hull: HullSpec, depth: number, dt: number): { crushing: boolean; lost: boolean } {
  const over = depth - hull.crushDepthM;
  if (over <= 0) return { crushing: false, lost: c.health <= 0 };
  c.health = Math.max(0, c.health - over * hull.damagePerMPerS * dt);
  return { crushing: true, lost: c.health <= 0 };
}

/** Sitting in a body's depth band fills the hold over time (DEPTH_BANDS) */
export function collectStep(c: Craft, bodyId: string, depth: number, dt: number): { collected: { item: ItemType; count: number } | null; full: boolean } {
  const band = depthBandAt(bodyId, depth);
  if (!band) { c.owed = 0; return { collected: null, full: false }; }
  c.owed += band.perS * dt;
  const whole = Math.floor(c.owed);
  if (whole <= 0) return { collected: null, full: false };
  c.owed -= whole;
  const left = slotStore(c.hold).addItem(band.item, whole);
  return { collected: whole - left > 0 ? { item: band.item, count: whole - left } : null, full: left > 0 };
}

// ---- the record a craft is saved and synced as (placed-object kind 'submarine')

export interface SavedSubmarine {
  key: string;
  hull: number;
  /** Where it is, in its planet's configured frame (as every placed object is saved) */
  position: { x: number; y: number; z: number };
  q: [number, number, number, number];
  health: number;
  ballast: number;
  hold: Array<{ itemType: number; quantity: number }>;
  /** Being piloted (by whoever wrote it), and when that was last written (world ms) */
  riding?: boolean;
  rideAt?: number;
}

/** The record for `c`; `configuredCenter` is its planet's configured centre (local + it = the saved frame) */
export function craftToRecord(c: Craft, configuredCenter: THREE.Vector3, riding: boolean, nowMs: number): SavedSubmarine {
  const p = c.local.clone().add(configuredCenter);
  const q = c.orientation;
  return {
    key: c.key, hull: c.hull,
    position: { x: p.x, y: p.y, z: p.z },
    q: [q.x, q.y, q.z, q.w],
    health: c.health,
    ballast: c.ballast,
    hold: c.hold.map(s => ({ itemType: s.itemType, quantity: s.quantity })),
    ...(riding ? { riding: true, rideAt: nowMs } : {}),
  };
}

/** A craft from its record (null if the record is not a known hull or is malformed) - parked, at rest */
export function craftFromRecord(r: SavedSubmarine, body: string, configuredCenter: THREE.Vector3): Craft | null {
  const hull = hullOf(r.hull as ItemType);
  if (!hull || typeof r.key !== 'string' || !r.position || !Array.isArray(r.q) || r.q.length !== 4) return null;
  const nums = [r.position.x, r.position.y, r.position.z, ...r.q];
  if (!nums.every(Number.isFinite)) return null;
  const hold = emptySlots(hull.holdSlots);
  (r.hold ?? []).slice(0, hull.holdSlots).forEach((s, i) => {
    if (s && ITEM_DATA[s.itemType as ItemType] && s.quantity > 0) hold[i] = { itemType: s.itemType as ItemType, quantity: s.quantity };
  });
  return {
    key: r.key, body, hull: hull.item,
    local: new THREE.Vector3(r.position.x, r.position.y, r.position.z).sub(configuredCenter),
    velocity: new THREE.Vector3(),
    orientation: new THREE.Quaternion(r.q[0], r.q[1], r.q[2], r.q[3]).normalize(),
    ballast: Number.isFinite(r.ballast) ? Math.max(0, Math.min(1, r.ballast)) : SUBMARINE.PHYSICS.neutralBallast,
    throttle: 0,
    health: Number.isFinite(r.health) ? Math.max(0, Math.min(hull.maxHealth, r.health)) : hull.maxHealth,
    hold,
    owed: 0,
  };
}

/**
 * Someone else is piloting it (their record says so and is fresh). A stale
 * claim - the pilot's game closed mid-dive - does not hold: a reload parks
 * the craft where it was, it never straps anyone back in.
 */
export function pilotedByOther(r: Pick<SavedSubmarine, 'riding' | 'rideAt'>, nowMs: number): boolean {
  return !!r.riding && typeof r.rideAt === 'number' && nowMs - r.rideAt < SUBMARINE.RIDE_STALE_S * 1000;
}

// ---- the gas-giant diver: released from a skimming rocket's cargo, docked back

/** The diver hull in a rocket's cargo it could release (deepest-rated first), or null */
export function diverInCargo(cargo: InventorySlot[] | null): HullSpec | null {
  let best: HullSpec | null = null;
  for (const s of cargo ?? []) {
    const h = s.quantity > 0 ? hullOf(s.itemType) : null;
    if (h?.gas && (!best || h.crushDepthM > best.crushDepthM)) best = h;
  }
  return best;
}

/**
 * Dock a diver back into its rocket: everything in its hold goes into the
 * cargo (the diver item itself never left it - see releaseDiver). Refused
 * (nothing moved) when it all does not fit. Returns what moved.
 */
export function dockDiver(cargo: InventorySlot[], diver: Craft): { ok: boolean; moved: Array<{ item: ItemType; count: number }> } {
  const trial = cargo.map(s => ({ ...s }));
  const store = slotStore(trial);
  const moved: Array<{ item: ItemType; count: number }> = [];
  for (const s of diver.hold) {
    if (s.itemType === ItemType.NONE || s.quantity <= 0) continue;
    if (store.addItem(s.itemType, s.quantity) > 0) return { ok: false, moved: [] };
    moved.push({ item: s.itemType, count: s.quantity });
  }
  trial.forEach((s, i) => { cargo[i].itemType = s.itemType; cargo[i].quantity = s.quantity; });
  for (const s of diver.hold) { s.itemType = ItemType.NONE; s.quantity = 0; }
  return { ok: true, moved };
}

/** A diver at `local` is close enough to its rocket (at `rocketLocal`, the same giant's frame) to dock */
export function withinDock(local: THREE.Vector3, rocketLocal: THREE.Vector3): boolean {
  return local.distanceTo(rocketLocal) <= SUBMARINE.DIVER.dockRadiusM;
}

/** A diver lost in the deep: its hull leaves the rocket's cargo for good */
export function loseDiver(cargo: InventorySlot[], hull: ItemType): boolean {
  return slotStore(cargo).removeItem(hull, 1) === 1;
}

/** Medium of a sea: depth below the water surface over `local`, its seabed, water's density */
export function seaMedium(bodyId: string, gravity: number,
  waterSurfaceR: (local: THREE.Vector3) => number, seabedR: (local: THREE.Vector3) => number): FluidMedium {
  return {
    bodyId, gravity, density: 1,
    depthAt: (l) => {
      const surface = waterSurfaceR(l);
      // A column with no water: as far above the fluid as it is above the ground
      return surface < 0 ? -Math.max(0, l.length() - seabedR(l)) - SUBMARINE.PHYSICS.hullHeightM : surface - l.length();
    },
    floorAt: seabedR,
  };
}

/** Medium of a gas giant: depth below its cloud tops (its radius), no floor */
export function gasMedium(bodyId: string, radius: number, gravity: number, density: number): FluidMedium {
  return { bodyId, gravity, density, depthAt: (l) => radius - l.length(), floorAt: () => -Infinity };
}
