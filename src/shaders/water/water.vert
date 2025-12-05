// Water vertex shader with animation support
uniform float time;
uniform float waveAmplitude;
uniform float waveFrequency;
uniform vec3 planetCenter;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec3 vViewDirection;
varying vec2 vUv;
varying float vDepth;

void main() {
  vUv = uv;

  // Get world position
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;

  // Calculate radial direction from planet center (for spherical water)
  vec3 radialDir = normalize(worldPos.xyz - planetCenter);

  // Animate water surface with gentle waves
  // Use world position for consistent wave pattern
  float wave1 = sin(worldPos.x * waveFrequency + time * 1.5) * 0.5;
  float wave2 = sin(worldPos.z * waveFrequency * 0.8 + time * 1.2) * 0.5;
  float wave3 = sin((worldPos.x + worldPos.z) * waveFrequency * 0.6 + time * 0.8) * 0.3;
  float waveHeight = (wave1 + wave2 + wave3) * waveAmplitude;

  // Displace along radial direction (for spherical planets)
  vec3 displacedPos = worldPos.xyz + radialDir * waveHeight;

  // Transform normal to world space and perturb based on waves
  vec3 baseNormal = normalize(normalMatrix * normal);

  // Calculate wave-based normal perturbation
  float dx = cos(worldPos.x * waveFrequency + time * 1.5) * waveFrequency * waveAmplitude;
  float dz = cos(worldPos.z * waveFrequency * 0.8 + time * 1.2) * waveFrequency * 0.8 * waveAmplitude;

  // Create tangent space perturbation
  vec3 tangent = normalize(cross(baseNormal, vec3(0.0, 0.0, 1.0)));
  if (length(tangent) < 0.1) {
    tangent = normalize(cross(baseNormal, vec3(1.0, 0.0, 0.0)));
  }
  vec3 bitangent = normalize(cross(baseNormal, tangent));

  vNormal = normalize(baseNormal - tangent * dx * 0.3 - bitangent * dz * 0.3);

  // View direction for reflections
  vViewDirection = normalize(cameraPosition - displacedPos);

  // Depth for fog (distance from camera)
  vDepth = length(cameraPosition - displacedPos);

  // Final position
  gl_Position = projectionMatrix * viewMatrix * vec4(displacedPos, 1.0);
}
