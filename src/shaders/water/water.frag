// Water fragment shader with depth fog, reflections, and distortion
precision highp float;

uniform float time;
uniform vec3 waterColor;
uniform vec3 deepWaterColor;
uniform vec3 sunDirection;
uniform float opacity;
uniform float fresnelPower;
uniform float reflectionStrength;
uniform float distortionStrength;
uniform float specularPower;
uniform float specularStrength;
uniform sampler2D waterTexture;
uniform float uvTiling;

// Depth fog uniforms
uniform vec3 fogColor;
uniform float fogNear;
uniform float fogFar;
uniform float depthFogDensity;

// Texture vs procedural balance
uniform float textureStrength;
uniform float scrollSpeed;
uniform float causticStrength;
uniform float foamStrength;

// Depth texture for underwater depth calculation
uniform sampler2D depthTexture;
uniform float cameraNear;
uniform float cameraFar;
uniform vec2 screenSize;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec3 vViewDirection;
varying vec2 vUv;
varying float vDepth;
varying vec4 vScreenPos;

// Simple hash for pseudo-random
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// Smooth noise
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);

  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));

  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// Fractal Brownian motion for more natural water texture
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;

  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value;
}

// Convert depth buffer value to linear depth
float linearizeDepth(float depth) {
  float z = depth * 2.0 - 1.0; // Back to NDC
  return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
}

void main() {
  // Animated UV - scroll texture in two directions and blend
  vec2 baseUv = vUv * uvTiling;

  // Two scrolling layers of the water texture (using configurable scroll speed)
  vec2 scrollUv1 = baseUv + vec2(time * scrollSpeed, time * scrollSpeed * 0.66);
  vec2 scrollUv2 = baseUv * 1.2 + vec2(-time * scrollSpeed * 0.83, time * scrollSpeed);

  // Sample texture at both positions
  vec4 texSample1 = texture2D(waterTexture, scrollUv1);
  vec4 texSample2 = texture2D(waterTexture, scrollUv2);

  // Blend the two samples for animated water
  vec4 texColor = mix(texSample1, texSample2, 0.5);

  // Use baseUv for other effects
  vec2 finalUv = baseUv;

  // Calculate screen coordinates for depth sampling
  vec2 screenCoord = vScreenPos.xy / vScreenPos.w * 0.5 + 0.5;

  // Sample scene depth and calculate water depth
  float sceneDepth = 1.0; // Default to max depth if no depth texture
  float waterDepth = 0.0;

  #ifdef USE_DEPTH_TEXTURE
    float rawDepth = texture2D(depthTexture, screenCoord).r;
    sceneDepth = linearizeDepth(rawDepth);
    float waterSurfaceDepth = linearizeDepth(gl_FragCoord.z);
    waterDepth = max(0.0, sceneDepth - waterSurfaceDepth);
  #else
    // Fallback: use camera distance as approximate depth
    waterDepth = vDepth * 0.1;
  #endif

  // Depth-based fog factor (how deep we're looking into the water)
  float depthFogFactor = 1.0 - exp(-waterDepth * depthFogDensity);
  depthFogFactor = clamp(depthFogFactor, 0.0, 1.0);

  // Fresnel effect - more reflection at grazing angles
  float fresnel = pow(1.0 - max(dot(vNormal, vViewDirection), 0.0), fresnelPower);

  // Fake screen-space reflection (sky/environment approximation)
  vec3 reflectDir = reflect(-vViewDirection, vNormal);

  // Simple sky color based on reflection direction
  float skyGradient = reflectDir.y * 0.5 + 0.5;
  vec3 skyColor = mix(vec3(0.4, 0.5, 0.6), vec3(0.6, 0.7, 0.9), skyGradient);

  // Add sun reflection (specular highlight)
  float sunDot = max(dot(reflectDir, sunDirection), 0.0);
  float specular = pow(sunDot, specularPower) * specularStrength;
  vec3 sunColor = vec3(1.0, 0.95, 0.8);

  // Combine reflection with sky and sun
  vec3 reflectionColor = skyColor + sunColor * specular;

  // Depth-based water color (deeper = darker blue)
  vec3 baseWaterColor = mix(waterColor, deepWaterColor, depthFogFactor);

  // Mix texture with base color using configurable texture strength
  // textureStrength: 0 = pure water color, 1 = pure texture
  vec3 texturedWater = mix(baseWaterColor, texColor.rgb, textureStrength * (1.0 - depthFogFactor * 0.5));

  // Apply depth fog - blend toward fog color based on water depth
  texturedWater = mix(texturedWater, fogColor, depthFogFactor * 0.6);

  // Apply fresnel-based reflection blending (less reflection when looking deep)
  float reflectionAmount = fresnel * reflectionStrength * (1.0 - depthFogFactor * 0.5);
  vec3 finalColor = mix(texturedWater, reflectionColor, reflectionAmount);

  // Add procedural caustic shimmer (configurable strength)
  float caustic = fbm(finalUv * 6.0 + time * 0.15) * causticStrength;
  finalColor += vec3(caustic) * (1.0 - depthFogFactor);

  // Edge foam effect (shallow water) with configurable strength
  float shallowFactor = 1.0 - smoothstep(0.0, 0.5, waterDepth);
  vec3 foamColor = vec3(0.9, 0.95, 1.0);
  float foamNoise = fbm(finalUv * 15.0 + time * 0.3);
  float foam = shallowFactor * smoothstep(0.4, 0.6, foamNoise) * foamStrength;
  finalColor = mix(finalColor, foamColor, foam);

  // Output with transparency - more opaque when looking into deeper water
  float finalOpacity = mix(opacity, 0.95, fresnel * 0.5);
  finalOpacity = mix(finalOpacity, 1.0, depthFogFactor * 0.4);

  gl_FragColor = vec4(finalColor, finalOpacity);
}
