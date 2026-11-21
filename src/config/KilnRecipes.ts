import { ItemType } from '../player/Inventory';

/**
 * What the kiln fires (industry-and-nuclear cooking, task group 3). Kept here,
 * free of rendering, so the kiln manager and the mission tree's test read the
 * same rows. A row takes every input in `inputs` for one batch.
 *
 * Cement is the building-materials chain's (task 8.2): clay burnt with stone
 * (limestone stands in) gives the binder that concrete is mixed from.
 */
export interface KilnRecipe {
  inputs: { itemType: ItemType; quantity: number }[];
  output: ItemType;
  outputQuantity: number;
}

export const KILN_RECIPES: KilnRecipe[] = [
  {
    inputs: [
      { itemType: ItemType.CLAY, quantity: 1 },
      { itemType: ItemType.STONE, quantity: 1 },
    ],
    output: ItemType.CEMENT,
    outputQuantity: 1,
  },
];
