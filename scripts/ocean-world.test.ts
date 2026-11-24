// Thalassa, the ocean world (openspec space-exploration, phase 7):
// placement, nine-tenths sea with islands, its own life, the deep band.
//   npx tsx scripts/ocean-world.test.ts
import { SOLAR_SYSTEM, getBodyConfig, bodyClearanceProblems, bodyEnvironment, assertFloraRostersDisjoint } from '../src/config/SolarSystemConfig';
import { VISIT_ROUTE, BODY_RESOURCES } from '../src/config/Missions';
import { FISH_ROSTERS } from '../src/config/FishRosters';
import { faunaRoster, FAUNA_SPECIES, isWaterLife } from '../src/config/FaunaConfig';
import { DEPTH_BANDS, depthBandAt } from '../src/config/DivingConfig';
import { surfaceDepthAt } from '../src/shared/terrainShape';
import { PlayerConfig } from '../src/config/PlayerConfig';
import { ItemType } from '../src/player/Inventory';
const EARTH_TREES = ['pine', 'oak', 'birch'];

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const thal = getBodyConfig('thalassa')!;

// ---- 7.1 placement and shape
ok(!!thal && thal.landable && thal.terrain.hasWater, 'Thalassa is a landable sea world');
ok(bodyClearanceProblems().length === 0, `no gravity well overlaps (${bodyClearanceProblems().join('; ')})`);
const visit = VISIT_ROUTE.find(v => v.body === 'thalassa');
const aurelia = VISIT_ROUTE.find(v => v.body === 'aurelia');
ok(visit?.parent === 'visit_kessel' && aurelia?.parent === 'visit_thalassa', 'on the outward route between Kessel and Aurelia');
const env = bodyEnvironment('thalassa');
ok(env.atmosphereDensity > 1 && env.temperature === 'temperate' && thal.breathable === true, 'thick, breathable air');

// The share of sea, sampled with the game's own shape function and the
// params Planet builds from this config (several world seeds)
const seaLevel = thal.terrain.seaLevel ?? PlayerConfig.TERRAIN_SEA_LEVEL;
const maxDepth = seaLevel + (thal.terrain.maxDepth ?? PlayerConfig.TERRAIN_MAX_DEPTH);
const shape = (seed: number) => ({
  seed, maxDepth, seaLevel, maxHeight: PlayerConfig.TERRAIN_MAX_HEIGHT, heightVariation: thal.visual.heightVariation ?? 1,
  continentScale: PlayerConfig.TERRAIN_CONTINENT_SCALE, mountainScale: PlayerConfig.TERRAIN_MOUNTAIN_SCALE,
  hillScale: PlayerConfig.TERRAIN_HILL_SCALE, detailScale: PlayerConfig.TERRAIN_DETAIL_SCALE,
  continentWeight: PlayerConfig.TERRAIN_CONTINENT_WEIGHT, mountainHeight: PlayerConfig.TERRAIN_MOUNTAIN_HEIGHT,
  hillWeight: PlayerConfig.TERRAIN_HILL_WEIGHT, detailWeight: PlayerConfig.TERRAIN_DETAIL_WEIGHT,
  oceanDepthPower: PlayerConfig.TERRAIN_OCEAN_DEPTH_POWER, terrainMaxDepth: maxDepth - seaLevel, seaBias: thal.terrain.seaBias,
});
const N = 3000;
const dirs = Array.from({ length: N }, (_, i) => { const y = 1 - 2 * (i + 0.5) / N, r = Math.sqrt(1 - y * y), t = i * 2.399963; return { x: Math.cos(t) * r * 100, y: y * 100, z: Math.sin(t) * r * 100 }; });
for (const world of [0, 12345, 987654]) {
  const p = shape(PlayerConfig.TERRAIN_SEED + world + (thal.terrain.seed ?? 0));
  const sea = maxDepth - 1 - seaLevel;
  const water = dirs.map(d => sea - surfaceDepthAt(d, p));
  const share = water.filter(w => w > 0).length / N;
  const deep = water.filter(w => w >= DEPTH_BANDS.thalassa![0].minDepthM).length / N;
  ok(share >= 0.9 && share < 0.99, `world seed ${world}: ${(share * 100).toFixed(0)}% ocean, with islands`);
  ok(deep > 0.05, `world seed ${world}: ${(deep * 100).toFixed(0)}% of it deep enough for the deuterium band`);
}
// Earth keeps its own split (no sea bias)
ok(!getBodyConfig('earth')!.terrain.seaBias, "Earth's land and sea unchanged");

// ---- 7.2 its own life
ok(Object.keys(thal.flora ?? {}).length >= 2 && (thal.seaFlora?.zones.length ?? 0) >= 4, 'its own island trees and sea flora');
let threw = false;
try { assertFloraRostersDisjoint(SOLAR_SYSTEM.bodies, EARTH_TREES); } catch { threw = true; }
ok(!threw, 'flora rosters (land and sea) disjoint across every body, Thalassa included');
const fishOwner = new Map<ItemType, string>();
let fishLeak = false;
for (const [planet, fish] of Object.entries(FISH_ROSTERS)) for (const f of fish ?? []) { if (fishOwner.has(f.item)) fishLeak = true; fishOwner.set(f.item, planet); }
ok(!fishLeak && (FISH_ROSTERS.thalassa?.length ?? 0) >= 3, 'Thalassa has three fish of its own; no fish on two worlds');
const sea = faunaRoster('thalassa').filter(id => isWaterLife(FAUNA_SPECIES[id]));
ok(sea.some(id => !FAUNA_SPECIES[id].fish), 'and a sea creature of its own (the chain salp)');

// ---- 7.3 the deep band
ok(BODY_RESOURCES.thalassa?.includes(ItemType.DEUTERIUM) === true, "deuterium is Thalassa's resource");
const band = DEPTH_BANDS.thalassa![0];
ok(depthBandAt('thalassa', band.minDepthM - 0.01) === null, 'no deuterium above the band');
ok(depthBandAt('thalassa', band.minDepthM)?.item === ItemType.DEUTERIUM && depthBandAt('thalassa', band.minDepthM + 6)?.item === ItemType.DEUTERIUM, 'deuterium in it and below');
ok(depthBandAt('earth', 100) === null && depthBandAt('sequoia', 100) === null, 'no other sea holds it');

// ---- every texture its tileset names is on disk (a missing one draws magenta)
import { existsSync } from 'fs';
for (const [k, v] of Object.entries(thal.tileset ?? {})) {
  if (typeof v !== 'string' || !v.endsWith('.png')) continue;
  ok(existsSync(new URL(`../public${v}`, import.meta.url)), `tileset ${k}: ${v} exists`);
}
