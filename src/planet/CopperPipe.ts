import * as THREE from 'three';
import { getAssetPath } from '../utils/assetPath';
import { PlayerConfig } from '../config/PlayerConfig';
import techVert from '../shaders/tech/tech.vert';
import techFrag from '../shaders/tech/tech.frag';
import { PlacedHydroGenerator } from './HydroGenerator';
import { PlacedSteamEngine } from './SteamEngine';

// Pipe connection types
export type PipeConnectionTarget =
  | { type: 'pipe'; pipeId: string }
  | { type: 'hydro-generator'; tileIndex: number }
  | { type: 'steam-engine'; tileIndex: number };

export interface PlacedCopperPipe {
  id: string;
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  tileIndex: number;
  depth: number;
  // Connected neighbors (up to 6 directions on hexagonal planet)
  connections: PipeConnectionTarget[];
  // Visual connector meshes to adjacent pipes
  connectorMeshes: THREE.Mesh[];
}

// Network represents a connected set of pipes linking machines
export interface PipeNetwork {
  id: string;
  pipes: string[]; // Pipe IDs in this network
  connectedHydroGenerators: number[]; // Tile indices
  connectedSteamEngines: number[]; // Tile indices
}

export class CopperPipeManager {
  private scene: THREE.Scene;
  private pipes: Map<string, PlacedCopperPipe> = new Map();
  private networks: Map<string, PipeNetwork> = new Map();
  private textureLoader: THREE.TextureLoader;
  private pipeMaterial: THREE.ShaderMaterial | null = null;

  // Planet references
  private planetCenter: THREE.Vector3;
  private sunDirection: THREE.Vector3;

  // Pipe dimensions (1/4 size of tech block = 0.8/4 = 0.2)
  private readonly PIPE_SIZE = 0.2;
  private readonly CONNECTOR_SIZE = 0.08; // Thin connector between pipes

  // Callbacks for getting machine positions
  private getHydroGeneratorAtTile: ((tileIndex: number) => PlacedHydroGenerator | undefined) | null = null;
  private getSteamEngineAtTile: ((tileIndex: number) => PlacedSteamEngine | undefined) | null = null;
  private getNeighborTiles: ((tileIndex: number) => number[]) | null = null;

  constructor(scene: THREE.Scene, planetCenter?: THREE.Vector3, sunDirection?: THREE.Vector3) {
    this.scene = scene;
    this.textureLoader = new THREE.TextureLoader();
    this.planetCenter = planetCenter?.clone() || new THREE.Vector3(0, 0, 0);
    this.sunDirection = sunDirection?.clone() || new THREE.Vector3(1, 0, 0);
    this.initMaterial();
  }

  public setMachineCallbacks(
    getHydroGeneratorAtTile: (tileIndex: number) => PlacedHydroGenerator | undefined,
    getSteamEngineAtTile: (tileIndex: number) => PlacedSteamEngine | undefined,
    getNeighborTiles: (tileIndex: number) => number[]
  ): void {
    this.getHydroGeneratorAtTile = getHydroGeneratorAtTile;
    this.getSteamEngineAtTile = getSteamEngineAtTile;
    this.getNeighborTiles = getNeighborTiles;
  }

  public setSunDirection(direction: THREE.Vector3): void {
    this.sunDirection.copy(direction);
    if (this.pipeMaterial) {
      this.pipeMaterial.uniforms.sunDirection.value.copy(direction);
    }
  }

  public setPlanetCenter(center: THREE.Vector3): void {
    this.planetCenter.copy(center);
    if (this.pipeMaterial) {
      this.pipeMaterial.uniforms.planetCenter.value.copy(center);
    }
  }

  private async initMaterial(): Promise<void> {
    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader.load(
        getAssetPath('/textures/technology/copper_pipe.png'),
        resolve,
        undefined,
        reject
      );
    });

    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    this.pipeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        techTexture: { value: texture },
        sunDirection: { value: this.sunDirection.clone() },
        planetCenter: { value: this.planetCenter.clone() },
        ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
        directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
        torchLight: { value: 0.0 },
      },
      vertexShader: techVert,
      fragmentShader: techFrag,
    });
  }

  // Generate unique ID for a pipe at a specific location
  private generatePipeId(tileIndex: number, depth: number): string {
    return `pipe_${tileIndex}_${depth}`;
  }

  // Create mesh for a single pipe node
  private createPipeMesh(position: THREE.Vector3): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(this.PIPE_SIZE, this.PIPE_SIZE, this.PIPE_SIZE);
    const material = this.pipeMaterial!.clone();
    const mesh = new THREE.Mesh(geometry, material);

    // Orient to surface
    const up = position.clone().sub(this.planetCenter).normalize();
    const alignQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    mesh.quaternion.copy(alignQuat);
    mesh.position.copy(position);

    mesh.userData.isCopperPipe = true;

    return mesh;
  }

  // Create connector mesh between two positions
  private createConnectorMesh(from: THREE.Vector3, to: THREE.Vector3): THREE.Mesh {
    const midpoint = from.clone().add(to).multiplyScalar(0.5);
    const direction = to.clone().sub(from);
    const length = direction.length();

    // Create thin box for connector (oriented along the connection)
    const geometry = new THREE.BoxGeometry(this.CONNECTOR_SIZE, this.CONNECTOR_SIZE, length);
    const material = this.pipeMaterial!.clone();
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.copy(midpoint);

    // Orient the connector to point from 'from' to 'to'
    // First, get the direction vector
    const dir = direction.normalize();
    // Create a quaternion that rotates Z axis to point along dir
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    mesh.quaternion.copy(quaternion);

    mesh.userData.isPipeConnector = true;

    return mesh;
  }

  // Place a new copper pipe
  public async placePipe(
    worldPosition: THREE.Vector3,
    tileIndex: number,
    depth: number
  ): Promise<PlacedCopperPipe | null> {
    if (!this.pipeMaterial) {
      await this.initMaterial();
    }

    if (!this.pipeMaterial) {
      console.error('Failed to initialize pipe material');
      return null;
    }

    const pipeId = this.generatePipeId(tileIndex, depth);

    // Check if pipe already exists at this location
    if (this.pipes.has(pipeId)) {
      return null;
    }

    // Position pipe slightly above surface
    const up = worldPosition.clone().sub(this.planetCenter).normalize();
    const pipePosition = worldPosition.clone().add(up.clone().multiplyScalar(this.PIPE_SIZE / 2));

    const mesh = this.createPipeMesh(pipePosition);
    mesh.userData.pipeId = pipeId;
    mesh.userData.tileIndex = tileIndex;
    mesh.userData.depth = depth;

    this.scene.add(mesh);

    const pipe: PlacedCopperPipe = {
      id: pipeId,
      mesh,
      position: pipePosition.clone(),
      tileIndex,
      depth,
      connections: [],
      connectorMeshes: [],
    };

    this.pipes.set(pipeId, pipe);

    // Update connections for this pipe and neighbors
    this.updatePipeConnections(pipe);

    // Update visual connectors for this pipe and its neighbors
    this.updateVisualConnectors(pipe);

    // Rebuild networks
    this.rebuildNetworks();

    return pipe;
  }

  // Update visual connector meshes for a pipe and its connected neighbors
  private updateVisualConnectors(pipe: PlacedCopperPipe): void {
    // Clear existing connectors for this pipe
    for (const connector of pipe.connectorMeshes) {
      this.scene.remove(connector);
      connector.geometry.dispose();
      if (connector.material instanceof THREE.ShaderMaterial) {
        connector.material.dispose();
      }
    }
    pipe.connectorMeshes = [];

    // Create connectors to adjacent pipes
    for (const conn of pipe.connections) {
      if (conn.type === 'pipe') {
        const neighborPipe = this.pipes.get(conn.pipeId);
        if (neighborPipe) {
          // Only create connector if this pipe's ID is "less than" neighbor's to avoid duplicates
          if (pipe.id < neighborPipe.id) {
            const connector = this.createConnectorMesh(pipe.position, neighborPipe.position);
            this.scene.add(connector);
            pipe.connectorMeshes.push(connector);
          }
        }
      }
    }

    // Also update neighbors' connectors (they may now connect to us)
    for (const conn of pipe.connections) {
      if (conn.type === 'pipe') {
        const neighborPipe = this.pipes.get(conn.pipeId);
        if (neighborPipe && neighborPipe.id < pipe.id) {
          // Neighbor should own the connector to us - rebuild their connectors
          this.rebuildConnectorsForPipe(neighborPipe);
        }
      }
    }
  }

  // Rebuild just the connector meshes for a single pipe
  private rebuildConnectorsForPipe(pipe: PlacedCopperPipe): void {
    // Clear existing connectors
    for (const connector of pipe.connectorMeshes) {
      this.scene.remove(connector);
      connector.geometry.dispose();
      if (connector.material instanceof THREE.ShaderMaterial) {
        connector.material.dispose();
      }
    }
    pipe.connectorMeshes = [];

    // Create connectors to adjacent pipes (only where this pipe's ID < neighbor's ID)
    for (const conn of pipe.connections) {
      if (conn.type === 'pipe') {
        const neighborPipe = this.pipes.get(conn.pipeId);
        if (neighborPipe && pipe.id < neighborPipe.id) {
          const connector = this.createConnectorMesh(pipe.position, neighborPipe.position);
          this.scene.add(connector);
          pipe.connectorMeshes.push(connector);
        }
      }
    }
  }

  // Update connections for a pipe
  private updatePipeConnections(pipe: PlacedCopperPipe): void {
    pipe.connections = [];

    if (!this.getNeighborTiles) return;

    const neighborTiles = this.getNeighborTiles(pipe.tileIndex);

    // Check each neighbor tile for pipes or machines
    for (const neighborTile of neighborTiles) {
      // Check for pipe at same depth in neighbor tile
      const neighborPipeId = this.generatePipeId(neighborTile, pipe.depth);
      const neighborPipe = this.pipes.get(neighborPipeId);

      if (neighborPipe) {
        pipe.connections.push({ type: 'pipe', pipeId: neighborPipeId });

        // Also add reverse connection
        if (!neighborPipe.connections.find(c => c.type === 'pipe' && c.pipeId === pipe.id)) {
          neighborPipe.connections.push({ type: 'pipe', pipeId: pipe.id });
        }
      }

      // Check for hydro generator
      if (this.getHydroGeneratorAtTile) {
        const hydro = this.getHydroGeneratorAtTile(neighborTile);
        if (hydro) {
          pipe.connections.push({ type: 'hydro-generator', tileIndex: neighborTile });
        }
      }

      // Check for steam engine
      if (this.getSteamEngineAtTile) {
        const steam = this.getSteamEngineAtTile(neighborTile);
        if (steam) {
          pipe.connections.push({ type: 'steam-engine', tileIndex: neighborTile });
        }
      }
    }

    // Also check the same tile for machines
    if (this.getHydroGeneratorAtTile) {
      const hydro = this.getHydroGeneratorAtTile(pipe.tileIndex);
      if (hydro) {
        pipe.connections.push({ type: 'hydro-generator', tileIndex: pipe.tileIndex });
      }
    }

    if (this.getSteamEngineAtTile) {
      const steam = this.getSteamEngineAtTile(pipe.tileIndex);
      if (steam) {
        pipe.connections.push({ type: 'steam-engine', tileIndex: pipe.tileIndex });
      }
    }
  }

  // Rebuild all pipe networks using flood fill
  private rebuildNetworks(): void {
    this.networks.clear();
    const visited = new Set<string>();

    for (const [pipeId, _pipe] of this.pipes) {
      if (visited.has(pipeId)) continue;

      // Start a new network from this pipe
      const network: PipeNetwork = {
        id: `network_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        pipes: [],
        connectedHydroGenerators: [],
        connectedSteamEngines: [],
      };

      // Flood fill to find all connected pipes
      const stack = [pipeId];
      while (stack.length > 0) {
        const currentId = stack.pop()!;
        if (visited.has(currentId)) continue;
        visited.add(currentId);

        const currentPipe = this.pipes.get(currentId);
        if (!currentPipe) continue;

        network.pipes.push(currentId);

        // Check connections
        for (const conn of currentPipe.connections) {
          if (conn.type === 'pipe') {
            if (!visited.has(conn.pipeId)) {
              stack.push(conn.pipeId);
            }
          } else if (conn.type === 'hydro-generator') {
            if (!network.connectedHydroGenerators.includes(conn.tileIndex)) {
              network.connectedHydroGenerators.push(conn.tileIndex);
            }
          } else if (conn.type === 'steam-engine') {
            if (!network.connectedSteamEngines.includes(conn.tileIndex)) {
              network.connectedSteamEngines.push(conn.tileIndex);
            }
          }
        }
      }

      this.networks.set(network.id, network);
    }
  }

  // Check if a hydro generator is connected to a steam engine via pipes
  public isHydroConnectedToSteam(hydroTileIndex: number): boolean {
    for (const network of this.networks.values()) {
      if (network.connectedHydroGenerators.includes(hydroTileIndex) &&
          network.connectedSteamEngines.length > 0) {
        return true;
      }
    }
    return false;
  }

  // Get the steam engine(s) connected to a hydro generator
  public getConnectedSteamEngines(hydroTileIndex: number): number[] {
    for (const network of this.networks.values()) {
      if (network.connectedHydroGenerators.includes(hydroTileIndex)) {
        return network.connectedSteamEngines;
      }
    }
    return [];
  }

  // Get the hydro generator(s) connected to a steam engine
  public getConnectedHydroGenerators(steamTileIndex: number): number[] {
    for (const network of this.networks.values()) {
      if (network.connectedSteamEngines.includes(steamTileIndex)) {
        return network.connectedHydroGenerators;
      }
    }
    return [];
  }

  // Get network info for a specific pipe
  public getPipeNetwork(pipeId: string): PipeNetwork | null {
    for (const network of this.networks.values()) {
      if (network.pipes.includes(pipeId)) {
        return network;
      }
    }
    return null;
  }

  // Get pipe at a specific location
  public getPipeAt(tileIndex: number, depth: number): PlacedCopperPipe | undefined {
    const pipeId = this.generatePipeId(tileIndex, depth);
    return this.pipes.get(pipeId);
  }

  // Get pipe by mesh
  public getPipeByMesh(mesh: THREE.Mesh): PlacedCopperPipe | undefined {
    const pipeId = mesh.userData.pipeId;
    if (pipeId) {
      return this.pipes.get(pipeId);
    }
    return undefined;
  }

  // Remove a pipe
  public removePipe(pipe: PlacedCopperPipe): void {
    // Remove connector meshes
    for (const connector of pipe.connectorMeshes) {
      this.scene.remove(connector);
      connector.geometry.dispose();
      if (connector.material instanceof THREE.ShaderMaterial) {
        connector.material.dispose();
      }
    }
    pipe.connectorMeshes = [];

    // Remove main pipe mesh from scene
    this.scene.remove(pipe.mesh);
    pipe.mesh.geometry.dispose();
    if (pipe.mesh.material instanceof THREE.ShaderMaterial) {
      pipe.mesh.material.dispose();
    }

    // Remove reverse connections from neighbors and update their connectors
    for (const conn of pipe.connections) {
      if (conn.type === 'pipe') {
        const neighborPipe = this.pipes.get(conn.pipeId);
        if (neighborPipe) {
          neighborPipe.connections = neighborPipe.connections.filter(
            c => !(c.type === 'pipe' && c.pipeId === pipe.id)
          );
          // Rebuild neighbor's connectors since connection to us is gone
          this.rebuildConnectorsForPipe(neighborPipe);
        }
      }
    }

    // Remove from map
    this.pipes.delete(pipe.id);

    // Rebuild networks
    this.rebuildNetworks();
  }

  // Get all pipe meshes for raycasting
  public getPipeMeshes(): THREE.Mesh[] {
    return Array.from(this.pipes.values()).map(p => p.mesh);
  }

  // Get all placed pipes
  public getPlacedPipes(): PlacedCopperPipe[] {
    return Array.from(this.pipes.values());
  }

  // Update torch lighting for all pipes
  public updateTorchLighting(torchPositions: THREE.Vector3[], torchRange: number, torchIntensity: number): void {
    for (const pipe of this.pipes.values()) {
      let totalLight = 0;
      for (const torchPos of torchPositions) {
        const distance = pipe.position.distanceTo(torchPos);
        if (distance < torchRange) {
          const decay = 2;
          const attenuation = 1 / (1 + decay * distance * distance / (torchRange * torchRange));
          totalLight += attenuation * torchIntensity;
        }
      }
      totalLight = Math.min(1.5, totalLight);

      // Update pipe mesh
      const material = pipe.mesh.material as THREE.ShaderMaterial;
      if (material.uniforms && material.uniforms.torchLight) {
        material.uniforms.torchLight.value = totalLight;
      }

      // Update connector meshes
      for (const connector of pipe.connectorMeshes) {
        const connectorMaterial = connector.material as THREE.ShaderMaterial;
        if (connectorMaterial.uniforms && connectorMaterial.uniforms.torchLight) {
          connectorMaterial.uniforms.torchLight.value = totalLight;
        }
      }
    }
  }

  // Export for save
  public exportForSave(): Array<{
    tileIndex: number;
    depth: number;
    position: { x: number; y: number; z: number };
  }> {
    return Array.from(this.pipes.values()).map(p => ({
      tileIndex: p.tileIndex,
      depth: p.depth,
      position: { x: p.position.x, y: p.position.y, z: p.position.z },
    }));
  }

  // Restore from save
  public async restorePipe(
    savedPosition: THREE.Vector3,
    tileIndex: number,
    depth: number
  ): Promise<PlacedCopperPipe | null> {
    if (!this.pipeMaterial) {
      await this.initMaterial();
    }

    if (!this.pipeMaterial) {
      return null;
    }

    const pipeId = this.generatePipeId(tileIndex, depth);

    if (this.pipes.has(pipeId)) {
      return null;
    }

    const mesh = this.createPipeMesh(savedPosition);
    mesh.userData.pipeId = pipeId;
    mesh.userData.tileIndex = tileIndex;
    mesh.userData.depth = depth;

    this.scene.add(mesh);

    const pipe: PlacedCopperPipe = {
      id: pipeId,
      mesh,
      position: savedPosition.clone(),
      tileIndex,
      depth,
      connections: [],
      connectorMeshes: [],
    };

    this.pipes.set(pipeId, pipe);

    return pipe;
  }

  // Call after all pipes are restored to rebuild connections and visual connectors
  public rebuildAllConnections(): void {
    for (const pipe of this.pipes.values()) {
      this.updatePipeConnections(pipe);
    }
    // Rebuild visual connectors after all connections are established
    for (const pipe of this.pipes.values()) {
      this.rebuildConnectorsForPipe(pipe);
    }
    this.rebuildNetworks();
  }

  // Dispose all resources
  public dispose(): void {
    for (const pipe of this.pipes.values()) {
      // Dispose connector meshes
      for (const connector of pipe.connectorMeshes) {
        this.scene.remove(connector);
        connector.geometry.dispose();
        if (connector.material instanceof THREE.ShaderMaterial) {
          connector.material.dispose();
        }
      }
      // Dispose main pipe mesh
      this.scene.remove(pipe.mesh);
      pipe.mesh.geometry.dispose();
      if (pipe.mesh.material instanceof THREE.ShaderMaterial) {
        pipe.mesh.material.dispose();
      }
    }
    this.pipes.clear();
    this.networks.clear();

    if (this.pipeMaterial) {
      this.pipeMaterial.dispose();
    }
  }
}
