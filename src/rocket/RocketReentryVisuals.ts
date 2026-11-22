import * as THREE from 'three';
import { ROCKET_CONFIG } from '../config/RocketConfig';

/**
 * What re-entry and the parachute look like (openspec wool-air-and-reentry,
 * design 3): the heat glow round the stack and the canopy above it. Both are
 * built in the rocket's pivot space, so they follow its pose and attitude,
 * and are disposed with disposeObject when the flight lands or ends.
 */

/**
 * An additive orange shell round the stack. `stackHeight` is the stack's
 * height and `center` its middle, both in pivot space. Its opacity is set
 * from the heat by setHeatGlow.
 */
export function createHeatGlow(stackHeight: number, center: THREE.Vector3): THREE.Mesh {
  const cfg = ROCKET_CONFIG.REENTRY.glow;
  const geometry = new THREE.SphereGeometry(cfg.radius, 24, 16);
  const material = new THREE.MeshBasicMaterial({
    color: cfg.color,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = 'ReentryGlow';
  mesh.position.copy(center);
  // Stretch the sphere along the stack
  mesh.scale.set(1, Math.max(1, (stackHeight + cfg.lengthPad) / (2 * cfg.radius)), 1);
  mesh.renderOrder = 102;
  mesh.visible = false;
  // Not a landed rocket's pick target
  mesh.raycast = () => {};
  return mesh;
}

/** Show the glow for a heat share (0..1) */
export function setHeatGlow(glow: THREE.Mesh, heatShare: number): void {
  const share = Math.max(0, Math.min(1, heatShare));
  (glow.material as THREE.MeshBasicMaterial).opacity = share * ROCKET_CONFIG.REENTRY.glow.maxOpacity;
  glow.visible = share > 0;
}

/**
 * A striped canopy dome on lines, above `top` (the top of the stack, pivot
 * space): gores in the two canopy colours, each rim seam tied to the top.
 */
export function createCanopy(top: THREE.Vector3): THREE.Group {
  const cfg = ROCKET_CONFIG.PARACHUTE.canopy;
  const group = new THREE.Group();
  group.name = 'ParachuteCanopy';
  const base = top.clone().add(new THREE.Vector3(0, cfg.lift, 0));
  const materials = cfg.colors.map(color => new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
  const slice = (Math.PI * 2) / cfg.gores;
  for (let i = 0; i < cfg.gores; i++) {
    // One gore: a slice of the upper hemisphere
    const geometry = new THREE.SphereGeometry(cfg.radius, 3, 8, i * slice, slice, 0, Math.PI / 2);
    const gore = new THREE.Mesh(geometry, materials[i % materials.length]);
    gore.position.copy(base);
    gore.scale.set(1, cfg.height / cfg.radius, 1);
    group.add(gore);
  }
  // Lines from each seam on the rim down to the top of the stack
  const points: THREE.Vector3[] = [];
  for (let i = 0; i < cfg.gores; i++) {
    // SphereGeometry's azimuth: x = -cos(phi) r, z = sin(phi) r
    const phi = i * slice;
    points.push(new THREE.Vector3(-Math.cos(phi) * cfg.radius, 0, Math.sin(phi) * cfg.radius).add(base), top.clone());
  }
  const lines = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color: cfg.lineColor }),
  );
  group.add(lines);
  // Not a landed rocket's pick target
  group.traverse(o => { o.raycast = () => {}; });
  return group;
}

/** Take an object out of its parent and free its geometry and materials */
export function disposeObject(object: THREE.Object3D): void {
  object.parent?.remove(object);
  const materials = new Set<THREE.Material>();
  object.traverse(o => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material;
    if (Array.isArray(mat)) mat.forEach(x => materials.add(x));
    else if (mat) materials.add(mat);
  });
  materials.forEach(m => m.dispose());
}
