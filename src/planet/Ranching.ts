import { RANCHING } from '../config/SurvivalConfig';
import { FaunaSpecies } from '../config/FaunaConfig';

/**
 * Ranching rules (openspec wool-air-and-reentry, design 1): picking an
 * animal under the crosshair, shearing a sheep, hitting a cow. Pure - plain
 * numbers in, plain numbers out, no THREE, no scene - so
 * scripts/ranching.test.ts runs it headless. src/planet/Fauna.ts holds one
 * RanchState per creature and calls these; the numbers are RANCHING in
 * src/config/SurvivalConfig.ts; which species shears / gives a hide is
 * FaunaSpecies.ranch in src/config/FaunaConfig.ts.
 */

export type Vec3 = { x: number; y: number; z: number };

/** Per-animal ranching state (lives on the creature, not saved). */
export interface RanchState {
  /** Fleece grows back at this time (s, the fauna clock); <= now = full fleece. */
  shornUntil: number;
  /** Hits taken so far (hide animals). */
  hits: number;
}

export function newRanchState(): RanchState {
  return { shornUntil: 0, hits: 0 };
}

/** A whole number in [min, max] from rnd in [0, 1). */
export function rollRange(range: [number, number], rnd: number): number {
  const [lo, hi] = range;
  return lo + Math.min(hi - lo, Math.floor(rnd * (hi - lo + 1)));
}

export function isShorn(s: RanchState, now: number): boolean {
  return s.shornUntil > now;
}

/** Can shears take wool from this animal now? */
export function canShear(cfg: Pick<FaunaSpecies, 'ranch'>, s: RanchState, now: number): boolean {
  return cfg.ranch === 'wool' && !isShorn(s, now);
}

/**
 * Shear: the wool it gives (0 = nothing: not a wool animal, or still shorn).
 * Marks it shorn until REGROW_S from now.
 */
export function shear(cfg: Pick<FaunaSpecies, 'ranch'>, s: RanchState, now: number, rnd: number): number {
  if (!canShear(cfg, s, now)) return 0;
  s.shornUntil = now + RANCHING.REGROW_S;
  return rollRange(RANCHING.SHEAR_WOOL, rnd);
}

/**
 * One hit. A hide animal falls on its COW_HITS-th hit and gives leather;
 * anything else just takes the hit (the caller makes it flee).
 */
export function hit(cfg: Pick<FaunaSpecies, 'ranch'>, s: RanchState, rnd: number): { fallen: boolean; leather: number } {
  if (cfg.ranch !== 'hide') return { fallen: false, leather: 0 };
  s.hits++;
  if (s.hits < RANCHING.COW_HITS) return { fallen: false, leather: 0 };
  return { fallen: true, leather: rollRange(RANCHING.COW_LEATHER, rnd) };
}

/**
 * Distance along a ray (dir unit length) to where it enters a sphere, or
 * Infinity on a miss. A ray starting inside the sphere hits at 0.
 */
export function raySphere(o: Vec3, d: Vec3, c: Vec3, r: number): number {
  const ox = o.x - c.x, oy = o.y - c.y, oz = o.z - c.z;
  const b = ox * d.x + oy * d.y + oz * d.z;
  const cc = ox * ox + oy * oy + oz * oz - r * r;
  if (cc <= 0) return 0;
  if (b > 0) return Infinity; // outside and pointing away
  const disc = b * b - cc;
  if (disc < 0) return Infinity;
  return -b - Math.sqrt(disc);
}

/**
 * The animal under the crosshair: the nearest bounding sphere the ray
 * enters within `reach`. Returns its index in `spheres`, or -1.
 */
export function pickNearest(o: Vec3, d: Vec3, reach: number, spheres: ArrayLike<{ center: Vec3; radius: number }>): { index: number; distance: number } {
  let index = -1, distance = Infinity;
  for (let i = 0; i < spheres.length; i++) {
    const t = raySphere(o, d, spheres[i].center, spheres[i].radius);
    if (t <= reach && t < distance) { index = i; distance = t; }
  }
  return { index, distance };
}
