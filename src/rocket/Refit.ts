import { ItemType, InventorySlot } from '../player/Inventory';
import { equipmentStats, stackProblems } from './RocketPerformance';

/**
 * Refits away from home (openspec space-exploration, rocket-refit): the
 * pure rules - what a parked rocket's stack becomes after one change, and
 * whether it may. The flight manager applies them to the rocket's meshes,
 * its cargo hold and the player's inventory. The same stack rules
 * (stackProblems) decide what the launch pad accepts.
 */

/** One change to a stack (bottom to top) */
export type RefitOp =
  | { kind: 'remove'; index: number }
  | { kind: 'swap'; index: number; itemType: ItemType }
  | { kind: 'addTop'; itemType: ItemType };

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
  else out.push(op.itemType);
  return out;
}

/**
 * What `op` takes off the rocket (into the cargo hold or the player's
 * inventory) and what it needs put on, and why it is refused (null = it may
 * go ahead): the stack afterwards must still fly.
 */
export function planRefit(types: readonly ItemType[], op: RefitOp): { takenOff: ItemType | null; putOn: ItemType | null; refused: string | null } {
  const takenOff = op.kind === 'addTop' ? null : types[op.index] ?? null;
  const putOn = op.kind === 'remove' ? null : op.itemType;
  if (op.kind !== 'addTop' && (op.index < 0 || op.index >= types.length)) return { takenOff: null, putOn: null, refused: 'No such part' };
  const problems = stackProblems(stackAfter(types, op));
  return { takenOff, putOn, refused: problems.length ? problems[0] : null };
}
