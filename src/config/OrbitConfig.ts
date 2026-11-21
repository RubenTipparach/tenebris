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
} as const;
