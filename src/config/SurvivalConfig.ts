import { ItemType } from '../player/Inventory';

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
  // The shove dies away at this rate (1/s)
  SHOVE_DECAY: 4,
  // A hit animal runs from whoever hit it for this long (s)
  HIT_FLEE_S: 3,
  // Shortest time between two hits while the button is held (s)
  HIT_COOLDOWN_S: 0.4,
  // A shorn sheep's fleece is drawn at this size (0 = gone, the skin shows)
  SHORN_FLEECE_SCALE: 0,
  // Multiplayer: hitter positions in an animal action are rounded to this many places
  ACTION_DECIMALS: 2,
};

export const AIR = {
  // How long the player holds their breath when exposed with no tank air (s)
  BREATH_S: 90,
  // Air in one oxygen tank (s); an empty tank takes its place when it runs out
  TANK_AIR_S: 300,
  // Breath comes back this many times faster than it runs out, once safe
  BREATH_RECOVER_RATE: 4,
  // The AIR chip turns red under this fraction left
  LOW_FRACTION: 0.25,
  // The death screen shows this long before the respawn (s)
  DEATH_SCREEN_S: 3,
  // While a suit draws a tank, the air left in it is saved this often (s);
  // putting the suit on or off, and a tank running out, save at once
  SAVE_EVERY_S: 5,
};

/**
 * Hostile environments (openspec space-exploration, body-environments): heat,
 * cold and high radiation each drain their own gauge, like held breath, while
 * the player is outside a powered cabin and their suit is not rated for them.
 * A body's levels come from its environment (SolarSystemConfig
 * BODY_ENVIRONMENTS): heat 1 = hot, 2 = scorching; cold 1 = cold, 2 = frozen;
 * radiation 1 = high.
 */
export const ENVIRONMENT = {
  // How long an unprotected player lasts in one hazard (s) - long enough to
  // plant a survey beacon; staying to work needs the suit
  GAUGE_S: 60,
  // A gauge comes back this many times faster than it runs out, once safe
  RECOVER_RATE: 4,
  // The chip turns red under this fraction left
  LOW_FRACTION: 0.25,
};

/** The HUD chips for the hazard gauges: stacked above the AIR chip (px from the bottom) */
export const ENVIRONMENT_CHIP = {
  BOTTOM_PX: 112,   // the AIR chip's own bottom (index.html .air-chip)
  STEP_PX: 44,      // one chip's height and gap
};

/**
 * What each suit protects against, as the highest level of each hazard it
 * holds off (see ENVIRONMENT). Every suit also breathes from oxygen tanks.
 * The space suit: vacuum only.
 */
export interface SuitRating { heat: number; cold: number; radiation: number }
export const SUITS: Partial<Record<ItemType, SuitRating>> = {
  [ItemType.SPACE_SUIT]: { heat: 0, cold: 0, radiation: 0 },
};
