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

/**
 * The sky's sunset (openspec sky-lighting design 9, Pale Blue Dot's
 * sky_atmosphere.wgsl): read by atmosphere.frag and by the CPU twin in
 * src/shared/skyLight.ts (the ground's fill), through skyParamsFor - one
 * source. Heights are sines of the sun over the viewer's horizon.
 */
export const SKY_LOOK = {
  /** The low air's sunlight is gone this far below the horizon (PBD: -0.12, ~7 degrees) */
  TWILIGHT_FROM: -0.12,
  /** Soft edge of the planet's shadow on the air (world units) */
  PENUMBRA_WIDTH: 4,
  /** The dusk tint starts with the sun this high ... */
  DUSK_FROM: 0.2,
  /** ... and is gone with it this far below */
  DUSK_TO: -0.2,
  /** What the dusk multiplies the sky by (warm: more red, less blue) */
  DUSK_TINT: [2.1, 0.65, 0.24] as [number, number, number],
  DUSK_STRENGTH: 0.65,
  /** The orange glow along the horizon at dusk, on the sun's side */
  HORIZON_GLOW: [0.9, 0.27, 0.06] as [number, number, number],
  /** How tightly it hugs the horizon */
  HORIZON_POWER: 5,
} as const;


/**
 * A planet's air seen from space (the gas giants' look, SolarSystemMockup's
 * haze shell): as the viewer climbs out of the sky, atmosphere.frag fades
 * from the sky's scattering to a haze integrated along the view ray through
 * the shell - thick at the ground, thinning with height, so the limb glows
 * and its outer edge melts away; lit on the day side only, warming along
 * the terminator, a faint veil over the disc. Altitudes are in shell
 * thicknesses above the ground.
 */
export const SPACE_HAZE = {
  /** The haze takes over between these viewer altitudes */
  FADE_FROM: 0.6,
  FADE_TO: 1.6,
  /** Density falls off as exp(-height / SCALE_HEIGHT) through the shell (0..1) */
  SCALE_HEIGHT: 0.22,
  /** How opaque a full column is */
  DENSITY: 1.4,
  /** Overall brightness of the haze */
  STRENGTH: 0.85,
  /** The haze's colour by day (times the planet's atmosphere tint) */
  COLOUR: [0.55, 0.78, 1.0] as [number, number, number],
  /** What the haze is multiplied by along the terminator (warm) */
  TERMINATOR_TINT: [1.6, 0.75, 0.45] as [number, number, number],
  /** Ray steps through the shell */
  SAMPLES: 12,
} as const;

/**
 * Surface relief (terrain.frag / planet.frag): faces are lit through a
 * per-pixel normal so rock catches the light. Near blocks take it from
 * their own texture (a texel's brightness is its height, so each block's
 * pixel art is its relief); the distant planet sphere from noise in the
 * planet's own frame, with a per-hex shift in tone.
 */
export const SURFACE_RELIEF = {
  /** Near blocks: how far a texel's brightness step tilts the normal */
  DEFAULT: 3.0,
  /** Rock-like blocks (material keys matching ROCK_KEYS) stand out more */
  ROCK: 4.5,
  /** Soft ground (sand, snow) stays smoother */
  SOFT: 1.0,
  ROCK_KEYS: /rock|stone|ore|basalt|shale|geode|glaze|crag|bottom|moon/i,
  SOFT_KEYS: /sand|snow|bank|dune|salt|frost/i,
  /** Low texels sit in shadow: darkened by up to this share */
  CAVITY: 0.25,
  /** Each hex (block) leans its own way: tilt per unit of relief, and a tone shift */
  HEX_TILT: 0.06,
  HEX_TONE: 0.1,
  /** Distant sphere: noise frequency (per planet radius), normal tilt, and per-hex tone shift */
  FAR_SCALE: 9.0,
  FAR_STRENGTH: 1.0,
  FAR_TONE: 0.18,
} as const;

/**
 * A planet's surface seen from space (planet.frag), shaded the way the gas
 * giants are (SolarSystemMockup): smooth lighting over the hex facets,
 * mottled colour, oceans that glint and brighten toward the limb, limb
 * darkening, and - on a world with air - its haze (SPACE_HAZE's colour) over
 * the day side of the disc, warming at the terminator.
 */
export const FAR_SURFACE = {
  /** How far the hex facets' normals bend toward the smooth sphere (0 facets, 1 smooth) */
  SMOOTH: 0.6,
  /** Colour mottling: strength and frequency (per planet radius) */
  MOTTLE: 0.22,
  MOTTLE_SCALE: 5.0,
  /** The disc darkens toward its edge by this share */
  LIMB_DARKENING: 0.4,
  /** The air's haze over the disc (times SPACE_HAZE.COLOUR and the planet's tint) */
  HAZE: 0.9,
  /** Light left on the night side (of the fill) */
  NIGHT: 0.15,
} as const;

/**
 * The sea seen from space (planet.frag, on the far planet's sea tiles):
 * broad patches of deep and shelf water, waves that catch the sun in a
 * moving glint, a soft sheen round it, and the sea brightening toward the
 * limb into the air's colour.
 */
export const FAR_WATER = {
  /** Shelf water: lighter and greener than the deep (added to the sea's colour) */
  SHELF: [0.02, 0.16, 0.14] as [number, number, number],
  /** How much of the sea is shelf, in broad patches */
  VARIATION: 0.6,
  /** Waves: frequency (per planet radius), how far they tilt the glint, drift speed */
  WAVE_SCALE: 60,
  WAVE_STRENGTH: 0.25,
  WAVE_SPEED: 0.02,
  /** The sun's glint: strength and tightness, and the broad sheen round it */
  SPECULAR: 1.2,
  SHININESS: 180,
  SHEEN: 0.25,
  /** Brightening toward the limb */
  FRESNEL: 0.7,
} as const;
