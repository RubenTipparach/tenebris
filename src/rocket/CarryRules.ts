import { ItemType, ITEM_DATA, InventorySlot } from '../player/Inventory';
import { SUITS } from '../config/SurvivalConfig';
import { CARRY, CarryCategory } from '../config/CarryConfig';

/**
 * What goes where when a player boards a rocket (openspec pad-stash), as
 * pure rules on slot arrays. Boarding at a launch pad stows the carried
 * items in that pad's stash; boarding a parked rocket stows them in its
 * cargo hold. Either way it is all or nothing: if anything would not fit,
 * nothing moves and the board is refused.
 */

const IN_CATEGORY: Record<CarryCategory, (t: ItemType) => boolean> = {
  tool: (t) => !!ITEM_DATA[t]?.tool,
  suit: (t) => !!SUITS[t],
};

/** Does `itemType` stay with the player when boarding (CARRY exempt list)? */
export function isCarryExempt(itemType: ItemType, config = CARRY): boolean {
  if (!config.ENABLED) return true;
  return config.EXEMPT_ITEMS.includes(itemType) || config.EXEMPT_CATEGORIES.some(c => IN_CATEGORY[c]?.(itemType));
}

const isEmpty = (s: InventorySlot) => s.itemType === ItemType.NONE || s.quantity <= 0;

function put(slot: InventorySlot, itemType: ItemType, quantity: number, uses?: number): void {
  slot.itemType = itemType;
  slot.quantity = quantity;
  if (uses !== undefined) slot.uses = uses;
  else delete slot.uses;
}

function clear(slot: InventorySlot): void {
  put(slot, ItemType.NONE, 0);
}

/**
 * Add one stack to `into` (in place): onto the same item first (up to its
 * stack size; a tool's wear only stacks with the same wear), then empty
 * slots. Returns how many found no room.
 */
function addStack(into: InventorySlot[], stack: InventorySlot): number {
  let left = stack.quantity;
  const size = Math.max(1, ITEM_DATA[stack.itemType]?.stackSize ?? 1);
  for (const s of into) {
    if (left <= 0) break;
    if (isEmpty(s) || s.itemType !== stack.itemType || s.uses !== stack.uses) continue;
    const add = Math.min(left, size - s.quantity);
    if (add > 0) { s.quantity += add; left -= add; }
  }
  for (const s of into) {
    if (left <= 0) break;
    if (!isEmpty(s)) continue;
    const n = Math.min(left, size);
    put(s, stack.itemType, n, stack.uses);
    left -= n;
  }
  return left;
}

export interface StowResult {
  /** Items moved (0 when refused or nothing to move) */
  moved: number;
  /** Items that would not fit: > 0 means refused, nothing moved */
  overflow: number;
}

/**
 * Move every non-exempt stack of `carried` (the hotbar + bag, in place) into
 * `into` (a pad's stash or a rocket's cargo hold, in place), merging onto
 * what is there. All or nothing: planned on a copy first, and when anything
 * would not fit (or there is no hold at all: `into` null) nothing changes.
 */
export function stowCarried(carried: InventorySlot[], into: InventorySlot[] | null, config = CARRY): StowResult {
  const moving = carried.filter(s => !isEmpty(s) && !isCarryExempt(s.itemType, config));
  const total = moving.reduce((n, s) => n + s.quantity, 0);
  if (total === 0) return { moved: 0, overflow: 0 };
  if (!into) return { moved: 0, overflow: total };
  const plan = into.map(s => ({ ...s }));
  let overflow = 0;
  for (const s of moving) overflow += addStack(plan, s);
  if (overflow > 0) return { moved: 0, overflow };
  plan.forEach((s, i) => put(into[i], s.itemType, s.quantity, s.uses));
  for (const s of moving) clear(s);
  return { moved: total, overflow: 0 };
}

/**
 * Take everything that fits from `from` (a stash) into `to` (the hotbar +
 * bag, in place), stacking onto the same item first, hotbar first. What
 * finds no room stays in `from`. Returns how many moved.
 */
export function takeAllInto(from: InventorySlot[], to: InventorySlot[]): number {
  let moved = 0;
  for (const s of from) {
    if (isEmpty(s)) continue;
    const left = addStack(to, s);
    moved += s.quantity - left;
    if (left > 0) s.quantity = left;
    else clear(s);
  }
  return moved;
}

/** An empty stash */
export function emptyStash(slots = CARRY.STASH_SLOTS): InventorySlot[] {
  return Array.from({ length: slots }, () => ({ itemType: ItemType.NONE, quantity: 0 }));
}

/** Does a stash hold anything? */
export function stashUsed(stash: readonly InventorySlot[] | undefined): number {
  return (stash ?? []).filter(s => !isEmpty(s)).length;
}

type SavedSlot = { itemType: number; quantity: number; uses?: number };

/**
 * A saved stash as a full-size slot array: absent (older saves, or empty)
 * = all empty; unknown items dropped; extra slots past the size ignored.
 */
export function stashFromSave(saved: readonly SavedSlot[] | undefined, slots = CARRY.STASH_SLOTS): InventorySlot[] {
  const out = emptyStash(slots);
  saved?.forEach((s, i) => {
    if (i < slots && s && s.quantity > 0 && ITEM_DATA[s.itemType as ItemType]) {
      put(out[i], s.itemType as ItemType, s.quantity, typeof s.uses === 'number' ? s.uses : undefined);
    }
  });
  return out;
}

/** Copy a stash's contents onto another of the same size, in place (open panels keep their slot objects) */
export function copyStashInPlace(into: InventorySlot[], from: readonly InventorySlot[]): void {
  into.forEach((s, i) => {
    const f = from[i];
    if (f && !isEmpty(f)) put(s, f.itemType, f.quantity, f.uses);
    else clear(s);
  });
}

/** A stash for the record: absent while it is empty (pads without one cost nothing) */
export function stashForSave(stash: readonly InventorySlot[]): SavedSlot[] | undefined {
  if (stashUsed(stash) === 0) return undefined;
  return stash.map(s => ({ itemType: s.itemType, quantity: s.quantity, ...(s.uses !== undefined && s.quantity > 0 ? { uses: s.uses } : {}) }));
}
