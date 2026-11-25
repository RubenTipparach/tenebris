import type { ItemType } from '../player/Inventory';
import { DeliverResult, VillageCtx, VillageState, deliver } from '../shared/npc';

/**
 * A delivery toward a village request from the player's items (openspec
 * friendship-npcs, task 4.3): hotbar and bag together, capped at what the
 * request still needs - the delivery rule (shared/npc/village.ts `deliver`)
 * decides what is taken, and exactly that leaves the inventory.
 */

/** The inventory as a delivery sees it: one count / take over hotbar + bag. */
export interface DeliverySource {
  getItemCount(item: ItemType): number;
  removeItem(item: ItemType, quantity: number): number;
}

/** Deliver what the player has toward request `reqId` at planet time T. Null when nothing could go. */
export function deliverFrom(src: DeliverySource, ctx: VillageCtx, v: VillageState, reqId: number, T: number): DeliverResult | null {
  const q = v.requests.find(r => r.id === reqId);
  if (!q || q.item === undefined) return null;
  const have = src.getItemCount(q.item as ItemType);
  const n = Math.min(have, q.need - q.got);
  if (n <= 0) return null;
  const res = deliver(ctx, v, reqId, n, T);
  if (res.taken <= 0) return null;
  const removed = src.removeItem(q.item as ItemType, res.taken);
  // the rule took no more than the player had, so the take always succeeds
  if (removed !== res.taken) throw new Error(`[NPC] delivery took ${removed} of ${res.taken}`);
  return res;
}
