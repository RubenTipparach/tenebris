// Sea flora tests (openspec ocean-life, task 2.1).
// Run: npx tsx scripts/sea-flora.test.ts
import { SOLAR_SYSTEM, assertFloraRostersDisjoint, CelestialBodyConfig } from '../src/config/SolarSystemConfig';
import { SEA_FLORA, SEA_FLORA_SPECIES, SeaFloraSpecies } from '../src/config/SeaFloraConfig';
import { bodyGrowsSeaFlora, seabedOf, pickSeaZone, planSeaTile, waterWarmth, seaPatch } from '../src/planet/SeaFloraZones';
import { HexBlockType } from '../src/shared/blockTypes';
import { PlayerConfig } from '../src/config/PlayerConfig';

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const EARTH_TREES = ['pine', 'oak', 'birch'];
const body = (id: string) => SOLAR_SYSTEM.bodies.find(b => b.id === id)!;
const throws = (f: () => void) => { try { f(); return false; } catch { return true; } };

// ---- rosters: land + sea, each species on exactly one planet
ok(!throws(() => assertFloraRostersDisjoint(SOLAR_SYSTEM.bodies, EARTH_TREES)), 'the shipped land + sea rosters are disjoint');
const seaOwners = new Map<string, string[]>();
for (const b of SOLAR_SYSTEM.bodies) for (const z of b.seaFlora?.zones ?? []) {
  const o = seaOwners.get(z.species) ?? [];
  if (!o.includes(b.id)) o.push(b.id);
  seaOwners.set(z.species, o);
}
const species = Object.keys(SEA_FLORA_SPECIES) as SeaFloraSpecies[];
ok(species.every(sp => seaOwners.get(sp)?.length === 1), 'every sea species grows on exactly one planet: '
  + species.map(sp => `${sp}@${seaOwners.get(sp)?.join('+') ?? 'nowhere'}`).join(' '));
const land = new Set<string>(EARTH_TREES);
for (const b of SOLAR_SYSTEM.bodies) for (const f of Object.values(b.flora ?? {})) land.add(f!.species);
ok(species.every(sp => !land.has(sp)), 'no sea species shares a name with a land species');
{
  // a species leaking onto a second planet throws (coral on Sequoia too)
  const seq = body('sequoia');
  const leaked: CelestialBodyConfig = { ...seq, seaFlora: { ...seq.seaFlora!, zones: [...seq.seaFlora!.zones, { species: 'coral', depth: [1, 2], chance: 1, perTile: [1, 0] }] } };
  ok(throws(() => assertFloraRostersDisjoint(SOLAR_SYSTEM.bodies.map(b => b.id === 'sequoia' ? leaked : b), EARTH_TREES)), 'coral on Sequoia as well as Earth throws');
  // a sea plant leaking onto a land roster throws too
  const verd = body('verdance');
  const landLeak: CelestialBodyConfig = { ...verd, flora: { ...verd.flora, [HexBlockType.VERD_ROCK]: { species: 'kelp' as never, chance: 1 } } };
  ok(throws(() => assertFloraRostersDisjoint(SOLAR_SYSTEM.bodies.map(b => b.id === 'verdance' ? landLeak : b), EARTH_TREES)), 'kelp in a Verdance land roster throws');
  // sea flora on a body with no sea throws
  const moon = body('moon');
  const dry: CelestialBodyConfig = { ...moon, seaFlora: { patchScale: 1, zones: [{ species: 'seafan', depth: [1, 2], chance: 1, perTile: [1, 0] }] } };
  ok(throws(() => assertFloraRostersDisjoint([dry], EARTH_TREES)), 'sea flora on the waterless Moon throws');
}

// ---- lifeless and waterless worlds grow none; the four sea worlds do
const dryBodies = SOLAR_SYSTEM.bodies.filter(b => !b.terrain.hasWater);
ok(dryBodies.length > 10 && dryBodies.every(b => !b.seaFlora && !bodyGrowsSeaFlora(b)), `no sea flora on any of the ${dryBodies.length} waterless bodies`);
const seaWorlds = SOLAR_SYSTEM.bodies.filter(b => bodyGrowsSeaFlora(b)).map(b => b.id).sort();
ok(seaWorlds.join() === ['earth', 'mirewood', 'sequoia', 'verdance'].join(), `sea flora grows on exactly the sea worlds: ${seaWorlds.join(', ')}`);
ok(!bodyGrowsSeaFlora(undefined), 'no body (space) grows nothing');

// ---- the seabed column: open water over a solid bed only
const MAXD = 40;
const column = (bed: number, surface: number, top = HexBlockType.WATER, under = HexBlockType.DIRT) => (d: number) =>
  d < bed ? HexBlockType.STONE : d === bed ? under : d < surface ? HexBlockType.WATER : d === surface ? top : HexBlockType.AIR;
const sb = seabedOf(column(20, 24), MAXD);
ok(!!sb && sb.bed === 20 && sb.surface === 24, 'seabed: bed and surface of a 4-deep column');
ok(seabedOf(d => (d <= 26 ? HexBlockType.GRASS : HexBlockType.AIR), MAXD) === null, 'land is no seabed');
ok(seabedOf(column(20, 24, HexBlockType.ICE), MAXD) === null, 'ice-capped water is no seabed');
ok(seabedOf(column(20, 24, HexBlockType.WATER, HexBlockType.AIR), MAXD) === null, 'water over an air pocket is no seabed');
ok(seabedOf(() => HexBlockType.AIR, MAXD) === null, 'an empty column is no seabed');

// ---- Earth's zones: deterministic, coral only in warm shallows, kelp only where cool
const earth = body('earth').seaFlora!;
const SEED = PlayerConfig.TERRAIN_SEED;
const dirs: [number, number, number][] = [];
const N = 4000;
for (let i = 0; i < N; i++) {
  // Fibonacci sphere
  const y = 1 - (2 * (i + 0.5)) / N, r = Math.sqrt(1 - y * y), a = i * Math.PI * (3 - Math.sqrt(5));
  dirs.push([Math.cos(a) * r, y, Math.sin(a) * r]);
}
const seen = new Map<string, number>();
let coralBad = 0, kelpBad = 0, deterministic = true, maxCoralLat = 0, minKelpWarmth = 9, maxKelpWarmth = -9;
for (const dir of dirs) for (let depth = 1; depth <= 10; depth++) {
  const warmth = waterWarmth(earth, dir, SEED, depth), patch = seaPatch(earth, dir, SEED);
  const z = pickSeaZone(earth, depth, warmth, patch);
  if (pickSeaZone(earth, depth, waterWarmth(earth, dir, SEED, depth), seaPatch(earth, dir, SEED)) !== z) deterministic = false;
  if (!z) continue;
  seen.set(z.species, (seen.get(z.species) ?? 0) + 1);
  const lat = Math.asin(Math.abs(dir[1])) * 180 / Math.PI;
  if (z.species === 'coral') { maxCoralLat = Math.max(maxCoralLat, lat); if (depth > 3 || warmth < 0.62) coralBad++; }
  if (z.species === 'kelp') { maxKelpWarmth = Math.max(maxKelpWarmth, warmth); minKelpWarmth = Math.min(minKelpWarmth, warmth); if (warmth > 0.45) kelpBad++; }
}
ok(deterministic, 'the zone picker is deterministic');
ok(coralBad === 0 && (seen.get('coral') ?? 0) > 0, `coral only in warm shallows (depth 1-3, warmth >= 0.62; ${seen.get('coral')} hits, highest latitude ${maxCoralLat.toFixed(1)} deg)`);
ok(maxCoralLat < 35, 'coral stays in the low latitudes');
ok(kelpBad === 0 && (seen.get('kelp') ?? 0) > 0, `kelp only where the water is cool (warmth ${minKelpWarmth.toFixed(2)}..${maxKelpWarmth.toFixed(2)} <= 0.45; ${seen.get('kelp')} hits)`);
ok((seen.get('seagrass') ?? 0) > 0, `seagrass in the shallows (${seen.get('seagrass')} hits)`);
{
  // deeper water is cooler: at one spot, warmth falls with depth
  const d = dirs[N / 2];
  ok(waterWarmth(earth, d, SEED, 8) < waterWarmth(earth, d, SEED, 1), 'deeper water is cooler');
}

// ---- coherent zones: neighbouring seabed mostly grows the same thing
for (const id of ['earth', 'sequoia', 'verdance', 'mirewood']) {
  const t = body(id).seaFlora!;
  let same = 0, pairs = 0;
  const step = 0.01; // ~1 m apart on Earth (radius 100)
  for (let i = 0; i < 1500; i++) {
    const a = dirs[(i * 7) % N];
    const b: [number, number, number] = [a[0] + step, a[1], a[2] - step];
    const l = Math.hypot(...b); b[0] /= l; b[1] /= l; b[2] /= l;
    for (const depth of [1, 2, 4]) {
      const za = pickSeaZone(t, depth, waterWarmth(t, a, SEED, depth), seaPatch(t, a, SEED))?.species ?? null;
      const zb = pickSeaZone(t, depth, waterWarmth(t, b, SEED, depth), seaPatch(t, b, SEED))?.species ?? null;
      pairs++; if (za === zb) same++;
    }
  }
  ok(same / pairs > 0.93, `${id}: neighbouring seabed shares its zone ${(100 * same / pairs).toFixed(1)}% of the time (big beds, no salt and pepper)`);
}

// ---- placement: never above the surface (but floaters on it), never into the bed
const BED_R = 90, BH = 1, OFFSET = PlayerConfig.WATER_SURFACE_OFFSET;
let plants = 0, above = 0, inBed = 0, floatBad = 0, sameTwice = true;
const perSpecies = new Map<string, number>();
for (const id of ['earth', 'sequoia', 'verdance', 'mirewood']) {
  const t = body(id).seaFlora!;
  for (let i = 0; i < 1200; i++) {
    const dir = dirs[(i * 13) % N];
    for (let depth = 1; depth <= 8; depth++) {
      const col = { bed: 20, surface: 20 + depth };
      const bedR = BED_R, surfR = BED_R + depth * BH - OFFSET;
      const a = planSeaTile(t, i, SEED, dir, col, bedR, surfR);
      const b = planSeaTile(t, i, SEED, dir, col, bedR, surfR);
      if (JSON.stringify(a) !== JSON.stringify(b)) sameTwice = false;
      for (const p of a) {
        plants++;
        perSpecies.set(p.species, (perSpecies.get(p.species) ?? 0) + 1);
        const look = SEA_FLORA_SPECIES[p.species];
        if (p.baseRadius < bedR - SEA_FLORA.ROOT_SINK - 1e-9) inBed++;
        if (!look.float) {
          if (p.baseRadius + p.height > surfR - SEA_FLORA.TOP_MARGIN + 1e-9) above++;
        } else if (look.float.depth > 0) {
          // hangs under the surface: its top reaches the surface at most
          if (p.baseRadius + p.height > surfR + 1e-9) floatBad++;
        } else if (p.baseRadius < surfR || p.baseRadius > surfR + 0.1) floatBad++; // rests on the surface
      }
    }
  }
}
ok(sameTwice, 'placement is deterministic from the seed and the tile');
ok(plants > 1000 && above === 0, `no seabed plant reaches above the water (${plants} plants)`);
ok(inBed === 0, 'no plant starts inside the bed (beyond its root sink)');
ok(floatBad === 0, 'lily pads rest on the surface, bladderwort hangs under it');
ok(species.every(sp => (perSpecies.get(sp) ?? 0) > 0), 'every species gets placed: ' + species.map(sp => `${sp} ${perSpecies.get(sp) ?? 0}`).join(', '));
{
  // a different world seed grows a different sea
  const a = planSeaTile(earth, 77, SEED, dirs[100], { bed: 20, surface: 22 }, 90, 91.9);
  const b = planSeaTile(earth, 77, SEED + 1, dirs[100], { bed: 20, surface: 22 }, 90, 91.9);
  ok(JSON.stringify(a) !== JSON.stringify(b), 'another world seed places plants differently');
}
