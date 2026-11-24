import * as THREE from 'three';
import { ROCKET_CONFIG } from '../config/RocketConfig';

/**
 * RCS thruster lines: while WASD / Q / E turn the rocket, short jets show
 * which way the reaction-control thrusters are firing, so the turn reads at
 * a glance. Built in the rocket's pivot space (x = right, y = the nose,
 * z = forward), so they ride its attitude, like the re-entry visuals.
 *
 * Each commanded turn is a couple: two jets at opposite ends of a lever
 * firing opposite ways. Pitch and roll (about x and z) push at the nose and
 * the tail; a spin about the long axis (y) pushes at the hull's sides.
 */

export interface RcsJet {
  /** Where the jet leaves the hull (pivot space) */
  from: THREE.Vector3;
  /** Which way the exhaust goes (unit, pivot space) - opposite to the push */
  dir: THREE.Vector3;
}

const AXES = [new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1)];

/**
 * The jets for a commanded turn. `command` holds the sign of the turn about
 * each local axis (x pitch, y spin about the nose, z roll; 0 = none);
 * `stackHeight` and `center` place the nose, the tail and the middle.
 */
export function rcsJets(command: THREE.Vector3, stackHeight: number, center: THREE.Vector3): RcsJet[] {
  const cfg = ROCKET_CONFIG.RCS_VISUAL;
  const jets: RcsJet[] = [];
  AXES.forEach((axis, i) => {
    const sign = Math.sign(command.getComponent(i));
    if (!sign) return;
    // The lever: along the stack for pitch / roll, across the hull for a spin about the nose
    const alongStack = i !== 1;
    const lever = alongStack ? AXES[1] : AXES[0];
    const reach = alongStack ? (stackHeight / 2) * cfg.leverShare : cfg.hullRadius;
    for (const end of [1, -1]) {
      const r = lever.clone().multiplyScalar(end);
      // The push that turns the rocket about `axis` by `sign`: r x push points along the axis
      const push = axis.clone().cross(r).multiplyScalar(sign).normalize();
      jets.push({ from: center.clone().addScaledVector(r, reach), dir: push.negate() });
    }
  });
  return jets;
}

/** The line mesh the jets are drawn into (one segment per jet, up to all three axes at once) */
export function createRcsLines(): THREE.LineSegments {
  const maxJets = AXES.length * 2;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(maxJets * 2 * 3), 3));
  geometry.setDrawRange(0, 0);
  const material = new THREE.LineBasicMaterial({
    color: ROCKET_CONFIG.RCS_VISUAL.color,
    transparent: true,
    opacity: ROCKET_CONFIG.RCS_VISUAL.opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.name = 'RcsLines';
  lines.frustumCulled = false;
  return lines;
}

/** Draw `jets` (a short flicker on each length so they read as firing) */
export function setRcsLines(lines: THREE.LineSegments, jets: RcsJet[], random: () => number = Math.random): void {
  const cfg = ROCKET_CONFIG.RCS_VISUAL;
  const pos = lines.geometry.getAttribute('position') as THREE.BufferAttribute;
  jets.forEach((jet, j) => {
    const length = cfg.length * (1 - cfg.flicker * random());
    const to = jet.from.clone().addScaledVector(jet.dir, length);
    pos.setXYZ(j * 2, jet.from.x, jet.from.y, jet.from.z);
    pos.setXYZ(j * 2 + 1, to.x, to.y, to.z);
  });
  pos.needsUpdate = true;
  lines.geometry.setDrawRange(0, jets.length * 2);
  lines.visible = jets.length > 0;
}
