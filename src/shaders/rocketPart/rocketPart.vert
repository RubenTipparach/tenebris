// Rocket part vertex shader: the tech shader's planet-aware light (sky light
// table + torches, src/planet/MachineLight.ts), plus how deep the part sits
// in the planet's gravity well so a rocket climbing out moves over to space
// lighting.
uniform vec3 planetCenter;
uniform vec3 sunDirection;
uniform float planetRadius;
uniform float atmosphereHeight; // Height above surface where atmosphere ends

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;
varying float vSunFacing;
varying float vGravityWellStrength; // 0 = in space, 1 = on surface

void main() {
  vUv = uv;

  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;

  // World-space normal (as tech.vert): the part's group turns the model, so
  // a rocket on its side or in flight is lit against its real faces
  vNormal = normalize(transpose(inverse(mat3(modelMatrix))) * normal);

  // The sun's height over this spot: the sky light table's index, as the terrain's
  vec3 toPart = worldPos.xyz - planetCenter;
  vSunFacing = dot(normalize(toPart), sunDirection);

  // 1.0 on the surface, 0.0 at the atmosphere's edge or beyond
  vGravityWellStrength = 1.0 - smoothstep(0.0, atmosphereHeight, length(toPart) - planetRadius);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
