// Torch vertex shader with animation masking via animWeight attribute
uniform float time;
uniform float flickerAmount;

attribute float animWeight; // 0 = no animation (handle/head), 1 = full animation (flame)

varying vec3 vColor;

void main() {
  vColor = color;

  // Calculate flicker using multiple sine waves for organic motion
  float t = time;
  float flicker = sin(t) * sin(t * 2.3) * sin(t * 0.7);

  // Apply animation only to vertices with animWeight > 0 (flame vertices)
  vec3 animatedPosition = position;

  if (animWeight > 0.0) {
    // Flame base Y position: handle (0.4) + head (0.1) = 0.5
    // Flame cone spans from 0.5 to 0.5 + 0.15 = 0.65
    float flameBaseY = 0.5;

    // Scale the flame vertically based on flicker
    // Only scale the part above the flame base
    float heightAboveBase = position.y - flameBaseY;
    float scaleY = 1.0 + flicker * flickerAmount * animWeight;

    // Scale Y position relative to flame base (base stays fixed, tip moves)
    animatedPosition.y = flameBaseY + heightAboveBase * scaleY;

    // Add slight horizontal wobble to the flame tip (higher parts wobble more)
    float heightFactor = max(0.0, heightAboveBase * 4.0); // Normalize to ~0-1 range
    animatedPosition.x += sin(t * 1.7) * 0.008 * heightFactor * animWeight;
    animatedPosition.z += cos(t * 1.3) * 0.008 * heightFactor * animWeight;
  }

  gl_Position = projectionMatrix * modelViewMatrix * vec4(animatedPosition, 1.0);
}
