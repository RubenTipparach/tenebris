import { ItemType } from '../player/Inventory';

/**
 * Each planet's fish (no species on two planets): what a line can land
 * there. Values are Pale Blue Dot's catalogue (assets/config/fauna.ron).
 * The fishing mini-game (src/player/Fishing.ts) and cooking's "any fish"
 * (src/config/CookingConfig.ts) both read this one table.
 */
export interface FishSpecies {
  item: ItemType;
  name: string;
  lengthM: number;     // typical length
  minDepth: number;    // water depth (blocks) at the float it needs
  bite: number;        // eagerness to bite (and roll weight)
  pull: number;        // how hard it runs when hooked
  strength: number;    // 1-5, shrinks the hook window
}

export const FISH_ROSTERS: Record<string, FishSpecies[]> = {
  earth: [
    { item: ItemType.FISH_MINNOW, name: 'Minnow', lengthM: 0.14, minDepth: 1, bite: 0.6, pull: 0.4, strength: 1 },
    { item: ItemType.FISH_SILVERFIN, name: 'Silverfin', lengthM: 0.22, minDepth: 1, bite: 0.55, pull: 0.55, strength: 1 },
    { item: ItemType.FISH_PERCH, name: 'Banded perch', lengthM: 0.38, minDepth: 1, bite: 0.4, pull: 0.85, strength: 2 },
    { item: ItemType.FISH_RAY, name: 'Ray', lengthM: 0.6, minDepth: 2, bite: 0.35, pull: 0.9, strength: 2 },
    { item: ItemType.FISH_EEL, name: 'Eel', lengthM: 0.9, minDepth: 2, bite: 0.3, pull: 1.1, strength: 3 },
    { item: ItemType.FISH_REEF, name: 'Reef fish', lengthM: 0.42, minDepth: 1, bite: 0.25, pull: 1.2, strength: 5 },
  ],
  sequoia: [
    { item: ItemType.FISH_DEEPBACK, name: 'Deepback', lengthM: 0.7, minDepth: 2, bite: 0.22, pull: 1.35, strength: 4 },
    { item: ItemType.FISH_SERPENT, name: 'Sea serpent', lengthM: 1.3, minDepth: 3, bite: 0.12, pull: 1.45, strength: 4 },
  ],
};


/** Every fish a line can land, on any planet. */
export const FISH_ITEMS: ReadonlySet<ItemType> = new Set(Object.values(FISH_ROSTERS).flat().map(f => f.item));
