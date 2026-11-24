import * as THREE from 'three';
import atmosphereVert from '../shaders/atmosphere/atmosphere.vert';
import atmosphereFrag from '../shaders/atmosphere/atmosphere.frag';
import { PlayerConfig } from '../config/PlayerConfig';
import { SkyParams } from '../shared/skyLight';
import { SKY_LOOK, SPACE_HAZE } from '../config/LightingConfig';

export interface AtmosphereConfig {
  planetRadius: number;     // Actual planet surface radius
  groundRadius: number;     // Sea level: where people stand, and what shades the air from the sun
  sunDirection: THREE.Vector3;
  tint?: string;            // Optional color tint (hex string, e.g., '#ffaa88')
}

/**
 * The numbers the sky shader runs on, for a planet - the one source the
 * shader's uniforms and the terrain's sky light (shared/skyLight) both read.
 */
export function skyParamsFor(planetRadius: number, groundRadius: number, tint?: string): SkyParams {
  const c = new THREE.Color(tint || '#ffffff');
  return {
    // Effective surface radius accounts for terrain variation (blocks go below planetRadius)
    planetRadius: planetRadius - PlayerConfig.ATMOSPHERE_SURFACE_OFFSET,
    groundRadius,
    atmosphereRadius: planetRadius * PlayerConfig.ATMOSPHERE_RADIUS_MULT,
    rayleighScale: PlayerConfig.ATMOSPHERE_RAYLEIGH_SCALE,
    mieScale: PlayerConfig.ATMOSPHERE_MIE_SCALE,
    mieG: PlayerConfig.ATMOSPHERE_MIE_G,
    sunIntensity: PlayerConfig.ATMOSPHERE_SUN_INTENSITY,
    samples: PlayerConfig.ATMOSPHERE_SAMPLES,
    lightSamples: PlayerConfig.ATMOSPHERE_LIGHT_SAMPLES,
    tint: [c.r, c.g, c.b],
    twilightFrom: SKY_LOOK.TWILIGHT_FROM,
    penumbraWidth: SKY_LOOK.PENUMBRA_WIDTH,
    duskFrom: SKY_LOOK.DUSK_FROM,
    duskTo: SKY_LOOK.DUSK_TO,
    duskTint: [...SKY_LOOK.DUSK_TINT],
    duskStrength: SKY_LOOK.DUSK_STRENGTH,
    horizonGlow: [...SKY_LOOK.HORIZON_GLOW],
    horizonPower: SKY_LOOK.HORIZON_POWER,
  };
}

// Create atmosphere shader - GPU Gems 2 accurate atmospheric scattering
function createAtmosphereShaderMaterial(config: AtmosphereConfig): THREE.ShaderMaterial {
  const sky = skyParamsFor(config.planetRadius, config.groundRadius, config.tint);
  const atmosphereRadius = sky.atmosphereRadius;
  const effectiveSurfaceRadius = sky.planetRadius;
  const tintColor = new THREE.Color(...sky.tint);

  return new THREE.ShaderMaterial({
    uniforms: {
      planetCenter: { value: new THREE.Vector3(0, 0, 0) },
      planetRadius: { value: effectiveSurfaceRadius },  // Use effective surface for ray termination
      // The ground the sun sets behind: air above it is in shadow once the
      // sun is below its horizon (the effective radius is far smaller, and
      // kept the sky lit all night)
      shadowRadius: { value: sky.groundRadius },
      atmosphereRadius: { value: atmosphereRadius },
      sunDirection: { value: config.sunDirection.clone().normalize() },
      viewerPosition: { value: new THREE.Vector3() },
      rayleighScale: { value: PlayerConfig.ATMOSPHERE_RAYLEIGH_SCALE },
      mieScale: { value: PlayerConfig.ATMOSPHERE_MIE_SCALE },
      mieG: { value: PlayerConfig.ATMOSPHERE_MIE_G },
      sunIntensity: { value: PlayerConfig.ATMOSPHERE_SUN_INTENSITY },
      numSamples: { value: PlayerConfig.ATMOSPHERE_SAMPLES },
      numLightSamples: { value: PlayerConfig.ATMOSPHERE_LIGHT_SAMPLES },
      atmosphereTint: { value: tintColor },
      // The sunset (SKY_LOOK), the same numbers the ground's fill is worked out with
      twilightFrom: { value: sky.twilightFrom },
      penumbraWidth: { value: sky.penumbraWidth },
      duskFrom: { value: sky.duskFrom },
      duskTo: { value: sky.duskTo },
      duskTint: { value: new THREE.Vector3(...sky.duskTint) },
      duskStrength: { value: sky.duskStrength },
      horizonGlow: { value: new THREE.Vector3(...sky.horizonGlow) },
      horizonPower: { value: sky.horizonPower },
      // Seen from space: the gas giants' haze (LightingConfig SPACE_HAZE)
      spaceFadeFrom: { value: SPACE_HAZE.FADE_FROM },
      spaceFadeTo: { value: SPACE_HAZE.FADE_TO },
      spaceScaleHeight: { value: SPACE_HAZE.SCALE_HEIGHT },
      spaceDensity: { value: SPACE_HAZE.DENSITY },
      spaceStrength: { value: SPACE_HAZE.STRENGTH },
      spaceColour: { value: new THREE.Vector3(...SPACE_HAZE.COLOUR) },
      spaceTerminatorTint: { value: new THREE.Vector3(...SPACE_HAZE.TERMINATOR_TINT) },
      spaceSamples: { value: SPACE_HAZE.SAMPLES },
    },
    vertexShader: atmosphereVert,
    fragmentShader: atmosphereFrag,
    transparent: true,
    side: THREE.BackSide, // Render inside of sphere so it's visible from within
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}

export class Atmosphere {
  private mesh: THREE.Mesh;
  private material: THREE.ShaderMaterial;

  constructor(config: AtmosphereConfig) {
    // Create sphere geometry at atmosphere radius
    const atmosphereRadius = config.planetRadius * PlayerConfig.ATMOSPHERE_RADIUS_MULT;
    const geometry = new THREE.SphereGeometry(atmosphereRadius, 64, 48);
    this.material = createAtmosphereShaderMaterial(config);
    this.mesh = new THREE.Mesh(geometry, this.material);
  }

  public getMesh(): THREE.Mesh {
    return this.mesh;
  }

  public setPosition(position: THREE.Vector3): void {
    this.mesh.position.copy(position);
    this.material.uniforms.planetCenter.value.copy(position);
  }

  public updateCameraPosition(cameraPosition: THREE.Vector3): void {
    this.material.uniforms.viewerPosition.value.copy(cameraPosition);
  }

  public setSunDirection(sunDirection: THREE.Vector3): void {
    this.material.uniforms.sunDirection.value.copy(sunDirection).normalize();
  }

  public setVisible(visible: boolean): void {
    this.mesh.visible = visible;
  }

  public isVisible(): boolean {
    return this.mesh.visible;
  }
}

// Factory function to create atmosphere for Earth-like planet
export function createEarthAtmosphere(planetRadius: number, groundRadius: number, sunDirection: THREE.Vector3): Atmosphere {
  return new Atmosphere({
    planetRadius: planetRadius,
    groundRadius,
    sunDirection: sunDirection,
  });
}

// Factory function to create atmosphere with optional tint
export function createAtmosphere(planetRadius: number, groundRadius: number, sunDirection: THREE.Vector3, tint?: string): Atmosphere {
  return new Atmosphere({
    planetRadius: planetRadius,
    groundRadius,
    sunDirection: sunDirection,
    tint: tint,
  });
}
