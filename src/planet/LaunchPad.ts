import { machineLightUniforms, withMachineLight } from './MachineLight';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { getAssetPath } from '../utils/assetPath';
import { PlayerConfig } from '../config/PlayerConfig';
import { ItemType, ITEM_DATA, RocketPartType, InventorySlot } from '../player/Inventory';
import { ROCKET_CONFIG } from '../config/RocketConfig';
import { cargoSlotsFor, equipmentSlotsFor, fitSlots, computeRocketStats, validEngineMode } from '../rocket/RocketPerformance';
import { RocketPart } from './RocketPart';
import { emptyStash, stashUsed } from '../rocket/CarryRules';
import techVert from '../shaders/tech/tech.vert';
import techFrag from '../shaders/tech/tech.frag';
import launchPadVert from '../shaders/launchPad/launchPad.vert';
import launchPadFrag from '../shaders/tech/tech.frag';   // one fragment for every tech material
import rocketPartVert from '../shaders/rocketPart/rocketPart.vert';
import rocketPartFrag from '../shaders/rocketPart/rocketPart.frag';

// Legacy interface for backwards compatibility
export interface PlacedRocketPart {
  itemType: ItemType;
  partType: RocketPartType;
  mesh: THREE.Group;
  heightIndex: number;  // Which slot in the rocket stack (0 = bottom)
}

// A launch pad is a group of Launch Pad Blocks, one hex each, all level.
// It only takes a rocket once seven of them form a middle hex with the full
// ring of six around it (ROCKET_CONFIG.PAD_BLOCKS_PER_TOWER): the rocket
// stands in the middle and the tower on another pad hex, never the middle.
//
//   P P
//  P R P     R = rocket (the middle), P = pad blocks; the tower (T) goes on
//   T P      any pad hex but R

// One pad hex: built from the pad's top down to innerRadius (the ground
// there, so the pad never hovers over a dip).
export interface PlatformTile {
  index: number;
  neighbors: number[];
  center: THREE.Vector3;
  vertices: THREE.Vector3[];
  innerRadius: number;
}

// Launch Pad placement data
export interface PlacedLaunchPad {
  mesh: THREE.Group;  // Group containing the pad hexes + tower + rocket
  // Where the rocket stands: the middle hex's top once the pad is complete,
  // else the first block's top
  position: THREE.Vector3;
  planetCenter: THREE.Vector3;  // Center of the planet this pad sits on
  outerRadius: number;  // the pad's top, from the planet centre (all hexes level)
  hexes: Map<number, { tile: PlatformTile; mesh: THREE.Mesh }>;  // every pad block, by tile
  placedTiles: Set<number>;  // the tiles of `hexes`
  rocketTileIndex: number;  // The middle hex (rocket), -1 until 7 blocks form one
  towerTileIndex: number;  // The tower's hex, -1 until a tower is started
  towerTileCenter: THREE.Vector3;  // World position of the tower hex's top
  isComplete: boolean;  // True once a middle hex with its full ring exists
  // The pad's save key: its first block (the middle, for pads placed whole
  // in older saves)
  centerTileIndex: number;
  surroundingTileIndices: number[];  // the middle's ring ([] until complete)
  rotation: number;
  // Tower segments (right column in UI, max 8)
  segmentCount: number;
  segmentMeshes: THREE.Mesh[];
  // Rocket blocks (left column in UI, max = segmentCount) - DEPRECATED, use rocketParts
  rocketBlocks: number;
  rocketMeshes: THREE.Mesh[];
  // Rocket parts stack (uses RocketPart class)
  rocketParts: RocketPart[];
  // The rocket's cargo hold: as many slots as its parts give
  // (ROCKET_CONFIG.PARTS cargoSlots). The flying / landed rocket shares this
  // array, so the cargo travels with it and saves with the pad
  cargo: InventorySlot[];
  // The rocket's equipment slots: parachutes, solar arrays, battery packs
  // (ROCKET_CONFIG.EQUIPMENT), as many as its parts give (PARTS
  // equipmentSlots). Shared with the flying / landed rocket the same way
  // as the cargo hold, and saved with the pad
  equipment: InventorySlot[];
  // What players left here when they boarded (openspec pad-stash): every
  // non-exempt hotbar / bag item moves in on boarding, CARRY.STASH_SLOTS
  // slots, saved with the pad (absent in the record = empty)
  stash: InventorySlot[];
  // Fuel units in the rocket's tanks; null = full (pads from older saves)
  fuel: number | null;
  engineMode?: ItemType | null;  // which engines fire (design 6b); null/undefined = all
  blockHeight?: number;  // the planet's block height (the pad is BASE_HEIGHT of it)
  // Legacy support - computed from rocketParts
  hasRocketEngine: boolean;
  rocketEngineMesh: THREE.Group | null;
}

/** One tower segment's height, and a rocket part's per height unit (m) */
export const ROCKET_SEGMENT_HEIGHT = 2.0;

/**
 * Each part's height up a stack (bottom to top): where its model's origin
 * sits above the stack's base. The pad stacks parts with it and a refit
 * rebuilds a parked rocket with it (rocket-refit).
 *
 * Every part model is authored with its origin at its BASE (y = 0 up to one
 * segment height; a two-unit part stretches it with modelScale.y), and the
 * stack's PlayerConfig.ROCKET_STACK_OFFSET_Y lowers every part by half a
 * segment. So the origin goes half a segment above the part's bottom - the
 * model's base then lands exactly on the top of the part below, whatever
 * its height. (Placing it at the part's middle, bottom + h / 2, was right
 * only for one-unit parts: a two-unit tank rose a whole metre - a gap under
 * it, and its top metre inside the part above, the two hulls' coplanar side
 * walls z-fighting.)
 */
export function stackPartHeights(itemTypes: readonly ItemType[], segmentHeight: number): number[] {
  let bottom = 0;
  return itemTypes.map(t => {
    const part = ITEM_DATA[t]?.rocketPart;
    if (!part) return bottom;
    const origin = bottom + segmentHeight / 2 + (part.modelYOffset ?? 0);
    bottom += part.heightUnits * segmentHeight;
    return origin;
  });
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
  private readonly SEGMENT_HEIGHT = ROCKET_SEGMENT_HEIGHT;  // Height per segment
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
    // Placed rocket parts read the shared sky light (MachineLight.ts) - the
    // sun's height is worked out per vertex from it, as on the terrain
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
    // Uses launchPad shader for world-space geometry (like terrain)
    this.baseMaterial = new THREE.ShaderMaterial({
      uniforms: {
        techTexture: { value: baseTexture },
        ...machineLightUniforms(),
        ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
        directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
      },
      vertexShader: launchPadVert,
      fragmentShader: launchPadFrag,
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
        ...machineLightUniforms(),
        ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
        directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
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
        ...machineLightUniforms(),
        ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
        directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
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
   * Start a pad with its first block. `first` is that hex, `outerRadius`
   * the pad's top. More blocks join with addHex.
   */
  public async createPad(planetCenter: THREE.Vector3, first: PlatformTile, outerRadius: number): Promise<PlacedLaunchPad | null> {
    if (!this.baseMaterial) await this.initGeometryAndMaterials();
    if (!this.baseMaterial) {
      console.error('Failed to initialize launch pad materials');
      return null;
    }
    const group = new THREE.Group();
    group.userData.isLaunchPad = true;
    group.userData.centerTileIndex = first.index;
    this.scene.add(group);

    const top = this.hexTop(first.center, planetCenter, outerRadius);
    const pad: PlacedLaunchPad = {
      mesh: group,
      position: top,
      planetCenter: planetCenter.clone(),
      outerRadius,
      hexes: new Map(),
      placedTiles: new Set(),
      rocketTileIndex: -1,
      towerTileIndex: -1,
      towerTileCenter: top.clone(),
      isComplete: false,
      centerTileIndex: first.index,
      surroundingTileIndices: [],
      rotation: 0,
      segmentCount: 0,
      segmentMeshes: [],
      rocketBlocks: 0,
      rocketMeshes: [],
      rocketParts: [],
      cargo: [],
      equipment: [],
      stash: emptyStash(),
      fuel: ROCKET_CONFIG.NEW_PAD_FUEL,
      hasRocketEngine: false,
      rocketEngineMesh: null,
    };
    this.launchPads.push(pad);
    this.launchPadMeshes.push(group);
    this.addHex(pad, first);
    return pad;
  }

  /** Lay one more block on a pad. Returns false if that hex is already pad. */
  public addHex(pad: PlacedLaunchPad, tile: PlatformTile): boolean {
    if (pad.hexes.has(tile.index) || !this.baseMaterial) return false;
    // a slab set into the ground's top: no skirt down to lower ground (the ground under it is filled)
    const inner = pad.outerRadius - ROCKET_CONFIG.PAD_THICKNESS * this.blockHeightOf(pad);
    const mesh = new THREE.Mesh(this.createHexGeometryFromTile(tile, inner, pad.outerRadius, pad.planetCenter), this.baseMaterial);
    mesh.userData.padTileIndex = tile.index;
    pad.mesh.add(mesh);
    pad.hexes.set(tile.index, { tile, mesh });
    pad.placedTiles.add(tile.index);
    this.updateLayout(pad);
    return true;
  }

  /**
   * A block that touches two pads joins them: `other`'s blocks move onto
   * `target` (at target's level) and `other` goes. Only a pad with nothing
   * built on it can be absorbed.
   */
  public mergeInto(target: PlacedLaunchPad, other: PlacedLaunchPad): boolean {
    if (other === target || other.rocketParts.length > 0 || other.segmentCount > 0 || stashUsed(other.stash) > 0) return false;
    const tiles = [...other.hexes.values()].map(h => h.tile);
    this.removeLaunchPad(other);
    for (const t of tiles) this.addHex(target, t);
    return true;
  }

  /**
   * Why a pad block can't be taken up, or null if it can: the rocket's
   * middle and its ring, and the tower's hex, stay while they're in use.
   */
  public hexRemovalBlocker(pad: PlacedLaunchPad, tileIndex: number): string | null {
    const inUse = pad.rocketParts.length > 0 || pad.segmentCount > 0;
    if (inUse && (tileIndex === pad.rocketTileIndex || pad.surroundingTileIndices.includes(tileIndex))) {
      return 'Take the rocket and tower down before breaking up the pad under them';
    }
    if (pad.segmentCount > 0 && tileIndex === pad.towerTileIndex) return 'Take the tower down first';
    // The last block takes the pad (and its stash) with it
    if (pad.hexes.size <= 1 && stashUsed(pad.stash) > 0) return "Empty the pad's stash first";
    return null;
  }

  /** Take one block up. Removes the pad when it was the last. */
  public removeHex(pad: PlacedLaunchPad, tileIndex: number): boolean {
    const hex = pad.hexes.get(tileIndex);
    if (!hex) return false;
    pad.mesh.remove(hex.mesh);
    hex.mesh.geometry.dispose();
    pad.hexes.delete(tileIndex);
    pad.placedTiles.delete(tileIndex);
    if (pad.hexes.size === 0) {
      this.removeLaunchPad(pad);
      return true;
    }
    if (pad.towerTileIndex === tileIndex) pad.towerTileIndex = -1;
    this.updateLayout(pad);
    return true;
  }

  /**
   * The pad a tile belongs to, or the pads it touches (a new block next to
   * them joins one).
   */
  public padsTouching(tile: { index: number; neighbors: number[] }): PlacedLaunchPad[] {
    return this.launchPads.filter(p => p.hexes.has(tile.index) || tile.neighbors.some(n => p.hexes.has(n)));
  }

  /** Does the pad have the 7 blocks (a middle and its ring) a rocket needs? */
  public canHoldRocket(pad: PlacedLaunchPad): boolean {
    return pad.isComplete;
  }

  /**
   * Find the rocket's middle: keep the current one while its ring is whole,
   * else the first hex whose six neighbours are all pad. The tower stays on
   * its hex; a new tower goes on the ring.
   */
  private updateLayout(pad: PlacedLaunchPad): void {
    const isMiddle = (i: number): boolean => {
      const hex = pad.hexes.get(i);
      return !!hex && hex.tile.neighbors.length === 6 && hex.tile.neighbors.every(n => pad.hexes.has(n));
    };
    let middle = isMiddle(pad.rocketTileIndex) ? pad.rocketTileIndex : -1;
    if (middle < 0) {
      for (const i of pad.hexes.keys()) {
        if (i !== pad.towerTileIndex && isMiddle(i)) { middle = i; break; }
      }
    }
    pad.rocketTileIndex = middle;
    pad.isComplete = middle >= 0 && pad.hexes.size >= ROCKET_CONFIG.PAD_BLOCKS_PER_TOWER;
    const anchor = pad.hexes.get(middle) ?? pad.hexes.get(pad.centerTileIndex) ?? pad.hexes.values().next().value!;
    pad.position = this.hexTop(anchor.tile.center, pad.planetCenter, pad.outerRadius);
    pad.surroundingTileIndices = middle >= 0 ? [...pad.hexes.get(middle)!.tile.neighbors] : [];
    if (pad.towerTileIndex >= 0) {
      pad.towerTileCenter = this.hexTop(pad.hexes.get(pad.towerTileIndex)!.tile.center, pad.planetCenter, pad.outerRadius);
    }
  }

  /**
   * Where a new tower goes: `tileIndex` when given (placed by hand), else the
   * first ring hex. Null with the reason when it can't.
   */
  public towerSiteProblem(pad: PlacedLaunchPad, tileIndex?: number): string | null {
    if (!pad.isComplete) return `A launch pad needs ${ROCKET_CONFIG.PAD_BLOCKS_PER_TOWER} blocks first: a middle hex with a full ring of 6 around it`;
    if (tileIndex === undefined) return null;
    if (!pad.hexes.has(tileIndex)) return 'The tower has to stand on the pad';
    if (tileIndex === pad.rocketTileIndex) return 'The tower can\'t go in the middle - that is where the rocket stands';
    if (pad.towerTileIndex >= 0 && pad.towerTileIndex !== tileIndex) return `Only one tower per ${ROCKET_CONFIG.PAD_BLOCKS_PER_TOWER} pad blocks`;
    return null;
  }

  private hexTop(center: THREE.Vector3, planetCenter: THREE.Vector3, outerRadius: number): THREE.Vector3 {
    return center.clone().normalize().multiplyScalar(outerRadius).add(planetCenter);
  }

  // Block height of the planet the pad sits on: the pad is BASE_HEIGHT of it
  private blockHeightOf(pad: PlacedLaunchPad): number {
    return pad.blockHeight ?? 1;
  }

  /**
   * Restore a pad from a save: every block, then its tower and rocket.
   */
  public async restorePad(
    planetCenter: THREE.Vector3,
    tiles: PlatformTile[],
    outerRadius: number,
    blockHeight: number,
    anchorTileIndex: number,
    towerTileIndex: number,
    segmentCount: number,
    rocketBlocks: number,
    savedRocketParts?: { itemType: ItemType; heightIndex: number }[],
  ): Promise<PlacedLaunchPad | null> {
    const first = tiles.find(t => t.index === anchorTileIndex) ?? tiles[0];
    if (!first) return null;
    const pad = await this.createPad(planetCenter, first, outerRadius);
    if (!pad) return null;
    pad.blockHeight = blockHeight;
    pad.centerTileIndex = anchorTileIndex;
    for (const t of tiles) this.addHex(pad, t);
    pad.fuel = null;
    if (segmentCount > 0) {
      this.startTower(pad, towerTileIndex >= 0 && pad.hexes.has(towerTileIndex) && towerTileIndex !== pad.rocketTileIndex ? towerTileIndex : undefined);
      for (let i = 0; i < segmentCount; i++) this.addSegment(pad);
    }
    pad.rocketBlocks = rocketBlocks;
    if (savedRocketParts && savedRocketParts.length > 0) {
      const sortedParts = [...savedRocketParts].sort((a, b) => a.heightIndex - b.heightIndex);
      for (const part of sortedParts) await this.addRocketPart(pad, part.itemType);
    }
    return pad;
  }

  /**
   * Fix where the tower stands (before its first segment): the given pad hex,
   * or the first ring hex. False when the pad can't take a tower there.
   */
  public startTower(pad: PlacedLaunchPad, tileIndex?: number): boolean {
    if (this.towerSiteProblem(pad, tileIndex)) return false;
    if (pad.towerTileIndex >= 0) return true;
    const site = tileIndex ?? pad.surroundingTileIndices.find(n => pad.hexes.has(n));
    if (site === undefined) return false;
    pad.towerTileIndex = site;
    this.updateLayout(pad);
    return true;
  }

  /**
   * Add a segment to the launch pad tower
   */
  public addSegment(launchPad: PlacedLaunchPad): boolean {
    if (launchPad.segmentCount >= this.MAX_SEGMENTS) {
      return false;
    }
    // A tower needs a complete pad (7 blocks) and stands off the middle
    if (!this.startTower(launchPad)) {
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
    const towerRadialDir = towerBasePos.clone().sub(launchPad.planetCenter).normalize();
    const heightOffset = (launchPad.segmentCount + 0.5) * this.SEGMENT_HEIGHT;
    const segmentPos = towerBasePos.clone()
      .add(towerRadialDir.clone().multiplyScalar(heightOffset));
    segmentMesh.position.copy(segmentPos);

    // Log tower base position info
    const towerDistFromCenter = towerBasePos.distanceTo(launchPad.planetCenter);
    console.log(`[Tower Segment ${launchPad.segmentCount}] baseDistFromCenter: ${towerDistFromCenter.toFixed(3)}, heightOffset: ${heightOffset.toFixed(3)}, finalDist: ${segmentPos.distanceTo(launchPad.planetCenter).toFixed(3)}`);

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
      // The tower is gone: the next one can stand on another hex
      if (launchPad.segmentCount === 0) launchPad.towerTileIndex = -1;
      return true;
    }

    return false;
  }

  /**
   * Load rocket part model and material for a given item type
   * Caches the result for reuse
   */
  // Public: multiplayer builds other players' rockets from the same models
  public async loadRocketPartAssets(itemType: ItemType): Promise<{ geometry: THREE.BufferGeometry; material: THREE.ShaderMaterial } | null> {
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
          ...machineLightUniforms(),
          planetRadius: { value: this.planetRadius },
          atmosphereHeight: { value: this.atmosphereHeight },
          ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
          directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
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

    // Need a complete pad (7 blocks) and at least 1 tower segment
    if (!launchPad.isComplete || launchPad.segmentCount < 1) {
      return false;
    }

    // Load or get cached assets
    const assets = await this.loadRocketPartAssets(itemType);
    if (!assets) {
      return false;
    }

    // Create mesh with cloned material so each part has independent uniforms
    const clonedMaterial = withMachineLight(assets.material.clone());

    // Lit like the pad and machines: the shared sky light (MachineLight.ts)

    const partMesh = new THREE.Mesh(assets.geometry, clonedMaterial);
    const partGroup = new THREE.Group();
    partGroup.add(partMesh);

    // Calculate position: stack parts vertically above the rocket tile
    // The rocket tile and tower tile may be at different elevations on the planet surface
    // We want the rocket to sit at the SAME surface level as the tower
    const rocketRadialDir = launchPad.position.clone().sub(launchPad.planetCenter).normalize();

    // Get the surface level from the tower tile (same as where tower segments start)
    const towerSurfaceDistance = launchPad.towerTileCenter.distanceTo(launchPad.planetCenter);

    // Where the part sits up the stack (one rule for the pad and refits)
    const heights = stackPartHeights([...launchPad.rocketParts.map(p => p.itemType), itemType], this.SEGMENT_HEIGHT);
    const partHeight = heights[heights.length - 1];

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
    const partPos = launchPad.planetCenter.clone()
      .add(rocketRadialDir.clone().multiplyScalar(towerSurfaceDistance + partHeight + offsetY))
      .add(localX.clone().multiplyScalar(offsetX))
      .add(localZ.clone().multiplyScalar(offsetZ));

    // Log rocket part position info
    const rocketTileDistFromCenter = launchPad.position.distanceTo(launchPad.planetCenter);
    console.log(`[Rocket Part ${launchPad.rocketParts.length}] rocketTileDist: ${rocketTileDistFromCenter.toFixed(3)}, towerSurfaceDist: ${towerSurfaceDistance.toFixed(3)}, partHeight: ${partHeight.toFixed(3)}, finalDist: ${partPos.distanceTo(launchPad.planetCenter).toFixed(3)}`);

    partGroup.position.copy(partPos);
    partGroup.quaternion.copy(quaternion);

    // Scale the part (a part may stretch the shared model, e.g. a 2-unit tank)
    const ms = itemData.rocketPart.modelScale ?? { x: 1, y: 1, z: 1 };
    partGroup.scale.set(this.ROCKET_PART_SCALE * ms.x, this.ROCKET_PART_SCALE * ms.y, this.ROCKET_PART_SCALE * ms.z);

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
    this.syncRocketHold(launchPad);

    // Update legacy hasRocketEngine flag for backwards compatibility
    if (itemData.rocketPart.partType === RocketPartType.ENGINE) {
      launchPad.hasRocketEngine = true;
      launchPad.rocketEngineMesh = partGroup;
    }

    return true;
  }

  /**
   * Make the pad's stack `types` (bottom to top) - the stack editor's one way
   * to remove, insert or move a part anywhere. The parts that stay the same
   * from the bottom keep their meshes; everything above the first change is
   * stacked again at its new height. The cargo hold, equipment and fuel come
   * through the rebuild (the hold arrays keep their identity - a flying or
   * landed rocket shares them). Returns why it can't, or null when done.
   */
  public async setRocketStack(launchPad: PlacedLaunchPad, types: readonly ItemType[]): Promise<string | null> {
    if (!launchPad.isComplete || launchPad.segmentCount < 1) return 'The rocket needs a complete pad and a tower';
    const holdProblem = this.stackHoldProblem(launchPad, types);
    if (holdProblem) return holdProblem;
    const old = launchPad.rocketParts.map(p => p.itemType);
    let keep = 0;
    while (keep < old.length && keep < types.length && old[keep] === types[keep]) keep++;
    if (keep === old.length && keep === types.length) return null;
    // Snapshot what the rebuild would otherwise shrink away mid-way
    const copy = (slots: InventorySlot[]) => slots.map(sl => ({ itemType: sl.itemType, quantity: sl.quantity }));
    const cargo = copy(launchPad.cargo), equipment = copy(launchPad.equipment);
    const fuel = launchPad.fuel;
    while (launchPad.rocketParts.length > keep) {
      const part = launchPad.rocketParts.pop()!;
      launchPad.mesh.remove(part.mesh);
      part.dispose();
    }
    for (let i = keep; i < types.length; i++) await this.addRocketPart(launchPad, types[i]);
    // The holds: the same slots when they still fit, else packed to the front
    for (const [into, from] of [[launchPad.cargo, cargo], [launchPad.equipment, equipment]] as const) {
      const size = into.length;
      into.length = 0;
      into.push(...from);
      if (from.length > size) fitSlots(into, size);
      while (into.length < size) into.push({ itemType: ItemType.NONE, quantity: 0 });
    }
    const cap = computeRocketStats(types).fuelCapacity;
    launchPad.fuel = fuel === null ? null : Math.min(fuel, cap);
    launchPad.engineMode = validEngineMode(launchPad.rocketParts.map(p => p.itemType), launchPad.engineMode ?? null);
    const hasEngine = launchPad.rocketParts.some(p => ITEM_DATA[p.itemType].rocketPart?.partType === RocketPartType.ENGINE);
    launchPad.hasRocketEngine = hasEngine;
    if (!hasEngine) launchPad.rocketEngineMesh = null;
    return null;
  }

  /**
   * Size the pad's cargo hold and equipment slots to its parts and clamp its
   * fuel to the tanks
   */
  private syncRocketHold(launchPad: PlacedLaunchPad): void {
    const types = launchPad.rocketParts.map(p => p.itemType);
    const stats = computeRocketStats(types);
    for (const [slots, size] of [[launchPad.cargo, stats.cargoSlots], [launchPad.equipment, stats.equipmentSlots]] as const) {
      while (slots.length < size) slots.push({ itemType: ItemType.NONE, quantity: 0 });
      if (slots.length > size) slots.length = size;
    }
    if (launchPad.fuel !== null) {
      launchPad.fuel = Math.min(launchPad.fuel, stats.fuelCapacity);
    }
  }

  /**
   * Would the stack `types` spill cargo or equipment the pad's rocket holds
   * now (it gives fewer slots than are in use)? The reason, or null.
   */
  public stackHoldProblem(launchPad: PlacedLaunchPad, types: readonly ItemType[]): string | null {
    const used = (slots: InventorySlot[]) => slots.filter(s => s.itemType !== ItemType.NONE && s.quantity > 0).length;
    if (used(launchPad.cargo) > cargoSlotsFor(types)) return 'Empty the cargo hold first - the new stack has less room';
    if (used(launchPad.equipment) > equipmentSlotsFor(types)) return 'Take out the equipment first - the new stack has fewer slots';
    return null;
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
    const radialDir = launchPad.position.clone().sub(launchPad.planetCenter).normalize();

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
    this.syncRocketHold(launchPad);

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
    return this.launchPads.find(pad => pad.hexes.has(tileIndex)) ?? null;
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
