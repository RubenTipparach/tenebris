/**
 * On-foot keys (KeyboardEvent.code) for using what you walk up to: boarding
 * a parked submarine, talking to someone (openspec friendship-npcs). One
 * Interact key for all of them - every prompt reads its label from here
 * (inputKeyLabel, RocketConfig.ts), so remapping it here changes every "[F] ..." in the game.
 */
export const WALKER_INPUTS = {
  INTERACT: 'KeyF',
};

