import * as THREE from 'three';
import { getAssetPath } from '../utils/assetPath';
import { PlayerConfig } from '../config/PlayerConfig';
import techVert from '../shaders/tech/tech.vert';
import techFrag from '../shaders/tech/tech.frag';

export interface PlacedElectronicsWorkbench {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  tileIndex: number;
  rotation: number;
}

export class ElectronicsWorkbenchManager {
  private scene: THREE.Scene;
  private workbenches: PlacedElectronicsWorkbench[] = [];
  private workbenchMeshes: THREE.Mesh[] = [];
  private textureLoader: THREE.TextureLoader;
  private workbenchGeometry: THREE.BoxGeometry | null = null;
  private workbenchMaterial: THREE.ShaderMaterial | null = null;

  // Planet lighting uniforms
  private planetCenter: THREE.Vector3;
  private sunDirection: THREE.Vector3;

  // Workbench size
  private readonly WORKBENCH_SIZE = 0.8;

  constructor(scene: THREE.Scene, planetCenter?: THREE.Vector3, sunDirection?: THREE.Vector3) {
    this.scene = scene;
    this.textureLoader = new THREE.TextureLoader();
    this.planetCenter = planetCenter?.clone() || new THREE.Vector3(0, 0, 0);
    this.sunDirection = sunDirection?.clone() || new THREE.Vector3(1, 0, 0);
    this.initGeometryAndMaterials();
  }

  public setSunDirection(direction: THREE.Vector3): void {
    this.sunDirection.copy(direction);
    if (this.workbenchMaterial) {
      this.workbenchMaterial.uniforms.sunDirection.value.copy(direction);
    }
  }

  public setPlanetCenter(center: THREE.Vector3): void {
    this.planetCenter.copy(center);
    if (this.workbenchMaterial) {
      this.workbenchMaterial.uniforms.planetCenter.value.copy(center);
    }
  }

  private async initGeometryAndMaterials(): Promise<void> {
    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader.load(
        getAssetPath('/textures/technology/electronics_workbench.png'),
        resolve,
        undefined,
        reject
      );
    });

    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    this.workbenchGeometry = new THREE.BoxGeometry(
      this.WORKBENCH_SIZE,
      this.WORKBENCH_SIZE,
      this.WORKBENCH_SIZE
    );

    const faceUVs = this.calculateFaceUVs();
    const uvAttribute = this.workbenchGeometry.attributes.uv;
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

    this.workbenchMaterial = new THREE.ShaderMaterial({
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

  public async placeElectronicsWorkbench(
    worldPosition: THREE.Vector3,
    planetCenter: THREE.Vector3,
    tileIndex: number,
    playerForward?: THREE.Vector3
  ): Promise<PlacedElectronicsWorkbench | null> {
    if (!this.workbenchGeometry || !this.workbenchMaterial) {
      await this.initGeometryAndMaterials();
    }

    if (!this.workbenchGeometry || !this.workbenchMaterial) {
      console.error('Failed to initialize electronics workbench geometry/materials');
      return null;
    }

    const instanceMaterial = this.workbenchMaterial.clone();
    const mesh = new THREE.Mesh(this.workbenchGeometry, instanceMaterial);

    const upDirection = worldPosition.clone().sub(planetCenter).normalize();
    const workbenchPosition = worldPosition.clone().add(upDirection.multiplyScalar(this.WORKBENCH_SIZE / 2));
    mesh.position.copy(workbenchPosition);

    const up = workbenchPosition.clone().sub(planetCenter).normalize();

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

    mesh.userData.isElectronicsWorkbench = true;
    mesh.userData.tileIndex = tileIndex;

    this.scene.add(mesh);

    const workbench: PlacedElectronicsWorkbench = {
      mesh,
      position: workbenchPosition.clone(),
      tileIndex,
      rotation: facingAngle,
    };

    this.workbenches.push(workbench);
    this.workbenchMeshes.push(mesh);

    return workbench;
  }

  public async restoreElectronicsWorkbench(
    savedPosition: THREE.Vector3,
    planetCenter: THREE.Vector3,
    tileIndex: number,
    rotation: number
  ): Promise<PlacedElectronicsWorkbench | null> {
    if (!this.workbenchGeometry || !this.workbenchMaterial) {
      await this.initGeometryAndMaterials();
    }

    if (!this.workbenchGeometry || !this.workbenchMaterial) {
      console.error('Failed to initialize electronics workbench geometry/materials');
      return null;
    }

    const instanceMaterial = this.workbenchMaterial.clone();
    const mesh = new THREE.Mesh(this.workbenchGeometry, instanceMaterial);

    mesh.position.copy(savedPosition);

    const up = savedPosition.clone().sub(planetCenter).normalize();
    const alignQuaternion = new THREE.Quaternion();
    alignQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);

    const rotateY = new THREE.Quaternion();
    rotateY.setFromAxisAngle(up, rotation);

    mesh.quaternion.copy(rotateY).multiply(alignQuaternion);

    mesh.userData.isElectronicsWorkbench = true;
    mesh.userData.tileIndex = tileIndex;

    this.scene.add(mesh);

    const workbench: PlacedElectronicsWorkbench = {
      mesh,
      position: savedPosition.clone(),
      tileIndex,
      rotation,
    };

    this.workbenches.push(workbench);
    this.workbenchMeshes.push(mesh);

    return workbench;
  }

  public removeElectronicsWorkbench(workbench: PlacedElectronicsWorkbench): void {
    const index = this.workbenches.indexOf(workbench);
    if (index === -1) return;

    this.scene.remove(workbench.mesh);
    workbench.mesh.geometry.dispose();
    if (workbench.mesh.material instanceof THREE.ShaderMaterial) {
      workbench.mesh.material.dispose();
    }

    this.workbenches.splice(index, 1);
    const meshIndex = this.workbenchMeshes.indexOf(workbench.mesh);
    if (meshIndex !== -1) {
      this.workbenchMeshes.splice(meshIndex, 1);
    }
  }

  public getElectronicsWorkbenchMeshes(): THREE.Mesh[] {
    return this.workbenchMeshes;
  }

  public getPlacedElectronicsWorkbenches(): PlacedElectronicsWorkbench[] {
    return this.workbenches;
  }

  public getElectronicsWorkbenchByMesh(mesh: THREE.Mesh): PlacedElectronicsWorkbench | undefined {
    return this.workbenches.find(w => w.mesh === mesh);
  }

  public getElectronicsWorkbenchAtTile(tileIndex: number): PlacedElectronicsWorkbench | undefined {
    return this.workbenches.find(w => w.tileIndex === tileIndex);
  }

  public updateTorchLighting(torchPositions: THREE.Vector3[], torchRange: number, torchIntensity: number): void {
    for (const workbench of this.workbenches) {
      let totalLight = 0;

      for (const torchPos of torchPositions) {
        const distance = workbench.position.distanceTo(torchPos);
        if (distance < torchRange) {
          const decay = 2;
          const attenuation = 1 / (1 + decay * distance * distance / (torchRange * torchRange));
          totalLight += attenuation * torchIntensity;
        }
      }

      totalLight = Math.min(1.5, totalLight);
      const material = workbench.mesh.material as THREE.ShaderMaterial;
      if (material.uniforms && material.uniforms.torchLight) {
        material.uniforms.torchLight.value = totalLight;
      }
    }
  }

  public exportForSave(): Array<{
    position: { x: number; y: number; z: number };
    tileIndex: number;
    rotation: number;
  }> {
    return this.workbenches.map(w => ({
      position: { x: w.position.x, y: w.position.y, z: w.position.z },
      tileIndex: w.tileIndex,
      rotation: w.rotation,
    }));
  }
}
