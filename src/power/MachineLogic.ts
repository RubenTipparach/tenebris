import * as THREE from 'three';
import { ItemType, InventorySlot, ITEM_DATA } from '../player/Inventory';
import { MACHINE_CONFIG, MACHINE_KIND_OF, POWER_CONFIG, PowerNodeKind, FABRICATOR_RECIPES } from '../config/PowerConfig';

/**
 * What the industry machines do (openspec industry-and-nuclear, design 3-5):
 * pump jack, refinery, centrifuge, reactor, nuclear fabricator and the
 * batteries. Pure on the data - no scene, no shaders - so tests drive it;
 * src/planet/Machines.ts gives them meshes.
 */

export interface MachineState {
  kind: PowerNodeKind;
  itemType: ItemType;         // the item that placed it (which battery tier)
  tileIndex: number;
  depth: number;              // the cell it stands in (the ground is depth - 1)
  position: THREE.Vector3;
  rotation: number;
  inputs: InventorySlot[];
  outputs: InventorySlot[];
  tank: number;               // pump jack: crude units held
  progressS: number;          // time into the current job
  chargeWh: number;           // battery charge
  rodLifeS: number[];         // reactor: life left in each rod slot
  job: ItemType | null;       // fabricator: what it is making
  powered: boolean;           // from the grid this step
  status: string;             // one short line for the UI
}

export interface PlacedMachine extends MachineState {
  mesh: THREE.Mesh;
}

const empty = (): InventorySlot => ({ itemType: ItemType.NONE, quantity: 0 });

export function newMachineState(itemType: ItemType, tileIndex: number, depth: number, position: THREE.Vector3, rotation: number): MachineState {
  const kind = MACHINE_KIND_OF[itemType]!;
  const slots = MACHINE_CONFIG.SLOTS[kind] ?? { inputs: 0, outputs: 0 };
  return {
    kind, itemType, tileIndex, depth, position, rotation,
    inputs: Array.from({ length: slots.inputs }, empty),
    outputs: Array.from({ length: slots.outputs }, empty),
    tank: 0, progressS: 0, chargeWh: 0,
    rodLifeS: kind === 'reactor' ? Array(MACHINE_CONFIG.REACTOR_ROD_SLOTS).fill(0) : [],
    job: null, powered: false, status: '',
  };
}

/** Add to output slots (stacking); false if it doesn't fit. */
export function addToSlots(slots: InventorySlot[], itemType: ItemType, quantity: number): boolean {
  const stack = ITEM_DATA[itemType]?.stackSize ?? 64;
  let left = quantity;
  const plan = slots.map(s => ({ ...s }));
  for (const s of plan) {
    if (left <= 0) break;
    if (s.itemType === itemType && s.quantity < stack) { const t = Math.min(stack - s.quantity, left); s.quantity += t; left -= t; }
  }
  for (const s of plan) {
    if (left <= 0) break;
    if (s.itemType === ItemType.NONE) { const t = Math.min(stack, left); s.itemType = itemType; s.quantity = t; left -= t; }
  }
  if (left > 0) return false;
  plan.forEach((p, i) => { slots[i].itemType = p.itemType; slots[i].quantity = p.quantity; });
  return true;
}

function countIn(slots: InventorySlot[], itemType: ItemType): number {
  return slots.reduce((n, s) => n + (s.itemType === itemType ? s.quantity : 0), 0);
}

function takeFrom(slots: InventorySlot[], itemType: ItemType, quantity: number): void {
  let left = quantity;
  for (const s of slots) {
    if (left <= 0) break;
    if (s.itemType !== itemType) continue;
    const t = Math.min(s.quantity, left);
    s.quantity -= t; left -= t;
    if (s.quantity <= 0) { s.itemType = ItemType.NONE; s.quantity = 0; }
  }
}

/** Does this machine want power this step (it has work to do)? */
export function wantsPower(m: MachineState, oilBelow: boolean): boolean {
  switch (m.kind) {
    case 'pumpJack': return oilBelow && m.tank < MACHINE_CONFIG.PUMP_TANK_UNITS;
    case 'refinery': return countIn(m.inputs, ItemType.CRUDE_OIL_BUCKET) > 0;
    case 'centrifuge': return countIn(m.inputs, ItemType.ORE_URANIUM) >= MACHINE_CONFIG.ENRICH_IN;
    case 'nuclearFabricator': return m.job !== null;
    default: return false;
  }
}

/** Is a reactor fuelled (it supplies power)? */
export function reactorFuelled(m: MachineState): boolean {
  return m.kind === 'reactor' && m.rodLifeS.some((life, i) => life > 0 || (m.inputs[i]?.itemType === ItemType.FUEL_ROD && m.inputs[i].quantity > 0));
}

export interface TickEffects {
  pumpedCell?: boolean;      // the pump took one oil sand cell (caller edits the world)
  made?: { itemType: ItemType; quantity: number }[];  // outputs produced (events)
  event?: 'pumped' | 'refined' | 'enriched' | 'fabricated';
}

/**
 * One step of a machine's own work, given whether the grid powered it and
 * whether oil is below (pump jack) / its network has reactor power
 * (fabricator).
 */
export function tickMachine(m: MachineState, dtS: number, ctx: { oilBelow: boolean; reactorPower: boolean }): TickEffects {
  const fx: TickEffects = {};
  switch (m.kind) {
    case 'pumpJack': {
      // A bucket in the input slot is filled from the tank (also once the
      // pocket below has run dry - what was pumped is still in the tank)
      if (m.tank >= 1 && countIn(m.inputs, ItemType.BUCKET) > 0 && addToSlots(m.outputs, ItemType.CRUDE_OIL_BUCKET, 1)) {
        takeFrom(m.inputs, ItemType.BUCKET, 1);
        m.tank -= 1;
      }
      if (!ctx.oilBelow) { m.status = 'No oil here'; m.progressS = 0; break; }
      if (m.tank >= MACHINE_CONFIG.PUMP_TANK_UNITS) { m.status = 'Tank full'; break; }
      if (!m.powered) { m.status = 'No power'; break; }
      m.progressS += dtS;
      m.status = 'Pumping';
      if (m.progressS >= MACHINE_CONFIG.PUMP_UNIT_S) {
        m.progressS -= MACHINE_CONFIG.PUMP_UNIT_S;
        m.tank += 1;
        fx.pumpedCell = true;
        fx.event = 'pumped';
      }
      break;
    }
    case 'refinery': {
      if (countIn(m.inputs, ItemType.CRUDE_OIL_BUCKET) === 0) { m.status = 'Add crude oil'; m.progressS = 0; break; }
      if (!m.powered) { m.status = 'No power'; break; }
      m.progressS += dtS;
      m.status = 'Refining';
      if (m.progressS >= MACHINE_CONFIG.REFINE_S) {
        const trial = m.outputs.map(s => ({ ...s }));
        const fits = [...MACHINE_CONFIG.REFINE_OUT, { itemType: ItemType.BUCKET, quantity: 1 }].every(o => addToSlots(trial, o.itemType, o.quantity));
        if (!fits) { m.status = 'Output full'; m.progressS = MACHINE_CONFIG.REFINE_S; break; }
        trial.forEach((t, i) => { m.outputs[i].itemType = t.itemType; m.outputs[i].quantity = t.quantity; });
        takeFrom(m.inputs, ItemType.CRUDE_OIL_BUCKET, 1);
        m.progressS = 0;
        fx.made = MACHINE_CONFIG.REFINE_OUT.map(o => ({ ...o }));
        fx.event = 'refined';
      }
      break;
    }
    case 'centrifuge': {
      if (countIn(m.inputs, ItemType.ORE_URANIUM) < MACHINE_CONFIG.ENRICH_IN) { m.status = `Needs ${MACHINE_CONFIG.ENRICH_IN} uranium ore`; m.progressS = 0; break; }
      if (!m.powered) { m.status = 'No power'; break; }
      m.progressS += dtS;
      m.status = 'Enriching';
      if (m.progressS >= MACHINE_CONFIG.ENRICH_S) {
        if (!addToSlots(m.outputs, ItemType.ENRICHED_URANIUM, 1)) { m.status = 'Output full'; m.progressS = MACHINE_CONFIG.ENRICH_S; break; }
        takeFrom(m.inputs, ItemType.ORE_URANIUM, MACHINE_CONFIG.ENRICH_IN);
        m.progressS = 0;
        fx.made = [{ itemType: ItemType.ENRICHED_URANIUM, quantity: 1 }];
        fx.event = 'enriched';
      }
      break;
    }
    case 'reactor': {
      // Burn the rods: a fresh rod in a slot starts its life when the old one ends
      let running = false;
      for (let i = 0; i < m.rodLifeS.length; i++) {
        if (m.rodLifeS[i] <= 0 && m.inputs[i]?.itemType === ItemType.FUEL_ROD && m.inputs[i].quantity > 0) {
          m.inputs[i].quantity -= 1;
          if (m.inputs[i].quantity <= 0) m.inputs[i] = empty();
          m.rodLifeS[i] = MACHINE_CONFIG.REACTOR_ROD_LIFE_S;
        }
        if (m.rodLifeS[i] > 0) { running = true; m.rodLifeS[i] = Math.max(0, m.rodLifeS[i] - dtS); }
      }
      m.status = running ? 'Running' : 'Needs fuel rods';
      break;
    }
    case 'nuclearFabricator': {
      if (m.job === null) { m.status = 'Pick something to build'; m.progressS = 0; break; }
      if (!ctx.reactorPower) { m.status = 'Needs reactor power'; break; }
      if (!m.powered) { m.status = 'No power'; break; }
      const recipe = FABRICATOR_RECIPES.find(r => r.output === m.job)!;
      m.progressS += dtS;
      m.status = 'Building';
      if (m.progressS >= recipe.timeS) {
        if (!addToSlots(m.outputs, recipe.output, 1)) { m.status = 'Output full'; m.progressS = recipe.timeS; break; }
        fx.made = [{ itemType: recipe.output, quantity: 1 }];
        fx.event = 'fabricated';
        m.job = null;
        m.progressS = 0;
      }
      break;
    }
    case 'battery':
      m.status = '';
      break;
  }
  return fx;
}

/** The watts a machine produces (generators) right now. */
export function machineSupplyW(m: MachineState): number {
  return m.kind === 'reactor' && m.rodLifeS.some(l => l > 0) ? (POWER_CONFIG.SUPPLY_W.reactor ?? 0) : 0;
}

/** What a machine saves (its record). */
export function machineRecord(m: MachineState) {
  return {
    tileIndex: m.tileIndex,
    depth: m.depth,
    itemType: m.itemType,
    position: { x: m.position.x, y: m.position.y, z: m.position.z },
    rotation: m.rotation,
    inputs: m.inputs.map(s => ({ itemType: s.itemType, quantity: s.quantity })),
    outputs: m.outputs.map(s => ({ itemType: s.itemType, quantity: s.quantity })),
    tank: m.tank, progressS: m.progressS, chargeWh: m.chargeWh,
    rodLifeS: [...m.rodLifeS], job: m.job,
  };
}
export type SavedMachine = ReturnType<typeof machineRecord>;


/** A machine state back from its record (a save load or an MP record). */
export function machineFromRecord(r: SavedMachine): MachineState {
  const m = newMachineState(r.itemType, r.tileIndex, r.depth ?? 0,
    new THREE.Vector3(r.position.x, r.position.y, r.position.z), r.rotation ?? 0);
  r.inputs?.forEach((s, i) => { if (m.inputs[i]) m.inputs[i] = { itemType: s.itemType, quantity: s.quantity }; });
  r.outputs?.forEach((s, i) => { if (m.outputs[i]) m.outputs[i] = { itemType: s.itemType, quantity: s.quantity }; });
  m.tank = r.tank ?? 0;
  m.progressS = r.progressS ?? 0;
  m.chargeWh = r.chargeWh ?? 0;
  if (r.rodLifeS) r.rodLifeS.forEach((l, i) => { if (i < m.rodLifeS.length) m.rodLifeS[i] = l; });
  m.job = r.job ?? null;
  return m;
}

/** What a machine's input slots take (the UI only loads these). */
export function acceptsInput(kind: PowerNodeKind, itemType: ItemType): boolean {
  switch (kind) {
    case 'pumpJack': return itemType === ItemType.BUCKET;
    case 'refinery': return itemType === ItemType.CRUDE_OIL_BUCKET;
    case 'centrifuge': return itemType === ItemType.ORE_URANIUM;
    case 'reactor': return itemType === ItemType.FUEL_ROD;
    default: return false;
  }
}

/** The most one input slot holds: a reactor slot holds one rod. */
export function inputSlotCap(kind: PowerNodeKind, itemType: ItemType): number {
  return kind === 'reactor' ? 1 : (ITEM_DATA[itemType]?.stackSize ?? 64);
}

/**
 * Load up to `quantity` of an item into a machine's inputs; returns how many
 * went in.
 */
export function loadInput(m: MachineState, itemType: ItemType, quantity: number): number {
  if (!acceptsInput(m.kind, itemType)) return 0;
  const cap = inputSlotCap(m.kind, itemType);
  let left = quantity;
  for (const s of m.inputs) {
    if (left <= 0) break;
    if (s.itemType === itemType && s.quantity < cap) { const t = Math.min(cap - s.quantity, left); s.quantity += t; left -= t; }
  }
  for (const s of m.inputs) {
    if (left <= 0) break;
    if (s.itemType === ItemType.NONE) { const t = Math.min(cap, left); s.itemType = itemType; s.quantity = t; left -= t; }
  }
  return quantity - left;
}
