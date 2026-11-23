/**
 * Torch light for things that are not baked into the terrain mesh: the
 * ground clutter (grass tufts, pebbles). The terrain bakes each torch's
 * light into its vertices (ChunkGeometryBuilder calculateTorchLight); a
 * tuft is re-scattered round the player and can't carry a baked value, so
 * it reads the nearest torches from these shared uniforms instead, with the
 * SAME falloff, cap, colour and night fade as the terrain (planet.frag), so
 * a tuft and the ground under it are lit alike.
 *
 * One set of uniform objects: every material that includes the
 * `tenebris_torch_light` chunk spreads torchLightUniforms() into its own
 * uniforms, and setTorchLights() updates them all at once each frame.
 */
import * as THREE from 'three';
import { PlayerConfig } from '../config/PlayerConfig';

const MAX = PlayerConfig.TORCH_LIT_NEAREST;

const shared = {
  torchPositions: { value: Array.from({ length: MAX }, () => new THREE.Vector3()) },
  torchCount: { value: 0 },
  torchRange: { value: PlayerConfig.TORCH_LIGHT_RANGE },
  torchIntensity: { value: PlayerConfig.TORCH_LIGHT_INTENSITY },
  torchColor: { value: new THREE.Color(...PlayerConfig.TORCH_LIGHT_COLOR) },
};

(THREE.ShaderChunk as Record<string, string>)['tenebris_torch_light'] = /* glsl */ `
uniform vec3 torchPositions[${MAX}];
uniform int torchCount;
uniform float torchRange;
uniform float torchIntensity;
uniform vec3 torchColor;
// The terrain's falloff (ChunkGeometryBuilder calculateTorchLight): 1 / (1 + 2 d^2 / r^2) inside the range, capped at 1.5
float torchLightAt(vec3 p) {
  float total = 0.0;
  for (int i = 0; i < ${MAX}; i++) {
    if (i >= torchCount) break;
    float d = distance(p, torchPositions[i]);
    if (d < torchRange) total += torchIntensity / (1.0 + 2.0 * d * d / (torchRange * torchRange));
  }
  return min(total, 1.5);
}
// What the terrain adds for torches (planet.frag): stronger as the day goes
vec3 torchGlow(vec3 albedo, vec3 p, float sunFacing) {
  float dayFactor = smoothstep(-0.1, 0.3, sunFacing);
  return albedo * torchColor * torchLightAt(p) * smoothstep(0.5, 0.0, dayFactor);
}
`;

export function torchLightUniforms(): Record<string, THREE.IUniform> {
  return shared;
}

/** The nearest torches to `near` feed every clutter material */
export function setTorchLights(torches: ReadonlyArray<{ position: THREE.Vector3 }>, near: THREE.Vector3): void {
  const sorted = torches.length > MAX
    ? [...torches].sort((a, b) => a.position.distanceToSquared(near) - b.position.distanceToSquared(near))
    : torches;
  const n = Math.min(MAX, sorted.length);
  for (let i = 0; i < n; i++) shared.torchPositions.value[i].copy(sorted[i].position);
  shared.torchCount.value = n;
}
