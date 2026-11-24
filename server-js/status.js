// A player's status frame (openspec admin-monitor, design 1): what the
// client's src/net/AdminReport.ts encodeStatus sends on the 'status' live
// channel, checked field by field before the server keeps it - only what the
// portal shows, bounded. scripts/admin-monitor.test.ts round-trips the
// client's frame through this.
//
//   { v: 1, inv: [[slot, item, count, uses?], ...], suit: { worn, tankS },
//     ride: 'walk' | 'rocket', m: { done: [id...], now: id | null, prog: [n...] } }

export const STATUS_CHANNEL = 'status';  // the live channel the server keeps, not relays
const MAX_STATUS_SLOTS = 64;             // inventory entries kept
const MAX_STATUS_MISSIONS = 400;         // done mission ids kept
const MAX_STATUS_OBJECTIVES = 16;        // objective counts kept for the current mission
const MAX_INT = 1_000_000;               // bound on a slot index / item id / count / uses
const MISSION_ID = /^[a-zA-Z0-9_-]{1,40}$/;

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const isInt = (v) => Number.isInteger(v);

/** The frame as the server keeps it, or null when it isn't one. */
export function cleanStatus(d) {
  if (!d || typeof d !== 'object' || d.v !== 1) return null;
  const inv = Array.isArray(d.inv)
    ? d.inv.slice(0, MAX_STATUS_SLOTS)
      .filter(e => Array.isArray(e) && e.length >= 3 && e.length <= 4 && e.every(x => isInt(x) && x >= 0 && x < MAX_INT))
    : [];
  const suit = d.suit && typeof d.suit === 'object'
    ? { worn: d.suit.worn === true, tankS: isNum(d.suit.tankS) ? Math.max(0, d.suit.tankS) : 0 }
    : null;
  const ride = d.ride === 'rocket' ? 'rocket' : 'walk';
  const m = d.m && typeof d.m === 'object' ? d.m : {};
  return {
    v: 1,
    inv,
    suit,
    ride,
    m: {
      done: Array.isArray(m.done) ? m.done.filter(x => typeof x === 'string' && MISSION_ID.test(x)).slice(0, MAX_STATUS_MISSIONS) : [],
      now: typeof m.now === 'string' && MISSION_ID.test(m.now) ? m.now : null,
      prog: Array.isArray(m.prog) ? m.prog.filter(isNum).slice(0, MAX_STATUS_OBJECTIVES) : [],
    },
  };
}
