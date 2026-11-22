import * as THREE from 'three';
import { SKY_LIGHT_CONFIG } from '../config/LightingConfig';
import { buildSkyLightTable, SkyParams } from '../shared/skyLight';

/**
 * A planet's sky light as a texture (openspec sky-lighting): row 0 the sun's
 * light, row 1 the sky's fill, across the sun's height (u = e * 0.5 + 0.5).
 * Half floats so WebGL2 filters it smoothly. Built once per planet.
 */
export function skyLightTexture(params: SkyParams | null): THREE.DataTexture {
  const c = SKY_LIGHT_CONFIG;
  const table = buildSkyLightTable(params, {
    lutSize: c.LUT_SIZE, sunDiscE: c.SUN_DISC_E, fillSaturation: c.FILL_SATURATION,
    nightFill: [...c.NIGHT_FILL], airlessFill: [...c.AIRLESS_FILL],
  });
  const half = new Uint16Array(table.length);
  for (let i = 0; i < table.length; i++) half[i] = THREE.DataUtils.toHalfFloat(table[i]);
  const tex = new THREE.DataTexture(half, c.LUT_SIZE, 2, THREE.RGBAFormat, THREE.HalfFloatType);
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

/** Width of the table (the shader's texel-centre maths needs it) */
export const SKY_LIGHT_LUT_SIZE = SKY_LIGHT_CONFIG.LUT_SIZE;

/**
 * The one shader lookup every lit surface uses (`#include <tenebris_sky_light>`):
 * skySun(e) is the sun's light through the air and skyFill(e) the sky's fill,
 * for a spot whose sun height (sine) is e. Needs the uniforms below.
 */
(THREE.ShaderChunk as Record<string, string>)['tenebris_sky_light'] = /* glsl */ `
uniform sampler2D skyLight;
uniform float skyLightSize;
float skyLightU(float e) { return (clamp(e * 0.5 + 0.5, 0.0, 1.0) * (skyLightSize - 1.0) + 0.5) / skyLightSize; }
vec3 skySun(float e) { return texture2D(skyLight, vec2(skyLightU(e), 0.25)).rgb; }
vec3 skyFill(float e) { return texture2D(skyLight, vec2(skyLightU(e), 0.75)).rgb; }
`;

let airless: THREE.DataTexture | null = null;
/** The table for a world with no air (also the stand-in until a planet's own is set) */
export function airlessSkyLight(): THREE.DataTexture {
  return airless ??= skyLightTexture(null);
}

/** The uniforms the chunk reads */
export function skyLightUniforms(tex: THREE.Texture = airlessSkyLight()): Record<string, THREE.IUniform> {
  return { skyLight: { value: tex }, skyLightSize: { value: SKY_LIGHT_LUT_SIZE } };
}
