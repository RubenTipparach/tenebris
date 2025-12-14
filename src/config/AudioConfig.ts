// Audio System Configuration
// Sound definitions, categories, and block-to-surface mappings

import { HexBlockType } from '../shared/blockTypes';

/**
 * Sound categories for volume control
 */
export enum SoundCategory {
  MASTER = 'master',
  FOOTSTEPS = 'footsteps',
  PLAYER = 'player',
  MINING = 'mining',
  BUILDING = 'building',
  ROCKET = 'rocket',
  UI = 'ui',
}

/**
 * Surface types for footstep sounds
 */
export enum SurfaceType {
  GRASS = 'grass',
  STONE = 'stone',
  WOOD = 'wood',
  WATER = 'water',
  GRAVEL = 'gravel',
  LEAVES = 'leaves',
  MUD = 'mud',
  SAND = 'sand',
  SNOW = 'snow',
  ICE = 'ice',
  METAL = 'metal',
}

/**
 * Sound configuration interface
 */
export interface SoundConfig {
  path: string;
  volume: number; // 0-1
  category: SoundCategory;
  poolSize?: number; // For pooled sounds (footsteps, mining)
  loop?: boolean;
  spatial?: boolean; // 3D positional audio
  falloffDistance?: number; // Max distance for spatial sounds
}

/**
 * All sound definitions
 */
export const SOUND_DEFINITIONS: Record<string, SoundConfig> = {
  // === FOOTSTEPS (pooled, spatial) ===
  footstep_grass: {
    path: '/sfx/03_Step_grass_03.wav',
    volume: 0.4,
    category: SoundCategory.FOOTSTEPS,
    poolSize: 4,
    spatial: true,
    falloffDistance: 20,
  },
  footstep_stone: {
    path: '/sfx/03_Step_grass_03.wav',
    volume: 0.4,
    category: SoundCategory.FOOTSTEPS,
    poolSize: 4,
    spatial: true,
    falloffDistance: 20,
  },
  footstep_rock: {
    path: '/sfx/03_Step_grass_03.wav',
    volume: 0.4,
    category: SoundCategory.FOOTSTEPS,
    poolSize: 4,
    spatial: true,
    falloffDistance: 20,
  },
  footstep_wood: {
    path: '/sfx/03_Step_grass_03.wav',
    volume: 0.4,
    category: SoundCategory.FOOTSTEPS,
    poolSize: 4,
    spatial: true,
    falloffDistance: 20,
  },
  footstep_water: {
    path: '/sfx/14_Step_water_02.wav',
    volume: 0.4,
    category: SoundCategory.FOOTSTEPS,
    poolSize: 4,
    spatial: true,
    falloffDistance: 20,
  },
  footstep_gravel: {
    path: '/sfx/gravel.ogg',
    volume: 0.4,
    category: SoundCategory.FOOTSTEPS,
    poolSize: 4,
    spatial: true,
    falloffDistance: 20,
  },
  footstep_leaves: {
    path: '/sfx/leaves01.ogg',
    volume: 0.4,
    category: SoundCategory.FOOTSTEPS,
    poolSize: 4,
    spatial: true,
    falloffDistance: 20,
  },
  footstep_mud: {
    path: '/sfx/mud02.ogg',
    volume: 0.4,
    category: SoundCategory.FOOTSTEPS,
    poolSize: 4,
    spatial: true,
    falloffDistance: 20,
  },

  // === PLAYER ACTIONS ===
  jump: {
    path: '/sfx/30_Jump_03.wav',
    volume: 1.0,
    category: SoundCategory.PLAYER,
    spatial: true,
    falloffDistance: 30,
  },
  landing: {
    path: '/sfx/45_Landing_01.wav',
    volume: 1.0,
    category: SoundCategory.PLAYER,
    spatial: true,
    falloffDistance: 30,
  },
  swim: {
    path: '/sfx/26_Swim_Submerged_02.wav',
    volume: 1.0,
    category: SoundCategory.PLAYER,
    spatial: true,
    falloffDistance: 20,
  },
  dive: {
    path: '/sfx/splash-6213.mp3',
    volume: 1.5,
    category: SoundCategory.PLAYER,
    spatial: true,
    falloffDistance: 25,
  },
  climb: {
    path: '/sfx/42_Cling_climb_03.wav',
    volume: 0.4,
    category: SoundCategory.PLAYER,
    spatial: true,
    falloffDistance: 15,
  },

  // === MINING ===
  mining_hit: {
    path: '/sfx/61_Hit_03.wav',
    volume: 0.1,
    category: SoundCategory.MINING,
    poolSize: 3,
    spatial: true,
    falloffDistance: 25,
  },

  // === ROCKET ===
  rocket_engine: {
    path: '/sfx/rocket_engine.001.wav',
    volume: 1.0,
    category: SoundCategory.ROCKET,
    loop: true,
    spatial: true,
    falloffDistance: 200,
  },
  explosion: {
    path: '/sfx/explosion.wav',
    volume: 1.0,
    category: SoundCategory.ROCKET,
    spatial: true,
    falloffDistance: 300,
  },

  // === COMBAT/IMPACT (for future use) ===
  attack: {
    path: '/sfx/56_Attack_03.wav',
    volume: 0.6,
    category: SoundCategory.PLAYER,
    spatial: true,
    falloffDistance: 20,
  },
  hit: {
    path: '/sfx/61_Hit_03.wav',
    volume: 1.0,
    category: SoundCategory.PLAYER,
    spatial: true,
    falloffDistance: 20,
  },
  teleport: {
    path: '/sfx/88_Teleport_02.wav',
    volume: 0.5,
    category: SoundCategory.PLAYER,
    spatial: true,
    falloffDistance: 30,
  },

  // === UI (2D, non-spatial) ===
  ui_click: {
    path: '/sfx/chair_push.wav',
    volume: 0.6,
    category: SoundCategory.UI,
    spatial: false,
  },
};

/**
 * Map block types to surface types for footstep sounds
 */
export const BLOCK_TO_SURFACE: Partial<Record<HexBlockType, SurfaceType>> = {
  [HexBlockType.GRASS]: SurfaceType.GRASS,
  [HexBlockType.DIRT]: SurfaceType.MUD,
  [HexBlockType.STONE]: SurfaceType.STONE,
  [HexBlockType.WOOD]: SurfaceType.WOOD,
  [HexBlockType.SAND]: SurfaceType.SAND,
  [HexBlockType.WATER]: SurfaceType.WATER,
  [HexBlockType.SNOW]: SurfaceType.SNOW,
  [HexBlockType.DIRT_SNOW]: SurfaceType.SNOW,
  [HexBlockType.ICE]: SurfaceType.ICE,
  [HexBlockType.LEAVES]: SurfaceType.LEAVES,
  [HexBlockType.GLASS]: SurfaceType.STONE,
  // Ores sound like stone
  [HexBlockType.ORE_COAL]: SurfaceType.STONE,
  [HexBlockType.ORE_COPPER]: SurfaceType.STONE,
  [HexBlockType.ORE_IRON]: SurfaceType.STONE,
  [HexBlockType.ORE_GOLD]: SurfaceType.STONE,
  [HexBlockType.ORE_LITHIUM]: SurfaceType.STONE,
  [HexBlockType.ORE_ALUMINUM]: SurfaceType.STONE,
  [HexBlockType.ORE_COBALT]: SurfaceType.STONE,
  // Tech blocks sound like metal
  [HexBlockType.FURNACE]: SurfaceType.METAL,
  [HexBlockType.COMPUTER]: SurfaceType.METAL,
  [HexBlockType.PRINTER_3D]: SurfaceType.METAL,
};

/**
 * Map surface types to footstep sound IDs
 */
export const SURFACE_TO_SOUND: Record<SurfaceType, string> = {
  [SurfaceType.GRASS]: 'footstep_grass',
  [SurfaceType.STONE]: 'footstep_stone',
  [SurfaceType.WOOD]: 'footstep_wood',
  [SurfaceType.WATER]: 'footstep_water',
  [SurfaceType.GRAVEL]: 'footstep_gravel',
  [SurfaceType.LEAVES]: 'footstep_leaves',
  [SurfaceType.MUD]: 'footstep_mud',
  [SurfaceType.SAND]: 'footstep_gravel', // Sand uses gravel sound
  [SurfaceType.SNOW]: 'footstep_gravel', // Snow uses gravel sound
  [SurfaceType.ICE]: 'footstep_stone', // Ice uses stone sound
  [SurfaceType.METAL]: 'footstep_stone', // Metal uses stone sound
};

/**
 * Audio system settings
 */
export const AUDIO_SETTINGS = {
  // Footstep timing
  FOOTSTEP_INTERVAL_WALK: 0.4, // Seconds between footsteps when walking
  FOOTSTEP_INTERVAL_SPRINT: 0.25, // Seconds between footsteps when sprinting

  // Mining sound timing
  MINING_SOUND_INTERVAL: 0.35, // Seconds between mining hit sounds

  // Pitch variation for natural sound
  PITCH_VARIATION_MIN: 0.9,
  PITCH_VARIATION_MAX: 1.1,

  // Minimum time between same sound plays
  MIN_SOUND_INTERVAL: 0.05, // 50ms

  // Fade durations
  LOOP_FADE_OUT_DURATION: 0.3, // Seconds to fade out loops

  // Default volumes per category
  DEFAULT_VOLUMES: {
    [SoundCategory.MASTER]: 1.0,
    [SoundCategory.FOOTSTEPS]: 0.7,
    [SoundCategory.PLAYER]: 0.8,
    [SoundCategory.MINING]: 0.8,
    [SoundCategory.BUILDING]: 0.7,
    [SoundCategory.ROCKET]: 0.9,
    [SoundCategory.UI]: 0.5,
  } as Record<SoundCategory, number>,
};
