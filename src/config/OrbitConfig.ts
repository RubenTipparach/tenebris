/**
 * Live orbits (openspec/changes/navigation-and-orbits, orbital-motion). The
 * owner's two anchors; every other period follows from them by Kepler's
 * third law (src/world/Orbits.ts).
 */
export const ORBIT_CONFIG = {
  // The Moon goes round Earth once an hour of game time
  MOON_PERIOD_MIN: 60,
  // Earth goes round the Sun once every three hours
  EARTH_PERIOD_MIN: 180,
  // The bodies the anchors belong to
  ANCHOR_PLANET: 'earth',
  ANCHOR_MOON: 'moon',
  // A gas giant has no configured gravity (it isn't landable): its surface
  // gravity, as a multiple of Earth's, for its moons' periods (M ∝ g R²)
  GAS_GIANT_GRAVITY: 2.5,
  // Game-time multiplier (1 = real time). A debug knob for watching orbits.
  TIME_SCALE: 1,
  // Something placed within this many radii of a planet's configured centre
  // rides that planet (PlanetFrames)
  ATTACH_RADII: 2,
  // Sun direction changes smaller than this (radians) skip the uniform
  // updates that frame
  SUN_DIRECTION_EPSILON: 1e-4,
  // Step (s) for a body's velocity by finite difference, for rebasing a
  // rocket into a new frame
  VELOCITY_DT_S: 0.5,

  // ---- spin: day and night (openspec day-night) ----
  // A body's solar day (minutes of game time, sunrise to sunrise) when its
  // config sets no `dayMin`, by body type. A star does not turn.
  DAY_MIN: { planet: 24, moon: 18, asteroid: 6 },
  // The frame turns with the reference body while the player (or their
  // rocket) is within this many of its radii of its centre - or within its
  // sphere of influence, whichever is farther. Beyond it the frame is held
  // still, so deep-space flight is not in a wheeling sky.
  SPIN_FRAME_RADII: 3,
  // Leave the turning frame only past reach x this, so hovering at the edge
  // does not flip the frame back and forth
  SPIN_FRAME_HYSTERESIS: 1.1,
} as const;
