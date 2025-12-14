// Rocket exhaust particle vertex shader
uniform float time;
uniform float particleSize;
uniform float throttle;  // 0-1 throttle level

attribute float particleLife;    // 0-1 lifecycle of particle
attribute float particleSeed;    // Random seed for variation

varying float vLife;
varying float vSeed;
varying float vThrottle;

void main() {
  vLife = particleLife;
  vSeed = particleSeed;
  vThrottle = throttle;

  // Particles get smaller as they age (exhaust dissipates quickly)
  float sizeMultiplier = 1.0 - particleLife * 0.6;

  // Fade out at end of life
  float fadeOut = 1.0 - smoothstep(0.6, 1.0, particleLife);

  // Size scales with throttle
  float throttleScale = 0.5 + throttle * 0.5;

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  // Use actual distance from camera
  float dist = length(mvPosition.xyz);

  // Scale factor for distance
  float scale = 80.0 / max(dist, 0.5);

  gl_PointSize = particleSize * sizeMultiplier * fadeOut * throttleScale * scale;
  gl_PointSize = clamp(gl_PointSize, 1.0, 64.0);

  gl_Position = projectionMatrix * mvPosition;
}
