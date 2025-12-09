// Steam particle fragment shader - pixel art style
uniform float time;

varying float vLife;
varying float vSeed;

void main() {
  // Create pixel-art style particle with hard edges
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);

  // Hard circular cutoff for pixel-art look
  if (dist > 0.45) discard;

  // Quantize alpha to fewer levels for pixel-art feel
  float lifeFade = 1.0 - smoothstep(0.6, 1.0, vLife);
  float alpha = lifeFade * 0.7;

  // Step the alpha for more distinct layering (3 levels)
  alpha = floor(alpha * 3.0 + 0.5) / 3.0;

  // Discard fully transparent pixels
  if (alpha < 0.1) discard;

  // Steam color - white/light gray, slight variation
  vec3 steamColor = vec3(0.85, 0.88, 0.92);

  // Slight color variation based on seed (quantized)
  float colorVar = floor(vSeed * 3.0) / 3.0 - 0.5;
  steamColor += colorVar * 0.08;

  gl_FragColor = vec4(steamColor, alpha);
}
