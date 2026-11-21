// City generator for ecumenopolis planets (a world covered entirely in city).
// Pure functions of a direction on the unit sphere, shared by the terrain
// worker (the real columns), the main-thread fallback generator, and the
// planet's LOD meshes (heights + colours from orbit) - one code path, so the
// LOD skyline is the same city the player walks through.
//
// Layout: the sphere is split into the six faces of a cube (equal-angle
// projection, so cells stay near-square). Each face carries a Manhattan grid
// of streets; every Nth street is a wider avenue, and the cube edges are
// boulevards. Between streets sit city blocks ringed by sidewalk, each block
// cut into 1-3 x 1-3 lots. A lot is a building (style and height from a
// low-frequency district field: glass downtown towers, mid-rise, low-rise
// with neon storefronts, industrial sheds), or now and then a park or plaza.
// Tall buildings step back from their lot edge in tiers.

import { HexBlockType } from './blockTypes';

/** Per-planet city tunables (values live in SolarSystemConfig). */
export interface CityConfig {
  /** Street centre-line spacing, in tiles */
  blockPitch: number;
  /** Street width, in tiles */
  streetWidth: number;
  /** Every Nth street line is an avenue */
  avenueEvery: number;
  /** Avenue (and cube-edge boulevard) width, in tiles */
  avenueWidth: number;
  /** Sidewalk ring around each block, in tiles */
  sidewalkWidth: number;
  /** Frequency of the district field on the unit sphere (low = big districts) */
  districtScale: number;
  /** District thresholds (0-1): above downtown = glass towers, above midrise = mid-rise,
   *  above lowrise = low-rise, below = industrial */
  downtown: number;
  midrise: number;
  lowrise: number;
  /** Floor ranges [min, max] per style (clamped to the air the column has) */
  towerFloors: [number, number];
  midriseFloors: [number, number];
  lowriseFloors: [number, number];
  industrialFloors: [number, number];
  /** Chance a lot is a park / a plaza instead of a building */
  parkChance: number;
  plazaChance: number;
  /** Tall buildings: tiles from the lot edge per setback tier, and the height kept per tier */
  setbackTiles: number;
  setbackKeep: number;
  /** A building this tall or more gets a neon crown under its roof */
  crownFloors: number;
  /** Chance a low/mid-rise has a neon storefront on its ground floor */
  storefrontChance: number;
  /** Far-LOD colour (hex) and night glow (0-1, city lights) per kind;
   *  the *Alt entries are every other lot, `wall` is building sides */
  lodPalette: Record<CityLodKey, [string, number]>;
}

export type CityLodKey = 'road' | 'sidewalk' | 'plaza' | 'park' | 'tower' | 'towerAlt' | 'midrise' | 'midriseAlt'
  | 'lowrise' | 'lowriseAlt' | 'industrial' | 'industrialAlt' | 'wall';

export enum CityKind {
  ROAD = 0,
  SIDEWALK = 1,
  PLAZA = 2,
  PARK = 3,
  TOWER = 4,       // glass downtown tower
  MIDRISE = 5,
  LOWRISE = 6,
  INDUSTRIAL = 7,
}

export interface CitySample {
  kind: CityKind;
  /** Floors of building above the ground block (0 for streets, parks, plazas) */
  floors: number;
  /** District value 0-1 (industrial .. downtown) */
  district: number;
  /** Per-lot random 0-1 (crowns, storefronts, colour variation) */
  lotRoll: number;
}

// ---- hashing / noise (deterministic, seedable) ----

function hashInts(a: number, b: number, c: number, d: number, seed: number): number {
  let h = (seed ^ 0x9e3779b9) | 0;
  h = Math.imul(h ^ (a | 0), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13) ^ (b | 0), 0xc2b2ae35);
  h = Math.imul(h ^ (h >>> 16) ^ (c | 0), 0x27d4eb2f);
  h = Math.imul(h ^ (h >>> 15) ^ (d | 0), 0x165667b1);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

function valueNoise3(x: number, y: number, z: number, seed: number): number {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
  const fx = x - ix, fy = y - iy, fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), sz = fz * fz * (3 - 2 * fz);
  const v = (dx: number, dy: number, dz: number) => hashInts(ix + dx, iy + dy, iz + dz, 0, seed);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const x00 = lerp(v(0, 0, 0), v(1, 0, 0), sx), x10 = lerp(v(0, 1, 0), v(1, 1, 0), sx);
  const x01 = lerp(v(0, 0, 1), v(1, 0, 1), sx), x11 = lerp(v(0, 1, 1), v(1, 1, 1), sx);
  return lerp(lerp(x00, x10, sy), lerp(x01, x11, sy), sz) * 2 - 1;
}

function districtField(x: number, y: number, z: number, scale: number, seed: number): number {
  let sum = 0, amp = 1, norm = 0, f = scale;
  for (let o = 0; o < 3; o++) {
    sum += valueNoise3(x * f, y * f, z * f, seed + o * 7919) * amp;
    norm += amp; amp *= 0.5; f *= 2.03;
  }
  return Math.max(0, Math.min(1, 0.5 + 0.9 * (sum / norm)));
}

const QUARTER_PI = Math.PI / 4;

/**
 * Sample the city at a unit direction. `tileAngle` is the angular size of
 * one terrain tile of the planet (radians), so street widths are in tiles
 * whatever mesh is sampling (detailed columns or a coarse LOD sphere).
 */
export function sampleCity(x: number, y: number, z: number, seed: number, cfg: CityConfig, tileAngle: number): CitySample {
  const len = Math.hypot(x, y, z) || 1;
  x /= len; y /= len; z /= len;
  const district = districtField(x, y, z, cfg.districtScale, seed + 31);

  // Cube face + equal-angle face coordinates in [0, 1]
  const ax = Math.abs(x), ay = Math.abs(y), az = Math.abs(z);
  let face: number, u: number, v: number;
  if (ax >= ay && ax >= az) { face = x > 0 ? 0 : 1; u = z / ax; v = y / ax; }
  else if (ay >= az) { face = y > 0 ? 2 : 3; u = x / ay; v = z / ay; }
  else { face = z > 0 ? 4 : 5; u = x / az; v = y / az; }
  const faceTiles = (Math.PI / 2) / tileAngle;
  const blocks = Math.max(1, Math.round(faceTiles / cfg.blockPitch));
  const pitch = faceTiles / blocks;
  const gu = (Math.atan(u) / QUARTER_PI + 1) * 0.5 * faceTiles;
  const gv = (Math.atan(v) / QUARTER_PI + 1) * 0.5 * faceTiles;

  const lineHalf = (line: number) =>
    (line === 0 || line === blocks || line % cfg.avenueEvery === 0 ? cfg.avenueWidth : cfg.streetWidth) * 0.5;

  // Per axis: cell index, distance into the block interior, interior size
  const axis = (g: number) => {
    const cell = Math.min(blocks - 1, Math.floor(g / pitch));
    const f = g - cell * pitch;
    const lo = lineHalf(cell), hi = lineHalf(cell + 1);
    const dEdge = Math.min(f - lo, pitch - f - hi);           // < 0 = in the street
    const inner0 = lo + cfg.sidewalkWidth;
    const innerSize = pitch - inner0 - hi - cfg.sidewalkWidth;
    return { cell, dEdge, local: f - inner0, innerSize };
  };
  const au = axis(gu), av = axis(gv);

  const base = { district, floors: 0, lotRoll: 0 };
  if (au.dEdge < 0 || av.dEdge < 0) return { ...base, kind: CityKind.ROAD };
  if (au.dEdge < cfg.sidewalkWidth || av.dEdge < cfg.sidewalkWidth) return { ...base, kind: CityKind.SIDEWALK };

  // Block -> lots
  const blockRoll = hashInts(face, au.cell, av.cell, 1, seed);
  const splitsU = 1 + Math.floor(blockRoll * 3);
  const splitsV = 1 + Math.floor(hashInts(face, au.cell, av.cell, 2, seed) * 3);
  const lotW = au.innerSize / splitsU, lotH = av.innerSize / splitsV;
  const lu = Math.max(0, Math.min(splitsU - 1, Math.floor(au.local / lotW)));
  const lv = Math.max(0, Math.min(splitsV - 1, Math.floor(av.local / lotH)));
  const lotKey = (au.cell * 8 + lu) * 4096 + (av.cell * 8 + lv);
  const lotRoll = hashInts(face, lotKey, 3, 4, seed);
  const heightRoll = hashInts(face, lotKey, 5, 6, seed);

  if (lotRoll < cfg.parkChance * (district < cfg.lowrise ? 2 : 1)) {
    return { ...base, kind: CityKind.PARK, lotRoll };
  }
  if (lotRoll > 1 - cfg.plazaChance * (district > cfg.midrise ? 2 : 1)) {
    return { ...base, kind: CityKind.PLAZA, lotRoll };
  }

  const kind = districtKind(district, cfg);
  const range = kindFloors(kind, cfg);
  // Taller toward the heart of a district
  const lift = kind === CityKind.TOWER ? Math.min(1, (district - cfg.downtown) / (1 - cfg.downtown) * 1.6) : 0.5;
  const t = Math.min(1, heightRoll * 0.75 + lift * 0.45);
  let floors = Math.round(range[0] + (range[1] - range[0]) * t);

  // Setback tiers: the lot edge stays low, the core rises
  const lotLocalU = au.local - lu * lotW, lotLocalV = av.local - lv * lotH;
  const edge = Math.min(lotLocalU, lotW - lotLocalU, lotLocalV, lotH - lotLocalV);
  if (floors > cfg.crownFloors * 0.75) {
    const tiers = Math.max(0, 2 - Math.floor(edge / cfg.setbackTiles));
    for (let i = 0; i < tiers; i++) floors = Math.round(floors * cfg.setbackKeep);
  }
  return { kind, floors: Math.max(1, floors), district, lotRoll };
}

/**
 * The city's mean height at a direction, in floors: the district's typical
 * building height times the share of ground that is built on. Smooth, for
 * coarse LOD spheres whose tiles span many city blocks (a point sample
 * there would be a random spike).
 */
export function cityMeanFloors(x: number, y: number, z: number, seed: number, cfg: CityConfig): number {
  const len = Math.hypot(x, y, z) || 1;
  const district = districtField(x / len, y / len, z / len, cfg.districtScale, seed + 31);
  const range = kindFloors(districtKind(district, cfg), cfg);
  const lift = district > cfg.downtown ? Math.min(1, (district - cfg.downtown) / (1 - cfg.downtown) * 1.6) : 0.5;
  const typical = range[0] + (range[1] - range[0]) * Math.min(1, 0.375 + lift * 0.45);
  const built = Math.max(0, (cfg.blockPitch - cfg.streetWidth - 2 * cfg.sidewalkWidth) / cfg.blockPitch);
  return typical * built * built;
}

/** Top block of a ground-level (no building) tile. */
export function cityGroundBlock(kind: CityKind): HexBlockType {
  switch (kind) {
    case CityKind.ROAD: return HexBlockType.CITY_ROAD;
    case CityKind.PARK: return HexBlockType.CITY_PARK;
    case CityKind.PLAZA: return HexBlockType.CITY_PLAZA;
    default: return HexBlockType.CITY_SIDEWALK;
  }
}

/** Floors a sample can actually have in a column with `air` blocks above the ground. */
export function cityFloors(s: CitySample, air: number): number {
  return Math.min(s.floors, Math.max(0, air));
}

/**
 * Fill one column. Depth 0 = bedrock, maxDepth-1 = top. Ground block at
 * `groundDepth`; foundation (or an ore from `oreAt`) below; the building
 * (if any) rises above it.
 */
export function cityColumn(
  s: CitySample, cfg: CityConfig, groundDepth: number, maxDepth: number,
  oreAt: (depth: number) => number | undefined,
): number[] {
  const floors = cityFloors(s, maxDepth - 1 - groundDepth);
  const top = groundDepth + floors;
  const blocks: number[] = new Array(maxDepth);
  const wall = s.kind === CityKind.TOWER ? HexBlockType.CITY_GLASS
    : s.kind === CityKind.INDUSTRIAL ? HexBlockType.CITY_METAL : HexBlockType.CITY_FACADE;
  const crown = floors >= cfg.crownFloors;
  const storefront = (s.kind === CityKind.LOWRISE || s.kind === CityKind.MIDRISE) && floors >= 3
    && s.lotRoll * 7.31 % 1 < cfg.storefrontChance;
  for (let d = 0; d < maxDepth; d++) {
    if (d > top) blocks[d] = HexBlockType.AIR;
    else if (d < groundDepth) {
      const ore = d <= groundDepth - 3 ? oreAt(d) : undefined;
      blocks[d] = ore ?? HexBlockType.CITY_FOUNDATION;
    } else if (d === groundDepth) {
      blocks[d] = floors > 0 ? HexBlockType.CITY_FOUNDATION : cityGroundBlock(s.kind);
    } else if (d === top) blocks[d] = HexBlockType.CITY_ROOF;
    else if (crown && d === top - 1) blocks[d] = HexBlockType.CITY_NEON;
    else if (storefront && d === groundDepth + 1) blocks[d] = HexBlockType.CITY_NEON;
    else blocks[d] = wall;
  }
  return blocks;
}

function kindFloors(kind: CityKind, cfg: CityConfig): [number, number] {
  return kind === CityKind.TOWER ? cfg.towerFloors : kind === CityKind.MIDRISE ? cfg.midriseFloors
    : kind === CityKind.LOWRISE ? cfg.lowriseFloors : cfg.industrialFloors;
}

/** The building style a district value stands for. */
function districtKind(district: number, cfg: CityConfig): CityKind {
  return district > cfg.downtown ? CityKind.TOWER : district > cfg.midrise ? CityKind.MIDRISE
    : district > cfg.lowrise ? CityKind.LOWRISE : CityKind.INDUSTRIAL;
}

/**
 * Far-LOD palette entry of a city sample: hex colour and night glow (0-1).
 * `coarse`: the LOD tile spans whole city blocks, so a street sample shows
 * its district's buildings instead (streets can't resolve that far out and
 * would hide the districts as grey confetti).
 */
export function cityLodColor(s: CitySample, cfg: CityConfig, coarse = false): [string, number] {
  const alt = s.lotRoll > 0.5;
  const p = cfg.lodPalette;
  let kind = s.kind;
  if (coarse && (kind === CityKind.ROAD || kind === CityKind.SIDEWALK || kind === CityKind.PLAZA)) {
    kind = districtKind(s.district, cfg);
  }
  switch (kind) {
    case CityKind.ROAD: return p.road;
    case CityKind.SIDEWALK: return p.sidewalk;
    case CityKind.PLAZA: return p.plaza;
    case CityKind.PARK: return p.park;
    case CityKind.TOWER: return alt ? p.towerAlt : p.tower;
    case CityKind.MIDRISE: return alt ? p.midriseAlt : p.midrise;
    case CityKind.LOWRISE: return alt ? p.lowriseAlt : p.lowrise;
    default: return alt ? p.industrialAlt : p.industrial;
  }
}
