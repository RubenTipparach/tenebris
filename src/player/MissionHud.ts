import { MISSION_HUD as HUD } from '../config/Missions';
import { getAssetPath } from '../utils/assetPath';
import { ITEM_DATA } from './Inventory';
import { MenuManager } from './MenuManager';
import { MissionTracker } from './MissionTracker';
import { objectiveTexture } from './MissionsPanel';

/**
 * The HUD mission tracker (openspec navigation-and-orbits, missions): the
 * mission to do now - its icon, title and objectives with their counts -
 * at the top right during play. Redrawn when the tracker changes (the panel
 * hands its change and sample ticks on), hidden while a game menu is open,
 * and switched off from Settings (saved per browser). A click opens the
 * Missions tab.
 */
export class MissionHud {
  private el: HTMLElement;
  private enabled: boolean;
  private shown = false;

  constructor(private tracker: MissionTracker, onOpen: () => void) {
    this.enabled = readEnabled();
    injectStyle();
    this.el = document.createElement('div');
    this.el.id = 'mission-hud';
    this.el.className = 'mission-hud';
    this.el.style.width = `${HUD.WIDTH}px`;
    this.el.addEventListener('click', onOpen);
    document.body.appendChild(this.el);
    this.render();
    this.update();
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(on: boolean): void {
    this.enabled = on;
    try { localStorage.setItem(HUD.STORAGE_KEY, on ? '1' : '0'); } catch { /* storage blocked */ }
    this.update();
  }

  /** Per frame: shown when enabled, a mission is open and no menu is up. */
  public update(): void {
    const show = this.enabled && this.tracker.now() !== null && !MenuManager.isAnyMenuOpen();
    if (show === this.shown) return;
    this.shown = show;
    this.el.style.display = show ? 'block' : 'none';
  }

  /** Redraw from the tracker: the now mission and its counts. */
  public render(): void {
    const m = this.tracker.now();
    if (!m) { this.el.replaceChildren(); this.update(); return; }
    const prog = this.tracker.progress(m);
    const head = document.createElement('div');
    head.className = 'mh-head';
    head.appendChild(icon(ITEM_DATA[m.icon]?.texture, HUD.ICON));
    const title = document.createElement('span');
    title.className = 'mh-title';
    title.textContent = m.title;
    head.appendChild(title);
    const rows = m.objectives.map((o, i) => {
      const have = Math.min(prog[i], o.count);
      const row = document.createElement('div');
      row.className = 'mh-obj' + (have >= o.count ? ' mh-met' : '');
      const label = document.createElement('span');
      label.className = 'mh-label';
      label.textContent = o.label;
      const count = document.createElement('span');
      count.className = 'mh-count';
      count.textContent = `${have} / ${o.count}`;
      row.append(icon(objectiveTexture(o), HUD.OBJ_ICON), label, count);
      return row;
    });
    this.el.replaceChildren(head, ...rows);
    this.update();
  }
}

function readEnabled(): boolean {
  try { return localStorage.getItem(HUD.STORAGE_KEY) !== '0'; } catch { return true; }
}

function icon(texture: string | undefined, px: number): HTMLElement {
  const img = document.createElement('img');
  img.className = 'mh-icon';
  img.width = px;
  img.height = px;
  if (texture) img.src = getAssetPath(texture);
  img.draggable = false;
  return img;
}

function injectStyle(): void {
  if (document.getElementById('mission-hud-style')) return;
  const style = document.createElement('style');
  style.id = 'mission-hud-style';
  // The missions panel's look (MissionsPanel injectStyle): dark card, the
  // NOW orange border, green for a met objective
  style.textContent = `
    .mission-hud { position: fixed; top: 34px; right: 10px; z-index: 90; display: none; box-sizing: border-box; padding: 6px 8px; background: rgba(26,31,40,0.82); border: 2px solid #ffa300; border-radius: 5px; color: #e8ecf2; font-family: var(--game-font); cursor: pointer; user-select: none; }
    .mission-hud:hover { border-color: #ffc04d; }
    .mission-hud .mh-head { display: flex; align-items: center; gap: 6px; margin-bottom: 3px; }
    .mission-hud .mh-title { font-size: 20px; color: #ffa300; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mission-hud .mh-icon { image-rendering: pixelated; flex: none; }
    .mission-hud .mh-obj { display: flex; align-items: center; gap: 5px; font-size: 17px; color: #c8d0da; white-space: nowrap; }
    .mission-hud .mh-obj.mh-met { color: #7be08a; }
    .mission-hud .mh-label { overflow: hidden; text-overflow: ellipsis; }
    .mission-hud .mh-count { margin-left: auto; color: #9fb3c8; }
    .mission-hud .mh-obj.mh-met .mh-count { color: #7be08a; }
    @media (max-width: 768px), (pointer: coarse) { .mission-hud { transform: scale(0.8); transform-origin: top right; } }
  `;
  document.head.appendChild(style);
}
