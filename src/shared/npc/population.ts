// Who lives on a world (openspec friendship-npcs, npc-population; design 1):
// names, roles and villages derived from (worldSeed, bodyId), never stored.
// Only a village's mutable state is a record (village.ts).
//
// Homes are placed separately (`placePopulation`), because where the ground
// is walkable is something only a client knows: the server has no terrain.
// Placement draws candidate spots from a seeded sequence and keeps the first
// one the caller's GroundProbe accepts, so every client (same terrain, same
// probe) gets the same homes, and the server - which never needs a home -
// builds the same people without one. A spot no probe accepted within the
// tries is still returned, flagged `grounded: false`, for the motion code
// (task 3.3) to settle onto the nearest ground.
//
// Pure: no three.js, no DOM.
import { INHABITED_WORLDS, NPC_CONFIG, NpcRole, inhabitedWorld } from '../../config/NpcConfig';
import type { Vec3 } from '../vec3';
import { Rng, intIn, pick, rngFor } from './rng';

export interface Npc {
  id: string;            // `${body}:${index}`, stable for a game world
  name: string;
  role: NpcRole;
  village: number;       // index into Population.villages
  species: string;
}

export interface VillageInfo {
  index: number;
  name: string;
  elder: string;         // npc id
  residents: string[];   // npc ids, the elder first
}

export interface Population {
  body: string;
  species: string;
  npcs: Npc[];
  villages: VillageInfo[];
}

/** Capitalised syllable name; unique among `taken`. */
function makeName(r: Rng, s: { first: readonly string[]; middle: readonly string[]; last: readonly string[] }, taken: Set<string>): string {
  for (let attempt = 0; ; attempt++) {
    const mid = r() < 0.5 ? pick(r, s.middle) : '';
    let n = pick(r, s.first) + mid + pick(r, s.last);
    // Every combination taken (a tiny syllable table): number the repeat
    if (attempt > 32) n += ` ${attempt - 32}`;
    n = n.charAt(0).toUpperCase() + n.slice(1).toLowerCase();
    if (!taken.has(n)) { taken.add(n); return n; }
  }
}

/** A world's people, or null when nobody lives on the body. */
export function buildPopulation(worldSeed: number, body: string): Population | null {
  const world = inhabitedWorld(body);
  if (!world) return null;
  const r = rngFor(worldSeed, body, 'population');
  const count = intIn(r, world.population);
  const villages: VillageInfo[] = Array.from({ length: world.villages }, (_, i) => ({
    index: i, name: world.villageNames[i], elder: '', residents: [],
  }));
  const npcs: Npc[] = [];
  const taken = new Set<string>();
  for (let i = 0; i < count; i++) {
    // The first `villages` people are the elders, one each; the rest are
    // spread round the villages, so every village has someone besides its elder
    // when the count allows
    const village = i % world.villages;
    const role: NpcRole = i < world.villages ? 'elder' : 'villager';
    const npc: Npc = { id: `${body}:${i}`, name: makeName(r, world.species.syllables, taken), role, village, species: world.species.id };
    npcs.push(npc);
    villages[village].residents.push(npc.id);
    if (role === 'elder') villages[village].elder = npc.id;
  }
  return { body, species: world.species.id, npcs, villages };
}

/** Every inhabited body id. */
export const inhabitedBodies = (): string[] => INHABITED_WORLDS.map(w => w.body);

// ---- placement ---------------------------------------------------------------

/** True when an NPC can stand on the ground under this unit direction. */
export type GroundProbe = (dir: Vec3) => boolean;

export interface Spot { dir: Vec3; grounded: boolean }

export interface Placement {
  villages: Spot[];                 // village centres, by index
  homes: Map<string, Spot>;         // npc id -> home
}

export interface PlacementInput {
  radiusM: number;                  // the body's radius (metres)
  ground: GroundProbe;
  anchor?: Vec3;                    // the first village sits near this (the spawn); default a seeded spot
}

const norm = (v: Vec3): Vec3 => { const l = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / l, y: v.y / l, z: v.z / l }; };
const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
/** Angle between two unit directions (radians). */
export const angleBetween = (a: Vec3, b: Vec3): number => Math.acos(Math.max(-1, Math.min(1, dot(a, b))));

/** A direction uniformly spread over the cap of half-angle `maxRad` round `c`. */
function inCap(r: Rng, c: Vec3, maxRad: number): Vec3 {
  // a tangent basis round c
  const helper = Math.abs(c.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
  const t1 = norm({ x: helper.y * c.z - helper.z * c.y, y: helper.z * c.x - helper.x * c.z, z: helper.x * c.y - helper.y * c.x });
  const t2 = { x: c.y * t1.z - c.z * t1.y, y: c.z * t1.x - c.x * t1.z, z: c.x * t1.y - c.y * t1.x };
  const cosT = 1 - r() * (1 - Math.cos(maxRad));
  const sinT = Math.sqrt(Math.max(0, 1 - cosT * cosT));
  const phi = r() * 2 * Math.PI;
  const cp = Math.cos(phi) * sinT, sp = Math.sin(phi) * sinT;
  return norm({ x: c.x * cosT + t1.x * cp + t2.x * sp, y: c.y * cosT + t1.y * cp + t2.y * sp, z: c.z * cosT + t1.z * cp + t2.z * sp });
}

/** A seeded spot anywhere on the sphere. */
function anywhere(r: Rng): Vec3 {
  const z = r() * 2 - 1, phi = r() * 2 * Math.PI, s = Math.sqrt(1 - z * z);
  return { x: s * Math.cos(phi), y: s * Math.sin(phi), z };
}

/**
 * The first candidate (of `tries`) that `ok` accepts; else the first
 * candidate, flagged ungrounded. Deterministic for a given rng and probe.
 */
function firstAccepted(r: Rng, tries: number, draw: (r: Rng) => Vec3, ok: (d: Vec3) => boolean): Spot {
  let first: Vec3 | null = null;
  for (let i = 0; i < tries; i++) {
    const d = draw(r);
    first ??= d;
    if (ok(d)) return { dir: d, grounded: true };
  }
  return { dir: first!, grounded: false };
}

/**
 * Where each village and home is: centres on walkable ground near the
 * anchor (and apart from each other), homes on walkable ground within
 * VILLAGE.RADIUS_M of their centre. Same inputs, same spots.
 */
export function placePopulation(worldSeed: number, pop: Population, input: PlacementInput): Placement {
  const V = NPC_CONFIG.VILLAGE;
  const r = rngFor(worldSeed, pop.body, 'placement');
  const anchor = input.anchor ? norm(input.anchor) : anywhere(r);
  const minGapRad = V.MIN_GAP_M / input.radiusM;
  const homeRad = V.RADIUS_M / input.radiusM;
  const homeGapRad = V.HOME_MIN_GAP_M / input.radiusM;
  const villages: Spot[] = [];
  for (let i = 0; i < pop.villages.length; i++) {
    const around = i === 0 ? anchor : villages[0].dir;
    const ok = (d: Vec3) => input.ground(d) && villages.every(v => angleBetween(v.dir, d) >= minGapRad);
    // No walkable ground near the anchor (it is at sea): look ever wider,
    // up to the whole globe, before giving up
    let spread: number = i === 0 ? V.FIRST_SPREAD_RAD : V.SPREAD_RAD;
    let spot = firstAccepted(r, V.CENTRE_TRIES, (rr) => inCap(rr, around, spread), ok);
    for (let globe = 0; !spot.grounded && globe < V.GLOBE_ROUNDS; ) {
      if (spread >= Math.PI) globe++;
      spread = Math.min(Math.PI, spread * V.WIDEN);
      const wider = firstAccepted(r, V.CENTRE_TRIES, (rr) => inCap(rr, around, spread), ok);
      if (wider.grounded) spot = wider;
    }
    villages.push(spot);
  }
  const homes = new Map<string, Spot>();
  for (const v of pop.villages) {
    const centre = villages[v.index].dir;
    const placed: Vec3[] = [];
    for (const id of v.residents) {
      const spot = firstAccepted(r, V.HOME_TRIES, (rr) => inCap(rr, centre, homeRad),
        (d) => input.ground(d) && placed.every(p => angleBetween(p, d) >= homeGapRad));
      // No free ground left round the centre: stand on any walkable spot
      // there, gaps aside, before giving up on the ground
      const home = spot.grounded ? spot : firstAccepted(r, V.HOME_TRIES, (rr) => inCap(rr, centre, homeRad), input.ground);
      const best = home.grounded ? home : villages[v.index].grounded ? { dir: centre, grounded: true } : home;
      placed.push(best.dir);
      homes.set(id, best);
    }
  }
  return { villages, homes };
}
