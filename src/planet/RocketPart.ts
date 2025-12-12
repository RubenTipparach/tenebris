import * as THREE from 'three';
import { ItemType, ITEM_DATA, RocketPartType } from '../player/Inventory';

/**
 * Represents a placed rocket part on a launch pad
 * Manages its own mesh, material, and shader uniforms
 */
export class RocketPart {
  public readonly itemType: ItemType;
  public readonly partType: RocketPartType;
  public readonly mesh: THREE.Group;
  public readonly heightIndex: number;

  private material: THREE.ShaderMaterial;

  constructor(
    itemType: ItemType,
    partType: RocketPartType,
    mesh: THREE.Group,
    material: THREE.ShaderMaterial,
    heightIndex: number
  ) {
    this.itemType = itemType;
    this.partType = partType;
    this.mesh = mesh;
    this.material = material;
    this.heightIndex = heightIndex;
  }

  /**
   * Get the world position of this rocket part
   */
  public getWorldPosition(): THREE.Vector3 {
    const position = new THREE.Vector3();
    this.mesh.getWorldPosition(position);
    return position;
  }

  /**
   * Update the torch lighting for this rocket part
   */
  public setTorchLight(value: number): void {
    if (this.material.uniforms && this.material.uniforms.torchLight) {
      this.material.uniforms.torchLight.value = value;
    }
  }

  /**
   * Update the sun direction uniform
   */
  public setSunDirection(direction: THREE.Vector3): void {
    if (this.material.uniforms && this.material.uniforms.sunDirection) {
      this.material.uniforms.sunDirection.value.copy(direction);
    }
  }

  /**
   * Update the sun brightness uniform (pre-calculated from launch pad position)
   */
  public setSunBrightness(value: number): void {
    if (this.material.uniforms && this.material.uniforms.sunBrightness) {
      this.material.uniforms.sunBrightness.value = value;
    }
  }

  /**
   * Update the planet center uniform
   */
  public setPlanetCenter(center: THREE.Vector3): void {
    if (this.material.uniforms && this.material.uniforms.planetCenter) {
      this.material.uniforms.planetCenter.value.copy(center);
    }
  }

  /**
   * Get the height units for this rocket part
   */
  public getHeightUnits(): number {
    const itemData = ITEM_DATA[this.itemType];
    return itemData.rocketPart?.heightUnits ?? 1;
  }

  /**
   * Check if this part is an engine
   */
  public isEngine(): boolean {
    return this.partType === RocketPartType.ENGINE;
  }

  /**
   * Check if this part is a fuel tank
   */
  public isFuelTank(): boolean {
    return this.partType === RocketPartType.FUEL_TANK;
  }

  /**
   * Check if this part is a command capsule
   */
  public isCapsule(): boolean {
    return this.partType === RocketPartType.CAPSULE;
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    this.material.dispose();
  }
}
