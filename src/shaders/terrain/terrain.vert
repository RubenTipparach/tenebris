// Terrain vertex shader with planet-aware lighting
uniform vec3 planetCenter;
uniform vec3 sunDirection;
uniform float waterLevel; // Radius of water surface from planet center

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;
varying float vSunBrightness;
varying float vWaterDepth; // How far below water surface (0 if above water)
varying float vDistanceFromCamera;

void main() {
  vUv = uv;

  // Transform to world space
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;

  // Transform normal to world space
  // Since batchedMeshGroup only has translation (no rotation/scale),
  // mat3(modelMatrix) is identity, so normal stays unchanged
  vNormal = normalize(normal);

  // Calculate surface direction (from planet center)
  vec3 surfaceDir = normalize(worldPos.xyz - planetCenter);

  // Compute sun brightness based on angle between surface and sun
  // dot > 0 means facing sun, dot < 0 means in shadow
  float sunFacing = dot(surfaceDir, sunDirection);

  // Smooth transition at terminator (day/night boundary)
  // Goes from 0 (full shadow) to 1 (full sun)
  vSunBrightness = smoothstep(-0.1, 0.3, sunFacing);

  // Calculate water depth - how far below water level this vertex is
  float distFromCenter = length(worldPos.xyz - planetCenter);
  vWaterDepth = max(0.0, waterLevel - distFromCenter);

  // Distance from camera for fog calculation
  vDistanceFromCamera = length(cameraPosition - worldPos.xyz);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
