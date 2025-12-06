import * as THREE from 'three';
import cloudsVert from '../shaders/clouds/clouds.vert';
import cloudsFrag from '../shaders/clouds/clouds.frag';
import { PlayerConfig } from '../config/PlayerConfig';

export interface CloudConfig {
  planetRadius: number;
  cloudHeight: number;      // Height above planet surface
  cloudThickness: number;   // Vertical thickness of cloud layer
  cloudDensity: number;     // 0-1, how many clouds (legacy, use cloudCount instead)
  cloudCount?: number;      // Explicit number of cloud patches (overrides cloudDensity if set)
  cloudScale: number;       // Size of individual cloud blobs
  seed: number;             // Random seed for cloud pattern
  rotationSpeed?: number;   // Speed of cloud rotation (radians per second)
}

const DEFAULT_CLOUD_CONFIG: CloudConfig = {
  planetRadius: 50,
  cloudHeight: 5,
  cloudThickness: 2,
  cloudDensity: 0.4,
  cloudScale: 3,
  seed: 12345,
};

// Simple seeded random number generator
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
}

// Create a low-poly cloud blob using cube-like geometry
function createCloudBlob(
  center: THREE.Vector3,
  size: number,
  planetCenter: THREE.Vector3,
  rng: SeededRandom
): THREE.BufferGeometry | null {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];

  // Cloud direction (away from planet)
  const upDir = center.clone().sub(planetCenter).normalize();

  // Create tangent basis for the cloud
  let tangent = new THREE.Vector3(1, 0, 0);
  if (Math.abs(upDir.dot(tangent)) > 0.9) {
    tangent = new THREE.Vector3(0, 0, 1);
  }
  const right = new THREE.Vector3().crossVectors(upDir, tangent).normalize();
  const forward = new THREE.Vector3().crossVectors(right, upDir).normalize();

  // Generate cloud as cluster of offset cubes (low-poly marching cubes style)
  const numBlobs = 3 + Math.floor(rng.next() * 4); // 3-6 sub-blobs

  for (let i = 0; i < numBlobs; i++) {
    // Random offset from center
    const offsetX = (rng.next() - 0.5) * size * 0.8;
    const offsetY = (rng.next() - 0.5) * size * 0.4; // Flatter in vertical
    const offsetZ = (rng.next() - 0.5) * size * 0.8;

    const blobCenter = center.clone()
      .addScaledVector(right, offsetX)
      .addScaledVector(upDir, offsetY)
      .addScaledVector(forward, offsetZ);

    const blobSize = size * (0.3 + rng.next() * 0.4);

    // Create a simple box for this blob
    addCubeGeometry(positions, normals, indices, blobCenter, blobSize, upDir, right, forward);
  }

  if (positions.length === 0) return null;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();

  return geometry;
}

// Add a single cube to the geometry arrays
function addCubeGeometry(
  positions: number[],
  normals: number[],
  indices: number[],
  center: THREE.Vector3,
  size: number,
  up: THREE.Vector3,
  right: THREE.Vector3,
  forward: THREE.Vector3
): void {
  const halfSize = size / 2;

  // 8 vertices of the cube
  const vertices: THREE.Vector3[] = [];
  for (let i = 0; i < 8; i++) {
    const dx = (i & 1) ? halfSize : -halfSize;
    const dy = (i & 2) ? halfSize : -halfSize;
    const dz = (i & 4) ? halfSize : -halfSize;

    const v = center.clone()
      .addScaledVector(right, dx)
      .addScaledVector(up, dy)
      .addScaledVector(forward, dz);
    vertices.push(v);
  }

  // Add cube faces (6 faces, 2 triangles each)
  const faces = [
    // Face indices and normal direction
    { verts: [0, 1, 3, 2], normal: forward.clone().negate() }, // -Z
    { verts: [4, 6, 7, 5], normal: forward.clone() },          // +Z
    { verts: [0, 2, 6, 4], normal: right.clone().negate() },   // -X
    { verts: [1, 5, 7, 3], normal: right.clone() },            // +X
    { verts: [0, 4, 5, 1], normal: up.clone().negate() },      // -Y
    { verts: [2, 3, 7, 6], normal: up.clone() },               // +Y
  ];

  for (const face of faces) {
    const faceBaseIndex = positions.length / 3;

    // Add 4 vertices for this face
    for (const vi of face.verts) {
      const v = vertices[vi];
      positions.push(v.x, v.y, v.z);
      normals.push(face.normal.x, face.normal.y, face.normal.z);
    }

    // Add 2 triangles
    indices.push(
      faceBaseIndex, faceBaseIndex + 1, faceBaseIndex + 2,
      faceBaseIndex, faceBaseIndex + 2, faceBaseIndex + 3
    );
  }
}

// Create cloud material with simple shading
function createCloudMaterial(sunDirection: THREE.Vector3): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      sunDirection: { value: sunDirection.clone().normalize() },
      cloudColor: { value: new THREE.Color(0xffffff) },
      shadowColor: { value: new THREE.Color(0x8888aa) },
      ambientIntensity: { value: 0.4 },
    },
    vertexShader: cloudsVert,
    fragmentShader: cloudsFrag,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
}

export class CloudSystem {
  private clouds: THREE.Group;
  private material: THREE.ShaderMaterial;
  private config: CloudConfig;

  constructor(config: Partial<CloudConfig> = {}, sunDirection: THREE.Vector3) {
    this.config = { ...DEFAULT_CLOUD_CONFIG, ...config };
    this.clouds = new THREE.Group();
    this.material = createCloudMaterial(sunDirection);

    this.generateClouds();
  }

  private generateClouds(): void {
    const rng = new SeededRandom(this.config.seed);
    const cloudRadius = this.config.planetRadius + this.config.cloudHeight;

    // Generate cloud positions distributed around the sphere
    const numClouds = this.config.cloudCount ?? Math.floor(100 * this.config.cloudDensity);

    for (let i = 0; i < numClouds; i++) {
      // Random position on sphere using uniform distribution
      const theta = rng.next() * Math.PI * 2;
      const phi = Math.acos(2 * rng.next() - 1);

      // Random height variation within cloud layer
      const heightOffset = (rng.next() - 0.5) * this.config.cloudThickness;
      const radius = cloudRadius + heightOffset;

      const x = radius * Math.sin(phi) * Math.cos(theta);
      const y = radius * Math.sin(phi) * Math.sin(theta);
      const z = radius * Math.cos(phi);

      const cloudCenter = new THREE.Vector3(x, y, z);
      const planetCenter = new THREE.Vector3(0, 0, 0);

      // Create cloud blob geometry
      const geometry = createCloudBlob(
        cloudCenter,
        this.config.cloudScale * (0.5 + rng.next() * 0.5),
        planetCenter,
        rng
      );

      if (geometry) {
        const mesh = new THREE.Mesh(geometry, this.material);
        this.clouds.add(mesh);
      }
    }
  }

  public getGroup(): THREE.Group {
    return this.clouds;
  }

  public setPosition(position: THREE.Vector3): void {
    this.clouds.position.copy(position);
  }

  public setSunDirection(sunDirection: THREE.Vector3): void {
    this.material.uniforms.sunDirection.value.copy(sunDirection).normalize();
  }

  // Animate clouds rotating slowly around the planet
  public update(deltaTime: number): void {
    // Rotation around Y axis (in local space) - default speed gives full rotation in ~10 minutes
    const speed = this.config.rotationSpeed ?? 0.01;
    this.clouds.rotation.y += deltaTime * speed;
  }

  public setVisible(visible: boolean): void {
    this.clouds.visible = visible;
  }

  public isVisible(): boolean {
    return this.clouds.visible;
  }
}

// Factory function to create clouds for Earth-like planet
export function createEarthClouds(planetRadius: number, sunDirection: THREE.Vector3): CloudSystem {
  return new CloudSystem({
    planetRadius: planetRadius,
    cloudHeight: 4,
    cloudThickness: 1.5,
    cloudDensity: 0.35,
    cloudCount: PlayerConfig.CLOUD_COUNT,
    cloudScale: 2.5,
    seed: 42,
    rotationSpeed: PlayerConfig.CLOUD_ROTATION_SPEED,
  }, sunDirection);
}
