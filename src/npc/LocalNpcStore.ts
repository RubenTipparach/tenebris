import type { NpcStore } from '../shared/npc';

/**
 * This client's copy of the world's NPC records (openspec friendship-npcs,
 * task 3.1): `village`, `trader` and `npcClock`, keyed like every record
 * (kind | planet | key). Single player writes them through the shared NPC
 * session (src/shared/npc/session.ts) - the same wake / catch-up / tick /
 * sleep the server runs; online, the server's records land here. Every
 * change is persisted the moment it happens (CLAUDE.md: world state saves
 * same-frame).
 *
 * Pure (no DOM): the persist callback does the saving.
 */
export type NpcRecordMap = Record<string, object>;

export const npcAddress = (kind: string, planet: string, key: string): string => `${kind}|${planet}|${key}`;

export class LocalNpcStore implements NpcStore {
  private readonly listeners = new Set<(kind: string, planet: string, key: string) => void>();

  constructor(private records: NpcRecordMap, private readonly persist: (records: NpcRecordMap) => void) {}

  get(kind: string, planet: string, key: string): unknown | null {
    return this.records[npcAddress(kind, planet, key)] ?? null;
  }

  /** A record changed here (single player) or arrived from the server: stored, saved, announced. */
  write(kind: string, planet: string, key: string, data: object | null): void {
    const addr = npcAddress(kind, planet, key);
    if (data) this.records[addr] = data;
    else delete this.records[addr];
    this.persist(this.records);
    for (const fn of this.listeners) fn(kind, planet, key);
  }

  /** Called with every changed record (the renderer and panels redraw). */
  onChange(fn: (kind: string, planet: string, key: string) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  /** Every record of a kind on a planet, by key. */
  list(kind: string, planet: string): Array<{ key: string; data: unknown }> {
    const prefix = `${kind}|${planet}|`;
    return Object.keys(this.records).filter(a => a.startsWith(prefix)).map(a => ({ key: a.slice(prefix.length), data: this.records[a] }));
  }
}
