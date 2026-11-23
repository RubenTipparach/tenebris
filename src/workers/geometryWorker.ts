// Geometry Worker - builds terrain geometry off the main thread
// Uses plain JavaScript math instead of THREE.js (not available in workers)

import { bakeBlockField, bakeSkyField, blockAt, edgeNeighbors, skyAt, LightColumn, SkyField } from '../shared/voxelLight';
import { isClearSolid, sideFaceShows } from '../shared/blockTypes';
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
import { cellReader, meshLiquidColumn, flowLookup } from '../water/LiquidMesh';

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
  blockLight?: number[];  // light from emitting blocks (shared/voxelLight), night-scaled in the shader
  torchLight: number[];  // Baked torch light level per vertex
  indices: number[];
  vertexOffset: number;
  liquidPrev?: number[];  // water only (src/water/LiquidMesh.ts)
  liquidFlow?: number[];  // water only: the flow texture's direction + face code (src/water/LiquidMesh.ts)
}

function createEmptyGeometryData(): GeometryData {
  return { positions: [], normals: [], uvs: [], colors: [], skyLight: [], blockLight: [], torchLight: [], indices: [], vertexOffset: 0 };
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
  flowCells?: number[];   // flowing water as [tile, depth, byte] triples (src/water/Liquid.ts)
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

// Check if a column has an exposed side at the given depth
function exposedEdges(
  column: ColumnData,
  depth: number,
  neighborDataMap: Map<number, NeighborData>,
  edges: number[]
): boolean[] {
  const self = column.blocks[depth];
  return edges.map(n => sideFaceShows(self, n < 0 ? undefined : neighborDataMap.get(n)?.blocks[depth]));
}

// Keep only the side quads (4 vertices each, one per edge) whose edge shows
function keepSides(geom: { positions: number[]; normals: number[]; uvs: number[]; indices: number[] }, show: boolean[]): typeof geom {
  const out = { positions: [] as number[], normals: [] as number[], uvs: [] as number[], indices: [] as number[] };
  let v = 0;
  show.forEach((on, i) => {
    if (!on) return;
    out.positions.push(...geom.positions.slice(i * 12, i * 12 + 12));
    out.normals.push(...geom.normals.slice(i * 12, i * 12 + 12));
    out.uvs.push(...geom.uvs.slice(i * 8, i * 8 + 8));
    out.indices.push(v, v + 1, v + 2, v, v + 2, v + 3);
    v += 4;
  });
  return out;
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
  skyLightLevel: number | number[],  // one level, or one per vertex
  torches: TorchData[] = [],
  blockLevel: number | number[] = 0
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
    skyLightToAdd[i] = typeof skyLightLevel === 'number' ? skyLightLevel : skyLightLevel[i];
  }
  target.skyLight.push.apply(target.skyLight, skyLightToAdd);
  const blockOut = (target.blockLight ??= []);
  for (let i = 0; i < vertexCount; i++) blockOut.push(typeof blockLevel === 'number' ? blockLevel : blockLevel[i]);

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
  config: WorkerConfig,
  out: Record<string, GeometryData>,
  field: SkyField,
  edges: number[],
  blockField: SkyField | null = null
): void {
  for (let depth = 0; depth < column.blocks.length; depth++) {
    const blockType = column.blocks[depth];
    // Air, and water: water is drawn by meshLiquidColumn (src/water/LiquidMesh.ts)
    if (blockType === HexBlockType.AIR || blockType === HexBlockType.WATER) continue;

    const isIce = blockType === HexBlockType.ICE;
    const isGlass = isClearSolid(blockType) && !isIce;
    // In new depth system: "above" = higher depth (toward sky), "below" = lower depth (toward bedrock)
    const blockAbove = depth >= column.blocks.length - 1 ? HexBlockType.AIR : column.blocks[depth + 1];
    const blockBelow = depth === 0 ? HexBlockType.AIR : column.blocks[depth - 1];

    // For face culling: a face is exposed if adjacent block is AIR, or WATER (for non-water blocks), or ICE/GLASS (for non-ice/glass blocks)
    const hasTopExposed = blockAbove === HexBlockType.AIR ||
      blockAbove === HexBlockType.WATER ||
      (!isIce && !isGlass && isClearSolid(blockAbove));
    const hasBottomExposed = blockBelow === HexBlockType.AIR ||
      blockBelow === HexBlockType.WATER ||
      (!isIce && !isGlass && isClearSolid(blockBelow));

    // Ice needs to check for exposed sides too (treated like a solid block for rendering)
    const sideShow = exposedEdges(column, depth, neighborDataMap, edges);
    const hasSideExposed = sideShow.some(Boolean);

    // Skip if no faces are exposed
    if (!hasTopExposed && !hasBottomExposed && !hasSideExposed) continue;

    // In new system: higher depth = larger radius (closer to surface)
    const outerRadius = depthToRadius(depth, config);
    const innerRadius = outerRadius - config.blockHeight;

    if (innerRadius <= 0) continue;


    // Which material each face of this block uses (shared table)
    const faces = blockFaces(blockType);

    // Voxel sky light (shared/voxelLight): each face is lit by the cell it faces
    const topLight = skyAt(field, column.tileIndex, depth + 1);
    const bottomLight = skyAt(field, column.tileIndex, depth - 1);
    const topBlock = blockAt(blockField, column.tileIndex, depth + 1);
    const bottomBlock = blockAt(blockField, column.tileIndex, depth - 1);

    // Get torches array (default to empty)
    const torches = config.torches || [];

    // Create top face
    if (hasTopExposed) {
      const topGeom = createFaceGeometry(column.tile, innerRadius, outerRadius, true, false, false, config.uvScale);
      if (topGeom) {
        mergeGeometry(bufferFor(out, faces.top), topGeom.positions, topGeom.normals, topGeom.uvs, topGeom.indices, config.sunDirection, topLight, torches, topBlock);
      }
    }

    // Create bottom face
    if (hasBottomExposed) {
      const bottomGeom = createFaceGeometry(column.tile, innerRadius, outerRadius, false, true, false, config.uvScale);
      if (bottomGeom) {
        mergeGeometry(bufferFor(out, faces.bottom), bottomGeom.positions, bottomGeom.normals, bottomGeom.uvs, bottomGeom.indices, config.sunDirection, bottomLight, torches, bottomBlock);
      }
    }

    // Create side faces
    if (hasSideExposed) {
      const sidesGeom = createFaceGeometry(column.tile, innerRadius, outerRadius, false, false, true, config.uvScale);
      if (sidesGeom) {
        const shown = keepSides(sidesGeom, sideShow);
        const shownEdges = edges.filter((_, i) => sideShow[i]);
        mergeGeometry(bufferFor(out, faces.side), shown.positions, shown.normals, shown.uvs, shown.indices, config.sunDirection, sideLights(field, shownEdges, depth), torches, sideBlock(blockField, shownEdges, depth));
      }
    }
  }
}

// The water of each column (src/water/LiquidMesh.ts), at rest: the worker
// draws this tick's water, the main-thread rebuilds near the player smooth it
function waterOf(columns: ColumnData[], neighborDataMap: Map<number, NeighborData>, config: WorkerConfig) {
  const own = new Map(columns.map(c => [c.tileIndex, c.blocks]));
  const read = cellReader(t => own.get(t) ?? neighborDataMap.get(t)?.blocks, flowLookup(config.flowCells));
  return (column: ColumnData, edges: number[], target: () => GeometryData) => meshLiquidColumn(
    { tileIndex: column.tileIndex, vertices: column.tile.vertices, center: column.tile.center, edges },
    column.blocks.length, read, null, 0, config, target);
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

    const light = lightRegion(columns, neighborDataMap);
    const water = waterOf(columns, neighborDataMap, config);
    for (const column of columns) {
      const edges = light.edgesOf(column);
      buildColumnGeometry(column, neighborDataMap, config, buffers, light.field, edges, light.blockField);
      water(column, edges, () => bufferFor(buffers, 'water'));
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
    const light = lightRegion(columns, neighborDataMap);
    const water = waterOf(columns, neighborDataMap, config);
    for (const column of columns) {
      const chunkIndex = tileToChunkMap.get(column.tileIndex);
      if (chunkIndex === undefined || !chunkGeometries[chunkIndex]) continue;

      const chunk = chunkGeometries[chunkIndex];
      const edges = light.edgesOf(column);
      buildColumnGeometry(column, neighborDataMap, config, chunk, light.field, edges, light.blockField);
      water(column, edges, () => bufferFor(chunk, 'water'));
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
