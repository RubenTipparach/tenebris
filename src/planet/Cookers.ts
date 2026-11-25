import { machineLightUniforms, withMachineLight } from './MachineLight';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { getAssetPath } from '../utils/assetPath';
import { PlayerConfig } from '../config/PlayerConfig';
import { InventorySlot, ItemType } from '../player/Inventory';
import { CAMPFIRE_MODEL, COOKERS, CookerKind } from '../config/CookingConfig';
import { CookerState, emptyCookerSlots, tickCooker } from '../player/Cooking';
import techVert from '../shaders/tech/tech.vert';
import techFrag from '../shaders/tech/tech.frag';

/**
 * The cooking stations - campfire, kiln and oven - as placed blocks: one
 * manager for all three (they differ only in their config row, COOKERS).
 * A station is a CookerState (its slots and progress) with a mesh; the
 * cooking itself is src/player/Cooking.ts. Built like the storage chest.
 */

export interface PlacedCooker extends CookerState {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  tileIndex: number;
  rotation: number;
}

// Atlas cells (48x32, 16 px each), as the furnace and chest lay theirs out
const ATLAS = { W: 48, H: 32, CELL: 16 } as const;

// The campfire atlas (gen-item-icons.py campfire_atlas): 2x2 cells of 16 px
type Cell = { u0: number; v0: number; u1: number; v1: number };
// Each cell is inset half a texel (of the 32 px atlas) so a quad's edge
// never samples the neighbouring cell (the flame's top picked up a row of
// the log end above it)
const FIRE_INSET = 0.5 / 32;
const fireCell = (x: number, y: number): Cell => ({
  u0: x / 2 + FIRE_INSET, u1: (x + 1) / 2 - FIRE_INSET, v0: 1 - (y + 1) / 2 + FIRE_INSET, v1: 1 - y / 2 - FIRE_INSET,
});
const FIRE = { BARK: fireCell(0, 0), END: fireCell(1, 0), STONE: fireCell(0, 1), FLAME: fireCell(1, 1) };

/** Squeeze a geometry's 0..1 UVs into one atlas cell, per box face (+X, -X, +Y, -Y, +Z, -Z). */
function intoCells(g: THREE.BufferGeometry, faceCells: Cell[]): THREE.BufferGeometry {
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const perFace = uv.count / faceCells.length;
  for (let i = 0; i < uv.count; i++) {
    const c = faceCells[Math.floor(i / perFace)];
    uv.setXY(i, c.u0 + uv.getX(i) * (c.u1 - c.u0), c.v0 + uv.getY(i) * (c.v1 - c.v0));
  }
  return g;
}

/**
 * The campfire: hearth stones in a ring and logs leaned into a teepee (one
 * lit mesh), plus two crossed flame cards (drawn unlit). Built standing on
 * the ground at y = -height / 2, as the station's centre is its origin.
 */
function buildCampfire(height: number): { body: THREE.BufferGeometry; flame: THREE.BufferGeometry; flameY: number } {
  const M = CAMPFIRE_MODEL;
  const ground = -height / 2;
  const parts: THREE.BufferGeometry[] = [];
  const m = new THREE.Matrix4();
  // Hearth stones, each turned a little differently
  const [sx, sy, sz] = M.STONE_SIZE;
  for (let i = 0; i < M.STONES; i++) {
    const a = (i / M.STONES) * Math.PI * 2;
    const g = intoCells(new THREE.BoxGeometry(sx, sy, sz), Array(6).fill(FIRE.STONE));
    g.applyMatrix4(m.makeRotationY(-a + (i % 3) * 0.3));
    g.applyMatrix4(m.makeTranslation(Math.cos(a) * M.STONE_R, ground + sy / 2, Math.sin(a) * M.STONE_R));
    parts.push(g);
  }
  // Logs: foot on the ground at LOG_BASE_R, leaning in to meet at LOG_PEAK_H
  const len = Math.hypot(M.LOG_BASE_R, M.LOG_PEAK_H);
  const lean = Math.atan2(M.LOG_PEAK_H, -M.LOG_BASE_R);
  for (let i = 0; i < M.LOGS; i++) {
    const a = (i / M.LOGS) * Math.PI * 2 + Math.PI / M.LOGS;
    // along X: the ends (+X, -X) show the cut rings, the rest is bark
    const g = intoCells(new THREE.BoxGeometry(len, M.LOG_THICK, M.LOG_THICK),
      [FIRE.END, FIRE.END, FIRE.BARK, FIRE.BARK, FIRE.BARK, FIRE.BARK]);
    g.applyMatrix4(m.makeRotationZ(lean));
    g.applyMatrix4(m.makeTranslation(M.LOG_BASE_R / 2, ground + M.LOG_PEAK_H / 2, 0));
    g.applyMatrix4(m.makeRotationY(a));
    parts.push(g);
  }
  const body = BufferGeometryUtils.mergeGeometries(parts)!;
  // Two crossed flame cards
  const cards: THREE.BufferGeometry[] = [];
  for (const turn of [0, Math.PI / 2]) {
    const g = intoCells(new THREE.PlaneGeometry(M.FLAME_W, M.FLAME_H), [FIRE.FLAME]);
    g.applyMatrix4(m.makeTranslation(0, M.FLAME_H / 2, 0));
    g.applyMatrix4(m.makeRotationY(turn));
    cards.push(g);
  }
  // Its foot is its origin, so the flicker stretches it up from the embers
  const flame = BufferGeometryUtils.mergeGeometries(cards)!;
  return { body, flame, flameY: ground + M.FLAME_BASE };
}

export class CookerManager {
  private cookers: PlacedCooker[] = [];
  private meshes: THREE.Mesh[] = [];
  private loader = new THREE.TextureLoader();
  private assets = new Map<CookerKind, Promise<{ geometry: THREE.BufferGeometry; material: THREE.ShaderMaterial; flame?: { geometry: THREE.BufferGeometry; material: THREE.Material; y: number } }>>();
  private clock = 0;
  private planetCenter: THREE.Vector3;
  private sunDirection: THREE.Vector3;
  private onCooked: ((cooker: PlacedCooker, item: ItemType) => void) | null = null;

  constructor(private scene: THREE.Scene, planetCenter?: THREE.Vector3, sunDirection?: THREE.Vector3) {
    this.planetCenter = planetCenter?.clone() ?? new THREE.Vector3();
    this.sunDirection = sunDirection?.clone() ?? new THREE.Vector3(1, 0, 0);
  }

  public setOnCooked(fn: (cooker: PlacedCooker, item: ItemType) => void): void {
    this.onCooked = fn;
  }

  public setSunDirection(direction: THREE.Vector3): void {
    this.sunDirection.copy(direction);
    for (const c of this.cookers) (c.mesh.material as THREE.ShaderMaterial).uniforms.sunDirection.value.copy(direction);
  }

  public setPlanetCenter(center: THREE.Vector3): void {
    this.planetCenter.copy(center);
    for (const c of this.cookers) (c.mesh.material as THREE.ShaderMaterial).uniforms.planetCenter.value.copy(center);
  }

  // One geometry + material per kind, loaded once
  private assetsFor(kind: CookerKind) {
    let p = this.assets.get(kind);
    if (!p) {
      p = this.loadAssets(kind);
      this.assets.set(kind, p);
    }
    return p;
  }

  private async loadAssets(kind: CookerKind) {
    const cfg = COOKERS[kind];
    const texture = await this.loader.loadAsync(getAssetPath(cfg.model ?? cfg.atlas ?? cfg.face));
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    let geometry: THREE.BufferGeometry = new THREE.BoxGeometry(cfg.width, cfg.height, cfg.width);
    let flame: { geometry: THREE.BufferGeometry; material: THREE.Material; y: number } | undefined;
    if (cfg.model) {
      const built = buildCampfire(cfg.height);
      geometry = built.body;
      // The flame glows: unlit, alpha-cut, seen from both sides
      flame = { geometry: built.flame, material: new THREE.MeshBasicMaterial({ map: texture, alphaTest: 0.5, side: THREE.DoubleSide }), y: built.flameY };
    } else if (cfg.atlas) {
      // Box faces: +X, -X, +Y, -Y, +Z (front), -Z
      const cell = (x: number, y: number) => ({
        u1: (x * ATLAS.CELL) / ATLAS.W, u2: ((x + 1) * ATLAS.CELL) / ATLAS.W,
        v1: 1 - ((y + 1) * ATLAS.CELL) / ATLAS.H, v2: 1 - (y * ATLAS.CELL) / ATLAS.H,
      });
      const front = cell(0, 0), side = cell(1, 0), top = cell(1, 1), bottom = cell(2, 1);
      const uv = geometry.attributes.uv.array as Float32Array;
      const face = (i: number, c: ReturnType<typeof cell>, flipH: boolean, flipV: boolean) => {
        const l = flipH ? c.u2 : c.u1, r = flipH ? c.u1 : c.u2, b = flipV ? c.v2 : c.v1, t = flipV ? c.v1 : c.v2;
        uv.set([l, b, r, b, l, t, r, t], i * 8);
      };
      face(0, side, true, true); face(1, side, false, true); face(2, top, false, false);
      face(3, bottom, false, false); face(4, front, false, true); face(5, side, true, true);
      geometry.attributes.uv.needsUpdate = true;
    }
    const material = new THREE.ShaderMaterial({
      uniforms: {
        techTexture: { value: texture },
        ...machineLightUniforms(),
        ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
        directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
      },
      vertexShader: techVert,
      fragmentShader: techFrag,
    });
    return { geometry, material, flame };
  }

  /**
   * Put a station on the ground at `groundPosition` (the top of the block
   * under it), facing `facing` radians round its up; restoring a save passes
   * the saved centre and angle instead (`savedCentre`).
   */
  public async place(kind: CookerKind, groundPosition: THREE.Vector3, planetCenter: THREE.Vector3, tileIndex: number,
                     facing: number, slots?: InventorySlot[], savedCentre?: THREE.Vector3, progress = 0): Promise<PlacedCooker> {
    const { geometry, material, flame } = await this.assetsFor(kind);
    const mesh = new THREE.Mesh(geometry, withMachineLight(material.clone()));
    if (flame) {
      const f = new THREE.Mesh(flame.geometry, flame.material);
      f.position.y = flame.y;
      f.raycast = () => {};            // aiming at the fire hits the station
      f.userData.phase = tileIndex % 7;
      mesh.add(f);
      mesh.userData.flame = f;
    }
    const up = (savedCentre ?? groundPosition).clone().sub(planetCenter).normalize();
    const centre = savedCentre ?? groundPosition.clone().addScaledVector(up, COOKERS[kind].height / 2);
    mesh.position.copy(centre);
    const align = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    mesh.quaternion.copy(new THREE.Quaternion().setFromAxisAngle(up, facing)).multiply(align);
    mesh.userData.isCooker = true;
    mesh.userData.tileIndex = tileIndex;
    this.scene.add(mesh);
    const cooker: PlacedCooker = { kind, mesh, position: centre.clone(), tileIndex, rotation: facing, slots: slots ?? emptyCookerSlots(), progress };
    this.cookers.push(cooker);
    this.meshes.push(mesh);
    return cooker;
  }

  /** Facing toward the player, like the other stations (hex-snapped per PlayerConfig). */
  public facingToward(position: THREE.Vector3, planetCenter: THREE.Vector3, playerForward: THREE.Vector3): number {
    const up = position.clone().sub(planetCenter).normalize();
    let tangent = new THREE.Vector3(1, 0, 0);
    if (Math.abs(up.dot(tangent)) > 0.9) tangent = new THREE.Vector3(0, 0, 1);
    const bitangent = new THREE.Vector3().crossVectors(up, tangent).normalize();
    tangent.crossVectors(bitangent, up).normalize();
    const toward = playerForward.clone().addScaledVector(up, -playerForward.dot(up)).normalize().negate();
    let angle = Math.atan2(toward.dot(bitangent), toward.dot(tangent));
    if (PlayerConfig.TECH_BLOCK_HEX_SNAP) angle = Math.round(angle / (Math.PI / 3)) * (Math.PI / 3);
    return angle + PlayerConfig.TECH_BLOCK_ROTATION_OFFSET * (Math.PI / 180);
  }

  /** Cook. Called every frame; announces each dish made. */
  public update(dt: number, simulates: (position: THREE.Vector3) => boolean = () => true): void {
    this.clock += dt;
    for (const c of this.cookers) {
      // The campfire's flame flickers (every client, cooking or not)
      const f = c.mesh.userData.flame as THREE.Mesh | undefined;
      if (f) {
        const w = Math.sin((this.clock + f.userData.phase) * CAMPFIRE_MODEL.FLICKER_HZ * Math.PI * 2);
        f.scale.set(1 - w * CAMPFIRE_MODEL.FLICKER_AMP / 2, 1 + w * CAMPFIRE_MODEL.FLICKER_AMP, 1);
      }
      // multiplayer: only the planet's host cooks (openspec mp-shared-objects)
      if (!simulates(c.position)) continue;
      const made = tickCooker(c, dt);
      if (made !== null) this.onCooked?.(c, made);
    }
  }

  public remove(cooker: PlacedCooker): void {
    const i = this.cookers.indexOf(cooker);
    if (i < 0) return;
    this.scene.remove(cooker.mesh);
    (cooker.mesh.material as THREE.Material).dispose();
    this.cookers.splice(i, 1);
    const m = this.meshes.indexOf(cooker.mesh);
    if (m >= 0) this.meshes.splice(m, 1);
  }

  public getMeshes(): THREE.Mesh[] { return this.meshes; }
  public getPlaced(): PlacedCooker[] { return this.cookers; }
  public getByMesh(mesh: THREE.Object3D): PlacedCooker | undefined { return this.cookers.find(c => c.mesh === mesh); }
  public getAtTile(tileIndex: number): PlacedCooker | undefined { return this.cookers.find(c => c.tileIndex === tileIndex); }

}
