import * as THREE from 'three';
import { GoldbergPolyhedron, HexTile } from './GoldbergPolyhedron';
import { HexBlockType, HexBlockMeshBuilder } from './HexBlock';

export interface PlanetConfig {
  texturePath?: string;  // Single texture for all surfaces (like moon)
  heightVariation?: number;  // 0-1, how much terrain varies (default 1.0)
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

  // LOD sphere for distant viewing
  private lodSphere: THREE.Mesh | null = null;
  private isShowingLOD: boolean = false;
  private readonly LOD_DISTANCE = 80; // Distance at which to switch to simple sphere

  private readonly BLOCK_HEIGHT = 1;
  private readonly MAX_DEPTH = 16;
  private readonly MIN_RENDER_DISTANCE = 8;  // Minimum tiles to render when on ground
  private readonly MAX_RENDER_DISTANCE = 50; // Maximum tiles when high altitude
  private readonly DEEP_THRESHOLD = 4; // Depth at which we switch to stone texture

  constructor(scene: THREE.Scene, radius: number = 50, subdivisions: number = 3, config: PlanetConfig = {}) {
    this.scene = scene;
    this.radius = radius;
    this.center = new THREE.Vector3(0, 0, 0);
    this.config = config;
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
    const geometry = new THREE.SphereGeometry(this.radius, 32, 24);
    const material = this.meshBuilder.getTopMaterial().clone() as THREE.MeshLambertMaterial;
    this.lodSphere = new THREE.Mesh(geometry, material);
    this.lodSphere.position.copy(this.center);
    this.lodSphere.visible = false;
    this.scene.add(this.lodSphere);
  }

  private generateTerrain(): void {
    for (const tile of this.polyhedron.tiles) {
      const blocks: HexBlockType[] = [];
      const heightVariation = this.getHeightVariation(tile.center);

      for (let depth = 0; depth < this.MAX_DEPTH; depth++) {
        if (depth < heightVariation) {
          blocks.push(HexBlockType.AIR);
        } else if (depth === heightVariation) {
          blocks.push(HexBlockType.GRASS);
        } else if (depth < heightVariation + 3) {
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
  }

  // Call this after setting the center to update all bounding spheres
  public updateBoundingSpheres(): void {
    for (const column of this.columns.values()) {
      column.boundingSphere.center.copy(column.tile.center).add(this.center);
    }
    // Also update LOD sphere position
    if (this.lodSphere) {
      this.lodSphere.position.copy(this.center);
    }
  }

  private getHeightVariation(position: THREE.Vector3): number {
    const scale = 0.1;
    const noise = this.noise3D(
      position.x * scale,
      position.y * scale,
      position.z * scale
    );
    const variation = this.config.heightVariation ?? 1.0;
    return Math.floor(noise * 3 * variation) + 1;
  }

  private noise3D(x: number, y: number, z: number): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
    return n - Math.floor(n);
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

    // Check if we should show LOD sphere instead of detailed mesh
    if (altitude > this.LOD_DISTANCE) {
      // Show LOD sphere, hide detailed meshes
      if (!this.isShowingLOD) {
        this.isShowingLOD = true;
        if (this.lodSphere) {
          this.lodSphere.visible = true;
        }
        // Hide all column meshes
        for (const column of this.columns.values()) {
          if (column.meshGroup) {
            column.meshGroup.visible = false;
          }
        }
      }
      // Update LOD sphere position in case center changed
      if (this.lodSphere) {
        this.lodSphere.position.copy(this.center);
      }
      return;
    }

    // Show detailed meshes, hide LOD sphere
    if (this.isShowingLOD) {
      this.isShowingLOD = false;
      if (this.lodSphere) {
        this.lodSphere.visible = false;
      }
    }

    // Calculate dynamic render distance based on altitude
    const altitudeRatio = Math.min(1, Math.max(0, altitude / 100)); // 0-100 altitude range
    const renderDistance = Math.floor(
      this.MIN_RENDER_DISTANCE + altitudeRatio * (this.MAX_RENDER_DISTANCE - this.MIN_RENDER_DISTANCE)
    );

    const playerTile = this.polyhedron.getTileAtPoint(playerPosition.clone().sub(this.center));
    if (!playerTile) {
      // Player is far from planet - show all tiles in frustum
      for (const [_, column] of this.columns) {
        const inFrustum = this.frustum.intersectsSphere(column.boundingSphere);
        if (inFrustum) {
          if (column.isDirty || !column.meshGroup) {
            this.buildColumnMesh(column);
          }
          if (column.meshGroup) {
            column.meshGroup.visible = true;
          }
        } else if (column.meshGroup) {
          column.meshGroup.visible = false;
        }
      }
      return;
    }

    const nearbyTiles = this.getTilesInRange(playerTile.index, renderDistance);

    for (const [tileIndex, column] of this.columns) {
      if (nearbyTiles.has(tileIndex)) {
        const inFrustum = this.frustum.intersectsSphere(column.boundingSphere);

        if (inFrustum) {
          if (column.isDirty || !column.meshGroup) {
            this.buildColumnMesh(column);
          }
          if (column.meshGroup) {
            column.meshGroup.visible = true;
          }
        } else if (column.meshGroup) {
          column.meshGroup.visible = false;
        }
      } else if (column.meshGroup) {
        column.meshGroup.visible = false;
      }
    }
  }

  private getTilesInRange(centerTileIndex: number, range: number): Set<number> {
    const result = new Set<number>();
    const visited = new Set<number>();
    const queue: { index: number; distance: number }[] = [{ index: centerTileIndex, distance: 0 }];

    while (queue.length > 0) {
      const current = queue.shift()!;
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

    const blockDepths: number[] = [];

    // Find the first solid block depth (surface level)
    let surfaceDepth = 0;
    for (let d = 0; d < column.blocks.length; d++) {
      if (column.blocks[d] !== HexBlockType.AIR) {
        surfaceDepth = d;
        break;
      }
    }

    for (let depth = 0; depth < column.blocks.length; depth++) {
      const blockType = column.blocks[depth];
      if (blockType === HexBlockType.AIR) continue;

      const hasTopExposed = depth === 0 || column.blocks[depth - 1] === HexBlockType.AIR;
      const hasBottomExposed = depth === column.blocks.length - 1 || column.blocks[depth + 1] === HexBlockType.AIR;
      const hasSideExposed = this.hasExposedSide(column, depth);

      if (!hasTopExposed && !hasBottomExposed && !hasSideExposed) continue;

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
        hasTopExposed,
        hasBottomExposed,
        hasSideExposed
      );

      // Add top face to appropriate batch
      if (top) {
        const posAttr = top.getAttribute('position');
        const normAttr = top.getAttribute('normal');
        const uvAttr = top.getAttribute('uv');
        const indexAttr = top.getIndex();
        if (posAttr && normAttr && uvAttr && indexAttr) {
          if (isDeep) {
            this.mergeGeometry(stoneData, posAttr, normAttr, uvAttr, indexAttr);
          } else {
            // Top faces always use grass (topData)
            this.mergeGeometry(topData, posAttr, normAttr, uvAttr, indexAttr);
          }
        }
        top.dispose();
      }

      // Add bottom face to stone batch (always stone)
      if (bottom) {
        const posAttr = bottom.getAttribute('position');
        const normAttr = bottom.getAttribute('normal');
        const uvAttr = bottom.getAttribute('uv');
        const indexAttr = bottom.getIndex();
        if (posAttr && normAttr && uvAttr && indexAttr) {
          this.mergeGeometry(stoneData, posAttr, normAttr, uvAttr, indexAttr);
        }
        bottom.dispose();
      }

      // Add side faces to appropriate batch
      if (sides) {
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
    for (const neighborIndex of column.tile.neighbors) {
      const neighborColumn = this.columns.get(neighborIndex);
      if (!neighborColumn) continue;
      if (depth < neighborColumn.blocks.length &&
          neighborColumn.blocks[depth] === HexBlockType.AIR) {
        return true;
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

    column.blocks[depth] = blockType;
    column.isDirty = true;

    for (const neighborIndex of column.tile.neighbors) {
      const neighbor = this.columns.get(neighborIndex);
      if (neighbor) neighbor.isDirty = true;
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

  public getPolyhedron(): GoldbergPolyhedron {
    return this.polyhedron;
  }

  public buildAllMeshes(): void {
    for (const column of this.columns.values()) {
      if (column.isDirty) {
        this.buildColumnMesh(column);
      }
    }
  }
}
