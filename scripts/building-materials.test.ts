// Building materials tests (openspec industry-and-nuclear, tasks 8.1-8.2).
// Run: npx tsx scripts/building-materials.test.ts
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ItemType, ITEM_DATA } from '../src/player/Inventory';
import { HexBlockType, blockFaces, isClearSolid, isTransparent, isSemiTransparent, sideFaceShows } from '../src/shared/blockTypes';
import { passesLight } from '../src/shared/voxelLight';
import { CRAFTING_RECIPES } from '../src/player/CraftingSystem';
import { ELECTRIC_SMELTING_RECIPES, electricRecipeFor, electricBatchReady, isElectricAdditive, isElectricInput } from '../src/config/SmeltingRecipes';
import { KILN_RECIPES } from '../src/config/KilnRecipes';

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---- 8.1 blocks: faces, their own drawn texture, and the item that places them
const hex = readFileSync(join(ROOT, 'src/planet/HexBlock.ts'), 'utf8');
const pbi = readFileSync(join(ROOT, 'src/player/PlanetBlockInteraction.ts'), 'utf8');
const BLOCKS: [HexBlockType, ItemType, string, string][] = [
  [HexBlockType.BRICK_BLOCK, ItemType.BRICK_BLOCK, 'brickBlock', 'building/brick_block'],
  [HexBlockType.CONCRETE_BLOCK, ItemType.CONCRETE_BLOCK, 'concrete', 'building/concrete'],
  [HexBlockType.STEEL_GIRDER, ItemType.STEEL_GIRDER, 'steelGirder', 'building/steel_girder'],
  [HexBlockType.STEEL_GLASS, ItemType.STEEL_GLASS, 'steelGlass', 'building/steel_glass'],
];
for (const [block, item, key, file] of BLOCKS) {
  const f = blockFaces(block);
  ok(f.top === key && f.side === key && f.bottom === key, `${HexBlockType[block]} has its own faces (${key})`);
  ok(hex.includes(`['${key}', '${file}']`) && existsSync(join(ROOT, 'public/textures', file + '.png')), `${HexBlockType[block]} has its own texture (${file}.png)`);
  ok(ITEM_DATA[item]?.texture === `/textures/${file}.png`, `${ItemType[item]} shows its block texture as its icon`);
  ok(pbi.includes(`case ItemType.${ItemType[item]}: return HexBlockType.${HexBlockType[block]};`), `${ItemType[item]} places ${HexBlockType[block]}`);
  ok(pbi.includes(`case HexBlockType.${HexBlockType[block]}: return ItemType.${ItemType[item]};`), `${HexBlockType[block]} mines into ${ItemType[item]}`);
}
ok(pbi.includes('case ItemType.CLAY: return HexBlockType.CLAY;'), 'the CLAY item places the CLAY block');
for (const icon of ['cement', 'steel_ingot']) ok(existsSync(join(ROOT, 'public/textures/icons', icon + '.png')), `icons/${icon}.png exists`);

// The see-through blocks go through the glass path: transparent, culled
// like glass, and let light through. Brick and concrete are opaque.
for (const b of [HexBlockType.STEEL_GLASS, HexBlockType.STEEL_GIRDER]) {
  ok(isClearSolid(b) && isTransparent(b) && isSemiTransparent(b) && passesLight(b), `${HexBlockType[b]} is see-through (glass path)`);
  ok(!sideFaceShows(b, b), `${HexBlockType[b]} hides the face against its own kind`);
  ok(sideFaceShows(HexBlockType.STONE, b), `stone shows its face through ${HexBlockType[b]}`);
  ok(sideFaceShows(b, HexBlockType.AIR), `${HexBlockType[b]} shows its face to air`);
}
ok(sideFaceShows(HexBlockType.STEEL_GLASS, HexBlockType.GLASS) === sideFaceShows(HexBlockType.GLASS, HexBlockType.GLASS), 'steel glass meets glass the way glass meets glass');
for (const b of [HexBlockType.BRICK_BLOCK, HexBlockType.CONCRETE_BLOCK]) {
  ok(!isTransparent(b) && !passesLight(b), `${HexBlockType[b]} is opaque`);
}

// Mining time rises dirt < clay < brick < glass < concrete = steel glass = steel girder
const mt = (i: ItemType) => ITEM_DATA[i].mineTime;
ok(mt(ItemType.DIRT) < mt(ItemType.CLAY) && mt(ItemType.CLAY) < mt(ItemType.BRICK_BLOCK) && mt(ItemType.BRICK_BLOCK) < mt(ItemType.GLASS)
  && mt(ItemType.GLASS) < mt(ItemType.CONCRETE_BLOCK), 'mining time: dirt < clay < brick < glass < concrete');
ok(mt(ItemType.CONCRETE_BLOCK) === mt(ItemType.STEEL_GLASS) && mt(ItemType.STEEL_GLASS) === mt(ItemType.STEEL_GIRDER), 'mining time: concrete = steel glass = steel girder');

// ---- 8.2 recipes
const recipe = (out: ItemType) => CRAFTING_RECIPES.find(r => r.output.itemType === out);
const count = (r: ReturnType<typeof recipe>, it: ItemType) => (r?.inputs ?? []).filter(i => i.itemType === it).reduce((a, i) => a + i.quantity, 0);
const slotsOk = (r: ReturnType<typeof recipe>) => !!r && new Set(r.inputs.map(i => i.slot)).size === r.inputs.length && r.inputs.every(i => i.slot !== undefined && i.slot >= 0 && i.slot < 9);

const brick = recipe(ItemType.BRICK_BLOCK);
ok(!!brick && count(brick, ItemType.BRICK) === 4 && brick.inputs.length === 4 && brick.output.quantity === 1 && slotsOk(brick), '4 BRICK -> 1 BRICK_BLOCK');
const concrete = recipe(ItemType.CONCRETE_BLOCK);
ok(!!concrete && count(concrete, ItemType.CEMENT) === 1 && count(concrete, ItemType.SAND) === 2 && count(concrete, ItemType.STONE) === 2
  && count(concrete, ItemType.WATER_BUCKET) === 1 && concrete.inputs.length === 6 && concrete.output.quantity === 4 && slotsOk(concrete),
  'CEMENT + 2 SAND + 2 STONE + WATER_BUCKET -> 4 CONCRETE_BLOCK');
ok(concrete?.returns?.itemType === ItemType.BUCKET && concrete.returns.quantity === 1, 'concrete gives the empty bucket back');
const girder = recipe(ItemType.STEEL_GIRDER);
ok(!!girder && count(girder, ItemType.STEEL_INGOT) === 2 && girder.inputs.length === 2 && girder.output.quantity === 4 && slotsOk(girder), '2 STEEL_INGOT -> 4 STEEL_GIRDER');
const sglass = recipe(ItemType.STEEL_GLASS);
ok(!!sglass && count(sglass, ItemType.STEEL_INGOT) === 1 && count(sglass, ItemType.GLASS) === 2 && sglass.inputs.length === 3 && sglass.output.quantity === 2 && slotsOk(sglass),
  'STEEL_INGOT + 2 GLASS -> 2 STEEL_GLASS');
const craftSrc = readFileSync(join(ROOT, 'src/player/CraftingSystem.ts'), 'utf8');
ok(/const returned = this\.selectedRecipe\.returns;\s*if \(returned\) this\.inventory\.addItem\(returned\.itemType, returned\.quantity\);/.test(craftSrc), 'crafting hands a recipe\'s returns back');

const cement = KILN_RECIPES.find(r => r.output === ItemType.CEMENT);
ok(!!cement && cement.inputs.some(i => i.itemType === ItemType.CLAY) && cement.inputs.some(i => i.itemType === ItemType.STONE) && cement.outputQuantity === 1,
  'kiln: CLAY + STONE -> CEMENT');

const steel = ELECTRIC_SMELTING_RECIPES.find(r => r.output === ItemType.STEEL_INGOT);
ok(!!steel && steel.input === ItemType.INGOT_IRON && steel.inputQuantity === 2 && steel.with?.itemType === ItemType.COAL && steel.with.quantity === 1 && steel.outputQuantity === 1,
  'electric furnace: 2 INGOT_IRON + 1 COAL -> STEEL_INGOT');
ok(electricRecipeFor(ItemType.INGOT_IRON, ItemType.COAL) === steel, 'iron ingots with coal run the steel row');
ok(electricRecipeFor(ItemType.INGOT_IRON, null) === undefined, 'iron ingots without coal run nothing');
ok(electricRecipeFor(ItemType.ORE_IRON, null)?.output === ItemType.INGOT_IRON, 'single-input rows still run without an additive');
ok(isElectricInput(ItemType.INGOT_IRON) && isElectricAdditive(ItemType.COAL) && !isElectricAdditive(ItemType.ORE_IRON), 'the slots take the right items');
ok(!electricBatchReady(steel!, 1, 1) && !electricBatchReady(steel!, 2, 0) && electricBatchReady(steel!, 2, 1), 'a steel batch needs 2 ingots and 1 coal');
ok(new Set(ELECTRIC_SMELTING_RECIPES.map(r => `${r.input}:${r.with?.itemType ?? ''}`)).size === ELECTRIC_SMELTING_RECIPES.length, 'no two electric rows share an input and additive');
