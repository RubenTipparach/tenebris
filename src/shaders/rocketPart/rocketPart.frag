// Rocket part fragment shader. Inside the gravity well it is lit exactly as
// the tech shader lights machines and the launch pad (and the terrain): the
// sun through the air and the sky's fill from the planet's sky light table,
// plus nearby torches. Climbing out it blends over to plain space lighting.
precision highp float;

uniform sampler2D techTexture;
uniform vec3 sunDirection;
uniform float ambientIntensity;
uniform float directionalIntensity;

// Gravity well strength above which the part takes the planet's light only
const float GRAVITY_WELL_THRESHOLD = 0.5;
// Space: the share of ambient light out of the planet's shadow and sky
const float SPACE_AMBIENT_SHARE = 0.6;

varying vec3 vNormal;
varying vec3 vWorldPosition;
varying vec2 vUv;
varying float vSunFacing;
varying float vGravityWellStrength;

#include <tenebris_sky_light>
#include <tenebris_torch_light>

void main() {
  vec4 texColor = texture2D(techTexture, vUv);
  if (texColor.a < 0.5) discard;

  // Flip normal for back faces (needed for double-sided rendering)
  vec3 normal = gl_FrontFacing ? vNormal : -vNormal;
  float meshDiffuse = max(0.0, dot(normal, sunDirection));

  // The planet's light (tech.frag): sky fill + the sun through the air + torches
  vec3 planetLight = skyFill(vSunFacing) * ambientIntensity + skySun(vSunFacing) * meshDiffuse * directionalIntensity;
  vec3 planetColor = texColor.rgb * planetLight + torchGlow(texColor.rgb, vWorldPosition, vSunFacing);

  // Space: the bare sun, no day/night
  vec3 spaceColor = texColor.rgb * (ambientIntensity * SPACE_AMBIENT_SHARE + meshDiffuse * directionalIntensity);

  float planetShare = clamp(vGravityWellStrength / GRAVITY_WELL_THRESHOLD, 0.0, 1.0);
  gl_FragColor = vec4(mix(spaceColor, planetColor, planetShare), texColor.a);
}
