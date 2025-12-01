import * as THREE from 'three';
import { PlayerConfig } from '../config/PlayerConfig';
import skyboxVert from '../shaders/skybox/skybox.vert';
import skyboxFrag from '../shaders/skybox/skybox.frag';
import { profiler } from './Profiler';

// Create starfield shader material for background
function createStarfieldMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
    },
    vertexShader: skyboxVert,
    fragmentShader: skyboxFrag,
    side: THREE.BackSide, // Render inside of sphere
  });
}

export class GameEngine {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public sunDirection!: THREE.Vector3; // Normalized direction TO the sun (initialized in setupLighting)

  private clock: THREE.Clock;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 0;
  private sunMesh: THREE.Mesh | null = null;
  private starfield: THREE.Mesh | null = null;
  private isUnderwater: boolean = false;
  private underwaterFog: THREE.Fog | null = null;

  private updateCallbacks: ((deltaTime: number) => void)[] = [];

  constructor(container: HTMLElement) {
    // Scene setup
    this.scene = new THREE.Scene();
    // No fog for space/planet view

    // Camera setup (far plane extended for starfield visibility)
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    );
    this.camera.position.set(0, 20, 0);

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Clock for delta time
    this.clock = new THREE.Clock();

    // Lighting
    this.setupLighting();

    // Handle window resize
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // Setup profiler
    profiler.createDisplay();
    (window as unknown as { __gameRenderer: THREE.WebGLRenderer }).__gameRenderer = this.renderer;
    (window as unknown as { __gameScene: THREE.Scene }).__gameScene = this.scene;

    // F3 to toggle profiler
    document.addEventListener('keydown', (e) => {
      if (e.code === 'F3') {
        e.preventDefault();
        profiler.toggle();
      }
    });
  }

  private setupLighting(): void {
    // Initialize sun direction from config
    this.sunDirection = new THREE.Vector3(
      PlayerConfig.SUN_DIRECTION.x,
      PlayerConfig.SUN_DIRECTION.y,
      PlayerConfig.SUN_DIRECTION.z
    ).normalize();

    // Create starfield background sphere (follows camera to never hit edge)
    const starfieldGeometry = new THREE.SphereGeometry(900, 64, 64);
    const starfieldMaterial = createStarfieldMaterial();
    this.starfield = new THREE.Mesh(starfieldGeometry, starfieldMaterial);
    this.scene.add(this.starfield);

    // Create sun sphere in the sky (radius 60 for prominent appearance)
    const sunGeometry = new THREE.SphereGeometry(60, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffdd44,
      fog: false,
    });
    this.sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    // Position sun far away in sun direction
    this.sunMesh.position.copy(this.sunDirection.clone().multiplyScalar(800));
    this.scene.add(this.sunMesh);

    // Ambient light - low for space darkness
    const ambientLight = new THREE.AmbientLight(0xffffff, PlayerConfig.AMBIENT_LIGHT_INTENSITY);
    this.scene.add(ambientLight);

    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY);
    // Position light far away in sun direction
    directionalLight.position.copy(this.sunDirection.clone().multiplyScalar(500));
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    this.scene.add(directionalLight);

    // Hemisphere light for subtle sky/ground color blend
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x222222, PlayerConfig.HEMISPHERE_LIGHT_INTENSITY);
    this.scene.add(hemisphereLight);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  public onUpdate(callback: (deltaTime: number) => void): void {
    this.updateCallbacks.push(callback);
  }

  public start(): void {
    this.clock.start();
    this.animate();
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    profiler.begin('Frame Total');

    const deltaTime = this.clock.getDelta();

    // Update FPS counter
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;

      const fpsElement = document.getElementById('fps');
      if (fpsElement) {
        fpsElement.textContent = `FPS: ${this.currentFps}`;
      }
    }

    // Call update callbacks
    profiler.begin('Game Update');
    for (const callback of this.updateCallbacks) {
      callback(deltaTime);
    }
    profiler.end('Game Update');

    // Keep starfield centered on camera so we never hit the edge
    if (this.starfield) {
      this.starfield.position.copy(this.camera.position);
    }

    // Render
    profiler.begin('Render');
    this.renderer.render(this.scene, this.camera);
    profiler.end('Render');

    profiler.end('Frame Total');
    profiler.updateDisplay();
  };

  public getFps(): number {
    return this.currentFps;
  }

  // Enable underwater fog effect
  public setUnderwater(underwater: boolean): void {
    if (underwater === this.isUnderwater) return;

    this.isUnderwater = underwater;

    if (underwater) {
      // Create and apply underwater fog
      const fogColor = new THREE.Color(PlayerConfig.UNDERWATER_FOG_COLOR);
      this.underwaterFog = new THREE.Fog(
        fogColor,
        PlayerConfig.UNDERWATER_FOG_NEAR,
        PlayerConfig.UNDERWATER_FOG_FAR
      );
      this.scene.fog = this.underwaterFog;
      this.scene.background = fogColor;

      // Hide starfield when underwater
      if (this.starfield) {
        this.starfield.visible = false;
      }
    } else {
      // Remove fog (space has no fog)
      this.scene.fog = null;
      this.scene.background = null;

      // Show starfield again
      if (this.starfield) {
        this.starfield.visible = true;
      }
    }
  }

  public getIsUnderwater(): boolean {
    return this.isUnderwater;
  }
}
