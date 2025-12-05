// Geometry Worker - builds terrain geometry off the main thread
// Uses plain JavaScript math instead of THREE.js (not available in workers)

// Vector3-like operations using plain objects
interface Vec3 {
  x: number;
  y: number;
  z: number;
}

function vec3(x: number, y: number, z: number): Vec3 {
  return { x, y, z };
}

function vec3Clone(v: Vec3): Vec3 {
  return { x: v.x, y: v.y, z: v.z };
}

function vec3Sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function vec3Scale(v: Vec3, s: number): Vec3 {
  return { x: v.x * s, y: v.y * s, z: v.z * s };
}

function vec3Dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function vec3Cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x
  };
}

function vec3Length(v: Vec3): number {
  return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
}

function vec3Normalize(v: Vec3): Vec3 {
  const len = vec3Length(v);
  if (len === 0) return { x: 0, y: 0, z: 0 };
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function vec3Negate(v: Vec3): Vec3 {
  return { x: -v.x, y: -v.y, z: -v.z };
}

// Geometry data structure (matches Planet.ts)
interface GeometryData {
  positions: number[];
  normals: number[];
  uvs: number[];
  colors: number[];
  skyLight: number[];
  indices: number[];
  vertexOffset: number;
}

function createEmptyGeometryData(): GeometryData {
  return { positions: [], normals: [], uvs: [], colors: [], skyLight: [], indices: [], vertexOffset: 0 };
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
interface WorkerConfig {
  radius: number;
  blockHeight: number;
  seaLevel: number;
  deepThreshold: number;
  waterSurfaceOffset: number;
  sunDirection: Vec3;
}

// Message types
interface BuildGeometryMessage {
  type: 'buildGeometry';
  columns: ColumnData[];
  neighborBlocks: Map<number, number[]>; // tileIndex -> blocks for neighbor lookup
  config: WorkerConfig;
}

interface GeometryResultMessage {
  type: 'geometryResult';
  topData: GeometryData;
  sideData: GeometryData;
  stoneData: GeometryData;
  waterData: GeometryData;
}

// Check if a column has an exposed side at the given depth
function hasExposedSide(
  column: ColumnData,
  depth: number,
  neighborBlocks: Map<number, number[]>
): boolean {
  const blockType = column.blocks[depth];
  if (blockType === HexBlockType.AIR || blockType === HexBlockType.WATER) return false;

  for (const neighborIndex of column.tile.neighbors) {
    const neighborBlockArray = neighborBlocks.get(neighborIndex);
    if (!neighborBlockArray) return true; // No neighbor data = edge of loaded area

    const neighborBlock = neighborBlockArray[depth];
    if (neighborBlock === undefined) return true;
    if (neighborBlock === HexBlockType.AIR || neighborBlock === HexBlockType.WATER) {
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
  skyLightLevel: number
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
  isSides: boolean
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

  // Create local tangent space
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
    // Top face
    const topNormal = vec3Clone(radialDir);
    positions.push(outerCenter.x, outerCenter.y, outerCenter.z);
    normals.push(topNormal.x, topNormal.y, topNormal.z);
    uvs.push(0.5, 0.5);

    for (let i = 0; i < numSides; i++) {
      const v = outerVerts[i];
      positions.push(v.x, v.y, v.z);
      normals.push(topNormal.x, topNormal.y, topNormal.z);

      const toVert = vec3Sub(v, outerCenter);
      const u = 0.5 + vec3Dot(toVert, localRight) * 0.2;
      const vCoord = 0.5 + vec3Dot(toVert, localForward) * 0.2;
      uvs.push(u, vCoord);
    }

    for (let i = 0; i < numSides; i++) {
      const next = (i + 1) % numSides;
      indices.push(0, 1 + i, 1 + next);
    }
  } else if (isBottom) {
    // Bottom face
    const bottomNormal = vec3Negate(radialDir);
    positions.push(innerCenter.x, innerCenter.y, innerCenter.z);
    normals.push(bottomNormal.x, bottomNormal.y, bottomNormal.z);
    uvs.push(0.5, 0.5);

    for (let i = 0; i < numSides; i++) {
      const v = innerVerts[i];
      positions.push(v.x, v.y, v.z);
      normals.push(bottomNormal.x, bottomNormal.y, bottomNormal.z);

      const toVert = vec3Sub(v, innerCenter);
      const u = 0.5 + vec3Dot(toVert, localRight) * 0.1;
      const vCoord = 0.5 + vec3Dot(toVert, localForward) * 0.1;
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

      uvs.push(0, 0, 1, 0, 1, 0.5, 0, 0.5);

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
function buildColumnGeometry(
  column: ColumnData,
  neighborBlocks: Map<number, number[]>,
  config: WorkerConfig,
  topData: GeometryData,
  sideData: GeometryData,
  stoneData: GeometryData,
  waterData: GeometryData
): void {
  // Find surface depth
  let surfaceDepth = 0;
  for (let d = 0; d < column.blocks.length; d++) {
    if (column.blocks[d] !== HexBlockType.AIR && column.blocks[d] !== HexBlockType.WATER) {
      surfaceDepth = d;
      break;
    }
  }

  for (let depth = 0; depth < column.blocks.length; depth++) {
    const blockType = column.blocks[depth];
    if (blockType === HexBlockType.AIR) continue;

    const isWater = blockType === HexBlockType.WATER;
    const blockAbove = depth === 0 ? HexBlockType.AIR : column.blocks[depth - 1];
    const blockBelow = depth >= column.blocks.length - 1 ? HexBlockType.AIR : column.blocks[depth + 1];

    const hasTopExposed = blockAbove === HexBlockType.AIR || (!isWater && blockAbove === HexBlockType.WATER);
    const hasBottomExposed = blockBelow === HexBlockType.AIR || (!isWater && blockBelow === HexBlockType.WATER);

    if (isWater && blockAbove !== HexBlockType.AIR) continue;

    const hasSideExposed = !isWater && hasExposedSide(column, depth, neighborBlocks);

    if (!isWater && !hasTopExposed && !hasBottomExposed && !hasSideExposed) continue;

    let outerRadius = config.radius - depth * config.blockHeight;
    let innerRadius = outerRadius - config.blockHeight;

    if (isWater) {
      outerRadius -= config.waterSurfaceOffset;
      innerRadius -= config.waterSurfaceOffset;
    }

    if (innerRadius <= 0) continue;

    const depthFromSurface = depth - surfaceDepth;
    // Use the actual block type for texture selection - this ensures blocks don't change
    // appearance when surface depth changes (e.g., when mining blocks above)
    const useStoneTexture = blockType === HexBlockType.STONE;
    const useDirtTexture = blockType === HexBlockType.DIRT;

    // Calculate sky light
    const SKY_LIGHT_FALLOFF = 0.8;
    const MIN_SKY_LIGHT = 0.05;
    let skyLightLevel = 1.0;
    if (depthFromSurface > 0) {
      skyLightLevel = Math.max(MIN_SKY_LIGHT, Math.pow(SKY_LIGHT_FALLOFF, depthFromSurface));
    }

    // Create top face
    if (isWater ? true : hasTopExposed) {
      const topGeom = createFaceGeometry(column.tile, innerRadius, outerRadius, true, false, false);
      if (topGeom) {
        if (isWater) {
          mergeGeometry(waterData, topGeom.positions, topGeom.normals, topGeom.uvs, topGeom.indices, config.sunDirection, 1.0);
        } else if (useStoneTexture) {
          mergeGeometry(stoneData, topGeom.positions, topGeom.normals, topGeom.uvs, topGeom.indices, config.sunDirection, skyLightLevel);
        } else if (useDirtTexture) {
          mergeGeometry(sideData, topGeom.positions, topGeom.normals, topGeom.uvs, topGeom.indices, config.sunDirection, skyLightLevel);
        } else {
          mergeGeometry(topData, topGeom.positions, topGeom.normals, topGeom.uvs, topGeom.indices, config.sunDirection, skyLightLevel);
        }
      }
    }

    // Create bottom face
    if (!isWater && hasBottomExposed) {
      const bottomGeom = createFaceGeometry(column.tile, innerRadius, outerRadius, false, true, false);
      if (bottomGeom) {
        const bottomSkyLight = Math.max(MIN_SKY_LIGHT, skyLightLevel * SKY_LIGHT_FALLOFF);
        mergeGeometry(stoneData, bottomGeom.positions, bottomGeom.normals, bottomGeom.uvs, bottomGeom.indices, config.sunDirection, bottomSkyLight);
      }
    }

    // Create side faces
    if (!isWater && hasSideExposed) {
      const sidesGeom = createFaceGeometry(column.tile, innerRadius, outerRadius, false, false, true);
      if (sidesGeom) {
        if (useStoneTexture) {
          mergeGeometry(stoneData, sidesGeom.positions, sidesGeom.normals, sidesGeom.uvs, sidesGeom.indices, config.sunDirection, skyLightLevel);
        } else {
          // Dirt and grass both use sideData (dirt texture for sides)
          mergeGeometry(sideData, sidesGeom.positions, sidesGeom.normals, sidesGeom.uvs, sidesGeom.indices, config.sunDirection, skyLightLevel);
        }
      }
    }
  }
}

// Worker message handler
self.onmessage = (e: MessageEvent<BuildGeometryMessage>) => {
  const { type, columns, neighborBlocks, config } = e.data;

  if (type === 'buildGeometry') {
    const topData = createEmptyGeometryData();
    const sideData = createEmptyGeometryData();
    const stoneData = createEmptyGeometryData();
    const waterData = createEmptyGeometryData();

    // Convert neighborBlocks back to Map (it gets serialized as object)
    const neighborBlocksMap = new Map<number, number[]>(Object.entries(neighborBlocks as unknown as Record<string, number[]>).map(([k, v]) => [parseInt(k), v]));

    for (const column of columns) {
      buildColumnGeometry(column, neighborBlocksMap, config, topData, sideData, stoneData, waterData);
    }

    const result: GeometryResultMessage = {
      type: 'geometryResult',
      topData,
      sideData,
      stoneData,
      waterData
    };

    // Transfer arrays for better performance
    self.postMessage(result);
  }
};

export {};
