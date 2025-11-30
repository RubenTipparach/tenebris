import * as THREE from 'three';
import { Chunk, CHUNK_SIZE, CHUNK_HEIGHT } from './Chunk';
import { BlockType, BlockRegistry } from './Block';

export class World {
  private chunks: Map<string, Chunk> = new Map();
  private scene: THREE.Scene;
  private blockRegistry: BlockRegistry;
  private renderDistance: number = 4;

  constructor(scene: THREE.Scene, blockRegistry: BlockRegistry) {
    this.scene = scene;
    this.blockRegistry = blockRegistry;
  }

  private getChunkKey(x: number, z: number): string {
    return `${x},${z}`;
  }

  private getChunkCoords(worldX: number, worldZ: number): { chunkX: number; chunkZ: number } {
    return {
      chunkX: Math.floor(worldX / CHUNK_SIZE),
      chunkZ: Math.floor(worldZ / CHUNK_SIZE)
    };
  }

  public getBlock(worldX: number, worldY: number, worldZ: number): BlockType {
    if (worldY < 0 || worldY >= CHUNK_HEIGHT) return BlockType.AIR;

    const { chunkX, chunkZ } = this.getChunkCoords(worldX, worldZ);
    const chunk = this.chunks.get(this.getChunkKey(chunkX, chunkZ));

    if (!chunk) return BlockType.AIR;

    const localX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localZ = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    return chunk.getBlock(localX, worldY, localZ);
  }

  public setBlock(worldX: number, worldY: number, worldZ: number, type: BlockType): void {
    if (worldY < 0 || worldY >= CHUNK_HEIGHT) return;

    const { chunkX, chunkZ } = this.getChunkCoords(worldX, worldZ);
    const chunk = this.chunks.get(this.getChunkKey(chunkX, chunkZ));

    if (!chunk) return;

    const localX = ((worldX % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;
    const localZ = ((worldZ % CHUNK_SIZE) + CHUNK_SIZE) % CHUNK_SIZE;

    chunk.setBlock(localX, worldY, localZ, type);

    // Mark neighboring chunks as dirty if on border
    if (localX === 0) this.markChunkDirty(chunkX - 1, chunkZ);
    if (localX === CHUNK_SIZE - 1) this.markChunkDirty(chunkX + 1, chunkZ);
    if (localZ === 0) this.markChunkDirty(chunkX, chunkZ - 1);
    if (localZ === CHUNK_SIZE - 1) this.markChunkDirty(chunkX, chunkZ + 1);
  }

  private markChunkDirty(chunkX: number, chunkZ: number): void {
    const chunk = this.chunks.get(this.getChunkKey(chunkX, chunkZ));
    if (chunk) chunk.isDirty = true;
  }

  public updateChunks(playerX: number, playerZ: number): void {
    const { chunkX: playerChunkX, chunkZ: playerChunkZ } = this.getChunkCoords(playerX, playerZ);

    // Generate chunks around player
    for (let x = playerChunkX - this.renderDistance; x <= playerChunkX + this.renderDistance; x++) {
      for (let z = playerChunkZ - this.renderDistance; z <= playerChunkZ + this.renderDistance; z++) {
        const key = this.getChunkKey(x, z);
        if (!this.chunks.has(key)) {
          const chunk = new Chunk(x, z, this.blockRegistry);
          chunk.generate(this.getBlock.bind(this));
          this.chunks.set(key, chunk);
        }
      }
    }

    // Update dirty chunks and unload far chunks
    const chunksToRemove: string[] = [];

    for (const [key, chunk] of this.chunks) {
      const dx = Math.abs(chunk.x - playerChunkX);
      const dz = Math.abs(chunk.z - playerChunkZ);

      if (dx > this.renderDistance + 1 || dz > this.renderDistance + 1) {
        // Unload chunk
        if (chunk.mesh) {
          this.scene.remove(chunk.mesh);
          chunk.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.geometry.dispose();
            }
          });
        }
        chunksToRemove.push(key);
      } else if (chunk.isDirty) {
        // Rebuild chunk mesh
        if (chunk.mesh) {
          this.scene.remove(chunk.mesh);
        }
        const mesh = chunk.buildMesh(this.getBlock.bind(this));
        this.scene.add(mesh);
      }
    }

    for (const key of chunksToRemove) {
      this.chunks.delete(key);
    }
  }

  public raycast(origin: THREE.Vector3, direction: THREE.Vector3, maxDistance: number = 10): {
    hit: boolean;
    position: THREE.Vector3 | null;
    normal: THREE.Vector3 | null;
    blockPosition: THREE.Vector3 | null;
  } {
    // DDA raycasting algorithm
    const pos = origin.clone();
    const step = new THREE.Vector3(
      direction.x >= 0 ? 1 : -1,
      direction.y >= 0 ? 1 : -1,
      direction.z >= 0 ? 1 : -1
    );

    const blockPos = new THREE.Vector3(
      Math.floor(pos.x),
      Math.floor(pos.y),
      Math.floor(pos.z)
    );

    const deltaDist = new THREE.Vector3(
      Math.abs(1 / direction.x),
      Math.abs(1 / direction.y),
      Math.abs(1 / direction.z)
    );

    const sideDist = new THREE.Vector3(
      direction.x >= 0 ? (blockPos.x + 1 - pos.x) * deltaDist.x : (pos.x - blockPos.x) * deltaDist.x,
      direction.y >= 0 ? (blockPos.y + 1 - pos.y) * deltaDist.y : (pos.y - blockPos.y) * deltaDist.y,
      direction.z >= 0 ? (blockPos.z + 1 - pos.z) * deltaDist.z : (pos.z - blockPos.z) * deltaDist.z
    );

    let side = 0;
    let distance = 0;

    while (distance < maxDistance) {
      // Find the nearest voxel boundary
      if (sideDist.x < sideDist.y && sideDist.x < sideDist.z) {
        distance = sideDist.x;
        sideDist.x += deltaDist.x;
        blockPos.x += step.x;
        side = 0;
      } else if (sideDist.y < sideDist.z) {
        distance = sideDist.y;
        sideDist.y += deltaDist.y;
        blockPos.y += step.y;
        side = 1;
      } else {
        distance = sideDist.z;
        sideDist.z += deltaDist.z;
        blockPos.z += step.z;
        side = 2;
      }

      const block = this.getBlock(blockPos.x, blockPos.y, blockPos.z);
      if (this.blockRegistry.isSolid(block)) {
        const normal = new THREE.Vector3();
        if (side === 0) normal.x = -step.x;
        else if (side === 1) normal.y = -step.y;
        else normal.z = -step.z;

        return {
          hit: true,
          position: origin.clone().add(direction.clone().multiplyScalar(distance)),
          normal,
          blockPosition: blockPos.clone()
        };
      }
    }

    return { hit: false, position: null, normal: null, blockPosition: null };
  }

  public isBlockSolid(worldX: number, worldY: number, worldZ: number): boolean {
    return this.blockRegistry.isSolid(this.getBlock(worldX, worldY, worldZ));
  }

  public getHeightAt(worldX: number, worldZ: number): number {
    for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
      if (this.isBlockSolid(worldX, y, worldZ)) {
        return y + 1;
      }
    }
    return 0;
  }
}
