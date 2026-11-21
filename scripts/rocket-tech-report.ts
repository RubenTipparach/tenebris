// Rocket tech tree report: every stack's numbers and what each trip costs,
// from the same tables and physics the game flies (src/rocket/RocketPerformance).
//
//   npx esbuild scripts/rocket-tech-report.ts --bundle --platform=node --format=esm --outfile=/tmp/rtr.mjs && node /tmp/rtr.mjs
//
// A trip is flown by simulateTransfer's careful pilot (full burn, coast,
// a landing burn to a safe touchdown); a hand-flown trip costs more.

import { ItemType, ITEM_DATA } from '../src/player/Inventory';
import { computeRocketStats, simulateTransfer, surfaceTWR, TransferBody } from '../src/rocket/RocketPerformance';
import { getBodyConfig } from '../src/config/SolarSystemConfig';
import { PlayerConfig } from '../src/config/PlayerConfig';

function body(id: string): TransferBody {
  const b = getBodyConfig(id)!;
  // Ground level: the column top is the body radius; sea level sits
  // seaLevel blocks below it (terrain rises a little above that)
  const seaLevel = b.terrain.seaLevel ?? PlayerConfig.TERRAIN_SEA_LEVEL;
  return { name: b.name, center: b.position, radius: b.radius, surfaceRadius: b.radius - seaLevel + 2, gravity: b.gravity.strength };
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
    const from = body(a), to = body(b);
    const canLift = surfaceTWR(s, from.gravity) > 1;
    const r = canLift ? simulateTransfer(s, from, to) : null;
    const line = !r ? 'cannot lift off (TWR < 1)'
      : r.landed ? `lands, needs ${r.deltaVUsed.toFixed(0)} m/s (${r.fuelUsed.toFixed(0)} u, ${(100 * r.fuelUsed / s.fuelCapacity).toFixed(0)}% of tanks, ${r.seconds.toFixed(0)} s)`
      : r.fuelUsed >= s.fuelCapacity - 0.01 ? `FAILS - out of fuel (impact ${r.impactSpeed.toFixed(1)} m/s)`
      : `FAILS - hard landing ${r.impactSpeed.toFixed(1)} m/s (${r.fuelUsed.toFixed(0)} u used)`;
    console.log(`    ${from.name.padEnd(8)} -> ${to.name.padEnd(8)} ${line}`);
  }
}
