// Deliveries (openspec friendship-npcs, task 4.3): from hotbar and bag
// together, never more than the request still needs, exactly what was
// taken leaving the inventory; a completed request applies its effect.
//   npx tsx scripts/npc-delivery.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ItemType } from '../src/player/Inventory';
import { DeliverySource, deliverFrom } from '../src/npc/NpcDelivery';
import { NPC_CONFIG, createVillage, VillageRequest, VillageState } from '../src/shared/npc';

const ctx = { worldSeed: 4242, body: 'sequoia', index: 0 };
const S = NPC_CONFIG.STRUCTURES;

/** A fake inventory: hotbar and bag as two piles of one item. */
function pockets(item: ItemType, hotbar: number, bag: number) {
  const p = { hotbar, bag };
  const src: DeliverySource = {
    getItemCount: (t) => (t === item ? p.hotbar + p.bag : 0),
    removeItem: (t, n) => {
      if (t !== item) return 0;
      const fromBag = Math.min(p.bag, n); p.bag -= fromBag;
      const fromBar = Math.min(p.hotbar, n - fromBag); p.hotbar -= fromBar;
      return fromBag + fromBar;
    },
  };
  return { p, src };
}

function withRequest(q: Partial<VillageRequest>): { v: VillageState; id: number } {
  const v = createVillage(ctx, 6, 0);
  const req: VillageRequest = { id: 500, fam: 'build', item: S[0].stages[0].item, need: S[0].stages[0].amount, got: 0, fr: 3, structure: 0, stage: 0, ...q };
  return { v: { ...v, requests: [...v.requests, req] }, id: req.id };
}

test('a partial delivery takes all the player has and leaves the request open', () => {
  const { v, id } = withRequest({});
  const item = S[0].stages[0].item as ItemType;
  const { p, src } = pockets(item, 5, 3);
  const res = deliverFrom(src, ctx, v, id, 10)!;
  assert.equal(res.taken, 8);
  assert.equal(res.completed, false);
  assert.equal(p.hotbar + p.bag, 0);
  assert.equal(res.village.requests.find(r => r.id === id)!.got, 8);
});

test('never more than the request still needs (the rest stays with the player)', () => {
  const { v, id } = withRequest({ got: S[0].stages[0].amount - 4 });
  const item = S[0].stages[0].item as ItemType;
  const { p, src } = pockets(item, 30, 30);
  const res = deliverFrom(src, ctx, v, id, 10)!;
  assert.equal(res.taken, 4);
  assert.equal(res.completed, true);
  assert.equal(p.hotbar + p.bag, 56);
  assert.equal(res.village.stage, 1, 'the structure moved on a stage');
});

test('items on the hotbar alone count', () => {
  const { v, id } = withRequest({});
  const { p, src } = pockets(S[0].stages[0].item as ItemType, 2, 0);
  assert.equal(deliverFrom(src, ctx, v, id, 10)!.taken, 2);
  assert.equal(p.hotbar, 0);
});

test('nothing to give: no delivery, no change', () => {
  const { v, id } = withRequest({});
  const { src } = pockets(ItemType.STONE, 9, 9);
  assert.equal(deliverFrom(src, ctx, v, id, 10), null);
});

test('a supply delivery fills the food store', () => {
  const food = NPC_CONFIG.SUPPLY_FOODS[0];
  const { v, id } = withRequest({ fam: 'supply', item: food.item, need: 3, structure: undefined, stage: undefined });
  const { src } = pockets(food.item as ItemType, 3, 0);
  const res = deliverFrom(src, ctx, v, id, 0)!;
  assert.ok(res.completed);
  assert.ok(Math.abs(res.village.food - (v.food + food.meals * 3)) < 1e-9);
});
