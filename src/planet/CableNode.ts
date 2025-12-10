import * as THREE from 'three';
import { getAssetPath } from '../utils/assetPath';
import { PlayerConfig } from '../config/PlayerConfig';
import techVert from '../shaders/tech/tech.vert';
import techFrag from '../shaders/tech/tech.frag';
import { PlacedSteamEngine } from './SteamEngine';
import { PlacedElectricFurnace } from './ElectricFurnace';
import { PlacedElectronicsWorkbench } from './ElectronicsWorkbench';

// Cable connection types
export type CableConnectionTarget =
  | { type: 'cable'; cableId: string }
  | { type: 'steam-engine'; tileIndex: number }
  | { type: 'electric-furnace'; tileIndex: number }
  | { type: 'electronics-workbench'; tileIndex: number };

export interface PlacedCable {
  id: string;
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  tileIndex: number;
  depth: number;
  // Connected neighbors (up to 6 directions on hexagonal planet)
  connections: CableConnectionTarget[];
  // Visual connector meshes to adjacent cables
  connectorMeshes: THREE.Mesh[];
}

// Network represents a connected set of cables linking machines
export interface CableNetwork {
  id: string;
  cables: string[]; // Cable IDs in this network
  connectedSteamEngines: number[]; // Tile indices
  connectedElectricFurnaces: number[]; // Tile indices
  connectedElectronicsWorkbenches: number[]; // Tile indices
}

export class CableNodeManager {
  private scene: THREE.Scene;
  private cables: Map<string, PlacedCable> = new Map();
  private networks: Map<string, CableNetwork> = new Map();
  private textureLoader: THREE.TextureLoader;
  private cableMaterial: THREE.ShaderMaterial | null = null;

  // Planet references
  private planetCenter: THREE.Vector3;
  private sunDirection: THREE.Vector3;

  // Cable dimensions (same as copper pipe)
  private readonly CABLE_SIZE = 0.2;
  private readonly CONNECTOR_SIZE = 0.08;

  // Callbacks for getting machine positions
  private getSteamEngineAtTile: ((tileIndex: number) => PlacedSteamEngine | undefined) | null = null;
  private getElectricFurnaceAtTile: ((tileIndex: number) => PlacedElectricFurnace | undefined) | null = null;
  private getElectronicsWorkbenchAtTile: ((tileIndex: number) => PlacedElectronicsWorkbench | undefined) | null = null;
  private getNeighborTiles: ((tileIndex: number) => number[]) | null = null;

  constructor(scene: THREE.Scene, planetCenter?: THREE.Vector3, sunDirection?: THREE.Vector3) {
    this.scene = scene;
    this.textureLoader = new THREE.TextureLoader();
    this.planetCenter = planetCenter?.clone() || new THREE.Vector3(0, 0, 0);
    this.sunDirection = sunDirection?.clone() || new THREE.Vector3(1, 0, 0);
    this.initMaterial();
  }

  public setMachineCallbacks(
    getSteamEngineAtTile: (tileIndex: number) => PlacedSteamEngine | undefined,
    getElectricFurnaceAtTile: (tileIndex: number) => PlacedElectricFurnace | undefined,
    getElectronicsWorkbenchAtTile: (tileIndex: number) => PlacedElectronicsWorkbench | undefined,
    getNeighborTiles: (tileIndex: number) => number[]
  ): void {
    this.getSteamEngineAtTile = getSteamEngineAtTile;
    this.getElectricFurnaceAtTile = getElectricFurnaceAtTile;
    this.getElectronicsWorkbenchAtTile = getElectronicsWorkbenchAtTile;
    this.getNeighborTiles = getNeighborTiles;
  }

  public setSunDirection(direction: THREE.Vector3): void {
    this.sunDirection.copy(direction);
    if (this.cableMaterial) {
      this.cableMaterial.uniforms.sunDirection.value.copy(direction);
    }
  }

  public setPlanetCenter(center: THREE.Vector3): void {
    this.planetCenter.copy(center);
    if (this.cableMaterial) {
      this.cableMaterial.uniforms.planetCenter.value.copy(center);
    }
  }

  private async initMaterial(): Promise<void> {
    const texture = await new Promise<THREE.Texture>((resolve, reject) => {
      this.textureLoader.load(
        getAssetPath('/textures/technology/cable.png'),
        resolve,
        undefined,
        reject
      );
    });

    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;

    this.cableMaterial = new THREE.ShaderMaterial({
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

  // Generate unique ID for a cable at a specific location
  private generateCableId(tileIndex: number, depth: number): string {
    return `cable_${tileIndex}_${depth}`;
  }

  // Create mesh for a single cable node
  private createCableMesh(position: THREE.Vector3): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(this.CABLE_SIZE, this.CABLE_SIZE, this.CABLE_SIZE);
    const material = this.cableMaterial!.clone();
    const mesh = new THREE.Mesh(geometry, material);

    // Orient to surface
    const up = position.clone().sub(this.planetCenter).normalize();
    const alignQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    mesh.quaternion.copy(alignQuat);
    mesh.position.copy(position);

    mesh.userData.isCable = true;

    return mesh;
  }

  // Create connector mesh between two positions
  private createConnectorMesh(from: THREE.Vector3, to: THREE.Vector3): THREE.Mesh {
    const midpoint = from.clone().add(to).multiplyScalar(0.5);
    const direction = to.clone().sub(from);
    const length = direction.length();

    const geometry = new THREE.BoxGeometry(this.CONNECTOR_SIZE, this.CONNECTOR_SIZE, length);

    // Tile the texture along the length of the cable
    // BoxGeometry UV layout: right, left, top, bottom, front, back faces
    // We want to tile the texture based on length for the side faces (right, left, top, bottom)
    const tileRepeatLength = length / this.CONNECTOR_SIZE * 0.5;  // Tile based on length
    const uvAttribute = geometry.getAttribute('uv');
    const uvArray = uvAttribute.array as Float32Array;

    // BoxGeometry has 24 vertices (4 per face, 6 faces)
    // Face order: +X (right), -X (left), +Y (top), -Y (bottom), +Z (front), -Z (back)
    // Each face has 4 vertices with 2 UV coords each = 8 floats per face
    // Unrolled for easier debugging - handle each face explicitly

    // Face 0 (+X right): indices 0-7
    for (let i = 0; i < 4; i++) { 
      const u = uvArray[i * 2];
      const v = uvArray[i * 2 + 1];
      uvArray[i * 2] = u * tileRepeatLength;
      uvArray[i * 2 + 1] = v;
    }

    // Face 1 (-X left): indices 8-15
    for (let i = 0; i < 4; i++) {
      const u = uvArray[8 + i * 2];
      const v = uvArray[8 + i * 2 + 1];
      uvArray[8 + i * 2] = u* tileRepeatLength;
      uvArray[8 + i * 2 + 1] = (1 - v);
    }

    // Face 2 (+Y top): indices 16-23
    for (let i = 0; i < 4; i++) {
      const u = uvArray[16 + i * 2];
      const v = uvArray[16 + i * 2 + 1];
      uvArray[16 + i * 2] = v * tileRepeatLength;
      uvArray[16 + i * 2 + 1] = u;
    }

    // Face 3 (-Y bottom): indices 24-31
    for (let i = 0; i < 4; i++) {
      const u = uvArray[24 + i * 2];
      const v = uvArray[24 + i * 2 + 1];
      uvArray[24 + i * 2] = (1 - v) * tileRepeatLength;
      uvArray[24 + i * 2 + 1] = u;
    }
    uvAttribute.needsUpdate = true;

    const material = this.cableMaterial!.clone();
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.copy(midpoint);

    const dir = direction.normalize();
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    mesh.quaternion.copy(quaternion);

    mesh.userData.isCableConnector = true;

    return mesh;
  }

  // Place a new cable
  public async placeCable(
    worldPosition: THREE.Vector3,
    tileIndex: number,
    depth: number
  ): Promise<PlacedCable | null> {
    if (!this.cableMaterial) {
      await this.initMaterial();
    }

    if (!this.cableMaterial) {
      console.error('Failed to initialize cable material');
      return null;
    }

    const cableId = this.generateCableId(tileIndex, depth);

    // Check if cable already exists at this location
    if (this.cables.has(cableId)) {
      return null;
    }

    // Position cable slightly above surface
    const up = worldPosition.clone().sub(this.planetCenter).normalize();
    const cablePosition = worldPosition.clone().add(up.clone().multiplyScalar(this.CABLE_SIZE / 2));

    const mesh = this.createCableMesh(cablePosition);
    mesh.userData.cableId = cableId;
    mesh.userData.tileIndex = tileIndex;
    mesh.userData.depth = depth;

    this.scene.add(mesh);

    const cable: PlacedCable = {
      id: cableId,
      mesh,
      position: cablePosition.clone(),
      tileIndex,
      depth,
      connections: [],
      connectorMeshes: [],
    };

    this.cables.set(cableId, cable);

    // Update connections for this cable and neighbors
    this.updateCableConnections(cable);

    // Update visual connectors
    this.updateVisualConnectors(cable);

    // Rebuild networks
    this.rebuildNetworks();

    return cable;
  }

  // Update visual connector meshes for a cable and its connected neighbors
  private updateVisualConnectors(cable: PlacedCable): void {
    // Clear existing connectors for this cable
    for (const connector of cable.connectorMeshes) {
      this.scene.remove(connector);
      connector.geometry.dispose();
      if (connector.material instanceof THREE.ShaderMaterial) {
        connector.material.dispose();
      }
    }
    cable.connectorMeshes = [];

    // Create connectors to adjacent cables
    for (const conn of cable.connections) {
      if (conn.type === 'cable') {
        const neighborCable = this.cables.get(conn.cableId);
        if (neighborCable) {
          // Only create connector if this cable's ID is "less than" neighbor's to avoid duplicates
          if (cable.id < neighborCable.id) {
            const connector = this.createConnectorMesh(cable.position, neighborCable.position);
            this.scene.add(connector);
            cable.connectorMeshes.push(connector);
          }
        }
      } else if (conn.type === 'steam-engine') {
        const steam = this.getSteamEngineAtTile?.(conn.tileIndex);
        if (steam) {
          const connector = this.createConnectorMesh(cable.position, steam.position);
          this.scene.add(connector);
          cable.connectorMeshes.push(connector);
        }
      } else if (conn.type === 'electric-furnace') {
        const furnace = this.getElectricFurnaceAtTile?.(conn.tileIndex);
        if (furnace) {
          const connector = this.createConnectorMesh(cable.position, furnace.position);
          this.scene.add(connector);
          cable.connectorMeshes.push(connector);
        }
      } else if (conn.type === 'electronics-workbench') {
        const workbench = this.getElectronicsWorkbenchAtTile?.(conn.tileIndex);
        if (workbench) {
          const connector = this.createConnectorMesh(cable.position, workbench.position);
          this.scene.add(connector);
          cable.connectorMeshes.push(connector);
        }
      }
    }

    // Also update neighbors' connectors
    for (const conn of cable.connections) {
      if (conn.type === 'cable') {
        const neighborCable = this.cables.get(conn.cableId);
        if (neighborCable && neighborCable.id < cable.id) {
          this.rebuildConnectorsForCable(neighborCable);
        }
      }
    }
  }

  // Rebuild just the connector meshes for a single cable
  private rebuildConnectorsForCable(cable: PlacedCable): void {
    // Clear existing connectors
    for (const connector of cable.connectorMeshes) {
      this.scene.remove(connector);
      connector.geometry.dispose();
      if (connector.material instanceof THREE.ShaderMaterial) {
        connector.material.dispose();
      }
    }
    cable.connectorMeshes = [];

    for (const conn of cable.connections) {
      if (conn.type === 'cable') {
        const neighborCable = this.cables.get(conn.cableId);
        if (neighborCable && cable.id < neighborCable.id) {
          const connector = this.createConnectorMesh(cable.position, neighborCable.position);
          this.scene.add(connector);
          cable.connectorMeshes.push(connector);
        }
      } else if (conn.type === 'steam-engine') {
        const steam = this.getSteamEngineAtTile?.(conn.tileIndex);
        if (steam) {
          const connector = this.createConnectorMesh(cable.position, steam.position);
          this.scene.add(connector);
          cable.connectorMeshes.push(connector);
        }
      } else if (conn.type === 'electric-furnace') {
        const furnace = this.getElectricFurnaceAtTile?.(conn.tileIndex);
        if (furnace) {
          const connector = this.createConnectorMesh(cable.position, furnace.position);
          this.scene.add(connector);
          cable.connectorMeshes.push(connector);
        }
      } else if (conn.type === 'electronics-workbench') {
        const workbench = this.getElectronicsWorkbenchAtTile?.(conn.tileIndex);
        if (workbench) {
          const connector = this.createConnectorMesh(cable.position, workbench.position);
          this.scene.add(connector);
          cable.connectorMeshes.push(connector);
        }
      }
    }
  }

  // Update connections for a cable
  private updateCableConnections(cable: PlacedCable): void {
    cable.connections = [];

    if (!this.getNeighborTiles) return;

    const neighborTiles = this.getNeighborTiles(cable.tileIndex);

    // Check each neighbor tile for cables or machines
    for (const neighborTile of neighborTiles) {
      // Check for cable at same depth in neighbor tile
      const neighborCableId = this.generateCableId(neighborTile, cable.depth);
      const neighborCable = this.cables.get(neighborCableId);

      if (neighborCable) {
        cable.connections.push({ type: 'cable', cableId: neighborCableId });

        // Also add reverse connection
        if (!neighborCable.connections.find(c => c.type === 'cable' && c.cableId === cable.id)) {
          neighborCable.connections.push({ type: 'cable', cableId: cable.id });
        }
      }
    }

    // Check for vertical cable connections (same tile, different depths)
    const aboveCableId = this.generateCableId(cable.tileIndex, cable.depth + 1);
    const aboveCable = this.cables.get(aboveCableId);
    if (aboveCable) {
      cable.connections.push({ type: 'cable', cableId: aboveCableId });
      // Also add reverse connection
      if (!aboveCable.connections.find(c => c.type === 'cable' && c.cableId === cable.id)) {
        aboveCable.connections.push({ type: 'cable', cableId: cable.id });
      }
    }

    const belowCableId = this.generateCableId(cable.tileIndex, cable.depth - 1);
    const belowCable = this.cables.get(belowCableId);
    if (belowCable) {
      cable.connections.push({ type: 'cable', cableId: belowCableId });
      // Also add reverse connection
      if (!belowCable.connections.find(c => c.type === 'cable' && c.cableId === cable.id)) {
        belowCable.connections.push({ type: 'cable', cableId: cable.id });
      }
    }

    // Check neighbor tiles for machines (steam engine, electric furnace, electronics workbench)
    for (const neighborTile of neighborTiles) {

      // Check for steam engine
      if (this.getSteamEngineAtTile) {
        const steam = this.getSteamEngineAtTile(neighborTile);
        if (steam) {
          cable.connections.push({ type: 'steam-engine', tileIndex: neighborTile });
        }
      }

      // Check for electric furnace
      if (this.getElectricFurnaceAtTile) {
        const furnace = this.getElectricFurnaceAtTile(neighborTile);
        if (furnace) {
          cable.connections.push({ type: 'electric-furnace', tileIndex: neighborTile });
        }
      }

      // Check for electronics workbench
      if (this.getElectronicsWorkbenchAtTile) {
        const workbench = this.getElectronicsWorkbenchAtTile(neighborTile);
        if (workbench) {
          cable.connections.push({ type: 'electronics-workbench', tileIndex: neighborTile });
        }
      }
    }

    // Also check the same tile for machines
    if (this.getSteamEngineAtTile) {
      const steam = this.getSteamEngineAtTile(cable.tileIndex);
      if (steam) {
        cable.connections.push({ type: 'steam-engine', tileIndex: cable.tileIndex });
      }
    }

    if (this.getElectricFurnaceAtTile) {
      const furnace = this.getElectricFurnaceAtTile(cable.tileIndex);
      if (furnace) {
        cable.connections.push({ type: 'electric-furnace', tileIndex: cable.tileIndex });
      }
    }

    if (this.getElectronicsWorkbenchAtTile) {
      const workbench = this.getElectronicsWorkbenchAtTile(cable.tileIndex);
      if (workbench) {
        cable.connections.push({ type: 'electronics-workbench', tileIndex: cable.tileIndex });
      }
    }
  }

  // Rebuild all cable networks using flood fill
  private rebuildNetworks(): void {
    this.networks.clear();
    const visited = new Set<string>();

    for (const [cableId, _cable] of this.cables) {
      if (visited.has(cableId)) continue;

      const network: CableNetwork = {
        id: `network_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        cables: [],
        connectedSteamEngines: [],
        connectedElectricFurnaces: [],
        connectedElectronicsWorkbenches: [],
      };

      // Flood fill to find all connected cables
      const stack = [cableId];
      while (stack.length > 0) {
        const currentId = stack.pop()!;
        if (visited.has(currentId)) continue;
        visited.add(currentId);

        const currentCable = this.cables.get(currentId);
        if (!currentCable) continue;

        network.cables.push(currentId);

        // Check connections
        for (const conn of currentCable.connections) {
          if (conn.type === 'cable') {
            if (!visited.has(conn.cableId)) {
              stack.push(conn.cableId);
            }
          } else if (conn.type === 'steam-engine') {
            if (!network.connectedSteamEngines.includes(conn.tileIndex)) {
              network.connectedSteamEngines.push(conn.tileIndex);
            }
          } else if (conn.type === 'electric-furnace') {
            if (!network.connectedElectricFurnaces.includes(conn.tileIndex)) {
              network.connectedElectricFurnaces.push(conn.tileIndex);
            }
          } else if (conn.type === 'electronics-workbench') {
            if (!network.connectedElectronicsWorkbenches.includes(conn.tileIndex)) {
              network.connectedElectronicsWorkbenches.push(conn.tileIndex);
            }
          }
        }
      }

      this.networks.set(network.id, network);
    }
  }

  // Check if a steam engine is connected to an electric furnace via cables
  public isSteamConnectedToElectricFurnace(steamTileIndex: number): boolean {
    for (const network of this.networks.values()) {
      if (network.connectedSteamEngines.includes(steamTileIndex) &&
          network.connectedElectricFurnaces.length > 0) {
        return true;
      }
    }
    return false;
  }

  // Get the electric furnace(s) connected to a steam engine
  public getConnectedElectricFurnaces(steamTileIndex: number): number[] {
    for (const network of this.networks.values()) {
      if (network.connectedSteamEngines.includes(steamTileIndex)) {
        return network.connectedElectricFurnaces;
      }
    }
    return [];
  }

  // Get the steam engine(s) connected to an electric furnace or electronics workbench
  public getConnectedSteamEngines(tileIndex: number): number[] {
    for (const network of this.networks.values()) {
      if (network.connectedElectricFurnaces.includes(tileIndex) ||
          network.connectedElectronicsWorkbenches.includes(tileIndex)) {
        return network.connectedSteamEngines;
      }
    }
    return [];
  }

  // Check if an electric furnace is connected to any running steam engine
  public isElectricFurnaceConnectedToRunningSteamEngine(
    furnaceTileIndex: number,
    isEngineRunning: (steamTileIndex: number) => boolean
  ): boolean {
    const connectedEngines = this.getConnectedSteamEngines(furnaceTileIndex);
    for (const engineTileIndex of connectedEngines) {
      if (isEngineRunning(engineTileIndex)) {
        return true;
      }
    }
    return false;
  }

  // Get network info for a specific cable
  public getCableNetwork(cableId: string): CableNetwork | null {
    for (const network of this.networks.values()) {
      if (network.cables.includes(cableId)) {
        return network;
      }
    }
    return null;
  }

  // Get cable at a specific location
  public getCableAt(tileIndex: number, depth: number): PlacedCable | undefined {
    const cableId = this.generateCableId(tileIndex, depth);
    return this.cables.get(cableId);
  }

  // Get cable by mesh
  public getCableByMesh(mesh: THREE.Mesh): PlacedCable | undefined {
    const cableId = mesh.userData.cableId;
    if (cableId) {
      return this.cables.get(cableId);
    }
    return undefined;
  }

  // Remove a cable
  public removeCable(cable: PlacedCable): void {
    // Remove connector meshes
    for (const connector of cable.connectorMeshes) {
      this.scene.remove(connector);
      connector.geometry.dispose();
      if (connector.material instanceof THREE.ShaderMaterial) {
        connector.material.dispose();
      }
    }
    cable.connectorMeshes = [];

    // Remove main cable mesh from scene
    this.scene.remove(cable.mesh);
    cable.mesh.geometry.dispose();
    if (cable.mesh.material instanceof THREE.ShaderMaterial) {
      cable.mesh.material.dispose();
    }

    // Remove reverse connections from neighbors and update their connectors
    for (const conn of cable.connections) {
      if (conn.type === 'cable') {
        const neighborCable = this.cables.get(conn.cableId);
        if (neighborCable) {
          neighborCable.connections = neighborCable.connections.filter(
            c => !(c.type === 'cable' && c.cableId === cable.id)
          );
          this.rebuildConnectorsForCable(neighborCable);
        }
      }
    }

    // Remove from map
    this.cables.delete(cable.id);

    // Rebuild networks
    this.rebuildNetworks();
  }

  // Get all cable meshes for raycasting
  public getCableMeshes(): THREE.Mesh[] {
    return Array.from(this.cables.values()).map(c => c.mesh);
  }

  // Get all placed cables
  public getPlacedCables(): PlacedCable[] {
    return Array.from(this.cables.values());
  }

  // Update torch lighting for all cables
  public updateTorchLighting(torchPositions: THREE.Vector3[], torchRange: number, torchIntensity: number): void {
    for (const cable of this.cables.values()) {
      let totalLight = 0;
      for (const torchPos of torchPositions) {
        const distance = cable.position.distanceTo(torchPos);
        if (distance < torchRange) {
          const decay = 2;
          const attenuation = 1 / (1 + decay * distance * distance / (torchRange * torchRange));
          totalLight += attenuation * torchIntensity;
        }
      }
      totalLight = Math.min(1.5, totalLight);

      // Update cable mesh
      const material = cable.mesh.material as THREE.ShaderMaterial;
      if (material.uniforms && material.uniforms.torchLight) {
        material.uniforms.torchLight.value = totalLight;
      }

      // Update connector meshes
      for (const connector of cable.connectorMeshes) {
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
    return Array.from(this.cables.values()).map(c => ({
      tileIndex: c.tileIndex,
      depth: c.depth,
      position: { x: c.position.x, y: c.position.y, z: c.position.z },
    }));
  }

  // Restore from save
  public async restoreCable(
    savedPosition: THREE.Vector3,
    tileIndex: number,
    depth: number
  ): Promise<PlacedCable | null> {
    if (!this.cableMaterial) {
      await this.initMaterial();
    }

    if (!this.cableMaterial) {
      return null;
    }

    const cableId = this.generateCableId(tileIndex, depth);

    if (this.cables.has(cableId)) {
      return null;
    }

    const mesh = this.createCableMesh(savedPosition);
    mesh.userData.cableId = cableId;
    mesh.userData.tileIndex = tileIndex;
    mesh.userData.depth = depth;

    this.scene.add(mesh);

    const cable: PlacedCable = {
      id: cableId,
      mesh,
      position: savedPosition.clone(),
      tileIndex,
      depth,
      connections: [],
      connectorMeshes: [],
    };

    this.cables.set(cableId, cable);

    return cable;
  }

  // Call after all cables are restored to rebuild connections and visual connectors
  public rebuildAllConnections(): void {
    for (const cable of this.cables.values()) {
      this.updateCableConnections(cable);
    }
    for (const cable of this.cables.values()) {
      this.rebuildConnectorsForCable(cable);
    }
    this.rebuildNetworks();
  }

  // Call when a machine (steam engine or electric furnace) is placed or removed
  public updateCablesNearTile(tileIndex: number): void {
    if (!this.getNeighborTiles) return;

    const neighborTiles = this.getNeighborTiles(tileIndex);
    const tilesToCheck = [tileIndex, ...neighborTiles];

    for (const cable of this.cables.values()) {
      if (tilesToCheck.includes(cable.tileIndex)) {
        this.updateCableConnections(cable);
        this.rebuildConnectorsForCable(cable);
      }
    }

    this.rebuildNetworks();
  }

  // Dispose all resources
  public dispose(): void {
    for (const cable of this.cables.values()) {
      for (const connector of cable.connectorMeshes) {
        this.scene.remove(connector);
        connector.geometry.dispose();
        if (connector.material instanceof THREE.ShaderMaterial) {
          connector.material.dispose();
        }
      }
      this.scene.remove(cable.mesh);
      cable.mesh.geometry.dispose();
      if (cable.mesh.material instanceof THREE.ShaderMaterial) {
        cable.mesh.material.dispose();
      }
    }
    this.cables.clear();
    this.networks.clear();

    if (this.cableMaterial) {
      this.cableMaterial.dispose();
    }
  }
}
