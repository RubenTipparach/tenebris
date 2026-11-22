/**
 * Sky light (openspec sky-lighting): what the sun and the sky shed on the
 * ground, worked out from the same atmosphere the sky is drawn with - the
 * way Pale Blue Dot's lighting model takes "the sun's colour from the air"
 * and "the fill from the sky" (its lighting-model L1 and L2).
 *
 * The sky shader (src/shaders/atmosphere/atmosphere.frag) is single
 * scattering through a density shell; this module runs that same model on
 * the CPU for a point on the ground and a sun at elevation `e` (the sine of
 * its height over the horizon):
 * - SUN: the sun's colour after its path through the air (transmittance),
 *   faded over the sun's disc as it sets;
 * - FILL: the displayed sky (the shader's own tonemap and alpha) averaged
 *   over the upper hemisphere, cosine-weighted - the light the sky you see
 *   puts on the ground. So a glowing dusk sky lights the ground blue, and a
 *   dark sky leaves it dark: the two can't disagree.
 *
 * Both are tabulated per planet into a small lookup texture (64 sun heights
 * x 2 rows) once at load, so shaders read them with one texture fetch.
 */

export type RGB = [number, number, number];

export interface SkyParams {
  planetRadius: number;      // the shader's ray-termination radius (effective surface)
  groundRadius: number;      // where the viewer stands (sea level) - also what shades the air from the sun
  atmosphereRadius: number;
  rayleighScale: number;
  mieScale: number;
  mieG: number;
  sunIntensity: number;
  samples: number;
  lightSamples: number;
  tint: RGB;
}

// The shader's constants (atmosphere.frag): part of the model's identity
const WAVELENGTHS_INV4: RGB = [5.602, 9.473, 19.644];
const SCALE_HEIGHT = 0.25;

type V = [number, number, number];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/** Ray against a sphere at the origin: [near, far], or null when it misses */
function raySphere(o: V, d: V, r: number): [number, number] | null {
  const b = dot(o, d);
  const c = dot(o, o) - r * r;
  const disc = b * b - c;
  if (disc < 0) return null;
  const s = Math.sqrt(disc);
  return [-b - s, -b + s];
}

function density(p: SkyParams, height: number): number {
  const alt = Math.min(1, Math.max(0, (height - p.planetRadius) / (p.atmosphereRadius - p.planetRadius)));
  return Math.exp(-alt / SCALE_HEIGHT);
}

function opticalDepth(p: SkyParams, o: V, d: V, len: number): number {
  const step = len / p.lightSamples;
  let depth = 0;
  for (let i = 0; i < p.lightSamples; i++) {
    const t = step * (i + 0.5);
    const q: V = [o[0] + d[0] * t, o[1] + d[1] * t, o[2] + d[2] * t];
    depth += density(p, Math.hypot(q[0], q[1], q[2])) * step;
  }
  return depth;
}

/** A point just above the ground, with "up" along +y */
const ground = (p: SkyParams): V => [0, p.groundRadius + 1e-3, 0];
const sunAt = (e: number): V => [Math.sqrt(Math.max(0, 1 - e * e)), e, 0];

/** The sun's light through the air at elevation e (per channel, 0..1); 0 once it is below the horizon */
export function sunTransmittance(p: SkyParams, e: number): RGB {
  const o = ground(p), s = sunAt(e);
  const blocked = raySphere(o, s, p.groundRadius);
  if (blocked && blocked[0] > 0) return [0, 0, 0];
  const hit = raySphere(o, s, p.atmosphereRadius);
  const len = hit ? Math.max(0, hit[1]) : 0;
  const depth = opticalDepth(p, o, s, len);
  return [0, 1, 2].map(i => Math.exp(-(p.rayleighScale * WAVELENGTHS_INV4[i] + p.mieScale) * depth)) as RGB;
}

/** The sky colour the shader draws looking along `dir` from the ground (its tonemap x alpha, as blended) */
export function displayedSky(p: SkyParams, dir: V, sun: V): RGB {
  const o = ground(p);
  const atm = raySphere(o, dir, p.atmosphereRadius);
  if (!atm || atm[1] < 0) return [0, 0, 0];
  const start = Math.max(0, atm[0]);
  let end = atm[1];
  const pl = raySphere(o, dir, p.planetRadius);
  if (pl && pl[0] > 0) end = Math.min(end, pl[0]);
  if (start >= end) return [0, 0, 0];
  const step = (end - start) / p.samples;
  const sumR: RGB = [0, 0, 0], sumM: RGB = [0, 0, 0];
  let depthView = 0;
  for (let i = 0; i < p.samples; i++) {
    const t = start + step * (i + 0.5);
    const q: V = [o[0] + dir[0] * t, o[1] + dir[1] * t, o[2] + dir[2] * t];
    const h = Math.hypot(q[0], q[1], q[2]);
    if (h < p.planetRadius) continue;
    const dens = density(p, h);
    depthView += dens * step;
    const shadow = raySphere(q, sun, p.groundRadius);
    if (shadow && shadow[0] > 0) continue;
    const sunHit = raySphere(q, sun, p.atmosphereRadius);
    const sunDepth = opticalDepth(p, q, sun, sunHit ? Math.max(0, sunHit[1]) : 0);
    for (let c = 0; c < 3; c++) {
      const tau = p.rayleighScale * WAVELENGTHS_INV4[c] * (depthView + sunDepth) + p.mieScale * (depthView + sunDepth);
      const att = Math.exp(-tau);
      sumR[c] += dens * att * step;
      sumM[c] += dens * att * step;
    }
  }
  const cos = dot(dir, sun);
  const phaseR = 0.75 * (1 + cos * cos);
  const g2 = p.mieG * p.mieG;
  const phaseM = (1 - g2) / (4 * Math.PI * Math.pow(1 + g2 - 2 * p.mieG * cos, 1.5));
  const col = [0, 1, 2].map(c => {
    const raw = p.sunIntensity * (sumR[c] * p.rayleighScale * WAVELENGTHS_INV4[c] * phaseR + sumM[c] * p.mieScale * phaseM) * p.tint[c];
    return 1 - Math.exp(-raw);
  }) as RGB;
  const alpha = Math.min(0.95, Math.max(0, Math.hypot(col[0], col[1], col[2]) * 1.5));
  return [col[0] * alpha, col[1] * alpha, col[2] * alpha];
}

/** The displayed sky averaged over the upper hemisphere, cosine-weighted, for a sun at elevation e */
export function skyFill(p: SkyParams, e: number, rings = 6, segments = 12): RGB {
  const sun = sunAt(e);
  const out: RGB = [0, 0, 0];
  let weight = 0;
  for (let i = 0; i < rings; i++) {
    const elev = ((i + 0.5) / rings) * (Math.PI / 2);        // height of the sample over the horizon
    const cosZ = Math.sin(elev);                               // cosine of its angle from straight up
    const ringW = cosZ * Math.cos(elev);                       // cos-weighted, by the ring's size
    for (let j = 0; j < segments; j++) {
      const az = ((j + 0.5) / segments) * Math.PI * 2;
      const dir: V = [Math.cos(elev) * Math.cos(az), Math.sin(elev), Math.cos(elev) * Math.sin(az)];
      const c = displayedSky(p, dir, sun);
      out[0] += c[0] * ringW; out[1] += c[1] * ringW; out[2] += c[2] * ringW;
      weight += ringW;
    }
  }
  return [out[0] / weight, out[1] / weight, out[2] / weight];
}

export const luminance = (c: RGB) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];

export interface SkyLightTuning {
  lutSize: number;          // sun heights tabulated, e from -1 to 1
  sunDiscE: number;         // the sun's disc in elevation: it fades over +/- this as it sets
  fillSaturation: number;   // 0 = the fill is grey, 1 = the sky's own colour
  nightFill: RGB;           // starlight and moonlight: the floor of the fill
  airlessFill: RGB;         // fill on a world with no air (ground bounce; no sky)
}

/**
 * The lookup table: row 0 the sun's light, row 1 the fill, each relative to
 * its noon value (so noon keeps the game's tuned brightness), RGBA floats,
 * `lutSize` sun heights from e = -1 to e = 1. `params` null = airless.
 */
export function buildSkyLightTable(params: SkyParams | null, t: SkyLightTuning): Float32Array {
  const n = t.lutSize;
  const data = new Float32Array(n * 2 * 4);
  const noonSun = params ? luminance(sunTransmittance(params, 1)) || 1 : 1;
  const noonFill = params ? luminance(skyFill(params, 1)) || 1 : 1;
  for (let i = 0; i < n; i++) {
    const e = -1 + (2 * i) / (n - 1);
    // the disc setting: half of it shows at e = 0
    const disc = Math.min(1, Math.max(0, (e + t.sunDiscE) / (2 * t.sunDiscE)));
    const above = Math.max(e, t.sunDiscE * 0.5);   // its colour just above the horizon while it sets
    const sun = params ? sunTransmittance(params, above).map(c => (c / noonSun) * disc) as RGB : [disc, disc, disc] as RGB;
    let fill: RGB;
    if (params) {
      const f = skyFill(params, e).map(c => c / noonFill) as RGB;
      const l = luminance(f);
      fill = f.map((c, k) => Math.max(t.nightFill[k], l + (c - l) * t.fillSaturation)) as RGB;
    } else {
      fill = t.airlessFill.map((c, k) => Math.max(t.nightFill[k], c * disc)) as RGB;
    }
    data.set([sun[0], sun[1], sun[2], 1], i * 4);
    data.set([fill[0], fill[1], fill[2], 1], (n + i) * 4);
  }
  return data;
}
