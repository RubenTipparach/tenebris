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
  { id: 'brontes', kind: 'gas', colors: [0x8a5a34, 0xd9b38c, 0xf5e6d0], rings: true },
  { id: 'aurelia', kind: 'gas', colors: [0x6b5a2b, 0xe0c068, 0xfff1c2], rings: true },
];

const SPIN_RATE = 0.05;          // rad/s
const RING_INNER = 1.4;          // ring band, in giant radii
const RING_TILT = Math.PI / 2 - 0.6;
const KIND_ID: Record<Kind, number> = { rocky: 0, icy: 1, desert: 2, ocean: 3, lava: 4, gas: 5 };

const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vLocal;
  varying vec3 vWorld;
  void main() {
    vLocal = normalize(position);
    vNormal = normalize(mat3(modelMatrix) * normal);
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const fragmentShader = `
  uniform vec3 sunPosition;
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

  void main() {
    vec3 p = vLocal;
    vec3 col;
    float n = fbm(p * 3.0);
    if (kind > 4.5) {
      // gas giant: latitude bands warped by noise
      float band = sin((p.y + 0.15 * fbm(p * 4.0)) * 18.0) * 0.5 + 0.5;
      col = mix(mix(c0, c1, band), c2, smoothstep(0.6, 0.9, fbm(p * 6.0 + band)));
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
    vec3 L = normalize(sunPosition - vWorld);
    float diff = max(0.0, dot(normalize(vNormal), L));
    vec3 lit = col * (0.06 + 0.94 * diff);
    if (kind > 3.5 && kind < 4.5) lit += c2 * pow(1.0 - smoothstep(0.48, 0.52, n), 4.0) * 0.5; // lava glows on the night side
    gl_FragColor = vec4(lit, 1.0);
  }
`;

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
  fragmentShader: `
    uniform vec3 glowColor;
    uniform vec3 sunPosition;
    varying vec3 vNormal;
    varying vec3 vWorld;
    void main() {
      vec3 V = normalize(cameraPosition - vWorld);
      float rim = pow(1.0 - abs(dot(normalize(vNormal), V)), 2.5);
      float day = 0.25 + 0.75 * max(0.0, dot(normalize(vNormal), normalize(sunPosition - vWorld)));
      gl_FragColor = vec4(glowColor, rim * day * 0.8);
    }
  `,
};

interface Body {
  spec: BodySpec;
  guides: THREE.Object3D[];   // name tag (space only)
  holder: THREE.Group;        // at the giant's position (moves on its orbit)
  spin: number;               // its own slow turn (radians)
}

export class SolarSystemMockup {
  private root = new THREE.Group();
  private bodies: Body[] = [];
  private enabled = false;

  // Sun position relative to the far layer's floating origin, shared by
  // every material
  private sunUniform = { value: new THREE.Vector3() };

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
    for (const b of this.bodies) {
      for (const g of b.guides) g.visible = showGuides;
      b.spin += dt * SPIN_RATE; // slow spin
      b.holder.rotation.y = b.spin - this.frameYaw;
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
    const planet = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 64, 40),
      new THREE.ShaderMaterial({
        uniforms: {
          sunPosition: this.sunUniform,
          c0: { value: c[0] }, c1: { value: c[1] }, c2: { value: c[2] },
          kind: { value: KIND_ID[spec.kind] },
          seed: { value: index * 17.3 },
        },
        vertexShader,
        fragmentShader,
      })
    );
    holder.add(planet);

    if (spec.atmosphere !== undefined) {
      const glow = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.08, 48, 32),
        new THREE.ShaderMaterial({
          uniforms: { glowColor: { value: new THREE.Color(spec.atmosphere) }, sunPosition: this.sunUniform },
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

    if (spec.rings) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(radius * RING_INNER, radius * GAS_GIANT_RING_OUTER, 128, 1),
        new THREE.MeshBasicMaterial({ color: c[2].clone().lerp(c[1], 0.4), side: THREE.DoubleSide, transparent: true, opacity: 0.55, depthWrite: false })
      );
      ring.rotation.x = RING_TILT;
      holder.add(ring);
    }

    const label = this.makeLabel(giant.name, radius);
    holder.add(label);

    return { spec, guides: [label], holder, spin: 0 };
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
