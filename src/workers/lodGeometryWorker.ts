// LOD Geometry Worker - builds LOD terrain geometry off the main thread
// Optimized: pre-computed normalizations, cached surface data, reduced passes

// Vector3-like operations using plain objects
interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// Note: Vector operations are inlined in hot loops to avoid function call overhead
// and object allocations. The raw x/y/z math is faster than helper functions.

// Torch data for vertex lighting calculation
interface TorchData {
  position: Vec3;
  range: number;
  intensity: number;
}

// Calculate torch light contribution at a point
function calculateTorchLight(x: number, y: number, z: number, torches: TorchData[]): number {
  let totalLight = 0;
  for (const torch of torches) {
    const dx = x - torch.position.x;
    const dy = y - torch.position.y;
    const dz = z - torch.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < torch.range) {
      // Quadratic falloff matching the shader formula
      const attenuation = 1.0 / (1.0 + 2.0 * dist * dist / (torch.range * torch.range));
      totalLight += attenuation * torch.intensity;
    }
  }
  return Math.min(totalLight, 1.5); // Cap at 1.5 like the shader
}

// Per-chunk geometry buffers
interface ChunkGeometry {
  grassPositions: number[];
  grassNormals: number[];
  grassUvs: number[];
  grassSkyLight: number[];  // Sky light attribute for terrain shader
  grassTorchLight: number[];  // Torch light attribute for terrain shader
  grassIndices: number[];
  grassVertexOffset: number;
  dirtPositions: number[];
  dirtNormals: number[];
  dirtUvs: number[];
  dirtSkyLight: number[];
  dirtTorchLight: number[];
  dirtIndices: number[];
  dirtVertexOffset: number;
  stonePositions: number[];
  stoneNormals: number[];
  stoneUvs: number[];
  stoneSkyLight: number[];
  stoneTorchLight: number[];
  stoneIndices: number[];
  stoneVertexOffset: number;
  sandPositions: number[];
  sandNormals: number[];
  sandUvs: number[];
  sandSkyLight: number[];
  sandTorchLight: number[];
  sandIndices: number[];
  sandVertexOffset: number;
  woodPositions: number[];
  woodNormals: number[];
  woodUvs: number[];
  woodSkyLight: number[];
  woodTorchLight: number[];
  woodIndices: number[];
  woodVertexOffset: number;
  waterPositions: number[];
  waterNormals: number[];
  waterUvs: number[];
  waterIndices: number[];
  waterVertexOffset: number;
  sidePositions: number[];
  sideNormals: number[];
  sideUvs: number[];
  sideSkyLight: number[];
  sideTorchLight: number[];
  sideIndices: number[];
  sideVertexOffset: number;
  waterSidePositions: number[];
  waterSideNormals: number[];
  waterSideUvs: number[];
  waterSideIndices: number[];
  waterSideVertexOffset: number;
  // Snow biome buffers
  snowPositions: number[];
  snowNormals: number[];
  snowUvs: number[];
  snowSkyLight: number[];
  snowTorchLight: number[];
  snowIndices: number[];
  snowVertexOffset: number;
  icePositions: number[];
  iceNormals: number[];
  iceUvs: number[];
  iceSkyLight: number[];
  iceTorchLight: number[];
  iceIndices: number[];
  iceVertexOffset: number;
  // Moon terrain buffers
  moonRockPositions: number[];
  moonRockNormals: number[];
  moonRockUvs: number[];
  moonRockSkyLight: number[];
  moonRockTorchLight: number[];
  moonRockIndices: number[];
  moonRockVertexOffset: number;
  // Moon terrain side buffers (for side walls)
  moonRockSidePositions: number[];
  moonRockSideNormals: number[];
  moonRockSideUvs: number[];
  moonRockSideSkyLight: number[];
  moonRockSideTorchLight: number[];
  moonRockSideIndices: number[];
  moonRockSideVertexOffset: number;
}

function createEmptyChunkGeometry(): ChunkGeometry {
  return {
    grassPositions: [], grassNormals: [], grassUvs: [], grassSkyLight: [], grassTorchLight: [], grassIndices: [], grassVertexOffset: 0,
    dirtPositions: [], dirtNormals: [], dirtUvs: [], dirtSkyLight: [], dirtTorchLight: [], dirtIndices: [], dirtVertexOffset: 0,
    stonePositions: [], stoneNormals: [], stoneUvs: [], stoneSkyLight: [], stoneTorchLight: [], stoneIndices: [], stoneVertexOffset: 0,
    sandPositions: [], sandNormals: [], sandUvs: [], sandSkyLight: [], sandTorchLight: [], sandIndices: [], sandVertexOffset: 0,
    woodPositions: [], woodNormals: [], woodUvs: [], woodSkyLight: [], woodTorchLight: [], woodIndices: [], woodVertexOffset: 0,
    waterPositions: [], waterNormals: [], waterUvs: [], waterIndices: [], waterVertexOffset: 0,
    sidePositions: [], sideNormals: [], sideUvs: [], sideSkyLight: [], sideTorchLight: [], sideIndices: [], sideVertexOffset: 0,
    waterSidePositions: [], waterSideNormals: [], waterSideUvs: [], waterSideIndices: [], waterSideVertexOffset: 0,
    snowPositions: [], snowNormals: [], snowUvs: [], snowSkyLight: [], snowTorchLight: [], snowIndices: [], snowVertexOffset: 0,
    icePositions: [], iceNormals: [], iceUvs: [], iceSkyLight: [], iceTorchLight: [], iceIndices: [], iceVertexOffset: 0,
    moonRockPositions: [], moonRockNormals: [], moonRockUvs: [], moonRockSkyLight: [], moonRockTorchLight: [], moonRockIndices: [], moonRockVertexOffset: 0,
    moonRockSidePositions: [], moonRockSideNormals: [], moonRockSideUvs: [], moonRockSideSkyLight: [], moonRockSideTorchLight: [], moonRockSideIndices: [], moonRockSideVertexOffset: 0
  };
}

// Tile data passed from main thread
interface TileData {
  index: number;
  vertices: Vec3[];
  center: Vec3;
  neighbors: number[];
}

// Column data passed from main thread
interface ColumnData {
  tileIndex: number;
  tile: TileData;
  blocks: number[];
}

// Pre-computed tile data for fast access
interface PrecomputedTileData {
  normalizedCenter: Vec3;
  normalizedVertices: Vec3[];
  // Edge midpoint normalized directions (for neighbor lookup)
  edgeMidDirs: Vec3[];
  // Which neighbor is across each edge (index into neighbors array, -1 if none found)
  edgeNeighborIdx: number[];
  // Pre-computed normalized UVs for each vertex (0-1 range, touching edges)
  normalizedUVs: { u: number; v: number }[];
  // Center UV (where the face center maps to in UV space)
  centerUV: { u: number; v: number };
}

// Block types (must match HexBlock.ts)
const HexBlockType = {
  AIR: 0,
  STONE: 1,
  DIRT: 2,
  GRASS: 3,
  WATER: 4,
  SAND: 5,
  WOOD: 6,
  LEAVES: 7,
  // Mineral ores
  ORE_COAL: 8,
  ORE_COPPER: 9,
  ORE_IRON: 10,
  ORE_GOLD: 11,
  ORE_LITHIUM: 12,
  ORE_ALUMINUM: 13,
  ORE_COBALT: 14,
  // Snow biome blocks
  SNOW: 15,
  DIRT_SNOW: 16,
  ICE: 17,
  // Technology blocks
  FURNACE: 18,
  // Glass
  GLASS: 19,
  // Advanced technology blocks
  COMPUTER: 20,
  PRINTER_3D: 21,
  // Moon terrain
  MOON_ROCK: 22
};

// Config passed from main thread
interface LODWorkerConfig {
  radius: number;
  blockHeight: number;
  seaLevel: number;
  maxDepth: number;  // Total depth (for radius calculation)
  waterSurfaceOffset: number;
  lodOffset: number;
  chunkCount: number;
  sideWallThreshold?: number; // Minimum height difference to generate side walls (default: 0.5)
}

// Minimum height difference threshold to generate side walls
// Prevents generating micro-walls between tiles at similar heights
const DEFAULT_SIDE_WALL_THRESHOLD = 0.5; // Half a block height

// Helper to convert depth to radius (0 = bedrock, maxDepth-1 = sky)
function depthToRadius(depth: number, config: LODWorkerConfig): number {
  return config.radius - (config.maxDepth - 1 - depth) * config.blockHeight;
}

// Get sea level depth in new system (0 = bedrock)
function getSeaLevelDepth(config: LODWorkerConfig): number {
  return config.maxDepth - 1 - config.seaLevel;
}

// Message types
interface BuildLODGeometryMessage {
  type: 'buildLODGeometry';
  tileData: Record<number, TileData>;
  blockData: Record<number, number[]>;
  nearbyTiles: number[];
  tileToChunk: Record<number, number>;
  config: LODWorkerConfig;
  torches?: TorchData[];  // Torch positions for vertex lighting
}

interface LODGeometryResultMessage {
  type: 'lodGeometryResult';
  chunkGeometries: ChunkGeometry[];
}

// Cached pre-computed data (persists across messages for same tile structure)
let cachedPrecomputed: Map<number, PrecomputedTileData> | null = null;
let cachedTileCount = 0;

// Worker message handler
self.onmessage = (e: MessageEvent<BuildLODGeometryMessage>) => {
  // NOTE: nearbyTiles is now unused - we build complete LOD for ALL tiles.
  // Kept in interface for backward compatibility, but ignored.
  const { type, tileData, blockData, tileToChunk, config, torches = [] } = e.data;

  if (type === 'buildLODGeometry') {
    const tileToChunkMap = new Map(Object.entries(tileToChunk).map(([k, v]) => [parseInt(k), v]));

    // Reconstruct columns from separate tile and block data
    const columnsMap = new Map<number, ColumnData>();
    for (const [tileIndexStr, tile] of Object.entries(tileData)) {
      const tileIndex = parseInt(tileIndexStr);
      const blocks = blockData[tileIndex];
      if (blocks) {
        columnsMap.set(tileIndex, { tileIndex, tile, blocks });
      }
    }

    // Pre-compute normalized data if not cached or tile count changed
    const tileCount = Object.keys(tileData).length;
    if (!cachedPrecomputed || cachedTileCount !== tileCount) {
      cachedPrecomputed = new Map();
      cachedTileCount = tileCount;

      for (const [tileIndex, column] of columnsMap) {
        const tile = column.tile;
        const numVerts = tile.vertices.length;

        // Normalize center once
        const centerLen = Math.sqrt(tile.center.x * tile.center.x + tile.center.y * tile.center.y + tile.center.z * tile.center.z);
        const normalizedCenter: Vec3 = centerLen > 0
          ? { x: tile.center.x / centerLen, y: tile.center.y / centerLen, z: tile.center.z / centerLen }
          : { x: 0, y: 0, z: 0 };

        // Normalize all vertices once
        const normalizedVertices: Vec3[] = [];
        for (const v of tile.vertices) {
          const vLen = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
          normalizedVertices.push(vLen > 0
            ? { x: v.x / vLen, y: v.y / vLen, z: v.z / vLen }
            : { x: 0, y: 0, z: 0 });
        }

        // Pre-compute edge midpoint directions
        const edgeMidDirs: Vec3[] = [];
        for (let i = 0; i < numVerts; i++) {
          const next = (i + 1) % numVerts;
          const v1 = tile.vertices[i];
          const v2 = tile.vertices[next];
          const midX = v1.x + v2.x;
          const midY = v1.y + v2.y;
          const midZ = v1.z + v2.z;
          const midLen = Math.sqrt(midX * midX + midY * midY + midZ * midZ);
          edgeMidDirs.push(midLen > 0
            ? { x: midX / midLen, y: midY / midLen, z: midZ / midLen }
            : { x: 0, y: 0, z: 0 });
        }

        // Pre-compute which neighbor is across each edge
        const edgeNeighborIdx: number[] = [];
        for (let i = 0; i < numVerts; i++) {
          const edgeMidDir = edgeMidDirs[i];
          let closestNeighbor = -1;
          let closestDist = Infinity;

          for (const nIdx of tile.neighbors) {
            const neighborColumn = columnsMap.get(nIdx);
            if (!neighborColumn) continue;

            const nc = neighborColumn.tile.center;
            const ncLen = Math.sqrt(nc.x * nc.x + nc.y * nc.y + nc.z * nc.z);
            if (ncLen === 0) continue;

            const ncNormX = nc.x / ncLen;
            const ncNormY = nc.y / ncLen;
            const ncNormZ = nc.z / ncLen;

            const dx = ncNormX - edgeMidDir.x;
            const dy = ncNormY - edgeMidDir.y;
            const dz = ncNormZ - edgeMidDir.z;
            const dist = dx * dx + dy * dy + dz * dz;

            if (dist < closestDist) {
              closestDist = dist;
              closestNeighbor = nIdx;
            }
          }
          edgeNeighborIdx.push(closestNeighbor);
        }

        // Pre-compute local coordinate system for UV mapping
        // Create tangent and bitangent vectors perpendicular to the normal
        const up: Vec3 = Math.abs(normalizedCenter.y) < 0.9
          ? { x: 0, y: 1, z: 0 }
          : { x: 1, y: 0, z: 0 };

        // tangent = cross(up, normal)
        const tangentX = up.y * normalizedCenter.z - up.z * normalizedCenter.y;
        const tangentY = up.z * normalizedCenter.x - up.x * normalizedCenter.z;
        const tangentZ = up.x * normalizedCenter.y - up.y * normalizedCenter.x;
        const tangentLen = Math.sqrt(tangentX * tangentX + tangentY * tangentY + tangentZ * tangentZ);
        const tangent: Vec3 = tangentLen > 0
          ? { x: tangentX / tangentLen, y: tangentY / tangentLen, z: tangentZ / tangentLen }
          : { x: 1, y: 0, z: 0 };

        // bitangent = cross(normal, tangent)
        const bitangentX = normalizedCenter.y * tangent.z - normalizedCenter.z * tangent.y;
        const bitangentY = normalizedCenter.z * tangent.x - normalizedCenter.x * tangent.z;
        const bitangentZ = normalizedCenter.x * tangent.y - normalizedCenter.y * tangent.x;
        const bitangent: Vec3 = { x: bitangentX, y: bitangentY, z: bitangentZ };

        // Project vertices onto local 2D plane and find bounding box
        const localCoords: { u: number; v: number }[] = [];
        let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;

        for (const vert of tile.vertices) {
          // Vector from center to vertex
          const toVertX = vert.x - tile.center.x;
          const toVertY = vert.y - tile.center.y;
          const toVertZ = vert.z - tile.center.z;

          // Project onto tangent and bitangent
          const u = toVertX * tangent.x + toVertY * tangent.y + toVertZ * tangent.z;
          const v = toVertX * bitangent.x + toVertY * bitangent.y + toVertZ * bitangent.z;
          localCoords.push({ u, v });

          minU = Math.min(minU, u);
          maxU = Math.max(maxU, u);
          minV = Math.min(minV, v);
          maxV = Math.max(maxV, v);
        }

        // Normalize UVs to 0-1 range
        const rangeU = maxU - minU;
        const rangeV = maxV - minV;
        const normalizedUVs: { u: number; v: number }[] = localCoords.map(coord => ({
          u: (coord.u - minU) / rangeU,
          v: (coord.v - minV) / rangeV
        }));

        // Center UV (the center vertex at (0,0) in local coords maps to this UV)
        const centerUV = {
          u: (0 - minU) / rangeU,
          v: (0 - minV) / rangeV
        };

        cachedPrecomputed.set(tileIndex, {
          normalizedCenter,
          normalizedVertices,
          edgeMidDirs,
          edgeNeighborIdx,
          normalizedUVs,
          centerUV
        });
      }
    }

    const chunkGeometries: ChunkGeometry[] = [];
    for (let i = 0; i < config.chunkCount; i++) {
      chunkGeometries.push(createEmptyChunkGeometry());
    }

    const seaLevelDepth = getSeaLevelDepth(config);
    // Use waterSurfaceOffset (not lodOffset) so LOD water matches detailed water surface height
    const waterRadius = depthToRadius(seaLevelDepth, config) - config.waterSurfaceOffset;

    // Combined first pass: calculate display radius AND surface block type for each tile
    // This eliminates redundant block array searches
    interface TileInfo {
      radius: number;           // Display radius for LOD rendering
      isWater: boolean;         // True if surface is water
      surfaceBlockType: number; // The topmost non-air block type
      terrainRadius: number;    // Radius of actual solid terrain (for water walls)
    }
    const tileInfo = new Map<number, TileInfo>();

    for (const [tileIndex, column] of columnsMap) {
      // Find surface depth (topmost non-air block, searching from top down)
      let surfaceDepth = 0;
      let surfaceBlockType = HexBlockType.GRASS;
      let terrainDepth = 0; // Topmost solid block (ignoring water)
      const blocks = column.blocks;
      for (let d = blocks.length - 1; d >= 0; d--) {
        if (blocks[d] !== HexBlockType.AIR) {
          if (surfaceBlockType === HexBlockType.GRASS) {
            // First non-air block found
            surfaceDepth = d;
            surfaceBlockType = blocks[d];
          }
          if (blocks[d] !== HexBlockType.WATER) {
            // First solid (non-water) block found
            terrainDepth = d;
            break;
          }
        }
      }

      const isWater = surfaceBlockType === HexBlockType.WATER;
      const displayRadius = isWater
        ? waterRadius
        : depthToRadius(surfaceDepth, config) - config.lodOffset;
      const terrainRadius = depthToRadius(terrainDepth, config) - config.lodOffset;

      tileInfo.set(tileIndex, { radius: displayRadius, isWater, surfaceBlockType, terrainRadius });
    }

    // NOTE: Do NOT do camera-based back-face culling here - the geometry is built once
    // but the camera moves after. THREE.js handles per-chunk frustum culling at render time
    // via cullLODChunks() in Planet.ts

    // Second pass: build top faces for LOD tiles (uses cached data)
    // NOTE: We build ALL tiles now - no exclusions. Per-tile visibility toggling
    // handles showing/hiding LOD vs detailed terrain at runtime.
    for (const [tileIndex] of columnsMap) {
      const precomputed = cachedPrecomputed.get(tileIndex)!;
      const info = tileInfo.get(tileIndex)!
      const displayRadius = info.radius;
      const surfaceBlockType = info.surfaceBlockType;

      const chunkIdx = tileToChunkMap.get(tileIndex) ?? 0;
      const chunk = chunkGeometries[chunkIdx];

      // Select buffer based on surface type
      let positions: number[], normals: number[], uvs: number[], skyLight: number[] | null, torchLight: number[] | null, indices: number[];
      let vertexOffset: number;

      if (surfaceBlockType === HexBlockType.WATER) {
        positions = chunk.waterPositions;
        normals = chunk.waterNormals;
        uvs = chunk.waterUvs;
        skyLight = null; // Water uses different shader, doesn't need skyLight
        torchLight = null;
        indices = chunk.waterIndices;
        vertexOffset = chunk.waterVertexOffset;
      } else if (surfaceBlockType === HexBlockType.DIRT) {
        positions = chunk.dirtPositions;
        normals = chunk.dirtNormals;
        uvs = chunk.dirtUvs;
        skyLight = chunk.dirtSkyLight;
        torchLight = chunk.dirtTorchLight;
        indices = chunk.dirtIndices;
        vertexOffset = chunk.dirtVertexOffset;
      } else if (surfaceBlockType === HexBlockType.STONE) {
        positions = chunk.stonePositions;
        normals = chunk.stoneNormals;
        uvs = chunk.stoneUvs;
        skyLight = chunk.stoneSkyLight;
        torchLight = chunk.stoneTorchLight;
        indices = chunk.stoneIndices;
        vertexOffset = chunk.stoneVertexOffset;
      } else if (surfaceBlockType === HexBlockType.SAND) {
        positions = chunk.sandPositions;
        normals = chunk.sandNormals;
        uvs = chunk.sandUvs;
        skyLight = chunk.sandSkyLight;
        torchLight = chunk.sandTorchLight;
        indices = chunk.sandIndices;
        vertexOffset = chunk.sandVertexOffset;
      } else if (surfaceBlockType === HexBlockType.WOOD) {
        positions = chunk.woodPositions;
        normals = chunk.woodNormals;
        uvs = chunk.woodUvs;
        skyLight = chunk.woodSkyLight;
        torchLight = chunk.woodTorchLight;
        indices = chunk.woodIndices;
        vertexOffset = chunk.woodVertexOffset;
      } else if (surfaceBlockType === HexBlockType.SNOW || surfaceBlockType === HexBlockType.DIRT_SNOW) {
        positions = chunk.snowPositions;
        normals = chunk.snowNormals;
        uvs = chunk.snowUvs;
        skyLight = chunk.snowSkyLight;
        torchLight = chunk.snowTorchLight;
        indices = chunk.snowIndices;
        vertexOffset = chunk.snowVertexOffset;
      } else if (surfaceBlockType === HexBlockType.ICE || surfaceBlockType === HexBlockType.GLASS) {
        positions = chunk.icePositions;
        normals = chunk.iceNormals;
        uvs = chunk.iceUvs;
        skyLight = chunk.iceSkyLight;
        torchLight = chunk.iceTorchLight;
        indices = chunk.iceIndices;
        vertexOffset = chunk.iceVertexOffset;
      } else if (surfaceBlockType === HexBlockType.MOON_ROCK) {
        positions = chunk.moonRockPositions;
        normals = chunk.moonRockNormals;
        uvs = chunk.moonRockUvs;
        skyLight = chunk.moonRockSkyLight;
        torchLight = chunk.moonRockTorchLight;
        indices = chunk.moonRockIndices;
        vertexOffset = chunk.moonRockVertexOffset;
      } else {
        // GRASS, LEAVES, or any other type defaults to grass
        positions = chunk.grassPositions;
        normals = chunk.grassNormals;
        uvs = chunk.grassUvs;
        skyLight = chunk.grassSkyLight;
        torchLight = chunk.grassTorchLight;
        indices = chunk.grassIndices;
        vertexOffset = chunk.grassVertexOffset;
      }

      // Use pre-computed normalized center, vertices, and UVs
      const normal = precomputed.normalizedCenter;
      const normalizedVerts = precomputed.normalizedVertices;
      const normalizedUVs = precomputed.normalizedUVs;
      const centerUV = precomputed.centerUV;

      // Fan triangulation from center
      const centerIdx = vertexOffset;
      const cx = normal.x * displayRadius;
      const cy = normal.y * displayRadius;
      const cz = normal.z * displayRadius;
      positions.push(cx, cy, cz);
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(centerUV.u, centerUV.v);
      if (skyLight) skyLight.push(1.0); // LOD terrain is always at surface, full sky exposure
      if (torchLight) torchLight.push(calculateTorchLight(cx, cy, cz, torches));
      vertexOffset++;

      for (let i = 0; i < normalizedVerts.length; i++) {
        const nv = normalizedVerts[i];
        const vx = nv.x * displayRadius;
        const vy = nv.y * displayRadius;
        const vz = nv.z * displayRadius;
        positions.push(vx, vy, vz);
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(normalizedUVs[i].u, normalizedUVs[i].v);
        if (skyLight) skyLight.push(1.0);
        if (torchLight) torchLight.push(calculateTorchLight(vx, vy, vz, torches));
        vertexOffset++;

        indices.push(centerIdx, centerIdx + 1 + i, centerIdx + 1 + ((i + 1) % normalizedVerts.length));
      }

      // Update offset
      if (surfaceBlockType === HexBlockType.WATER) {
        chunk.waterVertexOffset = vertexOffset;
      } else if (surfaceBlockType === HexBlockType.DIRT) {
        chunk.dirtVertexOffset = vertexOffset;
      } else if (surfaceBlockType === HexBlockType.STONE) {
        chunk.stoneVertexOffset = vertexOffset;
      } else if (surfaceBlockType === HexBlockType.SAND) {
        chunk.sandVertexOffset = vertexOffset;
      } else if (surfaceBlockType === HexBlockType.WOOD) {
        chunk.woodVertexOffset = vertexOffset;
      } else if (surfaceBlockType === HexBlockType.SNOW || surfaceBlockType === HexBlockType.DIRT_SNOW) {
        chunk.snowVertexOffset = vertexOffset;
      } else if (surfaceBlockType === HexBlockType.ICE || surfaceBlockType === HexBlockType.GLASS) {
        chunk.iceVertexOffset = vertexOffset;
      } else if (surfaceBlockType === HexBlockType.MOON_ROCK) {
        chunk.moonRockVertexOffset = vertexOffset;
      } else {
        chunk.grassVertexOffset = vertexOffset;
      }
    }

    // Third pass: generate side walls (uses cached edge-neighbor mapping)
    // Use threshold to avoid generating micro-walls between tiles at similar heights
    const sideWallThreshold = config.sideWallThreshold ?? DEFAULT_SIDE_WALL_THRESHOLD;

    for (const [tileIndex] of columnsMap) {
      const precomputed = cachedPrecomputed.get(tileIndex)!;
      const info = tileInfo.get(tileIndex)!
      const thisRadius = info.radius;
      const thisIsWater = info.isWater;
      const thisIsMoonRock = info.surfaceBlockType === HexBlockType.MOON_ROCK;
      const normalizedVerts = precomputed.normalizedVertices;
      const edgeNeighborIdx = precomputed.edgeNeighborIdx;
      const numSides = normalizedVerts.length;

      const chunkIdx = tileToChunkMap.get(tileIndex) ?? 0;
      const chunk = chunkGeometries[chunkIdx];

      for (let i = 0; i < numSides; i++) {
        const neighborTileIdx = edgeNeighborIdx[i];
        if (neighborTileIdx < 0) continue;

        const neighborInfo = tileInfo.get(neighborTileIdx);
        if (!neighborInfo) continue;

        const neighborRadius = neighborInfo.radius;

        // Generate wall only when this tile is significantly higher than neighbor
        // This applies to both solid and water tiles - walls show height differences
        // Use threshold to avoid generating micro-walls between similar height tiles
        if (thisRadius <= neighborRadius + sideWallThreshold) continue;

        const next = (i + 1) % numSides;
        const nv1 = normalizedVerts[i];
        const nv2 = normalizedVerts[next];

        // Create wall vertices using pre-normalized directions
        const innerV1x = nv1.x * neighborRadius, innerV1y = nv1.y * neighborRadius, innerV1z = nv1.z * neighborRadius;
        const innerV2x = nv2.x * neighborRadius, innerV2y = nv2.y * neighborRadius, innerV2z = nv2.z * neighborRadius;
        const outerV1x = nv1.x * thisRadius, outerV1y = nv1.y * thisRadius, outerV1z = nv1.z * thisRadius;
        const outerV2x = nv2.x * thisRadius, outerV2y = nv2.y * thisRadius, outerV2z = nv2.z * thisRadius;

        // Calculate side normal
        const edge1x = innerV2x - innerV1x, edge1y = innerV2y - innerV1y, edge1z = innerV2z - innerV1z;
        const edge2x = outerV1x - innerV1x, edge2y = outerV1y - innerV1y, edge2z = outerV1z - innerV1z;
        const crossX = edge1y * edge2z - edge1z * edge2y;
        const crossY = edge1z * edge2x - edge1x * edge2z;
        const crossZ = edge1x * edge2y - edge1y * edge2x;
        const crossLen = Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ);
        const snx = crossLen > 0 ? crossX / crossLen : 0;
        const sny = crossLen > 0 ? crossY / crossLen : 0;
        const snz = crossLen > 0 ? crossZ / crossLen : 0;

        // Select buffers based on block type: water, moon rock, or default (dirt)
        let positions: number[], normals: number[], uvs: number[], skyLight: number[] | null, sideTorchLight: number[] | null, indices: number[], baseIdx: number;
        if (thisIsWater) {
          positions = chunk.waterSidePositions;
          normals = chunk.waterSideNormals;
          uvs = chunk.waterSideUvs;
          skyLight = null;
          sideTorchLight = null;
          indices = chunk.waterSideIndices;
          baseIdx = chunk.waterSideVertexOffset;
        } else if (thisIsMoonRock) {
          positions = chunk.moonRockSidePositions;
          normals = chunk.moonRockSideNormals;
          uvs = chunk.moonRockSideUvs;
          skyLight = chunk.moonRockSideSkyLight;
          sideTorchLight = chunk.moonRockSideTorchLight;
          indices = chunk.moonRockSideIndices;
          baseIdx = chunk.moonRockSideVertexOffset;
        } else {
          positions = chunk.sidePositions;
          normals = chunk.sideNormals;
          uvs = chunk.sideUvs;
          skyLight = chunk.sideSkyLight;
          sideTorchLight = chunk.sideTorchLight;
          indices = chunk.sideIndices;
          baseIdx = chunk.sideVertexOffset;
        }

        positions.push(
          innerV1x, innerV1y, innerV1z,
          innerV2x, innerV2y, innerV2z,
          outerV2x, outerV2y, outerV2z,
          outerV1x, outerV1y, outerV1z
        );

        normals.push(snx, sny, snz, snx, sny, snz, snx, sny, snz, snx, sny, snz);
        uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
        if (skyLight) skyLight.push(1.0, 1.0, 1.0, 1.0); // Full sky exposure for LOD
        if (sideTorchLight) {
          sideTorchLight.push(
            calculateTorchLight(innerV1x, innerV1y, innerV1z, torches),
            calculateTorchLight(innerV2x, innerV2y, innerV2z, torches),
            calculateTorchLight(outerV2x, outerV2y, outerV2z, torches),
            calculateTorchLight(outerV1x, outerV1y, outerV1z, torches)
          );
        }

        indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
        indices.push(baseIdx, baseIdx + 2, baseIdx + 3);

        if (thisIsWater) {
          chunk.waterSideVertexOffset += 4;
        } else if (thisIsMoonRock) {
          chunk.moonRockSideVertexOffset += 4;
        } else {
          chunk.sideVertexOffset += 4;
        }
      }
    }

    // NOTE: Fourth pass (water boundary walls at LOD/terrain edge) removed.
    // Since we now build complete LOD for ALL tiles (no exclusions), there's no
    // LOD/terrain boundary anymore - just per-tile visibility swapping at runtime.

    const result: LODGeometryResultMessage = {
      type: 'lodGeometryResult',
      chunkGeometries
    };

    self.postMessage(result);
  }
};

export {};
