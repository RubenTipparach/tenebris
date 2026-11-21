import * as THREE from 'three';
import { getAssetPath } from '../utils/assetPath';

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
export type Look = { [K in LookSlot]: string };
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
  }
  return look;
}

interface AnimFile {
  frames: number;
  clips: Record<string, { duration: number; tracks: Record<string, number[][]> }>;
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

  constructor(look: Look, name?: string) {
    loadAnim();
    const mat = (c: string) => { const m = new THREE.MeshLambertMaterial({ color: c }); this.materials.push(m); return m; };
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

    const skin = mat(look.skin), shirt = mat(look.shirt), pants = mat(look.pants), boots = mat(look.boots), hair = mat(look.hair);
    const dark = mat('#000000');

    // Torso
    const [tw, th, td] = R.TORSO;
    this.parts.body.add(box(tw, th, td, shirt, R.HIP_Y + th / 2));
    // Head: face toward +Z, two eyes
    const head = pivot('head', 0, R.SHOULDER_Y);
    const hy = R.HEAD_Y - R.SHOULDER_Y;
    head.add(box(R.HEAD, R.HEAD, R.HEAD, skin, hy));
    for (const ex of [-0.08, 0.08]) head.add(box(0.06, 0.06, 0.02, dark, hy + 0.03, ex, R.HEAD / 2 + 0.005));
    this.addHair(head, look.style, hair, mat('#29adff'), hy, box);
    // Arms hang from the shoulders: sleeve then hand
    const [aw, ah, ad] = R.ARM;
    for (const [side, x] of [['armL', R.ARM_X], ['armR', -R.ARM_X]] as const) {
      const arm = pivot(side, x, R.SHOULDER_Y);
      arm.add(box(aw, ah * 0.75, ad, shirt, -ah * 0.375));
      arm.add(box(aw * 0.9, ah * 0.25, ad * 0.9, skin, -ah * 0.875));
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

  /** Advance the clips. `speed` = ground speed (m/s) picks idle .. walk. */
  public animate(dt: number, speed: number): void {
    this.time += dt;
    const target = Math.min(1, speed / R.WALK_SPEED);
    this.walk += (target - this.walk) * Math.min(1, dt * 8);
    if (!animFile) return;
    const idle = animFile.clips.idle, move = animFile.clips.move;
    const sample = (clip: typeof idle, part: string): number[] | null => {
      const tr = clip?.tracks[part];
      if (!tr) return null;
      const f = ((this.time / clip.duration) % 1) * animFile!.frames;
      const i = Math.floor(f), k = f - i;
      const a = tr[i % tr.length], b = tr[(i + 1) % tr.length];
      return a.map((v, j) => v + (b[j] - v) * k);
    };
    for (const [name, obj] of Object.entries(this.parts)) {
      const a = sample(idle, name) ?? [0, 0, 0, 0];
      const b = sample(move, name) ?? [0, 0, 0, 0];
      const v = a.map((x, j) => x + (b[j] - x) * this.walk);
      obj.rotation.x = v[0];
      const rest = this.rest.get(obj)!;
      obj.position.set(rest.x + v[1], rest.y + v[2], rest.z + v[3]);
    }
  }

  public dispose(): void {
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
