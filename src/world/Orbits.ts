import { GAS_GIANTS, SOLAR_SYSTEM } from '../config/SolarSystemConfig';
import { ORBIT_CONFIG } from '../config/OrbitConfig';

/**
 * Where every body is at a moment of game time - the one source of body
 * positions in motion (openspec navigation-and-orbits, orbital-motion,
 * design decision 1).
 *
 * Each body goes round its parent on a circle: a moon round its planet
 * (its config `orbit.parent`), everything else round the Sun, which stays
 * put. Radius and starting angle come from the configured position, so at
 * t = 0 the layout is the configured one; the configured height above the
 * parent's plane is kept as it is. Periods: the Moon round Earth in
 * MOON_PERIOD_MIN, Earth round the Sun in EARTH_PERIOD_MIN, and the rest by
 * Kepler's third law - T ∝ a^1.5 round the Sun, and round a planet also
 * ∝ 1/sqrt(M) with M ∝ g R².
 */

export type Vec3 = { x: number; y: number; z: number };

export interface Orbit {
  id: string;
  parent: string | null;     // null: the Sun, the fixed root
  radius: number;            // in the parent's XZ plane
  height: number;            // y above the parent, kept fixed
  startAngle: number;        // radians, atan2(dz, dx) at t = 0
  periodS: number;           // seconds of game time per orbit (Infinity: still)
  configured: Vec3;          // the position at t = 0
}

const SUN = 'sun';

function buildOrbits(): Map<string, Orbit> {
  const bodies = new Map<string, { position: Vec3; parent: string | null; mass: number }>();
  for (const b of SOLAR_SYSTEM.bodies) {
    const parent = b.id === SUN ? null : (b.orbit?.parent && b.orbit.parent !== b.id ? b.orbit.parent : SUN);
    bodies.set(b.id, { position: b.position, parent, mass: b.gravity.strength * b.radius * b.radius });
  }
  for (const g of GAS_GIANTS) {
    bodies.set(g.id, { position: g.position, parent: SUN, mass: ORBIT_CONFIG.GAS_GIANT_GRAVITY * g.radius * g.radius });
  }
  // A parent the config names but doesn't have: orbit the Sun instead
  for (const b of bodies.values()) if (b.parent && !bodies.has(b.parent)) b.parent = SUN;

  const rel = (id: string) => {
    const b = bodies.get(id)!;
    const p = b.parent ? bodies.get(b.parent)!.position : b.position;
    return { dx: b.position.x - p.x, dy: b.position.y - p.y, dz: b.position.z - p.z };
  };
  const radiusOf = (id: string) => { const r = rel(id); return Math.hypot(r.dx, r.dz); };
  const earthA = radiusOf(ORBIT_CONFIG.ANCHOR_PLANET);
  const moonA = radiusOf(ORBIT_CONFIG.ANCHOR_MOON);
  const earthMass = bodies.get(ORBIT_CONFIG.ANCHOR_PLANET)!.mass;
  const planetT = ORBIT_CONFIG.EARTH_PERIOD_MIN * 60;
  const moonT = ORBIT_CONFIG.MOON_PERIOD_MIN * 60;

  const orbits = new Map<string, Orbit>();
  for (const [id, b] of bodies) {
    const r = rel(id);
    const radius = Math.hypot(r.dx, r.dz);
    let periodS = Infinity;
    if (b.parent === SUN && radius > 0) {
      periodS = planetT * Math.pow(radius / earthA, 1.5);
    } else if (b.parent && radius > 0) {
      const parentMass = bodies.get(b.parent)!.mass;
      periodS = moonT * Math.pow(radius / moonA, 1.5) * Math.sqrt(earthMass / parentMass);
    }
    orbits.set(id, {
      id, parent: b.parent, radius, height: r.dy,
      startAngle: Math.atan2(r.dz, r.dx), periodS, configured: { ...b.position },
    });
  }
  return orbits;
}

const ORBITS = buildOrbits();

/** Every orbit, keyed by body id. */
export function allOrbits(): ReadonlyMap<string, Orbit> {
  return ORBITS;
}

export function orbitOf(id: string): Orbit | undefined {
  return ORBITS.get(id);
}

/** A body's position at game time `t` (seconds). Moons ride their planets. */
export function positionAt(id: string, t: number, out: Vec3 = { x: 0, y: 0, z: 0 }): Vec3 {
  const o = ORBITS.get(id);
  if (!o) return out;
  if (!o.parent) { out.x = o.configured.x; out.y = o.configured.y; out.z = o.configured.z; return out; }
  positionAt(o.parent, t, out);
  const angle = o.startAngle + (Number.isFinite(o.periodS) ? (2 * Math.PI * t) / o.periodS : 0);
  out.x += o.radius * Math.cos(angle);
  out.y += o.height;
  out.z += o.radius * Math.sin(angle);
  return out;
}

/**
 * Where a body is drawn when `ref` is the fixed frame (design decision 3):
 * `pos(id, t) - pos(ref, t) + pos(ref, 0)`. The reference body sits at its
 * configured position, where everything on it was placed; the rest of the
 * system moves round it.
 */
export function framePositionAt(id: string, ref: string | null, t: number, out: Vec3 = { x: 0, y: 0, z: 0 }): Vec3 {
  positionAt(id, t, out);
  if (!ref || !ORBITS.has(ref)) return out;
  const r = positionAt(ref, t);
  const c = ORBITS.get(ref)!.configured;
  out.x += c.x - r.x; out.y += c.y - r.y; out.z += c.z - r.z;
  return out;
}

// ---- the game clock (design decision 2) ---------------------------------

let localTimeS = 0;
let networkTimeS: (() => number | null) | null = null;

/** Game time in seconds: the server's world clock online, else the saved local clock. */
export function gameTimeS(): number {
  const net = networkTimeS?.();
  return net !== null && net !== undefined ? net : localTimeS;
}

/** Advance the local clock (single player), scaled by TIME_SCALE. */
export function advanceGameTime(dt: number): void {
  localTimeS += dt * ORBIT_CONFIG.TIME_SCALE;
}

/** Restore / read the single-player clock (kept in the save). */
export function setLocalGameTime(t: number): void {
  localTimeS = Number.isFinite(t) && t > 0 ? t : 0;
}
export function localGameTime(): number {
  return localTimeS;
}

/** Online: game time follows the server's world clock (seconds, or null offline). */
export function useNetworkClock(source: (() => number | null) | null): void {
  networkTimeS = source;
}
