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
  // Lithium: rich, shallow veins on every airless body (openspec
  // wool-air-and-reentry). Earth keeps only the thin common veins in
  // Planet.ts ORE_CONFIGS.
  LITHIUM: { type: HexBlockType.ORE_LITHIUM, minDepth: 0, maxDepth: 10, veinChance: 0.012, veinSize: 9, spreadFactor: 0.75 },
  // Body resources (openspec space-exploration, resources): each listed in
  // one body's extraOres only - scripts/body-resources.test.ts checks it
  RESIN: { type: HexBlockType.RESIN_AMBER, minDepth: 2, maxDepth: 14, veinChance: 0.006, veinSize: 8, spreadFactor: 0.7 },
  SALVAGE: { type: HexBlockType.SALVAGE_SCRAP, minDepth: 2, maxDepth: 14, veinChance: 0.008, veinSize: 10, spreadFactor: 0.75 },
  RARE_EARTH: { type: HexBlockType.ORE_RARE_EARTH, minDepth: 0, maxDepth: 10, veinChance: 0.008, veinSize: 7, spreadFactor: 0.7 },
  FUNGUS: { type: HexBlockType.FUNGUS_SEAM, minDepth: 1, maxDepth: 12, veinChance: 0.007, veinSize: 9, spreadFactor: 0.75 },
  SILICA: { type: HexBlockType.SILICA_SAND, minDepth: 2, maxDepth: 14, veinChance: 0.007, veinSize: 12, spreadFactor: 0.8 },
  CRYSTAL: { type: HexBlockType.CRYSTAL_VEIN, minDepth: 0, maxDepth: 10, veinChance: 0.005, veinSize: 6, spreadFactor: 0.65 },
  CRYO: { type: HexBlockType.CRYO_ICE, minDepth: 1, maxDepth: 12, veinChance: 0.007, veinSize: 8, spreadFactor: 0.7 },
} satisfies Record<string, Deposit>;

/**
 * Clay on a body's shores (Earth), in broad low-frequency noise patches
 * (above `threshold`): shallow sea beds turn to clay top and soil layer, and
 * beaches keep their sand on top with clay in the layer under it - so every
 * shore reads as sand and the clay is dug from the water or under the beach.
 */
export interface ShoreClay {
  scale: number;       // noise frequency (low: big patches)
  threshold: number;   // -1..1: higher = rarer
  seedSalt: number;    // offset from the world seed
  shallowDepth: number; // how far below sea level a bed still counts as shore
}
export const SHORE_CLAY: ShoreClay = { scale: 3.0, threshold: 0.1, seedSalt: 303, shallowDepth: 2 };
