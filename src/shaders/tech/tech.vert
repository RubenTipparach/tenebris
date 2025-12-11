// Tech block vertex shader with planet-aware lighting
uniform vec3 planetCenter;
uniform vec3 sunDirection;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;
varying float vSunBrightness;

void main() {
  vUv = uv;

  // Transform to world space
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;

  // For world-space geometry, normals are already in world space
  // For transformed meshes (segments), we need model matrix rotation
  // Use normalMatrix which handles non-uniform scaling correctly
  vNormal = normalize(normalMatrix * normal);

  // Calculate surface direction (from planet center)
  vec3 surfaceDir = normalize(worldPos.xyz - planetCenter);

  // Compute sun brightness based on angle between surface and sun
  float sunFacing = dot(surfaceDir, sunDirection);

  // Smooth transition at terminator (day/night boundary)
  vSunBrightness = smoothstep(-0.1, 0.3, sunFacing);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
