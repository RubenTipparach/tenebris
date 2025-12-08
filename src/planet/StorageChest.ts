import * as THREE from 'three';
import { getAssetPath } from '../utils/assetPath';
import { PlayerConfig } from '../config/PlayerConfig';
import { ItemType, InventorySlot, ITEM_DATA } from '../player/Inventory';
import techVert from '../shaders/tech/tech.vert';
import techFrag from '../shaders/tech/tech.frag';

// Storage chest has 27 slots (same as player inventory storage area)
export const CHEST_SLOTS = 27;

export interface PlacedStorageChest {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  tileIndex: number;
  rotation: number;
  slots: InventorySlot[];  // 27 storage slots
}

export class StorageChestManager {
  private scene: THREE.Scene;
  private chests: PlacedStorageChest[] = [];
  private chestMeshes: THREE.Mesh[] = [];
  private textureLoader: THREE.TextureLoader;
  private chestGeometry: THREE.BoxGeometry | null = null;
  private chestMaterial: THREE.ShaderMaterial | null = null;

  // Planet lighting uniforms
  private planetCenter: THREE.Vector3;
  private sunDirection: THREE.Vector3;

  // Chest is a cube (same dimensions as furnace)
  private readonly CHEST_SIZE = 0.8;

  constructor(scene: THREE.Scene, planetCenter?: THREE.Vector3, sunDirection?: THREE.Vector3) {
    this.scene = scene;
    this.textureLoader = new THREE.TextureLoader();
    this.planetCenter = planetCenter?.clone() || new THREE.Vector3(0, 0, 0);
    this.sunDirection = sunDirection?.clone() || new THREE.Vector3(1, 0, 0);
    this.initGeometryAndMaterials();
  }

  public setSunDirection(direction: THREE.Vector3): void {
    this.sunDirection.copy(direction);
    if (this.chestMaterial) {
      this.chestMaterial.uniforms.sunDirection.value.copy(direction);
    }
  }

  public setPlanetCenter(center: THREE.Vector3): void {
    this.planetCenter.copy(center);
    if (this.chestMaterial) {
      this.chestMaterial.uniforms.planetCenter.value.copy(center);
    }
  }

  private async initGeometryAndMaterials(): Promise<void> {
    // Load the chest texture atlas (48x32 like furnace)
    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader.load(
        getAssetPath('/textures/technology/storage_chest.png'),
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

    // Create geometry for chest (cube shape)
    this.chestGeometry = new THREE.BoxGeometry(
      this.CHEST_SIZE,
      this.CHEST_SIZE,
      this.CHEST_SIZE
    );

    // Calculate UV coordinates for each face from the texture atlas
    const faceUVs = this.calculateFaceUVs();

    // Apply UVs to geometry
    const uvAttribute = this.chestGeometry.attributes.uv;
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
    this.chestMaterial = new THREE.ShaderMaterial({
      uniforms: {
        techTexture: { value: texture },
        sunDirection: { value: this.sunDirection.clone() },
        planetCenter: { value: this.planetCenter.clone() },
        ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
        directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
        torchLight: { value: 0.0 },
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

  private createEmptySlots(): InventorySlot[] {
    const slots: InventorySlot[] = [];
    for (let i = 0; i < CHEST_SLOTS; i++) {
      slots.push({ itemType: ItemType.NONE, quantity: 0 });
    }
    return slots;
  }

  public async placeChest(
    worldPosition: THREE.Vector3,
    planetCenter: THREE.Vector3,
    tileIndex: number,
    playerForward?: THREE.Vector3
  ): Promise<PlacedStorageChest | null> {
    if (!this.chestGeometry || !this.chestMaterial) {
      await this.initGeometryAndMaterials();
    }

    if (!this.chestGeometry || !this.chestMaterial) {
      console.error('Failed to initialize chest geometry/materials');
      return null;
    }

    const instanceMaterial = this.chestMaterial.clone();
    const mesh = new THREE.Mesh(this.chestGeometry, instanceMaterial);

    // Position above ground
    const upDirection = worldPosition.clone().sub(planetCenter).normalize();
    const chestPosition = worldPosition.clone().add(upDirection.multiplyScalar(this.CHEST_SIZE / 2));
    mesh.position.copy(chestPosition);

    // Orient to sit flat on surface
    const up = chestPosition.clone().sub(planetCenter).normalize();
    let tangent = new THREE.Vector3(1, 0, 0);
    if (Math.abs(up.dot(tangent)) > 0.9) {
      tangent = new THREE.Vector3(0, 0, 1);
    }
    const bitangent = new THREE.Vector3().crossVectors(up, tangent).normalize();
    tangent.crossVectors(bitangent, up).normalize();

    let facingAngle = 0;
    if (playerForward) {
      const projectedForward = playerForward.clone();
      projectedForward.sub(up.clone().multiplyScalar(projectedForward.dot(up)));
      projectedForward.normalize();
      const towardPlayer = projectedForward.clone().negate();
      const angleFromTangent = Math.atan2(towardPlayer.dot(bitangent), towardPlayer.dot(tangent));

      if (PlayerConfig.TECH_BLOCK_HEX_SNAP) {
        const snapAngle = Math.PI / 3;
        facingAngle = Math.round(angleFromTangent / snapAngle) * snapAngle;
      } else {
        facingAngle = angleFromTangent;
      }
    }

    const offsetAngle = PlayerConfig.TECH_BLOCK_ROTATION_OFFSET * (Math.PI / 180);
    facingAngle += offsetAngle;

    const alignQuaternion = new THREE.Quaternion();
    alignQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    const rotateY = new THREE.Quaternion();
    rotateY.setFromAxisAngle(up, facingAngle);
    mesh.quaternion.copy(rotateY).multiply(alignQuaternion);

    mesh.userData.isStorageChest = true;
    mesh.userData.tileIndex = tileIndex;

    this.scene.add(mesh);

    const chest: PlacedStorageChest = {
      mesh,
      position: chestPosition.clone(),
      tileIndex,
      rotation: facingAngle,
      slots: this.createEmptySlots(),
    };

    this.chests.push(chest);
    this.chestMeshes.push(mesh);

    return chest;
  }

  public async restoreChest(
    savedPosition: THREE.Vector3,
    planetCenter: THREE.Vector3,
    tileIndex: number,
    rotation: number,
    slots?: InventorySlot[]
  ): Promise<PlacedStorageChest | null> {
    if (!this.chestGeometry || !this.chestMaterial) {
      await this.initGeometryAndMaterials();
    }

    if (!this.chestGeometry || !this.chestMaterial) {
      console.error('Failed to initialize chest geometry/materials');
      return null;
    }

    const instanceMaterial = this.chestMaterial.clone();
    const mesh = new THREE.Mesh(this.chestGeometry, instanceMaterial);
    mesh.position.copy(savedPosition);

    const up = savedPosition.clone().sub(planetCenter).normalize();
    const alignQuaternion = new THREE.Quaternion();
    alignQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    const rotateY = new THREE.Quaternion();
    rotateY.setFromAxisAngle(up, rotation);
    mesh.quaternion.copy(rotateY).multiply(alignQuaternion);

    mesh.userData.isStorageChest = true;
    mesh.userData.tileIndex = tileIndex;

    this.scene.add(mesh);

    const chest: PlacedStorageChest = {
      mesh,
      position: savedPosition.clone(),
      tileIndex,
      rotation,
      slots: slots || this.createEmptySlots(),
    };

    this.chests.push(chest);
    this.chestMeshes.push(mesh);

    return chest;
  }

  // Add items to chest, returns items that didn't fit
  public addItemsToChest(chest: PlacedStorageChest, itemType: ItemType, quantity: number): number {
    if (itemType === ItemType.NONE) return quantity;

    const itemData = ITEM_DATA[itemType];
    let remaining = quantity;

    // First stack with existing
    for (let i = 0; i < CHEST_SLOTS && remaining > 0; i++) {
      const slot = chest.slots[i];
      if (slot.itemType === itemType && slot.quantity < itemData.stackSize) {
        const canAdd = Math.min(remaining, itemData.stackSize - slot.quantity);
        slot.quantity += canAdd;
        remaining -= canAdd;
      }
    }

    // Then fill empty slots
    for (let i = 0; i < CHEST_SLOTS && remaining > 0; i++) {
      const slot = chest.slots[i];
      if (slot.itemType === ItemType.NONE) {
        const canAdd = Math.min(remaining, itemData.stackSize);
        slot.itemType = itemType;
        slot.quantity = canAdd;
        remaining -= canAdd;
      }
    }

    return remaining;
  }

  // Get all items from chest (for breaking)
  public getAllItemsFromChest(chest: PlacedStorageChest): { itemType: ItemType; quantity: number }[] {
    const items: { itemType: ItemType; quantity: number }[] = [];
    for (const slot of chest.slots) {
      if (slot.itemType !== ItemType.NONE && slot.quantity > 0) {
        items.push({ itemType: slot.itemType, quantity: slot.quantity });
      }
    }
    return items;
  }

  public removeChest(chest: PlacedStorageChest): void {
    const index = this.chests.indexOf(chest);
    if (index === -1) return;

    this.scene.remove(chest.mesh);
    chest.mesh.geometry.dispose();
    if (chest.mesh.material instanceof THREE.ShaderMaterial) {
      chest.mesh.material.dispose();
    }

    this.chests.splice(index, 1);
    const meshIndex = this.chestMeshes.indexOf(chest.mesh);
    if (meshIndex !== -1) {
      this.chestMeshes.splice(meshIndex, 1);
    }
  }

  public getChestMeshes(): THREE.Mesh[] {
    return this.chestMeshes;
  }

  public getPlacedChests(): PlacedStorageChest[] {
    return this.chests;
  }

  public getChestByMesh(mesh: THREE.Mesh): PlacedStorageChest | undefined {
    return this.chests.find(c => c.mesh === mesh);
  }

  public getChestAtTile(tileIndex: number): PlacedStorageChest | undefined {
    return this.chests.find(c => c.tileIndex === tileIndex);
  }

  public updateTorchLighting(torchPositions: THREE.Vector3[], torchRange: number, torchIntensity: number): void {
    for (const chest of this.chests) {
      let totalLight = 0;
      for (const torchPos of torchPositions) {
        const distance = chest.position.distanceTo(torchPos);
        if (distance < torchRange) {
          const decay = 2;
          const attenuation = 1 / (1 + decay * distance * distance / (torchRange * torchRange));
          totalLight += attenuation * torchIntensity;
        }
      }
      totalLight = Math.min(1.5, totalLight);
      const material = chest.mesh.material as THREE.ShaderMaterial;
      if (material.uniforms && material.uniforms.torchLight) {
        material.uniforms.torchLight.value = totalLight;
      }
    }
  }

  public exportForSave(): Array<{
    position: { x: number; y: number; z: number };
    tileIndex: number;
    rotation: number;
    slots: { itemType: number; quantity: number }[];
  }> {
    return this.chests.map(c => ({
      position: { x: c.position.x, y: c.position.y, z: c.position.z },
      tileIndex: c.tileIndex,
      rotation: c.rotation,
      slots: c.slots.map(s => ({ itemType: s.itemType, quantity: s.quantity })),
    }));
  }
}
