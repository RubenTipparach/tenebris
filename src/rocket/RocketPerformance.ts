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
import { POWER_CONFIG } from '../config/PowerConfig';

export interface RocketStats {
  dryMass: number;          // kg, empty tanks (cargo included)
  fuelCapacity: number;     // fuel units
  wetMass: number;          // kg, full tanks
  thrust: number;           // N, all engines
  fuelFlow: number;         // fuel units / s at full throttle (derived from Isp)
  exhaustVelocity: number;  // m/s, thrust / mass flow
  deltaV: number;           // m/s with full tanks (Tsiolkovsky)
  cargoSlots: number;
  batteryWh: number;        // charge the stack stores (command module cell + battery packs)
  powerDrawW: number;       // what it draws in flight (the command module)
  solarW: number;           // what its solar arrays charge in full sun
  tier: number;             // highest part tier in the stack
  problems: string[];       // why a part can't work (an ion drive with no reactor core)
  mode: EngineMode;         // the engine mode these numbers are for (null = all engines)
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

/**
 * Engine modes (design 6b): a stack with more than one engine type can fire
 * one type at a time - lift on the chemical engine, cruise on the ion drive -
 * or all of them together. `null` is "All". A stack with one engine type has
 * only All.
 */
export type EngineMode = ItemType | null;

/** The engine types in a stack, bottom to top, each once. */
export function engineTypes(itemTypes: readonly ItemType[]): ItemType[] {
  const out: ItemType[] = [];
  for (const t of itemTypes) {
    const s = partStats(t);
    if (s?.thrust && s.specificImpulse && !out.includes(t)) out.push(t);
  }
  return out;
}

/** The modes a stack can fly in: All, then each engine type (just All for one type). */
export function engineModes(itemTypes: readonly ItemType[]): EngineMode[] {
  const types = engineTypes(itemTypes);
  return types.length > 1 ? [null, ...types] : [null];
}

/** A mode that is still valid for this stack (a part removed falls back to All). */
export function validEngineMode(itemTypes: readonly ItemType[], mode: EngineMode | undefined): EngineMode {
  return mode != null && engineModes(itemTypes).includes(mode) ? mode : null;
}

/** The mode after `mode` in the cycle. */
export function nextEngineMode(itemTypes: readonly ItemType[], mode: EngineMode): EngineMode {
  const modes = engineModes(itemTypes);
  const i = modes.indexOf(validEngineMode(itemTypes, mode));
  return modes[(i + 1) % modes.length];
}

/** What the HUD calls a mode. */
export function engineModeLabel(mode: EngineMode): string {
  return mode == null ? 'All engines' : ITEM_DATA[mode]?.name ?? 'Engine';
}

/**
 * Sum a stack of parts (bottom to top) into the rocket's numbers. With a
 * `mode`, only engines of that type fire (thrust and fuel flow); mass,
 * tanks and cargo are the whole stack's either way.
 */
export function computeRocketStats(itemTypes: readonly ItemType[], extraDryMass = 0, mode: EngineMode = null): RocketStats {
  const firing = validEngineMode(itemTypes, mode);
  const g0 = ROCKET_CONFIG.PHYSICS.gravityConstant;
  let dryMass = extraDryMass, fuelCapacity = 0, thrust = 0, massFlow = 0, cargoSlots = 0, tier = 0, batteryWh = 0, powerDrawW = 0, solarW = 0;
  const problems: string[] = [];
  for (const itemType of itemTypes) {
    const s = partStats(itemType);
    if (!s) continue;
    dryMass += s.dryMass;
    fuelCapacity += s.fuelCapacity ?? 0;
    cargoSlots += s.cargoSlots ?? 0;
    batteryWh += s.batteryWh ?? 0;
    powerDrawW += s.powerDrawW ?? 0;
    solarW += s.solarW ?? 0;
    tier = Math.max(tier, s.tier);
    const missing = (s.requires ?? []).filter(r => !itemTypes.includes(r));
    if (missing.length) {
      const msg = `${ITEM_DATA[itemType]?.name ?? 'Part'} needs a ${missing.map(r => ITEM_DATA[r]?.name ?? 'part').join(' and a ')}`;
      if (!problems.includes(msg)) problems.push(msg);
      continue;  // a part that can't work gives no thrust
    }
    if (s.thrust && s.specificImpulse && (firing == null || itemType === firing)) {
      thrust += s.thrust;
      massFlow += s.thrust / (s.specificImpulse * g0);
    }
  }
  const wetMass = dryMass + fuelCapacity * ROCKET_CONFIG.FUEL_KG_PER_UNIT;
  const exhaustVelocity = massFlow > 0 ? thrust / massFlow : 0;
  const fuelFlow = massFlow / ROCKET_CONFIG.FUEL_KG_PER_UNIT;
  const deltaV = dryMass > 0 ? exhaustVelocity * Math.log(wetMass / dryMass) : 0;
  return { dryMass, fuelCapacity, wetMass, thrust, fuelFlow, exhaustVelocity, deltaV, cargoSlots, batteryWh, powerDrawW, solarW, tier, problems, mode: firing };
}

// ---- Power, re-entry heat and the parachute (openspec wool-air-and-reentry) ----

/** Charge after drawing `drawW` for `dt` seconds (never below 0) */
export function drainCharge(chargeWh: number, drawW: number, dt: number): number {
  return Math.max(0, chargeWh - (drawW * dt) / 3600);
}

/** Seconds of flight a charge gives at `drawW` (Infinity with no draw) */
export function chargeSecondsLeft(chargeWh: number, drawW: number): number {
  return drawW > 0 ? (chargeWh * 3600) / drawW : Infinity;
}

/** Thrust the engines give: none when the battery is flat */
export function poweredThrust(thrust: number, chargeWh: number): number {
  return chargeWh > 0 ? thrust : 0;
}

/** Wh one swapped-in battery adds (ROCKET_CONFIG.POWER.SWAP_ITEM, as POWER_CONFIG stores it) */
export function swapBatteryWh(): number {
  return POWER_CONFIG.BATTERIES[ROCKET_CONFIG.POWER.SWAP_ITEM]?.capacityWh ?? 0;
}

/** Charge after adding `addWh`, up to the stack's capacity */
export function addCharge(chargeWh: number, capacityWh: number, addWh: number): number {
  return Math.min(capacityWh, Math.max(0, chargeWh) + addWh);
}

type V3 = { x: number; y: number; z: number };

/**
 * Is a point in sunlight (design 6): the straight line from it to the sun
 * misses every body (each a sphere of `radius` round `center`).
 */
export function inSunlight(pos: V3, sun: V3, bodies: readonly { center: V3; radius: number }[]): boolean {
  const dx = sun.x - pos.x, dy = sun.y - pos.y, dz = sun.z - pos.z;
  const len2 = dx * dx + dy * dy + dz * dz;
  if (len2 === 0) return true;
  for (const b of bodies) {
    // nearest point of the segment to the body's centre
    const t = Math.max(0, Math.min(1, ((b.center.x - pos.x) * dx + (b.center.y - pos.y) * dy + (b.center.z - pos.z) * dz) / len2));
    const cx = pos.x + dx * t - b.center.x, cy = pos.y + dy * t - b.center.y, cz = pos.z + dz * t - b.center.z;
    if (cx * cx + cy * cy + cz * cz < b.radius * b.radius) return false;
  }
  return true;
}

/** Charge after `dt` s of solar arrays giving `solarW` (in sunlight), up to capacity */
export function solarCharge(chargeWh: number, capacityWh: number, solarW: number, sunlit: boolean, dt: number): number {
  return sunlit ? addCharge(chargeWh, capacityWh, (solarW * dt) / 3600) : chargeWh;
}

/** Inside a body's air (for heat and the parachute): within REENTRY.shellRadiusMult of its radius */
export function inAtmosphereShell(distance: number, radius: number, hasAtmosphere: boolean): boolean {
  return hasAtmosphere && distance < radius * ROCKET_CONFIG.REENTRY.shellRadiusMult;
}

export interface ReentryState {
  heat: number;              // 0..maxHeat
  leftAtmosphere: boolean;   // been outside every atmosphere since launch
}

/**
 * One step of re-entry heat: a flight that has left every atmosphere and is
 * back inside one heats while faster than safeSpeed, and cools otherwise.
 * Returns the new state and whether it is re-entering.
 */
export function reentryStep(state: ReentryState, inAtmosphere: boolean, speed: number, dt: number): ReentryState & { reentering: boolean } {
  const cfg = ROCKET_CONFIG.REENTRY;
  const leftAtmosphere = state.leftAtmosphere || !inAtmosphere;
  const reentering = leftAtmosphere && inAtmosphere;
  const heat = reentering && speed > cfg.safeSpeed
    ? Math.min(cfg.maxHeat, state.heat + (speed - cfg.safeSpeed) * cfg.heatPerMs * dt)
    : Math.max(0, state.heat - cfg.coolPerS * dt);
  return { heat, leftAtmosphere, reentering };
}

/** Health heat takes off in `dt` (0 at or under damageFrom, damagePerS at maxHeat) */
export function heatDamage(heat: number, dt: number): number {
  const cfg = ROCKET_CONFIG.REENTRY;
  if (heat <= cfg.damageFrom) return 0;
  return cfg.damagePerS * ((heat - cfg.damageFrom) / (cfg.maxHeat - cfg.damageFrom)) * dt;
}

export type ChuteOpen = 'open' | 'noChute' | 'noAir' | 'torn';

/** What happens when the parachute is asked to open */
export function tryOpenChute(hasChute: boolean, inAtmosphere: boolean, speed: number): ChuteOpen {
  if (!hasChute) return 'noChute';
  if (!inAtmosphere) return 'noAir';
  if (speed > ROCKET_CONFIG.PARACHUTE.maxOpenSpeed) return 'torn';
  return 'open';
}

/**
 * Descent speed (m/s, + = falling) under an open chute, given the speed after
 * this step's gravity (`g` m/s^2 of it): over terminalVelocity the excess
 * bleeds at dragRate and the chute also holds this step's gravity, so it
 * settles on terminalVelocity exactly; under it, it falls freely.
 */
export function chuteDescentSpeed(fallSpeed: number, g: number, dt: number): number {
  const cfg = ROCKET_CONFIG.PARACHUTE;
  const t = cfg.terminalVelocity;
  if (fallSpeed <= t) return fallSpeed;
  return Math.max(t, t + (fallSpeed - t) * Math.exp(-cfg.dragRate * dt) - g * dt);
}

/** Sideways speed kept per step under an open chute */
export function chuteSideFactor(dt: number): number {
  return Math.exp(-ROCKET_CONFIG.PARACHUTE.dragRate * dt);
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

/**
 * A flight profile for a multi-engine rocket (design 6b): `lift` fires inside
 * either body's gravity well (take-off and landing need thrust), `cruise`
 * between them (efficiency). Both are the same stack in different modes, so
 * they share mass and tanks.
 */
export interface FlightProfile {
  lift: RocketStats;
  cruise: RocketStats;
}

/** The lift (most thrust) and cruise (best exhaust velocity) modes of a stack, or null with one engine type */
export function liftCruiseProfile(itemTypes: readonly ItemType[], extraDryMass = 0): FlightProfile | null {
  const types = engineTypes(itemTypes);
  if (types.length < 2) return null;
  const each = types.map(t => computeRocketStats(itemTypes, extraDryMass, t)).filter(s => s.thrust > 0);
  if (each.length < 2) return null;
  const lift = each.reduce((a, b) => (b.thrust > a.thrust ? b : a));
  const cruise = each.reduce((a, b) => (b.exhaustVelocity > a.exhaustVelocity ? b : a));
  return { lift, cruise };
}

// The simulated pilot gives up after this long (s). A low-thrust (ion)
// cruise outlasts it; scripts/rocket-tech-report.ts estimates those
export const TRANSFER_MAX_S = 1200;

export function simulateTransfer(stats: RocketStats | FlightProfile, from: TransferBody, to: TransferBody, fuelUnits?: number): TransferResult {
  const profile: FlightProfile = 'lift' in stats ? stats : { lift: stats, cruise: stats };
  const base = profile.lift;
  if (fuelUnits === undefined) fuelUnits = base.fuelCapacity;
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
  const fromWell = from.radius * GRAVITY_WELL.FALLOFF_RADIUS_MULT;
  while (t < TRANSFER_MAX_S) {
    // Lift engines inside a gravity well, cruise engines between
    const stats = s < fromWell || span - s < targetWell ? profile.lift : profile.cruise;
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
