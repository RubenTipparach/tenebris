// The engine ladder past the Moon (openspec space-exploration, rocket-tiers):
//   npx tsx scripts/rocket-engine-ladder.test.ts
import { ItemType } from '../src/player/Inventory';
import { computeRocketStats, engineNeeds, feedCharge, surfaceTWR } from '../src/rocket/RocketPerformance';

let failed = 0;
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`);
  if (!ok) failed++;
};
const I = ItemType;
const tank = I.LARGE_FUEL_TANK, cm = I.COMMAND_MODULE;
const f = (n: number) => n.toFixed(0);

// ---- 5.1 the solar-electric ion thruster
const ionT = computeRocketStats([I.ION_THRUSTER, tank, cm]);
check('ion thruster thrusts with no reactor core', ionT.thrust > 0 && ionT.problems.length === 0, ionT.problems.join('; '));
check('ion thruster draws charge while firing', engineNeeds([I.ION_THRUSTER, tank, cm]).drawW > 0);
const step = feedCharge(10, engineNeeds([I.ION_THRUSTER]).drawW, 1, 1);
check('it fires on charge and the charge drops', step.firing && step.chargeWh < 10, step.chargeWh.toFixed(3));
check('it stops when the charge is empty', !feedCharge(0, engineNeeds([I.ION_THRUSTER]).drawW, 1, 1).firing);
check('a chemical engine draws no charge and fires on an empty battery', feedCharge(0, engineNeeds([I.ROCKET_ENGINE]).drawW, 1, 1).firing);
check('ion thruster TWR below 1 on Earth (a space engine)', surfaceTWR(ionT, 1) < 1);

// ---- 5.2 gas-core, fission-fragment, nuclear pulse
const ntr = computeRocketStats([I.NUCLEAR_THERMAL_ENGINE, tank, cm]);
const gas = computeRocketStats([I.GAS_CORE_ENGINE, tank, cm]);
check('gas-core: more Isp and thrust than nuclear thermal', gas.exhaustVelocity > ntr.exhaustVelocity && gas.thrust > ntr.thrust,
  `${f(gas.exhaustVelocity)} vs ${f(ntr.exhaustVelocity)}`);
const ffBare = computeRocketStats([I.FISSION_FRAGMENT_DRIVE, tank, cm]);
const ff = computeRocketStats([I.FISSION_FRAGMENT_DRIVE, I.REACTOR_CORE, tank, cm]);
check('fission-fragment drive refused without a reactor core', ffBare.thrust === 0 && /Reactor Core/.test(ffBare.problems.join(' ')));
check('fission-fragment drive beats the gas core on Isp', ff.exhaustVelocity > gas.exhaustVelocity);
const heavy = [I.NUCLEAR_PULSE_DRIVE, tank, tank, tank, cm];
const pulse = computeRocketStats(heavy);
check('nuclear pulse drive lifts a heavy stack off Earth (TWR > 1)', surfaceTWR(pulse, 1) > 1, surfaceTWR(pulse, 1).toFixed(2));
const pn = engineNeeds([I.NUCLEAR_PULSE_DRIVE]);
check('nuclear pulse drive consumes pulse units', (pn.consumes.get(I.PULSE_UNIT) ?? 0) > 0);

// ---- 5.3 fusion
const fus = computeRocketStats([I.FUSION_DRIVE, tank, cm]);
const torch = computeRocketStats([I.FUSION_TORCH, tank, cm]);
const fn = engineNeeds([I.FUSION_DRIVE]), tn = engineNeeds([I.FUSION_TORCH]);
check('fusion drive burns helium-3', (fn.consumes.get(I.HELIUM_3) ?? 0) > 0);
check('fusion torch burns helium-3 and deuterium', (tn.consumes.get(I.HELIUM_3) ?? 0) > 0 && (tn.consumes.get(I.DEUTERIUM) ?? 0) > 0);
const all = [ntr, gas, ff, fus, torch, ionT, computeRocketStats([I.ION_DRIVE, I.REACTOR_CORE, tank, cm]), computeRocketStats([I.NUCLEAR_PULSE_DRIVE, tank, cm])];
check('the torch has the highest delta-v of every engine', all.every(s => s === torch || s.deltaV < torch.deltaV),
  all.map(s => f(s.deltaV)).join(', '));
check('the torch lifts off Earth (TWR > 1)', surfaceTWR(torch, 1) > 1, surfaceTWR(torch, 1).toFixed(2));
check('every new engine is a valid stack on its own', [gas, ff, fus, torch, ionT, pulse].every(s => s.problems.length === 0));

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall passed');
