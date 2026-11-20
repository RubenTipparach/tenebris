import { PlayerConfig } from '../config/PlayerConfig';
import { setSaveWorld } from '../engine/GameStorage';
import { DEFAULT_SERVER } from './Multiplayer';

/**
 * Which world this page is playing. A server world is picked in the server
 * browser and opened as `?world=<id>` (plus `&server=` for a non-default
 * server): before the game builds anything, its seed replaces the terrain
 * seed and the local save switches to that world's slot, and the game then
 * joins it online. Without `?world` it is the single-player world.
 */

export interface WorldInfo {
  id: string;
  name: string;
  seed: number;
  players: number;
  edits: number;
  created: number;
}

let current: WorldInfo | null = null;

/** The server world being played, or null for single player. */
export function currentWorld(): WorldInfo | null {
  return current;
}

/** ws(s)://host/ -> http(s)://host */
export function serverHttpBase(server: string = serverUrl()): string {
  return server.replace(/^ws/, 'http').replace(/\/$/, '');
}

export function serverUrl(): string {
  return new URLSearchParams(window.location.search).get('server') || DEFAULT_SERVER;
}

/** The websocket URL for a world. */
export function worldSocketUrl(worldId: string): string {
  return `${serverUrl().replace(/\/$/, '')}/?world=${encodeURIComponent(worldId)}`;
}

export async function listWorlds(): Promise<WorldInfo[]> {
  const res = await fetch(`${serverHttpBase()}/worlds`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`server answered ${res.status}`);
  return res.json();
}

export async function createWorld(name: string, seed?: number): Promise<WorldInfo> {
  const res = await fetch(`${serverHttpBase()}/worlds`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, seed }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `server answered ${res.status}`);
  return body;
}

/** Reload the page into a world (null = back to single player). */
export function openWorld(worldId: string | null): void {
  const params = new URLSearchParams(window.location.search);
  if (worldId) params.set('world', worldId);
  else params.delete('world');
  params.delete('mp');
  const q = params.toString();
  window.location.href = `${window.location.pathname}${q ? `?${q}` : ''}`;
}

/**
 * Call once before the game is built. Resolves the ?world from the URL;
 * if the server can't be reached or doesn't have it, falls back to single
 * player and says why.
 */
export async function prepareWorld(): Promise<{ error?: string }> {
  const params = new URLSearchParams(window.location.search);
  // ?mp (the old way to go online) is the main world
  const id = params.get('world') || (params.has('mp') ? 'main' : null);
  if (!id) return {};
  try {
    const world = (await listWorlds()).find(w => w.id === id);
    if (!world) return { error: 'That world is not on the server any more - playing single player' };
    current = world;
    PlayerConfig.TERRAIN_SEED = world.seed;
    setSaveWorld(world.id);
    return {};
  } catch {
    return { error: 'Could not reach the server - playing single player' };
  }
}
