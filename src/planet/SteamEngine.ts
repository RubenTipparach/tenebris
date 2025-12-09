import * as THREE from 'three';
import { getAssetPath } from '../utils/assetPath';
import { PlayerConfig } from '../config/PlayerConfig';
import techVert from '../shaders/tech/tech.vert';
import techFrag from '../shaders/tech/tech.frag';
import steamVert from '../shaders/steam/steam.vert';
import steamFrag from '../shaders/steam/steam.frag';

// Steam particle data
interface SteamParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;      // 0-1, 0 = just spawned, 1 = dead
  seed: number;      // Random value for variation
}

export interface PlacedSteamEngine {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  tileIndex: number;
  rotation: number;
  // Steam particle system
  steamParticles: SteamParticle[];
  steamMesh: THREE.Points | null;
  steamGeometry: THREE.BufferGeometry | null;
  isRunning: boolean;
  spawnAccumulator: number; // Accumulates time for even particle spawning
}

export class SteamEngineManager {
  private scene: THREE.Scene;
  private steamEngines: PlacedSteamEngine[] = [];
  private steamEngineMeshes: THREE.Mesh[] = [];
  private textureLoader: THREE.TextureLoader;
  private steamEngineGeometry: THREE.BoxGeometry | null = null;
  private steamEngineMaterial: THREE.ShaderMaterial | null = null;
  private steamParticleMaterial: THREE.ShaderMaterial | null = null;

  // Planet lighting uniforms
  private planetCenter: THREE.Vector3;
  private sunDirection: THREE.Vector3;

  // Steam engine is a cube (same dimensions as furnace/chest)
  private readonly STEAM_ENGINE_SIZE = 0.8;

  // Steam particle settings
  private readonly MAX_PARTICLES_PER_ENGINE = 30;
  private readonly PARTICLE_SPAWN_RATE = 8; // particles per second when running
  private readonly PARTICLE_LIFETIME = 1.5; // seconds
  private readonly PARTICLE_SPEED = 0.8; // units per second upward
  private readonly PARTICLE_SPREAD = 0.15; // horizontal spread

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

    // Create material for steam particles
    // Use normal blending with depth test but no depth write for proper layering
    this.steamParticleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        particleSize: { value: 12.0 },
      },
      vertexShader: steamVert,
      fragmentShader: steamFrag,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.NormalBlending,
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
      steamParticles: [],
      steamMesh: null,
      steamGeometry: null,
      isRunning: false,
      spawnAccumulator: 0,
    };

    // Create particle system for this engine
    this.createSteamParticleSystem(steamEngine, planetCenter);

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
      steamParticles: [],
      steamMesh: null,
      steamGeometry: null,
      isRunning: false,
      spawnAccumulator: 0,
    };

    // Create particle system for this engine
    this.createSteamParticleSystem(steamEngine, planetCenter);

    this.steamEngines.push(steamEngine);
    this.steamEngineMeshes.push(mesh);

    return steamEngine;
  }

  public removeSteamEngine(steamEngine: PlacedSteamEngine): void {
    const index = this.steamEngines.indexOf(steamEngine);
    if (index === -1) return;

    // Clean up particle system
    if (steamEngine.steamMesh) {
      this.scene.remove(steamEngine.steamMesh);
    }
    if (steamEngine.steamGeometry) {
      steamEngine.steamGeometry.dispose();
    }

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

  /**
   * Create the particle system geometry and mesh for a steam engine
   */
  private createSteamParticleSystem(steamEngine: PlacedSteamEngine, planetCenter: THREE.Vector3): void {
    if (!this.steamParticleMaterial) return;

    // Create buffer geometry with space for max particles
    const geometry = new THREE.BufferGeometry();

    // Position attribute (3 floats per particle)
    const positions = new Float32Array(this.MAX_PARTICLES_PER_ENGINE * 3);
    // Life attribute (1 float per particle)
    const lives = new Float32Array(this.MAX_PARTICLES_PER_ENGINE);
    // Seed attribute (1 float per particle)
    const seeds = new Float32Array(this.MAX_PARTICLES_PER_ENGINE);
    // Velocity attribute (3 floats per particle) - not used in shader but stored for CPU sim
    const velocities = new Float32Array(this.MAX_PARTICLES_PER_ENGINE * 3);

    // Initialize all particles as dead (life = 1)
    for (let i = 0; i < this.MAX_PARTICLES_PER_ENGINE; i++) {
      lives[i] = 1.0;
      seeds[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('particleLife', new THREE.BufferAttribute(lives, 1));
    geometry.setAttribute('particleSeed', new THREE.BufferAttribute(seeds, 1));
    geometry.setAttribute('particleVelocity', new THREE.BufferAttribute(velocities, 3));

    // Create the Points mesh with cloned material
    const material = this.steamParticleMaterial.clone();
    const points = new THREE.Points(geometry, material);

    // Position the particle system at the top of the steam engine
    const upDirection = steamEngine.position.clone().sub(planetCenter).normalize();
    const emitterPos = steamEngine.position.clone().add(upDirection.clone().multiplyScalar(this.STEAM_ENGINE_SIZE / 2 + 0.1));
    points.position.copy(emitterPos);

    // Orient so that local Y aligns with surface normal (up direction)
    const alignQuaternion = new THREE.Quaternion();
    alignQuaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), upDirection);
    points.quaternion.copy(alignQuaternion);

    // Set render order to draw after most transparent objects (like water)
    points.renderOrder = 100;

    // Store the up direction for particle movement
    points.userData.upDirection = upDirection;
    points.userData.emitterPosition = emitterPos.clone();

    this.scene.add(points);

    steamEngine.steamGeometry = geometry;
    steamEngine.steamMesh = points;
  }

  /**
   * Set whether a steam engine is running (producing steam)
   */
  public setEngineRunning(tileIndex: number, isRunning: boolean): void {
    const engine = this.getSteamEngineAtTile(tileIndex);
    if (engine) {
      engine.isRunning = isRunning;
    }
  }

  /**
   * Update all steam particle systems
   */
  public update(deltaTime: number): void {
    // Cap delta time to prevent large jumps after pause (max ~2 frames at 60fps)
    const cappedDelta = Math.min(deltaTime, 0.05);
    const time = performance.now() / 1000;

    for (const engine of this.steamEngines) {
      if (!engine.steamMesh || !engine.steamGeometry) continue;

      const geometry = engine.steamGeometry;
      const positions = geometry.attributes.position.array as Float32Array;
      const lives = geometry.attributes.particleLife.array as Float32Array;
      const seeds = geometry.attributes.particleSeed.array as Float32Array;

      // Count active particles and find dead slots
      let activeCount = 0;
      const deadSlots: number[] = [];

      for (let i = 0; i < this.MAX_PARTICLES_PER_ENGINE; i++) {
        if (lives[i] < 1.0) {
          // Update living particle
          lives[i] += cappedDelta / this.PARTICLE_LIFETIME;

          if (lives[i] >= 1.0) {
            // Particle died
            lives[i] = 1.0;
            deadSlots.push(i);
          } else {
            // Move particle upward (in local space, up is Y)
            const speed = this.PARTICLE_SPEED * cappedDelta;
            positions[i * 3 + 1] += speed; // Y is up in local space

            // Add some horizontal drift
            const drift = Math.sin(time * 2 + seeds[i] * 10) * 0.02 * cappedDelta;
            positions[i * 3] += drift;
            positions[i * 3 + 2] += Math.cos(time * 2 + seeds[i] * 10) * 0.02 * cappedDelta;

            activeCount++;
          }
        } else {
          deadSlots.push(i);
        }
      }

      // Spawn new particles if engine is running, using accumulator for even distribution
      if (engine.isRunning && deadSlots.length > 0) {
        // Accumulate time, but cap it to prevent burst spawning after pause
        // Cap at 2 spawn intervals worth to allow at most 2 particles per frame
        const spawnInterval = 1.0 / this.PARTICLE_SPAWN_RATE;
        const maxAccumulator = spawnInterval * 2;
        engine.spawnAccumulator = Math.min(engine.spawnAccumulator + cappedDelta, maxAccumulator);

        let spawned = 0;
        const maxSpawnPerFrame = 2; // Never spawn more than 2 particles per frame

        // Spawn one particle at a time until we've caught up
        while (engine.spawnAccumulator >= spawnInterval && spawned < deadSlots.length && spawned < maxSpawnPerFrame) {
          engine.spawnAccumulator -= spawnInterval;

          const slot = deadSlots[spawned];

          // Spawn at origin with random spread (local space)
          const spreadX = (Math.random() - 0.5) * this.PARTICLE_SPREAD * 2;
          const spreadZ = (Math.random() - 0.5) * this.PARTICLE_SPREAD * 2;

          positions[slot * 3] = spreadX;
          positions[slot * 3 + 1] = 0; // Start at emitter height
          positions[slot * 3 + 2] = spreadZ;

          lives[slot] = 0.0; // Just spawned
          seeds[slot] = Math.random();

          spawned++;
        }
      } else if (!engine.isRunning) {
        // Reset accumulator when not running
        engine.spawnAccumulator = 0;
      }

      // Mark attributes as needing update
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.particleLife.needsUpdate = true;
      geometry.attributes.particleSeed.needsUpdate = true;

      // Update material time uniform
      const material = engine.steamMesh.material as THREE.ShaderMaterial;
      if (material.uniforms.time) {
        material.uniforms.time.value = time;
      }
    }
  }
}
