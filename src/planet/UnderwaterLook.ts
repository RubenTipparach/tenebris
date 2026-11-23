/**
 * Under water, for the things drawn with their own shaders (sea plants,
 * sea creatures): dimmed by the water above them, the terrain shader's way,
 * and fogged toward the underwater fog colour by distance while the camera
 * is under water - so a jellyfish fades into the murk like the seabed under
 * it. One chunk and one set of shared uniforms, set once a frame
 * (setUnderwaterLook), included by every such material.
 */
import * as THREE from 'three';
import { PlayerConfig } from '../config/PlayerConfig';

const shared: Record<string, THREE.IUniform> = {
  isUnderwater: { value: 0 },
  underwaterFogColor: { value: new THREE.Color(PlayerConfig.UNDERWATER_FOG_COLOR) },
  underwaterFogNear: { value: PlayerConfig.UNDERWATER_FOG_NEAR },
  underwaterFogFar: { value: PlayerConfig.UNDERWATER_FOG_FAR },
  underwaterDimming: { value: PlayerConfig.UNDERWATER_TERRAIN_DIMMING },
  seaSurfaceRadius: { value: -1 },
};

(THREE.ShaderChunk as Record<string, string>)['tenebris_underwater'] = /* glsl */ `
uniform float isUnderwater;
uniform vec3 underwaterFogColor;
uniform float underwaterFogNear;
uniform float underwaterFogFar;
uniform float underwaterDimming;
uniform float seaSurfaceRadius;
// c: the lit colour at world point p on a planet centred at centre; surface:
// the water surface radius over it (-1: no water). glow is light the thing
// makes itself, added after the dimming.
vec3 underwaterLook(vec3 c, vec3 glow, vec3 p, vec3 centre, float surface) {
  float depth = surface > 0.0 ? max(0.0, surface - length(p - centre)) : 0.0;
  if (depth > 0.0) {
    float dim = exp(-depth * underwaterDimming);
    c = mix(c * dim, underwaterFogColor * dim, (1.0 - dim) * 0.5);
  }
  c += glow;
  if (isUnderwater > 0.5) {
    float fog = clamp((distance(cameraPosition, p) - underwaterFogNear) / (underwaterFogFar - underwaterFogNear), 0.0, 1.0);
    c = mix(c, underwaterFogColor, fog);
  }
  return c;
}
`;

export function underwaterLookUniforms(): Record<string, THREE.IUniform> {
  return shared;
}

/** Once a frame: is the camera under water, and the sea surface of the planet the player is on (-1: none) */
export function setUnderwaterLook(cameraUnderwater: boolean, seaSurfaceRadius: number): void {
  shared.isUnderwater.value = cameraUnderwater ? 1 : 0;
  shared.seaSurfaceRadius.value = seaSurfaceRadius;
}
