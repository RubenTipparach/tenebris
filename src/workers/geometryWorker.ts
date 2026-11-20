// Geometry Worker - builds terrain geometry off the main thread
// Uses plain JavaScript math instead of THREE.js (not available in workers)

import { packFloatAttributes, PackedColumnSet, unpackColumnSet } from './packedTiles';
import { HexBlockType, blockFaces, bufferKey } from '../shared/blockTypes';
import {
  Vec3,
  vec3,
  vec3Clone,
  vec3Sub,
  vec3Scale,
  vec3Dot,
  vec3Cross,
  vec3Normalize,
  vec3Negate
} from '../shared/vec3';
import { SKY_LIGHT_FALLOFF, MIN_SKY_LIGHT, buildWaterWallAtDepth } from '../shared/geometry';

// Torch data for vertex lighting calculation
interface TorchData {
  position: Vec3;
  range: number;
  intensity: number;
}

// Geometry data structure (matches Planet.ts)
interface GeometryData {
  positions: number[];
  normals: number[];
  uvs: number[];
  colors: number[];
  skyLight: number[];
  torchLight: number[];  // Baked torch light level per vertex
  indices: number[];
  vertexOffset: number;
}

function createEmptyGeometryData(): GeometryData {
  return { positions: [], normals: [], uvs: [], colors: [], skyLight: [], torchLight: [], indices: [], vertexOffset: 0 };
}

// Tile data passed from main thread
interface TileData {
  index: number;
  vertices: Vec3[];  // Tile corner vertices
  center: Vec3;      // Tile center
  neighbors: number[];
}

// Column data passed from main thread
interface ColumnData {
  tileIndex: number;
  tile: TileData;
  blocks: number[];  // HexBlockType values
}

// HexBlockType is imported from shared/blockTypes

// Config passed from main thread
interface WorkerConfig {
  radius: number;
  blockHeight: number;
  seaLevel: number;
  maxDepth: number;  // Total depth (for radius calculation)
  deepThreshold: number;
  waterSurfaceOffset: number;
  sunDirection: Vec3;
  uvScale: number;  // Texture tiling scale
  torches?: TorchData[];  // Nearby torches for vertex lighting (optional)
}

// Helper to convert depth to radius (0 = bedrock, maxDepth-1 = sky)
function depthToRadius(depth: number, config: WorkerConfig): number {
  return config.radius - (config.maxDepth - 1 - depth) * config.blockHeight;
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

// Neighbor data includes both blocks and vertices for water wall generation
interface NeighborData {
  blocks: number[];
  vertices: Vec3[];
}

// Message types
interface BuildGeometryMessage {
  type: 'buildGeometry';
  columns: ColumnData[];
  neighborData: Record<string, NeighborData>; // tileIndex -> blocks and vertices for neighbor lookup
  config: WorkerConfig;
  // Packed form of columns / neighborData (cheap to post); decoded below
  packedColumns?: PackedColumnSet;
  packedNeighbors?: PackedColumnSet;
}

// New chunk-aware build message
interface BuildChunkGeometryMessage {
  type: 'buildChunkGeometry';
  columns: ColumnData[];
  neighborData: Record<string, NeighborData>;
  tileToChunk: Record<number, number>;  // Tile index -> chunk index mapping
  chunksToRebuild: number[];  // Which chunks are being rebuilt
  config: WorkerConfig;
}

// Mesher output: buffers keyed '<material>Data' (see bufferKey), only for
// materials that occur
type GeometryResultMessage = { type: 'geometryResult' } & Record<string, GeometryData | string>;

// Per-chunk geometry data for chunk rebuilds
type ChunkGeometryData = Record<string, GeometryData>;

interface ChunkGeometryResultMessage {
  type: 'chunkGeometryResult';
  chunkGeometries: Record<number, ChunkGeometryData>;  // chunk index -> geometry
  chunksRebuilt: number[];  // Which chunks were rebuilt
}


// Check if a block type is transparent (air, water, ice, or glass)
function isTransparentBlock(blockType: HexBlockType): boolean {
  return blockType === HexBlockType.AIR || blockType === HexBlockType.WATER || blockType === HexBlockType.ICE || blockType === HexBlockType.GLASS;
}

// Check if a column has an exposed side at the given depth
function hasExposedSide(
  column: ColumnData,
  depth: number,
  neighborDataMap: Map<number, NeighborData>
): boolean {
  const blockType = column.blocks[depth];
  if (blockType === HexBlockType.AIR || blockType === HexBlockType.WATER) return false;

  for (const neighborIndex of column.tile.neighbors) {
    const neighborInfo = neighborDataMap.get(neighborIndex);
    if (!neighborInfo) return true; // No neighbor data = edge of loaded area

    const neighborBlock = neighborInfo.blocks[depth];
    if (neighborBlock === undefined) return true;
    if (isTransparentBlock(neighborBlock)) {
      return true;
    }
  }
  return false;
}

// Merge geometry into target data (simplified version without THREE.js)
// Optimized: uses push.apply for batch operations instead of individual pushes
function mergeGeometry(
  target: GeometryData,
  positions: number[],
  normals: number[],
  uvs: number[],
  indices: number[],
  _sunDirection: Vec3,
  skyLightLevel: number,
  torches: TorchData[] = []
): void {
  const vertexCount = positions.length / 3;
  const baseIndex = target.vertexOffset;

  // Batch push arrays (much faster than individual pushes)
  // Note: push.apply has a limit (~100k args) but face geometry is small
  target.positions.push.apply(target.positions, positions);
  target.normals.push.apply(target.normals, normals);
  target.uvs.push.apply(target.uvs, uvs);

  // Add vertex colors (white, lighting handled in shader)
  // Pre-build array then batch push
  const colorsToAdd = new Array(vertexCount * 3);
  for (let i = 0; i < vertexCount; i++) {
    const idx = i * 3;
    colorsToAdd[idx] = 1;
    colorsToAdd[idx + 1] = 1;
    colorsToAdd[idx + 2] = 1;
  }
  target.colors.push.apply(target.colors, colorsToAdd);

  // Add sky light - pre-build array
  const skyLightToAdd = new Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) {
    skyLightToAdd[i] = skyLightLevel;
  }
  target.skyLight.push.apply(target.skyLight, skyLightToAdd);

  // Add torch light - calculate per vertex based on position
  const torchLightToAdd = new Array(vertexCount);
  for (let i = 0; i < vertexCount; i++) {
    const px = positions[i * 3];
    const py = positions[i * 3 + 1];
    const pz = positions[i * 3 + 2];
    torchLightToAdd[i] = calculateTorchLight(px, py, pz, torches);
  }
  target.torchLight.push.apply(target.torchLight, torchLightToAdd);

  // Add indices with offset - pre-build array
  const indicesToAdd = new Array(indices.length);
  for (let i = 0; i < indices.length; i++) {
    indicesToAdd[i] = indices[i] + baseIndex;
  }
  target.indices.push.apply(target.indices, indicesToAdd);

  target.vertexOffset += vertexCount;
}

// Create geometry for a hex column face (top, bottom, or sides)
function createFaceGeometry(
  tile: TileData,
  innerRadius: number,
  outerRadius: number,
  isTop: boolean,
  isBottom: boolean,
  isSides: boolean,
  _uvScale: number = 10
): { positions: number[]; normals: number[]; uvs: number[]; indices: number[] } | null {
  const numSides = tile.vertices.length;
  const radialDir = vec3Normalize(tile.center);

  // Scale vertices to inner and outer radii
  const innerVerts: Vec3[] = [];
  const outerVerts: Vec3[] = [];

  for (const v of tile.vertices) {
    const dir = vec3Normalize(v);
    innerVerts.push(vec3Scale(dir, innerRadius));
    outerVerts.push(vec3Scale(dir, outerRadius));
  }

  const innerCenter = vec3Scale(radialDir, innerRadius);
  const outerCenter = vec3Scale(radialDir, outerRadius);

  // Create local tangent space for UV mapping
  const localUp = vec3Clone(radialDir);
  let localRight = vec3(1, 0, 0);
  if (Math.abs(vec3Dot(localUp, localRight)) > 0.9) {
    localRight = vec3(0, 0, 1);
  }
  const localForward = vec3Normalize(vec3Cross(localUp, localRight));
  localRight = vec3Normalize(vec3Cross(localForward, localUp));

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  if (isTop) {
    // Top face - use regular polygon UVs regardless of 3D distortion
    const topNormal = vec3Clone(radialDir);

    // Center vertex at UV center
    positions.push(outerCenter.x, outerCenter.y, outerCenter.z);
    normals.push(topNormal.x, topNormal.y, topNormal.z);
    uvs.push(0.5, 0.5);

    // Edge vertices with regular polygon UVs (same for all hexagons/pentagons)
    const uvRadius = 0.5; // UV radius from center
    for (let i = 0; i < numSides; i++) {
      const v = outerVerts[i];
      positions.push(v.x, v.y, v.z);
      normals.push(topNormal.x, topNormal.y, topNormal.z);

      // Generate regular polygon UV based on vertex index
      const angle = (i / numSides) * Math.PI * 2 - Math.PI / 2; // Start from top
      const u = 0.5 + Math.cos(angle) * uvRadius;
      const vCoord = 0.5 + Math.sin(angle) * uvRadius;
      uvs.push(u, vCoord);
    }

    for (let i = 0; i < numSides; i++) {
      const next = (i + 1) % numSides;
      indices.push(0, 1 + i, 1 + next);
    }
  } else if (isBottom) {
    // Bottom face - use regular polygon UVs
    const bottomNormal = vec3Negate(radialDir);

    positions.push(innerCenter.x, innerCenter.y, innerCenter.z);
    normals.push(bottomNormal.x, bottomNormal.y, bottomNormal.z);
    uvs.push(0.5, 0.5);

    const uvRadius = 0.5;
    for (let i = 0; i < numSides; i++) {
      const v = innerVerts[i];
      positions.push(v.x, v.y, v.z);
      normals.push(bottomNormal.x, bottomNormal.y, bottomNormal.z);

      // Generate regular polygon UV based on vertex index
      const angle = (i / numSides) * Math.PI * 2 - Math.PI / 2;
      const u = 0.5 + Math.cos(angle) * uvRadius;
      const vCoord = 0.5 + Math.sin(angle) * uvRadius;
      uvs.push(u, vCoord);
    }

    for (let i = 0; i < numSides; i++) {
      const next = (i + 1) % numSides;
      indices.push(0, 1 + next, 1 + i);
    }
  } else if (isSides) {
    // Side faces
    let vertexIndex = 0;

    for (let i = 0; i < numSides; i++) {
      const next = (i + 1) % numSides;

      const outerV1 = outerVerts[i];
      const outerV2 = outerVerts[next];
      const innerV1 = innerVerts[i];
      const innerV2 = innerVerts[next];

      // Calculate side normal using cross product
      const edge1 = vec3Sub(innerV2, innerV1);
      const edge2 = vec3Sub(outerV1, innerV1);
      const sideNormal = vec3Normalize(vec3Cross(edge1, edge2));

      positions.push(
        innerV1.x, innerV1.y, innerV1.z,
        innerV2.x, innerV2.y, innerV2.z,
        outerV2.x, outerV2.y, outerV2.z,
        outerV1.x, outerV1.y, outerV1.z
      );

      for (let j = 0; j < 4; j++) {
        normals.push(sideNormal.x, sideNormal.y, sideNormal.z);
      }

      uvs.push(0, 0, 1, 0, 1, 1, 0, 1);

      indices.push(
        vertexIndex, vertexIndex + 1, vertexIndex + 2,
        vertexIndex, vertexIndex + 2, vertexIndex + 3
      );
      vertexIndex += 4;
    }
  }

  if (positions.length === 0) return null;
  return { positions, normals, uvs, indices };
}

// Build geometry for a single column
// Buffer for a material key, created on first use
function bufferFor(out: Record<string, GeometryData>, materialKey: string): GeometryData {
  const key = bufferKey(materialKey);
  let data = out[key];
  if (!data) {
    data = createEmptyGeometryData();
    out[key] = data;
  }
  return data;
}

function buildColumnGeometry(
  column: ColumnData,
  neighborDataMap: Map<number, NeighborData>,
  config: WorkerConfig,
  out: Record<string, GeometryData>
): void {
  // Find surface depth (topmost solid block, searching from top down)
  // Depth system: 0 = bedrock, maxDepth-1 = sky
  let surfaceDepth = 0;
  for (let d = column.blocks.length - 1; d >= 0; d--) {
    if (column.blocks[d] !== HexBlockType.AIR && column.blocks[d] !== HexBlockType.WATER) {
      surfaceDepth = d;
      break;
    }
  }

  for (let depth = 0; depth < column.blocks.length; depth++) {
    const blockType = column.blocks[depth];
    if (blockType === HexBlockType.AIR) continue;

    const isWater = blockType === HexBlockType.WATER;
    const isIce = blockType === HexBlockType.ICE;
    const isGlass = blockType === HexBlockType.GLASS;
    // In new depth system: "above" = higher depth (toward sky), "below" = lower depth (toward bedrock)
    const blockAbove = depth >= column.blocks.length - 1 ? HexBlockType.AIR : column.blocks[depth + 1];
    const blockBelow = depth === 0 ? HexBlockType.AIR : column.blocks[depth - 1];

    // For face culling: a face is exposed if adjacent block is AIR, or WATER (for non-water blocks), or ICE/GLASS (for non-ice/glass blocks)
    const hasTopExposed = blockAbove === HexBlockType.AIR ||
      (!isWater && blockAbove === HexBlockType.WATER) ||
      (!isIce && !isGlass && (blockAbove === HexBlockType.ICE || blockAbove === HexBlockType.GLASS));
    const hasBottomExposed = blockBelow === HexBlockType.AIR ||
      (!isWater && blockBelow === HexBlockType.WATER) ||
      (!isIce && !isGlass && (blockBelow === HexBlockType.ICE || blockBelow === HexBlockType.GLASS));

    // Water only renders if air is above; Ice/Glass render like solid blocks
    if (isWater && blockAbove !== HexBlockType.AIR && blockAbove !== HexBlockType.ICE && blockAbove !== HexBlockType.GLASS) continue;

    // Ice needs to check for exposed sides too (treated like a solid block for rendering)
    const hasSideExposed = !isWater && hasExposedSide(column, depth, neighborDataMap);

    // Skip if no faces are exposed (water handled separately above)
    if (!isWater && !hasTopExposed && !hasBottomExposed && !hasSideExposed) continue;

    // In new system: higher depth = larger radius (closer to surface)
    let outerRadius = depthToRadius(depth, config);
    let innerRadius = outerRadius - config.blockHeight;

    if (isWater) {
      outerRadius -= config.waterSurfaceOffset;
      innerRadius -= config.waterSurfaceOffset;
    }

    if (innerRadius <= 0) continue;

    // depthFromSurface: positive = below surface (lower depth)
    const depthFromSurface = surfaceDepth - depth;

    // Which material each face of this block uses (shared table)
    const faces = blockFaces(blockType);

    // Calculate sky light (constants imported from shared/geometry)
    let skyLightLevel = 1.0;
    if (depthFromSurface > 0) {
      skyLightLevel = Math.max(MIN_SKY_LIGHT, Math.pow(SKY_LIGHT_FALLOFF, depthFromSurface));
    }

    // Get torches array (default to empty)
    const torches = config.torches || [];

    // Create top face
    if (isWater ? true : hasTopExposed) {
      const topGeom = createFaceGeometry(column.tile, innerRadius, outerRadius, true, false, false, config.uvScale);
      if (topGeom) {
        if (isWater) {
          mergeGeometry(bufferFor(out, 'water'), topGeom.positions, topGeom.normals, topGeom.uvs, topGeom.indices, config.sunDirection, 1.0, torches);
        } else {
          mergeGeometry(bufferFor(out, faces.top), topGeom.positions, topGeom.normals, topGeom.uvs, topGeom.indices, config.sunDirection, skyLightLevel, torches);
        }
      }
    }

    // Create bottom face
    if (!isWater && hasBottomExposed) {
      const bottomGeom = createFaceGeometry(column.tile, innerRadius, outerRadius, false, true, false, config.uvScale);
      if (bottomGeom) {
        const bottomSkyLight = Math.max(MIN_SKY_LIGHT, skyLightLevel * SKY_LIGHT_FALLOFF);
        mergeGeometry(bufferFor(out, faces.bottom), bottomGeom.positions, bottomGeom.normals, bottomGeom.uvs, bottomGeom.indices, config.sunDirection, bottomSkyLight, torches);
      }
    }

    // Create side faces
    if (!isWater && hasSideExposed) {
      const sidesGeom = createFaceGeometry(column.tile, innerRadius, outerRadius, false, false, true, config.uvScale);
      if (sidesGeom) {
        mergeGeometry(bufferFor(out, faces.side), sidesGeom.positions, sidesGeom.normals, sidesGeom.uvs, sidesGeom.indices, config.sunDirection, skyLightLevel, torches);
      }
    }
  }
}

// Worker message handler
self.onmessage = (e: MessageEvent<BuildGeometryMessage | BuildChunkGeometryMessage>) => {
  const { type, config } = e.data;
  let { columns, neighborData } = e.data;
  if (type === 'buildGeometry' && (e.data as BuildGeometryMessage).packedColumns) {
    const msg = e.data as BuildGeometryMessage;
    columns = unpackColumnSet(msg.packedColumns!) as unknown as ColumnData[];
    neighborData = {};
    for (const n of unpackColumnSet(msg.packedNeighbors!)) {
      neighborData[n.tileIndex] = { blocks: n.blocks, vertices: n.tile.vertices } as unknown as NeighborData;
    }
  }

  if (type === 'buildGeometry') {
    // Buffers keyed '<material>Data', created as faces need them
    const buffers: Record<string, GeometryData> = {};

    // Convert neighborData back to Map (it gets serialized as object)
    const neighborDataMap = new Map<number, NeighborData>(
      Object.entries(neighborData as unknown as Record<string, NeighborData>).map(([k, v]) => [parseInt(k), v])
    );

    for (const column of columns) {
      buildColumnGeometry(column, neighborDataMap, config, buffers);

      // Generate water walls for water blocks adjacent to air in neighbors
      for (let depth = 0; depth < column.blocks.length; depth++) {
        if (column.blocks[depth] === HexBlockType.WATER) {
          // Generate walls at each depth where water is adjacent to neighbor's air
          buildWaterWallAtDepth(
            column.tile.vertices,
            column.tile.neighbors,
            column.blocks,
            neighborDataMap,
            depth,
            config,
            bufferFor(buffers, 'water')
          );
        }
      }
    }

    const result: GeometryResultMessage = { type: 'geometryResult', ...buffers };

    // Transfer arrays for better performance
    const transfers: Transferable[] = [];
    packFloatAttributes(result, transfers);
    (self as unknown as Worker).postMessage(result, transfers);
  } else if (type === 'buildChunkGeometry') {
    // Per-chunk geometry build - only rebuild specified chunks
    const chunkData = e.data as BuildChunkGeometryMessage;
    const tileToChunkMap = new Map(
      Object.entries(chunkData.tileToChunk).map(([k, v]) => [parseInt(k), v])
    );

    // Convert neighborData back to Map
    const neighborDataMap = new Map<number, NeighborData>(
      Object.entries(neighborData as unknown as Record<string, NeighborData>).map(([k, v]) => [parseInt(k), v])
    );

    // Create geometry data for each chunk being rebuilt
    const chunkGeometries: Record<number, ChunkGeometryData> = {};
    for (const chunkIndex of chunkData.chunksToRebuild) {
      chunkGeometries[chunkIndex] = {};
    }

    // Build geometry, routing each column to its chunk's buffers
    for (const column of columns) {
      const chunkIndex = tileToChunkMap.get(column.tileIndex);
      if (chunkIndex === undefined || !chunkGeometries[chunkIndex]) continue;

      const chunk = chunkGeometries[chunkIndex];
      buildColumnGeometry(column, neighborDataMap, config, chunk);

      // Generate water walls for water blocks
      for (let depth = 0; depth < column.blocks.length; depth++) {
        if (column.blocks[depth] === HexBlockType.WATER) {
          buildWaterWallAtDepth(
            column.tile.vertices,
            column.tile.neighbors,
            column.blocks,
            neighborDataMap,
            depth,
            config,
            bufferFor(chunk, 'water')
          );
        }
      }
    }

    const result: ChunkGeometryResultMessage = {
      type: 'chunkGeometryResult',
      chunkGeometries,
      chunksRebuilt: chunkData.chunksToRebuild
    };

    const transfers: Transferable[] = [];
    packFloatAttributes(result, transfers);
    (self as unknown as Worker).postMessage(result, transfers);
  }
};

export {};
