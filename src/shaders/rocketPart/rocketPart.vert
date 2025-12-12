// Rocket part vertex shader with planet-aware lighting
// Uses shared sunBrightness from JavaScript for consistent lighting across the whole rocket stack
uniform vec3 planetCenter;
uniform vec3 sunDirection;
uniform float planetRadius;
uniform float atmosphereHeight; // Height above surface where atmosphere ends
uniform float sunBrightness; // Pre-calculated sun brightness from launch pad position (0-1)

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;
varying float vSunBrightness;
varying float vGravityWellStrength; // 0 = in space, 1 = on surface
varying float vAltitude; // Height above planet surface

void main() {
  vUv = uv;

  // Transform to world space
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;

  // For world-space geometry, normals are already in world space
  // Don't use normalMatrix - the geometry is created with correct world-space normals
  vNormal = normalize(normal);

  // Calculate distance from planet center and altitude
  float distFromCenter = length(worldPos.xyz - planetCenter);
  vAltitude = distFromCenter - planetRadius;

  // Calculate gravity well strength (1.0 on surface, 0.0 at atmosphere edge or beyond)
  // Smooth transition over the atmosphere height
  vGravityWellStrength = 1.0 - smoothstep(0.0, atmosphereHeight, vAltitude);

  // Use the pre-calculated sun brightness from JavaScript
  // This ensures the entire rocket stack has consistent lighting
  vSunBrightness = sunBrightness;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
