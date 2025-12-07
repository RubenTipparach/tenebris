// Geometry Worker - builds terrain geometry off the main thread
// Uses plain JavaScript math instead of THREE.js (not available in workers)

import { HexBlockType } from '../shared/blockTypes';
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
import { SKY_LIGHT_FALLOFF, MIN_SKY_LIGHT, buildWaterWallGeometry } from '../shared/geometry';

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
let torchLightDebugLogged = false;
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
      if (!torchLightDebugLogged) {
        console.log(`[GeometryWorker] Torch light hit! vertex=(${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}), dist=${dist.toFixed(2)}, light=${totalLight.toFixed(3)}`);
        torchLightDebugLogged = true;
      }
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
}

interface GeometryResultMessage {
  type: 'geometryResult';
  topData: GeometryData;
  sideData: GeometryData;
  grassSideData: GeometryData;  // Grass block sides use dirt_grass texture
  stoneData: GeometryData;
  sandData: GeometryData;
  woodData: GeometryData;
  waterData: GeometryData;
  // Mineral ore data
  oreCoalData: GeometryData;
  oreCopperData: GeometryData;
  oreIronData: GeometryData;
  oreGoldData: GeometryData;
  oreLithiumData: GeometryData;
  oreAluminumData: GeometryData;
  oreCobaltData: GeometryData;
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
function buildColumnGeometry(
  column: ColumnData,
  neighborDataMap: Map<number, NeighborData>,
  config: WorkerConfig,
  topData: GeometryData,
  sideData: GeometryData,
  grassSideData: GeometryData,
  stoneData: GeometryData,
  sandData: GeometryData,
  woodData: GeometryData,
  waterData: GeometryData,
  oreCoalData: GeometryData,
  oreCopperData: GeometryData,
  oreIronData: GeometryData,
  oreGoldData: GeometryData,
  oreLithiumData: GeometryData,
  oreAluminumData: GeometryData,
  oreCobaltData: GeometryData
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
    // In new depth system: "above" = higher depth (toward sky), "below" = lower depth (toward bedrock)
    const blockAbove = depth >= column.blocks.length - 1 ? HexBlockType.AIR : column.blocks[depth + 1];
    const blockBelow = depth === 0 ? HexBlockType.AIR : column.blocks[depth - 1];

    const hasTopExposed = blockAbove === HexBlockType.AIR || (!isWater && blockAbove === HexBlockType.WATER);
    const hasBottomExposed = blockBelow === HexBlockType.AIR || (!isWater && blockBelow === HexBlockType.WATER);

    if (isWater && blockAbove !== HexBlockType.AIR) continue;

    const hasSideExposed = !isWater && hasExposedSide(column, depth, neighborDataMap);

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

    // Get the geometry buffer for this block type
    // Ore blocks use their specific ore textures, other blocks use their standard textures
    let blockGeomData: GeometryData;
    switch (blockType) {
      case HexBlockType.ORE_COAL: blockGeomData = oreCoalData; break;
      case HexBlockType.ORE_COPPER: blockGeomData = oreCopperData; break;
      case HexBlockType.ORE_IRON: blockGeomData = oreIronData; break;
      case HexBlockType.ORE_GOLD: blockGeomData = oreGoldData; break;
      case HexBlockType.ORE_LITHIUM: blockGeomData = oreLithiumData; break;
      case HexBlockType.ORE_ALUMINUM: blockGeomData = oreAluminumData; break;
      case HexBlockType.ORE_COBALT: blockGeomData = oreCobaltData; break;
      case HexBlockType.STONE: blockGeomData = stoneData; break;
      case HexBlockType.SAND: blockGeomData = sandData; break;
      case HexBlockType.DIRT: blockGeomData = sideData; break;
      case HexBlockType.WOOD: blockGeomData = woodData; break;
      default: blockGeomData = topData; break; // Grass and others use top (grass) texture
    }

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
          mergeGeometry(waterData, topGeom.positions, topGeom.normals, topGeom.uvs, topGeom.indices, config.sunDirection, 1.0, torches);
        } else {
          mergeGeometry(blockGeomData, topGeom.positions, topGeom.normals, topGeom.uvs, topGeom.indices, config.sunDirection, skyLightLevel, torches);
        }
      }
    }

    // Create bottom face
    if (!isWater && hasBottomExposed) {
      const bottomGeom = createFaceGeometry(column.tile, innerRadius, outerRadius, false, true, false, config.uvScale);
      if (bottomGeom) {
        const bottomSkyLight = Math.max(MIN_SKY_LIGHT, skyLightLevel * SKY_LIGHT_FALLOFF);
        // Grass blocks show dirt on bottom, everything else shows its own texture
        if (blockType === HexBlockType.GRASS) {
          mergeGeometry(sideData, bottomGeom.positions, bottomGeom.normals, bottomGeom.uvs, bottomGeom.indices, config.sunDirection, bottomSkyLight, torches);
        } else {
          mergeGeometry(blockGeomData, bottomGeom.positions, bottomGeom.normals, bottomGeom.uvs, bottomGeom.indices, config.sunDirection, bottomSkyLight, torches);
        }
      }
    }

    // Create side faces
    if (!isWater && hasSideExposed) {
      const sidesGeom = createFaceGeometry(column.tile, innerRadius, outerRadius, false, false, true, config.uvScale);
      if (sidesGeom) {
        // Grass blocks use grassSideData (dirt_grass texture) for sides
        if (blockType === HexBlockType.GRASS) {
          mergeGeometry(grassSideData, sidesGeom.positions, sidesGeom.normals, sidesGeom.uvs, sidesGeom.indices, config.sunDirection, skyLightLevel, torches);
        } else {
          mergeGeometry(blockGeomData, sidesGeom.positions, sidesGeom.normals, sidesGeom.uvs, sidesGeom.indices, config.sunDirection, skyLightLevel, torches);
        }
      }
    }
  }
}

// Worker message handler
self.onmessage = (e: MessageEvent<BuildGeometryMessage>) => {
  const { type, columns, neighborData, config } = e.data;

  if (type === 'buildGeometry') {
    // Reset debug flag for each build
    torchLightDebugLogged = false;
    const torchCount = config.torches?.length || 0;
    console.log(`[GeometryWorker] Received ${torchCount} torches`);
    if (torchCount > 0) {
      const t = config.torches![0];
      console.log(`[GeometryWorker] First torch: pos=(${t.position.x.toFixed(2)}, ${t.position.y.toFixed(2)}, ${t.position.z.toFixed(2)}), range=${t.range}`);
    }
    const topData = createEmptyGeometryData();
    const sideData = createEmptyGeometryData();
    const grassSideData = createEmptyGeometryData();
    const stoneData = createEmptyGeometryData();
    const sandData = createEmptyGeometryData();
    const woodData = createEmptyGeometryData();
    const waterData = createEmptyGeometryData();
    // Mineral ore geometry data
    const oreCoalData = createEmptyGeometryData();
    const oreCopperData = createEmptyGeometryData();
    const oreIronData = createEmptyGeometryData();
    const oreGoldData = createEmptyGeometryData();
    const oreLithiumData = createEmptyGeometryData();
    const oreAluminumData = createEmptyGeometryData();
    const oreCobaltData = createEmptyGeometryData();

    // Convert neighborData back to Map (it gets serialized as object)
    const neighborDataMap = new Map<number, NeighborData>(
      Object.entries(neighborData as unknown as Record<string, NeighborData>).map(([k, v]) => [parseInt(k), v])
    );

    for (const column of columns) {
      buildColumnGeometry(
        column, neighborDataMap, config,
        topData, sideData, grassSideData, stoneData, sandData, woodData, waterData,
        oreCoalData, oreCopperData, oreIronData, oreGoldData, oreLithiumData, oreAluminumData, oreCobaltData
      );

      // Generate water walls for water blocks
      for (let depth = 0; depth < column.blocks.length; depth++) {
        if (column.blocks[depth] === HexBlockType.WATER) {
          // In new depth system: "above" = higher depth
          const blockAbove = depth >= column.blocks.length - 1 ? HexBlockType.AIR : column.blocks[depth + 1];
          if (blockAbove === HexBlockType.AIR) {
            // This is a water surface - generate water walls
            const outerRadius = depthToRadius(depth, config) - config.waterSurfaceOffset;
            buildWaterWallGeometry(
              column.tile.vertices,
              column.tile.neighbors,
              column.blocks,
              neighborDataMap,
              depth,
              outerRadius,
              config,
              waterData
            );
          }
        }
      }
    }

    // Debug: count non-zero torch light values across all geometry
    let totalNonZero = 0;
    for (const data of [topData, sideData, grassSideData, stoneData, sandData, woodData]) {
      totalNonZero += data.torchLight.filter(v => v > 0).length;
    }
    if (totalNonZero > 0 || (config.torches && config.torches.length > 0)) {
      console.log(`[GeometryWorker] Total non-zero torchLight values: ${totalNonZero}`);
    }

    const result: GeometryResultMessage = {
      type: 'geometryResult',
      topData,
      sideData,
      grassSideData,
      stoneData,
      sandData,
      woodData,
      waterData,
      oreCoalData,
      oreCopperData,
      oreIronData,
      oreGoldData,
      oreLithiumData,
      oreAluminumData,
      oreCobaltData
    };

    // Transfer arrays for better performance
    self.postMessage(result);
  }
};

export {};
