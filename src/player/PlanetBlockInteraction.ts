import * as THREE from 'three';
import { Planet } from '../planet/Planet';
import { PlanetPlayer } from './PlanetPlayer';
import { HexBlockType } from '../planet/HexBlock';
import { Inventory, ItemType, ITEM_DATA } from './Inventory';
import { PlanetTreeManager } from '../planet/Tree';
import { HeldTorch, TorchManager } from '../planet/Torch';
import { FurnaceManager, PlacedFurnace } from '../planet/Furnace';
import { StorageChestManager, PlacedStorageChest } from '../planet/StorageChest';
import { GarbagePileManager, PlacedGarbagePile } from '../planet/GarbagePile';
import { SteamEngineManager, PlacedSteamEngine } from '../planet/SteamEngine';
import { HydroGeneratorManager, PlacedHydroGenerator } from '../planet/HydroGenerator';
import { CopperPipeManager, PlacedCopperPipe } from '../planet/CopperPipe';
import { CableNodeManager, PlacedCable } from '../planet/CableNode';
import { ElectricFurnaceManager, PlacedElectricFurnace } from '../planet/ElectricFurnace';
import { CraftingSystem } from './CraftingSystem';
import { HydroGeneratorUI } from './HydroGeneratorUI';
import { SteamEngineUI } from './SteamEngineUI';
import { CopperPipeUI } from './CopperPipeUI';
import { FurnaceUI } from './FurnaceUI';
import { ElectricFurnaceUI } from './ElectricFurnaceUI';
import { StorageUI } from './StorageUI';
import { getAssetPath } from '../utils/assetPath';
import { gameStorage } from '../engine/GameStorage';
import { PlayerConfig } from '../config/PlayerConfig';
import { TechBlockRegistry, TechBlockInfo } from '../engine/TechBlockRegistry';

// Map HexBlockType to ItemType (what you get when mining)
function blockToItem(blockType: HexBlockType): ItemType {
  switch (blockType) {
    case HexBlockType.STONE: return ItemType.STONE;
    case HexBlockType.DIRT: return ItemType.DIRT;
    case HexBlockType.GRASS: return ItemType.DIRT; // Grass drops dirt, not grass
    case HexBlockType.WOOD: return ItemType.WOOD;
    case HexBlockType.SAND: return ItemType.SAND;
    // Mineral ores
    case HexBlockType.ORE_COAL: return ItemType.ORE_COAL;
    case HexBlockType.ORE_COPPER: return ItemType.ORE_COPPER;
    case HexBlockType.ORE_IRON: return ItemType.ORE_IRON;
    case HexBlockType.ORE_GOLD: return ItemType.ORE_GOLD;
    case HexBlockType.ORE_LITHIUM: return ItemType.ORE_LITHIUM;
    case HexBlockType.ORE_ALUMINUM: return ItemType.ORE_ALUMINUM;
    case HexBlockType.ORE_COBALT: return ItemType.ORE_COBALT;
    // Snow biome blocks
    case HexBlockType.SNOW: return ItemType.SNOW;
    case HexBlockType.DIRT_SNOW: return ItemType.DIRT; // Dirt with snow drops dirt
    case HexBlockType.ICE: return ItemType.ICE;
    default: return ItemType.NONE;
  }
}

// Map ItemType to HexBlockType (what block to place)
function itemToBlock(itemType: ItemType): HexBlockType {
  switch (itemType) {
    case ItemType.STONE: return HexBlockType.STONE;
    case ItemType.DIRT: return HexBlockType.DIRT;
    case ItemType.GRASS: return HexBlockType.DIRT; // Grass items place as dirt (grass isn't placeable)
    case ItemType.WOOD: return HexBlockType.WOOD;
    case ItemType.SAND: return HexBlockType.SAND;
    // Mineral ores can be placed back
    case ItemType.ORE_COAL: return HexBlockType.ORE_COAL;
    case ItemType.ORE_COPPER: return HexBlockType.ORE_COPPER;
    case ItemType.ORE_IRON: return HexBlockType.ORE_IRON;
    case ItemType.ORE_GOLD: return HexBlockType.ORE_GOLD;
    case ItemType.ORE_LITHIUM: return HexBlockType.ORE_LITHIUM;
    case ItemType.ORE_ALUMINUM: return HexBlockType.ORE_ALUMINUM;
    case ItemType.ORE_COBALT: return HexBlockType.ORE_COBALT;
    // Snow biome blocks can be placed
    case ItemType.SNOW: return HexBlockType.SNOW;
    case ItemType.ICE: return HexBlockType.ICE;
    default: return HexBlockType.AIR;
  }
}

export class PlanetBlockInteraction {
  private planets: Planet[];
  private player: PlanetPlayer;
  private scene: THREE.Scene;
  private raycaster: THREE.Raycaster;
  private inventory: Inventory;
  private craftingSystem: CraftingSystem;

  // Wireframe for targeted block
  private blockWireframe: THREE.LineSegments | null = null;
  private wireframeCache: { tileIndex: number; depth: number } | null = null; // Cache to avoid rebuilding every frame
  private wireframeVertPool: THREE.Vector3[] = []; // Reusable Vector3 pool for wireframe building
  private treeManager: PlanetTreeManager | null = null;

  // Torch system
  private heldTorch: HeldTorch | null = null;
  private torchManager: TorchManager;

  // Furnace system
  private furnaceManager: FurnaceManager;
  private furnaceUI: FurnaceUI;
  private miningFurnaceTarget: { furnace: PlacedFurnace } | null = null;

  // Storage system
  private storageChestManager: StorageChestManager;
  private garbagePileManager: GarbagePileManager;
  private storageUI: StorageUI;
  private miningStorageTarget: { chest: PlacedStorageChest } | null = null;
  private miningGarbageTarget: { pile: PlacedGarbagePile } | null = null;

  // Steam engine system
  private steamEngineManager: SteamEngineManager;
  private miningSteamEngineTarget: { steamEngine: PlacedSteamEngine } | null = null;

  // Hydro generator system
  private hydroGeneratorManager: HydroGeneratorManager;
  private hydroGeneratorUI: HydroGeneratorUI;
  private miningHydroGeneratorTarget: { hydroGenerator: PlacedHydroGenerator } | null = null;

  // Copper pipe system
  private copperPipeManager: CopperPipeManager;
  private copperPipeUI: CopperPipeUI;
  private steamEngineUI: SteamEngineUI;
  private miningCopperPipeTarget: { pipe: PlacedCopperPipe } | null = null;
  private pipeConnectionRebuildTimer: number = 0;
  private readonly PIPE_CONNECTION_REBUILD_INTERVAL = 1.0; // Rebuild connections every 1 second

  // Cable node system (for power connections)
  private cableNodeManager: CableNodeManager;
  private miningCableTarget: { cable: PlacedCable } | null = null;
  private cableConnectionRebuildTimer: number = 0;

  // Electric furnace system
  private electricFurnaceManager: ElectricFurnaceManager;
  private electricFurnaceUI: ElectricFurnaceUI;
  private miningElectricFurnaceTarget: { furnace: PlacedElectricFurnace } | null = null;

  private rightClickCooldown: number = 0;
  private readonly CLICK_COOLDOWN = 0.25;
  private readonly MAX_REACH = 8;

  // Mining state
  private miningTarget: { planet: Planet; tileIndex: number; depth: number; blockType: HexBlockType } | null = null;
  private miningTreeTarget: { mesh: THREE.Mesh; treeType: string } | null = null;
  private miningProgress: number = 0;
  private miningProgressContainer: HTMLElement | null = null;
  private miningProgressBar: HTMLElement | null = null;

  // Drag and drop state for hotbar
  private draggedSlotIndex: number | null = null;
  private dragGhost: HTMLElement | null = null;

  // Selection label state
  private selectionLabelTimeout: number | null = null;
  private selectionLabelElement: HTMLElement | null = null;

  constructor(planets: Planet[], player: PlanetPlayer, scene: THREE.Scene) {
    this.planets = planets;
    this.player = player;
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();
    this.inventory = new Inventory();

    // Initialize torch systems
    this.torchManager = new TorchManager(scene);
    this.heldTorch = new HeldTorch(player.camera, scene);

    // Initialize furnace systems with planet center and sun direction for lighting
    const earthPlanet = planets.find(p => p.radius > 50); // Earth has larger radius than moon
    const planetCenter = earthPlanet?.center || new THREE.Vector3(0, 0, 0);
    const sunDirection = new THREE.Vector3(
      PlayerConfig.SUN_DIRECTION.x,
      PlayerConfig.SUN_DIRECTION.y,
      PlayerConfig.SUN_DIRECTION.z
    ).normalize();
    this.furnaceManager = new FurnaceManager(scene, planetCenter, sunDirection);
    this.furnaceManager.setOnSmeltCompleteCallback(() => {
      // Save all furnace states when smelting completes (even when UI is closed)
      this.saveAllFurnaceStates();
    });
    this.furnaceUI = new FurnaceUI(this.inventory);
    this.furnaceUI.setOnCloseCallback(() => {
      // Furnace close is now handled by inventory menu close
    });
    this.furnaceUI.setOnSaveCallback(() => {
      this.saveInventory();
      this.saveAllFurnaceStates();
    });
    this.furnaceUI.setOnOpenInventoryCallback(() => {
      // Open the inventory menu when furnace is interacted with
      this.craftingSystem.open();
    });
    this.furnaceUI.setOnUpdateHotbarCallback(() => {
      this.updateHotbarUI();
    });
    this.furnaceUI.setOnUpdateInventoryCallback(() => {
      this.craftingSystem.updateInventorySlotsPublic();
    });

    // Initialize storage systems with planet center and sun direction for lighting
    this.storageChestManager = new StorageChestManager(scene, planetCenter, sunDirection);
    this.garbagePileManager = new GarbagePileManager(scene, planetCenter, sunDirection);

    // Initialize steam engine system
    this.steamEngineManager = new SteamEngineManager(scene, planetCenter, sunDirection);

    // Initialize hydro generator system
    this.hydroGeneratorManager = new HydroGeneratorManager(scene, planetCenter, sunDirection);
    this.hydroGeneratorUI = new HydroGeneratorUI();
    this.hydroGeneratorUI.setOnCloseCallback(() => {
      // Hydro generator close is handled by inventory menu close
    });
    this.hydroGeneratorUI.setOnOpenInventoryCallback(() => {
      this.craftingSystem.open();
    });

    // Initialize copper pipe system
    this.copperPipeManager = new CopperPipeManager(scene, planetCenter, sunDirection);
    this.copperPipeUI = new CopperPipeUI();
    this.copperPipeUI.setOnCloseCallback(() => {
      // Pipe UI close is handled by clicking elsewhere
    });

    // Initialize steam engine UI
    this.steamEngineUI = new SteamEngineUI();
    this.steamEngineUI.setInventory(this.inventory);
    this.steamEngineUI.setOnCloseCallback(() => {
      // Steam engine close is handled by inventory menu close
    });
    this.steamEngineUI.setOnOpenInventoryCallback(() => {
      this.craftingSystem.open();
    });
    this.steamEngineUI.setSaveCallback(() => {
      this.saveInventory();
      this.saveSteamEngineStates();
    });
    this.steamEngineUI.setUpdateHotbarCallback(() => {
      this.updateHotbarUI();
    });

    // Set up pipe connection callbacks
    this.copperPipeManager.setMachineCallbacks(
      (tileIndex) => this.hydroGeneratorManager.getHydroGeneratorAtTile(tileIndex),
      (tileIndex) => this.steamEngineManager.getSteamEngineAtTile(tileIndex),
      (tileIndex) => this.getNeighborTileIndices(tileIndex)
    );

    // Initialize cable node system (for power connections)
    this.cableNodeManager = new CableNodeManager(scene, planetCenter, sunDirection);
    this.cableNodeManager.setMachineCallbacks(
      (tileIndex) => this.steamEngineManager.getSteamEngineAtTile(tileIndex),
      (tileIndex) => this.electricFurnaceManager.getElectricFurnaceAtTile(tileIndex),
      (tileIndex) => this.getNeighborTileIndices(tileIndex)
    );

    // Initialize electric furnace system
    this.electricFurnaceManager = new ElectricFurnaceManager(scene, planetCenter, sunDirection);
    this.electricFurnaceManager.setOnSmeltCompleteCallback(() => {
      this.saveAllElectricFurnaceStates();
    });
    this.electricFurnaceUI = new ElectricFurnaceUI(this.inventory);
    this.electricFurnaceUI.setOnCloseCallback(() => {
      // Electric furnace close is handled by inventory menu close
    });
    this.electricFurnaceUI.setOnSaveCallback(() => {
      this.saveInventory();
      this.saveAllElectricFurnaceStates();
    });
    this.electricFurnaceUI.setOnOpenInventoryCallback(() => {
      this.craftingSystem.open();
    });
    this.electricFurnaceUI.setOnUpdateHotbarCallback(() => {
      this.updateHotbarUI();
    });
    this.electricFurnaceUI.setOnUpdateInventoryCallback(() => {
      this.craftingSystem.updateInventorySlotsPublic();
    });

    // Set up hydro generator connection callback
    this.hydroGeneratorUI.setConnectionCallback((hydroTileIndex) => {
      return this.copperPipeManager.isHydroConnectedToSteam(hydroTileIndex);
    });

    // Set up steam engine connection callbacks
    this.steamEngineUI.setConnectionCallbacks(
      (steamTileIndex) => this.copperPipeManager.getConnectedHydroGenerators(steamTileIndex),
      (hydroTileIndex) => {
        const hydro = this.hydroGeneratorManager.getHydroGeneratorAtTile(hydroTileIndex);
        return hydro?.isActive ? hydro.waterPumpedOut : 0;
      }
    );

    this.storageUI = new StorageUI(this.inventory);
    this.storageUI.setOnCloseCallback(() => {
      // Storage close is handled by inventory menu close
    });
    this.storageUI.setOnSaveCallback(() => {
      this.saveInventory();
      this.saveAllStorageStates();
    });
    this.storageUI.setOnOpenInventoryCallback(() => {
      this.craftingSystem.open();
    });
    this.storageUI.setOnUpdateHotbarCallback(() => {
      this.updateHotbarUI();
    });
    this.storageUI.setOnUpdateInventoryCallback(() => {
      this.craftingSystem.updateInventorySlotsPublic();
    });

    // Initialize crafting system with callbacks
    this.craftingSystem = new CraftingSystem(this.inventory);
    this.craftingSystem.setOnCloseCallback(() => {
      // Close all machine UIs when inventory closes
      this.furnaceUI.close();
      this.electricFurnaceUI.close();
      this.storageUI.close();
      this.hydroGeneratorUI.close();
      this.steamEngineUI.close();
      this.copperPipeUI.close();
      // Note: We don't request pointer lock here because:
      // 1. If closed via ESC, browser security prevents requestPointerLock during ESC handling
      // 2. The pause menu will show and user can click PLAY to resume
    });
    this.craftingSystem.setOnUpdateHotbarCallback(() => {
      this.updateHotbarUI();
    });
    this.craftingSystem.setOnSaveCallback(() => {
      this.saveInventory();
    });
    this.craftingSystem.setOnFurnaceDropCallback((targetSlotIndex, sourceSlotType) => {
      return this.furnaceUI.handleDropToInventory(targetSlotIndex, sourceSlotType);
    });
    this.craftingSystem.setOnElectricFurnaceDropCallback((targetSlotIndex, sourceSlotType) => {
      return this.electricFurnaceUI.handleDropToInventory(targetSlotIndex, sourceSlotType);
    });
    this.craftingSystem.setOnStorageDropCallback((targetSlotIndex, sourceSlotType) => {
      return this.storageUI.handleDropToInventory(targetSlotIndex, sourceSlotType);
    });

    // Set up tech block data callback for Shift+X debug
    this.player.setTechBlockDataCallback((tileIndices) => {
      const tileSet = new Set(tileIndices);
      return {
        torches: this.torchManager.getPlacedTorches()
          .filter(t => tileSet.has(t.tileIndex))
          .map(t => ({ tileIndex: t.tileIndex })),
        furnaces: this.furnaceManager.getPlacedFurnaces()
          .filter(f => tileSet.has(f.tileIndex))
          .map(f => ({ tileIndex: f.tileIndex })),
        steamEngines: this.steamEngineManager.getPlacedSteamEngines()
          .filter(s => tileSet.has(s.tileIndex))
          .map(s => ({ tileIndex: s.tileIndex })),
        hydroGenerators: this.hydroGeneratorManager.getPlacedHydroGenerators()
          .filter(h => tileSet.has(h.tileIndex))
          .map(h => ({ tileIndex: h.tileIndex })),
        copperPipes: this.copperPipeManager.getPlacedPipes()
          .filter(p => tileSet.has(p.tileIndex))
          .map(p => ({ tileIndex: p.tileIndex, depth: p.depth })),
      };
    });

    // Register tech blocks with the registry for F3 debug menu
    this.registerTechBlocksWithRegistry();

    this.createHighlightMesh();
    this.setupBlockSelection();
    this.setupMiningUI();
    this.setupHotbarDragDrop();
    this.selectionLabelElement = document.getElementById('hotbar-selection-label');
    this.updateHotbarUI();
  }

  private setupMiningUI(): void {
    this.miningProgressContainer = document.getElementById('mining-progress-container');
    this.miningProgressBar = document.getElementById('mining-progress-bar');
  }

  private setupHotbarDragDrop(): void {
    const slots = document.querySelectorAll('.hotbar-slot');
    slots.forEach((slotEl, index) => {
      const slot = slotEl as HTMLElement;
      slot.draggable = true;

      // Prevent image from being dragged separately
      const img = slot.querySelector('img');
      if (img) {
        img.draggable = false;
      }

      // Desktop drag and drop
      slot.addEventListener('dragstart', (e) => this.handleHotbarDragStart(e, index));
      slot.addEventListener('dragend', () => this.handleHotbarDragEnd());
      slot.addEventListener('dragover', (e) => this.handleHotbarDragOver(e));
      slot.addEventListener('dragleave', (e) => this.handleHotbarDragLeave(e));
      slot.addEventListener('drop', (e) => this.handleHotbarDrop(e, index));

      // Mobile: tap to select slot
      slot.addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.inventory.setSelectedSlot(index);
        this.updateHotbarUI();
        this.updateBlockTypeUI();
        this.showSelectionLabel();
      }, { passive: false });
    });
  }

  private handleHotbarDragStart(e: DragEvent, slotIndex: number): void {
    const slotData = this.inventory.getSlot(slotIndex);
    if (!slotData || slotData.itemType === ItemType.NONE) {
      e.preventDefault();
      return;
    }

    this.draggedSlotIndex = slotIndex;

    // Set drag data
    e.dataTransfer?.setData('text/plain', slotIndex.toString());
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = 'move';
    }

    // Mark the slot as being dragged
    const target = e.target as HTMLElement;
    target.classList.add('dragging');

    // Create custom drag image
    const ghost = document.createElement('div');
    ghost.className = 'drag-ghost';
    const itemData = ITEM_DATA[slotData.itemType];
    ghost.innerHTML = `<img src="${getAssetPath(itemData.texture)}" style="width:40px;height:40px;image-rendering:pixelated;">`;
    if (slotData.quantity > 1) {
      ghost.innerHTML += `<span class="ghost-count">${slotData.quantity}</span>`;
    }
    document.body.appendChild(ghost);
    this.dragGhost = ghost;

    ghost.style.position = 'fixed';
    ghost.style.top = '-100px';
    ghost.style.left = '-100px';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '9999';
    ghost.style.background = 'rgba(0,0,0,0.8)';
    ghost.style.border = '2px solid #4CAF50';
    ghost.style.borderRadius = '4px';
    ghost.style.padding = '4px';

    e.dataTransfer?.setDragImage(ghost, 25, 25);
  }

  private handleHotbarDragEnd(): void {
    this.draggedSlotIndex = null;

    // Remove dragging class from all slots
    document.querySelectorAll('.hotbar-slot.dragging').forEach(el => {
      el.classList.remove('dragging');
    });
    document.querySelectorAll('.hotbar-slot.drag-over').forEach(el => {
      el.classList.remove('drag-over');
    });

    // Remove ghost element
    if (this.dragGhost) {
      this.dragGhost.remove();
      this.dragGhost = null;
    }
  }

  private handleHotbarDragOver(e: DragEvent): void {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'move';
    }
    const target = e.currentTarget as HTMLElement;
    target.classList.add('drag-over');
  }

  private handleHotbarDragLeave(e: DragEvent): void {
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');
  }

  private handleHotbarDrop(e: DragEvent, targetSlotIndex: number): void {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;
    target.classList.remove('drag-over');

    // Check for storage drop
    const dragData = e.dataTransfer?.getData('text/plain');
    if (dragData && dragData.startsWith('storage:')) {
      const success = this.storageUI.handleDropToInventory(targetSlotIndex, dragData);
      if (success) {
        this.updateHotbarUI();
        this.craftingSystem.updateInventorySlots();
      }
      return;
    }

    // Check for furnace drop
    if (dragData && dragData.startsWith('furnace:')) {
      const sourceSlotType = dragData.substring('furnace:'.length);
      const success = this.furnaceUI.handleDropToInventory(targetSlotIndex, sourceSlotType);
      if (success) {
        this.updateHotbarUI();
        this.craftingSystem.updateInventorySlots();
      }
      return;
    }

    const sourceSlotIndex = this.draggedSlotIndex;
    if (sourceSlotIndex === null || sourceSlotIndex === targetSlotIndex) {
      return;
    }

    // Swap the slots
    this.inventory.swapSlots(sourceSlotIndex, targetSlotIndex);

    // Update UI
    this.updateHotbarUI();
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
        let tooltipEl = slotEl.querySelector('.item-tooltip') as HTMLElement;

        if (slot.itemType !== ItemType.NONE && slot.quantity > 0) {
          const itemData = ITEM_DATA[slot.itemType];
          if (img) {
            img.src = getAssetPath(itemData.texture);
            img.style.display = 'block';
            // Apply atlas region styling if present
            this.applyAtlasRegionStyle(img, itemData);
          }

          // Create or update count element
          if (!countEl) {
            countEl = document.createElement('span');
            countEl.className = 'item-count';
            slotEl.appendChild(countEl);
          }
          countEl.textContent = slot.quantity > 1 ? slot.quantity.toString() : '';

          // Create or update tooltip
          if (!tooltipEl) {
            tooltipEl = document.createElement('span');
            tooltipEl.className = 'item-tooltip';
            slotEl.appendChild(tooltipEl);
          }
          tooltipEl.textContent = itemData.name;
        } else {
          if (img) {
            img.style.display = 'none';
            // Reset atlas region styling
            img.style.objectFit = '';
            img.style.objectPosition = '';
          }
          if (countEl) countEl.textContent = '';
          // Remove tooltip for empty slots
          if (tooltipEl) tooltipEl.remove();
        }

        // Update selection
        slotEl.classList.toggle('selected', index === this.inventory.getSelectedSlot());
      }
    });
  }

  // Apply CSS styling to show only a portion of an atlas texture
  private applyAtlasRegionStyle(img: HTMLImageElement, itemData: typeof ITEM_DATA[ItemType]): void {
    if (itemData.atlasRegion) {
      const { x, y, width, height, atlasWidth, atlasHeight } = itemData.atlasRegion;
      // Calculate scale factors to show only the region we want
      const scaleX = atlasWidth / width;
      const scaleY = atlasHeight / height;
      // Object-fit: none prevents scaling, we'll use width/height to scale
      img.style.objectFit = 'none';
      // Position to show the correct region (negative offset for crop)
      img.style.objectPosition = `${-x * (40 / width)}px ${-y * (40 / height)}px`;
      // Scale the image so the region fills the img element
      img.style.width = `${40 * scaleX}px`;
      img.style.height = `${40 * scaleY}px`;
      // Use transform to scale it back down to fit in the slot
      img.style.transform = `scale(${1 / scaleX}, ${1 / scaleY})`;
      img.style.transformOrigin = 'top left';
    } else {
      // Reset to default for non-atlas textures
      img.style.objectFit = '';
      img.style.objectPosition = '';
      img.style.width = '40px';
      img.style.height = '40px';
      img.style.transform = '';
      img.style.transformOrigin = '';
    }
  }

  private showSelectionLabel(): void {
    const slot = this.inventory.getSelectedItem();
    if (!this.selectionLabelElement) return;

    // Clear any existing timeout
    if (this.selectionLabelTimeout !== null) {
      window.clearTimeout(this.selectionLabelTimeout);
      this.selectionLabelTimeout = null;
    }

    // Set the label text
    if (slot.itemType !== ItemType.NONE && slot.quantity > 0) {
      const itemData = ITEM_DATA[slot.itemType];
      this.selectionLabelElement.textContent = itemData.name;
    } else {
      this.selectionLabelElement.textContent = 'Empty';
    }

    // Show the label
    this.selectionLabelElement.classList.add('visible');

    // Hide after 5 seconds
    this.selectionLabelTimeout = window.setTimeout(() => {
      if (this.selectionLabelElement) {
        this.selectionLabelElement.classList.remove('visible');
      }
      this.selectionLabelTimeout = null;
    }, 5000);
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
  // Optimized: only rebuilds when target changes, reuses Vector3 objects
  private updateBlockWireframe(planet: Planet, tileIndex: number, depth: number): void {
    // Skip rebuild if target hasn't changed
    if (this.wireframeCache &&
        this.wireframeCache.tileIndex === tileIndex &&
        this.wireframeCache.depth === depth) {
      return;
    }

    const tile = planet.getTileByIndex(tileIndex);
    if (!tile || !this.blockWireframe) return;

    // Update cache
    this.wireframeCache = { tileIndex, depth };

    const blockHeight = planet.getBlockHeight();
    const outerRadius = planet.depthToRadius(depth);
    const innerRadius = outerRadius - blockHeight;

    const vertices: number[] = [];
    const numSides = tile.vertices.length;

    // Ensure we have enough reusable vectors (need 2 * numSides for inner + outer)
    const neededVectors = numSides * 2;
    while (this.wireframeVertPool.length < neededVectors) {
      this.wireframeVertPool.push(new THREE.Vector3());
    }

    // Reuse vectors for inner and outer vertices
    for (let i = 0; i < numSides; i++) {
      const v = tile.vertices[i];
      // Outer vertex (at index i)
      const outerVert = this.wireframeVertPool[i];
      outerVert.set(v.x, v.y, v.z).normalize().multiplyScalar(outerRadius).add(planet.center);
      // Inner vertex (at index numSides + i)
      const innerVert = this.wireframeVertPool[numSides + i];
      innerVert.set(v.x, v.y, v.z).normalize().multiplyScalar(innerRadius).add(planet.center);
    }

    // Top face edges (outer)
    for (let i = 0; i < numSides; i++) {
      const next = (i + 1) % numSides;
      const outerCurrent = this.wireframeVertPool[i];
      const outerNext = this.wireframeVertPool[next];
      vertices.push(outerCurrent.x, outerCurrent.y, outerCurrent.z);
      vertices.push(outerNext.x, outerNext.y, outerNext.z);
    }

    // Bottom face edges (inner)
    for (let i = 0; i < numSides; i++) {
      const next = (i + 1) % numSides;
      const innerCurrent = this.wireframeVertPool[numSides + i];
      const innerNext = this.wireframeVertPool[numSides + next];
      vertices.push(innerCurrent.x, innerCurrent.y, innerCurrent.z);
      vertices.push(innerNext.x, innerNext.y, innerNext.z);
    }

    // Vertical edges connecting top and bottom
    for (let i = 0; i < numSides; i++) {
      const outerVert = this.wireframeVertPool[i];
      const innerVert = this.wireframeVertPool[numSides + i];
      vertices.push(outerVert.x, outerVert.y, outerVert.z);
      vertices.push(innerVert.x, innerVert.y, innerVert.z);
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
        this.showSelectionLabel();
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

  /**
   * Update steam engine states and particles
   */
  private updateSteamEngineParticles(deltaTime: number): void {
    // Get all steam engine tile indices
    const steamEngines = this.steamEngineManager.getPlacedSteamEngines();
    const tileIndices = steamEngines.map(e => e.tileIndex);

    // Update all engine states (water connections, running state) independently of UI
    this.steamEngineUI.updateAllEngines(tileIndices);

    // Sync running state from UI to 3D particle system for each engine
    for (const engine of steamEngines) {
      const state = this.steamEngineUI.getEngineState(engine.tileIndex);
      const isRunning = state?.isRunning ?? false;
      this.steamEngineManager.setEngineRunning(engine.tileIndex, isRunning);
    }

    // Update particle simulation
    this.steamEngineManager.update(deltaTime);
  }

  public update(deltaTime: number, leftClick: boolean, rightClick: boolean, wheelDelta: number = 0): void {
    this.rightClickCooldown = Math.max(0, this.rightClickCooldown - deltaTime);

    // Handle mouse wheel for hotbar scrolling
    if (wheelDelta !== 0) {
      const currentSlot = this.inventory.getSelectedSlot();
      const hotbarSize = 9;
      // Scroll down (positive delta) = next slot, scroll up (negative delta) = previous slot
      const direction = wheelDelta > 0 ? 1 : -1;
      let newSlot = currentSlot + direction;
      // Wrap around
      if (newSlot < 0) newSlot = hotbarSize - 1;
      if (newSlot >= hotbarSize) newSlot = 0;
      this.inventory.setSelectedSlot(newSlot);
      this.updateHotbarUI();
      this.updateBlockTypeUI();
      this.showSelectionLabel();
    }

    // Update held torch visibility based on selected item
    const selectedItem = this.inventory.getSelectedItem();
    const holdingTorch = selectedItem.itemType === ItemType.TORCH && selectedItem.quantity > 0;
    if (this.heldTorch) {
      this.heldTorch.setVisible(holdingTorch);
      if (holdingTorch) {
        this.heldTorch.update(deltaTime);
      }
    }

    // Update placed torches (flicker animation)
    this.torchManager.update(deltaTime);

    // Update furnace smelting progress
    this.furnaceManager.update(deltaTime);

    // Update electric furnace smelting progress
    this.electricFurnaceManager.update(deltaTime);

    // Update steam engine particles and sync running state from UI
    this.updateSteamEngineParticles(deltaTime);

    // Periodically rebuild copper pipe connections (handles chunk loading/unloading)
    this.pipeConnectionRebuildTimer += deltaTime;
    if (this.pipeConnectionRebuildTimer >= this.PIPE_CONNECTION_REBUILD_INTERVAL) {
      this.pipeConnectionRebuildTimer = 0;
      this.copperPipeManager.rebuildAllConnections();
    }

    // Periodically rebuild cable connections and update electric furnace power status
    this.cableConnectionRebuildTimer += deltaTime;
    if (this.cableConnectionRebuildTimer >= this.PIPE_CONNECTION_REBUILD_INTERVAL) {
      this.cableConnectionRebuildTimer = 0;
      this.cableNodeManager.rebuildAllConnections();
      this.updateElectricFurnacePowerStatus();
    }

    // Update furnace, storage chest, garbage pile, and steam engine torch lighting based on nearby torches
    const torchData = this.torchManager.getTorchDataForBaking();
    if (torchData.length > 0) {
      const torchPositions = torchData.map(t => t.position);
      const torchRange = torchData[0].range;
      const torchIntensity = torchData[0].intensity;
      this.furnaceManager.updateTorchLighting(torchPositions, torchRange, torchIntensity);
      this.electricFurnaceManager.updateTorchLighting(torchPositions, torchRange, torchIntensity);
      this.storageChestManager.updateTorchLighting(torchPositions, torchRange, torchIntensity);
      this.garbagePileManager.updateTorchLighting(torchPositions, torchRange, torchIntensity);
      this.steamEngineManager.updateTorchLighting(torchPositions, torchRange, torchIntensity);
      this.hydroGeneratorManager.updateTorchLighting(torchPositions, torchRange, torchIntensity);
      this.copperPipeManager.updateTorchLighting(torchPositions, torchRange, torchIntensity);
      this.cableNodeManager.updateTorchLighting(torchPositions, torchRange, torchIntensity);
    }

    // Don't process block interaction when inventory menu is open
    if (this.craftingSystem.isMenuOpen()) {
      // Hide wireframe and reset mining when menu is open
      if (this.blockWireframe) {
        this.blockWireframe.visible = false;
        this.wireframeCache = null; // Clear cache so it rebuilds when shown again
      }
      this.resetMining();
      return;
    }

    // Raycast to find targeted block or tree
    const origin = this.player.getRaycastOrigin();
    const direction = this.player.getForwardVector();

    // First check for trees and torches using THREE.js raycaster
    this.raycaster.set(origin, direction);
    this.raycaster.far = this.MAX_REACH;

    // Get tree meshes from tree manager (avoids expensive scene traversal)
    const treeMeshes = this.treeManager?.getTreeMeshes() ?? [];
    // Get torch meshes for picking
    const torchMeshes = this.torchManager.getTorchMeshes();
    // Get furnace meshes for picking
    const furnaceMeshes = this.furnaceManager.getFurnaceMeshes();
    // Get storage chest and garbage pile meshes for picking
    const storageChestMeshes = this.storageChestManager.getChestMeshes();
    const garbagePileMeshes = this.garbagePileManager.getPileMeshes();
    // Get steam engine meshes for picking
    const steamEngineMeshes = this.steamEngineManager.getSteamEngineMeshes();
    // Get hydro generator meshes for picking
    const hydroGeneratorMeshes = this.hydroGeneratorManager.getHydroGeneratorMeshes();
    // Get copper pipe meshes for picking
    const copperPipeMeshes = this.copperPipeManager.getPipeMeshes();
    // Get cable meshes for picking
    const cableMeshes = this.cableNodeManager.getCableMeshes();
    // Get electric furnace meshes for picking
    const electricFurnaceMeshes = this.electricFurnaceManager.getElectricFurnaceMeshes();

    const treeIntersects = this.raycaster.intersectObjects(treeMeshes, false);
    const torchIntersects = this.raycaster.intersectObjects(torchMeshes, false);
    const furnaceIntersects = this.raycaster.intersectObjects(furnaceMeshes, false);
    const storageChestIntersects = this.raycaster.intersectObjects(storageChestMeshes, false);
    const garbagePileIntersects = this.raycaster.intersectObjects(garbagePileMeshes, false);
    const steamEngineIntersects = this.raycaster.intersectObjects(steamEngineMeshes, false);
    const hydroGeneratorIntersects = this.raycaster.intersectObjects(hydroGeneratorMeshes, false);
    const copperPipeIntersects = this.raycaster.intersectObjects(copperPipeMeshes, false);
    const cableIntersects = this.raycaster.intersectObjects(cableMeshes, false);
    const electricFurnaceIntersects = this.raycaster.intersectObjects(electricFurnaceMeshes, false);

    // Raycast against all planets and find the closest hit
    let closestBlockHit: ReturnType<Planet['raycast']> = null;
    let closestBlockPlanet: Planet | null = null;
    let closestBlockDistance = Infinity;

    for (const planet of this.planets) {
      const blockHit = planet.raycast(origin, direction, this.MAX_REACH);
      if (blockHit) {
        const distance = origin.distanceTo(blockHit.point);
        if (distance < closestBlockDistance) {
          closestBlockDistance = distance;
          closestBlockHit = blockHit;
          closestBlockPlanet = planet;
        }
      }
    }

    // Determine which hit is closer (tree, torch, furnace, storage, garbage pile, steam engine, hydro generator, copper pipe, or block)
    let hitTree = false;
    let hitBlock = false;
    let hitTorch = false;
    let hitFurnace = false;
    let hitStorageChest = false;
    let hitGarbagePile = false;
    let hitSteamEngine = false;
    let hitHydroGenerator = false;
    let hitCopperPipe = false;
    let hitCable = false;
    let hitElectricFurnace = false;
    let treeHit: THREE.Intersection | null = null;
    let torchHit: THREE.Intersection | null = null;
    let furnaceHit: THREE.Intersection | null = null;
    let storageChestHit: THREE.Intersection | null = null;
    let garbagePileHit: THREE.Intersection | null = null;
    let steamEngineHit: THREE.Intersection | null = null;
    let hydroGeneratorHit: THREE.Intersection | null = null;
    let copperPipeHit: THREE.Intersection | null = null;
    let cableHit: THREE.Intersection | null = null;
    let electricFurnaceHit: THREE.Intersection | null = null;

    // Find the closest hit among all types
    const treeDistance = treeIntersects.length > 0 ? treeIntersects[0].distance : Infinity;
    const torchDistance = torchIntersects.length > 0 ? torchIntersects[0].distance : Infinity;
    const furnaceDistance = furnaceIntersects.length > 0 ? furnaceIntersects[0].distance : Infinity;
    const storageChestDistance = storageChestIntersects.length > 0 ? storageChestIntersects[0].distance : Infinity;
    const garbagePileDistance = garbagePileIntersects.length > 0 ? garbagePileIntersects[0].distance : Infinity;
    const steamEngineDistance = steamEngineIntersects.length > 0 ? steamEngineIntersects[0].distance : Infinity;
    const hydroGeneratorDistance = hydroGeneratorIntersects.length > 0 ? hydroGeneratorIntersects[0].distance : Infinity;
    const copperPipeDistance = copperPipeIntersects.length > 0 ? copperPipeIntersects[0].distance : Infinity;
    const cableDistance = cableIntersects.length > 0 ? cableIntersects[0].distance : Infinity;
    const electricFurnaceDistance = electricFurnaceIntersects.length > 0 ? electricFurnaceIntersects[0].distance : Infinity;
    const closestObjectDistance = Math.min(treeDistance, torchDistance, furnaceDistance, storageChestDistance, garbagePileDistance, steamEngineDistance, hydroGeneratorDistance, copperPipeDistance, cableDistance, electricFurnaceDistance);

    if (closestBlockHit && closestBlockDistance < closestObjectDistance) {
      hitBlock = true;
    } else if (cableDistance <= closestObjectDistance && cableDistance < Infinity) {
      hitCable = true;
      cableHit = cableIntersects[0];
    } else if (electricFurnaceDistance <= closestObjectDistance && electricFurnaceDistance < Infinity) {
      hitElectricFurnace = true;
      electricFurnaceHit = electricFurnaceIntersects[0];
    } else if (copperPipeDistance <= closestObjectDistance && copperPipeDistance < Infinity) {
      hitCopperPipe = true;
      copperPipeHit = copperPipeIntersects[0];
    } else if (hydroGeneratorDistance <= closestObjectDistance && hydroGeneratorDistance < Infinity) {
      hitHydroGenerator = true;
      hydroGeneratorHit = hydroGeneratorIntersects[0];
    } else if (steamEngineDistance <= closestObjectDistance && steamEngineDistance < Infinity) {
      hitSteamEngine = true;
      steamEngineHit = steamEngineIntersects[0];
    } else if (storageChestDistance <= closestObjectDistance && storageChestDistance < Infinity) {
      hitStorageChest = true;
      storageChestHit = storageChestIntersects[0];
    } else if (garbagePileDistance <= closestObjectDistance && garbagePileDistance < Infinity) {
      hitGarbagePile = true;
      garbagePileHit = garbagePileIntersects[0];
    } else if (furnaceDistance <= torchDistance && furnaceDistance <= treeDistance && furnaceDistance < Infinity) {
      hitFurnace = true;
      furnaceHit = furnaceIntersects[0];
    } else if (torchDistance < treeDistance && torchDistance < Infinity) {
      hitTorch = true;
      torchHit = torchIntersects[0];
    } else if (treeDistance < Infinity) {
      hitTree = true;
      treeHit = treeIntersects[0];
    } else if (closestBlockHit) {
      hitBlock = true;
    }

    if (hitCable && cableHit) {
      // No wireframe for cables
      if (this.blockWireframe) {
        this.blockWireframe.visible = false;
        this.wireframeCache = null;
      }

      const cableMesh = cableHit.object as THREE.Mesh;
      const cable = this.cableNodeManager.getCableByMesh(cableMesh);

      // Handle cable interaction (left click to mine - cables don't have UI)
      if (leftClick && cable) {
        this.handleCableMining(deltaTime, cable);
      } else {
        this.resetMining();
      }
    } else if (hitElectricFurnace && electricFurnaceHit) {
      // No wireframe for electric furnaces
      if (this.blockWireframe) {
        this.blockWireframe.visible = false;
        this.wireframeCache = null;
      }

      const furnaceMesh = electricFurnaceHit.object as THREE.Mesh;
      const electricFurnace = this.electricFurnaceManager.getElectricFurnaceByMesh(furnaceMesh);

      // Handle electric furnace interaction (right click to open UI, left click to mine)
      if (rightClick && this.rightClickCooldown === 0 && electricFurnace) {
        this.electricFurnaceUI.open(electricFurnace);
        this.rightClickCooldown = this.CLICK_COOLDOWN;
      } else if (leftClick && electricFurnace) {
        this.handleElectricFurnaceMining(deltaTime, electricFurnace);
      } else {
        this.resetMining();
      }
    } else if (hitCopperPipe && copperPipeHit) {
      // No wireframe for copper pipes
      if (this.blockWireframe) {
        this.blockWireframe.visible = false;
        this.wireframeCache = null;
      }

      const pipeMesh = copperPipeHit.object as THREE.Mesh;
      const pipe = this.copperPipeManager.getPipeByMesh(pipeMesh);

      // Handle copper pipe interaction (right click to view network, left click to mine)
      if (rightClick && this.rightClickCooldown === 0 && pipe) {
        const network = this.copperPipeManager.getPipeNetwork(pipe.id);
        this.copperPipeUI.openPipe(pipe, network);
        this.rightClickCooldown = this.CLICK_COOLDOWN;
      } else if (leftClick && pipe) {
        this.handleCopperPipeMining(deltaTime, pipe);
      } else {
        this.resetMining();
      }
    } else if (hitHydroGenerator && hydroGeneratorHit) {
      // No wireframe for hydro generators
      if (this.blockWireframe) {
        this.blockWireframe.visible = false;
        this.wireframeCache = null;
      }

      const generatorMesh = hydroGeneratorHit.object as THREE.Mesh;
      const hydroGenerator = this.hydroGeneratorManager.getHydroGeneratorByMesh(generatorMesh);

      // Handle hydro generator interaction (right click to open UI, left click to mine)
      if (rightClick && this.rightClickCooldown === 0 && hydroGenerator) {
        this.hydroGeneratorUI.open(hydroGenerator);
        this.rightClickCooldown = this.CLICK_COOLDOWN;
      } else if (leftClick && hydroGenerator) {
        this.handleHydroGeneratorMining(deltaTime, hydroGenerator);
      } else {
        this.resetMining();
      }
    } else if (hitSteamEngine && steamEngineHit) {
      // No wireframe for steam engines
      if (this.blockWireframe) {
        this.blockWireframe.visible = false;
        this.wireframeCache = null;
      }

      const engineMesh = steamEngineHit.object as THREE.Mesh;
      const steamEngine = this.steamEngineManager.getSteamEngineByMesh(engineMesh);

      // Handle steam engine interaction (right click to open UI, left click to mine)
      if (rightClick && this.rightClickCooldown === 0 && steamEngine) {
        this.steamEngineUI.open(steamEngine);
        this.rightClickCooldown = this.CLICK_COOLDOWN;
      } else if (leftClick && steamEngine) {
        this.handleSteamEngineMining(deltaTime, steamEngine);
      } else {
        this.resetMining();
      }
    } else if (hitStorageChest && storageChestHit) {
      // No wireframe for storage chests
      if (this.blockWireframe) {
        this.blockWireframe.visible = false;
        this.wireframeCache = null;
      }

      const chestMesh = storageChestHit.object as THREE.Mesh;
      const chest = this.storageChestManager.getChestByMesh(chestMesh);

      // Handle storage chest interaction (right click to open, left click to mine)
      if (rightClick && this.rightClickCooldown === 0 && chest) {
        this.storageUI.open(chest);
        this.rightClickCooldown = this.CLICK_COOLDOWN;
      } else if (leftClick && chest) {
        this.handleStorageChestMining(deltaTime, chest);
      } else {
        this.resetMining();
      }
    } else if (hitGarbagePile && garbagePileHit) {
      // No wireframe for garbage piles
      if (this.blockWireframe) {
        this.blockWireframe.visible = false;
        this.wireframeCache = null;
      }

      const pileMesh = garbagePileHit.object as THREE.Mesh;
      const pile = this.garbagePileManager.getPileByMesh(pileMesh);

      // Handle garbage pile interaction (right click to open, left click to mine)
      if (rightClick && this.rightClickCooldown === 0 && pile) {
        this.storageUI.open(pile);
        this.rightClickCooldown = this.CLICK_COOLDOWN;
      } else if (leftClick && pile) {
        this.handleGarbagePileMining(deltaTime, pile);
      } else {
        this.resetMining();
      }
    } else if (hitFurnace && furnaceHit) {
      // No wireframe for furnaces
      if (this.blockWireframe) {
        this.blockWireframe.visible = false;
        this.wireframeCache = null;
      }

      const furnaceMesh = furnaceHit.object as THREE.Mesh;
      const furnace = this.furnaceManager.getFurnaceByMesh(furnaceMesh);

      // Handle furnace interaction (right click to open, left click to mine)
      if (rightClick && this.rightClickCooldown === 0 && furnace) {
        this.furnaceUI.open(furnace);
        this.rightClickCooldown = this.CLICK_COOLDOWN;
      } else if (leftClick && furnace) {
        this.handleFurnaceMining(deltaTime, furnace);
      } else {
        this.resetMining();
      }
    } else if (hitTorch && torchHit) {
      // No wireframe for torches
      if (this.blockWireframe) {
        this.blockWireframe.visible = false;
        this.wireframeCache = null;
      }

      // Handle torch picking (left click - instant removal, gives torch back)
      if (leftClick) {
        this.pickupTorch(torchHit.object as THREE.Mesh);
      }
      this.resetMining(); // No mining progress for torches
    } else if (hitTree && treeHit) {
      const hitObject = treeHit.object as THREE.Mesh;

      // No wireframe for trees
      if (this.blockWireframe) {
        this.blockWireframe.visible = false;
        this.wireframeCache = null;
      }

      const treeType = hitObject.userData.treeType as string; // 'trunk' or 'leaves'

      // Handle tree mining (left click held)
      if (leftClick) {
        this.handleTreeMining(deltaTime, hitObject, treeType);
      } else {
        this.resetMining();
      }
    } else if (hitBlock && closestBlockHit && closestBlockPlanet) {
      const { tileIndex, depth, blockType, prevTileIndex, prevDepth } = closestBlockHit;

      // Show wireframe around targeted block
      if (this.blockWireframe) {
        this.blockWireframe.visible = true;
        this.updateBlockWireframe(closestBlockPlanet, tileIndex, depth);
      }

      // Handle mining (left click held) - don't mine water (raycast already ignores water by default)
      if (leftClick && blockType !== HexBlockType.AIR) {
        this.handleMining(deltaTime, closestBlockPlanet, tileIndex, depth, blockType);
      } else {
        // Reset mining if not clicking or target changed
        this.resetMining();
      }

      // Handle block placing (right click)
      // Use the previous air block position for placement (supports horizontal placement)
      if (rightClick && this.rightClickCooldown === 0) {
        this.placeBlock(closestBlockPlanet, prevTileIndex, prevDepth);
        this.rightClickCooldown = this.CLICK_COOLDOWN;
      }
    } else {
      // Hide wireframe highlight
      if (this.blockWireframe) {
        this.blockWireframe.visible = false;
        this.wireframeCache = null;
      }
      this.resetMining();
    }
  }

  private handleMining(deltaTime: number, planet: Planet, tileIndex: number, depth: number, blockType: HexBlockType): void {
    // Check if target changed (different planet, tile, or depth)
    if (this.miningTarget === null ||
        this.miningTarget.planet !== planet ||
        this.miningTarget.tileIndex !== tileIndex ||
        this.miningTarget.depth !== depth) {
      // New target, reset progress
      this.miningTarget = { planet, tileIndex, depth, blockType };
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
      this.breakBlock(planet, tileIndex, depth, blockType);
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

    // Get mining time based on tree part (trunks drop logs, leaves drop leaves)
    const itemType = treeType === 'trunk' ? ItemType.LOG : ItemType.LEAVES;
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
    // Add items to inventory
    if (treeType === 'trunk') {
      // Trunks drop 4-8 logs AND 4-8 sticks
      const logCount = Math.floor(Math.random() * 5) + 4;  // 4-8 logs
      const stickCount = Math.floor(Math.random() * 5) + 4; // 4-8 sticks
      this.inventory.addItem(ItemType.LOG, logCount);
      this.inventory.addItem(ItemType.STICK, stickCount);
    } else {
      // Leaves drop 1-3 sticks
      const stickCount = Math.floor(Math.random() * 3) + 1;
      this.inventory.addItem(ItemType.STICK, stickCount);
    }
    this.updateHotbarUI();
    this.saveInventory();

    // Find and remove the tree group
    if (this.treeManager) {
      let parent = mesh.parent;
      while (parent && !(parent instanceof THREE.Group && parent.children.some(c => c.userData.isTree))) {
        parent = parent.parent;
      }
      if (parent instanceof THREE.Group) {
        // Save the removed tree's tile index to persist across sessions
        const tileIndex = parent.userData.tileIndex;
        if (tileIndex !== undefined) {
          // Trees are only on Earth for now
          gameStorage.saveRemovedTree('earth', tileIndex);
        }
        this.treeManager.removeTree(parent);
      }
    }
  }

  private handleFurnaceMining(deltaTime: number, furnace: PlacedFurnace): void {
    // Check if target changed
    if (this.miningFurnaceTarget === null || this.miningFurnaceTarget.furnace !== furnace) {
      // New target, reset progress
      this.miningFurnaceTarget = { furnace };
      this.miningTarget = null;
      this.miningTreeTarget = null;
      this.miningProgress = 0;
    }

    // Furnace mining time
    const mineTime = ITEM_DATA[ItemType.FURNACE].mineTime;

    // Increase progress
    this.miningProgress += deltaTime / mineTime;
    this.updateMiningUI(this.miningProgress);

    // Check if mining complete
    if (this.miningProgress >= 1) {
      this.breakFurnace(furnace);
      this.resetMining();
    }
  }

  private breakFurnace(furnace: PlacedFurnace): void {
    // Give the furnace item back to the player
    this.inventory.addItem(ItemType.FURNACE, 1);

    // Also return any items that were in the furnace
    if (furnace.smeltingItem !== null) {
      this.inventory.addItem(furnace.smeltingItem as ItemType, 1);
    }
    if (furnace.outputItem !== null && furnace.outputCount > 0) {
      this.inventory.addItem(furnace.outputItem as ItemType, furnace.outputCount);
    }
    // Convert fuel back to coal (approximately)
    if (furnace.fuelAmount > 0) {
      const coalToReturn = Math.ceil(furnace.fuelAmount / 8); // 8 smelts per coal
      this.inventory.addItem(ItemType.COAL, coalToReturn);
    }

    this.updateHotbarUI();
    this.saveInventory();

    // Remove furnace from save (find which planet it's on)
    for (let i = 0; i < this.planets.length; i++) {
      const planetId = i === 0 ? 'earth' : 'moon';
      gameStorage.removeFurnace(planetId, furnace.tileIndex);
    }

    // Remove the furnace from the world
    this.furnaceManager.removeFurnace(furnace);
  }

  private handleStorageChestMining(deltaTime: number, chest: PlacedStorageChest): void {
    // Check if target changed
    if (this.miningStorageTarget === null || this.miningStorageTarget.chest !== chest) {
      // New target, reset progress
      this.miningStorageTarget = { chest };
      this.miningTarget = null;
      this.miningTreeTarget = null;
      this.miningFurnaceTarget = null;
      this.miningGarbageTarget = null;
      this.miningProgress = 0;
    }

    // Storage chest mining time
    const mineTime = ITEM_DATA[ItemType.STORAGE_CHEST].mineTime;

    // Increase progress
    this.miningProgress += deltaTime / mineTime;
    this.updateMiningUI(this.miningProgress);

    // Check if mining complete
    if (this.miningProgress >= 1) {
      this.breakStorageChest(chest);
      this.resetMining();
    }
  }

  private breakStorageChest(chest: PlacedStorageChest): void {
    // Give the storage chest item back to the player
    this.inventory.addItem(ItemType.STORAGE_CHEST, 1);

    // Also return all items that were in the chest - overflow creates garbage pile
    const items = this.storageChestManager.getAllItemsFromChest(chest);
    const overflowItems: { itemType: ItemType; quantity: number }[] = [];

    for (const item of items) {
      const remaining = this.inventory.addItem(item.itemType, item.quantity);
      if (remaining > 0) {
        overflowItems.push({ itemType: item.itemType, quantity: remaining });
      }
    }

    this.updateHotbarUI();
    this.saveInventory();

    // Remove chest from save
    for (let i = 0; i < this.planets.length; i++) {
      const planetId = i === 0 ? 'earth' : 'moon';
      gameStorage.removeStorageChest(planetId, chest.tileIndex);
    }

    // If there's overflow, create a garbage pile at the same location
    if (overflowItems.length > 0) {
      this.createGarbagePileWithItems(chest.position.clone(), chest.tileIndex, overflowItems);
    }

    // Remove the chest from the world
    this.storageChestManager.removeChest(chest);
  }

  private handleGarbagePileMining(deltaTime: number, pile: PlacedGarbagePile): void {
    // Check if target changed
    if (this.miningGarbageTarget === null || this.miningGarbageTarget.pile !== pile) {
      // New target, reset progress
      this.miningGarbageTarget = { pile };
      this.miningTarget = null;
      this.miningTreeTarget = null;
      this.miningFurnaceTarget = null;
      this.miningStorageTarget = null;
      this.miningProgress = 0;
    }

    // Garbage pile mining time (quick)
    const mineTime = 0.5;

    // Increase progress
    this.miningProgress += deltaTime / mineTime;
    this.updateMiningUI(this.miningProgress);

    // Check if mining complete
    if (this.miningProgress >= 1) {
      this.breakGarbagePile(pile);
      this.resetMining();
    }
  }

  private breakGarbagePile(pile: PlacedGarbagePile): void {
    // Return all items that were in the pile - overflow creates new garbage pile
    const items = this.garbagePileManager.getAllItemsFromPile(pile);
    const overflowItems: { itemType: ItemType; quantity: number }[] = [];

    for (const item of items) {
      const remaining = this.inventory.addItem(item.itemType, item.quantity);
      if (remaining > 0) {
        overflowItems.push({ itemType: item.itemType, quantity: remaining });
      }
    }

    this.updateHotbarUI();
    this.saveInventory();

    // Remove pile from save
    for (let i = 0; i < this.planets.length; i++) {
      const planetId = i === 0 ? 'earth' : 'moon';
      gameStorage.removeGarbagePile(planetId, pile.tileIndex);
    }

    // Store position before removing
    const pilePosition = pile.position.clone();
    const pileTileIndex = pile.tileIndex;

    // Remove the pile from the world
    this.garbagePileManager.removePile(pile);

    // If there's overflow, create a new garbage pile at the same location
    if (overflowItems.length > 0) {
      this.createGarbagePileWithItems(pilePosition, pileTileIndex, overflowItems);
    }
  }

  private handleSteamEngineMining(deltaTime: number, steamEngine: PlacedSteamEngine): void {
    // Check if target changed
    if (this.miningSteamEngineTarget === null || this.miningSteamEngineTarget.steamEngine !== steamEngine) {
      // New target, reset progress
      this.miningSteamEngineTarget = { steamEngine };
      this.miningTarget = null;
      this.miningTreeTarget = null;
      this.miningFurnaceTarget = null;
      this.miningStorageTarget = null;
      this.miningGarbageTarget = null;
      this.miningProgress = 0;
    }

    // Steam engine mining time
    const mineTime = ITEM_DATA[ItemType.STEAM_ENGINE].mineTime;

    // Increase progress
    this.miningProgress += deltaTime / mineTime;
    this.updateMiningUI(this.miningProgress);

    // Check if mining complete
    if (this.miningProgress >= 1) {
      this.breakSteamEngine(steamEngine);
      this.resetMining();
    }
  }

  private breakSteamEngine(steamEngine: PlacedSteamEngine): void {
    // Give the steam engine item back to the player
    this.inventory.addItem(ItemType.STEAM_ENGINE, 1);

    this.updateHotbarUI();
    this.saveInventory();

    const tileIndex = steamEngine.tileIndex;

    // Remove steam engine from save
    for (let i = 0; i < this.planets.length; i++) {
      const planetId = i === 0 ? 'earth' : 'moon';
      gameStorage.removeSteamEngine(planetId, tileIndex);
    }

    // Remove the steam engine from the world
    this.steamEngineManager.removeSteamEngine(steamEngine);

    // Update nearby pipes to remove connection to this steam engine
    this.copperPipeManager.updatePipesNearTile(tileIndex);
  }

  private handleHydroGeneratorMining(deltaTime: number, hydroGenerator: PlacedHydroGenerator): void {
    // Check if target changed
    if (this.miningHydroGeneratorTarget === null || this.miningHydroGeneratorTarget.hydroGenerator !== hydroGenerator) {
      // New target, reset progress
      this.miningHydroGeneratorTarget = { hydroGenerator };
      this.miningTarget = null;
      this.miningTreeTarget = null;
      this.miningFurnaceTarget = null;
      this.miningStorageTarget = null;
      this.miningGarbageTarget = null;
      this.miningSteamEngineTarget = null;
      this.miningProgress = 0;
    }

    // Hydro generator mining time
    const mineTime = ITEM_DATA[ItemType.HYDRO_GENERATOR].mineTime;

    // Increase progress
    this.miningProgress += deltaTime / mineTime;
    this.updateMiningUI(this.miningProgress);

    // Check if mining complete
    if (this.miningProgress >= 1) {
      this.breakHydroGenerator(hydroGenerator);
      this.resetMining();
    }
  }

  private breakHydroGenerator(hydroGenerator: PlacedHydroGenerator): void {
    // Give the hydro generator item back to the player
    this.inventory.addItem(ItemType.HYDRO_GENERATOR, 1);

    this.updateHotbarUI();
    this.saveInventory();

    const tileIndex = hydroGenerator.tileIndex;

    // Remove hydro generator from save
    for (let i = 0; i < this.planets.length; i++) {
      const planetId = i === 0 ? 'earth' : 'moon';
      gameStorage.removeHydroGenerator(planetId, tileIndex);
    }

    // Remove the hydro generator from the world
    this.hydroGeneratorManager.removeHydroGenerator(hydroGenerator);

    // Update nearby pipes to remove connection to this hydro generator
    this.copperPipeManager.updatePipesNearTile(tileIndex);
  }

  private handleCopperPipeMining(deltaTime: number, pipe: PlacedCopperPipe): void {
    // Check if target changed
    if (this.miningCopperPipeTarget === null || this.miningCopperPipeTarget.pipe !== pipe) {
      // New target, reset progress
      this.miningCopperPipeTarget = { pipe };
      this.miningTarget = null;
      this.miningTreeTarget = null;
      this.miningFurnaceTarget = null;
      this.miningStorageTarget = null;
      this.miningGarbageTarget = null;
      this.miningSteamEngineTarget = null;
      this.miningHydroGeneratorTarget = null;
      this.miningProgress = 0;
    }

    // Copper pipe mining time
    const mineTime = ITEM_DATA[ItemType.COPPER_PIPE].mineTime;

    // Increase progress
    this.miningProgress += deltaTime / mineTime;
    this.updateMiningUI(this.miningProgress);

    // Check if mining complete
    if (this.miningProgress >= 1) {
      this.breakCopperPipe(pipe);
      this.resetMining();
    }
  }

  private breakCopperPipe(pipe: PlacedCopperPipe): void {
    // Give the copper pipe item back to the player
    this.inventory.addItem(ItemType.COPPER_PIPE, 1);

    this.updateHotbarUI();
    this.saveInventory();

    // Remove copper pipe from save
    for (let i = 0; i < this.planets.length; i++) {
      const planetId = i === 0 ? 'earth' : 'moon';
      gameStorage.removeCopperPipe(planetId, pipe.tileIndex, pipe.depth);
    }

    // Remove the copper pipe from the world
    this.copperPipeManager.removePipe(pipe);
  }

  private handleCableMining(deltaTime: number, cable: PlacedCable): void {
    // Check if target changed
    if (this.miningCableTarget === null || this.miningCableTarget.cable !== cable) {
      // New target, reset progress
      this.miningCableTarget = { cable };
      this.miningTarget = null;
      this.miningTreeTarget = null;
      this.miningFurnaceTarget = null;
      this.miningStorageTarget = null;
      this.miningGarbageTarget = null;
      this.miningSteamEngineTarget = null;
      this.miningHydroGeneratorTarget = null;
      this.miningCopperPipeTarget = null;
      this.miningElectricFurnaceTarget = null;
      this.miningProgress = 0;
    }

    // Cable mining time
    const mineTime = ITEM_DATA[ItemType.CABLE].mineTime;

    // Increase progress
    this.miningProgress += deltaTime / mineTime;
    this.updateMiningUI(this.miningProgress);

    // Check if mining complete
    if (this.miningProgress >= 1) {
      this.breakCable(cable);
      this.resetMining();
    }
  }

  private breakCable(cable: PlacedCable): void {
    // Give the cable item back to the player
    this.inventory.addItem(ItemType.CABLE, 1);

    this.updateHotbarUI();
    this.saveInventory();

    // Remove cable from save
    for (let i = 0; i < this.planets.length; i++) {
      const planetId = i === 0 ? 'earth' : 'moon';
      gameStorage.removeCable(planetId, cable.tileIndex, cable.depth);
    }

    // Remove the cable from the world
    this.cableNodeManager.removeCable(cable);
  }

  private handleElectricFurnaceMining(deltaTime: number, furnace: PlacedElectricFurnace): void {
    // Check if target changed
    if (this.miningElectricFurnaceTarget === null || this.miningElectricFurnaceTarget.furnace !== furnace) {
      // New target, reset progress
      this.miningElectricFurnaceTarget = { furnace };
      this.miningTarget = null;
      this.miningTreeTarget = null;
      this.miningFurnaceTarget = null;
      this.miningStorageTarget = null;
      this.miningGarbageTarget = null;
      this.miningSteamEngineTarget = null;
      this.miningHydroGeneratorTarget = null;
      this.miningCopperPipeTarget = null;
      this.miningCableTarget = null;
      this.miningProgress = 0;
    }

    // Electric furnace mining time
    const mineTime = ITEM_DATA[ItemType.ELECTRIC_FURNACE].mineTime;

    // Increase progress
    this.miningProgress += deltaTime / mineTime;
    this.updateMiningUI(this.miningProgress);

    // Check if mining complete
    if (this.miningProgress >= 1) {
      this.breakElectricFurnace(furnace);
      this.resetMining();
    }
  }

  private breakElectricFurnace(furnace: PlacedElectricFurnace): void {
    // Give the electric furnace item back to the player
    this.inventory.addItem(ItemType.ELECTRIC_FURNACE, 1);

    // If there are items in the furnace, drop them as a garbage pile or add to inventory
    const droppedItems: { itemType: ItemType; quantity: number }[] = [];

    if (furnace.smeltingItem !== null && furnace.inputCount > 0) {
      droppedItems.push({ itemType: furnace.smeltingItem, quantity: furnace.inputCount });
    }
    if (furnace.outputItem !== null && furnace.outputCount > 0) {
      droppedItems.push({ itemType: furnace.outputItem, quantity: furnace.outputCount });
    }

    // Try to add items to inventory first
    for (const item of droppedItems) {
      const remaining = this.inventory.addItem(item.itemType, item.quantity);
      if (remaining > 0) {
        // Create garbage pile with remaining items
        this.createGarbagePileWithItems(furnace.position, furnace.tileIndex, [{ itemType: item.itemType, quantity: remaining }]);
      }
    }

    this.updateHotbarUI();
    this.saveInventory();

    // Remove electric furnace from save
    for (let i = 0; i < this.planets.length; i++) {
      const planetId = i === 0 ? 'earth' : 'moon';
      gameStorage.removeElectricFurnace(planetId, furnace.tileIndex);
    }

    // Remove the electric furnace from the world
    this.electricFurnaceManager.removeElectricFurnace(furnace);
  }

  private async createGarbagePileWithItems(
    position: THREE.Vector3,
    tileIndex: number,
    items: { itemType: ItemType; quantity: number }[]
  ): Promise<void> {
    // Find the planet for this position
    let targetPlanet: Planet | null = null;
    for (const planet of this.planets) {
      const tile = planet.getTileByIndex(tileIndex);
      if (tile) {
        targetPlanet = planet;
        break;
      }
    }

    if (!targetPlanet) return;

    // Place the garbage pile
    const pile = await this.garbagePileManager.placePile(
      position,
      targetPlanet.center,
      tileIndex,
      items
    );

    if (pile) {
      const planetId = this.getPlanetId(targetPlanet);
      gameStorage.saveGarbagePile(planetId, tileIndex, {
        position: { x: pile.position.x, y: pile.position.y, z: pile.position.z },
        slots: pile.slots.map(s => ({ itemType: s.itemType, quantity: s.quantity }))
      });
    }
  }

  private resetMining(): void {
    this.miningTarget = null;
    this.miningTreeTarget = null;
    this.miningFurnaceTarget = null;
    this.miningStorageTarget = null;
    this.miningGarbageTarget = null;
    this.miningSteamEngineTarget = null;
    this.miningHydroGeneratorTarget = null;
    this.miningCopperPipeTarget = null;
    this.miningCableTarget = null;
    this.miningElectricFurnaceTarget = null;
    this.miningProgress = 0;
    this.updateMiningUI(0);
  }

  private breakBlock(planet: Planet, tileIndex: number, depth: number, blockType: HexBlockType): void {
    // Prevent mining the bottom-most block (bedrock layer) to avoid falling through the world
    // With depth 0 = bedrock, we prevent mining at depth 0
    if (depth <= 0) {
      return;
    }

    // Add item to inventory
    const itemType = blockToItem(blockType);
    if (itemType !== ItemType.NONE) {
      this.inventory.addItem(itemType, 1);
      this.updateHotbarUI();
      this.saveInventory();
    }

    // Save tile change
    const planetId = this.getPlanetId(planet);

    // Check if water can flow into this space from above or from neighbors
    let hasWaterSource = false;
    const maxDepth = planet.getMaxDepth();

    // First check: search upward in same column for water with clear path
    for (let d = depth + 1; d < maxDepth; d++) {
      const blockAtDepth = planet.getBlock(tileIndex, d);
      if (blockAtDepth === HexBlockType.WATER) {
        hasWaterSource = true;
        break;
      } else if (blockAtDepth !== HexBlockType.AIR) {
        // Hit solid block before finding water - can't flow from above
        break;
      }
    }

    // Second check: if no water above, check neighboring tiles for water at same depth or above
    // Water flows horizontally from neighbors if they have water at this depth level
    if (!hasWaterSource) {
      const neighbors = planet.getTileNeighbors(tileIndex);
      for (const neighborIndex of neighbors) {
        // Check if neighbor has water at the broken block's depth
        const neighborBlock = planet.getBlock(neighborIndex, depth);
        if (neighborBlock === HexBlockType.WATER) {
          hasWaterSource = true;
          break;
        }
        // Also check if neighbor has water directly above (at depth + 1) that could flow over
        const neighborBlockAbove = planet.getBlock(neighborIndex, depth + 1);
        if (neighborBlockAbove === HexBlockType.WATER) {
          hasWaterSource = true;
          break;
        }
      }
    }

    const newBlockType = hasWaterSource ? HexBlockType.WATER : HexBlockType.AIR;

    // Remove block from world (or fill with water if water above)
    planet.setBlock(tileIndex, depth, newBlockType);
    gameStorage.saveTileChange(planetId, tileIndex, depth, newBlockType);

    // If water flowed in, cascade it downward through any air blocks below
    if (newBlockType === HexBlockType.WATER) {
      for (let d = depth - 1; d > 0; d--) {
        const blockBelow = planet.getBlock(tileIndex, d);
        if (blockBelow === HexBlockType.AIR) {
          // Air block - water flows down into it
          planet.setBlock(tileIndex, d, HexBlockType.WATER);
          gameStorage.saveTileChange(planetId, tileIndex, d, HexBlockType.WATER);
        } else {
          // Hit solid ground or another block type, stop cascading
          break;
        }
      }
    }
  }

  private placeBlock(planet: Planet, tileIndex: number, depth: number): void {
    // Check bounds - depth must be within valid range (0 to MAX_DEPTH-1)
    // Depth 27 (MAX_DEPTH-1) is valid, depth 28+ (MAX_DEPTH+) is out of bounds
    if (depth < 0 || depth >= planet.getMaxDepth()) return;

    const selectedSlot = this.inventory.getSelectedItem();
    if (selectedSlot.itemType === ItemType.NONE || selectedSlot.quantity === 0) {
      return; // No item to place
    }

    // Handle torch placement separately
    if (selectedSlot.itemType === ItemType.TORCH) {
      this.placeTorch(planet, tileIndex, depth);
      return;
    }

    // Handle furnace placement separately
    if (selectedSlot.itemType === ItemType.FURNACE) {
      this.placeFurnace(planet, tileIndex, depth);
      return;
    }

    // Handle storage chest placement separately
    if (selectedSlot.itemType === ItemType.STORAGE_CHEST) {
      this.placeStorageChest(planet, tileIndex, depth);
      return;
    }

    // Handle steam engine placement separately
    if (selectedSlot.itemType === ItemType.STEAM_ENGINE) {
      this.placeSteamEngine(planet, tileIndex, depth);
      return;
    }

    // Handle hydro generator placement separately (must be on water)
    if (selectedSlot.itemType === ItemType.HYDRO_GENERATOR) {
      this.placeHydroGenerator(planet, tileIndex, depth);
      return;
    }

    // Handle copper pipe placement
    if (selectedSlot.itemType === ItemType.COPPER_PIPE) {
      this.placeCopperPipe(planet, tileIndex, depth);
      return;
    }

    // Handle cable placement
    if (selectedSlot.itemType === ItemType.CABLE) {
      this.placeCable(planet, tileIndex, depth);
      return;
    }

    // Handle electric furnace placement
    if (selectedSlot.itemType === ItemType.ELECTRIC_FURNACE) {
      this.placeElectricFurnace(planet, tileIndex, depth);
      return;
    }

    const blockType = itemToBlock(selectedSlot.itemType);
    if (blockType === HexBlockType.AIR) return;

    // Check if block would overlap with player's body
    // Player position is at FEET level, player occupies from feet to feet + PLAYER_HEIGHT
    const playerTile = planet.getTileAtPoint(this.player.position);
    if (playerTile && playerTile.index === tileIndex) {
      // Player is on the same tile - check vertical overlap
      const playerFeetRadius = this.player.position.distanceTo(planet.center);
      const playerHeadRadius = playerFeetRadius + 1.8; // PLAYER_HEIGHT

      // Block occupies from blockBottomRadius to blockTopRadius
      const blockTopRadius = planet.depthToRadius(depth);
      const blockBottomRadius = blockTopRadius - 1; // Block height is 1

      // Check if block overlaps with player's body (feet to head)
      // They overlap if: blockTop > playerFeet AND blockBottom < playerHead
      if (blockTopRadius > playerFeetRadius && blockBottomRadius < playerHeadRadius) {
        return; // Would place block inside player
      }
    }

    // Use item from inventory
    if (this.inventory.useSelectedItem()) {
      planet.setBlock(tileIndex, depth, blockType);
      this.updateHotbarUI();
      this.saveInventory();

      // Save tile change
      const planetId = this.getPlanetId(planet);
      gameStorage.saveTileChange(planetId, tileIndex, depth, blockType);
    }
  }

  private placeTorch(planet: Planet, tileIndex: number, depth: number): void {
    // Get the world position for the torch
    const tile = planet.getTileByIndex(tileIndex);
    if (!tile) return;

    // depth is the air block position - torch should sit on the solid block below it
    const solidBlockTopRadius = planet.depthToRadius(depth) - planet.getBlockHeight();
    const tileCenter = tile.center.clone().normalize();
    const worldPosition = tileCenter.multiplyScalar(solidBlockTopRadius).add(planet.center);

    // Use item from inventory
    if (this.inventory.useSelectedItem()) {
      // Place the torch mesh (no PointLight - causes shader recompilation spikes)
      this.torchManager.placeTorch(worldPosition, planet.center, tileIndex);

      this.updateHotbarUI();
      this.saveInventory();

      // Save torch placement
      const planetId = this.getPlanetId(planet);
      gameStorage.saveTorch(planetId, tileIndex, {
        x: worldPosition.x,
        y: worldPosition.y,
        z: worldPosition.z
      });

      // Update torch data for geometry worker (needed for vertex-baked lighting)
      const torchData = this.torchManager.getTorchDataForBaking();
      planet.setTorchData(torchData);
      // Also set tiles with torches for LOD vertex lighting (1 per tile, single tile range)
      planet.setTilesWithTorches(this.torchManager.getTilesWithTorches());

      // Trigger local mesh rebuild for vertex-baked torch lighting
      // Uses same path as block placement - fast incremental rebuild
      planet.markTilesNearTorchDirty(worldPosition, PlayerConfig.TORCH_LIGHT_RANGE);
    }
  }

  private async placeFurnace(planet: Planet, tileIndex: number, depth: number): Promise<void> {
    // Check if there's already a furnace at this tile
    if (this.furnaceManager.getFurnaceAtTile(tileIndex)) {
      return; // Can't place multiple furnaces on same tile
    }

    // Get the world position for the furnace
    const tile = planet.getTileByIndex(tileIndex);
    if (!tile) return;

    // depth is the air block position - furnace should sit on the solid block below it
    const solidBlockTopRadius = planet.depthToRadius(depth) - planet.getBlockHeight();
    const tileCenter = tile.center.clone().normalize();
    const worldPosition = tileCenter.multiplyScalar(solidBlockTopRadius).add(planet.center);

    // Get player forward direction for furnace facing
    const playerForward = this.player.getForwardVector();

    // Use item from inventory
    if (this.inventory.useSelectedItem()) {
      // Place the furnace facing the player
      const placedFurnace = await this.furnaceManager.placeFurnace(worldPosition, planet.center, tileIndex, playerForward);

      this.updateHotbarUI();
      this.saveInventory();

      // Save furnace placement to game storage
      if (placedFurnace) {
        const planetId = this.getPlanetId(planet);
        gameStorage.saveFurnace(planetId, tileIndex, {
          position: { x: placedFurnace.position.x, y: placedFurnace.position.y, z: placedFurnace.position.z },
          rotation: placedFurnace.rotation,
          fuelAmount: placedFurnace.fuelAmount,
          smeltingItem: placedFurnace.smeltingItem,
          smeltingProgress: placedFurnace.smeltingProgress,
          inputCount: placedFurnace.inputCount,
          outputItem: placedFurnace.outputItem,
          outputCount: placedFurnace.outputCount
        });
      }
    }
  }

  private async placeStorageChest(planet: Planet, tileIndex: number, depth: number): Promise<void> {
    // Check if there's already a chest at this tile
    if (this.storageChestManager.getChestAtTile(tileIndex)) {
      return; // Can't place multiple chests on same tile
    }

    // Check if there's already a garbage pile at this tile
    if (this.garbagePileManager.getPileAtTile(tileIndex)) {
      return; // Can't place chest where garbage pile exists
    }

    // Get the world position for the chest
    const tile = planet.getTileByIndex(tileIndex);
    if (!tile) return;

    // depth is the air block position - chest should sit on the solid block below it
    const solidBlockTopRadius = planet.depthToRadius(depth) - planet.getBlockHeight();
    const tileCenter = tile.center.clone().normalize();
    const worldPosition = tileCenter.multiplyScalar(solidBlockTopRadius).add(planet.center);

    // Get player forward direction for chest facing
    const playerForward = this.player.getForwardVector();

    // Use item from inventory
    if (this.inventory.useSelectedItem()) {
      // Place the chest facing the player
      const placedChest = await this.storageChestManager.placeChest(worldPosition, planet.center, tileIndex, playerForward);

      this.updateHotbarUI();
      this.saveInventory();

      // Save chest placement to game storage
      if (placedChest) {
        const planetId = this.getPlanetId(planet);
        gameStorage.saveStorageChest(planetId, tileIndex, {
          position: { x: placedChest.position.x, y: placedChest.position.y, z: placedChest.position.z },
          rotation: placedChest.rotation,
          slots: placedChest.slots.map(s => ({ itemType: s.itemType, quantity: s.quantity }))
        });
      }
    }
  }

  private async placeSteamEngine(planet: Planet, tileIndex: number, depth: number): Promise<void> {
    // Check if there's already a steam engine at this tile
    if (this.steamEngineManager.getSteamEngineAtTile(tileIndex)) {
      return; // Can't place multiple steam engines on same tile
    }

    // Check if there's already a furnace at this tile
    if (this.furnaceManager.getFurnaceAtTile(tileIndex)) {
      return; // Can't place steam engine where furnace exists
    }

    // Check if there's already a storage chest at this tile
    if (this.storageChestManager.getChestAtTile(tileIndex)) {
      return; // Can't place steam engine where chest exists
    }

    // Check if there's already a garbage pile at this tile
    if (this.garbagePileManager.getPileAtTile(tileIndex)) {
      return; // Can't place steam engine where garbage pile exists
    }

    // Get the world position for the steam engine
    const tile = planet.getTileByIndex(tileIndex);
    if (!tile) return;

    // depth is the air block position - steam engine should sit on the solid block below it
    const solidBlockTopRadius = planet.depthToRadius(depth) - planet.getBlockHeight();
    const tileCenter = tile.center.clone().normalize();
    const worldPosition = tileCenter.multiplyScalar(solidBlockTopRadius).add(planet.center);

    // Get player forward direction for steam engine facing
    const playerForward = this.player.getForwardVector();

    // Use item from inventory
    if (this.inventory.useSelectedItem()) {
      // Place the steam engine facing the player
      const placedSteamEngine = await this.steamEngineManager.placeSteamEngine(worldPosition, planet.center, tileIndex, playerForward);

      this.updateHotbarUI();
      this.saveInventory();

      // Save steam engine placement to game storage
      if (placedSteamEngine) {
        const planetId = this.getPlanetId(planet);
        gameStorage.saveSteamEngine(planetId, tileIndex, {
          position: { x: placedSteamEngine.position.x, y: placedSteamEngine.position.y, z: placedSteamEngine.position.z },
          rotation: placedSteamEngine.rotation,
          hasFuel: false,
          fuelAmount: 0,
        });

        // Update nearby pipes to show connection to this steam engine
        this.copperPipeManager.updatePipesNearTile(tileIndex);
      }
    }
  }

  private async placeHydroGenerator(planet: Planet, tileIndex: number, depth: number): Promise<void> {
    // Check if there's already a hydro generator at this tile
    if (this.hydroGeneratorManager.getHydroGeneratorAtTile(tileIndex)) {
      return; // Can't place multiple hydro generators on same tile
    }

    // Check if there's already other tech blocks at this tile
    if (this.furnaceManager.getFurnaceAtTile(tileIndex)) {
      return;
    }
    if (this.storageChestManager.getChestAtTile(tileIndex)) {
      return;
    }
    if (this.garbagePileManager.getPileAtTile(tileIndex)) {
      return;
    }
    if (this.steamEngineManager.getSteamEngineAtTile(tileIndex)) {
      return;
    }

    // Get the tile
    const tile = planet.getTileByIndex(tileIndex);
    if (!tile) return;

    const maxDepth = planet.getMaxDepth();

    // Check what block was clicked - either solid ground underwater, or air above water
    const clickedBlock = planet.getBlock(tileIndex, depth);

    let waterSurfaceDepth: number;
    let waterDepthBlocks: number;
    let solidGroundDepth: number;

    // Case 1: Clicked on solid ground - check if there's water above it
    if (clickedBlock !== HexBlockType.AIR && clickedBlock !== HexBlockType.WATER) {
      // Scan upward from clicked solid block to find water column
      solidGroundDepth = depth;
      let foundWater = false;
      let foundSurface = false;

      // Check the block directly above the solid ground
      for (let d = depth + 1; d < maxDepth; d++) {
        const blockAbove = planet.getBlock(tileIndex, d);
        if (blockAbove === HexBlockType.WATER) {
          foundWater = true;
        } else if (blockAbove === HexBlockType.AIR) {
          if (foundWater) {
            // Found air above water - this is the water surface
            waterSurfaceDepth = d;
            foundSurface = true;
          }
          break;
        } else {
          // Hit something solid other than water before finding surface
          break;
        }
      }

      if (!foundWater || !foundSurface) {
        return; // No water above or no surface - can't place hydro generator
      }

      // Calculate water depth from surface down to solid ground
      waterDepthBlocks = waterSurfaceDepth! - solidGroundDepth - 1;
      if (waterDepthBlocks <= 0) {
        return; // No water depth
      }
    }
    // Case 2: Clicked on air above water (original behavior)
    else if (clickedBlock === HexBlockType.AIR) {
      const blockBelow = planet.getBlock(tileIndex, depth - 1);
      if (blockBelow !== HexBlockType.WATER) {
        return; // Can only place on water
      }

      waterSurfaceDepth = depth;

      // Calculate water depth - count how many water blocks are below
      waterDepthBlocks = 0;
      for (let d = depth - 1; d >= 0; d--) {
        const block = planet.getBlock(tileIndex, d);
        if (block === HexBlockType.WATER) {
          waterDepthBlocks++;
        } else {
          solidGroundDepth = d;
          break; // Hit solid ground
        }
      }
    }
    // Case 3: Clicked on water block itself
    else if (clickedBlock === HexBlockType.WATER) {
      // Find water surface by scanning up
      waterSurfaceDepth = depth;
      for (let d = depth + 1; d < maxDepth; d++) {
        const blockAbove = planet.getBlock(tileIndex, d);
        if (blockAbove === HexBlockType.AIR) {
          waterSurfaceDepth = d;
          break;
        } else if (blockAbove !== HexBlockType.WATER) {
          return; // Water is capped by something solid, can't place
        }
      }

      // Find solid ground by scanning down
      waterDepthBlocks = 0;
      for (let d = waterSurfaceDepth - 1; d >= 0; d--) {
        const block = planet.getBlock(tileIndex, d);
        if (block === HexBlockType.WATER) {
          waterDepthBlocks++;
        } else {
          solidGroundDepth = d;
          break;
        }
      }

      if (waterDepthBlocks <= 0) {
        return; // No water depth
      }
    }
    else {
      return; // Unknown block type
    }

    // Position hydro generator at water surface (air block above water)
    const waterSurfaceRadius = planet.depthToRadius(waterSurfaceDepth!) - planet.getBlockHeight();
    const tileCenter = tile.center.clone().normalize();
    const worldPosition = tileCenter.multiplyScalar(waterSurfaceRadius).add(planet.center);

    // Get player forward direction for facing
    const playerForward = this.player.getForwardVector();

    // Use item from inventory
    if (this.inventory.useSelectedItem()) {
      // Place the hydro generator
      const placedHydroGenerator = await this.hydroGeneratorManager.placeHydroGenerator(
        worldPosition,
        planet.center,
        tileIndex,
        waterDepthBlocks! * planet.getBlockHeight(), // Convert block count to world units
        playerForward
      );

      this.updateHotbarUI();
      this.saveInventory();

      // Save hydro generator placement to game storage
      if (placedHydroGenerator) {
        const planetId = this.getPlanetId(planet);
        gameStorage.saveHydroGenerator(planetId, tileIndex, {
          position: { x: placedHydroGenerator.position.x, y: placedHydroGenerator.position.y, z: placedHydroGenerator.position.z },
          rotation: placedHydroGenerator.rotation,
          waterDepth: placedHydroGenerator.waterDepth
        });

        // Update nearby pipes to show connection to this hydro generator
        this.copperPipeManager.updatePipesNearTile(tileIndex);
      }
    }
  }

  private async placeCopperPipe(planet: Planet, tileIndex: number, depth: number): Promise<void> {
    // Get the tile
    const tile = planet.getTileByIndex(tileIndex);
    if (!tile) return;

    const maxDepth = planet.getMaxDepth();
    const clickedBlock = planet.getBlock(tileIndex, depth);

    // Determine the actual placement depth - pipes can't be placed underwater
    // If clicked on water or solid underwater, find water surface
    let placementDepth = depth;
    let placementRadius: number;

    // Case 1: Clicked on water - find water surface
    if (clickedBlock === HexBlockType.WATER) {
      // Find water surface by scanning up
      let waterSurfaceDepth = depth;
      for (let d = depth + 1; d < maxDepth; d++) {
        const blockAbove = planet.getBlock(tileIndex, d);
        if (blockAbove === HexBlockType.AIR) {
          waterSurfaceDepth = d;
          break;
        } else if (blockAbove !== HexBlockType.WATER) {
          return; // Water is capped by something solid, can't place
        }
      }
      placementDepth = waterSurfaceDepth;
      // Position at water surface (air block above water)
      placementRadius = planet.depthToRadius(placementDepth) - planet.getBlockHeight();
    }
    // Case 2: Clicked on solid block underwater - find water surface above
    else if (clickedBlock !== HexBlockType.AIR) {
      // Check if there's water above
      let foundWater = false;
      let waterSurfaceDepth = depth;
      for (let d = depth + 1; d < maxDepth; d++) {
        const blockAbove = planet.getBlock(tileIndex, d);
        if (blockAbove === HexBlockType.WATER) {
          foundWater = true;
        } else if (blockAbove === HexBlockType.AIR) {
          if (foundWater) {
            // Found air above water - this is the water surface
            waterSurfaceDepth = d;
          }
          break;
        } else {
          // Hit something solid other than water
          break;
        }
      }

      if (foundWater) {
        // Place at water surface
        placementDepth = waterSurfaceDepth;
        placementRadius = planet.depthToRadius(placementDepth) - planet.getBlockHeight();
      } else {
        // No water above - place on top of solid block as normal
        placementRadius = planet.depthToRadius(depth) - planet.getBlockHeight();
      }
    }
    // Case 3: Clicked on air above water
    else if (clickedBlock === HexBlockType.AIR) {
      const blockBelow = planet.getBlock(tileIndex, depth - 1);
      if (blockBelow === HexBlockType.WATER) {
        // Clicked on air directly above water - place here
        placementDepth = depth;
        placementRadius = planet.depthToRadius(placementDepth) - planet.getBlockHeight();
      } else {
        // Air above solid ground - place on the ground
        placementRadius = planet.depthToRadius(depth) - planet.getBlockHeight();
      }
    }
    else {
      // Default case
      placementRadius = planet.depthToRadius(depth) - planet.getBlockHeight();
    }

    // Check if there's already a pipe at the placement location
    if (this.copperPipeManager.getPipeAt(tileIndex, placementDepth)) {
      return;
    }

    // Get world position for the pipe
    const tileCenter = tile.center.clone().normalize();
    const worldPosition = tileCenter.multiplyScalar(placementRadius).add(planet.center);

    // Use item from inventory
    if (this.inventory.useSelectedItem()) {
      // Place the pipe
      const placedPipe = await this.copperPipeManager.placePipe(
        worldPosition,
        tileIndex,
        placementDepth
      );

      this.updateHotbarUI();
      this.saveInventory();

      // Save pipe placement to game storage
      if (placedPipe) {
        const planetId = this.getPlanetId(planet);
        gameStorage.saveCopperPipe(planetId, tileIndex, placementDepth, {
          position: { x: placedPipe.position.x, y: placedPipe.position.y, z: placedPipe.position.z }
        });
      }
    }
  }

  private async placeCable(planet: Planet, tileIndex: number, depth: number): Promise<void> {
    // Get the tile
    const tile = planet.getTileByIndex(tileIndex);
    if (!tile) return;

    const maxDepth = planet.getMaxDepth();
    const clickedBlock = planet.getBlock(tileIndex, depth);

    // Cables work similar to pipes - can be placed on surfaces
    let placementDepth = depth;
    let placementRadius: number;

    // If clicked on water - find water surface
    if (clickedBlock === HexBlockType.WATER) {
      let waterSurfaceDepth = depth;
      for (let d = depth + 1; d < maxDepth; d++) {
        const blockAbove = planet.getBlock(tileIndex, d);
        if (blockAbove === HexBlockType.AIR) {
          waterSurfaceDepth = d;
          break;
        } else if (blockAbove !== HexBlockType.WATER) {
          return; // Water is capped by something solid, can't place
        }
      }
      placementDepth = waterSurfaceDepth;
      placementRadius = planet.depthToRadius(placementDepth) - planet.getBlockHeight();
    }
    // Clicked on solid block - place on top
    else if (clickedBlock !== HexBlockType.AIR) {
      placementRadius = planet.depthToRadius(depth) - planet.getBlockHeight();
    }
    // Clicked on air
    else {
      placementRadius = planet.depthToRadius(depth) - planet.getBlockHeight();
    }

    // Check if there's already a cable at the placement location
    if (this.cableNodeManager.getCableAt(tileIndex, placementDepth)) {
      return;
    }

    // Get world position for the cable
    const tileCenter = tile.center.clone().normalize();
    const worldPosition = tileCenter.multiplyScalar(placementRadius).add(planet.center);

    // Use item from inventory
    if (this.inventory.useSelectedItem()) {
      // Place the cable
      const placedCable = await this.cableNodeManager.placeCable(
        worldPosition,
        tileIndex,
        placementDepth
      );

      this.updateHotbarUI();
      this.saveInventory();

      // Save cable placement to game storage
      if (placedCable) {
        const planetId = this.getPlanetId(planet);
        gameStorage.saveCable(planetId, tileIndex, placementDepth, {
          position: { x: placedCable.position.x, y: placedCable.position.y, z: placedCable.position.z }
        });
      }
    }
  }

  private async placeElectricFurnace(planet: Planet, tileIndex: number, depth: number): Promise<void> {
    // Check if there's already an electric furnace at this tile
    if (this.electricFurnaceManager.getElectricFurnaceAtTile(tileIndex)) {
      return; // Can't place multiple electric furnaces on same tile
    }

    // Also check for regular furnace
    if (this.furnaceManager.getFurnaceAtTile(tileIndex)) {
      return; // Can't place where regular furnace exists
    }

    // Get the world position for the furnace
    const tile = planet.getTileByIndex(tileIndex);
    if (!tile) return;

    // depth is the air block position - furnace should sit on the solid block below it
    const solidBlockTopRadius = planet.depthToRadius(depth) - planet.getBlockHeight();
    const tileCenter = tile.center.clone().normalize();
    const worldPosition = tileCenter.multiplyScalar(solidBlockTopRadius).add(planet.center);

    // Get player forward direction for furnace facing
    const playerForward = this.player.getForwardVector();

    // Use item from inventory
    if (this.inventory.useSelectedItem()) {
      // Place the electric furnace facing the player
      const placedFurnace = await this.electricFurnaceManager.placeElectricFurnace(worldPosition, planet.center, tileIndex, playerForward);

      this.updateHotbarUI();
      this.saveInventory();

      // Save electric furnace placement to game storage
      if (placedFurnace) {
        const planetId = this.getPlanetId(planet);
        gameStorage.saveElectricFurnace(planetId, tileIndex, {
          position: { x: placedFurnace.position.x, y: placedFurnace.position.y, z: placedFurnace.position.z },
          rotation: placedFurnace.rotation,
          smeltingItem: placedFurnace.smeltingItem,
          smeltingProgress: placedFurnace.smeltingProgress,
          inputCount: placedFurnace.inputCount,
          outputItem: placedFurnace.outputItem,
          outputCount: placedFurnace.outputCount
        });
      }
    }
  }

  private pickupTorch(mesh: THREE.Mesh): void {
    // Find the torch group containing this mesh
    let parent = mesh.parent;
    while (parent && !(parent instanceof THREE.Group)) {
      parent = parent.parent;
    }

    if (parent instanceof THREE.Group) {
      // Find the PlacedTorch object by matching the group
      const placedTorches = this.torchManager.getPlacedTorches();
      const torch = placedTorches.find(t => t.group === parent);

      if (torch) {
        // Save position before removing (needed for mesh rebuild)
        const torchPosition = torch.position.clone();

        // Remove torch from save before removing from scene
        gameStorage.removeTorch({
          x: torch.position.x,
          y: torch.position.y,
          z: torch.position.z
        });

        // Remove the torch mesh
        this.torchManager.removeTorch(torch);

        // Give the torch back to the player
        this.inventory.addItem(ItemType.TORCH, 1);
        this.updateHotbarUI();
        this.saveInventory();

        // Update torch data for geometry worker (needed for vertex-baked lighting)
        const torchData = this.torchManager.getTorchDataForBaking();
        const tilesWithTorches = this.torchManager.getTilesWithTorches();

        // Trigger local mesh rebuild for vertex-baked lighting update
        // Uses same path as block placement - fast incremental rebuild
        for (const planet of this.planets) {
          planet.setTorchData(torchData);
          planet.setTilesWithTorches(tilesWithTorches);
          planet.markTilesNearTorchDirty(torchPosition, PlayerConfig.TORCH_LIGHT_RANGE);
        }
      }
    }
  }

  public getInventory(): Inventory {
    return this.inventory;
  }

  public getCraftingSystem(): CraftingSystem {
    return this.craftingSystem;
  }

  public getTorchManager(): TorchManager {
    return this.torchManager;
  }

  public setTreeManager(treeManager: PlanetTreeManager): void {
    this.treeManager = treeManager;
  }

  // Get planet ID for saving (identifies which planet)
  private getPlanetId(planet: Planet): string {
    const index = this.planets.indexOf(planet);
    return index === 0 ? 'earth' : 'moon';
  }

  // Get neighbor tile indices for pipe connection detection
  private getNeighborTileIndices(tileIndex: number): number[] {
    // Find which planet has this tile
    for (const planet of this.planets) {
      const tile = planet.getTileByIndex(tileIndex);
      if (tile && tile.neighbors) {
        // neighbors is already an array of tile indices (numbers)
        return tile.neighbors as number[];
      }
    }
    return [];
  }

  // Save inventory to local storage
  private saveInventory(): void {
    gameStorage.saveInventory(this.inventory.exportForSave());
  }

  // Save all steam engine states (fuel) to local storage
  private saveSteamEngineStates(): void {
    const steamEngines = this.steamEngineManager.getPlacedSteamEngines();
    for (const engine of steamEngines) {
      // Determine which planet this engine is on
      let planetId = 'earth';
      for (let i = 0; i < this.planets.length; i++) {
        const planet = this.planets[i];
        const tile = planet.getTileByIndex(engine.tileIndex);
        if (tile) {
          planetId = i === 0 ? 'earth' : 'moon';
          break;
        }
      }

      // Get fuel state from UI
      const state = this.steamEngineUI.getEngineState(engine.tileIndex);

      gameStorage.saveSteamEngine(planetId, engine.tileIndex, {
        position: { x: engine.position.x, y: engine.position.y, z: engine.position.z },
        rotation: engine.rotation,
        hasFuel: state?.hasFuel ?? false,
        fuelAmount: state?.fuelAmount ?? 0,
      });
    }
  }

  // Save all furnace states to local storage
  private saveAllFurnaceStates(): void {
    const furnaces = this.furnaceManager.getPlacedFurnaces();
    for (const furnace of furnaces) {
      // Determine which planet this furnace is on (by checking if position is closer to earth or moon center)
      let planetId = 'earth';
      for (let i = 0; i < this.planets.length; i++) {
        const planet = this.planets[i];
        // Check if furnace tile exists on this planet
        const tile = planet.getTileByIndex(furnace.tileIndex);
        if (tile) {
          planetId = i === 0 ? 'earth' : 'moon';
          break;
        }
      }

      gameStorage.saveFurnace(planetId, furnace.tileIndex, {
        position: { x: furnace.position.x, y: furnace.position.y, z: furnace.position.z },
        rotation: furnace.rotation,
        fuelAmount: furnace.fuelAmount,
        smeltingItem: furnace.smeltingItem,
        smeltingProgress: furnace.smeltingProgress,
        inputCount: furnace.inputCount,
        outputItem: furnace.outputItem,
        outputCount: furnace.outputCount
      });
    }
  }

  // Save all electric furnace states to local storage
  private saveAllElectricFurnaceStates(): void {
    const furnaces = this.electricFurnaceManager.getPlacedElectricFurnaces();
    for (const furnace of furnaces) {
      let planetId = 'earth';
      for (let i = 0; i < this.planets.length; i++) {
        const planet = this.planets[i];
        const tile = planet.getTileByIndex(furnace.tileIndex);
        if (tile) {
          planetId = i === 0 ? 'earth' : 'moon';
          break;
        }
      }

      gameStorage.saveElectricFurnace(planetId, furnace.tileIndex, {
        position: { x: furnace.position.x, y: furnace.position.y, z: furnace.position.z },
        rotation: furnace.rotation,
        smeltingItem: furnace.smeltingItem,
        smeltingProgress: furnace.smeltingProgress,
        inputCount: furnace.inputCount,
        outputItem: furnace.outputItem,
        outputCount: furnace.outputCount
      });
    }
  }

  // Update power status for all electric furnaces based on cable connections to running steam engines
  private updateElectricFurnacePowerStatus(): void {
    const electricFurnaces = this.electricFurnaceManager.getPlacedElectricFurnaces();

    for (const furnace of electricFurnaces) {
      // Check if this furnace is connected to a running steam engine via cables
      const isPowered = this.cableNodeManager.isElectricFurnaceConnectedToRunningSteamEngine(
        furnace.tileIndex,
        (steamTileIndex) => {
          // Check if steam engine at this tile is running
          const engine = this.steamEngineManager.getSteamEngineAtTile(steamTileIndex);
          if (!engine) return false;
          // Get the running state from the UI
          const state = this.steamEngineUI.getEngineState(steamTileIndex);
          return state?.isRunning ?? false;
        }
      );

      // Update furnace power status
      this.electricFurnaceManager.setFurnacePowered(furnace.tileIndex, isPowered);
    }
  }

  // Save all storage chest and garbage pile states to local storage
  private saveAllStorageStates(): void {
    // Save storage chests
    const chests = this.storageChestManager.getPlacedChests();
    for (const chest of chests) {
      let planetId = 'earth';
      for (let i = 0; i < this.planets.length; i++) {
        const planet = this.planets[i];
        const tile = planet.getTileByIndex(chest.tileIndex);
        if (tile) {
          planetId = i === 0 ? 'earth' : 'moon';
          break;
        }
      }

      gameStorage.saveStorageChest(planetId, chest.tileIndex, {
        position: { x: chest.position.x, y: chest.position.y, z: chest.position.z },
        rotation: chest.rotation,
        slots: chest.slots.map(s => ({ itemType: s.itemType, quantity: s.quantity }))
      });
    }

    // Save garbage piles
    const piles = this.garbagePileManager.getPlacedPiles();
    for (const pile of piles) {
      let planetId = 'earth';
      for (let i = 0; i < this.planets.length; i++) {
        const planet = this.planets[i];
        const tile = planet.getTileByIndex(pile.tileIndex);
        if (tile) {
          planetId = i === 0 ? 'earth' : 'moon';
          break;
        }
      }

      gameStorage.saveGarbagePile(planetId, pile.tileIndex, {
        position: { x: pile.position.x, y: pile.position.y, z: pile.position.z },
        slots: pile.slots.map(s => ({ itemType: s.itemType, quantity: s.quantity }))
      });
    }
  }

  // Load saved data and apply it
  public loadSavedData(): void {
    const saveData = gameStorage.load();
    if (!saveData) return;

    // Load inventory
    if (saveData.inventory && saveData.inventory.length > 0) {
      this.inventory.importFromSave(saveData.inventory);
      this.updateHotbarUI();
    }

    // Load tile changes for each planet
    for (const planet of this.planets) {
      const planetId = this.getPlanetId(planet);
      const changes = gameStorage.getTileChangesForPlanet(planetId);
      for (const change of changes) {
        planet.setBlock(change.tileIndex, change.depth, change.blockType as HexBlockType);
      }
    }

    // Load saved torches
    const savedTorches = gameStorage.getTorches();
    for (const savedTorch of savedTorches) {
      // Find which planet this torch belongs to
      const planet = this.planets.find((_, i) =>
        (i === 0 ? 'earth' : 'moon') === savedTorch.planetId
      );
      if (planet) {
        const worldPosition = new THREE.Vector3(
          savedTorch.position.x,
          savedTorch.position.y,
          savedTorch.position.z
        );
        this.torchManager.placeTorch(worldPosition, planet.center, savedTorch.tileIndex);
      }
    }

    // After loading all torches, update torch data on all planets and trigger geometry rebuild
    if (savedTorches.length > 0) {
      const torchData = this.torchManager.getTorchDataForBaking();
      const tilesWithTorches = this.torchManager.getTilesWithTorches();
      for (const planet of this.planets) {
        planet.setTorchData(torchData);
        planet.setTilesWithTorches(tilesWithTorches);
      }

      // Mark tiles near each torch as dirty so lighting is baked
      for (const savedTorch of savedTorches) {
        const worldPosition = new THREE.Vector3(
          savedTorch.position.x,
          savedTorch.position.y,
          savedTorch.position.z
        );
        for (const planet of this.planets) {
          planet.markTilesNearTorchDirty(worldPosition, PlayerConfig.TORCH_LIGHT_RANGE);
        }
      }
    }

    // Load saved furnaces
    const savedFurnaces = gameStorage.getFurnaces();
    for (const savedFurnace of savedFurnaces) {
      // Find which planet this furnace belongs to
      const planet = this.planets.find((_, i) =>
        (i === 0 ? 'earth' : 'moon') === savedFurnace.planetId
      );
      if (planet) {
        const savedPosition = new THREE.Vector3(
          savedFurnace.position.x,
          savedFurnace.position.y,
          savedFurnace.position.z
        );
        // Restore the furnace at exact saved position (no offset recalculation)
        this.furnaceManager.restoreFurnace(savedPosition, planet.center, savedFurnace.tileIndex, savedFurnace.rotation).then(placedFurnace => {
          if (placedFurnace) {
            placedFurnace.fuelAmount = savedFurnace.fuelAmount;
            placedFurnace.smeltingItem = savedFurnace.smeltingItem;
            placedFurnace.smeltingProgress = savedFurnace.smeltingProgress;
            placedFurnace.inputCount = savedFurnace.inputCount ?? 0;
            placedFurnace.outputItem = savedFurnace.outputItem;
            placedFurnace.outputCount = savedFurnace.outputCount;
          }
        });
      }
    }

    // Load saved storage chests
    const savedStorageChests = gameStorage.getStorageChests();
    for (const savedChest of savedStorageChests) {
      const planet = this.planets.find((_, i) =>
        (i === 0 ? 'earth' : 'moon') === savedChest.planetId
      );
      if (planet) {
        const savedPosition = new THREE.Vector3(
          savedChest.position.x,
          savedChest.position.y,
          savedChest.position.z
        );
        // Restore the chest with its slots
        const slots = savedChest.slots.map(s => ({
          itemType: s.itemType as ItemType,
          quantity: s.quantity
        }));
        this.storageChestManager.restoreChest(savedPosition, planet.center, savedChest.tileIndex, savedChest.rotation, slots);
      }
    }

    // Load saved garbage piles
    const savedGarbagePiles = gameStorage.getGarbagePiles();
    for (const savedPile of savedGarbagePiles) {
      const planet = this.planets.find((_, i) =>
        (i === 0 ? 'earth' : 'moon') === savedPile.planetId
      );
      if (planet) {
        const savedPosition = new THREE.Vector3(
          savedPile.position.x,
          savedPile.position.y,
          savedPile.position.z
        );
        // Restore the pile with its slots
        const slots = savedPile.slots.map(s => ({
          itemType: s.itemType as ItemType,
          quantity: s.quantity
        }));
        this.garbagePileManager.restorePile(savedPosition, planet.center, savedPile.tileIndex, slots);
      }
    }

    // Load saved steam engines
    const savedSteamEngines = gameStorage.getSteamEngines();
    for (const savedSteamEngine of savedSteamEngines) {
      const planet = this.planets.find((_, i) =>
        (i === 0 ? 'earth' : 'moon') === savedSteamEngine.planetId
      );
      if (planet) {
        const savedPosition = new THREE.Vector3(
          savedSteamEngine.position.x,
          savedSteamEngine.position.y,
          savedSteamEngine.position.z
        );
        // Restore the steam engine
        this.steamEngineManager.restoreSteamEngine(savedPosition, planet.center, savedSteamEngine.tileIndex, savedSteamEngine.rotation);

        // Restore fuel state to UI
        this.steamEngineUI.restoreState(savedSteamEngine.tileIndex, {
          hasFuel: savedSteamEngine.hasFuel ?? false,
          fuelAmount: savedSteamEngine.fuelAmount ?? 0,
          isRunning: false,
          waterInput: 0,
          steamOutput: 0,
        });
      }
    }

    // Load saved hydro generators
    const savedHydroGenerators = gameStorage.getHydroGenerators();
    for (const savedHydroGenerator of savedHydroGenerators) {
      const planet = this.planets.find((_, i) =>
        (i === 0 ? 'earth' : 'moon') === savedHydroGenerator.planetId
      );
      if (planet) {
        const savedPosition = new THREE.Vector3(
          savedHydroGenerator.position.x,
          savedHydroGenerator.position.y,
          savedHydroGenerator.position.z
        );
        // Restore the hydro generator
        this.hydroGeneratorManager.restoreHydroGenerator(savedPosition, planet.center, savedHydroGenerator.tileIndex, savedHydroGenerator.rotation, savedHydroGenerator.waterDepth);
      }
    }

    // Load saved copper pipes
    const savedCopperPipes = gameStorage.getCopperPipes();
    for (const savedPipe of savedCopperPipes) {
      const planet = this.planets.find((_, i) =>
        (i === 0 ? 'earth' : 'moon') === savedPipe.planetId
      );
      if (planet) {
        const savedPosition = new THREE.Vector3(
          savedPipe.position.x,
          savedPipe.position.y,
          savedPipe.position.z
        );
        // Restore the copper pipe (fire and forget - material initialization is handled internally)
        this.copperPipeManager.restorePipe(savedPosition, savedPipe.tileIndex, savedPipe.depth);
      }
    }
    // Rebuild all pipe connections after loading
    this.copperPipeManager.rebuildAllConnections();

    // Load saved cables
    const savedCables = gameStorage.getCables();
    for (const savedCable of savedCables) {
      const planet = this.planets.find((_, i) =>
        (i === 0 ? 'earth' : 'moon') === savedCable.planetId
      );
      if (planet) {
        const savedPosition = new THREE.Vector3(
          savedCable.position.x,
          savedCable.position.y,
          savedCable.position.z
        );
        // Restore the cable
        this.cableNodeManager.restoreCable(savedPosition, savedCable.tileIndex, savedCable.depth);
      }
    }
    // Rebuild all cable connections after loading
    this.cableNodeManager.rebuildAllConnections();

    // Load saved electric furnaces
    const savedElectricFurnaces = gameStorage.getElectricFurnaces();
    for (const savedFurnace of savedElectricFurnaces) {
      const planet = this.planets.find((_, i) =>
        (i === 0 ? 'earth' : 'moon') === savedFurnace.planetId
      );
      if (planet) {
        const savedPosition = new THREE.Vector3(
          savedFurnace.position.x,
          savedFurnace.position.y,
          savedFurnace.position.z
        );
        // Restore the electric furnace
        this.electricFurnaceManager.restoreElectricFurnace(savedPosition, planet.center, savedFurnace.tileIndex, savedFurnace.rotation).then(placedFurnace => {
          if (placedFurnace) {
            placedFurnace.smeltingItem = savedFurnace.smeltingItem;
            placedFurnace.smeltingProgress = savedFurnace.smeltingProgress;
            placedFurnace.inputCount = savedFurnace.inputCount;
            placedFurnace.outputItem = savedFurnace.outputItem;
            placedFurnace.outputCount = savedFurnace.outputCount;
          }
        });
      }
    }

    console.log(`Loaded save: ${saveData.tileChanges.length} tile changes, ${savedTorches.length} torches, ${savedFurnaces.length} furnaces, ${savedElectricFurnaces.length} electric furnaces, ${savedStorageChests.length} chests, ${savedGarbagePiles.length} piles, ${savedSteamEngines.length} steam engines, ${savedHydroGenerators.length} hydro generators, ${savedCopperPipes.length} copper pipes, ${savedCables.length} cables, inventory restored`);
  }

  /**
   * Register all tech block managers with the TechBlockRegistry for F3 debug menu
   */
  private registerTechBlocksWithRegistry(): void {
    // Register Furnaces
    TechBlockRegistry.registerManager({
      type: 'Furnace',
      getBlocks: (): TechBlockInfo[] => {
        return this.furnaceManager.getPlacedFurnaces().map((furnace: PlacedFurnace) => ({
          type: 'Furnace',
          id: `furnace-${furnace.tileIndex}`,
          tileIndex: furnace.tileIndex,
          position: { x: furnace.position.x, y: furnace.position.y, z: furnace.position.z },
          getStatus: () => {
            if (furnace.smeltingItem !== null && furnace.fuelAmount > 0) {
              return `Smelting ${Math.round(furnace.smeltingProgress * 100)}%`;
            } else if (furnace.smeltingItem !== null && furnace.fuelAmount === 0) {
              return 'No Fuel';
            } else if (furnace.outputCount > 0) {
              return `Output: ${furnace.outputCount}`;
            }
            return 'Idle';
          },
          openUI: () => {
            this.furnaceUI.open(furnace);
            this.craftingSystem.open();
          }
        }));
      }
    });

    // Register Steam Engines
    TechBlockRegistry.registerManager({
      type: 'Steam Engine',
      getBlocks: (): TechBlockInfo[] => {
        return this.steamEngineManager.getPlacedSteamEngines().map((engine: PlacedSteamEngine) => {
          const state = this.steamEngineUI.getEngineState(engine.tileIndex);
          return {
            type: 'Steam Engine',
            id: `steam-engine-${engine.tileIndex}`,
            tileIndex: engine.tileIndex,
            position: { x: engine.position.x, y: engine.position.y, z: engine.position.z },
            getStatus: () => {
              if (state?.isRunning) {
                return `Running (${state.steamOutput.toFixed(1)} steam/s)`;
              } else if (state?.hasFuel && state.waterInput === 0) {
                return 'No Water';
              } else if (!state?.hasFuel) {
                return 'No Fuel';
              }
              return 'Idle';
            },
            openUI: () => {
              this.steamEngineUI.open(engine);
              this.craftingSystem.open();
            }
          };
        });
      }
    });

    // Register Hydro Generators
    TechBlockRegistry.registerManager({
      type: 'Hydro Generator',
      getBlocks: (): TechBlockInfo[] => {
        return this.hydroGeneratorManager.getPlacedHydroGenerators().map((hydro: PlacedHydroGenerator) => ({
          type: 'Hydro Generator',
          id: `hydro-generator-${hydro.tileIndex}`,
          tileIndex: hydro.tileIndex,
          position: { x: hydro.position.x, y: hydro.position.y, z: hydro.position.z },
          getStatus: () => {
            if (hydro.isActive) {
              return `Active (${hydro.waterPumpedOut.toFixed(1)} water/s)`;
            }
            return 'Inactive';
          },
          openUI: () => {
            this.hydroGeneratorUI.open(hydro);
            this.craftingSystem.open();
          }
        }));
      }
    });

    // Register Storage Chests
    TechBlockRegistry.registerManager({
      type: 'Storage Chest',
      getBlocks: (): TechBlockInfo[] => {
        return this.storageChestManager.getPlacedChests().map((chest: PlacedStorageChest) => {
          const usedSlots = chest.slots.filter(s => s.itemType !== ItemType.NONE).length;
          return {
            type: 'Storage Chest',
            id: `storage-chest-${chest.tileIndex}`,
            tileIndex: chest.tileIndex,
            position: { x: chest.position.x, y: chest.position.y, z: chest.position.z },
            getStatus: () => {
              if (usedSlots === 0) return 'Empty';
              return `${usedSlots}/27 slots`;
            },
            openUI: () => {
              this.storageUI.open(chest);
              this.craftingSystem.open();
            }
          };
        });
      }
    });

    // Register Copper Pipes
    TechBlockRegistry.registerManager({
      type: 'Copper Pipe',
      getBlocks: (): TechBlockInfo[] => {
        return this.copperPipeManager.getPlacedPipes().map((pipe: PlacedCopperPipe) => {
          const network = this.copperPipeManager.getPipeNetwork(pipe.id);
          return {
            type: 'Copper Pipe',
            id: `copper-pipe-${pipe.tileIndex}-${pipe.depth}`,
            tileIndex: pipe.tileIndex,
            position: { x: pipe.position.x, y: pipe.position.y, z: pipe.position.z },
            getStatus: () => {
              if (!network) return 'Disconnected';
              const hasHydro = network.connectedHydroGenerators.length > 0;
              const hasSteam = network.connectedSteamEngines.length > 0;
              if (hasHydro && hasSteam) return 'Network Active';
              if (hasHydro || hasSteam) return 'Partial';
              return `${network.pipes.length} pipes`;
            },
            openUI: () => {
              this.copperPipeUI.openPipe(pipe, network);
            }
          };
        });
      }
    });

    // Register Electric Furnaces
    TechBlockRegistry.registerManager({
      type: 'Electric Furnace',
      getBlocks: (): TechBlockInfo[] => {
        return this.electricFurnaceManager.getPlacedElectricFurnaces().map((furnace: PlacedElectricFurnace) => ({
          type: 'Electric Furnace',
          id: `electric-furnace-${furnace.tileIndex}`,
          tileIndex: furnace.tileIndex,
          position: { x: furnace.position.x, y: furnace.position.y, z: furnace.position.z },
          getStatus: () => {
            if (furnace.smeltingItem !== null && furnace.isPowered) {
              return `Smelting ${Math.round(furnace.smeltingProgress * 100)}%`;
            } else if (furnace.smeltingItem !== null && !furnace.isPowered) {
              return 'No Power';
            } else if (furnace.outputCount > 0) {
              return `Output: ${furnace.outputCount}`;
            }
            return furnace.isPowered ? 'Powered' : 'No Power';
          },
          openUI: () => {
            this.electricFurnaceUI.open(furnace);
            this.craftingSystem.open();
          }
        }));
      }
    });

    // Register Cables
    TechBlockRegistry.registerManager({
      type: 'Cable',
      getBlocks: (): TechBlockInfo[] => {
        return this.cableNodeManager.getPlacedCables().map((cable: PlacedCable) => {
          const network = this.cableNodeManager.getCableNetwork(cable.id);
          return {
            type: 'Cable',
            id: `cable-${cable.tileIndex}-${cable.depth}`,
            tileIndex: cable.tileIndex,
            position: { x: cable.position.x, y: cable.position.y, z: cable.position.z },
            getStatus: () => {
              if (!network) return 'Disconnected';
              const hasSteam = network.connectedSteamEngines.length > 0;
              const hasFurnace = network.connectedElectricFurnaces.length > 0;
              if (hasSteam && hasFurnace) return 'Network Active';
              if (hasSteam || hasFurnace) return 'Partial';
              return `${network.cables.length} cables`;
            },
            openUI: () => {
              // Cables don't have a dedicated UI
            }
          };
        });
      }
    });
  }
}
