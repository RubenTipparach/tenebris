// Planet distant LOD fragment shader with day/night lighting and city lights
precision highp float;

uniform vec3 sunDirection;
uniform float ambientIntensity;
uniform float directionalIntensity;
uniform float cityLightIntensity; // Intensity of city lights on dark side
uniform float time; // For subtle twinkling

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec3 vColor;
varying float vSunFacing;

// Simple pseudo-random noise for city light placement
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Value noise for smoother city light distribution
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f); // Smoothstep

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

void main() {
  // Calculate day/night factor with smooth terminator
  // vSunFacing: 1 = full day, -1 = full night
  float dayFactor = smoothstep(-0.1, 0.3, vSunFacing);

  // Lambert diffuse lighting on the mesh face
  float meshDiffuse = max(0.0, dot(vNormal, sunDirection));

  // Directional light: direct sunlight on the face
  float directional = meshDiffuse * dayFactor * directionalIntensity;

  // Ambient light: transitions from full intensity on day side to very dim on dark side
  float ambientDayNight = mix(0.02, 1.0, dayFactor); // Very dark on night side
  float ambient = ambientIntensity * ambientDayNight;

  // Final lighting
  float lighting = ambient + directional;
  vec3 finalColor = vColor * lighting;

  // Add city lights on dark side
  if (cityLightIntensity > 0.0 && dayFactor < 0.5) {
    // Use world position to create stable city light pattern
    vec3 normalizedPos = normalize(vWorldPosition);

    // Convert to spherical coordinates for UV-like mapping
    float phi = atan(normalizedPos.z, normalizedPos.x);
    float theta = acos(normalizedPos.y);

    // Scale for city density - higher = more cities
    vec2 cityUV = vec2(phi * 8.0, theta * 6.0);

    // Create city light pattern - clustered points of light
    float cityNoise = noise(cityUV * 4.0);
    float cityMask = smoothstep(0.65, 0.75, cityNoise); // Only high noise values become cities

    // Add some variation/detail
    float detailNoise = noise(cityUV * 16.0);
    cityMask *= smoothstep(0.3, 0.6, detailNoise);

    // Subtle twinkling
    float twinkle = 0.8 + 0.2 * sin(time * 2.0 + hash(floor(cityUV * 4.0)) * 6.28);

    // City lights are warm yellow/orange
    vec3 cityLightColor = vec3(1.0, 0.85, 0.5);

    // Only show city lights on dark side - fade out as day approaches
    float nightFactor = smoothstep(0.3, 0.0, dayFactor);

    // Don't show city lights on water (blue-ish color indicates water)
    float waterMask = 1.0 - smoothstep(0.1, 0.3, vColor.b - max(vColor.r, vColor.g));

    float cityBrightness = cityMask * nightFactor * cityLightIntensity * twinkle * waterMask;
    finalColor += cityLightColor * cityBrightness;
  }

  gl_FragColor = vec4(finalColor, 1.0);
}
