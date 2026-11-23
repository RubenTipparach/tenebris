import * as THREE from 'three';
import type { SchoolRules } from '../config/FaunaConfig';

/**
 * A school of fish as a boids flock (openspec underwater-life) - pure, no
 * planet or WebGL, so scripts/ocean-life.test.ts can check the rules.
 *
 * The school is ONE fauna record, its anchor (src/planet/Fauna.ts): the
 * anchor wanders, flees and keeps to the water like any solo swimmer. The
 * fish live round it: each has an offset from the anchor and a velocity
 * RELATIVE to the anchor's own, so a calm school cruises along with its
 * anchor and the flock rules only shape it - cohesion toward the flock's
 * centre (and a soft leash back to the anchor), alignment with neighbours,
 * separation from the nearest ones, flight from a threat, and a little
 * wander. Vertical motion is flattened, so a school is a lens, not a ball.
 * Fauna then clamps each fish into the water column under it.
 */

export interface Boid {
  /** Offset from the anchor (world units, world axes) */
  off: THREE.Vector3;
  /** Velocity relative to the anchor's (units / s) */
  vel: THREE.Vector3;
  /** Wander phase (radians), per fish */
  phase: number;
}

export interface SchoolFrame {
  /** Unit radial-out at the anchor (the planet's up there) */
  up: THREE.Vector3;
  /** The school's spread (units): where the leash starts to pull */
  radius: number;
  /** A threat's offset from the anchor (the nearest player), or null */
  threat: THREE.Vector3 | null;
  /** The species' flee radius (units) */
  fleeRadius: number;
  /** The species' cruise speed (units / s): the flock's relative speeds scale by it */
  speed: number;
  /** Clock (s), for the wander */
  time: number;
}

/** A new flock round its anchor: n fish scattered in a flat disc of the school's radius. */
export function seedSchool(n: number, up: THREE.Vector3, radius: number, R: SchoolRules, rnd: () => number = Math.random): Boid[] {
  const out: Boid[] = [];
  const a = new THREE.Vector3(), b = new THREE.Vector3();
  tangentBasis(up, a, b);
  for (let i = 0; i < n; i++) {
    const ang = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * radius * R.seedSpread;
    const off = a.clone().multiplyScalar(Math.cos(ang) * r).addScaledVector(b, Math.sin(ang) * r)
      .addScaledVector(up, (rnd() * 2 - 1) * radius * R.seedSpread * R.flatten);
    out.push({ off, vel: new THREE.Vector3(), phase: rnd() * Math.PI * 2 });
  }
  return out;
}

const acc = new THREE.Vector3();
const tmp = new THREE.Vector3();
const centroid = new THREE.Vector3();
const meanVel = new THREE.Vector3();
const ta = new THREE.Vector3();
const tb = new THREE.Vector3();

/** One flock step: steer every fish by the rules, then move it. */
export function stepSchool(boids: Boid[], f: SchoolFrame, R: SchoolRules, dt: number): void {
  const n = boids.length;
  if (!n || dt <= 0) return;
  centroid.set(0, 0, 0);
  for (const b of boids) centroid.add(b.off);
  centroid.divideScalar(n);
  const sep = f.radius * R.separation;
  const near = f.radius * R.neighbour;
  const maxRel = f.speed * R.maxRelSpeed;
  tangentBasis(f.up, ta, tb);
  for (let i = 0; i < n; i++) {
    const b = boids[i];
    acc.set(0, 0, 0);
    // cohesion: toward the flock's centre, and a leash back to the anchor past the school's radius
    acc.addScaledVector(tmp.copy(centroid).sub(b.off), R.cohesion);
    const d = b.off.length();
    if (d > f.radius) acc.addScaledVector(b.off, -R.leash * (d - f.radius) / Math.max(d, 1e-6));
    // separation and alignment from the neighbours
    meanVel.set(0, 0, 0);
    let count = 0;
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const o = boids[j];
      tmp.copy(b.off).sub(o.off);
      const dd = tmp.length();
      if (dd < sep) {
        // push apart, harder the closer (a coincident pair splits along its index)
        if (dd < 1e-5) tmp.copy(i < j ? ta : tb).multiplyScalar(-1);
        else tmp.divideScalar(dd);
        acc.addScaledVector(tmp, R.separationGain * (sep - dd) / sep * f.speed);
      }
      if (dd < near) { meanVel.add(o.vel); count++; }
    }
    if (count) acc.addScaledVector(meanVel.divideScalar(count).sub(b.vel), R.alignment);
    // matching the school: relative velocity dies away (so a calm school cruises as one)
    acc.addScaledVector(b.vel, -R.drag);
    // flight: away from a threat inside the flee radius, harder the closer
    if (f.threat && f.fleeRadius > 0) {
      tmp.copy(b.off).sub(f.threat);
      const td = tmp.length();
      if (td < f.fleeRadius) {
        tmp.addScaledVector(f.up, -tmp.dot(f.up) * (1 - R.flatten));
        if (tmp.lengthSq() < 1e-8) tmp.copy(ta);
        acc.addScaledVector(tmp.normalize(), R.fleeGain * f.speed * (1 - td / f.fleeRadius));
      }
    }
    // wander: a slow per-fish drift in the tangent plane
    const w = f.time * R.wanderRate + b.phase;
    acc.addScaledVector(ta, Math.cos(w) * R.wander * f.speed).addScaledVector(tb, Math.sin(w * 1.3) * R.wander * f.speed);
    // a school is flat: vertical steering is damped
    acc.addScaledVector(f.up, -acc.dot(f.up) * (1 - R.flatten));
    b.vel.addScaledVector(acc, dt);
    b.vel.addScaledVector(f.up, -b.vel.dot(f.up) * Math.min(1, (1 - R.flatten) * dt * R.drag));
    const sp = b.vel.length();
    if (sp > maxRel) b.vel.multiplyScalar(maxRel / sp);
    b.off.addScaledVector(b.vel, dt);
  }
}

/** Two unit tangents at `up` (any orthonormal pair). */
export function tangentBasis(up: THREE.Vector3, a: THREE.Vector3, b: THREE.Vector3): void {
  a.set(Math.abs(up.y) < 0.9 ? 0 : 1, Math.abs(up.y) < 0.9 ? 1 : 0, 0);
  a.addScaledVector(up, -a.dot(up)).normalize();
  b.crossVectors(up, a);
}
