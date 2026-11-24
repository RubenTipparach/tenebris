// Upgrade parts (openspec space-exploration, task 6.3): each brings the stat
// it is for, through the one computeRocketStats path.
//   npx tsx scripts/rocket-upgrades.test.ts
import { ItemType as I, ItemType, ITEM_DATA } from '../src/player/Inventory';
import { computeRocketStats, reentryStep, chuteLandingSpeed, chuteDescentSpeed, droneTarget } from '../src/rocket/RocketPerformance';
import { ROCKET_CONFIG } from '../src/config/RocketConfig';
import { MACHINE_CONFIG } from '../src/config/PowerConfig';
import { rodLifeS } from '../src/power/MachineLogic';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

let failed = 0;
const check = (name: string, ok: boolean, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` (${detail})` : ''}`);
  if (!ok) failed++;
};
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const eng = I.ROCKET_ENGINE, cm = I.COMMAND_MODULE;
const eq = (...items: ItemType[]) => items.map(itemType => ({ itemType, quantity: 1 }));
const base = computeRocketStats([eng, I.LARGE_FUEL_TANK, cm]);

// tanks: more fuel per kg of tank
const mk2 = computeRocketStats([eng, I.FUEL_TANK_MK2, cm]), mk3 = computeRocketStats([eng, I.FUEL_TANK_MK3, cm]);
check('fuel tank mk2 and mk3 hold more fuel than the large tank, for less tank mass per unit', mk2.fuelCapacity > base.fuelCapacity && mk3.fuelCapacity > mk2.fuelCapacity
  && ROCKET_CONFIG.PARTS[I.FUEL_TANK_MK3]!.dryMass / mk3.fuelCapacity < ROCKET_CONFIG.PARTS[I.LARGE_FUEL_TANK]!.dryMass / base.fuelCapacity);
check('mk tanks give more delta-v on the same engine', mk3.deltaV > mk2.deltaV && mk2.deltaV > base.deltaV, `${base.deltaV.toFixed(0)} < ${mk2.deltaV.toFixed(0)} < ${mk3.deltaV.toFixed(0)}`);
// cargo
const slots = (t: ItemType) => computeRocketStats([eng, I.MEDIUM_FUEL_TANK, t, cm]).cargoSlots;
check('cargo bays: mk2 < large < mk3, all above the plain bay', slots(I.CARGO_BAY) < slots(I.CARGO_BAY_MK2) && slots(I.CARGO_BAY_MK2) < slots(I.LARGE_CARGO_BAY) && slots(I.LARGE_CARGO_BAY) < slots(I.CARGO_BAY_MK3));
// reactor
const ion = (core: ItemType) => computeRocketStats([I.ION_DRIVE, core, I.LARGE_FUEL_TANK, cm]);
check('the compact reactor core runs the ion drive like a reactor core, lighter', ion(I.COMPACT_REACTOR_CORE).thrust === ion(I.REACTOR_CORE).thrust && ion(I.COMPACT_REACTOR_CORE).problems.length === 0
  && ion(I.COMPACT_REACTOR_CORE).dryMass < ion(I.REACTOR_CORE).dryMass);
// cryo tank
const fusion = computeRocketStats([I.FUSION_DRIVE, I.LARGE_FUEL_TANK, cm]);
check('the fusion drive needs a cryo tank, and says so', fusion.thrust === 0 && /Cryo Tank/.test(fusion.problems.join(' ')));
check('with a cryo tank it fires', computeRocketStats([I.FUSION_DRIVE, I.CRYO_TANK, I.LARGE_FUEL_TANK, cm]).thrust > 0);
// batteries and solar
const wh = (t: ItemType) => computeRocketStats([eng, I.LARGE_FUEL_TANK, cm], 0, null, eq(t)).batteryWh;
check('battery packs: plain < mk2 < mk3', wh(I.BATTERY_PACK) < wh(I.BATTERY_PACK_MK2) && wh(I.BATTERY_PACK_MK2) < wh(I.BATTERY_PACK_MK3));
const sol = (t: ItemType) => computeRocketStats([eng, I.LARGE_FUEL_TANK, cm], 0, null, eq(t)).solarW;
check('solar array mk2 charges more than the plain one', sol(I.SOLAR_ARRAY_MK2) > sol(I.SOLAR_ARRAY));
// RTG
const rtg = computeRocketStats([eng, I.LARGE_FUEL_TANK, cm], 0, null, eq(I.RTG));
check('an RTG gives charge at all times, the command module\'s whole draw', rtg.rtgW > 0 && rtg.rtgW >= rtg.powerDrawW);
// radiators
const cool = (...t: ItemType[]) => computeRocketStats([eng, I.LARGE_FUEL_TANK, cm], 0, null, eq(...t)).cooling;
check('radiators shed heat: mk2 more, two stack but never reach all of it', cool() === 0 && cool(I.RADIATOR) > 0 && cool(I.RADIATOR_MK2) > cool(I.RADIATOR)
  && cool(I.RADIATOR, I.RADIATOR_MK2) > cool(I.RADIATOR_MK2) && cool(I.RADIATOR, I.RADIATOR_MK2) < 1);
const hot = (c: number) => reentryStep({ heat: 0, leftAtmosphere: true }, true, 120, 0.1, { cooling: c }).heat;
check('a radiator cuts the re-entry heat gained by its share', Math.abs(hot(cool(I.RADIATOR)) - hot(0) * (1 - cool(I.RADIATOR))) < 1e-9 && hot(cool(I.RADIATOR)) < hot(0));
// drogue
const brake = computeRocketStats([eng, I.LARGE_FUEL_TANK, cm], 0, null, eq(I.PARACHUTE, I.DROGUE_CHUTE)).chuteBrake;
check('a drogue lands the chute slower, and is not a chute itself', brake > 1 && chuteLandingSpeed(1, brake) < chuteLandingSpeed(1)
  && computeRocketStats([eng, I.LARGE_FUEL_TANK, cm], 0, null, eq(I.DROGUE_CHUTE)).chutes === 0);
check('it brakes a fall faster too', chuteDescentSpeed(30, 9.8, 0.5, 1, brake) < chuteDescentSpeed(30, 9.8, 0.5, 1));
// heat shields
const cap = (t: ItemType) => ROCKET_CONFIG.EQUIPMENT[t]!.heatShield!;
check('heat shields: plain < mk2 < mk3', cap(I.HEAT_SHIELD) < cap(I.HEAT_SHIELD_MK2) && cap(I.HEAT_SHIELD_MK2) < cap(I.HEAT_SHIELD_MK3));
// survey drone
const drones = computeRocketStats([eng, I.LARGE_FUEL_TANK, cm], 0, null, [{ itemType: I.SURVEY_DRONE, quantity: 2 }]).drones;
check('survey drones are counted', drones === 2);
const bodies = [
  { id: 'glint', center: { x: 0, y: 0, z: 0 }, radius: 28 },
  { id: 'sequoia', center: { x: 0, y: 0, z: 500 }, radius: 200, hasAtmosphere: true },
  { id: 'aurelia', center: { x: 500, y: 0, z: 0 }, radius: 150, gasGiant: true },
];
check('a drone reaches an airless body in range', droneTarget({ x: 0, y: 60, z: 0 }, bodies)?.id === 'glint');
check('not one out of range, with air, or a gas giant', droneTarget({ x: 0, y: 200, z: 0 }, bodies) === null
  && droneTarget({ x: 0, y: 0, z: 300 }, bodies.slice(1)) === null && droneTarget({ x: 520, y: 0, z: 0 }, bodies.slice(2)) === null);
// reactor rod
check('the mk2 fuel rod runs a reactor twice as long', rodLifeS(I.FUEL_ROD_MK2) === 2 * rodLifeS(I.FUEL_ROD) && rodLifeS(I.FUEL_ROD) === MACHINE_CONFIG.REACTOR_RODS[I.FUEL_ROD]);
// every upgrade has its art
const UPGRADES = [I.FUEL_TANK_MK2, I.FUEL_TANK_MK3, I.CARGO_BAY_MK2, I.LARGE_CARGO_BAY, I.CARGO_BAY_MK3, I.COMPACT_REACTOR_CORE, I.CRYO_TANK,
  I.BATTERY_PACK_MK2, I.BATTERY_PACK_MK3, I.SOLAR_ARRAY_MK2, I.RADIATOR, I.RADIATOR_MK2, I.DROGUE_CHUTE, I.RTG, I.SURVEY_DRONE,
  I.HEAT_SHIELD_MK2, I.HEAT_SHIELD_MK3, I.RADIATION_LINING, I.COOLANT_LOOP, I.FUEL_ROD_MK2];
for (const t of UPGRADES) {
  const d = ITEM_DATA[t];
  const files = [d.texture, d.rocketPart?.texturePath].filter((f): f is string => !!f);
  check(`${d.name} has its icon${d.rocketPart ? ' and model texture' : ''}`, files.every(f => existsSync(join(ROOT, 'public', f))));
}

if (failed) { console.log(`\n${failed} failed`); process.exit(1); }
console.log('\nall passed');
