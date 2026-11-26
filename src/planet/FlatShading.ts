/**
 * Flat shading (Options > Graphics, the Fast preset): every planet surface
 * lit per face instead of per pixel. The terrain shader's FLAT_SHADE path
 * keeps each block's pixel art but drops the per-pixel relief (five extra
 * texture reads and derivatives a pixel); the far / intermediate planet
 * spheres' skips the noise relief, mottling and wave glints. Same shaders,
 * one define, so the two looks can never drift apart.
 *
 * Materials register here once; flipping the setting recompiles them all.
 */
import * as THREE from 'three';
import { graphics, onGraphicsChange } from '../config/GraphicsConfig';

const DEFINE = 'FLAT_SHADE';
const materials = new Set<THREE.ShaderMaterial>();
let listening = false;

function apply(mat: THREE.ShaderMaterial, on: boolean): void {
  const has = DEFINE in (mat.defines ?? {});
  if (has === on) return;
  mat.defines = { ...(mat.defines ?? {}) };
  if (on) mat.defines[DEFINE] = '';
  else delete mat.defines[DEFINE];
  mat.needsUpdate = true;
}

/** A planet-surface material follows the flat shading setting. */
export function registerFlatShading(mat: THREE.ShaderMaterial): void {
  materials.add(mat);
  apply(mat, graphics().flatShading);
  if (!listening) {
    listening = true;
    onGraphicsChange(() => { const on = graphics().flatShading; for (const m of materials) apply(m, on); });
  }
}

/** A material that is gone (disposed): stop tracking it. */
export function unregisterFlatShading(mat: THREE.ShaderMaterial): void {
  materials.delete(mat);
}
