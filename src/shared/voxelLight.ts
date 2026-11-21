/**
 * Voxel sky light: what each air cell sees of the sky, flooded through the
 * blocks - the model Pale Blue Dot ported from tenebris-rs (`light.rs`,
 * itself from tenebris-rs `world_light.rs`).
 *
 * - Daylight is SEEDED down every column from the sky at full strength
 *   until it meets a solid block.
 * - It is FLOODED outward through anything light passes (air, water, ice,
 *   glass), losing STEP_DOWN a layer and STEP_ACROSS a hex, so it reaches
 *   round a corner and under an overhang and fades into a cave.
 * - A face takes the light of the cell it FACES: a top face the cell above
 *   it, a side face the cell beside it in the neighbour column, a bottom
 *   face the cell below.
 *
 * So a pillar's side is as bright at its foot as at its top (the cell
 * beside it is open to the sky all the way down), a cave is dark because
 * no light reached it, and a cave's mouth stays bright - not a
 * darkening by depth below the column's own top, which turned every tall
 * tower's base black.
 *
 * Block light is the second channel: blocks that give off light (EMISSION -
 * street lamps, neon, lit windows) seed it into the cells round them and
 * it floods by the same rules. A face takes it from the cell it faces,
 * like the sky; the terrain shader shows it at night (LightingConfig).
 *
 * Shared by every terrain mesher (the geometry worker and the main-thread
 * rebuild), so a chunk built either way is lit the same.
 */
import { HexBlockType, isClearSolid } from './blockTypes';
import { MIN_SKY_LIGHT } from './geometry';

export const VOXEL_LIGHT = {
  // Brightest a cell can be: the number of steps light survives
  MAX: 15,
  // Cost of a step to the layer below / above
  STEP_DOWN: 1,
  // Cost of a step to a neighbouring column (one hex is ~3 layers wide)
  STEP_ACROSS: 3,
} as const;

/**
 * Light a block gives off (levels, out of MAX): the brightest it seeds the
 * cells next to it. A lamp lights a street; a wall of lit windows a little
 * of the pavement; neon in between.
 */
export const EMISSION: Partial<Record<number, number>> = {
  [HexBlockType.CITY_LAMP]: 14,
  [HexBlockType.CITY_NEON]: 10,
  [HexBlockType.CITY_GLASS]: 5,
  [HexBlockType.CITY_FACADE]: 5,
};

/** Blocks light passes through. */
export function passesLight(block: number): boolean {
  return block === HexBlockType.AIR || block === HexBlockType.WATER || isClearSolid(block);
}

/** One column of the region: its blocks, and (if it can spread light sideways) its neighbours. */
export interface LightColumn {
  blocks: ArrayLike<number>;
  neighbors?: number[];
}

/** Light level per (column, depth), 0..MAX. */
export type SkyField = Map<number, Uint8Array>;

/**
 * Seed and flood the sky over a region (a chunk's columns plus the ring of
 * neighbours round them). Columns without `neighbors` take light but don't
 * pass it further out.
 */
export function bakeSkyField(region: Map<number, LightColumn>): SkyField {
  const { MAX } = VOXEL_LIGHT;
  return flood(region, (tile, col, seed) => {
    // straight down from the sky until something stops it
    for (let d = col.blocks.length - 1; d >= 0 && passesLight(col.blocks[d]); d--) seed(tile, d, MAX);
  });
}

/**
 * The block-light channel: every emitting block lights the open cells next
 * to it (above, below, and in the neighbouring columns), then it floods.
 * Null when the region has no emitters (most of the world), so the
 * meshers skip it.
 */
export function bakeBlockField(region: Map<number, LightColumn>): SkyField | null {
  const { STEP_DOWN, STEP_ACROSS } = VOXEL_LIGHT;
  let any = false;
  for (const col of region.values()) {
    for (let d = 0; d < col.blocks.length && !any; d++) if (EMISSION[col.blocks[d]]) any = true;
    if (any) break;
  }
  if (!any) return null;
  return flood(region, (tile, col, seed) => {
    for (let d = 0; d < col.blocks.length; d++) {
      const e = EMISSION[col.blocks[d]];
      if (!e) continue;
      for (const nd of [d - 1, d + 1]) {
        if (nd >= 0 && nd < col.blocks.length && passesLight(col.blocks[nd])) seed(tile, nd, e - STEP_DOWN);
      }
      if (!col.neighbors) continue;
      for (const nt of col.neighbors) {
        const nc = region.get(nt);
        if (nc && d < nc.blocks.length && passesLight(nc.blocks[d])) seed(nt, d, e - STEP_ACROSS);
      }
    }
  });
}

type Seeder = (tile: number, col: LightColumn, seed: (tile: number, depth: number, level: number) => void) => void;

/** Bucketed flood fill from the seeds: light only falls, so brightest first. */
function flood(region: Map<number, LightColumn>, seedAll: Seeder): SkyField {
  const { MAX, STEP_DOWN, STEP_ACROSS } = VOXEL_LIGHT;
  const field: SkyField = new Map();
  const buckets: number[][] = Array.from({ length: MAX + 1 }, () => []);
  for (const [tile, col] of region) field.set(tile, new Uint8Array(col.blocks.length));
  const seed = (tile: number, d: number, level: number) => {
    const levels = field.get(tile);
    if (!levels || level <= levels[d]) return;
    levels[d] = level;
    buckets[level].push(tile, d);
  };
  for (const [tile, col] of region) seedAll(tile, col, seed);
  for (let level = MAX; level > 0; level--) {
    const queue = buckets[level];
    for (let q = 0; q < queue.length; q += 2) {
      const tile = queue[q], d = queue[q + 1];
      const levels = field.get(tile)!;
      if (levels[d] !== level) continue;  // raised since it was queued
      const col = region.get(tile)!;
      // down and up the column
      for (const nd of [d - 1, d + 1]) {
        if (nd < 0 || nd >= col.blocks.length || !passesLight(col.blocks[nd])) continue;
        const next = level - STEP_DOWN;
        if (next > levels[nd]) { levels[nd] = next; buckets[next].push(tile, nd); }
      }
      // across to the neighbouring columns
      if (!col.neighbors || level <= STEP_ACROSS) continue;
      const next = level - STEP_ACROSS;
      for (const nt of col.neighbors) {
        const nc = region.get(nt);
        const nl = field.get(nt);
        if (!nc || !nl || d >= nc.blocks.length || !passesLight(nc.blocks[d])) continue;
        if (next > nl[d]) { nl[d] = next; buckets[next].push(nt, d); }
      }
    }
  }
  return field;
}

/** Block light a face gets (0..1) from the cell it faces; 0 with no field. */
export function blockAt(field: SkyField | null, tile: number, depth: number): number {
  if (!field) return 0;
  const levels = field.get(tile);
  if (!levels || depth < 0 || depth >= levels.length) return 0;
  return levels[depth] / VOXEL_LIGHT.MAX;
}

/**
 * How much of the sky a face sees (MIN_SKY_LIGHT..1), from the cell it
 * faces. Above the column's top is open sky; a column outside the region
 * counts as open (the region always includes a chunk's neighbour ring).
 */
export function skyAt(field: SkyField, tile: number, depth: number): number {
  const levels = field.get(tile);
  if (!levels || depth >= levels.length) return 1;
  if (depth < 0) return MIN_SKY_LIGHT;
  return Math.max(MIN_SKY_LIGHT, levels[depth] / VOXEL_LIGHT.MAX);
}

type V3 = { x: number; y: number; z: number };

/**
 * The neighbour across each edge of a tile (edge i joins vertex i and
 * i+1, the order the side quads are built in), or -1. Matched by the two
 * corner vertices the tiles share.
 */
export function edgeNeighbors(vertices: V3[], neighbors: number[], verticesOf: (tile: number) => V3[] | undefined): number[] {
  const near = (a: V3, b: V3) => {
    const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
    return dx * dx + dy * dy + dz * dz < 1e-6 * Math.max(1, a.x * a.x + a.y * a.y + a.z * a.z);
  };
  const out: number[] = [];
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i], b = vertices[(i + 1) % vertices.length];
    let found = -1;
    for (const n of neighbors) {
      const vs = verticesOf(n);
      if (vs && vs.some(v => near(v, a)) && vs.some(v => near(v, b))) { found = n; break; }
    }
    out.push(found);
  }
  return out;
}
