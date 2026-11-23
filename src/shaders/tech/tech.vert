// Tech block vertex shader with planet-aware lighting
uniform vec3 planetCenter;
uniform vec3 sunDirection;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;
varying float vSunFacing;

void main() {
  vUv = uv;

  // Transform to world space
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;

  // World-space normal: the sun direction it is lit against is world space.
  // (three's normalMatrix is VIEW space - lighting with it made the sun's
  // shading on machines and chests follow the camera.) The inverse-transpose
  // keeps it right for scaled meshes (cable / pipe segments).
  vNormal = normalize(transpose(inverse(mat3(modelMatrix))) * normal);

  // Calculate surface direction (from planet center)
  vec3 surfaceDir = normalize(worldPos.xyz - planetCenter);

  // Compute sun brightness based on angle between surface and sun
  float sunFacing = dot(surfaceDir, sunDirection);

  // The sun's height over this spot: the sky light table's index, as the terrain's
  vSunFacing = sunFacing;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
