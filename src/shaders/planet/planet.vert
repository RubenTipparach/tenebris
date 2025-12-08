// Planet distant LOD vertex shader with day/night lighting
uniform vec3 planetCenter;
uniform vec3 sunDirection;

attribute vec3 color;
attribute float torchLight; // Pre-baked torch light per vertex (0-1)

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vColor;
varying float vSunFacing;
varying float vTorchLight;

void main() {
  vColor = color;
  vTorchLight = torchLight;

  // Transform to world space
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;

  // Transform normal to world space
  vNormal = normalize(mat3(modelMatrix) * normal);

  // Calculate surface direction (from planet center)
  vec3 surfaceDir = normalize(worldPos.xyz - planetCenter);

  // Compute sun facing value for day/night calculation
  // This is passed to fragment shader for smooth per-pixel lighting
  vSunFacing = dot(surfaceDir, sunDirection);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
