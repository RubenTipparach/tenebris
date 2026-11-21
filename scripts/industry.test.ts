// Industry foundation tests (openspec industry-and-nuclear, tasks 1.1-1.4).
// Run: npx tsx scripts/industry.test.ts
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ItemType, ITEM_DATA } from '../src/player/Inventory';
import { HexBlockType, blockFaces } from '../src/shared/blockTypes';
import { SMELTING_RECIPES, FURNACE_FUELS, furnaceFuel, SMELTS_PER_COAL } from '../src/config/SmeltingRecipes';
import { BUCKET_FILLS, bucketFill } from '../src/config/BucketFills';
import { DEPOSITS } from '../src/config/ResourceConfig';
import { SOLAR_SYSTEM } from '../src/config/SolarSystemConfig';

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ---- 1.1 every item has data and an icon on disk
const items = Object.values(ItemType).filter((v): v is ItemType => typeof v === 'number' && v !== ItemType.NONE);
const noData = items.filter(i => !ITEM_DATA[i]);
ok(noData.length === 0, `every ItemType has ITEM_DATA${noData.length ? ': missing ' + noData.map(i => ItemType[i]).join(', ') : ''}`);
const noIcon = items.filter(i => ITEM_DATA[i] && !existsSync(join(ROOT, 'public', ITEM_DATA[i].texture)));
ok(noIcon.length === 0, `every item's icon file exists${noIcon.length ? ': missing ' + noIcon.map(i => `${ItemType[i]} (${ITEM_DATA[i].texture})`).join(', ') : ''}`);
const parts = items.filter(i => ITEM_DATA[i]?.rocketPart);
const noModelTex = parts.filter(i => !existsSync(join(ROOT, 'public', ITEM_DATA[i].rocketPart!.texturePath)) ||
  !existsSync(join(ROOT, 'public', ITEM_DATA[i].rocketPart!.modelPath)));
ok(noModelTex.length === 0, `every rocket part's model and texture exist${noModelTex.length ? ': ' + noModelTex.map(i => ItemType[i]).join(', ') : ''}`);
const NEW = ['CLAY', 'BRICK', 'CLAY_POT', 'CRUDE_OIL_BUCKET', 'LAVA_BUCKET', 'KEROSENE', 'PLASTIC', 'ORE_URANIUM',
  'ENRICHED_URANIUM', 'FUEL_ROD', 'COOKED_FISH', 'FISH_STEW', 'CAMPFIRE', 'KILN', 'OVEN', 'PUMP_JACK', 'REFINERY',
  'CENTRIFUGE', 'REACTOR', 'NUCLEAR_FABRICATOR', 'BATTERY_LEAD_ACID', 'BATTERY_LITHIUM', 'BATTERY_SOLID_STATE',
  'NUCLEAR_THERMAL_ENGINE', 'ION_DRIVE', 'REACTOR_CORE', 'BATTERY_PACK'];
ok(NEW.every(n => typeof (ItemType as unknown as Record<string, number>)[n] === 'number'), 'all the change\'s items are declared');

// ---- 1.2 the new blocks have faces and their own textures
const hex = readFileSync(join(ROOT, 'src/planet/HexBlock.ts'), 'utf8');
for (const [block, key, file] of [[HexBlockType.CLAY, 'clay', 'resources/clay'], [HexBlockType.OIL_SAND, 'oilSand', 'resources/oil_sand'],
  [HexBlockType.ORE_URANIUM, 'oreUranium', 'resources/ore_uranium']] as const) {
  ok(blockFaces(block).top === key && blockFaces(block).side === key, `${HexBlockType[block]} has its own faces`);
  ok(hex.includes(`['${key}', '${file}']`) && existsSync(join(ROOT, 'public/textures', file + '.png')), `${HexBlockType[block]} has its own texture`);
}

// ---- 1.3 deposits come from per-body config
const body = (id: string) => SOLAR_SYSTEM.bodies.find(b => b.id === id)!;
const ores = (id: string) => (body(id).terrain.extraOres ?? []).map(d => d.type);
ok(!ores('earth').includes(HexBlockType.ORE_URANIUM), 'no uranium on Earth');
ok(ores('earth').includes(HexBlockType.OIL_SAND) && !!body('earth').terrain.shoreClay, 'Earth: oil deep down, clay on its shores');
for (const id of ['verdance', 'mirewood']) ok(ores(id).includes(HexBlockType.OIL_SAND), `${id}: oil`);
for (const id of ['moon', 'cinder']) ok(ores(id).includes(HexBlockType.ORE_URANIUM), `${id}: uranium`);
const metal = SOLAR_SYSTEM.bodies.filter(b => b.id === 'ferrite' || b.id === 'nickel' || b.id === 'magnetite');
ok(metal.length === 3 && metal.every(b => (b.terrain.extraOres ?? []).includes(DEPOSITS.URANIUM)), 'metal asteroids: uranium');
const others = SOLAR_SYSTEM.bodies.filter(b => !['moon', 'cinder', 'ferrite', 'nickel', 'magnetite'].includes(b.id));
ok(others.every(b => !(b.terrain.extraOres ?? []).includes(DEPOSITS.URANIUM)), 'uranium nowhere else');

// ---- 1.4 buckets and the furnace
ok(bucketFill(HexBlockType.WATER)?.fills === ItemType.WATER_BUCKET && bucketFill(HexBlockType.WATER)?.leaves === undefined, 'water fills a water bucket and stays');
ok(bucketFill(HexBlockType.OIL_SAND)?.fills === ItemType.CRUDE_OIL_BUCKET && bucketFill(HexBlockType.OIL_SAND)?.leaves === HexBlockType.STONE, 'oil sand: crude oil bucket, leaves stone');
ok(bucketFill(HexBlockType.MAGMA)?.fills === ItemType.LAVA_BUCKET && bucketFill(HexBlockType.MAGMA)?.leaves === HexBlockType.BASALT, 'magma: lava bucket, leaves basalt');
ok(bucketFill(HexBlockType.STONE) === undefined && new Set(BUCKET_FILLS.map(f => f.block)).size === BUCKET_FILLS.length, 'nothing else fills; one entry per block');
ok(SMELTING_RECIPES.some(r => r.input === ItemType.CLAY && r.output === ItemType.BRICK), 'clay smelts to brick');
ok(furnaceFuel(ItemType.LAVA_BUCKET)?.smelts === 12 && furnaceFuel(ItemType.LAVA_BUCKET)?.returns === ItemType.BUCKET, 'a lava bucket burns for 12 smelts and returns the bucket');
ok(SMELTS_PER_COAL === 8 && furnaceFuel(ItemType.COAL)?.returns === undefined, 'coal still burns for 8');
ok(FURNACE_FUELS.every(f => ITEM_DATA[f.itemType]), 'every fuel is an item');
