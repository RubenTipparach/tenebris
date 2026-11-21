import { MISSIONS, MISSION_SAMPLE_S, Mission, MissionObjective } from '../config/Missions';
import { onGameEvent } from '../engine/GameEvents';
import { gameStorage } from '../engine/GameStorage';
import { getAssetPath } from '../utils/assetPath';
import { showToast } from '../utils/toast';
import { Inventory, ITEM_DATA, ItemType } from './Inventory';
import { MissionSave, MissionTracker, WorldState } from './MissionTracker';

/**
 * Missions (openspec navigation-and-orbits, missions): the tracker fed from
 * game events and the inventory, saved per world as it changes, a toast on
 * each mission done, and the Missions tab of the E panel.
 */

// What each objective kind shows when it has no item icon
const KIND_ICON: Record<string, string> = {
  padComplete: '/textures/technology/launch_pad_face.png',
  assembled: '/textures/rocket_parts/medium_engine.png',
  launched: '/textures/rocket_parts/medium_engine.png',
  landed: '/textures/moon.png',
};

export class MissionsPanel {
  private tracker: MissionTracker;
  private el: HTMLElement | null = null;
  private sinceSample = 0;

  constructor(private inventory: Inventory, existingWorld: boolean, world: () => WorldState) {
    const saved = gameStorage.getMissionState<MissionSave>();
    this.tracker = new MissionTracker(saved);
    const held = (item: number) => this.inventory.getItemCount(item as ItemType);
    // A world played before missions existed starts where it is
    if (!saved && existingWorld) this.tracker.skipSatisfied(world());
    this.tracker.baseline(held);
    this.tracker.onComplete = (m) => showToast(`Mission done: ${m.title}`, { duration: 4000 });
    this.tracker.onChange = () => {
      gameStorage.saveMissionState(this.tracker.save());
      if (this.el) this.render(this.el);
    };
    gameStorage.saveMissionState(this.tracker.save());
    onGameEvent((type, key, n) => this.tracker.event(type, key, n, held));
  }

  /** Read the inventory for "gained" objectives now and then. */
  public update(dt: number): void {
    this.sinceSample += dt;
    if (this.sinceSample < MISSION_SAMPLE_S) return;
    this.sinceSample = 0;
    this.tracker.sample((item) => this.inventory.getItemCount(item as ItemType));
  }

  public show(el: HTMLElement): void {
    this.el = el;
    injectStyle();
    this.render(el);
  }

  public hide(): void {
    this.el = null;
  }

  private render(el: HTMLElement): void {
    const at = this.tracker.currentIndex();
    const progress = this.tracker.progress();
    const card = (m: Mission, i: number) => {
      const state = i < at ? 'done' : i === at ? 'open' : 'locked';
      const box = document.createElement('div');
      box.className = `ms-mission ms-${state}`;
      const head = document.createElement('div');
      head.className = 'ms-head';
      head.textContent = `${state === 'done' ? '[x] ' : ''}${i + 1}. ${m.title}`;
      box.appendChild(head);
      if (state === 'open') {
        const help = document.createElement('div');
        help.className = 'ms-help';
        help.textContent = m.help;
        box.appendChild(help);
      }
      if (state !== 'locked') {
        const row = document.createElement('div');
        row.className = 'ms-objectives';
        m.objectives.forEach((o, j) => row.appendChild(objective(o, state === 'done' ? o.count : progress[j] ?? 0)));
        box.appendChild(row);
      }
      return box;
    };
    // The open mission first, then what comes next, then what is done
    const order = [
      ...MISSIONS.map((m, i) => [m, i] as const).filter(([, i]) => i >= at),
      ...MISSIONS.map((m, i) => [m, i] as const).filter(([, i]) => i < at).reverse(),
    ];
    const list = document.createElement('div');
    list.className = 'ms-list';
    if (at >= MISSIONS.length) {
      const all = document.createElement('div');
      all.className = 'ms-all';
      all.textContent = 'All missions done';
      list.appendChild(all);
    }
    for (const [m, i] of order) list.appendChild(card(m, i));
    el.replaceChildren(list);
  }
}

function objective(o: MissionObjective, have: number): HTMLElement {
  const cell = document.createElement('div');
  cell.className = 'ms-obj' + (have >= o.count ? ' ms-met' : '');
  const slot = document.createElement('div');
  slot.className = 'ms-slot';
  const icon = o.item !== undefined ? ITEM_DATA[o.item]?.texture : KIND_ICON[o.kind];
  if (icon) {
    const img = document.createElement('img');
    img.src = getAssetPath(icon);
    img.alt = o.label;
    slot.appendChild(img);
  }
  const count = document.createElement('span');
  count.className = 'ms-count';
  count.textContent = `${Math.min(have, o.count)}/${o.count}`;
  slot.appendChild(count);
  const label = document.createElement('div');
  label.className = 'ms-label';
  label.textContent = o.label;
  cell.append(slot, label);
  return cell;
}

function injectStyle(): void {
  if (document.getElementById('missions-style')) return;
  const style = document.createElement('style');
  style.id = 'missions-style';
  style.textContent = `
    #panel-missions { overflow-y: auto; }
    .ms-list { display: grid; gap: 8px; padding-right: 6px; }
    .ms-all { color: #7be08a; font-family: var(--game-font); font-size: 18px; text-align: center; padding: 6px; }
    .ms-mission { background: rgba(255,255,255,0.05); border: 1px solid #444; border-radius: 6px; padding: 10px 12px; }
    .ms-open { border-color: #4CAF50; background: rgba(76,175,80,0.12); }
    .ms-done { opacity: 0.6; }
    .ms-locked { opacity: 0.4; }
    .ms-head { font-family: var(--game-font); font-size: 16px; color: #fff; letter-spacing: 1px; }
    .ms-done .ms-head { color: #7be08a; }
    .ms-help { font-size: 13px; color: #c8d0da; margin-top: 4px; }
    .ms-objectives { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 8px; }
    .ms-obj { display: flex; align-items: center; gap: 8px; }
    .ms-slot { position: relative; width: 44px; height: 44px; background: #222; border: 2px solid #555; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
    .ms-met .ms-slot { border-color: #4CAF50; }
    .ms-slot img { width: 32px; height: 32px; image-rendering: pixelated; }
    .ms-count { position: absolute; right: 2px; bottom: 0; font-size: 11px; color: #fff; text-shadow: 1px 1px 0 #000; }
    .ms-label { font-size: 13px; color: #ddd; }
  `;
  document.head.appendChild(style);
}
