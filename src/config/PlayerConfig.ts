// Player configuration - adjust these values to tune gameplay

export const PlayerConfig = {
  // Lighting
  AMBIENT_LIGHT_INTENSITY: 0.05,      // Base ambient light (space darkness)
  DIRECTIONAL_LIGHT_INTENSITY: 5.0,   // Sun intensity
  HEMISPHERE_LIGHT_INTENSITY: 0.01,    // Sky/ground color blend
  SUN_DIRECTION: { x: 1, y: 0.5, z: 0.3 }, // Normalized direction TO the sun

  // Movement
  WALK_SPEED: 4,                  // Base walk speed (reduced from 8)
  SPRINT_SPEED: 8,
  WALK_SPEED_MULTIPLIER: 1.0,     // Multiplier for walk speed (tweak as needed)

  // Two-stage jump
  JUMP_FORCE: 8,                  // Stage 1: Regular jump force (~1 unit height)
  DOUBLE_JUMP_ENABLED: true,      // Whether double-jump/jetpack activation is enabled
  DOUBLE_JUMP_ACTIVATES_JETPACK: true, // If true, second jump activates jetpack mode

  // Physics
  BASE_GRAVITY: 20,
  AUTO_STEP_HEIGHT: 0, // Max height difference to auto-step up (0 = must jump over everything)

  // Gravity field (as multiplier of planet radius)
  GRAVITY_FULL_RADIUS: 1.4, // 100% gravity within this radius (1.4 = 40% above surface)
  GRAVITY_FALLOFF_RADIUS: 2.4, // Gravity falls to 0% at this radius (2.4 = 140% above surface)

  // Camera
  MOUSE_SENSITIVITY: 0.002,
  ROLL_SPEED: 2, // Roll speed in space (Q/E)

  // Gravity transition
  ROLL_SLERP_DURATION: 3, // Seconds to slerp roll when entering gravity
  ROLL_SLERP_SPEED: 2, // How fast roll corrects during transition

  // Player dimensions
  PLAYER_HEIGHT: 1.8,
  PLAYER_EYE_HEIGHT: 1.6,
  PLAYER_RADIUS: 0.8, // Collision radius for wall detection (matches picotron)

  // Jetpack
  JETPACK_FORCE: 25,
  JETPACK_DOWN_FORCE: 30,
  SPACE_THRUST: 15,

  // Water physics
  WATER_GRAVITY_MULTIPLIER: 0.3,   // Gravity is reduced in water (sink slowly)
  WATER_SWIM_FORCE: 15,            // Force when pressing space to swim up
  WATER_MOVEMENT_MULTIPLIER: 0.5,  // Horizontal movement speed in water
  WATER_DRAG: 3,                   // Drag coefficient in water

  // Water visuals
  WATER_UV_TILING: 4,              // UV tiling for water texture (higher = more repetition)
  WATER_TRANSPARENCY: 0.7,         // Water transparency (0 = fully transparent, 1 = fully opaque)

  // Underwater fog
  UNDERWATER_FOG_COLOR: "#1c5eac",  // Underwater fog color (hex string)
  UNDERWATER_FOG_NEAR: 0,          // Fog starts at this distance from camera
  UNDERWATER_FOG_FAR: 10,          // Fog fully opaque at this distance

  // Atmosphere
  ATMOSPHERE_INNER_RADIUS_MULT: 0.0,  // Inner boundary as multiplier of planet radius (below surface!)
  ATMOSPHERE_OUTER_RADIUS_MULT: 1.25, // Outer boundary as multiplier of planet radius
  ATMOSPHERE_DENSITY_FALLOFF: 16.0,    // How quickly density decreases with altitude (lower = thicker)
  ATMOSPHERE_SCATTER_STRENGTH: 4.0,  // Overall scattering intensity
};
