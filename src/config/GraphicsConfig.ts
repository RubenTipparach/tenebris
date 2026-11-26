/**
 * Graphics quality (the Options tab's Graphics and Resolution): what a frame
 * costs, traded against how it looks. Phones start on FAST, desktops on
 * PRETTY; the player's pick is saved per browser.
 *
 * A preset only scales things that already exist - the renderer's pixel
 * ratio and antialiasing, the terrain's detail render distance, the ground
 * clutter (grass tufts / rocks) radius and density, and the existing
 * atmosphere and cloud toggles - so every system keeps its own one path.
 */
import { isMobileDevice } from '../engine/InputManager';

export type GraphicsPreset = 'fast' | 'balanced' | 'pretty';

export interface GraphicsLevel {
  label: string;
  pixelRatioCap: number;       // the most device pixels per CSS pixel the game renders at
  antialias: boolean;          // MSAA (takes effect on the next load: the renderer is made once)
  terrainDistanceScale: number;// times the terrain's detail render distance (PlayerConfig TERRAIN_*_RENDER_DISTANCE)
  clutterRadiusScale: number;  // times the grass / rock scatter radius round the player
  clutterDensity: number;      // fraction of the grass tufts and rocks each tile would get
  flatShading: boolean;        // planet surfaces as flat, face-lit colour (src/planet/FlatShading.ts)
  atmosphere: boolean;         // the atmosphere shell and clouds, applied through their own toggles
  clouds: boolean;
}

export const GRAPHICS: { PRESETS: Record<GraphicsPreset, GraphicsLevel>; RESOLUTION_MIN: number; RESOLUTION_MAX: number; RESOLUTION_STEP: number; MOBILE_DEFAULT: GraphicsPreset; DESKTOP_DEFAULT: GraphicsPreset; STORAGE_KEY: string } = {
  PRESETS: {
    fast: { label: 'Fast', pixelRatioCap: 1, antialias: false, terrainDistanceScale: 0.6, clutterRadiusScale: 0.5, clutterDensity: 0.4, flatShading: true, atmosphere: false, clouds: false },
    balanced: { label: 'Balanced', pixelRatioCap: 1.5, antialias: false, terrainDistanceScale: 0.8, clutterRadiusScale: 0.75, clutterDensity: 0.7, flatShading: false, atmosphere: true, clouds: false },
    pretty: { label: 'Pretty', pixelRatioCap: 2, antialias: true, terrainDistanceScale: 1, clutterRadiusScale: 1, clutterDensity: 1, flatShading: false, atmosphere: true, clouds: true },
  },
  // Resolution: a percentage of the preset's pixel ratio (the pixel art stays crisp - textures are nearest-filtered)
  RESOLUTION_MIN: 50,
  RESOLUTION_MAX: 100,
  RESOLUTION_STEP: 5,
  MOBILE_DEFAULT: 'fast',
  DESKTOP_DEFAULT: 'pretty',
  STORAGE_KEY: 'tenebris_graphics',
};

export interface GraphicsSettings { preset: GraphicsPreset; resolution: number }

let current: GraphicsSettings | null = null;
const listeners = new Set<(g: GraphicsSettings) => void>();

function load(): GraphicsSettings {
  const fallback: GraphicsSettings = { preset: isMobileDevice() ? GRAPHICS.MOBILE_DEFAULT : GRAPHICS.DESKTOP_DEFAULT, resolution: GRAPHICS.RESOLUTION_MAX };
  try {
    const s = JSON.parse(localStorage.getItem(GRAPHICS.STORAGE_KEY) ?? 'null');
    if (s && s.preset in GRAPHICS.PRESETS) {
      const r = Number(s.resolution);
      return { preset: s.preset, resolution: Number.isFinite(r) ? Math.min(GRAPHICS.RESOLUTION_MAX, Math.max(GRAPHICS.RESOLUTION_MIN, r)) : GRAPHICS.RESOLUTION_MAX };
    }
  } catch { /* no storage: the default */ }
  return fallback;
}

/** The player's graphics settings (the device's default until they pick). */
export function graphicsSettings(): GraphicsSettings {
  return (current ??= load());
}

/** The active preset's numbers. */
export function graphics(): GraphicsLevel {
  return GRAPHICS.PRESETS[graphicsSettings().preset];
}

/** The renderer's pixel ratio: the device's, capped by the preset, times the resolution. */
export function renderPixelRatio(devicePixelRatio = window.devicePixelRatio || 1): number {
  return Math.min(devicePixelRatio, graphics().pixelRatioCap) * graphicsSettings().resolution / 100;
}

/** Change and save the settings; listeners re-apply what can change live. */
export function setGraphics(next: Partial<GraphicsSettings>): void {
  current = { ...graphicsSettings(), ...next };
  try { localStorage.setItem(GRAPHICS.STORAGE_KEY, JSON.stringify(current)); } catch { /* not saved */ }
  for (const fn of listeners) fn(current);
}

export function onGraphicsChange(fn: (g: GraphicsSettings) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Has the player picked settings in this browser (else presets may set the atmosphere / clouds toggles)? */
export function graphicsChosen(): boolean {
  try { return localStorage.getItem(GRAPHICS.STORAGE_KEY) !== null; } catch { return false; }
}
