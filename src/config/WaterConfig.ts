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
  /** A newly wet cell starts as a sheet this thick (fraction of its height) on the side its water came from. */
  ARRIVE_SHEET: 0.25,
} as const;
