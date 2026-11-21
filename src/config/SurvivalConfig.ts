/**
 * Ranching and air (openspec wool-air-and-reentry, design 1 and 4): every
 * number for shearing, cows, breath, tanks and dying. The rocket's battery,
 * re-entry and parachute numbers live with the rest of the rocket in
 * RocketConfig.ts; the gas collector's watts and fill time in PowerConfig.ts.
 */
export const RANCHING = {
  // How far the player can reach an animal to shear or hit it (m)
  REACH_M: 4,
  // Wool from one shearing: a random whole number in [min, max]
  SHEAR_WOOL: [1, 3] as [number, number],
  // A shorn sheep's fleece grows back after this long (s)
  REGROW_S: 300,
  // Hits that bring a cow down
  COW_HITS: 3,
  // Leather a fallen cow gives: [min, max]
  COW_LEATHER: [1, 2] as [number, number],
  // How far a hit knocks the animal back (m/s of shove)
  HIT_SHOVE: 3,
};

export const AIR = {
  // How long the player holds their breath when exposed with no tank air (s)
  BREATH_S: 10,
  // Air in one oxygen tank (s); an empty tank takes its place when it runs out
  TANK_AIR_S: 300,
  // Breath comes back this many times faster than it runs out, once safe
  BREATH_RECOVER_RATE: 4,
  // The AIR chip turns red under this fraction left
  LOW_FRACTION: 0.25,
  // The death screen shows this long before the respawn (s)
  DEATH_SCREEN_S: 3,
};
