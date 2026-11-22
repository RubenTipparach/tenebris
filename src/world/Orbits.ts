import { CelestialBodyType, GAS_GIANTS, SOLAR_SYSTEM } from '../config/SolarSystemConfig';
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

// ---- spin: day and night (openspec day-night, planet-spin) -------------

/**
 * Every landable body turns about its north pole, +Y (src/nav/compass.ts:
 * north is +Y on every body). The orbits turn about -Y, so the spin is the
 * other way round: the Sun's daily path and its yearly drift then turn the
 * same way, the Sun keeps rising in the east, and a solar day is
 * 1 / (1/sidereal + 1/year). A body's config gives its solar day (`dayMin`,
 * what a player lives by; else ORBIT_CONFIG.DAY_MIN for its type), and the
 * sidereal period is worked out from it and the year of the planet it is on
 * or round (its own orbit of the Sun, or its parent's).
 */
export interface Spin {
  id: string;
  dayS: number;      // solar day, seconds of game time (Infinity: no spin)
  periodS: number;   // sidereal period, seconds (Infinity: no spin)
}

function yearOf(id: string): number {
  let o = ORBITS.get(id);
  while (o && o.parent && o.parent !== SUN) o = ORBITS.get(o.parent);
  return o && o.parent === SUN ? o.periodS : Infinity;
}

function buildSpins(): Map<string, Spin> {
  const spins = new Map<string, Spin>();
  const defaults = ORBIT_CONFIG.DAY_MIN as Partial<Record<CelestialBodyType, number>>;
  for (const b of SOLAR_SYSTEM.bodies) {
    const dayMin = b.dayMin ?? defaults[b.type];
    const dayS = dayMin && dayMin > 0 ? dayMin * 60 : Infinity;
    const year = yearOf(b.id);
    // 1/sidereal = 1/day - 1/year; a day as long as the year (or longer) is no spin
    const rate = 1 / dayS - (Number.isFinite(year) ? 1 / year : 0);
    const periodS = Number.isFinite(dayS) && rate > 0 ? 1 / rate : Infinity;
    spins.set(b.id, { id: b.id, dayS: Number.isFinite(periodS) ? dayS : Infinity, periodS });
  }
  return spins;
}

const SPINS = buildSpins();

export function spinOf(id: string): Spin | undefined {
  return SPINS.get(id);
}

/** How far a body has turned at game time `t`: radians about +Y, in [0, 2pi). */
export function spinYawAt(id: string, t: number): number {
  const s = SPINS.get(id);
  if (!s || !Number.isFinite(s.periodS)) return 0;
  const turns = (t % s.periodS) / s.periodS;
  return 2 * Math.PI * (turns < 0 ? turns + 1 : turns);
}

/**
 * A reference frame: a body, sitting at its configured position, and how
 * far its axes have turned. `yaw` omitted: the frame turns with the body
 * (on it or near it - its sky wheels round). A number: the frame is held at
 * that angle (out in space, design decision 2).
 */
export interface Frame { body: string | null; yaw?: number }
export type FrameRef = Frame | string | null;

const asFrame = (f: FrameRef): Frame => (f === null || typeof f === 'string' ? { body: f } : f);

/** The yaw of a frame's axes at game time `t`. */
export function frameYawAt(frame: FrameRef, t: number): number {
  const f = asFrame(frame);
  if (f.yaw !== undefined) return f.yaw;
  return f.body ? spinYawAt(f.body, t) : 0;
}

/** Rotate `v` about +Y by `angle` radians (right-handed), in place. */
export function rotateY(v: Vec3, angle: number): Vec3 {
  if (angle === 0) return v;
  const c = Math.cos(angle), s = Math.sin(angle);
  const x = c * v.x + s * v.z;
  const z = -s * v.x + c * v.z;
  v.x = x; v.z = z;
  return v;
}

/**
 * Where a body is drawn in a frame (design decision 1):
 * `C + Ry(-yaw) (pos(id, t) - pos(ref, t))`, C the reference body's
 * configured position. The reference body sits where everything on it was
 * placed; the rest of the system moves - and, as the frame turns with the
 * body, wheels - round it. This is the one place the frame rotation is
 * applied: the Sun, every other body, the far layer and (through
 * frameYawAt) the stars all follow from it.
 */
export function framePositionAt(id: string, frame: FrameRef, t: number, out: Vec3 = { x: 0, y: 0, z: 0 }): Vec3 {
  positionAt(id, t, out);
  const f = asFrame(frame);
  if (!f.body || !ORBITS.has(f.body)) return out;
  const r = positionAt(f.body, t);
  const c = ORBITS.get(f.body)!.configured;
  out.x -= r.x; out.y -= r.y; out.z -= r.z;
  rotateY(out, -frameYawAt(f, t));
  out.x += c.x; out.y += c.y; out.z += c.z;
  return out;
}

/** A body's velocity in a frame (central difference over VELOCITY_DT_S; a turning frame's wheel included). */
export function frameVelocityAt(id: string, frame: FrameRef, t: number, out: Vec3 = { x: 0, y: 0, z: 0 }): Vec3 {
  const h = ORBIT_CONFIG.VELOCITY_DT_S;
  const a = framePositionAt(id, frame, t + h), b = framePositionAt(id, frame, t - h);
  out.x = (a.x - b.x) / (2 * h); out.y = (a.y - b.y) / (2 * h); out.z = (a.z - b.z) / (2 * h);
  return out;
}

/**
 * The frame for a traveller `distance` from the frame body's centre, whose
 * spin reach is `reach` (design decision 2). Inside the reach the frame
 * turns with the body; leaving it (past reach x SPIN_FRAME_HYSTERESIS) the
 * frame is held at the angle it had, so nothing jumps and the sky stops
 * turning; coming back inside, it turns with the body again (its sky snaps
 * to the body's real time of day). Pure.
 */
export function nextFrame(frame: Frame, distance: number, reach: number, t: number): Frame {
  if (!frame.body) return frame;
  const turning = frame.yaw === undefined;
  if (turning && distance > reach * ORBIT_CONFIG.SPIN_FRAME_HYSTERESIS) return { body: frame.body, yaw: spinYawAt(frame.body, t) };
  if (!turning && distance < reach) return { body: frame.body };
  return frame;
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
