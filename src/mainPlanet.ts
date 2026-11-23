import { setMachineLight } from './planet/MachineLight';
import * as THREE from 'three';
import { GameEngine } from './engine/GameEngine';
import { InputManager, lockPointer } from './engine/InputManager';
import { Planet } from './planet/Planet';
import { PlanetPlayer } from './player/PlanetPlayer';
import { PlanetBlockInteraction } from './player/PlanetBlockInteraction';
import { PlanetTreeManager, FloraTreeManager, FloraSpecies, EarthTreeSpecies, standSpecies } from './planet/Tree';
import { HexBlockType } from './shared/blockTypes';
import { Atmosphere, createEarthAtmosphere, createAtmosphere, skyParamsFor } from './planet/Atmosphere';
import { skyLightTexture } from './planet/SkyLightTexture';
import { CloudSystem, createEarthClouds } from './planet/Clouds';
import { PlayerConfig } from './config/PlayerConfig';
import { MACHINE_KIND_OF } from './config/PowerConfig';
import { SOLAR_SYSTEM, getBodyConfig, getGravityRadii, GAS_GIANTS, CelestialBodyType, bodyClearanceProblems } from './config/SolarSystemConfig';
import { profiler } from './engine/Profiler';
import { gameStorage } from './engine/GameStorage';
import { loadingManager } from './engine/LoadingManager';
import { MenuManager } from './player/MenuManager';
import { initScreenshotHandler } from './utils/screenshot';
import { RocketFlightManager, RocketController, RocketState, ROCKET_CONFIG } from './rocket';
import { drawFuel, slotStore, stackItemTypes } from './rocket/RocketPerformance';
import { RocketSync } from './rocket/RocketSync';
import { ItemType, ITEM_DATA, toolOf } from './player/Inventory';
import { toolIndexFor } from './player/Tools';
import { FishingSystem } from './player/Fishing';
import { Multiplayer } from './net/Multiplayer';
import { MissionsPanel } from './player/MissionsPanel';
import { MissionHud } from './player/MissionHud';
import { emitGameEvent, onGameEvent } from './engine/GameEvents';
import { advanceGameTime, Frame, framePositionAt, frameVelocityAt, frameYawAt, gameTimeS, nextFrame, orbitOf, setLocalGameTime, spinOf, spinYawAt, useNetworkClock } from './world/Orbits';
import { ORBIT_CONFIG } from './config/OrbitConfig';
import { PlanetObjectRouter, planetObjectScene, setPlanetObjectRouter } from './world/PlanetFrames';
import { showTitleScreen, titleWanted } from './net/TitleScreen';
import { Navigation } from './nav/Navigation';
import { CharacterCreator } from './net/CharacterCreator';
import { loadMyLook } from './net/Avatar';
import { WorldBrowser } from './net/WorldBrowser';
import { currentWorld, prepareWorld, worldSocketUrl } from './net/WorldSession';
import { SolarSystemMockup } from './mockups/SolarSystemMockup';
import { GroundClutter } from './mockups/GroundClutter';
import { Fauna } from './planet/Fauna';
import { netSync } from './net/NetSync';
import { validateFaunaRosters } from './config/FaunaConfig';
import { setImprovedTreeShading } from './planet/Tree';
import { AudioManager } from './engine/AudioManager';
import { MusicManager } from './engine/MusicManager';
import { showToast } from './utils/toast';
import { AirSystem } from './player/AirSystem';
import type { ExposureInput } from './player/Survival';

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
/** Sea level: where people stand, and what the sun sets behind */
function groundRadiusOf(planet: Planet): number {
  return planet.depthToRadius(planet.getSeaLevelDepth());
}

function calculateSunDirectionForPlanet(planetCenter: THREE.Vector3, sunPosition: THREE.Vector3): THREE.Vector3 {
  return sunPosition.clone().sub(planetCenter).normalize();
}

// Background loading holds the main thread at most this long between frames
const DEFERRED_SLICE_MS = 30;

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
  // Each planet's own flora (Sequoia, the living alien worlds), scattered
  // once its detailed terrain is ready; keyed by planet id
  private floraManagers: Map<string, FloraTreeManager> = new Map();
  private earthAtmosphere: Atmosphere | null = null;
  private earthClouds: CloudSystem = null!;
  // Atmospheres of the other worlds that have one (Sequoia, the jungle moons)
  private atmospheres: Atmosphere[] = [];
  private isReady: boolean = false;
  private elapsedTime: number = 0;
  private waterUpdateTimer: number = 0;
  private readonly WATER_UPDATE_INTERVAL = 5.0; // Update water every 5 seconds

  // Rocket flight system
  private rocketFlightManager: RocketFlightManager | null = null;

  // Fishing (rod in hand)
  private fishing: FishingSystem | null = null;
  // The interact button was down last frame (a battery swap fires once per press)
  private rightClickHeld = false;

  // Online play (Settings toggle, or ?mp in the URL; ?server=ws://... overrides)
  private multiplayer: Multiplayer | null = null;
  private navigation: Navigation | null = null;
  private rocketSync: RocketSync | null = null;

  // Mockups (Debug tab)
  private solarSystemMockup: SolarSystemMockup | null = null;
  private groundClutter: GroundClutter | null = null;
  private fauna: Fauna | null = null; // creatures round the player (per-planet rosters)
  private daytimeSkyMockup = false;

  // Shared frustum for all planet updates (calculated once per frame)
  private sharedFrustum: THREE.Frustum = new THREE.Frustum();
  private projScreenMatrix: THREE.Matrix4 = new THREE.Matrix4();

  // Sun position from solar system config (for per-planet lighting calculation)
  private sunPosition: THREE.Vector3 = new THREE.Vector3();

  private teleportInProgress: boolean = false;
  private releaseTimer = 0;
  private missions: MissionsPanel | null = null;
  private missionHud: MissionHud | null = null;
  // Air and the space suit (openspec wool-air-and-reentry, design 4)
  private air: AirSystem | null = null;
  // Live orbits: the body whose frame the player is in (it never moves),
  // turning with it near it, held still out in space (openspec day-night)
  private frame: Frame = { body: SOLAR_SYSTEM.startingBody };
  private atmosphereById = new Map<string, Atmosphere>();
  private lastSunDir = new Map<string, THREE.Vector3>();

  // Track if Sequoia trees have been scattered (happens when terrain is ready)

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
          city: bodyConfig.terrain.city,
          biomes: bodyConfig.terrain.biomes,
          blockRemap: bodyConfig.terrain.blockRemap,
          maxDepth: bodyConfig.terrain.maxDepth,
          volcanoes: bodyConfig.terrain.volcanoes,
          iceCover: bodyConfig.terrain.iceCover,
          metalRich: bodyConfig.terrain.metalRich,
          extraOres: bodyConfig.terrain.extraOres,
          shoreClay: bodyConfig.terrain.shoreClay,
          spawnLatLon: bodyConfig.spawn,
        }
      );
      this.planets.set(bodyConfig.id, planet);
      // Its sky light: sun and fill from its own atmosphere, or none (openspec sky-lighting)
      planet.setSkyLight(skyLightTexture(bodyConfig.hasAtmosphere
        ? skyParamsFor(planet.radius, groundRadiusOf(planet), bodyConfig.visual.atmosphereTint)
        : null));
    }

    // Things placed on a planet ride it round its orbit: the object
    // managers add to this router, which hangs each object under its
    // planet's attach root (openspec navigation-and-orbits 8.1)
    setPlanetObjectRouter(new PlanetObjectRouter(this.engine.scene, () => [...this.planets.values()].map(p => ({
      root: p.attachRoot, configuredCenter: p.configuredCenter, radius: p.radius,
    }))));

    for (const problem of bodyClearanceProblems()) console.warn(`[SolarSystem] bodies too close: ${problem}`);

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
      (window as unknown as { __orbits: unknown }).__orbits = {
        setLocalGameTime, gameTimeS, framePositionAt, orbitOf, spinOf, spinYawAt,
        frame: () => ({ ...this.frame }),
      };
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
          planet.setConfiguredCenter(new THREE.Vector3(bodyConfig.position.x, bodyConfig.position.y, bodyConfig.position.z));
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
      // The body the player starts on is the fixed frame (orbits)
      if (startPlanet) this.frame = { body: startPlanet.planet.getName() };
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
      this.treeManager = new PlanetTreeManager(planetObjectScene(this.engine.scene), earthSunDirForTrees);
      this.treeManager.setSkyLight(this.earth.getSkyLight());

      // Load saved game data early so removed trees are available
      // (full load happens later but we need planet data now for tree generation)
      gameStorage.load();
      // The world's game clock: the bodies' orbits run on it
      setLocalGameTime(gameStorage.getGameTime());

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
        if (left === 0) {
          emitGameEvent('caught', item);
          emitGameEvent('caughtOn', this.player.getCurrentPlanet()?.getName() ?? 'earth');
        }
        return left === 0;
      }, () => {
        // Each cast is one use of the rod in hand (openspec tools-and-toolbox)
        const rod = toolIndexFor(this.blockInteraction.getInventory(), 'rod');
        if (rod !== null) this.blockInteraction.wearSlot(rod);
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
            (direction) => planet.getSurfaceHeightInDirection(direction),
            bodyConfig.hasAtmosphere
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
        // The walker takes the rocket camera's view, so climbing out does
        // not snap the look (openspec player-heading; PBD drop_walker)
        const cam = this.engine.camera;
        const view = {
          forward: cam.getWorldDirection(new THREE.Vector3()),
          up: new THREE.Vector3(0, 1, 0).applyQuaternion(cam.quaternion),
        };
        // If we landed somewhere (not at launch pad), move player to rocket position
        if (exitPosition) {
          // Position player slightly above the rocket position, on the surface
          // of the body it landed on (radial from that body's centre)
          const bodyId = this.sphereOfInfluence(exitPosition);
          const body = bodyId ? this.planets.get(bodyId) : undefined;
          const surfaceNormal = body ? body.getSurfaceNormal(exitPosition) : exitPosition.clone().normalize();
          const playerSpawnPos = exitPosition.clone().addScaledVector(surfaceNormal, 3); // 3 units above rocket base
          this.player.placeAt(playerSpawnPos, view);
          console.log('Player spawned at landed rocket position:', playerSpawnPos);
        } else {
          this.player.placeAt(this.player.position, view);
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
        lockPointer();
      });

      // Refuelling burns fuel items - Rocket Fuel, Water Buckets (the empty
      // bucket comes back), Ice - from the rocket's cargo hold first, then
      // the hotbar + bag (ROCKET_CONFIG.FUEL_SOURCES, RocketPerformance.drawFuel)
      RocketController.fuelSource = (wanted, cargo) => {
        const inventory = this.blockInteraction.getInventory();
        const stores = cargo ? [slotStore(cargo), inventory] : [inventory];
        const draw = drawFuel(wanted, stores);
        if (draw.supplied <= 0) {
          showToast('No fuel - carry Rocket Fuel, Water Buckets or Ice', { duration: 3000 });
          return 0;
        }
        const what = draw.used.map(u => `${u.count} ${ITEM_DATA[u.itemType].name}`).join(', ');
        showToast(`Refuelled +${Math.round(draw.supplied)} (${what})`, { duration: 3000 });
        for (const u of draw.used) emitGameEvent('fueled', u.itemType, u.count);
        this.blockInteraction.onInventoryChanged();
        return draw.supplied;
      };

      // A launch names the parts in its stack and the equipment fitted
      // (missions: launch on a nuclear engine, fly the ion drive)
      onGameEvent((type) => {
        if (type !== 'launched') return;
        const rocket = this.rocketFlightManager?.getRocketController();
        const parts = stackItemTypes(rocket?.getParts() ?? []);
        const fitted = (rocket?.getEquipment() ?? []).filter(s => s.itemType !== ItemType.NONE && s.quantity > 0).map(s => s.itemType);
        for (const t of new Set([...parts, ...fitted])) emitGameEvent('launchedWith', t);
      });

      // A rocket's fuel / cargo changed (refuelled, landed, exited): its pad
      // keeps the record - save it now
      this.rocketFlightManager.setOnRocketChangedCallback(() => {
        this.blockInteraction.saveLaunchPadStates();
      });
      this.rocketFlightManager.setOnOpenCargoCallback((slots, title, accepts) => {
        this.blockInteraction.openRocketCargo(slots, title, accepts);
      });

      // Other players' rockets, flying and landed (multiplayer; idle offline)
      const padManager = this.blockInteraction.getLaunchPadManager();
      this.rocketSync = new RocketSync(
        this.engine.scene,
        this.rocketFlightManager,
        (itemType) => padManager.loadRocketPartAssets(itemType),
        (position) => this.nearestPlanetId(position),
      );

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
        this.earthAtmosphere = createEarthAtmosphere(this.earth.radius, groundRadiusOf(this.earth), earthSunDir);
        this.earthAtmosphere.setPosition(this.earth.center);
        this.engine.scene.add(this.earthAtmosphere.getMesh());
      }

      // Create clouds for Earth
      this.earthClouds = createEarthClouds(this.earth.radius, earthSunDir);
      this.earthClouds.setSkyLight(this.earth.getSkyLight());
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
      const existingWorld = !!gameStorage.load();
      this.loadSavedGame();
      this.setupMissions(existingWorld);
      this.setupAir();

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
      this.addAtmosphere('sequoia', this.sequoia);

      // NOTE: Mushroom trees require terrain data which is generated on-demand when approaching
      // Trees will be scattered in the update loop after terrain is ready
      // (see scatterFloraOnce() called when detailed terrain becomes available)

      // Register LOD transition callback for atmosphere entry feedback
      this.sequoia.setLODTransitionCallback((enteringDetailedTerrain) => {
        if (enteringDetailedTerrain) {
          showToast('Entering Sequoia atmosphere...', { duration: 3000 });
        }
      });

      console.log('[Deferred] Sequoia initialized with atmosphere (trees on approach)');
    }

    // The rock worlds, moons and asteroids: their distant LOD only (a few
    // low-detail spheres to see from afar), one at a time with frames in
    // between. Everything else - textures, tiles, terrain, workers - loads
    // on approach or teleport (Planet.update -> enableDetailedTerrain), so
    // thirty extra bodies cost next to nothing until someone goes there.
    // Time-sliced: a frame renders between slices, not between bodies.
    const distantStart = performance.now();
    let sliceStart = distantStart;
    for (const planet of this.planets.values()) {
      if (planet === this.earth || planet === this.moon || planet === this.sequoia) continue;
      if (performance.now() - sliceStart > DEFERRED_SLICE_MS) {
        await this.yieldToMainThread();
        sliceStart = performance.now();
      }
      planet.setSunDirection(calculateSunDirectionForPlanet(planet.center, this.sunPosition));
      for (const [id, p] of this.planets) if (p === planet) this.addAtmosphere(id, planet);
      planet.initializeDistant();
    }
    console.log(`[Deferred] Distant LODs for the rock worlds in ${(performance.now() - distantStart).toFixed(0)}ms`);

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

    // Live orbits: advance the clock, keep the player's body fixed, move
    // the rest of the system round it
    profiler.begin('Orbits');
    this.updateOrbits(deltaTime);
    profiler.end('Orbits');

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

    // Give back the memory of planets left far behind (their terrain data
    // and detailed meshes - hundreds of MB each); they rebuild on approach
    this.releaseTimer -= deltaTime;
    if (this.releaseTimer <= 0 && !this.teleportInProgress) {
      this.releaseTimer = PlayerConfig.RELEASE_DETAIL_CHECK_S;
      // where the player is (the camera catches up a frame after a teleport)
      const flying = this.rocketFlightManager?.isInFlight() ? this.rocketFlightManager.getRocketController() : null;
      const viewer = flying ? flying.getPosition() : this.player.position;
      for (const planet of this.planets.values()) {
        if (planet.isDetailedTerrainEnabled() && planet.isFarForRelease(viewer)) planet.releaseDetailedTerrain();
      }
    }
    this.missions?.update(deltaTime);
    this.missionHud?.update();
    this.updateAir(deltaTime);
    // Maps, compass and waypoints (built once the world is up)
    if (!this.navigation) {
      this.navigation = new Navigation({
        planets: this.planets,
        player: () => {
          const flying = this.rocketFlightManager?.isInFlight() ? this.rocketFlightManager.getRocketController() : null;
          const position = flying ? flying.getPosition() : this.player.position;
          return {
            planetId: this.player.getCurrentPlanet()?.getName() ?? null,
            position,
            forward: this.engine.camera.getWorldDirection(new THREE.Vector3()),
          };
        },
        remotes: () => this.multiplayer?.getRemotePlayers() ?? [],
      }, this.blockInteraction.getCraftingSystem());
    }
    this.navigation.update();
    this.multiplayer?.update(deltaTime);
    this.rocketSync?.update(deltaTime);
    // Ground clutter (pixel grass tufts, rocks) on every world
    if (!this.groundClutter) {
      this.groundClutter = new GroundClutter(this.engine.scene);
      this.groundClutter.setEnabled(true);
    }
    {
      // The planet the player is on; rock worlds get stones only
      // (clutterFor has no plants for their blocks)
      const pos = this.player.position;
      let on: Planet | null = null;
      let onId: string | null = null;
      for (const [id, planet] of this.planets) {
        if (pos.distanceTo(planet.center) < planet.radius * 1.2) { on = planet; onId = id; break; }
      }
      const onSun = calculateSunDirectionForPlanet((on ?? this.earth).center, this.sunPosition);
      // Its body config carries the sea flora table (openspec ocean-life)
      this.groundClutter.update(deltaTime, pos, on, onSun,
        onId ? getBodyConfig(onId) : undefined, this.player.getIsInWater());
      // Machines, chests and launch pads sit in the same light as the ground (MachineLight)
      const lit = on ?? this.earth;
      setMachineLight(lit.center, onSun, lit.getSkyLight());
    }
    // Fauna: on whichever planet the player stands on; the roster table
    // decides who lives there (a planet with no roster spawns nothing)
    if (!this.fauna) {
      // (water life only on worlds with water: openspec ocean-life)
      validateFaunaRosters(this.planets.keys(), [...this.planets.keys()].filter(id => getBodyConfig(id)?.terrain.hasWater));
      this.fauna = new Fauna(this.engine.scene);
      this.blockInteraction.setFauna(this.fauna); // shearing and hitting animals
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
        handledRocketInteraction = this.checkLandedRocketInteraction(!this.rightClickHeld);
      }
      this.rightClickHeld = input.rightClick;

      // Fishing takes the mouse buttons while the rod is in hand
      // The rod in hand: a rod in the selected hotbar slot, or the toolbox rod taken out (0)
      const inv = this.blockInteraction.getInventory();
      const holdingRod = isGameActive && (toolOf(inv.getSelectedItem().itemType)?.kind === 'rod' || inv.isRodOut());
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

    }

    // Update water shader for animation (Earth and Sequoia have water)
    const isUnderwater = this.player.getIsInWater();
    this.earth.updateWaterShader(this.elapsedTime, isUnderwater);
    for (const [id, planet] of this.planets) {
      if (planet !== this.earth && planet.isInitialTerrainReady() && getBodyConfig(id)?.terrain.hasWater) {
        planet.updateWaterShader(this.elapsedTime, isUnderwater);
      }
    }

    // Update atmospheres (need camera position for fresnel effect)
    if (this.earthAtmosphere) {
      this.earthAtmosphere.updateCameraPosition(this.engine.camera.position);
    }
    for (const atmosphere of this.atmospheres) atmosphere.updateCameraPosition(this.engine.camera.position);

    // Update clouds (slow rotation)
    {
      const worldMs = netSync.worldTimeMs();
      this.earthClouds.update(deltaTime, worldMs === null ? null : worldMs / 1000);
    }

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

    // Every other planet's own flora: scattered once its detailed terrain is
    // ready (planets load lazily, so nothing is built at boot), then shown
    // with its visible chunks like Earth's
    for (const [id, planet] of this.planets) {
      if (planet === this.earth || !planet.isInitialTerrainReady()) continue;
      if (!this.floraManagers.has(id) && getBodyConfig(id)?.flora && planet.isDetailedTerrainEnabled()) {
        this.scatterFloraOnce(id, planet);
      }
      const flora = this.floraManagers.get(id);
      if (!flora) continue;
      if (planet.isInOrbitView()) flora.setAllVisible(false);
      else flora.updateVisibility(planet.getVisibleTreeChunks());
    }
  }

  // ---- live orbits (openspec navigation-and-orbits, orbital-motion) ----

  /** The body whose sphere of influence (gravity reach) holds `pos`, nearest first. */
  private sphereOfInfluence(pos: THREE.Vector3): string | null {
    let best: string | null = null;
    let bestD = Infinity;
    for (const [id, planet] of this.planets) {
      const reach = planet.radius * (getBodyConfig(id)?.gravity.falloffRadiusMultiplier ?? 1);
      const d = pos.distanceTo(planet.center);
      if (d < reach && d / reach < bestD) { best = id; bestD = d / reach; }
    }
    return best;
  }

  private updateOrbits(dt: number): void {
    if (!netSync.online()) advanceGameTime(dt);
    const t = gameTimeS();
    // In another body's sphere of influence: it becomes the fixed frame
    const flying = this.rocketFlightManager?.isInFlight() ? this.rocketFlightManager.getRocketController() : null;
    const where = flying ? flying.getPosition() : this.player.position;
    const soi = this.sphereOfInfluence(where);
    if (soi && soi !== this.frame.body && !this.teleportInProgress) this.setReferenceBody(soi, t);
    // Near the reference body the frame turns with it (its day); out in
    // space it is held still (openspec day-night, design 2)
    const ref = this.frame.body ? this.planets.get(this.frame.body) : undefined;
    if (ref && !this.teleportInProgress) {
      const soiReach = ref.radius * (getBodyConfig(this.frame.body!)?.gravity.falloffRadiusMultiplier ?? 1);
      const reach = Math.max(ref.radius * ORBIT_CONFIG.SPIN_FRAME_RADII, soiReach);
      const next = nextFrame(this.frame, where.distanceTo(ref.center), reach, t);
      if (next !== this.frame) {
        this.frame = next;
        console.log(`[Orbits] frame ${this.frame.body}: ${next.yaw === undefined ? 'turning with it' : 'held'}`);
      }
    }
    this.applyOrbitPositions(t);
  }

  /**
   * Make `id` the fixed frame. It returns to its configured position, so
   * whatever is in its frame - the player, a rocket flying in - is moved by
   * the same offset, and a rocket also sheds that body's orbital velocity
   * (task 8.2: no jump).
   */
  private setReferenceBody(id: string, t: number = gameTimeS()): void {
    if (id === this.frame.body || !orbitOf(id)) return;
    const old = this.frame;
    // Translation only, with the body's velocity in the old frame (its
    // wheel round a turning frame included): the traveller keeps their pose
    // relative to the body they arrive at, and the sky takes any change in
    // the frames' turn (openspec day-night, design 3)
    const was = framePositionAt(id, old, t);
    const now = orbitOf(id)!.configured;
    const offset = new THREE.Vector3(now.x - was.x, now.y - was.y, now.z - was.z);
    const v = frameVelocityAt(id, old, t);
    const frameVelocity = new THREE.Vector3(v.x, v.y, v.z);
    this.frame = { body: id };
    this.player.position.add(offset);
    this.engine.camera.position.add(offset);
    const rocket = this.rocketFlightManager?.isInFlight() ? this.rocketFlightManager.getRocketController() : null;
    rocket?.rebase(offset, frameVelocity);
    this.applyOrbitPositions(t);
    console.log(`[Orbits] frame: ${old.body} -> ${id}`);
  }

  private applyOrbitPositions(t: number): void {
    const ref = this.frame.body;
    const frame = this.frame;
    const p = { x: 0, y: 0, z: 0 };
    framePositionAt('sun', frame, t, p);
    this.sunPosition.set(p.x, p.y, p.z);
    this.engine.setSunPosition(this.sunPosition);
    this.rocketFlightManager?.setSunPosition(this.sunPosition);
    // The stars wheel with the Sun: the same turn of the frame
    const yaw = frameYawAt(frame, t);
    this.engine.setSkyYaw(yaw);
    this.solarSystemMockup?.setFrameYaw(yaw);
    const center = new THREE.Vector3();
    for (const [id, planet] of this.planets) {
      framePositionAt(id, frame, t, p);
      center.set(p.x, p.y, p.z);
      planet.setCenter(center);
      this.rocketFlightManager?.setPlanetCenter(id, planet.center);
      const atmosphere = this.atmosphereById.get(id);
      atmosphere?.setPosition(planet.center);
      const trees = planet === this.earth ? this.treeManager : this.floraManagers.get(id);
      trees?.setPlanetCenter(planet.center);
      if (planet === this.earth) {
        this.earthAtmosphere?.setPosition(planet.center);
        this.earthClouds?.setPosition(planet.center);
      }
      // Sunlight from the live relative position (day and night)
      const dir = calculateSunDirectionForPlanet(planet.center, this.sunPosition);
      const last = this.lastSunDir.get(id);
      if (last && last.angleTo(dir) < ORBIT_CONFIG.SUN_DIRECTION_EPSILON) continue;
      this.lastSunDir.set(id, dir);
      planet.setSunDirection(dir);
      atmosphere?.setSunDirection(dir);
      trees?.setSunDirection(dir);
      if (planet === this.earth) {
        this.earthAtmosphere?.setSunDirection(dir);
        this.earthClouds?.setSunDirection(dir);
      }
      if (id === ref) this.blockInteraction?.setSunDirection(dir);
    }
    for (const g of GAS_GIANTS) {
      this.solarSystemMockup?.setBodyPosition(g.id, framePositionAt(g.id, frame, t, p));
    }
  }

  /**
   * Check if player is looking at and can interact with a landed rocket
   * Returns true if interaction was handled
   */
  private checkLandedRocketInteraction(pressed: boolean): boolean {
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
      // Holding a lithium-ion battery: swap it into the rocket (openspec
      // wool-air-and-reentry, design 2) - it is used up from the hand
      const inventory = this.blockInteraction.getInventory();
      const held = inventory.getSelectedItem();
      if (held.itemType === ROCKET_CONFIG.POWER.SWAP_ITEM && held.quantity > 0) {
        if (!pressed) return true;   // still held from the press that swapped
        this.rocketFlightManager.rechargeLanded(result.rocket, () => {
          if (inventory.removeItem(ROCKET_CONFIG.POWER.SWAP_ITEM, 1) !== 1) return false;
          this.blockInteraction.onInventoryChanged();
          return true;
        });
        return true;
      }
      // Player is looking at a landed rocket - open the boarding UI
      this.rocketFlightManager.openLandedRocketUI(result.rocket);
      return true;
    }

    return false;
  }

  // A world's atmosphere shell (tinted per its config), if it has one
  private addAtmosphere(id: string, planet: Planet): void {
    const body = getBodyConfig(id);
    if (!body?.hasAtmosphere || !PlayerConfig.ATMOSPHERE_ENABLED) return;
    const atmosphere = createAtmosphere(planet.radius, groundRadiusOf(planet), calculateSunDirectionForPlanet(planet.center, this.sunPosition), body.visual.atmosphereTint);
    atmosphere.setPosition(planet.center);
    this.engine.scene.add(atmosphere.getMesh());
    this.atmospheres.push(atmosphere);
    this.atmosphereById.set(id, atmosphere);
  }

  // Scatter a planet's own flora (its config's FloraTable) - called once,
  // when its detailed terrain becomes ready. One path for every planet but
  // Earth: which species grows on a tile is the one its ground grows.
  private scatterFloraOnce(id: string, planet: Planet): void {
    if (this.floraManagers.has(id)) return;
    const body = getBodyConfig(id)!;
    const table = body.flora!;
    const t0 = performance.now();
    const roster = [...new Set(Object.values(table).map(f => f!.species))] as FloraSpecies[];
    const manager = new FloraTreeManager(planetObjectScene(this.engine.scene), roster, calculateSunDirectionForPlanet(planet.center, this.sunPosition));
    manager.setSkyLight(planet.getSkyLight());
    this.floraManagers.set(id, manager);
    const removed = new Set(gameStorage.getRemovedTrees(id).map(t => t.tileIndex));
    manager.setChunkLookup((tileIndex) => planet.getTileChunkIndex(tileIndex));
    // As many per area as Earth's TREE_COUNT, times the planet's density
    const count = Math.round(PlayerConfig.TREE_COUNT * (body.floraDensity ?? 1) * (planet.radius / 100) ** 2);
    manager.scatterTrees(
      planet.center,
      planet.radius,
      count,
      (direction) => planet.getSurfaceHeightInDirection(direction),
      (direction) => planet.isUnderwaterInDirection(direction),
      // Sequoia keeps the seed it always had (same forests in old saves)
      PlayerConfig.TERRAIN_SEED + (id === 'sequoia' ? 100 : 100 + (body.terrain.seed ?? 0)),
      (direction) => planet.getTileIndexInDirection(direction),
      (direction) => planet.getTileCenterInDirection(direction),
      removed,
      (tileIndex, roll) => {
        // One species per biome, never a mix: the one its ground grows
        const f = table[this.topBlock(planet, tileIndex)];
        return f && roll < f.chance ? f.species : null;
      }
    );
    console.log(`[Flora] ${id}: ${manager.getTrees().length} plants (${roster.join(', ')}) in ${(performance.now() - t0).toFixed(0)}ms`);
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

    // Screenshot button: the game view without the menu over it (as F9)
    document.getElementById('screenshot-btn')?.addEventListener('click', () => this.engine.saveScreenshot());

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
      // Grouped: each planet with its moons, each gas giant's moons, then
      // the asteroids (anything else landable last)
      const landable = SOLAR_SYSTEM.bodies.filter(b => b.landable);
      const listed = new Set<string>();
      const group = (label: string, bodies: typeof landable) => {
        if (bodies.length === 0) return;
        const g = document.createElement('optgroup');
        g.label = label;
        for (const body of bodies) {
          const option = document.createElement('option');
          option.value = body.id;
          option.textContent = body.orbit?.parent ? `  ${body.name}` : body.name;
          g.appendChild(option);
          listed.add(body.id);
        }
        teleportSelect.appendChild(g);
      };
      const moonsOf = (id: string) => landable.filter(b => b.type === CelestialBodyType.MOON && b.orbit?.parent === id);
      for (const planet of landable.filter(b => b.type === CelestialBodyType.PLANET)) {
        group(planet.name, [planet, ...moonsOf(planet.id)]);
      }
      for (const giant of GAS_GIANTS) group(`${giant.name} (gas giant)`, moonsOf(giant.id));
      group('Asteroids', landable.filter(b => b.type === CelestialBodyType.ASTEROID));
      group('Other', landable.filter(b => !listed.has(b.id)));
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
        lockPointer(container);
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
    if (titleEl) titleEl.textContent = `Preparing ${getBodyConfig(planetName)?.name ?? planetName}`;
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

  // A planet's atmosphere shell (with its config tint), if it has one
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
    // Terrain and tree biomes are read at load (reload to change them)
    bind('toggle-mock-biomes', 'tenebris_mock_biomes', () => { /* read at load */ });
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
        this.multiplayer?.setIdentity(name, loadMyLook());
      });
      // Typing in the box must not drive the player
      nameInput.addEventListener('keydown', (e) => e.stopPropagation());
    }

    // Character creator: name and look (what other players see)
    const creator = new CharacterCreator(() => name, (newName, look) => {
      name = newName;
      write('tenebris_mp_name', name);
      if (nameInput) nameInput.value = name;
      this.multiplayer?.setIdentity(name, look);
    });
    document.getElementById('character-btn')?.addEventListener('click', () => creator.open());
    document.getElementById('menu-character')?.addEventListener('click', () => creator.open());

    // Server browser: list worlds, create one, join one (reloads into it)
    const browser = new WorldBrowser();
    document.getElementById('world-browser-btn')?.addEventListener('click', () => browser.open());
    // The main menu's lobby button: the same server browser
    document.getElementById('menu-multiplayer')?.addEventListener('click', () => browser.open());
    const modeLabel = document.getElementById('menu-mode');
    const here = currentWorld();
    if (modeLabel) modeLabel.textContent = here ? `Online - ${here.name}` : 'Single player';
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
      const planet = this.player.getCurrentPlanet()?.getName() ?? this.nearestPlanetId(p);
      const o = this.player.exportForSave().orientation;
      return { planet, p, q: new THREE.Quaternion(o.x, o.y, o.z, o.w) };
    }, name, creator.getLook());
    this.multiplayer.setFrameOffset((planetId) => {
      const o = orbitOf(planetId);
      if (!o) return new THREE.Vector3();
      const p = framePositionAt(planetId, this.frame, gameTimeS());
      return new THREE.Vector3(p.x - o.configured.x, p.y - o.configured.y, p.z - o.configured.z);
    });
    this.multiplayer.connect(worldSocketUrl(world.id));
    // Online, the orbits run on the server's world clock (everyone's sky agrees)
    useNetworkClock(() => {
      const ms = netSync.worldTimeMs();
      return ms === null ? null : (ms / 1000) * ORBIT_CONFIG.TIME_SCALE;
    });
  }

  /** The id of the planet whose surface is nearest `p` */
  private nearestPlanetId(p: THREE.Vector3): string {
    let planet = 'earth';
    let best = Infinity;
    for (const [id, pl] of this.planets) {
      const alt = p.distanceTo(pl.center) - pl.radius;
      if (alt < best) { best = alt; planet = id; }
    }
    return planet;
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
    // Leaving by teleport: give back the planets being left BEFORE the
    // destination generates, so two planets' terrain are never held at once
    // (leaving by flying away is the distance check in update). The player
    // is held still meanwhile - the ground under them is one of them.
    const wasEnabled = this.player.getEnabled();
    this.player.setEnabled(false);
    try {
      // The destination becomes the fixed frame (orbits): it sits at its
      // configured position, where its terrain and spawn are worked out
      this.setReferenceBody(planetName);
      for (const other of this.planets.values()) {
        if (other === planet) continue;
        other.setAutoDetailHeld(true);
        other.releaseDetailedTerrain();
      }
      await this.preparePlanetForTeleport(planet, planetName);
    } catch (e) {
      this.player.setEnabled(wasEnabled);
      throw e;
    } finally {
      this.teleportInProgress = false;
      for (const other of this.planets.values()) other.setAutoDetailHeld(false);
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

    // One placement path: the heading is carried to the new up (player-heading)
    this.player.placeAt(playerPos);
    this.player.setEnabled(wasEnabled);

    console.log(`Teleported to ${planetName} at position: ${playerPos.x.toFixed(1)}, ${playerPos.y.toFixed(1)}, ${playerPos.z.toFixed(1)}`);
  }

  // Air: the suit slot, the AIR chip, dying of exposure (openspec
  // wool-air-and-reentry, design 4)
  private setupAir(): void {
    const air = new AirSystem(this.blockInteraction.getInventory(), () => this.blockInteraction.onInventoryChanged());
    this.air = air;
    this.blockInteraction.setAirSystem(air);
    const crafting = this.blockInteraction.getCraftingSystem();
    crafting.setSuitSlot({ worn: () => air.isSuitWorn(), takeOff: () => air.takeOffSuit() });
    // The suit rides the synced look, so other players see it
    this.multiplayer?.setSuit(air.isSuitWorn());
    air.onSuitChanged((worn) => {
      crafting.updateInventorySlots();
      this.multiplayer?.setSuit(worn);
    });
  }

  /** Where the player is, for the exposure rule; null while it can't be judged. */
  private airExposure(): ExposureInput | null {
    if (this.teleportInProgress) return null;
    // The pause menu holds the clock: nobody suffocates behind it
    if (document.getElementById('instructions')?.style.display === 'block') return null;
    const rocket = this.rocketFlightManager?.isInFlight() ? this.rocketFlightManager.getRocketController() : null;
    // A crash has its own screen and respawn
    if (rocket?.getState() === RocketState.CRASHED) return null;
    if (rocket) return { inRocket: true, rocketPowered: rocket.hasPower(), inGravityWell: true, bodyBreathable: true };
    if (!this.player.getEnabled()) return null;
    const well = this.player.getGravityWellPlanet();
    let bodyId: string | null = null;
    for (const [id, planet] of this.planets) if (planet === well) bodyId = id;
    return {
      inRocket: false,
      rocketPowered: false,
      inGravityWell: well !== null,
      bodyBreathable: bodyId !== null && getBodyConfig(bodyId)?.breathable === true,
      jetpack: this.player.getJetpackEnabled(),
    };
  }

  private updateAir(dt: number): void {
    if (!this.air?.update(dt, this.airExposure())) return;
    // Out of air: the death screen, then the world's spawn on Earth with
    // everything carried
    this.player.setEnabled(false);
    this.air.showDeath(() => {
      const flight = this.rocketFlightManager;
      if (flight?.isInFlight()) {
        // Climb out first; the ship stays parked where it is
        flight.exitFlightMode(true);
      }
      this.player.setEnabled(true);
      void this.teleportToPlanet(SOLAR_SYSTEM.startingBody);
    });
  }

  // Missions: the Missions tab of the E panel, counted from play
  private setupMissions(existingWorld: boolean): void {
    const inventory = this.blockInteraction.getInventory();
    const machineLists: Partial<Record<number, () => unknown[]>> = {
      [ItemType.FURNACE]: () => gameStorage.getFurnaces(),
      [ItemType.ELECTRIC_FURNACE]: () => gameStorage.getElectricFurnaces(),
      [ItemType.ELECTRONICS_WORKBENCH]: () => gameStorage.getElectronicsWorkbenches(),
      [ItemType.COMPUTER]: () => gameStorage.getComputers(),
      [ItemType.PRINTER_3D]: () => gameStorage.getPrinters3D(),
      [ItemType.STORAGE_CHEST]: () => gameStorage.getStorageChests(),
      [ItemType.STEAM_ENGINE]: () => gameStorage.getSteamEngines(),
      [ItemType.HYDRO_GENERATOR]: () => gameStorage.getHydroGenerators(),
      [ItemType.TORCH]: () => gameStorage.getTorches(),
      [ItemType.CABLE]: () => gameStorage.getCables(),
      [ItemType.COPPER_PIPE]: () => gameStorage.getCopperPipes(),
    };
    // The industry machines and batteries share one record list
    for (const item of Object.keys(MACHINE_KIND_OF).map(Number) as ItemType[]) {
      machineLists[item] = () => gameStorage.getMachines().filter(m => m.itemType === item);
    }
    const pads = () => this.blockInteraction.getLaunchPadManager().getLaunchPads();
    this.missions = new MissionsPanel(inventory, existingWorld, () => ({
      held: (item) => inventory.getItemCount(item as ItemType),
      placedMachines: (item) => machineLists[item]?.().length ?? 0,
      padComplete: pads().some(p => p.isComplete),
      rocketAssembled: pads().some(p => p.rocketParts.length >= 3),
    }));
    const missions = this.missions;
    const crafting = this.blockInteraction.getCraftingSystem();
    crafting.registerPanel('missions', {
      show: (el) => missions.show(el),
      hide: () => missions.hide(),
    });
    // The HUD tracker: the now mission during play; a click opens the tab
    const hud = new MissionHud(missions.getTracker(), () => crafting.openPanel('missions'));
    this.missionHud = hud;
    missions.addChangeListener(() => hud.render());
    // Settings: show it or not (saved per browser, on by default)
    const hudToggle = document.getElementById('toggle-mission-hud') as HTMLInputElement | null;
    if (hudToggle) {
      hudToggle.checked = hud.isEnabled();
      hudToggle.addEventListener('change', () => hud.setEnabled(hudToggle.checked));
    }
  }

  private loadSavedGame(): void {
    const saveData = gameStorage.load();
    if (!saveData) {
      console.log('No saved game found, starting fresh');
      if (startWithRocket()) {
        this.blockInteraction.placeStarterRocket(this.earth, this.player.position);
        // The rocket carries fuel for the way back in its hold; a bucket
        // lets the player top up from any water
        this.blockInteraction.getInventory().addItem(ItemType.BUCKET, ROCKET_CONFIG.STARTER_KIT.buckets);
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
// A session starts on the title screen (single player / multiplayer /
// character); nothing is built until a world is picked
document.addEventListener('DOMContentLoaded', async () => {
  if (titleWanted()) await showTitleScreen();
  const { error } = await prepareWorld();
  new PlanetGame(error);
});
