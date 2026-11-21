import * as THREE from 'three';
import { getAssetPath } from '../utils/assetPath';
import { PlayerConfig } from '../config/PlayerConfig';
import { InventorySlot, ItemType } from '../player/Inventory';
import { COOKERS, CookerKind } from '../config/CookingConfig';
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

export class CookerManager {
  private cookers: PlacedCooker[] = [];
  private meshes: THREE.Mesh[] = [];
  private loader = new THREE.TextureLoader();
  private assets = new Map<CookerKind, Promise<{ geometry: THREE.BoxGeometry; material: THREE.ShaderMaterial }>>();
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
    const texture = await this.loader.loadAsync(getAssetPath(cfg.atlas ?? cfg.face));
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    const geometry = new THREE.BoxGeometry(cfg.width, cfg.height, cfg.width);
    if (cfg.atlas) {
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
        sunDirection: { value: this.sunDirection.clone() },
        planetCenter: { value: this.planetCenter.clone() },
        ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
        directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
        torchLight: { value: 0.0 },
      },
      vertexShader: techVert,
      fragmentShader: techFrag,
    });
    return { geometry, material };
  }

  /**
   * Put a station on the ground at `groundPosition` (the top of the block
   * under it), facing `facing` radians round its up; restoring a save passes
   * the saved centre and angle instead (`savedCentre`).
   */
  public async place(kind: CookerKind, groundPosition: THREE.Vector3, planetCenter: THREE.Vector3, tileIndex: number,
                     facing: number, slots?: InventorySlot[], savedCentre?: THREE.Vector3, progress = 0): Promise<PlacedCooker> {
    const { geometry, material } = await this.assetsFor(kind);
    const mesh = new THREE.Mesh(geometry, material.clone());
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
  public update(dt: number): void {
    for (const c of this.cookers) {
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

  public updateTorchLighting(torchPositions: THREE.Vector3[], torchRange: number, torchIntensity: number): void {
    for (const c of this.cookers) {
      let light = 0;
      for (const p of torchPositions) {
        const d = c.position.distanceTo(p);
        if (d < torchRange) light += torchIntensity / (1 + 2 * d * d / (torchRange * torchRange));
      }
      (c.mesh.material as THREE.ShaderMaterial).uniforms.torchLight.value = Math.min(1.5, light);
    }
  }
}
