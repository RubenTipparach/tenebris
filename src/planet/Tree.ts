import * as THREE from 'three';
import { PlayerConfig } from '../config/PlayerConfig';

export interface TreeConfig {
  trunkHeight: number;
  trunkRadius: number;
  leafLayers: number;
  leafBaseRadius: number;
  leafTaper: number; // How much each layer shrinks
}

const DEFAULT_CONFIG: TreeConfig = {
  trunkHeight: 3,
  trunkRadius: 0.3,
  leafLayers: 4,
  leafBaseRadius: 2,
  leafTaper: 0.7,
};

// Create a custom shader material that respects planet shadowing
// Objects on the dark side of the planet receive no directional light
function createPlanetAwareMaterial(baseColor: THREE.Color, sunDirection: THREE.Vector3): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      baseColor: { value: baseColor },
      sunDirection: { value: sunDirection.clone().normalize() },
      ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
      directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      void main() {
        // Transform normal to world space (not view space)
        vNormal = normalize(mat3(modelMatrix) * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 baseColor;
      uniform vec3 sunDirection;
      uniform float ambientIntensity;
      uniform float directionalIntensity;

      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      void main() {
        // Calculate surface normal (direction from planet center)
        // Trees are placed relative to planet center at origin or offset
        // Use world position normalized as approximation of planet surface normal
        vec3 surfaceNormal = normalize(vWorldPosition);

        // Check if this side of planet faces the sun
        // dot > 0 means facing sun, dot < 0 means in shadow
        float planetSunFacing = dot(surfaceNormal, sunDirection);

        // Smooth transition at terminator (day/night boundary)
        float shadowFactor = smoothstep(-0.1, 0.2, planetSunFacing);

        // Standard Lambert diffuse lighting on the mesh itself
        float meshDiffuse = max(0.0, dot(vNormal, sunDirection));

        // Combine: directional light only applies if planet surface faces sun
        float directional = meshDiffuse * shadowFactor * directionalIntensity;
        float ambient = ambientIntensity;

        vec3 finalColor = baseColor * (ambient + directional);

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
  });
}

export class TreeBuilder {
  private trunkMaterial: THREE.ShaderMaterial;
  private leavesMaterial: THREE.ShaderMaterial;
  private sunDirection: THREE.Vector3;

  constructor(sunDirection?: THREE.Vector3) {
    // Get sun direction from config or parameter
    this.sunDirection = sunDirection?.clone().normalize() ?? new THREE.Vector3(
      PlayerConfig.SUN_DIRECTION.x,
      PlayerConfig.SUN_DIRECTION.y,
      PlayerConfig.SUN_DIRECTION.z
    ).normalize();

    // Brown trunk material with planet-aware lighting
    this.trunkMaterial = createPlanetAwareMaterial(new THREE.Color(0x8B4513), this.sunDirection);
    // Green leaves material with planet-aware lighting
    this.leavesMaterial = createPlanetAwareMaterial(new THREE.Color(0x228B22), this.sunDirection);
  }

  // Create a tree mesh at the given position with outward-pointing direction
  public createTree(
    position: THREE.Vector3,
    upDirection: THREE.Vector3,
    config: Partial<TreeConfig> = {}
  ): THREE.Group {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const tree = new THREE.Group();

    // Create trunk (hexagonal prism)
    const trunkGeom = this.createHexagonalPrism(cfg.trunkRadius, cfg.trunkHeight, 6);
    const trunk = new THREE.Mesh(trunkGeom, this.trunkMaterial);
    trunk.userData.isTree = true;
    trunk.userData.treeType = 'trunk';
    tree.add(trunk);

    // Create pine cone leaves (series of cones stacked)
    let currentHeight = cfg.trunkHeight;
    let currentRadius = cfg.leafBaseRadius;

    for (let i = 0; i < cfg.leafLayers; i++) {
      const layerHeight = 1.2;
      const coneGeom = new THREE.ConeGeometry(currentRadius, layerHeight, 6);

      const cone = new THREE.Mesh(coneGeom, this.leavesMaterial);
      cone.position.y = currentHeight + layerHeight / 2;
      cone.userData.isTree = true;
      cone.userData.treeType = 'leaves';
      tree.add(cone);

      currentHeight += layerHeight * 0.6; // Overlap layers
      currentRadius *= cfg.leafTaper;
    }

    // Orient tree to point along upDirection
    const defaultUp = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultUp, upDirection.clone().normalize());
    tree.quaternion.copy(quaternion);

    // Position the tree
    tree.position.copy(position);

    return tree;
  }

  // Create a hexagonal prism geometry
  private createHexagonalPrism(radius: number, height: number, segments: number): THREE.BufferGeometry {
    const geometry = new THREE.CylinderGeometry(radius, radius, height, segments);
    // Offset so base is at origin
    geometry.translate(0, height / 2, 0);
    return geometry;
  }

  public getTrunkMaterial(): THREE.Material {
    return this.trunkMaterial;
  }

  public getLeavesMaterial(): THREE.Material {
    return this.leavesMaterial;
  }
}

// Tree manager for a planet
export class PlanetTreeManager {
  private trees: THREE.Group[] = [];
  private treeBuilder: TreeBuilder;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene, sunDirection?: THREE.Vector3) {
    this.scene = scene;
    this.treeBuilder = new TreeBuilder(sunDirection);
  }

  // Place a tree at a specific world position
  public addTree(worldPosition: THREE.Vector3, planetCenter: THREE.Vector3, config?: Partial<TreeConfig>): THREE.Group {
    // Calculate up direction (away from planet center)
    const upDirection = worldPosition.clone().sub(planetCenter).normalize();

    // Create tree
    const tree = this.treeBuilder.createTree(worldPosition, upDirection, config);

    this.trees.push(tree);
    this.scene.add(tree);

    return tree;
  }

  // Remove a tree
  public removeTree(tree: THREE.Group): void {
    const index = this.trees.indexOf(tree);
    if (index >= 0) {
      this.trees.splice(index, 1);
      this.scene.remove(tree);

      // Dispose geometries
      tree.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
        }
      });
    }
  }

  // Get tree at position (for mining)
  public getTreeAtPosition(position: THREE.Vector3, maxDistance: number = 1): THREE.Group | null {
    for (const tree of this.trees) {
      if (tree.position.distanceTo(position) < maxDistance) {
        return tree;
      }
    }
    return null;
  }

  // Get all tree meshes for raycasting (avoids scene traversal)
  public getTreeMeshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    for (const tree of this.trees) {
      tree.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.isTree) {
          meshes.push(child);
        }
      });
    }
    return meshes;
  }

  // Scatter trees randomly on planet surface
  public scatterTrees(
    planetCenter: THREE.Vector3,
    _planetRadius: number,
    count: number,
    getSurfaceHeight: (direction: THREE.Vector3) => number,
    isUnderwater?: (direction: THREE.Vector3) => boolean
  ): void {
    let placed = 0;
    let attempts = 0;
    const maxAttempts = count * 5; // Avoid infinite loop if most terrain is water

    while (placed < count && attempts < maxAttempts) {
      attempts++;

      // Random direction on sphere
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const direction = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi)
      ).normalize();

      // Skip underwater locations
      if (isUnderwater && isUnderwater(direction)) {
        continue;
      }

      // Get surface height at this direction
      const surfaceHeight = getSurfaceHeight(direction);

      // Position tree on surface
      const treePosition = planetCenter.clone().add(
        direction.clone().multiplyScalar(surfaceHeight + 0.1) // Slightly above surface
      );

      // Randomize tree size a bit
      const sizeVariation = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
      const config: Partial<TreeConfig> = {
        trunkHeight: DEFAULT_CONFIG.trunkHeight * sizeVariation,
        leafBaseRadius: DEFAULT_CONFIG.leafBaseRadius * sizeVariation,
        leafLayers: Math.floor(3 + Math.random() * 2), // 3-4 layers
      };

      this.addTree(treePosition, planetCenter, config);
      placed++;
    }
  }

  public getTrees(): THREE.Group[] {
    return this.trees;
  }

  public getTreeBuilder(): TreeBuilder {
    return this.treeBuilder;
  }
}
