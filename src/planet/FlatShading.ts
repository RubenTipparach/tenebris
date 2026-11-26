/**
 * Flat shading (Options > Graphics, the Fast preset): every planet surface -
 * the walkable hex terrain and the far / intermediate planet spheres - drawn
 * as flat, face-lit colour. The terrain shader's FLAT_SHADE path swaps each
 * block's pixel art for that texture's average colour and drops the
 * per-pixel relief (five extra texture reads and derivatives a pixel); the
 * planet shader's skips the noise relief, mottling and wave glints. Same
 * shaders, one define, so the two looks can never drift apart.
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

/** A texture's average colour (what a block reads as from a distance). Opaque grey when it cannot be read. */
export function averageColour(tex: THREE.Texture | null | undefined): THREE.Vector4 {
  const img = tex?.image as (CanvasImageSource & { width?: number; height?: number; data?: ArrayLike<number> }) | undefined;
  try {
    if (img && img.data && img.width && img.height) {
      // a DataTexture (RGBA bytes)
      const d = img.data, n = img.width * img.height;
      const s = [0, 0, 0, 0];
      for (let i = 0; i < n; i++) for (let c = 0; c < 4; c++) s[c] += d[i * 4 + c];
      return new THREE.Vector4(s[0] / n / 255, s[1] / n / 255, s[2] / n / 255, s[3] / n / 255);
    }
    if (img && img.width && img.height && typeof document !== 'undefined') {
      const w = img.width, h = img.height;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const ctx = c.getContext('2d', { willReadFrequently: true })!;
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, w, h).data;
      const s = [0, 0, 0, 0];
      // weight colour by alpha (a leaf texture's holes do not grey it out)
      let a = 0;
      for (let i = 0; i < d.length; i += 4) { const k = d[i + 3]; s[0] += d[i] * k; s[1] += d[i + 1] * k; s[2] += d[i + 2] * k; a += k; s[3] += k; }
      const n = d.length / 4;
      return a > 0
        ? new THREE.Vector4(s[0] / a / 255, s[1] / a / 255, s[2] / a / 255, s[3] / n / 255)
        : new THREE.Vector4(0, 0, 0, 0);
    }
  } catch { /* a tainted or unloaded image: grey */ }
  return new THREE.Vector4(0.5, 0.5, 0.5, 1);
}

/**
 * A planet-surface material follows the flat shading setting. `texture`:
 * the terrain material's block texture, whose average becomes its flat
 * colour (the far planet shader already carries per-vertex colour).
 */
export function registerFlatShading(mat: THREE.ShaderMaterial, texture?: THREE.Texture | null): void {
  if (texture !== undefined) {
    mat.uniforms.flatColor = { value: averageColour(texture) };
  }
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
