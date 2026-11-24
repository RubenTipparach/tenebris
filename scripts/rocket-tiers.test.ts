// Rocket tiers 3-4 (openspec industry-and-nuclear, rocket-tiers):
//   npx tsx scripts/rocket-tiers.test.ts
import { ItemType } from '../src/player/Inventory';
import { computeRocketStats, engineModes, liftCruiseProfile, nextEngineMode, surfaceTWR, validEngineMode } from '../src/rocket/RocketPerformance';

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
// The battery pack is rocket equipment now (an equipment slot, not the stack): cargo space comes from cargo bays
check('a battery pack in the equipment adds no cargo slots', computeRocketStats([ItemType.NUCLEAR_THERMAL_ENGINE, tank, cm], 0, null, [{ itemType: ItemType.BATTERY_PACK, quantity: 1 }]).cargoSlots === ntr.cargoSlots);
check('tiers', ntr.tier === 3 && ion.tier === 4);

// Engine modes (design 6b): one mode per engine type plus All
// Two Rocket Engines: one cannot lift the reactor core on a full Large Tank
const both = [ItemType.ROCKET_ENGINE, ItemType.ROCKET_ENGINE, ItemType.ION_DRIVE, ItemType.REACTOR_CORE, tank, cm];
const lift = computeRocketStats(both, 0, ItemType.ROCKET_ENGINE);
const cruise = computeRocketStats(both, 0, ItemType.ION_DRIVE);
const all = computeRocketStats(both, 0, null);
const modes = engineModes(both);
check('chemical + ion stack has modes All / Rocket Engine / Ion Drive', modes.length === 3 && modes[0] === null && modes[1] === ItemType.ROCKET_ENGINE && modes[2] === ItemType.ION_DRIVE);
check('single-engine stacks only have All', engineModes([ItemType.ROCKET_ENGINE, tank, cm]).length === 1 && engineModes([ItemType.ION_DRIVE, ItemType.REACTOR_CORE, tank, cm]).length === 1);
check('lift mode lifts off Earth', surfaceTWR(lift, 1) > 1, surfaceTWR(lift, 1).toFixed(2));
check('cruise mode cannot lift off Earth', surfaceTWR(cruise, 1) < 1, surfaceTWR(cruise, 1).toFixed(3));
// The lift engine is dead weight in cruise, so a little less than ion-only
check('cruise mode delta-v close to ion-only', cruise.deltaV <= ion.deltaV && cruise.deltaV > 0.8 * ion.deltaV, `${f(cruise)} vs ${f(ion)}`);
check('cruise mode uses the ion exhaust velocity', Math.abs(cruise.exhaustVelocity - ion.exhaustVelocity) < 1e-6);
check('All mode is blended: thrust of both, exhaust velocity between', Math.abs(all.thrust - (lift.thrust + cruise.thrust)) < 1e-6
  && all.exhaustVelocity > lift.exhaustVelocity && all.exhaustVelocity < cruise.exhaustVelocity,
  `${lift.exhaustVelocity.toFixed(0)} < ${all.exhaustVelocity.toFixed(0)} < ${cruise.exhaustVelocity.toFixed(0)}`);
check('one Rocket Engine cannot lift it on a full Large Tank', surfaceTWR(computeRocketStats([ItemType.ROCKET_ENGINE, ItemType.ION_DRIVE, ItemType.REACTOR_CORE, tank, cm], 0, ItemType.ROCKET_ENGINE), 1) < 1);
check('modes share mass and tanks', lift.dryMass === cruise.dryMass && cruise.dryMass === all.dryMass && lift.fuelCapacity === all.fuelCapacity);
check('G cycles All -> Rocket Engine -> Ion Drive -> All', nextEngineMode(both, null) === ItemType.ROCKET_ENGINE
  && nextEngineMode(both, ItemType.ROCKET_ENGINE) === ItemType.ION_DRIVE && nextEngineMode(both, ItemType.ION_DRIVE) === null);
check('a mode the stack no longer has falls back to All', validEngineMode([ItemType.ROCKET_ENGINE, tank, cm], ItemType.ION_DRIVE) === null);
check('mode for a missing engine computes as All', computeRocketStats([ItemType.ROCKET_ENGINE, tank, cm], 0, ItemType.ION_DRIVE).thrust === chem.thrust);
const prof = liftCruiseProfile(both);
check('lift/cruise profile lifts on every engine (most thrust) and cruises on the ion drive', !!prof && prof.lift.thrust === all.thrust && prof.lift.mode === null && prof.cruise.exhaustVelocity === cruise.exhaustVelocity);
check('no profile with one engine type', liftCruiseProfile([ItemType.ROCKET_ENGINE, tank, cm]) === null);

if (failed) { console.log(`${failed} failed`); process.exit(1); }
console.log('all passed');
