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

// Per-chunk geometry buffers
interface ChunkGeometry {
  grassPositions: number[];
  grassNormals: number[];
  grassUvs: number[];
  grassIndices: number[];
  grassVertexOffset: number;
  dirtPositions: number[];
  dirtNormals: number[];
  dirtUvs: number[];
  dirtIndices: number[];
  dirtVertexOffset: number;
  waterPositions: number[];
  waterNormals: number[];
  waterUvs: number[];
  waterIndices: number[];
  waterVertexOffset: number;
  sidePositions: number[];
  sideNormals: number[];
  sideUvs: number[];
  sideIndices: number[];
  sideVertexOffset: number;
  waterSidePositions: number[];
  waterSideNormals: number[];
  waterSideUvs: number[];
  waterSideIndices: number[];
  waterSideVertexOffset: number;
}

function createEmptyChunkGeometry(): ChunkGeometry {
  return {
    grassPositions: [], grassNormals: [], grassUvs: [], grassIndices: [], grassVertexOffset: 0,
    dirtPositions: [], dirtNormals: [], dirtUvs: [], dirtIndices: [], dirtVertexOffset: 0,
    waterPositions: [], waterNormals: [], waterUvs: [], waterIndices: [], waterVertexOffset: 0,
    sidePositions: [], sideNormals: [], sideUvs: [], sideIndices: [], sideVertexOffset: 0,
    waterSidePositions: [], waterSideNormals: [], waterSideUvs: [], waterSideIndices: [], waterSideVertexOffset: 0
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
  LEAVES: 7
};

// Config passed from main thread
interface LODWorkerConfig {
  radius: number;
  blockHeight: number;
  seaLevel: number;
  waterSurfaceOffset: number;
  lodOffset: number;
  chunkCount: number;
  // Camera direction from planet center for back-face culling
  cameraDir?: Vec3;
}

// Message types
interface BuildLODGeometryMessage {
  type: 'buildLODGeometry';
  tileData: Record<number, TileData>;
  blockData: Record<number, number[]>;
  nearbyTiles: number[];
  tileToChunk: Record<number, number>;
  config: LODWorkerConfig;
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
  const { type, tileData, blockData, nearbyTiles, tileToChunk, config } = e.data;

  if (type === 'buildLODGeometry') {
    const nearbyTilesSet = new Set(nearbyTiles);
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

        cachedPrecomputed.set(tileIndex, {
          normalizedCenter,
          normalizedVertices,
          edgeMidDirs,
          edgeNeighborIdx
        });
      }
    }

    const chunkGeometries: ChunkGeometry[] = [];
    for (let i = 0; i < config.chunkCount; i++) {
      chunkGeometries.push(createEmptyChunkGeometry());
    }

    const waterRadius = config.radius - config.seaLevel * config.blockHeight - config.lodOffset;

    // Combined first pass: calculate display radius AND surface block type for each tile
    // This eliminates redundant block array searches
    interface TileInfo {
      radius: number;
      isWater: boolean;
      surfaceBlockType: number;
    }
    const tileInfo = new Map<number, TileInfo>();

    for (const [tileIndex, column] of columnsMap) {
      let surfaceDepth = 0;
      let surfaceBlockType = HexBlockType.GRASS;
      const blocks = column.blocks;
      for (let d = 0; d < blocks.length; d++) {
        if (blocks[d] !== HexBlockType.AIR) {
          surfaceDepth = d;
          surfaceBlockType = blocks[d];
          break;
        }
      }

      const isWater = surfaceBlockType === HexBlockType.WATER;
      const displayRadius = isWater
        ? waterRadius
        : config.radius - surfaceDepth * config.blockHeight - config.lodOffset;

      tileInfo.set(tileIndex, { radius: displayRadius, isWater, surfaceBlockType });
    }

    // Back-face culling threshold: skip tiles facing away from camera
    // Use -0.2 to include tiles slightly past the horizon (for smooth edges)
    const cameraDir = config.cameraDir;
    const CULL_THRESHOLD = -0.2;

    // Second pass: build top faces for LOD tiles (uses cached data)
    for (const [tileIndex] of columnsMap) {
      if (nearbyTilesSet.has(tileIndex)) continue;

      const precomputed = cachedPrecomputed.get(tileIndex)!;

      // Back-face culling: skip tiles facing away from camera
      if (cameraDir) {
        const nc = precomputed.normalizedCenter;
        const dot = nc.x * cameraDir.x + nc.y * cameraDir.y + nc.z * cameraDir.z;
        if (dot < CULL_THRESHOLD) continue;
      }

      const info = tileInfo.get(tileIndex)!
      const displayRadius = info.radius;
      const surfaceBlockType = info.surfaceBlockType;

      const chunkIdx = tileToChunkMap.get(tileIndex) ?? 0;
      const chunk = chunkGeometries[chunkIdx];

      // Select buffer based on surface type
      let positions: number[], normals: number[], uvs: number[], indices: number[];
      let vertexOffset: number;

      if (surfaceBlockType === HexBlockType.WATER) {
        positions = chunk.waterPositions;
        normals = chunk.waterNormals;
        uvs = chunk.waterUvs;
        indices = chunk.waterIndices;
        vertexOffset = chunk.waterVertexOffset;
      } else if (surfaceBlockType === HexBlockType.DIRT) {
        positions = chunk.dirtPositions;
        normals = chunk.dirtNormals;
        uvs = chunk.dirtUvs;
        indices = chunk.dirtIndices;
        vertexOffset = chunk.dirtVertexOffset;
      } else {
        positions = chunk.grassPositions;
        normals = chunk.grassNormals;
        uvs = chunk.grassUvs;
        indices = chunk.grassIndices;
        vertexOffset = chunk.grassVertexOffset;
      }

      // Use pre-computed normalized center and vertices
      const normal = precomputed.normalizedCenter;
      const normalizedVerts = precomputed.normalizedVertices;

      // Fan triangulation from center
      const centerIdx = vertexOffset;
      positions.push(
        normal.x * displayRadius,
        normal.y * displayRadius,
        normal.z * displayRadius
      );
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(0.5, 0.5);
      vertexOffset++;

      for (let i = 0; i < normalizedVerts.length; i++) {
        const nv = normalizedVerts[i];
        positions.push(nv.x * displayRadius, nv.y * displayRadius, nv.z * displayRadius);
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(0, 0);
        vertexOffset++;

        indices.push(centerIdx, centerIdx + 1 + i, centerIdx + 1 + ((i + 1) % normalizedVerts.length));
      }

      // Update offset
      if (surfaceBlockType === HexBlockType.WATER) {
        chunk.waterVertexOffset = vertexOffset;
      } else if (surfaceBlockType === HexBlockType.DIRT) {
        chunk.dirtVertexOffset = vertexOffset;
      } else {
        chunk.grassVertexOffset = vertexOffset;
      }
    }

    // Third pass: generate side walls (uses cached edge-neighbor mapping)
    for (const [tileIndex] of columnsMap) {
      if (nearbyTilesSet.has(tileIndex)) continue;

      const precomputed = cachedPrecomputed.get(tileIndex)!;

      // Back-face culling: skip tiles facing away from camera
      if (cameraDir) {
        const nc = precomputed.normalizedCenter;
        const dot = nc.x * cameraDir.x + nc.y * cameraDir.y + nc.z * cameraDir.z;
        if (dot < CULL_THRESHOLD) continue;
      }

      const info = tileInfo.get(tileIndex)!
      const thisRadius = info.radius;
      const thisIsWater = info.isWater;
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
        const neighborIsWater = neighborInfo.isWater;

        const needsWall = thisRadius > neighborRadius || (thisIsWater && !neighborIsWater);
        if (!needsWall) continue;

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

        const positions = thisIsWater ? chunk.waterSidePositions : chunk.sidePositions;
        const normals = thisIsWater ? chunk.waterSideNormals : chunk.sideNormals;
        const uvs = thisIsWater ? chunk.waterSideUvs : chunk.sideUvs;
        const indices = thisIsWater ? chunk.waterSideIndices : chunk.sideIndices;
        const baseIdx = thisIsWater ? chunk.waterSideVertexOffset : chunk.sideVertexOffset;

        positions.push(
          innerV1x, innerV1y, innerV1z,
          innerV2x, innerV2y, innerV2z,
          outerV2x, outerV2y, outerV2z,
          outerV1x, outerV1y, outerV1z
        );

        normals.push(snx, sny, snz, snx, sny, snz, snx, sny, snz, snx, sny, snz);
        uvs.push(0, 0, 1, 0, 1, 0.5, 0, 0.5);

        indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
        indices.push(baseIdx, baseIdx + 2, baseIdx + 3);

        if (thisIsWater) {
          chunk.waterSideVertexOffset += 4;
        } else {
          chunk.sideVertexOffset += 4;
        }
      }
    }

    // Fourth pass: water boundary walls at LOD/terrain edge
    for (const [tileIndex] of columnsMap) {
      if (nearbyTilesSet.has(tileIndex)) continue;

      const precomputed = cachedPrecomputed.get(tileIndex)!;

      // Back-face culling: skip tiles facing away from camera
      if (cameraDir) {
        const nc = precomputed.normalizedCenter;
        const dot = nc.x * cameraDir.x + nc.y * cameraDir.y + nc.z * cameraDir.z;
        if (dot < CULL_THRESHOLD) continue;
      }

      const info = tileInfo.get(tileIndex);
      if (!info || !info.isWater) continue;
      const normalizedVerts = precomputed.normalizedVertices;
      const edgeNeighborIdx = precomputed.edgeNeighborIdx;
      const numSides = normalizedVerts.length;

      const chunkIdx = tileToChunkMap.get(tileIndex) ?? 0;
      const chunk = chunkGeometries[chunkIdx];

      for (let i = 0; i < numSides; i++) {
        const neighborTileIdx = edgeNeighborIdx[i];
        if (neighborTileIdx < 0) continue;
        if (!nearbyTilesSet.has(neighborTileIdx)) continue;

        const neighborInfo = tileInfo.get(neighborTileIdx);
        if (!neighborInfo) continue;

        const bottomRadius = neighborInfo.radius;
        const topRadius = waterRadius;
        if (bottomRadius >= topRadius) continue;

        const next = (i + 1) % numSides;
        const nv1 = normalizedVerts[i];
        const nv2 = normalizedVerts[next];

        const innerV1x = nv1.x * bottomRadius, innerV1y = nv1.y * bottomRadius, innerV1z = nv1.z * bottomRadius;
        const innerV2x = nv2.x * bottomRadius, innerV2y = nv2.y * bottomRadius, innerV2z = nv2.z * bottomRadius;
        const outerV1x = nv1.x * topRadius, outerV1y = nv1.y * topRadius, outerV1z = nv1.z * topRadius;
        const outerV2x = nv2.x * topRadius, outerV2y = nv2.y * topRadius, outerV2z = nv2.z * topRadius;

        const edge1x = innerV2x - innerV1x, edge1y = innerV2y - innerV1y, edge1z = innerV2z - innerV1z;
        const edge2x = outerV1x - innerV1x, edge2y = outerV1y - innerV1y, edge2z = outerV1z - innerV1z;
        const crossX = edge1y * edge2z - edge1z * edge2y;
        const crossY = edge1z * edge2x - edge1x * edge2z;
        const crossZ = edge1x * edge2y - edge1y * edge2x;
        const crossLen = Math.sqrt(crossX * crossX + crossY * crossY + crossZ * crossZ);
        const snx = crossLen > 0 ? crossX / crossLen : 0;
        const sny = crossLen > 0 ? crossY / crossLen : 0;
        const snz = crossLen > 0 ? crossZ / crossLen : 0;

        const baseIdx = chunk.waterSideVertexOffset;

        chunk.waterSidePositions.push(
          innerV1x, innerV1y, innerV1z,
          innerV2x, innerV2y, innerV2z,
          outerV2x, outerV2y, outerV2z,
          outerV1x, outerV1y, outerV1z
        );

        chunk.waterSideNormals.push(snx, sny, snz, snx, sny, snz, snx, sny, snz, snx, sny, snz);
        chunk.waterSideUvs.push(0, 0, 1, 0, 1, 0.5, 0, 0.5);

        chunk.waterSideIndices.push(baseIdx, baseIdx + 1, baseIdx + 2);
        chunk.waterSideIndices.push(baseIdx, baseIdx + 2, baseIdx + 3);

        chunk.waterSideVertexOffset += 4;
      }
    }

    const result: LODGeometryResultMessage = {
      type: 'lodGeometryResult',
      chunkGeometries
    };

    self.postMessage(result);
  }
};

export {};
