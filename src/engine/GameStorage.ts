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
}

const STORAGE_KEY = 'tenebris_save';
const SAVE_VERSION = 1;

export class GameStorage {
  private pendingChanges: Map<string, TileChange> = new Map();
  private inventory: SavedInventorySlot[] = [];
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
