import * as THREE from 'three';
import { NPC_CONFIG } from '../config/NpcConfig';
import { getBodyConfig } from '../config/SolarSystemConfig';
import { PlayerConfig } from '../config/PlayerConfig';
import { netSync } from '../net/NetSync';
import type { Planet } from '../planet/Planet';
import { surfaceTop } from '../planet/SurfaceTiles';
import { HexBlockType } from '../shared/blockTypes';
import { NPC_RECORDS, Npc, Population, TraderState, VillageState, buildPopulation, placePopulation, rngFor } from '../shared/npc';
import { Ground, NpcBody, newNpcBody, offsetDir, settle, stepNpc, tangent } from './NpcMotion';
import { NpcPose, NpcRenderer, npcPose } from './NpcRenderer';
import { VillageStructures, structureSite } from './NpcStructures';
import { npcSpeciesById } from './NpcModels';

/** Where the village records are read from (NpcClient's store: the save, or the server's records). */
export interface NpcRecords { get(kind: string, planet: string, key: string): unknown | null }

/**
 * The NPCs of the planet the player stands on (openspec friendship-npcs,
 * task 3.3).
 *
 * - Who: `buildPopulation(worldSeed, body)` - the same people on every
 *   client and on the server.
 * - Homes: `placePopulation` with this planet's own ground test (dry,
 *   generated terrain) and the body's spawn as the anchor; a home it could
 *   not ground is settled onto the nearest dry ground (NpcMotion.settle).
 * - Motion: the planet's host (NetSync.isHost, as for fauna) wanders them
 *   near home and sends a snapshot on live channel 'npc' SNAPSHOT_HZ times a
 *   second while anyone else is there. Everyone else eases its copies to
 *   the latest snapshot. When the host leaves, the next host carries on from
 *   the poses it was already drawing, so nobody pops.
 */

const M = NPC_CONFIG.MOTION;

/** A talker's word to the host (live channel 'npcTalk'): stop and face me (on), or carry on. */
export interface NpcTalkMsg {
  planet: string;
  id: string;             // the NPC's id (a resident's `${body}:${i}`, a trader's `trader:${i}`)
  on: boolean;
  at: number[];           // the talker's planet-local unit direction
}

/** A live frame: the planet and, per NPC, [id, dir xyz, face xyz, moveW, talkW]. */
export interface NpcSnapshot {
  planet: string;
  npcs: Array<[string, ...number[]]>;
}

interface Live {
  npc: Npc;
  body: NpcBody;
  pose: NpcPose;
  // mirroring: the host's latest word on this NPC (null: none yet)
  goal: { dir: THREE.Vector3; face: THREE.Vector3; moveW: number; talkW: number } | null;
}

export class NpcField {
  private readonly renderer: NpcRenderer;
  private readonly structures: VillageStructures;
  private centres: THREE.Vector3[] = [];
  private planet: Planet | null = null;
  private seed = NaN;
  private pop: Population | null = null;
  private live: Live[] = [];
  private hosting = false;
  private sinceSnapshot = 0;
  private remote: NpcSnapshot | null = null;
  private readonly rnd = Math.random;
  private readonly talkHeard = new Map<string, number>(); // host: npc id -> when its talker last spoke (ms)
  private tradersKey = '';
  private readonly ray = new THREE.Ray();
  private readonly seg0 = new THREE.Vector3();
  private readonly seg1 = new THREE.Vector3();

  constructor(scene: THREE.Scene, private readonly records: NpcRecords) {
    this.renderer = new NpcRenderer(scene, NPC_CONFIG.MAX_DRAWN_PER_SPECIES);
    this.structures = new VillageStructures(scene);
    void this.renderer.loadAll();
    netSync.onLive('npc', (_from, data: NpcSnapshot) => {
      if (data && typeof data.planet === 'string' && Array.isArray(data.npcs)) this.remote = data;
    });
    netSync.onLive('npcTalk', (_from, m: NpcTalkMsg) => {
      if (m && this.hosting && this.planet?.getName() === m.planet && Array.isArray(m.at)) this.hearTalk(String(m.id), !!m.on, m.at);
    });
  }

  /** This planet's ground test: generated, dry, standable terrain. */
  static groundOf(planet: Planet): Ground {
    return {
      radiusM: planet.radius,
      walkable: (dir) => {
        const tile = planet.getTileIndexInDirection(dir);
        if (tile === null) return false;
        const { top, block } = surfaceTop(planet, tile);
        return top >= 0 && block !== HexBlockType.WATER && block !== HexBlockType.AIR;
      },
    };
  }

  /** The NPCs being simulated or mirrored (for talking: task 4.1). */
  get npcs(): ReadonlyArray<{ npc: Npc; body: NpcBody; pose: NpcPose }> {
    return this.live;
  }

  /** planet: where the player stands (null in space). */
  update(dt: number, planet: Planet | null, sunDirection: THREE.Vector3): void {
    if (planet !== this.planet || PlayerConfig.TERRAIN_SEED !== this.seed) this.arrive(planet);
    if (!planet || !this.pop) { this.renderer.draw([]); return; }
    if (!this.live.length && !this.populate(planet)) { this.renderer.draw([]); return; }

    const body = planet.getName();
    this.syncTraders(planet);
    const host = netSync.isHost(body);
    if (host !== this.hosting) {
      this.hosting = host;
      if (host) this.takeOver();
    }
    if (host) {
      const ground = NpcField.groundOf(planet);
      // an NPC whose talker went quiet (left, closed the game) carries on
      const now = performance.now();
      for (const [id, t] of this.talkHeard) {
        if (now - t > NPC_CONFIG.TALK_HOLD_S * 1000) { this.talkHeard.delete(id); const b = this.byId(id)?.body; if (b) { b.talking = false; b.talkTo = null; } }
      }
      for (const l of this.live) stepNpc(l.body, ground, dt, this.rnd);
      this.sinceSnapshot += dt;
      if (netSync.online() && this.sinceSnapshot >= 1 / M.SNAPSHOT_HZ && netSync.peersOn(body).length > 0) {
        this.sinceSnapshot = 0;
        netSync.live('npc', this.snapshot(body));
      }
    } else {
      if (this.remote?.planet === body) { this.apply(this.remote); this.remote = null; }
      for (const l of this.live) this.follow(l, dt);
    }

    for (const l of this.live) this.pose(l, planet, dt);
    // The villages' structures, from their records (rebuilt when one changes)
    this.structures.update(planet, this.seed, this.centres.map((centre, i) => ({
      centre, state: (this.records.get(NPC_RECORDS.VILLAGE, body, String(i)) as VillageState | null) ?? null,
    })), sunDirection);
    this.renderer.setLight(sunDirection, planet.center, planet.getSkyLight());
    this.renderer.draw(this.live.map(l => l.pose));
  }

  private arrive(planet: Planet | null): void {
    this.planet = planet;
    this.seed = PlayerConfig.TERRAIN_SEED;
    this.live = [];
    this.remote = null;
    this.hosting = false;
    this.talkHeard.clear();
    this.tradersKey = '';
    this.pop = planet ? buildPopulation(this.seed, planet.getName()) : null;
    this.centres = [];
    this.structures.clear();
  }

  /** Place the homes once the planet's terrain is there; false while it is not. */
  private populate(planet: Planet): boolean {
    if (!this.pop || !planet.isDetailedTerrainEnabled()) return false;
    const ground = NpcField.groundOf(planet);
    const spawn = getBodyConfig(planet.getName())?.spawn;
    const anchor = planet.getDirectionFromLatLon(spawn?.latitude ?? 0, spawn?.longitude ?? 0);
    const placed = placePopulation(this.seed, this.pop, { radiusM: planet.radius, ground: (d) => ground.walkable(new THREE.Vector3(d.x, d.y, d.z)), anchor });
    this.centres = placed.villages.map(v => settle(new THREE.Vector3(v.dir.x, v.dir.y, v.dir.z), ground));
    this.live = this.pop.npcs.map((npc, i) => {
      const spot = placed.homes.get(npc.id)!;
      const d = new THREE.Vector3(spot.dir.x, spot.dir.y, spot.dir.z);
      const home = spot.grounded ? d : settle(d, ground);
      const body = newNpcBody(home, this.rnd);
      return { npc, body, pose: npcPose(npc.species, d, home, body.face, i), goal: null };
    });
    return true;
  }

  private snapshot(planet: string): NpcSnapshot {
    const d = 10 ** M.DIR_DECIMALS, w = 10 ** M.WEIGHT_DECIMALS;
    const r = (v: number, k: number) => Math.round(v * k) / k;
    return {
      planet,
      npcs: this.live.map((l): [string, ...number[]] => [l.npc.id,
        r(l.body.dir.x, d), r(l.body.dir.y, d), r(l.body.dir.z, d),
        r(l.body.face.x, d), r(l.body.face.y, d), r(l.body.face.z, d),
        r(l.body.moveW, w), r(l.body.talkW, w)]),
    };
  }

  /** The host's word: a first one is taken as is (no slide from home), later ones are eased to. */
  private apply(snap: NpcSnapshot): void {
    for (const a of snap.npcs) {
      if (!Array.isArray(a) || a.length < 9) continue;
      const l = this.byId(String(a[0]));
      if (!l) continue;
      const n = a.slice(1) as number[];
      const goal = { dir: new THREE.Vector3(n[0], n[1], n[2]).normalize(), face: new THREE.Vector3(n[3], n[4], n[5]), moveW: n[6], talkW: n[7] };
      if (!l.goal) { l.body.dir.copy(goal.dir); l.body.face.copy(goal.face); tangent(l.body.face, l.body.dir); }
      l.goal = goal;
    }
  }

  private follow(l: Live, dt: number): void {
    const g = l.goal;
    if (!g) return;
    const k = Math.min(1, dt * M.FOLLOW_RATE);
    l.body.dir.lerp(g.dir, k).normalize();
    l.body.face.lerp(g.face, k);
    tangent(l.body.face, l.body.dir);
    l.body.moveW += (g.moveW - l.body.moveW) * k;
    l.body.talkW += (g.talkW - l.body.talkW) * k;
  }

  /** Becoming the host: carry on from the poses already drawn (walks restart from where each stands). */
  private takeOver(): void {
    for (const l of this.live) {
      l.goal = null;
      l.body.target.copy(l.body.dir);
      l.body.timer = 0;
    }
    this.sinceSnapshot = Infinity;
  }

  /** Stand the NPC on the ground under it and advance its clips. */
  private pose(l: Live, planet: Planet, dt: number): void {
    const p = l.pose;
    p.up.copy(l.body.dir);
    p.face.copy(l.body.face);
    p.pos.copy(planet.center).addScaledVector(l.body.dir, planet.getSurfaceHeightInDirection(l.body.dir));
    p.moveW = l.body.moveW;
    p.talkW = l.body.talkW;
    this.renderer.advance(p, dt, 1);
  }

  /** The NPCs as drawn: world position and planet-local unit direction (debug / the two-client harness). */
  debugPositions(): Array<{ id: string; species: string; pos: number[]; dir: number[]; face: number[]; moveW: number; talkW: number }> {
    return this.live.map(l => ({
      id: l.npc.id, species: l.npc.species, pos: l.pose.pos.toArray(), dir: l.body.dir.toArray(), face: l.body.face.toArray(),
      moveW: l.body.moveW, talkW: l.body.talkW,
    }));
  }

  /** Village centres (unit dirs) and what each draws of its structures (debug / screenshots). */
  debugVillages(): Array<{ centre: number[]; key: string }> {
    const keys = this.structures.debugKeys();
    return this.centres.map((c, i) => ({ centre: c.toArray(), key: keys[i] ?? '' }));
  }

  // ---- talking (task 4.1) ----------------------------------------------------

  /**
   * The NPC the crosshair ray hits (each drawn as an upright capsule of its
   * species' height and width), if the player stands within TALK_RANGE_M of
   * it. Returns its index, or -1.
   */
  pick(origin: THREE.Vector3, dir: THREE.Vector3, player: THREE.Vector3): number {
    let best = -1, bestT = Infinity;
    this.ray.set(origin, dir);
    this.live.forEach((l, i) => {
      if (l.pose.pos.distanceTo(player) > NPC_CONFIG.TALK_RANGE_M) return;
      const look = npcSpeciesById(l.npc.species)?.look;
      if (!look) return;
      const r = look.widthM / 2;
      this.seg0.copy(l.pose.pos).addScaledVector(l.pose.up, r);
      this.seg1.copy(l.pose.pos).addScaledVector(l.pose.up, Math.max(r, look.heightM - r));
      const hit = new THREE.Vector3(), onSeg = new THREE.Vector3();
      const d2 = this.ray.distanceSqToSegment(this.seg0, this.seg1, hit, onSeg);
      if (d2 > r * r) return;
      const t = hit.distanceTo(origin);
      if (t < bestT) { bestT = t; best = i; }
    });
    return best;
  }

  /** Who the NPC at `index` is (for the prompt and the panel). */
  npcAt(index: number): Npc | null {
    return this.live[index]?.npc ?? null;
  }

  /**
   * Talk to the NPC at `index` (on) or let it go (off): it stops and turns
   * to `talker` (world position). The host applies it; anyone else sends
   * 'npcTalk' to the host, who sees it in its next snapshot.
   */
  talk(index: number, on: boolean, talker: THREE.Vector3): void {
    const p = this.planet;
    if (!p || !this.live[index]) return;
    const at = talker.clone().sub(p.center).normalize();
    const id = this.live[index].npc.id;
    if (this.hosting) this.hearTalk(id, on, at.toArray());
    else netSync.live('npcTalk', { planet: p.getName(), id, on, at: at.toArray() } satisfies NpcTalkMsg);
  }

  private hearTalk(id: string, on: boolean, at: number[]): void {
    const b = this.byId(id)?.body;
    if (!b) return;
    b.talking = on;
    b.talkTo = on ? new THREE.Vector3(at[0], at[1], at[2]).normalize() : null;
    if (on) this.talkHeard.set(id, performance.now());
    else this.talkHeard.delete(id);
  }

  private byId(id: string): Live | undefined {
    return this.live.find(l => l.npc.id === id);
  }

  /**
   * The traders visiting this planet (their `trader` records say where each
   * is): one camps near the first village while it stays, and goes when it
   * moves on. Residents are untouched.
   */
  private syncTraders(planet: Planet): void {
    const body = planet.getName();
    const here = NPC_CONFIG.TRADERS.BAND.map((_, i) => i)
      .filter(i => (this.records.get(NPC_RECORDS.TRADER, NPC_RECORDS.TRADER_PLANET, String(i)) as TraderState | null)?.at === body);
    const key = here.join(',');
    if (key === this.tradersKey || !this.centres.length) return;
    this.tradersKey = key;
    const ids = new Set(here.map(i => `trader:${i}`));
    this.live = this.live.filter(l => l.npc.role !== 'trader' || ids.has(l.npc.id));
    const ground = NpcField.groundOf(planet);
    for (const i of here) {
      const id = `trader:${i}`;
      if (this.byId(id)) continue;
      const r = rngFor(this.seed, body, 'trader-camp', i);
      const camp = settle(offsetDir(this.centres[0], r() * Math.PI * 2, NPC_CONFIG.TRADERS.CAMP_M, planet.radius), ground);
      const npc: Npc = { id, name: NPC_CONFIG.TRADERS.BAND[i].name, role: 'trader', village: 0, species: NPC_CONFIG.TRADERS.SPECIES.id };
      const b = newNpcBody(camp, this.rnd);
      this.live.push({ npc, body: b, pose: npcPose(npc.species, camp, camp, b.face, this.live.length), goal: null });
    }
  }

  /** Where a village's structure stands, in world space (debug / screenshots). */
  debugStructureSite(village: number, index: number): { pos: number[]; face: number[]; up: number[] } | null {
    const p = this.planet, c = this.centres[village];
    if (!p || !c) return null;
    const { dir, face } = structureSite(this.seed, p.getName(), village, c, index, p.radius);
    return { pos: p.center.clone().addScaledVector(dir, p.getSurfaceHeightInDirection(dir)).toArray(), face: face.toArray(), up: dir.toArray() };
  }

  get isHosting(): boolean {
    return this.hosting;
  }
}
