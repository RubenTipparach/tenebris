import * as THREE from 'three';
import { PlayerConfig } from '../config/PlayerConfig';
import skyboxVert from '../shaders/skybox/skybox.vert';
import skyboxFrag from '../shaders/skybox/skybox.frag';
import { profiler } from './Profiler';
import { isMobileDevice } from './InputManager';
import { getTechBlocksMenu } from '../player/TechBlocksMenu';

// Create starfield shader material for background
// Far layer clip planes: from a planet's distance out past the edge of the
// solar system
const FAR_LAYER_NEAR = 1;
const FAR_LAYER_FAR = 1e6;

function createStarfieldMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      starVisibility: { value: 1 },
    },
    vertexShader: skyboxVert,
    fragmentShader: skyboxFrag,
    side: THREE.BackSide, // Render inside of sphere
    depthWrite: false,    // Don't write to depth buffer (always behind everything)
    depthTest: false,     // Don't test depth (always draw)
  });
}

export class GameEngine {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public sunDirection!: THREE.Vector3;
  /**
   * The far layer: things too far away for the main camera's 20 km far plane
   * (the other planets of the solar system). It is drawn first, with its own
   * camera whose far plane reaches across the whole system, then the depth
   * buffer is cleared and the main scene draws over it. The layer uses a
   * floating origin: everything added to farRoot is in world coordinates,
   * and farRoot is shifted by -camera position each frame so the far camera
   * sits at 0,0,0 - no float precision loss at system distances.
   * farOrigin is the world position the layer is currently rebased on.
   */
  public farScene = new THREE.Scene();
  public farRoot = new THREE.Group();
  public farCamera: THREE.PerspectiveCamera;
  public farOrigin = new THREE.Vector3(); // Normalized direction TO the sun (initialized in setupLighting)

  private clock: THREE.Clock;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 0;
  private sunMesh: THREE.Mesh | null = null;
  private directionalLight: THREE.DirectionalLight | null = null;
  private starfield: THREE.Mesh | null = null;
  private isUnderwater: boolean = false;
  private underwaterFog: THREE.Fog | null = null;

  // Depth buffer for underwater fog (disabled on mobile for performance)
  private depthRenderTarget: THREE.WebGLRenderTarget | null = null;
  private waterMaterials: Set<THREE.ShaderMaterial> = new Set();
  private waterMeshes: Set<THREE.Mesh> = new Set(); // Cached for O(1) visibility toggle
  // Each water material's back-face depth twin for the depth pre-pass: the
  // pre-pass holds the nearer of the terrain and the far side of the water,
  // so the water shader's depth tint is the water's thickness along the view
  // ray (a sheet on a slope, a cell seen side-on), never the distance to
  // whatever lies behind it
  private waterBackDepth: Map<THREE.Material, THREE.ShaderMaterial> = new Map();
  private readonly savedClearColor = new THREE.Color();
  private readonly isMobile: boolean;

  private updateCallbacks: ((deltaTime: number) => void)[] = [];

  constructor(container: HTMLElement) {
    // Detect mobile for performance optimizations
    this.isMobile = isMobileDevice();

    // Scene setup
    this.scene = new THREE.Scene();
    // No fog for space/planet view

    // Camera setup (clipping planes from config)
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      PlayerConfig.CAMERA_NEAR,
      PlayerConfig.CAMERA_FAR
    );
    this.camera.position.set(0, 20, 0);
    this.farCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, FAR_LAYER_NEAR, FAR_LAYER_FAR);
    this.farScene.add(this.farRoot);

    // Renderer setup (preserveDrawingBuffer enables screenshots)
    this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
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
      // F2 to toggle tech blocks menu
      if (e.code === 'F2') {
        e.preventDefault();
        getTechBlocksMenu().toggle();
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

    // Create starfield background sphere (follows camera, always renders first/behind everything)
    const starfieldGeometry = new THREE.SphereGeometry(100, 64, 64); // Small radius since it follows camera
    const starfieldMaterial = createStarfieldMaterial();
    this.starfield = new THREE.Mesh(starfieldGeometry, starfieldMaterial);
    this.starfield.renderOrder = -1000; // Render first (behind everything)
    this.starfield.frustumCulled = false; // Never cull the starfield
    // The stars are behind everything, so they go in the far layer
    this.farScene.add(this.starfield);

    // Create sun sphere in the sky (radius 60 for prominent appearance)
    const sunGeometry = new THREE.SphereGeometry(60, 32, 32);
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xffdd44,
      fog: false,
    });
    this.sunMesh = new THREE.Mesh(sunGeometry, sunMaterial);
    // Position sun far away in sun direction
    this.sunMesh.position.copy(this.sunDirection.clone().multiplyScalar(800));
    this.farRoot.add(this.sunMesh); // far layer: visible from anywhere in the system

    // Ambient light - low for space darkness
    const ambientLight = new THREE.AmbientLight(0xffffff, PlayerConfig.AMBIENT_LIGHT_INTENSITY);
    this.scene.add(ambientLight);

    // Directional light (sun)
    this.directionalLight = new THREE.DirectionalLight(0xffffff, PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY);
    // Position light far away in sun direction
    this.directionalLight.position.copy(this.sunDirection.clone().multiplyScalar(500));
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 1024;
    this.directionalLight.shadow.mapSize.height = 1024;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 500;
    this.directionalLight.shadow.camera.left = -100;
    this.directionalLight.shadow.camera.right = 100;
    this.directionalLight.shadow.camera.top = 100;
    this.directionalLight.shadow.camera.bottom = -100;
    this.scene.add(this.directionalLight);

    // Hemisphere light for subtle sky/ground color blend
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x222222, PlayerConfig.HEMISPHERE_LIGHT_INTENSITY);
    this.scene.add(hemisphereLight);
  }

  /**
   * Set the actual sun world position and radius (from solar system config).
   * Updates sun mesh position/scale and directional light position.
   * @param position The sun's world position
   * @param radius Optional radius to scale the sun mesh (default keeps existing size)
   */
  // 0..1: how much of the starfield shows (1 = space, lower = daytime sky)
  public setStarVisibility(v: number): void {
    const mat = this.starfield?.material as THREE.ShaderMaterial | undefined;
    if (mat?.uniforms.starVisibility) mat.uniforms.starVisibility.value = v;
  }

  /**
   * Turn the stars and nebula with the reference frame (openspec day-night):
   * the same yaw the orbits turn the Sun and the other bodies by, so the
   * stars wheel overhead with the Sun. The sky pattern is fixed to the
   * starfield sphere (skybox.vert), so turning the sphere turns the sky.
   */
  public setSkyYaw(yaw: number): void {
    if (this.starfield) this.starfield.rotation.y = -yaw;
  }

  public setSunPosition(position: THREE.Vector3, radius?: number): void {
    // Update sun mesh to actual position
    if (this.sunMesh) {
      this.sunMesh.position.copy(position);

      // Scale the sun mesh if radius is provided
      // The sun geometry was created with radius 60, so we scale relative to that
      if (radius !== undefined) {
        const scale = radius / 60;
        this.sunMesh.scale.setScalar(scale);
      }
    }

    // Update directional light position (for shadows, etc.)
    if (this.directionalLight) {
      this.directionalLight.position.copy(position);
    }
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

  private syncFarLayer(): void {
    const cam = this.camera;
    cam.updateMatrixWorld();
    cam.getWorldPosition(this.farOrigin);
    this.farRoot.position.copy(this.farOrigin).negate();
    this.farRoot.updateMatrixWorld(true);
    cam.getWorldQuaternion(this.farCamera.quaternion);
    if (this.farCamera.fov !== cam.fov || this.farCamera.aspect !== cam.aspect) {
      this.farCamera.fov = cam.fov;
      this.farCamera.aspect = cam.aspect;
      this.farCamera.updateProjectionMatrix();
    }
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
      // Same vertex shader and uniforms (waves, flow smoothing), depth only
      this.waterBackDepth.set(material, new THREE.ShaderMaterial({
        uniforms: material.uniforms,
        vertexShader: material.vertexShader,
        fragmentShader: 'void main() { gl_FragColor = vec4(0.0); }',
        side: THREE.BackSide,
        depthWrite: true,
        colorWrite: false,
      }));
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

    // Rebase the far layer on the camera (the starfield stays at its origin)
    this.syncFarLayer();

    // Render with depth pre-pass for underwater fog
    profiler.begin('Render');

    // Under water the view ends in the fog colour: everything past the fog's
    // far distance is fully fogged, so the camera's far plane comes in to it
    // for this frame. That drops what has no underwater fog of its own (the
    // distant LOD, sea walls, sky shells, other planets) and the clear below
    // shows the fog colour behind it (scene.background is not drawn with
    // autoClear off)
    const underwater = this.isUnderwater && this.underwaterFog !== null;
    const viewFar = this.camera.far;
    if (underwater) {
      this.camera.far = this.underwaterFog!.far;
      this.camera.updateProjectionMatrix();
    }
    for (const material of this.waterMaterials) {
      if (material.uniforms.cameraFar) material.uniforms.cameraFar.value = this.camera.far;
    }

    // Depth pre-pass: render scene to depth buffer (hide water temporarily)
    // Uses cached waterMeshes Set for O(1) lookup instead of scene.traverse()
    if (this.depthRenderTarget && this.waterMeshes.size > 0) {
      // Water draws only its far side into the depth pass (waterBackDepth);
      // a water mesh whose material has no twin is hidden as before
      const swapped: Array<[THREE.Mesh, THREE.Material | THREE.Material[], boolean]> = [];
      for (const mesh of this.waterMeshes) {
        const back = this.waterBackDepth.get(mesh.material as THREE.Material);
        swapped.push([mesh, mesh.material, mesh.visible]);
        if (back) mesh.material = back;
        else mesh.visible = false;
      }

      // Render to depth target
      this.renderer.setRenderTarget(this.depthRenderTarget);
      this.renderer.render(this.scene, this.camera);
      this.renderer.setRenderTarget(null);

      for (const [mesh, material, visible] of swapped) {
        mesh.material = material;
        mesh.visible = visible;
      }
    }

    // Far layer, then the main scene over it with a fresh depth buffer;
    // under water no far layer, the frame cleared to the fog colour
    this.renderer.autoClear = false;
    if (underwater) {
      this.renderer.getClearColor(this.savedClearColor);
      const alpha = this.renderer.getClearAlpha();
      this.renderer.setClearColor(this.underwaterFog!.color, 1);
      this.renderer.clear();
      this.renderer.setClearColor(this.savedClearColor, alpha);
    } else {
      this.renderer.clear();
      this.renderer.render(this.farScene, this.farCamera);
      this.renderer.clearDepth();
    }
    this.renderer.render(this.scene, this.camera);
    this.renderer.autoClear = true;
    if (underwater) {
      this.camera.far = viewFar;
      this.camera.updateProjectionMatrix();
    }
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
      // Create and apply underwater fog. The terrain and water shaders mix
      // toward UNDERWATER_FOG_COLOR's linear value and write it as is (they
      // do no output encoding), so the fog and the background take the
      // colour that puts those same values on screen: everything fades into
      // one colour, with no edge where the terrain meets the background
      const linear = new THREE.Color(PlayerConfig.UNDERWATER_FOG_COLOR);
      const fogColor = new THREE.Color().setRGB(linear.r, linear.g, linear.b, THREE.SRGBColorSpace);
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
