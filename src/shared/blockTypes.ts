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
  // The ecumenopolis (a planet that is all city, src/shared/cityGen.ts)
  CITY_ROAD = 35,
  CITY_SIDEWALK = 36,
  CITY_PLAZA = 37,
  CITY_FACADE = 38,      // concrete wall with windows
  CITY_GLASS = 39,       // downtown tower curtain wall (opaque)
  CITY_ROOF = 40,
  CITY_NEON = 41,        // neon band: tower crowns, storefronts
  CITY_METAL = 42,       // industrial sheds
  CITY_PARK = 43,
  CITY_FOUNDATION = 44,  // the undercity below street level
  // The living alien worlds' biome grounds (ids 45-69 are theirs). Each is
  // its own drawn block; mined, they drop the planet's rock like grass drops
  // dirt. Cinder: ember moss, ash plains, sulfur flats.
  CINDER_EMBERMOSS = 45,
  CINDER_ASH = 46,
  CINDER_SULFUR = 47,
  // Vesper: rose clay pans, rippled dunes, salt flats
  VESPER_CLAY = 48,
  VESPER_DUNE = 49,
  VESPER_SALT = 50,
  // Halcyon: verdigris moss, amethyst geode gravel, mint glass sand
  HALCYON_MOSS = 51,
  HALCYON_GEODE = 52,
  HALCYON_GLASS = 53,
  // Tessaly: lilac snow moss, frost crust, blue glaze
  TESSALY_SNOWMOSS = 54,
  TESSALY_FROST = 55,
  TESSALY_GLAZE = 56,
  // Umbra: glowing indigo moss, violet mycelium mat, black shale
  UMBRA_MOSS = 57,
  UMBRA_MYCEL = 58,
  UMBRA_SHALE = 59,
  // The jungle moons. Verdance: deep jungle floor, mangrove swamp, river
  // bank, its red soil and its mossy green rock
  VERD_JUNGLE = 60,
  VERD_SWAMP = 61,
  VERD_BANK = 62,
  VERD_SOIL = 63,
  VERD_ROCK = 64,
  // Mirewood: blue-green jungle floor, black peat swamp, river bank, its
  // dark soil and its banded rock
  MIRE_JUNGLE = 65,
  MIRE_SWAMP = 66,
  MIRE_BANK = 67,
  MIRE_SOIL = 68,
  MIRE_ROCK = 69,
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
  SULFUR = 76,
  // The Moon's titanium (ilmenite) - found on no other body. Numbered past
  // the crust family; drops Titanium Ore
  MOON_ORE_TITANIUM = 90
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
  // City blocks: which LOD buffer they draw in (the city tileset gives
  // those buffers city textures: stone = roof, sand = road, dirt =
  // sidewalk, snow = plaza, grass = park)
  [HexBlockType.CITY_ROAD]: HexBlockType.SAND,
  [HexBlockType.CITY_SIDEWALK]: HexBlockType.DIRT,
  [HexBlockType.CITY_PLAZA]: HexBlockType.SNOW,
  [HexBlockType.CITY_PARK]: HexBlockType.GRASS,
  [HexBlockType.CITY_FACADE]: HexBlockType.STONE,
  [HexBlockType.CITY_GLASS]: HexBlockType.STONE,
  [HexBlockType.CITY_ROOF]: HexBlockType.STONE,
  [HexBlockType.CITY_NEON]: HexBlockType.STONE,
  [HexBlockType.CITY_METAL]: HexBlockType.STONE,
  [HexBlockType.CITY_FOUNDATION]: HexBlockType.STONE,
  // Alien biome grounds: each planet's three grounds behave like GRASS,
  // SAND and SNOW, so its distant LOD can wear them (its tileset's grass /
  // sand / snow are those grounds' textures) and footsteps sound right
  [HexBlockType.CINDER_EMBERMOSS]: HexBlockType.GRASS,
  [HexBlockType.CINDER_ASH]: HexBlockType.SAND,
  [HexBlockType.CINDER_SULFUR]: HexBlockType.SNOW,
  [HexBlockType.VESPER_CLAY]: HexBlockType.GRASS,
  [HexBlockType.VESPER_DUNE]: HexBlockType.SAND,
  [HexBlockType.VESPER_SALT]: HexBlockType.SNOW,
  [HexBlockType.HALCYON_MOSS]: HexBlockType.GRASS,
  [HexBlockType.HALCYON_GEODE]: HexBlockType.SAND,
  [HexBlockType.HALCYON_GLASS]: HexBlockType.SNOW,
  [HexBlockType.TESSALY_SNOWMOSS]: HexBlockType.GRASS,
  [HexBlockType.TESSALY_GLAZE]: HexBlockType.SAND,
  [HexBlockType.TESSALY_FROST]: HexBlockType.SNOW,
  [HexBlockType.UMBRA_MOSS]: HexBlockType.GRASS,
  [HexBlockType.UMBRA_SHALE]: HexBlockType.SAND,
  [HexBlockType.UMBRA_MYCEL]: HexBlockType.SNOW,
  // Jungle moons: ordinary grass / dirt / sand / stone roles, so their
  // tileset's textures (these blocks' own) dress their distant LOD
  [HexBlockType.VERD_JUNGLE]: HexBlockType.GRASS,
  [HexBlockType.VERD_SWAMP]: HexBlockType.SNOW,
  [HexBlockType.VERD_BANK]: HexBlockType.SAND,
  [HexBlockType.VERD_SOIL]: HexBlockType.DIRT,
  [HexBlockType.VERD_ROCK]: HexBlockType.STONE,
  [HexBlockType.MIRE_JUNGLE]: HexBlockType.GRASS,
  [HexBlockType.MIRE_SWAMP]: HexBlockType.SNOW,
  [HexBlockType.MIRE_BANK]: HexBlockType.SAND,
  [HexBlockType.MIRE_SOIL]: HexBlockType.DIRT,
  [HexBlockType.MIRE_ROCK]: HexBlockType.STONE,
  [HexBlockType.BASALT]: HexBlockType.MOON_ROCK,
  [HexBlockType.MAGMA]: HexBlockType.MOON_ROCK,
  [HexBlockType.LAVA_ROCK]: HexBlockType.MOON_ROCK,
  [HexBlockType.SULFUR]: HexBlockType.MOON_ROCK,
  [HexBlockType.IRON_NICKEL]: HexBlockType.MOON_ROCK,
  [HexBlockType.MOON_ORE_TITANIUM]: HexBlockType.MOON_ROCK,
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
  [HexBlockType.MOON_ORE_TITANIUM]: sameFaces('moonOreTitanium'),
  [HexBlockType.CITY_ROAD]: { top: 'cityRoad', side: 'cityFoundation', bottom: 'cityFoundation' },
  [HexBlockType.CITY_SIDEWALK]: { top: 'citySidewalk', side: 'cityCurb', bottom: 'cityFoundation' },
  [HexBlockType.CITY_PLAZA]: { top: 'cityPlaza', side: 'cityCurb', bottom: 'cityFoundation' },
  [HexBlockType.CITY_FACADE]: { top: 'citySlab', side: 'cityFacade', bottom: 'citySlab' },
  [HexBlockType.CITY_GLASS]: { top: 'citySlab', side: 'cityGlass', bottom: 'citySlab' },
  [HexBlockType.CITY_ROOF]: { top: 'cityRoof', side: 'cityParapet', bottom: 'citySlab' },
  [HexBlockType.CITY_NEON]: { top: 'cityDeck', side: 'cityNeon', bottom: 'cityDeck' },
  [HexBlockType.CITY_METAL]: { top: 'cityDeck', side: 'cityMetal', bottom: 'cityDeck' },
  [HexBlockType.CITY_PARK]: { top: 'cityPark', side: 'cityParkSide', bottom: 'cityFoundation' },
  [HexBlockType.CITY_FOUNDATION]: sameFaces('cityFoundation'),
  // Alien biome grounds: their own top, a side of the planet's rock under a
  // lip of the top, and the planet's rock underneath (moonRock = the
  // planet's own rock texture on a single-texture world)
  [HexBlockType.CINDER_EMBERMOSS]: { top: 'cinderEmbermoss', side: 'cinderEmbermossSide', bottom: 'moonRock' },
  [HexBlockType.CINDER_ASH]: { top: 'cinderAsh', side: 'cinderAshSide', bottom: 'moonRock' },
  [HexBlockType.CINDER_SULFUR]: { top: 'cinderSulfur', side: 'cinderSulfurSide', bottom: 'moonRock' },
  [HexBlockType.VESPER_CLAY]: { top: 'vesperClay', side: 'vesperClaySide', bottom: 'moonRock' },
  [HexBlockType.VESPER_DUNE]: { top: 'vesperDune', side: 'vesperDuneSide', bottom: 'moonRock' },
  [HexBlockType.VESPER_SALT]: { top: 'vesperSalt', side: 'vesperSaltSide', bottom: 'moonRock' },
  [HexBlockType.HALCYON_MOSS]: { top: 'halcyonMoss', side: 'halcyonMossSide', bottom: 'moonRock' },
  [HexBlockType.HALCYON_GEODE]: { top: 'halcyonGeode', side: 'halcyonGeodeSide', bottom: 'moonRock' },
  [HexBlockType.HALCYON_GLASS]: { top: 'halcyonGlass', side: 'halcyonGlassSide', bottom: 'moonRock' },
  [HexBlockType.TESSALY_SNOWMOSS]: { top: 'tessalySnowmoss', side: 'tessalySnowmossSide', bottom: 'moonRock' },
  [HexBlockType.TESSALY_FROST]: { top: 'tessalyFrost', side: 'tessalyFrostSide', bottom: 'moonRock' },
  [HexBlockType.TESSALY_GLAZE]: { top: 'tessalyGlaze', side: 'tessalyGlazeSide', bottom: 'moonRock' },
  [HexBlockType.UMBRA_MOSS]: { top: 'umbraMoss', side: 'umbraMossSide', bottom: 'moonRock' },
  [HexBlockType.UMBRA_MYCEL]: { top: 'umbraMycel', side: 'umbraMycelSide', bottom: 'moonRock' },
  [HexBlockType.UMBRA_SHALE]: { top: 'umbraShale', side: 'umbraShaleSide', bottom: 'moonRock' },
  [HexBlockType.VERD_JUNGLE]: { top: 'verdJungle', side: 'verdJungleSide', bottom: 'verdSoil' },
  [HexBlockType.VERD_SWAMP]: { top: 'verdSwamp', side: 'verdSwampSide', bottom: 'verdSoil' },
  [HexBlockType.VERD_BANK]: sameFaces('verdBank'),
  [HexBlockType.VERD_SOIL]: sameFaces('verdSoil'),
  [HexBlockType.VERD_ROCK]: sameFaces('verdRock'),
  [HexBlockType.MIRE_JUNGLE]: { top: 'mireJungle', side: 'mireJungleSide', bottom: 'mireSoil' },
  [HexBlockType.MIRE_SWAMP]: { top: 'mireSwamp', side: 'mireSwampSide', bottom: 'mireSoil' },
  [HexBlockType.MIRE_BANK]: sameFaces('mireBank'),
  [HexBlockType.MIRE_SOIL]: sameFaces('mireSoil'),
  [HexBlockType.MIRE_ROCK]: sameFaces('mireRock'),
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

/**
 * Does a side face of `self` show against `other` (the block across that
 * face, undefined when unknown)? Against air always, water unless self is
 * water. Ice and glass show only against air / water - a face touching any
 * other block is dropped, or two coplanar faces z-fight through the
 * translucency. A solid block shows through ice or glass beside it.
 */
export function sideFaceShows(self: number, other: number | undefined): boolean {
  if (other === undefined || other === HexBlockType.AIR) return true;
  if (other === HexBlockType.WATER) return self !== HexBlockType.WATER;
  if (self === HexBlockType.ICE || self === HexBlockType.GLASS || self === HexBlockType.WATER) return false;
  return other === HexBlockType.ICE || other === HexBlockType.GLASS;
}

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
