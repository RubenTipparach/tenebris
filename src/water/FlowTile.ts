// The flow texture's tile (openspec water-flow, 9): Tenebris's own water
// tile, public/textures/water.png (byte-identical to tenebris-rs/assets/
// textures/water.png), as Pale Blue Dot's water-look.js draws it. That
// mockup carried the 16 x 16 pixels as an index string (TEX_IDX: 0 the body
// (29,43,83), 1 a ripple (28,94,172), 2 a glint (88,138,192)); here the
// index is derived from the PNG itself, so the PNG stays the one source.
// Pure (no THREE, no DOM) so the tests run it.

/** The tile as the water shader samples it, and the colour it fades to far off. */
export interface FlowTile {
  /** RGBA, bottom row first (v runs up the tile as the image reads): rgb the PNG's colour, a its tone x 127. */
  data: Uint8Array;
  width: number;
  height: number;
  /** The tile's mean colour, 0..1 (the PNG's raw values: the texture is not colour-managed). */
  mean: [number, number, number];
}

/** The highest tone (a glint); a tile with more colours puts the rest on it. */
export const FLOW_TONE_MAX = 2;

/**
 * Each pixel's tone is its colour's rank by luminance, darkest first: the
 * body, a ripple, a glint. `rgba` is the image's pixels, top row first.
 */
export function flowTile(rgba: ArrayLike<number>, width: number, height: number): FlowTile {
  const lum = (i: number) => 0.2126 * rgba[i] + 0.7152 * rgba[i + 1] + 0.0722 * rgba[i + 2];
  const keyOf = (i: number) => (rgba[i] << 16) | (rgba[i + 1] << 8) | rgba[i + 2];
  const colours = new Map<number, number>();
  for (let i = 0; i < width * height * 4; i += 4) colours.set(keyOf(i), lum(i));
  const rank = new Map<number, number>();
  [...colours.entries()].sort((a, b) => a[1] - b[1]).forEach(([k], r) => rank.set(k, Math.min(r, FLOW_TONE_MAX)));
  const data = new Uint8Array(width * height * 4);
  const sum = [0, 0, 0];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = ((height - 1 - y) * width + x) * 4;
      for (let c = 0; c < 3; c++) { data[dst + c] = rgba[src + c]; sum[c] += rgba[src + c]; }
      data[dst + 3] = (rank.get(keyOf(src)) ?? 0) * 127;
    }
  }
  const n = width * height * 255;
  return { data, width, height, mean: [sum[0] / n, sum[1] / n, sum[2] / n] };
}
