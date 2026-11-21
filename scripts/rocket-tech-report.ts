// Rocket tech tree report: every stack's numbers and what each trip costs,
// from the same tables and physics the game flies (src/rocket/RocketPerformance).
//
//   npx esbuild scripts/rocket-tech-report.ts --bundle --platform=node --format=esm --outfile=/tmp/rtr.mjs && node /tmp/rtr.mjs
//
// A trip is flown by simulateTransfer's careful pilot (full burn, coast,
// a landing burn to a safe touchdown); a hand-flown trip costs more.
//
// The bodies move (live orbits, src/world/Orbits.ts), so the distance
// between two of them changes: every trip is flown at SAMPLES moments
// spread over the pair's synodic period (the time their alignment repeats)
// and reported as its best and worst - the launch window.

import { ItemType, ITEM_DATA } from '../src/player/Inventory';
import { computeRocketStats, simulateTransfer, surfaceTWR, TransferBody } from '../src/rocket/RocketPerformance';
import { getBodyConfig } from '../src/config/SolarSystemConfig';
import { PlayerConfig } from '../src/config/PlayerConfig';
import { orbitOf, positionAt } from '../src/world/Orbits';

// Moments of a synodic period each trip is flown at
const SAMPLES = 8;

function body(id: string, t = 0): TransferBody {
  const b = getBodyConfig(id)!;
  // Ground level: the column top is the body radius; sea level sits
  // seaLevel blocks below it (terrain rises a little above that)
  const seaLevel = b.terrain.seaLevel ?? PlayerConfig.TERRAIN_SEA_LEVEL;
  return { name: b.name, center: positionAt(id, t), radius: b.radius, surfaceRadius: b.radius - seaLevel + 2, gravity: b.gravity.strength };
}

// The body (itself or the planet it rides) that orbits the Sun
function sunOrbiter(id: string): string {
  let o = orbitOf(id);
  while (o && o.parent && o.parent !== 'sun') o = orbitOf(o.parent);
  return o?.id ?? id;
}

// How long until two bodies line up the same way again: the synodic period
// of their Sun orbiters, or (one rides the other's planet) the moon's own
function synodicS(a: string, b: string): number {
  const A = sunOrbiter(a), B = sunOrbiter(b);
  if (A === B) {
    const moons = [a, b].filter(id => id !== A).map(id => orbitOf(id)!.periodS);
    return moons.length ? Math.max(...moons) : 0;
  }
  const ta = orbitOf(A)!.periodS, tb = orbitOf(B)!.periodS;
  return 1 / Math.abs(1 / ta - 1 / tb);
}

const STACKS: [string, ItemType[]][] = [
  ['Tier 1: Rocket Engine + Medium Tank + Command Module', [ItemType.ROCKET_ENGINE, ItemType.MEDIUM_FUEL_TANK, ItemType.COMMAND_MODULE]],
  ['Tier 1 + Cargo Bay', [ItemType.ROCKET_ENGINE, ItemType.MEDIUM_FUEL_TANK, ItemType.CARGO_BAY, ItemType.COMMAND_MODULE]],
  ['Tier 1 engine, two Medium Tanks', [ItemType.ROCKET_ENGINE, ItemType.MEDIUM_FUEL_TANK, ItemType.MEDIUM_FUEL_TANK, ItemType.COMMAND_MODULE]],
  ['Tier 2: Vacuum Engine + Large Tank + Command Module', [ItemType.VACUUM_ENGINE, ItemType.LARGE_FUEL_TANK, ItemType.COMMAND_MODULE]],
  ['Tier 2 + Cargo Bay', [ItemType.VACUUM_ENGINE, ItemType.LARGE_FUEL_TANK, ItemType.CARGO_BAY, ItemType.COMMAND_MODULE]],
  ['Both engines: Rocket Engine (lift) + Vacuum Engine + Large Tank', [ItemType.ROCKET_ENGINE, ItemType.VACUUM_ENGINE, ItemType.LARGE_FUEL_TANK, ItemType.COMMAND_MODULE]],
  ['Rocket Engine + Large Tank (mixed)', [ItemType.ROCKET_ENGINE, ItemType.LARGE_FUEL_TANK, ItemType.COMMAND_MODULE]],
];
const TRIPS: [string, string][] = [
  ['earth', 'moon'], ['moon', 'earth'], ['earth', 'sequoia'], ['moon', 'sequoia'],
  ['earth', 'cinder'], ['cinder', 'earth'], ['moon', 'cinder'], ['moon', 'nerith'], ['moon', 'kessel'], ['moon', 'vesper'],
];

for (const [label, parts] of STACKS) {
  const s = computeRocketStats(parts);
  console.log(`\n${label}`);
  console.log(`  parts: ${parts.map(p => ITEM_DATA[p].name).join(' / ')}`);
  console.log(`  dry ${s.dryMass} kg, wet ${s.wetMass} kg, fuel ${s.fuelCapacity} u, thrust ${s.thrust} N, ` +
    `Isp-eff ${(s.exhaustVelocity / 9.81).toFixed(0)} s, burn ${(s.fuelCapacity / s.fuelFlow).toFixed(0)} s, ` +
    `DELTA-V ${s.deltaV.toFixed(0)} m/s, cargo ${s.cargoSlots} slots, tier ${s.tier}`);
  console.log(`  TWR full: Earth ${surfaceTWR(s, 1).toFixed(2)}, Moon ${surfaceTWR(s, 0.4).toFixed(2)}, Cinder ${surfaceTWR(s, 0.6).toFixed(2)}`);
  for (const [a, b] of TRIPS) {
    const from0 = body(a);
    if (surfaceTWR(s, from0.gravity) <= 1) {
      console.log(`    ${from0.name.padEnd(8)} -> ${body(b).name.padEnd(8)} cannot lift off (TWR < 1)`);
      continue;
    }
    // Fly it across the window: best and worst moment
    const period = synodicS(a, b);
    const n = period > 0 ? SAMPLES : 1;
    let best: { dv: number; fuel: number; t: number; km: number } | null = null;
    let worst: { dv: number; fuel: number; t: number; km: number } | null = null;
    let fails = 0, worstFail = '';
    for (let i = 0; i < n; i++) {
      const t = (period * i) / n;
      const from = body(a, t), to = body(b, t);
      const km = Math.hypot(to.center.x - from.center.x, to.center.y - from.center.y, to.center.z - from.center.z);
      const r = simulateTransfer(s, from, to);
      if (!r.landed) {
        fails++;
        worstFail = r.fuelUsed >= s.fuelCapacity - 0.01 ? `out of fuel at ${km.toFixed(0)} m` : `hard landing ${r.impactSpeed.toFixed(1)} m/s at ${km.toFixed(0)} m`;
        continue;
      }
      const m = { dv: r.deltaVUsed, fuel: r.fuelUsed, t, km };
      if (!best || m.dv < best.dv) best = m;
      if (!worst || m.dv > worst.dv) worst = m;
    }
    const name = `${body(a).name.padEnd(8)} -> ${body(b).name.padEnd(8)}`;
    const pct = (f: number) => `${(100 * f / s.fuelCapacity).toFixed(0)}%`;
    const when = period > 0 ? ` (window repeats every ${(period / 60).toFixed(0)} min)` : '';
    if (!best) {
      console.log(`    ${name} FAILS at every moment - ${worstFail}${when}`);
    } else if (fails === 0) {
      console.log(`    ${name} lands always: best ${best.dv.toFixed(0)} m/s (${pct(best.fuel)}, ${best.km.toFixed(0)} m apart), worst ${worst!.dv.toFixed(0)} m/s (${pct(worst!.fuel)}, ${worst!.km.toFixed(0)} m)${when}`);
    } else {
      console.log(`    ${name} lands ${n - fails}/${n} of the time: best ${best.dv.toFixed(0)} m/s (${pct(best.fuel)}, ${best.km.toFixed(0)} m apart); otherwise ${worstFail}${when}`);
    }
  }
}
