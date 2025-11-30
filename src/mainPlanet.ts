import { GameEngine } from './engine/GameEngine';
import { InputManager } from './engine/InputManager';
import { Planet } from './planet/Planet';
import { PlanetPlayer } from './player/PlanetPlayer';
import { PlanetBlockInteraction } from './player/PlanetBlockInteraction';

class PlanetGame {
  private engine: GameEngine;
  private inputManager: InputManager;
  private earth: Planet;
  private moon: Planet;
  private player: PlanetPlayer;
  private blockInteraction: PlanetBlockInteraction;
  private isReady: boolean = false;

  constructor() {
    const container = document.getElementById('game-container');
    if (!container) throw new Error('Game container not found');

    // Initialize core systems
    this.engine = new GameEngine(container);
    this.inputManager = new InputManager();

    // Create Earth with radius 50 and 4 subdivisions
    this.earth = new Planet(this.engine.scene, 50, 4);

    // Create Moon with radius 25, 3 subdivisions, and moon texture
    // Position the moon at (200, 0, 0) - about 150 units from Earth surface
    this.moon = new Planet(this.engine.scene, 25, 3, { texturePath: '/textures/moon.png', heightVariation: 0.6 });

    // Player will be initialized after planets
    this.player = null!;
    this.blockInteraction = null!;

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
      this.moon.center.set(200, 0, 0);
      this.moon.updateBoundingSpheres();

      // Build all meshes initially
      this.earth.buildAllMeshes();
      this.moon.buildAllMeshes();

      // Initialize player on Earth surface
      this.player = new PlanetPlayer(this.engine.camera, this.inputManager, this.earth);

      // Add moon as a second celestial body (smaller gravity radius)
      this.player.addPlanet(this.moon, 80);

      // Initialize block interaction (for now, just with Earth)
      this.blockInteraction = new PlanetBlockInteraction(
        this.earth,
        this.player,
        this.engine.scene
      );

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

    // Update player
    this.player.update(deltaTime);

    // Update both planets (rebuild dirty meshes near player) with camera for frustum culling
    this.earth.update(this.player.position, this.engine.camera);
    this.moon.update(this.player.position, this.engine.camera);

    // Update block interaction
    const input = this.inputManager.getState();
    this.blockInteraction.update(deltaTime, input.leftClick, input.rightClick);
  }
}

// Start game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new PlanetGame();
});
