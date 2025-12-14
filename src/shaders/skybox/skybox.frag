precision highp float;

varying vec3 vDirection;

uniform float time;

//=============================================================================
// TWEAKABLE PARAMETERS
//=============================================================================

const float StarDensityLayer1 = 80.0;
const float StarDensityLayer2 = 160.0;
const float StarDensityLayer3 = 280.0;

const float StarSharpness = 0.02;
const float StarFalloff = 0.0;

const float StarBrightnessThreshold = 0.7;
const float StarBrightnessMultiplier = 1.2;

const float Layer1Intensity = 1.0;
const float Layer2Intensity = 0.7;
const float Layer3Intensity = 0.5;

const vec3 SpaceColor = vec3(0.0, 0.0, 0.02);
const vec3 StarColor = vec3(1.0, 0.98, 0.95);

// Nebula parameters
const vec3 NebulaColor1 = vec3(0.4, 0.1, 0.6);   // Purple
const vec3 NebulaColor2 = vec3(0.1, 0.3, 0.5);   // Blue
const vec3 NebulaColor3 = vec3(0.6, 0.2, 0.3);   // Red/pink
const float NebulaIntensity = 0.15;
const float NebulaScale = 2.0;

//=============================================================================
// HASH FUNCTIONS
//=============================================================================

float hash(float x) {
  return fract(x + 1.3215 * 1.8152);
}

float hash3(vec3 a) {
  return fract((hash(a.z * 42.8883) + hash(a.y * 36.9125) + hash(a.x * 65.4321)) * 291.1257);
}

vec3 rehash3(float x) {
  return vec3(
    hash(((x + 0.5283) * 59.3829) * 274.3487),
    hash(((x + 0.8192) * 83.6621) * 345.3871),
    hash(((x + 0.2157) * 36.6521) * 458.3971)
  );
}

float sqr(float x) {
  return x * x;
}

float fastdist(vec3 a, vec3 b) {
  return sqr(b.x - a.x) + sqr(b.y - a.y) + sqr(b.z - a.z);
}

//=============================================================================
// 3D SIMPLEX NOISE (for nebula)
//=============================================================================

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// Fractal Brownian Motion for layered noise
float fbm(vec3 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;

  for (int i = 0; i < 5; i++) {
    if (i >= octaves) break;
    value += amplitude * snoise(p * frequency);
    amplitude *= 0.5;
    frequency *= 2.0;
  }

  return value;
}

//=============================================================================
// VORONOI STARFIELD
//=============================================================================

void voronoi3D(vec3 pos, float density, out float dist, out float cellId) {
  pos *= density;

  float minDist = 9999.0;
  float id = 0.0;

  for (int x = -1; x < 2; x++) {
    for (int y = -1; y < 2; y++) {
      for (int z = -1; z < 2; z++) {
        vec3 cellPos = floor(pos) + vec3(float(x), float(y), float(z));
        float h = hash3(cellPos);
        vec3 starPos = rehash3(h) + cellPos;

        float d = fastdist(pos, starPos);
        if (d < minDist) {
          minDist = d;
          id = h;
        }
      }
    }
  }

  dist = minDist;
  cellId = id;
}

float starfield3D(vec3 dir, float density) {
  float voronoiDist, cellId;
  voronoi3D(dir, density, voronoiDist, cellId);

  float star = smoothstep(StarSharpness, StarFalloff, voronoiDist);
  float brightness = fract(cellId * 123.456);
  star *= step(StarBrightnessThreshold, brightness);

  return star * brightness * StarBrightnessMultiplier;
}

//=============================================================================
// NEBULA
//=============================================================================

vec3 nebula(vec3 dir) {
  vec3 p = dir * NebulaScale;

  // Multiple layers of noise for different nebula clouds
  float n1 = fbm(p * 1.0, 4);
  float n2 = fbm(p * 1.5 + vec3(100.0), 4);
  float n3 = fbm(p * 2.0 + vec3(200.0), 3);

  // Threshold and smooth the noise for cloud-like appearance
  n1 = smoothstep(0.1, 0.6, n1 * 0.5 + 0.5);
  n2 = smoothstep(0.2, 0.7, n2 * 0.5 + 0.5);
  n3 = smoothstep(0.15, 0.5, n3 * 0.5 + 0.5);

  // Mix colors based on noise layers
  vec3 nebColor = vec3(0.0);
  nebColor += NebulaColor1 * n1 * 0.4;
  nebColor += NebulaColor2 * n2 * 0.3;
  nebColor += NebulaColor3 * n3 * 0.3;

  return nebColor * NebulaIntensity;
}

//=============================================================================
// MAIN
//=============================================================================

void main() {
  // Normalize direction for consistent star positions
  // vDirection is the local position on the sphere, which equals the view direction
  vec3 dir = normalize(vDirection);

  // Generate starfield with three density layers (Voronoi-based)
  float stars = 0.0;
  stars += starfield3D(dir, StarDensityLayer1) * Layer1Intensity;
  stars += starfield3D(dir, StarDensityLayer2) * Layer2Intensity;
  stars += starfield3D(dir, StarDensityLayer3) * Layer3Intensity;

  // Generate nebula background
  vec3 nebColor = nebula(dir);

  // Composite: space background + nebula + stars
  vec3 color = SpaceColor + nebColor + stars * StarColor;

  gl_FragColor = vec4(color, 1.0);
}
