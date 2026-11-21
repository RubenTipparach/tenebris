// Rocket performance: the one place a rocket's numbers come from.
//
// A rocket's mass, thrust, fuel flow, delta-v and cargo space are summed from
// its parts (ROCKET_CONFIG.PARTS). The flight physics (RocketController), the
// launch pad readout (LaunchPadUI) and scripts/rocket-tech-report.ts all read
// them from here, and the gravity / damping helpers below are the ones the
// flight physics integrates with - so a delta-v the pad shows is the delta-v
// the rocket flies.
//
// No three.js here: the report script runs this file under plain node.

import { ItemType, ITEM_DATA, InventorySlot } from '../player/Inventory';
import { ROCKET_CONFIG, GRAVITY_WELL, RocketPartStats } from '../config/RocketConfig';
import { PlayerConfig } from '../config/PlayerConfig';

export interface RocketStats {
  dryMass: number;          // kg, empty tanks (cargo included)
  fuelCapacity: number;     // fuel units
  wetMass: number;          // kg, full tanks
  thrust: number;           // N, all engines
  fuelFlow: number;         // fuel units / s at full throttle (derived from Isp)
  exhaustVelocity: number;  // m/s, thrust / mass flow
  deltaV: number;           // m/s with full tanks (Tsiolkovsky)
  cargoSlots: number;
  tier: number;             // highest part tier in the stack
}

export function partStats(itemType: ItemType): RocketPartStats | undefined {
  return ROCKET_CONFIG.PARTS[itemType];
}

/** Mass of the items in a cargo hold, kg */
export function cargoMass(cargo: readonly InventorySlot[] | null | undefined): number {
  if (!cargo) return 0;
  let n = 0;
  for (const slot of cargo) if (slot.itemType !== ItemType.NONE) n += slot.quantity;
  return n * ROCKET_CONFIG.CARGO.massPerItem;
}

/** Sum a stack of parts (bottom to top) into the rocket's numbers. */
export function computeRocketStats(itemTypes: readonly ItemType[], extraDryMass = 0): RocketStats {
  const g0 = ROCKET_CONFIG.PHYSICS.gravityConstant;
  let dryMass = extraDryMass, fuelCapacity = 0, thrust = 0, massFlow = 0, cargoSlots = 0, tier = 0;
  for (const itemType of itemTypes) {
    const s = partStats(itemType);
    if (!s) continue;
    dryMass += s.dryMass;
    fuelCapacity += s.fuelCapacity ?? 0;
    cargoSlots += s.cargoSlots ?? 0;
    tier = Math.max(tier, s.tier);
    if (s.thrust && s.specificImpulse) {
      thrust += s.thrust;
      massFlow += s.thrust / (s.specificImpulse * g0);
    }
  }
  const wetMass = dryMass + fuelCapacity * ROCKET_CONFIG.FUEL_KG_PER_UNIT;
  const exhaustVelocity = massFlow > 0 ? thrust / massFlow : 0;
  const fuelFlow = massFlow / ROCKET_CONFIG.FUEL_KG_PER_UNIT;
  const deltaV = dryMass > 0 ? exhaustVelocity * Math.log(wetMass / dryMass) : 0;
  return { dryMass, fuelCapacity, wetMass, thrust, fuelFlow, exhaustVelocity, deltaV, cargoSlots, tier };
}

/** Delta-v left with `fuelUnits` in the tanks */
export function deltaVWith(stats: RocketStats, fuelUnits: number): number {
  if (stats.dryMass <= 0 || stats.exhaustVelocity <= 0) return 0;
  return stats.exhaustVelocity * Math.log((stats.dryMass + fuelUnits * ROCKET_CONFIG.FUEL_KG_PER_UNIT) / stats.dryMass);
}

/** Cargo hold slots a stack provides */
export function cargoSlotsFor(itemTypes: readonly ItemType[]): number {
  return computeRocketStats(itemTypes).cargoSlots;
}

/** How deep in a body's gravity well a distance from its centre is: 1 = full, 0 = none */
export function gravityWellMultiplier(distance: number, radius: number): number {
  const n = distance / radius;
  if (n <= GRAVITY_WELL.FULL_RADIUS_MULT) return 1;
  if (n >= GRAVITY_WELL.FALLOFF_RADIUS_MULT) return 0;
  return 1 - (n - GRAVITY_WELL.FULL_RADIUS_MULT) / (GRAVITY_WELL.FALLOFF_RADIUS_MULT - GRAVITY_WELL.FULL_RADIUS_MULT);
}

/** Gravity a rocket feels at `distance` from a body's centre, m/s^2 */
export function gravityAccel(distance: number, radius: number, strength: number): number {
  return PlayerConfig.BASE_GRAVITY * strength * gravityWellMultiplier(distance, radius);
}

/** Per-step damping factor: `perFrame` at the reference rate, scaled to dt */
export function dampingFactor(perFrame: number, dt: number): number {
  return Math.pow(perFrame, dt * ROCKET_CONFIG.PHYSICS.dampingReferenceFps);
}

/** Thrust-to-weight on a body's surface (full gravity), with `fuelUnits` aboard */
export function surfaceTWR(stats: RocketStats, gravityStrength: number, fuelUnits = stats.fuelCapacity): number {
  const weight = (stats.dryMass + fuelUnits * ROCKET_CONFIG.FUEL_KG_PER_UNIT) * PlayerConfig.BASE_GRAVITY * gravityStrength;
  return weight > 0 ? stats.thrust / weight : Infinity;
}

/** A body for simulateTransfer: where it is and how it pulls */
export interface TransferBody {
  name: string;
  center: { x: number; y: number; z: number };
  radius: number;          // the body's radius (gravity well scale)
  surfaceRadius: number;   // ground level, from the centre
  gravity: number;         // strength (1 = Earth)
}

export interface TransferResult {
  landed: boolean;         // touched down slower than the safe landing speed
  fuelUsed: number;        // fuel units
  deltaVUsed: number;      // m/s of thrust actually spent
  impactSpeed: number;
  seconds: number;
}

/**
 * Fly a rocket from one body's surface to another's along the line between
 * their centres, with the flight physics' own gravity wells and damping,
 * flown by a careful pilot: full throttle until a coast would carry it into
 * the target's gravity well, coast, then a landing burn that holds the
 * descent to a safe speed. What it spends is what the trip costs at best -
 * a hand-flown trip costs more.
 */
// The simulated pilot's landing: brake on a profile that uses this share of
// the engine's spare deceleration, steering back onto it with this gain
const LANDING_BRAKE_MARGIN = 0.5;
const LANDING_GAIN = 2;
const LANDING_MIN_BRAKE = 0.5;
const LANDING_SAFE_SHARE = 0.5;  // touchdown target: this share of the damage threshold   // m/s^2: a weak engine still gets a gentle profile

export function simulateTransfer(stats: RocketStats, from: TransferBody, to: TransferBody, fuelUnits = stats.fuelCapacity): TransferResult {
  const dt = 1 / ROCKET_CONFIG.PHYSICS.dampingReferenceFps;
  const damp = dampingFactor(ROCKET_CONFIG.PHYSICS.linearDamping, dt);
  const span = Math.hypot(to.center.x - from.center.x, to.center.y - from.center.y, to.center.z - from.center.z);
  const safe = ROCKET_CONFIG.HEALTH.impactDamageThreshold * LANDING_SAFE_SHARE;
  const targetWell = to.radius * GRAVITY_WELL.FALLOFF_RADIUS_MULT;
  // A coast must carry the rocket into the target's full gravity (at the
  // well's edge the pull is ~0 and damping would stall it there)
  const targetFull = to.radius * GRAVITY_WELL.FULL_RADIUS_MULT;
  // Signed pull along the line (+ toward the target) at distance s from `from`
  const pull = (s: number): number => {
    const dFrom = Math.abs(s), dTo = Math.abs(span - s);
    return dFrom < dTo ? -gravityAccel(dFrom, from.radius, from.gravity) * Math.sign(s || 1)
      : gravityAccel(dTo, to.radius, to.gravity) * Math.sign(span - s);
  };
  let s = from.surfaceRadius + ROCKET_CONFIG.THRESHOLDS.groundedCheckDistance;
  let v = 0, fuel = fuelUnits, dvUsed = 0, t = 0;
  let phase: 'burn' | 'coast' = 'burn';
  const maxT = 1200;
  while (t < maxT) {
    const mass = stats.dryMass + fuel * ROCKET_CONFIG.FUEL_KG_PER_UNIT;
    let throttle = 0, dir = 1;
    if (span - s > targetFull) {
      // Until inside the target's full gravity: would a coast from here get there?
      let ss = s, vv = v, reaches = false;
      for (let i = 0; i < 60 / dt && vv > 0; i++) {
        vv = (vv + pull(ss) * dt) * damp;
        ss += vv * dt;
        if (span - ss < targetFull) { reaches = true; break; }
      }
      phase = reaches ? 'coast' : 'burn';
      if (!reaches) throttle = 1;
    }
    if (phase === 'coast' && span - s < targetWell) {
      // Suicide-burn style landing (engine toward the target): fall freely
      // until the speed nears what the engine can still stop in the height
      // left, then hold the descent on that profile down to a safe touchdown
      const g = Math.abs(pull(s));
      const brake = Math.max(LANDING_MIN_BRAKE, stats.thrust / mass - g);
      const alt = Math.max(0, span - s - to.surfaceRadius);
      const allowed = safe + Math.sqrt(2 * brake * LANDING_BRAKE_MARGIN * alt);
      if (v > allowed) {
        dir = -1;
        throttle = Math.min(1, Math.max(0, (v - allowed) * LANDING_GAIN + (g * mass) / stats.thrust));
      }
    }
    if (fuel <= 0) throttle = 0;
    const a = stats.thrust > 0 ? throttle * stats.thrust / mass : 0;
    v = (v + (pull(s) + dir * a) * dt) * damp;
    fuel = Math.max(0, fuel - throttle * stats.fuelFlow * dt);
    dvUsed += a * dt;
    s += v * dt;
    t += dt;
    if (span - s <= to.surfaceRadius) {
      return { landed: v < ROCKET_CONFIG.HEALTH.impactDamageThreshold, fuelUsed: fuelUnits - fuel, deltaVUsed: dvUsed, impactSpeed: v, seconds: t };
    }
    if (s < from.surfaceRadius && t > 1) break; // fell back
  }
  return { landed: false, fuelUsed: fuelUnits - fuel, deltaVUsed: dvUsed, impactSpeed: Math.abs(v), seconds: t };
}

/**
 * Pack a cargo hold's items into its first `slots` slots (so the hold can
 * shrink). False, and the hold untouched, if they don't fit.
 */
export function compactCargo(cargo: InventorySlot[], slots: number): boolean {
  const items = cargo.filter(s => s.itemType !== ItemType.NONE && s.quantity > 0);
  if (items.length > slots) return false;
  const copies = items.map(s => ({ ...s }));
  for (let i = 0; i < cargo.length; i++) {
    const c = copies[i];
    cargo[i] = c ? c : { itemType: ItemType.NONE, quantity: 0 };
  }
  return true;
}

/** Item types of a stack, for the helpers above */
export function stackItemTypes(parts: readonly { itemType: ItemType }[]): ItemType[] {
  return parts.map(p => p.itemType).filter(t => !!ITEM_DATA[t]?.rocketPart);
}

/** Somewhere items can be counted, taken and put back (the inventory, a cargo hold) */
export interface ItemStore {
  getItemCount(itemType: ItemType): number;
  removeItem(itemType: ItemType, quantity: number): number;
  addItem(itemType: ItemType, quantity: number): number;   // returns what didn't fit
}

/** A bare slot array (a cargo hold) as an ItemStore */
export function slotStore(slots: InventorySlot[]): ItemStore {
  return {
    getItemCount: (t) => slots.reduce((n, s) => n + (s.itemType === t ? s.quantity : 0), 0),
    removeItem: (t, q) => {
      let left = q;
      for (let i = slots.length - 1; i >= 0 && left > 0; i--) {
        const s = slots[i];
        if (s.itemType !== t) continue;
        const take = Math.min(left, s.quantity);
        s.quantity -= take;
        left -= take;
        if (s.quantity <= 0) { s.itemType = ItemType.NONE; s.quantity = 0; }
      }
      return q - left;
    },
    addItem: (t, q) => {
      const stack = ITEM_DATA[t].stackSize;
      let left = q;
      for (const s of slots) {
        if (left <= 0) break;
        if (s.itemType === t && s.quantity < stack) {
          const add = Math.min(left, stack - s.quantity);
          s.quantity += add;
          left -= add;
        }
      }
      for (const s of slots) {
        if (left <= 0) break;
        if (s.itemType === ItemType.NONE) {
          const add = Math.min(left, stack);
          s.itemType = t;
          s.quantity = add;
          left -= add;
        }
      }
      return left;
    },
  };
}

export interface FuelDraw {
  supplied: number;                               // fuel units
  used: { itemType: ItemType; count: number }[];  // what was burned
}

/**
 * Burn fuel items for `wanted` units, from the stores in order (the cargo
 * hold, then the player's inventory). Whole items only: the big-yield items
 * cover what they can without overshooting, then the smallest item that
 * fills the rest tops it up (wasting at most part of one item). An emptied
 * item's container (a water bucket's bucket) goes back to the store it came
 * from, or the next one with room.
 */
export function drawFuel(wanted: number, stores: ItemStore[]): FuelDraw {
  const sources = [...ROCKET_CONFIG.FUEL_SOURCES].sort((a, b) => b.units - a.units);
  const used = new Map<ItemType, number>();
  let supplied = 0;
  const take = (src: typeof sources[0], n: number): number => {
    let got = 0;
    for (const store of stores) {
      if (got >= n) break;
      const removed = store.removeItem(src.itemType, Math.min(n - got, store.getItemCount(src.itemType)));
      if (removed > 0 && src.returns !== undefined) {
        let back = store.addItem(src.returns, removed);
        for (const other of stores) if (back > 0 && other !== store) back = other.addItem(src.returns, back);
      }
      got += removed;
    }
    if (got > 0) {
      used.set(src.itemType, (used.get(src.itemType) ?? 0) + got);
      supplied += got * src.units;
    }
    return got;
  };
  const have = (t: ItemType) => stores.reduce((n, s) => n + s.getItemCount(t), 0);
  // Whole items that don't overshoot, biggest first
  for (const src of sources) {
    const n = Math.floor((wanted - supplied) / src.units);
    if (n > 0) take(src, n);
  }
  // Top up with the smallest item that covers the rest, else the biggest left
  if (supplied < wanted) {
    const rest = wanted - supplied;
    const covering = [...sources].reverse().find(s => s.units >= rest && have(s.itemType) > 0);
    const any = sources.find(s => have(s.itemType) > 0);
    const pick = covering ?? any;
    if (pick) take(pick, 1);
    // Still short (only small items left): keep burning them
    for (const src of sources) {
      while (supplied < wanted && have(src.itemType) > 0) take(src, 1);
    }
  }
  return { supplied: Math.min(wanted, supplied), used: [...used].map(([itemType, count]) => ({ itemType, count })) };
}
