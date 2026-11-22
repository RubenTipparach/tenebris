import { AIR } from '../config/SurvivalConfig';

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
}

/**
 * Is the player exposed: on or near a body whose air can't be breathed, in
 * open space outside a rocket, or inside a rocket whose battery is flat. A
 * powered cabin is safe anywhere. Under water is not exposure (yet).
 */
export function isExposed(i: ExposureInput): boolean {
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
