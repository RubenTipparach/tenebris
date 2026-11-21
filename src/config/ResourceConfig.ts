import { HexBlockType } from '../shared/blockTypes';

/**
 * Where the industry resources lie (openspec industry-and-nuclear, design
 * decision 1). A deposit is an ore-vein config the terrain worker spreads
 * like the ordinary ores; a body lists the deposits it holds in its
 * `terrain.extraOres` (SolarSystemConfig), so nothing is hard-coded per
 * planet in the worker. Depths count up from bedrock (0).
 */
export interface Deposit {
  type: HexBlockType;
  minDepth: number;
  maxDepth: number;
  veinChance: number;    // chance a vein starts at a cell
  veinSize: number;      // base blocks per vein
  spreadFactor: number;  // how far a vein spreads (0-1)
}

export const DEPOSITS = {
  // Uranium: rare, deep, small veins (the Moon, Cinder, metal asteroids)
  URANIUM: { type: HexBlockType.ORE_URANIUM, minDepth: 0, maxDepth: 8, veinChance: 0.0035, veinSize: 5, spreadFactor: 0.62 },
  // Oil: big, deep pockets of oil sand (Earth, the jungle moons)
  OIL: { type: HexBlockType.OIL_SAND, minDepth: 2, maxDepth: 12, veinChance: 0.0025, veinSize: 24, spreadFactor: 0.9 },
} satisfies Record<string, Deposit>;

/**
 * Clay on a body's shores (Earth): beach tiles and shallow beds whose
 * low-frequency noise is above `threshold` turn from sand to clay, top and
 * soil layer, in broad patches.
 */
export interface ShoreClay {
  scale: number;       // noise frequency (low: big patches)
  threshold: number;   // -1..1: higher = rarer
  seedSalt: number;    // offset from the world seed
  shallowDepth: number; // how far below sea level a bed still counts as shore
}
export const SHORE_CLAY: ShoreClay = { scale: 3.0, threshold: 0.1, seedSalt: 303, shallowDepth: 2 };
