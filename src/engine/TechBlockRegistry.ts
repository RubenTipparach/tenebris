/**
 * TechBlockRegistry - Centralized registry for tech blocks that update at intervals
 *
 * Tech blocks are blocks that have their own update loops independent of player interaction,
 * such as furnaces (smelting), steam engines, hydro generators, etc.
 */

export interface TechBlockInfo {
  type: string;
  id: string;
  tileIndex: number;
  position: { x: number; y: number; z: number };
  getStatus: () => string;
  openUI: () => void;
}

export interface TechBlockManager {
  type: string;
  getBlocks: () => TechBlockInfo[];
}

class TechBlockRegistrySingleton {
  private static instance: TechBlockRegistrySingleton | null = null;
  private managers: Map<string, TechBlockManager> = new Map();
  private onUpdateCallbacks: Set<() => void> = new Set();

  private constructor() {}

  public static getInstance(): TechBlockRegistrySingleton {
    if (!TechBlockRegistrySingleton.instance) {
      TechBlockRegistrySingleton.instance = new TechBlockRegistrySingleton();
    }
    return TechBlockRegistrySingleton.instance;
  }

  /**
   * Register a tech block manager
   */
  public registerManager(manager: TechBlockManager): void {
    this.managers.set(manager.type, manager);
    this.notifyUpdate();
  }

  /**
   * Unregister a tech block manager
   */
  public unregisterManager(type: string): void {
    this.managers.delete(type);
    this.notifyUpdate();
  }

  /**
   * Get all registered tech blocks
   */
  public getAllBlocks(): TechBlockInfo[] {
    const blocks: TechBlockInfo[] = [];
    for (const manager of this.managers.values()) {
      blocks.push(...manager.getBlocks());
    }
    return blocks;
  }

  /**
   * Get blocks by type
   */
  public getBlocksByType(type: string): TechBlockInfo[] {
    const manager = this.managers.get(type);
    return manager ? manager.getBlocks() : [];
  }

  /**
   * Get all registered manager types
   */
  public getManagerTypes(): string[] {
    return Array.from(this.managers.keys());
  }

  /**
   * Register a callback for when the registry updates
   */
  public onUpdate(callback: () => void): void {
    this.onUpdateCallbacks.add(callback);
  }

  /**
   * Remove an update callback
   */
  public offUpdate(callback: () => void): void {
    this.onUpdateCallbacks.delete(callback);
  }

  /**
   * Notify all callbacks of an update
   */
  public notifyUpdate(): void {
    for (const callback of this.onUpdateCallbacks) {
      callback();
    }
  }
}

// Export singleton instance
export const TechBlockRegistry = TechBlockRegistrySingleton.getInstance();

// Expose on window for debug access
(window as unknown as { __techBlockRegistry: TechBlockRegistrySingleton }).__techBlockRegistry = TechBlockRegistry;
