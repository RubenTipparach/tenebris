// Terrain Generation Worker - generates planet terrain blocks off the main thread
// This allows planet initialization to happen without blocking the UI

import { HexBlockType } from '../shared/blockTypes';
import { Vec3 } from '../shared/vec3';
import { CityConfig, sampleCity, cityColumn } from '../shared/cityGen';
import { packBlocks, PackedBlocks } from './packedTiles';
import { hash3D, fractalSimplex3D, surfaceDepthAt, volcanoAt, ShapeParams, VOLCANO_NONE, VOLCANO_FLANK, VOLCANO_SLOPE, VOLCANO_RIM, VOLCANO_CRATER } from '../shared/terrainShape';

// Tile data passed from main thread (serializable)
interface TileData {
  index: number;
  center: Vec3;  // Normalized center position
  neighbors: number[];
}

// Planet config passed from main thread
interface TerrainConfig extends ShapeParams {
  // Replace generic terrain blocks with a planet's own block IDs
  // (e.g. GRASS -> SEQ_GRASS on Sequoia); keys and values are HexBlockType
  blockRemap?: Record<number, number>;
  // Climate biomes (deserts, tundra, forest, rocky highlands, alpine snow,
  // stone cliffs) in the generic blocks, which blockRemap turns into a
  // planet's own (Sequoia, the living alien worlds; Earth as a mockup).
  // On a dry single-texture world they lie on its rock, basins included.
  biomes?: boolean;
  // Ecumenopolis: every column is city (src/shared/cityGen.ts); street level
  // is the sea-level depth. cityTileAngle = one tile's angular size
  city?: CityConfig;
  cityTileAngle?: number;
  hasWater: boolean;
  isSingleTexturePlanet: boolean;  // Moon-like planets
  polarThreshold: number;
  // Rock worlds only (isSingleTexturePlanet): an ice moon's frozen crust
  // (frost over glacier ice, blue ice on the slopes), and a metal-rich
  // body's meteoric iron at the surface and extra ore below
  iceCover?: boolean;
  metalRich?: boolean;
  // Rock worlds: polar ice caps (PlayerConfig.POLAR_ICE_CAP*); cap 0 = none
  polarIceCap?: number;
  polarIceCapEdgeNoise?: number;
  polarIceCapDepth?: number;
  // Ore configs
  oreConfigs: OreConfig[];
  // Clay patches on the shores (ResourceConfig SHORE_CLAY): beach tiles and
  // shallow beds where low-frequency noise passes the threshold
  shoreClay?: { scale: number; threshold: number; seedSalt: number; shallowDepth: number };
}

interface OreConfig {
  type: number;  // HexBlockType value
  minDepth: number;
  maxDepth: number;
  veinChance: number;
  veinSize: number;
  spreadFactor: number;
}

// Message types
interface GenerateTerrainMessage {
  type: 'generateTerrain';
  tiles: TileData[];
  config: TerrainConfig;
}

// Result format for postMessage: columns packed into transferable typed
// arrays (structured-cloning 163k nested number arrays cost the main thread
// tens of seconds on the big planets, more the deeper their columns)
interface TerrainColumnsMessage {
  type: 'terrainBatch' | 'terrainResult';
  columns: PackedBlocks;
}

// ============ ORE GENERATION ============

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 43758.5453;
  return x - Math.floor(x);
}

function generateOreVeins(
  tiles: TileData[],
  config: TerrainConfig
): Map<string, number> {
  const oreVeinCache = new Map<string, number>();

  // Build neighbor lookup
  const tileNeighbors = new Map<number, number[]>();
  for (const tile of tiles) {
    tileNeighbors.set(tile.index, tile.neighbors);
  }

  // For each ore type, generate vein seed points
  for (const oreConfig of config.oreConfigs) {
    const oreSeedOffset = oreConfig.type * 31337;

    for (const tile of tiles) {
      const tileIndex = tile.index;
      for (let depth = oreConfig.minDepth; depth <= oreConfig.maxDepth; depth++) {
        // Roll first: only a seed point needs its key (building a string
        // key per tile and depth was most of a big planet's generation time)
        const seed = config.seed + oreSeedOffset + tileIndex * 7919 + depth * 104729;
        if (seededRandom(seed) >= oreConfig.veinChance * (config.metalRich ? METAL_ORE_MULTIPLIER : 1)) continue;
        if (oreVeinCache.has(`${tileIndex},${depth}`)) continue;
        spreadOreVein(tileIndex, depth, oreConfig, seed, tileNeighbors, oreVeinCache);
      }
    }
  }

  return oreVeinCache;
}

function spreadOreVein(
  seedTileIndex: number,
  seedDepth: number,
  config: OreConfig,
  baseSeed: number,
  tileNeighbors: Map<number, number[]>,
  oreVeinCache: Map<string, number>
): void {
  const toVisit: Array<{ tileIndex: number; depth: number; probability: number }> = [];
  const visited = new Set<string>();

  toVisit.push({ tileIndex: seedTileIndex, depth: seedDepth, probability: 1.0 });

  let blocksPlaced = 0;
  const maxBlocks = config.veinSize + Math.floor(seededRandom(baseSeed + 999) * config.veinSize * 0.5);

  while (toVisit.length > 0 && blocksPlaced < maxBlocks) {
    const current = toVisit.shift()!;
    const key = `${current.tileIndex},${current.depth}`;

    if (visited.has(key)) continue;
    visited.add(key);

    if (current.depth < config.minDepth || current.depth > config.maxDepth) continue;

    const placeSeed = baseSeed + current.tileIndex * 13 + current.depth * 17;
    if (seededRandom(placeSeed) > current.probability) continue;

    if (oreVeinCache.has(key)) continue;

    oreVeinCache.set(key, config.type);
    blocksPlaced++;

    const neighborProb = current.probability * config.spreadFactor;
    if (neighborProb < 0.1) continue;

    // Spread to vertical neighbors
    toVisit.push({ tileIndex: current.tileIndex, depth: current.depth - 1, probability: neighborProb });
    toVisit.push({ tileIndex: current.tileIndex, depth: current.depth + 1, probability: neighborProb });

    // Spread to horizontal neighbors
    const neighbors = tileNeighbors.get(current.tileIndex);
    if (neighbors) {
      for (const neighborIdx of neighbors) {
        toVisit.push({ tileIndex: neighborIdx, depth: current.depth, probability: neighborProb * 0.8 });
      }
    }
  }
}

// ============ TERRAIN GENERATION ============

// Biome mockup thresholds
const BIOME_TEMP_SCALE = 2.5;
const BIOME_MOIST_SCALE = 2.2;   // low frequency, few octaves: big clean biomes
const BIOME_CLIFF_STEP = 4;      // height step to a neighbour that bares rock
const BIOME_ALPINE_ALT = 0.88;   // fraction of the highest land
const BIOME_ROCK_ALT = 0.72;
const BIOME_DESERT_TEMP = 0.7;
const BIOME_DESERT_MOIST = -0.08;
const BIOME_TUNDRA_TEMP = 0.12;
const BIOME_FOREST_MOIST = 0.18; // damp forest floor (leaf litter under a closed canopy)
const BIOME_SAVANNA_TEMP = 0.5;  // warm and fairly dry, short of desert
const BIOME_SAVANNA_MOIST = 0.06;

// ============ ROCK WORLDS (the Moon, the barren planets, moons, asteroids) ============

// A rock world's surface layer per column: what lies on top and how deep it
// goes, before the native rock (MOON_ROCK, drawn in the body's own texture)
interface Crust {
  top: number;       // block at the surface
  under: number;     // block in the layers just below it
  thickness: number; // how many layers below the surface are `under`
}

const CRUST_PATCH_SCALE = 9;     // sulfur / meteoric iron / lava-field patches
const SULFUR_PATCH = 0.2;        // patch noise above this: sulfur on the upper slopes
const LAVA_FIELD_PATCH = 0.5;    // and away from the cones: a cracked lava field
const LAVA_STREAK_PERMILLE = 140; // upper-slope columns that are a lava streak
const FLANK_LAVA_PERMILLE = 45;
const BLUE_ICE_STEP = 2;         // a step this high to a neighbour bares blue ice
const ICE_SHEET_DEPTH = 3;       // glacier ice under the frost (fuel)
const IRON_PATCH = 0.18;         // patch noise above this: meteoric iron at the surface
const ICE_POCKET_PERMILLE = 15;
const ICY_ICE_POCKET_PERMILLE = 70;
const IRON_POCKET_PERMILLE = 40;
const METAL_ORE_MULTIPLIER = 3;

// A rock world's polar ice cap: past the cap latitude, with a ragged edge.
// Ice moons are frozen all over already, and volcano cones melt through
function inPolarIceCap(tile: TileData, config: TerrainConfig): boolean {
  if (!config.isSingleTexturePlanet || config.iceCover || !config.polarIceCap) return false;
  const len = Math.hypot(tile.center.x, tile.center.y, tile.center.z);
  const x = tile.center.x / len, y = tile.center.y / len, z = tile.center.z / len;
  if (config.volcanoes && volcanoAt(x, y, z, config).zone !== VOLCANO_NONE) return false;
  const edge = fractalSimplex3D(x, y, z, CRUST_PATCH_SCALE, 2, 0.5, 2.0, config.seed + 404);
  return Math.abs(y) > config.polarIceCap + edge * (config.polarIceCapEdgeNoise ?? 0);
}

function rockWorldCrust(tile: TileData, surfaceDepth: number, heightMap: Map<number, number>, config: TerrainConfig): Crust | null {
  const len = Math.hypot(tile.center.x, tile.center.y, tile.center.z);
  const x = tile.center.x / len, y = tile.center.y / len, z = tile.center.z / len;
  const roll = (hash3D(tile.index, 4421, 977, config.seed) >>> 0) % 1000;
  const patch = fractalSimplex3D(x, y, z, CRUST_PATCH_SCALE, 2, 0.5, 2.0, config.seed + 303);

  // Polar ice cap: frost on top (blue ice where it breaks out on a step),
  // glacier ice below - mined, both give Ice (rocket fuel)
  if (inPolarIceCap(tile, config)) {
    let steep = 0;
    for (const n of tile.neighbors) steep = Math.max(steep, Math.abs((heightMap.get(n) ?? surfaceDepth) - surfaceDepth));
    return { top: steep >= BLUE_ICE_STEP ? HexBlockType.BLUE_ICE : HexBlockType.FROST, under: HexBlockType.BLUE_ICE, thickness: config.polarIceCapDepth ?? ICE_SHEET_DEPTH };
  }

  if (config.volcanoes) {
    const zone = volcanoAt(x, y, z, config).zone;
    if (zone === VOLCANO_CRATER) return { top: HexBlockType.MAGMA, under: HexBlockType.MAGMA, thickness: 2 };
    if (zone === VOLCANO_RIM) return { top: HexBlockType.LAVA_ROCK, under: HexBlockType.BASALT, thickness: 3 };
    if (zone === VOLCANO_SLOPE) {
      const top = patch > SULFUR_PATCH ? HexBlockType.SULFUR
        : roll < LAVA_STREAK_PERMILLE ? HexBlockType.LAVA_ROCK : HexBlockType.BASALT;
      return { top, under: HexBlockType.BASALT, thickness: 3 };
    }
    if (zone === VOLCANO_FLANK) {
      return { top: roll < FLANK_LAVA_PERMILLE ? HexBlockType.LAVA_ROCK : HexBlockType.BASALT, under: HexBlockType.BASALT, thickness: 2 };
    }
    if (zone === VOLCANO_NONE && !config.iceCover && patch > LAVA_FIELD_PATCH) {
      return { top: HexBlockType.LAVA_ROCK, under: HexBlockType.BASALT, thickness: 1 };
    }
  }
  if (config.iceCover) {
    let steep = 0;
    for (const n of tile.neighbors) steep = Math.max(steep, Math.abs((heightMap.get(n) ?? surfaceDepth) - surfaceDepth));
    return { top: steep >= BLUE_ICE_STEP ? HexBlockType.BLUE_ICE : HexBlockType.FROST, under: HexBlockType.ICE, thickness: ICE_SHEET_DEPTH };
  }
  if (config.metalRich && patch > IRON_PATCH) {
    return { top: HexBlockType.IRON_NICKEL, under: HexBlockType.IRON_NICKEL, thickness: 1 };
  }
  return null;
}

// Airless rock worlds still hold resources: the ore veins generated for
// every planet, and water ice - patchy just under the surface near the
// poles, plus rare pockets elsewhere (common on an ice moon). Ice is the raw
// material for rocket fuel, so a ship can refuel off-world.
function rockWorldBlock(
  tile: TileData, depth: number, surfaceDepth: number, crust: Crust | null,
  normalizedY: number, oreVeinCache: Map<string, number>, config: TerrainConfig
): number {
  if (crust && depth >= surfaceDepth - crust.thickness) {
    return depth === surfaceDepth ? crust.top : crust.under;
  }
  const oreType = depth <= surfaceDepth - 3 ? oreVeinCache.get(`${tile.index},${depth}`) : undefined;
  const roll = (hash3D(tile.index, depth, 7919, config.seed) >>> 0) % 1000;
  const nearPole = Math.abs(normalizedY) > config.polarThreshold * 0.85;
  const polarIce = nearPole && depth < surfaceDepth && depth >= surfaceDepth - 4 && roll < 600;
  const icePocket = depth < surfaceDepth - 2 && roll < (config.iceCover ? ICY_ICE_POCKET_PERMILLE : ICE_POCKET_PERMILLE);
  if (oreType !== undefined) return oreType;
  if (polarIce || icePocket) return HexBlockType.ICE;
  if (config.metalRich && depth < surfaceDepth - 1 && roll >= 900 && roll < 900 + IRON_POCKET_PERMILLE) return HexBlockType.IRON_NICKEL;
  return HexBlockType.MOON_ROCK;
}

function generateTerrain(tiles: TileData[], config: TerrainConfig): Map<number, number[]> {
  const columns = new Map<number, number[]>();

  // Generate ore veins first
  const oreVeinCache = generateOreVeins(tiles, config);

  if (config.city) {
    const ground = config.maxDepth - 1 - config.seaLevel;
    for (const tile of tiles) {
      const s = sampleCity(tile.center.x, tile.center.y, tile.center.z, config.seed, config.city, config.cityTileAngle!);
      columns.set(tile.index, cityColumn(s, config.city, ground, config.maxDepth,
        d => oreVeinCache.get(`${tile.index},${d}`)));
    }
    return columns;
  }

  // First pass: Generate height map
  const heightMap = new Map<number, number>();
  for (const tile of tiles) {
    const surfaceDepth = surfaceDepthAt(tile.center, config);
    heightMap.set(tile.index, surfaceDepth);
  }

  // Second pass: Identify beach tiles
  const SEA_LEVEL_DEPTH = config.maxDepth - 1 - config.seaLevel;
  const beachTiles = new Set<number>();

  if (config.hasWater) {
    for (const tile of tiles) {
      const surfaceDepth = heightMap.get(tile.index) ?? SEA_LEVEL_DEPTH;
      if (surfaceDepth >= SEA_LEVEL_DEPTH) {
        for (const neighborIndex of tile.neighbors) {
          const neighborDepth = heightMap.get(neighborIndex) ?? SEA_LEVEL_DEPTH;
          if (neighborDepth < SEA_LEVEL_DEPTH) {
            beachTiles.add(tile.index);
            break;
          }
        }
      }
    }
  }

  // Biome mockup: surface block per land tile from climate + terrain
  const biomeTop = new Map<number, number>();
  if (config.biomes) {
    // Altitude is measured from the sea; a world without water has no sea,
    // so from its lowest ground (its old ocean basins are land too)
    let base = SEA_LEVEL_DEPTH;
    if (!config.hasWater) for (const d of heightMap.values()) base = Math.min(base, d);
    let maxAlt = 1;
    for (const d of heightMap.values()) maxAlt = Math.max(maxAlt, d - base);
    for (const tile of tiles) {
      const surfaceDepth = heightMap.get(tile.index) ?? SEA_LEVEL_DEPTH;
      if (surfaceDepth < base || beachTiles.has(tile.index)) continue;
      const len = Math.hypot(tile.center.x, tile.center.y, tile.center.z);
      const x = tile.center.x / len, y = tile.center.y / len, z = tile.center.z / len;
      if (Math.abs(y) > config.polarThreshold || inPolarIceCap(tile, config)) continue;
      const altFrac = (surfaceDepth - base) / maxAlt;
      // Temperature: warm at the equator, cold toward the poles and up high
      const temp = 1 - Math.abs(y) / config.polarThreshold
        + 0.35 * fractalSimplex3D(x, y, z, BIOME_TEMP_SCALE, 2, 0.35, 2.0, config.seed + 101)
        - 0.6 * altFrac;
      const moisture = fractalSimplex3D(x, y, z, BIOME_MOIST_SCALE, 2, 0.3, 2.0, config.seed + 202);
      let steep = 0;
      for (const n of tile.neighbors) steep = Math.max(steep, Math.abs((heightMap.get(n) ?? surfaceDepth) - surfaceDepth));
      let top = HexBlockType.GRASS;
      if (steep >= BIOME_CLIFF_STEP) top = HexBlockType.STONE;
      else if (altFrac > BIOME_ALPINE_ALT) top = HexBlockType.SNOW;
      else if (altFrac > BIOME_ROCK_ALT) top = HexBlockType.STONE;
      else if (temp > BIOME_DESERT_TEMP && moisture < BIOME_DESERT_MOIST) top = HexBlockType.SAND;
      else if (temp < BIOME_TUNDRA_TEMP) top = HexBlockType.DIRT_SNOW;
      else if (moisture > BIOME_FOREST_MOIST) top = HexBlockType.FOREST_FLOOR;
      else if (temp > BIOME_SAVANNA_TEMP && moisture < BIOME_SAVANNA_MOIST) top = HexBlockType.DRY_GRASS;
      biomeTop.set(tile.index, top);
    }
  }

  // Shore clay: beach tiles and shallow beds in broad noise patches
  const clayTiles = new Set<number>();
  if (config.shoreClay && config.hasWater) {
    const c = config.shoreClay;
    for (const tile of tiles) {
      const surfaceDepth = heightMap.get(tile.index) ?? SEA_LEVEL_DEPTH;
      const shallowBed = surfaceDepth < SEA_LEVEL_DEPTH && surfaceDepth >= SEA_LEVEL_DEPTH - c.shallowDepth
        && tile.neighbors.some(n => (heightMap.get(n) ?? SEA_LEVEL_DEPTH) >= SEA_LEVEL_DEPTH);
      if (!beachTiles.has(tile.index) && !shallowBed) continue;
      const len = Math.hypot(tile.center.x, tile.center.y, tile.center.z);
      const n = fractalSimplex3D(tile.center.x / len, tile.center.y / len, tile.center.z / len, c.scale, 2, 0.4, 2.0, config.seed + c.seedSalt);
      if (n > c.threshold) clayTiles.add(tile.index);
    }
  }

  // Third pass: Create blocks based on height map
  for (const tile of tiles) {
    const blocks: number[] = [];
    const surfaceDepth = heightMap.get(tile.index) ?? SEA_LEVEL_DEPTH;
    const isBeach = beachTiles.has(tile.index);

    // Polar biome detection
    const len = Math.sqrt(tile.center.x * tile.center.x + tile.center.y * tile.center.y + tile.center.z * tile.center.z);
    const normalizedY = tile.center.y / len;
    const isPolar = !config.isSingleTexturePlanet && Math.abs(normalizedY) > config.polarThreshold;
    const isUnderwater = config.hasWater && surfaceDepth < SEA_LEVEL_DEPTH;
    const crust = config.isSingleTexturePlanet ? rockWorldCrust(tile, surfaceDepth, heightMap, config) : null;
    const isClay = clayTiles.has(tile.index) && !isPolar;

    for (let depth = 0; depth < config.maxDepth; depth++) {
      if (depth > surfaceDepth) {
        blocks.push(HexBlockType.AIR);
      } else if (config.isSingleTexturePlanet) {
        if (depth === surfaceDepth && biomeTop.has(tile.index)) {
          // A living rock world: its biome's ground on top of the rock
          blocks.push(biomeTop.get(tile.index)!);
        } else {
          blocks.push(rockWorldBlock(tile, depth, surfaceDepth, crust!, normalizedY, oreVeinCache, config));
        }
      } else if (isClay && depth > surfaceDepth - 3) {
        blocks.push(HexBlockType.CLAY);
      } else if (depth === surfaceDepth && biomeTop.has(tile.index)) {
        blocks.push(biomeTop.get(tile.index)!);
      } else if (depth > surfaceDepth - 3 && (biomeTop.get(tile.index) === HexBlockType.SAND || biomeTop.get(tile.index) === HexBlockType.STONE || biomeTop.get(tile.index) === HexBlockType.SNOW)) {
        // Deserts are sand all the way down the soil layer, rock is rock
        const top = biomeTop.get(tile.index)!;
        blocks.push(top === HexBlockType.SAND ? HexBlockType.SAND : HexBlockType.STONE);
      } else if (depth === surfaceDepth) {
        if (isBeach && !isPolar) {
          blocks.push(HexBlockType.SAND);
        } else if (isUnderwater) {
          blocks.push(HexBlockType.DIRT);
        } else if (isPolar) {
          blocks.push(HexBlockType.SNOW);
        } else {
          blocks.push(HexBlockType.GRASS);
        }
      } else if (depth > surfaceDepth - 3) {
        if (isBeach && !isPolar) {
          blocks.push(HexBlockType.SAND);
        } else {
          blocks.push(HexBlockType.DIRT);
        }
      } else {
        // Deep underground = stone or ore
        const key = `${tile.index},${depth}`;
        const oreType = oreVeinCache.get(key);
        if (oreType !== undefined) {
          blocks.push(oreType);
        } else {
          blocks.push(HexBlockType.STONE);
        }
      }
    }

    if (config.blockRemap) {
      for (let i = 0; i < blocks.length; i++) {
        const to = config.blockRemap[blocks[i]];
        if (to !== undefined) blocks[i] = to;
      }
    }
    columns.set(tile.index, blocks);
  }

  // Fill oceans with water
  if (config.hasWater) {
    for (const tile of tiles) {
      const blocks = columns.get(tile.index)!;
      for (let depth = 0; depth < config.maxDepth; depth++) {
        if (blocks[depth] === HexBlockType.AIR && depth <= SEA_LEVEL_DEPTH) {
          blocks[depth] = HexBlockType.WATER;
        }
      }
    }
  }

  return columns;
}

// Worker message handler
self.onmessage = (e: MessageEvent<GenerateTerrainMessage & { edits?: Array<[number, number, number]> }>) => {
  const { type, tiles, config } = e.data;

  // The world map's question: only each tile's topmost non-air block, from
  // the same generator, with the planet's edits applied
  if ((type as string) === 'generateTopBlocks') {
    const columns = generateTerrain(tiles, config);
    for (const [t, d, b] of e.data.edits ?? []) {
      const col = columns.get(t);
      if (col && d >= 0 && d < col.length) col[d] = b;
    }
    let max = 0;
    for (const t of tiles) max = Math.max(max, t.index + 1);
    const top = new Uint16Array(max);
    for (const [i, col] of columns) {
      for (let d = col.length - 1; d >= 0; d--) if (col[d] !== 0) { top[i] = col[d]; break; }
    }
    (self as unknown as Worker).postMessage({ type: 'topBlocks', top }, [top.buffer]);
    return;
  }

  if (type === 'generateTerrain') {
    console.log(`[TerrainWorker] Generating terrain for ${tiles.length} tiles...`);
    const startTime = performance.now();

    const columns = generateTerrain(tiles, config);

    const elapsed = performance.now() - startTime;
    console.log(`[TerrainWorker] Generated terrain in ${elapsed.toFixed(0)}ms`);

    // Post the columns in batches. One giant message has to be deserialized
    // on the main thread in a single task (hundreds of ms for a large planet);
    // separate messages are separate tasks, so frames render in between.
    const entries = Array.from(columns.entries(), ([i, blocks]) => [i, { blocks }] as [number, { blocks: number[] }]);
    const BATCH = 8192;
    const post = (type: TerrainColumnsMessage['type'], slice: typeof entries) => {
      const packed = packBlocks(slice, slice.length);
      const message: TerrainColumnsMessage = { type, columns: packed };
      (self as unknown as Worker).postMessage(message,
        [packed.indices.buffer, packed.lengths.buffer, packed.data.buffer] as Transferable[]);
    };
    for (let i = 0; i + BATCH < entries.length; i += BATCH) {
      post('terrainBatch', entries.slice(i, i + BATCH));
    }
    const lastStart = entries.length > BATCH ? Math.floor((entries.length - 1) / BATCH) * BATCH : 0;
    post('terrainResult', entries.slice(lastStart));
  }
};

export {};
