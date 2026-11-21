// Solar System Configuration
// Centralized definitions for all celestial bodies (sun, planets, moons, asteroids)
// Makes it easy to add new bodies by defining their properties here

import * as THREE from 'three';
import { PlayerConfig } from './PlayerConfig';

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
  /** Color for molten volcano craters */
  lava: string;
}

/** Default Earth-like LOD colors */
export const DEFAULT_LOD_COLORS: LodColorsConfig = {
  land: '#4a8c4a',   // Green grass
  water: '#3399cc',  // Ocean blue
  ice: '#b8e0f0',    // Polar ice (light cyan)
  snow: '#f0f0f0',   // Snow white
  rock: '#888888',   // Grey rock
  lava: '#ff7a1a',   // Glowing magma
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
  /** Rock worlds: volcano cones with molten craters (count) */
  volcanoes?: number;
  /** Rock worlds: a frozen crust (frost over glacier ice, blue ice on slopes) */
  iceCover?: boolean;
  /** Rock worlds: meteoric iron at the surface, extra ore veins */
  metalRich?: boolean;
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

/** Where the star sits (the 'sun' body below uses it too). */
const SUN_POSITION = { x: 1000, y: 0, z: 4000 };

/**
 * Spawn lat/lon on a body's sunlit side: the sub-solar point, swung
 * SPAWN_MORNING_DEG towards the terminator so the light comes in low.
 */
const SPAWN_MORNING_DEG = 35;
function daySideSpawn(position: { x: number; y: number; z: number }): { latitude: number; longitude: number } {
  const d = new THREE.Vector3(SUN_POSITION.x - position.x, SUN_POSITION.y - position.y, SUN_POSITION.z - position.z).normalize();
  const latitude = THREE.MathUtils.radToDeg(Math.asin(d.y));
  const longitude = THREE.MathUtils.radToDeg(Math.atan2(d.z, d.x)) + SPAWN_MORNING_DEG;
  return { latitude, longitude };
}

/**
 * Goldberg subdivisions that keep a body's tiles about 1.75 m across at its
 * radius (each step doubles the tile count's square root). Capped at 7:
 * subdivision 8 is 655k tiles - several seconds and over a GB to build - so a
 * body past 200 m simply gets slightly larger tiles.
 */
function subdivisionsFor(radius: number): number {
  if (radius <= 8) return 2;
  if (radius < 18) return 3;
  if (radius < 35) return 4;
  if (radius < 71) return 5;
  if (radius < 141) return 6;
  return 7;
}

/** What makes one rock world (planet, moon or asteroid) different from the next. */
interface RockWorld {
  id: string;
  name: string;
  radius: number;
  position: { x: number; y: number; z: number };
  heightVariation: number;
  gravity: number;            // 1 = Earth
  colour: string;             // distant and far-LOD colour
  seed: number;               // offset from the world seed
  type?: CelestialBodyType;   // default PLANET
  parent?: string;            // the body a moon belongs to
  texture?: string;           // default public/textures/planets/<id>.png
  volcanoes?: number;         // volcano cones with molten craters
  iceCover?: boolean;         // a frozen crust over glacier ice
  metalRich?: boolean;        // meteoric iron at the surface, extra ore
}

// Small bodies need a shallower column (sea level = air above the datum,
// plus dig depth) or its bottom would pass the centre; a volcano needs
// headroom for its cone
const FULL_COLUMN_RADIUS = 45;
const SMALL_SEA_LEVEL_SHARE = 0.3;
const SMALL_DEPTH_SHARE = 0.35;
const VOLCANO_HEADROOM = 4;
const SMALL_BODY_RADIUS = 40;     // below this the LOD bands get floors, so
const SMALL_INTERMEDIATE_ALT = 15; // a jump doesn't drop the detailed terrain
const SMALL_HIGH_ALT = 25;
const SMALL_DISTANT_ALT = 60;

/**
 * A lifeless, landable rock world with its own surface texture
 * (public/textures/planets/<id>.png, from scripts/gen-planet-textures.py).
 * No water, atmosphere, flora or fauna; native rock, polar ice and ore
 * veins come from the single-texture terrain generator, like the Moon's -
 * plus volcano cones, an ice crust or meteoric iron where the world has them.
 */
function rockWorld(w: RockWorld): CelestialBodyConfig {
  const texture = w.texture ?? `/textures/planets/${w.id}.png`;
  const small = w.radius < FULL_COLUMN_RADIUS;
  const seaLevel = small ? Math.max(3, Math.round(w.radius * SMALL_SEA_LEVEL_SHARE)) : undefined;
  const headroom = w.volcanoes ? VOLCANO_HEADROOM : 0;
  const tiny = w.radius < SMALL_BODY_RADIUS;
  return {
    id: w.id,
    name: w.name,
    type: w.type ?? CelestialBodyType.PLANET,
    radius: w.radius,
    subdivisions: subdivisionsFor(w.radius),
    position: w.position,
    orbit: w.parent ? { parent: w.parent, distance: 0, orbitalPeriod: 0, initialAngle: 0 } : undefined,
    visual: {
      texturePath: texture,
      heightVariation: w.heightVariation,
      terrainStyle: w.volcanoes ? TerrainStyle.VOLCANIC : w.iceCover ? TerrainStyle.ICY : TerrainStyle.BARREN,
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
      seaLevel: seaLevel !== undefined ? seaLevel + headroom : headroom ? PlayerConfig.TERRAIN_SEA_LEVEL + headroom : undefined,
      maxDepth: small ? Math.max(3, Math.round(w.radius * SMALL_DEPTH_SHARE)) : undefined,
      volcanoes: w.volcanoes,
      iceCover: w.iceCover,
      metalRich: w.metalRich,
    },
    tileset: singleTextureTileset(texture),
    spawn: {
      ...daySideSpawn(w.position),
      altitudeAboveSurface: tiny ? 2 : 3,
    },
    landable: true,
    hasAtmosphere: false,
    ...(tiny ? {
      intermediateLODAltitude: SMALL_INTERMEDIATE_ALT,
      highLODAltitude: SMALL_HIGH_ALT,
      distantLODAltitude: SMALL_DISTANT_ALT,
    } : {}),
  };
}

/** A moon of `parent` (a rock world). */
const moon = (parent: string, w: Omit<RockWorld, 'parent' | 'type'>) =>
  rockWorld({ ...w, parent, type: CelestialBodyType.MOON });

/** An asteroid: tiny, lumpy, nearly weightless; textures shared per kind. */
type AsteroidKind = 'rock' | 'metal' | 'ice';
const asteroid = (kind: AsteroidKind, w: Omit<RockWorld, 'type' | 'texture' | 'heightVariation' | 'gravity'>) =>
  rockWorld({
    ...w, type: CelestialBodyType.ASTEROID, texture: `/textures/planets/asteroid_${kind}.png`,
    heightVariation: 1.0, gravity: 0.12, metalRich: kind === 'metal', iceCover: kind === 'ice',
  });

/**
 * The gas giants: visual only (not landable, no terrain, no gravity), drawn
 * by src/mockups/SolarSystemMockup.ts in the far layer. They stand still, so
 * their moons (landable rock worlds below) can sit beside them.
 */
export interface GasGiantConfig {
  id: string;
  name: string;
  radius: number;
  position: { x: number; y: number; z: number };
}
// A gas giant's rings reach this far out (radii); its moons sit beyond them
export const GAS_GIANT_RING_OUTER = 2.3;
export const GAS_GIANTS: GasGiantConfig[] = [
  { id: 'brontes', name: 'Brontes', radius: 480, position: { x: -5200, y: 600, z: -3600 } },
  { id: 'aurelia', name: 'Aurelia', radius: 380, position: { x: 5200, y: -400, z: 4600 } },
];

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
      position: SUN_POSITION,
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
    // THE ROCK WORLDS - eight more landable planets (lifeless), radius 80-280
    // =========================================================================
    // Spread round Earth at 1.5-4.5 km so the rocket reaches each in a few
    // minutes, clear of the sun (1000, 0, 4000) and of each other's gravity
    // (every pair sits further apart than their two falloff radii; the boot
    // log warns when they don't - bodyClearanceProblems below).
    rockWorld({ id: 'cinder', name: 'Cinder', radius: 130, position: { x: -1600, y: 150, z: 900 },
      heightVariation: 0.6, gravity: 0.6, colour: '#5a3a30', seed: 101, volcanoes: 6 }),
    rockWorld({ id: 'vesper', name: 'Vesper', radius: 280, position: { x: 2800, y: -100, z: -1200 },
      heightVariation: 0.5, gravity: 0.7, colour: '#d6a96c', seed: 202 }),
    rockWorld({ id: 'halcyon', name: 'Halcyon', radius: 120, position: { x: -1100, y: -250, z: -2000 },
      heightVariation: 0.8, gravity: 0.65, colour: '#3f8577', seed: 303 }),
    rockWorld({ id: 'ferrum', name: 'Ferrum', radius: 200, position: { x: 2600, y: 300, z: 2200 },
      heightVariation: 1.0, gravity: 0.9, colour: '#953b25', seed: 404 }),
    rockWorld({ id: 'tessaly', name: 'Tessaly', radius: 160, position: { x: -2800, y: 400, z: -600 },
      heightVariation: 0.6, gravity: 0.55, colour: '#c3dff0', seed: 505, iceCover: true }),
    rockWorld({ id: 'nerith', name: 'Nerith', radius: 90, position: { x: 300, y: -500, z: -2600 },
      heightVariation: 0.7, gravity: 0.45, colour: '#61708a', seed: 606 }),
    rockWorld({ id: 'kessel', name: 'Kessel', radius: 80, position: { x: -300, y: 600, z: 2400 },
      heightVariation: 1.0, gravity: 0.35, colour: '#655d77', seed: 707 }),
    rockWorld({ id: 'umbra', name: 'Umbra', radius: 110, position: { x: 4000, y: -200, z: 600 },
      heightVariation: 0.7, gravity: 0.5, colour: '#2e3560', seed: 808 }),

    // =========================================================================
    // THE PLANETS' MOONS - each beside its planet, outside its gravity
    // =========================================================================
    moon('sequoia', { id: 'ember', name: 'Ember', radius: 45, position: { x: 1250, y: 100, z: 600 },
      heightVariation: 0.4, gravity: 0.35, colour: '#3a2622', seed: 901, volcanoes: 4 }),
    moon('sequoia', { id: 'rime', name: 'Rime', radius: 30, position: { x: 900, y: 450, z: 100 },
      heightVariation: 0.5, gravity: 0.25, colour: '#cfe6f2', seed: 902, iceCover: true }),
    moon('vesper', { id: 'sable', name: 'Sable', radius: 35, position: { x: 2600, y: 500, z: -1800 },
      heightVariation: 0.8, gravity: 0.3, colour: '#5d5246', seed: 903, metalRich: true }),
    moon('halcyon', { id: 'glint', name: 'Glint', radius: 28, position: { x: -700, y: -100, z: -2250 },
      heightVariation: 0.6, gravity: 0.25, colour: '#9fd3e6', seed: 904, iceCover: true }),
    moon('umbra', { id: 'nyx', name: 'Nyx', radius: 45, position: { x: 4000, y: 250, z: 850 },
      heightVariation: 0.6, gravity: 0.35, colour: '#7f8fc0', seed: 905, iceCover: true }),
    moon('umbra', { id: 'brand', name: 'Brand', radius: 30, position: { x: 4250, y: -500, z: 250 },
      heightVariation: 0.4, gravity: 0.25, colour: '#4a2a24', seed: 906, volcanoes: 2 }),
    moon('cinder', { id: 'scoria', name: 'Scoria', radius: 32, position: { x: -2050, y: 230, z: 1100 },
      heightVariation: 0.7, gravity: 0.25, colour: '#6b4a3c', seed: 907 }),
    moon('ferrum', { id: 'lodestone', name: 'Lodestone', radius: 40, position: { x: 3300, y: 400, z: 2050 },
      heightVariation: 0.7, gravity: 0.35, colour: '#5b5f66', seed: 908, metalRich: true }),

    // =========================================================================
    // THE GAS GIANTS' MOONS (the giants themselves: GAS_GIANTS above)
    // =========================================================================
    // Each giant also has a jungle moon (Verdance by Brontes, Mirewood by
    // Aurelia) - their slots are kept free: see RESERVED_SLOTS.
    moon('brontes', { id: 'pyrra', name: 'Pyrra', radius: 60, position: { x: -6500, y: 300, z: -2600 },
      heightVariation: 0.4, gravity: 0.4, colour: '#c9a640', seed: 911, volcanoes: 7 }),
    moon('brontes', { id: 'glacia', name: 'Glacia', radius: 70, position: { x: -5000, y: 1100, z: -5300 },
      heightVariation: 0.5, gravity: 0.45, colour: '#e3eef2', seed: 912, iceCover: true }),
    moon('brontes', { id: 'obol', name: 'Obol', radius: 35, position: { x: -6100, y: 1500, z: -4900 },
      heightVariation: 0.9, gravity: 0.3, colour: '#7a6a5c', seed: 913 }),
    moon('aurelia', { id: 'calyx', name: 'Calyx', radius: 55, position: { x: 6100, y: 100, z: 5500 },
      heightVariation: 0.6, gravity: 0.4, colour: '#a8d8e8', seed: 914, iceCover: true, volcanoes: 2 }),
    moon('aurelia', { id: 'ashfall', name: 'Ashfall', radius: 45, position: { x: 5700, y: -1100, z: 3400 },
      heightVariation: 0.5, gravity: 0.35, colour: '#3d3b3f', seed: 915, volcanoes: 5 }),
    moon('aurelia', { id: 'ingot', name: 'Ingot', radius: 30, position: { x: 4800, y: 500, z: 5700 },
      heightVariation: 0.8, gravity: 0.25, colour: '#8a7f70', seed: 916, metalRich: true }),

    // =========================================================================
    // THE ASTEROIDS - a loose belt round the inner system, ~5 km out
    // =========================================================================
    asteroid('rock', { id: 'talus', name: 'Talus', radius: 10, position: { x: 4700, y: 300, z: -2200 }, colour: '#6e6258', seed: 921 }),
    asteroid('metal', { id: 'ferrite', name: 'Ferrite', radius: 12, position: { x: 1500, y: -400, z: -4900 }, colour: '#77736c', seed: 922 }),
    asteroid('ice', { id: 'hailstone', name: 'Hailstone', radius: 9, position: { x: -2600, y: 500, z: -4300 }, colour: '#c8e4ef', seed: 923 }),
    asteroid('rock', { id: 'clinker', name: 'Clinker', radius: 14, position: { x: -4600, y: -300, z: -1200 }, colour: '#5a5048', seed: 924 }),
    asteroid('metal', { id: 'nickel', name: 'Nickel', radius: 11, position: { x: -4400, y: 200, z: 2300 }, colour: '#837f77', seed: 925 }),
    asteroid('ice', { id: 'sleet', name: 'Sleet', radius: 13, position: { x: -1900, y: -600, z: 4400 }, colour: '#b4d6e4', seed: 926 }),
    asteroid('rock', { id: 'grit', name: 'Grit', radius: 8, position: { x: 5000, y: -300, z: 1900 }, colour: '#665a50', seed: 927 }),
    asteroid('metal', { id: 'magnetite', name: 'Magnetite', radius: 15, position: { x: 3600, y: 600, z: -3600 }, colour: '#5f5c58', seed: 928 }),
  ],
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Room kept free for bodies that are configured elsewhere (the jungle moons
 * of the gas giants): position and radius, so nothing else is placed there.
 */
export const RESERVED_SLOTS: Array<{ id: string; radius: number; position: { x: number; y: number; z: number } }> = [
  { id: 'verdance', radius: 70, position: { x: -3700, y: 800, z: -2900 } },  // Brontes + (1500, 200, 700)
  { id: 'mirewood', radius: 70, position: { x: 3900, y: -100, z: 4000 } },   // Aurelia + (-1300, 300, -600)
];

// Space left between two bodies' outer reach (gravity falloff, a giant's rings)
const CLEARANCE_MARGIN = 50;
const RESERVED_FALLOFF = 2.4;

/**
 * Pairs of bodies too close together: their gravity wells (or a giant's
 * rings) overlap. Empty when the layout is sound; logged at boot.
 */
export function bodyClearanceProblems(): string[] {
  const reach: Array<{ id: string; r: number; p: { x: number; y: number; z: number } }> = [
    ...SOLAR_SYSTEM.bodies.map(b => ({ id: b.id, r: b.radius * b.gravity.falloffRadiusMultiplier, p: b.position })),
    ...GAS_GIANTS.map(g => ({ id: g.id, r: g.radius * GAS_GIANT_RING_OUTER, p: g.position })),
    ...RESERVED_SLOTS.filter(r => !getBodyConfig(r.id)).map(r => ({ id: r.id, r: r.radius * RESERVED_FALLOFF, p: r.position })),
  ];
  const problems: string[] = [];
  for (let i = 0; i < reach.length; i++) {
    for (let j = i + 1; j < reach.length; j++) {
      const a = reach[i], b = reach[j];
      const d = Math.hypot(a.p.x - b.p.x, a.p.y - b.p.y, a.p.z - b.p.z);
      if (d < a.r + b.r + CLEARANCE_MARGIN) problems.push(`${a.id} and ${b.id}: ${d.toFixed(0)} apart, need ${(a.r + b.r + CLEARANCE_MARGIN).toFixed(0)}`);
    }
  }
  return problems;
}

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
