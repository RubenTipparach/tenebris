/**
 * Sea flora (openspec ocean-life, task 2.1): plants on the submerged seabed
 * round the player, each sea world its own.
 *
 * Two halves:
 * - SEA_FLORA_SPECIES (here): how each species looks and moves - its shape,
 *   its palette ramps, its size, how the water sways it.
 * - a body's `seaFlora` table (SolarSystemConfig, beside `flora`): which of
 *   its species grows where, by water depth, by how warm the water is and by
 *   broad patches. A species belongs to exactly ONE planet
 *   (assertFloraRostersDisjoint checks land and sea flora together).
 *
 * Placement is derived from the world seed and the tile (src/planet/SeaFloraZones.ts),
 * so nothing is saved and every client draws the same plants.
 */

export type EarthSeaFlora = 'coral' | 'kelp' | 'seagrass' | 'beadletanemone';
export type SequoiaSeaFlora = 'glowanemone' | 'seafan' | 'ribbonweed' | 'lumengrass';
export type VerdanceSeaFlora = 'reedbed' | 'lilypad' | 'streamerweed' | 'jadeanemone';
export type MirewoodSeaFlora = 'swampweed' | 'bladderwort' | 'bogtress' | 'mireanemone';
export type SeaFloraSpecies = EarthSeaFlora | SequoiaSeaFlora | VerdanceSeaFlora | MirewoodSeaFlora;

/** The procedural mesh a species is built from (src/mockups/SeaFlora.ts) */
export type SeaFloraShape = 'branchcoral' | 'kelp' | 'blades' | 'anemone' | 'fan' | 'reeds' | 'lilypad' | 'weed' | 'bladderwort'
  | 'ribbon' | 'streamer' | 'tresses';

/** What a species is for (underwater-life): checked per sea world by scripts/sea-flora.test.ts */
export type SeaFloraRole = 'tallwavy' | 'shortwavy' | 'anemone' | 'other';

/** Four palette tones, dark / mid / light / accent (a flower, a glowing tip) */
export type SeaRamp = [string, string, string, string];

export interface SeaFloraLook {
  shape: SeaFloraShape;
  /** One or more ramps; each plant picks one (coral colonies in pink, orange or violet) */
  ramps: SeaRamp[];
  /** Plant height range in metres (blocks). Seabed plants never reach above
   *  the water: they are cut to the water column less SEA_FLORA.TOP_MARGIN. */
  height: [number, number];
  /** Kelp: grow to this fraction of the water column instead (min, max) */
  reach?: [number, number];
  /** Width scale range (the mesh is about 1 m across at 1) */
  width: [number, number];
  /** Sway: metres of tip travel per metre of plant height, and its speed (rad/s) */
  sway: number;
  swaySpeed: number;
  /** Travelling wave (underwater-life): the sway phase lags this many radians
   *  from root to tip, so the bend runs up the plant as an S. 0 / omitted = rigid lean. */
  wave?: number;
  /** Tentacle flutter (anemones): radial open-close and a wave round the ring,
   *  metres per metre of height, and its speed (rad/s) */
  flutter?: { amp: number; speed: number };
  /** A tile's plants grow as one clump: they share one spot on the tile and
   *  stand within this many metres of it; omitted = scattered over the tile */
  cluster?: number;
  /** What it is for on its world (wavy plants, anemones) */
  role: SeaFloraRole;
  /** Floats on (lilypad) or hangs just under (bladderwort) the surface,
   *  bobbing: how far below the surface its origin sits (negative = above,
   *  resting on it), and the bob's height (m) and speed (rad/s) */
  float?: { depth: number; bob: number; bobSpeed: number };
  /** Accent-tone vertices glow at night in this colour (glow anemones) */
  glow?: string;
}

export const SEA_FLORA_SPECIES: Record<SeaFloraSpecies, SeaFloraLook> = {
  // Earth - branching coral in the warm shallows, in pink, orange or violet
  coral: {
    shape: 'branchcoral', role: 'other',
    ramps: [
      ['#9e3ba2', '#c34988', '#dd576d', '#eab798'],
      ['#a8633e', '#fb902f', '#faaf5c', '#eab798'],
      ['#4f1d83', '#7d2dbd', '#9e3ba2', '#c34988'],
    ],
    height: [0.35, 0.8], width: [0.6, 1.1], sway: 0.01, swaySpeed: 0.5,
  },
  // Earth - golden-brown kelp in cooler water, fronds reaching for the surface
  kelp: {
    shape: 'kelp', role: 'tallwavy',
    ramps: [
      ['#41322c', '#8d4526', '#c56d25', '#faaf5c'],
      ['#434137', '#725244', '#ab8465', '#cfaa81'],
    ],
    height: [1.2, 12], reach: [0.55, 0.92], width: [0.7, 1.1], sway: 0.1, swaySpeed: 0.55, wave: 2.6,
  },
  // Earth - short seagrass blades in the shallows
  seagrass: {
    shape: 'blades', role: 'shortwavy',
    ramps: [['#05582d', '#297537', '#559642', '#9bb675']],
    height: [0.3, 0.6], width: [0.7, 1.1], sway: 0.22, swaySpeed: 0.8, wave: 1.6,
  },
  // Earth - beadlet anemones: squat red, orange or green clumps on the rocks
  beadletanemone: {
    shape: 'anemone', role: 'anemone',
    ramps: [
      ['#561c27', '#a61e1f', '#dd576d', '#eab798'],
      ['#733126', '#c56d25', '#fb902f', '#faaf5c'],
      ['#05582d', '#297537', '#559642', '#dd576d'],
    ],
    height: [0.2, 0.38], width: [0.35, 0.6], sway: 0.05, swaySpeed: 0.7, wave: 1.2,
    flutter: { amp: 0.09, speed: 1.7 }, cluster: 0.35,
  },
  // Sequoia - teal anemones whose tentacle tips glow cyan at night
  glowanemone: {
    shape: 'anemone', role: 'anemone',
    ramps: [
      ['#204f63', '#53998b', '#84e3b5', '#74effe'],
      ['#4f1d83', '#9e3ba2', '#c34988', '#74effe'],
    ],
    height: [0.25, 0.5], width: [0.45, 0.8], sway: 0.08, swaySpeed: 0.7, wave: 1.2, glow: '#74effe',
    flutter: { amp: 0.08, speed: 1.4 }, cluster: 0.4,
  },
  // Sequoia - flat red sea fans on the deeper bed
  seafan: {
    shape: 'fan', role: 'other',
    ramps: [
      ['#561c27', '#a61e1f', '#d12d41', '#fa3a64'],
      ['#733126', '#c56d25', '#faaf5c', '#eab798'],
    ],
    height: [0.6, 1.4], width: [0.7, 1.2], sway: 0.05, swaySpeed: 0.45,
  },
  // Sequoia - ribbon weed: long twisting teal ribbons up through deep water
  ribbonweed: {
    shape: 'ribbon', role: 'tallwavy',
    ramps: [
      ['#0c2f44', '#204f63', '#53998b', '#84e3b5'],
      ['#4f1d83', '#204f63', '#53998b', '#74effe'],
    ],
    height: [1.2, 10], reach: [0.5, 0.9], width: [0.8, 1.2], sway: 0.11, swaySpeed: 0.5, wave: 3.2,
  },
  // Sequoia - lumen grass: short teal blades in the shallows, tips glowing at night
  lumengrass: {
    shape: 'blades', role: 'shortwavy',
    ramps: [['#0c2f44', '#204f63', '#53998b', '#74effe']],
    height: [0.25, 0.5], width: [0.7, 1.1], sway: 0.2, swaySpeed: 0.75, wave: 1.6, glow: '#74effe',
  },
  // Verdance - olive reed beds in the shallows, under the surface
  reedbed: {
    shape: 'reeds', role: 'shortwavy',
    ramps: [['#434137', '#559642', '#9bb675', '#ab8465']],
    height: [0.5, 1.6], width: [0.6, 1.0], sway: 0.08, swaySpeed: 0.6, wave: 1.4,
  },
  // Verdance - lily pads floating on the surface, the odd pink flower
  lilypad: {
    shape: 'lilypad', role: 'other',
    ramps: [['#003227', '#297537', '#559642', '#fa3a64']],
    height: [1, 1], width: [0.8, 1.3], sway: 0, swaySpeed: 0,
    float: { depth: -0.03, bob: 0.025, bobSpeed: 0.9 },
  },
  // Verdance - streamer weed: tall stems hung with leaflets, trailing in the current
  streamerweed: {
    shape: 'streamer', role: 'tallwavy',
    ramps: [
      ['#003227', '#297537', '#559642', '#9bb675'],
      ['#434137', '#559642', '#9bb675', '#faaf5c'],
    ],
    height: [1, 8], reach: [0.5, 0.88], width: [0.7, 1.1], sway: 0.1, swaySpeed: 0.6, wave: 2.8,
  },
  // Verdance - jade anemones: pale green clumps with orange-tipped tentacles
  jadeanemone: {
    shape: 'anemone', role: 'anemone',
    ramps: [
      ['#003227', '#53998b', '#84e3b5', '#faaf5c'],
      ['#297537', '#559642', '#9bb675', '#fa3a64'],
    ],
    height: [0.2, 0.4], width: [0.35, 0.6], sway: 0.05, swaySpeed: 0.65, wave: 1.2,
    flutter: { amp: 0.09, speed: 1.5 }, cluster: 0.35,
  },
  // Mirewood - dark tangled swamp weed on the bed
  swampweed: {
    shape: 'weed', role: 'shortwavy',
    ramps: [['#161612', '#434137', '#559642', '#9bb675']],
    height: [0.5, 1.4], width: [0.7, 1.1], sway: 0.12, swaySpeed: 0.5, wave: 1.8,
  },
  // Mirewood - bladderwort: a mat of fine fronds hanging just under the
  // surface, yellow flowers up to it
  bladderwort: {
    shape: 'bladderwort', role: 'other',
    ramps: [['#0c2f44', '#297537', '#9bb675', '#faaf5c']],
    height: [0.25, 0.45], width: [0.8, 1.3], sway: 0.05, swaySpeed: 0.6,
    float: { depth: 0.3, bob: 0.02, bobSpeed: 0.7 },
  },
  // Mirewood - bog tresses: long hair-fine strands, brown-black or violet,
  // streaming up from the deep peat
  bogtress: {
    shape: 'tresses', role: 'tallwavy',
    ramps: [
      ['#161612', '#434137', '#725244', '#ab8465'],
      ['#0c2f44', '#4f1d83', '#7d2dbd', '#9bb675'],
    ],
    height: [1, 8], reach: [0.45, 0.85], width: [0.7, 1.1], sway: 0.12, swaySpeed: 0.45, wave: 3.6,
  },
  // Mirewood - mire anemones: violet clumps with lime tentacle tips
  mireanemone: {
    shape: 'anemone', role: 'anemone',
    ramps: [
      ['#161612', '#4f1d83', '#7d2dbd', '#9bb675'],
      ['#41322c', '#725244', '#ab8465', '#9e3ba2'],
    ],
    height: [0.2, 0.4], width: [0.35, 0.6], sway: 0.05, swaySpeed: 0.55, wave: 1.2,
    flutter: { amp: 0.1, speed: 1.3 }, cluster: 0.35,
  },
};

/**
 * One zone of a planet's sea: where one species grows. A tile takes the
 * FIRST zone it matches (zones are listed in priority order), so each patch
 * of seabed grows one species - broad depth bands and patches, never a
 * per-tile mix.
 */
export interface SeaFloraZone {
  species: SeaFloraSpecies;
  /** Water over the bed, in blocks (inclusive) */
  depth: [number, number];
  /** Water warmth range (Earth: 1 at the equator, falling to the poles and with depth); omitted = any */
  warmth?: [number, number];
  /** The planet's patch noise must be at least this (big beds with bare gaps); omitted = everywhere */
  patch?: number;
  /** Grows only on a rocky bed (anemones): rock, or a step in the bed - a
   *  ledge, its foot or an underwater bank (SeaFloraZones.rockyBed); omitted = any bed */
  rocky?: boolean;
  /** Chance a matching tile grows anything, and plants per growing tile (min + up to rand) */
  chance: number;
  perTile: [number, number];
}

export interface SeaFloraTable {
  zones: SeaFloraZone[];
  /** Water warmth: 1 - |lat sine| / POLAR_THRESHOLD + noise * noiseAmp - depthCooling * depth */
  warmth?: { noiseScale: number; noiseAmp: number; depthCooling: number };
  /** Patch noise frequency (low = big coherent beds) */
  patchScale: number;
  /** The world's rock blocks: a bed of these is rocky (omitted = only steps are) */
  rock?: number[];
}

/** The scatter round the player - shared with GroundClutter (one cadence) */
export const NEAR_PLAYER_SCATTER = {
  /** How far round the player clutter and sea plants grow (m) */
  RADIUS: 30,
  /** Rebuild after moving this far (m)... */
  REBUILD_MOVE: 4,
  /** ...or this often (s), which picks up block edits */
  REBUILD_EVERY_S: 1.5,
} as const;

export const SEA_FLORA = {
  /** Instance cap per species (one instanced mesh each) */
  MAX_PER_SPECIES: 2500,
  /** Seabed plants stop this far under the surface (m) */
  TOP_MARGIN: 0.15,
  /** A plant is skipped where the water column cut leaves less than this
   *  fraction of its minimum height */
  MIN_FIT: 0.5,
  /** How far from the hex centre plants stand (fraction of the way to a corner) */
  SPREAD: 0.7,
  /** Sunk this far into the bed (m) so roots don't float on a slope */
  ROOT_SINK: 0.04,
  /** Per-plant brightness jitter (multiplies the ramp) */
  JITTER: [0.88, 1.08] as [number, number],
  /** Night glow: full below this sun height (sine), gone above the second */
  GLOW_NIGHT_E: -0.05,
  GLOW_DAY_E: 0.15,
  /** Glow gain at night and its faint daytime remainder */
  GLOW_NIGHT: 1.1,
  GLOW_DAY: 0.08,
  /** Sun's diffuse share, as GroundClutter's tufts */
  DIFFUSE: 0.6,
  /** Water current: the slow horizontal axis plants lean along (any non-radial vector) */
  CURRENT_AXIS: [0.3, 1.0, 0.2] as [number, number, number],
  /** Second, faster wobble across the current (fraction of the main sway, and speed multiple) */
  WOBBLE: 0.35,
  WOBBLE_SPEED: 2.3,
  /** Anemone flutter: tentacle waves round the ring (lobes per turn), and
   *  the share of it that opens and closes the ring rather than swirling it */
  FLUTTER_LOBES: 3,
  /** A bed this many blocks above or below a neighbour's (or beside dry land)
   *  is a step - a ledge, its foot, a bank: rocky ground for anemones */
  LEDGE_STEP: 1,
  FLUTTER_RADIAL: 0.6,
  /** Seeds salts for the warmth and patch noise */
  WARMTH_SALT: 3101,
  PATCH_SALT: 3203,
} as const;
