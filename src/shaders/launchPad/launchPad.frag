// Launch pad fragment shader with planet-aware lighting and torch support
// Matches terrain lighting for consistent appearance
precision highp float;

uniform sampler2D techTexture;
uniform vec3 sunDirection;
uniform float ambientIntensity;
uniform float directionalIntensity;
uniform float torchLight; // Torch light level (0-1+) passed as uniform

// Torch light color (warm orange) - same as terrain
const vec3 TORCH_LIGHT_COLOR = vec3(1.0, 0.7, 0.3);

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;
varying float vSunBrightness;

void main() {
  // Sample the texture
  vec4 texColor = texture2D(techTexture, vUv);

  // Alpha test - discard transparent pixels
  if (texColor.a < 0.5) {
    discard;
  }

  // Flip normal for back faces (needed for double-sided rendering)
  vec3 normal = gl_FrontFacing ? vNormal : -vNormal;

  // Standard Lambert diffuse lighting on the mesh face
  float meshDiffuse = max(0.0, dot(normal, sunDirection));

  // Directional light: direct sunlight on the face
  // Launch pad is always on surface, so skyLight = 1.0
  float directional = meshDiffuse * vSunBrightness * directionalIntensity;

  // Ambient light: transitions from 10% on dark side to full on day side
  // Same formula as terrain for consistent lighting
  float ambientDayNight = mix(0.1, 1.0, vSunBrightness);
  float ambient = ambientIntensity * ambientDayNight;

  // Final lighting: ambient provides base, directional adds on top
  float lighting = ambient + directional;
  vec3 finalColor = texColor.rgb * lighting;

  // Add torch light with warm orange color
  if (torchLight > 0.0) {
    // Night factor - torch light is more visible in darkness
    float nightFactor = mix(0.3, 1.0, 1.0 - vSunBrightness);
    finalColor += texColor.rgb * TORCH_LIGHT_COLOR * torchLight * nightFactor;
  }

  gl_FragColor = vec4(finalColor, texColor.a);
}
