import { MISSIONS, MISSION_BRANCHES, MISSION_SAMPLE_S, MISSION_TREE_UI as UI, Mission, MissionObjective } from '../config/Missions';
import { onGameEvent } from '../engine/GameEvents';
import { gameStorage } from '../engine/GameStorage';
import { getAssetPath } from '../utils/assetPath';
import { showToast } from '../utils/toast';
import { Inventory, ITEM_DATA, ItemType } from './Inventory';
import { MissionSave, MissionTracker, WorldState } from './MissionTracker';
import { setRecipeGate } from './RecipeGate';

/**
 * Missions (openspec navigation-and-orbits, missions): the tracker fed from
 * game events and the inventory, saved per world as it changes, a toast on
 * each mission done, the recipe gate, and the Missions tab of the E panel -
 * Pale Blue Dot's mission tree: cards laid out from the tree, one row per
 * branch under its plaque, lines from parent to child, Done / Now / Open /
 * Locked, pan, designed zoom steps and Fit, and a side panel.
 */

// What each objective kind shows when it has no item icon
const KIND_ICON: Record<string, string> = {
  padComplete: '/textures/technology/launch_pad_face.png',
  assembled: '/textures/rocket_parts/medium_engine.png',
  launched: '/textures/rocket_parts/medium_engine.png',
  landed: '/textures/moon.png',
  caught: '/textures/fish/minnow.png',
  caughtOn: '/textures/fish/minnow.png',
  reached: '/textures/grass.png',
};

const BY_ID = new Map(MISSIONS.map(m => [m.id, m]));
const BRANCH_NAME = new Map(MISSION_BRANCHES.map(b => [b.id, b.name]));

// ---- layout (static: the tree never changes shape) ------------------------

interface Slot { col: number; row: number; branchIndex: number; branch: string }

function layoutTree(): { slots: Map<string, Slot>; rows: number; cols: number; branchStart: Map<string, { col: number; row: number; branchIndex: number }> } {
  const depth = new Map<string, number>();
  const depthOf = (m: Mission): number => {
    if (depth.has(m.id)) return depth.get(m.id)!;
    const d = m.parent ? depthOf(BY_ID.get(m.parent)!) + 1 : 0;
    depth.set(m.id, d);
    return d;
  };
  const slots = new Map<string, Slot>();
  const branchStart = new Map<string, { col: number; row: number; branchIndex: number }>();
  let rowBase = 0;
  MISSION_BRANCHES.forEach((b, branchIndex) => {
    const inBranch = MISSIONS.filter(m => m.branch === b.id);
    if (!inBranch.length) return;
    let rows = 0;
    // First child carries on its parent's row; later children start rows below
    const place = (m: Mission, row: number) => {
      slots.set(m.id, { col: depthOf(m), row, branchIndex, branch: b.id });
      rows = Math.max(rows, row + 1);
      const kids = inBranch.filter(k => k.parent === m.id);
      kids.forEach((k, i) => place(k, i === 0 ? row : rows));
    };
    for (const root of inBranch.filter(m => !m.parent || BY_ID.get(m.parent)!.branch !== b.id)) place(root, rows);
    const first = inBranch.reduce((a, m) => (slots.get(m.id)!.col < slots.get(a.id)!.col ? m : a));
    branchStart.set(b.id, { ...slots.get(first.id)!, row: rowBase });
    rowBase += rows;
  });
  let cols = 0;
  for (const s of slots.values()) cols = Math.max(cols, s.col + 1);
  return { slots, rows: rowBase, cols, branchStart };
}

const LAYOUT = layoutTree();

export class MissionsPanel {
  private tracker: MissionTracker;
  private el: HTMLElement | null = null;
  private sinceSample = 0;
  // view state, kept while the game runs
  private level = UI.START_LEVEL;
  private panX = 0;
  private panY = 0;
  private placed = false;
  private selected: string | null = null;

  constructor(private inventory: Inventory, existingWorld: boolean, world: () => WorldState) {
    const saved = gameStorage.getMissionState<MissionSave>();
    this.tracker = new MissionTracker(saved);
    const held = (item: number) => this.inventory.getItemCount(item as ItemType);
    // A world played before the tree starts where it is, keeping its recipes
    if ((!saved || (saved as { v?: number }).v !== 2) && existingWorld) this.tracker.skipSatisfied(world());
    this.tracker.baseline(held);
    this.tracker.onComplete = (m) => {
      const names = m.unlocks.map(u => ITEM_DATA[u]?.name).filter(Boolean);
      showToast(`Mission done: ${m.title}${names.length ? ` - unlocked ${names.join(', ')}` : ''}`, { duration: 5000 });
    };
    this.tracker.onChange = () => {
      gameStorage.saveMissionState(this.tracker.save());
      if (this.el) this.render(this.el);
    };
    gameStorage.saveMissionState(this.tracker.save());
    setRecipeGate(this.tracker);
    onGameEvent((type, key, n) => this.tracker.event(type, key, n, held));
  }

  public getTracker(): MissionTracker {
    return this.tracker;
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
    if (!this.placed) {
      this.placed = true;
      // Open on the mission to do next
      const now = this.tracker.now();
      if (now) this.centreOn(now.id); else this.fit();
    }
  }

  public hide(): void {
    this.el = null;
  }

  // ---- geometry at the current zoom level --------------------------------

  private get L() { return UI.LEVELS[this.level]; }

  // Packed layout per zoom level (cached): each branch is a block - its
  // plaque over its cards - placed as high as it can go, no higher than its
  // parent's card and clear of every block already placed. So the main line
  // runs straight on and side branches sit right under the trunk, instead
  // of every branch taking new rows below all the ones before it.
  private packedCache = new Map<number, { cards: Map<string, { x: number; y: number }>; plaques: Map<string, { x: number; y: number }>; w: number; h: number }>();

  private packed() {
    const hit = this.packedCache.get(this.level);
    if (hit) return hit;
    const L = this.L;
    const stepX = L.cardW + L.gapX, stepY = L.cardH + L.gapY;
    const cards = new Map<string, { x: number; y: number }>();
    const plaques = new Map<string, { x: number; y: number }>();
    const placed: Array<{ x0: number; x1: number; y0: number; y1: number }> = [];
    let w = 0, h = 0;
    MISSION_BRANCHES.forEach((b, i) => {
      const members = MISSIONS.filter(m => m.branch === b.id);
      if (!members.length) return;
      let c0 = Infinity, c1 = -Infinity, rows = 0;
      for (const m of members) {
        const sl = LAYOUT.slots.get(m.id)!;
        c0 = Math.min(c0, sl.col); c1 = Math.max(c1, sl.col);
        rows = Math.max(rows, sl.row + 1);
      }
      const label = `${i}. ${b.name}`;
      const x0 = UI.PAD + c0 * stepX;
      const x1 = Math.max(UI.PAD + c1 * stepX + L.cardW, x0 + label.length * L.font * UI.PLAQUE_CHAR_W);
      const height = L.plaque + rows * stepY - L.gapY;
      // no higher than the parent's card (the branch grows out of it)
      const root = members.find(m => !m.parent || BY_ID.get(m.parent)!.branch !== b.id)!;
      const parentCard = root.parent ? cards.get(root.parent) : undefined;
      let y = parentCard ? parentCard.y - L.plaque : UI.PAD;
      for (let moved = true; moved;) {
        moved = false;
        for (const r of placed) {
          const overlapX = x0 < r.x1 + L.gapX && x1 + L.gapX > r.x0;
          const overlapY = y < r.y1 + L.gapY && y + height + L.gapY > r.y0;
          if (overlapX && overlapY) { y = r.y1 + L.gapY; moved = true; }
        }
      }
      placed.push({ x0, x1, y0: y, y1: y + height });
      plaques.set(b.id, { x: x0, y });
      for (const m of members) {
        const sl = LAYOUT.slots.get(m.id)!;
        cards.set(m.id, { x: UI.PAD + sl.col * stepX, y: y + L.plaque + sl.row * stepY });
      }
      w = Math.max(w, x1 + UI.PAD);
      h = Math.max(h, y + height + UI.PAD);
    });
    const out = { cards, plaques, w, h };
    this.packedCache.set(this.level, out);
    return out;
  }

  private cardPos(id: string): { x: number; y: number } {
    return this.packed().cards.get(id)!;
  }

  private treeSize(): { w: number; h: number } {
    const p = this.packed();
    return { w: p.w, h: p.h };
  }

  private stageSize(): { w: number; h: number } {
    const stage = this.el?.querySelector<HTMLElement>('.mt-stage');
    return { w: stage?.clientWidth ?? 800, h: stage?.clientHeight ?? 500 };
  }

  // ---- view controls ------------------------------------------------------

  private fit(): void {
    const stage = this.stageSize();
    let best = 0;
    for (let i = 0; i < UI.LEVELS.length; i++) {
      this.level = i;
      const t = this.treeSize();
      if (t.w <= stage.w && t.h <= stage.h) best = i;
    }
    this.level = best;
    const t = this.treeSize();
    this.panX = Math.round((stage.w - t.w) / 2);
    this.panY = Math.round((stage.h - t.h) / 2);
    this.redraw();
  }

  private centreOn(id: string): void {
    const stage = this.stageSize();
    const p = this.cardPos(id);
    this.panX = Math.round(stage.w / 2 - p.x - this.L.cardW / 2);
    this.panY = Math.round(stage.h / 2 - p.y - this.L.cardH / 2);
    this.redraw();
  }

  /** One zoom step about a point of the stage: what is under it stays put. */
  private zoomAt(step: number, sx: number, sy: number): void {
    const next = Math.max(0, Math.min(UI.LEVELS.length - 1, this.level + step));
    if (next === this.level) return;
    const before = this.treeSize();
    const fx = (sx - this.panX) / before.w;
    const fy = (sy - this.panY) / before.h;
    this.level = next;
    const after = this.treeSize();
    this.panX = Math.round(sx - fx * after.w);
    this.panY = Math.round(sy - fy * after.h);
    this.redraw();
  }

  private redraw(): void {
    if (this.el) this.render(this.el);
  }

  // ---- drawing --------------------------------------------------------------

  private render(el: HTMLElement): void {
    const L = this.L;
    const tree = this.treeSize();
    const root = document.createElement('div');
    root.className = 'mt-root';

    // Toolbar: legend and zoom
    const bar = document.createElement('div');
    bar.className = 'mt-bar';
    const button = (label: string, act: () => void) => {
      const b = document.createElement('button');
      b.className = 'mt-btn';
      b.textContent = label;
      b.addEventListener('click', act);
      return b;
    };
    const stageCentre = () => { const s = this.stageSize(); return [s.w / 2, s.h / 2] as const; };
    bar.append(
      button('Fit', () => this.fit()),
      button('-', () => this.zoomAt(-1, ...stageCentre())),
      button('+', () => this.zoomAt(1, ...stageCentre())),
    );
    const legend = document.createElement('div');
    legend.className = 'mt-legend';
    for (const [state, name] of [['done', 'Done'], ['now', 'Now'], ['open', 'Open'], ['locked', 'Locked']]) {
      const k = document.createElement('span');
      k.className = `mt-key mt-${state}`;
      k.textContent = name;
      legend.appendChild(k);
    }
    bar.appendChild(legend);

    const body = document.createElement('div');
    body.className = 'mt-body';
    const stage = document.createElement('div');
    stage.className = 'mt-stage';
    const content = document.createElement('div');
    content.className = 'mt-content';
    content.style.width = `${tree.w}px`;
    content.style.height = `${tree.h}px`;
    content.style.left = `${this.panX}px`;
    content.style.top = `${this.panY}px`;

    // Lines: parent's right edge to child's left edge, elbowed
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', String(tree.w));
    svg.setAttribute('height', String(tree.h));
    svg.classList.add('mt-lines');
    for (const m of MISSIONS) {
      if (!m.parent) continue;
      const a = this.cardPos(m.parent), b = this.cardPos(m.id);
      const x1 = a.x + L.cardW, y1 = a.y + L.cardH / 2, x2 = b.x, y2 = b.y + L.cardH / 2;
      const mid = x2 - Math.round(L.gapX / 2);
      const path = document.createElementNS(NS, 'path');
      path.setAttribute('d', `M${x1} ${y1} H${mid} V${y2} H${x2}`);
      const st = this.tracker.state(m);
      path.setAttribute('class', `mt-line mt-line-${st === 'locked' ? 'locked' : this.tracker.isDone(m.parent) ? 'live' : 'locked'}`);
      svg.appendChild(path);
    }
    content.appendChild(svg);

    // Branch plaques
    MISSION_BRANCHES.forEach((b, i) => {
      const start = this.packed().plaques.get(b.id);
      if (!start) return;
      const plaque = document.createElement('div');
      plaque.className = 'mt-plaque';
      plaque.textContent = `${i}. ${b.name}`;
      plaque.style.left = `${start.x}px`;
      plaque.style.top = `${start.y}px`;
      plaque.style.fontSize = `${L.font}px`;
      content.appendChild(plaque);
    });

    // Cards
    for (const m of MISSIONS) content.appendChild(this.card(m));
    stage.appendChild(content);
    body.appendChild(stage);
    if (this.selected && BY_ID.has(this.selected)) body.appendChild(this.side(BY_ID.get(this.selected)!));
    root.append(bar, body);
    el.replaceChildren(root);
    this.wireStage(stage);
  }

  private card(m: Mission): HTMLElement {
    const L = this.L;
    const state = this.tracker.state(m);
    const p = this.cardPos(m.id);
    const card = document.createElement('div');
    card.className = `mt-card mt-${state}${this.selected === m.id ? ' mt-selected' : ''}`;
    card.dataset.id = m.id;
    card.style.left = `${p.x}px`;
    card.style.top = `${p.y}px`;
    card.style.width = `${L.cardW}px`;
    card.style.height = `${L.cardH}px`;
    card.style.fontSize = `${L.font}px`;
    if (L.detail === 0) card.style.padding = '1px 2px';  // an overview card is its icon
    const head = document.createElement('div');
    head.className = 'mt-head';
    head.appendChild(icon(ITEM_DATA[m.icon]?.texture, L.icon));
    if (L.detail >= 1) {
      const t = document.createElement('span');
      t.className = 'mt-title';
      t.textContent = m.title;
      head.appendChild(t);
    }
    if (state === 'done' && L.detail >= 1) {
      const tick = document.createElement('span');
      tick.className = 'mt-tick';
      tick.textContent = 'v';
      head.appendChild(tick);
    }
    if (state === 'now' && L.detail >= 1) {
      const badge = document.createElement('span');
      badge.className = 'mt-badge';
      badge.textContent = 'NOW';
      card.appendChild(badge);
    }
    card.appendChild(head);
    if (L.detail >= 2) {
      const prog = this.tracker.progress(m);
      const list = document.createElement('div');
      list.className = 'mt-objs';
      m.objectives.forEach((o, i) => {
        const row = document.createElement('div');
        row.className = 'mt-obj' + (prog[i] >= o.count ? ' mt-met' : '');
        const box = document.createElement('span');
        box.className = 'mt-box';
        box.textContent = prog[i] >= o.count ? 'x' : '';
        const label = document.createElement('span');
        label.className = 'mt-olabel';
        label.textContent = o.label;
        const count = document.createElement('span');
        count.className = 'mt-ocount';
        count.textContent = state === 'locked' ? `${o.count}` : `${Math.min(prog[i], o.count)}/${o.count}`;
        row.append(box, label, count);
        list.appendChild(row);
      });
      card.appendChild(list);
    }
    if (L.detail >= 3 && m.unlocks.length) {
      const un = document.createElement('div');
      un.className = 'mt-unlocks';
      const label = document.createElement('span');
      label.textContent = 'UNLOCKS';
      un.appendChild(label);
      for (const u of m.unlocks) un.appendChild(icon(ITEM_DATA[u]?.texture, UI.LEVELS[1].icon, ITEM_DATA[u]?.name));
      card.appendChild(un);
    }
    return card;
  }

  private side(m: Mission): HTMLElement {
    const state = this.tracker.state(m);
    const prog = this.tracker.progress(m);
    const side = document.createElement('div');
    side.className = 'mt-side';
    side.style.width = `${UI.SIDE_W}px`;
    const close = document.createElement('button');
    close.className = 'mt-close';
    close.textContent = 'x';
    close.addEventListener('click', () => { this.selected = null; this.redraw(); });
    const head = document.createElement('div');
    head.className = 'mt-side-head';
    head.appendChild(icon(ITEM_DATA[m.icon]?.texture, 32));
    const t = document.createElement('div');
    t.innerHTML = '';
    const title = document.createElement('div');
    title.className = 'mt-side-title';
    title.textContent = m.title;
    const sub = document.createElement('div');
    sub.className = 'mt-side-sub';
    sub.textContent = `${BRANCH_NAME.get(m.branch) ?? ''} - ${state === 'now' ? 'Now' : state[0].toUpperCase() + state.slice(1)}`;
    t.append(title, sub);
    head.append(t, close);
    side.appendChild(head);

    const section = (name: string) => {
      const h = document.createElement('div');
      h.className = 'mt-side-section';
      h.textContent = name;
      side.appendChild(h);
    };
    section('Objectives');
    m.objectives.forEach((o, i) => side.appendChild(objectiveRow(o, state === 'locked' ? 0 : prog[i])));
    section('Help');
    const help = document.createElement('div');
    help.className = 'mt-side-text';
    help.textContent = m.help;
    side.appendChild(help);
    section('Unlocks');
    if (m.unlocks.length) {
      for (const u of m.unlocks) {
        const row = document.createElement('div');
        row.className = 'mt-side-unlock';
        row.appendChild(icon(ITEM_DATA[u]?.texture, 24));
        const n = document.createElement('span');
        n.textContent = ITEM_DATA[u]?.name ?? '';
        row.appendChild(n);
        side.appendChild(row);
      }
    } else {
      side.appendChild(text('-'));
    }
    const links = (ids: string[]) => {
      const row = document.createElement('div');
      row.className = 'mt-side-links';
      if (!ids.length) row.textContent = '-';
      for (const id of ids) {
        const a = document.createElement('a');
        a.textContent = BY_ID.get(id)?.title ?? id;
        a.addEventListener('click', () => { this.selected = id; this.centreOn(id); });
        row.appendChild(a);
      }
      side.appendChild(row);
    };
    section('Needs');
    links([...(m.parent ? [m.parent] : []), ...(m.after ?? [])]);
    section('Opens next');
    links(MISSIONS.filter(k => k.parent === m.id || (k.after ?? []).includes(m.id)).map(k => k.id));
    return side;
  }

  // Drag pans; a click (under the slop) opens a card; the wheel zooms
  private wireStage(stage: HTMLElement): void {
    let down: { x: number; y: number; px: number; py: number; moved: boolean } | null = null;
    stage.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY, px: this.panX, py: this.panY, moved: false };
      stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (!down.moved && Math.hypot(dx, dy) < UI.DRAG_SLOP_PX) return;
      down.moved = true;
      this.panX = Math.round(down.px + dx);
      this.panY = Math.round(down.py + dy);
      const content = stage.querySelector<HTMLElement>('.mt-content');
      if (content) { content.style.left = `${this.panX}px`; content.style.top = `${this.panY}px`; }
    });
    stage.addEventListener('pointerup', (e) => {
      const was = down;
      down = null;
      if (!was || was.moved) return;
      const hit = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>('.mt-card');
      this.selected = hit?.dataset.id ?? null;
      this.redraw();
    });
    stage.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = stage.getBoundingClientRect();
      this.zoomAt(e.deltaY < 0 ? 1 : -1, e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
  }
}

function icon(texture: string | undefined, px: number, title?: string): HTMLElement {
  const img = document.createElement('img');
  img.className = 'mt-icon';
  img.width = px;
  img.height = px;
  if (texture) img.src = getAssetPath(texture);
  if (title) img.title = title;
  img.draggable = false;
  return img;
}

function text(s: string): HTMLElement {
  const d = document.createElement('div');
  d.className = 'mt-side-text';
  d.textContent = s;
  return d;
}

function objectiveRow(o: MissionObjective, have: number): HTMLElement {
  const row = document.createElement('div');
  row.className = 'mt-side-obj' + (have >= o.count ? ' mt-met' : '');
  const top = document.createElement('div');
  top.className = 'mt-side-obj-top';
  top.appendChild(icon(o.item !== undefined ? ITEM_DATA[o.item]?.texture : KIND_ICON[o.kind], 20));
  const label = document.createElement('span');
  label.textContent = o.label;
  const count = document.createElement('span');
  count.className = 'mt-ocount';
  count.textContent = `${Math.min(have, o.count)}/${o.count}`;
  top.append(label, count);
  const bar = document.createElement('div');
  bar.className = 'mt-bar-track';
  const fill = document.createElement('div');
  fill.className = 'mt-bar-fill';
  fill.style.width = `${Math.round((100 * Math.min(have, o.count)) / o.count)}%`;
  bar.appendChild(fill);
  row.append(top, bar);
  return row;
}

function injectStyle(): void {
  if (document.getElementById('missions-style')) return;
  const style = document.createElement('style');
  style.id = 'missions-style';
  style.textContent = `
    #panel-missions .mt-root { display: flex; flex-direction: column; height: 100%; gap: 8px; }
    .mt-bar { display: flex; gap: 6px; align-items: center; }
    .mt-btn { background: #333; color: #ddd; border: 1px solid #555; border-radius: 4px; padding: 4px 12px; font-family: var(--game-font); font-size: 14px; cursor: pointer; }
    .mt-btn:hover { border-color: #4CAF50; }
    .mt-legend { margin-left: auto; display: flex; gap: 10px; font-size: 12px; color: #bbb; }
    .mt-key::before { content: ''; display: inline-block; width: 10px; height: 10px; margin-right: 4px; border: 2px solid #555; vertical-align: -1px; }
    .mt-key.mt-done::before { border-color: #4CAF50; background: rgba(76,175,80,0.35); }
    .mt-key.mt-now::before { border-color: #ffa300; }
    .mt-key.mt-open::before { border-color: #8a97a8; }
    .mt-key.mt-locked::before { border-color: #3a3f47; background: #1a1d22; }
    .mt-body { flex: 1; display: flex; gap: 8px; min-height: 0; }
    .mt-stage { flex: 1; position: relative; overflow: hidden; background: #12161e; border: 1px solid #333; border-radius: 6px; cursor: grab; touch-action: none; user-select: none; }
    .mt-content { position: absolute; }
    .mt-lines { position: absolute; left: 0; top: 0; pointer-events: none; }
    .mt-line { fill: none; stroke-width: 2; }
    .mt-line-live { stroke: #4CAF50; }
    .mt-line-locked { stroke: #3a3f47; }
    .mt-plaque { position: absolute; font-family: var(--game-font); color: #9fe0a5; letter-spacing: 1px; text-transform: uppercase; white-space: nowrap; }
    .mt-card { position: absolute; box-sizing: border-box; background: #1f242d; border: 2px solid #3d4450; border-radius: 5px; padding: 4px 6px; overflow: hidden; color: #e8ecf2; cursor: pointer; }
    .mt-card.mt-done { border-color: #4CAF50; background: #1d2a21; }
    .mt-card.mt-now { border-color: #ffa300; box-shadow: 0 0 0 2px rgba(255,163,0,0.25); }
    .mt-card.mt-open { border-color: #8a97a8; }
    .mt-card.mt-locked { opacity: 0.45; }
    .mt-card.mt-selected { outline: 2px solid #3ee0ff; outline-offset: 1px; }
    .mt-head { display: flex; align-items: center; gap: 6px; min-width: 0; }
    .mt-title { font-family: var(--game-font); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .mt-tick { margin-left: auto; color: #4CAF50; font-weight: bold; }
    .mt-badge { position: absolute; right: 0; top: 0; background: #ffa300; color: #111; font-size: 9px; padding: 1px 4px; font-family: var(--game-font); }
    .mt-icon { image-rendering: pixelated; flex: none; }
    .mt-objs { margin-top: 3px; display: grid; gap: 1px; }
    .mt-obj { display: flex; gap: 4px; align-items: center; color: #c8d0da; white-space: nowrap; }
    .mt-obj.mt-met { color: #7be08a; }
    .mt-box { width: 9px; height: 9px; border: 1px solid #6b7480; font-size: 8px; line-height: 9px; text-align: center; flex: none; }
    .mt-olabel { overflow: hidden; text-overflow: ellipsis; }
    .mt-ocount { margin-left: auto; color: #9fb3c8; }
    .mt-unlocks { display: flex; gap: 3px; align-items: center; margin-top: 3px; font-size: 9px; color: #7a8696; }
    .mt-unlocks span { margin-right: 2px; }
    .mt-side { flex: none; background: #1a1f28; border: 1px solid #3d4450; border-radius: 6px; padding: 10px 12px; overflow-y: auto; color: #e8ecf2; }
    .mt-side-head { display: flex; gap: 8px; align-items: center; }
    .mt-side-title { font-family: var(--game-font); font-size: 17px; color: #ffa300; }
    .mt-side-sub { font-size: 11px; color: #8a97a8; text-transform: uppercase; letter-spacing: 1px; }
    .mt-close { margin-left: auto; background: #333; color: #ddd; border: 1px solid #555; border-radius: 4px; cursor: pointer; }
    .mt-side-section { margin: 12px 0 4px; font-family: var(--game-font); font-size: 13px; color: #9fe0a5; text-transform: uppercase; letter-spacing: 1px; }
    .mt-side-text { font-size: 13px; color: #c8d0da; }
    .mt-side-obj { margin: 4px 0; font-size: 13px; }
    .mt-side-obj-top { display: flex; gap: 6px; align-items: center; }
    .mt-side-obj.mt-met { color: #7be08a; }
    .mt-bar-track { height: 4px; background: #2b313b; margin-top: 3px; }
    .mt-bar-fill { height: 4px; background: #4CAF50; }
    .mt-side-unlock { display: flex; gap: 6px; align-items: center; font-size: 13px; margin: 3px 0; }
    .mt-side-links { display: flex; flex-wrap: wrap; gap: 8px; font-size: 13px; }
    .mt-side-links a { color: #3ee0ff; text-decoration: underline; cursor: pointer; }
  `;
  document.head.appendChild(style);
}
