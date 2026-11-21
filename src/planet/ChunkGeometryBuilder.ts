// Main-thread chunk geometry builder for immediate block updates
// This runs synchronously on the CPU for fast visual feedback

import { bakeBlockField, bakeSkyField, blockAt, edgeNeighbors, skyAt, LightColumn, SkyField } from '../shared/voxelLight';
import * as THREE from 'three';
import { HexBlockType, blockFaces, bufferKey } from '../shared/blockTypes';
import {
  Vec3,
  vec3Sub,
  vec3Scale,
  vec3Cross,
  vec3Normalize,
  vec3Negate
} from '../shared/vec3';

// Geometry data structure
export interface GeometryData {
  positions: number[];
  normals: number[];
  uvs: number[];
  colors: number[];
  skyLight: number[];
  blockLight?: number[];  // light from emitting blocks (shared/voxelLight), night-scaled in the shader
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
    blockLight: [],
    torchLight: [],
    indices: [],
    vertexOffset: 0
  };
}

// Chunk geometry: buffers keyed '<material>Data' (see bufferKey in
// shared/blockTypes), created only for materials that occur
export type ChunkGeometryData = Record<string, GeometryData>;

// Buffer for a material key, created on first use
export function bufferFor(out: ChunkGeometryData, materialKey: string): GeometryData {
  const key = bufferKey(materialKey);
  let data = out[key];
  if (!data) {
    data = createEmptyGeometryData();
    out[key] = data;
  }
  return data;
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
  skyLightLevel: number | number[],  // one level, or one per vertex
  torches: TorchData[] = [],
  blockLevel: number | number[] = 0
): void {
  const vertexCount = positions.length / 3;
  const baseIndex = target.vertexOffset;

  target.positions.push(...positions);
  target.normals.push(...normals);
  target.uvs.push(...uvs);

  for (let i = 0; i < vertexCount; i++) {
    target.colors.push(1, 1, 1);
    target.skyLight.push(typeof skyLightLevel === 'number' ? skyLightLevel : skyLightLevel[i]);
    (target.blockLight ??= []).push(typeof blockLevel === 'number' ? blockLevel : blockLevel[i]);

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
// Side faces' light: each quad (4 vertices, edge i) from the cell beside it
function sideBlock(field: SkyField | null, edges: number[], depth: number): number | number[] {
  if (!field) return 0;
  const out: number[] = [];
  for (const n of edges) {
    const l = n < 0 ? 0 : blockAt(field, n, depth);
    out.push(l, l, l, l);
  }
  return out;
}

function sideLights(field: SkyField, edges: number[], depth: number): number[] {
  const out: number[] = [];
  for (const n of edges) {
    const l = n < 0 ? 1 : skyAt(field, n, depth);
    out.push(l, l, l, l);
  }
  return out;
}

/** The light region for a set of columns: them (spreading) and their neighbour ring. */
function lightRegion(columns: ColumnData[], neighborDataMap: Map<number, NeighborData>): { field: SkyField; blockField: SkyField | null; edgesOf: (c: ColumnData) => number[] } {
  const region = new Map<number, LightColumn>();
  for (const [t, n] of neighborDataMap) region.set(t, { blocks: n.blocks });
  const byTile = new Map<number, ColumnData>();
  for (const c of columns) { region.set(c.tileIndex, { blocks: c.blocks, neighbors: c.tile.neighbors }); byTile.set(c.tileIndex, c); }
  const field = bakeSkyField(region);
  const blockField = bakeBlockField(region);
  const verticesOf = (t: number) => byTile.get(t)?.tile.vertices ?? neighborDataMap.get(t)?.vertices;
  return { field, blockField, edgesOf: (c) => edgeNeighbors(c.tile.vertices, c.tile.neighbors, verticesOf) };
}

function buildColumnGeometry(
  column: ColumnData,
  neighborDataMap: Map<number, NeighborData>,
  config: BuildConfig,
  chunkData: ChunkGeometryData,
  field: SkyField,
  edges: number[],
  blockField: SkyField | null = null
): void {
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

    
    // Which material each face of this block uses (shared table)
    const faces = blockFaces(blockType);

    // Voxel sky light (shared/voxelLight): each face is lit by the cell it faces
    const topLight = skyAt(field, column.tileIndex, depth + 1);
    const bottomLight = skyAt(field, column.tileIndex, depth - 1);
    const topBlock = blockAt(blockField, column.tileIndex, depth + 1);
    const bottomBlock = blockAt(blockField, column.tileIndex, depth - 1);

    // Top face
    if (isWater ? true : hasTopExposed) {
      const topGeom = createFaceGeometry(column.tile, innerRadius, outerRadius, true, false, false, config.uvScale);
      if (topGeom) {
        if (isWater) {
          mergeGeometry(bufferFor(chunkData, 'water'), topGeom.positions, topGeom.normals, topGeom.uvs, topGeom.indices, config.sunDirection, 1.0, torches);
        } else {
          mergeGeometry(bufferFor(chunkData, faces.top), topGeom.positions, topGeom.normals, topGeom.uvs, topGeom.indices, config.sunDirection, topLight, torches, topBlock);
        }
      }
    }

    // Bottom face
    if (!isWater && hasBottomExposed) {
      const bottomGeom = createFaceGeometry(column.tile, innerRadius, outerRadius, false, true, false, config.uvScale);
      if (bottomGeom) {
        mergeGeometry(bufferFor(chunkData, faces.bottom), bottomGeom.positions, bottomGeom.normals, bottomGeom.uvs, bottomGeom.indices, config.sunDirection, bottomLight, torches, bottomBlock);

      }
    }

    // Side faces
    if (!isWater && hasSideExposed) {
      const sidesGeom = createFaceGeometry(column.tile, innerRadius, outerRadius, false, false, true, config.uvScale);
      if (sidesGeom) {
        mergeGeometry(bufferFor(chunkData, faces.side), sidesGeom.positions, sidesGeom.normals, sidesGeom.uvs, sidesGeom.indices, config.sunDirection, sideLights(field, edges, depth), torches, sideBlock(blockField, edges, depth));

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
  const chunkData: ChunkGeometryData = {};

  const light = lightRegion(columns, neighborData);
  for (const column of columns) {
    buildColumnGeometry(column, neighborData, config, chunkData, light.field, light.edgesOf(column), light.blockField);

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
          bufferFor(chunkData, 'water')
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

  if (data.blockLight && data.blockLight.length > 0) {
    geometry.setAttribute('blockLight', new THREE.Float32BufferAttribute(data.blockLight, 1));
  }

  if (data.colors.length > 0) {
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(data.colors, 3));
  }

  geometry.setIndex(data.indices);
  geometry.computeBoundingSphere();

  return geometry;
}
