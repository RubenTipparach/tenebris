import * as THREE from 'three';
import atmosphereVert from '../shaders/atmosphere/atmosphere.vert';
import atmosphereFrag from '../shaders/atmosphere/atmosphere.frag';
import { PlayerConfig } from '../config/PlayerConfig';

export interface AtmosphereConfig {
  planetRadius: number;     // Actual planet surface radius
  sunDirection: THREE.Vector3;
}

// Create atmosphere shader - GPU Gems 2 accurate atmospheric scattering
function createAtmosphereShaderMaterial(config: AtmosphereConfig): THREE.ShaderMaterial {
  const atmosphereRadius = config.planetRadius * PlayerConfig.ATMOSPHERE_RADIUS_MULT;
  // Effective surface radius accounts for terrain variation (blocks go below planetRadius)
  const effectiveSurfaceRadius = config.planetRadius - PlayerConfig.ATMOSPHERE_SURFACE_OFFSET;

  return new THREE.ShaderMaterial({
    uniforms: {
      planetCenter: { value: new THREE.Vector3(0, 0, 0) },
      planetRadius: { value: effectiveSurfaceRadius },  // Use effective surface for ray termination
      atmosphereRadius: { value: atmosphereRadius },
      sunDirection: { value: config.sunDirection.clone().normalize() },
      viewerPosition: { value: new THREE.Vector3() },
      rayleighScale: { value: PlayerConfig.ATMOSPHERE_RAYLEIGH_SCALE },
      mieScale: { value: PlayerConfig.ATMOSPHERE_MIE_SCALE },
      mieG: { value: PlayerConfig.ATMOSPHERE_MIE_G },
      sunIntensity: { value: PlayerConfig.ATMOSPHERE_SUN_INTENSITY },
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
}

// Factory function to create atmosphere for Earth-like planet
export function createEarthAtmosphere(planetRadius: number, sunDirection: THREE.Vector3): Atmosphere {
  return new Atmosphere({
    planetRadius: planetRadius,
    sunDirection: sunDirection,
  });
}
