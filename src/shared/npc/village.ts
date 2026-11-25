// A village's mutable state and its rules (openspec friendship-npcs,
// village-requests; design 3, 4 and 8): the food store, the open requests
// and the structure being built. The state is the data of one `village`
// record; every change - a delivery from a client, time passing on the
// server or in single player - goes through these functions.
//
// Time is the planet's NPC clock T (seconds; it runs only while someone is
// on the planet, plus the capped catch-up on arrival - worldTime.ts). The
// state is event based: the food store is kept as (amount at foodT) and
// read with `foodAt(v, T)`, so advancing time only changes the record when
// something happens (a slot reopens, the store runs low). That keeps the
// server's writes few, and advancing an hour in one step gives the same
// state as advancing it in many small ones.
//
// Pure: no three.js, no DOM.
import { INHABITED_WORLDS, NPC_CONFIG, RequestFamily, REQUEST_FAMILIES } from '../../config/NpcConfig';
import { intIn, pick, pickWeighted, rngFor } from './rng';

/** One open request. `item` for supply / build, `art` (a piece id) for collect. */
export interface VillageRequest {
  id: number;            // unique within the village (the draw number)
  fam: RequestFamily;
  item?: number;         // ItemType
  art?: string;          // ArtPiece id (NpcConfig; the item itself is task 4.4)
  need: number;
  got: number;
  fr: number;            // friendship the whole request gives
  structure?: number;    // build: which structure and stage it raises
  stage?: number;
}

export interface VillageState {
  pop: number;           // residents (sizes the food use)
  food: number;          // meals in the store at time foodT
  foodT: number;
  structure: number;     // index into NPC_CONFIG.STRUCTURES being built (== length: all built)
  stage: number;         // stages of it finished
  art: string[];         // art pieces on display
  draws: number;         // requests drawn so far (the request rng's counter)
  requests: VillageRequest[];
  reopen: number[];      // T at which each closed slot opens again
}

/** Which village: the request draws are seeded by it. */
export interface VillageCtx {
  worldSeed: number;
  body: string;
  index: number;
}

export interface AdvanceOptions {
  // A catch-up on arrival (not a tick): the store never drops below its low
  // mark this way - a long absence opens the supply request instead of
  // starving the village (design, risks)
  catchUp?: boolean;
}

const F = NPC_CONFIG.FOOD;
const R = NPC_CONFIG.REQUESTS;
const STRUCTURES = NPC_CONFIG.STRUCTURES;
// Floating-point slack when comparing the store to its low mark
const FOOD_EPS = 1e-6;

export const foodLowMark = (v: VillageState): number => F.LOW_PER_RESIDENT * v.pop;
const useRate = (v: VillageState): number => (F.USE_PER_RESIDENT_PER_HOUR * v.pop) / 3600;

/** Meals in the store at time t. */
export function foodAt(v: VillageState, t: number): number {
  return Math.max(0, v.food - useRate(v) * Math.max(0, t - v.foodT));
}

const isLow = (v: VillageState, t: number) => foodAt(v, t) <= foodLowMark(v) + FOOD_EPS;
const hasOpen = (v: VillageState, fam: RequestFamily) => v.requests.some(q => q.fam === fam);
const structureDone = (v: VillageState) => v.structure >= STRUCTURES.length;

/** Art pieces a collect request on this body could still ask for (never its own). */
function artWanted(body: string, v: VillageState): string[] {
  return INHABITED_WORLDS
    .filter(w => w.body !== body)
    .map(w => w.art.id)
    .filter(id => !v.art.includes(id) && !v.requests.some(q => q.art === id));
}

/**
 * Draw the village's next request at time t (deterministic: seeded by the
 * village and its draw count). A low store with no supply request open
 * forces supply; otherwise the families are weighted, skipping a build when
 * one is open or everything is built, a second supply, and a collect when
 * no piece is left.
 */
export function drawRequest(ctx: VillageCtx, v: VillageState, t: number): VillageRequest | null {
  const r = rngFor(ctx.worldSeed, ctx.body, ctx.index, 'request', v.draws);
  v.draws++;
  const art = artWanted(ctx.body, v);
  let fam: RequestFamily | undefined;
  if (isLow(v, t) && !hasOpen(v, 'supply')) fam = 'supply';
  else {
    // one request of a family at a time (collects ask for different pieces)
    const can: Record<RequestFamily, boolean> = {
      supply: !hasOpen(v, 'supply'),
      build: !structureDone(v) && !hasOpen(v, 'build'),
      collect: art.length > 0,
    };
    fam = pickWeighted(r, REQUEST_FAMILIES, REQUEST_FAMILIES.map(f => (can[f] ? R.WEIGHTS[f] : 0)));
  }
  if (!fam) return null;
  const base = { id: v.draws, fam, got: 0, fr: R.FRIENDSHIP[fam] };
  if (fam === 'supply') {
    const food = pick(r, NPC_CONFIG.SUPPLY_FOODS);
    return { ...base, item: food.item, need: intIn(r, food.amount) };
  }
  if (fam === 'build') {
    const s = STRUCTURES[v.structure].stages[v.stage];
    return { ...base, item: s.item, need: s.amount, structure: v.structure, stage: v.stage };
  }
  return { ...base, art: pick(r, art), need: R.COLLECT_AMOUNT };
}

/** Open a request now, in a free slot if there is one waiting. */
function openRequest(ctx: VillageCtx, v: VillageState, t: number): void {
  const q = drawRequest(ctx, v, t);
  if (q) v.requests.push(q);
  // nothing could be drawn: try again after the delay
  else v.reopen.push(t + R.REOPEN_DELAY_S);
}

/** A low store opens a supply request if none is open (taking a waiting slot first). */
function supplyIfLow(ctx: VillageCtx, v: VillageState, t: number): void {
  if (!isLow(v, t) || hasOpen(v, 'supply')) return;
  if (v.reopen.length) {
    v.reopen.sort((a, b) => a - b);
    v.reopen.shift();
  }
  openRequest(ctx, v, t);
}

/** A new village at time t: a full store and its open requests drawn. */
export function createVillage(ctx: VillageCtx, pop: number, t: number): VillageState {
  const v: VillageState = {
    pop, food: F.START_PER_RESIDENT * pop, foodT: t,
    structure: 0, stage: 0, art: [], draws: 0, requests: [], reopen: [],
  };
  for (let i = 0; i < R.OPEN; i++) openRequest(ctx, v, t);
  return v;
}

const clone = (v: VillageState): VillageState => JSON.parse(JSON.stringify(v));

/**
 * Time passes from t0 to t1: slots reopen and the store runs low, in the
 * order they happen. Returns a new state (the input is not changed).
 */
export function advanceVillage(ctx: VillageCtx, input: VillageState, t0: number, t1: number, opts: AdvanceOptions = {}): VillageState {
  const v = clone(input);
  if (!(t1 > t0)) return v;
  const startFood = foodAt(v, t0);
  let t = t0;
  supplyIfLow(ctx, v, t);
  for (;;) {
    const reopenAt = v.reopen.length ? Math.min(...v.reopen) : Infinity;
    // when the store reaches its low mark (only matters with no supply open)
    const rate = useRate(v);
    const f = foodAt(v, t), low = foodLowMark(v);
    const lowAt = !hasOpen(v, 'supply') && f > low + FOOD_EPS && rate > 0 ? t + (f - low) / rate : Infinity;
    const next = Math.min(reopenAt, lowAt);
    if (next > t1) break;
    t = Math.max(t, next);
    if (reopenAt <= lowAt) {
      v.reopen.splice(v.reopen.indexOf(reopenAt), 1);
      openRequest(ctx, v, t);
    }
    supplyIfLow(ctx, v, t);
  }
  if (opts.catchUp) {
    // the store as of t1, floored at the low mark (or where it already was)
    v.food = Math.max(foodAt(v, t1), Math.min(startFood, foodLowMark(v)));
    v.foodT = t1;
  }
  return v;
}

export interface DeliverResult {
  village: VillageState;
  taken: number;          // items the request accepted (never past what it needed)
  completed: boolean;
}

/**
 * A delivery of n items toward request `reqId` at time t. Takes at most what
 * the request still needs; a completed request applies its effect (meals
 * into the store, the structure's next stage, the piece on display) and its
 * slot reopens after REOPEN_DELAY_S. Returns a new state.
 */
export function deliver(ctx: VillageCtx, input: VillageState, reqId: number, n: number, t: number): DeliverResult {
  const v = clone(input);
  const q = v.requests.find(x => x.id === reqId);
  if (!q || !(n > 0)) return { village: v, taken: 0, completed: false };
  const taken = Math.min(Math.floor(n), q.need - q.got);
  q.got += taken;
  if (q.got < q.need) return { village: v, taken, completed: false };
  v.requests.splice(v.requests.indexOf(q), 1);
  if (q.fam === 'supply') {
    const meals = NPC_CONFIG.SUPPLY_FOODS.find(f => f.item === q.item)?.meals ?? 0;
    v.food = foodAt(v, t) + meals * q.need;
    v.foodT = t;
  } else if (q.fam === 'build' && q.structure === v.structure && q.stage === v.stage) {
    v.stage++;
    if (v.stage >= STRUCTURES[v.structure].stages.length) { v.structure++; v.stage = 0; }
  } else if (q.fam === 'collect' && q.art && !v.art.includes(q.art)) {
    v.art.push(q.art);
  }
  // the slot reopens later (an extra supply request opened over the count does not)
  if (v.requests.length + v.reopen.length < R.OPEN) v.reopen.push(t + R.REOPEN_DELAY_S);
  supplyIfLow(ctx, v, t);
  return { village: v, taken, completed: true };
}
