import * as THREE from 'three';
import { getAssetPath } from '../utils/assetPath';
import { PlayerConfig } from '../config/PlayerConfig';
import techVert from '../shaders/tech/tech.vert';
import techFrag from '../shaders/tech/tech.frag';

export interface PlacedSteamEngine {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  tileIndex: number;
  rotation: number;
}

export class SteamEngineManager {
  private scene: THREE.Scene;
  private steamEngines: PlacedSteamEngine[] = [];
  private steamEngineMeshes: THREE.Mesh[] = [];
  private textureLoader: THREE.TextureLoader;
  private steamEngineGeometry: THREE.BoxGeometry | null = null;
  private steamEngineMaterial: THREE.ShaderMaterial | null = null;

  // Planet lighting uniforms
  private planetCenter: THREE.Vector3;
  private sunDirection: THREE.Vector3;

  // Steam engine is a cube (same dimensions as furnace/chest)
  private readonly STEAM_ENGINE_SIZE = 0.8;

  constructor(scene: THREE.Scene, planetCenter?: THREE.Vector3, sunDirection?: THREE.Vector3) {
    this.scene = scene;
    this.textureLoader = new THREE.TextureLoader();
    this.planetCenter = planetCenter?.clone() || new THREE.Vector3(0, 0, 0);
    this.sunDirection = sunDirection?.clone() || new THREE.Vector3(1, 0, 0);
    this.initGeometryAndMaterials();
  }

  public setSunDirection(direction: THREE.Vector3): void {
    this.sunDirection.copy(direction);
    if (this.steamEngineMaterial) {
      this.steamEngineMaterial.uniforms.sunDirection.value.copy(direction);
    }
  }

  public setPlanetCenter(center: THREE.Vector3): void {
    this.planetCenter.copy(center);
    if (this.steamEngineMaterial) {
      this.steamEngineMaterial.uniforms.planetCenter.value.copy(center);
    }
  }

  private async initGeometryAndMaterials(): Promise<void> {
    // Load the steam engine texture atlas (48x32 like furnace)
    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader.load(
        getAssetPath('/textures/technology/steam_engine.png'),
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

    // Create geometry for steam engine (cube shape)
    this.steamEngineGeometry = new THREE.BoxGeometry(
      this.STEAM_ENGINE_SIZE,
      this.STEAM_ENGINE_SIZE,
      this.STEAM_ENGINE_SIZE
    );

    // Calculate UV coordinates for each face from the texture atlas
    const faceUVs = this.calculateFaceUVs();

    // Apply UVs to geometry
    const uvAttribute = this.steamEngineGeometry.attributes.uv;
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
    applyFaceUV(0, faceUVs.sideRight, true, true);  // +X (right side) - flip H and V
    applyFaceUV(1, faceUVs.sideLeft, false, true);  // -X (left side) - flip V
    applyFaceUV(2, faceUVs.top, false, false);      // +Y (top)
    applyFaceUV(3, faceUVs.bottom, false, false);   // -Y (bottom)
    applyFaceUV(4, faceUVs.front, false, true);     // +Z (front) - flip V
    applyFaceUV(5, faceUVs.back, true, true);       // -Z (back) - flip H and V

    uvAttribute.needsUpdate = true;

    // Create material with custom shader for planet-aware lighting and torch support
    this.steamEngineMaterial = new THREE.ShaderMaterial({
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

    // UV coordinates: u1,v1 = bottom-left, u2,v2 = top-right (in UV space, V increases upward)
    const uv = (x: number, y: number, w: number, h: number) => ({
      u1: x / texWidth,
      v1: 1 - (y + h) / texHeight,  // Bottom in UV space
      u2: (x + w) / texWidth,
      v2: 1 - y / texHeight,        // Top in UV space
    });

    return {
      front: uv(0, 0, cellSize, cellSize),                    // Position 1
      sideLeft: uv(cellSize, 0, cellSize, cellSize),          // Position 2
      sideRight: uv(cellSize * 2, 0, cellSize, cellSize),     // Position 3
      back: uv(0, cellSize, cellSize, cellSize),              // Position 4
      top: uv(cellSize, cellSize, cellSize, cellSize),        // Position 5
      bottom: uv(cellSize * 2, cellSize, cellSize, cellSize), // Position 6
    };
  }

  public async placeSteamEngine(
    worldPosition: THREE.Vector3,
    planetCenter: THREE.Vector3,
    tileIndex: number,
    playerForward?: THREE.Vector3
  ): Promise<PlacedSteamEngine | null> {
    if (!this.steamEngineGeometry || !this.steamEngineMaterial) {
      await this.initGeometryAndMaterials();
    }

    if (!this.steamEngineGeometry || !this.steamEngineMaterial) {
      console.error('Failed to initialize steam engine geometry/materials');
      return null;
    }

    const instanceMaterial = this.steamEngineMaterial.clone();
    const mesh = new THREE.Mesh(this.steamEngineGeometry, instanceMaterial);

    // Position above ground
    const upDirection = worldPosition.clone().sub(planetCenter).normalize();
    const steamEnginePosition = worldPosition.clone().add(upDirection.multiplyScalar(this.STEAM_ENGINE_SIZE / 2));
    mesh.position.copy(steamEnginePosition);

    // Orient to sit flat on surface
    const up = steamEnginePosition.clone().sub(planetCenter).normalize();
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

    mesh.userData.isSteamEngine = true;
    mesh.userData.tileIndex = tileIndex;

    this.scene.add(mesh);

    const steamEngine: PlacedSteamEngine = {
      mesh,
      position: steamEnginePosition.clone(),
      tileIndex,
      rotation: facingAngle,
    };

    this.steamEngines.push(steamEngine);
    this.steamEngineMeshes.push(mesh);

    return steamEngine;
  }

  public async restoreSteamEngine(
    savedPosition: THREE.Vector3,
    planetCenter: THREE.Vector3,
    tileIndex: number,
    rotation: number
  ): Promise<PlacedSteamEngine | null> {
    if (!this.steamEngineGeometry || !this.steamEngineMaterial) {
      await this.initGeometryAndMaterials();
    }

    if (!this.steamEngineGeometry || !this.steamEngineMaterial) {
      console.error('Failed to initialize steam engine geometry/materials');
      return null;
    }

    const instanceMaterial = this.steamEngineMaterial.clone();
    const mesh = new THREE.Mesh(this.steamEngineGeometry, instanceMaterial);
    mesh.position.copy(savedPosition);

    const up = savedPosition.clone().sub(planetCenter).normalize();
    const alignQuaternion = new THREE.Quaternion();
    alignQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    const rotateY = new THREE.Quaternion();
    rotateY.setFromAxisAngle(up, rotation);
    mesh.quaternion.copy(rotateY).multiply(alignQuaternion);

    mesh.userData.isSteamEngine = true;
    mesh.userData.tileIndex = tileIndex;

    this.scene.add(mesh);

    const steamEngine: PlacedSteamEngine = {
      mesh,
      position: savedPosition.clone(),
      tileIndex,
      rotation,
    };

    this.steamEngines.push(steamEngine);
    this.steamEngineMeshes.push(mesh);

    return steamEngine;
  }

  public removeSteamEngine(steamEngine: PlacedSteamEngine): void {
    const index = this.steamEngines.indexOf(steamEngine);
    if (index === -1) return;

    this.scene.remove(steamEngine.mesh);
    steamEngine.mesh.geometry.dispose();
    if (steamEngine.mesh.material instanceof THREE.ShaderMaterial) {
      steamEngine.mesh.material.dispose();
    }

    this.steamEngines.splice(index, 1);
    const meshIndex = this.steamEngineMeshes.indexOf(steamEngine.mesh);
    if (meshIndex !== -1) {
      this.steamEngineMeshes.splice(meshIndex, 1);
    }
  }

  public getSteamEngineMeshes(): THREE.Mesh[] {
    return this.steamEngineMeshes;
  }

  public getPlacedSteamEngines(): PlacedSteamEngine[] {
    return this.steamEngines;
  }

  public getSteamEngineByMesh(mesh: THREE.Mesh): PlacedSteamEngine | undefined {
    return this.steamEngines.find(s => s.mesh === mesh);
  }

  public getSteamEngineAtTile(tileIndex: number): PlacedSteamEngine | undefined {
    return this.steamEngines.find(s => s.tileIndex === tileIndex);
  }

  public updateTorchLighting(torchPositions: THREE.Vector3[], torchRange: number, torchIntensity: number): void {
    for (const steamEngine of this.steamEngines) {
      let totalLight = 0;
      for (const torchPos of torchPositions) {
        const distance = steamEngine.position.distanceTo(torchPos);
        if (distance < torchRange) {
          const decay = 2;
          const attenuation = 1 / (1 + decay * distance * distance / (torchRange * torchRange));
          totalLight += attenuation * torchIntensity;
        }
      }
      totalLight = Math.min(1.5, totalLight);
      const material = steamEngine.mesh.material as THREE.ShaderMaterial;
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
    return this.steamEngines.map(s => ({
      position: { x: s.position.x, y: s.position.y, z: s.position.z },
      tileIndex: s.tileIndex,
      rotation: s.rotation,
    }));
  }
}
