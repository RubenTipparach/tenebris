import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { PlayerConfig } from '../config/PlayerConfig';

// Simple seeded random number generator (LCG algorithm)
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  // Returns a random number between 0 and 1
  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff;
    return this.seed / 0x7fffffff;
  }
}

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
  // Optimized: merges all geometries into a single mesh to reduce draw calls
  public createTree(
    position: THREE.Vector3,
    upDirection: THREE.Vector3,
    config: Partial<TreeConfig> = {}
  ): THREE.Group {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const tree = new THREE.Group();

    // Collect all geometries with their colors for merging
    const geometries: THREE.BufferGeometry[] = [];
    const trunkColor = new THREE.Color(0x8B4513); // Brown
    const leavesColor = new THREE.Color(0x228B22); // Green

    // Create trunk (hexagonal prism)
    const trunkGeom = this.createHexagonalPrism(cfg.trunkRadius, cfg.trunkHeight, 6);
    this.addVertexColors(trunkGeom, trunkColor);
    geometries.push(trunkGeom);

    // Create pine cone leaves (series of cones stacked)
    let currentHeight = cfg.trunkHeight;
    let currentRadius = cfg.leafBaseRadius;

    for (let i = 0; i < cfg.leafLayers; i++) {
      const layerHeight = 1.2;
      const coneGeom = new THREE.ConeGeometry(currentRadius, layerHeight, 6);
      coneGeom.translate(0, currentHeight + layerHeight / 2, 0);
      this.addVertexColors(coneGeom, leavesColor);
      geometries.push(coneGeom);

      currentHeight += layerHeight * 0.6; // Overlap layers
      currentRadius *= cfg.leafTaper;
    }

    // Merge all geometries into one
    const mergedGeom = BufferGeometryUtils.mergeGeometries(geometries);

    // Create merged mesh with custom shader material that uses vertex colors
    const mergedMaterial = this.createMergedTreeMaterial();
    const treeMesh = new THREE.Mesh(mergedGeom, mergedMaterial);
    treeMesh.userData.isTree = true;
    treeMesh.userData.treeType = 'trunk'; // Merged tree drops logs like trunk
    tree.add(treeMesh);

    // Clean up individual geometries
    for (const geom of geometries) {
      geom.dispose();
    }

    // Orient tree to point along upDirection
    const defaultUp = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultUp, upDirection.clone().normalize());
    tree.quaternion.copy(quaternion);

    // Position the tree
    tree.position.copy(position);

    // Trees never move: compute the matrices once and take the whole tree
    // out of three.js's per-frame matrix update (Sequoia has 1000+).
    tree.updateMatrixWorld(true);
    tree.traverse((obj) => {
      obj.matrixAutoUpdate = false;
      obj.matrixWorldAutoUpdate = false;
    });

    return tree;
  }

  // Helper to add vertex colors to a geometry
  private addVertexColors(geometry: THREE.BufferGeometry, color: THREE.Color): void {
    const positionCount = geometry.attributes.position.count;
    const colors = new Float32Array(positionCount * 3);
    for (let i = 0; i < positionCount; i++) {
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  // Create merged tree material with vertex colors and planet-aware lighting
  private createMergedTreeMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        sunDirection: { value: this.sunDirection.clone().normalize() },
        ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
        directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
      },
      vertexShader: `
        attribute vec3 color;
        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main() {
          vColor = color;
          vNormal = normalize(mat3(modelMatrix) * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 sunDirection;
        uniform float ambientIntensity;
        uniform float directionalIntensity;

        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main() {
          vec3 surfaceNormal = normalize(vWorldPosition);
          float planetSunFacing = dot(surfaceNormal, sunDirection);
          float shadowFactor = smoothstep(-0.1, 0.2, planetSunFacing);
          float meshDiffuse = max(0.0, dot(vNormal, sunDirection));
          float directional = meshDiffuse * shadowFactor * directionalIntensity;
          float ambient = ambientIntensity;
          vec3 finalColor = vColor * (ambient + directional);
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
    });
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

// Mockup toggle (Debug tab): improved tree shading - baked darkening toward
// the base of each tree and a per-tree tint, plus wrap lighting, sky/ground
// ambient and a rim light in the shader.
let improvedTreeShading = false;
const treeBatchers = new Set<TreeBatcher>();
export function setImprovedTreeShading(on: boolean): void {
  improvedTreeShading = on;
  for (const b of treeBatchers) b.setImproved(on);
}

// Batched tree rendering, one merged mesh per LOD chunk. Each chunk's mesh is
// built once (and again only if a tree in it is added or removed) and then
// just shown or hidden with the chunk. The old single batch was rebuilt -
// cloning and merging every visible tree - whenever the visible tile set
// changed, which at altitude was nearly every frame.
class TreeBatcher {
  private scene: THREE.Scene;
  private material: THREE.ShaderMaterial;
  private chunkOf: (tileIndex: number) => number = () => 0;
  private treesByChunk: Map<number, THREE.Group[]> = new Map();
  private meshes: Map<number, THREE.Mesh> = new Map();
  private dirty: Set<number> = new Set();
  private lastChunks: Set<number> | null = null;
  private showingAll: boolean | null = null;

  constructor(scene: THREE.Scene, material: THREE.ShaderMaterial) {
    this.scene = scene;
    this.material = material;
    treeBatchers.add(this);
    this.material.uniforms.improved.value = improvedTreeShading ? 1 : 0;
  }

  // Switch shading; the baked colours need every chunk rebuilt
  public setImproved(on: boolean): void {
    this.material.uniforms.improved.value = on ? 1 : 0;
    for (const chunk of this.treesByChunk.keys()) this.dirty.add(chunk);
    this.lastChunks = null;
    this.showingAll = null;
  }

  public setChunkLookup(chunkOf: (tileIndex: number) => number): void {
    this.chunkOf = chunkOf;
  }

  public setPlanetCenter(center: THREE.Vector3): void {
    this.material.uniforms.planetCenter.value.copy(center);
  }

  // Trees without a tile go in chunk -1, which is always shown
  private chunkFor(tree: THREE.Group): number {
    const tileIndex = tree.userData.tileIndex;
    return tileIndex === undefined ? -1 : this.chunkOf(tileIndex);
  }

  public add(tree: THREE.Group): void {
    const chunk = this.chunkFor(tree);
    tree.userData.treeChunk = chunk;
    let list = this.treesByChunk.get(chunk);
    if (!list) {
      list = [];
      this.treesByChunk.set(chunk, list);
    }
    list.push(tree);
    this.dirty.add(chunk);
    this.lastChunks = null;
  }

  public remove(tree: THREE.Group): void {
    const chunk = tree.userData.treeChunk as number | undefined;
    if (chunk === undefined) return;
    const list = this.treesByChunk.get(chunk);
    if (list) {
      const i = list.indexOf(tree);
      if (i >= 0) list.splice(i, 1);
    }
    this.dirty.add(chunk);
    this.lastChunks = null;
  }

  private build(chunk: number): void {
    const old = this.meshes.get(chunk);
    if (old) {
      this.scene.remove(old);
      old.geometry.dispose();
      this.meshes.delete(chunk);
    }
    this.dirty.delete(chunk);

    const geometries: THREE.BufferGeometry[] = [];
    for (const tree of this.treesByChunk.get(chunk) ?? []) {
      const treeGeoms: THREE.BufferGeometry[] = [];
      tree.traverse((child) => {
        if (child instanceof THREE.Mesh && child.geometry) {
          const geom = child.geometry.clone();
          child.updateWorldMatrix(true, false);
          geom.applyMatrix4(child.matrixWorld);
          treeGeoms.push(geom);
        }
      });
      if (improvedTreeShading) bakeTreeShading(tree, treeGeoms);
      geometries.push(...treeGeoms);
    }
    if (geometries.length === 0) return;

    const merged = BufferGeometryUtils.mergeGeometries(geometries);
    for (const geom of geometries) geom.dispose();
    if (!merged) return;
    merged.computeBoundingSphere();

    const mesh = new THREE.Mesh(merged, this.material);
    mesh.matrixAutoUpdate = false;
    mesh.matrixWorldAutoUpdate = false;
    mesh.visible = false;
    this.scene.add(mesh);
    this.meshes.set(chunk, mesh);
  }

  // Show exactly the given chunks (plus chunk -1). Same Set object as last
  // time and nothing changed = no work.
  public showChunks(chunks: Set<number>): void {
    if (chunks === this.lastChunks && this.dirty.size === 0 && this.showingAll === null) return;
    this.lastChunks = chunks;
    this.showingAll = null;
    for (const chunk of this.treesByChunk.keys()) {
      const visible = chunk === -1 || chunks.has(chunk);
      if (visible && (this.dirty.has(chunk) || !this.meshes.has(chunk))) this.build(chunk);
      const mesh = this.meshes.get(chunk);
      if (mesh) mesh.visible = visible;
    }
  }

  public showAll(visible: boolean): void {
    if (this.showingAll === visible && this.dirty.size === 0) return;
    this.showingAll = visible;
    this.lastChunks = null;
    for (const chunk of this.treesByChunk.keys()) {
      if (visible && (this.dirty.has(chunk) || !this.meshes.has(chunk))) this.build(chunk);
      const mesh = this.meshes.get(chunk);
      if (mesh) mesh.visible = visible;
    }
  }
}

// Improved shading, baked into vertex colours: darker toward the base of the
// tree (cheap ambient occlusion) and a small per-tree tint so a forest isn't
// one flat colour.
function bakeTreeShading(tree: THREE.Group, geoms: THREE.BufferGeometry[]): void {
  const up = new THREE.Vector3(0, 1, 0).applyQuaternion(tree.quaternion);
  const base = tree.position;
  let top = 0;
  const v = new THREE.Vector3();
  for (const g of geoms) {
    const pos = g.getAttribute('position');
    for (let i = 0; i < pos.count; i++) top = Math.max(top, v.fromBufferAttribute(pos, i).sub(base).dot(up));
  }
  if (top <= 0) return;
  // Stable per-tree tint from its position
  const h = Math.abs(Math.sin(base.x * 12.9898 + base.y * 78.233 + base.z * 37.719) * 43758.5453) % 1;
  const tint = [0.92 + 0.16 * h, 0.95 + 0.1 * ((h * 7) % 1), 0.9 + 0.12 * ((h * 13) % 1)];
  for (const g of geoms) {
    const pos = g.getAttribute('position');
    const col = g.getAttribute('color');
    if (!col) continue;
    for (let i = 0; i < pos.count; i++) {
      const t = v.fromBufferAttribute(pos, i).sub(base).dot(up) / top;
      const ao = 0.5 + 0.5 * Math.min(1, Math.max(0, t / 0.55));
      col.setXYZ(i, col.getX(i) * ao * tint[0], col.getY(i) * ao * tint[1], col.getZ(i) * ao * tint[2]);
    }
    col.needsUpdate = true;
  }
}

// Shared shader for batched trees. planetCenter makes the day/night term use
// the direction from the tree's own planet; it used normalize(worldPos),
// which only works for a planet at the origin (wrong on Sequoia and the Moon).
function createBatchedTreeMaterial(sunDirection: THREE.Vector3, doubleSided: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      sunDirection: { value: sunDirection.clone().normalize() },
      planetCenter: { value: new THREE.Vector3() },
      improved: { value: 0 },
      ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
      directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
    },
    vertexShader: `
      attribute vec3 color;
      varying vec3 vColor;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      void main() {
        vColor = color;
        vNormal = normalize(mat3(modelMatrix) * normal);
        vec4 worldPos = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 sunDirection;
      uniform vec3 planetCenter;
      uniform float improved;
      uniform float ambientIntensity;
      uniform float directionalIntensity;

      varying vec3 vColor;
      varying vec3 vNormal;
      varying vec3 vWorldPosition;

      void main() {
        vec3 surfaceNormal = normalize(vWorldPosition - planetCenter);
        float planetSunFacing = dot(surfaceNormal, sunDirection);
        float shadowFactor = smoothstep(-0.1, 0.2, planetSunFacing);
        vec3 n = normalize(vNormal);
        if (!gl_FrontFacing) n = -n;
        float meshDiffuse = max(0.0, dot(n, sunDirection));
        float directional = meshDiffuse * shadowFactor * directionalIntensity;
        vec3 finalColor = vColor * (ambientIntensity + directional);
        if (improved > 0.5) {
          // Wrap lighting (soft terminator on the canopy), sky/ground
          // hemisphere ambient, and a rim on the sun side
          float wrap = max(0.0, (dot(n, sunDirection) + 0.4) / 1.4);
          float hemi = 0.5 + 0.5 * dot(n, surfaceNormal);
          vec3 ambient = mix(vec3(0.55, 0.5, 0.45), vec3(0.75, 0.85, 1.0), hemi) * ambientIntensity * (0.6 + 0.4 * shadowFactor);
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          float rim = pow(1.0 - max(0.0, dot(n, viewDir)), 3.0) * shadowFactor * 0.35;
          finalColor = vColor * (ambient + wrap * shadowFactor * directionalIntensity) + vec3(1.0, 0.92, 0.75) * rim;
        }
        gl_FragColor = vec4(finalColor, 1.0);
      }
    `,
    side: doubleSided ? THREE.DoubleSide : THREE.FrontSide,
    polygonOffset: doubleSided,
    polygonOffsetFactor: doubleSided ? 1 : 0,
    polygonOffsetUnits: doubleSided ? 1 : 0,
  });
}

// Tree manager for a planet - now with geometry batching for performance
export class PlanetTreeManager {
  private trees: THREE.Group[] = [];
  private treesByTile: Map<number, THREE.Group[]> = new Map(); // Trees grouped by tile index
  private treeBuilder: TreeBuilder;
  private scene: THREE.Scene;

  private batcher: TreeBatcher;
  private sunDirection: THREE.Vector3;

  constructor(scene: THREE.Scene, sunDirection?: THREE.Vector3) {
    this.scene = scene;
    this.treeBuilder = new TreeBuilder(sunDirection);
    this.sunDirection = sunDirection?.clone().normalize() ?? new THREE.Vector3(
      PlayerConfig.SUN_DIRECTION.x,
      PlayerConfig.SUN_DIRECTION.y,
      PlayerConfig.SUN_DIRECTION.z
    ).normalize();
    this.batcher = new TreeBatcher(scene, createBatchedTreeMaterial(this.sunDirection, false));
  }

  // Place a tree at a specific world position
  public addTree(worldPosition: THREE.Vector3, planetCenter: THREE.Vector3, config?: Partial<TreeConfig>, tileIndex?: number): THREE.Group {
    // Calculate up direction (away from planet center)
    const upDirection = worldPosition.clone().sub(planetCenter).normalize();

    // Create tree
    const tree = this.treeBuilder.createTree(worldPosition, upDirection, config);

    // Store tile index in userData for visibility tracking
    if (tileIndex !== undefined) {
      tree.userData.tileIndex = tileIndex;

      // Group trees by tile for efficient visibility updates
      if (!this.treesByTile.has(tileIndex)) {
        this.treesByTile.set(tileIndex, []);
      }
      this.treesByTile.get(tileIndex)!.push(tree);
    }

    // Drawn by the batcher; the individual tree stays for raycasts
    tree.visible = false;
    this.trees.push(tree);
    this.scene.add(tree);
    this.batcher.add(tree);

    return tree;
  }

  // Remove a tree
  public removeTree(tree: THREE.Group): void {
    const index = this.trees.indexOf(tree);
    if (index >= 0) {
      this.trees.splice(index, 1);
      this.scene.remove(tree);
      this.batcher.remove(tree);

      // Remove from treesByTile map
      const tileIndex = tree.userData.tileIndex;
      if (tileIndex !== undefined && this.treesByTile.has(tileIndex)) {
        const tileTrees = this.treesByTile.get(tileIndex)!;
        const tileTreeIndex = tileTrees.indexOf(tree);
        if (tileTreeIndex >= 0) {
          tileTrees.splice(tileTreeIndex, 1);
        }
      }

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

  // Scatter trees randomly on planet surface using seeded random
  public scatterTrees(
    planetCenter: THREE.Vector3,
    _planetRadius: number,
    count: number,
    getSurfaceHeight: (direction: THREE.Vector3) => number,
    isUnderwater?: (direction: THREE.Vector3) => boolean,
    seed: number = PlayerConfig.TERRAIN_SEED,
    getTileIndex?: (direction: THREE.Vector3) => number | null,
    getTileCenter?: (direction: THREE.Vector3) => THREE.Vector3 | null,
    removedTiles?: Set<number>
  ): void {
    this.batcher.setPlanetCenter(planetCenter);
    const rng = new SeededRandom(seed + 54321); // Offset seed slightly for trees
    let placed = 0;
    let attempts = 0;
    const maxAttempts = count * 5; // Avoid infinite loop if most terrain is water
    const usedTiles = new Set<number>(); // Track which tiles already have trees

    while (placed < count && attempts < maxAttempts) {
      attempts++;

      // Random direction on sphere using seeded random
      const theta = rng.next() * Math.PI * 2;
      const phi = Math.acos(2 * rng.next() - 1);

      let direction = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.sin(phi) * Math.sin(theta),
        Math.cos(phi)
      ).normalize();

      // Get tile index for visibility tracking and deduplication
      const tileIndex = getTileIndex ? getTileIndex(direction) : null;

      // Skip if this tile already has a tree or was previously removed
      if (tileIndex !== null && (usedTiles.has(tileIndex) || removedTiles?.has(tileIndex))) {
        continue;
      }

      // Snap to tile center if available
      if (getTileCenter) {
        const tileCenter = getTileCenter(direction);
        if (tileCenter) {
          direction = tileCenter.clone().sub(planetCenter).normalize();
        }
      }

      // Skip underwater locations
      if (isUnderwater && isUnderwater(direction)) {
        continue;
      }

      // Get surface height at this direction
      const surfaceHeight = getSurfaceHeight(direction);

      // Position tree on surface (no offset - tree base sits at ground level)
      const treePosition = planetCenter.clone().add(
        direction.clone().multiplyScalar(surfaceHeight)
      );

      // Mark this tile as used
      if (tileIndex !== null) {
        usedTiles.add(tileIndex);
      }

      // Randomize tree size with wider variation using seeded random
      const sizeVariation = 0.5 + rng.next() * 1.0; // 0.5 to 1.5 (wider range)
      const heightVariation = 0.6 + rng.next() * 0.9; // 0.6 to 1.5 (independent height variation)
      const config: Partial<TreeConfig> = {
        trunkHeight: DEFAULT_CONFIG.trunkHeight * sizeVariation * heightVariation,
        trunkRadius: DEFAULT_CONFIG.trunkRadius * sizeVariation,
        leafBaseRadius: DEFAULT_CONFIG.leafBaseRadius * sizeVariation,
        leafLayers: Math.floor(2 + rng.next() * 4), // 2-5 layers for more variety
        leafTaper: 0.6 + rng.next() * 0.2, // 0.6 to 0.8 for shape variation
      };

      this.addTree(treePosition, planetCenter, config, tileIndex ?? undefined);
      placed++;
    }
  }

  // Which LOD chunks' trees are drawn (Planet.getVisibleTreeChunks())
  public updateVisibility(visibleChunks: Set<number>): void {
    this.batcher.showChunks(visibleChunks);
  }

  // Show or hide every tree (orbit view)
  public setAllVisible(visible: boolean): void {
    this.batcher.showAll(visible);
  }

  // Map a tile to its LOD chunk; set before scattering trees
  public setChunkLookup(chunkOf: (tileIndex: number) => number): void {
    this.batcher.setChunkLookup(chunkOf);
  }

  public getTrees(): THREE.Group[] {
    return this.trees;
  }

  public getTreeBuilder(): TreeBuilder {
    return this.treeBuilder;
  }
}

// ============================================================================
// MUSHROOM TREE BUILDER - For alien planets like Sequoia
// ============================================================================

export interface MushroomTreeConfig {
  stemHeight: number;       // Height of mushroom stem
  stemRadius: number;       // Radius of stem
  capRadius: number;        // Radius of mushroom cap
  capHeight: number;        // Height/thickness of cap
  capTaper: number;         // 0 = flat disc, 1 = pointed cone
}

const DEFAULT_MUSHROOM_CONFIG: MushroomTreeConfig = {
  stemHeight: 4,
  stemRadius: 0.4,
  capRadius: 3,
  capHeight: 1.5,
  capTaper: 0.3,  // Slightly domed
};

export class MushroomTreeBuilder {
  private sunDirection: THREE.Vector3;

  constructor(sunDirection?: THREE.Vector3) {
    this.sunDirection = sunDirection?.clone().normalize() ?? new THREE.Vector3(
      PlayerConfig.SUN_DIRECTION.x,
      PlayerConfig.SUN_DIRECTION.y,
      PlayerConfig.SUN_DIRECTION.z
    ).normalize();
  }

  // Create a mushroom tree mesh at the given position with outward-pointing direction
  public createTree(
    position: THREE.Vector3,
    upDirection: THREE.Vector3,
    config: Partial<MushroomTreeConfig> = {}
  ): THREE.Group {
    const cfg = { ...DEFAULT_MUSHROOM_CONFIG, ...config };
    const tree = new THREE.Group();

    // Collect geometries for merging
    const geometries: THREE.BufferGeometry[] = [];
    const stemColor = new THREE.Color(0x8B7355);  // Grey-brown stem
    const capColor = new THREE.Color(0x654321);   // Brown cap

    // Create stem (hexagonal prism)
    const stemGeom = this.createHexagonalPrism(cfg.stemRadius, cfg.stemHeight, 6);
    this.addVertexColors(stemGeom, stemColor);
    geometries.push(stemGeom);

    // Create mushroom cap (flattened cone or dome)
    // Use ConeGeometry for the mushroom shape
    const capGeom = new THREE.ConeGeometry(cfg.capRadius, cfg.capHeight, 8, 1, false);
    // Position cap on top of stem
    capGeom.translate(0, cfg.stemHeight + cfg.capHeight / 2, 0);
    this.addVertexColors(capGeom, capColor);
    geometries.push(capGeom);

    // Add cap underside (disc at bottom of cap for visual completeness)
    // Offset slightly above stem top to prevent z-fighting with stem
    const undersideGeom = new THREE.CircleGeometry(cfg.capRadius * 0.9, 8);
    undersideGeom.rotateX(Math.PI / 2);  // Make it horizontal, facing down
    undersideGeom.translate(0, cfg.stemHeight + 0.05, 0);  // Small offset to avoid z-fighting
    const undersideColor = new THREE.Color(0x4a3520);  // Darker underside
    this.addVertexColors(undersideGeom, undersideColor);
    geometries.push(undersideGeom);

    // Merge all geometries into one
    const mergedGeom = BufferGeometryUtils.mergeGeometries(geometries);

    // Create merged mesh with custom shader material
    const mergedMaterial = this.createMergedMushroomMaterial();
    const treeMesh = new THREE.Mesh(mergedGeom, mergedMaterial);
    treeMesh.userData.isTree = true;
    treeMesh.userData.treeType = 'mushroom';
    tree.add(treeMesh);

    // Clean up individual geometries
    for (const geom of geometries) {
      geom.dispose();
    }

    // Orient mushroom to point along upDirection
    const defaultUp = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(defaultUp, upDirection.clone().normalize());
    tree.quaternion.copy(quaternion);

    // Position the mushroom
    tree.position.copy(position);

    // Trees never move: compute the matrices once and take the whole tree
    // out of three.js's per-frame matrix update (Sequoia has 1000+).
    tree.updateMatrixWorld(true);
    tree.traverse((obj) => {
      obj.matrixAutoUpdate = false;
      obj.matrixWorldAutoUpdate = false;
    });

    return tree;
  }

  // Helper to add vertex colors to a geometry
  private addVertexColors(geometry: THREE.BufferGeometry, color: THREE.Color): void {
    const positionCount = geometry.attributes.position.count;
    const colors = new Float32Array(positionCount * 3);
    for (let i = 0; i < positionCount; i++) {
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  // Create merged mushroom material with vertex colors and planet-aware lighting
  private createMergedMushroomMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        sunDirection: { value: this.sunDirection.clone().normalize() },
        ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
        directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
      },
      vertexShader: `
        attribute vec3 color;
        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main() {
          vColor = color;
          vNormal = normalize(mat3(modelMatrix) * normal);
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 sunDirection;
        uniform float ambientIntensity;
        uniform float directionalIntensity;

        varying vec3 vColor;
        varying vec3 vNormal;
        varying vec3 vWorldPosition;

        void main() {
          vec3 surfaceNormal = normalize(vWorldPosition);
          float planetSunFacing = dot(surfaceNormal, sunDirection);
          float shadowFactor = smoothstep(-0.1, 0.2, planetSunFacing);
          float meshDiffuse = max(0.0, dot(vNormal, sunDirection));
          float directional = meshDiffuse * shadowFactor * directionalIntensity;
          float ambient = ambientIntensity;
          vec3 finalColor = vColor * (ambient + directional);
          gl_FragColor = vec4(finalColor, 1.0);
        }
      `,
      side: THREE.DoubleSide,  // Render both sides for the cap underside
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
  }

  // Create a hexagonal prism geometry
  private createHexagonalPrism(radius: number, height: number, segments: number): THREE.BufferGeometry {
    const geometry = new THREE.CylinderGeometry(radius, radius, height, segments);
    geometry.translate(0, height / 2, 0);
    return geometry;
  }
}

// Mushroom tree manager - extends PlanetTreeManager pattern with batching
export class MushroomTreeManager {
  private trees: THREE.Group[] = [];
  private treesByTile: Map<number, THREE.Group[]> = new Map();
  private treeBuilder: MushroomTreeBuilder;
  private scene: THREE.Scene;

  private batcher: TreeBatcher;
  private sunDirection: THREE.Vector3;

  constructor(scene: THREE.Scene, sunDirection?: THREE.Vector3) {
    this.scene = scene;
    this.treeBuilder = new MushroomTreeBuilder(sunDirection);
    this.sunDirection = sunDirection?.clone().normalize() ?? new THREE.Vector3(
      PlayerConfig.SUN_DIRECTION.x,
      PlayerConfig.SUN_DIRECTION.y,
      PlayerConfig.SUN_DIRECTION.z
    ).normalize();
    this.batcher = new TreeBatcher(scene, createBatchedTreeMaterial(this.sunDirection, true));
  }

  // Place a mushroom at a specific world position
  public addTree(worldPosition: THREE.Vector3, planetCenter: THREE.Vector3, config?: Partial<MushroomTreeConfig>, tileIndex?: number): THREE.Group {
    const upDirection = worldPosition.clone().sub(planetCenter).normalize();
    const tree = this.treeBuilder.createTree(worldPosition, upDirection, config);

    if (tileIndex !== undefined) {
      tree.userData.tileIndex = tileIndex;
      if (!this.treesByTile.has(tileIndex)) {
        this.treesByTile.set(tileIndex, []);
      }
      this.treesByTile.get(tileIndex)!.push(tree);
    }

    // Drawn by the batcher; the individual tree stays for raycasts
    tree.visible = false;
    this.trees.push(tree);
    this.scene.add(tree);
    this.batcher.add(tree);
    return tree;
  }

  // Remove a mushroom tree
  public removeTree(tree: THREE.Group): void {
    const index = this.trees.indexOf(tree);
    if (index >= 0) {
      this.trees.splice(index, 1);
      this.scene.remove(tree);
      this.batcher.remove(tree);

      const tileIndex = tree.userData.tileIndex;
      if (tileIndex !== undefined && this.treesByTile.has(tileIndex)) {
        const tileTrees = this.treesByTile.get(tileIndex)!;
        const tileTreeIndex = tileTrees.indexOf(tree);
        if (tileTreeIndex >= 0) {
          tileTrees.splice(tileTreeIndex, 1);
        }
      }

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

  // Get all tree meshes for raycasting
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

  // Scatter mushroom trees randomly on planet surface
  public scatterTrees(
    planetCenter: THREE.Vector3,
    _planetRadius: number,
    count: number,
    getSurfaceHeight: (direction: THREE.Vector3) => number,
    isUnderwater?: (direction: THREE.Vector3) => boolean,
    seed: number = PlayerConfig.TERRAIN_SEED,
    getTileIndex?: (direction: THREE.Vector3) => number | null,
    _getTileCenter?: (direction: THREE.Vector3) => THREE.Vector3 | null,
    removedTreeTiles?: Set<number>
  ): void {
    this.batcher.setPlanetCenter(planetCenter);
    const rng = new SeededRandom(seed + 98765);  // Different offset from regular trees

    let placed = 0;
    let attempts = 0;
    const maxAttempts = count * 10;

    while (placed < count && attempts < maxAttempts) {
      attempts++;

      // Generate random direction on sphere using seeded random
      const theta = rng.next() * Math.PI * 2;
      const phi = Math.acos(2 * rng.next() - 1);
      const direction = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta)
      ).normalize();

      // Skip if underwater
      if (isUnderwater && isUnderwater(direction)) {
        continue;
      }

      // Get tile index and skip if tree was removed from this tile
      const tileIndex = getTileIndex ? getTileIndex(direction) : null;
      if (tileIndex !== null && removedTreeTiles?.has(tileIndex)) {
        continue;
      }

      // Get surface height and place mushroom slightly above
      const surfaceHeight = getSurfaceHeight(direction);
      const treePosition = direction.clone().multiplyScalar(surfaceHeight + 0.1);
      treePosition.add(planetCenter);

      // Randomize mushroom size
      const sizeVariation = 0.6 + rng.next() * 0.8;  // 0.6 to 1.4
      const heightVariation = 0.7 + rng.next() * 0.6;  // 0.7 to 1.3
      const config: Partial<MushroomTreeConfig> = {
        stemHeight: DEFAULT_MUSHROOM_CONFIG.stemHeight * sizeVariation * heightVariation,
        stemRadius: DEFAULT_MUSHROOM_CONFIG.stemRadius * sizeVariation,
        capRadius: DEFAULT_MUSHROOM_CONFIG.capRadius * sizeVariation,
        capHeight: DEFAULT_MUSHROOM_CONFIG.capHeight * sizeVariation,
        capTaper: 0.2 + rng.next() * 0.3,  // 0.2 to 0.5 for shape variation
      };

      this.addTree(treePosition, planetCenter, config, tileIndex ?? undefined);
      placed++;
    }
  }

  // Which LOD chunks' trees are drawn (Planet.getVisibleTreeChunks())
  public updateVisibility(visibleChunks: Set<number>): void {
    this.batcher.showChunks(visibleChunks);
  }

  // Show or hide every tree (orbit view)
  public setAllVisible(visible: boolean): void {
    this.batcher.showAll(visible);
  }

  // Map a tile to its LOD chunk; set before scattering trees
  public setChunkLookup(chunkOf: (tileIndex: number) => number): void {
    this.batcher.setChunkLookup(chunkOf);
  }

  public getTrees(): THREE.Group[] {
    return this.trees;
  }

  public getTreeBuilder(): MushroomTreeBuilder {
    return this.treeBuilder;
  }
}
