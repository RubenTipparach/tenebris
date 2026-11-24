import * as THREE from 'three';
import { getAssetPath } from '../utils/assetPath';
import { AvatarConfig } from '../config/AvatarConfig';
import { LoopAction, ShotAction } from './AvatarPose';
import { PlayerConfig } from '../config/PlayerConfig';
import { machineLightUniforms } from '../planet/MachineLight';
import techVert from '../shaders/tech/tech.vert';
import techFrag from '../shaders/tech/tech.frag';

/**
 * A player's avatar: a blocky humanoid built from their look (skin, hair,
 * clothes - picked in the character creator) and moved by the baked player
 * clips (public/animations/player.anim.json, written by
 * scripts/gen-fauna-anims.py in the same rig format as the animals).
 *
 * Frame: the group's origin is at the FEET (the player's position) and +Y
 * is the player's up, so a pose from the player drops straight on. The
 * player looks down -Z. (Body parts are laid out round the eyes and lifted
 * by -FEET_Y.)
 */

// Each slot picks from a fixed palette (PICO-8 colours plus skin tones), so
// every avatar sits with the game's art
export const LOOK_OPTIONS = {
  skin: ['#ffccaa', '#e8b08c', '#c68a62', '#9a6644', '#6b4530', '#ffd9c2', '#7fd4a0', '#9fb0ff'],
  hair: ['#000000', '#5f3a1f', '#ab5236', '#ffec27', '#fff1e8', '#ff77a8', '#29adff', '#83769c'],
  style: ['short', 'long', 'mohawk', 'cap', 'helmet', 'none'],
  shirt: ['#1d2b53', '#7e2553', '#008751', '#ab5236', '#5f574f', '#c2c3c7', '#fff1e8', '#ff004d', '#ffa300', '#ffec27', '#00e436', '#29adff', '#83769c', '#ff77a8'],
  pants: ['#1d2b53', '#5f574f', '#000000', '#ab5236', '#008751', '#83769c', '#c2c3c7', '#7e2553'],
  boots: ['#000000', '#5f574f', '#ab5236', '#1d2b53', '#c2c3c7'],
} as const;

export type LookSlot = keyof typeof LOOK_OPTIONS;
/**
 * A look: the creator's picks, plus `suit: 'on'` while a space suit is worn
 * (openspec wool-air-and-reentry, design 4) - not a creator pick, it rides
 * the same synced look so other players see the suit.
 */
export type Look = { [K in LookSlot]: string } & { suit?: typeof SUIT_ON };
export const SUIT_ON = 'on';

// The space suit over the clothes: white body, grey gloves / boots / air
// pack, a helmet with a dark visor (PICO-8 colours)
const SUIT_LOOK = { BODY: '#fff1e8', TRIM: '#c2c3c7', VISOR: '#1d2b53', PACK: [0.36, 0.42, 0.14] } as const;
export const LOOK_SLOTS = Object.keys(LOOK_OPTIONS) as LookSlot[];

// Body proportions (model units = metres; eyes at 0, feet at FEET_Y)
const R = {
  FEET_Y: -1.6,
  HIP_Y: -0.9,
  SHOULDER_Y: -0.33,
  HEAD: 0.4,
  HEAD_Y: -0.1,
  TORSO: [0.5, 0.6, 0.28],
  ARM: [0.16, 0.6, 0.16],
  ARM_X: 0.33,
  LEG: [0.2, 0.7, 0.2],
  LEG_X: 0.12,
  BOOT: 0.14,
  TAG_ABOVE_EYES: 0.6,
  // Above this ground speed (m/s) the walk clip is fully on
  WALK_SPEED: 3,
} as const;

export function defaultLook(seed = 0): Look {
  const pick = (slot: LookSlot, salt: number) => {
    const opts = LOOK_OPTIONS[slot];
    return opts[Math.abs(Math.floor(seed * 7919 + salt * 104729)) % opts.length];
  };
  return { skin: pick('skin', 1), hair: pick('hair', 2), style: pick('style', 3), shirt: pick('shirt', 4), pants: pick('pants', 5), boots: pick('boots', 6) };
}

/** A look from untrusted data (the network, storage): unknown values fall back to the default. */
export function sanitizeLook(raw: unknown, seed = 0): Look {
  const look = defaultLook(seed);
  if (raw && typeof raw === 'object') {
    for (const slot of LOOK_SLOTS) {
      const v = (raw as Record<string, unknown>)[slot];
      if (typeof v === 'string' && (LOOK_OPTIONS[slot] as readonly string[]).includes(v)) look[slot] = v;
    }
    if ((raw as Record<string, unknown>).suit === SUIT_ON) look.suit = SUIT_ON;
  }
  return look;
}

interface AnimFile {
  frames: number;
  clips: Record<string, { duration: number; tracks: Record<string, number[][]> }>;
}
type Clip = AnimFile['clips'][string];
// The arm clip each one-shot plays (a swing is one cycle of the mine chop)
const SHOT_CLIP: Record<ShotAction, string | null> = {
  [ShotAction.NONE]: null,
  [ShotAction.SWING]: 'mine',
  [ShotAction.PLACE]: 'place',
  [ShotAction.INTERACT]: 'interact',
};
const MINE_CLIP = 'mine';

// Held-item textures, shared by every avatar (pixel art: nearest filtering)
export interface HeldItemArt {
  texture: string;
  atlasRegion?: { x: number; y: number; width: number; height: number; atlasWidth: number; atlasHeight: number };
}
const heldTextures = new Map<string, THREE.Texture>();
function heldTexture(art: HeldItemArt): THREE.Texture {
  const r = art.atlasRegion;
  const key = r ? `${art.texture}|${r.x},${r.y},${r.width},${r.height}` : art.texture;
  let tex = heldTextures.get(key);
  if (!tex) {
    tex = new THREE.TextureLoader().load(getAssetPath(art.texture));
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.colorSpace = THREE.SRGBColorSpace;
    if (r) {
      tex.repeat.set(r.width / r.atlasWidth, r.height / r.atlasHeight);
      tex.offset.set(r.x / r.atlasWidth, 1 - (r.y + r.height) / r.atlasHeight);
    }
    heldTextures.set(key, tex);
  }
  return tex;
}

let animFile: AnimFile | null = null;
let animLoading = false;
function loadAnim(): void {
  if (animFile || animLoading) return;
  animLoading = true;
  fetch(getAssetPath('/animations/player.anim.json'))
    .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
    .then(f => { animFile = f as AnimFile; })
    .catch(e => { animLoading = false; console.error('[Avatar] could not load player animation:', e); });
}

export class Avatar {
  public readonly group = new THREE.Group();
  private parts: Record<string, THREE.Object3D> = {};
  private rest = new Map<THREE.Object3D, THREE.Vector3>();
  private materials: THREE.Material[] = [];
  private geometries: THREE.BufferGeometry[] = [];
  private time = Math.random() * 10;
  private walk = 0;  // 0 = idle .. 1 = walking
  // The look pitch the head shows (radians above the horizon)
  private headPitch = 0;
  private headPitchTarget = 0;
  // Arm actions (openspec avatar-anims): the mine loop, a one-shot clip
  private loop = LoopAction.IDLE;
  private loopTime = 0;
  private shot: { clip: string; t: number } | null = null;
  private actionWeight = 0;
  private lastActionClip: string | null = null;
  private held: { key: string; mesh: THREE.Mesh } | null = null;

  /**
   * `lighting`: 'world' (an avatar in the game) is lit like the ground and
   * the placed machines - the planet's sun and sky fill by time of day plus
   * nearby torches (the tech shader's flat-colour mode, MachineLight's shared
   * uniforms) - so it doesn't glow at night. 'studio' (the character
   * creator's preview, off any planet) keeps plain lights.
   */
  constructor(look: Look, name?: string, lighting: 'world' | 'studio' = 'world') {
    loadAnim();
    const mat = (c: string) => {
      const m = lighting === 'studio'
        ? new THREE.MeshLambertMaterial({ color: c })
        : new THREE.ShaderMaterial({
          defines: { TECH_COLOR: '' },
          uniforms: {
            ...machineLightUniforms(),
            techColor: { value: new THREE.Color(c) },
            ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
            directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
          },
          vertexShader: techVert,
          fragmentShader: techFrag,
        });
      this.materials.push(m);
      return m;
    };
    const box = (w: number, h: number, d: number, m: THREE.Material, y = 0, x = 0, z = 0) => {
      const g = new THREE.BoxGeometry(w, h, d);
      this.geometries.push(g);
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(x, y, z);
      return mesh;
    };
    const pivot = (name: string, x: number, y: number, z = 0, parent: THREE.Object3D = this.parts.body) => {
      const p = new THREE.Group();
      p.position.set(x, y, z);
      parent.add(p);
      this.parts[name] = p;
      this.rest.set(p, p.position.clone());
      return p;
    };

    // Model faces +Z (the rig's forward); the player looks down -Z
    const model = new THREE.Group();
    model.rotation.y = Math.PI;
    model.position.y = -R.FEET_Y;
    this.group.add(model);
    this.parts.body = new THREE.Group();
    model.add(this.parts.body);
    this.rest.set(this.parts.body, new THREE.Vector3());

    const suit = look.suit === SUIT_ON;
    const skin = mat(look.skin);
    const shirt = mat(suit ? SUIT_LOOK.BODY : look.shirt), pants = mat(suit ? SUIT_LOOK.BODY : look.pants);
    const boots = mat(suit ? SUIT_LOOK.TRIM : look.boots), hair = mat(suit ? SUIT_LOOK.BODY : look.hair);
    const hands = suit ? boots : skin;
    const dark = mat('#000000');

    // Torso
    const [tw, th, td] = R.TORSO;
    this.parts.body.add(box(tw, th, td, shirt, R.HIP_Y + th / 2));
    // Head: face toward +Z, two eyes
    const head = pivot('head', 0, R.SHOULDER_Y);
    const hy = R.HEAD_Y - R.SHOULDER_Y;
    head.add(box(R.HEAD, R.HEAD, R.HEAD, skin, hy));
    for (const ex of [-0.08, 0.08]) head.add(box(0.06, 0.06, 0.02, dark, hy + 0.03, ex, R.HEAD / 2 + 0.005));
    this.addHair(head, suit ? 'helmet' : look.style, hair, mat(suit ? SUIT_LOOK.VISOR : '#29adff'), hy, box);
    // The suit's air pack on the back (the model faces +Z)
    if (suit) {
      const [pw, ph, pd] = SUIT_LOOK.PACK;
      this.parts.body.add(box(pw, ph, pd, boots, R.HIP_Y + th * 0.55, 0, -(td + pd) / 2));
    }
    // Arms hang from the shoulders: sleeve then hand
    const [aw, ah, ad] = R.ARM;
    for (const [side, x] of [['armL', R.ARM_X], ['armR', -R.ARM_X]] as const) {
      const arm = pivot(side, x, R.SHOULDER_Y);
      arm.add(box(aw, ah * 0.75, ad, shirt, -ah * 0.375));
      arm.add(box(aw * 0.9, ah * 0.25, ad * 0.9, hands, -ah * 0.875));
    }
    // Legs hang from the hips: trousers then boots
    const [lw, lh, ld] = R.LEG;
    for (const [side, x] of [['legL', R.LEG_X], ['legR', -R.LEG_X]] as const) {
      const leg = pivot(side, x, R.HIP_Y);
      leg.add(box(lw, lh - R.BOOT, ld, pants, -(lh - R.BOOT) / 2));
      leg.add(box(lw * 1.05, R.BOOT, ld * 1.25, boots, -lh + R.BOOT / 2, 0, ld * 0.12));
    }

    if (name) this.group.add(this.nameTag(name));
  }

  private addHair(head: THREE.Object3D, style: string, hair: THREE.Material, visor: THREE.Material, hy: number,
                  box: (w: number, h: number, d: number, m: THREE.Material, y?: number, x?: number, z?: number) => THREE.Mesh): void {
    const H = R.HEAD, top = hy + H / 2;
    switch (style) {
      case 'short':
        head.add(box(H * 1.06, H * 0.18, H * 1.06, hair, top));
        head.add(box(H * 1.06, H * 0.45, H * 0.12, hair, top - H * 0.25, 0, -H / 2));
        break;
      case 'long':
        head.add(box(H * 1.08, H * 0.2, H * 1.08, hair, top));
        head.add(box(H * 1.08, H * 1.1, H * 0.14, hair, top - H * 0.5, 0, -H / 2 - 0.01));
        for (const x of [-H / 2, H / 2]) head.add(box(H * 0.1, H * 0.8, H * 0.7, hair, top - H * 0.4, x, -H * 0.12));
        break;
      case 'mohawk':
        head.add(box(H * 0.18, H * 0.35, H * 1.0, hair, top + H * 0.15));
        break;
      case 'cap':
        head.add(box(H * 1.08, H * 0.22, H * 1.08, hair, top + 0.01));
        head.add(box(H * 0.9, H * 0.05, H * 0.45, hair, top - H * 0.06, 0, H * 0.7));
        break;
      case 'helmet':
        head.add(box(H * 1.16, H * 1.1, H * 1.16, hair, hy + H * 0.06));
        // visor so the face still reads
        head.add(box(H * 0.8, H * 0.32, 0.02, visor, hy + 0.03, 0, H * 0.58 + 0.01));
        break;
    }
  }

  private nameTag(name: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.font = '32px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 8, 256, 48);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(name.slice(0, 16), 128, 44);
    const map = new THREE.CanvasTexture(canvas);
    const m = new THREE.SpriteMaterial({ map, depthTest: true });
    this.materials.push(m);
    const tag = new THREE.Sprite(m);
    tag.scale.set(2, 0.5, 1);
    tag.position.y = -R.FEET_Y + R.TAG_ABOVE_EYES;
    return tag;
  }

  /** The look pitch for the head (radians above the horizon, already clamped). */
  public setHeadPitch(pitch: number): void {
    this.headPitchTarget = pitch;
  }

  /** What the player is doing continuously (the mine loop). */
  public setLoopAction(loop: LoopAction): void {
    if (loop === LoopAction.MINE && this.loop !== LoopAction.MINE) this.loopTime = 0;
    this.loop = loop;
  }

  /** Start a one-shot arm animation (a place, an interact, a swing). */
  public playShot(kind: ShotAction): void {
    const clip = SHOT_CLIP[kind];
    if (clip) this.shot = { clip, t: 0 };
  }

  /**
   * The item in the right hand (null = empty): a flat icon for icon art, a
   * small cube for a block's texture.
   */
  public setHeldItem(art: HeldItemArt | null): void {
    const key = art ? `${art.texture}|${JSON.stringify(art.atlasRegion ?? null)}` : '';
    if ((this.held?.key ?? '') === key) return;
    if (this.held) {
      this.held.mesh.removeFromParent();
      this.held.mesh.geometry.dispose();
      (this.held.mesh.material as THREE.Material).dispose();
      this.held = null;
    }
    if (!art || !art.texture) return;
    const icon = art.texture.includes('/icons/');
    const map = heldTexture(art);
    const geo = icon
      ? new THREE.PlaneGeometry(AvatarConfig.HELD_ICON_SIZE, AvatarConfig.HELD_ICON_SIZE)
      : new THREE.BoxGeometry(AvatarConfig.HELD_BLOCK_SIZE, AvatarConfig.HELD_BLOCK_SIZE, AvatarConfig.HELD_BLOCK_SIZE);
    const mat = new THREE.MeshLambertMaterial({
      map, transparent: false, alphaTest: icon ? AvatarConfig.HELD_ICON_ALPHA_TEST : 0, side: icon ? THREE.DoubleSide : THREE.FrontSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    const [x, y, z] = AvatarConfig.HELD_OFFSET;
    mesh.position.set(x, y, z);
    // An icon stands in the hand edge-on to the side, like a held tool
    if (icon) mesh.rotation.y = Math.PI / 2;
    this.parts.armR.add(mesh);
    this.held = { key, mesh };
  }

  /** Advance the clips. `speed` = ground speed (m/s) picks idle .. walk. */
  public animate(dt: number, speed: number): void {
    this.time += dt;
    const target = Math.min(1, speed / R.WALK_SPEED);
    this.walk += (target - this.walk) * Math.min(1, dt * 8);
    this.headPitch += (this.headPitchTarget - this.headPitch) * Math.min(1, dt * AvatarConfig.HEAD_FOLLOW_RATE);
    if (!animFile) return;
    const file = animFile;
    const idle = file.clips.idle, move = file.clips.move;
    const sampleAt = (clip: Clip | undefined, part: string, phase: number): number[] | null => {
      const tr = clip?.tracks[part];
      if (!tr) return null;
      const f = phase * file.frames;
      const i = Math.floor(f), k = f - i;
      const a = tr[i % tr.length], b = tr[(i + 1) % tr.length];
      return a.map((v, j) => v + (b[j] - v) * k);
    };
    const looped = (clip: Clip | undefined, t: number) => clip ? (t / clip.duration) % 1 : 0;

    // The arm action: a one-shot outranks the mine loop
    let action: Clip | undefined;
    let actionPhase = 0;
    if (this.shot) {
      const clip = file.clips[this.shot.clip];
      this.shot.t += dt;
      if (!clip || this.shot.t >= clip.duration) {
        this.shot = null;
      } else {
        action = clip;
        actionPhase = this.shot.t / clip.duration;
        this.lastActionClip = this.shot.clip;
      }
    }
    if (this.loop === LoopAction.MINE) this.loopTime += dt;
    if (!action && this.loop === LoopAction.MINE) {
      action = file.clips[MINE_CLIP];
      actionPhase = looped(action, this.loopTime);
      this.lastActionClip = MINE_CLIP;
    }
    const want = action ? 1 : 0;
    this.actionWeight += (want - this.actionWeight) * Math.min(1, dt * AvatarConfig.ACTION_BLEND_RATE);
    // Blending out: hold the last clip's rest frame while the weight falls
    if (!action && this.actionWeight > 0 && this.lastActionClip) action = file.clips[this.lastActionClip];

    for (const [name, obj] of Object.entries(this.parts)) {
      const a = sampleAt(idle, name, looped(idle, this.time)) ?? [0, 0, 0, 0];
      const b = sampleAt(move, name, looped(move, this.time)) ?? [0, 0, 0, 0];
      let v = a.map((x, j) => x + (b[j] - x) * this.walk);
      const c = action ? sampleAt(action, name, actionPhase) : null;
      if (c) v = v.map((x, j) => x + (c[j] - x) * this.actionWeight);
      obj.rotation.x = v[0] + (name === 'head' ? -this.headPitch : 0);
      const rest = this.rest.get(obj)!;
      obj.position.set(rest.x + v[1], rest.y + v[2], rest.z + v[3]);
    }
  }

  public dispose(): void {
    this.setHeldItem(null);
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) {
      (m as THREE.SpriteMaterial).map?.dispose();
      m.dispose();
    }
  }
}

// ---- this player's own look --------------------------------------------

const LOOK_KEY = 'tenebris_look';

export function loadMyLook(): Look {
  try {
    const raw = localStorage.getItem(LOOK_KEY);
    if (raw) return sanitizeLook(JSON.parse(raw));
  } catch {
    // blocked / corrupt: a fresh look
  }
  return defaultLook(Math.floor(Math.random() * 1000));
}

export function saveMyLook(look: Look): void {
  try { localStorage.setItem(LOOK_KEY, JSON.stringify(look)); } catch { /* blocked */ }
}
