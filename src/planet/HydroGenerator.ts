import * as THREE from 'three';
import { getAssetPath } from '../utils/assetPath';
import { PlayerConfig } from '../config/PlayerConfig';
import techVert from '../shaders/tech/tech.vert';
import techFrag from '../shaders/tech/tech.frag';

export interface PlacedHydroGenerator {
  mesh: THREE.Mesh;
  strutMesh: THREE.Mesh | null;
  position: THREE.Vector3;
  tileIndex: number;
  rotation: number;
  waterDepth: number; // Depth of water column below
  isActive: boolean; // True if sitting on water
  waterPumpedIn: number; // Units of water being pumped
  waterPumpedOut: number; // Units of water output
}

export class HydroGeneratorManager {
  private scene: THREE.Scene;
  private hydroGenerators: PlacedHydroGenerator[] = [];
  private hydroGeneratorMeshes: THREE.Mesh[] = [];
  private textureLoader: THREE.TextureLoader;
  private hydroGeneratorGeometry: THREE.BoxGeometry | null = null;
  private hydroGeneratorMaterial: THREE.ShaderMaterial | null = null;
  private strutMaterial: THREE.MeshBasicMaterial | null = null;

  // Planet lighting uniforms
  private planetCenter: THREE.Vector3;
  private sunDirection: THREE.Vector3;

  // Hydro generator is a cube (same dimensions as furnace/chest/steam engine)
  private readonly HYDRO_GENERATOR_SIZE = 0.8;
  private readonly STRUT_WIDTH = 0.05;
  private readonly STRUT_COLOR = 0x666666; // Grey color for struts

  constructor(scene: THREE.Scene, planetCenter?: THREE.Vector3, sunDirection?: THREE.Vector3) {
    this.scene = scene;
    this.textureLoader = new THREE.TextureLoader();
    this.planetCenter = planetCenter?.clone() || new THREE.Vector3(0, 0, 0);
    this.sunDirection = sunDirection?.clone() || new THREE.Vector3(1, 0, 0);
    this.initGeometryAndMaterials();
  }

  public setSunDirection(direction: THREE.Vector3): void {
    this.sunDirection.copy(direction);
    if (this.hydroGeneratorMaterial) {
      this.hydroGeneratorMaterial.uniforms.sunDirection.value.copy(direction);
    }
  }

  public setPlanetCenter(center: THREE.Vector3): void {
    this.planetCenter.copy(center);
    if (this.hydroGeneratorMaterial) {
      this.hydroGeneratorMaterial.uniforms.planetCenter.value.copy(center);
    }
  }

  private async initGeometryAndMaterials(): Promise<void> {
    // Load the hydro generator texture atlas (48x32 like other tech blocks)
    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader.load(
        getAssetPath('/textures/technology/hydro_generator.png'),
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

    // Create geometry for hydro generator (cube shape)
    this.hydroGeneratorGeometry = new THREE.BoxGeometry(
      this.HYDRO_GENERATOR_SIZE,
      this.HYDRO_GENERATOR_SIZE,
      this.HYDRO_GENERATOR_SIZE
    );

    // Calculate UV coordinates for each face from the texture atlas
    const faceUVs = this.calculateFaceUVs();

    // Apply UVs to geometry
    const uvAttribute = this.hydroGeneratorGeometry.attributes.uv;
    const uvArray = uvAttribute.array as Float32Array;

    // Box faces order in THREE.js: +X, -X, +Y, -Y, +Z, -Z
    // We map: +Z=Front, -Z=Back, +X=Right(Side), -X=Left(Side), +Y=Top, -Y=Bottom
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

    // Apply UVs to each face (matching steam engine pattern)
    applyFaceUV(0, faceUVs.sideRight, true, true);  // +X (right side)
    applyFaceUV(1, faceUVs.sideLeft, false, true);  // -X (left side)
    applyFaceUV(2, faceUVs.top, false, false);      // +Y (top)
    applyFaceUV(3, faceUVs.bottom, false, false);   // -Y (bottom)
    applyFaceUV(4, faceUVs.front, false, true);     // +Z (front)
    applyFaceUV(5, faceUVs.back, true, true);       // -Z (back)

    uvAttribute.needsUpdate = true;

    // Create material with custom shader for planet-aware lighting
    this.hydroGeneratorMaterial = new THREE.ShaderMaterial({
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

    // Create simple material for struts
    this.strutMaterial = new THREE.MeshBasicMaterial({
      color: this.STRUT_COLOR,
    });
  }

  private calculateFaceUVs(): {
    front: { u1: number; v1: number; u2: number; v2: number };
    sideLeft: { u1: number; v1: number; u2: number; v2: number };
    sideRight: { u1: number; v1: number; u2: number; v2: number };
    top: { u1: number; v1: number; u2: number; v2: number };
    bottom: { u1: number; v1: number; u2: number; v2: number };
    back: { u1: number; v1: number; u2: number; v2: number };
  } {
    // Texture layout (48x32):
    // Row 1 (y=0-16):  1-Front    | 2-Side Left | 3-Side Right
    // Row 2 (y=16-32): 4-Back     | 5-Top       | 6-Bottom

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
      sideLeft: uv(cellSize, 0, cellSize, cellSize),
      sideRight: uv(cellSize * 2, 0, cellSize, cellSize),
      back: uv(0, cellSize, cellSize, cellSize),
      top: uv(cellSize, cellSize, cellSize, cellSize),
      bottom: uv(cellSize * 2, cellSize, cellSize, cellSize),
    };
  }

  // Create strut geometry that extends from the bottom of the hydro generator down to solid ground
  private createStruts(
    generatorPosition: THREE.Vector3,
    planetCenter: THREE.Vector3,
    waterDepth: number
  ): THREE.Mesh | null {
    if (waterDepth <= 0) return null;

    const upDirection = generatorPosition.clone().sub(planetCenter).normalize();

    // Create 4 struts at the corners - offsets in local space (tangent plane)
    const cornerOffsets = [
      new THREE.Vector3(-0.3, 0, -0.3),
      new THREE.Vector3(0.3, 0, -0.3),
      new THREE.Vector3(-0.3, 0, 0.3),
      new THREE.Vector3(0.3, 0, 0.3),
    ];

    // Create a quaternion to rotate from Y-up to the local up direction
    const defaultUp = new THREE.Vector3(0, 1, 0);
    const alignQuaternion = new THREE.Quaternion().setFromUnitVectors(defaultUp, upDirection);

    // Build strut geometry manually as simple boxes aligned to planet radial direction
    const positions: number[] = [];
    const normals: number[] = [];
    const indices: number[] = [];
    let vertexOffset = 0;

    const halfWidth = this.STRUT_WIDTH / 2;

    for (const offset of cornerOffsets) {
      // Rotate the offset to align with the surface (get corner position in world space)
      const rotatedOffset = offset.clone().applyQuaternion(alignQuaternion);

      // Top of strut (at generator bottom)
      const strutTop = generatorPosition.clone()
        .add(rotatedOffset)
        .sub(upDirection.clone().multiplyScalar(this.HYDRO_GENERATOR_SIZE / 2));

      // Bottom of strut (at solid ground)
      const strutBottom = strutTop.clone()
        .sub(upDirection.clone().multiplyScalar(waterDepth));

      // Create local coordinate system for the strut cross-section
      // The strut goes along upDirection, we need perpendicular axes for the width
      let tangent = new THREE.Vector3(1, 0, 0);
      if (Math.abs(upDirection.dot(tangent)) > 0.9) {
        tangent = new THREE.Vector3(0, 0, 1);
      }
      const bitangent = new THREE.Vector3().crossVectors(upDirection, tangent).normalize();
      tangent.crossVectors(bitangent, upDirection).normalize();

      // 8 corners of the strut box
      const corners = [
        // Top face (4 corners)
        strutTop.clone().add(tangent.clone().multiplyScalar(-halfWidth)).add(bitangent.clone().multiplyScalar(-halfWidth)),
        strutTop.clone().add(tangent.clone().multiplyScalar(halfWidth)).add(bitangent.clone().multiplyScalar(-halfWidth)),
        strutTop.clone().add(tangent.clone().multiplyScalar(halfWidth)).add(bitangent.clone().multiplyScalar(halfWidth)),
        strutTop.clone().add(tangent.clone().multiplyScalar(-halfWidth)).add(bitangent.clone().multiplyScalar(halfWidth)),
        // Bottom face (4 corners)
        strutBottom.clone().add(tangent.clone().multiplyScalar(-halfWidth)).add(bitangent.clone().multiplyScalar(-halfWidth)),
        strutBottom.clone().add(tangent.clone().multiplyScalar(halfWidth)).add(bitangent.clone().multiplyScalar(-halfWidth)),
        strutBottom.clone().add(tangent.clone().multiplyScalar(halfWidth)).add(bitangent.clone().multiplyScalar(halfWidth)),
        strutBottom.clone().add(tangent.clone().multiplyScalar(-halfWidth)).add(bitangent.clone().multiplyScalar(halfWidth)),
      ];

      // Add faces - each quad with corrected winding order
      // Corner layout (looking down from above, +up is toward viewer):
      //   3---2    top face
      //   |   |
      //   0---1
      //
      //   7---6    bottom face
      //   |   |
      //   4---5

      // Top face (+up)
      const topNorm = upDirection.clone();
      positions.push(corners[0].x, corners[0].y, corners[0].z);
      positions.push(corners[3].x, corners[3].y, corners[3].z);
      positions.push(corners[2].x, corners[2].y, corners[2].z);
      positions.push(corners[1].x, corners[1].y, corners[1].z);
      for (let i = 0; i < 4; i++) normals.push(topNorm.x, topNorm.y, topNorm.z);
      indices.push(vertexOffset, vertexOffset + 2, vertexOffset + 1, vertexOffset, vertexOffset + 3, vertexOffset + 2);
      vertexOffset += 4;

      // Bottom face (-up)
      const botNorm = upDirection.clone().negate();
      positions.push(corners[4].x, corners[4].y, corners[4].z);
      positions.push(corners[5].x, corners[5].y, corners[5].z);
      positions.push(corners[6].x, corners[6].y, corners[6].z);
      positions.push(corners[7].x, corners[7].y, corners[7].z);
      for (let i = 0; i < 4; i++) normals.push(botNorm.x, botNorm.y, botNorm.z);
      indices.push(vertexOffset, vertexOffset + 2, vertexOffset + 1, vertexOffset, vertexOffset + 3, vertexOffset + 2);
      vertexOffset += 4;

      // Front face (+tangent)
      const frontNorm = tangent.clone();
      positions.push(corners[1].x, corners[1].y, corners[1].z);
      positions.push(corners[2].x, corners[2].y, corners[2].z);
      positions.push(corners[6].x, corners[6].y, corners[6].z);
      positions.push(corners[5].x, corners[5].y, corners[5].z);
      for (let i = 0; i < 4; i++) normals.push(frontNorm.x, frontNorm.y, frontNorm.z);
      indices.push(vertexOffset, vertexOffset + 2, vertexOffset + 1, vertexOffset, vertexOffset + 3, vertexOffset + 2);
      vertexOffset += 4;

      // Back face (-tangent)
      const backNorm = tangent.clone().negate();
      positions.push(corners[3].x, corners[3].y, corners[3].z);
      positions.push(corners[0].x, corners[0].y, corners[0].z);
      positions.push(corners[4].x, corners[4].y, corners[4].z);
      positions.push(corners[7].x, corners[7].y, corners[7].z);
      for (let i = 0; i < 4; i++) normals.push(backNorm.x, backNorm.y, backNorm.z);
      indices.push(vertexOffset, vertexOffset + 2, vertexOffset + 1, vertexOffset, vertexOffset + 3, vertexOffset + 2);
      vertexOffset += 4;

      // Right face (+bitangent)
      const rightNorm = bitangent.clone();
      positions.push(corners[2].x, corners[2].y, corners[2].z);
      positions.push(corners[3].x, corners[3].y, corners[3].z);
      positions.push(corners[7].x, corners[7].y, corners[7].z);
      positions.push(corners[6].x, corners[6].y, corners[6].z);
      for (let i = 0; i < 4; i++) normals.push(rightNorm.x, rightNorm.y, rightNorm.z);
      indices.push(vertexOffset, vertexOffset + 2, vertexOffset + 1, vertexOffset, vertexOffset + 3, vertexOffset + 2);
      vertexOffset += 4;

      // Left face (-bitangent)
      const leftNorm = bitangent.clone().negate();
      positions.push(corners[0].x, corners[0].y, corners[0].z);
      positions.push(corners[1].x, corners[1].y, corners[1].z);
      positions.push(corners[5].x, corners[5].y, corners[5].z);
      positions.push(corners[4].x, corners[4].y, corners[4].z);
      for (let i = 0; i < 4; i++) normals.push(leftNorm.x, leftNorm.y, leftNorm.z);
      indices.push(vertexOffset, vertexOffset + 2, vertexOffset + 1, vertexOffset, vertexOffset + 3, vertexOffset + 2);
      vertexOffset += 4;
    }

    const mergedGeometry = new THREE.BufferGeometry();
    mergedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    mergedGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    mergedGeometry.setIndex(indices);

    const strutMesh = new THREE.Mesh(mergedGeometry, this.strutMaterial!);
    strutMesh.userData.isHydroGeneratorStrut = true;

    return strutMesh;
  }

  public async placeHydroGenerator(
    worldPosition: THREE.Vector3,
    planetCenter: THREE.Vector3,
    tileIndex: number,
    waterDepth: number,
    playerForward?: THREE.Vector3
  ): Promise<PlacedHydroGenerator | null> {
    if (!this.hydroGeneratorGeometry || !this.hydroGeneratorMaterial) {
      await this.initGeometryAndMaterials();
    }

    if (!this.hydroGeneratorGeometry || !this.hydroGeneratorMaterial) {
      console.error('Failed to initialize hydro generator geometry/materials');
      return null;
    }

    const instanceMaterial = this.hydroGeneratorMaterial.clone();
    const mesh = new THREE.Mesh(this.hydroGeneratorGeometry, instanceMaterial);

    // Position above ground (on top of water)
    const upDirection = worldPosition.clone().sub(planetCenter).normalize();
    const hydroGeneratorPosition = worldPosition.clone().add(upDirection.multiplyScalar(this.HYDRO_GENERATOR_SIZE / 2));
    mesh.position.copy(hydroGeneratorPosition);

    // Orient to sit flat on surface
    const up = hydroGeneratorPosition.clone().sub(planetCenter).normalize();
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

    mesh.userData.isHydroGenerator = true;
    mesh.userData.tileIndex = tileIndex;

    this.scene.add(mesh);

    // Create struts if there's water depth
    const strutMesh = this.createStruts(hydroGeneratorPosition, planetCenter, waterDepth);
    if (strutMesh) {
      this.scene.add(strutMesh);
    }

    const isActive = waterDepth > 0;
    const hydroGenerator: PlacedHydroGenerator = {
      mesh,
      strutMesh,
      position: hydroGeneratorPosition.clone(),
      tileIndex,
      rotation: facingAngle,
      waterDepth,
      isActive,
      waterPumpedIn: isActive ? waterDepth * 10 : 0, // Water pumped based on depth
      waterPumpedOut: isActive ? waterDepth * 8 : 0, // Slightly less output due to efficiency
    };

    this.hydroGenerators.push(hydroGenerator);
    this.hydroGeneratorMeshes.push(mesh);

    return hydroGenerator;
  }

  public async restoreHydroGenerator(
    savedPosition: THREE.Vector3,
    planetCenter: THREE.Vector3,
    tileIndex: number,
    rotation: number,
    waterDepth: number
  ): Promise<PlacedHydroGenerator | null> {
    if (!this.hydroGeneratorGeometry || !this.hydroGeneratorMaterial) {
      await this.initGeometryAndMaterials();
    }

    if (!this.hydroGeneratorGeometry || !this.hydroGeneratorMaterial) {
      console.error('Failed to initialize hydro generator geometry/materials');
      return null;
    }

    const instanceMaterial = this.hydroGeneratorMaterial.clone();
    const mesh = new THREE.Mesh(this.hydroGeneratorGeometry, instanceMaterial);
    mesh.position.copy(savedPosition);

    const up = savedPosition.clone().sub(planetCenter).normalize();
    const alignQuaternion = new THREE.Quaternion();
    alignQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    const rotateY = new THREE.Quaternion();
    rotateY.setFromAxisAngle(up, rotation);
    mesh.quaternion.copy(rotateY).multiply(alignQuaternion);

    mesh.userData.isHydroGenerator = true;
    mesh.userData.tileIndex = tileIndex;

    this.scene.add(mesh);

    // Create struts if there's water depth
    const strutMesh = this.createStruts(savedPosition, planetCenter, waterDepth);
    if (strutMesh) {
      this.scene.add(strutMesh);
    }

    const isActive = waterDepth > 0;
    const hydroGenerator: PlacedHydroGenerator = {
      mesh,
      strutMesh,
      position: savedPosition.clone(),
      tileIndex,
      rotation,
      waterDepth,
      isActive,
      waterPumpedIn: isActive ? waterDepth * 10 : 0,
      waterPumpedOut: isActive ? waterDepth * 8 : 0,
    };

    this.hydroGenerators.push(hydroGenerator);
    this.hydroGeneratorMeshes.push(mesh);

    return hydroGenerator;
  }

  public removeHydroGenerator(hydroGenerator: PlacedHydroGenerator): void {
    const index = this.hydroGenerators.indexOf(hydroGenerator);
    if (index === -1) return;

    this.scene.remove(hydroGenerator.mesh);
    hydroGenerator.mesh.geometry.dispose();
    if (hydroGenerator.mesh.material instanceof THREE.ShaderMaterial) {
      hydroGenerator.mesh.material.dispose();
    }

    if (hydroGenerator.strutMesh) {
      this.scene.remove(hydroGenerator.strutMesh);
      hydroGenerator.strutMesh.geometry.dispose();
    }

    this.hydroGenerators.splice(index, 1);
    const meshIndex = this.hydroGeneratorMeshes.indexOf(hydroGenerator.mesh);
    if (meshIndex !== -1) {
      this.hydroGeneratorMeshes.splice(meshIndex, 1);
    }
  }

  public getHydroGeneratorMeshes(): THREE.Mesh[] {
    return this.hydroGeneratorMeshes;
  }

  public getPlacedHydroGenerators(): PlacedHydroGenerator[] {
    return this.hydroGenerators;
  }

  public getHydroGeneratorByMesh(mesh: THREE.Mesh): PlacedHydroGenerator | undefined {
    return this.hydroGenerators.find(h => h.mesh === mesh);
  }

  public getHydroGeneratorAtTile(tileIndex: number): PlacedHydroGenerator | undefined {
    return this.hydroGenerators.find(h => h.tileIndex === tileIndex);
  }

  public updateTorchLighting(torchPositions: THREE.Vector3[], torchRange: number, torchIntensity: number): void {
    for (const hydroGenerator of this.hydroGenerators) {
      let totalLight = 0;
      for (const torchPos of torchPositions) {
        const distance = hydroGenerator.position.distanceTo(torchPos);
        if (distance < torchRange) {
          const decay = 2;
          const attenuation = 1 / (1 + decay * distance * distance / (torchRange * torchRange));
          totalLight += attenuation * torchIntensity;
        }
      }
      totalLight = Math.min(1.5, totalLight);
      const material = hydroGenerator.mesh.material as THREE.ShaderMaterial;
      if (material.uniforms && material.uniforms.torchLight) {
        material.uniforms.torchLight.value = totalLight;
      }
    }
  }

  public exportForSave(): Array<{
    position: { x: number; y: number; z: number };
    tileIndex: number;
    rotation: number;
    waterDepth: number;
  }> {
    return this.hydroGenerators.map(h => ({
      position: { x: h.position.x, y: h.position.y, z: h.position.z },
      tileIndex: h.tileIndex,
      rotation: h.rotation,
      waterDepth: h.waterDepth,
    }));
  }

  public dispose(): void {
    for (const hydroGenerator of [...this.hydroGenerators]) {
      this.removeHydroGenerator(hydroGenerator);
    }
    if (this.hydroGeneratorGeometry) {
      this.hydroGeneratorGeometry.dispose();
    }
    if (this.hydroGeneratorMaterial) {
      this.hydroGeneratorMaterial.dispose();
    }
    if (this.strutMaterial) {
      this.strutMaterial.dispose();
    }
  }
}
