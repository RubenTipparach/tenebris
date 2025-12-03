import * as THREE from 'three';
import { GoldbergPolyhedron, HexTile } from './GoldbergPolyhedron';
import { HexBlockType, HexBlockMeshBuilder } from './HexBlock';
import { PlayerConfig } from '../config/PlayerConfig';
import { profiler } from '../engine/Profiler';

export interface PlanetConfig {
  texturePath?: string;  // Single texture for all surfaces (like moon)
  heightVariation?: number;  // 0-1, how much terrain varies (default 1.0)
  hasWater?: boolean;  // Whether to generate water at sea level (default true for Earth)
  seaLevel?: number;   // Depth at which water appears (default 1, meaning radius - 1)
}

export interface PlanetColumn {
  tile: HexTile;
  blocks: HexBlockType[];
  isDirty: boolean;
  boundingSphere: THREE.Sphere;
}

// Geometry data for batching
interface GeometryData {
  positions: number[];
  normals: number[];
  uvs: number[];
  colors: number[];  // Vertex colors for position-based lighting
  indices: number[];
  vertexOffset: number;
}

function createEmptyGeometryData(): GeometryData {
  return { positions: [], normals: [], uvs: [], colors: [], indices: [], vertexOffset: 0 };
}

export class Planet {
  public radius: number;
  public center: THREE.Vector3;

  private polyhedron: GoldbergPolyhedron;
  private columns: Map<number, PlanetColumn> = new Map();
  private meshBuilder: HexBlockMeshBuilder;
  private scene: THREE.Scene;
  private frustum: THREE.Frustum = new THREE.Frustum();
  private projScreenMatrix: THREE.Matrix4 = new THREE.Matrix4();
  private config: PlanetConfig;

  // LOD system - single batched LOD mesh (for nearby/on-planet viewing)
  private lodMesh: THREE.Mesh | null = null;
  private lodWaterMesh: THREE.Mesh | null = null; // Separate LOD water mesh for visibility control
  private lodTileVisibility: Map<number, boolean> = new Map(); // Track which LOD tiles should be visible
  private needsLODRebuild: boolean = false; // Flag to rebuild LOD mesh when terrain changes

  // Distance-based LOD meshes (for viewing from other planets)
  private distantLODMeshes: THREE.Mesh[] = []; // Array of progressively lower-detail meshes
  private currentDistantLODLevel: number = -1; // -1 = use detailed/near LOD, 0-2 = distant LOD levels

  // Boundary walls group (fills gap between detailed terrain and LOD at render distance edge)
  private boundaryWallsGroup: THREE.Group | null = null;

  // Cache for tile range lookups (avoid BFS every frame)
  private cachedRenderDistance: number = -1;
  private cachedNearbyTiles: Set<number> = new Set();

  // Buffer zone - track center tile for stability zone
  private bufferCenterTiles: Set<number> = new Set(); // Tiles within buffer zone of center

  // Incremental rebuild queue
  private pendingTilesToAdd: number[] = [];
  private pendingTilesToRemove: number[] = [];
  private isIncrementalRebuildActive: boolean = false;

  // Batched meshes for visible terrain (one mesh per material type = ~5 draw calls total)
  private batchedMeshGroup: THREE.Group | null = null;
  private topMesh: THREE.Mesh | null = null;
  private sideMesh: THREE.Mesh | null = null;
  private stoneMesh: THREE.Mesh | null = null;
  private waterMesh: THREE.Mesh | null = null;
  private needsRebatch: boolean = true; // Flag to rebuild batched geometry

  private readonly BLOCK_HEIGHT = 1;
  private readonly MAX_DEPTH: number; // Total depth (sea level + dig depth)
  private readonly MAX_HEIGHT: number; // Max build height above sea level
  private readonly DEEP_THRESHOLD = 4; // Depth at which we switch to stone texture
  private readonly SEA_LEVEL: number; // Depth at which water surface sits
  private readonly seed: number; // Terrain generation seed

  // Sun direction for position-based lighting (normalized)
  private sunDirection: THREE.Vector3 = new THREE.Vector3(
    PlayerConfig.SUN_DIRECTION.x,
    PlayerConfig.SUN_DIRECTION.y,
    PlayerConfig.SUN_DIRECTION.z
  ).normalize();

  constructor(scene: THREE.Scene, radius: number = 50, subdivisions: number = 3, config: PlanetConfig = {}) {
    this.scene = scene;
    this.radius = radius;
    this.center = new THREE.Vector3(0, 0, 0);
    this.config = config;
    this.SEA_LEVEL = config.seaLevel ?? PlayerConfig.TERRAIN_SEA_LEVEL;
    this.MAX_DEPTH = this.SEA_LEVEL + PlayerConfig.TERRAIN_MAX_DEPTH;
    this.MAX_HEIGHT = PlayerConfig.TERRAIN_MAX_HEIGHT;
    this.seed = PlayerConfig.TERRAIN_SEED;
    this.polyhedron = new GoldbergPolyhedron(radius, subdivisions);
    this.meshBuilder = new HexBlockMeshBuilder();
  }

  public async initialize(): Promise<void> {
    await this.meshBuilder.loadTextures(this.config.texturePath);
    this.generateTerrain();
    this.createLODMesh();
    this.createDistantLODMeshes();
    this.createBatchedMeshGroup();

    console.log(`Planet created with ${this.polyhedron.getTileCount()} tiles`);
  }

  private createBatchedMeshGroup(): void {
    this.batchedMeshGroup = new THREE.Group();
    this.batchedMeshGroup.position.copy(this.center);
    this.batchedMeshGroup.renderOrder = 0; // Render detailed terrain after LOD (which is -1)
    this.scene.add(this.batchedMeshGroup);
  }

  private createLODMesh(): void {
    this.rebuildLODMesh();

    // Create boundary walls group
    this.boundaryWallsGroup = new THREE.Group();
    this.boundaryWallsGroup.position.copy(this.center);
    this.scene.add(this.boundaryWallsGroup);
  }

  // Create simplified meshes for viewing from great distances
  // These sample actual terrain heights to match the generated planet
  private createDistantLODMeshes(): void {
    // Create 3 levels of distant LOD with decreasing subdivision
    // Level 0: subdivision - 2 (used at PLANET_LOD_DISTANCE_1)
    // Level 1: subdivision - 3 (used at PLANET_LOD_DISTANCE_2)
    // Level 2: subdivision - 4 (used at PLANET_LOD_DISTANCE_3, lowest detail)
    const baseSub = this.polyhedron.subdivisions;
    const lodLevels = [
      Math.max(1, baseSub - 2),
      Math.max(1, baseSub - 3),
      Math.max(1, baseSub - 4)
    ];

    for (let level = 0; level < 3; level++) {
      const lodPolyhedron = new GoldbergPolyhedron(this.radius, lodLevels[level]);

      // Create geometry with terrain-sampled heights
      const geometry = new THREE.BufferGeometry();
      const positions: number[] = [];
      const normals: number[] = [];
      const uvs: number[] = [];
      const colors: number[] = [];
      const indices: number[] = [];
      let vertexOffset = 0;

      // First pass: calculate display radius for each tile
      const tileDisplayRadii = new Map<number, { radius: number; isWater: boolean; color: THREE.Color }>();
      const waterRadius = this.radius - this.SEA_LEVEL * this.BLOCK_HEIGHT;

      // Check if this is a single-texture planet (like moon) - use grey for all surfaces
      const isSingleTexturePlanet = !!this.config.texturePath;

      for (const tile of lodPolyhedron.tiles) {
        const surfaceDepth = this.getHeightVariation(tile.center);
        const terrainRadius = this.radius - surfaceDepth * this.BLOCK_HEIGHT;
        const isWater = !isSingleTexturePlanet && surfaceDepth > this.SEA_LEVEL;
        const displayRadius = isWater ? waterRadius : terrainRadius;

        let color: THREE.Color;
        if (isSingleTexturePlanet) {
          // Single texture planets (like moon) use grey shading based on height
          const heightFactor = Math.max(0.4, Math.min(1.0, 0.6 + surfaceDepth * 0.02));
          color = new THREE.Color(heightFactor * 0.7, heightFactor * 0.7, heightFactor * 0.7);
        } else if (isWater) {
          color = new THREE.Color(0x3399cc);
        } else if (surfaceDepth <= 0) {
          color = new THREE.Color(0x888888);
        } else {
          color = new THREE.Color(0x4a8c4a);
        }

        tileDisplayRadii.set(tile.index, { radius: displayRadius, isWater, color });
      }

      // Second pass: create geometry
      for (const tile of lodPolyhedron.tiles) {
        const tileData = tileDisplayRadii.get(tile.index)!;
        const displayRadius = tileData.radius;
        const color = tileData.color;

        // Create tile face
        const center = tile.center.clone().normalize().multiplyScalar(displayRadius);
        const vertices = tile.vertices.map(v => v.clone().normalize().multiplyScalar(displayRadius));
        const normal = center.clone().normalize();

        // Fan triangulation from center
        const centerIdx = vertexOffset;
        positions.push(center.x, center.y, center.z);
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(0.5, 0.5);
        colors.push(color.r, color.g, color.b);
        vertexOffset++;

        for (let i = 0; i < vertices.length; i++) {
          positions.push(vertices[i].x, vertices[i].y, vertices[i].z);
          normals.push(normal.x, normal.y, normal.z);
          uvs.push(0, 0);
          colors.push(color.r, color.g, color.b);
          vertexOffset++;

          indices.push(centerIdx, centerIdx + 1 + i, centerIdx + 1 + ((i + 1) % vertices.length));
        }

        // Generate side walls for edges where this tile is higher than neighbor
        // (Only for non-water tiles)
        // Iterate through edges (vertices), not neighbors, matching HexBlock.createSeparateGeometries
        if (!tileData.isWater) {
          // Use grey for single-texture planets (moon), brown for Earth
          const sideColor = isSingleTexturePlanet
            ? new THREE.Color(0.5, 0.5, 0.5)
            : new THREE.Color(0x8b7355);
          const numSides = tile.vertices.length;

          for (let i = 0; i < numSides; i++) {
            const next = (i + 1) % numSides;
            const v1 = tile.vertices[i];
            const v2 = tile.vertices[next];

            // Find neighbor across this edge by checking which neighbor is closest to edge midpoint
            const edgeMidDir = v1.clone().add(v2).normalize();
            let neighborData: { radius: number; isWater: boolean; color: THREE.Color } | undefined;
            let closestDist = Infinity;

            for (const nIdx of tile.neighbors) {
              const nData = tileDisplayRadii.get(nIdx);
              if (!nData) continue;
              const neighborTile = lodPolyhedron.tiles[nIdx];
              if (!neighborTile) continue;
              const dist = neighborTile.center.clone().normalize().distanceToSquared(edgeMidDir);
              if (dist < closestDist) {
                closestDist = dist;
                neighborData = nData;
              }
            }

            if (neighborData && neighborData.radius < displayRadius) {
              // Vertex order matches HexBlock.createSeparateGeometries:
              // innerV1, innerV2, outerV2, outerV1 with indices (0,1,2), (0,2,3)
              const innerV1 = v1.clone().normalize().multiplyScalar(neighborData.radius);
              const innerV2 = v2.clone().normalize().multiplyScalar(neighborData.radius);
              const outerV2 = v2.clone().normalize().multiplyScalar(displayRadius);
              const outerV1 = v1.clone().normalize().multiplyScalar(displayRadius);

              const baseIdx = vertexOffset;

              // Add vertices in same order as HexBlock sides
              positions.push(innerV1.x, innerV1.y, innerV1.z);
              positions.push(innerV2.x, innerV2.y, innerV2.z);
              positions.push(outerV2.x, outerV2.y, outerV2.z);
              positions.push(outerV1.x, outerV1.y, outerV1.z);

              // Calculate side normal (same as HexBlock)
              const edge = outerV2.clone().sub(outerV1).normalize();
              const midPoint = outerV1.clone().add(outerV2).multiplyScalar(0.5);
              const sideNormal = midPoint.clone().normalize();
              sideNormal.sub(edge.clone().multiplyScalar(sideNormal.dot(edge))).normalize();

              normals.push(sideNormal.x, sideNormal.y, sideNormal.z);
              normals.push(sideNormal.x, sideNormal.y, sideNormal.z);
              normals.push(sideNormal.x, sideNormal.y, sideNormal.z);
              normals.push(sideNormal.x, sideNormal.y, sideNormal.z);

              uvs.push(0, 0, 1, 0, 1, 0.5, 0, 0.5);

              colors.push(sideColor.r, sideColor.g, sideColor.b);
              colors.push(sideColor.r, sideColor.g, sideColor.b);
              colors.push(sideColor.r, sideColor.g, sideColor.b);
              colors.push(sideColor.r, sideColor.g, sideColor.b);

              // Same winding as HexBlock: (0,1,2), (0,2,3)
              indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
              indices.push(baseIdx, baseIdx + 2, baseIdx + 3);

              vertexOffset += 4;
            }
          }
        }
      }

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setIndex(indices);

      // Create material that uses vertex colors
      const material = new THREE.MeshLambertMaterial({
        vertexColors: true,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(this.center);
      mesh.visible = false; // Start hidden
      mesh.renderOrder = -2; // Render behind everything else
      this.scene.add(mesh);
      this.distantLODMeshes.push(mesh);
    }
  }

  private rebuildLODMesh(): void {
    // Remove old LOD mesh if it exists
    if (this.lodMesh) {
      const lodGroup = this.lodMesh as unknown as THREE.Group;
      // Dispose geometries
      lodGroup.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          child.geometry.dispose();
        }
      });
      this.scene.remove(lodGroup);
      this.lodMesh = null;
      this.lodWaterMesh = null;
    }

    // Offset LOD inward slightly so detailed terrain renders on top
    const lodOffset = 0.3;
    const waterRadius = this.radius - this.SEA_LEVEL * this.BLOCK_HEIGHT - lodOffset;

    // Batch all LOD tiles into material groups with proper heights
    const grassPositions: number[] = [];
    const grassNormals: number[] = [];
    const grassUvs: number[] = [];
    const grassIndices: number[] = [];

    const dirtPositions: number[] = [];
    const dirtNormals: number[] = [];
    const dirtUvs: number[] = [];
    const dirtIndices: number[] = [];

    const waterPositions: number[] = [];
    const waterNormals: number[] = [];
    const waterUvs: number[] = [];
    const waterIndices: number[] = [];

    let grassVertexOffset = 0;
    let dirtVertexOffset = 0;
    let waterVertexOffset = 0;

    // First pass: calculate display radius for each LOD tile
    // Also calculate for detailed tiles so LOD can generate walls at the boundary
    // Store both radius and whether it's water for side wall generation
    const tileDisplayRadii = new Map<number, { radius: number; isWater: boolean }>();
    for (const [tileIndex, column] of this.columns) {
      let surfaceDepth = 0;
      let surfaceBlockType = HexBlockType.GRASS;
      for (let d = 0; d < column.blocks.length; d++) {
        if (column.blocks[d] !== HexBlockType.AIR) {
          surfaceDepth = d;
          surfaceBlockType = column.blocks[d];
          break;
        }
      }

      let displayRadius: number;
      const isWater = surfaceBlockType === HexBlockType.WATER;
      if (isWater) {
        displayRadius = waterRadius;
      } else {
        displayRadius = this.radius - surfaceDepth * this.BLOCK_HEIGHT - lodOffset;
      }
      tileDisplayRadii.set(tileIndex, { radius: displayRadius, isWater });
    }

    for (const [tileIndex, column] of this.columns) {
      // Skip tiles that are in the detailed render range
      if (this.cachedNearbyTiles.has(tileIndex)) {
        continue;
      }

      // Find surface block type
      let surfaceBlockType = HexBlockType.GRASS;
      for (let d = 0; d < column.blocks.length; d++) {
        if (column.blocks[d] !== HexBlockType.AIR) {
          surfaceBlockType = column.blocks[d];
          break;
        }
      }

      const tile = column.tile;
      const normal = tile.center.clone().normalize();

      // Calculate the display radius based on terrain type
      const tileData = tileDisplayRadii.get(tileIndex);
      const displayRadius = tileData?.radius ?? (this.radius - lodOffset);

      // Create simple flat polygon for this tile at the correct height
      const center = normal.clone().multiplyScalar(displayRadius);
      const vertices = tile.vertices.map(v =>
        v.clone().normalize().multiplyScalar(displayRadius)
      );

      // Select which buffer to add to
      let positions: number[], normals: number[], uvs: number[], indices: number[];
      let vertexOffset: number;

      if (surfaceBlockType === HexBlockType.WATER) {
        positions = waterPositions;
        normals = waterNormals;
        uvs = waterUvs;
        indices = waterIndices;
        vertexOffset = waterVertexOffset;
      } else if (surfaceBlockType === HexBlockType.DIRT) {
        positions = dirtPositions;
        normals = dirtNormals;
        uvs = dirtUvs;
        indices = dirtIndices;
        vertexOffset = dirtVertexOffset;
      } else {
        positions = grassPositions;
        normals = grassNormals;
        uvs = grassUvs;
        indices = grassIndices;
        vertexOffset = grassVertexOffset;
      }

      // Fan triangulation from center
      const centerIdx = vertexOffset;
      positions.push(center.x, center.y, center.z);
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(0.5, 0.5);
      vertexOffset++;

      for (let i = 0; i < vertices.length; i++) {
        positions.push(vertices[i].x, vertices[i].y, vertices[i].z);
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(0, 0);
        vertexOffset++;

        indices.push(centerIdx, centerIdx + 1 + i, centerIdx + 1 + ((i + 1) % vertices.length));
      }

      // Update the correct offset
      if (surfaceBlockType === HexBlockType.WATER) {
        waterVertexOffset = vertexOffset;
      } else if (surfaceBlockType === HexBlockType.DIRT) {
        dirtVertexOffset = vertexOffset;
      } else {
        grassVertexOffset = vertexOffset;
      }

      this.lodTileVisibility.set(tileIndex, true);
    }

    // Second pass: Generate side walls between LOD tiles at different heights
    // Also generate walls at boundary with detailed terrain tiles
    // Separate buffers for terrain sides and water sides
    const sidePositions: number[] = [];
    const sideNormals: number[] = [];
    const sideUvs: number[] = [];
    const sideIndices: number[] = [];
    let sideVertexOffset = 0;

    const waterSidePositions: number[] = [];
    const waterSideNormals: number[] = [];
    const waterSideUvs: number[] = [];
    const waterSideIndices: number[] = [];
    let waterSideVertexOffset = 0;

    for (const [tileIndex, column] of this.columns) {
      // Skip tiles that are in the detailed render range
      if (this.cachedNearbyTiles.has(tileIndex)) {
        continue;
      }

      const tile = column.tile;
      const thisTileData = tileDisplayRadii.get(tileIndex);
      const thisRadius = thisTileData?.radius ?? this.radius;
      const thisIsWater = thisTileData?.isWater ?? false;
      const numSides = tile.vertices.length;

      // Iterate through edges (vertices), matching HexBlock.createSeparateGeometries
      for (let i = 0; i < numSides; i++) {
        const next = (i + 1) % numSides;
        const v1 = tile.vertices[i];
        const v2 = tile.vertices[next];

        // Find neighbor across this edge by checking which neighbor is closest to edge midpoint
        const edgeMidDir = v1.clone().add(v2).normalize();
        let neighborRadius: number | undefined;
        let closestDist = Infinity;
        let neighborIsWater = false;

        for (const nIdx of tile.neighbors) {
          const neighborColumn = this.columns.get(nIdx);
          if (!neighborColumn) continue;

          const dist = neighborColumn.tile.center.clone().normalize().distanceToSquared(edgeMidDir);
          if (dist < closestDist) {
            closestDist = dist;
            const neighborData = tileDisplayRadii.get(nIdx);
            neighborRadius = neighborData?.radius;
            neighborIsWater = neighborData?.isWater ?? false;
          }
        }

        // Generate wall if:
        // 1. This tile is higher than neighbor (terrain or water going down)
        // 2. This is water and neighbor is terrain (water meeting ocean floor)
        if (neighborRadius === undefined) continue;
        const needsWall = thisRadius > neighborRadius || (thisIsWater && !neighborIsWater);
        if (!needsWall) continue;

        // Vertex order matches HexBlock.createSeparateGeometries:
        // innerV1, innerV2, outerV2, outerV1 with indices (0,1,2), (0,2,3)
        const innerV1 = v1.clone().normalize().multiplyScalar(neighborRadius);
        const innerV2 = v2.clone().normalize().multiplyScalar(neighborRadius);
        const outerV2 = v2.clone().normalize().multiplyScalar(thisRadius);
        const outerV1 = v1.clone().normalize().multiplyScalar(thisRadius);

        // Calculate side normal (same as HexBlock)
        const edge = outerV2.clone().sub(outerV1).normalize();
        const midPoint = outerV1.clone().add(outerV2).multiplyScalar(0.5);
        const sideNormal = midPoint.clone().normalize();
        sideNormal.sub(edge.clone().multiplyScalar(sideNormal.dot(edge))).normalize();

        // Select appropriate buffer based on whether this is a water tile
        const positions = thisIsWater ? waterSidePositions : sidePositions;
        const normals = thisIsWater ? waterSideNormals : sideNormals;
        const uvs = thisIsWater ? waterSideUvs : sideUvs;
        const indices = thisIsWater ? waterSideIndices : sideIndices;
        const baseIdx = thisIsWater ? waterSideVertexOffset : sideVertexOffset;

        // Add vertices in same order as HexBlock sides
        positions.push(
          innerV1.x, innerV1.y, innerV1.z,
          innerV2.x, innerV2.y, innerV2.z,
          outerV2.x, outerV2.y, outerV2.z,
          outerV1.x, outerV1.y, outerV1.z
        );

        for (let j = 0; j < 4; j++) {
          normals.push(sideNormal.x, sideNormal.y, sideNormal.z);
        }

        // UVs matching HexBlock
        uvs.push(
          0, 0,       // innerV1 (bottom-left)
          1, 0,       // innerV2 (bottom-right)
          1, 0.5,     // outerV2 (top-right)
          0, 0.5      // outerV1 (top-left)
        );

        // Same winding as HexBlock: (0,1,2), (0,2,3)
        indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
        indices.push(baseIdx, baseIdx + 2, baseIdx + 3);

        if (thisIsWater) {
          waterSideVertexOffset += 4;
        } else {
          sideVertexOffset += 4;
        }
      }
    }

    // Third pass: Generate water boundary walls at LOD/terrain edge
    // These walls block the view when underwater at the boundary between detailed terrain and LOD
    // For each LOD water tile that borders a detailed terrain tile, create a wall on that edge
    for (const [tileIndex, column] of this.columns) {
      // Only process LOD tiles (not in detailed range)
      if (this.cachedNearbyTiles.has(tileIndex)) {
        continue;
      }

      const thisTileData = tileDisplayRadii.get(tileIndex);
      const thisIsWater = thisTileData?.isWater ?? false;

      // Only water tiles need boundary walls
      if (!thisIsWater) continue;

      const tile = column.tile;
      const numSides = tile.vertices.length;

      // Check each edge for neighbors in the detailed terrain range
      for (let i = 0; i < numSides; i++) {
        const next = (i + 1) % numSides;
        const v1 = tile.vertices[i];
        const v2 = tile.vertices[next];

        // Find neighbor across this edge
        const edgeMidDir = v1.clone().add(v2).normalize();
        let closestNeighborIdx: number | undefined;
        let closestDist = Infinity;

        for (const nIdx of tile.neighbors) {
          const neighborColumn = this.columns.get(nIdx);
          if (!neighborColumn) continue;

          const dist = neighborColumn.tile.center.clone().normalize().distanceToSquared(edgeMidDir);
          if (dist < closestDist) {
            closestDist = dist;
            closestNeighborIdx = nIdx;
          }
        }

        // Only generate wall if this neighbor is in the detailed terrain range
        if (closestNeighborIdx === undefined) continue;
        if (!this.cachedNearbyTiles.has(closestNeighborIdx)) continue;

        // Get the neighbor's terrain data to find the ocean floor depth
        const neighborData = tileDisplayRadii.get(closestNeighborIdx);
        if (!neighborData) continue;

        // Generate wall from ocean floor (neighbor terrain) up to water surface
        // Wall goes from neighborRadius (ocean floor) to waterRadius (water surface)
        const bottomRadius = neighborData.radius;
        const topRadius = waterRadius;

        // Only create wall if there's actual depth (ocean floor is below water surface)
        if (bottomRadius >= topRadius) continue;

        // Vertex order matches HexBlock.createSeparateGeometries:
        // innerV1, innerV2, outerV2, outerV1 with indices (0,1,2), (0,2,3)
        const innerV1 = v1.clone().normalize().multiplyScalar(bottomRadius);
        const innerV2 = v2.clone().normalize().multiplyScalar(bottomRadius);
        const outerV2 = v2.clone().normalize().multiplyScalar(topRadius);
        const outerV1 = v1.clone().normalize().multiplyScalar(topRadius);

        // Calculate side normal (pointing toward detailed terrain, away from LOD)
        const edge = outerV2.clone().sub(outerV1).normalize();
        const midPoint = outerV1.clone().add(outerV2).multiplyScalar(0.5);
        const sideNormal = midPoint.clone().normalize();
        sideNormal.sub(edge.clone().multiplyScalar(sideNormal.dot(edge))).normalize();

        const baseIdx = waterSideVertexOffset;

        // Add vertices
        waterSidePositions.push(
          innerV1.x, innerV1.y, innerV1.z,
          innerV2.x, innerV2.y, innerV2.z,
          outerV2.x, outerV2.y, outerV2.z,
          outerV1.x, outerV1.y, outerV1.z
        );

        for (let j = 0; j < 4; j++) {
          waterSideNormals.push(sideNormal.x, sideNormal.y, sideNormal.z);
        }

        waterSideUvs.push(
          0, 0,
          1, 0,
          1, 0.5,
          0, 0.5
        );

        waterSideIndices.push(baseIdx, baseIdx + 1, baseIdx + 2);
        waterSideIndices.push(baseIdx, baseIdx + 2, baseIdx + 3);

        waterSideVertexOffset += 4;
      }
    }

    // Create LOD group with batched meshes
    const lodGroup = new THREE.Group();

    if (grassPositions.length > 0) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(grassPositions, 3));
      geom.setAttribute('normal', new THREE.Float32BufferAttribute(grassNormals, 3));
      geom.setAttribute('uv', new THREE.Float32BufferAttribute(grassUvs, 2));
      geom.setIndex(grassIndices);
      const mesh = new THREE.Mesh(geom, this.meshBuilder.getTopLODMaterial());
      lodGroup.add(mesh);
    }

    if (dirtPositions.length > 0) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(dirtPositions, 3));
      geom.setAttribute('normal', new THREE.Float32BufferAttribute(dirtNormals, 3));
      geom.setAttribute('uv', new THREE.Float32BufferAttribute(dirtUvs, 2));
      geom.setIndex(dirtIndices);
      const mesh = new THREE.Mesh(geom, this.meshBuilder.getSideLODMaterial());
      lodGroup.add(mesh);
    }

    if (waterPositions.length > 0) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(waterPositions, 3));
      geom.setAttribute('normal', new THREE.Float32BufferAttribute(waterNormals, 3));
      geom.setAttribute('uv', new THREE.Float32BufferAttribute(waterUvs, 2));
      geom.setIndex(waterIndices);
      this.lodWaterMesh = new THREE.Mesh(geom, this.meshBuilder.getWaterLODMaterial());
      this.lodWaterMesh.renderOrder = -2;
      lodGroup.add(this.lodWaterMesh);
    }

    // Add side walls mesh (dirt texture for cliff sides)
    if (sidePositions.length > 0) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(sidePositions, 3));
      geom.setAttribute('normal', new THREE.Float32BufferAttribute(sideNormals, 3));
      geom.setAttribute('uv', new THREE.Float32BufferAttribute(sideUvs, 2));
      geom.setIndex(sideIndices);
      const mesh = new THREE.Mesh(geom, this.meshBuilder.getSideLODMaterial());
      lodGroup.add(mesh);
    }

    // Add water side walls mesh (prevents see-through effect when underwater)
    if (waterSidePositions.length > 0) {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.Float32BufferAttribute(waterSidePositions, 3));
      geom.setAttribute('normal', new THREE.Float32BufferAttribute(waterSideNormals, 3));
      geom.setAttribute('uv', new THREE.Float32BufferAttribute(waterSideUvs, 2));
      geom.setIndex(waterSideIndices);
      const mesh = new THREE.Mesh(geom, this.meshBuilder.getWaterLODMaterial());
      mesh.renderOrder = -2;
      lodGroup.add(mesh);
    }

    lodGroup.position.copy(this.center);
    lodGroup.renderOrder = -1;
    this.scene.add(lodGroup);
    this.lodMesh = lodGroup as unknown as THREE.Mesh;

    this.needsLODRebuild = false;
  }

  private generateTerrain(): void {
    const hasWater = this.config.hasWater !== false && !this.config.texturePath;

    // First pass: Generate height map with geographic features
    const heightMap = new Map<number, number>();

    for (const tile of this.polyhedron.tiles) {
      const surfaceDepth = this.getHeightVariation(tile.center);
      heightMap.set(tile.index, surfaceDepth);
    }

    // Second pass: Create blocks based on height map
    for (const tile of this.polyhedron.tiles) {
      const blocks: HexBlockType[] = [];
      const surfaceDepth = heightMap.get(tile.index) ?? this.SEA_LEVEL;

      for (let depth = 0; depth < this.MAX_DEPTH; depth++) {
        if (depth < surfaceDepth) {
          blocks.push(HexBlockType.AIR);
        } else if (depth === surfaceDepth) {
          if (hasWater && surfaceDepth > this.SEA_LEVEL) {
            // Underwater surface
            blocks.push(HexBlockType.DIRT);
          } else {
            blocks.push(HexBlockType.GRASS);
          }
        } else if (depth < surfaceDepth + 3) {
          blocks.push(HexBlockType.DIRT);
        } else {
          blocks.push(HexBlockType.STONE);
        }
      }

      const boundingSphere = new THREE.Sphere(
        tile.center.clone().add(this.center),
        this.BLOCK_HEIGHT * this.MAX_DEPTH
      );

      const column: PlanetColumn = {
        tile,
        blocks,
        isDirty: true,
        boundingSphere
      };

      this.columns.set(tile.index, column);
    }

    if (hasWater) {
      this.fillOceans();
    }
  }

  private fillOceans(): void {
    // Fill all tiles below sea level with water (creates oceans only)
    // No inland lakes for now - will add when we have proper water flow
    for (const [_, column] of this.columns) {
      let surfaceDepth = this.MAX_DEPTH;
      for (let d = 0; d < column.blocks.length; d++) {
        if (column.blocks[d] !== HexBlockType.AIR) {
          surfaceDepth = d;
          break;
        }
      }

      // Only fill water below sea level (ocean basins)
      if (surfaceDepth > this.SEA_LEVEL) {
        for (let d = this.SEA_LEVEL; d < surfaceDepth; d++) {
          if (column.blocks[d] === HexBlockType.AIR) {
            column.blocks[d] = HexBlockType.WATER;
          }
        }
        column.isDirty = true;
      }
    }
  }

  public updateBoundingSpheres(): void {
    for (const column of this.columns.values()) {
      column.boundingSphere.center.copy(column.tile.center).add(this.center);
    }
    if (this.lodMesh) {
      (this.lodMesh as unknown as THREE.Group).position.copy(this.center);
    }
    if (this.boundaryWallsGroup) {
      this.boundaryWallsGroup.position.copy(this.center);
    }
    if (this.batchedMeshGroup) {
      this.batchedMeshGroup.position.copy(this.center);
    }
    // Update distant LOD mesh positions
    this.updateDistantLODPositions();
  }

  private getHeightVariation(position: THREE.Vector3): number {
    const variation = this.config.heightVariation ?? 1.0;
    const dir = position.clone().normalize();

    // ============ SIMPLEX NOISE TERRAIN HEIGHT ============
    // Following the approach from threejs-procedural-planets
    // Use fractal Simplex noise with multiple octaves for natural terrain

    // Parameters for terrain generation
    const continentPeriod = PlayerConfig.TERRAIN_CONTINENT_SCALE;  // Lower = larger features
    const mountainPeriod = PlayerConfig.TERRAIN_MOUNTAIN_SCALE;
    const detailPeriod = PlayerConfig.TERRAIN_DETAIL_SCALE;

    // ============ LAYER 1: Continental Base ============
    // Large-scale land/ocean distribution using low-frequency fractal noise
    // This determines the basic shape of continents and oceans
    const continentNoise = this.fractalSimplex3D(
      dir.x, dir.y, dir.z,
      continentPeriod,
      6,      // octaves
      0.5,    // persistence
      2.0     // lacunarity
    );

    // Apply sharpness to create more defined coastlines
    // Values > 0 become land, values < 0 become ocean
    const continentValue = Math.sign(continentNoise) * Math.pow(Math.abs(continentNoise), 0.8);

    // ============ LAYER 2: Mountain Ridges ============
    // Ridge noise creates sharp mountain peaks on land
    const mountainNoise = this.ridgeSimplex3D(
      dir.x, dir.y, dir.z,
      mountainPeriod,
      4,      // octaves
      0.5,    // persistence
      2.2     // lacunarity
    );

    // Mountains only appear on land (where continentValue > 0)
    const landFactor = Math.max(0, continentValue);
    const mountainHeight = mountainNoise * landFactor * PlayerConfig.TERRAIN_MOUNTAIN_HEIGHT;

    // ============ LAYER 3: Hills and Variation ============
    const hillNoise = this.fractalSimplex3D(
      dir.x, dir.y, dir.z,
      PlayerConfig.TERRAIN_HILL_SCALE,
      3,
      0.5,
      2.0
    );

    // ============ LAYER 4: Surface Detail ============
    const detailNoise = this.fractalSimplex3D(
      dir.x, dir.y, dir.z,
      detailPeriod,
      2,
      0.5,
      2.0
    );

    // ============ COMBINE ALL LAYERS ============
    // Height ranges from approximately -1 (deep ocean) to +1.5 (mountain peaks)
    let height = continentValue * PlayerConfig.TERRAIN_CONTINENT_WEIGHT;
    height += mountainHeight;
    height += hillNoise * PlayerConfig.TERRAIN_HILL_WEIGHT * (landFactor > 0.1 ? 1.0 : 0.3);
    height += detailNoise * PlayerConfig.TERRAIN_DETAIL_WEIGHT;

    // ============ CONVERT HEIGHT TO DEPTH ============
    // height > 0 = above sea level (land)
    // height < 0 = below sea level (ocean floor)

    // Scale height to block units
    // Positive height maps to depths 0 to SEA_LEVEL (above water)
    // Negative height maps to depths SEA_LEVEL to MAX_DEPTH (below water/ocean floor)

    let depth: number;
    if (height >= 0) {
      // Land: height 0->1+ maps to depth SEA_LEVEL->0 (higher terrain = lower depth)
      // Use full MAX_HEIGHT range for land
      const landHeight = height * this.MAX_HEIGHT * variation;
      depth = this.SEA_LEVEL - landHeight;
    } else {
      // Ocean: height 0->-1 maps to depth SEA_LEVEL->MAX_DEPTH
      // Use exponential curve for deeper ocean floors
      const oceanFactor = Math.pow(Math.abs(height), PlayerConfig.TERRAIN_OCEAN_DEPTH_POWER);
      const oceanDepth = oceanFactor * PlayerConfig.TERRAIN_MAX_DEPTH * variation;
      depth = this.SEA_LEVEL + oceanDepth;
    }

    // Clamp to valid range and return integer depth
    return Math.max(0, Math.min(this.MAX_DEPTH - 1, Math.round(depth)));
  }

  // Simplex 3D noise - implementation based on Stefan Gustavson's work
  private simplex3D(x: number, y: number, z: number): number {
    // Skewing factors for 3D
    const F3 = 1.0 / 3.0;
    const G3 = 1.0 / 6.0;

    // Incorporate seed
    x += this.seed * 0.1;
    y += this.seed * 0.13;
    z += this.seed * 0.17;

    // Skew input space to determine which simplex cell we're in
    const s = (x + y + z) * F3;
    const i = Math.floor(x + s);
    const j = Math.floor(y + s);
    const k = Math.floor(z + s);

    const t = (i + j + k) * G3;
    const X0 = i - t;
    const Y0 = j - t;
    const Z0 = k - t;

    const x0 = x - X0;
    const y0 = y - Y0;
    const z0 = z - Z0;

    // Determine which simplex we're in
    let i1: number, j1: number, k1: number;
    let i2: number, j2: number, k2: number;

    if (x0 >= y0) {
      if (y0 >= z0) {
        i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 1; k2 = 0;
      } else if (x0 >= z0) {
        i1 = 1; j1 = 0; k1 = 0; i2 = 1; j2 = 0; k2 = 1;
      } else {
        i1 = 0; j1 = 0; k1 = 1; i2 = 1; j2 = 0; k2 = 1;
      }
    } else {
      if (y0 < z0) {
        i1 = 0; j1 = 0; k1 = 1; i2 = 0; j2 = 1; k2 = 1;
      } else if (x0 < z0) {
        i1 = 0; j1 = 1; k1 = 0; i2 = 0; j2 = 1; k2 = 1;
      } else {
        i1 = 0; j1 = 1; k1 = 0; i2 = 1; j2 = 1; k2 = 0;
      }
    }

    const x1 = x0 - i1 + G3;
    const y1 = y0 - j1 + G3;
    const z1 = z0 - k1 + G3;
    const x2 = x0 - i2 + 2.0 * G3;
    const y2 = y0 - j2 + 2.0 * G3;
    const z2 = z0 - k2 + 2.0 * G3;
    const x3 = x0 - 1.0 + 3.0 * G3;
    const y3 = y0 - 1.0 + 3.0 * G3;
    const z3 = z0 - 1.0 + 3.0 * G3;

    // Calculate contribution from four corners
    let n0 = 0, n1 = 0, n2 = 0, n3 = 0;

    let t0 = 0.6 - x0 * x0 - y0 * y0 - z0 * z0;
    if (t0 >= 0) {
      t0 *= t0;
      n0 = t0 * t0 * this.grad3D(i, j, k, x0, y0, z0);
    }

    let t1 = 0.6 - x1 * x1 - y1 * y1 - z1 * z1;
    if (t1 >= 0) {
      t1 *= t1;
      n1 = t1 * t1 * this.grad3D(i + i1, j + j1, k + k1, x1, y1, z1);
    }

    let t2 = 0.6 - x2 * x2 - y2 * y2 - z2 * z2;
    if (t2 >= 0) {
      t2 *= t2;
      n2 = t2 * t2 * this.grad3D(i + i2, j + j2, k + k2, x2, y2, z2);
    }

    let t3 = 0.6 - x3 * x3 - y3 * y3 - z3 * z3;
    if (t3 >= 0) {
      t3 *= t3;
      n3 = t3 * t3 * this.grad3D(i + 1, j + 1, k + 1, x3, y3, z3);
    }

    // Sum contributions and scale to [-1, 1]
    return 32.0 * (n0 + n1 + n2 + n3);
  }

  // Gradient function for Simplex noise
  private grad3D(ix: number, iy: number, iz: number, x: number, y: number, z: number): number {
    // Hash the grid coordinates to get a gradient index
    const hash = this.hash3D(ix, iy, iz) & 15;

    // Gradients for 3D (12 edges of a cube, duplicated for 16 total)
    const gradients = [
      [1, 1, 0], [-1, 1, 0], [1, -1, 0], [-1, -1, 0],
      [1, 0, 1], [-1, 0, 1], [1, 0, -1], [-1, 0, -1],
      [0, 1, 1], [0, -1, 1], [0, 1, -1], [0, -1, -1],
      [1, 1, 0], [-1, 1, 0], [0, -1, 1], [0, -1, -1]
    ];

    const g = gradients[hash];
    return g[0] * x + g[1] * y + g[2] * z;
  }

  // Fractal Simplex noise with multiple octaves
  private fractalSimplex3D(
    x: number, y: number, z: number,
    period: number,
    octaves: number,
    persistence: number,
    lacunarity: number
  ): number {
    let value = 0;
    let amplitude = 1;
    let frequency = period;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += this.simplex3D(x * frequency, y * frequency, z * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return value / maxValue;
  }

  // Ridge noise for mountain ranges (inverted absolute value creates sharp peaks)
  private ridgeSimplex3D(
    x: number, y: number, z: number,
    period: number,
    octaves: number,
    persistence: number,
    lacunarity: number
  ): number {
    let value = 0;
    let amplitude = 1;
    let frequency = period;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      // Absolute value creates valleys at zero crossings
      // Inverting (1 - abs) makes them peaks
      const noise = this.simplex3D(x * frequency, y * frequency, z * frequency);
      const ridge = 1.0 - Math.abs(noise);
      // Square the ridge for sharper peaks
      value += ridge * ridge * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return value / maxValue;
  }

  // Hash function for noise
  private hash3D(x: number, y: number, z: number): number {
    const s = this.seed;
    let h = (x * 374761393 + y * 668265263 + z * 1274126177 + s) | 0;
    h = ((h ^ (h >> 13)) * 1274126177) | 0;
    return h ^ (h >> 16);
  }

  public update(playerPosition: THREE.Vector3, camera: THREE.Camera): void {
    profiler.begin('Planet.frustum');
    this.projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
    profiler.end('Planet.frustum');

    const distToCenter = playerPosition.distanceTo(this.center);
    const altitude = distToCenter - this.radius;

    // Check for distant LOD (viewing from another planet)
    const distantLODLevel = this.getDistantLODLevel(distToCenter);

    if (distantLODLevel >= 0) {
      // Use distant LOD mesh - hide all other meshes
      this.setDistantLODVisible(distantLODLevel);
      if (this.lodMesh) (this.lodMesh as unknown as THREE.Group).visible = false;
      if (this.lodWaterMesh) this.lodWaterMesh.visible = false;
      if (this.batchedMeshGroup) this.batchedMeshGroup.visible = false;
      if (this.boundaryWallsGroup) this.boundaryWallsGroup.visible = false;
      return;
    } else {
      // Hide all distant LOD meshes
      this.setDistantLODVisible(-1);
      if (this.boundaryWallsGroup) this.boundaryWallsGroup.visible = true;
    }

    // When far away but on this planet, only show LOD (including LOD water)
    if (altitude > PlayerConfig.TERRAIN_LOD_SWITCH_ALTITUDE) {
      // Clear cached nearby tiles so LOD water is not culled
      if (this.cachedNearbyTiles.size > 0) {
        this.cachedNearbyTiles.clear();
        this.bufferCenterTiles.clear();
        this.needsLODRebuild = true;
      }

      // Rebuild LOD if needed (to include all water tiles)
      if (this.needsLODRebuild) {
        this.rebuildLODMesh();
      }

      if (this.lodMesh) (this.lodMesh as unknown as THREE.Group).visible = true;
      if (this.lodWaterMesh) this.lodWaterMesh.visible = true;
      if (this.batchedMeshGroup) this.batchedMeshGroup.visible = false;
      return;
    }

    // Show detailed meshes and LOD (LOD is offset inward so depth test handles occlusion)
    if (this.lodMesh) (this.lodMesh as unknown as THREE.Group).visible = true;
    if (this.lodWaterMesh) this.lodWaterMesh.visible = true;
    if (this.batchedMeshGroup) this.batchedMeshGroup.visible = true;

    const altitudeRatio = Math.min(1, Math.max(0, altitude / 100));
    const minDist = PlayerConfig.TERRAIN_MIN_RENDER_DISTANCE;
    const maxDist = PlayerConfig.TERRAIN_MAX_RENDER_DISTANCE;
    const renderDistance = Math.floor(minDist + altitudeRatio * (maxDist - minDist));

    profiler.begin('Planet.getTile');
    const playerTile = this.polyhedron.getTileAtPoint(playerPosition.clone().sub(this.center));
    profiler.end('Planet.getTile');

    if (!playerTile) {
      return;
    }

    const playerTileIndex = playerTile.index;

    // Process incremental rebuild if active
    if (this.isIncrementalRebuildActive) {
      profiler.begin('Planet.incrementalRebuild');
      this.processIncrementalRebuild();
      profiler.end('Planet.incrementalRebuild');
    }

    // Check if player is still within buffer zone (no rebuild needed)
    const bufferZone = PlayerConfig.TERRAIN_BUFFER_ZONE;
    const isWithinBuffer = this.bufferCenterTiles.has(playerTileIndex);

    // Only trigger rebuild if player left buffer zone or render distance changed
    if (!isWithinBuffer || renderDistance !== this.cachedRenderDistance) {
      // Player crossed buffer boundary - start incremental rebuild
      profiler.begin('Planet.tilesInRange');

      const newNearbyTiles = this.getTilesInRange(playerTileIndex, renderDistance);

      // Calculate tiles to add and remove
      const tilesToAdd: number[] = [];
      const tilesToRemove: number[] = [];

      for (const tileIndex of newNearbyTiles) {
        if (!this.cachedNearbyTiles.has(tileIndex)) {
          tilesToAdd.push(tileIndex);
        }
      }

      for (const tileIndex of this.cachedNearbyTiles) {
        if (!newNearbyTiles.has(tileIndex)) {
          tilesToRemove.push(tileIndex);
        }
      }

      // Update buffer center to new player position
      this.bufferCenterTiles = this.getTilesInRange(playerTileIndex, bufferZone);
      this.cachedRenderDistance = renderDistance;

      // If there are changes, queue them for incremental processing
      if (tilesToAdd.length > 0 || tilesToRemove.length > 0) {
        // Update cached tiles immediately for correct rendering
        this.cachedNearbyTiles = newNearbyTiles;

        // Sort tiles by distance to player (closest first for adding, farthest first for removing)
        // This ensures tiles near the player are prioritized
        const playerPos = this.polyhedron.tiles[playerTileIndex].center;

        // Sort tiles to add by distance (closest first = end of array since we pop())
        tilesToAdd.sort((a, b) => {
          const distA = this.polyhedron.tiles[a].center.distanceToSquared(playerPos);
          const distB = this.polyhedron.tiles[b].center.distanceToSquared(playerPos);
          return distB - distA; // Farthest first, so closest is popped last (processed first)
        });

        // Sort tiles to remove by distance (farthest first = end of array since we pop())
        tilesToRemove.sort((a, b) => {
          const distA = this.polyhedron.tiles[a].center.distanceToSquared(playerPos);
          const distB = this.polyhedron.tiles[b].center.distanceToSquared(playerPos);
          return distA - distB; // Closest first, so farthest is popped last (removed first)
        });

        // Queue tiles for incremental mesh rebuild
        this.pendingTilesToAdd.push(...tilesToAdd);
        this.pendingTilesToRemove.push(...tilesToRemove);
        this.isIncrementalRebuildActive = true;

        // Need to rebuild LOD to exclude new nearby tiles
        this.needsLODRebuild = true;

        // Rebuild boundary walls
        profiler.begin('Planet.boundaryWalls');
        this.rebuildBoundaryWalls();
        profiler.end('Planet.boundaryWalls');
      }

      profiler.end('Planet.tilesInRange');
    }

    // Check if any tile in view is dirty (from mining, etc.)
    for (const tileIndex of this.cachedNearbyTiles) {
      const column = this.columns.get(tileIndex);
      if (column?.isDirty) {
        this.needsRebatch = true;
        break;
      }
    }

    // Rebuild batched geometry if needed (dirty tiles or incremental complete)
    if (this.needsRebatch) {
      profiler.begin('Planet.rebatch');
      this.rebuildBatchedMeshes();
      profiler.end('Planet.rebatch');
    }

    // Rebuild LOD mesh if terrain has changed
    if (this.needsLODRebuild) {
      profiler.begin('Planet.LODRebuild');
      this.rebuildLODMesh();
      profiler.end('Planet.LODRebuild');
    }
  }

  private processIncrementalRebuild(): void {
    const tilesPerFrame = PlayerConfig.TERRAIN_TILES_PER_FRAME;
    let processedCount = 0;

    // Process tiles to remove first (frees up resources)
    while (this.pendingTilesToRemove.length > 0 && processedCount < tilesPerFrame) {
      this.pendingTilesToRemove.pop();
      processedCount++;
    }

    // Process tiles to add
    while (this.pendingTilesToAdd.length > 0 && processedCount < tilesPerFrame) {
      this.pendingTilesToAdd.pop();
      processedCount++;
    }

    // Check if incremental rebuild is complete
    if (this.pendingTilesToAdd.length === 0 && this.pendingTilesToRemove.length === 0) {
      this.isIncrementalRebuildActive = false;
      this.needsRebatch = true; // Trigger final mesh rebuild
    }
  }

  private rebuildBatchedMeshes(): void {
    if (!this.batchedMeshGroup) return;

    // Dispose old meshes
    while (this.batchedMeshGroup.children.length > 0) {
      const child = this.batchedMeshGroup.children[0] as THREE.Mesh;
      if (child.geometry) child.geometry.dispose();
      this.batchedMeshGroup.remove(child);
    }

    // Create batched geometry for all visible tiles
    const topData = createEmptyGeometryData();
    const sideData = createEmptyGeometryData();
    const stoneData = createEmptyGeometryData();
    const waterData = createEmptyGeometryData();

    for (const tileIndex of this.cachedNearbyTiles) {
      const column = this.columns.get(tileIndex);
      if (!column) continue;

      // Check frustum culling
      if (!this.frustum.intersectsSphere(column.boundingSphere)) continue;

      this.buildColumnGeometry(column, topData, sideData, stoneData, waterData);
      column.isDirty = false;
    }

    // Create meshes from batched geometry
    if (topData.positions.length > 0) {
      const geom = this.createBufferGeometry(topData);
      this.topMesh = new THREE.Mesh(geom, this.meshBuilder.getTopMaterial());
      this.batchedMeshGroup.add(this.topMesh);
    }

    if (sideData.positions.length > 0) {
      const geom = this.createBufferGeometry(sideData);
      this.sideMesh = new THREE.Mesh(geom, this.meshBuilder.getSideMaterial());
      this.batchedMeshGroup.add(this.sideMesh);
    }

    if (stoneData.positions.length > 0) {
      const geom = this.createBufferGeometry(stoneData);
      this.stoneMesh = new THREE.Mesh(geom, this.meshBuilder.getStoneMaterial());
      this.batchedMeshGroup.add(this.stoneMesh);
    }

    if (waterData.positions.length > 0) {
      const geom = this.createBufferGeometry(waterData);
      this.waterMesh = new THREE.Mesh(geom, this.meshBuilder.getWaterMaterial());
      this.waterMesh.renderOrder = 1;
      this.batchedMeshGroup.add(this.waterMesh);
    }

    // Generate water boundary walls at the edge of detailed terrain facing LOD
    // This prevents seeing through when underwater at the terrain/LOD boundary
    const waterBoundaryData = createEmptyGeometryData();
    const waterSurfaceRadius = this.radius - this.SEA_LEVEL * this.BLOCK_HEIGHT - PlayerConfig.WATER_SURFACE_OFFSET;

    for (const tileIndex of this.cachedNearbyTiles) {
      const column = this.columns.get(tileIndex);
      if (!column) continue;

      const tile = column.tile;

      // Check each edge to see if neighbor is outside detailed range (in LOD territory)
      for (let i = 0; i < tile.vertices.length; i++) {
        const next = (i + 1) % tile.vertices.length;
        const v1 = tile.vertices[i];
        const v2 = tile.vertices[next];

        // Find neighbor across this edge
        const edgeMidDir = v1.clone().add(v2).normalize();
        let closestNeighborIdx: number | undefined;
        let closestDist = Infinity;

        for (const nIdx of tile.neighbors) {
          const neighborColumn = this.columns.get(nIdx);
          if (!neighborColumn) continue;

          const dist = neighborColumn.tile.center.clone().normalize().distanceToSquared(edgeMidDir);
          if (dist < closestDist) {
            closestDist = dist;
            closestNeighborIdx = nIdx;
          }
        }

        // Only generate wall if neighbor is in LOD territory (not in detailed range)
        if (closestNeighborIdx === undefined) continue;
        if (this.cachedNearbyTiles.has(closestNeighborIdx)) continue;

        // Find the ocean floor depth at this tile
        let oceanFloorDepth = this.SEA_LEVEL;
        for (let d = 0; d < column.blocks.length; d++) {
          if (column.blocks[d] !== HexBlockType.AIR && column.blocks[d] !== HexBlockType.WATER) {
            oceanFloorDepth = d;
            break;
          }
        }

        // Only create wall if this tile is underwater (ocean floor is below water surface)
        if (oceanFloorDepth <= this.SEA_LEVEL) continue;

        const oceanFloorRadius = this.radius - oceanFloorDepth * this.BLOCK_HEIGHT;

        // Wall goes from ocean floor up to water surface
        const bottomRadius = oceanFloorRadius;
        const topRadius = waterSurfaceRadius;

        if (bottomRadius >= topRadius) continue;

        // Vertex order: innerV1, innerV2, outerV2, outerV1
        const innerV1 = v1.clone().normalize().multiplyScalar(bottomRadius);
        const innerV2 = v2.clone().normalize().multiplyScalar(bottomRadius);
        const outerV2 = v2.clone().normalize().multiplyScalar(topRadius);
        const outerV1 = v1.clone().normalize().multiplyScalar(topRadius);

        // Normal pointing outward (toward LOD)
        const edge = outerV2.clone().sub(outerV1).normalize();
        const midPoint = outerV1.clone().add(outerV2).multiplyScalar(0.5);
        const sideNormal = midPoint.clone().normalize();
        sideNormal.sub(edge.clone().multiplyScalar(sideNormal.dot(edge))).normalize();

        const baseIdx = waterBoundaryData.vertexOffset;

        waterBoundaryData.positions.push(
          innerV1.x, innerV1.y, innerV1.z,
          innerV2.x, innerV2.y, innerV2.z,
          outerV2.x, outerV2.y, outerV2.z,
          outerV1.x, outerV1.y, outerV1.z
        );

        for (let j = 0; j < 4; j++) {
          waterBoundaryData.normals.push(sideNormal.x, sideNormal.y, sideNormal.z);
        }

        waterBoundaryData.uvs.push(0, 0, 1, 0, 1, 0.5, 0, 0.5);

        waterBoundaryData.indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
        waterBoundaryData.indices.push(baseIdx, baseIdx + 2, baseIdx + 3);

        waterBoundaryData.vertexOffset += 4;
      }
    }

    // Add water boundary walls mesh - solid color matching underwater fog
    if (waterBoundaryData.positions.length > 0) {
      const geom = this.createBufferGeometry(waterBoundaryData);
      const fogColor = new THREE.Color(PlayerConfig.UNDERWATER_FOG_COLOR);
      const boundaryMaterial = new THREE.MeshBasicMaterial({
        color: fogColor,
        side: THREE.DoubleSide
      });
      const boundaryMesh = new THREE.Mesh(geom, boundaryMaterial);
      boundaryMesh.renderOrder = 1;
      this.batchedMeshGroup.add(boundaryMesh);
    }

    this.needsRebatch = false;
  }

  private buildColumnGeometry(
    column: PlanetColumn,
    topData: GeometryData,
    sideData: GeometryData,
    stoneData: GeometryData,
    waterData: GeometryData
  ): void {
    // Find the first solid block depth (surface level)
    let surfaceDepth = 0;
    for (let d = 0; d < column.blocks.length; d++) {
      if (column.blocks[d] !== HexBlockType.AIR && column.blocks[d] !== HexBlockType.WATER) {
        surfaceDepth = d;
        break;
      }
    }

    // Render all blocks in the column - only skip rendering blocks that have no exposed faces
    // This allows full depth/height range to be visible
    for (let depth = 0; depth < column.blocks.length; depth++) {
      const blockType = column.blocks[depth];
      if (blockType === HexBlockType.AIR) continue;

      const isWater = blockType === HexBlockType.WATER;
      const blockAbove = depth === 0 ? HexBlockType.AIR : column.blocks[depth - 1];
      const blockBelow = depth >= column.blocks.length - 1 ? HexBlockType.AIR : column.blocks[depth + 1];

      const hasTopExposed = blockAbove === HexBlockType.AIR || (!isWater && blockAbove === HexBlockType.WATER);
      const hasBottomExposed = blockBelow === HexBlockType.AIR || (!isWater && blockBelow === HexBlockType.WATER);

      if (isWater && blockAbove !== HexBlockType.AIR) continue;

      const hasSideExposed = !isWater && this.hasExposedSide(column, depth);

      if (!isWater && !hasTopExposed && !hasBottomExposed && !hasSideExposed) continue;

      let outerRadius = this.radius - depth * this.BLOCK_HEIGHT;
      let innerRadius = outerRadius - this.BLOCK_HEIGHT;

      if (isWater) {
        outerRadius -= PlayerConfig.WATER_SURFACE_OFFSET;
        innerRadius -= PlayerConfig.WATER_SURFACE_OFFSET;
      }

      if (innerRadius <= 0) continue;

      const depthFromSurface = depth - surfaceDepth;
      const isDeep = depthFromSurface >= this.DEEP_THRESHOLD;

      const { top, bottom, sides } = this.meshBuilder.createSeparateGeometries(
        column.tile,
        innerRadius,
        outerRadius,
        new THREE.Vector3(0, 0, 0),
        isWater ? true : hasTopExposed,
        isWater ? false : hasBottomExposed,
        hasSideExposed
      );

      if (top) {
        const posAttr = top.getAttribute('position');
        const normAttr = top.getAttribute('normal');
        const uvAttr = top.getAttribute('uv');
        const indexAttr = top.getIndex();
        if (posAttr && normAttr && uvAttr && indexAttr) {
          if (isWater) {
            this.mergeGeometry(waterData, posAttr, normAttr, uvAttr, indexAttr, this.sunDirection);
          } else if (isDeep) {
            this.mergeGeometry(stoneData, posAttr, normAttr, uvAttr, indexAttr, this.sunDirection);
          } else {
            this.mergeGeometry(topData, posAttr, normAttr, uvAttr, indexAttr, this.sunDirection);
          }
        }
        top.dispose();
      }

      if (bottom && !isWater) {
        const posAttr = bottom.getAttribute('position');
        const normAttr = bottom.getAttribute('normal');
        const uvAttr = bottom.getAttribute('uv');
        const indexAttr = bottom.getIndex();
        if (posAttr && normAttr && uvAttr && indexAttr) {
          this.mergeGeometry(stoneData, posAttr, normAttr, uvAttr, indexAttr, this.sunDirection);
        }
        bottom.dispose();
      }

      if (sides && !isWater) {
        const posAttr = sides.getAttribute('position');
        const normAttr = sides.getAttribute('normal');
        const uvAttr = sides.getAttribute('uv');
        const indexAttr = sides.getIndex();
        if (posAttr && normAttr && uvAttr && indexAttr) {
          if (isDeep) {
            this.mergeGeometry(stoneData, posAttr, normAttr, uvAttr, indexAttr, this.sunDirection);
          } else {
            this.mergeGeometry(sideData, posAttr, normAttr, uvAttr, indexAttr, this.sunDirection);
          }
        }
        sides.dispose();
      }
    }
  }

  public updateWaterShader(time: number, isUnderwater: boolean = false): void {
    this.meshBuilder.updateWaterShader(time, this.center, isUnderwater);
  }

  public setSunDirection(dir: THREE.Vector3): void {
    this.meshBuilder.setSunDirection(dir);
  }

  private getTilesInRange(centerTileIndex: number, range: number): Set<number> {
    const result = new Set<number>();
    const visited = new Set<number>();
    const queue: { index: number; distance: number }[] = [{ index: centerTileIndex, distance: 0 }];
    let queueStart = 0;

    while (queueStart < queue.length) {
      const current = queue[queueStart++];
      if (visited.has(current.index)) continue;
      visited.add(current.index);

      if (current.distance <= range) {
        result.add(current.index);
        const tile = this.polyhedron.tiles[current.index];
        for (const neighborIndex of tile.neighbors) {
          if (!visited.has(neighborIndex)) {
            queue.push({ index: neighborIndex, distance: current.distance + 1 });
          }
        }
      }
    }
    return result;
  }

  private rebuildBoundaryWalls(): void {
    if (!this.boundaryWallsGroup) return;

    // Clear any existing boundary walls
    while (this.boundaryWallsGroup.children.length > 0) {
      const child = this.boundaryWallsGroup.children[0];
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
      this.boundaryWallsGroup.remove(child);
    }

    // Boundary walls disabled - LOD and detailed terrain should align properly now
  }

  private mergeGeometry(
    data: GeometryData,
    posAttr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
    normAttr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
    uvAttr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
    indexAttr: THREE.BufferAttribute,
    sunDirection: THREE.Vector3
  ): void {
    for (let i = 0; i < posAttr.count; i++) {
      const px = posAttr.getX(i);
      const py = posAttr.getY(i);
      const pz = posAttr.getZ(i);
      const nx = normAttr.getX(i);
      const ny = normAttr.getY(i);
      const nz = normAttr.getZ(i);

      data.positions.push(px, py, pz);
      data.normals.push(nx, ny, nz);
      data.uvs.push(uvAttr.getX(i), uvAttr.getY(i));

      // Only bake position-based lighting into vertex colors if enabled
      if (PlayerConfig.VERTEX_LIGHTING_ENABLED) {
        // Calculate the tile column's sphere normal (radial direction from planet center)
        // This represents where on the planet this tile sits, not which way the face points
        const posLen = Math.sqrt(px * px + py * py + pz * pz);
        let intensity = 1.0;
        if (posLen > 0) {
          const radialX = px / posLen;
          const radialY = py / posLen;
          const radialZ = pz / posLen;
          // Dot product with sun direction gives day/night factor
          const posDot = radialX * sunDirection.x + radialY * sunDirection.y + radialZ * sunDirection.z;
          // Remap from [-1, 1] to [0.2, 1.0] for day/night (night side gets 20% ambient)
          intensity = Math.max(0.2, posDot * 0.5 + 0.5);
        }
        data.colors.push(intensity, intensity, intensity);
      }
    }

    for (let i = 0; i < indexAttr.count; i++) {
      data.indices.push(indexAttr.getX(i) + data.vertexOffset);
    }

    data.vertexOffset += posAttr.count;
  }

  private createBufferGeometry(data: GeometryData): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
    // Only add vertex colors if they exist (only populated when vertex lighting is enabled)
    if (data.colors.length > 0) {
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(data.colors, 3));
    }
    geometry.setIndex(data.indices);
    geometry.computeBoundingSphere();
    return geometry;
  }

  private hasExposedSide(column: PlanetColumn, depth: number): boolean {
    const blockType = column.blocks[depth];
    const isSolid = this.meshBuilder.isSolid(blockType);

    for (const neighborIndex of column.tile.neighbors) {
      const neighborColumn = this.columns.get(neighborIndex);
      if (!neighborColumn) continue;
      if (depth < neighborColumn.blocks.length) {
        const neighborBlock = neighborColumn.blocks[depth];
        if (isSolid && (neighborBlock === HexBlockType.AIR || neighborBlock === HexBlockType.WATER)) {
          return true;
        }
        if (blockType === HexBlockType.WATER && neighborBlock === HexBlockType.AIR) {
          return true;
        }
      }
    }
    return false;
  }

  public getBlock(tileIndex: number, depth: number): HexBlockType {
    const column = this.columns.get(tileIndex);
    if (!column || depth < 0 || depth >= column.blocks.length) {
      return HexBlockType.AIR;
    }
    return column.blocks[depth];
  }

  public setBlock(tileIndex: number, depth: number, blockType: HexBlockType): void {
    const column = this.columns.get(tileIndex);
    if (!column || depth < 0 || depth >= column.blocks.length) return;

    const oldBlockType = column.blocks[depth];
    column.blocks[depth] = blockType;
    column.isDirty = true;
    this.needsRebatch = true;
    this.needsLODRebuild = true; // LOD mesh needs to update when terrain changes

    for (const neighborIndex of column.tile.neighbors) {
      const neighbor = this.columns.get(neighborIndex);
      if (neighbor) neighbor.isDirty = true;
    }

    if (this.meshBuilder.isSolid(oldBlockType) && blockType === HexBlockType.AIR) {
      this.simulateWaterFlow(tileIndex, depth);
    }
  }

  private simulateWaterFlow(tileIndex: number, depth: number): void {
    const column = this.columns.get(tileIndex);
    if (!column) return;

    let hasAdjacentWater = false;

    if (depth > 0 && column.blocks[depth - 1] === HexBlockType.WATER) {
      hasAdjacentWater = true;
    }

    for (const neighborIndex of column.tile.neighbors) {
      const neighbor = this.columns.get(neighborIndex);
      if (neighbor && neighbor.blocks[depth] === HexBlockType.WATER) {
        hasAdjacentWater = true;
      }
    }

    if (!hasAdjacentWater) return;

    this.rebalanceWaterBasin(tileIndex, depth);
  }

  private rebalanceWaterBasin(startTileIndex: number, startDepth: number): void {
    const visited = new Set<string>();
    const queue: { tileIndex: number, depth: number }[] = [{ tileIndex: startTileIndex, depth: startDepth }];
    const basinCells: { tileIndex: number, depth: number, isWater: boolean }[] = [];

    while (queue.length > 0) {
      const { tileIndex, depth } = queue.shift()!;
      const key = `${tileIndex}-${depth}`;

      if (visited.has(key)) continue;
      visited.add(key);

      const column = this.columns.get(tileIndex);
      if (!column || depth < 0 || depth >= column.blocks.length) continue;

      const blockType = column.blocks[depth];
      if (blockType !== HexBlockType.AIR && blockType !== HexBlockType.WATER) continue;

      basinCells.push({ tileIndex, depth, isWater: blockType === HexBlockType.WATER });

      if (depth > 0) {
        const aboveType = column.blocks[depth - 1];
        if (aboveType === HexBlockType.AIR || aboveType === HexBlockType.WATER) {
          queue.push({ tileIndex, depth: depth - 1 });
        }
      }
      if (depth < column.blocks.length - 1) {
        const belowType = column.blocks[depth + 1];
        if (belowType === HexBlockType.AIR || belowType === HexBlockType.WATER) {
          queue.push({ tileIndex, depth: depth + 1 });
        }
      }

      for (const neighborIndex of column.tile.neighbors) {
        const neighbor = this.columns.get(neighborIndex);
        if (neighbor) {
          const neighborType = neighbor.blocks[depth];
          if (neighborType === HexBlockType.AIR || neighborType === HexBlockType.WATER) {
            queue.push({ tileIndex: neighborIndex, depth });
          }
        }
      }
    }

    const totalWater = basinCells.filter(c => c.isWater).length;
    if (totalWater === 0) return;

    basinCells.sort((a, b) => b.depth - a.depth);

    let waterToPlace = totalWater;
    const cellsToFill: { tileIndex: number, depth: number }[] = [];
    const cellsToEmpty: { tileIndex: number, depth: number }[] = [];

    for (const cell of basinCells) {
      if (waterToPlace > 0) {
        cellsToFill.push(cell);
        waterToPlace--;
      } else {
        cellsToEmpty.push(cell);
      }
    }

    for (const cell of cellsToFill) {
      const column = this.columns.get(cell.tileIndex);
      if (column && column.blocks[cell.depth] !== HexBlockType.WATER) {
        column.blocks[cell.depth] = HexBlockType.WATER;
        column.isDirty = true;
        this.needsRebatch = true;
        for (const neighborIndex of column.tile.neighbors) {
          const neighbor = this.columns.get(neighborIndex);
          if (neighbor) neighbor.isDirty = true;
        }
      }
    }

    for (const cell of cellsToEmpty) {
      const column = this.columns.get(cell.tileIndex);
      if (column && column.blocks[cell.depth] === HexBlockType.WATER) {
        column.blocks[cell.depth] = HexBlockType.AIR;
        column.isDirty = true;
        this.needsRebatch = true;
        for (const neighborIndex of column.tile.neighbors) {
          const neighbor = this.columns.get(neighborIndex);
          if (neighbor) neighbor.isDirty = true;
        }
      }
    }
  }

  public getTileAtPoint(point: THREE.Vector3): HexTile | null {
    return this.polyhedron.getTileAtPoint(point.clone().sub(this.center));
  }

  public getDepthAtPoint(point: THREE.Vector3): number {
    const distance = point.distanceTo(this.center);
    return Math.floor((this.radius - distance) / this.BLOCK_HEIGHT);
  }

  public getSurfacePosition(tile: HexTile): THREE.Vector3 {
    const column = this.columns.get(tile.index);
    if (!column) return tile.center.clone().add(this.center);

    for (let depth = 0; depth < column.blocks.length; depth++) {
      if (column.blocks[depth] !== HexBlockType.AIR) {
        const surfaceRadius = this.radius - depth * this.BLOCK_HEIGHT;
        return tile.center.clone().normalize().multiplyScalar(surfaceRadius).add(this.center);
      }
    }
    return tile.center.clone().add(this.center);
  }

  public getGravityDirection(position: THREE.Vector3): THREE.Vector3 {
    return this.center.clone().sub(position).normalize();
  }

  public getSurfaceNormal(position: THREE.Vector3): THREE.Vector3 {
    return position.clone().sub(this.center).normalize();
  }

  public getSurfaceHeightInDirection(direction: THREE.Vector3): number {
    const tile = this.polyhedron.getTileAtPoint(direction.clone().multiplyScalar(this.radius));
    if (!tile) return this.radius;

    const column = this.columns.get(tile.index);
    if (!column) return this.radius;

    for (let depth = 0; depth < column.blocks.length; depth++) {
      const block = column.blocks[depth];
      if (block !== HexBlockType.AIR && block !== HexBlockType.WATER) {
        return this.radius - depth * this.BLOCK_HEIGHT;
      }
    }
    return this.radius;
  }

  public isUnderwaterInDirection(direction: THREE.Vector3): boolean {
    const tile = this.polyhedron.getTileAtPoint(direction.clone().multiplyScalar(this.radius));
    if (!tile) return false;

    const column = this.columns.get(tile.index);
    if (!column) return false;

    for (let depth = 0; depth < column.blocks.length; depth++) {
      const block = column.blocks[depth];
      if (block === HexBlockType.WATER) return true;
      if (block !== HexBlockType.AIR) return false;
    }
    return false;
  }

  public getPolyhedron(): GoldbergPolyhedron {
    return this.polyhedron;
  }

  // Get tile by index for building block wireframes
  public getTileByIndex(index: number): HexTile | null {
    return this.polyhedron.tiles[index] || null;
  }

  // Get block height (BLOCK_HEIGHT constant)
  public getBlockHeight(): number {
    return this.BLOCK_HEIGHT;
  }

  public isInWater(position: THREE.Vector3): boolean {
    const tile = this.getTileAtPoint(position);
    if (!tile) return false;

    const column = this.columns.get(tile.index);
    if (!column) return false;

    let waterSurfaceDepth = -1;
    for (let d = 0; d < column.blocks.length; d++) {
      if (column.blocks[d] === HexBlockType.WATER) {
        waterSurfaceDepth = d;
        break;
      }
    }

    if (waterSurfaceDepth < 0) return false;

    const playerDepth = this.getDepthAtPoint(position);
    return playerDepth >= waterSurfaceDepth;
  }

  public getWaterDepth(position: THREE.Vector3): number {
    const tile = this.getTileAtPoint(position);
    if (!tile) return 0;

    const column = this.columns.get(tile.index);
    if (!column) return 0;

    const currentDepth = this.getDepthAtPoint(position);

    let waterSurfaceDepth = -1;
    for (let d = 0; d < column.blocks.length; d++) {
      if (column.blocks[d] === HexBlockType.WATER) {
        waterSurfaceDepth = d;
        break;
      }
    }

    if (waterSurfaceDepth < 0) return 0;

    if (currentDepth >= waterSurfaceDepth) {
      return (currentDepth - waterSurfaceDepth + 1) * this.BLOCK_HEIGHT;
    }

    return 0;
  }

  public buildAllMeshes(): void {
    this.needsRebatch = true;
  }

  // Raycast against planet geometry to find block at ray intersection
  // Returns { tileIndex, depth, blockType, point, normal } or null if no hit
  // By default ignores water blocks (set includeWater=true to detect water, e.g. for bucket tool)
  public raycast(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number, includeWater: boolean = false): {
    tileIndex: number;
    depth: number;
    blockType: HexBlockType;
    point: THREE.Vector3;
    normal: THREE.Vector3;
  } | null {
    // Step along the ray and check for solid blocks
    const stepSize = 0.2; // Small steps for accuracy
    const rayDir = direction.clone().normalize();
    const testPoint = origin.clone();
    let prevPoint = origin.clone();

    for (let dist = 0; dist < maxDistance; dist += stepSize) {
      prevPoint.copy(testPoint);
      testPoint.copy(origin).addScaledVector(rayDir, dist);

      const tile = this.getTileAtPoint(testPoint);
      if (!tile) continue;

      const depth = this.getDepthAtPoint(testPoint);
      if (depth < 0 || depth >= this.MAX_DEPTH) continue;

      const blockType = this.getBlock(tile.index, depth);
      // Skip air blocks, and skip water unless includeWater is true
      if (blockType === HexBlockType.AIR) continue;
      if (blockType === HexBlockType.WATER && !includeWater) continue;

      // Calculate surface normal (direction from planet center through hit point)
      const normal = testPoint.clone().sub(this.center).normalize();

      return {
        tileIndex: tile.index,
        depth,
        blockType,
        point: testPoint.clone(),
        normal
      };
    }

    return null;
  }

  // Get the batched mesh group for raycasting (used for highlight positioning)
  public getBatchedMeshGroup(): THREE.Group | null {
    return this.batchedMeshGroup;
  }

  // Determine which distant LOD level to use based on distance from planet center
  // Returns -1 if player is close enough to use detailed LOD, 0-2 for distant LOD levels
  private getDistantLODLevel(distToCenter: number): number {
    if (distToCenter >= PlayerConfig.PLANET_LOD_DISTANCE_3) {
      return 2; // Lowest detail
    } else if (distToCenter >= PlayerConfig.PLANET_LOD_DISTANCE_2) {
      return 1; // Medium detail
    } else if (distToCenter >= PlayerConfig.PLANET_LOD_DISTANCE_1) {
      return 0; // Higher detail (but still simplified)
    }
    return -1; // Use normal detailed LOD
  }

  // Set the visibility of distant LOD meshes
  // level = -1 hides all, 0-2 shows only that level
  private setDistantLODVisible(level: number): void {
    if (this.currentDistantLODLevel === level) return; // No change needed

    for (let i = 0; i < this.distantLODMeshes.length; i++) {
      this.distantLODMeshes[i].visible = (i === level);
    }
    this.currentDistantLODLevel = level;
  }

  // Update distant LOD mesh positions when planet center moves
  public updateDistantLODPositions(): void {
    for (const mesh of this.distantLODMeshes) {
      mesh.position.copy(this.center);
    }
  }
}
