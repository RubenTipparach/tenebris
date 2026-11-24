import { machineLightUniforms, withMachineLight } from './MachineLight';
import * as THREE from 'three';
import { getAssetPath } from '../utils/assetPath';
import { PlayerConfig, SACK } from '../config/PlayerConfig';
import { ItemType, InventorySlot, addToSlots } from '../player/Inventory';
import techVert from '../shaders/tech/tech.vert';
import techFrag from '../shaders/tech/tech.frag';

/**
 * The overflow sack (saved and synced as the `garbagePile` record kind, so
 * old saves keep their piles): what doesn't fit in a full inventory is left
 * on the ground in one, and anyone can walk up and take it.
 */
export const GARBAGE_PILE_SLOTS = SACK.SLOTS;

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
  private pileGeometry: THREE.BufferGeometry;
  private pileMaterial: THREE.ShaderMaterial;

  private planetCenter: THREE.Vector3;
  private sunDirection: THREE.Vector3;

  constructor(scene: THREE.Scene, planetCenter?: THREE.Vector3, sunDirection?: THREE.Vector3) {
    this.scene = scene;
    this.planetCenter = planetCenter?.clone() || new THREE.Vector3(0, 0, 0);
    this.sunDirection = sunDirection?.clone() || new THREE.Vector3(1, 0, 0);
    // Built up front (the texture fills in when it loads) so placing a sack
    // is synchronous: two drops in one frame find the first sack and merge
    const texture = new THREE.TextureLoader().load(getAssetPath('/textures/technology/sack.png'));
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    const profile = SACK.PROFILE.map(([r, h]) => new THREE.Vector2(r, h));
    this.pileGeometry = new THREE.LatheGeometry(profile, SACK.SEGMENTS);
    this.pileGeometry.computeVertexNormals();
    this.pileMaterial = new THREE.ShaderMaterial({
      uniforms: {
        techTexture: { value: texture },
        ...machineLightUniforms(),
        ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
        directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
      },
      vertexShader: techVert,
      fragmentShader: techFrag,
    });
  }

  public setSunDirection(direction: THREE.Vector3): void {
    this.sunDirection.copy(direction);
    this.pileMaterial.uniforms.sunDirection?.value.copy(direction);
  }

  public setPlanetCenter(center: THREE.Vector3): void {
    this.planetCenter.copy(center);
    this.pileMaterial.uniforms.planetCenter?.value.copy(center);
  }

  private createEmptySlots(): InventorySlot[] {
    return Array.from({ length: GARBAGE_PILE_SLOTS }, () => ({ itemType: ItemType.NONE, quantity: 0 }));
  }

  /** A sack standing on the ground at `groundPosition` (its base), upright on its planet. */
  private addMesh(groundPosition: THREE.Vector3, planetCenter: THREE.Vector3, tileIndex: number, slots: InventorySlot[]): PlacedGarbagePile {
    const mesh = new THREE.Mesh(this.pileGeometry, withMachineLight(this.pileMaterial.clone()));
    mesh.position.copy(groundPosition);
    const up = groundPosition.clone().sub(planetCenter).normalize();
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    mesh.userData.isGarbagePile = true;
    mesh.userData.tileIndex = tileIndex;
    this.scene.add(mesh);
    const pile: PlacedGarbagePile = { mesh, position: groundPosition.clone(), tileIndex, slots };
    this.piles.push(pile);
    this.pileMeshes.push(mesh);
    return pile;
  }

  /** Drop a new sack on the ground with these items in it. */
  public placePile(
    groundPosition: THREE.Vector3,
    planetCenter: THREE.Vector3,
    tileIndex: number,
    initialItems?: { itemType: ItemType; quantity: number }[]
  ): PlacedGarbagePile {
    const pile = this.addMesh(groundPosition, planetCenter, tileIndex, this.createEmptySlots());
    for (const item of initialItems ?? []) this.addItemsToPile(pile, item.itemType, item.quantity);
    return pile;
  }

  /** Rebuild a saved sack (its saved position is its base). */
  public restorePile(
    savedPosition: THREE.Vector3,
    planetCenter: THREE.Vector3,
    tileIndex: number,
    slots?: InventorySlot[]
  ): PlacedGarbagePile {
    const all = this.createEmptySlots();
    (slots ?? []).forEach((s, i) => { if (i < all.length) all[i] = s; });
    return this.addMesh(savedPosition, planetCenter, tileIndex, all);
  }

  // Add items to pile, returns items that didn't fit
  public addItemsToPile(pile: PlacedGarbagePile, itemType: ItemType, quantity: number): number {
    return addToSlots(pile.slots, itemType, quantity);
  }

  // Get all items from pile
  public getAllItemsFromPile(pile: PlacedGarbagePile): { itemType: ItemType; quantity: number }[] {
    return pile.slots
      .filter(s => s.itemType !== ItemType.NONE && s.quantity > 0)
      .map(s => ({ itemType: s.itemType, quantity: s.quantity }));
  }

  // Check if pile is empty
  public isPileEmpty(pile: PlacedGarbagePile): boolean {
    return pile.slots.every(s => s.itemType === ItemType.NONE || s.quantity === 0);
  }

  public removePile(pile: PlacedGarbagePile): void {
    const index = this.piles.indexOf(pile);
    if (index === -1) return;
    this.scene.remove(pile.mesh);
    // The geometry is shared by every sack: only the per-sack material goes
    if (pile.mesh.material instanceof THREE.ShaderMaterial) pile.mesh.material.dispose();
    this.piles.splice(index, 1);
    const meshIndex = this.pileMeshes.indexOf(pile.mesh);
    if (meshIndex !== -1) this.pileMeshes.splice(meshIndex, 1);
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
