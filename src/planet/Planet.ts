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
  skyLight: number[]; // Sky light level (0-1) based on depth from surface
  torchLight: number[]; // Torch light level (0-1.5) baked per vertex
  indices: number[];
  vertexOffset: number;
}

function createEmptyGeometryData(): GeometryData {
  return { positions: [], normals: [], uvs: [], colors: [], skyLight: [], torchLight: [], indices: [], vertexOffset: 0 };
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

  // LOD system - chunked LOD meshes for frustum culling (for nearby/on-planet viewing)
  private lodChunks: THREE.Group[] = []; // 12 chunks based on icosahedron vertices
  private lodChunkBounds: THREE.Sphere[] = []; // Bounding spheres for frustum culling
  private tileToChunk: Map<number, number> = new Map(); // Maps tile index to chunk index
  private lodMesh: THREE.Group | null = null; // Parent group for all LOD chunks
  private lodWaterMesh: THREE.Mesh | null = null; // Separate LOD water mesh for visibility control
  private lodTileVisibility: Map<number, boolean> = new Map(); // Track which LOD tiles should be visible
  private needsLODRebuild: boolean = false; // Flag to rebuild LOD mesh when terrain changes
  private readonly LOD_CHUNK_COUNT = 12; // Based on icosahedron vertices

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
  private needsRebatch: boolean = true; // Flag to rebuild batched geometry

  // Web Worker for off-thread geometry building
  private geometryWorker: Worker | null = null;
  private lodGeometryWorker: Worker | null = null;
  private isWorkerBuildActive: boolean = false;
  private isLODWorkerBuildActive: boolean = false;
  private isLODRebuildScheduled: boolean = false;
  private isWaterWallsScheduled: boolean = false;
  private needsWaterWallsRebuild: boolean = false;
  // Track the nearbyTiles count that the current LOD mesh was built with
  // If this is > 0 but cachedNearbyTiles is empty, the LOD mesh has holes and shouldn't be shown alone
  private currentLODExcludedTileCount: number = 0;
  private pendingLODExcludedCount: number = 0; // Count being sent to worker

  // Cached camera direction from planet center (for LOD back-face culling)
  private cachedCameraDir: { x: number; y: number; z: number } = { x: 0, y: 1, z: 0 };

  // Pre-serialized tile data for LOD worker (static, only needs to be built once)
  private serializedTileData: Record<number, {
    index: number;
    vertices: Array<{ x: number; y: number; z: number }>;
    center: { x: number; y: number; z: number };
    neighbors: number[];
  }> | null = null;
  private serializedTileToChunk: Record<number, number> | null = null;

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

  // Torch data for vertex baking (passed to geometry worker)
  private torchData: Array<{ position: { x: number; y: number; z: number }; range: number; intensity: number }> = [];

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

  // Convert depth to radius
  // Depth system: 0 = bedrock (innermost), MAX_DEPTH-1 = sky (outermost)
  public depthToRadius(depth: number): number {
    return this.radius - (this.MAX_DEPTH - 1 - depth) * this.BLOCK_HEIGHT;
  }

  // Get sea level depth in new system (0 = bedrock)
  public getSeaLevelDepth(): number {
    return this.MAX_DEPTH - 1 - this.SEA_LEVEL;
  }

  public async initialize(): Promise<void> {
    await this.meshBuilder.loadTextures(this.config.texturePath);
    // Set planet center for terrain shader lighting calculations
    this.meshBuilder.setPlanetCenter(this.center);
    // Set water level for terrain shader underwater dimming
    const waterSurfaceRadius = this.depthToRadius(this.getSeaLevelDepth()) - PlayerConfig.WATER_SURFACE_OFFSET;
    this.meshBuilder.setWaterLevel(waterSurfaceRadius);
    this.generateTerrain();
    this.initializeLODChunks();
    this.createLODMesh();
    this.createDistantLODMeshes();
    this.createBatchedMeshGroup();
    this.initializeGeometryWorker();

    console.log(`Planet created with ${this.polyhedron.getTileCount()} tiles`);
  }

  private createBatchedMeshGroup(): void {
    this.batchedMeshGroup = new THREE.Group();
    this.batchedMeshGroup.position.copy(this.center);
    this.batchedMeshGroup.renderOrder = 0; // Render detailed terrain after LOD (which is -1)
    this.scene.add(this.batchedMeshGroup);
  }

  // Initialize LOD chunk system - assigns each tile to one of 12 chunks based on icosahedron vertices
  private initializeLODChunks(): void {
    // 12 icosahedron vertices as chunk centers (golden ratio based)
    const t = (1 + Math.sqrt(5)) / 2;
    const chunkCenters = [
      new THREE.Vector3(-1, t, 0).normalize(),
      new THREE.Vector3(1, t, 0).normalize(),
      new THREE.Vector3(-1, -t, 0).normalize(),
      new THREE.Vector3(1, -t, 0).normalize(),
      new THREE.Vector3(0, -1, t).normalize(),
      new THREE.Vector3(0, 1, t).normalize(),
      new THREE.Vector3(0, -1, -t).normalize(),
      new THREE.Vector3(0, 1, -t).normalize(),
      new THREE.Vector3(t, 0, -1).normalize(),
      new THREE.Vector3(t, 0, 1).normalize(),
      new THREE.Vector3(-t, 0, -1).normalize(),
      new THREE.Vector3(-t, 0, 1).normalize()
    ];

    // Assign each tile to nearest chunk center
    for (const tile of this.polyhedron.tiles) {
      const tileDir = tile.center.clone().normalize();
      let closestChunk = 0;
      let closestDist = Infinity;

      for (let i = 0; i < chunkCenters.length; i++) {
        const dist = tileDir.distanceToSquared(chunkCenters[i]);
        if (dist < closestDist) {
          closestDist = dist;
          closestChunk = i;
        }
      }

      this.tileToChunk.set(tile.index, closestChunk);
    }

    // Create chunk groups and bounding spheres
    for (let i = 0; i < this.LOD_CHUNK_COUNT; i++) {
      const chunkGroup = new THREE.Group();
      this.lodChunks.push(chunkGroup);

      // Bounding sphere centered on chunk with radius to cover the chunk area
      // Each chunk covers roughly 1/12 of the sphere, so radius ~= planetRadius * 0.6
      const boundCenter = chunkCenters[i].clone().multiplyScalar(this.radius).add(this.center);
      const boundRadius = this.radius * 0.7; // Slightly larger to ensure coverage
      this.lodChunkBounds.push(new THREE.Sphere(boundCenter, boundRadius));
    }
  }

  // Frustum cull LOD chunks - hide chunks that are behind the camera or off-screen
  private cullLODChunks(): void {
    if (!this.lodMesh || this.lodChunks.length === 0) return;

    // If LOD mesh has children, cull based on chunk bounds
    // For now, use the lodChunkBounds to cull individual children
    for (let i = 0; i < this.lodChunkBounds.length; i++) {
      const bounds = this.lodChunkBounds[i];
      const isVisible = this.frustum.intersectsSphere(bounds);

      // Set visibility on chunk group if it exists
      if (i < this.lodChunks.length) {
        this.lodChunks[i].visible = isVisible;
      }
    }
  }

  private initializeGeometryWorker(): void {
    try {
      this.geometryWorker = new Worker(
        new URL('../workers/geometryWorker.ts', import.meta.url),
        { type: 'module' }
      );
      this.geometryWorker.onmessage = (e: MessageEvent) => {
        if (e.data.type === 'geometryResult') {
          const start = performance.now();
          this.handleWorkerResult(e.data);
          const elapsed = performance.now() - start;
          profiler.logOneTimeOperation('Terrain Mesh Build', elapsed);
        }
      };
      this.geometryWorker.onerror = (error) => {
        console.error('Geometry worker error:', error);
        this.geometryWorker = null;
      };
    } catch (e) {
      console.warn('Failed to create geometry worker, falling back to main thread:', e);
      this.geometryWorker = null;
    }

    // Initialize LOD geometry worker
    try {
      this.lodGeometryWorker = new Worker(
        new URL('../workers/lodGeometryWorker.ts', import.meta.url),
        { type: 'module' }
      );
      this.lodGeometryWorker.onmessage = (e: MessageEvent) => {
        if (e.data.type === 'lodGeometryResult') {
          const start = performance.now();
          this.handleLODWorkerResult(e.data);
          const elapsed = performance.now() - start;
          profiler.logOneTimeOperation('LOD Mesh Build', elapsed);
        }
      };
      this.lodGeometryWorker.onerror = (error) => {
        console.error('LOD geometry worker error:', error);
        this.lodGeometryWorker = null;
      };
    } catch (e) {
      console.warn('Failed to create LOD geometry worker, falling back to main thread:', e);
      this.lodGeometryWorker = null;
    }
  }

  private handleWorkerResult(data: {
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
  }): void {
    if (!this.batchedMeshGroup) return;

    profiler.begin('Planet.workerResult');

    // Create new meshes FIRST (before removing old ones) to avoid holes
    profiler.begin('Planet.workerResult.createMeshes');
    const newMeshes: THREE.Mesh[] = [];

    // Map worker data keys to material config
    const workerDataMap: Array<{ dataKey: keyof typeof data; materialKey: string; renderOrder?: number }> = [
      { dataKey: 'topData', materialKey: 'top' },
      { dataKey: 'sideData', materialKey: 'side' },
      { dataKey: 'grassSideData', materialKey: 'grassSide' },
      { dataKey: 'stoneData', materialKey: 'stone' },
      { dataKey: 'sandData', materialKey: 'sand' },
      { dataKey: 'woodData', materialKey: 'wood' },
      { dataKey: 'waterData', materialKey: 'water', renderOrder: 1 },
      // Mineral ores
      { dataKey: 'oreCoalData', materialKey: 'oreCoal' },
      { dataKey: 'oreCopperData', materialKey: 'oreCopper' },
      { dataKey: 'oreIronData', materialKey: 'oreIron' },
      { dataKey: 'oreGoldData', materialKey: 'oreGold' },
      { dataKey: 'oreLithiumData', materialKey: 'oreLithium' },
      { dataKey: 'oreAluminumData', materialKey: 'oreAluminum' },
      { dataKey: 'oreCobaltData', materialKey: 'oreCobalt' },
    ];

    for (const { dataKey, materialKey, renderOrder } of workerDataMap) {
      const geomData = data[dataKey] as GeometryData;
      if (geomData.positions.length > 0) {
        const geom = this.createBufferGeometry(geomData);
        const materialConfig = this.BLOCK_MATERIALS.find(m => m.key === materialKey);
        if (materialConfig) {
          const mesh = new THREE.Mesh(geom, materialConfig.getMaterial());
          if (renderOrder !== undefined) {
            mesh.renderOrder = renderOrder;
          }
          newMeshes.push(mesh);
        }
      }
    }
    profiler.end('Planet.workerResult.createMeshes');

    // Now atomically swap: remove old meshes and add new ones
    profiler.begin('Planet.workerResult.swap');
    const oldMeshes: THREE.Mesh[] = [];
    while (this.batchedMeshGroup.children.length > 0) {
      const child = this.batchedMeshGroup.children[0] as THREE.Mesh;
      this.batchedMeshGroup.remove(child);
      oldMeshes.push(child);
    }

    // Add all new meshes
    for (const mesh of newMeshes) {
      this.batchedMeshGroup.add(mesh);
    }

    // Now dispose old geometries (after new ones are visible)
    for (const mesh of oldMeshes) {
      if (mesh.geometry) mesh.geometry.dispose();
    }
    profiler.end('Planet.workerResult.swap');

    // Schedule water boundary walls rebuild (deferred to avoid frame spike)
    const hasWater = this.config.hasWater !== false && !this.config.texturePath;
    if (hasWater) {
      this.needsWaterWallsRebuild = true;
    }

    this.isWorkerBuildActive = false;
    profiler.end('Planet.workerResult');
    // LOD rebuild will happen in next update() call since isWorkerBuildActive is now false
  }

  // Per-chunk geometry data from LOD worker
  private handleLODWorkerResult(data: {
    chunkGeometries: Array<{
      grassPositions: number[]; grassNormals: number[]; grassUvs: number[]; grassSkyLight: number[]; grassIndices: number[];
      dirtPositions: number[]; dirtNormals: number[]; dirtUvs: number[]; dirtSkyLight: number[]; dirtIndices: number[];
      stonePositions: number[]; stoneNormals: number[]; stoneUvs: number[]; stoneSkyLight: number[]; stoneIndices: number[];
      sandPositions: number[]; sandNormals: number[]; sandUvs: number[]; sandSkyLight: number[]; sandIndices: number[];
      woodPositions: number[]; woodNormals: number[]; woodUvs: number[]; woodSkyLight: number[]; woodIndices: number[];
      waterPositions: number[]; waterNormals: number[]; waterUvs: number[]; waterIndices: number[];
      sidePositions: number[]; sideNormals: number[]; sideUvs: number[]; sideSkyLight: number[]; sideIndices: number[];
      waterSidePositions: number[]; waterSideNormals: number[]; waterSideUvs: number[]; waterSideIndices: number[];
    }>;
  }): void {
    const startTotal = performance.now();

    // Remove old LOD mesh
    const startDispose = performance.now();
    if (this.lodMesh) {
      this.lodMesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          child.geometry.dispose();
        }
      });
      this.scene.remove(this.lodMesh);
      this.lodMesh = null;
      this.lodWaterMesh = null;
    }

    // Clear chunk groups
    for (const chunk of this.lodChunks) {
      while (chunk.children.length > 0) {
        const child = chunk.children[0];
        if (child instanceof THREE.Mesh && child.geometry) {
          child.geometry.dispose();
        }
        chunk.remove(child);
      }
    }
    const disposeTime = performance.now() - startDispose;

    // Create LOD parent group
    const lodGroup = new THREE.Group();

    // Helper to create geometry from typed arrays (avoids copy)
    const createGeom = (positions: number[], normals: number[], uvs: number[], indices: number[], skyLight?: number[], torchLight?: number[]): THREE.BufferGeometry => {
      const geom = new THREE.BufferGeometry();
      // Use Float32Array directly to avoid copying
      geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      geom.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
      geom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
      if (skyLight && skyLight.length > 0) {
        geom.setAttribute('skyLight', new THREE.BufferAttribute(new Float32Array(skyLight), 1));
      }
      // Set torchLight attribute (default to zeros if not provided)
      const vertexCount = positions.length / 3;
      if (torchLight && torchLight.length > 0) {
        geom.setAttribute('torchLight', new THREE.BufferAttribute(new Float32Array(torchLight), 1));
      } else {
        // Default to no torch light
        geom.setAttribute('torchLight', new THREE.BufferAttribute(new Float32Array(vertexCount).fill(0), 1));
      }
      geom.setIndex(indices);
      return geom;
    };

    // Create meshes for each chunk
    const startMeshCreation = performance.now();
    let meshCount = 0;
    let totalVertices = 0;
    for (let i = 0; i < this.LOD_CHUNK_COUNT; i++) {
      const chunkData = data.chunkGeometries[i];
      if (!chunkData) continue;

      const chunkGroup = this.lodChunks[i];

      // Grass mesh (uses terrain shader with skyLight)
      if (chunkData.grassPositions.length > 0) {
        const geom = createGeom(chunkData.grassPositions, chunkData.grassNormals, chunkData.grassUvs, chunkData.grassIndices, chunkData.grassSkyLight);
        const mesh = new THREE.Mesh(geom, this.meshBuilder.getTopLODMaterial());
        chunkGroup.add(mesh);
        meshCount++;
        totalVertices += chunkData.grassPositions.length / 3;
      }

      // Dirt mesh (uses terrain shader with skyLight)
      if (chunkData.dirtPositions.length > 0) {
        const geom = createGeom(chunkData.dirtPositions, chunkData.dirtNormals, chunkData.dirtUvs, chunkData.dirtIndices, chunkData.dirtSkyLight);
        const mesh = new THREE.Mesh(geom, this.meshBuilder.getSideLODMaterial());
        chunkGroup.add(mesh);
        meshCount++;
        totalVertices += chunkData.dirtPositions.length / 3;
      }

      // Stone mesh (uses stone LOD material)
      if (chunkData.stonePositions.length > 0) {
        const geom = createGeom(chunkData.stonePositions, chunkData.stoneNormals, chunkData.stoneUvs, chunkData.stoneIndices, chunkData.stoneSkyLight);
        const mesh = new THREE.Mesh(geom, this.meshBuilder.getStoneLODMaterial());
        chunkGroup.add(mesh);
        meshCount++;
        totalVertices += chunkData.stonePositions.length / 3;
      }

      // Sand mesh (uses sand LOD material)
      if (chunkData.sandPositions.length > 0) {
        const geom = createGeom(chunkData.sandPositions, chunkData.sandNormals, chunkData.sandUvs, chunkData.sandIndices, chunkData.sandSkyLight);
        const mesh = new THREE.Mesh(geom, this.meshBuilder.getSandLODMaterial());
        chunkGroup.add(mesh);
        meshCount++;
        totalVertices += chunkData.sandPositions.length / 3;
      }

      // Wood mesh (uses wood LOD material)
      if (chunkData.woodPositions.length > 0) {
        const geom = createGeom(chunkData.woodPositions, chunkData.woodNormals, chunkData.woodUvs, chunkData.woodIndices, chunkData.woodSkyLight);
        const mesh = new THREE.Mesh(geom, this.meshBuilder.getWoodLODMaterial());
        chunkGroup.add(mesh);
        meshCount++;
        totalVertices += chunkData.woodPositions.length / 3;
      }

      // Water mesh (uses simple material, no skyLight needed)
      if (chunkData.waterPositions.length > 0) {
        const geom = createGeom(chunkData.waterPositions, chunkData.waterNormals, chunkData.waterUvs, chunkData.waterIndices);
        const mesh = new THREE.Mesh(geom, this.meshBuilder.getWaterLODMaterial());
        mesh.renderOrder = -2;
        chunkGroup.add(mesh);
        meshCount++;
        totalVertices += chunkData.waterPositions.length / 3;
      }

      // Side walls mesh (uses terrain shader with skyLight)
      if (chunkData.sidePositions.length > 0) {
        const geom = createGeom(chunkData.sidePositions, chunkData.sideNormals, chunkData.sideUvs, chunkData.sideIndices, chunkData.sideSkyLight);
        const mesh = new THREE.Mesh(geom, this.meshBuilder.getSideLODMaterial());
        chunkGroup.add(mesh);
        meshCount++;
        totalVertices += chunkData.sidePositions.length / 3;
      }

      // Water side walls mesh
      if (chunkData.waterSidePositions.length > 0) {
        const geom = createGeom(chunkData.waterSidePositions, chunkData.waterSideNormals, chunkData.waterSideUvs, chunkData.waterSideIndices);
        const mesh = new THREE.Mesh(geom, this.meshBuilder.getWaterLODMaterial());
        mesh.renderOrder = -2;
        chunkGroup.add(mesh);
        meshCount++;
        totalVertices += chunkData.waterSidePositions.length / 3;
      }

      lodGroup.add(chunkGroup);
    }
    const meshCreationTime = performance.now() - startMeshCreation;

    const startSceneAdd = performance.now();
    lodGroup.position.copy(this.center);
    lodGroup.renderOrder = -1;
    this.scene.add(lodGroup);
    this.lodMesh = lodGroup;
    const sceneAddTime = performance.now() - startSceneAdd;

    const totalTime = performance.now() - startTotal;
    console.log(`[LOD Build] Total: ${totalTime.toFixed(1)}ms | Dispose: ${disposeTime.toFixed(1)}ms | Create ${meshCount} meshes (${totalVertices} verts): ${meshCreationTime.toFixed(1)}ms | Scene add: ${sceneAddTime.toFixed(1)}ms`);

    this.isLODWorkerBuildActive = false;

    // Track how many tiles this LOD mesh excludes (expects detailed terrain to fill)
    // This is used to determine if the LOD mesh can be shown alone or needs detailed terrain
    this.currentLODExcludedTileCount = this.pendingLODExcludedCount;

    // Check if the worker result is stale: if the worker excluded tiles
    // but now cachedNearbyTiles is empty, those excluded tiles are now unloaded,
    // causing holes. Trigger a new rebuild with current state.
    if (this.currentLODExcludedTileCount > 0 && this.cachedNearbyTiles.size === 0) {
      // Worker excluded tiles that are now unloaded - need fresh rebuild with no exclusions
      this.needsLODRebuild = true;
    } else {
      this.needsLODRebuild = false;
    }
  }

  private startWorkerBuild(): void {
    if (!this.geometryWorker || this.isWorkerBuildActive) return;

    profiler.begin('Planet.workerBuild.serialize');

    // Prepare column data for worker
    const columns: Array<{
      tileIndex: number;
      tile: {
        index: number;
        vertices: Array<{ x: number; y: number; z: number }>;
        center: { x: number; y: number; z: number };
        neighbors: number[];
      };
      blocks: number[];
    }> = [];

    const neighborData: Record<string, { blocks: number[]; vertices: { x: number; y: number; z: number }[] }> = {};

    // Collect all tiles and their neighbors' block data (including vertices for water walls)
    for (const tileIndex of this.cachedNearbyTiles) {
      const column = this.columns.get(tileIndex);
      if (!column) continue;

      columns.push({
        tileIndex,
        tile: {
          index: column.tile.index,
          vertices: column.tile.vertices.map(v => ({ x: v.x, y: v.y, z: v.z })),
          center: { x: column.tile.center.x, y: column.tile.center.y, z: column.tile.center.z },
          neighbors: column.tile.neighbors
        },
        blocks: [...column.blocks]
      });

      // Add neighbor block and vertex data for side face culling and water walls
      for (const neighborIndex of column.tile.neighbors) {
        if (!neighborData[neighborIndex]) {
          const neighborColumn = this.columns.get(neighborIndex);
          if (neighborColumn) {
            neighborData[neighborIndex] = {
              blocks: [...neighborColumn.blocks],
              vertices: neighborColumn.tile.vertices.map(v => ({ x: v.x, y: v.y, z: v.z }))
            };
          }
        }
      }

      column.isDirty = false;
    }

    this.isWorkerBuildActive = true;
    this.needsRebatch = false;
    profiler.end('Planet.workerBuild.serialize');

    // Send to worker
    profiler.begin('Planet.workerBuild.postMessage');
    this.geometryWorker.postMessage({
      type: 'buildGeometry',
      columns,
      neighborData,
      config: {
        radius: this.radius,
        blockHeight: this.BLOCK_HEIGHT,
        seaLevel: this.SEA_LEVEL,
        maxDepth: this.MAX_DEPTH,
        deepThreshold: this.DEEP_THRESHOLD,
        waterSurfaceOffset: PlayerConfig.WATER_SURFACE_OFFSET,
        sunDirection: {
          x: this.sunDirection.x,
          y: this.sunDirection.y,
          z: this.sunDirection.z
        },
        uvScale: PlayerConfig.TERRAIN_UV_SCALE,
        torches: this.torchData
      }
    });
    profiler.end('Planet.workerBuild.postMessage');
  }

  private startLODWorkerBuild(): void {
    if (!this.lodGeometryWorker || this.isLODWorkerBuildActive) return;

    profiler.begin('Planet.lodWorkerBuild.serialize');

    // Build static tile data cache once (vertices, centers, neighbors don't change)
    if (!this.serializedTileData) {
      this.serializedTileData = {};
      for (const [tileIndex, column] of this.columns) {
        this.serializedTileData[tileIndex] = {
          index: column.tile.index,
          vertices: column.tile.vertices.map(v => ({ x: v.x, y: v.y, z: v.z })),
          center: { x: column.tile.center.x, y: column.tile.center.y, z: column.tile.center.z },
          neighbors: [...column.tile.neighbors]
        };
      }
    }

    // Build tileToChunk cache once
    if (!this.serializedTileToChunk) {
      this.serializedTileToChunk = {};
      for (const [tileIndex, chunkIndex] of this.tileToChunk) {
        this.serializedTileToChunk[tileIndex] = chunkIndex;
      }
    }

    // Only serialize blocks (the dynamic part) - use typed array for speed
    const blockData: Record<number, number[]> = {};
    for (const [tileIndex, column] of this.columns) {
      blockData[tileIndex] = column.blocks;
    }

    this.isLODWorkerBuildActive = true;
    // Track the snapshot size so we can detect if it becomes stale when worker finishes
    this.pendingLODExcludedCount = this.cachedNearbyTiles.size;
    profiler.end('Planet.lodWorkerBuild.serialize');

    // Send to worker
    profiler.begin('Planet.lodWorkerBuild.postMessage');
    this.lodGeometryWorker.postMessage({
      type: 'buildLODGeometry',
      tileData: this.serializedTileData,
      blockData,
      nearbyTiles: Array.from(this.cachedNearbyTiles),
      tileToChunk: this.serializedTileToChunk,
      config: {
        radius: this.radius,
        blockHeight: this.BLOCK_HEIGHT,
        seaLevel: this.SEA_LEVEL,
        maxDepth: this.MAX_DEPTH,
        waterSurfaceOffset: PlayerConfig.WATER_SURFACE_OFFSET,
        lodOffset: 0.3,
        chunkCount: this.LOD_CHUNK_COUNT,
        // Camera direction for back-face culling (skip tiles facing away from camera)
        cameraDir: this.cachedCameraDir
      }
    });
    profiler.end('Planet.lodWorkerBuild.postMessage');
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
      const SEA_LEVEL_DEPTH = this.getSeaLevelDepth();
      const waterRadius = this.depthToRadius(SEA_LEVEL_DEPTH);

      // Check if this is a single-texture planet (like moon) - use grey for all surfaces
      const isSingleTexturePlanet = !!this.config.texturePath;

      for (const tile of lodPolyhedron.tiles) {
        const surfaceDepth = this.getHeightVariation(tile.center);
        const terrainRadius = this.depthToRadius(surfaceDepth);
        const isWater = !isSingleTexturePlanet && surfaceDepth < SEA_LEVEL_DEPTH;
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

        // Compute normalized UVs for this tile (project onto local 2D plane)
        const up = Math.abs(normal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
        const tangent = new THREE.Vector3().crossVectors(up, normal).normalize();
        const bitangent = new THREE.Vector3().crossVectors(normal, tangent);

        const localCoords: { u: number; v: number }[] = [];
        let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;

        for (const vert of tile.vertices) {
          const toVert = vert.clone().sub(tile.center);
          const u = toVert.dot(tangent);
          const v = toVert.dot(bitangent);
          localCoords.push({ u, v });
          minU = Math.min(minU, u);
          maxU = Math.max(maxU, u);
          minV = Math.min(minV, v);
          maxV = Math.max(maxV, v);
        }

        const rangeU = maxU - minU;
        const rangeV = maxV - minV;
        const tileUVs = localCoords.map(coord => ({
          u: (coord.u - minU) / rangeU,
          v: (coord.v - minV) / rangeV
        }));
        const centerUV = { u: (0 - minU) / rangeU, v: (0 - minV) / rangeV };

        // Fan triangulation from center
        const centerIdx = vertexOffset;
        positions.push(center.x, center.y, center.z);
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(centerUV.u, centerUV.v);
        colors.push(color.r, color.g, color.b);
        vertexOffset++;

        for (let i = 0; i < vertices.length; i++) {
          positions.push(vertices[i].x, vertices[i].y, vertices[i].z);
          normals.push(normal.x, normal.y, normal.z);
          uvs.push(tileUVs[i].u, tileUVs[i].v);
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

              // Calculate side normal using cross product of quad edges
              const edge1 = innerV2.clone().sub(innerV1); // horizontal edge
              const edge2 = outerV1.clone().sub(innerV1); // vertical edge
              const sideNormal = edge1.clone().cross(edge2).normalize();

              normals.push(sideNormal.x, sideNormal.y, sideNormal.z);
              normals.push(sideNormal.x, sideNormal.y, sideNormal.z);
              normals.push(sideNormal.x, sideNormal.y, sideNormal.z);
              normals.push(sideNormal.x, sideNormal.y, sideNormal.z);

              uvs.push(0, 0,
                 1, 0,
                 1, 1,
                 0, 1);

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
    // Use worker if available
    if (this.lodGeometryWorker && !this.isLODWorkerBuildActive) {
      this.startLODWorkerBuild();
      return;
    }

    // Fallback to main thread if worker not available or busy
    profiler.begin('Planet.rebuildLODMesh');

    // Remove old LOD mesh and chunks if they exist
    profiler.begin('Planet.rebuildLODMesh.cleanup');
    if (this.lodMesh) {
      const lodGroup = this.lodMesh;
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

    // Clear chunk groups
    for (const chunk of this.lodChunks) {
      while (chunk.children.length > 0) {
        const child = chunk.children[0];
        if (child instanceof THREE.Mesh && child.geometry) {
          child.geometry.dispose();
        }
        chunk.remove(child);
      }
    }
    profiler.end('Planet.rebuildLODMesh.cleanup');

    // Offset LOD inward slightly so detailed terrain renders on top
    const lodOffset = 0.3;
    const waterRadius = this.depthToRadius(this.getSeaLevelDepth()) - lodOffset;

    // Per-chunk geometry buffers
    interface ChunkGeometry {
      grassPositions: number[]; grassNormals: number[]; grassUvs: number[]; grassSkyLight: number[]; grassIndices: number[]; grassVertexOffset: number;
      dirtPositions: number[]; dirtNormals: number[]; dirtUvs: number[]; dirtSkyLight: number[]; dirtIndices: number[]; dirtVertexOffset: number;
      stonePositions: number[]; stoneNormals: number[]; stoneUvs: number[]; stoneSkyLight: number[]; stoneIndices: number[]; stoneVertexOffset: number;
      sandPositions: number[]; sandNormals: number[]; sandUvs: number[]; sandSkyLight: number[]; sandIndices: number[]; sandVertexOffset: number;
      woodPositions: number[]; woodNormals: number[]; woodUvs: number[]; woodSkyLight: number[]; woodIndices: number[]; woodVertexOffset: number;
      waterPositions: number[]; waterNormals: number[]; waterUvs: number[]; waterIndices: number[]; waterVertexOffset: number;
      sidePositions: number[]; sideNormals: number[]; sideUvs: number[]; sideSkyLight: number[]; sideIndices: number[]; sideVertexOffset: number;
      waterSidePositions: number[]; waterSideNormals: number[]; waterSideUvs: number[]; waterSideIndices: number[]; waterSideVertexOffset: number;
    }

    const chunkGeometries: ChunkGeometry[] = [];
    for (let i = 0; i < this.LOD_CHUNK_COUNT; i++) {
      chunkGeometries.push({
        grassPositions: [], grassNormals: [], grassUvs: [], grassSkyLight: [], grassIndices: [], grassVertexOffset: 0,
        dirtPositions: [], dirtNormals: [], dirtUvs: [], dirtSkyLight: [], dirtIndices: [], dirtVertexOffset: 0,
        stonePositions: [], stoneNormals: [], stoneUvs: [], stoneSkyLight: [], stoneIndices: [], stoneVertexOffset: 0,
        sandPositions: [], sandNormals: [], sandUvs: [], sandSkyLight: [], sandIndices: [], sandVertexOffset: 0,
        woodPositions: [], woodNormals: [], woodUvs: [], woodSkyLight: [], woodIndices: [], woodVertexOffset: 0,
        waterPositions: [], waterNormals: [], waterUvs: [], waterIndices: [], waterVertexOffset: 0,
        sidePositions: [], sideNormals: [], sideUvs: [], sideSkyLight: [], sideIndices: [], sideVertexOffset: 0,
        waterSidePositions: [], waterSideNormals: [], waterSideUvs: [], waterSideIndices: [], waterSideVertexOffset: 0
      });
    }

    // Pre-compute normalized tile centers, vertices, and UVs once (avoid redundant normalize calls)
    // This cache is used across all passes
    const normalizedTileData = new Map<number, {
      normalizedCenter: THREE.Vector3;
      normalizedVertices: THREE.Vector3[];
      normalizedUVs: { u: number; v: number }[];
      centerUV: { u: number; v: number };
    }>();

    for (const [tileIndex, column] of this.columns) {
      const tile = column.tile;
      const normalizedCenter = tile.center.clone().normalize();
      const normalizedVertices = tile.vertices.map(v => v.clone().normalize());

      // Create local tangent space for UV mapping
      const up = Math.abs(normalizedCenter.y) < 0.9
        ? new THREE.Vector3(0, 1, 0)
        : new THREE.Vector3(1, 0, 0);
      const tangent = new THREE.Vector3().crossVectors(up, normalizedCenter).normalize();
      const bitangent = new THREE.Vector3().crossVectors(normalizedCenter, tangent);

      // Project vertices onto local 2D plane and find bounding box
      const localCoords: { u: number; v: number }[] = [];
      let minU = Infinity, maxU = -Infinity, minV = Infinity, maxV = -Infinity;

      for (const vert of tile.vertices) {
        const toVert = vert.clone().sub(tile.center);
        const u = toVert.dot(tangent);
        const v = toVert.dot(bitangent);
        localCoords.push({ u, v });
        minU = Math.min(minU, u);
        maxU = Math.max(maxU, u);
        minV = Math.min(minV, v);
        maxV = Math.max(maxV, v);
      }

      // Normalize UVs to 0-1 range
      const rangeU = maxU - minU;
      const rangeV = maxV - minV;
      const normalizedUVs = localCoords.map(coord => ({
        u: (coord.u - minU) / rangeU,
        v: (coord.v - minV) / rangeV
      }));
      const centerUV = {
        u: (0 - minU) / rangeU,
        v: (0 - minV) / rangeV
      };

      normalizedTileData.set(tileIndex, { normalizedCenter, normalizedVertices, normalizedUVs, centerUV });
    }

    // First pass: calculate display radius for each LOD tile
    // Also calculate for detailed tiles so LOD can generate walls at the boundary
    // Store both radius and whether it's water for side wall generation
    profiler.begin('Planet.rebuildLODMesh.pass1');
    const tileDisplayRadii = new Map<number, { radius: number; isWater: boolean; surfaceBlockType: HexBlockType; terrainRadius: number }>();
    for (const [tileIndex, column] of this.columns) {
      // Find surface depth (topmost non-air block, searching from top down)
      let surfaceDepth = 0;
      let surfaceBlockType = HexBlockType.GRASS;
      let terrainDepth = 0; // Topmost solid block (ignoring water)
      for (let d = column.blocks.length - 1; d >= 0; d--) {
        if (column.blocks[d] !== HexBlockType.AIR) {
          if (surfaceBlockType === HexBlockType.GRASS) {
            surfaceDepth = d;
            surfaceBlockType = column.blocks[d];
          }
          if (column.blocks[d] !== HexBlockType.WATER) {
            terrainDepth = d;
            break;
          }
        }
      }

      let displayRadius: number;
      const isWater = surfaceBlockType === HexBlockType.WATER;
      if (isWater) {
        displayRadius = waterRadius;
      } else {
        displayRadius = this.depthToRadius(surfaceDepth) - lodOffset;
      }
      const terrainRadius = this.depthToRadius(terrainDepth) - lodOffset;
      tileDisplayRadii.set(tileIndex, { radius: displayRadius, isWater, surfaceBlockType, terrainRadius });
    }
    profiler.end('Planet.rebuildLODMesh.pass1');

    profiler.begin('Planet.rebuildLODMesh.pass2');
    for (const [tileIndex] of this.columns) {
      // Skip tiles that are in the detailed render range
      if (this.cachedNearbyTiles.has(tileIndex)) {
        continue;
      }

      // Get pre-computed tile data (already has surface block type from pass 1)
      const tileData = tileDisplayRadii.get(tileIndex);
      if (!tileData) continue;
      const surfaceBlockType = tileData.surfaceBlockType;
      const displayRadius = tileData.radius;

      // Use pre-computed normalized data
      const normalizedData = normalizedTileData.get(tileIndex);
      if (!normalizedData) continue;

      const normal = normalizedData.normalizedCenter;

      // Create simple flat polygon for this tile at the correct height
      // Use pre-normalized vertices and just scale them (avoid normalize() calls)
      const center = normal.clone().multiplyScalar(displayRadius);
      const vertices = normalizedData.normalizedVertices.map(v =>
        v.clone().multiplyScalar(displayRadius)
      );

      // Get the chunk for this tile
      const chunkIdx = this.tileToChunk.get(tileIndex) ?? 0;
      const chunk = chunkGeometries[chunkIdx];

      // Select which buffer to add to (per-chunk)
      let positions: number[], normals: number[], uvs: number[], skyLight: number[] | null, indices: number[];
      let vertexOffset: number;

      if (surfaceBlockType === HexBlockType.WATER) {
        positions = chunk.waterPositions;
        normals = chunk.waterNormals;
        uvs = chunk.waterUvs;
        skyLight = null; // Water uses different shader
        indices = chunk.waterIndices;
        vertexOffset = chunk.waterVertexOffset;
      } else if (surfaceBlockType === HexBlockType.DIRT) {
        positions = chunk.dirtPositions;
        normals = chunk.dirtNormals;
        uvs = chunk.dirtUvs;
        skyLight = chunk.dirtSkyLight;
        indices = chunk.dirtIndices;
        vertexOffset = chunk.dirtVertexOffset;
      } else if (surfaceBlockType === HexBlockType.STONE) {
        positions = chunk.stonePositions;
        normals = chunk.stoneNormals;
        uvs = chunk.stoneUvs;
        skyLight = chunk.stoneSkyLight;
        indices = chunk.stoneIndices;
        vertexOffset = chunk.stoneVertexOffset;
      } else if (surfaceBlockType === HexBlockType.SAND) {
        positions = chunk.sandPositions;
        normals = chunk.sandNormals;
        uvs = chunk.sandUvs;
        skyLight = chunk.sandSkyLight;
        indices = chunk.sandIndices;
        vertexOffset = chunk.sandVertexOffset;
      } else if (surfaceBlockType === HexBlockType.WOOD) {
        positions = chunk.woodPositions;
        normals = chunk.woodNormals;
        uvs = chunk.woodUvs;
        skyLight = chunk.woodSkyLight;
        indices = chunk.woodIndices;
        vertexOffset = chunk.woodVertexOffset;
      } else {
        // GRASS, LEAVES, or any other type defaults to grass
        positions = chunk.grassPositions;
        normals = chunk.grassNormals;
        uvs = chunk.grassUvs;
        skyLight = chunk.grassSkyLight;
        indices = chunk.grassIndices;
        vertexOffset = chunk.grassVertexOffset;
      }

      // Fan triangulation from center using pre-computed UVs
      const centerIdx = vertexOffset;
      positions.push(center.x, center.y, center.z);
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(normalizedData.centerUV.u, normalizedData.centerUV.v);
      if (skyLight) skyLight.push(1.0); // LOD is at surface, full sky exposure
      vertexOffset++;

      for (let i = 0; i < vertices.length; i++) {
        positions.push(vertices[i].x, vertices[i].y, vertices[i].z);
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(normalizedData.normalizedUVs[i].u, normalizedData.normalizedUVs[i].v);
        if (skyLight) skyLight.push(1.0);
        vertexOffset++;

        indices.push(centerIdx, centerIdx + 1 + i, centerIdx + 1 + ((i + 1) % vertices.length));
      }

      // Update the correct offset (per-chunk)
      if (surfaceBlockType === HexBlockType.WATER) {
        chunk.waterVertexOffset = vertexOffset;
      } else if (surfaceBlockType === HexBlockType.DIRT) {
        chunk.dirtVertexOffset = vertexOffset;
      } else if (surfaceBlockType === HexBlockType.STONE) {
        chunk.stoneVertexOffset = vertexOffset;
      } else if (surfaceBlockType === HexBlockType.SAND) {
        chunk.sandVertexOffset = vertexOffset;
      } else if (surfaceBlockType === HexBlockType.WOOD) {
        chunk.woodVertexOffset = vertexOffset;
      } else {
        chunk.grassVertexOffset = vertexOffset;
      }

      this.lodTileVisibility.set(tileIndex, true);
    }
    profiler.end('Planet.rebuildLODMesh.pass2');

    // Second pass: Generate side walls between LOD tiles at different heights
    // Also generate walls at boundary with detailed terrain tiles
    // Now using per-chunk buffers
    profiler.begin('Planet.rebuildLODMesh.pass3');
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

      // Get pre-computed normalized data
      const normalizedData = normalizedTileData.get(tileIndex);
      if (!normalizedData) continue;
      const normalizedVerts = normalizedData.normalizedVertices;

      // Get the chunk for this tile
      const chunkIdx = this.tileToChunk.get(tileIndex) ?? 0;
      const chunk = chunkGeometries[chunkIdx];

      // Iterate through edges (vertices), matching HexBlock.createSeparateGeometries
      for (let i = 0; i < numSides; i++) {
        const next = (i + 1) % numSides;
        // Use pre-normalized vertices
        const nv1 = normalizedVerts[i];
        const nv2 = normalizedVerts[next];

        // Find neighbor across this edge by checking which neighbor is closest to edge midpoint
        // Compute edge mid direction using raw math to avoid object allocation
        const emx = nv1.x + nv2.x;
        const emy = nv1.y + nv2.y;
        const emz = nv1.z + nv2.z;
        const emLen = Math.sqrt(emx * emx + emy * emy + emz * emz);
        const edgeMidDirX = emx / emLen;
        const edgeMidDirY = emy / emLen;
        const edgeMidDirZ = emz / emLen;

        let neighborRadius: number | undefined;
        let closestDist = Infinity;
        let neighborIsWater = false;

        for (const nIdx of tile.neighbors) {
          const neighborNormData = normalizedTileData.get(nIdx);
          if (!neighborNormData) continue;

          // Use pre-computed normalized center
          const nc = neighborNormData.normalizedCenter;
          const dx = nc.x - edgeMidDirX;
          const dy = nc.y - edgeMidDirY;
          const dz = nc.z - edgeMidDirZ;
          const dist = dx * dx + dy * dy + dz * dz;

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

        // Vertex positions using pre-normalized vertices (just scale)
        const innerV1x = nv1.x * neighborRadius, innerV1y = nv1.y * neighborRadius, innerV1z = nv1.z * neighborRadius;
        const innerV2x = nv2.x * neighborRadius, innerV2y = nv2.y * neighborRadius, innerV2z = nv2.z * neighborRadius;
        const outerV2x = nv2.x * thisRadius, outerV2y = nv2.y * thisRadius, outerV2z = nv2.z * thisRadius;
        const outerV1x = nv1.x * thisRadius, outerV1y = nv1.y * thisRadius, outerV1z = nv1.z * thisRadius;

        // Calculate side normal using cross product of quad edges (inlined)
        const e1x = innerV2x - innerV1x, e1y = innerV2y - innerV1y, e1z = innerV2z - innerV1z;
        const e2x = outerV1x - innerV1x, e2y = outerV1y - innerV1y, e2z = outerV1z - innerV1z;
        let snx = e1y * e2z - e1z * e2y;
        let sny = e1z * e2x - e1x * e2z;
        let snz = e1x * e2y - e1y * e2x;
        const snLen = Math.sqrt(snx * snx + sny * sny + snz * snz);
        if (snLen > 0) { snx /= snLen; sny /= snLen; snz /= snLen; }

        // Select appropriate buffer based on whether this is a water tile (per-chunk)
        const positions = thisIsWater ? chunk.waterSidePositions : chunk.sidePositions;
        const normals = thisIsWater ? chunk.waterSideNormals : chunk.sideNormals;
        const uvs = thisIsWater ? chunk.waterSideUvs : chunk.sideUvs;
        const sideLight = thisIsWater ? null : chunk.sideSkyLight;
        const indices = thisIsWater ? chunk.waterSideIndices : chunk.sideIndices;
        const baseIdx = thisIsWater ? chunk.waterSideVertexOffset : chunk.sideVertexOffset;

        // Add vertices in same order as HexBlock sides
        positions.push(
          innerV1x, innerV1y, innerV1z,
          innerV2x, innerV2y, innerV2z,
          outerV2x, outerV2y, outerV2z,
          outerV1x, outerV1y, outerV1z
        );

        normals.push(snx, sny, snz, snx, sny, snz, snx, sny, snz, snx, sny, snz);

        // UVs matching HexBlock
        uvs.push(0, 0, 1, 0, 1, 1, 0, 1);

        // Sky light for terrain shader
        if (sideLight) sideLight.push(1.0, 1.0, 1.0, 1.0);

        // Same winding as HexBlock: (0,1,2), (0,2,3)
        indices.push(baseIdx, baseIdx + 1, baseIdx + 2, baseIdx, baseIdx + 2, baseIdx + 3);

        if (thisIsWater) {
          chunk.waterSideVertexOffset += 4;
        } else {
          chunk.sideVertexOffset += 4;
        }
      }
    }
    profiler.end('Planet.rebuildLODMesh.pass3');

    // Third pass: Generate water boundary walls at LOD/terrain edge
    // These walls block the view when underwater at the boundary between detailed terrain and LOD
    // For each LOD water tile that borders a detailed terrain tile, create a wall on that edge
    profiler.begin('Planet.rebuildLODMesh.pass4');
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

      // Get pre-computed normalized data
      const normalizedData = normalizedTileData.get(tileIndex);
      if (!normalizedData) continue;
      const normalizedVerts = normalizedData.normalizedVertices;

      // Get the chunk for this tile
      const chunkIdx = this.tileToChunk.get(tileIndex) ?? 0;
      const chunk = chunkGeometries[chunkIdx];

      // Check each edge for neighbors in the detailed terrain range
      for (let i = 0; i < numSides; i++) {
        const next = (i + 1) % numSides;
        // Use pre-normalized vertices
        const nv1 = normalizedVerts[i];
        const nv2 = normalizedVerts[next];

        // Find neighbor across this edge using inlined math
        const emx = nv1.x + nv2.x;
        const emy = nv1.y + nv2.y;
        const emz = nv1.z + nv2.z;
        const emLen = Math.sqrt(emx * emx + emy * emy + emz * emz);
        const edgeMidDirX = emx / emLen;
        const edgeMidDirY = emy / emLen;
        const edgeMidDirZ = emz / emLen;

        let closestNeighborIdx: number | undefined;
        let closestDist = Infinity;

        for (const nIdx of tile.neighbors) {
          const neighborNormData = normalizedTileData.get(nIdx);
          if (!neighborNormData) continue;

          const nc = neighborNormData.normalizedCenter;
          const dx = nc.x - edgeMidDirX;
          const dy = nc.y - edgeMidDirY;
          const dz = nc.z - edgeMidDirZ;
          const dist = dx * dx + dy * dy + dz * dz;

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
        // Use terrainRadius (solid ground) not radius (which could be water surface)
        const bottomRadius = neighborData.terrainRadius;
        const topRadius = waterRadius;

        // Only create wall if there's actual depth (ocean floor is below water surface)
        if (bottomRadius >= topRadius) continue;

        // Vertex positions using pre-normalized vertices (just scale)
        const innerV1x = nv1.x * bottomRadius, innerV1y = nv1.y * bottomRadius, innerV1z = nv1.z * bottomRadius;
        const innerV2x = nv2.x * bottomRadius, innerV2y = nv2.y * bottomRadius, innerV2z = nv2.z * bottomRadius;
        const outerV2x = nv2.x * topRadius, outerV2y = nv2.y * topRadius, outerV2z = nv2.z * topRadius;
        const outerV1x = nv1.x * topRadius, outerV1y = nv1.y * topRadius, outerV1z = nv1.z * topRadius;

        // Calculate side normal using cross product of quad edges (inlined)
        const e1x = innerV2x - innerV1x, e1y = innerV2y - innerV1y, e1z = innerV2z - innerV1z;
        const e2x = outerV1x - innerV1x, e2y = outerV1y - innerV1y, e2z = outerV1z - innerV1z;
        let snx = e1y * e2z - e1z * e2y;
        let sny = e1z * e2x - e1x * e2z;
        let snz = e1x * e2y - e1y * e2x;
        const snLen = Math.sqrt(snx * snx + sny * sny + snz * snz);
        if (snLen > 0) { snx /= snLen; sny /= snLen; snz /= snLen; }

        const baseIdx = chunk.waterSideVertexOffset;

        // Add vertices
        chunk.waterSidePositions.push(
          innerV1x, innerV1y, innerV1z,
          innerV2x, innerV2y, innerV2z,
          outerV2x, outerV2y, outerV2z,
          outerV1x, outerV1y, outerV1z
        );

        chunk.waterSideNormals.push(snx, sny, snz, snx, sny, snz, snx, sny, snz, snx, sny, snz);

        chunk.waterSideUvs.push(0, 0, 1, 0, 1, 1, 0, 1);

        chunk.waterSideIndices.push(baseIdx, baseIdx + 1, baseIdx + 2, baseIdx, baseIdx + 2, baseIdx + 3);

        chunk.waterSideVertexOffset += 4;
      }
    }
    profiler.end('Planet.rebuildLODMesh.pass4');

    // Create LOD parent group
    profiler.begin('Planet.rebuildLODMesh.createMeshes');
    const lodGroup = new THREE.Group();

    // Create meshes for each chunk and add to chunk groups
    for (let i = 0; i < this.LOD_CHUNK_COUNT; i++) {
      const chunk = chunkGeometries[i];
      const chunkGroup = this.lodChunks[i];

      // Clear existing children
      while (chunkGroup.children.length > 0) {
        chunkGroup.remove(chunkGroup.children[0]);
      }

      // Helper to create LOD geometry with skyLight and torchLight attributes
      const createLODGeom = (positions: number[], normals: number[], uvs: number[], indices: number[], skyLight?: number[]): THREE.BufferGeometry => {
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        if (skyLight && skyLight.length > 0) {
          geom.setAttribute('skyLight', new THREE.Float32BufferAttribute(skyLight, 1));
        }
        // LOD terrain has no torch light (too far away for torches to matter)
        const vertexCount = positions.length / 3;
        geom.setAttribute('torchLight', new THREE.Float32BufferAttribute(new Float32Array(vertexCount).fill(0), 1));
        geom.setIndex(indices);
        return geom;
      };

      // Grass mesh (uses terrain shader with skyLight)
      if (chunk.grassPositions.length > 0) {
        const geom = createLODGeom(chunk.grassPositions, chunk.grassNormals, chunk.grassUvs, chunk.grassIndices, chunk.grassSkyLight);
        const mesh = new THREE.Mesh(geom, this.meshBuilder.getTopLODMaterial());
        chunkGroup.add(mesh);
      }

      // Dirt mesh (uses terrain shader with skyLight)
      if (chunk.dirtPositions.length > 0) {
        const geom = createLODGeom(chunk.dirtPositions, chunk.dirtNormals, chunk.dirtUvs, chunk.dirtIndices, chunk.dirtSkyLight);
        const mesh = new THREE.Mesh(geom, this.meshBuilder.getSideLODMaterial());
        chunkGroup.add(mesh);
      }

      // Stone mesh (uses stone LOD material)
      if (chunk.stonePositions.length > 0) {
        const geom = createLODGeom(chunk.stonePositions, chunk.stoneNormals, chunk.stoneUvs, chunk.stoneIndices, chunk.stoneSkyLight);
        const mesh = new THREE.Mesh(geom, this.meshBuilder.getStoneLODMaterial());
        chunkGroup.add(mesh);
      }

      // Sand mesh (uses sand LOD material)
      if (chunk.sandPositions.length > 0) {
        const geom = createLODGeom(chunk.sandPositions, chunk.sandNormals, chunk.sandUvs, chunk.sandIndices, chunk.sandSkyLight);
        const mesh = new THREE.Mesh(geom, this.meshBuilder.getSandLODMaterial());
        chunkGroup.add(mesh);
      }

      // Wood mesh (uses wood LOD material)
      if (chunk.woodPositions.length > 0) {
        const geom = createLODGeom(chunk.woodPositions, chunk.woodNormals, chunk.woodUvs, chunk.woodIndices, chunk.woodSkyLight);
        const mesh = new THREE.Mesh(geom, this.meshBuilder.getWoodLODMaterial());
        chunkGroup.add(mesh);
      }

      // Water mesh (uses simple material, no skyLight/torchLight)
      if (chunk.waterPositions.length > 0) {
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(chunk.waterPositions, 3));
        geom.setAttribute('normal', new THREE.Float32BufferAttribute(chunk.waterNormals, 3));
        geom.setAttribute('uv', new THREE.Float32BufferAttribute(chunk.waterUvs, 2));
        geom.setIndex(chunk.waterIndices);
        const mesh = new THREE.Mesh(geom, this.meshBuilder.getWaterLODMaterial());
        mesh.renderOrder = -2;
        chunkGroup.add(mesh);
      }

      // Side walls mesh (uses terrain shader with skyLight)
      if (chunk.sidePositions.length > 0) {
        const geom = createLODGeom(chunk.sidePositions, chunk.sideNormals, chunk.sideUvs, chunk.sideIndices, chunk.sideSkyLight);
        const mesh = new THREE.Mesh(geom, this.meshBuilder.getSideLODMaterial());
        chunkGroup.add(mesh);
      }

      // Water side walls mesh
      if (chunk.waterSidePositions.length > 0) {
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(chunk.waterSidePositions, 3));
        geom.setAttribute('normal', new THREE.Float32BufferAttribute(chunk.waterSideNormals, 3));
        geom.setAttribute('uv', new THREE.Float32BufferAttribute(chunk.waterSideUvs, 2));
        geom.setIndex(chunk.waterSideIndices);
        const mesh = new THREE.Mesh(geom, this.meshBuilder.getWaterLODMaterial());
        mesh.renderOrder = -2;
        chunkGroup.add(mesh);
      }

      // Add chunk group to LOD parent
      lodGroup.add(chunkGroup);
    }

    lodGroup.position.copy(this.center);
    lodGroup.renderOrder = -1;
    this.scene.add(lodGroup);
    this.lodMesh = lodGroup;
    profiler.end('Planet.rebuildLODMesh.createMeshes');

    // Track how many tiles this LOD excludes (main thread path)
    this.currentLODExcludedTileCount = this.cachedNearbyTiles.size;
    this.needsLODRebuild = false;
    profiler.end('Planet.rebuildLODMesh');
  }

  private generateTerrain(): void {
    const hasWater = this.config.hasWater !== false && !this.config.texturePath;

    // Generate ore veins before block assignment
    this.generateOreVeins();

    // First pass: Generate height map with geographic features
    const heightMap = new Map<number, number>();

    for (const tile of this.polyhedron.tiles) {
      const surfaceDepth = this.getHeightVariation(tile.center);
      heightMap.set(tile.index, surfaceDepth);
    }

    // Second pass: Identify beach tiles (land tiles adjacent to water tiles)
    // In new depth system: 0 = bedrock, MAX_DEPTH-1 = sky
    // SEA_LEVEL_DEPTH is where sea level sits (counting from bottom)
    const SEA_LEVEL_DEPTH = this.MAX_DEPTH - 1 - this.SEA_LEVEL;
    const beachTiles = new Set<number>();
    if (hasWater) {
      for (const tile of this.polyhedron.tiles) {
        const surfaceDepth = heightMap.get(tile.index) ?? SEA_LEVEL_DEPTH;
        // Only land tiles can be beaches (surface at or above sea level)
        if (surfaceDepth >= SEA_LEVEL_DEPTH) {
          // Check if any neighbor is underwater
          for (const neighborIndex of tile.neighbors) {
            const neighborDepth = heightMap.get(neighborIndex) ?? SEA_LEVEL_DEPTH;
            if (neighborDepth < SEA_LEVEL_DEPTH) {
              // This land tile is next to water - it's a beach!
              beachTiles.add(tile.index);
              break;
            }
          }
        }
      }
      console.log(`[Beach detection] Found ${beachTiles.size} beach tiles out of ${this.polyhedron.tiles.length} total tiles`);
    }

    // Third pass: Create blocks based on height map
    // Depth system: 0 = bedrock (bottom), MAX_DEPTH-1 = sky (top)
    for (const tile of this.polyhedron.tiles) {
      const blocks: HexBlockType[] = [];
      const surfaceDepth = heightMap.get(tile.index) ?? SEA_LEVEL_DEPTH;
      const isBeach = beachTiles.has(tile.index);

      for (let depth = 0; depth < this.MAX_DEPTH; depth++) {
        if (depth > surfaceDepth) {
          // Above surface = air
          blocks.push(HexBlockType.AIR);
        } else if (depth === surfaceDepth) {
          // Surface block
          if (isBeach) {
            // Beach tile (land next to water) - sand surface
            blocks.push(HexBlockType.SAND);
          } else if (hasWater && surfaceDepth < SEA_LEVEL_DEPTH) {
            // Underwater surface
            blocks.push(HexBlockType.DIRT);
          } else {
            blocks.push(HexBlockType.GRASS);
          }
        } else if (depth > surfaceDepth - 3) {
          // Subsurface layers (just below surface) - sand for beaches, dirt otherwise
          if (isBeach) {
            blocks.push(HexBlockType.SAND);
          } else {
            blocks.push(HexBlockType.DIRT);
          }
        } else {
          // Deep underground = stone or ore
          // Use seeded random for deterministic ore placement
          const oreBlock = this.getOreAtDepth(depth, tile.index);
          blocks.push(oreBlock);
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

  // Ore vein configuration - defines each ore type's spawning behavior
  // Ore depth ranges from PLANETS_EARTH.md:
  // - Coal: 12-20, Copper: 10-18, Iron: 4-14, Gold: 0-6
  // - Lithium: 0-4, Aluminum: 2-12, Cobalt: 0-8
  private readonly ORE_CONFIGS: Array<{
    type: HexBlockType;
    minDepth: number;
    maxDepth: number;
    veinChance: number;    // Chance for a vein to spawn at valid depth
    veinSize: number;      // Base size of vein (blocks)
    spreadFactor: number;  // How much vein spreads to neighbors (0-1)
  }> = [
    // Rare ores (deep, small veins)
    { type: HexBlockType.ORE_LITHIUM, minDepth: 0, maxDepth: 4, veinChance: 0.004, veinSize: 4, spreadFactor: 0.6 },
    { type: HexBlockType.ORE_GOLD, minDepth: 0, maxDepth: 6, veinChance: 0.006, veinSize: 5, spreadFactor: 0.65 },
    { type: HexBlockType.ORE_COBALT, minDepth: 0, maxDepth: 8, veinChance: 0.008, veinSize: 6, spreadFactor: 0.7 },
    // Uncommon ores (medium depth, medium veins)
    { type: HexBlockType.ORE_IRON, minDepth: 4, maxDepth: 14, veinChance: 0.012, veinSize: 8, spreadFactor: 0.75 },
    { type: HexBlockType.ORE_ALUMINUM, minDepth: 2, maxDepth: 12, veinChance: 0.010, veinSize: 7, spreadFactor: 0.72 },
    // Common ores (shallow, large veins)
    { type: HexBlockType.ORE_COPPER, minDepth: 10, maxDepth: 18, veinChance: 0.015, veinSize: 10, spreadFactor: 0.8 },
    { type: HexBlockType.ORE_COAL, minDepth: 12, maxDepth: 20, veinChance: 0.018, veinSize: 12, spreadFactor: 0.85 },
  ];

  // Cache for ore veins - generated once per planet
  private oreVeinCache: Map<string, HexBlockType> = new Map();
  private oreVeinsGenerated: boolean = false;

  // Generate all ore veins for the planet (called before block assignment)
  private generateOreVeins(): void {
    if (this.oreVeinsGenerated) return;

    // Seeded random number generator
    const seededRandom = (seed: number): number => {
      const x = Math.sin(seed) * 43758.5453;
      return x - Math.floor(x);
    };

    // Build a quick lookup for tile neighbors (before columns exist)
    const tileNeighbors = new Map<number, number[]>();
    for (const tile of this.polyhedron.tiles) {
      tileNeighbors.set(tile.index, tile.neighbors);
    }

    // For each ore type, generate vein seed points
    for (const oreConfig of this.ORE_CONFIGS) {
      // Use different seed offset for each ore type
      const oreSeedOffset = oreConfig.type * 31337;

      // Iterate through all tiles to find vein seed points
      for (const tile of this.polyhedron.tiles) {
        const tileIndex = tile.index;
        // Check each valid depth for this ore
        for (let depth = oreConfig.minDepth; depth <= oreConfig.maxDepth; depth++) {
          const key = `${tileIndex},${depth}`;
          if (this.oreVeinCache.has(key)) continue; // Already has ore

          // Check if this position is a vein seed point
          const seed = PlayerConfig.TERRAIN_SEED + oreSeedOffset + tileIndex * 7919 + depth * 104729;
          const random = seededRandom(seed);

          if (random < oreConfig.veinChance) {
            // This is a vein seed point - spread ore from here
            this.spreadOreVein(tileIndex, depth, oreConfig, seededRandom, seed, tileNeighbors);
          }
        }
      }
    }

    this.oreVeinsGenerated = true;
  }

  // Spread ore from a seed point to create a vein
  private spreadOreVein(
    seedTileIndex: number,
    seedDepth: number,
    config: typeof this.ORE_CONFIGS[0],
    seededRandom: (seed: number) => number,
    baseSeed: number,
    tileNeighbors: Map<number, number[]>
  ): void {
    const toVisit: Array<{ tileIndex: number; depth: number; probability: number }> = [];
    const visited = new Set<string>();

    // Start from seed point
    toVisit.push({ tileIndex: seedTileIndex, depth: seedDepth, probability: 1.0 });

    let blocksPlaced = 0;
    const maxBlocks = config.veinSize + Math.floor(seededRandom(baseSeed + 999) * config.veinSize * 0.5);

    while (toVisit.length > 0 && blocksPlaced < maxBlocks) {
      const current = toVisit.shift()!;
      const key = `${current.tileIndex},${current.depth}`;

      if (visited.has(key)) continue;
      visited.add(key);

      // Check if within valid depth range
      if (current.depth < config.minDepth || current.depth > config.maxDepth) continue;

      // Probability check for this block
      const placeSeed = baseSeed + current.tileIndex * 13 + current.depth * 17;
      if (seededRandom(placeSeed) > current.probability) continue;

      // Don't overwrite other ores
      if (this.oreVeinCache.has(key)) continue;

      // Place ore
      this.oreVeinCache.set(key, config.type);
      blocksPlaced++;

      // Calculate reduced probability for neighbors
      const neighborProb = current.probability * config.spreadFactor;
      if (neighborProb < 0.1) continue; // Stop spreading if probability too low

      // Spread to vertical neighbors (same tile, adjacent depths)
      toVisit.push({ tileIndex: current.tileIndex, depth: current.depth - 1, probability: neighborProb });
      toVisit.push({ tileIndex: current.tileIndex, depth: current.depth + 1, probability: neighborProb });

      // Spread to horizontal neighbors (adjacent tiles, same depth)
      const neighbors = tileNeighbors.get(current.tileIndex);
      if (neighbors) {
        for (const neighborIndex of neighbors) {
          // Slightly lower probability for horizontal spread
          toVisit.push({ tileIndex: neighborIndex, depth: current.depth, probability: neighborProb * 0.9 });
        }
      }
    }
  }

  // Get ore at a specific position (uses cached vein data)
  private getOreAtDepth(depth: number, tileIndex: number): HexBlockType {
    const key = `${tileIndex},${depth}`;
    return this.oreVeinCache.get(key) || HexBlockType.STONE;
  }

  private fillOceans(): void {
    // Fill all tiles below sea level with water (creates oceans only)
    // No inland lakes for now - will add when we have proper water flow
    // Depth system: 0 = bedrock, MAX_DEPTH-1 = sky
    const SEA_LEVEL_DEPTH = this.MAX_DEPTH - 1 - this.SEA_LEVEL;

    for (const [_, column] of this.columns) {
      // Find surface depth (first non-air block from top)
      let surfaceDepth = 0;
      for (let d = column.blocks.length - 1; d >= 0; d--) {
        if (column.blocks[d] !== HexBlockType.AIR) {
          surfaceDepth = d;
          break;
        }
      }

      // Only fill water below sea level (ocean basins)
      // Surface is below sea level if surfaceDepth < SEA_LEVEL_DEPTH
      if (surfaceDepth < SEA_LEVEL_DEPTH) {
        for (let d = surfaceDepth + 1; d <= SEA_LEVEL_DEPTH; d++) {
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
      this.lodMesh.position.copy(this.center);
    }
    if (this.boundaryWallsGroup) {
      this.boundaryWallsGroup.position.copy(this.center);
    }
    if (this.batchedMeshGroup) {
      this.batchedMeshGroup.position.copy(this.center);
    }
    // Update LOD chunk bounding spheres for frustum culling
    this.updateLODChunkBounds();
    // Update terrain shader planet center
    this.meshBuilder.setPlanetCenter(this.center);
    // Update distant LOD mesh positions
    this.updateDistantLODPositions();
  }

  // Update LOD chunk bounding spheres when planet center moves
  private updateLODChunkBounds(): void {
    // 12 icosahedron vertices as chunk centers (same as initializeLODChunks)
    const t = (1 + Math.sqrt(5)) / 2;
    const chunkCenters = [
      new THREE.Vector3(-1, t, 0).normalize(),
      new THREE.Vector3(1, t, 0).normalize(),
      new THREE.Vector3(-1, -t, 0).normalize(),
      new THREE.Vector3(1, -t, 0).normalize(),
      new THREE.Vector3(0, -1, t).normalize(),
      new THREE.Vector3(0, 1, t).normalize(),
      new THREE.Vector3(0, -1, -t).normalize(),
      new THREE.Vector3(0, 1, -t).normalize(),
      new THREE.Vector3(t, 0, -1).normalize(),
      new THREE.Vector3(t, 0, 1).normalize(),
      new THREE.Vector3(-t, 0, -1).normalize(),
      new THREE.Vector3(-t, 0, 1).normalize()
    ];

    for (let i = 0; i < this.lodChunkBounds.length; i++) {
      const boundCenter = chunkCenters[i].clone().multiplyScalar(this.radius).add(this.center);
      this.lodChunkBounds[i].center.copy(boundCenter);
    }
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
    // Depth system: 0 = bedrock (bottom), MAX_DEPTH-1 = sky (top)
    // height > 0 = above sea level (land)
    // height < 0 = below sea level (ocean floor)

    // Scale height to block units
    // SEA_LEVEL_DEPTH is where sea level sits (counting from bottom)
    const SEA_LEVEL_DEPTH = this.MAX_DEPTH - 1 - this.SEA_LEVEL;

    let depth: number;
    if (height >= 0) {
      // Land: height 0->1+ maps to depth SEA_LEVEL_DEPTH -> MAX_DEPTH-1 (higher terrain = higher depth)
      const landHeight = height * this.MAX_HEIGHT * variation;
      depth = SEA_LEVEL_DEPTH + landHeight;
    } else {
      // Ocean: height 0->-1 maps to depth SEA_LEVEL_DEPTH -> 0 (deeper ocean = lower depth)
      const oceanFactor = Math.pow(Math.abs(height), PlayerConfig.TERRAIN_OCEAN_DEPTH_POWER);
      const oceanDepth = oceanFactor * PlayerConfig.TERRAIN_MAX_DEPTH * variation;
      depth = SEA_LEVEL_DEPTH - oceanDepth;
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

    // Cache camera direction from planet center for LOD back-face culling
    const camX = camera.position.x - this.center.x;
    const camY = camera.position.y - this.center.y;
    const camZ = camera.position.z - this.center.z;
    const camLen = Math.sqrt(camX * camX + camY * camY + camZ * camZ);
    if (camLen > 0) {
      this.cachedCameraDir.x = camX / camLen;
      this.cachedCameraDir.y = camY / camLen;
      this.cachedCameraDir.z = camZ / camLen;
    }

    const distToCenter = playerPosition.distanceTo(this.center);
    const altitude = distToCenter - this.radius;

    // Check for distant LOD (viewing from another planet)
    const distantLODLevel = this.getDistantLODLevel(distToCenter);

    if (distantLODLevel >= 0) {
      // Use distant LOD mesh - hide all other meshes
      this.setDistantLODVisible(distantLODLevel);
      if (this.lodMesh) this.lodMesh.visible = false;
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
      // Only trigger rebuild if not already in progress via worker
      if (this.needsLODRebuild && !this.isLODWorkerBuildActive) {
        this.rebuildLODMesh();
      }

      // Only show LOD alone if it doesn't have holes (wasn't built with excluded tiles)
      // If currentLODExcludedTileCount > 0, the LOD mesh has holes where detailed terrain
      // was expected to render. Keep showing both LOD + detailed terrain until rebuild completes.
      const lodIsComplete = this.currentLODExcludedTileCount === 0;
      if (this.lodMesh) this.lodMesh.visible = true; // Always show LOD (even with holes, it covers most of planet)
      if (this.lodWaterMesh) this.lodWaterMesh.visible = true;
      // Keep detailed terrain visible to fill holes until LOD rebuild completes
      if (this.batchedMeshGroup) this.batchedMeshGroup.visible = !lodIsComplete;
      return;
    }

    // Show detailed meshes and LOD (LOD is offset inward so depth test handles occlusion)
    if (this.lodMesh) {
      this.lodMesh.visible = true;
      // Frustum cull LOD chunks
      this.cullLODChunks();
    }
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

        // Need to rebuild both batched meshes AND LOD
        // Batched meshes need new tiles, LOD needs to exclude them
        this.needsRebatch = true;
        this.needsLODRebuild = true;

        // Rebuild boundary walls
        profiler.begin('Planet.boundaryWalls');
        this.rebuildBoundaryWalls();
        profiler.end('Planet.boundaryWalls');
      }

      profiler.end('Planet.tilesInRange');
    }

    // Process dirty columns from block changes (incremental rebuild)
    if (this.dirtyColumnsQueue.size > 0) {
      profiler.begin('Planet.dirtyRebatch');
      this.rebuildDirtyColumns();
      profiler.end('Planet.dirtyRebatch');
    }

    // Full rebuild batched geometry if needed (tile set changed or incremental complete)
    // Use worker if available, otherwise fall back to main thread
    if (this.needsRebatch && !this.isWorkerBuildActive) {
      if (this.geometryWorker) {
        profiler.begin('Planet.startWorkerBuild');
        this.startWorkerBuild();
        profiler.end('Planet.startWorkerBuild');
      } else {
        profiler.begin('Planet.rebatch');
        this.rebuildBatchedMeshes();
        profiler.end('Planet.rebatch');
      }
    }

    // Rebuild LOD mesh if terrain has changed
    // BUT only if workers aren't actively building - otherwise we'd create holes
    // by excluding tiles from LOD before detailed terrain is ready
    // Use requestIdleCallback to avoid frame drops (LOD rebuild is expensive)
    if (this.needsLODRebuild && !this.isWorkerBuildActive && !this.isLODWorkerBuildActive && !this.isLODRebuildScheduled) {
      this.isLODRebuildScheduled = true;
      // Use requestIdleCallback if available, otherwise setTimeout
      const scheduleRebuild = (window as Window & { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 0));
      scheduleRebuild(() => {
        // Double-check worker isn't active when callback fires
        if (this.needsLODRebuild && !this.isLODWorkerBuildActive) {
          profiler.begin('Planet.LODRebuild');
          this.rebuildLODMesh();
          profiler.end('Planet.LODRebuild');
          // Note: needsLODRebuild is set to false in handleLODWorkerResult or at end of rebuildLODMesh
        }
        this.isLODRebuildScheduled = false;
      });
    }

    // Rebuild water boundary walls (deferred to avoid frame spikes)
    if (this.needsWaterWallsRebuild && !this.isWorkerBuildActive && !this.isWaterWallsScheduled) {
      this.isWaterWallsScheduled = true;
      const scheduleWaterWalls = (window as Window & { requestIdleCallback?: (cb: () => void) => void }).requestIdleCallback || ((cb: () => void) => setTimeout(cb, 0));
      scheduleWaterWalls(() => {
        if (this.needsWaterWallsRebuild) {
          profiler.begin('Planet.waterWalls');
          this.buildWaterBoundaryWalls();
          profiler.end('Planet.waterWalls');
          this.needsWaterWallsRebuild = false;
        }
        this.isWaterWallsScheduled = false;
      });
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

  // Block material configuration - add new block types here
  private readonly BLOCK_MATERIALS: Array<{
    key: string;
    getMaterial: () => THREE.Material;
    renderOrder?: number;
  }> = [
    { key: 'top', getMaterial: () => this.meshBuilder.getTopMaterial() },
    { key: 'side', getMaterial: () => this.meshBuilder.getSideMaterial() },
    { key: 'grassSide', getMaterial: () => this.meshBuilder.getGrassSideMaterial() },
    { key: 'stone', getMaterial: () => this.meshBuilder.getStoneMaterial() },
    { key: 'sand', getMaterial: () => this.meshBuilder.getSandMaterial() },
    { key: 'wood', getMaterial: () => this.meshBuilder.getWoodMaterial() },
    { key: 'water', getMaterial: () => this.meshBuilder.getWaterMaterial(), renderOrder: 1 },
    // Mineral ore materials
    { key: 'oreCoal', getMaterial: () => this.meshBuilder.getMaterial('oreCoal') },
    { key: 'oreCopper', getMaterial: () => this.meshBuilder.getMaterial('oreCopper') },
    { key: 'oreIron', getMaterial: () => this.meshBuilder.getMaterial('oreIron') },
    { key: 'oreGold', getMaterial: () => this.meshBuilder.getMaterial('oreGold') },
    { key: 'oreLithium', getMaterial: () => this.meshBuilder.getMaterial('oreLithium') },
    { key: 'oreAluminum', getMaterial: () => this.meshBuilder.getMaterial('oreAluminum') },
    { key: 'oreCobalt', getMaterial: () => this.meshBuilder.getMaterial('oreCobalt') },
  ];

  private rebuildBatchedMeshes(): void {
    if (!this.batchedMeshGroup) return;

    // Dispose old meshes
    while (this.batchedMeshGroup.children.length > 0) {
      const child = this.batchedMeshGroup.children[0] as THREE.Mesh;
      if (child.geometry) child.geometry.dispose();
      this.batchedMeshGroup.remove(child);
    }

    // Create geometry data for all block types
    const geometryData: Record<string, GeometryData> = {};
    for (const mat of this.BLOCK_MATERIALS) {
      geometryData[mat.key] = createEmptyGeometryData();
    }

    for (const tileIndex of this.cachedNearbyTiles) {
      const column = this.columns.get(tileIndex);
      if (!column) continue;

      // Check frustum culling
      if (!this.frustum.intersectsSphere(column.boundingSphere)) continue;

      this.buildColumnGeometry(column, geometryData);
      column.isDirty = false;
    }

    // Create meshes from batched geometry
    for (const mat of this.BLOCK_MATERIALS) {
      const data = geometryData[mat.key];
      if (data.positions.length > 0) {
        const geom = this.createBufferGeometry(data);
        const mesh = new THREE.Mesh(geom, mat.getMaterial());
        if (mat.renderOrder !== undefined) {
          mesh.renderOrder = mat.renderOrder;
        }
        this.batchedMeshGroup.add(mesh);
      }
    }

    // Schedule water boundary walls rebuild (deferred to avoid frame spike)
    const hasWater = this.config.hasWater !== false && !this.config.texturePath;
    if (hasWater) {
      this.needsWaterWallsRebuild = true;
    }

    this.needsRebatch = false;
  }

  // Get the material key for a block type's top/bottom face
  private getBlockTopMaterialKey(blockType: HexBlockType): string {
    switch (blockType) {
      case HexBlockType.WATER: return 'water';
      case HexBlockType.STONE: return 'stone';
      case HexBlockType.SAND: return 'sand';
      case HexBlockType.DIRT: return 'side';  // Dirt uses side (dirt) texture
      case HexBlockType.WOOD: return 'wood';
      case HexBlockType.GRASS: return 'top';  // Grass top
      // Mineral ores
      case HexBlockType.ORE_COAL: return 'oreCoal';
      case HexBlockType.ORE_COPPER: return 'oreCopper';
      case HexBlockType.ORE_IRON: return 'oreIron';
      case HexBlockType.ORE_GOLD: return 'oreGold';
      case HexBlockType.ORE_LITHIUM: return 'oreLithium';
      case HexBlockType.ORE_ALUMINUM: return 'oreAluminum';
      case HexBlockType.ORE_COBALT: return 'oreCobalt';
      default: return 'top';
    }
  }

  // Get the material key for a block type's side face
  private getBlockSideMaterialKey(blockType: HexBlockType): string {
    switch (blockType) {
      case HexBlockType.STONE: return 'stone';
      case HexBlockType.SAND: return 'sand';
      case HexBlockType.DIRT: return 'side';
      case HexBlockType.WOOD: return 'wood';
      case HexBlockType.GRASS: return 'grassSide';  // Grass sides use dirt_grass texture
      // Mineral ores use same texture on all faces
      case HexBlockType.ORE_COAL: return 'oreCoal';
      case HexBlockType.ORE_COPPER: return 'oreCopper';
      case HexBlockType.ORE_IRON: return 'oreIron';
      case HexBlockType.ORE_GOLD: return 'oreGold';
      case HexBlockType.ORE_LITHIUM: return 'oreLithium';
      case HexBlockType.ORE_ALUMINUM: return 'oreAluminum';
      case HexBlockType.ORE_COBALT: return 'oreCobalt';
      default: return 'side';
    }
  }

  // Get the material key for a block type's bottom face
  private getBlockBottomMaterialKey(blockType: HexBlockType): string {
    switch (blockType) {
      case HexBlockType.STONE: return 'stone';
      case HexBlockType.SAND: return 'sand';
      case HexBlockType.WOOD: return 'wood';
      // Mineral ores use same texture on all faces
      case HexBlockType.ORE_COAL: return 'oreCoal';
      case HexBlockType.ORE_COPPER: return 'oreCopper';
      case HexBlockType.ORE_IRON: return 'oreIron';
      case HexBlockType.ORE_GOLD: return 'oreGold';
      case HexBlockType.ORE_LITHIUM: return 'oreLithium';
      case HexBlockType.ORE_ALUMINUM: return 'oreAluminum';
      case HexBlockType.ORE_COBALT: return 'oreCobalt';
      // Dirt and grass show dirt texture on bottom
      default: return 'side';
    }
  }

  private buildColumnGeometry(
    column: PlanetColumn,
    geometryData: Record<string, GeometryData>
  ): void {
    // Find the surface depth (topmost solid block, searching from top down)
    // Depth system: 0 = bedrock, MAX_DEPTH-1 = sky
    let surfaceDepth = 0;
    for (let d = column.blocks.length - 1; d >= 0; d--) {
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
      // In new system: "above" = higher depth (toward sky), "below" = lower depth (toward bedrock)
      const blockAbove = depth >= column.blocks.length - 1 ? HexBlockType.AIR : column.blocks[depth + 1];
      const blockBelow = depth === 0 ? HexBlockType.AIR : column.blocks[depth - 1];

      const hasTopExposed = blockAbove === HexBlockType.AIR || (!isWater && blockAbove === HexBlockType.WATER);
      const hasBottomExposed = blockBelow === HexBlockType.AIR || (!isWater && blockBelow === HexBlockType.WATER);

      if (isWater && blockAbove !== HexBlockType.AIR) continue;

      const hasSideExposed = this.hasExposedSide(column, depth);

      if (!isWater && !hasTopExposed && !hasBottomExposed && !hasSideExposed) continue;

      // In new system: higher depth = larger radius (closer to surface)
      let outerRadius = this.depthToRadius(depth);
      let innerRadius = outerRadius - this.BLOCK_HEIGHT;

      if (isWater) {
        outerRadius -= PlayerConfig.WATER_SURFACE_OFFSET;
        innerRadius -= PlayerConfig.WATER_SURFACE_OFFSET;
      }

      if (innerRadius <= 0) continue;

      // depthFromSurface: positive = below surface, negative = at/above surface
      const depthFromSurface = surfaceDepth - depth;

      // Calculate sky light based on depth from surface
      const SKY_LIGHT_FALLOFF = 0.8;
      const MIN_SKY_LIGHT = 0.05;
      let skyLightLevel = 1.0;
      if (depthFromSurface > 0) {
        skyLightLevel = Math.max(MIN_SKY_LIGHT, Math.pow(SKY_LIGHT_FALLOFF, depthFromSurface));
      }

      const { top, bottom, sides } = this.meshBuilder.createSeparateGeometries(
        column.tile,
        innerRadius,
        outerRadius,
        new THREE.Vector3(0, 0, 0),
        isWater ? true : hasTopExposed,
        isWater ? false : hasBottomExposed,
        isWater ? false : hasSideExposed
      );

      if (top) {
        const posAttr = top.getAttribute('position');
        const normAttr = top.getAttribute('normal');
        const uvAttr = top.getAttribute('uv');
        const indexAttr = top.getIndex();
        if (posAttr && normAttr && uvAttr && indexAttr) {
          const key = this.getBlockTopMaterialKey(blockType);
          const light = isWater ? 1.0 : skyLightLevel;
          this.mergeGeometry(geometryData[key], posAttr, normAttr, uvAttr, indexAttr, this.sunDirection, light);
        }
        top.dispose();
      }

      if (bottom && !isWater) {
        const posAttr = bottom.getAttribute('position');
        const normAttr = bottom.getAttribute('normal');
        const uvAttr = bottom.getAttribute('uv');
        const indexAttr = bottom.getIndex();
        if (posAttr && normAttr && uvAttr && indexAttr) {
          const bottomSkyLight = Math.max(MIN_SKY_LIGHT, skyLightLevel * SKY_LIGHT_FALLOFF);
          const key = this.getBlockBottomMaterialKey(blockType);
          this.mergeGeometry(geometryData[key], posAttr, normAttr, uvAttr, indexAttr, this.sunDirection, bottomSkyLight);
        }
        bottom.dispose();
      }

      if (sides) {
        const posAttr = sides.getAttribute('position');
        const normAttr = sides.getAttribute('normal');
        const uvAttr = sides.getAttribute('uv');
        const indexAttr = sides.getIndex();
        if (posAttr && normAttr && uvAttr && indexAttr) {
          const key = this.getBlockSideMaterialKey(blockType);
          this.mergeGeometry(geometryData[key], posAttr, normAttr, uvAttr, indexAttr, this.sunDirection, skyLightLevel);
        }
        sides.dispose();
      }

      // Water side faces - generate per-edge only where neighbor is air
      if (isWater) {
        this.buildWaterSideFaces(column, depth, innerRadius, outerRadius, geometryData['water']);
      }
    }
  }

  public updateWaterShader(time: number, isUnderwater: boolean = false): void {
    this.meshBuilder.updateWaterShader(time, this.center, isUnderwater);
    // Also update terrain shader underwater state for fog
    this.meshBuilder.setTerrainUnderwater(isUnderwater);
  }

  public setSunDirection(dir: THREE.Vector3): void {
    this.meshBuilder.setSunDirection(dir);
  }

  // Set torch data for vertex baking (called before geometry rebuild)
  public setTorchData(torches: Array<{ position: THREE.Vector3; range: number; intensity: number }>): void {
    this.torchData = torches.map(t => ({
      position: { x: t.position.x, y: t.position.y, z: t.position.z },
      range: t.range,
      intensity: t.intensity
    }));
  }

  // Mark tiles near a torch position as dirty (for torch light baking)
  // Call this when a torch is placed or removed
  public markTilesNearTorchDirty(torchPosition: THREE.Vector3, range: number): void {
    // Find tiles within the torch light range
    for (const [tileIndex, column] of this.columns) {
      // Check if tile center is within range of torch
      const tileWorldCenter = column.tile.center.clone().add(this.center);
      const distance = tileWorldCenter.distanceTo(torchPosition);

      if (distance < range + 2) { // Add some buffer for block size
        column.isDirty = true;
        this.queueDirtyColumnRebuild(tileIndex);
      }
    }
  }

  public getWaterShaderMaterial(): THREE.ShaderMaterial | null {
    return this.meshBuilder.getWaterShaderMaterial();
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
    sunDirection: THREE.Vector3,
    skyLightLevel: number = 1.0 // 0-1, how much sky light reaches this block
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
      data.skyLight.push(skyLightLevel);

      // Calculate torch light contribution for this vertex
      data.torchLight.push(this.calculateTorchLightAtPosition(px, py, pz));

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

  // Calculate torch light at a world position using stored torch data
  private calculateTorchLightAtPosition(x: number, y: number, z: number): number {
    let totalLight = 0;
    for (const torch of this.torchData) {
      const dx = x - torch.position.x;
      const dy = y - torch.position.y;
      const dz = z - torch.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < torch.range) {
        // Quadratic falloff matching the shader/worker formula
        const attenuation = 1.0 / (1.0 + 2.0 * dist * dist / (torch.range * torch.range));
        totalLight += attenuation * torch.intensity;
      }
    }
    return Math.min(totalLight, 1.5); // Cap at 1.5 like the shader
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
    // Add sky light attribute for depth-based lighting
    if (data.skyLight.length > 0) {
      geometry.setAttribute('skyLight', new THREE.Float32BufferAttribute(data.skyLight, 1));
    }
    // Add torch light attribute from worker (or default to zeros)
    if (data.torchLight && data.torchLight.length > 0) {
      geometry.setAttribute('torchLight', new THREE.Float32BufferAttribute(data.torchLight, 1));
    } else {
      const vertexCount = data.positions.length / 3;
      geometry.setAttribute('torchLight', new THREE.Float32BufferAttribute(new Float32Array(vertexCount).fill(0), 1));
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

  // Build water side faces that extend from water surface down to exposed air
  // This creates walls where water meets air gaps in neighboring columns
  private buildWaterSideFaces(
    column: PlanetColumn,
    waterSurfaceDepth: number,
    _innerRadius: number,
    outerRadius: number,
    waterData: GeometryData
  ): void {
    const tile = column.tile;
    const numSides = tile.vertices.length;
    const edgeThreshold = 0.001; // Tolerance for vertex matching

    // Check each edge
    for (let i = 0; i < numSides; i++) {
      const next = (i + 1) % numSides;
      const edgeV1 = tile.vertices[i];
      const edgeV2 = tile.vertices[next];

      // Find which neighbor shares this edge
      let neighborColumn: PlanetColumn | undefined;
      for (const neighborIndex of tile.neighbors) {
        const candidate = this.columns.get(neighborIndex);
        if (!candidate) continue;

        const neighborTile = candidate.tile;

        // Check if this neighbor has both edge vertices
        let hasV1 = false;
        let hasV2 = false;
        for (const nv of neighborTile.vertices) {
          if (nv.distanceTo(edgeV1) < edgeThreshold) hasV1 = true;
          if (nv.distanceTo(edgeV2) < edgeThreshold) hasV2 = true;
        }

        if (hasV1 && hasV2) {
          neighborColumn = candidate;
          break;
        }
      }

      if (!neighborColumn) continue;

      // Find the depth range where we need water walls
      // Only draw water walls where neighbor has AIR - solid blocks draw their own walls
      // This prevents z-fighting between water walls and terrain walls

      // Check if neighbor has air at water surface level - if not, skip this edge entirely
      // (the terrain side wall will handle the visual boundary)
      if (neighborColumn.blocks[waterSurfaceDepth] !== HexBlockType.AIR) continue;

      // Find where this water column has solid blocks below the water
      // Depth system: 0 = bedrock (bottom), higher = toward sky
      // Solid blocks (ocean floor) are at LOWER depth values than water
      let ownSolidDepth = 0;
      for (let d = waterSurfaceDepth - 1; d >= 0; d--) {
        const ownBlock = column.blocks[d];
        if (ownBlock !== HexBlockType.AIR && ownBlock !== HexBlockType.WATER) {
          // Found our own solid - water wall stops here
          ownSolidDepth = d;
          break;
        }
      }

      // Find the neighbor's first solid block depth (searching downward)
      let neighborSolidDepth = 0;
      for (let d = waterSurfaceDepth - 1; d >= 0; d--) {
        const neighborBlock = neighborColumn.blocks[d];
        if (neighborBlock !== HexBlockType.AIR && neighborBlock !== HexBlockType.WATER) {
          // Found solid block - this is where neighbor's terrain starts
          neighborSolidDepth = d;
          break;
        }
      }

      // Water wall extends to the maximum of own solid depth or neighbor solid depth
      // (higher depth = closer to water surface, so we take max to get the shallowest floor)
      const wallBottomDepth = Math.max(ownSolidDepth, neighborSolidDepth);

      // Calculate wall geometry from water surface down to the limit
      const wallTopRadius = outerRadius; // Water surface (already offset)
      const wallBottomRadius = this.depthToRadius(wallBottomDepth);

      if (wallBottomRadius >= wallTopRadius) continue; // No wall needed

      // Scale vertices for top and bottom of wall
      const dir1 = edgeV1.clone().normalize();
      const dir2 = edgeV2.clone().normalize();

      const topV1 = dir1.clone().multiplyScalar(wallTopRadius);
      const topV2 = dir2.clone().multiplyScalar(wallTopRadius);
      const bottomV1 = dir1.clone().multiplyScalar(wallBottomRadius);
      const bottomV2 = dir2.clone().multiplyScalar(wallBottomRadius);

      // Calculate side normal using cross product of quad edges
      const edge1 = bottomV2.clone().sub(bottomV1);
      const edge2 = topV1.clone().sub(bottomV1);
      const sideNormal = edge1.clone().cross(edge2).normalize();

      const baseIdx = waterData.vertexOffset;

      // Four vertices for this side face (bottom-left, bottom-right, top-right, top-left)
      waterData.positions.push(
        bottomV1.x, bottomV1.y, bottomV1.z,
        bottomV2.x, bottomV2.y, bottomV2.z,
        topV2.x, topV2.y, topV2.z,
        topV1.x, topV1.y, topV1.z
      );

      for (let j = 0; j < 4; j++) {
        waterData.normals.push(sideNormal.x, sideNormal.y, sideNormal.z);
      }

      // UVs for side face
      waterData.uvs.push(0, 0, 1, 0, 1, 1, 0, 1);

      // Sky light (water walls still get surface lighting)
      waterData.skyLight.push(1.0, 1.0, 1.0, 1.0);

      // Vertex colors (full brightness for water)
      waterData.colors.push(1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1);

      // Indices for two triangles making the quad
      waterData.indices.push(
        baseIdx, baseIdx + 1, baseIdx + 2,
        baseIdx, baseIdx + 2, baseIdx + 3
      );

      waterData.vertexOffset += 4;
    }
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

    // Mark neighbors as dirty for side face updates
    for (const neighborIndex of column.tile.neighbors) {
      const neighbor = this.columns.get(neighborIndex);
      if (neighbor) neighbor.isDirty = true;
    }

    // Only rebuild LOD if block is at/near surface (affects planet appearance from distance)
    // Deep underground changes don't affect LOD
    let surfaceDepth = 0;
    for (let d = 0; d < column.blocks.length; d++) {
      if (column.blocks[d] !== HexBlockType.AIR && column.blocks[d] !== HexBlockType.WATER) {
        surfaceDepth = d;
        break;
      }
    }
    if (depth <= surfaceDepth + 2) {
      this.needsLODRebuild = true;
    }

    // Queue dirty columns for incremental mesh update instead of full rebuild
    this.queueDirtyColumnRebuild(tileIndex);
    for (const neighborIndex of column.tile.neighbors) {
      if (this.cachedNearbyTiles.has(neighborIndex)) {
        this.queueDirtyColumnRebuild(neighborIndex);
      }
    }

    if (this.meshBuilder.isSolid(oldBlockType) && blockType === HexBlockType.AIR) {
      this.simulateWaterFlow(tileIndex, depth);
    }
  }

  // Track columns that need geometry rebuild
  private dirtyColumnsQueue: Set<number> = new Set();

  private queueDirtyColumnRebuild(tileIndex: number): void {
    if (!this.cachedNearbyTiles.has(tileIndex)) return;
    this.dirtyColumnsQueue.add(tileIndex);
  }

  // Rebuild only the dirty columns - much faster than full rebatch
  private rebuildDirtyColumns(): void {
    if (!this.batchedMeshGroup || this.dirtyColumnsQueue.size === 0) return;

    // For small number of dirty columns, do incremental rebuild
    // For large changes (e.g., water flow affecting many tiles), fall back to full rebuild
    if (this.dirtyColumnsQueue.size > 20) {
      this.needsRebatch = true;
      this.dirtyColumnsQueue.clear();
      return;
    }

    // Full rebuild but only process tiles that need it
    // We still need to rebuild all meshes because Three.js BufferGeometry
    // doesn't support partial updates efficiently
    // However, we mark clean tiles to skip geometry generation

    // Dispose old meshes
    while (this.batchedMeshGroup.children.length > 0) {
      const child = this.batchedMeshGroup.children[0] as THREE.Mesh;
      if (child.geometry) child.geometry.dispose();
      this.batchedMeshGroup.remove(child);
    }

    // Create geometry data for all block types
    const geometryData: Record<string, GeometryData> = {};
    for (const mat of this.BLOCK_MATERIALS) {
      geometryData[mat.key] = createEmptyGeometryData();
    }

    for (const tileIndex of this.cachedNearbyTiles) {
      const column = this.columns.get(tileIndex);
      if (!column) continue;

      // Skip frustum culling for dirty rebuild - we need consistent geometry
      this.buildColumnGeometry(column, geometryData);
      column.isDirty = false;
    }

    // Create meshes from batched geometry
    for (const mat of this.BLOCK_MATERIALS) {
      const data = geometryData[mat.key];
      if (data.positions.length > 0) {
        const geom = this.createBufferGeometry(data);
        const mesh = new THREE.Mesh(geom, mat.getMaterial());
        if (mat.renderOrder !== undefined) {
          mesh.renderOrder = mat.renderOrder;
        }
        this.batchedMeshGroup.add(mesh);
      }
    }

    // Schedule water boundary walls rebuild (deferred to avoid frame spike)
    const hasWater = this.config.hasWater !== false && !this.config.texturePath;
    if (hasWater) {
      this.needsWaterWallsRebuild = true;
    }

    this.dirtyColumnsQueue.clear();
  }

  // Extract water boundary wall generation to reusable method
  private buildWaterBoundaryWalls(): void {
    if (!this.batchedMeshGroup) return;

    const waterBoundaryData = createEmptyGeometryData();
    const seaLevelDepth = this.getSeaLevelDepth();
    const waterSurfaceRadius = this.depthToRadius(seaLevelDepth) - PlayerConfig.WATER_SURFACE_OFFSET;

    for (const tileIndex of this.cachedNearbyTiles) {
      const column = this.columns.get(tileIndex);
      if (!column) continue;

      const tile = column.tile;

      for (let i = 0; i < tile.vertices.length; i++) {
        const next = (i + 1) % tile.vertices.length;
        const v1 = tile.vertices[i];
        const v2 = tile.vertices[next];

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

        if (closestNeighborIdx === undefined) continue;
        if (this.cachedNearbyTiles.has(closestNeighborIdx)) continue;

        // Check if this tile has water (find topmost non-air block from sky down)
        let hasWater = false;
        let oceanFloorDepth = 0;
        for (let d = column.blocks.length - 1; d >= 0; d--) {
          const block = column.blocks[d];
          if (block === HexBlockType.WATER) {
            hasWater = true;
          } else if (block !== HexBlockType.AIR) {
            oceanFloorDepth = d;
            break;
          }
        }

        // Skip if tile has no water
        if (!hasWater) continue;

        // Skip if ocean floor is at or above sea level (shouldn't happen for water tiles)
        if (oceanFloorDepth >= seaLevelDepth) continue;

        const oceanFloorRadius = this.depthToRadius(oceanFloorDepth);
        const bottomRadius = oceanFloorRadius;
        const topRadius = waterSurfaceRadius;

        if (bottomRadius >= topRadius) continue;

        const innerV1 = v1.clone().normalize().multiplyScalar(bottomRadius);
        const innerV2 = v2.clone().normalize().multiplyScalar(bottomRadius);
        const outerV2 = v2.clone().normalize().multiplyScalar(topRadius);
        const outerV1 = v1.clone().normalize().multiplyScalar(topRadius);

        const edge1 = innerV2.clone().sub(innerV1);
        const edge2 = outerV1.clone().sub(innerV1);
        const sideNormal = edge1.clone().cross(edge2).normalize();

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

        waterBoundaryData.uvs.push(0, 0, 1, 0, 1, 1, 0, 1);

        waterBoundaryData.indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
        waterBoundaryData.indices.push(baseIdx, baseIdx + 2, baseIdx + 3);

        waterBoundaryData.vertexOffset += 4;
      }
    }

    if (waterBoundaryData.positions.length > 0) {
      const geom = this.createBufferGeometry(waterBoundaryData);
      const seaWallMaterial = this.meshBuilder.getSeaWallMaterial();
      if (seaWallMaterial) {
        const boundaryMesh = new THREE.Mesh(geom, seaWallMaterial);
        boundaryMesh.renderOrder = 2;
        this.batchedMeshGroup.add(boundaryMesh);
      }
    }
  }

  private simulateWaterFlow(tileIndex: number, depth: number): void {
    const column = this.columns.get(tileIndex);
    if (!column) return;

    let hasAdjacentWater = false;

    // In new depth system: "below" is depth-1 (toward bedrock), "above" is depth+1 (toward sky)
    // Check if there's water above (water falls down)
    if (depth < column.blocks.length - 1 && column.blocks[depth + 1] === HexBlockType.WATER) {
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

    // Limit basin size to prevent freeze when digging into large bodies of water (like ocean)
    const MAX_BASIN_CELLS = 500;

    while (queue.length > 0) {
      const { tileIndex, depth } = queue.shift()!;
      const key = `${tileIndex}-${depth}`;

      if (visited.has(key)) continue;
      visited.add(key);

      // Stop if basin is too large - likely connected to ocean
      if (visited.size > MAX_BASIN_CELLS) {
        return; // Abort water rebalancing for large bodies of water
      }

      const column = this.columns.get(tileIndex);
      if (!column || depth < 0 || depth >= column.blocks.length) continue;

      const blockType = column.blocks[depth];
      if (blockType !== HexBlockType.AIR && blockType !== HexBlockType.WATER) continue;

      basinCells.push({ tileIndex, depth, isWater: blockType === HexBlockType.WATER });

      // In new depth system: "below" is depth-1 (toward bedrock), "above" is depth+1 (toward sky)
      if (depth > 0) {
        const belowType = column.blocks[depth - 1];
        if (belowType === HexBlockType.AIR || belowType === HexBlockType.WATER) {
          queue.push({ tileIndex, depth: depth - 1 });
        }
      }
      if (depth < column.blocks.length - 1) {
        const aboveType = column.blocks[depth + 1];
        if (aboveType === HexBlockType.AIR || aboveType === HexBlockType.WATER) {
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

    // Sort by depth ascending - water settles at lowest depths (toward bedrock)
    basinCells.sort((a, b) => a.depth - b.depth);

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
      // Only place water in AIR blocks - never overwrite solid blocks (prevents z-fighting)
      if (column && column.blocks[cell.depth] === HexBlockType.AIR) {
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
    // Depth system: 0 = bedrock (innermost), MAX_DEPTH-1 = sky (outermost)
    // Block at depth d spans from depthToRadius(d) - BLOCK_HEIGHT (bottom) to depthToRadius(d) (top)
    // A point belongs to the block whose volume contains it
    const distance = point.distanceTo(this.center);
    // Use ceil to ensure points at or just below a block's top surface belong to that block
    const depth = Math.ceil(this.MAX_DEPTH - 1 - (this.radius - distance) / this.BLOCK_HEIGHT);
    return Math.max(0, Math.min(this.MAX_DEPTH, depth));
  }

  public getSurfacePosition(tile: HexTile): THREE.Vector3 {
    const column = this.columns.get(tile.index);
    if (!column) return tile.center.clone().add(this.center);

    // Search from top (highest depth) down to find first solid block
    for (let depth = column.blocks.length - 1; depth >= 0; depth--) {
      if (column.blocks[depth] !== HexBlockType.AIR && column.blocks[depth] !== HexBlockType.WATER) {
        const surfaceRadius = this.depthToRadius(depth);
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

    // Search from top (highest depth) down to find first solid block
    for (let depth = column.blocks.length - 1; depth >= 0; depth--) {
      const block = column.blocks[depth];
      if (block !== HexBlockType.AIR && block !== HexBlockType.WATER) {
        return this.depthToRadius(depth);
      }
    }
    return this.radius;
  }

  public isUnderwaterInDirection(direction: THREE.Vector3): boolean {
    const tile = this.polyhedron.getTileAtPoint(direction.clone().multiplyScalar(this.radius));
    if (!tile) return false;

    const column = this.columns.get(tile.index);
    if (!column) return false;

    // Search from top (sky) down to find the surface
    // Depth system: 0 = bedrock (bottom), MAX_DEPTH-1 = sky (top)
    for (let depth = column.blocks.length - 1; depth >= 0; depth--) {
      const block = column.blocks[depth];
      if (block === HexBlockType.WATER) return true;
      if (block !== HexBlockType.AIR) return false; // Hit solid ground, not underwater
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

  // Get max depth (total number of block layers)
  public getMaxDepth(): number {
    return this.MAX_DEPTH;
  }

  // Get tile index for a direction from planet center (for tree placement)
  public getTileIndexInDirection(direction: THREE.Vector3): number | null {
    const tile = this.polyhedron.getTileAtPoint(direction.clone().multiplyScalar(this.radius));
    return tile ? tile.index : null;
  }

  // Get tile center world position for a direction from planet center (for tree centering)
  public getTileCenterInDirection(direction: THREE.Vector3): THREE.Vector3 | null {
    const tile = this.polyhedron.getTileAtPoint(direction.clone().multiplyScalar(this.radius));
    if (!tile) return null;
    // Return the tile center in world space (add planet center offset)
    return tile.center.clone().add(this.center);
  }

  // Get the set of currently visible (nearby/detailed) tile indices
  public getVisibleTileIndices(): Set<number> {
    return this.cachedNearbyTiles;
  }

  // Get visible tiles plus their immediate neighbors (for tree visibility on LOD border)
  public getVisibleTileIndicesWithBorder(): Set<number> {
    const result = new Set(this.cachedNearbyTiles);

    // Add neighbors of all visible tiles
    for (const tileIndex of this.cachedNearbyTiles) {
      const tile = this.polyhedron.tiles[tileIndex];
      if (tile) {
        for (const neighborIndex of tile.neighbors) {
          result.add(neighborIndex);
        }
      }
    }

    return result;
  }

  public isInWater(position: THREE.Vector3): boolean {
    const tile = this.getTileAtPoint(position);
    if (!tile) return false;

    const column = this.columns.get(tile.index);
    if (!column) return false;

    // Find water surface (topmost water block, searching from top down)
    let waterSurfaceDepth = -1;
    for (let d = column.blocks.length - 1; d >= 0; d--) {
      if (column.blocks[d] === HexBlockType.WATER) {
        waterSurfaceDepth = d;
        break;
      }
    }

    if (waterSurfaceDepth < 0) return false;

    const playerDepth = this.getDepthAtPoint(position);
    // Player is in water if their depth is AT or BELOW water surface
    // With depth 0 = bedrock, lower depth = deeper underwater
    return playerDepth <= waterSurfaceDepth;
  }

  public getWaterDepth(position: THREE.Vector3): number {
    const tile = this.getTileAtPoint(position);
    if (!tile) return 0;

    const column = this.columns.get(tile.index);
    if (!column) return 0;

    const currentDepth = this.getDepthAtPoint(position);

    // Find water surface (topmost water block, searching from top down)
    let waterSurfaceDepth = -1;
    for (let d = column.blocks.length - 1; d >= 0; d--) {
      if (column.blocks[d] === HexBlockType.WATER) {
        waterSurfaceDepth = d;
        break;
      }
    }

    if (waterSurfaceDepth < 0) return 0;

    // Depth below water surface (lower depth = deeper underwater)
    // Count as underwater if AT or BELOW surface
    if (currentDepth <= waterSurfaceDepth) {
      return (waterSurfaceDepth - currentDepth) * this.BLOCK_HEIGHT;
    }

    return 0;
  }

  // Returns the radius of the water surface at a given position, or -1 if no water
  public getWaterSurfaceRadius(position: THREE.Vector3): number {
    const tile = this.getTileAtPoint(position);
    if (!tile) return -1;

    const column = this.columns.get(tile.index);
    if (!column) return -1;

    // Find water surface (topmost water block, searching from top down)
    let waterSurfaceDepth = -1;
    for (let d = column.blocks.length - 1; d >= 0; d--) {
      if (column.blocks[d] === HexBlockType.WATER) {
        waterSurfaceDepth = d;
        break;
      }
    }

    if (waterSurfaceDepth < 0) return -1;

    // Water surface radius using new depth system
    return this.depthToRadius(waterSurfaceDepth);
  }

  public buildAllMeshes(): void {
    this.needsRebatch = true;
  }

  // Raycast against planet geometry to find block at ray intersection
  // Returns { tileIndex, depth, blockType, point, normal, prevTileIndex, prevDepth } or null if no hit
  // prevTileIndex/prevDepth indicate the air block we came from (for placement)
  // By default ignores water blocks (set includeWater=true to detect water, e.g. for bucket tool)
  public raycast(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number, includeWater: boolean = false): {
    tileIndex: number;
    depth: number;
    blockType: HexBlockType;
    point: THREE.Vector3;
    normal: THREE.Vector3;
    prevTileIndex: number;  // Tile index of the air block before the hit
    prevDepth: number;      // Depth of the air block before the hit
  } | null {
    // Step along the ray and check for solid blocks
    const stepSize = 0.2; // Small steps for accuracy
    const rayDir = direction.clone().normalize();
    const testPoint = origin.clone();

    // Get starting tile once (expensive full search)
    const startTile = this.getTileAtPoint(origin);
    if (!startTile) return null;

    // Use hint-based fast lookup for subsequent steps
    let currentTile = startTile;
    let prevTile = startTile;
    let prevDepth = this.getDepthAtPoint(origin);

    for (let dist = 0; dist < maxDistance; dist += stepSize) {
      testPoint.copy(origin).addScaledVector(rayDir, dist);

      // Use fast BFS lookup from previous tile (much faster than full search)
      const newTile = this.polyhedron.getTileAtPointFromHint(testPoint.clone().sub(this.center), currentTile);

      const depth = this.getDepthAtPoint(testPoint);
      if (depth < 0 || depth >= this.MAX_DEPTH) {
        // Track previous valid position
        prevTile = currentTile;
        prevDepth = depth;
        currentTile = newTile;
        continue;
      }

      const blockType = this.getBlock(newTile.index, depth);
      // Skip air blocks, and skip water unless includeWater is true
      if (blockType === HexBlockType.AIR) {
        // Track this as the previous air position
        prevTile = newTile;
        prevDepth = depth;
        currentTile = newTile;
        continue;
      }
      if (blockType === HexBlockType.WATER && !includeWater) {
        prevTile = newTile;
        prevDepth = depth;
        currentTile = newTile;
        continue;
      }

      // Calculate surface normal (direction from planet center through hit point)
      const normal = testPoint.clone().sub(this.center).normalize();

      return {
        tileIndex: newTile.index,
        depth,
        blockType,
        point: testPoint.clone(),
        normal,
        prevTileIndex: prevTile.index,
        prevDepth: prevDepth
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

  // Check if planet is being viewed from orbit (distant LOD mode)
  // Trees should be hidden when in orbit view
  public isInOrbitView(): boolean {
    return this.currentDistantLODLevel >= 0;
  }
}
