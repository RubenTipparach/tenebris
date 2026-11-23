import { machineLightUniforms, withMachineLight } from './MachineLight';
import { emitGameEvent } from '../engine/GameEvents';
import * as THREE from 'three';
import { getAssetPath } from '../utils/assetPath';
import { PlayerConfig } from '../config/PlayerConfig';
import techVert from '../shaders/tech/tech.vert';
import techFrag from '../shaders/tech/tech.frag';

// Electric smelting recipes: ore -> ingot (requires power, no fuel)
export { ELECTRIC_SMELTING_RECIPES } from '../config/SmeltingRecipes';
export type { ElectricSmeltingRecipe } from '../config/SmeltingRecipes';
import { electricRecipeFor, electricBatchReady } from '../config/SmeltingRecipes';
import { recipeOpen } from '../player/RecipeGate';

export interface PlacedElectricFurnace {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  tileIndex: number;
  rotation: number;
  isPowered: boolean; // Connected to running steam engine via cables
  smeltingItem: number | null;
  smeltingProgress: number;
  inputCount: number;
  // An alloy's second input (coal for steel)
  additiveItem: number | null;
  additiveCount: number;
  outputItem: number | null;
  outputCount: number;
}

export class ElectricFurnaceManager {
  private scene: THREE.Scene;
  private furnaces: PlacedElectricFurnace[] = [];
  private furnaceMeshes: THREE.Mesh[] = [];
  private textureLoader: THREE.TextureLoader;
  private furnaceGeometry: THREE.BoxGeometry | null = null;
  private furnaceMaterial: THREE.ShaderMaterial | null = null;
  private onSmeltCompleteCallback: (() => void) | null = null;

  // Planet lighting uniforms
  private planetCenter: THREE.Vector3;
  private sunDirection: THREE.Vector3;

  // Furnace size
  private readonly FURNACE_SIZE = 0.8;
  private readonly SMELT_TIME = 2; // 5x faster than regular furnace (2 seconds vs 10)

  constructor(scene: THREE.Scene, planetCenter?: THREE.Vector3, sunDirection?: THREE.Vector3) {
    this.scene = scene;
    this.textureLoader = new THREE.TextureLoader();
    this.planetCenter = planetCenter?.clone() || new THREE.Vector3(0, 0, 0);
    this.sunDirection = sunDirection?.clone() || new THREE.Vector3(1, 0, 0);
    this.initGeometryAndMaterials();
  }

  public setSunDirection(direction: THREE.Vector3): void {
    this.sunDirection.copy(direction);
    if (this.furnaceMaterial) {
      this.furnaceMaterial.uniforms.sunDirection.value.copy(direction);
    }
  }

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
    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader.load(
        getAssetPath('/textures/technology/electric_furnace.png'),
        resolve,
        undefined,
        reject
      );
    });

    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    this.furnaceGeometry = new THREE.BoxGeometry(
      this.FURNACE_SIZE,
      this.FURNACE_SIZE,
      this.FURNACE_SIZE
    );

    const faceUVs = this.calculateFaceUVs();
    const uvAttribute = this.furnaceGeometry.attributes.uv;
    const uvArray = uvAttribute.array as Float32Array;

    const applyFaceUV = (faceIndex: number, uv: { u1: number; v1: number; u2: number; v2: number }, flipHorizontal = false, flipVertical = false) => {
      const baseIndex = faceIndex * 8;
      const left = flipHorizontal ? uv.u2 : uv.u1;
      const right = flipHorizontal ? uv.u1 : uv.u2;
      const bottom = flipVertical ? uv.v2 : uv.v1;
      const top = flipVertical ? uv.v1 : uv.v2;

      uvArray[baseIndex + 0] = left;  uvArray[baseIndex + 1] = bottom;
      uvArray[baseIndex + 2] = right; uvArray[baseIndex + 3] = bottom;
      uvArray[baseIndex + 4] = left;  uvArray[baseIndex + 5] = top;
      uvArray[baseIndex + 6] = right; uvArray[baseIndex + 7] = top;
    };

    applyFaceUV(0, faceUVs.right, true, true);  // +X (right side)
    applyFaceUV(1, faceUVs.left, false, true);  // -X (left side)
    applyFaceUV(2, faceUVs.top, false, false);  // +Y (top)
    applyFaceUV(3, faceUVs.bottom, false, false); // -Y (bottom)
    applyFaceUV(4, faceUVs.front, false, true); // +Z (front)
    applyFaceUV(5, faceUVs.back, true, true);   // -Z (back)

    uvAttribute.needsUpdate = true;

    this.furnaceMaterial = new THREE.ShaderMaterial({
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

  private calculateFaceUVs(): {
    front: { u1: number; v1: number; u2: number; v2: number };
    left: { u1: number; v1: number; u2: number; v2: number };
    right: { u1: number; v1: number; u2: number; v2: number };
    back: { u1: number; v1: number; u2: number; v2: number };
    top: { u1: number; v1: number; u2: number; v2: number };
    bottom: { u1: number; v1: number; u2: number; v2: number };
  } {
    // Texture atlas layout (48x32, 3x2 grid of 16x16 cells):
    // Row 1: Front, Left, Right
    // Row 2: Back, Top, Bottom
    const texWidth = 48;
    const texHeight = 32;
    const cellSize = 16;

    const uv = (x: number, y: number, w: number, h: number) => ({
      u1: x / texWidth,
      v1: 1 - (y + h) / texHeight,
      u2: (x + w) / texWidth,
      v2: 1 - y / texHeight,
    });

    return {
      front: uv(0, 0, cellSize, cellSize),              // Row 1, Col 0
      left: uv(cellSize, 0, cellSize, cellSize),        // Row 1, Col 1
      right: uv(cellSize * 2, 0, cellSize, cellSize),   // Row 1, Col 2
      back: uv(0, cellSize, cellSize, cellSize),        // Row 2, Col 0
      top: uv(cellSize, cellSize, cellSize, cellSize),  // Row 2, Col 1
      bottom: uv(cellSize * 2, cellSize, cellSize, cellSize), // Row 2, Col 2
    };
  }

  public async placeElectricFurnace(
    worldPosition: THREE.Vector3,
    planetCenter: THREE.Vector3,
    tileIndex: number,
    playerForward?: THREE.Vector3
  ): Promise<PlacedElectricFurnace | null> {
    if (!this.furnaceGeometry || !this.furnaceMaterial) {
      await this.initGeometryAndMaterials();
    }

    if (!this.furnaceGeometry || !this.furnaceMaterial) {
      console.error('Failed to initialize electric furnace geometry/materials');
      return null;
    }

    const instanceMaterial = withMachineLight(this.furnaceMaterial.clone());
    const mesh = new THREE.Mesh(this.furnaceGeometry, instanceMaterial);

    const upDirection = worldPosition.clone().sub(planetCenter).normalize();
    const furnacePosition = worldPosition.clone().add(upDirection.multiplyScalar(this.FURNACE_SIZE / 2));
    mesh.position.copy(furnacePosition);

    const up = furnacePosition.clone().sub(planetCenter).normalize();

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

    mesh.userData.isElectricFurnace = true;
    mesh.userData.tileIndex = tileIndex;

    this.scene.add(mesh);

    const furnace: PlacedElectricFurnace = {
      mesh,
      position: furnacePosition.clone(),
      tileIndex,
      rotation: facingAngle,
      isPowered: false,
      smeltingItem: null,
      smeltingProgress: 0,
      inputCount: 0,
      additiveItem: null,
      additiveCount: 0,
      outputItem: null,
      outputCount: 0,
    };

    this.furnaces.push(furnace);
    this.furnaceMeshes.push(mesh);

    return furnace;
  }

  public async restoreElectricFurnace(
    savedPosition: THREE.Vector3,
    planetCenter: THREE.Vector3,
    tileIndex: number,
    rotation: number
  ): Promise<PlacedElectricFurnace | null> {
    if (!this.furnaceGeometry || !this.furnaceMaterial) {
      await this.initGeometryAndMaterials();
    }

    if (!this.furnaceGeometry || !this.furnaceMaterial) {
      console.error('Failed to initialize electric furnace geometry/materials');
      return null;
    }

    const instanceMaterial = withMachineLight(this.furnaceMaterial.clone());
    const mesh = new THREE.Mesh(this.furnaceGeometry, instanceMaterial);

    mesh.position.copy(savedPosition);

    const up = savedPosition.clone().sub(planetCenter).normalize();
    const alignQuaternion = new THREE.Quaternion();
    alignQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);

    const rotateY = new THREE.Quaternion();
    rotateY.setFromAxisAngle(up, rotation);

    mesh.quaternion.copy(rotateY).multiply(alignQuaternion);

    mesh.userData.isElectricFurnace = true;
    mesh.userData.tileIndex = tileIndex;

    this.scene.add(mesh);

    const furnace: PlacedElectricFurnace = {
      mesh,
      position: savedPosition.clone(),
      tileIndex,
      rotation,
      isPowered: false,
      smeltingItem: null,
      smeltingProgress: 0,
      inputCount: 0,
      additiveItem: null,
      additiveCount: 0,
      outputItem: null,
      outputCount: 0,
    };

    this.furnaces.push(furnace);
    this.furnaceMeshes.push(mesh);

    return furnace;
  }

  public removeElectricFurnace(furnace: PlacedElectricFurnace): void {
    const index = this.furnaces.indexOf(furnace);
    if (index === -1) return;

    this.scene.remove(furnace.mesh);
    furnace.mesh.geometry.dispose();
    if (furnace.mesh.material instanceof THREE.ShaderMaterial) {
      furnace.mesh.material.dispose();
    }

    this.furnaces.splice(index, 1);
    const meshIndex = this.furnaceMeshes.indexOf(furnace.mesh);
    if (meshIndex !== -1) {
      this.furnaceMeshes.splice(meshIndex, 1);
    }
  }

  public getElectricFurnaceMeshes(): THREE.Mesh[] {
    return this.furnaceMeshes;
  }

  public getPlacedElectricFurnaces(): PlacedElectricFurnace[] {
    return this.furnaces;
  }

  public getElectricFurnaceByMesh(mesh: THREE.Mesh): PlacedElectricFurnace | undefined {
    return this.furnaces.find(f => f.mesh === mesh);
  }

  public getElectricFurnaceAtTile(tileIndex: number): PlacedElectricFurnace | undefined {
    return this.furnaces.find(f => f.tileIndex === tileIndex);
  }

  public setFurnacePowered(tileIndex: number, isPowered: boolean): void {
    const furnace = this.getElectricFurnaceAtTile(tileIndex);
    if (furnace) {
      furnace.isPowered = isPowered;
    }
  }

  public update(deltaTime: number): void {
    let anySmeltCompleted = false;

    for (const furnace of this.furnaces) {
      // Only smelt if powered (connected to running steam engine), and only
      // while the load covers a whole batch (an alloy waits for its additive)
      const recipe = electricRecipeFor(furnace.smeltingItem, furnace.additiveItem);
      if (!furnace.isPowered || !recipe || !electricBatchReady(recipe, furnace.inputCount, furnace.additiveCount)) continue;
      if (!recipeOpen(recipe.output)) continue;  // locked by a mission (src/player/RecipeGate)
      if (furnace.outputItem !== null && furnace.outputItem !== recipe.output) continue;

      furnace.smeltingProgress += deltaTime / this.SMELT_TIME;
      if (furnace.smeltingProgress < 1) continue;

      furnace.outputItem = recipe.output;
      furnace.outputCount += recipe.outputQuantity;
      emitGameEvent('smelted', recipe.output, recipe.outputQuantity);
      furnace.inputCount -= recipe.inputQuantity ?? 1;
      if (recipe.with) furnace.additiveCount -= recipe.with.quantity;
      if (furnace.inputCount <= 0) { furnace.inputCount = 0; furnace.smeltingItem = null; }
      if (furnace.additiveCount <= 0) { furnace.additiveCount = 0; furnace.additiveItem = null; }
      furnace.smeltingProgress = 0;
      anySmeltCompleted = true;
    }

    if (anySmeltCompleted && this.onSmeltCompleteCallback) {
      this.onSmeltCompleteCallback();
    }
  }

  public exportForSave(): Array<{
    position: { x: number; y: number; z: number };
    tileIndex: number;
    rotation: number;
    smeltingItem: number | null;
    smeltingProgress: number;
    inputCount: number;
    additiveItem: number | null;
    additiveCount: number;
    outputItem: number | null;
    outputCount: number;
  }> {
    return this.furnaces.map(f => ({
      position: { x: f.position.x, y: f.position.y, z: f.position.z },
      tileIndex: f.tileIndex,
      rotation: f.rotation,
      smeltingItem: f.smeltingItem,
      smeltingProgress: f.smeltingProgress,
      inputCount: f.inputCount,
      additiveItem: f.additiveItem,
      additiveCount: f.additiveCount,
      outputItem: f.outputItem,
      outputCount: f.outputCount,
    }));
  }
}
