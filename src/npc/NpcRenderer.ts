import * as THREE from 'three';
import { NpcSpecies } from '../config/NpcConfig';
import { getAssetPath } from '../utils/assetPath';
import { AnimFile, SpeciesRender } from '../planet/Fauna';
import type { FaunaSpeciesId } from '../config/FaunaConfig';
import { buildNpcModel, npcAnimId, npcSpecies } from './NpcModels';

/**
 * Draws the NPCs (openspec friendship-npcs, task 3.2): one fauna
 * SpeciesRender (an InstancedMesh with the clips played on the GPU) per NPC
 * species - the same creature renderer the animals use, with the talk clip
 * as its third channel. The motion code (task 3.3) owns the poses; this
 * only turns them into instances.
 */

/** One NPC as drawn this frame. Its clip phases (0..1) advance with `advanceNpcClips`. */
export interface NpcPose {
  species: string;
  pos: THREE.Vector3;
  up: THREE.Vector3;       // unit, away from the planet
  face: THREE.Vector3;     // unit, the way it faces (perpendicular to up)
  moveW: number;           // 0 = idle .. 1 = walking
  talkW: number;           // 0 .. 1 talking (layered over idle / move)
  phase: [number, number, number]; // idle, move, talk
}

const IDLE = 0, MOVE = 1, TALK = 2;

/** A pose standing still at pos, facing `face`. */
export function npcPose(species: string, pos: THREE.Vector3, up: THREE.Vector3, face: THREE.Vector3, seed = 0): NpcPose {
  const f = (seed * 0.618034) % 1; // spread the phases so a crowd does not move in step
  return { species, pos: pos.clone(), up: up.clone().normalize(), face: face.clone().normalize(), moveW: 0, talkW: 0, phase: [f, f, f] };
}

export class NpcRenderer {
  private readonly renders = new Map<string, SpeciesRender<NpcSpecies['look'] & { glow: number }>>();
  private readonly loading = new Set<string>();
  private readonly m = new THREE.Matrix4();
  private readonly x = new THREE.Vector3();
  private readonly col = new THREE.Color(1, 1, 1);

  constructor(private readonly scene: THREE.Scene, private readonly maxPerSpecies: number) {}

  /** Start loading every species' clips (cheap: one small JSON each). */
  loadAll(): Promise<void> {
    return Promise.all(npcSpecies().map(s => this.load(s))).then(() => undefined);
  }

  ready(species: string): boolean {
    return this.renders.has(species);
  }

  private load(s: NpcSpecies): Promise<void> {
    if (this.renders.has(s.id) || this.loading.has(s.id)) return Promise.resolve();
    this.loading.add(s.id);
    return fetch(getAssetPath(`/animations/${npcAnimId(s.id)}.anim.json`))
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<AnimFile>; })
      .then(file => {
        const cfg = { ...s.look, glow: 0 };
        this.renders.set(s.id, new SpeciesRender(s.id as FaunaSpeciesId, cfg, buildNpcModel(s), file, this.scene, this.maxPerSpecies));
      })
      .catch(e => console.error(`[Npc] could not load ${s.id} animation:`, e));
  }

  /** Clip timing of a species (seconds per loop: idle, move, talk), once loaded. */
  durations(species: string): number[] | null {
    return this.renders.get(species)?.durations ?? null;
  }

  /** Advance a pose's clip phases by dt; `rate` speeds the walk cycle with the stride. */
  advance(p: NpcPose, dt: number, rate = 1): void {
    const d = this.durations(p.species);
    if (!d) return;
    p.phase[IDLE] = (p.phase[IDLE] + dt / d[IDLE]) % 1;
    p.phase[MOVE] = (p.phase[MOVE] + dt / d[MOVE] * rate) % 1;
    p.phase[TALK] = (p.phase[TALK] + dt / (d[TALK] ?? 1)) % 1;
  }

  /** The sun and the planet the NPCs stand on (the fauna's day / night shading). */
  setLight(sunDirection: THREE.Vector3, planetCenter: THREE.Vector3, skyLight?: THREE.Texture): void {
    for (const r of this.renders.values()) {
      r.material.uniforms.sunDirection.value.copy(sunDirection);
      r.material.uniforms.planetCenter.value.copy(planetCenter);
      if (skyLight) r.material.uniforms.skyLight.value = skyLight;
    }
  }

  /** Draw these poses this frame (everything else is hidden). */
  draw(poses: readonly NpcPose[]): void {
    for (const r of this.renders.values()) r.count = 0;
    for (const p of poses) {
      const r = this.renders.get(p.species);
      if (!r || r.count >= r.max) continue;
      const i = r.count++;
      this.x.crossVectors(p.up, p.face).normalize();
      this.m.makeBasis(this.x, p.up, p.face).setPosition(p.pos);
      r.mesh.setMatrixAt(i, this.m);
      r.mesh.setColorAt(i, this.col);
      r.anim.setXYZ(i, p.moveW, p.phase[IDLE], p.phase[MOVE]);
      r.talk?.setXY(i, p.talkW, p.phase[TALK]);
    }
    for (const r of this.renders.values()) {
      r.mesh.count = r.count;
      r.mesh.visible = r.count > 0;
      if (!r.count) continue;
      r.mesh.instanceMatrix.needsUpdate = true;
      if (r.mesh.instanceColor) r.mesh.instanceColor.needsUpdate = true;
      r.anim.needsUpdate = true;
      if (r.talk) r.talk.needsUpdate = true;
    }
  }

  dispose(): void {
    for (const r of this.renders.values()) {
      this.scene.remove(r.mesh);
      r.mesh.geometry.dispose();
      r.material.dispose();
    }
    this.renders.clear();
  }
}
