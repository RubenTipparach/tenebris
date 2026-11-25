import { getLandableBodies } from '../config/SolarSystemConfig';
import { netSync } from '../net/NetSync';
import type { SavedMachine } from '../power/MachineLogic';
import type { SavedSubmarine } from '../vehicles/Submarine';
import { localGameTime } from '../world/Orbits';

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
  // A tool's uses left; absent = fresh (saves from before tool wear)
  uses?: number;
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
  /** Unburnt fuel stack in the slot (older saves have none) */
  fuelItem?: number | null;
  fuelCount?: number;
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

// Cooking station data (campfire, kiln, oven: src/planet/Cookers.ts)
export interface SavedCooker {
  tileIndex: number;
  kind: 'campfire' | 'kiln' | 'oven';
  position: { x: number; y: number; z: number };  // the station's centre
  rotation: number;
  slots: SavedInventorySlot[];
  progress: number;
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

// Cable data (for power connections)
export interface SavedCable {
  tileIndex: number;
  depth: number;
  position: { x: number; y: number; z: number };
}

// Electric furnace data
export interface SavedElectricFurnace {
  tileIndex: number;
  position: { x: number; y: number; z: number };
  rotation: number;
  smeltingItem: number | null;
  smeltingProgress: number;
  inputCount: number;
  // An alloy's second input (absent in saves from before alloys)
  additiveItem?: number | null;
  additiveCount?: number;
  outputItem: number | null;
  outputCount: number;
}

// Electronics workbench data
export interface SavedElectronicsWorkbench {
  tileIndex: number;
  position: { x: number; y: number; z: number };
  rotation: number;
}

// Computer data
export interface SavedComputer {
  tileIndex: number;
  position: { x: number; y: number; z: number };
  rotation: number;
  isPowered: boolean;
}

// 3D Printer data
export interface SavedPrinter3D {
  tileIndex: number;
  position: { x: number; y: number; z: number };
  rotation: number;
  isPowered: boolean;
  currentJob: {
    itemType: number;
    progress: number;
    totalTime: number;
    startTime: number;
    outputQuantity?: number;
    ingredients?: Record<string, number>;
  } | null;
  printQueue?: {
    itemType: number;
    totalTime: number;
    outputQuantity: number;
    ingredients: Record<string, number>;
  }[];
  outputInventory?: {
    itemType: number | null;
    quantity: number;
  }[];
}

// Removed tree data (trees that have been chopped down)
export interface SavedRemovedTree {
  tileIndex: number;
}

// Saved rocket part data
export interface SavedRocketPart {
  itemType: number;
  heightIndex: number;
}

// Launch pad data
export interface SavedLaunchPad {
  centerTileIndex: number;          // the pad's first block (its save key)
  surroundingTileIndices: number[]; // the rocket middle's ring
  tiles?: number[];                 // every pad block (absent: placed whole - the centre + its ring)
  towerTile?: number;               // the tower's hex (absent: the first ring hex)
  position: { x: number; y: number; z: number };
  rotation: number;
  segmentCount: number;
  rocketBlocks: number;
  rocketParts?: SavedRocketPart[];  // New: saved rocket parts stack
  fuel?: number;                    // fuel units in the rocket's tanks (absent = full)
  cargo?: { itemType: number; quantity: number }[];  // the rocket's cargo hold
  equipment?: { itemType: number; quantity: number }[];  // its equipment slots (absent = empty)
  stash?: { itemType: number; quantity: number; uses?: number }[];  // what boarders left on the pad (absent = empty; openspec pad-stash)
  engineMode?: number | null;       // which engines fire (design 6b); absent/null = all
}

// Music state for persistence
export interface MusicSaveData {
  lastPlayTime: number;  // Timestamp when a song was last played
  enabled: boolean;      // Whether music is enabled
}

// Player-specific save data
export interface PlayerSaveData {
  version: number;
  timestamp: number;
  position: { x: number; y: number; z: number };
  orientation: { x: number; y: number; z: number; w: number };  // quaternion
  velocity: { x: number; y: number; z: number };
  inventory: SavedInventorySlot[];
  music?: MusicSaveData;  // Music player state
  gameTimeS?: number;     // the world's game clock (live orbits), seconds
  // Future: techStatus, techInventory, etc.
}

// Planet-specific save data
export interface PlanetSaveData {
  version: number;
  timestamp: number;
  tileChanges: TileChange[];
  torches: SavedTorch[];
  furnaces: SavedFurnace[];
  electricFurnaces: SavedElectricFurnace[];
  electronicsWorkbenches: SavedElectronicsWorkbench[];
  computers: SavedComputer[];
  printers3D: SavedPrinter3D[];
  storageChests: SavedStorageChest[];
  cookers?: SavedCooker[];
  garbagePiles: SavedGarbagePile[];
  steamEngines: SavedSteamEngine[];
  hydroGenerators: SavedHydroGenerator[];
  copperPipes: SavedCopperPipe[];
  cables: SavedCable[];
  removedTrees: SavedRemovedTree[];
  launchPads: SavedLaunchPad[];
  machines?: SavedMachine[];        // the industry machines and batteries
  submarines?: SavedSubmarine[];    // parked submarines (space-exploration, submarines)
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
// A server world keeps its own local save beside the single-player one:
// keys tenebris_w_<worldId>_player etc. Empty = the single-player save.
let worldPrefix = '';
/** Use a server world's save slot (call before gameStorage.load()). */
export function setSaveWorld(worldId: string | null): void {
  worldPrefix = worldId ? `w_${worldId.replace(/[^a-z0-9]/gi, '')}_` : '';
}
/**
 * Forget this server world's local copy (its save slot and what it last
 * synced) - the server reset it, so the next load starts from the server.
 */
export function clearWorldSave(): void {
  if (!worldPrefix) return;
  try {
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`tenebris_${worldPrefix}`)) stale.push(k);
    }
    for (const k of stale) localStorage.removeItem(k);
  } catch {
    // storage blocked: nothing kept to clear
  }
}
const STORAGE_KEY_PLAYER_BASE = 'player';
// Each planet's edits live under tenebris_<planetId> (tenebris_earth,
// tenebris_moon, tenebris_sequoia, ...). Sequoia used to share the moon's
// key. Every landable body in the solar system config gets one.
const PLANET_IDS = getLandableBodies().map(body => body.id);
const planetStorageKey = (planetId: string): string => `tenebris_${worldPrefix}${planetId}`;
const playerStorageKey = (): string => `tenebris_${worldPrefix}${STORAGE_KEY_PLAYER_BASE}`;
const LEGACY_STORAGE_KEY = 'tenebris_save';
const MUSIC_KEY = 'tenebris_music';
// Mission progress lives in the world's own slot (each world has its own)
const missionsKey = (): string => `tenebris_${worldPrefix}missions`;

// Every placed-object save is also published to the multiplayer world as a
// record (NetSync), so the one save path is the one sync path. Offline, and
// while a remote record is being applied, this is a no-op.
function publish(kind: string, planetId: string, key: string | number, data: object | null): void {
  netSync.record(kind, planetId, key, data);
}
type RecordItem = { tileIndex: number; depth?: number; centerTileIndex?: number; position?: { x: number; y: number; z: number }; key?: string };
// Each published kind: the planet save array it lives in and its record key
// (matching the keys the saveX / removeX methods publish under)
const tileKey = (o: RecordItem) => String(o.tileIndex);
const depthKey = (o: RecordItem) => `${o.tileIndex}:${o.depth}`;
const RECORD_KINDS: Record<string, { field: keyof PlanetRecordLists; key: (o: RecordItem) => string }> = {
  torch: { field: 'torches', key: (o) => torchKey(o.position!) },
  furnace: { field: 'furnaces', key: tileKey },
  electricFurnace: { field: 'electricFurnaces', key: tileKey },
  workbench: { field: 'electronicsWorkbenches', key: tileKey },
  computer: { field: 'computers', key: tileKey },
  printer3D: { field: 'printers3D', key: tileKey },
  chest: { field: 'storageChests', key: tileKey },
  cooker: { field: 'cookers', key: tileKey },
  garbagePile: { field: 'garbagePiles', key: tileKey },
  steamEngine: { field: 'steamEngines', key: tileKey },
  hydroGenerator: { field: 'hydroGenerators', key: tileKey },
  copperPipe: { field: 'copperPipes', key: depthKey },
  cable: { field: 'cables', key: depthKey },
  launchPad: { field: 'launchPads', key: (o) => String(o.centerTileIndex) },
  machine: { field: 'machines', key: tileKey },
  // a submarine moves: keyed by its own id, not a tile
  submarine: { field: 'submarines', key: (o) => o.key! },
};
type PlanetRecordLists = Omit<PlanetSaveData, 'version' | 'timestamp' | 'tileChanges' | 'removedTrees'>;
/** A torch's record key: its position (several torches can share a tile). */
export function torchKey(p: { x: number; y: number; z: number }): string {
  return `${p.x.toFixed(2)}:${p.y.toFixed(2)}:${p.z.toFixed(2)}`;
}
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
    electricFurnaces: SavedElectricFurnace[];
    electronicsWorkbenches: SavedElectronicsWorkbench[];
    computers: SavedComputer[];
    printers3D: SavedPrinter3D[];
    storageChests: SavedStorageChest[];
    cookers: SavedCooker[];
    garbagePiles: SavedGarbagePile[];
    steamEngines: SavedSteamEngine[];
    copperPipes: SavedCopperPipe[];
    cables: SavedCable[];
    hydroGenerators: SavedHydroGenerator[];
    removedTrees: SavedRemovedTree[];
    launchPads: SavedLaunchPad[];
    machines: SavedMachine[];
    submarines: SavedSubmarine[];
  }> = new Map();

  private autoSaveInterval: number | null = null;
  private onPlayerSave: (() => { position: { x: number; y: number; z: number }; orientation: { x: number; y: number; z: number; w: number }; velocity: { x: number; y: number; z: number } }) | null = null;

  constructor() {
    // Initialize planet data for every planet
    for (const planetId of PLANET_IDS) {
      this.planetData.set(planetId, { tileChanges: new Map(), torches: [], furnaces: [], electricFurnaces: [], electronicsWorkbenches: [], computers: [], printers3D: [], storageChests: [], cookers: [], garbagePiles: [], steamEngines: [], hydroGenerators: [], copperPipes: [], cables: [], removedTrees: [], launchPads: [], machines: [], submarines: [] });
    }
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
  // Called for every local block edit (multiplayer sends it to the server)
  public onTileChange: ((planetId: string, tileIndex: number, depth: number, blockType: number) => void) | null = null;

  public saveTileChange(planetId: string, tileIndex: number, depth: number, blockType: number): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;
    this.onTileChange?.(planetId, tileIndex, depth, blockType);

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
    publish('torch', planetId, torchKey(position), { tileIndex, position });
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
        publish('torch', planetId, torchKey(position), null);
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
    publish('furnace', planetId, tileIndex, { tileIndex, ...furnaceData });
  }

  // Remove a furnace from save
  public removeFurnace(planetId: string, tileIndex: number): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.furnaces = planet.furnaces.filter(f => f.tileIndex !== tileIndex);
    this.persistPlanetToStorage(planetId);
    publish('furnace', planetId, tileIndex, null);
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

  // Save electric furnace placement
  public saveElectricFurnace(planetId: string, tileIndex: number, furnaceData: Omit<SavedElectricFurnace, 'tileIndex'>): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.electricFurnaces = planet.electricFurnaces.filter(f => f.tileIndex !== tileIndex);
    planet.electricFurnaces.push({ tileIndex, ...furnaceData });
    this.persistPlanetToStorage(planetId);
    publish('electricFurnace', planetId, tileIndex, { tileIndex, ...furnaceData });
  }

  // Remove an electric furnace from save
  public removeElectricFurnace(planetId: string, tileIndex: number): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.electricFurnaces = planet.electricFurnaces.filter(f => f.tileIndex !== tileIndex);
    this.persistPlanetToStorage(planetId);
    publish('electricFurnace', planetId, tileIndex, null);
  }

  // Get all saved electric furnaces
  public getElectricFurnaces(): Array<SavedElectricFurnace & { planetId: string }> {
    const allFurnaces: Array<SavedElectricFurnace & { planetId: string }> = [];
    for (const [planetId, planet] of this.planetData) {
      for (const furnace of planet.electricFurnaces) {
        allFurnaces.push({ ...furnace, planetId });
      }
    }
    return allFurnaces;
  }

  // Save electronics workbench placement
  public saveElectronicsWorkbench(planetId: string, tileIndex: number, workbenchData: Omit<SavedElectronicsWorkbench, 'tileIndex'>): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.electronicsWorkbenches = planet.electronicsWorkbenches.filter(w => w.tileIndex !== tileIndex);
    planet.electronicsWorkbenches.push({ tileIndex, ...workbenchData });
    this.persistPlanetToStorage(planetId);
    publish('workbench', planetId, tileIndex, { tileIndex, ...workbenchData });
  }

  // Remove an electronics workbench from save
  public removeElectronicsWorkbench(planetId: string, tileIndex: number): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.electronicsWorkbenches = planet.electronicsWorkbenches.filter(w => w.tileIndex !== tileIndex);
    this.persistPlanetToStorage(planetId);
    publish('workbench', planetId, tileIndex, null);
  }

  // Get all saved electronics workbenches
  public getElectronicsWorkbenches(): Array<SavedElectronicsWorkbench & { planetId: string }> {
    const allWorkbenches: Array<SavedElectronicsWorkbench & { planetId: string }> = [];
    for (const [planetId, planet] of this.planetData) {
      for (const workbench of planet.electronicsWorkbenches) {
        allWorkbenches.push({ ...workbench, planetId });
      }
    }
    return allWorkbenches;
  }

  // Save computer placement
  public saveComputer(planetId: string, tileIndex: number, computerData: Omit<SavedComputer, 'tileIndex'>): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.computers = planet.computers.filter(c => c.tileIndex !== tileIndex);
    planet.computers.push({ tileIndex, ...computerData });
    this.persistPlanetToStorage(planetId);
    publish('computer', planetId, tileIndex, { tileIndex, ...computerData });
  }

  // Remove a computer from save
  public removeComputer(planetId: string, tileIndex: number): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.computers = planet.computers.filter(c => c.tileIndex !== tileIndex);
    this.persistPlanetToStorage(planetId);
    publish('computer', planetId, tileIndex, null);
  }

  // Get all saved computers
  public getComputers(): Array<SavedComputer & { planetId: string }> {
    const allComputers: Array<SavedComputer & { planetId: string }> = [];
    for (const [planetId, planet] of this.planetData) {
      for (const computer of planet.computers) {
        allComputers.push({ ...computer, planetId });
      }
    }
    return allComputers;
  }

  // Save 3D printer placement
  public savePrinter3D(planetId: string, tileIndex: number, printerData: Omit<SavedPrinter3D, 'tileIndex'>): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.printers3D = planet.printers3D.filter(p => p.tileIndex !== tileIndex);
    planet.printers3D.push({ tileIndex, ...printerData });
    this.persistPlanetToStorage(planetId);
    publish('printer3D', planetId, tileIndex, { tileIndex, ...printerData });
  }

  // Remove a 3D printer from save
  public removePrinter3D(planetId: string, tileIndex: number): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.printers3D = planet.printers3D.filter(p => p.tileIndex !== tileIndex);
    this.persistPlanetToStorage(planetId);
    publish('printer3D', planetId, tileIndex, null);
  }

  // Get all saved 3D printers
  public getPrinters3D(): Array<SavedPrinter3D & { planetId: string }> {
    const allPrinters: Array<SavedPrinter3D & { planetId: string }> = [];
    for (const [planetId, planet] of this.planetData) {
      for (const printer of planet.printers3D) {
        allPrinters.push({ ...printer, planetId });
      }
    }
    return allPrinters;
  }

  // Save launch pad placement
  public saveLaunchPad(planetId: string, centerTileIndex: number, launchPadData: Omit<SavedLaunchPad, 'centerTileIndex'>): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.launchPads = planet.launchPads.filter(p => p.centerTileIndex !== centerTileIndex);
    planet.launchPads.push({ centerTileIndex, ...launchPadData });
    this.persistPlanetToStorage(planetId);
    publish('launchPad', planetId, centerTileIndex, { centerTileIndex, ...launchPadData });
  }

  // Remove a launch pad from save
  public removeLaunchPad(planetId: string, centerTileIndex: number): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.launchPads = planet.launchPads.filter(p => p.centerTileIndex !== centerTileIndex);
    this.persistPlanetToStorage(planetId);
    publish('launchPad', planetId, centerTileIndex, null);
  }

  // Get all saved launch pads
  public getLaunchPads(): Array<SavedLaunchPad & { planetId: string }> {
    const allLaunchPads: Array<SavedLaunchPad & { planetId: string }> = [];
    for (const [planetId, planet] of this.planetData) {
      for (const launchPad of planet.launchPads) {
        allLaunchPads.push({ ...launchPad, planetId });
      }
    }
    return allLaunchPads;
  }

  // The industry machines and batteries (src/planet/Machines.ts): one record
  // kind for all of them, keyed by tile like the other machines
  public saveMachine(planetId: string, data: SavedMachine): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;
    planet.machines = planet.machines.filter(m => m.tileIndex !== data.tileIndex);
    planet.machines.push(data);
    this.persistPlanetToStorage(planetId);
    publish('machine', planetId, data.tileIndex, data);
  }

  public removeMachine(planetId: string, tileIndex: number): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;
    planet.machines = planet.machines.filter(m => m.tileIndex !== tileIndex);
    this.persistPlanetToStorage(planetId);
    publish('machine', planetId, tileIndex, null);
  }

  public getMachines(): Array<SavedMachine & { planetId: string }> {
    const all: Array<SavedMachine & { planetId: string }> = [];
    for (const [planetId, planet] of this.planetData) {
      for (const m of planet.machines) all.push({ ...m, planetId });
    }
    return all;
  }

  // Submarines (space-exploration, submarines): one record per craft, keyed
  // by its own id - written when placed, parked, piloted (its pose every few
  // seconds) and when its hold changes
  public saveSubmarine(planetId: string, data: SavedSubmarine): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;
    planet.submarines = planet.submarines.filter(s => s.key !== data.key);
    planet.submarines.push(data);
    this.persistPlanetToStorage(planetId);
    publish('submarine', planetId, data.key, data);
  }

  public removeSubmarine(planetId: string, key: string): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;
    planet.submarines = planet.submarines.filter(s => s.key !== key);
    this.persistPlanetToStorage(planetId);
    publish('submarine', planetId, key, null);
  }

  public getSubmarines(): Array<SavedSubmarine & { planetId: string }> {
    const all: Array<SavedSubmarine & { planetId: string }> = [];
    for (const [planetId, planet] of this.planetData) {
      for (const s of planet.submarines) all.push({ ...s, planetId });
    }
    return all;
  }

  // Save storage chest placement
  public saveStorageChest(planetId: string, tileIndex: number, chestData: Omit<SavedStorageChest, 'tileIndex'>): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.storageChests = planet.storageChests.filter(c => c.tileIndex !== tileIndex);
    planet.storageChests.push({ tileIndex, ...chestData });
    this.persistPlanetToStorage(planetId);
    publish('chest', planetId, tileIndex, { tileIndex, ...chestData });
  }

  // Remove a storage chest from save
  public removeStorageChest(planetId: string, tileIndex: number): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.storageChests = planet.storageChests.filter(c => c.tileIndex !== tileIndex);
    this.persistPlanetToStorage(planetId);
    publish('chest', planetId, tileIndex, null);
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

  // Save a cooking station (placement, slots and progress)
  public saveCooker(planetId: string, tileIndex: number, data: Omit<SavedCooker, 'tileIndex'>): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;
    planet.cookers = planet.cookers.filter(c => c.tileIndex !== tileIndex);
    planet.cookers.push({ tileIndex, ...data });
    this.persistPlanetToStorage(planetId);
    publish('cooker', planetId, tileIndex, { tileIndex, ...data });
  }

  public removeCooker(planetId: string, tileIndex: number): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;
    planet.cookers = planet.cookers.filter(c => c.tileIndex !== tileIndex);
    this.persistPlanetToStorage(planetId);
    publish('cooker', planetId, tileIndex, null);
  }

  public getCookers(): Array<SavedCooker & { planetId: string }> {
    const all: Array<SavedCooker & { planetId: string }> = [];
    for (const [planetId, planet] of this.planetData) {
      for (const c of planet.cookers) all.push({ ...c, planetId });
    }
    return all;
  }

  // Save garbage pile placement
  public saveGarbagePile(planetId: string, tileIndex: number, pileData: Omit<SavedGarbagePile, 'tileIndex'>): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.garbagePiles = planet.garbagePiles.filter(p => p.tileIndex !== tileIndex);
    planet.garbagePiles.push({ tileIndex, ...pileData });
    this.persistPlanetToStorage(planetId);
    publish('garbagePile', planetId, tileIndex, { tileIndex, ...pileData });
  }

  // Remove a garbage pile from save
  public removeGarbagePile(planetId: string, tileIndex: number): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.garbagePiles = planet.garbagePiles.filter(p => p.tileIndex !== tileIndex);
    this.persistPlanetToStorage(planetId);
    publish('garbagePile', planetId, tileIndex, null);
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
    publish('steamEngine', planetId, tileIndex, { tileIndex, ...engineData });
  }

  // Remove a steam engine from save
  public removeSteamEngine(planetId: string, tileIndex: number): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.steamEngines = planet.steamEngines.filter(e => e.tileIndex !== tileIndex);
    this.persistPlanetToStorage(planetId);
    publish('steamEngine', planetId, tileIndex, null);
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
    publish('hydroGenerator', planetId, tileIndex, { tileIndex, ...generatorData });
  }

  // Remove a hydro generator from save
  public removeHydroGenerator(planetId: string, tileIndex: number): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.hydroGenerators = planet.hydroGenerators.filter(g => g.tileIndex !== tileIndex);
    this.persistPlanetToStorage(planetId);
    publish('hydroGenerator', planetId, tileIndex, null);
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
    publish('copperPipe', planetId, `${tileIndex}:${depth}`, { tileIndex, depth, ...pipeData });
  }

  // Remove a copper pipe from save
  public removeCopperPipe(planetId: string, tileIndex: number, depth: number): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.copperPipes = planet.copperPipes.filter(p => !(p.tileIndex === tileIndex && p.depth === depth));
    this.persistPlanetToStorage(planetId);
    publish('copperPipe', planetId, `${tileIndex}:${depth}`, null);
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

  // Save cable placement
  public saveCable(planetId: string, tileIndex: number, depth: number, cableData: Omit<SavedCable, 'tileIndex' | 'depth'>): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.cables = planet.cables.filter(c => !(c.tileIndex === tileIndex && c.depth === depth));
    planet.cables.push({ tileIndex, depth, ...cableData });
    this.persistPlanetToStorage(planetId);
    publish('cable', planetId, `${tileIndex}:${depth}`, { tileIndex, depth, ...cableData });
  }

  // Remove a cable from save
  public removeCable(planetId: string, tileIndex: number, depth: number): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    planet.cables = planet.cables.filter(c => !(c.tileIndex === tileIndex && c.depth === depth));
    this.persistPlanetToStorage(planetId);
    publish('cable', planetId, `${tileIndex}:${depth}`, null);
  }

  // Get all saved cables
  public getCables(): Array<SavedCable & { planetId: string }> {
    const allCables: Array<SavedCable & { planetId: string }> = [];
    for (const [planetId, planet] of this.planetData) {
      for (const cable of planet.cables) {
        allCables.push({ ...cable, planetId });
      }
    }
    return allCables;
  }

  /**
   * Multiplayer: store another player's placed-object record (data null =
   * removed) in this world's save, under the same arrays and keys the
   * saveX / removeX methods use. Does not publish.
   */
  public applyRecord(kind: string, planetId: string, key: string, data: object | null): void {
    const planet = this.planetData.get(planetId);
    const spec = RECORD_KINDS[kind];
    if (!planet || !spec) return;
    const list = planet[spec.field] as object[];
    const kept = list.filter(item => spec.key(item as never) !== key);
    if (data) kept.push(data);
    (planet[spec.field] as object[]) = kept;
    this.persistPlanetToStorage(planetId);
  }

  /** Every stored record of a kind, as (planet, key, data) - for joining a server world. */
  public listRecords(kind: string): Array<{ planet: string; key: string; data: object }> {
    const out: Array<{ planet: string; key: string; data: object }> = [];
    for (const [planetId, planet] of this.planetData) {
      if (kind === 'removedTree') {
        for (const t of planet.removedTrees) out.push({ planet: planetId, key: String(t.tileIndex), data: { tileIndex: t.tileIndex } });
        continue;
      }
      const spec = RECORD_KINDS[kind];
      if (!spec) continue;
      for (const item of planet[spec.field] as RecordItem[]) out.push({ planet: planetId, key: spec.key(item), data: item });
    }
    return out;
  }

  // Save a removed tree to storage
  public saveRemovedTree(planetId: string, tileIndex: number): void {
    const planet = this.planetData.get(planetId);
    if (!planet) return;

    // Check if already saved
    if (!planet.removedTrees.some(t => t.tileIndex === tileIndex)) {
      planet.removedTrees.push({ tileIndex });
      this.persistPlanetToStorage(planetId);
      publish('removedTree', planetId, tileIndex, { tileIndex });
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
    for (const planetId of PLANET_IDS) {
      this.loadPlanetData(planetId);
    }

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
      const saved = localStorage.getItem(playerStorageKey());
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
      const key = planetStorageKey(planetId);
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
      planet.electricFurnaces = data.electricFurnaces || [];
      planet.electronicsWorkbenches = data.electronicsWorkbenches || [];
      planet.computers = data.computers || [];
      planet.printers3D = data.printers3D || [];
      planet.storageChests = data.storageChests || [];
      planet.cookers = data.cookers || [];
      planet.garbagePiles = data.garbagePiles || [];
      planet.steamEngines = data.steamEngines || [];
      planet.hydroGenerators = data.hydroGenerators || [];
      planet.copperPipes = data.copperPipes || [];
      planet.cables = data.cables || [];
      planet.removedTrees = data.removedTrees || [];
      planet.launchPads = data.launchPads || [];
      planet.machines = data.machines || [];
      planet.submarines = data.submarines || [];
    } catch (error) {
      console.error(`Failed to load ${planetId} data:`, error);
    }
  }

  // Migrate legacy single-file save to new multi-file format
  private migrateLegacySave(): void {
    if (worldPrefix) return; // the legacy save is single player's
    try {
      const legacySaved = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!legacySaved) return;

      // Check if we've already migrated (new files exist)
      if (localStorage.getItem(playerStorageKey()) !== null) {
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
            fuelItem: (furnace as SavedFurnace).fuelItem ?? null,
            fuelCount: (furnace as SavedFurnace).fuelCount ?? 0,
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
      planet.electricFurnaces = [];
      planet.electronicsWorkbenches = [];
      planet.storageChests = [];
      planet.cookers = [];
      planet.garbagePiles = [];
      planet.steamEngines = [];
      planet.hydroGenerators = [];
      planet.copperPipes = [];
      planet.cables = [];
      planet.removedTrees = [];
      planet.launchPads = [];
      planet.machines = [];
      planet.submarines = [];
    }

    // Clear all storage keys
    localStorage.removeItem(playerStorageKey());
    for (const planetId of PLANET_IDS) {
      localStorage.removeItem(planetStorageKey(planetId));
    }
    localStorage.removeItem(`tenebris_${worldPrefix}suit`);
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
        inventory: this.inventory,
        music: this.playerData?.music,
        // the single-player clock, live (orbits are a function of it)
        gameTimeS: localGameTime(),
      };

      localStorage.setItem(playerStorageKey(), JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save player data:', error);
    }
  }

  // The well-fed state (src/player/Cooking.ts): its own key per world slot
  public getWellFed<T>(): T | null {
    try {
      const raw = localStorage.getItem(`tenebris_${worldPrefix}wellfed`);
      return raw ? JSON.parse(raw) as T : null;
    } catch {
      return null;
    }
  }

  public saveWellFed(state: object | null): void {
    try {
      if (state) localStorage.setItem(`tenebris_${worldPrefix}wellfed`, JSON.stringify(state));
      else localStorage.removeItem(`tenebris_${worldPrefix}wellfed`);
    } catch {
      // storage blocked: kept for this session only
    }
  }

  // The space suit and its tank air (src/player/AirSystem.ts): its own key
  // per world slot, written the frame the suit goes on or comes off
  public getSuit<T>(): T | null {
    try {
      const raw = localStorage.getItem(`tenebris_${worldPrefix}suit`);
      return raw ? JSON.parse(raw) as T : null;
    } catch {
      return null;
    }
  }

  public saveSuit(state: object): void {
    try {
      localStorage.setItem(`tenebris_${worldPrefix}suit`, JSON.stringify(state));
    } catch {
      // storage blocked: kept for this session only
    }
  }

  // Mission progress (src/player/MissionTracker), saved the moment it changes
  public getMissionState<T>(): T | null {
    try {
      const raw = localStorage.getItem(missionsKey());
      return raw ? JSON.parse(raw) as T : null;
    } catch {
      return null;
    }
  }

  public saveMissionState(state: object): void {
    try {
      localStorage.setItem(missionsKey(), JSON.stringify(state));
    } catch {
      // storage blocked: progress lasts this session only
    }
  }

  // The player's waypoints in this world (navigation-and-orbits): their own
  // key per world slot, written the moment they change
  public getWaypoints(): unknown {
    try {
      const raw = localStorage.getItem(`tenebris_${worldPrefix}waypoints`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public saveWaypoints(list: unknown): void {
    try {
      localStorage.setItem(`tenebris_${worldPrefix}waypoints`, JSON.stringify(list));
    } catch {
      // storage blocked: kept for this session only
    }
  }

  // Music on/off is a setting of this device, not of a world or a save:
  // it lives under its own key, so the player-pose autosave (which rewrites
  // the player save) and switching worlds can't reset it
  /** The saved game clock (seconds of game time; 0 for an older save). */
  public getGameTime(): number {
    return this.playerData?.gameTimeS ?? 0;
  }

  public getMusicState(): MusicSaveData | null {
    try {
      const raw = localStorage.getItem(MUSIC_KEY);
      if (raw) return JSON.parse(raw) as MusicSaveData;
    } catch {
      // blocked / corrupt: fall back below
    }
    // older saves kept it in the player save
    return this.playerData?.music || null;
  }

  public saveMusicState(music: MusicSaveData): void {
    try {
      localStorage.setItem(MUSIC_KEY, JSON.stringify(music));
    } catch {
      // storage blocked: the setting lasts this session only
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
        electricFurnaces: planet.electricFurnaces,
        electronicsWorkbenches: planet.electronicsWorkbenches,
        computers: planet.computers,
        printers3D: planet.printers3D,
        storageChests: planet.storageChests,
        cookers: planet.cookers,
        garbagePiles: planet.garbagePiles,
        steamEngines: planet.steamEngines,
        hydroGenerators: planet.hydroGenerators,
        copperPipes: planet.copperPipes,
        cables: planet.cables,
        removedTrees: planet.removedTrees,
        launchPads: planet.launchPads,
        machines: planet.machines,
        submarines: planet.submarines
      };

      const key = planetStorageKey(planetId);
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Failed to save ${planetId} data:`, error);
    }
  }

  // Check if there's any saved data
  public hasSavedData(): boolean {
    return localStorage.getItem(playerStorageKey()) !== null ||
           PLANET_IDS.some(planetId => localStorage.getItem(planetStorageKey(planetId)) !== null) ||
           localStorage.getItem(LEGACY_STORAGE_KEY) !== null;
  }
}

// Global singleton instance
export const gameStorage = new GameStorage();
