// Solar System Configuration
// Centralized definitions for all celestial bodies (sun, planets, moons, asteroids)
// Makes it easy to add new bodies by defining their properties here

import * as THREE from 'three';

/**
 * Types of celestial bodies
 */
export enum CelestialBodyType {
  STAR = 'star',
  PLANET = 'planet',
  MOON = 'moon',
  ASTEROID = 'asteroid',
  SPACE_STATION = 'space_station',
}

/**
 * Terrain style determines how the surface is generated
 */
export enum TerrainStyle {
  EARTH_LIKE = 'earth_like',     // Varied biomes, water, trees
  BARREN = 'barren',             // Rocky, no water, no vegetation
  ICY = 'icy',                   // Ice and snow covered
  VOLCANIC = 'volcanic',         // Lava, dark rock (future)
}

/**
 * Colors used for LOD rendering when planet is viewed from space
 * All colors are hex strings (e.g., '#4a8c4a')
 */
export interface LodColorsConfig {
  /** Color for land/grass tiles */
  land: string;
  /** Color for water tiles */
  water: string;
  /** Color for polar ice (frozen water) */
  ice: string;
  /** Color for snow-covered land */
  snow: string;
  /** Color for rock/stone below sea level */
  rock: string;
}

/** Default Earth-like LOD colors */
export const DEFAULT_LOD_COLORS: LodColorsConfig = {
  land: '#4a8c4a',   // Green grass
  water: '#3399cc',  // Ocean blue
  ice: '#b8e0f0',    // Polar ice (light cyan)
  snow: '#f0f0f0',   // Snow white
  rock: '#888888',   // Grey rock
};

/**
 * Configuration for a celestial body's visual appearance
 */
export interface VisualConfig {
  /** Single texture path for uniform surface (like moon). If not set, uses procedural terrain */
  texturePath?: string;
  /** How much terrain height varies (0-1, default 1.0) */
  heightVariation: number;
  /** Terrain generation style */
  terrainStyle: TerrainStyle;
  /** Color for the body when viewed from far away (atmosphere tint or surface color) */
  distantColor: string;
  /** Whether the body emits light (for stars) */
  emissive?: boolean;
  /** Emissive color for stars */
  emissiveColor?: string;
  /** Atmosphere color tint (multiplied with scattering result). Default white = no tint */
  atmosphereTint?: string;
  /** Colors for LOD tiles when viewed from space. Uses DEFAULT_LOD_COLORS if not specified */
  lodColors?: Partial<LodColorsConfig>;
}

/**
 * Configuration for gravity
 */
export interface GravityConfig {
  /** Gravity strength multiplier (1.0 = Earth-like, 0.4 = Moon-like) */
  strength: number;
  /** Radius multiplier for 100% gravity (multiplied by body radius) */
  fullRadiusMultiplier: number;
  /** Radius multiplier where gravity falls to 0% (multiplied by body radius) */
  falloffRadiusMultiplier: number;
}

/**
 * Configuration for terrain generation
 */
export interface TerrainConfig {
  /** Whether to generate water at sea level */
  hasWater: boolean;
  /** Depth at which water appears (default from PlayerConfig) */
  seaLevel?: number;
  /** Max depth below sea level for digging */
  maxDepth?: number;
  /** Max height above sea level for building/terrain */
  maxHeight?: number;
  /** Added to the world seed for this body, so bodies sharing the same
   *  generator still get their own landscape (0 / unset = the world seed) */
  seed?: number;
  /** Water color override (hex string, defaults to PlayerConfig.WATER_COLOR) */
  waterColor?: string;
  /** Deep water color override (hex string, defaults to PlayerConfig.WATER_DEEP_COLOR) */
  waterDeepColor?: string;
}

/**
 * Configuration for planet tileset textures
 * Allows each planet to have its own set of block textures
 */
export interface TilesetConfig {
  /** Base path for textures (e.g., '/textures' or '/textures/moon') */
  basePath: string;

  // Core terrain textures
  stone: string;
  dirt: string;
  grass: string;
  dirtGrass: string;  // Dirt with grass on top (side texture)
  sand: string;

  // Vegetation
  wood: string;
  leaves?: string;

  // Snow biome
  snow: string;
  dirtSnow: string;   // Dirt with snow on top
  ice: string;

  // Liquids
  water: string;

  // Special
  glass: string;

  // Mineral ores - path to folder containing ore textures
  // Expected files: rocks_coal.png, rocks_copper.png, rocks_iron.png,
  //                 rocks_gold.png, rocks_lythium.png, rocks_aluminum.png, rocks_cobalt.png
  mineralsPath: string;
}

/**
 * Default Earth tileset
 */
export const EARTH_TILESET: TilesetConfig = {
  basePath: '/textures',
  stone: '/textures/rocks.png',
  dirt: '/textures/dirt.png',
  grass: '/textures/grass.png',
  dirtGrass: '/textures/dirt_grass.png',
  sand: '/textures/sand.png',
  wood: '/textures/wood.png',
  snow: '/textures/snow.png',
  dirtSnow: '/textures/dirt_snow.png',
  ice: '/textures/ice.png',
  water: '/textures/water.png',
  glass: '/textures/glass.png',
  mineralsPath: '/textures/minerals/earth',
};

/**
 * Moon tileset - uses moon.png for most surfaces
 */
export const MOON_TILESET: TilesetConfig = {
  basePath: '/textures',
  stone: '/textures/moon.png',
  dirt: '/textures/moon.png',
  grass: '/textures/moon.png',
  dirtGrass: '/textures/moon.png',
  sand: '/textures/moon.png',
  wood: '/textures/moon.png',
  snow: '/textures/moon.png',
  dirtSnow: '/textures/moon.png',
  ice: '/textures/moon.png',
  water: '/textures/water.png',
  glass: '/textures/glass.png',
  mineralsPath: '/textures/minerals/earth',  // Reuse Earth minerals (moon folder doesn't exist)
};

/**
 * Tileset for a single-texture (barren) planet: its own rock texture on
 * every native surface, like the Moon's.
 */
function singleTextureTileset(texture: string): TilesetConfig {
  return {
    ...MOON_TILESET,
    stone: texture, dirt: texture, grass: texture, dirtGrass: texture, sand: texture,
    wood: texture, snow: texture, dirtSnow: texture, ice: texture,
  };
}

/** What makes one barren world different from the next. */
interface BarrenWorld {
  id: string;
  name: string;
  radius: number;
  subdivisions: number;       // 4 = radius ~25, 5 = ~50, 6 = ~100 (keeps tiles ~1.75 m)
  position: { x: number; y: number; z: number };
  heightVariation: number;
  gravity: number;            // 1 = Earth
  colour: string;             // distant and far-LOD colour
  seed: number;               // offset from the world seed
}

/**
 * A lifeless, landable rock planet with its own surface texture
 * (public/textures/planets/<id>.png, from scripts/gen-planet-textures.py).
 * No water, atmosphere, flora or fauna; native rock, polar ice and ore
 * veins come from the single-texture terrain generator, like the Moon's.
 */
function barrenPlanet(w: BarrenWorld): CelestialBodyConfig {
  const texture = `/textures/planets/${w.id}.png`;
  return {
    id: w.id,
    name: w.name,
    type: CelestialBodyType.PLANET,
    radius: w.radius,
    subdivisions: w.subdivisions,
    position: w.position,
    visual: {
      texturePath: texture,
      heightVariation: w.heightVariation,
      terrainStyle: TerrainStyle.BARREN,
      distantColor: w.colour,
      lodColors: { rock: w.colour },
    },
    gravity: {
      strength: w.gravity,
      fullRadiusMultiplier: 1.4,
      falloffRadiusMultiplier: 2.4,
    },
    terrain: {
      hasWater: false,
      seed: w.seed,
    },
    tileset: singleTextureTileset(texture),
    spawn: {
      latitude: 20,
      longitude: 30,
      altitudeAboveSurface: 3,
    },
    landable: true,
    hasAtmosphere: false,
  };
}

/**
 * Sequoia tileset - alien planet with unique terrain textures
 */
export const SEQUOIA_TILESET: TilesetConfig = {
  basePath: '/textures/planet_seq',
  stone: '/textures/rocks.png',  // Reuse Earth rocks
  dirt: '/textures/planet_seq/planet_seq_dirt.png',
  grass: '/textures/planet_seq/planet_seq_grass.png',
  dirtGrass: '/textures/planet_seq/planet_seq_grass_dirt.png',
  sand: '/textures/planet_seq/planet_seq_sand.png',
  wood: '/textures/planet_seq/planet_seq_side.png',
  snow: '/textures/planet_seq/planet_seq_snow.png',
  dirtSnow: '/textures/planet_seq/planet_seq_snow_dirt.png',
  ice: '/textures/planet_seq/planet_seq_snow.png',  // Reuse snow as ice
  water: '/textures/water.png',  // Reuse Earth water texture
  glass: '/textures/glass.png',  // Reuse Earth glass
  mineralsPath: '/textures/minerals/earth',  // Reuse Earth minerals for now
};

/**
 * Configuration for player spawn
 */
export interface SpawnConfig {
  /** Latitude for spawn point (degrees, -90 to 90) */
  latitude: number;
  /** Longitude for spawn point (degrees, -180 to 180) */
  longitude: number;
  /** Altitude above surface for spawn */
  altitudeAboveSurface: number;
}

/**
 * Orbital configuration for bodies that orbit others
 */
export interface OrbitConfig {
  /** ID of the body this one orbits (e.g., 'earth' for moon) */
  parent: string;
  /** Distance from parent center */
  distance: number;
  /** Orbital period in game seconds (0 for stationary) */
  orbitalPeriod: number;
  /** Initial angle in orbit (degrees) */
  initialAngle: number;
}

/**
 * Complete configuration for a celestial body
 */
export interface CelestialBodyConfig {
  /** Unique identifier */
  id: string;
  /** Display name */
  name: string;
  /** Type of body */
  type: CelestialBodyType;
  /** Radius in world units */
  radius: number;
  /** LOD subdivisions (higher = more detail, more tiles) */
  subdivisions: number;
  /** Position in world space (for bodies without orbit) */
  position: { x: number; y: number; z: number };
  /** Orbital configuration (for moons, asteroids) */
  orbit?: OrbitConfig;
  /** Visual appearance */
  visual: VisualConfig;
  /** Gravity settings */
  gravity: GravityConfig;
  /** Terrain generation settings */
  terrain: TerrainConfig;
  /** Tileset configuration for block textures (defaults to EARTH_TILESET if not specified) */
  tileset?: TilesetConfig;
  /** Player spawn point (only for landable bodies) */
  spawn?: SpawnConfig;
  /** Whether players can land on this body */
  landable: boolean;
  /** Whether this body has an atmosphere (affects re-entry, sound, etc.) */
  hasAtmosphere: boolean;
  /** Altitude where INTERMEDIATE LOD activates (above this = simplified terrain, below = full detail blocks).
   *  LOD levels: DETAILED (0 to here) -> INTERMEDIATE (here to highLODAltitude) -> HIGH -> DISTANT
   *  If not set, defaults to: radius * 0.25 */
  intermediateLODAltitude?: number;
  /** Altitude where HIGH (chunked) LOD activates (above this = chunked LOD only, no terrain geometry).
   *  LOD levels: DETAILED -> INTERMEDIATE -> HIGH (here to distantLODAltitude) -> DISTANT
   *  If not set, defaults to: radius * 0.5 */
  highLODAltitude?: number;
  /** Altitude where DISTANT LOD activates (simplified sphere for viewing from other planets).
   *  LOD levels: DETAILED -> INTERMEDIATE -> HIGH -> DISTANT (above this)
   *  If not set, defaults to: radius * 2 */
  distantLODAltitude?: number;
  /** Override for detail terrain render distance (number of tiles from player to render at full detail).
   *  If not set, uses PlayerConfig.TERRAIN_MIN_RENDER_DISTANCE (default 16) */
  detailRenderDistance?: number;
}

/**
 * Solar system configuration
 */
export interface SolarSystemConfig {
  /** All celestial bodies in the system */
  bodies: CelestialBodyConfig[];
  /** ID of the starting body (where player spawns) */
  startingBody: string;
  /** Background star color */
  spaceBackgroundColor: string;
  /** Ambient light intensity in space */
  ambientLightIntensity: number;
}

// =============================================================================
// DEFAULT SOLAR SYSTEM CONFIGURATION
// =============================================================================

export const SOLAR_SYSTEM: SolarSystemConfig = {
  startingBody: 'earth',
  spaceBackgroundColor: '#000011',
  ambientLightIntensity: 0.1,

  bodies: [
    // =========================================================================
    // SUN
    // =========================================================================
    {
      id: 'sun',
      name: 'Sun',
      type: CelestialBodyType.STAR,
      radius: 500,
      subdivisions: 4,
      position: { x: 1000, y: 0, z: 4000},
      visual: {
        heightVariation: 0,
        terrainStyle: TerrainStyle.VOLCANIC,
        distantColor: '#ffdd44',
        emissive: true,
        emissiveColor: '#ffaa00',
      },
      gravity: {
        strength: 0, // Players don't interact with sun gravity
        fullRadiusMultiplier: 1.0,
        falloffRadiusMultiplier: 1.5,
      },
      terrain: {
        hasWater: false,
      },
      landable: false,
      hasAtmosphere: false,
    },

    // =========================================================================
    // EARTH
    // =========================================================================
    {
      id: 'earth',
      name: 'Earth',
      type: CelestialBodyType.PLANET,
      radius: 100,
      subdivisions: 6,
      position: { x: 0, y: 0, z: 0 },
      visual: {
        heightVariation: 1.0,
        terrainStyle: TerrainStyle.EARTH_LIKE,
        distantColor: '#4488ff',
      },
      gravity: {
        strength: 1.0,
        fullRadiusMultiplier: 1.4,
        falloffRadiusMultiplier: 1.8,
      },
      terrain: {
        hasWater: true,
        seaLevel: 12,
      },
      tileset: EARTH_TILESET,
      spawn: {
        latitude: 52.5,
        longitude: 127.0,
        altitudeAboveSurface: 3,
      },
      landable: true,
      hasAtmosphere: true,
    },

    // =========================================================================
    // MOON (Earth's Moon)
    // =========================================================================
    {
      id: 'moon',
      name: 'Moon',
      type: CelestialBodyType.MOON,
      radius: 50,
      subdivisions: 5,
      position: { x: 400, y: 0, z: 0 }, // ~250 units from Earth surface
      orbit: {
        parent: 'earth',
        distance: 400,
        orbitalPeriod: 0, // Stationary for now
        initialAngle: 0,
      },
      visual: {
        texturePath: '/textures/moon.png',
        heightVariation: 0.6,
        terrainStyle: TerrainStyle.BARREN,
        distantColor: '#aaaaaa',
      },
      gravity: {
        strength: 0.4,
        fullRadiusMultiplier: 1.4,  // 70 units at radius 50
        falloffRadiusMultiplier: 2.4, // 120 units at radius 50
      },
      terrain: {
        hasWater: false,
      },
      tileset: MOON_TILESET,
      spawn: {
        latitude: 0,
        longitude: 0,
        altitudeAboveSurface: 3,
      },
      landable: true,
      hasAtmosphere: false,
    },

    // =========================================================================
    // SEQUOIA (Alien Planet)
    // =========================================================================
    {
      id: 'sequoia',
      name: 'Sequoia',
      type: CelestialBodyType.PLANET,
      radius: 200,  // 2x Earth's radius
      subdivisions: 7,
      position: { x: 800, y: 100, z: 400 },
      visual: {
        heightVariation: 1.0,
        terrainStyle: TerrainStyle.EARTH_LIKE,  // Same biome logic as Earth
        distantColor: '#558844',  // Greenish when viewed from distance
        atmosphereTint: '#ffaa88',  // Reddish atmosphere tint
        lodColors: {
          land: '#7b6640',   // Olive-green alien vegetation
          water: '#2a6655', // Greenish alien water (matches waterColor)
          ice: '#a8d8c8',   // Greenish-tinted ice
          snow: '#e8f0e8',  // Slightly green-tinted snow
          rock: '#7a7a6a',  // Brownish-grey rock
        },
      },
      gravity: {
        strength: 1.0,  // Same as Earth despite larger size
        fullRadiusMultiplier: 1.2,
        falloffRadiusMultiplier: 1.5,
      },
      terrain: {
        hasWater: true,
        seaLevel: 12,
        waterColor: '#2a6655',      // Greenish water
        waterDeepColor: '#1a4433',  // Darker greenish deep water
      },
      tileset: SEQUOIA_TILESET,
      spawn: {
        latitude: 30,
        longitude: 45,
        altitudeAboveSurface: 3,
      },
      landable: true,
      hasAtmosphere: true,
      intermediateLODAltitude: 50,  // DETAILED -> INTERMEDIATE at altitude 50
      highLODAltitude: 100,  // INTERMEDIATE -> HIGH (chunked) at altitude 100
      distantLODAltitude: 150,  // HIGH -> DISTANT at altitude 200
      detailRenderDistance: 20,  // Fewer detail tiles for larger planet (reduces geometry load)
    },

    // =========================================================================
    // THE BARREN WORLDS - eight more landable planets (lifeless rock)
    // =========================================================================
    // Spread round Earth at 1.5-4 km so the rocket reaches each in a few
    // minutes, and kept clear of the sun (1000, 0, 4000).
    barrenPlanet({ id: 'cinder', name: 'Cinder', radius: 45, subdivisions: 5, position: { x: -1600, y: 150, z: 900 },
      heightVariation: 0.9, gravity: 0.6, colour: '#5a3a30', seed: 101 }),
    barrenPlanet({ id: 'vesper', name: 'Vesper', radius: 60, subdivisions: 5, position: { x: 2200, y: -100, z: -600 },
      heightVariation: 0.5, gravity: 0.7, colour: '#d6a96c', seed: 202 }),
    barrenPlanet({ id: 'halcyon', name: 'Halcyon', radius: 55, subdivisions: 5, position: { x: -900, y: -250, z: -1800 },
      heightVariation: 0.8, gravity: 0.65, colour: '#3f8577', seed: 303 }),
    barrenPlanet({ id: 'ferrum', name: 'Ferrum', radius: 90, subdivisions: 6, position: { x: 2600, y: 300, z: 2200 },
      heightVariation: 1.0, gravity: 0.9, colour: '#953b25', seed: 404 }),
    barrenPlanet({ id: 'tessaly', name: 'Tessaly', radius: 50, subdivisions: 5, position: { x: -2400, y: 400, z: -400 },
      heightVariation: 0.6, gravity: 0.55, colour: '#c3dff0', seed: 505 }),
    barrenPlanet({ id: 'nerith', name: 'Nerith', radius: 38, subdivisions: 5, position: { x: 300, y: -500, z: -2600 },
      heightVariation: 0.7, gravity: 0.45, colour: '#61708a', seed: 606 }),
    barrenPlanet({ id: 'kessel', name: 'Kessel', radius: 25, subdivisions: 4, position: { x: -300, y: 600, z: 2400 },
      heightVariation: 1.0, gravity: 0.25, colour: '#655d77', seed: 707 }),
    barrenPlanet({ id: 'umbra', name: 'Umbra', radius: 45, subdivisions: 5, position: { x: 3600, y: -200, z: 600 },
      heightVariation: 0.7, gravity: 0.5, colour: '#2e3560', seed: 808 }),

    // =========================================================================
    // EXAMPLE: Additional bodies that could be added
    // =========================================================================

    // Uncomment to add Mars
    // {
    //   id: 'mars',
    //   name: 'Mars',
    //   type: CelestialBodyType.PLANET,
    //   radius: 80,
    //   subdivisions: 5,
    //   position: { x: 1500, y: 100, z: 500 },
    //   visual: {
    //     texturePath: '/textures/mars.png', // Would need to create this
    //     heightVariation: 0.8,
    //     terrainStyle: TerrainStyle.BARREN,
    //     distantColor: '#dd6644',
    //   },
    //   gravity: {
    //     strength: 0.38,
    //     fullRadiusMultiplier: 1.4,
    //     falloffRadiusMultiplier: 1.8,
    //   },
    //   terrain: {
    //     hasWater: false,
    //   },
    //   spawn: {
    //     latitude: 0,
    //     longitude: 0,
    //     altitudeAboveSurface: 3,
    //   },
    //   landable: true,
    //   hasAtmosphere: true, // Thin atmosphere
    // },

    // Uncomment to add an asteroid
    // {
    //   id: 'asteroid_1',
    //   name: 'Asteroid Alpha',
    //   type: CelestialBodyType.ASTEROID,
    //   radius: 15,
    //   subdivisions: 3,
    //   position: { x: 800, y: 200, z: -300 },
    //   visual: {
    //     texturePath: '/textures/moon.png', // Reuse moon texture
    //     heightVariation: 1.0, // Very bumpy
    //     terrainStyle: TerrainStyle.BARREN,
    //     distantColor: '#666666',
    //   },
    //   gravity: {
    //     strength: 0.05, // Very weak gravity
    //     fullRadiusMultiplier: 1.2,
    //     falloffRadiusMultiplier: 2.0,
    //   },
    //   terrain: {
    //     hasWater: false,
    //   },
    //   landable: true,
    //   hasAtmosphere: false,
    // },
  ],
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get a celestial body config by ID
 */
export function getBodyConfig(id: string): CelestialBodyConfig | undefined {
  return SOLAR_SYSTEM.bodies.find(body => body.id === id);
}

/**
 * Get all landable bodies
 */
export function getLandableBodies(): CelestialBodyConfig[] {
  return SOLAR_SYSTEM.bodies.filter(body => body.landable);
}

/**
 * Get all bodies of a specific type
 */
export function getBodiesByType(type: CelestialBodyType): CelestialBodyConfig[] {
  return SOLAR_SYSTEM.bodies.filter(body => body.type === type);
}

/**
 * Get the starting body config
 */
export function getStartingBodyConfig(): CelestialBodyConfig {
  const body = getBodyConfig(SOLAR_SYSTEM.startingBody);
  if (!body) {
    throw new Error(`Starting body '${SOLAR_SYSTEM.startingBody}' not found in solar system config`);
  }
  return body;
}

/**
 * Get moons of a specific body
 */
export function getMoonsOf(parentId: string): CelestialBodyConfig[] {
  return SOLAR_SYSTEM.bodies.filter(
    body => body.type === CelestialBodyType.MOON && body.orbit?.parent === parentId
  );
}

/**
 * Convert body position config to THREE.Vector3
 */
export function getBodyPosition(body: CelestialBodyConfig): THREE.Vector3 {
  return new THREE.Vector3(body.position.x, body.position.y, body.position.z);
}

/**
 * Calculate absolute gravity radii from config
 */
export function getGravityRadii(body: CelestialBodyConfig): { fullRadius: number; falloffRadius: number } {
  return {
    fullRadius: body.radius * body.gravity.fullRadiusMultiplier,
    falloffRadius: body.radius * body.gravity.falloffRadiusMultiplier,
  };
}
