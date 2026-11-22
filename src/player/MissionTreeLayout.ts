import { MISSIONS, MISSION_BRANCHES, MISSION_TREE_UI as UI, Mission } from '../config/Missions';

/**
 * The mission tree's layout (openspec navigation-and-orbits, missions): where
 * every card, plaque and line goes at one zoom level. Pure - no DOM - so the
 * panel draws it and a test checks it.
 *
 * Each branch is a block (its plaque over its cards), placed as high as it
 * can go - no higher than its parent's card - clear of every block and every
 * line already placed. A line runs from the parent's right edge to a channel
 * just left of the child, down that channel, and into the child. A line must
 * never cross a card or a plaque, and lines from different parents never
 * share a stretch (siblings from one parent may share their channel, a bus).
 * When a branch's line would have to cross a block placed before it, that
 * branch is placed first instead, and the packing runs again.
 */

export type Level = (typeof UI.LEVELS)[number];

interface Slot { col: number; row: number; branch: string }

const BY_ID = new Map(MISSIONS.map(m => [m.id, m]));

/** Columns (depth in the tree) and rows within each branch. Static. */
function slotTree(): Map<string, Slot> {
  const depth = new Map<string, number>();
  const depthOf = (m: Mission): number => {
    if (depth.has(m.id)) return depth.get(m.id)!;
    const d = m.parent ? depthOf(BY_ID.get(m.parent)!) + 1 : 0;
    depth.set(m.id, d);
    return d;
  };
  // A mission whose subtree reaches into another branch: other branches'
  // lines leave from it, downward
  const leadsOut = new Map<string, boolean>();
  const leads = (m: Mission): boolean => {
    if (leadsOut.has(m.id)) return leadsOut.get(m.id)!;
    const v = MISSIONS.some(k => k.parent === m.id && (k.branch !== m.branch || leads(k)));
    leadsOut.set(m.id, v);
    return v;
  };
  const slots = new Map<string, Slot>();
  for (const b of MISSION_BRANCHES) {
    const inBranch = MISSIONS.filter(m => m.branch === b.id);
    let rows = 0;
    // First child carries on its parent's row; later children start rows
    // below. Children that lead out to other branches go last, so the lines
    // dropping from them to those branches don't cut across their siblings.
    const place = (m: Mission, row: number) => {
      slots.set(m.id, { col: depthOf(m), row, branch: b.id });
      rows = Math.max(rows, row + 1);
      const kids = inBranch.filter(k => k.parent === m.id);
      kids.sort((p, q) => Number(leads(p)) - Number(leads(q)));
      kids.forEach((k, i) => place(k, i === 0 ? row : rows));
    };
    for (const root of inBranch.filter(m => !m.parent || BY_ID.get(m.parent)!.branch !== b.id)) place(root, rows);
  }
  return slots;
}

const SLOTS = slotTree();

export interface Rect { x0: number; y0: number; x1: number; y1: number }
/** A line from parent to child: H to `mid`, V to the child's row, H in. */
export interface Link { parent: string; child: string; x1: number; y1: number; mid: number; y2: number; x2: number }
export interface TreeLayout {
  cards: Map<string, { x: number; y: number }>;
  plaques: Map<string, { x: number; y: number; label: string }>;
  links: Link[];
  w: number;
  h: number;
}

/** The plaque's text: its number in the branch list, then its name. */
export function plaqueLabel(branch: string): string {
  const i = MISSION_BRANCHES.findIndex(b => b.id === branch);
  return `${i}. ${MISSION_BRANCHES[i].name}`;
}

/** The branch a branch grows from (undefined for the trunk). */
function parentBranch(branch: string): string | undefined {
  const root = rootOf(branch);
  return root.parent ? BY_ID.get(root.parent)!.branch : undefined;
}

function rootOf(branch: string): Mission {
  return MISSIONS.find(m => m.branch === branch && (!m.parent || BY_ID.get(m.parent)!.branch !== branch))!;
}

function linkOf(L: Level, cards: Map<string, { x: number; y: number }>, m: Mission): Link {
  const a = cards.get(m.parent!)!, b = cards.get(m.id)!;
  return {
    parent: m.parent!, child: m.id,
    x1: a.x + L.cardW, y1: a.y + L.cardH / 2,
    mid: b.x - Math.round(L.gapX / 2),
    y2: b.y + L.cardH / 2, x2: b.x,
  };
}

/** The three straight pieces of a link, each as a (zero-width) rect. */
export function linkSegments(k: Link): Rect[] {
  return [
    { x0: Math.min(k.x1, k.mid), x1: Math.max(k.x1, k.mid), y0: k.y1, y1: k.y1 },
    { x0: k.mid, x1: k.mid, y0: Math.min(k.y1, k.y2), y1: Math.max(k.y1, k.y2) },
    { x0: Math.min(k.mid, k.x2), x1: Math.max(k.mid, k.x2), y0: k.y2, y1: k.y2 },
  ].filter(s => s.x0 !== s.x1 || s.y0 !== s.y1);
}

/** A segment passes through the inside of a rect (touching an edge is fine). */
function segHitsRect(s: Rect, r: Rect): boolean {
  return s.x1 > r.x0 && s.x0 < r.x1 && s.y1 > r.y0 && s.y0 < r.y1
    || (s.x0 === s.x1 && s.x0 > r.x0 && s.x0 < r.x1 && s.y1 > r.y0 && s.y0 < r.y1)
    || (s.y0 === s.y1 && s.y0 > r.y0 && s.y0 < r.y1 && s.x1 > r.x0 && s.x0 < r.x1);
}

/** Two segments meet anywhere (cross, touch or run along each other). */
function segsMeet(a: Rect, b: Rect): boolean {
  return a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1;
}

/** Everything a line must stay off: every card, and every plaque. */
export function obstacles(L: Level, t: TreeLayout): Array<Rect & { owner: string; branch: string }> {
  const out: Array<Rect & { owner: string; branch: string }> = [];
  for (const [id, c] of t.cards) out.push({ x0: c.x, y0: c.y, x1: c.x + L.cardW, y1: c.y + L.cardH, owner: id, branch: BY_ID.get(id)!.branch });
  for (const [branch, p] of t.plaques) {
    out.push({ x0: p.x, y0: p.y, x1: p.x + plaqueWidth(L, p.label), y1: p.y + L.plaque, owner: `plaque:${branch}`, branch });
  }
  return out;
}

function plaqueWidth(L: Level, label: string): number {
  return label.length * L.font * UI.PLAQUE_CHAR_W;
}

/**
 * Where lines go wrong: a line through a card or plaque that isn't its own
 * ends, or two lines from different parents meeting. Empty when the tree is
 * clean.
 */
export function linkProblems(L: Level, t: TreeLayout): Array<{ link: Link; what: string; branch?: string }> {
  const out: Array<{ link: Link; what: string; branch?: string }> = [];
  const obs = obstacles(L, t);
  for (const k of t.links) {
    const segs = linkSegments(k);
    for (const o of obs) {
      if (o.owner === k.parent || o.owner === k.child) continue;
      if (segs.some(s => segHitsRect(s, o))) out.push({ link: k, what: `crosses ${o.owner}`, branch: o.branch });
    }
  }
  for (let i = 0; i < t.links.length; i++) {
    for (let j = i + 1; j < t.links.length; j++) {
      const a = t.links[i], b = t.links[j];
      if (a.parent === b.parent) continue;
      // a line into a card and a line out of it sit on its opposite sides
      if (a.child === b.parent || b.child === a.parent) continue;
      if (!linkSegments(a).some(x => linkSegments(b).some(y => segsMeet(x, y)))) continue;
      // blame the longer drop: it's the one running through the other's row
      const [long, short] = Math.abs(a.y2 - a.y1) >= Math.abs(b.y2 - b.y1) ? [a, b] : [b, a];
      out.push({ link: long, what: `meets the line to ${short.child}`, branch: BY_ID.get(short.child)!.branch });
    }
  }
  return out;
}

/** One packing pass with branches in the given order (parents first). */
function packOnce(L: Level, order: string[]): TreeLayout {
  const stepX = L.cardW + L.gapX, stepY = L.cardH + L.gapY;
  const cards = new Map<string, { x: number; y: number }>();
  const plaques = new Map<string, { x: number; y: number; label: string }>();
  const blocks: Rect[] = [];
  const channels: Rect[] = [];  // the vertical runs of lines already placed
  let w = 0, h = 0;
  for (const branch of order) {
    const members = MISSIONS.filter(m => m.branch === branch);
    let c0 = Infinity, c1 = -Infinity, rows = 0;
    for (const m of members) {
      const sl = SLOTS.get(m.id)!;
      c0 = Math.min(c0, sl.col); c1 = Math.max(c1, sl.col);
      rows = Math.max(rows, sl.row + 1);
    }
    const label = plaqueLabel(branch);
    const x0 = UI.PAD + c0 * stepX;
    const x1 = Math.max(UI.PAD + c1 * stepX + L.cardW, x0 + plaqueWidth(L, label));
    const height = L.plaque + rows * stepY - L.gapY;
    const root = rootOf(branch);
    const parentCard = root.parent ? cards.get(root.parent) : undefined;
    // no higher than the parent's card (the branch grows out of it)
    let y = parentCard ? parentCard.y - L.plaque : UI.PAD;
    for (let moved = true; moved;) {
      moved = false;
      for (const r of blocks) {
        const overlapX = x0 < r.x1 + L.gapX && x1 + L.gapX > r.x0;
        const overlapY = y < r.y1 + L.gapY && y + height + L.gapY > r.y0;
        if (overlapX && overlapY) { y = r.y1 + L.gapY; moved = true; }
      }
      // and off every line already run past here
      for (const c of channels) {
        const overX = c.x0 >= x0 && c.x0 <= x1;
        const overY = c.y1 > y - L.gapY && c.y0 < y + height + L.gapY;
        if (overX && overY) { y = c.y1 + L.gapY; moved = true; }
      }
    }
    blocks.push({ x0, x1, y0: y, y1: y + height });
    plaques.set(branch, { x: x0, y, label });
    for (const m of members) {
      const sl = SLOTS.get(m.id)!;
      cards.set(m.id, { x: UI.PAD + sl.col * stepX, y: y + L.plaque + sl.row * stepY });
    }
    for (const m of members) {
      if (!m.parent) continue;
      const k = linkOf(L, cards, m);
      channels.push({ x0: k.mid, x1: k.mid, y0: Math.min(k.y1, k.y2), y1: Math.max(k.y1, k.y2) });
    }
    w = Math.max(w, x1 + UI.PAD);
    h = Math.max(h, y + height + UI.PAD);
  }
  const links = MISSIONS.filter(m => m.parent).map(m => linkOf(L, cards, m));
  assignLanes(L, links);
  return { cards, plaques, links, w, h };
}

/**
 * Parents whose lines run down the same gap at the same height each get
 * their own lane in it. One that starts higher takes a lane further right:
 * the lower parent's stub then stops short of it, and the higher one's
 * line turns in to its child clear of the lower one.
 */
function assignLanes(L: Level, links: Link[]): void {
  const byGap = new Map<number, Link[]>();
  for (const k of links) {
    if (k.y1 === k.y2) continue;  // straight across: no channel
    const g = byGap.get(k.x2) ?? [];
    g.push(k);
    byGap.set(k.x2, g);
  }
  for (const [x2, ks] of byGap) {
    // one span per parent (its siblings share a lane - a bus)
    const spans = new Map<string, { y0: number; y1: number; ks: Link[] }>();
    for (const k of ks) {
      const s = spans.get(k.parent) ?? { y0: k.y1, y1: k.y1, ks: [] };
      s.y1 = Math.max(s.y1, k.y2);
      s.ks.push(k);
      spans.set(k.parent, s);
    }
    // groups of spans that overlap in height
    const list = [...spans.values()].sort((a, b) => a.y0 - b.y0);
    const left = x2 - L.gapX;
    for (let i = 0; i < list.length;) {
      let end = list[i].y1, j = i + 1;
      while (j < list.length && list[j].y0 <= end) { end = Math.max(end, list[j].y1); j++; }
      const group = list.slice(i, j);
      if (group.length > 1) {
        // highest start -> rightmost lane
        group.forEach((s, n) => {
          const x = left + Math.round(L.gapX * (group.length - n) / (group.length + 1));
          for (const k of s.ks) k.mid = x;
        });
      }
      i = j;
    }
  }
}

/** Branches in list order, each after the branch it grows from, lowest rank first. */
function orderBy(rank: Map<string, number>): string[] {
  const all = MISSION_BRANCHES.map(b => b.id).filter(id => MISSIONS.some(m => m.branch === id));
  const done = new Set<string>();
  const out: string[] = [];
  while (out.length < all.length) {
    const ready = all.filter(b => !done.has(b) && (!parentBranch(b) || done.has(parentBranch(b)!)));
    ready.sort((a, b) => rank.get(a)! - rank.get(b)!);
    done.add(ready[0]);
    out.push(ready[0]);
  }
  return out;
}

const MAX_PASSES = 64;

/** The tree at one zoom level, packed so no line crosses a card or another parent's line. */
export function packTree(L: Level): TreeLayout {
  const rank = new Map(MISSION_BRANCHES.map((b, i) => [b.id as string, i]));
  let best = packOnce(L, orderBy(rank));
  let bestCount = linkProblems(L, best).length;
  for (let pass = 0; pass < MAX_PASSES && bestCount > 0; pass++) {
    const t = pass === 0 ? best : packOnce(L, orderBy(rank));
    const problems = linkProblems(L, t);
    if (problems.length < bestCount) { best = t; bestCount = problems.length; }
    if (!problems.length) break;
    // A branch whose line runs through another branch goes before it
    const p = problems.find(q => q.branch && q.branch !== BY_ID.get(q.link.child)!.branch
      && q.branch !== BY_ID.get(q.link.parent)!.branch);
    if (!p) break;
    const mover = BY_ID.get(p.link.child)!.branch;
    const before = rank.get(p.branch!)! - 0.5;
    if (rank.get(mover)! <= before) break;  // already ahead: reordering can't help
    rank.set(mover, before);
    for (let a = parentBranch(mover); a; a = parentBranch(a)) rank.set(a, Math.min(rank.get(a)!, before));
  }
  return best;
}

/**
 * Pan bounds (Pale Blue Dot's mission tree, apply()): the tree may slide only
 * until its edge reaches the middle of the view, so some of it is always in
 * sight. The pull is toward the nearest card, so at least `keep` px of a card
 * always stays in view. `panX/panY` place the tree's top-left in the stage;
 * the result is the nearest allowed pan (unchanged when already allowed).
 */
export function clampPan(
  L: Level, t: TreeLayout, panX: number, panY: number, stageW: number, stageH: number, keep: number,
): { x: number; y: number } {
  // The stage's centre in tree coordinates, and how far from a card it may go
  let cx = stageW / 2 - panX, cy = stageH / 2 - panY;
  const hx = Math.max(0, stageW / 2 - keep), hy = Math.max(0, stageH / 2 - keep);
  let best: { over: number; x0: number; y0: number } | null = null;
  for (const p of t.cards.values()) {
    const dx = Math.max(p.x - cx, 0, cx - (p.x + L.cardW));
    const dy = Math.max(p.y - cy, 0, cy - (p.y + L.cardH));
    const over = Math.max(dx - hx, 0) + Math.max(dy - hy, 0);
    if (!best || over < best.over) best = { over, x0: p.x, y0: p.y };
    if (!over) break;
  }
  if (!best || !best.over) return { x: panX, y: panY };
  cx = Math.min(Math.max(cx, best.x0 - hx), best.x0 + L.cardW + hx);
  cy = Math.min(Math.max(cy, best.y0 - hy), best.y0 + L.cardH + hy);
  return { x: Math.round(stageW / 2 - cx), y: Math.round(stageH / 2 - cy) };
}
