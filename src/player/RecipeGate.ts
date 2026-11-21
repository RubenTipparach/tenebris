/**
 * Is a recipe open? The one question every crafting place asks (the
 * crafting grid, the electronics workbench, the 3D printer) - answered by
 * the mission tree (MissionTracker.recipeOpen). Until a tracker is set
 * (before the world loads, or in a test) every recipe is open.
 */
export interface RecipeGate {
  recipeOpen(output: number): boolean;
  /** The title of the mission that unlocks a locked recipe, else null. */
  lockedBy(output: number): string | null;
}

let gate: RecipeGate | null = null;

export function setRecipeGate(g: RecipeGate | null): void {
  gate = g;
}

export function recipeOpen(output: number): boolean {
  return gate ? gate.recipeOpen(output) : true;
}

export function recipeLockedBy(output: number): string | null {
  return gate ? gate.lockedBy(output) : null;
}

/** "Unlocked by: <mission>" for a locked recipe, else null: the one label
 *  every place that lists or refuses a recipe shows. */
export function recipeLockedLabel(output: number): string | null {
  const by = recipeLockedBy(output);
  return by ? `Unlocked by: ${by}` : null;
}
