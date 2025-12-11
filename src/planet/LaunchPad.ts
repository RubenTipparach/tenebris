import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { getAssetPath } from '../utils/assetPath';
import { HexTile } from './GoldbergPolyhedron';
import { PlayerConfig } from '../config/PlayerConfig';
import { ItemType, ITEM_DATA, RocketPartType } from '../player/Inventory';
import { RocketPart } from './RocketPart';
import techVert from '../shaders/tech/tech.vert';
import techFrag from '../shaders/tech/tech.frag';
import rocketPartVert from '../shaders/rocketPart/rocketPart.vert';
import rocketPartFrag from '../shaders/rocketPart/rocketPart.frag';

// Legacy interface for backwards compatibility
export interface PlacedRocketPart {
  itemType: ItemType;
  partType: RocketPartType;
  mesh: THREE.Group;
  heightIndex: number;  // Which slot in the rocket stack (0 = bottom)
}

// Launch pad shape requirements:
// The 10-hex stadium shape:
//  P P      <- 2 hexes (top row)
// P R P     <- 3 hexes (rocket row - R = rocket parts position)
// P L P     <- 3 hexes (tower row - L = launch tower complex position)
//  P P      <- 2 hexes (bottom row)
// Total: 10 hexes

// Launch Pad placement data
export interface PlacedLaunchPad {
  mesh: THREE.Group;  // Group containing base + segments
  position: THREE.Vector3;  // Center of the launch pad (rocket tile position)
  // Tile tracking for 10-hex pattern
  allTileIndices: number[];  // All 10 tile indices in the pattern
  allTileCenters: THREE.Vector3[];  // World positions of all 10 hex centers
  placedTiles: Set<number>;  // Which tiles have launch pad blocks placed (subset of allTileIndices)
  rocketTileIndex: number;  // The center tile where rocket parts sit (R position)
  towerTileIndex: number;  // The center tile where launch tower complex sits (L position)
  towerTileCenter: THREE.Vector3;  // World position of tower tile center
  isComplete: boolean;  // True when all 10 tiles have blocks placed
  // Legacy fields for backwards compatibility
  centerTileIndex: number;  // For backwards compat - same as rocketTileIndex
  surroundingTileIndices: number[];  // For backwards compat
  surroundingTileCenters: THREE.Vector3[];  // For backwards compat
  rotation: number;
  // Tower segments (right column in UI, max 8)
  segmentCount: number;
  segmentMeshes: THREE.Mesh[];
  // Rocket blocks (left column in UI, max = segmentCount) - DEPRECATED, use rocketParts
  rocketBlocks: number;
  rocketMeshes: THREE.Mesh[];
  // Rocket parts stack (uses RocketPart class)
  rocketParts: RocketPart[];
  // Legacy support - computed from rocketParts
  hasRocketEngine: boolean;
  rocketEngineMesh: THREE.Group | null;
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

  // Rocket engine model and material (legacy, kept for backwards compatibility)
  private rocketEngineGeometry: THREE.BufferGeometry | null = null;
  private rocketEngineMaterial: THREE.ShaderMaterial | null = null;

  // Cache for rocket part models and materials (keyed by ItemType)
  private rocketPartCache: Map<ItemType, { geometry: THREE.BufferGeometry; material: THREE.ShaderMaterial }> = new Map();

  // Planet lighting uniforms
  private planetCenter: THREE.Vector3;
  private sunDirection: THREE.Vector3;
  private planetRadius: number;
  private atmosphereHeight: number;

  // Size constants
  private readonly BASE_RADIUS = 1.0;  // Radius of hexagonal base
  private readonly BASE_HEIGHT = 0.25; // 1/4 of normal block height (which is 1)
  private readonly SEGMENT_SIZE = 2.0;  // Segment tower piece
  private readonly SEGMENT_HEIGHT = 2.0;  // Height per segment
  private readonly MAX_SEGMENTS = 8;
  private readonly ROCKET_PART_SCALE = 1.0;  // Scale for rocket part models

  constructor(scene: THREE.Scene, planetCenter?: THREE.Vector3, sunDirection?: THREE.Vector3, planetRadius?: number) {
    this.scene = scene;
    this.textureLoader = new THREE.TextureLoader();
    this.planetCenter = planetCenter?.clone() || new THREE.Vector3(0, 0, 0);
    this.sunDirection = sunDirection?.clone() || new THREE.Vector3(1, 0, 0);
    this.planetRadius = planetRadius || 50;
    this.atmosphereHeight = this.planetRadius * 0.1;
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
    // Update rocket part materials in cache
    for (const cached of this.rocketPartCache.values()) {
      if (cached.material.uniforms.sunDirection) {
        cached.material.uniforms.sunDirection.value.copy(direction);
      }
    }
    // Update all placed rocket parts (cloned materials)
    for (const launchPad of this.launchPads) {
      for (const rocketPart of launchPad.rocketParts) {
        rocketPart.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const material = child.material as THREE.ShaderMaterial;
            if (material.uniforms && material.uniforms.sunDirection) {
              material.uniforms.sunDirection.value.copy(direction);
            }
          }
        });
      }
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
    // Update rocket part materials in cache
    for (const cached of this.rocketPartCache.values()) {
      if (cached.material.uniforms.planetCenter) {
        cached.material.uniforms.planetCenter.value.copy(center);
      }
    }
    // Update all placed rocket parts (cloned materials)
    for (const launchPad of this.launchPads) {
      for (const rocketPart of launchPad.rocketParts) {
        rocketPart.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const material = child.material as THREE.ShaderMaterial;
            if (material.uniforms && material.uniforms.planetCenter) {
              material.uniforms.planetCenter.value.copy(center);
            }
          }
        });
      }
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

    // Create base material with transparency support and double-sided rendering
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
      side: THREE.DoubleSide,
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

    // Create segment material with transparency and double-sided rendering
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
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    });

    // Load rocket engine model and texture
    await this.loadRocketEngineModel();
  }

  private async loadRocketEngineModel(): Promise<void> {
    // Load the rocket engine texture
    const engineTexture = await new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader.load(
        getAssetPath('/textures/rocket_parts/medium_engine.png'),
        resolve,
        undefined,
        reject
      );
    });

    engineTexture.magFilter = THREE.NearestFilter;
    engineTexture.minFilter = THREE.NearestFilter;
    engineTexture.wrapS = THREE.ClampToEdgeWrapping;
    engineTexture.wrapT = THREE.ClampToEdgeWrapping;

    // Create engine material with the tech shader
    this.rocketEngineMaterial = new THREE.ShaderMaterial({
      uniforms: {
        techTexture: { value: engineTexture },
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
      alphaTest: 0.5,
      side: THREE.DoubleSide,
    });

    // Load the OBJ model
    const objLoader = new OBJLoader();
    try {
      const obj = await new Promise<THREE.Group>((resolve, reject) => {
        objLoader.load(
          getAssetPath('/models/medium_rocket_nozzlel.obj'),
          resolve,
          undefined,
          reject
        );
      });

      // Extract geometry from the loaded model
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          this.rocketEngineGeometry = child.geometry.clone();
        }
      });
    } catch (error) {
      console.error('Failed to load rocket engine model:', error);
    }
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

    // Top face (outer, facing away from planet) - per-vertex normals for spherical shading
    positions.push(outerCenter.x, outerCenter.y, outerCenter.z);
    normals.push(radialDir.x, radialDir.y, radialDir.z);
    uvs.push(centerU, centerV);

    for (let i = 0; i < numSides; i++) {
      const vert = outerVerts[i];
      const vertNormal = vert.clone().sub(planetCenter).normalize();
      positions.push(vert.x, vert.y, vert.z);
      normals.push(vertNormal.x, vertNormal.y, vertNormal.z);
      uvs.push(tileUVs[i].u, tileUVs[i].v);
    }

    // Top face indices (same winding as HexBlock: 0, 1+i, 1+next)
    for (let i = 0; i < numSides; i++) {
      const next = (i + 1) % numSides;
      indices.push(0, 1 + i, 1 + next);
    }

    // Bottom face (inner, facing toward planet) - per-vertex normals for spherical shading
    const bottomCenterIdx = positions.length / 3;
    const bottomCenterNormal = radialDir.clone().negate();

    positions.push(innerCenter.x, innerCenter.y, innerCenter.z);
    normals.push(bottomCenterNormal.x, bottomCenterNormal.y, bottomCenterNormal.z);
    uvs.push(centerU, centerV);

    for (let i = 0; i < numSides; i++) {
      const vert = innerVerts[i];
      const vertNormal = vert.clone().sub(planetCenter).normalize().negate();
      positions.push(vert.x, vert.y, vert.z);
      normals.push(vertNormal.x, vertNormal.y, vertNormal.z);
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
    surroundingTileCenters: THREE.Vector3[],
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
    // For now, use the center tile as rocket position and first surrounding as tower
    // TODO: Proper 10-hex pattern detection will be implemented
    const towerCenter = surroundingTileCenters.length > 0
      ? surroundingTileCenters[0].clone()
      : worldPosition.clone();

    const placedPad: PlacedLaunchPad = {
      mesh: group,
      position: worldPosition.clone(),
      // New 10-hex pattern fields
      allTileIndices: [centerTileIndex, ...surroundingTileIndices],
      allTileCenters: [worldPosition.clone(), ...surroundingTileCenters.map(c => c.clone())],
      placedTiles: new Set([centerTileIndex]),  // Start with just the center tile placed
      rocketTileIndex: centerTileIndex,
      towerTileIndex: surroundingTileIndices[0] ?? centerTileIndex,
      towerTileCenter: towerCenter,
      isComplete: false,  // Not complete until all 10 tiles placed
      // Legacy fields
      centerTileIndex,
      surroundingTileIndices: [...surroundingTileIndices],
      surroundingTileCenters: surroundingTileCenters.map(c => c.clone()),
      rotation: 0,
      segmentCount: 0,
      segmentMeshes: [],
      rocketBlocks: 0,
      rocketMeshes: [],
      rocketParts: [],
      hasRocketEngine: false,
      rocketEngineMesh: null,
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
    surroundingTileCenters: THREE.Vector3[],
    rotation: number,
    segmentCount: number,
    rocketBlocks: number,
    tileVertices?: THREE.Vector3[],
    tileCenter?: THREE.Vector3,
    innerRadius?: number,
    outerRadius?: number,
    savedRocketParts?: { itemType: ItemType; heightIndex: number }[]
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
    const towerCenter = surroundingTileCenters.length > 0
      ? surroundingTileCenters[0].clone()
      : worldPosition.clone();

    const placedPad: PlacedLaunchPad = {
      mesh: group,
      position: worldPosition.clone(),
      // New 10-hex pattern fields
      allTileIndices: [centerTileIndex, ...surroundingTileIndices],
      allTileCenters: [worldPosition.clone(), ...surroundingTileCenters.map(c => c.clone())],
      placedTiles: new Set([centerTileIndex, ...surroundingTileIndices]),  // Assume all placed when restoring
      rocketTileIndex: centerTileIndex,
      towerTileIndex: surroundingTileIndices[0] ?? centerTileIndex,
      towerTileCenter: towerCenter,
      isComplete: true,  // Assume complete when restoring
      // Legacy fields
      centerTileIndex,
      surroundingTileIndices: [...surroundingTileIndices],
      surroundingTileCenters: surroundingTileCenters.map(c => c.clone()),
      rotation,
      segmentCount: 0,
      segmentMeshes: [],
      rocketBlocks: 0,
      rocketMeshes: [],
      rocketParts: [],
      hasRocketEngine: false,
      rocketEngineMesh: null,
    };

    this.launchPads.push(placedPad);
    this.launchPadMeshes.push(group);

    // Add saved segments
    for (let i = 0; i < segmentCount; i++) {
      this.addSegment(placedPad);
    }

    // Add saved rocket blocks
    placedPad.rocketBlocks = rocketBlocks;

    // Restore saved rocket parts
    if (savedRocketParts && savedRocketParts.length > 0) {
      // Sort by heightIndex to ensure correct stacking order
      const sortedParts = [...savedRocketParts].sort((a, b) => a.heightIndex - b.heightIndex);
      for (const part of sortedParts) {
        await this.addRocketPart(placedPad, part.itemType);
      }
    }

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

    // Use the tower tile center position
    const towerBasePos = launchPad.towerTileCenter.clone();

    // Stack segments radially outward from the tower tile position
    // Each segment is SEGMENT_HEIGHT tall, centered at offset from pad top
    const towerRadialDir = towerBasePos.clone().sub(this.planetCenter).normalize();
    const heightOffset = (launchPad.segmentCount + 0.5) * this.SEGMENT_HEIGHT;
    const segmentPos = towerBasePos.clone()
      .add(towerRadialDir.clone().multiplyScalar(heightOffset));
    segmentMesh.position.copy(segmentPos);

    // Log tower base position info
    const towerDistFromCenter = towerBasePos.distanceTo(this.planetCenter);
    console.log(`[Tower Segment ${launchPad.segmentCount}] baseDistFromCenter: ${towerDistFromCenter.toFixed(3)}, heightOffset: ${heightOffset.toFixed(3)}, finalDist: ${segmentPos.distanceTo(this.planetCenter).toFixed(3)}`);

    // Orient the segment so its local Y axis points along the tower's radial direction
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, towerRadialDir);
    segmentMesh.quaternion.copy(quaternion);

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
   * Load rocket part model and material for a given item type
   * Caches the result for reuse
   */
  private async loadRocketPartAssets(itemType: ItemType): Promise<{ geometry: THREE.BufferGeometry; material: THREE.ShaderMaterial } | null> {
    // Check cache first
    const cached = this.rocketPartCache.get(itemType);
    if (cached) {
      return cached;
    }

    const itemData = ITEM_DATA[itemType];
    if (!itemData.rocketPart) {
      console.error(`Item ${itemType} is not a rocket part`);
      return null;
    }

    const partData = itemData.rocketPart;

    try {
      // Load texture
      const texture = await new Promise<THREE.Texture>((resolve, reject) => {
        this.textureLoader.load(
          getAssetPath(partData.texturePath),
          resolve,
          undefined,
          reject
        );
      });

      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      texture.wrapS = THREE.ClampToEdgeWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;

      // Create material with rocket part shader (adaptive lighting based on gravity well)
      const material = new THREE.ShaderMaterial({
        uniforms: {
          techTexture: { value: texture },
          sunDirection: { value: this.sunDirection.clone() },
          planetCenter: { value: this.planetCenter.clone() },
          planetRadius: { value: this.planetRadius },
          atmosphereHeight: { value: this.atmosphereHeight },
          ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
          directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
          torchLight: { value: 0.0 },
        },
        vertexShader: rocketPartVert,
        fragmentShader: rocketPartFrag,
        transparent: true,
        depthWrite: true,
        alphaTest: 0.5,
        side: THREE.DoubleSide,
      });

      // Load OBJ model
      const objLoader = new OBJLoader();
      const obj = await new Promise<THREE.Group>((resolve, reject) => {
        objLoader.load(
          getAssetPath(partData.modelPath),
          resolve,
          undefined,
          reject
        );
      });

      // Extract geometry from the loaded model
      let geometry: THREE.BufferGeometry | null = null;
      obj.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          geometry = child.geometry.clone();
        }
      });

      if (!geometry) {
        console.error(`No geometry found in model for ${itemType}`);
        return null;
      }

      // Cache the result
      const result = { geometry, material };
      this.rocketPartCache.set(itemType, result);

      return result;
    } catch (error) {
      console.error(`Failed to load rocket part assets for ${itemType}:`, error);
      return null;
    }
  }

  /**
   * Add a rocket part to the launch pad stack
   * Parts are positioned in front of the tower, stacked vertically
   */
  public async addRocketPart(launchPad: PlacedLaunchPad, itemType: ItemType): Promise<boolean> {
    const itemData = ITEM_DATA[itemType];
    if (!itemData.rocketPart) {
      console.error(`Item ${itemType} is not a rocket part`);
      return false;
    }

    // Need at least 1 segment to place parts
    if (launchPad.segmentCount < 1) {
      return false;
    }

    // Load or get cached assets
    const assets = await this.loadRocketPartAssets(itemType);
    if (!assets) {
      return false;
    }

    // Create mesh with cloned material so each part has independent uniforms
    const clonedMaterial = assets.material.clone();
    const partMesh = new THREE.Mesh(assets.geometry, clonedMaterial);
    const partGroup = new THREE.Group();
    partGroup.add(partMesh);

    // Calculate position: stack parts vertically above the rocket tile
    // The rocket tile and tower tile may be at different elevations on the planet surface
    // We want the rocket to sit at the SAME surface level as the tower
    const rocketRadialDir = launchPad.position.clone().sub(this.planetCenter).normalize();

    // Get the surface level from the tower tile (same as where tower segments start)
    const towerSurfaceDistance = launchPad.towerTileCenter.distanceTo(this.planetCenter);

    // Calculate height based on existing parts
    let heightOffset = 0;
    for (const existingPart of launchPad.rocketParts) {
      const existingData = ITEM_DATA[existingPart.itemType];
      if (existingData.rocketPart) {
        heightOffset += existingData.rocketPart.heightUnits * this.SEGMENT_HEIGHT;
      }
    }

    // Position at the calculated height, starting from tower's surface level
    // Height starts at same level as tower segments (0.5 * SEGMENT_HEIGHT for first segment center)
    const partHeight = heightOffset + (itemData.rocketPart.heightUnits * this.SEGMENT_HEIGHT * 0.5);

    // Orient the part first: Y axis along radial direction (from rocket tile)
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, rocketRadialDir);

    // Get position offset from config
    const offsetX = PlayerConfig.ROCKET_STACK_OFFSET_X;
    const offsetY = PlayerConfig.ROCKET_STACK_OFFSET_Y;
    const offsetZ = PlayerConfig.ROCKET_STACK_OFFSET_Z;

    // Create local offset vectors based on orientation
    // X = sideways (tangent), Y = up/down (radial), Z = forward/back
    const localX = new THREE.Vector3(1, 0, 0).applyQuaternion(quaternion);  // sideways
    const localZ = new THREE.Vector3(0, 0, 1).applyQuaternion(quaternion);  // forward/back

    // Position: place at tower surface level + part height, along the rocket tile's radial direction
    // This positions the rocket above the rocket tile but at the tower's surface elevation
    const partPos = this.planetCenter.clone()
      .add(rocketRadialDir.clone().multiplyScalar(towerSurfaceDistance + partHeight + offsetY))
      .add(localX.clone().multiplyScalar(offsetX))
      .add(localZ.clone().multiplyScalar(offsetZ));

    // Log rocket part position info
    const rocketTileDistFromCenter = launchPad.position.distanceTo(this.planetCenter);
    console.log(`[Rocket Part ${launchPad.rocketParts.length}] rocketTileDist: ${rocketTileDistFromCenter.toFixed(3)}, towerSurfaceDist: ${towerSurfaceDistance.toFixed(3)}, partHeight: ${partHeight.toFixed(3)}, finalDist: ${partPos.distanceTo(this.planetCenter).toFixed(3)}`);

    partGroup.position.copy(partPos);
    partGroup.quaternion.copy(quaternion);

    // Scale the part
    partGroup.scale.setScalar(this.ROCKET_PART_SCALE);

    // Add to launch pad
    launchPad.mesh.add(partGroup);

    const rocketPart = new RocketPart(
      itemType,
      itemData.rocketPart.partType,
      partGroup,
      clonedMaterial,
      launchPad.rocketParts.length
    );

    launchPad.rocketParts.push(rocketPart);

    // Update legacy hasRocketEngine flag for backwards compatibility
    if (itemData.rocketPart.partType === RocketPartType.ENGINE) {
      launchPad.hasRocketEngine = true;
      launchPad.rocketEngineMesh = partGroup;
    }

    return true;
  }

  /**
   * Remove the top rocket part from the launch pad stack
   */
  public removeRocketPart(launchPad: PlacedLaunchPad): PlacedRocketPart | null {
    if (launchPad.rocketParts.length === 0) {
      return null;
    }

    const removedPart = launchPad.rocketParts.pop()!;
    launchPad.mesh.remove(removedPart.mesh);

    // Update legacy flags
    const hasEngine = launchPad.rocketParts.some(
      p => ITEM_DATA[p.itemType].rocketPart?.partType === RocketPartType.ENGINE
    );
    launchPad.hasRocketEngine = hasEngine;
    if (!hasEngine) {
      launchPad.rocketEngineMesh = null;
    }

    return removedPart;
  }

  /**
   * Add rocket engine to the launch pad (legacy method, uses addRocketPart internally)
   */
  public addRocketEngine(launchPad: PlacedLaunchPad): boolean {
    // Can't add engine if already has one
    if (launchPad.hasRocketEngine) {
      return false;
    }

    // Need at least 1 segment to place engine
    if (launchPad.segmentCount < 1) {
      return false;
    }

    // Use the legacy pre-loaded geometry/material for backwards compatibility
    if (!this.rocketEngineGeometry || !this.rocketEngineMaterial) {
      console.error('Rocket engine geometry or material not loaded');
      return false;
    }

    // Create engine mesh using legacy assets
    const engineMesh = new THREE.Mesh(this.rocketEngineGeometry, this.rocketEngineMaterial);
    const engineGroup = new THREE.Group();
    engineGroup.add(engineMesh);

    // Position the engine centered on the launch pad
    const radialDir = launchPad.position.clone().sub(this.planetCenter).normalize();

    // Place engine at the base height, centered on the pad
    const engineHeight = this.SEGMENT_HEIGHT * 0.5;

    const enginePos = launchPad.position.clone()
      .add(radialDir.clone().multiplyScalar(engineHeight));

    engineGroup.position.copy(enginePos);

    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, radialDir);
    engineGroup.quaternion.copy(quaternion);

    engineGroup.scale.setScalar(this.ROCKET_PART_SCALE);

    launchPad.mesh.add(engineGroup);

    // Add to rocketParts array for new system
    const rocketPart = new RocketPart(
      ItemType.ROCKET_ENGINE,
      RocketPartType.ENGINE,
      engineGroup,
      this.rocketEngineMaterial,
      launchPad.rocketParts.length
    );
    launchPad.rocketParts.push(rocketPart);

    // Legacy flags
    launchPad.hasRocketEngine = true;
    launchPad.rocketEngineMesh = engineGroup;

    return true;
  }

  /**
   * Remove rocket engine from the launch pad (legacy method)
   */
  public removeRocketEngine(launchPad: PlacedLaunchPad): boolean {
    if (!launchPad.hasRocketEngine || !launchPad.rocketEngineMesh) {
      return false;
    }

    // Find and remove the engine from rocketParts
    const engineIndex = launchPad.rocketParts.findIndex(
      p => p.partType === RocketPartType.ENGINE
    );

    if (engineIndex >= 0) {
      launchPad.rocketParts.splice(engineIndex, 1);
    }

    launchPad.mesh.remove(launchPad.rocketEngineMesh);
    launchPad.hasRocketEngine = false;
    launchPad.rocketEngineMesh = null;

    return true;
  }

  /**
   * Get the list of rocket parts on a launch pad
   */
  public getRocketParts(launchPad: PlacedLaunchPad): PlacedRocketPart[] {
    return [...launchPad.rocketParts];
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
   * Mark a tile as having a launch pad block placed on it
   * This updates the placedTiles set and checks for completion
   * @returns true if this completes the launch pad
   */
  public markTileAsPlaced(launchPad: PlacedLaunchPad, tileIndex: number): boolean {
    // Check if this tile is part of the launch pad's pattern
    if (!launchPad.allTileIndices.includes(tileIndex)) {
      return false;
    }

    // Mark the tile as placed
    launchPad.placedTiles.add(tileIndex);

    // Check for completion (all tiles in pattern have blocks)
    const wasComplete = launchPad.isComplete;
    launchPad.isComplete = launchPad.placedTiles.size >= launchPad.allTileIndices.length;

    // Return true if this action completed the launch pad
    return !wasComplete && launchPad.isComplete;
  }

  /**
   * Remove a tile from the placed tiles set
   * @returns true if this made the launch pad incomplete
   */
  public markTileAsRemoved(launchPad: PlacedLaunchPad, tileIndex: number): boolean {
    const wasComplete = launchPad.isComplete;
    launchPad.placedTiles.delete(tileIndex);
    launchPad.isComplete = launchPad.placedTiles.size >= launchPad.allTileIndices.length;

    // Return true if this action made the launch pad incomplete
    return wasComplete && !launchPad.isComplete;
  }

  /**
   * Get the count of tiles that still need launch pad blocks
   */
  public getRemainingTileCount(launchPad: PlacedLaunchPad): number {
    return launchPad.allTileIndices.length - launchPad.placedTiles.size;
  }

  /**
   * Get the indices of tiles that still need launch pad blocks
   */
  public getMissingTileIndices(launchPad: PlacedLaunchPad): number[] {
    return launchPad.allTileIndices.filter(idx => !launchPad.placedTiles.has(idx));
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

      // Update rocket part meshes - each part calculates its own light based on its position
      for (const rocketPart of launchPad.rocketParts) {
        // Get the rocket part's world position
        const partPosition = new THREE.Vector3();
        rocketPart.mesh.getWorldPosition(partPosition);

        // Calculate light for this specific part
        let partLight = 0;
        for (const torchPos of torchPositions) {
          const distance = partPosition.distanceTo(torchPos);
          if (distance < torchRange) {
            const decay = 2;
            const attenuation = 1 / (1 + decay * distance * distance / (torchRange * torchRange));
            partLight += attenuation * torchIntensity;
          }
        }
        partLight = Math.min(1.5, partLight);

        // Rocket part mesh is a Group containing the actual mesh
        rocketPart.mesh.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            const material = child.material as THREE.ShaderMaterial;
            if (material.uniforms && material.uniforms.torchLight) {
              material.uniforms.torchLight.value = partLight;
            }
          }
        });
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
