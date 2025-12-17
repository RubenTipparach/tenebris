// Main-thread chunk geometry builder for immediate block updates
// This runs synchronously on the CPU for fast visual feedback

import * as THREE from 'three';
import { HexBlockType } from '../shared/blockTypes';
import {
  Vec3,
  vec3Sub,
  vec3Scale,
  vec3Cross,
  vec3Normalize,
  vec3Negate
} from '../shared/vec3';
import { SKY_LIGHT_FALLOFF, MIN_SKY_LIGHT } from '../shared/geometry';

// Geometry data structure
export interface GeometryData {
  positions: number[];
  normals: number[];
  uvs: number[];
  colors: number[];
  skyLight: number[];
  torchLight: number[];
  indices: number[];
  vertexOffset: number;
}

export function createEmptyGeometryData(): GeometryData {
  return {
    positions: [],
    normals: [],
    uvs: [],
    colors: [],
    skyLight: [],
    torchLight: [],
    indices: [],
    vertexOffset: 0
  };
}

// Chunk geometry data - one per material type
export interface ChunkGeometryData {
  topData: GeometryData;
  sideData: GeometryData;
  grassSideData: GeometryData;
  stoneData: GeometryData;
  sandData: GeometryData;
  woodData: GeometryData;
  waterData: GeometryData;
  oreCoalData: GeometryData;
  oreCopperData: GeometryData;
  oreIronData: GeometryData;
  oreGoldData: GeometryData;
  oreLithiumData: GeometryData;
  oreAluminumData: GeometryData;
  oreCobaltData: GeometryData;
  snowData: GeometryData;
  snowSideData: GeometryData;
  dirtSnowData: GeometryData;
  iceData: GeometryData;
  glassData: GeometryData;
  moonRockData: GeometryData;
}

export function createEmptyChunkGeometryData(): ChunkGeometryData {
  return {
    topData: createEmptyGeometryData(),
    sideData: createEmptyGeometryData(),
    grassSideData: createEmptyGeometryData(),
    stoneData: createEmptyGeometryData(),
    sandData: createEmptyGeometryData(),
    woodData: createEmptyGeometryData(),
    waterData: createEmptyGeometryData(),
    oreCoalData: createEmptyGeometryData(),
    oreCopperData: createEmptyGeometryData(),
    oreIronData: createEmptyGeometryData(),
    oreGoldData: createEmptyGeometryData(),
    oreLithiumData: createEmptyGeometryData(),
    oreAluminumData: createEmptyGeometryData(),
    oreCobaltData: createEmptyGeometryData(),
    snowData: createEmptyGeometryData(),
    snowSideData: createEmptyGeometryData(),
    dirtSnowData: createEmptyGeometryData(),
    iceData: createEmptyGeometryData(),
    glassData: createEmptyGeometryData(),
    moonRockData: createEmptyGeometryData()
  };
}

// Tile data for geometry building
export interface TileData {
  index: number;
  vertices: Vec3[];
  center: Vec3;
  neighbors: number[];
}

// Column data
export interface ColumnData {
  tileIndex: number;
  tile: TileData;
  blocks: number[];
}

// Neighbor data
export interface NeighborData {
  blocks: number[];
  vertices: Vec3[];
}

// Build config
export interface BuildConfig {
  radius: number;
  blockHeight: number;
  seaLevel: number;
  maxDepth: number;
  deepThreshold: number;
  waterSurfaceOffset: number;
  sunDirection: Vec3;
  uvScale: number;
  torches?: TorchData[];
}

export interface TorchData {
  position: Vec3;
  range: number;
  intensity: number;
}

// Helper to convert depth to radius
function depthToRadius(depth: number, config: BuildConfig): number {
  return config.radius - (config.maxDepth - 1 - depth) * config.blockHeight;
}

// Check if block is transparent
function isTransparentBlock(blockType: HexBlockType): boolean {
  return blockType === HexBlockType.AIR ||
         blockType === HexBlockType.WATER ||
         blockType === HexBlockType.ICE ||
         blockType === HexBlockType.GLASS;
}

// Check if column has exposed side at depth
function hasExposedSide(
  column: ColumnData,
  depth: number,
  neighborDataMap: Map<number, NeighborData>
): boolean {
  const blockType = column.blocks[depth];
  if (blockType === HexBlockType.AIR || blockType === HexBlockType.WATER) return false;

  for (const neighborIndex of column.tile.neighbors) {
    const neighborInfo = neighborDataMap.get(neighborIndex);
    if (!neighborInfo) return true;

    const neighborBlock = neighborInfo.blocks[depth];
    if (neighborBlock === undefined) return true;
    if (isTransparentBlock(neighborBlock)) return true;
  }
  return false;
}

// Calculate torch light at position
function calculateTorchLight(x: number, y: number, z: number, torches: TorchData[]): number {
  let totalLight = 0;
  for (const torch of torches) {
    const dx = x - torch.position.x;
    const dy = y - torch.position.y;
    const dz = z - torch.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < torch.range) {
      const attenuation = 1.0 / (1.0 + 2.0 * dist * dist / (torch.range * torch.range));
      totalLight += attenuation * torch.intensity;
    }
  }
  return Math.min(totalLight, 1.5);
}

// Merge geometry into target
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

  target.positions.push(...positions);
  target.normals.push(...normals);
  target.uvs.push(...uvs);

  for (let i = 0; i < vertexCount; i++) {
    target.colors.push(1, 1, 1);
    target.skyLight.push(skyLightLevel);

    const px = positions[i * 3];
    const py = positions[i * 3 + 1];
    const pz = positions[i * 3 + 2];
    target.torchLight.push(calculateTorchLight(px, py, pz, torches));
  }

  for (const idx of indices) {
    target.indices.push(idx + baseIndex);
  }

  target.vertexOffset += vertexCount;
}

// Create face geometry
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

  const innerVerts: Vec3[] = [];
  const outerVerts: Vec3[] = [];

  for (const v of tile.vertices) {
    const dir = vec3Normalize(v);
    innerVerts.push(vec3Scale(dir, innerRadius));
    outerVerts.push(vec3Scale(dir, outerRadius));
  }

  const innerCenter = vec3Scale(radialDir, innerRadius);
  const outerCenter = vec3Scale(radialDir, outerRadius);

  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Pre-compute UVs
  const uvRadius = 0.5;
  const tileUVs: { u: number; v: number }[] = [];
  for (let i = 0; i < numSides; i++) {
    const angle = (i / numSides) * Math.PI * 2 - Math.PI / 2;
    tileUVs.push({
      u: 0.5 + Math.cos(angle) * uvRadius,
      v: 0.5 + Math.sin(angle) * uvRadius
    });
  }

  if (isTop) {
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
  } else if (isBottom) {
    const bottomNormal = vec3Negate(radialDir);

    positions.push(innerCenter.x, innerCenter.y, innerCenter.z);
    normals.push(bottomNormal.x, bottomNormal.y, bottomNormal.z);
    uvs.push(0.5, 0.5);

    for (let i = 0; i < numSides; i++) {
      const v = innerVerts[i];
      positions.push(v.x, v.y, v.z);
      normals.push(bottomNormal.x, bottomNormal.y, bottomNormal.z);
      uvs.push(tileUVs[i].u, tileUVs[i].v);
    }

    for (let i = 0; i < numSides; i++) {
      const next = (i + 1) % numSides;
      indices.push(0, 1 + next, 1 + i);
    }
  } else if (isSides) {
    let vertexIndex = 0;

    for (let i = 0; i < numSides; i++) {
      const next = (i + 1) % numSides;

      const outerV1 = outerVerts[i];
      const outerV2 = outerVerts[next];
      const innerV1 = innerVerts[i];
      const innerV2 = innerVerts[next];

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

// Build water wall at depth
function buildWaterWallAtDepth(
  tileVertices: Vec3[],
  tileNeighbors: number[],
  ownBlocks: number[],
  neighborDataMap: Map<number, NeighborData>,
  depth: number,
  config: BuildConfig,
  waterData: GeometryData
): void {
  if (ownBlocks[depth] !== HexBlockType.WATER) return;

  const numSides = tileVertices.length;
  const edgeThreshold = 0.001;

  for (let i = 0; i < numSides; i++) {
    const next = (i + 1) % numSides;
    const edgeV1 = tileVertices[i];
    const edgeV2 = tileVertices[next];

    let neighborData: NeighborData | undefined;
    for (const neighborIndex of tileNeighbors) {
      const candidate = neighborDataMap.get(neighborIndex);
      if (!candidate) continue;

      let hasV1 = false;
      let hasV2 = false;
      for (const nv of candidate.vertices) {
        if (vec3Distance(nv, edgeV1) < edgeThreshold) hasV1 = true;
        if (vec3Distance(nv, edgeV2) < edgeThreshold) hasV2 = true;
      }

      if (hasV1 && hasV2) {
        neighborData = candidate;
        break;
      }
    }

    if (!neighborData) continue;
    if (neighborData.blocks[depth] !== HexBlockType.AIR) continue;

    const blockAbove = depth < ownBlocks.length - 1 ? ownBlocks[depth + 1] : HexBlockType.AIR;
    const isWaterSurface = blockAbove !== HexBlockType.WATER;

    const blockTopRadius = config.radius - (config.maxDepth - 1 - depth) * config.blockHeight;
    const wallTopRadius = isWaterSurface ? blockTopRadius - config.waterSurfaceOffset : blockTopRadius;
    const wallBottomRadius = config.radius - (config.maxDepth - depth) * config.blockHeight;

    if (wallBottomRadius >= wallTopRadius) continue;

    const dir1 = vec3Normalize(edgeV1);
    const dir2 = vec3Normalize(edgeV2);

    const topV1 = vec3Scale(dir1, wallTopRadius);
    const topV2 = vec3Scale(dir2, wallTopRadius);
    const bottomV1 = vec3Scale(dir1, wallBottomRadius);
    const bottomV2 = vec3Scale(dir2, wallBottomRadius);

    const edge1 = vec3Sub(bottomV2, bottomV1);
    const edge2 = vec3Sub(topV1, bottomV1);
    const sideNormal = vec3Normalize(vec3Cross(edge1, edge2));

    const baseIdx = waterData.vertexOffset;

    waterData.positions.push(
      bottomV1.x, bottomV1.y, bottomV1.z,
      bottomV2.x, bottomV2.y, bottomV2.z,
      topV2.x, topV2.y, topV2.z,
      topV1.x, topV1.y, topV1.z
    );

    for (let j = 0; j < 4; j++) {
      waterData.normals.push(sideNormal.x, sideNormal.y, sideNormal.z);
    }

    waterData.uvs.push(0, 0, 1, 0, 1, 1, 0, 1);
    waterData.skyLight.push(1.0, 1.0, 1.0, 1.0);
    waterData.torchLight.push(0, 0, 0, 0);
    waterData.colors.push(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1);

    waterData.indices.push(
      baseIdx, baseIdx + 1, baseIdx + 2,
      baseIdx, baseIdx + 2, baseIdx + 3
    );

    waterData.vertexOffset += 4;
  }
}

// Build geometry for single column
function buildColumnGeometry(
  column: ColumnData,
  neighborDataMap: Map<number, NeighborData>,
  config: BuildConfig,
  chunkData: ChunkGeometryData
): void {
  // Find surface depth
  let surfaceDepth = 0;
  for (let d = column.blocks.length - 1; d >= 0; d--) {
    if (column.blocks[d] !== HexBlockType.AIR && column.blocks[d] !== HexBlockType.WATER) {
      surfaceDepth = d;
      break;
    }
  }

  const torches = config.torches || [];

  for (let depth = 0; depth < column.blocks.length; depth++) {
    const blockType = column.blocks[depth];
    if (blockType === HexBlockType.AIR) continue;

    const isWater = blockType === HexBlockType.WATER;
    const isIce = blockType === HexBlockType.ICE;
    const isGlass = blockType === HexBlockType.GLASS;

    const blockAbove = depth >= column.blocks.length - 1 ? HexBlockType.AIR : column.blocks[depth + 1];
    const blockBelow = depth === 0 ? HexBlockType.AIR : column.blocks[depth - 1];

    const hasTopExposed = blockAbove === HexBlockType.AIR ||
      (!isWater && blockAbove === HexBlockType.WATER) ||
      (!isIce && !isGlass && (blockAbove === HexBlockType.ICE || blockAbove === HexBlockType.GLASS));
    const hasBottomExposed = blockBelow === HexBlockType.AIR ||
      (!isWater && blockBelow === HexBlockType.WATER) ||
      (!isIce && !isGlass && (blockBelow === HexBlockType.ICE || blockBelow === HexBlockType.GLASS));

    if (isWater && blockAbove !== HexBlockType.AIR && blockAbove !== HexBlockType.ICE && blockAbove !== HexBlockType.GLASS) continue;

    const hasSideExposed = !isWater && hasExposedSide(column, depth, neighborDataMap);

    if (!isWater && !hasTopExposed && !hasBottomExposed && !hasSideExposed) continue;

    let outerRadius = depthToRadius(depth, config);
    let innerRadius = outerRadius - config.blockHeight;

    if (isWater) {
      outerRadius -= config.waterSurfaceOffset;
      innerRadius -= config.waterSurfaceOffset;
    }

    if (innerRadius <= 0) continue;

    const depthFromSurface = surfaceDepth - depth;

    // Select target geometry buffer
    let blockGeomData: GeometryData;
    switch (blockType) {
      case HexBlockType.ORE_COAL: blockGeomData = chunkData.oreCoalData; break;
      case HexBlockType.ORE_COPPER: blockGeomData = chunkData.oreCopperData; break;
      case HexBlockType.ORE_IRON: blockGeomData = chunkData.oreIronData; break;
      case HexBlockType.ORE_GOLD: blockGeomData = chunkData.oreGoldData; break;
      case HexBlockType.ORE_LITHIUM: blockGeomData = chunkData.oreLithiumData; break;
      case HexBlockType.ORE_ALUMINUM: blockGeomData = chunkData.oreAluminumData; break;
      case HexBlockType.ORE_COBALT: blockGeomData = chunkData.oreCobaltData; break;
      case HexBlockType.STONE: blockGeomData = chunkData.stoneData; break;
      case HexBlockType.SAND: blockGeomData = chunkData.sandData; break;
      case HexBlockType.DIRT: blockGeomData = chunkData.sideData; break;
      case HexBlockType.WOOD: blockGeomData = chunkData.woodData; break;
      case HexBlockType.SNOW: blockGeomData = chunkData.snowData; break;
      case HexBlockType.DIRT_SNOW: blockGeomData = chunkData.dirtSnowData; break;
      case HexBlockType.ICE: blockGeomData = chunkData.iceData; break;
      case HexBlockType.GLASS: blockGeomData = chunkData.glassData; break;
      case HexBlockType.MOON_ROCK: blockGeomData = chunkData.moonRockData; break;
      default: blockGeomData = chunkData.topData; break;
    }

    let skyLightLevel = 1.0;
    if (depthFromSurface > 0) {
      skyLightLevel = Math.max(MIN_SKY_LIGHT, Math.pow(SKY_LIGHT_FALLOFF, depthFromSurface));
    }

    // Top face
    if (isWater ? true : hasTopExposed) {
      const topGeom = createFaceGeometry(column.tile, innerRadius, outerRadius, true, false, false, config.uvScale);
      if (topGeom) {
        if (isWater) {
          mergeGeometry(chunkData.waterData, topGeom.positions, topGeom.normals, topGeom.uvs, topGeom.indices, config.sunDirection, 1.0, torches);
        } else {
          mergeGeometry(blockGeomData, topGeom.positions, topGeom.normals, topGeom.uvs, topGeom.indices, config.sunDirection, skyLightLevel, torches);
        }
      }
    }

    // Bottom face
    if (!isWater && hasBottomExposed) {
      const bottomGeom = createFaceGeometry(column.tile, innerRadius, outerRadius, false, true, false, config.uvScale);
      if (bottomGeom) {
        const bottomSkyLight = Math.max(MIN_SKY_LIGHT, skyLightLevel * SKY_LIGHT_FALLOFF);
        if (blockType === HexBlockType.GRASS) {
          mergeGeometry(chunkData.sideData, bottomGeom.positions, bottomGeom.normals, bottomGeom.uvs, bottomGeom.indices, config.sunDirection, bottomSkyLight, torches);
        } else if (blockType === HexBlockType.SNOW) {
          mergeGeometry(chunkData.dirtSnowData, bottomGeom.positions, bottomGeom.normals, bottomGeom.uvs, bottomGeom.indices, config.sunDirection, bottomSkyLight, torches);
        } else {
          mergeGeometry(blockGeomData, bottomGeom.positions, bottomGeom.normals, bottomGeom.uvs, bottomGeom.indices, config.sunDirection, bottomSkyLight, torches);
        }
      }
    }

    // Side faces
    if (!isWater && hasSideExposed) {
      const sidesGeom = createFaceGeometry(column.tile, innerRadius, outerRadius, false, false, true, config.uvScale);
      if (sidesGeom) {
        if (blockType === HexBlockType.GRASS) {
          mergeGeometry(chunkData.grassSideData, sidesGeom.positions, sidesGeom.normals, sidesGeom.uvs, sidesGeom.indices, config.sunDirection, skyLightLevel, torches);
        } else if (blockType === HexBlockType.SNOW) {
          mergeGeometry(chunkData.snowSideData, sidesGeom.positions, sidesGeom.normals, sidesGeom.uvs, sidesGeom.indices, config.sunDirection, skyLightLevel, torches);
        } else {
          mergeGeometry(blockGeomData, sidesGeom.positions, sidesGeom.normals, sidesGeom.uvs, sidesGeom.indices, config.sunDirection, skyLightLevel, torches);
        }
      }
    }
  }
}

// Vec3 distance helper
function vec3Distance(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Build chunk geometry synchronously on the main thread
 * This is used for immediate block updates near the player
 */
export function buildChunkGeometryImmediate(
  columns: ColumnData[],
  neighborData: Map<number, NeighborData>,
  config: BuildConfig
): ChunkGeometryData {
  const chunkData = createEmptyChunkGeometryData();

  for (const column of columns) {
    buildColumnGeometry(column, neighborData, config, chunkData);

    // Build water walls
    for (let depth = 0; depth < column.blocks.length; depth++) {
      if (column.blocks[depth] === HexBlockType.WATER) {
        buildWaterWallAtDepth(
          column.tile.vertices,
          column.tile.neighbors,
          column.blocks,
          neighborData,
          depth,
          config,
          chunkData.waterData
        );
      }
    }
  }

  return chunkData;
}

/**
 * Create THREE.js BufferGeometry from GeometryData
 */
export function createBufferGeometryFromData(data: GeometryData): THREE.BufferGeometry | null {
  if (data.positions.length === 0) return null;

  const geometry = new THREE.BufferGeometry();

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));

  if (data.skyLight.length > 0) {
    geometry.setAttribute('skyLight', new THREE.Float32BufferAttribute(data.skyLight, 1));
  }

  if (data.torchLight.length > 0) {
    geometry.setAttribute('torchLight', new THREE.Float32BufferAttribute(data.torchLight, 1));
  }

  if (data.colors.length > 0) {
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(data.colors, 3));
  }

  geometry.setIndex(data.indices);
  geometry.computeBoundingSphere();

  return geometry;
}
