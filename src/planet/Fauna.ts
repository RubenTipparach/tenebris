import * as THREE from 'three';
import { Planet } from './Planet';
import { HexTile } from './GoldbergPolyhedron';
import { HexBlockType } from '../shared/blockTypes';
import { PlayerConfig } from '../config/PlayerConfig';
import { FAUNA_CONFIG as C, FAUNA_SPECIES, FaunaSpecies, FaunaSpeciesId, faunaRoster } from '../config/FaunaConfig';
import { buildFaunaModel, FaunaModel } from './FaunaModels';
import { surfaceTop, tileHash } from './SurfaceTiles';
import { getAssetPath } from '../utils/assetPath';

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
 */

const CLIP_IDLE = 0;
const CLIP_MOVE = 1;
const CLIP_NAMES = ['idle', 'move'];
const SITE_SALT = 0x5f3759df; // decorrelates herd sites from clutter placement
const SPECIES_MUL = 0x27d4eb2d; // and these the species pick from both
const SPECIES_SALT = 0x165667b1;
const HASH_SCALE = 1 / 4294967296;

const enum State { Idle, Wander, Flee }

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
    this.material = makeMaterial(F, P, keys, pivot, axis, parent, cfg.glow);
    const geometry = model.geometry;
    this.anim = new THREE.InstancedBufferAttribute(new Float32Array(C.maxPerSpecies * 3), 3);
    this.anim.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute('aAnim', this.anim);
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
  render: SpeciesRender;
  cfg: FaunaSpecies;
  dir: THREE.Vector3;     // unit direction from the planet centre
  pos: THREE.Vector3;     // world position (feet / body centre)
  heading: THREE.Vector3; // where it wants to go (tangent)
  face: THREE.Vector3;    // where it faces (tangent, eases to heading)
  tile: HexTile;
  tileR: number;          // terrain radius of its tile
  groundR: number;        // smoothed height it stands at
  hover: number;
  state: State;
  timer: number;
  speed: number;
  phase: [number, number];
  moveW: number;
  scale: number;
  tint: number;
  bobPhase: number;
}

interface Herd { site: number; members: Creature[] }
interface Site { tile: HexTile; dir: THREE.Vector3 }

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
  // scratch
  private m = new THREE.Matrix4();
  private v = new THREE.Vector3();
  private x = new THREE.Vector3();
  private col = new THREE.Color();

  constructor(private scene: THREE.Scene) {}

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
      }
    }
    if (!planet || roster.length === 0) return;
    for (const id of roster) this.load(id);

    this.sinceScan += dt;
    if (this.sinceScan >= C.rescanEverySeconds || player.distanceTo(this.lastScan) >= C.rescanMove) {
      this.scan(planet, player, roster);
    }
    for (const herd of this.herds) for (const c of herd.members) this.step(c, planet, player, dt);
    this.despawn(player);
    this.draw();
  }

  /** Counts for debugging / perf checks. */
  public debugCounts(): { planet: string | null; herds: number; creatures: number; species: Record<string, number> } {
    const species: Record<string, number> = {};
    let creatures = 0;
    for (const h of this.herds) for (const c of h.members) { species[c.render.id] = (species[c.render.id] ?? 0) + 1; creatures++; }
    return { planet: this.planet?.getName() ?? null, herds: this.herds.length, creatures, species };
  }

  /** Every live creature's species and world position (debug / screenshots). */
  public debugCreatures(): { id: string; pos: THREE.Vector3; moving: boolean }[] {
    return this.herds.flatMap(h => h.members.map(c => ({ id: c.render.id, pos: c.pos.clone(), moving: c.speed > 0.05 })));
  }

  private clear(): void {
    this.herds = [];
    this.sites.clear();
    this.lastScan.set(1e9, 0, 0);
    this.sinceScan = Infinity;
    for (const r of this.renders.values()) { r.count = 0; r.mesh.count = 0; }
  }

  private load(id: FaunaSpeciesId): void {
    if (this.renders.has(id) || this.loading.has(id)) return;
    this.loading.add(id);
    fetch(getAssetPath(`/animations/${id}.anim.json`))
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<AnimFile>; })
      .then(file => { this.renders.set(id, new SpeciesRender(id, FAUNA_SPECIES[id], buildFaunaModel(id), file, this.scene)); })
      .catch(e => console.error(`[Fauna] could not load ${id} animation:`, e));
  }

  /**
   * Herd sites: a fixed sparse set of tiles (by tile hash, like ground
   * clutter's placement), listed once per planet so a scan only tests a few
   * hundred directions instead of walking every tile round the player.
   */
  private sitesOf(planet: Planet): Site[] {
    let list = this.siteLists.get(planet);
    if (!list) {
      list = [];
      for (const tile of planet.getPolyhedron().tiles) {
        if (tileHash(tile.index ^ SITE_SALT) * HASH_SCALE < C.siteChance) {
          list.push({ tile, dir: tile.center.clone().normalize() });
        }
      }
      this.siteLists.set(planet, list);
    }
    return list;
  }

  private scan(planet: Planet, player: THREE.Vector3, roster: FaunaSpeciesId[]): void {
    this.sinceScan = 0;
    this.lastScan.copy(player);
    const totalWeight = roster.reduce((s, id) => s + FAUNA_SPECIES[id].weight, 0);
    let live = this.herds.reduce((s, h) => s + h.members.length, 0);
    const minDist = this.arrived ? C.arrivalMinSpawnDistance : C.minSpawnDistance;
    const playerDir = player.clone().sub(planet.center);
    const playerR = playerDir.length();
    playerDir.divideScalar(playerR);
    // angular radius of the spawn ring, measured at the player's height
    const cosMax = Math.cos(Math.min(Math.PI, C.spawnRadius / playerR));
    let sawGround = false;
    for (const { tile, dir } of this.sitesOf(planet)) {
      if (live >= C.maxCreatures) break;
      if (dir.dot(playerDir) < cosMax || this.sites.has(tile.index)) continue;
      const { top, block } = surfaceTop(planet, tile.index);
      if (top >= 0) sawGround = true;
      if (!isDryLand(top, block)) continue;
      const ground = planet.depthToRadius(top);
      this.v.copy(planet.center).addScaledVector(dir, ground);
      const d = this.v.distanceTo(player);
      if (d < minDist || d > C.spawnRadius) continue;
      // species by weight, herd size from the same hash: stable per site
      const pick = tileHash(Math.imul(tile.index, SPECIES_MUL) ^ SPECIES_SALT);
      let rnd = pick * HASH_SCALE * totalWeight;
      let id = roster[roster.length - 1];
      for (const s of roster) { rnd -= FAUNA_SPECIES[s].weight; if (rnd < 0) { id = s; break; } }
      const render = this.renders.get(id);
      if (!render) continue; // still loading: the site is tried again next scan
      const cfg = FAUNA_SPECIES[id];
      const want = cfg.herd[0] + (tileHash(pick) % (cfg.herd[1] - cfg.herd[0] + 1));
      const room = Math.min(want, C.maxCreatures - live, C.maxPerSpecies - this.speciesCount(render));
      if (room <= 0) continue;
      const members: Creature[] = [];
      for (let i = 0; i < room; i++) {
        const c = this.spawn(planet, render, tile, dir, ground);
        if (c) members.push(c);
      }
      if (!members.length) continue;
      this.sites.add(tile.index);
      this.herds.push({ site: tile.index, members });
      live += members.length;
    }
    // the first scan that finds generated terrain counts as the arrival one
    if (sawGround) this.arrived = false;
  }

  private speciesCount(render: SpeciesRender): number {
    let n = 0;
    for (const h of this.herds) for (const c of h.members) if (c.render === render) n++;
    return n;
  }

  private spawn(planet: Planet, render: SpeciesRender, site: HexTile, siteDir: THREE.Vector3, siteGround: number): Creature | null {
    const cfg = render.cfg;
    // scatter round the site: a random tangent offset within about a tile
    const up = siteDir;
    const t = randomTangent(up, new THREE.Vector3());
    const spread = (planet.getBlockHeight() + 1) * Math.random();
    const dir = up.clone().multiplyScalar(siteGround).addScaledVector(t, spread).normalize();
    let tile = planet.getPolyhedron().getTileAtPointFromHint(dir.clone().multiplyScalar(planet.radius), site);
    let { top, block } = surfaceTop(planet, tile.index);
    if (!isDryLand(top, block)) { tile = site; dir.copy(siteDir); ({ top, block } = surfaceTop(planet, tile.index)); }
    if (!isDryLand(top, block)) return null;
    const tileR = planet.depthToRadius(top);
    const heading = randomTangent(dir, new THREE.Vector3());
    const c: Creature = {
      render, cfg, dir, pos: new THREE.Vector3(), heading, face: heading.clone(), tile, tileR, groundR: tileR,
      hover: lerp(cfg.hover, Math.random()),
      state: State.Idle, timer: lerp(cfg.idleTime, Math.random()), speed: 0,
      phase: [Math.random(), Math.random()], moveW: 0,
      scale: lerp(cfg.scale, Math.random()), tint: lerp(C.tint, Math.random()), bobPhase: Math.random() * Math.PI * 2,
    };
    this.place(c, planet);
    return c;
  }

  private step(c: Creature, planet: Planet, player: THREE.Vector3, dt: number): void {
    const cfg = c.cfg;
    const up = c.dir;
    const dist = c.pos.distanceTo(player);
    if (cfg.fleeRadius > 0 && dist < cfg.fleeRadius) c.state = State.Flee;
    if (c.state === State.Flee) {
      if (dist > cfg.fleeRadius * C.fleeRelease) {
        c.state = State.Wander;
        c.timer = lerp(cfg.wanderTime, Math.random());
      } else {
        c.heading.copy(c.pos).sub(player);
        tangent(c.heading, up);
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

    if (c.speed > 0.01) {
      const next = this.v.copy(c.dir).multiplyScalar(c.groundR).addScaledVector(c.face, c.speed * dt).normalize();
      const tile = planet.getPolyhedron().getTileAtPointFromHint(this.x.copy(next).multiplyScalar(planet.radius), c.tile);
      let ok = true;
      if (tile !== c.tile) {
        const { top, block } = surfaceTop(planet, tile.index);
        const grounded = cfg.motion === 'walk' || cfg.motion === 'hop';
        const r = top >= 0 ? planet.depthToRadius(top) : 0;
        if (top < 0 || block === HexBlockType.ICE && grounded) ok = false;
        else if (grounded && (block === HexBlockType.WATER
          || Math.abs(r - c.tileR) > cfg.maxStep * planet.getBlockHeight() + 1e-3)) ok = false;
        if (ok) { c.tile = tile; c.tileR = r; }
      }
      if (ok) {
        c.dir.copy(next);
      } else {
        // turn back from water / cliffs
        c.heading.negate();
        c.face.copy(c.heading);
        if (c.state === State.Idle) c.state = State.Wander;
      }
    }
    c.groundR += (c.tileR - c.groundR) * Math.min(1, dt * C.heightFollowRate);

    // clip phases: the move cycle quickens with speed
    c.phase[CLIP_IDLE] = (c.phase[CLIP_IDLE] + dt / c.render.durations[CLIP_IDLE]) % 1;
    const rate = Math.max(c.speed / cfg.walkSpeed, cfg.motion === 'fly' || cfg.motion === 'float' ? 1 : 0);
    c.phase[CLIP_MOVE] = (c.phase[CLIP_MOVE] + dt / c.render.durations[CLIP_MOVE] * rate) % 1;
    const moving = c.speed > cfg.walkSpeed * 0.2 ? 1 : 0;
    c.moveW += (moving - c.moveW) * blend;
    this.place(c, planet);
  }

  private place(c: Creature, planet: Planet): void {
    let lift = 0;
    if (c.cfg.motion === 'fly' || c.cfg.motion === 'float') {
      lift = c.hover + Math.sin(this.time * Math.PI * 2 * c.cfg.bob[1] + c.bobPhase) * c.cfg.bob[0];
    }
    c.pos.copy(planet.center).addScaledVector(c.dir, c.groundR + lift);
  }

  private despawn(player: THREE.Vector3): void {
    const far = C.despawnRadius;
    this.herds = this.herds.filter(h => {
      if (h.members.some(c => c.pos.distanceTo(player) < far)) return true;
      this.sites.delete(h.site);
      return false;
    });
  }

  private draw(): void {
    for (const r of this.renders.values()) r.count = 0;
    for (const h of this.herds) {
      for (const c of h.members) {
        const r = c.render;
        const i = r.count++;
        this.x.crossVectors(c.dir, c.face).normalize();
        this.m.makeBasis(this.x, c.dir, c.face).scale(this.v.setScalar(c.scale)).setPosition(c.pos);
        r.mesh.setMatrixAt(i, this.m);
        r.mesh.setColorAt(i, this.col.setScalar(c.tint));
        r.anim.setXYZ(i, c.moveW, c.phase[CLIP_IDLE], c.phase[CLIP_MOVE]);
      }
    }
    for (const r of this.renders.values()) {
      r.mesh.count = r.count;
      if (!r.count) continue;
      r.mesh.instanceMatrix.needsUpdate = true;
      if (r.mesh.instanceColor) r.mesh.instanceColor.needsUpdate = true;
      r.anim.needsUpdate = true;
    }
  }
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
  parent: Float32Array, glow: number): THREE.ShaderMaterial {
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
    },
    defines: { FRAMES: F, PARTS: P, CLIPS: CLIP_NAMES.length },
    vertexShader: `
      uniform vec4 uKeys[CLIPS * FRAMES * PARTS];
      uniform vec3 uPivot[PARTS];
      uniform vec3 uAxis[PARTS];
      uniform float uParent[PARTS];
      attribute vec3 aColor;
      attribute float aGlow;
      attribute float aPart;
      attribute vec3 aAnim; // move weight, idle phase, move phase
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
      varying vec3 vColor;
      varying float vGlow;
      varying vec3 vNormal;
      varying vec3 vWorld;
      void main() {
        vec3 up = normalize(vWorld - planetCenter);
        // Same day/night curve as the terrain and ground clutter: ambient
        // falls to uNight on the night side, so creatures don't glow (unless
        // they really do: aGlow * uGlow)
        float facing = dot(up, sunDirection);
        float day = smoothstep(-0.1, 0.2, facing);
        float ambient = uAmbient * mix(uNight, 1.0, smoothstep(-0.1, 0.3, facing));
        float diff = max(0.0, dot(normalize(vNormal), sunDirection));
        vec3 lit = vColor * (ambient + uDiffuse * diff * day);
        gl_FragColor = vec4(lit + vColor * vGlow * uGlow, 1.0);
      }
    `,
  });
}
