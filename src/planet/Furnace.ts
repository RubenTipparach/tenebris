import * as THREE from 'three';
import { getAssetPath } from '../utils/assetPath';
import { PlayerConfig } from '../config/PlayerConfig';
import { ItemType } from '../player/Inventory';
import techVert from '../shaders/tech/tech.vert';
import techFrag from '../shaders/tech/tech.frag';

// Smelting recipes: ore -> ingot
export interface SmeltingRecipe {
  input: ItemType;
  output: ItemType;
  outputQuantity: number;
}

export const SMELTING_RECIPES: SmeltingRecipe[] = [
  { input: ItemType.ORE_COPPER, output: ItemType.INGOT_COPPER, outputQuantity: 1 },
  { input: ItemType.ORE_IRON, output: ItemType.INGOT_IRON, outputQuantity: 1 },
  { input: ItemType.ORE_GOLD, output: ItemType.INGOT_GOLD, outputQuantity: 1 },
  { input: ItemType.ORE_ALUMINUM, output: ItemType.INGOT_ALUMINUM, outputQuantity: 1 },
  // Note: Lithium and Cobalt require electrical furnace (not implemented yet)
];

// Furnace texture layout (48x32, each face is 16x16):
// Row 1: Front(0,0) | Side1(16,0) | Side2(32,0)
// Row 2: Side3(0,16) | Top(16,16) | Bottom(32,16)
//
// Face mapping:
// 1 = Front (0,0)
// 2,3,4 = Sides (16,0), (32,0), (0,16)
// 5 = Top (16,16)
// 6 = Bottom (32,16)

export interface PlacedFurnace {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  tileIndex: number;
  rotation: number;  // Y-axis rotation for facing direction
  fuelAmount: number;  // Current fuel (in coal units, 1 coal = 8 smelt operations)
  smeltingItem: number | null;  // ItemType being smelted
  smeltingProgress: number;  // 0-1 progress of current smelt
  inputCount: number;  // Number of items queued for smelting (including current)
  outputItem: number | null;  // Completed smelted item waiting to be collected
  outputCount: number;  // Number of output items
}

export class FurnaceManager {
  private scene: THREE.Scene;
  private furnaces: PlacedFurnace[] = [];
  private furnaceMeshes: THREE.Mesh[] = [];  // For raycasting
  private textureLoader: THREE.TextureLoader;
  private furnaceGeometry: THREE.BoxGeometry | null = null;
  private furnaceMaterial: THREE.ShaderMaterial | null = null;
  private onSmeltCompleteCallback: (() => void) | null = null;

  // Planet lighting uniforms
  private planetCenter: THREE.Vector3;
  private sunDirection: THREE.Vector3;

  // Furnace size (cube sitting on top of hex tile)
  private readonly FURNACE_SIZE = 0.8;
  private readonly SMELT_TIME = 10; // seconds per item

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
    if (this.furnaceMaterial) {
      this.furnaceMaterial.uniforms.sunDirection.value.copy(direction);
    }
  }

  // Update planet center (if planet moves)
  public setPlanetCenter(center: THREE.Vector3): void {
    this.planetCenter.copy(center);
    if (this.furnaceMaterial) {
      this.furnaceMaterial.uniforms.planetCenter.value.copy(center);
    }
  }

  public setOnSmeltCompleteCallback(callback: () => void): void {
    this.onSmeltCompleteCallback = callback;
  }

  private async initGeometryAndMaterials(): Promise<void> {
    // Load the furnace texture
    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader.load(
        getAssetPath('/textures/technology/furnace.png'),
        resolve,
        undefined,
        reject
      );
    });

    // Configure for pixel art
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    // Create geometry for the furnace cube
    this.furnaceGeometry = new THREE.BoxGeometry(
      this.FURNACE_SIZE,
      this.FURNACE_SIZE,
      this.FURNACE_SIZE
    );

    // Calculate UV coordinates for each face from the 48x32 texture atlas
    const faceUVs = this.calculateFaceUVs();

    // Apply UVs to geometry
    const uvAttribute = this.furnaceGeometry.attributes.uv;
    const uvArray = uvAttribute.array as Float32Array;

    // Box faces order in THREE.js: +X, -X, +Y, -Y, +Z, -Z
    // We map: +Z=Front, -Z=Back(Side), +X=Right(Side), -X=Left(Side), +Y=Top, -Y=Bottom
    // BoxGeometry UV vertex order: bottom-left(0), bottom-right(1), top-left(2), top-right(3)
    const applyFaceUV = (faceIndex: number, uv: { u1: number; v1: number; u2: number; v2: number }, flipHorizontal = false, flipVertical = false) => {
      const baseIndex = faceIndex * 8;
      // Determine actual UV coords based on flip flags
      const left = flipHorizontal ? uv.u2 : uv.u1;
      const right = flipHorizontal ? uv.u1 : uv.u2;
      const bottom = flipVertical ? uv.v2 : uv.v1;
      const top = flipVertical ? uv.v1 : uv.v2;

      uvArray[baseIndex + 0] = left;  uvArray[baseIndex + 1] = bottom; // bottom-left
      uvArray[baseIndex + 2] = right; uvArray[baseIndex + 3] = bottom; // bottom-right
      uvArray[baseIndex + 4] = left;  uvArray[baseIndex + 5] = top;    // top-left
      uvArray[baseIndex + 6] = right; uvArray[baseIndex + 7] = top;    // top-right
    };

    // Apply UVs to each face (flip vertical on side faces to correct Y orientation)
    applyFaceUV(0, faceUVs.side, true, true);   // +X (right side) - flip H and V
    applyFaceUV(1, faceUVs.side, false, true);  // -X (left side) - flip V
    applyFaceUV(2, faceUVs.top, false, false);  // +Y (top)
    applyFaceUV(3, faceUVs.bottom, false, false); // -Y (bottom)
    applyFaceUV(4, faceUVs.front, false, true); // +Z (front) - flip V
    applyFaceUV(5, faceUVs.side, true, true);   // -Z (back side) - flip H and V

    uvAttribute.needsUpdate = true;

    // Create material with custom shader for planet-aware lighting and torch support
    this.furnaceMaterial = new THREE.ShaderMaterial({
      uniforms: {
        techTexture: { value: texture },
        sunDirection: { value: this.sunDirection.clone() },
        planetCenter: { value: this.planetCenter.clone() },
        ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
        directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
        torchLight: { value: 0.0 },  // Updated per-furnace based on nearby torches
      },
      vertexShader: techVert,
      fragmentShader: techFrag,
    });
  }

  private calculateFaceUVs(): {
    front: { u1: number; v1: number; u2: number; v2: number };
    side: { u1: number; v1: number; u2: number; v2: number };
    top: { u1: number; v1: number; u2: number; v2: number };
    bottom: { u1: number; v1: number; u2: number; v2: number };
  } {
    // Texture layout (48x32):
    // Row 1 (y=0-16):  Front(0-16) | Side(16-32) | Side(32-48)
    // Row 2 (y=16-32): Side(0-16)  | Top(16-32)  | Bottom(32-48)

    const texWidth = 48;
    const texHeight = 32;
    const cellSize = 16;

    // UV coordinates: u1,v1 = bottom-left, u2,v2 = top-right (in UV space, V increases upward)
    const uv = (x: number, y: number, w: number, h: number) => ({
      u1: x / texWidth,
      v1: 1 - (y + h) / texHeight,  // Bottom in UV space
      u2: (x + w) / texWidth,
      v2: 1 - y / texHeight,        // Top in UV space
    });

    return {
      front: uv(0, 0, cellSize, cellSize),      // Position 1
      side: uv(cellSize, 0, cellSize, cellSize), // Position 2
      top: uv(cellSize, cellSize, cellSize, cellSize),    // Position 5
      bottom: uv(cellSize * 2, cellSize, cellSize, cellSize), // Position 6
    };
  }

  public async placeFurnace(
    worldPosition: THREE.Vector3,
    planetCenter: THREE.Vector3,
    tileIndex: number,
    playerForward?: THREE.Vector3
  ): Promise<PlacedFurnace | null> {
    // Wait for geometry/materials to be ready
    if (!this.furnaceGeometry || !this.furnaceMaterial) {
      await this.initGeometryAndMaterials();
    }

    if (!this.furnaceGeometry || !this.furnaceMaterial) {
      console.error('Failed to initialize furnace geometry/materials');
      return null;
    }

    // Clone the material for per-furnace torch lighting
    const instanceMaterial = this.furnaceMaterial.clone();

    // Create the furnace mesh with its own material instance
    const mesh = new THREE.Mesh(this.furnaceGeometry, instanceMaterial);

    // Position the furnace slightly above the ground
    const upDirection = worldPosition.clone().sub(planetCenter).normalize();
    const furnacePosition = worldPosition.clone().add(upDirection.multiplyScalar(this.FURNACE_SIZE / 2));
    mesh.position.copy(furnacePosition);

    // Orient the furnace so it sits flat on the hex tile and faces the player
    const up = furnacePosition.clone().sub(planetCenter).normalize();

    // Create basis vectors for the surface tangent plane
    let tangent = new THREE.Vector3(1, 0, 0);
    if (Math.abs(up.dot(tangent)) > 0.9) {
      tangent = new THREE.Vector3(0, 0, 1);
    }
    const bitangent = new THREE.Vector3().crossVectors(up, tangent).normalize();
    tangent.crossVectors(bitangent, up).normalize();

    // Calculate the facing direction based on player forward (projected onto surface)
    let facingAngle = 0;
    if (playerForward) {
      // Project player forward onto the surface tangent plane
      const projectedForward = playerForward.clone();
      projectedForward.sub(up.clone().multiplyScalar(projectedForward.dot(up)));
      projectedForward.normalize();

      // Calculate angle in the tangent plane (front faces towards player = opposite of player forward)
      const towardPlayer = projectedForward.clone().negate();
      const angleFromTangent = Math.atan2(towardPlayer.dot(bitangent), towardPlayer.dot(tangent));

      // Snap to nearest 60 degrees (hex alignment) if enabled
      if (PlayerConfig.TECH_BLOCK_HEX_SNAP) {
        const snapAngle = Math.PI / 3; // 60 degrees
        facingAngle = Math.round(angleFromTangent / snapAngle) * snapAngle;
      } else {
        facingAngle = angleFromTangent;
      }
    }

    // Add configurable rotation offset (convert from degrees to radians)
    const offsetAngle = PlayerConfig.TECH_BLOCK_ROTATION_OFFSET * (Math.PI / 180);
    facingAngle += offsetAngle;

    // Build the rotation: first align Y with up, then rotate around local Y by facingAngle
    const alignQuaternion = new THREE.Quaternion();
    alignQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);

    // Additional rotation around local Y axis to face player
    const rotateY = new THREE.Quaternion();
    rotateY.setFromAxisAngle(up, facingAngle);

    mesh.quaternion.copy(rotateY).multiply(alignQuaternion);

    // Mark for raycasting
    mesh.userData.isFurnace = true;
    mesh.userData.tileIndex = tileIndex;

    // Add to scene
    this.scene.add(mesh);

    // Create the furnace data
    const furnace: PlacedFurnace = {
      mesh,
      position: furnacePosition.clone(),
      tileIndex,
      rotation: facingAngle,
      fuelAmount: 0,
      smeltingItem: null,
      smeltingProgress: 0,
      inputCount: 0,
      outputItem: null,
      outputCount: 0,
    };

    this.furnaces.push(furnace);
    this.furnaceMeshes.push(mesh);

    return furnace;
  }

  // Restore a furnace from saved data (exact position, no offset calculation)
  public async restoreFurnace(
    savedPosition: THREE.Vector3,
    planetCenter: THREE.Vector3,
    tileIndex: number,
    rotation: number
  ): Promise<PlacedFurnace | null> {
    // Wait for geometry/materials to be ready
    if (!this.furnaceGeometry || !this.furnaceMaterial) {
      await this.initGeometryAndMaterials();
    }

    if (!this.furnaceGeometry || !this.furnaceMaterial) {
      console.error('Failed to initialize furnace geometry/materials');
      return null;
    }

    // Clone the material for per-furnace torch lighting
    const instanceMaterial = this.furnaceMaterial.clone();

    // Create the furnace mesh with its own material instance
    const mesh = new THREE.Mesh(this.furnaceGeometry, instanceMaterial);

    // Use exact saved position (no offset - already includes it)
    mesh.position.copy(savedPosition);

    // Orient the furnace using saved rotation
    const up = savedPosition.clone().sub(planetCenter).normalize();
    const alignQuaternion = new THREE.Quaternion();
    alignQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);

    const rotateY = new THREE.Quaternion();
    rotateY.setFromAxisAngle(up, rotation);

    mesh.quaternion.copy(rotateY).multiply(alignQuaternion);

    // Mark for raycasting
    mesh.userData.isFurnace = true;
    mesh.userData.tileIndex = tileIndex;

    // Add to scene
    this.scene.add(mesh);

    // Create the furnace data
    const furnace: PlacedFurnace = {
      mesh,
      position: savedPosition.clone(),
      tileIndex,
      rotation,
      fuelAmount: 0,
      smeltingItem: null,
      smeltingProgress: 0,
      inputCount: 0,
      outputItem: null,
      outputCount: 0,
    };

    this.furnaces.push(furnace);
    this.furnaceMeshes.push(mesh);

    return furnace;
  }

  public removeFurnace(furnace: PlacedFurnace): void {
    const index = this.furnaces.indexOf(furnace);
    if (index === -1) return;

    // Remove from scene
    this.scene.remove(furnace.mesh);
    furnace.mesh.geometry.dispose();
    // Dispose the cloned material
    if (furnace.mesh.material instanceof THREE.ShaderMaterial) {
      furnace.mesh.material.dispose();
    }

    // Remove from arrays
    this.furnaces.splice(index, 1);
    const meshIndex = this.furnaceMeshes.indexOf(furnace.mesh);
    if (meshIndex !== -1) {
      this.furnaceMeshes.splice(meshIndex, 1);
    }
  }

  public getFurnaceMeshes(): THREE.Mesh[] {
    return this.furnaceMeshes;
  }

  public getPlacedFurnaces(): PlacedFurnace[] {
    return this.furnaces;
  }

  public getFurnaceByMesh(mesh: THREE.Mesh): PlacedFurnace | undefined {
    return this.furnaces.find(f => f.mesh === mesh);
  }

  public getFurnaceAtTile(tileIndex: number): PlacedFurnace | undefined {
    return this.furnaces.find(f => f.tileIndex === tileIndex);
  }

  // Update torch lighting for all furnaces based on nearby torch positions
  public updateTorchLighting(torchPositions: THREE.Vector3[], torchRange: number, torchIntensity: number): void {
    for (const furnace of this.furnaces) {
      let totalLight = 0;

      for (const torchPos of torchPositions) {
        const distance = furnace.position.distanceTo(torchPos);
        if (distance < torchRange) {
          // Inverse square falloff with decay (matching terrain)
          const decay = 2; // Same as TorchConfig.LIGHT_DECAY
          const attenuation = 1 / (1 + decay * distance * distance / (torchRange * torchRange));
          totalLight += attenuation * torchIntensity;
        }
      }

      // Clamp and apply to material uniform
      totalLight = Math.min(1.5, totalLight); // Allow slight over-brightness for nearby torches
      const material = furnace.mesh.material as THREE.ShaderMaterial;
      if (material.uniforms && material.uniforms.torchLight) {
        material.uniforms.torchLight.value = totalLight;
      }
    }
  }

  public update(deltaTime: number): void {
    // Update smelting progress for all furnaces with fuel and items
    let anySmeltCompleted = false;

    for (const furnace of this.furnaces) {
      if (furnace.fuelAmount > 0 && furnace.smeltingItem !== null) {
        // Progress the smelting
        const smeltRate = 1 / this.SMELT_TIME;
        furnace.smeltingProgress += deltaTime * smeltRate;

        if (furnace.smeltingProgress >= 1) {
          // Smelting complete - find recipe and produce output
          const recipe = SMELTING_RECIPES.find(r => r.input === furnace.smeltingItem);
          if (recipe) {
            // Add to output (or create new output)
            if (furnace.outputItem === null || furnace.outputItem === recipe.output) {
              furnace.outputItem = recipe.output;
              furnace.outputCount += recipe.outputQuantity;
            }
            // Consume fuel
            furnace.fuelAmount--;
            // Decrease input count
            furnace.inputCount--;
            anySmeltCompleted = true;
          }

          // Check if more items in queue
          if (furnace.inputCount > 0) {
            // Start smelting next item (same type)
            furnace.smeltingProgress = 0;
          } else {
            // No more items - reset
            furnace.smeltingItem = null;
            furnace.smeltingProgress = 0;
          }
        }
      }
    }

    // Notify when smelting completes to trigger save
    if (anySmeltCompleted && this.onSmeltCompleteCallback) {
      this.onSmeltCompleteCallback();
    }
  }

  // Export furnace data for saving
  public exportForSave(): Array<{
    position: { x: number; y: number; z: number };
    tileIndex: number;
    rotation: number;
    fuelAmount: number;
    smeltingItem: number | null;
    smeltingProgress: number;
    inputCount: number;
    outputItem: number | null;
    outputCount: number;
  }> {
    return this.furnaces.map(f => ({
      position: { x: f.position.x, y: f.position.y, z: f.position.z },
      tileIndex: f.tileIndex,
      rotation: f.rotation,
      fuelAmount: f.fuelAmount,
      smeltingItem: f.smeltingItem,
      smeltingProgress: f.smeltingProgress,
      inputCount: f.inputCount,
      outputItem: f.outputItem,
      outputCount: f.outputCount,
    }));
  }
}
