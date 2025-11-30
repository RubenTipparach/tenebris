// Player configuration - adjust these values to tune gameplay

export const PlayerConfig = {
  // Movement
  WALK_SPEED: 8,
  SPRINT_SPEED: 14,
  JUMP_FORCE: 12,

  // Physics
  BASE_GRAVITY: 20,
  AUTO_STEP_HEIGHT: 0, // Max height difference to auto-step up (0 = must jump over everything)

  // Camera
  MOUSE_SENSITIVITY: 0.002,
  ROLL_SPEED: 2, // Roll speed in space (Q/E)
  ORIENTATION_SLERP_SPEED: 2, // How fast to transition between space and planet orientation

  // Player dimensions
  PLAYER_HEIGHT: 1.8,
  PLAYER_EYE_HEIGHT: 1.6,
  PLAYER_RADIUS: 0.8, // Collision radius for wall detection (matches picotron)

  // Jetpack
  JETPACK_FORCE: 25,
  JETPACK_DOWN_FORCE: 30,
  SPACE_THRUST: 15,
};
