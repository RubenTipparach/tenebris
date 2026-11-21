// Ranching tests (openspec wool-air-and-reentry, tasks 2.1 and 2.2).
// Run: npx tsx scripts/ranching.test.ts
import { FAUNA_SPECIES, FAUNA_SPECIES_IDS, faunaRoster, validateFaunaRosters } from '../src/config/FaunaConfig';
import { RANCHING } from '../src/config/SurvivalConfig';
import { buildFaunaModel } from '../src/planet/FaunaModels';
import { readFileSync } from 'fs';
import { newRanchState, shear, hit, isShorn, pickNearest, raySphere, rollRange } from '../src/planet/Ranching';

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };
const v = (x: number, y: number, z: number) => ({ x, y, z });

// ---- 2.1 the roster: sheep and cows live on Earth and nowhere else
const earth = faunaRoster('earth');
ok(earth.includes('sheep') && earth.includes('cow'), 'sheep and cow are on the Earth roster');
const elsewhere = [...new Set(FAUNA_SPECIES_IDS.map(id => FAUNA_SPECIES[id].planet))].filter(p => p !== 'earth');
ok(elsewhere.every(p => !faunaRoster(p).includes('sheep') && !faunaRoster(p).includes('cow')), 'no other planet has sheep or cows');
let threw = false;
const info = console.info; console.info = () => {};
try { validateFaunaRosters(['earth', ...elsewhere, 'moon', 'kessel', 'nerith', 'ferrum']); } catch { threw = true; }
console.info = info;
ok(!threw, 'the startup roster check passes');
ok(FAUNA_SPECIES.sheep.ranch === 'wool' && FAUNA_SPECIES.cow.ranch === 'hide', 'sheep give wool, cows a hide');
ok(FAUNA_SPECIES_IDS.filter(id => (FAUNA_SPECIES[id] as { ranch?: string }).ranch).every(id => FAUNA_SPECIES[id].planet === 'earth'),
  'only Earth animals are ranched');
const calm = (id: 'sheep' | 'cow') => { const s = FAUNA_SPECIES[id]; return s.herd[0] === 2 && s.herd[1] === 5 && s.fleeRadius < RANCHING.REACH_M; };
ok(calm('sheep') && calm('cow'), 'herds of 2-5, and you can get within reach before they shuffle off');

// ---- the anim files carry tracks for parts the models have (the model
// builder needs THREE only, no WebGL)
for (const id of ['sheep', 'cow'] as const) {
  const model = buildFaunaModel(id);
  const names = new Set(model.parts.map(p => p.name));
  const file = JSON.parse(readFileSync(new URL(`../public/animations/${id}.anim.json`, import.meta.url), 'utf8'));
  const tracks = Object.values(file.clips as Record<string, { tracks: Record<string, unknown> }>).flatMap(c => Object.keys(c.tracks));
  ok(file.clips.idle && file.clips.move && tracks.every(t => names.has(t)), `${id}: idle + move clips, every track names a model part`);
}
ok(buildFaunaModel('sheep').parts.some(p => p.name === 'fleece'), 'the sheep has a fleece part to hide when shorn');

// ---- the ray pick: nearest sphere in reach wins
const R = RANCHING.REACH_M;
const o = v(0, 0, 0), fwd = v(0, 0, 1);
ok(raySphere(o, fwd, v(0, 0, 3), 0.5) === 2.5, 'ray enters a sphere at its near face');
ok(raySphere(o, fwd, v(0, 0, -3), 0.5) === Infinity, 'a sphere behind misses');
ok(raySphere(o, fwd, v(2, 0, 3), 0.5) === Infinity, 'a sphere off to the side misses');
ok(raySphere(o, fwd, v(0, 0, 0.2), 0.5) === 0, 'standing inside a sphere hits at once');
const herd = [{ center: v(0, 0, R - 0.5), radius: 0.6 }, { center: v(0, 0, 2), radius: 0.6 }, { center: v(0, 3, 2), radius: 0.6 }];
ok(pickNearest(o, fwd, R, herd).index === 1, 'the nearest animal on the ray is picked');
ok(pickNearest(o, fwd, R, [{ center: v(0, 0, R + 1), radius: 0.6 }]).index === -1, 'an animal out of reach is missed');
ok(pickNearest(o, fwd, R, []).index === -1, 'nothing to pick, nothing picked');

// ---- shearing
const sheep = FAUNA_SPECIES.sheep, cow = FAUNA_SPECIES.cow;
const [wMin, wMax] = RANCHING.SHEAR_WOOL;
let inRange = true;
for (let i = 0; i < 200; i++) {
  const s = newRanchState();
  const w = shear(sheep, s, 0, i / 200);
  if (w < wMin || w > wMax) inRange = false;
}
ok(inRange, `shearing gives ${wMin}-${wMax} wool`);
ok(rollRange([1, 3], 0) === 1 && rollRange([1, 3], 0.999) === 3, 'the roll reaches both ends of its range');
const s = newRanchState();
ok(shear(sheep, s, 10, 0.5) > 0 && isShorn(s, 10), 'a shorn sheep is shorn');
ok(shear(sheep, s, 11, 0.5) === 0, 'a shorn sheep gives no wool');
ok(shear(sheep, s, 10 + RANCHING.REGROW_S - 1, 0.5) === 0, 'still nothing just before the fleece is back');
ok(!isShorn(s, 10 + RANCHING.REGROW_S) && shear(sheep, s, 10 + RANCHING.REGROW_S, 0.5) > 0, `the fleece grows back after ${RANCHING.REGROW_S} s`);
ok(shear(cow, newRanchState(), 0, 0.5) === 0, 'shears do nothing to a cow');

// ---- hitting a cow
const c = newRanchState();
const [lMin, lMax] = RANCHING.COW_LEATHER;
let falls = -1, leather = 0;
for (let i = 1; i <= RANCHING.COW_HITS + 2 && falls < 0; i++) {
  const r = hit(cow, c, 0.7);
  if (r.fallen) { falls = i; leather = r.leather; }
}
ok(falls === RANCHING.COW_HITS, `a cow falls on hit ${RANCHING.COW_HITS}`);
ok(leather >= lMin && leather <= lMax, `and gives ${lMin}-${lMax} leather (${leather})`);
let leatherRange = true;
for (let i = 0; i < 100; i++) {
  const st = newRanchState();
  let r = { fallen: false, leather: 0 };
  for (let h = 0; h < RANCHING.COW_HITS; h++) r = hit(cow, st, i / 100);
  if (!r.fallen || r.leather < lMin || r.leather > lMax) leatherRange = false;
}
ok(leatherRange, 'leather is always in range');
const sh = newRanchState();
let sheepFell = false;
for (let i = 0; i < RANCHING.COW_HITS * 3; i++) if (hit(sheep, sh, 0.5).fallen) sheepFell = true;
ok(!sheepFell, 'hitting a sheep never fells it (it just runs)');
