// Types for saved game data
export interface TileChange {
  planetId: string;  // 'earth' or 'moon'
  tileIndex: number;
  depth: number;
  blockType: number;
}

export interface SavedInventorySlot {
  itemType: number;
  quantity: number;
}

export interface SavedTorch {
  planetId: string;
  tileIndex: number;
  position: { x: number; y: number; z: number };
}

export interface SavedFurnace {
  planetId: string;
  tileIndex: number;
  position: { x: number; y: number; z: number };
  rotation: number;
  fuelAmount: number;
  smeltingItem: number | null;
  smeltingProgress: number;
  outputItem: number | null;
  outputCount: number;
}

export interface PlayerSaveData {
  position: { x: number; y: number; z: number };
  orientation: { x: number; y: number; z: number; w: number };  // quaternion
  velocity: { x: number; y: number; z: number };
}

export interface GameSaveData {
  version: number;
  timestamp: number;
  tileChanges: TileChange[];
  inventory: SavedInventorySlot[];
  player: PlayerSaveData;
  torches: SavedTorch[];
  furnaces: SavedFurnace[];
}

const STORAGE_KEY = 'tenebris_save';
const SAVE_VERSION = 1;

export class GameStorage {
  private pendingChanges: Map<string, TileChange> = new Map();
  private inventory: SavedInventorySlot[] = [];
  private torches: SavedTorch[] = [];
  private furnaces: SavedFurnace[] = [];
  private playerData: PlayerSaveData | null = null;
  private autoSaveInterval: number | null = null;
  private onPlayerSave: (() => PlayerSaveData) | null = null;

  constructor() {
    // Initialize with empty state
  }

  // Set callback to get current player data
  public setPlayerSaveCallback(callback: () => PlayerSaveData): void {
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
    const key = `${planetId}:${tileIndex}:${depth}`;
    this.pendingChanges.set(key, { planetId, tileIndex, depth, blockType });
    this.persistToStorage();
  }

  // Save inventory state
  public saveInventory(inventory: SavedInventorySlot[]): void {
    this.inventory = [...inventory];
    this.persistToStorage();
  }

  // Save torch placement
  public saveTorch(planetId: string, tileIndex: number, position: { x: number; y: number; z: number }): void {
    this.torches.push({ planetId, tileIndex, position });
    this.persistToStorage();
  }

  // Remove a torch from save
  public removeTorch(position: { x: number; y: number; z: number }): void {
    // Find and remove torch at this position (with small tolerance)
    const tolerance = 0.01;
    this.torches = this.torches.filter(t =>
      Math.abs(t.position.x - position.x) > tolerance ||
      Math.abs(t.position.y - position.y) > tolerance ||
      Math.abs(t.position.z - position.z) > tolerance
    );
    this.persistToStorage();
  }

  // Get all saved torches
  public getTorches(): SavedTorch[] {
    return this.torches;
  }

  // Save furnace placement
  public saveFurnace(planetId: string, tileIndex: number, furnaceData: Omit<SavedFurnace, 'planetId' | 'tileIndex'>): void {
    // Remove any existing furnace at this tile first
    this.furnaces = this.furnaces.filter(f => !(f.planetId === planetId && f.tileIndex === tileIndex));
    this.furnaces.push({ planetId, tileIndex, ...furnaceData });
    this.persistToStorage();
  }

  // Remove a furnace from save
  public removeFurnace(planetId: string, tileIndex: number): void {
    this.furnaces = this.furnaces.filter(f => !(f.planetId === planetId && f.tileIndex === tileIndex));
    this.persistToStorage();
  }

  // Get all saved furnaces
  public getFurnaces(): SavedFurnace[] {
    return this.furnaces;
  }

  // Save player position immediately
  public savePlayerPosition(): void {
    if (this.onPlayerSave) {
      this.playerData = this.onPlayerSave();
      this.persistToStorage();
    }
  }

  // Load saved game data
  public load(): GameSaveData | null {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return null;

      const data = JSON.parse(saved) as GameSaveData;

      // Version check for future compatibility
      if (data.version !== SAVE_VERSION) {
        console.warn(`Save version mismatch: expected ${SAVE_VERSION}, got ${data.version}`);
        // For now, still try to load it
      }

      // Restore pending changes map
      this.pendingChanges.clear();
      for (const change of data.tileChanges) {
        const key = `${change.planetId}:${change.tileIndex}:${change.depth}`;
        this.pendingChanges.set(key, change);
      }

      this.inventory = data.inventory || [];
      this.torches = data.torches || [];
      this.furnaces = data.furnaces || [];
      this.playerData = data.player || null;

      return data;
    } catch (error) {
      console.error('Failed to load save data:', error);
      return null;
    }
  }

  // Get all tile changes for a specific planet
  public getTileChangesForPlanet(planetId: string): TileChange[] {
    const changes: TileChange[] = [];
    for (const change of this.pendingChanges.values()) {
      if (change.planetId === planetId) {
        changes.push(change);
      }
    }
    return changes;
  }

  // Get saved inventory
  public getInventory(): SavedInventorySlot[] {
    return this.inventory;
  }

  // Get saved player data
  public getPlayerData(): PlayerSaveData | null {
    return this.playerData;
  }

  // Clear all saved data
  public clearSave(): void {
    this.pendingChanges.clear();
    this.inventory = [];
    this.torches = [];
    this.furnaces = [];
    this.playerData = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  // Persist current state to localStorage
  private persistToStorage(): void {
    try {
      const data: GameSaveData = {
        version: SAVE_VERSION,
        timestamp: Date.now(),
        tileChanges: Array.from(this.pendingChanges.values()),
        inventory: this.inventory,
        torches: this.torches,
        furnaces: this.furnaces,
        player: this.playerData || {
          position: { x: 0, y: 0, z: 0 },
          orientation: { x: 0, y: 0, z: 0, w: 1 },
          velocity: { x: 0, y: 0, z: 0 }
        }
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save game data:', error);
    }
  }

  // Check if there's any saved data
  public hasSavedData(): boolean {
    return localStorage.getItem(STORAGE_KEY) !== null;
  }
}

// Global singleton instance
export const gameStorage = new GameStorage();
