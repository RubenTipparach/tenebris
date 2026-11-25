import { loadingManager } from '../engine/LoadingManager';
import * as THREE from 'three';
import { HexTile } from './GoldbergPolyhedron';
import { PlayerConfig } from '../config/PlayerConfig';
import { TilesetConfig, EARTH_TILESET, MOON_TILESET, SEQUOIA_TILESET } from '../config/SolarSystemConfig';
import { getAssetPath } from '../utils/assetPath';
import { LIGHTING_CONFIG, SURFACE_RELIEF } from '../config/LightingConfig';
import waterVert from '../shaders/water/water.vert';
import { flowTile, FlowTile } from '../water/FlowTile';
import { WaterConfig } from '../config/WaterConfig';
import waterFrag from '../shaders/water/water.frag';
import terrainVert from '../shaders/terrain/terrain.vert';
import terrainFrag from '../shaders/terrain/terrain.frag';
import { airlessSkyLight, skyLightUniforms } from './SkyLightTexture';
import iceVert from '../shaders/ice/ice.vert';
import iceFrag from '../shaders/ice/ice.frag';
import glassVert from '../shaders/glass/glass.vert';
import glassFrag from '../shaders/glass/glass.frag';

// Import and re-export block types from shared module for backward compatibility
import { HexBlockType, isSolid, isLiquid } from '../shared/blockTypes';
export { HexBlockType, isSolid, isLiquid };

export enum FaceType {
  TOP = 'top',
  BOTTOM = 'bottom',
  SIDE = 'side'
}

// Drawn block materials (scripts/gen-biome-textures.py): key -> /textures/<file>.png
const BIOME_TEXTURES: [string, string][] = [
  ['forestFloor', 'biomes/forest_floor'], ['forestFloorSide', 'biomes/forest_floor_side'],
  ['dryGrass', 'biomes/dry_grass'], ['dryGrassSide', 'biomes/dry_grass_side'],
  ['seqScrub', 'biomes/seq_scrub'], ['seqScrubSide', 'biomes/seq_scrub_side'],
  ['seqDuff', 'biomes/seq_duff'], ['seqDuffSide', 'biomes/seq_duff_side'],
  ['moonOreIron', 'moon/ore_iron'], ['moonOreAluminum', 'moon/ore_aluminum'],
  ['moonOreCobalt', 'moon/ore_cobalt'], ['moonOreLithium', 'moon/ore_lithium'],
  ['moonOreTitanium', 'moon/ore_titanium'],
  // Industry resources (scripts/gen-biome-textures.py)
  ['clay', 'resources/clay'], ['oilSand', 'resources/oil_sand'], ['oreUranium', 'resources/ore_uranium'],
  ['resinAmber', 'resources/resin'], ['salvageScrap', 'resources/salvage'], ['oreRareEarth', 'resources/ore_rare_earth'], ['fungusSeam', 'resources/fungus'], ['silicaSand', 'resources/silica_sand'], ['crystalVein', 'resources/crystal_vein'], ['cryoIce', 'resources/cryo_ice'],
  // Building materials (scripts/gen-biome-textures.py)
  ['brickBlock', 'building/brick_block'], ['carpet', 'building/carpet'], ['concrete', 'building/concrete'],
  // The ecumenopolis (scripts/gen-city-textures.py)
  ['cityRoad', 'city/road'], ['citySidewalk', 'city/sidewalk'], ['cityCurb', 'city/curb'],
  ['cityPlaza', 'city/plaza'], ['citySlab', 'city/slab'], ['cityFacade', 'city/facade'],
  ['cityGlass', 'city/glass'], ['cityRoof', 'city/roof'], ['cityParapet', 'city/parapet'],
  ['cityNeon', 'city/neon'], ['cityDeck', 'city/deck'], ['cityMetal', 'city/metal'],
  ['cityPark', 'city/park'], ['cityParkSide', 'city/park_side'], ['cityFoundation', 'city/foundation'],
  ['cityLamp', 'city/lamp'], ['cityLampTop', 'city/lamp_top'],
  // The living alien worlds' grounds: top, and side (the planet's rock under a lip)
  ['cinderEmbermoss', 'alien/cinder_embermoss'], ['cinderEmbermossSide', 'alien/cinder_embermoss_side'], ['cinderAsh', 'alien/cinder_ash'], ['cinderAshSide', 'alien/cinder_ash_side'],
  ['cinderSulfur', 'alien/cinder_sulfur'], ['cinderSulfurSide', 'alien/cinder_sulfur_side'],
  ['vesperClay', 'alien/vesper_clay'], ['vesperClaySide', 'alien/vesper_clay_side'], ['vesperDune', 'alien/vesper_dune'], ['vesperDuneSide', 'alien/vesper_dune_side'],
  ['vesperSalt', 'alien/vesper_salt'], ['vesperSaltSide', 'alien/vesper_salt_side'],
  ['halcyonMoss', 'alien/halcyon_moss'], ['halcyonMossSide', 'alien/halcyon_moss_side'], ['halcyonGeode', 'alien/halcyon_geode'], ['halcyonGeodeSide', 'alien/halcyon_geode_side'],
  ['halcyonGlass', 'alien/halcyon_glass'], ['halcyonGlassSide', 'alien/halcyon_glass_side'],
  ['tessalySnowmoss', 'alien/tessaly_snowmoss'], ['tessalySnowmossSide', 'alien/tessaly_snowmoss_side'], ['tessalyFrost', 'alien/tessaly_frost'], ['tessalyFrostSide', 'alien/tessaly_frost_side'],
  ['tessalyGlaze', 'alien/tessaly_glaze'], ['tessalyGlazeSide', 'alien/tessaly_glaze_side'],
  ['umbraMoss', 'alien/umbra_moss'], ['umbraMossSide', 'alien/umbra_moss_side'], ['umbraMycel', 'alien/umbra_mycel'], ['umbraMycelSide', 'alien/umbra_mycel_side'],
  ['umbraShale', 'alien/umbra_shale'], ['umbraShaleSide', 'alien/umbra_shale_side'],
  // The jungle moons: ground tops (+ sides over the moon's soil), bank, soil, rock
  ['verdJungle', 'alien/verdance_jungle'], ['verdJungleSide', 'alien/verdance_jungle_side'],
  ['verdSwamp', 'alien/verdance_swamp'], ['verdSwampSide', 'alien/verdance_swamp_side'],
  ['verdBank', 'alien/verdance_bank'], ['verdSoil', 'alien/verdance_soil'], ['verdRock', 'alien/verdance_rock'],
  ['thalTurf', 'alien/thalassa_turf'], ['thalTurfSide', 'alien/thalassa_turf_side'],
  ['thalMoss', 'alien/thalassa_moss'], ['thalMossSide', 'alien/thalassa_moss_side'],
  ['thalBank', 'alien/thalassa_bank'], ['thalSoil', 'alien/thalassa_soil'], ['thalRock', 'alien/thalassa_rock'],
  ['mireJungle', 'alien/mirewood_jungle'], ['mireJungleSide', 'alien/mirewood_jungle_side'],
  ['mireSwamp', 'alien/mirewood_swamp'], ['mireSwampSide', 'alien/mirewood_swamp_side'],
  ['mireBank', 'alien/mirewood_bank'], ['mireSoil', 'alien/mirewood_soil'], ['mireRock', 'alien/mirewood_rock'],
  // Moons and asteroids (scripts/gen-body-textures.py)
  ['basalt', 'bodies/basalt'], ['basaltSide', 'bodies/basalt_side'],
  ['magma', 'bodies/magma'],
  ['lavaRock', 'bodies/lava_rock'], ['lavaRockSide', 'bodies/lava_rock_side'],
  ['sulfur', 'bodies/sulfur'], ['sulfurSide', 'bodies/sulfur_side'],
  ['frost', 'bodies/frost'], ['frostSide', 'bodies/frost_side'],
  ['blueIce', 'bodies/blue_ice'],
  ['ironNickel', 'bodies/iron_nickel'],
];

// See-through building blocks: drawn with the glass shader (texture alpha
// cut-out, specular), like GLASS - their texture's clear texels are open
const CLEAR_TEXTURES: [string, string][] = [
  ['steelGlass', 'building/steel_glass'], ['steelGirder', 'building/steel_girder'],
];

// Blocks that give off light at night: their emissive masks (the lit
// windows, neon, studs and lamp lenses, baked by gen-city-textures.py)
const GLOW_TEXTURES: Record<string, string> = {
  cityFacade: 'city/facade_glow', cityParapet: 'city/parapet_glow', cityNeon: 'city/neon_glow',
  cityRoad: 'city/road_glow', cityPlaza: 'city/plaza_glow', cityGlass: 'city/glass_glow',
  cityLamp: 'city/lamp_glow', cityLampTop: 'city/lamp_top_glow',
};

// No glow: one black texel, for every material without a mask
let noGlow: THREE.DataTexture | null = null;
function noGlowTexture(): THREE.Texture {
  if (!noGlow) {
    noGlow = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
    noGlow.needsUpdate = true;
  }
  return noGlow;
}

/** The terrain shader's night-light uniforms (LightingConfig); `glow` is the face's emissive mask. */
function nightLightUniforms(glow?: THREE.Texture): Record<string, THREE.IUniform> {
  const c = LIGHTING_CONFIG;
  return {
    glowTexture: { value: glow ?? noGlowTexture() },
    glowNight: { value: glow ? c.GLOW_NIGHT : 0 },
    glowDay: { value: glow ? c.GLOW_DAY : 0 },
    blockLightNight: { value: c.BLOCK_LIGHT_NIGHT },
    blockLightDay: { value: c.BLOCK_LIGHT_DAY },
    blockLightTint: { value: new THREE.Vector3(...c.BLOCK_LIGHT_TINT) },
  };
}

// Materials that light themselves (molten rock): drawn unlit, so they glow
// on the night side and underground
const SELF_LIT = new Set(['magma']);
function selfLitMaterial(texture: THREE.Texture): THREE.Material {
  // The terrain shader writes texels as they are; a basic material converts
  // to the output colour space, so tag (a copy of) the texture sRGB to match
  const tex = texture.clone();
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return new THREE.MeshBasicMaterial({ map: tex });
}

// Magenta/black checker for a texture that failed to load
let missing: THREE.DataTexture | null = null;
function missingTexture(): THREE.Texture {
  if (!missing) {
    const d = new Uint8Array(4 * 4 * 4);
    for (let i = 0; i < 16; i++) {
      const on = ((i % 4) + Math.floor(i / 4)) % 2 === 0;
      d.set(on ? [255, 0, 255, 255] : [0, 0, 0, 255], i * 4);
    }
    missing = new THREE.DataTexture(d, 4, 4);
    missing.needsUpdate = true;
  }
  return missing;
}

/**
 * The water shader's flow tile from the loaded water texture (one source:
 * the PNG): nearest-sampled, repeat-wrapped, never mipmapped. Without a
 * canvas to read the pixels (or before the image loads) it is one body
 * pixel of the texture's mean, which draws the water untextured.
 */
function waterFlowTile(tex: THREE.Texture): { texture: THREE.DataTexture; mean: [number, number, number] } {
  let tile: FlowTile | null = null;
  const img = tex.image as (CanvasImageSource & { width: number; height: number }) | undefined;
  try {
    if (img && img.width > 0 && typeof document !== 'undefined') {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      const g = c.getContext('2d');
      if (g) {
        g.drawImage(img, 0, 0);
        tile = flowTile(g.getImageData(0, 0, img.width, img.height).data, img.width, img.height);
      }
    }
  } catch { tile = null; }
  if (!tile) tile = flowTile([0, 0, 0, 255], 1, 1);
  const t = new THREE.DataTexture(tile.data, tile.width, tile.height, THREE.RGBAFormat);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return { texture: t, mean: tile.mean };
}

// Texture loads shared by every planet's mesh builder (see loadTexture)
const textureCache = new Map<string, Promise<THREE.Texture>>();

export class HexBlockMeshBuilder {
  private textureLoader: THREE.TextureLoader;
  private textures: Map<string, THREE.Texture> = new Map();
  private materials: Map<string, THREE.Material> = new Map();
  private waterShaderMaterial: THREE.ShaderMaterial | null = null;
  private terrainMaterials: THREE.ShaderMaterial[] = [];
  private sunDirection: THREE.Vector3 = new THREE.Vector3(1, 0.5, 0.3).normalize();
  private planetCenter: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  // The planet's sky light (SkyLightTexture): sun and fill by the sun's height
  private skyLight: THREE.Texture | null = null;

  constructor() {
    this.textureLoader = new THREE.TextureLoader();
  }

  // Set sun direction for water and terrain shaders
  public setSunDirection(dir: THREE.Vector3): void {
    this.sunDirection.copy(dir).normalize();
    if (this.waterShaderMaterial) {
      this.waterShaderMaterial.uniforms.sunDirection.value.copy(this.sunDirection);
    }
    for (const mat of this.terrainMaterials) {
      mat.uniforms.sunDirection.value.copy(this.sunDirection);
    }
  }

  /** The planet's sky light table (sun and fill by sun height); terrain lights from it */
  public setSkyLight(tex: THREE.Texture): void {
    this.skyLight = tex;
    const all = new Set<THREE.Material>([...this.terrainMaterials, ...this.materials.values()]);
    if (this.waterShaderMaterial) all.add(this.waterShaderMaterial);
    for (const mat of all) {
      const u = (mat as THREE.ShaderMaterial).uniforms;
      if (u?.skyLight) u.skyLight.value = tex;
    }
  }

  // Set planet center for terrain shader lighting calculations
  public setPlanetCenter(center: THREE.Vector3): void {
    this.planetCenter.copy(center);
    for (const mat of this.terrainMaterials) {
      mat.uniforms.planetCenter.value.copy(this.planetCenter);
    }
  }

  // Update water shader uniforms each frame
  public updateWaterShader(time: number, planetCenter: THREE.Vector3, isUnderwater: boolean = false): void {
    if (this.waterShaderMaterial) {
      this.waterShaderMaterial.uniforms.time.value = time;
      this.waterShaderMaterial.uniforms.planetCenter.value.copy(planetCenter);
      this.waterShaderMaterial.uniforms.isUnderwater.value = isUnderwater ? 1.0 : 0.0;
    }
  }

  // Set water level for terrain shader (radius from planet center)
  public setWaterLevel(waterLevel: number): void {
    for (const mat of this.terrainMaterials) {
      mat.uniforms.waterLevel.value = waterLevel;
    }
  }

  // Update terrain shader underwater state
  public setTerrainUnderwater(isUnderwater: boolean): void {
    for (const mat of this.terrainMaterials) {
      mat.uniforms.isUnderwater.value = isUnderwater ? 1.0 : 0.0;
    }
  }

  public async loadTextures(
    singleTexturePath?: string,
    tileset?: TilesetConfig,
    waterColors?: { color?: string; deepColor?: string }
  ): Promise<void> {
    // Use provided tileset or default to Earth tileset
    const ts = tileset || EARTH_TILESET;
    // Start every texture this planet needs at once (they're cached, so the
    // awaits below then resolve as each arrives instead of one by one)
    const wanted = new Set<string>();
    for (const set of [ts, EARTH_TILESET, SEQUOIA_TILESET, MOON_TILESET]) {
      for (const v of Object.values(set)) if (typeof v === 'string' && v.endsWith('.png')) wanted.add(v);
    }
    if (singleTexturePath) wanted.add(singleTexturePath);
    for (const [, file] of [...BIOME_TEXTURES, ...CLEAR_TEXTURES]) wanted.add(`/textures/${file}.png`);
    await Promise.allSettled([...wanted].map(path => this.loadTexture(path)));
    // Use provided water colors or defaults from PlayerConfig
    const waterColor = waterColors?.color || PlayerConfig.WATER_COLOR;
    const waterDeepColor = waterColors?.deepColor || PlayerConfig.WATER_DEEP_COLOR;

    // LOD materials - use polygonOffset to push LOD behind detailed terrain in depth buffer
    // This prevents LOD from showing through detailed terrain for nearby tiles
    const lodOffsetFactor = 4;
    const lodOffsetUnits = 4;

    // Helper to configure texture for pixel art
    const configureTexture = (tex: THREE.Texture) => {
      tex.magFilter = THREE.NearestFilter;
      tex.minFilter = THREE.NearestFilter;
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
    };

    // Helper to create LOD material (legacy - only used for single-texture planets without terrain shader)
    const createLODMaterial = (texture: THREE.Texture, color?: THREE.Color) => {
      const lodTexture = texture.clone();
      lodTexture.needsUpdate = true;
      return new THREE.MeshLambertMaterial({
        map: lodTexture,
        color: color,
        polygonOffset: true,
        polygonOffsetFactor: lodOffsetFactor,
        polygonOffsetUnits: lodOffsetUnits
      });
    };

    // Store the single texture path for moonRock material creation below
    let moonTexture: THREE.Texture | null = null;
    if (singleTexturePath) {
      // Single texture planet (e.g., moon) - load the native terrain texture
      moonTexture = await this.loadTexture(singleTexturePath);
      configureTexture(moonTexture);
      this.textures.set('primary', moonTexture);
      this.textures.set('moonRock', moonTexture);
    }

    // Load textures from tileset config
    const stoneTexture = await this.loadTexture(ts.stone);
    const dirtTexture = await this.loadTexture(ts.dirt);
    const grassTexture = await this.loadTexture(ts.grass);
    const dirtGrassTexture = await this.loadTexture(ts.dirtGrass);
    const woodTexture = await this.loadTexture(ts.wood);
    const sandTexture = await this.loadTexture(ts.sand);

    // Mineral ore textures from tileset minerals path
    const coalTexture = await this.loadTexture(`${ts.mineralsPath}/rocks_coal.png`);
    const copperTexture = await this.loadTexture(`${ts.mineralsPath}/rocks_copper.png`);
    const ironTexture = await this.loadTexture(`${ts.mineralsPath}/rocks_iron.png`);
    const goldTexture = await this.loadTexture(`${ts.mineralsPath}/rocks_gold.png`);
    const lithiumTexture = await this.loadTexture(`${ts.mineralsPath}/rocks_lythium.png`);
    const aluminumTexture = await this.loadTexture(`${ts.mineralsPath}/rocks_aluminum.png`);
    const cobaltTexture = await this.loadTexture(`${ts.mineralsPath}/rocks_cobalt.png`);

    // Snow biome textures from tileset
    const snowTexture = await this.loadTexture(ts.snow);
    const dirtSnowTexture = await this.loadTexture(ts.dirtSnow);
    const iceTexture = await this.loadTexture(ts.ice);

    // Glass texture from tileset
    const glassTexture = await this.loadTexture(ts.glass);

    [stoneTexture, dirtTexture, grassTexture, dirtGrassTexture, woodTexture, sandTexture,
     coalTexture, copperTexture, ironTexture, goldTexture, lithiumTexture, aluminumTexture, cobaltTexture,
     snowTexture, dirtSnowTexture, iceTexture, glassTexture
    ].forEach(configureTexture);

    this.textures.set('stone', stoneTexture);
    this.textures.set('dirt', dirtTexture);
    this.textures.set('grass', grassTexture);
    this.textures.set('dirtGrass', dirtGrassTexture);
    this.textures.set('wood', woodTexture);
    this.textures.set('sand', sandTexture);
    // Mineral ore textures
    this.textures.set('oreCoal', coalTexture);
    this.textures.set('oreCopper', copperTexture);
    this.textures.set('oreIron', ironTexture);
    this.textures.set('oreGold', goldTexture);
    this.textures.set('oreLithium', lithiumTexture);
    this.textures.set('oreAluminum', aluminumTexture);
    this.textures.set('oreCobalt', cobaltTexture);
    // Snow biome textures
    this.textures.set('snow', snowTexture);
    this.textures.set('dirtSnow', dirtSnowTexture);
    this.textures.set('ice', iceTexture);
    // Glass texture
    this.textures.set('glass', glassTexture);

    // Parse underwater fog color for terrain shader
    const terrainUnderwaterFogColor = new THREE.Color(PlayerConfig.UNDERWATER_FOG_COLOR);

    // Create terrain shader materials for different face types
    const createTerrainMaterial = (texture: THREE.Texture, glow?: THREE.Texture): THREE.ShaderMaterial => {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          ...nightLightUniforms(glow),
          terrainTexture: { value: texture },
          sunDirection: { value: this.sunDirection.clone() },
          planetCenter: { value: this.planetCenter.clone() },
          ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
          directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
          ...skyLightUniforms(this.skyLight ?? airlessSkyLight()),
          // Underwater uniforms
          waterLevel: { value: 0.0 }, // Set by Planet based on sea level
          isUnderwater: { value: 0.0 },
          underwaterFogColor: { value: terrainUnderwaterFogColor },
          underwaterFogNear: { value: PlayerConfig.UNDERWATER_FOG_NEAR },
          underwaterFogFar: { value: PlayerConfig.UNDERWATER_FOG_FAR },
          underwaterDimming: { value: PlayerConfig.UNDERWATER_TERRAIN_DIMMING ?? 0.3 },
          reliefStrength: { value: SURFACE_RELIEF.DEFAULT },
          reliefCavity: { value: SURFACE_RELIEF.CAVITY },
          reliefHexTilt: { value: SURFACE_RELIEF.HEX_TILT },
          reliefHexTone: { value: SURFACE_RELIEF.HEX_TONE },
        },
        vertexShader: terrainVert,
        fragmentShader: terrainFrag,
      });
      this.terrainMaterials.push(mat);
      return mat;
    };

    this.materials.set('top', createTerrainMaterial(grassTexture));
    this.materials.set('side', createTerrainMaterial(dirtTexture));
    this.materials.set('grassSide', createTerrainMaterial(dirtGrassTexture)); // Grass block sides use dirt_grass texture
    this.materials.set('bottom', createTerrainMaterial(stoneTexture));
    this.materials.set('stone', createTerrainMaterial(stoneTexture));
    this.materials.set('wood', createTerrainMaterial(woodTexture));
    this.materials.set('sand', createTerrainMaterial(sandTexture));
    // Mineral ore materials
    this.materials.set('oreCoal', createTerrainMaterial(coalTexture));
    this.materials.set('oreCopper', createTerrainMaterial(copperTexture));
    this.materials.set('oreIron', createTerrainMaterial(ironTexture));
    this.materials.set('oreGold', createTerrainMaterial(goldTexture));
    this.materials.set('oreLithium', createTerrainMaterial(lithiumTexture));
    this.materials.set('oreAluminum', createTerrainMaterial(aluminumTexture));
    this.materials.set('oreCobalt', createTerrainMaterial(cobaltTexture));
    // Snow biome materials - snow and dirt_snow use standard terrain shader
    this.materials.set('snow', createTerrainMaterial(snowTexture));
    this.materials.set('dirtSnow', createTerrainMaterial(dirtSnowTexture)); // Dirt with snow on top
    this.materials.set('snowSide', createTerrainMaterial(dirtSnowTexture)); // Snow block sides use dirt_snow texture

    // Real block IDs: a block looks the same on every planet. The tileset
    // textures loaded above stay for this planet's distant LOD only; the
    // detailed blocks always use their own textures - Earth's set for the
    // Earth blocks, moon.png for moon rock, Sequoia's set for SEQ_* blocks.
    // (On the Moon every block used to render as moon rock, and moon rock
    // placed anywhere else rendered as stone.)
    const loadFixed = async (path: string): Promise<THREE.Texture> => {
      const tex = await this.loadTexture(path);
      configureTexture(tex);
      return tex;
    };
    if (ts !== EARTH_TILESET) {
      const e = EARTH_TILESET;
      this.materials.set('top', createTerrainMaterial(await loadFixed(e.grass)));
      this.materials.set('side', createTerrainMaterial(await loadFixed(e.dirt)));
      this.materials.set('grassSide', createTerrainMaterial(await loadFixed(e.dirtGrass)));
      this.materials.set('bottom', createTerrainMaterial(await loadFixed(e.stone)));
      this.materials.set('stone', createTerrainMaterial(await loadFixed(e.stone)));
      this.materials.set('wood', createTerrainMaterial(await loadFixed(e.wood)));
      this.materials.set('sand', createTerrainMaterial(await loadFixed(e.sand)));
      this.materials.set('snow', createTerrainMaterial(await loadFixed(e.snow)));
      const earthDirtSnow = await loadFixed(e.dirtSnow);
      this.materials.set('dirtSnow', createTerrainMaterial(earthDirtSnow));
      this.materials.set('snowSide', createTerrainMaterial(earthDirtSnow));
    }
    this.materials.set('moonRock', createTerrainMaterial(moonTexture ?? await loadFixed(MOON_TILESET.stone)));
    const q = SEQUOIA_TILESET;
    this.materials.set('seqGrass', createTerrainMaterial(await loadFixed(q.grass)));
    this.materials.set('seqGrassSide', createTerrainMaterial(await loadFixed(q.dirtGrass)));
    this.materials.set('seqDirt', createTerrainMaterial(await loadFixed(q.dirt)));
    this.materials.set('seqSand', createTerrainMaterial(await loadFixed(q.sand)));
    this.materials.set('seqSnow', createTerrainMaterial(await loadFixed(q.snow)));
    this.materials.set('seqSnowSide', createTerrainMaterial(await loadFixed(q.dirtSnow)));
    // Biome surfaces (scripts/gen-biome-textures.py)
    for (const [key, file] of BIOME_TEXTURES) {
      const tex = await loadFixed(`/textures/${file}.png`);
      const glow = GLOW_TEXTURES[key] ? await loadFixed(`/textures/${GLOW_TEXTURES[key]}.png`) : undefined;
      this.materials.set(key, SELF_LIT.has(key) ? selfLitMaterial(tex) : createTerrainMaterial(tex, glow));
    }
    const fixedIce = ts === EARTH_TILESET ? iceTexture : await loadFixed(EARTH_TILESET.ice);
    const fixedGlass = ts === EARTH_TILESET ? glassTexture : await loadFixed(EARTH_TILESET.glass);

    // Ice material - transparent with specular shininess
    const iceMaterial = new THREE.ShaderMaterial({
      uniforms: {
        terrainTexture: { value: fixedIce },
        sunDirection: { value: this.sunDirection.clone() },
        planetCenter: { value: this.planetCenter.clone() },
        ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
        directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
        ...skyLightUniforms(this.skyLight ?? airlessSkyLight()),
        opacity: { value: 0.5 }, // 50% transparent
        specularPower: { value: 64.0 }, // Sharp specular highlight
        specularStrength: { value: 0.6 }, // Medium specular intensity
        // Underwater uniforms
        waterLevel: { value: 0.0 },
        isUnderwater: { value: 0.0 },
        underwaterFogColor: { value: terrainUnderwaterFogColor },
        underwaterFogNear: { value: PlayerConfig.UNDERWATER_FOG_NEAR },
        underwaterFogFar: { value: PlayerConfig.UNDERWATER_FOG_FAR },
        underwaterDimming: { value: PlayerConfig.UNDERWATER_TERRAIN_DIMMING ?? 0.3 },
      },
      vertexShader: iceVert,
      fragmentShader: iceFrag,
      transparent: true,
      depthWrite: true, // Ice should write to depth buffer unlike water
      side: THREE.DoubleSide
    });
    this.terrainMaterials.push(iceMaterial);
    this.materials.set('ice', iceMaterial);

    // Glass material - uses texture alpha for transparency with specular shininess.
    // One factory for every see-through block (glass, steel glass, the girder)
    const createGlassMaterial = (texture: THREE.Texture): THREE.ShaderMaterial => new THREE.ShaderMaterial({
      uniforms: {
        terrainTexture: { value: texture },
        sunDirection: { value: this.sunDirection.clone() },
        planetCenter: { value: this.planetCenter.clone() },
        ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
        directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
        ...skyLightUniforms(this.skyLight ?? airlessSkyLight()),
        specularPower: { value: 128.0 }, // Sharper specular highlight for glass
        specularStrength: { value: 0.8 }, // Stronger specular intensity
        // Underwater uniforms
        waterLevel: { value: 0.0 },
        isUnderwater: { value: 0.0 },
        underwaterFogColor: { value: terrainUnderwaterFogColor },
        underwaterFogNear: { value: PlayerConfig.UNDERWATER_FOG_NEAR },
        underwaterFogFar: { value: PlayerConfig.UNDERWATER_FOG_FAR },
        underwaterDimming: { value: PlayerConfig.UNDERWATER_TERRAIN_DIMMING ?? 0.3 },
      },
      vertexShader: glassVert,
      fragmentShader: glassFrag,
      transparent: true,
      depthWrite: true,
      side: THREE.DoubleSide
    });
    const glassMaterial = createGlassMaterial(fixedGlass);
    this.terrainMaterials.push(glassMaterial);
    this.materials.set('glass', glassMaterial);
    for (const [key, file] of CLEAR_TEXTURES) {
      const mat = createGlassMaterial(await loadFixed(`/textures/${file}.png`));
      this.terrainMaterials.push(mat);
      this.materials.set(key, mat);
    }

    // Sea wall material: the curtain at the edge of the detailed terrain
    // that hides the gap down to the seabed from above. Unlit; under water
    // it takes the scene's underwater fog like everything else, so it melts
    // into the murk instead of standing in the sea as a wall (owner: "some
    // sort of big ocean wall"). Above water the scene has no fog, so it
    // keeps its exact colour there.
    const seaWallColor = new THREE.Color(PlayerConfig.SEA_WALL_COLOR);
    const seaWallMat = new THREE.MeshBasicMaterial({
      color: seaWallColor,
      side: THREE.DoubleSide,
      fog: true,
    });
    this.materials.set('seaWall', seaWallMat);

    // Water material - load water texture from tileset
    const waterTexture = await this.loadTexture(ts.water);
    configureTexture(waterTexture);
    this.textures.set('water', waterTexture);

    // The flow texture's tile: the same PNG, its pixels ranked into tones (src/water/FlowTile.ts)
    const flow = waterFlowTile(waterTexture);

    // Parse hex colors to THREE.Color (using overrides or defaults)
    const waterColorVec = new THREE.Color(waterColor);
    const deepWaterColorVec = new THREE.Color(waterDeepColor);
    const underwaterFogColor = new THREE.Color(waterColor);  // Match water color for fog
    const aboveWaterFogColor = new THREE.Color(waterColor);  // Match water color for fog

    // Create water shader material for close-up rendering
    this.waterShaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        uvTiling: { value: PlayerConfig.WATER_UV_TILING },
        waterColor: { value: waterColorVec },
        deepWaterColor: { value: deepWaterColorVec },
        sunDirection: { value: this.sunDirection.clone() },
        opacity: { value: PlayerConfig.WATER_TRANSPARENCY },
        fresnelPower: { value: PlayerConfig.WATER_FRESNEL_POWER },
        reflectionStrength: { value: PlayerConfig.WATER_REFLECTION_STRENGTH },
        distortionStrength: { value: PlayerConfig.WATER_DISTORTION_STRENGTH },
        specularPower: { value: PlayerConfig.WATER_SPECULAR_POWER },
        specularStrength: { value: PlayerConfig.WATER_SPECULAR_STRENGTH },
        waveAmplitude: { value: PlayerConfig.WATER_WAVE_AMPLITUDE },
        waveFrequency: { value: PlayerConfig.WATER_WAVE_FREQUENCY },
        underwaterFogColor: { value: underwaterFogColor },
        underwaterFogNear: { value: PlayerConfig.UNDERWATER_FOG_NEAR },
        underwaterFogFar: { value: PlayerConfig.UNDERWATER_FOG_FAR },
        aboveWaterFogColor: { value: aboveWaterFogColor },
        aboveWaterFogNear: { value: PlayerConfig.ABOVE_WATER_FOG_NEAR },
        aboveWaterFogFar: { value: PlayerConfig.ABOVE_WATER_FOG_FAR },
        isUnderwater: { value: 0.0 },
        planetCenter: { value: new THREE.Vector3(0, 0, 0) },
        ...skyLightUniforms(this.skyLight ?? airlessSkyLight()),
        textureStrength: { value: PlayerConfig.WATER_TEXTURE_STRENGTH },
        // The flow texture (openspec water-flow 9; WaterConfig TEX_* / FOAM_*)
        waterFlowTile: { value: flow.texture },
        waterTileMean: { value: new THREE.Vector3(...flow.mean) },
        texTileM: { value: WaterConfig.TEX_TILE_M },
        texPanK: { value: WaterConfig.TEX_PAN_K },
        texFallPan: { value: WaterConfig.TEX_FALL_PAN },
        texFade: { value: new THREE.Vector2(WaterConfig.TEX_FADE_NEAR, WaterConfig.TEX_FADE_FAR) },
        texTexelFade: { value: new THREE.Vector2(WaterConfig.TEX_TEXEL_FADE_START, WaterConfig.TEX_TEXEL_FADE_END) },
        texSize: { value: flow.texture.image.width },
        rippleTone: { value: new THREE.Vector2(WaterConfig.RIPPLE_SKY_MIX, WaterConfig.RIPPLE_LIFT) },
        glintFoam: { value: WaterConfig.GLINT_FOAM },
        foamColor: { value: new THREE.Vector3(...WaterConfig.FOAM_COLOR) },
        fallFoamColor: { value: new THREE.Vector3(...WaterConfig.FALL_FOAM_COLOR) },
        fallFroth: { value: new THREE.Vector4(WaterConfig.FALL_FROTH_BASE, WaterConfig.FALL_FROTH_RIPPLE, WaterConfig.FALL_FROTH_GLINT, WaterConfig.FALL_FROTH_SCALE) },
        frothPixel: { value: new THREE.Vector3(WaterConfig.FROTH_PIXELS_PER_M, WaterConfig.FROTH_ROW_K, WaterConfig.FROTH_FALL_SPEED) },
        frothJitter: { value: WaterConfig.FROTH_JITTER },
        capFoam: { value: new THREE.Vector3(WaterConfig.CAP_FOAM_THRESHOLD, WaterConfig.CAP_FOAM_SPEED_K, WaterConfig.CAP_FOAM_STRENGTH) },
        foamMax: { value: WaterConfig.FOAM_MAX },
        fallAlpha: { value: WaterConfig.FALL_ALPHA },
        causticStrength: { value: PlayerConfig.WATER_CAUSTIC_STRENGTH },
        foamStrength: { value: PlayerConfig.WATER_FOAM_STRENGTH },
        // Depth texture uniforms (set by GameEngine)
        depthTexture: { value: null },
        cameraNear: { value: 0.1 },
        cameraFar: { value: 2000 },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        useDepthFog: { value: 1.0 }, // 1.0 = use depth-based fog, 0.0 = disabled (mobile)
      },
      vertexShader: waterVert,
      fragmentShader: waterFrag,
      transparent: true,
      side: THREE.DoubleSide,  // Render both sides so water surface/walls visible from underwater
      depthWrite: false
    });

    this.materials.set('water', this.waterShaderMaterial);

    // LOD materials - use terrain shader for consistency with detailed terrain
    // This gives LOD the same planet-aware lighting and underwater effects
    const createTerrainLODMaterial = (texture: THREE.Texture): THREE.ShaderMaterial => {
      const lodTexture = texture.clone();
      lodTexture.needsUpdate = true;
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          ...nightLightUniforms(),
          terrainTexture: { value: lodTexture },
          sunDirection: { value: this.sunDirection.clone() },
          planetCenter: { value: this.planetCenter.clone() },
          ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
          directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
          ...skyLightUniforms(this.skyLight ?? airlessSkyLight()),
          // Underwater uniforms
          waterLevel: { value: 0.0 }, // Set by Planet based on sea level
          isUnderwater: { value: 0.0 },
          underwaterFogColor: { value: terrainUnderwaterFogColor },
          underwaterFogNear: { value: PlayerConfig.UNDERWATER_FOG_NEAR },
          underwaterFogFar: { value: PlayerConfig.UNDERWATER_FOG_FAR },
          underwaterDimming: { value: PlayerConfig.UNDERWATER_TERRAIN_DIMMING ?? 0.3 },
          reliefStrength: { value: SURFACE_RELIEF.DEFAULT },
          reliefCavity: { value: SURFACE_RELIEF.CAVITY },
          reliefHexTilt: { value: SURFACE_RELIEF.HEX_TILT },
          reliefHexTone: { value: SURFACE_RELIEF.HEX_TONE },
        },
        vertexShader: terrainVert,
        fragmentShader: terrainFrag,
      });
      // Apply polygon offset to push LOD behind detailed terrain
      mat.polygonOffset = true;
      mat.polygonOffsetFactor = lodOffsetFactor;
      mat.polygonOffsetUnits = lodOffsetUnits;
      this.terrainMaterials.push(mat);
      return mat;
    };

    this.materials.set('topLOD', createTerrainLODMaterial(grassTexture));
    this.materials.set('sideLOD', createTerrainLODMaterial(dirtTexture));
    this.materials.set('stoneLOD', createTerrainLODMaterial(stoneTexture));
    this.materials.set('sandLOD', createTerrainLODMaterial(sandTexture));
    this.materials.set('woodLOD', createTerrainLODMaterial(woodTexture));
    // Snow/Ice/Glass LOD materials - opaque for distant viewing
    this.materials.set('snowLOD', createTerrainLODMaterial(snowTexture));
    this.materials.set('iceLOD', createTerrainLODMaterial(iceTexture)); // Opaque ice for LOD (no transparency)
    this.materials.set('glassLOD', createTerrainLODMaterial(glassTexture)); // Opaque glass for LOD
    // Moon rock LOD (uses moon texture if loaded, else stone)
    if (moonTexture) {
      this.materials.set('moonRockLOD', createTerrainLODMaterial(moonTexture));
    } else {
      this.materials.set('moonRockLOD', createTerrainLODMaterial(stoneTexture));
    }
    // Water LOD uses opaque material - no transparency for distant water
    const waterLODMat = createLODMaterial(waterTexture, new THREE.Color(waterColor));
    waterLODMat.side = THREE.DoubleSide;
    waterLODMat.transparent = false;
    this.materials.set('waterLOD', waterLODMat);
    this.applyRelief();
  }

  private loadTexture(path: string): Promise<THREE.Texture> {
    // Prepend base URL for production builds (e.g., GitHub Pages subdirectory)
    const fullPath = getAssetPath(path);
    // One load per texture for the whole session, shared by every planet
    // (each planet's block set used to re-load ~20 textures one after
    // another, which held a first teleport on "Loading planet..." for
    // half a minute)
    const cached = textureCache.get(fullPath);
    if (cached) return cached;
    const promise = new Promise<THREE.Texture>((resolve) => {
      this.textureLoader.load(
        fullPath,
        resolve,
        undefined,
        () => {
          // A missing texture must never hang loading (it used to reject the
          // planet's whole initialization, leaving the loading bar stuck):
          // draw a placeholder, say which file, and carry on
          console.error(`[HexBlock] Failed to load texture: ${fullPath} (original: ${path})`);
          loadingManager.reportProblem(`Missing texture: ${path}`);
          resolve(missingTexture());
        }
      );
    });
    textureCache.set(fullPath, promise);
    return promise;
  }

  /** Surface relief for a terrain material by its key (LightingConfig SURFACE_RELIEF) */
  private static reliefFor(key: string): number {
    if (SURFACE_RELIEF.SOFT_KEYS.test(key)) return SURFACE_RELIEF.SOFT;
    if (SURFACE_RELIEF.ROCK_KEYS.test(key)) return SURFACE_RELIEF.ROCK;
    return SURFACE_RELIEF.DEFAULT;
  }

  /** Give every terrain material its relief by the key it is stored under */
  private applyRelief(): void {
    for (const [key, mat] of this.materials) {
      const u = (mat as THREE.ShaderMaterial).uniforms;
      if (u?.reliefStrength) u.reliefStrength.value = HexBlockMeshBuilder.reliefFor(key.replace(/LOD$/, ''));
    }
  }

  public getMaterial(faceType: string): THREE.Material {
    return this.materials.get(faceType) || new THREE.MeshLambertMaterial({ color: 0x888888 });
  }

  public getTopMaterial(): THREE.Material {
    return this.materials.get('top')!;
  }

  public getSideMaterial(): THREE.Material {
    return this.materials.get('side')!;
  }

  public getGrassSideMaterial(): THREE.Material {
    return this.materials.get('grassSide') ?? this.materials.get('top')!;
  }

  public getBottomMaterial(): THREE.Material {
    return this.materials.get('bottom')!;
  }

  public getStoneMaterial(): THREE.Material {
    return this.materials.get('stone')!;
  }

  public getWoodMaterial(): THREE.Material {
    return this.materials.get('wood')!;
  }

  public getSandMaterial(): THREE.Material {
    return this.materials.get('sand')!;
  }

  public getSnowMaterial(): THREE.Material {
    return this.materials.get('snow')!;
  }

  public getDirtSnowMaterial(): THREE.Material {
    return this.materials.get('dirtSnow')!;
  }

  public getSnowSideMaterial(): THREE.Material {
    return this.materials.get('snowSide') ?? this.materials.get('snow')!;
  }

  public getIceMaterial(): THREE.Material {
    return this.materials.get('ice')!;
  }

  public getGlassMaterial(): THREE.Material {
    return this.materials.get('glass')!;
  }

  public getMoonRockMaterial(): THREE.Material {
    return this.materials.get('moonRock')!;
  }

  public getSeaWallMaterial(): THREE.Material | null {
    return this.materials.get('seaWall') ?? null;
  }

  public getWaterMaterial(): THREE.Material {
    return this.materials.get('water')!;
  }

  public getWaterShaderMaterial(): THREE.ShaderMaterial | null {
    return this.waterShaderMaterial;
  }

  public getWaterLODMaterial(): THREE.Material {
    return this.materials.get('waterLOD')!;
  }

  public getTopLODMaterial(): THREE.Material {
    return this.materials.get('topLOD')!;
  }

  public getSideLODMaterial(): THREE.Material {
    return this.materials.get('sideLOD')!;
  }

  public getStoneLODMaterial(): THREE.Material {
    return this.materials.get('stoneLOD')!;
  }

  public getSandLODMaterial(): THREE.Material {
    return this.materials.get('sandLOD')!;
  }

  public getWoodLODMaterial(): THREE.Material {
    return this.materials.get('woodLOD')!;
  }

  public getSnowLODMaterial(): THREE.Material {
    return this.materials.get('snowLOD')!;
  }

  public getIceLODMaterial(): THREE.Material {
    return this.materials.get('iceLOD')!;
  }

  public getGlassLODMaterial(): THREE.Material {
    return this.materials.get('glassLOD')!;
  }

  public getMoonRockLODMaterial(): THREE.Material {
    return this.materials.get('moonRockLOD')!;
  }

  // Create separate geometries for each face type
  public createSeparateGeometries(
    tile: HexTile,
    innerRadius: number,
    outerRadius: number,
    planetCenter: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
    isTopExposed: boolean = true,
    isBottomExposed: boolean = true,
    areSidesExposed: boolean = true
  ): { top: THREE.BufferGeometry | null; bottom: THREE.BufferGeometry | null; sides: THREE.BufferGeometry | null } {
    const numSides = tile.vertices.length;
    const radialDir = tile.center.clone().sub(planetCenter).normalize();

    // Scale vertices to inner and outer radii
    const innerVerts: THREE.Vector3[] = [];
    const outerVerts: THREE.Vector3[] = [];

    for (const v of tile.vertices) {
      const dir = v.clone().sub(planetCenter).normalize();
      innerVerts.push(dir.clone().multiplyScalar(innerRadius));
      outerVerts.push(dir.clone().multiplyScalar(outerRadius));
    }

    const innerCenter = radialDir.clone().multiplyScalar(innerRadius);
    const outerCenter = radialDir.clone().multiplyScalar(outerRadius);

    // Create a local tangent space for the hex face
    const localUp = radialDir.clone();
    let localRight = new THREE.Vector3(1, 0, 0);
    if (Math.abs(localUp.dot(localRight)) > 0.9) {
      localRight = new THREE.Vector3(0, 0, 1);
    }
    const localForward = new THREE.Vector3().crossVectors(localUp, localRight).normalize();
    localRight = new THREE.Vector3().crossVectors(localForward, localUp).normalize();

    let topGeom: THREE.BufferGeometry | null = null;
    let bottomGeom: THREE.BufferGeometry | null = null;
    let sidesGeom: THREE.BufferGeometry | null = null;

    // Pre-compute regular polygon UVs (same for all hexagons/pentagons regardless of 3D distortion)
    const uvRadius = 0.5;
    const tileUVs: { u: number; v: number }[] = [];
    for (let i = 0; i < numSides; i++) {
      const angle = (i / numSides) * Math.PI * 2 - Math.PI / 2; // Start from top
      tileUVs.push({
        u: 0.5 + Math.cos(angle) * uvRadius,
        v: 0.5 + Math.sin(angle) * uvRadius
      });
    }

    // Top face (outer, facing away from planet) - uses grass texture
    if (isTopExposed) {
      const positions: number[] = [];
      const normals: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];

      const topNormal = radialDir.clone();

      positions.push(outerCenter.x, outerCenter.y, outerCenter.z);
      normals.push(topNormal.x, topNormal.y, topNormal.z);
      uvs.push(0.5, 0.5); // Center at (0.5, 0.5)

      for (let i = 0; i < numSides; i++) {
        const vert = outerVerts[i];
        positions.push(vert.x, vert.y, vert.z);
        normals.push(topNormal.x, topNormal.y, topNormal.z);
        uvs.push(tileUVs[i].u, tileUVs[i].v);
      }

      for (let i = 0; i < numSides; i++) {
        const next = (i + 1) % numSides;
        indices.push(0, 1 + i, 1 + next);
      }

      topGeom = new THREE.BufferGeometry();
      topGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      topGeom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      topGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      topGeom.setIndex(indices);
    }

    // Bottom face (inner, facing toward planet) - uses stone texture
    if (isBottomExposed) {
      const positions: number[] = [];
      const normals: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];

      const bottomNormal = radialDir.clone().negate();

      positions.push(innerCenter.x, innerCenter.y, innerCenter.z);
      normals.push(bottomNormal.x, bottomNormal.y, bottomNormal.z);
      uvs.push(0.5, 0.5); // Center at (0.5, 0.5)

      for (let i = 0; i < numSides; i++) {
        const vert = innerVerts[i];
        positions.push(vert.x, vert.y, vert.z);
        normals.push(bottomNormal.x, bottomNormal.y, bottomNormal.z);
        uvs.push(tileUVs[i].u, tileUVs[i].v); // Reuse same UVs
      }

      for (let i = 0; i < numSides; i++) {
        const next = (i + 1) % numSides;
        indices.push(0, 1 + next, 1 + i);
      }

      bottomGeom = new THREE.BufferGeometry();
      bottomGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      bottomGeom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      bottomGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      bottomGeom.setIndex(indices);
    }

    // Side faces - uses dirt texture with proper local UVs
    if (areSidesExposed) {
      const positions: number[] = [];
      const normals: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];

      let vertexIndex = 0;

      for (let i = 0; i < numSides; i++) {
        const next = (i + 1) % numSides;

        const outerV1 = outerVerts[i];
        const outerV2 = outerVerts[next];
        const innerV1 = innerVerts[i];
        const innerV2 = innerVerts[next];

        // Calculate side normal using cross product of quad edges
        // Edge1: horizontal edge along the bottom of the quad
        // Edge2: vertical edge going up from inner to outer
        const edge1 = innerV2.clone().sub(innerV1);
        const edge2 = outerV1.clone().sub(innerV1);
        const sideNormal = edge1.clone().cross(edge2).normalize();

        // Four vertices for this side
        positions.push(
          innerV1.x, innerV1.y, innerV1.z,
          innerV2.x, innerV2.y, innerV2.z,
          outerV2.x, outerV2.y, outerV2.z,
          outerV1.x, outerV1.y, outerV1.z
        );

        for (let j = 0; j < 4; j++) {
          normals.push(sideNormal.x, sideNormal.y, sideNormal.z);
        }

        // Local UVs for side faces - V goes from 0 to 0.5 (half height total)
        // U goes from 0 to 1 for the full edge width
        uvs.push(
          0, 0,       // inner1 (bottom-left)
          1, 0,       // inner2 (bottom-right)
          1, 1,     // outer2 (top-right)
          0, 1      // outer1 (top-left)
        );

        const baseIdx = vertexIndex;
        indices.push(
          baseIdx, baseIdx + 1, baseIdx + 2,
          baseIdx, baseIdx + 2, baseIdx + 3
        );

        vertexIndex += 4;
      }

      sidesGeom = new THREE.BufferGeometry();
      sidesGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      sidesGeom.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      sidesGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      sidesGeom.setIndex(indices);
    }

    return { top: topGeom, bottom: bottomGeom, sides: sidesGeom };
  }

  // Legacy method for backward compatibility
  public createHexPrismGeometry(
    tile: HexTile,
    innerRadius: number,
    outerRadius: number,
    planetCenter: THREE.Vector3 = new THREE.Vector3(0, 0, 0),
    isTopExposed: boolean = true,
    isBottomExposed: boolean = true,
    areSidesExposed: boolean = true
  ): { geometry: THREE.BufferGeometry; faceTypes: FaceType[] } {
    const { top, bottom, sides } = this.createSeparateGeometries(
      tile, innerRadius, outerRadius, planetCenter,
      isTopExposed, isBottomExposed, areSidesExposed
    );

    // Merge all geometries for legacy support
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const faceTypes: FaceType[] = [];
    let vertexOffset = 0;

    const mergeGeom = (geom: THREE.BufferGeometry | null, faceType: FaceType) => {
      if (!geom) return;
      const pos = geom.getAttribute('position');
      const norm = geom.getAttribute('normal');
      const uv = geom.getAttribute('uv');
      const idx = geom.getIndex();
      if (!pos || !norm || !uv || !idx) return;

      for (let i = 0; i < pos.count; i++) {
        positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
        normals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
        uvs.push(uv.getX(i), uv.getY(i));
      }

      for (let i = 0; i < idx.count; i += 3) {
        indices.push(idx.getX(i) + vertexOffset, idx.getX(i + 1) + vertexOffset, idx.getX(i + 2) + vertexOffset);
        faceTypes.push(faceType);
      }

      vertexOffset += pos.count;
      geom.dispose();
    };

    mergeGeom(top, FaceType.TOP);
    mergeGeom(bottom, FaceType.BOTTOM);
    mergeGeom(sides, FaceType.SIDE);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);

    return { geometry, faceTypes };
  }

  // Delegate to shared functions for backward compatibility
  public isSolid(blockType: HexBlockType): boolean {
    return isSolid(blockType);
  }

  public isLiquid(blockType: HexBlockType): boolean {
    return isLiquid(blockType);
  }
}
