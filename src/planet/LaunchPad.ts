import * as THREE from 'three';
import { getAssetPath } from '../utils/assetPath';
import { HexTile } from './GoldbergPolyhedron';
import { PlayerConfig } from '../config/PlayerConfig';
import techVert from '../shaders/tech/tech.vert';
import techFrag from '../shaders/tech/tech.frag';

// Launch Pad placement data
export interface PlacedLaunchPad {
  mesh: THREE.Group;  // Group containing base + segments
  position: THREE.Vector3;
  centerTileIndex: number;  // The center hex of the 7-hex cluster
  surroundingTileIndices: number[];  // The 6 surrounding hexes
  rotation: number;
  // Tower segments (left column in UI, max 8)
  segmentCount: number;
  segmentMeshes: THREE.Mesh[];
  // Rocket blocks (right column in UI, max = segmentCount)
  rocketBlocks: number;
  rocketMeshes: THREE.Mesh[];
}

// Validation result for launch pad placement
export interface LaunchPadPlacementResult {
  canPlace: boolean;
  reason?: string;
  centerTile?: HexTile;
  surroundingTiles?: HexTile[];
}

export class LaunchPadManager {
  private scene: THREE.Scene;
  private launchPads: PlacedLaunchPad[] = [];
  private launchPadMeshes: THREE.Object3D[] = [];  // For raycasting
  private textureLoader: THREE.TextureLoader;

  // Geometry and materials
  private baseGeometry: THREE.CylinderGeometry | null = null;
  private baseMaterial: THREE.ShaderMaterial | null = null;
  private segmentGeometry: THREE.BoxGeometry | null = null;
  private segmentMaterial: THREE.ShaderMaterial | null = null;

  // Planet lighting uniforms
  private planetCenter: THREE.Vector3;
  private sunDirection: THREE.Vector3;

  // Size constants
  private readonly BASE_RADIUS = 1.0;  // Radius of hexagonal base
  private readonly BASE_HEIGHT = 0.25; // 1/4 of normal block height (which is 1)
  private readonly SEGMENT_SIZE = 2.0;  // Segment tower piece
  private readonly SEGMENT_HEIGHT = 1.0;  // Height per segment
  private readonly MAX_SEGMENTS = 8;

  constructor(scene: THREE.Scene, planetCenter?: THREE.Vector3, sunDirection?: THREE.Vector3) {
    this.scene = scene;
    this.textureLoader = new THREE.TextureLoader();
    this.planetCenter = planetCenter?.clone() || new THREE.Vector3(0, 0, 0);
    this.sunDirection = sunDirection?.clone() || new THREE.Vector3(1, 0, 0);
    this.initGeometryAndMaterials();
  }

  // Update sun direction (for day/night cycle)
  public setSunDirection(direction: THREE.Vector3): void {
    this.sunDirection.copy(direction);
    if (this.baseMaterial) {
      this.baseMaterial.uniforms.sunDirection.value.copy(direction);
    }
    if (this.segmentMaterial) {
      this.segmentMaterial.uniforms.sunDirection.value.copy(direction);
    }
  }

  // Update planet center
  public setPlanetCenter(center: THREE.Vector3): void {
    this.planetCenter.copy(center);
    if (this.baseMaterial) {
      this.baseMaterial.uniforms.planetCenter.value.copy(center);
    }
    if (this.segmentMaterial) {
      this.segmentMaterial.uniforms.planetCenter.value.copy(center);
    }
  }

  private async initGeometryAndMaterials(): Promise<void> {
    // Load the launch pad base texture
    const baseTexture = await new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader.load(
        getAssetPath('/textures/technology/launch_pad.png'),
        resolve,
        undefined,
        reject
      );
    });

    // Configure for pixel art
    baseTexture.magFilter = THREE.NearestFilter;
    baseTexture.minFilter = THREE.NearestFilter;
    baseTexture.wrapS = THREE.MirroredRepeatWrapping;
    baseTexture.wrapT = THREE.ClampToEdgeWrapping;

    // Create base geometry (hexagonal platform - CylinderGeometry with 6 radial segments)
    this.baseGeometry = new THREE.CylinderGeometry(
      this.BASE_RADIUS,  // top radius
      this.BASE_RADIUS,  // bottom radius
      this.BASE_HEIGHT,  // height (1/4 of normal block)
      6,                 // radial segments (hexagon)
      1                  // height segments
    );

    // Apply UV mapping for launch pad base texture atlas (32x16, 2 cells of 16x16)
    // Cell 1 (0,0): Top/Bottom, Cell 2 (16,0): Sides
    this.applyHexBaseUVs(this.baseGeometry);

    // Create base material with transparency support
    this.baseMaterial = new THREE.ShaderMaterial({
      uniforms: {
        techTexture: { value: baseTexture },
        sunDirection: { value: this.sunDirection.clone() },
        planetCenter: { value: this.planetCenter.clone() },
        ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
        directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
        torchLight: { value: 0.0 },
      },
      vertexShader: techVert,
      fragmentShader: techFrag,
      transparent: true,
      depthWrite: true,
      alphaTest: 0.01,
    });

    // Load segment texture
    const segmentTexture = await new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader.load(
        getAssetPath('/textures/technology/launch_tower.png'),
        resolve,
        undefined,
        reject
      );
    });

    segmentTexture.magFilter = THREE.NearestFilter;
    segmentTexture.minFilter = THREE.NearestFilter;
    segmentTexture.wrapS = THREE.ClampToEdgeWrapping;
    segmentTexture.wrapT = THREE.ClampToEdgeWrapping;

    // Create segment geometry (tall tower piece)
    this.segmentGeometry = new THREE.BoxGeometry(
      this.SEGMENT_SIZE,
      this.SEGMENT_HEIGHT,
      this.SEGMENT_SIZE
    );

    // Apply UV mapping for launch tower segment texture atlas (64x32, 2 cells of 32x32)
    // Cell 1 (0,0): Sides (front/back/left/right), Cell 2 (32,0): Top/Bottom (face)
    this.applySegmentUVs(this.segmentGeometry);

    // Create segment material with transparency support
    this.segmentMaterial = new THREE.ShaderMaterial({
      uniforms: {
        techTexture: { value: segmentTexture },
        sunDirection: { value: this.sunDirection.clone() },
        planetCenter: { value: this.planetCenter.clone() },
        ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
        directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
        torchLight: { value: 0.0 },
      },
      vertexShader: techVert,
      fragmentShader: techFrag,
      transparent: true,
      depthWrite: true,
      alphaTest: 0.01,
    });
  }

  /**
   * Apply UV mapping for hexagonal launch pad base
   * Texture atlas layout (32x16, 2 cells of 16x16):
   * Cell 1 (0,0): Top/Bottom faces (hexagonal)
   * Cell 2 (16,0): Side faces
   *
   * CylinderGeometry with 6 radial segments creates:
   * - Top cap: center vertex + 6 edge vertices (7 vertices, 6 triangles)
   * - Bottom cap: center vertex + 6 edge vertices (7 vertices, 6 triangles)
   * - Side: 6 quads (12 triangles, 14 vertices - 2 rows of 7)
   */
  private applyHexBaseUVs(geometry: THREE.CylinderGeometry): void {
    const texWidth = 32;
    const cellSize = 16;

    // UV regions - first cell (0-16) for top/bottom, second cell (16-32) for sides
    const topBottomU1 = 0 / texWidth;
    const topBottomU2 = cellSize / texWidth;

    const sideU1 = cellSize / texWidth;
    const sideU2 = (cellSize * 2) / texWidth;

    const uvAttribute = geometry.attributes.uv;
    const uvArray = uvAttribute.array as Float32Array;

    // CylinderGeometry UV layout (radialSegments=6, heightSegments=1):
    // Vertices: side top ring (7), side bottom ring (7), top cap center + ring (7), bottom cap center + ring (7)
    // Total: 28 vertices

    const radialSegments = 6;
    const heightSegments = 1;

    // Side vertices: (radialSegments + 1) * (heightSegments + 1) = 7 * 2 = 14
    // Top cap: radialSegments + 1 + 1 = 8 (center + 7 edge, but center duplicated)
    // Bottom cap: same = 8

    let uvIndex = 0;

    // Side faces - 14 vertices (7 top + 7 bottom ring)
    for (let y = 0; y <= heightSegments; y++) {
      for (let x = 0; x <= radialSegments; x++) {
        const u = sideU1 + (x / radialSegments) * (sideU2 - sideU1);
        const v = 1 - (y / heightSegments);
        uvArray[uvIndex * 2] = u;
        uvArray[uvIndex * 2 + 1] = v;
        uvIndex++;
      }
    }

    // Top cap - hexagonal UVs centered in first cell
    // Center vertex first, then ring vertices
    const topCenterU = (topBottomU1 + topBottomU2) / 2;
    const topCenterV = 0.5;

    // Center vertex
    uvArray[uvIndex * 2] = topCenterU;
    uvArray[uvIndex * 2 + 1] = topCenterV;
    uvIndex++;

    // Ring vertices for top cap
    for (let i = 0; i <= radialSegments; i++) {
      const angle = (i / radialSegments) * Math.PI * 2;
      const u = topCenterU + Math.sin(angle) * (topBottomU2 - topBottomU1) * 0.4;
      const v = topCenterV + Math.cos(angle) * 0.4;
      uvArray[uvIndex * 2] = u;
      uvArray[uvIndex * 2 + 1] = v;
      uvIndex++;
    }

    // Bottom cap - same hexagonal UVs
    // Center vertex
    uvArray[uvIndex * 2] = topCenterU;
    uvArray[uvIndex * 2 + 1] = topCenterV;
    uvIndex++;

    // Ring vertices for bottom cap
    for (let i = 0; i <= radialSegments; i++) {
      const angle = (i / radialSegments) * Math.PI * 2;
      const u = topCenterU + Math.sin(angle) * (topBottomU2 - topBottomU1) * 0.4;
      const v = topCenterV + Math.cos(angle) * 0.4;
      uvArray[uvIndex * 2] = u;
      uvArray[uvIndex * 2 + 1] = v;
      uvIndex++;
    }

    uvAttribute.needsUpdate = true;
  }

  /**
   * Apply UV mapping for launch tower segments
   * Texture atlas layout (64x32, 2 cells of 32x32):
   * Cell 1 (0,0): Side faces (front/back/left/right)
   * Cell 2 (32,0): Top/Bottom faces (face texture)
   */
  private applySegmentUVs(geometry: THREE.BoxGeometry): void {
    const texWidth = 64;
    const texHeight = 32;
    const cellSize = 32;

    const uv = (x: number, y: number, w: number, h: number) => ({
      u1: x / texWidth,
      v1: 1 - (y + h) / texHeight,
      u2: (x + w) / texWidth,
      v2: 1 - y / texHeight,
    });

    const sidesUV = uv(0, 0, cellSize, cellSize);          // Cell 1
    const topBottomUV = uv(cellSize, 0, cellSize, cellSize); // Cell 2

    const uvAttribute = geometry.attributes.uv;
    const uvArray = uvAttribute.array as Float32Array;

    const applyFaceUV = (faceIndex: number, uvCoords: { u1: number; v1: number; u2: number; v2: number }, flipHorizontal = false, flipVertical = false) => {
      const baseIndex = faceIndex * 8;
      const left = flipHorizontal ? uvCoords.u2 : uvCoords.u1;
      const right = flipHorizontal ? uvCoords.u1 : uvCoords.u2;
      const bottom = flipVertical ? uvCoords.v2 : uvCoords.v1;
      const top = flipVertical ? uvCoords.v1 : uvCoords.v2;

      uvArray[baseIndex + 0] = left;  uvArray[baseIndex + 1] = bottom;
      uvArray[baseIndex + 2] = right; uvArray[baseIndex + 3] = bottom;
      uvArray[baseIndex + 4] = left;  uvArray[baseIndex + 5] = top;
      uvArray[baseIndex + 6] = right; uvArray[baseIndex + 7] = top;
    };

    // BoxGeometry face order: +X, -X, +Y, -Y, +Z, -Z
    applyFaceUV(0, sidesUV, true, true);          // +X (right side)
    applyFaceUV(1, sidesUV, false, true);         // -X (left side)
    applyFaceUV(2, topBottomUV, false, false);    // +Y (top)
    applyFaceUV(3, topBottomUV, false, false);    // -Y (bottom)
    applyFaceUV(4, sidesUV, false, true);         // +Z (front)
    applyFaceUV(5, sidesUV, true, true);          // -Z (back)

    uvAttribute.needsUpdate = true;
  }

  /**
   * Create hex prism geometry in WORLD SPACE from tile data
   * Matches terrain generation rules exactly (same as HexBlock.createSeparateGeometries)
   * Uses innerRadius/outerRadius to position vertices on sphere surface
   */
  private createHexGeometryFromTile(
    tile: { center: THREE.Vector3; vertices: THREE.Vector3[] },
    innerRadius: number,
    outerRadius: number,
    planetCenter: THREE.Vector3
  ): THREE.BufferGeometry {
    const numSides = tile.vertices.length;
    const radialDir = tile.center.clone().sub(planetCenter).normalize();

    // Scale vertices to inner and outer radii (same as HexBlock)
    const innerVerts: THREE.Vector3[] = [];
    const outerVerts: THREE.Vector3[] = [];

    for (const v of tile.vertices) {
      const dir = v.clone().sub(planetCenter).normalize();
      innerVerts.push(dir.clone().multiplyScalar(innerRadius).add(planetCenter));
      outerVerts.push(dir.clone().multiplyScalar(outerRadius).add(planetCenter));
    }

    const innerCenter = radialDir.clone().multiplyScalar(innerRadius).add(planetCenter);
    const outerCenter = radialDir.clone().multiplyScalar(outerRadius).add(planetCenter);

    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // Texture atlas: 32x16, cell 0 (0-16) = top/bottom (face), cell 1 (16-32) = sides
    const texWidth = 32;
    const cellSize = 16;

    // Pre-compute regular polygon UVs (same as HexBlock)
    const uvRadius = 0.5;
    const tileUVs: { u: number; v: number }[] = [];
    for (let i = 0; i < numSides; i++) {
      const angle = (i / numSides) * Math.PI * 2 - Math.PI / 2; // Start from top
      // Map to first cell for top/bottom faces
      tileUVs.push({
        u: (0.5 + Math.cos(angle) * uvRadius) * (cellSize / texWidth),
        v: 0.5 + Math.sin(angle) * uvRadius
      });
    }
    const centerU = 0.5 * (cellSize / texWidth);
    const centerV = 0.5;

    // Top face (outer, facing away from planet) - same winding as HexBlock
    const topNormal = radialDir.clone();

    positions.push(outerCenter.x, outerCenter.y, outerCenter.z);
    normals.push(topNormal.x, topNormal.y, topNormal.z);
    uvs.push(centerU, centerV);

    for (let i = 0; i < numSides; i++) {
      const vert = outerVerts[i];
      positions.push(vert.x, vert.y, vert.z);
      normals.push(topNormal.x, topNormal.y, topNormal.z);
      uvs.push(tileUVs[i].u, tileUVs[i].v);
    }

    // Top face indices (same winding as HexBlock: 0, 1+i, 1+next)
    for (let i = 0; i < numSides; i++) {
      const next = (i + 1) % numSides;
      indices.push(0, 1 + i, 1 + next);
    }

    // Bottom face (inner, facing toward planet)
    const bottomNormal = radialDir.clone().negate();
    const bottomCenterIdx = positions.length / 3;

    positions.push(innerCenter.x, innerCenter.y, innerCenter.z);
    normals.push(bottomNormal.x, bottomNormal.y, bottomNormal.z);
    uvs.push(centerU, centerV);

    for (let i = 0; i < numSides; i++) {
      const vert = innerVerts[i];
      positions.push(vert.x, vert.y, vert.z);
      normals.push(bottomNormal.x, bottomNormal.y, bottomNormal.z);
      uvs.push(tileUVs[i].u, tileUVs[i].v);
    }

    // Bottom face indices (reversed winding: 0, 1+next, 1+i)
    for (let i = 0; i < numSides; i++) {
      const next = (i + 1) % numSides;
      indices.push(bottomCenterIdx, bottomCenterIdx + 1 + next, bottomCenterIdx + 1 + i);
    }

    // Side faces (same as HexBlock)
    const sideU1 = cellSize / texWidth;        // 0.5
    const sideU2 = (cellSize * 2) / texWidth;  // 1.0

    for (let i = 0; i < numSides; i++) {
      const next = (i + 1) % numSides;

      const outerV1 = outerVerts[i];
      const outerV2 = outerVerts[next];
      const innerV1 = innerVerts[i];
      const innerV2 = innerVerts[next];

      // Calculate side normal using cross product of quad edges (same as HexBlock)
      const edge1 = innerV2.clone().sub(innerV1);
      const edge2 = outerV1.clone().sub(innerV1);
      const sideNormal = edge1.clone().cross(edge2).normalize();

      const baseIdx = positions.length / 3;

      // Four vertices for this side (same order as HexBlock)
      positions.push(
        innerV1.x, innerV1.y, innerV1.z,
        innerV2.x, innerV2.y, innerV2.z,
        outerV2.x, outerV2.y, outerV2.z,
        outerV1.x, outerV1.y, outerV1.z
      );

      for (let j = 0; j < 4; j++) {
        normals.push(sideNormal.x, sideNormal.y, sideNormal.z);
      }

      // Side UVs mapped to second cell, tiled 2x horizontally
      uvs.push(
        sideU1, 0,                           // inner1 (bottom-left)
        sideU1 + 2 * (sideU2 - sideU1), 0,   // inner2 (bottom-right) - 2x tile
        sideU1 + 2 * (sideU2 - sideU1), 1,   // outer2 (top-right) - 2x tile
        sideU1, 1                            // outer1 (top-left)
      );

      // Same index order as HexBlock
      indices.push(
        baseIdx, baseIdx + 1, baseIdx + 2,
        baseIdx, baseIdx + 2, baseIdx + 3
      );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    return geometry;
  }

  /**
   * Validate if a launch pad can be placed at the given tile
   * Rules:
   * 1. Must be placed at center of 7-hex cluster (1 center + 6 surrounding)
   * 2. The center tile must have exactly 6 neighbors (not a pentagon)
   * 3. No adjacent launch pads allowed
   * 4. Cannot stack launch pads
   */
  public validatePlacement(
    centerTile: HexTile,
    allTiles: HexTile[],
    _existingLaunchPads: PlacedLaunchPad[]
  ): LaunchPadPlacementResult {
    // Rule 1 & 2: Must be a hexagon (6 neighbors) to have a proper 7-hex cluster
    if (centerTile.isPentagon || centerTile.neighbors.length !== 6) {
      return {
        canPlace: false,
        reason: 'Launch pad must be placed on a hexagonal tile with 6 neighbors'
      };
    }

    // Get all surrounding tiles
    const surroundingTiles: HexTile[] = [];
    for (const neighborIdx of centerTile.neighbors) {
      if (neighborIdx >= 0 && neighborIdx < allTiles.length) {
        surroundingTiles.push(allTiles[neighborIdx]);
      }
    }

    if (surroundingTiles.length !== 6) {
      return {
        canPlace: false,
        reason: 'Launch pad requires 6 surrounding tiles'
      };
    }

    return {
      canPlace: true,
      centerTile,
      surroundingTiles
    };
  }

  /**
   * Place a launch pad at the validated location
   * Creates geometry in world space like terrain blocks
   */
  public async placeLaunchPad(
    worldPosition: THREE.Vector3,
    planetCenter: THREE.Vector3,
    centerTileIndex: number,
    surroundingTileIndices: number[],
    tileVertices?: THREE.Vector3[],
    tileCenter?: THREE.Vector3,
    innerRadius?: number,
    outerRadius?: number
  ): Promise<PlacedLaunchPad | null> {
    if (!this.baseMaterial) {
      await this.initGeometryAndMaterials();
    }

    if (!this.baseMaterial) {
      console.error('Failed to initialize launch pad materials');
      return null;
    }

    // Create the launch pad group (at origin since geometry is in world space)
    const group = new THREE.Group();

    // Create base geometry from tile data in world space (like terrain blocks)
    let baseGeometry: THREE.BufferGeometry;
    if (tileVertices && tileVertices.length === 6 && tileCenter && innerRadius !== undefined && outerRadius !== undefined) {
      // Create geometry in world space matching terrain generation
      const tile = { center: tileCenter, vertices: tileVertices };
      baseGeometry = this.createHexGeometryFromTile(tile, innerRadius, outerRadius, planetCenter);
    } else {
      // Fallback to regular hexagon (shouldn't happen in normal use)
      console.warn('Using fallback launch pad geometry - tile data not provided');
      baseGeometry = this.baseGeometry!;
    }

    // Create base mesh - geometry is already in world space, no transform needed
    const baseMesh = new THREE.Mesh(baseGeometry, this.baseMaterial);
    group.add(baseMesh);

    // Add to scene
    this.scene.add(group);

    // Create the placed launch pad data
    const placedPad: PlacedLaunchPad = {
      mesh: group,
      position: worldPosition.clone(),
      centerTileIndex,
      surroundingTileIndices: [...surroundingTileIndices],
      rotation: 0,
      segmentCount: 0,
      segmentMeshes: [],
      rocketBlocks: 0,
      rocketMeshes: []
    };

    this.launchPads.push(placedPad);
    this.launchPadMeshes.push(group);

    return placedPad;
  }

  /**
   * Restore a launch pad from saved data (used when loading game)
   * Creates geometry in world space like placeLaunchPad
   */
  public async restoreLaunchPad(
    worldPosition: THREE.Vector3,
    planetCenter: THREE.Vector3,
    centerTileIndex: number,
    surroundingTileIndices: number[],
    rotation: number,
    segmentCount: number,
    rocketBlocks: number,
    tileVertices?: THREE.Vector3[],
    tileCenter?: THREE.Vector3,
    innerRadius?: number,
    outerRadius?: number
  ): Promise<PlacedLaunchPad | null> {
    if (!this.baseMaterial) {
      await this.initGeometryAndMaterials();
    }

    if (!this.baseMaterial) {
      console.error('Failed to initialize launch pad materials');
      return null;
    }

    // Create the launch pad group (at origin since geometry is in world space)
    const group = new THREE.Group();

    // Create base geometry from tile data in world space (like terrain blocks)
    let baseGeometry: THREE.BufferGeometry;
    if (tileVertices && tileVertices.length === 6 && tileCenter && innerRadius !== undefined && outerRadius !== undefined) {
      // Create geometry in world space matching terrain generation
      const tile = { center: tileCenter, vertices: tileVertices };
      baseGeometry = this.createHexGeometryFromTile(tile, innerRadius, outerRadius, planetCenter);
    } else {
      // Fallback to regular hexagon (shouldn't happen in normal use)
      console.warn('Using fallback launch pad geometry - tile data not provided');
      baseGeometry = this.baseGeometry!;
    }

    // Create base mesh - geometry is already in world space, no transform needed
    const baseMesh = new THREE.Mesh(baseGeometry, this.baseMaterial);
    group.add(baseMesh);

    // Add to scene
    this.scene.add(group);

    // Create the placed launch pad data
    const placedPad: PlacedLaunchPad = {
      mesh: group,
      position: worldPosition.clone(),
      centerTileIndex,
      surroundingTileIndices: [...surroundingTileIndices],
      rotation,
      segmentCount: 0,
      segmentMeshes: [],
      rocketBlocks: 0,
      rocketMeshes: []
    };

    this.launchPads.push(placedPad);
    this.launchPadMeshes.push(group);

    // Add saved segments
    for (let i = 0; i < segmentCount; i++) {
      this.addSegment(placedPad);
    }

    // Add saved rocket blocks
    placedPad.rocketBlocks = rocketBlocks;

    return placedPad;
  }

  /**
   * Add a segment to the launch pad tower
   */
  public addSegment(launchPad: PlacedLaunchPad): boolean {
    if (launchPad.segmentCount >= this.MAX_SEGMENTS) {
      return false;
    }

    if (!this.segmentGeometry || !this.segmentMaterial) {
      return false;
    }

    const segmentMesh = new THREE.Mesh(this.segmentGeometry, this.segmentMaterial);

    // Position segment on top of previous segments
    // Segments stack vertically in local space (Y is up after orientation)
    // Base top is at BASE_HEIGHT, segment center is at BASE_HEIGHT + (count + 0.5) * SEGMENT_HEIGHT
    const yOffset = this.BASE_HEIGHT + (launchPad.segmentCount + 0.5) * this.SEGMENT_HEIGHT;
    segmentMesh.position.y = yOffset;

    launchPad.mesh.add(segmentMesh);
    launchPad.segmentMeshes.push(segmentMesh);
    launchPad.segmentCount++;

    return true;
  }

  /**
   * Remove a segment from the launch pad tower
   */
  public removeSegment(launchPad: PlacedLaunchPad): boolean {
    if (launchPad.segmentCount <= 0) {
      return false;
    }

    // Can't remove segment if there are rocket blocks at that height
    if (launchPad.rocketBlocks >= launchPad.segmentCount) {
      // Need to remove rocket blocks first
      return false;
    }

    const segmentMesh = launchPad.segmentMeshes.pop();
    if (segmentMesh) {
      launchPad.mesh.remove(segmentMesh);
      segmentMesh.geometry.dispose();
      launchPad.segmentCount--;
      return true;
    }

    return false;
  }

  /**
   * Get launch pad at a specific tile index
   */
  public getLaunchPadAtTile(tileIndex: number): PlacedLaunchPad | null {
    for (const pad of this.launchPads) {
      if (pad.centerTileIndex === tileIndex) {
        return pad;
      }
      if (pad.surroundingTileIndices.includes(tileIndex)) {
        return pad;
      }
    }
    return null;
  }

  /**
   * Get all launch pads
   */
  public getLaunchPads(): PlacedLaunchPad[] {
    return this.launchPads;
  }

  /**
   * Get meshes for raycasting
   */
  public getMeshes(): THREE.Object3D[] {
    return this.launchPadMeshes;
  }

  /**
   * Remove a launch pad
   */
  public removeLaunchPad(launchPad: PlacedLaunchPad): void {
    const index = this.launchPads.indexOf(launchPad);
    if (index !== -1) {
      this.launchPads.splice(index, 1);
    }

    const meshIndex = this.launchPadMeshes.indexOf(launchPad.mesh);
    if (meshIndex !== -1) {
      this.launchPadMeshes.splice(meshIndex, 1);
    }

    // Clean up meshes
    this.scene.remove(launchPad.mesh);

    // Dispose segment meshes
    for (const segmentMesh of launchPad.segmentMeshes) {
      segmentMesh.geometry.dispose();
    }

    // Dispose rocket meshes
    for (const rocketMesh of launchPad.rocketMeshes) {
      rocketMesh.geometry.dispose();
    }
  }

  /**
   * Check if a rocket is fully assembled (segments > 0 and rocket blocks = segments)
   */
  public isRocketAssembled(launchPad: PlacedLaunchPad): boolean {
    return launchPad.segmentCount > 0 && launchPad.rocketBlocks === launchPad.segmentCount;
  }

  /**
   * Update torch lighting for all launch pads based on nearby torch positions
   */
  public updateTorchLighting(torchPositions: THREE.Vector3[], torchRange: number, torchIntensity: number): void {
    for (const launchPad of this.launchPads) {
      let totalLight = 0;

      for (const torchPos of torchPositions) {
        const distance = launchPad.position.distanceTo(torchPos);
        if (distance < torchRange) {
          // Inverse square falloff with decay (matching terrain)
          const decay = 2; // Same as TorchConfig.LIGHT_DECAY
          const attenuation = 1 / (1 + decay * distance * distance / (torchRange * torchRange));
          totalLight += attenuation * torchIntensity;
        }
      }

      // Clamp total light
      totalLight = Math.min(1.5, totalLight);

      // Update base mesh material (first child in group)
      const baseMesh = launchPad.mesh.children[0] as THREE.Mesh;
      if (baseMesh) {
        const material = baseMesh.material as THREE.ShaderMaterial;
        if (material.uniforms && material.uniforms.torchLight) {
          material.uniforms.torchLight.value = totalLight;
        }
      }

      // Update segment meshes
      for (const segmentMesh of launchPad.segmentMeshes) {
        const material = segmentMesh.material as THREE.ShaderMaterial;
        if (material.uniforms && material.uniforms.torchLight) {
          material.uniforms.torchLight.value = totalLight;
        }
      }
    }
  }

  /**
   * Dispose of all resources
   */
  public dispose(): void {
    for (const pad of this.launchPads) {
      this.removeLaunchPad(pad);
    }

    this.baseGeometry?.dispose();
    this.baseMaterial?.dispose();
    this.segmentGeometry?.dispose();
    this.segmentMaterial?.dispose();
  }
}
