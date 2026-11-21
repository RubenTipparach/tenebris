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
