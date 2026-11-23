import { Inventory, ItemType, ITEM_DATA, DIG_WITH, PACK_SLOTS, toolOf, usesLeft, toolboxKindAt } from './Inventory';
import { TOOL_TIERS, ToolKind } from '../config/ToolConfig';

/**
 * Tools at work (openspec tools-and-toolbox, design 3-4). Pure: reads and
 * changes an Inventory, nothing else, so the mining loop, fishing and the
 * tests share one path. After tenebris-rs `interact::best_tool_for` /
 * `mining::wear_one`.
 */

const TIER_ORDER = Object.keys(TOOL_TIERS);

/** The tool kind that digs a block dropping `drop`, or null (no tool helps). */
export function digKind(drop: ItemType): ToolKind | null {
  return DIG_WITH[drop] ?? null;
}

/**
 * The slot index of the tool doing a `kind` job: a tool of that kind in the
 * selected hotbar slot (tenebris's equip rule), else the toolbox's, else null.
 */
export function toolIndexFor(inv: Inventory, kind: ToolKind): number | null {
  const sel = inv.getSelectedSlot();
  if (toolOf(inv.getSelectedItem().itemType)?.kind === kind) return sel;
  const box = inv.toolboxIndex(kind);
  return inv.getSlot(box)?.itemType !== ItemType.NONE ? box : null;
}

/**
 * Mining-time multiplier for breaking a block that drops `drop`, and the
 * slot of the tool that earns it (null: bare hands, multiplier 1).
 */
export function mineTimeMult(inv: Inventory, drop: ItemType): { mult: number; toolIndex: number | null } {
  const kind = digKind(drop);
  const index = kind ? toolIndexFor(inv, kind) : null;
  if (index === null) return { mult: 1, toolIndex: null };
  const tier = toolOf(inv.getSlot(index)!.itemType)!.tier;
  return tier === 'wood' ? { mult: 1, toolIndex: null } : { mult: TOOL_TIERS[tier].mineTimeMult, toolIndex: index };
}

/** Seconds to break a block that drops `drop`, with the tool at hand (before any food bonus). */
export function breakSeconds(inv: Inventory, drop: ItemType): number {
  return ITEM_DATA[drop].mineTime * mineTimeMult(inv, drop).mult;
}

export type Wear =
  | { kind: 'none' }
  | { kind: 'worn'; left: number }
  | { kind: 'broke'; name: string; spare: ItemType | null };

// The best spare of a kind in the hotbar / bag: highest tier, then most uses left
function bestSpare(inv: Inventory, kind: ToolKind): number | null {
  let best: number | null = null;
  let bestScore = -1;
  for (let i = 0; i < PACK_SLOTS; i++) {
    const slot = inv.getSlot(i)!;
    const t = toolOf(slot.itemType);
    if (!t || t.kind !== kind) continue;
    const score = (TIER_ORDER.indexOf(t.tier) + 1) * 1e6 + (usesLeft(slot) ?? 0);
    if (score > bestScore) { bestScore = score; best = i; }
  }
  return best;
}

/**
 * Spend one use of the tool in slot `index`. On its last use it breaks: the
 * slot empties and, for a toolbox slot, the best spare of that kind moves
 * in from the hotbar / bag. The caller toasts and saves the inventory.
 */
export function wearAt(inv: Inventory, index: number): Wear {
  const slot = inv.getSlot(index);
  if (!slot) return { kind: 'none' };
  const left = usesLeft(slot);
  if (left === null) return { kind: 'none' };
  if (left > 1) {
    slot.uses = left - 1;
    return { kind: 'worn', left: left - 1 };
  }
  const name = ITEM_DATA[slot.itemType].name;
  inv.setSlot(index, ItemType.NONE, 0);
  const boxKind = toolboxKindAt(index);
  let spare: ItemType | null = null;
  if (boxKind) {
    const from = bestSpare(inv, boxKind);
    if (from !== null) {
      spare = inv.getSlot(from)!.itemType;
      inv.swapSlots(from, index);
    }
  }
  return { kind: 'broke', name, spare };
}

/** The toast for a broken tool. */
export function brokeMessage(w: { name: string; spare: ItemType | null }): string {
  return w.spare !== null
    ? `${w.name} broke - ${ITEM_DATA[w.spare].name} equipped from the inventory`
    : `${w.name} broke`;
}
