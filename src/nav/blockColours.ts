import * as THREE from 'three';
import { blockFaces, HexBlockType } from '../shared/blockTypes';
import { Planet } from '../planet/Planet';
import { NAVIGATION_CONFIG } from '../config/NavigationConfig';

/**
 * A block's map colour: the mean colour of its top face as that planet
 * draws it (navigation-and-orbits design decision 4). One source - the
 * block's own texture - so a new block or a planet's own tileset colours
 * the map with no table to keep in step. Water takes its shader's colour.
 */

const meanByImage = new WeakMap<object, string>();
let scratch: CanvasRenderingContext2D | null = null;

function meanColour(texture: THREE.Texture | null | undefined): string | null {
  const image = texture?.image as (CanvasImageSource & { width: number; height: number }) | undefined;
  if (!image || !image.width || !image.height) return null;
  const cached = meanByImage.get(image as object);
  if (cached) return cached;
  scratch ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!scratch) return null;
  const w = Math.min(64, image.width), h = Math.min(64, image.height);
  scratch.canvas.width = w;
  scratch.canvas.height = h;
  scratch.clearRect(0, 0, w, h);
  scratch.drawImage(image, 0, 0, w, h);
  const data = scratch.getImageData(0, 0, w, h).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue;  // transparent pixels aren't the block
    r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
  }
  if (!n) return null;
  const hex = '#' + [r, g, b].map(c => Math.round(c / n).toString(16).padStart(2, '0')).join('');
  meanByImage.set(image as object, hex);
  return hex;
}

function materialColour(material: THREE.Material): string | null {
  const m = material as THREE.ShaderMaterial & { map?: THREE.Texture | null; color?: THREE.Color };
  const u = m.uniforms;
  if (u?.terrainTexture) return meanColour(u.terrainTexture.value as THREE.Texture);
  if (u?.waterColor) return '#' + (u.waterColor.value as THREE.Color).getHexString();
  if (m.map) return meanColour(m.map);
  if (m.color) return '#' + m.color.getHexString();
  return null;
}

/** Colours per block type for one planet, computed as blocks are met. */
export class BlockColours {
  private colours = new Map<number, string>();
  constructor(private planet: Planet) {}

  colourOf(block: number): string {
    let c = this.colours.get(block);
    if (c) return c;
    if (block === HexBlockType.AIR) return NAVIGATION_CONFIG.UNKNOWN_TILE_COLOUR;
    const key = block === HexBlockType.WATER ? 'water' : blockFaces(block).top;
    c = materialColour(this.planet.getFaceMaterial(key))
      ?? (block === HexBlockType.WATER ? NAVIGATION_CONFIG.WATER_FALLBACK_COLOUR : NAVIGATION_CONFIG.UNKNOWN_TILE_COLOUR);
    this.colours.set(block, c);
    return c;
  }
}
