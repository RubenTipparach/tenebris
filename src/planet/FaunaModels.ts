import * as THREE from 'three';
import { FaunaSpeciesId } from '../config/FaunaConfig';

/**
 * Procedural low-poly creature models, one per species.
 *
 * A model is one merged, flat-shaded geometry; every vertex carries its part
 * index (aPart), colour (aColor) and glow (aGlow). Each part has a pivot and
 * an axis: the baked clips (public/animations/<id>.anim.json) rotate a part
 * about its axis round its pivot and offset it, and a part follows its
 * parent (up the chain to the body), so legs and heads ride the body's bob.
 *
 * Model space: +Z forward, +Y up. Walkers stand on y = 0; flyers and
 * floaters are centred on the origin (the runtime lifts them by `hover`).
 */

export interface FaunaPart {
  name: string;
  pivot: THREE.Vector3;
  axis: THREE.Vector3;
  /** Index of the parent part, -1 for the root (body). */
  parent: number;
}

export interface FaunaModel {
  geometry: THREE.BufferGeometry;
  parts: FaunaPart[];
}

type V3 = [number, number, number];

interface AddOpts {
  at?: V3;
  rot?: V3;
  scale?: V3;
  glow?: number;
}

class ModelBuilder {
  readonly parts: FaunaPart[] = [];
  private pos: number[] = [];
  private col: number[] = [];
  private glow: number[] = [];
  private partIdx: number[] = [];
  private tmp = new THREE.Color();

  constructor() {
    this.part('body', [0, 0, 0], [1, 0, 0], null);
  }

  /** Declare a part. parent defaults to the body. */
  part(name: string, pivot: V3, axis: V3 = [1, 0, 0], parent: string | null = 'body'): this {
    if (name === 'body' && this.parts.length) {
      // re-declare the body's pivot / axis
      this.parts[0].pivot.set(...pivot);
      this.parts[0].axis.set(...axis).normalize();
      return this;
    }
    this.parts.push({
      name,
      pivot: new THREE.Vector3(...pivot),
      axis: new THREE.Vector3(...axis).normalize(),
      parent: parent === null ? -1 : this.index(parent),
    });
    return this;
  }

  private index(name: string): number {
    const i = this.parts.findIndex(p => p.name === name);
    if (i < 0) throw new Error(`[Fauna] unknown part ${name}`);
    return i;
  }

  add(part: string, geom: THREE.BufferGeometry, color: number, o: AddOpts = {}): this {
    const g = geom.index ? geom.toNonIndexed() : geom;
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(...(o.at ?? [0, 0, 0])),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(o.rot ?? [0, 0, 0]))),
      new THREE.Vector3(...(o.scale ?? [1, 1, 1])),
    );
    g.applyMatrix4(m);
    const p = g.getAttribute('position');
    const pi = this.index(part);
    this.tmp.setHex(color);
    for (let i = 0; i < p.count; i++) {
      this.pos.push(p.getX(i), p.getY(i), p.getZ(i));
      this.col.push(this.tmp.r, this.tmp.g, this.tmp.b);
      this.glow.push(o.glow ?? 0);
      this.partIdx.push(pi);
    }
    return this;
  }

  box(part: string, size: V3, at: V3, color: number, o: Omit<AddOpts, 'at'> = {}): this {
    return this.add(part, new THREE.BoxGeometry(...size), color, { ...o, at });
  }

  ball(part: string, r: number, at: V3, color: number, o: Omit<AddOpts, 'at'> = {}): this {
    return this.add(part, new THREE.IcosahedronGeometry(r, 0), color, { ...o, at });
  }

  build(): FaunaModel {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('aColor', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('aGlow', new THREE.Float32BufferAttribute(this.glow, 1));
    g.setAttribute('aPart', new THREE.Float32BufferAttribute(this.partIdx, 1));
    g.computeVertexNormals(); // non-indexed: one normal per face = flat shaded
    g.computeBoundingSphere();
    return { geometry: g, parts: this.parts };
  }
}

/** Four legs at (+-x, z), hip at hipY, standing on y = 0. */
function legs4(b: ModelBuilder, x: number, zf: number, zb: number, hipY: number, w: number, color: number, hoof?: number): void {
  for (const [name, lx, lz] of [['legFL', x, zf], ['legFR', -x, zf], ['legBL', x, zb], ['legBR', -x, zb]] as [string, number, number][]) {
    b.part(name, [lx, hipY, lz]);
    b.box(name, [w, hipY, w], [lx, hipY / 2, lz], color);
    if (hoof !== undefined) b.box(name, [w * 1.15, w * 0.8, w * 1.15], [lx, w * 0.4, lz], hoof);
  }
}

const MODELS: Record<FaunaSpeciesId, () => FaunaModel> = {
  // ---- Earth -------------------------------------------------------------
  deer: () => {
    const b = new ModelBuilder().part('body', [0, 0.95, 0]);
    b.box('body', [0.45, 0.45, 1.0], [0, 0.98, 0], 0xa0683a);
    b.box('body', [0.36, 0.1, 0.8], [0, 0.73, 0], 0xd8b88c); // pale belly
    legs4(b, 0.15, 0.36, -0.36, 0.8, 0.11, 0x7a4e2b, 0x2a1c14);
    b.part('head', [0, 1.12, 0.42]);
    b.box('head', [0.16, 0.55, 0.16], [0, 1.38, 0.56], 0xa0683a, { rot: [0.45, 0, 0] });
    b.box('head', [0.2, 0.2, 0.4], [0, 1.62, 0.76], 0x93603a);
    b.box('head', [0.1, 0.08, 0.06], [0, 1.6, 0.97], 0x2a1c14); // nose
    b.box('head', [0.05, 0.14, 0.1], [0.12, 1.76, 0.66], 0x7a4e2b, { rot: [0, 0, -0.5] });
    b.box('head', [0.05, 0.14, 0.1], [-0.12, 1.76, 0.66], 0x7a4e2b, { rot: [0, 0, 0.5] });
    // antlers
    for (const s of [1, -1]) {
      b.box('head', [0.04, 0.4, 0.04], [0.08 * s, 1.92, 0.7], 0xe0cca0, { rot: [0, 0, -0.35 * s] });
      b.box('head', [0.04, 0.2, 0.04], [0.18 * s, 2.0, 0.78], 0xe0cca0, { rot: [0.6, 0, -0.2 * s] });
    }
    b.part('tail', [0, 1.16, -0.5]);
    b.box('tail', [0.12, 0.18, 0.08], [0, 1.1, -0.53], 0xf2ead8);
    return b.build();
  },
  rabbit: () => {
    const b = new ModelBuilder().part('body', [0, 0.2, 0]);
    b.box('body', [0.3, 0.28, 0.46], [0, 0.26, 0], 0x9a8a78);
    b.box('body', [0.22, 0.06, 0.34], [0, 0.12, 0.02], 0xe8e0d0);
    b.part('head', [0, 0.34, 0.18]);
    b.box('head', [0.22, 0.2, 0.22], [0, 0.42, 0.28], 0x8f8070);
    b.box('head', [0.05, 0.04, 0.03], [0, 0.4, 0.4], 0xd88a8a);
    b.box('head', [0.04, 0.05, 0.03], [0.08, 0.46, 0.39], 0x1a1410);
    b.box('head', [0.04, 0.05, 0.03], [-0.08, 0.46, 0.39], 0x1a1410);
    b.part('ears', [0, 0.5, 0.25], [1, 0, 0], 'head');
    b.box('ears', [0.07, 0.28, 0.04], [0.06, 0.64, 0.24], 0x8f8070, { rot: [-0.2, 0, -0.15] });
    b.box('ears', [0.07, 0.28, 0.04], [-0.06, 0.64, 0.24], 0x8f8070, { rot: [-0.2, 0, 0.15] });
    b.part('legF', [0, 0.16, 0.14]);
    b.box('legF', [0.2, 0.16, 0.08], [0, 0.08, 0.15], 0x8a7a68);
    b.part('legB', [0, 0.18, -0.06]);
    b.box('legB', [0.32, 0.16, 0.26], [0, 0.08, -0.12], 0x8a7a68);
    b.part('tail', [0, 0.3, -0.24]);
    b.box('tail', [0.12, 0.12, 0.1], [0, 0.3, -0.27], 0xf4f0e8);
    return b.build();
  },
  swallow: () => {
    const b = new ModelBuilder();
    b.box('body', [0.16, 0.14, 0.42], [0, 0, 0], 0x2b3f7a);
    b.box('body', [0.14, 0.05, 0.34], [0, -0.07, 0.02], 0xeeeae0);
    b.part('head', [0, 0.02, 0.2]);
    b.box('head', [0.14, 0.13, 0.14], [0, 0.04, 0.26], 0x2b3f7a);
    b.box('head', [0.1, 0.06, 0.04], [0, -0.01, 0.32], 0xd9622b);
    b.box('head', [0.04, 0.03, 0.08], [0, 0.03, 0.36], 0x222222);
    b.part('wingL', [0.07, 0.03, 0], [0, 0, 1]);
    b.box('wingL', [0.5, 0.025, 0.2], [0.32, 0.03, -0.02], 0x22336a, { rot: [0, 0.3, 0] });
    b.part('wingR', [-0.07, 0.03, 0], [0, 0, -1]);
    b.box('wingR', [0.5, 0.025, 0.2], [-0.32, 0.03, -0.02], 0x22336a, { rot: [0, -0.3, 0] });
    b.part('tail', [0, 0, -0.2]);
    b.box('tail', [0.04, 0.02, 0.3], [0.06, 0, -0.33], 0x22336a, { rot: [0, -0.3, 0] });
    b.box('tail', [0.04, 0.02, 0.3], [-0.06, 0, -0.33], 0x22336a, { rot: [0, 0.3, 0] });
    return b.build();
  },
  // ---- Sequoia: beige / dry olive -----------------------------------------
  sparkit: () => {
    const b = new ModelBuilder().part('body', [0, 0.5, 0]);
    b.ball('body', 0.27, [0, 0.58, 0], 0xcfaa81, { scale: [1, 0.95, 1.1] });
    b.box('body', [0.1, 0.08, 0.36], [0, 0.82, -0.02], 0x9bb675); // back stripe
    b.part('head', [0, 0.7, 0.15]);
    b.add('head', new THREE.ConeGeometry(0.07, 0.2, 4), 0xd9a441, { at: [0, 0.6, 0.36], rot: [Math.PI / 2, 0, 0] });
    b.box('head', [0.07, 0.09, 0.04], [0.11, 0.7, 0.24], 0x1a1410);
    b.box('head', [0.07, 0.09, 0.04], [-0.11, 0.7, 0.24], 0x1a1410);
    b.box('head', [0.03, 0.26, 0.03], [0.07, 0.95, 0.12], 0x559642, { rot: [0.3, 0, -0.3] });
    b.box('head', [0.03, 0.26, 0.03], [-0.07, 0.95, 0.12], 0x559642, { rot: [0.3, 0, 0.3] });
    b.ball('head', 0.04, [0.11, 1.07, 0.16], 0xffd36b, { glow: 1 });
    b.ball('head', 0.04, [-0.11, 1.07, 0.16], 0xffd36b, { glow: 1 });
    for (const [name, x] of [['legL', 0.11], ['legR', -0.11]] as [string, number][]) {
      b.part(name, [x, 0.38, 0]);
      b.box(name, [0.05, 0.38, 0.05], [x, 0.19, 0], 0x6b5a3a);
      b.box(name, [0.1, 0.04, 0.14], [x, 0.02, 0.04], 0x6b5a3a);
    }
    b.part('tail', [0, 0.58, -0.22], [0, 1, 0]);
    b.box('tail', [0.06, 0.06, 0.42], [0, 0.66, -0.42], 0x9bb675, { rot: [-0.5, 0, 0] });
    b.ball('tail', 0.08, [0, 0.78, -0.6], 0xffc94a, { glow: 1 });
    return b.build();
  },
  shellkin: () => {
    const b = new ModelBuilder().part('body', [0, 0.3, 0], [0, 0, 1]);
    b.add('body', new THREE.SphereGeometry(0.58, 7, 3, 0, Math.PI * 2, 0, Math.PI / 2), 0x8a7a4a,
      { at: [0, 0.28, 0], scale: [1, 0.75, 1.1] });
    b.box('body', [1.2, 0.08, 1.3], [0, 0.28, 0], 0x6b5a3a); // rim
    for (const [x, z] of [[0, 0], [0.25, 0.25], [-0.25, 0.25], [0.25, -0.25], [-0.25, -0.25]]) {
      b.box('body', [0.18, 0.06, 0.18], [x, 0.63 - (Math.abs(x) + Math.abs(z)) * 0.3, z], 0x9bb675, { rot: [z * 0.9, 0, -x * 0.9] });
    }
    b.part('head', [0, 0.3, 0.45]);
    b.box('head', [0.24, 0.2, 0.32], [0, 0.3, 0.66], 0xc9b98a);
    b.box('head', [0.05, 0.05, 0.03], [0.07, 0.36, 0.82], 0x1a1410);
    b.box('head', [0.05, 0.05, 0.03], [-0.07, 0.36, 0.82], 0x1a1410);
    legs4(b, 0.36, 0.32, -0.32, 0.3, 0.16, 0xb3a37a);
    return b.build();
  },
  crane: () => {
    const b = new ModelBuilder().part('body', [0, 1.4, 0]);
    b.box('body', [0.34, 0.34, 0.62], [0, 1.42, 0], 0xe8dcc0);
    b.box('body', [0.3, 0.1, 0.3], [0, 1.4, -0.4], 0x559642, { rot: [-0.3, 0, 0] }); // tail plumes
    for (const [name, x] of [['legL', 0.1], ['legR', -0.1]] as [string, number][]) {
      b.part(name, [x, 1.28, 0]);
      b.box(name, [0.05, 1.28, 0.05], [x, 0.64, 0], 0x5a4a30);
      b.box(name, [0.06, 0.03, 0.22], [x, 0.015, 0.06], 0x5a4a30);
    }
    b.part('neck', [0, 1.52, 0.24]);
    b.box('neck', [0.07, 0.85, 0.07], [0, 1.95, 0.3], 0xe8dcc0, { rot: [0.12, 0, 0] });
    b.box('neck', [0.13, 0.13, 0.22], [0, 2.38, 0.38], 0xe8dcc0);
    b.box('neck', [0.04, 0.04, 0.38], [0, 2.35, 0.64], 0xd9a441);
    b.box('neck', [0.05, 0.16, 0.12], [0, 2.5, 0.32], 0x559642, { rot: [-0.5, 0, 0] }); // crest
    b.part('wingL', [0.17, 1.58, 0], [0, 0, 1]);
    b.box('wingL', [0.05, 0.3, 0.58], [0.19, 1.44, -0.04], 0x9bb675);
    b.part('wingR', [-0.17, 1.58, 0], [0, 0, -1]);
    b.box('wingR', [0.05, 0.3, 0.58], [-0.19, 1.44, -0.04], 0x9bb675);
    return b.build();
  },
  raptor: () => {
    const b = new ModelBuilder().part('body', [0, 1.0, 0]);
    b.box('body', [0.42, 0.46, 0.82], [0, 1.02, 0], 0xb39a5c);
    for (const z of [-0.25, 0, 0.25]) b.box('body', [0.44, 0.08, 0.1], [0, 1.2, z], 0x559642);
    b.part('head', [0, 1.22, 0.38]);
    b.box('head', [0.22, 0.36, 0.22], [0, 1.32, 0.46], 0xb39a5c, { rot: [0.5, 0, 0] });
    b.box('head', [0.3, 0.26, 0.48], [0, 1.52, 0.74], 0xb39a5c);
    b.box('head', [0.24, 0.08, 0.4], [0, 1.37, 0.74], 0xe0cca0); // jaw
    b.box('head', [0.06, 0.06, 0.04], [0.12, 1.6, 0.86], 0xd9622b);
    b.box('head', [0.06, 0.06, 0.04], [-0.12, 1.6, 0.86], 0xd9622b);
    b.part('tail', [0, 1.05, -0.38], [0, 1, 0]);
    b.box('tail', [0.26, 0.26, 0.7], [0, 1.08, -0.7], 0xb39a5c, { rot: [0.12, 0, 0] });
    b.box('tail', [0.14, 0.14, 0.55], [0, 1.15, -1.28], 0x9b8450, { rot: [0.12, 0, 0] });
    for (const [name, x] of [['legL', 0.17], ['legR', -0.17]] as [string, number][]) {
      b.part(name, [x, 0.95, 0]);
      b.box(name, [0.17, 0.55, 0.26], [x, 0.7, 0], 0x9b8450);
      b.box(name, [0.09, 0.5, 0.09], [x, 0.25, -0.04], 0x6b5a3a);
      b.box(name, [0.14, 0.05, 0.26], [x, 0.025, 0.06], 0x6b5a3a);
    }
    b.part('arms', [0, 1.02, 0.36]);
    b.box('arms', [0.05, 0.24, 0.06], [0.2, 0.92, 0.42], 0x9b8450, { rot: [-0.4, 0, 0] });
    b.box('arms', [0.05, 0.24, 0.06], [-0.2, 0.92, 0.42], 0x9b8450, { rot: [-0.4, 0, 0] });
    return b.build();
  },
  // ---- Cinder ------------------------------------------------------------
  emberBeetle: () => {
    const b = new ModelBuilder().part('body', [0, 0.25, 0]);
    b.add('body', new THREE.SphereGeometry(0.42, 7, 4), 0x2a2220, { at: [0, 0.27, 0], scale: [0.85, 0.5, 1.15] });
    b.box('body', [0.05, 0.05, 0.86], [0, 0.48, 0], 0xff7a1a, { glow: 1 });
    for (const z of [-0.2, 0.1]) b.box('body', [0.6, 0.04, 0.05], [0, 0.45 - Math.abs(z) * 0.2, z], 0xff9a2a, { glow: 1, rot: [0, 0, 0] });
    b.part('head', [0, 0.24, 0.42]);
    b.box('head', [0.26, 0.17, 0.18], [0, 0.24, 0.52], 0x1e1816);
    b.box('head', [0.05, 0.04, 0.2], [0.08, 0.2, 0.66], 0x3a2a24, { rot: [0, -0.4, 0] });
    b.box('head', [0.05, 0.04, 0.2], [-0.08, 0.2, 0.66], 0x3a2a24, { rot: [0, 0.4, 0] });
    b.box('head', [0.05, 0.05, 0.03], [0.08, 0.28, 0.62], 0xffc04a, { glow: 1 });
    b.box('head', [0.05, 0.05, 0.03], [-0.08, 0.28, 0.62], 0xffc04a, { glow: 1 });
    b.part('legsA', [0, 0.18, 0], [0, 1, 0]);
    b.part('legsB', [0, 0.18, 0], [0, 1, 0]);
    // tripods: L-front, R-mid, L-back move together
    const legs: [string, number, number][] = [
      ['legsA', 1, 0.28], ['legsB', -1, 0.28], ['legsB', 1, 0], ['legsA', -1, 0], ['legsA', 1, -0.28], ['legsB', -1, -0.28]];
    for (const [part, s, z] of legs) b.box(part, [0.42, 0.05, 0.05], [0.42 * s, 0.1, z], 0x1e1816, { rot: [0, 0, 0.5 * s] });
    return b.build();
  },
  // ---- Vesper ------------------------------------------------------------
  duneSkimmer: () => {
    const b = new ModelBuilder();
    b.add('body', new THREE.OctahedronGeometry(0.42, 0), 0x7a3b5c, { scale: [0.8, 0.22, 1.1] });
    b.box('body', [0.08, 0.06, 0.6], [0, 0.07, 0], 0xe8b070);
    b.box('body', [0.06, 0.05, 0.04], [0.1, 0.06, 0.32], 0xffd27a, { glow: 1 });
    b.box('body', [0.06, 0.05, 0.04], [-0.1, 0.06, 0.32], 0xffd27a, { glow: 1 });
    for (const [name, s] of [['wingL', 1], ['wingR', -1]] as [string, number][]) {
      b.part(name, [0.2 * s, 0, 0], [0, 0, s]);
      b.box(name, [0.6, 0.04, 0.5], [0.5 * s, 0, -0.02], 0xc46a3c, { rot: [0, 0.35 * s, 0] });
      b.box(name, [0.3, 0.035, 0.25], [0.88 * s, 0, -0.14], 0x9a4a3a, { rot: [0, 0.6 * s, 0] });
      b.box(name, [0.08, 0.05, 0.08], [0.55 * s, 0.02, 0.02], 0xffd27a, { glow: 1 });
    }
    b.part('tail', [0, 0, -0.38], [0, 1, 0]);
    b.box('tail', [0.04, 0.04, 0.9], [0, 0, -0.82], 0x5a2a44);
    b.box('tail', [0.12, 0.03, 0.08], [0, 0, -1.25], 0xffd27a, { glow: 1 });
    return b.build();
  },
  // ---- Halcyon -----------------------------------------------------------
  crystalGrazer: () => {
    const b = new ModelBuilder().part('body', [0, 0.8, 0]);
    b.box('body', [0.62, 0.52, 1.0], [0, 0.82, 0], 0xd8e2e0);
    b.box('body', [0.5, 0.12, 0.84], [0, 0.54, 0], 0x9fb3b4);
    legs4(b, 0.22, 0.34, -0.34, 0.6, 0.17, 0x9fb3b4, 0x3a4a52);
    b.part('head', [0, 0.95, 0.46]);
    b.box('head', [0.32, 0.3, 0.44], [0, 0.98, 0.7], 0xc4d2d2);
    b.box('head', [0.2, 0.12, 0.08], [0, 0.88, 0.94], 0x3a4a52);
    b.box('head', [0.06, 0.06, 0.03], [0.12, 1.06, 0.92], 0x5fe3c8, { glow: 1 });
    b.box('head', [0.06, 0.06, 0.03], [-0.12, 1.06, 0.92], 0x5fe3c8, { glow: 1 });
    b.part('crystals', [0, 1.08, 0]);
    const spires: [number, number, number, number][] = [
      [0, 0.25, 1.0, 0], [0.12, -0.05, 0.8, -0.3], [-0.12, -0.08, 0.85, 0.3], [0, -0.32, 0.7, 0], [0.18, 0.2, 0.55, -0.5], [-0.17, 0.18, 0.6, 0.5]];
    for (const [x, z, h, tilt] of spires) {
      b.add('crystals', new THREE.OctahedronGeometry(0.11, 0), 0x5fe3c8,
        { at: [x, 1.08 + h * 0.22, z], scale: [1, h * 2.6, 1], rot: [0, 0, tilt], glow: 1 });
    }
    return b.build();
  },
  // ---- Tessaly -----------------------------------------------------------
  frostMoth: () => {
    const b = new ModelBuilder();
    b.add('body', new THREE.IcosahedronGeometry(0.1, 0), 0xe8f0ff, { scale: [0.9, 0.9, 2.2] });
    b.ball('body', 0.08, [0, 0.02, 0.2], 0xd0dcf0);
    for (const [name, s] of [['wingL', 1], ['wingR', -1]] as [string, number][]) {
      b.part(name, [0.05 * s, 0.02, 0], [0, 0, s]);
      b.box(name, [0.55, 0.02, 0.42], [0.32 * s, 0.02, 0.08], 0xcfe2f5, { rot: [0, -0.2 * s, 0] });
      b.box(name, [0.4, 0.02, 0.3], [0.26 * s, 0.02, -0.26], 0xb8cdea, { rot: [0, 0.3 * s, 0] });
      b.box(name, [0.12, 0.03, 0.12], [0.38 * s, 0.03, 0.1], 0x9a8ad8, { glow: 1 });
      b.box(name, [0.08, 0.03, 0.08], [0.28 * s, 0.03, -0.28], 0x9a8ad8, { glow: 1 });
    }
    b.part('antennae', [0, 0.05, 0.25]);
    b.box('antennae', [0.02, 0.02, 0.3], [0.07, 0.12, 0.38], 0xffffff, { rot: [-0.6, 0.3, 0], glow: 0.6 });
    b.box('antennae', [0.02, 0.02, 0.3], [-0.07, 0.12, 0.38], 0xffffff, { rot: [-0.6, -0.3, 0], glow: 0.6 });
    return b.build();
  },
  // ---- Umbra -------------------------------------------------------------
  glowJelly: () => {
    const b = new ModelBuilder();
    b.add('body', new THREE.SphereGeometry(0.5, 8, 4, 0, Math.PI * 2, 0, Math.PI * 0.55), 0x6ad8ff,
      { glow: 1, scale: [1, 0.8, 1] });
    b.add('body', new THREE.CylinderGeometry(0.5, 0.46, 0.08, 8, 1, true), 0xc77dff, { at: [0, -0.04, 0], glow: 1 });
    b.ball('body', 0.16, [0, 0.12, 0], 0xf4f0ff, { glow: 1 });
    b.part('tentA', [0, -0.05, 0]);
    b.part('tentB', [0, -0.05, 0], [0, 0, 1]);
    for (const [part, x, z] of [['tentA', 0.28, 0], ['tentA', -0.28, 0], ['tentA', 0, 0.12], ['tentB', 0, 0.28], ['tentB', 0, -0.28], ['tentB', 0.12, 0]] as [string, number, number][]) {
      b.box(part, [0.04, 0.95, 0.04], [x, -0.52, z], 0xd88bff, { glow: 0.8 });
      b.ball(part, 0.05, [x, -1.0, z], 0xffffff, { glow: 1 });
    }
    return b.build();
  },
  // ---- Verdance (jungle moon) --------------------------------------------
  canopyGlider: () => {
    const b = new ModelBuilder();
    b.box('body', [0.24, 0.14, 0.5], [0, 0, 0], 0x2f6b4a);
    b.box('body', [0.18, 0.05, 0.4], [0, -0.08, 0], 0xb8d88a);
    b.part('head', [0, 0.02, 0.24]);
    b.box('head', [0.2, 0.16, 0.18], [0, 0.04, 0.32], 0x2f6b4a);
    b.box('head', [0.06, 0.06, 0.03], [0.07, 0.08, 0.41], 0xffe14a, { glow: 1 });
    b.box('head', [0.06, 0.06, 0.03], [-0.07, 0.08, 0.41], 0xffe14a, { glow: 1 });
    for (const [name, s] of [['wingL', 1], ['wingR', -1]] as [string, number][]) {
      b.part(name, [0.1 * s, 0, 0], [0, 0, s]);
      b.box(name, [0.7, 0.025, 0.55], [0.44 * s, 0, 0], 0x3f8f5a);
      b.box(name, [0.08, 0.03, 0.08], [0.6 * s, 0.01, 0.12], 0xffe14a, { glow: 1 });
      b.box(name, [0.08, 0.03, 0.08], [0.45 * s, 0.01, -0.15], 0xffe14a, { glow: 1 });
    }
    b.part('tail', [0, 0, -0.24], [0, 1, 0]);
    b.box('tail', [0.1, 0.08, 0.7], [0, 0, -0.6], 0x24543a);
    return b.build();
  },
  vineMonkey: () => {
    const b = new ModelBuilder().part('body', [0, 0.35, 0]);
    b.box('body', [0.34, 0.42, 0.3], [0, 0.5, 0], 0x5a6a2a, { rot: [0.25, 0, 0] });
    b.part('head', [0, 0.72, 0.08]);
    b.box('head', [0.28, 0.26, 0.26], [0, 0.85, 0.12], 0x5a6a2a);
    b.box('head', [0.2, 0.16, 0.06], [0, 0.82, 0.26], 0xe08a3a); // face
    b.box('head', [0.05, 0.05, 0.03], [0.06, 0.86, 0.3], 0x1a1410);
    b.box('head', [0.05, 0.05, 0.03], [-0.06, 0.86, 0.3], 0x1a1410);
    b.box('head', [0.06, 0.14, 0.08], [0.17, 0.92, 0.1], 0xe08a3a, { rot: [0, 0, -0.4] });
    b.box('head', [0.06, 0.14, 0.08], [-0.17, 0.92, 0.1], 0xe08a3a, { rot: [0, 0, 0.4] });
    b.part('legF', [0, 0.62, 0.12]);
    b.box('legF', [0.07, 0.5, 0.07], [0.2, 0.38, 0.16], 0x4a5a22);
    b.box('legF', [0.07, 0.5, 0.07], [-0.2, 0.38, 0.16], 0x4a5a22);
    b.part('legB', [0, 0.32, -0.04]);
    b.box('legB', [0.36, 0.22, 0.2], [0, 0.14, -0.06], 0x4a5a22);
    b.part('tail', [0, 0.38, -0.14], [0, 1, 0]);
    b.box('tail', [0.06, 0.06, 0.5], [0, 0.5, -0.38], 0x5a6a2a, { rot: [-0.7, 0, 0] });
    b.box('tail', [0.06, 0.06, 0.25], [0, 0.82, -0.56], 0x5a6a2a, { rot: [0.6, 0, 0] });
    return b.build();
  },
  // ---- Mirewood (jungle moon) --------------------------------------------
  swampWader: () => {
    const b = new ModelBuilder().part('body', [0, 1.25, 0]);
    b.add('body', new THREE.IcosahedronGeometry(0.34, 0), 0x5c4a6e, { at: [0, 1.28, 0], scale: [1, 0.8, 1.4] });
    for (const z of [-0.2, 0.05, 0.25]) b.box('body', [0.06, 0.06, 0.06], [0.24, 1.32, z], 0x7dff9a, { glow: 1 });
    for (const z of [-0.2, 0.05, 0.25]) b.box('body', [0.06, 0.06, 0.06], [-0.24, 1.32, z], 0x7dff9a, { glow: 1 });
    for (const [name, x] of [['legL', 0.13], ['legR', -0.13]] as [string, number][]) {
      b.part(name, [x, 1.1, 0]);
      b.box(name, [0.06, 1.12, 0.06], [x, 0.56, 0], 0x3a2e48);
      b.box(name, [0.18, 0.03, 0.2], [x, 0.015, 0.04], 0x3a2e48);
    }
    b.part('neck', [0, 1.4, 0.36]);
    b.box('neck', [0.1, 0.7, 0.1], [0, 1.72, 0.5], 0x5c4a6e, { rot: [0.35, 0, 0] });
    b.box('neck', [0.2, 0.16, 0.3], [0, 2.06, 0.66], 0x5c4a6e);
    b.add('neck', new THREE.ConeGeometry(0.06, 0.3, 4), 0xc8a050, { at: [0, 2.02, 0.94], rot: [Math.PI / 2, 0, 0] });
    b.box('neck', [0.4, 0.3, 0.03], [0, 2.12, 0.5], 0x9a6ad8, { rot: [-0.3, 0, 0], glow: 0.6 }); // frill
    b.part('tail', [0, 1.3, -0.4], [0, 1, 0]);
    b.box('tail', [0.2, 0.06, 0.5], [0, 1.32, -0.62], 0x9a6ad8, { glow: 0.4 });
    return b.build();
  },
  mireToad: () => {
    const b = new ModelBuilder().part('body', [0, 0.2, 0]);
    b.add('body', new THREE.IcosahedronGeometry(0.3, 0), 0x3f5a3a, { at: [0, 0.28, 0], scale: [1.2, 0.75, 1.1] });
    for (const [x, z] of [[0.15, 0.05], [-0.12, -0.1], [0.05, -0.2], [-0.18, 0.12]]) {
      b.box('body', [0.07, 0.04, 0.07], [x, 0.48, z], 0xd0ff5a, { glow: 1 });
    }
    b.ball('body', 0.08, [0.14, 0.46, 0.22], 0xf0e060);
    b.ball('body', 0.08, [-0.14, 0.46, 0.22], 0xf0e060);
    b.box('body', [0.04, 0.04, 0.02], [0.14, 0.47, 0.3], 0x101010);
    b.box('body', [0.04, 0.04, 0.02], [-0.14, 0.47, 0.3], 0x101010);
    b.part('sac', [0, 0.18, 0.26]);
    b.ball('sac', 0.12, [0, 0.16, 0.3], 0xff8ad8, { glow: 1 });
    b.part('legF', [0, 0.18, 0.18]);
    b.box('legF', [0.48, 0.08, 0.08], [0, 0.06, 0.2], 0x2f4a2a);
    b.part('legB', [0, 0.22, -0.12]);
    b.box('legB', [0.6, 0.14, 0.26], [0, 0.08, -0.16], 0x2f4a2a);
    return b.build();
  },
};

export function buildFaunaModel(id: FaunaSpeciesId): FaunaModel {
  return MODELS[id]();
}
