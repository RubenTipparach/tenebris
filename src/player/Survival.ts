import { AIR, ENVIRONMENT, SUITS, SuitRating } from '../config/SurvivalConfig';
import type { BodyEnvironment } from '../config/SolarSystemConfig';
import type { ItemType } from './Inventory';

/**
 * Air (openspec wool-air-and-reentry, design 4): when the player is exposed,
 * how long their breath holds, how a worn suit draws from oxygen tanks, and
 * when they die. Pure on the data - no scene, no DOM - so scripts/air.test.ts
 * drives it; mainPlanet feeds it each frame and applies what it returns
 * (tank swaps in the inventory, the death screen, the AIR chip).
 */

export interface AirState {
  /** Breath held (s): BREATH_S when full, 0 = dead. */
  breathS: number;
  /** Air left in the oxygen tank being drawn (s); a fresh tank holds TANK_AIR_S. */
  tankS: number;
}

export function newAirState(): AirState {
  return { breathS: AIR.BREATH_S, tankS: AIR.TANK_AIR_S };
}

/** Where the player is, for the exposure rule. */
export interface ExposureInput {
  /** Riding a rocket (its cabin is round them). */
  inRocket: boolean;
  /** The rocket's command module has power (RocketController.hasPower). */
  rocketPowered: boolean;
  /** In some body's gravity well (on foot: not in open space). */
  inGravityWell: boolean;
  /** That body's air can be breathed (CelestialBodyConfig.breathable). */
  bodyBreathable: boolean;
  /** The debug jetpack is on: like the rest of debug mode, air is not checked. */
  jetpack?: boolean;
  /** The environment of the body the player is on or near (null in open space) */
  environment?: BodyEnvironment | null;
}

/**
 * Is the player exposed: on or near a body whose air can't be breathed, in
 * open space outside a rocket, or inside a rocket whose battery is flat. A
 * powered cabin is safe anywhere. Under water is not exposure (yet).
 */
export function isExposed(i: ExposureInput): boolean {
  if (i.jetpack) return false;
  if (i.inRocket) return !i.rocketPowered;
  if (!i.inGravityWell) return true;
  return !i.bodyBreathable;
}

export interface AirTickInput {
  exposed: boolean;
  suitWorn: boolean;
  /** Oxygen tanks in the inventory (hotbar + bag). */
  oxygenTanks: number;
}

export interface AirTickResult {
  /** Oxygen tanks that ran out this step: each becomes an empty tank. */
  tanksEmptied: number;
  /** Seconds breathed from tank air while exposed this step (the 'suited' mission). */
  tankAirS: number;
  /** Breathing from a tank right now. */
  onTank: boolean;
  /** Breath ran out this step. */
  died: boolean;
}

/** One step of breathing. Mutates `s`. */
export function tickAir(s: AirState, dtS: number, i: AirTickInput): AirTickResult {
  const fx: AirTickResult = { tanksEmptied: 0, tankAirS: 0, onTank: false, died: false };
  let left = dtS;
  let tanks = i.oxygenTanks;
  // A worn suit draws the tanks, one after another
  while (i.exposed && i.suitWorn && tanks > 0 && left > 0) {
    fx.onTank = true;
    if (!(s.tankS > 0)) s.tankS = AIR.TANK_AIR_S;  // a bad saved value: a fresh tank
    const used = Math.min(left, s.tankS);
    s.tankS -= used;
    left -= used;
    fx.tankAirS += used;
    if (s.tankS <= 0) {
      fx.tanksEmptied++;
      tanks--;
      s.tankS = AIR.TANK_AIR_S;
    }
  }
  if (!i.exposed || fx.tankAirS > 0) {
    // Good air (outside, a cabin, or the suit): breath comes back
    s.breathS = Math.min(AIR.BREATH_S, s.breathS + dtS * AIR.BREATH_RECOVER_RATE);
    if (!i.exposed) return fx;
  }
  // What the tanks didn't cover is held breath
  if (left > 0) {
    s.breathS = Math.max(0, s.breathS - left);
    if (s.breathS <= 0) fx.died = true;
  }
  return fx;
}

/** What the AIR chip shows: a fraction full, and whether it is the tank or held breath. */
export function airGauge(s: AirState, onTank: boolean): { fraction: number; seconds: number; low: boolean } {
  const fraction = onTank ? s.tankS / AIR.TANK_AIR_S : s.breathS / AIR.BREATH_S;
  return { fraction, seconds: onTank ? s.tankS : s.breathS, low: fraction < AIR.LOW_FRACTION };
}

// ---- hostile environments (openspec space-exploration, body-environments) ----

export type Hazard = 'heat' | 'cold' | 'radiation';
export const HAZARDS: Hazard[] = ['heat', 'cold', 'radiation'];

/** Seconds left on each hazard's gauge: ENVIRONMENT.GAUGE_S when full, 0 = dead. */
export type EnvState = Record<Hazard, number>;

export function newEnvState(): EnvState {
  return { heat: ENVIRONMENT.GAUGE_S, cold: ENVIRONMENT.GAUGE_S, radiation: ENVIRONMENT.GAUGE_S };
}

/** How hard each hazard is on a body: heat 1 hot / 2 scorching, cold 1 cold / 2 frozen, radiation 1 high. */
export function hazardLevels(e: BodyEnvironment): Record<Hazard, number> {
  return {
    heat: e.temperature === 'scorching' ? 2 : e.temperature === 'hot' ? 1 : 0,
    cold: e.temperature === 'frozen' ? 2 : e.temperature === 'cold' ? 1 : 0,
    radiation: e.radiation === 'high' ? 1 : 0,
  };
}

const NO_SUIT: SuitRating = { heat: 0, cold: 0, radiation: 0 };

/** What a worn suit holds off (no suit, or an item that is not one: nothing). */
export function suitRating(suit: ItemType | null): SuitRating {
  return (suit !== null && SUITS[suit]) || NO_SUIT;
}

/**
 * Which hazards reach the player: those of the body they're on or near that
 * their suit is not rated for. A powered cabin keeps everything out, as it
 * does vacuum; open space has no temperature; the debug jetpack skips it all.
 */
export function environmentExposure(i: ExposureInput, suit: ItemType | null): Record<Hazard, boolean> {
  const none = { heat: false, cold: false, radiation: false };
  if (i.jetpack || !i.environment) return none;
  if (i.inRocket && i.rocketPowered) return none;
  const levels = hazardLevels(i.environment);
  const rating = suitRating(suit);
  return { heat: levels.heat > rating.heat, cold: levels.cold > rating.cold, radiation: levels.radiation > rating.radiation };
}

/** One step of the hazard gauges: each exposed one drains, the rest recover. Returns the hazard that killed, if any. Mutates `s`. */
export function tickEnvironment(s: EnvState, dtS: number, exposed: Record<Hazard, boolean>): Hazard | null {
  let died: Hazard | null = null;
  for (const h of HAZARDS) {
    if (exposed[h]) {
      s[h] = Math.max(0, s[h] - dtS);
      if (s[h] <= 0 && !died) died = h;
    } else {
      s[h] = Math.min(ENVIRONMENT.GAUGE_S, s[h] + dtS * ENVIRONMENT.RECOVER_RATE);
    }
  }
  return died;
}
