// Rocket part fragment shader with adaptive lighting
// When in gravity well (> 50%), uses identical lighting to tech shader
// When leaving gravity well, transitions to space lighting
precision highp float;

uniform sampler2D techTexture;
uniform vec3 sunDirection;
uniform float ambientIntensity;
uniform float directionalIntensity;
uniform float torchLight; // Torch light level (0-1+) passed as uniform

// Torch light color (warm orange)
const vec3 TORCH_LIGHT_COLOR = vec3(1.0, 0.7, 0.3);

// Gravity well threshold - above this value, use planet surface lighting
const float GRAVITY_WELL_THRESHOLD = 0.5;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;
varying float vSunBrightness;
varying float vGravityWellStrength;
varying float vAltitude;

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

  vec3 finalColor;

  // Check which lighting mode to use
  if (vGravityWellStrength > GRAVITY_WELL_THRESHOLD) {
    // MODE 1: Planet surface lighting (gravity well > 50%)
    // Uses identical lighting to tech shader

    // Directional light: direct sunlight on the face
    float directional = meshDiffuse * vSunBrightness * directionalIntensity;

    // Ambient light: transitions from 10% on dark side to full on day side
    float ambientDayNight = mix(0.1, 1.0, vSunBrightness);
    float ambient = ambientIntensity * ambientDayNight;

    // Final lighting: ambient provides base, directional adds on top
    float lighting = ambient + directional;
    finalColor = texColor.rgb * lighting;

    // Add torch light with warm orange color
    if (torchLight > 0.0) {
      // Night factor - torch light is more visible in darkness
      float nightFactor = mix(0.3, 1.0, 1.0 - vSunBrightness);
      finalColor += texColor.rgb * TORCH_LIGHT_COLOR * torchLight * nightFactor;
    }
  } else {
    // MODE 2: Transitioning out of gravity well or in space
    // Blend between planet lighting and standard space lighting

    // Space lighting: standard directional (no day/night cycle)
    float spaceDirectional = meshDiffuse * directionalIntensity;
    float spaceAmbient = ambientIntensity * 0.6;
    float spaceLighting = spaceAmbient + spaceDirectional;
    vec3 spaceColor = texColor.rgb * spaceLighting;

    // Planet lighting (same as above)
    float planetDirectional = meshDiffuse * vSunBrightness * directionalIntensity;
    float planetAmbientDayNight = mix(0.1, 1.0, vSunBrightness);
    float planetAmbient = ambientIntensity * planetAmbientDayNight;
    float planetLighting = planetAmbient + planetDirectional;
    vec3 planetColor = texColor.rgb * planetLighting;

    // Add torch light to planet color
    if (torchLight > 0.0) {
      float nightFactor = mix(0.3, 1.0, 1.0 - vSunBrightness);
      planetColor += texColor.rgb * TORCH_LIGHT_COLOR * torchLight * nightFactor;
    }

    // Blend based on gravity well strength (smooth transition)
    // Normalize the blend factor for the 0-0.5 range
    float blendFactor = vGravityWellStrength / GRAVITY_WELL_THRESHOLD;
    finalColor = mix(spaceColor, planetColor, blendFactor);
  }

  gl_FragColor = vec4(finalColor, texColor.a);
}
