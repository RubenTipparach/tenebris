// Shared geometry generation functions for use in web workers
// Pure functions that don't depend on THREE.js

import { Vec3, vec3, vec3Add, vec3Sub, vec3Scale, vec3Dot, vec3Cross, vec3Normalize, vec3Negate, vec3Length } from './vec3';

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

