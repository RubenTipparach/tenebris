// Shared geometry generation functions for use in web workers
// Pure functions that don't depend on THREE.js

import { Vec3, vec3, vec3Add, vec3Sub, vec3Scale, vec3Dot, vec3Cross, vec3Normalize, vec3Negate, vec3Length, vec3Distance } from './vec3';
import { HexBlockType } from './blockTypes';

// Tile data structure compatible with both main thread and workers
export interface TileVertexData {
  index: number;
  center: Vec3;
  vertices: Vec3[];
}

// Raw geometry data before converting to typed arrays
export interface RawGeometry {
  positions: number[];
  normals: number[];
  uvs: number[];
  indices: number[];
}

// Geometry data with lighting info
export interface GeometryData {
  positions: number[];
  normals: number[];
  uvs: number[];
  colors: number[];
  skyLight: number[];
  indices: number[];
  vertexOffset: number;
}

export function createEmptyGeometryData(): GeometryData {
  return { positions: [], normals: [], uvs: [], colors: [], skyLight: [], indices: [], vertexOffset: 0 };
}

// Sky light constants
export const SKY_LIGHT_FALLOFF = 0.8;
export const MIN_SKY_LIGHT = 0.05;

// Calculate sky light level based on depth from surface
export function calculateSkyLight(depthFromSurface: number): number {
  if (depthFromSurface <= 0) return 1.0;
  return Math.max(MIN_SKY_LIGHT, Math.pow(SKY_LIGHT_FALLOFF, depthFromSurface));
}

// Pre-compute regular polygon UVs for hexagons/pentagons
export function computePolygonUVs(numSides: number, uvRadius: number = 0.5): { u: number; v: number }[] {
  const uvs: { u: number; v: number }[] = [];
  for (let i = 0; i < numSides; i++) {
    const angle = (i / numSides) * Math.PI * 2 - Math.PI / 2; // Start from top
    uvs.push({
      u: 0.5 + Math.cos(angle) * uvRadius,
      v: 0.5 + Math.sin(angle) * uvRadius
    });
  }
  return uvs;
}

// Create local tangent space for a tile
export function createTangentSpace(radialDir: Vec3): { right: Vec3; forward: Vec3 } {
  let localRight = vec3(1, 0, 0);
  if (Math.abs(vec3Dot(radialDir, localRight)) > 0.9) {
    localRight = vec3(0, 0, 1);
  }
  const localForward = vec3Normalize(vec3Cross(radialDir, localRight));
  localRight = vec3Normalize(vec3Cross(localForward, radialDir));
  return { right: localRight, forward: localForward };
}

// Scale tile vertices to specific radius
export function scaleVerticesToRadius(
  vertices: Vec3[],
  planetCenter: Vec3,
  radius: number
): Vec3[] {
  return vertices.map(v => {
    const dir = vec3Normalize(vec3Sub(v, planetCenter));
    return vec3Scale(dir, radius);
  });
}

// Create separate geometries for top, bottom, and sides of a hex prism
export function createSeparateGeometries(
  tile: TileVertexData,
  innerRadius: number,
  outerRadius: number,
  planetCenter: Vec3,
  isTopExposed: boolean,
  isBottomExposed: boolean,
  areSidesExposed: boolean
): { top: RawGeometry | null; bottom: RawGeometry | null; sides: RawGeometry | null } {
  const numSides = tile.vertices.length;

  // Calculate radial direction
  const radialDir = vec3Normalize(vec3Sub(tile.center, planetCenter));

  // Scale vertices to inner and outer radii
  const innerVerts = scaleVerticesToRadius(tile.vertices, planetCenter, innerRadius);
  const outerVerts = scaleVerticesToRadius(tile.vertices, planetCenter, outerRadius);

  const innerCenter = vec3Scale(radialDir, innerRadius);
  const outerCenter = vec3Scale(radialDir, outerRadius);

  let topGeom: RawGeometry | null = null;
  let bottomGeom: RawGeometry | null = null;
  let sidesGeom: RawGeometry | null = null;

  // Pre-compute regular polygon UVs
  const tileUVs = computePolygonUVs(numSides);

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
      const edge = vec3Sub(outerV2, outerV1);
      const edgeLen = vec3Length(edge);

      const midPoint = vec3Scale(vec3Add(outerV1, outerV2), 0.5);
      let sideNormal = vec3Normalize(vec3Sub(midPoint, planetCenter));

      // Remove component parallel to edge to get perpendicular normal
      const tangent = vec3Scale(edge, 1 / edgeLen);
      const dot = vec3Dot(sideNormal, tangent);
      sideNormal = vec3Normalize({
        x: sideNormal.x - tangent.x * dot,
        y: sideNormal.y - tangent.y * dot,
        z: sideNormal.z - tangent.z * dot
      });

      positions.push(
        innerV1.x, innerV1.y, innerV1.z,
        innerV2.x, innerV2.y, innerV2.z,
        outerV2.x, outerV2.y, outerV2.z,
        outerV1.x, outerV1.y, outerV1.z
      );

      for (let j = 0; j < 4; j++) {
        normals.push(sideNormal.x, sideNormal.y, sideNormal.z);
      }

      uvs.push(0, 0,
         1, 0,
         1, 1,
         0, 1);

      const baseIdx = vertexIndex;
      indices.push(baseIdx, baseIdx + 1, baseIdx + 2, baseIdx, baseIdx + 2, baseIdx + 3);
      vertexIndex += 4;
    }

    sidesGeom = { positions, normals, uvs, indices };
  }

  return { top: topGeom, bottom: bottomGeom, sides: sidesGeom };
}

// Merge raw geometry into target with sky light
export function mergeGeometry(
  target: GeometryData,
  source: RawGeometry,
  skyLightLevel: number = 1.0
): void {
  const vertexCount = source.positions.length / 3;
  const baseIndex = target.vertexOffset;

  // Batch push arrays
  target.positions.push(...source.positions);
  target.normals.push(...source.normals);
  target.uvs.push(...source.uvs);

  // Add vertex colors (white, lighting handled in shader)
  for (let i = 0; i < vertexCount; i++) {
    target.colors.push(1, 1, 1);
  }

  // Add sky light for each vertex
  for (let i = 0; i < vertexCount; i++) {
    target.skyLight.push(skyLightLevel);
  }

  // Add indices with offset
  for (const idx of source.indices) {
    target.indices.push(idx + baseIndex);
  }

  target.vertexOffset += vertexCount;
}

// Water wall tile data for worker communication
export interface WaterWallTileData {
  vertices: Vec3[];
  neighbors: number[];
}

// Water wall configuration
export interface WaterWallConfig {
  radius: number;
  blockHeight: number;
  waterSurfaceOffset: number;
}

// Build water side faces that extend from water surface down to exposed air
// This creates walls where water meets air gaps in neighboring columns
// Pure function version for use in workers
export function buildWaterWallGeometry(
  tileVertices: Vec3[],
  tileNeighbors: number[],
  ownBlocks: number[],
  neighborBlocksMap: Map<number, { blocks: number[]; vertices: Vec3[] }>,
  waterSurfaceDepth: number,
  outerRadius: number,
  config: WaterWallConfig,
  waterData: GeometryData
): void {
  const numSides = tileVertices.length;
  const edgeThreshold = 0.001;

  // Check each edge
  for (let i = 0; i < numSides; i++) {
    const next = (i + 1) % numSides;
    const edgeV1 = tileVertices[i];
    const edgeV2 = tileVertices[next];

    // Find which neighbor shares this edge
    let neighborData: { blocks: number[]; vertices: Vec3[] } | undefined;
    for (const neighborIndex of tileNeighbors) {
      const candidate = neighborBlocksMap.get(neighborIndex);
      if (!candidate) continue;

      // Check if this neighbor has both edge vertices
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

    // Check if neighbor has air at water surface level - if not, skip this edge
    if (neighborData.blocks[waterSurfaceDepth] !== HexBlockType.AIR) continue;

    // Find where this water column has solid blocks below the water
    let ownSolidDepth = waterSurfaceDepth + 1;
    for (let d = waterSurfaceDepth + 1; d < ownBlocks.length; d++) {
      const ownBlock = ownBlocks[d];
      if (ownBlock !== HexBlockType.AIR && ownBlock !== HexBlockType.WATER) {
        ownSolidDepth = d;
        break;
      }
    }

    // Find the neighbor's first solid block depth
    let neighborSolidDepth = waterSurfaceDepth + 1;
    for (let d = waterSurfaceDepth + 1; d < neighborData.blocks.length; d++) {
      const neighborBlock = neighborData.blocks[d];
      if (neighborBlock !== HexBlockType.AIR && neighborBlock !== HexBlockType.WATER) {
        neighborSolidDepth = d;
        break;
      } else if (neighborBlock === HexBlockType.AIR) {
        neighborSolidDepth = d + 1;
      } else {
        // Water - stop here
        break;
      }
    }

    // Water wall extends to the minimum of own solid depth or neighbor solid depth
    const wallBottomDepth = Math.min(ownSolidDepth, neighborSolidDepth);

    // Calculate wall geometry
    const wallTopRadius = outerRadius;
    const wallBottomRadius = config.radius - wallBottomDepth * config.blockHeight;

    if (wallBottomRadius >= wallTopRadius) continue;

    // Scale vertices for top and bottom of wall
    const dir1 = vec3Normalize(edgeV1);
    const dir2 = vec3Normalize(edgeV2);

    const topV1 = vec3Scale(dir1, wallTopRadius);
    const topV2 = vec3Scale(dir2, wallTopRadius);
    const bottomV1 = vec3Scale(dir1, wallBottomRadius);
    const bottomV2 = vec3Scale(dir2, wallBottomRadius);

    // Calculate side normal
    const edge1 = vec3Sub(bottomV2, bottomV1);
    const edge2 = vec3Sub(topV1, bottomV1);
    const sideNormal = vec3Normalize(vec3Cross(edge1, edge2));

    const baseIdx = waterData.vertexOffset;

    // Four vertices for this side face
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
    waterData.colors.push(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1);

    waterData.indices.push(
      baseIdx, baseIdx + 1, baseIdx + 2,
      baseIdx, baseIdx + 2, baseIdx + 3
    );

    waterData.vertexOffset += 4;
  }
}

