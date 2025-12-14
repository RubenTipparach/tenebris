import * as THREE from 'three';
import { HexTile } from './GoldbergPolyhedron';
import { PlayerConfig } from '../config/PlayerConfig';
import { TilesetConfig, EARTH_TILESET } from '../config/SolarSystemConfig';
import { getAssetPath } from '../utils/assetPath';
import waterVert from '../shaders/water/water.vert';
import waterFrag from '../shaders/water/water.frag';
import terrainVert from '../shaders/terrain/terrain.vert';
import terrainFrag from '../shaders/terrain/terrain.frag';
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

export class HexBlockMeshBuilder {
  private textureLoader: THREE.TextureLoader;
  private textures: Map<string, THREE.Texture> = new Map();
  private materials: Map<string, THREE.Material> = new Map();
  private waterShaderMaterial: THREE.ShaderMaterial | null = null;
  private terrainMaterials: THREE.ShaderMaterial[] = [];
  private sunDirection: THREE.Vector3 = new THREE.Vector3(1, 0.5, 0.3).normalize();
  private planetCenter: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

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

  public async loadTextures(singleTexturePath?: string, tileset?: TilesetConfig): Promise<void> {
    // Use provided tileset or default to Earth tileset
    const ts = tileset || EARTH_TILESET;

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
    const createTerrainMaterial = (texture: THREE.Texture): THREE.ShaderMaterial => {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          terrainTexture: { value: texture },
          sunDirection: { value: this.sunDirection.clone() },
          planetCenter: { value: this.planetCenter.clone() },
          ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
          directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
          // Underwater uniforms
          waterLevel: { value: 0.0 }, // Set by Planet based on sea level
          isUnderwater: { value: 0.0 },
          underwaterFogColor: { value: terrainUnderwaterFogColor },
          underwaterFogNear: { value: PlayerConfig.UNDERWATER_FOG_NEAR },
          underwaterFogFar: { value: PlayerConfig.UNDERWATER_FOG_FAR },
          underwaterDimming: { value: PlayerConfig.UNDERWATER_TERRAIN_DIMMING ?? 0.3 },
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
    // Moon rock material (uses moon texture if loaded, else stone)
    if (moonTexture) {
      this.materials.set('moonRock', createTerrainMaterial(moonTexture));
    } else {
      this.materials.set('moonRock', createTerrainMaterial(stoneTexture)); // Fallback
    }
    // Snow biome materials - snow and dirt_snow use standard terrain shader
    this.materials.set('snow', createTerrainMaterial(snowTexture));
    this.materials.set('dirtSnow', createTerrainMaterial(dirtSnowTexture)); // Dirt with snow on top
    this.materials.set('snowSide', createTerrainMaterial(dirtSnowTexture)); // Snow block sides use dirt_snow texture

    // Ice material - transparent with specular shininess
    const iceMaterial = new THREE.ShaderMaterial({
      uniforms: {
        terrainTexture: { value: iceTexture },
        sunDirection: { value: this.sunDirection.clone() },
        planetCenter: { value: this.planetCenter.clone() },
        ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
        directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
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

    // Glass material - uses texture alpha for transparency with specular shininess
    const glassMaterial = new THREE.ShaderMaterial({
      uniforms: {
        terrainTexture: { value: glassTexture },
        sunDirection: { value: this.sunDirection.clone() },
        planetCenter: { value: this.planetCenter.clone() },
        ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
        directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
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
    this.terrainMaterials.push(glassMaterial);
    this.materials.set('glass', glassMaterial);

    // Sea wall material - unlit, no fog so it stays exact color
    const seaWallColor = new THREE.Color(PlayerConfig.SEA_WALL_COLOR);
    const seaWallMat = new THREE.MeshBasicMaterial({
      color: seaWallColor,
      side: THREE.DoubleSide,
      fog: false  // Not affected by scene fog - stays exact color
    });
    this.materials.set('seaWall', seaWallMat);

    // Water material - load water texture from tileset
    const waterTexture = await this.loadTexture(ts.water);
    configureTexture(waterTexture);
    this.textures.set('water', waterTexture);

    // Parse hex colors to THREE.Color
    const waterColor = new THREE.Color(PlayerConfig.WATER_COLOR);
    const deepWaterColor = new THREE.Color(PlayerConfig.WATER_DEEP_COLOR);
    const underwaterFogColor = new THREE.Color(PlayerConfig.UNDERWATER_FOG_COLOR);
    const aboveWaterFogColor = new THREE.Color(PlayerConfig.ABOVE_WATER_FOG_COLOR);

    // Create water shader material for close-up rendering
    this.waterShaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0.0 },
        waterTexture: { value: waterTexture },
        uvTiling: { value: PlayerConfig.WATER_UV_TILING },
        waterColor: { value: waterColor },
        deepWaterColor: { value: deepWaterColor },
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
        textureStrength: { value: PlayerConfig.WATER_TEXTURE_STRENGTH },
        scrollSpeed: { value: PlayerConfig.WATER_SCROLL_SPEED },
        causticStrength: { value: PlayerConfig.WATER_CAUSTIC_STRENGTH },
        foamStrength: { value: PlayerConfig.WATER_FOAM_STRENGTH },
        // Depth texture uniforms (set by GameEngine)
        depthTexture: { value: null },
        cameraNear: { value: 0.1 },
        cameraFar: { value: 2000 },
        resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        useDepthFog: { value: 1.0 } // 1.0 = use depth-based fog, 0.0 = disabled (mobile)
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
          terrainTexture: { value: lodTexture },
          sunDirection: { value: this.sunDirection.clone() },
          planetCenter: { value: this.planetCenter.clone() },
          ambientIntensity: { value: PlayerConfig.AMBIENT_LIGHT_INTENSITY },
          directionalIntensity: { value: PlayerConfig.DIRECTIONAL_LIGHT_INTENSITY },
          // Underwater uniforms
          waterLevel: { value: 0.0 }, // Set by Planet based on sea level
          isUnderwater: { value: 0.0 },
          underwaterFogColor: { value: terrainUnderwaterFogColor },
          underwaterFogNear: { value: PlayerConfig.UNDERWATER_FOG_NEAR },
          underwaterFogFar: { value: PlayerConfig.UNDERWATER_FOG_FAR },
          underwaterDimming: { value: PlayerConfig.UNDERWATER_TERRAIN_DIMMING ?? 0.3 },
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
    const waterLODMat = createLODMaterial(waterTexture, waterColor);
    waterLODMat.side = THREE.DoubleSide;
    waterLODMat.transparent = false;
    this.materials.set('waterLOD', waterLODMat);
  }

  private loadTexture(path: string): Promise<THREE.Texture> {
    // Prepend base URL for production builds (e.g., GitHub Pages subdirectory)
    const fullPath = getAssetPath(path);
    return new Promise((resolve, reject) => {
      this.textureLoader.load(fullPath, resolve, undefined, reject);
    });
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
