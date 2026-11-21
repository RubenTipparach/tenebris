// Cooking tests (openspec industry-and-nuclear, tasks 2.1, 2.2).
// Run: npx tsx scripts/cooking.test.ts
import { ItemType } from '../src/player/Inventory';
import { COOKER_SLOTS, FOOD, cookerKindOf } from '../src/config/CookingConfig';
import { FISH_ITEMS } from '../src/config/FishRosters';
import { CookerState, eat, emptyCookerSlots, findCookingRecipe, tickCooker, tickWellFed, wellFedFactor } from '../src/player/Cooking';
import { CRAFTING_RECIPES } from '../src/player/CraftingSystem';

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const near = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const slot = (itemType: ItemType, quantity = 1) => ({ itemType, quantity });
const fish = [...FISH_ITEMS][0];
const station = (kind: CookerState['kind'], inputs: ItemType[]): CookerState => {
  const slots = emptyCookerSlots();
  inputs.forEach((it, i) => { slots[i] = slot(it); });
  return { kind, slots, progress: 0 };
};
const run = (s: CookerState, seconds: number) => { const made: ItemType[] = []; for (let t = 0; t < seconds; t += 0.1) { const m = tickCooker(s, 0.1); if (m !== null) made.push(m); } return made; };

// ---- 2.1 recipes
ok(FISH_ITEMS.size >= 2, 'every planet\'s fish counts as fish');
ok(findCookingRecipe('campfire', station('campfire', [fish]).slots)?.recipe.output === ItemType.COOKED_FISH, 'campfire: fish -> cooked fish');
ok(findCookingRecipe('campfire', station('campfire', [ItemType.CLAY]).slots) === null, 'campfire: clay makes nothing');
ok(findCookingRecipe('kiln', station('kiln', [ItemType.CLAY]).slots)?.recipe.output === ItemType.CLAY_POT, 'kiln: clay -> clay pot');
ok(findCookingRecipe('kiln', station('kiln', [fish]).slots) === null, 'kiln: no fish');
const stew = findCookingRecipe('oven', station('oven', [ItemType.CLAY_POT, fish, ItemType.WATER_BUCKET]).slots);
ok(stew?.recipe.output === ItemType.FISH_STEW, 'oven: fish + water bucket + pot -> stew, any slot order');
ok(findCookingRecipe('oven', station('oven', [fish]).slots)?.recipe.output === ItemType.COOKED_FISH, 'oven: fish alone -> cooked fish');

// cooking over time: the stew uses one of each and gives the bucket back
const oven = station('oven', [fish, ItemType.WATER_BUCKET, ItemType.CLAY_POT]);
const made = run(oven, 11);
ok(made.length === 1 && made[0] === ItemType.FISH_STEW, 'stew cooks once in its time');
ok(oven.slots[COOKER_SLOTS.OUTPUT].itemType === ItemType.FISH_STEW, 'stew lands in the output');
ok(oven.slots[COOKER_SLOTS.RETURN].itemType === ItemType.BUCKET && oven.slots[COOKER_SLOTS.RETURN].quantity === 1, 'the bucket comes back');
ok([0, 1, 2].every(i => oven.slots[i].itemType === ItemType.NONE), 'inputs used up');

// a full output stops the station
const full = station('campfire', [fish]);
full.slots[COOKER_SLOTS.OUTPUT] = slot(ItemType.CLAY_POT, 1);
ok(run(full, 10).length === 0 && full.slots[0].quantity === 1, 'no room in the output: nothing cooks');
const stack = station('campfire', [fish]);
stack.slots[0].quantity = 3;
ok(run(stack, 6 * 3 + 1).length === 3 && stack.slots[COOKER_SLOTS.OUTPUT].quantity === 3, 'a stack of fish cooks into a stack');

// stations from their items, and their crafting recipes
ok(cookerKindOf(ItemType.CAMPFIRE) === 'campfire' && cookerKindOf(ItemType.KILN) === 'kiln' && cookerKindOf(ItemType.OVEN) === 'oven', 'items place their stations');
ok(cookerKindOf(ItemType.STONE) === null, 'stone is no station');
for (const item of [ItemType.CAMPFIRE, ItemType.KILN, ItemType.OVEN]) {
  ok(CRAFTING_RECIPES.some(r => r.output.itemType === item), `${ItemType[item]} is craftable`);
}

// ---- 2.2 eating and well fed
const fed = eat(ItemType.COOKED_FISH);
ok(fed !== null && fed.strength === FOOD[ItemType.COOKED_FISH]!.strength && fed.remainingS === 180, 'cooked fish: 0.15 for 3 min');
ok(eat(ItemType.FISH_STEW)?.remainingS === 480 && eat(ItemType.FISH_STEW)?.strength === 0.3, 'stew: 0.3 for 8 min');
ok(eat(ItemType.STONE) === null, 'stone is not food');
ok(near(wellFedFactor(fed), 0.85) && wellFedFactor(null) === 1, 'factor is 1 - strength (mining time, jetpack drain)');
let s = tickWellFed(fed, 100);
ok(s !== null && near(s.remainingS, 80), 'the timer counts down');
// eating again restarts, never stacks
const again = eat(ItemType.COOKED_FISH);
ok(again!.remainingS === 180 && again!.strength === 0.15, 'eating again restarts the timer (no stacking)');
s = tickWellFed(again, 179.5);
ok(s !== null && near(s.remainingS, 0.5), 'still fed just before the end');
ok(tickWellFed(s, 1) === null, 'runs out: no longer fed');
ok(wellFedFactor(tickWellFed(s, 1)) === 1, 'back to normal speed');
