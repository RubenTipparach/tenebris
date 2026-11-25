import type { ItemType } from '../player/Inventory';
import { TraderState, offerPrice, offersFor, takeStock } from '../shared/npc';

/**
 * A barter with a trader (openspec friendship-npcs, task 4.5): all or
 * nothing - the player pays the whole price from hotbar and bag together
 * or nothing moves; what they get goes through `give` (hotbar first, then
 * the bag, then the overflow sack). The offer's stock is shared: the result
 * is the trader's new state, written as a versioned trader record, so of two
 * players taking the last unit one is refused and the trade ledger hands
 * their items back.
 */

export interface BarterPurse {
  getItemCount(item: ItemType): number;
  removeItem(item: ItemType, quantity: number): number;
  give(item: ItemType, quantity: number): number;
}

export type BarterResult = { ok: true; trader: TraderState; paid: number; got: number } | { ok: false; why: 'stock' | 'short' | 'hidden' };

export function barter(purse: BarterPurse, s: TraderState, i: number, level: number): BarterResult {
  if (!offersFor(s, level).includes(i)) return { ok: false, why: 'hidden' };
  const o = s.offers[i];
  const price = offerPrice(o, level);
  if (purse.getItemCount(o.take.item as ItemType) < price) return { ok: false, why: 'short' };
  const trader = takeStock(s, i);
  if (!trader) return { ok: false, why: 'stock' };
  const paid = purse.removeItem(o.take.item as ItemType, price);
  if (paid !== price) throw new Error(`[NPC] barter paid ${paid} of ${price}`);
  purse.give(o.give.item as ItemType, o.give.n);
  return { ok: true, trader, paid, got: o.give.n };
}
