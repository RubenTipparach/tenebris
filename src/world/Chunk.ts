import * as THREE from 'three';
import { BlockType, BlockRegistry } from './Block';

export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 64;

export class Chunk {
  public readonly x: number;
  public readonly z: number;
  public readonly blocks: Uint8Array;
  public mesh: THREE.Group | null = null;
  public isDirty: boolean = true;

  private blockRegistry: BlockRegistry;

  constructor(x: number, z: number, blockRegistry: BlockRegistry) {
    this.x = x;
    this.z = z;
    this.blockRegistry = blockRegistry;
    this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
  }

  private getIndex(x: number, y: number, z: number): number {
    return x + z * CHUNK_SIZE + y * CHUNK_SIZE * CHUNK_SIZE;
  }

  public getBlock(x: number, y: number, z: number): BlockType {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
      return BlockType.AIR;
    }
    return this.blocks[this.getIndex(x, y, z)];
  }

  public setBlock(x: number, y: number, z: number, type: BlockType): void {
    if (x < 0 || x >= CHUNK_SIZE || y < 0 || y >= CHUNK_HEIGHT || z < 0 || z >= CHUNK_SIZE) {
      return;
    }
    this.blocks[this.getIndex(x, y, z)] = type;
    this.isDirty = true;
  }

  public generate(_getNeighborBlock: (worldX: number, worldY: number, worldZ: number) => BlockType): void {
    const worldX = this.x * CHUNK_SIZE;
    const worldZ = this.z * CHUNK_SIZE;

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        // Generate terrain height using simple noise
        const height = this.getTerrainHeight(worldX + x, worldZ + z);

        for (let y = 0; y < CHUNK_HEIGHT; y++) {
          let blockType = BlockType.AIR;

          if (y < height - 3) {
            blockType = BlockType.STONE;
          } else if (y < height) {
            blockType = BlockType.DIRT;
          } else if (y === height) {
            blockType = BlockType.GRASS;
          }

          this.setBlock(x, y, z, blockType);
        }
      }
    }

    this.isDirty = true;
  }

  private getTerrainHeight(x: number, z: number): number {
    // Simple pseudo-random terrain generation
    const scale1 = 0.02;
    const scale2 = 0.05;
    const scale3 = 0.1;

    // Layered noise for more interesting terrain
    const noise1 = this.noise2D(x * scale1, z * scale1) * 15;
    const noise2 = this.noise2D(x * scale2, z * scale2) * 8;
    const noise3 = this.noise2D(x * scale3, z * scale3) * 4;

    const baseHeight = 10;
    return Math.floor(baseHeight + noise1 + noise2 + noise3);
  }

  // Simple hash-based noise function
  private noise2D(x: number, z: number): number {
    const xi = Math.floor(x);
    const zi = Math.floor(z);
    const xf = x - xi;
    const zf = z - zi;

    const n00 = this.hash(xi, zi);
    const n01 = this.hash(xi, zi + 1);
    const n10 = this.hash(xi + 1, zi);
    const n11 = this.hash(xi + 1, zi + 1);

    // Bilinear interpolation
    const nx0 = this.lerp(n00, n10, this.smoothstep(xf));
    const nx1 = this.lerp(n01, n11, this.smoothstep(xf));

    return this.lerp(nx0, nx1, this.smoothstep(zf));
  }

  private hash(x: number, z: number): number {
    let h = x * 374761393 + z * 668265263;
    h = (h ^ (h >> 13)) * 1274126177;
    return ((h ^ (h >> 16)) & 0x7fffffff) / 0x7fffffff;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private smoothstep(t: number): number {
    return t * t * (3 - 2 * t);
  }

  public buildMesh(getNeighborBlock: (worldX: number, worldY: number, worldZ: number) => BlockType): THREE.Group {
    if (this.mesh) {
      // Dispose old mesh
      this.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
        }
      });
    }

    const group = new THREE.Group();
    group.position.set(this.x * CHUNK_SIZE, 0, this.z * CHUNK_SIZE);

    // Group faces by block type for batching
    const facesByType: Map<BlockType, { positions: number[], normals: number[], uvs: number[], indices: number[] }> = new Map();

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let y = 0; y < CHUNK_HEIGHT; y++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          const blockType = this.getBlock(x, y, z);
          if (blockType === BlockType.AIR) continue;

          const worldBlockX = this.x * CHUNK_SIZE + x;
          const worldBlockZ = this.z * CHUNK_SIZE + z;

          // Check each face - UVs go: bottom-left, top-left, top-right, bottom-right
          // Three.js UV origin is bottom-left, so we flip Y: (0,0)=bottom-left, (1,1)=top-right
          const faces = [
            { dir: [1, 0, 0], normal: [1, 0, 0], uv: [[1, 0], [1, 1], [0, 1], [0, 0]] },   // +X
            { dir: [-1, 0, 0], normal: [-1, 0, 0], uv: [[0, 0], [0, 1], [1, 1], [1, 0]] }, // -X
            { dir: [0, 1, 0], normal: [0, 1, 0], uv: [[0, 0], [0, 1], [1, 1], [1, 0]] },   // +Y
            { dir: [0, -1, 0], normal: [0, -1, 0], uv: [[0, 0], [0, 1], [1, 1], [1, 0]] }, // -Y
            { dir: [0, 0, 1], normal: [0, 0, 1], uv: [[0, 0], [0, 1], [1, 1], [1, 0]] },   // +Z
            { dir: [0, 0, -1], normal: [0, 0, -1], uv: [[1, 0], [1, 1], [0, 1], [0, 0]] }  // -Z
          ];

          for (let faceIdx = 0; faceIdx < faces.length; faceIdx++) {
            const face = faces[faceIdx];
            const neighborX = worldBlockX + face.dir[0];
            const neighborY = y + face.dir[1];
            const neighborZ = worldBlockZ + face.dir[2];

            const neighborBlock = getNeighborBlock(neighborX, neighborY, neighborZ);
            if (this.blockRegistry.isSolid(neighborBlock)) continue;

            // Get or create face data for this block type
            if (!facesByType.has(blockType)) {
              facesByType.set(blockType, { positions: [], normals: [], uvs: [], indices: [] });
            }
            const faceData = facesByType.get(blockType)!;

            // Add face
            this.addFace(faceData, x, y, z, faceIdx, face);
          }
        }
      }
    }

    // Create meshes for each block type
    for (const [blockType, faceData] of facesByType) {
      if (faceData.positions.length === 0) continue;

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(faceData.positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(faceData.normals, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(faceData.uvs, 2));
      geometry.setIndex(faceData.indices);

      const materials = this.blockRegistry.getMaterials(blockType);
      // Use a single material for the merged geometry
      const material = materials[0] || new THREE.MeshLambertMaterial({ color: 0x888888 });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    }

    this.mesh = group;
    this.isDirty = false;

    return group;
  }

  private addFace(
    faceData: { positions: number[], normals: number[], uvs: number[], indices: number[] },
    x: number, y: number, z: number,
    faceIdx: number,
    face: { dir: number[], normal: number[], uv: number[][] }
  ): void {
    const baseIndex = faceData.positions.length / 3;

    // Face vertices based on direction
    const vertices = this.getFaceVertices(x, y, z, faceIdx);

    for (let i = 0; i < 4; i++) {
      faceData.positions.push(vertices[i * 3], vertices[i * 3 + 1], vertices[i * 3 + 2]);
      faceData.normals.push(face.normal[0], face.normal[1], face.normal[2]);
      faceData.uvs.push(face.uv[i][0], face.uv[i][1]);
    }

    // Two triangles for the quad
    faceData.indices.push(
      baseIndex, baseIndex + 1, baseIndex + 2,
      baseIndex, baseIndex + 2, baseIndex + 3
    );
  }

  private getFaceVertices(x: number, y: number, z: number, faceIdx: number): number[] {
    // Returns 4 vertices (12 floats) for each face
    // Vertices must be in counter-clockwise order when viewed from outside the cube
    switch (faceIdx) {
      case 0: // +X (looking from +X toward origin)
        return [
          x + 1, y, z,
          x + 1, y + 1, z,
          x + 1, y + 1, z + 1,
          x + 1, y, z + 1
        ];
      case 1: // -X (looking from -X toward origin)
        return [
          x, y, z + 1,
          x, y + 1, z + 1,
          x, y + 1, z,
          x, y, z
        ];
      case 2: // +Y (looking from above)
        return [
          x, y + 1, z,
          x, y + 1, z + 1,
          x + 1, y + 1, z + 1,
          x + 1, y + 1, z
        ];
      case 3: // -Y (looking from below)
        return [
          x, y, z + 1,
          x, y, z,
          x + 1, y, z,
          x + 1, y, z + 1
        ];
      case 4: // +Z (looking from +Z toward origin)
        return [
          x + 1, y, z + 1,
          x + 1, y + 1, z + 1,
          x, y + 1, z + 1,
          x, y, z + 1
        ];
      case 5: // -Z (looking from -Z toward origin)
        return [
          x, y, z,
          x, y + 1, z,
          x + 1, y + 1, z,
          x + 1, y, z
        ];
      default:
        return [];
    }
  }
}
