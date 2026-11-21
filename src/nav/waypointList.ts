import { NAVIGATION_CONFIG } from '../config/NavigationConfig';

/**
 * Waypoints (spec waypoints; Pale Blue Dot starter-missions G3): at most
 * four across every planet, oldest first; a fifth drops the oldest. The
 * pure list rules; keeping and drawing them is Waypoints.ts and the map.
 */
export interface Waypoint {
  id: string;
  body: string;       // the planet / moon it is on
  tile: number;       // the tile it marks (it moves with its body)
  setAt: number;      // ms, when it was set
  far?: boolean;      // set 200 m+ from where the player stood (missions: reached)
}

/** Add a waypoint; with MAX already set the oldest goes. Returns the new list. */
export function addWaypoint(list: readonly Waypoint[], w: Waypoint): Waypoint[] {
  const next = [...list, w];
  while (next.length > NAVIGATION_CONFIG.MAX_WAYPOINTS) next.shift();
  return next;
}

export function removeWaypoint(list: readonly Waypoint[], id: string): Waypoint[] {
  return list.filter(w => w.id !== id);
}

/** A list from untrusted data (a save, the network): well-formed entries only, capped. */
export function sanitizeWaypoints(raw: unknown): Waypoint[] {
  if (!Array.isArray(raw)) return [];
  const out: Waypoint[] = [];
  for (const w of raw) {
    if (!w || typeof w !== 'object') continue;
    const { id, body, tile, setAt, far } = w as Record<string, unknown>;
    if (typeof id === 'string' && typeof body === 'string' && Number.isInteger(tile) && (tile as number) >= 0 && typeof setAt === 'number') {
      out.push({ id, body, tile: tile as number, setAt, ...(far === true ? { far: true } : {}) });
    }
  }
  return out.slice(-NAVIGATION_CONFIG.MAX_WAYPOINTS);
}
