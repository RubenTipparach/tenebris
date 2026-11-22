/**
 * Lights that blocks give off: city windows, neon, street lamps.
 *
 * Two parts, the way Pale Blue Dot lights a town at night:
 * - GLOW: a block's emissive mask (`<texture>_glow.png`, baked by
 *   scripts/gen-city-textures.py) is added to the face itself, so a lit
 *   window is bright on a dark wall. Strong at night, faint by day.
 * - BLOCK LIGHT: emissive blocks are light sources in the voxel light
 *   (shared/voxelLight.ts), flooded through the air by the same rules as
 *   the sky, so the street and walls near a lamp or a row of windows glow
 *   warm. Night-scaled the same way.
 */
export const LIGHTING_CONFIG = {
  /** Emissive mask gain at night and at noon (multiplies the mask colour) */
  GLOW_NIGHT: 0.9,
  GLOW_DAY: 0.15,
  /** Block light gain at night and at noon (multiplies albedo * tint * level) */
  BLOCK_LIGHT_NIGHT: 1.25,
  BLOCK_LIGHT_DAY: 0.1,
  /** Colour block light lays over what it lights: warm, like Pale Blue Dot's TORCH_TINT */
  BLOCK_LIGHT_TINT: [1.0, 0.72, 0.4] as [number, number, number],
} as const;

/**
 * Sky light (openspec sky-lighting): the terrain's sun and fill come from
 * the atmosphere the sky is drawn with (src/shared/skyLight.ts), tabulated
 * per planet by the sun's height. Values are relative to noon, so noon keeps
 * PlayerConfig's AMBIENT / DIRECTIONAL intensities.
 */
export const SKY_LIGHT_CONFIG = {
  /** Sun heights tabulated, from straight below to straight overhead */
  LUT_SIZE: 64,
  /** The sun's disc, as a height (sine): it fades over +/- this as it sets */
  SUN_DISC_E: 0.03,
  /** How much of the sky's own colour the fill keeps (0 grey, 1 the sky's blue) */
  FILL_SATURATION: 0.6,
  /** Starlight and moonlight: the fill never drops below this (relative to noon) */
  NIGHT_FILL: [0.08, 0.09, 0.13] as [number, number, number],
  /** A world with no air has no sky light: only what bounces off its ground (by day) */
  AIRLESS_FILL: [0.35, 0.35, 0.37] as [number, number, number],
} as const;

