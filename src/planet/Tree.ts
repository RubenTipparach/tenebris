import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PlayerConfig } from '../config/PlayerConfig';

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

// A tapered limb from `from` to `to` (open ended: the ends are hidden)
function limb(from: THREE.Vector3, to: THREE.Vector3, r0: number, r1: number, sides: number, segments = 1): THREE.BufferGeometry {
  const dir = to.clone().sub(from);
  const len = dir.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, sides, segments, true);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize()));
  g.translate(from.x, from.y, from.z);
  return g;
}

function shade(base: THREE.Color, k: number): THREE.Color {
  return base.clone().multiplyScalar(k);
}

function addPart(parts: THREE.BufferGeometry[], g: THREE.BufferGeometry, paint: FacePaint): void {
  const part = prepPart(g);
  paintFaces(part, paint);
  parts.push(part);
}

// ---- Earth species --------------------------------------------------------

export type EarthTreeSpecies = 'pine' | 'oak' | 'birch';

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
    });
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
  clusters.forEach((cl, idx) => {
    const g = new THREE.IcosahedronGeometry(cl.r, cl.detail);
    g.scale(1, 0.82, 1);
    g.translate(cl.at.x, cl.at.y, cl.at.z);
    jitterVertices(g, cl.r * 0.16, 31 + idx);
    const tint = 0.88 + rng.next() * 0.24;
    const hueShift = (rng.next() - 0.5) * 0.08;
    addPart(parts, g, (c, n) => {
      const h = Math.min(1, Math.max(0, (c.y - yLow) / (yHigh - yLow)));
      const col = canopyLow.clone().lerp(canopyHigh, 0.15 + 0.55 * h + 0.3 * Math.max(0, n.y));
      col.offsetHSL(hueShift, 0, 0);
      if (n.y < -0.3) col.multiplyScalar(0.6);
      return shade(col, tint * (0.92 + (hash3(c.x, c.y, c.z, 13) - 0.5) * 0.16));
    });
  });
}

/** Birch: a slender white trunk banded in black under tall yellow-green clusters. */
function buildBirch(parts: THREE.BufferGeometry[], rng: SeededRandom, size: number, tall: number): void {
  const height = 4.6 * size * tall;
  const white = new THREE.Color(0xe9e4d6);
  const band = new THREE.Color(0x2b2622);
  const lean = new THREE.Vector3((rng.next() - 0.5) * 0.5 * size, height, (rng.next() - 0.5) * 0.5 * size);
  const salt = rng.next() * 100;
  addPart(parts, limb(new THREE.Vector3(), lean, 0.17 * size, 0.07 * size, 6, 7), (c) => {
    const bandy = hash3(Math.round(c.y * 3), 0, Math.round(Math.atan2(c.z, c.x) * 2), salt) > 0.72;
    return bandy ? band.clone() : shade(white, 0.78 + 0.22 * Math.min(1, c.y / height));
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
    const g = new THREE.IcosahedronGeometry(r, 0);
    g.scale(0.85, 1.45, 0.85);
    g.translate(at.x, at.y, at.z);
    jitterVertices(g, r * 0.14, 51 + i);
    addPart(parts, g, (c, nrm) => {
      const h = Math.min(1, Math.max(0, c.y / (height + r)));
      const col = low.clone().lerp(high, 0.2 + 0.5 * h + 0.3 * Math.max(0, nrm.y));
      if (nrm.y < -0.3) col.multiplyScalar(0.65);
      return shade(col, 0.92 + (hash3(c.x, c.y, c.z, 17) - 0.5) * 0.16);
    });
  }
}

// ---- Sequoia species --------------------------------------------------------

export type SequoiaTreeSpecies = 'mushroom' | 'redwood';

/** Giant mushroom: a bent, segmented stem with a skirt, a spotted lipped dome. */
function buildMushroom(parts: THREE.BufferGeometry[], rng: SeededRandom, cfg: MushroomTreeConfig): void {
  const H = cfg.stemHeight;
  const R = cfg.stemRadius;
  const bendA = rng.next() * Math.PI * 2;
  const bend = (0.15 + rng.next() * 0.35) * H * 0.3;
  const bendDir = new THREE.Vector3(Math.cos(bendA), 0, Math.sin(bendA));
  const offsetAt = (y: number) => bendDir.clone().multiplyScalar(bend * Math.pow(Math.max(0, y) / H, 2));

  const stem = new THREE.CylinderGeometry(R * 0.85, R * 1.15, H, 8, 5, true);
  stem.translate(0, H / 2, 0);
  const sp = stem.getAttribute('position');
  for (let v = 0; v < sp.count; v++) {
    const y = sp.getY(v);
    const o = offsetAt(y);
    const bulge = 1 + 0.12 * Math.sin((y / H) * Math.PI * 5);         // segmented
    const foot = y < 0.01 ? 1.5 : 1;                                     // bulb
    sp.setXYZ(v, sp.getX(v) * bulge * foot + o.x, y, sp.getZ(v) * bulge * foot + o.z);
  }
  const stemCol = new THREE.Color(0xd8cdb4);
  addPart(parts, stem, (c) => shade(stemCol, 0.6 + 0.35 * Math.min(1, c.y / H) + (hash3(c.x, c.y, c.z, 23) - 0.5) * 0.1));

  // skirt (annulus) just under the cap
  const skirtY = H * 0.72;
  const skirt = new THREE.CylinderGeometry(R * 1.05, R * 2.0, H * 0.12, 8, 1, true);
  const so = offsetAt(skirtY);
  skirt.translate(so.x, skirtY - H * 0.06, so.z);
  addPart(parts, skirt, () => shade(stemCol, 0.82));

  const palette = [0xb23a2e, 0x7a3b8f, 0x2f7f86, 0xc77a1e];
  const capCol = new THREE.Color(palette[Math.floor(rng.next() * palette.length)]);
  const spotCol = new THREE.Color(0xf3ecd6);
  const capR = cfg.capRadius;
  const capH = cfg.capHeight * (1.2 + cfg.capTaper);
  const top = offsetAt(H);
  // dome with a lip that curls down past the equator
  const cap = new THREE.SphereGeometry(capR, 12, 5, 0, Math.PI * 2, 0, Math.PI * 0.6);
  cap.scale(1, capH / capR, 1);
  cap.translate(top.x, H - capH * Math.cos(Math.PI * 0.6) * 0.0 - capH * 0.15, top.z);
  const capBase = H - capH * 0.15;
  addPart(parts, cap, (c, n) => {
    const d = c.clone().sub(new THREE.Vector3(top.x, capBase, top.z)).normalize();
    if (hash3(Math.round(d.x * 4), Math.round(d.y * 4), Math.round(d.z * 4), 29) > 0.8 && d.y > 0.2) return spotCol.clone();
    const rim = 1 - Math.max(0, d.y);
    return shade(capCol, (0.75 + 0.35 * Math.max(0, n.y)) * (1 - 0.25 * rim));
  });
  // gills: a downward-facing ring, pale with radial stripes
  const lipY = capBase + capH * Math.cos(Math.PI * 0.6);
  const gills = new THREE.RingGeometry(R * 1.1, capR * Math.sin(Math.PI * 0.6) * 0.98, 16, 1);
  gills.rotateX(Math.PI / 2);
  gills.translate(top.x, lipY + 0.04, top.z);
  const gillCol = new THREE.Color(0xe3c9a6);
  addPart(parts, gills, (c) => {
    const a = Math.atan2(c.z - top.z, c.x - top.x);
    return shade(gillCol, Math.round(a / (Math.PI / 8)) % 2 === 0 ? 0.62 : 0.48);
  });
}

/** Redwood: a massive flared red trunk under a high, narrow blue-green crown. */
function buildRedwood(parts: THREE.BufferGeometry[], rng: SeededRandom, size: number, tall: number): void {
  const H = 11 * size * tall;
  const trunk = new THREE.CylinderGeometry(0.4 * size, 0.85 * size, H, 8, 4, true);
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
    });
  }
}

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
        float directional = meshDiffuse * shadowFactor * directionalIntensity;
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
    mesh.matrixAutoUpdate = false;
    mesh.matrixWorldAutoUpdate = false;
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
function createBatchedTreeMaterial(sunDirection: THREE.Vector3, doubleSided: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      sunDirection: { value: sunDirection.clone().normalize() },
      planetCenter: { value: new THREE.Vector3() },
      improved: { value: 0 },
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
      uniform vec3 planetCenter;
      uniform float improved;
      uniform float ambientIntensity;
      uniform float directionalIntensity;

      varying vec3 vColor;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      void main() {
        vec3 surfaceNormal = normalize(vWorldPosition - planetCenter);
        float planetSunFacing = dot(surfaceNormal, sunDirection);
        float shadowFactor = smoothstep(-0.1, 0.2, planetSunFacing);
        vec3 n = normalize(vNormal);
        if (!gl_FrontFacing) n = -n;
        float meshDiffuse = max(0.0, dot(n, sunDirection));
        float directional = meshDiffuse * shadowFactor * directionalIntensity;
        vec3 finalColor = vColor * (ambientIntensity + directional);
        if (improved > 0.5) {
          // Wrap lighting (soft terminator on the canopy), sky/ground
          // hemisphere ambient, and a rim on the sun side
          float wrap = max(0.0, (dot(n, sunDirection) + 0.4) / 1.4);
          float hemi = 0.5 + 0.5 * dot(n, surfaceNormal);
          vec3 ambient = mix(vec3(0.55, 0.5, 0.45), vec3(0.75, 0.85, 1.0), hemi) * ambientIntensity * (0.6 + 0.4 * shadowFactor);
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          float rim = pow(1.0 - max(0.0, dot(n, viewDir)), 3.0) * shadowFactor * 0.35;
          finalColor = vColor * (ambient + wrap * shadowFactor * directionalIntensity) + vec3(1.0, 0.92, 0.75) * rim;
        }
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
// MUSHROOM TREE BUILDER - For alien planets like Sequoia
// ============================================================================

export interface MushroomTreeConfig {
  stemHeight: number;       // Height of mushroom stem
  stemRadius: number;       // Radius of stem
  capRadius: number;        // Radius of mushroom cap
  capHeight: number;        // Height/thickness of cap
  capTaper: number;         // 0 = flat disc, 1 = pointed cone
  species?: SequoiaTreeSpecies; // default: rolled from the seed
  seed?: number;                // default: from the tree's position
}

const DEFAULT_MUSHROOM_CONFIG: MushroomTreeConfig = {
  stemHeight: 4,
  stemRadius: 0.4,
  capRadius: 3,
  capHeight: 1.5,
  capTaper: 0.3,  // Slightly domed
};

export class MushroomTreeBuilder {
  private sunDirection: THREE.Vector3;

  constructor(sunDirection?: THREE.Vector3) {
    this.sunDirection = sunDirection?.clone().normalize() ?? new THREE.Vector3(
      PlayerConfig.SUN_DIRECTION.x,
      PlayerConfig.SUN_DIRECTION.y,
      PlayerConfig.SUN_DIRECTION.z
    ).normalize();
  }

  // Create a mushroom tree mesh at the given position with outward-pointing direction
  public createTree(
    position: THREE.Vector3,
    upDirection: THREE.Vector3,
    config: Partial<MushroomTreeConfig> = {}
  ): THREE.Group {
    const cfg = { ...DEFAULT_MUSHROOM_CONFIG, ...config };
    const tree = new THREE.Group();

    const rng = new SeededRandom(cfg.seed ?? seedFromPosition(position));
    const species: SequoiaTreeSpecies = cfg.species ?? (rng.next() < 0.35 ? 'redwood' : 'mushroom');
    const geometries: THREE.BufferGeometry[] = [];
    if (species === 'redwood') {
      const size = cfg.stemRadius / DEFAULT_MUSHROOM_CONFIG.stemRadius;
      const tall = cfg.stemHeight / (DEFAULT_MUSHROOM_CONFIG.stemHeight * Math.max(size, 0.01));
      buildRedwood(geometries, rng, size, tall);
    } else {
      buildMushroom(geometries, rng, cfg);
    }
    tree.userData.species = species;

    // Merge all geometries into one
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

// Mushroom tree manager - extends PlanetTreeManager pattern with batching
export class MushroomTreeManager {
  private trees: THREE.Group[] = [];
  private treesByTile: Map<number, THREE.Group[]> = new Map();
  private treeBuilder: MushroomTreeBuilder;
  private scene: THREE.Scene;

  private batcher: TreeBatcher;
  private sunDirection: THREE.Vector3;

  constructor(scene: THREE.Scene, sunDirection?: THREE.Vector3) {
    this.scene = scene;
    this.treeBuilder = new MushroomTreeBuilder(sunDirection);
    this.sunDirection = sunDirection?.clone().normalize() ?? new THREE.Vector3(
      PlayerConfig.SUN_DIRECTION.x,
      PlayerConfig.SUN_DIRECTION.y,
      PlayerConfig.SUN_DIRECTION.z
    ).normalize();
    this.batcher = new TreeBatcher(scene, createBatchedTreeMaterial(this.sunDirection, true));
  }

  // Place a mushroom at a specific world position
  public addTree(worldPosition: THREE.Vector3, planetCenter: THREE.Vector3, config?: Partial<MushroomTreeConfig>, tileIndex?: number): THREE.Group {
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

  // Scatter mushroom trees randomly on planet surface
  public scatterTrees(
    planetCenter: THREE.Vector3,
    _planetRadius: number,
    count: number,
    getSurfaceHeight: (direction: THREE.Vector3) => number,
    isUnderwater?: (direction: THREE.Vector3) => boolean,
    seed: number = PlayerConfig.TERRAIN_SEED,
    getTileIndex?: (direction: THREE.Vector3) => number | null,
    _getTileCenter?: (direction: THREE.Vector3) => THREE.Vector3 | null,
    removedTreeTiles?: Set<number>
  ): void {
    this.batcher.setPlanetCenter(planetCenter);
    const rng = new SeededRandom(seed + 98765);  // Different offset from regular trees

    let placed = 0;
    let attempts = 0;
    const maxAttempts = count * 10;

    while (placed < count && attempts < maxAttempts) {
      attempts++;

      // Generate random direction on sphere using seeded random
      const theta = rng.next() * Math.PI * 2;
      const phi = Math.acos(2 * rng.next() - 1);
      const direction = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta)
      ).normalize();

      // Skip if underwater
      if (isUnderwater && isUnderwater(direction)) {
        continue;
      }

      // Get tile index and skip if tree was removed from this tile
      const tileIndex = getTileIndex ? getTileIndex(direction) : null;
      if (tileIndex !== null && removedTreeTiles?.has(tileIndex)) {
        continue;
      }

      // Get surface height and place mushroom slightly above
      const surfaceHeight = getSurfaceHeight(direction);
      const treePosition = direction.clone().multiplyScalar(surfaceHeight + 0.1);
      treePosition.add(planetCenter);

      // Randomize mushroom size
      const sizeVariation = 0.6 + rng.next() * 0.8;  // 0.6 to 1.4
      const heightVariation = 0.7 + rng.next() * 0.6;  // 0.7 to 1.3
      const config: Partial<MushroomTreeConfig> = {
        stemHeight: DEFAULT_MUSHROOM_CONFIG.stemHeight * sizeVariation * heightVariation,
        stemRadius: DEFAULT_MUSHROOM_CONFIG.stemRadius * sizeVariation,
        capRadius: DEFAULT_MUSHROOM_CONFIG.capRadius * sizeVariation,
        capHeight: DEFAULT_MUSHROOM_CONFIG.capHeight * sizeVariation,
        capTaper: 0.2 + rng.next() * 0.3,  // 0.2 to 0.5 for shape variation
      };

      this.addTree(treePosition, planetCenter, config, tileIndex ?? undefined);
      placed++;
    }
  }

  // Which LOD chunks' trees are drawn (Planet.getVisibleTreeChunks())
  public updateVisibility(visibleChunks: Set<number>): void {
    this.batcher.showChunks(visibleChunks);
  }

  // Show or hide every tree (orbit view)
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

  public getTreeBuilder(): MushroomTreeBuilder {
    return this.treeBuilder;
  }
}
