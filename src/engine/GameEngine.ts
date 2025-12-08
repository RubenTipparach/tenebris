import * as THREE from 'three';
import { PlayerConfig } from '../config/PlayerConfig';
import skyboxVert from '../shaders/skybox/skybox.vert';
import skyboxFrag from '../shaders/skybox/skybox.frag';
import { profiler } from './Profiler';
import { isMobileDevice } from './InputManager';

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

  // Depth buffer for underwater fog (disabled on mobile for performance)
  private depthRenderTarget: THREE.WebGLRenderTarget | null = null;
  private waterMaterials: Set<THREE.ShaderMaterial> = new Set();
  private waterMeshes: Set<THREE.Mesh> = new Set(); // Cached for O(1) visibility toggle
  private readonly isMobile: boolean;

  private updateCallbacks: ((deltaTime: number) => void)[] = [];

  constructor(container: HTMLElement) {
    // Detect mobile for performance optimizations
    this.isMobile = isMobileDevice();

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

    // Create depth render target for underwater fog (skip on mobile for performance)
    if (!this.isMobile) {
      this.createDepthRenderTarget();
    }

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

  private createDepthRenderTarget(): void {
    const pixelRatio = this.renderer.getPixelRatio();
    const width = Math.floor(window.innerWidth * pixelRatio);
    const height = Math.floor(window.innerHeight * pixelRatio);

    // Create depth texture with explicit format (required for proper depth sampling)
    const depthTexture = new THREE.DepthTexture(width, height);
    depthTexture.format = THREE.DepthFormat;
    depthTexture.type = THREE.UnsignedIntType; // More widely supported than FloatType

    this.depthRenderTarget = new THREE.WebGLRenderTarget(width, height, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: true,
      depthTexture: depthTexture,
    });
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Recreate depth render target with new size
    if (this.depthRenderTarget) {
      this.depthRenderTarget.dispose();
      this.createDepthRenderTarget();
      this.updateWaterDepthUniforms();
    }
  }

  public onUpdate(callback: (deltaTime: number) => void): void {
    this.updateCallbacks.push(callback);
  }

  // Register a water shader material to receive depth texture updates
  public registerWaterMaterial(material: THREE.ShaderMaterial): void {
    if (!this.waterMaterials.has(material)) {
      this.waterMaterials.add(material);
      this.updateWaterMaterialUniforms(material);
    }
  }

  // Register a water mesh for efficient depth pre-pass visibility toggling
  // Call this when creating water meshes to avoid scene.traverse() every frame
  public registerWaterMesh(mesh: THREE.Mesh): void {
    this.waterMeshes.add(mesh);
  }

  // Unregister a water mesh when it's disposed
  public unregisterWaterMesh(mesh: THREE.Mesh): void {
    this.waterMeshes.delete(mesh);
  }

  private updateWaterMaterialUniforms(material: THREE.ShaderMaterial): void {
    if (this.depthRenderTarget) {
      // Resolution must match the actual render target size (with pixel ratio applied)
      // gl_FragCoord is in actual pixels, so resolution must also be in actual pixels
      const pixelRatio = this.renderer.getPixelRatio();
      material.uniforms.depthTexture = { value: this.depthRenderTarget.depthTexture };
      material.uniforms.cameraNear = { value: this.camera.near };
      material.uniforms.cameraFar = { value: this.camera.far };
      material.uniforms.resolution = { value: new THREE.Vector2(window.innerWidth * pixelRatio, window.innerHeight * pixelRatio) };
      material.uniforms.useDepthFog = { value: 1.0 };
    } else {
      // No depth render target (mobile) - disable depth-based fog
      material.uniforms.useDepthFog = { value: 0.0 };
    }
  }

  private updateWaterDepthUniforms(): void {
    for (const material of this.waterMaterials) {
      this.updateWaterMaterialUniforms(material);
    }
  }

  public start(): void {
    this.clock.start();
    this.animate();
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    profiler.beginFrame();
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

    // Render with depth pre-pass for underwater fog
    profiler.begin('Render');

    // Depth pre-pass: render scene to depth buffer (hide water temporarily)
    // Uses cached waterMeshes Set for O(1) lookup instead of scene.traverse()
    if (this.depthRenderTarget && this.waterMeshes.size > 0) {
      // Hide water meshes during depth pass - store previous visibility
      const waterVisibility: Map<THREE.Mesh, boolean> = new Map();
      for (const mesh of this.waterMeshes) {
        waterVisibility.set(mesh, mesh.visible);
        mesh.visible = false;
      }

      // Render to depth target
      this.renderer.setRenderTarget(this.depthRenderTarget);
      this.renderer.render(this.scene, this.camera);
      this.renderer.setRenderTarget(null);

      // Restore water visibility
      for (const mesh of this.waterMeshes) {
        mesh.visible = waterVisibility.get(mesh) ?? true;
      }
    }

    // Main render pass
    this.renderer.render(this.scene, this.camera);
    profiler.end('Render');

    profiler.end('Frame Total');
    profiler.endFrame();
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
