import * as THREE from 'three';
import { torchLightUniforms } from './TorchLightUniforms';
import { skyLightUniforms } from './SkyLightTexture';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PlayerConfig } from '../config/PlayerConfig';
import { getAssetPath } from '../utils/assetPath';

// Simple seeded random number generator (LCG algorithm)
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // Returns a random number between 0 and 1
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
}

export interface TreeConfig {
  trunkHeight: number;
  trunkRadius: number;
  leafLayers: number;
  leafBaseRadius: number;
  leafTaper: number; // How much each layer shrinks
  species?: EarthTreeSpecies; // default: rolled from the seed
  seed?: number;              // default: from the tree's position
}

const DEFAULT_CONFIG: TreeConfig = {
  trunkHeight: 3,
  trunkRadius: 0.3,
  leafLayers: 4,
  leafBaseRadius: 2,
  leafTaper: 0.7,
};


// ---------------------------------------------------------------------------
// Tree geometry kit. Every part is made non-indexed (flat shaded, low-poly),
// loses its uv, and is painted per FACE: the paint function gets the face's
// centroid and normal in tree space (+Y up, base at the origin), so colours
// read as facets - darker toward the base and underneath, lighter on top.
// All parts end with exactly position + normal + color, so they merge.
// ---------------------------------------------------------------------------

type FacePaint = (centroid: THREE.Vector3, normal: THREE.Vector3) => THREE.Color;

// Stable 0..1 hash of a position (+ a salt)
function hash3(x: number, y: number, z: number, salt: number): number {
  const h = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + salt * 19.19) * 43758.5453;
  return h - Math.floor(h);
}

// A per-tree seed from where it stands, so a tree looks the same every load
function seedFromPosition(p: THREE.Vector3): number {
  return Math.floor(hash3(p.x, p.y, p.z, 7) * 0x7ffffff) + 1;
}

function prepPart(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const out = g.index ? g.toNonIndexed() : g;
  if (out !== g) g.dispose();
  out.deleteAttribute('uv');
  out.computeVertexNormals();
  return out;
}

function paintFaces(g: THREE.BufferGeometry, paint: FacePaint): void {
  const pos = g.getAttribute('position');
  const colors = new Float32Array(pos.count * 3);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const centroid = new THREE.Vector3(), normal = new THREE.Vector3();
  for (let i = 0; i < pos.count; i += 3) {
    a.fromBufferAttribute(pos, i);
    b.fromBufferAttribute(pos, i + 1);
    c.fromBufferAttribute(pos, i + 2);
    centroid.copy(a).add(b).add(c).multiplyScalar(1 / 3);
    normal.subVectors(c, b).cross(b.clone().sub(a)).normalize().negate();
    const col = paint(centroid, normal);
    for (let k = 0; k < 3; k++) {
      colors[(i + k) * 3] = col.r;
      colors[(i + k) * 3 + 1] = col.g;
      colors[(i + k) * 3 + 2] = col.b;
    }
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

// Move every vertex by a hash of where it is, so shared corners move
// together and the shape stays closed (lumpy foliage, gnarled bark)
function jitterVertices(g: THREE.BufferGeometry, amount: number, salt: number): void {
  const pos = g.getAttribute('position');
  for (let i = 0; i < pos.count; i++) {
    const x = Math.round(pos.getX(i) * 1000) / 1000;
    const y = Math.round(pos.getY(i) * 1000) / 1000;
    const z = Math.round(pos.getZ(i) * 1000) / 1000;
    pos.setXYZ(i,
      pos.getX(i) + (hash3(x, y, z, salt) - 0.5) * 2 * amount,
      pos.getY(i) + (hash3(x, y, z, salt + 1) - 0.5) * 2 * amount,
      pos.getZ(i) + (hash3(x, y, z, salt + 2) - 0.5) * 2 * amount);
  }
  pos.needsUpdate = true;
}

// A tapered limb from `from` to `to`. Closed: an open end shows the hollow
// inside of the tube (the black wedges on trunks).
function limb(from: THREE.Vector3, to: THREE.Vector3, r0: number, r1: number, sides: number, segments = 1): THREE.BufferGeometry {
  const dir = to.clone().sub(from);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, sides, segments, false);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  g.translate(from.x, from.y, from.z);
  return g;
}

/**
 * A clump of leaves: several small, smooth-shaded lumps packed round a
 * centre, so the crown reads as a soft leafy mass with a bumpy outline
 * rather than one big faceted gem. Coloured per vertex: darker underneath
 * and inside, lighter on top, each lump a little different.
 */
function addFoliage(
  parts: THREE.BufferGeometry[], rng: SeededRandom, centre: THREE.Vector3, radius: number,
  stretchY: number, low: THREE.Color, high: THREE.Color, yLow: number, yHigh: number, salt: number,
): void {
  const lumps = 4 + Math.floor(rng.next() * 3);
  for (let i = 0; i < lumps; i++) {
    // the first lump fills the middle, the rest sit round it
    const a = rng.next() * Math.PI * 2;
    const off = i === 0 ? 0 : radius * (0.45 + rng.next() * 0.25);
    const at = centre.clone().add(new THREE.Vector3(Math.cos(a) * off, (rng.next() - 0.35) * radius * 0.6 * stretchY, Math.sin(a) * off));
    const r = radius * (i === 0 ? 0.72 : 0.48 + rng.next() * 0.18);
    let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(r, 1);
    g.deleteAttribute('normal');
    g.deleteAttribute('uv');
    g = BufferGeometryUtils.mergeVertices(g);
    g.scale(1, stretchY * (0.85 + rng.next() * 0.2), 1);
    g.translate(at.x, at.y, at.z);
    jitterVertices(g, r * 0.12, salt + i * 7);
    g.computeVertexNormals(); // smooth: soft, not gem-like
    const flat = g.toNonIndexed();
    g.dispose();
    const pos = flat.getAttribute('position');
    const nrm = flat.getAttribute('normal');
    const colors = new Float32Array(pos.count * 3);
    const tint = 0.9 + rng.next() * 0.2;
    const hue = (rng.next() - 0.5) * 0.05;
    const p = new THREE.Vector3(), n = new THREE.Vector3();
    for (let v = 0; v < pos.count; v++) {
      p.fromBufferAttribute(pos, v);
      n.fromBufferAttribute(nrm, v);
      const h = Math.min(1, Math.max(0, (p.y - yLow) / Math.max(0.01, yHigh - yLow)));
      // inside of the crown (near the trunk axis) is shadowed
      const out = Math.min(1, Math.hypot(p.x - centre.x, p.z - centre.z) / radius);
      const col = low.clone().lerp(high, 0.1 + 0.45 * h + 0.3 * Math.max(0, n.y));
      col.offsetHSL(hue, 0, 0);
      col.multiplyScalar(tint * (0.78 + 0.22 * out) * (n.y < -0.4 ? 0.7 : 1));
      colors[v * 3] = col.r; colors[v * 3 + 1] = col.g; colors[v * 3 + 2] = col.b;
    }
    flat.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    setTexCell(flat, TEX_LEAVES);
    parts.push(flat);
  }
}

function shade(base: THREE.Color, k: number): THREE.Color {
  return base.clone().multiplyScalar(k);
}

// Cells of the tree detail atlas (public/textures/trees.png, baked by
// scripts/gen-tree-textures.py): which pixel pattern a part wears
const TEX_BARK = 0, TEX_LEAVES = 1, TEX_NEEDLES = 2, TEX_SMOOTH = 3;

// Every part also carries `glow` (0 = lit only by the sun, as every Earth
// and Sequoia tree; >0 = that share of its colour shines on its own, for the
// alien species that glow - embers, crystals, bioluminescence)
function setTexCell(g: THREE.BufferGeometry, cell: number): void {
  const n = g.getAttribute('position').count;
  g.setAttribute('texCell', new THREE.BufferAttribute(new Float32Array(n).fill(cell), 1));
  if (!g.getAttribute('glow')) g.setAttribute('glow', new THREE.BufferAttribute(new Float32Array(n), 1));
}

// Per face, like FacePaint: how much the face glows
type FaceGlow = (centroid: THREE.Vector3, normal: THREE.Vector3) => number;

function addPart(parts: THREE.BufferGeometry[], g: THREE.BufferGeometry, paint: FacePaint, cell = TEX_BARK, glow: number | FaceGlow = 0): void {
  const part = prepPart(g);
  paintFaces(part, paint);
  const n = part.getAttribute('position').count;
  const glows = new Float32Array(n);
  if (typeof glow === 'number') glows.fill(glow);
  else {
    const pos = part.getAttribute('position'), nrm = part.getAttribute('normal');
    const c = new THREE.Vector3(), v = new THREE.Vector3(), nn = new THREE.Vector3();
    for (let i = 0; i < n; i += 3) {
      c.set(0, 0, 0);
      for (let k = 0; k < 3; k++) c.add(v.fromBufferAttribute(pos, i + k));
      c.multiplyScalar(1 / 3);
      nn.fromBufferAttribute(nrm, i);
      glows.fill(glow(c, nn), i, i + 3);
    }
  }
  part.setAttribute('glow', new THREE.BufferAttribute(glows, 1));
  setTexCell(part, cell);
  parts.push(part);
}

// ---- Footprint ----------------------------------------------------------------

// A tree stands on one hex tile. Its trunk must fit inside that tile, or a
// wide flared base hangs out over the lower tile next door and floats (the
// redwood bug). Anything near the ground is pulled in to this radius, and
// the base ring is sunk into the ground so a tile edge or slope never shows
// a gap under the trunk.
const TILE_FOOTPRINT = 0.5;   // max trunk radius at the ground (world units)
const FOOTPRINT_UP_TO = 1.6;  // height over which the clamp eases off
const ROOT_SINK = 0.8;        // how far the base ring goes into the ground

function plantInTile(parts: THREE.BufferGeometry[]): void {
  for (const g of parts) {
    const pos = g.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (y >= FOOTPRINT_UP_TO) continue;
      const r = Math.hypot(x, z);
      // allowed radius grows from the footprint at the ground to anything at
      // FOOTPRINT_UP_TO, so the trunk still flares, just within its tile
      const t = Math.max(0, y) / FOOTPRINT_UP_TO;
      const allowed = TILE_FOOTPRINT + t * t * 4;
      const k = r > allowed ? allowed / r : 1;
      pos.setXYZ(i, x * k, y < 0.01 ? -ROOT_SINK : y, z * k);
    }
    pos.needsUpdate = true;
    g.computeBoundingSphere();
  }
}

// ---- Forest stands ---------------------------------------------------------

// Smooth 0..1 value noise over the unit sphere (trilinear between lattice
// hashes), for picking which species dominates a region
function valueNoise(dir: THREE.Vector3, scale: number, salt: number): number {
  const x = dir.x * scale, y = dir.y * scale, z = dir.z * scale;
  const x0 = Math.floor(x), y0 = Math.floor(y), z0 = Math.floor(z);
  const fx = x - x0, fy = y - y0, fz = z - z0;
  const s3 = (t: number) => t * t * (3 - 2 * t);
  const u = s3(fx), v = s3(fy), w = s3(fz);
  const h = (i: number, j: number, k: number) => hash3(x0 + i, y0 + j, z0 + k, salt);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  return lerp(
    lerp(lerp(h(0, 0, 0), h(1, 0, 0), u), lerp(h(0, 1, 0), h(1, 1, 0), u), v),
    lerp(lerp(h(0, 0, 1), h(1, 0, 1), u), lerp(h(0, 1, 1), h(1, 1, 1), u), v),
    w);
}

// How big a stand is: the noise scale over the unit sphere (higher = more,
// smaller stands) and the share of trees in a stand that are its own species
const STAND_SCALE = 6;
const STAND_PURITY = 1.0; // one species per stand, no mixing

/**
 * Real forests are stands, not a mix of wildly different trees competing
 * for the same ground: one species dominates a region, with only the odd
 * neighbour near its edges. Given where a tree stands (direction from the
 * planet centre), the species allowed on that ground and a 0..1 roll, pick
 * the species: the stand's own almost always, otherwise the species of the
 * nearest other stand. Every planet's scatter goes through this.
 */
export function standSpecies<T>(dir: THREE.Vector3, allowed: readonly T[], roll: number, salt: number): T {
  if (allowed.length === 1) return allowed[0];
  const n = valueNoise(dir, STAND_SCALE, salt) * 0.999;
  const idx = Math.floor(n * allowed.length);
  if (roll < STAND_PURITY) return allowed[idx];
  // an edge tree: the next stand over in the noise
  const frac = n * allowed.length - idx;
  const other = frac < 0.5 ? Math.max(0, idx - 1) : Math.min(allowed.length - 1, idx + 1);
  return allowed[other === idx ? (idx + 1) % allowed.length : other];
}

// ---- Earth species --------------------------------------------------------

export type EarthTreeSpecies = 'pine' | 'oak' | 'birch';
export const EARTH_TREE_SPECIES: readonly EarthTreeSpecies[] = ['pine', 'oak', 'birch'];

/** Spruce: a tapered trunk under 5-7 drooping, star-edged tiers. */
function buildPine(parts: THREE.BufferGeometry[], rng: SeededRandom, size: number, tall: number): void {
  const trunkH = 2.2 * size * tall;
  const bark = new THREE.Color(0x5a3a22);
  addPart(parts, limb(new THREE.Vector3(), new THREE.Vector3(0, trunkH + 1.5 * size, 0), 0.26 * size, 0.08 * size, 6),
    (c) => shade(bark, 0.7 + 0.3 * Math.min(1, c.y / trunkH) + (hash3(c.x, c.y, c.z, 3) - 0.5) * 0.15));

  const tiers = 5 + Math.floor(rng.next() * 3);
  const dark = new THREE.Color(0x2c6236);
  const light = new THREE.Color(0x74b04e);
  const base = 0.9 * size * Math.min(tall, 1.1);
  let y = base;
  const top = trunkH + 2.6 * size;
  const step = (top - base) / tiers;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const r = (1.75 - 1.35 * t) * size * (0.9 + rng.next() * 0.2);
    const h = step * 1.9;
    const sides = 10;
    const cone = new THREE.ConeGeometry(r, h, sides, 1, false);
    // Star-edged rim that droops: alternate rim vertices in and down
    const pos = cone.getAttribute('position');
    for (let v = 0; v < pos.count; v++) {
      const px = pos.getX(v), pz = pos.getZ(v), py = pos.getY(v);
      const rr = Math.hypot(px, pz);
      if (py < 0 && rr > 0.01) {
        const k = Math.round(((Math.atan2(pz, px) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2 / sides)) % 2;
        const s2 = k === 0 ? 1 : 0.72;
        pos.setXYZ(v, px * s2, py - (k === 0 ? 0.22 * h : 0.05 * h), pz * s2);
      }
    }
    cone.translate(0, y + h / 2, 0);
    cone.rotateY(rng.next() * Math.PI);
    cone.rotateZ((rng.next() - 0.5) * 0.08);
    const tierLight = 0.15 + 0.85 * t;
    addPart(parts, cone, (c, n) => {
      if (n.y < -0.2) return shade(dark, 0.55);                 // underside
      const local = Math.min(1, Math.max(0, (c.y - y) / h));      // tier bottom -> tip
      const col = dark.clone().lerp(light, 0.25 * tierLight + 0.5 * local);
      return shade(col, 0.9 + (hash3(c.x, c.y, c.z, 5) - 0.5) * 0.18);
    }, TEX_NEEDLES);
    y += step;
  }
}

/** Oak: a thick, flared trunk forking into 2-3 limbs under lumpy leaf clusters. */
function buildOak(parts: THREE.BufferGeometry[], rng: SeededRandom, size: number, tall: number): void {
  const bark = new THREE.Color(0x6b4a2e);
  const trunkTop = new THREE.Vector3((rng.next() - 0.5) * 0.3 * size, 1.9 * size * tall, (rng.next() - 0.5) * 0.3 * size);
  const trunk = limb(new THREE.Vector3(), trunkTop, 0.48 * size, 0.3 * size, 7, 2);
  // flare the root
  const tp = trunk.getAttribute('position');
  for (let v = 0; v < tp.count; v++) if (tp.getY(v) < 0.01) tp.setXYZ(v, tp.getX(v) * 1.35, tp.getY(v), tp.getZ(v) * 1.35);
  const barkPaint: FacePaint = (c) => shade(bark, 0.62 + 0.3 * Math.min(1, c.y / (3 * size)) + (hash3(c.x, c.y, c.z, 11) - 0.5) * 0.2);
  addPart(parts, trunk, barkPaint);

  const branches = 2 + Math.floor(rng.next() * 2);
  const tips: THREE.Vector3[] = [];
  const spin = rng.next() * Math.PI * 2;
  for (let i = 0; i < branches; i++) {
    const a = spin + (i / branches) * Math.PI * 2 + (rng.next() - 0.5) * 0.6;
    const out = (1.2 + rng.next() * 0.6) * size;
    const tip = trunkTop.clone().add(new THREE.Vector3(Math.cos(a) * out, (1.1 + rng.next() * 0.7) * size * tall, Math.sin(a) * out));
    addPart(parts, limb(trunkTop.clone().addScaledVector(new THREE.Vector3(0, -1, 0), 0.15 * size), tip, 0.24 * size, 0.1 * size, 5), barkPaint);
    tips.push(tip);
  }

  const canopyLow = new THREE.Color(0x2d6e2c);
  const canopyHigh = new THREE.Color(0x8cc44c);
  const centre = trunkTop.clone().add(new THREE.Vector3(0, 1.6 * size * tall, 0));
  const clusters: { at: THREE.Vector3; r: number; detail: number }[] = [{ at: centre, r: 1.55 * size, detail: 1 }];
  for (const tip of tips) clusters.push({ at: tip.clone().add(new THREE.Vector3(0, 0.3 * size, 0)), r: (1.0 + rng.next() * 0.35) * size, detail: 0 });
  const extra = 4 + Math.floor(rng.next() * 4) - clusters.length;
  for (let i = 0; i < extra; i++) {
    const a = rng.next() * Math.PI * 2;
    clusters.push({ at: centre.clone().add(new THREE.Vector3(Math.cos(a) * 1.1 * size, (rng.next() - 0.2) * 0.9 * size, Math.sin(a) * 1.1 * size)), r: (0.8 + rng.next() * 0.3) * size, detail: 0 });
  }
  const yLow = trunkTop.y, yHigh = centre.y + 1.6 * size;
  clusters.forEach((cl, idx) => addFoliage(parts, rng, cl.at, cl.r, 0.8, canopyLow, canopyHigh, yLow, yHigh, 31 + idx * 13));
}

/** Birch: a slender white trunk banded in black under tall yellow-green clusters. */
function buildBirch(parts: THREE.BufferGeometry[], rng: SeededRandom, size: number, tall: number): void {
  const height = 4.6 * size * tall;
  const white = new THREE.Color(0xe9e4d6);
  const band = new THREE.Color(0x4a443e);
  const lean = new THREE.Vector3((rng.next() - 0.5) * 0.5 * size, height, (rng.next() - 0.5) * 0.5 * size);
  const salt = rng.next() * 100;
  // short dark lenticels round the bark, not whole black faces
  addPart(parts, limb(new THREE.Vector3(), lean, 0.17 * size, 0.07 * size, 8, 16), (c) => {
    const bandy = hash3(Math.round(c.y * 6), 0, Math.round(Math.atan2(c.z, c.x) * 3), salt) > 0.8;
    return bandy ? band.clone() : shade(white, 0.8 + 0.2 * Math.min(1, c.y / height));
  });
  // two little side twigs
  for (let i = 0; i < 2; i++) {
    const at = lean.clone().multiplyScalar(0.55 + 0.15 * i);
    const a = rng.next() * Math.PI * 2;
    addPart(parts, limb(at, at.clone().add(new THREE.Vector3(Math.cos(a) * 0.8 * size, 0.6 * size, Math.sin(a) * 0.8 * size)), 0.06 * size, 0.03 * size, 4),
      () => shade(white, 0.85));
  }
  const low = new THREE.Color(0x5f8a26);
  const high = new THREE.Color(0xc4d84a);
  const n = 3 + Math.floor(rng.next() * 3);
  for (let i = 0; i < n; i++) {
    const t = 0.45 + 0.55 * (i / (n - 1));
    const at = lean.clone().multiplyScalar(t);
    const a = rng.next() * Math.PI * 2;
    at.add(new THREE.Vector3(Math.cos(a) * 0.45 * size, 0.2 * size, Math.sin(a) * 0.45 * size));
    const r = (0.95 - 0.35 * (i / n)) * size * (0.9 + rng.next() * 0.25);
    addFoliage(parts, rng, at, r, 1.35, low, high, height * 0.4, height + r, 51 + i * 13);
  }
}

// ---- Sequoia species --------------------------------------------------------

export type SequoiaTreeSpecies = 'redwood' | 'treefern' | 'lantern';

/**
 * A leaf or frond as a ribbon along a curve, folded into a shallow V along
 * its midrib. `at(t)` is the midrib point at 0..1, `side` the unit vector
 * across the leaf, `up` the fold direction (either may be a function of t,
 * for a twisted blade), `width(t)` the full width.
 */
type AlongT = THREE.Vector3 | ((t: number) => THREE.Vector3);
function ribbon(at: (t: number) => THREE.Vector3, sideOf: AlongT, upOf: AlongT, width: (t: number) => number, steps: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const pts = [] as { l: THREE.Vector3; m: THREE.Vector3; r: THREE.Vector3 }[];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const m = at(t);
    const w = width(t) / 2;
    // side / fold may turn along the ribbon (a twisted blade)
    const side = typeof sideOf === 'function' ? sideOf(t) : sideOf;
    const up = typeof upOf === 'function' ? upOf(t) : upOf;
    const dropEdge = up.clone().multiplyScalar(-w * 0.35);
    pts.push({ l: m.clone().addScaledVector(side, -w).add(dropEdge), m, r: m.clone().addScaledVector(side, w).add(dropEdge) });
  }
  const tri = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) => pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  for (let i = 0; i < steps; i++) {
    const p = pts[i], q = pts[i + 1];
    tri(p.l, p.m, q.m); tri(p.l, q.m, q.l);
    tri(p.m, p.r, q.r); tri(p.m, q.r, q.m);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
}

/** Tree fern: a shaggy fibrous trunk under a crown of long arching fronds. */
function buildTreeFern(parts: THREE.BufferGeometry[], rng: SeededRandom, size: number, tall: number): void {
  const H = 4.2 * size * tall;
  const top = new THREE.Vector3((rng.next() - 0.5) * 0.6 * size, H, (rng.next() - 0.5) * 0.6 * size);
  const trunk = limb(new THREE.Vector3(), top, 0.34 * size, 0.24 * size, 8, 8);
  // shaggy rings of old frond bases
  const tp = trunk.getAttribute('position');
  for (let v = 0; v < tp.count; v++) {
    const k = 1 + 0.14 * Math.abs(Math.sin(tp.getY(v) * 4.5 / size));
    tp.setXYZ(v, tp.getX(v) * k, tp.getY(v), tp.getZ(v) * k);
  }
  const fibre = new THREE.Color(0x4a3426);
  addPart(parts, trunk, (c) => shade(fibre, 0.7 + 0.3 * Math.min(1, c.y / H) + (hash3(c.x, c.y, c.z, 61) - 0.5) * 0.2));

  // Sequoia's palette: dry olive greens, not lush green
  const dark = new THREE.Color(0x434137);
  const light = new THREE.Color(0x9bb675);
  const fronds = 8 + Math.floor(rng.next() * 4);
  const spin = rng.next() * Math.PI * 2;
  for (let i = 0; i < fronds; i++) {
    const a = spin + (i / fronds) * Math.PI * 2 + (rng.next() - 0.5) * 0.3;
    const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const side = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
    const L = (2.6 + rng.next() * 0.9) * size;
    const rise = (0.9 + rng.next() * 0.5) * size;
    const g = ribbon(
      (t) => top.clone().addScaledVector(out, L * t).add(new THREE.Vector3(0, rise * Math.sin(t * Math.PI * 0.75) - L * 0.55 * t * t, 0)),
      side, new THREE.Vector3(0, 1, 0),
      (t) => 0.75 * size * Math.pow(Math.sin(Math.PI * Math.min(1, t * 1.1)), 0.7) * (1 - 0.3 * t),
      7);
    addPart(parts, g, (c, n) => {
      const along = Math.min(1, c.clone().sub(top).length() / L);
      const col = dark.clone().lerp(light, 0.25 + 0.55 * along);
      return shade(col, n.y < -0.2 ? 0.7 : 1);
    }, TEX_NEEDLES);
  }
  // a curled fiddlehead in the middle of the crown
  const curl = new THREE.TorusGeometry(0.22 * size, 0.07 * size, 4, 8, Math.PI * 1.5);
  curl.rotateX(Math.PI / 2);
  curl.rotateZ(Math.PI / 2);
  curl.translate(top.x, top.y + 0.35 * size, top.z);
  addPart(parts, curl, () => shade(light, 0.9), TEX_NEEDLES);
}

/** Lantern tree: a twisted trunk under drooping violet straps hung with amber pods. */
function buildLantern(parts: THREE.BufferGeometry[], rng: SeededRandom, size: number, tall: number): void {
  const H = 5 * size * tall;
  const bark = new THREE.Color(0x3b3346);
  const mid = new THREE.Vector3((rng.next() - 0.5) * 1.0 * size, H * 0.5, (rng.next() - 0.5) * 1.0 * size);
  const top = new THREE.Vector3(-mid.x * 0.6, H, -mid.z * 0.6);
  const barkPaint: FacePaint = (c) => shade(bark, 0.7 + 0.35 * Math.min(1, c.y / H) + (hash3(c.x, c.y, c.z, 71) - 0.5) * 0.15);
  addPart(parts, limb(new THREE.Vector3(), mid, 0.32 * size, 0.24 * size, 7, 3), barkPaint);
  addPart(parts, limb(mid, top, 0.24 * size, 0.16 * size, 7, 3), barkPaint);

  const leafDark = new THREE.Color(0x3a2a6e);
  const leafLight = new THREE.Color(0x9a7ad8);
  const podCol = new THREE.Color(0xffb347);
  const straps = 9 + Math.floor(rng.next() * 4);
  const spin = rng.next() * Math.PI * 2;
  for (let i = 0; i < straps; i++) {
    const a = spin + (i / straps) * Math.PI * 2;
    const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const side = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
    const L = (2.0 + rng.next() * 0.8) * size;
    const g = ribbon(
      (t) => top.clone().addScaledVector(out, L * Math.sin(t * Math.PI * 0.5)).add(new THREE.Vector3(0, 0.5 * size * (1 - t) - L * 0.8 * t * t, 0)),
      side, new THREE.Vector3(0, 1, 0),
      (t) => 0.5 * size * (1 - 0.6 * t),
      6);
    addPart(parts, g, (c, n) => {
      const drop = Math.min(1, Math.max(0, (top.y - c.y) / L));
      return shade(leafDark.clone().lerp(leafLight, 0.6 - 0.4 * drop), n.y < -0.2 ? 0.7 : 1);
    }, TEX_NEEDLES);
    // every other strap hangs a pod from under the crown
    if (i % 2 === 0) {
      const hang = top.clone().addScaledVector(out, L * 0.45).add(new THREE.Vector3(0, -0.3 * size, 0));
      const drop = (0.5 + rng.next() * 0.7) * size;
      addPart(parts, limb(hang, hang.clone().add(new THREE.Vector3(0, -drop, 0)), 0.025 * size, 0.02 * size, 3), () => shade(bark, 0.8));
      const pod = new THREE.IcosahedronGeometry(0.2 * size, 0);
      pod.scale(1, 1.4, 1);
      pod.translate(hang.x, hang.y - drop - 0.2 * size, hang.z);
      addPart(parts, pod, (_c, n) => shade(podCol, 0.85 + 0.25 * Math.max(0, n.y)), TEX_SMOOTH);
    }
  }
}

/** Redwood: a massive flared red trunk under a high, narrow blue-green crown. */
function buildRedwood(parts: THREE.BufferGeometry[], rng: SeededRandom, size: number, tall: number): void {
  const H = 11 * size * tall;
  const trunk = new THREE.CylinderGeometry(0.4 * size, 0.85 * size, H, 8, 4, false);
  trunk.translate(0, H / 2, 0);
  const tp = trunk.getAttribute('position');
  for (let v = 0; v < tp.count; v++) {
    const y = tp.getY(v);
    const flare = y < H * 0.3 ? 1 + 0.8 * Math.pow(1 - y / (H * 0.3), 2) : 1;
    tp.setXYZ(v, tp.getX(v) * flare, y, tp.getZ(v) * flare);
  }
  const bark = new THREE.Color(0x8e3d22);
  addPart(parts, trunk, (c) => {
    const streak = hash3(Math.round(Math.atan2(c.z, c.x) * 3), 0, 0, 37) * 0.25;
    return shade(bark, 0.6 + 0.3 * Math.min(1, c.y / H) + streak - 0.1);
  });

  const dark = new THREE.Color(0x1f4c40);
  const light = new THREE.Color(0x44866f);
  const tiers = 4 + Math.floor(rng.next() * 3);
  const base = H * 0.55;
  const top = H + 2.2 * size;
  const step = (top - base) / tiers;
  for (let i = 0; i < tiers; i++) {
    const t = i / (tiers - 1);
    const r = (1.9 - 1.3 * t) * size * (0.9 + rng.next() * 0.2);
    const h = step * 1.8;
    const cone = new THREE.ConeGeometry(r, h, 8, 1, false);
    const y0 = base + i * step;
    cone.translate(0, y0 + h / 2, 0);
    cone.rotateY(rng.next() * Math.PI);
    addPart(parts, cone, (c, n) => {
      if (n.y < -0.2) return shade(dark, 0.6);
      const local = Math.min(1, Math.max(0, (c.y - y0) / h));
      return shade(dark.clone().lerp(light, 0.2 * t + 0.6 * local), 0.92 + (hash3(c.x, c.y, c.z, 41) - 0.5) * 0.14);
    }, TEX_NEEDLES);
  }
}

// ---- The living alien worlds' species ----------------------------------------
// Every species grows on exactly one planet (CLAUDE.md; SolarSystemConfig
// checks the rosters are disjoint). Each stays within ~400 triangles and
// stands in its own hex (plantInTile). Glowing parts use addPart's glow.

export type CinderTreeSpecies = 'emberspire' | 'thornwood';
export type VesperTreeSpecies = 'balloon' | 'spiralreed';
export type HalcyonTreeSpecies = 'crystaltree' | 'geodebloom';
export type TessalyTreeSpecies = 'frostcoral' | 'iceflower';
export type UmbraTreeSpecies = 'glowcap' | 'veilwillow';
/** Every species a FloraTreeManager can grow (all but Earth's) */
export type FloraSpecies = SequoiaTreeSpecies | CinderTreeSpecies | VesperTreeSpecies
  | HalcyonTreeSpecies | TessalyTreeSpecies | UmbraTreeSpecies
  | VerdanceTreeSpecies | MirewoodTreeSpecies | ThalassaTreeSpecies;

const UP = new THREE.Vector3(0, 1, 0);
const smoothstep01 = (t: number) => Math.min(1, Math.max(0, t));

/** Cinder - ember spire: a cluster of black obsidian spikes split by glowing ember seams. */
function buildEmberSpire(parts: THREE.BufferGeometry[], rng: SeededRandom, size: number, tall: number): void {
  const obsidian = new THREE.Color(0x1c1517);
  const sheen = new THREE.Color(0x4b3b4f);
  const ember = new THREE.Color(0xff6a1f);
  const hot = new THREE.Color(0xffc23d);
  const spikes = 4 + Math.floor(rng.next() * 3);
  const spin = rng.next() * Math.PI * 2;
  const salt = rng.next() * 100;
  for (let i = 0; i < spikes; i++) {
    const main = i === 0;
    const H = (main ? 4.6 + rng.next() * 1.6 : 1.6 + rng.next() * 1.8) * size * tall;
    const a = spin + (i / spikes) * Math.PI * 2;
    const lean = main ? 0.1 : 0.35 + rng.next() * 0.3;
    const base = main ? new THREE.Vector3() : new THREE.Vector3(Math.cos(a) * 0.2 * size, 0, Math.sin(a) * 0.2 * size);
    const tip = base.clone().add(new THREE.Vector3(Math.cos(a) * lean * H, H, Math.sin(a) * lean * H));
    const g = limb(base, tip, (main ? 0.75 : 0.42) * size, 0.04 * size, 5, 4);
    jitterVertices(g, 0.05 * size, 300 + i);
    const top = Math.max(base.y, tip.y);
    // a seam: a band of faces round the spike that glows from inside
    const seam = (c: THREE.Vector3) => hash3(Math.floor(c.y * 2.2 / size), Math.floor(Math.atan2(c.z, c.x) * 1.6), i, salt) > 0.62;
    addPart(parts, g, (c, n) => {
      const up = (c.y - base.y) / Math.max(0.01, top - base.y);
      if (up > 0.86) return hot.clone();
      if (seam(c)) return ember.clone().lerp(hot, 0.3 * up);
      // glassy black: a cold sheen on faces turned up and out
      return obsidian.clone().lerp(sheen, 0.6 * Math.max(0, n.y) + 0.25 * hash3(c.x, c.y, c.z, salt));
    }, TEX_SMOOTH, (c) => {
      const up = (c.y - base.y) / Math.max(0.01, top - base.y);
      return up > 0.86 ? 0.9 : seam(c) ? 0.7 : 0;
    });
  }
}

/** Cinder - thornwood: a twisted black thorn tree hung with burning ember pods. */
function buildThornwood(parts: THREE.BufferGeometry[], rng: SeededRandom, size: number, tall: number): void {
  const bark = new THREE.Color(0x2b2124);
  const barkHi = new THREE.Color(0x5a3a30);
  const pod = new THREE.Color(0xff6a1f);
  const podHot = new THREE.Color(0xffc23d);
  const H = 3.4 * size * tall;
  const mid = new THREE.Vector3((rng.next() - 0.5) * 0.9 * size, H * 0.5, (rng.next() - 0.5) * 0.9 * size);
  const top = new THREE.Vector3(-mid.x * 0.7, H, -mid.z * 0.7);
  const barkPaint: FacePaint = (c, n) => shade(bark.clone().lerp(barkHi, 0.35 * Math.max(0, n.y) + 0.25 * hash3(c.x, c.y, c.z, 81)), 0.75 + 0.3 * Math.min(1, c.y / H));
  addPart(parts, limb(new THREE.Vector3(), mid, 0.34 * size, 0.24 * size, 6, 2), barkPaint);
  addPart(parts, limb(mid, top, 0.24 * size, 0.14 * size, 6, 2), barkPaint);
  const branches = 5;
  const spin = rng.next() * Math.PI * 2;
  for (let i = 0; i < branches; i++) {
    const a = spin + (i / branches) * Math.PI * 2 + (rng.next() - 0.5) * 0.5;
    const from = i < 2 ? mid.clone().lerp(top, 0.5) : top.clone();
    const out = (1.3 + rng.next() * 0.8) * size;
    const elbow = from.clone().add(new THREE.Vector3(Math.cos(a) * out * 0.6, (0.6 + rng.next() * 0.4) * size, Math.sin(a) * out * 0.6));
    const tip = elbow.clone().add(new THREE.Vector3(Math.cos(a + 0.5) * out * 0.5, (0.3 + rng.next() * 0.5) * size, Math.sin(a + 0.5) * out * 0.5));
    addPart(parts, limb(from, elbow, 0.12 * size, 0.08 * size, 4), barkPaint);
    addPart(parts, limb(elbow, tip, 0.08 * size, 0.02 * size, 4), barkPaint);
    // a thorn off the elbow
    const dir = new THREE.Vector3(Math.cos(a + 1.2), 0.6, Math.sin(a + 1.2)).normalize();
    const at = from.clone().lerp(elbow, 0.8);
    addPart(parts, limb(at, at.clone().addScaledVector(dir, 0.5 * size), 0.06 * size, 0.005 * size, 3), barkPaint);
    // a burning pod hangs under each branch tip
    const p = new THREE.IcosahedronGeometry(0.2 * size, 0);
    p.scale(1, 1.35, 1);
    p.translate(tip.x, tip.y - 0.3 * size, tip.z);
    addPart(parts, p, (_c, n) => pod.clone().lerp(podHot, 0.5 + 0.5 * Math.max(0, -n.y)), TEX_SMOOTH, 0.85);
  }
}

/** Vesper - balloon cactus: a stack of ribbed bulbous balloons with a magenta bloom. */
function buildBalloon(parts: THREE.BufferGeometry[], rng: SeededRandom, size: number, tall: number): void {
  const skin = new THREE.Color(0x53998b);
  const skinHi = new THREE.Color(0xc1f1d8);
  const rib = new THREE.Color(0x204f63);
  const bloom = new THREE.Color(0xdd576d);
  const bloomHi = new THREE.Color(0xfa3a64);
  const n = 2 + Math.floor(rng.next() * 2);
  let at = new THREE.Vector3(0, 0, 0);
  let r = (0.75 + rng.next() * 0.2) * size;
  for (let i = 0; i < n; i++) {
    const centre = at.clone().add(new THREE.Vector3(0, r * 0.85 * tall, 0));
    const g = new THREE.SphereGeometry(r, 8, 6);
    g.scale(1, 1.1 * tall, 1);
    g.rotateY(rng.next());
    g.translate(centre.x, centre.y, centre.z);
    const c0 = centre.clone();
    addPart(parts, g, (c, nn) => {
      const ang = Math.atan2(c.z - c0.z, c.x - c0.x);
      const ribbed = Math.floor((ang + Math.PI) / (Math.PI / 4)) % 2 === 0;
      const lit = 0.25 + 0.55 * smoothstep01((c.y - c0.y) / r * 0.5 + 0.5);
      return ribbed ? rib.clone().lerp(skin, 0.4 + 0.3 * lit) : skin.clone().lerp(skinHi, lit * (nn.y > -0.3 ? 1 : 0.4));
    }, TEX_SMOOTH);
    // the next balloon sits on top, a little off centre and smaller
    const a = rng.next() * Math.PI * 2;
    at = centre.clone().add(new THREE.Vector3(Math.cos(a) * r * 0.35, r * 0.75 * tall, Math.sin(a) * r * 0.35));
    r *= 0.72;
  }
  const b = new THREE.IcosahedronGeometry(0.28 * size, 0);
  b.scale(1, 0.6, 1);
  b.translate(at.x, at.y + 0.08 * size, at.z);
  addPart(parts, b, (_c, nn) => bloom.clone().lerp(bloomHi, Math.max(0, nn.y)), TEX_SMOOTH, 0.25);
}

/** Vesper - spiral reed: a clump of copper corkscrew reeds tipped with seed heads. */
function buildSpiralReed(parts: THREE.BufferGeometry[], rng: SeededRandom, size: number, tall: number): void {
  const low = new THREE.Color(0xc56d25);
  const high = new THREE.Color(0xfffefe);
  const head = new THREE.Color(0xfa3a64);
  const reeds = 4 + Math.floor(rng.next() * 2);
  const spin = rng.next() * Math.PI * 2;
  for (let i = 0; i < reeds; i++) {
    const a = spin + (i / reeds) * Math.PI * 2;
    const base = new THREE.Vector3(Math.cos(a) * 0.25 * size, 0, Math.sin(a) * 0.25 * size);
    const H = (2.4 + rng.next() * 1.8) * size * tall;
    const lean = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(0.25 * H);
    const turns = 2 + rng.next() * 1.5;
    const phase = rng.next() * Math.PI * 2;
    const th = (t: number) => phase + t * turns * Math.PI * 2;
    const centre = (t: number) => base.clone().addScaledVector(lean, t * t).add(new THREE.Vector3(0, H * t, 0));
    const g = ribbon(centre,
      (t) => new THREE.Vector3(Math.cos(th(t)), 0, Math.sin(th(t))),
      (t) => new THREE.Vector3(-Math.sin(th(t)), 0, Math.cos(th(t))),
      (t) => 0.85 * size * (1 - 0.5 * t), 12);
    addPart(parts, g, (c) => low.clone().lerp(high, 0.8 * smoothstep01((c.y - base.y) / H)), TEX_SMOOTH);
    const tip = centre(1);
    const sh = new THREE.OctahedronGeometry(0.16 * size, 0);
    sh.scale(1, 1.8, 1);
    sh.translate(tip.x, tip.y + 0.2 * size, tip.z);
    addPart(parts, sh, (_c, nn) => shade(head, 0.8 + 0.25 * Math.max(0, nn.y)), TEX_SMOOTH, 0.3);
  }
}

/** Halcyon - crystal tree: a pale twisting trunk under a canopy of faceted crystals. */
function buildCrystalTree(parts: THREE.BufferGeometry[], rng: SeededRandom, size: number, tall: number): void {
  const bark = new THREE.Color(0x92a3b2);
  const barkLo = new THREE.Color(0x3e586e);
  const deep = new THREE.Color(0x1096c3);
  const glass = new THREE.Color(0x74effe);
  const white = new THREE.Color(0xd2f8ff);
  const H = 3.2 * size * tall;
  const top = new THREE.Vector3((rng.next() - 0.5) * 0.6 * size, H, (rng.next() - 0.5) * 0.6 * size);
  const barkPaint: FacePaint = (c, n) => barkLo.clone().lerp(bark, 0.3 + 0.5 * Math.min(1, c.y / H) + 0.2 * Math.max(0, n.y));
  addPart(parts, limb(new THREE.Vector3(), top, 0.3 * size, 0.16 * size, 6, 3), barkPaint);
  const crystals: { at: THREE.Vector3; r: number }[] = [{ at: top.clone().add(new THREE.Vector3(0, 1.1 * size, 0)), r: 1.0 * size }];
  const spin = rng.next() * Math.PI * 2;
  for (let i = 0; i < 3; i++) {
    const a = spin + (i / 3) * Math.PI * 2;
    const tip = top.clone().add(new THREE.Vector3(Math.cos(a) * 1.3 * size, (0.5 + rng.next() * 0.5) * size, Math.sin(a) * 1.3 * size));
    addPart(parts, limb(top.clone().addScaledVector(UP, -0.4 * size), tip, 0.12 * size, 0.06 * size, 5), barkPaint);
    crystals.push({ at: tip.clone().add(new THREE.Vector3(0, 0.45 * size, 0)), r: (0.7 + rng.next() * 0.2) * size });
  }
  for (let i = 0; i < 3; i++) {
    const a = spin + (i + 0.5) / 3 * Math.PI * 2;
    crystals.push({ at: top.clone().add(new THREE.Vector3(Math.cos(a) * 0.8 * size, (1.4 + rng.next() * 0.5) * size, Math.sin(a) * 0.8 * size)), r: (0.55 + rng.next() * 0.2) * size });
  }
  for (const cr of crystals) {
    const g = new THREE.IcosahedronGeometry(cr.r, 0);
    g.scale(0.8, 1.5, 0.8);
    g.rotateY(rng.next() * Math.PI);
    g.rotateZ((rng.next() - 0.5) * 0.4);
    g.translate(cr.at.x, cr.at.y, cr.at.z);
    const ctr = cr.at.clone();
    // faceted: every face its own tone, light on top, deep underneath
    addPart(parts, g, (c, n) => {
      const k = 0.5 * Math.max(0, n.y) + 0.25 * Math.max(0, n.x) + 0.35 * hash3(c.x, c.y, c.z, 93);
      return n.y < -0.3 ? deep.clone().lerp(glass, 0.3) : glass.clone().lerp(white, Math.min(1, k)).lerp(deep, c.y < ctr.y ? 0.25 : 0);
    }, TEX_SMOOTH, 0.22);
  }
}

/** Halcyon - geode bloom: a burst of violet crystal shards from one root. */
function buildGeodeBloom(parts: THREE.BufferGeometry[], rng: SeededRandom, size: number, tall: number): void {
  const dark = new THREE.Color(0x4f1d83);
  const mid = new THREE.Color(0x7d2dbd);
  const light = new THREE.Color(0x9e3ba2);
  const tipCol = new THREE.Color(0xd2f8ff);
  const shards = 5 + Math.floor(rng.next() * 3);
  const spin = rng.next() * Math.PI * 2;
  for (let i = 0; i < shards; i++) {
    const main = i === 0;
    const a = spin + (i / shards) * Math.PI * 2;
    const tilt = main ? 0.05 : 0.35 + rng.next() * 0.35;
    const L = (main ? 2.8 + rng.next() * 0.8 : 1.2 + rng.next() * 1.2) * size * tall;
    const r = (main ? 0.32 : 0.2 + rng.next() * 0.08) * size;
    const dir = new THREE.Vector3(Math.cos(a) * Math.sin(tilt), Math.cos(tilt), Math.sin(a) * Math.sin(tilt)).normalize();
    const shaft = new THREE.CylinderGeometry(r, r * 0.9, L, 6, 1, false);
    shaft.translate(0, L / 2, 0);
    const point = new THREE.ConeGeometry(r * 0.9, r * 2.2, 6, 1, true);
    point.translate(0, L + r * 1.1, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
    for (const g of [shaft, point]) g.applyQuaternion(q);
    const len = L + r * 2.2;
    const paint: FacePaint = (c, n) => {
      const along = c.dot(dir) / len;
      const facet = 0.3 * Math.max(0, n.y) + 0.3 * hash3(c.x, c.y, c.z, 97);
      return along > 0.88 ? light.clone().lerp(tipCol, 0.5) : dark.clone().lerp(mid, along).lerp(light, facet);
    };
    addPart(parts, shaft, paint, TEX_SMOOTH, (c) => 0.1 + 0.3 * smoothstep01(c.dot(dir) / len));
    addPart(parts, point, paint, TEX_SMOOTH, 0.45);
  }
}

/** Tessaly - frost coral: a pale branching coral of ice with rose-tipped twigs. */
function buildFrostCoral(parts: THREE.BufferGeometry[], rng: SeededRandom, size: number, tall: number): void {
  const ice = new THREE.Color(0x92a3b2);
  const pale = new THREE.Color(0xd2f8ff);
  const rose = new THREE.Color(0xdd576d);
  const H = 1.6 * size * tall;
  const top = new THREE.Vector3((rng.next() - 0.5) * 0.3 * size, H, (rng.next() - 0.5) * 0.3 * size);
  const span = 4 * size * tall;
  const paint: FacePaint = (c, n) => ice.clone().lerp(pale, 0.3 + 0.5 * Math.min(1, c.y / span) + 0.2 * Math.max(0, n.y));
  addPart(parts, limb(new THREE.Vector3(), top, 0.32 * size, 0.2 * size, 5, 2), paint, TEX_SMOOTH);
  const spin = rng.next() * Math.PI * 2;
  for (let i = 0; i < 3; i++) {
    const a = spin + (i / 3) * Math.PI * 2 + (rng.next() - 0.5) * 0.4;
    const fork = top.clone().add(new THREE.Vector3(Math.cos(a) * 0.9 * size, (1.0 + rng.next() * 0.6) * size * tall, Math.sin(a) * 0.9 * size));
    addPart(parts, limb(top, fork, 0.18 * size, 0.12 * size, 4), paint, TEX_SMOOTH);
    for (let k = 0; k < 2; k++) {
      const b = a + (k === 0 ? -0.6 : 0.6);
      const tip = fork.clone().add(new THREE.Vector3(Math.cos(b) * 0.7 * size, (0.8 + rng.next() * 0.6) * size * tall, Math.sin(b) * 0.7 * size));
      addPart(parts, limb(fork, tip, 0.11 * size, 0.07 * size, 4), paint, TEX_SMOOTH);
      const bud = new THREE.OctahedronGeometry(0.16 * size, 0);
      bud.translate(tip.x, tip.y + 0.06 * size, tip.z);
      addPart(parts, bud, (_c, n) => rose.clone().lerp(pale, 0.3 * Math.max(0, n.y)), TEX_SMOOTH, 0.35);
    }
  }
}

/** Tessaly - ice flower: a tall stalk ringed with tiers of glassy petals under a lilac bloom. */
function buildIceFlower(parts: THREE.BufferGeometry[], rng: SeededRandom, size: number, tall: number): void {
  const stalk = new THREE.Color(0x69608b);
  const petal = new THREE.Color(0x74effe);
  const petalTip = new THREE.Color(0xfffefe);
  const bloom = new THREE.Color(0xc34988);
  const bloomHi = new THREE.Color(0xd2f8ff);
  const H = 5 * size * tall;
  const top = new THREE.Vector3((rng.next() - 0.5) * 0.5 * size, H, (rng.next() - 0.5) * 0.5 * size);
  addPart(parts, limb(new THREE.Vector3(), top, 0.16 * size, 0.08 * size, 5, 3), (c) => shade(stalk, 0.7 + 0.4 * Math.min(1, c.y / H)));
  const tiers = [0.42, 0.66, 0.86];
  for (let ti = 0; ti < tiers.length; ti++) {
    const at = top.clone().multiplyScalar(tiers[ti]);
    const L = (1.5 - 0.35 * ti) * size;
    const n = 5;
    const spin = rng.next() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a = spin + (i / n) * Math.PI * 2;
      const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
      const side = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
      const g = ribbon((t) => at.clone().addScaledVector(out, L * t).add(new THREE.Vector3(0, 0.45 * L * t * t, 0)),
        side, UP, (t) => 0.55 * size * Math.sin(Math.PI * Math.min(1, 0.15 + t * 0.85)), 3);
      addPart(parts, g, (c) => petal.clone().lerp(petalTip, smoothstep01(c.clone().sub(at).length() / L)), TEX_SMOOTH, 0.12);
    }
  }
  // the bloom: a cup of petals round a glowing heart
  const cup = 6;
  for (let i = 0; i < cup; i++) {
    const a = (i / cup) * Math.PI * 2;
    const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const side = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
    const L = 0.9 * size;
    const g = ribbon((t) => top.clone().addScaledVector(out, 0.5 * L * t).add(new THREE.Vector3(0, L * t, 0)),
      side, out.clone().negate(), (t) => 0.5 * size * Math.sin(Math.PI * Math.min(1, 0.2 + t * 0.8)), 3);
    addPart(parts, g, (c) => bloom.clone().lerp(bloomHi, 0.5 * smoothstep01((c.y - top.y) / L)), TEX_SMOOTH, 0.2);
  }
  const heart = new THREE.IcosahedronGeometry(0.2 * size, 0);
  heart.translate(top.x, top.y + 0.2 * size, top.z);
  addPart(parts, heart, () => bloomHi.clone(), TEX_SMOOTH, 0.6);
}

/** Umbra - glowcap: a clump of slender stalks under bioluminescent cyan caps. */
function buildGlowcap(parts: THREE.BufferGeometry[], rng: SeededRandom, size: number, tall: number): void {
  const stem = new THREE.Color(0x69608b);
  const capLo = new THREE.Color(0x1096c3);
  const capHi = new THREE.Color(0x74effe);
  const gill = new THREE.Color(0x191954);
  const stalks = 3 + Math.floor(rng.next() * 3);
  const spin = rng.next() * Math.PI * 2;
  for (let i = 0; i < stalks; i++) {
    const main = i === 0;
    const a = spin + (i / stalks) * Math.PI * 2;
    const H = (main ? 3.4 + rng.next() * 0.8 : 1.3 + rng.next() * 1.6) * size * tall;
    const off = main ? 0 : 0.3 * size;
    const base = new THREE.Vector3(Math.cos(a) * off, 0, Math.sin(a) * off);
    const tip = base.clone().add(new THREE.Vector3(Math.cos(a) * (main ? 0.15 : 0.5) * size, H, Math.sin(a) * (main ? 0.15 : 0.5) * size));
    addPart(parts, limb(base, tip, (main ? 0.17 : 0.1) * size, (main ? 0.1 : 0.06) * size, 5, 2), (c) => shade(stem, 0.6 + 0.5 * Math.min(1, c.y / H)));
    const r = (main ? 1.0 : 0.45 + rng.next() * 0.25) * size;
    const cap = new THREE.SphereGeometry(r, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2);
    cap.scale(1, 0.55, 1);
    cap.translate(tip.x, tip.y - 0.05 * size, tip.z);
    const t0 = tip.clone();
    addPart(parts, cap, (c, n) => capLo.clone().lerp(capHi, 0.35 + 0.65 * Math.max(0, n.y) * smoothstep01((c.y - t0.y) / (0.55 * r) + 0.3)), TEX_SMOOTH, 0.55);
    const under = new THREE.CircleGeometry(r * 0.98, 8);
    under.rotateX(Math.PI / 2);
    under.translate(tip.x, tip.y - 0.05 * size, tip.z);
    addPart(parts, under, () => gill.clone(), TEX_NEEDLES, 0.15);
  }
}

/** Umbra - veil willow: a dark crooked trunk trailing tendrils that end in glowing bulbs. */
function buildVeilWillow(parts: THREE.BufferGeometry[], rng: SeededRandom, size: number, tall: number): void {
  const bark = new THREE.Color(0x2b1f35);
  const barkHi = new THREE.Color(0x4f1d83);
  const strand = new THREE.Color(0x7d2dbd);
  const strandLo = new THREE.Color(0xc34988);
  const bulb = new THREE.Color(0xfa3a64);
  const bulbHi = new THREE.Color(0xd2f8ff);
  const H = 4.2 * size * tall;
  const mid = new THREE.Vector3((rng.next() - 0.5) * 0.8 * size, H * 0.55, (rng.next() - 0.5) * 0.8 * size);
  const top = new THREE.Vector3(-mid.x * 0.5, H, -mid.z * 0.5);
  const barkPaint: FacePaint = (c, n) => bark.clone().lerp(barkHi, 0.15 + 0.3 * Math.min(1, c.y / H) + 0.2 * Math.max(0, n.y));
  addPart(parts, limb(new THREE.Vector3(), mid, 0.36 * size, 0.26 * size, 6, 2), barkPaint);
  addPart(parts, limb(mid, top, 0.26 * size, 0.14 * size, 6, 2), barkPaint);
  const arms = 3;
  const spin = rng.next() * Math.PI * 2;
  const ends: THREE.Vector3[] = [];
  for (let i = 0; i < arms; i++) {
    const a = spin + (i / arms) * Math.PI * 2;
    const end = top.clone().add(new THREE.Vector3(Math.cos(a) * 1.5 * size, 0.4 * size, Math.sin(a) * 1.5 * size));
    addPart(parts, limb(top, end, 0.13 * size, 0.06 * size, 4), barkPaint);
    ends.push(top.clone().lerp(end, 0.5), end);
  }
  ends.push(top.clone().add(new THREE.Vector3(0, 0.3 * size, 0)));
  for (let i = 0; i < ends.length; i++) {
    const from = ends[i];
    const a = rng.next() * Math.PI * 2;
    const side = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
    const drift = new THREE.Vector3(Math.cos(a), 0, Math.sin(a)).multiplyScalar(0.35 * size);
    const L = Math.min(from.y - 0.4 * size, (1.8 + rng.next() * 1.4) * size * tall);
    const at = (t: number) => from.clone().addScaledVector(drift, Math.sin(t * Math.PI)).add(new THREE.Vector3(0, -L * t, 0));
    const g = ribbon(at, side, new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), (t) => 0.22 * size * (1 - 0.5 * t), 5);
    addPart(parts, g, (c) => strand.clone().lerp(strandLo, smoothstep01((from.y - c.y) / L)), TEX_NEEDLES, (c) => 0.45 * smoothstep01((from.y - c.y) / L));
    const end = at(1);
    const b = new THREE.OctahedronGeometry(0.13 * size, 0);
    b.scale(1, 1.4, 1);
    b.translate(end.x, end.y - 0.12 * size, end.z);
    addPart(parts, b, (_c, n) => bulb.clone().lerp(bulbHi, 0.4 * Math.max(0, n.y)), TEX_SMOOTH, 0.8);
  }
}

// ---- The jungle moons' species ---------------------------------------------

export type VerdanceTreeSpecies = 'canopygiant' | 'mangrove' | 'fanpalm';
export type MirewoodTreeSpecies = 'elephantear' | 'bottlecypress' | 'weepfern';

/** A low-poly crown: faceted lumps (icosahedra, no subdivision) round a centre, painted per face */
function lumpCrown(parts: THREE.BufferGeometry[], rng: SeededRandom, centre: THREE.Vector3, radius: number, flat: number,
  lumps: number, low: THREE.Color, high: THREE.Color): void {
  for (let i = 0; i < lumps; i++) {
    const a = rng.next() * Math.PI * 2;
    const off = i === 0 ? 0 : radius * (0.55 + rng.next() * 0.3);
    const at = centre.clone().add(new THREE.Vector3(Math.cos(a) * off, (rng.next() - 0.4) * radius * 0.4 * flat, Math.sin(a) * off));
    const r = radius * (i === 0 ? 0.75 : 0.5 + rng.next() * 0.2);
    const g = new THREE.IcosahedronGeometry(r, 0);
    g.scale(1, flat, 1);
    g.rotateY(rng.next() * Math.PI);
    g.translate(at.x, at.y, at.z);
    const top = centre.y + radius * flat;
    addPart(parts, g, (c, n) => {
      const h = smoothstep01((c.y - (centre.y - radius * flat)) / (2 * radius * flat));
      return shade(low.clone().lerp(high, 0.2 + 0.5 * h + 0.3 * Math.max(0, n.y)), n.y < -0.3 ? 0.65 : 0.9 + 0.2 * hash3(c.x, c.y, top, 17));
    }, TEX_LEAVES);
  }
}

/** A liana: a thin strap hanging from `from`, swinging out a little, `L` long */
function liana(parts: THREE.BufferGeometry[], from: THREE.Vector3, L: number, a: number, width: number, top: THREE.Color, bottom: THREE.Color): void {
  const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
  const side = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
  const g = ribbon((t) => from.clone().addScaledVector(out, 0.3 * L * Math.sin(t * Math.PI * 0.8)).add(new THREE.Vector3(0, -L * t, 0)),
    side, out, () => width, 5);
  addPart(parts, g, (c) => top.clone().lerp(bottom, smoothstep01((from.y - c.y) / L)), TEX_NEEDLES);
}

/** Verdance - canopy giant: a tall buttressed trunk under a broad flat crown hung with lianas. */
function buildCanopyGiant(parts: THREE.BufferGeometry[], rng: SeededRandom, size: number, tall: number): void {
  const bark = new THREE.Color(0x725244);
  const barkLo = new THREE.Color(0x41322c);
  const leafLo = new THREE.Color(0x05582d);
  const leafHi = new THREE.Color(0x559642);
  const vine = new THREE.Color(0x297537);
  const H = 6.5 * size * tall;
  const top = new THREE.Vector3((rng.next() - 0.5) * 0.6 * size, H, (rng.next() - 0.5) * 0.6 * size);
  const trunk = limb(new THREE.Vector3(), top, 0.5 * size, 0.28 * size, 7, 3);
  // buttress: ridges round the foot (plantInTile keeps them in the tile)
  const tp = trunk.getAttribute('position');
  for (let v = 0; v < tp.count; v++) {
    const y = tp.getY(v);
    if (y < H * 0.25) {
      const ang = Math.atan2(tp.getZ(v), tp.getX(v));
      const k = 1 + 0.9 * Math.pow(1 - y / (H * 0.25), 2) * Math.max(0, Math.cos(ang * 3));
      tp.setXYZ(v, tp.getX(v) * k, y, tp.getZ(v) * k);
    }
  }
  const barkPaint: FacePaint = (c, n) => barkLo.clone().lerp(bark, 0.3 + 0.5 * Math.min(1, c.y / H) + 0.2 * Math.max(0, n.x));
  addPart(parts, trunk, barkPaint);
  const spin = rng.next() * Math.PI * 2;
  const crownAt = top.clone().add(new THREE.Vector3(0, 0.8 * size, 0));
  for (let i = 0; i < 3; i++) {
    const a = spin + (i / 3) * Math.PI * 2;
    const tip = top.clone().add(new THREE.Vector3(Math.cos(a) * 1.8 * size, 0.7 * size, Math.sin(a) * 1.8 * size));
    addPart(parts, limb(top.clone().addScaledVector(UP, -0.8 * size), tip, 0.16 * size, 0.08 * size, 5), barkPaint);
  }
  lumpCrown(parts, rng, crownAt, 2.4 * size, 0.45, 6, leafLo, leafHi);
  for (let i = 0; i < 4; i++) {
    const a = spin + (i + 0.5) / 4 * Math.PI * 2;
    const from = crownAt.clone().add(new THREE.Vector3(Math.cos(a) * 1.6 * size, -0.5 * size, Math.sin(a) * 1.6 * size));
    liana(parts, from, Math.min(from.y - 0.3, (2.5 + rng.next() * 2) * size * tall), a, 0.12 * size, vine, leafHi);
  }
}

/** Verdance - mangrove: a crown on a short trunk raised on arching stilt roots. */
function buildMangrove(parts: THREE.BufferGeometry[], rng: SeededRandom, size: number, tall: number): void {
  const bark = new THREE.Color(0x434137);
  const barkHi = new THREE.Color(0xa09f91);
  const leafLo = new THREE.Color(0x003227);
  const leafHi = new THREE.Color(0x297537);
  const hub = new THREE.Vector3(0, 1.3 * size * tall, 0);
  const top = new THREE.Vector3((rng.next() - 0.5) * 0.4 * size, 3.4 * size * tall, (rng.next() - 0.5) * 0.4 * size);
  const barkPaint: FacePaint = (c, n) => bark.clone().lerp(barkHi, 0.15 + 0.25 * Math.min(1, c.y / 3) + 0.2 * Math.max(0, n.y));
  addPart(parts, limb(hub, top, 0.22 * size, 0.14 * size, 6, 2), barkPaint);
  const roots = 5;
  const spin = rng.next() * Math.PI * 2;
  for (let i = 0; i < roots; i++) {
    const a = spin + (i / roots) * Math.PI * 2;
    // arching out and down, landing inside the tile edge
    const knee = hub.clone().add(new THREE.Vector3(Math.cos(a) * 0.55 * size, 0.15 * size, Math.sin(a) * 0.55 * size));
    const foot = new THREE.Vector3(Math.cos(a) * 0.45, 0, Math.sin(a) * 0.45);
    addPart(parts, limb(hub, knee, 0.09 * size, 0.08 * size, 4), barkPaint);
    addPart(parts, limb(knee, foot, 0.08 * size, 0.07 * size, 4), barkPaint);
  }
  lumpCrown(parts, rng, top.clone().add(new THREE.Vector3(0, 0.4 * size, 0)), 1.6 * size, 0.6, 4, leafLo, leafHi);
}

/** Verdance - fan palm: a curving trunk under a round fan of pleated leaves. */
function buildFanPalm(parts: THREE.BufferGeometry[], rng: SeededRandom, size: number, tall: number): void {
  const trunkCol = new THREE.Color(0xab8465);
  const trunkLo = new THREE.Color(0x725244);
  const frondLo = new THREE.Color(0x297537);
  const frondHi = new THREE.Color(0x9bb675);
  const H = 4.2 * size * tall;
  const bend = rng.next() * Math.PI * 2;
  const mid = new THREE.Vector3(Math.cos(bend) * 0.3 * size, H * 0.5, Math.sin(bend) * 0.3 * size);
  const top = new THREE.Vector3(Math.cos(bend) * 1.0 * size, H, Math.sin(bend) * 1.0 * size);
  // ringed trunk: bands of light and dark
  const paint: FacePaint = (c) => (Math.floor(c.y * 3 / size) % 2 === 0 ? trunkCol : trunkLo).clone();
  addPart(parts, limb(new THREE.Vector3(), mid, 0.2 * size, 0.16 * size, 6, 2), paint);
  addPart(parts, limb(mid, top, 0.16 * size, 0.13 * size, 6, 2), paint);
  const fronds = 9;
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * Math.PI * 2 + rng.next() * 0.2;
    const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const side = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
    const L = (1.7 + rng.next() * 0.4) * size;
    const g = ribbon((t) => top.clone().addScaledVector(out, L * t).add(new THREE.Vector3(0, 0.5 * size * Math.sin(t * Math.PI * 0.6) - 0.4 * L * t * t, 0)),
      side, UP, (t) => 0.9 * size * Math.sin(Math.PI * Math.min(1, 0.1 + 0.9 * t)) * (0.4 + 0.6 * t), 4);
    addPart(parts, g, (c, n) => shade(frondLo.clone().lerp(frondHi, 0.2 + 0.6 * smoothstep01(c.clone().sub(top).length() / L)), n.y < -0.2 ? 0.7 : 1), TEX_NEEDLES);
  }
}

/** Mirewood - elephant ear: a fountain of giant heart-shaped leaves round a glowing spadix. */
function buildElephantEar(parts: THREE.BufferGeometry[], rng: SeededRandom, size: number, tall: number): void {
  const stem = new THREE.Color(0x53998b);
  const leafLo = new THREE.Color(0x05582d);
  const leafHi = new THREE.Color(0x9bb675);
  const vein = new THREE.Color(0xc1f1d8);
  const spadix = new THREE.Color(0xfa3a64);
  const leaves = 6 + Math.floor(rng.next() * 2);
  const spin = rng.next() * Math.PI * 2;
  for (let i = 0; i < leaves; i++) {
    const a = spin + (i / leaves) * Math.PI * 2 + (rng.next() - 0.5) * 0.3;
    const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const side = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
    const h = (1.8 + rng.next() * 1.6) * size * tall;
    const base = out.clone().multiplyScalar(0.1 * size);
    const end = base.clone().addScaledVector(out, 0.8 * size).add(new THREE.Vector3(0, h, 0));
    addPart(parts, limb(base, end, 0.07 * size, 0.05 * size, 4), (c) => shade(stem, 0.7 + 0.3 * Math.min(1, c.y / h)));
    // the blade hangs out and down from the end of its stalk
    const L = (1.9 + rng.next() * 0.6) * size;
    const g = ribbon((t) => end.clone().addScaledVector(out, L * Math.sin(t * Math.PI * 0.45)).add(new THREE.Vector3(0, 0.25 * L * t - 0.75 * L * t * t, 0)),
      side, UP, (t) => 1.5 * size * Math.sin(Math.PI * Math.min(1, 0.25 + 0.8 * t)), 5);
    addPart(parts, g, (c, n) => {
      const along = smoothstep01(c.clone().sub(end).length() / L);
      const onVein = Math.abs(c.clone().sub(end).dot(side)) < 0.08 * size;
      return onVein ? vein.clone() : shade(leafLo.clone().lerp(leafHi, 0.3 + 0.5 * along), n.y < -0.2 ? 0.7 : 1);
    }, TEX_LEAVES);
  }
  const sp = limb(new THREE.Vector3(), new THREE.Vector3(0, 1.2 * size * tall, 0), 0.1 * size, 0.03 * size, 5, 2);
  addPart(parts, sp, () => spadix.clone(), TEX_SMOOTH, 0.4);
}

/** Mirewood - bottle cypress: a swollen bottle trunk with knees, a tiered flat crown and hanging moss. */
function buildBottleCypress(parts: THREE.BufferGeometry[], rng: SeededRandom, size: number, tall: number): void {
  const bark = new THREE.Color(0x69608b);
  const barkLo = new THREE.Color(0x3e3551);
  const leafLo = new THREE.Color(0x204f63);
  const leafHi = new THREE.Color(0x53998b);
  const moss = new THREE.Color(0xa09f91);
  const H = 5.5 * size * tall;
  // bottle profile: fat at the foot, narrow up the neck
  const prof = [0, 0.15, 0.3, 0.5, 0.7, 0.9, 1].map((t) => new THREE.Vector2(
    size * (0.22 + 0.55 * Math.pow(1 - t, 2.2) + (t < 0.3 ? 0.1 : 0)) * (t === 1 ? 0.6 : 1), t * H));
  prof.unshift(new THREE.Vector2(0.001, 0));
  const trunk = new THREE.LatheGeometry(prof, 7);
  addPart(parts, trunk, (c, n) => barkLo.clone().lerp(bark, 0.3 + 0.4 * Math.min(1, c.y / H) + 0.3 * Math.max(0, n.x)));
  // knees: little stumps poking out of the peat round it
  for (let i = 0; i < 3; i++) {
    const a = rng.next() * Math.PI * 2;
    const at = new THREE.Vector3(Math.cos(a) * 0.4, 0, Math.sin(a) * 0.4);
    addPart(parts, limb(at, at.clone().add(new THREE.Vector3(0, (0.3 + rng.next() * 0.25) * size, 0)), 0.08 * size, 0.03 * size, 4), () => shade(bark, 0.8));
  }
  // tiered flat crown
  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const y = H * (0.72 + 0.14 * i);
    const r = (2.0 - 0.45 * i) * size;
    const cone = new THREE.ConeGeometry(r, 0.7 * size, 8, 1, false);
    cone.rotateY(rng.next() * Math.PI);
    cone.translate((rng.next() - 0.5) * 0.3 * size, y, (rng.next() - 0.5) * 0.3 * size);
    addPart(parts, cone, (c, n) => n.y < -0.2 ? shade(leafLo, 0.6) : leafLo.clone().lerp(leafHi, 0.3 + 0.2 * i + 0.3 * hash3(c.x, c.y, c.z, 23)), TEX_NEEDLES);
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + rng.next();
    const from = new THREE.Vector3(Math.cos(a) * 1.5 * size, H * 0.7, Math.sin(a) * 1.5 * size);
    liana(parts, from, (1.0 + rng.next()) * size, a, 0.18 * size, moss, shade(moss, 0.7));
  }
}

/** Mirewood - weeping fern: a squat stump under fronds that arch up and cascade to the ground. */
function buildWeepFern(parts: THREE.BufferGeometry[], rng: SeededRandom, size: number, tall: number): void {
  const stump = new THREE.Color(0x2b1f35);
  const frondLo = new THREE.Color(0x0c2f44);
  const frondHi = new THREE.Color(0x84e3b5);
  const H = 1.4 * size * tall;
  const top = new THREE.Vector3(0, H, 0);
  addPart(parts, limb(new THREE.Vector3(), top, 0.3 * size, 0.24 * size, 6, 1), (c) => shade(stump, 0.8 + 0.4 * Math.min(1, c.y / H)));
  const fronds = 10;
  const spin = rng.next() * Math.PI * 2;
  for (let i = 0; i < fronds; i++) {
    const a = spin + (i / fronds) * Math.PI * 2 + (rng.next() - 0.5) * 0.2;
    const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const side = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
    const L = (2.2 + rng.next() * 0.8) * size;
    const rise = (1.0 + rng.next() * 0.6) * size * tall;
    const drop = H + rise - 0.1;
    const g = ribbon((t) => top.clone().addScaledVector(out, L * 0.6 * Math.sin(t * Math.PI * 0.5)).add(new THREE.Vector3(0, rise * Math.sin(t * Math.PI) * (1 - t) * 2 - drop * t * t, 0)),
      side, UP, (t) => 0.55 * size * Math.sin(Math.PI * Math.min(1, 0.1 + t)) * (1 - 0.4 * t), 6);
    addPart(parts, g, (c, n) => shade(frondLo.clone().lerp(frondHi, 0.25 + 0.6 * smoothstep01(c.clone().sub(top).length() / L)), n.y < -0.2 ? 0.7 : 1), TEX_NEEDLES, 0.05);
  }
}

// ---- Thalassa's island species (space-exploration, ocean-world) ----------

export type ThalassaTreeSpecies = 'saltpalm' | 'brinebush';

/**
 * Thalassa - salt palm: a short, wind-bent trunk in two kinks, a shock of
 * long drooping blue-green fronds, and a cluster of coral-pink pods.
 */
function buildSaltPalm(parts: THREE.BufferGeometry[], rng: SeededRandom, size: number, tall: number): void {
  const trunk = new THREE.Color(0x3e3551);
  const trunkHi = new THREE.Color(0x69608b);
  const frondLo = new THREE.Color(0x204f63);
  const frondHi = new THREE.Color(0x84e3b5);
  const pod = new THREE.Color(0xdd576d);
  const podHi = new THREE.Color(0xeab798);
  const H = 3.2 * size * tall;
  const lean = rng.next() * Math.PI * 2;
  const dir = new THREE.Vector3(Math.cos(lean), 0, Math.sin(lean));
  const k1 = dir.clone().multiplyScalar(0.5 * size).add(new THREE.Vector3(0, H * 0.45, 0));
  const top = dir.clone().multiplyScalar(0.7 * size).add(new THREE.Vector3(0, H, 0));
  const paint: FacePaint = (c, n) => trunk.clone().lerp(trunkHi, 0.2 + 0.4 * Math.max(0, n.y) + (Math.floor(c.y * 4 / size) % 2) * 0.15);
  addPart(parts, limb(new THREE.Vector3(), k1, 0.22 * size, 0.17 * size, 6, 2), paint);
  addPart(parts, limb(k1, top, 0.17 * size, 0.12 * size, 6, 2), paint);
  const fronds = 7 + Math.floor(rng.next() * 3);
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * Math.PI * 2 + rng.next() * 0.3;
    const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const side = new THREE.Vector3(-Math.sin(a), 0, Math.cos(a));
    const L = (1.9 + rng.next() * 0.6) * size;
    // up a little, then hanging well down: a weeping crown
    const g = ribbon((t) => top.clone().addScaledVector(out, L * t).add(new THREE.Vector3(0, 0.35 * size * Math.sin(t * Math.PI * 0.5) - 1.1 * L * t * t, 0)),
      side, UP, (t) => 0.42 * size * Math.sin(Math.PI * Math.min(1, 0.12 + 0.88 * t)), 5);
    addPart(parts, g, (c, n) => shade(frondLo.clone().lerp(frondHi, 0.15 + 0.7 * smoothstep01(c.clone().sub(top).length() / L)), n.y < -0.2 ? 0.7 : 1), TEX_NEEDLES);
  }
  const pods = 3 + Math.floor(rng.next() * 3);
  for (let i = 0; i < pods; i++) {
    const a = rng.next() * Math.PI * 2;
    const g = new THREE.IcosahedronGeometry(0.16 * size, 0);
    g.translate(top.x + Math.cos(a) * 0.22 * size, top.y - 0.2 * size, top.z + Math.sin(a) * 0.22 * size);
    addPart(parts, g, (_c, n) => pod.clone().lerp(podHi, 0.5 * Math.max(0, n.y)), TEX_SMOOTH);
  }
}

/**
 * Thalassa - brine bush: a low, wide shrub on many wiry stems, a flat
 * crown of dark sea-green leaves dotted with sea-pink flowers.
 */
function buildBrineBush(parts: THREE.BufferGeometry[], rng: SeededRandom, size: number, tall: number): void {
  const stem = new THREE.Color(0x2b1f35);
  const stemHi = new THREE.Color(0x522b2f);
  const leafLo = new THREE.Color(0x0c2f44);
  const leafHi = new THREE.Color(0x297537);
  const flower = new THREE.Color(0xc34988);
  const flowerHi = new THREE.Color(0xdd576d);
  const H = 1.3 * size * tall;
  const stems = 4 + Math.floor(rng.next() * 3);
  for (let i = 0; i < stems; i++) {
    const a = rng.next() * Math.PI * 2;
    const tip = new THREE.Vector3(Math.cos(a) * 0.6 * size, H * (0.8 + rng.next() * 0.3), Math.sin(a) * 0.6 * size);
    addPart(parts, limb(new THREE.Vector3(Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1), tip, 0.06 * size, 0.04 * size, 4),
      (c, n) => stem.clone().lerp(stemHi, 0.3 * Math.max(0, n.y) + 0.3 * Math.min(1, c.y / H)));
  }
  lumpCrown(parts, rng, new THREE.Vector3(0, H, 0), 1.1 * size, 0.45, 5, leafLo, leafHi);
  const flowers = 6 + Math.floor(rng.next() * 5);
  for (let i = 0; i < flowers; i++) {
    const a = rng.next() * Math.PI * 2;
    const r = (0.3 + rng.next() * 0.7) * 1.0 * size;
    const g = new THREE.OctahedronGeometry(0.1 * size, 0);
    g.translate(Math.cos(a) * r, H + 0.35 * size * (1 - r / (1.1 * size)) + 0.08 * size, Math.sin(a) * r);
    addPart(parts, g, (_c, n) => flower.clone().lerp(flowerHi, 0.6 * Math.max(0, n.y)), TEX_SMOOTH, 0.15);
  }
}

type SpeciesBuilder = (parts: THREE.BufferGeometry[], rng: SeededRandom, size: number, tall: number) => void;
/** One builder per species, for every planet with a FloraTreeManager */
const FLORA_BUILDERS: Record<FloraSpecies, SpeciesBuilder> = {
  redwood: buildRedwood, treefern: buildTreeFern, lantern: buildLantern,
  emberspire: buildEmberSpire, thornwood: buildThornwood,
  balloon: buildBalloon, spiralreed: buildSpiralReed,
  crystaltree: buildCrystalTree, geodebloom: buildGeodeBloom,
  frostcoral: buildFrostCoral, iceflower: buildIceFlower,
  glowcap: buildGlowcap, veilwillow: buildVeilWillow,
  canopygiant: buildCanopyGiant, mangrove: buildMangrove, fanpalm: buildFanPalm,
  elephantear: buildElephantEar, bottlecypress: buildBottleCypress, weepfern: buildWeepFern,
  saltpalm: buildSaltPalm, brinebush: buildBrineBush,
};
export const FLORA_SPECIES = Object.keys(FLORA_BUILDERS) as FloraSpecies[];

// Create a custom shader material that respects planet shadowing
// Objects on the dark side of the planet receive no directional light
function createPlanetAwareMaterial(baseColor: THREE.Color, sunDirection: THREE.Vector3): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      baseColor: { value: baseColor },
      sunDirection: { value: sunDirection.clone().normalize() },
      ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
      directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      void main() {
        // Transform normal to world space (not view space)
        vNormal = normalize(mat3(modelMatrix) * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 baseColor;
      uniform vec3 sunDirection;
      uniform float ambientIntensity;
      uniform float directionalIntensity;

      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      void main() {
        // Calculate surface normal (direction from planet center)
        // Trees are placed relative to planet center at origin or offset
        // Use world position normalized as approximation of planet surface normal
        vec3 surfaceNormal = normalize(vWorldPosition);

        // Check if this side of planet faces the sun
        // dot > 0 means facing sun, dot < 0 means in shadow
        float planetSunFacing = dot(surfaceNormal, sunDirection);

        // Smooth transition at terminator (day/night boundary)
        float shadowFactor = smoothstep(-0.1, 0.2, planetSunFacing);

        // Standard Lambert diffuse lighting on the mesh itself
        float meshDiffuse = max(0.0, dot(vNormal, sunDirection));

        // Combine: directional light only applies if planet surface faces sun
        vec3 directional = sunLight * meshDiffuse * directionalIntensity;
        float ambient = ambientIntensity;

        vec3 finalColor = baseColor * (ambient + directional);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
  });
}

export class TreeBuilder {
  private trunkMaterial: THREE.ShaderMaterial;
  private leavesMaterial: THREE.ShaderMaterial;
  private sunDirection: THREE.Vector3;

  constructor(sunDirection?: THREE.Vector3) {
    // Get sun direction from config or parameter
    this.sunDirection = sunDirection?.clone().normalize() ?? new THREE.Vector3(
      PlayerConfig.SUN_DIRECTION.x,
      PlayerConfig.SUN_DIRECTION.y,
      PlayerConfig.SUN_DIRECTION.z
    ).normalize();

    // Brown trunk material with planet-aware lighting
    this.trunkMaterial = createPlanetAwareMaterial(new THREE.Color(0x8B4513), this.sunDirection);
    // Green leaves material with planet-aware lighting
    this.leavesMaterial = createPlanetAwareMaterial(new THREE.Color(0x228B22), this.sunDirection);
  }

  // Create a tree mesh at the given position with outward-pointing direction
  // Optimized: merges all geometries into a single mesh to reduce draw calls
  public createTree(
    position: THREE.Vector3,
    upDirection: THREE.Vector3,
    config: Partial<TreeConfig> = {}
  ): THREE.Group {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const tree = new THREE.Group();

    // Size from the scatter config (trunkRadius/trunkHeight vary per tree);
    // species and shape from a seed taken from where the tree stands
    const size = cfg.trunkRadius / DEFAULT_CONFIG.trunkRadius;
    const tall = cfg.trunkHeight / (DEFAULT_CONFIG.trunkHeight * Math.max(size, 0.01));
    const rng = new SeededRandom(cfg.seed ?? seedFromPosition(position));
    const roll = rng.next();
    const species: EarthTreeSpecies = cfg.species ?? (roll < 0.45 ? 'pine' : roll < 0.78 ? 'oak' : 'birch');
    const geometries: THREE.BufferGeometry[] = [];
    if (species === 'pine') buildPine(geometries, rng, size, tall);
    else if (species === 'oak') buildOak(geometries, rng, size, tall);
    else buildBirch(geometries, rng, size, tall);
    tree.userData.species = species;

    // Merge all geometries into one
    plantInTile(geometries);
    const mergedGeom = BufferGeometryUtils.mergeGeometries(geometries);

    // Create merged mesh with custom shader material that uses vertex colors
    const mergedMaterial = this.createMergedTreeMaterial();
    const treeMesh = new THREE.Mesh(mergedGeom, mergedMaterial);
    treeMesh.userData.isTree = true;
    treeMesh.userData.treeType = 'trunk'; // Merged tree drops logs like trunk
    tree.add(treeMesh);

    // Clean up individual geometries
    for (const geom of geometries) {
      geom.dispose();
    }

    // Orient tree to point along upDirection
    const defaultUp = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultUp, upDirection.clone().normalize());
    tree.quaternion.copy(quaternion);

    // Position the tree
    tree.position.copy(position);

    // Trees never move: compute the matrices once and take the whole tree
    // out of three.js's per-frame matrix update (Sequoia has 1000+).
    tree.updateMatrixWorld(true);
    tree.traverse((obj) => {
      obj.matrixAutoUpdate = false;
      obj.matrixWorldAutoUpdate = false;
    });

    return tree;
  }


  // Create merged tree material with vertex colors and planet-aware lighting
  private createMergedTreeMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        sunDirection: { value: this.sunDirection.clone().normalize() },
        ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
        directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
      },
      vertexShader: `
        attribute vec3 color;
        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main() {
          vColor = color;
          vNormal = normalize(mat3(modelMatrix) * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 sunDirection;
        uniform float ambientIntensity;
        uniform float directionalIntensity;

        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main() {
          vec3 surfaceNormal = normalize(vWorldPosition);
          float planetSunFacing = dot(surfaceNormal, sunDirection);
          float shadowFactor = smoothstep(-0.1, 0.2, planetSunFacing);
          float meshDiffuse = max(0.0, dot(vNormal, sunDirection));
          float directional = meshDiffuse * shadowFactor * directionalIntensity;
          float ambient = ambientIntensity;
          vec3 finalColor = vColor * (ambient + directional);
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    });
  }


  public getTrunkMaterial(): THREE.Material {
    return this.trunkMaterial;
  }

  public getLeavesMaterial(): THREE.Material {
    return this.leavesMaterial;
  }
}

// Mockup toggle (Debug tab): improved tree shading - baked darkening toward
// the base of each tree and a per-tree tint, plus wrap lighting, sky/ground
// ambient and a rim light in the shader.
let improvedTreeShading = false;
const treeBatchers = new Set<TreeBatcher>();
export function setImprovedTreeShading(on: boolean): void {
  improvedTreeShading = on;
  for (const b of treeBatchers) b.setImproved(on);
}

// Batched tree rendering, one merged mesh per LOD chunk. Each chunk's mesh is
// built once (and again only if a tree in it is added or removed) and then
// just shown or hidden with the chunk. The old single batch was rebuilt -
// cloning and merging every visible tree - whenever the visible tile set
// changed, which at altitude was nearly every frame.
class TreeBatcher {
  private scene: THREE.Scene;
  private material: THREE.ShaderMaterial;
  private chunkOf: (tileIndex: number) => number = () => 0;
  private treesByChunk: Map<number, THREE.Group[]> = new Map();
  private meshes: Map<number, THREE.Mesh> = new Map();
  private dirty: Set<number> = new Set();
  private lastChunks: Set<number> | null = null;
  private showingAll: boolean | null = null;

  constructor(scene: THREE.Scene, material: THREE.ShaderMaterial) {
    this.scene = scene;
    this.material = material;
    treeBatchers.add(this);
    this.material.uniforms.improved.value = improvedTreeShading ? 1 : 0;
  }

  // Switch shading; the baked colours need every chunk rebuilt
  public setImproved(on: boolean): void {
    this.material.uniforms.improved.value = on ? 1 : 0;
    for (const chunk of this.treesByChunk.keys()) this.dirty.add(chunk);
    this.lastChunks = null;
    this.showingAll = null;
  }

  public setChunkLookup(chunkOf: (tileIndex: number) => number): void {
    this.chunkOf = chunkOf;
  }

  public setPlanetCenter(center: THREE.Vector3): void {
    this.material.uniforms.planetCenter.value.copy(center);
  }

  public setSunDirection(dir: THREE.Vector3): void {
    this.material.uniforms.sunDirection.value.copy(dir).normalize();
  }

  /** The planet's sky light table (openspec sky-lighting) */
  public setSkyLight(tex: THREE.Texture): void {
    this.material.uniforms.skyLight.value = tex;
  }

  // Trees without a tile go in chunk -1, which is always shown
  private chunkFor(tree: THREE.Group): number {
    const tileIndex = tree.userData.tileIndex;
    return tileIndex === undefined ? -1 : this.chunkOf(tileIndex);
  }

  public add(tree: THREE.Group): void {
    const chunk = this.chunkFor(tree);
    tree.userData.treeChunk = chunk;
    let list = this.treesByChunk.get(chunk);
    if (!list) {
      list = [];
      this.treesByChunk.set(chunk, list);
    }
    list.push(tree);
    this.dirty.add(chunk);
    this.lastChunks = null;
  }

  public remove(tree: THREE.Group): void {
    const chunk = tree.userData.treeChunk as number | undefined;
    if (chunk === undefined) return;
    const list = this.treesByChunk.get(chunk);
    if (list) {
      const i = list.indexOf(tree);
      if (i >= 0) list.splice(i, 1);
    }
    this.dirty.add(chunk);
    this.lastChunks = null;
  }

  private build(chunk: number): void {
    const old = this.meshes.get(chunk);
    if (old) {
      this.scene.remove(old);
      old.geometry.dispose();
      this.meshes.delete(chunk);
    }
    this.dirty.delete(chunk);

    const geometries: THREE.BufferGeometry[] = [];
    for (const tree of this.treesByChunk.get(chunk) ?? []) {
      const treeGeoms: THREE.BufferGeometry[] = [];
      tree.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          const geom = child.geometry.clone();
          child.updateWorldMatrix(true, false);
          geom.applyMatrix4(child.matrixWorld);
          treeGeoms.push(geom);
        }
      });
      if (improvedTreeShading) bakeTreeShading(tree, treeGeoms);
      geometries.push(...treeGeoms);
    }
    if (geometries.length === 0) return;

    const merged = BufferGeometryUtils.mergeGeometries(geometries);
    for (const geom of geometries) geom.dispose();
    if (!merged) return;
    merged.computeBoundingSphere();

    const mesh = new THREE.Mesh(merged, this.material);
    // Its own matrix stays identity (the trees are baked in), but its WORLD
    // matrix must follow its parent: the planet's attach root moves it round
    // the orbit (src/world/PlanetFrames.ts). Freezing it left a moving
    // planet's forest hanging in space where it was built.
    mesh.matrixAutoUpdate = false;
    mesh.visible = false;
    this.scene.add(mesh);
    this.meshes.set(chunk, mesh);
  }

  // Show exactly the given chunks (plus chunk -1). Same Set object as last
  // time and nothing changed = no work.
  public showChunks(chunks: Set<number>): void {
    if (chunks === this.lastChunks && this.dirty.size === 0 && this.showingAll === null) return;
    this.lastChunks = chunks;
    this.showingAll = null;
    for (const chunk of this.treesByChunk.keys()) {
      const visible = chunk === -1 || chunks.has(chunk);
      if (visible && (this.dirty.has(chunk) || !this.meshes.has(chunk))) this.build(chunk);
      const mesh = this.meshes.get(chunk);
      if (mesh) mesh.visible = visible;
    }
  }

  public showAll(visible: boolean): void {
    if (this.showingAll === visible && this.dirty.size === 0) return;
    this.showingAll = visible;
    this.lastChunks = null;
    for (const chunk of this.treesByChunk.keys()) {
      if (visible && (this.dirty.has(chunk) || !this.meshes.has(chunk))) this.build(chunk);
      const mesh = this.meshes.get(chunk);
      if (mesh) mesh.visible = visible;
    }
  }
}

// Improved shading, baked into vertex colours: darker toward the base of the
// tree (cheap ambient occlusion) and a small per-tree tint so a forest isn't
// one flat colour.
function bakeTreeShading(tree: THREE.Group, geoms: THREE.BufferGeometry[]): void {
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(tree.quaternion);
  const base = tree.position;
  let top = 0;
  const v = new THREE.Vector3();
  for (const g of geoms) {
    const pos = g.getAttribute('position');
    for (let i = 0; i < pos.count; i++) top = Math.max(top, v.fromBufferAttribute(pos, i).sub(base).dot(up));
  }
  if (top <= 0) return;
  // Stable per-tree tint from its position
  const h = Math.abs(Math.sin(base.x * 12.9898 + base.y * 78.233 + base.z * 37.719) * 43758.5453) % 1;
  const tint = [0.92 + 0.16 * h, 0.95 + 0.1 * ((h * 7) % 1), 0.9 + 0.12 * ((h * 13) % 1)];
  for (const g of geoms) {
    const pos = g.getAttribute('position');
    const col = g.getAttribute('color');
    if (!col) continue;
    for (let i = 0; i < pos.count; i++) {
      const t = v.fromBufferAttribute(pos, i).sub(base).dot(up) / top;
      const ao = 0.5 + 0.5 * Math.min(1, Math.max(0, t / 0.55));
      col.setXYZ(i, col.getX(i) * ao * tint[0], col.getY(i) * ao * tint[1], col.getZ(i) * ao * tint[2]);
    }
    col.needsUpdate = true;
  }
}

// Shared shader for batched trees. planetCenter makes the day/night term use
// the direction from the tree's own planet; it used normalize(worldPos),
// which only works for a planet at the origin (wrong on Sequoia and the Moon).
// Atlas repeats (32 texels each) per world unit: 0.5 = 16 texels a unit,
// close to the terrain's pixel size
const TREE_TEXELS_PER_UNIT = 0.5;

let atlasTexture: THREE.Texture | null = null;
function treeAtlas(): THREE.Texture {
  if (!atlasTexture) {
    atlasTexture = new THREE.TextureLoader().load(getAssetPath('/textures/trees.png'));
    atlasTexture.magFilter = THREE.NearestFilter;
    atlasTexture.minFilter = THREE.NearestFilter;
    atlasTexture.generateMipmaps = false;
  }
  return atlasTexture;
}

function createBatchedTreeMaterial(sunDirection: THREE.Vector3, doubleSided: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      sunDirection: { value: sunDirection.clone().normalize() },
      planetCenter: { value: new THREE.Vector3() },
      improved: { value: 0 },
      ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
      directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
      treeAtlas: { value: treeAtlas() },
      ...skyLightUniforms(),
      ...torchLightUniforms(),
    },
    vertexShader: `
      attribute float texCell;
      varying float vTexCell;
      attribute float glow;
      varying float vGlow;
      attribute vec3 color;
      varying vec3 vColor;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      void main() {
        vColor = color;
        vTexCell = texCell;
        vGlow = glow;
        vNormal = normalize(mat3(modelMatrix) * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D treeAtlas;
      varying float vTexCell;
      varying float vGlow;
      uniform vec3 sunDirection;
      uniform vec3 planetCenter;
      uniform float improved;
      uniform float ambientIntensity;
      uniform float directionalIntensity;
      #include <tenebris_sky_light>
      #include <tenebris_torch_light>

      varying vec3 vColor;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      void main() {
        vec3 surfaceNormal = normalize(vWorldPosition - planetCenter);
        float planetSunFacing = dot(surfaceNormal, sunDirection);
        // The sky light table (openspec sky-lighting), as the terrain reads it
        vec3 sunLight = skySun(planetSunFacing);
        vec3 fill = skyFill(planetSunFacing) * ambientIntensity;
        float shadowFactor = clamp(dot(sunLight, vec3(0.2126, 0.7152, 0.0722)), 0.0, 1.0);
        vec3 n = normalize(vNormal);
        if (!gl_FrontFacing) n = -n;
        float meshDiffuse = max(0.0, dot(n, sunDirection));
        float directional = meshDiffuse * shadowFactor * directionalIntensity;
        // Pixel detail from the tree atlas, projected along the face's
        // dominant axis (planet-local so it stays precise far from origin),
        // at the terrain's texel size; grey 200 = no change
        vec3 lp = (vWorldPosition - planetCenter) * ${TREE_TEXELS_PER_UNIT.toFixed(3)};
        vec3 an = abs(n);
        vec2 tuv = an.x > an.y && an.x > an.z ? lp.zy : (an.y > an.z ? lp.xz : lp.xy);
        vec2 auv = vec2((fract(tuv.x) + floor(vTexCell + 0.5)) * 0.25, fract(tuv.y));
        vec3 detail = texture2D(treeAtlas, auv).rgb * (255.0 / 200.0);
        vec3 tinted = vColor * detail;
        // Sun and fill exactly as the terrain's, so trees sit in the same light
        vec3 finalColor = tinted * (fill + directional);
        if (improved > 0.5) {
          // Wrap lighting (soft terminator on the canopy), sky/ground
          // hemisphere ambient, and a rim on the sun side
          float wrap = max(0.0, (dot(n, sunDirection) + 0.4) / 1.4);
          float hemi = 0.5 + 0.5 * dot(n, surfaceNormal);
          vec3 ambient = mix(vec3(0.55, 0.5, 0.45), vec3(0.75, 0.85, 1.0), hemi) * fill * (0.6 + 0.4 * shadowFactor);
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          float rim = pow(1.0 - max(0.0, dot(n, viewDir)), 3.0) * shadowFactor * 0.35;
          finalColor = tinted * (ambient + wrap * sunLight * directionalIntensity) + vec3(1.0, 0.92, 0.75) * rim;
        }
        // Glowing parts (alien species) shine with their own colour, day
        // and night alike; 0 everywhere on ordinary trees
        finalColor += tinted * vGlow;
        // Torches nearby, as on the ground under the tree
        finalColor += torchGlow(tinted, vWorldPosition, planetSunFacing);
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
    side: doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    polygonOffset: doubleSided,
    polygonOffsetFactor: doubleSided ? 1 : 0,
    polygonOffsetUnits: doubleSided ? 1 : 0,
  });
}

// Tree manager for a planet - now with geometry batching for performance
export class PlanetTreeManager {
  private trees: THREE.Group[] = [];
  private treesByTile: Map<number, THREE.Group[]> = new Map(); // Trees grouped by tile index
  private treeBuilder: TreeBuilder;
  private scene: THREE.Scene;

  private batcher: TreeBatcher;
  private sunDirection: THREE.Vector3;

  constructor(scene: THREE.Scene, sunDirection?: THREE.Vector3) {
    this.scene = scene;
    this.treeBuilder = new TreeBuilder(sunDirection);
    this.sunDirection = sunDirection?.clone().normalize() ?? new THREE.Vector3(
      PlayerConfig.SUN_DIRECTION.x,
      PlayerConfig.SUN_DIRECTION.y,
      PlayerConfig.SUN_DIRECTION.z
    ).normalize();
    this.batcher = new TreeBatcher(scene, createBatchedTreeMaterial(this.sunDirection, false));
  }

  // Place a tree at a specific world position
  public addTree(worldPosition: THREE.Vector3, planetCenter: THREE.Vector3, config?: Partial<TreeConfig>, tileIndex?: number): THREE.Group {
    // Calculate up direction (away from planet center)
    const upDirection = worldPosition.clone().sub(planetCenter).normalize();

    // Create tree
    const tree = this.treeBuilder.createTree(worldPosition, upDirection, config);

    // Store tile index in userData for visibility tracking
    if (tileIndex !== undefined) {
      tree.userData.tileIndex = tileIndex;

      // Group trees by tile for efficient visibility updates
      if (!this.treesByTile.has(tileIndex)) {
        this.treesByTile.set(tileIndex, []);
      }
      this.treesByTile.get(tileIndex)!.push(tree);
    }

    // Drawn by the batcher; the individual tree stays for raycasts
    tree.visible = false;
    this.trees.push(tree);
    this.scene.add(tree);
    this.batcher.add(tree);

    return tree;
  }

  // Remove a tree
  /** Fell every tree on a tile (another player chopped it). */
  public removeTreesAtTile(tileIndex: number): void {
    for (const tree of [...(this.treesByTile.get(tileIndex) ?? [])]) this.removeTree(tree);
  }

  public removeTree(tree: THREE.Group): void {
    const index = this.trees.indexOf(tree);
    if (index >= 0) {
      this.trees.splice(index, 1);
      this.scene.remove(tree);
      this.batcher.remove(tree);

      // Remove from treesByTile map
      const tileIndex = tree.userData.tileIndex;
      if (tileIndex !== undefined && this.treesByTile.has(tileIndex)) {
        const tileTrees = this.treesByTile.get(tileIndex)!;
        const tileTreeIndex = tileTrees.indexOf(tree);
        if (tileTreeIndex >= 0) {
          tileTrees.splice(tileTreeIndex, 1);
        }
      }

      // Dispose geometries
      tree.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
        }
      });
    }
  }

  // Get tree at position (for mining)
  public getTreeAtPosition(position: THREE.Vector3, maxDistance: number = 1): THREE.Group | null {
    for (const tree of this.trees) {
      if (tree.position.distanceTo(position) < maxDistance) {
        return tree;
      }
    }
    return null;
  }

  // Get all tree meshes for raycasting (avoids scene traversal)
  public getTreeMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    for (const tree of this.trees) {
      tree.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.isTree) {
          meshes.push(child);
        }
      });
    }
    return meshes;
  }

  // Scatter trees randomly on planet surface using seeded random
  public scatterTrees(
    planetCenter: THREE.Vector3,
    _planetRadius: number,
    count: number,
    getSurfaceHeight: (direction: THREE.Vector3) => number,
    isUnderwater?: (direction: THREE.Vector3) => boolean,
    seed: number = PlayerConfig.TERRAIN_SEED,
    getTileIndex?: (direction: THREE.Vector3) => number | null,
    getTileCenter?: (direction: THREE.Vector3) => THREE.Vector3 | null,
    removedTiles?: Set<number>,
    // Biome mockup: which species grows on a tile (null = nothing grows
    // there, undefined = the usual mix)
    speciesAt?: (tileIndex: number, roll: number) => EarthTreeSpecies | null | undefined
  ): void {
    this.batcher.setPlanetCenter(planetCenter);
    const rng = new SeededRandom(seed + 54321); // Offset seed slightly for trees
    let placed = 0;
    let attempts = 0;
    const maxAttempts = count * 5; // Avoid infinite loop if most terrain is water
    const usedTiles = new Set<number>(); // Track which tiles already have trees

    while (placed < count && attempts < maxAttempts) {
      attempts++;

      // Random direction on sphere using seeded random
      const theta = rng.next() * Math.PI * 2;
      const phi = Math.acos(2 * rng.next() - 1);

      let direction = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi)
      ).normalize();

      // Get tile index for visibility tracking and deduplication
      const tileIndex = getTileIndex ? getTileIndex(direction) : null;

      // Skip if this tile already has a tree or was previously removed
      if (tileIndex !== null && (usedTiles.has(tileIndex) || removedTiles?.has(tileIndex))) {
        continue;
      }

      // Snap to tile center if available
      if (getTileCenter) {
        const tileCenter = getTileCenter(direction);
        if (tileCenter) {
          direction = tileCenter.clone().sub(planetCenter).normalize();
        }
      }

      // Skip underwater locations
      if (isUnderwater && isUnderwater(direction)) {
        continue;
      }

      // Get surface height at this direction
      const surfaceHeight = getSurfaceHeight(direction);

      // Position tree on surface (no offset - tree base sits at ground level)
      const treePosition = planetCenter.clone().add(
        direction.clone().multiplyScalar(surfaceHeight)
      );

      // Mark this tile as used
      if (tileIndex !== null) {
        usedTiles.add(tileIndex);
      }

      // Randomize tree size with wider variation using seeded random
      const sizeVariation = 0.5 + rng.next() * 1.0; // 0.5 to 1.5 (wider range)
      const heightVariation = 0.6 + rng.next() * 0.9; // 0.6 to 1.5 (independent height variation)
      const config: Partial<TreeConfig> = {
        trunkHeight: DEFAULT_CONFIG.trunkHeight * sizeVariation * heightVariation,
        trunkRadius: DEFAULT_CONFIG.trunkRadius * sizeVariation,
        leafBaseRadius: DEFAULT_CONFIG.leafBaseRadius * sizeVariation,
        leafLayers: Math.floor(2 + rng.next() * 4), // 2-5 layers for more variety
        leafTaper: 0.6 + rng.next() * 0.2, // 0.6 to 0.8 for shape variation
      };

      if (speciesAt && tileIndex !== null) {
        const species = speciesAt(tileIndex, rng.next());
        if (species === null) continue;
        if (species) config.species = species;
      }
      this.addTree(treePosition, planetCenter, config, tileIndex ?? undefined);
      placed++;
    }
  }

  // Which LOD chunks' trees are drawn (Planet.getVisibleTreeChunks())
  public updateVisibility(visibleChunks: Set<number>): void {
    this.batcher.showChunks(visibleChunks);
  }

  // Show or hide every tree (orbit view)
  /** Live orbits: sunlight and the planet's centre as it moves. */
  public setSunDirection(dir: THREE.Vector3): void {
    this.sunDirection.copy(dir).normalize();
    this.batcher.setSunDirection(dir);
  }

  /** The planet's sky light table (openspec sky-lighting) */
  public setSkyLight(tex: THREE.Texture): void {
    this.batcher.setSkyLight(tex);
  }

  public setPlanetCenter(center: THREE.Vector3): void {
    this.batcher.setPlanetCenter(center);
  }

  public setAllVisible(visible: boolean): void {
    this.batcher.showAll(visible);
  }

  // Map a tile to its LOD chunk; set before scattering trees
  public setChunkLookup(chunkOf: (tileIndex: number) => number): void {
    this.batcher.setChunkLookup(chunkOf);
  }

  public getTrees(): THREE.Group[] {
    return this.trees;
  }

  public getTreeBuilder(): TreeBuilder {
    return this.treeBuilder;
  }
}

// ============================================================================
// FLORA TREE BUILDER - every planet's own species but Earth's (Sequoia and
// the living alien worlds). One builder, one manager, one scatter path; a
// planet's roster and which species grows where come from its config.
// ============================================================================

export interface FloraTreeConfig {
  stemHeight: number;       // Height of mushroom stem
  stemRadius: number;       // Radius of stem
  capRadius: number;        // Radius of mushroom cap
  capHeight: number;        // Height/thickness of cap
  capTaper: number;         // 0 = flat disc, 1 = pointed cone
  species?: FloraSpecies;   // default: rolled from the manager's roster
  seed?: number;            // default: from the tree's position
}

const DEFAULT_MUSHROOM_CONFIG: FloraTreeConfig = {
  stemHeight: 4,
  stemRadius: 0.4,
  capRadius: 3,
  capHeight: 1.5,
  capTaper: 0.3,  // Slightly domed
};

export class FloraTreeBuilder {
  private sunDirection: THREE.Vector3;
  private roster: readonly FloraSpecies[];

  constructor(roster: readonly FloraSpecies[], sunDirection?: THREE.Vector3) {
    this.roster = roster;
    this.sunDirection = sunDirection?.clone().normalize() ?? new THREE.Vector3(
      PlayerConfig.SUN_DIRECTION.x,
      PlayerConfig.SUN_DIRECTION.y,
      PlayerConfig.SUN_DIRECTION.z
    ).normalize();
  }

  // Create a tree of this planet's flora at the given position, standing along upDirection
  public createTree(
    position: THREE.Vector3,
    upDirection: THREE.Vector3,
    config: Partial<FloraTreeConfig> = {}
  ): THREE.Group {
    const cfg = { ...DEFAULT_MUSHROOM_CONFIG, ...config };
    const tree = new THREE.Group();

    const rng = new SeededRandom(cfg.seed ?? seedFromPosition(position));
    // This planet's own flora (no species is on two planets)
    const roll = rng.next();
    const species: FloraSpecies = cfg.species ?? this.roster[Math.min(this.roster.length - 1, Math.floor(roll * this.roster.length))];
    const geometries: THREE.BufferGeometry[] = [];
    const size = cfg.stemRadius / DEFAULT_MUSHROOM_CONFIG.stemRadius;
    const tall = cfg.stemHeight / (DEFAULT_MUSHROOM_CONFIG.stemHeight * Math.max(size, 0.01));
    FLORA_BUILDERS[species](geometries, rng, size, tall);
    tree.userData.species = species;

    // Merge all geometries into one
    plantInTile(geometries);
    const mergedGeom = BufferGeometryUtils.mergeGeometries(geometries);

    // Create merged mesh with custom shader material
    const mergedMaterial = this.createMergedMushroomMaterial();
    const treeMesh = new THREE.Mesh(mergedGeom, mergedMaterial);
    treeMesh.userData.isTree = true;
    treeMesh.userData.treeType = 'mushroom';
    tree.add(treeMesh);

    // Clean up individual geometries
    for (const geom of geometries) {
      geom.dispose();
    }

    // Orient mushroom to point along upDirection
    const defaultUp = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultUp, upDirection.clone().normalize());
    tree.quaternion.copy(quaternion);

    // Position the mushroom
    tree.position.copy(position);

    // Trees never move: compute the matrices once and take the whole tree
    // out of three.js's per-frame matrix update (Sequoia has 1000+).
    tree.updateMatrixWorld(true);
    tree.traverse((obj) => {
      obj.matrixAutoUpdate = false;
      obj.matrixWorldAutoUpdate = false;
    });

    return tree;
  }


  // Create merged mushroom material with vertex colors and planet-aware lighting
  private createMergedMushroomMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        sunDirection: { value: this.sunDirection.clone().normalize() },
        ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
        directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
      },
      vertexShader: `
        attribute vec3 color;
        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main() {
          vColor = color;
          vNormal = normalize(mat3(modelMatrix) * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 sunDirection;
        uniform float ambientIntensity;
        uniform float directionalIntensity;

        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main() {
          vec3 surfaceNormal = normalize(vWorldPosition);
          float planetSunFacing = dot(surfaceNormal, sunDirection);
          float shadowFactor = smoothstep(-0.1, 0.2, planetSunFacing);
          float meshDiffuse = max(0.0, dot(vNormal, sunDirection));
          float directional = meshDiffuse * shadowFactor * directionalIntensity;
          float ambient = ambientIntensity;
          vec3 finalColor = vColor * (ambient + directional);
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: THREE.DoubleSide,  // Render both sides for the cap underside
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
  }

}

// Flora tree manager - a planet's own species (Sequoia, the alien worlds), batched
export class FloraTreeManager {
  private trees: THREE.Group[] = [];
  private treesByTile: Map<number, THREE.Group[]> = new Map();
  private treeBuilder: FloraTreeBuilder;
  private scene: THREE.Scene;

  private batcher: TreeBatcher;
  private sunDirection: THREE.Vector3;

  constructor(scene: THREE.Scene, roster: readonly FloraSpecies[], sunDirection?: THREE.Vector3) {
    this.scene = scene;
    this.treeBuilder = new FloraTreeBuilder(roster, sunDirection);
    this.sunDirection = sunDirection?.clone().normalize() ?? new THREE.Vector3(
      PlayerConfig.SUN_DIRECTION.x,
      PlayerConfig.SUN_DIRECTION.y,
      PlayerConfig.SUN_DIRECTION.z
    ).normalize();
    this.batcher = new TreeBatcher(scene, createBatchedTreeMaterial(this.sunDirection, true));
  }

  // Place a mushroom at a specific world position
  public addTree(worldPosition: THREE.Vector3, planetCenter: THREE.Vector3, config?: Partial<FloraTreeConfig>, tileIndex?: number): THREE.Group {
    const upDirection = worldPosition.clone().sub(planetCenter).normalize();
    const tree = this.treeBuilder.createTree(worldPosition, upDirection, config);

    if (tileIndex !== undefined) {
      tree.userData.tileIndex = tileIndex;
      if (!this.treesByTile.has(tileIndex)) {
        this.treesByTile.set(tileIndex, []);
      }
      this.treesByTile.get(tileIndex)!.push(tree);
    }

    // Drawn by the batcher; the individual tree stays for raycasts
    tree.visible = false;
    this.trees.push(tree);
    this.scene.add(tree);
    this.batcher.add(tree);
    return tree;
  }

  // Remove a mushroom tree
  public removeTree(tree: THREE.Group): void {
    const index = this.trees.indexOf(tree);
    if (index >= 0) {
      this.trees.splice(index, 1);
      this.scene.remove(tree);
      this.batcher.remove(tree);

      const tileIndex = tree.userData.tileIndex;
      if (tileIndex !== undefined && this.treesByTile.has(tileIndex)) {
        const tileTrees = this.treesByTile.get(tileIndex)!;
        const tileTreeIndex = tileTrees.indexOf(tree);
        if (tileTreeIndex >= 0) {
          tileTrees.splice(tileTreeIndex, 1);
        }
      }

      tree.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
        }
      });
    }
  }

  // Get tree at position (for mining)
  public getTreeAtPosition(position: THREE.Vector3, maxDistance: number = 1): THREE.Group | null {
    for (const tree of this.trees) {
      if (tree.position.distanceTo(position) < maxDistance) {
        return tree;
      }
    }
    return null;
  }

  // Get all tree meshes for raycasting
  public getTreeMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    for (const tree of this.trees) {
      tree.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.isTree) {
          meshes.push(child);
        }
      });
    }
    return meshes;
  }

  // Scatter this planet's flora on its surface: one plant per tile, standing
  // in the middle of its tile (plantInTile keeps it inside)
  public scatterTrees(
    planetCenter: THREE.Vector3,
    _planetRadius: number,
    count: number,
    getSurfaceHeight: (direction: THREE.Vector3) => number,
    isUnderwater?: (direction: THREE.Vector3) => boolean,
    seed: number = PlayerConfig.TERRAIN_SEED,
    getTileIndex?: (direction: THREE.Vector3) => number | null,
    getTileCenter?: (direction: THREE.Vector3) => THREE.Vector3 | null,
    removedTreeTiles?: Set<number>,
    // Biomes: which species grows on a tile (null = nothing grows there,
    // undefined = rolled from the roster)
    speciesAt?: (tileIndex: number, roll: number) => FloraSpecies | null | undefined
  ): void {
    this.batcher.setPlanetCenter(planetCenter);
    const rng = new SeededRandom(seed + 98765);  // Different offset from regular trees

    let placed = 0;
    let attempts = 0;
    const maxAttempts = count * 10;
    const usedTiles = new Set<number>();

    while (placed < count && attempts < maxAttempts) {
      attempts++;

      // Generate random direction on sphere using seeded random
      const theta = rng.next() * Math.PI * 2;
      const phi = Math.acos(2 * rng.next() - 1);
      let direction = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta)
      ).normalize();

      // One plant per tile, none where one was cut down
      const tileIndex = getTileIndex ? getTileIndex(direction) : null;
      if (tileIndex !== null && (usedTiles.has(tileIndex) || removedTreeTiles?.has(tileIndex))) {
        continue;
      }
      // Stand in the middle of the tile, so it never straddles a tile edge
      const centre = getTileCenter?.(direction);
      if (centre) direction = centre.clone().sub(planetCenter).normalize();

      // Skip if underwater
      if (isUnderwater && isUnderwater(direction)) {
        continue;
      }

      // Get surface height and place the plant slightly above
      const surfaceHeight = getSurfaceHeight(direction);
      const treePosition = direction.clone().multiplyScalar(surfaceHeight + 0.1);
      treePosition.add(planetCenter);

      // Randomize size
      const sizeVariation = 0.6 + rng.next() * 0.8;  // 0.6 to 1.4
      const heightVariation = 0.7 + rng.next() * 0.6;  // 0.7 to 1.3
      const config: Partial<FloraTreeConfig> = {
        stemHeight: DEFAULT_MUSHROOM_CONFIG.stemHeight * sizeVariation * heightVariation,
        stemRadius: DEFAULT_MUSHROOM_CONFIG.stemRadius * sizeVariation,
        capRadius: DEFAULT_MUSHROOM_CONFIG.capRadius * sizeVariation,
        capHeight: DEFAULT_MUSHROOM_CONFIG.capHeight * sizeVariation,
        capTaper: 0.2 + rng.next() * 0.3,  // 0.2 to 0.5 for shape variation
      };
      if (speciesAt && tileIndex !== null) {
        const species = speciesAt(tileIndex, rng.next());
        if (species === null) continue;
        if (species) config.species = species;
      }

      if (tileIndex !== null) usedTiles.add(tileIndex);
      this.addTree(treePosition, planetCenter, config, tileIndex ?? undefined);
      placed++;
    }
  }

  // Which LOD chunks' trees are drawn (Planet.getVisibleTreeChunks())
  public updateVisibility(visibleChunks: Set<number>): void {
    this.batcher.showChunks(visibleChunks);
  }

  // Show or hide every tree (orbit view)
  /** Live orbits: sunlight and the planet's centre as it moves. */
  public setSunDirection(dir: THREE.Vector3): void {
    this.sunDirection.copy(dir).normalize();
    this.batcher.setSunDirection(dir);
  }

  /** The planet's sky light table (openspec sky-lighting) */
  public setSkyLight(tex: THREE.Texture): void {
    this.batcher.setSkyLight(tex);
  }

  public setPlanetCenter(center: THREE.Vector3): void {
    this.batcher.setPlanetCenter(center);
  }

  public setAllVisible(visible: boolean): void {
    this.batcher.showAll(visible);
  }

  // Map a tile to its LOD chunk; set before scattering trees
  public setChunkLookup(chunkOf: (tileIndex: number) => number): void {
    this.batcher.setChunkLookup(chunkOf);
  }

  public getTrees(): THREE.Group[] {
    return this.trees;
  }

  public getTreeBuilder(): FloraTreeBuilder {
    return this.treeBuilder;
  }
}
