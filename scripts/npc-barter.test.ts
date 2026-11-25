// Bartering with traders (openspec friendship-npcs, task 4.5): all or
// nothing from hotbar + bag together, a shared stock (the last unit goes
// once), a better rate - and extra offers - for a closer friend.
//   npx tsx scripts/npc-barter.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ItemType } from '../src/player/Inventory';
import { BarterPurse, barter } from '../src/npc/NpcBarter';
import { NPC_CONFIG, TraderState, offerPrice, offersFor } from '../src/shared/npc';

const RESIN = ItemType.RESIN, SILICA = ItemType.SILICA;
const trader = (stock = 3, takeN = 6): TraderState => ({
  at: 'sequoia', leg: 0, visits: 1, leaveT: 1e6, restockT: 1e6,
  offers: [
    { give: { item: SILICA, n: 4 }, take: { item: RESIN, n: takeN }, stock, max: stock, from: 'vesper' },
    { give: { item: SILICA, n: 9 }, take: { item: RESIN, n: 10 }, stock: 1, max: 1, from: 'vesper', minLevel: 2 },
  ],
});

function purse(hotbar: number, bag: number) {
  const p = { hotbar, bag, got: 0 };
  const src: BarterPurse = {
    getItemCount: (t) => (t === RESIN ? p.hotbar + p.bag : 0),
    removeItem: (t, n) => {
      if (t !== RESIN) return 0;
      const b = Math.min(p.bag, n); p.bag -= b;
      const h = Math.min(p.hotbar, n - b); p.hotbar -= h;
      return b + h;
    },
    give: (t, n) => { if (t === SILICA) p.got += n; return 0; },
  };
  return { p, src };
}

test('6 resin asked, 4 on the hotbar and 2 in the bag: the trade goes through', () => {
  const { p, src } = purse(4, 2);
  const r = barter(src, trader(), 0, 0);
  assert.ok(r.ok);
  assert.equal(p.hotbar + p.bag, 0);
  assert.equal(p.got, 4);
  if (r.ok) assert.equal(r.trader.offers[0].stock, 2, 'one unit of stock used');
});

test('5 of the 6 asked: refused and nothing taken', () => {
  const { p, src } = purse(5, 0);
  const s = trader();
  const r = barter(src, s, 0, 0);
  assert.deepEqual(r, { ok: false, why: 'short' });
  assert.equal(p.hotbar, 5);
  assert.equal(p.got, 0);
  assert.equal(s.offers[0].stock, 3, 'the trader is unchanged');
});

test('the last unit goes once: a second taker on the same state is refused', () => {
  const s = trader(1);
  const a = purse(6, 0), b = purse(6, 0);
  const ra = barter(a.src, s, 0, 0);
  assert.ok(ra.ok);
  // B traded against the state A changed (what the server holds after A's write)
  const rb = barter(b.src, ra.ok ? ra.trader : s, 0, 0);
  assert.deepEqual(rb, { ok: false, why: 'stock' });
  assert.equal(b.p.hotbar, 6, "B keeps what they would have paid");
});

test('a closer friend pays less, every level, never nothing', () => {
  const o = trader().offers[0];
  for (let level = 1; level < NPC_CONFIG.FRIENDSHIP.LEVELS.length; level++) {
    const before = offerPrice(o, level - 1), now = offerPrice(o, level);
    assert.ok(now < before || before === 1, `level ${level}: ${now} < ${before}`);
    assert.ok(now >= 1);
  }
  const { p, src } = purse(6, 0);
  const r = barter(src, trader(), 0, 2);
  assert.ok(r.ok);
  if (r.ok) assert.equal(r.paid, offerPrice(o, 2));
  assert.equal(p.hotbar, 6 - offerPrice(o, 2));
});

test('a friend sees extra offers', () => {
  assert.deepEqual(offersFor(trader(), 0), [0]);
  assert.deepEqual(offersFor(trader(), 2), [0, 1]);
  const { src } = purse(20, 0);
  assert.deepEqual(barter(src, trader(), 1, 1), { ok: false, why: 'hidden' });
});
