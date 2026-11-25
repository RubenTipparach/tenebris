import * as THREE from 'three';
import { NPC_CONFIG } from '../config/NpcConfig';
import type { FaunaSpeciesId } from '../config/FaunaConfig';
import { AnimFile, SpeciesRender } from '../planet/Fauna';
import { FaunaModel, ModelBuilder } from '../planet/FaunaModels';
import type { Planet } from '../planet/Planet';
import { rngFor, VillageState } from '../shared/npc';
import { offsetDir, tangent } from './NpcMotion';

/**
 * Village structures (openspec friendship-npcs, task 3.4): drawn
 * procedurally per stage from the village record - never block edits, so
 * they cannot clash with what players build, and a reload (or a record
 * arriving from the server) rebuilds them like any placed object.
 *
 * Each STRUCTURES entry has a site round the village centre. A finished
 * structure shows all its stages, the one being built shows the stages
 * done (a staked-out plot before the first), later ones are not there yet.
 * The gallery shows the village's collected art on plinths.
 *
 * Drawn through the fauna's SpeciesRender (a model with no clips), so the
 * buildings are lit exactly like the people and animals beside them.
 */

const V = NPC_CONFIG.VILLAGE;
const L = NPC_CONFIG.STRUCTURE_LOOK;
const hex = (c: string) => parseInt(c.replace('#', ''), 16);
const STATIC: AnimFile = { species: 'structure', frames: 2, clips: { idle: { duration: 1, tracks: {} }, move: { duration: 1, tracks: {} } } };

/** What to draw of each structure: the stages done, or -1 = nothing yet (0 = the staked plot). */
export function structureStages(v: VillageState): number[] {
  return NPC_CONFIG.STRUCTURES.map((s, i) => (i < v.structure ? s.stages.length : i === v.structure ? v.stage : -1));
}

/** A structure's model with `stages` done (0: the plot), `art` pieces on show (the gallery). */
export function buildStructureModel(index: number, stages: number, art: number): FaunaModel {
  const b = new ModelBuilder();
  const id = NPC_CONFIG.STRUCTURES[index].id;
  const D = V.FOUNDATION_DEPTH_M;
  const brick = hex(L.brick), mortar = hex(L.mortar), steel = hex(L.steel), glass = hex(L.glass);
  const concrete = hex(L.concrete), roof = hex(L.roof);
  // the plot: corner stakes and a rope round them (what any structure is before its first stage)
  const plot = (w: number, d: number) => {
    for (const [x, z] of [[w, d], [-w, d], [w, -d], [-w, -d]]) b.box('body', [0.12, 1.0, 0.12], [x / 2, 0.3, z / 2], hex(L.stake));
    for (const [sx, sz, len, rot] of [[0, d / 2, w, 0], [0, -d / 2, w, 0], [w / 2, 0, d, Math.PI / 2], [-w / 2, 0, d, Math.PI / 2]]) {
      b.box('body', [len, 0.04, 0.04], [sx, 0.6, sz], hex(L.rope), { rot: [0, rot, 0] });
    }
  };
  const slab = (w: number, d: number, color: number) => b.box('body', [w, D + 0.2, d], [0, 0.1 - D / 2, 0], color);

  if (id === 'hall') {
    const W = 8, Dp = 6, H = 3, T = 0.4;
    const PITCH = 0.4, RISE = (W / 2) * Math.tan(PITCH); // the roof's slope and the ridge's height over the walls
    if (stages === 0) { plot(W, Dp); return b.build(); }
    slab(W + 0.6, Dp + 0.6, mortar);
    // stage 1 - brick walls, a door in the front (+Z)
    b.box('body', [W, H, T], [0, H / 2, -Dp / 2], brick);
    b.box('body', [T, H, Dp], [W / 2, H / 2, 0], brick);
    b.box('body', [T, H, Dp], [-W / 2, H / 2, 0], brick);
    b.box('body', [W / 2 - 0.8, H, T], [-(W / 4 + 0.4), H / 2, Dp / 2], brick);
    b.box('body', [W / 2 - 0.8, H, T], [W / 4 + 0.4, H / 2, Dp / 2], brick);
    b.box('body', [1.6, 0.8, T], [0, H - 0.4, Dp / 2], brick);
    for (const y of [0.9, 1.9]) b.box('body', [W + 0.02, 0.06, Dp + 0.02], [0, y, 0], mortar); // courses
    if (stages >= 2) {
      // stage 2 - the steel roof frame: corner posts and trusses
      for (const [x, z] of [[W / 2, Dp / 2], [-W / 2, Dp / 2], [W / 2, -Dp / 2], [-W / 2, -Dp / 2]]) b.box('body', [0.25, 0.6, 0.25], [x, H + 0.3, z], steel);
      // a gable: each side falls from the ridge to its eave (+x side tilts down towards +x)
      for (const z of [-Dp / 2, -Dp / 6, Dp / 6, Dp / 2]) {
        b.box('body', [W / 2 + 0.6, 0.18, 0.18], [W / 4, H + RISE / 2, z], steel, { rot: [0, 0, -PITCH] });
        b.box('body', [W / 2 + 0.6, 0.18, 0.18], [-W / 4, H + RISE / 2, z], steel, { rot: [0, 0, PITCH] });
      }
      b.box('body', [0.2, 0.2, Dp + 0.4], [0, H + RISE, 0], steel); // ridge
    }
    if (stages >= 3) {
      // stage 3 - steel-glass windows and the roof
      for (const sx of [1, -1]) for (const z of [-1.4, 1.4]) b.box('body', [T + 0.06, 1.0, 1.2], [sx * W / 2, 1.8, z], glass, { glow: 0.35 });
      for (const x of [-2.5, 2.5]) b.box('body', [1.2, 1.0, T + 0.06], [x, 1.8, -Dp / 2], glass, { glow: 0.35 });
      b.box('body', [W / 2 + 0.9, 0.15, Dp + 0.8], [W / 4, H + RISE / 2 + 0.15, 0], roof, { rot: [0, 0, -PITCH] });
      b.box('body', [W / 2 + 0.9, 0.15, Dp + 0.8], [-W / 4, H + RISE / 2 + 0.15, 0], roof, { rot: [0, 0, PITCH] });
    }
    return b.build();
  }

  if (id === 'granary') {
    const R = 2, H = 3.5;
    if (stages === 0) { plot(R * 2, R * 2); return b.build(); }
    slab(R * 2 + 0.6, R * 2 + 0.6, concrete);
    // stage 1 - the concrete silo
    b.add('body', new THREE.CylinderGeometry(R, R * 1.05, H, 10), concrete, { at: [0, H / 2, 0] });
    b.box('body', [1.0, 1.6, 0.3], [0, 0.8, R], hex(L.mortar)); // hatch
    if (stages >= 2) {
      // stage 2 - the brick upper tier and its roof
      b.add('body', new THREE.CylinderGeometry(R * 0.9, R * 0.95, 1.6, 10), brick, { at: [0, H + 0.8, 0] });
      b.add('body', new THREE.ConeGeometry(R * 1.15, 1.8, 10), roof, { at: [0, H + 2.5, 0] });
    }
    return b.build();
  }

  // the gallery
  const W = 6, Dp = 5, H = 2.6;
  if (stages === 0) { plot(W, Dp); return b.build(); }
  slab(W + 0.4, Dp + 0.4, hex(L.plinth));
  // stage 1 - glass walls
  for (const [w, d, x, z] of [[W, 0.15, 0, -Dp / 2], [0.15, Dp, W / 2, 0], [0.15, Dp, -W / 2, 0], [W / 2 - 0.7, 0.15, -(W / 4 + 0.35), Dp / 2], [W / 2 - 0.7, 0.15, W / 4 + 0.35, Dp / 2]]) {
    b.box('body', [w, H, d], [x, H / 2, z], glass, { glow: 0.3 });
  }
  if (stages >= 2) {
    // stage 2 - the steel frame and flat roof
    for (const [x, z] of [[W / 2, Dp / 2], [-W / 2, Dp / 2], [W / 2, -Dp / 2], [-W / 2, -Dp / 2]]) b.box('body', [0.22, H + 0.2, 0.22], [x, (H + 0.2) / 2, z], steel);
    b.box('body', [W + 0.6, 0.2, Dp + 0.6], [0, H + 0.2, 0], steel);
  }
  // the village's art on plinths (one per piece, along the back)
  const shown = Math.min(art, 6);
  for (let i = 0; i < shown; i++) {
    const x = (i - (shown - 1) / 2) * 0.9;
    b.box('body', [0.5, 0.9, 0.5], [x, 0.45, -Dp / 2 + 0.8], hex(L.plinth));
    b.add('body', new THREE.OctahedronGeometry(0.22, 0), hex(L.gem), { at: [x, 1.15, -Dp / 2 + 0.8], glow: 0.6 });
  }
  return b.build();
}

/** Where a village's structure stands: its unit direction and the way it faces (towards the centre). */
export function structureSite(worldSeed: number, body: string, village: number, centre: THREE.Vector3, index: number, radiusM: number): { dir: THREE.Vector3; face: THREE.Vector3 } {
  const r = rngFor(worldSeed, body, village, 'structures');
  const az = r() * Math.PI * 2 + (index / NPC_CONFIG.STRUCTURES.length) * Math.PI * 2;
  const dir = offsetDir(centre, az, V.STRUCTURE_RING_M, radiusM);
  const face = tangent(centre.clone().sub(dir), dir);
  return { dir, face };
}

interface Built { key: string; renders: SpeciesRender<{ glow: number }>[] }

/** A planet's village structures, rebuilt when a village record changes. */
export class VillageStructures {
  private built = new Map<number, Built>();
  private readonly m = new THREE.Matrix4();
  private readonly x = new THREE.Vector3();
  private readonly col = new THREE.Color(1, 1, 1);

  constructor(private readonly scene: THREE.Scene) {}

  /** villages[i]: its centre (unit dir) and record (null: not heard of yet). */
  update(planet: Planet, worldSeed: number, villages: Array<{ centre: THREE.Vector3; state: VillageState | null }>,
    sunDirection: THREE.Vector3): void {
    villages.forEach((v, i) => {
      const key = v.state ? JSON.stringify([structureStages(v.state), v.state.art.length]) : '';
      const have = this.built.get(i);
      if (have?.key === key) return;
      if (have) this.drop(have);
      this.built.set(i, { key, renders: v.state ? this.build(planet, worldSeed, i, v.centre, v.state) : [] });
    });
    for (const b of this.built.values()) {
      for (const r of b.renders) {
        r.material.uniforms.sunDirection.value.copy(sunDirection);
        r.material.uniforms.planetCenter.value.copy(planet.center);
        r.material.uniforms.skyLight.value = planet.getSkyLight();
      }
    }
  }

  private build(planet: Planet, seed: number, village: number, centre: THREE.Vector3, v: VillageState): SpeciesRender<{ glow: number }>[] {
    const out: SpeciesRender<{ glow: number }>[] = [];
    structureStages(v).forEach((stages, i) => {
      if (stages < 0) return;
      const model = buildStructureModel(i, stages, v.art.length);
      const r = new SpeciesRender(`structure_${i}` as FaunaSpeciesId, { glow: 0 }, model, STATIC, this.scene, 1);
      const { dir, face } = structureSite(seed, planet.getName(), village, centre, i, planet.radius);
      const pos = planet.center.clone().addScaledVector(dir, planet.getSurfaceHeightInDirection(dir));
      this.x.crossVectors(dir, face).normalize();
      this.m.makeBasis(this.x, dir, face).setPosition(pos);
      r.mesh.setMatrixAt(0, this.m);
      r.mesh.setColorAt(0, this.col);
      r.anim.setXYZ(0, 0, 0, 0);
      r.count = r.mesh.count = 1;
      r.mesh.visible = true;
      r.mesh.instanceMatrix.needsUpdate = true;
      if (r.mesh.instanceColor) r.mesh.instanceColor.needsUpdate = true;
      r.anim.needsUpdate = true;
      out.push(r);
    });
    return out;
  }

  private drop(b: Built): void {
    for (const r of b.renders) {
      this.scene.remove(r.mesh);
      r.mesh.geometry.dispose();
      r.material.dispose();
    }
  }

  clear(): void {
    for (const b of this.built.values()) this.drop(b);
    this.built.clear();
  }

  /** Debug: what each village shows (its draw key). */
  debugKeys(): string[] {
    return [...this.built.values()].map(b => b.key);
  }
}
