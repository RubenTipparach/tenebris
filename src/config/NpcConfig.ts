import { ItemType } from '../player/Inventory';

/**
 * NPCs (openspec friendship-npcs, design decisions 1 and 4): who lives on
 * which world, their species, their villages, each world's art piece and
 * friendship rewards, the travelling traders, and every tunable the shared
 * rules module (src/shared/npc) runs on.
 *
 * ONE source of truth: the client imports this directly, and the multiplayer
 * server gets it inside the generated bundle server-js/npc-core.js
 * (scripts/gen-npc-core.ts; scripts/npc-core.test.ts fails on drift). So this
 * file must stay pure: no three.js, no DOM, nothing but data and the asserts.
 *
 * Rosters follow the flora / fauna rule (CLAUDE.md): each inhabited world's
 * species is defined INSIDE its world entry, so a species belongs to exactly
 * one world by construction, and `assertNpcRostersDisjoint` (run at load)
 * throws if an id is reused anyway. Earth and every lifeless body (barren,
 * icy, asteroid, the Moon) have nobody; scripts/npc-config.test.ts checks
 * the list against the real solar system.
 */

/** What a village asks for. */
export type RequestFamily = 'supply' | 'build' | 'collect';
export const REQUEST_FAMILIES: readonly RequestFamily[] = ['supply', 'build', 'collect'];

export type NpcRole = 'elder' | 'villager';

/**
 * A species' look: the parameters its procedural model is built from (task
 * 3.2 builds the mesh; these are its inputs, in metres; colours are Sweaft-64 tones).
 */
export interface NpcLook {
  heightM: number;
  widthM: number;
  headScale: number;      // head size against the body
  arms: number;           // pairs of arms
  skin: string;
  trim: string;           // markings / clothing
  eyes: string;
  // The species' signature - what makes its silhouette its own (no two
  // worlds share one; src/npc/NpcModels.ts draws it)
  feature: NpcFeature;
}

export type NpcFeature = 'visor' | 'branches' | 'horns' | 'hood' | 'crystals' | 'fur' | 'cap' | 'wings' | 'stilts' | 'fins' | 'pack';

export interface NpcSpecies {
  id: string;             // unique across every world (and the traders)
  name: string;           // singular, for the panel ("a Barkling")
  // Names are first + (sometimes) middle + last syllables, capitalised
  syllables: { first: readonly string[]; middle: readonly string[]; last: readonly string[] };
  look: NpcLook;
}

/**
 * A world's art piece (collect requests). The ITEM and its icon land with
 * task 4.4; until then a piece is referenced by this string id everywhere
 * (village records, requests), and 4.4 maps id -> ItemType in one table.
 */
export interface ArtPiece {
  id: string;
  name: string;
}

/** What a friendship level with a village gives (filled in by group 5). */
export interface FriendshipReward {
  level: number;                  // 1-based, see FRIENDSHIP.LEVELS
  recipes: readonly ItemType[];   // unlocked as mission rewards (task 5.3)
  looks: readonly string[];       // character-creator looks (task 5.4)
}

export interface InhabitedWorld {
  body: string;                   // SolarSystemConfig body id
  population: readonly [number, number];   // inclusive range, chosen once per game world
  villages: number;
  villageNames: readonly string[];         // at least `villages` of them
  species: NpcSpecies;
  art: ArtPiece;
  // What this world's goods are to a trader (its own resources and foods):
  // a trader who has been here can offer them elsewhere
  goods: readonly ItemType[];
  rewards: readonly FriendshipReward[];
}

/** Placeholder rewards until group 5 names each world's recipes and looks. */
const rewards = (world: string): FriendshipReward[] => [
  { level: 1, recipes: [], looks: [] },
  { level: 2, recipes: [], looks: [`${world}_trim`] },
  { level: 3, recipes: [], looks: [] },
  { level: 4, recipes: [], looks: [`${world}_crest`] },
];

export const INHABITED_WORLDS: readonly InhabitedWorld[] = [
  {
    body: 'ferrum', population: [15, 20], villages: 3,
    villageNames: ['Lower Arcade', 'Spire Ward', 'Old Foundry'],
    species: {
      id: 'metropolitan', name: 'Metropolitan',
      syllables: { first: ['Kor', 'Dex', 'Vas', 'Tal', 'Sen', 'Ira', 'Bel'], middle: ['o', 'an', 'i'], last: ['ix', 'el', 'en', 'ock', 'ar'] },
      look: { heightM: 1.7, widthM: 0.45, headScale: 0.9, arms: 1, skin: '#92a3b2', trim: '#3e3551', eyes: '#74effe', feature: 'visor' },
    },
    art: { id: 'art_ferrum', name: 'Circuit Mosaic' },
    goods: [ItemType.SALVAGE],
    rewards: rewards('ferrum'),
  },
  {
    body: 'sequoia', population: [5, 10], villages: 2,
    villageNames: ['Rootfall', 'Highbough'],
    species: {
      id: 'barkling', name: 'Barkling',
      syllables: { first: ['Oru', 'Thal', 'Wen', 'Bri', 'Mos', 'Ash'], middle: ['a', 'wy', 'el'], last: ['n', 'th', 'ra', 'wick'] },
      look: { heightM: 2.1, widthM: 0.5, headScale: 0.8, arms: 1, skin: '#725244', trim: '#297537', eyes: '#fb902f', feature: 'branches' },
    },
    art: { id: 'art_sequoia', name: 'Amber Totem' },
    goods: [ItemType.RESIN, ItemType.FISH_SPRAT],
    rewards: rewards('sequoia'),
  },
  {
    body: 'cinder', population: [5, 10], villages: 1,
    villageNames: ['Ashhold'],
    species: {
      id: 'emberkin', name: 'Emberkin',
      syllables: { first: ['Kra', 'Vul', 'Pyr', 'Sco', 'Ign'], middle: ['o', 'ar'], last: ['k', 'ax', 'is', 'um'] },
      look: { heightM: 1.3, widthM: 0.6, headScale: 1.1, arms: 1, skin: '#8d4526', trim: '#fa3a64', eyes: '#faaf5c', feature: 'horns' },
    },
    art: { id: 'art_cinder', name: 'Obsidian Mask' },
    goods: [ItemType.ORE_URANIUM],
    rewards: rewards('cinder'),
  },
  {
    body: 'vesper', population: [5, 10], villages: 2,
    villageNames: ['Dunecall', 'Claypan'],
    species: {
      id: 'dunewalker', name: 'Dunewalker',
      syllables: { first: ['Sa', 'Mir', 'Ves', 'Hal', 'Zu'], middle: ['ri', 'a', 'ul'], last: ['n', 'sh', 'ra', 'el'] },
      look: { heightM: 2.4, widthM: 0.35, headScale: 0.7, arms: 1, skin: '#ab8465', trim: '#5d778d', eyes: '#1f3b52', feature: 'hood' },
    },
    art: { id: 'art_vesper', name: 'Glass Lantern' },
    goods: [ItemType.SILICA],
    rewards: rewards('vesper'),
  },
  {
    body: 'halcyon', population: [5, 10], villages: 1,
    villageNames: ['Geode Hollow'],
    species: {
      id: 'facetling', name: 'Facetling',
      syllables: { first: ['Qui', 'Lux', 'Cry', 'Pri', 'Sel'], middle: ['a', 'o'], last: ['ss', 'ne', 'ra', 'zz'] },
      look: { heightM: 1.1, widthM: 0.5, headScale: 1.3, arms: 2, skin: '#69608b', trim: '#1096c3', eyes: '#fffefe', feature: 'crystals' },
    },
    art: { id: 'art_halcyon', name: 'Prism Idol' },
    goods: [ItemType.CRYSTAL],
    rewards: rewards('halcyon'),
  },
  {
    body: 'tessaly', population: [5, 10], villages: 1,
    villageNames: ['Rimewater'],
    species: {
      id: 'frostfolk', name: 'Frostfolk',
      syllables: { first: ['Ny', 'Bor', 'Skel', 'Ril', 'Hje'], middle: ['a', 'i', 'ul'], last: ['d', 'm', 'ka', 'vi'] },
      look: { heightM: 1.6, widthM: 0.7, headScale: 1.0, arms: 1, skin: '#bfcad7', trim: '#1096c3', eyes: '#1f3b52', feature: 'fur' },
    },
    art: { id: 'art_tessaly', name: 'Frost Chime' },
    goods: [ItemType.CRYO_COOLANT],
    rewards: rewards('tessaly'),
  },
  {
    body: 'umbra', population: [5, 10], villages: 1,
    villageNames: ['Glowmere'],
    species: {
      id: 'sporeling', name: 'Sporeling',
      syllables: { first: ['Mu', 'Pho', 'Gla', 'Umb', 'Spo'], middle: ['o', 'ri', 'e'], last: ['l', 'ra', 'x', 'mo'] },
      look: { heightM: 1.0, widthM: 0.55, headScale: 1.6, arms: 1, skin: '#7d4636', trim: '#559642', eyes: '#eab798', feature: 'cap' },
    },
    art: { id: 'art_umbra', name: 'Glowcap Lamp' },
    goods: [ItemType.RADIOTROPHIC_FUNGUS],
    rewards: rewards('umbra'),
  },
  {
    body: 'verdance', population: [5, 10], villages: 1,
    villageNames: ['Canopy Rest'],
    species: {
      id: 'leafwing', name: 'Leafwing',
      syllables: { first: ['Fen', 'Lio', 'Ver', 'Pal', 'Cy'], middle: ['a', 'iri', 'o'], last: ['n', 'th', 'ma', 'lis'] },
      look: { heightM: 1.4, widthM: 0.4, headScale: 0.9, arms: 2, skin: '#297537', trim: '#faaf5c', eyes: '#eab798', feature: 'wings' },
    },
    art: { id: 'art_verdance', name: 'Woven Fan' },
    goods: [ItemType.FISH_TETRA, ItemType.FISH_CATFISH],
    rewards: rewards('verdance'),
  },
  {
    body: 'mirewood', population: [5, 10], villages: 1,
    villageNames: ['Stillwater'],
    species: {
      id: 'bogstrider', name: 'Bogstrider',
      syllables: { first: ['Gub', 'Mar', 'Pea', 'Tod', 'Wil'], middle: ['o', 'u', 'ab'], last: ['g', 'sh', 'bo', 'rel'] },
      look: { heightM: 1.8, widthM: 0.45, headScale: 0.8, arms: 1, skin: '#725244', trim: '#69608b', eyes: '#559642', feature: 'stilts' },
    },
    art: { id: 'art_mirewood', name: 'Peat Carving' },
    goods: [ItemType.FISH_PEATEEL, ItemType.FISH_GOURAMI],
    rewards: rewards('mirewood'),
  },
  {
    body: 'thalassa', population: [5, 10], villages: 1,
    villageNames: ['Pearl Shoal'],
    species: {
      id: 'tidefolk', name: 'Tidefolk',
      syllables: { first: ['Mar', 'Cor', 'Nai', 'Thal', 'Sha'], middle: ['i', 'e', 'ul'], last: ['s', 'na', 'ul', 'ro'] },
      look: { heightM: 1.5, widthM: 0.5, headScale: 1.0, arms: 1, skin: '#1096c3', trim: '#fffefe', eyes: '#1f3b52', feature: 'fins' },
    },
    art: { id: 'art_thalassa', name: 'Pearl Crown' },
    goods: [ItemType.FISH_MULLET, ItemType.FISH_KELPEEL],
    rewards: rewards('thalassa'),
  },
];

/** A village structure, raised stage by stage by build requests. */
export interface StructureDef {
  id: string;
  name: string;
  stages: ReadonlyArray<{ item: ItemType; amount: number }>;
}

/** A trader: one of a small band that belongs to no world. */
export interface TraderDef {
  name: string;
  route: readonly string[];       // inhabited body ids, visited in order and round again
}

export const NPC_CONFIG = {
  // ---- time (worldTime.ts applies the cap; CLAUDE.md time compression)
  // The longest absence a returning player's catch-up applies (seconds)
  CATCH_UP_CAP_S: 7 * 24 * 3600,
  // How often the server advances an occupied planet (seconds)
  SERVER_TICK_S: 10,
  // While a planet is occupied its npcClock record is restamped at least
  // this often (seconds), so a crash re-applies at most this much time
  CLOCK_STAMP_S: 60,

  // ---- villages
  VILLAGE: {
    RADIUS_M: 14,              // homes stand within this of the village centre
    // Village centres: the first within FIRST_SPREAD_RAD of the anchor (the
    // body's spawn, so a landing party finds one), the others within
    // SPREAD_RAD of the first and at least MIN_GAP_M apart
    FIRST_SPREAD_RAD: 0.12,
    SPREAD_RAD: 0.6,
    MIN_GAP_M: 60,
    CENTRE_TRIES: 64,          // candidate spots tried for a centre on walkable ground
    WIDEN: 2,                  // no ground in reach: the search cap grows by this, up to the whole globe
    GLOBE_ROUNDS: 16,          // and then this many rounds of CENTRE_TRIES over the whole globe (ocean worlds)
    HOME_TRIES: 24,            // and for a home
    HOME_MIN_GAP_M: 2.5,       // homes this far apart at least (when the ground allows)
  },

  // ---- the food store (meals)
  FOOD: {
    START_PER_RESIDENT: 6,
    USE_PER_RESIDENT_PER_HOUR: 0.25,
    LOW_PER_RESIDENT: 2,       // below this a supply request opens
  },
  // The foods a supply request asks for, what each is worth to the store,
  // and how many one request wants
  SUPPLY_FOODS: [
    { item: ItemType.COOKED_FISH, meals: 1, amount: [8, 16] as const },
    { item: ItemType.FISH_STEW, meals: 3, amount: [3, 6] as const },
  ],

  // ---- requests
  REQUESTS: {
    OPEN: 3,                   // open requests a village keeps
    REOPEN_DELAY_S: 600,       // a completed request's slot reopens after this
    // Relative chance of each family when a slot is drawn (a low food store
    // forces supply regardless)
    WEIGHTS: { supply: 2, build: 2, collect: 1 } as Record<RequestFamily, number>,
    COLLECT_AMOUNT: 1,         // art pieces a collect request wants
    // Friendship a whole request gives (credited per item delivered, group 5)
    FRIENDSHIP: { supply: 6, build: 10, collect: 20 } as Record<RequestFamily, number>,
  },
  // What villages build, in order; each stage is one build request
  STRUCTURES: [
    { id: 'hall', name: 'Village Hall', stages: [
      { item: ItemType.BRICK_BLOCK, amount: 24 },
      { item: ItemType.STEEL_GIRDER, amount: 8 },
      { item: ItemType.STEEL_GLASS, amount: 6 },
    ] },
    { id: 'granary', name: 'Granary', stages: [
      { item: ItemType.CONCRETE_BLOCK, amount: 20 },
      { item: ItemType.BRICK, amount: 32 },
    ] },
    { id: 'gallery', name: 'Gallery', stages: [
      { item: ItemType.GLASS, amount: 16 },
      { item: ItemType.STEEL_INGOT, amount: 12 },
    ] },
  ] as readonly StructureDef[],

  // ---- friendship
  FRIENDSHIP: {
    // Score needed for level 1, 2, 3, 4 with a village
    LEVELS: [10, 40, 90, 160],
  },

  // ---- traders
  TRADERS: {
    BAND: [
      { name: 'Vell', route: ['sequoia', 'halcyon', 'vesper', 'ferrum'] },
      { name: 'Osk', route: ['cinder', 'umbra', 'tessaly', 'ferrum'] },
      { name: 'Ama', route: ['verdance', 'thalassa', 'mirewood', 'sequoia'] },
    ] as readonly TraderDef[],
    SPECIES: {
      id: 'wayfarer', name: 'Wayfarer',
      syllables: { first: [], middle: [], last: [] },
      look: { heightM: 1.9, widthM: 0.5, headScale: 0.9, arms: 1, skin: '#a8633e', trim: '#fb902f', eyes: '#fffefe', feature: 'pack' },
    } as NpcSpecies,
    STAY_S: 1800,              // seconds of the host world's time before moving on
    RESTOCK_S: 600,            // offers refill this often during a stay
    OFFERS: 4,                 // offers per visit (at least one from the world it came from)
    STOCK: [2, 5] as const,    // trades per offer per restock
    GIVE: [2, 6] as const,     // items the trader gives per trade
    // What a trader asks for, besides the visited world's own goods
    WANTS: [ItemType.STEEL_INGOT, ItemType.GLASS, ItemType.BRICK, ItemType.COOKED_FISH],
    TAKE: [4, 10] as const,    // items the player pays per trade (before friendship)
    LEVEL_DISCOUNT: 0.1,       // fraction off the price per friendship level (task 4.5)
  },

  // ---- talking (task 4.1)
  TALK_RANGE_M: 3,

  // ---- drawing (task 3.2): instances per species' mesh (a world's whole population fits)
  MAX_DRAWN_PER_SPECIES: 64,
} as const;

/** The world entry for a body, or undefined when nobody lives there. */
export function inhabitedWorld(body: string): InhabitedWorld | undefined {
  return INHABITED_WORLDS.find(w => w.body === body);
}

export const isInhabited = (body: string): boolean => inhabitedWorld(body) !== undefined;

/**
 * Throws if a species or art piece is on two worlds, a world is listed
 * twice, a trader routes through a world nobody lives on, or a range is
 * outside what the spec allows. Pure: run at load below.
 */
export function assertNpcRostersDisjoint(worlds: readonly InhabitedWorld[] = INHABITED_WORLDS): void {
  const bodies = new Set<string>();
  const species = new Map<string, string>([[NPC_CONFIG.TRADERS.SPECIES.id, 'the traders']]);
  const art = new Map<string, string>();
  const goods = new Map<ItemType, string>();
  const features = new Map<string, string>([[NPC_CONFIG.TRADERS.SPECIES.look.feature, 'the traders']]);
  for (const w of worlds) {
    if (bodies.has(w.body)) throw new Error(`[NPC] ${w.body} is listed twice`);
    bodies.add(w.body);
    const other = species.get(w.species.id);
    if (other) throw new Error(`[NPC] species ${w.species.id} lives on both ${other} and ${w.body}`);
    species.set(w.species.id, w.body);
    const fOther = features.get(w.species.look.feature);
    if (fOther) throw new Error(`[NPC] ${w.body} and ${fOther} share the look feature ${w.species.look.feature}`);
    features.set(w.species.look.feature, w.body);
    const artOther = art.get(w.art.id);
    if (artOther) throw new Error(`[NPC] art piece ${w.art.id} belongs to both ${artOther} and ${w.body}`);
    art.set(w.art.id, w.body);
    for (const g of w.goods) {
      const gOther = goods.get(g);
      if (gOther) throw new Error(`[NPC] good ${g} is from both ${gOther} and ${w.body}`);
      goods.set(g, w.body);
    }
    const [lo, hi] = w.population;
    if (!(Number.isInteger(lo) && Number.isInteger(hi) && lo <= hi && lo >= w.villages)) {
      throw new Error(`[NPC] ${w.body}: population ${lo}-${hi} can't fill ${w.villages} village(s)`);
    }
    if (w.villageNames.length < w.villages) throw new Error(`[NPC] ${w.body}: ${w.villages} villages but ${w.villageNames.length} names`);
  }
  for (const t of NPC_CONFIG.TRADERS.BAND) {
    if (t.route.length < 2) throw new Error(`[NPC] trader ${t.name} needs a route of two worlds or more`);
    for (const b of t.route) if (!bodies.has(b)) throw new Error(`[NPC] trader ${t.name} visits ${b}, where nobody lives`);
  }
}
assertNpcRostersDisjoint();

/**
 * Throws if a listed world is not a real, living (or city) body - Earth, the
 * Moon, asteroids and lifeless rocks must have nobody. Takes the bodies as
 * plain data so this file needs no SolarSystemConfig (which pulls in three).
 */
export function assertNpcWorldsAlive(bodies: ReadonlyArray<{ id: string; type: string; landable: boolean; alive: boolean }>): void {
  for (const w of INHABITED_WORLDS) {
    const b = bodies.find(x => x.id === w.body);
    if (!b) throw new Error(`[NPC] ${w.body} is not a body of this build`);
    if (w.body === 'earth' || w.body === 'moon') throw new Error(`[NPC] ${w.body} has no aliens`);
    if (!b.landable || b.type === 'asteroid' || !b.alive) throw new Error(`[NPC] ${w.body} is lifeless, nobody can live there`);
  }
}
