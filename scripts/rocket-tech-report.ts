// Rocket tech tree report: every stack's numbers and what each trip costs,
// from the same tables and physics the game flies (src/rocket/RocketPerformance).
//
//   npx esbuild scripts/rocket-tech-report.ts --bundle --platform=node --format=esm --outfile=/tmp/rtr.mjs && node /tmp/rtr.mjs
//   (STACKS="^(Moon|Brontes):" node /tmp/rtr.mjs - only the stacks whose label matches)
//
// A trip is flown by simulateTransfer's careful pilot (full burn, coast,
// a landing burn to a safe touchdown); a hand-flown trip costs more.
//
// The bodies move (live orbits, src/world/Orbits.ts), so the distance
// between two of them changes: every trip is flown at SAMPLES moments
// spread over the pair's synodic period (the time their alignment repeats)
// and reported as its best and worst - the launch window.
//
// A stack with more than one engine type (design 6b) is flown lift-then-
// cruise: its highest-thrust mode inside a gravity well (take-off, landing),
// its most efficient mode between. Per-mode numbers are listed too.
//
// Ion cruise is reported analytically as well: the game's linear damping
// caps a rocket's speed at a terminal speed proportional to its
// acceleration, so a low-thrust cruise is a long steady burn - longer than
// a simulated pilot should sit through. The estimate is that burn: the leg
// between the two wells at terminal speed, its time and its fuel.

import { ItemType, ITEM_DATA } from '../src/player/Inventory';
import {
  computeRocketStats, dampingFactor, engineModeLabel, engineModes, liftCruiseProfile, RocketStats,
  simulateTransfer, stagedFlight, stagedStats, stagesOf, surfaceTWR, TRANSFER_MAX_S, TransferBody,
} from '../src/rocket/RocketPerformance';
import { GRAVITY_WELL, ROCKET_CONFIG } from '../src/config/RocketConfig';
import { SOLAR_SYSTEM } from '../src/config/SolarSystemConfig';
import { body, fly, gapM, liftOffTWR, PILOT_FACTOR, rangeM, stackLabel, stacksOf, synodicS, windowMoments } from './rocket-reach';

// Moments of a synodic period each trip is flown at
const SAMPLES = 8;

// The steady cruise burn of `stats` across the leg between two bodies' gravity
// wells: terminal speed v* = a dt d / (1 - d) (per-frame damping d), time
// leg / v*, fuel flow x time. Mass is taken full (the slowest case).
function cruiseEstimate(stats: RocketStats, from: TransferBody, to: TransferBody, span: number) {
  const dt = 1 / ROCKET_CONFIG.PHYSICS.dampingReferenceFps;
  const d = dampingFactor(ROCKET_CONFIG.PHYSICS.linearDamping, dt);
  const accel = stats.thrust / stats.wetMass;
  const terminal = (accel * dt * d) / (1 - d);
  const leg = Math.max(0, span - (from.radius + to.radius) * GRAVITY_WELL.FALLOFF_RADIUS_MULT);
  const seconds = leg / terminal;
  return { leg, terminal, seconds, fuel: seconds * stats.fuelFlow };
}

const STACKS: [string, ItemType[]][] = [
  ['Tier 1: Rocket Engine + Medium Tank + Command Module', [ItemType.ROCKET_ENGINE, ItemType.MEDIUM_FUEL_TANK, ItemType.COMMAND_MODULE]],
  ['Tier 1 + Cargo Bay', [ItemType.ROCKET_ENGINE, ItemType.MEDIUM_FUEL_TANK, ItemType.CARGO_BAY, ItemType.COMMAND_MODULE]],
  ['Tier 1 engine, two Medium Tanks', [ItemType.ROCKET_ENGINE, ItemType.MEDIUM_FUEL_TANK, ItemType.MEDIUM_FUEL_TANK, ItemType.COMMAND_MODULE]],
  ['Tier 2: Vacuum Engine + Large Tank + Command Module', [ItemType.VACUUM_ENGINE, ItemType.LARGE_FUEL_TANK, ItemType.COMMAND_MODULE]],
  ['Tier 2 + Cargo Bay', [ItemType.VACUUM_ENGINE, ItemType.LARGE_FUEL_TANK, ItemType.CARGO_BAY, ItemType.COMMAND_MODULE]],
  ['Both engines: Rocket Engine (lift) + Vacuum Engine + Large Tank', [ItemType.ROCKET_ENGINE, ItemType.VACUUM_ENGINE, ItemType.LARGE_FUEL_TANK, ItemType.COMMAND_MODULE]],
  ['Rocket Engine + Large Tank (mixed)', [ItemType.ROCKET_ENGINE, ItemType.LARGE_FUEL_TANK, ItemType.COMMAND_MODULE]],
  ['Tier 3: Nuclear Thermal Engine + Large Tank + Command Module', [ItemType.NUCLEAR_THERMAL_ENGINE, ItemType.LARGE_FUEL_TANK, ItemType.COMMAND_MODULE]],
  ['Tier 3: Rocket Engine (lift) + Nuclear Thermal Engine + Large Tank', [ItemType.ROCKET_ENGINE, ItemType.NUCLEAR_THERMAL_ENGINE, ItemType.LARGE_FUEL_TANK, ItemType.COMMAND_MODULE]],
  ['Tier 3: two Rocket Engines (lift) + Nuclear Thermal Engine + Large Tank', [ItemType.ROCKET_ENGINE, ItemType.ROCKET_ENGINE, ItemType.NUCLEAR_THERMAL_ENGINE, ItemType.LARGE_FUEL_TANK, ItemType.COMMAND_MODULE]],
  ['Tier 4: Rocket Engine (lift) + Ion Drive + Reactor Core + Large Tank', [ItemType.ROCKET_ENGINE, ItemType.ION_DRIVE, ItemType.REACTOR_CORE, ItemType.LARGE_FUEL_TANK, ItemType.COMMAND_MODULE]],
  ['Tier 4: two Rocket Engines (lift) + Ion Drive + Reactor Core + Large Tank', [ItemType.ROCKET_ENGINE, ItemType.ROCKET_ENGINE, ItemType.ION_DRIVE, ItemType.REACTOR_CORE, ItemType.LARGE_FUEL_TANK, ItemType.COMMAND_MODULE]],
  ['Tier 4: two Rocket Engines (lift) + Ion Drive + Reactor Core + Medium Tank', [ItemType.ROCKET_ENGINE, ItemType.ROCKET_ENGINE, ItemType.ION_DRIVE, ItemType.REACTOR_CORE, ItemType.MEDIUM_FUEL_TANK, ItemType.COMMAND_MODULE]],
  ['Tier 4: Ion Drive + Reactor Core + Large Tank (in space)', [ItemType.ION_DRIVE, ItemType.REACTOR_CORE, ItemType.LARGE_FUEL_TANK, ItemType.COMMAND_MODULE]],
  ['Ion Drive with no Reactor Core (cannot fire)', [ItemType.ION_DRIVE, ItemType.LARGE_FUEL_TANK, ItemType.COMMAND_MODULE]],
  // ---- the engine ladder past the Moon (space-exploration, design 3) ----
  ['Moon: Ion Thruster (solar-electric) + Large Tank', [ItemType.ION_THRUSTER, ItemType.LARGE_FUEL_TANK, ItemType.COMMAND_MODULE]],
  ['Moon: Rocket Engine (lift) + separator + Ion Thruster + Large Tank', [ItemType.ROCKET_ENGINE, ItemType.MEDIUM_FUEL_TANK, ItemType.STAGE_SEPARATOR, ItemType.ION_THRUSTER, ItemType.LARGE_FUEL_TANK, ItemType.COMMAND_MODULE]],
  ['Ember: Gas-Core Engine + two Large Tanks', [ItemType.GAS_CORE_ENGINE, ItemType.LARGE_FUEL_TANK, ItemType.LARGE_FUEL_TANK, ItemType.COMMAND_MODULE]],
  ['Lodestone: Gas-Core Engine (lift) + Fission-Fragment Drive + Reactor Core + Large Tank', [ItemType.GAS_CORE_ENGINE, ItemType.FISSION_FRAGMENT_DRIVE, ItemType.REACTOR_CORE, ItemType.LARGE_FUEL_TANK, ItemType.COMMAND_MODULE]],
  ['Brand: Nuclear Pulse Drive + three Large Tanks + Cargo Bay', [ItemType.NUCLEAR_PULSE_DRIVE, ItemType.LARGE_FUEL_TANK, ItemType.LARGE_FUEL_TANK, ItemType.LARGE_FUEL_TANK, ItemType.CARGO_BAY, ItemType.COMMAND_MODULE]],
  ['Aurelia: D-He3 Fusion Drive + Cryo Tank + two Large Tanks + Cargo Bay', [ItemType.FUSION_DRIVE, ItemType.CRYO_TANK, ItemType.LARGE_FUEL_TANK, ItemType.LARGE_FUEL_TANK, ItemType.CARGO_BAY, ItemType.COMMAND_MODULE]],
  ['Brontes: Magnetic Fusion Torch + Cryo Tank + two Large Tanks + Cargo Bay', [ItemType.FUSION_TORCH, ItemType.CRYO_TANK, ItemType.LARGE_FUEL_TANK, ItemType.LARGE_FUEL_TANK, ItemType.CARGO_BAY, ItemType.COMMAND_MODULE]],
];
const TRIPS: [string, string][] = [
  ['earth', 'moon'], ['moon', 'earth'], ['earth', 'sequoia'], ['moon', 'sequoia'],
  ['earth', 'cinder'], ['cinder', 'earth'], ['moon', 'cinder'], ['moon', 'nerith'], ['moon', 'kessel'], ['moon', 'vesper'],
  // each route's hops (space-exploration): sunward, then outward
  ['sequoia', 'ferrum'], ['ferrum', 'umbra'], ['umbra', 'vesper'],
  ['kessel', 'cinder'], ['cinder', 'nerith'], ['nerith', 'halcyon'], ['halcyon', 'tessaly'],
];

// STACKS=<regex> reports only the stacks whose label matches it (the full report is slow)
const only = process.env.STACKS;
for (const [label, parts] of STACKS.filter(([l]) => !only || new RegExp(only).test(l))) {
  const s = computeRocketStats(parts);
  const staged = stagesOf(parts, t => t).length > 1;
  if (staged) s.deltaV = stagedStats(parts).deltaV;
  console.log(`\n${label}`);
  console.log(`  parts: ${parts.map(p => ITEM_DATA[p].name).join(' / ')}`);
  console.log(`  dry ${s.dryMass} kg, wet ${s.wetMass} kg, fuel ${s.fuelCapacity} u, thrust ${s.thrust} N, ` +
    `Isp-eff ${(s.exhaustVelocity / 9.81).toFixed(0)} s, burn ${(s.fuelCapacity / s.fuelFlow).toFixed(0)} s, ` +
    `DELTA-V ${s.deltaV.toFixed(0)} m/s, cargo ${s.cargoSlots} slots, tier ${s.tier}`);
  console.log(`  TWR full: Earth ${surfaceTWR(s, 1).toFixed(2)}, Moon ${surfaceTWR(s, 0.4).toFixed(2)}, Cinder ${surfaceTWR(s, 0.6).toFixed(2)}`);
  for (const p of s.problems) console.log(`  CANNOT FIRE: ${p}`);
  if (s.thrust <= 0) continue;
  const modes = engineModes(parts);
  const profile = liftCruiseProfile(parts);
  if (modes.length > 1) {
    for (const m of modes) {
      const ms = computeRocketStats(parts, 0, m);
      console.log(`  mode ${engineModeLabel(m).padEnd(22)} thrust ${String(ms.thrust).padStart(6)} N, Isp-eff ${(ms.exhaustVelocity / 9.81).toFixed(0).padStart(4)} s, ` +
        `burn ${(ms.fuelCapacity / ms.fuelFlow).toFixed(0).padStart(5)} s, DELTA-V ${ms.deltaV.toFixed(0).padStart(5)} m/s, TWR Earth ${surfaceTWR(ms, 1).toFixed(2)}, Moon ${surfaceTWR(ms, 0.4).toFixed(2)}`);
    }
    if (profile) console.log(`  flown lift-then-cruise: ${engineModeLabel(profile.lift.mode)} in a gravity well, ${engineModeLabel(profile.cruise.mode)} between`);
  }
  // The engine the trip lifts off on, and what flies it
  const first = stagedFlight(parts)[0];
  const lifter = staged ? ('lift' in first ? first.lift : first) : profile?.lift ?? s;
  const flown = staged ? stagedFlight(parts) : profile ?? s;
  for (const [a, b] of TRIPS) {
    const from0 = body(a);
    if (!staged && profile && profile.cruise.exhaustVelocity > profile.lift.exhaustVelocity) {
      const to0 = body(b);
      const span0 = Math.hypot(to0.center.x - from0.center.x, to0.center.y - from0.center.y, to0.center.z - from0.center.z);
      const c = cruiseEstimate(profile.cruise, from0, to0, span0);
      const over = c.seconds > TRANSFER_MAX_S;
      console.log(`    ${from0.name.padEnd(8)} -> ${to0.name.padEnd(8)} ${engineModeLabel(profile.cruise.mode)} cruise (analytic, t=0): ${c.leg.toFixed(0)} m between wells at ${c.terminal.toFixed(2)} m/s ` +
        `= ${(c.seconds / 60).toFixed(1)} min burn, ${c.fuel.toFixed(1)} of ${s.fuelCapacity} u fuel` +
        (c.fuel > s.fuelCapacity ? ' - MORE THAN THE TANKS HOLD' : '') + (over ? ` (longer than the ${TRANSFER_MAX_S} s simulation, not flown)` : ''));
      if (over) continue;
    }
    if (surfaceTWR(lifter, from0.gravity) <= 1) {
      console.log(`    ${from0.name.padEnd(8)} -> ${body(b).name.padEnd(8)} cannot lift off (TWR < 1)`);
      continue;
    }
    // Fly it across the window: best and worst moment
    const period = synodicS(a, b);
    // Co-orbital bodies (same orbit, e.g. Sequoia and Metropole Prime) never change alignment: one moment
    const moments = windowMoments(a, b, SAMPLES);
    const n = moments.length;
    let best: { dv: number; fuel: number; t: number; km: number } | null = null;
    let worst: { dv: number; fuel: number; t: number; km: number } | null = null;
    let fails = 0, worstFail = '';
    for (let i = 0; i < n; i++) {
      const t = moments[i];
      const from = body(a, t), to = body(b, t);
      const km = Math.hypot(to.center.x - from.center.x, to.center.y - from.center.y, to.center.z - from.center.z);
      // a parachute is fitted: onto a body with air it lands under it
      const r = simulateTransfer(flown, from, to, undefined, true);
      if (!r.landed) {
        fails++;
        worstFail = r.seconds >= TRANSFER_MAX_S ? `not there after ${TRANSFER_MAX_S} s simulated` : r.fuelUsed >= s.fuelCapacity - 0.01 ? `out of fuel at ${km.toFixed(0)} m` : `hard landing ${r.impactSpeed.toFixed(1)} m/s at ${km.toFixed(0)} m`;
        continue;
      }
      const m = { dv: r.deltaVUsed, fuel: r.fuelUsed, t, km };
      if (!best || m.dv < best.dv) best = m;
      if (!worst || m.dv > worst.dv) worst = m;
    }
    const name = `${body(a).name.padEnd(8)} -> ${body(b).name.padEnd(8)}`;
    const pct = (f: number) => `${(100 * f / s.fuelCapacity).toFixed(0)}%`;
    const when = !Number.isFinite(period) ? ' (same orbit: always this far apart)' : period > 0 ? ` (window repeats every ${(period / 60).toFixed(0)} min)` : '';
    if (!best) {
      console.log(`    ${name} FAILS at every moment - ${worstFail}${when}`);
    } else if (fails === 0) {
      console.log(`    ${name} lands always: best ${best.dv.toFixed(0)} m/s (${pct(best.fuel)}, ${best.km.toFixed(0)} m apart), worst ${worst!.dv.toFixed(0)} m/s (${pct(worst!.fuel)}, ${worst!.km.toFixed(0)} m)${when}`);
    } else {
      console.log(`    ${name} lands ${n - fails}/${n} of the time: best ${best.dv.toFixed(0)} m/s (${pct(best.fuel)}, ${best.km.toFixed(0)} m apart); otherwise ${worstFail}${when}`);
    }
  }
}

// ---- Tier 1's reach: every Earth-built stack (scripts/rocket-reach.test.ts holds it to the Moon) ----
// Hand-flown: the careful pilot on 1 / PILOT_FACTOR of the fuel (measured in the game)
if (!only || process.env.REACH) {
  const earth = body('earth'), moon = body('moon');
  const H = PILOT_FACTOR;
  const tier1 = stacksOf(ItemType.ROCKET_ENGINE, ItemType.MEDIUM_FUEL_TANK, 2).filter(st => liftOffTWR(st, 1) > 1);
  const basic = [ItemType.ROCKET_ENGINE, ItemType.MEDIUM_FUEL_TANK, ItemType.COMMAND_MODULE];
  const best = tier1.map(st => ({ st, r: rangeM(st, earth, moon, H) })).sort((x, y) => y.r - x.r)[0].st;
  console.log(`\nTier 1 reach: ${tier1.length} Earth-built stacks lift off Earth (staged ones are refused: the Rocket Engine only fires as the bottom stage)`);
  console.log(`  Earth -> Moon is ${gapM(earth, moon).toFixed(0)} m ground to ground; hand-flown = ${H}x the careful pilot's fuel`);
  for (const [name, st] of [['basic', basic], ['best', best]] as const) {
    const cap = computeRocketStats(st).fuelCapacity;
    const share = (r: { landed: boolean; fuelUsed: number }) => r.landed ? `${(100 * r.fuelUsed / cap).toFixed(0)}% careful, ~${(100 * H * r.fuelUsed / cap).toFixed(0)}% hand-flown` : 'FAILS';
    console.log(`  ${name}: ${stackLabel(st)} - delta-v ${stagedStats(st).deltaV.toFixed(0)} m/s, TWR Earth ${liftOffTWR(st, 1).toFixed(2)}, ` +
      `range ${rangeM(st, earth, moon).toFixed(0)} m careful / ${rangeM(st, earth, moon, H).toFixed(0)} m hand-flown, ` +
      `Earth -> Moon ${share(fly(st, earth, moon))}, Moon -> Earth (refuelled) ${share(fly(st, moon, earth))}`);
  }
  // How much of each body's window the best Earth-built stack lands there (a chute where there is air)
  for (const from of ['earth', 'moon']) {
    const reach: string[] = [];
    for (const b of SOLAR_SYSTEM.bodies.map(x => x.id).filter(id => id !== 'earth' && id !== 'moon' && id !== 'sun')) {
      const ts = windowMoments(from, b, 64);
      const lands = ts.filter(t => fly(best, body(from, t), body(b, t), H).landed).length;
      if (lands) reach.push(`${body(b).name} ${(100 * lands / ts.length).toFixed(0)}%`);
    }
    console.log(`  from ${body(from).name}${from === 'moon' ? ' (refuelled)' : ''}, the best stack hand-flown lands beyond the Moon only while a body swings close (share of its window): ${reach.join(', ') || 'none'}`);
  }
}
