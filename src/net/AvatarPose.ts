/**
 * Other players' avatars, the pure part (openspec avatar-anims): the body
 * and head transforms from a reported pose, and the player's action on the
 * pose frame. Three.js maths only, so `scripts/avatar-pose.test.ts` drives
 * it directly.
 */
import * as THREE from 'three';
import { AvatarConfig } from '../config/AvatarConfig';

// ---- body upright, head pitched -----------------------------------------

/**
 * Walker orientation -> avatar frame (the avatar looks down -Z, the walker
 * camera along +Z): half a turn about up. The pose frame's `q` is the
 * walker orientation times this (mainPlanet setupMultiplayer getPose).
 */
export const AVATAR_FROM_WALKER = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

/** Squared length below which a projected vector is treated as degenerate. */
const DEGENERATE_SQ = 1e-8;
const X = new THREE.Vector3(1, 0, 0);
const Y = new THREE.Vector3(0, 1, 0);
const NEG_Z = new THREE.Vector3(0, 0, -1);
const HEAD_LIMIT = THREE.MathUtils.degToRad(AvatarConfig.HEAD_PITCH_LIMIT_DEG);
const _look = new THREE.Vector3();
const _right = new THREE.Vector3();
const _camUp = new THREE.Vector3();
const _h = new THREE.Vector3();
const _x = new THREE.Vector3();
const _z = new THREE.Vector3();
const _m = new THREE.Matrix4();

function project(v: THREE.Vector3, up: THREE.Vector3, out: THREE.Vector3): boolean {
  out.copy(v).addScaledVector(up, -v.dot(up));
  if (!(out.lengthSq() > DEGENERATE_SQ)) return false;
  out.normalize();
  return true;
}

export interface AvatarTransforms {
  /** The body: +Y = the surface up, -Z = the heading (the look on the tangent plane). */
  body: THREE.Quaternion;
  /** The look's angle above the horizon (radians), clamped to the head limit. */
  headPitch: number;
}

/**
 * Split a reported orientation (`q`: avatar frame, looks down -Z, the
 * walker's camera turned half a revolution about up) into an upright body
 * and a head pitch, against `up` (the surface up at the avatar, unit).
 *
 * The walker camera never rolls, so its right vector is horizontal and
 * heading = up x right holds at any pitch, straight up and down included.
 */
export function avatarTransforms(q: THREE.Quaternion, up: THREE.Vector3, out?: AvatarTransforms): AvatarTransforms {
  const res = out ?? { body: new THREE.Quaternion(), headPitch: 0 };
  _look.copy(NEG_Z).applyQuaternion(q);
  _right.copy(X).applyQuaternion(q);
  _camUp.copy(Y).applyQuaternion(q);
  const fromRight = _x.copy(up).cross(_right);
  // Heading: from the camera right, else the look, else the camera up
  // (looking down, the camera up leans forward; looking up, back)
  if (!project(fromRight, up, _h) && !project(_look, up, _h)) {
    if (project(_camUp, up, _h)) {
      if (_look.dot(up) > 0) _h.negate();
    } else {
      _h.copy(X).addScaledVector(up, -X.dot(up)).normalize();
    }
  }
  _x.copy(_h).cross(up).normalize();
  _z.copy(_h).negate();
  _m.makeBasis(_x, up, _z);
  res.body.setFromRotationMatrix(_m);
  const s = THREE.MathUtils.clamp(_look.dot(up), -1, 1);
  res.headPitch = THREE.MathUtils.clamp(Math.asin(s), -HEAD_LIMIT, HEAD_LIMIT);
  return res;
}

// ---- the action on the pose frame ---------------------------------------

/** What the player is doing continuously. */
export enum LoopAction { IDLE = 0, MINE = 1 }
/** A one-shot action: one arm animation each. */
export enum ShotAction { NONE = 0, SWING = 1, PLACE = 2, INTERACT = 3 }

export interface ActionFrame {
  loop: LoopAction;
  shotKind: ShotAction;
  /** Counts one-shots, wrapping at AvatarConfig.SHOT_SEQ_MOD. */
  shotSeq: number;
  /** The held ItemType id (0 = empty hand). */
  held: number;
}

export const IDLE_ACTION: Readonly<ActionFrame> = { loop: LoopAction.IDLE, shotKind: ShotAction.NONE, shotSeq: 0, held: 0 };
const LOOP_MAX = LoopAction.MINE;
const SHOT_MAX = ShotAction.INTERACT;

/** The pose frame's `a` field: [loop, shotKind, shotSeq, held]. */
export function encodeAction(a: ActionFrame): number[] {
  return [a.loop, a.shotKind, a.shotSeq, a.held];
}

/** `a` from the network: anything missing or malformed is idle, empty-handed. */
export function decodeAction(raw: unknown): ActionFrame {
  if (!Array.isArray(raw) || raw.length !== 4) return { ...IDLE_ACTION };
  const ok = (v: unknown, max: number): v is number =>
    typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= max;
  const [loop, kind, seq, held] = raw;
  if (!ok(loop, LOOP_MAX) || !ok(kind, SHOT_MAX) || !ok(seq, AvatarConfig.SHOT_SEQ_MOD - 1) ||
      !ok(held, AvatarConfig.ACTION_FIELD_MAX)) return { ...IDLE_ACTION };
  return { loop: loop as LoopAction, shotKind: kind as ShotAction, shotSeq: seq, held };
}

/**
 * The receiving end of the one-shot counter, per remote player: a changed
 * counter is one new one-shot. The first frame only primes it (joining
 * must not replay a swing from before).
 */
export class OneShotTracker {
  private last: number | null = null;

  /** The one-shot to start for this frame, or NONE. */
  public next(a: ActionFrame): ShotAction {
    const prev = this.last;
    this.last = a.shotSeq;
    if (prev === null || prev === a.shotSeq || a.shotKind === ShotAction.NONE) return ShotAction.NONE;
    return a.shotKind;
  }
}

/** The sending end: the local player's action, read into each pose frame. */
export class LocalAction {
  private minedAt = -Infinity;
  private frameDt = 0;
  private lastFrameAt = -Infinity;
  private shotKind = ShotAction.NONE;
  private shotSeq = 0;

  /**
   * A game frame ran at `nowS` (wall clock). At a low frame rate the mining
   * grace stretches to cover two frame gaps, so mining never reads as gaps.
   */
  public frameAt(nowS: number): void {
    if (Number.isFinite(this.lastFrameAt) && nowS >= this.lastFrameAt) this.frameDt = nowS - this.lastFrameAt;
    this.lastFrameAt = nowS;
  }

  /** Mining progress was shown at `nowS`. */
  public mining(nowS: number): void {
    this.minedAt = nowS;
  }

  /** A one-shot happened (a place, an interact, a swing). */
  public shot(kind: ShotAction): void {
    this.shotKind = kind;
    this.shotSeq = (this.shotSeq + 1) % AvatarConfig.SHOT_SEQ_MOD;
  }

  public frame(nowS: number, held: number): ActionFrame {
    return {
      loop: nowS - this.minedAt <= Math.max(AvatarConfig.MINE_GRACE_S, 2 * this.frameDt) ? LoopAction.MINE : LoopAction.IDLE,
      shotKind: this.shotKind,
      shotSeq: this.shotSeq,
      held: Number.isInteger(held) && held > 0 && held <= AvatarConfig.ACTION_FIELD_MAX ? held : 0,
    };
  }
}
