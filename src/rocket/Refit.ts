import { ItemType, InventorySlot, ITEM_DATA } from '../player/Inventory';
import { equipmentStats, stackProblems } from './RocketPerformance';

/**
 * Refits away from home (openspec space-exploration, rocket-refit): the
 * pure rules - what a parked rocket's stack becomes after one change, and
 * whether it may. The flight manager applies them to the rocket's meshes,
 * its cargo hold and the player's inventory. The same stack rules
 * (stackProblems) decide what the launch pad accepts.
 */

/**
 * One change to a stack (bottom to top). The launch pad's stack editor and
 * a parked rocket's refit both edit a stack through these (one set of rules).
 * - remove: take the part at `index` out; the parts above slide down
 * - swap: put `itemType` in place of the part at `index`
 * - addTop: put `itemType` on top
 * - insert: put `itemType` at `index` (0..length); the parts from there up move up one
 * - move: take the part at `from` and put it back so it ends up at `to`
 */
export type RefitOp =
  | { kind: 'remove'; index: number }
  | { kind: 'swap'; index: number; itemType: ItemType }
  | { kind: 'addTop'; itemType: ItemType }
  | { kind: 'insert'; index: number; itemType: ItemType }
  | { kind: 'move'; from: number; to: number };

/** The refit kit fitted in an equipment row: 'once' (used up per refit), 'reusable' (mk2), or null */
export function refitKitIn(equipment: readonly InventorySlot[] | null | undefined): 'once' | 'reusable' | null {
  let found: 'once' | 'reusable' | null = null;
  for (const s of equipment ?? []) {
    const kind = s.quantity > 0 ? equipmentStats(s.itemType)?.refit : undefined;
    if (kind === 'reusable') return kind;
    if (kind) found = kind;
  }
  return found;
}

/** The stack after `op` */
export function stackAfter(types: readonly ItemType[], op: RefitOp): ItemType[] {
  const out = [...types];
  if (op.kind === 'remove') out.splice(op.index, 1);
  else if (op.kind === 'swap') out[op.index] = op.itemType;
  else if (op.kind === 'insert') out.splice(Math.max(0, Math.min(op.index, out.length)), 0, op.itemType);
  else if (op.kind === 'move') {
    const [t] = out.splice(op.from, 1);
    if (t !== undefined) out.splice(Math.max(0, Math.min(op.to, out.length)), 0, t);
  } else out.push(op.itemType);
  return out;
}

/** Is `op` about a part that is there (an insert may go anywhere from the bottom to the top)? */
function opInRange(types: readonly ItemType[], op: RefitOp): boolean {
  const n = types.length;
  if (op.kind === 'addTop') return true;
  if (op.kind === 'insert') return op.index >= 0 && op.index <= n;
  if (op.kind === 'move') return op.from >= 0 && op.from < n && op.to >= 0 && op.to < n;
  return op.index >= 0 && op.index < n;
}

// ---- height slots: the pad's editor shows one slot per height unit ----

/** Height units a part takes (one slot each in the stack editor) */
export function partUnits(t: ItemType): number {
  return ITEM_DATA[t]?.rocketPart?.heightUnits ?? 1;
}

/** Height units of a whole stack */
export function stackUnits(types: readonly ItemType[]): number {
  return types.reduce((n, t) => n + partUnits(t), 0);
}

/** The bottom height slot of each part */
export function partStartSlots(types: readonly ItemType[]): number[] {
  let slot = 0;
  return types.map(t => { const s = slot; slot += partUnits(t); return s; });
}

/** The part covering height slot `slot` (bottom = 0), or -1 above the stack */
export function partAtSlot(types: readonly ItemType[], slot: number): number {
  const starts = partStartSlots(types);
  for (let i = 0; i < types.length; i++) {
    if (slot >= starts[i] && slot < starts[i] + partUnits(types[i])) return i;
  }
  return -1;
}

/**
 * The change a drop on height slot `slot` makes: a new part dropped on a
 * part goes in under it (it and the parts above move up); dropped above the
 * stack it goes on top. A part of the stack dragged onto another takes that
 * part's place (the ones between shift over); dragged above the stack it
 * goes to the top.
 */
export function dropOp(types: readonly ItemType[], slot: number, drop: { itemType: ItemType } | { from: number }): RefitOp {
  const at = partAtSlot(types, slot);
  if ('from' in drop) return { kind: 'move', from: drop.from, to: at >= 0 ? at : types.length - 1 };
  return { kind: 'insert', index: at >= 0 ? at : types.length, itemType: drop.itemType };
}

/**
 * Why the launch pad's stack editor refuses `op` (null = it may go ahead):
 * the part must be there and the stack must stay inside its tower (one slot
 * per tower segment). Unlike a refit, the pad may hold a stack that does not
 * fly yet - it is being built; stackProblems says what it still needs.
 */
export function padEditProblem(types: readonly ItemType[], op: RefitOp, towerSlots: number): string | null {
  if (!opInRange(types, op)) return 'No such part';
  if (stackUnits(stackAfter(types, op)) > towerSlots) return 'Too tall for the tower - add a tower segment first';
  return null;
}

/**
 * What `op` takes off the rocket (into the cargo hold or the player's
 * inventory) and what it needs put on, and why it is refused (null = it may
 * go ahead): the stack afterwards must still fly.
 */
export function planRefit(types: readonly ItemType[], op: RefitOp): { takenOff: ItemType | null; putOn: ItemType | null; refused: string | null } {
  if (!opInRange(types, op)) return { takenOff: null, putOn: null, refused: 'No such part' };
  const takenOff = op.kind === 'remove' || op.kind === 'swap' ? types[op.index] ?? null : null;
  const putOn = op.kind === 'remove' || op.kind === 'move' ? null : op.itemType;
  const problems = stackProblems(stackAfter(types, op));
  return { takenOff, putOn, refused: problems.length ? problems[0] : null };
}
