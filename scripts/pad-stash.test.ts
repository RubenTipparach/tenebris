// Only the cargo hold flies (openspec pad-stash): boarding at a pad stashes
// what the player carries, a parked rocket's hold takes it or the board is
// refused. Run: npx tsx scripts/pad-stash.test.ts
import './stub-shaders';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const el = () => ({ style: {} as Record<string, string>, innerHTML: '', textContent: '', hidden: false, disabled: false, remove() {}, append() {}, appendChild() {}, addEventListener() {}, querySelector: () => el(), classList: { add() {}, remove() {}, toggle() {} } });
(globalThis as unknown as { document: unknown }).document = { getElementById: () => null, createElement: el, body: { appendChild() {} }, addEventListener() {}, head: { appendChild() {} } };
(globalThis as unknown as { requestAnimationFrame: () => number }).requestAnimationFrame = () => 0;

const { Inventory, ItemType, ITEM_DATA } = await import('../src/player/Inventory');
const { CARRY } = await import('../src/config/CarryConfig');
const { SUITS } = await import('../src/config/SurvivalConfig');
const { isCarryExempt, stowCarried, takeAllInto, emptyStash, stashUsed, stashFromSave, stashForSave, copyStashInPlace } = await import('../src/rocket/CarryRules');
const { LaunchPadManager } = await import('../src/planet/LaunchPad');
const { RocketFlightManager } = await import('../src/rocket/RocketFlightManager');
const I = ItemType;
type Slot = { itemType: number; quantity: number; uses?: number };

const count = (slots: Slot[], t: number) => slots.filter(s => s.itemType === t).reduce((n, s) => n + s.quantity, 0);
const hold = (n: number): Slot[] => Array.from({ length: n }, () => ({ itemType: I.NONE, quantity: 0 }));

/** A player carrying materials and their survival gear */
function packedPlayer() {
  const inv = new Inventory();
  inv.addItem(I.STONE, 30);
  inv.addItem(I.LOG, 12);
  inv.addItem(I.ORE_IRON, 5);
  inv.addItem(I.IRON_PICKAXE, 1);
  inv.addItem(I.FISHING_ROD, 1);
  inv.addItem(I.OXYGEN_TANK, 3);
  inv.addItem(I.SUIT_HEATER, 1);
  inv.addItem(I.SPACE_SUIT, 1);
  return inv;
}

test('the exempt set is the config list: tools, suits, tanks, heaters stay; materials go', () => {
  for (const t of Object.keys(ITEM_DATA).map(Number)) {
    if (ITEM_DATA[t as ItemType].tool) assert.ok(isCarryExempt(t), `${ITEM_DATA[t as ItemType].name} is a tool`);
  }
  for (const t of Object.keys(SUITS).map(Number)) assert.ok(isCarryExempt(t));
  for (const t of CARRY.EXEMPT_ITEMS) assert.ok(isCarryExempt(t));
  for (const t of [I.STONE, I.LOG, I.ORE_IRON, I.STICK]) assert.ok(!isCarryExempt(t));
  // the list is the authority: take tools off it and a pickaxe goes too
  const noTools = { ...CARRY, EXEMPT_CATEGORIES: ['suit' as const] };
  assert.ok(!isCarryExempt(I.IRON_PICKAXE, noTools));
  assert.ok(isCarryExempt(I.SPACE_SUIT, noTools));
  // switched off: everything flies, as before pad-stash
  assert.ok(isCarryExempt(I.STONE, { ...CARRY, ENABLED: false }));
});

test('boarding at a pad: the materials go into its stash, the gear stays on the player', () => {
  const inv = packedPlayer();
  const stash = emptyStash();
  assert.equal(stash.length, CARRY.STASH_SLOTS);
  const r = stowCarried(inv.getAllSlots(), stash);
  assert.deepEqual(r, { moved: 47, overflow: 0 });
  assert.equal(count(stash, I.STONE), 30);
  assert.equal(count(stash, I.LOG), 12);
  assert.equal(count(stash, I.ORE_IRON), 5);
  for (const t of [I.STONE, I.LOG, I.ORE_IRON]) assert.equal(inv.getItemCount(t), 0);
  for (const t of [I.IRON_PICKAXE, I.FISHING_ROD, I.SUIT_HEATER, I.SPACE_SUIT]) assert.equal(inv.getItemCount(t), 1);
  assert.equal(inv.getItemCount(I.OXYGEN_TANK), 3);
});

test('re-boarding the same pad merges onto the stash', () => {
  const stash = emptyStash();
  const a = new Inventory();
  a.addItem(I.STONE, 30);
  stowCarried(a.getAllSlots(), stash);
  const b = new Inventory();
  b.addItem(I.STONE, 20);
  b.addItem(I.LOG, 4);
  stowCarried(b.getAllSlots(), stash);
  assert.equal(stash.filter(s => s.itemType === I.STONE).length, 1, 'one stack of stone');
  assert.equal(count(stash, I.STONE), 50);
  assert.equal(count(stash, I.LOG), 4);
});

test('taking the stash back: everything that fits returns to the hotbar + bag', () => {
  const inv = packedPlayer();
  const stash = emptyStash();
  stowCarried(inv.getAllSlots(), stash);
  assert.equal(takeAllInto(stash, inv.getAllSlots()), 47);
  assert.equal(stashUsed(stash), 0);
  assert.equal(inv.getItemCount(I.STONE), 30);
  assert.equal(inv.getItemCount(I.ORE_IRON), 5);
  // a full inventory keeps the rest in the stash
  const full = new Inventory();
  for (let i = 0; i < 36; i++) full.addItem(I.DIRT, 64);
  const s2 = emptyStash();
  s2[0] = { itemType: I.STONE, quantity: 10 };
  assert.equal(takeAllInto(s2, full.getAllSlots()), 0);
  assert.equal(count(s2, I.STONE), 10);
});

test('away from a pad only the cargo hold carries: boarding a parked rocket loads it', () => {
  const inv = new Inventory();
  inv.addItem(I.STONE, 10);
  inv.addItem(I.IRON_PICKAXE, 1);
  const cargo = hold(4);
  cargo[0] = { itemType: I.STONE, quantity: 60 };
  assert.deepEqual(stowCarried(inv.getAllSlots(), cargo), { moved: 10, overflow: 0 });
  assert.equal(count(cargo, I.STONE), 70);
  assert.equal(cargo.filter(s => s.itemType === I.STONE).length, 2, 'tops the stack to 64, then a new slot');
  assert.equal(inv.getItemCount(I.STONE), 0);
  assert.equal(inv.getItemCount(I.IRON_PICKAXE), 1);
});

test('a hold (or stash) too small refuses: nothing moves', () => {
  const inv = new Inventory();
  const kinds = [I.STONE, I.DIRT, I.SAND, I.LOG, I.WOOD, I.STICK];
  for (const t of kinds) inv.addItem(t, 5);
  const cargo = hold(4);
  const r = stowCarried(inv.getAllSlots(), cargo);
  assert.equal(r.moved, 0);
  assert.equal(r.overflow, 10);
  assert.equal(stashUsed(cargo), 0, 'the hold is untouched');
  for (const t of kinds) assert.equal(inv.getItemCount(t), 5, 'the player keeps everything');
  // no hold at all: refused whenever anything non-exempt is carried
  assert.equal(stowCarried(inv.getAllSlots(), null).overflow, 30);
  // ...but carrying only gear boards fine
  const gear = new Inventory();
  gear.addItem(I.OXYGEN_TANK, 2);
  assert.deepEqual(stowCarried(gear.getAllSlots(), null), { moved: 0, overflow: 0 });
});

test('the flight manager stows before boarding and a refusal stops both boarding paths', () => {
  const calls: string[] = [];
  let removed = false;
  const fm = Object.create(RocketFlightManager.prototype) as InstanceType<typeof RocketFlightManager>;
  Object.assign(fm, {
    isInFlightMode: false,
    landedRocketManager: { removeLandedRocket: () => { removed = true; } },
  });
  fm.setBoardingStow((_into, where) => { calls.push(where); return 'Not enough room in the cargo hold'; });
  const stash = emptyStash();
  const pad = { rocketParts: [{}], stash } as never;
  assert.equal(fm.enterFlightMode(pad), false);
  const cargo = hold(4);
  assert.equal(fm.boardLandedRocket({ id: 'x', cargo } as never), false);
  assert.deepEqual(calls, ['stash', 'cargo'], 'a pad boards into its stash, a parked rocket into its hold');
  assert.equal(removed, false, 'a refused parked rocket stays parked');
});

test('older saves: a pad record without a stash loads an empty one; the record omits an empty stash', () => {
  const s = stashFromSave(undefined);
  assert.equal(s.length, CARRY.STASH_SLOTS);
  assert.equal(stashUsed(s), 0);
  assert.equal(stashForSave(s), undefined);
  // a saved stash round-trips (unknown items dropped), into the live slots in place
  const live = emptyStash();
  const keep = live[2];
  live[2].itemType = I.LOG; live[2].quantity = 3;
  const saved = stashForSave(live)!;
  assert.equal(saved.length, CARRY.STASH_SLOTS);
  const back = stashFromSave([...saved.slice(0, 2), { itemType: 99999, quantity: 1 }, ...saved.slice(2)]);
  copyStashInPlace(live, back);
  assert.equal(live[2], keep, 'the same slot objects (an open panel keeps them)');
  assert.equal(count(live, I.LOG), 3);
  assert.equal(stashUsed(live), 1);
});

test('a pad holding a stash cannot lose its last block', () => {
  const blocker = LaunchPadManager.prototype.hexRemovalBlocker;
  const pad = { rocketParts: [], segmentCount: 0, rocketTileIndex: -1, surroundingTileIndices: [], towerTileIndex: -1, hexes: new Map([[5, {}]]), stash: emptyStash() };
  assert.equal(blocker.call(null as never, pad as never, 5), null);
  pad.stash[0] = { itemType: I.STONE, quantity: 1 };
  assert.match(blocker.call(null as never, pad as never, 5) ?? '', /stash/);
  pad.hexes.set(6, {});
  assert.equal(blocker.call(null as never, pad as never, 5), null, 'other blocks may go');
});
