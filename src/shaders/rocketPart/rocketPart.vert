// Rocket part vertex shader with adaptive lighting
// Handles planet surface, nearby lights, and high-altitude standard lighting
uniform vec3 planetCenter;
uniform vec3 sunDirection;
uniform float planetRadius;
uniform float atmosphereHeight; // Height above surface where atmosphere ends

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

  // Transform normal to world space
  vNormal = normalize(normalMatrix * normal);

  // Calculate distance from planet center and altitude
  float distFromCenter = length(worldPos.xyz - planetCenter);
  vAltitude = distFromCenter - planetRadius;

  // Calculate gravity well strength (1.0 on surface, 0.0 at atmosphere edge or beyond)
  // Smooth transition over the atmosphere height
  vGravityWellStrength = 1.0 - smoothstep(0.0, atmosphereHeight, vAltitude);

  // Calculate surface direction (from planet center)
  vec3 surfaceDir = normalize(worldPos.xyz - planetCenter);

  // Compute sun brightness based on angle between surface and sun
  float sunFacing = dot(surfaceDir, sunDirection);

  // Smooth transition at terminator (day/night boundary)
  vSunBrightness = smoothstep(-0.1, 0.3, sunFacing);

  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
