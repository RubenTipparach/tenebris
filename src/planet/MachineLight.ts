/**
 * The light on placed things that are drawn with the tech / launch pad
 * shaders: machines, chests, cookers, pipes, cables, launch pads (openspec
 * sky-lighting task 1.4). One shared set of uniforms for every such
 * material, set each frame from the planet the player is on, so a machine
 * sits in the same sun, sky fill and torch light as the ground under it.
 *
 * Before this, each manager kept its own planet centre and sun direction
 * from startup; nothing updated them once planets moved and spun, so a
 * machine in daylight could be lit as if it were night.
 */
import * as THREE from 'three';
import { skyLightUniforms } from './SkyLightTexture';
import { torchLightUniforms } from './TorchLightUniforms';

const shared: Record<string, THREE.IUniform> = {
  planetCenter: { value: new THREE.Vector3() },
  sunDirection: { value: new THREE.Vector3(1, 0, 0) },
  ...skyLightUniforms(),
};

/** Spread into a tech / launch pad material's uniforms (shared objects: one update lights them all) */
export function machineLightUniforms(): Record<string, THREE.IUniform> {
  return { ...shared, ...torchLightUniforms() };
}

/**
 * A material.clone() deep-copies its uniforms, which would cut a placed
 * machine off from the shared light: hand every clone back the shared
 * objects (placed machines clone the manager's material per instance).
 */
export function withMachineLight<M extends THREE.ShaderMaterial>(material: M): M {
  const u = machineLightUniforms();
  for (const k of Object.keys(u)) material.uniforms[k] = u[k];
  return material;
}

/** The planet the player is on: its centre, the sun's direction from it, its sky light table */
export function setMachineLight(center: THREE.Vector3, sunDirection: THREE.Vector3, skyLight: THREE.Texture): void {
  (shared.planetCenter.value as THREE.Vector3).copy(center);
  (shared.sunDirection.value as THREE.Vector3).copy(sunDirection).normalize();
  shared.skyLight.value = skyLight;
}
