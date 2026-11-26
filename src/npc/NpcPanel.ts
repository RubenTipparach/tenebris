import { BaseModalMenu } from '../player/BaseModalMenu';
import { Inventory, InventorySlot, ItemType, ITEM_DATA } from '../player/Inventory';
import { getAssetPath } from '../utils/assetPath';
import { NPC_CONFIG, RequestFamily, inhabitedWorld } from '../config/NpcConfig';
import { DeliverResult, Npc, TraderState, VillageRequest, VillageState, foodAt, foodLowMark, friendshipLevel, offerPrice, offersFor } from '../shared/npc';
import { barter } from './NpcBarter';
import { npcSpeciesById } from './NpcModels';
import { deliverFrom } from './NpcDelivery';
import type { NpcClient } from './NpcClient';
import type { NpcPanelHost } from './NpcTalk';

/**
 * An NPC's panel (openspec friendship-npcs, tasks 4.2 and 4.3): an in-game
 * DOM panel like the machines' - the NPC's name, role and village, the
 * player's friendship with the village, the village's food store and its
 * open requests as icon slots (the amount still needed), and the player's
 * items (hotbar row + bag) as one slot grid.
 *
 * Deliver: a request's button (or clicking one of your stacks it wants)
 * hands over what you carry toward it - hotbar and bag together, never more
 * than it still needs - as a village record write (NpcClient.writeVillage),
 * saved the same frame. Online a refused write rolls back and the trade
 * ledger returns the items.
 */

export interface NpcPanelCallbacks {
  /** The player's inventory changed (save it, redraw the hotbar). */
  onInventoryChanged(): void;
  /** A delivery went in: friendship credit (task 5.1), the elder's rewards (task 4.4). */
  onDelivered?(body: string, village: number, fam: RequestFamily, taken: number, res: DeliverResult): void;
  /** The player's friendship score with a village (task 5.1). */
  friendship?(body: string, village: number): number;
  /** Friendship for a delivery the server kept (a refused one credits nothing). */
  credit?(body: string, village: number, points: number, fam: RequestFamily): void;
  /** The panel opened on an NPC: met (task 5.1). */
  onMet?(npc: Npc, body: string): void;
  /** The item an art piece id is (task 4.4), for its icon. */
  artItem?(artId: string): ItemType | null;
  /** A barter went through (task 4.5): met / map marker bookkeeping. */
  onTraded?(trader: number, body: string): void;
}

const HOTBAR = 9;
const FAMILY_TITLE: Record<RequestFamily, string> = { supply: 'Food', build: 'Building', collect: 'Art' };

export class NpcPanel extends BaseModalMenu implements NpcPanelHost {
  private npc: Npc | null = null;
  private body = '';
  private lastKey = '';

  constructor(private readonly inventory: Inventory, private readonly client: NpcClient, private readonly cb: NpcPanelCallbacks) {
    super({ id: 'npc-menu', title: 'Villager' });
    // a village record changing (a delivery, the server's tick) redraws an open panel
    client.store.onChange(() => this.refresh());
  }

  open(npc?: Npc): void {
    if (npc) {
      this.npc = npc;
      this.body = this.bodyOf(npc);
      this.lastKey = '';
      const title = this.getMenuElement()?.querySelector('.modal-menu-title');
      if (title) title.textContent = npc.name;
      this.cb.onMet?.(npc, this.body);
    }
    super.open();
    this.updateContent();
  }

  protected onClose(): void {
    this.npc = null;
  }

  refresh(): void {
    if (this.isOpen()) this.updateContent();
  }

  /** Where an NPC is: a resident's world is in its id; a trader is wherever its record says. */
  private bodyOf(npc: Npc): string {
    if (npc.role !== 'trader') return npc.id.split(':')[0];
    return this.client.trader(this.traderIndex(npc))?.at ?? '';
  }

  private traderIndex(npc: Npc): number {
    return Number(npc.id.split(':')[1]);
  }

  private village(): VillageState | null {
    return this.npc ? this.client.village(this.body, this.npc.village) : null;
  }

  updateContent(): void {
    const el = this.getContentElement();
    const npc = this.npc;
    if (!el || !npc) return;
    const trader = npc.role === 'trader' ? this.client.trader(this.traderIndex(npc)) : null;
    const v = this.village();
    const score = this.cb.friendship?.(this.body, npc.village) ?? 0;
    const key = JSON.stringify([npc.id, v, trader, score, this.inventory.getAllSlots()]);
    if (key === this.lastKey) return;
    this.lastKey = key;
    el.innerHTML = '';
    el.style.minWidth = '520px';

    // who: name (the title), role, village, species
    const world = inhabitedWorld(this.body);
    const villageName = world?.villageNames[npc.village] ?? '';
    const species = npcSpeciesById(npc.species)?.name ?? '';
    const role = npc.role === 'elder' ? `Elder of ${villageName}` : npc.role === 'trader' ? `Travelling trader, visiting ${villageName}` : `Villager of ${villageName}`;
    el.appendChild(this.line(`${role}  -  ${species}`, '#ffa300'));

    // friendship with the village
    const f = friendshipLevel(score);
    el.appendChild(this.line(`Friendship with ${villageName}: level ${f.level}${f.span ? `  (${f.into} / ${f.span})` : '  (highest)'}`));
    el.appendChild(this.bar(f.span ? f.into / f.span : 1, '#ff77a8'));

    if (npc.role === 'trader') {
      if (trader) this.offers(el, trader, f.level);
    } else if (!v) {
      el.appendChild(this.line('...', '#aaa'));
    } else {
      const T = this.client.clockNow(this.body);
      const food = foodAt(v, T), low = foodLowMark(v);
      el.appendChild(this.line(`Food store: ${Math.floor(food)} meals for ${v.pop}`, food <= low ? '#ff004d' : '#c2c3c7'));
      el.appendChild(this.bar(Math.min(1, food / (NPC_CONFIG.FOOD.START_PER_RESIDENT * v.pop)), food <= low ? '#ff004d' : '#00e436'));
      el.appendChild(this.label(v.requests.length ? 'The village asks for' : 'The village needs nothing right now'));
      for (const q of v.requests) el.appendChild(this.requestRow(q));
    }

    // the player's items: hotbar row, then the bag (clicking a stack a request wants delivers it)
    const all = this.inventory.getAllSlots();
    el.appendChild(this.label('Your items (hotbar)'));
    el.appendChild(this.grid(all.slice(0, HOTBAR), v));
    el.appendChild(this.label('Bag'));
    el.appendChild(this.grid(all.slice(HOTBAR), v));
  }

  private requestRow(q: VillageRequest): HTMLElement {
    const row = document.createElement('div');
    row.className = 'npc-request';
    row.style.cssText = 'display:flex;align-items:center;gap:8px;margin:4px 0;padding:4px;border:1px solid #333;border-radius:4px;';
    const item = q.item !== undefined ? (q.item as ItemType) : q.art ? this.cb.artItem?.(q.art) ?? null : null;
    row.appendChild(this.slot({ itemType: item ?? ItemType.NONE, quantity: q.need - q.got }, undefined, true));
    const what = document.createElement('div');
    what.style.cssText = 'flex:1;font-size:12px;';
    const s = q.structure !== undefined ? NPC_CONFIG.STRUCTURES[q.structure] : null;
    const name = item !== null ? ITEM_DATA[item]?.name ?? '' : '';
    what.innerHTML = '';
    what.appendChild(this.line(`${FAMILY_TITLE[q.fam]}: ${name}${s ? ` for the ${s.name} (stage ${(q.stage ?? 0) + 1} of ${s.stages.length})` : ''}`));
    what.appendChild(this.line(`${q.got} / ${q.need} given  -  +${q.fr} friendship`, '#aaa'));
    row.appendChild(what);
    const have = item !== null ? this.inventory.getItemCount(item) : 0;
    const btn = document.createElement('button');
    btn.className = 'npc-deliver';
    const n = Math.min(have, q.need - q.got);
    btn.textContent = n > 0 ? `Give ${n}` : 'You have none';
    btn.disabled = n <= 0;
    btn.style.cssText = 'padding:4px 10px;font-family:inherit;cursor:pointer;';
    btn.onclick = () => this.deliverTo(q.id);
    row.appendChild(btn);
    return row;
  }

  /** A trader's barters for this player (friend's offers and rates included): give -> get, as icon slots. */
  private offers(el: HTMLElement, t: TraderState, level: number): void {
    el.appendChild(this.label(`Barters (goods from its route; friendship level ${level} rates)`));
    for (const i of offersFor(t, level)) {
      const o = t.offers[i];
      const price = offerPrice(o, level);
      const row = document.createElement('div');
      row.className = 'npc-offer';
      row.style.cssText = 'display:flex;align-items:center;gap:8px;margin:4px 0;padding:4px;border:1px solid #333;border-radius:4px;';
      const pay = this.slot({ itemType: o.take.item as ItemType, quantity: price }, undefined, true);
      const can = this.inventory.getItemCount(o.take.item as ItemType) >= price;
      if (!can) pay.style.borderColor = '#a33';
      row.appendChild(pay);
      const arrow = document.createElement('span');
      arrow.textContent = '->';
      arrow.style.cssText = 'color:#aaa;font-size:14px;';
      row.appendChild(arrow);
      row.appendChild(this.slot({ itemType: o.give.item as ItemType, quantity: o.give.n }, undefined, true));
      const what = document.createElement('div');
      what.style.cssText = 'flex:1;font-size:12px;';
      what.appendChild(this.line(`${ITEM_DATA[o.give.item as ItemType]?.name ?? ''} from ${o.from.charAt(0).toUpperCase() + o.from.slice(1)}${o.minLevel ? '  (for friends)' : ''}`));
      what.appendChild(this.line(`${o.stock} of ${o.max} left`, o.stock > 0 ? '#aaa' : '#ff004d'));
      row.appendChild(what);
      const btn = document.createElement('button');
      btn.className = 'npc-trade';
      btn.textContent = o.stock <= 0 ? 'Sold out' : can ? 'Trade' : 'Not enough';
      btn.disabled = o.stock <= 0 || !can;
      btn.style.cssText = 'padding:4px 10px;font-family:inherit;cursor:pointer;';
      btn.onclick = () => this.trade(i);
      row.appendChild(btn);
      el.appendChild(row);
    }
  }

  /** One barter (task 4.5): all or nothing, the shared stock as a trader record write. */
  trade(offer: number): boolean {
    const npc = this.npc;
    if (!npc || npc.role !== 'trader') return false;
    const ti = this.traderIndex(npc);
    const t = this.client.trader(ti);
    if (!t) return false;
    const level = friendshipLevel(this.cb.friendship?.(this.body, npc.village) ?? 0).level;
    const res = barter(this.inventory, t, offer, level);
    if (!res.ok) return false;
    this.client.writeTrader(ti, res.trader);
    this.cb.onInventoryChanged();
    this.cb.onTraded?.(ti, this.body);
    this.lastKey = '';
    this.updateContent();
    return true;
  }

  /** Deliver what the player carries toward a request (task 4.3). */
  deliverTo(reqId: number): DeliverResult | null {
    const npc = this.npc, v = this.village();
    if (!npc || !v) return null;
    const q = v.requests.find(r => r.id === reqId);
    const res = deliverFrom(this.inventory, { worldSeed: this.client.seed(), body: this.body, index: npc.village }, v, reqId, this.client.clockNow(this.body));
    if (!res || !q) return null;
    // the elder's thanks go into the same player action as the delivery, so a
    // refused write (online) takes them back with the delivered items
    this.cb.onDelivered?.(this.body, npc.village, q.fam, res.taken, res);
    // friendship: the request's share for what was given, once the delivery stands
    const body = this.body, village = npc.village, points = (q.fr * res.taken) / q.need, fam = q.fam;
    this.client.writeVillage(body, village, res.village, (ok) => { if (ok) this.cb.credit?.(body, village, points, fam); });
    this.cb.onInventoryChanged();
    this.lastKey = '';
    this.updateContent();
    return res;
  }

  // ---- drawing (the machine panel's slot look) ----

  private slot(s: InventorySlot, onClick?: () => void, showOne = false): HTMLElement {
    const d = document.createElement('div');
    d.className = 'inventory-slot';
    if (s.itemType !== ItemType.NONE && s.quantity > 0) {
      const data = ITEM_DATA[s.itemType];
      const img = document.createElement('img');
      img.src = getAssetPath(data?.texture ?? '');
      d.title = data?.name ?? '';
      d.appendChild(img);
      if (s.quantity > 1 || showOne) {
        const c = document.createElement('span');
        c.className = 'slot-count';
        c.textContent = String(s.quantity);
        d.appendChild(c);
      }
    }
    if (onClick) d.onclick = onClick;
    return d;
  }

  private grid(slots: InventorySlot[], v: VillageState | null): HTMLElement {
    const g = document.createElement('div');
    g.style.cssText = 'display:grid;grid-template-columns:repeat(9,var(--slot,50px));gap:4px;margin-bottom:6px;';
    for (const s of slots) {
      const q = v?.requests.find(r => r.item !== undefined && r.item === s.itemType && s.quantity > 0);
      const cell = this.slot(s, q ? () => this.deliverTo(q.id) : undefined);
      if (q) cell.style.borderColor = '#4CAF50';
      g.appendChild(cell);
    }
    return g;
  }

  private bar(fraction: number, colour: string): HTMLElement {
    const outer = document.createElement('div');
    outer.style.cssText = 'height:8px;background:#222;border:1px solid #444;margin:4px 0 8px;';
    const inner = document.createElement('div');
    inner.style.cssText = `height:100%;width:${Math.max(0, Math.min(1, fraction)) * 100}%;background:${colour};`;
    outer.appendChild(inner);
    return outer;
  }

  private line(t: string, colour = '#fff'): HTMLElement {
    const p = document.createElement('div');
    p.style.cssText = `margin:3px 0;color:${colour};font-size:13px;`;
    p.textContent = t;
    return p;
  }

  private label(t: string): HTMLElement {
    const p = this.line(t, '#aaa');
    p.style.marginTop = '8px';
    return p;
  }
}
