// Where each tier can fly (openspec space-exploration: the Moon is the root).
// Tier 1 - every stack of Earth-built parts, staged or not - is an Earth <->
// Moon rocket; each later tier reaches its route's next hop. Flown through
// the real transfer physics (scripts/rocket-reach.ts, shared with the report).
//   npx tsx scripts/rocket-reach.test.ts
import { ItemType, ITEM_DATA, RocketPartType } from '../src/player/Inventory';
import { MISSIONS } from '../src/config/Missions';
import { ROCKET_CONFIG } from '../src/config/RocketConfig';
import { computeRocketStats, partStats, stackProblems } from '../src/rocket/RocketPerformance';
import { body, fly, gapM, liftOffTWR, PILOT_FACTOR, rangeM, stackLabel, stacksOf, windowMoments } from './rocket-reach';

let failed = 0;
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`);
  if (!ok) failed++;
};
const I = ItemType;
const pct = (x: number) => `${(100 * x).toFixed(0)}%`;

// ---- what Earth builds: the rocket parts the missions before the Moon unlock
const byId = new Map(MISSIONS.map(m => [m.id, m]));
const afterMoon = (id: string): boolean => {
  for (let m = byId.get(id); m; m = m.parent ? byId.get(m.parent) : undefined) if (m.id === 'moon') return true;
  return false;
};
const kind = (t: ItemType) => ITEM_DATA[t]?.rocketPart?.partType;
const earthParts = [...new Set(MISSIONS.filter(m => m.branch === 'rocketry' && !afterMoon(m.id)).flatMap(m => m.unlocks).filter(t => kind(t) !== undefined))];
check('Earth unlocks tier-1 rocket parts only', earthParts.every(t => partStats(t)?.tier === 1), earthParts.map(t => ITEM_DATA[t].name).join(', '));
const engines = earthParts.filter(t => kind(t) === RocketPartType.ENGINE);
const tanks = earthParts.filter(t => kind(t) === RocketPartType.FUEL_TANK);
check('Earth builds an engine, a tank and a command module', engines.length > 0 && tanks.length > 0 && earthParts.includes(I.COMMAND_MODULE));

// Every stack those parts build (separators too - the Moon gives them - up to the tower's height)
const tier1 = engines.flatMap(e => tanks.flatMap(t => stacksOf(e, t, 3)));
check('no stack of Earth parts can be staged (the Rocket Engine only fires as the bottom stage)',
  tier1.every(st => !st.includes(I.STAGE_SEPARATOR)) &&
  stackProblems([I.ROCKET_ENGINE, I.MEDIUM_FUEL_TANK, I.STAGE_SEPARATOR, I.ROCKET_ENGINE, I.MEDIUM_FUEL_TANK, I.COMMAND_MODULE]).some(p => /bottom stage/.test(p)));
check('a Moon engine still stages above an Earth booster',
  stackProblems([I.ROCKET_ENGINE, I.MEDIUM_FUEL_TANK, I.STAGE_SEPARATOR, I.VACUUM_ENGINE, I.LARGE_FUEL_TANK, I.COMMAND_MODULE]).length === 0);
check('a stack is at most the tower height', stackProblems([I.ROCKET_ENGINE, ...Array(ROCKET_CONFIG.MAX_STACK_PARTS - 1).fill(I.MEDIUM_FUEL_TANK), I.COMMAND_MODULE]).some(p => /At most/.test(p)));
check('the command module rides the top stage', stackProblems([I.ROCKET_ENGINE, I.COMMAND_MODULE, I.STAGE_SEPARATOR, I.VACUUM_ENGINE, I.LARGE_FUEL_TANK]).some(p => /top stage/.test(p)));

const earth = body('earth'), moon = body('moon');
const H = PILOT_FACTOR;  // a hand-flown trip (measured in the game; scripts/rocket-reach.ts)
const lifts = tier1.filter(st => liftOffTWR(st, 1) > 1);
const ranged = lifts.map(st => ({ st, r: rangeM(st, earth, moon, H) })).sort((a, b) => b.r - a.r);
const best = ranged[0].st;
const basic = [I.ROCKET_ENGINE, I.MEDIUM_FUEL_TANK, I.COMMAND_MODULE];
const fuelOf = (st: ItemType[]) => computeRocketStats(st).fuelCapacity;
// What a hand-flown trip uses of the tank: the careful pilot's fuel times the pilot factor
const handShare = (st: ItemType[], r: { fuelUsed: number }) => (H * r.fuelUsed) / fuelOf(st);

// ---- tier 1 reaches the Moon, with a margin, and needs a refuel there to get home
// The most of its tank a hand-flown Earth -> Moon may use (the rest is the margin)
const MAX_MOON_SHARE = 0.85;
const there = fly(basic, earth, moon);
check('the basic Earth rocket lands on the Moon hand-flown', fly(basic, earth, moon, H).landed);
check(`  on at most ${pct(MAX_MOON_SHARE)} of its tank`, handShare(basic, there) <= MAX_MOON_SHARE, `~${pct(handShare(basic, there))}`);
check('  and lifts off Earth (TWR > 1)', liftOffTWR(basic, 1) > 1, liftOffTWR(basic, 1).toFixed(2));
const home = fly(basic, moon, earth);
check('refuelled on the Moon it flies home hand-flown', fly(basic, moon, earth, H).landed, `~${pct(handShare(basic, home))}`);
check('but not there and back on one tank', handShare(basic, there) + handShare(basic, home) > 1);
check('the best Earth stack lands on the Moon too', fly(best, earth, moon, H).landed, stackLabel(best));

// ---- and not much farther: more parts barely help, and the next hops are shut most of the time
const moonGap = gapM(earth, moon);
// The farthest any hand-flown Earth stack may fly, as a multiple of the Earth - Moon gap
const MAX_RANGE_MOON_GAPS = 5;
check(`no Earth stack flies more than ${MAX_RANGE_MOON_GAPS}x the Earth-Moon gap`, ranged[0].r <= MAX_RANGE_MOON_GAPS * moonGap,
  `${ranged[0].r.toFixed(0)} m vs ${moonGap.toFixed(0)} m, ${stackLabel(best)}`);
check('the best Earth stack flies at most 1.7x as far as the basic one', ranged[0].r <= 1.7 * rangeM(basic, earth, moon, H),
  `${ranged[0].r.toFixed(0)} vs ${rangeM(basic, earth, moon, H).toFixed(0)} m`);
// The bodies swing past each other (live orbits), so a neighbour can come
// close; at its usual distance no Earth stack gets there even flown
// perfectly, and most of its window is shut - from Earth, and from the Moon
// after a refuel there (cargo fuel). MAX_OPEN_SHARE: the most of a next
// hop's window a hand-flown tier-1 rocket may reach.
const MAX_OPEN_SHARE = 0.3;
const WINDOW = 32;
const usual = (a: string, b: string) => {
  const ts = windowMoments(a, b, WINDOW);
  const gaps = ts.map(t => gapM(body(a, t), body(b, t)));
  return ts[gaps.indexOf([...gaps].sort((x, y) => x - y)[Math.floor(gaps.length / 2)])];
};
for (const from of ['earth', 'moon']) {
  for (const hop of ['sequoia', 'kessel']) {
    const ts = windowMoments(from, hop, WINDOW);
    const t = usual(from, hop);
    const what = `${body(from).name} -> ${body(hop).name}`;
    check(`${what}: no Earth stack gets there at its usual distance, even flown perfectly`, lifts.every(st => !fly(st, body(from, t), body(hop, t)).landed));
    const open = ts.filter(tt => fly(best, body(from, tt), body(hop, tt), H).landed).length / ts.length;
    check(`${what}: the best Earth stack, hand-flown, gets there in at most ${pct(MAX_OPEN_SHARE)} of the window`, open <= MAX_OPEN_SHARE, pct(open));
  }
}
// Every planet beyond the Moon is out of reach at its usual distance, even flown perfectly
const far = ['sequoia', 'ferrum', 'kessel', 'cinder', 'vesper', 'umbra', 'nerith', 'halcyon', 'tessaly', 'thalassa'].filter(id => {
  const t = usual('earth', id);
  return fly(best, body('earth', t), body(id, t)).landed;
});
check('at its usual distance no planet is in tier-1 reach', far.length === 0, far.join(', '));

// ---- each later tier reaches its route's next hop (at a good moment of the window)
const reaches = (st: ItemType[], a: string, b: string) => windowMoments(a, b, 8).some(t => fly(st, body(a, t), body(b, t)).landed);
const L = I.LARGE_FUEL_TANK, CM = I.COMMAND_MODULE;
const hops: [string, ItemType[], string, string, number][] = [
  // [what, stack, from, to, the gravity it must lift off]
  ['tier 2 vacuum: Moon -> Sequoia (sunward)', [I.VACUUM_ENGINE, L, CM], 'moon', 'sequoia', 0.4],
  ['tier 2 vacuum: Moon -> Kessel (outward)', [I.VACUUM_ENGINE, L, CM], 'moon', 'kessel', 0.4],
  // tier 2 leaves Earth on an Earth engine beside the vacuum one (lift on both, cruise on the vacuum engine)
  // one engine per stage (an engine can't fire into the part below it): a Rocket Engine booster under a vacuum stage
  ['tier 2 off Earth: Rocket Engine booster + Vacuum Engine stage: Earth -> Moon', [I.ROCKET_ENGINE, I.MEDIUM_FUEL_TANK, I.STAGE_SEPARATOR, I.VACUUM_ENGINE, I.MEDIUM_FUEL_TANK, CM], 'earth', 'moon', 1],
  ['gas-core (Ember): Sequoia -> Metropole Prime', [I.GAS_CORE_ENGINE, L, L, CM], 'sequoia', 'ferrum', 1],
  ['fission-fragment (Lodestone): Metropole Prime -> Umbra', [I.GAS_CORE_ENGINE, L, I.STAGE_SEPARATOR, I.FISSION_FRAGMENT_DRIVE, I.REACTOR_CORE, L, CM], 'ferrum', 'umbra', 1],
  ['nuclear pulse (Brand): Umbra -> Vesper', [I.NUCLEAR_PULSE_DRIVE, L, L, L, I.CARGO_BAY, CM], 'umbra', 'vesper', 0.5],
  ['gas-core: Kessel -> Thalassa (outward)', [I.GAS_CORE_ENGINE, L, L, CM], 'kessel', 'thalassa', 0.35],
  ['fusion drive (Aurelia): Cinder -> Nerith', [I.FUSION_DRIVE, I.CRYO_TANK, L, L, I.CARGO_BAY, CM], 'cinder', 'nerith', 0.6],
  ['fusion drive: Nerith -> Halcyon', [I.FUSION_DRIVE, I.CRYO_TANK, L, L, I.CARGO_BAY, CM], 'nerith', 'halcyon', 0.45],
  ['fusion drive: Halcyon -> Tessaly', [I.FUSION_DRIVE, I.CRYO_TANK, L, L, I.CARGO_BAY, CM], 'halcyon', 'tessaly', 0.65],
];
for (const [what, st, a, b, g] of hops) {
  check(`${what}: a valid stack that lifts off`, stackProblems(st).length === 0 && liftOffTWR(st, g) > 1, `TWR ${liftOffTWR(st, g).toFixed(2)}`);
  check(`${what}: lands`, reaches(st, a, b));
}

// ---- the ladder's order: each tier's engine more efficient than the last
const isp = (t: ItemType) => partStats(t)!.specificImpulse!;
const LADDER = [I.ROCKET_ENGINE, I.VACUUM_ENGINE, I.NUCLEAR_THERMAL_ENGINE, I.GAS_CORE_ENGINE, I.FISSION_FRAGMENT_DRIVE, I.FUSION_DRIVE, I.FUSION_TORCH];
check('Isp rises up the ladder', LADDER.every((t, i) => i === 0 || isp(t) > isp(LADDER[i - 1])), LADDER.map(isp).join(' < '));
check('the vacuum engine is a space engine (TWR < 1 on Earth)', liftOffTWR([I.VACUUM_ENGINE, L, CM], 1) < 1);

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall passed');
