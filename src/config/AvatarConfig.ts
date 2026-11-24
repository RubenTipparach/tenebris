// Other players' avatars in multiplayer (openspec avatar-anims): how the
// head follows the look, how the arm clips blend, the action field on the
// pose frame, and the held item in the hand.

export const AvatarConfig = {
  // The head pitches with the player's look, up to this far off the
  // horizon (degrees); the body stays upright
  HEAD_PITCH_LIMIT_DEG: 60,
  // How fast (1/s) the shown head pitch follows the reported one
  HEAD_FOLLOW_RATE: 12,
  // How fast (1/s) an arm action clip blends in / out over idle and walk
  ACTION_BLEND_RATE: 14,
  // The local player counts as mining while mining progress was shown this
  // recently (s): progress drops to zero for a frame when a block breaks
  MINE_GRACE_S: 0.25,
  // The one-shot counter on the pose frame wraps at this
  SHOT_SEQ_MOD: 256,
  // Largest value any action field may carry (the server checks the same bound)
  ACTION_FIELD_MAX: 65535,
  // The held item in the right hand: a block as a small cube, an icon as a
  // flat square (metres), placed in the arm pivot's space (the hand sits at
  // the end of the arm)
  HELD_BLOCK_SIZE: 0.2,
  HELD_ICON_SIZE: 0.42,
  HELD_OFFSET: [0, -0.6, 0.12] as const,
  // Icon art is cut out where its alpha is below this
  HELD_ICON_ALPHA_TEST: 0.5,
} as const;
