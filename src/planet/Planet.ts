import * as THREE from 'three';
import { GoldbergPolyhedron, HexTile } from './GoldbergPolyhedron';
import { HexBlockType, HexBlockMeshBuilder } from './HexBlock';
import { PlayerConfig } from '../config/PlayerConfig';

export interface PlanetConfig {
  texturePath?: string;  // Single texture for all surfaces (like moon)
  heightVariation?: number;  // 0-1, how much terrain varies (default 1.0)
  hasWater?: boolean;  // Whether to generate water at sea level (default true for Earth)
  seaLevel?: number;   // Depth at which water appears (default 1, meaning radius - 1)
}

export interface PlanetColumn {
  tile: HexTile;
  blocks: HexBlockType[];
  meshGroup: THREE.Group | null;
  isDirty: boolean;
  boundingSphere: THREE.Sphere;
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

  // LOD system - per-tile LOD meshes that can be hidden when detailed meshes are shown
  private lodGroup: THREE.Group | null = null;
  private lodTileMeshes: Map<number, THREE.Mesh> = new Map(); // tileIndex -> LOD mesh
  private isShowingLOD: boolean = false;

  // Boundary walls group (fills gap between detailed terrain and LOD at render distance edge)
  private boundaryWallsGroup: THREE.Group | null = null;
  private cachedBoundaryTiles: Set<number> = new Set();

  // Cache for tile range lookups (avoid BFS every frame)
  private cachedPlayerTileIndex: number = -1;
  private cachedRenderDistance: number = -1;
  private cachedNearbyTiles: Set<number> = new Set();
  private lastVisibleTiles: Set<number> = new Set();

  private readonly BLOCK_HEIGHT = 1;
  private readonly MAX_DEPTH = 16;
  private readonly DEEP_THRESHOLD = 4; // Depth at which we switch to stone texture
  private readonly SEA_LEVEL: number; // Depth at which water surface sits

  constructor(scene: THREE.Scene, radius: number = 50, subdivisions: number = 3, config: PlanetConfig = {}) {
    this.scene = scene;
    this.radius = radius;
    this.center = new THREE.Vector3(0, 0, 0);
    this.config = config;
    this.SEA_LEVEL = config.seaLevel ?? 2; // Default sea level at depth 2 (creates oceans in lower terrain)
    this.polyhedron = new GoldbergPolyhedron(radius, subdivisions);
    this.meshBuilder = new HexBlockMeshBuilder();
  }

  public async initialize(): Promise<void> {
    await this.meshBuilder.loadTextures(this.config.texturePath);
    this.generateTerrain();
    this.createLODSphere();
    console.log(`Planet created with ${this.polyhedron.getTileCount()} tiles`);
  }

  private createLODSphere(): void {
    // Create per-tile LOD meshes that can be individually hidden
    // when detailed meshes are shown in that area
    this.lodGroup = new THREE.Group();

    // LOD sphere sits at sea level (water surface height)
    // This aligns with where water is rendered in detailed view
    const lodOuterRadius = this.radius - this.SEA_LEVEL * this.BLOCK_HEIGHT;
    const lodInnerRadius = lodOuterRadius - 0.1;

    for (const [tileIndex, column] of this.columns) {
      // Find surface block type (first non-air block)
      let surfaceBlockType = HexBlockType.GRASS;
      for (let d = 0; d < column.blocks.length; d++) {
        if (column.blocks[d] !== HexBlockType.AIR) {
          surfaceBlockType = column.blocks[d];
          break;
        }
      }

      const tile = column.tile;
      const { top } = this.meshBuilder.createSeparateGeometries(
        tile,
        lodInnerRadius,
        lodOuterRadius,
        new THREE.Vector3(0, 0, 0),
        true,  // Only top face needed
        false,
        false
      );

      if (top) {
        // Choose material based on block type
        let material: THREE.Material;
        if (surfaceBlockType === HexBlockType.WATER) {
          material = this.meshBuilder.getWaterLODMaterial();
        } else if (surfaceBlockType === HexBlockType.DIRT) {
          material = this.meshBuilder.getSideMaterial();
        } else {
          material = this.meshBuilder.getTopMaterial();
        }

        const mesh = new THREE.Mesh(top, material);
        mesh.userData.tileIndex = tileIndex;
        this.lodGroup.add(mesh);
        this.lodTileMeshes.set(tileIndex, mesh);
      }
    }

    this.lodGroup.position.copy(this.center);
    this.lodGroup.visible = true; // Always visible as background
    this.scene.add(this.lodGroup);

    // Create boundary walls group (will be populated dynamically)
    this.boundaryWallsGroup = new THREE.Group();
    this.boundaryWallsGroup.position.copy(this.center);
    this.scene.add(this.boundaryWallsGroup);
  }

  private generateTerrain(): void {
    const hasWater = this.config.hasWater !== false && !this.config.texturePath; // Default true for Earth, false for moon

    // First pass: generate terrain without water
    for (const tile of this.polyhedron.tiles) {
      const blocks: HexBlockType[] = [];
      const surfaceDepth = this.getHeightVariation(tile.center);

      for (let depth = 0; depth < this.MAX_DEPTH; depth++) {
        if (depth < surfaceDepth) {
          blocks.push(HexBlockType.AIR);
        } else if (depth === surfaceDepth) {
          // Use sand texture for underwater surfaces (could add SAND type later)
          // For now, use GRASS for land, DIRT for underwater
          if (hasWater && surfaceDepth > this.SEA_LEVEL) {
            // Underwater terrain - use dirt/stone
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
        meshGroup: null,
        isDirty: true,
        boundingSphere
      };

      this.columns.set(tile.index, column);
    }

    // Second pass: fill water in ocean regions (simple sea level fill)
    if (hasWater) {
      this.fillOceans();
    }
  }

  // Fill water in all tiles where terrain is below sea level
  // This creates proper oceans that cover large regions
  private fillOceans(): void {
    for (const [_, column] of this.columns) {
      // Find the surface depth (first non-air block)
      let surfaceDepth = this.MAX_DEPTH;
      for (let d = 0; d < column.blocks.length; d++) {
        if (column.blocks[d] !== HexBlockType.AIR) {
          surfaceDepth = d;
          break;
        }
      }

      // If surface is below sea level, fill air above it with water
      // Water fills from sea level down to the terrain surface
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

  // Call this after setting the center to update all bounding spheres
  public updateBoundingSpheres(): void {
    for (const column of this.columns.values()) {
      column.boundingSphere.center.copy(column.tile.center).add(this.center);
    }
    // Also update LOD group position
    if (this.lodGroup) {
      this.lodGroup.position.copy(this.center);
    }
    // Update boundary walls position
    if (this.boundaryWallsGroup) {
      this.boundaryWallsGroup.position.copy(this.center);
    }
  }

  // Multi-octave noise for continental/ocean terrain generation
  private getHeightVariation(position: THREE.Vector3): number {
    const variation = this.config.heightVariation ?? 1.0;

    // Normalize position to unit sphere for consistent noise sampling
    const dir = position.clone().normalize();

    // Continental scale noise (large features - continents vs oceans)
    // Use lower frequency for bigger continent/ocean shapes
    const continentalNoise = this.fractalNoise3D(dir.x, dir.y, dir.z, 1.5, 3);

    // Medium scale noise (coastal features, bays, peninsulas)
    const coastalNoise = this.fractalNoise3D(dir.x, dir.y, dir.z, 4.0, 2);

    // Fine detail noise (local terrain bumps)
    const detailNoise = this.fractalNoise3D(dir.x, dir.y, dir.z, 8.0, 2);

    // Combine noises with different weights
    // Combined range is approximately -1 to 1
    const combined = continentalNoise * 0.6 + coastalNoise * 0.25 + detailNoise * 0.15;

    // Map combined noise to height:
    // Noise ranges from ~-1 to ~1, centered around 0
    // < -0.1 = deep ocean (depths 4-6)
    // -0.1 to 0.1 = shallow water / coastal (depths 2-3)
    // > 0.1 = land (depths 0-2)
    // This gives roughly 45% ocean, 10% coastal, 45% land

    let depth: number;
    if (combined < -0.1) {
      // Deep ocean - terrain below sea level
      // Map -1 to -0.1 -> depths 4 to 6 (ocean floor)
      const t = (combined + 1) / 0.9; // 0 to 1 as we go from -1 to -0.1
      depth = Math.floor(6 - t * 2 * variation); // 6 to 4
    } else if (combined < 0.1) {
      // Shallow water / coastal transition
      // Map -0.1 to 0.1 -> depths 2 to 3
      const t = (combined + 0.1) / 0.2; // 0 to 1
      depth = Math.floor(3 - t * variation); // 3 to 2
    } else {
      // Land - above water
      // Map 0.1 to 1.0 -> depths 0 to 2 (higher noise = lower depth = taller)
      const t = (combined - 0.1) / 0.9; // 0 to 1 as we go from 0.1 to 1
      depth = Math.floor(2 - t * 2 * variation); // 2 to 0
    }

    // Clamp depth to valid range
    return Math.max(0, Math.min(this.MAX_DEPTH - 1, depth));
  }

  // Fractal Brownian Motion noise for more natural terrain
  private fractalNoise3D(x: number, y: number, z: number, frequency: number, octaves: number): number {
    let value = 0;
    let amplitude = 1;
    let totalAmplitude = 0;
    let freq = frequency;

    for (let i = 0; i < octaves; i++) {
      value += this.smoothNoise3D(x * freq, y * freq, z * freq) * amplitude;
      totalAmplitude += amplitude;
      amplitude *= 0.5;
      freq *= 2;
    }

    return value / totalAmplitude; // Normalize to -1 to 1 range
  }

  // Improved 3D noise with smoothing (returns -1 to 1)
  private smoothNoise3D(x: number, y: number, z: number): number {
    // Use multiple sin waves at different angles for smoother noise
    const n1 = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719);
    const n2 = Math.sin(x * 45.164 + y * 23.456 + z * 89.123);
    const n3 = Math.sin(x * 67.891 + y * 12.345 + z * 56.789);

    // Combine and normalize to -1 to 1
    const combined = (n1 + n2 + n3) / 3;
    return combined;
  }


  public update(playerPosition: THREE.Vector3, camera: THREE.Camera): void {
    this.projScreenMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);

    // Calculate distance from player to planet surface
    const distToCenter = playerPosition.distanceTo(this.center);
    const altitude = distToCenter - this.radius;

    // Update LOD group position
    if (this.lodGroup) {
      this.lodGroup.position.copy(this.center);
    }

    // When very far away, only show LOD (all tiles visible, no detailed meshes)
    if (altitude > PlayerConfig.PLANET_LOD_SWITCH_ALTITUDE) {
      if (!this.isShowingLOD) {
        this.isShowingLOD = true;
        // Show all LOD tiles
        for (const lodMesh of this.lodTileMeshes.values()) {
          lodMesh.visible = true;
        }
        // Hide all detailed meshes
        for (const tileIndex of this.lastVisibleTiles) {
          const column = this.columns.get(tileIndex);
          if (column?.meshGroup) {
            column.meshGroup.visible = false;
          }
        }
        this.lastVisibleTiles.clear();
      }
      return;
    }

    // When close, show detailed meshes and hide LOD tiles in detailed area
    this.isShowingLOD = false;

    // Calculate dynamic render distance based on altitude
    const altitudeRatio = Math.min(1, Math.max(0, altitude / 100)); // 0-100 altitude range
    const minDist = PlayerConfig.PLANET_MIN_RENDER_DISTANCE;
    const maxDist = PlayerConfig.PLANET_MAX_RENDER_DISTANCE;
    const renderDistance = Math.floor(minDist + altitudeRatio * (maxDist - minDist));

    const playerTile = this.polyhedron.getTileAtPoint(playerPosition.clone().sub(this.center));
    if (!playerTile) {
      // Player is far from planet - show all LOD tiles
      for (const lodMesh of this.lodTileMeshes.values()) {
        lodMesh.visible = true;
      }
      return;
    }

    // Only recalculate nearby tiles if player moved to a different tile or render distance changed
    const playerTileIndex = playerTile.index;
    if (playerTileIndex !== this.cachedPlayerTileIndex || renderDistance !== this.cachedRenderDistance) {
      this.cachedPlayerTileIndex = playerTileIndex;
      this.cachedRenderDistance = renderDistance;
      this.cachedNearbyTiles = this.getTilesInRange(playerTileIndex, renderDistance);

      // Update LOD visibility: hide LOD tiles in detailed area, show the rest
      for (const [tileIndex, lodMesh] of this.lodTileMeshes) {
        lodMesh.visible = !this.cachedNearbyTiles.has(tileIndex);
      }

      // Rebuild boundary walls at the edge of the render distance
      this.rebuildBoundaryWalls();
    }

    // Track which tiles are visible this frame
    const currentVisibleTiles = new Set<number>();

    // Only iterate through cached nearby tiles (not all columns)
    for (const tileIndex of this.cachedNearbyTiles) {
      const column = this.columns.get(tileIndex);
      if (!column) continue;

      const inFrustum = this.frustum.intersectsSphere(column.boundingSphere);

      if (inFrustum) {
        if (column.isDirty || !column.meshGroup) {
          this.buildColumnMesh(column);
        }
        if (column.meshGroup) {
          column.meshGroup.visible = true;
          currentVisibleTiles.add(tileIndex);
        }
      } else if (column.meshGroup) {
        column.meshGroup.visible = false;
      }
    }

    // Hide tiles that were visible last frame but not this frame
    for (const tileIndex of this.lastVisibleTiles) {
      if (!currentVisibleTiles.has(tileIndex)) {
        const column = this.columns.get(tileIndex);
        if (column?.meshGroup) {
          column.meshGroup.visible = false;
        }
      }
    }

    this.lastVisibleTiles = currentVisibleTiles;
  }

  private getTilesInRange(centerTileIndex: number, range: number): Set<number> {
    const result = new Set<number>();
    const visited = new Set<number>();

    // Use index-based queue to avoid O(n) shift operations
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

  // Build walls at the boundary between detailed terrain and LOD
  // This fills the gap when terrain is lower than the LOD surface
  private rebuildBoundaryWalls(): void {
    if (!this.boundaryWallsGroup) return;

    // Clear existing walls
    while (this.boundaryWallsGroup.children.length > 0) {
      const child = this.boundaryWallsGroup.children[0];
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
      this.boundaryWallsGroup.remove(child);
    }

    // Find boundary tiles (tiles in nearby set that have neighbors outside)
    const boundaryTiles = new Set<number>();
    for (const tileIndex of this.cachedNearbyTiles) {
      const column = this.columns.get(tileIndex);
      if (!column) continue;

      for (const neighborIndex of column.tile.neighbors) {
        if (!this.cachedNearbyTiles.has(neighborIndex)) {
          boundaryTiles.add(tileIndex);
          break;
        }
      }
    }

    this.cachedBoundaryTiles = boundaryTiles;

    // LOD surface height (at sea level)
    const lodSurfaceRadius = this.radius - this.SEA_LEVEL * this.BLOCK_HEIGHT;

    // Build wall geometry for each boundary tile
    const wallData = { positions: [] as number[], normals: [] as number[], uvs: [] as number[], indices: [] as number[], vertexOffset: 0 };

    for (const tileIndex of boundaryTiles) {
      const column = this.columns.get(tileIndex);
      if (!column) continue;

      // Find terrain surface depth
      let surfaceDepth = 0;
      for (let d = 0; d < column.blocks.length; d++) {
        if (column.blocks[d] !== HexBlockType.AIR && column.blocks[d] !== HexBlockType.WATER) {
          surfaceDepth = d;
          break;
        }
      }

      // Terrain surface height
      const terrainSurfaceRadius = this.radius - surfaceDepth * this.BLOCK_HEIGHT;

      // Only build wall if terrain is below LOD surface (there's a gap to fill)
      if (terrainSurfaceRadius >= lodSurfaceRadius) continue;

      // Build wall from terrain surface up to LOD surface
      // For each edge that faces outside the render area
      for (let i = 0; i < column.tile.neighbors.length; i++) {
        const neighborIndex = column.tile.neighbors[i];
        if (this.cachedNearbyTiles.has(neighborIndex)) continue; // Only walls facing outward

        // Get the two vertices of this edge
        const v1 = column.tile.vertices[i];
        const v2 = column.tile.vertices[(i + 1) % column.tile.vertices.length];

        // Create wall quad from terrain to LOD surface
        const v1Inner = v1.clone().normalize().multiplyScalar(terrainSurfaceRadius);
        const v1Outer = v1.clone().normalize().multiplyScalar(lodSurfaceRadius);
        const v2Inner = v2.clone().normalize().multiplyScalar(terrainSurfaceRadius);
        const v2Outer = v2.clone().normalize().multiplyScalar(lodSurfaceRadius);

        // Calculate outward normal (perpendicular to wall, facing away from center)
        const edgeDir = v2.clone().sub(v1).normalize();
        const radialDir = column.tile.center.clone().normalize();
        const wallNormal = edgeDir.clone().cross(radialDir).normalize();

        // Add quad vertices (two triangles)
        const baseIdx = wallData.vertexOffset;

        // Positions
        wallData.positions.push(v1Inner.x, v1Inner.y, v1Inner.z);
        wallData.positions.push(v1Outer.x, v1Outer.y, v1Outer.z);
        wallData.positions.push(v2Outer.x, v2Outer.y, v2Outer.z);
        wallData.positions.push(v2Inner.x, v2Inner.y, v2Inner.z);

        // Normals (all same for flat shading)
        for (let n = 0; n < 4; n++) {
          wallData.normals.push(wallNormal.x, wallNormal.y, wallNormal.z);
        }

        // UVs
        const wallHeight = (lodSurfaceRadius - terrainSurfaceRadius) / this.BLOCK_HEIGHT;
        wallData.uvs.push(0, 0);
        wallData.uvs.push(0, wallHeight);
        wallData.uvs.push(1, wallHeight);
        wallData.uvs.push(1, 0);

        // Indices (two triangles, wound correctly for outward-facing)
        wallData.indices.push(baseIdx, baseIdx + 2, baseIdx + 1);
        wallData.indices.push(baseIdx, baseIdx + 3, baseIdx + 2);

        wallData.vertexOffset += 4;
      }
    }

    // Create wall mesh if we have any geometry
    if (wallData.positions.length > 0) {
      const geom = this.createBufferGeometry(wallData);
      const mesh = new THREE.Mesh(geom, this.meshBuilder.getSideMaterial());
      this.boundaryWallsGroup.add(mesh);
    }
  }

  private buildColumnMesh(column: PlanetColumn): void {
    // Dispose old mesh group
    if (column.meshGroup) {
      this.scene.remove(column.meshGroup);
      column.meshGroup.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
        }
      });
    }

    // Separate geometry batches for each material type
    const topData = { positions: [] as number[], normals: [] as number[], uvs: [] as number[], indices: [] as number[], vertexOffset: 0 };
    const sideData = { positions: [] as number[], normals: [] as number[], uvs: [] as number[], indices: [] as number[], vertexOffset: 0 };
    const stoneData = { positions: [] as number[], normals: [] as number[], uvs: [] as number[], indices: [] as number[], vertexOffset: 0 };
    const waterData = { positions: [] as number[], normals: [] as number[], uvs: [] as number[], indices: [] as number[], vertexOffset: 0 };

    const blockDepths: number[] = [];

    // Find the first solid (non-air, non-water) block depth (surface level)
    let surfaceDepth = 0;
    for (let d = 0; d < column.blocks.length; d++) {
      if (column.blocks[d] !== HexBlockType.AIR && column.blocks[d] !== HexBlockType.WATER) {
        surfaceDepth = d;
        break;
      }
    }

    // Only render blocks near the surface (optimization: skip deep underground blocks)
    const maxRenderDepth = Math.min(surfaceDepth + 4, column.blocks.length);

    for (let depth = 0; depth < maxRenderDepth; depth++) {
      const blockType = column.blocks[depth];
      if (blockType === HexBlockType.AIR) continue;

      const isWater = blockType === HexBlockType.WATER;

      // For water, check if exposed to air; for solid blocks, also check water exposure
      const blockAbove = depth === 0 ? HexBlockType.AIR : column.blocks[depth - 1];
      const blockBelow = depth === maxRenderDepth - 1 ? HexBlockType.AIR : column.blocks[depth + 1];

      const hasTopExposed = blockAbove === HexBlockType.AIR || (isWater && false) || (!isWater && blockAbove === HexBlockType.WATER);
      const hasBottomExposed = blockBelow === HexBlockType.AIR || (!isWater && blockBelow === HexBlockType.WATER);

      // For water, only render top surface (at sea level)
      if (isWater) {
        // Only render water top face if exposed to air above
        if (blockAbove !== HexBlockType.AIR) continue;
      }

      // Calculate hasSideExposed once (expensive operation)
      const hasSideExposed = !isWater && this.hasExposedSide(column, depth);

      // Skip if nothing is exposed
      if (!isWater && !hasTopExposed && !hasBottomExposed && !hasSideExposed) continue;

      const outerRadius = this.radius - depth * this.BLOCK_HEIGHT;
      const innerRadius = outerRadius - this.BLOCK_HEIGHT;
      if (innerRadius <= 0) continue;

      // Determine if this is a deep block (uses stone texture for everything)
      const depthFromSurface = depth - surfaceDepth;
      const isDeep = depthFromSurface >= this.DEEP_THRESHOLD;

      // Get separate geometries for each face type
      // Build geometry relative to local origin (0,0,0) since mesh group is positioned at this.center
      const { top, bottom, sides } = this.meshBuilder.createSeparateGeometries(
        column.tile,
        innerRadius,
        outerRadius,
        new THREE.Vector3(0, 0, 0),  // Local origin, not planet center
        isWater ? true : hasTopExposed,  // Water only needs top face
        isWater ? false : hasBottomExposed,
        hasSideExposed
      );

      // Add top face to appropriate batch
      if (top) {
        const posAttr = top.getAttribute('position');
        const normAttr = top.getAttribute('normal');
        const uvAttr = top.getAttribute('uv');
        const indexAttr = top.getIndex();
        if (posAttr && normAttr && uvAttr && indexAttr) {
          if (isWater) {
            this.mergeGeometry(waterData, posAttr, normAttr, uvAttr, indexAttr);
          } else if (isDeep) {
            this.mergeGeometry(stoneData, posAttr, normAttr, uvAttr, indexAttr);
          } else {
            // Top faces always use grass (topData)
            this.mergeGeometry(topData, posAttr, normAttr, uvAttr, indexAttr);
          }
        }
        top.dispose();
      }

      // Add bottom face to stone batch (always stone) - skip for water
      if (bottom && !isWater) {
        const posAttr = bottom.getAttribute('position');
        const normAttr = bottom.getAttribute('normal');
        const uvAttr = bottom.getAttribute('uv');
        const indexAttr = bottom.getIndex();
        if (posAttr && normAttr && uvAttr && indexAttr) {
          this.mergeGeometry(stoneData, posAttr, normAttr, uvAttr, indexAttr);
        }
        bottom.dispose();
      }

      // Add side faces to appropriate batch - skip for water
      if (sides && !isWater) {
        const posAttr = sides.getAttribute('position');
        const normAttr = sides.getAttribute('normal');
        const uvAttr = sides.getAttribute('uv');
        const indexAttr = sides.getIndex();
        if (posAttr && normAttr && uvAttr && indexAttr) {
          if (isDeep) {
            this.mergeGeometry(stoneData, posAttr, normAttr, uvAttr, indexAttr);
          } else {
            // Side faces use dirt (sideData)
            this.mergeGeometry(sideData, posAttr, normAttr, uvAttr, indexAttr);
          }
        }
        sides.dispose();
      }

      blockDepths.push(depth);
    }

    // Create mesh group
    const group = new THREE.Group();

    // Create top mesh (grass)
    if (topData.positions.length > 0) {
      const geom = this.createBufferGeometry(topData);
      const mesh = new THREE.Mesh(geom, this.meshBuilder.getTopMaterial());
      mesh.userData = { tileIndex: column.tile.index, faceType: 'top' };
      group.add(mesh);
    }

    // Create side mesh (dirt)
    if (sideData.positions.length > 0) {
      const geom = this.createBufferGeometry(sideData);
      const mesh = new THREE.Mesh(geom, this.meshBuilder.getSideMaterial());
      mesh.userData = { tileIndex: column.tile.index, faceType: 'side' };
      group.add(mesh);
    }

    // Create stone mesh
    if (stoneData.positions.length > 0) {
      const geom = this.createBufferGeometry(stoneData);
      const mesh = new THREE.Mesh(geom, this.meshBuilder.getStoneMaterial());
      mesh.userData = { tileIndex: column.tile.index, faceType: 'stone' };
      group.add(mesh);
    }

    // Create water mesh
    if (waterData.positions.length > 0) {
      const geom = this.createBufferGeometry(waterData);
      const mesh = new THREE.Mesh(geom, this.meshBuilder.getWaterMaterial());
      mesh.userData = { tileIndex: column.tile.index, faceType: 'water' };
      mesh.renderOrder = 1; // Render water after opaque objects
      group.add(mesh);
    }

    if (group.children.length === 0) {
      column.meshGroup = null;
      column.isDirty = false;
      return;
    }

    // Position group at planet center (for moons/offset planets)
    group.position.copy(this.center);

    group.userData = { tileIndex: column.tile.index, blockDepths };
    column.meshGroup = group;
    column.isDirty = false;
    this.scene.add(group);
  }

  private mergeGeometry(
    data: { positions: number[], normals: number[], uvs: number[], indices: number[], vertexOffset: number },
    posAttr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
    normAttr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
    uvAttr: THREE.BufferAttribute | THREE.InterleavedBufferAttribute,
    indexAttr: THREE.BufferAttribute
  ): void {
    for (let i = 0; i < posAttr.count; i++) {
      data.positions.push(posAttr.getX(i), posAttr.getY(i), posAttr.getZ(i));
      data.normals.push(normAttr.getX(i), normAttr.getY(i), normAttr.getZ(i));
      data.uvs.push(uvAttr.getX(i), uvAttr.getY(i));
    }

    for (let i = 0; i < indexAttr.count; i++) {
      data.indices.push(indexAttr.getX(i) + data.vertexOffset);
    }

    data.vertexOffset += posAttr.count;
  }

  private createBufferGeometry(data: { positions: number[], normals: number[], uvs: number[], indices: number[] }): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
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
        // Solid blocks are exposed to air or water
        if (isSolid && (neighborBlock === HexBlockType.AIR || neighborBlock === HexBlockType.WATER)) {
          return true;
        }
        // Water is exposed only to air (for side rendering if we decide to add it)
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

    for (const neighborIndex of column.tile.neighbors) {
      const neighbor = this.columns.get(neighborIndex);
      if (neighbor) neighbor.isDirty = true;
    }

    // If we removed a solid block, check if water should flow in
    if (this.meshBuilder.isSolid(oldBlockType) && blockType === HexBlockType.AIR) {
      this.simulateWaterFlow(tileIndex, depth);
    }
  }

  // Simulate water flowing into a newly exposed void
  private simulateWaterFlow(tileIndex: number, depth: number): void {
    const column = this.columns.get(tileIndex);
    if (!column) return;

    // Check if any adjacent cell has water that could flow in
    let hasAdjacentWater = false;
    let minWaterDepth = this.MAX_DEPTH;

    // Check block above (depth - 1) for water falling down
    if (depth > 0 && column.blocks[depth - 1] === HexBlockType.WATER) {
      hasAdjacentWater = true;
      minWaterDepth = Math.min(minWaterDepth, depth - 1);
    }

    // Check horizontal neighbors at same depth for water flowing in
    for (const neighborIndex of column.tile.neighbors) {
      const neighbor = this.columns.get(neighborIndex);
      if (neighbor && neighbor.blocks[depth] === HexBlockType.WATER) {
        hasAdjacentWater = true;
        minWaterDepth = Math.min(minWaterDepth, depth);
      }
    }

    if (!hasAdjacentWater) return;

    // Water flows in - fill this cell and rebalance the basin
    // Find connected water basin and redistribute
    this.rebalanceWaterBasin(tileIndex, depth);
  }

  // Rebalance water in a connected basin after a change
  private rebalanceWaterBasin(startTileIndex: number, startDepth: number): void {
    // Find all connected water and air cells that form a basin
    const visited = new Set<string>();
    const queue: { tileIndex: number, depth: number }[] = [{ tileIndex: startTileIndex, depth: startDepth }];
    const basinCells: { tileIndex: number, depth: number, isWater: boolean }[] = [];

    // First, find all cells connected to water at or above the start depth
    while (queue.length > 0) {
      const { tileIndex, depth } = queue.shift()!;
      const key = `${tileIndex}-${depth}`;

      if (visited.has(key)) continue;
      visited.add(key);

      const column = this.columns.get(tileIndex);
      if (!column || depth < 0 || depth >= column.blocks.length) continue;

      const blockType = column.blocks[depth];

      // Only process air and water blocks
      if (blockType !== HexBlockType.AIR && blockType !== HexBlockType.WATER) continue;

      basinCells.push({ tileIndex, depth, isWater: blockType === HexBlockType.WATER });

      // Check vertical neighbors
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

      // Check horizontal neighbors at same depth
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

    // Count total water blocks
    const totalWater = basinCells.filter(c => c.isWater).length;
    if (totalWater === 0) return;

    // Sort cells by depth (deeper first - water settles at bottom)
    basinCells.sort((a, b) => b.depth - a.depth);

    // Redistribute water to fill from bottom up
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

    // Apply changes
    for (const cell of cellsToFill) {
      const column = this.columns.get(cell.tileIndex);
      if (column && column.blocks[cell.depth] !== HexBlockType.WATER) {
        column.blocks[cell.depth] = HexBlockType.WATER;
        column.isDirty = true;
        // Mark neighbors dirty too
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
        // Mark neighbors dirty too
        for (const neighborIndex of column.tile.neighbors) {
          const neighbor = this.columns.get(neighborIndex);
          if (neighbor) neighbor.isDirty = true;
        }
      }
    }
  }

  public getTileAtPoint(point: THREE.Vector3): HexTile | null {
    // Convert world position to planet-local position
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
        // Return world position (local + center offset)
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

  // Get surface height (distance from center) for a given direction
  // Returns height of solid ground (skips water)
  public getSurfaceHeightInDirection(direction: THREE.Vector3): number {
    // Find tile at this direction
    const tile = this.polyhedron.getTileAtPoint(direction.clone().multiplyScalar(this.radius));
    if (!tile) return this.radius;

    const column = this.columns.get(tile.index);
    if (!column) return this.radius;

    // Find first solid block (skip air and water)
    for (let depth = 0; depth < column.blocks.length; depth++) {
      const block = column.blocks[depth];
      if (block !== HexBlockType.AIR && block !== HexBlockType.WATER) {
        return this.radius - depth * this.BLOCK_HEIGHT;
      }
    }
    return this.radius;
  }

  // Check if a direction points to underwater terrain (for tree placement filtering)
  public isUnderwaterInDirection(direction: THREE.Vector3): boolean {
    const tile = this.polyhedron.getTileAtPoint(direction.clone().multiplyScalar(this.radius));
    if (!tile) return false;

    const column = this.columns.get(tile.index);
    if (!column) return false;

    // Check if there's water at or above the surface
    for (let depth = 0; depth < column.blocks.length; depth++) {
      const block = column.blocks[depth];
      if (block === HexBlockType.WATER) return true;
      if (block !== HexBlockType.AIR) return false; // Hit solid ground first
    }
    return false;
  }

  public getPolyhedron(): GoldbergPolyhedron {
    return this.polyhedron;
  }

  // Check if a world position is inside water (below water surface)
  public isInWater(position: THREE.Vector3): boolean {
    const tile = this.getTileAtPoint(position);
    if (!tile) return false;

    const column = this.columns.get(tile.index);
    if (!column) return false;

    // Find the water surface (first water block from top)
    let waterSurfaceDepth = -1;
    for (let d = 0; d < column.blocks.length; d++) {
      if (column.blocks[d] === HexBlockType.WATER) {
        waterSurfaceDepth = d;
        break;
      }
    }

    if (waterSurfaceDepth < 0) return false; // No water in this column

    // Check if player's position is at or below water surface level
    const playerDepth = this.getDepthAtPoint(position);
    return playerDepth >= waterSurfaceDepth;
  }

  // Get depth of water at position (how deep player is submerged)
  // Returns 0 if not in water, positive value = depth below water surface
  public getWaterDepth(position: THREE.Vector3): number {
    const tile = this.getTileAtPoint(position);
    if (!tile) return 0;

    const column = this.columns.get(tile.index);
    if (!column) return 0;

    const currentDepth = this.getDepthAtPoint(position);

    // Find the water surface (first water block from top)
    let waterSurfaceDepth = -1;
    for (let d = 0; d < column.blocks.length; d++) {
      if (column.blocks[d] === HexBlockType.WATER) {
        waterSurfaceDepth = d;
        break;
      }
    }

    if (waterSurfaceDepth < 0) return 0; // No water in this column

    // Check if player is below water surface
    if (currentDepth >= waterSurfaceDepth) {
      // Return how many blocks deep (higher = deeper)
      return (currentDepth - waterSurfaceDepth + 1) * this.BLOCK_HEIGHT;
    }

    return 0;
  }

  public buildAllMeshes(): void {
    for (const column of this.columns.values()) {
      if (column.isDirty) {
        this.buildColumnMesh(column);
      }
    }
  }
}
