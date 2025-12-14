// Rocket exhaust particle fragment shader - fiery effect
uniform float time;

varying float vLife;
varying float vSeed;
varying float vThrottle;

void main() {
  // Create circular particle
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);

  // Soft edge for fire effect
  if (dist > 0.5) discard;

  // Life-based fade
  float lifeFade = 1.0 - smoothstep(0.5, 1.0, vLife);

  // Inner core is brighter
  float coreFade = 1.0 - smoothstep(0.0, 0.4, dist);

  // Fire colors - transition from white/yellow core to orange to red
  vec3 coreColor = vec3(1.0, 0.95, 0.8);    // White/yellow hot core
  vec3 midColor = vec3(1.0, 0.6, 0.1);      // Orange
  vec3 outerColor = vec3(0.9, 0.2, 0.05);   // Red/orange

  // Life determines color transition (young = hot, old = cooler)
  float colorLife = vLife + vSeed * 0.2;  // Add variation
  vec3 baseColor = mix(coreColor, midColor, smoothstep(0.0, 0.3, colorLife));
  baseColor = mix(baseColor, outerColor, smoothstep(0.3, 0.7, colorLife));

  // Distance from center also affects color (core is hotter)
  vec3 finalColor = mix(baseColor, coreColor, coreFade * 0.5);

  // Throttle affects brightness
  float brightness = 0.7 + vThrottle * 0.3;
  finalColor *= brightness;

  // Alpha based on life and distance from center
  float alpha = lifeFade * (1.0 - dist * 1.5);
  alpha = clamp(alpha, 0.0, 1.0);

  // Boost alpha for more visibility
  alpha *= 0.9;

  if (alpha < 0.05) discard;

  gl_FragColor = vec4(finalColor, alpha);
}
