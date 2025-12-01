precision highp float;

varying vec3 vWorldPosition;

// Hash functions for pseudo-random stars
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec2 hash2(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}

void main() {
  // Normalize direction to get consistent star positions
  vec3 dir = normalize(vWorldPosition);

  // Convert to spherical coordinates for proper star distribution
  float theta = atan(dir.x, dir.z); // -PI to PI
  float phi = acos(dir.y); // 0 to PI

  // Scale to create grid cells (higher = more stars)
  float scale = 80.0;
  vec2 uv = vec2(theta * scale, phi * scale);
  vec2 gridId = floor(uv);
  vec2 gridUv = fract(uv) - 0.5; // -0.5 to 0.5, centered in cell

  float star = 0.0;

  // Check this cell and neighbors for stars (to handle stars near edges)
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      vec2 neighborId = gridId + vec2(float(x), float(y));
      vec2 neighborOffset = vec2(float(x), float(y));

      // Random position within the cell
      vec2 starOffset = hash2(neighborId) - 0.5;

      // Distance from current pixel to star center
      vec2 toStar = neighborOffset + starOffset - gridUv;
      float dist = length(toStar);

      // Random brightness for this star
      float rand = hash(neighborId);

      // Only ~3% of cells have stars
      if (rand > 0.97) {
        // Star brightness based on random value
        float brightness = (rand - 0.97) / 0.03;
        brightness = pow(brightness, 0.3); // More visible dim stars

        // Create small, sharp star points with soft falloff
        float starSize = 0.02 + brightness * 0.03; // Smaller stars
        float starBrightness = smoothstep(starSize, 0.0, dist) * brightness;

        // Add slight glow around brighter stars
        if (brightness > 0.5) {
          starBrightness += smoothstep(starSize * 4.0, starSize, dist) * brightness * 0.3;
        }

        star = max(star, starBrightness);
      }

      // Extra bright stars (rarer)
      if (rand > 0.998) {
        float starSize = 0.04;
        float starBrightness = smoothstep(starSize, 0.0, dist);
        starBrightness += smoothstep(starSize * 3.0, starSize, dist) * 0.5; // Glow
        star = max(star, starBrightness);
      }
    }
  }

  // Deep space background color
  vec3 spaceColor = vec3(0.0, 0.0, 0.02);
  vec3 starColor = vec3(1.0, 0.98, 0.9); // Slightly warm white

  vec3 finalColor = spaceColor + starColor * star;

  gl_FragColor = vec4(finalColor, 1.0);
}
