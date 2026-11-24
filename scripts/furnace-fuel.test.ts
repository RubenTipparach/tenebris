// Furnace fuel: coal waits in the fuel slot as a stack you can take back,
// and only lights one item at a time when a smelt needs it.
// Run: npx tsx scripts/furnace-fuel.test.ts
import './stub-shaders';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const { igniteFuel, furnaceHasFuel } = await import('../src/planet/Furnace');
const { ItemType } = await import('../src/player/Inventory');
const { SMELTS_PER_COAL } = await import('../src/config/SmeltingRecipes');

test('unburnt coal stays a whole stack until a smelt needs it', () => {
  const f = { fuelAmount: 0, fuelItem: ItemType.COAL as number | null, fuelCount: 3 };
  assert.ok(furnaceHasFuel(f));
  igniteFuel(f);
  assert.equal(f.fuelCount, 2);
  assert.equal(f.fuelAmount, SMELTS_PER_COAL);
  igniteFuel(f); // still burning - nothing more lights
  assert.equal(f.fuelCount, 2);
});

test('the last coal lighting empties the slot', () => {
  const f = { fuelAmount: 0, fuelItem: ItemType.COAL as number | null, fuelCount: 1 };
  igniteFuel(f);
  assert.equal(f.fuelCount, 0);
  assert.equal(f.fuelItem, null);
  f.fuelAmount = 0;
  assert.ok(!furnaceHasFuel(f));
});

test('old saves (burning fuel only, no stack) keep smelting', () => {
  const f = { fuelAmount: 5, fuelItem: null, fuelCount: 0 };
  assert.ok(furnaceHasFuel(f));
  igniteFuel(f);
  assert.equal(f.fuelAmount, 5);
});
