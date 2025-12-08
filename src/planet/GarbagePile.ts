import * as THREE from 'three';
import { getAssetPath } from '../utils/assetPath';
import { PlayerConfig } from '../config/PlayerConfig';
import { ItemType, InventorySlot, ITEM_DATA } from '../player/Inventory';
import techVert from '../shaders/tech/tech.vert';
import techFrag from '../shaders/tech/tech.frag';

// Garbage pile is like a small chest - holds overflow items
export const GARBAGE_PILE_SLOTS = 27;

export interface PlacedGarbagePile {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  tileIndex: number;
  slots: InventorySlot[];
}

export class GarbagePileManager {
  private scene: THREE.Scene;
  private piles: PlacedGarbagePile[] = [];
  private pileMeshes: THREE.Mesh[] = [];
  private textureLoader: THREE.TextureLoader;
  private pileGeometry: THREE.BoxGeometry | null = null;
  private pileMaterial: THREE.ShaderMaterial | null = null;

  private planetCenter: THREE.Vector3;
  private sunDirection: THREE.Vector3;

  // Garbage pile is flat and wide (like a pile of junk)
  private readonly PILE_WIDTH = 0.7;
  private readonly PILE_HEIGHT = 0.3;
  private readonly PILE_DEPTH = 0.7;

  constructor(scene: THREE.Scene, planetCenter?: THREE.Vector3, sunDirection?: THREE.Vector3) {
    this.scene = scene;
    this.textureLoader = new THREE.TextureLoader();
    this.planetCenter = planetCenter?.clone() || new THREE.Vector3(0, 0, 0);
    this.sunDirection = sunDirection?.clone() || new THREE.Vector3(1, 0, 0);
    this.initGeometryAndMaterials();
  }

  public setSunDirection(direction: THREE.Vector3): void {
    this.sunDirection.copy(direction);
    if (this.pileMaterial) {
      this.pileMaterial.uniforms.sunDirection.value.copy(direction);
    }
  }

  public setPlanetCenter(center: THREE.Vector3): void {
    this.planetCenter.copy(center);
    if (this.pileMaterial) {
      this.pileMaterial.uniforms.planetCenter.value.copy(center);
    }
  }

  private async initGeometryAndMaterials(): Promise<void> {
    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader.load(
        getAssetPath('/textures/technology/garbage_pile.png'),
        resolve,
        undefined,
        reject
      );
    });

    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    this.pileGeometry = new THREE.BoxGeometry(
      this.PILE_WIDTH,
      this.PILE_HEIGHT,
      this.PILE_DEPTH
    );

    this.pileMaterial = new THREE.ShaderMaterial({
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

  private createEmptySlots(): InventorySlot[] {
    const slots: InventorySlot[] = [];
    for (let i = 0; i < GARBAGE_PILE_SLOTS; i++) {
      slots.push({ itemType: ItemType.NONE, quantity: 0 });
    }
    return slots;
  }

  public async placePile(
    worldPosition: THREE.Vector3,
    planetCenter: THREE.Vector3,
    tileIndex: number,
    initialItems?: { itemType: ItemType; quantity: number }[]
  ): Promise<PlacedGarbagePile | null> {
    if (!this.pileGeometry || !this.pileMaterial) {
      await this.initGeometryAndMaterials();
    }

    if (!this.pileGeometry || !this.pileMaterial) {
      console.error('Failed to initialize garbage pile geometry/materials');
      return null;
    }

    const instanceMaterial = this.pileMaterial.clone();
    const mesh = new THREE.Mesh(this.pileGeometry, instanceMaterial);

    const upDirection = worldPosition.clone().sub(planetCenter).normalize();
    const pilePosition = worldPosition.clone().add(upDirection.multiplyScalar(this.PILE_HEIGHT / 2));
    mesh.position.copy(pilePosition);

    // Orient to sit flat
    const up = pilePosition.clone().sub(planetCenter).normalize();
    const alignQuaternion = new THREE.Quaternion();
    alignQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    mesh.quaternion.copy(alignQuaternion);

    mesh.userData.isGarbagePile = true;
    mesh.userData.tileIndex = tileIndex;

    this.scene.add(mesh);

    const pile: PlacedGarbagePile = {
      mesh,
      position: pilePosition.clone(),
      tileIndex,
      slots: this.createEmptySlots(),
    };

    // Add initial items if provided
    if (initialItems) {
      for (const item of initialItems) {
        this.addItemsToPile(pile, item.itemType, item.quantity);
      }
    }

    this.piles.push(pile);
    this.pileMeshes.push(mesh);

    return pile;
  }

  public async restorePile(
    savedPosition: THREE.Vector3,
    planetCenter: THREE.Vector3,
    tileIndex: number,
    slots?: InventorySlot[]
  ): Promise<PlacedGarbagePile | null> {
    if (!this.pileGeometry || !this.pileMaterial) {
      await this.initGeometryAndMaterials();
    }

    if (!this.pileGeometry || !this.pileMaterial) {
      console.error('Failed to initialize garbage pile geometry/materials');
      return null;
    }

    const instanceMaterial = this.pileMaterial.clone();
    const mesh = new THREE.Mesh(this.pileGeometry, instanceMaterial);
    mesh.position.copy(savedPosition);

    const up = savedPosition.clone().sub(planetCenter).normalize();
    const alignQuaternion = new THREE.Quaternion();
    alignQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    mesh.quaternion.copy(alignQuaternion);

    mesh.userData.isGarbagePile = true;
    mesh.userData.tileIndex = tileIndex;

    this.scene.add(mesh);

    const pile: PlacedGarbagePile = {
      mesh,
      position: savedPosition.clone(),
      tileIndex,
      slots: slots || this.createEmptySlots(),
    };

    this.piles.push(pile);
    this.pileMeshes.push(mesh);

    return pile;
  }

  // Add items to pile, returns items that didn't fit
  public addItemsToPile(pile: PlacedGarbagePile, itemType: ItemType, quantity: number): number {
    if (itemType === ItemType.NONE) return quantity;

    const itemData = ITEM_DATA[itemType];
    let remaining = quantity;

    // Stack with existing
    for (let i = 0; i < GARBAGE_PILE_SLOTS && remaining > 0; i++) {
      const slot = pile.slots[i];
      if (slot.itemType === itemType && slot.quantity < itemData.stackSize) {
        const canAdd = Math.min(remaining, itemData.stackSize - slot.quantity);
        slot.quantity += canAdd;
        remaining -= canAdd;
      }
    }

    // Fill empty slots
    for (let i = 0; i < GARBAGE_PILE_SLOTS && remaining > 0; i++) {
      const slot = pile.slots[i];
      if (slot.itemType === ItemType.NONE) {
        const canAdd = Math.min(remaining, itemData.stackSize);
        slot.itemType = itemType;
        slot.quantity = canAdd;
        remaining -= canAdd;
      }
    }

    return remaining;
  }

  // Get all items from pile
  public getAllItemsFromPile(pile: PlacedGarbagePile): { itemType: ItemType; quantity: number }[] {
    const items: { itemType: ItemType; quantity: number }[] = [];
    for (const slot of pile.slots) {
      if (slot.itemType !== ItemType.NONE && slot.quantity > 0) {
        items.push({ itemType: slot.itemType, quantity: slot.quantity });
      }
    }
    return items;
  }

  // Check if pile is empty
  public isPileEmpty(pile: PlacedGarbagePile): boolean {
    return pile.slots.every(s => s.itemType === ItemType.NONE || s.quantity === 0);
  }

  public removePile(pile: PlacedGarbagePile): void {
    const index = this.piles.indexOf(pile);
    if (index === -1) return;

    this.scene.remove(pile.mesh);
    pile.mesh.geometry.dispose();
    if (pile.mesh.material instanceof THREE.ShaderMaterial) {
      pile.mesh.material.dispose();
    }

    this.piles.splice(index, 1);
    const meshIndex = this.pileMeshes.indexOf(pile.mesh);
    if (meshIndex !== -1) {
      this.pileMeshes.splice(meshIndex, 1);
    }
  }

  public getPileMeshes(): THREE.Mesh[] {
    return this.pileMeshes;
  }

  public getPlacedPiles(): PlacedGarbagePile[] {
    return this.piles;
  }

  public getPileByMesh(mesh: THREE.Mesh): PlacedGarbagePile | undefined {
    return this.piles.find(p => p.mesh === mesh);
  }

  public getPileAtTile(tileIndex: number): PlacedGarbagePile | undefined {
    return this.piles.find(p => p.tileIndex === tileIndex);
  }

  public updateTorchLighting(torchPositions: THREE.Vector3[], torchRange: number, torchIntensity: number): void {
    for (const pile of this.piles) {
      let totalLight = 0;
      for (const torchPos of torchPositions) {
        const distance = pile.position.distanceTo(torchPos);
        if (distance < torchRange) {
          const decay = 2;
          const attenuation = 1 / (1 + decay * distance * distance / (torchRange * torchRange));
          totalLight += attenuation * torchIntensity;
        }
      }
      totalLight = Math.min(1.5, totalLight);
      const material = pile.mesh.material as THREE.ShaderMaterial;
      if (material.uniforms && material.uniforms.torchLight) {
        material.uniforms.torchLight.value = totalLight;
      }
    }
  }

  public exportForSave(): Array<{
    position: { x: number; y: number; z: number };
    tileIndex: number;
    slots: { itemType: number; quantity: number }[];
  }> {
    return this.piles.map(p => ({
      position: { x: p.position.x, y: p.position.y, z: p.position.z },
      tileIndex: p.tileIndex,
      slots: p.slots.map(s => ({ itemType: s.itemType, quantity: s.quantity })),
    }));
  }
}
