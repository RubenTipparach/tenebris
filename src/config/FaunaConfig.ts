/**
 * Fauna: who lives where, and every knob for how they spawn and move.
 *
 * ONE source of truth for the rosters. Each species names the ONE planet it
 * lives on (`planet`), and a planet's roster is derived from that
 * (`faunaRoster`), so a species cannot be on two planets by construction -
 * the "every planet's fauna roster is UNIQUE" rule. `validateFaunaRosters`
 * re-checks it (and that lifeless worlds have nobody) at startup.
 *
 * Models are procedural (src/planet/FaunaModels.ts, keyed by the same ids);
 * the walk / idle cycles are baked to public/animations/<id>.anim.json by
 * scripts/gen-fauna-anims.py.
 */

import { FISH_ROSTERS, FishSpecies } from './FishRosters';
import { ItemType } from '../player/Inventory';

export type FaunaMotion =
  | 'walk'   // on the ground (or the seabed, for habitat 'seabed')
  | 'hop'    // on the ground; the hop arc is in the baked clip
  | 'fly'    // hovers above the ground, flaps when it moves
  | 'float'  // drifts high and slow (jellies)
  | 'swim'   // in the water, between the seabed and the surface (habitat 'water')
  | 'drift'; // in the water, slow, bobbing and pulsing (sea jellies)

/**
 * Where a species lives: dry land (the default), the open water (swimmers
 * and drifters: kept between seabed and surface), or the seabed under the
 * water (crawlers: they walk on submerged ground and never leave the water).
 */
export type FaunaHabitat = 'land' | 'water' | 'seabed';

export interface FaunaSpecies {
  /** The one planet (body id) this species lives on. */
  planet: string;
  name: string;
  motion: FaunaMotion;
  /** Wander / flee speed, units per second. */
  walkSpeed: number;
  fleeSpeed: number;
  /** Flees when the player comes this close (0 = never). */
  fleeRadius: number;
  /** Seconds spent idling (grazing) / wandering, [min, max]. */
  idleTime: [number, number];
  wanderTime: [number, number];
  /** Herd size per spawn site, [min, max]. */
  herd: [number, number];
  /** Uniform scale range per individual. */
  scale: [number, number];
  /** Height above the ground for fly / float, [min, max]. */
  hover: [number, number];
  /** Extra procedural bob for fly / float: amplitude (units), rate (Hz). */
  bob: [number, number];
  /** Tallest step (in blocks) a walker climbs; more and it turns back. */
  maxStep: number;
  /** Relative chance a spawn site picks this species on its planet. */
  weight: number;
  /** Multiplier on the model's emissive parts (0 = none glow). */
  glow: number;
  /**
   * Ranching (src/planet/Ranching.ts, numbers in SurvivalConfig RANCHING):
   * 'wool' = shears shear it (needs a model part named 'fleece'), 'hide' =
   * hits bring it down for leather. Omitted = neither.
   */
  ranch?: 'wool' | 'hide';
  /** Omitted = 'land'. */
  habitat?: FaunaHabitat;
  /**
   * Swimmers: the depth each one keeps, as a fraction of the water column
   * ([0 = seabed, 1 = surface], picked per individual and again on each
   * wander), before the margins clamp it (src/planet/SwimRules.ts).
   */
  swimBand?: [number, number];
  /**
   * Schooling swimmers (openspec underwater-life): the herd is ONE record, an
   * anchor that wanders and flees, with its fish flocking round it as boids
   * (src/planet/Schooling.ts, rules in FAUNA_SCHOOL) - the school's spread,
   * in units. Omitted = each member wanders on its own.
   */
  school?: number;
  /** The baked clip file (public/animations/<anim>.anim.json); omitted = the species id. */
  anim?: string;
  /** A species derived from a fishing-table fish (its model is the parametric fish). */
  fish?: FishSpecies;
}

export const FAUNA_CONFIG = {
  enabled: true,
  /** Spawn sites are looked for within this distance of the player... */
  spawnRadius: 52,
  /** ...but not closer than this (no popping in at your feet)... */
  minSpawnDistance: 14,
  /** ...except on arrival, when the area is empty. */
  arrivalMinSpawnDistance: 5,
  /** A herd despawns once every member is this far away. */
  despawnRadius: 72,
  /** Re-scan for sites after moving this far, or this often. */
  rescanMove: 8,
  rescanEverySeconds: 3,
  /** Fraction of dry surface tiles that are a herd's home. */
  siteChance: 0.0035,
  /** Hard caps (per viewer): all creatures, then land and water life apart, so one can't crowd out the other. */
  maxCreatures: 80,
  maxLand: 48,
  maxWater: 48,
  maxPerSpecies: 24,
  /** Height following (1/s): how fast a creature settles onto a new tile. */
  heightFollowRate: 10,
  /** Turn rate (1/s) towards the heading. */
  turnRate: 4,
  /** idle -> move clip blend rate (1/s). */
  blendRate: 5,
  /** Flee lasts until the player is this many flee radii away. */
  fleeRelease: 1.6,
  /** Night-side ambient floor, as a fraction of day (matches the terrain). */
  nightAmbient: 0.1,
  /** Sun diffuse strength (matches ground clutter). */
  sunDiffuse: 0.6,
  /** Per-individual brightness variation, [min, max]. */
  tint: [0.85, 1.1] as [number, number],
  /**
   * Multiplayer: the planet's host (lowest player id there) simulates its
   * animals, spawning round every player on the planet, and sends snapshots;
   * everyone else draws those.
   */
  mp: {
    /** Snapshots per second from the host. */
    snapshotHz: 5,
    /** Most creatures in one snapshot (keeps a frame well under the server's message cap). */
    maxSnapshotCreatures: 100,
    /** Follow rate (1/s) of a drawn creature towards its latest snapshot. */
    followRate: 8,
    /** Decimal places sent: unit directions, radii / sizes. */
    dirDecimals: 4,
    lengthDecimals: 2,
  },
};

/**
 * Worlds known to have no life (barren moons, rock, the city planet for now).
 * The spawn gate is the roster itself - a planet with no species in
 * FAUNA_SPECIES spawns nothing, so new moons and asteroids are lifeless by
 * default; this list only makes the startup check catch a slip.
 */
export const FAUNA_LIFELESS = ['moon', 'kessel', 'nerith', 'ferrum'] as const;

/** Per-body water life numbers; a body with water but no entry uses `default`. */
export interface WaterLifeConfig {
  /** Fraction of water surface tiles that are a school's / crawler group's home. */
  siteChance: number;
  /** Least water depth (blocks) a swimmer spawns in / swims into, and a crawler. */
  minSwimDepth: number;
  minCrawlDepth: number;
  /** Clearance (units) a swimmer keeps above the seabed and below the surface, on top of half its body. */
  bedMargin: number;
  surfaceMargin: number;
  /** Fraction of the model's bounding radius counted as half its height. */
  bodyHalf: number;
  /** How fast (1/s) a swimmer eases to its depth. */
  depthFollowRate: number;
  /** A blocked swimmer turns round by about half a turn, give or take up to this much (radians). */
  turnJitter: number;
  /** Speed kept when a swimmer meets the shore (it turns, smoothly). */
  blockedSpeedKeep: number;
  /** Swimmers fleeing dive to this fraction of the column. */
  fleeDepth: number;
  /** A swimmer meeting a rising seabed lifts its column fraction by this much. */
  riseOnBlock: number;
}

const WATER_BASE: WaterLifeConfig = {
  siteChance: 0.006, minSwimDepth: 2, minCrawlDepth: 1, bedMargin: 0.15, surfaceMargin: 0.35, bodyHalf: 0.5,
  depthFollowRate: 1.5, turnJitter: Math.PI / 2,
  blockedSpeedKeep: 0.5, fleeDepth: 0.15, riseOnBlock: 0.5,
};

export const FAUNA_WATER: Record<string, WaterLifeConfig> & { default: WaterLifeConfig } = {
  default: WATER_BASE,
  earth: { ...WATER_BASE, siteChance: 0.008 },
  sequoia: { ...WATER_BASE, siteChance: 0.007, bedMargin: 0.2, surfaceMargin: 0.4, depthFollowRate: 1.2 },
  // The jungle moons are small (few tiles) and their waters shallow, so more
  // of their water is home to something and one block of water is enough
  verdance: { ...WATER_BASE, siteChance: 0.03, minSwimDepth: 1, bedMargin: 0.12, surfaceMargin: 0.3, depthFollowRate: 1.8 },
  mirewood: { ...WATER_BASE, siteChance: 0.03, minSwimDepth: 1, bedMargin: 0.12, surfaceMargin: 0.3, depthFollowRate: 1.8 },
};

export function waterLife(planetId: string): WaterLifeConfig {
  return FAUNA_WATER[planetId] ?? FAUNA_WATER.default;
}

/**
 * The flock rules of a school (src/planet/Schooling.ts). Gains are per
 * second (accelerations scale by the species' cruise speed where noted), and
 * distances are fractions of the school's spread (FaunaSpecies.school).
 */
export interface SchoolRules {
  /** New fish scatter over this fraction of the spread. */
  seedSpread: number;
  /** Share of vertical motion kept (0 = a flat sheet, 1 = a ball). */
  flatten: number;
  /** Pull toward the flock's centre (1/s^2). */
  cohesion: number;
  /** Pull back to the anchor past the spread (1/s^2 per unit beyond). */
  leash: number;
  /** Personal space (fraction of the spread) and how hard a fish keeps it (x cruise speed, 1/s). */
  separation: number;
  separationGain: number;
  /** Neighbours it aligns with (fraction of the spread) and how fast it matches their velocity (1/s). */
  neighbour: number;
  alignment: number;
  /** How fast velocity relative to the school dies away (1/s). */
  drag: number;
  /** Flight from a threat inside the flee radius (x cruise speed, 1/s). */
  fleeGain: number;
  /** Per-fish wander: rate (rad/s) and strength (x cruise speed, 1/s). */
  wanderRate: number;
  wander: number;
  /** Most speed relative to the school (x cruise speed). */
  maxRelSpeed: number;
  /** How fast a fish turns to face where it swims (1/s). */
  faceRate: number;
  /** A fish over the shore or too-shallow water is drawn back to the anchor this fast (1/s). */
  shorePull: number;
}

export const FAUNA_SCHOOL: SchoolRules = {
  seedSpread: 0.7, flatten: 0.35, cohesion: 0.9, leash: 4, separation: 0.32, separationGain: 6,
  neighbour: 0.7, alignment: 1.6, drag: 0.5, fleeGain: 14, wanderRate: 0.7, wander: 0.5,
  maxRelSpeed: 1.6, faceRate: 6, shorePull: 3,
};

/**
 * The swimming fish: one fauna entry per fishing-table fish (FISH_ROSTERS),
 * derived here so the schools on a planet are exactly its catch. Numbers
 * that turn a fish's size and fight into how it swims:
 */
export const FISH_FAUNA = {
  /** Drawn length = max(minLength, lengthM * visualScale) units (game scale, like the rabbits). */
  visualScale: 1.6,
  minLength: 0.4,
  /** Cruise speed = speedBase + speedPerM * drawn length; flee = cruise * fleeMul * (fleeBase + pull). */
  speedBase: 0.5,
  speedPerM: 0.8,
  fleeMul: 2.5,
  fleeBase: 0.6,
  /** Inside the underwater fog (PlayerConfig UNDERWATER_FOG_FAR), so a school can be watched before it bolts */
  fleeRadius: 3,
  idleTime: [1, 3] as [number, number],
  wanderTime: [3, 7] as [number, number],
  /** Default school size and body height / length when the look omits them. */
  school: [3, 6] as [number, number],
  height: 0.3,
  /** School spread (units) per drawn length, times sqrt(largest school). */
  spreadPerLength: 1.6,
  /** A fish schools (one boids flock per herd) when its largest herd is at least this. */
  minSchool: 3,
  /** Per-individual size spread. */
  scale: [0.85, 1.15] as [number, number],
  swimBand: [0.2, 0.8] as [number, number],
  /** Spawn weight = bite * weightMul (eager biters are the common ones). */
  weightMul: 3,
  /** Eels and serpents undulate slower and don't school. */
  eelSpeedMul: 0.7,
};

/** The fauna id of a fishing-table fish: FISH_MINNOW -> fishMinnow. */
export function fishFaunaId(f: FishSpecies): string {
  const key = ItemType[f.item] ?? `FISH_${f.item}`;
  return key.toLowerCase().replace(/_([a-z0-9])/g, (_m, c: string) => c.toUpperCase());
}

/** Drawn length (units) of a fishing-table fish, model and motion alike. */
export function fishDrawnLength(f: FishSpecies): number {
  return Math.max(FISH_FAUNA.minLength, f.lengthM * FISH_FAUNA.visualScale);
}

function fishFauna(): Record<string, FaunaSpecies> {
  const F = FISH_FAUNA;
  const out: Record<string, FaunaSpecies> = {};
  for (const [planet, fish] of Object.entries(FISH_ROSTERS)) {
    for (const f of fish) {
      const len = fishDrawnLength(f);
      const eel = f.look.shape === 'eel';
      const walk = (F.speedBase + F.speedPerM * len) * (eel ? F.eelSpeedMul : 1);
      const herd = f.look.school ?? F.school;
      out[fishFaunaId(f)] = {
        planet, name: f.name, motion: 'swim', habitat: 'water',
        walkSpeed: walk, fleeSpeed: walk * F.fleeMul * (F.fleeBase + f.pull), fleeRadius: F.fleeRadius,
        idleTime: F.idleTime, wanderTime: F.wanderTime, herd,
        scale: F.scale, hover: [0, 0], bob: [0, 0], maxStep: 99, weight: f.bite * F.weightMul, glow: 0,
        swimBand: F.swimBand, school: herd[1] >= F.minSchool && !eel ? len * F.spreadPerLength * Math.sqrt(herd[1]) : undefined,
        anim: `swim_${f.look.shape}`, fish: f,
      };
    }
  }
  return out;
}

const CREATURES = {
  // ---- Earth: classic-ish, stylized ---------------------------------------
  deer: {
    planet: 'earth', name: 'Deer', motion: 'walk',
    walkSpeed: 1.6, fleeSpeed: 7, fleeRadius: 12, idleTime: [3, 8], wanderTime: [2, 5],
    herd: [2, 4], scale: [0.9, 1.15], hover: [0, 0], bob: [0, 0], maxStep: 1, weight: 2, glow: 0,
  },
  rabbit: {
    planet: 'earth', name: 'Rabbit', motion: 'hop',
    walkSpeed: 1.8, fleeSpeed: 6, fleeRadius: 8, idleTime: [1.5, 5], wanderTime: [1, 3],
    herd: [2, 5], scale: [1.2, 1.5], hover: [0, 0], bob: [0, 0], maxStep: 1, weight: 3, glow: 0,
  },
  // Calm grazers: slow, and they only shuffle off when crowded (or hit)
  sheep: {
    planet: 'earth', name: 'Sheep', motion: 'walk',
    walkSpeed: 0.8, fleeSpeed: 3, fleeRadius: 2, idleTime: [4, 10], wanderTime: [2, 4],
    herd: [2, 5], scale: [0.9, 1.1], hover: [0, 0], bob: [0, 0], maxStep: 1, weight: 2.5, glow: 0, ranch: 'wool',
  },
  cow: {
    planet: 'earth', name: 'Cow', motion: 'walk',
    walkSpeed: 0.7, fleeSpeed: 2.8, fleeRadius: 2, idleTime: [5, 12], wanderTime: [2, 4],
    herd: [2, 5], scale: [0.95, 1.1], hover: [0, 0], bob: [0, 0], maxStep: 1, weight: 2, glow: 0, ranch: 'hide',
  },
  swallow: {
    planet: 'earth', name: 'Swallow', motion: 'fly',
    walkSpeed: 4, fleeSpeed: 9, fleeRadius: 6, idleTime: [1, 3], wanderTime: [3, 7],
    herd: [3, 6], scale: [1.5, 1.9], hover: [3, 7], bob: [0.35, 0.6], maxStep: 99, weight: 2, glow: 0,
  },
  // ---- Sequoia: alien bipeds and grazers, beige / dry olive -----------------
  sparkit: {
    planet: 'sequoia', name: 'Sparkit', motion: 'walk',
    walkSpeed: 2.2, fleeSpeed: 7.5, fleeRadius: 9, idleTime: [1, 4], wanderTime: [1, 3],
    herd: [3, 6], scale: [0.85, 1.1], hover: [0, 0], bob: [0, 0], maxStep: 1, weight: 3, glow: 1,
  },
  shellkin: {
    planet: 'sequoia', name: 'Shellkin', motion: 'walk',
    walkSpeed: 0.7, fleeSpeed: 1.6, fleeRadius: 5, idleTime: [4, 10], wanderTime: [3, 6],
    herd: [1, 3], scale: [0.9, 1.3], hover: [0, 0], bob: [0, 0], maxStep: 1, weight: 2, glow: 0,
  },
  crane: {
    planet: 'sequoia', name: 'Crane', motion: 'walk',
    walkSpeed: 1.2, fleeSpeed: 5, fleeRadius: 11, idleTime: [3, 8], wanderTime: [2, 5],
    herd: [1, 3], scale: [0.95, 1.15], hover: [0, 0], bob: [0, 0], maxStep: 1, weight: 2, glow: 0,
  },
  raptor: {
    planet: 'sequoia', name: 'Raptor', motion: 'walk',
    walkSpeed: 2.5, fleeSpeed: 10, fleeRadius: 14, idleTime: [2, 5], wanderTime: [2, 4],
    herd: [2, 3], scale: [0.95, 1.1], hover: [0, 0], bob: [0, 0], maxStep: 1, weight: 1.5, glow: 0,
  },
  // ---- Cinder: volcanic -----------------------------------------------------
  emberBeetle: {
    planet: 'cinder', name: 'Ember beetle', motion: 'walk',
    walkSpeed: 1.0, fleeSpeed: 3.5, fleeRadius: 6, idleTime: [2, 6], wanderTime: [2, 5],
    herd: [3, 6], scale: [0.85, 1.25], hover: [0, 0], bob: [0, 0], maxStep: 1, weight: 1, glow: 1.4,
  },
  // ---- Vesper: dunes --------------------------------------------------------
  duneSkimmer: {
    planet: 'vesper', name: 'Dune skimmer', motion: 'fly',
    walkSpeed: 3, fleeSpeed: 8, fleeRadius: 10, idleTime: [1, 3], wanderTime: [3, 7],
    herd: [2, 4], scale: [0.9, 1.2], hover: [0.7, 1.2], bob: [0.12, 0.4], maxStep: 99, weight: 1, glow: 0.4,
  },
  // ---- Halcyon: crystal fields ----------------------------------------------
  crystalGrazer: {
    planet: 'halcyon', name: 'Crystal grazer', motion: 'walk',
    walkSpeed: 1.1, fleeSpeed: 4.5, fleeRadius: 10, idleTime: [3, 9], wanderTime: [2, 5],
    herd: [2, 4], scale: [0.9, 1.2], hover: [0, 0], bob: [0, 0], maxStep: 1, weight: 1, glow: 0.9,
  },
  // ---- Tessaly: frost -------------------------------------------------------
  frostMoth: {
    planet: 'tessaly', name: 'Frost moth', motion: 'fly',
    walkSpeed: 2.2, fleeSpeed: 5, fleeRadius: 5, idleTime: [1, 3], wanderTime: [2, 5],
    herd: [3, 6], scale: [0.8, 1.2], hover: [1.2, 3.5], bob: [0.3, 0.8], maxStep: 99, weight: 1, glow: 0.5,
  },
  // ---- Umbra: the dark world ------------------------------------------------
  glowJelly: {
    planet: 'umbra', name: 'Glow jelly', motion: 'float',
    walkSpeed: 0.6, fleeSpeed: 1.5, fleeRadius: 4, idleTime: [3, 7], wanderTime: [4, 8],
    herd: [2, 5], scale: [0.8, 1.4], hover: [2.5, 5], bob: [0.4, 0.25], maxStep: 99, weight: 1, glow: 0.9,
  },
  // ---- Verdance (jungle moon of Brontes) ------------------------------------
  canopyGlider: {
    planet: 'verdance', name: 'Canopy glider', motion: 'fly',
    walkSpeed: 3.2, fleeSpeed: 7, fleeRadius: 7, idleTime: [1, 3], wanderTime: [3, 7],
    herd: [2, 4], scale: [0.9, 1.2], hover: [4, 8], bob: [0.5, 0.3], maxStep: 99, weight: 1, glow: 0.5,
  },
  vineMonkey: {
    planet: 'verdance', name: 'Vine monkey', motion: 'hop',
    walkSpeed: 2.4, fleeSpeed: 7, fleeRadius: 9, idleTime: [1.5, 4], wanderTime: [1, 3],
    herd: [3, 5], scale: [0.9, 1.15], hover: [0, 0], bob: [0, 0], maxStep: 2, weight: 1.5, glow: 0,
  },
  // ---- Mirewood (jungle moon of Aurelia) ------------------------------------
  swampWader: {
    planet: 'mirewood', name: 'Swamp wader', motion: 'walk',
    walkSpeed: 1.0, fleeSpeed: 4, fleeRadius: 10, idleTime: [3, 8], wanderTime: [2, 5],
    herd: [1, 3], scale: [0.95, 1.2], hover: [0, 0], bob: [0, 0], maxStep: 1, weight: 1, glow: 0.3,
  },
  mireToad: {
    planet: 'mirewood', name: 'Mire toad', motion: 'hop',
    walkSpeed: 1.4, fleeSpeed: 4.5, fleeRadius: 6, idleTime: [2, 6], wanderTime: [0.8, 2],
    herd: [2, 5], scale: [0.9, 1.3], hover: [0, 0], bob: [0, 0], maxStep: 1, weight: 1.5, glow: 0.8,
  },
  // ==== Sea life (openspec ocean-life). The fish are derived from the
  // fishing table (fishFauna, above); these are each sea's other creatures
  // ---- Earth: shore crabs, drifting jellies, sea turtles ------------------
  crab: {
    planet: 'earth', name: 'Shore crab', motion: 'walk', habitat: 'seabed',
    walkSpeed: 0.6, fleeSpeed: 2.2, fleeRadius: 4, idleTime: [2, 6], wanderTime: [1.5, 4],
    herd: [2, 4], scale: [0.9, 1.3], hover: [0, 0], bob: [0, 0], maxStep: 1, weight: 2, glow: 0,
  },
  jellyfish: {
    planet: 'earth', name: 'Sea jelly', motion: 'drift', habitat: 'water',
    walkSpeed: 0.22, fleeSpeed: 0.45, fleeRadius: 0, idleTime: [3, 8], wanderTime: [6, 12],
    herd: [3, 6], scale: [0.7, 1.2], hover: [0, 0], bob: [0.22, 0.2], maxStep: 99, weight: 1.2, glow: 0.35,
    swimBand: [0.45, 0.9],
  },
  seaTurtle: {
    planet: 'earth', name: 'Sea turtle', motion: 'swim', habitat: 'water',
    walkSpeed: 0.9, fleeSpeed: 2.4, fleeRadius: 5, idleTime: [2, 5], wanderTime: [5, 10],
    herd: [1, 2], scale: [0.9, 1.2], hover: [0, 0], bob: [0.08, 0.3], maxStep: 99, weight: 0.8, glow: 0,
    swimBand: [0.3, 0.8],
  },
  // ---- Sequoia: glowing squid shoals, shell crawlers on the bed ------------
  lanternSquid: {
    planet: 'sequoia', name: 'Lantern squid', motion: 'swim', habitat: 'water',
    walkSpeed: 1.1, fleeSpeed: 5.5, fleeRadius: 6, idleTime: [1.5, 4], wanderTime: [3, 6],
    herd: [3, 5], scale: [0.85, 1.15], hover: [0, 0], bob: [0.05, 0.5], maxStep: 99, weight: 1.5, glow: 1.2,
    swimBand: [0.2, 0.7], school: 2.2,
  },
  shellCrawler: {
    planet: 'sequoia', name: 'Shell crawler', motion: 'walk', habitat: 'seabed',
    walkSpeed: 0.4, fleeSpeed: 1.2, fleeRadius: 3, idleTime: [3, 8], wanderTime: [2, 5],
    herd: [1, 3], scale: [0.9, 1.3], hover: [0, 0], bob: [0, 0], maxStep: 1, weight: 1.5, glow: 0.5,
  },
  // ---- Verdance: a river otter of the mangroves ----------------------------
  mossOtter: {
    planet: 'verdance', name: 'Moss otter', motion: 'swim', habitat: 'water',
    walkSpeed: 1.5, fleeSpeed: 5, fleeRadius: 7, idleTime: [1, 3], wanderTime: [2, 5],
    herd: [1, 3], scale: [0.9, 1.1], hover: [0, 0], bob: [0.06, 0.6], maxStep: 99, weight: 1.2, glow: 0,
    swimBand: [0.5, 0.95],
  },
  // ---- Mirewood: a glowing newt on the peat bed ----------------------------
  bogNewt: {
    planet: 'mirewood', name: 'Bog newt', motion: 'walk', habitat: 'seabed',
    walkSpeed: 0.7, fleeSpeed: 2.6, fleeRadius: 4, idleTime: [2, 6], wanderTime: [1.5, 4],
    herd: [2, 4], scale: [0.9, 1.2], hover: [0, 0], bob: [0, 0], maxStep: 1, weight: 1.5, glow: 0.9,
  },
} satisfies Record<string, FaunaSpecies>;

/** The hand-built creatures (each has its own model in FaunaModels.ts). */
export type FaunaCreatureId = keyof typeof CREATURES;

/** Every species: the creatures, then the swimming fish derived from FISH_ROSTERS. */
export const FAUNA_SPECIES: typeof CREATURES & Record<string, FaunaSpecies> = { ...CREATURES, ...fishFauna() };

export type FaunaSpeciesId = string;

export function habitatOf(s: FaunaSpecies): FaunaHabitat {
  return s.habitat ?? 'land';
}

/** True for species that live in the water (swimmers, drifters and seabed crawlers). */
export function isWaterLife(s: FaunaSpecies): boolean {
  return habitatOf(s) !== 'land';
}

export const FAUNA_SPECIES_IDS = Object.keys(FAUNA_SPECIES) as FaunaSpeciesId[];

/** The species living on a planet (empty for lifeless worlds). */
export function faunaRoster(planetId: string): FaunaSpeciesId[] {
  return FAUNA_SPECIES_IDS.filter(id => FAUNA_SPECIES[id].planet === planetId);
}

/**
 * Throws if a species is on two planets, or a lifeless world has any, or a
 * fish is on two fishing tables, or - when `waterPlanets` is given - water
 * life lives on a world without water. Run once at startup (a cheap assert).
 */
export function validateFaunaRosters(knownPlanets: Iterable<string>, waterPlanets?: Iterable<string>): void {
  const planets = new Set(knownPlanets);
  const seen = new Map<FaunaSpeciesId, string>();
  for (const p of planets) {
    for (const id of faunaRoster(p)) {
      const other = seen.get(id);
      if (other && other !== p) throw new Error(`[Fauna] species ${id} is on both ${other} and ${p}`);
      seen.set(id, p);
    }
  }
  // A roster for a planet that isn't in this build is harmless (it just
  // never spawns): worlds are added in parallel, so only note it.
  for (const id of FAUNA_SPECIES_IDS) {
    const p = FAUNA_SPECIES[id].planet;
    if (!planets.has(p)) console.info(`[Fauna] ${id} lives on ${p}, which is not in this build`);
  }
  for (const p of FAUNA_LIFELESS) {
    if (faunaRoster(p).length) throw new Error(`[Fauna] lifeless world ${p} has fauna: ${faunaRoster(p).join(', ')}`);
    if (FISH_ROSTERS[p]?.length) throw new Error(`[Fauna] lifeless world ${p} has fish`);
  }
  const fishHome = new Map<ItemType, string>();
  for (const [p, fish] of Object.entries(FISH_ROSTERS)) {
    for (const f of fish) {
      const other = fishHome.get(f.item);
      if (other !== undefined && other !== p) throw new Error(`[Fauna] fish ${f.name} is on both ${other} and ${p}`);
      fishHome.set(f.item, p);
    }
  }
  if (waterPlanets) {
    const wet = new Set(waterPlanets);
    for (const id of FAUNA_SPECIES_IDS) {
      const s = FAUNA_SPECIES[id];
      if (isWaterLife(s) && planets.has(s.planet) && !wet.has(s.planet)) {
        throw new Error(`[Fauna] water species ${id} lives on ${s.planet}, which has no water`);
      }
    }
  }
}
