import { gameStorage } from '../engine/GameStorage';
import { netSync } from '../net/NetSync';
import { addWaypoint, removeWaypoint, sanitizeWaypoints, Waypoint } from './waypointList';

/**
 * The player's waypoints (spec waypoints): saved with the world the moment
 * they change, and online kept as this player's own NetSync record
 * ('waypoints', keyed by their name) so they follow the player and never
 * mix with anyone else's.
 */
const KIND = 'waypoints';

function playerKey(): string {
  let name = 'player';
  try { name = localStorage.getItem('tenebris_mp_name') || name; } catch { /* blocked */ }
  return name.replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 64) || 'player';
}

export class Waypoints {
  private list: Waypoint[] = sanitizeWaypoints(gameStorage.getWaypoints());
  private listeners = new Set<() => void>();

  constructor() {
    netSync.onRecord(KIND, (_planet, key, data) => {
      if (key !== playerKey()) return;  // someone else's
      this.list = sanitizeWaypoints((data as { list?: unknown } | null)?.list);
      gameStorage.saveWaypoints(this.list);
      this.changed(false);
    }, () => this.list.length ? [{ planet: 'system', key: playerKey(), data: { list: this.list } }] : []);
  }

  all(): readonly Waypoint[] {
    return this.list;
  }

  onChange(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  add(body: string, tile: number, far = false): void {
    const id = `${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`;
    this.list = addWaypoint(this.list, { id, body, tile, setAt: Date.now(), ...(far ? { far: true } : {}) });
    this.changed(true);
  }

  /** A far waypoint was reached: it counts once (missions: reached). */
  markReached(id: string): void {
    this.list = this.list.map(w => (w.id === id ? { id: w.id, body: w.body, tile: w.tile, setAt: w.setAt } : w));
    this.changed(true);
  }

  remove(id: string): void {
    this.list = removeWaypoint(this.list, id);
    this.changed(true);
  }

  /** The colour slot of a waypoint: its place in the order they were set. */
  indexOf(id: string): number {
    return this.list.findIndex(w => w.id === id);
  }

  private changed(publish: boolean): void {
    if (publish) {
      gameStorage.saveWaypoints(this.list);
      netSync.record(KIND, 'system', playerKey(), { list: this.list });
    }
    for (const fn of this.listeners) fn();
  }
}
