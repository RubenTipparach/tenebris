import { ItemType } from '../player/Inventory';

/**
 * Cooking (openspec industry-and-nuclear, cooking; design decision 2): the
 * three stations, what each cooks, and what eating a dish gives.
 */

export type CookerKind = 'campfire' | 'kiln' | 'oven';

/** An ingredient: an item, or 'fish' for any fish a line can land. */
export type Ingredient = ItemType | 'fish';

export interface CookingRecipe {
  inputs: Ingredient[];          // one of each, from the input slots
  output: ItemType;
  returns?: ItemType;            // given back beside the output (the bucket)
  timeS: number;                 // seconds to cook
}

/** A station's slots: INPUTS input slots, then the output, then the returned item. */
export const COOKER_SLOTS = { INPUTS: 3, OUTPUT: 3, RETURN: 4, COUNT: 5 } as const;

export const COOKERS: Record<CookerKind, {
  item: ItemType;                // the placeable item
  title: string;                 // the panel's title
  atlas?: string;                // 48x32 face atlas (front, side, top, bottom), like the furnace
  face: string;                  // its single face texture (the campfire is drawn from this alone)
  width: number;                 // m
  height: number;                // m
  recipes: CookingRecipe[];      // tried with the most ingredients first
}> = {
  campfire: {
    item: ItemType.CAMPFIRE,
    title: 'Campfire',
    face: '/textures/technology/campfire_face.png',
    width: 0.8,
    height: 0.4,
    recipes: [
      { inputs: ['fish'], output: ItemType.COOKED_FISH, timeS: 6 },
    ],
  },
  kiln: {
    item: ItemType.KILN,
    title: 'Kiln',
    atlas: '/textures/technology/kiln.png',
    face: '/textures/technology/kiln_face.png',
    width: 0.8,
    height: 0.8,
    recipes: [
      { inputs: [ItemType.CLAY], output: ItemType.CLAY_POT, timeS: 8 },
    ],
  },
  oven: {
    item: ItemType.OVEN,
    title: 'Oven',
    atlas: '/textures/technology/oven.png',
    face: '/textures/technology/oven_face.png',
    width: 0.8,
    height: 0.8,
    recipes: [
      { inputs: ['fish', ItemType.WATER_BUCKET, ItemType.CLAY_POT], output: ItemType.FISH_STEW, returns: ItemType.BUCKET, timeS: 10 },
      { inputs: ['fish'], output: ItemType.COOKED_FISH, timeS: 4 },
    ],
  },
};

/** Which station a placeable item is, if any. */
export function cookerKindOf(item: ItemType): CookerKind | null {
  for (const [kind, c] of Object.entries(COOKERS)) if (c.item === item) return kind as CookerKind;
  return null;
}

/**
 * Eating a dish: the "well fed" bonus it gives. Strength scales mining time
 * and jetpack drain by (1 - strength); eating again restarts the timer.
 */
export const FOOD: Partial<Record<ItemType, { strength: number; durationS: number }>> = {
  [ItemType.COOKED_FISH]: { strength: 0.15, durationS: 3 * 60 },
  [ItemType.FISH_STEW]: { strength: 0.3, durationS: 8 * 60 },
};

export const FOOD_CONFIG = {
  // How often (s) the time left is written to the save while fed
  SAVE_EVERY_S: 5,
} as const;
