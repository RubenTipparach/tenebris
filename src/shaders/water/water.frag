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
uniform float uvTiling;
// The flow texture (src/water/LiquidMesh.ts liquidFlow, WaterConfig TEX_* / FOAM_*)
uniform sampler2D waterFlowTile;   // a: each water.png pixel's tone / 2
uniform vec3 waterTileMean;        // the tile's mean colour (what it fades to far off)
uniform vec2 texFade;              // the tile fades out between these distances
uniform vec2 texTexelFade;         // ... and between these texels per screen pixel
uniform float texSize;             // the tile's texels across
uniform vec2 rippleTone;           // x: a ripple's mix toward the sky, y: its lift
uniform float glintFoam;           // a glint's mix toward the foam colour
uniform vec3 foamColor;            // caps' foam
uniform vec3 fallFoamColor;        // falling sides' froth (water blue)
uniform vec4 fallFroth;            // base, + on ripples, + on glints, scale
uniform float frothJitter;         // the blocky pixels' share of the froth
uniform vec3 capFoam;              // fast caps: threshold, speed k, strength
uniform float foamMax;
uniform float fallAlpha;
varying vec2 vTileUv;
varying vec2 vFrothUv;
varying vec3 vFlowCap;
varying vec2 vFoamUv;

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
varying float vSunHeight;
#include <tenebris_sky_light>

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
  // The camera's distance to this fragment, exact per fragment (vDepth is
  // interpolated per vertex, which overshoots badly when the camera is close
  // to a big face: 0.3 m over the sea it read as metres, and the sea went
  // opaque)
  float fragDist = length(cameraPosition - vWorldPosition);

  // The flow texture (Pale Blue Dot's water-look.js, Tenebris C's water_fs):
  // Tenebris's water tile, public/textures/water.png (= tenebris-rs/assets/
  // textures/water.png), nearest-sampled at the coordinates water.vert
  // pans - along a cap's flow, down a flowing side. Its alpha is each
  // pixel's tone: 0 the body, 1 a ripple, 2 a glint. The water itself takes
  // the tile's mean colour (the texture's share of the base colour, as the
  // old scrolled texture averaged out), and the tones are drawn on top as
  // Pale Blue Dot draws them, fading out with distance so the 12 cm pixels
  // never shimmer far off or from orbit.
  // (and as a screen pixel spans more than about one texel: at a grazing
  // angle a near pixel covers many, and nearest sampling sparkles there)
  float texelsPerPixel = length(fwidth(vTileUv)) * texSize;
  float tk = (1.0 - smoothstep(texFade.x, texFade.y, fragDist))
           * (1.0 - smoothstep(texTexelFade.x, texTexelFade.y, texelsPerPixel));
  float tone = texture2D(waterFlowTile, vTileUv).a * 2.0;
  float rip = step(0.5, tone) * tk, glint = step(1.5, tone) * tk;
  vec4 texColor = vec4(waterTileMean, 1.0);
  vec2 baseUv = vUv * uvTiling;

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

    // The depth pass holds the nearer of the terrain and the water's own far
    // side (GameEngine.waterBackDepth), so this is the water's thickness
    // along the view ray
    float sceneWorldDist = fragDist * (sceneDepthZ / max(waterSurfaceDepthZ, 0.001));
    float underwaterWorldDist = max(0.0, sceneWorldDist - fragDist);

    if (isUnderwater < 0.5) {
      // Above water: fog based on distance light travels through water to reach terrain
      depthFogFactor = clamp((underwaterWorldDist - aboveWaterFogNear) / (aboveWaterFogFar - aboveWaterFogNear), 0.0, 1.0);
      currentFogColor = aboveWaterFogColor;
    } else {
      // Underwater: fog based on distance from camera to water surface
      depthFogFactor = clamp((fragDist - underwaterFogNear) / (underwaterFogFar - underwaterFogNear), 0.0, 1.0);
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

  // Light on the water: the sky light table's fill (openspec sky-lighting),
  // half its colour so the water keeps its own - dark at night, lit by a
  // glowing dusk sky
  vec3 skyF = skyFill(vSunHeight);
  vec3 dayNightFactor = mix(vec3(dot(skyF, vec3(0.2126, 0.7152, 0.0722))), skyF, 0.5);
  finalColor *= dayNightFactor;

  // Also dim specular/reflections on dark side (already calculated, apply reduction)
  // This prevents bright reflections on the night side

  // Apply fog (each direction uses its own fog color). Under water the
  // surface fades to the same fog colour as the terrain shader, the scene fog
  // and the cleared background, so the view ends in one colour
  vec3 fogTarget = isUnderwater > 0.5 ? currentFogColor : currentFogColor * dayNightFactor;
  finalColor = mix(finalColor, fogTarget, depthFogFactor);

  // Make more opaque as fog increases
  finalOpacity = mix(finalOpacity, 1.0, depthFogFactor);

  // The flow texture's three tones, and the froth, on the surface - over the
  // tint of the water under it, so the deep sea shows them too (above water:
  // from below the surface keeps its fixed fog look). Lit like the water. A ripple is lifted toward the sky
  // the water mirrors, a glint mixed toward the foam; a fast cap foams in
  // blocky pixels drifting downstream; a flowing side froths a water blue in
  // pixels falling down it, and is near opaque - a sheet of falling water.
  float aw = 1.0 - isUnderwater;
  bool fallFace = vFlowCap.x > 0.5 && vFlowCap.x < 1.5;
  vec3 foamC = (fallFace ? fallFoamColor : foamColor) * dayNightFactor;
  vec3 ripC = mix(finalColor, skyColor * dayNightFactor, rippleTone.x) * rippleTone.y;
  finalColor = mix(finalColor, ripC, rip * (1.0 - glint) * aw);
  finalColor = mix(finalColor, foamC, glint * glintFoam * aw);
  float flowFoam = 0.0;
  if (vFlowCap.x < 0.5) {
    float nse = hash(floor(vFoamUv));
    float sp = vFlowCap.y;
    flowFoam = step(capFoam.x - capFoam.y * clamp(sp, 0.0, 1.5), nse) * clamp(sp, 0.0, 1.0) * capFoam.z * tk;
    flowFoam *= 1.0 - frothJitter + frothJitter * nse;
  } else if (fallFace) {
    float nse = hash(floor(vFrothUv));
    flowFoam = (fallFroth.x + fallFroth.y * rip + fallFroth.z * glint) * fallFroth.w;
    flowFoam *= 1.0 - frothJitter * tk + frothJitter * tk * nse;
  }
  flowFoam = min(flowFoam, foamMax) * aw;
  finalColor = mix(finalColor, foamC, flowFoam);
  finalOpacity = max(finalOpacity, flowFoam);
  if (fallFace) finalOpacity = mix(finalOpacity, max(finalOpacity, fallAlpha), aw);

  gl_FragColor = vec4(finalColor, finalOpacity);
}
