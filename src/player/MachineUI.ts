import { BaseModalMenu } from './BaseModalMenu';
import { Inventory, ItemType, ITEM_DATA, InventorySlot } from './Inventory';
import { getAssetPath } from '../utils/assetPath';
import { recipeLockedBy, recipeOpen } from './RecipeGate';
import { PlacedMachine, loadInput, acceptsInput, machineSupplyW } from '../power/MachineLogic';
import { FABRICATOR_RECIPES, MACHINE_CONFIG, POWER_CONFIG } from '../config/PowerConfig';
import { GridResult, formatWatts, formatWh } from '../power/PowerGrid';

/**
 * The one panel for every industry machine (openspec industry-and-nuclear,
 * design 3-5): pump jack, refinery, centrifuge, reactor, nuclear fabricator
 * and the batteries. A status line, the machine's own numbers (tank, charge,
 * rods), its network's supply / demand / stored energy, its input and output
 * slots, and the player's items (hotbar row + bag) as one slot grid.
 *
 * Click one of your items to load it into the machine; click a machine slot
 * to take it back (into the hotbar first, then the bag).
 */

const KIND_TITLES: Record<string, string> = {
  pumpJack: 'Pump Jack', refinery: 'Refinery', centrifuge: 'Centrifuge',
  reactor: 'Fission Reactor', nuclearFabricator: 'Nuclear Fabricator', battery: 'Battery',
  gasCollector: 'Gas Collector',
};

export interface MachineUICallbacks {
  /** The machine changed (save its record). */
  onMachineChanged(m: PlacedMachine): void;
  /** The player's inventory changed (save it, redraw the hotbar). */
  onInventoryChanged(): void;
  /** The last grid solve for the network this machine is on. */
  gridFor(m: PlacedMachine): GridResult | undefined;
}

const HOTBAR = 9;

export class MachineUI extends BaseModalMenu {
  private machine: PlacedMachine | null = null;
  private lastKey = '';

  constructor(private inventory: Inventory, private cb: MachineUICallbacks) {
    super({ id: 'machine-menu', title: 'Machine' });
  }

  public openFor(m: PlacedMachine): void {
    this.machine = m;
    this.lastKey = '';
    const title = this.getMenuElement()?.querySelector('.modal-menu-title');
    if (title) title.textContent = ITEM_DATA[m.itemType]?.name ?? KIND_TITLES[m.kind] ?? 'Machine';
    this.open();
    this.updateContent();
  }

  public getMachine(): PlacedMachine | null {
    return this.isOpen() ? this.machine : null;
  }

  protected onClose(): void {
    this.machine = null;
  }

  /** Redraw if anything shown changed (called every grid solve). */
  public refresh(): void {
    if (this.isOpen()) this.updateContent();
  }

  public updateContent(): void {
    const el = this.getContentElement();
    const m = this.machine;
    if (!el || !m) return;
    const grid = this.cb.gridFor(m);
    const key = JSON.stringify([m.status, Math.floor(m.progressS), m.tank, Math.round(m.chargeWh), m.rodLifeS.map(Math.ceil), m.job,
      m.inputs, m.outputs, this.inventory.getAllSlots(), grid && [grid.supplyW, grid.demandW, Math.round(grid.storedWh), grid.powered]]);
    if (key === this.lastKey) return;
    this.lastKey = key;
    el.innerHTML = '';
    el.style.minWidth = '520px';

    el.appendChild(this.line(m.status || ' ', m.status.startsWith('No') || m.status.startsWith('Needs') ? '#ff6b6b' : '#8f8'));
    const progress = this.progressFraction(m);
    if (progress !== null) el.appendChild(this.bar(progress, '#4CAF50'));

    // The machine's own numbers
    if (m.kind === 'pumpJack') {
      el.appendChild(this.line(`Tank: ${m.tank} / ${MACHINE_CONFIG.PUMP_TANK_UNITS} crude oil - put a bucket in to fill it`));
    } else if (m.kind === 'battery') {
      const spec = POWER_CONFIG.BATTERIES[m.itemType];
      el.appendChild(this.line(`Charge: ${formatWh(m.chargeWh)} / ${formatWh(spec.capacityWh)}  (max ${formatWatts(spec.maxRateW)} in or out)`));
      el.appendChild(this.bar(m.chargeWh / spec.capacityWh, '#29ADFF'));
    } else if (m.kind === 'reactor') {
      const lives = m.rodLifeS.map(l => l > 0 ? `${Math.ceil(l / 60)} min` : 'spent').join(', ');
      el.appendChild(this.line(`Rods burning: ${lives}  -  ${formatWatts(POWER_CONFIG.SUPPLY_W.reactor ?? 0)} while fuelled`));
    }
    if (m.kind === 'solarPanel') {
      el.appendChild(this.line(`Makes ${formatWatts(machineSupplyW(m))} now - up to ${formatWatts(POWER_CONFIG.SUPPLY_W.solarPanel ?? 0)} with the sun overhead`));
      el.appendChild(this.bar(Math.min(1, m.sunlight), '#FFEC27'));
    }
    if (m.kind === 'gasCollector') {
      el.appendChild(this.line(`Put empty tanks in - one fills with air every ${MACHINE_CONFIG.gasCollector.fillS} s`));
    }
    const demand = POWER_CONFIG.DEMAND_W[m.kind];
    if (demand) el.appendChild(this.line(`Draws ${formatWatts(demand)} while working`, '#aaa'));

    // Its network
    el.appendChild(this.line(grid
      ? `Network: supply ${formatWatts(grid.supplyW)}, demand ${formatWatts(grid.demandW)}, stored ${formatWh(grid.storedWh)} / ${formatWh(grid.capacityWh)}${grid.nuclearW > 0 ? ' (reactor)' : ''}`
      : 'Network: not connected - run a cable to it', '#FFEC27'));

    // Machine slots
    if (m.inputs.length) el.appendChild(this.slotRow('In', m.inputs, i => this.takeBack(m.inputs, i)));
    if (m.outputs.length) el.appendChild(this.slotRow('Out', m.outputs, i => this.takeBack(m.outputs, i)));

    if (m.kind === 'nuclearFabricator') el.appendChild(this.fabricatorRecipes(m));

    // The player's items: hotbar row, then the bag
    const all = this.inventory.getAllSlots();
    el.appendChild(this.label('Your items (hotbar)'));
    el.appendChild(this.grid(all.slice(0, HOTBAR), i => this.load(i)));
    el.appendChild(this.label('Bag'));
    el.appendChild(this.grid(all.slice(HOTBAR), i => this.load(HOTBAR + i)));
  }

  private progressFraction(m: PlacedMachine): number | null {
    switch (m.kind) {
      case 'pumpJack': return m.progressS / MACHINE_CONFIG.PUMP_UNIT_S;
      case 'refinery': return m.progressS / MACHINE_CONFIG.REFINE_S;
      case 'centrifuge': return m.progressS / MACHINE_CONFIG.ENRICH_S;
      case 'gasCollector': return m.progressS / MACHINE_CONFIG.gasCollector.fillS;
      case 'nuclearFabricator': {
        const r = FABRICATOR_RECIPES.find(x => x.output === m.job);
        return r ? m.progressS / r.timeS : null;
      }
      default: return null;
    }
  }

  /** Move one of the player's stacks into the machine. */
  private load(slotIndex: number): void {
    const m = this.machine;
    const slot = this.inventory.getSlot(slotIndex);
    if (!m || !slot || slot.itemType === ItemType.NONE || !acceptsInput(m.kind, slot.itemType)) return;
    const moved = loadInput(m, slot.itemType, slot.quantity);
    if (moved <= 0) return;
    const left = slot.quantity - moved;
    this.inventory.setSlot(slotIndex, left > 0 ? slot.itemType : ItemType.NONE, left);
    this.changed();
  }

  /** Take a machine slot's stack back into the inventory. */
  private takeBack(slots: InventorySlot[], i: number): void {
    const s = slots[i];
    if (!this.machine || s.itemType === ItemType.NONE || s.quantity <= 0) return;
    const left = this.inventory.addItem(s.itemType, s.quantity);
    s.quantity = left;
    if (left <= 0) s.itemType = ItemType.NONE;
    this.changed();
  }

  private fabricatorRecipes(m: PlacedMachine): HTMLElement {
    const box = document.createElement('div');
    box.appendChild(this.label(m.job !== null ? `Building: ${ITEM_DATA[m.job]?.name}` : 'Build'));
    for (const r of FABRICATOR_RECIPES) {
      const row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:6px;margin:4px 0;';
      row.appendChild(this.slot({ itemType: r.output, quantity: 1 }));
      row.appendChild(this.text('='));
      for (const inp of r.inputs) {
        const have = this.inventory.getItemCount(inp.itemType) >= inp.quantity;
        const s = this.slot({ itemType: inp.itemType, quantity: inp.quantity });
        if (!have) s.style.borderColor = '#a33';
        row.appendChild(s);
      }
      const locked = !recipeOpen(r.output);
      const canPay = r.inputs.every(inp => this.inventory.getItemCount(inp.itemType) >= inp.quantity);
      const btn = document.createElement('button');
      const by = locked ? recipeLockedBy(r.output) : null;
      btn.textContent = locked ? `Unlocked by: ${by}` : `Build (${r.timeS} s)`;
      if (locked) row.style.opacity = '0.5';
      btn.disabled = locked || !canPay || m.job !== null;
      btn.style.cssText = 'margin-left:auto;padding:4px 10px;font-family:inherit;cursor:pointer;';
      btn.onclick = () => {
        if (m.job !== null || !recipeOpen(r.output)) return;
        if (!r.inputs.every(inp => this.inventory.getItemCount(inp.itemType) >= inp.quantity)) return;
        for (const inp of r.inputs) this.inventory.removeItem(inp.itemType, inp.quantity);
        m.job = r.output;
        m.progressS = 0;
        this.changed();
      };
      row.appendChild(btn);
      box.appendChild(row);
    }
    return box;
  }

  private changed(): void {
    if (this.machine) this.cb.onMachineChanged(this.machine);
    this.cb.onInventoryChanged();
    this.lastKey = '';
    this.updateContent();
  }

  // ---- drawing helpers ----

  private slot(s: InventorySlot, onClick?: () => void): HTMLElement {
    const d = document.createElement('div');
    d.className = 'inventory-slot';
    if (s.itemType !== ItemType.NONE && s.quantity > 0) {
      const data = ITEM_DATA[s.itemType];
      const img = document.createElement('img');
      img.src = getAssetPath(data?.texture ?? '');
      d.title = data?.name ?? '';
      d.appendChild(img);
      if (s.quantity > 1) {
        const c = document.createElement('span');
        c.className = 'slot-count';
        c.textContent = String(s.quantity);
        d.appendChild(c);
      }
    }
    if (onClick) d.onclick = onClick;
    return d;
  }

  private grid(slots: InventorySlot[], onClick: (i: number) => void): HTMLElement {
    const g = document.createElement('div');
    g.style.cssText = 'display:grid;grid-template-columns:repeat(9,var(--slot,50px));gap:4px;margin-bottom:6px;';
    slots.forEach((s, i) => {
      const cell = this.slot(s, () => onClick(i));
      if (this.machine && s.itemType !== ItemType.NONE && acceptsInput(this.machine.kind, s.itemType)) cell.style.borderColor = '#4CAF50';
      g.appendChild(cell);
    });
    return g;
  }

  private slotRow(label: string, slots: InventorySlot[], onClick: (i: number) => void): HTMLElement {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:4px;margin:6px 0;';
    const l = this.text(label);
    l.style.width = '36px';
    row.appendChild(l);
    slots.forEach((s, i) => row.appendChild(this.slot(s, () => onClick(i))));
    return row;
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

  private text(t: string): HTMLElement {
    const s = document.createElement('span');
    s.textContent = t;
    return s;
  }
}
