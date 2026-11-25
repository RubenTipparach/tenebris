// The shared NPC rules (openspec friendship-npcs, tasks 1.2-1.4): the
// population builder, village food / requests / structures, traders, and
// the world-time catch-up.
// Run: npx tsx scripts/npc-rules.test.ts
import {
  buildPopulation, placePopulation, angleBetween, GroundProbe,
  createVillage, advanceVillage, deliver, foodAt, foodLowMark, VillageState, VillageCtx,
  createTraders, advanceTradersOn, TraderState,
  createPlanetNpc, advancePlanet, catchUpPlanet, NPC_WORLD_TIME, PlanetNpc,
} from '../src/shared/npc';
import { catchUpSeconds, worldTimeSubsystems } from '../src/shared/worldTime';
import { INHABITED_WORLDS, NPC_CONFIG, inhabitedWorld } from '../src/config/NpcConfig';
import { SOLAR_SYSTEM } from '../src/config/SolarSystemConfig';
import { PlayerConfig } from '../src/config/PlayerConfig';
import { surfaceDepthAt, ShapeParams } from '../src/shared/terrainShape';
import { sampleCity, CityKind } from '../src/shared/cityGen';
import type { Vec3 } from '../src/shared/vec3';

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const SEEDS = Array.from({ length: 40 }, (_, i) => 1000 + i * 7919);

// ============================================================ 1.2 population
{
  let deterministic = true, sizes = true, elders = true, homesIn = true, lifeless = true, uniqueNames = true;
  for (const w of INHABITED_WORLDS) {
    for (const seed of SEEDS) {
      const a = buildPopulation(seed, w.body)!, b = buildPopulation(seed, w.body)!;
      if (!same(a, b)) deterministic = false;
      if (a.npcs.length < w.population[0] || a.npcs.length > w.population[1]) sizes = false;
      for (const v of a.villages) {
        const inV = a.npcs.filter(n => n.village === v.index);
        if (inV.filter(n => n.role === 'elder').length !== 1 || v.elder !== inV.find(n => n.role === 'elder')?.id) elders = false;
        if (!same(inV.map(n => n.id).sort(), [...v.residents].sort())) homesIn = false;
      }
      if (new Set(a.npcs.map(n => n.name)).size !== a.npcs.length) uniqueNames = false;
      if (a.npcs.some(n => n.species !== w.species.id)) sizes = false;
    }
  }
  for (const b of ['earth', 'moon', 'kessel', 'nerith', 'talus', 'glacia']) if (buildPopulation(1, b) !== null) lifeless = false;
  ok(deterministic, 'same (worldSeed, body) gives the same people');
  ok(sizes, `population sizes in range for every world over ${SEEDS.length} seeds, all of the world's species`);
  ok(elders && homesIn, 'every village has exactly one elder, and every resident is in one village');
  ok(uniqueNames, 'names are unique on a world');
  ok(lifeless, 'Earth, the Moon, lifeless rocks and asteroids have nobody');
  const s1 = buildPopulation(1, 'sequoia')!, s2 = buildPopulation(2, 'sequoia')!;
  ok(!same(s1.npcs.map(n => n.name), s2.npcs.map(n => n.name)), 'another game world has other people');
}

// Homes on walkable ground: the client hands placement its ground test
// (task 3.3 wires the planet's own). This stands in for it with the shared
// terrain height field (land above sea level) and, on the city world, the
// city sampler (streets, plazas and parks; not inside a building).
function groundFor(body: string, worldSeed: number): { probe: GroundProbe; radius: number } {
  const cfg = SOLAR_SYSTEM.bodies.find(b => b.id === body)!;
  const t = cfg.terrain;
  const seaLevel = t.seaLevel ?? PlayerConfig.TERRAIN_SEA_LEVEL;
  const maxDepth = seaLevel + (t.maxDepth ?? PlayerConfig.TERRAIN_MAX_DEPTH);
  const seed = worldSeed + (t.seed ?? 0);
  if (t.city) {
    const tileAngle = 1 / (cfg.radius * 1.2);
    const open = new Set([CityKind.ROAD, CityKind.SIDEWALK, CityKind.PLAZA, CityKind.PARK]);
    return { radius: cfg.radius, probe: (d: Vec3) => open.has(sampleCity(d.x, d.y, d.z, seed, t.city!, tileAngle).kind) };
  }
  const p: ShapeParams = {
    seed, maxDepth, seaLevel, maxHeight: PlayerConfig.TERRAIN_MAX_HEIGHT, heightVariation: cfg.visual.heightVariation ?? 1,
    continentScale: PlayerConfig.TERRAIN_CONTINENT_SCALE, mountainScale: PlayerConfig.TERRAIN_MOUNTAIN_SCALE,
    hillScale: PlayerConfig.TERRAIN_HILL_SCALE, detailScale: PlayerConfig.TERRAIN_DETAIL_SCALE,
    continentWeight: PlayerConfig.TERRAIN_CONTINENT_WEIGHT, mountainHeight: PlayerConfig.TERRAIN_MOUNTAIN_HEIGHT,
    hillWeight: PlayerConfig.TERRAIN_HILL_WEIGHT, detailWeight: PlayerConfig.TERRAIN_DETAIL_WEIGHT,
    oceanDepthPower: PlayerConfig.TERRAIN_OCEAN_DEPTH_POWER, terrainMaxDepth: maxDepth - seaLevel,
    seaBias: t.seaBias ?? 0, radius: cfg.radius,
  };
  const seaDepth = maxDepth - 1 - seaLevel;
  const wet = t.hasWater;
  return { radius: cfg.radius, probe: (d: Vec3) => !wet || surfaceDepthAt(d, p) > seaDepth };
}
{
  let grounded = 0, total = 0, onProbe = true, inRadius = true, repeatable = true, apart = true;
  const ungroundedWorlds = new Set<string>();
  for (const w of INHABITED_WORLDS) {
    for (const seed of SEEDS.slice(0, 12)) {
      const pop = buildPopulation(seed, w.body)!;
      const { probe, radius } = groundFor(w.body, seed);
      // half the seeds anchor the first village on the north pole (land or
      // sea), half on a seeded spot
      const anchor = seed % 2 ? { x: 0, y: 1, z: 0 } : undefined;
      const pl = placePopulation(seed, pop, { radiusM: radius, ground: probe, anchor });
      const again = placePopulation(seed, pop, { radiusM: radius, ground: probe, anchor });
      if (!same([...pl.homes], [...again.homes]) || !same(pl.villages, again.villages)) repeatable = false;
      for (let i = 1; i < pl.villages.length; i++) {
        if (pl.villages[i].grounded && pl.villages[0].grounded && angleBetween(pl.villages[0].dir, pl.villages[i].dir) * radius < NPC_CONFIG.VILLAGE.MIN_GAP_M - 1e-6) apart = false;
      }
      for (const n of pop.npcs) {
        const h = pl.homes.get(n.id)!;
        total++;
        if (h.grounded) { grounded++; if (!probe(h.dir)) onProbe = false; } else ungroundedWorlds.add(w.body);
        if (angleBetween(h.dir, pl.villages[n.village].dir) * radius > NPC_CONFIG.VILLAGE.RADIUS_M + 1e-6) inRadius = false;
      }
    }
  }
  ok(repeatable, 'placement is deterministic for a seed and ground');
  ok(onProbe, 'every home flagged grounded is on walkable ground');
  ok(grounded === total, `homes on walkable ground on every world (${grounded}/${total}${ungroundedWorlds.size ? `; a few left for the motion code to settle on ${[...ungroundedWorlds].join(', ')}` : ''})`);
  ok(inRadius, `every home is within ${NPC_CONFIG.VILLAGE.RADIUS_M} m of its village centre`);
  ok(apart, `villages are at least ${NPC_CONFIG.VILLAGE.MIN_GAP_M} m apart`);
  // Nowhere to stand: still placed, flagged for the motion code
  const pop = buildPopulation(5, 'sequoia')!;
  const none = placePopulation(5, pop, { radiusM: 100, ground: () => false });
  ok([...none.homes.values()].every(h => !h.grounded), 'with no walkable ground anywhere every spot is flagged ungrounded (never silently placed)');
}

// ============================================================ 1.3 villages
const F = NPC_CONFIG.FOOD, R = NPC_CONFIG.REQUESTS;
const ctx: VillageCtx = { worldSeed: 4242, body: 'sequoia', index: 0 };
const rate = (v: VillageState) => F.USE_PER_RESIDENT_PER_HOUR * v.pop / 3600;
{
  const v0 = createVillage(ctx, 4, 0);
  ok(v0.food === F.START_PER_RESIDENT * 4 && v0.requests.length === R.OPEN, `a new village: a full store and ${R.OPEN} open requests`);
  ok(same(v0, createVillage(ctx, 4, 0)), 'requests are drawn deterministically');
  const v1 = advanceVillage(ctx, v0, 0, 3600);
  ok(Math.abs(foodAt(v1, 3600) - (v0.food - rate(v0) * 3600)) < 1e-9, 'food is used up while time advances');

  // a village with no supply request open: running low opens one
  const noSupply: VillageState = { ...JSON.parse(JSON.stringify(v0)), requests: v0.requests.filter(q => q.fam !== 'supply') };
  while (noSupply.requests.length + noSupply.reopen.length < R.OPEN) noSupply.reopen.push(1e9);
  const lowAt = (noSupply.food - foodLowMark(noSupply)) / rate(noSupply);
  const before = advanceVillage(ctx, noSupply, 0, lowAt - 1);
  const after = advanceVillage(ctx, noSupply, 0, lowAt + 1);
  ok(!before.requests.some(q => q.fam === 'supply'), 'above the low mark no supply request opens');
  ok(after.requests.some(q => q.fam === 'supply'), 'a low store opens a supply request');
  ok(after.requests.length + after.reopen.length === R.OPEN, 'it takes a waiting slot rather than adding one');

  // completing a build request: the structure's next stage, a new request after the delay
  let v = v0;
  if (!v.requests.some(q => q.fam === 'build')) {
    v = { ...v, requests: [...v.requests.slice(0, R.OPEN - 1), { id: 99, fam: 'build', item: NPC_CONFIG.STRUCTURES[0].stages[0].item, need: NPC_CONFIG.STRUCTURES[0].stages[0].amount, got: 0, fr: R.FRIENDSHIP.build, structure: 0, stage: 0 }] };
  }
  const build = v.requests.find(q => q.fam === 'build')!;
  const part = deliver(ctx, v, build.id, 5, 100);
  ok(part.taken === 5 && part.village.requests.find(q => q.id === build.id)!.got === 5 && !part.completed, 'a partial delivery counts and leaves the rest needed');
  const over = deliver(ctx, part.village, build.id, build.need * 10, 120);
  ok(over.taken === build.need - 5 && over.completed, 'no over-delivery: only what is still needed is taken');
  ok(over.village.stage === 1 && over.village.structure === 0, 'a completed build request raises the structure a stage');
  ok(over.village.requests.length === R.OPEN - 1 && over.village.reopen.includes(120 + R.REOPEN_DELAY_S), 'its slot reopens after the delay');
  const waiting = advanceVillage(ctx, over.village, 120, 120 + R.REOPEN_DELAY_S - 1);
  const reopened = advanceVillage(ctx, over.village, 120, 120 + R.REOPEN_DELAY_S);
  ok(waiting.requests.length === R.OPEN - 1 && reopened.requests.length === R.OPEN, 'a new request opens when the delay is up, not before');
  ok(!same(reopened.requests.map(q => q.id).sort(), over.village.requests.map(q => q.id).sort()), 'and it is a new request');

  // a supply request: meals into the store
  const sv: VillageState = { ...JSON.parse(JSON.stringify(v0)), requests: [{ id: 50, fam: 'supply', item: NPC_CONFIG.SUPPLY_FOODS[1].item, need: 4, got: 0, fr: 6 }] };
  const fed = deliver(ctx, sv, 50, 4, 600);
  ok(Math.abs(foodAt(fed.village, 600) - (foodAt(sv, 600) + 4 * NPC_CONFIG.SUPPLY_FOODS[1].meals)) < 1e-9, 'a completed supply request fills the store');
  // a collect request: the piece goes on display
  const cv: VillageState = { ...JSON.parse(JSON.stringify(v0)), requests: [{ id: 51, fam: 'collect', art: 'art_umbra', need: 1, got: 0, fr: 20 }] };
  ok(deliver(ctx, cv, 51, 1, 0).village.art.includes('art_umbra'), 'a completed collect request puts the piece on display');
  ok(deliver(ctx, cv, 999, 3, 0).taken === 0, 'a delivery to a request that is gone takes nothing');

  // collect requests never ask for the village's own world's piece
  let own = 0, collects = 0;
  for (const w of INHABITED_WORLDS) {
    for (const seed of SEEDS) {
      let vv = createVillage({ worldSeed: seed, body: w.body, index: 0 }, 6, 0);
      for (let step = 0; step < 12; step++) {
        for (const q of vv.requests) if (q.fam === 'collect') { collects++; if (q.art === w.art.id) own++; }
        // complete every request, then let the slots reopen
        for (const q of [...vv.requests]) vv = deliver({ worldSeed: seed, body: w.body, index: 0 }, vv, q.id, q.need, step * 1000).village;
        vv = advanceVillage({ worldSeed: seed, body: w.body, index: 0 }, vv, step * 1000, step * 1000 + R.REOPEN_DELAY_S);
      }
    }
  }
  ok(collects > 100 && own === 0, `a collect request never asks for its own world's art (${collects} drawn)`);
}

// ============================================================ 1.3 traders
{
  const clocks = new Map<string, number>();
  const clockOf = (b: string) => clocks.get(b) ?? 0;
  const traders = createTraders(77, clockOf);
  ok(traders.length === NPC_CONFIG.TRADERS.BAND.length && traders.every((t, i) => NPC_CONFIG.TRADERS.BAND[i].route.includes(t.at)), 'each trader starts on a world of its route');
  ok(same(traders, createTraders(77, clockOf)), 'the band starts the same for a game world');
  const t0 = traders[0], body = t0.at, route = NPC_CONFIG.TRADERS.BAND[0].route;
  const elsewhere = INHABITED_WORLDS.find(w => !route.includes(w.body))!.body;
  ok(same(advanceTradersOn(77, traders, elsewhere, 1e7, clockOf).traders[0], traders[0]), 'time on another world does not move a trader (it waits where it is)');
  const stay = advanceTradersOn(77, traders, body, t0.leaveT - 1, clockOf).traders[0];
  ok(stay.at === body, 'a trader stays for its full stay');
  // a sold-out offer refills at the restock
  const sold: TraderState[] = JSON.parse(JSON.stringify(traders));
  sold[0].offers[0].stock = 0;
  const restocked = advanceTradersOn(77, sold, body, sold[0].restockT, clockOf).traders[0];
  ok(restocked.offers[0].stock === restocked.offers[0].max && restocked.at === body, 'offers restock during the stay');
  clocks.set(route[(t0.leg + 1) % route.length], 500);
  const moved = advanceTradersOn(77, traders, body, t0.leaveT, clockOf);
  const m = moved.traders[0];
  ok(m.at === route[(t0.leg + 1) % route.length] && moved.changed.includes(0), 'after its stay a trader moves to the next world on its route');
  ok(m.leaveT === 500 + NPC_CONFIG.TRADERS.STAY_S, "its new stay is timed on the new world's clock");
  ok(m.offers[0].from === body && inhabitedWorld(body)!.goods.includes(m.offers[0].give.item), 'its first offer there is goods from the world it came from');
  ok(m.offers.length === NPC_CONFIG.TRADERS.OFFERS + NPC_CONFIG.TRADERS.EXTRA_OFFER_LEVELS.length && m.offers.filter(o => o.minLevel === undefined).length === NPC_CONFIG.TRADERS.OFFERS && m.offers.every(o => o.give.item !== o.take.item && o.stock > 0), 'a few barters with stock, never an item for itself');
}

// ============================================================ 1.4 world time
{
  ok(worldTimeSubsystems()[0]?.id === 'npc', 'NPCs are the first world-time subsystem');
  // a planet with something happening inside the hour: a slot reopening, the
  // store running low, a trader moving on
  const seed = 9001, body = 'vesper';
  const p0 = createPlanetNpc(seed, body)!;
  const v = p0.villages[0];
  v.requests = v.requests.filter(q => q.fam !== 'supply');
  v.reopen = [1200];
  while (v.requests.length + v.reopen.length < R.OPEN) v.reopen.push(2400);
  v.food = foodLowMark(v) + rate(v) * 1800;   // runs low half an hour in
  const clockOf = () => 0;
  const traders = createTraders(seed, clockOf);
  const onHere = traders.findIndex(t => NPC_CONFIG.TRADERS.BAND[traders.indexOf(t)].route.includes(body));
  traders[onHere] = { ...traders[onHere], at: body, leg: NPC_CONFIG.TRADERS.BAND[onHere].route.indexOf(body), leaveT: 3000, restockT: 600 };

  const one = advancePlanet(seed, body, p0, traders, 3600, clockOf);
  let many: { planet: PlanetNpc; traders: TraderState[] } = { planet: p0, traders };
  for (let i = 0; i < 360; i++) many = advancePlanet(seed, body, many.planet, many.traders, 10, clockOf);
  ok(Math.abs(one.planet.T - many.planet.T) < 1e-6, 'the clock moves an hour either way');
  ok(same(one.planet.villages.map(x => x.requests), many.planet.villages.map(x => x.requests)), 'one hour in one step opens the same requests as 360 ten-second steps');
  ok(one.planet.villages.every((x, i) => Math.abs(foodAt(x, 3600) - foodAt(many.planet.villages[i], 3600)) < 1e-6), 'and leaves the same food (within tolerance)');
  ok(same(one.traders, many.traders), 'and moves the traders the same way');
  ok(one.planet.villages[0].requests.some(q => q.fam === 'supply') && one.traders[onHere].at !== body, 'something did happen in that hour (the comparison is not empty)');

  // the cap
  const now = 1_700_000_000_000;
  ok(catchUpSeconds(NPC_WORLD_TIME, now - 3600_000, now) === 3600, 'an hour away catches up an hour');
  ok(catchUpSeconds(NPC_WORLD_TIME, now - 30 * 24 * 3600_000, now) === NPC_CONFIG.CATCH_UP_CAP_S, 'an absence longer than the cap catches up the cap');
  ok(catchUpSeconds(NPC_WORLD_TIME, now + 5000, now) === 0 && catchUpSeconds(NPC_WORLD_TIME, NaN, now) === 0, 'a clock set back, or never stamped, catches up nothing');
  const fresh = createPlanetNpc(seed, body)!;
  const long = catchUpPlanet(seed, body, fresh, createTraders(seed, clockOf), now - 60 * 24 * 3600_000, now, clockOf);
  ok(long.dtS === NPC_CONFIG.CATCH_UP_CAP_S && long.planet.T === NPC_CONFIG.CATCH_UP_CAP_S, 'catchUpPlanet advances the planet by the cap');
  ok(long.planet.villages.every(x => Math.abs(foodAt(x, long.planet.T) - foodLowMark(x)) < 1e-6 && x.requests.some(q => q.fam === 'supply')),
    'a long absence leaves each store at its low mark (not starved) with a supply request open');
  const hour = catchUpPlanet(seed, body, fresh, [], now - 3600_000, now, clockOf);
  ok(hour.planet.villages.every((x, i) => Math.abs(foodAt(x, hour.planet.T) - (fresh.villages[i].food - rate(x) * 3600)) < 1e-9), 'an hour\'s catch-up uses an hour of food');
}
