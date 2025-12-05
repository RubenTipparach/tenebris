import * as THREE from 'three';
import { Planet } from '../planet/Planet';
import { PlanetPlayer } from './PlanetPlayer';
import { HexBlockType } from '../planet/HexBlock';
import { Inventory, ItemType, ITEM_DATA } from './Inventory';
import { PlanetTreeManager } from '../planet/Tree';

// Map HexBlockType to ItemType (what you get when mining)
function blockToItem(blockType: HexBlockType): ItemType {
  switch (blockType) {
    case HexBlockType.STONE: return ItemType.STONE;
    case HexBlockType.DIRT: return ItemType.DIRT;
    case HexBlockType.GRASS: return ItemType.DIRT; // Grass drops dirt, not grass
    default: return ItemType.NONE;
  }
}

// Map ItemType to HexBlockType (what block to place)
function itemToBlock(itemType: ItemType): HexBlockType {
  switch (itemType) {
    case ItemType.STONE: return HexBlockType.STONE;
    case ItemType.DIRT: return HexBlockType.DIRT;
    case ItemType.GRASS: return HexBlockType.DIRT; // Grass items place as dirt (grass isn't placeable)
    default: return HexBlockType.AIR;
  }
}

export class PlanetBlockInteraction {
  private planet: Planet;
  private player: PlanetPlayer;
  private scene: THREE.Scene;
  private raycaster: THREE.Raycaster;
  private inventory: Inventory;

  // Wireframe for targeted block
  private blockWireframe: THREE.LineSegments | null = null;
  private treeManager: PlanetTreeManager | null = null;

  private rightClickCooldown: number = 0;
  private readonly CLICK_COOLDOWN = 0.25;
  private readonly MAX_REACH = 8;

  // Mining state
  private miningTarget: { tileIndex: number; depth: number; blockType: HexBlockType } | null = null;
  private miningTreeTarget: { mesh: THREE.Mesh; treeType: string } | null = null;
  private miningProgress: number = 0;
  private miningProgressContainer: HTMLElement | null = null;
  private miningProgressBar: HTMLElement | null = null;

  constructor(planet: Planet, player: PlanetPlayer, scene: THREE.Scene) {
    this.planet = planet;
    this.player = player;
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.inventory = new Inventory();

    this.createHighlightMesh();
    this.setupBlockSelection();
    this.setupMiningUI();
    this.updateHotbarUI();
  }

  private setupMiningUI(): void {
    this.miningProgressContainer = document.getElementById('mining-progress-container');
    this.miningProgressBar = document.getElementById('mining-progress-bar');
  }

  private updateMiningUI(progress: number): void {
    if (this.miningProgressContainer && this.miningProgressBar) {
      if (progress > 0) {
        this.miningProgressContainer.classList.add('active');
        this.miningProgressBar.style.width = `${progress * 100}%`;
      } else {
        this.miningProgressContainer.classList.remove('active');
        this.miningProgressBar.style.width = '0%';
      }
    }
  }

  private updateHotbarUI(): void {
    const hotbar = this.inventory.getHotbar();
    const slots = document.querySelectorAll('.hotbar-slot');

    slots.forEach((slotEl, index) => {
      if (index < hotbar.length) {
        const slot = hotbar[index];
        const img = slotEl.querySelector('img') as HTMLImageElement;
        let countEl = slotEl.querySelector('.item-count') as HTMLElement;

        if (slot.itemType !== ItemType.NONE && slot.quantity > 0) {
          const itemData = ITEM_DATA[slot.itemType];
          if (img) {
            img.src = itemData.texture;
            img.style.display = 'block';
          }

          // Create or update count element
          if (!countEl) {
            countEl = document.createElement('span');
            countEl.className = 'item-count';
            slotEl.appendChild(countEl);
          }
          countEl.textContent = slot.quantity > 1 ? slot.quantity.toString() : '';
        } else {
          if (img) img.style.display = 'none';
          if (countEl) countEl.textContent = '';
        }

        // Update selection
        slotEl.classList.toggle('selected', index === this.inventory.getSelectedSlot());
      }
    });
  }

  private createHighlightMesh(): void {
    // Create block wireframe (will be rebuilt dynamically based on tile shape)
    const wireframeMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      depthTest: true,
      depthWrite: false
    });
    // Start with empty geometry - will be updated when targeting a block
    const wireframeGeometry = new THREE.BufferGeometry();
    this.blockWireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
    this.blockWireframe.visible = false;
    this.scene.add(this.blockWireframe);
  }

  // Build wireframe geometry for a hex block at given tile and depth
  private updateBlockWireframe(tileIndex: number, depth: number): void {
    const tile = this.planet.getTileByIndex(tileIndex);
    if (!tile || !this.blockWireframe) return;

    const blockHeight = this.planet.getBlockHeight();
    const outerRadius = this.planet.radius - depth * blockHeight;
    const innerRadius = outerRadius - blockHeight;

    const vertices: number[] = [];
    const numSides = tile.vertices.length;

    // Scale vertices to inner and outer radii
    const innerVerts: THREE.Vector3[] = [];
    const outerVerts: THREE.Vector3[] = [];

    for (const v of tile.vertices) {
      const dir = v.clone().normalize();
      innerVerts.push(dir.clone().multiplyScalar(innerRadius).add(this.planet.center));
      outerVerts.push(dir.clone().multiplyScalar(outerRadius).add(this.planet.center));
    }

    // Top face edges (outer)
    for (let i = 0; i < numSides; i++) {
      const next = (i + 1) % numSides;
      vertices.push(outerVerts[i].x, outerVerts[i].y, outerVerts[i].z);
      vertices.push(outerVerts[next].x, outerVerts[next].y, outerVerts[next].z);
    }

    // Bottom face edges (inner)
    for (let i = 0; i < numSides; i++) {
      const next = (i + 1) % numSides;
      vertices.push(innerVerts[i].x, innerVerts[i].y, innerVerts[i].z);
      vertices.push(innerVerts[next].x, innerVerts[next].y, innerVerts[next].z);
    }

    // Vertical edges connecting top and bottom
    for (let i = 0; i < numSides; i++) {
      vertices.push(outerVerts[i].x, outerVerts[i].y, outerVerts[i].z);
      vertices.push(innerVerts[i].x, innerVerts[i].y, innerVerts[i].z);
    }

    // Update geometry
    this.blockWireframe.geometry.dispose();
    const newGeometry = new THREE.BufferGeometry();
    newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    this.blockWireframe.geometry = newGeometry;
  }

  private setupBlockSelection(): void {
    document.addEventListener('keydown', (e) => {
      const digit = parseInt(e.key);
      if (digit >= 1 && digit <= 9) {
        this.inventory.setSelectedSlot(digit - 1);
        this.updateHotbarUI();
        this.updateBlockTypeUI();
      }
    });
  }

  private updateBlockTypeUI(): void {
    const slot = this.inventory.getSelectedItem();
    const blockTypeElement = document.getElementById('block-type');
    if (blockTypeElement) {
      if (slot.itemType !== ItemType.NONE) {
        blockTypeElement.textContent = `Block: ${ITEM_DATA[slot.itemType].name}`;
      } else {
        blockTypeElement.textContent = 'Block: None';
      }
    }
  }

  public update(deltaTime: number, leftClick: boolean, rightClick: boolean): void {
    this.rightClickCooldown = Math.max(0, this.rightClickCooldown - deltaTime);

    // Raycast to find targeted block or tree
    const origin = this.player.getRaycastOrigin();
    const direction = this.player.getForwardVector();

    // First check for trees using THREE.js raycaster
    this.raycaster.set(origin, direction);
    this.raycaster.far = this.MAX_REACH;

    // Get tree meshes from tree manager (avoids expensive scene traversal)
    const treeMeshes = this.treeManager?.getTreeMeshes() ?? [];

    const treeIntersects = this.raycaster.intersectObjects(treeMeshes, false);

    // Use Planet's raycast for terrain blocks (works with batched geometry)
    const blockHit = this.planet.raycast(origin, direction, this.MAX_REACH);

    // Determine which hit is closer
    let hitTree = false;
    let hitBlock = false;
    let treeHit: THREE.Intersection | null = null;

    if (treeIntersects.length > 0 && blockHit) {
      // Both hit - pick closer one
      if (treeIntersects[0].distance < origin.distanceTo(blockHit.point)) {
        hitTree = true;
        treeHit = treeIntersects[0];
      } else {
        hitBlock = true;
      }
    } else if (treeIntersects.length > 0) {
      hitTree = true;
      treeHit = treeIntersects[0];
    } else if (blockHit) {
      hitBlock = true;
    }

    if (hitTree && treeHit) {
      const hitObject = treeHit.object as THREE.Mesh;

      // No wireframe for trees
      if (this.blockWireframe) {
        this.blockWireframe.visible = false;
      }

      const treeType = hitObject.userData.treeType as string; // 'trunk' or 'leaves'

      // Handle tree mining (left click held)
      if (leftClick) {
        this.handleTreeMining(deltaTime, hitObject, treeType);
      } else {
        this.resetMining();
      }
    } else if (hitBlock && blockHit) {
      const { tileIndex, depth, blockType, prevTileIndex, prevDepth } = blockHit;

      // Show wireframe around targeted block
      if (this.blockWireframe) {
        this.blockWireframe.visible = true;
        this.updateBlockWireframe(tileIndex, depth);
      }

      // Handle mining (left click held) - don't mine water (raycast already ignores water by default)
      if (leftClick && blockType !== HexBlockType.AIR) {
        this.handleMining(deltaTime, tileIndex, depth, blockType);
      } else {
        // Reset mining if not clicking or target changed
        this.resetMining();
      }

      // Handle block placing (right click)
      // Use the previous air block position for placement (supports horizontal placement)
      if (rightClick && this.rightClickCooldown === 0) {
        this.placeBlock(prevTileIndex, prevDepth);
        this.rightClickCooldown = this.CLICK_COOLDOWN;
      }
    } else {
      // Hide wireframe highlight
      if (this.blockWireframe) {
        this.blockWireframe.visible = false;
      }
      this.resetMining();
    }
  }

  private handleMining(deltaTime: number, tileIndex: number, depth: number, blockType: HexBlockType): void {
    // Check if target changed
    if (this.miningTarget === null ||
        this.miningTarget.tileIndex !== tileIndex ||
        this.miningTarget.depth !== depth) {
      // New target, reset progress
      this.miningTarget = { tileIndex, depth, blockType };
      this.miningProgress = 0;
    }

    // Get mining time for this block
    const itemType = blockToItem(blockType);
    const mineTime = ITEM_DATA[itemType].mineTime;

    // Increase progress
    this.miningProgress += deltaTime / mineTime;
    this.updateMiningUI(this.miningProgress);

    // Check if mining complete
    if (this.miningProgress >= 1) {
      this.breakBlock(tileIndex, depth, blockType);
      this.resetMining();
    }
  }

  private handleTreeMining(deltaTime: number, mesh: THREE.Mesh, treeType: string): void {
    // Check if target changed
    if (this.miningTreeTarget === null || this.miningTreeTarget.mesh !== mesh) {
      // New target, reset progress
      this.miningTreeTarget = { mesh, treeType };
      this.miningTarget = null;
      this.miningProgress = 0;
    }

    // Get mining time based on tree part
    const itemType = treeType === 'trunk' ? ItemType.WOOD : ItemType.LEAVES;
    const mineTime = ITEM_DATA[itemType].mineTime;

    // Increase progress
    this.miningProgress += deltaTime / mineTime;
    this.updateMiningUI(this.miningProgress);

    // Check if mining complete
    if (this.miningProgress >= 1) {
      this.breakTree(mesh, treeType);
      this.resetMining();
    }
  }

  private breakTree(mesh: THREE.Mesh, treeType: string): void {
    // Add item to inventory
    const itemType = treeType === 'trunk' ? ItemType.WOOD : ItemType.LEAVES;
    this.inventory.addItem(itemType, 1);
    this.updateHotbarUI();

    // Find and remove the tree group
    if (this.treeManager) {
      let parent = mesh.parent;
      while (parent && !(parent instanceof THREE.Group && parent.children.some(c => c.userData.isTree))) {
        parent = parent.parent;
      }
      if (parent instanceof THREE.Group) {
        this.treeManager.removeTree(parent);
      }
    }
  }

  private resetMining(): void {
    this.miningTarget = null;
    this.miningTreeTarget = null;
    this.miningProgress = 0;
    this.updateMiningUI(0);
  }

  private breakBlock(tileIndex: number, depth: number, blockType: HexBlockType): void {
    // Prevent mining the bottom-most block (bedrock layer) to avoid falling through the world
    const maxDepth = this.planet.getMaxDepth();
    if (depth >= maxDepth - 1) {
      return;
    }

    // Add item to inventory
    const itemType = blockToItem(blockType);
    if (itemType !== ItemType.NONE) {
      this.inventory.addItem(itemType, 1);
      this.updateHotbarUI();
    }

    // Remove block from world
    this.planet.setBlock(tileIndex, depth, HexBlockType.AIR);
  }

  private placeBlock(tileIndex: number, depth: number): void {
    if (depth < 0) return;

    const selectedSlot = this.inventory.getSelectedItem();
    if (selectedSlot.itemType === ItemType.NONE || selectedSlot.quantity === 0) {
      return; // No item to place
    }

    const blockType = itemToBlock(selectedSlot.itemType);
    if (blockType === HexBlockType.AIR) return;

    // Check if block would overlap with player's body
    // Player position is at FEET level, player occupies from feet to feet + PLAYER_HEIGHT
    const playerTile = this.planet.getTileAtPoint(this.player.position);
    if (playerTile && playerTile.index === tileIndex) {
      // Player is on the same tile - check vertical overlap
      const playerFeetRadius = this.player.position.distanceTo(this.planet.center);
      const playerHeadRadius = playerFeetRadius + 1.8; // PLAYER_HEIGHT

      // Block occupies from blockBottomRadius to blockTopRadius
      const blockTopRadius = this.planet.radius - depth;
      const blockBottomRadius = blockTopRadius - 1; // Block height is 1

      // Check if block overlaps with player's body (feet to head)
      // They overlap if: blockTop > playerFeet AND blockBottom < playerHead
      if (blockTopRadius > playerFeetRadius && blockBottomRadius < playerHeadRadius) {
        return; // Would place block inside player
      }
    }

    // Use item from inventory
    if (this.inventory.useSelectedItem()) {
      this.planet.setBlock(tileIndex, depth, blockType);
      this.updateHotbarUI();
    }
  }

  public getInventory(): Inventory {
    return this.inventory;
  }

  public setTreeManager(treeManager: PlanetTreeManager): void {
    this.treeManager = treeManager;
  }
}
