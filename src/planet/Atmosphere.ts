import * as THREE from 'three';
import atmosphereVert from '../shaders/atmosphere/atmosphere.vert';
import atmosphereFrag from '../shaders/atmosphere/atmosphere.frag';
import { PlayerConfig } from '../config/PlayerConfig';

export interface AtmosphereConfig {
  planetRadius: number;     // Actual planet surface radius
  sunDirection: THREE.Vector3;
}

// Create atmosphere shader - renders a glow effect around the planet
function createAtmosphereShaderMaterial(config: AtmosphereConfig): THREE.ShaderMaterial {
  const innerRadius = config.planetRadius * PlayerConfig.ATMOSPHERE_INNER_RADIUS_MULT;
  const outerRadius = config.planetRadius * PlayerConfig.ATMOSPHERE_OUTER_RADIUS_MULT;

  return new THREE.ShaderMaterial({
    uniforms: {
      planetCenter: { value: new THREE.Vector3(0, 0, 0) },
      planetRadius: { value: config.planetRadius },  // Actual surface for density calc
      innerRadius: { value: innerRadius },           // Inner boundary (below surface)
      outerRadius: { value: outerRadius },           // Outer boundary
      sunDirection: { value: config.sunDirection.clone().normalize() },
      viewerPosition: { value: new THREE.Vector3() },
      densityFalloff: { value: PlayerConfig.ATMOSPHERE_DENSITY_FALLOFF },
      scatterStrength: { value: PlayerConfig.ATMOSPHERE_SCATTER_STRENGTH },
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
    // Create sphere geometry at outer radius
    const outerRadius = config.planetRadius * PlayerConfig.ATMOSPHERE_OUTER_RADIUS_MULT;
    const geometry = new THREE.SphereGeometry(outerRadius, 64, 48);
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
