import * as THREE from 'three';
import { GoldbergPolyhedron, HexTile } from './GoldbergPolyhedron';
import { HexBlockType, HexBlockMeshBuilder } from './HexBlock';
import { PlayerConfig } from '../config/PlayerConfig';
import { TilesetConfig, LodColorsConfig, DEFAULT_LOD_COLORS } from '../config/SolarSystemConfig';
import { profiler } from '../engine/Profiler';
import planetVert from '../shaders/planet/planet.vert?raw';
import planetFrag from '../shaders/planet/planet.frag?raw';

export interface PlanetConfig {
  name?: string;  // Planet name for debug logging
  texturePath?: string;  // Single texture for all surfaces (like moon)
  heightVariation?: number;  // 0-1, how much terrain varies (default 1.0)
  hasWater?: boolean;  // Whether to generate water at sea level (default true for Earth)
  seaLevel?: number;   // Depth at which water appears (default 1, meaning radius - 1)
  tileset?: TilesetConfig;  // Tileset configuration for block textures
  waterColor?: string;      // Water color override (hex string)
  waterDeepColor?: string;  // Deep water color override (hex string)
  lodColors?: Partial<LodColorsConfig>;  // Colors for LOD tiles when viewed from space
  intermediateLODAltitude?: number;  // Altitude where INTERMEDIATE LOD activates
  highLODAltitude?: number;  // Altitude where HIGH (chunked) LOD activates
  distantLODAltitude?: number;  // Altitude where DISTANT LOD activates
  detailRenderDistance?: number;  // Override for detail terrain render distance (tiles from player)
  isSpawnPlanet?: boolean;  // If true, generate detailed terrain immediately. If false, only LOD until approached.
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
  private lodChunkDirections: THREE.Vector3[] = []; // Cached normalized chunk center directions (icosahedron vertices)
  private tileToChunk: Map<number, number> = new Map(); // Maps tile index to chunk index
  private chunkToTiles: Map<number, number[]> = new Map(); // Reverse mapping: chunk index to all its tile indices
  private lodMesh: THREE.Group | null = null; // Parent group for all LOD chunks
  private lodWaterMesh: THREE.Mesh | null = null; // Separate LOD water mesh for visibility control
  private lodTileVisibility: Map<number, boolean> = new Map(); // Track which LOD tiles should be visible
  private tilesWithDetailedGeometry: Set<number> = new Set(); // Track tiles that have detailed terrain (LOD should be hidden for these)
  private chunkDetailedTileCount: Map<number, number> = new Map(); // Count of detailed tiles per chunk (for chunk-level hiding)
  private chunkTotalTileCount: Map<number, number> = new Map(); // Total tiles per chunk (for determining full coverage)
  // LOD chunk count from config (12 icosahedron vertices + 20 face centers)
  // Smaller chunks = better alignment with circular detail render distance
  private readonly LOD_CHUNK_COUNT = PlayerConfig.LOD_CHUNK_COUNT;

  // Distance-based LOD meshes (for viewing from other planets)
  private distantLODMeshes: THREE.Mesh[] = []; // Array of progressively lower-detail meshes
  private distantLODMaterials: THREE.ShaderMaterial[] = []; // Materials for uniform updates
  private currentDistantLODLevel: number = -1; // -1 = use detailed/near LOD, 0-2 = distant LOD levels

  // Boundary walls group (fills gap between detailed terrain and LOD at render distance edge)
  private boundaryWallsGroup: THREE.Group | null = null;

  // Cache for tile range lookups (avoid BFS every frame)
  private cachedRenderDistance: number = -1;
  private cachedNearbyTiles: Set<number> = new Set();

  // Cached camera position for horizon culling (updated each frame)
  private cachedCameraPosition: THREE.Vector3 = new THREE.Vector3();

  // Buffer zone - track center tile for stability zone
  private bufferCenterTiles: Set<number> = new Set(); // Tiles within buffer zone of center

  // Incremental rebuild queue
  private pendingTilesToAdd: number[] = [];
  private pendingTilesToRemove: number[] = [];
  private isIncrementalRebuildActive: boolean = false;

  // Batched meshes for visible terrain (one mesh per material type = ~5 draw calls total)
  private batchedMeshGroup: THREE.Group | null = null;
  private needsRebatch: boolean = true; // Flag to rebuild batched geometry
  private currentWaterMesh: THREE.Mesh | null = null; // Track current water mesh for unregistration
  private waterMeshCallback: ((mesh: THREE.Mesh, isAdd: boolean) => void) | null = null; // Callback for water mesh registration

  // Dirty chunk tracking for debounced rebuilds
  private dirtyChunks: Set<number> = new Set(); // Chunks that need rebuild

  // Per-chunk detail meshes - allows rebuilding only affected chunks when blocks change
  // Each chunk has a group containing meshes for each material type
  private chunkDetailMeshes: Map<number, THREE.Group> = new Map();
  private chunkDetailWaterMeshes: Map<number, THREE.Mesh> = new Map(); // Track water per chunk
  private isChunkWorkerBuildActive: boolean = false; // Track if chunk-specific build is running
  private pendingChunkWorkerTiles: Set<number> = new Set(); // Tiles being built in current chunk build
  private chunksBeingRebuilt: number[] = []; // Which chunks are currently being rebuilt
  private hasTransitionedToChunkMeshes: boolean = false; // Track if we've switched from flat to per-chunk meshes
  // Chunks that were rebuilt via immediate (synchronous) edit - these should NOT be overwritten by stale worker results
  private freshlyEditedChunks: Set<number> = new Set();

  // Progressive buffer upload system - spreads GPU buffer uploads across frames to reduce lag spikes
  private pendingMeshUploads: Array<{ mesh: THREE.Mesh; isWater: boolean; chunkIndex?: number }> = [];
  private pendingMeshDisposals: THREE.Mesh[] = [];
  private readonly MESHES_PER_FRAME = 4; // Max meshes to upload per frame

  // Time-sliced LOD mesh creation - spreads mesh creation across frames for large planets
  // Chunk data indexed by chunk index
  private pendingLODChunkData: Array<{
    grassPositions: number[]; grassNormals: number[]; grassUvs: number[]; grassSkyLight: number[]; grassTorchLight: number[]; grassIndices: number[];
    dirtPositions: number[]; dirtNormals: number[]; dirtUvs: number[]; dirtSkyLight: number[]; dirtTorchLight: number[]; dirtIndices: number[];
    stonePositions: number[]; stoneNormals: number[]; stoneUvs: number[]; stoneSkyLight: number[]; stoneTorchLight: number[]; stoneIndices: number[];
    sandPositions: number[]; sandNormals: number[]; sandUvs: number[]; sandSkyLight: number[]; sandTorchLight: number[]; sandIndices: number[];
    woodPositions: number[]; woodNormals: number[]; woodUvs: number[]; woodSkyLight: number[]; woodTorchLight: number[]; woodIndices: number[];
    waterPositions: number[]; waterNormals: number[]; waterUvs: number[]; waterIndices: number[];
    sidePositions: number[]; sideNormals: number[]; sideUvs: number[]; sideSkyLight: number[]; sideTorchLight: number[]; sideIndices: number[];
    waterSidePositions: number[]; waterSideNormals: number[]; waterSideUvs: number[]; waterSideIndices: number[];
    snowPositions: number[]; snowNormals: number[]; snowUvs: number[]; snowSkyLight: number[]; snowTorchLight: number[]; snowIndices: number[];
    icePositions: number[]; iceNormals: number[]; iceUvs: number[]; iceSkyLight: number[]; iceTorchLight: number[]; iceIndices: number[];
    moonRockPositions: number[]; moonRockNormals: number[]; moonRockUvs: number[]; moonRockSkyLight: number[]; moonRockTorchLight: number[]; moonRockIndices: number[];
    moonRockSidePositions: number[]; moonRockSideNormals: number[]; moonRockSideUvs: number[]; moonRockSideSkyLight: number[]; moonRockSideTorchLight: number[]; moonRockSideIndices: number[];
  }> | null = null;
  // Queue of chunk indices to process, sorted by distance to player (nearest first)
  private pendingLODChunkQueue: number[] = [];
  private readonly LOD_CHUNKS_PER_FRAME = 2; // Process 2 chunks per frame (~30ms budget)

  // Web Worker for off-thread geometry building
  private geometryWorker: Worker | null = null;
  private lodGeometryWorker: Worker | null = null;
  private isWorkerBuildActive: boolean = false;
  private isLODWorkerBuildActive: boolean = false;
  private isWaterWallsScheduled: boolean = false;
  private needsWaterWallsRebuild: boolean = false;
  // Track which tiles were sent to the current worker build
  // Used to update tilesWithDetailedGeometry only AFTER geometry is ready (prevents LOD gaps)
  private pendingWorkerTiles: Set<number> = new Set();
  // NOTE: LOD exclusion tracking removed - LOD is now built for ALL tiles (no holes ever)

  // Initial terrain build tracking
  private initialTerrainBuilt: boolean = false;
  private initialLODBuilt: boolean = false;
  private initialBuildResolve: (() => void) | null = null;

  // Detailed terrain state - non-spawn planets start with only LOD
  private detailedTerrainEnabled: boolean = false;
  private detailedTerrainInitializing: boolean = false;

  // Progressive terrain generation - generate tiles on-demand as player approaches
  private tilesWithTerrain: Set<number> = new Set(); // Tiles that have generated terrain data
  private pendingTerrainTiles: number[] = []; // Queue of tiles waiting for terrain generation
  private isTerrainWorkerBusy: boolean = false;
  private terrainBatchSize: number = 500; // Generate this many tiles per worker batch

  // LOD transition tracking - detects when player crosses lodSwitchAltitude
  private wasAboveLODThreshold: boolean = true;
  private onLODTransitionCallback: ((enteringDetailedTerrain: boolean) => void) | null = null;
  private lastLODLevel: number | undefined = undefined;  // For debug logging only

  // Intermediate LOD system - simplified terrain between chunked LOD and detailed terrain
  private intermediateLODMesh: THREE.Group | null = null;
  private isIntermediateLODBuilt: boolean = false;
  private isIntermediateLODWorkerActive: boolean = false;

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
  // Tiles with torches (for LOD vertex lighting - 1 torch per tile, single tile range)
  private tilesWithTorches: Set<number> = new Set();

  constructor(scene: THREE.Scene, radius: number = 50, subdivisions: number = 3, config: PlanetConfig = {}) {
    this.scene = scene;
    this.radius = radius;
    this.center = new THREE.Vector3(0, 0, 0);
    this.config = config;

    // Debug: log LOD config values
    console.log(`[Planet ${config.name}] Config LOD values: intermediate=${config.intermediateLODAltitude}, high=${config.highLODAltitude}, distant=${config.distantLODAltitude}`);

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

  // Get altitude where HIGH (chunked) LOD activates
  public getHighLODAltitude(): number {
    if (this.config.highLODAltitude !== undefined) {
      return this.config.highLODAltitude;
    }
    // Default: 50% of planet radius (e.g., Earth radius 100 -> altitude 50)
    return this.radius * 0.5;
  }

  // Get altitude where INTERMEDIATE LOD activates
  public getIntermediateLODAltitude(): number {
    if (this.config.intermediateLODAltitude !== undefined) {
      return this.config.intermediateLODAltitude;
    }
    // Default: 25% of planet radius (e.g., Earth radius 100 -> altitude 25)
    return this.radius * 0.25;
  }

  // Get altitude where DISTANT LOD activates
  public getDistantLODAltitude(): number {
    if (this.config.distantLODAltitude !== undefined) {
      return this.config.distantLODAltitude;
    }
    // Default: 2x the planet radius (so for Earth radius 100, distant LOD at altitude 200)
    return this.radius * 2;
  }

  // Terrain generation worker
  private terrainWorker: Worker | null = null;

  public async initialize(): Promise<void> {
    const waterColors = this.config.waterColor || this.config.waterDeepColor ? {
      color: this.config.waterColor,
      deepColor: this.config.waterDeepColor,
    } : undefined;
    await this.meshBuilder.loadTextures(this.config.texturePath, this.config.tileset, waterColors);
    // Set planet center for terrain shader lighting calculations
    this.meshBuilder.setPlanetCenter(this.center);
    // Set water level for terrain shader underwater dimming
    const waterSurfaceRadius = this.depthToRadius(this.getSeaLevelDepth()) - PlayerConfig.WATER_SURFACE_OFFSET;
    this.meshBuilder.setWaterLevel(waterSurfaceRadius);

    // For spawn planets, generate detailed terrain immediately
    // For non-spawn planets, only generate distant LOD - full terrain is generated when approaching
    const isSpawnPlanet = this.config.isSpawnPlanet ?? true; // Default to spawn planet for backwards compatibility

    if (isSpawnPlanet) {
      // Full initialization with detailed terrain
      await this.generateTerrainAsync();
      this.detailedTerrainEnabled = true;
      this.initializeLODChunks();
      this.createLODMesh();
    } else {
      // LOD-only initialization - skip terrain generation entirely
      // Distant LOD meshes use noise function directly (no terrain data needed)
      // Full terrain will be generated on-demand when player approaches
      this.detailedTerrainEnabled = false;
      this.initializeLODChunks();
      // Create fallback HIGH LOD mesh using noise (no terrain data yet)
      // This ensures smooth transition when descending from distant LOD
      this.createLODMesh();
      // Mark as "ready" for distant viewing (no detailed terrain yet)
      this.initialTerrainBuilt = true;
      this.initialLODBuilt = true;
      console.log(`[Planet] ${this.config.name || 'Unknown'}: LOD-only mode (terrain on approach)`);
    }

    this.createDistantLODMeshes();
    this.createBatchedMeshGroup();
    this.initializeGeometryWorker();

    console.log(`Planet created with ${this.polyhedron.getTileCount()} tiles`);
  }

  // Enable detailed terrain generation when player approaches a non-spawn planet
  // This is called from the update loop when player gets close enough
  public async enableDetailedTerrain(targetPosition?: THREE.Vector3): Promise<void> {
    if (this.detailedTerrainEnabled || this.detailedTerrainInitializing) {
      return; // Already enabled or in progress
    }

    this.detailedTerrainInitializing = true;
    console.log(`[Planet] ${this.config.name || 'Unknown'}: Generating terrain...`);

    // For spawn planets or if no target, generate all terrain at once
    if (this.config.isSpawnPlanet || !targetPosition) {
      await this.generateTerrainAsync();
      this.createLODMesh();
      this.detailedTerrainEnabled = true;
      this.detailedTerrainInitializing = false;
      console.log(`[Planet] ${this.config.name || 'Unknown'}: Terrain ready`);
      return;
    }

    // For non-spawn planets, use progressive generation
    // First generate nearby tiles only, then queue the rest
    const nearbyTileIndices = this.getTilesNearPosition(targetPosition, PlayerConfig.TERRAIN_MAX_RENDER_DISTANCE * 2);
    console.log(`[Planet] ${this.config.name || 'Unknown'}: Generating ${nearbyTileIndices.length} nearby tiles first...`);

    // Generate nearby tiles synchronously (should be fast - ~2000 tiles)
    await this.generateTerrainForTiles(nearbyTileIndices);

    // Queue remaining tiles for background generation
    const remainingTiles: number[] = [];
    for (const tile of this.polyhedron.tiles) {
      if (!this.tilesWithTerrain.has(tile.index)) {
        remainingTiles.push(tile.index);
      }
    }
    this.pendingTerrainTiles = remainingTiles;
    console.log(`[Planet] ${this.config.name || 'Unknown'}: Queued ${remainingTiles.length} tiles for background generation`);

    // Build LOD mesh with available terrain data
    this.createLODMesh();

    this.detailedTerrainEnabled = true;
    this.detailedTerrainInitializing = false;
    console.log(`[Planet] ${this.config.name || 'Unknown'}: Initial terrain ready, background generation continues`);
  }

  // Get tile indices near a world position
  private getTilesNearPosition(position: THREE.Vector3, renderDistance: number): number[] {
    const targetTile = this.getTileAtPointFast(position);
    if (!targetTile) {
      // Fallback: use direction to find nearest tile
      const dir = position.clone().sub(this.center).normalize();
      let bestTile = this.polyhedron.tiles[0];
      let bestDot = -1;
      for (const tile of this.polyhedron.tiles) {
        const tileDir = tile.center.clone().normalize();
        const dot = dir.dot(tileDir);
        if (dot > bestDot) {
          bestDot = dot;
          bestTile = tile;
        }
      }
      return this.getTileIndicesInRange(bestTile.index, renderDistance);
    }
    return this.getTileIndicesInRange(targetTile.index, renderDistance);
  }

  // Get all tile indices within render distance (BFS)
  private getTileIndicesInRange(centerTileIndex: number, renderDistance: number): number[] {
    const result: number[] = [];
    const visited = new Set<number>();
    const queue: { index: number; depth: number }[] = [{ index: centerTileIndex, depth: 0 }];

    while (queue.length > 0) {
      const { index, depth } = queue.shift()!;
      if (visited.has(index)) continue;
      visited.add(index);
      result.push(index);

      if (depth < renderDistance) {
        const tile = this.polyhedron.tiles[index];
        for (const neighborIndex of tile.neighbors) {
          if (!visited.has(neighborIndex)) {
            queue.push({ index: neighborIndex, depth: depth + 1 });
          }
        }
      }
    }
    return result;
  }

  // Check if detailed terrain is enabled for this planet
  public isDetailedTerrainEnabled(): boolean {
    return this.detailedTerrainEnabled;
  }

  // Set callback for LOD transition events (when player crosses lodSwitchAltitude)
  public setLODTransitionCallback(callback: ((enteringDetailedTerrain: boolean) => void) | null): void {
    this.onLODTransitionCallback = callback;
  }

  // Debug: toggle detailed terrain visibility (F4)
  private debugDetailedHidden: boolean = false;
  public toggleDetailedTerrainVisibility(): void {
    this.debugDetailedHidden = !this.debugDetailedHidden;
    if (this.batchedMeshGroup) {
      this.batchedMeshGroup.visible = !this.debugDetailedHidden;
    }
    console.log(`[Planet] ${this.config.name || 'Unknown'}: Detailed terrain ${this.debugDetailedHidden ? 'HIDDEN' : 'VISIBLE'}`);
  }

  // Debug: check if detailed terrain is hidden
  public isDetailedTerrainHidden(): boolean {
    return this.debugDetailedHidden;
  }

  // Generate terrain using a web worker to avoid blocking the main thread
  private async generateTerrainAsync(): Promise<void> {
    return new Promise((resolve) => {
      // Create terrain worker
      this.terrainWorker = new Worker(
        new URL('../workers/terrainGenerationWorker.ts', import.meta.url),
        { type: 'module' }
      );

      // Prepare tile data for worker
      const tiles = this.polyhedron.tiles.map(tile => ({
        index: tile.index,
        center: { x: tile.center.x, y: tile.center.y, z: tile.center.z },
        neighbors: tile.neighbors
      }));

      // Prepare config for worker
      const config = {
        seed: this.seed,
        maxDepth: this.MAX_DEPTH,
        seaLevel: this.SEA_LEVEL,
        maxHeight: this.MAX_HEIGHT,
        hasWater: this.config.hasWater !== false && !this.config.texturePath,
        isSingleTexturePlanet: !!this.config.texturePath,
        heightVariation: this.config.heightVariation ?? 1.0,
        polarThreshold: PlayerConfig.POLAR_THRESHOLD,
        // Terrain generation parameters
        continentScale: PlayerConfig.TERRAIN_CONTINENT_SCALE,
        mountainScale: PlayerConfig.TERRAIN_MOUNTAIN_SCALE,
        hillScale: PlayerConfig.TERRAIN_HILL_SCALE,
        detailScale: PlayerConfig.TERRAIN_DETAIL_SCALE,
        continentWeight: PlayerConfig.TERRAIN_CONTINENT_WEIGHT,
        mountainHeight: PlayerConfig.TERRAIN_MOUNTAIN_HEIGHT,
        hillWeight: PlayerConfig.TERRAIN_HILL_WEIGHT,
        detailWeight: PlayerConfig.TERRAIN_DETAIL_WEIGHT,
        oceanDepthPower: PlayerConfig.TERRAIN_OCEAN_DEPTH_POWER,
        terrainMaxDepth: PlayerConfig.TERRAIN_MAX_DEPTH,
        // Ore configs
        oreConfigs: this.ORE_CONFIGS.map(ore => ({
          type: ore.type as number,
          minDepth: ore.minDepth,
          maxDepth: ore.maxDepth,
          veinChance: ore.veinChance,
          veinSize: ore.veinSize,
          spreadFactor: ore.spreadFactor
        }))
      };

      // Build tile lookup map once (O(n) instead of O(n²) find loops)
      const tileMap = new Map<number, typeof this.polyhedron.tiles[0]>();
      for (const tile of this.polyhedron.tiles) {
        tileMap.set(tile.index, tile);
      }

      // Handle worker response
      this.terrainWorker.onmessage = (e) => {
        const { type, columns } = e.data;

        if (type === 'terrainResult') {
          // Convert array back to columns with full PlanetColumn data
          const columnsArray = columns as Array<[number, number[]]>;

          // Pre-compute shared bounding sphere radius
          const boundingRadius = this.BLOCK_HEIGHT * this.MAX_DEPTH;

          for (const [tileIndex, blocks] of columnsArray) {
            const tile = tileMap.get(tileIndex);
            if (!tile) continue;

            const boundingSphere = new THREE.Sphere(
              tile.center.clone().add(this.center),
              boundingRadius
            );

            const column: PlanetColumn = {
              tile,
              blocks: blocks as HexBlockType[],
              isDirty: true,
              boundingSphere
            };

            this.columns.set(tileIndex, column);
          }

          // Terminate worker
          this.terrainWorker?.terminate();
          this.terrainWorker = null;

          console.log(`[Planet] Terrain generated for ${this.columns.size} tiles`);
          resolve();
        }
      };

      this.terrainWorker.onerror = (error) => {
        console.error('[Planet] Terrain worker error:', error);
        // Fall back to synchronous generation
        this.terrainWorker?.terminate();
        this.terrainWorker = null;
        this.generateTerrain();
        resolve();
      };

      // Start worker
      this.terrainWorker.postMessage({
        type: 'generateTerrain',
        tiles,
        config
      });
    });
  }

  // Generate terrain for specific tiles only (for progressive loading)
  private async generateTerrainForTiles(tileIndices: number[]): Promise<void> {
    if (tileIndices.length === 0) return;

    return new Promise((resolve) => {
      // Create terrain worker
      const worker = new Worker(
        new URL('../workers/terrainGenerationWorker.ts', import.meta.url),
        { type: 'module' }
      );

      // Prepare tile data for only the requested tiles
      const tileIndexSet = new Set(tileIndices);
      const tiles = this.polyhedron.tiles
        .filter(tile => tileIndexSet.has(tile.index))
        .map(tile => ({
          index: tile.index,
          center: { x: tile.center.x, y: tile.center.y, z: tile.center.z },
          neighbors: tile.neighbors
        }));

      // Prepare config for worker
      const config = {
        seed: this.seed,
        maxDepth: this.MAX_DEPTH,
        seaLevel: this.SEA_LEVEL,
        maxHeight: this.MAX_HEIGHT,
        hasWater: this.config.hasWater !== false && !this.config.texturePath,
        isSingleTexturePlanet: !!this.config.texturePath,
        heightVariation: this.config.heightVariation ?? 1.0,
        polarThreshold: PlayerConfig.POLAR_THRESHOLD,
        continentScale: PlayerConfig.TERRAIN_CONTINENT_SCALE,
        mountainScale: PlayerConfig.TERRAIN_MOUNTAIN_SCALE,
        hillScale: PlayerConfig.TERRAIN_HILL_SCALE,
        detailScale: PlayerConfig.TERRAIN_DETAIL_SCALE,
        continentWeight: PlayerConfig.TERRAIN_CONTINENT_WEIGHT,
        mountainHeight: PlayerConfig.TERRAIN_MOUNTAIN_HEIGHT,
        hillWeight: PlayerConfig.TERRAIN_HILL_WEIGHT,
        detailWeight: PlayerConfig.TERRAIN_DETAIL_WEIGHT,
        oceanDepthPower: PlayerConfig.TERRAIN_OCEAN_DEPTH_POWER,
        terrainMaxDepth: PlayerConfig.TERRAIN_MAX_DEPTH,
        oreConfigs: this.ORE_CONFIGS.map(ore => ({
          type: ore.type as number,
          minDepth: ore.minDepth,
          maxDepth: ore.maxDepth,
          veinChance: ore.veinChance,
          veinSize: ore.veinSize,
          spreadFactor: ore.spreadFactor
        }))
      };

      // Build tile lookup map
      const tileMap = new Map<number, typeof this.polyhedron.tiles[0]>();
      for (const tile of this.polyhedron.tiles) {
        tileMap.set(tile.index, tile);
      }

      // Handle worker response
      worker.onmessage = (e) => {
        const { type, columns } = e.data;

        if (type === 'terrainResult') {
          const columnsArray = columns as Array<[number, number[]]>;
          const boundingRadius = this.BLOCK_HEIGHT * this.MAX_DEPTH;

          for (const [tileIndex, blocks] of columnsArray) {
            const tile = tileMap.get(tileIndex);
            if (!tile) continue;

            const boundingSphere = new THREE.Sphere(
              tile.center.clone().add(this.center),
              boundingRadius
            );

            const column: PlanetColumn = {
              tile,
              blocks: blocks as HexBlockType[],
              isDirty: true,
              boundingSphere
            };

            this.columns.set(tileIndex, column);
            this.tilesWithTerrain.add(tileIndex);
          }

          worker.terminate();
          console.log(`[Planet] Generated terrain for ${columnsArray.length} tiles`);
          resolve();
        }
      };

      worker.onerror = (error) => {
        console.error('[Planet] Terrain worker error:', error);
        worker.terminate();
        resolve();
      };

      // Start worker
      worker.postMessage({
        type: 'generateTerrain',
        tiles,
        config
      });
    });
  }

  // Process pending terrain generation in background (called from update loop)
  private processBackgroundTerrainGeneration(): void {
    if (this.isTerrainWorkerBusy || this.pendingTerrainTiles.length === 0) return;

    // Get next batch of tiles to generate
    const batch = this.pendingTerrainTiles.splice(0, this.terrainBatchSize);
    if (batch.length === 0) return;

    this.isTerrainWorkerBusy = true;

    // Generate terrain for this batch
    this.generateTerrainForTiles(batch).then(() => {
      this.isTerrainWorkerBusy = false;

      // Rebuild LOD if we have new terrain data
      if (batch.length > 0 && this.pendingTerrainTiles.length === 0) {
        console.log(`[Planet] ${this.config.name || 'Unknown'}: Background terrain generation complete`);
        // Rebuild LOD to include new terrain
        this.createLODMesh();
      }
    });
  }

  private createBatchedMeshGroup(): void {
    this.batchedMeshGroup = new THREE.Group();
    this.batchedMeshGroup.position.copy(this.center);
    this.batchedMeshGroup.renderOrder = 0; // Render detailed terrain after LOD (which is -1)
    this.scene.add(this.batchedMeshGroup);
  }

  // Initialize LOD chunk system - assigns each tile to one of 32 chunks
  // Uses 12 icosahedron vertices + 20 icosahedron face centers for smaller, more uniform chunks
  private initializeLODChunks(): void {
    // 12 icosahedron vertices (golden ratio based)
    const t = (1 + Math.sqrt(5)) / 2;
    const vertices = [
      new THREE.Vector3(-1, t, 0).normalize(),   // 0
      new THREE.Vector3(1, t, 0).normalize(),    // 1
      new THREE.Vector3(-1, -t, 0).normalize(),  // 2
      new THREE.Vector3(1, -t, 0).normalize(),   // 3
      new THREE.Vector3(0, -1, t).normalize(),   // 4
      new THREE.Vector3(0, 1, t).normalize(),    // 5
      new THREE.Vector3(0, -1, -t).normalize(),  // 6
      new THREE.Vector3(0, 1, -t).normalize(),   // 7
      new THREE.Vector3(t, 0, -1).normalize(),   // 8
      new THREE.Vector3(t, 0, 1).normalize(),    // 9
      new THREE.Vector3(-t, 0, -1).normalize(),  // 10
      new THREE.Vector3(-t, 0, 1).normalize()    // 11
    ];

    // 20 icosahedron faces (each face defined by 3 vertex indices)
    const faces = [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]
    ];

    // Generate 32 chunk centers: 12 vertices + 20 face centers
    this.lodChunkDirections = [];

    // Add 12 vertex centers
    for (const v of vertices) {
      this.lodChunkDirections.push(v.clone());
    }

    // Add 20 face centers (average of 3 vertices per face, normalized)
    for (const face of faces) {
      const center = new THREE.Vector3()
        .add(vertices[face[0]])
        .add(vertices[face[1]])
        .add(vertices[face[2]])
        .normalize();
      this.lodChunkDirections.push(center);
    }

    const chunkCenters = this.lodChunkDirections;

    // Assign each tile to nearest chunk center and count tiles per chunk
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
      // Track total tiles per chunk for coverage calculation
      const count = this.chunkTotalTileCount.get(closestChunk) ?? 0;
      this.chunkTotalTileCount.set(closestChunk, count + 1);
      // Build reverse mapping: chunk -> tiles
      const tiles = this.chunkToTiles.get(closestChunk) ?? [];
      tiles.push(tile.index);
      this.chunkToTiles.set(closestChunk, tiles);
    }

    // Create chunk groups and bounding spheres
    // With 32 chunks, each covers ~3.1% of sphere surface (vs 8.3% with 12 chunks)
    // Smaller chunks = tighter bounding spheres
    for (let i = 0; i < this.LOD_CHUNK_COUNT; i++) {
      const chunkGroup = new THREE.Group();
      this.lodChunks.push(chunkGroup);

      // Bounding sphere centered on chunk - smaller radius for 32 chunks
      const boundCenter = chunkCenters[i].clone().multiplyScalar(this.radius).add(this.center);
      const boundRadius = this.radius * 0.4; // Tighter bounds for smaller chunks
      this.lodChunkBounds.push(new THREE.Sphere(boundCenter, boundRadius));
    }
  }

  // Frustum cull LOD chunks - hide chunks that are behind the camera or off-screen
  // Uses chunk normal (outward direction from planet center) to cull chunks facing away
  // Also hides chunks that are covered by detailed terrain
  private cullLODChunks(): void {
    if (!this.lodMesh || this.lodChunks.length === 0) return;

    // Find the chunk containing the camera position - always hide it to prevent LOD from
    // showing at ground level (even before detailed terrain is generated at that location)
    const cameraTile = this.getTileAtPointFast(this.cachedCameraPosition);
    const cameraChunkIndex = cameraTile ? this.getTileChunkIndex(cameraTile.index) : -1;

    // Direction from planet center to camera (the direction chunks should face to be visible)
    const planetToCamera = new THREE.Vector3()
      .subVectors(this.cachedCameraPosition, this.center)
      .normalize();

    // Calculate horizon culling threshold based on camera altitude
    // The horizon angle from the camera's POV determines what's visible
    // sin(horizon_angle) = radius / distance, so cos = sqrt(1 - (r/d)^2)
    // Chunks whose dot product with planetToCamera is less than -cos(horizon) are over the horizon
    const cameraDistFromCenter = this.cachedCameraPosition.distanceTo(this.center);
    const ratioSquared = (this.radius * this.radius) / (cameraDistFromCenter * cameraDistFromCenter);
    // Clamp to valid range for sqrt
    const cosHorizon = Math.sqrt(Math.max(0, 1 - ratioSquared));

    // Threshold: cull chunks facing away from camera
    // When on surface (dist ≈ radius): cosHorizon ≈ 0, threshold ≈ 0 (cull back hemisphere)
    // When far away: cosHorizon approaches 1, threshold approaches -1 (see more of planet)
    // Add small tolerance (0.15) for chunk size since each chunk covers ~30° of planet
    const horizonThreshold = -cosHorizon + 0.15;

    let visibleCount = 0;
    let frustumCulled = 0;
    let backfaceCulled = 0;

    for (let i = 0; i < this.lodChunkBounds.length; i++) {
      const bounds = this.lodChunkBounds[i];

      // First check: backface culling using chunk normal
      // lodChunkDirections[i] is the normalized direction from planet center to chunk center
      // This is the "outward normal" of that chunk region
      const chunkNormal = this.lodChunkDirections[i];
      if (chunkNormal) {
        // Dot product of chunk normal with direction to camera
        // Positive = chunk faces toward camera (visible)
        // Negative = chunk faces away from camera (cull it)
        const facingDot = chunkNormal.dot(planetToCamera);

        // Cull if chunk normal faces away from camera beyond horizon threshold
        if (facingDot < horizonThreshold) {
          if (i < this.lodChunks.length) {
            this.lodChunks[i].visible = false;
          }
          backfaceCulled++;
          continue;
        }
      }

      // Second check: frustum culling
      const inFrustum = this.frustum.intersectsSphere(bounds);
      if (!inFrustum) {
        if (i < this.lodChunks.length) {
          this.lodChunks[i].visible = false;
        }
        frustumCulled++;
        continue;
      }

      // Third check: always hide the chunk the camera is in
      // This prevents LOD from showing at ground level even before detailed terrain is generated
      if (i === cameraChunkIndex) {
        if (i < this.lodChunks.length) {
          this.lodChunks[i].visible = false;
        }
        continue;
      }

      // Fourth check: hide LOD chunk if ANY of its tiles have detailed geometry
      // This prevents z-fighting/overdraw where both LOD and detailed terrain exist
      const detailedCount = this.chunkDetailedTileCount.get(i) ?? 0;
      if (detailedCount > 0) {
        if (i < this.lodChunks.length) {
          this.lodChunks[i].visible = false;
        }
        continue;
      }

      // Chunk passed all culling tests - make it visible
      if (i < this.lodChunks.length) {
        this.lodChunks[i].visible = true;
        visibleCount++;
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
        } else if (e.data.type === 'chunkGeometryResult') {
          const start = performance.now();
          this.handleChunkWorkerResult(e.data);
          const elapsed = performance.now() - start;
          profiler.logOneTimeOperation('Chunk Mesh Build', elapsed);
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
    snowData: GeometryData;
    snowSideData: GeometryData;
    dirtSnowData: GeometryData;
    iceData: GeometryData;
    glassData: GeometryData;
    moonRockData: GeometryData;
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
      // Snow biome
      { dataKey: 'snowData', materialKey: 'snow' },
      { dataKey: 'snowSideData', materialKey: 'snowSide' },
      { dataKey: 'dirtSnowData', materialKey: 'dirtSnow' },
      { dataKey: 'iceData', materialKey: 'ice', renderOrder: 2 }, // Render after water (transparent)
      { dataKey: 'glassData', materialKey: 'glass', renderOrder: 3 }, // Render after ice (transparent)
      // Moon terrain
      { dataKey: 'moonRockData', materialKey: 'moonRock' },
    ];

    let newWaterMesh: THREE.Mesh | null = null;
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
          // Track water mesh for depth pre-pass optimization
          if (materialKey === 'water') {
            newWaterMesh = mesh;
          }
        }
      }
    }
    profiler.end('Planet.workerResult.createMeshes');

    // Unregister old water mesh before swapping
    if (this.currentWaterMesh && this.waterMeshCallback) {
      this.waterMeshCallback(this.currentWaterMesh, false);
    }
    this.currentWaterMesh = null;

    profiler.begin('Planet.workerResult.swap');

    // Add ALL new meshes FIRST (before removing old ones) to prevent visual gaps
    // This is critical for chunk rebuilds - distant terrain must stay visible
    for (const mesh of newMeshes) {
      this.batchedMeshGroup.add(mesh);
      const isWater = mesh === newWaterMesh;
      if (isWater) {
        this.currentWaterMesh = mesh;
        if (this.waterMeshCallback) {
          this.waterMeshCallback(mesh, true);
        }
      }
    }

    // Now remove old meshes (they were already replaced by new ones above)
    // Collect references first to avoid modifying children array while iterating
    const oldMeshes: THREE.Mesh[] = [];
    for (const child of this.batchedMeshGroup.children) {
      if (!newMeshes.includes(child as THREE.Mesh)) {
        oldMeshes.push(child as THREE.Mesh);
      }
    }
    for (const oldMesh of oldMeshes) {
      this.batchedMeshGroup.remove(oldMesh);
      this.pendingMeshDisposals.push(oldMesh);
    }

    profiler.end('Planet.workerResult.swap');

    // Schedule water boundary walls rebuild (deferred to avoid frame spike)
    const hasWater = this.config.hasWater !== false && !this.config.texturePath;
    if (hasWater) {
      this.needsWaterWallsRebuild = true;
    }

    // NOW that geometry is ready, mark tiles as having detailed geometry
    // This triggers LOD hiding only when the detailed terrain is actually visible
    for (const tileIndex of this.pendingWorkerTiles) {
      if (!this.tilesWithDetailedGeometry.has(tileIndex)) {
        this.tilesWithDetailedGeometry.add(tileIndex);
        const chunkIndex = this.tileToChunk.get(tileIndex);
        if (chunkIndex !== undefined) {
          const count = this.chunkDetailedTileCount.get(chunkIndex) ?? 0;
          this.chunkDetailedTileCount.set(chunkIndex, count + 1);
        }
      }
    }
    this.pendingWorkerTiles.clear();

    this.isWorkerBuildActive = false;
    profiler.end('Planet.workerResult');

    // Mark initial terrain as built
    if (!this.initialTerrainBuilt) {
      this.initialTerrainBuilt = true;
      this.checkInitialBuildComplete();
    }
    // LOD rebuild will happen in next update() call since isWorkerBuildActive is now false
  }

  // Handle per-chunk geometry result from worker - only replaces meshes for rebuilt chunks
  private handleChunkWorkerResult(data: {
    chunkGeometries: Record<number, {
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
    }>;
    chunksRebuilt: number[];
  }): void {
    if (!this.batchedMeshGroup) return;

    profiler.begin('Planet.chunkWorkerResult');

    // Map of geometry data key to material key
    const dataToMaterial: Array<{ dataKey: string; materialKey: string; renderOrder?: number }> = [
      { dataKey: 'topData', materialKey: 'top' },
      { dataKey: 'sideData', materialKey: 'side' },
      { dataKey: 'grassSideData', materialKey: 'grassSide' },
      { dataKey: 'stoneData', materialKey: 'stone' },
      { dataKey: 'sandData', materialKey: 'sand' },
      { dataKey: 'woodData', materialKey: 'wood' },
      { dataKey: 'waterData', materialKey: 'water', renderOrder: 1 },
      { dataKey: 'oreCoalData', materialKey: 'oreCoal' },
      { dataKey: 'oreCopperData', materialKey: 'oreCopper' },
      { dataKey: 'oreIronData', materialKey: 'oreIron' },
      { dataKey: 'oreGoldData', materialKey: 'oreGold' },
      { dataKey: 'oreLithiumData', materialKey: 'oreLithium' },
      { dataKey: 'oreAluminumData', materialKey: 'oreAluminum' },
      { dataKey: 'oreCobaltData', materialKey: 'oreCobalt' },
      { dataKey: 'snowData', materialKey: 'snow' },
      { dataKey: 'snowSideData', materialKey: 'snowSide' },
      { dataKey: 'dirtSnowData', materialKey: 'dirtSnow' },
      { dataKey: 'iceData', materialKey: 'ice', renderOrder: 2 },
      { dataKey: 'glassData', materialKey: 'glass', renderOrder: 3 },
      { dataKey: 'moonRockData', materialKey: 'moonRock' },
    ];

    // On first chunk rebuild, clear all old flat meshes from initial build
    // The initial build creates flat meshes, but chunk rebuilds use per-chunk groups
    if (!this.hasTransitionedToChunkMeshes) {
      console.log(`[handleChunkWorkerResult] Transitioning to per-chunk meshes, clearing ${this.batchedMeshGroup.children.length} old flat meshes`);

      // Unregister old water mesh
      if (this.currentWaterMesh && this.waterMeshCallback) {
        this.waterMeshCallback(this.currentWaterMesh, false);
      }
      this.currentWaterMesh = null;

      // Remove and dispose all old flat meshes
      while (this.batchedMeshGroup.children.length > 0) {
        const child = this.batchedMeshGroup.children[0];
        this.batchedMeshGroup.remove(child);
        if (child instanceof THREE.Mesh && child.geometry) {
          child.geometry.dispose();
        }
      }

      this.hasTransitionedToChunkMeshes = true;
    }

    // Process each chunk that was rebuilt
    for (const chunkIndex of data.chunksRebuilt) {
      const chunkData = data.chunkGeometries[chunkIndex];
      if (!chunkData) continue;

      // Skip chunks that were rebuilt via immediate edit - worker result is stale
      if (this.freshlyEditedChunks.has(chunkIndex)) {
        console.log(`[handleChunkWorkerResult] Skipping chunk ${chunkIndex} - was freshly edited, worker result is stale`);
        this.freshlyEditedChunks.delete(chunkIndex); // Clear after skipping
        continue;
      }

      // Remove old chunk group if exists
      const oldChunkGroup = this.chunkDetailMeshes.get(chunkIndex);
      if (oldChunkGroup) {
        console.log(`[handleChunkWorkerResult] Removing old chunk ${chunkIndex} with ${oldChunkGroup.children.length} meshes`);
        // Unregister water mesh if this chunk had one
        const oldWaterMesh = this.chunkDetailWaterMeshes.get(chunkIndex);
        if (oldWaterMesh && this.waterMeshCallback) {
          this.waterMeshCallback(oldWaterMesh, false);
        }
        this.chunkDetailWaterMeshes.delete(chunkIndex);

        // Remove from parent and dispose
        this.batchedMeshGroup.remove(oldChunkGroup);
        oldChunkGroup.traverse((child) => {
          if (child instanceof THREE.Mesh && child.geometry) {
            child.geometry.dispose();
          }
        });
      } else {
        console.log(`[handleChunkWorkerResult] No old chunk ${chunkIndex} to remove (first build for this chunk)`);
      }

      // Create new chunk group
      const chunkGroup = new THREE.Group();
      chunkGroup.name = `detailChunk_${chunkIndex}`;

      // Create meshes for each material type
      for (const { dataKey, materialKey, renderOrder } of dataToMaterial) {
        const geomData = (chunkData as Record<string, GeometryData>)[dataKey];
        if (geomData && geomData.positions.length > 0) {
          const geom = this.createBufferGeometry(geomData);
          const materialConfig = this.BLOCK_MATERIALS.find(m => m.key === materialKey);
          if (materialConfig) {
            const mesh = new THREE.Mesh(geom, materialConfig.getMaterial());
            if (renderOrder !== undefined) {
              mesh.renderOrder = renderOrder;
            }
            chunkGroup.add(mesh);

            // Track water mesh for this chunk
            if (materialKey === 'water') {
              this.chunkDetailWaterMeshes.set(chunkIndex, mesh);
              if (this.waterMeshCallback) {
                this.waterMeshCallback(mesh, true);
              }
            }
          }
        }
      }

      // Add chunk group to scene
      this.batchedMeshGroup.add(chunkGroup);
      this.chunkDetailMeshes.set(chunkIndex, chunkGroup);

      // Count total vertices in this chunk
      let totalVerts = 0;
      chunkGroup.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          const pos = child.geometry.getAttribute('position');
          if (pos) totalVerts += pos.count;
        }
      });
      console.log(`[handleChunkWorkerResult] Chunk ${chunkIndex}: ${chunkGroup.children.length} meshes, ${totalVerts} vertices, batchedMeshGroup.children: ${this.batchedMeshGroup.children.length}`);
    }

    // VERIFY: Check if the last edited tile was included in this rebuild (BEFORE clearing pendingChunkWorkerTiles)
    if (this.lastEditedTile) {
      const editedTileIndex = this.lastEditedTile.tileIndex;
      const editedChunk = this.tileToChunk.get(editedTileIndex);
      const wasRebuilt = this.chunksBeingRebuilt.includes(editedChunk!);

      // Check if tile was in the tiles sent to worker
      const wasInTilesRebuilt = this.pendingChunkWorkerTiles.has(editedTileIndex);

      // Verify the block data is still correct
      const column = this.columns.get(editedTileIndex);
      const currentBlock = column ? column.blocks[this.lastEditedTile.depth] : null;
      const expectedBlock = this.lastEditedTile.newBlock;

      if (!wasRebuilt) {
        console.error(`🔴 ERROR: Edited tile ${editedTileIndex} (chunk ${editedChunk}) was NOT in rebuilt chunks: ${this.chunksBeingRebuilt.join(', ')}`);
      } else if (!wasInTilesRebuilt) {
        console.error(`🔴 ERROR: Edited tile ${editedTileIndex} was NOT sent to worker! (chunk ${editedChunk} was rebuilt but tile wasn't in pendingChunkWorkerTiles, size=${this.pendingChunkWorkerTiles.size})`);
      } else if (currentBlock !== expectedBlock) {
        console.error(`🔴 ERROR: Block data mismatch! Tile ${editedTileIndex} depth ${this.lastEditedTile.depth}: expected ${HexBlockType[expectedBlock]}, got ${currentBlock !== null ? HexBlockType[currentBlock] : 'null'}`);
      } else {
        console.log(`✅ Edited tile ${editedTileIndex} (chunk ${editedChunk}) was correctly rebuilt with block ${HexBlockType[expectedBlock]}`);
      }

      this.lastEditedTile = null; // Clear after verification
    }

    // Mark tiles as having detailed geometry
    for (const tileIndex of this.pendingChunkWorkerTiles) {
      if (!this.tilesWithDetailedGeometry.has(tileIndex)) {
        this.tilesWithDetailedGeometry.add(tileIndex);
        const chunkIndex = this.tileToChunk.get(tileIndex);
        if (chunkIndex !== undefined) {
          const count = this.chunkDetailedTileCount.get(chunkIndex) ?? 0;
          this.chunkDetailedTileCount.set(chunkIndex, count + 1);
        }
      }
    }

    console.log(`[handleChunkWorkerResult] Rebuilt ${this.chunksBeingRebuilt.length} chunk(s)`);
    this.pendingChunkWorkerTiles.clear();
    this.chunksBeingRebuilt = [];

    this.isChunkWorkerBuildActive = false;
    profiler.end('Planet.chunkWorkerResult');

    // Schedule water boundary walls rebuild
    const hasWater = this.config.hasWater !== false && !this.config.texturePath;
    if (hasWater) {
      this.needsWaterWallsRebuild = true;
    }
  }

  // Process pending mesh uploads and disposals (called from update loop)
  // This spreads GPU buffer uploads across frames to reduce lag spikes
  private processPendingMeshUploads(): void {
    if (!this.batchedMeshGroup) return;

    // Process pending uploads (add new meshes)
    for (let i = 0; i < this.MESHES_PER_FRAME && this.pendingMeshUploads.length > 0; i++) {
      const pending = this.pendingMeshUploads.shift()!;
      this.batchedMeshGroup.add(pending.mesh);

      // Track water mesh for depth pre-pass optimization
      if (pending.isWater) {
        this.currentWaterMesh = pending.mesh;
        if (this.waterMeshCallback) {
          this.waterMeshCallback(pending.mesh, true);
        }
      }
    }

    // Process pending disposals (dispose old meshes)
    for (let i = 0; i < this.MESHES_PER_FRAME && this.pendingMeshDisposals.length > 0; i++) {
      const mesh = this.pendingMeshDisposals.shift()!;
      if (mesh.geometry) mesh.geometry.dispose();
    }
  }

  // Per-chunk geometry data from LOD worker - now time-sliced for large planets
  private handleLODWorkerResult(data: {
    chunkGeometries: Array<{
      grassPositions: number[]; grassNormals: number[]; grassUvs: number[]; grassSkyLight: number[]; grassTorchLight: number[]; grassIndices: number[];
      dirtPositions: number[]; dirtNormals: number[]; dirtUvs: number[]; dirtSkyLight: number[]; dirtTorchLight: number[]; dirtIndices: number[];
      stonePositions: number[]; stoneNormals: number[]; stoneUvs: number[]; stoneSkyLight: number[]; stoneTorchLight: number[]; stoneIndices: number[];
      sandPositions: number[]; sandNormals: number[]; sandUvs: number[]; sandSkyLight: number[]; sandTorchLight: number[]; sandIndices: number[];
      woodPositions: number[]; woodNormals: number[]; woodUvs: number[]; woodSkyLight: number[]; woodTorchLight: number[]; woodIndices: number[];
      waterPositions: number[]; waterNormals: number[]; waterUvs: number[]; waterIndices: number[];
      sidePositions: number[]; sideNormals: number[]; sideUvs: number[]; sideSkyLight: number[]; sideTorchLight: number[]; sideIndices: number[];
      waterSidePositions: number[]; waterSideNormals: number[]; waterSideUvs: number[]; waterSideIndices: number[];
      snowPositions: number[]; snowNormals: number[]; snowUvs: number[]; snowSkyLight: number[]; snowTorchLight: number[]; snowIndices: number[];
      icePositions: number[]; iceNormals: number[]; iceUvs: number[]; iceSkyLight: number[]; iceTorchLight: number[]; iceIndices: number[];
      moonRockPositions: number[]; moonRockNormals: number[]; moonRockUvs: number[]; moonRockSkyLight: number[]; moonRockTorchLight: number[]; moonRockIndices: number[];
      moonRockSidePositions: number[]; moonRockSideNormals: number[]; moonRockSideUvs: number[]; moonRockSideSkyLight: number[]; moonRockSideTorchLight: number[]; moonRockSideIndices: number[];
    }>;
  }): void {
    // Check if worker result has any actual geometry
    let hasAnyGeometry = false;
    for (const chunk of data.chunkGeometries) {
      if (chunk.grassPositions.length > 0 || chunk.dirtPositions.length > 0 ||
          chunk.stonePositions.length > 0 || chunk.sandPositions.length > 0 ||
          chunk.snowPositions.length > 0 || chunk.icePositions.length > 0 ||
          chunk.moonRockPositions.length > 0 || chunk.waterPositions.length > 0) {
        hasAnyGeometry = true;
        break;
      }
    }

    // If worker returned no geometry, keep the fallback mesh (don't replace with empty chunks)
    if (!hasAnyGeometry) {
      console.log(`[${this.config.name}] LOD worker returned no geometry, keeping fallback HIGH LOD`);
      this.isLODWorkerBuildActive = false;
      // If we don't have a fallback mesh yet, create one
      if (!this.isHighLODReady()) {
        this.createFallbackHighLODMesh();
      }
      return;
    }

    // Remove old LOD mesh
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

    // Create LOD parent group immediately
    const lodGroup = new THREE.Group();
    lodGroup.position.copy(this.center);
    lodGroup.renderOrder = -1;
    this.scene.add(lodGroup);
    this.lodMesh = lodGroup;

    // Add empty chunk groups to LOD parent
    for (let i = 0; i < this.LOD_CHUNK_COUNT; i++) {
      lodGroup.add(this.lodChunks[i]);
    }

    // Store chunk data for time-sliced processing
    this.pendingLODChunkData = data.chunkGeometries;

    // Sort chunks by distance to camera (nearest first) for better user experience
    // Use cached camera position if available, otherwise process in order
    const chunkIndices: number[] = [];
    for (let i = 0; i < this.LOD_CHUNK_COUNT; i++) {
      chunkIndices.push(i);
    }

    // Sort by dot product with camera direction (higher = closer/more visible)
    if (this.cachedCameraPosition.lengthSq() > 0) {
      const cameraDir = this.cachedCameraPosition.clone().sub(this.center).normalize();
      chunkIndices.sort((a, b) => {
        const dirA = this.lodChunkDirections[a];
        const dirB = this.lodChunkDirections[b];
        // Higher dot product = more aligned with camera = should be processed first
        return dirB.dot(cameraDir) - dirA.dot(cameraDir);
      });
    }

    this.pendingLODChunkQueue = chunkIndices;

    // During initial load, process all chunks synchronously (update loop isn't running yet)
    // During gameplay, time-slice to avoid frame drops
    if (!this.initialLODBuilt) {
      console.log(`[LOD Build] Processing ${this.LOD_CHUNK_COUNT} chunks synchronously (initial load)`);
      // Process all chunks immediately
      while (this.pendingLODChunkQueue.length > 0) {
        this.processLODChunks();
      }
    } else {
      console.log(`[LOD Build] Starting time-sliced build of ${this.LOD_CHUNK_COUNT} chunks (nearest-first)`);
    }

    // Worker is done, but mesh creation may continue incrementally (if not initial load)
    this.isLODWorkerBuildActive = false;
  }

  // Process pending LOD chunks incrementally (called from update loop)
  private processLODChunks(): void {
    if (!this.pendingLODChunkData) return;

    const startTime = performance.now();
    let chunksProcessed = 0;
    let meshCount = 0;
    let totalVertices = 0;

    // Helper to create geometry from typed arrays
    const createGeom = (positions: number[], normals: number[], uvs: number[], indices: number[], skyLight?: number[], torchLight?: number[]): THREE.BufferGeometry => {
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
      geom.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
      geom.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uvs), 2));
      if (skyLight && skyLight.length > 0) {
        geom.setAttribute('skyLight', new THREE.BufferAttribute(new Float32Array(skyLight), 1));
      }
      const vertexCount = positions.length / 3;
      if (torchLight && torchLight.length > 0) {
        geom.setAttribute('torchLight', new THREE.BufferAttribute(new Float32Array(torchLight), 1));
      } else {
        geom.setAttribute('torchLight', new THREE.BufferAttribute(new Float32Array(vertexCount).fill(0), 1));
      }
      geom.setIndex(indices);
      return geom;
    };

    // Process a few chunks per frame from the sorted queue
    while (this.pendingLODChunkQueue.length > 0 && chunksProcessed < this.LOD_CHUNKS_PER_FRAME) {
      const i = this.pendingLODChunkQueue.shift()!;
      const chunkData = this.pendingLODChunkData[i];
      chunksProcessed++;

      if (!chunkData) continue;

      const chunkGroup = this.lodChunks[i];

      // Create all material meshes for this chunk
      if (chunkData.grassPositions.length > 0) {
        const geom = createGeom(chunkData.grassPositions, chunkData.grassNormals, chunkData.grassUvs, chunkData.grassIndices, chunkData.grassSkyLight, chunkData.grassTorchLight);
        chunkGroup.add(new THREE.Mesh(geom, this.meshBuilder.getTopLODMaterial()));
        meshCount++;
        totalVertices += chunkData.grassPositions.length / 3;
      }

      if (chunkData.dirtPositions.length > 0) {
        const geom = createGeom(chunkData.dirtPositions, chunkData.dirtNormals, chunkData.dirtUvs, chunkData.dirtIndices, chunkData.dirtSkyLight, chunkData.dirtTorchLight);
        chunkGroup.add(new THREE.Mesh(geom, this.meshBuilder.getSideLODMaterial()));
        meshCount++;
        totalVertices += chunkData.dirtPositions.length / 3;
      }

      if (chunkData.stonePositions.length > 0) {
        const geom = createGeom(chunkData.stonePositions, chunkData.stoneNormals, chunkData.stoneUvs, chunkData.stoneIndices, chunkData.stoneSkyLight, chunkData.stoneTorchLight);
        chunkGroup.add(new THREE.Mesh(geom, this.meshBuilder.getStoneLODMaterial()));
        meshCount++;
        totalVertices += chunkData.stonePositions.length / 3;
      }

      if (chunkData.sandPositions.length > 0) {
        const geom = createGeom(chunkData.sandPositions, chunkData.sandNormals, chunkData.sandUvs, chunkData.sandIndices, chunkData.sandSkyLight, chunkData.sandTorchLight);
        chunkGroup.add(new THREE.Mesh(geom, this.meshBuilder.getSandLODMaterial()));
        meshCount++;
        totalVertices += chunkData.sandPositions.length / 3;
      }

      if (chunkData.woodPositions.length > 0) {
        const geom = createGeom(chunkData.woodPositions, chunkData.woodNormals, chunkData.woodUvs, chunkData.woodIndices, chunkData.woodSkyLight, chunkData.woodTorchLight);
        chunkGroup.add(new THREE.Mesh(geom, this.meshBuilder.getWoodLODMaterial()));
        meshCount++;
        totalVertices += chunkData.woodPositions.length / 3;
      }

      if (chunkData.waterPositions.length > 0) {
        const geom = createGeom(chunkData.waterPositions, chunkData.waterNormals, chunkData.waterUvs, chunkData.waterIndices);
        const mesh = new THREE.Mesh(geom, this.meshBuilder.getWaterLODMaterial());
        mesh.renderOrder = -2;
        chunkGroup.add(mesh);
        meshCount++;
        totalVertices += chunkData.waterPositions.length / 3;
      }

      if (chunkData.sidePositions.length > 0) {
        const geom = createGeom(chunkData.sidePositions, chunkData.sideNormals, chunkData.sideUvs, chunkData.sideIndices, chunkData.sideSkyLight, chunkData.sideTorchLight);
        chunkGroup.add(new THREE.Mesh(geom, this.meshBuilder.getSideLODMaterial()));
        meshCount++;
        totalVertices += chunkData.sidePositions.length / 3;
      }

      if (chunkData.waterSidePositions.length > 0) {
        const geom = createGeom(chunkData.waterSidePositions, chunkData.waterSideNormals, chunkData.waterSideUvs, chunkData.waterSideIndices);
        const mesh = new THREE.Mesh(geom, this.meshBuilder.getWaterLODMaterial());
        mesh.renderOrder = -2;
        chunkGroup.add(mesh);
        meshCount++;
        totalVertices += chunkData.waterSidePositions.length / 3;
      }

      if (chunkData.snowPositions && chunkData.snowPositions.length > 0) {
        const geom = createGeom(chunkData.snowPositions, chunkData.snowNormals, chunkData.snowUvs, chunkData.snowIndices, chunkData.snowSkyLight, chunkData.snowTorchLight);
        chunkGroup.add(new THREE.Mesh(geom, this.meshBuilder.getSnowLODMaterial()));
        meshCount++;
        totalVertices += chunkData.snowPositions.length / 3;
      }

      if (chunkData.icePositions && chunkData.icePositions.length > 0) {
        const geom = createGeom(chunkData.icePositions, chunkData.iceNormals, chunkData.iceUvs, chunkData.iceIndices, chunkData.iceSkyLight, chunkData.iceTorchLight);
        chunkGroup.add(new THREE.Mesh(geom, this.meshBuilder.getIceLODMaterial()));
        meshCount++;
        totalVertices += chunkData.icePositions.length / 3;
      }

      if (chunkData.moonRockPositions && chunkData.moonRockPositions.length > 0) {
        const geom = createGeom(chunkData.moonRockPositions, chunkData.moonRockNormals, chunkData.moonRockUvs, chunkData.moonRockIndices, chunkData.moonRockSkyLight, chunkData.moonRockTorchLight);
        chunkGroup.add(new THREE.Mesh(geom, this.meshBuilder.getMoonRockLODMaterial()));
        meshCount++;
        totalVertices += chunkData.moonRockPositions.length / 3;
      }

      if (chunkData.moonRockSidePositions && chunkData.moonRockSidePositions.length > 0) {
        const geom = createGeom(chunkData.moonRockSidePositions, chunkData.moonRockSideNormals, chunkData.moonRockSideUvs, chunkData.moonRockSideIndices, chunkData.moonRockSideSkyLight, chunkData.moonRockSideTorchLight);
        chunkGroup.add(new THREE.Mesh(geom, this.meshBuilder.getMoonRockLODMaterial()));
        meshCount++;
        totalVertices += chunkData.moonRockSidePositions.length / 3;
      }
    }

    const elapsed = performance.now() - startTime;

    // Check if all chunks are processed
    if (this.pendingLODChunkQueue.length === 0) {
      console.log(`[LOD Build] Complete: ${this.LOD_CHUNK_COUNT} chunks, ${elapsed.toFixed(1)}ms for final batch`);
      this.pendingLODChunkData = null;

      // Mark initial LOD as built
      if (!this.initialLODBuilt) {
        this.initialLODBuilt = true;
        this.checkInitialBuildComplete();
      }
    }
  }

  // Check if both initial terrain and LOD are built, resolve the promise if so
  private checkInitialBuildComplete(): void {
    if (this.initialTerrainBuilt && this.initialLODBuilt && this.initialBuildResolve) {
      this.initialBuildResolve();
      this.initialBuildResolve = null;
    }
  }

  // Build initial terrain for the spawn area and wait for completion
  // This ensures terrain is ready before the player spawns
  public async buildInitialTerrain(spawnPosition: THREE.Vector3): Promise<void> {
    // Find the tile at spawn position
    const spawnTile = this.polyhedron.getTileAtPoint(spawnPosition.clone().sub(this.center));
    if (!spawnTile) {
      console.warn('Could not find spawn tile, using default position');
      return;
    }

    // Get initial set of nearby tiles around spawn
    // Use chunk-based selection to match LOD chunk boundaries (no gaps)
    // Use per-planet config if set, otherwise fall back to PlayerConfig default
    const renderDistance = this.config.detailRenderDistance ?? PlayerConfig.TERRAIN_MIN_RENDER_DISTANCE;
    const initialChunks = this.getChunksInRange(spawnTile.index, renderDistance);
    const initialTiles = this.getTilesFromChunks(initialChunks);

    // Update cache and trigger build
    this.cachedNearbyTiles = initialTiles;
    const bufferChunks = this.getChunksInRange(spawnTile.index, PlayerConfig.TERRAIN_BUFFER_ZONE);
    this.bufferCenterTiles = this.getTilesFromChunks(bufferChunks);
    this.cachedRenderDistance = renderDistance;
    this.needsRebatch = true;

    // Start worker builds
    if (this.geometryWorker) {
      this.startWorkerBuild();
    }
    if (this.lodGeometryWorker) {
      this.startLODWorkerBuild();
    }

    // Return a promise that resolves when both builds complete
    return new Promise<void>((resolve) => {
      // If both are already built (e.g., fallback to main thread), resolve immediately
      if (this.initialTerrainBuilt && this.initialLODBuilt) {
        resolve();
        return;
      }
      this.initialBuildResolve = resolve;
    });
  }

  // Check if initial terrain build is complete
  public isInitialTerrainReady(): boolean {
    return this.initialTerrainBuilt && this.initialLODBuilt;
  }

  private startWorkerBuild(): void {
    if (!this.geometryWorker || this.isWorkerBuildActive) return;

    console.log(`[startWorkerBuild] Rebuilding ${this.cachedNearbyTiles.size} tiles`);
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

    // Track which tiles are being built - LOD hiding happens when geometry is ready
    this.pendingWorkerTiles = new Set(this.cachedNearbyTiles);

    this.isWorkerBuildActive = true;
    this.needsRebatch = false;

    // Filter torches to only those that can affect the nearby tiles
    // This reduces O(vertices × torches) computation in worker
    const relevantTorches = this.filterRelevantTorches(columns);

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
        torches: relevantTorches
      }
    });
    profiler.end('Planet.workerBuild.postMessage');
  }

  // Filter torches to only those within range of the given columns
  private filterRelevantTorches(columns: Array<{ tile: { center: { x: number; y: number; z: number } } }>): typeof this.torchData {
    if (this.torchData.length === 0 || columns.length === 0) {
      return this.torchData;
    }

    // Compute bounding sphere center of all columns
    let cx = 0, cy = 0, cz = 0;
    for (const col of columns) {
      cx += col.tile.center.x;
      cy += col.tile.center.y;
      cz += col.tile.center.z;
    }
    cx /= columns.length;
    cy /= columns.length;
    cz /= columns.length;

    // Find max distance from center to any column
    let maxDistSq = 0;
    for (const col of columns) {
      const dx = col.tile.center.x - cx;
      const dy = col.tile.center.y - cy;
      const dz = col.tile.center.z - cz;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq > maxDistSq) maxDistSq = distSq;
    }
    const boundingRadius = Math.sqrt(maxDistSq);

    // Filter torches: include if within boundingRadius + torchRange + buffer
    const maxTorchRange = PlayerConfig.TORCH_LIGHT_RANGE + 2; // Add buffer for vertex positions
    const cullRadius = boundingRadius + maxTorchRange;
    const cullRadiusSq = cullRadius * cullRadius;

    return this.torchData.filter(torch => {
      const dx = torch.position.x - cx;
      const dy = torch.position.y - cy;
      const dz = torch.position.z - cz;
      return dx * dx + dy * dy + dz * dz <= cullRadiusSq;
    });
  }

  // Start a chunk-specific worker build - only rebuilds tiles in the specified chunks
  // This is much faster than a full rebuild when placing/breaking blocks
  private startChunkWorkerBuild(chunksToRebuild: Set<number>): void {
    if (!this.geometryWorker || this.isWorkerBuildActive || this.isChunkWorkerBuildActive) return;
    if (chunksToRebuild.size === 0) return;

    const chunks = Array.from(chunksToRebuild);
    console.log(`[startChunkWorkerBuild] Rebuilding ${chunks.length} chunk(s): ${chunks.join(', ')}, cachedNearbyTiles size: ${this.cachedNearbyTiles.size}`);

    profiler.begin('Planet.chunkWorkerBuild.serialize');

    // Collect all tiles in the chunks to rebuild
    const tilesToRebuild = new Set<number>();
    for (const chunkIndex of chunks) {
      const chunkTiles = this.chunkToTiles.get(chunkIndex);
      if (chunkTiles) {
        for (const tileIndex of chunkTiles) {
          // Only include tiles that are in the current render distance
          if (this.cachedNearbyTiles.has(tileIndex)) {
            tilesToRebuild.add(tileIndex);
          }
        }
      }
    }

    console.log(`[startChunkWorkerBuild] tilesToRebuild: ${tilesToRebuild.size} tiles: ${Array.from(tilesToRebuild).slice(0, 10).join(', ')}${tilesToRebuild.size > 10 ? '...' : ''}`);

    if (tilesToRebuild.size === 0) {
      profiler.end('Planet.chunkWorkerBuild.serialize');
      return;
    }

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

    for (const tileIndex of tilesToRebuild) {
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

    // Build tileToChunk map for worker (only tiles being rebuilt)
    const tileToChunk: Record<number, number> = {};
    for (const tileIndex of tilesToRebuild) {
      const chunkIndex = this.tileToChunk.get(tileIndex);
      if (chunkIndex !== undefined) {
        tileToChunk[tileIndex] = chunkIndex;
      }
    }

    // Track which tiles and chunks are being built
    this.pendingChunkWorkerTiles = new Set(tilesToRebuild);
    this.chunksBeingRebuilt = chunks;
    this.isChunkWorkerBuildActive = true;

    // Filter torches to only those that can affect the tiles being rebuilt
    const relevantTorches = this.filterRelevantTorches(columns);

    profiler.end('Planet.chunkWorkerBuild.serialize');

    // Send to worker
    profiler.begin('Planet.chunkWorkerBuild.postMessage');
    this.geometryWorker.postMessage({
      type: 'buildChunkGeometry',
      columns,
      neighborData,
      tileToChunk,
      chunksToRebuild: chunks,
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
        torches: relevantTorches
      }
    });
    profiler.end('Planet.chunkWorkerBuild.postMessage');
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
    profiler.end('Planet.lodWorkerBuild.serialize');

    // Send to worker
    // NOTE: nearbyTiles is now empty - we build complete LOD for ALL tiles.
    // Per-tile visibility toggling handles LOD vs detailed at runtime.
    profiler.begin('Planet.lodWorkerBuild.postMessage');
    this.lodGeometryWorker.postMessage({
      type: 'buildLODGeometry',
      tileData: this.serializedTileData,
      blockData,
      nearbyTiles: [], // Empty - build all tiles, no exclusions
      tileToChunk: this.serializedTileToChunk,
      config: {
        radius: this.radius,
        blockHeight: this.BLOCK_HEIGHT,
        seaLevel: this.SEA_LEVEL,
        maxDepth: this.MAX_DEPTH,
        waterSurfaceOffset: PlayerConfig.WATER_SURFACE_OFFSET,
        lodOffset: PlayerConfig.TERRAIN_LOD_OFFSET,
        chunkCount: this.LOD_CHUNK_COUNT
      },
      torches: this.torchData
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
    // Level 0: subdivision - 2 (used at distantLODAltitude)
    // Level 1: subdivision - 3 (used at distantLODAltitude * 2.5)
    // Level 2: subdivision - 4 (used at distantLODAltitude * 5, lowest detail)
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
      const torchLightArray: number[] = []; // Vertex-baked torch light (1 per tile, single tile range)
      const indices: number[] = [];
      let vertexOffset = 0;

      // First pass: calculate display radius for each tile
      const tileDisplayRadii = new Map<number, { radius: number; isWater: boolean; color: THREE.Color }>();
      const SEA_LEVEL_DEPTH = this.getSeaLevelDepth();
      const waterRadius = this.depthToRadius(SEA_LEVEL_DEPTH);

      // Check if this is a single-texture planet (like moon) - use grey for all surfaces
      const isSingleTexturePlanet = !!this.config.texturePath;

      // Get LOD colors from config, falling back to defaults
      const lodColors: LodColorsConfig = {
        ...DEFAULT_LOD_COLORS,
        ...this.config.lodColors,
      };

      for (const tile of lodPolyhedron.tiles) {
        const surfaceDepth = this.getHeightVariation(tile.center);
        const terrainRadius = this.depthToRadius(surfaceDepth);
        const isWater = !isSingleTexturePlanet && surfaceDepth < SEA_LEVEL_DEPTH;
        const displayRadius = isWater ? waterRadius : terrainRadius;

        // Polar biome detection for space-level LOD colors
        const normalizedY = tile.center.clone().normalize().y;
        const polarThreshold = PlayerConfig.POLAR_THRESHOLD;
        const isPolar = Math.abs(normalizedY) > polarThreshold;

        let color: THREE.Color;
        if (isSingleTexturePlanet) {
          // Single texture planets (like moon) use grey shading based on height
          const heightFactor = Math.max(0.4, Math.min(1.0, 0.6 + surfaceDepth * 0.02));
          color = new THREE.Color(heightFactor * 0.7, heightFactor * 0.7, heightFactor * 0.7);
        } else if (isWater && isPolar) {
          // Polar water = ice
          color = new THREE.Color(lodColors.ice);
        } else if (isWater) {
          color = new THREE.Color(lodColors.water);
        } else if (surfaceDepth <= 0) {
          color = new THREE.Color(lodColors.rock);
        } else if (isPolar) {
          // Polar land = snow
          color = new THREE.Color(lodColors.snow);
        } else {
          color = new THREE.Color(lodColors.land);
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

        // Check if this LOD tile contains a torch
        // Calculate the angular radius of this tile (distance from center to vertex)
        // This ensures torch light only affects the single tile it's on
        const tileDir = tile.center.clone().normalize();
        const vertexDir = tile.vertices[0].clone().normalize();
        const tileAngularRadius = tileDir.angleTo(vertexDir);

        let hasTorch = false;
        for (const torch of this.torchData) {
          // Torch position is in local space (relative to planet center)
          const torchDir = new THREE.Vector3(torch.position.x, torch.position.y, torch.position.z).normalize();
          const angularDist = torchDir.angleTo(tileDir);
          // Torch must be within this tile's angular bounds (1 tile range only)
          if (angularDist < tileAngularRadius) {
            hasTorch = true;
            break;
          }
        }
        // Torch light values: center = full brightness (1.0), edges = dim (0.3)
        const centerTorchValue = hasTorch ? 1.0 : 0.0;
        const edgeTorchValue = hasTorch ? 0.3 : 0.0;

        // Fan triangulation from center
        const centerIdx = vertexOffset;
        positions.push(center.x, center.y, center.z);
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(centerUV.u, centerUV.v);
        colors.push(color.r, color.g, color.b);
        torchLightArray.push(centerTorchValue); // Full brightness at center
        vertexOffset++;

        for (let i = 0; i < vertices.length; i++) {
          positions.push(vertices[i].x, vertices[i].y, vertices[i].z);
          normals.push(normal.x, normal.y, normal.z);
          uvs.push(tileUVs[i].u, tileUVs[i].v);
          colors.push(color.r, color.g, color.b);
          torchLightArray.push(edgeTorchValue); // Dimmer at edges
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

              // Torch light for side walls (edge brightness)
              torchLightArray.push(edgeTorchValue);
              torchLightArray.push(edgeTorchValue);
              torchLightArray.push(edgeTorchValue);
              torchLightArray.push(edgeTorchValue);

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
      geometry.setAttribute('torchLight', new THREE.Float32BufferAttribute(torchLightArray, 1));
      geometry.setIndex(indices);

      // Create custom shader material for planet with day/night lighting
      // Torch lighting is vertex-baked (no realtime uniforms)
      const material = new THREE.ShaderMaterial({
        uniforms: {
          planetCenter: { value: this.center.clone() },
          sunDirection: { value: this.sunDirection.clone() }, // Uses stored sun direction
          ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
          directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
          darkSideAmbient: { value: PlayerConfig.PLANET_DARK_SIDE_AMBIENT }
        },
        vertexShader: planetVert,
        fragmentShader: planetFrag,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1
      });
      // Set default attribute value for torchLight to prevent undefined behavior
      (material.defaultAttributeValues as Record<string, unknown>)['torchLight'] = 0;

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(this.center);
      mesh.visible = false; // Start hidden
      mesh.renderOrder = -2; // Render behind everything else
      this.scene.add(mesh);
      this.distantLODMeshes.push(mesh);
      this.distantLODMaterials.push(material);
    }
  }

  // Create a fallback HIGH LOD mesh when terrain data isn't available yet
  // Uses same approach as distant LOD but with higher subdivision (2x distant LOD level 0)
  // This ensures smooth visual transition when descending from space
  private createFallbackHighLODMesh(): void {
    // Use subdivision that's 2x the highest detail distant LOD (which is baseSub - 2)
    // So fallback high LOD = baseSub - 1 (one level below full detail)
    const baseSub = this.polyhedron.subdivisions;
    const fallbackSub = Math.max(2, baseSub - 1);
    const fallbackPolyhedron = new GoldbergPolyhedron(this.radius, fallbackSub);

    // Create geometry similar to distant LOD
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const colors: number[] = [];
    const torchLightArray: number[] = [];
    const indices: number[] = [];
    let vertexOffset = 0;

    // Calculate tile radii and colors
    const tileDisplayRadii = new Map<number, { radius: number; isWater: boolean; color: THREE.Color }>();
    const SEA_LEVEL_DEPTH = this.getSeaLevelDepth();
    const waterRadius = this.depthToRadius(SEA_LEVEL_DEPTH);
    const isSingleTexturePlanet = !!this.config.texturePath;

    // Get LOD colors from config, falling back to defaults
    const lodColors: LodColorsConfig = {
      ...DEFAULT_LOD_COLORS,
      ...this.config.lodColors,
    };

    for (const tile of fallbackPolyhedron.tiles) {
      const surfaceDepth = this.getHeightVariation(tile.center);
      const terrainRadius = this.depthToRadius(surfaceDepth);
      const isWater = !isSingleTexturePlanet && surfaceDepth < SEA_LEVEL_DEPTH;
      const displayRadius = isWater ? waterRadius : terrainRadius;

      // Polar biome detection
      const normalizedY = tile.center.clone().normalize().y;
      const polarThreshold = PlayerConfig.POLAR_THRESHOLD;
      const isPolar = Math.abs(normalizedY) > polarThreshold;

      let color: THREE.Color;
      if (isSingleTexturePlanet) {
        const heightFactor = Math.max(0.4, Math.min(1.0, 0.6 + surfaceDepth * 0.02));
        color = new THREE.Color(heightFactor * 0.7, heightFactor * 0.7, heightFactor * 0.7);
      } else if (isWater && isPolar) {
        color = new THREE.Color(lodColors.ice);
      } else if (isWater) {
        color = new THREE.Color(lodColors.water);
      } else if (surfaceDepth <= 0) {
        color = new THREE.Color(lodColors.rock);
      } else if (isPolar) {
        color = new THREE.Color(lodColors.snow);
      } else {
        color = new THREE.Color(lodColors.land);
      }

      tileDisplayRadii.set(tile.index, { radius: displayRadius, isWater, color });
    }

    // Generate geometry for each tile
    for (const tile of fallbackPolyhedron.tiles) {
      const tileData = tileDisplayRadii.get(tile.index)!;
      const displayRadius = tileData.radius;
      const color = tileData.color;

      const center = tile.center.clone().normalize().multiplyScalar(displayRadius);
      const vertices = tile.vertices.map(v => v.clone().normalize().multiplyScalar(displayRadius));
      const normal = center.clone().normalize();

      // Compute UVs
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
        minU = Math.min(minU, u); maxU = Math.max(maxU, u);
        minV = Math.min(minV, v); maxV = Math.max(maxV, v);
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
      torchLightArray.push(0);
      vertexOffset++;

      for (let i = 0; i < vertices.length; i++) {
        positions.push(vertices[i].x, vertices[i].y, vertices[i].z);
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(tileUVs[i].u, tileUVs[i].v);
        colors.push(color.r, color.g, color.b);
        torchLightArray.push(0);
        vertexOffset++;

        indices.push(centerIdx, centerIdx + 1 + i, centerIdx + 1 + ((i + 1) % vertices.length));
      }

      // Generate side walls for edges where this tile is higher than neighbor
      // (Only for non-water tiles)
      if (!tileData.isWater) {
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
            const nTile = fallbackPolyhedron.tiles[nIdx];
            if (!nTile) continue;
            const dist = nTile.center.clone().normalize().distanceToSquared(edgeMidDir);
            if (dist < closestDist) {
              closestDist = dist;
              neighborData = nData;
            }
          }

          // Only create wall if neighbor is lower than this tile
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

            uvs.push(0, 0, 1, 0, 1, 1, 0, 1);

            colors.push(sideColor.r, sideColor.g, sideColor.b);
            colors.push(sideColor.r, sideColor.g, sideColor.b);
            colors.push(sideColor.r, sideColor.g, sideColor.b);
            colors.push(sideColor.r, sideColor.g, sideColor.b);

            torchLightArray.push(0, 0, 0, 0);

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
    geometry.setAttribute('torchLight', new THREE.Float32BufferAttribute(torchLightArray, 1));
    geometry.setIndex(indices);

    // Create material matching distant LOD exactly - same shaders, uniforms, and settings
    const material = new THREE.ShaderMaterial({
      uniforms: {
        planetCenter: { value: this.center.clone() },
        sunDirection: { value: this.sunDirection.clone() }, // Use actual sun direction
        ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
        directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
        darkSideAmbient: { value: PlayerConfig.PLANET_DARK_SIDE_AMBIENT }
      },
      vertexShader: planetVert,
      fragmentShader: planetFrag,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1
    });
    // Set default attribute value for torchLight to prevent undefined behavior
    (material.defaultAttributeValues as Record<string, unknown>)['torchLight'] = 0;

    // Create mesh and add to group
    const mesh = new THREE.Mesh(geometry, material);
    mesh.renderOrder = -1;

    const lodGroup = new THREE.Group();
    lodGroup.add(mesh);
    lodGroup.position.copy(this.center);
    this.scene.add(lodGroup);

    // Clean up old lodMesh if it exists
    if (this.lodMesh) {
      this.scene.remove(this.lodMesh);
      this.lodMesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }

    this.lodMesh = lodGroup;
    console.log(`[${this.config.name}] Created fallback HIGH LOD mesh (subdivision ${fallbackSub})`);
  }

  private rebuildLODMesh(): void {
    // If no terrain data available yet, create fallback HIGH LOD using noise
    if (this.columns.size === 0) {
      this.createFallbackHighLODMesh();
      return;
    }

    // If lodMesh doesn't exist yet, create fallback first so there's always something visible
    // The proper LOD mesh will replace it when the worker completes
    if (!this.lodMesh || this.lodMesh.children.length === 0) {
      this.createFallbackHighLODMesh();
    }

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
    const lodOffset = PlayerConfig.TERRAIN_LOD_OFFSET;
    const waterRadius = this.depthToRadius(this.getSeaLevelDepth()) - lodOffset;

    // Per-chunk geometry buffers
    interface ChunkGeometry {
      grassPositions: number[]; grassNormals: number[]; grassUvs: number[]; grassSkyLight: number[]; grassTorchLight: number[]; grassIndices: number[]; grassVertexOffset: number;
      dirtPositions: number[]; dirtNormals: number[]; dirtUvs: number[]; dirtSkyLight: number[]; dirtTorchLight: number[]; dirtIndices: number[]; dirtVertexOffset: number;
      stonePositions: number[]; stoneNormals: number[]; stoneUvs: number[]; stoneSkyLight: number[]; stoneTorchLight: number[]; stoneIndices: number[]; stoneVertexOffset: number;
      sandPositions: number[]; sandNormals: number[]; sandUvs: number[]; sandSkyLight: number[]; sandTorchLight: number[]; sandIndices: number[]; sandVertexOffset: number;
      woodPositions: number[]; woodNormals: number[]; woodUvs: number[]; woodSkyLight: number[]; woodTorchLight: number[]; woodIndices: number[]; woodVertexOffset: number;
      waterPositions: number[]; waterNormals: number[]; waterUvs: number[]; waterIndices: number[]; waterVertexOffset: number;
      sidePositions: number[]; sideNormals: number[]; sideUvs: number[]; sideSkyLight: number[]; sideTorchLight: number[]; sideIndices: number[]; sideVertexOffset: number;
      waterSidePositions: number[]; waterSideNormals: number[]; waterSideUvs: number[]; waterSideIndices: number[]; waterSideVertexOffset: number;
      // Snow biome
      snowPositions: number[]; snowNormals: number[]; snowUvs: number[]; snowSkyLight: number[]; snowTorchLight: number[]; snowIndices: number[]; snowVertexOffset: number;
      icePositions: number[]; iceNormals: number[]; iceUvs: number[]; iceSkyLight: number[]; iceTorchLight: number[]; iceIndices: number[]; iceVertexOffset: number;
      // Moon terrain
      moonRockPositions: number[]; moonRockNormals: number[]; moonRockUvs: number[]; moonRockSkyLight: number[]; moonRockTorchLight: number[]; moonRockIndices: number[]; moonRockVertexOffset: number;
      // Moon terrain side walls
      moonRockSidePositions: number[]; moonRockSideNormals: number[]; moonRockSideUvs: number[]; moonRockSideSkyLight: number[]; moonRockSideTorchLight: number[]; moonRockSideIndices: number[]; moonRockSideVertexOffset: number;
    }

    const chunkGeometries: ChunkGeometry[] = [];
    for (let i = 0; i < this.LOD_CHUNK_COUNT; i++) {
      chunkGeometries.push({
        grassPositions: [], grassNormals: [], grassUvs: [], grassSkyLight: [], grassTorchLight: [], grassIndices: [], grassVertexOffset: 0,
        dirtPositions: [], dirtNormals: [], dirtUvs: [], dirtSkyLight: [], dirtTorchLight: [], dirtIndices: [], dirtVertexOffset: 0,
        stonePositions: [], stoneNormals: [], stoneUvs: [], stoneSkyLight: [], stoneTorchLight: [], stoneIndices: [], stoneVertexOffset: 0,
        sandPositions: [], sandNormals: [], sandUvs: [], sandSkyLight: [], sandTorchLight: [], sandIndices: [], sandVertexOffset: 0,
        woodPositions: [], woodNormals: [], woodUvs: [], woodSkyLight: [], woodTorchLight: [], woodIndices: [], woodVertexOffset: 0,
        waterPositions: [], waterNormals: [], waterUvs: [], waterIndices: [], waterVertexOffset: 0,
        sidePositions: [], sideNormals: [], sideUvs: [], sideSkyLight: [], sideTorchLight: [], sideIndices: [], sideVertexOffset: 0,
        waterSidePositions: [], waterSideNormals: [], waterSideUvs: [], waterSideIndices: [], waterSideVertexOffset: 0,
        // Snow biome
        snowPositions: [], snowNormals: [], snowUvs: [], snowSkyLight: [], snowTorchLight: [], snowIndices: [], snowVertexOffset: 0,
        icePositions: [], iceNormals: [], iceUvs: [], iceSkyLight: [], iceTorchLight: [], iceIndices: [], iceVertexOffset: 0,
        // Moon terrain
        moonRockPositions: [], moonRockNormals: [], moonRockUvs: [], moonRockSkyLight: [], moonRockTorchLight: [], moonRockIndices: [], moonRockVertexOffset: 0,
        // Moon terrain side walls
        moonRockSidePositions: [], moonRockSideNormals: [], moonRockSideUvs: [], moonRockSideSkyLight: [], moonRockSideTorchLight: [], moonRockSideIndices: [], moonRockSideVertexOffset: 0
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
      let positions: number[], normals: number[], uvs: number[], skyLight: number[] | null, torchLight: number[] | null, indices: number[];
      let vertexOffset: number;

      if (surfaceBlockType === HexBlockType.WATER) {
        positions = chunk.waterPositions;
        normals = chunk.waterNormals;
        uvs = chunk.waterUvs;
        skyLight = null; // Water uses different shader
        torchLight = null;
        indices = chunk.waterIndices;
        vertexOffset = chunk.waterVertexOffset;
      } else if (surfaceBlockType === HexBlockType.DIRT) {
        positions = chunk.dirtPositions;
        normals = chunk.dirtNormals;
        uvs = chunk.dirtUvs;
        skyLight = chunk.dirtSkyLight;
        torchLight = chunk.dirtTorchLight;
        indices = chunk.dirtIndices;
        vertexOffset = chunk.dirtVertexOffset;
      } else if (surfaceBlockType === HexBlockType.STONE) {
        positions = chunk.stonePositions;
        normals = chunk.stoneNormals;
        uvs = chunk.stoneUvs;
        skyLight = chunk.stoneSkyLight;
        torchLight = chunk.stoneTorchLight;
        indices = chunk.stoneIndices;
        vertexOffset = chunk.stoneVertexOffset;
      } else if (surfaceBlockType === HexBlockType.SAND) {
        positions = chunk.sandPositions;
        normals = chunk.sandNormals;
        uvs = chunk.sandUvs;
        skyLight = chunk.sandSkyLight;
        torchLight = chunk.sandTorchLight;
        indices = chunk.sandIndices;
        vertexOffset = chunk.sandVertexOffset;
      } else if (surfaceBlockType === HexBlockType.WOOD) {
        positions = chunk.woodPositions;
        normals = chunk.woodNormals;
        uvs = chunk.woodUvs;
        skyLight = chunk.woodSkyLight;
        torchLight = chunk.woodTorchLight;
        indices = chunk.woodIndices;
        vertexOffset = chunk.woodVertexOffset;
      } else if (surfaceBlockType === HexBlockType.SNOW || surfaceBlockType === HexBlockType.DIRT_SNOW) {
        // Snow biome uses snow buffer
        positions = chunk.snowPositions;
        normals = chunk.snowNormals;
        uvs = chunk.snowUvs;
        skyLight = chunk.snowSkyLight;
        torchLight = chunk.snowTorchLight;
        indices = chunk.snowIndices;
        vertexOffset = chunk.snowVertexOffset;
      } else if (surfaceBlockType === HexBlockType.ICE || surfaceBlockType === HexBlockType.GLASS) {
        // Ice/Glass uses ice buffer (transparent)
        positions = chunk.icePositions;
        normals = chunk.iceNormals;
        uvs = chunk.iceUvs;
        skyLight = chunk.iceSkyLight;
        torchLight = chunk.iceTorchLight;
        indices = chunk.iceIndices;
        vertexOffset = chunk.iceVertexOffset;
      } else if (surfaceBlockType === HexBlockType.MOON_ROCK) {
        // Moon terrain uses moon rock buffer
        positions = chunk.moonRockPositions;
        normals = chunk.moonRockNormals;
        uvs = chunk.moonRockUvs;
        skyLight = chunk.moonRockSkyLight;
        torchLight = chunk.moonRockTorchLight;
        indices = chunk.moonRockIndices;
        vertexOffset = chunk.moonRockVertexOffset;
      } else {
        // GRASS, LEAVES, or any other type defaults to grass
        positions = chunk.grassPositions;
        normals = chunk.grassNormals;
        uvs = chunk.grassUvs;
        skyLight = chunk.grassSkyLight;
        torchLight = chunk.grassTorchLight;
        indices = chunk.grassIndices;
        vertexOffset = chunk.grassVertexOffset;
      }

      // Check if this tile has a torch (1 per tile, single tile range for LOD)
      const hasTorch = this.tilesWithTorches.has(tileIndex);
      const torchValue = hasTorch ? 1.0 : 0.0;

      // Fan triangulation from center using pre-computed UVs
      const centerIdx = vertexOffset;
      positions.push(center.x, center.y, center.z);
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(normalizedData.centerUV.u, normalizedData.centerUV.v);
      if (skyLight) skyLight.push(1.0); // LOD is at surface, full sky exposure
      if (torchLight) torchLight.push(torchValue);
      vertexOffset++;

      for (let i = 0; i < vertices.length; i++) {
        positions.push(vertices[i].x, vertices[i].y, vertices[i].z);
        normals.push(normal.x, normal.y, normal.z);
        uvs.push(normalizedData.normalizedUVs[i].u, normalizedData.normalizedUVs[i].v);
        if (skyLight) skyLight.push(1.0);
        if (torchLight) torchLight.push(torchValue);
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
      } else if (surfaceBlockType === HexBlockType.SNOW || surfaceBlockType === HexBlockType.DIRT_SNOW) {
        chunk.snowVertexOffset = vertexOffset;
      } else if (surfaceBlockType === HexBlockType.ICE || surfaceBlockType === HexBlockType.GLASS) {
        chunk.iceVertexOffset = vertexOffset;
      } else if (surfaceBlockType === HexBlockType.MOON_ROCK) {
        chunk.moonRockVertexOffset = vertexOffset;
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
      const thisIsMoonRock = thisTileData?.surfaceBlockType === HexBlockType.MOON_ROCK;
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

        // Select appropriate buffer based on tile type (per-chunk)
        let positions: number[];
        let normals: number[];
        let uvs: number[];
        let sideLight: number[] | null;
        let sideTorchLight: number[] | null;
        let indices: number[];
        let baseIdx: number;

        if (thisIsWater) {
          positions = chunk.waterSidePositions;
          normals = chunk.waterSideNormals;
          uvs = chunk.waterSideUvs;
          sideLight = null;
          sideTorchLight = null;
          indices = chunk.waterSideIndices;
          baseIdx = chunk.waterSideVertexOffset;
        } else if (thisIsMoonRock) {
          positions = chunk.moonRockSidePositions;
          normals = chunk.moonRockSideNormals;
          uvs = chunk.moonRockSideUvs;
          sideLight = chunk.moonRockSideSkyLight;
          sideTorchLight = chunk.moonRockSideTorchLight;
          indices = chunk.moonRockSideIndices;
          baseIdx = chunk.moonRockSideVertexOffset;
        } else {
          positions = chunk.sidePositions;
          normals = chunk.sideNormals;
          uvs = chunk.sideUvs;
          sideLight = chunk.sideSkyLight;
          sideTorchLight = chunk.sideTorchLight;
          indices = chunk.sideIndices;
          baseIdx = chunk.sideVertexOffset;
        }

        // Check if this tile has a torch (for side walls)
        const sideTorchValue = this.tilesWithTorches.has(tileIndex) ? 1.0 : 0.0;

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
        // Torch light for terrain shader (1 per tile, single tile range)
        if (sideTorchLight) sideTorchLight.push(sideTorchValue, sideTorchValue, sideTorchValue, sideTorchValue);

        // Same winding as HexBlock: (0,1,2), (0,2,3)
        indices.push(baseIdx, baseIdx + 1, baseIdx + 2, baseIdx, baseIdx + 2, baseIdx + 3);

        if (thisIsWater) {
          chunk.waterSideVertexOffset += 4;
        } else if (thisIsMoonRock) {
          chunk.moonRockSideVertexOffset += 4;
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
      const createLODGeom = (positions: number[], normals: number[], uvs: number[], indices: number[], skyLight?: number[], torchLightData?: number[]): THREE.BufferGeometry => {
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
        geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        if (skyLight && skyLight.length > 0) {
          geom.setAttribute('skyLight', new THREE.Float32BufferAttribute(skyLight, 1));
        }
        // Use provided torch light data (1 per tile, single tile range) or default to 0
        if (torchLightData && torchLightData.length > 0) {
          geom.setAttribute('torchLight', new THREE.Float32BufferAttribute(torchLightData, 1));
        } else {
          const vertexCount = positions.length / 3;
          geom.setAttribute('torchLight', new THREE.Float32BufferAttribute(new Float32Array(vertexCount).fill(0), 1));
        }
        geom.setIndex(indices);
        return geom;
      };

      // Grass mesh (uses terrain shader with skyLight and torchLight)
      if (chunk.grassPositions.length > 0) {
        const geom = createLODGeom(chunk.grassPositions, chunk.grassNormals, chunk.grassUvs, chunk.grassIndices, chunk.grassSkyLight, chunk.grassTorchLight);
        const mesh = new THREE.Mesh(geom, this.meshBuilder.getTopLODMaterial());
        chunkGroup.add(mesh);
      }

      // Dirt mesh (uses terrain shader with skyLight and torchLight)
      if (chunk.dirtPositions.length > 0) {
        const geom = createLODGeom(chunk.dirtPositions, chunk.dirtNormals, chunk.dirtUvs, chunk.dirtIndices, chunk.dirtSkyLight, chunk.dirtTorchLight);
        const mesh = new THREE.Mesh(geom, this.meshBuilder.getSideLODMaterial());
        chunkGroup.add(mesh);
      }

      // Stone mesh (uses stone LOD material with torchLight)
      if (chunk.stonePositions.length > 0) {
        const geom = createLODGeom(chunk.stonePositions, chunk.stoneNormals, chunk.stoneUvs, chunk.stoneIndices, chunk.stoneSkyLight, chunk.stoneTorchLight);
        const mesh = new THREE.Mesh(geom, this.meshBuilder.getStoneLODMaterial());
        chunkGroup.add(mesh);
      }

      // Sand mesh (uses sand LOD material with torchLight)
      if (chunk.sandPositions.length > 0) {
        const geom = createLODGeom(chunk.sandPositions, chunk.sandNormals, chunk.sandUvs, chunk.sandIndices, chunk.sandSkyLight, chunk.sandTorchLight);
        const mesh = new THREE.Mesh(geom, this.meshBuilder.getSandLODMaterial());
        chunkGroup.add(mesh);
      }

      // Wood mesh (uses wood LOD material with torchLight)
      if (chunk.woodPositions.length > 0) {
        const geom = createLODGeom(chunk.woodPositions, chunk.woodNormals, chunk.woodUvs, chunk.woodIndices, chunk.woodSkyLight, chunk.woodTorchLight);
        const mesh = new THREE.Mesh(geom, this.meshBuilder.getWoodLODMaterial());
        chunkGroup.add(mesh);
      }

      // Snow mesh (uses opaque snow LOD material with torchLight)
      if (chunk.snowPositions.length > 0) {
        const geom = createLODGeom(chunk.snowPositions, chunk.snowNormals, chunk.snowUvs, chunk.snowIndices, chunk.snowSkyLight, chunk.snowTorchLight);
        const mesh = new THREE.Mesh(geom, this.meshBuilder.getSnowLODMaterial());
        chunkGroup.add(mesh);
      }

      // Ice mesh (uses opaque ice LOD material - no transparency for distant LOD)
      if (chunk.icePositions.length > 0) {
        const geom = createLODGeom(chunk.icePositions, chunk.iceNormals, chunk.iceUvs, chunk.iceIndices, chunk.iceSkyLight, chunk.iceTorchLight);
        const mesh = new THREE.Mesh(geom, this.meshBuilder.getIceLODMaterial());
        chunkGroup.add(mesh);
      }

      // Moon rock mesh (uses moon rock LOD material)
      if (chunk.moonRockPositions.length > 0) {
        const geom = createLODGeom(chunk.moonRockPositions, chunk.moonRockNormals, chunk.moonRockUvs, chunk.moonRockIndices, chunk.moonRockSkyLight, chunk.moonRockTorchLight);
        const mesh = new THREE.Mesh(geom, this.meshBuilder.getMoonRockLODMaterial());
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

      // Side walls mesh (uses terrain shader with skyLight and torchLight)
      if (chunk.sidePositions.length > 0) {
        const geom = createLODGeom(chunk.sidePositions, chunk.sideNormals, chunk.sideUvs, chunk.sideIndices, chunk.sideSkyLight, chunk.sideTorchLight);
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

      // Moon rock side walls mesh (uses moon rock LOD material)
      if (chunk.moonRockSidePositions.length > 0) {
        const geom = createLODGeom(chunk.moonRockSidePositions, chunk.moonRockSideNormals, chunk.moonRockSideUvs, chunk.moonRockSideIndices, chunk.moonRockSideSkyLight, chunk.moonRockSideTorchLight);
        const mesh = new THREE.Mesh(geom, this.meshBuilder.getMoonRockLODMaterial());
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
    profiler.end('Planet.rebuildLODMesh');
  }

  /**
   * Build intermediate LOD mesh - simplified terrain between chunked LOD and detailed terrain.
   * Uses stepped height sampling (every Nth block) for reduced geometry while maintaining
   * terrain silhouette visibility at medium distances.
   */
  private buildIntermediateLOD(): void {
    if (this.isIntermediateLODWorkerActive || this.isIntermediateLODBuilt) {
      return;
    }

    this.isIntermediateLODWorkerActive = true;
    console.log(`[Intermediate LOD] Building for ${this.config.name || 'planet'}...`);

    // For now, create a simple stepped version of the terrain
    // This samples height at lower resolution to create a simplified mesh
    const blockStep = PlayerConfig.TERRAIN_INTERMEDIATE_BLOCK_STEP;
    const wallThreshold = PlayerConfig.TERRAIN_INTERMEDIATE_WALL_THRESHOLD;

    // Create a group to hold intermediate LOD meshes
    const intermediateGroup = new THREE.Group();
    intermediateGroup.name = 'intermediateLOD';

    // Build geometry per chunk for better culling
    const materials = this.getMaterials();

    // Collect geometry data per material type
    const geometryData: Map<string, {
      positions: number[];
      normals: number[];
      uvs: number[];
      indices: number[];
    }> = new Map();

    // Initialize geometry arrays for each material (including water)
    for (const matName of ['grass', 'dirt', 'stone', 'sand', 'snow', 'moonRock', 'water']) {
      geometryData.set(matName, {
        positions: [],
        normals: [],
        uvs: [],
        indices: []
      });
    }

    // Get sea level for water detection
    const SEA_LEVEL_DEPTH = this.getSeaLevelDepth();
    const waterRadius = this.depthToRadius(SEA_LEVEL_DEPTH);
    const hasWater = this.config.hasWater !== false && !this.config.texturePath;

    // Process tiles in chunks
    for (const tile of this.polyhedron.tiles) {
      const column = this.columns.get(tile.index);
      if (!column) continue;
      const blocks = column.blocks;

      // Get surface height by sampling at step intervals
      let maxSurfaceHeight = 0;
      for (let depth = this.MAX_DEPTH - 1; depth >= 0; depth -= blockStep) {
        const block = blocks[Math.min(depth, this.MAX_DEPTH - 1)];
        if (block !== HexBlockType.AIR && block !== HexBlockType.WATER) {
          maxSurfaceHeight = depth;
          break;
        }
      }

      // Determine if this tile is underwater
      const isUnderwater = hasWater && maxSurfaceHeight < SEA_LEVEL_DEPTH;

      // Get the surface block type
      const surfaceBlock = blocks[maxSurfaceHeight] || HexBlockType.STONE;
      const matName = isUnderwater ? 'water' : this.getBlockMaterialName(surfaceBlock);
      const data = geometryData.get(matName);
      if (!data) continue;

      // Create a single top face for this tile at the sampled height
      // Use depthToRadius for consistent height calculation with distant LOD
      // For underwater tiles, use water surface level (same as distant LOD)
      const surfaceRadius = isUnderwater ? waterRadius : this.depthToRadius(maxSurfaceHeight);

      // Build simplified top face
      const tileCenter = tile.center.clone().normalize().multiplyScalar(surfaceRadius);
      const tileNormal = tile.center.clone().normalize();

      const baseIndex = data.positions.length / 3;

      // Create hex vertices for top face
      for (let i = 0; i < tile.vertices.length; i++) {
        const vertex = tile.vertices[i].clone().normalize().multiplyScalar(surfaceRadius);
        data.positions.push(vertex.x, vertex.y, vertex.z);
        data.normals.push(tileNormal.x, tileNormal.y, tileNormal.z);
        data.uvs.push(0.5 + (vertex.x - tileCenter.x) * 0.1, 0.5 + (vertex.z - tileCenter.z) * 0.1);
      }

      // Add center vertex
      data.positions.push(tileCenter.x, tileCenter.y, tileCenter.z);
      data.normals.push(tileNormal.x, tileNormal.y, tileNormal.z);
      data.uvs.push(0.5, 0.5);

      const centerIndex = baseIndex + tile.vertices.length;

      // Create triangles (fan from center)
      for (let i = 0; i < tile.vertices.length; i++) {
        const nextI = (i + 1) % tile.vertices.length;
        data.indices.push(centerIndex, baseIndex + i, baseIndex + nextI);
      }

      // Add walls for significant height differences with neighbors
      // Iterate through edges (like main LOD does) and find neighbor across each edge
      const numSides = tile.vertices.length;
      for (let i = 0; i < numSides; i++) {
        const next = (i + 1) % numSides;
        const v1 = tile.vertices[i].clone().normalize();
        const v2 = tile.vertices[next].clone().normalize();

        // Find neighbor across this edge by checking which neighbor is closest to edge midpoint
        const edgeMidDir = v1.clone().add(v2).normalize();
        let closestNeighborIndex: number | undefined;
        let closestDist = Infinity;

        for (const nIdx of tile.neighbors) {
          const neighborTile = this.polyhedron.tiles[nIdx];
          if (!neighborTile) continue;
          const neighborDir = neighborTile.center.clone().normalize();
          const dist = edgeMidDir.distanceToSquared(neighborDir);
          if (dist < closestDist) {
            closestDist = dist;
            closestNeighborIndex = nIdx;
          }
        }

        if (closestNeighborIndex === undefined) continue;

        const neighborColumn = this.columns.get(closestNeighborIndex);
        if (!neighborColumn) continue;
        const neighborBlocks = neighborColumn.blocks;

        // Get neighbor surface height
        let neighborSurfaceHeight = 0;
        for (let depth = this.MAX_DEPTH - 1; depth >= 0; depth -= blockStep) {
          const block = neighborBlocks[Math.min(depth, this.MAX_DEPTH - 1)];
          if (block !== HexBlockType.AIR && block !== HexBlockType.WATER) {
            neighborSurfaceHeight = depth;
            break;
          }
        }

        const heightDiff = maxSurfaceHeight - neighborSurfaceHeight;
        if (heightDiff >= wallThreshold) {
          const topHeight = surfaceRadius;
          const bottomHeight = this.depthToRadius(neighborSurfaceHeight);

          const wallBaseIndex = data.positions.length / 3;

          // Wall quad vertices - same order as main LOD:
          // innerV1, innerV2, outerV2, outerV1 (neighbor radius, then this tile radius)
          const innerV1 = v1.clone().multiplyScalar(bottomHeight);
          const innerV2 = v2.clone().multiplyScalar(bottomHeight);
          const outerV2 = v2.clone().multiplyScalar(topHeight);
          const outerV1 = v1.clone().multiplyScalar(topHeight);

          data.positions.push(
            innerV1.x, innerV1.y, innerV1.z,
            innerV2.x, innerV2.y, innerV2.z,
            outerV2.x, outerV2.y, outerV2.z,
            outerV1.x, outerV1.y, outerV1.z
          );

          // Calculate side normal using cross product of quad edges (same as main LOD)
          const e1 = innerV2.clone().sub(innerV1); // horizontal edge
          const e2 = outerV1.clone().sub(innerV1); // vertical edge
          const wallNormal = e1.clone().cross(e2).normalize();

          for (let k = 0; k < 4; k++) {
            data.normals.push(wallNormal.x, wallNormal.y, wallNormal.z);
          }

          const wallHeight = (topHeight - bottomHeight) / this.BLOCK_HEIGHT;
          data.uvs.push(0, 0, 1, 0, 1, wallHeight, 0, wallHeight);

          // Two triangles for quad - same winding as HexBlock: (0,1,2), (0,2,3)
          data.indices.push(
            wallBaseIndex, wallBaseIndex + 1, wallBaseIndex + 2,
            wallBaseIndex, wallBaseIndex + 2, wallBaseIndex + 3
          );
        }
      }
    }

    // Create meshes from collected geometry
    for (const [matName, data] of geometryData.entries()) {
      if (data.indices.length === 0) continue;

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
      geometry.setIndex(data.indices);

      const material = materials.get(matName);
      if (material) {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.name = `intermediateLOD_${matName}`;
        mesh.frustumCulled = false; // Handle culling manually
        intermediateGroup.add(mesh);
      }
    }

    // Position at planet center and add to scene
    intermediateGroup.position.copy(this.center);
    intermediateGroup.visible = false; // Start hidden, visibility controlled by updatePlayerPosition
    this.scene.add(intermediateGroup);
    this.intermediateLODMesh = intermediateGroup;
    this.isIntermediateLODBuilt = true;
    this.isIntermediateLODWorkerActive = false;

    console.log(`[Intermediate LOD] Built ${intermediateGroup.children.length} meshes for ${this.config.name || 'planet'}`);
  }

  /**
   * Get material name for a block type (for intermediate LOD)
   */
  private getBlockMaterialName(block: HexBlockType): string {
    switch (block) {
      case HexBlockType.GRASS:
        return 'grass';
      case HexBlockType.DIRT:
        return 'dirt';
      case HexBlockType.STONE:
        return 'stone';
      case HexBlockType.SAND:
        return 'sand';
      case HexBlockType.SNOW:
        return 'snow';
      case HexBlockType.MOON_ROCK:
        return 'moonRock';
      default:
        return 'stone';
    }
  }

  /**
   * Create a planet shader material with a base color
   * Uses the same shader as terrain for consistent lighting across LOD levels
   */
  private createPlanetShaderMaterial(color: THREE.Color): THREE.ShaderMaterial {
    const material = new THREE.ShaderMaterial({
      uniforms: {
        planetCenter: { value: this.center.clone() },
        sunDirection: { value: this.sunDirection.clone() },
        ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
        directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
        darkSideAmbient: { value: PlayerConfig.PLANET_DARK_SIDE_AMBIENT },
        baseColor: { value: color }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying vec3 vColor;
        uniform vec3 baseColor;

        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          vColor = baseColor;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 planetCenter;
        uniform vec3 sunDirection;
        uniform float ambientIntensity;
        uniform float directionalIntensity;
        uniform float darkSideAmbient;

        varying vec3 vNormal;
        varying vec3 vWorldPosition;
        varying vec3 vColor;

        void main() {
          // Calculate direction from planet center to fragment
          vec3 toFragment = normalize(vWorldPosition - planetCenter);

          // Day/night based on sun direction relative to planet surface
          float sunDot = dot(toFragment, sunDirection);
          float dayFactor = smoothstep(-0.2, 0.3, sunDot);

          // Lighting calculation
          float diffuse = max(0.0, dot(vNormal, sunDirection));
          float directional = diffuse * directionalIntensity * dayFactor;
          float ambient = mix(darkSideAmbient, ambientIntensity, dayFactor);

          vec3 finalColor = vColor * (ambient + directional);
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });
    return material;
  }

  /**
   * Get all terrain materials (for intermediate LOD mesh creation)
   * Uses planet's lodColors config for consistent appearance
   * Uses planet shader for consistent lighting across LOD levels
   */
  private getMaterials(): Map<string, THREE.Material> {
    const materials = new Map<string, THREE.Material>();

    // Use planet's lodColors config (same as distant LOD)
    const lodColors: LodColorsConfig = {
      ...DEFAULT_LOD_COLORS,
      ...this.config.lodColors,
    };

    // Create materials using the planet's color palette with planet shader
    materials.set('grass', this.createPlanetShaderMaterial(new THREE.Color(lodColors.land)));
    materials.set('dirt', this.createPlanetShaderMaterial(new THREE.Color(lodColors.land).multiplyScalar(0.7)));
    materials.set('stone', this.createPlanetShaderMaterial(new THREE.Color(lodColors.rock)));
    materials.set('sand', this.createPlanetShaderMaterial(new THREE.Color(lodColors.land).lerp(new THREE.Color(0xc2b280), 0.5)));
    materials.set('snow', this.createPlanetShaderMaterial(new THREE.Color(lodColors.snow)));
    materials.set('moonRock', this.createPlanetShaderMaterial(new THREE.Color(lodColors.rock)));
    materials.set('water', this.createPlanetShaderMaterial(new THREE.Color(lodColors.water)));

    return materials;
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
    // Single-texture planets (like Moon) use MOON_ROCK for all native terrain
    const isSingleTexturePlanet = !!this.config.texturePath;

    for (const tile of this.polyhedron.tiles) {
      const blocks: HexBlockType[] = [];
      const surfaceDepth = heightMap.get(tile.index) ?? SEA_LEVEL_DEPTH;
      const isBeach = beachTiles.has(tile.index);

      // Polar biome detection based on latitude (y-component of normalized position)
      // y close to 1 = north pole, y close to -1 = south pole
      // Only Earth-like planets have polar ice caps (not single-texture planets like Moon)
      const normalizedY = tile.center.clone().normalize().y;
      const polarThreshold = PlayerConfig.POLAR_THRESHOLD;
      const isPolar = !this.config.texturePath && Math.abs(normalizedY) > polarThreshold;
      const isUnderwater = hasWater && surfaceDepth < SEA_LEVEL_DEPTH;

      for (let depth = 0; depth < this.MAX_DEPTH; depth++) {
        if (depth > surfaceDepth) {
          // Above surface = air
          blocks.push(HexBlockType.AIR);
        } else if (isSingleTexturePlanet) {
          // Single-texture planet (Moon): all solid blocks are MOON_ROCK
          blocks.push(HexBlockType.MOON_ROCK);
        } else if (depth === surfaceDepth) {
          // Surface block - similar rules to grass (only on exposed surface)
          if (isBeach && !isPolar) {
            // Beach tile (land next to water) - sand surface (but not in polar regions)
            blocks.push(HexBlockType.SAND);
          } else if (isUnderwater) {
            // Underwater surface - always use dirt (even in polar regions)
            blocks.push(HexBlockType.DIRT);
          } else if (isPolar) {
            // Polar surface (above water) - snow (like grass, only on top exposed block)
            blocks.push(HexBlockType.SNOW);
          } else {
            blocks.push(HexBlockType.GRASS);
          }
        } else if (depth > surfaceDepth - 3) {
          // Subsurface layers (just below surface) - always dirt (dirt_snow only when exposed)
          if (isBeach && !isPolar) {
            blocks.push(HexBlockType.SAND);
          } else {
            // Use regular dirt for subsurface (dirt_snow only appears when top block is removed)
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
    // Only fill CONTINUOUS air from sky down to sea level - don't fill enclosed caves
    // Depth system: 0 = bedrock, MAX_DEPTH-1 = sky
    // In polar regions, surface water becomes ice with water below (only for Earth-like planets)
    const SEA_LEVEL_DEPTH = this.MAX_DEPTH - 1 - this.SEA_LEVEL;
    const polarThreshold = PlayerConfig.POLAR_THRESHOLD;
    const hasPolarIce = !this.config.texturePath; // Only Earth-like planets have polar ice

    for (const [_, column] of this.columns) {
      // Check if this column is in polar region (only for planets with polar biomes)
      const normalizedY = column.tile.center.clone().normalize().y;
      const isPolar = hasPolarIce && Math.abs(normalizedY) > polarThreshold;

      // Track if we've placed the ice surface layer yet (for polar regions)
      let iceSurfacePlaced = false;

      // Scan from sky (top) downward, filling air with water until we hit solid or reach sea level
      // This ensures we only fill open ocean, not enclosed caves
      for (let d = column.blocks.length - 1; d >= 0; d--) {
        const block = column.blocks[d];

        if (block === HexBlockType.AIR) {
          // Air block - fill with water if at or below sea level
          if (d <= SEA_LEVEL_DEPTH) {
            if (isPolar && !iceSurfacePlaced && d === SEA_LEVEL_DEPTH) {
              // Polar region: place ice at the water surface
              column.blocks[d] = HexBlockType.ICE;
              iceSurfacePlaced = true;
            } else {
              // Normal water below ice (or non-polar region)
              column.blocks[d] = HexBlockType.WATER;
            }
            column.isDirty = true;
          }
          // Continue scanning downward (air doesn't stop the scan)
        } else {
          // Hit solid block - stop filling this column
          // Any air below this is a cave, not open ocean
          break;
        }
      }
    }

    // After filling oceans, cascade water down through air in each column
    this.cascadeWaterInColumns();
  }

  // For each column, if there's water above air, the air should become water
  // This handles underwater caves where water should flow down through air pockets
  private cascadeWaterInColumns(): void {
    let waterFilledCount = 0;

    for (const [_, column] of this.columns) {
      // Scan from top to bottom - if we see water, any air below should become water
      // until we hit solid ground
      let waterAbove = false;

      for (let d = column.blocks.length - 1; d >= 0; d--) {
        const block = column.blocks[d];

        if (block === HexBlockType.WATER) {
          waterAbove = true;
        } else if (block === HexBlockType.AIR) {
          if (waterAbove) {
            // Air below water - fill with water
            column.blocks[d] = HexBlockType.WATER;
            column.isDirty = true;
            waterFilledCount++;
          }
          // Air doesn't stop water flow, continue checking below
        } else {
          // Hit solid block - reset waterAbove since water can't flow through solid
          waterAbove = false;
        }
      }
    }

    if (waterFilledCount > 0) {
      console.log(`[Water cascade] Filled ${waterFilledCount} air blocks below water in columns`);
    }
  }

  // Periodic water update - fixes water flow issues in nearby tiles
  // Call this every few seconds to ensure water properly cascades
  // Also removes trapped water (water between solid blocks with no sky access)
  public updateWaterFlow(nearbyTiles: Set<number>): number {
    let waterChangedCount = 0;

    for (const tileIndex of nearbyTiles) {
      const column = this.columns.get(tileIndex);
      if (!column) continue;

      // Two-pass algorithm:
      // Pass 1: Scan from top to find sky access and remove trapped water
      // Pass 2: Cascade water down through air below valid water

      // Pass 1: Remove trapped water (water below solid blocks with no sky access)
      let hasSkyAccess = true; // Start with sky access from the top

      for (let d = column.blocks.length - 1; d >= 0; d--) {
        const block = column.blocks[d];

        if (block === HexBlockType.WATER) {
          if (!hasSkyAccess) {
            // Trapped water - no connection to sky, remove it
            column.blocks[d] = HexBlockType.AIR;
            column.isDirty = true;
            waterChangedCount++;
          }
          // Water doesn't block sky access for blocks below (water is transparent)
        } else if (block === HexBlockType.AIR) {
          // Air doesn't affect sky access, continue
        } else {
          // Hit solid block - blocks below no longer have sky access
          hasSkyAccess = false;
        }
      }

      // Pass 2: Cascade water down through air (fill air below valid water)
      let waterAbove = false;
      for (let d = column.blocks.length - 1; d >= 0; d--) {
        const block = column.blocks[d];

        if (block === HexBlockType.WATER) {
          waterAbove = true;
        } else if (block === HexBlockType.AIR) {
          if (waterAbove) {
            // Air below water - fill with water
            column.blocks[d] = HexBlockType.WATER;
            column.isDirty = true;
            waterChangedCount++;
          }
        } else {
          // Hit solid block - water can't flow through
          waterAbove = false;
        }
      }
    }

    return waterChangedCount;
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
  // Optimized: uses cached lodChunkDirections instead of creating new vectors
  private updateLODChunkBounds(): void {
    for (let i = 0; i < this.lodChunkBounds.length; i++) {
      // Reuse cached direction, compute center in-place
      const dir = this.lodChunkDirections[i];
      this.lodChunkBounds[i].center.set(
        dir.x * this.radius + this.center.x,
        dir.y * this.radius + this.center.y,
        dir.z * this.radius + this.center.z
      );
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

  // Update planet state. Pass pre-computed frustum to avoid recalculating per planet.
  public update(playerPosition: THREE.Vector3, camera: THREE.Camera, deltaTime?: number, sharedFrustum?: THREE.Frustum): void {
    // Use shared frustum if provided, otherwise calculate (backwards compatible)
    if (sharedFrustum) {
      this.frustum.copy(sharedFrustum);
    } else {
      profiler.begin('Planet.frustum');
      this.projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
      profiler.end('Planet.frustum');
    }
    const de = deltaTime;
    if(de && de > 100)
    {
      console.log("you got serious issues lol " + deltaTime);
    }

    // Cache camera position for horizon culling
    camera.getWorldPosition(this.cachedCameraPosition);

    // Process pending mesh uploads/disposals to spread GPU work across frames
    if (this.pendingMeshUploads.length > 0 || this.pendingMeshDisposals.length > 0) {
      profiler.begin('Planet.meshUploads');
      this.processPendingMeshUploads();
      profiler.end('Planet.meshUploads');
    }

    // Process pending LOD chunks incrementally (time-sliced, nearest-first)
    if (this.pendingLODChunkData && this.pendingLODChunkQueue.length > 0) {
      profiler.begin('Planet.lodChunks');
      this.processLODChunks();
      profiler.end('Planet.lodChunks');
    }

    const distToCenter = playerPosition.distanceTo(this.center);
    const altitude = distToCenter - this.radius;

    // Detect LOD transition (crossing high LOD altitude threshold)
    const isAboveLODThreshold = altitude > this.getHighLODAltitude();
    if (this.wasAboveLODThreshold !== isAboveLODThreshold) {
      this.wasAboveLODThreshold = isAboveLODThreshold;
      // Fire callback: true = entering detailed terrain, false = leaving
      this.onLODTransitionCallback?.(!isAboveLODThreshold);
    }

    // Check for distant LOD (viewing from another planet)
    const distantLODLevel = this.getDistantLODLevel(distToCenter);

    // Track LOD level changes even when using distant LOD
    const highLODAlt = this.getHighLODAltitude();
    const intermediateLODAlt = this.getIntermediateLODAltitude();
    let currentLODLevel = 0;
    if (distantLODLevel >= 0) {
      currentLODLevel = 3; // Distant LOD
    } else if (altitude > highLODAlt) {
      currentLODLevel = 2;
    } else if (altitude > intermediateLODAlt) {
      currentLODLevel = 1;
    }

    // Use proper readiness checks (verify actual geometry exists)
    const highLODReady = this.isHighLODReady();
    const intermediateReady = this.isIntermediateLODReady();
    const distantLODReady = this.isDistantLODReady();

    // Log only when LOD level changes
    if (this.lastLODLevel !== currentLODLevel) {
      const levelNames = ['DETAILED', 'INTERMEDIATE', 'HIGH (chunked)', 'DISTANT'];
      const distantLODAlt = this.getDistantLODAltitude();

      // Determine direction (moving up = ascending, higher LOD level number)
      const previousLevel = this.lastLODLevel ?? 0;
      const direction = currentLODLevel > previousLevel ? 'ASCENDING' : 'DESCENDING';

      // Determine fallback logic based on target LOD
      let fallbackInfo = '';
      if (currentLODLevel === 2) {
        // Transitioning to HIGH
        if (highLODReady) {
          fallbackInfo = 'will use HIGH (ready)';
        } else {
          fallbackInfo = 'FALLBACK to DISTANT (high not ready)';
        }
      } else if (currentLODLevel === 1) {
        // Transitioning to INTERMEDIATE
        if (intermediateReady) {
          fallbackInfo = 'will use INTERMEDIATE (ready)';
        } else if (highLODReady) {
          fallbackInfo = 'FALLBACK to HIGH (intermediate not ready)';
        } else {
          fallbackInfo = 'FALLBACK to DISTANT (neither ready)';
        }
      } else if (currentLODLevel === 0) {
        fallbackInfo = 'will use DETAILED terrain';
      } else if (currentLODLevel === 3) {
        fallbackInfo = 'will use DISTANT LOD';
      }

      console.log(`[${this.config.name}] LOD switch: ${levelNames[previousLevel]} -> ${levelNames[currentLODLevel]} (${direction}) | altitude: ${altitude.toFixed(1)}, thresholds: intermediate=${intermediateLODAlt}, high=${highLODAlt}, distant=${distantLODAlt}`);
      console.log(`  Ready: high=${highLODReady}, intermediate=${intermediateReady}, distant=${distantLODReady} | ${fallbackInfo}`);
      this.lastLODLevel = currentLODLevel;
    }

    if (distantLODLevel >= 0) {
      // Use distant LOD mesh - hide all other meshes
      this.setDistantLODVisible(distantLODLevel);
      if (this.lodMesh) this.lodMesh.visible = false;
      if (this.lodWaterMesh) this.lodWaterMesh.visible = false;
      if (this.batchedMeshGroup) this.batchedMeshGroup.visible = false;
      if (this.boundaryWallsGroup) this.boundaryWallsGroup.visible = false;
      return;
    } else {
      // Only hide distant LOD if lodMesh (chunked LOD) is ready
      // This prevents the planet from disappearing when descending from space
      // before terrain generation has had time to create the LOD mesh
      const wasInDistantLOD = this.currentDistantLODLevel >= 0;

      if (highLODReady || !wasInDistantLOD) {
        // Safe to hide distant LOD - either HIGH LOD is ready, or we were never in distant LOD
        this.setDistantLODVisible(-1);
        if (this.boundaryWallsGroup) this.boundaryWallsGroup.visible = true;
      } else {
        // Keep distant LOD visible as fallback until HIGH LOD is ready
        // Use highest detail distant LOD (level 0) as transitional fallback
        this.setDistantLODVisible(0);
        if (this.boundaryWallsGroup) this.boundaryWallsGroup.visible = false;
        // Continue processing to trigger terrain generation, but don't show other LODs yet
      }
    }

    // Three-level LOD system:
    // 1. High altitude (> highLODAltitude): Chunked LOD only
    // 2. Medium altitude (> intermediateLODAltitude): Intermediate LOD
    // 3. Low altitude: Detailed terrain

    if (altitude > highLODAlt) {
      // HIGH ALTITUDE: Show only chunked LOD (no detailed terrain needed)
      // Clear cached nearby tiles when going to orbit view
      if (this.cachedNearbyTiles.size > 0) {
        console.log(`  Clearing ${this.cachedNearbyTiles.size} cached nearby tiles, triggering LOD rebuild`);
        this.cachedNearbyTiles.clear();
        this.bufferCenterTiles.clear();
        // Clear detailed tile tracking so all LOD chunks become visible
        this.tilesWithDetailedGeometry.clear();
        this.chunkDetailedTileCount.clear();
        // Trigger LOD rebuild since tiles were previously excluded from LOD
        // The LOD mesh needs to be rebuilt to include all tiles now
        this.createLODMesh();
      }

      if (highLODReady) {
        // Show only HIGH LOD (no detailed terrain needed at high altitude)
        this.lodMesh!.visible = true;
        if (this.lodWaterMesh) this.lodWaterMesh.visible = true;
        if (this.intermediateLODMesh) this.intermediateLODMesh.visible = false;
        if (this.batchedMeshGroup) this.batchedMeshGroup.visible = false;
        this.setDistantLODVisible(-1); // Hide distant LOD
      } else {
        // HIGH LOD not ready - use distant LOD level 0 as fallback
        this.setDistantLODVisible(0);
        if (this.lodMesh) this.lodMesh.visible = false;
        if (this.lodWaterMesh) this.lodWaterMesh.visible = false;
        if (this.intermediateLODMesh) this.intermediateLODMesh.visible = false;
        if (this.batchedMeshGroup) this.batchedMeshGroup.visible = false;
      }

      return;
    } else if (altitude > intermediateLODAlt) {
      // MEDIUM ALTITUDE: Show intermediate LOD (simplified terrain geometry)
      // Build intermediate LOD if not yet built
      if (!this.isIntermediateLODBuilt && !this.isIntermediateLODWorkerActive) {
        this.buildIntermediateLOD();
      }

      // Show intermediate LOD if available, otherwise fall back to HIGH LOD or distant LOD
      // Use proper readiness checks (verify actual geometry exists)
      if (intermediateReady) {
        // INTERMEDIATE LOD is ready - use it
        if (this.lodMesh) this.lodMesh.visible = false;
        if (this.lodWaterMesh) this.lodWaterMesh.visible = false;
        if (this.intermediateLODMesh) this.intermediateLODMesh.visible = true;
        if (this.batchedMeshGroup) this.batchedMeshGroup.visible = false;
        this.setDistantLODVisible(-1);
      } else if (highLODReady) {
        // Fallback to HIGH LOD while intermediate builds
        if (this.lodMesh) this.lodMesh.visible = true;
        if (this.lodWaterMesh) this.lodWaterMesh.visible = true;
        if (this.intermediateLODMesh) this.intermediateLODMesh.visible = false;
        if (this.batchedMeshGroup) this.batchedMeshGroup.visible = false;
        this.setDistantLODVisible(-1);
      } else {
        // Neither intermediate nor HIGH LOD ready - use distant LOD level 0 as fallback
        this.setDistantLODVisible(0);
        if (this.lodMesh) this.lodMesh.visible = false;
        if (this.lodWaterMesh) this.lodWaterMesh.visible = false;
        if (this.intermediateLODMesh) this.intermediateLODMesh.visible = false;
        if (this.batchedMeshGroup) this.batchedMeshGroup.visible = false;
      }
      return;
    }

    // Enable detailed terrain when player approaches a non-spawn planet
    // This happens once when crossing the LOD switch altitude threshold
    if (!this.detailedTerrainEnabled && !this.detailedTerrainInitializing) {
      // Player is within LOD switch altitude - enable detailed terrain
      // Pass player position for progressive generation (nearby tiles first)
      this.enableDetailedTerrain(playerPosition);
    }

    // Process background terrain generation for non-spawn planets
    if (this.pendingTerrainTiles.length > 0) {
      this.processBackgroundTerrainGeneration();
    }

    // If detailed terrain isn't ready yet, only show LOD
    if (!this.detailedTerrainEnabled) {
      if (this.lodMesh) this.lodMesh.visible = true;
      if (this.lodWaterMesh) this.lodWaterMesh.visible = true;
      if (this.intermediateLODMesh) this.intermediateLODMesh.visible = false;
      if (this.batchedMeshGroup) this.batchedMeshGroup.visible = false;
      return;
    }

    // LOW ALTITUDE (DETAILED zone): Show detailed terrain
    // Only show chunk-based HIGH LOD (which can be culled per-chunk) for distant areas
    // The fallback HIGH LOD is a single mesh that can't be culled, so hide it entirely
    // Note: cullLODChunks() is called AFTER tile tracking is updated (see end of function)
    // Debug: F4 toggle can hide detailed terrain to see LOD only
    const hasChunkBasedLOD = this.lodChunks.some(chunk => chunk.children.length > 0);
    if (this.lodMesh) this.lodMesh.visible = hasChunkBasedLOD; // Only show if chunk-based (cullable)
    if (this.lodWaterMesh) this.lodWaterMesh.visible = hasChunkBasedLOD;
    if (this.intermediateLODMesh) this.intermediateLODMesh.visible = false;
    if (this.batchedMeshGroup) this.batchedMeshGroup.visible = !this.debugDetailedHidden;

    const altitudeRatio = Math.min(1, Math.max(0, altitude / 100));
    // Use per-planet config if set, otherwise fall back to PlayerConfig defaults
    const minDist = this.config.detailRenderDistance ?? PlayerConfig.TERRAIN_MIN_RENDER_DISTANCE;
    const maxDist = Math.max(minDist, PlayerConfig.TERRAIN_MAX_RENDER_DISTANCE);
    const renderDistance = Math.floor(minDist + altitudeRatio * (maxDist - minDist));

    profiler.begin('Planet.getTile');
    // Use fast tile lookup with spatial coherence hint (O(1) for nearby positions)
    const playerTile = this.getTileAtPointFast(playerPosition);
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

      // Use chunk-based selection instead of BFS to match LOD chunk boundaries
      // This eliminates gaps between LOD and detailed terrain
      const nearbyChunks = this.getChunksInRange(playerTileIndex, renderDistance);
      const newNearbyTiles = this.getTilesFromChunks(nearbyChunks);

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

      // Update buffer center to new player position (chunk-based)
      const bufferChunks = this.getChunksInRange(playerTileIndex, bufferZone);
      this.bufferCenterTiles = this.getTilesFromChunks(bufferChunks);
      this.cachedRenderDistance = renderDistance;

      // If there are changes, queue them for incremental processing
      if (tilesToAdd.length > 0 || tilesToRemove.length > 0) {
        // Update cached tiles immediately for correct rendering
        this.cachedNearbyTiles = newNearbyTiles;

        // NOTE: tilesWithDetailedGeometry is updated in handleWorkerResult() AFTER
        // the geometry is actually built. This prevents LOD chunks from being hidden
        // before detailed terrain is ready, which would cause gaps.

        // Remove tiles from the tracking set immediately (they're no longer needed)
        // This allows LOD to show for removed tiles right away
        for (const tileIndex of tilesToRemove) {
          if (this.tilesWithDetailedGeometry.has(tileIndex)) {
            this.tilesWithDetailedGeometry.delete(tileIndex);
            const chunkIndex = this.tileToChunk.get(tileIndex);
            if (chunkIndex !== undefined) {
              const count = this.chunkDetailedTileCount.get(chunkIndex) ?? 0;
              if (count > 0) {
                this.chunkDetailedTileCount.set(chunkIndex, count - 1);
              }
            }
          }
        }

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

        // Need to rebuild batched meshes for new detailed tiles
        // NOTE: LOD no longer needs rebuild - it's complete for all tiles
        console.log('[needsRebatch=true] cachedNearbyTiles changed');
        this.needsRebatch = true;

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
      console.log('[startWorkerBuild] needsRebatch was true, starting worker build');
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

    // Cull LOD chunks AFTER tile tracking is updated
    // This ensures chunks with detailed tiles are properly hidden
    if (this.lodMesh) {
      this.cullLODChunks();
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
      console.log('[needsRebatch=true] incremental rebuild complete');
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
    // Snow biome materials
    { key: 'snow', getMaterial: () => this.meshBuilder.getSnowMaterial() },
    { key: 'snowSide', getMaterial: () => this.meshBuilder.getSnowSideMaterial() },
    { key: 'dirtSnow', getMaterial: () => this.meshBuilder.getDirtSnowMaterial() },
    { key: 'ice', getMaterial: () => this.meshBuilder.getIceMaterial(), renderOrder: 2 },
    { key: 'glass', getMaterial: () => this.meshBuilder.getGlassMaterial(), renderOrder: 3 },
    // Moon terrain
    { key: 'moonRock', getMaterial: () => this.meshBuilder.getMoonRockMaterial() },
  ];

  private rebuildBatchedMeshes(): void {
    if (!this.batchedMeshGroup) return;

    // Unregister old water mesh before disposing
    if (this.currentWaterMesh && this.waterMeshCallback) {
      this.waterMeshCallback(this.currentWaterMesh, false);
    }
    this.currentWaterMesh = null;

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

      // NOTE: Do NOT use frustum culling here - the geometry should include all nearby tiles
      // THREE.js handles per-object frustum culling at render time. Culling during geometry
      // build causes holes when the camera rotates.

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

        // Track water mesh for depth pre-pass optimization
        if (mat.key === 'water') {
          this.currentWaterMesh = mesh;
          if (this.waterMeshCallback) {
            this.waterMeshCallback(mesh, true);
          }
        }
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
      // Snow biome
      case HexBlockType.SNOW: return 'snow';
      case HexBlockType.DIRT_SNOW: return 'dirtSnow';
      case HexBlockType.ICE: return 'ice';
      case HexBlockType.GLASS: return 'glass';
      // Moon terrain
      case HexBlockType.MOON_ROCK: return 'moonRock';
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
      // Snow biome
      case HexBlockType.SNOW: return 'snowSide';  // Snow sides use dirt_snow texture
      case HexBlockType.DIRT_SNOW: return 'dirtSnow';
      case HexBlockType.ICE: return 'ice';
      case HexBlockType.GLASS: return 'glass';
      // Moon terrain
      case HexBlockType.MOON_ROCK: return 'moonRock';
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
      // Snow biome - snow blocks show dirt_snow on bottom
      case HexBlockType.SNOW: return 'dirtSnow';
      case HexBlockType.DIRT_SNOW: return 'dirtSnow';
      case HexBlockType.ICE: return 'ice';
      case HexBlockType.GLASS: return 'glass';
      // Moon terrain
      case HexBlockType.MOON_ROCK: return 'moonRock';
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
    // Store the sun direction for use when rebuilding LOD meshes
    this.sunDirection.copy(dir);
    this.meshBuilder.setSunDirection(dir);
    // Update distant LOD materials with sun direction
    for (const material of this.distantLODMaterials) {
      material.uniforms.sunDirection.value.copy(dir);
      material.uniformsNeedUpdate = true; // Force Three.js to upload new uniform values to GPU
    }
  }

  // Set torch data for vertex baking (called before geometry rebuild)
  // Torch positions are converted from world space to local space (relative to planet center)
  // since geometry vertices are in local space
  public setTorchData(torches: Array<{ position: THREE.Vector3; range: number; intensity: number }>): void {
    this.torchData = torches.map(t => ({
      // Convert from world space to local space by subtracting planet center
      position: {
        x: t.position.x - this.center.x,
        y: t.position.y - this.center.y,
        z: t.position.z - this.center.z
      },
      range: t.range,
      intensity: t.intensity
    }));

    // NOTE: We no longer rebuild distant LOD meshes here (was 400-500ms spike!)
    // Distant LOD is only visible from space where individual torches aren't visible anyway.
    // Torch lighting is handled in:
    // 1. Detail terrain: via worker geometry rebuild (vertex-baked)
    // 2. Near LOD: via worker LOD rebuild (per-tile torch flag)
  }

  // Set which tiles have torches (for LOD vertex lighting)
  // Each tile with a torch gets full torch light in LOD mesh (1 per tile, single tile range)
  public setTilesWithTorches(tiles: Set<number>): void {
    this.tilesWithTorches = tiles;
  }

  // Mark tiles near a torch position as dirty (for torch light baking)
  // Call this when a torch is placed or removed
  // Triggers incremental rebuild like block placement (~15-50ms instead of 1200ms full rebuild)
  public markTilesNearTorchDirty(torchPosition: THREE.Vector3, _range: number): void {
    // Find the tile at the torch position
    const torchTile = this.getTileAtPoint(torchPosition);
    if (!torchTile) return;

    // Mark torch tile and immediate neighbors dirty (same as block placement)
    // This triggers a local rebuild for vertex-baked torch lighting
    const column = this.columns.get(torchTile.index);
    if (column && this.cachedNearbyTiles.has(torchTile.index)) {
      column.isDirty = true;
      this.queueDirtyColumnRebuild(torchTile.index);

      // Also mark and queue neighbors for proper light falloff
      for (const neighborIndex of column.tile.neighbors) {
        const neighbor = this.columns.get(neighborIndex);
        if (neighbor && this.cachedNearbyTiles.has(neighborIndex)) {
          neighbor.isDirty = true;
          this.queueDirtyColumnRebuild(neighborIndex);
        }
      }
    }
  }

  public getWaterShaderMaterial(): THREE.ShaderMaterial | null {
    return this.meshBuilder.getWaterShaderMaterial();
  }

  // Set callback for water mesh registration (for depth pre-pass optimization)
  public setWaterMeshCallback(callback: (mesh: THREE.Mesh, isAdd: boolean) => void): void {
    this.waterMeshCallback = callback;
    // Register existing water mesh if any
    if (this.currentWaterMesh) {
      callback(this.currentWaterMesh, true);
    }
  }

  // Get all chunks whose centers are within render distance of player tile
  // Uses angular distance instead of BFS to match LOD chunk boundaries
  private getChunksInRange(playerTileIndex: number, renderDistance: number): Set<number> {
    const result = new Set<number>();
    const playerTile = this.polyhedron.tiles[playerTileIndex];
    const playerDir = playerTile.center.clone().normalize();

    // Calculate angular threshold based on render distance
    // renderDistance is in tile hops; convert to angular distance
    // Each tile covers approximately sqrt(4π/N) radians where N = total tiles
    const numTiles = this.polyhedron.tiles.length;
    const angularPerTile = Math.sqrt(4 * Math.PI / numTiles);
    const angularDistance = renderDistance * angularPerTile;

    // Each chunk covers ~1/32 of the sphere surface
    // The angular radius of a chunk is approximately sqrt(4π/32) ≈ 0.63 radians ≈ 36°
    // We need to add this to the threshold so chunks that OVERLAP with render distance are included
    const chunkAngularRadius = Math.sqrt(4 * Math.PI / this.LOD_CHUNK_COUNT);

    // Include chunks whose edge (not just center) is within render distance
    // dot(playerDir, chunkDir) >= cos(angularDistance + chunkRadius)
    const cosThreshold = Math.cos(angularDistance + chunkAngularRadius);

    for (let i = 0; i < this.lodChunkDirections.length; i++) {
      const chunkDir = this.lodChunkDirections[i];
      const dot = playerDir.dot(chunkDir);
      if (dot >= cosThreshold) {
        result.add(i);
      }
    }
    return result;
  }

  // Get all tiles from the specified chunks
  private getTilesFromChunks(chunkIndices: Set<number>): Set<number> {
    const result = new Set<number>();
    for (const chunkIndex of chunkIndices) {
      const tiles = this.chunkToTiles.get(chunkIndex) ?? [];
      for (const tileIndex of tiles) {
        result.add(tileIndex);
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

  // Track last edited tile for debugging
  private lastEditedTile: { tileIndex: number; depth: number; oldBlock: HexBlockType; newBlock: HexBlockType } | null = null;

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

    // IMMEDIATE synchronous rebuild for edited tile and neighbors
    // This bypasses the worker for instant visual feedback
    // Include edited tile AND all neighbors (regardless of cachedNearbyTiles - if we're editing, we can see it)
    const tilesToRebuild = new Set<number>([tileIndex]);
    for (const neighborIndex of column.tile.neighbors) {
      tilesToRebuild.add(neighborIndex);
    }

    console.log(`[Planet] setBlock called: tile=${tileIndex}, depth=${depth}, block=${blockType}, tilesToRebuild=${tilesToRebuild.size}, inCache=${this.cachedNearbyTiles.has(tileIndex)}`);
    this.rebuildTilesImmediate(tilesToRebuild);

    if (this.meshBuilder.isSolid(oldBlockType) && blockType === HexBlockType.AIR) {
      this.simulateWaterFlow(tileIndex, depth);
    }
  }

  // Track columns that need geometry rebuild
  private dirtyColumnsQueue: Set<number> = new Set();

  /**
   * Immediately rebuild geometry for specific tiles (synchronous, no worker)
   * Used for block edits to provide instant visual feedback
   */
  private rebuildTilesImmediate(tilesToRebuild: Set<number>): void {
    if (!this.batchedMeshGroup || tilesToRebuild.size === 0) {
      console.log(`[Planet] rebuildTilesImmediate: early exit - batchedMeshGroup=${!!this.batchedMeshGroup}, tilesToRebuild=${tilesToRebuild.size}`);
      return;
    }

    // Group tiles by chunk
    const chunkTiles = new Map<number, Set<number>>();
    for (const tileIndex of tilesToRebuild) {
      const chunkIndex = this.tileToChunk.get(tileIndex);
      if (chunkIndex === undefined) {
        console.log(`[Planet] rebuildTilesImmediate: tile ${tileIndex} has no chunk mapping`);
        continue;
      }
      if (!chunkTiles.has(chunkIndex)) {
        chunkTiles.set(chunkIndex, new Set());
      }
      chunkTiles.get(chunkIndex)!.add(tileIndex);
    }

    console.log(`[Planet] rebuildTilesImmediate: ${chunkTiles.size} chunks to rebuild`);

    // Rebuild each affected chunk
    for (const [chunkIndex, editedTilesInChunk] of chunkTiles) {
      // Get ALL tiles in this chunk that are in render distance OR being edited
      const chunkAllTiles = this.chunkToTiles.get(chunkIndex);
      if (!chunkAllTiles) {
        console.log(`[Planet] rebuildTilesImmediate: chunk ${chunkIndex} has no tile list`);
        continue;
      }

      // Include tiles that are either in cache OR being edited
      const visibleChunkTiles = chunkAllTiles.filter(t =>
        this.cachedNearbyTiles.has(t) || editedTilesInChunk.has(t)
      );
      if (visibleChunkTiles.length === 0) {
        console.log(`[Planet] rebuildTilesImmediate: chunk ${chunkIndex} has no visible tiles`);
        continue;
      }

      console.log(`[Planet] rebuildTilesImmediate: rebuilding chunk ${chunkIndex} with ${visibleChunkTiles.length} tiles`);

      // Build geometry for all visible tiles in this chunk
      const geometryData: Record<string, GeometryData> = {};
      for (const mat of this.BLOCK_MATERIALS) {
        geometryData[mat.key] = createEmptyGeometryData();
      }

      for (const tileIndex of visibleChunkTiles) {
        const column = this.columns.get(tileIndex);
        if (!column) continue;
        this.buildColumnGeometry(column, geometryData);
        column.isDirty = false;
      }

      // Remove old chunk mesh
      const oldChunkGroup = this.chunkDetailMeshes.get(chunkIndex);
      if (oldChunkGroup) {
        // Unregister water mesh if this chunk had one
        const oldWaterMesh = this.chunkDetailWaterMeshes.get(chunkIndex);
        if (oldWaterMesh && this.waterMeshCallback) {
          this.waterMeshCallback(oldWaterMesh, false);
        }
        this.chunkDetailWaterMeshes.delete(chunkIndex);

        // Remove from parent and dispose
        this.batchedMeshGroup.remove(oldChunkGroup);
        oldChunkGroup.traverse((child) => {
          if (child instanceof THREE.Mesh && child.geometry) {
            child.geometry.dispose();
          }
        });
      }

      // Create new chunk group with rebuilt geometry
      const chunkGroup = new THREE.Group();
      chunkGroup.name = `detailChunk_${chunkIndex}`;

      for (const mat of this.BLOCK_MATERIALS) {
        const data = geometryData[mat.key];
        if (data.positions.length > 0) {
          const geom = this.createBufferGeometry(data);
          const mesh = new THREE.Mesh(geom, mat.getMaterial());
          if (mat.renderOrder !== undefined) {
            mesh.renderOrder = mat.renderOrder;
          }
          chunkGroup.add(mesh);

          // Track water mesh for this chunk
          if (mat.key === 'water') {
            this.chunkDetailWaterMeshes.set(chunkIndex, mesh);
            if (this.waterMeshCallback) {
              this.waterMeshCallback(mesh, true);
            }
          }
        }
      }

      // Add to scene
      this.batchedMeshGroup.add(chunkGroup);
      this.chunkDetailMeshes.set(chunkIndex, chunkGroup);

      // Mark tiles as having detailed geometry
      for (const tileIndex of visibleChunkTiles) {
        if (!this.tilesWithDetailedGeometry.has(tileIndex)) {
          this.tilesWithDetailedGeometry.add(tileIndex);
          const count = this.chunkDetailedTileCount.get(chunkIndex) ?? 0;
          this.chunkDetailedTileCount.set(chunkIndex, count + 1);
        }
        // Remove from dirty queues to prevent worker from overriding our immediate rebuild
        this.dirtyColumnsQueue.delete(tileIndex);
      }

      // Remove chunk from dirty set - we just rebuilt it
      this.dirtyChunks.delete(chunkIndex);

      // Mark as freshly edited so worker results don't override this
      this.freshlyEditedChunks.add(chunkIndex);

      console.log(`[Planet] rebuildTilesImmediate: chunk ${chunkIndex} rebuilt and marked as freshly edited`);
    }
  }

  private queueDirtyColumnRebuild(tileIndex: number): void {
    if (!this.cachedNearbyTiles.has(tileIndex)) {
      return;
    }

    // Also mark the chunk as dirty for per-chunk rebuilds
    const chunkIndex = this.tileToChunk.get(tileIndex);
    this.dirtyColumnsQueue.add(tileIndex);

    if (chunkIndex !== undefined) {
      this.dirtyChunks.add(chunkIndex);
    }
  }

  // Debounce timer for dirty column rebuilds
  private dirtyRebuildDebounceTimer: number | null = null;
  private readonly DIRTY_REBUILD_DEBOUNCE_MS = 50; // Wait 50ms after last change before rebuilding

  // Process dirty columns - rebuilds only affected chunks instead of all tiles
  private rebuildDirtyColumns(): void {
    if (!this.batchedMeshGroup || this.dirtyColumnsQueue.size === 0) return;

    // If already scheduled, the timer will fire and trigger the rebuild
    if (this.dirtyRebuildDebounceTimer !== null) {
      return;
    }

    // Schedule a rebuild after debounce period (allows batching rapid changes)
    this.dirtyRebuildDebounceTimer = window.setTimeout(() => {
      this.dirtyRebuildDebounceTimer = null;

      // If worker is busy, reschedule for later
      if (this.isWorkerBuildActive || this.isChunkWorkerBuildActive) {
        if (this.dirtyColumnsQueue.size > 0) {
          // Reschedule rebuild attempt
          this.dirtyRebuildDebounceTimer = window.setTimeout(() => {
            this.dirtyRebuildDebounceTimer = null;
            this.rebuildDirtyColumns();
          }, this.DIRTY_REBUILD_DEBOUNCE_MS);
        }
        return;
      }

      if (this.dirtyColumnsQueue.size > 0) {
        // First time: do full chunk rebuild to transition from flat meshes to per-chunk meshes
        // Subsequent times: only rebuild dirty chunks
        if (!this.hasTransitionedToChunkMeshes) {
          // Collect ALL chunks that have tiles in render distance
          const allChunksInRange = new Set<number>();
          for (const tileIndex of this.cachedNearbyTiles) {
            const chunkIndex = this.tileToChunk.get(tileIndex);
            if (chunkIndex !== undefined) {
              allChunksInRange.add(chunkIndex);
            }
          }
          console.log(`[rebuildDirtyColumns] First rebuild - transitioning to per-chunk meshes (${allChunksInRange.size} chunks)`);

          this.dirtyColumnsQueue.clear();
          this.dirtyChunks.clear();

          // Full chunk rebuild with all chunks in range
          this.startChunkWorkerBuild(allChunksInRange);
        } else {
          // Use chunk-aware rebuild for fast block placement/breaking
          // Only rebuild the chunks that contain dirty tiles
          console.log(`[rebuildDirtyColumns] Chunk rebuild for ${this.dirtyColumnsQueue.size} dirty tiles in ${this.dirtyChunks.size} chunk(s)`);

          const chunksToRebuild = new Set(this.dirtyChunks);
          this.dirtyColumnsQueue.clear();
          this.dirtyChunks.clear();

          // Use chunk-specific rebuild (much faster than full rebuild)
          this.startChunkWorkerBuild(chunksToRebuild);
        }
      }
    }, this.DIRTY_REBUILD_DEBOUNCE_MS);
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

  // Cache for fast tile lookup - stores the last queried tile for spatial coherence
  private lastQueriedTile: HexTile | null = null;

  public getTileAtPoint(point: THREE.Vector3): HexTile | null {
    return this.polyhedron.getTileAtPoint(point.clone().sub(this.center));
  }

  // Fast tile lookup using cached hint - O(1) for nearby points instead of O(n)
  // Use this for player position queries where the player moves continuously
  public getTileAtPointFast(point: THREE.Vector3): HexTile | null {
    const localPoint = point.clone().sub(this.center);

    // If we have a cached tile, use it as a hint for fast BFS lookup
    if (this.lastQueriedTile) {
      this.lastQueriedTile = this.polyhedron.getTileAtPointFromHint(localPoint, this.lastQueriedTile);
      return this.lastQueriedTile;
    }

    // First query - do full scan and cache the result
    this.lastQueriedTile = this.polyhedron.getTileAtPoint(localPoint);
    return this.lastQueriedTile;
  }

  // Reset the tile cache hint (call when teleporting or switching planets)
  public resetTileCache(): void {
    this.lastQueriedTile = null;
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

  // Get planet coordinates (latitude, longitude) from a point in 3D space
  // Returns: { lat: -90 to 90, lon: -180 to 180, depth: block depth }
  public getCoordinatesAtPoint(point: THREE.Vector3): { lat: number; lon: number; depth: number } {
    const depth = this.getDepthAtPoint(point);

    // Get direction from planet center to point
    const dir = point.clone().sub(this.center).normalize();

    // Latitude: angle from equator plane, based on Y component
    // Y = 1 -> 90° (north pole), Y = -1 -> -90° (south pole), Y = 0 -> 0° (equator)
    const lat = Math.asin(dir.y) * (180 / Math.PI);

    // Longitude: angle around Y axis, from X axis
    // atan2(z, x) gives angle from +X axis, counter-clockwise when viewed from above
    const lon = Math.atan2(dir.z, dir.x) * (180 / Math.PI);

    return { lat, lon, depth };
  }

  // Get direction vector from latitude/longitude (in degrees)
  // lat: -90 (south) to 90 (north), lon: -180 to 180 (west to east)
  public getDirectionFromLatLon(lat: number, lon: number): THREE.Vector3 {
    const latRad = lat * (Math.PI / 180);
    const lonRad = lon * (Math.PI / 180);

    // Convert spherical to cartesian
    // Y is up (latitude), X-Z plane is the equator (longitude)
    const y = Math.sin(latRad);
    const xzScale = Math.cos(latRad);
    const x = xzScale * Math.cos(lonRad);
    const z = xzScale * Math.sin(lonRad);

    return new THREE.Vector3(x, y, z).normalize();
  }

  // Get spawn position at given lat/lon, standing on the terrain surface
  public getSpawnPositionAtLatLon(lat: number, lon: number, heightAboveSurface: number = 1): THREE.Vector3 {
    const direction = this.getDirectionFromLatLon(lat, lon);
    const surfaceHeight = this.getSurfaceHeightInDirection(direction);
    return this.center.clone().add(direction.multiplyScalar(surfaceHeight + heightAboveSurface));
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
    if (!tile) {
      // No tile found - use noise-based height estimation
      const surfaceDepth = this.getHeightVariation(direction);
      return this.depthToRadius(surfaceDepth);
    }

    const column = this.columns.get(tile.index);
    if (!column) {
      // Column not generated yet - use noise-based height estimation
      // This matches the terrain generation logic so trees/objects will be grounded
      const surfaceDepth = this.getHeightVariation(tile.center);
      return this.depthToRadius(surfaceDepth);
    }

    // Search from top (highest depth) down to find first solid block
    for (let depth = column.blocks.length - 1; depth >= 0; depth--) {
      const block = column.blocks[depth];
      if (block !== HexBlockType.AIR && block !== HexBlockType.WATER) {
        return this.depthToRadius(depth);
      }
    }

    // No solid blocks found - use noise-based height
    const surfaceDepth = this.getHeightVariation(tile.center);
    return this.depthToRadius(surfaceDepth);
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

  // Get neighbor tile indices for a given tile
  public getTileNeighbors(tileIndex: number): number[] {
    const tile = this.polyhedron.tiles[tileIndex];
    return tile ? tile.neighbors : [];
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

  // Check if a tile is in the detailed terrain range (vs LOD)
  public isTileInDetailRange(tileIndex: number): boolean {
    return this.cachedNearbyTiles.has(tileIndex);
  }

  // Get the LOD chunk index for a given tile (for debugging)
  public getTileChunkIndex(tileIndex: number): number {
    return this.tileToChunk.get(tileIndex) ?? -1;
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

  // Get all tiles that should have visible trees
  // This includes nearby tiles (detailed terrain) AND tiles on visible LOD chunks
  public getVisibleTilesForTrees(): Set<number> {
    const result = new Set(this.cachedNearbyTiles);

    // Add all tiles from visible LOD chunks
    for (let i = 0; i < this.lodChunks.length; i++) {
      if (this.lodChunks[i].visible) {
        // Add all tiles assigned to this chunk
        for (const [tileIndex, chunkIndex] of this.tileToChunk) {
          if (chunkIndex === i) {
            result.add(tileIndex);
          }
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

    const playerDepth = this.getDepthAtPoint(position);

    // Check if the block at the player's depth is actually water
    // This properly handles air pockets below water (caves under the ocean)
    if (playerDepth >= 0 && playerDepth < column.blocks.length) {
      return column.blocks[playerDepth] === HexBlockType.WATER;
    }

    return false;
  }

  public getWaterDepth(position: THREE.Vector3): number {
    const tile = this.getTileAtPoint(position);
    if (!tile) return 0;

    const column = this.columns.get(tile.index);
    if (!column) return 0;

    const currentDepth = this.getDepthAtPoint(position);

    // First check: is the player actually in water at their current depth?
    // If they're in an air pocket, return 0 (not underwater)
    if (currentDepth >= 0 && currentDepth < column.blocks.length) {
      if (column.blocks[currentDepth] !== HexBlockType.WATER) {
        return 0; // In an air pocket, not underwater
      }
    }

    // Find water surface above player (topmost water block, searching from top down)
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
    const baseDistantAlt = this.getDistantLODAltitude();

    // Distant LOD distances are altitude-based (added to radius)
    // This ensures distant LOD only activates when truly far from the planet surface
    const dist1 = this.radius + baseDistantAlt;
    const dist2 = this.radius + baseDistantAlt * 2.5;  // Scale levels 2 and 3 from base
    const dist3 = this.radius + baseDistantAlt * 5;

    if (distToCenter >= dist3) {
      return 2; // Lowest detail
    } else if (distToCenter >= dist2) {
      return 1; // Medium detail
    } else if (distToCenter >= dist1) {
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

  // Check if HIGH LOD (chunked) mesh is ready with actual geometry
  private isHighLODReady(): boolean {
    if (!this.lodMesh || this.lodMesh.children.length === 0) return false;
    // Check if any child has actual vertices
    for (const child of this.lodMesh.children) {
      if (child instanceof THREE.Mesh && child.geometry) {
        const pos = child.geometry.getAttribute('position');
        if (pos && pos.count > 0) return true;
      }
    }
    return false;
  }

  // Check if INTERMEDIATE LOD mesh is ready with actual geometry
  // IMPORTANT: Intermediate LOD requires full planet terrain coverage because it's built
  // from terrain data. For non-spawn planets with partial terrain, intermediate LOD would
  // show scattered hexagons (only where terrain exists), so we require full coverage.
  private isIntermediateLODReady(): boolean {
    if (!this.intermediateLODMesh || !this.isIntermediateLODBuilt) return false;
    if (this.intermediateLODMesh.children.length === 0) return false;

    // Check if we have full planet terrain coverage (all tiles have terrain data)
    // Without this, intermediate LOD would show holes where terrain wasn't generated
    const totalTiles = this.polyhedron.tiles.length;
    if (this.columns.size < totalTiles) {
      // Partial terrain coverage - intermediate LOD would have holes
      return false;
    }

    // Check if any child has actual vertices
    for (const child of this.intermediateLODMesh.children) {
      if (child instanceof THREE.Mesh && child.geometry) {
        const pos = child.geometry.getAttribute('position');
        if (pos && pos.count > 0) return true;
      }
    }
    return false;
  }

  // Check if DISTANT LOD meshes are ready (these should always be ready)
  private isDistantLODReady(): boolean {
    return this.distantLODMeshes.length > 0;
  }

  // Update distant LOD mesh positions when planet center moves
  public updateDistantLODPositions(): void {
    for (const mesh of this.distantLODMeshes) {
      mesh.position.copy(this.center);
    }
    // Also update the planetCenter uniform in LOD materials
    // This is critical for correct day/night lighting calculations
    for (const material of this.distantLODMaterials) {
      material.uniforms.planetCenter.value.copy(this.center);
      material.uniformsNeedUpdate = true; // Force Three.js to upload new uniform values to GPU
    }
  }

  // Check if planet is being viewed from orbit (distant LOD mode)
  // Trees should be hidden when in orbit view
  public isInOrbitView(): boolean {
    return this.currentDistantLODLevel >= 0;
  }

  // Debug helpers to check rebuild state
  public isIncrementalActive(): boolean {
    return this.isIncrementalRebuildActive;
  }

  public getNeedsRebatch(): boolean {
    return this.needsRebatch;
  }
}
