// Launch pad vertex shader with planet-aware lighting
// Designed for world-space geometry (like terrain blocks)
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

  // For world-space geometry, normals are already in world space
  // Don't use normalMatrix - the geometry is created with correct world-space normals
  vNormal = normalize(normal);

  // Calculate surface direction (from planet center)
  vec3 surfaceDir = normalize(worldPos.xyz - planetCenter);

  // Compute sun brightness based on angle between surface and sun
  float sunFacing = dot(surfaceDir, sunDirection);

  // The sun's height over this spot: the sky light table's index, as the terrain's
  vSunFacing = sunFacing;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
