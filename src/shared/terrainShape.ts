// The shape of a planet's surface: the noise height field every planet is
// generated from, plus the landforms some bodies add on top of it (volcano
// cones with a crater). One code path for the terrain worker (which builds
// the blocks) and the main thread (far LODs, surface height lookups), so the
// two can never disagree about where the ground is.
// Pure functions, no THREE.js: used by web workers too.

import { Vec3 } from './vec3';

export interface ShapeParams {
  seed: number;
  maxDepth: number;
  seaLevel: number;
  maxHeight: number;
  heightVariation: number;
  continentScale: number;
  mountainScale: number;
  hillScale: number;
  detailScale: number;
  continentWeight: number;
  mountainHeight: number;
  hillWeight: number;
  detailWeight: number;
  oceanDepthPower: number;
  terrainMaxDepth: number;
  // Volcano cones on this body (0 / unset = none)
  volcanoes?: number;
  // Lowers the whole height field before land and sea are split (0 / unset
  // = Earth's split): an ocean world floods all but its highest ground,
  // leaving scattered islands (Thalassa)
  seaBias?: number;
  // Body radius in metres (sizes the cones)
  radius?: number;
  // Unit direction of the spawn point: the first cone stands just beyond it,
  // so a landing party sees a volcano on the skyline
  spawnDir?: Vec3;
}

// ============ NOISE ============

export function hash3D(x: number, y: number, z: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177 + seed) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return h ^ (h >> 16);
}

const GRADIENTS = [
  [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
  [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
  [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
  [1, 1, 0], [-1, 1, 0], [0, -1, 1], [0, -1, -1]
];

function grad3D(ix: number, iy: number, iz: number, x: number, y: number, z: number, seed: number): number {
  const g = GRADIENTS[hash3D(ix, iy, iz, seed) & 15];
  return g[0] * x + g[1] * y + g[2] * z;
}

// Simplex 3D noise (Stefan Gustavson), in [-1, 1]
export function simplex3D(x: number, y: number, z: number, seed: number): number {
  const F3 = 1.0 / 3.0;
  const G3 = 1.0 / 6.0;

  x += seed * 0.1;
  y += seed * 0.13;
  z += seed * 0.17;

  const s = (x + y + z) * F3;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);
  const k = Math.floor(z + s);

  const t = (i + j + k) * G3;
  const x0 = x - (i - t);
  const y0 = y - (j - t);
  const z0 = z - (k - t);

  let i1: number, j1: number, k1: number;
  let i2: number, j2: number, k2: number;
  if (x0 >= y0) {
    if (y0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
    else if (x0 >= z0) { i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1; }
    else { i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1; }
  } else {
    if (y0 < z0) { i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1; }
    else if (x0 < z0) { i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1; }
    else { i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0; }
  }

  const x1 = x0 - i1 + G3, y1 = y0 - j1 + G3, z1 = z0 - k1 + G3;
  const x2 = x0 - i2 + 2.0 * G3, y2 = y0 - j2 + 2.0 * G3, z2 = z0 - k2 + 2.0 * G3;
  const x3 = x0 - 1.0 + 3.0 * G3, y3 = y0 - 1.0 + 3.0 * G3, z3 = z0 - 1.0 + 3.0 * G3;

  let n0 = 0, n1 = 0, n2 = 0, n3 = 0;
  let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
  if (t0 >= 0) { t0 *= t0; n0 = t0 * t0 * grad3D(i, j, k, x0, y0, z0, seed); }
  let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
  if (t1 >= 0) { t1 *= t1; n1 = t1 * t1 * grad3D(i + i1, j + j1, k + k1, x1, y1, z1, seed); }
  let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
  if (t2 >= 0) { t2 *= t2; n2 = t2 * t2 * grad3D(i + i2, j + j2, k + k2, x2, y2, z2, seed); }
  let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
  if (t3 >= 0) { t3 *= t3; n3 = t3 * t3 * grad3D(i + 1, j + 1, k + 1, x3, y3, z3, seed); }

  return 32.0 * (n0 + n1 + n2 + n3);
}

export function fractalSimplex3D(
  x: number, y: number, z: number,
  period: number, octaves: number, persistence: number, lacunarity: number, seed: number
): number {
  let value = 0, amplitude = 1, frequency = period, maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    value += simplex3D(x * frequency, y * frequency, z * frequency, seed) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  return value / maxValue;
}

// Ridge noise for mountain ranges (inverted absolute value: sharp peaks)
export function ridgeSimplex3D(
  x: number, y: number, z: number,
  period: number, octaves: number, persistence: number, lacunarity: number, seed: number
): number {
  let value = 0, amplitude = 1, frequency = period, maxValue = 0;
  for (let i = 0; i < octaves; i++) {
    const ridge = 1.0 - Math.abs(simplex3D(x * frequency, y * frequency, z * frequency, seed));
    value += ridge * ridge * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }
  return value / maxValue;
}

// ============ VOLCANOES ============

// Where a column sits on a volcano: outside it, on its outer flanks, its
// steep upper slopes, the crater rim, or the crater floor
export const VOLCANO_NONE = 0;
export const VOLCANO_FLANK = 1;
export const VOLCANO_SLOPE = 2;
export const VOLCANO_RIM = 3;
export const VOLCANO_CRATER = 4;

// Cone size: metres across the base (as a share of the body's radius,
// clamped so a big moon's cones stay walkable and a small one's readable),
// height in blocks, crater as a share of the cone
const CONE_RADIUS_SHARE = 0.35;
const CONE_RADIUS_MIN_M = 7;
const CONE_RADIUS_MAX_M = 24;
const CONE_HEIGHT_SHARE = 0.2;
const CONE_HEIGHT_MIN = 4;
const CONE_HEIGHT_MAX = 12;
const CONE_PROFILE = 1.4;         // >1: concave flanks steepening to the summit
const CRATER_SHARE = 0.32;
const CRATER_DEPTH_SHARE = 0.5;
const SPAWN_CONE_OFFSET = 1.6;    // the spawn cone's centre, in cone radii from spawn

interface Volcanoes {
  sites: Vec3[];
  angularRadius: number;  // radians
  height: number;          // blocks
}

const volcanoCache = new Map<string, Volcanoes>();

function getVolcanoes(p: ShapeParams): Volcanoes | null {
  const count = p.volcanoes ?? 0;
  if (count <= 0 || !p.radius) return null;
  const s = p.spawnDir;
  const key = `${p.seed}|${count}|${p.radius}|${s ? `${s.x},${s.y},${s.z}` : ''}`;
  const cached = volcanoCache.get(key);
  if (cached) return cached;

  const coneM = Math.min(CONE_RADIUS_MAX_M, Math.max(CONE_RADIUS_MIN_M, p.radius * CONE_RADIUS_SHARE));
  const angularRadius = coneM / p.radius;
  const height = Math.round(Math.min(CONE_HEIGHT_MAX, Math.max(CONE_HEIGHT_MIN, p.radius * CONE_HEIGHT_SHARE)));
  const sites: Vec3[] = [];
  const minSep = angularRadius * 2.2;
  const farEnough = (d: Vec3) => sites.every(o => Math.acos(Math.max(-1, Math.min(1, d.x * o.x + d.y * o.y + d.z * o.z))) > minSep);

  if (s) {
    // Swing the spawn direction sideways (about the polar axis, or any
    // axis when spawn sits on a pole) by SPAWN_CONE_OFFSET cone radii
    let ax = -s.z, ay = 0, az = s.x;
    let al = Math.hypot(ax, ay, az);
    if (al < 1e-3) { ax = 1; ay = 0; az = 0; al = 1; }
    ax /= al; ay /= al; az /= al;
    const a = angularRadius * SPAWN_CONE_OFFSET;
    // Rodrigues rotation of s about the (unit) axis
    const c = Math.cos(a), sn = Math.sin(a);
    const dot = ax * s.x + ay * s.y + az * s.z;
    const cx = ay * s.z - az * s.y, cy = az * s.x - ax * s.z, cz = ax * s.y - ay * s.x;
    sites.push({
      x: s.x * c + cx * sn + ax * dot * (1 - c),
      y: s.y * c + cy * sn + ay * dot * (1 - c),
      z: s.z * c + cz * sn + az * dot * (1 - c),
    });
  }
  for (let attempt = 0; sites.length < count && attempt < count * 40; attempt++) {
    const u = ((hash3D(attempt, 17, 31, p.seed) >>> 0) % 100000) / 100000;
    const v = ((hash3D(attempt, 53, 97, p.seed) >>> 0) % 100000) / 100000;
    const z = 2 * u - 1;
    const r = Math.sqrt(Math.max(0, 1 - z * z));
    const phi = 2 * Math.PI * v;
    const d = { x: r * Math.cos(phi), y: z, z: r * Math.sin(phi) };
    if (farEnough(d)) sites.push(d);
  }
  const result = { sites, angularRadius, height };
  volcanoCache.set(key, result);
  return result;
}

/** Which part of a volcano (if any) a unit direction lies on, and how many
 *  blocks the cone lifts the ground there. */
export function volcanoAt(dx: number, dy: number, dz: number, p: ShapeParams): { zone: number; lift: number } {
  const v = getVolcanoes(p);
  if (!v) return { zone: VOLCANO_NONE, lift: 0 };
  let best = Infinity;
  for (const o of v.sites) {
    const a = Math.acos(Math.max(-1, Math.min(1, dx * o.x + dy * o.y + dz * o.z)));
    if (a < best) best = a;
  }
  const R = v.angularRadius;
  if (best >= R) return { zone: VOLCANO_NONE, lift: 0 };
  const craterR = R * CRATER_SHARE;
  if (best < craterR) {
    const rim = v.height * Math.pow(1 - CRATER_SHARE, CONE_PROFILE);
    const f = best / craterR;
    const lift = rim - v.height * CRATER_DEPTH_SHARE * (1 - f * f * f);
    return { zone: f < 0.8 ? VOLCANO_CRATER : VOLCANO_RIM, lift };
  }
  const lift = v.height * Math.pow(1 - best / R, CONE_PROFILE);
  if (best < craterR * 1.3) return { zone: VOLCANO_RIM, lift };
  return { zone: best < R * 0.6 ? VOLCANO_SLOPE : VOLCANO_FLANK, lift };
}

// ============ HEIGHT ============

/** Surface depth (0 = bedrock, maxDepth - 1 = sky) of the column under a
 *  tile centre (any length; only its direction matters). */
export function surfaceDepthAt(center: Vec3, p: ShapeParams): number {
  const variation = p.heightVariation;
  const len = Math.sqrt(center.x * center.x + center.y * center.y + center.z * center.z);
  const dirX = center.x / len;
  const dirY = center.y / len;
  const dirZ = center.z / len;

  // Layer 1: continental base
  const continentNoise = fractalSimplex3D(dirX, dirY, dirZ, p.continentScale, 6, 0.5, 2.0, p.seed);
  const continentValue = Math.sign(continentNoise) * Math.pow(Math.abs(continentNoise), 0.8);

  // Layer 2: mountain ridges, on land only
  const mountainNoise = ridgeSimplex3D(dirX, dirY, dirZ, p.mountainScale, 4, 0.5, 2.2, p.seed);
  const landFactor = Math.max(0, continentValue);
  const mountainHeight = mountainNoise * landFactor * p.mountainHeight;

  // Layers 3 and 4: hills and surface detail
  const hillNoise = fractalSimplex3D(dirX, dirY, dirZ, p.hillScale, 3, 0.5, 2.0, p.seed);
  const detailNoise = fractalSimplex3D(dirX, dirY, dirZ, p.detailScale, 2, 0.5, 2.0, p.seed);

  let height = continentValue * p.continentWeight;
  height += mountainHeight;
  height += hillNoise * p.hillWeight * (landFactor > 0.1 ? 1.0 : 0.3);
  height += detailNoise * p.detailWeight;
  height -= p.seaBias ?? 0;

  // Height to depth: land rises from sea level, ocean floors sink below it
  const SEA_LEVEL_DEPTH = p.maxDepth - 1 - p.seaLevel;
  let depth: number;
  if (height >= 0) {
    depth = SEA_LEVEL_DEPTH + height * p.maxHeight * variation;
  } else {
    const oceanFactor = Math.pow(Math.abs(height), p.oceanDepthPower);
    depth = SEA_LEVEL_DEPTH - oceanFactor * p.terrainMaxDepth * variation;
  }

  if (p.volcanoes) depth += volcanoAt(dirX, dirY, dirZ, p).lift;

  return Math.max(0, Math.min(p.maxDepth - 1, Math.round(depth)));
}
