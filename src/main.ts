import { GameEngine } from './engine/GameEngine';
import { InputManager } from './engine/InputManager';
import { Player } from './player/Player';
import { World } from './world/World';
import { BlockRegistry } from './world/Block';
import { BlockInteraction } from './player/BlockInteraction';
import { Physics } from './player/Physics';

class Game {
  private engine: GameEngine;
  private inputManager: InputManager;
  private player: Player;
  private world: World;
  private blockRegistry: BlockRegistry;
  private blockInteraction: BlockInteraction;
  private physics: Physics;
  private isReady: boolean = false;

  constructor() {
    const container = document.getElementById('game-container');
    if (!container) throw new Error('Game container not found');

    // Initialize core systems
    this.engine = new GameEngine(container);
    this.inputManager = new InputManager();
    this.blockRegistry = new BlockRegistry();

    // Initialize world
    this.world = new World(this.engine.scene, this.blockRegistry);

    // Initialize physics
    this.physics = new Physics(this.world);

    // Initialize player
    this.player = new Player(this.engine.camera, this.inputManager);
    this.player.setGroundCheckCallback(this.physics.checkGrounded.bind(this.physics));
    this.player.setCollisionCheckCallback(this.physics.resolveCollision.bind(this.physics));

    // Initialize block interaction
    this.blockInteraction = new BlockInteraction(this.world, this.player, this.engine.scene);

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

    // Load textures and start
    this.init();
  }

  private async init(): Promise<void> {
    try {
      // Load block textures
      await this.blockRegistry.loadTextures();
      console.log('Textures loaded');

      // Generate initial chunks around spawn
      this.world.updateChunks(0, 0);

      // Find a good spawn point
      const spawnHeight = this.world.getHeightAt(0, 0);
      this.player.position.set(0, spawnHeight + 2, 0);

      this.isReady = true;

      // Setup game loop
      this.engine.onUpdate(this.update.bind(this));

      // Start the engine
      this.engine.start();

      console.log('Game started!');
    } catch (error) {
      console.error('Failed to initialize game:', error);
    }
  }

  private update(deltaTime: number): void {
    if (!this.isReady) return;

    // Update player
    this.player.update(deltaTime);

    // Update chunks based on player position
    this.world.updateChunks(this.player.position.x, this.player.position.z);

    // Update block interaction
    const input = this.inputManager.getState();
    this.blockInteraction.update(deltaTime, input.leftClick, input.rightClick);
  }
}

// Start game when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new Game();
});
