// Rocket tiers 3-4 (openspec industry-and-nuclear, rocket-tiers):
//   npx tsx scripts/rocket-tiers.test.ts
import { ItemType } from '../src/player/Inventory';
import { computeRocketStats, surfaceTWR } from '../src/rocket/RocketPerformance';

let failed = 0;
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`);
  if (!ok) failed++;
};

const tank = ItemType.LARGE_FUEL_TANK, cm = ItemType.COMMAND_MODULE;
const chem = computeRocketStats([ItemType.ROCKET_ENGINE, tank, cm]);
const vac = computeRocketStats([ItemType.VACUUM_ENGINE, tank, cm]);
const ntr = computeRocketStats([ItemType.NUCLEAR_THERMAL_ENGINE, tank, cm]);
const ion = computeRocketStats([ItemType.ION_DRIVE, ItemType.REACTOR_CORE, tank, cm]);
const ionBare = computeRocketStats([ItemType.ION_DRIVE, tank, cm]);
const f = (s: { deltaV: number }) => s.deltaV.toFixed(0);

check('delta-v: chemical < vacuum < nuclear thermal < ion', chem.deltaV < vac.deltaV && vac.deltaV < ntr.deltaV && ntr.deltaV < ion.deltaV,
  `${f(chem)} < ${f(vac)} < ${f(ntr)} < ${f(ion)}`);
check('nuclear thermal has at least twice the vacuum engine delta-v on the same tanks', ntr.deltaV >= 2 * vac.deltaV, `${f(ntr)} vs ${f(vac)}`);
check('nuclear thermal thrust between vacuum and chemical', ntr.thrust > vac.thrust && ntr.thrust < chem.thrust);
check('ion drive with a reactor core has thrust and the highest Isp', ion.thrust > 0 && ion.exhaustVelocity > ntr.exhaustVelocity);
check('ion drive TWR below 1 on Earth', surfaceTWR(ion, 1) < 1, surfaceTWR(ion, 1).toFixed(3));
check('ion drive without a reactor core gives no thrust', ionBare.thrust === 0 && ionBare.deltaV === 0);
check('ion drive without a reactor core says why', ionBare.problems.length === 1 && /Reactor Core/.test(ionBare.problems[0]), ionBare.problems.join('; '));
check('stacks that work have no problems', [chem, vac, ntr, ion].every(s => s.problems.length === 0));
check('battery pack adds 2 cargo slots', computeRocketStats([ItemType.NUCLEAR_THERMAL_ENGINE, tank, ItemType.BATTERY_PACK, cm]).cargoSlots === ntr.cargoSlots + 2);
check('tiers', ntr.tier === 3 && ion.tier === 4);

if (failed) { console.log(`${failed} failed`); process.exit(1); }
console.log('all passed');
