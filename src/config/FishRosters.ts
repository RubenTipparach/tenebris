import { ItemType } from '../player/Inventory';

/**
 * Each planet's fish (no species on two planets): what a line can land
 * there, and - the same entries, one roster - what swims there. Values for
 * Earth and Sequoia are Pale Blue Dot's catalogue (assets/config/fauna.ron);
 * the jungle moons' fish are this game's own (openspec ocean-life).
 * The fishing mini-game (src/player/Fishing.ts), cooking's "any fish"
 * (src/config/CookingConfig.ts) and the swimming schools (the fauna entries
 * FaunaConfig.ts derives from this table) all read this one table.
 */
export interface FishLook {
  /** Body plan of the swimming model (src/planet/FaunaModels.ts buildFishModel). */
  shape: 'fish' | 'eel' | 'ray';
  /** Colours, picked from the fish's icon (public/textures/fish/). */
  body: number;
  back: number;
  belly: number;
  fin: number;
  /** Bands across the body (perch, gar), omitted = none. */
  bands?: number;
  /** A stripe along the flank (tetra), omitted = none. */
  stripe?: number;
  /** Body height / length (fish shape only; omitted = FISH_FAUNA.height). */
  height?: number;
  /** Whiskers (catfish). */
  barbels?: boolean;
  /** School size, [min, max] (omitted = FISH_FAUNA.school). */
  school?: [number, number];
}

export interface FishSpecies {
  item: ItemType;
  name: string;
  lengthM: number;     // typical length
  minDepth: number;    // water depth (blocks) at the float it needs
  bite: number;        // eagerness to bite (and roll weight)
  pull: number;        // how hard it runs when hooked
  strength: number;    // 1-5, shrinks the hook window
  look: FishLook;
}

export const FISH_ROSTERS: Record<string, FishSpecies[]> = {
  earth: [
    { item: ItemType.FISH_MINNOW, name: 'Minnow', lengthM: 0.14, minDepth: 1, bite: 0.6, pull: 0.4, strength: 1,
      look: { shape: 'fish', body: 0x7896b4, back: 0x54697e, belly: 0xbcd0e4, fin: 0x54697e, school: [6, 10] } },
    { item: ItemType.FISH_SILVERFIN, name: 'Silverfin', lengthM: 0.22, minDepth: 1, bite: 0.55, pull: 0.55, strength: 1,
      look: { shape: 'fish', body: 0xcfe3ea, back: 0x9fb9c2, belly: 0xeef6f8, fin: 0x9fb9c2, height: 0.26, school: [5, 9] } },
    { item: ItemType.FISH_PERCH, name: 'Banded perch', lengthM: 0.38, minDepth: 1, bite: 0.4, pull: 0.85, strength: 2,
      look: { shape: 'fish', body: 0xd8a13a, back: 0x8a6420, belly: 0xe8c878, fin: 0xc8612b, bands: 0x6b4a18, height: 0.4, school: [3, 5] } },
    { item: ItemType.FISH_RAY, name: 'Ray', lengthM: 0.6, minDepth: 2, bite: 0.35, pull: 0.9, strength: 2,
      look: { shape: 'ray', body: 0xb9a57d, back: 0x8c7a58, belly: 0xe0d4b8, fin: 0x8c7a58, school: [1, 2] } },
    { item: ItemType.FISH_EEL, name: 'Eel', lengthM: 0.9, minDepth: 2, bite: 0.3, pull: 1.1, strength: 3,
      look: { shape: 'eel', body: 0x788248, back: 0x4c562e, belly: 0xa8ae78, fin: 0x4c562e, school: [1, 2] } },
    { item: ItemType.FISH_REEF, name: 'Reef fish', lengthM: 0.42, minDepth: 1, bite: 0.25, pull: 1.2, strength: 5,
      look: { shape: 'fish', body: 0x3c9696, back: 0x246064, belly: 0x96d6d6, fin: 0x246064, height: 0.55, school: [2, 4] } },
  ],
  sequoia: [
    { item: ItemType.FISH_DEEPBACK, name: 'Deepback', lengthM: 0.7, minDepth: 2, bite: 0.22, pull: 1.35, strength: 4,
      look: { shape: 'fish', body: 0x4f6f8f, back: 0x3a5470, belly: 0x9fb6c9, fin: 0x4f6f8f, height: 0.42, school: [2, 4] } },
    { item: ItemType.FISH_SERPENT, name: 'Sea serpent', lengthM: 1.3, minDepth: 3, bite: 0.12, pull: 1.45, strength: 4,
      look: { shape: 'eel', body: 0x307866, back: 0x1e5042, belly: 0xb6d0b2, fin: 0x1e5042, school: [1, 1] } },
    // A small silver schooling fish with a blue back (openspec underwater-life)
    { item: ItemType.FISH_SPRAT, name: 'Glimmer sprat', lengthM: 0.12, minDepth: 1, bite: 0.6, pull: 0.35, strength: 1,
      look: { shape: 'fish', body: 0xc2c3c7, back: 0x29adff, belly: 0xfff1e8, fin: 0x29adff, stripe: 0x1d2b53, height: 0.28, school: [8, 12] } },
  ],
  // Verdance: emerald river water, red laterite banks
  verdance: [
    { item: ItemType.FISH_TETRA, name: 'Emerald tetra', lengthM: 0.1, minDepth: 1, bite: 0.6, pull: 0.35, strength: 1,
      look: { shape: 'fish', body: 0x008751, back: 0x1d2b53, belly: 0x00e436, fin: 0xffa300, stripe: 0xffec27, height: 0.32, school: [7, 11] } },
    { item: ItemType.FISH_CATFISH, name: 'Laterite catfish', lengthM: 0.55, minDepth: 2, bite: 0.35, pull: 1.0, strength: 3,
      look: { shape: 'fish', body: 0xab5236, back: 0x7e2553, belly: 0xffccaa, fin: 0x5f574f, height: 0.24, barbels: true, school: [1, 2] } },
    { item: ItemType.FISH_LEAFPIKE, name: 'Leaf pike', lengthM: 0.8, minDepth: 2, bite: 0.25, pull: 1.25, strength: 4,
      look: { shape: 'fish', body: 0x00e436, back: 0x008751, belly: 0xfff1e8, fin: 0xffa300, height: 0.18, school: [1, 2] } },
  ],
  // Mirewood: black peat water, violet rock
  mirewood: [
    { item: ItemType.FISH_PEATEEL, name: 'Peat eel', lengthM: 1.0, minDepth: 2, bite: 0.3, pull: 1.15, strength: 3,
      look: { shape: 'eel', body: 0x5f574f, back: 0x1d2b53, belly: 0xc2c3c7, fin: 0x83769c, school: [1, 2] } },
    { item: ItemType.FISH_GOURAMI, name: 'Mire gourami', lengthM: 0.3, minDepth: 1, bite: 0.55, pull: 0.6, strength: 2,
      look: { shape: 'fish', body: 0x29adff, back: 0x1d2b53, belly: 0xc2c3c7, fin: 0x00e436, height: 0.5, school: [4, 7] } },
    { item: ItemType.FISH_GAR, name: 'Violet gar', lengthM: 1.1, minDepth: 3, bite: 0.15, pull: 1.4, strength: 4,
      look: { shape: 'fish', body: 0x83769c, back: 0x7e2553, belly: 0xfff1e8, fin: 0xff77a8, bands: 0x7e2553, height: 0.15, school: [1, 2] } },
  ],
};


/** Every fish a line can land, on any planet. */
export const FISH_ITEMS: ReadonlySet<ItemType> = new Set(Object.values(FISH_ROSTERS).flat().map(f => f.item));
