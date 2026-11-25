import * as THREE from 'three';
import { NPC_CONFIG } from '../config/NpcConfig';

/**
 * NPC motion (openspec friendship-npcs, task 3.3): wandering near home on
 * walkable ground. Simulated only by the planet's host (NetSync.isHost);
 * everyone else mirrors its snapshots (NpcField). No terrain here - the
 * caller hands in a Ground - so the rules are testable on their own.
 *
 * An NPC lives on the unit sphere: `dir` is where it stands, its height is
 * the ground's under it. Walking moves `dir` along the great circle to the
 * target at WALK_MPS.
 */

const M = NPC_CONFIG.MOTION;

export interface Ground {
  radiusM: number;                           // the body's radius (metres), for metres <-> radians
  walkable(dir: THREE.Vector3): boolean;     // an NPC can stand here (dry ground)
}

export const enum NpcState { Idle = 0, Walk = 1 }

export interface NpcBody {
  home: THREE.Vector3;       // unit dir
  dir: THREE.Vector3;        // unit dir, where it stands
  face: THREE.Vector3;       // unit, tangent: the way it faces
  target: THREE.Vector3;     // unit dir, where it walks to
  state: NpcState;
  timer: number;             // seconds left in this state
  moveW: number;             // 0..1 walk blend
  talkW: number;             // 0..1 talk blend
  talking: boolean;          // held by a talk (task 4.1): stands still facing `talkTo`
  talkTo: THREE.Vector3 | null;
}

const X_AXIS = new THREE.Vector3(1, 0, 0), Y_AXIS = new THREE.Vector3(0, 1, 0);
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const lerp = (r: readonly [number, number], t: number) => r[0] + (r[1] - r[0]) * t;

/** Project v onto the tangent plane at up and normalise (keeps it when degenerate). */
export function tangent(v: THREE.Vector3, up: THREE.Vector3): THREE.Vector3 {
  v.addScaledVector(up, -v.dot(up));
  const l = v.length();
  if (l < 1e-9) v.crossVectors(up, Math.abs(up.x) < 0.9 ? X_AXIS : Y_AXIS).normalize(); // any tangent
  else v.multiplyScalar(1 / l);
  return v;
}

/** A direction `m` metres from `from` towards azimuth `az` (radians) round it. */
export function offsetDir(from: THREE.Vector3, az: number, m: number, radiusM: number, out = new THREE.Vector3()): THREE.Vector3 {
  const t1 = tangent(tmp.set(0, 1, 0), from);
  if (Math.abs(from.y) > 0.99) tangent(t1.set(1, 0, 0), from);
  const t2 = tmp2.crossVectors(from, t1);
  const a = m / radiusM;
  const dirT = t1.multiplyScalar(Math.cos(az)).addScaledVector(t2, Math.sin(az));
  return out.copy(from).multiplyScalar(Math.cos(a)).addScaledVector(dirT, Math.sin(a)).normalize();
}

/**
 * An ungrounded home (placePopulation found no dry ground near it) moves to
 * the nearest walkable spot, searched in rings round it. Unchanged when
 * nothing is found within SETTLE_MAX_M.
 */
export function settle(dir: THREE.Vector3, ground: Ground): THREE.Vector3 {
  if (ground.walkable(dir)) return dir.clone();
  const cand = new THREE.Vector3();
  for (let m = M.SETTLE_STEP_M; m <= M.SETTLE_MAX_M; m += M.SETTLE_STEP_M) {
    for (let i = 0; i < M.SETTLE_AZIMUTHS; i++) {
      offsetDir(dir, (i / M.SETTLE_AZIMUTHS) * Math.PI * 2, m, ground.radiusM, cand);
      if (ground.walkable(cand)) return cand.clone();
    }
  }
  return dir.clone();
}

export function newNpcBody(home: THREE.Vector3, rnd: () => number): NpcBody {
  const face = tangent(new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5), home);
  return {
    home: home.clone(), dir: home.clone(), face, target: home.clone(),
    state: NpcState.Idle, timer: lerp(M.IDLE_S, rnd()), moveW: 0, talkW: 0, talking: false, talkTo: null,
  };
}

/** Pick a walk target within WANDER_M of home on walkable ground; false when none was found. */
function pickTarget(b: NpcBody, ground: Ground, rnd: () => number): boolean {
  for (let i = 0; i < M.TARGET_TRIES; i++) {
    offsetDir(b.home, rnd() * Math.PI * 2, Math.sqrt(rnd()) * M.WANDER_M, ground.radiusM, b.target);
    if (ground.walkable(b.target)) return true;
  }
  b.target.copy(b.home);
  return false;
}

const angle = (a: THREE.Vector3, b: THREE.Vector3) => Math.acos(Math.max(-1, Math.min(1, a.dot(b))));

/** One host step: idle, pick a walk, walk (never onto water), stop to talk. */
export function stepNpc(b: NpcBody, ground: Ground, dt: number, rnd: () => number): void {
  const blend = Math.min(1, dt * M.BLEND_RATE);
  if (b.talking) {
    b.state = NpcState.Idle;
    b.timer = lerp(M.IDLE_S, rnd());
    if (b.talkTo) turnTowards(b, b.talkTo, dt);
    b.moveW += (0 - b.moveW) * blend;
    b.talkW += (1 - b.talkW) * blend;
    return;
  }
  b.talkW += (0 - b.talkW) * blend;
  b.timer -= dt;
  if (b.state === NpcState.Idle) {
    b.moveW += (0 - b.moveW) * blend;
    if (b.timer <= 0) {
      if (pickTarget(b, ground, rnd)) { b.state = NpcState.Walk; b.timer = M.WALK_MAX_S; }
      else b.timer = lerp(M.IDLE_S, rnd());
    }
    return;
  }
  // walking
  b.moveW += (1 - b.moveW) * blend;
  const left = angle(b.dir, b.target) * ground.radiusM;
  if (left <= M.ARRIVE_M || b.timer <= 0) { stop(b, rnd); return; }
  const heading = tangent(tmp.copy(b.target).sub(b.dir), b.dir);
  // the ground just ahead must be walkable (water, a cliff into the sea): else stop here
  const ahead = tmp2.copy(b.dir).addScaledVector(heading, M.STEP_LOOKAHEAD_M / ground.radiusM).normalize();
  if (!ground.walkable(ahead)) { stop(b, rnd); return; }
  const step = Math.min(left, M.WALK_MPS * dt) / ground.radiusM;
  b.dir.addScaledVector(heading, step).normalize();
  turnTowards(b, b.target, dt);
}

function stop(b: NpcBody, rnd: () => number): void {
  b.state = NpcState.Idle;
  b.timer = lerp(M.IDLE_S, rnd());
}

/** Ease the facing towards a direction on the sphere (a point the NPC looks at). */
export function turnTowards(b: NpcBody, at: THREE.Vector3, dt: number): void {
  const want = tangent(tmp.copy(at).sub(b.dir), b.dir);
  if (want.lengthSq() < 0.5) return;
  b.face.lerp(want, Math.min(1, dt * M.TURN_RATE));
  tangent(b.face, b.dir);
}
