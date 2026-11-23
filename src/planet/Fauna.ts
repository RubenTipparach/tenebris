import * as THREE from 'three';
import { skyLightUniforms } from './SkyLightTexture';
import { Planet } from './Planet';
import { HexTile } from './GoldbergPolyhedron';
import { HexBlockType } from '../shared/blockTypes';
import { PlayerConfig } from '../config/PlayerConfig';
import {
  FAUNA_CONFIG as C, FAUNA_SCHOOL, FAUNA_SPECIES, FaunaSpecies, FaunaSpeciesId, faunaRoster, habitatOf, isWaterLife, waterLife, WaterLifeConfig,
} from '../config/FaunaConfig';
import { Boid, seedSchool, stepSchool } from './Schooling';
import { buildFaunaModel, FaunaModel } from './FaunaModels';
import { surfaceTop, tileHash, waterColumn } from './SurfaceTiles';
import { swimRadius, columnRadius, clearsSeabed } from './SwimRules';
import { getAssetPath } from '../utils/assetPath';
import { netSync } from '../net/NetSync';
import { RANCHING } from '../config/SurvivalConfig';
import { RanchState, newRanchState, isShorn, shear as shearRule, hit as hitRule, pickNearest } from './Ranching';

/**
 * Fauna: herds of creatures round the player, on the planet they stand on.
 *
 * - Who lives where: src/config/FaunaConfig.ts (one roster table; lifeless
 *   worlds have nobody, so nothing spawns there).
 * - Where: herd sites are surface tiles picked by a hash of the tile index
 *   (stable, like ground clutter's placement), listed once per planet. A
 *   herd spawns when its site comes within range and
 *   despawns once every member is far away.
 * - Look: one procedural merged mesh per species (FaunaModels.ts), drawn as
 *   one InstancedMesh (one draw call per species on screen).
 * - Motion: the baked idle / move clips (public/animations/<id>.anim.json)
 *   are played in the vertex shader, per part, blended by speed; the
 *   creature itself idles, wanders and flees on the surface (height follows
 *   the terrain, water and cliffs turn it back), fliers hover and bob.
 * - Multiplayer: one player per planet - the host (NetSync.isHost, the
 *   lowest id there) - runs everything above, spawning round every player
 *   on the planet and fleeing from all of them, and sends a snapshot a few
 *   times a second (live channel 'fauna'). Everyone else on that planet
 *   spawns and simulates nothing: they ease their creatures towards the
 *   latest snapshot and draw them through the same path. When the host
 *   leaves, the next one takes over the creatures it was drawing, so
 *   nobody sees the herds pop.
 * - Ranching (src/planet/Ranching.ts has the rules): `pick` finds the animal
 *   under the crosshair, `shear` / `hit` act on it. The host (and single
 *   player) applies them at once; anyone else sends them to the host on the
 *   live channel 'faunaAct' and the host's next snapshot carries the result
 *   (the shorn flag, or the animal gone). Rewards all leave through ONE
 *   handler (`setRewardHandler`), so the inventory code is the same either
 *   way: wool is given by the shearing client itself when it believes the
 *   sheep is unshorn (instant; two players shearing the same sheep in the
 *   same instant both get wool - harmless); leather is given by the host,
 *   which alone counts a cow's hits, and comes back to the hitter as a
 *   'drop' action. Nothing here is saved: animals respawn lazily, so a
 *   shorn flag lives as long as the animal does.
 * - Sea life (openspec ocean-life): the same spawner, branched by habitat
 *   (FaunaConfig `habitat`). A site on water spawns the planet's water and
 *   seabed species; on dry land, its land ones. Swimmers ('swim' / 'drift')
 *   keep a depth inside the water column of the tile they are over - eased
 *   towards a per-individual fraction of the column, then hard-clamped by
 *   SwimRules.swimRadius so they never leave the water or enter the seabed -
 *   and turn smoothly back from the shore. A school (openspec
 *   underwater-life) is ONE creature, its anchor, swimming as a solo swimmer
 *   does, with its fish flocking round it as boids (src/planet/Schooling.ts):
 *   each fish is held in the water under it, and the anchor flees when any
 *   fish sees a player. It is one record in a snapshot (plus its fish
 *   count); every client runs the same flock step round it.
 *   Seabed crawlers walk the submerged ground like walkers walk land. The
 *   swimming fish are the fishing table's own species (FaunaConfig derives
 *   them from FISH_ROSTERS). Water life rides the same live frames.
 */

const CLIP_IDLE = 0;
const CLIP_MOVE = 1;
const CLIP_NAMES = ['idle', 'move'];
const SITE_SALT = 0x5f3759df; // decorrelates herd sites from clutter placement
const SPECIES_MUL = 0x27d4eb2d; // and these the species pick from both
const SPECIES_SALT = 0x165667b1;
const HASH_SCALE = 1 / 4294967296;

const enum State { Idle, Wander, Flee }

// Species are sent as an index into this list (same build on every client)
const SPECIES_IDS = Object.keys(FAUNA_SPECIES) as FaunaSpeciesId[];

/** One creature in a snapshot: [id, species, site, dir xyz, groundR, face xyz, scale, tint, hover, moveW, speed, state, shorn (0/1), school fish (0 = not a school)] */
type SnapCreature = [number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number, number];
/** An animal action on the live channel 'faunaAct': a shear / hit sent to the host, or the host's drop back to a hitter. */
interface FaunaAction { planet: string; act: 'shear' | 'hit' | 'drop'; id?: number; from?: [number, number, number]; to?: number; leather?: number }

/** The animal under the crosshair (Fauna.pick). */
export interface AnimalPick { uid: number; species: FaunaSpeciesId; distance: number; shearable: boolean; ranch: FaunaSpecies['ranch'] }
export type FaunaReward = (kind: 'wool' | 'leather', count: number) => void;
interface FaunaSnapshot { planet: string; animals: SnapCreature[] }

interface AnimFile {
  species: string;
  frames: number;
  clips: Record<string, { duration: number; tracks: Record<string, number[][]> }>;
}

/** A species' draw state: its mesh, material and clip timing. */
class SpeciesRender {
  readonly mesh: THREE.InstancedMesh;
  readonly anim: THREE.InstancedBufferAttribute;
  readonly material: THREE.ShaderMaterial;
  readonly durations: number[];
  /** Per-instance fleece size, for a species with a 'fleece' part (else null). */
  readonly fleece: THREE.InstancedBufferAttribute | null;
  /** The model's bounding sphere (model space), for picking. */
  readonly bounds: THREE.Sphere;
  count = 0;

  constructor(readonly id: FaunaSpeciesId, readonly cfg: FaunaSpecies, model: FaunaModel, file: AnimFile, scene: THREE.Scene) {
    const P = model.parts.length;
    const F = file.frames;
    const keys = new Float32Array(CLIP_NAMES.length * F * P * 4);
    this.durations = CLIP_NAMES.map(() => 1);
    CLIP_NAMES.forEach((clipName, ci) => {
      const clip = file.clips[clipName];
      if (!clip) { console.error(`[Fauna] ${id}: no '${clipName}' clip`); return; }
      this.durations[ci] = clip.duration;
      for (const [partName, track] of Object.entries(clip.tracks)) {
        const p = model.parts.findIndex(pt => pt.name === partName);
        if (p < 0) { console.error(`[Fauna] ${id}.${clipName}: track for unknown part '${partName}'`); continue; }
        for (let f = 0; f < F; f++) keys.set(track[f], ((ci * F + f) * P + p) * 4);
      }
    });
    const pivot = new Float32Array(P * 3);
    const axis = new Float32Array(P * 3);
    const parent = new Float32Array(P);
    model.parts.forEach((pt, i) => {
      pt.pivot.toArray(pivot, i * 3);
      pt.axis.toArray(axis, i * 3);
      parent[i] = pt.parent;
    });
    const fleecePart = model.parts.findIndex(pt => pt.name === 'fleece');
    if (cfg.ranch === 'wool' && fleecePart < 0) console.error(`[Fauna] ${id}: a wool species needs a 'fleece' part`);
    this.material = makeMaterial(F, P, keys, pivot, axis, parent, cfg.glow, fleecePart);
    const geometry = model.geometry;
    this.bounds = geometry.boundingSphere?.clone() ?? new THREE.Sphere(new THREE.Vector3(), 1);
    this.anim = new THREE.InstancedBufferAttribute(new Float32Array(C.maxPerSpecies * 3), 3);
    this.anim.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('aAnim', this.anim);
    this.fleece = null;
    if (fleecePart >= 0) {
      this.fleece = new THREE.InstancedBufferAttribute(new Float32Array(C.maxPerSpecies).fill(1), 1);
      this.fleece.setUsage(THREE.DynamicDrawUsage);
      geometry.setAttribute('aFleece', this.fleece);
    }
    this.mesh = new THREE.InstancedMesh(geometry, this.material, C.maxPerSpecies);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(C.maxPerSpecies * 3), 3);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    scene.add(this.mesh);
  }
}

interface Creature {
  id: number;             // stable across the network
  render: SpeciesRender;
  cfg: FaunaSpecies;
  dir: THREE.Vector3;     // unit direction from the planet centre
  pos: THREE.Vector3;     // world position (feet / body centre)
  heading: THREE.Vector3; // where it wants to go (tangent)
  face: THREE.Vector3;    // where it faces (tangent, eases to heading)
  tile: HexTile;
  tileR: number;          // terrain radius of its tile (the seabed, for water life)
  groundR: number;        // smoothed height it stands at (a swimmer's body centre)
  surfR: number;          // water life: its tile's water surface radius
  depthT: number;         // swimmers: the fraction of the water column it keeps to
  boids?: SchoolFish[];   // a school's anchor: its fish (the anchor itself is not drawn)
  hover: number;
  state: State;
  timer: number;
  speed: number;
  phase: [number, number];
  moveW: number;
  scale: number;
  tint: number;
  bobPhase: number;
  ranch: RanchState;
  panic: number;             // seconds left running from a hit
  fleeFrom: THREE.Vector3;   // ...from whoever hit it
  shove: THREE.Vector3;      // knock-back velocity (tangent), dies away
  // Drawn from a host's snapshot: where it should be
  target?: { dir: THREE.Vector3; face: THREE.Vector3; groundR: number; moveW: number; speed: number };
}

/** One fish of a school: a boid (offset / velocity from the anchor) plus how it is drawn. */
interface SchoolFish extends Boid {
  pos: THREE.Vector3;   // world position
  up: THREE.Vector3;    // radial-out there
  face: THREE.Vector3;  // where it faces (tangent)
  tile: HexTile;        // the tile under it (its water column)
  clip: [number, number];
  speed: number;
  scale: number;
  tint: number;
}

interface Herd { site: number; members: Creature[] }
interface Site { tile: HexTile; dir: THREE.Vector3; h: number }
/** Where a creature may be on a tile: the radius it rests on (ground / seabed) and, for water life, the surface. */
interface Floor { r: number; surf: number }

const swims = (cfg: FaunaSpecies) => cfg.motion === 'swim' || cfg.motion === 'drift';

export class Fauna {
  private planet: Planet | null = null;
  private renders = new Map<FaunaSpeciesId, SpeciesRender>();
  private loading = new Set<FaunaSpeciesId>();
  private herds: Herd[] = [];
  private sites = new Set<number>(); // sites with a live herd
  private siteLists = new Map<Planet, Site[]>();
  private lastScan = new THREE.Vector3(1e9, 0, 0);
  private sinceScan = Infinity;
  private arrived = true;
  private time = 0;
  private nextId = 1;
  private hosting = true;
  private sinceSnapshot = 0;
  private remoteSnap: FaunaSnapshot | null = null; // latest from the host, not yet applied
  private reward: FaunaReward | null = null;
  // scratch
  private m = new THREE.Matrix4();
  private v = new THREE.Vector3();
  private x = new THREE.Vector3();
  private col = new THREE.Color();
  private y = new THREE.Vector3();
  private threat = new THREE.Vector3();

  constructor(private scene: THREE.Scene) {
    netSync.onLive('fauna', (_from, data: FaunaSnapshot) => {
      if (data && typeof data.planet === 'string' && Array.isArray(data.animals)) this.remoteSnap = data;
    });
    netSync.onLive('faunaAct', (from, data: FaunaAction) => this.remoteAction(from, data));
  }

  /** planet: the world the player stands on (null in space). */
  public update(dt: number, player: THREE.Vector3, planet: Planet | null, sunDirection: THREE.Vector3): void {
    if (!C.enabled) return;
    this.time += dt;
    if (planet !== this.planet) {
      this.clear();
      this.planet = planet;
      this.arrived = true;
    }
    const roster = planet ? faunaRoster(planet.getName()) : [];
    for (const [id, r] of this.renders) {
      r.mesh.visible = !!planet && FAUNA_SPECIES[id].planet === planet.getName();
      if (planet && r.mesh.visible) {
        r.material.uniforms.sunDirection.value.copy(sunDirection);
        r.material.uniforms.planetCenter.value.copy(planet.center);
        r.material.uniforms.skyLight.value = planet.getSkyLight();
      }
    }
    if (!planet || roster.length === 0) return;
    for (const id of roster) this.load(id);

    const planetId = planet.getName();
    const host = netSync.isHost(planetId);
    if (host !== this.hosting) {
      this.hosting = host;
      if (host) this.takeOver(planet);
    }
    if (!host) {
      const snap = this.remoteSnap;
      if (snap && snap.planet === planetId) { this.applySnapshot(snap, planet); this.remoteSnap = null; }
      for (const herd of this.herds) for (const c of herd.members) this.follow(c, planet, player, dt);
      this.draw();
      return;
    }

    // Everyone on the planet: animals spawn round each and flee from each
    const viewers = [player];
    for (const p of netSync.peerPositionsOn(planetId)) viewers.push(new THREE.Vector3(p[0], p[1], p[2]));
    this.sinceScan += dt;
    if (this.sinceScan >= C.rescanEverySeconds || player.distanceTo(this.lastScan) >= C.rescanMove) {
      this.sinceScan = 0;
      this.lastScan.copy(player);
      viewers.forEach((v, i) => this.scan(planet, v, roster, viewers.length, i === 0));
    }
    for (const herd of this.herds) for (const c of herd.members) this.step(c, planet, nearest(c.pos, viewers), dt);
    this.despawn(viewers);
    this.draw();

    this.sinceSnapshot += dt;
    if (netSync.online() && this.sinceSnapshot >= 1 / C.mp.snapshotHz && netSync.peersOn(planetId).length > 0) {
      this.sinceSnapshot = 0;
      netSync.live('fauna', this.snapshot(planet));
    }
  }

  // ---- multiplayer ------------------------------------------------------

  private snapshot(planet: Planet): FaunaSnapshot {
    const d = 10 ** C.mp.dirDecimals, l = 10 ** C.mp.lengthDecimals;
    const r = (v: number, k: number) => Math.round(v * k) / k;
    const animals: SnapCreature[] = [];
    for (const h of this.herds) {
      for (const c of h.members) {
        if (animals.length >= C.mp.maxSnapshotCreatures) break;
        animals.push([c.id, SPECIES_IDS.indexOf(c.render.id), h.site,
          r(c.dir.x, d), r(c.dir.y, d), r(c.dir.z, d), r(c.groundR, l),
          r(c.face.x, d), r(c.face.y, d), r(c.face.z, d),
          r(c.scale, l), r(c.tint, l), r(c.hover, l), r(c.moveW, l), r(c.speed, l), c.state,
          isShorn(c.ranch, this.time) ? 1 : 0, c.boids?.length ?? 0]);
      }
    }
    return { planet: planet.getName(), animals };
  }

  /** Mirror the host's creatures: new ones appear where it says, gone ones go. */
  private applySnapshot(snap: FaunaSnapshot, planet: Planet): void {
    const poly = planet.getPolyhedron();
    const byId = new Map<number, Creature>();
    for (const h of this.herds) for (const c of h.members) byId.set(c.id, c);
    const herds = new Map<number, Herd>();
    for (const a of snap.animals) {
      if (!Array.isArray(a) || a.length < 16) continue;
      const [id, sp, site, dx, dy, dz, g, fx, fy, fz, scale, tint, hover, moveW, speed, state, shorn, fish] = a;
      const render = this.renders.get(SPECIES_IDS[sp]);
      if (!render) { if (SPECIES_IDS[sp]) this.load(SPECIES_IDS[sp]); continue; }
      const target = { dir: new THREE.Vector3(dx, dy, dz).normalize(), face: new THREE.Vector3(fx, fy, fz).normalize(), groundR: g, moveW, speed };
      let c = byId.get(id);
      if (!c || c.render !== render) {
        const hint = poly.tiles[site] ?? poly.tiles[0];
        const tile = poly.getTileAtPointFromHint(target.dir.clone().multiplyScalar(planet.radius), hint);
        c = {
          id, render, cfg: render.cfg, dir: target.dir.clone(), pos: new THREE.Vector3(), heading: target.face.clone(), face: target.face.clone(),
          tile, tileR: g, groundR: g, surfR: g, depthT: 0.5,
          hover, state: state as State, timer: lerp(render.cfg.idleTime, Math.random()), speed,
          phase: [Math.random(), Math.random()], moveW, scale, tint, bobPhase: Math.random() * Math.PI * 2,
          ranch: newRanchState(), panic: 0, fleeFrom: new THREE.Vector3(), shove: new THREE.Vector3(),
        };
        this.place(c, planet);
      }
      c.target = target;
      c.state = state as State;
      // a school: as many fish as the host has, flocking round it here
      const n = typeof fish === 'number' && render.cfg.school ? Math.min(fish, C.maxPerSpecies) : 0;
      if (!n) c.boids = undefined;
      else if (c.boids?.length !== n) this.addFlock(c, n, planet);
      // a drawn animal's fleece is whatever the host says (it alone regrows it)
      c.ranch.shornUntil = shorn ? Infinity : 0;
      let herd = herds.get(site);
      if (!herd) herds.set(site, herd = { site, members: [] });
      herd.members.push(c);
    }
    this.herds = [...herds.values()];
    this.sites = new Set(herds.keys());
  }

  /** Ease a drawn creature towards the host's latest word on it. */
  private follow(c: Creature, planet: Planet, player: THREE.Vector3, dt: number): void {
    const t = c.target;
    if (t) {
      const k = Math.min(1, dt * C.mp.followRate);
      c.dir.lerp(t.dir, k).normalize();
      c.face.lerp(t.face, k);
      tangent(c.face, c.dir);
      c.heading.copy(c.face);
      c.groundR += (t.groundR - c.groundR) * k;
      c.moveW += (t.moveW - c.moveW) * k;
      c.speed += (t.speed - c.speed) * k;
    }
    this.animate(c, dt);
    this.place(c, planet);
    if (c.boids) this.stepFlock(c, planet, player, dt);
  }

  /** Becoming the host: carry on simulating the creatures the old host left. */
  private takeOver(planet: Planet): void {
    const poly = planet.getPolyhedron();
    let maxId = 0;
    for (const h of this.herds) {
      for (const c of h.members) {
        maxId = Math.max(maxId, c.id);
        c.target = undefined;
        if (c.ranch.shornUntil === Infinity) c.ranch.shornUntil = this.time + RANCHING.REGROW_S;
        c.tile = poly.getTileAtPointFromHint(this.v.copy(c.dir).multiplyScalar(planet.radius), c.tile);
        const floor = this.floorAt(c.cfg, planet, c.tile.index);
        c.tileR = floor ? floor.r : c.groundR;
        c.surfR = floor ? floor.surf : c.groundR;
        if (swims(c.cfg)) c.depthT = lerp(c.cfg.swimBand ?? [0.5, 0.5], Math.random());
        if (c.state !== State.Idle) c.timer = lerp(c.cfg.wanderTime, Math.random());
      }
    }
    this.nextId = Math.max(this.nextId, maxId + 1);
    this.sinceScan = Infinity;
  }

  // ---- ranching ----------------------------------------------------------

  /** Where rewards go (the player's inventory): wool when shearing, leather when a cow falls. */
  public setRewardHandler(fn: FaunaReward | null): void {
    this.reward = fn;
  }

  /** The nearest live animal whose bounding sphere the ray enters within `reach` (dir: unit). */
  public pick(origin: THREE.Vector3, dir: THREE.Vector3, reach: number): AnimalPick | null {
    const all: Creature[] = [];
    const spheres: { center: THREE.Vector3; radius: number }[] = [];
    for (const h of this.herds) {
      for (const c of h.members) {
        if (c.boids) continue; // a school's anchor has no body (its fish aren't ranched)
        all.push(c);
        spheres.push(this.boundsOf(c));
      }
    }
    const { index, distance } = pickNearest(origin, dir, reach, spheres);
    if (index < 0) return null;
    const c = all[index];
    return {
      uid: c.id, species: c.render.id, distance, ranch: c.cfg.ranch,
      shearable: c.cfg.ranch === 'wool' && !isShorn(c.ranch, this.time),
    };
  }

  /** Shear an animal: wool goes to the reward handler. Returns the wool given (0 = nothing to shear). */
  public shear(uid: number): number {
    const c = this.find(uid);
    if (!c || !this.planet) return 0;
    const wool = shearRule(c.cfg, c.ranch, this.time, Math.random());
    if (wool <= 0) return 0;
    if (!this.hosting) this.send({ planet: this.planet.getName(), act: 'shear', id: uid });
    this.reward?.('wool', wool);
    return wool;
  }

  /** Hit an animal from `from` (the hitter's position): it's shoved back and runs; a cow falls after its hits. */
  public hit(uid: number, from: THREE.Vector3): void {
    const c = this.find(uid);
    if (!c || !this.planet) return;
    if (!this.hosting) {
      const k = 10 ** RANCHING.ACTION_DECIMALS;
      const r = (v: number) => Math.round(v * k) / k;
      this.send({ planet: this.planet.getName(), act: 'hit', id: uid, from: [r(from.x), r(from.y), r(from.z)] });
      return;
    }
    const leather = this.applyHit(c, from);
    if (leather > 0) this.reward?.('leather', leather);
  }

  /** Host side of a hit. Returns the leather dropped (0 = it's still standing). */
  private applyHit(c: Creature, from: THREE.Vector3): number {
    const { fallen, leather } = hitRule(c.cfg, c.ranch, Math.random());
    if (fallen) {
      this.remove(c);
      return leather;
    }
    c.panic = RANCHING.HIT_FLEE_S;
    c.fleeFrom.copy(from);
    c.state = State.Flee;
    c.shove.copy(c.pos).sub(from);
    tangent(c.shove, c.dir).multiplyScalar(RANCHING.HIT_SHOVE);
    return 0;
  }

  /** An action from another player: the host applies shears and hits; a hitter gets its drop. */
  private remoteAction(from: number, a: FaunaAction): void {
    if (!a || typeof a.planet !== 'string' || !this.planet || a.planet !== this.planet.getName()) return;
    if (a.act === 'drop') {
      if (a.to === netSync.myId() && typeof a.leather === 'number' && a.leather > 0) this.reward?.('leather', a.leather);
      return;
    }
    if (!this.hosting || typeof a.id !== 'number') return;
    const c = this.find(a.id);
    if (!c) return;
    if (a.act === 'shear') {
      shearRule(c.cfg, c.ranch, this.time, Math.random()); // the shearer gave itself the wool
    } else if (a.act === 'hit' && Array.isArray(a.from) && a.from.length === 3) {
      const leather = this.applyHit(c, new THREE.Vector3(a.from[0], a.from[1], a.from[2]));
      if (leather > 0) this.send({ planet: a.planet, act: 'drop', to: from, leather });
    }
  }

  private send(a: FaunaAction): void {
    netSync.live('faunaAct', a);
  }

  private find(uid: number): Creature | undefined {
    for (const h of this.herds) for (const c of h.members) if (c.id === uid) return c;
    return undefined;
  }

  /** Take a creature out of the world; an emptied herd frees its site (the spawner refills it as usual). */
  private remove(c: Creature): void {
    this.herds = this.herds.filter(h => {
      h.members = h.members.filter(m => m !== c);
      if (h.members.length) return true;
      this.sites.delete(h.site);
      return false;
    });
  }

  /** A creature's bounding sphere in the world (the model's, posed and scaled like the drawn instance). */
  private boundsOf(c: Creature): { center: THREE.Vector3; radius: number } {
    const b = c.render.bounds;
    this.x.crossVectors(c.dir, c.face).normalize();
    const center = c.pos.clone()
      .addScaledVector(this.x, b.center.x * c.scale)
      .addScaledVector(c.dir, b.center.y * c.scale)
      .addScaledVector(c.face, b.center.z * c.scale);
    return { center, radius: b.radius * c.scale };
  }

  /** Counts for debugging / perf checks. */
  public debugCounts(): { planet: string | null; herds: number; creatures: number; species: Record<string, number> } {
    const species: Record<string, number> = {};
    let creatures = 0;
    for (const h of this.herds) for (const c of h.members) { const n = heads(c); species[c.render.id] = (species[c.render.id] ?? 0) + n; creatures += n; }
    return { planet: this.planet?.getName() ?? null, herds: this.herds.length, creatures, species };
  }

  /** Every live creature's species and world position (debug / screenshots). */
  public debugCreatures(): { id: string; uid: number; pos: THREE.Vector3; moving: boolean }[] {
    return this.herds.flatMap(h => h.members.flatMap(c => c.boids
      ? c.boids.map(b => ({ id: c.render.id, uid: c.id, pos: b.pos.clone(), moving: b.speed > 0.05 }))
      : [{ id: c.render.id, uid: c.id, pos: c.pos.clone(), moving: c.speed > 0.05 }]));
  }

  private clear(): void {
    this.remoteSnap = null;
    this.herds = [];
    this.sites.clear();
    this.lastScan.set(1e9, 0, 0);
    this.sinceScan = Infinity;
    for (const r of this.renders.values()) { r.count = 0; r.mesh.count = 0; }
  }

  private load(id: FaunaSpeciesId): void {
    if (this.renders.has(id) || this.loading.has(id)) return;
    this.loading.add(id);
    fetch(getAssetPath(`/animations/${FAUNA_SPECIES[id].anim ?? id}.anim.json`))
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<AnimFile>; })
      .then(file => { this.renders.set(id, new SpeciesRender(id, FAUNA_SPECIES[id], buildFaunaModel(id), file, this.scene)); })
      .catch(e => console.error(`[Fauna] could not load ${id} animation:`, e));
  }

  /**
   * Where a species may be on a tile (null = not here): land walkers on dry
   * ground, land fliers over any ground, crawlers on submerged seabed and
   * swimmers in water deep enough for them.
   */
  private floorAt(cfg: FaunaSpecies, planet: Planet, tileIndex: number): Floor | null {
    const habitat = habitatOf(cfg);
    if (habitat === 'land') {
      const { top, block } = surfaceTop(planet, tileIndex);
      if (top < 0) return null;
      const grounded = cfg.motion === 'walk' || cfg.motion === 'hop';
      if (grounded && (block === HexBlockType.WATER || block === HexBlockType.ICE)) return null;
      const r = planet.depthToRadius(top);
      return { r, surf: r };
    }
    const col = waterColumn(planet, tileIndex);
    if (!col) return null;
    const W = waterLife(planet.getName());
    if (col.depth < (habitat === 'seabed' ? W.minCrawlDepth : W.minSwimDepth)) return null;
    return { r: col.seabed, surf: col.surface };
  }

  /** Half a swimmer's height plus its bob: what the margins add to (so its body stays in the water). */
  private halfHeight(c: Creature, W: WaterLifeConfig): number {
    return c.render.bounds.radius * c.scale * W.bodyHalf + c.cfg.bob[0];
  }

  /** The radius a swimmer wants (its column fraction), clamped into the water. */
  private swimTarget(c: Creature, W: WaterLifeConfig): number {
    const half = this.halfHeight(c, W);
    const want = columnRadius(c.tileR, c.surfR, c.depthT);
    return swimRadius(want, c.tileR, c.surfR, W.bedMargin + half, W.surfaceMargin + half);
  }

  /**
   * Herd sites: a fixed sparse set of tiles (by tile hash, like ground
   * clutter's placement), listed once per planet so a scan only tests a few
   * hundred directions instead of walking every tile round the player. A
   * site's hash is kept: land uses the sites under C.siteChance, water those
   * under its body's water siteChance, so each habitat has its own density.
   */
  private sitesOf(planet: Planet): Site[] {
    let list = this.siteLists.get(planet);
    if (!list) {
      list = [];
      const chance = Math.max(C.siteChance, waterLife(planet.getName()).siteChance);
      for (const tile of planet.getPolyhedron().tiles) {
        const h = tileHash(tile.index ^ SITE_SALT) * HASH_SCALE;
        if (h < chance) list.push({ tile, dir: tile.center.clone().normalize(), h });
      }
      this.siteLists.set(planet, list);
    }
    return list;
  }

  /** Spawn herds at the sites round one viewer (self: this client's player; viewers: how many share the caps). */
  private scan(planet: Planet, player: THREE.Vector3, roster: FaunaSpeciesId[], viewers: number, self: boolean): void {
    const W = waterLife(planet.getName());
    const landRoster = roster.filter(id => !isWaterLife(FAUNA_SPECIES[id]));
    const waterRoster = roster.filter(id => isWaterLife(FAUNA_SPECIES[id]));
    let live = 0, liveWater = 0;
    for (const h of this.herds) for (const c of h.members) { const n = heads(c); live += n; if (isWaterLife(c.cfg)) liveWater += n; }
    const maxAll = C.maxCreatures * viewers, maxLand = C.maxLand * viewers, maxWater = C.maxWater * viewers;
    const minDist = self && this.arrived ? C.arrivalMinSpawnDistance : C.minSpawnDistance;
    const playerDir = player.clone().sub(planet.center);
    const playerR = playerDir.length();
    playerDir.divideScalar(playerR);
    // angular radius of the spawn ring, measured at the player's height
    const cosMax = Math.cos(Math.min(Math.PI, C.spawnRadius / playerR));
    let sawGround = false;
    for (const { tile, dir, h } of this.sitesOf(planet)) {
      if (live >= maxAll) break;
      if (dir.dot(playerDir) < cosMax || this.sites.has(tile.index)) continue;
      const { top, block } = surfaceTop(planet, tile.index);
      if (top >= 0) sawGround = true;
      // the habitat branch: water sites spawn water / seabed life, dry land the land roster
      let pool: FaunaSpeciesId[];
      let ground: number;
      if (block === HexBlockType.WATER && top >= 0) {
        if (h >= W.siteChance || liveWater >= maxWater) continue;
        const col = waterColumn(planet, tile.index);
        if (!col) continue;
        pool = waterRoster.filter(id => col.depth >= (habitatOf(FAUNA_SPECIES[id]) === 'seabed' ? W.minCrawlDepth : W.minSwimDepth));
        ground = col.seabed;
      } else {
        if (h >= C.siteChance || live - liveWater >= maxLand || !isDryLand(top, block)) continue;
        pool = landRoster;
        ground = planet.depthToRadius(top);
      }
      if (!pool.length) continue;
      this.v.copy(planet.center).addScaledVector(dir, ground);
      const d = this.v.distanceTo(player);
      if (d < minDist || d > C.spawnRadius) continue;
      // species by weight, herd size from the same hash: stable per site
      const totalWeight = pool.reduce((s, id) => s + FAUNA_SPECIES[id].weight, 0);
      const pick = tileHash(Math.imul(tile.index, SPECIES_MUL) ^ SPECIES_SALT);
      let rnd = pick * HASH_SCALE * totalWeight;
      let id = pool[pool.length - 1];
      for (const s of pool) { rnd -= FAUNA_SPECIES[s].weight; if (rnd < 0) { id = s; break; } }
      const render = this.renders.get(id);
      if (!render) continue; // still loading: the site is tried again next scan
      const cfg = FAUNA_SPECIES[id];
      const water = isWaterLife(cfg);
      const want = cfg.herd[0] + (tileHash(pick) % (cfg.herd[1] - cfg.herd[0] + 1));
      const room = Math.min(want, maxAll - live, (water ? maxWater - liveWater : maxLand - (live - liveWater)),
        C.maxPerSpecies - this.speciesCount(render));
      if (room <= 0) continue;
      const members: Creature[] = [];
      if (cfg.school) {
        // a school: one anchor, its fish flocking round it
        const c = this.spawn(planet, render, tile, dir, ground);
        if (c) { this.addFlock(c, room, planet); members.push(c); }
      } else {
        for (let i = 0; i < room; i++) {
          const c = this.spawn(planet, render, tile, dir, ground);
          if (c) members.push(c);
        }
      }
      if (!members.length) continue;
      this.sites.add(tile.index);
      this.herds.push({ site: tile.index, members });
      const n = members.reduce((k, c) => k + heads(c), 0);
      live += n;
      if (water) liveWater += n;
    }
    // the first scan that finds generated terrain counts as the arrival one
    if (self && sawGround) this.arrived = false;
  }

  private speciesCount(render: SpeciesRender): number {
    let n = 0;
    for (const h of this.herds) for (const c of h.members) if (c.render === render) n += heads(c);
    return n;
  }

  /** One new member of a herd at a site (or a school's anchor). */
  private spawn(planet: Planet, render: SpeciesRender, site: HexTile, siteDir: THREE.Vector3, siteGround: number): Creature | null {
    const cfg = render.cfg;
    const land = !isWaterLife(cfg);
    const fits = (ti: number) => {
      if (land) { const { top, block } = surfaceTop(planet, ti); return isDryLand(top, block) ? this.floorAt(cfg, planet, ti) : null; }
      return this.floorAt(cfg, planet, ti);
    };
    // scatter round the site: a random tangent offset within about a tile
    const up = siteDir;
    const t = randomTangent(up, new THREE.Vector3());
    const spread = (planet.getBlockHeight() + 1) * Math.random();
    const dir = up.clone().multiplyScalar(siteGround).addScaledVector(t, spread).normalize();
    let tile = planet.getPolyhedron().getTileAtPointFromHint(dir.clone().multiplyScalar(planet.radius), site);
    let floor = fits(tile.index);
    if (!floor) { tile = site; dir.copy(siteDir); floor = fits(tile.index); }
    if (!floor) return null;
    const heading = randomTangent(dir, new THREE.Vector3());
    const c: Creature = {
      id: this.nextId++, render, cfg, dir, pos: new THREE.Vector3(), heading, face: heading.clone(), tile,
      tileR: floor.r, groundR: floor.r, surfR: floor.surf, depthT: lerp(cfg.swimBand ?? [0.5, 0.5], Math.random()),
      hover: lerp(cfg.hover, Math.random()),
      state: State.Idle, timer: lerp(cfg.idleTime, Math.random()), speed: 0,
      phase: [Math.random(), Math.random()], moveW: 0,
      scale: lerp(cfg.scale, Math.random()), tint: lerp(C.tint, Math.random()), bobPhase: Math.random() * Math.PI * 2,
      ranch: newRanchState(), panic: 0, fleeFrom: new THREE.Vector3(), shove: new THREE.Vector3(),
    };
    if (swims(cfg)) c.groundR = this.swimTarget(c, waterLife(planet.getName()));
    this.place(c, planet);
    return c;
  }

  private step(c: Creature, planet: Planet, player: THREE.Vector3, dt: number): void {
    const cfg = c.cfg;
    const up = c.dir;
    const swimmer = swims(cfg);
    const W = swimmer ? waterLife(planet.getName()) : null;
    // a school sees the player through its nearest fish
    let dist = c.pos.distanceTo(player);
    if (c.boids) for (const b of c.boids) dist = Math.min(dist, b.pos.distanceTo(player));
    if (cfg.fleeRadius > 0 && dist < cfg.fleeRadius) c.state = State.Flee;
    if (c.panic > 0) {
      // hit: run from there until the panic wears off
      c.panic -= dt;
      c.state = State.Flee;
      c.heading.copy(c.pos).sub(c.fleeFrom);
      tangent(c.heading, up);
      if (swimmer) c.depthT = W!.fleeDepth;
      if (c.panic <= 0) { c.state = State.Wander; c.timer = lerp(cfg.wanderTime, Math.random()); }
    } else if (c.state === State.Flee) {
      if (dist > cfg.fleeRadius * C.fleeRelease) {
        c.state = State.Wander;
        c.timer = lerp(cfg.wanderTime, Math.random());
      } else {
        c.heading.copy(c.pos).sub(player);
        tangent(c.heading, up);
        if (swimmer) c.depthT = W!.fleeDepth;
      }
    } else {
      c.timer -= dt;
      if (c.timer <= 0) {
        if (c.state === State.Idle) {
          c.state = State.Wander;
          c.timer = lerp(cfg.wanderTime, Math.random());
          // a new heading: a turn of up to about 90 degrees either way
          c.heading.copy(c.face).applyAxisAngle(up, (Math.random() - 0.5) * Math.PI);
          tangent(c.heading, up);
          // swimmers pick a new depth to cruise at
          if (swimmer) c.depthT = lerp(cfg.swimBand ?? [0.5, 0.5], Math.random());
        } else {
          c.state = State.Idle;
          c.timer = lerp(cfg.idleTime, Math.random());
        }
      }
    }
    const target = c.state === State.Idle ? 0 : c.state === State.Wander ? cfg.walkSpeed : cfg.fleeSpeed;
    const blend = Math.min(1, dt * C.blendRate);
    c.speed += (target - c.speed) * blend;
    c.face.lerp(c.heading, Math.min(1, dt * C.turnRate));
    tangent(c.face, up);

    const vel = this.y.copy(c.face).multiplyScalar(c.speed).add(c.shove);
    c.shove.multiplyScalar(Math.max(0, 1 - dt * RANCHING.SHOVE_DECAY));
    if (vel.lengthSq() > 1e-4) {
      const next = this.v.copy(c.dir).multiplyScalar(c.groundR).addScaledVector(vel, dt).normalize();
      const tile = planet.getPolyhedron().getTileAtPointFromHint(this.x.copy(next).multiplyScalar(planet.radius), c.tile);
      let ok = true;
      if (tile !== c.tile) {
        const floor = this.floorAt(cfg, planet, tile.index);
        const stepping = !swimmer && cfg.motion !== 'fly' && cfg.motion !== 'float';
        if (!floor) ok = false;
        else if (stepping && Math.abs(floor.r - c.tileR) > cfg.maxStep * planet.getBlockHeight() + 1e-3) ok = false;
        else if (swimmer && !clearsSeabed(c.groundR, floor.r, floor.surf, W!.bedMargin + this.halfHeight(c, W!))) {
          // a seabed rising ahead: swim up before going on
          ok = false;
          c.depthT = Math.min(1, c.depthT + W!.riseOnBlock);
        }
        if (ok) { c.tile = tile; c.tileR = floor!.r; c.surfR = floor!.surf; }
      }
      if (ok) {
        c.dir.copy(next);
      } else if (swimmer) {
        // the shore (or a rising bed): turn round smoothly, slowing, instead of snapping
        c.shove.set(0, 0, 0);
        c.heading.copy(c.face).negate().applyAxisAngle(up, (Math.random() - 0.5) * W!.turnJitter);
        tangent(c.heading, up);
        c.speed *= W!.blockedSpeedKeep;
        if (c.state === State.Idle) c.state = State.Wander;
      } else {
        // turn back from water / cliffs
        c.shove.set(0, 0, 0);
        c.heading.negate();
        c.face.copy(c.heading);
        if (c.state === State.Idle) c.state = State.Wander;
      }
    }
    if (swimmer) {
      // ease to the depth it wants, then hold it inside this tile's water
      const want = this.swimTarget(c, W!);
      c.groundR += (want - c.groundR) * Math.min(1, dt * W!.depthFollowRate);
      const half = this.halfHeight(c, W!);
      c.groundR = swimRadius(c.groundR, c.tileR, c.surfR, W!.bedMargin + half, W!.surfaceMargin + half);
    } else {
      c.groundR += (c.tileR - c.groundR) * Math.min(1, dt * C.heightFollowRate);
    }
    this.animate(c, dt);
    this.place(c, planet);
    if (c.boids) this.stepFlock(c, planet, player, dt);
  }

  /** A school's fish round its anchor: (n) new ones scattered in its spread. */
  private addFlock(c: Creature, n: number, planet: Planet): void {
    const boids = seedSchool(n, c.dir, c.cfg.school ?? 0, FAUNA_SCHOOL);
    c.boids = boids.map(b => ({
      ...b, pos: c.pos.clone().add(b.off), up: c.dir.clone(), face: c.face.clone(), tile: c.tile,
      clip: [Math.random(), Math.random()] as [number, number], speed: 0,
      scale: lerp(c.cfg.scale, Math.random()), tint: lerp(C.tint, Math.random()),
    }));
    this.stepFlock(c, planet, null, 0);
  }

  /**
   * A school's flock step (host and drawn alike, round wherever the anchor
   * is): the boids rules (Schooling.ts), then each fish held in the water
   * column under it - over the shore or too-shallow water it is drawn back
   * to the anchor - facing the way it swims.
   */
  private stepFlock(c: Creature, planet: Planet, player: THREE.Vector3 | null, dt: number): void {
    const boids = c.boids!;
    const S = FAUNA_SCHOOL;
    const W = waterLife(planet.getName());
    const poly = planet.getPolyhedron();
    stepSchool(boids, {
      up: c.dir, radius: c.cfg.school ?? 0, threat: player ? this.threat.copy(player).sub(c.pos) : null,
      fleeRadius: c.cfg.fleeRadius, speed: c.cfg.walkSpeed, time: this.time,
    }, S, dt);
    const anchorVel = this.y.copy(c.face).multiplyScalar(c.speed);
    const blend = Math.min(1, dt * C.blendRate);
    for (const b of boids) {
      const rel = this.v.copy(c.pos).add(b.off).sub(planet.center);
      let r = rel.length();
      b.up.copy(rel).divideScalar(r);
      b.tile = poly.getTileAtPointFromHint(this.x.copy(b.up).multiplyScalar(planet.radius), b.tile);
      let floor = this.floorAt(c.cfg, planet, b.tile.index);
      if (!floor) {
        // over the shore: back toward the anchor, in the anchor's water
        b.off.multiplyScalar(Math.max(0, 1 - dt * S.shorePull));
        b.vel.addScaledVector(b.off, -dt * S.shorePull);
        floor = { r: c.tileR, surf: c.surfR };
        rel.copy(c.pos).add(b.off).sub(planet.center);
        r = rel.length();
        b.up.copy(rel).divideScalar(r);
      }
      const half = c.render.bounds.radius * b.scale * W.bodyHalf;
      const held = swimRadius(r, floor.r, floor.surf, W.bedMargin + half, W.surfaceMargin + half);
      if (held !== r) {
        // at the bed or the surface: stop pushing into it
        const into = b.vel.dot(b.up) * (held - r);
        if (into < 0) b.vel.addScaledVector(b.up, -b.vel.dot(b.up));
        r = held;
      }
      b.pos.copy(planet.center).addScaledVector(b.up, r);
      b.off.copy(b.pos).sub(c.pos);
      // face the way it swims (the school's velocity plus its own)
      const vel = this.x.copy(anchorVel).add(b.vel);
      vel.addScaledVector(b.up, -vel.dot(b.up));
      b.speed += (vel.length() - b.speed) * blend;
      if (vel.lengthSq() > 1e-6) b.face.lerp(vel.normalize(), Math.min(1, dt * S.faceRate));
      tangent(b.face, b.up);
      // its fin beat quickens with its speed (never stops: swimmers always fin)
      const rate = Math.max(b.speed / c.cfg.walkSpeed, 1);
      b.clip[CLIP_IDLE] = (b.clip[CLIP_IDLE] + dt / c.render.durations[CLIP_IDLE]) % 1;
      b.clip[CLIP_MOVE] = (b.clip[CLIP_MOVE] + dt / c.render.durations[CLIP_MOVE] * rate) % 1;
    }
  }

  /** Advance the creature's clips from its speed (host and drawn alike). */
  private animate(c: Creature, dt: number): void {
    const cfg = c.cfg;
    const blend = Math.min(1, dt * C.blendRate);
    // clip phases: the move cycle quickens with speed (fliers and swimmers never stop flapping / finning)
    c.phase[CLIP_IDLE] = (c.phase[CLIP_IDLE] + dt / c.render.durations[CLIP_IDLE]) % 1;
    const always = cfg.motion === 'fly' || cfg.motion === 'float' || swims(cfg);
    const rate = Math.max(c.speed / cfg.walkSpeed, always ? 1 : 0);
    c.phase[CLIP_MOVE] = (c.phase[CLIP_MOVE] + dt / c.render.durations[CLIP_MOVE] * rate) % 1;
    if (c.target) return; // drawn: the host's move weight is followed instead
    const moving = c.speed > cfg.walkSpeed * 0.2 ? 1 : 0;
    c.moveW += (moving - c.moveW) * blend;
  }

  private place(c: Creature, planet: Planet): void {
    let lift = 0;
    const bob = Math.sin(this.time * Math.PI * 2 * c.cfg.bob[1] + c.bobPhase) * c.cfg.bob[0];
    if (c.cfg.motion === 'fly' || c.cfg.motion === 'float') lift = c.hover + bob;
    // swimmers bob about their depth (halfHeight counts the bob, so it stays in the water)
    else if (swims(c.cfg)) lift = bob;
    c.pos.copy(planet.center).addScaledVector(c.dir, c.groundR + lift);
  }

  private despawn(viewers: THREE.Vector3[]): void {
    const far = C.despawnRadius;
    this.herds = this.herds.filter(h => {
      if (h.members.some(c => viewers.some(v => c.pos.distanceTo(v) < far))) return true;
      this.sites.delete(h.site);
      return false;
    });
  }

  private draw(): void {
    for (const r of this.renders.values()) r.count = 0;
    for (const h of this.herds) {
      for (const c of h.members) {
        const r = c.render;
        if (c.boids) {
          // a school: its fish, not its anchor
          for (const b of c.boids) {
            if (r.count >= C.maxPerSpecies) break;
            const i = r.count++;
            this.x.crossVectors(b.up, b.face).normalize();
            this.m.makeBasis(this.x, b.up, b.face).scale(this.v.setScalar(b.scale)).setPosition(b.pos);
            r.mesh.setMatrixAt(i, this.m);
            r.mesh.setColorAt(i, this.col.setScalar(b.tint));
            r.anim.setXYZ(i, 1, b.clip[CLIP_IDLE], b.clip[CLIP_MOVE]);
            r.fleece?.setX(i, 1);
          }
          continue;
        }
        if (r.count >= C.maxPerSpecies) continue;
        const i = r.count++;
        this.x.crossVectors(c.dir, c.face).normalize();
        this.m.makeBasis(this.x, c.dir, c.face).scale(this.v.setScalar(c.scale)).setPosition(c.pos);
        r.mesh.setMatrixAt(i, this.m);
        r.mesh.setColorAt(i, this.col.setScalar(c.tint));
        r.anim.setXYZ(i, c.moveW, c.phase[CLIP_IDLE], c.phase[CLIP_MOVE]);
        r.fleece?.setX(i, isShorn(c.ranch, this.time) ? RANCHING.SHORN_FLEECE_SCALE : 1);
      }
    }
    for (const r of this.renders.values()) {
      r.mesh.count = r.count;
      if (!r.count) continue;
      r.mesh.instanceMatrix.needsUpdate = true;
      if (r.mesh.instanceColor) r.mesh.instanceColor.needsUpdate = true;
      r.anim.needsUpdate = true;
      if (r.fleece) r.fleece.needsUpdate = true;
    }
  }
}

/** How many animals a creature is (a school's anchor: its fish) - what the caps count. */
function heads(c: Creature): number {
  return c.boids ? c.boids.length : 1;
}

function nearest(p: THREE.Vector3, list: THREE.Vector3[]): THREE.Vector3 {
  let best = list[0], bd = Infinity;
  for (const v of list) { const d = v.distanceToSquared(p); if (d < bd) { bd = d; best = v; } }
  return best;
}

function isDryLand(top: number, block: number): boolean {
  return top >= 0 && block !== HexBlockType.WATER && block !== HexBlockType.ICE;
}

function lerp(range: [number, number], t: number): number {
  return range[0] + (range[1] - range[0]) * t;
}

/** Project v onto the plane normal to up, normalised (in place). */
function tangent(v: THREE.Vector3, up: THREE.Vector3): THREE.Vector3 {
  v.addScaledVector(up, -v.dot(up));
  if (v.lengthSq() < 1e-8) randomTangent(up, v);
  return v.normalize();
}

function randomTangent(up: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  out.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5);
  out.addScaledVector(up, -out.dot(up));
  if (out.lengthSq() < 1e-8) out.set(1, 0, 0).addScaledVector(up, -up.x);
  return out.normalize();
}

function makeMaterial(F: number, P: number, keys: Float32Array, pivot: Float32Array, axis: Float32Array,
  parent: Float32Array, glow: number, fleecePart: number): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uKeys: { value: keys },
      uPivot: { value: pivot },
      uAxis: { value: axis },
      uParent: { value: parent },
      uGlow: { value: glow },
      uAmbient: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
      uNight: { value: C.nightAmbient },
      uDiffuse: { value: C.sunDiffuse },
      sunDirection: { value: new THREE.Vector3(1, 0, 0) },
      planetCenter: { value: new THREE.Vector3() },
      ...skyLightUniforms(),
    },
    defines: { FRAMES: F, PARTS: P, CLIPS: CLIP_NAMES.length, FLEECE_PART: fleecePart },
    vertexShader: `
      uniform vec4 uKeys[CLIPS * FRAMES * PARTS];
      uniform vec3 uPivot[PARTS];
      uniform vec3 uAxis[PARTS];
      uniform float uParent[PARTS];
      attribute vec3 aColor;
      attribute float aGlow;
      attribute float aPart;
      attribute vec3 aAnim; // move weight, idle phase, move phase
      #if FLEECE_PART >= 0
        attribute float aFleece; // fleece size: 1 = full, shorn = smaller / gone
      #endif
      varying vec3 vColor;
      varying float vGlow;
      varying vec3 vNormal;
      varying vec3 vWorld;

      vec4 keyAt(int clip, float phase, int p) {
        float f = fract(phase) * float(FRAMES);
        int f0 = int(f);
        int f1 = f0 + 1 >= FRAMES ? 0 : f0 + 1;
        return mix(uKeys[(clip * FRAMES + f0) * PARTS + p], uKeys[(clip * FRAMES + f1) * PARTS + p], f - float(f0));
      }
      vec3 rotAxis(vec3 v, vec3 a, float ang) {
        float c = cos(ang), s = sin(ang);
        return v * c + cross(a, v) * s + a * dot(a, v) * (1.0 - c);
      }
      void main() {
        vec3 pos = position;
        vec3 nrm = normal;
        int p = int(aPart + 0.5);
        #if FLEECE_PART >= 0
          if (p == FLEECE_PART) pos = uPivot[FLEECE_PART] + (pos - uPivot[FLEECE_PART]) * aFleece;
        #endif
        // the part's own pose, then each parent's, up to the body
        for (int i = 0; i < PARTS; i++) {
          if (p < 0) break;
          vec4 k = mix(keyAt(0, aAnim.y, p), keyAt(1, aAnim.z, p), aAnim.x);
          pos = rotAxis(pos - uPivot[p], uAxis[p], k.x) + uPivot[p] + k.yzw;
          nrm = rotAxis(nrm, uAxis[p], k.x);
          p = int(floor(uParent[p] + 0.5));
        }
        vColor = aColor;
        #ifdef USE_INSTANCING_COLOR
          vColor *= instanceColor;
        #endif
        vGlow = aGlow;
        vec4 w = modelMatrix * instanceMatrix * vec4(pos, 1.0);
        vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * nrm);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: `
      uniform vec3 sunDirection;
      uniform vec3 planetCenter;
      uniform float uGlow;
      uniform float uAmbient;
      uniform float uNight;
      uniform float uDiffuse;
      #include <tenebris_sky_light>
      varying vec3 vColor;
      varying float vGlow;
      varying vec3 vNormal;
      varying vec3 vWorld;
      void main() {
        vec3 up = normalize(vWorld - planetCenter);
        // The terrain's sky light (openspec sky-lighting): sun and fill by
        // this spot's sun height, so creatures sit in the same light (and
        // don't glow at night unless they really do: aGlow * uGlow)
        float facing = dot(up, sunDirection);
        vec3 ambient = uAmbient * skyFill(facing);
        float diff = max(0.0, dot(normalize(vNormal), sunDirection));
        vec3 lit = vColor * (ambient + uDiffuse * diff * skySun(facing));
        gl_FragColor = vec4(lit + vColor * vGlow * uGlow, 1.0);
      }
    `,
  });
}
