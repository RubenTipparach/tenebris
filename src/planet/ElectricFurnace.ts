import * as THREE from 'three';
import { getAssetPath } from '../utils/assetPath';
import { PlayerConfig } from '../config/PlayerConfig';
import { ItemType } from '../player/Inventory';
import techVert from '../shaders/tech/tech.vert';
import techFrag from '../shaders/tech/tech.frag';

// Electric smelting recipes: ore -> ingot (requires power, no fuel)
export interface ElectricSmeltingRecipe {
  input: ItemType;
  output: ItemType;
  outputQuantity: number;
}

export const ELECTRIC_SMELTING_RECIPES: ElectricSmeltingRecipe[] = [
  // Advanced ores that require electric furnace
  { input: ItemType.ORE_LITHIUM, output: ItemType.INGOT_LITHIUM, outputQuantity: 1 },
  { input: ItemType.ORE_COBALT, output: ItemType.INGOT_COBALT, outputQuantity: 1 },
  // Can also smelt all other ores (5x faster than regular furnace, no fuel needed)
  { input: ItemType.ORE_COPPER, output: ItemType.INGOT_COPPER, outputQuantity: 1 },
  { input: ItemType.ORE_IRON, output: ItemType.INGOT_IRON, outputQuantity: 1 },
  { input: ItemType.ORE_GOLD, output: ItemType.INGOT_GOLD, outputQuantity: 1 },
  { input: ItemType.ORE_ALUMINUM, output: ItemType.INGOT_ALUMINUM, outputQuantity: 1 },
];

export interface PlacedElectricFurnace {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  tileIndex: number;
  rotation: number;
  isPowered: boolean; // Connected to running steam engine via cables
  smeltingItem: number | null;
  smeltingProgress: number;
  inputCount: number;
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

    applyFaceUV(0, faceUVs.side, true, true);   // +X
    applyFaceUV(1, faceUVs.side, false, true);  // -X
    applyFaceUV(2, faceUVs.top, false, false);  // +Y
    applyFaceUV(3, faceUVs.bottom, false, false); // -Y
    applyFaceUV(4, faceUVs.front, false, true); // +Z
    applyFaceUV(5, faceUVs.side, true, true);   // -Z

    uvAttribute.needsUpdate = true;

    this.furnaceMaterial = new THREE.ShaderMaterial({
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
    // Same texture layout as regular furnace (48x32)
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
      front: uv(0, 0, cellSize, cellSize),
      side: uv(cellSize, 0, cellSize, cellSize),
      top: uv(cellSize, cellSize, cellSize, cellSize),
      bottom: uv(cellSize * 2, cellSize, cellSize, cellSize),
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

    const instanceMaterial = this.furnaceMaterial.clone();
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

    const instanceMaterial = this.furnaceMaterial.clone();
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

  public updateTorchLighting(torchPositions: THREE.Vector3[], torchRange: number, torchIntensity: number): void {
    for (const furnace of this.furnaces) {
      let totalLight = 0;

      for (const torchPos of torchPositions) {
        const distance = furnace.position.distanceTo(torchPos);
        if (distance < torchRange) {
          const decay = 2;
          const attenuation = 1 / (1 + decay * distance * distance / (torchRange * torchRange));
          totalLight += attenuation * torchIntensity;
        }
      }

      totalLight = Math.min(1.5, totalLight);
      const material = furnace.mesh.material as THREE.ShaderMaterial;
      if (material.uniforms && material.uniforms.torchLight) {
        material.uniforms.torchLight.value = totalLight;
      }
    }
  }

  public update(deltaTime: number): void {
    let anySmeltCompleted = false;

    for (const furnace of this.furnaces) {
      // Only smelt if powered (connected to running steam engine)
      if (furnace.isPowered && furnace.smeltingItem !== null) {
        const smeltRate = 1 / this.SMELT_TIME;
        furnace.smeltingProgress += deltaTime * smeltRate;

        if (furnace.smeltingProgress >= 1) {
          const recipe = ELECTRIC_SMELTING_RECIPES.find(r => r.input === furnace.smeltingItem);
          if (recipe) {
            if (furnace.outputItem === null || furnace.outputItem === recipe.output) {
              furnace.outputItem = recipe.output;
              furnace.outputCount += recipe.outputQuantity;
            }
            furnace.inputCount--;
            anySmeltCompleted = true;
          }

          if (furnace.inputCount > 0) {
            furnace.smeltingProgress = 0;
          } else {
            furnace.smeltingItem = null;
            furnace.smeltingProgress = 0;
          }
        }
      }
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
      outputItem: f.outputItem,
      outputCount: f.outputCount,
    }));
  }
}
