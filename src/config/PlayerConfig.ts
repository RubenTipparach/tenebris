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
  WATER_SURFACE_OFFSET: 0.1,       // How much lower water sits below surrounding land (units)

  // Water shader (close-up only)
  WATER_COLOR: "#3399cc",          // Base water color
  WATER_DEEP_COLOR: "#1a5577",     // Deep water color
  WATER_WAVE_AMPLITUDE: 0.02,      // Height of wave animation
  WATER_WAVE_FREQUENCY: 0.5,       // Frequency of waves
  WATER_FRESNEL_POWER: 3.0,        // Fresnel effect intensity (higher = more reflection at edges)
  WATER_REFLECTION_STRENGTH: 0.4,  // How strong reflections appear
  WATER_DISTORTION_STRENGTH: 0.02, // UV distortion for ripple effect
  WATER_SPECULAR_POWER: 64.0,      // Sharpness of sun reflection
  WATER_SPECULAR_STRENGTH: 1.5,    // Intensity of sun reflection
  WATER_FOG_NEAR: 0,               // Water fog starts at this distance
  WATER_FOG_FAR: 10,               // Water fog fully opaque at this distance
  WATER_DEPTH_FOG_DENSITY: 0.5,    // How quickly water gets murky with depth (higher = faster falloff)

  // Water texture vs procedural balance
  WATER_TEXTURE_STRENGTH: 0.7,     // How much the texture contributes (0 = none, 1 = full)
  WATER_SCROLL_SPEED: 0.03,        // Speed of texture scrolling animation
  WATER_CAUSTIC_STRENGTH: 0.01,    // Strength of procedural caustic shimmer effect
  WATER_FOAM_STRENGTH: 0.1,        // Strength of foam at shallow edges

  // Underwater fog
  UNDERWATER_FOG_COLOR: "#1c5eac",  // Underwater fog color (hex string)
  UNDERWATER_FOG_NEAR: 0,          // Fog starts at this distance from camera
  UNDERWATER_FOG_FAR: 10,          // Fog fully opaque at this distance

  // Atmosphere (GPU Gems 2 style scattering)
  ATMOSPHERE_ENABLED: true,           // Toggle atmosphere rendering on/off
  ATMOSPHERE_RADIUS_MULT: 1.2,        // Atmosphere outer radius as multiplier of planet radius
  ATMOSPHERE_SURFACE_OFFSET: 10.0,     // Offset for planet surface (accounts for terrain depth variation)
  ATMOSPHERE_RAYLEIGH_SCALE: 0.0055,  // Rayleigh scattering coefficient (blue sky)
  ATMOSPHERE_MIE_SCALE: 0.001,        // Mie scattering coefficient (sun glow/haze)
  ATMOSPHERE_MIE_G: 0.85,             // Mie phase asymmetry (-0.99 to 0.99, positive = forward scatter)
  ATMOSPHERE_SUN_INTENSITY: 10.0,     // Sun brightness for atmosphere
  ATMOSPHERE_SAMPLES: 8,              // Number of ray march samples (higher = better quality, slower)
  ATMOSPHERE_LIGHT_SAMPLES: 4,        // Number of light samples per ray step

  // Planet LOD system
  PLANET_MIN_RENDER_DISTANCE: 6,      // Min tiles to render when on ground
  PLANET_MAX_RENDER_DISTANCE: 25,     // Max tiles when at high altitude
  PLANET_LOD_SWITCH_ALTITUDE: 50,     // Altitude above which only LOD is shown

  // Terrain generation
  TERRAIN_SEED: 12345,                // Seed for terrain generation (change for different worlds)
};
