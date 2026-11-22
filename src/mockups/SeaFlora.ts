import * as THREE from 'three';
import { skyLightUniforms } from '../planet/SkyLightTexture';
import { Planet } from '../planet/Planet';
import { HexTile } from '../planet/GoldbergPolyhedron';
import { PlayerConfig } from '../config/PlayerConfig';
import type { CelestialBodyConfig } from '../config/SolarSystemConfig';
import { SEA_FLORA, SEA_FLORA_SPECIES, SeaFloraLook, SeaFloraShape, SeaFloraSpecies, SeaFloraTable } from '../config/SeaFloraConfig';
import { bodyGrowsSeaFlora, planSeaTile, seabedOf } from '../planet/SeaFloraZones';

/**
 * Sea flora (openspec ocean-life 2.1): the seabed layer of GroundClutter.
 * GroundClutter walks the tiles round the player once per rebuild and hands
 * each water tile here (one scatter path for land and sea); this module
 * plans the tile's plants (src/planet/SeaFloraZones.ts, pure) and writes
 * them into one instanced mesh per species, so a sea world draws a handful
 * of draw calls (its two or three species).
 *
 * Meshes are low-poly and procedural, unit height (y 0..1 = root to tip, so
 * y is also how much the current bends a vertex), coloured from palette
 * ramps per vertex tone. They sway slower than the wind on land, tips more
 * than roots; floaters bob on the surface. Lit by the sky light table and
 * dimmed by the water above them the way the terrain shader dims the seabed.
 */

const MAX_RAMPS = 3;
const TONES = 4;

interface Layer {
  species: SeaFloraSpecies;
  look: SeaFloraLook;
  mesh: THREE.InstancedMesh;
  material: THREE.ShaderMaterial;
  surface: THREE.InstancedBufferAttribute;
  ramp: THREE.InstancedBufferAttribute;
  jitter: THREE.InstancedBufferAttribute;
  phase: THREE.InstancedBufferAttribute;
  count: number;
}

export class SeaFlora {
  private layers = new Map<SeaFloraSpecies, Layer>();
  private planet: Planet | null = null;
  private table: SeaFloraTable | null = null;
  private seed = 0;
  private readonly m = new THREE.Matrix4();
  private readonly q = new THREE.Quaternion();
  private readonly yaw = new THREE.Quaternion();
  private readonly pos = new THREE.Vector3();
  private readonly scale = new THREE.Vector3();
  private readonly Y = new THREE.Vector3(0, 1, 0);

  constructor(private scene: THREE.Scene) {}

  /** Start a rebuild on this planet (body: its config; no sea table = nothing grows). */
  public begin(planet: Planet, body: CelestialBodyConfig | undefined): void {
    this.planet = planet;
    this.table = bodyGrowsSeaFlora(body) ? body.seaFlora : null;
    this.seed = planet.getSeed();
    for (const l of this.layers.values()) l.count = 0;
  }

  /** A water tile from GroundClutter's walk (block on top = WATER). */
  public addTile(tile: HexTile, dir: THREE.Vector3): void {
    const planet = this.planet, table = this.table;
    if (!planet || !table) return;
    const ti = tile.index;
    const col = seabedOf(d => planet.getBlock(ti, d), planet.getMaxDepth());
    if (!col) return;
    const bedRadius = planet.depthToRadius(col.bed);
    const surfaceRadius = planet.depthToRadius(col.surface) - PlayerConfig.WATER_SURFACE_OFFSET;
    const plants = planSeaTile(table, ti, this.seed, [dir.x, dir.y, dir.z], col, bedRadius, surfaceRadius);
    if (!plants.length) return;
    this.q.setFromUnitVectors(this.Y, dir);
    for (const p of plants) {
      const layer = this.layer(p.species);
      if (layer.count >= SEA_FLORA.MAX_PER_SPECIES) continue;
      const v = tile.vertices[Math.min(tile.vertices.length - 1, Math.floor(p.corner * tile.vertices.length))];
      const at = tile.center.clone().lerp(v, p.spread).normalize();
      this.pos.copy(planet.center).addScaledVector(at, p.baseRadius);
      this.yaw.setFromAxisAngle(this.Y, p.yaw);
      this.scale.set(p.width, p.height, p.width);
      this.m.compose(this.pos, this.q.clone().multiply(this.yaw), this.scale);
      const i = layer.count++;
      layer.mesh.setMatrixAt(i, this.m);
      layer.surface.setX(i, surfaceRadius);
      layer.ramp.setX(i, p.ramp);
      layer.jitter.setX(i, p.jitter);
      layer.phase.setX(i, p.phase);
    }
  }

  /** Finish a rebuild: upload what was placed, hide the rest. */
  public end(): void {
    for (const l of this.layers.values()) {
      l.mesh.count = l.count;
      l.mesh.visible = l.count > 0;
      l.mesh.instanceMatrix.needsUpdate = true;
      for (const a of [l.surface, l.ramp, l.jitter, l.phase]) a.needsUpdate = true;
    }
  }

  /** Per frame: time, light and whether the camera is under water. */
  public setFrame(time: number, planet: Planet | null, sunDirection: THREE.Vector3, cameraUnderwater: boolean): void {
    for (const l of this.layers.values()) {
      if (!planet) { l.mesh.visible = false; continue; }
      l.mesh.visible = l.count > 0;
      const u = l.material.uniforms;
      u.time.value = time;
      u.sunDirection.value.copy(sunDirection);
      u.planetCenter.value.copy(planet.center);
      u.skyLight.value = planet.getSkyLight();
      u.isUnderwater.value = cameraUnderwater ? 1 : 0;
    }
  }

  /** How many plants of each species are drawn (debug / headless checks) */
  public counts(): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [sp, l] of this.layers) out[sp] = l.count;
    return out;
  }

  private layer(species: SeaFloraSpecies): Layer {
    let l = this.layers.get(species);
    if (l) return l;
    const look = SEA_FLORA_SPECIES[species];
    const geometry = buildShape(look.shape);
    const n = SEA_FLORA.MAX_PER_SPECIES;
    const attr = () => new THREE.InstancedBufferAttribute(new Float32Array(n), 1);
    const surface = attr(), ramp = attr(), jitter = attr(), phase = attr();
    geometry.setAttribute('iSurface', surface);
    geometry.setAttribute('iRamp', ramp);
    geometry.setAttribute('iJitter', jitter);
    geometry.setAttribute('iPhase', phase);
    const material = makeMaterial(look);
    const mesh = new THREE.InstancedMesh(geometry, material, n);
    mesh.count = 0;
    mesh.frustumCulled = false;
    mesh.visible = false;
    this.scene.add(mesh);
    l = { species, look, mesh, material, surface, ramp, jitter, phase, count: 0 };
    this.layers.set(species, l);
    return l;
  }
}

// ---------------------------------------------------------------------------
// Meshes: unit height, about 1 m across, flat shaded, a tone (0 dark, 1 mid,
// 2 light, 3 accent) per vertex. Light parts face up and toward the tips.

type V3 = [number, number, number];

class ShapeBuilder {
  pos: number[] = [];
  tone: number[] = [];
  private seed: number;
  constructor(seed: number) { this.seed = seed; }
  rnd(): number { return (this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0) / 4294967296; }
  tri(a: V3, b: V3, c: V3, ta: number, tb = ta, tc = ta): void {
    this.pos.push(...a, ...b, ...c);
    this.tone.push(ta, tb, tc);
  }
  quad(a: V3, b: V3, c: V3, d: V3, t0: number, t1 = t0): void {
    // a-b bottom, c-d top
    this.tri(a, b, c, t0, t0, t1);
    this.tri(a, c, d, t0, t1, t1);
  }
  /** A tapered prism along a polyline (segments let the current bend it). */
  tube(points: V3[], r0: number, r1: number, sides: number, tones: number[]): void {
    const ring = (p: V3, next: V3, r: number): V3[] => {
      const ax = norm(sub(next, p));
      const ref: V3 = Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
      const u = norm(cross(ax, ref)), v = cross(ax, u);
      const out: V3[] = [];
      for (let s = 0; s < sides; s++) {
        const a = (s / sides) * Math.PI * 2;
        out.push(add(p, add(scl(u, Math.cos(a) * r), scl(v, Math.sin(a) * r))));
      }
      return out;
    };
    const rings: V3[][] = [];
    for (let i = 0; i < points.length; i++) {
      const k = i / (points.length - 1);
      const p = points[i], next = points[Math.min(i + 1, points.length - 1)], prev = points[Math.max(i - 1, 0)];
      rings.push(ring(p, i < points.length - 1 ? next : add(p, sub(p, prev)), r0 + (r1 - r0) * k));
    }
    for (let i = 0; i + 1 < rings.length; i++) {
      const t0 = tones[Math.min(i, tones.length - 1)], t1 = tones[Math.min(i + 1, tones.length - 1)];
      for (let s = 0; s < sides; s++) {
        const s2 = (s + 1) % sides;
        this.quad(rings[i][s], rings[i][s2], rings[i + 1][s2], rings[i + 1][s], t0, t1);
      }
    }
    // cap the tip
    const last = rings[rings.length - 1], tip = points[points.length - 1], tt = tones[tones.length - 1];
    for (let s = 0; s < sides; s++) this.tri(last[s], last[(s + 1) % sides], tip, tt);
  }
  /** A flat tapering strip (a blade or frond) from root along a polyline, `w` wide across `side`. */
  strip(points: V3[], side: V3, w0: number, w1: number, tones: number[]): void {
    for (let i = 0; i + 1 < points.length; i++) {
      const k0 = i / (points.length - 1), k1 = (i + 1) / (points.length - 1);
      const h0 = (w0 + (w1 - w0) * k0) / 2, h1 = (w0 + (w1 - w0) * k1) / 2;
      const a = points[i], b = points[i + 1];
      const t0 = tones[Math.min(i, tones.length - 1)], t1 = tones[Math.min(i + 1, tones.length - 1)];
      this.quad(add(a, scl(side, -h0)), add(a, scl(side, h0)), add(b, scl(side, h1)), add(b, scl(side, -h1)), t0, t1);
    }
  }
  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('aTone', new THREE.Float32BufferAttribute(this.tone, 1));
    g.computeVertexNormals(); // non-indexed: flat shaded
    return g;
  }
}

const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const scl = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const polar = (a: number, r: number, y: number): V3 => [Math.cos(a) * r, y, Math.sin(a) * r];
/** Points from a to b, bowed out by `bow` along `dir` at the middle */
const arc = (a: V3, b: V3, n: number, bow: V3 = [0, 0, 0]): V3[] =>
  Array.from({ length: n + 1 }, (_, i) => { const k = i / n; return add(add(a, scl(sub(b, a), k)), scl(bow, Math.sin(k * Math.PI))); });

function buildShape(shape: SeaFloraShape): THREE.BufferGeometry {
  const b = new ShapeBuilder(0x51f15e);
  switch (shape) {
    case 'branchcoral': {
      // A low lumpy base and branching arms, each forking once, light tips
      b.tube([[0, 0, 0], [0, 0.14, 0]], 0.26, 0.2, 6, [0, 1]);
      const arms = 7;
      for (let i = 0; i < arms; i++) {
        const a = (i / arms) * Math.PI * 2 + b.rnd() * 0.5;
        const r = 0.08 + b.rnd() * 0.1;
        const root = polar(a, r, 0.12), tip = polar(a, r + 0.12 + b.rnd() * 0.18, 0.7 + b.rnd() * 0.3);
        const mid = add(root, scl(sub(tip, root), 0.5));
        b.tube(arc(root, tip, 3), 0.06, 0.035, 4, [1, 1, 2, 3]);
        const fork = polar(a + (b.rnd() - 0.5) * 1.6, r + 0.25 + b.rnd() * 0.12, 0.55 + b.rnd() * 0.25);
        b.tube(arc(mid, fork, 2), 0.04, 0.03, 4, [1, 2, 3]);
      }
      break;
    }
    case 'kelp': {
      // A holdfast and three stipes to the top, wide blades floating up
      // from each node (a gas bladder at the root), a canopy at the tip
      b.tube([[0, 0, 0], [0, 0.03, 0]], 0.14, 0.08, 5, [0]);
      const segs = 10;
      for (let k = 0; k < 3; k++) {
        const ka = k * 2.1 + b.rnd() * 0.5, kr = 0.06 + b.rnd() * 0.08, top = 0.85 + k * 0.07;
        const stipe: V3[] = Array.from({ length: segs + 1 }, (_, i) => {
          const y = (i / segs) * top;
          return [Math.cos(ka) * kr * (0.3 + y) + Math.sin(i * 0.9 + k) * 0.03, y, Math.sin(ka) * kr * (0.3 + y) + Math.cos(i * 0.7 + k) * 0.03];
        });
        b.tube(stipe, 0.022, 0.014, 3, [0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 2]);
        for (let i = 1; i <= segs; i++) {
          const root = stipe[i], a = i * 2.4 + k;
          const out = add(root, polar(a, 0.2 + b.rnd() * 0.1, 0.07 + b.rnd() * 0.04));
          const side = norm(cross(sub(out, root), [0, 1, 0]));
          b.strip(arc(root, out, 3, [0, 0.015, 0]), side, 0.05, 0.13, [1, 2, 2, 2]);
          b.tube([root, add(root, [0, 0.025, 0])], 0.028, 0.02, 4, [3]);
        }
      }
      break;
    }
    case 'blades': {
      // Seagrass: a clump of long, flat, leaning blades
      const n = 9;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + b.rnd();
        const root = polar(a, 0.05 + b.rnd() * 0.18, 0);
        const tip = add(root, polar(a, 0.1 + b.rnd() * 0.12, 0.6 + b.rnd() * 0.4));
        const side = norm(cross(sub(tip, root), [0, 1, 0]));
        b.strip(arc(root, tip, 3), side, 0.06, 0.02, [0, 1, 2, 2]);
      }
      break;
    }
    case 'anemone': {
      // A stout column, a ring of tentacles; the tips are the accent that glows
      b.tube([[0, 0, 0], [0, 0.22, 0], [0, 0.4, 0]], 0.18, 0.22, 7, [0, 1, 1]);
      const n = 14;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const ring = i % 2 ? 0.16 : 0.1;
        const root = polar(a, ring, 0.38), tip = polar(a, ring + 0.18 + b.rnd() * 0.1, 0.8 + b.rnd() * 0.2);
        b.tube(arc(root, tip, 3, polar(a, 0.05, 0.05)), 0.03, 0.014, 4, [1, 2, 2, 3]);
      }
      break;
    }
    case 'fan': {
      // A short stalk and a flat fan of ribs with webbing between, rim in the accent
      b.tube([[0, 0, 0], [0, 0.16, 0]], 0.04, 0.03, 4, [0, 1]);
      const ribs = 9;
      const tips: V3[] = [];
      for (let i = 0; i < ribs; i++) {
        const a = Math.PI * (0.12 + 0.76 * (i / (ribs - 1)));
        tips.push([Math.cos(a) * 0.48, 0.16 + Math.sin(a) * 0.84, (b.rnd() - 0.5) * 0.04]);
      }
      const hub: V3 = [0, 0.16, 0];
      for (let i = 0; i < ribs; i++) {
        b.tube(arc(hub, tips[i], 3), 0.018, 0.01, 3, [1, 2, 2, 3]);
        if (i + 1 < ribs) {
          const mA = add(hub, scl(sub(tips[i], hub), 0.55)), mB = add(hub, scl(sub(tips[i + 1], hub), 0.55));
          b.tri(hub, mA, mB, 1);
          b.quad(mA, mB, tips[i + 1], tips[i], 1, 2);
        }
      }
      break;
    }
    case 'reeds': {
      // A bed of thin upright stems, a few with a seed head in the accent
      const n = 11;
      for (let i = 0; i < n; i++) {
        const a = b.rnd() * Math.PI * 2;
        const root = polar(a, b.rnd() * 0.32, 0);
        const h = 0.55 + b.rnd() * 0.45;
        const tip = add(root, polar(a, 0.05, h));
        const head = i % 3 === 0;
        b.tube(arc(root, tip, 4), 0.022, 0.012, 3, head ? [0, 1, 2, 2, 3] : [0, 1, 1, 2, 2]);
      }
      break;
    }
    case 'lilypad': {
      // Three round pads lying flat, notched, and one flower
      const pads: [number, number, number][] = [[0, 0, 0.26], [0.32, 0.18, 0.18], [-0.22, 0.3, 0.15]];
      for (const [x, z, r] of pads) {
        const n = 10, notch = b.rnd() * Math.PI * 2;
        for (let s = 0; s < n; s++) {
          if (s === 0) continue; // the notch
          const a0 = notch + (s / n) * Math.PI * 2, a1 = notch + ((s + 1) / n) * Math.PI * 2;
          // top-left half one tone up
          const lit = Math.cos(a0 - Math.PI * 0.75) > 0 ? 2 : 1;
          b.tri([x, 0.01, z], [x + Math.cos(a1) * r, 0, z + Math.sin(a1) * r], [x + Math.cos(a0) * r, 0, z + Math.sin(a0) * r], lit);
        }
      }
      for (let p = 0; p < 6; p++) {
        const a = (p / 6) * Math.PI * 2;
        b.tri([0.32, 0.02, 0.18], add([0.32, 0.02, 0.18], polar(a - 0.35, 0.07, 0.07)), add([0.32, 0.02, 0.18], polar(a + 0.35, 0.07, 0.07)), 3);
      }
      break;
    }
    case 'weed': {
      // Tangled strands that kink as they rise, small leaves at the kinks
      const n = 6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + b.rnd();
        let p: V3 = polar(a, 0.05 + b.rnd() * 0.15, 0);
        const pts: V3[] = [p];
        const steps = 5, h = 0.7 + b.rnd() * 0.3;
        for (let s = 1; s <= steps; s++) {
          p = [p[0] + (b.rnd() - 0.5) * 0.16, (s / steps) * h, p[2] + (b.rnd() - 0.5) * 0.16];
          pts.push(p);
          const leaf = add(p, polar(a + s * 1.9, 0.12, -0.04));
          b.tri(p, leaf, add(p, [0, 0.06, 0]), s === steps ? 3 : 2);
        }
        b.tube(pts, 0.022, 0.012, 3, [0, 0, 1, 1, 1, 2]);
      }
      break;
    }
    case 'bladderwort': {
      // A flat mat of fine fronds (y ~0), flower stalks up to the surface (y 1)
      const n = 12;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + b.rnd() * 0.4;
        const tip = polar(a, 0.3 + b.rnd() * 0.2, -0.05 - b.rnd() * 0.08);
        b.strip(arc([0, 0, 0], tip, 3, [0, 0.04, 0]), norm(cross(tip, [0, 1, 0])), 0.05, 0.015, [1, 2, 2, 1]);
      }
      for (let f = 0; f < 3; f++) {
        const base = polar(f * 2.1, 0.12, 0), top: V3 = [base[0] * 1.3, 0.92, base[2] * 1.3];
        b.tube([base, top], 0.012, 0.01, 3, [1, 1]);
        b.tube([top, add(top, [0, 0.08, 0])], 0.045, 0.02, 4, [3]);
      }
      break;
    }
  }
  return b.build();
}

// ---------------------------------------------------------------------------

function makeMaterial(look: SeaFloraLook): THREE.ShaderMaterial {
  const ramps: THREE.Color[] = [];
  for (let r = 0; r < MAX_RAMPS; r++) {
    const ramp = look.ramps[Math.min(r, look.ramps.length - 1)];
    for (let t = 0; t < TONES; t++) ramps.push(new THREE.Color(ramp[t]));
  }
  const S = SEA_FLORA;
  const f = (n: number) => n.toFixed(4);
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      sunDirection: { value: new THREE.Vector3(1, 0, 0) },
      planetCenter: { value: new THREE.Vector3() },
      ramps: { value: ramps },
      swayAmp: { value: look.sway },
      swaySpeed: { value: look.swaySpeed },
      bobAmp: { value: look.float?.bob ?? 0 },
      bobSpeed: { value: look.float?.bobSpeed ?? 0 },
      currentAxis: { value: new THREE.Vector3(...S.CURRENT_AXIS).normalize() },
      glowColor: { value: new THREE.Color(look.glow ?? '#000000') },
      underwaterDimming: { value: PlayerConfig.UNDERWATER_TERRAIN_DIMMING },
      fogColor: { value: new THREE.Color(PlayerConfig.UNDERWATER_FOG_COLOR) },
      fogNear: { value: PlayerConfig.UNDERWATER_FOG_NEAR },
      fogFar: { value: PlayerConfig.UNDERWATER_FOG_FAR },
      isUnderwater: { value: 0 },
      ...skyLightUniforms(),
    },
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute float aTone;
      attribute float iSurface;
      attribute float iRamp;
      attribute float iJitter;
      attribute float iPhase;
      uniform float time;
      uniform float swayAmp;
      uniform float swaySpeed;
      uniform float bobAmp;
      uniform float bobSpeed;
      uniform vec3 currentAxis;
      uniform vec3 planetCenter;
      uniform vec3 ramps[${MAX_RAMPS * TONES}];
      varying vec3 vColor;
      varying float vGlow;
      varying vec3 vNormal;
      varying vec3 vWorld;
      varying float vSurface;
      void main() {
        int tone = int(aTone + 0.5);
        vColor = ramps[int(iRamp + 0.5) * ${TONES} + tone] * iJitter;
        vGlow = tone == ${TONES - 1} ? 1.0 : 0.0;
        vSurface = iSurface;
        mat3 m = mat3(instanceMatrix);
        vec3 base = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vec3 up = normalize(base - planetCenter);
        // The current: a slow lean along one axis and a faster wobble across
        // it, scaled by the plant's height, the tip moving most
        float h = length(m[1]);
        float bend = clamp(position.y, 0.0, 1.0);
        vec3 along = normalize(cross(currentAxis, up));
        vec3 across = cross(up, along);
        float ph = iPhase + dot(base, vec3(0.13, 0.11, 0.17));
        float sway = swayAmp * h * bend * bend;
        w.xyz += (along * sin(time * swaySpeed + ph)
          + across * ${f(S.WOBBLE)} * sin(time * swaySpeed * ${f(S.WOBBLE_SPEED)} + ph * 1.7)) * sway;
        // Floaters bob down from their rest, never above it
        w.xyz += up * (sin(time * bobSpeed + ph) * 0.5 - 0.5) * bobAmp;
        // Normals through the inverse-transpose of a rotate-scale matrix
        vec3 s2 = vec3(dot(m[0], m[0]), dot(m[1], m[1]), dot(m[2], m[2]));
        vNormal = normalize(mat3(modelMatrix) * (m * (normal / s2)));
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 sunDirection;
      uniform vec3 planetCenter;
      uniform vec3 glowColor;
      uniform float underwaterDimming;
      uniform vec3 fogColor;
      uniform float fogNear;
      uniform float fogFar;
      uniform float isUnderwater;
      varying vec3 vColor;
      varying float vGlow;
      varying vec3 vNormal;
      varying vec3 vWorld;
      varying float vSurface;
      #include <tenebris_sky_light>
      void main() {
        vec3 n = normalize(vNormal);
        if (!gl_FrontFacing) n = -n;
        vec3 up = normalize(vWorld - planetCenter);
        // The terrain's sky light (openspec sky-lighting), as ground clutter
        float facing = dot(up, sunDirection);
        vec3 ambient = ${f(PlayerConfig.AMBIENT_LIGHT_INTENSITY)} * skyFill(facing);
        float diff = max(0.0, dot(n, sunDirection));
        vec3 c = vColor * (ambient + ${f(S.DIFFUSE)} * diff * skySun(facing));
        // Dimmed by the water above it, the terrain shader's way
        float depth = max(0.0, vSurface - length(vWorld - planetCenter));
        if (depth > 0.0) {
          float dim = exp(-depth * underwaterDimming);
          c *= dim;
          c = mix(c, fogColor * dim, (1.0 - dim) * 0.5);
        }
        // Glowing tips: added after the dimming (they make their own light), strong at night
        float night = 1.0 - smoothstep(${f(S.GLOW_NIGHT_E)}, ${f(S.GLOW_DAY_E)}, facing);
        c += glowColor * vGlow * mix(${f(S.GLOW_DAY)}, ${f(S.GLOW_NIGHT)}, night);
        if (isUnderwater > 0.5) {
          float fog = clamp((distance(cameraPosition, vWorld) - fogNear) / (fogFar - fogNear), 0.0, 1.0);
          c = mix(c, fogColor, fog);
        }
        gl_FragColor = vec4(c, 1.0);
      }
    `,
  });
}
