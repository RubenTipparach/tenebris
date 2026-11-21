import { ItemType } from '../player/Inventory';

/**
 * What the furnaces smelt (src/planet/Furnace.ts, ElectricFurnace.ts): kept
 * here, free of rendering, so the mission tree's test can read them.
 */

export interface SmeltingRecipe {
  input: ItemType;
  output: ItemType;
  outputQuantity: number;
}

export const SMELTING_RECIPES: SmeltingRecipe[] = [
  { input: ItemType.ORE_COPPER, output: ItemType.INGOT_COPPER, outputQuantity: 1 },
  { input: ItemType.ORE_IRON, output: ItemType.INGOT_IRON, outputQuantity: 1 },
  { input: ItemType.ORE_GOLD, output: ItemType.INGOT_GOLD, outputQuantity: 1 },
  { input: ItemType.ORE_ALUMINUM, output: ItemType.INGOT_ALUMINUM, outputQuantity: 1 },
  { input: ItemType.ORE_TITANIUM, output: ItemType.INGOT_TITANIUM, outputQuantity: 1 },  // the Moon's
  { input: ItemType.CLAY, output: ItemType.BRICK, outputQuantity: 1 },                   // fired clay
  // Note: Lithium and Cobalt require electrical furnace (not implemented yet)
];

/**
 * What burns in the furnace, and for how long: `smelts` is how many items
 * one unit smelts. `returns` is the container given back (a lava bucket
 * leaves its empty bucket). The one table every furnace fuel path reads.
 */
export interface FurnaceFuel {
  itemType: ItemType;
  smelts: number;
  returns?: ItemType;
}

export const FURNACE_FUELS: FurnaceFuel[] = [
  { itemType: ItemType.COAL, smelts: 8 },
  { itemType: ItemType.LAVA_BUCKET, smelts: 12, returns: ItemType.BUCKET },
];

export function furnaceFuel(itemType: ItemType): FurnaceFuel | undefined {
  return FURNACE_FUELS.find(f => f.itemType === itemType);
}

/** Coal's worth of smelts: the unit the furnace's fuel gauge counts in */
export const SMELTS_PER_COAL = furnaceFuel(ItemType.COAL)!.smelts;

export interface ElectricSmeltingRecipe {
  input: ItemType;
  output: ItemType;
  outputQuantity: number;
}

export const ELECTRIC_SMELTING_RECIPES: ElectricSmeltingRecipe[] = [
  // Advanced ores that require electric furnace
  { input: ItemType.ORE_LITHIUM, output: ItemType.INGOT_LITHIUM, outputQuantity: 2 },
  { input: ItemType.ORE_COBALT, output: ItemType.INGOT_COBALT, outputQuantity: 2 },
  // Can also smelt all other ores (5x faster than regular furnace, no fuel needed, double yield)
  { input: ItemType.ORE_COPPER, output: ItemType.INGOT_COPPER, outputQuantity: 2 },
  { input: ItemType.ORE_IRON, output: ItemType.INGOT_IRON, outputQuantity: 2 },
  { input: ItemType.ORE_GOLD, output: ItemType.INGOT_GOLD, outputQuantity: 2 },
  { input: ItemType.ORE_ALUMINUM, output: ItemType.INGOT_ALUMINUM, outputQuantity: 2 },
  { input: ItemType.ORE_TITANIUM, output: ItemType.INGOT_TITANIUM, outputQuantity: 2 },
];
