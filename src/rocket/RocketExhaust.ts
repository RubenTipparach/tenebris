import * as THREE from 'three';
import { ROCKET_CONFIG } from '../config/RocketConfig';
import exhaustVert from '../shaders/exhaust/exhaust.vert';
import exhaustFrag from '../shaders/exhaust/exhaust.frag';

/**
 * Exhaust particle data
 */
interface ExhaustParticle {
  life: number;      // 0-1, 0 = just spawned, 1 = dead
  seed: number;      // Random value for variation
}

/**
 * Rocket exhaust particle system
 * Creates fire/thrust particles from engine parts
 */
export class RocketExhaust {
  private scene: THREE.Scene;
  private exhaustMesh: THREE.Points | null = null;
  private exhaustGeometry: THREE.BufferGeometry | null = null;
  private exhaustMaterial: THREE.ShaderMaterial | null = null;
  private particles: ExhaustParticle[] = [];

  // Parent group to attach to
  private parentGroup: THREE.Group | null = null;

  // Engine positions relative to rocket pivot (in local space)
  private engineOffsets: THREE.Vector3[] = [];

  // Particle settings
  private readonly MAX_PARTICLES = ROCKET_CONFIG.VISUAL.exhaustParticleCount;
  private readonly PARTICLE_SPAWN_RATE = 60;  // Particles per second per engine
  private readonly PARTICLE_LIFETIME = 0.4;   // Seconds
  private readonly PARTICLE_SPEED = 8;        // Units per second downward
  private readonly PARTICLE_SPREAD = 0.3;     // Horizontal spread

  private spawnAccumulator = 0;
  private isActive = false;
  private currentThrottle = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.initMaterial();
  }

  /**
   * Initialize the shader material
   */
  private initMaterial(): void {
    this.exhaustMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        particleSize: { value: 20.0 },
        throttle: { value: 0 },
      },
      vertexShader: exhaustVert,
      fragmentShader: exhaustFrag,
      transparent: true,
      depthWrite: false,
      depthTest: true,
      blending: THREE.AdditiveBlending,  // Additive for fire glow
    });
  }

  /**
   * Initialize the particle system with engine positions
   * @param parent The rocket pivot group to attach to
   * @param engineLocalPositions Local positions of engine exhaust points (relative to pivot)
   */
  public initialize(parent: THREE.Group, engineLocalPositions: THREE.Vector3[]): void {
    this.parentGroup = parent;
    this.engineOffsets = engineLocalPositions.map(p => p.clone());

    // Create buffer geometry
    this.exhaustGeometry = new THREE.BufferGeometry();

    const positions = new Float32Array(this.MAX_PARTICLES * 3);
    const lives = new Float32Array(this.MAX_PARTICLES);
    const seeds = new Float32Array(this.MAX_PARTICLES);

    // Initialize all particles as dead
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      lives[i] = 1.0;
      seeds[i] = Math.random();
      this.particles.push({ life: 1.0, seed: Math.random() });
    }

    this.exhaustGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.exhaustGeometry.setAttribute('particleLife', new THREE.BufferAttribute(lives, 1));
    this.exhaustGeometry.setAttribute('particleSeed', new THREE.BufferAttribute(seeds, 1));

    // Create Points mesh
    if (this.exhaustMaterial) {
      this.exhaustMesh = new THREE.Points(this.exhaustGeometry, this.exhaustMaterial);
      this.exhaustMesh.frustumCulled = false;  // Always render (particles move fast)
      this.exhaustMesh.renderOrder = 100;

      // Add to scene (not parent, so we can position in world space)
      this.scene.add(this.exhaustMesh);
    }
  }

  /**
   * Set whether exhaust is active
   */
  public setActive(active: boolean): void {
    this.isActive = active;
    if (!active) {
      this.spawnAccumulator = 0;
    }
  }

  /**
   * Set the throttle level (affects particle size and spawn rate)
   */
  public setThrottle(throttle: number): void {
    this.currentThrottle = Math.max(0, Math.min(1, throttle));
    if (this.exhaustMaterial) {
      this.exhaustMaterial.uniforms.throttle.value = this.currentThrottle;
    }
  }

  /**
   * Update the particle system
   */
  public update(deltaTime: number): void {
    if (!this.exhaustGeometry || !this.exhaustMesh || !this.parentGroup) return;

    const cappedDelta = Math.min(deltaTime, 0.05);
    const time = performance.now() / 1000;

    // Update material time
    if (this.exhaustMaterial) {
      this.exhaustMaterial.uniforms.time.value = time;
    }

    const positions = this.exhaustGeometry.attributes.position.array as Float32Array;
    const lives = this.exhaustGeometry.attributes.particleLife.array as Float32Array;
    const seeds = this.exhaustGeometry.attributes.particleSeed.array as Float32Array;

    // Get rocket's current world transform
    const rocketPosition = new THREE.Vector3();
    const rocketQuaternion = new THREE.Quaternion();
    this.parentGroup.getWorldPosition(rocketPosition);
    this.parentGroup.getWorldQuaternion(rocketQuaternion);

    // Rocket's down direction (opposite of up, where thrust goes)
    const rocketDown = new THREE.Vector3(0, -1, 0).applyQuaternion(rocketQuaternion);

    // Find dead particle slots
    const deadSlots: number[] = [];

    // Update existing particles
    for (let i = 0; i < this.MAX_PARTICLES; i++) {
      if (lives[i] < 1.0) {
        // Update living particle
        lives[i] += cappedDelta / this.PARTICLE_LIFETIME;

        if (lives[i] >= 1.0) {
          lives[i] = 1.0;
          deadSlots.push(i);
        } else {
          // Move particle in exhaust direction (world space)
          const speed = this.PARTICLE_SPEED * cappedDelta * (0.8 + this.currentThrottle * 0.4);

          // Get current position
          const px = positions[i * 3];
          const py = positions[i * 3 + 1];
          const pz = positions[i * 3 + 2];

          // Move along rocket's down direction
          positions[i * 3] = px + rocketDown.x * speed;
          positions[i * 3 + 1] = py + rocketDown.y * speed;
          positions[i * 3 + 2] = pz + rocketDown.z * speed;

          // Add some turbulence
          const turbulence = 0.5 * cappedDelta;
          const seed = seeds[i];
          positions[i * 3] += Math.sin(time * 10 + seed * 20) * turbulence;
          positions[i * 3 + 1] += Math.cos(time * 12 + seed * 15) * turbulence * 0.5;
          positions[i * 3 + 2] += Math.sin(time * 8 + seed * 25) * turbulence;
        }
      } else {
        deadSlots.push(i);
      }
    }

    // Spawn new particles if active and throttle > 0
    if (this.isActive && this.currentThrottle > 0 && deadSlots.length > 0 && this.engineOffsets.length > 0) {
      // Spawn rate scales with throttle
      const effectiveSpawnRate = this.PARTICLE_SPAWN_RATE * this.currentThrottle * this.engineOffsets.length;
      const spawnInterval = 1.0 / effectiveSpawnRate;

      this.spawnAccumulator += cappedDelta;

      let spawned = 0;
      const maxSpawnPerFrame = Math.min(10, deadSlots.length);

      while (this.spawnAccumulator >= spawnInterval && spawned < maxSpawnPerFrame) {
        this.spawnAccumulator -= spawnInterval;

        const slot = deadSlots[spawned];

        // Pick a random engine to spawn from
        const engineIndex = Math.floor(Math.random() * this.engineOffsets.length);
        const engineOffset = this.engineOffsets[engineIndex];

        // Transform engine offset to world space
        const spawnPos = engineOffset.clone().applyQuaternion(rocketQuaternion).add(rocketPosition);

        // Add random spread perpendicular to thrust direction
        const spreadAngle = Math.random() * Math.PI * 2;
        const spreadDist = Math.random() * this.PARTICLE_SPREAD;

        // Get perpendicular vectors to down direction
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(rocketQuaternion);
        const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(rocketQuaternion);

        spawnPos.add(right.multiplyScalar(Math.cos(spreadAngle) * spreadDist));
        spawnPos.add(forward.multiplyScalar(Math.sin(spreadAngle) * spreadDist));

        // Offset slightly down from engine
        spawnPos.add(rocketDown.clone().multiplyScalar(0.2));

        positions[slot * 3] = spawnPos.x;
        positions[slot * 3 + 1] = spawnPos.y;
        positions[slot * 3 + 2] = spawnPos.z;

        lives[slot] = 0.0;
        seeds[slot] = Math.random();

        spawned++;
      }

      // Cap accumulator to prevent burst spawning
      this.spawnAccumulator = Math.min(this.spawnAccumulator, spawnInterval * 2);
    }

    // Mark attributes as needing update
    this.exhaustGeometry.attributes.position.needsUpdate = true;
    this.exhaustGeometry.attributes.particleLife.needsUpdate = true;
    this.exhaustGeometry.attributes.particleSeed.needsUpdate = true;
  }

  /**
   * Dispose of resources
   */
  public dispose(): void {
    if (this.exhaustMesh) {
      this.scene.remove(this.exhaustMesh);
    }
    if (this.exhaustGeometry) {
      this.exhaustGeometry.dispose();
    }
    if (this.exhaustMaterial) {
      this.exhaustMaterial.dispose();
    }
    this.exhaustMesh = null;
    this.exhaustGeometry = null;
    this.exhaustMaterial = null;
    this.particles = [];
    this.engineOffsets = [];
    this.parentGroup = null;
  }
}
