// Deterministic hashing and random draws for the NPC rules (openspec
// friendship-npcs, design 1): everything about a world's people is derived
// from the game world's seed and a few labels, so the client and the server
// (which runs this same code from server-js/npc-core.js) always agree.
// Pure: no three.js, no DOM.

/** FNV-1a over the parts (joined with a separator), then a final avalanche. */
export function hashParts(...parts: ReadonlyArray<string | number>): number {
  let h = 0x811c9dc5;
  const s = parts.join('\u0001');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** A seeded generator of floats in [0, 1) (mulberry32). */
export type Rng = () => number;

export function makeRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rngFor = (...parts: ReadonlyArray<string | number>): Rng => makeRng(hashParts(...parts));

/** An integer in the inclusive range [lo, hi]. */
export const intIn = (r: Rng, range: readonly [number, number]): number =>
  range[0] + Math.floor(r() * (range[1] - range[0] + 1));

export function pick<T>(r: Rng, list: readonly T[]): T {
  return list[Math.floor(r() * list.length)];
}

/** A weighted pick: `weights[i]` is item i's relative chance (0 = never). */
export function pickWeighted<T>(r: Rng, items: readonly T[], weights: readonly number[]): T | undefined {
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (total <= 0) return undefined;
  let x = r() * total;
  for (let i = 0; i < items.length; i++) {
    x -= Math.max(0, weights[i]);
    if (x < 0) return items[i];
  }
  return items[items.length - 1];
}
