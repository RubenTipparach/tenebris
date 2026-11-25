/**
 * Water flow and shape tunables (openspec water-flow). The rule is
 * src/water/Liquid.ts (Luanti's liquid transform on the hex columns, the
 * one Pale Blue Dot uses); the shape is src/water/LiquidMesh.ts.
 */
export const WaterConfig = {
  /** Seconds between liquid ticks. PBD's mockups ran 1 s; faster reads as water, not sand. */
  TICK_SECONDS: 0.35,
  /** How far flowing water runs from a source, in cells (Luanti liquid_range; 8 = levels 7..0). */
  RANGE: 8,
  /** A cell with at least this many source neighbours (sides + above) becomes a source. 3 on hex (Luanti's 2 runs away there). */
  RENEW_SOURCES: 3,
  /** Level gained falling one cell (Luanti WATER_DROP_BOOST). */
  DROP_BOOST: 4,
  /** Most cells one tick may transform (Luanti's loop cap); the rest wait for the next tick. */
  MAX_CELLS_PER_TICK: 20000,
  /** Ticks a frame may catch up after a stall, so a long hitch never runs the sim in a burst. */
  MAX_TICKS_PER_FRAME: 2,

  // ---- shape (LiquidMesh) ----
  /** A corner where two or more of its cells are air sits this far up its floor (fraction of a block). */
  CORNER_DRY_LEVEL: 0.02,
  /** A corner with no flowing, source or air cell (all solid round it) sits here (fraction of a block). */
  CORNER_ENCLOSED_LEVEL: 0.5,

  // ---- the flow texture (PBD water-look.js; LiquidMesh liquidFlow + water.vert / water.frag) ----
  // A cap's flow vector: none below FLOW_MIN_SLOPE (m/m); else FLOW_MIN_SPEED + FLOW_SLOPE_K x slope, at most FLOW_MAX_SPEED.
  FLOW_MIN_SLOPE: 0.004,
  FLOW_MIN_SPEED: 0.3,
  FLOW_SLOPE_K: 5,
  FLOW_MAX_SPEED: 0.9,
  /** Metres one 16-pixel tile of water.png covers until the planet sets its own:
   *  Planet sets it to a cell's width / PlayerConfig.WATER_UV_TILING, the scale the water texture always had. */
  TEX_TILE_M: 2.0,
  /** Metres a second a cap's tile pans per unit of its flow vector. */
  TEX_PAN_K: 1.6,
  /** Metres a second a flowing side's tile pans down. */
  TEX_FALL_PAN: 2.4,
  /** The tile fades out between these camera distances (m), so its pixels never shimmer far off or from orbit. */
  TEX_FADE_NEAR: 45,
  TEX_FADE_FAR: 120,
  /** ... and between these texels per screen pixel (a grazing view, or from orbit: nearest pixels sparkle there). */
  TEX_TEXEL_FADE_START: 0.4,
  TEX_TEXEL_FADE_END: 1.0,
  /** A ripple pixel: the water mixed this far toward the sky it mirrors, then lifted by RIPPLE_LIFT. */
  RIPPLE_SKY_MIX: 0.35,
  RIPPLE_LIFT: 1.25,
  /** A glint pixel: mixed this far toward the foam colour. */
  GLINT_FOAM: 0.55,
  /** Foam on caps (and glints), and the water-blue froth on falling sides (linear RGB). */
  FOAM_COLOR: [0.86, 0.92, 0.94] as readonly number[],
  FALL_FOAM_COLOR: [0.58, 0.78, 0.93] as readonly number[],
  /** A falling side's froth: FALL_FROTH_BASE, plus these on its ripple / glint pixels, times FALL_FROTH_SCALE. */
  FALL_FROTH_BASE: 0.5,
  FALL_FROTH_RIPPLE: 0.22,
  FALL_FROTH_GLINT: 0.28,
  FALL_FROTH_SCALE: 0.8,
  /** The froth's blocky jitter: pixels of 1 / FROTH_PIXELS_PER_M metres, rows stretched FROTH_ROW_K up the fall, falling FROTH_FALL_SPEED rows a second. */
  FROTH_PIXELS_PER_M: 2,
  FROTH_ROW_K: 3,
  FROTH_FALL_SPEED: 6,
  /** The jitter spans this much of the froth (1 - this .. 1). */
  FROTH_JITTER: 0.25,
  /** Fast caps foam in the same blocky pixels, drifting downstream: a pixel foams above (THRESHOLD - SPEED_K x speed). */
  CAP_FOAM_THRESHOLD: 0.82,
  CAP_FOAM_SPEED_K: 0.22,
  CAP_FOAM_STRENGTH: 0.25,
  /** Most foam any fragment shows. */
  FOAM_MAX: 0.9,
  /** A flowing side's opacity (it reads as a sheet of falling water). */
  FALL_ALPHA: 0.92,
} as const;
