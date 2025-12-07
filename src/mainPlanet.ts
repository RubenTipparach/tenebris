import * as THREE from 'three';
import { GameEngine } from './engine/GameEngine';
import { InputManager } from './engine/InputManager';
import { Planet } from './planet/Planet';
import { PlanetPlayer } from './player/PlanetPlayer';
import { PlanetBlockInteraction } from './player/PlanetBlockInteraction';
import { PlanetTreeManager } from './planet/Tree';
import { Atmosphere, createEarthAtmosphere } from './planet/Atmosphere';
import { CloudSystem, createEarthClouds } from './planet/Clouds';
import { PlayerConfig } from './config/PlayerConfig';
import { profiler } from './engine/Profiler';
import { gameStorage } from './engine/GameStorage';

class PlanetGame {
  private engine: GameEngine;
  private inputManager: InputManager;
  private earth: Planet;
  private moon: Planet;
  private player: PlanetPlayer;
  private blockInteraction: PlanetBlockInteraction;
  private treeManager: PlanetTreeManager;
  private earthAtmosphere: Atmosphere | null = null;
  private earthClouds: CloudSystem = null!;
  private isReady: boolean = false;
  private elapsedTime: number = 0;

  constructor() {
    const container = document.getElementById('game-container');
    if (!container) throw new Error('Game container not found');

    // Initialize core systems
    this.engine = new GameEngine(container);
    this.inputManager = new InputManager();

    // Create Earth with configurable subdivisions
    this.earth = new Planet(this.engine.scene, 100, PlayerConfig.EARTH_SUBDIVISIONS);

    // Create Moon with configurable subdivisions and moon texture
    // Position the moon at (400, 0, 0) - about 250 units from Earth surface
    this.moon = new Planet(this.engine.scene, 50, PlayerConfig.MOON_SUBDIVISIONS, { texturePath: '/textures/moon.png', heightVariation: 0.6 });

    // Player will be initialized after planets
    this.player = null!;
    this.blockInteraction = null!;
    this.treeManager = null!;

    // Setup pointer lock UI
    this.inputManager.setPointerLockCallback((locked) => {
      const instructions = document.getElementById('instructions');
      const inventoryMenu = document.getElementById('inventory-menu');
      const isInventoryOpen = inventoryMenu?.classList.contains('active');

      if (instructions) {
        // Don't show main menu if inventory is open
        instructions.style.display = (locked || isInventoryOpen) ? 'none' : 'block';
        if (!locked && !isInventoryOpen) {
          console.log('Menu opened');
        }
      }
      const crosshair = document.getElementById('crosshair');
      if (crosshair) {
        crosshair.style.display = locked ? 'block' : 'none';
      }
    });

    this.init();
  }

  private async init(): Promise<void> {
    try {
      // Initialize both planets (loads textures, generates terrain)
      await this.earth.initialize();
      await this.moon.initialize();

      // Position the moon and update its bounding spheres
      this.moon.center.set(400, 0, 0);
      this.moon.updateBoundingSpheres();

      // Don't build all meshes upfront - let them build on-demand as player moves
      // This prevents massive startup lag with 10,000+ tiles

      // Initialize player on Earth surface
      this.player = new PlanetPlayer(this.engine.camera, this.inputManager, this.earth);

      // Add moon as a second celestial body with weaker gravity
      this.player.addPlanet(this.moon, {
        gravityFullRadius: 70,    // 100% gravity within 70 units (moon radius 50 + 20)
        gravityFalloffRadius: 120, // Gravity falls off to 0% at 120 units
        gravityStrength: 0.4,     // Moon has 40% of Earth's gravity
      });

      // Initialize block interaction with all planets (allows mining/placing on both Earth and Moon)
      this.blockInteraction = new PlanetBlockInteraction(
        [this.earth, this.moon],
        this.player,
        this.engine.scene
      );

      // Initialize tree manager and scatter trees on Earth
      // Pass sun direction for planet-aware lighting
      this.treeManager = new PlanetTreeManager(this.engine.scene, this.engine.sunDirection);
      this.treeManager.scatterTrees(
        this.earth.center,
        this.earth.radius,
        PlayerConfig.TREE_COUNT,
        (direction) => this.earth.getSurfaceHeightInDirection(direction),
        (direction) => this.earth.isUnderwaterInDirection(direction), // Skip underwater locations
        PlayerConfig.TERRAIN_SEED, // Use terrain seed for deterministic placement
        (direction) => this.earth.getTileIndexInDirection(direction), // For visibility tracking
        (direction) => this.earth.getTileCenterInDirection(direction) // For centering trees on tiles
      );

      // Give block interaction access to tree manager for mining trees
      this.blockInteraction.setTreeManager(this.treeManager);

      // Setup mobile inventory toggle callback
      this.inputManager.setInventoryToggleCallback(() => {
        this.blockInteraction.getCraftingSystem().toggle();
      });

      // Setup mobile pause callback - shows the main menu
      this.inputManager.setPauseToggleCallback(() => {
        const instructions = document.getElementById('instructions');
        const mobileControls = document.getElementById('mobile-controls');
        if (instructions) {
          const isVisible = instructions.style.display !== 'none';
          instructions.style.display = isVisible ? 'none' : 'block';
          if (mobileControls) {
            mobileControls.style.display = isVisible ? 'block' : 'none';
          }
        }
      });

      // Create atmosphere for Earth (if enabled)
      if (PlayerConfig.ATMOSPHERE_ENABLED) {
        this.earthAtmosphere = createEarthAtmosphere(this.earth.radius, this.engine.sunDirection);
        this.earthAtmosphere.setPosition(this.earth.center);
        this.engine.scene.add(this.earthAtmosphere.getMesh());
      }

      // Create clouds for Earth
      this.earthClouds = createEarthClouds(this.earth.radius, this.engine.sunDirection);
      this.earthClouds.setPosition(this.earth.center);
      this.engine.scene.add(this.earthClouds.getGroup());

      // Set sun direction for water shader reflections
      this.earth.setSunDirection(this.engine.sunDirection);

      // Register water shader material with engine for depth-based fog
      const waterMaterial = this.earth.getWaterShaderMaterial();
      if (waterMaterial) {
        this.engine.registerWaterMaterial(waterMaterial);
      }

      // Setup settings menu
      this.setupSettingsMenu();

      // Configure profiler spike detection
      profiler.setFrameSpikeThreshold(PlayerConfig.FRAME_SPIKE_THRESHOLD_MS);

      // Load saved game data (tiles, inventory, player position)
      this.loadSavedGame();

      // Setup auto-save for player position (every 5 seconds)
      gameStorage.setPlayerSaveCallback(() => this.player.exportForSave());
      gameStorage.startAutoSave(5);

      this.isReady = true;

      // Setup game loop
      this.engine.onUpdate(this.update.bind(this));

      // Start the engine
      this.engine.start();

      console.log('Planet game started with Earth and Moon!');
    } catch (error) {
      console.error('Failed to initialize game:', error);
    }
  }

  private update(deltaTime: number): void {
    if (!this.isReady) return;

    // Track elapsed time for shader animations
    this.elapsedTime += deltaTime;

    // Update player
    profiler.begin('Player');
    this.player.update(deltaTime);
    profiler.end('Player');

    // Update underwater fog based on player water state
    this.engine.setUnderwater(this.player.getIsInWater());

    // Update block interaction FIRST - this handles torch placement/removal
    // which marks tiles dirty and updates torch data on planets immediately
    profiler.begin('Block Interaction');
    const input = this.inputManager.getState();
    const isGameActive = this.inputManager.isLocked();
    const wheelDelta = this.inputManager.getWheelDelta();
    this.blockInteraction.update(
      deltaTime,
      isGameActive && input.leftClick,
      isGameActive && input.rightClick,
      isGameActive ? wheelDelta : 0
    );
    profiler.end('Block Interaction');

    // Update both planets (rebuild dirty meshes near player) with camera for frustum culling
    // This comes AFTER block interaction so torch light changes are immediately baked
    profiler.begin('Earth Update');
    this.earth.update(this.player.position, this.engine.camera, deltaTime);
    profiler.end('Earth Update');

    profiler.begin('Moon Update');
    this.moon.update(this.player.position, this.engine.camera, deltaTime);
    profiler.end('Moon Update');

    // Update water shader for animation (only Earth has water)
    const isUnderwater = this.player.getIsInWater();
    this.earth.updateWaterShader(this.elapsedTime, isUnderwater);

    // Update atmosphere (needs camera position for fresnel effect)
    if (this.earthAtmosphere) {
      this.earthAtmosphere.updateCameraPosition(this.engine.camera.position);
    }

    // Update clouds (slow rotation)
    this.earthClouds.update(deltaTime);

    // Update tree visibility:
    // - In orbit view (distant LOD): hide all trees (too far to see detail)
    // - Otherwise: show all trees (both detailed terrain and LOD terrain are visible)
    // Note: When on ground, both detailed terrain (near player) and LOD terrain (rest of planet)
    // are rendered together, so all trees should be visible for consistent appearance.
    if (this.earth.isInOrbitView()) {
      this.treeManager.setAllVisible(false);
    } else {
      this.treeManager.setAllVisible(true);
    }
  }

  private setupSettingsMenu(): void {
    const atmosphereToggle = document.getElementById('toggle-atmosphere') as HTMLInputElement;
    const cloudsToggle = document.getElementById('toggle-clouds') as HTMLInputElement;
    const jetpackToggle = document.getElementById('toggle-jetpack') as HTMLInputElement;
    const invertYToggle = document.getElementById('toggle-invert-y') as HTMLInputElement;
    const teleportSelect = document.getElementById('teleport-select') as HTMLSelectElement;

    // Setup tab switching
    const menuTabs = document.querySelectorAll('.menu-tab');
    menuTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Remove active from all tabs and contents
        menuTabs.forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

        // Activate clicked tab and its content
        tab.classList.add('active');
        const tabName = tab.getAttribute('data-tab');
        const content = document.getElementById(`tab-${tabName}`);
        if (content) content.classList.add('active');
      });
    });

    if (!atmosphereToggle || !cloudsToggle) return;

    // Initialize toggle states
    atmosphereToggle.checked = this.earthAtmosphere?.isVisible() ?? false;
    cloudsToggle.checked = this.earthClouds.isVisible();

    // Jetpack defaults to OFF
    if (jetpackToggle) {
      jetpackToggle.checked = false;
      this.player.setJetpackEnabled(false);

      jetpackToggle.addEventListener('change', () => {
        this.player.setJetpackEnabled(jetpackToggle.checked);
      });
    }

    // Invert Y axis toggle
    if (invertYToggle) {
      invertYToggle.checked = PlayerConfig.INVERT_Y_AXIS;

      invertYToggle.addEventListener('change', () => {
        PlayerConfig.INVERT_Y_AXIS = invertYToggle.checked;
      });
    }

    // Handle atmosphere toggle
    atmosphereToggle.addEventListener('change', () => {
      if (this.earthAtmosphere) {
        this.earthAtmosphere.setVisible(atmosphereToggle.checked);
      }
    });

    // Handle clouds toggle
    cloudsToggle.addEventListener('change', () => {
      this.earthClouds.setVisible(cloudsToggle.checked);
    });

    // Handle teleport dropdown
    if (teleportSelect) {
      teleportSelect.addEventListener('change', () => {
        this.teleportToPlanet(teleportSelect.value);
      });
    }

    // Handle reset game button
    const resetBtn = document.getElementById('reset-game-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to reset your game? This will delete all saved progress.')) {
          // Stop auto-save first to prevent race condition
          gameStorage.stopAutoSave();
          gameStorage.clearSave();
          window.location.reload();
        }
      });
    }
  }

  private teleportToPlanet(planetName: string): void {
    let planet: Planet;

    switch (planetName) {
      case 'earth':
        planet = this.earth;
        break;
      case 'moon':
        planet = this.moon;
        break;
      default:
        console.warn(`Unknown planet: ${planetName}`);
        return;
    }

    const surfaceOffset = 1; // 1m above surface
    const playerPos = planet.center.clone();

    // Position player on the surface using actual terrain height
    // For Earth, position on top (Y+), for Moon position facing Earth (X-)
    if (planetName === 'earth') {
      const spawnDirection = new THREE.Vector3(0, 1, 0);
      const surfaceHeight = planet.getSurfaceHeightInDirection(spawnDirection);
      playerPos.y += surfaceHeight + surfaceOffset;
    } else {
      const spawnDirection = new THREE.Vector3(-1, 0, 0);
      const surfaceHeight = planet.getSurfaceHeightInDirection(spawnDirection);
      playerPos.x -= surfaceHeight + surfaceOffset;
    }

    this.player.position.copy(playerPos);
    this.player.velocity.set(0, 0, 0);

    console.log(`Teleported to ${planetName} at position: ${playerPos.x.toFixed(1)}, ${playerPos.y.toFixed(1)}, ${playerPos.z.toFixed(1)}`);
  }

  private loadSavedGame(): void {
    const saveData = gameStorage.load();
    if (!saveData) {
      console.log('No saved game found, starting fresh');
      return;
    }

    // Load tile changes and inventory
    this.blockInteraction.loadSavedData();

    // Load player position and orientation
    if (saveData.player && saveData.player.position) {
      // Check if position is valid (not at origin which would be inside the planet)
      const pos = saveData.player.position;
      const distFromEarthCenter = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);

      if (distFromEarthCenter > 50) {  // Player should be at least 50 units from center
        this.player.importFromSave(saveData.player);
        console.log(`Loaded player position: ${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)}`);
      }
    }

    console.log('Game loaded from save');
  }
}

// Start game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PlanetGame();
});
