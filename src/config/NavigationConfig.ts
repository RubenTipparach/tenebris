/**
 * Maps, compass and waypoints (openspec/changes/navigation-and-orbits).
 */
export const NAVIGATION_CONFIG = {
  // ---- planet map ----
  // Offscreen map raster (equirectangular, 2:1): width in px, about this
  // many px per square root of the tile count (so a tile is a few px
  // across on every planet), clamped
  MAP_PX_PER_TILE_ROOT: 9,
  MAP_MIN_WIDTH: 1024,
  MAP_MAX_WIDTH: 4096,
  // Tiles this close to a pole (share of the map's height) are drawn as caps
  MAP_POLAR_SHARE: 0.02,
  // Zoom when the map opens on the player's own planet
  MAP_START_ZOOM: 3,
  // Zoom range of the planet map (1 = the whole planet fits the panel)
  MAP_MIN_ZOOM: 1,
  MAP_MAX_ZOOM: 24,
  // Zoom factor per wheel notch
  ZOOM_STEP: 1.2,
  // A click counts (rather than a pan) under this many px of movement (PBD G3)
  CLICK_SLOP_PX: 4,
  // Marker sizes, px
  PLAYER_MARKER_PX: 9,
  WAYPOINT_MARKER_PX: 8,
  // How near (px) a click must be to a waypoint to remove it
  WAYPOINT_HIT_PX: 12,
  // Colour of tiles not known yet (map still generating)
  UNKNOWN_TILE_COLOUR: '#20242c',
  // Each tile is stroked this wide in its own colour, so neighbouring tiles
  // meet with no seam and the ground reads as one surface, not a grid of hex
  // cells (owner: "hex cells is distracting, none of that please")
  TILE_SEAM_PX: 1,
  // Relief (owner: "tint block colors by height on the map", "give it some
  // depth"): a tile's colour is scaled by its ground height against sea
  // level, and lit by its slope toward the light (up-left on the map)
  RELIEF_PER_BLOCK_UP: 0.035,     // brighter per block above sea level
  RELIEF_MAX_UP: 0.35,            // at most this much brighter
  RELIEF_PER_BLOCK_DOWN: 0.09,    // water darker per block of depth to the seabed
  RELIEF_MAX_DOWN: 0.6,           // at most this much darker
  HILLSHADE_PER_BLOCK: 0.12,      // lit / shaded per block of rise toward the light
  HILLSHADE_MAX: 0.35,            // at most this much either way
  // Water's map colour when its material carries no texture
  WATER_FALLBACK_COLOUR: '#1d5fa8',

  // ---- system map ----
  // Zoom range (1 = the whole system fits the panel)
  SYSTEM_MIN_ZOOM: 0.5,
  SYSTEM_MAX_ZOOM: 60,
  // Smallest drawn body radius, px (so far worlds stay clickable)
  SYSTEM_MIN_BODY_PX: 3,
  // A body the player has visited (space exploration) is ringed on the system map
  VISITED_RING_COLOR: '#3ee0ff',
  VISITED_RING_W: 1.5,        // px
  VISITED_RING_GAP: 2.5,      // px outside the body's disc
  // Moons' and asteroids' names are drawn from this on-screen spacing (px)
  // from their parent; planets and the Sun are always named
  SYSTEM_MOON_LABEL_PX: 18,
  // Margin round the system when fitted (share of the panel)
  SYSTEM_FIT_MARGIN: 0.06,

  // ---- waypoints ----
  MAX_WAYPOINTS: 4,
  // Waypoint marker colours, in the order they are set (oldest first)
  WAYPOINT_COLOURS: ['#ffec27', '#ff77a8', '#29adff', '#00e436'],

  // ---- compass bar ----
  // Width as a share of the window, clamped (px)
  COMPASS_WIDTH_SHARE: 0.36,
  COMPASS_MIN_PX: 320,
  COMPASS_MAX_PX: 640,
  // Degrees shown across the bar (centred on the heading)
  COMPASS_SPAN_DEG: 180,
  // A tick every this many degrees
  COMPASS_TICK_DEG: 15,
  // The band's height and the canvas's (the band plus a line for a distance), px
  COMPASS_BAR_PX: 32,
  COMPASS_HEIGHT_PX: 48,
  // Marks fade over this outer share of each half of the bar
  COMPASS_EDGE_FADE: 0.25,
  // The bar fades out between these altitudes above the surface (radii)
  COMPASS_FADE_START_RADII: 0.5,
  COMPASS_FADE_END_RADII: 1.0,
} as const;
