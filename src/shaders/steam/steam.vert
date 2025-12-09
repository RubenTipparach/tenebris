// Steam particle vertex shader - pixel art style (fixed world-space size)
uniform float time;
uniform float particleSize;

attribute float particleLife;    // 0-1 lifecycle of particle
attribute float particleSeed;    // Random seed for variation
attribute vec3 particleVelocity; // Direction of movement

varying float vLife;
varying float vSeed;

void main() {
  vLife = particleLife;
  vSeed = particleSeed;

  // Particles expand slightly as they age (pixel-art: keep it subtle)
  float sizeMultiplier = 1.0 + particleLife * 0.5;

  // Fade out at end of life
  float fadeOut = 1.0 - smoothstep(0.7, 1.0, particleLife);

  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);

  // Use actual distance from camera (length of view-space position)
  float dist = length(mvPosition.xyz);

  // Scale factor: larger = bigger particles at same distance
  // Dividing by distance makes particles smaller when farther away
  float scale = 80.0 / max(dist, 0.5);

  gl_PointSize = particleSize * sizeMultiplier * fadeOut * scale;

  // Wider clamp range to see the scaling effect
  gl_PointSize = clamp(gl_PointSize, 1.0, 48.0);

  gl_Position = projectionMatrix * mvPosition;
}
