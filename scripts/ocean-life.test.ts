// Ocean life tests (openspec ocean-life, tasks 1.1 and 1.2): sea fauna rosters,
// the swimming fish = the fishing table, the jungle moons' fish, and the swim
// depth clamp. Run: npx tsx scripts/ocean-life.test.ts
import { existsSync, readFileSync } from 'fs';
import {
  FAUNA_SPECIES, FAUNA_SPECIES_IDS, FAUNA_LIFELESS, faunaRoster, fishFaunaId, isWaterLife, habitatOf, validateFaunaRosters, waterLife,
} from '../src/config/FaunaConfig';
import { FISH_ROSTERS, FISH_ITEMS } from '../src/config/FishRosters';
import { ITEM_DATA, ItemType } from '../src/player/Inventory';
import { SOLAR_SYSTEM } from '../src/config/SolarSystemConfig';
import { buildFaunaModel } from '../src/planet/FaunaModels';
import { swimRadius, clearsSeabed, columnRadius } from '../src/planet/SwimRules';
import { emptyCookerSlots, findCookingRecipe } from '../src/player/Cooking';

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };

const bodies = SOLAR_SYSTEM.bodies;
const wet = new Set(bodies.filter(b => b.terrain?.hasWater).map(b => b.id));
const all = bodies.map(b => b.id);
const water = FAUNA_SPECIES_IDS.filter(id => isWaterLife(FAUNA_SPECIES[id]));

// ---- rosters: every water species on exactly one planet, a planet with water
const homes = new Map<string, Set<string>>();
for (const p of all) for (const id of faunaRoster(p)) (homes.get(id) ?? homes.set(id, new Set()).get(id)!).add(p);
ok(water.every(id => homes.get(id)?.size === 1), `every water species lives on exactly one planet (${water.length} species)`);
ok(water.every(id => wet.has(FAUNA_SPECIES[id].planet)), 'every water species lives on a world with water');
const fishHome = new Map<ItemType, string[]>();
for (const [p, fish] of Object.entries(FISH_ROSTERS)) for (const f of fish) fishHome.set(f.item, [...(fishHome.get(f.item) ?? []), p]);
ok([...fishHome.values()].every(ps => ps.length === 1), 'every fish is on exactly one planet\'s fishing table');
ok(Object.keys(FISH_ROSTERS).every(p => wet.has(p)), 'fish only on worlds with water');

// ---- lifeless worlds have no water life (nor any world without water)
const dry = all.filter(p => !wet.has(p));
ok(dry.every(p => !faunaRoster(p).some(id => isWaterLife(FAUNA_SPECIES[id])) && !(FISH_ROSTERS[p]?.length)),
  `no world without water has water life or fish (${dry.length} dry worlds)`);
ok(FAUNA_LIFELESS.every(p => faunaRoster(p).length === 0 && !(FISH_ROSTERS[p]?.length)), 'the lifeless worlds have nobody, in water or out');
let threw = '';
const info = console.info; console.info = () => {};
try { validateFaunaRosters(all, wet); } catch (e) { threw = String(e); }
console.info = info;
ok(!threw, `the startup roster check passes with the water worlds ${threw}`);

// ---- the visible fish on a planet == its fishing table (derived, not copied)
for (const p of all) {
  const swimming = faunaRoster(p).filter(id => FAUNA_SPECIES[id].fish).sort();
  const table = (FISH_ROSTERS[p] ?? []).map(fishFaunaId).sort();
  if (!swimming.length && !table.length) continue;
  ok(JSON.stringify(swimming) === JSON.stringify(table), `${p}: the fish that swim are its fishing table (${table.length})`);
}
ok(FAUNA_SPECIES_IDS.filter(id => FAUNA_SPECIES[id].fish).every(id => FAUNA_SPECIES[id].motion === 'swim'), 'derived fish all swim');

// ---- every sea world has its fish plus at least one other creature
for (const p of ['earth', 'sequoia', 'verdance', 'mirewood']) {
  const roster = faunaRoster(p).filter(id => isWaterLife(FAUNA_SPECIES[id]));
  ok(roster.some(id => FAUNA_SPECIES[id].fish) && roster.some(id => !FAUNA_SPECIES[id].fish), `${p}: fish and another sea creature`);
}
const earth = faunaRoster('earth');
ok(['crab', 'jellyfish', 'seaTurtle'].every(id => earth.includes(id)), 'Earth: crab, jellyfish, sea turtle');
ok(FAUNA_SPECIES.crab.habitat === 'seabed' && FAUNA_SPECIES.jellyfish.motion === 'drift' && FAUNA_SPECIES.seaTurtle.motion === 'swim',
  'crabs walk the seabed, jellies drift, turtles swim');
ok(faunaRoster('sequoia').includes('lanternSquid') && FAUNA_SPECIES.lanternSquid.glow > 0 && habitatOf(FAUNA_SPECIES.shellCrawler) === 'seabed',
  'Sequoia: a glowing lantern squid and a seabed shell crawler');

// ---- the jungle moons: >= 3 fish each, items with icons on disk, catchable
for (const p of ['verdance', 'mirewood']) {
  const fish = FISH_ROSTERS[p] ?? [];
  ok(fish.length >= 3, `${p} has ${fish.length} fish`);
  for (const f of fish) {
    const d = ITEM_DATA[f.item];
    const icon = d && new URL(`../public${d.texture}`, import.meta.url);
    ok(!!d && d.stackSize === 16 && d.mineTime === 0.3 && !!icon && existsSync(icon), `${f.name}: an item (stack 16) with an icon on disk`);
    ok(f.item >= 180 && f.item <= 199, `${f.name}: item id ${f.item} in the free 180-199 block`);
    const slots = emptyCookerSlots();
    slots[0] = { itemType: f.item, quantity: 1 };
    ok(FISH_ITEMS.has(f.item) && findCookingRecipe('campfire', slots)?.recipe.output === ItemType.COOKED_FISH,
      `${f.name}: counts as "any fish" (a campfire cooks it)`);
  }
  ok(fish.some(g => g.minDepth <= 1), `${p}: something bites in one block of water`);
}

// ---- models and clips: every water species builds, and its clips name its parts
for (const id of water) {
  const model = buildFaunaModel(id);
  const names = new Set(model.parts.map(pt => pt.name));
  const anim = FAUNA_SPECIES[id].anim ?? id;
  const path = new URL(`../public/animations/${anim}.anim.json`, import.meta.url);
  if (!existsSync(path)) { ok(false, `${id}: ${anim}.anim.json exists`); continue; }
  const file = JSON.parse(readFileSync(path, 'utf8'));
  const tracks = Object.values(file.clips as Record<string, { tracks: Record<string, unknown> }>).flatMap(c => Object.keys(c.tracks));
  ok(file.clips.idle && file.clips.move && tracks.every(t => names.has(t)) && model.geometry.getAttribute('position').count > 0,
    `${id}: a model, idle + move clips (${anim}), every track names a part`);
}

// ---- the swim depth clamp keeps a swimmer inside the water
let rnd = 12345;
const rand = () => { rnd = (Math.imul(rnd, 1103515245) + 12345) >>> 0; return rnd / 4294967296; };
let inside = true, honoured = true, entered = true;
for (let i = 0; i < 20000; i++) {
  const seabed = 50 + rand() * 50;
  const surface = seabed + 0.01 + rand() * 8;
  const bed = rand() * 1.5, top = rand() * 1.5;
  const want = seabed - 5 + rand() * (surface - seabed + 10);
  const r = swimRadius(want, seabed, surface, bed, top);
  if (!(r > seabed && r < surface)) inside = false;
  if (seabed + bed <= surface - top && !(r >= seabed + bed - 1e-9 && r <= surface - top + 1e-9)) honoured = false;
  // anywhere the clamp puts it clears that column's bed (so it can always enter it)
  if (!clearsSeabed(r, seabed, surface, bed)) entered = false;
}
ok(inside, 'swimRadius: always strictly between seabed and surface (20000 random columns)');
ok(honoured, 'swimRadius: keeps both margins when the column is deep enough');
ok(entered, 'clearsSeabed: a clamped swimmer always clears its own column');
ok(swimRadius(60, 50, 51, 0.8, 0.8) === 50.5, 'a column too shallow for the margins: the middle of the water');
ok(!clearsSeabed(50.1, 50, 58, 0.5), 'a swimmer below a rising seabed must rise first');
ok(columnRadius(10, 20, 0.25) === 12.5, 'column fraction 0.25 is a quarter of the way up');
ok(['earth', 'sequoia', 'verdance', 'mirewood'].every(p => waterLife(p).siteChance > 0), 'every sea world has water spawn numbers');
