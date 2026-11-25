import * as THREE from 'three';
import { INHABITED_WORLDS, NPC_CONFIG, NpcSpecies } from '../config/NpcConfig';
import { FaunaModel, ModelBuilder } from '../planet/FaunaModels';

/**
 * Procedural NPC models (openspec friendship-npcs, task 3.2): one humanoid
 * builder fed by each species' `look` (NpcConfig.ts) - height, build, head
 * size, arm pairs, colours - plus its signature feature, so no two worlds'
 * people share a silhouette. Built with the fauna's ModelBuilder and drawn
 * by the fauna's SpeciesRender (src/npc/NpcRenderer.ts), one InstancedMesh
 * per species, animated by the baked clips public/animations/npc_<id>.anim.json
 * (scripts/gen-npc-anims.py): idle, move (walk) and talk.
 *
 * Model space: +Z forward, +Y up, standing on y = 0. Parts (names match
 * the clips): body (hips up), head, armL / armR, arm2L / arm2R (a second
 * pair), legL / legR, and wingL / wingR for a winged species.
 */



/** Every NPC species: each inhabited world's people, then the traders. */
export function npcSpecies(): NpcSpecies[] {
  return [...INHABITED_WORLDS.map(w => w.species), NPC_CONFIG.TRADERS.SPECIES];
}

/** The anim file id of a species. */
export const npcAnimId = (species: string): string => `npc_${species}`;

const hex = (c: string): number => parseInt(c.replace('#', ''), 16);

/** Body proportions as fractions of the height (stilts lengthen the legs). */
const LEG = 0.44, STILT_LEG = 0.6, HEAD = 0.17, ARM = 0.38;

export function buildNpcModel(s: NpcSpecies): FaunaModel {
  const k = s.look;
  const H = k.heightM, W = k.widthM;
  const skin = hex(k.skin), trim = hex(k.trim), eye = hex(k.eyes);
  const legH = H * (k.feature === 'stilts' ? STILT_LEG : LEG);
  const headR = H * HEAD * 0.5 * k.headScale;
  const torsoH = Math.max(H - legH - headR * 2, H * 0.2);
  const neckY = legH + torsoH;
  const headY = neckY + headR;
  const legW = W * 0.3;
  const b = new ModelBuilder().part('body', [0, legH, 0], [1, 0, 0], null);

  // torso: skin with a trim sash / belt
  b.box('body', [W, torsoH, W * 0.6], [0, legH + torsoH / 2, 0], skin);
  b.box('body', [W * 1.04, torsoH * 0.18, W * 0.64], [0, legH + torsoH * 0.15, 0], trim);
  b.box('body', [W * 0.3, torsoH * 0.7, W * 0.62], [W * 0.15, legH + torsoH * 0.55, 0], trim, { rot: [0, 0, 0.5] });

  // head
  b.part('head', [0, neckY, 0], [1, 0, 0]);
  b.add('head', new THREE.IcosahedronGeometry(1, 0), skin, { at: [0, headY, 0], scale: [headR, headR, headR] });
  for (const sx of [1, -1]) b.box('head', [headR * 0.3, headR * 0.3, headR * 0.2], [sx * headR * 0.4, headY + headR * 0.15, headR * 0.9], eye, { glow: 0.4 });

  // legs (hip pivots, swing about +X)
  for (const [name, sx] of [['legL', 1], ['legR', -1]] as [string, number][]) {
    b.part(name, [sx * W * 0.25, legH, 0]);
    b.box(name, [legW, legH, legW], [sx * W * 0.25, legH / 2, 0], k.feature === 'stilts' ? trim : skin);
    b.box(name, [legW * 1.2, legH * 0.08, legW * 1.6], [sx * W * 0.25, legH * 0.04, legW * 0.25], trim); // feet
  }

  // arms: one or two pairs from the shoulders
  const armLen = H * ARM, armW = W * 0.22;
  for (let pair = 0; pair < k.arms; pair++) {
    const y = neckY - torsoH * (0.08 + pair * 0.3);
    for (const sx of [1, -1]) {
      const name = `arm${pair ? '2' : ''}${sx > 0 ? 'L' : 'R'}`;
      const x = sx * (W / 2 + armW / 2);
      b.part(name, [x, y, 0]);
      b.box(name, [armW, armLen, armW], [x, y - armLen / 2, 0], skin);
      b.box(name, [armW * 1.1, armLen * 0.12, armW * 1.1], [x, y - armLen * 0.94, 0], trim); // hands / cuffs
    }
  }

  feature(b, s, { H, W, headR, headY, neckY, legH, torsoH, skin, trim, eye });
  return b.build();
}

interface Dims { H: number; W: number; headR: number; headY: number; neckY: number; legH: number; torsoH: number; skin: number; trim: number; eye: number }

/** The species' signature geometry. */
function feature(b: ModelBuilder, s: NpcSpecies, d: Dims): void {
  const { W, headR: r, headY, neckY, legH, torsoH, trim, eye } = d;
  switch (s.look.feature) {
    case 'visor': // a glowing band across the eyes and a collar
      b.box('head', [r * 1.9, r * 0.45, r * 0.5], [0, headY + r * 0.15, r * 0.7], eye, { glow: 0.9 });
      b.box('body', [W * 1.1, d.torsoH * 0.12, W * 0.7], [0, neckY - d.torsoH * 0.06, 0], trim);
      break;
    case 'branches': // twig antlers with leaf tufts
      for (const sx of [1, -1]) {
        b.box('head', [r * 0.18, r * 1.4, r * 0.18], [sx * r * 0.5, headY + r * 1.4, 0], d.skin, { rot: [0, 0, -sx * 0.4] });
        b.box('head', [r * 0.14, r * 0.8, r * 0.14], [sx * r * 1.0, headY + r * 1.7, 0], d.skin, { rot: [0, 0, -sx * 1.0] });
        b.ball('head', r * 0.35, [sx * r * 1.3, headY + r * 2.0, 0], trim);
        b.ball('head', r * 0.3, [sx * r * 0.7, headY + r * 2.2, 0], trim);
      }
      break;
    case 'horns': // curved horns sweeping back
      for (const sx of [1, -1]) {
        b.box('head', [r * 0.3, r * 0.9, r * 0.3], [sx * r * 0.7, headY + r * 0.9, -r * 0.1], trim, { rot: [-0.5, 0, -sx * 0.5] });
        b.box('head', [r * 0.22, r * 0.6, r * 0.22], [sx * r * 1.0, headY + r * 1.5, -r * 0.5], trim, { rot: [-1.2, 0, -sx * 0.3] });
      }
      break;
    case 'hood': // a tall hood and a long robe
      b.add('head', new THREE.ConeGeometry(r * 1.25, r * 3.2, 6), trim, { at: [0, headY + r * 0.9, -r * 0.2] });
      b.add('body', new THREE.CylinderGeometry(W * 0.55, W * 0.75, torsoH * 1.1 + legH * 0.6, 6), trim, { at: [0, legH * 0.7 + torsoH * 0.4, 0] });
      break;
    case 'crystals': // crystal spikes from head and shoulders
      b.add('head', new THREE.OctahedronGeometry(1, 0), trim, { at: [0, headY + r * 1.3, 0], scale: [r * 0.4, r * 0.9, r * 0.4], glow: 0.6 });
      for (const sx of [1, -1]) {
        b.add('head', new THREE.OctahedronGeometry(1, 0), trim, { at: [sx * r * 0.7, headY + r * 1.0, 0], scale: [r * 0.25, r * 0.6, r * 0.25], rot: [0, 0, -sx * 0.4], glow: 0.6 });
        b.add('body', new THREE.OctahedronGeometry(1, 0), trim, { at: [sx * W * 0.45, neckY + r * 0.2, 0], scale: [W * 0.12, W * 0.3, W * 0.12], glow: 0.6 });
      }
      break;
    case 'fur': // a thick ruff and a furry cap
      b.add('body', new THREE.IcosahedronGeometry(1, 0), d.skin, { at: [0, neckY - torsoH * 0.05, 0], scale: [W * 0.75, torsoH * 0.25, W * 0.55] });
      b.add('head', new THREE.IcosahedronGeometry(1, 0), trim, { at: [0, headY + r * 0.6, -r * 0.1], scale: [r * 1.05, r * 0.6, r * 1.05] });
      break;
    case 'cap': // a wide spotted mushroom cap
      b.add('head', new THREE.CylinderGeometry(r * 0.4, r * 2.0, r * 0.9, 8), trim, { at: [0, headY + r * 1.1, 0] });
      for (const [sx, sz] of [[1, 0.6], [-0.8, 0.8], [0.2, -1.2], [-1.1, -0.5]] as [number, number][]) {
        b.box('head', [r * 0.35, r * 0.15, r * 0.35], [sx * r * 1.1, headY + r * 1.3, sz * r * 0.9], eye);
      }
      break;
    case 'wings': // leaf wings on the back (their own parts: the clips flap them)
      for (const [name, sx] of [['wingL', 1], ['wingR', -1]] as [string, number][]) {
        b.part(name, [sx * W * 0.2, neckY - torsoH * 0.15, -W * 0.3], [0, 0, sx]);
        b.add(name, new THREE.OctahedronGeometry(0.5, 0), trim, {
          at: [sx * W * 0.9, neckY - torsoH * 0.1, -W * 0.4], scale: [W * 1.6, torsoH * 0.9, W * 0.08], rot: [0, 0, -sx * 0.4],
        });
      }
      break;
    case 'stilts': // long legs already; a broad flat hat against the bog sun
      b.add('head', new THREE.CylinderGeometry(r * 1.8, r * 1.8, r * 0.15, 8), d.trim, { at: [0, headY + r * 0.85, 0] });
      b.add('head', new THREE.CylinderGeometry(r * 0.7, r * 0.8, r * 0.6, 8), d.trim, { at: [0, headY + r * 1.15, 0] });
      break;
    case 'fins': // a head fin and fins down the forearms
      b.box('head', [r * 0.15, r * 1.0, r * 1.6], [0, headY + r * 1.0, -r * 0.2], trim, { rot: [0.3, 0, 0] });
      for (const sx of [1, -1]) b.box('head', [r * 0.8, r * 0.6, r * 0.1], [sx * r * 1.1, headY, -r * 0.2], trim, { rot: [0, sx * 0.6, 0] });
      break;
    case 'pack': { // the trader's big backpack and bedroll
      const y = legH + torsoH * 0.55;
      b.box('body', [W * 0.9, torsoH * 0.9, W * 0.6], [0, y, -W * 0.6], trim);
      b.add('body', new THREE.CylinderGeometry(W * 0.18, W * 0.18, W * 1.1, 6), d.skin, { at: [0, y + torsoH * 0.5, -W * 0.6], rot: [0, 0, Math.PI / 2] });
      break;
    }
  }
}

/** The part names of a species' model (the clip tracks must use these). */
export function npcPartNames(s: NpcSpecies): string[] {
  return buildNpcModel(s).parts.map(p => p.name);
}

