// Planet distant LOD fragment shader with day/night lighting and placed torch lights
precision highp float;

uniform vec3 sunDirection;
uniform float ambientIntensity;
uniform float directionalIntensity;
uniform float darkSideAmbient; // Minimum ambient on dark side (0-1)
uniform vec3 planetCenter;

// Torch light uniforms - up to 32 torches visible from space
#define MAX_TORCHES 32
uniform vec3 torchPositions[MAX_TORCHES];
uniform int torchCount;
uniform float torchLightRadius; // How big the light appears from space

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vColor;
varying float vSunFacing;

void main() {
  // Calculate day/night factor with smooth terminator
  // vSunFacing: 1 = full day, -1 = full night
  float dayFactor = smoothstep(-0.1, 0.3, vSunFacing);

  // Lambert diffuse lighting on the mesh face
  float meshDiffuse = max(0.0, dot(vNormal, sunDirection));

  // Directional light: direct sunlight on the face
  float directional = meshDiffuse * dayFactor * directionalIntensity;

  // Ambient light: transitions from full intensity on day side to dim on dark side
  float ambientDayNight = mix(darkSideAmbient, 1.0, dayFactor);
  float ambient = ambientIntensity * ambientDayNight;

  // Final lighting
  float lighting = ambient + directional;
  vec3 finalColor = vColor * lighting;

  // Add torch lights on dark side
  if (torchCount > 0 && dayFactor < 0.5) {
    // Night factor - lights are brighter deeper into night
    float nightFactor = smoothstep(0.3, 0.0, dayFactor);

    // Warm torch light color
    vec3 torchLightColor = vec3(1.0, 0.85, 0.5);

    float totalTorchLight = 0.0;

    for (int i = 0; i < MAX_TORCHES; i++) {
      if (i >= torchCount) break;

      vec3 torchPos = torchPositions[i];

      // Distance from this fragment to the torch
      float dist = distance(vWorldPosition, torchPos);

      // Create a small glowing point for each torch
      // The light radius determines how big it appears from space
      if (dist < torchLightRadius) {
        // Smooth falloff from center
        float intensity = 1.0 - (dist / torchLightRadius);
        intensity = intensity * intensity; // Quadratic falloff for softer edges
        totalTorchLight += intensity;
      }
    }

    // Clamp total light and apply
    totalTorchLight = min(totalTorchLight, 1.5);
    finalColor += torchLightColor * totalTorchLight * nightFactor;
  }

  gl_FragColor = vec4(finalColor, 1.0);
}
