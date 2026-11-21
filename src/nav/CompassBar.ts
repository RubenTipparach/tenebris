import { NAVIGATION_CONFIG as C } from '../config/NavigationConfig';
import { bearing, compassHeading, V3 } from './compass';

/**
 * The compass bar (spec compass): across the top of the screen on a planet,
 * N/E/S/W, the intercardinals and a tick every 15 degrees over a 180 degree
 * span centred on the heading; waypoints on this planet at their bearing,
 * the one nearest the centre with its distance. Fades out in space.
 */
export interface CompassState {
  /** null in space */
  up: V3 | null;
  forward: V3;
  /** altitude above the surface over the planet's radius */
  altitudeRadii: number;
  planetRadius: number;
  /** waypoints on this planet: their surface direction and colour */
  waypoints: Array<{ up: V3; colour: string }>;
}

const LETTERS: Array<[number, string, boolean]> = [
  [0, 'N', true], [45, 'NE', false], [90, 'E', true], [135, 'SE', false],
  [180, 'S', true], [225, 'SW', false], [270, 'W', true], [315, 'NW', false],
];

export class CompassBar {
  private canvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d')!;

  constructor() {
    const c = this.canvas;
    c.id = 'compass-bar';
    Object.assign(c.style, {
      position: 'fixed', top: '8px', left: '50%', transform: 'translateX(-50%)',
      pointerEvents: 'none', zIndex: '50', opacity: '0',
    });
    document.body.appendChild(c);
  }

  /** Hide outright (menus, title, loading). */
  setVisible(on: boolean): void {
    this.canvas.style.display = on ? '' : 'none';
  }

  update(state: CompassState): void {
    const fade = state.up
      ? 1 - Math.min(1, Math.max(0, (state.altitudeRadii - C.COMPASS_FADE_START_RADII) / (C.COMPASS_FADE_END_RADII - C.COMPASS_FADE_START_RADII)))
      : 0;
    this.canvas.style.opacity = fade.toFixed(3);
    if (fade <= 0 || !state.up) return;

    const width = Math.round(Math.min(C.COMPASS_MAX_PX, Math.max(C.COMPASS_MIN_PX, window.innerWidth * C.COMPASS_WIDTH_SHARE)));
    const height = C.COMPASS_HEIGHT_PX;
    const dpr = window.devicePixelRatio || 1;
    if (this.canvas.width !== width * dpr) {
      this.canvas.width = width * dpr;
      this.canvas.height = height * dpr;
      this.canvas.style.width = `${width}px`;
      this.canvas.style.height = `${height}px`;
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const barH = C.COMPASS_BAR_PX;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, width, barH);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(0, 0, width, 1);
    ctx.fillRect(0, barH - 1, width, 1);
    // centre notch
    ctx.fillStyle = '#ffec27';
    ctx.fillRect(width / 2 - 1, barH - 7, 2, 7);

    const heading = compassHeading(state.up, state.forward);
    const half = C.COMPASS_SPAN_DEG / 2;
    // x of a bearing, and its edge fade (0 at the edges)
    const place = (deg: number) => {
      let d = deg - heading;
      d = ((d + 540) % 360) - 180;
      if (Math.abs(d) > half) return null;
      const x = width / 2 + (d / half) * (width / 2);
      const edge = 1 - Math.abs(d) / half;
      return { x, alpha: Math.min(1, edge / C.COMPASS_EDGE_FADE) };
    };
    ctx.textAlign = 'center';
    for (let deg = 0; deg < 360; deg += C.COMPASS_TICK_DEG) {
      const p = place(deg);
      if (!p) continue;
      const letter = LETTERS.find(l => l[0] === deg);
      ctx.globalAlpha = p.alpha * (letter && !letter[2] ? 0.7 : 1);
      if (letter) {
        ctx.fillStyle = letter[1] === 'N' ? '#ff9a3c' : '#ffffff';
        ctx.font = letter[2] ? 'bold 15px monospace' : '11px monospace';
        ctx.fillText(letter[1], p.x, letter[2] ? 20 : 18);
      } else {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(p.x - 0.5, 8, 1, 6);
      }
    }
    // waypoints: a diamond on the bar's foot; the one nearest the centre
    // gets its distance under the bar
    let nearest: { x: number; dist: number; colour: string } | null = null;
    for (const w of state.waypoints) {
      const b = bearing(state.up, w.up);
      const p = place(b.deg);
      if (!p) continue;
      const dist = b.angle * state.planetRadius;
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = w.colour;
      ctx.beginPath();
      ctx.moveTo(p.x, barH - 12); ctx.lineTo(p.x + 5, barH - 7); ctx.lineTo(p.x, barH - 2); ctx.lineTo(p.x - 5, barH - 7);
      ctx.closePath();
      ctx.fill();
      if (!nearest || Math.abs(p.x - width / 2) < Math.abs(nearest.x - width / 2)) nearest = { x: p.x, dist, colour: w.colour };
    }
    ctx.globalAlpha = 1;
    if (nearest) {
      ctx.fillStyle = nearest.colour;
      ctx.font = '12px monospace';
      ctx.fillText(formatDistance(nearest.dist), nearest.x, barH + 13);
    }
    ctx.textAlign = 'start';
  }
}

export function formatDistance(m: number): string {
  return m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`;
}
