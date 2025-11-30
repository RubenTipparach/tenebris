import * as THREE from 'three';
import { Planet } from '../planet/Planet';
import { PlanetPlayer } from './PlanetPlayer';
import { HexBlockType } from '../planet/HexBlock';

export class PlanetBlockInteraction {
  private planet: Planet;
  private player: PlanetPlayer;
  private scene: THREE.Scene;
  private raycaster: THREE.Raycaster;

  private selectedBlockType: HexBlockType = HexBlockType.STONE;
  private highlightMesh: THREE.Mesh | null = null;

  private leftClickCooldown: number = 0;
  private rightClickCooldown: number = 0;
  private readonly CLICK_COOLDOWN = 0.25;
  private readonly MAX_REACH = 8;

  constructor(planet: Planet, player: PlanetPlayer, scene: THREE.Scene) {
    this.planet = planet;
    this.player = player;
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();

    this.createHighlightMesh();
    this.setupBlockSelection();
  }

  private createHighlightMesh(): void {
    // Simple highlight sphere for now
    const geometry = new THREE.SphereGeometry(0.5, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.5
    });
    this.highlightMesh = new THREE.Mesh(geometry, material);
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
    const blockTypes = [HexBlockType.STONE, HexBlockType.DIRT, HexBlockType.GRASS];
    const blockNames = ['Stone', 'Dirt', 'Grass'];

    this.selectedBlockType = blockTypes[slot];

    const slots = document.querySelectorAll('.hotbar-slot');
    slots.forEach((s, i) => {
      s.classList.toggle('selected', i === slot);
    });

    const blockTypeElement = document.getElementById('block-type');
    if (blockTypeElement) {
      blockTypeElement.textContent = `Block: ${blockNames[slot]}`;
    }
  }

  public update(deltaTime: number, leftClick: boolean, rightClick: boolean): void {
    this.leftClickCooldown = Math.max(0, this.leftClickCooldown - deltaTime);
    this.rightClickCooldown = Math.max(0, this.rightClickCooldown - deltaTime);

    // Raycast to find targeted block
    const origin = this.player.getRaycastOrigin();
    const direction = this.player.getForwardVector();

    this.raycaster.set(origin, direction);
    this.raycaster.far = this.MAX_REACH;

    // Get all meshes from planet
    const meshes: THREE.Object3D[] = [];
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.userData.tileIndex !== undefined) {
        meshes.push(object);
      }
    });

    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const hitObject = hit.object as THREE.Mesh;

      if (this.highlightMesh) {
        this.highlightMesh.visible = true;
        this.highlightMesh.position.copy(hit.point);
      }

      const tileIndex = hitObject.userData.tileIndex as number;
      const depth = hitObject.userData.depth as number;

      // Handle block breaking
      if (leftClick && this.leftClickCooldown === 0) {
        this.breakBlock(tileIndex, depth);
        this.leftClickCooldown = this.CLICK_COOLDOWN;
      }

      // Handle block placing
      if (rightClick && this.rightClickCooldown === 0) {
        // Place above the hit block
        this.placeBlock(tileIndex, depth - 1);
        this.rightClickCooldown = this.CLICK_COOLDOWN;
      }
    } else if (this.highlightMesh) {
      this.highlightMesh.visible = false;
    }
  }

  private breakBlock(tileIndex: number, depth: number): void {
    this.planet.setBlock(tileIndex, depth, HexBlockType.AIR);
  }

  private placeBlock(tileIndex: number, depth: number): void {
    if (depth < 0) return;

    // Check if block would be inside player
    const blockRadius = this.planet.radius - depth;
    const playerDist = this.player.position.length();

    // Simple check - if player is near this tile and at similar height, don't place
    const playerTile = this.planet.getTileAtPoint(this.player.position);
    if (playerTile && playerTile.index === tileIndex) {
      if (Math.abs(playerDist - blockRadius) < 2) {
        return;
      }
    }

    this.planet.setBlock(tileIndex, depth, this.selectedBlockType);
  }

  public getSelectedBlockType(): HexBlockType {
    return this.selectedBlockType;
  }
}
