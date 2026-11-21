// Shared block type definitions and helpers
// This module is used by both main thread and web workers

export enum HexBlockType {
  AIR = 0,
  STONE = 1,
  DIRT = 2,
  GRASS = 3,
  WATER = 4,
  SAND = 5,
  WOOD = 6,
  LEAVES = 7,
  // Mineral ores (underground)
  ORE_COAL = 8,
  ORE_COPPER = 9,
  ORE_IRON = 10,
  ORE_GOLD = 11,
  ORE_LITHIUM = 12,
  ORE_ALUMINUM = 13,
  ORE_COBALT = 14,
  // Snow biome blocks
  SNOW = 15,
  DIRT_SNOW = 16,  // Dirt with snow on top
  ICE = 17,
  // Technology blocks
  FURNACE = 18,
  // Glass (transparent like ice)
  GLASS = 19,
  // Advanced technology blocks
  COMPUTER = 20,
  PRINTER_3D = 21,
  // Moon terrain block
  MOON_ROCK = 22,
  // Sequoia's native terrain. Its own block IDs, so Sequoia ground looks the
  // same wherever it is placed, and Earth grass placed on Sequoia stays
  // Earth grass (they used to share GRASS/DIRT/SAND/SNOW and swap texture
  // with the planet).
  SEQ_GRASS = 23,
  SEQ_DIRT = 24,
  SEQ_SAND = 25,
  SEQ_SNOW = 26,
  // Biome surfaces (a biome's own ground; like grass they drop their soil
  // when mined). Earth: birch forest floor, savanna. Sequoia: tree-fern
  // scrub (its beige ground with dry olive grass), redwood needle duff.
  FOREST_FLOOR = 27,
  DRY_GRASS = 28,
  SEQ_SCRUB = 29,
  SEQ_DUFF = 30,
  // The Moon's minerals, in moon rock (they drop the ordinary ore items)
  MOON_ORE_IRON = 31,
  MOON_ORE_ALUMINUM = 32,
  MOON_ORE_COBALT = 33,
  MOON_ORE_LITHIUM = 34,
  // The moons' and asteroids' crusts (ids 70-89 are this family's).
  // Volcanic: basalt cones, molten magma in the craters, cracked lava rock
  // round them, sulfur crust on the upper slopes. Icy: a frost crust over
  // glacier ice, blue ice where it breaks out on the slopes. Metal-rich:
  // meteoric iron at the surface.
  BASALT = 70,
  MAGMA = 71,
  LAVA_ROCK = 72,
  FROST = 73,
  BLUE_ICE = 74,
  IRON_NICKEL = 75,
  SULFUR = 76
}

// The Earth block a native planet variant behaves like (LOD colouring,
// footstep sounds, surface classification). Identity for everything else.
const BASE_TERRAIN_TYPE: Partial<Record<number, HexBlockType>> = {
  [HexBlockType.SEQ_GRASS]: HexBlockType.GRASS,
  [HexBlockType.SEQ_DIRT]: HexBlockType.DIRT,
  [HexBlockType.SEQ_SAND]: HexBlockType.SAND,
  [HexBlockType.SEQ_SNOW]: HexBlockType.SNOW,
  [HexBlockType.FOREST_FLOOR]: HexBlockType.DIRT,
  [HexBlockType.DRY_GRASS]: HexBlockType.GRASS,
  [HexBlockType.SEQ_SCRUB]: HexBlockType.GRASS,
  [HexBlockType.SEQ_DUFF]: HexBlockType.DIRT,
  [HexBlockType.MOON_ORE_IRON]: HexBlockType.MOON_ROCK,
  [HexBlockType.MOON_ORE_ALUMINUM]: HexBlockType.MOON_ROCK,
  [HexBlockType.MOON_ORE_COBALT]: HexBlockType.MOON_ROCK,
  [HexBlockType.MOON_ORE_LITHIUM]: HexBlockType.MOON_ROCK,
  [HexBlockType.BASALT]: HexBlockType.MOON_ROCK,
  [HexBlockType.MAGMA]: HexBlockType.MOON_ROCK,
  [HexBlockType.LAVA_ROCK]: HexBlockType.MOON_ROCK,
  [HexBlockType.SULFUR]: HexBlockType.MOON_ROCK,
  [HexBlockType.IRON_NICKEL]: HexBlockType.MOON_ROCK,
  [HexBlockType.FROST]: HexBlockType.SNOW,
  [HexBlockType.BLUE_ICE]: HexBlockType.SNOW,
};
export function baseTerrainType(blockType: HexBlockType | number): HexBlockType {
  return BASE_TERRAIN_TYPE[blockType] ?? (blockType as HexBlockType);
}

// Which material each face of a block uses. One table for every mesher (the
// worker, the main-thread chunk builder, the legacy batch builder); a new
// block type is one row here plus its texture in HexBlockMeshBuilder.
export interface BlockFaces { top: string; side: string; bottom: string; }
const sameFaces = (key: string): BlockFaces => ({ top: key, side: key, bottom: key });
const BLOCK_FACES: Partial<Record<number, BlockFaces>> = {
  [HexBlockType.GRASS]: { top: 'top', side: 'grassSide', bottom: 'side' },
  [HexBlockType.DIRT]: sameFaces('side'),
  [HexBlockType.STONE]: sameFaces('stone'),
  [HexBlockType.SAND]: sameFaces('sand'),
  [HexBlockType.WOOD]: sameFaces('wood'),
  [HexBlockType.ORE_COAL]: sameFaces('oreCoal'),
  [HexBlockType.ORE_COPPER]: sameFaces('oreCopper'),
  [HexBlockType.ORE_IRON]: sameFaces('oreIron'),
  [HexBlockType.ORE_GOLD]: sameFaces('oreGold'),
  [HexBlockType.ORE_LITHIUM]: sameFaces('oreLithium'),
  [HexBlockType.ORE_ALUMINUM]: sameFaces('oreAluminum'),
  [HexBlockType.ORE_COBALT]: sameFaces('oreCobalt'),
  [HexBlockType.SNOW]: { top: 'snow', side: 'snowSide', bottom: 'dirtSnow' },
  [HexBlockType.DIRT_SNOW]: sameFaces('dirtSnow'),
  [HexBlockType.ICE]: sameFaces('ice'),
  [HexBlockType.GLASS]: sameFaces('glass'),
  [HexBlockType.MOON_ROCK]: sameFaces('moonRock'),
  [HexBlockType.SEQ_GRASS]: { top: 'seqGrass', side: 'seqGrassSide', bottom: 'seqDirt' },
  [HexBlockType.SEQ_DIRT]: sameFaces('seqDirt'),
  [HexBlockType.SEQ_SAND]: sameFaces('seqSand'),
  [HexBlockType.SEQ_SNOW]: { top: 'seqSnow', side: 'seqSnowSide', bottom: 'seqSnowSide' },
  [HexBlockType.FOREST_FLOOR]: { top: 'forestFloor', side: 'forestFloorSide', bottom: 'side' },
  [HexBlockType.DRY_GRASS]: { top: 'dryGrass', side: 'dryGrassSide', bottom: 'side' },
  [HexBlockType.SEQ_SCRUB]: { top: 'seqScrub', side: 'seqScrubSide', bottom: 'seqDirt' },
  [HexBlockType.SEQ_DUFF]: { top: 'seqDuff', side: 'seqDuffSide', bottom: 'seqDirt' },
  [HexBlockType.MOON_ORE_IRON]: sameFaces('moonOreIron'),
  [HexBlockType.MOON_ORE_ALUMINUM]: sameFaces('moonOreAluminum'),
  [HexBlockType.MOON_ORE_COBALT]: sameFaces('moonOreCobalt'),
  [HexBlockType.MOON_ORE_LITHIUM]: sameFaces('moonOreLithium'),
  [HexBlockType.BASALT]: { top: 'basalt', side: 'basaltSide', bottom: 'basalt' },
  [HexBlockType.MAGMA]: sameFaces('magma'),
  [HexBlockType.LAVA_ROCK]: { top: 'lavaRock', side: 'lavaRockSide', bottom: 'basalt' },
  [HexBlockType.FROST]: { top: 'frost', side: 'frostSide', bottom: 'blueIce' },
  [HexBlockType.BLUE_ICE]: sameFaces('blueIce'),
  [HexBlockType.IRON_NICKEL]: sameFaces('ironNickel'),
  [HexBlockType.SULFUR]: { top: 'sulfur', side: 'sulfurSide', bottom: 'basalt' },
};
const DEFAULT_FACES = sameFaces('top');
export function blockFaces(blockType: HexBlockType | number): BlockFaces {
  return BLOCK_FACES[blockType] ?? DEFAULT_FACES;
}

// Draw order for transparent materials (opaque ones default to 0)
export const MATERIAL_RENDER_ORDER: Record<string, number> = { water: 1, ice: 2, glass: 3 };

// Key of a material's buffer in mesher output: 'top' -> 'topData'
export const bufferKey = (materialKey: string): string => `${materialKey}Data`;

export function isSolid(blockType: HexBlockType | number): boolean {
  return blockType !== HexBlockType.AIR && blockType !== HexBlockType.WATER;
}

export function isLiquid(blockType: HexBlockType | number): boolean {
  return blockType === HexBlockType.WATER;
}

export function isTransparent(blockType: HexBlockType | number): boolean {
  return blockType === HexBlockType.AIR || blockType === HexBlockType.WATER || blockType === HexBlockType.ICE || blockType === HexBlockType.GLASS;
}

export function isSemiTransparent(blockType: HexBlockType | number): boolean {
  return blockType === HexBlockType.ICE || blockType === HexBlockType.GLASS;
}
