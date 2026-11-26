/**
 * Auto step (Options > Auto step; Pale Blue Dot's walker, `player-settings`):
 * on, a grounded walker walks up a rise of one block without a jump - better
 * on a phone, where jumping is a button press each time. Off, it steps up only
 * a low rise (PlayerConfig.AUTO_STEP_HEIGHT: a pad's slab) and a block needs a
 * jump. Phones start with it on, desktops off; the choice is saved per browser.
 *
 * A step climbed is eased, not snapped (PBD's step ease): the body is on the
 * new floor at once, but the rise is taken off the eye and given back over
 * AUTO_STEP.EASE_S, so the view lifts smoothly. A jump or a fall is not a step.
 */
import { PlayerConfig } from '../config/PlayerConfig';
import { isMobileDevice } from '../engine/InputManager';

const A = PlayerConfig.AUTO_STEP;
let enabled: boolean | null = null;

export function autoStepEnabled(): boolean {
  if (enabled === null) {
    let saved: string | null = null;
    try { saved = localStorage.getItem(A.STORAGE_KEY); } catch { /* no storage */ }
    enabled = saved === null ? isMobileDevice() : saved === '1';
  }
  return enabled;
}

export function setAutoStep(on: boolean): void {
  enabled = on;
  try { localStorage.setItem(A.STORAGE_KEY, on ? '1' : '0'); } catch { /* not saved */ }
}

/** The tallest rise a grounded walker walks up without a jump, m (one block plus a skin with auto step). */
export function stepHeight(blockHeight: number, on = autoStepEnabled()): number {
  return on ? blockHeight + A.SKIN_M : PlayerConfig.AUTO_STEP_HEIGHT;
}

/**
 * The eye's step lag after a frame: a grounded rise in the step band is added
 * (taken off the eye), then the lag decays by e every EASE_S.
 */
export function stepEase(lag: number, rise: number, grounded: boolean, dt: number): number {
  if (grounded && rise >= A.EASE_MIN_M && rise < A.EASE_MAX_M) lag += rise;
  lag *= Math.exp(-Math.max(0, dt) / A.EASE_S);
  return lag < A.EASE_DONE_M ? 0 : lag;
}
