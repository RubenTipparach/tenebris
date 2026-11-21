import * as THREE from 'three';
import { GameEngine } from './engine/GameEngine';
import { InputManager } from './engine/InputManager';
import { Planet } from './planet/Planet';
import { PlanetPlayer } from './player/PlanetPlayer';
import { PlanetBlockInteraction } from './player/PlanetBlockInteraction';
import { PlanetTreeManager, MushroomTreeManager, EarthTreeSpecies, standSpecies } from './planet/Tree';
import { HexBlockType } from './shared/blockTypes';
import { Atmosphere, createEarthAtmosphere, createAtmosphere } from './planet/Atmosphere';
import { CloudSystem, createEarthClouds } from './planet/Clouds';
import { PlayerConfig } from './config/PlayerConfig';
import { SOLAR_SYSTEM, getBodyConfig, getGravityRadii } from './config/SolarSystemConfig';
import { profiler } from './engine/Profiler';
import { gameStorage } from './engine/GameStorage';
import { loadingManager } from './engine/LoadingManager';
import { MenuManager } from './player/MenuManager';
import { initScreenshotHandler } from './utils/screenshot';
import { RocketFlightManager, RocketController, ROCKET_CONFIG } from './rocket';
import { ItemType } from './player/Inventory';
import { FishingSystem } from './player/Fishing';
import { Multiplayer } from './net/Multiplayer';
import { WorldBrowser } from './net/WorldBrowser';
import { currentWorld, prepareWorld, worldSocketUrl } from './net/WorldSession';
import { SolarSystemMockup } from './mockups/SolarSystemMockup';
import { GroundClutter } from './mockups/GroundClutter';
import { Fauna } from './planet/Fauna';
import { validateFaunaRosters } from './config/FaunaConfig';
import { setImprovedTreeShading } from './planet/Tree';
import { AudioManager } from './engine/AudioManager';
import { MusicManager } from './engine/MusicManager';
import { showToast } from './utils/toast';

// Setting: new games start with a ready-to-fly rocket on a launch pad
const START_WITH_ROCKET_KEY = 'tenebris_start_with_rocket';
function startWithRocket(): boolean {
  try {
    return localStorage.getItem(START_WITH_ROCKET_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Calculate the sun direction for a given planet position.
 * Returns a normalized vector pointing FROM the planet center TO the sun.
 */
function calculateSunDirectionForPlanet(planetCenter: THREE.Vector3, sunPosition: THREE.Vector3): THREE.Vector3 {
  return sunPosition.clone().sub(planetCenter).normalize();
}

class PlanetGame {
  private engine: GameEngine;
  private inputManager: InputManager;
  private planets: Map<string, Planet> = new Map();
  private earth: Planet; // Quick reference to starting planet
  private moon: Planet;  // Quick reference for backwards compatibility
  private sequoia: Planet; // Quick reference to Sequoia
  private player: PlanetPlayer;
  private blockInteraction: PlanetBlockInteraction;
  private treeManager: PlanetTreeManager;
  private mushroomTreeManager: MushroomTreeManager | null = null;
  private earthAtmosphere: Atmosphere | null = null;
  private earthClouds: CloudSystem = null!;
  private sequoiaAtmosphere: Atmosphere | null = null;
  private isReady: boolean = false;
  private elapsedTime: number = 0;
  private waterUpdateTimer: number = 0;
  private readonly WATER_UPDATE_INTERVAL = 5.0; // Update water every 5 seconds

  // Rocket flight system
  private rocketFlightManager: RocketFlightManager | null = null;

  // Fishing (rod in hand)
  private fishing: FishingSystem | null = null;

  // Online play (Settings toggle, or ?mp in the URL; ?server=ws://... overrides)
  private multiplayer: Multiplayer | null = null;

  // Mockups (Debug tab)
  private solarSystemMockup: SolarSystemMockup | null = null;
  private groundClutter: GroundClutter | null = null;
  private fauna: Fauna | null = null; // creatures round the player (per-planet rosters)
  private earthClutter = false; // biome mockup: clutter on Earth too
  private daytimeSkyMockup = false;

  // Shared frustum for all planet updates (calculated once per frame)
  private sharedFrustum: THREE.Frustum = new THREE.Frustum();
  private projScreenMatrix: THREE.Matrix4 = new THREE.Matrix4();

  // Sun position from solar system config (for per-planet lighting calculation)
  private sunPosition: THREE.Vector3 = new THREE.Vector3();

  private teleportInProgress: boolean = false;

  // Track if Sequoia trees have been scattered (happens when terrain is ready)
  private sequoiaTreesScattered: boolean = false;

  constructor(private worldError?: string) {
    const container = document.getElementById('game-container');
    if (!container) throw new Error('Game container not found');

    // Disable browser context menu on right-click
    container.addEventListener('contextmenu', (e) => e.preventDefault());

    // Initialize core systems
    this.engine = new GameEngine(container);
    this.inputManager = new InputManager();

    // Create planets from solar system config
    for (const bodyConfig of SOLAR_SYSTEM.bodies) {
      // Skip non-landable bodies like the sun for now
      if (!bodyConfig.landable) continue;

      // Spawn planet (Earth) gets detailed terrain immediately
      // Other planets only get LOD initially, detailed terrain when approached
      const isSpawnPlanet = bodyConfig.id === SOLAR_SYSTEM.startingBody;

      const planet = new Planet(
        this.engine.scene,
        bodyConfig.radius,
        bodyConfig.subdivisions,
        {
          name: bodyConfig.id,
          texturePath: bodyConfig.visual.texturePath,
          heightVariation: bodyConfig.visual.heightVariation,
          hasWater: bodyConfig.terrain.hasWater,
          seaLevel: bodyConfig.terrain.seaLevel,
          tileset: bodyConfig.tileset,
          waterColor: bodyConfig.terrain.waterColor,
          waterDeepColor: bodyConfig.terrain.waterDeepColor,
          lodColors: bodyConfig.visual.lodColors,
          isSpawnPlanet,
          intermediateLODAltitude: bodyConfig.intermediateLODAltitude,
          highLODAltitude: bodyConfig.highLODAltitude,
          distantLODAltitude: bodyConfig.distantLODAltitude,
          detailRenderDistance: bodyConfig.detailRenderDistance,
          seedOffset: bodyConfig.terrain.seed,
        }
      );
      this.planets.set(bodyConfig.id, planet);
    }

    // Set up quick references for backwards compatibility
    this.earth = this.planets.get('earth')!;
    this.moon = this.planets.get('moon')!;
    const sequoiaPlanet = this.planets.get('sequoia');
    if (!sequoiaPlanet) {
      throw new Error('Sequoia planet not found in planets map. Check SolarSystemConfig.');
    }
    this.sequoia = sequoiaPlanet;

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

    // Note: ESC key is handled natively by the browser to exit pointer lock.
    // When pointer lock exits, the callback shows the pause menu.
    // To close pause menu, user clicks PLAY button or X button (avoids SecurityError race condition).

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

    // Debug handle for automated testing / the browser console: ?debug in the URL
    // (or any dev server) exposes the game as window.__tenebris.
    if (import.meta.env.DEV || new URLSearchParams(window.location.search).has('debug')) {
      (window as unknown as { __tenebris: PlanetGame; __THREE: typeof THREE }).__tenebris = this;
      (window as unknown as { __THREE: typeof THREE }).__THREE = THREE;
    }

    this.init();
  }

  private async init(): Promise<void> {
    try {
      // Register loading steps - focus on spawn planet, defer others
      loadingManager.registerStep('audio', 1);
      loadingManager.registerStep('spawn-planet', 3);  // Earth - main loading focus
      loadingManager.registerStep('initial-terrain', 3);
      loadingManager.registerStep('player-setup', 1);
      loadingManager.registerStep('environment', 1);

      // Initialize audio system
      loadingManager.setStatus('Loading audio...');
      await AudioManager.init();
      loadingManager.completeStep('audio');

      // Position planets according to solar system config and get sun position FIRST
      // (needed before planet initialization for lighting calculations)
      for (const bodyConfig of SOLAR_SYSTEM.bodies) {
        if (bodyConfig.id === 'sun') {
          this.sunPosition.set(bodyConfig.position.x, bodyConfig.position.y, bodyConfig.position.z);
          this.engine.setSunPosition(this.sunPosition, bodyConfig.radius);
        }
        const planet = this.planets.get(bodyConfig.id);
        if (planet) {
          planet.center.set(bodyConfig.position.x, bodyConfig.position.y, bodyConfig.position.z);
        }
      }
      // Light every planet from the star now, before anything builds its
      // materials: a planet first initialized by a teleport or an approach
      // (not the deferred loop) used to keep the default sun - lit on the
      // wrong side.
      for (const planet of this.planets.values()) {
        planet.setSunDirection(calculateSunDirectionForPlanet(planet.center, this.sunPosition));
      }

      // Initialize ONLY the spawn planet (Earth) first - this is what matters for loading screen
      loadingManager.setStatus('Loading Earth textures...');
      loadingManager.setStepProgress('spawn-planet', 0.1);
      await this.earth.initialize();
      loadingManager.setStatus('Earth terrain generated');
      loadingManager.setStepProgress('spawn-planet', 0.6);
      this.earth.updateBoundingSpheres();
      loadingManager.completeStep('spawn-planet');

      // Build terrain where the player will actually appear: the saved
      // position if there is one (on whichever planet it is on), otherwise
      // Earth's spawn point. Building around Earth's spawn regardless used to
      // drop returning players into empty space and through the ground.
      loadingManager.setStatus('Building terrain around spawn...');
      const startPlanet = this.findSavedStartPlanet();
      if (startPlanet && startPlanet.planet !== this.earth) {
        loadingManager.setStatus(`Loading ${startPlanet.planet.getName()}...`);
        await startPlanet.planet.initialize();
        startPlanet.planet.updateBoundingSpheres();
        startPlanet.planet.setSunDirection(
          calculateSunDirectionForPlanet(startPlanet.planet.center, this.sunPosition)
        );
        await startPlanet.planet.enableDetailedTerrain();
        await startPlanet.planet.buildInitialTerrain(startPlanet.position);
      } else {
        const earthConfig = getBodyConfig('earth')!;
        const spawnPosition = startPlanet?.position ?? this.earth.getSpawnPositionAtLatLon(
          earthConfig.spawn?.latitude ?? 0,
          earthConfig.spawn?.longitude ?? 0,
          earthConfig.spawn?.altitudeAboveSurface ?? 3
        );
        // Wait for completion so terrain is ready before the player spawns
        await this.earth.buildInitialTerrain(spawnPosition);
      }
      loadingManager.completeStep('initial-terrain');

      // Initialize player on Earth surface
      loadingManager.setStatus('Initializing player...');
      this.player = new PlanetPlayer(this.engine.camera, this.inputManager, this.earth);

      // Add all other planets as celestial bodies with gravity from config
      for (const bodyConfig of SOLAR_SYSTEM.bodies) {
        // Skip the starting body (Earth) - it's already the primary planet
        if (bodyConfig.id === SOLAR_SYSTEM.startingBody) continue;
        // Skip non-landable bodies
        if (!bodyConfig.landable) continue;

        const planet = this.planets.get(bodyConfig.id);
        if (planet) {
          const gravityRadii = getGravityRadii(bodyConfig);
          this.player.addPlanet(planet, {
            gravityFullRadius: gravityRadii.fullRadius,
            gravityFalloffRadius: gravityRadii.falloffRadius,
            gravityStrength: bodyConfig.gravity.strength,
          });
        }
      }

      // Initialize block interaction with all planets
      this.blockInteraction = new PlanetBlockInteraction(
        Array.from(this.planets.values()),
        this.player,
        this.engine.scene
      );

      // Initialize tree manager and scatter trees on Earth
      // Pass sun direction calculated from Earth's position to the sun
      const earthSunDirForTrees = calculateSunDirectionForPlanet(this.earth.center, this.sunPosition);
      this.treeManager = new PlanetTreeManager(this.engine.scene, earthSunDirForTrees);

      // Load saved game data early so removed trees are available
      // (full load happens later but we need planet data now for tree generation)
      gameStorage.load();

      // Initialize music system with saved state (must be after gameStorage.load())
      const savedMusicState = gameStorage.getMusicState();
      await MusicManager.init(savedMusicState ? {
        lastPlayTime: savedMusicState.lastPlayTime,
        enabled: savedMusicState.enabled,
      } : undefined);

      // Set up music persistence callback
      MusicManager.setPersistCallback((state) => {
        gameStorage.saveMusicState({
          lastPlayTime: state.lastPlayTime,
          enabled: state.enabled,
        });
      });

      // Get removed trees from storage to skip them during generation
      const removedTreesData = gameStorage.getRemovedTrees('earth');
      const removedTiles = new Set(removedTreesData.map(t => t.tileIndex));

      this.treeManager.setChunkLookup((tileIndex) => this.earth.getTileChunkIndex(tileIndex));
      this.treeManager.scatterTrees(
        this.earth.center,
        this.earth.radius,
        PlayerConfig.TREE_COUNT,
        (direction) => this.earth.getSurfaceHeightInDirection(direction),
        (direction) => this.earth.isUnderwaterInDirection(direction), // Skip underwater locations
        PlayerConfig.TERRAIN_SEED, // Use terrain seed for deterministic placement
        (direction) => this.earth.getTileIndexInDirection(direction), // For visibility tracking
        (direction) => this.earth.getTileCenterInDirection(direction), // For centering trees on tiles
        removedTiles, // Skip tiles where trees were previously removed
        this.biomeTreeSpecies(this.earth)
      );

      // Fishing: a catch goes into the inventory
      this.fishing = new FishingSystem(this.engine.scene, this.engine.camera, (item) => {
        const left = this.blockInteraction.getInventory().addItem(item, 1);
        this.blockInteraction.onInventoryChanged();
        return left === 0;
      });

      // Give block interaction access to tree manager for mining trees
      this.blockInteraction.setTreeManager(this.treeManager);

      // Initialize rocket flight system
      this.rocketFlightManager = new RocketFlightManager(
        this.engine.scene,
        this.engine.camera,
        this.inputManager
      );

      // Register all landable planets for rocket gravity calculations
      for (const bodyConfig of SOLAR_SYSTEM.bodies) {
        if (!bodyConfig.landable) continue;

        const planet = this.planets.get(bodyConfig.id);
        if (planet) {
          this.rocketFlightManager.addPlanet(
            bodyConfig.name,
            planet.center,
            planet.radius,
            bodyConfig.gravity.strength,
            (direction) => planet.getSurfaceHeightInDirection(direction)
          );
        }
      }

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
      this.rocketFlightManager.setOnExitFlightCallback((exitPosition) => {
        // If we landed somewhere (not at launch pad), move player to rocket position
        if (exitPosition) {
          // Position player slightly above the rocket position, on the surface
          const surfaceNormal = exitPosition.clone().normalize();
          const playerSpawnPos = exitPosition.clone().addScaledVector(surfaceNormal, 3); // 3 units above rocket base
          this.player.position.copy(playerSpawnPos);
          console.log('Player spawned at landed rocket position:', playerSpawnPos);
        }

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

      // Refuelling burns Rocket Fuel items from the inventory (crafted from
      // ice or snow; see CraftingSystem), FUEL_PER_ITEM units each
      RocketController.fuelSource = (wanted) => {
        const inventory = this.blockInteraction.getInventory();
        const per = ROCKET_CONFIG.FUEL_PER_ITEM;
        const take = Math.min(Math.ceil(wanted / per), inventory.getItemCount(ItemType.ROCKET_FUEL));
        if (take <= 0) {
          showToast('No Rocket Fuel - craft it from ice or snow', { duration: 3000 });
          return 0;
        }
        inventory.removeItem(ItemType.ROCKET_FUEL, take);
        this.blockInteraction.onInventoryChanged();
        return Math.min(wanted, take * per);
      };

      // Crash (or manual abandon): respawn on the planet nearest the rocket
      this.rocketFlightManager.setOnRespawnCallback((rocketPosition) => {
        this.respawnOnNearestPlanet(rocketPosition);
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

      // Calculate sun direction for Earth
      const earthSunDir = calculateSunDirectionForPlanet(this.earth.center, this.sunPosition);

      // Create atmosphere for Earth (if enabled)
      loadingManager.setStatus('Creating environment...');
      if (PlayerConfig.ATMOSPHERE_ENABLED) {
        this.earthAtmosphere = createEarthAtmosphere(this.earth.radius, earthSunDir);
        this.earthAtmosphere.setPosition(this.earth.center);
        this.engine.scene.add(this.earthAtmosphere.getMesh());
      }

      // Create clouds for Earth
      this.earthClouds = createEarthClouds(this.earth.radius, earthSunDir);
      this.earthClouds.setPosition(this.earth.center);
      this.engine.scene.add(this.earthClouds.getGroup());

      // Set sun direction for Earth (other planets done in deferred init after they're loaded)
      this.earth.setSunDirection(earthSunDir);
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

      // Setup debug key handlers
      this.setupDebugKeys();

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

      console.log('Planet game started with Earth!');

      // Load other planets in background (Moon, Sequoia) after game is playable
      // This happens async while player is already exploring Earth
      this.initializeDeferredPlanets();

    } catch (error) {
      console.error('Failed to initialize game:', error);
    }
  }

  /**
   * Which planet the saved player position is on (nearest surface), or null
   * when there is no usable save.
   */
  private findSavedStartPlanet(): { planet: Planet; position: THREE.Vector3 } | null {
    const saveData = gameStorage.load();
    const pos = saveData?.player?.position;
    if (!pos) return null;
    const position = new THREE.Vector3(pos.x, pos.y, pos.z);

    let best: Planet | null = null;
    let bestAltitude = Infinity;
    for (const planet of this.planets.values()) {
      const altitude = position.distanceTo(planet.center) - planet.radius;
      if (altitude < bestAltitude) {
        bestAltitude = altitude;
        best = planet;
      }
    }
    // Same sanity check loadSavedGame() applies: a position deep inside a
    // planet is a corrupt/default save, not a place to load terrain around.
    if (!best || position.distanceTo(best.center) < best.radius * 0.5) return null;
    return { planet: best, position };
  }

  // Helper to yield to main thread between heavy operations
  private yieldToMainThread(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0));
  }

  // Initialize planets other than the spawn planet in the background
  // This runs after the loading screen is hidden so player can start playing immediately
  // Uses setTimeout to yield to main thread between heavy operations
  private async initializeDeferredPlanets(): Promise<void> {
    console.log('[Deferred] Starting background planet initialization...');
    const startTime = performance.now();

    // Initialize Moon (smaller, faster). initialize() is idempotent, so a
    // planet already loaded for a saved game is not built twice.
    if (this.moon) {
      console.log('[Deferred] Initializing Moon...');
      await this.yieldToMainThread();
      await this.moon.initialize();
      await this.yieldToMainThread();
      this.moon.updateBoundingSpheres();
      const moonSunDir = calculateSunDirectionForPlanet(this.moon.center, this.sunPosition);
      this.moon.setSunDirection(moonSunDir);
      console.log('[Deferred] Moon initialized');
    }

    // Yield before starting Sequoia (let a few frames render)
    await this.yieldToMainThread();

    // Initialize Sequoia (larger planet, takes longer)
    if (this.sequoia) {
      console.log('[Deferred] Initializing Sequoia...');
      await this.yieldToMainThread();
      await this.sequoia.initialize();
      await this.yieldToMainThread();
      this.sequoia.updateBoundingSpheres();

      // Set up Sequoia-specific things that depend on initialization
      const sequoiaSunDir = calculateSunDirectionForPlanet(this.sequoia.center, this.sunPosition);
      this.sequoia.setSunDirection(sequoiaSunDir);

      await this.yieldToMainThread();

      // Create atmosphere for Sequoia (with reddish tint)
      const sequoiaConfig = getBodyConfig('sequoia')!;
      if (sequoiaConfig.hasAtmosphere && PlayerConfig.ATMOSPHERE_ENABLED) {
        this.sequoiaAtmosphere = createAtmosphere(
          this.sequoia.radius,
          sequoiaSunDir,
          sequoiaConfig.visual.atmosphereTint
        );
        this.sequoiaAtmosphere.setPosition(this.sequoia.center);
        this.engine.scene.add(this.sequoiaAtmosphere.getMesh());
      }

      // NOTE: Mushroom trees require terrain data which is generated on-demand when approaching
      // Trees will be scattered in the update loop after terrain is ready
      // (see scatterSequoiaTreesOnce() called when detailed terrain becomes available)

      // Register LOD transition callback for atmosphere entry feedback
      this.sequoia.setLODTransitionCallback((enteringDetailedTerrain) => {
        if (enteringDetailedTerrain) {
          showToast('Entering Sequoia atmosphere...', { duration: 3000 });
        }
      });

      console.log('[Deferred] Sequoia initialized with atmosphere (trees on approach)');
    }

    // The barren worlds: LOD only (a sphere to see from afar), one at a
    // time with frames in between. Their terrain is generated on approach
    // or teleport (Planet.update -> enableDetailedTerrain), not now, so
    // eight extra planets cost nothing until someone goes there.
    for (const planet of this.planets.values()) {
      if (planet === this.earth || planet === this.moon || planet === this.sequoia) continue;
      await this.yieldToMainThread();
      await planet.initialize();
      planet.updateBoundingSpheres();
      planet.setSunDirection(calculateSunDirectionForPlanet(planet.center, this.sunPosition));
    }

    const elapsed = performance.now() - startTime;
    console.log(`[Deferred] All planets initialized in ${elapsed.toFixed(0)}ms`);

    // Generate the other planets' terrain data in the background now, in a
    // worker, so arriving at them later doesn't stall on it. One planet at a
    // time to keep worker and memory pressure low.
    for (const planet of [this.moon, this.sequoia]) {
      if (!planet) continue;
      await this.yieldToMainThread();
      await planet.ensureTerrainGenerated();
    }
    console.log(`[Deferred] Background terrain ready in ${(performance.now() - startTime).toFixed(0)}ms`);
  }

  private update(deltaTime: number): void {
    if (!this.isReady) return;

    // Track elapsed time for shader animations
    this.elapsedTime += deltaTime;

    // Update audio listener position from camera
    const cameraForward = new THREE.Vector3();
    this.engine.camera.getWorldDirection(cameraForward);
    AudioManager.setListenerPosition(
      this.engine.camera.position,
      cameraForward,
      this.engine.camera.up
    );

    // Update music system (checks if time to play new song)
    MusicManager.update();

    this.multiplayer?.update(deltaTime);
    // Ground clutter (grass tufts, rocks): always on Sequoia, on Earth with
    // the biome mockup
    if (!this.groundClutter) {
      this.groundClutter = new GroundClutter(this.engine.scene);
      this.groundClutter.setEnabled(true);
    }
    {
      const pos = this.player.position;
      let on: Planet | null = null;
      if (this.sequoia && pos.distanceTo(this.sequoia.center) < this.sequoia.radius * 1.2) on = this.sequoia;
      else if (this.moon && pos.distanceTo(this.moon.center) < this.moon.radius * 1.2) on = this.moon;
      else if (this.earthClutter && pos.distanceTo(this.earth.center) < this.earth.radius * 1.2) on = this.earth;
      this.groundClutter.update(deltaTime, pos, on,
        calculateSunDirectionForPlanet((on ?? this.earth).center, this.sunPosition));
    }
    // Fauna: on whichever planet the player stands on; the roster table
    // decides who lives there (a planet with no roster spawns nothing)
    if (!this.fauna) {
      validateFaunaRosters(this.planets.keys());
      this.fauna = new Fauna(this.engine.scene);
    }
    {
      const pos = this.player.position;
      let on: Planet | null = null;
      for (const planet of this.planets.values()) {
        if (pos.distanceTo(planet.center) < planet.radius * 1.2) { on = planet; break; }
      }
      profiler.begin('Fauna');
      this.fauna.update(deltaTime, pos, on,
        calculateSunDirectionForPlanet((on ?? this.earth).center, this.sunPosition));
      profiler.end('Fauna');
    }
    if (this.solarSystemMockup) {
      const cam = this.engine.camera.position;
      let inSpace = true;
      for (const planet of this.planets.values()) {
        if (cam.distanceTo(planet.center) - planet.radius < planet.radius * 1.5) inSpace = false;
      }
      this.solarSystemMockup.update(deltaTime, inSpace);
    }
    this.updateDaytimeSky();

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

      // Fishing takes the mouse buttons while the rod is in hand
      const holdingRod = isGameActive &&
        this.blockInteraction.getInventory().getSelectedItem().itemType === ItemType.FISHING_ROD;
      const fishing = this.fishing?.update(
        deltaTime, holdingRod, this.player.getCurrentPlanet(), this.player.position,
        input.leftClick, input.rightClick
      ) ?? false;

      // Update block interaction FIRST - this handles torch placement/removal
      // which marks tiles dirty and updates torch data on planets immediately
      profiler.begin('Block Interaction');
      const wheelDelta = this.inputManager.getWheelDelta();
      this.blockInteraction.update(
        deltaTime,
        isGameActive && input.leftClick && !fishing,
        isGameActive && input.rightClick && !handledRocketInteraction && !fishing,
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

    // Use rocket position for LOD when in flight mode, otherwise use player position
    const lodPosition = inFlightMode && this.rocketFlightManager?.getRocketController()
      ? this.rocketFlightManager.getRocketController()!.getPosition()
      : this.player.position;

    profiler.begin('Earth Update');
    this.earth.update(lodPosition, this.engine.camera, deltaTime, this.sharedFrustum);
    profiler.end('Earth Update');

    // The other planets, once initialized (deferred loading). Sequoia is
    // updated below with its trees.
    profiler.begin('Other Planets Update');
    for (const planet of this.planets.values()) {
      if (planet === this.earth || planet === this.sequoia || !planet.isInitialTerrainReady()) continue;
      planet.update(lodPosition, this.engine.camera, deltaTime, this.sharedFrustum);
    }
    profiler.end('Other Planets Update');

    if (this.sequoia.isInitialTerrainReady()) {
      profiler.begin('Sequoia Update');
      this.sequoia.update(lodPosition, this.engine.camera, deltaTime, this.sharedFrustum);
      profiler.end('Sequoia Update');

      // Scatter Sequoia trees once terrain is ready (deferred from initialization)
      if (!this.sequoiaTreesScattered && this.sequoia.isDetailedTerrainEnabled()) {
        this.scatterSequoiaTreesOnce();
      }
    }

    // Update water shader for animation (Earth and Sequoia have water)
    const isUnderwater = this.player.getIsInWater();
    this.earth.updateWaterShader(this.elapsedTime, isUnderwater);
    if (this.sequoia.isInitialTerrainReady()) {
      this.sequoia.updateWaterShader(this.elapsedTime, isUnderwater);
    }

    // Update atmospheres (need camera position for fresnel effect)
    if (this.earthAtmosphere) {
      this.earthAtmosphere.updateCameraPosition(this.engine.camera.position);
    }
    if (this.sequoiaAtmosphere) {
      this.sequoiaAtmosphere.updateCameraPosition(this.engine.camera.position);
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

    // Update tree visibility based on visible tiles/chunks
    // Trees are culled to match LOD chunk visibility - only show trees on visible terrain
    if (this.earth.isInOrbitView()) {
      this.treeManager.setAllVisible(false);
    } else {
      this.treeManager.updateVisibility(this.earth.getVisibleTreeChunks());
    }

    // Same visibility handling for Sequoia's mushroom trees (only if Sequoia is initialized)
    if (this.mushroomTreeManager && this.sequoia.isInitialTerrainReady()) {
      if (this.sequoia.isInOrbitView()) {
        this.mushroomTreeManager.setAllVisible(false);
      } else {
        this.mushroomTreeManager.updateVisibility(this.sequoia.getVisibleTreeChunks());
      }
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
      // Player is looking at a landed rocket - open the boarding UI
      this.rocketFlightManager.openLandedRocketUI(result.rocket);
      return true;
    }

    return false;
  }

  // Scatter mushroom trees on Sequoia - called once when terrain becomes ready
  private scatterSequoiaTreesOnce(): void {
    if (this.sequoiaTreesScattered) return;
    this.sequoiaTreesScattered = true;

    console.log('[Deferred] Scattering Sequoia mushroom trees...');
    const sequoiaSunDir = calculateSunDirectionForPlanet(this.sequoia.center, this.sunPosition);

    this.mushroomTreeManager = new MushroomTreeManager(this.engine.scene, sequoiaSunDir);
    const removedSequoiaTrees = gameStorage.getRemovedTrees('sequoia');
    const removedSequoiaTiles = new Set(removedSequoiaTrees.map(t => t.tileIndex));
    this.mushroomTreeManager.setChunkLookup((tileIndex) => this.sequoia.getTileChunkIndex(tileIndex));
    this.mushroomTreeManager.scatterTrees(
      this.sequoia.center,
      this.sequoia.radius,
      PlayerConfig.TREE_COUNT * 2,  // More trees since Sequoia is 2x larger
      (direction) => this.sequoia.getSurfaceHeightInDirection(direction),
      (direction) => this.sequoia.isUnderwaterInDirection(direction),
      PlayerConfig.TERRAIN_SEED + 100,  // Different seed for variety
      (direction) => this.sequoia.getTileIndexInDirection(direction),
      (direction) => this.sequoia.getTileCenterInDirection(direction),
      removedSequoiaTiles,
      (tileIndex, roll) => {
        // Sequoia's biomes: ferns and lantern trees in the grassland,
        // redwoods on the snowy heights, the odd lantern tree in the
        // desert, nothing on bare rock
        // One tree species per biome, never a mix: tree ferns on the dry scrub
        // lowlands, redwoods on the needle duff, scattered lantern trees on
        // the dry plains; nothing in the desert, on rock or snow
        const top = this.topBlock(this.sequoia, tileIndex);
        if (top === HexBlockType.SEQ_SCRUB) return 'treefern';
        if (top === HexBlockType.SEQ_DUFF) return 'redwood';
        if (top === HexBlockType.SEQ_GRASS) return roll < 0.3 ? 'lantern' : null;
        return null;
      }
    );
    console.log('[Deferred] Sequoia mushroom trees scattered');
  }

  // Setup debug keyboard shortcuts
  private setupDebugKeys(): void {
    document.addEventListener('keydown', (e) => {
      // F4 to toggle detailed terrain visibility on the closest planet
      // This hides the detailed terrain so you can see the LOD underneath
      if (e.code === 'F4') {
        e.preventDefault();
        // Find the closest planet to the player
        const playerPos = this.player.position;
        let closestPlanet: Planet | null = null;
        let closestDist = Infinity;

        for (const planet of this.planets.values()) {
          const dist = playerPos.distanceTo(planet.center);
          if (dist < closestDist) {
            closestDist = dist;
            closestPlanet = planet;
          }
        }

        if (closestPlanet) {
          closestPlanet.toggleDetailedTerrainVisibility();
        }
      }
    });
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

    // Handle music toggle
    const musicToggle = document.getElementById('toggle-music') as HTMLInputElement;
    if (musicToggle) {
      musicToggle.checked = MusicManager.isEnabled();

      musicToggle.addEventListener('change', () => {
        MusicManager.setEnabled(musicToggle.checked);
      });
    }

    // Handle play music button
    const playMusicBtn = document.getElementById('play-music-btn');
    if (playMusicBtn) {
      playMusicBtn.addEventListener('click', () => {
        MusicManager.playRandomSong();
      });
    }

    // Handle teleport dropdown (Debug tab). Reset it afterwards so picking
    // the same planet again still fires 'change'.
    if (teleportSelect) {
      // One option per landable body, straight from the solar system config
      for (const body of SOLAR_SYSTEM.bodies) {
        if (!body.landable) continue;
        const option = document.createElement('option');
        option.value = body.id;
        option.textContent = body.name;
        teleportSelect.appendChild(option);
      }
      teleportSelect.addEventListener('change', () => {
        const target = teleportSelect.value;
        teleportSelect.value = '';
        if (target) this.teleportToPlanet(target);
      });
    }

    // "New games start with a rocket" (applies the next time a game starts
    // without a save, e.g. after Reset)
    const startRocketToggle = document.getElementById('toggle-start-rocket') as HTMLInputElement | null;
    if (startRocketToggle) {
      startRocketToggle.checked = startWithRocket();
      startRocketToggle.addEventListener('change', () => {
        try { localStorage.setItem(START_WITH_ROCKET_KEY, startRocketToggle.checked ? '1' : '0'); } catch { /* storage blocked */ }
      });
    }

    // Debug: a ready-to-fly rocket on a pad next to the player
    const spawnRocketBtn = document.getElementById('spawn-rocket-btn');
    if (spawnRocketBtn) {
      spawnRocketBtn.addEventListener('click', async () => {
        const planet = this.player.getCurrentPlanet() ?? this.earth;
        const ok = await this.blockInteraction.placeStarterRocket(planet, this.player.position);
        showToast(ok ? 'Rocket ready on a launch pad nearby' : 'No flat dry ground nearby for a launch pad', { duration: 3000 });
      });
    }

    this.setupMultiplayer();
    this.setupMockups();

    // Respawn on the nearest planet's spawn point (works on foot or in flight)
    const respawnBtn = document.getElementById('respawn-planet-btn');
    if (respawnBtn) {
      respawnBtn.addEventListener('click', () => this.respawnOnNearestPlanet());
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

    // Handle pause menu close button
    const pauseCloseBtn = document.getElementById('pause-close-btn');
    const container = document.getElementById('game-container');
    if (pauseCloseBtn && container) {
      pauseCloseBtn.addEventListener('click', () => {
        container.requestPointerLock();
      });
    }
  }

  /**
   * Prepare a planet for teleportation by ensuring terrain is generated and ready.
   * Shows a loading overlay with progress bar during preparation.
   */
  private async preparePlanetForTeleport(planet: Planet, planetName: string): Promise<void> {
    const overlay = document.getElementById('planet-prep-overlay');
    const titleEl = document.getElementById('planet-prep-title');
    const statusEl = document.getElementById('planet-prep-status');
    const progressBar = document.getElementById('planet-prep-progress-bar');

    // Show overlay
    if (overlay) overlay.classList.remove('hidden');
    if (titleEl) titleEl.textContent = `Preparing ${planetName.charAt(0).toUpperCase() + planetName.slice(1)}`;
    if (progressBar) progressBar.style.width = '0%';

    // Step 0: the planet may still be loading in the background
    if (!planet.isInitialized()) {
      if (statusEl) statusEl.textContent = 'Loading planet...';
      await planet.initialize();
      planet.updateBoundingSpheres();
    }

    // Step 1: Generate terrain data if not done (0-50%)
    if (!planet.isDetailedTerrainEnabled()) {
      if (statusEl) statusEl.textContent = 'Generating terrain...';
      if (progressBar) progressBar.style.width = '25%';
      await planet.enableDetailedTerrain();
    }
    if (progressBar) progressBar.style.width = '50%';

    // Step 2: Build the detailed terrain mesh around the landing spot (50-100%)
    if (statusEl) statusEl.textContent = 'Building terrain mesh...';
    const bodyConfig = getBodyConfig(planetName);
    const spawnPos = planet.getSpawnPositionAtLatLon(
      bodyConfig?.spawn?.latitude ?? 0,
      bodyConfig?.spawn?.longitude ?? 0,
      1
    );
    await planet.buildInitialTerrain(spawnPos);
    if (progressBar) progressBar.style.width = '100%';

    // Brief delay to show completion before hiding
    await new Promise(resolve => setTimeout(resolve, 200));

    // Hide overlay
    if (overlay) overlay.classList.add('hidden');
  }

  private topBlock(planet: Planet, tileIndex: number): number {
    for (let d = planet.getMaxDepth() - 1; d >= 0; d--) {
      const b = planet.getBlock(tileIndex, d);
      if (b !== HexBlockType.AIR) return b;
    }
    return HexBlockType.AIR;
  }

  // Biome mockup: trees follow the ground. Temperate grass grows oak and
  // birch with some pine, tundra grows pine, nothing grows on bare rock,
  // alpine snow or open desert.
  private biomeTreeSpecies(planet: Planet): ((tileIndex: number, roll: number) => EarthTreeSpecies | null | undefined) {
    let on = false;
    try { on = localStorage.getItem('tenebris_mock_biomes') === '1'; } catch { /* blocked */ }
    if (!on) {
      // Without biomes every land tile can grow trees, still in stands
      return (tileIndex, roll) => standSpecies(planet.getTileByIndex(tileIndex)!.center.clone().normalize(), ['oak', 'birch', 'pine'] as const, roll, 101);
    }
    return (tileIndex, roll) => {
      // One tree species per biome, never a mix: oak on temperate grass,
      // birch on the forest floor, pine in the tundra; nothing on the
      // savanna, rock, snow or open desert
      const top = this.topBlock(planet, tileIndex);
      if (top === HexBlockType.GRASS) return 'oak';
      if (top === HexBlockType.FOREST_FLOOR) return 'birch';
      if (top === HexBlockType.DIRT_SNOW) return roll < 0.6 ? 'pine' : null;
      return null;
    };
  }

  // Debug-tab mockups: prototypes to judge a look before building it for real
  private setupMockups(): void {
    const bind = (id: string, key: string, apply: (on: boolean) => void) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      let on = false;
      try { on = localStorage.getItem(key) === '1'; } catch { /* blocked */ }
      if (el) {
        el.checked = on;
        el.addEventListener('change', () => {
          try { localStorage.setItem(key, el.checked ? '1' : '0'); } catch { /* blocked */ }
          apply(el.checked);
        });
      }
      apply(on);
    };
    bind('toggle-mock-sky', 'tenebris_mock_sky', (on) => {
      this.daytimeSkyMockup = on;
      if (!on) this.engine.setStarVisibility(1);
    });
    bind('toggle-mock-trees', 'tenebris_mock_trees', (on) => setImprovedTreeShading(on));
    // Terrain and tree biomes are read at load (reload to change them); the
    // ground clutter follows the toggle live
    bind('toggle-mock-biomes', 'tenebris_mock_biomes', (on) => { this.earthClutter = on; });
    // The gas giants are part of the system now, not a toggle
    this.solarSystemMockup = new SolarSystemMockup(this.engine.farRoot, this.sunPosition, this.engine.farOrigin);
    this.solarSystemMockup.setEnabled(true);
  }

  // Daytime sky mockup: inside an atmosphere, on the day side, the stars
  // and nebula fade out (they used to show through the daytime sky)
  private updateDaytimeSky(): void {
    if (!this.daytimeSkyMockup) return;
    const cam = this.engine.camera.position;
    let visibility = 1;
    for (const body of SOLAR_SYSTEM.bodies) {
      if (!body.hasAtmosphere || !body.landable) continue;
      const planet = this.planets.get(body.id);
      if (!planet) continue;
      const toCam = cam.clone().sub(planet.center);
      const altitude = toCam.length() - planet.radius;
      const atmosphere = planet.radius * 0.35;
      const inside = 1 - THREE.MathUtils.smoothstep(altitude, atmosphere * 0.4, atmosphere);
      const sunDir = this.sunPosition.clone().sub(planet.center).normalize();
      const day = THREE.MathUtils.smoothstep(toCam.normalize().dot(sunDir), -0.15, 0.3);
      visibility = Math.min(visibility, 1 - 0.97 * inside * day);
    }
    this.engine.setStarVisibility(visibility);
  }

  private setupMultiplayer(): void {
    const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
    const write = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* blocked */ } };

    const nameInput = document.getElementById('mp-name') as HTMLInputElement | null;
    let name = read('tenebris_mp_name') || `Player${Math.floor(Math.random() * 1000)}`;
    if (nameInput) {
      nameInput.value = name;
      nameInput.addEventListener('change', () => {
        name = nameInput.value.trim().slice(0, 16) || name;
        write('tenebris_mp_name', name);
      });
      // Typing in the box must not drive the player
      nameInput.addEventListener('keydown', (e) => e.stopPropagation());
    }

    // Server browser: list worlds, create one, join one (reloads into it)
    const browser = new WorldBrowser();
    document.getElementById('world-browser-btn')?.addEventListener('click', () => browser.open());
    if (this.worldError) showToast(this.worldError, { duration: 5000 });

    // In a server world: go online in it
    const world = currentWorld();
    if (!world) return;
    const label = document.getElementById('world-label');
    if (label) label.textContent = `Online: ${world.name}`;
    showToast(`World: ${world.name}`, { duration: 3000 });
    this.multiplayer = new Multiplayer(this.engine.scene, this.planets, () => {
      const flying = this.rocketFlightManager?.isInFlight() ? this.rocketFlightManager.getRocketController() : null;
      const p = flying ? flying.getPosition() : this.player.position;
      let planet = this.player.getCurrentPlanet()?.getName();
      if (!planet) {
        let best = Infinity;
        for (const [id, pl] of this.planets) {
          const alt = p.distanceTo(pl.center) - pl.radius;
          if (alt < best) { best = alt; planet = id; }
        }
      }
      const o = this.player.exportForSave().orientation;
      return { planet: planet ?? 'earth', p, q: new THREE.Quaternion(o.x, o.y, o.z, o.w) };
    }, name);
    this.multiplayer.connect(worldSocketUrl(world.id));
  }

  /**
   * Respawn the player at the spawn point of the planet nearest `from`
   * (default: where the player or their rocket is). In flight this abandons
   * the rocket first; the flight manager then calls back here with the
   * rocket's position. One path for crash, manual and menu respawns.
   */
  private respawnOnNearestPlanet(from?: THREE.Vector3): void {
    if (this.rocketFlightManager?.isInFlight()) {
      this.rocketFlightManager.respawnAfterCrash();
      return;
    }
    const position = from ?? this.player.position;
    let nearest = SOLAR_SYSTEM.startingBody;
    let bestAltitude = Infinity;
    for (const [id, planet] of this.planets) {
      const altitude = position.distanceTo(planet.center) - planet.radius;
      if (altitude < bestAltitude) {
        bestAltitude = altitude;
        nearest = id;
      }
    }
    console.log(`Respawning on ${nearest}`);
    this.player.setEnabled(true);
    this.teleportToPlanet(nearest);
  }

  private async teleportToPlanet(planetName: string): Promise<void> {
    const planet = this.planets.get(planetName);
    if (!planet) {
      console.warn(`Unknown planet: ${planetName}`);
      return;
    }

    // Ensure the landing spot has detailed terrain before teleporting. A
    // planet in LOD-only mode reports isInitialTerrainReady() too, so that
    // check used to skip preparation and land the player on nothing.
    if (this.teleportInProgress) return;
    this.teleportInProgress = true;
    try {
      await this.preparePlanetForTeleport(planet, planetName);
    } finally {
      this.teleportInProgress = false;
    }

    const surfaceOffset = 1; // 1m above surface
    let playerPos: THREE.Vector3;

    // Position player on the surface using actual terrain height
    // Use spawn config if available, otherwise default positioning
    const bodyConfig = getBodyConfig(planetName);
    if (bodyConfig?.spawn) {
      playerPos = planet.getSpawnPositionAtLatLon(
        bodyConfig.spawn.latitude,
        bodyConfig.spawn.longitude,
        surfaceOffset
      );
    } else {
      // Fallback: position facing toward origin (X-)
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
      if (startWithRocket()) {
        this.blockInteraction.placeStarterRocket(this.earth, this.player.position);
        // Enough for a refuel on the way back
        this.blockInteraction.getInventory().addItem(ItemType.ROCKET_FUEL, 4);
        this.blockInteraction.onInventoryChanged();
      }
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
// The world (seed + save slot) is settled before anything is built
document.addEventListener('DOMContentLoaded', async () => {
  const { error } = await prepareWorld();
  new PlanetGame(error);
});
