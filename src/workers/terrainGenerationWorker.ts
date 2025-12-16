// Terrain Generation Worker - generates planet terrain blocks off the main thread
// This allows planet initialization to happen without blocking the UI

import { HexBlockType } from '../shared/blockTypes';
import { Vec3 } from '../shared/vec3';

// Tile data passed from main thread (serializable)
interface TileData {
  index: number;
  center: Vec3;  // Normalized center position
  neighbors: number[];
}

// Planet config passed from main thread
interface TerrainConfig {
  seed: number;
  maxDepth: number;
  seaLevel: number;
  maxHeight: number;
  hasWater: boolean;
  isSingleTexturePlanet: boolean;  // Moon-like planets
  heightVariation: number;
  polarThreshold: number;
  // Terrain generation parameters
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
  // Ore configs
  oreConfigs: OreConfig[];
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

// Result format for postMessage (Maps don't serialize well)
interface SerializableTerrainResult {
  type: 'terrainResult';
  columns: Array<[number, number[]]>;  // Array of [tileIndex, blocks] pairs
}

// ============ NOISE FUNCTIONS ============
// These are pure functions that don't depend on any external state

function hash3D(x: number, y: number, z: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + z * 1274126177 + seed) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return h ^ (h >> 16);
}

function grad3D(ix: number, iy: number, iz: number, x: number, y: number, z: number, seed: number): number {
  const hash = hash3D(ix, iy, iz, seed) & 15;
  const gradients = [
    [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
    [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
    [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
    [1, 1, 0], [-1, 1, 0], [0, -1, 1], [0, -1, -1]
  ];
  const g = gradients[hash];
  return g[0] * x + g[1] * y + g[2] * z;
}

function simplex3D(x: number, y: number, z: number, seed: number): number {
  const F3 = 1.0 / 3.0;
  const G3 = 1.0 / 6.0;

  // Incorporate seed
  x += seed * 0.1;
  y += seed * 0.13;
  z += seed * 0.17;

  const s = (x + y + z) * F3;
  const i = Math.floor(x + s);
  const j = Math.floor(y + s);
  const k = Math.floor(z + s);

  const t = (i + j + k) * G3;
  const X0 = i - t;
  const Y0 = j - t;
  const Z0 = k - t;

  const x0 = x - X0;
  const y0 = y - Y0;
  const z0 = z - Z0;

  let i1: number, j1: number, k1: number;
  let i2: number, j2: number, k2: number;

  if (x0 >= y0) {
    if (y0 >= z0) {
      i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0;
    } else if (x0 >= z0) {
      i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1;
    } else {
      i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1;
    }
  } else {
    if (y0 < z0) {
      i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1;
    } else if (x0 < z0) {
      i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1;
    } else {
      i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0;
    }
  }

  const x1 = x0 - i1 + G3;
  const y1 = y0 - j1 + G3;
  const z1 = z0 - k1 + G3;
  const x2 = x0 - i2 + 2.0 * G3;
  const y2 = y0 - j2 + 2.0 * G3;
  const z2 = z0 - k2 + 2.0 * G3;
  const x3 = x0 - 1.0 + 3.0 * G3;
  const y3 = y0 - 1.0 + 3.0 * G3;
  const z3 = z0 - 1.0 + 3.0 * G3;

  let n0 = 0, n1 = 0, n2 = 0, n3 = 0;

  let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
  if (t0 >= 0) {
    t0 *= t0;
    n0 = t0 * t0 * grad3D(i, j, k, x0, y0, z0, seed);
  }

  let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
  if (t1 >= 0) {
    t1 *= t1;
    n1 = t1 * t1 * grad3D(i + i1, j + j1, k + k1, x1, y1, z1, seed);
  }

  let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
  if (t2 >= 0) {
    t2 *= t2;
    n2 = t2 * t2 * grad3D(i + i2, j + j2, k + k2, x2, y2, z2, seed);
  }

  let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
  if (t3 >= 0) {
    t3 *= t3;
    n3 = t3 * t3 * grad3D(i + 1, j + 1, k + 1, x3, y3, z3, seed);
  }

  return 32.0 * (n0 + n1 + n2 + n3);
}

function fractalSimplex3D(
  x: number, y: number, z: number,
  period: number,
  octaves: number,
  persistence: number,
  lacunarity: number,
  seed: number
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = period;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    value += simplex3D(x * frequency, y * frequency, z * frequency, seed) * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return value / maxValue;
}

function ridgeSimplex3D(
  x: number, y: number, z: number,
  period: number,
  octaves: number,
  persistence: number,
  lacunarity: number,
  seed: number
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = period;
  let maxValue = 0;

  for (let i = 0; i < octaves; i++) {
    const noise = simplex3D(x * frequency, y * frequency, z * frequency, seed);
    const ridge = 1.0 - Math.abs(noise);
    value += ridge * ridge * amplitude;
    maxValue += amplitude;
    amplitude *= persistence;
    frequency *= lacunarity;
  }

  return value / maxValue;
}

// ============ HEIGHT VARIATION ============

function getHeightVariation(center: Vec3, config: TerrainConfig): number {
  const variation = config.heightVariation;
  const len = Math.sqrt(center.x * center.x + center.y * center.y + center.z * center.z);
  const dirX = center.x / len;
  const dirY = center.y / len;
  const dirZ = center.z / len;

  // Layer 1: Continental Base
  const continentNoise = fractalSimplex3D(
    dirX, dirY, dirZ,
    config.continentScale,
    6, 0.5, 2.0,
    config.seed
  );
  const continentValue = Math.sign(continentNoise) * Math.pow(Math.abs(continentNoise), 0.8);

  // Layer 2: Mountain Ridges
  const mountainNoise = ridgeSimplex3D(
    dirX, dirY, dirZ,
    config.mountainScale,
    4, 0.5, 2.2,
    config.seed
  );
  const landFactor = Math.max(0, continentValue);
  const mountainHeight = mountainNoise * landFactor * config.mountainHeight;

  // Layer 3: Hills and Variation
  const hillNoise = fractalSimplex3D(
    dirX, dirY, dirZ,
    config.hillScale,
    3, 0.5, 2.0,
    config.seed
  );

  // Layer 4: Surface Detail
  const detailNoise = fractalSimplex3D(
    dirX, dirY, dirZ,
    config.detailScale,
    2, 0.5, 2.0,
    config.seed
  );

  // Combine all layers
  let height = continentValue * config.continentWeight;
  height += mountainHeight;
  height += hillNoise * config.hillWeight * (landFactor > 0.1 ? 1.0 : 0.3);
  height += detailNoise * config.detailWeight;

  // Convert height to depth
  const SEA_LEVEL_DEPTH = config.maxDepth - 1 - config.seaLevel;

  let depth: number;
  if (height >= 0) {
    const landHeight = height * config.maxHeight * variation;
    depth = SEA_LEVEL_DEPTH + landHeight;
  } else {
    const oceanFactor = Math.pow(Math.abs(height), config.oceanDepthPower);
    const oceanDepth = oceanFactor * config.terrainMaxDepth * variation;
    depth = SEA_LEVEL_DEPTH - oceanDepth;
  }

  return Math.max(0, Math.min(config.maxDepth - 1, Math.round(depth)));
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
        const key = `${tileIndex},${depth}`;
        if (oreVeinCache.has(key)) continue;

        const seed = config.seed + oreSeedOffset + tileIndex * 7919 + depth * 104729;
        const random = seededRandom(seed);

        if (random < oreConfig.veinChance) {
          spreadOreVein(tileIndex, depth, oreConfig, seed, tileNeighbors, oreVeinCache);
        }
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

function generateTerrain(tiles: TileData[], config: TerrainConfig): Map<number, number[]> {
  const columns = new Map<number, number[]>();

  // Generate ore veins first
  const oreVeinCache = generateOreVeins(tiles, config);

  // First pass: Generate height map
  const heightMap = new Map<number, number>();
  for (const tile of tiles) {
    const surfaceDepth = getHeightVariation(tile.center, config);
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

    for (let depth = 0; depth < config.maxDepth; depth++) {
      if (depth > surfaceDepth) {
        blocks.push(HexBlockType.AIR);
      } else if (config.isSingleTexturePlanet) {
        blocks.push(HexBlockType.MOON_ROCK);
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
self.onmessage = (e: MessageEvent<GenerateTerrainMessage>) => {
  const { type, tiles, config } = e.data;

  if (type === 'generateTerrain') {
    console.log(`[TerrainWorker] Generating terrain for ${tiles.length} tiles...`);
    const startTime = performance.now();

    const columns = generateTerrain(tiles, config);

    const elapsed = performance.now() - startTime;
    console.log(`[TerrainWorker] Generated terrain in ${elapsed.toFixed(0)}ms`);

    // Convert Map to array for serialization
    const result: SerializableTerrainResult = {
      type: 'terrainResult',
      columns: Array.from(columns.entries())
    };

    self.postMessage(result);
  }
};

export {};
