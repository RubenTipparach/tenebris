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
      if (instructions) {
        instructions.style.display = locked ? 'none' : 'block';
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
        50, // Number of trees
        (direction) => this.earth.getSurfaceHeightInDirection(direction),
        (direction) => this.earth.isUnderwaterInDirection(direction) // Skip underwater locations
      );

      // Give block interaction access to tree manager for mining trees
      this.blockInteraction.setTreeManager(this.treeManager);

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

    // Update both planets (rebuild dirty meshes near player) with camera for frustum culling
    profiler.begin('Earth Update');
    this.earth.update(this.player.position, this.engine.camera);
    profiler.end('Earth Update');

    profiler.begin('Moon Update');
    this.moon.update(this.player.position, this.engine.camera);
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

    // Update block interaction
    profiler.begin('Block Interaction');
    const input = this.inputManager.getState();
    this.blockInteraction.update(deltaTime, input.leftClick, input.rightClick);
    profiler.end('Block Interaction');
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

    const surfaceOffset = 5; // Small offset above surface
    const playerPos = planet.center.clone();

    // Position player on the surface
    // For Earth, position on top (Y+), for Moon position facing Earth (X-)
    if (planetName === 'earth') {
      playerPos.y += planet.radius + surfaceOffset;
    } else {
      playerPos.x -= planet.radius + surfaceOffset;
    }

    this.player.position.copy(playerPos);
    this.player.velocity.set(0, 0, 0);

    console.log(`Teleported to ${planetName} at position: ${playerPos.x.toFixed(1)}, ${playerPos.y.toFixed(1)}, ${playerPos.z.toFixed(1)}`);
  }
}

// Start game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PlanetGame();
});
