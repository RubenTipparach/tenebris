import { ItemType, InventorySlot, ITEM_DATA } from './Inventory';
import { COOKERS, COOKER_SLOTS, CookerKind, CookingRecipe, Ingredient, FOOD, FOOD_CONFIG } from '../config/CookingConfig';
import { FISH_ITEMS } from '../config/FishRosters';

/**
 * The cooking rules, with no scene or DOM (so tests run them directly):
 * which recipe a station's inputs make, cooking it over time, and the
 * well-fed state eating gives.
 */

const matches = (ing: Ingredient, item: ItemType): boolean =>
  ing === 'fish' ? FISH_ITEMS.has(item) : ing === item;

/**
 * The recipe a station's input slots make right now, and which input slot
 * each ingredient comes from - most ingredients first, so an oven with a
 * fish, a water bucket and a pot makes stew rather than plain cooked fish.
 */
export function findCookingRecipe(kind: CookerKind, slots: InventorySlot[]): { recipe: CookingRecipe; from: number[] } | null {
  const recipes = [...COOKERS[kind].recipes].sort((a, b) => b.inputs.length - a.inputs.length);
  for (const recipe of recipes) {
    const used = new Set<number>();
    const from: number[] = [];
    for (const ing of recipe.inputs) {
      let found = -1;
      for (let i = 0; i < COOKER_SLOTS.INPUTS; i++) {
        const s = slots[i];
        if (!used.has(i) && s && s.quantity > 0 && matches(ing, s.itemType)) { found = i; break; }
      }
      if (found < 0) break;
      used.add(found);
      from.push(found);
    }
    if (from.length === recipe.inputs.length) return { recipe, from };
  }
  return null;
}

const fits = (slot: InventorySlot | undefined, item: ItemType): boolean => {
  if (!slot || slot.itemType === ItemType.NONE || slot.quantity <= 0) return true;
  return slot.itemType === item && slot.quantity < (ITEM_DATA[item]?.stackSize ?? 64);
};

const put = (slots: InventorySlot[], index: number, item: ItemType): void => {
  const s = slots[index];
  if (!s || s.itemType === ItemType.NONE || s.quantity <= 0) slots[index] = { itemType: item, quantity: 1 };
  else s.quantity += 1;
};

/** A station's working state: its slots and how far the current dish is. */
export interface CookerState {
  kind: CookerKind;
  slots: InventorySlot[];
  progress: number;           // 0..1 of the current recipe
}

/**
 * Advance a station by dt seconds. Returns the item made this tick, if any
 * (the caller saves and announces it). A station only cooks while its
 * output (and return slot, for a recipe that gives something back) has room.
 */
export function tickCooker(state: CookerState, dt: number): ItemType | null {
  const found = findCookingRecipe(state.kind, state.slots);
  const outOk = found && fits(state.slots[COOKER_SLOTS.OUTPUT], found.recipe.output)
    && (!found.recipe.returns || fits(state.slots[COOKER_SLOTS.RETURN], found.recipe.returns));
  if (!found || !outOk) {
    state.progress = 0;
    return null;
  }
  state.progress += dt / found.recipe.timeS;
  if (state.progress < 1) return null;
  state.progress = 0;
  for (const i of found.from) {
    const s = state.slots[i];
    s.quantity -= 1;
    if (s.quantity <= 0) state.slots[i] = { itemType: ItemType.NONE, quantity: 0 };
  }
  put(state.slots, COOKER_SLOTS.OUTPUT, found.recipe.output);
  if (found.recipe.returns) put(state.slots, COOKER_SLOTS.RETURN, found.recipe.returns);
  return found.recipe.output;
}

export function emptyCookerSlots(): InventorySlot[] {
  return Array.from({ length: COOKER_SLOTS.COUNT }, () => ({ itemType: ItemType.NONE, quantity: 0 }));
}

// ---- well fed --------------------------------------------------------------

export interface WellFed {
  item: ItemType;      // the dish that gave it
  strength: number;    // 0..1
  remainingS: number;  // game seconds left
}

/** Is this item a dish? */
export function isFood(item: ItemType): boolean {
  return FOOD[item] !== undefined;
}

/** Eating a dish: a fresh well-fed state (restarts any running one, never stacks). */
export function eat(item: ItemType): WellFed | null {
  const f = FOOD[item];
  return f ? { item, strength: f.strength, remainingS: f.durationS } : null;
}

/** Count a well-fed state down; null once it runs out. */
export function tickWellFed(state: WellFed | null, dt: number): WellFed | null {
  if (!state) return null;
  const remainingS = state.remainingS - dt;
  return remainingS > 0 ? { ...state, remainingS } : null;
}

/** The multiplier well fed puts on mining time and jetpack drain. */
export function wellFedFactor(state: WellFed | null): number {
  return state ? 1 - state.strength : 1;
}

export { FOOD_CONFIG };
