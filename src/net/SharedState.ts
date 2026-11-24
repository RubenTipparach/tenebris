/**
 * Putting another player's record on an object already in the world (openspec
 * mp-shared-objects). Slots are copied INTO the object's own slot objects, so
 * an open panel (which holds the object and reads its slots every redraw)
 * keeps working on the same object and simply shows the new contents.
 */
export interface SlotLike { itemType: number; quantity: number }

/**
 * Copy `from` into `into` slot by slot, keeping `into`'s slot objects. False
 * (and nothing copied) when the sizes differ - the object must be rebuilt.
 */
export function copySlotsInPlace(into: SlotLike[], from: ReadonlyArray<SlotLike> | undefined): boolean {
  if (!from || from.length !== into.length) return false;
  from.forEach((sl, i) => { into[i].itemType = sl.itemType; into[i].quantity = sl.quantity; });
  return true;
}
