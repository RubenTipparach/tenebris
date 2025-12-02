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
  indices: number[];
  vertexOffset: number;
}

function createEmptyGeometryData(): GeometryData {
  return { positions: [], normals: [], uvs: [], indices: [], vertexOffset: 0 };
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

  // LOD system - single batched LOD mesh
  private lodMesh: THREE.Mesh | null = null;
  private lodWaterMesh: THREE.Mesh | null = null; // Separate LOD water mesh for visibility control
  private lodTileVisibility: Map<number, boolean> = new Map(); // Track which LOD tiles should be visible
  private needsLODRebuild: boolean = false; // Flag to rebuild LOD mesh when terrain changes

  // Boundary walls group (fills gap between detailed terrain and LOD at render distance edge)
  private boundaryWallsGroup: THREE.Group | null = null;

  // Cache for tile range lookups (avoid BFS every frame)
  private cachedPlayerTileIndex: number = -1;
  private cachedRenderDistance: number = -1;
  private cachedNearbyTiles: Set<number> = new Set();

  // Batched meshes for visible terrain (one mesh per material type = ~5 draw calls total)
  private batchedMeshGroup: THREE.Group | null = null;
  private topMesh: THREE.Mesh | null = null;
  private sideMesh: THREE.Mesh | null = null;
  private stoneMesh: THREE.Mesh | null = null;
  private waterMesh: THREE.Mesh | null = null;
  private needsRebatch: boolean = true; // Flag to rebuild batched geometry

  private readonly BLOCK_HEIGHT = 1;
  private readonly MAX_DEPTH = 16;
  private readonly DEEP_THRESHOLD = 4; // Depth at which we switch to stone texture
  private readonly SEA_LEVEL: number; // Depth at which water surface sits
  private readonly seed: number; // Terrain generation seed

  constructor(scene: THREE.Scene, radius: number = 50, subdivisions: number = 3, config: PlanetConfig = {}) {
    this.scene = scene;
    this.radius = radius;
    this.center = new THREE.Vector3(0, 0, 0);
    this.config = config;
    this.SEA_LEVEL = config.seaLevel ?? 2;
    this.seed = PlayerConfig.TERRAIN_SEED;
    this.polyhedron = new GoldbergPolyhedron(radius, subdivisions);
    this.meshBuilder = new HexBlockMeshBuilder();
  }

  public async initialize(): Promise<void> {
    await this.meshBuilder.loadTextures(this.config.texturePath);
    this.generateTerrain();
    this.createLODMesh();
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

    // Create a single batched LOD mesh for the entire planet
    // Offset LOD inward so detailed terrain renders on top (depth buffer handles occlusion)
    const lodOffset = 0.5; // Larger offset ensures LOD is clearly behind detailed terrain
    const lodOuterRadius = this.radius - this.SEA_LEVEL * this.BLOCK_HEIGHT - lodOffset;
    const lodInnerRadius = lodOuterRadius - 0.1;

    // Batch all LOD tiles into material groups
    // Water tiles that are in the detailed render range are excluded to prevent overlap
    const grassData = createEmptyGeometryData();
    const dirtData = createEmptyGeometryData();
    const waterData = createEmptyGeometryData();

    for (const [tileIndex, column] of this.columns) {
      // Skip ALL tiles that are in the detailed render range
      // This prevents LOD from showing through/over detailed terrain
      if (this.cachedNearbyTiles.has(tileIndex)) {
        continue;
      }

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
        true, false, false
      );

      if (top) {
        const posAttr = top.getAttribute('position');
        const normAttr = top.getAttribute('normal');
        const uvAttr = top.getAttribute('uv');
        const indexAttr = top.getIndex();

        if (posAttr && normAttr && uvAttr && indexAttr) {
          if (surfaceBlockType === HexBlockType.WATER) {
            this.mergeGeometry(waterData, posAttr, normAttr, uvAttr, indexAttr);
          } else if (surfaceBlockType === HexBlockType.DIRT) {
            this.mergeGeometry(dirtData, posAttr, normAttr, uvAttr, indexAttr);
          } else {
            this.mergeGeometry(grassData, posAttr, normAttr, uvAttr, indexAttr);
          }
        }
        top.dispose();
      }

      this.lodTileVisibility.set(tileIndex, true);
    }

    // Create LOD group with batched meshes (using LOD materials with polygonOffset)
    const lodGroup = new THREE.Group();

    if (grassData.positions.length > 0) {
      const geom = this.createBufferGeometry(grassData);
      const mesh = new THREE.Mesh(geom, this.meshBuilder.getTopLODMaterial());
      lodGroup.add(mesh);
    }

    if (dirtData.positions.length > 0) {
      const geom = this.createBufferGeometry(dirtData);
      const mesh = new THREE.Mesh(geom, this.meshBuilder.getSideLODMaterial());
      lodGroup.add(mesh);
    }

    if (waterData.positions.length > 0) {
      const geom = this.createBufferGeometry(waterData);
      this.lodWaterMesh = new THREE.Mesh(geom, this.meshBuilder.getWaterLODMaterial());
      this.lodWaterMesh.renderOrder = -2; // Render before detailed water (which is renderOrder 1)
      lodGroup.add(this.lodWaterMesh);
    }

    lodGroup.position.copy(this.center);
    lodGroup.renderOrder = -1; // Render LOD before detailed terrain
    this.scene.add(lodGroup);
    this.lodMesh = lodGroup as unknown as THREE.Mesh; // Store as group

    this.needsLODRebuild = false;
  }

  private generateTerrain(): void {
    const hasWater = this.config.hasWater !== false && !this.config.texturePath;

    for (const tile of this.polyhedron.tiles) {
      const blocks: HexBlockType[] = [];
      const surfaceDepth = this.getHeightVariation(tile.center);

      for (let depth = 0; depth < this.MAX_DEPTH; depth++) {
        if (depth < surfaceDepth) {
          blocks.push(HexBlockType.AIR);
        } else if (depth === surfaceDepth) {
          if (hasWater && surfaceDepth > this.SEA_LEVEL) {
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
    for (const [_, column] of this.columns) {
      let surfaceDepth = this.MAX_DEPTH;
      for (let d = 0; d < column.blocks.length; d++) {
        if (column.blocks[d] !== HexBlockType.AIR) {
          surfaceDepth = d;
          break;
        }
      }

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
  }

  private getHeightVariation(position: THREE.Vector3): number {
    const variation = this.config.heightVariation ?? 1.0;
    const dir = position.clone().normalize();

    const continentalNoise = this.fractalNoise3D(dir.x, dir.y, dir.z, 1.5, 3);
    const coastalNoise = this.fractalNoise3D(dir.x, dir.y, dir.z, 4.0, 2);
    const detailNoise = this.fractalNoise3D(dir.x, dir.y, dir.z, 8.0, 2);

    const combined = continentalNoise * 0.6 + coastalNoise * 0.25 + detailNoise * 0.15;

    let depth: number;
    if (combined < -0.1) {
      const t = (combined + 1) / 0.9;
      depth = Math.floor(6 - t * 2 * variation);
    } else if (combined < 0.1) {
      const t = (combined + 0.1) / 0.2;
      depth = Math.floor(3 - t * variation);
    } else {
      const t = (combined - 0.1) / 0.9;
      depth = Math.floor(2 - t * 2 * variation);
    }

    return Math.max(0, Math.min(this.MAX_DEPTH - 1, depth));
  }

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

    return value / totalAmplitude;
  }

  private smoothNoise3D(x: number, y: number, z: number): number {
    // Incorporate seed into noise calculation for reproducible terrain
    const s = this.seed * 0.0001;
    const n1 = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + s);
    const n2 = Math.sin(x * 45.164 + y * 23.456 + z * 89.123 + s * 1.7);
    const n3 = Math.sin(x * 67.891 + y * 12.345 + z * 56.789 + s * 2.3);
    return (n1 + n2 + n3) / 3;
  }

  public update(playerPosition: THREE.Vector3, camera: THREE.Camera): void {
    profiler.begin('Planet.frustum');
    this.projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    this.frustum.setFromProjectionMatrix(this.projScreenMatrix);
    profiler.end('Planet.frustum');

    const distToCenter = playerPosition.distanceTo(this.center);
    const altitude = distToCenter - this.radius;

    // When very far away, only show LOD (including LOD water)
    if (altitude > PlayerConfig.PLANET_LOD_SWITCH_ALTITUDE) {
      // Clear cached nearby tiles so LOD water is not culled
      if (this.cachedNearbyTiles.size > 0) {
        this.cachedNearbyTiles.clear();
        this.cachedPlayerTileIndex = -1;
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
    if (this.lodWaterMesh) this.lodWaterMesh.visible = true; // Show LOD water for distant tiles
    if (this.batchedMeshGroup) this.batchedMeshGroup.visible = true;

    const altitudeRatio = Math.min(1, Math.max(0, altitude / 100));
    const minDist = PlayerConfig.PLANET_MIN_RENDER_DISTANCE;
    const maxDist = PlayerConfig.PLANET_MAX_RENDER_DISTANCE;
    const renderDistance = Math.floor(minDist + altitudeRatio * (maxDist - minDist));

    profiler.begin('Planet.getTile');
    const playerTile = this.polyhedron.getTileAtPoint(playerPosition.clone().sub(this.center));
    profiler.end('Planet.getTile');

    if (!playerTile) {
      return;
    }

    const playerTileIndex = playerTile.index;

    // Check if we need to recalculate nearby tiles
    if (playerTileIndex !== this.cachedPlayerTileIndex || renderDistance !== this.cachedRenderDistance) {
      profiler.begin('Planet.tilesInRange');
      this.cachedPlayerTileIndex = playerTileIndex;
      this.cachedRenderDistance = renderDistance;
      this.cachedNearbyTiles = this.getTilesInRange(playerTileIndex, renderDistance);
      this.needsRebatch = true;
      this.needsLODRebuild = true; // Rebuild LOD to exclude water tiles in new nearby range
      profiler.end('Planet.tilesInRange');

      profiler.begin('Planet.boundaryWalls');
      this.rebuildBoundaryWalls();
      profiler.end('Planet.boundaryWalls');
    }

    // Check if any tile in view is dirty
    for (const tileIndex of this.cachedNearbyTiles) {
      const column = this.columns.get(tileIndex);
      if (column?.isDirty) {
        this.needsRebatch = true;
        break;
      }
    }

    // Rebuild batched geometry if needed
    if (this.needsRebatch) {
      profiler.begin('Planet.rebatch');
      this.rebuildBatchedMeshes();
      profiler.end('Planet.rebatch');
    }

    // Rebuild LOD mesh if terrain has changed (mining, etc.)
    if (this.needsLODRebuild) {
      profiler.begin('Planet.LODRebuild');
      this.rebuildLODMesh();
      profiler.end('Planet.LODRebuild');
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

    const maxRenderDepth = Math.min(surfaceDepth + 4, column.blocks.length);

    for (let depth = 0; depth < maxRenderDepth; depth++) {
      const blockType = column.blocks[depth];
      if (blockType === HexBlockType.AIR) continue;

      const isWater = blockType === HexBlockType.WATER;
      const blockAbove = depth === 0 ? HexBlockType.AIR : column.blocks[depth - 1];
      const blockBelow = depth === maxRenderDepth - 1 ? HexBlockType.AIR : column.blocks[depth + 1];

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
            this.mergeGeometry(waterData, posAttr, normAttr, uvAttr, indexAttr);
          } else if (isDeep) {
            this.mergeGeometry(stoneData, posAttr, normAttr, uvAttr, indexAttr);
          } else {
            this.mergeGeometry(topData, posAttr, normAttr, uvAttr, indexAttr);
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
          this.mergeGeometry(stoneData, posAttr, normAttr, uvAttr, indexAttr);
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
            this.mergeGeometry(stoneData, posAttr, normAttr, uvAttr, indexAttr);
          } else {
            this.mergeGeometry(sideData, posAttr, normAttr, uvAttr, indexAttr);
          }
        }
        sides.dispose();
      }
    }
  }

  public updateWaterShader(time: number): void {
    this.meshBuilder.updateWaterShader(time, this.center);
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

    while (this.boundaryWallsGroup.children.length > 0) {
      const child = this.boundaryWallsGroup.children[0];
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
      this.boundaryWallsGroup.remove(child);
    }

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

    const lodSurfaceRadius = this.radius - this.SEA_LEVEL * this.BLOCK_HEIGHT;
    const wallData = createEmptyGeometryData();

    for (const tileIndex of boundaryTiles) {
      const column = this.columns.get(tileIndex);
      if (!column) continue;

      let surfaceDepth = 0;
      for (let d = 0; d < column.blocks.length; d++) {
        if (column.blocks[d] !== HexBlockType.AIR && column.blocks[d] !== HexBlockType.WATER) {
          surfaceDepth = d;
          break;
        }
      }

      const terrainSurfaceRadius = this.radius - surfaceDepth * this.BLOCK_HEIGHT;
      if (terrainSurfaceRadius >= lodSurfaceRadius) continue;

      for (let i = 0; i < column.tile.neighbors.length; i++) {
        const neighborIndex = column.tile.neighbors[i];
        if (this.cachedNearbyTiles.has(neighborIndex)) continue;

        const v1 = column.tile.vertices[i];
        const v2 = column.tile.vertices[(i + 1) % column.tile.vertices.length];

        const v1Inner = v1.clone().normalize().multiplyScalar(terrainSurfaceRadius);
        const v1Outer = v1.clone().normalize().multiplyScalar(lodSurfaceRadius);
        const v2Inner = v2.clone().normalize().multiplyScalar(terrainSurfaceRadius);
        const v2Outer = v2.clone().normalize().multiplyScalar(lodSurfaceRadius);

        const edgeDir = v2.clone().sub(v1).normalize();
        const radialDir = column.tile.center.clone().normalize();
        const wallNormal = edgeDir.clone().cross(radialDir).normalize();

        const baseIdx = wallData.vertexOffset;

        wallData.positions.push(v1Inner.x, v1Inner.y, v1Inner.z);
        wallData.positions.push(v1Outer.x, v1Outer.y, v1Outer.z);
        wallData.positions.push(v2Outer.x, v2Outer.y, v2Outer.z);
        wallData.positions.push(v2Inner.x, v2Inner.y, v2Inner.z);

        for (let n = 0; n < 4; n++) {
          wallData.normals.push(wallNormal.x, wallNormal.y, wallNormal.z);
        }

        const wallHeight = (lodSurfaceRadius - terrainSurfaceRadius) / this.BLOCK_HEIGHT;
        wallData.uvs.push(0, 0, 0, wallHeight, 1, wallHeight, 1, 0);

        wallData.indices.push(baseIdx, baseIdx + 2, baseIdx + 1);
        wallData.indices.push(baseIdx, baseIdx + 3, baseIdx + 2);

        wallData.vertexOffset += 4;
      }
    }

    if (wallData.positions.length > 0) {
      const geom = this.createBufferGeometry(wallData);
      const mesh = new THREE.Mesh(geom, this.meshBuilder.getSideMaterial());
      this.boundaryWallsGroup.add(mesh);
    }
  }

  private mergeGeometry(
    data: GeometryData,
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

  private createBufferGeometry(data: GeometryData): THREE.BufferGeometry {
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
  // Returns { tileIndex, depth, blockType, point } or null if no hit
  public raycast(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number): {
    tileIndex: number;
    depth: number;
    blockType: HexBlockType;
    point: THREE.Vector3;
  } | null {
    // Step along the ray and check for solid blocks
    const stepSize = 0.2; // Small steps for accuracy
    const rayDir = direction.clone().normalize();
    const testPoint = origin.clone();

    for (let dist = 0; dist < maxDistance; dist += stepSize) {
      testPoint.copy(origin).addScaledVector(rayDir, dist);

      const tile = this.getTileAtPoint(testPoint);
      if (!tile) continue;

      const depth = this.getDepthAtPoint(testPoint);
      if (depth < 0 || depth >= this.MAX_DEPTH) continue;

      const blockType = this.getBlock(tile.index, depth);
      if (blockType !== HexBlockType.AIR) {
        return {
          tileIndex: tile.index,
          depth,
          blockType,
          point: testPoint.clone()
        };
      }
    }

    return null;
  }

  // Get the batched mesh group for raycasting (used for highlight positioning)
  public getBatchedMeshGroup(): THREE.Group | null {
    return this.batchedMeshGroup;
  }
}
