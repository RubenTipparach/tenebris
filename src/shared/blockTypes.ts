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
  PRINTER_3D = 21
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
