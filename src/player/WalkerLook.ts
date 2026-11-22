/**
 * The walker's look on a planet: a tangent HEADING carried with the up
 * vector, and a PITCH off it (openspec player-heading). Ported from Pale
 * Blue Dot's walker (crates/pbd-app/src/walking.rs: `WalkingState`
 * `heading` / `up` / `pitch`, `transport_up`, `tangent_heading`,
 * `rotation`).
 *
 * The rules that make it robust:
 *  - The heading is never re-derived from a world axis. When up changes
 *    (walking, a teleport, a planet switch) the old heading is turned by the
 *    shortest rotation from the old up to the new one, then re-projected
 *    onto the new tangent plane (parallel transport). Crossing a pole, a
 *    pentagon or a whole planet keeps the heading continuous.
 *  - Mouse yaw turns the heading about up; mouse pitch is a clamped scalar.
 *    Raw deltas, applied this frame, nothing eased.
 *  - The camera is built from (heading, pitch, up) with right = heading x up,
 *    which is well defined at any pitch - no lookAt degeneracy, no roll.
 *  - Non-finite or zero inputs are ignored rather than written in, so a
 *    bad frame can never poison the look; a fallback axis is only taken
 *    when the input itself is degenerate (looking straight down at a new
 *    planet), never during a normal walk.
 *
 * Pure (three.js maths only) so `scripts/player-heading.test.ts` can drive it.
 */
import * as THREE from 'three';

export interface WalkerLook {
  /** Unit tangent to the surface: where the walker faces. */
  heading: THREE.Vector3;
  /** Unit radial up the heading was last transported to. */
  up: THREE.Vector3;
  /** Radians above the horizon, clamped to +-pitchLimit. */
  pitch: number;
}

/** Squared length below which a projected vector is treated as degenerate. */
const DEGENERATE_SQ = 1e-8;
const Y = new THREE.Vector3(0, 1, 0);
const X = new THREE.Vector3(1, 0, 0);
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _q = new THREE.Quaternion();
const _m = new THREE.Matrix4();

const finite = (v: THREE.Vector3): boolean =>
  Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);

export function newWalkerLook(up: THREE.Vector3): WalkerLook {
  const u = up.clone();
  if (!finite(u) || u.lengthSq() < DEGENERATE_SQ) u.copy(Y); else u.normalize();
  return { heading: tangentHeading(Y.clone().cross(u), u, new THREE.Vector3()), up: u, pitch: 0 };
}

/**
 * `forward` projected onto the plane normal to `up`, normalised, into `out`.
 * When `forward` is (anti)parallel to `up` it falls back to `fallback`
 * (projected), then to the east of `up` (Y x up), then to X - PBD's
 * `tangent_heading`. `up` must be unit length.
 */
export function tangentHeading(
  forward: THREE.Vector3, up: THREE.Vector3, out: THREE.Vector3, fallback?: THREE.Vector3,
): THREE.Vector3 {
  const candidates = fallback ? [forward, fallback] : [forward];
  for (const c of candidates) {
    if (!finite(c)) continue;
    _a.copy(c).addScaledVector(up, -c.dot(up));
    if (_a.lengthSq() > DEGENERATE_SQ) return out.copy(_a).normalize();
  }
  for (const c of [_b.copy(Y).cross(up), X]) {
    _a.copy(c).addScaledVector(up, -c.dot(up));
    if (_a.lengthSq() > DEGENERATE_SQ) return out.copy(_a).normalize();
  }
  return out.copy(X);
}

/**
 * Carry the heading to a new up (PBD `transport_up`): rotate it by the
 * shortest arc from the old up to `up`, then re-project. A non-finite or
 * zero `up` is ignored.
 */
export function transportUp(look: WalkerLook, up: THREE.Vector3): void {
  if (!finite(up) || up.lengthSq() < DEGENERATE_SQ) return;
  const next = up.clone().normalize();
  _q.setFromUnitVectors(look.up, next);
  const carried = look.heading.clone().applyQuaternion(_q);
  tangentHeading(carried, next, look.heading, look.heading);
  look.up.copy(next);
}

/**
 * Raw mouse look (PBD `read_walking_input`): yaw turns the heading about up,
 * pitch is clamped. Non-finite deltas are dropped.
 */
export function turnLook(look: WalkerLook, yaw: number, pitch: number, pitchLimit: number): void {
  if (!Number.isFinite(yaw) || !Number.isFinite(pitch)) return;
  if (yaw !== 0) {
    look.heading.applyQuaternion(_q.setFromAxisAngle(look.up, yaw));
    tangentHeading(look.heading, look.up, look.heading);
  }
  look.pitch = THREE.MathUtils.clamp(look.pitch + pitch, -pitchLimit, pitchLimit);
}

/**
 * Take the look from a view (PBD `look_along`): the forward's tangent part
 * becomes the heading and its angle off the horizon the pitch. Used when the
 * walker is handed a camera - leaving a rocket, a load, the end of the
 * space-to-ground roll. With the view's own up vector the heading is exact
 * at any pitch (h = f cos p - viewUp sin p for a level camera); without it,
 * looking straight up or down keeps the current heading carried to `up`
 * rather than inventing one.
 */
export function lookAlong(
  look: WalkerLook, forward: THREE.Vector3, up: THREE.Vector3, pitchLimit: number, viewUp?: THREE.Vector3,
): void {
  transportUp(look, up);
  if (!finite(forward) || forward.lengthSq() < DEGENERATE_SQ) return;
  const f = forward.clone().normalize();
  const sinPitch = THREE.MathUtils.clamp(f.dot(look.up), -1, 1);
  const pitch = Math.asin(sinPitch);
  const candidate = f.clone();
  if (viewUp && finite(viewUp)) candidate.multiplyScalar(Math.cos(pitch)).addScaledVector(viewUp, -sinPitch);
  tangentHeading(candidate, look.up, look.heading, look.heading);
  look.pitch = THREE.MathUtils.clamp(pitch, -pitchLimit, pitchLimit);
}

/** Where the camera looks: heading cos(pitch) + up sin(pitch). */
export function lookDirection(look: WalkerLook, out: THREE.Vector3): THREE.Vector3 {
  return out.copy(look.heading).multiplyScalar(Math.cos(look.pitch)).addScaledVector(look.up, Math.sin(look.pitch));
}

/**
 * The camera rotation (three.js: -Z forward, +Y up, +X right) for the look,
 * level with the horizon. right = heading x up holds at any pitch.
 */
export function lookQuaternion(look: WalkerLook, out: THREE.Quaternion): THREE.Quaternion {
  const forward = lookDirection(look, new THREE.Vector3());
  const right = new THREE.Vector3().crossVectors(look.heading, look.up).normalize();
  const camUp = new THREE.Vector3().crossVectors(right, forward).normalize();
  _m.makeBasis(right, camUp, forward.negate());
  return out.setFromRotationMatrix(_m);
}
