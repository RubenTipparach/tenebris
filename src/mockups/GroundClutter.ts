import * as THREE from 'three';
import { skyLightUniforms } from '../planet/SkyLightTexture';
import { Planet } from '../planet/Planet';
import { HexBlockType } from '../shared/blockTypes';
import { getAssetPath } from '../utils/assetPath';
import { PlayerConfig } from '../config/PlayerConfig';
import { SEQUOIA_TILESET } from '../config/SolarSystemConfig';
import { forEachSurfaceTile, tileHash } from '../planet/SurfaceTiles';
import type { CelestialBodyConfig } from '../config/SolarSystemConfig';
import { NEAR_PLAYER_SCATTER } from '../config/SeaFloraConfig';
import { SeaFlora } from './SeaFlora';

/**
 * Ground clutter around the player (Sequoia; Earth with the biome mockup), after Pale Blue Dot's
 * foliage playground.
 *
 * - Grass tufts: nine one-pixel blades on a 16 px card, dark root to light
 *   tip, on two crossed cards, in the ground tile's own three tones (the
 *   grass texture's texels sorted by brightness and split in thirds). They
 *   sway in the wind. Tundra grows sparse straw tufts, the desert dry ones.
 * - Rocks and pebbles: lumpy flat-shaded stones in the stone texture's
 *   colour, on bare rock and in the tundra, the odd pebble in the desert.
 *
 * - Sea flora (openspec ocean-life): the same walk hands each water tile to
 *   the seabed layer (SeaFlora), which grows the planet's own sea plants.
 *
 * Instanced (one draw call each), placed per tile from a hash of the tile
 * index so it never changes as you walk, and rebuilt around the player
 * when they move or the ground under it is edited.
 */

const RADIUS = NEAR_PLAYER_SCATTER.RADIUS;
const REBUILD_MOVE = NEAR_PLAYER_SCATTER.REBUILD_MOVE;
const REBUILD_EVERY_S = NEAR_PLAYER_SCATTER.REBUILD_EVERY_S;
const MAX_TUFTS = 9000;
const MAX_ROCKS = 1500;
const TUFT_WIDTH = 0.55;
const TUFT_HEIGHT = 0.42;
const WIND = 0.06;
const AMBIENT = PlayerConfig.AMBIENT_LIGHT_INTENSITY;

interface Tones { dark: THREE.Color; mid: THREE.Color; light: THREE.Color }

export class GroundClutter {
  private tufts: THREE.InstancedMesh;
  private rocks: THREE.InstancedMesh;
  private tuftMaterial: THREE.ShaderMaterial;
  private rockMaterial: THREE.ShaderMaterial;
  private grass: Tones = fallbackTones(0x2f7d2a, 0x4fae3a, 0x86d45a);
  private seqGrass: Tones = fallbackTones(0x6a7a2a, 0x93a33c, 0xc2cf6a);
  // Sequoia's dry grass green (Sweaft-64 olives): its grass tufts, on a
  // beige ground - Sequoia has tufts, just no green grass ground
  private seqScrub: Tones = fallbackTones(0x559642, 0x9bb675, 0xcfaa81);
  private stone = new THREE.Color(0x8a8780);
  private moonStone = new THREE.Color(0x6e6e74);
  // Each rock world's own stone (sampled from its surface texture), and the
  // volcanic stone of the basalt family
  private bodyStone = new Map<string, THREE.Color>();
  private basaltStone = new THREE.Color(0x2c2c25);
  private lastCenter = new THREE.Vector3(1e9, 0, 0);
  private lastPlanet: Planet | null = null;
  private sinceBuild = 0;
  private time = 0;
  private enabled = false;
  private sea: SeaFlora;
  private seaBody: CelestialBodyConfig | undefined;

  constructor(scene: THREE.Scene) {
    this.sea = new SeaFlora(scene);
    this.tuftMaterial = makeMaterial(true);
    this.rockMaterial = makeMaterial(false);
    this.tufts = new THREE.InstancedMesh(tuftGeometry(), this.tuftMaterial, MAX_TUFTS);
    this.rocks = new THREE.InstancedMesh(rockGeometry(), this.rockMaterial, MAX_ROCKS);
    for (const m of [this.tufts, this.rocks]) {
      m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(m.count * 3), 3);
      m.count = 0;
      m.frustumCulled = false;
      m.visible = false;
      scene.add(m);
    }
    sampleTones(getAssetPath('/textures/grass.png')).then(t => { if (t) { this.grass = t; this.lastPlanet = null; } });
    sampleTones(getAssetPath(SEQUOIA_TILESET.grass)).then(t => { if (t) { this.seqGrass = t; this.lastPlanet = null; } });
    sampleTones(getAssetPath('/textures/rocks.png')).then(t => { if (t) { this.stone = t.mid; this.lastPlanet = null; } });
    sampleTones(getAssetPath('/textures/moon.png')).then(t => { if (t) { this.moonStone = t.mid; this.lastPlanet = null; } });
    sampleTones(getAssetPath('/textures/bodies/basalt_side.png')).then(t => { if (t) { this.basaltStone = t.mid; this.lastPlanet = null; } });
  }

  public setEnabled(on: boolean): void {
    this.enabled = on;
    this.tufts.visible = on;
    this.rocks.visible = on;
    this.lastPlanet = null;
  }

  /** Sea plants drawn per species (debug / headless checks) */
  public seaFloraCounts(): Record<string, number> {
    return this.sea.counts();
  }

  /**
   * planet: the world the player stands on (null in space); body: its config
   * (its sea flora table); cameraUnderwater: fogs the sea plants like the terrain.
   */
  public update(dt: number, player: THREE.Vector3, planet: Planet | null, sunDirection: THREE.Vector3,
    body?: CelestialBodyConfig, cameraUnderwater = false): void {
    if (!this.enabled) return;
    if (body !== this.seaBody) { this.seaBody = body; this.lastPlanet = null; }
    this.time += dt;
    this.sinceBuild += dt;
    for (const mat of [this.tuftMaterial, this.rockMaterial]) {
      mat.uniforms.time.value = this.time;
      mat.uniforms.sunDirection.value.copy(sunDirection);
      if (planet) mat.uniforms.planetCenter.value.copy(planet.center);
      if (planet) mat.uniforms.skyLight.value = planet.getSkyLight();
    }
    this.sea.setFrame(this.time, planet, sunDirection, cameraUnderwater);
    const show = !!planet;
    this.tufts.visible = show;
    this.rocks.visible = show;
    if (!planet) { this.lastPlanet = null; return; }
    if (planet === this.lastPlanet && player.distanceTo(this.lastCenter) < REBUILD_MOVE && this.sinceBuild < REBUILD_EVERY_S) return;
    this.rebuild(player, planet);
  }

  // The stone colour of a rock world's native rock (moon rock is drawn in
  // each body's own texture): sampled once per texture, the Moon's grey
  // until it arrives
  private nativeStone(planet: Planet): THREE.Color {
    const tex = planet.getSurfaceTexturePath();
    if (!tex) return this.moonStone;
    let c = this.bodyStone.get(tex);
    if (!c) {
      c = this.moonStone.clone();
      this.bodyStone.set(tex, c);
      sampleTones(getAssetPath(tex)).then(t => { if (t) { c!.copy(t.mid); this.lastPlanet = null; } });
    }
    return c;
  }

  private rebuild(player: THREE.Vector3, planet: Planet): void {
    this.lastPlanet = planet;
    const native = this.nativeStone(planet);
    this.lastCenter.copy(player);
    this.sinceBuild = 0;
    let nTufts = 0, nRocks = 0;
    const maxDepth = planet.getMaxDepth();
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const yaw = new THREE.Quaternion();
    const Y = new THREE.Vector3(0, 1, 0);
    const pos = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const col = new THREE.Color();
    this.sea.begin(planet, this.seaBody);
    forEachSurfaceTile(planet, player, RADIUS, (tile, dir, top, block, ground) => {
      const ti = tile.index;
      if (top < 0 || (top + 1 < maxDepth && planet.getBlock(ti, top + 1) !== HexBlockType.AIR)) return;
      if (block === HexBlockType.WATER) { this.sea.addTile(tile, dir); return; }
      const alien = ALIEN_CLUTTER[block];
      const plan = alien ?? clutterFor(block);
      if (!plan) return;
      let seed = tileHash(ti);
      const rnd = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
      q.setFromUnitVectors(Y, dir);
      const place = () => {
        // random point inside the hex: towards a corner, scaled down
        const v = tile.vertices[Math.floor(rnd() * tile.vertices.length)];
        const t = Math.sqrt(rnd()) * 0.82;
        const p = tile.center.clone().lerp(v, t).normalize();
        pos.copy(planet.center).addScaledVector(p, ground);
        yaw.setFromAxisAngle(Y, rnd() * Math.PI * 2);
        return q.clone().multiply(yaw);
      };
      const tufts = Math.floor(plan.tufts + rnd() * plan.tuftsRand);
      for (let i = 0; i < tufts && nTufts < MAX_TUFTS; i++) {
        const rot = place();
        const s = 0.7 + rnd() * 0.6;
        scale.set(s, s * (0.8 + rnd() * 0.5), s);
        m.compose(pos, rot, scale);
        this.tufts.setMatrixAt(nTufts, m);
        const r = rnd();
        const tone = alien?.tuft ? alien.tuft
          : plan.straw ? STRAW
          : block === HexBlockType.SEQ_GRASS ? this.seqGrass
          : block === HexBlockType.SEQ_SCRUB ? this.seqScrub
          // Sequoia's other ground grows its own dry beige grass, never
          // Earth's green
          : isSequoiaBlock(block) ? this.seqGrass
          : this.grass;
        col.copy(r < 0.33 ? tone.dark : r < 0.75 ? tone.mid : tone.light);
        this.tufts.setColorAt(nTufts, col);
        nTufts++;
      }
      const rocks = rnd() < plan.rockChance ? 1 + Math.floor(rnd() * plan.rocks) : 0;
      for (let i = 0; i < rocks && nRocks < MAX_ROCKS; i++) {
        const rot = place();
        const big = rnd() < 0.25;
        const s = big ? 0.35 + rnd() * 0.35 : 0.08 + rnd() * 0.12;
        scale.set(s * (0.8 + rnd() * 0.5), s * (0.5 + rnd() * 0.4), s * (0.8 + rnd() * 0.5));
        pos.addScaledVector(dir, -s * 0.15); // sink in a little
        m.compose(pos, rot, scale);
        this.rocks.setMatrixAt(nRocks, m);
        col.copy(alien?.rock ?? (block === HexBlockType.MOON_ROCK ? native : isVolcanic(block) ? this.basaltStone : this.stone)).multiplyScalar(0.8 + rnd() * 0.35);
        this.rocks.setColorAt(nRocks, col);
        nRocks++;
      }
    });
    this.sea.end();
    this.tufts.count = nTufts;
    this.rocks.count = nRocks;
    this.tufts.instanceMatrix.needsUpdate = true;
    this.rocks.instanceMatrix.needsUpdate = true;
    if (this.tufts.instanceColor) this.tufts.instanceColor.needsUpdate = true;
    if (this.rocks.instanceColor) this.rocks.instanceColor.needsUpdate = true;
  }
}

const STRAW: Tones = fallbackTones(0x8a7240, 0xb39a5c, 0xd6c389);

interface Plan { tufts: number; tuftsRand: number; straw: boolean; rockChance: number; rocks: number }

function clutterFor(block: number): Plan | null {
  switch (block) {
    case HexBlockType.GRASS: return { tufts: 4, tuftsRand: 5, straw: false, rockChance: 0.08, rocks: 1 };
    case HexBlockType.DIRT_SNOW: return { tufts: 0, tuftsRand: 3, straw: true, rockChance: 0.35, rocks: 3 };
    case HexBlockType.STONE: return { tufts: 0, tuftsRand: 0, straw: false, rockChance: 0.7, rocks: 4 };
    case HexBlockType.SAND: return { tufts: 0, tuftsRand: 1.4, straw: true, rockChance: 0.15, rocks: 2 };
    case HexBlockType.DIRT: return { tufts: 0, tuftsRand: 2, straw: false, rockChance: 0.2, rocks: 2 };
    // Sequoia: tufts in its own grass's tones, straw in its desert
    case HexBlockType.SEQ_GRASS: return { tufts: 4, tuftsRand: 5, straw: false, rockChance: 0.08, rocks: 1 };
    case HexBlockType.SEQ_DIRT: return { tufts: 0, tuftsRand: 2, straw: false, rockChance: 0.2, rocks: 2 };
    case HexBlockType.SEQ_SAND: return { tufts: 0, tuftsRand: 1.2, straw: true, rockChance: 0.15, rocks: 2 };
    case HexBlockType.SEQ_SNOW: return { tufts: 0, tuftsRand: 0, straw: false, rockChance: 0.25, rocks: 2 };
    // The Moon: no plants, a field of boulders and pebbles in its own grey
    case HexBlockType.MOON_ROCK: return { tufts: 0, tuftsRand: 0, straw: false, rockChance: 0.4, rocks: 3 };
    // Biome surfaces: dry scrub tufts (in its own beige / olive tones), a few
    // tufts in the forests, straw on the savanna
    case HexBlockType.SEQ_SCRUB: return { tufts: 5, tuftsRand: 5, straw: false, rockChance: 0.06, rocks: 1 };
    case HexBlockType.SEQ_DUFF: return { tufts: 0, tuftsRand: 1.5, straw: false, rockChance: 0.15, rocks: 2 };
    case HexBlockType.FOREST_FLOOR: return { tufts: 0, tuftsRand: 2, straw: false, rockChance: 0.15, rocks: 2 };
    case HexBlockType.DRY_GRASS: return { tufts: 3, tuftsRand: 4, straw: true, rockChance: 0.1, rocks: 1 };
    // Moons and asteroids: lifeless, so stones only - volcanic bombs on the
    // cones, a few on the lava fields and iron; bare ice and magma stay clear
    case HexBlockType.BASALT: return { tufts: 0, tuftsRand: 0, straw: false, rockChance: 0.45, rocks: 3 };
    case HexBlockType.LAVA_ROCK: return { tufts: 0, tuftsRand: 0, straw: false, rockChance: 0.25, rocks: 2 };
    case HexBlockType.SULFUR: return { tufts: 0, tuftsRand: 0, straw: false, rockChance: 0.15, rocks: 1 };
    case HexBlockType.IRON_NICKEL: return { tufts: 0, tuftsRand: 0, straw: false, rockChance: 0.3, rocks: 2 };
    default: return null;
  }
}

// The living alien worlds and jungle moons: each biome's tufts and stones in
// its own planet's colours (tuft: dark / mid / light, from the ground's
// palette; rock: the stones lying on it)
interface AlienPlan extends Plan { tuft?: Tones; rock?: THREE.Color }
const alien = (tufts: number, tuftsRand: number, rockChance: number, rocks: number, tuft: [number, number, number] | null, rock: number): AlienPlan =>
  ({ tufts, tuftsRand, straw: false, rockChance, rocks, tuft: tuft ? fallbackTones(...tuft) : undefined, rock: new THREE.Color(rock) });
const T = HexBlockType;
const ALIEN_CLUTTER: Partial<Record<number, AlienPlan>> = {
  // Cinder: red-orange ember tufts in the moss, obsidian shards on the ash,
  // yellow sulfur lumps on the flats
  [T.CINDER_EMBERMOSS]: alien(3, 4, 0.15, 1, [0x681712, 0xd4462b, 0xfb902f], 0x161612),
  [T.CINDER_ASH]: alien(0, 1.2, 0.45, 3, [0x434137, 0x681712, 0xfe6420], 0x161612),
  [T.CINDER_SULFUR]: alien(0, 0, 0.35, 2, null, 0xfaaf5c),
  // Vesper: pink clay sprigs and red pebbles, gold dune grass, salt crystals
  [T.VESPER_CLAY]: alien(0, 2, 0.25, 2, [0x841c1d, 0xc34988, 0xe69d69], 0x7d4636),
  [T.VESPER_DUNE]: alien(1, 3, 0.08, 1, [0x8d4526, 0xc56d25, 0xfaaf5c], 0xab8465),
  [T.VESPER_SALT]: alien(0, 0, 0.3, 3, null, 0xfffefe),
  // Halcyon: verdigris tufts, amethyst crystals, mint glass pebbles
  [T.HALCYON_MOSS]: alien(4, 5, 0.06, 1, [0x204f63, 0x53998b, 0x84e3b5], 0x3f8577),
  [T.HALCYON_GEODE]: alien(0, 1, 0.55, 3, [0x4f1d83, 0x7d2dbd, 0x9e3ba2], 0x7d2dbd),
  [T.HALCYON_GLASS]: alien(0, 0.8, 0.2, 2, [0x53998b, 0x84e3b5, 0xc1f1d8], 0xc1f1d8),
  // Tessaly: lilac moss tufts, frost tufts, ice chunks on the glaze
  [T.TESSALY_SNOWMOSS]: alien(3, 4, 0.08, 1, [0x3e3551, 0x69608b, 0x9e3ba2], 0x92a3b2),
  [T.TESSALY_FROST]: alien(0, 2, 0.2, 2, [0x5d778d, 0x92a3b2, 0xd2f8ff], 0xd2f8ff),
  [T.TESSALY_GLAZE]: alien(0, 0, 0.3, 2, null, 0x74effe),
  // Umbra: indigo and glowing cyan tufts, violet mycelium sprigs, shale flakes
  [T.UMBRA_MOSS]: alien(3, 4, 0.06, 1, [0x191954, 0x15578a, 0x74effe], 0x2b1f35),
  [T.UMBRA_MYCEL]: alien(1, 3, 0.1, 1, [0x4f1d83, 0x7d2dbd, 0xc34988], 0x2b1f35),
  [T.UMBRA_SHALE]: alien(0, 0, 0.5, 3, null, 0x161612),
  // Verdance: thick emerald undergrowth, swamp sedge, bank grass
  [T.VERD_JUNGLE]: alien(7, 6, 0.05, 1, [0x05582d, 0x297537, 0x559642], 0x3e586e),
  [T.VERD_SWAMP]: alien(4, 4, 0.05, 1, [0x434137, 0x297537, 0x9bb675], 0x434137),
  [T.VERD_BANK]: alien(1, 3, 0.25, 2, [0x297537, 0x559642, 0x9bb675], 0x5d778d),
  [T.VERD_ROCK]: alien(0, 1, 0.5, 3, [0x05582d, 0x297537, 0x559642], 0x3e586e),
  // Mirewood: lime and teal undergrowth, duckweed-green sedge, silt reeds
  [T.MIRE_JUNGLE]: alien(7, 6, 0.04, 1, [0x297537, 0x53998b, 0x9bb675], 0x3e3551),
  [T.MIRE_SWAMP]: alien(3, 4, 0.04, 1, [0x161612, 0x559642, 0x9bb675], 0x2b1f35),
  [T.MIRE_BANK]: alien(1, 3, 0.25, 2, [0x204f63, 0x53998b, 0x84e3b5], 0x69608b),
  [T.MIRE_ROCK]: alien(0, 0, 0.5, 3, null, 0x3e3551),
};

function isSequoiaBlock(block: number): boolean {
  return block === HexBlockType.SEQ_GRASS || block === HexBlockType.SEQ_DIRT || block === HexBlockType.SEQ_SAND
    || block === HexBlockType.SEQ_SNOW || block === HexBlockType.SEQ_SCRUB || block === HexBlockType.SEQ_DUFF;
}

function fallbackTones(d: number, m: number, l: number): Tones {
  return { dark: new THREE.Color(d), mid: new THREE.Color(m), light: new THREE.Color(l) };
}

/** A texture's dark, mid and light tones: texels sorted by brightness, split in thirds, each third's mean. */
async function sampleTones(url: string): Promise<Tones | null> {
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.width;
    c.height = img.height;
    const ctx = c.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    // top cell only for atlas-style textures (top face on the left)
    const w = Math.min(img.width, img.height);
    const data = ctx.getImageData(0, 0, w, img.height).data;
    const px: number[][] = [];
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 128) px.push([data[i], data[i + 1], data[i + 2]]);
    if (px.length < 3) return null;
    px.sort((a, b) => (a[0] * 0.3 + a[1] * 0.59 + a[2] * 0.11) - (b[0] * 0.3 + b[1] * 0.59 + b[2] * 0.11));
    const third = (k: number) => {
      const part = px.slice(Math.floor(px.length * k / 3), Math.floor(px.length * (k + 1) / 3));
      const s = [0, 0, 0];
      for (const p of part) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; }
      return new THREE.Color(s[0] / part.length / 255, s[1] / part.length / 255, s[2] / part.length / 255);
    };
    return { dark: third(0), mid: third(1), light: third(2) };
  } catch {
    return null;
  }
}

/** Nine one-pixel blades on a 16 px card, dark root to light tip (grey, tinted per instance). */
function tuftTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 16;
  c.height = 16;
  const ctx = c.getContext('2d')!;
  const blades = [[1, 7], [3, 11], [4, 6], [6, 14], [7, 9], [9, 12], [11, 8], [12, 13], [14, 6]];
  for (const [x, h] of blades) {
    for (let y = 0; y < h; y++) {
      const v = Math.round(165 + 90 * (y / h));
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      // a lean on the upper blade
      const lean = y > h * 0.6 ? (x < 8 ? -1 : 1) : 0;
      ctx.fillRect(x + lean, 15 - y, 1, 1);
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  return t;
}

function tuftGeometry(): THREE.BufferGeometry {
  const a = new THREE.PlaneGeometry(TUFT_WIDTH, TUFT_HEIGHT);
  a.translate(0, TUFT_HEIGHT / 2, 0);
  const b = a.clone();
  b.rotateY(Math.PI / 2);
  const pos: number[] = [], uv: number[] = [], nrm: number[] = [];
  for (const g of [a, b]) {
    const ng = g.toNonIndexed();
    pos.push(...ng.getAttribute('position').array);
    uv.push(...ng.getAttribute('uv').array);
    for (let i = 0; i < ng.getAttribute('position').count; i++) nrm.push(0, 1, 0); // lit like the ground
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  return g;
}

function rockGeometry(): THREE.BufferGeometry {
  // IcosahedronGeometry is non-indexed (each face has its own copy of its
  // corners), so the lumps are keyed on the corner's position: every copy
  // of a corner moves the same way and the faces stay closed.
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.getAttribute('position');
  const lump = (x: number, y: number, z: number) => {
    const h = Math.sin(Math.round(x * 1000) * 12.9898 + Math.round(y * 1000) * 78.233 + Math.round(z * 1000) * 37.719) * 43758.5453;
    return 0.82 + 0.3 * (h - Math.floor(h));
  };
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = lump(x, y, z);
    // flat bottom so it sits on the ground
    p.setXYZ(i, x * k, Math.max(y * k, -0.25), z * k);
  }
  g.computeVertexNormals(); // per face (non-indexed) = flat shaded
  g.deleteAttribute('uv');
  g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(p.count * 2), 2));
  return g;
}

function makeMaterial(tuft: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      map: { value: tuft ? tuftTexture() : null },
      time: { value: 0 },
      sunDirection: { value: new THREE.Vector3(1, 0, 0) },
      planetCenter: { value: new THREE.Vector3() },
      ...skyLightUniforms(),
    },
    defines: tuft ? { TUFT: 1 } : {},
    side: tuft ? THREE.DoubleSide : THREE.FrontSide,
    vertexShader: `
      uniform float time;
      varying vec2 vUv;
      varying vec3 vColor;
      varying vec3 vNormal;
      varying vec3 vWorld;
      void main() {
        vUv = uv;
        vColor = vec3(1.0);
        #ifdef USE_INSTANCING_COLOR
          vColor = instanceColor;
        #endif
        vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
        #ifdef TUFT
          // sway: the tip moves, the root stays
          float sway = sin(time * 1.7 + w.x * 0.9 + w.z * 0.7) * ${WIND.toFixed(3)} * uv.y * uv.y;
          w.xyz += normalize(cross(vec3(0.0, 1.0, 0.3), normalize(mat3(instanceMatrix) * vec3(0.0, 1.0, 0.0)))) * sway;
        #endif
        vNormal = normalize(mat3(modelMatrix) * mat3(instanceMatrix) * normal);
        vWorld = w.xyz;
        gl_Position = projectionMatrix * viewMatrix * w;
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform vec3 sunDirection;
      uniform vec3 planetCenter;
      varying vec2 vUv;
      varying vec3 vColor;
      varying vec3 vNormal;
      varying vec3 vWorld;
      #include <tenebris_sky_light>
      void main() {
        vec3 c = vColor;
        #ifdef TUFT
          vec4 t = texture2D(map, vUv);
          if (t.a < 0.5) discard;
          c *= t.rgb;
        #endif
        vec3 up = normalize(vWorld - planetCenter);
        // The terrain's sky light (openspec sky-lighting): sun and fill by
        // this spot's sun height, so tufts and rocks sit in the same light
        float facing = dot(up, sunDirection);
        vec3 ambient = ${AMBIENT.toFixed(3)} * skyFill(facing);
        float diff = max(0.0, dot(normalize(vNormal), sunDirection));
        gl_FragColor = vec4(c * (ambient + 0.6 * diff * skySun(facing)), 1.0);
      }
    `,
  });
}

function isVolcanic(block: number): boolean {
  return block === HexBlockType.BASALT || block === HexBlockType.LAVA_ROCK || block === HexBlockType.SULFUR;
}
