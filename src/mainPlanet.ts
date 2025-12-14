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
import { loadingManager } from './engine/LoadingManager';
import { MenuManager } from './player/MenuManager';
import { initScreenshotHandler } from './utils/screenshot';
import { RocketFlightManager } from './rocket';

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
  private waterUpdateTimer: number = 0;
  private readonly WATER_UPDATE_INTERVAL = 5.0; // Update water every 5 seconds

  // Rocket flight system
  private rocketFlightManager: RocketFlightManager | null = null;

  // Shared frustum for all planet updates (calculated once per frame)
  private sharedFrustum: THREE.Frustum = new THREE.Frustum();
  private projScreenMatrix: THREE.Matrix4 = new THREE.Matrix4();

  constructor() {
    // Prevent browser from closing tab - shows confirmation dialog
    // Note: User must interact with page first for this to work (Chrome security)
    window.addEventListener('beforeunload', (e) => {
      e.preventDefault();
      // Chrome requires returnValue to be set
      e.returnValue = '';
      return '';
    });

    const container = document.getElementById('game-container');
    if (!container) throw new Error('Game container not found');

    // Disable browser context menu on right-click
    container.addEventListener('contextmenu', (e) => e.preventDefault());

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

    // Initialize the MenuManager for centralized menu handling
    MenuManager.init();

    // Initialize screenshot handler (Shift+P)
    initScreenshotHandler();

    // Reset mouse button state when menus close to prevent stuck click state
    MenuManager.setOnMenuCloseCallback(() => {
      this.inputManager.resetMouseButtons();
    });

    // Track if ESC was pressed to close pause menu (need to re-lock on keyup)
    let pendingPauseMenuClose = false;

    // Handle ESC key for pause menu toggle
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        const instructions = document.getElementById('instructions');
        const isPauseMenuVisible = instructions?.style.display === 'block';

        // Only handle ESC here if no game UI is open (they handle their own ESC via MenuManager)
        if (!MenuManager.isAnyMenuOpen()) {
          if (isPauseMenuVisible) {
            // Pause menu is open - mark for closing on keyup
            pendingPauseMenuClose = true;
            e.preventDefault();
          }
          // If game is active (pointer locked), browser will auto-exit pointer lock on ESC
          // which will trigger the pointer lock callback to show pause menu
        }
      }
    });

    // Re-lock pointer on ESC keyup to close pause menu
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Escape' && pendingPauseMenuClose) {
        pendingPauseMenuClose = false;
        container?.requestPointerLock();
      }
    });

    // Setup pointer lock UI
    this.inputManager.setPointerLockCallback((locked) => {
      const instructions = document.getElementById('instructions');

      if (instructions) {
        // Don't show pause menu if any game UI is open (they handle their own display via MenuManager)
        if (!locked && MenuManager.isAnyMenuOpen()) {
          instructions.style.display = 'none';
        } else {
          instructions.style.display = locked ? 'none' : 'block';
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
      // Register loading steps
      loadingManager.registerStep('textures', 1);
      loadingManager.registerStep('terrain-generation', 2);
      loadingManager.registerStep('initial-terrain', 3);
      loadingManager.registerStep('player-setup', 1);
      loadingManager.registerStep('environment', 1);

      // Initialize both planets (loads textures, generates terrain)
      loadingManager.setStatus('Loading textures...');
      await this.earth.initialize();
      await this.moon.initialize();
      loadingManager.completeStep('textures');

      // Position the moon and update its bounding spheres
      loadingManager.setStatus('Generating terrain...');
      this.moon.center.set(400, 0, 0);
      this.moon.updateBoundingSpheres();
      loadingManager.completeStep('terrain-generation');

      // Calculate spawn position before building initial terrain
      loadingManager.setStatus('Building terrain around spawn...');
      const spawnPosition = this.earth.getSpawnPositionAtLatLon(
        PlayerConfig.EARTH_SPAWN_LAT,
        PlayerConfig.EARTH_SPAWN_LON,
        1 // 1m above surface
      );

      // Build initial terrain around spawn point and wait for completion
      // This ensures terrain is ready before player spawns (no falling through)
      await this.earth.buildInitialTerrain(spawnPosition);
      loadingManager.completeStep('initial-terrain');

      // Initialize player on Earth surface
      loadingManager.setStatus('Initializing player...');
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

      // Load saved game data early so removed trees are available
      // (full load happens later but we need planet data now for tree generation)
      gameStorage.load();

      // Get removed trees from storage to skip them during generation
      const removedTreesData = gameStorage.getRemovedTrees('earth');
      const removedTiles = new Set(removedTreesData.map(t => t.tileIndex));

      this.treeManager.scatterTrees(
        this.earth.center,
        this.earth.radius,
        PlayerConfig.TREE_COUNT,
        (direction) => this.earth.getSurfaceHeightInDirection(direction),
        (direction) => this.earth.isUnderwaterInDirection(direction), // Skip underwater locations
        PlayerConfig.TERRAIN_SEED, // Use terrain seed for deterministic placement
        (direction) => this.earth.getTileIndexInDirection(direction), // For visibility tracking
        (direction) => this.earth.getTileCenterInDirection(direction), // For centering trees on tiles
        removedTiles // Skip tiles where trees were previously removed
      );

      // Give block interaction access to tree manager for mining trees
      this.blockInteraction.setTreeManager(this.treeManager);

      // Initialize rocket flight system
      this.rocketFlightManager = new RocketFlightManager(
        this.engine.scene,
        this.engine.camera,
        this.inputManager
      );

      // Register planets for gravity calculations
      this.rocketFlightManager.addPlanet('Earth', this.earth.center, this.earth.radius, 1.0);
      this.rocketFlightManager.addPlanet('Moon', this.moon.center, this.moon.radius, 0.4);

      // Set up close all menus callback for boarding rocket
      this.blockInteraction.getLaunchPadUI().setOnCloseAllMenusCallback(() => {
        // Close the crafting/inventory system completely
        this.blockInteraction.getCraftingSystem().close();
      });

      // Set up board rocket callback
      this.blockInteraction.getLaunchPadUI().setOnBoardRocketCallback((launchPad) => {
        console.log('Board rocket callback triggered!');

        // Hide player and disable controls
        this.player.setEnabled(false);

        // Enter flight mode
        if (this.rocketFlightManager?.enterFlightMode(launchPad)) {
          // Hide crosshair while in rocket
          const crosshair = document.getElementById('crosshair');
          if (crosshair) crosshair.style.display = 'none';

          // Hide hotbar while in rocket
          const hotbar = document.getElementById('hotbar');
          if (hotbar) hotbar.style.display = 'none';
        } else {
          // Failed to enter flight mode, re-enable player
          this.player.setEnabled(true);
        }
      });

      // Set up exit flight callback
      this.rocketFlightManager.setOnExitFlightCallback(() => {
        // Re-enable player controls
        this.player.setEnabled(true);

        // Show crosshair
        const crosshair = document.getElementById('crosshair');
        if (crosshair) crosshair.style.display = 'block';

        // Show hotbar
        const hotbar = document.getElementById('hotbar');
        if (hotbar) hotbar.style.display = 'flex';

        // Re-lock pointer
        const container = document.getElementById('game-container');
        if (container) container.requestPointerLock();
      });

      // Set up respawn callback for when player crashes and respawns
      this.rocketFlightManager.setOnRespawnCallback((respawnPosition) => {
        // Move player to respawn position (last boarded position)
        this.player.position.copy(respawnPosition);
      });

      // Set up board rocket callback for boarding landed rockets
      this.rocketFlightManager.setOnBoardRocketCallback(() => {
        // Hide player and disable controls
        this.player.setEnabled(false);

        // Hide crosshair while in rocket
        const crosshair = document.getElementById('crosshair');
        if (crosshair) crosshair.style.display = 'none';

        // Hide hotbar while in rocket
        const hotbar = document.getElementById('hotbar');
        if (hotbar) hotbar.style.display = 'none';
      });

      loadingManager.completeStep('player-setup');

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
      loadingManager.setStatus('Creating environment...');
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
      loadingManager.completeStep('environment');

      // Register water shader material with engine for depth-based fog
      const waterMaterial = this.earth.getWaterShaderMaterial();
      if (waterMaterial) {
        this.engine.registerWaterMaterial(waterMaterial);
      }

      // Register water mesh callback for efficient depth pre-pass (avoids scene.traverse per frame)
      this.earth.setWaterMeshCallback((mesh, isAdd) => {
        if (isAdd) {
          this.engine.registerWaterMesh(mesh);
        } else {
          this.engine.unregisterWaterMesh(mesh);
        }
      });

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

      // Hide loading screen and show game
      loadingManager.setStatus('Ready!');
      loadingManager.hideLoadingScreen();

      console.log('Planet game started with Earth and Moon!');
    } catch (error) {
      console.error('Failed to initialize game:', error);
    }
  }

  private update(deltaTime: number): void {
    if (!this.isReady) return;

    // Track elapsed time for shader animations
    this.elapsedTime += deltaTime;

    // Check if in rocket flight mode
    const inFlightMode = this.rocketFlightManager?.isInFlight() ?? false;

    if (inFlightMode) {
      // Update rocket flight system
      // Mouse/scroll handling is done internally by RocketFlightManager
      profiler.begin('Rocket Flight');
      this.rocketFlightManager?.update(deltaTime);
      profiler.end('Rocket Flight');
    } else {
      // Normal player mode
      // Update player
      profiler.begin('Player');
      this.player.update(deltaTime);
      profiler.end('Player');

      // Update underwater fog based on player water state
      this.engine.setUnderwater(this.player.getIsInWater());

      // Check for landed rocket interaction (before block interaction)
      const input = this.inputManager.getState();
      const isGameActive = this.inputManager.isLocked();
      let handledRocketInteraction = false;

      if (isGameActive && input.rightClick && this.rocketFlightManager) {
        handledRocketInteraction = this.checkLandedRocketInteraction();
      }

      // Update block interaction FIRST - this handles torch placement/removal
      // which marks tiles dirty and updates torch data on planets immediately
      profiler.begin('Block Interaction');
      const wheelDelta = this.inputManager.getWheelDelta();
      this.blockInteraction.update(
        deltaTime,
        isGameActive && input.leftClick,
        isGameActive && input.rightClick && !handledRocketInteraction,
        isGameActive ? wheelDelta : 0
      );
      profiler.end('Block Interaction');
    }

    // Update both planets (rebuild dirty meshes near player) with camera for frustum culling
    // This comes AFTER block interaction so torch light changes are immediately baked
    // Calculate frustum once and share between all planet updates
    profiler.begin('Frustum Calc');
    this.projScreenMatrix.multiplyMatrices(this.engine.camera.projectionMatrix, this.engine.camera.matrixWorldInverse);
    this.sharedFrustum.setFromProjectionMatrix(this.projScreenMatrix);
    profiler.end('Frustum Calc');

    profiler.begin('Earth Update');
    this.earth.update(this.player.position, this.engine.camera, deltaTime, this.sharedFrustum);
    profiler.end('Earth Update');

    profiler.begin('Moon Update');
    this.moon.update(this.player.position, this.engine.camera, deltaTime, this.sharedFrustum);
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

    // Periodic water flow update (every 5 seconds)
    this.waterUpdateTimer += deltaTime;
    if (this.waterUpdateTimer >= this.WATER_UPDATE_INTERVAL) {
      this.waterUpdateTimer = 0;
      const nearbyTiles = this.earth.getVisibleTileIndices();
      const waterFilled = this.earth.updateWaterFlow(nearbyTiles);
      if (waterFilled > 0) {
        console.log(`[Water update] Fixed ${waterFilled} water blocks in ${nearbyTiles.size} tiles`);
      }
    }

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

  /**
   * Check if player is looking at and can interact with a landed rocket
   * Returns true if interaction was handled
   */
  private checkLandedRocketInteraction(): boolean {
    if (!this.rocketFlightManager) return false;

    const landedRocketManager = this.rocketFlightManager.getLandedRocketManager();
    const landedRockets = landedRocketManager.getAllLandedRockets();

    if (landedRockets.length === 0) return false;

    // Create raycaster from camera
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), this.engine.camera);

    // Check for intersection with landed rockets
    const maxReach = 8; // Same as block interaction reach
    const result = landedRocketManager.raycast(raycaster, maxReach);

    if (result) {
      // Player is looking at a landed rocket - open the UI
      this.rocketFlightManager.openLandedRocketUI(result.rocket);
      return true;
    }

    return false;
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

    // Jetpack defaults to OFF (now in Debug tab)
    if (jetpackToggle) {
      jetpackToggle.checked = PlayerConfig.DEBUG_JETPACK_ENABLED;
      this.player.setJetpackEnabled(PlayerConfig.DEBUG_JETPACK_ENABLED);

      jetpackToggle.addEventListener('change', () => {
        PlayerConfig.DEBUG_JETPACK_ENABLED = jetpackToggle.checked;
        this.player.setJetpackEnabled(jetpackToggle.checked);
      });
    }

    // Bypass crafting ingredients toggle (Debug tab)
    const bypassCraftingToggle = document.getElementById('toggle-bypass-crafting') as HTMLInputElement;
    if (bypassCraftingToggle) {
      bypassCraftingToggle.checked = PlayerConfig.DEBUG_BYPASS_CRAFTING_INGREDIENTS;

      bypassCraftingToggle.addEventListener('change', () => {
        PlayerConfig.DEBUG_BYPASS_CRAFTING_INGREDIENTS = bypassCraftingToggle.checked;
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
    let playerPos: THREE.Vector3;

    // Position player on the surface using actual terrain height
    // For Earth, use configured spawn lat/lon; for Moon, position facing Earth (X-)
    if (planetName === 'earth') {
      playerPos = planet.getSpawnPositionAtLatLon(
        PlayerConfig.EARTH_SPAWN_LAT,
        PlayerConfig.EARTH_SPAWN_LON,
        surfaceOffset
      );
    } else {
      const spawnDirection = new THREE.Vector3(-1, 0, 0);
      const surfaceHeight = planet.getSurfaceHeightInDirection(spawnDirection);
      playerPos = planet.center.clone();
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
