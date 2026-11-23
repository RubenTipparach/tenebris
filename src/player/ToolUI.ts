import { Inventory, InventorySlot, ItemType, ITEM_DATA, toolCondition, usesLeft, toolMaxUses } from './Inventory';
import { TOOLBOX } from '../config/ToolConfig';
import { getAssetPath } from '../utils/assetPath';

/**
 * Tool visuals shared by every slot grid (openspec tools-and-toolbox): the
 * durability bar on a worn tool's slot, the tooltip with uses left, and the
 * HUD toolbox beside the hotbar.
 */

/** Draw (or hide) the durability bar along the bottom of a slot element. */
export function renderDurability(slotEl: HTMLElement, slot: InventorySlot): void {
  let bar = slotEl.querySelector<HTMLElement>('.slot-durability');
  const c = slot.quantity > 0 ? toolCondition(slot) : null;
  // Like tenebris: only a tool that has taken a hit shows a bar
  if (c === null || c >= 1) {
    if (bar) bar.style.display = 'none';
    return;
  }
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'slot-durability';
    bar.appendChild(document.createElement('div'));
    slotEl.appendChild(bar);
  }
  const fill = bar.firstElementChild as HTMLElement;
  fill.style.width = `${Math.max(0, c) * 100}%`;
  fill.style.background = c > TOOLBOX.BAR_HIGH ? TOOLBOX.BAR_COLOURS.high
    : c > TOOLBOX.BAR_LOW ? TOOLBOX.BAR_COLOURS.mid : TOOLBOX.BAR_COLOURS.low;
  bar.style.display = 'block';
}

/** A slot's tooltip: the item's name, plus uses left on a tool. */
export function slotTooltip(slot: InventorySlot): string {
  const name = ITEM_DATA[slot.itemType].name;
  const left = usesLeft(slot);
  return left === null ? name : `${name} - ${left}/${toolMaxUses(slot.itemType)} uses`;
}

/** The HUD toolbox: four small slots beside the hotbar; a click on the rod takes it out. */
export function renderToolboxHud(inv: Inventory, onRodClick: () => void): void {
  const root = document.getElementById('toolbox-hud');
  if (!root) return;
  const box = inv.getToolbox();
  if (root.children.length !== box.length) {
    root.innerHTML = '';
    TOOLBOX.KINDS.forEach(kind => {
      const el = document.createElement('div');
      el.className = 'hotbar-slot';
      el.dataset.tool = kind;
      const img = document.createElement('img');
      img.draggable = false;
      img.style.display = 'none';
      el.appendChild(img);
      if (kind === 'rod') el.addEventListener('click', onRodClick);
      root.appendChild(el);
    });
  }
  box.forEach((slot, i) => {
    const el = root.children[i] as HTMLElement;
    const img = el.querySelector('img') as HTMLImageElement;
    const has = slot.itemType !== ItemType.NONE && slot.quantity > 0;
    img.style.display = has ? 'block' : 'none';
    if (has) img.src = getAssetPath(ITEM_DATA[slot.itemType].texture);
    el.title = has ? slotTooltip(slot) : `${TOOLBOX.LABELS[TOOLBOX.KINDS[i]]} - empty`;
    el.classList.toggle('empty', !has);
    el.classList.toggle('selected', TOOLBOX.KINDS[i] === 'rod' && inv.isRodOut());
    renderDurability(el, slot);
  });
}
