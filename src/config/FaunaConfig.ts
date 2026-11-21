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

export type FaunaMotion =
  | 'walk'   // on the ground
  | 'hop'    // on the ground; the hop arc is in the baked clip
  | 'fly'    // hovers above the ground, flaps when it moves
  | 'float'; // drifts high and slow (jellies)

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
  /** Hard caps. */
  maxCreatures: 48,
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

export const FAUNA_SPECIES = {
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
} satisfies Record<string, FaunaSpecies>;

export type FaunaSpeciesId = keyof typeof FAUNA_SPECIES;

export const FAUNA_SPECIES_IDS = Object.keys(FAUNA_SPECIES) as FaunaSpeciesId[];

/** The species living on a planet (empty for lifeless worlds). */
export function faunaRoster(planetId: string): FaunaSpeciesId[] {
  return FAUNA_SPECIES_IDS.filter(id => FAUNA_SPECIES[id].planet === planetId);
}

/**
 * Throws if a species is on two planets, or a lifeless world has any.
 * Run once at startup (a cheap assert: twelve-odd entries).
 */
export function validateFaunaRosters(knownPlanets: Iterable<string>): void {
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
  }
}
