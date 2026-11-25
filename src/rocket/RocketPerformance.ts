// Rocket performance: the one place a rocket's numbers come from.
//
// A rocket's mass, thrust, fuel flow, delta-v and cargo space are summed from
// its parts (ROCKET_CONFIG.PARTS) and what its equipment slots hold
// (ROCKET_CONFIG.EQUIPMENT). The flight physics (RocketController), the
// launch pad readout (LaunchPadUI) and scripts/rocket-tech-report.ts all read
// them from here, and the gravity / damping helpers below are the ones the
// flight physics integrates with - so a delta-v the pad shows is the delta-v
// the rocket flies.
//
// No three.js here: the report script runs this file under plain node.

import { ItemType, ITEM_DATA, InventorySlot, RocketPartType } from '../player/Inventory';
import { ROCKET_CONFIG, GRAVITY_WELL, RocketPartStats, RocketEquipmentStats } from '../config/RocketConfig';
import { PlayerConfig } from '../config/PlayerConfig';
import { POWER_CONFIG } from '../config/PowerConfig';

export interface RocketStats {
  dryMass: number;          // kg, empty tanks (cargo and equipment included)
  fuelCapacity: number;     // fuel units
  wetMass: number;          // kg, full tanks
  thrust: number;           // N, all engines
  fuelFlow: number;         // fuel units / s at full throttle (derived from Isp)
  exhaustVelocity: number;  // m/s, thrust / mass flow
  deltaV: number;           // m/s with full tanks (Tsiolkovsky)
  cargoSlots: number;
  equipmentSlots: number;   // slots for ROCKET_CONFIG.EQUIPMENT items
  batteryWh: number;        // charge it stores (command module cell + equipped battery packs)
  powerDrawW: number;       // what it draws in flight (the command module)
  solarW: number;           // what its equipped solar arrays charge in full sun
  chutes: number;           // parachutes fitted (each opens once)
  cooling: number;          // share of heat gained its radiators shed (0..1)
  rtgW: number;             // charge its RTGs give at all times
  chuteBrake: number;       // how much harder its chute brakes (1 = a plain chute; a drogue more)
  drones: number;           // survey drones aboard
  tier: number;             // highest part tier in the stack
  problems: string[];       // why a part can't work (an ion drive with no reactor core)
  mode: EngineMode;         // the engine mode these numbers are for (null = all engines)
}

export function partStats(itemType: ItemType): RocketPartStats | undefined {
  return ROCKET_CONFIG.PARTS[itemType];
}

/** What one equipment item gives, or undefined if the item is not equipment */
export function equipmentStats(itemType: ItemType): RocketEquipmentStats | undefined {
  return ROCKET_CONFIG.EQUIPMENT[itemType];
}

/** Can this item go in a rocket's equipment slots? */
export function isEquipment(itemType: ItemType): boolean {
  return !!equipmentStats(itemType);
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
 * Sum a stack of parts (bottom to top) and its equipment slots into the
 * rocket's numbers. With a `mode`, only engines of that type fire (thrust and
 * fuel flow); mass, tanks, cargo and equipment are the whole rocket's either
 * way. `extraDryMass` is what the cargo hold carries (cargoMass).
 */
/**
 * The stack's frame (ROCKET_CONFIG.STACK_LEVEL_KG): the k-th part from the
 * bottom adds (k - 1) levels of it, so a tall stack is much heavier than
 * its parts alone - a short one barely changes.
 */
export function stackStructureKg(partCount: number): number {
  return ROCKET_CONFIG.STACK_LEVEL_KG * partCount * (partCount - 1) / 2;
}

export function computeRocketStats(
  itemTypes: readonly ItemType[],
  extraDryMass = 0,
  mode: EngineMode = null,
  equipment: readonly InventorySlot[] | null = null,
): RocketStats {
  const firing = validEngineMode(itemTypes, mode);
  const g0 = ROCKET_CONFIG.PHYSICS.gravityConstant;
  // a taller stack needs a heavier frame: each part carries the ones above it
  let dryMass = extraDryMass + stackStructureKg(itemTypes.length), fuelCapacity = 0, thrust = 0, massFlow = 0, cargoSlots = 0, equipmentSlots = 0, tier = 0, batteryWh = 0, powerDrawW = 0, solarW = 0, chutes = 0;
  let keepHeat = 1, rtgW = 0, chuteBrake = 1, drones = 0;
  for (const slot of equipment ?? []) {
    const e = equipmentStats(slot.itemType);
    if (!e || slot.quantity <= 0) continue;
    dryMass += e.mass * slot.quantity;
    batteryWh += (e.batteryWh ?? 0) * slot.quantity;
    solarW += (e.solarW ?? 0) * slot.quantity;
    chutes += (e.chutes ?? 0) * slot.quantity;
    keepHeat *= Math.pow(1 - (e.cooling ?? 0), slot.quantity);
    rtgW += (e.rtgW ?? 0) * slot.quantity;
    chuteBrake = Math.max(chuteBrake, e.chuteBrake ?? 1);
    if (e.drone) drones += slot.quantity;
  }
  // What each part counts as for `requires` (itself, and what it provides)
  const present = new Set<ItemType>(itemTypes);
  for (const t of itemTypes) { const p = partStats(t)?.provides; if (p !== undefined) present.add(p); }
  const problems: string[] = [];
  for (const itemType of itemTypes) {
    const s = partStats(itemType);
    if (!s) continue;
    dryMass += s.dryMass;
    fuelCapacity += s.fuelCapacity ?? 0;
    cargoSlots += s.cargoSlots ?? 0;
    equipmentSlots += s.equipmentSlots ?? 0;
    batteryWh += s.batteryWh ?? 0;
    powerDrawW += s.powerDrawW ?? 0;
    tier = Math.max(tier, s.tier);
    const missing = (s.requires ?? []).filter(r => !present.has(r));
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
  return { dryMass, fuelCapacity, wetMass, thrust, fuelFlow, exhaustVelocity, deltaV, cargoSlots, equipmentSlots, batteryWh, powerDrawW, solarW, chutes, cooling: 1 - keepHeat, rtgW, chuteBrake, drones, tier, problems, mode: firing };
}

// ---- Staging (openspec space-exploration, rocket-staging) ----

/**
 * What the firing engines of a stage need besides tank fuel (rocket-tiers):
 * the charge they draw (W) and the cargo items they use (per second), both
 * at full throttle, in the engine mode.
 */
export function engineNeeds(itemTypes: readonly ItemType[], mode: EngineMode = null): { drawW: number; consumes: Map<ItemType, number> } {
  const firing = validEngineMode(itemTypes, mode);
  let drawW = 0;
  const consumes = new Map<ItemType, number>();
  for (const t of itemTypes) {
    const s = partStats(t);
    if (!s?.thrust || (firing != null && t !== firing)) continue;
    drawW += s.firingDrawW ?? 0;
    for (const c of s.consumes ?? []) consumes.set(c.itemType, (consumes.get(c.itemType) ?? 0) + c.perS);
  }
  return { drawW, consumes };
}

/** Is this part a stage separator? */
export function isSeparator(itemType: ItemType): boolean {
  return ITEM_DATA[itemType]?.rocketPart?.partType === RocketPartType.SEPARATOR;
}

/**
 * A stack (bottom to top) split into stages at its separators, bottom stage
 * first. A separator belongs to the stage below it - it drops with that
 * stage. No separator: one stage, the whole stack.
 */
export function stagesOf<T>(parts: readonly T[], typeOf: (p: T) => ItemType): T[][] {
  const stages: T[][] = [[]];
  for (const p of parts) {
    stages[stages.length - 1].push(p);
    if (isSeparator(typeOf(p))) stages.push([]);
  }
  if (stages.length > 1 && stages[stages.length - 1].length === 0) stages.pop();
  return stages;
}

/** Which stage (1 = the bottom, the first to fire) the part at `index` of a stack is in */
export function stageOfPart(types: readonly ItemType[], index: number): number {
  let stage = 1;
  for (let i = 0; i < index && i < types.length; i++) if (isSeparator(types[i])) stage++;
  return stage;
}

const PART_KIND_LABEL: Record<RocketPartType, string> = {
  [RocketPartType.ENGINE]: 'Engine',
  [RocketPartType.FUEL_TANK]: 'Fuel tank',
  [RocketPartType.CAPSULE]: 'Command module',
  [RocketPartType.CARGO]: 'Cargo bay',
  [RocketPartType.SEPARATOR]: 'Stage separator',
};

/**
 * A rocket part's key numbers, one line each (ASCII), for its hover
 * tooltip: kind and tier, mass, thrust and Isp (engines), fuel (tanks),
 * cargo / equipment slots, charge, and how many stack slots it takes.
 * Empty for an item that is not a rocket part.
 */
export function partTooltipLines(itemType: ItemType): string[] {
  const part = ITEM_DATA[itemType]?.rocketPart;
  const s = partStats(itemType);
  if (!part || !s) return [];
  const lines = [`${PART_KIND_LABEL[part.partType] ?? 'Part'} - tier ${s.tier}`, `Mass ${s.dryMass} kg`];
  if (s.thrust) lines.push(`Thrust ${(s.thrust / 1000).toFixed(1)} kN, Isp ${s.specificImpulse ?? 0} s`);
  if (s.boosterOnly) lines.push('Booster - bottom stage only');
  if (s.requires?.length) lines.push(`Needs ${s.requires.map(t => ITEM_DATA[t]?.name ?? '?').join(', ')} in the stack`);
  if (s.fuelCapacity) lines.push(`Fuel ${s.fuelCapacity} units (${Math.round(s.fuelCapacity * ROCKET_CONFIG.FUEL_KG_PER_UNIT)} kg)`);
  if (s.cargoSlots) lines.push(`Cargo ${s.cargoSlots} slots`);
  if (s.equipmentSlots) lines.push(`Equipment ${s.equipmentSlots} slots`);
  if (s.batteryWh) lines.push(`Battery ${(s.batteryWh / 1000).toFixed(1)} kWh`);
  if (part.partType === RocketPartType.SEPARATOR) lines.push('Splits the stack - drops with the stage below');
  lines.push(`Takes ${part.heightUnits} stack slot${part.heightUnits === 1 ? '' : 's'}`);
  return lines;
}

export interface StageStats {
  fuelCapacity: number;     // this stage's tanks
  thrust: number;           // its engines (in the engine mode)
  fuelFlow: number;
  exhaustVelocity: number;
  deltaV: number;           // with full tanks, the stages above it as payload
}

/**
 * Each stage's numbers and the whole rocket's delta-v (their sum). Every
 * stage burns its own tanks carrying everything above it; the cargo and
 * equipment ride the top stage. A one-stage stack gives computeRocketStats's
 * delta-v exactly.
 */
export function stagedStats(
  itemTypes: readonly ItemType[],
  extraDryMass = 0,
  mode: EngineMode = null,
  equipment: readonly InventorySlot[] | null = null,
): { stages: StageStats[]; deltaV: number } {
  const groups = stagesOf(itemTypes, t => t);
  const kg = ROCKET_CONFIG.FUEL_KG_PER_UNIT;
  const parts = groups.map(g => computeRocketStats(g, 0, mode));
  // the frame's mass by each part's height in the whole stack (not in its own stage)
  let below = 0;
  groups.forEach((g, k) => {
    parts[k].dryMass += stackStructureKg(below + g.length) - stackStructureKg(below) - stackStructureKg(g.length);
    below += g.length;
  });
  // the payload's fixed mass (cargo, equipment) sits on top
  const extras = computeRocketStats([], extraDryMass, null, equipment).dryMass;
  const stages: StageStats[] = [];
  let total = 0;
  for (let k = 0; k < groups.length; k++) {
    let wet = extras;
    for (let j = k; j < groups.length; j++) wet += parts[j].dryMass + parts[j].fuelCapacity * kg;
    const dry = wet - parts[k].fuelCapacity * kg;
    const dv = dry > 0 && parts[k].exhaustVelocity > 0 ? parts[k].exhaustVelocity * Math.log(wet / dry) : 0;
    stages.push({ fuelCapacity: parts[k].fuelCapacity, thrust: parts[k].thrust, fuelFlow: parts[k].fuelFlow, exhaustVelocity: parts[k].exhaustVelocity, deltaV: dv });
    total += dv;
  }
  return { stages, deltaV: total };
}

/**
 * Delta-v left with `fuelUnits` aboard (filled into the stages bottom first,
 * fillStages): each stage burns its own fuel carrying everything above it.
 * One stage: deltaVWith's number. The pad readout and the flight HUD both
 * use this.
 */
export function stagedDeltaVWith(
  itemTypes: readonly ItemType[],
  extraDryMass: number,
  mode: EngineMode,
  equipment: readonly InventorySlot[] | null,
  fuelUnits: number,
): number {
  const groups = stagesOf(itemTypes, t => t);
  const parts = groups.map(g => computeRocketStats(g, 0, mode));
  const fuels = fillStages(fuelUnits, parts.map(p => p.fuelCapacity));
  const extras = computeRocketStats([], extraDryMass, null, equipment).dryMass;
  const kg = ROCKET_CONFIG.FUEL_KG_PER_UNIT;
  let dv = 0;
  for (let k = 0; k < groups.length; k++) {
    let wet = extras;
    for (let j = k; j < groups.length; j++) wet += parts[j].dryMass + fuels[j] * kg;
    const dry = wet - fuels[k] * kg;
    if (dry > 0 && parts[k].exhaustVelocity > 0) dv += parts[k].exhaustVelocity * Math.log(wet / dry);
  }
  return dv;
}

/**
 * Share a fuel total out over stages, the bottom (active) stage first, each
 * up to its capacity. Only the active stage burns and refuelling fills from
 * the bottom, so the total alone always gives the exact per-stage state.
 */
export function fillStages(total: number, capacities: readonly number[]): number[] {
  let left = Math.max(0, total);
  return capacities.map(cap => {
    const f = Math.min(cap, left);
    left -= f;
    return f;
  });
}

/**
 * Why a stack (bottom to top) can't fly, or [] if it can: an engine, a fuel
 * tank and a command module aboard, an engine at the bottom, every part's
 * needs met, each engine's own requirements, and with stages, an engine in
 * every stage. The one set of rules the launch pad, docking and refits all
 * use (rocket-refit).
 */
export function stackProblems(itemTypes: readonly ItemType[]): string[] {
  if (itemTypes.length === 0) return ['No rocket parts installed'];
  const errors: string[] = [];
  const typeOf = (t: ItemType) => ITEM_DATA[t]?.rocketPart?.partType;
  const engines = itemTypes.filter(t => typeOf(t) === RocketPartType.ENGINE);
  const tanks = itemTypes.filter(t => typeOf(t) === RocketPartType.FUEL_TANK);
  const capsules = itemTypes.filter(t => typeOf(t) === RocketPartType.CAPSULE);
  if (engines.length === 0) errors.push('Missing: Engine required');
  if (tanks.length === 0) errors.push('Missing: Fuel Tank required');
  if (capsules.length === 0) errors.push('Missing: Command Module required');
  if (engines.length > 0 && typeOf(itemTypes[0]) !== RocketPartType.ENGINE) errors.push('Engine must be at the bottom of the stack');
  // The launch tower's height: no taller stack, however it got its parts (pad or refit)
  if (itemTypes.length > ROCKET_CONFIG.MAX_STACK_PARTS) errors.push(`At most ${ROCKET_CONFIG.MAX_STACK_PARTS} parts in a stack`);
  // Parts that need another part aboard (an ion drive with no reactor core):
  // the same reasons the stats model gives, so the flight and this agree
  errors.push(...computeRocketStats(itemTypes).problems);
  for (const engine of engines) {
    const reqs = ITEM_DATA[engine]?.rocketPart?.engineRequirements;
    if (!reqs) continue;
    if (tanks.length < reqs.minFuelTanks) errors.push(`${ITEM_DATA[engine].name} requires at least ${reqs.minFuelTanks} fuel tank(s)`);
    if (reqs.requiresCommandModule && capsules.length === 0) errors.push(`${ITEM_DATA[engine].name} requires a Command Module`);
  }
  // One engine per stage, as the stage's bottom part: an engine stacked on
  // another (or on a tank) would fire into the part beneath it
  const stages = stagesOf(itemTypes, t => t);
  stages.forEach((stage, i) => {
    const at = stage.map((t, k) => typeOf(t) === RocketPartType.ENGINE ? k : -1).filter(k => k >= 0);
    const label = stages.length > 1 ? `Stage ${i + 1}` : 'The rocket';
    if (at.length > 1) errors.push(`${label} has more than one engine: an engine can't fire into the part below it`);
    else if (at.length === 1 && at[0] !== 0) errors.push(`${label}'s engine must be its bottom part`);
  });
  // Staged: every stage needs an engine of its own, or dropping the stage
  // below leaves a rocket that cannot fly
  if (stages.length > 1) {
    stages.forEach((stage, i) => {
      if (!stage.some(t => typeOf(t) === RocketPartType.ENGINE)) errors.push(`Stage ${i + 1} has no engine`);
    });
    // A booster engine fires only as the bottom stage (the Rocket Engine): upper stages need an engine that lights in flight
    for (const t of new Set(stages.slice(1).flat())) {
      if (partStats(t)?.boosterOnly) errors.push(`${ITEM_DATA[t]?.name ?? 'Engine'} only fires as the bottom stage`);
    }
    // The crew rides the last stage: a command module below a separator would drop with its stage
    if (stages.slice(0, -1).some(stage => stage.some(t => typeOf(t) === RocketPartType.CAPSULE))) errors.push('Command Module must be in the top stage');
  }
  return [...new Set(errors)];
}

// ---- Power, re-entry heat and the parachute (openspec wool-air-and-reentry) ----

/** Charge after drawing `drawW` for `dt` seconds (never below 0) */
export function drainCharge(chargeWh: number, drawW: number, dt: number): number {
  return Math.max(0, chargeWh - (drawW * dt) / 3600);
}

/**
 * One step of an electric engine's charge draw (rocket-tiers: the ion
 * thruster): the charge left, and whether the engines may fire. An engine
 * that draws charge can't fire on an empty battery; one that draws none
 * always can.
 */
export function feedCharge(chargeWh: number, drawW: number, throttle: number, dt: number): { chargeWh: number; firing: boolean } {
  if (drawW <= 0 || throttle <= 0) return { chargeWh, firing: true };
  if (chargeWh <= 0) return { chargeWh: 0, firing: false };
  return { chargeWh: drainCharge(chargeWh, drawW * throttle, dt), firing: true };
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

/** What else a re-entry step weighs (space-exploration): all optional, Earth-like by default */
export interface ReentryOptions {
  /** The air's density (BODY_ENVIRONMENTS, 1 = Earth's): heat gain scales with it, the safe speed inversely */
  density?: number;
  /** Heat gained this step from elsewhere (the Sun up close), heat units */
  extraGain?: number;
  /** The share of the heat gained that a fitted heat shield takes (0 = none fitted) */
  shieldShare?: number;
  /** The share of the heat gained its radiators shed first (RocketStats.cooling) */
  cooling?: number;
}

/**
 * One step of re-entry heat: a flight that has left every atmosphere and is
 * back inside one heats while faster than the safe speed there (safeSpeed /
 * density), by heatPerMs x density per m/s over it; any `extraGain` adds to
 * that, and a heat shield takes `shieldShare` of the total (`absorbed`).
 * With nothing gained it cools. Returns the new state, whether it is
 * re-entering, and what the shield absorbed.
 */
export function reentryStep(state: ReentryState, inAtmosphere: boolean, speed: number, dt: number, opts: ReentryOptions = {}): ReentryState & { reentering: boolean; absorbed: number } {
  const cfg = ROCKET_CONFIG.REENTRY;
  const density = opts.density ?? 1;
  const leftAtmosphere = state.leftAtmosphere || !inAtmosphere;
  const reentering = leftAtmosphere && inAtmosphere;
  const safe = cfg.safeSpeed / Math.max(density, Number.EPSILON);
  const gain = ((reentering && speed > safe ? (speed - safe) * cfg.heatPerMs * density * dt : 0) + (opts.extraGain ?? 0)) * (1 - (opts.cooling ?? 0));
  const absorbed = gain * (opts.shieldShare ?? 0);
  const net = gain - absorbed;
  const heat = net > 0
    ? Math.min(cfg.maxHeat, state.heat + net)
    : Math.max(0, state.heat - cfg.coolPerS * dt);
  return { heat, leftAtmosphere, reentering, absorbed };
}

/**
 * The Sun's heat on a rocket at `distance` from its centre this step:
 * nothing outside SUN_PASS.closePassRadii x `sunRadius`, rising to heatPerS
 * at its surface.
 */
export function solarHeat(distance: number, sunRadius: number, dt: number): number {
  const cfg = ROCKET_CONFIG.SUN_PASS;
  const outer = sunRadius * cfg.closePassRadii;
  if (distance >= outer) return 0;
  const near = 1 - Math.max(0, distance - sunRadius) / (outer - sunRadius);
  return cfg.heatPerS * near * dt;
}

/** Heat shields fitted in an equipment row (each soaks heatShield units before it wears through) */
export function shieldsFitted(equipment: readonly InventorySlot[] | null | undefined): number {
  let n = 0;
  for (const s of equipment ?? []) if (equipmentStats(s.itemType)?.heatShield) n += s.quantity;
  return n;
}

/** Wear one heat shield through: it leaves the equipment. False if none was fitted. */
export function useShield(equipment: InventorySlot[] | null | undefined): boolean {
  if (!equipment) return false;
  const shield = equipment.find(s => (equipmentStats(s.itemType)?.heatShield ?? 0) > 0 && s.quantity > 0);
  if (!shield) return false;
  return slotStore(equipment).removeItem(shield.itemType, 1) === 1;
}

/** One heat shield's capacity (heat units it soaks before wearing through) */
export function shieldCapacity(equipment: readonly InventorySlot[] | null | undefined): number {
  for (const s of equipment ?? []) {
    const cap = equipmentStats(s.itemType)?.heatShield;
    if (cap && s.quantity > 0) return cap;
  }
  return 0;
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
 * Ask the parachutes fitted in an equipment row to open: opening or tearing
 * uses one up (the slot's count is the state - there is no "spent" flag);
 * no air, or none fitted, leaves the row as it was.
 */
export function openChuteFrom(equipment: InventorySlot[] | null | undefined, inAtmosphere: boolean, speed: number): ChuteOpen {
  const result = tryOpenChute(chutesFitted(equipment) > 0, inAtmosphere, speed);
  if (result === 'open' || result === 'torn') useChute(equipment);
  return result;
}

/**
 * Descent speed (m/s, + = falling) under an open chute, given the speed after
 * this step's gravity (`g` m/s^2 of it): over terminalVelocity the excess
 * bleeds at dragRate and the chute also holds this step's gravity, so it
 * settles on terminalVelocity exactly; under it, it falls freely.
 */
export function chuteDescentSpeed(fallSpeed: number, g: number, dt: number, density = 1, brake = 1): number {
  const cfg = ROCKET_CONFIG.PARACHUTE;
  // Thick air brakes harder and lands slower; thin air the opposite; a
  // drogue (brake > 1) brakes harder in any air
  const t = chuteLandingSpeed(density, brake);
  if (fallSpeed <= t) return fallSpeed;
  return Math.max(t, t + (fallSpeed - t) * Math.exp(-cfg.dragRate * density * brake * dt) - g * dt);
}

/** The speed a chute lands at in air of this density (terminalVelocity in Earth's), a drogue's brake included */
export function chuteLandingSpeed(density = 1, brake = 1): number {
  return ROCKET_CONFIG.PARACHUTE.terminalVelocity / Math.max(density * brake, Number.EPSILON);
}

/** Sideways speed kept per step under an open chute */
export function chuteSideFactor(dt: number, density = 1): number {
  return Math.exp(-ROCKET_CONFIG.PARACHUTE.dragRate * density * dt);
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

/** Equipment slots a stack provides */
export function equipmentSlotsFor(itemTypes: readonly ItemType[]): number {
  return computeRocketStats(itemTypes).equipmentSlots;
}

/** Parachutes fitted in an equipment row */
export function chutesFitted(equipment: readonly InventorySlot[] | null | undefined): number {
  return computeRocketStats([], 0, null, equipment ?? null).chutes;
}

/** Use up one fitted parachute (it opened, or tore). False if none was fitted. */
export function useChute(equipment: InventorySlot[] | null | undefined): boolean {
  if (!equipment) return false;
  const chute = equipment.find(s => (equipmentStats(s.itemType)?.chutes ?? 0) > 0 && s.quantity > 0);
  if (!chute) return false;
  return slotStore(equipment).removeItem(chute.itemType, 1) === 1;
}

/**
 * Fit equipment from a slot of the player's (hotbar or bag) into an
 * equipment row: stacks onto the same item, then fills empty slots, up to the
 * item's stackSize. Only ROCKET_CONFIG.EQUIPMENT items fit. Returns how many
 * moved (taken out of `from`).
 */
export function fitEquipment(equipment: InventorySlot[], from: InventorySlot): number {
  if (from.itemType === ItemType.NONE || from.quantity <= 0 || !isEquipment(from.itemType)) return 0;
  const left = slotStore(equipment).addItem(from.itemType, from.quantity);
  const moved = from.quantity - left;
  from.quantity = left;
  if (left <= 0) { from.itemType = ItemType.NONE; from.quantity = 0; }
  return moved;
}

/** What one equipment item gives, short, for the slot panels ("+40 kWh") */
export function equipmentLabel(itemType: ItemType, quantity = 1): string {
  const e = equipmentStats(itemType);
  if (!e) return '';
  const out: string[] = [];
  if (e.batteryWh) out.push(`+${Math.round((e.batteryWh * quantity) / 1000)} kWh`);
  if (e.solarW) out.push(`+solar ${Math.round((e.solarW * quantity) / 1000)} kW`);
  if (e.chutes) out.push(`${e.chutes * quantity} chute${e.chutes * quantity === 1 ? '' : 's'}`);
  return out.join(', ');
}

/** What a whole equipment row gives, for the slot panels */
export function equipmentSummary(equipment: readonly InventorySlot[] | null | undefined): string {
  const s = computeRocketStats([], 0, null, equipment ?? null);
  const out: string[] = [];
  if (s.batteryWh > 0) out.push(`+${Math.round(s.batteryWh / 1000)} kWh`);
  if (s.solarW > 0) out.push(`+solar ${Math.round(s.solarW / 1000)} kW`);
  if (s.chutes > 0) out.push(`${s.chutes} chute${s.chutes === 1 ? '' : 's'}`);
  if (s.dryMass > 0) out.push(`+${Math.round(s.dryMass)} kg`);
  return out.length ? out.join(', ') : 'Nothing fitted';
}

/**
 * Older saves stacked parachutes, solar arrays and battery packs as parts.
 * Split a saved stack into the parts that still are parts and the equipment
 * items that were in it, so the caller can fit those into the equipment
 * slots (or the cargo hold when they are full) - nothing is lost.
 */
export function splitLegacyStack<T extends { itemType: ItemType }>(saved: readonly T[]): { parts: T[]; equipment: ItemType[] } {
  const parts: T[] = [];
  const equipment: ItemType[] = [];
  for (const p of saved) {
    if (isEquipment(p.itemType) && !partStats(p.itemType)) equipment.push(p.itemType);
    else parts.push(p);
  }
  return { parts, equipment };
}

/** Fit migrated items into the equipment row, then the cargo hold; returns what fit nowhere */
export function stowLegacyEquipment(items: readonly ItemType[], equipment: InventorySlot[], cargo: InventorySlot[]): ItemType[] {
  const lost: ItemType[] = [];
  for (const t of items) {
    if (slotStore(equipment).addItem(t, 1) === 0) continue;
    if (slotStore(cargo).addItem(t, 1) === 0) continue;
    lost.push(t);
  }
  return lost;
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
  hasAtmosphere?: boolean; // air: a fitted parachute can land the rocket (simulateTransfer `chute`)
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

/**
 * The lift (most thrust: every engine firing, the All mode) and cruise (best
 * exhaust velocity) modes of a stack, or null with one engine type
 */
export function liftCruiseProfile(itemTypes: readonly ItemType[], extraDryMass = 0): FlightProfile | null {
  const types = engineTypes(itemTypes);
  if (types.length < 2) return null;
  const each = types.map(t => computeRocketStats(itemTypes, extraDryMass, t)).filter(s => s.thrust > 0);
  if (each.length < 2) return null;
  const lift = [computeRocketStats(itemTypes, extraDryMass, null), ...each].reduce((a, b) => (b.thrust > a.thrust ? b : a));
  const cruise = each.reduce((a, b) => (b.exhaustVelocity > a.exhaustVelocity ? b : a));
  return { lift, cruise };
}

// The simulated pilot gives up after this long (s). A low-thrust (ion)
// cruise outlasts it; scripts/rocket-tech-report.ts estimates those
export const TRANSFER_MAX_S = 1200;

/** One stage's flight numbers: its stats, or its lift / cruise profile (several engine types) */
export type StageFlight = RocketStats | FlightProfile;

/**
 * A stack (bottom to top) as simulateTransfer flies it: one StageFlight per
 * stage (stagesOf), bottom first. Each stage's mass carries everything above
 * it (their tanks filled as fillStages fills them) and only its own engines
 * fire, as RocketController flies a staged rocket. One stage: the stack's
 * own stats or profile.
 */
export function stagedFlight(itemTypes: readonly ItemType[], extraDryMass = 0, fuelUnits?: number): StageFlight[] {
  const groups = stagesOf(itemTypes, t => t);
  const own = groups.map(g => computeRocketStats(g));
  const fuels = fillStages(fuelUnits ?? own.reduce((a, s) => a + s.fuelCapacity, 0), own.map(s => s.fuelCapacity));
  return groups.map((g, k) => {
    let above = extraDryMass;
    for (let j = k + 1; j < groups.length; j++) above += own[j].dryMass + fuels[j] * ROCKET_CONFIG.FUEL_KG_PER_UNIT;
    return liftCruiseProfile(g, above) ?? computeRocketStats(g, above);
  });
}

// The simulated pilot gives up on a rocket out of fuel and slower than this
// (m/s) outside every gravity well: the damping only slows it further
const STALLED_SPEED = 1e-3;

/**
 * `chute`: a parachute is fitted. Landing on a body with air, the pilot then
 * only brakes to a speed the chute opens at (PARACHUTE.maxOpenSpeed, kept
 * under REENTRY.safeSpeed so it doesn't heat) by its deploy altitude, and
 * the chute does the rest - the landing counts once it opens.
 */
export function simulateTransfer(stats: StageFlight | readonly StageFlight[], from: TransferBody, to: TransferBody, fuelUnits?: number, chute = false): TransferResult {
  // Staged: the active (bottom) stage burns its own tanks and drops when they are dry
  const stages: FlightProfile[] = (Array.isArray(stats) ? stats : [stats]).map((f: StageFlight) => ('lift' in f ? f : { lift: f, cruise: f }));
  const capacities = stages.map(p => p.lift.fuelCapacity);
  if (fuelUnits === undefined) fuelUnits = capacities.reduce((a, b) => a + b, 0);
  const fuels = fillStages(fuelUnits, capacities);
  let active = 0;
  let profile = stages[0];
  const dt = 1 / ROCKET_CONFIG.PHYSICS.dampingReferenceFps;
  const damp = dampingFactor(ROCKET_CONFIG.PHYSICS.linearDamping, dt);
  const span = Math.hypot(to.center.x - from.center.x, to.center.y - from.center.y, to.center.z - from.center.z);
  // Under a chute the descent need only be slow enough for it to open, at its deploy height
  const chuting = chute && !!to.hasAtmosphere;
  const openSpeed = Math.min(ROCKET_CONFIG.PARACHUTE.maxOpenSpeed, ROCKET_CONFIG.REENTRY.safeSpeed);
  const touchdown = chuting ? to.surfaceRadius + ROCKET_CONFIG.PARACHUTE.deployAltitude : to.surfaceRadius;
  const safe = (chuting ? openSpeed : ROCKET_CONFIG.HEALTH.impactDamageThreshold) * LANDING_SAFE_SHARE;
  const landedBelow = chuting ? openSpeed : ROCKET_CONFIG.HEALTH.impactDamageThreshold;
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
  let v = 0, fuel = fuels[0], dvUsed = 0, t = 0;
  // Fuel aboard: the active stage's and every stage's above it
  const fuelLeft = () => fuel + fuels.slice(active + 1).reduce((a, b) => a + b, 0);
  let phase: 'burn' | 'coast' = 'burn';
  const fromWell = from.radius * GRAVITY_WELL.FALLOFF_RADIUS_MULT;
  while (t < TRANSFER_MAX_S) {
    // The active stage's tanks are dry: drop it and the next one fires
    while (fuel <= 0 && active < stages.length - 1) {
      active++;
      profile = stages[active];
      fuel = fuels[active];
    }
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
      const alt = Math.max(0, span - s - touchdown);
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
    if (span - s <= touchdown) {
      return { landed: v < landedBelow, fuelUsed: fuelUnits - fuelLeft(), deltaVUsed: dvUsed, impactSpeed: v, seconds: t };
    }
    if (s < from.surfaceRadius && t > 1) break; // fell back
    // Out of fuel and stopped between the wells: it can never get there
    if (fuelLeft() <= 0 && Math.abs(v) < STALLED_SPEED && pull(s) === 0) break;
  }
  return { landed: false, fuelUsed: fuelUnits - fuelLeft(), deltaVUsed: dvUsed, impactSpeed: Math.abs(v), seconds: t };
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

/** Make a slot row exactly `n` long, items packed to the front (false if they don't fit) */
export function fitSlots(slots: InventorySlot[], n: number): boolean {
  const items = slots.filter(s => s.itemType !== ItemType.NONE && s.quantity > 0).map(s => ({ ...s }));
  if (items.length > n) return false;
  slots.length = 0;
  for (let i = 0; i < n; i++) slots.push(items[i] ?? { itemType: ItemType.NONE, quantity: 0 });
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

/**
 * The body a survey drone launched from `pos` surveys (space-exploration
 * upgrade): the nearest airless, solid body within DRONE_RANGE_RADII of its
 * radius - or null.
 */
export function droneTarget<B extends { id: string; center: { x: number; y: number; z: number }; radius: number; hasAtmosphere?: boolean; gasGiant?: boolean }>(
  pos: { x: number; y: number; z: number }, bodies: readonly B[],
): B | null {
  let best: B | null = null, bestD = Infinity;
  for (const b of bodies) {
    if (b.hasAtmosphere || b.gasGiant) continue;
    const d = Math.hypot(pos.x - b.center.x, pos.y - b.center.y, pos.z - b.center.z);
    if (d <= b.radius * ROCKET_CONFIG.DRONE_RANGE_RADII && d < bestD) { best = b; bestD = d; }
  }
  return best;
}
