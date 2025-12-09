// Types for saved game data

// Tile change for a planet
export interface TileChange {
  tileIndex: number;
  depth: number;
  blockType: number;
}

export interface SavedInventorySlot {
  itemType: number;
  quantity: number;
}

// Torch data (without planetId - stored per planet)
export interface SavedTorch {
  tileIndex: number;
  position: { x: number; y: number; z: number };
}

// Furnace data (without planetId - stored per planet)
export interface SavedFurnace {
  tileIndex: number;
  position: { x: number; y: number; z: number };
  rotation: number;
  fuelAmount: number;
  smeltingItem: number | null;
  smeltingProgress: number;
  inputCount: number;
  outputItem: number | null;
  outputCount: number;
}

// Storage chest data
export interface SavedStorageChest {
  tileIndex: number;
  position: { x: number; y: number; z: number };
  rotation: number;
  slots: SavedInventorySlot[];
}

// Garbage pile data
export interface SavedGarbagePile {
  tileIndex: number;
  position: { x: number; y: number; z: number };
  slots: SavedInventorySlot[];
}

// Steam engine data
export interface SavedSteamEngine {
  tileIndex: number;
  position: { x: number; y: number; z: number };
  rotation: number;
  // Fuel state
  hasFuel: boolean;
  fuelAmount: number;
}

// Hydro generator data
export interface SavedHydroGenerator {
  tileIndex: number;
  position: { x: number; y: number; z: number };
  rotation: number;
  waterDepth: number;
}

// Copper pipe data
export interface SavedCopperPipe {
  tileIndex: number;
  depth: number;
  position: { x: number; y: number; z: number };
}

// Removed tree data (trees that have been chopped down)
export interface SavedRemovedTree {
  tileIndex: number;
}

// Player-specific save data
export interface PlayerSaveData {
  version: number;
  timestamp: number;
  position: { x: number; y: number; z: number };
  orientation: { x: number; y: number; z: number; w: number };  // quaternion
  velocity: { x: number; y: number; z: number };
  inventory: SavedInventorySlot[];
  // Future: techStatus, techInventory, etc.
}

// Planet-specific save data
export interface PlanetSaveData {
  version: number;
  timestamp: number;
  tileChanges: TileChange[];
  torches: SavedTorch[];
  furnaces: SavedFurnace[];
  storageChests: SavedStorageChest[];
  garbagePiles: SavedGarbagePile[];
  steamEngines: SavedSteamEngine[];
  hydroGenerators: SavedHydroGenerator[];
  copperPipes: SavedCopperPipe[];
  removedTrees: SavedRemovedTree[];
}

// Legacy combined format (for migration)
export interface LegacyGameSaveData {
  version: number;
  timestamp: number;
  tileChanges: Array<TileChange & { planetId: string }>;
  inventory: SavedInventorySlot[];
  player: {
    position: { x: number; y: number; z: number };
    orientation: { x: number; y: number; z: number; w: number };
    velocity: { x: number; y: number; z: number };
  };
  torches: Array<SavedTorch & { planetId: string }>;
  furnaces: Array<SavedFurnace & { planetId: string }>;
}

// Storage keys
const STORAGE_KEY_PLAYER = 'tenebris_player';
const STORAGE_KEY_EARTH = 'tenebris_earth';
const STORAGE_KEY_MOON = 'tenebris_moon';
const LEGACY_STORAGE_KEY = 'tenebris_save';
const SAVE_VERSION = 2;

export class GameStorage {
  // Player data
  private playerData: PlayerSaveData | null = null;
  private inventory: SavedInventorySlot[] = [];

  // Planet data (keyed by planetId)
  private planetData: Map<string, {
    tileChanges: Map<string, TileChange>;
    torches: SavedTorch[];
    furnaces: SavedFurnace[];
    storageChests: SavedStorageChest[];
    garbagePiles: SavedGarbagePile[];
    steamEngines: SavedSteamEngine[];
    copperPipes: SavedCopperPipe[];
    hydroGenerators: SavedHydroGenerator[];
    removedTrees: SavedRemovedTree[];
  }> = new Map();

  private autoSaveInterval: number | null = null;
  private onPlayerSave: (() => { position: { x: number; y: number; z: number }; orientation: { x: number; y: number; z: number; w: number }; velocity: { x: number; y: number; z: number } }) | null = null;

  constructor() {
    // Initialize planet data for earth and moon
    this.planetData.set('earth', { tileChanges: new Map(), torches: [], furnaces: [], storageChests: [], garbagePiles: [], steamEngines: [], hydroGenerators: [], copperPipes: [], removedTrees: [] });
    this.planetData.set('moon', { tileChanges: new Map(), torches: [], furnaces: [], storageChests: [], garbagePiles: [], steamEngines: [], hydroGenerators: [], copperPipes: [], removedTrees: [] });
  }

  // Set callback to get current player data
  public setPlayerSaveCallback(callback: () => { position: { x: number; y: number; z: number }; orientation: { x: number; y: number; z: number; w: number }; velocity: { x: number; y: number; z: number } }): void {
    this.onPlayerSave = callback;
  }

  // Start auto-saving player position every N seconds
  public startAutoSave(intervalSeconds: number = 5): void {
    if (this.autoSaveInterval !== null) {
      clearInterval(this.autoSaveInterval);
    }
    this.autoSaveInterval = window.setInterval(() => {
      this.savePlayerPosition();
    }, intervalSeconds * 1000);
  }

  // Stop auto-save
  public stopAutoSave(): void {
    if (this.autoSaveInterval !== null) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  // Save a tile change (block placed or broken)
  public saveTileChange(planetId: string, tileIndex: number, depth: number, blockType: number): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    const key = `${tileIndex}:${depth}`;
    planet.tileChanges.set(key, { tileIndex, depth, blockType });
    this.persistPlanetToStorage(planetId);
  }

  // Save inventory state
  public saveInventory(inventory: SavedInventorySlot[]): void {
    this.inventory = [...inventory];
    this.persistPlayerToStorage();
  }

  // Save torch placement
  public saveTorch(planetId: string, tileIndex: number, position: { x: number; y: number; z: number }): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.torches.push({ tileIndex, position });
    this.persistPlanetToStorage(planetId);
  }

  // Remove a torch from save
  public removeTorch(position: { x: number; y: number; z: number }): void {
    // Find and remove torch at this position from all planets (with small tolerance)
    const tolerance = 0.01;
    for (const [planetId, planet] of this.planetData) {
      const originalLength = planet.torches.length;
      planet.torches = planet.torches.filter(t =>
        Math.abs(t.position.x - position.x) > tolerance ||
        Math.abs(t.position.y - position.y) > tolerance ||
        Math.abs(t.position.z - position.z) > tolerance
      );
      if (planet.torches.length !== originalLength) {
        this.persistPlanetToStorage(planetId);
      }
    }
  }

  // Get all saved torches (with planetId for compatibility)
  public getTorches(): Array<SavedTorch & { planetId: string }> {
    const allTorches: Array<SavedTorch & { planetId: string }> = [];
    for (const [planetId, planet] of this.planetData) {
      for (const torch of planet.torches) {
        allTorches.push({ ...torch, planetId });
      }
    }
    return allTorches;
  }

  // Save furnace placement
  public saveFurnace(planetId: string, tileIndex: number, furnaceData: Omit<SavedFurnace, 'tileIndex'>): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    // Remove any existing furnace at this tile first
    planet.furnaces = planet.furnaces.filter(f => f.tileIndex !== tileIndex);
    planet.furnaces.push({ tileIndex, ...furnaceData });
    this.persistPlanetToStorage(planetId);
  }

  // Remove a furnace from save
  public removeFurnace(planetId: string, tileIndex: number): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.furnaces = planet.furnaces.filter(f => f.tileIndex !== tileIndex);
    this.persistPlanetToStorage(planetId);
  }

  // Get all saved furnaces (with planetId for compatibility)
  public getFurnaces(): Array<SavedFurnace & { planetId: string }> {
    const allFurnaces: Array<SavedFurnace & { planetId: string }> = [];
    for (const [planetId, planet] of this.planetData) {
      for (const furnace of planet.furnaces) {
        allFurnaces.push({ ...furnace, planetId });
      }
    }
    return allFurnaces;
  }

  // Save storage chest placement
  public saveStorageChest(planetId: string, tileIndex: number, chestData: Omit<SavedStorageChest, 'tileIndex'>): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.storageChests = planet.storageChests.filter(c => c.tileIndex !== tileIndex);
    planet.storageChests.push({ tileIndex, ...chestData });
    this.persistPlanetToStorage(planetId);
  }

  // Remove a storage chest from save
  public removeStorageChest(planetId: string, tileIndex: number): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.storageChests = planet.storageChests.filter(c => c.tileIndex !== tileIndex);
    this.persistPlanetToStorage(planetId);
  }

  // Get all saved storage chests
  public getStorageChests(): Array<SavedStorageChest & { planetId: string }> {
    const allChests: Array<SavedStorageChest & { planetId: string }> = [];
    for (const [planetId, planet] of this.planetData) {
      for (const chest of planet.storageChests) {
        allChests.push({ ...chest, planetId });
      }
    }
    return allChests;
  }

  // Save garbage pile placement
  public saveGarbagePile(planetId: string, tileIndex: number, pileData: Omit<SavedGarbagePile, 'tileIndex'>): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.garbagePiles = planet.garbagePiles.filter(p => p.tileIndex !== tileIndex);
    planet.garbagePiles.push({ tileIndex, ...pileData });
    this.persistPlanetToStorage(planetId);
  }

  // Remove a garbage pile from save
  public removeGarbagePile(planetId: string, tileIndex: number): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.garbagePiles = planet.garbagePiles.filter(p => p.tileIndex !== tileIndex);
    this.persistPlanetToStorage(planetId);
  }

  // Get all saved garbage piles
  public getGarbagePiles(): Array<SavedGarbagePile & { planetId: string }> {
    const allPiles: Array<SavedGarbagePile & { planetId: string }> = [];
    for (const [planetId, planet] of this.planetData) {
      for (const pile of planet.garbagePiles) {
        allPiles.push({ ...pile, planetId });
      }
    }
    return allPiles;
  }

  // Save steam engine placement
  public saveSteamEngine(planetId: string, tileIndex: number, engineData: Omit<SavedSteamEngine, 'tileIndex'>): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.steamEngines = planet.steamEngines.filter(e => e.tileIndex !== tileIndex);
    planet.steamEngines.push({ tileIndex, ...engineData });
    this.persistPlanetToStorage(planetId);
  }

  // Remove a steam engine from save
  public removeSteamEngine(planetId: string, tileIndex: number): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.steamEngines = planet.steamEngines.filter(e => e.tileIndex !== tileIndex);
    this.persistPlanetToStorage(planetId);
  }

  // Get all saved steam engines
  public getSteamEngines(): Array<SavedSteamEngine & { planetId: string }> {
    const allEngines: Array<SavedSteamEngine & { planetId: string }> = [];
    for (const [planetId, planet] of this.planetData) {
      for (const engine of planet.steamEngines) {
        allEngines.push({ ...engine, planetId });
      }
    }
    return allEngines;
  }

  // Save hydro generator placement
  public saveHydroGenerator(planetId: string, tileIndex: number, generatorData: Omit<SavedHydroGenerator, 'tileIndex'>): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.hydroGenerators = planet.hydroGenerators.filter(g => g.tileIndex !== tileIndex);
    planet.hydroGenerators.push({ tileIndex, ...generatorData });
    this.persistPlanetToStorage(planetId);
  }

  // Remove a hydro generator from save
  public removeHydroGenerator(planetId: string, tileIndex: number): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.hydroGenerators = planet.hydroGenerators.filter(g => g.tileIndex !== tileIndex);
    this.persistPlanetToStorage(planetId);
  }

  // Get all saved hydro generators
  public getHydroGenerators(): Array<SavedHydroGenerator & { planetId: string }> {
    const allGenerators: Array<SavedHydroGenerator & { planetId: string }> = [];
    for (const [planetId, planet] of this.planetData) {
      for (const generator of planet.hydroGenerators) {
        allGenerators.push({ ...generator, planetId });
      }
    }
    return allGenerators;
  }

  // Save copper pipe placement
  public saveCopperPipe(planetId: string, tileIndex: number, depth: number, pipeData: Omit<SavedCopperPipe, 'tileIndex' | 'depth'>): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    // Remove existing pipe at same location
    planet.copperPipes = planet.copperPipes.filter(p => !(p.tileIndex === tileIndex && p.depth === depth));
    planet.copperPipes.push({ tileIndex, depth, ...pipeData });
    this.persistPlanetToStorage(planetId);
  }

  // Remove a copper pipe from save
  public removeCopperPipe(planetId: string, tileIndex: number, depth: number): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.copperPipes = planet.copperPipes.filter(p => !(p.tileIndex === tileIndex && p.depth === depth));
    this.persistPlanetToStorage(planetId);
  }

  // Get all saved copper pipes
  public getCopperPipes(): Array<SavedCopperPipe & { planetId: string }> {
    const allPipes: Array<SavedCopperPipe & { planetId: string }> = [];
    for (const [planetId, planet] of this.planetData) {
      for (const pipe of planet.copperPipes) {
        allPipes.push({ ...pipe, planetId });
      }
    }
    return allPipes;
  }

  // Save a removed tree to storage
  public saveRemovedTree(planetId: string, tileIndex: number): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    // Check if already saved
    if (!planet.removedTrees.some(t => t.tileIndex === tileIndex)) {
      planet.removedTrees.push({ tileIndex });
      this.persistPlanetToStorage(planetId);
    }
  }

  // Get all removed trees for a planet
  public getRemovedTrees(planetId: string): SavedRemovedTree[] {
    const planet = this.planetData.get(planetId);
    return planet?.removedTrees || [];
  }

  // Save player position immediately
  public savePlayerPosition(): void {
    if (this.onPlayerSave) {
      const posData = this.onPlayerSave();
      this.playerData = {
        version: SAVE_VERSION,
        timestamp: Date.now(),
        position: posData.position,
        orientation: posData.orientation,
        velocity: posData.velocity,
        inventory: this.inventory
      };
      this.persistPlayerToStorage();
    }
  }

  // Load all saved game data
  public load(): LegacyGameSaveData | null {
    // First try to migrate legacy save if it exists
    this.migrateLegacySave();

    // Load player data
    this.loadPlayerData();

    // Load planet data
    this.loadPlanetData('earth');
    this.loadPlanetData('moon');

    // Return combined data in legacy format for compatibility
    if (!this.playerData && this.inventory.length === 0) {
      // Check if any planet has data
      let hasData = false;
      for (const planet of this.planetData.values()) {
        if (planet.tileChanges.size > 0 || planet.torches.length > 0 || planet.furnaces.length > 0) {
          hasData = true;
          break;
        }
      }
      if (!hasData) return null;
    }

    // Build legacy format for compatibility with existing code
    const tileChanges: Array<TileChange & { planetId: string }> = [];
    for (const [planetId, planet] of this.planetData) {
      for (const change of planet.tileChanges.values()) {
        tileChanges.push({ ...change, planetId });
      }
    }

    return {
      version: SAVE_VERSION,
      timestamp: Date.now(),
      tileChanges,
      inventory: this.inventory,
      player: this.playerData ? {
        position: this.playerData.position,
        orientation: this.playerData.orientation,
        velocity: this.playerData.velocity
      } : {
        position: { x: 0, y: 0, z: 0 },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
        velocity: { x: 0, y: 0, z: 0 }
      },
      torches: this.getTorches(),
      furnaces: this.getFurnaces()
    };
  }

  // Load player data from storage
  private loadPlayerData(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_PLAYER);
      if (!saved) return;

      const data = JSON.parse(saved) as PlayerSaveData;
      this.playerData = data;
      this.inventory = data.inventory || [];
    } catch (error) {
      console.error('Failed to load player data:', error);
    }
  }

  // Load planet data from storage
  private loadPlanetData(planetId: string): void {
    try {
      const key = planetId === 'earth' ? STORAGE_KEY_EARTH : STORAGE_KEY_MOON;
      const saved = localStorage.getItem(key);
      if (!saved) return;

      const data = JSON.parse(saved) as PlanetSaveData;
      const planet = this.planetData.get(planetId);
      if (!planet) return;

      // Restore tile changes
      planet.tileChanges.clear();
      for (const change of data.tileChanges) {
        const changeKey = `${change.tileIndex}:${change.depth}`;
        planet.tileChanges.set(changeKey, change);
      }

      planet.torches = data.torches || [];
      planet.furnaces = data.furnaces || [];
      planet.storageChests = data.storageChests || [];
      planet.garbagePiles = data.garbagePiles || [];
      planet.steamEngines = data.steamEngines || [];
      planet.hydroGenerators = data.hydroGenerators || [];
      planet.copperPipes = data.copperPipes || [];
      planet.removedTrees = data.removedTrees || [];
    } catch (error) {
      console.error(`Failed to load ${planetId} data:`, error);
    }
  }

  // Migrate legacy single-file save to new multi-file format
  private migrateLegacySave(): void {
    try {
      const legacySaved = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!legacySaved) return;

      // Check if we've already migrated (new files exist)
      if (localStorage.getItem(STORAGE_KEY_PLAYER) !== null) {
        // Already migrated, remove legacy file
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        return;
      }

      console.log('Migrating legacy save data to new format...');
      const legacyData = JSON.parse(legacySaved) as LegacyGameSaveData;

      // Migrate player data
      this.inventory = legacyData.inventory || [];
      this.playerData = {
        version: SAVE_VERSION,
        timestamp: legacyData.timestamp,
        position: legacyData.player?.position || { x: 0, y: 0, z: 0 },
        orientation: legacyData.player?.orientation || { x: 0, y: 0, z: 0, w: 1 },
        velocity: legacyData.player?.velocity || { x: 0, y: 0, z: 0 },
        inventory: this.inventory
      };

      // Migrate tile changes per planet
      for (const change of legacyData.tileChanges || []) {
        const planet = this.planetData.get(change.planetId);
        if (planet) {
          const key = `${change.tileIndex}:${change.depth}`;
          planet.tileChanges.set(key, {
            tileIndex: change.tileIndex,
            depth: change.depth,
            blockType: change.blockType
          });
        }
      }

      // Migrate torches per planet
      for (const torch of legacyData.torches || []) {
        const planet = this.planetData.get(torch.planetId);
        if (planet) {
          planet.torches.push({
            tileIndex: torch.tileIndex,
            position: torch.position
          });
        }
      }

      // Migrate furnaces per planet
      for (const furnace of legacyData.furnaces || []) {
        const planet = this.planetData.get(furnace.planetId);
        if (planet) {
          planet.furnaces.push({
            tileIndex: furnace.tileIndex,
            position: furnace.position,
            rotation: furnace.rotation,
            fuelAmount: furnace.fuelAmount,
            smeltingItem: furnace.smeltingItem,
            smeltingProgress: furnace.smeltingProgress,
            inputCount: (furnace as SavedFurnace).inputCount ?? 0,
            outputItem: furnace.outputItem,
            outputCount: furnace.outputCount
          });
        }
      }

      // Save to new format
      this.persistPlayerToStorage();
      this.persistPlanetToStorage('earth');
      this.persistPlanetToStorage('moon');

      // Remove legacy save
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      console.log('Migration complete!');
    } catch (error) {
      console.error('Failed to migrate legacy save:', error);
    }
  }

  // Get all tile changes for a specific planet
  public getTileChangesForPlanet(planetId: string): Array<TileChange & { planetId: string }> {
    const planet = this.planetData.get(planetId);
    if (!planet) return [];

    const changes: Array<TileChange & { planetId: string }> = [];
    for (const change of planet.tileChanges.values()) {
      changes.push({ ...change, planetId });
    }
    return changes;
  }

  // Get saved inventory
  public getInventory(): SavedInventorySlot[] {
    return this.inventory;
  }

  // Get saved player data (legacy format)
  public getPlayerData(): { position: { x: number; y: number; z: number }; orientation: { x: number; y: number; z: number; w: number }; velocity: { x: number; y: number; z: number } } | null {
    if (!this.playerData) return null;
    return {
      position: this.playerData.position,
      orientation: this.playerData.orientation,
      velocity: this.playerData.velocity
    };
  }

  // Clear all saved data
  public clearSave(): void {
    // Clear in-memory data
    this.playerData = null;
    this.inventory = [];
    for (const planet of this.planetData.values()) {
      planet.tileChanges.clear();
      planet.torches = [];
      planet.furnaces = [];
      planet.storageChests = [];
      planet.garbagePiles = [];
      planet.steamEngines = [];
      planet.hydroGenerators = [];
      planet.copperPipes = [];
      planet.removedTrees = [];
    }

    // Clear all storage keys
    localStorage.removeItem(STORAGE_KEY_PLAYER);
    localStorage.removeItem(STORAGE_KEY_EARTH);
    localStorage.removeItem(STORAGE_KEY_MOON);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }

  // Persist player data to localStorage
  private persistPlayerToStorage(): void {
    try {
      const data: PlayerSaveData = {
        version: SAVE_VERSION,
        timestamp: Date.now(),
        position: this.playerData?.position || { x: 0, y: 0, z: 0 },
        orientation: this.playerData?.orientation || { x: 0, y: 0, z: 0, w: 1 },
        velocity: this.playerData?.velocity || { x: 0, y: 0, z: 0 },
        inventory: this.inventory
      };

      localStorage.setItem(STORAGE_KEY_PLAYER, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save player data:', error);
    }
  }

  // Persist planet data to localStorage
  private persistPlanetToStorage(planetId: string): void {
    try {
      const planet = this.planetData.get(planetId);
      if (!planet) return;

      const data: PlanetSaveData = {
        version: SAVE_VERSION,
        timestamp: Date.now(),
        tileChanges: Array.from(planet.tileChanges.values()),
        torches: planet.torches,
        furnaces: planet.furnaces,
        storageChests: planet.storageChests,
        garbagePiles: planet.garbagePiles,
        steamEngines: planet.steamEngines,
        hydroGenerators: planet.hydroGenerators,
        copperPipes: planet.copperPipes,
        removedTrees: planet.removedTrees
      };

      const key = planetId === 'earth' ? STORAGE_KEY_EARTH : STORAGE_KEY_MOON;
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Failed to save ${planetId} data:`, error);
    }
  }

  // Check if there's any saved data
  public hasSavedData(): boolean {
    return localStorage.getItem(STORAGE_KEY_PLAYER) !== null ||
           localStorage.getItem(STORAGE_KEY_EARTH) !== null ||
           localStorage.getItem(STORAGE_KEY_MOON) !== null ||
           localStorage.getItem(LEGACY_STORAGE_KEY) !== null;
  }
}

// Global singleton instance
export const gameStorage = new GameStorage();
