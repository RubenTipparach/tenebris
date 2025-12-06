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

// Underwater fog uniforms (when camera is below water)
uniform vec3 underwaterFogColor;
uniform float underwaterFogNear;
uniform float underwaterFogFar;

// Above water fog uniforms (looking down through water surface)
uniform vec3 aboveWaterFogColor;
uniform float aboveWaterFogNear;
uniform float aboveWaterFogFar;

uniform float isUnderwater; // 1.0 if camera is underwater, 0.0 otherwise

// Depth texture for underwater terrain fog (from above)
uniform sampler2D depthTexture;
uniform float cameraNear;
uniform float cameraFar;
uniform vec2 resolution;

// Texture vs procedural balance
uniform float textureStrength;
uniform float scrollSpeed;
uniform float causticStrength;
uniform float foamStrength;

// Depth fog toggle (disabled on mobile for performance)
uniform float useDepthFog;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec3 vViewDirection;
varying vec2 vUv;
varying float vDepth;
varying float vSunBrightness; // Day/night based on position relative to sun

// Convert depth buffer value to linear depth
float linearizeDepth(float depth) {
  float z = depth * 2.0 - 1.0; // Back to NDC
  return (2.0 * cameraNear * cameraFar) / (cameraFar + cameraNear - z * (cameraFar - cameraNear));
}

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

  // Fog factor and color based on whether camera is above or below water
  float depthFogFactor = 0.0;
  vec3 currentFogColor = aboveWaterFogColor;

  // Only calculate depth-based fog if enabled (disabled on mobile for performance)
  if (useDepthFog > 0.5) {
    // Calculate screen coordinates for depth sampling
    vec2 screenCoord = gl_FragCoord.xy / resolution;

    // Sample scene depth (terrain behind water) - this is z-distance in view space
    float sceneDepthRaw = texture2D(depthTexture, screenCoord).r;
    float sceneDepthZ = linearizeDepth(sceneDepthRaw);
    float waterSurfaceDepthZ = linearizeDepth(gl_FragCoord.z);

    // Convert z-depths to actual world-space distances from camera
    // For a perspective camera: worldDist = zDepth / cos(angle) = zDepth / dot(viewDir, cameraForward)
    // But we can simplify: worldDist = zDepth * (1 / cos(angle))
    // The view direction is normalized, so we need to account for the angle from center
    // Actually, for each pixel: worldDistance = zDepth / dot(normalize(viewRay), cameraForward)
    // Since vViewDirection is the direction TO the camera, we use it directly
    // The ratio between z-depth and world distance is the same for water surface and scene
    // So: sceneWorldDist / waterWorldDist = sceneDepthZ / waterSurfaceDepthZ
    // And: waterWorldDist = vDepth (we already have this from vertex shader)
    // Therefore: sceneWorldDist = vDepth * (sceneDepthZ / waterSurfaceDepthZ)

    float sceneWorldDist = vDepth * (sceneDepthZ / max(waterSurfaceDepthZ, 0.001));
    float underwaterWorldDist = max(0.0, sceneWorldDist - vDepth);

    if (isUnderwater < 0.5) {
      // Above water: fog based on distance light travels through water to reach terrain
      depthFogFactor = clamp((underwaterWorldDist - aboveWaterFogNear) / (aboveWaterFogFar - aboveWaterFogNear), 0.0, 1.0);
      currentFogColor = aboveWaterFogColor;
    } else {
      // Underwater: fog based on distance from camera to water surface
      depthFogFactor = clamp((vDepth - underwaterFogNear) / (underwaterFogFar - underwaterFogNear), 0.0, 1.0);
      currentFogColor = underwaterFogColor;
    }
  }

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

  // Base water color
  vec3 baseWaterColor = mix(waterColor, deepWaterColor, 0.5);

  // Mix texture with base color using configurable texture strength
  vec3 texturedWater = mix(baseWaterColor, texColor.rgb, textureStrength);

  // Apply fresnel-based reflection blending
  float reflectionAmount = fresnel * reflectionStrength;
  vec3 finalColor = mix(texturedWater, reflectionColor, reflectionAmount);

  // Add procedural caustic shimmer
  float caustic = fbm(finalUv * 6.0 + time * 0.15) * causticStrength;
  finalColor += vec3(caustic);

  // Edge foam effect with configurable strength
  float foamNoise = fbm(finalUv * 15.0 + time * 0.3);
  float foam = smoothstep(0.4, 0.6, foamNoise) * foamStrength;
  vec3 foamColor = vec3(0.9, 0.95, 1.0);
  finalColor = mix(finalColor, foamColor, foam);

  // Base opacity with fresnel effect
  float finalOpacity = mix(opacity, 0.95, fresnel * 0.5);

  // Apply day/night dimming based on sun position
  // Water on the dark side of the planet should be much darker
  float dayNightFactor = mix(0.1, 1.0, vSunBrightness); // 10% at night, 100% at day
  finalColor *= dayNightFactor;

  // Also dim specular/reflections on dark side (already calculated, apply reduction)
  // This prevents bright reflections on the night side

  // Apply fog (each direction uses its own fog color)
  finalColor = mix(finalColor, currentFogColor * dayNightFactor, depthFogFactor);

  // Make more opaque as fog increases
  finalOpacity = mix(finalOpacity, 1.0, depthFogFactor);

  gl_FragColor = vec4(finalColor, finalOpacity);
}
