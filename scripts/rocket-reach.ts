// Where a stack can fly: the bodies as the transfer simulation sees them, the
// stacks a set of parts can build, and how far a stack flies and lands.
// Shared by scripts/rocket-tech-report.ts (the numbers) and
// scripts/rocket-reach.test.ts (the tier gates), so both measure the same way.

import { ItemType, ITEM_DATA } from '../src/player/Inventory';
import { computeRocketStats, simulateTransfer, stackProblems, stagedFlight, stagesOf, surfaceTWR, TransferBody } from '../src/rocket/RocketPerformance';
import { ROCKET_CONFIG } from '../src/config/RocketConfig';
import { getBodyConfig } from '../src/config/SolarSystemConfig';
import { PlayerConfig } from '../src/config/PlayerConfig';
import { orbitOf, positionAt } from '../src/world/Orbits';

/** A body where it is at game time t, for simulateTransfer */
export function body(id: string, t = 0): TransferBody {
  const b = getBodyConfig(id)!;
  // Ground level: the column top is the body radius; sea level sits
  // seaLevel blocks below it (terrain rises a little above that)
  const seaLevel = b.terrain.seaLevel ?? PlayerConfig.TERRAIN_SEA_LEVEL;
  return { name: b.name, center: positionAt(id, t), radius: b.radius, surfaceRadius: b.radius - seaLevel + 2, gravity: b.gravity.strength, hasAtmosphere: b.hasAtmosphere };
}

const span = (a: TransferBody, b: TransferBody) =>
  Math.hypot(b.center.x - a.center.x, b.center.y - a.center.y, b.center.z - a.center.z);

/** Ground to ground between two bodies (m): what a flight between them crosses */
export function gapM(a: TransferBody, b: TransferBody): number {
  return span(a, b) - a.surfaceRadius - b.surfaceRadius;
}

// The body (itself or the planet it rides) that orbits the Sun
function sunOrbiter(id: string): string {
  let o = orbitOf(id);
  while (o && o.parent && o.parent !== 'sun') o = orbitOf(o.parent);
  return o?.id ?? id;
}

/**
 * How long until two bodies line up the same way again: the synodic period
 * of their Sun orbiters, or (one rides the other's planet) the moon's own.
 * Infinity: co-orbital, always the same distance apart.
 */
export function synodicS(a: string, b: string): number {
  const A = sunOrbiter(a), B = sunOrbiter(b);
  if (A === B) {
    const moons = [a, b].filter(id => id !== A).map(id => orbitOf(id)!.periodS);
    return moons.length ? Math.max(...moons) : 0;
  }
  const ta = orbitOf(A)!.periodS, tb = orbitOf(B)!.periodS;
  return 1 / Math.abs(1 / ta - 1 / tb);
}

/** `n` moments spread over two bodies' synodic period (one when they never change alignment) */
export function windowMoments(a: string, b: string, n: number): number[] {
  const period = synodicS(a, b);
  if (!(period > 0) || !Number.isFinite(period)) return [0];
  return Array.from({ length: n }, (_, i) => (period * i) / n);
}

/** The closest two bodies come (ground to ground, m) over `n` moments of their window */
export function closestGapM(a: string, b: string, n: number): number {
  return Math.min(...windowMoments(a, b, n).map(t => gapM(body(a, t), body(b, t))));
}

/**
 * Every flyable stack (bottom to top) of `engine` and `tank`, a command
 * module on top, with up to `maxStages` stages split by stage separators,
 * within ROCKET_CONFIG.MAX_STACK_PARTS and passing stackProblems. Order inside
 * a stage changes nothing the physics sees, so each stage is its engines
 * then its tanks.
 */
export function stacksOf(engine: ItemType, tank: ItemType, maxStages: number): ItemType[][] {
  const out: ItemType[][] = [];
  const max = ROCKET_CONFIG.MAX_STACK_PARTS;
  const grow = (prefix: ItemType[], stagesLeft: number) => {
    for (let e = 1; prefix.length + e + 1 + 1 <= max; e++) {
      for (let n = 1; prefix.length + e + n + 1 <= max; n++) {
        const stage = [...prefix, ...Array(e).fill(engine), ...Array(n).fill(tank)];
        const stack = [...stage, ItemType.COMMAND_MODULE];
        if (stackProblems(stack).length === 0) out.push(stack);
        if (stagesLeft > 1) grow([...stage, ItemType.STAGE_SEPARATOR], stagesLeft - 1);
      }
    }
  };
  grow([], maxStages);
  return out;
}

/** The thrust-to-weight its first stage lifts off a body of this gravity with, full */
export function liftOffTWR(stack: readonly ItemType[], gravity: number): number {
  const first = stagedFlight(stack)[0];
  return surfaceTWR('lift' in first ? first.lift : first, gravity);
}

/**
 * What a real pilot spends against simulateTransfer's careful one. A
 * hand-flown trip is modelled as the careful pilot with 1 / PILOT_FACTOR of
 * the fuel. Derived from the damping-aware bot autopilot on the live server
 * (scripts/mp-bots/bot-brain.js flyTo, which now logs each flight):
 *   - the old tier-1 rocket (Medium Tank 50 kg dry, no frame mass, Isp 90,
 *     730 m/s) flew Earth -> Moon on 63, 56, 62 and 59 of its 100 units,
 *     where the careful pilot needs 24.3: 2.59 / 2.30 / 2.55 / 2.43x, mean 2.47.
 *   - one later flight landed with 58% left (42 used). The bot flies the
 *     Vacuum Engine + Medium Tank stack whenever it lifts off, so that was
 *     most likely not the basic rocket: for that stack the careful pilot
 *     needs 23.7 units (1.77x). For the basic rocket of that tuning (32.7
 *     careful) it would be 1.28x, below what a 2D replay of the bot's own
 *     guidance (instant turning, so a lower bound) spends at any Moon
 *     elevation - so it is not counted as a basic-rocket flight.
 *   - the Earth - Moon gap does not change: the Moon circles Earth at a
 *     fixed 400 m centre to centre (src/world/Orbits.ts). What varies from
 *     flight to flight is where the Moon stands in the pad's sky (the bot
 *     launches from 12 deg above the horizon, WINDOW_MIN_DOT, up to
 *     overhead): the replay spends ~20% more at 12 deg than overhead, and
 *     its ratio to the careful pilot falls a little as the rocket gets
 *     heavier for its thrust (0.94x from the old basic rocket to this one).
 * So 2.47 x 0.94 ~ 2.3 for the basic rocket at a typical launch.
 */
export const PILOT_FACTOR = 2.3;

/** The fuel a stack flies with: full tanks, shared by the pilot factor (1 = the careful pilot) */
function fuelFor(stack: readonly ItemType[], pilot: number): number {
  return stagesOf(stack, t => t).reduce((a, g) => a + computeRocketStats(g).fuelCapacity, 0) / pilot;
}

/**
 * Fly a stack (staged as it is built) from one body to another, full tanks,
 * by the careful pilot (`pilot` = 1) or a real one (PILOT_FACTOR). A
 * parachute is fitted (it is Earth-built): onto a body with air the landing
 * is a chute landing.
 */
export function fly(stack: readonly ItemType[], from: TransferBody, to: TransferBody, pilot = 1) {
  const fuel = fuelFor(stack, pilot);
  return simulateTransfer(stagedFlight(stack, 0, fuel), from, to, fuel, true);
}

/**
 * How far (ground to ground, m) a stack flies off `from` and lands on a body
 * like `to`, full tanks: `to` moved along the line until the careful pilot
 * no longer lands it. The stack's range for that pair of wells (`pilot` as fly).
 */
export function rangeM(stack: readonly ItemType[], from: TransferBody, to: TransferBody, pilot = 1, maxM = 20000): number {
  const fuel = fuelFor(stack, pilot);
  const flight = stagedFlight(stack, 0, fuel);
  const at = (gap: number): TransferBody => ({ ...to, center: { x: from.center.x + from.surfaceRadius + to.surfaceRadius + gap, y: from.center.y, z: from.center.z } });
  const lands = (gap: number) => simulateTransfer(flight, from, at(gap), fuel, true).landed;
  if (!lands(0)) return 0;
  let lo = 0, hi = maxM;
  while (hi - lo > 2) {
    const mid = (lo + hi) / 2;
    if (lands(mid)) lo = mid; else hi = mid;
  }
  return lo;
}

/** A stack's name, bottom to top, with repeats counted (2x Rocket Engine / ...) */
export function stackLabel(stack: readonly ItemType[]): string {
  const out: string[] = [];
  for (let i = 0; i < stack.length;) {
    let j = i;
    while (j < stack.length && stack[j] === stack[i]) j++;
    const name = ITEM_DATA[stack[i]]?.name ?? 'Part';
    out.push(j - i > 1 ? `${j - i}x ${name}` : name);
    i = j;
  }
  return out.join(' / ');
}

