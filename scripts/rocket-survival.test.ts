// Rocket power, re-entry heat and the parachute (openspec wool-air-and-reentry,
// tasks 3.1, 4.1, 4.2). Run: npx tsx scripts/rocket-survival.test.ts
import { ItemType } from '../src/player/Inventory';
import { ROCKET_CONFIG, GRAVITY_WELL } from '../src/config/RocketConfig';
import { POWER_CONFIG } from '../src/config/PowerConfig';
import { PlayerConfig } from '../src/config/PlayerConfig';
import {
  computeRocketStats, drainCharge, chargeSecondsLeft, poweredThrust, addCharge, swapBatteryWh,
  inAtmosphereShell, reentryStep, heatDamage, tryOpenChute, chuteDescentSpeed,
  gravityAccel, dampingFactor, ReentryState,
} from '../src/rocket/RocketPerformance';

const ok = (c: boolean, m: string) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) process.exitCode = 1; };

const DT = 1 / 60;
const cm = ItemType.COMMAND_MODULE;
const basic = computeRocketStats([ItemType.ROCKET_ENGINE, ItemType.MEDIUM_FUEL_TANK, cm]);
const packed = computeRocketStats([ItemType.ROCKET_ENGINE, ItemType.MEDIUM_FUEL_TANK, ItemType.BATTERY_PACK, cm]);

/** Seconds a charge lasts drained a frame at a time */
const flightSeconds = (wh: number, drawW: number): number => {
  let t = 0;
  while (wh > 0 && t < 36000) { wh = drainCharge(wh, drawW, DT); t += DT; }
  return t;
};

// ---- 3.1 power
const cmMinutes = flightSeconds(basic.batteryWh, basic.powerDrawW) / 60;
ok(cmMinutes >= 14 && cmMinutes <= 16, `the command module alone lasts ~15 minutes (${cmMinutes.toFixed(2)})`);
ok(Math.abs(chargeSecondsLeft(basic.batteryWh, basic.powerDrawW) / 60 - ROCKET_CONFIG.POWER.CELL_MINUTES) < 1e-9, 'its cell is CELL_MINUTES of flight');
const packMinutes = flightSeconds(packed.batteryWh, packed.powerDrawW) / 60;
ok(packed.batteryWh > basic.batteryWh && packMinutes > cmMinutes * 2, `a battery pack extends it (${packMinutes.toFixed(1)} min)`);
ok(packed.powerDrawW === basic.powerDrawW, 'a pack stores charge, it draws none');
ok(poweredThrust(basic.thrust, 0) === 0, 'no thrust when the battery is flat');
ok(poweredThrust(basic.thrust, 1) === basic.thrust, 'full thrust with charge');
ok(drainCharge(1, basic.powerDrawW, 3600) === 0, 'the charge never goes below 0');

// ---- 3.2 swapping a battery in
ok(swapBatteryWh() === POWER_CONFIG.BATTERIES[ItemType.BATTERY_LITHIUM].capacityWh, 'a swapped battery adds what a lithium-ion battery holds');
ok(addCharge(0, basic.batteryWh, swapBatteryWh()) === basic.batteryWh, 'a battery fills a flat command module, up to its capacity');
ok(addCharge(0, packed.batteryWh, swapBatteryWh()) === swapBatteryWh(), 'with a pack aboard it adds its full charge');

// ---- 4.1 re-entry heat
const earthR = 100;
const shell = earthR * ROCKET_CONFIG.REENTRY.shellRadiusMult;
ok(inAtmosphereShell(earthR + 10, earthR, true) && !inAtmosphereShell(shell + 1, earthR, true), 'the air reaches REENTRY.shellRadiusMult');
ok(!inAtmosphereShell(earthR + 10, earthR, false), 'an airless body has no air');
ok(ROCKET_CONFIG.REENTRY.shellRadiusMult > PlayerConfig.ATMOSPHERE_RADIUS_MULT, 'the heat shell is deeper than the sky shell (so heat can build)');

const fast = ROCKET_CONFIG.REENTRY.safeSpeed + 40;
let st: ReentryState = { heat: 0, leftAtmosphere: false };
for (let i = 0; i < 600; i++) st = reentryStep(st, true, fast, DT);
ok(st.heat === 0, 'inside the air since launch (never left): no heat at any speed');

/** A 1D radial flight with the flight physics' gravity and damping */
const fly = (r: number, v: number, thrustAccel: number, seconds: number, s: ReentryState) => {
  const damp = dampingFactor(ROCKET_CONFIG.PHYSICS.linearDamping, DT);
  let maxSpeed = 0, maxHeat = 0;
  for (let t = 0; t < seconds; t += DT) {
    v = (v + (thrustAccel - gravityAccel(r, earthR, 1)) * DT) * damp;
    r = Math.max(earthR, r + v * DT);
    s = reentryStep(s, inAtmosphereShell(r, earthR, true), Math.abs(v), DT);
    maxSpeed = Math.max(maxSpeed, Math.abs(v));
    maxHeat = Math.max(maxHeat, s.heat);
    if (r <= earthR) break;
  }
  return { r, v, s, maxSpeed, maxHeat };
};
const lift = basic.thrust / basic.wetMass;
const climb = fly(earthR + 1, 0, lift, 30, { heat: 0, leftAtmosphere: false });
ok(climb.r > shell && climb.maxHeat === 0, `leaving only: launch from Earth and climb out gains no heat (to ${climb.r.toFixed(0)} m, peak ${climb.maxSpeed.toFixed(0)} m/s)`);
ok(climb.s.leftAtmosphere, 'the climb did leave the air');

const fall = fly(earthR * GRAVITY_WELL.FALLOFF_RADIUS_MULT - 1, 0, 0, 60, { heat: 0, leftAtmosphere: true });
ok(fall.maxSpeed < ROCKET_CONFIG.REENTRY.safeSpeed && fall.maxHeat === 0, `a passive fall back from space stays under safeSpeed (${fall.maxSpeed.toFixed(1)} m/s): no heat`);

const dive = fly(shell + 1, -fast, -lift, 60, { heat: 0, leftAtmosphere: true });
ok(dive.maxHeat > ROCKET_CONFIG.REENTRY.damageFrom, `a powered dive back in heats past the damage level (${dive.maxHeat.toFixed(0)})`);

st = { heat: 0, leftAtmosphere: true };
const s1 = reentryStep(st, true, fast, 1);
ok(s1.reentering && s1.heat > 0, 'returning from space faster than safeSpeed: heat rises');
const s2 = reentryStep(s1, true, ROCKET_CONFIG.REENTRY.safeSpeed - 1, 1);
ok(s2.heat < s1.heat, 'slower than safeSpeed it cools');
const s3 = reentryStep(s1, false, fast, 1);
ok(s3.heat < s1.heat && !s3.reentering, 'out of the air it cools');
let burn: ReentryState = { heat: 0, leftAtmosphere: true }, t = 0;
while (burn.heat < ROCKET_CONFIG.REENTRY.maxHeat && t < 60) { burn = reentryStep(burn, true, fast, DT); t += DT; }
ok(burn.heat === ROCKET_CONFIG.REENTRY.maxHeat, `it reaches maxHeat (burns up) after ${t.toFixed(1)} s at ${fast} m/s`);
ok(heatDamage(ROCKET_CONFIG.REENTRY.damageFrom, 1) === 0 && heatDamage(ROCKET_CONFIG.REENTRY.maxHeat, 1) === ROCKET_CONFIG.REENTRY.damagePerS,
  'heat wears health only above damageFrom, damagePerS at maxHeat');

// ---- 4.2 the parachute
const P = ROCKET_CONFIG.PARACHUTE;
ok(tryOpenChute(true, false, 10) === 'noAir', 'the chute will not open in vacuum');
ok(tryOpenChute(true, true, P.maxOpenSpeed + 1) === 'torn', 'it tears above maxOpenSpeed');
ok(tryOpenChute(true, true, P.maxOpenSpeed - 1) === 'open', 'it opens in the air below maxOpenSpeed');
ok(tryOpenChute(false, true, 10) === 'noChute', 'no parachute part, no chute');
ok(fall.maxSpeed < P.maxOpenSpeed, 'a passive fall is slow enough to open it');
ok(P.terminalVelocity < ROCKET_CONFIG.HEALTH.impactDamageThreshold, 'its terminal velocity is under the landing damage threshold');
const g = PlayerConfig.BASE_GRAVITY;
let down = 30;
for (let i = 0; i < 10 / DT; i++) { down += g * DT; down = chuteDescentSpeed(down, g, DT); }
ok(Math.abs(down - P.terminalVelocity) < 0.01, `it holds the descent at terminalVelocity (${down.toFixed(3)} m/s after 10 s)`);
let slow = 0;
for (let i = 0; i < 5 / DT; i++) { slow += g * DT; slow = chuteDescentSpeed(slow, g, DT); }
ok(slow <= P.terminalVelocity + 1e-9 && slow > P.terminalVelocity - 0.5, 'from rest it falls to terminalVelocity, no faster');
const chute = ROCKET_CONFIG.PARTS[ItemType.PARACHUTE];
ok(!!chute && chute.tier === 1 && !chute.thrust, 'the parachute is a tier 1 part with no thrust');
const withChute = computeRocketStats([ItemType.ROCKET_ENGINE, ItemType.MEDIUM_FUEL_TANK, ItemType.PARACHUTE, cm]);
ok(withChute.dryMass === basic.dryMass + (chute?.dryMass ?? 0) && withChute.thrust === basic.thrust, 'it only adds mass');

if (process.exitCode) console.log('FAILED'); else console.log('all passed');

// ---- the solar array (design 6)
{
  const { computeRocketStats, inSunlight, solarCharge } = await import('../src/rocket/RocketPerformance');
  const bare = computeRocketStats([ItemType.ROCKET_ENGINE, ItemType.MEDIUM_FUEL_TANK, ItemType.COMMAND_MODULE]);
  const one = computeRocketStats([ItemType.ROCKET_ENGINE, ItemType.MEDIUM_FUEL_TANK, ItemType.COMMAND_MODULE, ItemType.SOLAR_ARRAY]);
  const two = computeRocketStats([ItemType.ROCKET_ENGINE, ItemType.MEDIUM_FUEL_TANK, ItemType.COMMAND_MODULE, ItemType.SOLAR_ARRAY, ItemType.SOLAR_ARRAY]);
  ok(bare.solarW === 0 && one.solarW > 0, 'a solar array gives the stack solar watts');
  ok(Math.abs(two.solarW - two.powerDrawW) < 1e-6, 'two arrays match the command module draw in full sun');
  ok(one.thrust === bare.thrust && one.dryMass > bare.dryMass, 'an array adds mass, no thrust');
  const sun = { x: 1000, y: 0, z: 0 };
  const planet = { center: { x: 0, y: 0, z: 0 }, radius: 100 };
  ok(inSunlight({ x: 150, y: 0, z: 0 }, sun, [planet]), 'the day side is sunlit');
  ok(!inSunlight({ x: -150, y: 0, z: 0 }, sun, [planet]), 'behind the planet is in shadow');
  ok(inSunlight({ x: -150, y: 200, z: 0 }, sun, [planet]), 'above the shadow is sunlit');
  const cap = one.batteryWh;
  ok(solarCharge(0, cap, one.solarW, true, 3600) === Math.min(cap, one.solarW), 'an hour of sun adds solarW Wh');
  ok(solarCharge(0, cap, one.solarW, false, 3600) === 0, 'no charge in shadow');
  ok(solarCharge(cap, cap, one.solarW, true, 60) === cap, 'charge stops at capacity');
}
