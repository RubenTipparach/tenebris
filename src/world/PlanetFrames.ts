import * as THREE from 'three';
import { ORBIT_CONFIG } from '../config/OrbitConfig';

/**
 * Things placed on a planet ride it round its orbit (openspec
 * navigation-and-orbits, task 8.1).
 *
 * Every planet has an `attachRoot` group, offset by how far the planet has
 * moved from its configured position (zero while it is the reference body).
 * Machines, torches, launch pads, landed rockets and trees are authored in
 * world coordinates with their planet at its configured position - the
 * frame they were placed and saved in - so putting them under that root
 * keeps them on the planet wherever it is, and changes no save.
 *
 * The object managers only ever `add` and `remove` on the scene they are
 * given; handing them this router instead of the scene sends each object to
 * the root of the planet it sits on (by its configured centre), and
 * anything not near a planet to the scene itself.
 */

export interface FrameBody {
  root: THREE.Object3D;
  configuredCenter: THREE.Vector3;
  radius: number;
}

const tmp = new THREE.Vector3();

export class PlanetObjectRouter {
  constructor(private scene: THREE.Scene, private bodies: () => Iterable<FrameBody>) {}

  /** Where an object sits, in the configured frame (its bounds, for merged meshes at the origin). */
  private placeOf(obj: THREE.Object3D, out: THREE.Vector3): THREE.Vector3 {
    out.copy(obj.position);
    const geom = (obj as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
    if (geom && obj.position.lengthSq() === 0) {
      if (!geom.boundingSphere) geom.computeBoundingSphere();
      if (geom.boundingSphere) out.add(geom.boundingSphere.center);
    }
    return out;
  }

  private bodyFor(obj: THREE.Object3D): FrameBody | null {
    const p = this.placeOf(obj, tmp);
    let best: FrameBody | null = null;
    let bestD = Infinity;
    for (const b of this.bodies()) {
      const d = p.distanceTo(b.configuredCenter) / b.radius;
      if (d < ORBIT_CONFIG.ATTACH_RADII && d < bestD) { best = b; bestD = d; }
    }
    return best;
  }

  add(...objects: THREE.Object3D[]): this {
    for (const obj of objects) {
      const body = this.bodyFor(obj);
      (body ? body.root : this.scene).add(obj);
    }
    return this;
  }

  remove(...objects: THREE.Object3D[]): this {
    for (const obj of objects) obj.parent?.remove(obj);
    return this;
  }
}

let router: PlanetObjectRouter | null = null;

export function setPlanetObjectRouter(r: PlanetObjectRouter | null): void {
  router = r;
}

/** The scene object managers should add planet-bound objects to. */
export function planetObjectScene(scene: THREE.Scene): THREE.Scene {
  return (router ?? scene) as unknown as THREE.Scene;
}
