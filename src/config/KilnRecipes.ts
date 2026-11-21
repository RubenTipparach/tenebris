import { ItemType } from '../player/Inventory';
import { COOKERS } from './CookingConfig';

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

// The kiln's recipes live in one place, the kiln station's own list
// (CookingConfig COOKERS.kiln); this view of them is derived, never a
// second copy to keep in step.
export const KILN_RECIPES: KilnRecipe[] = COOKERS.kiln.recipes
  .filter(r => r.inputs.every(i => i !== 'fish'))
  .map(r => ({
    inputs: (r.inputs as ItemType[]).map(itemType => ({ itemType, quantity: 1 })),
    output: r.output,
    outputQuantity: 1,
  }));
