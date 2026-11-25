// The travelling traders (openspec friendship-npcs, npc-trading; design 3
// and 4): a small band that belongs to no world, each on a route of
// inhabited worlds. A trader's state is the data of one `trader` record on
// the pseudo-planet `traders`.
//
// A trader keeps the time of the world it is on: its stay ends at that
// world's NPC clock `leaveT`, so it only moves on while time advances there
// (someone is on the world, or the catch-up on arrival) - a trader on an
// empty world waits. On arrival it takes the new world's current clock as
// the start of its stay (0 for a world nobody has visited yet: that world's
// clock starts at 0 when it is first created).
//
// Pure: no three.js, no DOM.
import { NPC_CONFIG, inhabitedWorld } from '../../config/NpcConfig';
import { Rng, intIn, pick, rngFor } from './rng';

export interface ItemCount { item: number; n: number }

/** One barter: the trader gives `give` for the player's `take`. */
export interface TraderOffer {
  give: ItemCount;
  take: ItemCount;       // before the friendship discount (task 4.5)
  stock: number;         // trades left until the next restock
  max: number;
  from: string;          // the world the goods come from
}

export interface TraderState {
  at: string;            // the body it is on now (never two at once)
  leg: number;           // index of `at` in its route
  visits: number;        // arrivals so far (seeds the offers)
  leaveT: number;        // `at`'s NPC clock when it moves on
  restockT: number;      // `at`'s NPC clock when its offers refill next
  offers: TraderOffer[];
}

const T = NPC_CONFIG.TRADERS;

/** The NPC clock of a body now (0 for one never visited). */
export type ClockOf = (body: string) => number;

const goodsOf = (body: string): readonly number[] => inhabitedWorld(body)?.goods ?? [];

function drawOffer(r: Rng, from: string, here: string): TraderOffer {
  const give = pick(r, goodsOf(from));
  // what it wants: the general wants plus the visited world's own goods,
  // never what it is giving
  const wants = [...T.WANTS, ...goodsOf(here)].filter(i => i !== give);
  const max = intIn(r, T.STOCK);
  return { give: { item: give, n: intIn(r, T.GIVE) }, take: { item: pick(r, wants), n: intIn(r, T.TAKE) }, stock: max, max, from };
}

/**
 * The offers a trader brings to `here`, having come from `cameFrom`: the
 * first is always goods from `cameFrom`, the rest from any other world on
 * its route.
 */
export function drawOffers(worldSeed: number, traderIndex: number, visits: number, here: string, cameFrom: string): TraderOffer[] {
  const def = T.BAND[traderIndex];
  const r = rngFor(worldSeed, 'trader', traderIndex, visits);
  const elsewhere = def.route.filter(b => b !== here);
  const offers = [drawOffer(r, cameFrom, here)];
  while (offers.length < T.OFFERS) offers.push(drawOffer(r, pick(r, elsewhere), here));
  return offers;
}

function arrive(worldSeed: number, i: number, s: TraderState, leg: number, cameFrom: string, clockOf: ClockOf): void {
  const route = T.BAND[i].route;
  s.leg = leg;
  s.at = route[leg];
  s.visits++;
  const t = clockOf(s.at);
  s.leaveT = t + T.STAY_S;
  s.restockT = t + T.RESTOCK_S;
  s.offers = drawOffers(worldSeed, i, s.visits, s.at, cameFrom);
}

/** The band at the start of a game world: each trader at a seeded stop on its route. */
export function createTraders(worldSeed: number, clockOf: ClockOf): TraderState[] {
  return T.BAND.map((def, i) => {
    const r = rngFor(worldSeed, 'trader-start', i);
    const leg = Math.floor(r() * def.route.length);
    const s: TraderState = { at: def.route[leg], leg, visits: 0, leaveT: 0, restockT: 0, offers: [] };
    arrive(worldSeed, i, s, leg, def.route[(leg + def.route.length - 1) % def.route.length], clockOf);
    return s;
  });
}

/**
 * Time passes on `body` from t0 to t1: traders there restock and, at the
 * end of their stay, move to the next world on their route. Returns the
 * new states and which traders changed.
 */
export function advanceTradersOn(worldSeed: number, input: readonly TraderState[], body: string, t1: number, clockOf: ClockOf): { traders: TraderState[]; changed: number[] } {
  const traders: TraderState[] = JSON.parse(JSON.stringify(input));
  const changed: number[] = [];
  traders.forEach((s, i) => {
    let moved = false;
    while (s.at === body) {
      const next = Math.min(s.leaveT, s.restockT);
      if (next > t1) break;
      moved = true;
      if (s.restockT <= s.leaveT) {
        for (const o of s.offers) o.stock = o.max;
        s.restockT += T.RESTOCK_S;
      } else {
        const route = T.BAND[i].route;
        arrive(worldSeed, i, s, (s.leg + 1) % route.length, body, clockOf);
      }
    }
    if (moved) changed.push(i);
  });
  return { traders, changed };
}
