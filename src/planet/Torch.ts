import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PlayerConfig } from '../config/PlayerConfig';
import torchVert from '../shaders/torch/torch.vert';
import torchFrag from '../shaders/torch/torch.frag';

// Torch configuration - uses PlayerConfig for gameplay values
export const TorchConfig = {
  LIGHT_COLOR: 0xffaa44,      // Warm orange/yellow
  get LIGHT_INTENSITY() { return PlayerConfig.TORCH_LIGHT_INTENSITY; },
  get LIGHT_RANGE() { return PlayerConfig.TORCH_LIGHT_RANGE; },
  LIGHT_DECAY: 2,             // Quadratic falloff
  get FLICKER_SPEED() { return PlayerConfig.TORCH_FLICKER_SPEED; },
  get FLICKER_AMOUNT() { return PlayerConfig.TORCH_FLICKER_AMOUNT; },
  HANDLE_HEIGHT: 0.4,         // Torch handle length
  HANDLE_RADIUS: 0.03,        // Torch handle thickness
  HEAD_RADIUS: 0.06,          // Torch head (flame holder) radius
  HEAD_HEIGHT: 0.1,           // Torch head height
  FLAME_HEIGHT: 0.15,         // Flame height
  FLAME_RADIUS: 0.05,         // Flame base radius
  HELD_OFFSET: new THREE.Vector3(0.25, -0.2, -0.4), // Offset from camera for held torch
  HELD_ROTATION: new THREE.Euler(-0.3, 0.2, 0.1),   // Rotation when held
};

// Shared torch shader material (all torches share the same material for batching)
let sharedTorchMaterial: THREE.ShaderMaterial | null = null;

function getSharedTorchMaterial(): THREE.ShaderMaterial {
  if (!sharedTorchMaterial) {
    sharedTorchMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        flickerAmount: { value: 0.15 },
      },
      vertexShader: torchVert,
      fragmentShader: torchFrag,
      vertexColors: true,
    });
  }
  return sharedTorchMaterial;
}

// Update shared material time uniform (called from TorchManager.update)
export function updateTorchShaderTime(time: number): void {
  if (sharedTorchMaterial) {
    sharedTorchMaterial.uniforms.time.value = time;
  }
}

// Create torch geometry (procedural - merged into single mesh for fewer draw calls)
function createTorchGeometry(): THREE.Group {
  const torch = new THREE.Group();

  // Handle (brown cylinder)
  const handleGeom = new THREE.CylinderGeometry(
    TorchConfig.HANDLE_RADIUS,
    TorchConfig.HANDLE_RADIUS,
    TorchConfig.HANDLE_HEIGHT,
    8
  );
  handleGeom.translate(0, TorchConfig.HANDLE_HEIGHT / 2, 0);

  // Head (dark gray cylinder - coal/cloth holder)
  const headGeom = new THREE.CylinderGeometry(
    TorchConfig.HEAD_RADIUS,
    TorchConfig.HEAD_RADIUS * 0.8,
    TorchConfig.HEAD_HEIGHT,
    8
  );
  headGeom.translate(0, TorchConfig.HANDLE_HEIGHT + TorchConfig.HEAD_HEIGHT / 2, 0);

  // Flame (orange cone)
  const flameGeom = new THREE.ConeGeometry(
    TorchConfig.FLAME_RADIUS,
    TorchConfig.FLAME_HEIGHT,
    8
  );
  flameGeom.translate(0, TorchConfig.HANDLE_HEIGHT + TorchConfig.HEAD_HEIGHT + TorchConfig.FLAME_HEIGHT / 2, 0);

  // Add vertex colors to each geometry before merging
  const handleColor = new THREE.Color(0x8B4513); // Brown
  const headColor = new THREE.Color(0x333333);   // Dark gray
  const flameColor = new THREE.Color(TorchConfig.LIGHT_COLOR);

  addVertexColors(handleGeom, handleColor);
  addVertexColors(headGeom, headColor);
  addVertexColors(flameGeom, flameColor);

  // Add animation weight attribute (0 = static, 1 = animated)
  // Handle and head don't animate, flame does
  addAnimWeight(handleGeom, 0.0);
  addAnimWeight(headGeom, 0.0);
  addAnimWeight(flameGeom, 1.0);

  // Merge all geometries into one
  const mergedGeom = BufferGeometryUtils.mergeGeometries([handleGeom, headGeom, flameGeom]);

  // Use shared shader material for batching efficiency
  const material = getSharedTorchMaterial();

  const mesh = new THREE.Mesh(mergedGeom, material);
  mesh.name = 'torchMesh';
  torch.add(mesh);

  // Clean up individual geometries
  handleGeom.dispose();
  headGeom.dispose();
  flameGeom.dispose();

  return torch;
}

// Helper to add vertex colors to a geometry
function addVertexColors(geometry: THREE.BufferGeometry, color: THREE.Color): void {
  const positionCount = geometry.attributes.position.count;
  const colors = new Float32Array(positionCount * 3);
  for (let i = 0; i < positionCount; i++) {
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

// Helper to add animation weight attribute to a geometry
// 0 = no animation (static), 1 = full animation (flame)
function addAnimWeight(geometry: THREE.BufferGeometry, weight: number): void {
  const positionCount = geometry.attributes.position.count;
  const weights = new Float32Array(positionCount);
  for (let i = 0; i < positionCount; i++) {
    weights[i] = weight;
  }
  geometry.setAttribute('animWeight', new THREE.BufferAttribute(weights, 1));
}

// Held torch (first-person view)
export class HeldTorch {
  private torchGroup: THREE.Group;
  private pointLight: THREE.PointLight;
  private camera: THREE.Camera;
  private isVisible: boolean = false;
  private flickerTime: number = 0;
  private baseIntensity: number;

  constructor(camera: THREE.Camera, _scene: THREE.Scene) {
    this.camera = camera;
    this.baseIntensity = TorchConfig.LIGHT_INTENSITY;

    // Create torch mesh
    this.torchGroup = createTorchGeometry();
    this.torchGroup.visible = false;

    // Position relative to camera
    this.torchGroup.position.copy(TorchConfig.HELD_OFFSET);
    this.torchGroup.rotation.copy(TorchConfig.HELD_ROTATION);

    // Create point light at flame position
    this.pointLight = new THREE.PointLight(
      TorchConfig.LIGHT_COLOR,
      0, // Start with 0 intensity (hidden)
      TorchConfig.LIGHT_RANGE,
      TorchConfig.LIGHT_DECAY
    );

    // Add to camera so they move together
    camera.add(this.torchGroup);
    camera.add(this.pointLight);

    // Position light at flame tip (in camera space)
    const flameWorldY = TorchConfig.HELD_OFFSET.y + TorchConfig.HANDLE_HEIGHT + TorchConfig.HEAD_HEIGHT + TorchConfig.FLAME_HEIGHT;
    this.pointLight.position.set(TorchConfig.HELD_OFFSET.x, flameWorldY, TorchConfig.HELD_OFFSET.z);
  }

  public setVisible(visible: boolean): void {
    this.isVisible = visible;
    this.torchGroup.visible = visible;
    this.pointLight.intensity = visible ? this.baseIntensity : 0;
  }

  public update(deltaTime: number): void {
    if (!this.isVisible) return;

    // Flicker effect for point light
    this.flickerTime += deltaTime * TorchConfig.FLICKER_SPEED;
    const flicker = Math.sin(this.flickerTime) * Math.sin(this.flickerTime * 2.3) * Math.sin(this.flickerTime * 0.7);
    this.pointLight.intensity = this.baseIntensity * (1 + flicker * TorchConfig.FLICKER_AMOUNT);

    // Update shader time uniform - flame animation is handled by vertex shader
    updateTorchShaderTime(this.flickerTime);
  }

  public dispose(): void {
    this.camera.remove(this.torchGroup);
    this.camera.remove(this.pointLight);
    this.torchGroup.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    });
    this.pointLight.dispose();
  }
}

// Placed torch in the world
// Note: No PointLight - real-time lights cause shader recompilation spikes
// Torch lighting is provided by vertex-baked lighting in the terrain shader
export interface PlacedTorch {
  group: THREE.Group;
  tileIndex: number;
  position: THREE.Vector3;
  flickerOffset: number; // Random offset for flicker variation
}

// Manages all placed torches in the world
export class TorchManager {
  private scene: THREE.Scene;
  private placedTorches: PlacedTorch[] = [];
  private torchesByTile: Map<number, PlacedTorch[]> = new Map();
  private flickerTime: number = 0;

  // Light baking - stores torch contributions for terrain rebuild
  private torchLightData: Map<string, number> = new Map(); // key: "tileIndex:depth" -> light level 0-1

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  // Place a torch at a world position
  // Note: No PointLight added - causes shader recompilation spikes (1800ms+)
  // Torch lighting comes from vertex-baked lighting in terrain shader
  public placeTorch(
    worldPosition: THREE.Vector3,
    planetCenter: THREE.Vector3,
    tileIndex: number
  ): PlacedTorch {
    // Create torch mesh
    const torchGroup = createTorchGeometry();

    // Mark group as torch for raycasting identification
    torchGroup.userData.isTorch = true;

    // Orient torch to point away from planet center (upward on surface)
    const upDirection = worldPosition.clone().sub(planetCenter).normalize();
    const defaultUp = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultUp, upDirection);
    torchGroup.quaternion.copy(quaternion);
    torchGroup.position.copy(worldPosition);

    // Store torch data (no PointLight - lighting is vertex-baked)
    const torch: PlacedTorch = {
      group: torchGroup,
      tileIndex,
      position: worldPosition.clone(),
      flickerOffset: Math.random() * Math.PI * 2, // Random phase offset
    };

    // Add mesh to scene (no light)
    this.scene.add(torchGroup);

    // Track by tile for visibility culling
    if (!this.torchesByTile.has(tileIndex)) {
      this.torchesByTile.set(tileIndex, []);
    }
    this.torchesByTile.get(tileIndex)!.push(torch);
    this.placedTorches.push(torch);

    return torch;
  }

  // Remove a torch
  public removeTorch(torch: PlacedTorch): void {
    const index = this.placedTorches.indexOf(torch);
    if (index >= 0) {
      this.placedTorches.splice(index, 1);

      // Remove from tile map
      const tileTorches = this.torchesByTile.get(torch.tileIndex);
      if (tileTorches) {
        const tileIndex = tileTorches.indexOf(torch);
        if (tileIndex >= 0) {
          tileTorches.splice(tileIndex, 1);
        }
      }

      // Remove from scene
      this.scene.remove(torch.group);

      // Dispose geometry and materials
      torch.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
    }
  }

  // Update all torches (flicker animation via shader - no PointLight)
  public update(deltaTime: number): void {
    this.flickerTime += deltaTime * TorchConfig.FLICKER_SPEED;

    // Update the shared shader material time uniform
    // All torches animate together via the shader, no per-torch scale needed
    updateTorchShaderTime(this.flickerTime);
  }

  // Update visibility based on which tiles are rendered
  public updateVisibility(visibleTileIndices: Set<number>): void {
    for (const [tileIndex, tileTorches] of this.torchesByTile) {
      const visible = visibleTileIndices.has(tileIndex);
      for (const torch of tileTorches) {
        torch.group.visible = visible;
      }
    }
  }

  // Calculate torch light contribution for a given world position
  // Returns 0-1 light level (0 = no torch light, 1 = max torch light)
  public getTorchLightAt(worldPosition: THREE.Vector3): number {
    let totalLight = 0;

    for (const torch of this.placedTorches) {
      const distance = worldPosition.distanceTo(torch.position);
      if (distance < TorchConfig.LIGHT_RANGE) {
        // Inverse square falloff with decay
        const attenuation = 1 / (1 + TorchConfig.LIGHT_DECAY * distance * distance / (TorchConfig.LIGHT_RANGE * TorchConfig.LIGHT_RANGE));
        totalLight += attenuation;
      }
    }

    return Math.min(1, totalLight);
  }

  // Get all torch light data for terrain baking
  public getTorchLightData(): Map<string, number> {
    return this.torchLightData;
  }

  // Get all placed torches
  public getPlacedTorches(): PlacedTorch[] {
    return this.placedTorches;
  }

  // Get all torch data for vertex baking (position, range, intensity)
  public getTorchDataForBaking(): Array<{ position: THREE.Vector3; range: number; intensity: number }> {
    return this.placedTorches.map(torch => {
      // Use flame position (top of torch) as light source
      const flameHeight = TorchConfig.HANDLE_HEIGHT + TorchConfig.HEAD_HEIGHT + TorchConfig.FLAME_HEIGHT;
      const upDir = torch.position.clone().normalize();
      const flamePos = torch.position.clone().add(upDir.multiplyScalar(flameHeight));

      return {
        position: flamePos,
        range: TorchConfig.LIGHT_RANGE,
        intensity: TorchConfig.LIGHT_INTENSITY
      };
    });
  }

  // Check if a tile has at least one torch (for LOD vertex lighting)
  public hasTorchOnTile(tileIndex: number): boolean {
    const tileTorches = this.torchesByTile.get(tileIndex);
    return tileTorches !== undefined && tileTorches.length > 0;
  }

  // Get all tile indices that have torches (for LOD mesh rebuilding)
  public getTilesWithTorches(): Set<number> {
    const tiles = new Set<number>();
    for (const [tileIndex, torches] of this.torchesByTile) {
      if (torches.length > 0) {
        tiles.add(tileIndex);
      }
    }
    return tiles;
  }

  // Get the N nearest torch positions to a given point (for shader uniforms)
  // Returns up to maxCount positions, sorted by distance
  public getNearestTorchPositions(playerPosition: THREE.Vector3, maxCount: number = 16): THREE.Vector3[] {
    // Get all torch flame positions (offset from base position)
    const torchesWithDistance = this.placedTorches.map(torch => {
      // Flame position is at the top of the torch
      const flameHeight = TorchConfig.HANDLE_HEIGHT + TorchConfig.HEAD_HEIGHT + TorchConfig.FLAME_HEIGHT;
      const upDir = torch.position.clone().normalize();
      const flamePos = torch.position.clone().add(upDir.multiplyScalar(flameHeight));

      return {
        position: flamePos,
        distance: playerPosition.distanceTo(flamePos)
      };
    });

    // Sort by distance and take the nearest ones
    torchesWithDistance.sort((a, b) => a.distance - b.distance);

    return torchesWithDistance
      .slice(0, maxCount)
      .map(t => t.position);
  }

  // Get torch meshes for raycasting
  public getTorchMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    for (const torch of this.placedTorches) {
      torch.group.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          meshes.push(child);
        }
      });
    }
    return meshes;
  }

  public dispose(): void {
    for (const torch of [...this.placedTorches]) {
      this.removeTorch(torch);
    }
  }
}
