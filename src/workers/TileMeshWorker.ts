// Web Worker for generating tile mesh geometry off the main thread
// This worker receives tile data and returns raw geometry arrays

import { HexBlockType, isSolid } from '../shared/blockTypes';
import { SKY_LIGHT_FALLOFF, MIN_SKY_LIGHT } from '../shared/geometry';

export interface TileVertexData {
  index: number;
  center: { x: number; y: number; z: number };
  vertices: { x: number; y: number; z: number }[];
}

export interface WorkerTileRequest {
  type: 'buildTile';
  tileIndex: number;
  tile: TileVertexData;
  blocks: number[];  // HexBlockType[]
  planetCenter: { x: number; y: number; z: number };
  radius: number;
  blockHeight: number;
  seaLevel: number;
  deepThreshold: number;
  maxDepth: number;
  neighborBlocks: Map<number, number[]>;  // neighborIndex -> blocks at same depths
  sunDirection: { x: number; y: number; z: number };  // For vertex lighting
  vertexLightingEnabled: boolean;
  waterSurfaceOffset: number;
  uvScale: number;  // Texture tiling scale from config
}

export interface WorkerTileResponse {
  type: 'tileBuilt';
  tileIndex: number;
  topGeometry: GeometryArrays | null;
  sideGeometry: GeometryArrays | null;
  stoneGeometry: GeometryArrays | null;
  waterGeometry: GeometryArrays | null;
}

export interface GeometryArrays {
  positions: Float32Array;
  normals: Float32Array;
  uvs: Float32Array;
  indices: Uint32Array;
  skyLight: Float32Array;  // Depth-based sky light level per vertex
  colors?: Float32Array;   // Optional vertex colors for sun lighting
}

// Use shared block type constants
const AIR = HexBlockType.AIR;
const WATER = HexBlockType.WATER;

// Lightweight geometry result (before adding lighting)
interface RawGeometry {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
}

// Create hex prism geometry for a tile
function createSeparateGeometries(
  tile: TileVertexData,
  innerRadius: number,
  outerRadius: number,
  planetCenter: { x: number; y: number; z: number },
  isTopExposed: boolean,
  isBottomExposed: boolean,
  areSidesExposed: boolean,
  _uvScale: number = 10
): { top: RawGeometry | null; bottom: RawGeometry | null; sides: RawGeometry | null } {
  const numSides = tile.vertices.length;

  // Calculate radial direction
  const radialDir = {
    x: tile.center.x - planetCenter.x,
    y: tile.center.y - planetCenter.y,
    z: tile.center.z - planetCenter.z
  };
  const radialLen = Math.sqrt(radialDir.x * radialDir.x + radialDir.y * radialDir.y + radialDir.z * radialDir.z);
  radialDir.x /= radialLen;
  radialDir.y /= radialLen;
  radialDir.z /= radialLen;

  // Scale vertices to inner and outer radii
  const innerVerts: { x: number; y: number; z: number }[] = [];
  const outerVerts: { x: number; y: number; z: number }[] = [];

  for (const v of tile.vertices) {
    const dx = v.x - planetCenter.x;
    const dy = v.y - planetCenter.y;
    const dz = v.z - planetCenter.z;
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const nx = dx / len;
    const ny = dy / len;
    const nz = dz / len;

    innerVerts.push({ x: nx * innerRadius, y: ny * innerRadius, z: nz * innerRadius });
    outerVerts.push({ x: nx * outerRadius, y: ny * outerRadius, z: nz * outerRadius });
  }

  const innerCenter = { x: radialDir.x * innerRadius, y: radialDir.y * innerRadius, z: radialDir.z * innerRadius };
  const outerCenter = { x: radialDir.x * outerRadius, y: radialDir.y * outerRadius, z: radialDir.z * outerRadius };

  // Create local tangent space
  let localRightX = 1, localRightY = 0, localRightZ = 0;
  const dotRight = Math.abs(radialDir.x * localRightX + radialDir.y * localRightY + radialDir.z * localRightZ);
  if (dotRight > 0.9) {
    localRightX = 0; localRightY = 0; localRightZ = 1;
  }

  // localForward = cross(radialDir, localRight)
  let localForwardX = radialDir.y * localRightZ - radialDir.z * localRightY;
  let localForwardY = radialDir.z * localRightX - radialDir.x * localRightZ;
  let localForwardZ = radialDir.x * localRightY - radialDir.y * localRightX;
  const forwardLen = Math.sqrt(localForwardX * localForwardX + localForwardY * localForwardY + localForwardZ * localForwardZ);
  localForwardX /= forwardLen;
  localForwardY /= forwardLen;
  localForwardZ /= forwardLen;

  // localRight = cross(localForward, radialDir)
  localRightX = localForwardY * radialDir.z - localForwardZ * radialDir.y;
  localRightY = localForwardZ * radialDir.x - localForwardX * radialDir.z;
  localRightZ = localForwardX * radialDir.y - localForwardY * radialDir.x;
  const rightLen = Math.sqrt(localRightX * localRightX + localRightY * localRightY + localRightZ * localRightZ);
  localRightX /= rightLen;
  localRightY /= rightLen;
  localRightZ /= rightLen;

  let topGeom: RawGeometry | null = null;
  let bottomGeom: RawGeometry | null = null;
  let sidesGeom: RawGeometry | null = null;

  // Pre-compute regular polygon UVs (same for all hexagons/pentagons regardless of 3D distortion)
  const uvRadius = 0.5;
  const tileUVs: { u: number; v: number }[] = [];
  for (let i = 0; i < numSides; i++) {
    const angle = (i / numSides) * Math.PI * 2 - Math.PI / 2; // Start from top
    tileUVs.push({
      u: 0.5 + Math.cos(angle) * uvRadius,
      v: 0.5 + Math.sin(angle) * uvRadius
    });
  }

  // Top face
  if (isTopExposed) {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    positions.push(outerCenter.x, outerCenter.y, outerCenter.z);
    normals.push(radialDir.x, radialDir.y, radialDir.z);
    uvs.push(0.5, 0.5);

    for (let i = 0; i < numSides; i++) {
      const v = outerVerts[i];
      positions.push(v.x, v.y, v.z);
      normals.push(radialDir.x, radialDir.y, radialDir.z);
      uvs.push(tileUVs[i].u, tileUVs[i].v);
    }

    for (let i = 0; i < numSides; i++) {
      const next = (i + 1) % numSides;
      indices.push(0, 1 + i, 1 + next);
    }

    topGeom = { positions, normals, uvs, indices };
  }

  // Bottom face
  if (isBottomExposed) {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const bottomNormalX = -radialDir.x;
    const bottomNormalY = -radialDir.y;
    const bottomNormalZ = -radialDir.z;

    positions.push(innerCenter.x, innerCenter.y, innerCenter.z);
    normals.push(bottomNormalX, bottomNormalY, bottomNormalZ);
    uvs.push(0.5, 0.5);

    for (let i = 0; i < numSides; i++) {
      const v = innerVerts[i];
      positions.push(v.x, v.y, v.z);
      normals.push(bottomNormalX, bottomNormalY, bottomNormalZ);
      uvs.push(tileUVs[i].u, tileUVs[i].v);
    }

    for (let i = 0; i < numSides; i++) {
      const next = (i + 1) % numSides;
      indices.push(0, 1 + next, 1 + i);
    }

    bottomGeom = { positions, normals, uvs, indices };
  }

  // Side faces
  if (areSidesExposed) {
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    let vertexIndex = 0;

    for (let i = 0; i < numSides; i++) {
      const next = (i + 1) % numSides;

      const outerV1 = outerVerts[i];
      const outerV2 = outerVerts[next];
      const innerV1 = innerVerts[i];
      const innerV2 = innerVerts[next];

      // Calculate side normal
      const edgeX = outerV2.x - outerV1.x;
      const edgeY = outerV2.y - outerV1.y;
      const edgeZ = outerV2.z - outerV1.z;
      const edgeLen = Math.sqrt(edgeX * edgeX + edgeY * edgeY + edgeZ * edgeZ);

      const midPointX = (outerV1.x + outerV2.x) * 0.5;
      const midPointY = (outerV1.y + outerV2.y) * 0.5;
      const midPointZ = (outerV1.z + outerV2.z) * 0.5;

      let sideNormalX = midPointX - planetCenter.x;
      let sideNormalY = midPointY - planetCenter.y;
      let sideNormalZ = midPointZ - planetCenter.z;
      let sideNormalLen = Math.sqrt(sideNormalX * sideNormalX + sideNormalY * sideNormalY + sideNormalZ * sideNormalZ);
      sideNormalX /= sideNormalLen;
      sideNormalY /= sideNormalLen;
      sideNormalZ /= sideNormalLen;

      const tangentX = edgeX / edgeLen;
      const tangentY = edgeY / edgeLen;
      const tangentZ = edgeZ / edgeLen;

      const dot = sideNormalX * tangentX + sideNormalY * tangentY + sideNormalZ * tangentZ;
      sideNormalX -= tangentX * dot;
      sideNormalY -= tangentY * dot;
      sideNormalZ -= tangentZ * dot;
      sideNormalLen = Math.sqrt(sideNormalX * sideNormalX + sideNormalY * sideNormalY + sideNormalZ * sideNormalZ);
      sideNormalX /= sideNormalLen;
      sideNormalY /= sideNormalLen;
      sideNormalZ /= sideNormalLen;

      positions.push(
        innerV1.x, innerV1.y, innerV1.z,
        innerV2.x, innerV2.y, innerV2.z,
        outerV2.x, outerV2.y, outerV2.z,
        outerV1.x, outerV1.y, outerV1.z
      );

      for (let j = 0; j < 4; j++) {
        normals.push(sideNormalX, sideNormalY, sideNormalZ);
      }

      uvs.push(0, 0, 1, 0, 1, 0.5, 0, 0.5);

      const baseIdx = vertexIndex;
      indices.push(baseIdx, baseIdx + 1, baseIdx + 2, baseIdx, baseIdx + 2, baseIdx + 3);
      vertexIndex += 4;
    }

    sidesGeom = { positions, normals, uvs, indices };
  }

  return { top: topGeom, bottom: bottomGeom, sides: sidesGeom };
}

// Merge raw geometry arrays into target
function mergeGeometry(
  target: { positions: number[]; normals: number[]; uvs: number[]; skyLight: number[]; indices: number[]; vertexOffset: number },
  source: RawGeometry,
  skyLightLevel: number = 1.0
): void {
  const vertexCount = source.positions.length / 3;

  for (let i = 0; i < source.positions.length; i++) {
    target.positions.push(source.positions[i]);
  }
  for (let i = 0; i < source.normals.length; i++) {
    target.normals.push(source.normals[i]);
  }
  for (let i = 0; i < source.uvs.length; i++) {
    target.uvs.push(source.uvs[i]);
  }
  // Add sky light for each vertex
  for (let i = 0; i < vertexCount; i++) {
    target.skyLight.push(skyLightLevel);
  }
  for (let i = 0; i < source.indices.length; i++) {
    target.indices.push(source.indices[i] + target.vertexOffset);
  }
  target.vertexOffset += vertexCount;
}

// Build complete tile mesh geometry
function buildTileMesh(request: WorkerTileRequest): WorkerTileResponse {
  const { tile, blocks, radius, blockHeight, deepThreshold, uvScale } = request;

  const topData = { positions: [] as number[], normals: [] as number[], uvs: [] as number[], skyLight: [] as number[], indices: [] as number[], vertexOffset: 0 };
  const sideData = { positions: [] as number[], normals: [] as number[], uvs: [] as number[], skyLight: [] as number[], indices: [] as number[], vertexOffset: 0 };
  const stoneData = { positions: [] as number[], normals: [] as number[], uvs: [] as number[], skyLight: [] as number[], indices: [] as number[], vertexOffset: 0 };
  const waterData = { positions: [] as number[], normals: [] as number[], uvs: [] as number[], skyLight: [] as number[], indices: [] as number[], vertexOffset: 0 };

  // Find surface depth
  let surfaceDepth = 0;
  for (let d = 0; d < blocks.length; d++) {
    if (blocks[d] !== AIR && blocks[d] !== WATER) {
      surfaceDepth = d;
      break;
    }
  }

  const maxRenderDepth = Math.min(surfaceDepth + 4, blocks.length);

  for (let depth = 0; depth < maxRenderDepth; depth++) {
    const blockType = blocks[depth];
    if (blockType === AIR) continue;

    const isWater = blockType === WATER;

    const blockAbove = depth === 0 ? AIR : blocks[depth - 1];
    const blockBelow = depth === maxRenderDepth - 1 ? AIR : blocks[depth + 1];

    const hasTopExposed = blockAbove === AIR || (!isWater && blockAbove === WATER);
    const hasBottomExposed = blockBelow === AIR || (!isWater && blockBelow === WATER);

    if (isWater && blockAbove !== AIR) continue;

    // Check exposed sides using neighbor data
    let hasSideExposed = false;
    if (!isWater && request.neighborBlocks) {
      for (const [, neighborBlocks] of request.neighborBlocks) {
        if (depth < neighborBlocks.length) {
          const neighborBlock = neighborBlocks[depth];
          if (isSolid(blockType) && (neighborBlock === AIR || neighborBlock === WATER)) {
            hasSideExposed = true;
            break;
          }
        }
      }
    }

    if (!isWater && !hasTopExposed && !hasBottomExposed && !hasSideExposed) continue;

    const outerRadius = radius - depth * blockHeight;
    const innerRadius = outerRadius - blockHeight;
    if (innerRadius <= 0) continue;

    const depthFromSurface = depth - surfaceDepth;
    const isDeep = depthFromSurface >= deepThreshold;

    // Calculate sky light based on depth from surface
    let skyLightLevel = 1.0;
    if (depthFromSurface > 0) {
      skyLightLevel = Math.max(MIN_SKY_LIGHT, Math.pow(SKY_LIGHT_FALLOFF, depthFromSurface));
    }
    const bottomSkyLight = Math.max(MIN_SKY_LIGHT, skyLightLevel * SKY_LIGHT_FALLOFF);

    const { top, bottom, sides } = createSeparateGeometries(
      tile,
      innerRadius,
      outerRadius,
      request.planetCenter,
      isWater ? true : hasTopExposed,
      isWater ? false : hasBottomExposed,
      hasSideExposed,
      uvScale
    );

    if (top) {
      if (isWater) {
        mergeGeometry(waterData, top, 1.0);
      } else if (isDeep) {
        mergeGeometry(stoneData, top, skyLightLevel);
      } else {
        mergeGeometry(topData, top, skyLightLevel);
      }
    }

    if (bottom && !isWater) {
      mergeGeometry(stoneData, bottom, bottomSkyLight);
    }

    if (sides && !isWater) {
      if (isDeep) {
        mergeGeometry(stoneData, sides, skyLightLevel);
      } else {
        mergeGeometry(sideData, sides, skyLightLevel);
      }
    }
  }

  const toGeomArrays = (data: { positions: number[]; normals: number[]; uvs: number[]; skyLight: number[]; indices: number[] }): GeometryArrays | null => {
    if (data.positions.length === 0) return null;
    return {
      positions: new Float32Array(data.positions),
      normals: new Float32Array(data.normals),
      uvs: new Float32Array(data.uvs),
      indices: new Uint32Array(data.indices),
      skyLight: new Float32Array(data.skyLight)
    };
  };

  return {
    type: 'tileBuilt',
    tileIndex: request.tileIndex,
    topGeometry: toGeomArrays(topData),
    sideGeometry: toGeomArrays(sideData),
    stoneGeometry: toGeomArrays(stoneData),
    waterGeometry: toGeomArrays(waterData)
  };
}

// Worker message handler
self.onmessage = (e: MessageEvent<WorkerTileRequest>) => {
  const request = e.data;

  if (request.type === 'buildTile') {
    const response = buildTileMesh(request);

    // Transfer ownership of typed arrays for zero-copy transfer
    const transferables: Transferable[] = [];
    if (response.topGeometry) {
      transferables.push(
        response.topGeometry.positions.buffer as ArrayBuffer,
        response.topGeometry.normals.buffer as ArrayBuffer,
        response.topGeometry.uvs.buffer as ArrayBuffer,
        response.topGeometry.indices.buffer as ArrayBuffer,
        response.topGeometry.skyLight.buffer as ArrayBuffer
      );
    }
    if (response.sideGeometry) {
      transferables.push(
        response.sideGeometry.positions.buffer as ArrayBuffer,
        response.sideGeometry.normals.buffer as ArrayBuffer,
        response.sideGeometry.uvs.buffer as ArrayBuffer,
        response.sideGeometry.indices.buffer as ArrayBuffer,
        response.sideGeometry.skyLight.buffer as ArrayBuffer
      );
    }
    if (response.stoneGeometry) {
      transferables.push(
        response.stoneGeometry.positions.buffer as ArrayBuffer,
        response.stoneGeometry.normals.buffer as ArrayBuffer,
        response.stoneGeometry.uvs.buffer as ArrayBuffer,
        response.stoneGeometry.indices.buffer as ArrayBuffer,
        response.stoneGeometry.skyLight.buffer as ArrayBuffer
      );
    }
    if (response.waterGeometry) {
      transferables.push(
        response.waterGeometry.positions.buffer as ArrayBuffer,
        response.waterGeometry.normals.buffer as ArrayBuffer,
        response.waterGeometry.uvs.buffer as ArrayBuffer,
        response.waterGeometry.indices.buffer as ArrayBuffer,
        response.waterGeometry.skyLight.buffer as ArrayBuffer
      );
    }

    (self as unknown as Worker).postMessage(response, transferables);
  }
};
