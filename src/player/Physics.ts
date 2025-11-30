import * as THREE from 'three';
import { World } from '../world/World';

export class Physics {
  private world: World;

  constructor(world: World) {
    this.world = world;
  }

  public checkGrounded(position: THREE.Vector3, _height: number): boolean {
    const blockX = Math.floor(position.x);
    const blockY = Math.floor(position.y) - 1;
    const blockZ = Math.floor(position.z);

    // Check a small area under the player
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const checkX = blockX + dx * 0.3;
        const checkZ = blockZ + dz * 0.3;
        if (this.world.isBlockSolid(Math.floor(checkX), blockY, Math.floor(checkZ))) {
          return true;
        }
      }
    }

    return false;
  }

  public resolveCollision(from: THREE.Vector3, to: THREE.Vector3, radius: number): THREE.Vector3 {
    const result = to.clone();

    // Check X movement
    if (this.checkCollisionAxis(from, result, 'x', radius)) {
      result.x = from.x;
    }

    // Check Z movement
    if (this.checkCollisionAxis(from, result, 'z', radius)) {
      result.z = from.z;
    }

    return result;
  }

  private checkCollisionAxis(from: THREE.Vector3, to: THREE.Vector3, axis: 'x' | 'z', radius: number): boolean {
    const playerHeight = 1.8;
    const checkPositions: THREE.Vector3[] = [];

    // Check multiple points for collision (player hitbox)
    for (let y = 0; y < playerHeight; y += 0.5) {
      checkPositions.push(new THREE.Vector3(
        axis === 'x' ? to.x : from.x,
        from.y + y,
        axis === 'z' ? to.z : from.z
      ));
    }

    for (const pos of checkPositions) {
      // Check corners of the player's hitbox
      const offsets = [
        new THREE.Vector3(radius, 0, radius),
        new THREE.Vector3(radius, 0, -radius),
        new THREE.Vector3(-radius, 0, radius),
        new THREE.Vector3(-radius, 0, -radius)
      ];

      for (const offset of offsets) {
        const checkPos = pos.clone().add(offset);
        const blockX = Math.floor(checkPos.x);
        const blockY = Math.floor(checkPos.y);
        const blockZ = Math.floor(checkPos.z);

        if (this.world.isBlockSolid(blockX, blockY, blockZ)) {
          return true;
        }
      }
    }

    return false;
  }

  public getGroundLevel(position: THREE.Vector3): number {
    const blockX = Math.floor(position.x);
    const blockZ = Math.floor(position.z);

    // Check from current position downward
    for (let y = Math.floor(position.y) + 2; y >= 0; y--) {
      if (this.world.isBlockSolid(blockX, y, blockZ)) {
        return y + 1;
      }
    }

    return 0;
  }
}
