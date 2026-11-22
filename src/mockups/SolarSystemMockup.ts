import * as THREE from 'three';
import { GAS_GIANTS, GAS_GIANT_RING_OUTER } from '../config/SolarSystemConfig';

/**
 * The gas giants: Brontes and Aurelia, out past the rock worlds.
 *
 * Visual only - not landable, no terrain, no gravity (the landable planets,
 * moons and asteroids are real Planets from SolarSystemConfig). Each giant
 * is a procedurally shaded banded sphere lit by the star, with rings. They
 * stand still at their GAS_GIANTS positions (size and place live there), so
 * their landable moons stay beside them. Name tags show in space only.
 * Drawn in the engine's far layer (floating origin), so the 1e6 far plane
 * keeps them in view.
 */

type Kind = 'rocky' | 'icy' | 'desert' | 'ocean' | 'lava' | 'gas';

interface BodySpec {
  id: string;           // its GAS_GIANTS entry: name, radius, position
  kind: Kind;
  colors: [number, number, number];
  rings?: boolean;
  atmosphere?: number;  // glow colour
}

const BODIES: BodySpec[] = [
  { id: 'brontes', kind: 'gas', colors: [0x8a5a34, 0xd9b38c, 0xf5e6d0], rings: true, atmosphere: 0xcfe0ff },
  { id: 'aurelia', kind: 'gas', colors: [0x6b5a2b, 0xe0c068, 0xfff1c2], rings: true, atmosphere: 0xffe8b8 },
];

/**
 * How the giants look (the owner: "better ring shaders, and have planet cast
 * shadow over the rings ... gas giants have atmospheres too"). Shared by the
 * planet, ring and haze shaders.
 */
const GIANT_LOOK = {
  // Rings: brightness of the lit side vs seen against the sun (forward scatter)
  RING_LIT: 0.95,
  RING_FORWARD: 0.6,
  RING_UNLIT: 0.22,            // the unlit face: light that gets through the ring
  RING_OPACITY: 0.85,          // densest ringlet's cover
  RING_SHADOW_SOFT: 0.03,      // the planet's shadow edge on the rings, in radii
  RING_SHADOW_ON_PLANET: 0.75, // how dark the rings' shadow falls on the cloud tops
  // Atmosphere: the haze shell's thickness and how much of the limb it hazes
  HAZE_RADIUS: 1.08,           // the haze shell's outer edge, in giant radii
  HAZE_SCALE_HEIGHT: 0.22,     // density falls by e over this share of the shell
  HAZE_DENSITY: 1.6,           // how opaque a full limb path is
  HAZE_SAMPLES: 8,             // steps along the view ray through the shell
  HAZE_STRENGTH: 0.9,
  LIMB_DARKENING: 0.45,        // the disc's edge is this much darker
  TERMINATOR_TINT: [1.0, 0.55, 0.3] as [number, number, number],  // haze along the day/night line
  // Clouds (owner: "really cool cloud like shaders with normals on gas
  // giants"): a cloud height field of warped bands, eddies and a storm,
  // shaded through its own normals, the bands sliding past each other
  CLOUD_BANDS: 16,             // bands from pole to pole
  CLOUD_WARP: 0.3,             // how far the bands fold and swirl
  CLOUD_BUMP: 0.55,            // how strongly the height field tilts the normal
  CLOUD_FLOW: 0.004,           // band drift (radians/s), opposite ways by latitude
  STORM_LAT: -0.32,            // the great storm's latitude (sine)
  STORM_SIZE: 0.16,            // its radius, as a share of the giant's
  STORM_COLOUR: [0.75, 0.32, 0.18] as [number, number, number],
};

/**
 * One ring density function for the ring shader and the shadow it casts on
 * the planet: ringlets of varied width and density, a broad dark gap, and a
 * fine grain - radius r in giant radii.
 */
const ringDensityGlsl = `
  uniform float ringInner;
  uniform float ringOuter;
  uniform float ringSeed;
  float rHash(float x) { return fract(sin(x * 91.17 + ringSeed) * 43758.5453); }
  float rNoise(float x) { float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(rHash(i), rHash(i + 1.0), f); }
  float ringDensity(float r) {
    float t = (r - ringInner) / (ringOuter - ringInner);
    if (t <= 0.0 || t >= 1.0) return 0.0;
    float d = 0.55 * rNoise(t * 14.0) + 0.3 * rNoise(t * 47.0) + 0.15 * rNoise(t * 160.0);
    d = smoothstep(0.25, 0.85, d);
    // a broad gap two thirds out (a Cassini division), and soft inner/outer edges
    d *= 1.0 - 0.9 * (1.0 - smoothstep(0.0, 0.035, abs(t - 0.66)));
    d *= smoothstep(0.0, 0.06, t) * (1.0 - smoothstep(0.9, 1.0, t));
    return d;
  }
`;

const SPIN_RATE = 0.05;          // rad/s
const RING_INNER = 1.4;          // ring band, in giant radii
const RING_TILT = Math.PI / 2 - 0.6;
const KIND_ID: Record<Kind, number> = { rocky: 0, icy: 1, desert: 2, ocean: 3, lava: 4, gas: 5 };

const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vLocal;
  varying vec3 vWorld;
  varying vec3 vEast;
  varying vec3 vNorth;
  void main() {
    vLocal = normalize(position);
    vNormal = normalize(mat3(modelMatrix) * normal);
    // the surface's east and north, in world space (for the cloud normals)
    vec3 east = normalize(cross(vec3(0.0, 1.0, 0.0), vLocal) + vec3(1e-5, 0.0, 0.0));
    vEast = normalize(mat3(modelMatrix) * east);
    vNorth = normalize(mat3(modelMatrix) * cross(vLocal, east));
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const fragmentShader = `
  uniform vec3 sunPosition;
  uniform vec3 planetCenter;
  uniform float planetRadius;
  uniform vec3 ringNormal;     // world normal of the ring plane (0 = no rings)
  uniform float ringShadow;
  uniform vec3 hazeColor;
  uniform float hazeStrength;
  uniform float limbDarkening;
  uniform vec3 terminatorTint;
  uniform float time;
  uniform float cloudBands;
  uniform float cloudWarp;
  uniform float cloudBump;
  uniform float cloudFlow;
  uniform float stormLat;
  uniform float stormSize;
  uniform vec3 stormColour;
  varying vec3 vEast;
  varying vec3 vNorth;
  ${ringDensityGlsl}
  uniform vec3 c0;
  uniform vec3 c1;
  uniform vec3 c2;
  uniform float kind;
  uniform float seed;
  varying vec3 vNormal;
  varying vec3 vLocal;
  varying vec3 vWorld;

  float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7)) + seed) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) { float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++) { s += a * noise(p); p *= 2.03; a *= 0.5; } return s; }

  // The bands slide: each latitude turns about the axis at its own speed,
  // neighbouring bands opposite ways
  vec3 flowed(vec3 p) {
    float a = time * cloudFlow * sin(p.y * cloudBands * 0.5);
    float c = cos(a), s = sin(a);
    return vec3(c * p.x - s * p.z, p.y, s * p.x + c * p.z);
  }
  // The great storm: an oval at stormLat, its swirl turning the clouds round it
  float storm(vec3 p) {
    vec3 centre = normalize(vec3(0.0, stormLat, sqrt(1.0 - stormLat * stormLat)));
    vec3 d = p - centre;
    return 1.0 - smoothstep(0.0, stormSize, length(vec2(dot(d, vec3(1.0, 0.0, 0.0)) * 0.6, d.y)));
  }
  // Cloud height: bands folded by a domain warp, eddies, the storm's swirl
  float cloudHeight(vec3 p) {
    vec3 q = flowed(p);
    float st = storm(p);
    // swirl round the storm
    float ang = st * st * 3.0;
    q.xz = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * q.xz;
    vec3 w = q + cloudWarp * vec3(fbm(q * 3.0), fbm(q * 3.0 + 7.3), fbm(q * 3.0 + 3.1)) - cloudWarp * 0.5;
    float band = sin((w.y + 0.1 * fbm(w * 5.0)) * cloudBands) * 0.5 + 0.5;
    float eddies = fbm(w * 9.0 + band * 2.0);
    return mix(band * 0.65 + eddies * 0.35, 0.9 + 0.1 * eddies, st);
  }

  void main() {
    vec3 p = vLocal;
    vec3 col;
    float n = fbm(p * 3.0);
    vec3 Nbump = normalize(vNormal);
    if (kind > 4.5) {
      // gas giant: a cloud height field, coloured by height and lit through
      // its own normals so every swirl and billow has a lit and a dark side
      float h = cloudHeight(p);
      float e = 0.004;
      float he = cloudHeight(normalize(p + normalize(cross(vec3(0.0, 1.0, 0.0), p) + vec3(1e-5, 0.0, 0.0)) * e));
      float hn = cloudHeight(normalize(p + vec3(0.0, e, 0.0)));
      Nbump = normalize(normalize(vNormal) - cloudBump * ((he - h) / e * vEast + (hn - h) / e * vNorth) * 0.05);
      // dark belts low, pale zones high, the palest only on the tallest billows
      col = mix(c0, c1, smoothstep(0.25, 0.7, h));
      col = mix(col, c2, smoothstep(0.82, 1.0, h) * 0.8);
      col = mix(col, stormColour, storm(p) * 0.85);
    } else if (kind > 3.5) {
      // lava: dark crust, glowing cracks
      float crack = smoothstep(0.48, 0.52, n);
      col = mix(c1 * 1.4, c0, crack) + c2 * pow(1.0 - crack, 4.0) * 0.6;
    } else if (kind > 2.5) {
      // ocean world: islands + polar ice
      col = n > 0.58 ? mix(c1, c2 * 0.8, 0.3) : mix(c0, c1, n);
      col = mix(col, c2, smoothstep(0.75, 0.9, abs(p.y)));
    } else {
      col = mix(c0, c1, smoothstep(0.3, 0.7, n));
      col = mix(col, c2, smoothstep(0.65, 0.85, fbm(p * 7.0)));
      if (kind > 0.5 && kind < 1.5) col = mix(col, c2, smoothstep(0.5, 0.8, abs(p.y)));
    }
    vec3 N = normalize(vNormal);
    vec3 L = normalize(sunPosition - vWorld);
    vec3 V = normalize(cameraPosition - vWorld);
    float ndl = dot(N, L);
    float diff = max(0.0, dot(Nbump, L)) * smoothstep(-0.05, 0.1, ndl);
    // the rings' shadow on the cloud tops: the ray to the sun through the ring plane
    float shade = 1.0;
    if (dot(ringNormal, ringNormal) > 0.5) {
      float den = dot(L, ringNormal);
      if (abs(den) > 1e-4) {
        float t = dot(planetCenter - vWorld, ringNormal) / den;
        if (t > 0.0) {
          float r = length(vWorld + L * t - planetCenter) / planetRadius;
          shade = 1.0 - ringShadow * ringDensity(r);
        }
      }
    }
    vec3 lit = col * (0.06 + 0.94 * diff * shade);
    // limb darkening, and haze over the limb on the day side
    float facing = max(0.0, dot(N, V));
    lit *= mix(1.0 - limbDarkening, 1.0, pow(facing, 0.5));
    float rim = pow(1.0 - facing, 2.0);
    vec3 haze = mix(hazeColor * terminatorTint, hazeColor, smoothstep(0.0, 0.45, ndl));
    lit += haze * rim * hazeStrength * smoothstep(-0.15, 0.3, ndl) * 0.25;
    if (kind > 3.5 && kind < 4.5) lit += c2 * pow(1.0 - smoothstep(0.48, 0.52, n), 4.0) * 0.5; // lava glows on the night side
    gl_FragColor = vec4(lit, 1.0);
  }
`;

// The atmosphere: a haze shell round the giant - blue-white (its own tint)
// by day, warming along the day/night line, gone on the night side
const glowShader = {
  vertexShader: `
    varying vec3 vNormal;
    varying vec3 vWorld;
    void main() {
      vNormal = normalize(mat3(modelMatrix) * normal);
      vec4 w = modelMatrix * vec4(position, 1.0);
      vWorld = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }
  `,
  // Soft by construction: the haze is integrated along the view ray through
  // the shell, thinning with height, so a ray grazing the shell's outer edge
  // crosses almost none (no hard border) and one skimming the limb the most
  fragmentShader: `
    uniform vec3 glowColor;
    uniform vec3 sunPosition;
    uniform vec3 planetCenter;
    uniform float planetRadius;
    uniform float shellRadius;
    uniform float scaleHeight;
    uniform float hazeDensity;
    uniform float hazeStrength;
    uniform vec3 terminatorTint;
    varying vec3 vNormal;
    varying vec3 vWorld;
    #define MAX_HAZE_SAMPLES 16
    uniform int hazeSamples;
    vec2 hitSphere(vec3 ro, vec3 rd, float r) {
      vec3 oc = ro - planetCenter;
      float b = dot(oc, rd), c = dot(oc, oc) - r * r, d = b * b - c;
      if (d < 0.0) return vec2(-1.0);
      float s = sqrt(d);
      return vec2(-b - s, -b + s);
    }
    void main() {
      vec3 ro = cameraPosition;
      vec3 rd = normalize(vWorld - cameraPosition);
      vec2 shell = hitSphere(ro, rd, shellRadius);
      float t0 = max(shell.x, 0.0), t1 = shell.y;
      vec2 core = hitSphere(ro, rd, planetRadius);
      if (core.x > 0.0) t1 = min(t1, core.x);
      if (t1 <= t0) discard;
      float step = (t1 - t0) / float(hazeSamples);
      float thick = shellRadius - planetRadius;
      float depth = 0.0, light = 0.0, warm = 0.0;
      for (int i = 0; i < MAX_HAZE_SAMPLES; i++) {
        if (i >= hazeSamples) break;
        vec3 p = ro + rd * (t0 + step * (float(i) + 0.5));
        vec3 up = normalize(p - planetCenter);
        float h = clamp((length(p - planetCenter) - planetRadius) / thick, 0.0, 1.0);
        float dens = exp(-h / scaleHeight) * step / thick;
        float ndl = dot(up, normalize(sunPosition - p));
        depth += dens;
        light += dens * smoothstep(-0.25, 0.35, ndl);
        warm += dens * (1.0 - smoothstep(0.0, 0.5, ndl));
      }
      float cover = 1.0 - exp(-depth * hazeDensity);
      float lit = depth > 0.0 ? light / depth : 0.0;
      float terminator = depth > 0.0 ? warm / depth : 0.0;
      vec3 col = mix(glowColor, glowColor * terminatorTint, terminator);
      gl_FragColor = vec4(col, cover * lit * hazeStrength);
    }
  `,
};

// The rings: ringlets from ringDensity, lit by the sun on the lit face and
// glowing when seen against it (forward scatter), in the planet's shadow
// where the ray to the sun meets the planet (soft edge)
const ringShader = {
  vertexShader: `
    varying vec3 vWorld;
    varying vec2 vRing;
    void main() {
      vRing = position.xy;
      vec4 w = modelMatrix * vec4(position, 1.0);
      vWorld = w.xyz;
      gl_Position = projectionMatrix * viewMatrix * w;
    }
  `,
  fragmentShader: `
    uniform vec3 sunPosition;
    uniform vec3 planetCenter;
    uniform float planetRadius;
    uniform vec3 ringNormal;
    uniform vec3 c0;
    uniform vec3 c1;
    uniform vec3 c2;
    uniform float ringLit;
    uniform float ringForward;
    uniform float ringUnlit;
    uniform float ringOpacity;
    uniform float shadowSoft;
    ${ringDensityGlsl}
    varying vec3 vWorld;
    varying vec2 vRing;
    void main() {
      float r = length(vRing) / planetRadius;
      float d = ringDensity(r);
      if (d < 0.01) discard;
      float t = (r - ringInner) / (ringOuter - ringInner);
      // colour: dusty inner, bright middle, pale outer, by ringlet
      vec3 col = mix(mix(c0, c1, smoothstep(0.0, 0.45, t)), c2, smoothstep(0.45, 1.0, t));
      col *= 0.75 + 0.35 * rNoise(t * 90.0);
      vec3 L = normalize(sunPosition - vWorld);
      vec3 V = normalize(cameraPosition - vWorld);
      // lit side vs seen against the sun: forward scatter through the ring
      float sameSide = sign(dot(L, ringNormal)) * sign(dot(V, ringNormal));
      float light = sameSide > 0.0 ? ringLit * (0.35 + 0.65 * abs(dot(L, ringNormal))) : ringForward * pow(max(0.0, dot(-V, L)), 2.0) + ringUnlit * (1.0 - d) * abs(dot(L, ringNormal)) + 0.06;
      // the planet's shadow: does the ray to the sun meet the planet?
      vec3 oc = vWorld - planetCenter;
      float b = dot(oc, L);
      float miss = 1.0;
      if (b < 0.0) {
        float closest = sqrt(max(dot(oc, oc) - b * b, 0.0)) / planetRadius;
        miss = smoothstep(1.0 - shadowSoft, 1.0 + shadowSoft, closest);
      }
      gl_FragColor = vec4(col * light * (0.04 + 0.96 * miss), d * ringOpacity);
    }
  `,
};

interface Body {
  spec: BodySpec;
  guides: THREE.Object3D[];   // name tag (space only)
  holder: THREE.Group;        // at the giant's position (moves on its orbit)
  spin: number;               // its own slow turn (radians)
  ring: THREE.Mesh | null;
  uniforms: { planetCenter: { value: THREE.Vector3 }; ringNormal: { value: THREE.Vector3 } };
}

export class SolarSystemMockup {
  private root = new THREE.Group();
  private bodies: Body[] = [];
  private enabled = false;

  // Sun position relative to the far layer's floating origin, shared by
  // every material
  private sunUniform = { value: new THREE.Vector3() };
  // The clouds' clock (their bands drift)
  private timeUniform = { value: 0 };

  // scene: the engine's far layer root (world coordinates, floating origin)
  constructor(scene: THREE.Object3D, private sunPosition: THREE.Vector3, private origin: THREE.Vector3) {
    this.root.visible = false;
    this.root.name = 'solarSystemMockup';
    scene.add(this.root);
    BODIES.forEach((spec, i) => this.bodies.push(this.makeBody(spec, i)));
  }

  public setEnabled(on: boolean): void {
    this.enabled = on;
    this.root.visible = on;
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  // showGuides: draw the name tags (in space; from the ground they would
  // hang in the daytime sky)
  public update(dt: number, showGuides: boolean): void {
    if (!this.enabled) return;
    this.sunUniform.value.copy(this.sunPosition).sub(this.origin);
    this.timeUniform.value += dt;
    for (const b of this.bodies) {
      for (const g of b.guides) g.visible = showGuides;
      b.spin += dt * SPIN_RATE; // slow spin
      b.holder.rotation.y = b.spin - this.frameYaw;
      // where it is and how its rings lie, for the shadows both ways
      b.holder.updateMatrixWorld();
      b.holder.getWorldPosition(b.uniforms.planetCenter.value);
      if (b.ring) b.uniforms.ringNormal.value.set(0, 0, 1).transformDirection(b.ring.matrixWorld);
    }
  }

  // The reference frame's turn (openspec day-night): the giants' positions
  // come turned from the orbits; this turns their bands and rings with it
  private frameYaw = 0;
  public setFrameYaw(yaw: number): void {
    this.frameYaw = yaw;
  }

  /** A giant moved on its orbit (world position, far-layer coordinates). */
  public setBodyPosition(id: string, position: { x: number; y: number; z: number }): void {
    for (const b of this.bodies) if (b.spec.id === id) b.holder.position.set(position.x, position.y, position.z);
  }

  private makeBody(spec: BodySpec, index: number): Body {
    const giant = GAS_GIANTS.find(g => g.id === spec.id)!;
    const radius = giant.radius;
    const holder = new THREE.Group();
    holder.position.set(giant.position.x, giant.position.y, giant.position.z);
    this.root.add(holder);

    const c = spec.colors.map(h => new THREE.Color(h));
    const G = GIANT_LOOK;
    const uniforms = { planetCenter: { value: new THREE.Vector3() }, ringNormal: { value: new THREE.Vector3() } };
    const ringShape = {
      ringInner: { value: RING_INNER }, ringOuter: { value: GAS_GIANT_RING_OUTER }, ringSeed: { value: index * 7.1 },
    };
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 64, 40),
      new THREE.ShaderMaterial({
        uniforms: {
          ...ringShape,
          planetCenter: uniforms.planetCenter,
          planetRadius: { value: radius },
          ringNormal: uniforms.ringNormal,
          ringShadow: { value: G.RING_SHADOW_ON_PLANET },
          hazeColor: { value: new THREE.Color(spec.atmosphere ?? 0x000000) },
          hazeStrength: { value: spec.atmosphere !== undefined ? G.HAZE_STRENGTH : 0 },
          limbDarkening: { value: G.LIMB_DARKENING },
          terminatorTint: { value: new THREE.Vector3(...G.TERMINATOR_TINT) },
          sunPosition: this.sunUniform,
          c0: { value: c[0] }, c1: { value: c[1] }, c2: { value: c[2] },
          kind: { value: KIND_ID[spec.kind] },
          seed: { value: index * 17.3 },
          time: this.timeUniform,
          cloudBands: { value: G.CLOUD_BANDS }, cloudWarp: { value: G.CLOUD_WARP }, cloudBump: { value: G.CLOUD_BUMP },
          cloudFlow: { value: G.CLOUD_FLOW }, stormLat: { value: G.STORM_LAT }, stormSize: { value: G.STORM_SIZE },
          stormColour: { value: new THREE.Vector3(...G.STORM_COLOUR) },
        },
        vertexShader,
        fragmentShader,
      })
    );
    holder.add(planet);

    if (spec.atmosphere !== undefined) {
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(radius * G.HAZE_RADIUS, 64, 40),
        new THREE.ShaderMaterial({
          uniforms: {
            glowColor: { value: new THREE.Color(spec.atmosphere) }, sunPosition: this.sunUniform,
            planetCenter: uniforms.planetCenter, planetRadius: { value: radius },
            shellRadius: { value: radius * G.HAZE_RADIUS }, scaleHeight: { value: G.HAZE_SCALE_HEIGHT },
            hazeDensity: { value: G.HAZE_DENSITY }, hazeSamples: { value: G.HAZE_SAMPLES },
            hazeStrength: { value: G.HAZE_STRENGTH },
            terminatorTint: { value: new THREE.Vector3(...G.TERMINATOR_TINT) },
          },
          vertexShader: glowShader.vertexShader,
          fragmentShader: glowShader.fragmentShader,
          transparent: true,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.FrontSide,
        })
      );
      holder.add(glow);
    }

    let ring: THREE.Mesh | null = null;
    if (spec.rings) {
      ring = new THREE.Mesh(
        new THREE.RingGeometry(radius * RING_INNER, radius * GAS_GIANT_RING_OUTER, 256, 1),
        new THREE.ShaderMaterial({
          uniforms: {
            ...ringShape,
            sunPosition: this.sunUniform,
            planetCenter: uniforms.planetCenter,
            planetRadius: { value: radius },
            ringNormal: uniforms.ringNormal,
            c0: { value: c[0].clone().lerp(c[1], 0.3) }, c1: { value: c[1] }, c2: { value: c[2] },
            ringLit: { value: G.RING_LIT }, ringForward: { value: G.RING_FORWARD }, ringUnlit: { value: G.RING_UNLIT },
            ringOpacity: { value: G.RING_OPACITY }, shadowSoft: { value: G.RING_SHADOW_SOFT },
          },
          vertexShader: ringShader.vertexShader,
          fragmentShader: ringShader.fragmentShader,
          side: THREE.DoubleSide,
          transparent: true,
          depthWrite: false,
        })
      );
      ring.rotation.x = RING_TILT;
      holder.add(ring);
    }

    const label = this.makeLabel(giant.name, radius);
    holder.add(label);

    return { spec, guides: [label], holder, spin: 0, ring, uniforms };
  }

  private makeLabel(name: string, radius: number): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 6;
    ctx.fillText(name, 128, 44);
    // sizeAttenuation off: the tag stays readable from across the system
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), sizeAttenuation: false, depthTest: false, transparent: true }));
    sprite.scale.set(0.12, 0.03, 1);
    sprite.position.y = radius * 1.3;
    sprite.renderOrder = 10;
    return sprite;
  }
}
