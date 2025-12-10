// Glass vertex shader with planet-aware lighting
uniform vec3 planetCenter;
uniform vec3 sunDirection;
uniform float waterLevel; // Radius of water surface from planet center

// Sky light attribute - pre-calculated on CPU based on depth from surface
attribute float skyLight;
// Torch light attribute - pre-calculated on CPU based on nearby torches
attribute float torchLight;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;
varying float vSunBrightness;
varying float vSkyLight; // Pre-calculated sky light (0-1)
varying float vTorchLight; // Pre-calculated torch light (0-1)
varying float vWaterDepth; // How far below water surface (0 if above water)
varying float vDistanceFromCamera;
varying vec3 vViewDirection;

void main() {
  vUv = uv;
  vSkyLight = skyLight;
  vTorchLight = torchLight;

  // Transform to world space
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;

  // Transform normal to world space
  vNormal = normalize(normal);

  // Calculate surface direction (from planet center)
  vec3 surfaceDir = normalize(worldPos.xyz - planetCenter);

  // Compute sun brightness based on angle between surface and sun
  float sunFacing = dot(surfaceDir, sunDirection);

  // Smooth transition at terminator (day/night boundary)
  vSunBrightness = smoothstep(-0.1, 0.3, sunFacing);

  // Calculate water depth - how far below water level this vertex is
  float distFromCenter = length(worldPos.xyz - planetCenter);
  vWaterDepth = max(0.0, waterLevel - distFromCenter);

  // Distance from camera for fog calculation
  vDistanceFromCamera = length(cameraPosition - worldPos.xyz);

  // View direction for specular
  vViewDirection = normalize(cameraPosition - worldPos.xyz);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
