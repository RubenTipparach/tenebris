import { HexBlockType } from '../shared/blockTypes';
import { fractalSimplex3D } from '../shared/terrainShape';
import { PlayerConfig } from '../config/PlayerConfig';
import { SEA_FLORA, SEA_FLORA_SPECIES, SeaFloraSpecies, SeaFloraTable, SeaFloraZone } from '../config/SeaFloraConfig';
import type { CelestialBodyConfig } from '../config/SolarSystemConfig';

/**
 * Where sea plants grow (openspec ocean-life 2.1) - pure, no three.js, so the
 * rules are testable (scripts/sea-flora.test.ts). The mesh side lives in
 * src/mockups/SeaFlora.ts.
 */

/** The one gate: a body grows sea flora only if it has a sea and a table (lifeless worlds have neither). */
export function bodyGrowsSeaFlora(body: CelestialBodyConfig | undefined): body is CelestialBodyConfig & { seaFlora: SeaFloraTable } {
  return !!body && body.terrain.hasWater && !!body.seaFlora && body.seaFlora.zones.length > 0;
}

/** A submerged column: its bed (top solid block), the top water block above
 *  it, the bed's block type and, once the neighbours are known, whether the
 *  bed is rocky (rockyBed: anemones grow there). */
export interface SeabedColumn { bed: number; surface: number; bedBlock?: number; rocky?: boolean }

/**
 * The seabed of a column, or null when it isn't one: the top non-air block
 * must be WATER (open water, not ice or land), and the first non-water block
 * under it the bed. Everything between bed and surface is water, so a plant
 * standing on the bed and kept under the surface is never inside a block.
 */
export function seabedOf(getBlock: (depth: number) => number, maxDepth: number): SeabedColumn | null {
  let d = maxDepth - 1;
  while (d >= 0 && getBlock(d) === HexBlockType.AIR) d--;
  if (d < 0 || getBlock(d) !== HexBlockType.WATER) return null;
  const surface = d;
  while (d >= 0 && getBlock(d) === HexBlockType.WATER) d--;
  const bedBlock = d < 0 ? HexBlockType.AIR : getBlock(d);
  if (bedBlock === HexBlockType.AIR) return null;
  return { bed: d, surface, bedBlock };
}

/**
 * Is a seabed rocky (anemones' ground)? Its bed is one of the world's rock
 * blocks, or it is a step in the bed: a neighbour's bed lies at least
 * LEDGE_STEP blocks above or below it (a ledge or its foot), or a neighbour
 * is dry land rising out of the water (an underwater bank). `neighbours`
 * holds each neighbour's seabed, or its top solid block (depth) when it is
 * not under water, or null when unknown.
 */
export function rockyBed(table: SeaFloraTable, col: SeabedColumn, neighbours: (SeabedColumn | number | null)[]): boolean {
  if (col.bedBlock !== undefined && table.rock?.includes(col.bedBlock)) return true;
  for (const n of neighbours) {
    if (n === null) continue;
    const bed = typeof n === 'number' ? n : n.bed;
    if (typeof n === 'number' && bed > col.surface) return true;   // a bank out of the water
    if (Math.abs(bed - col.bed) >= SEA_FLORA.LEDGE_STEP) return true;
  }
  return false;
}

/** A neighbour for rockyBed: its seabed, else its top solid block's depth (dry land), else null. */
export function neighbourBed(getBlock: (depth: number) => number, maxDepth: number): SeabedColumn | number | null {
  const sea = seabedOf(getBlock, maxDepth);
  if (sea) return sea;
  let d = maxDepth - 1;
  while (d >= 0 && getBlock(d) === HexBlockType.AIR) d--;
  return d >= 0 && getBlock(d) !== HexBlockType.WATER ? d : null;
}

/** The deepest water a rocky-bed zone grows in (0 = the table has none): no need to look at neighbours below it. */
export function rockyDepthLimit(table: SeaFloraTable): number {
  return table.zones.reduce((m, z) => (z.rocky ? Math.max(m, z.depth[1]) : m), 0);
}

/** How warm the water is here: 1 at the equator, 0 at the polar line, cooler with depth. */
export function waterWarmth(table: SeaFloraTable, dir: [number, number, number], seed: number, waterDepth: number): number {
  const w = table.warmth;
  if (!w) return 0.5;
  const [x, y, z] = dir;
  return 1 - Math.abs(y) / PlayerConfig.POLAR_THRESHOLD
    + w.noiseAmp * fractalSimplex3D(x, y, z, w.noiseScale, 2, 0.35, 2.0, seed + SEA_FLORA.WARMTH_SALT)
    - w.depthCooling * waterDepth;
}

/** Broad patch noise (-1..1): low frequency, so beds are big */
export function seaPatch(table: SeaFloraTable, dir: [number, number, number], seed: number): number {
  return fractalSimplex3D(dir[0], dir[1], dir[2], table.patchScale, 2, 0.4, 2.0, seed + SEA_FLORA.PATCH_SALT);
}

/** The zone a seabed tile falls in: the first that matches its depth, warmth, patch and (rocky zones) a rocky bed. */
export function pickSeaZone(table: SeaFloraTable, waterDepth: number, warmth: number, patch: number, rocky = false): SeaFloraZone | null {
  for (const z of table.zones) {
    if (waterDepth < z.depth[0] || waterDepth > z.depth[1]) continue;
    if (z.rocky && !rocky) continue;
    if (z.warmth && (warmth < z.warmth[0] || warmth > z.warmth[1])) continue;
    if (z.patch !== undefined && patch < z.patch) continue;
    return z;
  }
  return null;
}

/** One plant: where on the tile (corner pick + lerp), its base radius, height, width, yaw, ramp and sway phase. */
export interface SeaPlant {
  species: SeaFloraSpecies;
  corner: number;     // 0..1, picks the hex corner it leans toward
  spread: number;     // 0..SPREAD, how far toward it
  nudge: [number, number]; // a clump member's offset round that spot (m, tile tangent x / z; 0 when not clumping)
  yaw: number;
  baseRadius: number; // distance from the planet centre of its origin
  height: number;
  width: number;
  ramp: number;
  jitter: number;
  phase: number;
}

/** A tile's own random stream, from the world seed and the tile (no saves, same on every client) */
export function seaTileRandom(tileIndex: number, seed: number): () => number {
  let s = Math.imul(tileIndex ^ 0x5bd1e995, 0x85ebca6b) ^ Math.imul(seed | 0, 0xc2b2ae35);
  s ^= s >>> 15;
  s = Math.imul(s, 0x27d4eb2d) >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

/**
 * The plants on one seabed tile. bedRadius is the top of the bed block,
 * surfaceRadius the water's top (both from the planet centre). Seabed
 * plants stand on the bed and end SEA_FLORA.TOP_MARGIN under the surface;
 * floaters sit at the surface by their float depth.
 */
export function planSeaTile(
  table: SeaFloraTable,
  tileIndex: number,
  seed: number,
  dir: [number, number, number],
  col: SeabedColumn,
  bedRadius: number,
  surfaceRadius: number,
): SeaPlant[] {
  const waterDepth = col.surface - col.bed;
  const zone = pickSeaZone(table, waterDepth, waterWarmth(table, dir, seed, waterDepth), seaPatch(table, dir, seed), !!col.rocky);
  if (!zone) return [];
  const rnd = seaTileRandom(tileIndex, seed);
  if (rnd() >= zone.chance) return [];
  const look = SEA_FLORA_SPECIES[zone.species];
  const column = surfaceRadius - bedRadius;
  const room = column - SEA_FLORA.TOP_MARGIN;
  const n = Math.floor(zone.perTile[0] + rnd() * zone.perTile[1]);
  // a clumping species (anemones): one spot for the tile, each plant jittered round it
  const clumpCorner = rnd(), clumpSpread = Math.sqrt(rnd()) * SEA_FLORA.SPREAD;
  const out: SeaPlant[] = [];
  for (let i = 0; i < n; i++) {
    let corner = rnd(), spread = Math.sqrt(rnd()) * SEA_FLORA.SPREAD;
    const yaw = rnd() * Math.PI * 2;
    // a clump member: the tile's one spot, nudged round it (metres, in the tangent plane)
    const nudgeA = rnd() * Math.PI * 2, nudgeR = Math.sqrt(rnd()) * (look.cluster ?? 0);
    if (look.cluster !== undefined) { corner = clumpCorner; spread = clumpSpread; }
    const width = look.width[0] + rnd() * (look.width[1] - look.width[0]);
    const ramp = Math.floor(rnd() * look.ramps.length);
    const jitter = SEA_FLORA.JITTER[0] + rnd() * (SEA_FLORA.JITTER[1] - SEA_FLORA.JITTER[0]);
    const phase = rnd() * Math.PI * 2;
    const grow = rnd();
    let height: number, baseRadius: number;
    if (look.float) {
      // Floaters: at the surface. One that hangs under it (depth > 0)
      // needs the water for it and reaches up to the surface, no further;
      // one resting on it (a lily pad) is the only thing above the water
      height = look.height[0] + grow * (look.height[1] - look.height[0]);
      if (look.float.depth > 0) {
        if (look.float.depth + SEA_FLORA.TOP_MARGIN > column) continue;
        height = Math.min(height, look.float.depth);
      }
      baseRadius = surfaceRadius - look.float.depth;
    } else {
      height = look.reach
        ? column * (look.reach[0] + grow * (look.reach[1] - look.reach[0]))
        : look.height[0] + grow * (look.height[1] - look.height[0]);
      height = Math.min(height, look.height[1], room);
      if (height < look.height[0] * SEA_FLORA.MIN_FIT) continue;
      baseRadius = bedRadius - SEA_FLORA.ROOT_SINK;
    }
    out.push({ species: zone.species, corner, spread, nudge: [Math.cos(nudgeA) * nudgeR, Math.sin(nudgeA) * nudgeR], yaw, baseRadius, height, width, ramp, jitter, phase });
  }
  return out;
}
