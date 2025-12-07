import * as THREE from 'three';
import { World } from '../world/World';
import { Player } from './Player';
import { BlockType } from '../world/Block';

export class BlockInteraction {
  private world: World;
  private player: Player;
  private scene: THREE.Scene;

  private selectedBlockType: BlockType = BlockType.STONE;
  private highlightMesh: THREE.LineSegments | null = null;

  private leftClickCooldown: number = 0;
  private rightClickCooldown: number = 0;
  private readonly CLICK_COOLDOWN = 0.2; // seconds

  constructor(world: World, player: Player, scene: THREE.Scene) {
    this.world = world;
    this.player = player;
    this.scene = scene;

    this.createHighlightMesh();
    this.setupBlockSelection();
  }

  private createHighlightMesh(): void {
    const geometry = new THREE.BoxGeometry(1.01, 1.01, 1.01);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 2 });
    this.highlightMesh = new THREE.LineSegments(edges, material);
    this.highlightMesh.visible = false;
    this.scene.add(this.highlightMesh);
  }

  private setupBlockSelection(): void {
    document.addEventListener('keydown', (e) => {
      switch (e.code) {
        case 'Digit1':
          this.selectBlock(0);
          break;
        case 'Digit2':
          this.selectBlock(1);
          break;
        case 'Digit3':
          this.selectBlock(2);
          break;
      }
    });
  }

  private selectBlock(slot: number): void {
    const blockTypes = [BlockType.STONE, BlockType.DIRT, BlockType.GRASS];
    const blockNames = ['Stone', 'Dirt', 'Grass'];

    this.selectedBlockType = blockTypes[slot];

    // Update UI
    const slots = document.querySelectorAll('.hotbar-slot');
    slots.forEach((s, i) => {
      s.classList.toggle('selected', i === slot);
    });

    const blockTypeElement = document.getElementById('block-type');
    if (blockTypeElement) {
      blockTypeElement.textContent = `Block: ${blockNames[slot]}`;
    }
  }

  public update(deltaTime: number, leftClick: boolean, rightClick: boolean, wheelDelta: number = 0): void {
    // Handle mouse wheel for block selection
    if (wheelDelta !== 0) {
      const blockTypes = [BlockType.STONE, BlockType.DIRT, BlockType.GRASS];
      const currentIndex = blockTypes.indexOf(this.selectedBlockType);
      const direction = wheelDelta > 0 ? 1 : -1;
      let newIndex = currentIndex + direction;
      if (newIndex < 0) newIndex = blockTypes.length - 1;
      if (newIndex >= blockTypes.length) newIndex = 0;
      this.selectBlock(newIndex);
    }

    // Update cooldowns
    this.leftClickCooldown = Math.max(0, this.leftClickCooldown - deltaTime);
    this.rightClickCooldown = Math.max(0, this.rightClickCooldown - deltaTime);

    // Raycast to find targeted block
    const origin = this.player.getRaycastOrigin();
    const direction = this.player.getForwardVector();
    const rayResult = this.world.raycast(origin, direction, 6);

    if (rayResult.hit && rayResult.blockPosition && this.highlightMesh) {
      this.highlightMesh.visible = true;
      this.highlightMesh.position.set(
        rayResult.blockPosition.x + 0.5,
        rayResult.blockPosition.y + 0.5,
        rayResult.blockPosition.z + 0.5
      );

      // Handle block breaking
      if (leftClick && this.leftClickCooldown === 0 && rayResult.blockPosition) {
        this.breakBlock(rayResult.blockPosition);
        this.leftClickCooldown = this.CLICK_COOLDOWN;
      }

      // Handle block placing
      if (rightClick && this.rightClickCooldown === 0 && rayResult.blockPosition && rayResult.normal) {
        const placePos = rayResult.blockPosition.clone().add(rayResult.normal);
        this.placeBlock(placePos);
        this.rightClickCooldown = this.CLICK_COOLDOWN;
      }
    } else if (this.highlightMesh) {
      this.highlightMesh.visible = false;
    }
  }

  private breakBlock(position: THREE.Vector3): void {
    this.world.setBlock(
      Math.floor(position.x),
      Math.floor(position.y),
      Math.floor(position.z),
      BlockType.AIR
    );
  }

  private placeBlock(position: THREE.Vector3): void {
    const x = Math.floor(position.x);
    const y = Math.floor(position.y);
    const z = Math.floor(position.z);

    // Don't place blocks inside the player
    const playerPos = this.player.position;
    const playerMinX = playerPos.x - 0.3;
    const playerMaxX = playerPos.x + 0.3;
    const playerMinY = playerPos.y;
    const playerMaxY = playerPos.y + 1.8;
    const playerMinZ = playerPos.z - 0.3;
    const playerMaxZ = playerPos.z + 0.3;

    const blockMinX = x;
    const blockMaxX = x + 1;
    const blockMinY = y;
    const blockMaxY = y + 1;
    const blockMinZ = z;
    const blockMaxZ = z + 1;

    // Check for overlap
    const overlapsX = playerMinX < blockMaxX && playerMaxX > blockMinX;
    const overlapsY = playerMinY < blockMaxY && playerMaxY > blockMinY;
    const overlapsZ = playerMinZ < blockMaxZ && playerMaxZ > blockMinZ;

    if (overlapsX && overlapsY && overlapsZ) {
      return; // Don't place block
    }

    this.world.setBlock(x, y, z, this.selectedBlockType);
  }

  public getSelectedBlockType(): BlockType {
    return this.selectedBlockType;
  }
}
